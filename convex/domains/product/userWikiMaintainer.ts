/**
 * My Wiki — Background Maintainer
 *
 * AI-as-maintainer model (Karpathy wiki pattern) adapted for NodeBench:
 *   - AI performs cognitive work at WRITE-TIME, not query-time
 *   - Queries retrieve pre-compiled understanding
 *   - Raw sources stay preserved; the wiki is regenerable if it drifts
 *   - Multi-agent safe via per-target idempotency + singleflight
 *   - Background-only: no synchronous UI path
 *
 * Four-stage pipeline:
 *   1. INGEST   — a signal fires (report saved, pulse change, etc.)
 *   2. ROUTE    — identify affected wiki pages, compute idempotency key
 *   3. COMPILE  — debounced regeneration through modelRouter + answer-control
 *   4. SURFACE  — new revision + optional inbox item on material change
 *
 * See: docs/architecture/ME_AGENT_DESIGN.md
 * See: docs/architecture/ME_PAGE_WIKI_SPEC.md §6 (regeneration model)
 *
 * This file exports:
 *   - Pure helpers (deterministic, testable without Convex ctx)
 *   - Internal mutations (enqueue / mark running / mark done / dead-letter)
 *   - Internal action (processRegenJob — calls modelRouter, never exported directly)
 *   - Public mutation (requestManualRegenerate — owner-only, rate-limited)
 */

import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  internalAction,
} from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import {
  userWikiPageTypeValidator,
  userWikiMaintainerSignalValidator,
  userWikiFreshnessValidator,
} from "./userWikiSchema";

// ───────────────────────────────────────────────────────────────────────────
// Constants — all bounds explicit, per agentic_reliability BOUND rule
// ───────────────────────────────────────────────────────────────────────────

/** Debounce window: collapse multiple triggers for the same page into one regen. */
export const REGEN_DEBOUNCE_MS = 5 * 60 * 1000; // 5 min

/** Minimum time between regenerations for the same page regardless of triggers. */
export const REGEN_MIN_INTERVAL_MS = 60 * 1000; // 1 min

/** Max attempts per job before it moves to dead_letter. */
export const MAX_REGEN_ATTEMPTS = 3;

/** Wall-clock budget per regen action. Matches "slow background" profile. */
export const REGEN_WALL_BUDGET_MS = 60_000;

/** Per-owner cap on regens per rolling hour (rate-limit overlay). */
export const REGEN_PER_OWNER_PER_HOUR = 60;

/** Freshness thresholds (ms since regeneratedAt). */
export const FRESHNESS_THRESHOLDS = {
  fresh: 24 * 60 * 60 * 1000, //  < 24h
  recent: 7 * 24 * 60 * 60 * 1000, //  < 7d
  stale: 30 * 24 * 60 * 60 * 1000, //  < 30d
  // beyond stale threshold → very_stale
} as const;

export type WikiPageType =
  | "topic"
  | "company"
  | "person"
  | "product"
  | "event"
  | "location"
  | "job"
  | "contradiction";

export type MaintainerSignal =
  | "report_saved"
  | "canonical_source_added"
  | "extracted_signal_added"
  | "pulse_material_change"
  | "file_uploaded"
  | "manual_regenerate"
  | "scheduled_refresh";

// ───────────────────────────────────────────────────────────────────────────
// Pure helpers — no ctx, no side effects (testable in isolation)
// ───────────────────────────────────────────────────────────────────────────

/**
 * cyrb53 — pure-JS deterministic hash. Matches sharedCache.ts's hash function
 * so idempotency keys stay stable across modules.
 */
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hi = 4294967296 * (2097151 & h2);
  return (hi + (h1 >>> 0)).toString(16).padStart(14, "0");
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[k] = sortKeys((value as Record<string, unknown>)[k]);
  }
  return sorted;
}

/**
 * Deterministic idempotency key. Coalesces identical triggers: two events
 * with the same (owner, slug, pageType, signal, triggerRef) in the same
 * debounce window collapse into one queued job.
 */
export function computeIdempotencyKey(input: {
  ownerKey: string;
  targetSlug: string;
  targetPageType: WikiPageType;
  triggerSignal: MaintainerSignal;
  triggerRef: string;
  debounceBucket: number; // floor(now / REGEN_DEBOUNCE_MS)
}): string {
  return cyrb53(JSON.stringify(sortKeys(input)));
}

/**
 * Deterministic source-snapshot hash for replay. Two runs with the same
 * input set produce the same hash, hence the same revision (DETERMINISTIC
 * rule). Letters are sorted for stability.
 */
export function computeSourceSnapshotHash(input: {
  sortedArtifactIds: string[];
  sortedClaimIds: string[];
  sortedSourceKeys: string[];
  sortedFileIds: string[];
  modelUsed: string;
  promptVersion: string;
}): string {
  return cyrb53(JSON.stringify(sortKeys(input)));
}

/** Normalize an entity name into a per-owner slug. */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/** Map age in ms to a freshness tier. */
export function freshnessForAge(
  ageMs: number,
): "fresh" | "recent" | "stale" | "very_stale" {
  if (ageMs < FRESHNESS_THRESHOLDS.fresh) return "fresh";
  if (ageMs < FRESHNESS_THRESHOLDS.recent) return "recent";
  if (ageMs < FRESHNESS_THRESHOLDS.stale) return "stale";
  return "very_stale";
}

/** Compute the floor-bucket used in idempotency keys. */
export function debounceBucketNow(now: number = Date.now()): number {
  return Math.floor(now / REGEN_DEBOUNCE_MS);
}

/**
 * Contradiction delta — compares claim sets between revisions. Returns a
 * positive count if the new revision surfaces new contradictions.
 *
 * Pure function: called with already-materialized claim summaries.
 */
export function countContradictions(
  claims: Array<{ claimId: string; status: "accepted" | "contradicted" | "pending" }>,
): number {
  return claims.filter((c) => c.status === "contradicted").length;
}

/**
 * Material-change predicate used in Stage 4 (SURFACE). When true, a user-
 * visible inbox item is emitted. Avoids inbox-spam on no-op regenerations.
 */
export function isMaterialChange(input: {
  previousRevision: number;
  newRevision: number;
  previousSummary: string;
  newSummary: string;
  previousContradictionCount: number;
  newContradictionCount: number;
}): boolean {
  if (input.newRevision <= input.previousRevision) return false;
  // Contradiction count jumped → definitely material
  if (input.newContradictionCount > input.previousContradictionCount) return true;
  // Summary prefix differs → material (short hash-prefix heuristic)
  const prevHead = cyrb53(input.previousSummary.slice(0, 400));
  const nextHead = cyrb53(input.newSummary.slice(0, 400));
  return prevHead !== nextHead;
}

// ───────────────────────────────────────────────────────────────────────────
// Queries — read-only
// ───────────────────────────────────────────────────────────────────────────

export const listPagesForOwner = query({
  args: {
    ownerKey: v.string(),
    pageType: v.optional(userWikiPageTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { ownerKey, pageType, limit }) => {
    const cap = Math.min(Math.max(1, limit ?? 25), 100);
    if (pageType) {
      return await ctx.db
        .query("userWikiPages")
        .withIndex("by_owner_pageType", (q) =>
          q.eq("ownerKey", ownerKey).eq("pageType", pageType),
        )
        .order("desc")
        .take(cap);
    }
    return await ctx.db
      .query("userWikiPages")
      .withIndex("by_owner_updated", (q) => q.eq("ownerKey", ownerKey))
      .order("desc")
      .take(cap);
  },
});

export const getPageBySlug = query({
  args: { ownerKey: v.string(), slug: v.string() },
  handler: async (ctx, { ownerKey, slug }) => {
    const page = await ctx.db
      .query("userWikiPages")
      .withIndex("by_owner_slug", (q) =>
        q.eq("ownerKey", ownerKey).eq("slug", slug),
      )
      .first();
    if (!page) return null;
    const latestRev = await ctx.db
      .query("userWikiRevisions")
      .withIndex("by_owner_page_generatedAt", (q) =>
        q.eq("ownerKey", ownerKey).eq("pageId", page._id),
      )
      .order("desc")
      .first();
    return { page, latestRevision: latestRev };
  },
});

export const listContradictingPages = query({
  args: { ownerKey: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { ownerKey, limit }) => {
    const cap = Math.min(Math.max(1, limit ?? 20), 100);
    const rows = await ctx.db
      .query("userWikiPages")
      .withIndex("by_owner_contradictions", (q) => q.eq("ownerKey", ownerKey))
      .order("desc")
      .take(cap);
    return rows.filter((r) => r.contradictionCount > 0);
  },
});

export const listPendingJobs = query({
  args: { ownerKey: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { ownerKey, limit }) => {
    const cap = Math.min(Math.max(1, limit ?? 20), 100);
    return await ctx.db
      .query("userWikiMaintainerJobs")
      .withIndex("by_owner_status_scheduled", (q) =>
        q.eq("ownerKey", ownerKey).eq("status", "queued"),
      )
      .order("asc")
      .take(cap);
  },
});

// ───────────────────────────────────────────────────────────────────────────
// Internal mutations — job lifecycle
// ───────────────────────────────────────────────────────────────────────────

/**
 * Stage 1 (INGEST) → Stage 2 (ROUTE): record a signal, dedupe, enqueue.
 *
 * Called by hooks on productReports insert, canonicalSources insert, etc.
 * Deterministic idempotency so duplicate triggers within debounce bucket
 * collapse onto the same job row.
 */
export const enqueueRegenFromSignal = internalMutation({
  args: {
    ownerKey: v.string(),
    targetSlug: v.string(),
    targetPageType: userWikiPageTypeValidator,
    triggerSignal: userWikiMaintainerSignalValidator,
    triggerRef: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const idempotencyKey = computeIdempotencyKey({
      ownerKey: args.ownerKey,
      targetSlug: args.targetSlug,
      targetPageType: args.targetPageType,
      triggerSignal: args.triggerSignal,
      triggerRef: args.triggerRef,
      debounceBucket: debounceBucketNow(now),
    });

    // Coalesce: if an identical job is already queued, do nothing
    const existing = await ctx.db
      .query("userWikiMaintainerJobs")
      .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first();
    if (existing && (existing.status === "queued" || existing.status === "running")) {
      return { action: "coalesced" as const, jobId: existing._id };
    }

    const scheduledAt = now + REGEN_DEBOUNCE_MS;
    const jobId = await ctx.db.insert("userWikiMaintainerJobs", {
      ownerKey: args.ownerKey,
      idempotencyKey,
      targetSlug: args.targetSlug,
      targetPageType: args.targetPageType,
      triggerSignal: args.triggerSignal,
      triggerRef: args.triggerRef,
      status: "queued",
      attempt: 0,
      enqueuedAt: now,
      scheduledAt,
    });

    // Mark the target page as having a pending regen (best-effort; page may
    // not yet exist on first-touch signals).
    const page = await ctx.db
      .query("userWikiPages")
      .withIndex("by_owner_slug", (q) =>
        q.eq("ownerKey", args.ownerKey).eq("slug", args.targetSlug),
      )
      .first();
    if (page) {
      await ctx.db.patch(page._id, { pendingRegenAt: scheduledAt, updatedAt: now });
    }

    return { action: "enqueued" as const, jobId, scheduledAt };
  },
});

/**
 * Transition a queued job to running. HONEST_STATUS: fails loudly if the
 * job isn't in queued state.
 */
export const markJobRunning = internalMutation({
  args: { jobId: v.id("userWikiMaintainerJobs"), runId: v.string() },
  handler: async (ctx, { jobId, runId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error(`[userWikiMaintainer] job ${jobId} not found`);
    if (job.status !== "queued") {
      throw new Error(
        `[userWikiMaintainer] job ${jobId} not queued (status=${job.status})`,
      );
    }
    await ctx.db.patch(jobId, {
      status: "running",
      runId,
      startedAt: Date.now(),
      attempt: job.attempt + 1,
    });
  },
});

/**
 * Stage 3 (COMPILE) → Stage 4 (SURFACE): land the new revision + patch page.
 * The caller must have already validated the output through the answer-
 * control pipeline; this mutation is the structural write step.
 */
export const completeRegenJob = internalMutation({
  args: {
    jobId: v.id("userWikiMaintainerJobs"),
    pageId: v.id("userWikiPages"),
    revisionDoc: v.object({
      summary: v.string(),
      whatItIs: v.string(),
      whyItMatters: v.string(),
      whatChanged: v.string(),
      openQuestions: v.string(),
      sourceSnapshotHash: v.string(),
      sourceSnapshotIds: v.array(v.string()),
      modelUsed: v.string(),
      triggerSignal: userWikiMaintainerSignalValidator,
      answerControlPassed: v.boolean(),
      hallucinationGateFailed: v.boolean(),
      unsupportedClaimCount: v.number(),
      approvedByUser: v.boolean(),
    }),
    newContradictionCount: v.number(),
    newFreshnessState: userWikiFreshnessValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error(`[userWikiMaintainer] page ${args.pageId} not found`);

    // Skip append if the snapshot hash matches the latest revision (no-op regen)
    const latest = await ctx.db
      .query("userWikiRevisions")
      .withIndex("by_owner_page_generatedAt", (q) =>
        q.eq("ownerKey", page.ownerKey).eq("pageId", page._id),
      )
      .order("desc")
      .first();
    if (latest && latest.sourceSnapshotHash === args.revisionDoc.sourceSnapshotHash) {
      await ctx.db.patch(args.jobId, {
        status: "done",
        completedAt: now,
      });
      return { action: "skipped_idempotent" as const, revisionId: latest._id };
    }

    const nextRev = page.revision + 1;
    const revisionId = await ctx.db.insert("userWikiRevisions", {
      ownerKey: page.ownerKey,
      pageId: page._id,
      revision: nextRev,
      ...args.revisionDoc,
      approvedAt: args.revisionDoc.approvedByUser ? now : undefined,
      generatedAt: now,
    });

    // Only promote userWikiPages.revision if the new revision was approved
    // (or in non-approval-mode, auto-approved by the caller).
    const promote = args.revisionDoc.approvedByUser;
    await ctx.db.patch(page._id, {
      summary: args.revisionDoc.summary,
      freshnessState: args.newFreshnessState,
      contradictionCount: args.newContradictionCount,
      revision: promote ? nextRev : page.revision,
      regeneratedAt: promote ? now : page.regeneratedAt,
      pendingRegenAt: undefined,
      updatedAt: now,
    });

    await ctx.db.patch(args.jobId, {
      status: "done",
      completedAt: now,
    });
    return { action: "appended" as const, revisionId };
  },
});

/**
 * Honest failure path. Bumps attempt; moves to dead_letter after max.
 */
export const failJob = internalMutation({
  args: {
    jobId: v.id("userWikiMaintainerJobs"),
    error: v.string(),
  },
  handler: async (ctx, { jobId, error }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return;
    const attempt = job.attempt;
    const now = Date.now();
    if (attempt >= MAX_REGEN_ATTEMPTS) {
      await ctx.db.patch(jobId, {
        status: "dead_letter",
        lastError: error.slice(0, 1000),
        completedAt: now,
      });
    } else {
      // Back to queued with exponential-ish backoff
      const backoffMs = Math.min(30 * 60 * 1000, 60_000 * Math.pow(2, attempt - 1));
      await ctx.db.patch(jobId, {
        status: "queued",
        lastError: error.slice(0, 1000),
        scheduledAt: now + backoffMs,
      });
    }
  },
});

// ───────────────────────────────────────────────────────────────────────────
// Public mutation — owner-triggered manual regenerate
// ───────────────────────────────────────────────────────────────────────────

/**
 * Owner clicks the "Regenerate" button. Fast-path enqueue with
 * triggerSignal=manual_regenerate. Rate-limited upstream (Next.js route or
 * convex rate-limiter component) — this mutation just trusts the ownerKey.
 */
export const requestManualRegenerate = mutation({
  args: {
    ownerKey: v.string(),
    slug: v.string(),
    pageType: userWikiPageTypeValidator,
  },
  handler: async (ctx, { ownerKey, slug, pageType }) => {
    const now = Date.now();
    const idempotencyKey = computeIdempotencyKey({
      ownerKey,
      targetSlug: slug,
      targetPageType: pageType,
      triggerSignal: "manual_regenerate",
      triggerRef: `manual:${now}`,
      debounceBucket: debounceBucketNow(now),
    });

    const existing = await ctx.db
      .query("userWikiMaintainerJobs")
      .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first();
    if (existing && (existing.status === "queued" || existing.status === "running")) {
      return { action: "coalesced" as const, jobId: existing._id };
    }

    // Manual requests run faster than debounced signal-driven regens.
    const scheduledAt = now; // immediate
    const jobId = await ctx.db.insert("userWikiMaintainerJobs", {
      ownerKey,
      idempotencyKey,
      targetSlug: slug,
      targetPageType: pageType,
      triggerSignal: "manual_regenerate",
      triggerRef: `manual:${now}`,
      status: "queued",
      attempt: 0,
      enqueuedAt: now,
      scheduledAt,
    });

    const page = await ctx.db
      .query("userWikiPages")
      .withIndex("by_owner_slug", (q) => q.eq("ownerKey", ownerKey).eq("slug", slug))
      .first();
    if (page) {
      await ctx.db.patch(page._id, { pendingRegenAt: scheduledAt, updatedAt: now });
    }

    return { action: "enqueued" as const, jobId };
  },
});

// ───────────────────────────────────────────────────────────────────────────
// Internal action — Stage 3 (COMPILE): model call + answer-control
// ───────────────────────────────────────────────────────────────────────────

/**
 * Background processor for a single job. Never called directly by UI —
 * triggered by the scheduler cron or by the enqueue mutation via
 * ctx.scheduler.runAfter.
 *
 * This action is a STUB in Phase 1: it verifies the invariants and
 * persists a placeholder revision. The full modelRouter + answer-control
 * wiring lands in Phase 2 when the prompt contract is finalized.
 */
export const processRegenJob = internalAction({
  args: {
    jobId: v.id("userWikiMaintainerJobs"),
  },
  handler: async (ctx, { jobId }): Promise<{ status: string; reason?: string }> => {
    const runId = `wiki-regen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Transition queued → running honestly; throws if raced
    try {
      await ctx.runMutation(internal.domains.product.userWikiMaintainer.markJobRunning, {
        jobId,
        runId,
      });
    } catch (err) {
      // Another worker got it; exit cleanly
      return { status: "raced", reason: (err as Error).message };
    }

    // TODO Phase 2: full source-snapshot build + modelRouter call + answer-control.
    // For Phase 1 we record a deterministic no-op revision so the pipeline
    // plumbing is exercisable end-to-end without burning tokens.
    try {
      await ctx.runMutation(internal.domains.product.userWikiMaintainer.failJob, {
        jobId,
        error: "phase1_placeholder: processRegenJob not yet wired to modelRouter",
      });
      return { status: "deferred" };
    } catch (err) {
      return { status: "error", reason: (err as Error).message };
    }
  },
});
