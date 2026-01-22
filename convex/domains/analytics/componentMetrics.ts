/**
 * Analytics Component Metrics
 *
 * Tracks per-component performance metrics for reports and analytics.
 * Enables measurement of individual report components to optimize content quality.
 *
 * Created: 2026-01-21 (P0 - Critical for data completeness)
 */

import { mutation, query, internalMutation } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Record component metrics for a report.
 * Call this when generating any report to track component-level performance.
 */
export const recordComponentMetrics = mutation({
  args: {
    date: v.string(), // YYYY-MM-DD
    reportType: v.union(
      v.literal("daily_brief"),
      v.literal("weekly_digest"),
      v.literal("funding_report"),
      v.literal("research_highlights")
    ),
    componentType: v.string(),
    sourceName: v.string(),
    category: v.optional(v.string()),
    itemCount: v.number(),
    engagementScore: v.optional(v.number()),
    avgReadTimeSeconds: v.optional(v.number()),
    clickThroughRate: v.optional(v.number()),
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),
    relevanceScore: v.optional(v.number()),
    freshnessHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const metricId = await ctx.db.insert("dailyReportComponentMetrics", {
      date: args.date,
      reportType: args.reportType,
      componentType: args.componentType,
      sourceName: args.sourceName,
      category: args.category,
      itemCount: args.itemCount,
      engagementScore: args.engagementScore,
      avgReadTimeSeconds: args.avgReadTimeSeconds,
      clickThroughRate: args.clickThroughRate,
      impressions: args.impressions,
      clicks: args.clicks,
      relevanceScore: args.relevanceScore,
      freshnessHours: args.freshnessHours,
      createdAt: Date.now(),
    });

    return { success: true, metricId };
  },
});

/**
 * Batch record multiple component metrics (for report generation)
 */
export const batchRecordComponentMetrics = internalMutation({
  args: {
    metrics: v.array(v.object({
      date: v.string(),
      reportType: v.union(
        v.literal("daily_brief"),
        v.literal("weekly_digest"),
        v.literal("funding_report"),
        v.literal("research_highlights")
      ),
      componentType: v.string(),
      sourceName: v.string(),
      category: v.optional(v.string()),
      itemCount: v.number(),
      engagementScore: v.optional(v.number()),
      avgReadTimeSeconds: v.optional(v.number()),
      clickThroughRate: v.optional(v.number()),
      impressions: v.optional(v.number()),
      clicks: v.optional(v.number()),
      relevanceScore: v.optional(v.number()),
      freshnessHours: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const metricIds = [];

    for (const metric of args.metrics) {
      const metricId = await ctx.db.insert("dailyReportComponentMetrics", {
        ...metric,
        createdAt: Date.now(),
      });
      metricIds.push(metricId);
    }

    return { success: true, count: metricIds.length, metricIds };
  },
});

/**
 * Get component metrics for a specific date
 */
export const getComponentMetricsByDate = query({
  args: {
    date: v.string(),
    reportType: v.optional(v.union(
      v.literal("daily_brief"),
      v.literal("weekly_digest"),
      v.literal("funding_report"),
      v.literal("research_highlights")
    )),
  },
  handler: async (ctx, args) => {
    let metricsQuery = ctx.db
      .query("dailyReportComponentMetrics")
      .withIndex("by_date", (q) => q.eq("date", args.date));

    const metrics = await metricsQuery.collect();

    if (args.reportType) {
      return metrics.filter((m) => m.reportType === args.reportType);
    }

    return metrics;
  },
});

/**
 * Get component metrics by source for a date range
 */
export const getComponentMetricsBySource = query({
  args: {
    sourceName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("dailyReportComponentMetrics")
      .withIndex("by_source", (q) => q.eq("sourceName", args.sourceName))
      .collect();

    // Filter by date range
    return metrics.filter(
      (m) => m.date >= args.startDate && m.date <= args.endDate
    );
  },
});

/**
 * Get component metrics by category for analysis
 */
export const getComponentMetricsByCategory = query({
  args: {
    category: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("dailyReportComponentMetrics")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    // Filter by date range
    return metrics.filter(
      (m) => m.date >= args.startDate && m.date <= args.endDate
    );
  },
});

/**
 * Get aggregated metrics by component type for a date range
 */
export const getAggregatedMetricsByComponent = query({
  args: {
    componentType: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("dailyReportComponentMetrics")
      .withIndex("by_component", (q) => q.eq("componentType", args.componentType))
      .collect();

    // Filter by date range
    const filteredMetrics = metrics.filter(
      (m) => m.date >= args.startDate && m.date <= args.endDate
    );

    // Calculate aggregates
    const totalItems = filteredMetrics.reduce((sum, m) => sum + m.itemCount, 0);
    const avgEngagement = filteredMetrics.reduce(
      (sum, m) => sum + (m.engagementScore || 0),
      0
    ) / (filteredMetrics.length || 1);
    const avgCTR = filteredMetrics.reduce(
      (sum, m) => sum + (m.clickThroughRate || 0),
      0
    ) / (filteredMetrics.length || 1);

    return {
      componentType: args.componentType,
      dateRange: { start: args.startDate, end: args.endDate },
      totalRecords: filteredMetrics.length,
      totalItems,
      avgEngagement,
      avgCTR,
      metrics: filteredMetrics,
    };
  },
});

/**
 * Get top-performing sources by engagement
 */
export const getTopPerformingSources = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const metrics = await ctx.db
      .query("dailyReportComponentMetrics")
      .withIndex("by_date")
      .collect();

    // Filter by date range
    const filteredMetrics = metrics.filter(
      (m) => m.date >= args.startDate && m.date <= args.endDate
    );

    // Group by source and calculate avg engagement
    const sourceMetrics = new Map<string, {
      sourceName: string;
      totalItems: number;
      avgEngagement: number;
      avgCTR: number;
      recordCount: number;
    }>();

    for (const metric of filteredMetrics) {
      const existing = sourceMetrics.get(metric.sourceName) || {
        sourceName: metric.sourceName,
        totalItems: 0,
        avgEngagement: 0,
        avgCTR: 0,
        recordCount: 0,
      };

      existing.totalItems += metric.itemCount;
      existing.avgEngagement += metric.engagementScore || 0;
      existing.avgCTR += metric.clickThroughRate || 0;
      existing.recordCount++;

      sourceMetrics.set(metric.sourceName, existing);
    }

    // Calculate averages and sort by engagement
    const results = Array.from(sourceMetrics.values()).map((source) => ({
      ...source,
      avgEngagement: source.avgEngagement / source.recordCount,
      avgCTR: source.avgCTR / source.recordCount,
    }));

    return results
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, limit);
  },
});
