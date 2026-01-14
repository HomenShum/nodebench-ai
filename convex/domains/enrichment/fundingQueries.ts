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

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API - Comprehensive funding data for frontend display
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get ALL funding events for the funding brief page.
 * Returns comprehensive data suitable for frontend display.
 *
 * This is the main query for the /funding-brief page.
 */
export const getAllFundingForBrief = query({
  args: {
    lookbackDays: v.optional(v.number()),
    limit: v.optional(v.number()),
    sectorFilter: v.optional(v.string()),
    roundTypeFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lookbackMs = (args.lookbackDays ?? 30) * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - lookbackMs;
    const limit = args.limit ?? 100; // Default to 100 events

    // Collect all events within the cutoff window first, then apply limit
    // This ensures historical data isn't cut off by newer records
    let allEvents = await ctx.db
      .query("fundingEvents")
      .withIndex("by_announcedAt")
      .order("desc")
      .collect();

    // Filter to events within the lookback window
    let events = allEvents.filter((e) => e.announcedAt >= cutoff);

    // Apply sector filter if specified
    if (args.sectorFilter) {
      const filter = args.sectorFilter.toLowerCase();
      events = events.filter((e) =>
        e.sector?.toLowerCase().includes(filter)
      );
    }

    // Apply round type filter if specified
    if (args.roundTypeFilter) {
      events = events.filter((e) => e.roundType === args.roundTypeFilter);
    }

    // Apply limit after all filters (so historical data isn't cut off)
    const limitedEvents = events.slice(0, limit);

    // Fetch associated entity data for enrichment (only for limited set)
    const enrichedEvents = await Promise.all(
      limitedEvents.map(async (event) => {
        let entityData = null;
        if (event.companyId) {
          const entity = await ctx.db.get(event.companyId);
          if (entity) {
            entityData = {
              name: entity.name,
              type: entity.type,
              sector: entity.sector,
              crmFields: (entity as any).crmFields,
            };
          }
        }

        return {
          id: event._id,
          companyName: event.companyName,
          roundType: event.roundType,
          amountRaw: event.amountRaw,
          amountUsd: event.amountUsd,
          leadInvestors: event.leadInvestors,
          coInvestors: event.coInvestors,
          sector: event.sector,
          location: event.location,
          description: event.description,
          valuation: event.valuation,
          useOfProceeds: event.useOfProceeds,
          confidence: event.confidence,
          verificationStatus: event.verificationStatus,
          sourceUrls: event.sourceUrls,
          sourceNames: event.sourceNames,
          announcedAt: event.announcedAt,
          createdAt: event.createdAt,
          // Enriched data from entity
          entityData,
        };
      })
    );

    // Compute stats
    const totalAmount = events.reduce((sum, e) => sum + (e.amountUsd ?? 0), 0);
    const byRoundType: Record<string, number> = {};
    for (const event of events) {
      byRoundType[event.roundType] = (byRoundType[event.roundType] ?? 0) + 1;
    }

    return {
      events: enrichedEvents,
      stats: {
        total: enrichedEvents.length,
        totalAmountUsd: totalAmount,
        byRoundType,
        lookbackDays: args.lookbackDays ?? 30,
      },
    };
  },
});

/**
 * Get funding brief summary - minimal data for card/preview display.
 * Used for homepage widgets and social share previews.
 */
export const getFundingBriefSummary = query({
  args: {},
  handler: async (ctx) => {
    const lookbackMs = 7 * 24 * 60 * 60 * 1000; // Last 7 days
    const cutoff = Date.now() - lookbackMs;

    const events = await ctx.db
      .query("fundingEvents")
      .withIndex("by_announcedAt")
      .order("desc")
      .filter((q) => q.gte(q.field("announcedAt"), cutoff))
      .take(50);

    // Top 5 by amount
    const topByAmount = [...events]
      .filter((e) => e.amountUsd)
      .sort((a, b) => (b.amountUsd ?? 0) - (a.amountUsd ?? 0))
      .slice(0, 5)
      .map((e) => ({
        companyName: e.companyName,
        roundType: e.roundType,
        amountRaw: e.amountRaw,
        sector: e.sector,
      }));

    // Compute stats
    const totalAmount = events.reduce((sum, e) => sum + (e.amountUsd ?? 0), 0);

    return {
      topFunding: topByAmount,
      stats: {
        totalEvents: events.length,
        totalAmountUsd: totalAmount,
        periodDays: 7,
      },
      lastUpdated: Date.now(),
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL QUERIES - For scheduled report generation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get funding data for scheduled PDF report generation.
 * Internal-only query for cron jobs.
 */
export const getFundingForScheduledReport = internalQuery({
  args: {
    lookbackDays: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lookbackMs = args.lookbackDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - lookbackMs;
    const limit = args.limit ?? 100;

    const events = await ctx.db
      .query("fundingEvents")
      .withIndex("by_announcedAt")
      .order("desc")
      .filter((q) => q.gte(q.field("announcedAt"), cutoff))
      .take(limit);

    return events.map((event) => ({
      companyName: event.companyName,
      roundType: event.roundType,
      amountRaw: event.amountRaw ?? "",
      amountUsd: event.amountUsd,
      leadInvestors: event.leadInvestors ?? [],
      sector: event.sector,
      location: event.location,
      announcedAt: event.announcedAt,
      confidence: event.confidence,
      verificationStatus: event.verificationStatus,
    }));
  },
});
