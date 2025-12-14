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
│  1. Parallel Execution (Promise.allSettled)                     │
│  2. RRF Fusion (Reciprocal Rank Fusion)                         │
│  3. LLM Reranking (optional, for comprehensive mode)            │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │ LinkUp  │          │   SEC   │          │   RAG   │
    │ Adapter │          │ Adapter │          │ Adapter │
    └─────────┘          └─────────┘          └─────────┘
```

## Search Modes

| Mode | Sources | Fusion | Reranking | Use Case |
|------|---------|--------|-----------|----------|
| `fast` | LinkUp only | None | No | Quick answers |
| `balanced` | LinkUp, RAG, Documents | RRF | No | General research |
| `comprehensive` | All sources | RRF | Yes (LLM) | Deep research |

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

## Future Enhancements

- [ ] Add YouTube adapter
- [ ] Add arXiv adapter
- [ ] Add news adapter
- [ ] Implement Python MCP server for iterative search
- [ ] Add caching layer
- [ ] Add result deduplication by content similarity

