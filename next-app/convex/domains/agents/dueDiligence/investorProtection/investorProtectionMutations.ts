/**
 * investorProtectionMutations.ts
 *
 * Database mutations for Investor Protection Due Diligence.
 * Handles CRUD operations for verification jobs and results.
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "../../../../_generated/server";
import { Doc, Id } from "../../../../_generated/dataModel";
import type { InvestorProtectionJobStatus } from "./types";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get investor protection job by jobId
 */
export const getJob = query({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db
      .query("investorPlaybookJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"investorPlaybookJobs"> | null;

    if (!job) return null;

    // Get result if completed
    let result = null;
    if (job.resultId) {
      result = await ctx.db.get(job.resultId);
    }

    return { job, result };
  },
});

/**
 * Get jobs for a user
 */
export const getUserJobs = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, status, limit = 20 }) => {
    const jobs = await ctx.db
      .query("investorPlaybookJobs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit) as Doc<"investorPlaybookJobs">[];

    if (status) {
      return jobs.filter((j) => j.status === status);
    }

    return jobs;
  },
});

/**
 * Get job progress for real-time UI updates
 */
export const getJobProgress = query({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db
      .query("investorPlaybookJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"investorPlaybookJobs"> | null;

    if (!job) return null;

    const completedPhases: string[] = [];
    if (job.extractedClaims) completedPhases.push("claims_extraction");
    if (job.entityVerification) completedPhases.push("entity_verification");
    if (job.securitiesVerification) completedPhases.push("securities_verification");
    if (job.claimsValidation) completedPhases.push("claims_validation");
    if (job.moneyFlowVerification) completedPhases.push("money_flow_verification");
    if (job.resultId) completedPhases.push("synthesis");

    return {
      jobId: job.jobId,
      status: job.status,
      currentPhase: job.status,
      completedPhases,
      elapsedMs: job.elapsedMs ?? (Date.now() - job.createdAt),
      error: job.error,
    };
  },
});

/**
 * Internal: Get job by ID (for actions)
 */
export const internalGetJob = internalQuery({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    return await ctx.db
      .query("investorPlaybookJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"investorPlaybookJobs"> | null;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new investor protection verification job
 */
export const createJob = mutation({
  args: {
    jobId: v.string(),
    userId: v.id("users"),
    offeringName: v.string(),
    offeringUrl: v.optional(v.string()),
    fundingPortal: v.optional(v.string()),
    pitchDocumentId: v.optional(v.id("documents")),
    pitchText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const docId = await ctx.db.insert("investorPlaybookJobs", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });

    return { docId, jobId: args.jobId };
  },
});

/**
 * Internal: Create job (for actions)
 */
export const internalCreateJob = internalMutation({
  args: {
    jobId: v.string(),
    userId: v.id("users"),
    offeringName: v.string(),
    offeringUrl: v.optional(v.string()),
    fundingPortal: v.optional(v.string()),
    pitchDocumentId: v.optional(v.id("documents")),
    pitchText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const docId = await ctx.db.insert("investorPlaybookJobs", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });

    return { docId, jobId: args.jobId };
  },
});

/**
 * Internal: Update job status
 */
export const internalUpdateJobStatus = internalMutation({
  args: {
    jobId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("extracting_claims"),
      v.literal("verifying_entity"),
      v.literal("verifying_securities"),
      v.literal("validating_claims"),
      v.literal("checking_money_flow"),
      v.literal("synthesizing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    elapsedMs: v.optional(v.number()),
  },
  handler: async (ctx, { jobId, status, error, startedAt, completedAt, elapsedMs }) => {
    const job = await ctx.db
      .query("investorPlaybookJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"investorPlaybookJobs"> | null;

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const updates: Record<string, unknown> = { status };
    if (error !== undefined) updates.error = error;
    if (startedAt !== undefined) updates.startedAt = startedAt;
    if (completedAt !== undefined) updates.completedAt = completedAt;
    if (elapsedMs !== undefined) updates.elapsedMs = elapsedMs;

    await ctx.db.patch(job._id, updates);
  },
});

/**
 * Internal: Save extracted claims
 */
export const internalSaveExtractedClaims = internalMutation({
  args: {
    jobId: v.string(),
    extractedClaims: v.object({
      companyName: v.string(),
      companyNameVariants: v.optional(v.array(v.string())),
      incorporationState: v.optional(v.string()),
      incorporationDate: v.optional(v.string()),
      secFilingType: v.optional(v.string()),
      fundingPortal: v.optional(v.string()),
      fdaClaims: v.array(v.object({
        description: v.string(),
        claimedType: v.string(),
        clearanceNumber: v.optional(v.string()),
        productName: v.optional(v.string()),
      })),
      patentClaims: v.array(v.object({
        description: v.string(),
        patentNumber: v.optional(v.string()),
        status: v.string(),
        inventorNames: v.optional(v.array(v.string())),
      })),
      fundingClaims: v.optional(v.object({
        targetRaise: v.optional(v.string()),
        previousRaises: v.optional(v.array(v.string())),
        valuation: v.optional(v.string()),
      })),
      otherClaims: v.array(v.object({
        category: v.string(),
        claim: v.string(),
        evidence: v.optional(v.string()),
      })),
      extractedAt: v.number(),
      confidence: v.number(),
    }),
  },
  handler: async (ctx, { jobId, extractedClaims }) => {
    const job = await ctx.db
      .query("investorPlaybookJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"investorPlaybookJobs"> | null;

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await ctx.db.patch(job._id, { extractedClaims });
  },
});

/**
 * Internal: Save entity verification result
 */
export const internalSaveEntityVerification = internalMutation({
  args: {
    jobId: v.string(),
    entityVerification: v.object({
      verified: v.boolean(),
      stateRegistry: v.optional(v.string()),
      record: v.optional(v.object({
        state: v.string(),
        entityName: v.string(),
        fileNumber: v.string(),
        formationDate: v.optional(v.string()),
        registeredAgent: v.optional(v.string()),
        registeredAgentAddress: v.optional(v.string()),
        status: v.string(),
        entityType: v.optional(v.string()),
      })),
      discrepancies: v.array(v.string()),
      redFlags: v.array(v.string()),
      verifiedAt: v.number(),
    }),
  },
  handler: async (ctx, { jobId, entityVerification }) => {
    const job = await ctx.db
      .query("investorPlaybookJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"investorPlaybookJobs"> | null;

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await ctx.db.patch(job._id, { entityVerification });
  },
});

/**
 * Internal: Save securities verification result
 */
export const internalSaveSecuritiesVerification = internalMutation({
  args: {
    jobId: v.string(),
    securitiesVerification: v.object({
      verified: v.boolean(),
      filingType: v.optional(v.string()),
      filing: v.optional(v.object({
        formType: v.string(),
        filingDate: v.string(),
        cik: v.string(),
        accessionNumber: v.string(),
        issuerName: v.string(),
        offeringAmount: v.optional(v.string()),
        url: v.string(),
      })),
      filingFound: v.boolean(),
      fundingPortal: v.optional(v.object({
        portalName: v.string(),
        finraId: v.optional(v.string()),
        registrationDate: v.optional(v.string()),
        isRegistered: v.boolean(),
      })),
      portalVerified: v.boolean(),
      discrepancies: v.array(v.string()),
      redFlags: v.array(v.string()),
      verifiedAt: v.number(),
    }),
  },
  handler: async (ctx, { jobId, securitiesVerification }) => {
    const job = await ctx.db
      .query("investorPlaybookJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"investorPlaybookJobs"> | null;

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await ctx.db.patch(job._id, { securitiesVerification });
  },
});

/**
 * Internal: Save claims validation result
 */
export const internalSaveClaimsValidation = internalMutation({
  args: {
    jobId: v.string(),
    claimsValidation: v.object({
      fdaVerifications: v.array(v.object({
        claimDescription: v.string(),
        verified: v.boolean(),
        kNumber: v.optional(v.string()),
        deviceName: v.optional(v.string()),
        applicant: v.optional(v.string()),
        discrepancy: v.optional(v.string()),
      })),
      patentVerifications: v.array(v.object({
        claimDescription: v.string(),
        verified: v.boolean(),
        patentNumber: v.optional(v.string()),
        assignee: v.optional(v.string()),
        assigneeMatches: v.boolean(),
        discrepancy: v.optional(v.string()),
      })),
      allFDAClaimed: v.number(),
      allFDAVerified: v.number(),
      allPatentsClaimed: v.number(),
      allPatentsVerified: v.number(),
      verifiedAt: v.number(),
    }),
  },
  handler: async (ctx, { jobId, claimsValidation }) => {
    const job = await ctx.db
      .query("investorPlaybookJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"investorPlaybookJobs"> | null;

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await ctx.db.patch(job._id, { claimsValidation });
  },
});

/**
 * Internal: Save money flow verification result
 */
export const internalSaveMoneyFlowVerification = internalMutation({
  args: {
    jobId: v.string(),
    moneyFlowVerification: v.object({
      verified: v.boolean(),
      expectedFlow: v.string(),
      escrowAgent: v.optional(v.string()),
      escrowVerified: v.boolean(),
      redFlags: v.array(v.string()),
      verifiedAt: v.number(),
    }),
  },
  handler: async (ctx, { jobId, moneyFlowVerification }) => {
    const job = await ctx.db
      .query("investorPlaybookJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"investorPlaybookJobs"> | null;

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await ctx.db.patch(job._id, { moneyFlowVerification });
  },
});

/**
 * Internal: Save final result and link to job
 */
export const internalSaveResult = internalMutation({
  args: {
    jobId: v.string(),
    entityName: v.string(),
    entityType: v.union(
      v.literal("company"),
      v.literal("fund"),
      v.literal("person")
    ),
    overallRisk: v.union(
      v.literal("low"),
      v.literal("moderate"),
      v.literal("elevated"),
      v.literal("high"),
      v.literal("critical")
    ),
    recommendation: v.union(
      v.literal("proceed"),
      v.literal("proceed_with_conditions"),
      v.literal("require_resolution"),
      v.literal("pass")
    ),
    shouldDisengage: v.boolean(),
    verificationScores: v.object({
      entity: v.number(),
      securities: v.number(),
      finra: v.number(),
      fda: v.number(),
      patents: v.number(),
      moneyFlow: v.number(),
      overall: v.number(),
    }),
    discrepancyCount: v.number(),
    criticalDiscrepancies: v.number(),
    stopRulesTriggered: v.array(v.string()),
    conditions: v.optional(v.array(v.string())),
    requiredResolutions: v.optional(v.array(v.string())),
    branchesExecuted: v.array(v.string()),
    executionTimeMs: v.number(),
    fullSynthesis: v.optional(v.any()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { jobId, ...resultData } = args;

    // Insert result
    const resultId = await ctx.db.insert("investorPlaybookResults", {
      jobId,
      ...resultData,
      createdAt: Date.now(),
    });

    // Link result to job
    const job = await ctx.db
      .query("investorPlaybookJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .first() as Doc<"investorPlaybookJobs"> | null;

    if (job) {
      await ctx.db.patch(job._id, {
        resultId,
        status: "completed",
        completedAt: Date.now(),
        elapsedMs: Date.now() - job.createdAt,
      });
    }

    return resultId;
  },
});

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Internal: Cache entity verification result
 */
export const internalCacheEntityVerification = internalMutation({
  args: {
    entityName: v.string(),
    state: v.string(),
    fileNumber: v.optional(v.string()),
    formationDate: v.optional(v.string()),
    entityType: v.optional(v.string()),
    status: v.union(
      v.literal("Active"),
      v.literal("Inactive"),
      v.literal("Dissolved"),
      v.literal("Merged"),
      v.literal("Suspended"),
      v.literal("Unknown")
    ),
    registeredAgent: v.optional(v.object({
      name: v.string(),
      address: v.string(),
    })),
    goodStanding: v.optional(v.boolean()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if exists
    const existing = await ctx.db
      .query("investorPlaybookEntityCache")
      .withIndex("by_entity_state", (q) => q.eq("entityName", args.entityName).eq("state", args.state))
      .first() as Doc<"investorPlaybookEntityCache"> | null;

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        verifiedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("investorPlaybookEntityCache", {
        ...args,
        verifiedAt: Date.now(),
      });
    }
  },
});

/**
 * Internal: Get cached entity verification
 */
export const internalGetCachedEntity = internalQuery({
  args: {
    entityName: v.string(),
    state: v.string(),
    maxAgeMs: v.optional(v.number()),
  },
  handler: async (ctx, { entityName, state, maxAgeMs = 24 * 60 * 60 * 1000 }) => {
    const cached = await ctx.db
      .query("investorPlaybookEntityCache")
      .withIndex("by_entity_state", (q) => q.eq("entityName", entityName).eq("state", state))
      .first() as Doc<"investorPlaybookEntityCache"> | null;

    if (!cached) return null;

    // Check if stale
    if (Date.now() - cached.verifiedAt > maxAgeMs) {
      return null;
    }

    return cached;
  },
});

/**
 * Internal: Cache SEC filing
 */
export const internalCacheSECFiling = internalMutation({
  args: {
    entityName: v.string(),
    cik: v.optional(v.string()),
    formType: v.string(),
    accessionNumber: v.string(),
    filingDate: v.string(),
    filingUrl: v.string(),
    offeringAmount: v.optional(v.number()),
    intermediaryName: v.optional(v.string()),
    parsedData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check if exists by accession number
    const existing = await ctx.db
      .query("investorPlaybookSecCache")
      .filter((q) => q.eq(q.field("accessionNumber"), args.accessionNumber))
      .first() as Doc<"investorPlaybookSecCache"> | null;

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        cachedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("investorPlaybookSecCache", {
        ...args,
        cachedAt: Date.now(),
      });
    }
  },
});

/**
 * Internal: Get cached SEC filings for entity
 */
export const internalGetCachedSECFilings = internalQuery({
  args: {
    entityName: v.string(),
    formType: v.optional(v.string()),
    maxAgeMs: v.optional(v.number()),
  },
  handler: async (ctx, { entityName, formType, maxAgeMs = 24 * 60 * 60 * 1000 }) => {
    let query = ctx.db
      .query("investorPlaybookSecCache")
      .withIndex("by_entity", (q) => q.eq("entityName", entityName));

    const filings = await query.collect();

    // Filter by form type and freshness
    return filings.filter((f) => {
      if (formType && f.formType !== formType) return false;
      if (Date.now() - f.cachedAt > maxAgeMs) return false;
      return true;
    });
  },
});
