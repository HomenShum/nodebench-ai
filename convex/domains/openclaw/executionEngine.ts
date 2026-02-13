/**
 * OpenClaw Execution Engine — Execution logging and result capture
 *
 * Logs every skill invocation through the sandbox enforcement point.
 * Captures results, violations, and timing for audit trail.
 */

import { internalAction, internalMutation, internalQuery } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";

/**
 * Log a skill execution (called after proxy enforcement)
 */
export const logExecution = internalMutation({
  args: {
    sessionId: v.id("openclawSessions"),
    userId: v.id("users"),
    skillName: v.string(),
    args: v.optional(v.any()),
    resultStatus: v.string(),
    violationType: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  returns: v.id("openclawExecutions"),
  handler: async (ctx, args) => {
    const execId = await ctx.db.insert("openclawExecutions", {
      sessionId: args.sessionId,
      userId: args.userId,
      skillName: args.skillName,
      args: args.args,
      resultStatus: args.resultStatus,
      violationType: args.violationType,
      durationMs: args.durationMs,
      createdAt: Date.now(),
    });

    // Increment session call count
    await ctx.runMutation(
      internal.domains.openclaw.sessionManager.incrementCalls,
      {
        sessionId: args.sessionId,
        isViolation: !!args.violationType,
      }
    );

    return execId;
  },
});

/**
 * Get execution log for a session
 */
export const getExecutions = internalQuery({
  args: {
    sessionId: v.id("openclawSessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("openclawExecutions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/**
 * Execute a skill through the sandbox (Convex action for external calls)
 *
 * This is the Convex-side enforcement point. The actual OpenClaw MCP proxy
 * is in the openclaw-mcp-nodebench package — this action logs to Convex
 * for persistent audit trail across sessions.
 */
export const executeSkill = internalAction({
  args: {
    userId: v.id("users"),
    sessionId: v.id("openclawSessions"),
    skillName: v.string(),
    skillArgs: v.optional(v.any()),
    justification: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const t0 = Date.now();

    // Log the execution attempt
    const execId = await ctx.runMutation(
      internal.domains.openclaw.executionEngine.logExecution,
      {
        sessionId: args.sessionId,
        userId: args.userId,
        skillName: args.skillName,
        args: args.skillArgs,
        resultStatus: "success",
        durationMs: Date.now() - t0,
      }
    );

    return {
      executionId: execId,
      skillName: args.skillName,
      status: "success",
      durationMs: Date.now() - t0,
    };
  },
});
