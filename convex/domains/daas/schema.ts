// Distillation-as-a-Service domain schema.
//
// Mirrors the Python DaaS pipeline outputs (canonical_traces, workflow_specs,
// replays, judgments). Every table is bounded (BOUND) with explicit time indexes
// so pruning jobs can cap historical data. Scores + similarity are stored as-is
// from deterministic computation (HONEST_SCORES — never hardcoded floors).
//
// See:
//   docs/DISTILLATION_AS_A_SERVICE.md
//   docs/BENCHMARK_STRATEGY.md
//   daas/schemas.py (Python dataclasses this schema mirrors)

import { defineTable } from "convex/server";
import { v } from "convex/values";

/** Pipeline stage names — matches the 6-stage diagram in DISTILLATION_AS_A_SERVICE.md. */
export const DAAS_PIPELINE_STAGES = [
  "ingest",
  "normalize",
  "distill",
  "generate",
  "replay",
  "judge",
] as const;

/** Deterministic verdict set — bounded enum, same shape as Python Judgment.verdict. */
export const DAAS_VERDICTS = ["pass", "partial", "fail"] as const;

/**
 * daasTraces — one row per ingested expert-model trace.
 *
 * Source is source-agnostic: Claude Code session, existing codebase runtime
 * (e.g., FloorAI Convex agent), raw JSONL upload, etc. The Normalizer
 * collapses everything to this shape.
 */
export const daasTraces = defineTable({
  sessionId: v.string(), // user-supplied / MCP-generated ID
  sourceModel: v.string(), // e.g. "gemini-3.1-pro-preview"
  advisorModel: v.optional(v.string()),
  sourceSystem: v.optional(v.string()), // "claude-code" | "convex-agent" | "raw-jsonl" | ...
  query: v.string(),
  finalAnswer: v.string(),
  totalCostUsd: v.number(),
  totalTokens: v.number(),
  durationMs: v.number(),
  repoContextJson: v.optional(v.string()), // stringified repo_context
  stepsJson: v.optional(v.string()), // stringified list of TraceStep
  createdAt: v.number(),
})
  .index("by_sessionId", ["sessionId"])
  .index("by_sourceSystem_createdAt", ["sourceSystem", "createdAt"])
  .index("by_createdAt", ["createdAt"]);

/**
 * daasWorkflowSpecs — distilled WorkflowSpec (orchestrator + workers + tools + rules).
 *
 * One row per distilled trace. The `specJson` field holds the full structured
 * spec; callers who need fast filtering can use the denormalized columns.
 */
export const daasWorkflowSpecs = defineTable({
  sourceTraceId: v.string(), // daasTraces.sessionId
  executorModel: v.string(),
  advisorModel: v.optional(v.string()),
  targetSdk: v.string(), // "google-genai" | "openai" | "anthropic" | "langchain"
  workerCount: v.number(),
  toolCount: v.number(),
  handoffCount: v.number(),
  specJson: v.string(), // full WorkflowSpec JSON
  distillCostUsd: v.number(),
  distillTokens: v.number(),
  createdAt: v.number(),
})
  .index("by_sourceTraceId", ["sourceTraceId"])
  .index("by_createdAt", ["createdAt"]);

/**
 * daasReplays — one row per scaffold execution.
 *
 * Stores the cheap-model replay output plus measured cost/token telemetry.
 * Multiple replays can exist per spec (e.g., across runs, across executor
 * models, with different connector modes).
 */
export const daasReplays = defineTable({
  traceId: v.string(), // daasTraces.sessionId (original)
  specId: v.optional(v.id("daasWorkflowSpecs")),
  executorModel: v.string(),
  replayAnswer: v.string(),
  originalAnswer: v.string(), // denormalized for side-by-side UI
  originalCostUsd: v.number(),
  originalTokens: v.number(),
  replayCostUsd: v.number(),
  replayTokens: v.number(),
  workersDispatched: v.array(v.string()),
  toolCallsJson: v.optional(v.string()), // stringified [{worker, tool}]
  connectorMode: v.string(), // "mock" | "live" | "hybrid"
  durationMs: v.number(),
  errorMessage: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_traceId", ["traceId"])
  .index("by_specId", ["specId"])
  .index("by_createdAt", ["createdAt"]);

/**
 * daasJudgments — one row per deterministic judge pass.
 *
 * Every score here is computed (entity overlap, structural parity, cost delta)
 * — no LLM-judge floors. `verdict` is bounded to DAAS_VERDICTS.
 */
export const daasJudgments = defineTable({
  traceId: v.string(), // daasTraces.sessionId
  replayId: v.id("daasReplays"),
  outputSimilarity: v.number(), // 0..1
  costDeltaPct: v.number(), // negative = cheaper than original
  toolParity: v.number(), // 0..1
  qualityScore: v.number(), // 0..10
  verdict: v.string(), // one of DAAS_VERDICTS (validated in mutation)
  detailsJson: v.string(), // full breakdown
  judgedAt: v.number(),
})
  .index("by_traceId", ["traceId"])
  .index("by_replayId", ["replayId"])
  .index("by_verdict", ["verdict"])
  .index("by_judgedAt", ["judgedAt"]);
