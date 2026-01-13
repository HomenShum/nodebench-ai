/**
 * swarmQueries.ts
 *
 * Query functions for swarm state management.
 * Provides real-time subscriptions for UI updates.
 */

import { v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import type { Id, Doc } from "../../_generated/dataModel";

/**
 * Get swarm status by swarmId
 */
export const getSwarmStatus = query({
  args: {
    swarmId: v.string(),
  },
  handler: async (ctx, args) => {
    const swarm = await ctx.db
      .query("agentSwarms")
      .withIndex("by_swarm", (q) => q.eq("swarmId", args.swarmId))
      .first();

    return swarm;
  },
});

/**
 * Get swarm by thread ID - checks if a thread has an active swarm
 */
export const getSwarmByThread = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const swarm = await ctx.db
      .query("agentSwarms")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .first();

    return swarm;
  },
});

/**
 * Get all tasks for a swarm
 */
export const getSwarmTasks = query({
  args: {
    swarmId: v.string(),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("swarmAgentTasks")
      .withIndex("by_swarm", (q) => q.eq("swarmId", args.swarmId))
      .collect();

    return tasks;
  },
});

/**
 * Subscribe to swarm tasks - returns tasks with real-time status updates
 */
export const subscribeToSwarmTasks = query({
  args: {
    swarmId: v.string(),
  },
  handler: async (ctx, args) => {
    const swarm = await ctx.db
      .query("agentSwarms")
      .withIndex("by_swarm", (q) => q.eq("swarmId", args.swarmId))
      .first();

    if (!swarm) return null;

    const tasks = await ctx.db
      .query("swarmAgentTasks")
      .withIndex("by_swarm", (q) => q.eq("swarmId", args.swarmId))
      .collect();

    // Calculate progress
    const total = tasks.length;
    const completed = tasks.filter(
      (t) => t.status === "completed" || t.status === "failed"
    ).length;
    const running = tasks.filter((t) => t.status === "running").length;

    return {
      swarm,
      tasks,
      progress: {
        total,
        completed,
        running,
        pending: total - completed - running,
        percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    };
  },
});

/**
 * List active swarms for a user
 */
export const listActiveSwarms = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = args.userId || (identity ? await getUserId(ctx, identity) : null);

    if (!userId) return [];

    const swarms = await ctx.db
      .query("agentSwarms")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 10);

    return swarms;
  },
});

/**
 * List user swarms with status filter
 */
export const listUserSwarms = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("spawning"),
        v.literal("executing"),
        v.literal("gathering"),
        v.literal("synthesizing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = await getUserId(ctx, identity);
    if (!userId) return [];

    let swarmsQuery = ctx.db
      .query("agentSwarms")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    const swarms = await swarmsQuery.order("desc").take(args.limit || 20);

    // Filter by status if provided
    if (args.status) {
      return swarms.filter((s) => s.status === args.status);
    }

    return swarms;
  },
});

/**
 * Get swarm with full context (swarm + tasks + thread info)
 */
export const getSwarmWithContext = query({
  args: {
    swarmId: v.string(),
  },
  handler: async (ctx, args) => {
    const swarm = await ctx.db
      .query("agentSwarms")
      .withIndex("by_swarm", (q) => q.eq("swarmId", args.swarmId))
      .first();

    if (!swarm) return null;

    const tasks = await ctx.db
      .query("swarmAgentTasks")
      .withIndex("by_swarm", (q) => q.eq("swarmId", args.swarmId))
      .collect();

    // Get thread info
    const thread = swarm.threadId
      ? await ctx.db.get(swarm.threadId as Id<"chatThreadsStream">)
      : null;

    // Get write events for each task's delegation
    const taskEvents: Record<string, any[]> = {};
    for (const task of tasks) {
      if (task.delegationId) {
        const events = await ctx.db
          .query("agentWriteEvents")
          .withIndex("by_delegation", (q) =>
            q.eq("delegationId", task.delegationId!)
          )
          .order("asc")
          .collect();
        taskEvents[task.taskId] = events;
      }
    }

    return {
      swarm,
      tasks,
      thread,
      taskEvents,
    };
  },
});

/**
 * Check if thread has running swarm
 */
export const isThreadSwarmActive = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const swarm = await ctx.db
      .query("agentSwarms")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .first();

    if (!swarm) return { hasSwarm: false, isActive: false };

    const isActive = ["pending", "spawning", "executing", "gathering", "synthesizing"].includes(
      swarm.status
    );

    return {
      hasSwarm: true,
      isActive,
      swarmId: swarm.swarmId,
      status: swarm.status,
    };
  },
});

/**
 * Get threads with swarm info for tab bar display
 */
export const getThreadsWithSwarmInfo = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = await getUserId(ctx, identity);
    if (!userId) return [];

    // Get recent threads
    const threads = await ctx.db
      .query("chatThreadsStream")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 20);

    // Enrich with swarm status
    const enrichedThreads = await Promise.all(
      threads.map(async (thread) => {
        let swarmInfo = null;
        if (thread.swarmId) {
          const swarm = await ctx.db
            .query("agentSwarms")
            .withIndex("by_swarm", (q) => q.eq("swarmId", thread.swarmId!))
            .first();

          if (swarm) {
            const tasks = await ctx.db
              .query("swarmAgentTasks")
              .withIndex("by_swarm", (q) => q.eq("swarmId", thread.swarmId!))
              .collect();

            const completed = tasks.filter(
              (t) => t.status === "completed" || t.status === "failed"
            ).length;

            swarmInfo = {
              swarmId: swarm.swarmId,
              status: swarm.status,
              agentCount: tasks.length,
              completedCount: completed,
              isActive: ["pending", "spawning", "executing", "gathering", "synthesizing"].includes(
                swarm.status
              ),
            };
          }
        }

        return {
          ...thread,
          swarmInfo,
        };
      })
    );

    return enrichedThreads;
  },
});

// Helper to get userId from identity
async function getUserId(
  ctx: any,
  identity: any
): Promise<Id<"users"> | null> {
  /* 
   * FALLBACK: "by_email" index missing in some environments. 
   * Using filter() instead for compatibility.
   */
  const user = await ctx.db
    .query("users")
    .filter((q: any) => q.eq(q.field("email"), identity.email))
    .first();

  return user?._id || null;
}

/**
 * Get user by email - used by actions to resolve userId from auth context
 */
export const getUserByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      /*
       * FALLBACK: "by_email" index missing in some environments.
       * Using filter() instead for compatibility.
       */
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    return user;
  },
});

/**
 * Internal-only helper for smoke tests and ops tooling.
 */
export const getAnyUserIdInternal = internalQuery({
  args: {},
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    return user?._id ?? null;
  },
});
