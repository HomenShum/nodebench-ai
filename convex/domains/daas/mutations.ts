// DaaS mutations — bounded, validated, deterministic.
//
// Every mutation is strictly validated at the boundary (Convex v.* validators).
// Verdicts are checked against DAAS_VERDICTS (bounded enum) before insert —
// prevents free-form strings polluting dashboards downstream.
//
// Agentic reliability checklist:
//   BOUND          — max row sizes enforced via Convex document size limits +
//                    hard limits on stringified JSON fields (MAX_JSON_BYTES).
//   HONEST_STATUS  — throw on invalid input; never silently succeed.
//   HONEST_SCORES  — similarity/cost/quality stored as-is (computed upstream).
//   DETERMINISTIC  — uses stringified JSON inputs (no Date.now() side effects
//                    inside comparisons).

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { DAAS_VERDICTS } from "./schema";

const MAX_JSON_BYTES = 512 * 1024; // 512KB per JSON field (BOUND_READ equivalent)
const MAX_ANSWER_CHARS = 50_000;

function clampJson(input: string | undefined, label: string): string | undefined {
  if (input === undefined) return undefined;
  if (input.length > MAX_JSON_BYTES) {
    throw new Error(
      `daas.${label} exceeds MAX_JSON_BYTES (${input.length} > ${MAX_JSON_BYTES})`,
    );
  }
  return input;
}

function clampAnswer(input: string, label: string): string {
  if (input.length > MAX_ANSWER_CHARS) {
    // Truncate with a visible marker — agents reading this know it was cut.
    return (
      input.slice(0, MAX_ANSWER_CHARS) +
      `\n\n[TRUNCATED: ${input.length - MAX_ANSWER_CHARS} chars beyond daas.${label} cap]`
    );
  }
  return input;
}

// ── Trace ingest ─────────────────────────────────────────────────────────────

export const ingestTrace = mutation({
  args: {
    sessionId: v.string(),
    sourceModel: v.string(),
    advisorModel: v.optional(v.string()),
    sourceSystem: v.optional(v.string()),
    query: v.string(),
    finalAnswer: v.string(),
    totalCostUsd: v.number(),
    totalTokens: v.number(),
    durationMs: v.number(),
    repoContextJson: v.optional(v.string()),
    stepsJson: v.optional(v.string()),
  },
  returns: v.id("daasTraces"),
  handler: async (ctx, args) => {
    if (args.totalCostUsd < 0) throw new Error("totalCostUsd must be >= 0");
    if (args.totalTokens < 0) throw new Error("totalTokens must be >= 0");
    if (args.durationMs < 0) throw new Error("durationMs must be >= 0");

    return await ctx.db.insert("daasTraces", {
      sessionId: args.sessionId,
      sourceModel: args.sourceModel,
      advisorModel: args.advisorModel,
      sourceSystem: args.sourceSystem,
      query: clampAnswer(args.query, "query"),
      finalAnswer: clampAnswer(args.finalAnswer, "finalAnswer"),
      totalCostUsd: args.totalCostUsd,
      totalTokens: args.totalTokens,
      durationMs: args.durationMs,
      repoContextJson: clampJson(args.repoContextJson, "repoContextJson"),
      stepsJson: clampJson(args.stepsJson, "stepsJson"),
      createdAt: Date.now(),
    });
  },
});

// ── WorkflowSpec persist ─────────────────────────────────────────────────────

export const storeWorkflowSpec = mutation({
  args: {
    sourceTraceId: v.string(),
    executorModel: v.string(),
    advisorModel: v.optional(v.string()),
    targetSdk: v.string(),
    workerCount: v.number(),
    toolCount: v.number(),
    handoffCount: v.number(),
    specJson: v.string(),
    distillCostUsd: v.number(),
    distillTokens: v.number(),
  },
  returns: v.id("daasWorkflowSpecs"),
  handler: async (ctx, args) => {
    if (args.workerCount < 0) throw new Error("workerCount must be >= 0");
    if (args.toolCount < 0) throw new Error("toolCount must be >= 0");
    if (args.handoffCount < 0) throw new Error("handoffCount must be >= 0");
    if (args.distillCostUsd < 0) throw new Error("distillCostUsd must be >= 0");

    return await ctx.db.insert("daasWorkflowSpecs", {
      sourceTraceId: args.sourceTraceId,
      executorModel: args.executorModel,
      advisorModel: args.advisorModel,
      targetSdk: args.targetSdk,
      workerCount: args.workerCount,
      toolCount: args.toolCount,
      handoffCount: args.handoffCount,
      specJson: clampJson(args.specJson, "specJson")!,
      distillCostUsd: args.distillCostUsd,
      distillTokens: args.distillTokens,
      createdAt: Date.now(),
    });
  },
});

// ── Replay persist ───────────────────────────────────────────────────────────

export const storeReplay = mutation({
  args: {
    traceId: v.string(),
    specId: v.optional(v.id("daasWorkflowSpecs")),
    executorModel: v.string(),
    replayAnswer: v.string(),
    originalAnswer: v.string(),
    originalCostUsd: v.number(),
    originalTokens: v.number(),
    replayCostUsd: v.number(),
    replayTokens: v.number(),
    workersDispatched: v.array(v.string()),
    toolCallsJson: v.optional(v.string()),
    connectorMode: v.string(),
    durationMs: v.number(),
    errorMessage: v.optional(v.string()),
  },
  returns: v.id("daasReplays"),
  handler: async (ctx, args) => {
    const allowedConnectorModes = new Set(["mock", "live", "hybrid"]);
    if (!allowedConnectorModes.has(args.connectorMode)) {
      throw new Error(`connectorMode must be one of ${[...allowedConnectorModes].join(", ")}`);
    }
    if (args.originalCostUsd < 0 || args.replayCostUsd < 0) {
      throw new Error("costs must be >= 0");
    }

    return await ctx.db.insert("daasReplays", {
      traceId: args.traceId,
      specId: args.specId,
      executorModel: args.executorModel,
      replayAnswer: clampAnswer(args.replayAnswer, "replayAnswer"),
      originalAnswer: clampAnswer(args.originalAnswer, "originalAnswer"),
      originalCostUsd: args.originalCostUsd,
      originalTokens: args.originalTokens,
      replayCostUsd: args.replayCostUsd,
      replayTokens: args.replayTokens,
      workersDispatched: args.workersDispatched,
      toolCallsJson: clampJson(args.toolCallsJson, "toolCallsJson"),
      connectorMode: args.connectorMode,
      durationMs: args.durationMs,
      errorMessage: args.errorMessage,
      createdAt: Date.now(),
    });
  },
});

// ── Judgment persist ─────────────────────────────────────────────────────────

export const storeJudgment = mutation({
  args: {
    traceId: v.string(),
    replayId: v.id("daasReplays"),
    outputSimilarity: v.number(),
    costDeltaPct: v.number(),
    toolParity: v.number(),
    qualityScore: v.number(),
    verdict: v.string(),
    detailsJson: v.string(),
  },
  returns: v.id("daasJudgments"),
  handler: async (ctx, args) => {
    const allowed = new Set<string>(DAAS_VERDICTS);
    if (!allowed.has(args.verdict)) {
      throw new Error(`verdict must be one of ${[...allowed].join(", ")}`);
    }
    if (args.outputSimilarity < 0 || args.outputSimilarity > 1) {
      throw new Error("outputSimilarity must be in [0,1]");
    }
    if (args.toolParity < 0 || args.toolParity > 1) {
      throw new Error("toolParity must be in [0,1]");
    }
    if (args.qualityScore < 0 || args.qualityScore > 10) {
      throw new Error("qualityScore must be in [0,10]");
    }

    return await ctx.db.insert("daasJudgments", {
      traceId: args.traceId,
      replayId: args.replayId,
      outputSimilarity: args.outputSimilarity,
      costDeltaPct: args.costDeltaPct,
      toolParity: args.toolParity,
      qualityScore: args.qualityScore,
      verdict: args.verdict,
      detailsJson: clampJson(args.detailsJson, "detailsJson")!,
      judgedAt: Date.now(),
    });
  },
});
