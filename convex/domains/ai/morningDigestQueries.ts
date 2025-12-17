import { v } from "convex/values";
import { query, mutation, internalMutation } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// TTL for cached digest summaries (4 hours)
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

/**
 * Get cached digest summary if available and valid
 * Returns null if cache miss or expired
 */
export const getCachedDigestSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const today = new Date().toISOString().split('T')[0];

    // Try user-specific cache first
    if (userId) {
      const userCache = await ctx.db
        .query("digestSummaryCache")
        .withIndex("by_date_user", (q) =>
          q.eq("dateString", today).eq("userId", userId as any)
        )
        .first();

      if (userCache && userCache.expiresAt > Date.now()) {
        return {
          summary: userCache.summary,
          generatedAt: userCache.generatedAt,
          isFromCache: true,
        };
      }
    }

    // Fall back to global cache (anonymous users or no user cache)
    const globalCache = await ctx.db
      .query("digestSummaryCache")
      .withIndex("by_date", (q) => q.eq("dateString", today))
      .filter((q) => q.eq(q.field("userId"), undefined))
      .first();

    if (globalCache && globalCache.expiresAt > Date.now()) {
      return {
        summary: globalCache.summary,
        generatedAt: globalCache.generatedAt,
        isFromCache: true,
      };
    }

    return null;
  },
});

/**
 * Save generated digest summary to cache
 */
export const cacheDigestSummary = mutation({
  args: {
    summary: v.string(),
    dataHash: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();

    // Check if we already have a cache entry for today
    const existingQuery = userId
      ? ctx.db
          .query("digestSummaryCache")
          .withIndex("by_date_user", (q) =>
            q.eq("dateString", today).eq("userId", userId as any)
          )
      : ctx.db
          .query("digestSummaryCache")
          .withIndex("by_date", (q) => q.eq("dateString", today))
          .filter((q) => q.eq(q.field("userId"), undefined));

    const existing = await existingQuery.first();

    if (existing) {
      // Update existing cache entry
      await ctx.db.patch(existing._id, {
        summary: args.summary,
        dataHash: args.dataHash,
        generatedAt: now,
        expiresAt: now + CACHE_TTL_MS,
        hitCount: (existing.hitCount ?? 0) + 1,
      });
      return existing._id;
    }

    // Create new cache entry
    return await ctx.db.insert("digestSummaryCache", {
      dateString: today,
      userId: userId as any,
      summary: args.summary,
      dataHash: args.dataHash,
      generatedAt: now,
      expiresAt: now + CACHE_TTL_MS,
      hitCount: 0,
    });
  },
});

/**
 * Internal mutation to clean up expired cache entries
 */
export const cleanupExpiredCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("digestSummaryCache")
      .withIndex("by_expires_at")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(100);

    for (const entry of expired) {
      await ctx.db.delete(entry._id);
    }

    return { deleted: expired.length };
  },
});

// Get digest data from feed items filtered by user's tracked topics
export const getDigestData = query({
  args: {},
  handler: async (ctx) => {
    // Get user's tracked hashtags from preferences
    const userId = await getAuthUserId(ctx);
    let trackedHashtags: string[] = [];
    
    if (userId) {
      const prefs = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId as any))
        .first();
      trackedHashtags = prefs?.trackedHashtags ?? [];
    }

    // Get recent feed items (last 24 hours worth)
    const feedItems = await ctx.db
      .query("feedItems")
      .withIndex("by_score")
      .order("desc")
      .take(50);

    // Categorize items
    const marketMovers: typeof feedItems = [];
    const watchlistRelevant: typeof feedItems = [];
    const riskAlerts: typeof feedItems = [];

    const riskKeywords = ['risk', 'concern', 'decline', 'fall', 'regulation', 'investigation', 'lawsuit', 'warning', 'alert'];
    const marketKeywords = ['market', 'stock', 'nasdaq', 's&p', 'dow', 'futures', 'treasury', 'yield', 'fed', 'rate'];

    for (const item of feedItems) {
      const titleLower = item.title.toLowerCase();
      const tagsLower = item.tags.map(t => t.toLowerCase());
      const allText = `${titleLower} ${tagsLower.join(' ')}`;

      // Check if item matches user's tracked topics
      const matchesWatchlist = trackedHashtags.some(hashtag => 
        allText.includes(hashtag.toLowerCase())
      );

      // Categorize
      if (riskKeywords.some(k => allText.includes(k))) {
        riskAlerts.push(item);
      } else if (matchesWatchlist) {
        watchlistRelevant.push(item);
      } else if (marketKeywords.some(k => allText.includes(k))) {
        marketMovers.push(item);
      } else {
        // Default to market movers if no specific category
        marketMovers.push(item);
      }
    }

    return {
      trackedHashtags,
      marketMovers: marketMovers.slice(0, 5),
      watchlistRelevant: watchlistRelevant.slice(0, 5),
      riskAlerts: riskAlerts.slice(0, 3),
      lastUpdated: Date.now(),
    };
  },
});
