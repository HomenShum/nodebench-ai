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
//
// Boolean-rubric judgment: checksJson is the source of truth.
// Each check = { name: string, passed: boolean, reason: string }
// No arbitrary scores. costDeltaPct stays because it's a MEASUREMENT
// (derived from real token counts), not a score.

export const storeJudgment = mutation({
  args: {
    traceId: v.string(),
    replayId: v.id("daasReplays"),
    // Source of truth — array of boolean checks with explanations
    checksJson: v.string(),
    // Measured cost delta (real API tokens, NOT a score)
    costDeltaPct: v.number(),
    // Aggregate (derivable from checksJson but stored for fast queries)
    passedCount: v.number(),
    totalCount: v.number(),
    // Bounded verdict derived from pass rate
    verdict: v.string(),
    // Judge provenance — enables apples-to-apples rollouts
    judgeModel: v.optional(v.string()),
    rubricId: v.optional(v.string()),
    rubricVersion: v.optional(v.string()),
    // Optional extra rationale
    detailsJson: v.optional(v.string()),
  },
  returns: v.id("daasJudgments"),
  handler: async (ctx, args) => {
    const allowed = new Set<string>(DAAS_VERDICTS);
    if (!allowed.has(args.verdict)) {
      throw new Error(`verdict must be one of ${[...allowed].join(", ")}`);
    }
    if (args.passedCount < 0 || args.totalCount < 0) {
      throw new Error("passedCount/totalCount must be >= 0");
    }
    if (args.passedCount > args.totalCount) {
      throw new Error("passedCount cannot exceed totalCount");
    }
    // Validate checksJson shape (early fail = HONEST_STATUS).
    let parsed: unknown;
    try {
      parsed = JSON.parse(args.checksJson);
    } catch (e) {
      throw new Error(`checksJson is not valid JSON: ${String(e)}`);
    }
    if (!Array.isArray(parsed)) {
      throw new Error("checksJson must be a JSON array");
    }
    for (const [i, c] of parsed.entries()) {
      if (!c || typeof c !== "object") {
        throw new Error(`checksJson[${i}] must be an object`);
      }
      const obj = c as Record<string, unknown>;
      if (typeof obj.name !== "string" || obj.name.length === 0) {
        throw new Error(`checksJson[${i}].name must be non-empty string`);
      }
      if (typeof obj.passed !== "boolean") {
        throw new Error(`checksJson[${i}].passed must be boolean`);
      }
      if (typeof obj.reason !== "string") {
        throw new Error(`checksJson[${i}].reason must be string`);
      }
    }
    if (parsed.length !== args.totalCount) {
      throw new Error(
        `totalCount (${args.totalCount}) must equal checksJson length (${parsed.length})`,
      );
    }

    return await ctx.db.insert("daasJudgments", {
      traceId: args.traceId,
      replayId: args.replayId,
      passedCount: args.passedCount,
      totalCount: args.totalCount,
      costDeltaPct: args.costDeltaPct,
      verdict: args.verdict,
      checksJson: clampJson(args.checksJson, "checksJson")!,
      judgeModel: args.judgeModel,
      rubricId: args.rubricId,
      rubricVersion: args.rubricVersion,
      detailsJson: clampJson(args.detailsJson, "detailsJson"),
      judgedAt: Date.now(),
    });
  },
});
