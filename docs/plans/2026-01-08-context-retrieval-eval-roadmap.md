# Context Retrieval & Eval Alignment Roadmap

**Date**: 2026-01-08
**Status**: Implementation Plan
**Priority**: P0 - Critical for Production Readiness

---

## Executive Summary

The current evaluation framework achieves 100% pass rate on `EXPANDED_EVAL_SCENARIOS` but tests a narrow "happy path" that bypasses the sophisticated context retrieval systems implemented in production. This document outlines the gaps between eval and real-world usage, and provides an implementation roadmap to achieve parity with leading CLI agents (Claude Code, Codex CLI, Chef by Convex).

---

## Part 1: Current State Analysis

### What We Have (Production Agent)

| Capability | Implementation | File Location |
|------------|----------------|---------------|
| **Memory-First Protocol** | `queryMemory` → `getOrBuildMemory` → `updateMemoryFromReview` | `convex/tools/knowledge/unifiedMemoryTools.ts` |
| **Scratchpad State** | `initScratchpad`, `updateScratchpad`, `compactContext` with invariants A/C/D | `convex/tools/document/contextTools.ts` |
| **Thread Persistence** | `continueThread` with `agentThreadId` | `convex/domains/agents/agentChatActions.ts` |
| **Quality Gates** | 10-persona evaluation with freshness/staleness checks | `convex/tools/research/entityInsights.ts` |
| **Multi-Media Analysis** | `analyzeMediaFile`, `searchMedia`, `listMediaFiles` | `convex/tools/media/mediaTools.ts` |
| **File Upload** | Image/PDF/video upload with GenAI analysis | `src/features/agents/components/FastAgentPanel/FastAgentPanel.FileUpload.tsx` |
| **Session Context** | `FastAgentContext` with dossier mode, options, thread list | `src/features/agents/context/FastAgentContext.tsx` |

### What the Eval Tests

| Aspect | Eval Reality | Production Reality |
|--------|--------------|-------------------|
| Context retrieval | `lookupGroundTruthEntity` (static mock) | `queryMemory` → hybrid vector/text search → RAG |
| Session state | Single-shot, no history | Scratchpad + thread persistence across messages |
| Staleness | Always "fresh" (mocked) | 30/60-day windows, `isStale`, `qualityTier` flags |
| Multi-turn | One query per scenario | Resume + invariant enforcement + context compaction |
| Persona | Hardcoded `expectedPersona` | Inferred from keywords + self-repair loop |
| Tool chains | 1 tool (`lookupGroundTruthEntity`) | 5-8 tool orchestration with dependency ordering |
| Media context | Not tested | File upload → `analyzeMediaFile` → context injection |

---

## Part 2: Gap Analysis vs Leading CLI Agents

### Claude Code (with claude-context)

**What they do:**
- Semantic vector search via Zilliz/FAISS (40% token reduction vs grep-only)
- Intelligent code chunking along function/class boundaries
- MCP server integration for codebase-wide context

**Our gap:**
- `queryMemory` exists but is bypassed in eval
- `entityContexts` has quality tiers but eval uses ground truth bypass
- No codebase indexing (not needed for research agent, but media indexing is)

**Action items:**
1. Add `queryMemory`-first scenarios to eval
2. Test staleness handling with injected stale memories
3. Implement media file indexing with embeddings

### Codex CLI

**What they do:**
- Session resume with `codex resume --last`
- Context compaction for long-horizon work (GPT-5.2-Codex)
- AGENTS.md layering (global → project → directory)
- Transcript storage for multi-session continuity

**Our gap:**
- `initScratchpad` + `compactContext` exist but untested in eval
- Thread persistence works but eval runs single-shot
- No AGENTS.md equivalent (we have instructions in `coordinatorAgent.ts`)

**Action items:**
1. Add multi-turn eval scenarios with `continueThread`
2. Test `compactContext` output format validation
3. Add invariant violation detection scenarios

### Chef by Convex

**What they do:**
- Automatic conversation context in each LLM call
- Hybrid vector/text search for messages
- Thread sharing among users and agents
- Built-in RAG component integration

**Our implementation already matches:**
- `@convex-dev/agent` component with thread persistence ✓
- `queryMemory` with hybrid search ✓
- Multi-user thread support ✓
- RAG via `entityContexts` ✓

**Action items:**
1. Verify thread sharing works across agent types
2. Add cross-agent memory access scenarios

---

## Part 3: Implementation Roadmap

### Phase 1: Memory-First Eval Scenarios (Week 1)

#### 1.1 Add Ambiguous Query Scenarios

These should trigger `queryMemory` BEFORE `lookupGroundTruthEntity`:

```typescript
// convex/domains/evaluation/memoryFirstScenarios.ts
export const MEMORY_FIRST_SCENARIOS = [
  {
    id: "memory_ambiguous_disco",
    name: "Memory: Ambiguous DISCO query",
    query: "What do we know about DISCO?", // No persona cues
    validation: {
      mustCallTools: ["queryMemory"],
      mustCallBefore: { "queryMemory": ["lookupGroundTruthEntity", "getBankerGradeEntityInsights"] },
      mustNotCallFirst: ["lookupGroundTruthEntity"], // Should NOT skip to ground truth
    },
  },
  {
    id: "memory_recall_tesla",
    name: "Memory: Recall previous Tesla research",
    setup: {
      injectMemory: {
        entityName: "Tesla",
        facts: ["CEO: Elon Musk", "Q3 2025 deliveries: 435K"],
        ageInDays: 5,
        qualityTier: "good",
      },
    },
    query: "Remind me about Tesla's latest numbers",
    validation: {
      mustCallTools: ["queryMemory"],
      mustUseMemoryFacts: true,
      mustNotCall: ["linkupSearch", "delegateToEntityResearchAgent"], // Fresh memory = no external
    },
  },
];
```

#### 1.2 Staleness Scenarios

```typescript
export const STALENESS_SCENARIOS = [
  {
    id: "stale_banker_disco",
    name: "Staleness: DISCO fails banker window",
    setup: {
      injectStaleMemory: {
        entity: "DISCO",
        ageInDays: 45, // > 30 days = JPM_STARTUP_BANKER auto-FAIL
        qualityTier: "fair",
      },
    },
    query: "Is DISCO ready for banker outreach this week?",
    expectedOutcome: "FAIL",
    validation: {
      outputMustContain: ["stale", "outdated", "refresh", "not current"],
      personaGateMustFail: "JPM_STARTUP_BANKER",
    },
  },
  {
    id: "stale_vc_acceptable",
    name: "Staleness: 45-day memory OK for VC",
    setup: {
      injectStaleMemory: {
        entity: "DISCO",
        ageInDays: 45, // Still < 60 days = EARLY_STAGE_VC OK
      },
    },
    query: "What's DISCO's thesis fit for our fund?",
    expectedPersona: "EARLY_STAGE_VC",
    expectedOutcome: "PASS",
    validation: {
      personaGateMustPass: "EARLY_STAGE_VC",
    },
  },
];
```

#### 1.3 Quality Tier Scenarios

```typescript
export const QUALITY_TIER_SCENARIOS = [
  {
    id: "quality_excellent_skip_enrichment",
    name: "Quality: Excellent tier skips re-enrichment",
    setup: {
      injectMemory: {
        entity: "DISCO",
        qualityTier: "excellent",
        facts: [/* 10+ verified facts */],
        sources: [/* 3+ primary sources */],
      },
    },
    query: "Tell me about DISCO for my weekly target list",
    validation: {
      mustCallTools: ["queryMemory"],
      mustNotCall: ["getBankerGradeEntityInsights", "enrichCompanyDossier"], // Skip enrichment
    },
  },
  {
    id: "quality_poor_triggers_enrichment",
    name: "Quality: Poor tier triggers full enrichment",
    setup: {
      injectMemory: {
        entity: "DISCO",
        qualityTier: "poor",
        facts: ["Name: DISCO"], // Only 1 fact
      },
    },
    query: "Research DISCO for investment thesis",
    validation: {
      mustCallTools: ["queryMemory", "getBankerGradeEntityInsights"],
      toolOrdering: ["queryMemory", "getBankerGradeEntityInsights", "updateMemoryFromReview"],
    },
  },
];
```

---

### Phase 2: Multi-Turn & Session Resume (Week 2)

#### 2.1 Multi-Turn Scenarios

```typescript
// convex/domains/evaluation/multiTurnScenarios.ts
export const MULTI_TURN_SCENARIOS = [
  {
    id: "multi_turn_entity_comparison",
    name: "Multi-turn: Entity comparison across turns",
    turns: [
      {
        query: "Research Tesla for me",
        validation: {
          mustCallTools: ["initScratchpad", "queryMemory"],
          scratchpadMustContain: { activeEntities: ["Tesla"] },
        },
      },
      {
        query: "Now compare to Rivian",
        validation: {
          mustCallTools: ["decomposeQuery"], // Multi-entity detection
          scratchpadMustContain: { activeEntities: ["Tesla", "Rivian"] },
          mustReuseContext: true, // Must not re-init scratchpad from scratch
        },
      },
      {
        query: "Which is better for our portfolio?",
        validation: {
          mustSynthesizeAcrossEntities: true,
          outputMustContain: ["Tesla", "Rivian", "comparison", "recommend"],
        },
      },
    ],
  },
];
```

#### 2.2 Scratchpad Invariant Scenarios

```typescript
export const INVARIANT_SCENARIOS = [
  {
    id: "invariant_a_message_isolation",
    name: "Invariant A: Message ID isolation",
    turns: [
      {
        query: "Research DISCO",
        captureMessageId: true,
      },
      {
        query: "Now research Ambros",
        validation: {
          messageIdMustDiffer: true, // New messageId for new message
          memoryUpdatedEntitiesMustReset: true, // Fresh dedupe set
        },
      },
    ],
  },
  {
    id: "invariant_c_memory_dedupe",
    name: "Invariant C: Memory deduplication",
    query: "Deep dive on Tesla with full enrichment",
    validation: {
      mustCallTools: ["updateMemoryFromReview"],
      mustNotCallTwice: ["updateMemoryFromReview"], // Dedupe enforced
      scratchpadMustContain: { memoryUpdatedEntities: ["company:TSLA"] },
    },
  },
  {
    id: "invariant_d_capability_version",
    name: "Invariant D: Capability version check before planning",
    query: "Plan a comprehensive analysis of the AI chip market",
    validation: {
      mustCallBefore: { "discoverCapabilities": "sequentialThinking" },
      scratchpadMustContain: { capabilitiesVersion: /^v\d+/ },
    },
  },
];
```

#### 2.3 Context Compaction Scenarios

```typescript
export const COMPACTION_SCENARIOS = [
  {
    id: "compaction_long_research",
    name: "Compaction: Long research triggers compaction",
    query: "Build a comprehensive dossier on Tesla, including SEC filings, founder backgrounds, and competitive analysis",
    validation: {
      toolCallCountMinimum: 5, // Long enough to need compaction
      mustCallTools: ["compactContext"],
      compactContextOutputMustHave: ["facts", "constraints", "missing", "nextSteps"],
    },
  },
];
```

---

### Phase 3: Persona Inference & Self-Repair (Week 3)

#### 3.1 Persona Inference Scenarios (No Hardcoded Expected Persona)

```typescript
export const PERSONA_INFERENCE_SCENARIOS = [
  {
    id: "infer_vc_from_keywords",
    name: "Persona Inference: VC from thesis keywords",
    query: "What's DISCO's wedge and thesis fit? How does it compare to comps?",
    // NO expectedPersona - agent must infer
    validation: {
      inferredPersonaMustBe: "EARLY_STAGE_VC", // Based on "wedge", "thesis", "comps"
      outputMustMatch: /Thesis|Why it matters|Competitive map/,
    },
  },
  {
    id: "infer_cto_from_security",
    name: "Persona Inference: CTO from CVE keywords",
    query: "What's the security exposure for QuickJS? Any patches available?",
    validation: {
      inferredPersonaMustBe: "CTO_TECH_LEAD", // Based on "security", "CVE", "patches"
      outputMustMatch: /Exposure|Impact|Mitigation|Patch/,
    },
  },
  {
    id: "infer_quant_from_metrics",
    name: "Persona Inference: Quant from signal keywords",
    query: "What metrics should I track for DISCO? Any signals worth monitoring?",
    validation: {
      inferredPersonaMustBe: "QUANT_ANALYST", // Based on "metrics", "track", "signals"
      outputMustMatch: /Signal|Variables|Track|Data gaps/,
    },
  },
];
```

#### 3.2 Self-Repair Loop Scenarios

```typescript
export const SELF_REPAIR_SCENARIOS = [
  {
    id: "self_repair_missing_contact",
    name: "Self-Repair: Missing contact triggers tool call",
    setup: {
      injectMemory: {
        entity: "DISCO",
        facts: ["CEO: Fabian Niehaus", "HQ: Cologne"],
        missingFields: ["primaryContact", "email"],
      },
    },
    query: "Get me DISCO's contact for outreach",
    expectedPersona: "JPM_STARTUP_BANKER",
    validation: {
      // Agent should detect missing contact and call enrichment
      mustCallTools: ["queryMemory", "enrichCompanyDossier"],
      outputMustContain: ["contact", "email", "reach out"],
    },
  },
];
```

---

### Phase 4: Multi-Media Context Integration (Week 4)

#### 4.1 File Upload Context Scenarios

```typescript
export const MEDIA_CONTEXT_SCENARIOS = [
  {
    id: "media_pdf_analysis",
    name: "Media: PDF analysis with context injection",
    setup: {
      uploadFile: {
        type: "application/pdf",
        name: "DISCO_Pitch_Deck.pdf",
        mockContent: "DISCO Pharmaceuticals\nSeed Round: €36M\nPlatform: Disc-Seq...",
      },
    },
    query: "Analyze this pitch deck and tell me if DISCO is a good banker target",
    validation: {
      mustCallTools: ["analyzeMediaFile", "queryMemory"],
      contextMustInclude: "attachedFiles",
      outputMustReference: ["pitch deck", "DISCO", "Seed"],
    },
  },
  {
    id: "media_image_entity_extraction",
    name: "Media: Image analysis with entity extraction",
    setup: {
      uploadFile: {
        type: "image/png",
        name: "team_photo.png",
        mockAnalysis: "Photo shows Fabian Niehaus (CEO) and team at lab",
      },
    },
    query: "Who are these people and what company are they from?",
    validation: {
      mustCallTools: ["analyzeMediaFile"],
      outputMustContain: ["Fabian Niehaus", "CEO", "DISCO"],
    },
  },
];
```

#### 4.2 Multi-Modal Synthesis Scenarios

```typescript
export const MULTI_MODAL_SCENARIOS = [
  {
    id: "multi_modal_doc_plus_web",
    name: "Multi-Modal: Uploaded doc + web search synthesis",
    setup: {
      uploadFile: {
        type: "application/pdf",
        name: "old_disco_memo.pdf",
        mockContent: "DISCO last valued at €20M (2024 estimate)",
      },
    },
    query: "Compare this old memo's valuation to current news about DISCO's funding",
    validation: {
      mustCallTools: ["analyzeMediaFile", "linkupSearch", "queryMemory"],
      outputMustContain: ["€20M", "€36M", "increased", "Seed round"],
    },
  },
];
```

---

### Phase 5: Fast Agent Panel Integration (Week 5)

#### 5.1 UI Context Binding

Add real-time scratchpad visibility to Fast Agent Panel:

```typescript
// src/features/agents/components/FastAgentPanel/FastAgentPanel.Scratchpad.tsx
export function ScratchpadView({ threadId }: { threadId: string }) {
  const scratchpad = useQuery(api.domains.agents.agentMemory.getScratchpad, { threadId });

  return (
    <div className="scratchpad-view">
      <div className="scratchpad-section">
        <h4>Active Entities</h4>
        <TagList tags={scratchpad?.activeEntities ?? []} />
      </div>

      <div className="scratchpad-section">
        <h4>Memory Updated</h4>
        <TagList tags={scratchpad?.memoryUpdatedEntities ?? []} variant="success" />
      </div>

      <div className="scratchpad-section">
        <h4>Current Intent</h4>
        <Badge>{scratchpad?.currentIntent ?? "unknown"}</Badge>
      </div>

      <div className="scratchpad-section">
        <h4>Safety Counters</h4>
        <div className="counters">
          <span>Steps: {scratchpad?.stepCount ?? 0}/8</span>
          <span>Tool Calls: {scratchpad?.toolCallCount ?? 0}/12</span>
          <span>Planning: {scratchpad?.planningCallCount ?? 0}/2</span>
        </div>
      </div>
    </div>
  );
}
```

#### 5.2 Memory Query Preview

Show what `queryMemory` returns before external calls:

```typescript
// src/features/agents/components/FastAgentPanel/FastAgentPanel.MemoryPreview.tsx
export function MemoryPreviewCard({ entityName }: { entityName: string }) {
  const memory = useQuery(api.tools.knowledge.unifiedMemoryTools.queryMemoryPreview, {
    query: entityName,
  });

  return (
    <Card>
      <CardHeader>
        <h4>Memory: {entityName}</h4>
        <Badge variant={memory?.found ? "success" : "warning"}>
          {memory?.found ? "Found" : "Not Found"}
        </Badge>
      </CardHeader>
      <CardBody>
        {memory?.found && (
          <>
            <div>Quality: {memory.qualityTier}</div>
            <div>Age: {memory.ageInDays} days</div>
            <div>Stale: {memory.isStale ? "Yes" : "No"}</div>
            <div>Facts: {memory.keyFacts?.length ?? 0}</div>
          </>
        )}
        {!memory?.found && (
          <p>No memory found. Will trigger enrichment on research.</p>
        )}
      </CardBody>
    </Card>
  );
}
```

#### 5.3 Disclosure Trace Integration

The `FastAgentPanel.DisclosureTrace.tsx` already exists. Enhance it to show:

1. **Tool call ordering** - Did `queryMemory` come before external calls?
2. **Invariant status** - Are A/C/D invariants satisfied?
3. **Compaction events** - When did `compactContext` run?
4. **Memory updates** - Which entities got new facts?

---

### Phase 6: Comprehensive Eval Harness (Week 6)

#### 6.1 New Eval Action with Full Validation

```typescript
// convex/domains/evaluation/comprehensiveEval.ts
export const runComprehensiveEval = action({
  args: {
    secret: v.string(),
    model: v.string(),
    suites: v.array(v.union(
      v.literal("memory-first"),
      v.literal("staleness"),
      v.literal("multi-turn"),
      v.literal("invariants"),
      v.literal("persona-inference"),
      v.literal("media-context"),
      v.literal("compaction"),
    )),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const suite of args.suites) {
      const scenarios = loadScenarios(suite);

      for (const scenario of scenarios) {
        // 1. Setup phase (inject memory, files, etc.)
        if (scenario.setup) {
          await executeSetup(ctx, scenario.setup);
        }

        // 2. Run through all turns
        const turnResults = [];
        let threadId: string | undefined;

        for (const turn of scenario.turns ?? [{ query: scenario.query }]) {
          const result = await runSingleTurn(ctx, {
            query: turn.query,
            threadId, // Reuse for multi-turn
            model: args.model,
          });

          threadId = result.threadId;
          turnResults.push(result);
        }

        // 3. Validate against scenario rules
        const validation = validateScenario(scenario, turnResults);

        results.push({
          id: scenario.id,
          name: scenario.name,
          suite,
          ok: validation.passed,
          turns: turnResults,
          validation,
        });
      }
    }

    return {
      ok: results.every(r => r.ok),
      summary: {
        total: results.length,
        passed: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
      },
      bySuite: groupBy(results, r => r.suite),
      results,
    };
  },
});
```

#### 6.2 Validation Functions

```typescript
// convex/domains/evaluation/validators.ts
export function validateToolOrdering(
  toolCalls: ToolCall[],
  rules: { mustCallBefore: Record<string, string[]> }
): ValidationResult {
  const errors: string[] = [];
  const callOrder = toolCalls.map(c => c.name);

  for (const [before, afters] of Object.entries(rules.mustCallBefore)) {
    const beforeIndex = callOrder.indexOf(before);
    if (beforeIndex === -1) {
      errors.push(`Required tool ${before} was not called`);
      continue;
    }

    for (const after of afters) {
      const afterIndex = callOrder.indexOf(after);
      if (afterIndex !== -1 && afterIndex < beforeIndex) {
        errors.push(`${after} called before ${before} (expected ${before} first)`);
      }
    }
  }

  return { passed: errors.length === 0, errors };
}

export function validateScratchpadState(
  scratchpad: Scratchpad,
  rules: { mustContain: Record<string, any> }
): ValidationResult {
  const errors: string[] = [];

  for (const [key, expected] of Object.entries(rules.mustContain)) {
    const actual = scratchpad[key as keyof Scratchpad];

    if (expected instanceof RegExp) {
      if (!expected.test(String(actual))) {
        errors.push(`Scratchpad.${key} did not match ${expected}`);
      }
    } else if (Array.isArray(expected)) {
      if (!expected.every(e => (actual as any[])?.includes(e))) {
        errors.push(`Scratchpad.${key} missing expected values`);
      }
    } else if (actual !== expected) {
      errors.push(`Scratchpad.${key} was ${actual}, expected ${expected}`);
    }
  }

  return { passed: errors.length === 0, errors };
}

export function validatePersonaInference(
  debrief: DebriefV1,
  rules: { inferredPersonaMustBe: Persona }
): ValidationResult {
  if (debrief.persona.inferred !== rules.inferredPersonaMustBe) {
    return {
      passed: false,
      errors: [`Inferred persona ${debrief.persona.inferred}, expected ${rules.inferredPersonaMustBe}`],
    };
  }
  return { passed: true, errors: [] };
}
```

---

## Part 4: Success Metrics

### Eval Coverage Targets

| Suite | Scenario Count | Pass Rate Target |
|-------|----------------|-----------------|
| memory-first | 10 | 95% |
| staleness | 8 | 100% |
| multi-turn | 6 | 90% |
| invariants | 6 | 100% |
| persona-inference | 10 | 85% |
| media-context | 8 | 90% |
| compaction | 4 | 100% |

### Production Alignment Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Tool ordering accuracy | Not measured | 95% |
| Memory-first compliance | Not measured | 90% |
| Invariant violations | Not measured | 0% |
| Persona inference accuracy | Not measured | 85% |
| Context compaction trigger rate | Not measured | >50% for long queries |

---

## Part 5: Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Memory-First | `memoryFirstScenarios.ts`, staleness injection, quality tier tests |
| 2 | Multi-Turn | `multiTurnScenarios.ts`, invariant validation, compaction tests |
| 3 | Persona Inference | `personaInferenceScenarios.ts`, self-repair loop tests |
| 4 | Media Context | `mediaContextScenarios.ts`, multi-modal synthesis tests |
| 5 | Fast Agent Panel | Scratchpad view, memory preview, disclosure trace enhancements |
| 6 | Comprehensive Eval | `comprehensiveEval.ts` action, full validation harness |

---

## Part 6: Prompt Enhancer System (Week 7-8)

### Research: What Leading Tools Do

#### Augment Code's Prompt Enhancer

[Augment Code](https://www.augmentcode.com/blog/prompt-enhancer-live-in-augment-chat) pioneered the "prompt enhancer" pattern that rewrites user prompts before sending to the LLM:

**How it works:**
1. User types a vague prompt (e.g., "fix the bug")
2. User clicks ✨ button or presses `Ctrl+P`
3. System pulls relevant context from codebase and session
4. Prompt is rewritten with structure, file references, and conventions
5. User can review/edit the enhanced prompt before sending
6. Enhanced prompt goes to model → better first-try responses

**Key benefits:**
- **40% fewer tool calls** - Better prompts = less back-and-forth
- **Transparent editing** - User sees what gets sent
- **Context integration** - Automatically includes relevant files, patterns, dependencies

**Technical flow (from [docs](https://docs.augmentcode.com/cli/interactive/prompt-enhancer)):**
```
1. Input Capture → Save current text to history
2. Mode Switch → Interface transitions to "Enhancement mode"
3. Service Processing → Send prompt + workspace context to enhancement service
4. Response Extraction → Process and pull enhanced prompt
5. Input Replacement → Enhanced version replaces original
```

#### Convex Chef's System Prompt Injection

[Chef by Convex](https://github.com/get-convex/chef) takes a different approach - injecting rich context at the system level:

**How it works:**
1. User prompt travels to server "along with system prompt"
2. System prompt includes:
   - Adapted Convex rules customized for the template
   - Tool documentation with examples
   - Example workflows showing write/edit/view patterns
3. LLM sees user prompt + rich system context
4. Feedback loop via `npx convex dev` typechecking

**Key insight from [lessons learned](https://stack.convex.dev/lessons-from-building-an-ai-app-builder):**
> "The system prompt includes examples demonstrating how the LLM should address user requests... showing proper usage of write, edit, and view tools for code evaluation."

---

### Current State in NodeBench

We have **partial prompt enhancement** but it's fragmented:

| Component | What It Does | Gap |
|-----------|--------------|-----|
| `buildDossierContextPrefix()` | Adds dossier act/section/chart context | Only for dossier mode |
| `buildPromptWithTemporalContext()` | Extracts and injects date ranges | Only temporal, no entity/memory |
| `FastAgentPanel.InputBar` `contextPrefix` | Injects calendar events + selection context | Client-side only, no memory |
| `AgentOpenOptions.initialMessage` | Pre-fills prompt with context | Static, no enhancement |

**What's missing:**
1. **Memory-aware enhancement** - Should inject what `queryMemory` knows
2. **Entity extraction** - Should detect and expand entity references
3. **Persona hints** - Should add persona-relevant keywords for better inference
4. **User-visible enhancement** - Should show diff before sending
5. **Tool hints** - Should suggest which tools are relevant

---

### Implementation Plan

#### 7.1 Prompt Enhancement Service (Backend)

```typescript
// convex/domains/agents/promptEnhancer.ts
import { action } from "../../../_generated/server";
import { v } from "convex/values";

interface EnhancedPrompt {
  original: string;
  enhanced: string;
  diff: PromptDiff[];
  injectedContext: {
    entities: EntityContext[];
    memory: MemorySummary[];
    temporalRange?: TemporalContext;
    dossierContext?: DossierContext;
    suggestedTools: string[];
    personaHint?: string;
  };
}

interface PromptDiff {
  type: "added" | "context";
  content: string;
  source: string; // e.g., "memory:DISCO", "temporal", "persona"
}

export const enhancePrompt = action({
  args: {
    prompt: v.string(),
    threadId: v.optional(v.string()),
    dossierContext: v.optional(v.any()),
    attachedFileIds: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<EnhancedPrompt> => {
    const original = args.prompt;
    const parts: string[] = [];
    const diff: PromptDiff[] = [];
    const injectedContext: EnhancedPrompt["injectedContext"] = {
      entities: [],
      memory: [],
      suggestedTools: [],
    };

    // 1. Extract entities from prompt
    const entities = await extractEntities(ctx, original);
    injectedContext.entities = entities;

    // 2. Query memory for each entity
    for (const entity of entities) {
      const memory = await ctx.runQuery(
        api.tools.knowledge.unifiedMemoryTools.queryMemoryInternal,
        { query: entity.name }
      );

      if (memory.found && memory.memories.length > 0) {
        const best = memory.memories[0];
        injectedContext.memory.push({
          entityName: entity.name,
          qualityTier: best.qualityTier,
          ageInDays: best.ageInDays,
          factCount: best.keyFacts?.length ?? 0,
          isStale: best.isStale,
        });

        // Add memory context to prompt
        const memoryHint = `[Memory: ${entity.name} - ${best.qualityTier} quality, ${best.ageInDays}d old, ${best.keyFacts?.length ?? 0} facts]`;
        parts.push(memoryHint);
        diff.push({ type: "added", content: memoryHint, source: `memory:${entity.name}` });
      }
    }

    // 3. Extract and inject temporal context
    const temporal = extractTemporalContext(original);
    if (temporal) {
      injectedContext.temporalRange = temporal;
      const temporalHint = `[Timeframe: ${temporal.label} (${temporal.startDate} to ${temporal.endDate})]`;
      parts.push(temporalHint);
      diff.push({ type: "added", content: temporalHint, source: "temporal" });
    }

    // 4. Add dossier context if present
    if (args.dossierContext) {
      injectedContext.dossierContext = args.dossierContext;
      const dossierHint = buildDossierContextPrefix(args.dossierContext);
      if (dossierHint) {
        parts.push(dossierHint);
        diff.push({ type: "added", content: dossierHint, source: "dossier" });
      }
    }

    // 5. Infer persona and add hint
    const personaHint = inferPersonaFromQuery(original);
    if (personaHint) {
      injectedContext.personaHint = personaHint.persona;
      const hint = `[Persona hint: ${personaHint.persona} - ${personaHint.keywords.join(", ")}]`;
      parts.push(hint);
      diff.push({ type: "added", content: hint, source: "persona" });
    }

    // 6. Suggest relevant tools based on intent
    const suggestedTools = suggestTools(original, entities, personaHint);
    injectedContext.suggestedTools = suggestedTools;

    // 7. Add file context if attached
    if (args.attachedFileIds?.length) {
      const fileHint = `[Attached files: ${args.attachedFileIds.length} file(s) - will analyze with analyzeMediaFile]`;
      parts.push(fileHint);
      diff.push({ type: "added", content: fileHint, source: "files" });
      injectedContext.suggestedTools.push("analyzeMediaFile");
    }

    // 8. Build enhanced prompt
    const contextBlock = parts.length > 0 ? `${parts.join("\n")}\n\n---\n\n` : "";
    const enhanced = `${contextBlock}${original}`;

    return { original, enhanced, diff, injectedContext };
  },
});

// Helper: Extract entity mentions from prompt
async function extractEntities(ctx: any, prompt: string): Promise<EntityContext[]> {
  const entities: EntityContext[] = [];

  // Check against ground truth entities first
  const groundTruthNames = [
    "DISCO", "Ambros", "ClearSpace", "OpenAutoGLM", "NeuralForge",
    "VaultPay", "GenomiQ", "QuickJS", "MicroQuickJS", "SoundCloud",
    "Salesforce", "Agentforce", "Gemini", "Tesla", "Rivian"
  ];

  for (const name of groundTruthNames) {
    if (prompt.toLowerCase().includes(name.toLowerCase())) {
      entities.push({ name, type: "ground_truth", confidence: 1.0 });
    }
  }

  // Use LLM for additional entity extraction if needed
  if (entities.length === 0) {
    // Could call a lightweight entity extraction model here
    // For now, use regex patterns for company-like mentions
    const companyPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|Ltd|LLC|AI|Labs))?)\b/g;
    const matches = prompt.match(companyPattern) ?? [];
    for (const match of matches.slice(0, 3)) { // Limit to 3
      entities.push({ name: match, type: "inferred", confidence: 0.7 });
    }
  }

  return entities;
}

// Helper: Infer persona from query keywords
function inferPersonaFromQuery(prompt: string): { persona: string; keywords: string[] } | null {
  const lower = prompt.toLowerCase();
  const personaKeywords: Record<string, string[]> = {
    EARLY_STAGE_VC: ["wedge", "thesis", "comps", "market fit", "tam"],
    QUANT_ANALYST: ["signal", "metrics", "track", "time-series", "forecast"],
    PRODUCT_DESIGNER: ["schema", "ui", "card", "rendering", "json fields"],
    SALES_ENGINEER: ["share-ready", "one-screen", "objections", "cta"],
    CTO_TECH_LEAD: ["cve", "security", "patch", "upgrade", "dependency"],
    ECOSYSTEM_PARTNER: ["partnerships", "ecosystem", "second-order"],
    FOUNDER_STRATEGY: ["positioning", "strategy", "pivot", "moat"],
    ENTERPRISE_EXEC: ["pricing", "vendor", "cost", "procurement", "p&l"],
    ACADEMIC_RD: ["papers", "methodology", "literature", "citations"],
    JPM_STARTUP_BANKER: ["outreach", "pipeline", "this week", "contact", "target"],
  };

  for (const [persona, keywords] of Object.entries(personaKeywords)) {
    const matched = keywords.filter(k => lower.includes(k));
    if (matched.length >= 1) {
      return { persona, keywords: matched };
    }
  }

  return null;
}

// Helper: Suggest tools based on intent
function suggestTools(
  prompt: string,
  entities: EntityContext[],
  personaHint: { persona: string } | null
): string[] {
  const tools: string[] = [];
  const lower = prompt.toLowerCase();

  // Memory-first is always suggested for entity queries
  if (entities.length > 0) {
    tools.push("queryMemory");
  }

  // Research triggers
  if (lower.includes("research") || lower.includes("deep dive") || lower.includes("dossier")) {
    tools.push("getBankerGradeEntityInsights", "enrichCompanyDossier");
  }

  // Web search triggers
  if (lower.includes("news") || lower.includes("latest") || lower.includes("recent")) {
    tools.push("linkupSearch", "getLiveFeed");
  }

  // SEC triggers
  if (lower.includes("sec") || lower.includes("10-k") || lower.includes("filing")) {
    tools.push("delegateToSECAgent");
  }

  // Calendar/scheduling triggers
  if (lower.includes("schedule") || lower.includes("meeting") || lower.includes("calendar")) {
    tools.push("createEvent", "listEvents");
  }

  return [...new Set(tools)]; // Dedupe
}
```

#### 7.2 Enhancement Preview UI Component

```typescript
// src/features/agents/components/FastAgentPanel/FastAgentPanel.PromptEnhancer.tsx
import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { diffLines } from "diff";

interface PromptEnhancerProps {
  value: string;
  onChange: (value: string) => void;
  threadId?: string;
  dossierContext?: DossierContext;
  attachedFileIds?: string[];
  onEnhanced?: (enhanced: EnhancedPrompt) => void;
}

export function PromptEnhancer({
  value,
  onChange,
  threadId,
  dossierContext,
  attachedFileIds,
  onEnhanced,
}: PromptEnhancerProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [preview, setPreview] = useState<EnhancedPrompt | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const enhancePromptAction = useAction(api.domains.agents.promptEnhancer.enhancePrompt);

  const handleEnhance = async () => {
    if (!value.trim()) return;

    setIsEnhancing(true);
    try {
      const result = await enhancePromptAction({
        prompt: value,
        threadId,
        dossierContext,
        attachedFileIds,
      });

      setPreview(result);
      setShowDiff(true);
      onEnhanced?.(result);
    } catch (error) {
      console.error("Enhancement failed:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAccept = () => {
    if (preview) {
      onChange(preview.enhanced);
      setPreview(null);
      setShowDiff(false);
    }
  };

  const handleReject = () => {
    setPreview(null);
    setShowDiff(false);
  };

  return (
    <div className="prompt-enhancer">
      {/* Enhancement button */}
      <button
        onClick={handleEnhance}
        disabled={isEnhancing || !value.trim()}
        className="enhance-button"
        title="Enhance prompt with context (Ctrl+P)"
      >
        {isEnhancing ? "✨ Enhancing..." : "✨"}
      </button>

      {/* Diff preview modal */}
      {showDiff && preview && (
        <div className="enhancement-preview">
          <div className="preview-header">
            <h4>Enhanced Prompt Preview</h4>
            <div className="preview-actions">
              <button onClick={handleAccept} className="accept-btn">
                ✓ Accept
              </button>
              <button onClick={handleReject} className="reject-btn">
                ✗ Cancel
              </button>
            </div>
          </div>

          {/* Context injection summary */}
          <div className="injected-context">
            {preview.injectedContext.memory.length > 0 && (
              <div className="context-section">
                <span className="label">Memory:</span>
                {preview.injectedContext.memory.map((m, i) => (
                  <span key={i} className={`memory-badge ${m.qualityTier}`}>
                    {m.entityName} ({m.qualityTier}, {m.factCount} facts)
                  </span>
                ))}
              </div>
            )}

            {preview.injectedContext.personaHint && (
              <div className="context-section">
                <span className="label">Persona:</span>
                <span className="persona-badge">
                  {preview.injectedContext.personaHint}
                </span>
              </div>
            )}

            {preview.injectedContext.suggestedTools.length > 0 && (
              <div className="context-section">
                <span className="label">Tools:</span>
                {preview.injectedContext.suggestedTools.map((tool, i) => (
                  <span key={i} className="tool-badge">{tool}</span>
                ))}
              </div>
            )}
          </div>

          {/* Diff view */}
          <div className="diff-view">
            {preview.diff.map((d, i) => (
              <div key={i} className={`diff-line ${d.type}`}>
                <span className="diff-source">[{d.source}]</span>
                <span className="diff-content">{d.content}</span>
              </div>
            ))}
            <div className="original-prompt">
              {preview.original}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 7.3 Keyboard Shortcut Integration

```typescript
// src/features/agents/components/FastAgentPanel/FastAgentPanel.InputBar.tsx
// Add to existing InputBar component

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+P or Cmd+P to trigger enhancement
    if ((e.ctrlKey || e.metaKey) && e.key === "p") {
      e.preventDefault();
      handleEnhance();
    }

    // Escape to cancel enhancement preview
    if (e.key === "Escape" && showEnhancementPreview) {
      setShowEnhancementPreview(false);
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [handleEnhance, showEnhancementPreview]);
```

---

### 7.4 Eval Scenarios for Prompt Enhancement

```typescript
// convex/domains/evaluation/promptEnhancerScenarios.ts
export const PROMPT_ENHANCER_SCENARIOS = [
  {
    id: "enhance_vague_entity",
    name: "Enhancement: Vague entity query gets memory context",
    originalPrompt: "Tell me about DISCO",
    setup: {
      injectMemory: {
        entity: "DISCO",
        qualityTier: "good",
        facts: ["CEO: Fabian Niehaus", "HQ: Cologne", "Seed: €36M"],
      },
    },
    validation: {
      enhancedPromptMustInclude: ["Memory:", "DISCO", "good quality"],
      diffMustContain: [{ source: "memory:DISCO" }],
      suggestedToolsMustInclude: ["queryMemory"],
    },
  },
  {
    id: "enhance_temporal_extraction",
    name: "Enhancement: Temporal context extraction",
    originalPrompt: "What happened with Tesla last week?",
    validation: {
      enhancedPromptMustInclude: ["Timeframe:", "last week"],
      diffMustContain: [{ source: "temporal" }],
    },
  },
  {
    id: "enhance_persona_inference",
    name: "Enhancement: Persona keywords detected",
    originalPrompt: "What's DISCO's thesis fit and market wedge?",
    validation: {
      injectedContextMustHave: { personaHint: "EARLY_STAGE_VC" },
      diffMustContain: [{ source: "persona" }],
    },
  },
  {
    id: "enhance_multi_entity",
    name: "Enhancement: Multiple entities detected",
    originalPrompt: "Compare Tesla and Rivian for our portfolio",
    validation: {
      injectedContextMustHave: {
        entities: [
          { name: "Tesla" },
          { name: "Rivian" },
        ],
      },
      suggestedToolsMustInclude: ["queryMemory", "decomposeQuery"],
    },
  },
  {
    id: "enhance_file_context",
    name: "Enhancement: File attachment context",
    originalPrompt: "Analyze this pitch deck",
    setup: {
      attachedFileIds: ["mock_file_id_123"],
    },
    validation: {
      enhancedPromptMustInclude: ["Attached files:", "analyzeMediaFile"],
      suggestedToolsMustInclude: ["analyzeMediaFile"],
    },
  },
  {
    id: "enhance_tool_suggestion_research",
    name: "Enhancement: Research intent suggests tools",
    originalPrompt: "Do a deep dive on VaultPay's funding history",
    validation: {
      suggestedToolsMustInclude: ["queryMemory", "getBankerGradeEntityInsights", "enrichCompanyDossier"],
    },
  },
  {
    id: "enhance_tool_suggestion_news",
    name: "Enhancement: News intent suggests tools",
    originalPrompt: "What's the latest news about Salesforce?",
    validation: {
      suggestedToolsMustInclude: ["linkupSearch", "getLiveFeed"],
    },
  },
  {
    id: "enhance_user_edit_preserved",
    name: "Enhancement: User edits are preserved",
    originalPrompt: "Research DISCO",
    userEdit: "Research DISCO focusing on their clinical pipeline", // User modified
    validation: {
      finalPromptMustInclude: ["clinical pipeline"], // User edit preserved
      finalPromptMustInclude: ["Memory:"], // Enhancement still present
    },
  },
];
```

---

### 7.5 Integration with Fast Agent Panel

Update the main panel to include the enhancer:

```typescript
// Additions to FastAgentPanel.tsx

import { PromptEnhancer } from "./FastAgentPanel.PromptEnhancer";

// In the JSX, wrap the InputBar
<div className="input-container">
  <PromptEnhancer
    value={input}
    onChange={setInput}
    threadId={activeThreadId}
    dossierContext={dossierContext}
    attachedFileIds={attachedFiles.map(f => f.id)}
    onEnhanced={(enhanced) => {
      // Track enhancement for analytics
      trackEnhancement(enhanced);
    }}
  />
  <InputBar
    value={input}
    onChange={setInput}
    onSend={handleSend}
    // ... other props
  />
</div>
```

---

### 7.6 Success Metrics for Prompt Enhancement

| Metric | Current | Target |
|--------|---------|--------|
| Enhancement usage rate | N/A | >30% of queries |
| First-try success rate | ~60% | >80% |
| Tool call reduction | Baseline | -25% |
| Context injection accuracy | N/A | >90% |
| User edit-after-enhance rate | N/A | <20% (means enhancement is good) |

---

### 7.7 Timeline Update

| Week | Phase | Deliverables |
|------|-------|--------------|
| 7 | Prompt Enhancer Backend | `promptEnhancer.ts` action, entity extraction, persona inference |
| 8 | Prompt Enhancer UI | Preview component, diff view, keyboard shortcuts, eval scenarios |

---

## Part 7: References

### External Research

- [Claude Context (Zilliz)](https://github.com/zilliztech/claude-context) - 40% token reduction via semantic search
- [Codex CLI Features](https://developers.openai.com/codex/cli/features/) - Session resume + context compaction
- [Convex AI Agents](https://docs.convex.dev/agents) - Thread persistence + hybrid search
- [Chef by Convex](https://chef.convex.dev/) - Full-stack agent with backend context
- [Augment Code Prompt Enhancer](https://www.augmentcode.com/blog/prompt-enhancer-live-in-augment-chat) - Prompt rewriting with context injection
- [Augment Prompt Enhancer Docs](https://docs.augmentcode.com/cli/interactive/prompt-enhancer) - Technical implementation details

### Internal Implementation

- `convex/tools/knowledge/unifiedMemoryTools.ts` - `queryMemory`, `getOrBuildMemory`, `updateMemoryFromReview`
- `convex/tools/document/contextTools.ts` - `initScratchpad`, `compactContext`, `updateScratchpad`
- `convex/domains/agents/core/coordinatorAgent.ts` - Full agent instructions with invariants
- `convex/domains/agents/core/delegation/temporalContext.ts` - `buildPromptWithTemporalContext`
- `src/features/agents/context/FastAgentContext.tsx` - `buildDossierContextPrefix`, `AgentOpenOptions`
- `src/features/agents/components/FastAgentPanel/FastAgentPanel.InputBar.tsx` - Current `contextPrefix` handling
- `src/features/agents/components/FastAgentPanel/` - UI components for context visualization
