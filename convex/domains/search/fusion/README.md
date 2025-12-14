# Search Fusion Module

Multi-source search with parallel execution, RRF fusion, and LLM reranking.

## Overview

The Search Fusion module provides a unified interface for searching across multiple sources:
- **LinkUp** - External web search
- **SEC EDGAR** - SEC filings
- **RAG** - Internal vector + keyword search
- **Documents** - Direct document search

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SearchOrchestrator                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Rate Limiting (rateLimiter.ts)                              │
│  2. Cache Check (cache.ts)                                      │
│  3. Parallel Execution (Promise.allSettled)                     │
│  4. RRF Fusion (Reciprocal Rank Fusion)                         │
│  5. LLM Reranking (optional, for comprehensive mode)            │
│  6. Observability Persistence (observability.ts)                │
└─────────────────────────────────────────────────────────────────┘
    │         │         │         │         │         │         │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│LinkUp │ │  SEC  │ │  RAG  │ │ Docs  │ │YouTube│ │ arXiv │ │ News  │
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘
```

## Search Modes

| Mode | Sources | Fusion | Reranking | Cache TTL | Use Case |
|------|---------|--------|-----------|-----------|----------|
| `fast` | LinkUp only | None | No | 5 min | Quick answers |
| `balanced` | LinkUp, RAG, Documents, News | RRF | No | 15 min | General research |
| `comprehensive` | All 7 sources | RRF | Yes (LLM) | 15 min | Deep research |

## Usage

### From Convex Actions

```typescript
import { SearchOrchestrator } from "./fusion";

const orchestrator = new SearchOrchestrator(ctx);
const response = await orchestrator.search({
  query: "AAPL earnings report",
  mode: "balanced",
});
```

### From Agent Tools

The `fusionSearch` and `quickSearch` tools are available to agents:

```typescript
// In agent conversation
"Search for Apple's latest SEC filings" 
// → Agent calls fusionSearch with mode: "comprehensive"
```

### Direct API Call

```typescript
import { api } from "../_generated/api";

const response = await ctx.runAction(
  api.domains.search.fusion.actions.fusionSearch,
  {
    query: "biotech funding 2025",
    mode: "comprehensive",
    maxTotal: 20,
  }
);
```

## Files

| File | Description |
|------|-------------|
| `types.ts` | SearchResult, SearchRequest, SearchResponse interfaces |
| `orchestrator.ts` | Main SearchOrchestrator class |
| `reranker.ts` | LLM-based reranking |
| `actions.ts` | Convex actions (fusionSearch, quickSearch) |
| `adapters/` | Source-specific adapters |

## SearchResult Interface

```typescript
interface SearchResult {
  id: string;
  source: SearchSource;
  title: string;
  snippet: string;
  url?: string;
  documentId?: Id<"documents">;
  score: number;
  originalRank: number;
  fusedRank?: number;
  contentType: "text" | "pdf" | "video" | "image" | "filing" | "news";
  publishedAt?: string;
  author?: string;
  metadata?: Record<string, unknown>;
  highlights?: string[];
}
```

## RRF Fusion

Reciprocal Rank Fusion combines results from multiple sources:

```
RRF_score(d) = Σ 1 / (k + rank_i(d))
```

Where `k = 60` (constant) and `rank_i(d)` is the rank of document `d` in source `i`.

## Observability

The module logs:
- Per-source timing
- Total execution time
- Results before/after fusion
- Reranking status
- Any source errors

Example log output:
```
[SearchOrchestrator] Starting balanced search: "AAPL earnings"
[SearchOrchestrator] Sources: linkup, rag, documents
[LinkupAdapter] Search completed in 450ms, 10 results
[RagAdapter] Search completed in 120ms, 8 results
[DocumentAdapter] Search completed in 80ms, 5 results
[SearchOrchestrator] Collected 23 results from 3 sources
[SearchOrchestrator] Search completed in 520ms (reranked: false)
```

## Future Enhancements / Remaining Work

### High Priority (COMPLETED ✅)

1. **Add More Search Adapters** ✅
   - [x] YouTube adapter (`adapters/youtubeAdapter.ts`) - YouTube Data API v3
   - [x] arXiv adapter (`adapters/arxivAdapter.ts`) - Academic papers via Atom API
   - [x] News adapter (`adapters/newsAdapter.ts`) - NewsAPI with LinkUp fallback

2. **Observability Persistence** ✅
   - [x] Store `searchRun` records with per-tool latency/errors + fused IDs
   - [x] Created `searchRuns` and `searchRunResults` tables in schema
   - [x] Added queries: `getRecentSearchRuns`, `getSearchRunResults`, `getSourceAnalytics`
   - [x] Module: `observability.ts`

3. **Rate Limiting + Concurrency Control** ✅
   - [x] Per-user rate limiting (10/min, 100/hour)
   - [x] Per-provider rate limiting (configurable per source)
   - [x] Thread-level concurrency control (max 3 concurrent/thread)
   - [x] Module: `rateLimiter.ts`

4. **Caching Layer** ✅
   - [x] TTL-based caching (5 min fast, 15 min balanced/comprehensive)
   - [x] Cache key: `hash(query + sources + mode)`
   - [x] Cache hit tracking for analytics
   - [x] Module: `cache.ts`, Table: `searchFusionCache`

### Medium Priority (COMPLETED ✅)

5. **Persisted Normalization for Legacy Threads** ✅
   - [x] Migrate legacy model strings in existing threads to normalized aliases
   - [x] One-time migration script (`mcp_tools/models/migration.ts`)
   - [x] Ensure backward compatibility with LEGACY_ALIASES mapping
   - [x] Dry-run mode with safety confirmation for actual migration
   - Found 91 threads needing migration (gpt-5, gpt-5-chat-latest, gpt-5-mini, gpt-5.1)

6. **UI Behavior for Fused Results** ✅
   - [x] Show per-source facets (filter by source) - SourceBadge component with toggle
   - [x] Consistent citation display - ResultCard with citation numbers
   - [x] Partial failure warnings ("SEC tool unavailable") - PartialFailureWarning component
   - [x] Source attribution badges - 7 source types with icons and colors
   - Created `FusedSearchResults.tsx` component in FastAgentPanel
   - [x] **AUDIT**: Versioned payload contract (`FusionSearchPayload` with `kind` + `version`)
   - [x] **AUDIT**: Runtime validation (`validateFusionSearchPayload()`)
   - [x] **AUDIT**: Frontend parser hardening with version checking
   - [x] **AUDIT**: ARIA accessibility documentation and button type fixes
   - [x] **AUDIT**: Streaming behavior documentation (not streaming, returns complete)

7. **Python MCP Server (Pattern 5)** ✅
   - [x] Create `python-mcp-servers/research/` directory structure
   - [x] Implement SecureConvexClient wrapper with function allowlist
   - [x] Create `research/server.py` with FastAPI
   - [x] Iterative search with reflection loops (quick_search, fusion_search tools)
   - [x] Security model: explicit ALLOWED_QUERIES/MUTATIONS/ACTIONS sets
   - [x] Docker support with docker-compose.yml

### Lower Priority

8. **Benchmark Harness Alignment** ✅
   - [x] Standard output schema for search runs + judge rubric input (`JudgeInput`, `JudgeRubric`)
   - [x] Saved artifacts to feed the coding agent (`searchEvaluations` table)
   - [x] LLM-as-judge integration for search quality evaluation (`evaluateSearch` action)
   - [x] Pass/fail scoring based on relevance criteria (weighted scoring with 0.7 threshold)
   - [x] **AUDIT**: Judge model via modelResolver (7 approved models)
   - [x] **AUDIT**: Ground truth fields (`expectedKeyFacts`, `constraints`, `publishedAt`)
   - [x] **AUDIT**: Database indexes (`by_judge_model`) and retention policy documentation

9. **Advanced Features** ✅
   - [x] Result deduplication by content similarity (`deduplicateResults` with Jaccard similarity)
   - [x] Query expansion for better recall (`expandQuery` with synonym mapping)
   - [x] Source-specific relevance boosting (`applySourceBoosts` with query-type detection)
   - [x] User preference learning for result ranking (`updatePreferencesFromInteractions`, `applyRecencyBias`)
   - [x] **AUDIT**: Staged deduplication (URL canonicalization → exact match → Jaccard)
   - [x] **AUDIT**: Query expansion gated by query type (disabled for news/internal)
   - [x] **AUDIT**: Pipeline integration in orchestrator (correct order)
   - [x] **AUDIT**: Preference learning marked as FUTURE WORK (UI events not emitted)

## Production Hardening (December 2024)

### Pipeline Order (Cost-Optimized)

The search pipeline is ordered to minimize LLM costs:

```
expandQuery → retrieval → boost → RRF → dedup → rerank (top-K) → recency
                                          ↑           ↑
                                    BEFORE rerank   Limited to 20
```

**Key optimizations:**
- Deduplication runs BEFORE LLM reranking to reduce token usage
- Reranking is limited to top-K (20) results, not all fused results
- Query expansion is gated by query type (disabled for news/internal queries)

### Judge Model Policy

The benchmark judge model is **server-side only** and NOT user-configurable:

```typescript
// Server-side enforcement
function getServerJudgeModel(): string {
  return process.env.SEARCH_JUDGE_MODEL || "gpt-5.2";
}
```

**Rationale:** Prevents users from selecting cheaper/weaker models that would produce unreliable evaluations.

### Retention Policy

Search evaluations are retained for **90 days**:

```typescript
// Cleanup mutation (run via cron or manual trigger)
await ctx.runMutation(api.domains.search.fusion.benchmark.cleanupOldEvaluations, {
  retentionDays: 90
});
```

### Observability

#### Correlation IDs

Every search request generates a unique correlation ID for tracing:

```
correlationId = search_${timestamp}_${random6chars}
Example: search_1765698511058_a3b2c1
```

#### Pipeline Metrics

Structured logging at pipeline completion:

```typescript
{
  event: 'search_pipeline_complete',
  correlationId: 'search_1765698511058_a3b2c1',
  mode: 'comprehensive',
  query: 'machine learning research papers',
  queryType: 'research',
  expansionApplied: true,
  sourcesQueried: ['linkup', 'sec', 'rag', 'documents', 'youtube', 'arxiv', 'news'],
  perSourceMetrics: [
    { source: 'linkup', timeMs: 3225, resultCount: 10 },
    { source: 'youtube', timeMs: 359, resultCount: 10 },
    // ...
  ],
  totalBeforeFusion: 32,
  afterRRF: 32,
  afterDedup: 28,
  afterRerank: 20,
  finalResultCount: 5,
  totalTimeMs: 14690,
  errorsCount: 0,
  timestamp: '2024-12-14T04:48:42.000Z'
}
```

#### Query Expansion Events

```typescript
{
  event: 'query_expansion',
  queryType: 'financial',
  originalLength: 25,
  synonymsFound: 8,
  synonymsUsed: 8,
  expandedQueriesCount: 3,
  expansionApplied: true,
  cappedSynonyms: false,
  cappedQueries: false,
  processingTimeMs: 2,
  timestamp: '2024-12-14T04:48:27.000Z'
}
```

### Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `ENABLE_EMBEDDING_DEDUP` | `false` | Enable embedding-based deduplication (requires vector DB) |
| `SEARCH_JUDGE_MODEL` | `gpt-5.2` | Server-side judge model for evaluations |

### Caps and Limits

| Limit | Value | Description |
|-------|-------|-------------|
| `MAX_EXPANDED_QUERIES` | 5 | Maximum expanded query variants |
| `MAX_TOTAL_SYNONYMS` | 10 | Maximum synonyms per query |
| `RERANK_TOP_K` | 20 | Maximum results sent to LLM reranker |
| `RETENTION_DAYS` | 90 | Evaluation retention period |

## New Files Added

| File | Description |
|------|-------------|
| `adapters/youtubeAdapter.ts` | YouTube Data API v3 adapter |
| `adapters/arxivAdapter.ts` | arXiv Atom API adapter |
| `adapters/newsAdapter.ts` | NewsAPI with LinkUp fallback |
| `observability.ts` | Search run persistence and analytics |
| `rateLimiter.ts` | Rate limiting and concurrency control |
| `cache.ts` | TTL-based result caching |

