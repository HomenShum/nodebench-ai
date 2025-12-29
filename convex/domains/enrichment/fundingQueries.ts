/**
 * Funding Queries
 *
 * Query functions for funding events, optimized for digest generation.
 */
import { v } from "convex/values";
import { query, internalQuery } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

/**
 * Get funding events formatted for digest consumption.
 */
export const getFundingDigestSections = internalQuery({
  args: {
    lookbackHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lookbackMs = (args.lookbackHours ?? 24) * 60 * 60 * 1000;
    const cutoff = Date.now() - lookbackMs;

    const events = await ctx.db
      .query("fundingEvents")
      .withIndex("by_announcedAt")
      .order("desc")
      .filter((q) => q.gte(q.field("announcedAt"), cutoff))
      .collect();

    // Group by round type
    const seedEvents = events.filter(
      (e) => e.roundType === "seed" || e.roundType === "pre-seed"
    );
    const seriesAEvents = events.filter((e) => e.roundType === "series-a");
    const otherEvents = events.filter(
      (e) => !["seed", "pre-seed", "series-a"].includes(e.roundType)
    );

    // Transform to digest format
    const toDigestFormat = (event: typeof events[0]) => ({
      companyName: event.companyName,
      roundType: event.roundType,
      amountRaw: event.amountRaw,
      amountUsd: event.amountUsd,
      leadInvestors: event.leadInvestors,
      sector: event.sector,
      confidence: event.confidence,
      verificationStatus: event.verificationStatus,
      // TODO: Add persona pass count from entity evaluation
      personaPassCount: undefined as number | undefined,
      // TODO: Determine missing fields based on banker-grade requirements
      missingFields: [] as string[],
    });

    return {
      seed: seedEvents.map(toDigestFormat),
      seriesA: seriesAEvents.map(toDigestFormat),
      other: otherEvents.map(toDigestFormat),
      total: events.length,
    };
  },
});

/**
 * Get funding events with associated entities.
 */
export const getFundingWithEntities = query({
  args: {
    lookbackHours: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lookbackMs = (args.lookbackHours ?? 24) * 60 * 60 * 1000;
    const cutoff = Date.now() - lookbackMs;

    const events = await ctx.db
      .query("fundingEvents")
      .withIndex("by_announcedAt")
      .order("desc")
      .filter((q) => q.gte(q.field("announcedAt"), cutoff))
      .take(args.limit ?? 20);

    // Fetch associated entities
    const result = await Promise.all(
      events.map(async (event) => {
        let entity = null;
        if (event.companyId) {
          entity = await ctx.db.get(event.companyId);
        }
        return {
          ...event,
          entity: entity
            ? {
                id: entity._id,
                name: entity.name,
                type: entity.type,
                sector: entity.sector,
              }
            : null,
        };
      })
    );

    return result;
  },
});

/**
 * Get funding statistics for dashboard.
 */
export const getFundingStats = query({
  args: {
    lookbackDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lookbackMs = (args.lookbackDays ?? 7) * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - lookbackMs;

    const events = await ctx.db
      .query("fundingEvents")
      .withIndex("by_announcedAt")
      .filter((q) => q.gte(q.field("announcedAt"), cutoff))
      .collect();

    const byRoundType: Record<string, number> = {};
    let totalAmount = 0;
    let eventsWithAmount = 0;

    for (const event of events) {
      byRoundType[event.roundType] = (byRoundType[event.roundType] ?? 0) + 1;
      if (event.amountUsd) {
        totalAmount += event.amountUsd;
        eventsWithAmount++;
      }
    }

    return {
      total: events.length,
      byRoundType,
      totalAmountUsd: totalAmount,
      averageAmountUsd: eventsWithAmount > 0 ? totalAmount / eventsWithAmount : 0,
      lookbackDays: args.lookbackDays ?? 7,
    };
  },
});

/**
 * Get today's funding targets with persona evaluation status.
 */
export const getTodaysFundingTargets = query({
  args: {},
  handler: async (ctx) => {
    const lookbackMs = 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - lookbackMs;

    const events = await ctx.db
      .query("fundingEvents")
      .withIndex("by_announcedAt")
      .order("desc")
      .filter((q) => q.gte(q.field("announcedAt"), cutoff))
      .take(20);

    return events.map((event) => ({
      id: event._id,
      companyName: event.companyName,
      roundType: event.roundType,
      amountRaw: event.amountRaw,
      amountUsd: event.amountUsd,
      leadInvestors: event.leadInvestors,
      sector: event.sector,
      confidence: event.confidence,
      verificationStatus: event.verificationStatus,
      sourceCount: event.sourceUrls.length,
      hasEntity: !!event.companyId,
    }));
  },
});


/**
 * Get recent funding events with configurable filters.
 * Used by the agent tools.
 */
export const getRecentFundingEvents = query({
  args: {
    lookbackHours: v.optional(v.number()),
    limit: v.optional(v.number()),
    minConfidence: v.optional(v.number()),
    roundTypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const lookbackMs = (args.lookbackHours ?? 24) * 60 * 60 * 1000;
    const cutoff = Date.now() - lookbackMs;
    const minConfidence = args.minConfidence ?? 0.5;

    let events = await ctx.db
      .query("fundingEvents")
      .withIndex("by_announcedAt")
      .order("desc")
      .filter((q) => 
        q.and(
          q.gte(q.field("announcedAt"), cutoff),
          q.gte(q.field("confidence"), minConfidence)
        )
      )
      .take(args.limit ?? 20);

    // Filter by round types if specified
    if (args.roundTypes && args.roundTypes.length > 0) {
      events = events.filter((e) => args.roundTypes!.includes(e.roundType));
    }

    return events.map((event) => ({
      id: event._id,
      companyName: event.companyName,
      roundType: event.roundType,
      amountRaw: event.amountRaw,
      amountUsd: event.amountUsd,
      leadInvestors: event.leadInvestors,
      sector: event.sector,
      confidence: event.confidence,
      verificationStatus: event.verificationStatus,
      sourceUrls: event.sourceUrls,
      announcedAt: event.announcedAt,
    }));
  },
});

/**
 * Search funding events by company name.
 */
export const searchFundingByCompany = query({
  args: {
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    // Use search index for fuzzy matching
    const searchResults = await ctx.db
      .query("fundingEvents")
      .withSearchIndex("search_company", (q) => q.search("companyName", args.companyName))
      .take(10);

    return searchResults.map((event) => ({
      id: event._id,
      companyName: event.companyName,
      roundType: event.roundType,
      amountRaw: event.amountRaw,
      amountUsd: event.amountUsd,
      leadInvestors: event.leadInvestors,
      sector: event.sector,
      confidence: event.confidence,
      verificationStatus: event.verificationStatus,
      announcedAt: event.announcedAt,
      sourceUrls: event.sourceUrls,
    }));
  },
});

/**
 * Trigger verification for a specific funding event.
 * Used by agent tools.
 */
export const verifyFundingEvent = query({
  args: {
    fundingEventId: v.id("fundingEvents"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.fundingEventId);
    if (!event) {
      return null;
    }
    return {
      id: event._id,
      companyName: event.companyName,
      roundType: event.roundType,
      amountRaw: event.amountRaw,
      confidence: event.confidence,
      verificationStatus: event.verificationStatus,
      sourceUrls: event.sourceUrls,
    };
  },
});
