// convex/feed.ts - Central Newsstand for Live Intelligence Feed
// "Write Once, Read Many" - hourly ingest from free public sources
// All users (Free & Pro) can read this shared feed

import { action, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ============================================================================
// 1. PUBLIC QUERY: The "Feed" your frontend consumes
// ============================================================================
// Feed categories for segmented views
const FEED_TYPES = ["news", "signal", "dossier", "repo", "product"] as const;
const FEED_CATEGORIES = ["tech", "ai_ml", "startups", "products", "opensource", "finance", "research"] as const;

export const get = query({
  args: { 
    limit: v.optional(v.number()),
    type: v.optional(v.union(
      v.literal("news"), 
      v.literal("signal"), 
      v.literal("dossier"),
      v.literal("repo"),
      v.literal("product")
    )),
    category: v.optional(v.union(
      v.literal("tech"),
      v.literal("ai_ml"),
      v.literal("startups"),
      v.literal("products"),
      v.literal("opensource"),
      v.literal("finance"),
      v.literal("research")
    )),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // If category filter specified, use the category index
    if (args.category) {
      return await ctx.db
        .query("feedItems")
        .withIndex("by_category", q => q.eq("category", args.category!))
        .order("desc")
        .take(limit);
    }
    
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

// Get feed items by category for segmented views
export const getByCategory = query({
  args: { 
    category: v.union(
      v.literal("tech"),
      v.literal("ai_ml"),
      v.literal("startups"),
      v.literal("products"),
      v.literal("opensource"),
      v.literal("finance"),
      v.literal("research")
    ),
    limit: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("feedItems")
      .withIndex("by_category", q => q.eq("category", args.category))
      .order("desc")
      .take(args.limit || 20);
  },
});

// Get available categories with counts
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    // Get counts for each category
    const categories = [
      { id: "all", label: "All", icon: "📰" },
      { id: "ai_ml", label: "AI & ML", icon: "🤖" },
      { id: "startups", label: "Startups", icon: "🚀" },
      { id: "products", label: "Products", icon: "📦" },
      { id: "opensource", label: "Open Source", icon: "💻" },
      { id: "research", label: "Research", icon: "📚" },
      { id: "tech", label: "Tech News", icon: "📱" },
      { id: "finance", label: "Finance", icon: "💰" },
    ];
    return categories;
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
      type: v.union(
        v.literal("news"), 
        v.literal("signal"), 
        v.literal("dossier"),
        v.literal("repo"),
        v.literal("product")
      ),
      category: v.optional(v.union(
        v.literal("tech"),
        v.literal("ai_ml"),
        v.literal("startups"),
        v.literal("products"),
        v.literal("opensource"),
        v.literal("finance"),
        v.literal("research")
      )),
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

// ============================================================================
// 4. ACTION: Fetch from ArXiv (Free Public API - AI/ML Research)
// https://arxiv.org/help/api/user-manual
// ============================================================================
export const ingestArXiv = action({
  args: {},
  handler: async (ctx) => {
    try {
      // ArXiv API: search for AI/ML papers from last 24 hours
      // Categories: cs.AI (Artificial Intelligence), cs.LG (Machine Learning), cs.CL (Computation and Language)
      const categories = "cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL";
      const maxResults = 25;

      // ArXiv API URL
      const arxivUrl = `http://export.arxiv.org/api/query?search_query=${categories}&sortBy=submittedDate&sortOrder=descending&max_results=${maxResults}`;

      const response = await fetch(arxivUrl);
      const xmlText = await response.text();

      // Parse XML response (simple regex parsing for Atom feed)
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

      // Extract entries using regex (ArXiv returns Atom XML)
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      const titleRegex = /<title>([\s\S]*?)<\/title>/;
      const summaryRegex = /<summary>([\s\S]*?)<\/summary>/;
      const idRegex = /<id>([\s\S]*?)<\/id>/;
      const publishedRegex = /<published>([\s\S]*?)<\/published>/;
      const categoryRegex = /<category[^>]*term="([^"]+)"/g;
      const authorRegex = /<author>\s*<name>([\s\S]*?)<\/name>/g;

      let match;
      let checked = 0;

      while ((match = entryRegex.exec(xmlText)) !== null) {
        checked++;
        const entry = match[1];

        const titleMatch = titleRegex.exec(entry);
        const summaryMatch = summaryRegex.exec(entry);
        const idMatch = idRegex.exec(entry);
        const publishedMatch = publishedRegex.exec(entry);

        if (!titleMatch || !idMatch) continue;

        const title = titleMatch[1].trim().replace(/\s+/g, ' ');
        const summary = summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ').slice(0, 300) + '...' : '';
        const arxivId = idMatch[1].split('/').pop() || '';
        const published = publishedMatch ? publishedMatch[1] : new Date().toISOString();

        // Extract categories
        const tags: string[] = ["Research"];
        let catMatch;
        while ((catMatch = categoryRegex.exec(entry)) !== null) {
          const cat = catMatch[1];
          if (cat === 'cs.AI') tags.push('AI');
          if (cat === 'cs.LG') tags.push('ML');
          if (cat === 'cs.CL') tags.push('NLP');
        }

        // Count authors
        let authorCount = 0;
        while (authorRegex.exec(entry) !== null) {
          authorCount++;
        }

        // Relevance filter - more aggressive for arxiv
        const isRelevant = /LLM|GPT|transformer|agent|RAG|retrieval|language model|reasoning|multimodal|vision|diffusion|embedding/i.test(title + summary);

        if (isRelevant) {
          feedItems.push({
            sourceId: `arxiv-${arxivId}`,
            type: "dossier", // Research papers are dossier-style
            title: title,
            summary: summary,
            url: `https://arxiv.org/abs/${arxivId}`,
            source: "ArXiv",
            tags: tags.slice(0, 4),
            metrics: [
              { label: "Authors", value: authorCount.toString() },
            ],
            publishedAt: published,
            score: 50 + Math.floor(Math.random() * 50) // ArXiv doesn't have votes, use random for variety
          });
        }
      }

      // Save to DB
      if (feedItems.length > 0) {
        await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      }

      return { status: "success", ingested: feedItems.length, checked };
    } catch (error) {
      console.error("Error ingesting ArXiv:", error);
      return { status: "error", message: String(error) };
    }
  }
});

// ============================================================================
// 5. ACTION: Fetch from Reddit (Free JSON API - No Auth Required)
// Subreddits: r/technology, r/MachineLearning, r/startups
// ============================================================================
export const ingestReddit = action({
  args: {},
  handler: async (ctx) => {
    try {
      const subreddits = ['technology', 'MachineLearning', 'startups', 'artificial'];
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

      let totalChecked = 0;

      // Fetch from each subreddit in parallel
      const subredditPromises = subreddits.map(async (subreddit) => {
        try {
          const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=15`;
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'NodeBench/1.0 (Research Feed Aggregator)'
            }
          });

          if (!response.ok) {
            console.warn(`Reddit ${subreddit} returned ${response.status}`);
            return [];
          }

          const data = await response.json();
          return data.data?.children || [];
        } catch (err) {
          console.warn(`Failed to fetch r/${subreddit}:`, err);
          return [];
        }
      });

      const allPosts = await Promise.all(subredditPromises);

      for (const posts of allPosts) {
        for (const post of posts) {
          totalChecked++;
          const p = post.data;

          if (!p || p.stickied || p.over_18) continue; // Skip stickied and NSFW

          const title = p.title || '';
          const selftext = p.selftext || '';

          // Relevance filter
          const isRelevant = /AI|ML|LLM|GPT|startup|funding|tech|data|cloud|API|model|neural|deep learning/i.test(title + selftext);

          if (isRelevant && p.score > 50) { // Only include posts with decent engagement
            // Determine type
            const isSignal = /funding|raise|series|valuation|\$\d+M|\$\d+B/i.test(title);
            const isDiscussion = p.num_comments > 100;

            // Determine subreddit-based tags
            const subredditTags: Record<string, string[]> = {
              'technology': ['Tech', 'News'],
              'MachineLearning': ['ML', 'Research'],
              'startups': ['Startup', 'Business'],
              'artificial': ['AI', 'Discussion']
            };

            const baseTags = subredditTags[p.subreddit] || ['Reddit'];

            feedItems.push({
              sourceId: `reddit-${p.id}`,
              type: isSignal ? "signal" : "news",
              title: title.slice(0, 200),
              summary: selftext ? selftext.slice(0, 250) + '...' : `Discussion on r/${p.subreddit} with ${p.num_comments} comments.`,
              url: p.url?.startsWith('https://www.reddit.com')
                ? p.url
                : `https://www.reddit.com${p.permalink}`,
              source: `r/${p.subreddit}`,
              tags: [...baseTags, ...(isDiscussion ? ['Hot'] : [])].slice(0, 4),
              metrics: [
                { label: "Upvotes", value: p.score.toString(), trend: p.score > 500 ? "up" as const : undefined },
                { label: "Comments", value: p.num_comments.toString() }
              ],
              publishedAt: new Date(p.created_utc * 1000).toISOString(),
              score: p.score
            });
          }
        }
      }

      // Save to DB
      if (feedItems.length > 0) {
        await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      }

      return { status: "success", ingested: feedItems.length, checked: totalChecked };
    } catch (error) {
      console.error("Error ingesting Reddit:", error);
      return { status: "error", message: String(error) };
    }
  }
});

// ============================================================================
// 6. ACTION: Fetch from RSS Feeds (Generic Parser)
// Supports TechCrunch, VentureBeat, Ars Technica, etc.
// ============================================================================
export const ingestRSS = action({
  args: {
    feedUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Default tech RSS feeds (free, no API key required)
      const defaultFeeds = [
        { url: 'https://techcrunch.com/feed/', source: 'TechCrunch', tags: ['Tech', 'Startups'] },
        { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', source: 'Ars Technica', tags: ['Tech', 'Deep Dive'] },
        { url: 'https://www.wired.com/feed/rss', source: 'Wired', tags: ['Tech', 'Culture'] },
      ];

      // Use provided feed or all defaults
      const feedsToProcess = args.feedUrl
        ? [{ url: args.feedUrl, source: new URL(args.feedUrl).hostname, tags: ['RSS'] }]
        : defaultFeeds;

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

      let totalChecked = 0;

      for (const feed of feedsToProcess) {
        try {
          const response = await fetch(feed.url, {
            headers: {
              'User-Agent': 'NodeBench/1.0 (Research Feed Aggregator)',
              'Accept': 'application/rss+xml, application/xml, text/xml'
            }
          });

          if (!response.ok) {
            console.warn(`RSS ${feed.source} returned ${response.status}`);
            continue;
          }

          const xmlText = await response.text();

          // Parse RSS items using regex (handles both RSS 2.0 and Atom)
          const itemRegex = /<item>([\s\S]*?)<\/item>/g;
          const titleRegex = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/;
          const descRegex = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/;
          const linkRegex = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/;
          const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/;
          const guidRegex = /<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/;

          let match;
          let itemCount = 0;

          while ((match = itemRegex.exec(xmlText)) !== null && itemCount < 10) {
            totalChecked++;
            itemCount++;

            const item = match[1];

            const titleMatch = titleRegex.exec(item);
            const descMatch = descRegex.exec(item);
            const linkMatch = linkRegex.exec(item);
            const pubDateMatch = pubDateRegex.exec(item);
            const guidMatch = guidRegex.exec(item);

            if (!titleMatch || !linkMatch) continue;

            const title = titleMatch[1].trim().replace(/<[^>]+>/g, '');
            const description = descMatch ? descMatch[1].trim().replace(/<[^>]+>/g, '').slice(0, 300) : '';
            const link = linkMatch[1].trim();
            const pubDate = pubDateMatch ? new Date(pubDateMatch[1].trim()).toISOString() : new Date().toISOString();
            const guid = guidMatch ? guidMatch[1].trim() : link;

            // Create unique sourceId from domain + guid hash
            const domain = new URL(link).hostname.replace('www.', '');
            const sourceId = `rss-${domain}-${guid.split('/').pop()?.slice(0, 20) || Date.now()}`;

            // Relevance filter
            const isRelevant = /AI|ML|startup|funding|tech|data|cloud|API|model|venture|investment|series|raise/i.test(title + description);

            if (isRelevant) {
              const isSignal = /funding|raise|series|valuation|\$\d+/i.test(title);

              feedItems.push({
                sourceId,
                type: isSignal ? "signal" : "news",
                title: title.slice(0, 200),
                summary: description || `Article from ${feed.source}`,
                url: link,
                source: feed.source,
                tags: feed.tags,
                metrics: [],
                publishedAt: pubDate,
                score: 30 + Math.floor(Math.random() * 40) // RSS doesn't have engagement metrics
              });
            }
          }
        } catch (feedError) {
          console.warn(`Failed to process feed ${feed.source}:`, feedError);
        }
      }

      // Save to DB
      if (feedItems.length > 0) {
        await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      }

      return { status: "success", ingested: feedItems.length, checked: totalChecked };
    } catch (error) {
      console.error("Error ingesting RSS:", error);
      return { status: "error", message: String(error) };
    }
  }
});

// ============================================================================
// 7. ACTION: Master Ingestor - Run All Sources
// Call this from a cron job to update the entire feed
// ============================================================================
export const ingestAll = action({
  args: {},
  handler: async (ctx) => {
    const results: Record<string, { status: string; ingested: number; checked: number }> = {
      hackerNews: { status: "pending", ingested: 0, checked: 0 },
      arxiv: { status: "pending", ingested: 0, checked: 0 },
      reddit: { status: "pending", ingested: 0, checked: 0 },
      rss: { status: "pending", ingested: 0, checked: 0 },
      github: { status: "pending", ingested: 0, checked: 0 },
      productHunt: { status: "pending", ingested: 0, checked: 0 },
      devTo: { status: "pending", ingested: 0, checked: 0 },
    };

    // Run all ingestors in parallel for speed
    const [hnResult, arxivResult, redditResult, rssResult, ghResult, phResult, devtoResult] = await Promise.allSettled([
      ctx.runAction(internal.feed.ingestHackerNewsInternal, {}),
      ctx.runAction(internal.feed.ingestArXivInternal, {}),
      ctx.runAction(internal.feed.ingestRedditInternal, {}),
      ctx.runAction(internal.feed.ingestRSSInternal, {}),
      ctx.runAction(internal.feed.ingestGitHubTrendingInternal, {}),
      ctx.runAction(internal.feed.ingestProductHuntInternal, {}),
      ctx.runAction(internal.feed.ingestDevToInternal, {}),
    ]);

    // Process results
    if (hnResult.status === 'fulfilled') results.hackerNews = hnResult.value as any;
    if (arxivResult.status === 'fulfilled') results.arxiv = arxivResult.value as any;
    if (redditResult.status === 'fulfilled') results.reddit = redditResult.value as any;
    if (rssResult.status === 'fulfilled') results.rss = rssResult.value as any;
    if (ghResult.status === 'fulfilled') results.github = ghResult.value as any;
    if (phResult.status === 'fulfilled') results.productHunt = phResult.value as any;
    if (devtoResult.status === 'fulfilled') results.devTo = devtoResult.value as any;

    const totalIngested = Object.values(results).reduce((sum, r) => sum + (r.ingested || 0), 0);

    return {
      status: "success",
      totalIngested,
      sources: results
    };
  }
});

// Internal versions for parallel execution from ingestAll
import { internalAction } from "./_generated/server";

export const ingestHackerNewsInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    // Same logic as ingestHackerNews but as internal action
    try {
      const topStoriesRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
      const topIds: number[] = (await topStoriesRes.json()).slice(0, 15);
      const feedItems: Array<any> = [];
      const storyPromises = topIds.map(async (id) => {
        const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return storyRes.json();
      });
      const stories = await Promise.all(storyPromises);
      for (const story of stories) {
        if (!story || !story.title) continue;
        const title = story.title || "";
        const isRelevant = /AI|LLM|GPT|Model|Infra|Data|SaaS|Funding|Startup|YC|Launch|API|Agent|Vector|RAG|Cloud/i.test(title);
        if (isRelevant) {
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
      if (feedItems.length > 0) {
        await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      }
      return { status: "success", ingested: feedItems.length, checked: stories.length };
    } catch (error) {
      return { status: "error", message: String(error), ingested: 0, checked: 0 };
    }
  }
});

export const ingestArXivInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    try {
      const categories = "cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL";
      const arxivUrl = `http://export.arxiv.org/api/query?search_query=${categories}&sortBy=submittedDate&sortOrder=descending&max_results=25`;
      const response = await fetch(arxivUrl);
      const xmlText = await response.text();
      const feedItems: Array<any> = [];
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      const titleRegex = /<title>([\s\S]*?)<\/title>/;
      const summaryRegex = /<summary>([\s\S]*?)<\/summary>/;
      const idRegex = /<id>([\s\S]*?)<\/id>/;
      const publishedRegex = /<published>([\s\S]*?)<\/published>/;
      let match;
      let checked = 0;
      while ((match = entryRegex.exec(xmlText)) !== null) {
        checked++;
        const entry = match[1];
        const titleMatch = titleRegex.exec(entry);
        const summaryMatch = summaryRegex.exec(entry);
        const idMatch = idRegex.exec(entry);
        const publishedMatch = publishedRegex.exec(entry);
        if (!titleMatch || !idMatch) continue;
        const title = titleMatch[1].trim().replace(/\s+/g, ' ');
        const summary = summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ').slice(0, 300) + '...' : '';
        const arxivId = idMatch[1].split('/').pop() || '';
        const published = publishedMatch ? publishedMatch[1] : new Date().toISOString();
        const isRelevant = /LLM|GPT|transformer|agent|RAG|retrieval|language model|reasoning|multimodal|vision|diffusion|embedding/i.test(title + summary);
        if (isRelevant) {
          feedItems.push({
            sourceId: `arxiv-${arxivId}`,
            type: "dossier",
            title: title,
            summary: summary,
            url: `https://arxiv.org/abs/${arxivId}`,
            source: "ArXiv",
            tags: ["Research", "AI", "ML"],
            metrics: [],
            publishedAt: published,
            score: 50 + Math.floor(Math.random() * 50)
          });
        }
      }
      if (feedItems.length > 0) {
        await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      }
      return { status: "success", ingested: feedItems.length, checked };
    } catch (error) {
      return { status: "error", message: String(error), ingested: 0, checked: 0 };
    }
  }
});

export const ingestRedditInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    try {
      const subreddits = ['technology', 'MachineLearning', 'startups'];
      const feedItems: Array<any> = [];
      let totalChecked = 0;
      for (const subreddit of subreddits) {
        try {
          const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`;
          const response = await fetch(url, { headers: { 'User-Agent': 'NodeBench/1.0' } });
          if (!response.ok) continue;
          const data = await response.json();
          const posts = data.data?.children || [];
          for (const post of posts) {
            totalChecked++;
            const p = post.data;
            if (!p || p.stickied || p.over_18) continue;
            const title = p.title || '';
            const isRelevant = /AI|ML|LLM|GPT|startup|funding|tech/i.test(title);
            if (isRelevant && p.score > 50) {
              const isSignal = /funding|raise|series|\$\d+/i.test(title);
              feedItems.push({
                sourceId: `reddit-${p.id}`,
                type: isSignal ? "signal" : "news",
                title: title.slice(0, 200),
                summary: `Discussion on r/${p.subreddit} with ${p.num_comments} comments.`,
                url: `https://www.reddit.com${p.permalink}`,
                source: `r/${p.subreddit}`,
                tags: ['Reddit', p.subreddit],
                metrics: [
                  { label: "Upvotes", value: p.score.toString(), trend: p.score > 500 ? "up" as const : undefined },
                  { label: "Comments", value: p.num_comments.toString() }
                ],
                publishedAt: new Date(p.created_utc * 1000).toISOString(),
                score: p.score
              });
            }
          }
        } catch {}
      }
      if (feedItems.length > 0) {
        await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      }
      return { status: "success", ingested: feedItems.length, checked: totalChecked };
    } catch (error) {
      return { status: "error", message: String(error), ingested: 0, checked: 0 };
    }
  }
});

export const ingestRSSInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    try {
      const feeds = [
        { url: 'https://techcrunch.com/feed/', source: 'TechCrunch', tags: ['Tech', 'Startups'] },
      ];
      const feedItems: Array<any> = [];
      let totalChecked = 0;
      for (const feed of feeds) {
        try {
          const response = await fetch(feed.url, { headers: { 'User-Agent': 'NodeBench/1.0' } });
          if (!response.ok) continue;
          const xmlText = await response.text();
          const itemRegex = /<item>([\s\S]*?)<\/item>/g;
          const titleRegex = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/;
          const linkRegex = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/;
          const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/;
          let match;
          let itemCount = 0;
          while ((match = itemRegex.exec(xmlText)) !== null && itemCount < 5) {
            totalChecked++;
            itemCount++;
            const item = match[1];
            const titleMatch = titleRegex.exec(item);
            const linkMatch = linkRegex.exec(item);
            const pubDateMatch = pubDateRegex.exec(item);
            if (!titleMatch || !linkMatch) continue;
            const title = titleMatch[1].trim().replace(/<[^>]+>/g, '');
            const link = linkMatch[1].trim();
            const pubDate = pubDateMatch ? new Date(pubDateMatch[1].trim()).toISOString() : new Date().toISOString();
            const isRelevant = /AI|startup|funding|tech/i.test(title);
            if (isRelevant) {
              feedItems.push({
                sourceId: `rss-techcrunch-${Date.now()}-${itemCount}`,
                type: "news",
                title: title.slice(0, 200),
                summary: `Article from ${feed.source}`,
                url: link,
                source: feed.source,
                tags: feed.tags,
                metrics: [],
                publishedAt: pubDate,
                score: 30 + Math.floor(Math.random() * 40)
              });
            }
          }
        } catch {}
      }
      if (feedItems.length > 0) {
        await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      }
      return { status: "success", ingested: feedItems.length, checked: totalChecked };
    } catch (error) {
      return { status: "error", message: String(error), ingested: 0, checked: 0 };
    }
  }
});

// ============================================================================
// 8. ACTION: Fetch GitHub Trending Repos (via GitHub Search API)
// ============================================================================
export const ingestGitHubTrending = action({
  args: {},
  handler: async (ctx) => {
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const url = `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=20`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'NodeBench/1.0' }
      });

      if (!response.ok) return { status: "error", message: `GitHub API ${response.status}` };

      const data = await response.json();
      const feedItems: Array<any> = [];

      for (const repo of (data.items || [])) {
        if (repo.stargazers_count < 50) continue;
        const isAI = /ai|ml|llm|gpt|model|neural|transformer|agent|rag/i.test(
          `${repo.name} ${repo.description || ''} ${repo.topics?.join(' ') || ''}`
        );
        feedItems.push({
          sourceId: `github-${repo.id}`,
          type: "repo" as const,
          category: isAI ? "ai_ml" as const : "opensource" as const,
          title: repo.full_name,
          summary: repo.description || `A ${repo.language || 'multi-language'} repository trending on GitHub.`,
          url: repo.html_url,
          source: "GitHub",
          tags: ["Trending", repo.language || "Code"].filter(Boolean),
          metrics: [
            { label: "Stars", value: repo.stargazers_count.toLocaleString(), trend: "up" as const },
            { label: "Forks", value: repo.forks_count.toLocaleString() }
          ],
          publishedAt: repo.created_at,
          score: repo.stargazers_count
        });
      }

      if (feedItems.length > 0) await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      return { status: "success", ingested: feedItems.length, checked: data.items?.length || 0 };
    } catch (error) {
      return { status: "error", message: String(error) };
    }
  }
});

// ============================================================================
// 9. ACTION: Fetch Product Hunt Top Products (RSS Feed)
// ============================================================================
export const ingestProductHunt = action({
  args: {},
  handler: async (ctx) => {
    try {
      const response = await fetch('https://www.producthunt.com/feed', {
        headers: { 'User-Agent': 'NodeBench/1.0', 'Accept': 'application/rss+xml, text/xml' }
      });
      if (!response.ok) return { status: "error", message: `HTTP ${response.status}` };

      const xmlText = await response.text();
      const feedItems: Array<any> = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      const titleRegex = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/;
      const linkRegex = /<link>([\s\S]*?)<\/link>/;
      const descRegex = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/;

      let match, count = 0;
      while ((match = itemRegex.exec(xmlText)) !== null && count < 15) {
        count++;
        const titleMatch = titleRegex.exec(match[1]);
        const linkMatch = linkRegex.exec(match[1]);
        const descMatch = descRegex.exec(match[1]);
        if (!titleMatch || !linkMatch) continue;

        const title = titleMatch[1].trim().replace(/<[^>]+>/g, '');
        const desc = descMatch ? descMatch[1].trim().replace(/<[^>]+>/g, '').slice(0, 250) : '';

        feedItems.push({
          sourceId: `ph-${linkMatch[1].split('/').pop() || Date.now()}-${count}`,
          type: "product" as const,
          category: "products" as const,
          title: title.slice(0, 200),
          summary: desc || `New product featured on Product Hunt.`,
          url: linkMatch[1].trim(),
          source: "ProductHunt",
          tags: ["Product Launch"],
          metrics: [],
          publishedAt: new Date().toISOString(),
          score: 50 + Math.floor(Math.random() * 50)
        });
      }

      if (feedItems.length > 0) await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      return { status: "success", ingested: feedItems.length, checked: count };
    } catch (error) {
      return { status: "error", message: String(error) };
    }
  }
});

// ============================================================================
// 10. ACTION: Fetch Dev.to Top Articles (Free JSON API)
// ============================================================================
export const ingestDevTo = action({
  args: {},
  handler: async (ctx) => {
    try {
      const response = await fetch('https://dev.to/api/articles?per_page=15&top=7', {
        headers: { 'User-Agent': 'NodeBench/1.0', 'Accept': 'application/json' }
      });
      if (!response.ok) return { status: "error", message: `HTTP ${response.status}` };

      const articles = await response.json();
      const feedItems: Array<any> = [];

      for (const article of articles) {
        const isRelevant = /ai|ml|llm|typescript|react|python|rust|devops|cloud|api/i.test(
          `${article.title} ${article.tags || ''}`
        );
        if (!isRelevant) continue;
        const isAI = /ai|ml|llm|gpt|model|neural/i.test(article.title);

        feedItems.push({
          sourceId: `devto-${article.id}`,
          type: "news" as const,
          category: isAI ? "ai_ml" as const : "tech" as const,
          title: article.title,
          summary: article.description || `Article by ${article.user?.name || 'developer'} on Dev.to`,
          url: article.url,
          source: "Dev.to",
          tags: (article.tag_list || []).slice(0, 3),
          metrics: [
            { label: "Reactions", value: (article.public_reactions_count || 0).toString(), trend: "up" as const }
          ],
          publishedAt: article.published_at,
          score: article.public_reactions_count || 0
        });
      }

      if (feedItems.length > 0) await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      return { status: "success", ingested: feedItems.length, checked: articles.length };
    } catch (error) {
      return { status: "error", message: String(error) };
    }
  }
});

// Internal versions for parallel execution from ingestAll
export const ingestGitHubTrendingInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const response = await fetch(
        `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=15`,
        { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'NodeBench/1.0' } }
      );
      if (!response.ok) return { status: "error", ingested: 0, checked: 0 };
      const data = await response.json();
      const feedItems: Array<any> = [];
      for (const repo of (data.items || []).slice(0, 15)) {
        if (repo.stargazers_count < 100) continue;
        const isAI = /ai|ml|llm|gpt|model|neural/i.test(`${repo.name} ${repo.description || ''}`);
        feedItems.push({
          sourceId: `github-${repo.id}`, type: "repo", category: isAI ? "ai_ml" : "opensource",
          title: repo.full_name, summary: repo.description || `Trending ${repo.language || ''} repo.`,
          url: repo.html_url, source: "GitHub", tags: ["Trending", repo.language].filter(Boolean),
          metrics: [{ label: "Stars", value: repo.stargazers_count.toLocaleString(), trend: "up" as const }],
          publishedAt: repo.created_at, score: repo.stargazers_count
        });
      }
      if (feedItems.length > 0) await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      return { status: "success", ingested: feedItems.length, checked: data.items?.length || 0 };
    } catch { return { status: "error", ingested: 0, checked: 0 }; }
  }
});

export const ingestProductHuntInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    try {
      const response = await fetch('https://www.producthunt.com/feed', { headers: { 'User-Agent': 'NodeBench/1.0' } });
      if (!response.ok) return { status: "error", ingested: 0, checked: 0 };
      const xmlText = await response.text();
      const feedItems: Array<any> = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      const titleRegex = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/;
      const linkRegex = /<link>([\s\S]*?)<\/link>/;
      let match, count = 0;
      while ((match = itemRegex.exec(xmlText)) !== null && count < 10) {
        count++;
        const titleMatch = titleRegex.exec(match[1]);
        const linkMatch = linkRegex.exec(match[1]);
        if (!titleMatch || !linkMatch) continue;
        feedItems.push({
          sourceId: `ph-${Date.now()}-${count}`, type: "product", category: "products",
          title: titleMatch[1].trim().replace(/<[^>]+>/g, '').slice(0, 200),
          summary: `New product on Product Hunt.`, url: linkMatch[1].trim(),
          source: "ProductHunt", tags: ["Product Launch"], metrics: [],
          publishedAt: new Date().toISOString(), score: 50 + Math.floor(Math.random() * 50)
        });
      }
      if (feedItems.length > 0) await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      return { status: "success", ingested: feedItems.length, checked: count };
    } catch { return { status: "error", ingested: 0, checked: 0 }; }
  }
});

export const ingestDevToInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    try {
      const response = await fetch('https://dev.to/api/articles?per_page=10&top=7', { headers: { 'User-Agent': 'NodeBench/1.0' } });
      if (!response.ok) return { status: "error", ingested: 0, checked: 0 };
      const articles = await response.json();
      const feedItems: Array<any> = [];
      for (const article of articles) {
        const isAI = /ai|ml|llm|gpt/i.test(article.title);
        feedItems.push({
          sourceId: `devto-${article.id}`, type: "news", category: isAI ? "ai_ml" : "tech",
          title: article.title, summary: article.description || `Dev.to article`,
          url: article.url, source: "Dev.to", tags: (article.tag_list || []).slice(0, 3),
          metrics: [{ label: "Reactions", value: String(article.public_reactions_count || 0) }],
          publishedAt: article.published_at, score: article.public_reactions_count || 0
        });
      }
      if (feedItems.length > 0) await ctx.runMutation(internal.feed.saveItems, { items: feedItems });
      return { status: "success", ingested: feedItems.length, checked: articles.length };
    } catch { return { status: "error", ingested: 0, checked: 0 }; }
  }
});

