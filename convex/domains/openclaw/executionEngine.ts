/**
 * OpenClaw Execution Engine â€” Execution logging and result capture
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
 * is in the openclaw-mcp-nodebench package â€” this action logs to Convex
 * for persistent audit trail across sessions.
 */
export const executeSkill = internalAction({
  args: {
    userId: v.id("users"),
    sessionId: v.id("openclawSessions"),
    skillName: v.string(),
    skillArgs: v.optional(v.any()),
    justification: v.optional(v.string()),
    agentId: v.optional(v.string()),
    policyId: v.optional(v.string()),
    policyRuleName: v.optional(v.string()),
    channelId: v.optional(v.string()),
    sessionKey: v.optional(v.string()),
    direction: v.optional(
      v.union(
        v.literal("inbound"),
        v.literal("decision"),
        v.literal("draft"),
        v.literal("approval"),
        v.literal("outbound"),
        v.literal("error"),
      )
    ),
    deployment: v.optional(v.string()),
    evidenceRefs: v.optional(v.array(v.string())),
    actionSummary: v.optional(v.string()),
    canUndo: v.optional(v.boolean()),
    undoInstructions: v.optional(v.string()),
    requiresApproval: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const t0 = Date.now();
    const requiresApproval = args.requiresApproval ?? false;
    const resultStatus = requiresApproval ? "approval_required" : "success";

    // Log the execution attempt
    const execId = await ctx.runMutation(
      internal.domains.openclaw.executionEngine.logExecution,
      {
        sessionId: args.sessionId,
        userId: args.userId,
        skillName: args.skillName,
        args: args.skillArgs,
        resultStatus,
        durationMs: Date.now() - t0,
      }
    );

    await ctx.runAction(
      internal.domains.agents.receipts.actionReceipts.emitReceipt,
      {
        agentId: args.agentId ?? "openclaw-agent",
        userId: args.userId,
        toolName: args.skillName,
        sessionKey: args.sessionKey,
        channelId: args.channelId,
        direction: args.direction ?? "draft",
        openclawSessionId: args.sessionId,
        openclawExecutionId: execId,
        deployment: args.deployment ?? "openclaw",
        params: args.skillArgs,
        actionSummary:
          args.actionSummary ??
          `OpenClaw ${requiresApproval ? "drafted" : "executed"} ${args.skillName}`,
        policyId: args.policyId ?? "pol_openclaw_default",
        policyRuleName: args.policyRuleName ?? "OpenClaw default policy",
        policyAction: requiresApproval ? "escalated" : "allowed",
        evidenceRefs: args.evidenceRefs ?? [],
        resultSuccess: !requiresApproval,
        resultSummary: requiresApproval
          ? `Held for approval before ${args.skillName} can execute`
          : `${args.skillName} completed in ${Date.now() - t0}ms`,
        resultOutputHash: undefined,
        canUndo: args.canUndo ?? false,
        undoInstructions: args.undoInstructions,
        approvalState: requiresApproval ? "pending" : "not_required",
        violations: requiresApproval
          ? [
              {
                ruleId: "rule_openclaw_approval_required",
                ruleName: "Approval Required",
                severity: "warning",
                description: `OpenClaw action ${args.skillName} requires human approval before execution`,
                resolution: "Review the receipt in the approval queue and approve or deny it.",
              },
            ]
          : [],
      },
    );

    return {
      executionId: execId,
      skillName: args.skillName,
      status: resultStatus,
      approvalState: requiresApproval ? "pending" : "not_required",
      durationMs: Date.now() - t0,
    };
  },
});
