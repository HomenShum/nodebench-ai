/**
 * Search Orchestrator
 *
 * Coordinates parallel search across multiple sources and fuses results.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PIPELINE ORDER (COST-OPTIMIZED)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. expandQuery() - BEFORE retrieval (expands query for better recall)
 * 2. [Parallel source retrieval] - Fetch from all sources
 * 3. applySourceBoosts() - AFTER retrieval (boost by source type)
 * 4. [RRF fusion] - Combine results from sources
 * 5. deduplicateResults() - BEFORE reranking (saves LLM tokens!)
 * 6. [LLM reranking] - Semantic reranking (if enabled) - limited to top-K
 * 7. applyRecencyBias() - AFTER reranking (boost recent content)
 *
 * COST OPTIMIZATION RATIONALE:
 * - Dedup BEFORE reranking saves LLM tokens by not processing duplicates
 * - LLM reranking limited to top-K (default 20) to control costs
 * - Recency bias applied last to fine-tune final ordering
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
  // FREE-FIRST adapters (prioritized)
  braveAdapter,
  serperAdapter,
  tavilyAdapter,
  // Paid fallback
  linkupAdapter,
  // Specialized adapters
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

/**
 * FREE-FIRST STRATEGY: Prioritize free-tier sources before paid.
 * This maximizes the ~7,500 free searches/month across providers.
 */
const FREE_FIRST_WEB_SOURCES: SearchSource[] = [
  "brave",    // 2,000/month FREE
  "serper",   // 2,500/month FREE
  "tavily",   // 1,000/month FREE
  "linkup",   // Pay per use (fallback)
];

/** Default sources per mode (FREE-FIRST strategy) */
const MODE_SOURCES: Record<SearchMode, SearchSource[]> = {
  // Fast: Use first available FREE source
  fast: ["brave", "serper", "tavily", "linkup"],
  // Balanced: Free web sources + internal sources
  balanced: ["brave", "serper", "tavily", "rag", "documents", "news"],
  // Comprehensive: All sources including paid fallback
  comprehensive: ["brave", "serper", "tavily", "linkup", "sec", "rag", "documents", "youtube", "arxiv", "news"],
};

/** Default limits per mode */
const MODE_LIMITS: Record<SearchMode, { perSource: number; total: number }> = {
  fast: { perSource: 10, total: 10 },
  balanced: { perSource: 8, total: 20 },
  comprehensive: { perSource: 10, total: 30 },
};

/** RRF constant (k) - higher values give more weight to lower-ranked results */
const RRF_K = 60;

/**
 * Hybrid fusion weight (alpha).
 * finalScore = alpha * rrfScore + (1 - alpha) * normalizedScore
 * - Higher alpha = more weight on position-based RRF
 * - Lower alpha = more weight on provider confidence scores
 * Default 0.6 balances position importance with semantic relevance.
 */
const HYBRID_ALPHA = 0.6;

// ═══════════════════════════════════════════════════════════════════════════
// SCORE NORMALIZATION (Pre-Fusion)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalize scores within each source to percentile ranks.
 * This addresses the baseline finding that providers normalize scores
 * differently (all clustering in 0.014-0.019 range).
 *
 * Algorithm:
 * 1. Group results by source
 * 2. For each source, convert scores to percentile within that source
 * 3. Result: scores normalized to 0-1 range consistently across providers
 *
 * This preserves semantic relevance signals that RRF alone would discard.
 */
function normalizeScoresPerSource(results: SearchResult[]): SearchResult[] {
  // Group by source
  const bySource = new Map<string, SearchResult[]>();
  for (const result of results) {
    const sourceResults = bySource.get(result.source) || [];
    sourceResults.push(result);
    bySource.set(result.source, sourceResults);
  }

  // Normalize within each source
  const normalized: SearchResult[] = [];
  for (const [source, sourceResults] of bySource) {
    if (sourceResults.length === 0) continue;

    // Get min/max scores for this source
    const scores = sourceResults.map(r => r.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const range = maxScore - minScore;

    // Normalize each result
    for (const result of sourceResults) {
      let normalizedScore: number;
      if (range === 0) {
        // All same score - use middle value
        normalizedScore = 0.5;
      } else {
        // Min-max normalization to 0-1 range
        normalizedScore = (result.score - minScore) / range;
      }

      normalized.push({
        ...result,
        // Store original score in metadata for debugging
        metadata: {
          ...result.metadata,
          originalScore: result.score,
          normalizedScore,
        },
        // Replace score with normalized value
        score: normalizedScore,
      });
    }

    console.log(`[normalizeScores] ${source}: ${sourceResults.length} results, score range ${minScore.toFixed(4)}-${maxScore.toFixed(4)} → 0-1`);
  }

  return normalized;
}

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

    // FREE-FIRST: Register free-tier adapters first (priority order)
    this.adapters.set("brave", braveAdapter);     // 2,000/month FREE
    this.adapters.set("serper", serperAdapter);   // 2,500/month FREE
    this.adapters.set("tavily", tavilyAdapter);   // 1,000/month FREE

    // Paid fallback
    this.adapters.set("linkup", linkupAdapter);   // Pay per use

    // Specialized adapters
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
   * Pipeline order (COST-OPTIMIZED):
   * 1. Query expansion (gated by query type)
   * 2. Parallel source retrieval
   * 3. Source boosting
   * 4. RRF fusion
   * 5. Deduplication (BEFORE reranking to save tokens)
   * 6. LLM reranking (if enabled, limited to top-K)
   * 7. Recency bias
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    const mode = request.mode || "balanced";
    const sources = request.sources || MODE_SOURCES[mode];
    const limits = MODE_LIMITS[mode];

    // Generate correlation ID for observability
    const correlationId = `search_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[SearchOrchestrator] Starting ${mode} search: "${request.query}"`);
    console.log(`[SearchOrchestrator] correlationId=${correlationId}, sources=${sources.join(",")}`);

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
      const isAvailable = adapter?.isAvailable();
      console.log(`[SearchOrchestrator] Source ${source}: adapter=${!!adapter}, isAvailable=${isAvailable}`);
      return isAvailable;
    });

    console.log(`[SearchOrchestrator] Available sources: ${availableSources.join(",")}`);

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

    // Collect all results and track per-source counts
    let allResults: SearchResult[] = [];
    const perSourceCounts: Record<string, number> = {};
    for (const result of searchResults) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value.results);
        perSourceCounts[result.value.source] = result.value.results.length;
      }
    }

    console.log(`[SearchOrchestrator] Collected ${allResults.length} results from ${availableSources.length} sources`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Source Boosting
    // ═══════════════════════════════════════════════════════════════════════
    allResults = applySourceBoosts(allResults, request.query);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3.5: Score Normalization (Pre-Fusion) - NEW
    // ═══════════════════════════════════════════════════════════════════════
    // Normalize scores per-source to 0-1 range for fair hybrid fusion.
    // This addresses the baseline finding that providers use different
    // score scales (all clustering 0.014-0.019 with minimal variance).
    allResults = normalizeScoresPerSource(allResults);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Hybrid RRF + Score Fusion - ENHANCED
    // ═══════════════════════════════════════════════════════════════════════
    // Uses hybrid formula: finalScore = α*RRF + (1-α)*normalizedScore
    // This preserves semantic relevance signals that pure RRF would discard.
    let fusedResults = this.applyHybridRRF(allResults, request.maxTotal || limits.total);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: Deduplication BEFORE reranking (COST OPTIMIZATION)
    // ═══════════════════════════════════════════════════════════════════════
    // Dedup BEFORE LLM reranking saves tokens by not processing duplicates
    const dedupResult = deduplicateResults(fusedResults);
    fusedResults = dedupResult.results;
    console.log(`[SearchOrchestrator] Dedup removed ${dedupResult.duplicatesRemoved} duplicates before reranking`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 6: LLM Reranking (if enabled) - LIMITED TO TOP-K
    // ═══════════════════════════════════════════════════════════════════════
    // Limit reranking to top-K results to control LLM costs
    const RERANK_TOP_K = 20;
    let reranked = false;
    if (request.enableReranking || mode === "comprehensive") {
      // Only rerank top-K to save tokens
      const toRerank = fusedResults.slice(0, RERANK_TOP_K);
      const notReranked = fusedResults.slice(RERANK_TOP_K);

      const rerankedTop = await llmReranker.rerank(
        request.query,
        toRerank,
        Math.min(request.maxTotal || limits.total, RERANK_TOP_K)
      );

      // Combine reranked top with remaining results
      fusedResults = [...rerankedTop, ...notReranked];
      reranked = true;
      console.log(`[SearchOrchestrator] LLM reranked top ${toRerank.length} results (${notReranked.length} skipped)`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 7: Recency Bias
    // ═══════════════════════════════════════════════════════════════════════
    // Apply moderate recency bias (0.3) - can be made configurable
    fusedResults = applyRecencyBias(fusedResults, 0.3);

    // Re-sort after recency adjustment
    fusedResults.sort((a, b) => b.score - a.score);

    const totalTimeMs = Date.now() - startTime;

    // ═══════════════════════════════════════════════════════════════════════
    // OBSERVABILITY: Structured Pipeline Metrics
    // ═══════════════════════════════════════════════════════════════════════
    const pipelineMetrics = {
      event: 'search_pipeline_complete',
      correlationId,
      mode,
      query: request.query.slice(0, 100), // Truncate for safety
      queryType: expanded.queryType,
      expansionApplied: expanded.expansionApplied,
      sourcesQueried: availableSources,
      perSourceMetrics: Object.entries(timing).map(([source, timeMs]) => ({
        source,
        timeMs,
        resultCount: perSourceCounts[source] ?? 0,
      })),
      totalBeforeFusion: allResults.length,
      totalAfterDedup: dedupResult.results.length,
      duplicatesRemoved: dedupResult.duplicatesRemoved,
      dedupByStage: dedupResult.metrics.byStage,
      reranked,
      rerankTopK: reranked ? RERANK_TOP_K : 0,
      finalResultCount: fusedResults.length,
      totalTimeMs,
      errorsCount: errors.length,
      timestamp: new Date().toISOString(),
    };
    console.info(`[SearchOrchestrator] Pipeline complete`, pipelineMetrics);

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
   * Apply Hybrid RRF + Score Fusion to merge results from multiple sources.
   *
   * ENHANCEMENT (Jan 2026): Baseline evaluation revealed that pure RRF
   * discards semantic relevance signals because provider scores all cluster
   * in a narrow range (0.014-0.019). Hybrid fusion preserves these signals.
   *
   * Formula: finalScore = α * rrfScore + (1 - α) * avgNormalizedScore
   * Where α = HYBRID_ALPHA (default 0.6)
   *
   * Benefits:
   * - High-confidence results from any provider get boosted
   * - Position-based ranking from RRF still dominates
   * - Semantic relevance signals are preserved, not discarded
   */
  private applyHybridRRF(results: SearchResult[], maxTotal: number): SearchResult[] {
    // Group by unique identifier (URL or documentId)
    const scoreMap = new Map<string, {
      result: SearchResult;
      rrfScore: number;
      normalizedScores: number[];
      sourceCount: number;
    }>();

    for (const result of results) {
      const key = result.url || result.documentId || result.id;
      const rrfContribution = 1 / (RRF_K + result.originalRank);

      const existing = scoreMap.get(key);
      if (existing) {
        // Merge: add RRF scores, accumulate normalized scores
        existing.rrfScore += rrfContribution;
        existing.normalizedScores.push(result.score);
        existing.sourceCount++;
        // Keep result with higher original score (from metadata)
        const existingOriginal = (existing.result.metadata?.originalScore as number) ?? 0;
        const newOriginal = (result.metadata?.originalScore as number) ?? 0;
        if (newOriginal > existingOriginal) {
          existing.result = result;
        }
      } else {
        scoreMap.set(key, {
          result,
          rrfScore: rrfContribution,
          normalizedScores: [result.score],
          sourceCount: 1,
        });
      }
    }

    // Calculate hybrid scores
    const hybridResults: Array<{ result: SearchResult; hybridScore: number; rrfScore: number; avgNormScore: number }> = [];

    for (const [_key, data] of scoreMap) {
      // Average normalized score across sources
      const avgNormScore = data.normalizedScores.reduce((a, b) => a + b, 0) / data.normalizedScores.length;

      // Normalize RRF score to 0-1 range for fair combination
      // Max possible RRF score is approx sourceCount / RRF_K (when all rank 1)
      const maxRRF = data.sourceCount / RRF_K;
      const normalizedRRF = maxRRF > 0 ? Math.min(data.rrfScore / maxRRF, 1) : data.rrfScore;

      // Hybrid formula
      const hybridScore = HYBRID_ALPHA * normalizedRRF + (1 - HYBRID_ALPHA) * avgNormScore;

      hybridResults.push({
        result: data.result,
        hybridScore,
        rrfScore: normalizedRRF,
        avgNormScore,
      });
    }

    // Sort by hybrid score and assign fused ranks
    hybridResults.sort((a, b) => b.hybridScore - a.hybridScore);
    const topResults = hybridResults.slice(0, maxTotal);

    console.log(`[applyHybridRRF] Fused ${scoreMap.size} unique results → top ${topResults.length}`);
    if (topResults.length > 0) {
      const top3 = topResults.slice(0, 3).map(r =>
        `${r.result.title.slice(0, 30)}... (hybrid=${r.hybridScore.toFixed(3)}, rrf=${r.rrfScore.toFixed(3)}, norm=${r.avgNormScore.toFixed(3)})`
      );
      console.log(`[applyHybridRRF] Top 3: ${top3.join(' | ')}`);
    }

    return topResults.map((item, index) => ({
      ...item.result,
      fusedRank: index + 1,
      score: item.hybridScore,
      metadata: {
        ...item.result.metadata,
        hybridRRFScore: item.rrfScore,
        hybridNormScore: item.avgNormScore,
        hybridAlpha: HYBRID_ALPHA,
      },
    }));
  }

  /**
   * Legacy pure RRF (kept for reference/comparison)
   * @deprecated Use applyHybridRRF instead
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

