// convex/feed.ts - Central Newsstand for Live Intelligence Feed
// "Write Once, Read Many" - hourly ingest from free public sources
// All users (Free & Pro) can read this shared feed

import { action, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ============================================================================
// 1. PUBLIC QUERY: The "Feed" your frontend consumes
// ============================================================================
export const get = query({
  args: { 
    limit: v.optional(v.number()),
    type: v.optional(v.union(v.literal("news"), v.literal("signal"), v.literal("dossier"))),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // If type filter specified, use the type index
    if (args.type) {
      return await ctx.db
        .query("feedItems")
        .withIndex("by_type", q => q.eq("type", args.type!))
        .order("desc")
        .take(limit);
    }
    
    // Otherwise get all items ordered by score (hottest first)
    return await ctx.db
      .query("feedItems")
      .withIndex("by_score")
      .order("desc")
      .take(limit);
  },
});

// Get trending items (highest score)
export const getTrending = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("feedItems")
      .withIndex("by_score")
      .order("desc")
      .take(args.limit || 8);
  },
});

// ============================================================================
// 2. INTERNAL MUTATION: Save items to DB (with deduplication)
// ============================================================================
export const saveItems = internalMutation({
  args: { 
    items: v.array(v.object({
      sourceId: v.string(),
      type: v.union(v.literal("news"), v.literal("signal"), v.literal("dossier")),
      title: v.string(),
      summary: v.string(),
      url: v.string(),
      source: v.string(),
      tags: v.array(v.string()),
      metrics: v.optional(v.array(v.object({
        label: v.string(),
        value: v.string(),
        trend: v.optional(v.union(v.literal("up"), v.literal("down")))
      }))),
      publishedAt: v.string(),
      score: v.number(),
    }))
  },
  handler: async (ctx, args) => {
    let insertedCount = 0;
    
    for (const item of args.items) {
      // Deduplicate by sourceId
      const existing = await ctx.db
        .query("feedItems")
        .withIndex("by_source_id", q => q.eq("sourceId", item.sourceId))
        .first();
      
      if (!existing) {
        await ctx.db.insert("feedItems", {
          ...item,
          createdAt: Date.now(),
        });
        insertedCount++;
      }
    }
    
    return { inserted: insertedCount, total: args.items.length };
  }
});

// ============================================================================
// 3. ACTION: Fetch from Hacker News (Free Public API)
// ============================================================================
export const ingestHackerNews = action({
  args: {},
  handler: async (ctx) => {
    try {
      // A. Fetch Top Stories IDs
      const topStoriesRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
      const topIds: number[] = (await topStoriesRes.json()).slice(0, 15); // Get top 15

      const feedItems: Array<{
        sourceId: string;
        type: "news" | "signal" | "dossier";
        title: string;
        summary: string;
        url: string;
        source: string;
        tags: string[];
        metrics: Array<{ label: string; value: string; trend?: "up" | "down" }>;
        publishedAt: string;
        score: number;
      }> = [];

      // B. Fetch Details for each story (in parallel for speed)
      const storyPromises = topIds.map(async (id) => {
        const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return storyRes.json();
      });
      
      const stories = await Promise.all(storyPromises);

      // C. Filter and transform
      for (const story of stories) {
        if (!story || !story.title) continue;
        
        const title = story.title || "";
        
        // Relevance filter - tech/AI/funding related
        const isRelevant = /AI|LLM|GPT|Model|Infra|Data|SaaS|Funding|Startup|YC|Launch|API|Agent|Vector|RAG|Cloud/i.test(title);

        if (isRelevant) {
          // Determine type based on content
          const isSignal = /funding|raise|series|valuation|\$\d+/i.test(title);
          
          feedItems.push({
            sourceId: `hn-${story.id}`,
            type: isSignal ? "signal" : "news",
            title: story.title,
            summary: `Trending on Hacker News with ${story.score || 0} points and ${story.descendants || 0} comments.`,
            url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
            source: "YCombinator",
            tags: isSignal ? ["Trending", "Funding"] : ["Trending", "Tech"],
            metrics: [
              { label: "Points", value: (story.score || 0).toString(), trend: "up" as const },
              { label: "Comments", value: (story.descendants || 0).toString() }
            ],
            publishedAt: new Date((story.time || Date.now() / 1000) * 1000).toISOString(),
            score: story.score || 0
          });
        }
      }

      // D. Save to DB
      if (feedItems.length > 0) {
        await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      }
      
      return { status: "success", ingested: feedItems.length, checked: stories.length };
    } catch (error) {
      console.error("Error ingesting Hacker News:", error);
      return { status: "error", message: String(error) };
    }
  }
});

