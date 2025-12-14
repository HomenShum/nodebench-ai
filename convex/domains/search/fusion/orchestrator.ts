/**
 * Search Orchestrator
 * 
 * Coordinates parallel search across multiple sources and fuses results.
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
import { linkupAdapter, secAdapter, createRagAdapter, createDocumentAdapter } from "./adapters";
import { llmReranker } from "./reranker";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Default sources per mode */
const MODE_SOURCES: Record<SearchMode, SearchSource[]> = {
  fast: ["linkup"],
  balanced: ["linkup", "rag", "documents"],
  comprehensive: ["linkup", "sec", "rag", "documents"],
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
  }
  
  /**
   * Execute search across multiple sources with fusion.
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    const mode = request.mode || "balanced";
    const sources = request.sources || MODE_SOURCES[mode];
    const limits = MODE_LIMITS[mode];
    
    console.log(`[SearchOrchestrator] Starting ${mode} search: "${request.query}"`);
    console.log(`[SearchOrchestrator] Sources: ${sources.join(", ")}`);
    
    // Filter to available sources
    const availableSources = sources.filter(source => {
      const adapter = this.adapters.get(source);
      return adapter?.isAvailable();
    });
    
    if (availableSources.length === 0) {
      console.warn("[SearchOrchestrator] No sources available");
      return this.emptyResponse(mode, sources, Date.now() - startTime);
    }
    
    // Execute searches in parallel
    const timing: Record<SearchSource, number> = {} as Record<SearchSource, number>;
    const errors: SearchResponse["errors"] = [];
    
    const searchPromises = availableSources.map(async (source) => {
      const adapter = this.adapters.get(source)!;
      const sourceStart = Date.now();
      
      try {
        const results = await adapter.search(request.query, {
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
    const allResults: SearchResult[] = [];
    for (const result of searchResults) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value.results);
      }
    }
    
    console.log(`[SearchOrchestrator] Collected ${allResults.length} results from ${availableSources.length} sources`);
    
    // Apply RRF fusion
    let fusedResults = this.applyRRF(allResults, request.maxTotal || limits.total);

    // Apply LLM reranking if enabled (comprehensive mode or explicit request)
    let reranked = false;
    if (request.enableReranking || mode === "comprehensive") {
      fusedResults = await llmReranker.rerank(
        request.query,
        fusedResults,
        request.maxTotal || limits.total
      );
      reranked = true;
    }

    const totalTimeMs = Date.now() - startTime;
    console.log(`[SearchOrchestrator] Search completed in ${totalTimeMs}ms (reranked: ${reranked})`);

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

