/**
 * Search Fusion Types
 * 
 * Unified types for multi-source search fusion.
 * All search sources must conform to these interfaces.
 * 
 * @module search/fusion/types
 */

import type { Id } from "../../../_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH SOURCE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Available search sources */
export type SearchSource = 
  | "linkup"      // External web search via LinkUp API
  | "sec"         // SEC EDGAR filings
  | "rag"         // Internal RAG (vector + keyword)
  | "documents"   // Direct document search
  | "news"        // News articles
  | "youtube"     // YouTube videos
  | "arxiv";      // Academic papers

/** Search mode determines which sources to query and how */
export type SearchMode = 
  | "fast"          // Single best source, no fusion
  | "balanced"      // 2-3 sources, RRF fusion
  | "comprehensive"; // All sources, LLM reranking

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED SEARCH RESULT
// ═══════════════════════════════════════════════════════════════════════════

/** Unified search result from any source */
export interface SearchResult {
  /** Unique identifier for this result */
  id: string;
  
  /** Source that produced this result */
  source: SearchSource;
  
  /** Result title */
  title: string;
  
  /** Result snippet/summary */
  snippet: string;
  
  /** Full URL (for external sources) */
  url?: string;
  
  /** Document ID (for internal sources) */
  documentId?: Id<"documents">;
  
  /** Relevance score (0-1, normalized) */
  score: number;
  
  /** Original rank from source (1-based) */
  originalRank: number;
  
  /** Fused rank after RRF (1-based) */
  fusedRank?: number;
  
  /** Content type */
  contentType: "text" | "pdf" | "video" | "image" | "filing" | "news";
  
  /** Publication/creation date */
  publishedAt?: string;
  
  /** Author or organization */
  author?: string;
  
  /** Additional metadata from source */
  metadata?: Record<string, unknown>;
  
  /** Highlight snippets for display */
  highlights?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH REQUEST/RESPONSE
// ═══════════════════════════════════════════════════════════════════════════

/** Search request configuration */
export interface SearchRequest {
  /** Search query */
  query: string;
  
  /** Search mode */
  mode: SearchMode;
  
  /** Specific sources to query (optional, defaults based on mode) */
  sources?: SearchSource[];
  
  /** Maximum results per source */
  maxPerSource?: number;
  
  /** Maximum total results after fusion */
  maxTotal?: number;
  
  /** Enable LLM reranking */
  enableReranking?: boolean;
  
  /** Filter by content type */
  contentTypes?: SearchResult["contentType"][];
  
  /** Filter by date range */
  dateRange?: {
    start?: string;
    end?: string;
  };
  
  /** User ID for personalization */
  userId?: Id<"users">;
}

/** Search response with results and metadata */
export interface SearchResponse {
  /** Fused and ranked results */
  results: SearchResult[];
  
  /** Total results before fusion */
  totalBeforeFusion: number;
  
  /** Search mode used */
  mode: SearchMode;
  
  /** Sources queried */
  sourcesQueried: SearchSource[];
  
  /** Per-source timing (ms) */
  timing: Record<SearchSource, number>;
  
  /** Total execution time (ms) */
  totalTimeMs: number;
  
  /** Whether LLM reranking was applied */
  reranked: boolean;
  
  /** Any errors from sources */
  errors?: Array<{
    source: SearchSource;
    error: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE ADAPTER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/** Interface that all search source adapters must implement */
export interface SearchSourceAdapter {
  /** Source identifier */
  source: SearchSource;
  
  /** Execute search and return normalized results */
  search(query: string, options: SearchAdapterOptions): Promise<SearchResult[]>;
  
  /** Check if source is available (API key configured, etc.) */
  isAvailable(): boolean;
}

/** Options passed to source adapters */
export interface SearchAdapterOptions {
  maxResults: number;
  contentTypes?: SearchResult["contentType"][];
  dateRange?: SearchRequest["dateRange"];
  userId?: Id<"users">;
}

