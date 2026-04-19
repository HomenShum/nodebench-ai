/**
 * diligenceRunTelemetry — persistence for orchestrator emit traces.
 *
 * Role (agentic_reliability.md):
 *   - BOUND: listRecentRuns caps results. Telemetry rows are write-once;
 *     a separate scheduled job trims rows older than 90 days.
 *   - HONEST_STATUS: status is "created" | "updated" | "stale" | "error".
 *     Failed emits land with status="error" + errorMessage populated.
 *   - DETERMINISTIC: no wall-clock or randomness in the record path — the
 *     caller supplies startedAt/endedAt. Replaying a row through the judge
 *     produces the same verdict byte-for-byte.
 *
 * Contract with server/pipeline/diligenceProjectionWriter.ts:
 *   - recordTelemetry is called from emitDiligenceProjectionInstrumented's
 *     onTelemetry hook.
 *   - Fire-and-forget: telemetry failures must NEVER break the write path
 *     (the writer swallows errors from onTelemetry).
 *
 * Canonical reference:
 *   docs/architecture/PIPELINE_OPERATIONAL_STANDARD.md
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

const TELEMETRY_SCHEMA_VERSION = 1;
const MAX_RECENT_RUNS = 200;

const STATUS_VALIDATOR = v.union(
  v.literal("created"),
  v.literal("updated"),
  v.literal("stale"),
  v.literal("error"),
);

/**
 * Append a telemetry row. Called after each emitDiligenceProjectionInstrumented
 * settles (success OR failure). HONEST_STATUS: failing emits record status="error".
 *
 * Returns `{ id }` so the caller can pass it into recordVerdict (diligenceJudge)
 * if it wants to attach the inline judge result atomically.
 */
export const recordTelemetry = mutation({
  args: {
    entitySlug: v.string(),
    blockType: v.string(),
    scratchpadRunId: v.string(),
    version: v.number(),
    overallTier: v.string(),
    headerText: v.string(),
    status: STATUS_VALIDATOR,
    startedAt: v.number(),
    endedAt: v.number(),
    toolCalls: v.optional(v.number()),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    sourceCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Defensive: guard against swapped timestamps (DETERMINISTIC invariant —
    // elapsedMs should never be negative).
    const elapsedMs = Math.max(0, args.endedAt - args.startedAt);
    const id = await ctx.db.insert("diligenceRunTelemetry", {
      entitySlug: args.entitySlug,
      blockType: args.blockType,
      scratchpadRunId: args.scratchpadRunId,
      version: args.version,
      overallTier: args.overallTier,
      headerText: args.headerText,
      status: args.status,
      startedAt: args.startedAt,
      endedAt: args.endedAt,
      elapsedMs,
      toolCalls: args.toolCalls,
      tokensIn: args.tokensIn,
      tokensOut: args.tokensOut,
      sourceCount: args.sourceCount,
      errorMessage: args.errorMessage,
      schemaVersion: TELEMETRY_SCHEMA_VERSION,
    });
    return { id };
  },
});

/**
 * Most-recent telemetry rows for a specific entity — used by the operator
 * panel that surfaces "last N emits for this entity".
 * BOUND: MAX_RECENT_RUNS cap applied.
 */
export const listForEntity = query({
  args: {
    entitySlug: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, MAX_RECENT_RUNS));
    const rows = await ctx.db
      .query("diligenceRunTelemetry")
      .withIndex("by_entity", (q) => q.eq("entitySlug", args.entitySlug))
      .order("desc")
      .take(limit);
    return rows;
  },
});

/**
 * Global recent runs across the pipeline — used by the system health
 * dashboard. Sorted by startedAt desc via the by_started index.
 * BOUND: MAX_RECENT_RUNS cap applied.
 */
export const listRecentRuns = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(STATUS_VALIDATOR),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 100, MAX_RECENT_RUNS));
    if (args.status) {
      return await ctx.db
        .query("diligenceRunTelemetry")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    }
    return await ctx.db
      .query("diligenceRunTelemetry")
      .withIndex("by_started")
      .order("desc")
      .take(limit);
  },
});

/**
 * Aggregate rollup for the telemetry dashboard header. Computes pass rate,
 * p50/p95 latency, and error count over the last N runs. HONEST_SCORES —
 * every metric is computed from the actual rows, not a hardcoded floor.
 */
export const rollupRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 200, MAX_RECENT_RUNS));
    const rows = await ctx.db
      .query("diligenceRunTelemetry")
      .withIndex("by_started")
      .order("desc")
      .take(limit);
    if (rows.length === 0) {
      return {
        total: 0,
        errors: 0,
        created: 0,
        updated: 0,
        stale: 0,
        errorRate: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        meanLatencyMs: 0,
      };
    }
    const latencies = rows.map((r) => r.elapsedMs).sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
    const mean = latencies.reduce((acc, n) => acc + n, 0) / latencies.length;
    const errors = rows.filter((r) => r.status === "error").length;
    const created = rows.filter((r) => r.status === "created").length;
    const updated = rows.filter((r) => r.status === "updated").length;
    const stale = rows.filter((r) => r.status === "stale").length;
    return {
      total: rows.length,
      errors,
      created,
      updated,
      stale,
      errorRate: errors / rows.length,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      meanLatencyMs: Math.round(mean),
    };
  },
});
