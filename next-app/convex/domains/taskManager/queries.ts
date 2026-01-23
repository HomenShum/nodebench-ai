/**
 * Task Manager Queries
 *
 * Provides public and authenticated queries for task sessions, traces, and spans.
 * Public queries support unauthenticated access for cron job monitoring.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id, Doc } from "../../_generated/dataModel";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PUBLIC QUERIES (Unauthenticated Access)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Get public task sessions (for cron job monitoring, public demos)
 * No authentication required - returns only visibility: "public" sessions
 */
export const getPublicTaskSessions = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    )),
    type: v.optional(v.union(
      v.literal("cron"),
      v.literal("scheduled"),
      v.literal("agent"),
      v.literal("swarm"),
    )),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Query public sessions by visibility index
    let sessionsQuery = ctx.db
      .query("agentTaskSessions")
      .withIndex("by_visibility_date", (q) => q.eq("visibility", "public"))
      .order("desc");

    const sessions = await sessionsQuery.take(limit + 1);

    // Apply filters in memory (Convex doesn't support complex compound filters)
    let filtered = sessions.filter((s) => {
      if (args.status && s.status !== args.status) return false;
      if (args.type && s.type !== args.type) return false;
      if (args.dateFrom && s.startedAt < args.dateFrom) return false;
      if (args.dateTo && s.startedAt > args.dateTo) return false;
      return true;
    });

    const hasMore = filtered.length > limit;
    if (hasMore) filtered = filtered.slice(0, limit);

    return {
      sessions: filtered.map((s) => ({
        _id: s._id,
        title: s.title,
        description: s.description,
        type: s.type,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        totalDurationMs: s.totalDurationMs,
        totalTokens: s.totalTokens,
        cronJobName: s.cronJobName,
        toolsUsed: s.toolsUsed,
        agentsInvolved: s.agentsInvolved,
        errorMessage: s.errorMessage,
      })),
      hasMore,
      nextCursor: hasMore ? filtered[filtered.length - 1]?._id : undefined,
    };
  },
});

/**
 * Get cron job execution history
 * No authentication required - shows scheduled job runs
 */
export const getCronJobHistory = query({
  args: {
    cronJobName: v.optional(v.string()),
    limit: v.optional(v.number()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    let sessionsQuery;

    if (args.cronJobName) {
      // Query by specific cron job
      sessionsQuery = ctx.db
        .query("agentTaskSessions")
        .withIndex("by_cron", (q) => q.eq("cronJobName", args.cronJobName))
        .order("desc");
    } else {
      // Query all cron sessions
      sessionsQuery = ctx.db
        .query("agentTaskSessions")
        .withIndex("by_type_date", (q) => q.eq("type", "cron"))
        .order("desc");
    }

    const sessions = await sessionsQuery.take(limit);

    // Apply date filters
    const filtered = sessions.filter((s) => {
      if (args.dateFrom && s.startedAt < args.dateFrom) return false;
      if (args.dateTo && s.startedAt > args.dateTo) return false;
      return true;
    });

    // Group by cron job name for summary
    const byCronJob = new Map<string, typeof filtered>();
    for (const session of filtered) {
      const key = session.cronJobName ?? "unknown";
      if (!byCronJob.has(key)) byCronJob.set(key, []);
      byCronJob.get(key)!.push(session);
    }

    return {
      sessions: filtered,
      byCronJob: Object.fromEntries(byCronJob),
      totalRuns: filtered.length,
      successCount: filtered.filter((s) => s.status === "completed").length,
      failureCount: filtered.filter((s) => s.status === "failed").length,
    };
  },
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUTHENTICATED QUERIES (User-specific)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Utility function to safely extract and validate user ID from authentication
 */
async function getSafeUserId(ctx: any): Promise<Id<"users">> {
  const rawUserId = await getAuthUserId(ctx);
  if (!rawUserId) {
    throw new Error("Not authenticated");
  }

  // Handle malformed user IDs with pipe characters
  let userId: Id<"users">;
  if (typeof rawUserId === "string" && rawUserId.includes("|")) {
    const userIdPart = rawUserId.split("|")[0];
    if (!userIdPart || userIdPart.length < 10) {
      throw new Error("Invalid user ID format. Please sign out and sign back in.");
    }
    userId = userIdPart as Id<"users">;
  } else {
    userId = rawUserId;
  }

  return userId;
}

/**
 * Get task sessions for the authenticated user
 */
export const getUserTaskSessions = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    )),
    type: v.optional(v.union(
      v.literal("manual"),
      v.literal("cron"),
      v.literal("scheduled"),
      v.literal("agent"),
      v.literal("swarm"),
    )),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const limit = args.limit ?? 50;

    // Query user sessions by user_date index
    const sessionsQuery = ctx.db
      .query("agentTaskSessions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc");

    const sessions = await sessionsQuery.take(limit + 1);

    // Apply filters
    let filtered = sessions.filter((s) => {
      if (args.status && s.status !== args.status) return false;
      if (args.type && s.type !== args.type) return false;
      if (args.dateFrom && s.startedAt < args.dateFrom) return false;
      if (args.dateTo && s.startedAt > args.dateTo) return false;
      return true;
    });

    const hasMore = filtered.length > limit;
    if (hasMore) filtered = filtered.slice(0, limit);

    return {
      sessions: filtered,
      hasMore,
      nextCursor: hasMore ? filtered[filtered.length - 1]?._id : undefined,
    };
  },
});

/**
 * Get detailed view of a specific task session with all traces
 */
export const getTaskSessionDetail = query({
  args: {
    sessionId: v.id("agentTaskSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId) as Doc<"agentTaskSessions"> | null;

    if (!session) {
      return null;
    }

    // Check authorization - public sessions are accessible to all
    if (session.visibility === "private") {
      const userId = await getSafeUserId(ctx);
      if (session.userId !== userId) {
        throw new Error("Not authorized to view this session");
      }
    }

    // Get all traces for this session
    const traces = await ctx.db
      .query("agentTaskTraces")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();

    return {
      session,
      traces,
      traceCount: traces.length,
    };
  },
});

/**
 * Get spans for a specific trace (for telemetry detail view)
 */
export const getTraceSpans = query({
  args: {
    traceId: v.id("agentTaskTraces"),
  },
  handler: async (ctx, args) => {
    const trace = await ctx.db.get(args.traceId) as Doc<"agentTaskTraces"> | null;

    if (!trace) {
      return null;
    }

    // Check authorization via the parent session
    const session = await ctx.db.get(trace.sessionId) as Doc<"agentTaskSessions"> | null;
    if (!session) {
      return null;
    }

    if (session.visibility === "private") {
      const userId = await getSafeUserId(ctx);
      if (session.userId !== userId) {
        throw new Error("Not authorized to view this trace");
      }
    }

    // Get all spans for this trace, ordered by sequence
    const spans = await ctx.db
      .query("agentTaskSpans")
      .withIndex("by_trace", (q) => q.eq("traceId", args.traceId))
      .order("asc")
      .collect();

    // Build hierarchy tree
    const rootSpans = spans.filter((s) => !s.parentSpanId);
    const childrenByParent = new Map<string, typeof spans>();

    for (const span of spans) {
      if (span.parentSpanId) {
        const parentId = span.parentSpanId as string;
        if (!childrenByParent.has(parentId)) {
          childrenByParent.set(parentId, []);
        }
        childrenByParent.get(parentId)!.push(span);
      }
    }

    return {
      trace,
      spans,
      rootSpans,
      childrenByParent: Object.fromEntries(childrenByParent),
      spanCount: spans.length,
    };
  },
});

