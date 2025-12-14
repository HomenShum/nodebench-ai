"use node";

/**
 * Daily Brief Initializer (Initializer Agent)
 *
 * Creates a persistent domain memory record for a new dailyBriefSnapshot.
 */

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal, api } from "../../_generated/api";

type FeedItem = {
  _id: any;
  title: string;
  summary?: string;
  url?: string;
  source?: string;
  type?: string;
  category?: string;
  tags?: string[];
  score?: number;
  publishedAt?: string;
};

function toFeature(
  id: string,
  type: string,
  name: string,
  testCriteria: string,
  sourceRefs: any,
  priority: number,
  now: number,
) {
  return {
    id,
    type,
    name,
    status: "pending" as const,
    priority,
    testCriteria,
    sourceRefs,
    updatedAt: now,
  };
}

export const initializeForSnapshot = internalAction({
  args: {
    snapshotId: v.id("dailyBriefSnapshots"),
  },
  handler: async (ctx, args): Promise<{ memoryId: any }> => {
    const snapshot: any = await ctx.runQuery(
      internal.domains.research.dailyBriefMemoryQueries.getSnapshotById,
      { snapshotId: args.snapshotId },
    );
    if (!snapshot) throw new Error("Snapshot not found");

    const existing: any = await ctx.runQuery(
      internal.domains.research.dailyBriefMemoryQueries.getMemoryBySnapshot,
      { snapshotId: args.snapshotId },
    );
    if (existing) {
      return { memoryId: existing._id };
    }

    const dayStart = `${snapshot.dateString}T00:00:00.000Z`;
    const dayEnd = `${snapshot.dateString}T23:59:59.999Z`;

    // Prefer time-bounded data for "Today's Briefing" so we don't pull stale high-score items.
    let feedItems: FeedItem[] = await ctx.runQuery(api.feed.getRecent, {
      limit: 200,
      from: dayStart,
      to: dayEnd,
    });

    // If ingest is sparse for the day, widen the window to the last 4 days.
    if (feedItems.length < 12) {
      const fromMs = new Date(`${snapshot.dateString}T00:00:00.000Z`).getTime() - 3 * 24 * 60 * 60 * 1000;
      const from = new Date(fromMs).toISOString();
      feedItems = await ctx.runQuery(api.feed.getRecent, {
        limit: 200,
        from,
        to: dayEnd,
      });
    }

    // Final fallback: trending-by-score.
    if (feedItems.length === 0) {
      feedItems = await ctx.runQuery(api.feed.get, { limit: 100 });
    }

    const repoItems = feedItems.filter((i) => i.type === "repo").slice(0, 5);
    const paperItems = feedItems
      .filter((i) => i.source === "ArXiv" || i.category === "research")
      .slice(0, 3);
    const topNews = feedItems
      .filter((i) => i.type !== "repo")
      .slice(0, 10);

    const prevSnapshot: any = await ctx.runQuery(
      internal.domains.research.dailyBriefMemoryQueries.getPreviousSnapshotInternal,
      { dateString: snapshot.dateString },
    );

    const now = Date.now();
    const features: any[] = [];

    repoItems.forEach((item, idx) => {
      features.push(
        toFeature(
          `R${idx + 1}`,
          "repo_analysis",
          `Analyze trending GitHub repo: ${item.title}`,
          "Summary includes purpose, key features, recent updates, and relevance to AI development.",
          { feedItem: item },
          1,
          now,
        ),
      );
    });

    paperItems.forEach((item, idx) => {
      features.push(
        toFeature(
          `P${idx + 1}`,
          "paper_summary",
          `Summarize research paper: ${item.title}`,
          "Summary includes main contribution, methodology, results, and implications.",
          { feedItem: item },
          2,
          now,
        ),
      );
    });

    // Add anomaly tasks based on metric deltas vs previous day
    if (prevSnapshot?.dashboardMetrics && snapshot.dashboardMetrics) {
      try {
        const prevTech = prevSnapshot.dashboardMetrics.techReadiness;
        const curTech = snapshot.dashboardMetrics.techReadiness;
        const techDelta =
          Math.abs(curTech.existing - prevTech.existing) +
          Math.abs(curTech.emerging - prevTech.emerging) +
          Math.abs(curTech.sciFi - prevTech.sciFi);
        if (techDelta >= 3) {
          features.push(
            toFeature(
              "M1",
              "metric_anomaly",
              "Investigate tech readiness swings vs yesterday",
              "Explain the drivers behind the readiness bucket changes with supporting evidence.",
              {
                previous: prevTech,
                current: curTech,
              },
              3,
              now,
            ),
          );
        }

        const prevCaps = prevSnapshot.dashboardMetrics.capabilities || [];
        const curCaps = snapshot.dashboardMetrics.capabilities || [];
        const capDrops = curCaps.filter((c: any, i: number) => {
          const prev = prevCaps[i];
          return prev && typeof prev.score === "number" && c.score < prev.score - 0.15;
        });
        if (capDrops.length > 0) {
          features.push(
            toFeature(
              "M2",
              "metric_anomaly",
              "Investigate capability score drops vs yesterday",
              "Identify which signals caused capability scores to fall and whether it is noise or trend.",
              { drops: capDrops, previous: prevCaps, current: curCaps },
              3,
              now,
            ),
          );
        }
      } catch (err) {
        console.warn("[dailyBriefInitializer] delta analysis failed", err);
      }
    }

    const goal = `Daily Morning Brief follow-ups for ${snapshot.dateString}`;

    const progressLog = [
      {
        ts: now,
        status: "info",
        message: "Initializer seeded daily brief backlog",
        meta: {
          snapshotId: args.snapshotId,
          repoTasks: repoItems.length,
          paperTasks: paperItems.length,
        },
      },
    ];

    const context = {
      briefDate: snapshot.dateString,
      snapshotSummary: snapshot.sourceSummary,
      dashboardMetrics: snapshot.dashboardMetrics,
      previousDashboardMetrics: prevSnapshot?.dashboardMetrics ?? null,
      topFeedItems: topNews,
      topRepos: repoItems,
      topPapers: paperItems,
      systemTimeUTC: now,
    };

    const memoryId = await ctx.runMutation(
      internal.domains.research.dailyBriefMemoryMutations.createMemory,
      {
        snapshotId: args.snapshotId,
        dateString: snapshot.dateString,
        generatedAt: snapshot.generatedAt,
        version: snapshot.version,
        goal,
        features,
        context,
        progressLog,
      },
    );

    return { memoryId };
  },
});
