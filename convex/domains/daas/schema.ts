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
 * daasJudgments — one row per judge pass.
 *
 * Judge produces a bounded set of BOOLEAN CHECKS, each with an explainable
 * reason. No arbitrary floats. `checksJson` is the source of truth; every
 * other numeric field is derived:
 *   passedCount / totalCount            = aggregate pass rate
 *   costDeltaPct                        = measured from token counts (real)
 *   verdict                             = derived from pass rate thresholds
 *
 * This matches the user directive: "score should not be arbitrary numbers,
 * instead, it should be llm judged boolean explainable reasons."
 *
 * checksJson shape (validated at mutation boundary):
 *   [{ "name": string, "passed": boolean, "reason": string }]
 *
 * The judge model + rubric hash is recorded so dashboards can filter to
 * apples-to-apples comparisons across judge revisions.
 */
export const daasJudgments = defineTable({
  traceId: v.string(), // daasTraces.sessionId
  replayId: v.id("daasReplays"),

  // Real measured cost delta (kept because it's a MEASUREMENT, not a score)
  costDeltaPct: v.number(),

  // Bounded verdict derived from pass rate (see DAAS_VERDICTS)
  verdict: v.string(),

  judgedAt: v.number(),

  // Boolean-rubric shape — required. checksJson is source of truth:
  // [{ name, passed, reason }, ...]. Other fields are denormalized
  // aggregates stored for index + fast read.
  passedCount: v.number(),
  totalCount: v.number(),
  checksJson: v.string(),

  // Judge provenance (apples-to-apples rollouts across revisions)
  judgeModel: v.optional(v.string()),
  rubricId: v.optional(v.string()),
  rubricVersion: v.optional(v.string()),

  // Optional free-form rationale
  detailsJson: v.optional(v.string()),
})
  .index("by_traceId", ["traceId"])
  .index("by_replayId", ["replayId"])
  .index("by_verdict", ["verdict"])
  .index("by_judgedAt", ["judgedAt"]);

/**
 * daasApiKeys — authenticated ingest callers.
 *
 * Each row has a hashed key prefix (first 12 chars of sha256 hex for
 * index lookup — the raw key is never stored), owner label, optional
 * per-key rate-limit override, and enable flag. Admin action rotates
 * keys by toggling enabled=false and inserting a new row.
 *
 * NB: the raw key never touches Convex storage. The ingest path hashes
 * the provided header and looks up by prefix. This means a leaked DB
 * dump cannot be used to forge valid keys.
 */
export const daasApiKeys = defineTable({
  /** First 12 chars of sha256(rawKey) — enough to collision-avoid at scale we care about */
  keyHashPrefix: v.string(),
  /** Human-readable label (team name, integration name) */
  owner: v.string(),
  /** Optional per-key rate limit override. If null, falls back to global authed default */
  rateLimitPerMinute: v.optional(v.number()),
  /** When false, ingest requests with this key are rejected as if key was missing */
  enabled: v.boolean(),
  /** Optional HMAC secret for signed webhooks (see verifyIngestSignature) */
  webhookSecret: v.optional(v.string()),
  /** Last use timestamp for stale-key cleanup */
  lastUsedAt: v.optional(v.number()),
  createdAt: v.number(),
  notes: v.optional(v.string()),
})
  .index("by_keyHashPrefix", ["keyHashPrefix"])
  .index("by_owner", ["owner"])
  .index("by_createdAt", ["createdAt"]);

/**
 * daasAuditLog — append-only audit trail for every DaaS operation that
 * mutates or judges data. Every row has an actor (who), an operation
 * (what), a bounded status (ok | error | denied), and structured
 * metadata. Append-only per agent_run_verdict_workflow.md.
 *
 * Kept lean (< 2KB / row) so storage stays bounded; large payloads go
 * elsewhere and are referenced by id.
 */
export const DAAS_AUDIT_STATUSES = ["ok", "error", "denied"] as const;

export const daasAuditLog = defineTable({
  /** "http.ingest" | "action.judgeReplay" | "admin.deleteTracesByPrefix" | ... */
  op: v.string(),
  /** "cli" | "http" | "frontend" | "action" */
  actorKind: v.string(),
  /** Client identifier — bucketKey for HTTP, userId for authed actions */
  actorId: v.optional(v.string()),
  /** One of DAAS_AUDIT_STATUSES */
  status: v.string(),
  /** Optional traceId / replayId / judgmentId this entry relates to */
  subjectId: v.optional(v.string()),
  /** Bounded JSON blob with op-specific fields (cost, tokens, model, etc.) */
  metaJson: v.optional(v.string()),
  /** Short error string when status != "ok" */
  errorMessage: v.optional(v.string()),
  /** Duration of the operation in ms */
  durationMs: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_createdAt", ["createdAt"])
  .index("by_op", ["op"])
  .index("by_status_createdAt", ["status", "createdAt"])
  .index("by_subjectId", ["subjectId"]);

/**
 * daasRateBuckets — DB-backed rate limit buckets.
 *
 * In-memory rate limiting doesn't work in Convex's serverless environment
 * (each HTTP action can land in a fresh container). This table persists
 * buckets so the limit is enforced across containers.
 *
 * BOUND: old rows (resetAt < now - 1 day) should be cleaned by a cron.
 * HONEST_SCORES: count is a real counter; resetAt is absolute epoch ms.
 */
export const daasRateBuckets = defineTable({
  /** Key is either `ip:<addr>` or `key:<hashed-api-key-prefix>` */
  bucketKey: v.string(),
  count: v.number(),
  /** Epoch ms when this bucket resets to 0 */
  resetAt: v.number(),
  /** Epoch ms when this row was last touched (for GC) */
  updatedAt: v.number(),
})
  .index("by_bucketKey", ["bucketKey"])
  .index("by_updatedAt", ["updatedAt"]);
