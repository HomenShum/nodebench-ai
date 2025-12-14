/**
 * Search Fusion Module
 * 
 * Multi-source search with parallel execution, RRF fusion, and LLM reranking.
 * 
 * @module search/fusion
 * 
 * @example
 * ```typescript
 * import { SearchOrchestrator } from "./fusion";
 * 
 * const orchestrator = new SearchOrchestrator(ctx);
 * const response = await orchestrator.search({
 *   query: "AAPL earnings report",
 *   mode: "balanced",
 * });
 * ```
 */

// Types
export type {
  SearchSource,
  SearchMode,
  SearchResult,
  SearchRequest,
  SearchResponse,
  SearchSourceAdapter,
  SearchAdapterOptions,
} from "./types";

// Orchestrator
export { SearchOrchestrator } from "./orchestrator";

// Reranker
export { LLMReranker, llmReranker } from "./reranker";

// Adapters
export {
  LinkupAdapter,
  linkupAdapter,
  SecAdapter,
  secAdapter,
  RagAdapter,
  createRagAdapter,
  DocumentAdapter,
  createDocumentAdapter,
  YouTubeAdapter,
  youtubeAdapter,
  ArxivAdapter,
  arxivAdapter,
  NewsAdapter,
  newsAdapter,
} from "./adapters";

// Rate Limiting
export { RATE_LIMITS } from "./rateLimiter";

// Caching
export { generateCacheKey, CACHE_TTL_MS } from "./cache";

// Benchmark Harness
export type {
  JudgeInput,
  JudgeResultItem,
  JudgeRubric,
  JudgeResult,
} from "./benchmark";
export { toJudgeInput } from "./benchmark";

// Advanced Features
export type {
  UserSearchPreferences,
  ExpandedQuery,
  UserInteraction,
} from "./advanced";
export {
  deduplicateResults,
  expandQuery,
  applySourceBoosts,
  applyRecencyBias,
  updatePreferencesFromInteractions,
  DEFAULT_USER_PREFERENCES,
} from "./advanced";
