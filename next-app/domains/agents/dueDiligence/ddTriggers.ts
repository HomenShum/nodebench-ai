/**
 * ddTriggers.ts
 *
 * Actions for DD triggers. Contains ONLY actions (Node.js runtime).
 * Queries and mutations are in ddTriggerQueries.ts.
 *
 * TIERED DD SYSTEM (v3 - Risk-Aware):
 * Combines funding-based tiers with risk-based escalation.
 *
 * KEY INSIGHT: Deal size alone is NOT a reliable proxy for diligence depth.
 * Lower-funding companies often have HIGHER information asymmetry and risk.
 *
 * Risk-Based Override:
 * - High risk scores (71+) escalate to FULL_PLAYBOOK regardless of funding
 * - Escalation triggers (identity mismatch, BEC indicators) force immediate upgrade
 * - Small deals with high risk get MORE scrutiny, not less
 */

"use node";

import { v } from "convex/values";
import { action } from "../../../_generated/server";
import { internal, api } from "../../../_generated/api";
import { Id } from "../../../_generated/dataModel";
import { DDTier, DD_TIER_BRANCHES, RISK_BASED_BRANCHES, MicroBranchType } from "./types";
import {
  detectRiskSignals,
  calculateRiskScore,
  RiskAssessmentInput,
  formatRiskScore,
} from "./riskScoring";

// Cooldown period before re-triggering DD for same entity (ms)
const DD_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Type for DD job records returned from queries
interface DDJobRecord {
  jobId: string;
  entityName: string;
  entityType: string;
  status: string;
  createdAt: number;
  completedAt?: number;
  entityId?: Id<"entityContexts">;
}

// ============================================================================
// Actions - Trigger Handlers
// ============================================================================

/**
 * Trigger DD from a funding event.
 * Uses risk-aware tiered DD system (v3) to determine depth of analysis.
 *
 * This action performs risk assessment before tier selection, allowing
 * small deals with high risk to escalate to deeper DD tiers.
 */
export const triggerDDFromFunding = action({
  args: {
    fundingEventId: v.id("fundingEvents"),
    userId: v.id("users"),
    // Optional: skip risk assessment (use funding-only tiers)
    skipRiskAssessment: v.optional(v.boolean()),
  },
  handler: async (ctx, { fundingEventId, userId, skipRiskAssessment }) => {
    // Get the funding event first (needed for risk assessment)
    const event = await ctx.runQuery(
      internal.domains.enrichment.fundingQueries.getFundingEventById,
      { fundingEventId }
    );

    if (!event) {
      return { triggered: false, reason: "Funding event not found" };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RISK ASSESSMENT (v3)
    // ─────────────────────────────────────────────────────────────────────────

    let riskScore: number | undefined;
    let escalationTriggers: string[] | undefined;

    if (!skipRiskAssessment) {
      try {
        // Build risk assessment input from available data
        const riskInput: RiskAssessmentInput = {
          companyName: event.companyName,
          websiteUrl: event.websiteUrl,
          amountUsd: event.amountUsd,
          roundType: event.roundType,
          sourceUrl: event.sourceUrl,
          sectors: event.sectors,
          // Note: Additional risk signals (founders, claims) would be
          // gathered during enrichment. For now we use available data.
        };

        // Detect risk signals
        const signals = detectRiskSignals(riskInput);

        // Calculate risk score
        const riskResult = calculateRiskScore(signals);
        riskScore = riskResult.overall;
        escalationTriggers = riskResult.escalationTriggers;

        console.log(`[ddTriggers] Risk assessment for ${event.companyName}:`);
        console.log(`  Score: ${riskScore}/100`);
        console.log(`  Signals: ${signals.length}`);
        if (escalationTriggers.length > 0) {
          console.log(`  ESCALATION TRIGGERS: ${escalationTriggers.join(", ")}`);
        }
      } catch (error) {
        console.warn(`[ddTriggers] Risk assessment failed, using funding-based tiers:`, error);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TIER SELECTION (with risk override)
    // ─────────────────────────────────────────────────────────────────────────

    // Check if should trigger (now with risk assessment)
    const check = await ctx.runQuery(
      api.domains.agents.dueDiligence.ddTriggerQueries.shouldTriggerDDForFunding,
      {
        fundingEventId,
        riskScore,
        escalationTriggers,
      }
    );

    // Extract tier and metadata from check result
    const tier: DDTier = (check as any).tier ?? "STANDARD_DD";
    const tierResult = (check as any).tierResult;
    const wasOverridden = tierResult?.wasOverridden ?? false;

    if (!check.shouldTrigger) {
      console.log(`[ddTriggers] Skipping DD for ${fundingEventId}: ${check.reason} (tier: ${tier})`);
      await ctx.runMutation(
        internal.domains.agents.dueDiligence.ddTriggerQueries.recordTriggerDecision,
        {
          fundingEventId,
          triggered: false,
          reason: check.reason,
        }
      );
      return {
        triggered: false,
        reason: check.reason,
        tier,
        riskScore,
        wasOverridden,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BRANCH SELECTION (tier-specific + risk micro-branches)
    // ─────────────────────────────────────────────────────────────────────────

    // Get full DD branches for this tier
    const ddBranches = DD_TIER_BRANCHES[tier];

    // Get micro-branches based on risk (these run even for small deals)
    const microBranches: MicroBranchType[] = tierResult?.microBranches ?? RISK_BASED_BRANCHES[tier];

    console.log(`[ddTriggers] Starting ${tier} DD for ${event.companyName}`);
    console.log(`  DD Branches: ${ddBranches.length}`);
    console.log(`  Micro-branches: ${microBranches.length}`);
    if (wasOverridden) {
      console.log(`  RISK OVERRIDE: tier escalated from funding-based ${tierResult?.fundingBasedTier}`);
    }

    // Start DD job with tier-specific branches and micro-branches
    const result = await ctx.runAction(
      api.domains.agents.dueDiligence.ddOrchestrator.startDueDiligenceJob,
      {
        entityName: event.companyName,
        entityType: "company",
        triggerSource: "funding_detection",
        triggerEventId: fundingEventId,
        entityId: event.companyId,
        userId,
        // Pass tier and branch override
        ddTier: tier,
        branchOverride: ddBranches,
        // Pass micro-branches for fast pre-checks
        microBranches,
        // Pass risk metadata for logging/tracking
        riskScore,
        escalationTriggers,
      }
    );

    // Record trigger
    await ctx.runMutation(
      internal.domains.agents.dueDiligence.ddTriggerQueries.recordTriggerDecision,
      {
        fundingEventId,
        triggered: true,
        reason: check.reason,
        jobId: result.jobId,
      }
    );

    console.log(`[ddTriggers] Triggered ${tier} DD job ${result.jobId} for ${event.companyName}`);

    return {
      triggered: true,
      jobId: result.jobId,
      tier,
      branchCount: ddBranches.length,
      microBranchCount: microBranches.length,
      riskScore,
      wasOverridden,
      escalationTriggers,
    };
  },
});

/**
 * Process all pending DD triggers (scheduled job)
 */
export const processPendingTriggers = action({
  args: {
    userId: v.id("users"),
    maxJobs: v.optional(v.number()),
  },
  handler: async (ctx, { userId, maxJobs = 5 }) => {
    // Get pending triggers
    const pending = await ctx.runQuery(
      api.domains.agents.dueDiligence.ddTriggerQueries.getPendingDDTriggers,
      { limit: maxJobs }
    );

    const results: Array<{
      fundingEventId: Id<"fundingEvents">;
      companyName: string;
      triggered: boolean;
      jobId?: string;
      reason?: string;
    }> = [];

    for (const trigger of pending) {
      const result = await ctx.runAction(
        api.domains.agents.dueDiligence.ddTriggers.triggerDDFromFunding,
        {
          fundingEventId: trigger.fundingEventId,
          userId,
        }
      );

      results.push({
        fundingEventId: trigger.fundingEventId,
        companyName: trigger.companyName,
        triggered: result.triggered,
        jobId: result.jobId,
        reason: result.reason,
      });
    }

    return {
      processed: results.length,
      triggered: results.filter(r => r.triggered).length,
      results,
    };
  },
});

/**
 * Manual DD trigger from UI
 */
export const triggerManualDD = action({
  args: {
    entityName: v.string(),
    entityType: v.union(v.literal("company"), v.literal("fund"), v.literal("person")),
    userId: v.id("users"),
    entityId: v.optional(v.id("entityContexts")),
  },
  handler: async (ctx, { entityName, entityType, userId, entityId }) => {
    // Check for recent DD
    const recentJobs = await ctx.runQuery(
      api.domains.agents.dueDiligence.ddMutations.getUserDDJobs,
      { userId, limit: 100 }
    );

    const recentForEntity = recentJobs.find(
      (job: DDJobRecord) =>
        job.entityName.toLowerCase() === entityName.toLowerCase() &&
        job.entityType === entityType &&
        job.status !== "failed" &&
        job.createdAt > Date.now() - DD_COOLDOWN_MS
    );

    if (recentForEntity) {
      return {
        triggered: false,
        reason: `Recent DD job exists (${recentForEntity.status})`,
        existingJobId: recentForEntity.jobId,
      };
    }

    // Start DD job
    const result = await ctx.runAction(
      api.domains.agents.dueDiligence.ddOrchestrator.startDueDiligenceJob,
      {
        entityName,
        entityType,
        triggerSource: "manual",
        entityId,
        userId,
      }
    );

    return {
      triggered: true,
      jobId: result.jobId,
      status: result.status,
    };
  },
});

/**
 * Trigger DD refresh for stale memos
 */
export const triggerStaleRefresh = action({
  args: {
    maxAgeMs: v.optional(v.number()),
    userId: v.id("users"),
    maxJobs: v.optional(v.number()),
  },
  handler: async (ctx, { maxAgeMs = 30 * 24 * 60 * 60 * 1000, userId, maxJobs = 5 }) => {
    // Find stale memos
    const cutoff = Date.now() - maxAgeMs;

    // Get completed jobs with old memos
    const jobs = await ctx.runQuery(
      api.domains.agents.dueDiligence.ddMutations.getUserDDJobs,
      { userId, status: "completed", limit: 50 }
    );

    const staleJobs = jobs.filter((j: DDJobRecord) => j.completedAt && j.completedAt < cutoff);

    const results: Array<{
      entityName: string;
      triggered: boolean;
      jobId?: string;
    }> = [];

    for (const staleJob of staleJobs.slice(0, maxJobs)) {
      const result = await ctx.runAction(
        api.domains.agents.dueDiligence.ddOrchestrator.startDueDiligenceJob,
        {
          entityName: staleJob.entityName,
          entityType: staleJob.entityType,
          triggerSource: "scheduled_refresh",
          entityId: staleJob.entityId,
          userId,
        }
      );

      results.push({
        entityName: staleJob.entityName,
        triggered: result.status === "started",
        jobId: result.jobId,
      });
    }

    return {
      staleCount: staleJobs.length,
      refreshed: results.filter(r => r.triggered).length,
      results,
    };
  },
});
