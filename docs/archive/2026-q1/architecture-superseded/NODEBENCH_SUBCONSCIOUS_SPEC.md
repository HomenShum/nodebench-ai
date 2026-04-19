# NodeBench Subconscious — Technical Spec

## What This Is

A background intelligence agent that watches founder/coding sessions, maintains company truth memory, and whispers packet-aware guidance back into Claude Code and NodeBench surfaces.

**Claude Subconscious** = coding-memory background agent (Letta).
**NodeBench Subconscious** = founder/company/product intelligence background agent.

The difference: Claude Subconscious remembers code patterns and dev preferences. NodeBench Subconscious remembers company truth, founder goals, contradictions, readiness gaps, validated workflows, and packet lineage — then routes the right packet at the right time.

---

## Architecture: What We Borrow vs. What We Replace

### Borrowed from Claude Subconscious (proven patterns)

| Pattern | Claude Subconscious | NodeBench Subconscious |
|---------|-------------------|----------------------|
| **4-hook lifecycle** | SessionStart → UserPromptSubmit → PreToolUse → Stop | Same 4 hooks, different payloads |
| **Async Stop hook** | Spawns detached worker, never blocks | Same — background packet processor |
| **stdout injection** | Memory blocks + messages via stdout | Packet hints + company truth via stdout |
| **Changed-block detection** | Only inject blocks that changed | Only inject packets that are stale or relevant |
| **Conversation mapping** | session_id → conversation_id in `.letta/claude/` | session_id → company_context_id in `.nodebench/subconscious/` |
| **Mode system** | whisper / full / off | whisper / packet / full / review / off |

### Replaced (NodeBench-native)

| Claude Subconscious | NodeBench Subconscious | Why |
|---------------------|----------------------|-----|
| Letta API + Letta agent | NodeBench harness runtime + local SQLite | No external dependency, local-first trust |
| Generic memory blocks (user_notes, project_context) | Typed company memory blocks (see below) | Founder intelligence needs structure |
| Read/Grep/Glob tools only | Full MCP tool access + packet system | Need entity enrichment, search, watchlist |
| No output artifacts | Packet-aware whispers + artifact references | Every whisper should route to a reusable packet |

---

## Memory Block Schema

NodeBench Subconscious maintains 12 typed memory blocks, stored in local SQLite (`~/.nodebench/subconscious.db`).

```typescript
interface SubconsciousMemoryBlock {
  id: string;                     // block type key
  label: string;                  // human-readable name
  value: string;                  // current content (markdown)
  updatedAt: string;              // ISO timestamp
  version: number;                // monotonic version counter
  sourceEvents: string[];         // event IDs that contributed to this block
  confidence: "high" | "medium" | "low";
}

// The 12 blocks
type BlockType =
  | "founder_identity"            // who the founder is, background, style
  | "company_identity"            // what the company is, stage, vertical
  | "current_wedge"               // the specific pain + buyer + motion
  | "top_priorities"              // current top 3-5 priorities with deadlines
  | "open_contradictions"         // things that conflict across packets/sessions
  | "readiness_gaps"              // investor/banking/diligence gaps
  | "validated_workflows"         // workflows proven cheaper/faster
  | "recent_important_changes"    // what changed in last 7 days
  | "entity_watchlist"            // companies/people being tracked
  | "agent_preferences"           // execution style, tool preferences
  | "artifact_preferences"        // export formats, sharing patterns
  | "packet_lineage"              // recent packets created, their status, dependencies
```

### Block Update Rules

- **founder_identity**: Updated when user corrects assumptions, states role, or changes context
- **company_identity**: Updated when company stage, vertical, or positioning changes
- **current_wedge**: Updated when buyer, pain, or motion changes — CRITICAL block, triggers contradiction check
- **top_priorities**: Updated every session start from most recent priority-related packets
- **open_contradictions**: Auto-detected when new information conflicts with existing blocks
- **readiness_gaps**: Updated from diligence/readiness packet results
- **validated_workflows**: Updated when workflow optimization proves a shorter path
- **recent_important_changes**: Rolling 7-day window, auto-pruned
- **entity_watchlist**: Updated from search queries, explicit tracking
- **agent_preferences**: Updated from corrections and confirmed approaches
- **artifact_preferences**: Updated from export usage patterns
- **packet_lineage**: Updated every time a packet is created, used, or staled

---

## Hook Architecture

### Hook 1: SessionStart

**When:** Claude Code session begins in a NodeBench project directory.

**What it does:**
1. Load or create subconscious state from `~/.nodebench/subconscious/`
2. Check if any memory blocks changed since last session (compare versions)
3. Check if any packets are stale (created >7 days ago without refresh)
4. Check if any watchlist entities have new signals
5. Output session context summary to stdout

**Stdout injection:**
```
────────────────────────────
  NodeBench Subconscious
────────────────────────────

<nodebench_context>
Company: {company_identity.value | first line}
Wedge: {current_wedge.value | first line}
Stage: {company_identity.stage}

Changes since last session:
- {recent_important_changes.value | bullet list}

Stale packets: {packet_lineage | stale count}
Open contradictions: {open_contradictions | count}
Readiness gaps: {readiness_gaps | count}
</nodebench_context>
```

### Hook 2: UserPromptSubmit

**When:** Before each user prompt is processed.

**What it does:**
1. Classify the incoming prompt: is this code, strategy, research, delegation, diligence?
2. Based on classification, select relevant memory blocks
3. Check if the prompt references or conflicts with any known block
4. Inject relevant blocks via stdout

**Classification → Block Selection:**

| Prompt Type | Blocks Injected |
|-------------|----------------|
| Code implementation | agent_preferences, current_wedge (if feature touches wedge), validated_workflows |
| Company strategy | founder_identity, company_identity, current_wedge, top_priorities, open_contradictions |
| Research / search | entity_watchlist, recent_important_changes |
| Delegation / agent task | validated_workflows, packet_lineage, agent_preferences |
| Diligence / investor | readiness_gaps, company_identity, packet_lineage |
| Unknown | current_wedge only (lightweight) |

**Injection modes:**

| Mode | What's injected |
|------|----------------|
| `whisper` (default) | 1-3 line hint + stale packet warning if relevant |
| `packet` | Full relevant packet content (from packet_lineage) |
| `full` | All changed blocks + relevant packets + contradiction notes |
| `review` | Nothing injected; blocks updated silently for dashboard review |
| `off` | Nothing |

**Whisper examples:**
```
<nodebench_whisper>
This feature touches the current wedge (API key management for MCP).
Use implementation packet PKT-2026-0401-001 as base.
The readiness gap "no public demo flow" is relevant here.
</nodebench_whisper>
```

```
<nodebench_whisper>
⚠ Contradiction detected: current_wedge says "founder-first" but
this task builds generic enterprise features. Confirm direction.
</nodebench_whisper>
```

```
<nodebench_whisper>
A validated shortcut exists for this workflow:
search → packet → export (3 steps instead of 7).
Estimated savings: 42% fewer tokens.
</nodebench_whisper>
```

### Hook 3: PreToolUse

**When:** Before each tool call.

**What it does:**
1. Check if tool call matches a known workflow pattern
2. If validated shortcut exists, suggest it via additionalContext
3. If tool call would produce a packet-worthy result, note it for Stop hook
4. Lightweight — only output if there's something actionable

**Output format (JSON for additionalContext):**
```json
{
  "additionalContext": {
    "type": "nodebench_hint",
    "workflow_match": "search_then_enrich",
    "shortcut_available": true,
    "shortcut_steps": 3,
    "original_steps": 7,
    "estimated_savings_pct": 42,
    "packet_reference": "PKT-2026-0401-001"
  }
}
```

### Hook 4: Stop (async)

**When:** Session ends.

**What it does:**
1. Parse full session transcript
2. Spawn detached background worker (never blocks exit)
3. Worker processes transcript:
   - Extract entities mentioned
   - Extract decisions made
   - Extract contradictions surfaced
   - Extract packets created or referenced
   - Detect workflow patterns (for future shortcut optimization)
   - Update all 12 memory blocks as needed
   - Check for stale blocks that should be refreshed
   - Optionally trigger entity enrichment for new watchlist entities

**Worker payload:**
```typescript
interface SubconsciousPayload {
  sessionId: string;
  transcript: TranscriptMessage[];
  currentBlocks: SubconsciousMemoryBlock[];
  cwd: string;
  mode: SubconsciousMode;
}
```

**Worker output:**
- Updated blocks written to `~/.nodebench/subconscious.db`
- New contradictions flagged
- Stale packet warnings queued for next session
- Workflow pattern recorded in `validated_workflows`

---

## Integration with Existing NodeBench Infrastructure

### 1. Harness Runtime (server/harnessRuntime.ts)

The subconscious background worker uses the harness runtime for LLM processing:

```typescript
// Worker creates a lightweight harness session for block updates
const session = harnessRuntime.createSession({
  preset: "subconscious",        // minimal toolset
  lens: "system",                 // no role overlay
  permissionPolicy: { defaultMode: "allow" },
});

// Send transcript for analysis
const result = await harnessRuntime.run(session.id, {
  query: formatTranscriptForAnalysis(payload.transcript),
  systemPrompt: SUBCONSCIOUS_SYSTEM_PROMPT,
});

// Extract block updates from result
const blockUpdates = parseBlockUpdates(result.synthesizedResult);
```

### 2. Packet System (server/commandBridge.ts)

The subconscious reads and references existing packets:

```typescript
// Check if prompt maps to an existing packet
const relevantPacket = await findRelevantPacket(promptClassification, packetLineage);

// If packet exists and is fresh, reference it in whisper
if (relevantPacket && !isStale(relevantPacket)) {
  whisper += `Use packet ${relevantPacket.id}: "${relevantPacket.objective}"`;
}

// If packet is stale, warn
if (relevantPacket && isStale(relevantPacket)) {
  whisper += `⚠ Packet ${relevantPacket.id} is stale (${daysSince(relevantPacket.updatedAt)}d old). Refresh before using.`;
}
```

### 3. Memory Provider (packages/mcp-local/src/providers/memoryProvider.ts)

The subconscious uses the existing MemoryProvider interface for persistence:

```typescript
// Subconscious block storage uses the same interface
const subconsciousProvider: MemoryProvider = {
  write: async (input: MemoryInput) => { /* SQLite write */ },
  read: async (key: string) => { /* SQLite read */ },
  search: async (query: string) => { /* FTS5 search across blocks */ },
  relate: async (from, to, type) => { /* Block → Packet relations */ },
};
```

### 4. Provider Bus (server/providerBus.ts)

The subconscious can listen to the provider bus for real-time events:

```typescript
// Subscribe to relevant bus events
providerBus.on("event", (event: BusEvent) => {
  switch (event.type) {
    case "search.completed":
      // Update entity_watchlist if new entity searched
      break;
    case "packet.created":
      // Update packet_lineage
      break;
    case "agent.task_completed":
      // Check for workflow pattern
      break;
  }
});
```

### 5. MCP Tools

New MCP tools exposed for the subconscious:

```typescript
// Tools for querying subconscious state
const subconsciousTools: McpTool[] = [
  {
    name: "get_subconscious_hint",
    description: "Get the subconscious's current guidance for a task",
    inputSchema: { type: "object", properties: { task: { type: "string" } } },
    handler: async ({ task }) => classifyAndWhisper(task),
  },
  {
    name: "get_company_truth",
    description: "Get the current canonical company truth blocks",
    inputSchema: { type: "object", properties: { blocks: { type: "array", items: { type: "string" } } } },
    handler: async ({ blocks }) => getBlocks(blocks),
  },
  {
    name: "refresh_subconscious",
    description: "Force refresh all memory blocks from recent sessions",
    inputSchema: { type: "object", properties: {} },
    handler: async () => refreshAllBlocks(),
  },
  {
    name: "explain_whisper",
    description: "Explain why a particular whisper was generated",
    inputSchema: { type: "object", properties: { whisperId: { type: "string" } } },
    handler: async ({ whisperId }) => explainWhisper(whisperId),
  },
  {
    name: "list_contradictions",
    description: "List all open contradictions between memory blocks",
    inputSchema: { type: "object", properties: {} },
    handler: async () => getBlock("open_contradictions"),
  },
  {
    name: "list_stale_packets",
    description: "List packets that need refresh",
    inputSchema: { type: "object", properties: { maxAgeDays: { type: "number" } } },
    handler: async ({ maxAgeDays = 7 }) => getStalePackets(maxAgeDays),
  },
];
```

---

## File Layout

```
~/.nodebench/subconscious/
├── subconscious.db              # SQLite: memory blocks, event log, workflow patterns
├── state.json                   # Session mapping (session_id → context)
└── logs/                        # Debug logs (auto-pruned >7 days)

packages/mcp-local/src/
├── subconscious/
│   ├── index.ts                 # Main subconscious engine
│   ├── blocks.ts                # Memory block CRUD + staleness checks
│   ├── classifier.ts            # Prompt classification (code/strategy/research/etc)
│   ├── whisperPolicy.ts         # Whisper generation + suppression rules
│   ├── contradictionDetector.ts # Cross-block contradiction detection
│   ├── workflowMatcher.ts       # Workflow pattern matching + shortcut suggestion
│   ├── packetRouter.ts          # Find relevant packet for current context
│   ├── graphEngine.ts           # Knowledge graph: entities, edges, BFS traversal
│   ├── entityExtractor.ts       # NER from transcripts + packets → graph entities
│   ├── graphRetrieval.ts        # Graph-aware retrieval: vector + graph traversal
│   └── tools.ts                 # MCP tools for subconscious + graph queries

hooks/
├── nodebench_session_start.ts   # Hook 1: SessionStart
├── nodebench_prompt_submit.ts   # Hook 2: UserPromptSubmit
├── nodebench_pre_tool.ts        # Hook 3: PreToolUse
├── nodebench_stop.ts            # Hook 4: Stop (spawns worker)
└── nodebench_worker.ts          # Background worker (async processing)
```

---

## Modes

```
NODEBENCH_SUBCONSCIOUS_MODE=whisper|packet|full|review|off
```

| Mode | Injection | Memory Updates | Use Case |
|------|-----------|---------------|----------|
| `off` | None | None | Disable completely |
| `whisper` (default) | 1-3 line hints | Yes (background) | Lightweight daily use |
| `packet` | Relevant packet content | Yes (background) | When working on specific initiative |
| `full` | All blocks + packets + contradictions | Yes (background) | Deep work sessions |
| `review` | None (dashboard only) | Yes (background) | Silent observation mode |

---

## Suppression Rules (When NOT to Whisper)

1. **No noise on simple tasks** — If prompt is a typo fix, one-line change, or git operation, suppress
2. **No duplicate whispers** — If the same hint was given <3 prompts ago, suppress
3. **No stale-on-stale** — If a packet was already flagged stale this session, don't re-flag
4. **No contradiction spam** — Max 1 contradiction warning per session unless user asks
5. **No whisper during rapid iteration** — If <30s between prompts, suppress (user is in flow)
6. **Confidence gate** — Only whisper if block confidence is "high" or "medium"

---

## Phased Build Plan

### Phase 1: Local Memory Engine (Week 1)
- [ ] SQLite schema for 12 memory blocks
- [ ] Block CRUD with version tracking
- [ ] Prompt classifier (code/strategy/research/delegation/diligence)
- [ ] Basic whisper generator
- [ ] MCP tools: get_company_truth, list_contradictions

### Phase 2: Hook Wiring (Week 2)
- [ ] SessionStart hook with block summary injection
- [ ] UserPromptSubmit hook with classification-based injection
- [ ] Stop hook with async background worker
- [ ] Worker: transcript parsing + block update logic
- [ ] Mode system (whisper/packet/full/review/off)

### Phase 3: Knowledge Graph Engine (Week 3)
- [ ] SQLite graph schema: graph_entities + graph_edges + FTS5 index
- [ ] Entity extractor: NER from transcripts → graph entities (company/person/initiative/packet/decision/event)
- [ ] Edge builder: relation extraction → graph edges with confidence scores
- [ ] BFS graph traversal (reuse progressive discovery pattern, maxDepth 1-3)
- [ ] MCP tools: traverse_entity_graph, find_contradictions_for, get_entity_graph_summary
- [ ] Wire entity extraction into Stop hook background worker

### Phase 4: Packet Awareness + Graph Retrieval (Week 4)
- [ ] Packet router: graph traversal from prompt entities → relevant packets via derived_from/supports edges
- [ ] Stale packet detection + warning (packet entity lastSeen vs threshold)
- [ ] Packet lineage tool: get_packet_lineage (5-hop derived_from chain)
- [ ] Contradiction detector: cross-block + cross-packet via "contradicts" edge traversal
- [ ] MCP tools: list_stale_packets, explain_whisper, refresh_subconscious
- [ ] Graph-aware whisper generation: vector similarity → candidate entities → graph traversal → ranked whisper

### Phase 5: Workflow Optimization (Week 5)
- [ ] Workflow pattern recorder (from session transcripts → graph edges)
- [ ] Shortcut suggestion via PreToolUse hook (graph-matched workflow patterns)
- [ ] Validated shortcut registry with proof (before/after metrics as graph evidence)
- [ ] Provider bus integration for real-time graph updates

### Phase 6: Dashboard Surface (Week 6)
- [ ] Subconscious panel in NodeBench AI app (/?surface=telemetry)
- [ ] Knowledge graph visualizer (entities + edges, interactive)
- [ ] Memory block viewer with version history
- [ ] Contradiction list with resolution actions + graph path evidence
- [ ] Whisper history with effectiveness tracking
- [ ] Block confidence visualization
- [ ] Graph stats: entity count by type, edge count by relation, growth rate

### Phase 7: Multimodal Graph (Future)
- [ ] Image/screenshot entity extraction via vision model
- [ ] PDF/document entity extraction into same graph
- [ ] Unified traversal across text + image + table entities
- [ ] Cross-modal contradiction detection

---

## Mapping to the 12 Claude Code Primitives

| Primitive | How NodeBench Subconscious Uses It |
|-----------|-----------------------------------|
| 1. Tool Registry with Metadata | 6 subconscious MCP tools registered in toolsetRegistry.ts |
| 2. Multi-Tier Permissions | Subconscious tools are read-only by default; refresh requires explicit call |
| 3. Crash-Resistant Persistence | SQLite blocks + state.json survive crashes; worker writes atomically |
| 4. Workflow vs Conversation State | Blocks are workflow state; session transcript is conversation state |
| 5. Hard Token Budgeting | Whisper mode caps injection at 200 tokens; full mode at 2000 |
| 6. Structured Streaming Events | Whispers are typed events (hint, contradiction, stale_warning, shortcut) |
| 7. System Event Logging | All block updates + whisper decisions logged in subconscious.db |
| 8. Two-Level Verification | Level 1: whisper relevance scoring; Level 2: block accuracy auditing |
| 9. Dynamic Tool Pool | Subconscious tools only loaded when mode != "off" |
| 10. Transcript Compaction | Worker summarizes session before updating blocks (not raw transcript) |
| 11. Permission Handler Specialization | Interactive: whisper mode; Coordinator: packet mode; Swarm: full mode |
| 12. Constrained Agent Types | Subconscious worker is read-only by default; cannot edit files or run commands |

---

## What Makes This Different from Claude Subconscious

| Dimension | Claude Subconscious | NodeBench Subconscious |
|-----------|-------------------|----------------------|
| **Memory target** | Code patterns, dev preferences | Company truth, founder goals, packet lineage |
| **Whisper content** | "You prefer X" / "This file does Y" | "This conflicts with your wedge" / "Use packet PKT-001" |
| **Intelligence** | Pattern matching on transcripts | Classification → packet routing → contradiction detection |
| **Persistence** | Letta cloud API | Local SQLite (zero cloud dependency) |
| **Tool access** | Read/Grep/Glob | Full MCP tool access (search, entity enrichment, watchlist) |
| **Output artifacts** | None | Packet references, contradiction reports, workflow shortcuts |
| **Business value** | Better coding context | Founder clarity, faster diligence, cheaper workflows |

---

## Graph RAG Retrieval Backbone

### Why Graph RAG, Not Naive RAG

The subconscious needs to answer questions like "what contradicts the current wedge?" or "which packets support this initiative?" — these are **relationship traversal queries**, not vector similarity queries.

Naive RAG (vector similarity) is essentially a smarter Ctrl+F — it finds the most similar text chunks. That fails for:
- **Contradiction detection** — requires comparing two blocks that may use completely different language
- **Packet lineage** — requires traversing created_by → derived_from → supports chains
- **Entity resolution** — "Anthropic" in a search result must link to "Anthropic" in a packet
- **Cross-session reasoning** — "what the founder said in session 47 contradicts session 52"

Graph RAG adds a **knowledge graph layer** on top of vector retrieval: entities, relationships (edges), and graph traversal.

### NodeBench Already Has the Graph Schema

The existing `MemoryProvider` defines relationship types that ARE a knowledge graph:

```typescript
// Already in packages/mcp-local/src/providers/memoryProvider.ts
export type RelationType =
  | "related_to"     // generic association
  | "caused_by"      // causal chain
  | "supports"       // evidence for
  | "contradicts"    // conflict with
  | "follows"        // temporal sequence
  | "references"     // citation
  | "part_of"        // containment
  | "derived_from"   // lineage
```

The tool registry already does multi-hop BFS traversal:

```typescript
// Already in packages/mcp-local/src/tools/progressiveDiscoveryTools.ts
get_tool_quick_ref({ depth: 2 })  // BFS across relatedTools + nextTools edges
getCooccurrenceEdges(tool, { transitive: true })  // Transitive A→B→C inference
```

**What's missing:** wiring these graph primitives into the subconscious retrieval path.

### Architecture: 3-Layer Retrieval

```
Layer 1: Vector Store (existing)
  - Chunks from session transcripts, packets, search results
  - Embedding: HuggingFace 384-dim → Google → OpenAI fallback chain (already built)
  - Fast similarity search for "find related content"

Layer 2: Knowledge Graph (new)
  - Entities: companies, people, initiatives, packets, sessions, decisions
  - Edges: RelationType (supports, contradicts, caused_by, derived_from, etc.)
  - Built automatically from transcript processing + packet creation
  - Stored in SQLite with FTS5 (same DB as subconscious blocks)

Layer 3: Graph-Aware Retrieval (new)
  - Query → vector similarity → candidate entities → graph traversal → ranked results
  - Traversal follows edges to find connected context (not just similar text)
  - Contradiction detection = find entities connected by "contradicts" edges
  - Packet routing = traverse "derived_from" + "supports" edges from current context
```

### Entity Extraction Pipeline

When the Stop hook background worker processes a session transcript:

```typescript
interface GraphEntity {
  id: string;                          // deterministic hash
  name: string;                        // "Anthropic", "Series B", "MCP hackathon"
  type: EntityType;                    // company | person | initiative | packet | decision | event
  properties: Record<string, string>;  // stage, vertical, date, etc.
  sourceSessionIds: string[];          // which sessions mentioned this
  firstSeen: string;                   // ISO timestamp
  lastSeen: string;                    // ISO timestamp
  mentionCount: number;                // frequency signal
}

interface GraphEdge {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  relation: RelationType;              // reuses existing RelationType
  confidence: number;                  // 0-1, from extraction quality
  evidence: string;                    // the text that established this edge
  sourceSessionId: string;             // which session created this edge
  createdAt: string;
}

type EntityType =
  | "company"       // Anthropic, Stripe, competitor X
  | "person"        // founder, investor, teammate
  | "initiative"    // current sprint, product launch, fundraise
  | "packet"        // implementation packet, delegation packet, diligence packet
  | "decision"      // "we chose React over Vue", "pivoted from B2B to B2C"
  | "event"         // "Series A closed", "launched v2", "hired CTO"
  | "concept"       // "agent-native", "local-first", "packet loop"
  | "requirement"   // "SOC2 needed", "bank requires audited financials"
```

### Graph Traversal for Whisper Generation

When the UserPromptSubmit hook classifies a prompt, the graph retrieval path is:

```
1. Extract entities from prompt (lightweight NER)
2. Find matching graph entities (fuzzy match + alias resolution)
3. For each matched entity, traverse 1-2 hops:
   - "contradicts" edges → contradiction warnings
   - "derived_from" edges → packet lineage
   - "supports" edges → evidence for current direction
   - "caused_by" edges → root cause chains
4. Score traversal results by:
   - Edge confidence × recency × relevance to prompt classification
5. Generate whisper from top-scored traversal paths
```

**Example traversal:**

```
Prompt: "Build the API key management page"

Step 1: Extract entity → "API key management"
Step 2: Graph match → entity:initiative "API key management" (from packet PKT-001)
Step 3: Traverse edges:
  - "API key management" --derived_from--> "MCP gateway" (packet PKT-000)
  - "API key management" --supports--> "developer adoption" (decision D-012)
  - "API key management" --contradicts--> "local-first only" (decision D-003)
  - "MCP gateway" --part_of--> "current_wedge" (block)
Step 4: Score: contradiction edge scores highest (urgent signal)
Step 5: Whisper:
  "⚠ API key management supports developer adoption but contradicts
   the 'local-first only' decision (D-003). Confirm: is the wedge
   expanding to include hosted access? Use packet PKT-001 as base."
```

### When Graph RAG vs. When Flat Blocks

| Query Type | Retrieval Method | Why |
|------------|-----------------|-----|
| "What's the current wedge?" | Flat block read | Single block, no traversal needed |
| "What contradicts this?" | Graph traversal | Requires finding "contradicts" edges |
| "Which packets are relevant?" | Graph traversal | Requires "derived_from" + "supports" edges |
| "What changed recently?" | Flat block read | Time-windowed, no graph needed |
| "How does X relate to Y?" | Graph traversal | Multi-hop path finding |
| "What's the founder's style?" | Flat block read | Single block |
| "Should we build this feature?" | Graph + blocks | Traverse edges from feature → wedge → priorities → contradictions |

### Cost / Scale Decision Point

From research: Graph RAG becomes essential at **500-2,000 pages** (1M+ tokens). Below that, flat blocks + vector similarity suffice.

NodeBench scale trajectory:
- **Month 1-3**: <100 sessions, <50 packets → flat blocks sufficient
- **Month 3-6**: 100-500 sessions, 50-200 packets → hybrid (blocks + lightweight graph)
- **Month 6+**: 500+ sessions, 200+ packets → full graph retrieval essential

**Build order:** Start with flat blocks (Phase 1-2), add graph extraction in Phase 3, add graph traversal in Phase 4. Don't over-engineer day one.

### Implementation: LightRAG-Compatible but Self-Hosted

Instead of depending on LightRAG's Docker container, build a lightweight graph engine using existing NodeBench infrastructure:

```typescript
// packages/mcp-local/src/subconscious/graphEngine.ts

// SQLite tables (same subconscious.db)
const GRAPH_SCHEMA = `
  CREATE TABLE IF NOT EXISTS graph_entities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    properties TEXT DEFAULT '{}',     -- JSON
    source_session_ids TEXT DEFAULT '[]', -- JSON array
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    mention_count INTEGER DEFAULT 1,
    embedding BLOB                     -- 384-dim float32
  );

  CREATE TABLE IF NOT EXISTS graph_edges (
    id TEXT PRIMARY KEY,
    from_entity_id TEXT NOT NULL,
    to_entity_id TEXT NOT NULL,
    relation TEXT NOT NULL,            -- RelationType
    confidence REAL DEFAULT 0.8,
    evidence TEXT,
    source_session_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (from_entity_id) REFERENCES graph_entities(id),
    FOREIGN KEY (to_entity_id) REFERENCES graph_entities(id)
  );

  CREATE INDEX idx_edges_from ON graph_edges(from_entity_id);
  CREATE INDEX idx_edges_to ON graph_edges(to_entity_id);
  CREATE INDEX idx_edges_relation ON graph_edges(relation);
  CREATE VIRTUAL TABLE graph_entities_fts USING fts5(name, properties);
`;

// Graph traversal (reuses BFS pattern from progressive discovery)
async function traverseGraph(
  startEntityId: string,
  maxDepth: number = 2,
  relationFilter?: RelationType[]
): Promise<TraversalResult[]> {
  const visited = new Set<string>();
  const queue: Array<{ entityId: string; depth: number; path: GraphEdge[] }> = [
    { entityId: startEntityId, depth: 0, path: [] }
  ];
  const results: TraversalResult[] = [];

  while (queue.length > 0) {
    const { entityId, depth, path } = queue.shift()!;
    if (depth > maxDepth || visited.has(entityId)) continue;
    visited.add(entityId);

    const edges = await getEdgesFrom(entityId, relationFilter);
    for (const edge of edges) {
      const newPath = [...path, edge];
      results.push({
        entity: await getEntity(edge.toEntityId),
        hopDistance: depth + 1,
        path: newPath,
        reachedVia: edge.relation,
        confidence: newPath.reduce((acc, e) => acc * e.confidence, 1),
      });
      queue.push({ entityId: edge.toEntityId, depth: depth + 1, path: newPath });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
```

### Multimodal Future (Phase 6+)

When NodeBench ingests non-text artifacts (screenshots, diagrams, exported PDFs):
- Use the existing embedding fallback chain for multimodal embeddings
- Extract entities from images via vision model (already have Gemini access)
- Link image-extracted entities to the same graph
- "RAG-Anything" pattern: text graph + image graph + table graph, unified traversal

This is Phase 6+ — don't build until text graph is proven.

### Graph RAG MCP Tools (additions to subconscious toolset)

```typescript
const graphTools: McpTool[] = [
  {
    name: "traverse_entity_graph",
    description: "Find all entities and relationships connected to a starting entity within N hops",
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", description: "Entity name or ID to start from" },
        maxDepth: { type: "number", description: "Max traversal depth (1-3)", default: 2 },
        relationFilter: { type: "array", items: { type: "string" }, description: "Filter by relation type" },
      },
      required: ["entity"],
    },
    handler: async ({ entity, maxDepth, relationFilter }) =>
      traverseGraph(await resolveEntity(entity), maxDepth, relationFilter),
  },
  {
    name: "find_contradictions_for",
    description: "Find all entities that contradict a given entity or concept",
    inputSchema: {
      type: "object",
      properties: { entity: { type: "string" } },
      required: ["entity"],
    },
    handler: async ({ entity }) =>
      traverseGraph(await resolveEntity(entity), 2, ["contradicts"]),
  },
  {
    name: "get_packet_lineage",
    description: "Trace the full derivation chain for a packet",
    inputSchema: {
      type: "object",
      properties: { packetId: { type: "string" } },
      required: ["packetId"],
    },
    handler: async ({ packetId }) =>
      traverseGraph(packetId, 5, ["derived_from", "part_of", "caused_by"]),
  },
  {
    name: "get_entity_graph_summary",
    description: "Get a summary of the knowledge graph: entity counts by type, edge counts by relation, recent additions",
    inputSchema: { type: "object", properties: {} },
    handler: async () => getGraphSummary(),
  },
];
```

---

## Parselyfi Heritage: Patterns Ported to NodeBench Subconscious

The Parselyfi project (HomenShum/Parselyfi) was a previous-year financial data research tool that implemented many of the patterns NodeBench Subconscious needs. Key patterns carried forward:

### 1. Multi-Agent Company Research Pipeline

Parselyfi's `test7_create_company_report_LINKUP` implements a 4-agent pipeline:

```
Agent 1: entity_context_extraction_agent
  → NER from user text → company names + additional context

Agent 2: search_company_with_linkup
  → Linkup structured_output with LINKUP_COMPANY_SCHEMA
  → Fallback to unstructured search if structured fails

Agent 3: result_verification_agent
  → Cross-reference search results against known info
  → Source quality scoring, disambiguation

Agent 4: company_research_agent
  → Generate structured report with sections:
     executive_summary, competitive_landscape, tech_stack,
     market_position, leadership_team, funding, recent_news
```

**NodeBench Subconscious reuse:** The Stop hook background worker should use this same pipeline pattern — extract entities from transcript, enrich via search, verify against existing graph, update memory blocks.

### 2. LINKUP_COMPANY_SCHEMA → GraphEntity Properties

Parselyfi's structured company schema maps directly to our `GraphEntity.properties`:

```typescript
// Parselyfi schema fields → NodeBench GraphEntity properties
{
  company_name       → entity.name
  company_website    → properties.website
  company_description → properties.description
  industry           → properties.industry
  headquarters       → properties.headquarters
  founded_year       → properties.founded_year
  company_size       → properties.company_size
  business_model     → properties.business_model
  leadership_team    → spawns Person entities + "leads" edges
  products_services  → spawns Initiative entities + "offers" edges
  tech_stack         → properties.tech_stack (array)
  competitors        → spawns Company entities + "competes_with" edges
  market_position    → properties.market_position
  recent_news        → spawns Event entities + "announced" edges
  funding_info       → properties.funding_info
  sources            → edge.evidence (URL + title for provenance)
}
```

### 3. Knowledge Graph Visualization Format

Parselyfi's main app uses a D3.js-compatible graph format:

```typescript
// Parselyfi graph_data format (proven for visualization)
{
  nodes: [{ id: string, group: number, desc: string, type: string }],
  links: [{ source: string, target: string, value: number }]
}

// Parselyfi chapter-level entities + relationships
entities: [{ key: string, type: string }]
relationships: [{ source: string, target: string, desc: string, keys: string[] }]
```

**NodeBench Subconscious reuse:** The dashboard graph visualizer (Phase 6) should emit this same format from `graph_entities` + `graph_edges` tables for direct D3.js rendering.

### 4. Document Ingestion with Subsection-Level Entities

Parselyfi's `prod_ingestion_pipeline` uses Pydantic models with subsection granularity:

```
Document → Pages → Subsections → Entities + Numbers + Tables
```

Each subsection carries its own entity list, enabling fine-grained graph edges with page-level provenance. The cross-page merge logic (`merge_cutoff_subsections`) handles content that spans page boundaries.

**NodeBench Subconscious reuse:** When processing session transcripts in the Stop hook worker, chunk by turn (not by arbitrary token count), and extract entities per turn with turn-level provenance.

### 5. Verification + Disambiguation Pipeline

Parselyfi's `extract_disambiguated_company_info` + `result_verification_agent` pattern:

```
1. Extract entity names from ambiguous text
2. Search for structured data (Linkup structured_output)
3. Verify: does the search result match the intended entity?
4. Disambiguation: multiple entities with same name → use context to resolve
```

**NodeBench Subconscious reuse:** The entity extractor must include disambiguation. When "Apple" appears in a transcript, is it Apple Inc. or the fruit? Use surrounding context + existing graph entities to resolve. Store disambiguation confidence on the edge.

### 6. Structured Report Format with Q&A + Entity References

Parselyfi's chapter format:

```json
{
  "id": "chapter1",
  "title": "Executive Summary",
  "source": "Research_Paper.pdf",
  "summary": "...",
  "qna": [{"q": "...", "a": "...", "ref": "p.4"}],
  "entities": [{"key": "Anthropic", "type": "Company"}],
  "relationships": [{"source": "Anthropic", "target": "Claude", "desc": "Created"}]
}
```

**NodeBench Subconscious reuse:** This is the packet output format. Every packet should carry chapter-style structured sections with inline entity references and relationship maps, enabling graph edges to be extracted from packet content.

---

## Key Design Decisions

1. **Local-first, no Letta dependency** — Use NodeBench harness + SQLite, not Letta Cloud API
2. **Packet-aware, not blob-aware** — Whispers reference specific packets, not generic memory
3. **Classification-driven** — Every prompt is classified before deciding what to inject
4. **Suppression-first** — Default is to NOT whisper unless there's high-value signal
5. **12 typed blocks, not arbitrary memory** — Structure forces the system to be useful
6. **Async background processing** — Never block Claude Code; worker runs detached
7. **Mode system gives control** — Users choose their verbosity level
8. **Contradiction detection is a first-class feature** — Not an afterthought
9. **Parselyfi multi-agent pipeline** — Entity extraction → search → verification → synthesis is the worker pattern
10. **LINKUP_COMPANY_SCHEMA compatibility** — Company entities use the same structured fields as Parselyfi for Linkup interop
11. **Turn-level provenance** — Entity extraction per transcript turn, not per arbitrary chunk
12. **Disambiguation-first entity resolution** — Context + existing graph to resolve ambiguous names
