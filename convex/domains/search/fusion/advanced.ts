/**
 * Advanced Search Features
 *
 * Provides:
 * - Result deduplication by content similarity (staged approach)
 * - Query expansion for better recall (gated by query type)
 * - Source-specific relevance boosting
 * - User preference learning for result ranking
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PIPELINE INTEGRATION ORDER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * These functions should be called in the following order in the orchestrator:
 *
 * 1. expandQuery() - BEFORE retrieval (expands query for better recall)
 * 2. [Parallel source retrieval] - Fetch from all sources
 * 3. applySourceBoosts() - AFTER retrieval (boost by source type)
 * 4. [RRF fusion] - Combine results from sources
 * 5. [LLM reranking] - Semantic reranking
 * 6. deduplicateResults() - AFTER reranking (remove duplicates)
 * 7. applyRecencyBias() - AFTER dedup (boost recent content)
 * 8. applyUserPreferences() - LAST (personalize for user)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PREFERENCE LEARNING EVENT TRACKING
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The preference learning system expects these events to be emitted:
 * - click: User clicked on a result
 * - bookmark: User bookmarked a result
 * - share: User shared a result
 * - dismiss: User dismissed/hid a result
 * - dwell: User spent time viewing a result (with dwellTimeMs)
 *
 * NOTE: These events are NOT currently emitted by the UI. To enable preference
 * learning, the FusedSearchResults component needs to emit these events via
 * a Convex mutation when users interact with results.
 *
 * @module search/fusion/advanced
 */

import type { SearchResult, SearchSource } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deduplication metrics for observability
 */
export interface DeduplicationMetrics {
  totalInput: number;
  totalOutput: number;
  duplicatesRemoved: number;
  /** Breakdown by dedup stage */
  byStage: {
    urlCanonical: number;
    exactMatch: number;
    jaccard: number;
    embedding: number;
  };
  processingTimeMs: number;
}

/**
 * User search preferences for personalized ranking
 */
export interface UserSearchPreferences {
  /** Preferred sources (higher weight) */
  preferredSources: SearchSource[];
  /** Blocked sources (excluded from results) */
  blockedSources: SearchSource[];
  /** Content type preferences */
  contentTypeWeights: Record<string, number>;
  /** Topic interests for boosting */
  topicInterests: string[];
  /** Recency preference (0 = no preference, 1 = strongly prefer recent) */
  recencyBias: number;
}

/**
 * Query expansion result
 */
export interface ExpandedQuery {
  original: string;
  expanded: string[];
  synonyms: string[];
  relatedTerms: string[];
  /** Detected query type (for gating) */
  queryType?: string;
  /** Whether expansion was actually applied */
  expansionApplied?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEDUPLICATION (STAGED APPROACH)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Canonicalize URL for deduplication.
 * Removes protocol, www, trailing slashes, and common tracking params.
 */
function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove tracking params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source'];
    trackingParams.forEach(p => parsed.searchParams.delete(p));
    // Normalize
    let canonical = parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '');
    if (parsed.search) canonical += parsed.search;
    return canonical.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Simple text similarity using Jaccard index on word sets
 */
function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Staged deduplication of search results.
 *
 * Stages (in order, each progressively more expensive):
 * 1. URL canonicalization - Normalize and compare URLs
 * 2. Exact match - Exact title match
 * 3. Jaccard similarity - Word-level similarity on title/snippet
 * 4. Embedding similarity - (FUTURE) Semantic similarity via embeddings
 *
 * @param results - Search results to deduplicate
 * @param options - Deduplication options
 * @returns Deduplicated results with metrics
 */
export function deduplicateResults(
  results: SearchResult[],
  options: {
    jaccardThreshold?: number;
    /** Enable embedding-based dedup (FUTURE - not yet implemented) */
    useEmbeddings?: boolean;
  } = {}
): { results: SearchResult[]; duplicatesRemoved: number; metrics: DeduplicationMetrics } {
  const startTime = Date.now();
  const threshold = options.jaccardThreshold ?? 0.7;

  const metrics: DeduplicationMetrics = {
    totalInput: results.length,
    totalOutput: 0,
    duplicatesRemoved: 0,
    byStage: { urlCanonical: 0, exactMatch: 0, jaccard: 0, embedding: 0 },
    processingTimeMs: 0,
  };

  // Stage 1: URL canonicalization
  const urlMap = new Map<string, SearchResult>();
  const afterUrlDedup: SearchResult[] = [];

  for (const result of results) {
    if (result.url) {
      const canonical = canonicalizeUrl(result.url);
      if (!urlMap.has(canonical)) {
        urlMap.set(canonical, result);
        afterUrlDedup.push(result);
      } else {
        metrics.byStage.urlCanonical++;
      }
    } else {
      afterUrlDedup.push(result);
    }
  }

  // Stage 2: Exact title match
  const titleMap = new Map<string, SearchResult>();
  const afterExactDedup: SearchResult[] = [];

  for (const result of afterUrlDedup) {
    const normalizedTitle = result.title.toLowerCase().trim();
    if (!titleMap.has(normalizedTitle)) {
      titleMap.set(normalizedTitle, result);
      afterExactDedup.push(result);
    } else {
      metrics.byStage.exactMatch++;
    }
  }

  // Stage 3: Jaccard similarity
  const seen: SearchResult[] = [];

  for (const result of afterExactDedup) {
    const isDuplicate = seen.some(existing => {
      // Check title similarity
      const titleSim = jaccardSimilarity(existing.title, result.title);
      if (titleSim >= threshold) return true;
      // Check snippet similarity
      const snippetSim = jaccardSimilarity(existing.snippet, result.snippet);
      if (snippetSim >= threshold) return true;
      // Combined check
      return (titleSim * 0.6 + snippetSim * 0.4) >= threshold;
    });

    if (isDuplicate) {
      metrics.byStage.jaccard++;
    } else {
      seen.push(result);
    }
  }

  // Stage 4: Embedding similarity (FUTURE)
  // TODO: Implement embedding-based deduplication when embeddings are available
  // This would use cosine similarity on result embeddings for semantic dedup
  if (options.useEmbeddings) {
    console.log("[deduplicateResults] Embedding-based dedup not yet implemented");
  }

  metrics.totalOutput = seen.length;
  metrics.duplicatesRemoved = metrics.totalInput - metrics.totalOutput;
  metrics.processingTimeMs = Date.now() - startTime;

  console.log(`[deduplicateResults] ${metrics.totalInput} → ${metrics.totalOutput} results (removed ${metrics.duplicatesRemoved}: url=${metrics.byStage.urlCanonical}, exact=${metrics.byStage.exactMatch}, jaccard=${metrics.byStage.jaccard})`);

  return { results: seen, duplicatesRemoved: metrics.duplicatesRemoved, metrics };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY EXPANSION (GATED BY QUERY TYPE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Query types that benefit from expansion
 */
export type QueryType = "financial" | "research" | "news" | "tutorial" | "internal" | "general";

/**
 * Query expansion configuration by type
 */
interface ExpansionConfig {
  /** Whether to expand this query type */
  enabled: boolean;
  /** Maximum synonyms to add */
  maxSynonyms: number;
  /** Whether to add related terms */
  includeRelated: boolean;
}

const EXPANSION_CONFIG: Record<QueryType, ExpansionConfig> = {
  financial: { enabled: true, maxSynonyms: 3, includeRelated: true },
  research: { enabled: true, maxSynonyms: 2, includeRelated: true },
  news: { enabled: false, maxSynonyms: 0, includeRelated: false }, // News queries should be precise
  tutorial: { enabled: true, maxSynonyms: 2, includeRelated: false },
  internal: { enabled: false, maxSynonyms: 0, includeRelated: false }, // Internal docs need exact match
  general: { enabled: true, maxSynonyms: 2, includeRelated: false },
};

/**
 * Common synonym mappings for query expansion
 */
const SYNONYM_MAP: Record<string, string[]> = {
  // Business/Finance
  "revenue": ["sales", "income", "earnings"],
  "profit": ["earnings", "income", "margin"],
  "stock": ["shares", "equity", "securities"],
  "company": ["corporation", "firm", "business", "enterprise"],
  "ceo": ["chief executive", "executive", "leader"],
  "ipo": ["initial public offering", "going public"],
  "acquisition": ["merger", "buyout", "takeover"],
  "funding": ["investment", "capital", "financing"],

  // Technology
  "ai": ["artificial intelligence", "machine learning", "ml"],
  "ml": ["machine learning", "ai", "deep learning"],
  "api": ["interface", "endpoint", "service"],
  "cloud": ["saas", "aws", "azure", "gcp"],
  "startup": ["company", "venture", "business"],

  // Research
  "study": ["research", "paper", "analysis"],
  "paper": ["study", "research", "publication"],
  "findings": ["results", "conclusions", "outcomes"],
};

/**
 * Detect query type from keywords (exported for reuse)
 */
export function detectQueryType(query: string): QueryType {
  const q = query.toLowerCase();

  if (/\b(stock|earnings|revenue|sec|filing|10-k|10-q|quarterly|annual report)\b/.test(q)) {
    return "financial";
  }
  if (/\b(research|paper|study|arxiv|academic|journal|publication)\b/.test(q)) {
    return "research";
  }
  if (/\b(news|latest|breaking|today|yesterday|recent)\b/.test(q)) {
    return "news";
  }
  if (/\b(how to|tutorial|guide|learn|example|demo)\b/.test(q)) {
    return "tutorial";
  }
  if (/\b(my|our|internal|team|project|document)\b/.test(q)) {
    return "internal";
  }

  return "general";
}

/**
 * Expand query with synonyms and related terms.
 *
 * Expansion is GATED by query type:
 * - financial/research: Full expansion with synonyms and related terms
 * - tutorial: Moderate expansion with synonyms only
 * - news/internal: NO expansion (precision is critical)
 * - general: Moderate expansion
 *
 * @param query - Original search query
 * @param options - Expansion options
 * @returns Expanded query with synonyms (or original if expansion disabled)
 */
export function expandQuery(
  query: string,
  options: { forceExpand?: boolean; queryType?: QueryType } = {}
): ExpandedQuery {
  const queryType = options.queryType ?? detectQueryType(query);
  const config = EXPANSION_CONFIG[queryType];

  // Check if expansion is enabled for this query type
  if (!config.enabled && !options.forceExpand) {
    console.log(`[expandQuery] Expansion disabled for query type: ${queryType}`);
    return {
      original: query,
      expanded: [query],
      synonyms: [],
      relatedTerms: [],
      queryType,
      expansionApplied: false,
    };
  }

  const words = query.toLowerCase().split(/\s+/);
  const synonyms: string[] = [];
  const relatedTerms: string[] = [];

  for (const word of words) {
    const wordSynonyms = SYNONYM_MAP[word];
    if (wordSynonyms) {
      synonyms.push(...wordSynonyms.slice(0, config.maxSynonyms));
    }
  }

  // Generate expanded queries
  const expanded: string[] = [query];

  // Add query with synonym augmentation (not substitution)
  if (synonyms.length > 0) {
    const uniqueSynonyms = [...new Set(synonyms)].slice(0, config.maxSynonyms);
    expanded.push(`${query} ${uniqueSynonyms.join(" ")}`);
  }

  console.log(`[expandQuery] Query type: ${queryType}, synonyms found: ${synonyms.length}`);

  return {
    original: query,
    expanded,
    synonyms: [...new Set(synonyms)],
    relatedTerms: config.includeRelated ? [...new Set(relatedTerms)] : [],
    queryType,
    expansionApplied: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE-SPECIFIC RELEVANCE BOOSTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default source boost factors
 */
const DEFAULT_SOURCE_BOOSTS: Record<SearchSource, number> = {
  sec: 1.2,        // SEC filings are authoritative for financial queries
  arxiv: 1.15,    // Academic papers are authoritative for research
  rag: 1.1,       // Internal knowledge is contextually relevant
  documents: 1.05, // User documents are personally relevant
  linkup: 1.0,    // Web search is baseline
  news: 0.95,     // News may be less authoritative
  youtube: 0.9,   // Video content may be less precise
};

/**
 * Query-type specific boost overrides
 */
const QUERY_TYPE_BOOSTS: Record<string, Partial<Record<SearchSource, number>>> = {
  financial: { sec: 1.5, news: 1.2, arxiv: 0.8 },
  research: { arxiv: 1.5, rag: 1.2, youtube: 0.7 },
  news: { news: 1.4, linkup: 1.2, sec: 0.9 },
  tutorial: { youtube: 1.4, linkup: 1.2, arxiv: 0.8 },
  internal: { rag: 1.5, documents: 1.4, linkup: 0.8 },
};

// NOTE: detectQueryType is defined above in the QUERY EXPANSION section
// and exported for reuse by applySourceBoosts

/**
 * Apply source-specific relevance boosting to results
 *
 * @param results - Search results to boost
 * @param query - Original query for type detection
 * @param userPrefs - Optional user preferences
 * @returns Results with adjusted scores
 */
export function applySourceBoosts(
  results: SearchResult[],
  query: string,
  userPrefs?: UserSearchPreferences
): SearchResult[] {
  const queryType = detectQueryType(query);
  const typeBoosts = queryType ? QUERY_TYPE_BOOSTS[queryType] : {};

  return results.map(result => {
    let boost = DEFAULT_SOURCE_BOOSTS[result.source] || 1.0;

    // Apply query-type specific boost
    if (typeBoosts[result.source]) {
      boost *= typeBoosts[result.source]!;
    }

    // Apply user preference boost
    if (userPrefs) {
      if (userPrefs.preferredSources.includes(result.source)) {
        boost *= 1.2;
      }
      if (userPrefs.blockedSources.includes(result.source)) {
        boost = 0; // Exclude blocked sources
      }
    }

    return {
      ...result,
      score: result.score * boost,
    };
  }).filter(r => r.score > 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// USER PREFERENCE LEARNING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserSearchPreferences = {
  preferredSources: [],
  blockedSources: [],
  contentTypeWeights: {},
  topicInterests: [],
  recencyBias: 0.5,
};

/**
 * User interaction event for preference learning
 */
export interface UserInteraction {
  resultId: string;
  source: SearchSource;
  action: "click" | "bookmark" | "share" | "dismiss" | "dwell";
  dwellTimeMs?: number;
  timestamp: number;
}

/**
 * Update user preferences based on interactions
 *
 * @param current - Current user preferences
 * @param interactions - Recent user interactions
 * @returns Updated preferences
 */
export function updatePreferencesFromInteractions(
  current: UserSearchPreferences,
  interactions: UserInteraction[]
): UserSearchPreferences {
  const sourceScores: Record<SearchSource, number> = {} as Record<SearchSource, number>;

  // Score sources based on interactions
  for (const interaction of interactions) {
    const source = interaction.source;
    if (!sourceScores[source]) sourceScores[source] = 0;

    switch (interaction.action) {
      case "click":
        sourceScores[source] += 1;
        break;
      case "bookmark":
        sourceScores[source] += 3;
        break;
      case "share":
        sourceScores[source] += 2;
        break;
      case "dismiss":
        sourceScores[source] -= 2;
        break;
      case "dwell": {
        // Longer dwell time = more interest
        const dwellScore = Math.min((interaction.dwellTimeMs || 0) / 30000, 2);
        sourceScores[source] += dwellScore;
        break;
      }
    }
  }

  // Update preferred sources (top 3 with positive scores)
  const sortedSources = Object.entries(sourceScores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([source]) => source as SearchSource);

  // Update blocked sources (negative scores)
  const blockedSources = Object.entries(sourceScores)
    .filter(([_, score]) => score < -3)
    .map(([source]) => source as SearchSource);

  return {
    ...current,
    preferredSources: sortedSources,
    blockedSources: [...new Set([...current.blockedSources, ...blockedSources])],
  };
}

/**
 * Apply recency bias to results
 *
 * @param results - Search results
 * @param recencyBias - Bias factor (0 = no bias, 1 = strong bias)
 * @returns Results with recency-adjusted scores
 */
export function applyRecencyBias(
  results: SearchResult[],
  recencyBias: number = 0.5
): SearchResult[] {
  if (recencyBias === 0) return results;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return results.map(result => {
    if (!result.publishedAt) return result;

    const publishedDate = new Date(result.publishedAt).getTime();
    const ageInDays = (now - publishedDate) / dayMs;

    // Decay factor: newer = higher boost
    // 0 days = 1.0 + recencyBias, 30 days = 1.0, 365 days = 1.0 - recencyBias/2
    let recencyFactor = 1.0;
    if (ageInDays < 30) {
      recencyFactor = 1.0 + recencyBias * (1 - ageInDays / 30);
    } else if (ageInDays > 365) {
      recencyFactor = 1.0 - recencyBias * 0.5 * Math.min((ageInDays - 365) / 365, 1);
    }

    return {
      ...result,
      score: result.score * recencyFactor,
    };
  });
}
