/**
 * LinkedIn Funding Posts - Deduplication & Progression Tracking
 *
 * Tracks which companies have been posted to LinkedIn to:
 * 1. Avoid duplicate posts for the same funding round
 * 2. Reference previous posts when a company raises a new round
 * 3. Filter by sector for targeted posting
 */

import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "../../_generated/server";
import type { Doc } from "../../_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalize company name for deduplication.
 * Lowercase, trim, remove common suffixes like "Inc", "Corp", "LLC", etc.
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[,.]$/g, "")
    .replace(/\s+(inc|corp|llc|ltd|co|company|technologies|technology|labs|ai|io)\.?$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Categorize sector into broad categories for filtering.
 */
function categorizeSector(sector: string | undefined): string {
  if (!sector) return "other";
  const s = sector.toLowerCase();

  if (s.includes("health") || s.includes("bio") || s.includes("med") || s.includes("pharma") || s.includes("drug") || s.includes("clinical")) {
    return "healthcare";
  }
  if (s.includes("fintech") || s.includes("banking") || s.includes("payment") || s.includes("insur") || s.includes("wealth") || s.includes("lending")) {
    return "fintech";
  }
  if (s.includes("ai") || s.includes("ml") || s.includes("machine learning") || s.includes("nlp") || s.includes("computer vision")) {
    return "ai_ml";
  }
  if (s.includes("enterprise") || s.includes("saas") || s.includes("b2b") || s.includes("devtool") || s.includes("dev tool")) {
    return "enterprise";
  }
  if (s.includes("consumer") || s.includes("commerce") || s.includes("retail") || s.includes("marketplace")) {
    return "consumer";
  }
  if (s.includes("deeptech") || s.includes("robotics") || s.includes("quantum") || s.includes("semiconductor") || s.includes("space") || s.includes("defense")) {
    return "deeptech";
  }
  if (s.includes("climate") || s.includes("energy") || s.includes("cleantech") || s.includes("green")) {
    return "climate";
  }
  return "technology";
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal Queries - For use in actions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a company has been posted recently (deduplication check).
 * Returns the most recent post for this company if it exists.
 */
export const checkCompanyPosted = internalQuery({
  args: {
    companyName: v.string(),
    roundType: v.optional(v.string()),
    lookbackDays: v.optional(v.number()),
  },
  returns: v.union(
    v.object({
      wasPosted: v.literal(true),
      previousPostId: v.id("linkedinFundingPosts"),
      previousPostUrl: v.string(),
      previousRoundType: v.string(),
      previousAmountRaw: v.string(),
      postedAt: v.number(),
      isProgression: v.boolean(), // True if this would be a new round (progression)
    }),
    v.object({
      wasPosted: v.literal(false),
    })
  ),
  handler: async (ctx, args) => {
    const normalized = normalizeCompanyName(args.companyName);
    const lookbackMs = (args.lookbackDays ?? 30) * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - lookbackMs;

    // Find any previous posts for this company
    const previousPosts = await ctx.db
      .query("linkedinFundingPosts")
      .withIndex("by_company", (q) => q.eq("companyNameNormalized", normalized))
      .filter((q) => q.gte(q.field("postedAt"), cutoffTime))
      .order("desc")
      .take(5);

    if (previousPosts.length === 0) {
      return { wasPosted: false as const };
    }

    // Get the most recent post
    const mostRecent = previousPosts[0];

    // Check if this is a progression (new round vs same round)
    const isProgression = args.roundType
      ? args.roundType !== mostRecent.roundType
      : false;

    return {
      wasPosted: true as const,
      previousPostId: mostRecent._id,
      previousPostUrl: mostRecent.postUrl,
      previousRoundType: mostRecent.roundType,
      previousAmountRaw: mostRecent.amountRaw,
      postedAt: mostRecent.postedAt,
      isProgression,
    };
  },
});

/**
 * Batch check multiple companies for deduplication.
 * Returns a map of company names to their previous post info.
 */
export const batchCheckCompaniesPosted = internalQuery({
  args: {
    companyNames: v.array(v.string()),
    lookbackDays: v.optional(v.number()),
  },
  returns: v.any(), // Map<string, PreviousPostInfo | null>
  handler: async (ctx, args) => {
    const lookbackMs = (args.lookbackDays ?? 30) * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - lookbackMs;

    const results: Record<string, {
      previousPostUrl: string;
      previousRoundType: string;
      previousAmountRaw: string;
      postedAt: number;
    } | null> = {};

    for (const companyName of args.companyNames) {
      const normalized = normalizeCompanyName(companyName);

      const previousPost = await ctx.db
        .query("linkedinFundingPosts")
        .withIndex("by_company", (q) => q.eq("companyNameNormalized", normalized))
        .filter((q) => q.gte(q.field("postedAt"), cutoffTime))
        .order("desc")
        .first() as Doc<"linkedinFundingPosts"> | null;

      if (previousPost) {
        results[companyName] = {
          previousPostUrl: previousPost.postUrl,
          previousRoundType: previousPost.roundType,
          previousAmountRaw: previousPost.amountRaw,
          postedAt: previousPost.postedAt,
        };
      } else {
        results[companyName] = null;
      }
    }

    return results;
  },
});

/**
 * Get full funding timeline for a company.
 * Returns ALL past funding posts for this company, sorted by date (oldest first).
 * Used to build a complete funding journey in LinkedIn posts.
 *
 * Lookback: 365 days by default to capture full funding history
 */
export const getCompanyFundingTimeline = internalQuery({
  args: {
    companyName: v.string(),
    lookbackDays: v.optional(v.number()), // Default: 365 days
  },
  returns: v.array(
    v.object({
      roundType: v.string(),
      amountRaw: v.string(),
      postedAt: v.number(),
      sourceUrl: v.optional(v.string()),
      postUrl: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const normalized = normalizeCompanyName(args.companyName);
    const lookbackMs = (args.lookbackDays ?? 365) * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - lookbackMs;

    // Fetch all previous posts for this company
    const previousPosts = await ctx.db
      .query("linkedinFundingPosts")
      .withIndex("by_company", (q) => q.eq("companyNameNormalized", normalized))
      .filter((q) => q.gte(q.field("postedAt"), cutoffTime))
      .order("asc") // Oldest first for timeline
      .collect();

    return previousPosts.map(post => ({
      roundType: post.roundType,
      amountRaw: post.amountRaw,
      postedAt: post.postedAt,
      sourceUrl: post.sourceUrl,
      postUrl: post.postUrl,
    }));
  },
});

/**
 * Batch fetch funding timelines for multiple companies.
 * More efficient than calling getCompanyFundingTimeline for each company.
 */
export const batchGetFundingTimelines = internalQuery({
  args: {
    companyNames: v.array(v.string()),
    lookbackDays: v.optional(v.number()), // Default: 365 days
  },
  returns: v.any(), // Map<string, TimelineEntry[]>
  handler: async (ctx, args) => {
    const lookbackMs = (args.lookbackDays ?? 365) * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - lookbackMs;

    const results: Record<string, Array<{
      roundType: string;
      amountRaw: string;
      postedAt: number;
      sourceUrl?: string;
      postUrl: string;
    }>> = {};

    for (const companyName of args.companyNames) {
      const normalized = normalizeCompanyName(companyName);

      const previousPosts = await ctx.db
        .query("linkedinFundingPosts")
        .withIndex("by_company", (q) => q.eq("companyNameNormalized", normalized))
        .filter((q) => q.gte(q.field("postedAt"), cutoffTime))
        .order("asc") // Oldest first for timeline
        .collect();

      results[companyName] = previousPosts.map(post => ({
        roundType: post.roundType,
        amountRaw: post.amountRaw,
        postedAt: post.postedAt,
        sourceUrl: post.sourceUrl,
        postUrl: post.postUrl,
      }));
    }

    return results;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Internal Mutations - For use in actions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record a posted company for deduplication tracking.
 */
export const recordPostedCompany = internalMutation({
  args: {
    companyName: v.string(),
    roundType: v.string(),
    amountRaw: v.string(),
    amountUsd: v.optional(v.number()),
    sector: v.optional(v.string()),
    postUrn: v.string(),
    postUrl: v.string(),
    postPart: v.optional(v.number()),
    totalParts: v.optional(v.number()),
    previousPostId: v.optional(v.id("linkedinFundingPosts")),
    progressionType: v.optional(v.union(
      v.literal("new"),
      v.literal("update"),
      v.literal("next-round")
    )),
    fundingEventId: v.optional(v.id("fundingEvents")),
  },
  returns: v.id("linkedinFundingPosts"),
  handler: async (ctx, args) => {
    const normalized = normalizeCompanyName(args.companyName);
    const sectorCategory = categorizeSector(args.sector);

    return await ctx.db.insert("linkedinFundingPosts", {
      companyNameNormalized: normalized,
      companyName: args.companyName,
      roundType: args.roundType,
      amountRaw: args.amountRaw,
      amountUsd: args.amountUsd,
      sector: args.sector,
      sectorCategory,
      postUrn: args.postUrn,
      postUrl: args.postUrl,
      postPart: args.postPart,
      totalParts: args.totalParts,
      previousPostId: args.previousPostId,
      progressionType: args.progressionType ?? "new",
      postedAt: Date.now(),
      fundingEventId: args.fundingEventId,
    });
  },
});

/**
 * Batch record multiple posted companies.
 */
export const batchRecordPostedCompanies = internalMutation({
  args: {
    companies: v.array(v.object({
      companyName: v.string(),
      roundType: v.string(),
      amountRaw: v.string(),
      amountUsd: v.optional(v.number()),
      sector: v.optional(v.string()),
      postUrn: v.string(),
      postUrl: v.string(),
      postPart: v.optional(v.number()),
      totalParts: v.optional(v.number()),
      fundingEventId: v.optional(v.id("fundingEvents")),
    })),
  },
  returns: v.array(v.id("linkedinFundingPosts")),
  handler: async (ctx, args) => {
    const ids: any[] = [];

    for (const company of args.companies) {
      const normalized = normalizeCompanyName(company.companyName);
      const sectorCategory = categorizeSector(company.sector);

      const id = await ctx.db.insert("linkedinFundingPosts", {
        companyNameNormalized: normalized,
        companyName: company.companyName,
        roundType: company.roundType,
        amountRaw: company.amountRaw,
        amountUsd: company.amountUsd,
        sector: company.sector,
        sectorCategory,
        postUrn: company.postUrn,
        postUrl: company.postUrl,
        postPart: company.postPart,
        totalParts: company.totalParts,
        progressionType: "new",
        postedAt: Date.now(),
        fundingEventId: company.fundingEventId,
      });

      ids.push(id);
    }

    return ids;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Public Queries - For UI/debugging
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get recent posted companies for debugging/viewing.
 */
export const getRecentPostedCompanies = query({
  args: {
    limit: v.optional(v.number()),
    sectorCategory: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("linkedinFundingPosts"),
    companyName: v.string(),
    roundType: v.string(),
    amountRaw: v.string(),
    sector: v.optional(v.string()),
    sectorCategory: v.optional(v.string()),
    postUrl: v.string(),
    postedAt: v.number(),
    progressionType: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let postsQuery = ctx.db
      .query("linkedinFundingPosts")
      .withIndex("by_postedAt")
      .order("desc");

    const posts = await postsQuery.take(limit);

    // Filter by sector if specified
    const filteredPosts = args.sectorCategory
      ? posts.filter(p => p.sectorCategory === args.sectorCategory)
      : posts;

    return filteredPosts.map(p => ({
      _id: p._id,
      companyName: p.companyName,
      roundType: p.roundType,
      amountRaw: p.amountRaw,
      sector: p.sector,
      sectorCategory: p.sectorCategory,
      postUrl: p.postUrl,
      postedAt: p.postedAt,
      progressionType: p.progressionType,
    }));
  },
});

/**
 * Get posting stats by sector.
 */
export const getPostingStatsBySector = query({
  args: {},
  returns: v.array(v.object({
    sectorCategory: v.string(),
    postCount: v.number(),
    lastPostedAt: v.number(),
  })),
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("linkedinFundingPosts")
      .order("desc")
      .take(500);

    const sectorStats: Record<string, { count: number; lastPosted: number }> = {};

    for (const post of posts) {
      const sector = post.sectorCategory ?? "other";
      if (!sectorStats[sector]) {
        sectorStats[sector] = { count: 0, lastPosted: 0 };
      }
      sectorStats[sector].count++;
      if (post.postedAt > sectorStats[sector].lastPosted) {
        sectorStats[sector].lastPosted = post.postedAt;
      }
    }

    return Object.entries(sectorStats).map(([sector, stats]) => ({
      sectorCategory: sector,
      postCount: stats.count,
      lastPostedAt: stats.lastPosted,
    })).sort((a, b) => b.postCount - a.postCount);
  },
});

/**
 * Delete an incorrect LinkedIn funding post (admin/correction tool).
 * Use this to fix data attribution errors.
 */
export const deleteIncorrectPost = internalMutation({
  args: {
    postId: v.id("linkedinFundingPosts"),
  },
  returns: v.object({
    success: v.boolean(),
    deletedPost: v.optional(v.object({
      companyName: v.string(),
      roundType: v.string(),
      amountRaw: v.string(),
      postUrl: v.string(),
    })),
  }),
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);

    if (!post) {
      return {
        success: false,
      };
    }

    console.log(`[linkedinFundingPosts] Deleting incorrect post: ${args.postId}`);
    console.log(`  Company: ${post.companyName}`);
    console.log(`  Round: ${post.roundType}`);
    console.log(`  Amount: ${post.amountRaw}`);
    console.log(`  Post URL: ${post.postUrl}`);

    await ctx.db.delete(args.postId);

    return {
      success: true,
      deletedPost: {
        companyName: post.companyName,
        roundType: post.roundType,
        amountRaw: post.amountRaw,
        postUrl: post.postUrl,
      },
    };
  },
});
