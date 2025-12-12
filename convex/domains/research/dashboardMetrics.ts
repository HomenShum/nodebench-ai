"use node";

import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { DashboardState, KeyStat, CapabilityEntry, MarketShareSegment } from "../../../src/features/research/types";

/**
 * Calculate dashboard metrics from aggregated feed data
 * This runs daily to populate the StickyDashboard with fresh data
 */
export const calculateDashboardMetrics = internalAction({
  args: {},
  handler: async (ctx): Promise<{ dashboardMetrics: DashboardState; sourceSummary: any }> => {
    const startTime = Date.now();

    // Fetch recent feed items (last 24 hours)
    const feedItems = await ctx.runQuery(internal.domains.research.dashboardQueries.getFeedItemsForMetrics);

    const sourceSummary = calculateSourceSummary(feedItems);
    
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
    
    const dashboardMetrics: DashboardState = {
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

    return { dashboardMetrics, sourceSummary };
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

function calculateSourceSummary(feedItems: any[]) {
  // Initialize expected sources with 0 so they always appear
  const bySource: Record<string, number> = {
    GitHub: 0,
    ArXiv: 0,
    HackerNews: 0,
    Reddit: 0,
    "Dev.to": 0,
  };
  const byCategory: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};

  for (const item of feedItems) {
    const source = item.source || "Unknown";
    bySource[source] = (bySource[source] || 0) + 1;

    const category = item.category || "uncategorized";
    byCategory[category] = (byCategory[category] || 0) + 1;

    const tags: string[] = Array.isArray(item.tags) ? item.tags : [];
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const topTrending = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    totalItems: feedItems.length,
    bySource,
    byCategory,
    topTrending,
  };
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
