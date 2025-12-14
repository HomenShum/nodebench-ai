"use node";
/**
 * Search Fusion Actions
 * 
 * Convex actions for multi-source search fusion.
 * 
 * @module search/fusion/actions
 */

import { action } from "../../../_generated/server";
import { v } from "convex/values";
import { SearchOrchestrator } from "./orchestrator";
import type { SearchMode, SearchSource } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════

const searchModeValidator = v.union(
  v.literal("fast"),
  v.literal("balanced"),
  v.literal("comprehensive")
);

const searchSourceValidator = v.union(
  v.literal("linkup"),
  v.literal("sec"),
  v.literal("rag"),
  v.literal("documents"),
  v.literal("news"),
  v.literal("youtube"),
  v.literal("arxiv")
);

const contentTypeValidator = v.union(
  v.literal("text"),
  v.literal("pdf"),
  v.literal("video"),
  v.literal("image"),
  v.literal("filing"),
  v.literal("news")
);

const searchResultValidator = v.object({
  id: v.string(),
  source: searchSourceValidator,
  title: v.string(),
  snippet: v.string(),
  url: v.optional(v.string()),
  documentId: v.optional(v.id("documents")),
  score: v.number(),
  originalRank: v.number(),
  fusedRank: v.optional(v.number()),
  contentType: contentTypeValidator,
  publishedAt: v.optional(v.string()),
  author: v.optional(v.string()),
  metadata: v.optional(v.any()),
  highlights: v.optional(v.array(v.string())),
});

const searchResponseValidator = v.object({
  results: v.array(searchResultValidator),
  totalBeforeFusion: v.number(),
  mode: searchModeValidator,
  sourcesQueried: v.array(searchSourceValidator),
  timing: v.any(), // Record<SearchSource, number>
  totalTimeMs: v.number(),
  reranked: v.boolean(),
  errors: v.optional(v.array(v.object({
    source: searchSourceValidator,
    error: v.string(),
  }))),
});

// ═══════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute multi-source search with fusion.
 */
export const fusionSearch = action({
  args: {
    query: v.string(),
    mode: v.optional(searchModeValidator),
    sources: v.optional(v.array(searchSourceValidator)),
    maxPerSource: v.optional(v.number()),
    maxTotal: v.optional(v.number()),
    enableReranking: v.optional(v.boolean()),
    contentTypes: v.optional(v.array(contentTypeValidator)),
    dateRange: v.optional(v.object({
      start: v.optional(v.string()),
      end: v.optional(v.string()),
    })),
    userId: v.optional(v.id("users")),
  },
  returns: searchResponseValidator,
  handler: async (ctx, args) => {
    console.log(`[fusionSearch] Query: "${args.query}", Mode: ${args.mode || "balanced"}`);
    
    const orchestrator = new SearchOrchestrator(ctx);
    
    const response = await orchestrator.search({
      query: args.query,
      mode: (args.mode || "balanced") as SearchMode,
      sources: args.sources as SearchSource[] | undefined,
      maxPerSource: args.maxPerSource,
      maxTotal: args.maxTotal,
      enableReranking: args.enableReranking,
      contentTypes: args.contentTypes as any,
      dateRange: args.dateRange,
      userId: args.userId,
    });
    
    // Log observability metrics
    console.log(`[fusionSearch] Results: ${response.results.length}/${response.totalBeforeFusion}`);
    console.log(`[fusionSearch] Timing:`, response.timing);
    console.log(`[fusionSearch] Total: ${response.totalTimeMs}ms, Reranked: ${response.reranked}`);
    
    return response;
  },
});

/**
 * Quick search using fast mode (single source, no fusion).
 */
export const quickSearch = action({
  args: {
    query: v.string(),
    maxResults: v.optional(v.number()),
  },
  returns: v.array(searchResultValidator),
  handler: async (ctx, args) => {
    const orchestrator = new SearchOrchestrator(ctx);
    
    const response = await orchestrator.search({
      query: args.query,
      mode: "fast",
      maxTotal: args.maxResults || 10,
    });
    
    return response.results;
  },
});

