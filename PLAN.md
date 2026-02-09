# TRACE Pattern Implementation Plan
## Tool-Routed Architecture for Controlled Execution — Verifiable Orchestrator

### Problem Statement

The FastAgentPanel's current orchestration (swarmOrchestrator.ts, parallelTaskOrchestrator.ts) uses the LLM as both planner AND analyst — the "LLM-as-Analyst" anti-pattern. Specifically:

1. **LLM-based synthesis** in `synthesizeResults()` — LLM merges raw agent outputs (Risk 1: Hallucination)
2. **LLM-based verification** in `verifyBranches()` — LLM judges quality probabilistically (Risk 2: Probabilistic logic)
3. **No entity resolution** — No grounding in current data before execution (Risk 3: Outdated knowledge)
4. **Raw data in context** — Full agent results passed to LLM for merge (Risk 4: Cost/latency)
5. **No deterministic audit log** — No code-generated trace of what tools did (Risk 5: Trust/opacity)

### Architecture: TRACE Decision Loop

```
User Query → Orchestrator (LLM)
                  ↓
            ┌─────────────────────────────────┐
            │     TRACE Decision Loop         │
            │                                 │
            │  Choice 1: Gather Info (R/O)    │ ← entity resolution, schema discovery
            │  Choice 2: Execute Data Op      │ ← deterministic tool, returns metadata only
            │  Choice 3: Execute Output Tool  │ ← chart, CSV, export from data store
            │  Choice 4: Finalize (Done)      │ ← stop loop
            │                                 │
            │  Each step → Audit Log entry    │
            │  Data → Immutable Data Store    │
            │  LLM sees metadata, NOT data    │
            └─────────────────────────────────┘
                  ↓
            Three Outputs:
            1. Raw Data/Artifact (untouched by LLM)
            2. Audit Log (code-generated, deterministic)
            3. Analysis (LLM-generated, labeled "⚡ AI Analysis")
```

---

### Phase 1: Core TRACE Infrastructure (Backend)

#### 1.1 New File: `convex/domains/agents/traceTypes.ts`
Shared types for the TRACE framework. No runtime code, pure types.

```typescript
// TRACE Decision Loop choices
type TraceChoice =
  | { type: "gather_info"; tool: string; params: Record<string, unknown> }
  | { type: "execute_data_op"; tool: string; params: Record<string, unknown>; viewName: string }
  | { type: "execute_output"; tool: string; params: Record<string, unknown> }
  | { type: "finalize"; finalViewName: string };

// Audit log entry — deterministic, code-generated
interface TraceAuditEntry {
  seq: number;
  timestamp: number;
  choiceType: TraceChoice["type"];
  toolName: string;
  toolParams: Record<string, unknown>;
  // Metadata feedback (what the tool returned to the orchestrator)
  metadata: {
    rowCount?: number;
    columnCount?: number;
    uniqueValues?: Record<string, number>;
    errorMessage?: string;
    duration_ms: number;
    success: boolean;
  };
  // Self-correction detection
  intendedState?: string;
  actualState?: string;
  correctionApplied?: boolean;
}

// Immutable data store view
interface TraceDataView {
  viewName: string;
  createdBy: string; // tool name
  createdAt: number;
  rowCount: number;
  columns: string[];
  // Never stored in LLM context — only metadata above
}

// Final TRACE output
interface TraceOutput {
  rawDataViewName: string;      // Reference to immutable data store
  auditLog: TraceAuditEntry[];  // Deterministic, code-generated
  analysis?: string;            // LLM-generated, clearly labeled
  analysisIsNonDeterministic: true; // Always true — signals UI labeling
}
```

#### 1.2 New File: `convex/domains/agents/traceAuditLog.ts`
Mutations and queries for the deterministic audit log.

- `appendAuditEntry` mutation — append a single entry to the audit log
- `getAuditLog` query — retrieve full audit log for a swarm/tree
- `getAuditSummary` query — compact summary for UI display

#### 1.3 Schema Addition: `traceAuditEntries` table in `convex/schema.ts`

```typescript
traceAuditEntries: defineTable({
  // Links to swarm or parallel task tree
  executionId: v.string(),           // swarmId or treeId
  executionType: v.union(v.literal("swarm"), v.literal("tree"), v.literal("chat")),

  seq: v.number(),                   // Monotonic within execution
  timestamp: v.number(),

  // TRACE choice
  choiceType: v.union(
    v.literal("gather_info"),
    v.literal("execute_data_op"),
    v.literal("execute_output"),
    v.literal("finalize"),
  ),
  toolName: v.string(),
  toolParams: v.optional(v.any()),   // Serialized params (redacted if sensitive)

  // Metadata feedback
  metadata: v.object({
    rowCount: v.optional(v.number()),
    columnCount: v.optional(v.number()),
    uniqueValues: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    durationMs: v.number(),
    success: v.boolean(),
    // Self-correction tracking
    intendedState: v.optional(v.string()),
    actualState: v.optional(v.string()),
    correctionApplied: v.optional(v.boolean()),
  }),

  // Human-readable description (code-generated, NOT LLM)
  description: v.string(),

  createdAt: v.number(),
})
  .index("by_execution", ["executionId", "seq"])
  .index("by_execution_type", ["executionType", "executionId"])
```

---

### Phase 2: TRACE Decision Loop Engine

#### 2.1 New File: `convex/domains/agents/traceOrchestrator.ts`
The core TRACE decision loop. This replaces `synthesizeResults()` in swarmOrchestrator.

**Key function: `executeTraceLoop()`**

```
1. Receive query + agent results (as metadata summaries, NOT raw text)
2. Loop:
   a. Ask LLM: "Given these metadata summaries, what's your next choice?"
      → LLM returns one of: gather_info, execute_data_op, execute_output, finalize
   b. Execute the chosen tool DETERMINISTICALLY
   c. Record audit entry (code-generated)
   d. Return ONLY metadata to LLM (row counts, column names, errors)
   e. If finalize → break
3. Produce three outputs:
   - Raw data reference (from data store)
   - Audit log (from traceAuditEntries)
   - Optional analysis (LLM-generated, labeled)
```

**Integration with existing swarm flow:**

The `synthesizeResults()` function in `swarmOrchestrator.ts` currently:
1. Takes raw agent results as strings
2. Asks LLM to merge them
3. Returns LLM-generated text

We replace this with:
1. Agent results stored in data store (immutable)
2. LLM receives metadata summaries only (char counts, key topics extracted deterministically)
3. TRACE loop executes any needed data operations
4. Final output = raw data + audit log + optional LLM analysis

#### 2.2 Modify: `convex/domains/agents/swarmOrchestrator.ts`

Replace `synthesizeResults()` with TRACE-aware flow:

```typescript
// BEFORE: LLM merges raw results
const synthesis = await synthesizeResults(ctx, query, results);

// AFTER: TRACE orchestration
const traceOutput = await executeTraceFinalization(ctx, {
  executionId: swarmId,
  executionType: "swarm",
  query,
  agentResults: results.map(r => ({
    agentName: r.agentName,
    // Only metadata, NOT raw result
    metadata: {
      charCount: r.result.length,
      wordCount: r.result.split(/\s+/).length,
      hasNumbers: /\d+/.test(r.result),
      keyTopics: extractTopicsDeterministic(r.result), // regex/NLP, not LLM
    },
    resultViewRef: r.viewRef, // reference to data store
  })),
});
```

#### 2.3 Modify: `convex/domains/agents/parallelTaskOrchestrator.ts`

Refactor `mergeSurvivingPaths()` similarly. The verification and cross-checking are already good patterns (multi-perspective validation), but the final merge should use TRACE:

- Keep decompose → execute → verify → cross-check flow
- Replace `mergeSurvivingPaths()` with TRACE-based finalization
- Record each verification/cross-check as an audit entry

---

### Phase 3: UI — TraceAuditPanel Component

#### 3.1 New File: `src/features/agents/components/FastAgentPanel/FastAgentPanel.TraceAuditPanel.tsx`

Renders the deterministic audit log with clear visual separation of:

1. **Audit Log** (green border, shield icon) — "These steps were executed deterministically"
   - Each entry: timestamp, tool name, choice type, metadata summary
   - Self-corrections highlighted in amber
   - Expandable details for each step

2. **Raw Data** (blue border, database icon) — "This data was produced by deterministic tools"
   - Table/data preview from the immutable data store
   - Download/export button

3. **AI Analysis** (purple border, brain icon, ⚡ badge) — "This analysis was generated by AI and may contain inaccuracies"
   - Clearly labeled non-deterministic content
   - Confidence score if available

#### 3.2 Modify: `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx`

Add TraceAuditPanel to the message display when a TRACE execution exists:
- Detect swarm/tree completions that have audit entries
- Render TraceAuditPanel below the message bubble
- Integrate with existing tab system (Chat | Tasks | **Trace**)

#### 3.3 Enhance: `src/features/agents/components/FastAgentPanel/FastAgentPanel.DisclosureTrace.tsx`

Extend the existing DisclosureTrace with new TRACE event types:
- `trace.gather_info` — entity resolution, schema discovery
- `trace.execute_data_op` — deterministic transformation with metadata feedback
- `trace.execute_output` — output generation
- `trace.finalize` — final output assembly
- `trace.self_correction` — when intended ≠ actual state

#### 3.4 Modify: `src/features/agents/components/FastAgentPanel/FastAgentPanel.MessageBubble.tsx` (or UIMessageBubble)

Add "⚡ AI Analysis" badge on LLM-generated analysis sections:
- Any content from `traceOutput.analysis` gets a visual indicator
- Tooltip: "This content was generated by AI and is non-deterministic"

---

### Phase 4: Metadata Feedback & Self-Correction

#### 4.1 New utility: Deterministic topic extraction

Instead of asking the LLM "what are the topics?", use deterministic text analysis:

```typescript
function extractMetadataSummary(text: string): MetadataSummary {
  return {
    charCount: text.length,
    wordCount: text.split(/\s+/).length,
    sentenceCount: text.split(/[.!?]+/).length,
    hasNumbers: /\d+/.test(text),
    hasUrls: /https?:\/\//.test(text),
    hasCitations: /\[\d+\]|\(\d{4}\)/.test(text),
    topNgrams: extractTopNgrams(text, 5), // deterministic frequency analysis
    namedEntities: extractNamedEntities(text), // regex-based entity extraction
  };
}
```

This ensures the LLM never sees raw agent output — only structured metadata.

#### 4.2 Self-correction loop (FB/META pattern)

When a tool returns metadata showing intended ≠ actual:

```typescript
// Tool returns: { requestedTickers: 5, foundTickers: 4, missing: ["FB"] }
// Orchestrator detects mismatch → triggers gather_info choice
// gather_info: search for "Facebook" → finds META
// execute_data_op: retry with corrected ticker
// Audit log records: "Self-correction: FB → META"
```

---

### Phase 5: Migration Path

1. **Parallel deployment** — TRACE runs alongside existing synthesis; UI shows both
2. **Feature flag** — `useTraceOrchestrator: boolean` on swarm/tree creation
3. **Gradual rollout** — Enable for new swarms, keep old behavior for existing
4. **Deprecation** — Once TRACE is proven, remove `synthesizeResults()` and LLM-based merge

---

### Files to Create (3 new files)

| File | Purpose |
|------|---------|
| `convex/domains/agents/traceTypes.ts` | Shared TRACE types (no runtime) |
| `convex/domains/agents/traceAuditLog.ts` | Audit log mutations/queries |
| `src/features/agents/components/FastAgentPanel/FastAgentPanel.TraceAuditPanel.tsx` | Audit log UI component |

### Files to Modify (5 files)

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `traceAuditEntries` table |
| `convex/domains/agents/swarmOrchestrator.ts` | Replace `synthesizeResults()` with TRACE finalization |
| `convex/domains/agents/parallelTaskOrchestrator.ts` | Replace `mergeSurvivingPaths()` with TRACE |
| `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx` | Add Trace tab, integrate TraceAuditPanel |
| `src/features/agents/components/FastAgentPanel/FastAgentPanel.DisclosureTrace.tsx` | Add TRACE event types |

### Key Principles Applied

1. **LLM = Orchestrator, NOT Analyst** — LLM decides which tool to call, never generates raw data
2. **Metadata only in LLM context** — Row counts, column names, error messages — never raw data
3. **Deterministic audit log** — Code generates the log, not the LLM
4. **Three distinct outputs** — Raw data (untouched), audit log (deterministic), analysis (labeled AI)
5. **Self-correction via metadata** — Intended vs actual state comparison triggers correction
6. **Entity resolution before execution** — Gather info step grounds in current reality
