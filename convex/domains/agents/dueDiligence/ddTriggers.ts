/**
 * ddTriggers.ts
 *
 * Actions for DD triggers. Contains ONLY actions (Node.js runtime).
 * Queries and mutations are in ddTriggerQueries.ts.
 */

"use node";

import { v } from "convex/values";
import { action } from "../../../_generated/server";
import { internal, api } from "../../../_generated/api";
import { Id } from "../../../_generated/dataModel";

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
 * Trigger DD from a funding event
 */
export const triggerDDFromFunding = action({
  args: {
    fundingEventId: v.id("fundingEvents"),
    userId: v.id("users"),
  },
  handler: async (ctx, { fundingEventId, userId }) => {
    // Check if should trigger
    const check = await ctx.runQuery(
      api.domains.agents.dueDiligence.ddTriggerQueries.shouldTriggerDDForFunding,
      { fundingEventId }
    );

    if (!check.shouldTrigger) {
      console.log(`[ddTriggers] Skipping DD for ${fundingEventId}: ${check.reason}`);
      await ctx.runMutation(
        internal.domains.agents.dueDiligence.ddTriggerQueries.recordTriggerDecision,
        {
          fundingEventId,
          triggered: false,
          reason: check.reason,
        }
      );
      return { triggered: false, reason: check.reason };
    }

    // Get the funding event
    const event = await ctx.runQuery(
      internal.domains.enrichment.fundingQueries.getFundingEventById,
      { fundingEventId }
    );

    if (!event) {
      return { triggered: false, reason: "Funding event not found" };
    }

    // Start DD job
    const result = await ctx.runAction(
      api.domains.agents.dueDiligence.ddOrchestrator.startDueDiligenceJob,
      {
        entityName: event.companyName,
        entityType: "company",
        triggerSource: "funding_detection",
        triggerEventId: fundingEventId,
        entityId: event.companyId,
        userId,
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

    console.log(`[ddTriggers] Triggered DD job ${result.jobId} for ${event.companyName}`);

    return { triggered: true, jobId: result.jobId };
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
