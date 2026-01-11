/**
 * agentHubQueries.ts
 *
 * Query functions for the Agents Hub UI.
 * Provides agent status, stats, and aggregated data for the dashboard.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import type { Id, Doc } from "../../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get aggregated agent statistics
 */
export const getAgentStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        totalAgents: 6,
        activeNow: 0,
        tasksCompleted: 0,
        successRate: 0,
      };
    }

    // Get user's swarms
    const swarms = await ctx.db
      .query("agentSwarms")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .collect();

    const completed = swarms.filter((s) => s.status === "completed").length;
    const failed = swarms.filter((s) => s.status === "failed").length;
    const total = completed + failed;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const activeSwarms = swarms.filter((s) =>
      ["pending", "spawning", "executing", "gathering", "synthesizing"].includes(s.status)
    );

    // Count unique active agents
    let activeAgentCount = 0;
    for (const swarm of activeSwarms) {
      const tasks = await ctx.db
        .query("swarmAgentTasks")
        .withIndex("by_swarm", (q) => q.eq("swarmId", swarm.swarmId))
        .filter((q) => q.eq(q.field("status"), "running"))
        .collect();
      activeAgentCount += tasks.length;
    }

    return {
      totalAgents: 6, // Fixed count of available agent types
      activeNow: activeAgentCount,
      tasksCompleted: completed,
      successRate,
    };
  },
});

/**
 * Get individual agent status by type
 */
export const getAgentStatusByType = query({
  args: {
    agentType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { status: "idle", lastActivity: null, tasksCompleted: 0 };
    }

    // Map agent type to agent name used in swarm tasks
    const agentNameMap: Record<string, string> = {
      coordinator: "Coordinator",
      document: "DocumentAgent",
      media: "MediaAgent",
      sec: "SECAgent",
      openbb: "OpenBBAgent",
      arbitrage: "EntityResearchAgent",
    };

    const agentName = agentNameMap[args.agentType];
    if (!agentName) {
      return { status: "idle", lastActivity: null, tasksCompleted: 0 };
    }

    // Get recent tasks for this agent type
    const tasks = await ctx.db
      .query("swarmAgentTasks")
      .filter((q) => q.eq(q.field("agentName"), agentName))
      .order("desc")
      .take(100);

    // Filter to user's tasks by checking the swarm
    const userTasks: Doc<"swarmAgentTasks">[] = [];
    for (const task of tasks) {
      const swarm = await ctx.db
        .query("agentSwarms")
        .withIndex("by_swarm", (q) => q.eq("swarmId", task.swarmId))
        .first() as Doc<"agentSwarms"> | null;
      if (swarm && swarm.userId === userId) {
        userTasks.push(task);
      }
    }

    // Determine current status
    const runningTask = userTasks.find((t) => t.status === "running");
    const status = runningTask ? "running" : "idle";

    // Get last activity
    const lastTask = userTasks[0];
    const lastActivity = lastTask?.completedAt || lastTask?.createdAt || null;

    // Count completed tasks
    const completedCount = userTasks.filter((t) => t.status === "completed").length;

    return {
      status,
      lastActivity,
      tasksCompleted: completedCount,
      currentTask: runningTask?.query || null,
    };
  },
});

/**
 * Get all agent statuses for dashboard
 */
export const getAllAgentStatuses = query({
  args: {},
  handler: async (ctx) => {
    const agentTypes = ["coordinator", "document", "media", "sec", "openbb", "arbitrage"];

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return agentTypes.map((type) => ({
        agentType: type,
        status: "idle" as const,
        lastActivity: null,
        tasksCompleted: 0,
        currentTask: null,
      }));
    }

    const agentNameMap: Record<string, string> = {
      coordinator: "Coordinator",
      document: "DocumentAgent",
      media: "MediaAgent",
      sec: "SECAgent",
      openbb: "OpenBBAgent",
      arbitrage: "EntityResearchAgent",
    };

    // Get all recent swarm tasks
    const allTasks = await ctx.db
      .query("swarmAgentTasks")
      .order("desc")
      .take(500);

    // Get user's swarms for filtering
    const userSwarms = await ctx.db
      .query("agentSwarms")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .collect();
    const userSwarmIds = new Set(userSwarms.map((s) => s.swarmId));

    // Filter to user's tasks
    const userTasks = allTasks.filter((t) => userSwarmIds.has(t.swarmId));

    // Build status for each agent type
    return agentTypes.map((agentType) => {
      const agentName = agentNameMap[agentType];
      const agentTasks = userTasks.filter((t) => t.agentName === agentName);

      const runningTask = agentTasks.find((t) => t.status === "running");
      const status = runningTask ? "running" : "idle";

      const lastTask = agentTasks[0];
      const lastActivity = lastTask?.completedAt || lastTask?.createdAt || null;

      const completedCount = agentTasks.filter((t) => t.status === "completed").length;

      return {
        agentType,
        status,
        lastActivity,
        tasksCompleted: completedCount,
        currentTask: runningTask?.query || null,
      };
    });
  },
});

/**
 * Get active swarms for the hub
 */
export const getActiveSwarms = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const swarms = await ctx.db
      .query("agentSwarms")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .order("desc")
      .take(args.limit || 10);

    // Enrich with task counts
    const enrichedSwarms = await Promise.all(
      swarms.map(async (swarm) => {
        const tasks = await ctx.db
          .query("swarmAgentTasks")
          .withIndex("by_swarm", (q) => q.eq("swarmId", swarm.swarmId))
          .collect();

        const running = tasks.filter((t) => t.status === "running").length;
        const completed = tasks.filter((t) => t.status === "completed" || t.status === "failed").length;

        return {
          ...swarm,
          taskCount: tasks.length,
          runningCount: running,
          completedCount: completed,
        };
      })
    );

    return enrichedSwarms;
  },
});
