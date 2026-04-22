/**
 * Task Manager Mutations
 *
 * CRUD operations for task sessions, traces, and spans.
 * Designed for integration with existing agent infrastructure.
 */

import { v } from "convex/values";
import { mutation, internalMutation } from "../../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id, Doc } from "../../../_generated/dataModel";

const oracleSourceRefValidator = v.object({
  label: v.string(),
  href: v.optional(v.string()),
  note: v.optional(v.string()),
  kind: v.optional(v.string()),
});

const executionTraceStageValidator = v.union(
  v.literal("ingest"),
  v.literal("inspect"),
  v.literal("research"),
  v.literal("propose"),
  v.literal("edit"),
  v.literal("verify"),
  v.literal("export"),
  v.literal("summarize"),
);

const executionTraceStepTypeValidator = v.union(
  v.literal("task_started"),
  v.literal("file_loaded"),
  v.literal("sheet_inspected"),
  v.literal("format_detected"),
  v.literal("research_query_executed"),
  v.literal("evidence_attached"),
  v.literal("decision_recorded"),
  v.literal("cells_updated"),
  v.literal("comment_added"),
  v.literal("style_changed"),
  v.literal("render_generated"),
  v.literal("issue_detected"),
  v.literal("issue_fixed"),
  v.literal("verification_passed"),
  v.literal("artifact_exported"),
  v.literal("task_completed"),
);

const verificationStatusValidator = v.union(
  v.literal("passed"),
  v.literal("warning"),
  v.literal("failed"),
  v.literal("fixed"),
);

type ExecutionTraceStage =
  | "ingest"
  | "inspect"
  | "research"
  | "propose"
  | "edit"
  | "verify"
  | "export"
  | "summarize";

type ExecutionTraceStepType =
  | "task_started"
  | "file_loaded"
  | "sheet_inspected"
  | "format_detected"
  | "research_query_executed"
  | "evidence_attached"
  | "decision_recorded"
  | "cells_updated"
  | "comment_added"
  | "style_changed"
  | "render_generated"
  | "issue_detected"
  | "issue_fixed"
  | "verification_passed"
  | "artifact_exported"
  | "task_completed";

type VerificationStatus = "passed" | "warning" | "failed" | "fixed";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UTILITY FUNCTIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Generate a unique trace ID (OpenTelemetry-compatible format)
 */
function generateTraceId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "trace_";
  for (let i = 0; i < 32; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function appendMetadataList(
  existingMetadata: unknown,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const nextMetadata = toRecord(existingMetadata) ?? {};
  const existing = Array.isArray(nextMetadata[key]) ? [...(nextMetadata[key] as unknown[])] : [];
  existing.push(value);
  return {
    ...nextMetadata,
    [key]: existing,
  };
}

function uniqueSourceRefs(
  refs: Array<{
    label: string;
    href?: string;
    note?: string;
    kind?: string;
  }>,
) {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.label}|${ref.href ?? ""}|${ref.note ?? ""}|${ref.kind ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapSessionTypeToExecutionType(
  type: Doc<"agentTaskSessions">["type"],
): "swarm" | "tree" | "chat" | "forecast_refresh" | "linkedin_post" {
  switch (type) {
    case "swarm":
      return "swarm";
    case "cron":
    case "scheduled":
      return "forecast_refresh";
    case "agent":
    case "manual":
    default:
      return "chat";
  }
}

function inferSpanTypeFromStage(
  stage: ExecutionTraceStage,
): Doc<"agentTaskSpans">["spanType"] {
  switch (stage) {
    case "research":
      return "retrieval";
    case "propose":
      return "generation";
    case "verify":
      return "guardrail";
    default:
      return "custom";
  }
}

async function getNextSpanSequence(
  ctx: { db: any },
  traceId: Id<"agentTaskTraces">,
) {
  const existingSpans = await ctx.db
    .query("agentTaskSpans")
    .withIndex("by_trace", (q: any) => q.eq("traceId", traceId))
    .collect();
  return existingSpans.length;
}

async function getSpanDepth(
  ctx: { db: any },
  parentSpanId?: Id<"agentTaskSpans">,
) {
  if (!parentSpanId) return 0;
  const parent = await ctx.db.get(parentSpanId);
  return parent ? parent.depth + 1 : 0;
}

async function appendTraceAuditEntry(
  ctx: { db: any },
  trace: Doc<"agentTaskTraces">,
  session: Doc<"agentTaskSessions">,
  spanSeq: number,
  toolName: string,
  toolParams: unknown,
  success: boolean,
  durationMs: number,
  description: string,
  summary: string,
) {
  await ctx.db.insert("traceAuditEntries", {
    executionId: trace.traceId,
    executionType: mapSessionTypeToExecutionType(session.type),
    workflowTag: trace.workflowName,
    seq: spanSeq,
    timestamp: Date.now(),
    choiceType: success ? "execute_data_op" : "finalize",
    toolName,
    toolParams,
    metadata: {
      durationMs,
      success,
      deliverySummary: summary,
      intendedState: description,
      actualState: summary,
    },
    description,
    createdAt: Date.now(),
  });
}

/**
 * Utility function to safely extract and validate user ID from authentication
 */
async function getSafeUserId(ctx: any): Promise<Id<"users"> | null> {
  const rawUserId = await getAuthUserId(ctx);
  if (!rawUserId) {
    return null;
  }

  // Handle malformed user IDs with pipe characters
  let userId: Id<"users">;
  if (typeof rawUserId === "string" && rawUserId.includes("|")) {
    const userIdPart = rawUserId.split("|")[0];
    if (!userIdPart || userIdPart.length < 10) {
      return null;
    }
    userId = userIdPart as Id<"users">;
  } else {
    userId = rawUserId;
  }

  return userId;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SESSION MUTATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Create a new task session
 * Used when starting agent runs, cron jobs, or manual tasks
 */
export const createSession = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("manual"),
      v.literal("cron"),
      v.literal("scheduled"),
      v.literal("agent"),
      v.literal("swarm"),
    ),
    visibility: v.union(
      v.literal("public"),
      v.literal("private"),
    ),
    cronJobName: v.optional(v.string()),
    agentRunId: v.optional(v.id("agentRuns")),
    agentThreadId: v.optional(v.string()),
    swarmId: v.optional(v.string()),
    goalId: v.optional(v.string()),
    visionSnapshot: v.optional(v.string()),
    successCriteria: v.optional(v.array(v.string())),
    sourceRefs: v.optional(v.array(v.object({
      label: v.string(),
      href: v.optional(v.string()),
      note: v.optional(v.string()),
      kind: v.optional(v.string()),
    }))),
    crossCheckStatus: v.optional(v.union(
      v.literal("aligned"),
      v.literal("drifting"),
      v.literal("violated"),
    )),
    metadata: v.optional(v.any()),
  },
  returns: v.id("agentTaskSessions"),
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const now = Date.now();

    const sessionId = await ctx.db.insert("agentTaskSessions", {
      title: args.title,
      description: args.description,
      type: args.type,
      visibility: args.visibility,
      userId: userId ?? undefined,
      status: "pending",
      startedAt: now,
      cronJobName: args.cronJobName,
      agentRunId: args.agentRunId,
      agentThreadId: args.agentThreadId,
      swarmId: args.swarmId,
      goalId: args.goalId,
      visionSnapshot: args.visionSnapshot,
      successCriteria: args.successCriteria,
      sourceRefs: args.sourceRefs,
      crossCheckStatus: args.crossCheckStatus,
      metadata: args.metadata,
    });

    return sessionId;
  },
});

/**
 * Update session status (for starting, completing, failing)
 */
export const updateSessionStatus = mutation({
  args: {
    sessionId: v.id("agentTaskSessions"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    errorMessage: v.optional(v.string()),
    errorStack: v.optional(v.string()),
    crossCheckStatus: v.optional(v.union(
      v.literal("aligned"),
      v.literal("drifting"),
      v.literal("violated"),
    )),
    deltaFromVision: v.optional(v.string()),
    dogfoodRunId: v.optional(v.id("dogfoodQaRuns")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const updates: Partial<Doc<"agentTaskSessions">> = {
      status: args.status,
    };

    // Set completion time for terminal states
    if (["completed", "failed", "cancelled"].includes(args.status)) {
      updates.completedAt = Date.now();
      updates.totalDurationMs = Date.now() - session.startedAt;
    }

    if (args.errorMessage) {
      updates.errorMessage = args.errorMessage;
    }
    if (args.errorStack) {
      updates.errorStack = args.errorStack;
    }
    if (args.crossCheckStatus) {
      updates.crossCheckStatus = args.crossCheckStatus;
    }
    if (args.deltaFromVision !== undefined) {
      updates.deltaFromVision = args.deltaFromVision;
    }
    if (args.dogfoodRunId) {
      updates.dogfoodRunId = args.dogfoodRunId;
    }

    await ctx.db.patch(args.sessionId, updates);
  },
});

/**
 * Update session metrics (aggregated from traces/spans)
 */
export const updateSessionMetrics = mutation({
  args: {
    sessionId: v.id("agentTaskSessions"),
    totalTokens: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    toolsUsed: v.optional(v.array(v.string())),
    agentsInvolved: v.optional(v.array(v.string())),
    estimatedCostUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      totalTokens: args.totalTokens,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      toolsUsed: args.toolsUsed,
      agentsInvolved: args.agentsInvolved,
      estimatedCostUsd: args.estimatedCostUsd,
    });
  },
});

export const updateSessionOracleContext = mutation({
  args: {
    sessionId: v.id("agentTaskSessions"),
    goalId: v.optional(v.string()),
    visionSnapshot: v.optional(v.string()),
    successCriteria: v.optional(v.array(v.string())),
    sourceRefs: v.optional(v.array(v.object({
      label: v.string(),
      href: v.optional(v.string()),
      note: v.optional(v.string()),
      kind: v.optional(v.string()),
    }))),
    crossCheckStatus: v.optional(v.union(
      v.literal("aligned"),
      v.literal("drifting"),
      v.literal("violated"),
    )),
    deltaFromVision: v.optional(v.string()),
    dogfoodRunId: v.optional(v.id("dogfoodQaRuns")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, {
      goalId: args.goalId ?? session.goalId,
      visionSnapshot: args.visionSnapshot ?? session.visionSnapshot,
      successCriteria: args.successCriteria ?? session.successCriteria,
      sourceRefs: args.sourceRefs ?? session.sourceRefs,
      crossCheckStatus: args.crossCheckStatus ?? session.crossCheckStatus,
      deltaFromVision: args.deltaFromVision ?? session.deltaFromVision,
      dogfoodRunId: args.dogfoodRunId ?? session.dogfoodRunId,
    });
  },
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INTERNAL SESSION MUTATIONS (for cron wrapper and actions)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Start a new task session (internal, for use in actions)
 */
export const startSession = internalMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("manual"),
      v.literal("cron"),
      v.literal("scheduled"),
      v.literal("agent"),
      v.literal("swarm"),
    ),
    visibility: v.union(
      v.literal("public"),
      v.literal("private"),
    ),
    cronJobName: v.optional(v.string()),
    agentRunId: v.optional(v.id("agentRuns")),
    agentThreadId: v.optional(v.string()),
    swarmId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("agentTaskSessions"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const sessionId = await ctx.db.insert("agentTaskSessions", {
      title: args.title,
      description: args.description,
      type: args.type,
      visibility: args.visibility,
      status: "running",
      startedAt: now,
      cronJobName: args.cronJobName,
      agentRunId: args.agentRunId,
      agentThreadId: args.agentThreadId,
      swarmId: args.swarmId,
      metadata: args.metadata,
    });

    return sessionId;
  },
});

/**
 * Complete a task session successfully (internal, for use in actions)
 */
export const completeSession = internalMutation({
  args: {
    sessionId: v.id("agentTaskSessions"),
    completedAt: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    toolsUsed: v.optional(v.array(v.string())),
    agentsInvolved: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const totalTokens = (args.inputTokens ?? 0) + (args.outputTokens ?? 0);
    const totalDurationMs = args.completedAt - session.startedAt;

    await ctx.db.patch(args.sessionId, {
      status: "completed",
      completedAt: args.completedAt,
      totalDurationMs,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens,
      toolsUsed: args.toolsUsed,
      agentsInvolved: args.agentsInvolved,
      metadata: args.metadata ? { ...session.metadata, ...args.metadata } : undefined,
    });
  },
});

/**
 * Fail a task session (internal, for use in actions)
 */
export const failSession = internalMutation({
  args: {
    sessionId: v.id("agentTaskSessions"),
    completedAt: v.number(),
    errorMessage: v.string(),
    errorStack: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    toolsUsed: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const totalTokens = (args.inputTokens ?? 0) + (args.outputTokens ?? 0);
    const totalDurationMs = args.completedAt - session.startedAt;

    await ctx.db.patch(args.sessionId, {
      status: "failed",
      completedAt: args.completedAt,
      totalDurationMs,
      errorMessage: args.errorMessage,
      errorStack: args.errorStack,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens,
      toolsUsed: args.toolsUsed,
    });
  },
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TRACE MUTATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Create a new trace within a session
 */
export const createTrace = mutation({
  args: {
    sessionId: v.id("agentTaskSessions"),
    workflowName: v.string(),
    groupId: v.optional(v.string()),
    model: v.optional(v.string()),
    goalId: v.optional(v.string()),
    visionSnapshot: v.optional(v.string()),
    successCriteria: v.optional(v.array(v.string())),
    sourceRefs: v.optional(v.array(v.object({
      label: v.string(),
      href: v.optional(v.string()),
      note: v.optional(v.string()),
      kind: v.optional(v.string()),
    }))),
    crossCheckStatus: v.optional(v.union(
      v.literal("aligned"),
      v.literal("drifting"),
      v.literal("violated"),
    )),
    metadata: v.optional(v.any()),
  },
  returns: v.id("agentTaskTraces"),
  handler: async (ctx, args) => {
    const traceId = generateTraceId();
    const now = Date.now();

    const id = await ctx.db.insert("agentTaskTraces", {
      sessionId: args.sessionId,
      traceId,
      workflowName: args.workflowName,
      groupId: args.groupId,
      goalId: args.goalId,
      visionSnapshot: args.visionSnapshot,
      successCriteria: args.successCriteria,
      sourceRefs: args.sourceRefs,
      crossCheckStatus: args.crossCheckStatus,
      status: "running",
      startedAt: now,
      model: args.model,
      metadata: args.metadata,
    });

    return id;
  },
});

/**
 * Complete a trace
 */
export const completeTrace = mutation({
  args: {
    traceId: v.id("agentTaskTraces"),
    status: v.union(v.literal("completed"), v.literal("error")),
    tokenUsage: v.optional(v.object({
      input: v.number(),
      output: v.number(),
      total: v.number(),
    })),
    estimatedCostUsd: v.optional(v.number()),
    crossCheckStatus: v.optional(v.union(
      v.literal("aligned"),
      v.literal("drifting"),
      v.literal("violated"),
    )),
    deltaFromVision: v.optional(v.string()),
    dogfoodRunId: v.optional(v.id("dogfoodQaRuns")),
  },
  handler: async (ctx, args) => {
    const trace = await ctx.db.get(args.traceId);
    if (!trace) {
      throw new Error("Trace not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.traceId, {
      status: args.status,
      endedAt: now,
      totalDurationMs: now - trace.startedAt,
      tokenUsage: args.tokenUsage,
      estimatedCostUsd: args.estimatedCostUsd,
      crossCheckStatus: args.crossCheckStatus ?? trace.crossCheckStatus,
      deltaFromVision: args.deltaFromVision ?? trace.deltaFromVision,
      dogfoodRunId: args.dogfoodRunId ?? trace.dogfoodRunId,
    });
  },
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SPAN MUTATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Create a new span within a trace
 */
export const createSpan = mutation({
  args: {
    traceId: v.id("agentTaskTraces"),
    parentSpanId: v.optional(v.id("agentTaskSpans")),
    spanType: v.union(
      v.literal("agent"),
      v.literal("generation"),
      v.literal("tool"),
      v.literal("guardrail"),
      v.literal("handoff"),
      v.literal("retrieval"),
      v.literal("delegation"),
      v.literal("custom"),
    ),
    name: v.string(),
    data: v.optional(v.any()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("agentTaskSpans"),
  handler: async (ctx, args) => {
    const seq = await getNextSpanSequence(ctx, args.traceId);
    const depth = await getSpanDepth(ctx, args.parentSpanId);

    const id = await ctx.db.insert("agentTaskSpans", {
      traceId: args.traceId,
      parentSpanId: args.parentSpanId,
      seq,
      depth,
      spanType: args.spanType,
      name: args.name,
      status: "running",
      startedAt: Date.now(),
      data: args.data,
      metadata: args.metadata,
    });

    return id;
  },
});

export const recordStep = mutation({
  args: {
    traceId: v.id("agentTaskTraces"),
    parentSpanId: v.optional(v.id("agentTaskSpans")),
    stage: executionTraceStageValidator,
    type: executionTraceStepTypeValidator,
    title: v.string(),
    tool: v.string(),
    action: v.string(),
    target: v.string(),
    resultSummary: v.string(),
    evidenceRefs: v.optional(v.array(v.string())),
    artifactsOut: v.optional(v.array(v.string())),
    verification: v.optional(v.array(v.string())),
    confidence: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("agentTaskSpans"),
  handler: async (ctx, args) => {
    const trace = await ctx.db.get(args.traceId);
    if (!trace) {
      throw new Error("Trace not found");
    }
    const session = await ctx.db.get(trace.sessionId);
    if (!session) {
      throw new Error("Parent session not found");
    }

    const seq = await getNextSpanSequence(ctx, args.traceId);
    const depth = await getSpanDepth(ctx, args.parentSpanId);
    const startedAt = args.startedAt ?? Date.now();
    const endedAt = args.endedAt ?? startedAt;
    const durationMs = Math.max(0, endedAt - startedAt);
    const stepPayload = {
      stage: args.stage,
      type: args.type,
      title: args.title,
      tool: args.tool,
      action: args.action,
      target: args.target,
      resultSummary: args.resultSummary,
      evidenceRefs: args.evidenceRefs ?? [],
      artifactsOut: args.artifactsOut ?? [],
      verification: args.verification ?? [],
      confidence: args.confidence,
    };

    const spanId = await ctx.db.insert("agentTaskSpans", {
      traceId: args.traceId,
      parentSpanId: args.parentSpanId,
      seq,
      depth,
      spanType: inferSpanTypeFromStage(args.stage),
      name: args.title,
      status: "completed",
      startedAt,
      endedAt,
      durationMs,
      data: {
        executionTraceStep: stepPayload,
      },
      metadata: {
        summary: args.resultSummary,
        ...toRecord(args.metadata),
      },
    });

    await appendTraceAuditEntry(
      ctx,
      trace,
      session,
      seq,
      args.tool,
      {
        action: args.action,
        target: args.target,
      },
      true,
      durationMs,
      `${args.title} (${args.stage})`,
      args.resultSummary,
    );

    return spanId;
  },
});

export const recordDecision = mutation({
  args: {
    traceId: v.id("agentTaskTraces"),
    decisionType: v.string(),
    statement: v.string(),
    basis: v.array(v.string()),
    evidenceRefs: v.optional(v.array(v.string())),
    alternativesConsidered: v.optional(v.array(v.string())),
    confidence: v.optional(v.number()),
    limitations: v.optional(v.array(v.string())),
  },
  returns: v.id("agentTaskTraces"),
  handler: async (ctx, args) => {
    const trace = await ctx.db.get(args.traceId);
    if (!trace) {
      throw new Error("Trace not found");
    }

    const decision = {
      decisionType: args.decisionType,
      statement: args.statement,
      basis: args.basis,
      evidenceRefs: args.evidenceRefs ?? [],
      alternativesConsidered: args.alternativesConsidered ?? [],
      confidence: args.confidence,
      limitations: args.limitations ?? [],
      recordedAt: Date.now(),
    };

    const metadata = appendMetadataList(trace.metadata, "executionTraceDecisions", decision);
    metadata.decisions = metadata.executionTraceDecisions;

    await ctx.db.patch(args.traceId, {
      metadata,
    });

    return args.traceId;
  },
});

export const recordVerification = mutation({
  args: {
    traceId: v.id("agentTaskTraces"),
    label: v.string(),
    status: verificationStatusValidator,
    details: v.string(),
    relatedArtifactIds: v.optional(v.array(v.string())),
    createGuardrailSpan: v.optional(v.boolean()),
  },
  returns: v.id("agentTaskTraces"),
  handler: async (ctx, args) => {
    const trace = await ctx.db.get(args.traceId);
    if (!trace) {
      throw new Error("Trace not found");
    }
    const session = await ctx.db.get(trace.sessionId);
    if (!session) {
      throw new Error("Parent session not found");
    }

    const verification = {
      label: args.label,
      status: args.status,
      details: args.details,
      relatedArtifactIds: args.relatedArtifactIds ?? [],
      recordedAt: Date.now(),
    };

    const metadata = appendMetadataList(trace.metadata, "executionTraceVerificationChecks", verification);
    metadata.verificationChecks = metadata.executionTraceVerificationChecks;

    await ctx.db.patch(args.traceId, {
      metadata,
    });

    if (args.createGuardrailSpan ?? true) {
      const seq = await getNextSpanSequence(ctx, args.traceId);
      await ctx.db.insert("agentTaskSpans", {
        traceId: args.traceId,
        seq,
        depth: 0,
        spanType: "guardrail",
        name: args.label,
        status: args.status === "failed" ? "error" : "completed",
        startedAt: Date.now(),
        endedAt: Date.now(),
        durationMs: 0,
        data: {
          executionTraceVerification: verification,
          executionTraceStep: {
            stage: "verify",
            type: args.status === "fixed" ? "issue_fixed" : args.status === "failed" ? "issue_detected" : "verification_passed",
            title: args.label,
            tool: "verification",
            action: "record_verification",
            target: args.label,
            resultSummary: args.details,
            evidenceRefs: [],
            artifactsOut: args.relatedArtifactIds ?? [],
            verification: [args.details],
          },
        },
        metadata: {
          summary: args.details,
        },
        error:
          args.status === "failed"
            ? {
                message: args.details,
              }
            : undefined,
      });

      await appendTraceAuditEntry(
        ctx,
        trace,
        session,
        seq,
        "verification",
        {
          label: args.label,
          status: args.status,
        },
        args.status !== "failed",
        0,
        `Verification recorded: ${args.label}`,
        args.details,
      );
    }

    return args.traceId;
  },
});

export const attachEvidence = mutation({
  args: {
    traceId: v.id("agentTaskTraces"),
    title: v.string(),
    summary: v.string(),
    sourceRefs: v.array(oracleSourceRefValidator),
    supportedClaims: v.optional(v.array(v.string())),
    unsupportedClaims: v.optional(v.array(v.string())),
  },
  returns: v.id("agentTaskTraces"),
  handler: async (ctx, args) => {
    const trace = await ctx.db.get(args.traceId);
    if (!trace) {
      throw new Error("Trace not found");
    }

    const evidence = {
      title: args.title,
      summary: args.summary,
      sourceRefs: args.sourceRefs,
      supportedClaims: args.supportedClaims ?? [],
      unsupportedClaims: args.unsupportedClaims ?? [],
      recordedAt: Date.now(),
    };

    const metadata = appendMetadataList(trace.metadata, "executionTraceEvidence", evidence);
    metadata.evidenceCatalog = metadata.executionTraceEvidence;

    const mergedSourceRefs = uniqueSourceRefs([
      ...(trace.sourceRefs ?? []),
      ...args.sourceRefs,
    ]);

    await ctx.db.patch(args.traceId, {
      metadata,
      sourceRefs: mergedSourceRefs,
    });

    return args.traceId;
  },
});

export const requestTraceApproval = mutation({
  args: {
    sessionId: v.id("agentTaskSessions"),
    traceId: v.optional(v.id("agentTaskTraces")),
    toolName: v.string(),
    toolArgs: v.optional(v.any()),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    justification: v.string(),
  },
  returns: v.id("toolApprovals"),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    if (!session.userId) {
      throw new Error("Session is missing a userId for approval routing");
    }

    const threadId = session.agentThreadId ?? `task-session:${String(args.sessionId)}`;
    const approvalId = await ctx.db.insert("toolApprovals", {
      userId: session.userId,
      threadId,
      toolName: args.toolName,
      toolArgs: {
        ...(toRecord(args.toolArgs) ?? {}),
        justification: args.justification,
        sessionId: String(args.sessionId),
        traceId: args.traceId ? String(args.traceId) : undefined,
      },
      status: "pending",
      riskLevel: args.riskLevel,
      reason: args.justification,
      createdAt: Date.now(),
    });

    if (args.traceId) {
      const trace = await ctx.db.get(args.traceId);
      if (trace) {
        const metadata = appendMetadataList(trace.metadata, "executionTraceApprovals", {
          approvalId: String(approvalId),
          toolName: args.toolName,
          riskLevel: args.riskLevel,
          justification: args.justification,
          status: "pending",
          recordedAt: Date.now(),
        });
        await ctx.db.patch(args.traceId, { metadata });
      }
    }

    return approvalId;
  },
});

/**
 * Complete a span
 */
export const completeSpan = mutation({
  args: {
    spanId: v.id("agentTaskSpans"),
    status: v.union(v.literal("completed"), v.literal("error")),
    data: v.optional(v.any()),
    error: v.optional(v.object({
      message: v.string(),
      code: v.optional(v.string()),
      stack: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const span = await ctx.db.get(args.spanId);
    if (!span) {
      throw new Error("Span not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.spanId, {
      status: args.status,
      endedAt: now,
      durationMs: now - span.startedAt,
      data: args.data ?? span.data,
      error: args.error,
    });
  },
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SEED DATA (for testing)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Seed sample task sessions for testing the Task Manager UI
 */
export const seedSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getSafeUserId(ctx);
    const now = Date.now();

    const sessions = [
      {
        title: "Research Market Trends",
        description: "Analyzed Q4 2025 market trends for semiconductor industry. Collected data from 15 sources including industry reports, news articles, and financial filings.",
        type: "manual" as const,
        status: "completed" as const,
        visibility: "public" as const,
        startedAt: now - 3600000, // 1 hour ago
        completedAt: now - 3500000,
        totalDurationMs: 100000,
        inputTokens: 15000,
        outputTokens: 8500,
        totalTokens: 23500,
        toolsUsed: ["web_search", "document_analysis", "summary_generator"],
      },
      {
        title: "Scheduled: Daily Signal Ingestion",
        description: "Automated daily collection of market signals from RSS feeds, news APIs, and social media monitoring. Processed 247 new signals.",
        type: "cron" as const,
        status: "completed" as const,
        visibility: "public" as const,
        cronJobName: "daily-signal-ingestion",
        startedAt: now - 7200000, // 2 hours ago
        completedAt: now - 7100000,
        totalDurationMs: 100000,
        inputTokens: 45000,
        outputTokens: 12000,
        totalTokens: 57000,
        toolsUsed: ["rss_reader", "news_api", "signal_processor"],
      },
      {
        title: "Agent: Competitor Analysis",
        description: "Deep research on competitor product launches and market positioning. Generated comprehensive comparison matrix.",
        type: "agent" as const,
        status: "running" as const,
        visibility: "private" as const,
        startedAt: now - 1800000, // 30 min ago
        inputTokens: 25000,
        outputTokens: 15000,
        totalTokens: 40000,
        toolsUsed: ["web_search", "document_analysis"],
      },
      {
        title: "Swarm: Multi-Entity Research",
        description: "Coordinated research across 5 entities: Apple, Google, Microsoft, Amazon, Meta. Each entity analyzed by dedicated sub-agent.",
        type: "swarm" as const,
        status: "completed" as const,
        visibility: "public" as const,
        startedAt: now - 86400000, // 1 day ago
        completedAt: now - 82800000,
        totalDurationMs: 3600000,
        inputTokens: 120000,
        outputTokens: 65000,
        totalTokens: 185000,
        toolsUsed: ["web_search", "entity_analyzer", "report_generator"],
      },
      {
        title: "Scheduled: Weekly Report",
        description: "Generated weekly summary report of all research activities and key findings.",
        type: "scheduled" as const,
        status: "failed" as const,
        visibility: "public" as const,
        startedAt: now - 172800000, // 2 days ago
        completedAt: now - 172700000,
        totalDurationMs: 100000,
        errorMessage: "API rate limit exceeded. Retry scheduled for next window.",
        inputTokens: 5000,
        outputTokens: 0,
        totalTokens: 5000,
        toolsUsed: ["report_generator"],
      },
    ];

    const createdIds: Id<"agentTaskSessions">[] = [];

    for (const session of sessions) {
      const sessionId = await ctx.db.insert("agentTaskSessions", {
        ...session,
        userId: userId ?? undefined,
      });
      createdIds.push(sessionId);

      // Create a trace for each session
      const traceStatus = session.status === "running" ? "running" as const : session.status === "failed" ? "error" as const : "completed" as const;
      const traceDocId = await ctx.db.insert("agentTaskTraces", {
        sessionId,
        traceId: generateTraceId(),
        workflowName: session.title,
        status: traceStatus,
        startedAt: session.startedAt,
        endedAt: session.completedAt,
        totalDurationMs: session.totalDurationMs,
        tokenUsage: {
          input: session.inputTokens,
          output: session.outputTokens,
          total: session.totalTokens,
        },
      });

      // Create sample spans for completed sessions
      if (session.status === "completed" && session.totalDurationMs) {
        // Root span
        const rootSpanId = await ctx.db.insert("agentTaskSpans", {
          traceId: traceDocId,
          seq: 0,
          depth: 0,
          spanType: "agent",
          name: "Main Execution",
          status: "completed",
          startedAt: session.startedAt,
          endedAt: session.completedAt,
          durationMs: session.totalDurationMs,
          data: {
            inputTokens: Math.floor(session.inputTokens * 0.3),
            outputTokens: Math.floor(session.outputTokens * 0.3),
          },
        });

        // Child spans
        await ctx.db.insert("agentTaskSpans", {
          traceId: traceDocId,
          parentSpanId: rootSpanId,
          seq: 1,
          depth: 1,
          spanType: "tool",
          name: "Web Search",
          status: "completed",
          startedAt: session.startedAt + 1000,
          endedAt: session.startedAt + 30000,
          durationMs: 29000,
          data: { tool: "web_search", query: "market trends 2025" },
        });

        await ctx.db.insert("agentTaskSpans", {
          traceId: traceDocId,
          parentSpanId: rootSpanId,
          seq: 2,
          depth: 1,
          spanType: "generation",
          name: "LLM Generation",
          status: "completed",
          startedAt: session.startedAt + 31000,
          endedAt: session.startedAt + 60000,
          durationMs: 29000,
          data: {
            model: "gpt-5.4-mini",
            temperature: 0.7,
            inputTokens: Math.floor(session.inputTokens * 0.7),
            outputTokens: Math.floor(session.outputTokens * 0.7),
          },
        });
      }
    }

    return { created: createdIds.length, sessionIds: createdIds };
  },
});

/**
 * Seed additional task sessions with varied dates for testing date navigation
 */
export const seedHistoricalData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getSafeUserId(ctx);
    const now = Date.now();
    const DAY = 86400000;
    const HOUR = 3600000;

    // Generate sessions across the past 7 days
    const historicalSessions = [
      // 3 days ago
      {
        title: "Cron: Morning Market Scan",
        description: "Automated morning scan of pre-market movers and overnight news.",
        type: "cron" as const,
        status: "completed" as const,
        visibility: "public" as const,
        cronJobName: "morning-market-scan",
        startedAt: now - (3 * DAY) - (8 * HOUR),
        completedAt: now - (3 * DAY) - (8 * HOUR) + 45000,
        totalDurationMs: 45000,
        inputTokens: 8000,
        outputTokens: 3500,
        totalTokens: 11500,
        toolsUsed: ["market_api", "news_aggregator"],
      },
      // 4 days ago
      {
        title: "Entity Deep Dive: Tesla",
        description: "Comprehensive analysis of Tesla's Q4 earnings, production numbers, and market sentiment.",
        type: "manual" as const,
        status: "completed" as const,
        visibility: "public" as const,
        startedAt: now - (4 * DAY) - (14 * HOUR),
        completedAt: now - (4 * DAY) - (13 * HOUR),
        totalDurationMs: HOUR,
        inputTokens: 85000,
        outputTokens: 42000,
        totalTokens: 127000,
        toolsUsed: ["web_search", "sec_filings", "sentiment_analyzer", "chart_generator"],
      },
      // 5 days ago
      {
        title: "Scheduled: Weekly Portfolio Review",
        description: "Automated weekly review of portfolio performance and risk metrics.",
        type: "scheduled" as const,
        status: "completed" as const,
        visibility: "public" as const,
        startedAt: now - (5 * DAY) - (10 * HOUR),
        completedAt: now - (5 * DAY) - (9.5 * HOUR),
        totalDurationMs: 30 * 60000,
        inputTokens: 32000,
        outputTokens: 18000,
        totalTokens: 50000,
        toolsUsed: ["portfolio_analyzer", "risk_calculator", "report_generator"],
      },
      // 6 days ago
      {
        title: "Agent: Competitive Intelligence",
        description: "Multi-source competitive intelligence gathering on top 3 competitors.",
        type: "agent" as const,
        status: "completed" as const,
        visibility: "public" as const,
        startedAt: now - (6 * DAY) - (16 * HOUR),
        completedAt: now - (6 * DAY) - (15 * HOUR),
        totalDurationMs: HOUR,
        inputTokens: 95000,
        outputTokens: 55000,
        totalTokens: 150000,
        toolsUsed: ["web_search", "patent_search", "press_release_analyzer"],
      },
      // 7 days ago
      {
        title: "Scheduled: Daily Signal Ingestion (7d ago)",
        description: "Historical daily signal ingestion from a week ago.",
        type: "cron" as const,
        status: "completed" as const,
        visibility: "public" as const,
        cronJobName: "daily-signal-ingestion",
        startedAt: now - (7 * DAY) - (6 * HOUR),
        completedAt: now - (7 * DAY) - (6 * HOUR) + 120000,
        totalDurationMs: 120000,
        inputTokens: 52000,
        outputTokens: 14000,
        totalTokens: 66000,
        toolsUsed: ["rss_reader", "news_api", "signal_processor"],
      },
      // Today - earlier
      {
        title: "Quick Research: AI Chip Market",
        description: "Brief research on latest developments in AI chip manufacturing.",
        type: "manual" as const,
        status: "completed" as const,
        visibility: "public" as const,
        startedAt: now - (4 * HOUR),
        completedAt: now - (3.5 * HOUR),
        totalDurationMs: 30 * 60000,
        inputTokens: 12000,
        outputTokens: 6000,
        totalTokens: 18000,
        toolsUsed: ["web_search", "summary_generator"],
      },
      // Yesterday
      {
        title: "Cron: Evening Digest",
        description: "End of day market summary and notable events digest.",
        type: "cron" as const,
        status: "completed" as const,
        visibility: "public" as const,
        cronJobName: "evening-digest",
        startedAt: now - DAY - (2 * HOUR),
        completedAt: now - DAY - (2 * HOUR) + 60000,
        totalDurationMs: 60000,
        inputTokens: 18000,
        outputTokens: 8000,
        totalTokens: 26000,
        toolsUsed: ["market_api", "news_aggregator", "digest_formatter"],
      },
    ];

    const createdIds: Id<"agentTaskSessions">[] = [];

    for (const session of historicalSessions) {
      const sessionId = await ctx.db.insert("agentTaskSessions", {
        ...session,
        userId: userId ?? undefined,
      });
      createdIds.push(sessionId);

      // Create a trace for each session
      const traceDocId = await ctx.db.insert("agentTaskTraces", {
        sessionId,
        traceId: generateTraceId(),
        workflowName: session.title,
        status: "completed" as const,
        startedAt: session.startedAt,
        endedAt: session.completedAt,
        totalDurationMs: session.totalDurationMs,
        tokenUsage: {
          input: session.inputTokens,
          output: session.outputTokens,
          total: session.totalTokens,
        },
      });

      // Create root span for each
      await ctx.db.insert("agentTaskSpans", {
        traceId: traceDocId,
        seq: 0,
        depth: 0,
        spanType: "agent",
        name: "Main Execution",
        status: "completed",
        startedAt: session.startedAt,
        endedAt: session.completedAt,
        durationMs: session.totalDurationMs,
        data: {
          inputTokens: session.inputTokens,
          outputTokens: session.outputTokens,
        },
      });
    }

    return { created: createdIds.length, sessionIds: createdIds };
  },
});

