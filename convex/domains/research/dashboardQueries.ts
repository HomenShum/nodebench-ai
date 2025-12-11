import { v } from "convex/values";
import { query, mutation, action, internalQuery } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { DashboardState } from "../../../src/features/research/types";

/**
 * Internal query to fetch feed items for metrics calculation
 * Used by the daily morning brief workflow
 */
export const getFeedItemsForMetrics = internalQuery({
  args: {},
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const items = await ctx.db
      .query("feedItems")
      .withIndex("by_score")
      .order("desc")
      .take(100);

    // Filter to last 24 hours and return relevant fields
    return items
      .filter(item => item.publishedAt && new Date(item.publishedAt).getTime() > oneDayAgo)
      .map(item => ({
        sourceId: item.sourceId,
        type: item.type,
        category: item.category,
        title: item.title,
        summary: item.summary,
        source: item.source,
        tags: item.tags,
        score: item.score,
        publishedAt: item.publishedAt,
      }));
  },
});

/**
 * Get the latest daily brief snapshot for the dashboard
 * Returns the most recent dashboard metrics or null if none exist
 */
export const getLatestDashboardSnapshot = query({
  args: {},
  handler: async (ctx): Promise<{
    dashboardMetrics: DashboardState;
    generatedAt: number;
    dateString: string;
    sourceSummary: any;
  } | null> => {
    // Get the most recent snapshot
    const snapshot = await ctx.db
      .query("dailyBriefSnapshots")
      .withIndex("by_generated_at")
      .order("desc")
      .first();
    
    if (!snapshot) {
      return null;
    }
    
    return {
      dashboardMetrics: snapshot.dashboardMetrics as DashboardState,
      generatedAt: snapshot.generatedAt,
      dateString: snapshot.dateString,
      sourceSummary: snapshot.sourceSummary,
    };
  },
});

/**
 * Get dashboard snapshot for a specific date
 */
export const getDashboardSnapshotByDate = query({
  args: {
    dateString: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const snapshot = await ctx.db
      .query("dailyBriefSnapshots")
      .withIndex("by_date_string", (q) => q.eq("dateString", args.dateString))
      .order("desc")
      .first();
    
    if (!snapshot) {
      return null;
    }
    
    return {
      dashboardMetrics: snapshot.dashboardMetrics as DashboardState,
      generatedAt: snapshot.generatedAt,
      dateString: snapshot.dateString,
      sourceSummary: snapshot.sourceSummary,
      version: snapshot.version,
    };
  },
});

/**
 * Manually trigger dashboard metrics refresh
 * Useful for testing or on-demand updates
 */
export const refreshDashboardMetrics = action({
  args: {},
  handler: async (ctx) => {
    console.log("[dashboardQueries] Manually triggering dashboard metrics refresh...");
    
    const result = await ctx.runAction(
      internal.workflows.dailyMorningBrief.runDailyMorningBrief,
      {}
    );
    
    return result;
  },
});

/**
 * Get historical dashboard snapshots (last N days)
 */
export const getHistoricalSnapshots = query({
  args: {
    days: v.optional(v.number()), // Default: 7 days
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const snapshots = await ctx.db
      .query("dailyBriefSnapshots")
      .withIndex("by_generated_at")
      .order("desc")
      .filter((q) => q.gte(q.field("generatedAt"), cutoffDate))
      .take(days);
    
    return snapshots.map(snapshot => ({
      dateString: snapshot.dateString,
      generatedAt: snapshot.generatedAt,
      version: snapshot.version,
      sourceSummary: snapshot.sourceSummary,
      processingTimeMs: snapshot.processingTimeMs,
    }));
  },
});

