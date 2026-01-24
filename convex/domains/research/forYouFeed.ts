/**
 * For You Feed - Phoenix ML Ranking with X Algorithm Patterns
 * Phase 2 Implementation
 *
 * Provides personalized content discovery using:
 * - Candidate Sourcing (Thunder pattern): In-network, out-of-network, trending
 * - Phoenix ML Ranking: Grok-powered relevance scoring
 * - Home Mixer: 50/50 in-network/out-of-network orchestration
 * - Engagement Tracking: Multi-action prediction
 */

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Doc } from "../../_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type CandidateSource = "in_network" | "out_of_network" | "trending";
export type ItemType = "document" | "agent" | "repository" | "update" | "feed_item";

export interface FeedCandidate {
  itemId: string;
  itemType: ItemType;
  source: CandidateSource;
  title: string;
  snippet: string;
  metadata: Record<string, any>;
  timestamp: number;
  dateString?: string; // YYYY-MM-DD for grouping
}

export interface RankedCandidate extends FeedCandidate {
  phoenixScore: number; // 0-100
  relevanceReason: string;
  engagementPrediction: {
    view: number; // 0-1 probability
    click: number;
    save: number;
    share: number;
  };
}

export interface DateGroup {
  dateString: string;
  displayLabel: string; // "Today", "Yesterday", "Jan 20", etc.
  items: RankedCandidate[];
}

export interface ForYouFeedResult {
  items: RankedCandidate[];
  dateGroups: DateGroup[]; // Items grouped by date for UI
  totalCandidates: number;
  mixRatio: {
    inNetwork: number;
    outOfNetwork: number;
    trending: number;
  };
  generatedAt: number;
}

/**
 * Helper to format date for display
 */
function formatDateLabel(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) {
    return "Today";
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Group items by date
 */
function groupByDate(items: RankedCandidate[]): DateGroup[] {
  const groups = new Map<string, RankedCandidate[]>();

  for (const item of items) {
    const dateStr = item.dateString || getDateString(item.timestamp);
    if (!groups.has(dateStr)) {
      groups.set(dateStr, []);
    }
    groups.get(dateStr)!.push(item);
  }

  // Sort dates descending (most recent first)
  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  return sortedDates.map(dateStr => ({
    dateString: dateStr,
    displayLabel: formatDateLabel(dateStr),
    items: groups.get(dateStr)!,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const FEED_CONFIG = {
  /** Default feed size */
  defaultFeedSize: 20,

  /** Candidate pool size (before ranking) */
  candidatePoolSize: 100,

  /** Target mix ratio (X algorithm 50/50 pattern) */
  targetMixRatio: {
    inNetwork: 0.5, // 50% from people you follow
    outOfNetwork: 0.4, // 40% discovery
    trending: 0.1, // 10% trending across platform
  },

  /** Phoenix ML ranking weights */
  phoenixWeights: {
    recency: 0.2, // How recent is the content
    relevance: 0.4, // Semantic similarity to user interests
    engagement: 0.25, // Predicted engagement likelihood
    diversity: 0.15, // Avoid filter bubbles
  },

  /** Use free Grok models via OpenRouter for cost efficiency */
  useFreegrokModels: true,

  /** Refresh interval for feed regeneration (5 minutes) */
  feedRefreshMs: 5 * 60 * 1000,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: CANDIDATE SOURCING (Thunder Pattern)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get in-network candidates (content from people/agents you follow)
 */
export const getInNetworkCandidates = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.number(),
  },
  handler: async (ctx, { userId, limit }): Promise<FeedCandidate[]> => {
    const candidates: FeedCandidate[] = [];

    // TODO: Get user's followed agents/people
    // For now, return recent documents as proxy
    const recentDocs = await ctx.db
      .query("documents")
      .withIndex("by_creation_time")
      .order("desc")
      .take(limit);

    for (const doc of recentDocs) {
      candidates.push({
        itemId: doc._id,
        itemType: "document",
        source: "in_network",
        title: doc.title || "Untitled",
        snippet: doc.summary?.substring(0, 200) || "",
        metadata: {
          authorId: doc.userId,
          createdAt: doc._creationTime,
        },
        timestamp: doc._creationTime,
        dateString: getDateString(doc._creationTime),
      });
    }

    return candidates;
  },
});

/**
 * Helper to get date string from timestamp
 */
function getDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0];
}

/**
 * Get out-of-network candidates (discovery from the wider platform)
 */
export const getOutOfNetworkCandidates = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.number(),
  },
  handler: async (ctx, { userId, limit }): Promise<FeedCandidate[]> => {
    const candidates: FeedCandidate[] = [];

    // Get recent industry updates
    const updates = await ctx.db
      .query("industryUpdates")
      .withIndex("by_scanned_at")
      .order("desc")
      .take(Math.floor(limit / 4));

    for (const update of updates) {
      candidates.push({
        itemId: update._id,
        itemType: "update",
        source: "out_of_network",
        title: update.title,
        snippet: update.summary?.substring(0, 200) || "",
        metadata: {
          provider: update.provider,
          relevance: update.relevance,
          url: update.url,
        },
        timestamp: update.scannedAt,
        dateString: getDateString(update.scannedAt),
      });
    }

    // Get feed items from external sources
    const feedItems = await ctx.db
      .query("feedItems")
      .withIndex("by_creation_time")
      .order("desc")
      .take(Math.floor(limit / 4));

    for (const item of feedItems) {
      const ts = item.createdAt || item._creationTime;
      candidates.push({
        itemId: item._id,
        itemType: "feed_item",
        source: "out_of_network",
        title: item.title || "Untitled",
        snippet: item.summary?.substring(0, 200) || "",
        metadata: {
          source: item.source,
          url: item.url,
          score: item.score,
        },
        timestamp: ts,
        dateString: getDateString(ts),
      });
    }

    // Include landing page signals (daily brief published content)
    const landingSignals = await ctx.db
      .query("landingPageLog")
      .withIndex("by_createdAt")
      .order("desc")
      .take(Math.floor(limit / 4));

    for (const signal of landingSignals) {
      candidates.push({
        itemId: signal._id,
        itemType: "update",
        source: "out_of_network",
        title: signal.title,
        snippet: signal.markdown?.substring(0, 200) || "",
        metadata: {
          kind: signal.kind,
          source: signal.source || "Daily Brief",
          url: signal.url,
          tags: signal.tags,
          day: signal.day,
        },
        timestamp: signal.createdAt,
        dateString: signal.day || getDateString(signal.createdAt),
      });
    }

    // NEW: Include LinkedIn funding posts
    const linkedinPosts = await ctx.db
      .query("linkedinFundingPosts")
      .withIndex("by_postedAt")
      .order("desc")
      .take(Math.floor(limit / 4));

    for (const post of linkedinPosts) {
      candidates.push({
        itemId: post._id,
        itemType: "update",
        source: "out_of_network",
        title: `${post.companyName} raised ${post.amountRaw} (${post.roundType})`,
        snippet: post.contentSummary?.substring(0, 200) || `Funding announcement: ${post.companyName}`,
        metadata: {
          kind: "linkedin_funding",
          source: "LinkedIn",
          url: post.postUrl,
          sector: post.sector,
          roundType: post.roundType,
          amount: post.amountRaw,
          companyName: post.companyName,
        },
        timestamp: post.postedAt,
        dateString: getDateString(post.postedAt),
      });
    }

    return candidates;
  },
});

/**
 * Get trending candidates (hot content across the platform)
 */
export const getTrendingCandidates = internalQuery({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, { limit }): Promise<FeedCandidate[]> => {
    const candidates: FeedCandidate[] = [];

    // Get high-relevance industry updates
    const trending = await ctx.db
      .query("industryUpdates")
      .withIndex("by_relevance")
      .order("desc")
      .filter((q) => q.gte(q.field("relevance"), 80))
      .take(Math.floor(limit / 4));

    for (const item of trending) {
      candidates.push({
        itemId: item._id,
        itemType: "update",
        source: "trending",
        title: item.title,
        snippet: item.summary?.substring(0, 200) || "",
        metadata: {
          provider: item.provider,
          relevance: item.relevance,
          url: item.url,
        },
        timestamp: item.scannedAt,
        dateString: getDateString(item.scannedAt),
      });
    }

    // Get recent high-scoring feed items (TechCrunch, etc.)
    const feedItems = await ctx.db
      .query("feedItems")
      .withIndex("by_creation_time")
      .order("desc")
      .take(Math.floor(limit / 4));

    for (const item of feedItems) {
      const ts = item.createdAt || item._creationTime;
      candidates.push({
        itemId: item._id,
        itemType: "feed_item",
        source: "trending",
        title: item.title || "Untitled",
        snippet: item.summary?.substring(0, 200) || "",
        metadata: {
          source: item.source,
          url: item.url,
          score: item.score,
        },
        timestamp: ts,
        dateString: getDateString(ts),
      });
    }

    // Include daily brief memories (last 7 days for historical context)
    const dailyBriefMemories = await ctx.db
      .query("dailyBriefMemories")
      .order("desc")
      .take(7);

    for (const memory of dailyBriefMemories) {
      if (memory.features) {
        for (const feature of memory.features.slice(0, 3)) {
          // Only include passing or high-priority features
          if (feature.status === "passing" || (feature.priority && feature.priority >= 7)) {
            candidates.push({
              itemId: `brief-${memory._id}-${feature.id}`,
              itemType: "update",
              source: "trending",
              title: feature.name,
              snippet: feature.testCriteria?.substring(0, 200) || feature.notes || "",
              metadata: {
                kind: "daily_brief",
                type: feature.type,
                status: feature.status,
                priority: feature.priority,
                goal: memory.goal,
              },
              timestamp: feature.updatedAt || memory.generatedAt,
              dateString: memory.dateString,
            });
          }
        }
      }
    }

    // Include daily brief snapshots (dashboard summaries)
    const snapshots = await ctx.db
      .query("dailyBriefSnapshots")
      .withIndex("by_generated_at")
      .order("desc")
      .take(7);

    for (const snapshot of snapshots) {
      if (snapshot.sourceSummary?.topTrending) {
        candidates.push({
          itemId: `snapshot-${snapshot._id}`,
          itemType: "update",
          source: "trending",
          title: `Daily Brief: ${snapshot.dateString}`,
          snippet: `Top trends: ${snapshot.sourceSummary.topTrending.slice(0, 3).join(", ")}`,
          metadata: {
            kind: "daily_snapshot",
            totalItems: snapshot.sourceSummary.totalItems,
            bySource: snapshot.sourceSummary.bySource,
          },
          timestamp: snapshot.generatedAt,
          dateString: snapshot.dateString,
        });
      }
    }

    // Boost items with high engagement (feedback loop)
    const recentEngagements = await ctx.db
      .query("feedEngagements")
      .order("desc")
      .take(100);

    // Count engagements per item
    const engagementCounts = new Map<string, number>();
    for (const engagement of recentEngagements) {
      const count = engagementCounts.get(engagement.itemId) || 0;
      // Weight by action type: share > save > click > view
      const weight = engagement.action === "share" ? 4 :
                     engagement.action === "save" ? 3 :
                     engagement.action === "click" ? 2 : 1;
      engagementCounts.set(engagement.itemId, count + weight);
    }

    // Add engagement boost to metadata of existing candidates
    for (const candidate of candidates) {
      const boost = engagementCounts.get(candidate.itemId as string) || 0;
      if (boost > 0) {
        candidate.metadata = {
          ...candidate.metadata,
          engagementBoost: boost,
        };
      }
    }

    return candidates;
  },
});

/**
 * Aggregate all candidates from different sources
 */
export const getCandidates = internalAction({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }): Promise<FeedCandidate[]> => {
    const poolSize = FEED_CONFIG.candidatePoolSize;

    // Calculate source-specific limits based on target ratio
    const inNetworkLimit = Math.floor(poolSize * FEED_CONFIG.targetMixRatio.inNetwork);
    const outOfNetworkLimit = Math.floor(poolSize * FEED_CONFIG.targetMixRatio.outOfNetwork);
    const trendingLimit = Math.floor(poolSize * FEED_CONFIG.targetMixRatio.trending);

    // Fetch candidates in parallel
    const [inNetwork, outOfNetwork, trending] = await Promise.all([
      ctx.runQuery(internal.domains.research.forYouFeed.getInNetworkCandidates, {
        userId,
        limit: inNetworkLimit,
      }),
      ctx.runQuery(internal.domains.research.forYouFeed.getOutOfNetworkCandidates, {
        userId,
        limit: outOfNetworkLimit,
      }),
      ctx.runQuery(internal.domains.research.forYouFeed.getTrendingCandidates, {
        limit: trendingLimit,
      }),
    ]);

    return [...inNetwork, ...outOfNetwork, ...trending];
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: PHOENIX ML RANKING (Grok-Powered)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rank candidates using Phoenix ML with Grok model
 * Predicts relevance and engagement likelihood
 */
export const rankWithPhoenix = internalAction({
  args: {
    userId: v.id("users"),
    candidates: v.array(v.any()),
  },
  handler: async (ctx, { userId, candidates }): Promise<RankedCandidate[]> => {
    // Get user profile for personalization
    const user = await ctx.runQuery(internal.domains.auth.auth.getUserById, { userId });
    if (!user) {
      throw new Error("User not found");
    }

    // Use free Grok model via autonomous resolver
    const model = await ctx.runQuery(
      internal.domains.models.autonomousModelResolver.selectModelForTask,
      {
        taskType: "research",
        requireToolUse: false,
      }
    );

    // Build ranking prompt (Phoenix ML pattern)
    const prompt = `You are Phoenix ML, an advanced ranking system from X's For You algorithm.

User Context:
- User ID: ${userId}
- Interests: ${user.preferences?.interests?.join(", ") || "general tech"}

Candidates to rank (${candidates.length} items):
${candidates.map((c: FeedCandidate, idx: number) => `
${idx + 1}. [${c.source}] ${c.title}
   Type: ${c.itemType}
   Snippet: ${c.snippet}
   Age: ${Math.round((Date.now() - c.timestamp) / (1000 * 60 * 60))} hours old
`).join("\n")}

Task: Rank these candidates by predicted user engagement using multi-action prediction.

For each candidate, provide:
1. Relevance score (0-100): How relevant to user interests
2. Engagement prediction (0-1 each): {view, click, save, share}
3. Brief reason (10-15 words): Why this matters to the user

Return JSON array ordered by combined score (use weights: relevance 40%, engagement 60%):
[
  {
    "idx": 1,
    "phoenixScore": 95,
    "relevanceReason": "...",
    "engagement": {"view": 0.9, "click": 0.8, "save": 0.5, "share": 0.3}
  },
  ...
]`;

    try {
      const response = await ctx.runAction(
        internal.domains.models.autonomousModelResolver.executeWithFallback,
        {
          taskType: "research",
          messages: [
            { role: "system", content: "You are Phoenix ML, X's ranking algorithm." },
            { role: "user", content: prompt },
          ],
          maxTokens: 2000,
          temperature: 0.3,
        }
      );

      // Parse rankings
      const rankings = JSON.parse(response.content) as Array<{
        idx: number;
        phoenixScore: number;
        relevanceReason: string;
        engagement: {
          view: number;
          click: number;
          save: number;
          share: number;
        };
      }>;

      // Map back to candidates
      const ranked: RankedCandidate[] = rankings.map((r) => {
        const candidate = candidates[r.idx - 1] as FeedCandidate;
        return {
          ...candidate,
          phoenixScore: r.phoenixScore,
          relevanceReason: r.relevanceReason,
          engagementPrediction: r.engagement,
        };
      });

      return ranked;
    } catch (error) {
      console.error("[forYouFeed] Phoenix ranking failed:", error);
      // Fallback: simple recency-based ranking
      return candidates.map((c: FeedCandidate) => ({
        ...c,
        phoenixScore: 50,
        relevanceReason: "Fallback ranking (ranking service unavailable)",
        engagementPrediction: {
          view: 0.5,
          click: 0.3,
          save: 0.1,
          share: 0.05,
        },
      }));
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: HOME MIXER ORCHESTRATION (50/50 Mix)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mix ranked candidates to achieve target ratio
 * Implements X's Home Mixer pattern
 */
export const mixFeed = internalAction({
  args: {
    ranked: v.array(v.any()),
    targetSize: v.number(),
  },
  handler: async (ctx, { ranked, targetSize }): Promise<RankedCandidate[]> => {
    // Separate by source
    const bySource = {
      in_network: ranked.filter((c: RankedCandidate) => c.source === "in_network"),
      out_of_network: ranked.filter((c: RankedCandidate) => c.source === "out_of_network"),
      trending: ranked.filter((c: RankedCandidate) => c.source === "trending"),
    };

    // Calculate target counts
    const targets = {
      in_network: Math.floor(targetSize * FEED_CONFIG.targetMixRatio.inNetwork),
      out_of_network: Math.floor(targetSize * FEED_CONFIG.targetMixRatio.outOfNetwork),
      trending: Math.floor(targetSize * FEED_CONFIG.targetMixRatio.trending),
    };

    // Select top items from each source
    const mixed: RankedCandidate[] = [];

    // Add in-network items
    mixed.push(...bySource.in_network.slice(0, targets.in_network));

    // Add out-of-network items
    mixed.push(...bySource.out_of_network.slice(0, targets.out_of_network));

    // Add trending items
    mixed.push(...bySource.trending.slice(0, targets.trending));

    // Interleave to avoid source clustering (X's mixing strategy)
    const interleaved: RankedCandidate[] = [];
    const maxLength = Math.max(
      mixed.filter((c) => c.source === "in_network").length,
      mixed.filter((c) => c.source === "out_of_network").length,
      mixed.filter((c) => c.source === "trending").length
    );

    for (let i = 0; i < maxLength; i++) {
      const inNetworkItem = bySource.in_network[i];
      const outOfNetworkItem = bySource.out_of_network[i];
      const trendingItem = bySource.trending[i];

      if (inNetworkItem) interleaved.push(inNetworkItem);
      if (outOfNetworkItem) interleaved.push(outOfNetworkItem);
      if (trendingItem) interleaved.push(trendingItem);
    }

    return interleaved.slice(0, targetSize);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FEED GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate personalized For You feed
 * Complete X algorithm pipeline: Thunder → Phoenix → Home Mixer
 */
export const generateForYouFeed = internalAction({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = FEED_CONFIG.defaultFeedSize }): Promise<ForYouFeedResult> => {
    console.log(`[forYouFeed] Generating feed for user ${userId}`);

    // STEP 1: Candidate Sourcing (Thunder)
    const candidates = await ctx.runAction(
      internal.domains.research.forYouFeed.getCandidates,
      { userId }
    );

    console.log(`[forYouFeed] Sourced ${candidates.length} candidates`);

    // STEP 2: Phoenix ML Ranking
    const ranked = await ctx.runAction(
      internal.domains.research.forYouFeed.rankWithPhoenix,
      { userId, candidates }
    );

    console.log(`[forYouFeed] Ranked ${ranked.length} candidates`);

    // STEP 3: Home Mixer Orchestration
    const mixed = await ctx.runAction(
      internal.domains.research.forYouFeed.mixFeed,
      { ranked, targetSize: limit }
    );

    console.log(`[forYouFeed] Mixed to ${mixed.length} items`);

    // Calculate actual mix ratio
    const sourceCount = {
      in_network: mixed.filter((c) => c.source === "in_network").length,
      out_of_network: mixed.filter((c) => c.source === "out_of_network").length,
      trending: mixed.filter((c) => c.source === "trending").length,
    };

    const total = mixed.length;
    const mixRatio = {
      inNetwork: sourceCount.in_network / total,
      outOfNetwork: sourceCount.out_of_network / total,
      trending: sourceCount.trending / total,
    };

    // Group items by date
    const dateGroups = groupByDate(mixed);

    // Store feed for caching
    await ctx.runMutation(internal.domains.research.forYouFeed.saveFeedSnapshot, {
      userId,
      items: mixed,
      dateGroups,
      mixRatio,
    });

    return {
      items: mixed,
      dateGroups,
      totalCandidates: candidates.length,
      mixRatio,
      generatedAt: Date.now(),
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get For You feed (public query)
 */
export const getForYouFeed = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 20 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        items: [],
        dateGroups: [],
        totalCandidates: 0,
        mixRatio: { inNetwork: 0, outOfNetwork: 0, trending: 0 },
        generatedAt: Date.now(),
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return {
        items: [],
        dateGroups: [],
        totalCandidates: 0,
        mixRatio: { inNetwork: 0, outOfNetwork: 0, trending: 0 },
        generatedAt: Date.now(),
      };
    }

    // Check for cached feed
    const cached = await ctx.db
      .query("forYouFeedSnapshots")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    const now = Date.now();
    const needsRefresh =
      !cached || now - cached.generatedAt > FEED_CONFIG.feedRefreshMs;

    if (needsRefresh) {
      // Trigger async feed generation
      ctx.scheduler.runAfter(0, internal.domains.research.forYouFeed.generateForYouFeed, {
        userId: user._id,
        limit,
      });
    }

    // Return cached feed (or empty if no cache yet)
    // If no dateGroups cached, compute them from items
    const items = cached?.items || [];
    const dateGroups = cached?.dateGroups || groupByDate(items as RankedCandidate[]);

    return {
      items,
      dateGroups,
      totalCandidates: cached?.totalCandidates || 0,
      mixRatio: cached?.mixRatio || { inNetwork: 0, outOfNetwork: 0, trending: 0 },
      generatedAt: cached?.generatedAt || now,
    };
  },
});

/**
 * Get public For You feed (no auth required)
 * Returns trending and out-of-network content for anonymous users
 */
export const getPublicForYouFeed = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50 }) => {
    // Get trending candidates directly (no user context needed)
    const trending = await ctx.runQuery(
      internal.domains.research.forYouFeed.getTrendingCandidates,
      { limit: Math.floor(limit / 2) }
    );

    // Get a sample user to fetch out-of-network (or just use trending if no users)
    const sampleUser = await ctx.db.query("users").first();
    let outOfNetwork: FeedCandidate[] = [];

    if (sampleUser) {
      outOfNetwork = await ctx.runQuery(
        internal.domains.research.forYouFeed.getOutOfNetworkCandidates,
        { userId: sampleUser._id, limit: Math.floor(limit / 2) }
      );
    }

    // Combine and dedupe by itemId
    const seen = new Set<string>();
    const combined: FeedCandidate[] = [];

    for (const item of [...trending, ...outOfNetwork]) {
      const id = typeof item.itemId === 'string' ? item.itemId : String(item.itemId);
      if (!seen.has(id)) {
        seen.add(id);
        combined.push(item);
      }
    }

    // Sort by timestamp (most recent first) and limit
    const sorted = combined
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    // Add default ranking properties for UI compatibility
    const withDefaults = sorted.map(item => ({
      ...item,
      phoenixScore: 50,
      relevanceReason: "Public feed item",
      engagementPrediction: { view: 0.5, click: 0.3, save: 0.1, share: 0.05 },
    })) as RankedCandidate[];

    // Group by date
    const dateGroups = groupByDate(withDefaults);

    // Calculate mix ratio
    const sourceCount = {
      in_network: 0,
      out_of_network: sorted.filter((c) => c.source === "out_of_network").length,
      trending: sorted.filter((c) => c.source === "trending").length,
    };

    const total = sorted.length || 1;
    const mixRatio = {
      inNetwork: 0,
      outOfNetwork: sourceCount.out_of_network / total,
      trending: sourceCount.trending / total,
    };

    return {
      items: withDefaults,
      dateGroups,
      totalCandidates: combined.length,
      mixRatio,
      generatedAt: Date.now(),
      isPublic: true,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save feed snapshot for caching
 */
export const saveFeedSnapshot = internalMutation({
  args: {
    userId: v.id("users"),
    items: v.array(v.any()),
    dateGroups: v.array(v.any()),
    mixRatio: v.object({
      inNetwork: v.number(),
      outOfNetwork: v.number(),
      trending: v.number(),
    }),
  },
  handler: async (ctx, { userId, items, dateGroups, mixRatio }) => {
    await ctx.db.insert("forYouFeedSnapshots", {
      userId,
      items,
      dateGroups,
      mixRatio,
      totalCandidates: items.length,
      generatedAt: Date.now(),
    });
  },
});

/**
 * Record engagement event
 */
export const recordEngagement = mutation({
  args: {
    itemId: v.string(),
    action: v.union(
      v.literal("view"),
      v.literal("click"),
      v.literal("save"),
      v.literal("share")
    ),
  },
  handler: async (ctx, { itemId, action }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.insert("feedEngagements", {
      userId: user._id,
      itemId,
      action,
      timestamp: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST QUERIES (for debugging without auth)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test query to verify candidate sourcing works (no auth required)
 */
export const testCandidateSourcing = query({
  args: {},
  handler: async (ctx) => {
    const trending = await ctx.runQuery(internal.domains.research.forYouFeed.getTrendingCandidates, {
      limit: 10,
    });

    // Get a sample user to test out-of-network
    const sampleUser = await ctx.db.query("users").first();
    let outOfNetwork: FeedCandidate[] = [];
    if (sampleUser) {
      outOfNetwork = await ctx.runQuery(internal.domains.research.forYouFeed.getOutOfNetworkCandidates, {
        userId: sampleUser._id,
        limit: 10,
      });
    }

    return {
      trendingCount: trending.length,
      trendingSample: trending[0],
      outOfNetworkCount: outOfNetwork.length,
      outOfNetworkSample: outOfNetwork[0],
    };
  },
});
