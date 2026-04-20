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
import { mutation, internalMutation } from "../../_generated/server";
import { DAAS_VERDICTS, DAAS_AUDIT_STATUSES } from "./schema";

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

// ── Rate limit bucket (DB-backed — works across serverless containers) ──────
//
// Internal mutation: called by the HTTP ingest action on every request.
// Reads the current bucket for `bucketKey`, resets if expired, increments
// atomically via Convex's serialized mutation runtime (no race window).
// Returns {allowed, remaining, resetAt} so the caller can emit headers
// and choose between 201 and 429.
//
// WHY internalMutation: this should not be callable from public clients —
// only from our own httpAction wrapper.

export const checkAndIncrementRateBucket = internalMutation({
  args: {
    bucketKey: v.string(),
    limit: v.number(),
    windowMs: v.number(),
  },
  returns: v.object({
    allowed: v.boolean(),
    remaining: v.number(),
    resetAt: v.number(),
  }),
  handler: async (ctx, { bucketKey, limit, windowMs }) => {
    if (!bucketKey || bucketKey.length === 0 || bucketKey.length > 256) {
      throw new Error("bucketKey must be non-empty and <= 256 chars");
    }
    if (limit <= 0 || !Number.isFinite(limit)) {
      throw new Error("limit must be positive finite number");
    }
    if (windowMs <= 0 || windowMs > 24 * 60 * 60 * 1000) {
      throw new Error("windowMs must be positive and <= 24h");
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("daasRateBuckets")
      .withIndex("by_bucketKey", (q) => q.eq("bucketKey", bucketKey))
      .first();

    if (!existing || existing.resetAt <= now) {
      // New window: create/reset the bucket with count=1.
      if (existing) {
        await ctx.db.patch(existing._id, {
          count: 1,
          resetAt: now + windowMs,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("daasRateBuckets", {
          bucketKey,
          count: 1,
          resetAt: now + windowMs,
          updatedAt: now,
        });
      }
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    const newCount = existing.count + 1;
    await ctx.db.patch(existing._id, {
      count: newCount,
      updatedAt: now,
    });
    return {
      allowed: true,
      remaining: limit - newCount,
      resetAt: existing.resetAt,
    };
  },
});

// ── API key management ──────────────────────────────────────────────────────
//
// Raw keys never leave the admin path. Storage is keyHashPrefix (first 12
// chars of sha256 hex). Ingest path hashes the provided header + looks up
// by prefix. If a match is found and enabled=true, the per-key quota
// override (if any) is applied; otherwise the global authed default.

async function sha256HexPrefix(input: string, n: number = 12): Promise<string> {
  const buf = new TextEncoder().encode(input);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cryptoObj: any = (globalThis as any).crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error("Web Crypto not available in this runtime");
  }
  const digest = await cryptoObj.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, n);
}

export const lookupApiKey = internalMutation({
  args: { rawKey: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("daasApiKeys"),
      owner: v.string(),
      rateLimitPerMinute: v.optional(v.number()),
      webhookSecret: v.optional(v.string()),
      enabled: v.boolean(),
    }),
  ),
  handler: async (ctx, { rawKey }) => {
    if (!rawKey || rawKey.length < 16) return null;
    const prefix = await sha256HexPrefix(rawKey, 12);
    const row = await ctx.db
      .query("daasApiKeys")
      .withIndex("by_keyHashPrefix", (q) => q.eq("keyHashPrefix", prefix))
      .first();
    if (!row) return null;
    // Touch lastUsedAt (best-effort)
    await ctx.db.patch(row._id, { lastUsedAt: Date.now() });
    return {
      _id: row._id,
      owner: row.owner,
      rateLimitPerMinute: row.rateLimitPerMinute,
      webhookSecret: row.webhookSecret,
      enabled: row.enabled,
    };
  },
});

export const registerApiKey = internalMutation({
  args: {
    rawKey: v.string(),
    owner: v.string(),
    rateLimitPerMinute: v.optional(v.number()),
    webhookSecret: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("daasApiKeys"),
  handler: async (ctx, args) => {
    if (!args.rawKey || args.rawKey.length < 32) {
      throw new Error("rawKey must be at least 32 chars");
    }
    if (!args.owner || args.owner.length < 2 || args.owner.length > 128) {
      throw new Error("owner must be 2-128 chars");
    }
    const prefix = await sha256HexPrefix(args.rawKey, 12);
    // Reject collisions (should be astronomically rare but HONEST_STATUS)
    const existing = await ctx.db
      .query("daasApiKeys")
      .withIndex("by_keyHashPrefix", (q) => q.eq("keyHashPrefix", prefix))
      .first();
    if (existing) {
      throw new Error("keyHashPrefix collision — generate a new rawKey");
    }
    return await ctx.db.insert("daasApiKeys", {
      keyHashPrefix: prefix,
      owner: args.owner,
      rateLimitPerMinute: args.rateLimitPerMinute,
      webhookSecret: args.webhookSecret,
      enabled: true,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const setApiKeyEnabled = internalMutation({
  args: { id: v.id("daasApiKeys"), enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { id, enabled }) => {
    await ctx.db.patch(id, { enabled });
    return null;
  },
});

// ── Audit log ───────────────────────────────────────────────────────────────
//
// Internal-only. Called from mutations / actions / http handlers to record
// what happened, by whom, with what result. Appends one row per operation.
// metaJson is bounded at 8KB (stays small for index-friendly reads).

const MAX_META_BYTES = 8 * 1024;

export const logAuditEvent = internalMutation({
  args: {
    op: v.string(),
    actorKind: v.string(),
    actorId: v.optional(v.string()),
    status: v.string(),
    subjectId: v.optional(v.string()),
    metaJson: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  returns: v.id("daasAuditLog"),
  handler: async (ctx, args) => {
    const allowed = new Set<string>(DAAS_AUDIT_STATUSES);
    if (!allowed.has(args.status)) {
      throw new Error(`audit status must be one of ${[...allowed].join(", ")}`);
    }
    if (args.metaJson && args.metaJson.length > MAX_META_BYTES) {
      throw new Error(
        `audit metaJson exceeds ${MAX_META_BYTES} bytes (${args.metaJson.length})`,
      );
    }
    if (args.errorMessage && args.errorMessage.length > 1024) {
      // Truncate rather than reject — we still want the audit row.
      args = {
        ...args,
        errorMessage: args.errorMessage.slice(0, 1024) + "…[truncated]",
      };
    }
    return await ctx.db.insert("daasAuditLog", {
      op: args.op,
      actorKind: args.actorKind,
      actorId: args.actorId,
      status: args.status,
      subjectId: args.subjectId,
      metaJson: args.metaJson,
      errorMessage: args.errorMessage,
      durationMs: args.durationMs,
      createdAt: Date.now(),
    });
  },
});
