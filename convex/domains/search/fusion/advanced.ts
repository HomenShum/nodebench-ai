/**
 * Advanced Search Features
 *
 * Provides:
 * - Result deduplication by content similarity
 * - Query expansion for better recall
 * - Source-specific relevance boosting
 * - User preference learning for result ranking
 *
 * @module search/fusion/advanced
 */

import type { SearchResult, SearchSource } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

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
}

// ═══════════════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════

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
 * Deduplicate results by content similarity
 *
 * @param results - Search results to deduplicate
 * @param threshold - Similarity threshold (0-1), default 0.7
 * @returns Deduplicated results with duplicates marked
 */
export function deduplicateResults(
  results: SearchResult[],
  threshold: number = 0.7
): { results: SearchResult[]; duplicatesRemoved: number } {
  const seen: SearchResult[] = [];
  const duplicatesRemoved: SearchResult[] = [];

  for (const result of results) {
    const isDuplicate = seen.some(existing => {
      // Check URL match first (exact duplicate)
      if (existing.url && result.url && existing.url === result.url) {
        return true;
      }
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
      duplicatesRemoved.push(result);
    } else {
      seen.push(result);
    }
  }

  return { results: seen, duplicatesRemoved: duplicatesRemoved.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY EXPANSION
// ═══════════════════════════════════════════════════════════════════════════

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
 * Expand query with synonyms and related terms
 *
 * @param query - Original search query
 * @returns Expanded query with synonyms
 */
export function expandQuery(query: string): ExpandedQuery {
  const words = query.toLowerCase().split(/\s+/);
  const synonyms: string[] = [];
  const relatedTerms: string[] = [];

  for (const word of words) {
    const wordSynonyms = SYNONYM_MAP[word];
    if (wordSynonyms) {
      synonyms.push(...wordSynonyms);
    }
  }

  // Generate expanded queries
  const expanded: string[] = [query];

  // Add query with first synonym substitution
  if (synonyms.length > 0) {
    expanded.push(`${query} ${synonyms.slice(0, 2).join(" ")}`);
  }

  return {
    original: query,
    expanded,
    synonyms: [...new Set(synonyms)],
    relatedTerms: [...new Set(relatedTerms)],
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

/**
 * Detect query type from keywords
 */
function detectQueryType(query: string): string | null {
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

  return null;
}

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
      case "dwell":
        // Longer dwell time = more interest
        const dwellScore = Math.min((interaction.dwellTimeMs || 0) / 30000, 2);
        sourceScores[source] += dwellScore;
        break;
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
