import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../../_generated/dataModel";

/**
 * Utility function to safely extract and validate user ID from authentication
 * Handles malformed user IDs with pipe characters that may come from auth providers
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
    userId = rawUserId as Id<"users">;
  }

  // Verify user exists
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found. Please sign out and sign back in.");
  }

  return userId;
}

/**
 * List all agent timelines for the current user
 */
export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getSafeUserId(ctx);

    const timelines = await ctx.db
      .query("agentTimelines")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .order("desc")
      .collect();

    return timelines.map((timeline) => ({
      timelineId: timeline._id,
      title: timeline.name,
      updatedAt: timeline.updatedAt,
      documentId: timeline.documentId,
      baseStartMs: timeline.baseStartMs,
      latestRunAt: timeline.latestRunAt,
    }));
  },
});

/**
 * Get timeline by document ID
 */
export const getByDocumentId = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);

    // Find timeline for this document
    const timeline = await ctx.db
      .query("agentTimelines")
      .filter((q) => q.eq(q.field("documentId"), args.documentId))
      .first();

    if (!timeline) {
      return null;
    }

    // Check authorization
    if (timeline.createdBy !== userId) {
      return null; // Return null instead of throwing for non-owner
    }

    // Get associated tasks
    const tasks = await ctx.db
      .query("agentTasks")
      .filter((q) => q.eq(q.field("timelineId"), timeline._id))
      .collect();

    // Get associated links
    const links = await ctx.db
      .query("agentLinks")
      .filter((q) => q.eq(q.field("timelineId"), timeline._id))
      .collect();

    return {
      ...timeline,
      tasks,
      links,
    };
  },
});

/**
 * Get a specific timeline by ID
 */
export const getByTimelineId = query({
  args: { timelineId: v.id("agentTimelines") },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const timeline = await ctx.db.get(args.timelineId);

    if (!timeline) {
      return null;
    }

    // Check authorization
    if (timeline.createdBy !== userId) {
      throw new Error("Not authorized to view this timeline");
    }

    // Get associated tasks
    const tasks = await ctx.db
      .query("agentTasks")
      .filter((q) => q.eq(q.field("timelineId"), args.timelineId))
      .collect();

    // Get associated links
    const links = await ctx.db
      .query("agentLinks")
      .filter((q) => q.eq(q.field("timelineId"), args.timelineId))
      .collect();

    return {
      ...timeline,
      tasks,
      links,
    };
  },
});

/**
 * Create a new timeline for a document
 */
export const createForDocument = mutation({
  args: {
    documentId: v.id("documents"),
    name: v.string(),
    baseStartMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);

    // Verify document exists and user has access
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    if (document.createdBy !== userId && !document.isPublic) {
      throw new Error("Not authorized to create timeline for this document");
    }

    const now = Date.now();
    const timelineId = await ctx.db.insert("agentTimelines", {
      documentId: args.documentId,
      name: args.name,
      baseStartMs: args.baseStartMs,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return timelineId;
  },
});

/**
 * List agent tasks by thread ID (for Fast Agent Panel Tasks Tab)
 * Returns hierarchical agent orchestration tasks for the given thread
 */
export const listAgentTasksByThread = query({
  args: { agentThreadId: v.string() },
  handler: async (ctx, args) => {
    // Find the timeline associated with this thread
    // For now, we'll query all agentTasks and filter
    // In production, we'd add an agentThreadId index to agentTimelines
    
    const allTasks = await ctx.db
      .query("agentTasks")
      .order("desc")
      .take(100);
    
    // Return tasks sorted by creation time
    return allTasks.map(task => ({
      _id: task._id,
      name: task.name,
      status: task.status ?? "pending",
      agentType: task.agentType ?? "main",
      progress: task.progress ?? 0,
      description: task.description,
      parentId: task.parentId,
      startedAtMs: task.startedAtMs,
      completedAtMs: task.completedAtMs,
      elapsedMs: task.elapsedMs,
      inputTokens: task.inputTokens,
      outputTokens: task.outputTokens,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
  },
});

/**
 * Apply a plan to a timeline (placeholder for future implementation)
 */
export const applyPlan = mutation({
  args: {
    timelineId: v.id("agentTimelines"),
    plan: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const timeline = await ctx.db.get(args.timelineId);

    if (!timeline) {
      throw new Error("Timeline not found");
    }

    if (timeline.createdBy !== userId) {
      throw new Error("Not authorized to modify this timeline");
    }

    // Update timeline with plan data
    await ctx.db.patch(args.timelineId, {
      updatedAt: Date.now(),
    });

    // TODO: Implement plan application logic
    // This would create agentTasks and agentLinks based on the plan

    return { success: true };
  },
});

