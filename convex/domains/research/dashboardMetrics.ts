"use node";

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { DashboardState, KeyStat, CapabilityEntry, MarketShareSegment } from "../../../src/features/research/types";

/**
 * Calculate dashboard metrics from aggregated feed data
 * This runs daily to populate the StickyDashboard with fresh data
 */
export const calculateDashboardMetrics = internalAction({
  args: {},
  handler: async (ctx): Promise<DashboardState> => {
    const startTime = Date.now();
    
    // Fetch recent feed items (last 24 hours)
    const feedItems = await ctx.runQuery(internal.domains.research.dashboardMetrics.getFeedItemsForMetrics);
    
    // Calculate various metrics
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const timelineProgress = calculateTimelineProgress();
    
    // Calculate capability scores based on feed content
    const capabilities = calculateCapabilities(feedItems);
    
    // Calculate key stats from feed data
    const keyStats = calculateKeyStats(feedItems);
    
    // Calculate market share distribution
    const marketShare = calculateMarketShare(feedItems);
    
    // Calculate tech readiness buckets
    const techReadiness = calculateTechReadiness(feedItems);
    
    // Generate trend line data
    const trendLine = await generateTrendLineData(ctx, feedItems);
    
    // Calculate agent count metrics
    const agentCount = calculateAgentCount(feedItems);
    
    const processingTime = Date.now() - startTime;
    console.log(`[dashboardMetrics] Calculated metrics in ${processingTime}ms`);
    
    return {
      meta: {
        currentDate,
        timelineProgress,
      },
      charts: {
        trendLine,
        marketShare,
      },
      techReadiness,
      keyStats,
      capabilities,
      agentCount,
    };
  },
});

/**
 * Query to fetch feed items for metrics calculation
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
 * Store calculated metrics in dailyBriefSnapshots table
 */
export const storeDashboardMetrics = internalMutation({
  args: {
    dashboardMetrics: v.any(),
    sourceSummary: v.any(),
    processingTimeMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const generatedAt = Date.now();
    
    // Check if we already have a snapshot for today
    const existing = await ctx.db
      .query("dailyBriefSnapshots")
      .withIndex("by_date_string", (q) => q.eq("dateString", dateString))
      .first();
    
    const version = existing ? existing.version + 1 : 1;
    
    // Insert new snapshot
    await ctx.db.insert("dailyBriefSnapshots", {
      dateString,
      generatedAt,
      dashboardMetrics: args.dashboardMetrics,
      sourceSummary: args.sourceSummary,
      version,
      processingTimeMs: args.processingTimeMs,
    });
    
    console.log(`[dashboardMetrics] Stored snapshot for ${dateString} (version ${version})`);
    
    return { dateString, version };
  },
});

// ============================================================================
// Helper Functions for Metric Calculations
// ============================================================================

function calculateTimelineProgress(): number {
  // Calculate progress through 2025 (0.0 to 1.0)
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
  const progress = (now.getTime() - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime());
  return Math.min(Math.max(progress, 0), 1);
}

function calculateCapabilities(feedItems: any[]): CapabilityEntry[] {
  // Calculate capability scores based on feed content topics
  const aiMlCount = feedItems.filter(item => 
    item.category === 'ai_ml' || /ai|ml|llm|gpt|model/i.test(item.title)
  ).length;
  
  const securityCount = feedItems.filter(item =>
    /security|vulnerability|cve|hack/i.test(item.title)
  ).length;
  
  const uptimeCount = feedItems.filter(item =>
    /outage|downtime|reliability|uptime/i.test(item.title)
  ).length;
  
  // Normalize scores to 0-1 range
  const total = feedItems.length || 1;
  
  return [
    { label: "Reasoning", score: Math.min((aiMlCount / total) * 2, 1), icon: "brain" },
    { label: "Uptime", score: Math.max(1 - (uptimeCount / total) * 3, 0.5), icon: "activity" },
    { label: "Safety", score: Math.max(1 - (securityCount / total) * 3, 0.6), icon: "lock" },
  ];
}

function calculateKeyStats(feedItems: any[]): KeyStat[] {
  // Calculate key statistics from feed data
  const fundingItems = feedItems.filter(item =>
    /funding|raise|series|valuation|\$\d+/i.test(item.title)
  );

  const outageItems = feedItems.filter(item =>
    /outage|downtime|failure/i.test(item.title)
  );

  const aiItems = feedItems.filter(item =>
    item.category === 'ai_ml' || /ai|ml|llm/i.test(item.title)
  );

  // Calculate "gap width" as a proxy for AI capability vs deployment gap
  const gapWidth = Math.max(45 - (aiItems.length * 2), 20);

  // Calculate fail rate from outage mentions
  const failRate = Math.min((outageItems.length / feedItems.length) * 100, 25);

  // Estimate latency trend
  const avgLatency = 2.4 - (aiItems.length * 0.05);

  return [
    {
      label: "Gap Width",
      value: `${gapWidth} pts`,
      context: gapWidth > 35 ? "Critical Risk" : "Improving",
      trend: gapWidth > 35 ? "down" : "up",
    },
    {
      label: "Fail Rate",
      value: `${failRate.toFixed(1)}%`,
      context: "In Production",
      trend: failRate > 15 ? "down" : "up",
    },
    {
      label: "Avg Latency",
      value: `${avgLatency.toFixed(1)}s`,
      trend: avgLatency < 2.0 ? "up" : "down",
    },
  ];
}

function calculateMarketShare(feedItems: any[]): MarketShareSegment[] {
  // Calculate market share distribution by source
  const sourceCounts: Record<string, number> = {};

  feedItems.forEach(item => {
    sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
  });

  const total = feedItems.length || 1;
  const topSources = Object.entries(sourceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const colors = ["black", "gray", "accent"];

  return topSources.map(([source, count], index) => ({
    label: source,
    value: Math.round((count / total) * 100),
    color: colors[index] || "gray",
  }));
}

function calculateTechReadiness(feedItems: any[]): { existing: number; emerging: number; sciFi: number } {
  // Categorize items into tech readiness buckets
  const existing = feedItems.filter(item =>
    /production|deployed|available|launch/i.test(item.title)
  ).length;

  const emerging = feedItems.filter(item =>
    /beta|preview|experimental|research/i.test(item.title)
  ).length;

  const sciFi = feedItems.filter(item =>
    /future|agi|quantum|breakthrough/i.test(item.title)
  ).length;

  const total = feedItems.length || 1;

  return {
    existing: Math.round((existing / total) * 10),
    emerging: Math.round((emerging / total) * 10),
    sciFi: Math.round((sciFi / total) * 10),
  };
}

async function generateTrendLineData(ctx: any, feedItems: any[]): Promise<any> {
  // Generate trend line data for the chart
  // For now, use a simple moving average of AI activity
  const quarters = ["Q1 '24", "Q2 '24", "Q3 '24", "Q4 '24", "Q1 '25", "Q2 '25"];

  // Simulate trend data based on current feed activity
  const aiActivity = feedItems.filter(item => item.category === 'ai_ml').length;
  const baseValue = 40 + (aiActivity * 2);

  const data = quarters.map((_, index) => ({
    value: baseValue + (index * 5) + Math.random() * 10,
  }));

  return {
    title: "Capability vs. Reliability Index",
    xAxisLabels: quarters,
    series: [
      {
        id: "infra-reliability",
        label: "Infra Reliability",
        type: "solid" as const,
        color: "accent",
        data,
      },
    ],
    visibleEndIndex: quarters.length - 1,
    gridScale: { min: 0, max: 100 },
  };
}

function calculateAgentCount(feedItems: any[]): { count: number; label: string; speed: number } {
  // Calculate agent count based on AI/ML activity
  const aiItems = feedItems.filter(item =>
    item.category === 'ai_ml' || /ai|ml|agent|llm/i.test(item.title)
  );

  // Scale agent count based on activity level
  const baseCount = 12500;
  const activityMultiplier = Math.min(aiItems.length / 10, 8);
  const count = Math.round(baseCount * (1 + activityMultiplier));

  // Determine agent reliability tier
  let label = "Unreliable Agent";
  let speed = 2;

  if (count > 50000) {
    label = "Autonomous Agent";
    speed = 20;
  } else if (count > 25000) {
    label = "Reliable Agent";
    speed = 10;
  }

  return { count, label, speed };
}

