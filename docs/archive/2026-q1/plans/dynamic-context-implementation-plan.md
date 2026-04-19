# Dynamic MCP Tool Discovery + Dynamic Context Stack

## Overview

Implement the "save tool output → search → distill → reason" pattern with MCP-aligned resource_link semantics. This extends NodeBench's existing progressive disclosure infrastructure to support dynamic tool schema hydration and large output handling.

> **Related Research:** [../research/agent-evaluation-datasets-2026.md](../research/agent-evaluation-datasets-2026.md)

## Current State

| Component | Status | Gap |
|-----------|--------|-----|
| Built-in tool progressive disclosure | ✅ Exists | None |
| MCP tool thin descriptors | ❌ Missing | Schema embedded inline |
| Artifact storage (content-addressed) | ✅ Exists | Missing resource_link wrapper |
| Artifact chunks + evidence search | ✅ Exists | Missing retrieval tool |
| Prompt enhancer | ✅ Exists | Missing structured retrieval intent |
| Distiller tool | ❌ Missing | Need small-model extraction |
| Eval budget gates | ⚠️ Partial | Missing resource_link + citation metrics |

---

## Phase 1: MCP Tool Schema Separation

**Goal:** Extend progressive disclosure to MCP tools (thin descriptors + on-demand hydration)

### Schema Changes (`convex/schema.ts`)

Add `mcpToolSchemas` table:
```typescript
mcpToolSchemas = defineTable({
  toolId: v.id("mcpTools"),
  schemaHash: v.string(),           // SHA-256 for dedup/versioning
  fullSchema: v.any(),
  parametersCount: v.number(),
  requiredParams: v.array(v.string()),
  cachedAt: v.number(),
}).index("by_tool", ["toolId"]).index("by_hash", ["schemaHash"]);
```

Modify `mcpTools` table - add thin descriptor fields:
- `shortDescription` (≤100 chars)
- `category`, `keywords[]`
- `schemaHash` (FK to cached schema)
- `accessTier` (public/user/restricted)

### Files to Create/Modify

| File | Action |
|------|--------|
| `convex/schema.ts` | Add mcpToolSchemas, modify mcpTools |
| `convex/tools/mcp/mcpToolRegistry.ts` | NEW - thin descriptors + hydration |
| `convex/tools/mcp/mcpSchemaCache.ts` | NEW - cache with TTL + invalidation |
| `convex/tools/meta/toolDiscoveryV2.ts` | Extend searchAvailableTools for MCP |
| `convex/migrations/mcpToolSchemaSeparation.ts` | NEW - data migration |

### Acceptance Criteria
- [ ] MCP tool search returns ~50 token descriptors
- [ ] `describeTools` hydrates full schema <100ms
- [ ] SchemaHash prevents redundant storage
- [ ] 80%+ token reduction vs current

---

## Phase 2: Resource Link Pattern

**Goal:** Wrap large tool outputs as artifact pointers per MCP spec

### Schema Changes (`convex/schema.ts`)

Add `resourceLinks` table:
```typescript
resourceLinks = defineTable({
  runId: v.optional(v.id("agentRuns")),
  toolName: v.string(),
  toolCallId: v.string(),
  artifactId: v.id("sourceArtifacts"),
  mimeType: v.string(),
  sizeBytes: v.number(),
  preview: v.string(),              // First ~500 chars
  originalTokenEstimate: v.number(),
  actualTokens: v.number(),
  tokenSavings: v.number(),
  createdAt: v.number(),
}).index("by_run", ["runId"]).index("by_artifact", ["artifactId"]);
```

### New Tool: `retrieveArtifact`

```typescript
retrieveArtifact({
  artifactId: string,
  query: string,
  budget?: number,      // Max tokens (default: 2000)
}) -> {
  excerpts: Array<{ chunkId, text, relevanceScore, citation }>,
  tokensUsed: number,
}
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `convex/schema.ts` | Add resourceLinks table |
| `convex/tools/context/resourceLinks.ts` | NEW - wrapping logic |
| `convex/tools/context/retrieveArtifact.ts` | NEW - retrieval tool |
| `convex/domains/agents/fastAgentPanelStreaming.ts` | Wrap large outputs |

### Wrapping Threshold
- Inline if <100KB
- Wrap as resource_link if ≥100KB

### Acceptance Criteria
- [ ] Outputs ≥100KB wrapped as resource_link
- [ ] `retrieveArtifact` available to agents
- [ ] 90%+ token savings on large outputs
- [ ] Citations link to artifact chunks

---

## Phase 3: Distiller Tool

**Goal:** Small-model extraction of facts/claims with citations

### Interface

```typescript
distillArtifacts({
  artifactIds: string[],
  query: string,
  persona?: string,
  maxFacts?: number,    // Default: 10
}) -> {
  facts: Array<{
    id: string,
    text: string,
    confidence: number,
    citations: Array<{ artifactId, chunkId, quote, anchor }>,
    category?: string,
  }>,
  tokensUsed: number,
}
```

### Model Selection (Free First Strategy)
- Primary: `devstral-2-free` (free tier, 262K context)
- First paid fallback: `gemini-3-flash` ($0.10/1M input, $0.40/1M output)
- Second fallback: `gpt-5-nano` or `claude-haiku-4.5`

Model selection follows the `modelCatalog.ts` free-first pattern with progressive fallback.

### Files to Create

| File | Action |
|------|--------|
| `convex/tools/knowledge/distiller.ts` | NEW - distillation tool |
| `convex/tools/knowledge/distillerPrompts.ts` | NEW - extraction prompts |

### Integration
- Uses existing `artifactChunks` for evidence search
- Outputs citation anchors: `{{fact:distilled:factId:chunkId}}`

### Acceptance Criteria
- [ ] Structured facts with citations
- [ ] Latency <2s for typical artifact set
- [ ] Citations resolve to valid chunks
- [ ] Output budget enforced (<1500 tokens)

---

## Phase 4: Prompt Enhancer Enhancement

**Goal:** Produce structured retrieval intent for orchestrator planning

### New Type: `RetrievalIntent`

```typescript
interface RetrievalIntent {
  queries: Array<{ text, type, priority }>,
  filters: { entityIds?, freshnessHours?, categories? },
  evidenceRequirements: { minSources, requireCitations, preferredProviders? },
  budgetHints: { maxArtifactsToFetch, maxTokensPerArtifact, totalTokenBudget },
}
```

### Files to Modify

| File | Action |
|------|--------|
| `convex/domains/agents/promptEnhancer.ts` | Add RetrievalIntent generation |

### Acceptance Criteria
- [ ] `generateRetrievalIntent: true` produces structured intent
- [ ] Queries decomposed with priorities
- [ ] Filters reflect entity/temporal context
- [ ] Budget hints scale with query complexity

---

## Phase 5: Eval Gate Additions

**Goal:** Budget compliance and resource_link metrics in eval harness

### New Metrics in `DisclosureMetrics`

```typescript
// Resource link metrics
resourceLinksCreated: number,
resourceLinksRetrieved: number,
artifactBytesAvoided: number,

// Citation resolution
citationsInResponse: number,
citationsResolved: number,
citationsUnresolved: number,

// Budget compliance
tokenBudgetExceeded: boolean,
costBudgetExceeded: boolean,
```

### New Scenario Requirements

```typescript
requirements: {
  maxTokenBudget?: number,
  requireResourceLinkUsage?: boolean,
  minCitationResolutionRate?: number,  // e.g., 0.95
}
```

### New Test Scenarios

1. **pack_resource_link_budget** - Tight token budget with resource_link requirement
2. **pack_citation_resolution** - 95% citation resolution verification

### Files to Modify

| File | Action |
|------|--------|
| `convex/domains/evaluation/personaEpisodeEval.ts` | Add metrics + gates |
| `convex/domains/evaluation/groundTruth.ts` | Add new scenarios |

### Acceptance Criteria
- [ ] Token/cost/tool budgets tracked
- [ ] Resource_link metrics in disclosure summary
- [ ] Citation resolution rate computed
- [ ] Budget violations in failure reasons

---

## Implementation Order

1. **Phase 1** (MCP Schema Separation) - Foundation for token savings
2. **Phase 2** (Resource Links) - Large output handling
3. **Phase 3** (Distiller) - Extraction pipeline
4. **Phase 4** (Prompt Enhancer) - Structured retrieval
5. **Phase 5** (Eval Gates) - Verification

Phases 1-2 can be done in parallel. Phase 3 depends on Phase 2. Phase 4-5 can run independently.

---

## Verification Plan

### Unit Tests
- Schema hydration latency <100ms
- Resource_link wrapping at threshold
- Distiller output schema validation
- Citation anchor format validation

### Integration Tests
- End-to-end: vague query → resource_link → retrieval → distilled answer
- Token savings measurement vs baseline
- Citation resolution verification

### Eval Pack
Run full persona pack with new scenarios (free-first model selection):
```bash
# Free tier evaluation (default - devstral first)
npx convex run domains/evaluation/personaEpisodeEval:runPersonaEpisodeEval \
  --args '{"suite": "pack", "model": "devstral-2-free"}'

# Paid fallback evaluation
npx convex run domains/evaluation/personaEpisodeEval:runPersonaEpisodeEval \
  --args '{"suite": "pack", "model": "gemini-3-flash"}'
```

Expected results:
- 80%+ token reduction on large-output scenarios
- 95%+ citation resolution rate
- All budget gates pass
- Free tier models (devstral) should pass baseline scenarios

---

## Open Source Evaluation Datasets & Frameworks (2026 Research)

> **Full Research Document:** [../research/agent-evaluation-datasets-2026.md](../research/agent-evaluation-datasets-2026.md)

### Key Datasets Summary

| Dataset | Purpose | Size |
|---------|---------|------|
| FACTS Grounding | Factuality with document grounding | 1,719 examples |
| AgentBench | LLM-as-Agent multi-environment | Multiple domains |
| GAIA Benchmark | Real-world multi-step tasks | Multi-level |
| SWE-bench Verified | Software engineering tasks | 500 cases |
| OpenCUA/AgentNet | Computer-using tasks | 22,625 tasks |

### Key Frameworks

- **OpenAI Evals** - YAML-defined, open-source registry
- **LangSmith** - `intermediate_steps` trajectory comparison
- **Ragas** - Reference-free groundedness metrics
- **Cursor Dynamic Context** - 46.9% token reduction via on-demand loading

### Recommended Integration Path

1. **FACTS Grounding** - Adapt for groundedness scoring
2. **LangSmith pattern** - `expected_steps` for trajectory eval
3. **Ragas metrics** - Production RAG quality monitoring

---

## Critical Files Summary

| File | Phase | Purpose |
|------|-------|---------|
| `convex/schema.ts` | 1, 2 | mcpToolSchemas + resourceLinks tables |
| `convex/tools/mcp/mcpToolRegistry.ts` | 1 | Thin descriptors + hydration |
| `convex/tools/context/resourceLinks.ts` | 2 | resource_link wrapping |
| `convex/tools/context/retrieveArtifact.ts` | 2 | Artifact retrieval tool |
| `convex/tools/knowledge/distiller.ts` | 3 | Fact extraction tool |
| `convex/domains/agents/promptEnhancer.ts` | 4 | RetrievalIntent generation |
| `convex/domains/evaluation/personaEpisodeEval.ts` | 5 | Budget + citation gates |

---

*Plan created: January 19, 2026*