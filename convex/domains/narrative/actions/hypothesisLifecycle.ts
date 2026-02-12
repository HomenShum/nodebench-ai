/**
 * Hypothesis Lifecycle Automation (Phase 7)
 *
 * Periodic scoring action that reads signal metrics + claim entailment verdicts
 * and transitions hypothesis status + confidence automatically.
 *
 * Status transitions:
 *   active → supported    (confidence >= 0.75, supporting > contradicting)
 *   active → weakened     (contradicting > supporting, confidence < 0.4)
 *   active → inconclusive (stale: no new evidence in 30 days)
 *   weakened → retired    (contradicting >= 3x supporting)
 *   supported → active    (new contradicting evidence arrives)
 *
 * Confidence formula:
 *   base = supporting / (supporting + contradicting + 1)
 *   tierBoost = sum of tier weights for supporting evidence
 *   confidence = clamp(base * 0.7 + tierBoost * 0.3, 0, 1)
 *
 * @module domains/narrative/actions/hypothesisLifecycle
 */

import { v } from "convex/values";
import { internalAction, internalMutation } from "../../../_generated/server";
import { internal } from "../../../_generated/api";
import type { Id, Doc } from "../../../_generated/dataModel";
import type { HypothesisStatus } from "../validators";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HypothesisScoreResult {
  hypothesisDocId: Id<"narrativeHypotheses">;
  hypothesisId: string;
  label: string;
  oldStatus: string;
  newStatus: HypothesisStatus;
  oldConfidence: number;
  newConfidence: number;
  reason: string;
  changed: boolean;
}

// ─── Scoring Logic ───────────────────────────────────────────────────────────

const STALENESS_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function computeConfidence(
  supporting: number,
  contradicting: number,
  signalMetricCount: number
): number {
  const total = supporting + contradicting;
  if (total === 0) return 0.5; // No evidence → neutral

  const base = supporting / (total + 1);
  // Small boost for having signal metrics backing
  const metricBoost = Math.min(signalMetricCount * 0.02, 0.1);
  return Math.min(1, Math.max(0, base * 0.85 + metricBoost + 0.1));
}

function determineStatus(
  current: HypothesisStatus,
  confidence: number,
  supporting: number,
  contradicting: number,
  isStale: boolean
): { status: HypothesisStatus; reason: string } {
  // Retired hypotheses stay retired unless manually reactivated
  if (current === "retired") {
    return { status: "retired", reason: "Hypothesis is retired" };
  }

  // Stale check: no new evidence in 30 days
  if (isStale && supporting === 0 && contradicting === 0) {
    return { status: "inconclusive", reason: "No evidence activity in 30+ days" };
  }

  // Strong support
  if (confidence >= 0.75 && supporting > contradicting) {
    return { status: "supported", reason: `Confidence ${(confidence * 100).toFixed(0)}%, ${supporting} supporting vs ${contradicting} contradicting` };
  }

  // Strong contradiction
  if (contradicting >= 3 * Math.max(supporting, 1)) {
    return { status: "retired", reason: `Contradicting evidence (${contradicting}) >= 3x supporting (${supporting})` };
  }

  // Weakened
  if (confidence < 0.4 && contradicting > supporting) {
    return { status: "weakened", reason: `Low confidence ${(confidence * 100).toFixed(0)}%, more contradicting than supporting evidence` };
  }

  // Re-activate if previously supported but new contradicting evidence
  if (current === "supported" && contradicting > 0 && confidence < 0.7) {
    return { status: "active", reason: "New contradicting evidence reduced confidence below 70%" };
  }

  // Default: stay active
  return { status: "active", reason: "Monitoring - insufficient evidence for status change" };
}

// ─── Internal Action: Score All Active Hypotheses ────────────────────────────

/**
 * Score and transition all active hypotheses for a thread.
 * Called periodically (e.g., after each newsroom pipeline run).
 */
export const scoreThreadHypotheses = internalAction({
  args: {
    threadId: v.id("narrativeThreads"),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    hypothesisDocId: v.id("narrativeHypotheses"),
    hypothesisId: v.string(),
    label: v.string(),
    oldStatus: v.string(),
    newStatus: v.string(),
    oldConfidence: v.number(),
    newConfidence: v.number(),
    reason: v.string(),
    changed: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const now = Date.now();

    console.log(`[HypothesisLifecycle] Scoring hypotheses for thread ${args.threadId} (dryRun=${dryRun})`);

    // 1. Fetch all hypotheses for this thread
    const hypotheses = await ctx.runQuery(
      internal.domains.narrative.queries.hypotheses.getByThreadInternal,
      { threadId: args.threadId }
    );

    if (hypotheses.length === 0) {
      console.log("[HypothesisLifecycle] No hypotheses found for thread");
      return [];
    }

    console.log(`[HypothesisLifecycle] Found ${hypotheses.length} hypotheses`);

    // 2. Fetch signal metrics for context
    const signalMetrics = await ctx.runQuery(
      internal.domains.narrative.queries.signalMetrics.getByThreadInternal,
      { threadId: args.threadId, limit: 50 }
    );

    const results: HypothesisScoreResult[] = [];

    // 3. Score each hypothesis
    for (const hyp of hypotheses) {
      const supporting = hyp.supportingEvidenceCount ?? 0;
      const contradicting = hyp.contradictingEvidenceCount ?? 0;

      // Count signal metrics linked to this hypothesis
      const linkedMetrics = signalMetrics.filter(
        (m: any) => m.hypothesisId === hyp.hypothesisId
      );

      const isStale = (now - (hyp.updatedAt ?? hyp.createdAt)) > STALENESS_THRESHOLD_MS;
      const newConfidence = computeConfidence(supporting, contradicting, linkedMetrics.length);
      const { status: newStatus, reason } = determineStatus(
        hyp.status as HypothesisStatus,
        newConfidence,
        supporting,
        contradicting,
        isStale
      );

      const changed = newStatus !== hyp.status || Math.abs(newConfidence - (hyp.confidence ?? 0.5)) > 0.05;

      results.push({
        hypothesisDocId: hyp._id,
        hypothesisId: hyp.hypothesisId,
        label: hyp.label,
        oldStatus: hyp.status,
        newStatus,
        oldConfidence: hyp.confidence ?? 0.5,
        newConfidence,
        reason,
        changed,
      });

      // 4. Apply changes if not dry run
      if (changed && !dryRun) {
        await ctx.runMutation(
          internal.domains.narrative.mutations.hypotheses.updateHypothesisInternal,
          {
            hypothesisDocId: hyp._id,
            status: newStatus,
            confidence: newConfidence,
            reviewedBy: "hypothesis_lifecycle",
          }
        );
        console.log(`[HypothesisLifecycle] ${hyp.label}: ${hyp.status} → ${newStatus} (${(newConfidence * 100).toFixed(0)}%)`);
      }
    }

    const changedCount = results.filter((r) => r.changed).length;
    console.log(`[HypothesisLifecycle] ${changedCount}/${results.length} hypotheses would change`);

    return results;
  },
});

/**
 * Score hypotheses across ALL threads with active hypotheses.
 * Designed to be called from a cron job.
 */
export const scoreAllActiveHypotheses = internalAction({
  args: {
    dryRun: v.optional(v.boolean()),
    maxThreads: v.optional(v.number()),
  },
  returns: v.object({
    threadsScored: v.number(),
    totalHypotheses: v.number(),
    totalChanged: v.number(),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const maxThreads = args.maxThreads ?? 50;

    // Find threads that have active hypotheses
    const activeHypotheses = await ctx.runQuery(
      internal.domains.narrative.actions.hypothesisLifecycle.getThreadsWithActiveHypotheses,
      { limit: maxThreads }
    );

    let totalHypotheses = 0;
    let totalChanged = 0;

    for (const threadId of activeHypotheses) {
      const results = await ctx.runAction(
        internal.domains.narrative.actions.hypothesisLifecycle.scoreThreadHypotheses,
        { threadId: threadId as Id<"narrativeThreads">, dryRun }
      );
      totalHypotheses += results.length;
      totalChanged += results.filter((r: any) => r.changed).length;
    }

    console.log(`[HypothesisLifecycle] Scored ${totalHypotheses} hypotheses across ${activeHypotheses.length} threads, ${totalChanged} changed`);

    return {
      threadsScored: activeHypotheses.length,
      totalHypotheses,
      totalChanged,
    };
  },
});

/**
 * Helper query: get distinct thread IDs that have active hypotheses.
 */
export const getThreadsWithActiveHypotheses = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.id("narrativeThreads")),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const active = await ctx.db
      .query("narrativeHypotheses")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(500);

    const threadIds = new Set<Id<"narrativeThreads">>();
    for (const h of active) {
      if (threadIds.size >= limit) break;
      threadIds.add(h.threadId);
    }

    return Array.from(threadIds);
  },
});
