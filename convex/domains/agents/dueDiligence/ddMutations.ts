/**
 * ddMutations.ts
 *
 * Database mutations for Due Diligence.
 * Separated from actions to comply with Convex Node.js runtime requirements.
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "../../../_generated/server";
import { Doc, Id } from "../../../_generated/dataModel";
import { BranchType, DDJobStatus } from "./types";

// ============================================================================
// Queries
// ============================================================================

/**
 * Get DD job by jobId
 */
export const getDDJob = query({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db
      .query("dueDiligenceJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"dueDiligenceJobs"> | null;

    if (!job) return null;

    // Get branches
    const branches = await ctx.db
      .query("ddResearchBranches")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .collect() as Doc<"ddResearchBranches">[];

    // Get memo if completed
    let memo = null;
    if (job.ddMemoId) {
      memo = await ctx.db.get(job.ddMemoId) as Doc<"ddMemos"> | null;
    }

    return { job, branches, memo };
  },
});

/**
 * Get DD jobs for a user
 */
export const getUserDDJobs = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("executing"),
      v.literal("cross_checking"),
      v.literal("synthesizing"),
      v.literal("completed"),
      v.literal("failed")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, status, limit = 20 }) => {
    let query = ctx.db
      .query("dueDiligenceJobs")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    const jobs = await query.order("desc").take(limit);

    // Filter by status if provided
    if (status) {
      return jobs.filter(j => j.status === status);
    }

    return jobs;
  },
});

/**
 * Get DD job progress for real-time UI updates
 */
export const getDDJobProgress = query({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db
      .query("dueDiligenceJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"dueDiligenceJobs"> | null;

    if (!job) return null;

    const branches = await ctx.db
      .query("ddResearchBranches")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .collect() as Doc<"ddResearchBranches">[];

    const activeBranches = branches.filter((b: Doc<"ddResearchBranches">) => b.status === "running").map((b: Doc<"ddResearchBranches">) => b.branchType);
    const completedBranches = branches.filter((b: Doc<"ddResearchBranches">) => b.status === "completed").map((b: Doc<"ddResearchBranches">) => b.branchType);
    const failedBranches = branches.filter((b: Doc<"ddResearchBranches">) => b.status === "failed").map((b: Doc<"ddResearchBranches">) => b.branchType);

    return {
      status: job.status,
      phase: getPhaseDescription(job.status as DDJobStatus),
      activeBranches,
      completedBranches,
      failedBranches,
      totalBranches: branches.length,
      elapsedMs: job.startedAt ? Date.now() - job.startedAt : 0,
      overallConfidence: job.overallConfidence,
      contradictionsCount: job.contradictions?.length ?? 0,
    };
  },
});

/**
 * Get DD memo by entity
 */
export const getDDMemoByEntity = query({
  args: {
    entityName: v.string(),
    entityType: v.union(v.literal("company"), v.literal("fund"), v.literal("person")),
  },
  handler: async (ctx, { entityName, entityType }) => {
    return await ctx.db
      .query("dueDiligenceMemos")
      .withIndex("by_entity", (q) => q.eq("entityName", entityName).eq("entityType", entityType))
      .order("desc")
      .first();
  },
});

/**
 * Internal query to get job (for actions)
 */
export const getDDJobInternal = internalQuery({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    return await ctx.db
      .query("dueDiligenceJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first();
  },
});

// ============================================================================
// Mutations - Job Management
// ============================================================================

/**
 * Create a new DD job
 */
export const createDDJob = mutation({
  args: {
    entityName: v.string(),
    entityType: v.union(v.literal("company"), v.literal("fund"), v.literal("person")),
    triggerSource: v.union(
      v.literal("funding_detection"),
      v.literal("deals_feed"),
      v.literal("manual"),
      v.literal("scheduled_refresh"),
      v.literal("encounter")
    ),
    triggerEventId: v.optional(v.string()),
    triggerEncounterId: v.optional(v.id("encounterEvents")),
    entityId: v.optional(v.id("entityContexts")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const jobId = crypto.randomUUID();

    // Check for existing active job for this entity
    const existingJob = await ctx.db
      .query("dueDiligenceJobs")
      .withIndex("by_entity", (q) =>
        q.eq("entityName", args.entityName).eq("entityType", args.entityType)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "analyzing"),
          q.eq(q.field("status"), "executing"),
          q.eq(q.field("status"), "cross_checking"),
          q.eq(q.field("status"), "synthesizing")
        )
      )
      .first() as Doc<"dueDiligenceJobs"> | null;

    if (existingJob) {
      // Return existing job ID instead of creating duplicate
      return { jobId: existingJob.jobId, existing: true };
    }

    await ctx.db.insert("dueDiligenceJobs", {
      jobId,
      userId: args.userId,
      entityId: args.entityId,
      entityName: args.entityName,
      entityType: args.entityType,
      triggerSource: args.triggerSource,
      triggerEventId: args.triggerEventId,
      triggerEncounterId: args.triggerEncounterId,
      status: "pending",
      activeBranches: [],
      createdAt: now,
    });

    return { jobId, existing: false };
  },
});

/**
 * Internal create DD job (for actions)
 */
export const createDDJobInternal = internalMutation({
  args: {
    entityName: v.string(),
    entityType: v.union(v.literal("company"), v.literal("fund"), v.literal("person")),
    triggerSource: v.union(
      v.literal("funding_detection"),
      v.literal("deals_feed"),
      v.literal("manual"),
      v.literal("scheduled_refresh"),
      v.literal("encounter")
    ),
    triggerEventId: v.optional(v.string()),
    triggerEncounterId: v.optional(v.id("encounterEvents")),
    entityId: v.optional(v.id("entityContexts")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const jobId = crypto.randomUUID();

    // Check for existing active job for this entity
    const existingJob = await ctx.db
      .query("dueDiligenceJobs")
      .withIndex("by_entity", (q) =>
        q.eq("entityName", args.entityName).eq("entityType", args.entityType)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "analyzing"),
          q.eq(q.field("status"), "executing"),
          q.eq(q.field("status"), "cross_checking"),
          q.eq(q.field("status"), "synthesizing")
        )
      )
      .first() as Doc<"dueDiligenceJobs"> | null;

    if (existingJob) {
      return { jobId: existingJob.jobId, existing: true };
    }

    await ctx.db.insert("dueDiligenceJobs", {
      jobId,
      userId: args.userId,
      entityId: args.entityId,
      entityName: args.entityName,
      entityType: args.entityType,
      triggerSource: args.triggerSource,
      triggerEventId: args.triggerEventId,
      triggerEncounterId: args.triggerEncounterId,
      status: "pending",
      activeBranches: [],
      createdAt: now,
    });

    return { jobId, existing: false };
  },
});

/**
 * Update DD job status
 */
export const updateDDJobStatus = internalMutation({
  args: {
    jobId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("executing"),
      v.literal("cross_checking"),
      v.literal("synthesizing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    complexitySignals: v.optional(v.any()),
    conditionalBranchesSpawned: v.optional(v.array(v.string())),
    activeBranches: v.optional(v.array(v.string())),
    parallelTreeId: v.optional(v.id("parallelTaskTrees")),
    ddMemoId: v.optional(v.id("dueDiligenceMemos")),
    overallConfidence: v.optional(v.number()),
    contradictions: v.optional(v.array(v.any())),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, status, ...updates }) => {
    const now = Date.now();

    const job = await ctx.db
      .query("dueDiligenceJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"dueDiligenceJobs"> | null;

    if (!job) throw new Error(`DD job not found: ${jobId}`);

    const patch: Record<string, unknown> = { status };

    if (status === "analyzing" && !job.startedAt) {
      patch.startedAt = now;
    }

    if (status === "completed" || status === "failed") {
      patch.completedAt = now;
      if (job.startedAt) {
        patch.elapsedMs = now - job.startedAt;
      }
    }

    // Apply optional updates
    if (updates.complexitySignals !== undefined) {
      patch.complexitySignals = updates.complexitySignals;
    }
    if (updates.conditionalBranchesSpawned !== undefined) {
      patch.conditionalBranchesSpawned = updates.conditionalBranchesSpawned;
    }
    if (updates.activeBranches !== undefined) {
      patch.activeBranches = updates.activeBranches;
    }
    if (updates.parallelTreeId !== undefined) {
      patch.parallelTreeId = updates.parallelTreeId;
    }
    if (updates.ddMemoId !== undefined) {
      patch.ddMemoId = updates.ddMemoId;
    }
    if (updates.overallConfidence !== undefined) {
      patch.overallConfidence = updates.overallConfidence;
    }
    if (updates.contradictions !== undefined) {
      patch.contradictions = updates.contradictions;
    }
    if (updates.error !== undefined) {
      patch.error = updates.error;
    }

    await ctx.db.patch(job._id, patch);
  },
});

// ============================================================================
// Mutations - Branch Management
// ============================================================================

/**
 * Create DD research branches
 */
export const createDDBranches = internalMutation({
  args: {
    jobId: v.string(),
    branches: v.array(v.object({
      branchType: v.string(),
      taskTreeId: v.optional(v.id("parallelTaskTrees")),
      taskNodeId: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { jobId, branches }) => {
    const now = Date.now();
    const branchIds: string[] = [];

    for (const branch of branches) {
      const branchId = crypto.randomUUID();

      await ctx.db.insert("ddResearchBranches", {
        jobId,
        branchId,
        branchType: branch.branchType as BranchType,
        status: "pending",
        taskTreeId: branch.taskTreeId,
        taskNodeId: branch.taskNodeId,
        createdAt: now,
      });

      branchIds.push(branchId);
    }

    return branchIds;
  },
});

/**
 * Update DD branch status and findings
 */
export const updateDDBranch = internalMutation({
  args: {
    branchId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("awaiting_verification"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    findings: v.optional(v.any()),
    findingsSummary: v.optional(v.string()),
    confidence: v.optional(v.number()),
    verificationScore: v.optional(v.number()),
    sourcesUsed: v.optional(v.array(v.any())),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { branchId, status, ...updates }) => {
    const now = Date.now();

    const branch = await ctx.db
      .query("ddResearchBranches")
      .withIndex("by_branchId", (q) => q.eq("branchId", branchId))
      .first() as Doc<"ddResearchBranches"> | null;

    if (!branch) throw new Error(`DD branch not found: ${branchId}`);

    const patch: Record<string, unknown> = { status };

    if (status === "running" && !branch.startedAt) {
      patch.startedAt = now;
    }

    if (status === "completed" || status === "failed" || status === "skipped") {
      patch.completedAt = now;
      if (branch.startedAt) {
        patch.elapsedMs = now - branch.startedAt;
      }
    }

    // Apply optional updates
    if (updates.findings !== undefined) patch.findings = updates.findings;
    if (updates.findingsSummary !== undefined) patch.findingsSummary = updates.findingsSummary;
    if (updates.confidence !== undefined) patch.confidence = updates.confidence;
    if (updates.verificationScore !== undefined) patch.verificationScore = updates.verificationScore;
    if (updates.sourcesUsed !== undefined) patch.sourcesUsed = updates.sourcesUsed;
    if (updates.error !== undefined) patch.error = updates.error;

    await ctx.db.patch(branch._id, patch);
  },
});

/**
 * Insert DD memo
 */
export const insertDDMemo = internalMutation({
  args: {
    jobId: v.string(),
    entityName: v.string(),
    entityType: v.union(v.literal("company"), v.literal("fund"), v.literal("person")),
    executiveSummary: v.string(),
    verdict: v.union(
      v.literal("STRONG_BUY"),
      v.literal("BUY"),
      v.literal("HOLD"),
      v.literal("PASS"),
      v.literal("INSUFFICIENT_DATA")
    ),
    verdictRationale: v.optional(v.string()),
    companyOverview: v.any(),
    marketAnalysis: v.any(),
    teamAnalysis: v.any(),
    fundingHistory: v.any(),
    risks: v.array(v.any()),
    investmentThesis: v.any(),
    verificationSummary: v.any(),
    sources: v.array(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dueDiligenceMemos", args);
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

function getPhaseDescription(status: DDJobStatus): string {
  const phases: Record<DDJobStatus, string> = {
    pending: "Job queued",
    analyzing: "Analyzing complexity signals",
    executing: "Executing parallel research branches",
    cross_checking: "Cross-checking findings for contradictions",
    synthesizing: "Synthesizing due diligence memo",
    completed: "Due diligence complete",
    failed: "Due diligence failed",
  };
  return phases[status] ?? status;
}
