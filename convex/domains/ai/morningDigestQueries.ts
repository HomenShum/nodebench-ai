import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
