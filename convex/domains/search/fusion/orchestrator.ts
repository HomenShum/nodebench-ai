/**
 * Search Orchestrator
 *
 * Coordinates parallel search across multiple sources and fuses results.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PIPELINE ORDER (with advanced features)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. expandQuery() - BEFORE retrieval (expands query for better recall)
 * 2. [Parallel source retrieval] - Fetch from all sources
 * 3. applySourceBoosts() - AFTER retrieval (boost by source type)
 * 4. [RRF fusion] - Combine results from sources
 * 5. [LLM reranking] - Semantic reranking (if enabled)
 * 6. deduplicateResults() - AFTER reranking (remove duplicates)
 * 7. applyRecencyBias() - AFTER dedup (boost recent content)
 *
 * NOTE: User preference learning (applyUserPreferences) is NOT integrated
 * because the UI does not currently emit click/bookmark/share/dismiss/dwell
 * events. This is marked as FUTURE WORK.
 *
 * @module search/fusion/orchestrator
 */

import type { ActionCtx } from "../../../_generated/server";
import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
  SearchSource,
  SearchSourceAdapter,
  SearchMode,
} from "./types";
import {
  linkupAdapter,
  secAdapter,
  createRagAdapter,
  createDocumentAdapter,
  youtubeAdapter,
  arxivAdapter,
  newsAdapter,
} from "./adapters";
import { llmReranker } from "./reranker";
import {
  expandQuery,
  applySourceBoosts,
  deduplicateResults,
  applyRecencyBias,
} from "./advanced";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Default sources per mode */
const MODE_SOURCES: Record<SearchMode, SearchSource[]> = {
  fast: ["linkup"],
  balanced: ["linkup", "rag", "documents", "news"],
  comprehensive: ["linkup", "sec", "rag", "documents", "youtube", "arxiv", "news"],
};

/** Default limits per mode */
const MODE_LIMITS: Record<SearchMode, { perSource: number; total: number }> = {
  fast: { perSource: 10, total: 10 },
  balanced: { perSource: 8, total: 20 },
  comprehensive: { perSource: 10, total: 30 },
};

/** RRF constant (k) - higher values give more weight to lower-ranked results */
const RRF_K = 60;

// ═══════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class SearchOrchestrator {
  private ctx: ActionCtx;
  private adapters: Map<string, SearchSourceAdapter>;

  constructor(ctx: ActionCtx) {
    this.ctx = ctx;
    // Use string keys to avoid type narrowing issues
    this.adapters = new Map<string, SearchSourceAdapter>();
    this.adapters.set("linkup", linkupAdapter);
    this.adapters.set("sec", secAdapter);
    this.adapters.set("rag", createRagAdapter(ctx));
    this.adapters.set("documents", createDocumentAdapter(ctx));
    this.adapters.set("youtube", youtubeAdapter);
    this.adapters.set("arxiv", arxivAdapter);
    this.adapters.set("news", newsAdapter);
  }
  
  /**
   * Execute search across multiple sources with fusion and advanced features.
   *
   * Pipeline order:
   * 1. Query expansion (gated by query type)
   * 2. Parallel source retrieval
   * 3. Source boosting
   * 4. RRF fusion
   * 5. LLM reranking (if enabled)
   * 6. Deduplication
   * 7. Recency bias
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    const mode = request.mode || "balanced";
    const sources = request.sources || MODE_SOURCES[mode];
    const limits = MODE_LIMITS[mode];

    console.log(`[SearchOrchestrator] Starting ${mode} search: "${request.query}"`);
    console.log(`[SearchOrchestrator] Sources: ${sources.join(", ")}`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Query Expansion (gated by query type)
    // ═══════════════════════════════════════════════════════════════════════
    const expanded = expandQuery(request.query);
    const searchQuery = expanded.expansionApplied && expanded.expanded.length > 1
      ? expanded.expanded[0] // Use first expanded variant
      : request.query;

    if (expanded.expansionApplied) {
      console.log(`[SearchOrchestrator] Query expanded: "${request.query}" → "${searchQuery}" (type: ${expanded.queryType})`);
    }

    // Filter to available sources
    const availableSources = sources.filter(source => {
      const adapter = this.adapters.get(source);
      return adapter?.isAvailable();
    });

    if (availableSources.length === 0) {
      console.warn("[SearchOrchestrator] No sources available");
      return this.emptyResponse(mode, sources, Date.now() - startTime);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Parallel Source Retrieval
    // ═══════════════════════════════════════════════════════════════════════
    const timing: Record<SearchSource, number> = {} as Record<SearchSource, number>;
    const errors: SearchResponse["errors"] = [];

    const searchPromises = availableSources.map(async (source) => {
      const adapter = this.adapters.get(source)!;
      const sourceStart = Date.now();

      try {
        const results = await adapter.search(searchQuery, {
          maxResults: request.maxPerSource || limits.perSource,
          contentTypes: request.contentTypes,
          dateRange: request.dateRange,
          userId: request.userId,
        });
        timing[source] = Date.now() - sourceStart;
        return { source, results };
      } catch (error) {
        timing[source] = Date.now() - sourceStart;
        errors.push({ source, error: String(error) });
        return { source, results: [] };
      }
    });

    const searchResults = await Promise.allSettled(searchPromises);

    // Collect all results
    let allResults: SearchResult[] = [];
    for (const result of searchResults) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value.results);
      }
    }

    console.log(`[SearchOrchestrator] Collected ${allResults.length} results from ${availableSources.length} sources`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Source Boosting
    // ═══════════════════════════════════════════════════════════════════════
    allResults = applySourceBoosts(allResults, request.query);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: RRF Fusion
    // ═══════════════════════════════════════════════════════════════════════
    let fusedResults = this.applyRRF(allResults, request.maxTotal || limits.total);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: LLM Reranking (if enabled)
    // ═══════════════════════════════════════════════════════════════════════
    let reranked = false;
    if (request.enableReranking || mode === "comprehensive") {
      fusedResults = await llmReranker.rerank(
        request.query,
        fusedResults,
        request.maxTotal || limits.total
      );
      reranked = true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 6: Deduplication (staged approach)
    // ═══════════════════════════════════════════════════════════════════════
    const dedupResult = deduplicateResults(fusedResults);
    fusedResults = dedupResult.results;

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 7: Recency Bias
    // ═══════════════════════════════════════════════════════════════════════
    // Apply moderate recency bias (0.3) - can be made configurable
    fusedResults = applyRecencyBias(fusedResults, 0.3);

    // Re-sort after recency adjustment
    fusedResults.sort((a, b) => b.score - a.score);

    const totalTimeMs = Date.now() - startTime;
    console.log(`[SearchOrchestrator] Search completed in ${totalTimeMs}ms (reranked: ${reranked}, deduped: ${dedupResult.duplicatesRemoved})`);

    return {
      results: fusedResults,
      totalBeforeFusion: allResults.length,
      mode,
      sourcesQueried: availableSources,
      timing,
      totalTimeMs,
      reranked,
      ...(errors.length > 0 && { errors }),
    };
  }
  
  /**
   * Apply Reciprocal Rank Fusion to merge results from multiple sources.
   */
  private applyRRF(results: SearchResult[], maxTotal: number): SearchResult[] {
    // Group by unique identifier (URL or documentId)
    const scoreMap = new Map<string, { result: SearchResult; rrfScore: number }>();
    
    for (const result of results) {
      const key = result.url || result.documentId || result.id;
      const rrfContribution = 1 / (RRF_K + result.originalRank);
      
      const existing = scoreMap.get(key);
      if (existing) {
        // Merge: add RRF scores, keep result with higher original score
        existing.rrfScore += rrfContribution;
        if (result.score > existing.result.score) {
          existing.result = result;
        }
      } else {
        scoreMap.set(key, { result, rrfScore: rrfContribution });
      }
    }
    
    // Sort by RRF score and assign fused ranks
    const sorted = Array.from(scoreMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, maxTotal);
    
    return sorted.map((item, index) => ({
      ...item.result,
      fusedRank: index + 1,
      score: item.rrfScore, // Replace score with normalized RRF score
    }));
  }
  
  private emptyResponse(mode: SearchMode, sources: SearchSource[], totalTimeMs: number): SearchResponse {
    return {
      results: [],
      totalBeforeFusion: 0,
      mode,
      sourcesQueried: sources,
      timing: {} as Record<SearchSource, number>,
      totalTimeMs,
      reranked: false,
    };
  }
}

