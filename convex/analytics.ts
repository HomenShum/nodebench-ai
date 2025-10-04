import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get comprehensive analytics for the Roadmap Hub
 * Returns activity heatmap and statistics across all system entities
 */
export const getRoadmapAnalytics = query({
  args: {
    startDate: v.optional(v.number()), // ms since epoch
    endDate: v.optional(v.number()),   // ms since epoch
  },
  returns: v.object({
    heatmap: v.array(v.object({
      date: v.string(), // YYYY-MM-DD
      dateMs: v.number(),
      documents: v.number(),
      tasks: v.number(),
      events: v.number(),
      agentRuns: v.number(),
      chatMessages: v.number(),
      totalActivity: v.number(),
    })),
    totals: v.object({
      documents: v.number(),
      tasks: v.number(),
      events: v.number(),
      agentTimelines: v.number(),
      agentTasks: v.number(),
      chatThreads: v.number(),
      files: v.number(),
      nodes: v.number(),
    }),
    byStatus: v.object({
      tasks: v.object({
        todo: v.number(),
        in_progress: v.number(),
        done: v.number(),
        blocked: v.number(),
      }),
      events: v.object({
        confirmed: v.number(),
        tentative: v.number(),
        cancelled: v.number(),
      }),
      agentTasks: v.object({
        pending: v.number(),
        running: v.number(),
        complete: v.number(),
        paused: v.number(),
        error: v.number(),
      }),
    }),
    recentActivity: v.array(v.object({
      type: v.string(),
      title: v.string(),
      timestamp: v.number(),
      id: v.string(),
    })),
    topTags: v.array(v.object({
      name: v.string(),
      count: v.number(),
      kind: v.optional(v.string()),
    })),
  }),
  handler: async (ctx, args) => {
    // Use the same auth method as documents.ts
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        heatmap: [],
        totals: {
          documents: 0,
          tasks: 0,
          events: 0,
          agentTimelines: 0,
          agentTasks: 0,
          chatThreads: 0,
          files: 0,
          nodes: 0,
        },
        byStatus: {
          tasks: { todo: 0, in_progress: 0, done: 0, blocked: 0 },
          events: { confirmed: 0, tentative: 0, cancelled: 0 },
          agentTasks: { pending: 0, running: 0, complete: 0, paused: 0, error: 0 },
        },
        recentActivity: [],
        topTags: [],
      };
    }

    const now = Date.now();
    const startDate = args.startDate ?? now - 90 * 24 * 60 * 60 * 1000; // 90 days ago
    const endDate = args.endDate ?? now;

    // Fetch all data - documents use createdBy, tasks/events use userId
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .collect();

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const agentTimelines = await ctx.db
      .query("agentTimelines")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .collect();

    // Agent tasks don't have a user filter, get all and filter by timeline ownership
    const allAgentTasks = await ctx.db
      .query("agentTasks")
      .collect();

    const timelineIds = new Set(agentTimelines.map(t => t._id));
    const agentTasks = allAgentTasks.filter(task => timelineIds.has(task.timelineId));

    const agentRuns = await ctx.db
      .query("agentRuns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Nodes don't have user ownership - get all for now
    // TODO: Filter by document ownership if needed
    const allNodes = await ctx.db
      .query("nodes")
      .collect();

    // Filter nodes by document ownership
    const documentIds = new Set(documents.map(d => d._id));
    const nodes = allNodes.filter(node => node.documentId && documentIds.has(node.documentId));

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_name")
      .collect();

    const tagRefs = await ctx.db
      .query("tagRefs")
      .collect();

    // Build heatmap data
    const heatmapMap = new Map<string, {
      documents: number;
      tasks: number;
      events: number;
      agentRuns: number;
      chatMessages: number;
    }>();

    const getDateKey = (ms: number) => {
      const d = new Date(ms);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Aggregate documents by creation date
    documents.forEach(doc => {
      if (doc._creationTime >= startDate && doc._creationTime <= endDate) {
        const key = getDateKey(doc._creationTime);
        const entry = heatmapMap.get(key) ?? { documents: 0, tasks: 0, events: 0, agentRuns: 0, chatMessages: 0 };
        entry.documents++;
        heatmapMap.set(key, entry);
      }
    });

    // Aggregate tasks
    tasks.forEach(task => {
      if (task.createdAt >= startDate && task.createdAt <= endDate) {
        const key = getDateKey(task.createdAt);
        const entry = heatmapMap.get(key) ?? { documents: 0, tasks: 0, events: 0, agentRuns: 0, chatMessages: 0 };
        entry.tasks++;
        heatmapMap.set(key, entry);
      }
    });

    // Aggregate events
    events.forEach(event => {
      if (event.createdAt >= startDate && event.createdAt <= endDate) {
        const key = getDateKey(event.createdAt);
        const entry = heatmapMap.get(key) ?? { documents: 0, tasks: 0, events: 0, agentRuns: 0, chatMessages: 0 };
        entry.events++;
        heatmapMap.set(key, entry);
      }
    });

    // Aggregate agent runs
    agentRuns.forEach(run => {
      if (run.createdAt >= startDate && run.createdAt <= endDate) {
        const key = getDateKey(run.createdAt);
        const entry = heatmapMap.get(key) ?? { documents: 0, tasks: 0, events: 0, agentRuns: 0, chatMessages: 0 };
        entry.agentRuns++;
        heatmapMap.set(key, entry);
      }
    });

    // Convert heatmap to array and sort by date
    const heatmap = Array.from(heatmapMap.entries())
      .map(([date, data]) => ({
        date,
        dateMs: new Date(date).getTime(),
        ...data,
        totalActivity: data.documents + data.tasks + data.events + data.agentRuns + data.chatMessages,
      }))
      .sort((a, b) => a.dateMs - b.dateMs);

    // Calculate status breakdowns
    const tasksByStatus = {
      todo: tasks.filter(t => t.status === "todo").length,
      in_progress: tasks.filter(t => t.status === "in_progress").length,
      done: tasks.filter(t => t.status === "done").length,
      blocked: tasks.filter(t => t.status === "blocked").length,
    };

    const eventsByStatus = {
      confirmed: events.filter(e => e.status === "confirmed").length,
      tentative: events.filter(e => e.status === "tentative").length,
      cancelled: events.filter(e => e.status === "cancelled").length,
    };

    const agentTasksByStatus = {
      pending: agentTasks.filter(t => t.status === "pending").length,
      running: agentTasks.filter(t => t.status === "running").length,
      complete: agentTasks.filter(t => t.status === "complete").length,
      paused: agentTasks.filter(t => t.status === "paused").length,
      error: agentTasks.filter(t => t.status === "error").length,
    };

    // Get recent activity (last 20 items)
    const recentActivity: Array<{ type: string; title: string; timestamp: number; id: string }> = [];

    documents.slice(-20).forEach(doc => {
      recentActivity.push({
        type: "document",
        title: doc.title,
        timestamp: doc._creationTime,
        id: doc._id,
      });
    });

    tasks.slice(-20).forEach(task => {
      recentActivity.push({
        type: "task",
        title: task.title,
        timestamp: task.createdAt,
        id: task._id,
      });
    });

    events.slice(-20).forEach(event => {
      recentActivity.push({
        type: "event",
        title: event.title,
        timestamp: event.createdAt,
        id: event._id,
      });
    });

    agentRuns.slice(-20).forEach(run => {
      recentActivity.push({
        type: "agent_run",
        title: run.intent ?? "Agent Run",
        timestamp: run.createdAt,
        id: run._id,
      });
    });

    recentActivity.sort((a, b) => b.timestamp - a.timestamp);

    // Calculate top tags
    const tagCountMap = new Map<string, { count: number; kind?: string; name: string }>();
    tagRefs.forEach(ref => {
      const tag = tags.find(t => t._id === ref.tagId);
      if (tag) {
        const existing = tagCountMap.get(tag.name) ?? { count: 0, kind: tag.kind, name: tag.name };
        existing.count++;
        tagCountMap.set(tag.name, existing);
      }
    });

    const topTags = Array.from(tagCountMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      heatmap,
      totals: {
        documents: documents.length,
        tasks: tasks.length,
        events: events.length,
        agentTimelines: agentTimelines.length,
        agentTasks: agentTasks.length,
        chatThreads: agentRuns.length,
        files: files.length,
        nodes: nodes.length,
      },
      byStatus: {
        tasks: tasksByStatus,
        events: eventsByStatus,
        agentTasks: agentTasksByStatus,
      },
      recentActivity: recentActivity.slice(0, 20),
      topTags,
    };
  },
});

