import { v } from "convex/values";
import { query, internalQuery } from "../../../_generated/server";

/**
 * Get the autopilot schedule for the current user.
 */
export const getSchedule = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    return await ctx.db
      .query("batchAutopilotSchedules")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});

/**
 * Get recent batch runs for the current user.
 */
export const getRecentRuns = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("batchAutopilotRuns")
      .withIndex("by_started")
      .order("desc")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .take(limit || 20);
  },
});

// ── Internal queries (for runner/scheduler) ─────────────────────────────────

export const _getRunById = internalQuery({
  args: { runId: v.id("batchAutopilotRuns") },
  handler: async (ctx, { runId }) => {
    return await ctx.db.get(runId);
  },
});

export const _getScheduleById = internalQuery({
  args: { scheduleId: v.id("batchAutopilotSchedules") },
  handler: async (ctx, { scheduleId }) => {
    return await ctx.db.get(scheduleId);
  },
});
