// DaaS queries — bounded reads with pagination-safe defaults.
//
// Agentic reliability:
//   BOUND_READ — every query caps the number of rows returned (MAX_ROWS).
//   HONEST_SCORES — returns raw stored values, no silent floors.
//   ERROR_BOUNDARY — queries throw on invalid arguments (validated by Convex).

import { v } from "convex/values";
import { query } from "../../_generated/server";

const MAX_ROWS = 200;

// ── List recent runs (joined view for the /daas page) ───────────────────────

export const listRuns = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      traceId: v.string(),
      sessionId: v.string(),
      sourceModel: v.string(),
      sourceSystem: v.optional(v.string()),
      query: v.string(),
      totalCostUsd: v.number(),
      totalTokens: v.number(),
      durationMs: v.number(),
      createdAt: v.number(),
      hasSpec: v.boolean(),
      specId: v.optional(v.id("daasWorkflowSpecs")),
      workerCount: v.optional(v.number()),
      toolCount: v.optional(v.number()),
      latestReplayCostUsd: v.optional(v.number()),
      latestReplayTokens: v.optional(v.number()),
      latestVerdict: v.optional(v.string()),
      latestSimilarity: v.optional(v.number()),
      latestCostDeltaPct: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, { limit }) => {
    const cap = Math.max(1, Math.min(MAX_ROWS, limit ?? 50));
    const traces = await ctx.db
      .query("daasTraces")
      .withIndex("by_createdAt")
      .order("desc")
      .take(cap);

    const out: Array<any> = [];
    for (const trace of traces) {
      const spec = await ctx.db
        .query("daasWorkflowSpecs")
        .withIndex("by_sourceTraceId", (q) => q.eq("sourceTraceId", trace.sessionId))
        .order("desc")
        .first();
      const replay = await ctx.db
        .query("daasReplays")
        .withIndex("by_traceId", (q) => q.eq("traceId", trace.sessionId))
        .order("desc")
        .first();
      const judgment = replay
        ? await ctx.db
            .query("daasJudgments")
            .withIndex("by_replayId", (q) => q.eq("replayId", replay._id))
            .order("desc")
            .first()
        : null;

      out.push({
        traceId: trace._id,
        sessionId: trace.sessionId,
        sourceModel: trace.sourceModel,
        sourceSystem: trace.sourceSystem,
        query: trace.query,
        totalCostUsd: trace.totalCostUsd,
        totalTokens: trace.totalTokens,
        durationMs: trace.durationMs,
        createdAt: trace.createdAt,
        hasSpec: Boolean(spec),
        specId: spec?._id,
        workerCount: spec?.workerCount,
        toolCount: spec?.toolCount,
        latestReplayCostUsd: replay?.replayCostUsd,
        latestReplayTokens: replay?.replayTokens,
        latestVerdict: judgment?.verdict,
        latestSimilarity: judgment?.outputSimilarity,
        latestCostDeltaPct: judgment?.costDeltaPct,
      });
    }
    return out;
  },
});

// ── Full run detail (one trace + its spec + replays + judgments) ────────────

export const getRun = query({
  args: {
    sessionId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      trace: v.object({
        _id: v.id("daasTraces"),
        sessionId: v.string(),
        sourceModel: v.string(),
        sourceSystem: v.optional(v.string()),
        query: v.string(),
        finalAnswer: v.string(),
        totalCostUsd: v.number(),
        totalTokens: v.number(),
        durationMs: v.number(),
        repoContextJson: v.optional(v.string()),
        createdAt: v.number(),
      }),
      spec: v.union(
        v.null(),
        v.object({
          _id: v.id("daasWorkflowSpecs"),
          executorModel: v.string(),
          targetSdk: v.string(),
          workerCount: v.number(),
          toolCount: v.number(),
          handoffCount: v.number(),
          specJson: v.string(),
          distillCostUsd: v.number(),
          distillTokens: v.number(),
          createdAt: v.number(),
        }),
      ),
      replays: v.array(
        v.object({
          _id: v.id("daasReplays"),
          executorModel: v.string(),
          replayAnswer: v.string(),
          replayCostUsd: v.number(),
          replayTokens: v.number(),
          workersDispatched: v.array(v.string()),
          connectorMode: v.string(),
          durationMs: v.number(),
          createdAt: v.number(),
          judgment: v.union(
            v.null(),
            v.object({
              _id: v.id("daasJudgments"),
              outputSimilarity: v.number(),
              costDeltaPct: v.number(),
              toolParity: v.number(),
              qualityScore: v.number(),
              verdict: v.string(),
              detailsJson: v.string(),
              judgedAt: v.number(),
            }),
          ),
        }),
      ),
    }),
  ),
  handler: async (ctx, { sessionId }) => {
    const trace = await ctx.db
      .query("daasTraces")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .first();
    if (!trace) return null;

    const specRow = await ctx.db
      .query("daasWorkflowSpecs")
      .withIndex("by_sourceTraceId", (q) => q.eq("sourceTraceId", sessionId))
      .order("desc")
      .first();

    const replayRows = await ctx.db
      .query("daasReplays")
      .withIndex("by_traceId", (q) => q.eq("traceId", sessionId))
      .order("desc")
      .take(20);

    const replays: Array<any> = [];
    for (const r of replayRows) {
      const j = await ctx.db
        .query("daasJudgments")
        .withIndex("by_replayId", (q) => q.eq("replayId", r._id))
        .order("desc")
        .first();
      replays.push({
        _id: r._id,
        executorModel: r.executorModel,
        replayAnswer: r.replayAnswer,
        replayCostUsd: r.replayCostUsd,
        replayTokens: r.replayTokens,
        workersDispatched: r.workersDispatched,
        connectorMode: r.connectorMode,
        durationMs: r.durationMs,
        createdAt: r.createdAt,
        judgment: j
          ? {
              _id: j._id,
              outputSimilarity: j.outputSimilarity,
              costDeltaPct: j.costDeltaPct,
              toolParity: j.toolParity,
              qualityScore: j.qualityScore,
              verdict: j.verdict,
              detailsJson: j.detailsJson,
              judgedAt: j.judgedAt,
            }
          : null,
      });
    }

    return {
      trace: {
        _id: trace._id,
        sessionId: trace.sessionId,
        sourceModel: trace.sourceModel,
        sourceSystem: trace.sourceSystem,
        query: trace.query,
        finalAnswer: trace.finalAnswer,
        totalCostUsd: trace.totalCostUsd,
        totalTokens: trace.totalTokens,
        durationMs: trace.durationMs,
        repoContextJson: trace.repoContextJson,
        createdAt: trace.createdAt,
      },
      spec: specRow
        ? {
            _id: specRow._id,
            executorModel: specRow.executorModel,
            targetSdk: specRow.targetSdk,
            workerCount: specRow.workerCount,
            toolCount: specRow.toolCount,
            handoffCount: specRow.handoffCount,
            specJson: specRow.specJson,
            distillCostUsd: specRow.distillCostUsd,
            distillTokens: specRow.distillTokens,
            createdAt: specRow.createdAt,
          }
        : null,
      replays,
    };
  },
});

// ── Aggregate stats (for the hero strip on /daas) ───────────────────────────

export const getAggregateStats = query({
  args: {},
  returns: v.object({
    totalRuns: v.number(),
    totalReplays: v.number(),
    totalJudgments: v.number(),
    avgCostDeltaPct: v.number(),
    avgSimilarity: v.number(),
    passCount: v.number(),
    partialCount: v.number(),
    failCount: v.number(),
  }),
  handler: async (ctx) => {
    const traces = await ctx.db.query("daasTraces").take(MAX_ROWS);
    const replays = await ctx.db.query("daasReplays").take(MAX_ROWS);
    const judgments = await ctx.db.query("daasJudgments").take(MAX_ROWS);

    let totalCostDelta = 0;
    let totalSimilarity = 0;
    let pass = 0;
    let partial = 0;
    let fail = 0;
    for (const j of judgments) {
      totalCostDelta += j.costDeltaPct;
      totalSimilarity += j.outputSimilarity;
      if (j.verdict === "pass") pass++;
      else if (j.verdict === "partial") partial++;
      else if (j.verdict === "fail") fail++;
    }
    const n = judgments.length || 1;

    return {
      totalRuns: traces.length,
      totalReplays: replays.length,
      totalJudgments: judgments.length,
      avgCostDeltaPct: totalCostDelta / n,
      avgSimilarity: totalSimilarity / n,
      passCount: pass,
      partialCount: partial,
      failCount: fail,
    };
  },
});
