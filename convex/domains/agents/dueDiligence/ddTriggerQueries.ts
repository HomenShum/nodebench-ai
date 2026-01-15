/**
 * ddTriggerQueries.ts
 *
 * Queries and mutations for DD trigger logic.
 * Separated from ddTriggers.ts to comply with Convex Node.js runtime requirements.
 */

import { v } from "convex/values";
import { query, internalMutation } from "../../../_generated/server";
import { Doc, Id } from "../../../_generated/dataModel";

// ============================================================================
// Trigger Configuration
// ============================================================================

// Minimum confidence to trigger DD from funding detection
const MIN_FUNDING_CONFIDENCE = 0.7;

// Minimum funding amount (USD) to trigger DD
const MIN_FUNDING_AMOUNT = 5_000_000; // $5M

// Cooldown period before re-triggering DD for same entity (ms)
const DD_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ============================================================================
// Queries
// ============================================================================

/**
 * Check if DD should be triggered for a funding event
 */
export const shouldTriggerDDForFunding = query({
  args: { fundingEventId: v.id("fundingEvents") },
  handler: async (ctx, { fundingEventId }) => {
    const event = await ctx.db.get(fundingEventId) as Doc<"fundingEvents"> | null;
    if (!event) return { shouldTrigger: false, reason: "Funding event not found" };

    // Check confidence
    if (event.confidence < MIN_FUNDING_CONFIDENCE) {
      return {
        shouldTrigger: false,
        reason: `Confidence ${(event.confidence * 100).toFixed(0)}% below threshold (${MIN_FUNDING_CONFIDENCE * 100}%)`,
      };
    }

    // Check verification status
    if (event.verificationStatus === "unverified") {
      return {
        shouldTrigger: false,
        reason: "Funding event not yet verified",
      };
    }

    // Check funding amount
    if (event.amountUsd && event.amountUsd < MIN_FUNDING_AMOUNT) {
      return {
        shouldTrigger: false,
        reason: `Amount $${(event.amountUsd / 1_000_000).toFixed(1)}M below threshold ($${MIN_FUNDING_AMOUNT / 1_000_000}M)`,
      };
    }

    // Check for recent DD job on this entity
    const recentJob = await ctx.db
      .query("dueDiligenceJobs")
      .withIndex("by_entity", (q) =>
        q.eq("entityName", event.companyName).eq("entityType", "company")
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "failed"),
          q.gt(q.field("createdAt"), Date.now() - DD_COOLDOWN_MS)
        )
      )
      .first() as Doc<"dueDiligenceJobs"> | null;

    if (recentJob) {
      return {
        shouldTrigger: false,
        reason: `Recent DD job exists (${recentJob.status}) from ${new Date(recentJob.createdAt).toLocaleDateString()}`,
        existingJobId: recentJob.jobId,
      };
    }

    return {
      shouldTrigger: true,
      reason: "All criteria met",
      companyName: event.companyName,
      roundType: event.roundType,
      confidence: event.confidence,
    };
  },
});

/**
 * Get pending funding events that should trigger DD
 */
export const getPendingDDTriggers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    // Get verified funding events from the last 7 days
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const fundingEvents = await ctx.db
      .query("fundingEvents")
      .withIndex("by_verificationStatus", (q) => q.eq("verificationStatus", "verified"))
      .filter((q) => q.gt(q.field("createdAt"), cutoff))
      .order("desc")
      .take(limit * 2) as Doc<"fundingEvents">[]; // Get more than needed to filter

    const pending: Array<{
      fundingEventId: Id<"fundingEvents">;
      companyName: string;
      roundType: string;
      confidence: number;
      reason: string;
    }> = [];

    for (const event of fundingEvents) {
      if (pending.length >= limit) break;

      // Check if should trigger
      const check = await shouldTriggerDDForFundingInternal(ctx, event);
      if (check.shouldTrigger) {
        pending.push({
          fundingEventId: event._id,
          companyName: event.companyName,
          roundType: event.roundType,
          confidence: event.confidence,
          reason: check.reason,
        });
      }
    }

    return pending;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Record DD trigger decision
 */
export const recordTriggerDecision = internalMutation({
  args: {
    fundingEventId: v.id("fundingEvents"),
    triggered: v.boolean(),
    reason: v.string(),
    jobId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Could store in a ddTriggerLog table if needed
    console.log(
      `[ddTriggers] Funding event ${args.fundingEventId}: triggered=${args.triggered}, reason=${args.reason}`
    );
  },
});

// ============================================================================
// Internal Helpers
// ============================================================================

async function shouldTriggerDDForFundingInternal(
  ctx: any,
  event: Doc<"fundingEvents">
): Promise<{ shouldTrigger: boolean; reason: string }> {
  // Check confidence
  if (event.confidence < MIN_FUNDING_CONFIDENCE) {
    return { shouldTrigger: false, reason: "Low confidence" };
  }

  // Check verification
  if (event.verificationStatus === "unverified") {
    return { shouldTrigger: false, reason: "Not verified" };
  }

  // Check amount
  if (event.amountUsd && event.amountUsd < MIN_FUNDING_AMOUNT) {
    return { shouldTrigger: false, reason: "Below amount threshold" };
  }

  // Check cooldown
  const recentJob = await ctx.db
    .query("dueDiligenceJobs")
    .withIndex("by_entity", (q: any) =>
      q.eq("entityName", event.companyName).eq("entityType", "company")
    )
    .filter((q: any) =>
      q.and(
        q.neq(q.field("status"), "failed"),
        q.gt(q.field("createdAt"), Date.now() - DD_COOLDOWN_MS)
      )
    )
    .first() as Doc<"dueDiligenceJobs"> | null;

  if (recentJob) {
    return { shouldTrigger: false, reason: "Recent DD exists" };
  }

  return { shouldTrigger: true, reason: "Criteria met" };
}
