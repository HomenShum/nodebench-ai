// convex/domains/operations/privacyEnforcement.ts
// Privacy & Retention Policy Enforcement
//
// Implements GDPR storage limitation + right to deletion.
// Enforces data-class-based retention with automated deletion.
//
// ============================================================================
// WHY PRIVACY ENFORCEMENT MATTERS
// ============================================================================
//
// 1. GDPR STORAGE LIMITATION (Article 5(1)(e))
//    - Personal data kept no longer than necessary for purpose
//    - Must define and enforce retention periods
//    - Automated deletion required (not just "policy")
//
// 2. RIGHT TO DELETION (Article 17)
//    - Users can request deletion of their data
//    - Must be honored within 30 days
//    - Requires tombstone + audit trail
//
// 3. DATA MINIMIZATION (Article 5(1)(c))
//    - Collect only necessary data
//    - Store hashes/pointers where possible
//    - Field-level minimization
//
// 4. PURPOSE LIMITATION (Article 5(1)(b))
//    - Data used only for stated purpose
//    - Access controls by purpose
//
// ============================================================================
// DATA CLASSES & RETENTION
// ============================================================================
//
// Raw Media (photos/audio/video):      7-30 days (shortest)
// Derived Text (transcripts/summaries): 90-365 days
// Operational Logs:                     30-90 days + aggregation
// Audit Logs:                           7 years (compliance)
// Ground Truth Labels:                  Indefinite (with consent)
//
// ============================================================================

import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Doc, Id, TableNames } from "../../_generated/dataModel";
import { requireAutonomousAdminAccess } from "./autonomousControlTower";

/* ------------------------------------------------------------------ */
/* DATA CLASS DEFINITIONS                                              */
/* ------------------------------------------------------------------ */

export type DataClass =
  | "raw_media"              // Photos, audio, video
  | "derived_text"           // Transcripts, summaries, extractions
  | "operational_logs"       // Inconclusive events, performance metrics
  | "audit_logs"             // Compliance, security, validation logs
  | "ground_truth_labels"    // Human labels for calibration
  | "financial_fundamentals" // XBRL data, SEC filings
  | "model_outputs";         // DCF models, evaluations, repro packs

export interface RetentionPolicy {
  dataClass: DataClass;

  /** TTL in days */
  retentionDays: number;

  /** What happens after TTL */
  action: "delete" | "aggregate" | "archive";

  /** Whether this requires user consent to extend */
  requiresConsent: boolean;

  /** Legal basis for retention */
  legalBasis: "consent" | "contract" | "legal_obligation" | "legitimate_interest";

  /** Purpose limitation */
  allowedPurposes: string[];
}

/* ------------------------------------------------------------------ */
/* RETENTION POLICIES                                                  */
/* ------------------------------------------------------------------ */

export const RETENTION_POLICIES: Record<DataClass, RetentionPolicy> = {
  raw_media: {
    dataClass: "raw_media",
    retentionDays: 30,
    action: "delete",
    requiresConsent: true,
    legalBasis: "consent",
    allowedPurposes: ["verification", "evidence_collection"],
  },

  derived_text: {
    dataClass: "derived_text",
    retentionDays: 365,
    action: "delete",
    requiresConsent: false,
    legalBasis: "legitimate_interest",
    allowedPurposes: ["verification", "model_training", "analytics"],
  },

  operational_logs: {
    dataClass: "operational_logs",
    retentionDays: 90,
    action: "aggregate",  // Keep aggregated metrics, delete raw logs
    requiresConsent: false,
    legalBasis: "legitimate_interest",
    allowedPurposes: ["operations", "reliability", "slo_monitoring"],
  },

  audit_logs: {
    dataClass: "audit_logs",
    retentionDays: 2555,  // 7 years (compliance requirement)
    action: "archive",
    requiresConsent: false,
    legalBasis: "legal_obligation",
    allowedPurposes: ["compliance", "audit", "security"],
  },

  ground_truth_labels: {
    dataClass: "ground_truth_labels",
    retentionDays: -1,  // Indefinite (with consent)
    action: "delete",   // Only on explicit user request
    requiresConsent: true,
    legalBasis: "consent",
    allowedPurposes: ["model_training", "calibration", "evaluation"],
  },

  financial_fundamentals: {
    dataClass: "financial_fundamentals",
    retentionDays: 1825,  // 5 years (financial data retention)
    action: "archive",
    requiresConsent: false,
    legalBasis: "legitimate_interest",
    allowedPurposes: ["financial_analysis", "model_training", "compliance"],
  },

  model_outputs: {
    dataClass: "model_outputs",
    retentionDays: 730,  // 2 years
    action: "archive",
    requiresConsent: false,
    legalBasis: "legitimate_interest",
    allowedPurposes: ["evaluation", "audit", "model_validation"],
  },
};

/* ------------------------------------------------------------------ */
/* TABLE-TO-DATA-CLASS MAPPING                                         */
/* ------------------------------------------------------------------ */

export const TABLE_DATA_CLASS_MAP: Record<string, DataClass> = {
  // Operational logs
  inconclusiveEventLog: "operational_logs",
  sourceQualityLog: "operational_logs",
  sloMeasurements: "operational_logs",
  modelPerformanceMetrics: "operational_logs",
  retentionAggregations: "operational_logs",

  // Audit logs
  alertHistory: "audit_logs",
  restatementDecisionLog: "audit_logs",
  validationReports: "audit_logs",
  calibrationDeployments: "audit_logs",
  groundTruthAuditLog: "audit_logs",
  deletionRequests: "audit_logs",
  deletionTombstones: "audit_logs",
  archivedRecords: "audit_logs",
  narrativeSearchLog: "audit_logs",

  // Ground truth
  groundTruthVersions: "ground_truth_labels",

  // Financial data
  financialFundamentals: "financial_fundamentals",
  groundTruthFinancials: "financial_fundamentals",
  sourceArtifacts: "derived_text",
  evidenceArtifacts: "audit_logs",

  // Model outputs
  dcfModels: "model_outputs",
  financialModelEvaluations: "model_outputs",
  modelReproPacks: "model_outputs",
  narrativeThreads: "model_outputs",
  narrativeEvents: "model_outputs",
  narrativePosts: "model_outputs",
  narrativeReplies: "model_outputs",
  temporalFacts: "model_outputs",
  narrativeDisputeChains: "model_outputs",
  narrativeCorrelations: "model_outputs",
};

type TtlTableConfig = {
  timestampField: string;
  index?: string;
};

const TTL_TABLE_CONFIG: Record<string, TtlTableConfig> = {
  inconclusiveEventLog: { timestampField: "occurredAt", index: "by_occurred_at" },
  sourceQualityLog: { timestampField: "classifiedAt", index: "by_classified_at" },
  sloMeasurements: { timestampField: "recordedAt", index: "by_recorded" },
  modelPerformanceMetrics: { timestampField: "recordedAt", index: "by_recorded_at" },
  alertHistory: { timestampField: "triggeredAt", index: "by_triggered" },
  restatementDecisionLog: { timestampField: "decidedAt", index: "by_decided_at" },
  calibrationDeployments: { timestampField: "deployedAt", index: "by_deployed_at" },
  validationReports: { timestampField: "generatedAt", index: "by_generated_at" },
  narrativeSearchLog: { timestampField: "searchedAt", index: "by_searched_at" },
  evidenceArtifacts: { timestampField: "createdAt", index: "by_created_at" },
  narrativeEvents: { timestampField: "createdAt" },
};

function fnv1a32Hex(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/* ------------------------------------------------------------------ */
/* DELETION WORKFLOW                                                   */
/* ------------------------------------------------------------------ */

/**
 * Deletion request (Right to Deletion / GDPR Article 17)
 */
export interface DeletionRequest {
  requestId: string;

  /** What to delete */
  scope: "user_data" | "entity_data" | "specific_records";

  /** User ID or entity key */
  subject: string;

  /** Specific record IDs (if scope is specific_records) */
  recordIds?: string[];

  /** Requester */
  requestedBy: string;
  requestedAt: number;

  /** Status */
  status: "pending" | "in_progress" | "completed" | "failed";

  /** Deletion summary */
  deletionSummary?: {
    tablesAffected: string[];
    recordsDeleted: number;
    tombstonesCreated: number;
    failedDeletions: Array<{
      table: string;
      recordId: string;
      error: string;
    }>;
  };

  /** Completion */
  completedAt?: number;
  completedBy?: string;
}

/* ------------------------------------------------------------------ */
/* SCHEDULED DELETION JOBS                                             */
/* ------------------------------------------------------------------ */

/**
 * Run TTL-based deletion for expired records
 */
export const runTtlDeletion = internalAction({
  args: {
    dataClass: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    dataClass: v.optional(v.string()),
    tablesProcessed: v.array(v.string()),
    recordsDeleted: v.number(),
    recordsAggregated: v.number(),
    recordsArchived: v.number(),
    dryRun: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    let recordsDeleted = 0;
    let recordsAggregated = 0;
    let recordsArchived = 0;
    const tablesProcessed: string[] = [];

    const dataClassesToProcess = args.dataClass
      ? [args.dataClass as DataClass]
      : Object.keys(RETENTION_POLICIES) as DataClass[];

    for (const dataClass of dataClassesToProcess) {
      const policy = RETENTION_POLICIES[dataClass];
      if (policy.retentionDays < 0) continue;  // Indefinite retention

      // Find tables for this data class
      const tables = Object.entries(TABLE_DATA_CLASS_MAP)
        .filter(([_, dc]) => dc === dataClass)
        .map(([table]) => table);

      for (const table of tables) {
        tablesProcessed.push(table);

        // Calculate expiration timestamp
        const expiresAt = Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000;

        // Query expired records
        const expired = await ctx.runQuery(
          internal.domains.operations.privacyEnforcement.getExpiredRecords,
          { table, expiresAt }
        );

        if (policy.action === "delete") {
          if (!dryRun) {
            for (const recordId of expired) {
              await ctx.runMutation(
                internal.domains.operations.privacyEnforcement.deleteRecord,
                { table, recordId }
              );
              recordsDeleted++;
            }
          } else {
            recordsDeleted += expired.length;
          }
        } else if (policy.action === "aggregate") {
          if (!dryRun) {
            // Aggregate then delete
            await ctx.runMutation(
              internal.domains.operations.privacyEnforcement.aggregateAndDelete,
              { table, recordIds: expired }
            );
            recordsAggregated += expired.length;
          } else {
            recordsAggregated += expired.length;
          }
        } else if (policy.action === "archive") {
          if (!dryRun) {
            // Move to archive storage
            await ctx.runMutation(
              internal.domains.operations.privacyEnforcement.archiveRecords,
              { table, recordIds: expired }
            );
            recordsArchived += expired.length;
          } else {
            recordsArchived += expired.length;
          }
        }
      }
    }

    return {
      dataClass: args.dataClass,
      tablesProcessed,
      recordsDeleted,
      recordsAggregated,
      recordsArchived,
      dryRun,
    };
  },
});

/**
 * Process a reviewed request in bounded, resumable transactions.
 * Full user/entity erasure is held until its ownership/coverage plan is reviewed.
 */
const DELETION_BATCH_SIZE = 8;
const MAX_DELETION_RECORDS = 200;
const DELETION_ACTION_BUDGET_MS = 10_000;
const deletionOutcomeValidator = v.object({
  success: v.boolean(),
  status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("failed")),
  recordsDeleted: v.number(),
  tablesAffected: v.array(v.string()),
});
type DeletionOutcome = {
  success: boolean;
  status: Doc<"deletionRequests">["status"];
  recordsDeleted: number;
  tablesAffected: string[];
};

export const processDeletionRequest = internalAction({
  args: { requestId: v.id("deletionRequests") },
  returns: deletionOutcomeValidator,
  handler: async (ctx, args): Promise<DeletionOutcome> => {
    const deadline = Date.now() + DELETION_ACTION_BUDGET_MS;
    try {
      let result: DeletionOutcome;
      // Each committed batch persists its cursor. If this action is interrupted,
      // the cron can resume it; no action-local lease or counter is authoritative.
      for (let batch = 0; ; batch++) {
        result = await ctx.runMutation(internal.domains.operations.privacyEnforcement.advanceDeletionRequest, args);
        if (result.status !== "in_progress" || batch + 1 >= MAX_DELETION_RECORDS / DELETION_BATCH_SIZE || Date.now() >= deadline) {
          return result;
        }
      }
    } catch (error) {
      // The failed batch rolls back before this independent failure write.
      // Do not swallow failure of the failure write: callers must see the outage.
      await ctx.runMutation(internal.domains.operations.privacyEnforcement.recordDeletionFailure, {
        requestId: args.requestId,
        error: (error instanceof Error ? error.message : String(error)).slice(0, 512),
      });
      throw error;
    }
  },
});

/* ------------------------------------------------------------------ */
/* FIELD-LEVEL MINIMIZATION                                            */
/* ------------------------------------------------------------------ */

/**
 * Hash sensitive fields for storage
 */
export function hashSensitiveField(value: string): string {
  // In production, use crypto.subtle.digest
  // For now, simplified
  return `hash_${value.length}_${value.charCodeAt(0)}`;
}

/**
 * Minimize personal data before storage
 */
export function minimizePersonalData(data: {
  email?: string;
  name?: string;
  phone?: string;
  ipAddress?: string;
}): {
  emailHash?: string;
  nameInitials?: string;
  phoneHash?: string;
  ipAddressSubnet?: string;
} {
  return {
    emailHash: data.email ? hashSensitiveField(data.email) : undefined,
    nameInitials: data.name
      ? data.name.split(" ").map(n => n[0]).join("")
      : undefined,
    phoneHash: data.phone ? hashSensitiveField(data.phone) : undefined,
    ipAddressSubnet: data.ipAddress
      ? data.ipAddress.split(".").slice(0, 3).join(".") + ".0"
      : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* CONVEX QUERIES/MUTATIONS                                            */
/* ------------------------------------------------------------------ */

export const getExpiredRecords = internalQuery({
  args: {
    table: v.string(),
    expiresAt: v.number(),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const cfg = TTL_TABLE_CONFIG[args.table];
    if (!cfg) return [];

    const tableName = args.table as any;
    const limit = 500;

    try {
      if (cfg.index) {
        const docs = await (ctx.db.query(tableName) as any)
          .withIndex(cfg.index, (q: any) => q.lt(cfg.timestampField, args.expiresAt))
          .take(limit);
        return (docs as any[]).map((d) => String(d._id));
      }

      const docs = await (ctx.db.query(tableName) as any)
        .filter((q: any) => q.lt(q.field(cfg.timestampField), args.expiresAt))
        .take(limit);
      return (docs as any[]).map((d) => String(d._id));
    } catch (err) {
      console.warn("[privacyEnforcement] getExpiredRecords failed:", args.table, err);
      return [];
    }
  },
});

export const deleteRecord = internalMutation({
  args: {
    table: v.string(),
    recordId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = args.recordId as unknown as Id<any>;
    const existing = await ctx.db.get(id);
    if (existing) {
      await ctx.db.delete(id);
    }
    return null;
  },
});

export const aggregateAndDelete = internalMutation({
  args: {
    table: v.string(),
    recordIds: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const dataClass = TABLE_DATA_CLASS_MAP[args.table] ?? "operational_logs";
    await ctx.db.insert("retentionAggregations", {
      table: args.table,
      dataClass,
      expiresAt: now,
      aggregatedAt: now,
      recordsCount: args.recordIds.length,
    });

    for (const recordId of args.recordIds) {
      const id = recordId as unknown as Id<any>;
      const existing = await ctx.db.get(id);
      if (existing) {
        await ctx.db.delete(id);
      }
    }
    return null;
  },
});

export const archiveRecords = internalMutation({
  args: {
    table: v.string(),
    recordIds: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const dataClass = TABLE_DATA_CLASS_MAP[args.table] ?? "audit_logs";

    for (const recordId of args.recordIds) {
      const id = recordId as unknown as Id<any>;
      const existing = await ctx.db.get(id);
      if (!existing) continue;

      const content = JSON.stringify(existing);
      const contentHash = `fnv1a32_${fnv1a32Hex(content)}`;

      await ctx.db.insert("archivedRecords", {
        table: args.table,
        recordId,
        dataClass,
        archivedAt: now,
        contentHash,
        data: existing,
      });

      await ctx.db.delete(id);
    }
    return null;
  },
});

async function authorizedDeletionRequest(ctx: QueryCtx, requestId: Id<"deletionRequests">): Promise<Doc<"deletionRequests"> | null> {
  const request = await ctx.db.get(requestId);
  if (!request) return null;
  // Legacy requester strings are untrusted, even when they name a real admin.
  if (!request.authorizedBy || request.requestedBy !== request.authorizedBy) {
    throw new Error("Deletion request requires authorization review and resubmission");
  }
  await authorizeDeletionScope(ctx, request.authorizedBy, request.scope, request.subject);
  return request;
}

export const getDeletionRequest = internalQuery({
  args: { requestId: v.id("deletionRequests") },
  returns: v.union(v.null(), v.any()),
  handler: (ctx, args): Promise<Doc<"deletionRequests"> | null> => authorizedDeletionRequest(ctx, args.requestId),
});

// These rows establish the authority and evidence used by this executor. Their
// lifecycle requires a dedicated reviewed operation, not generic row deletion.
const PROTECTED_DELETION_TABLES = new Set([
  "deletionRequests", "deletionTombstones", "adminAuditLog", "adminUsers", "users",
]);

function specificRecordReferences(ctx: QueryCtx, refs: string[] | undefined): Array<{ table: TableNames; id: Id<TableNames> }> {
  if (!refs?.length || refs.length > MAX_DELETION_RECORDS) {
    throw new Error("Specific deletion requires between 1 and 200 record references");
  }
  return refs.map(ref => {
    const [table, recordId, extra] = ref.split(":");
    if (!table || !recordId || extra !== undefined || ref.length > 256) throw new Error("Invalid table-bound record reference");
    if (PROTECTED_DELETION_TABLES.has(table)) throw new Error("Protected authority or audit table requires a dedicated reviewed operation");
    const id = ctx.db.normalizeId(table as TableNames, recordId);
    if (!id) throw new Error("Invalid table-bound record reference");
    return { table: table as TableNames, id };
  });
}

function deletionOutcome(request: Doc<"deletionRequests">): DeletionOutcome {
  return {
    success: request.status === "completed",
    status: request.status,
    recordsDeleted: request.deletionSummary?.recordsDeleted ?? 0,
    tablesAffected: request.deletionSummary?.tablesAffected ?? [],
  };
}

async function failDeletionRequest(ctx: MutationCtx, request: Doc<"deletionRequests">, error: string): Promise<DeletionOutcome> {
  const summary = {
    tablesAffected: request.deletionSummary?.tablesAffected ?? [],
    recordsDeleted: request.deletionSummary?.recordsDeleted ?? 0,
    tombstonesCreated: request.deletionSummary?.tombstonesCreated ?? 0,
    failedDeletions: [{ table: "deletionRequests", recordId: String(request._id), error: error.slice(0, 512) }],
  };
  await ctx.db.patch(request._id, { status: "failed", deletionSummary: summary, completedAt: undefined, completedBy: undefined });
  return { success: false, status: "failed", recordsDeleted: summary.recordsDeleted, tablesAffected: summary.tablesAffected };
}

export const advanceDeletionRequest = internalMutation({
  args: { requestId: v.id("deletionRequests") },
  returns: deletionOutcomeValidator,
  handler: async (ctx, args): Promise<DeletionOutcome> => {
    // Authority, rows, tombstones, counters and cursor share one transaction.
    // Overlapping processors conflict on this row and retry from committed state.
    const request = await authorizedDeletionRequest(ctx, args.requestId);
    if (!request) throw new Error("Deletion request not found");
    if (request.status === "failed") return deletionOutcome(request);
    if (request.scope !== "specific_records") {
      return failDeletionRequest(ctx, request, "Full user/entity deletion coverage requires review; no automatic broad deletion was performed. Review ownership, dependent data and retention, then submit explicitly reviewed records.");
    }
    let refs: ReturnType<typeof specificRecordReferences>;
    try {
      // Validate the whole bounded plan before writing even the first batch.
      refs = specificRecordReferences(ctx, request.recordIds);
    } catch (error) {
      return failDeletionRequest(ctx, request, error instanceof Error ? error.message : String(error));
    }
    if (!request.execution && (request.status !== "pending" || request.deletionSummary)) {
      return failDeletionRequest(ctx, request, "Legacy execution state requires review and resubmission; previous deletion coverage cannot be certified.");
    }
    const nextIndex = request.execution?.nextIndex ?? 0;
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex > refs.length ||
        (request.status === "completed" && nextIndex !== refs.length)) {
      return failDeletionRequest(ctx, request, "Invalid execution progress requires review and resubmission");
    }
    if (request.status === "completed") return deletionOutcome(request);
    const summary = request.deletionSummary ?? { tablesAffected: [], recordsDeleted: 0, tombstonesCreated: 0, failedDeletions: [] };
    const tables = new Set(summary.tablesAffected);
    let deleted = 0;
    const end = Math.min(nextIndex + DELETION_BATCH_SIZE, refs.length);
    for (const { table, id } of refs.slice(nextIndex, end)) {
      // A repeated or already-removed ID is satisfied but is not a deletion.
      if (!await ctx.db.get(id)) continue;
      await ctx.db.insert("deletionTombstones", {
        table, recordId: id, deletionRequestId: args.requestId, deletedAt: Date.now(), deletedBy: request.authorizedBy,
      });
      await ctx.db.delete(id);
      deleted++;
      tables.add(table);
    }
    const status = end === refs.length ? "completed" : "in_progress";
    const deletionSummary = {
      tablesAffected: [...tables].sort(), recordsDeleted: summary.recordsDeleted + deleted,
      tombstonesCreated: summary.tombstonesCreated + deleted, failedDeletions: [],
    };
    await ctx.db.patch(args.requestId, {
      status, execution: { version: 1, nextIndex: end }, deletionSummary,
      ...(status === "completed" ? { completedAt: Date.now(), completedBy: request.authorizedBy } : {}),
    });
    return { success: status === "completed", status, recordsDeleted: deletionSummary.recordsDeleted, tablesAffected: deletionSummary.tablesAffected };
  },
});

export const recordDeletionFailure = internalMutation({
  args: { requestId: v.id("deletionRequests"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (request && request.status !== "completed" && request.status !== "failed") {
      await failDeletionRequest(ctx, request, args.error);
    }
    return null;
  },
});

function deletionQueueLimit(limit = 10): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error("Deletion queue limit must be an integer between 1 and 10");
  return limit;
}

export const getQueuedDeletionRequests = internalQuery({
  args: { limit: v.number() },
  returns: v.array(v.id("deletionRequests")),
  handler: async (ctx, args): Promise<Id<"deletionRequests">[]> => {
    const limit = deletionQueueLimit(args.limit);
    const queued: Doc<"deletionRequests">[] = [];
    for (const status of ["pending", "in_progress"] as const) {
      queued.push(...await ctx.db.query("deletionRequests").withIndex("by_status", q => q.eq("status", status)).take(limit));
    }
    return queued.sort((a, b) => a.requestedAt - b.requestedAt || String(a._id).localeCompare(String(b._id))).slice(0, limit).map(row => row._id);
  },
});

/** Process pending and interrupted requests with bounded work per cron run. */
export const processPendingDeletionRequests = internalAction({
  args: { limit: v.optional(v.number()) },
  returns: v.object({ processed: v.number(), succeeded: v.number(), failed: v.number(), deferred: v.number() }),
  handler: async (ctx, args): Promise<{ processed: number; succeeded: number; failed: number; deferred: number }> => {
    const limit = deletionQueueLimit(args.limit);
    const deadline = Date.now() + 20_000;
    const queued = await ctx.runQuery(internal.domains.operations.privacyEnforcement.getQueuedDeletionRequests, { limit });
    let processed = 0; let succeeded = 0; let failed = 0; let deferred = 0;
    for (const requestId of queued) {
      if (Date.now() >= deadline) { deferred += queued.length - processed; break; }
      processed++;
      try {
        const result = await ctx.runAction(internal.domains.operations.privacyEnforcement.processDeletionRequest, { requestId });
        if (result.success) succeeded++;
        else if (result.status === "failed") failed++;
        else deferred++;
      } catch (error) {
        // Retry the durable failure write if the child action could not finish it.
        // If storage is still unavailable, let this cron fail visibly too.
        await ctx.runMutation(internal.domains.operations.privacyEnforcement.recordDeletionFailure, {
          requestId, error: (error instanceof Error ? error.message : String(error)).slice(0, 512),
        });
        failed++;
      }
    }
    return { processed, succeeded, failed, deferred };
  },
});

/**
 * Create a deletion request
 */
async function authorizeDeletionScope(
  ctx: QueryCtx,
  actorId: Id<"users">,
  scope: DeletionRequest["scope"],
  subject: string,
): Promise<void> {
  if (!await ctx.db.get(actorId)) throw new Error("Authenticated user no longer exists");
  if (scope === "user_data" && subject === actorId) return;
  await requireAutonomousAdminAccess(ctx, actorId, "write");
}

export const createDeletionRequest = mutation({
  args: {
    scope: v.union(
      v.literal("user_data"),
      v.literal("entity_data"),
      v.literal("specific_records")
    ),
    subject: v.string(),
    recordIds: v.optional(v.array(v.string())),
    // Accepted for old callers only. It never determines authority or audit identity.
    requestedBy: v.optional(v.string()),
  },
  returns: v.id("deletionRequests"),
  handler: async (ctx, args) => {
    const actorId = await getAuthUserId(ctx);
    if (!actorId) throw new Error("Not authenticated");
    await authorizeDeletionScope(ctx, actorId, args.scope, args.subject);
    if (!args.subject.trim() || args.subject.length > 512) {
      throw new Error("Invalid deletion subject: use between 1 and 512 characters");
    }
    if (args.scope === "user_data") {
      const subjectId = ctx.db.normalizeId("users", args.subject);
      if (!subjectId || !await ctx.db.get(subjectId)) throw new Error("Invalid subject user");
    }
    if (args.scope === "specific_records") {
      specificRecordReferences(ctx, args.recordIds);
    } else if (args.recordIds !== undefined) {
      throw new Error("Record references are only valid for specific_records");
    }
    const requestId = await ctx.db.insert("deletionRequests", {
      requestId: `del_req_${Date.now()}`,
      scope: args.scope,
      subject: args.subject,
      recordIds: args.recordIds,
      requestedBy: actorId,
      authorizedBy: actorId,
      requestedAt: Date.now(),
      status: "pending",
    });

    // Log the security/privacy action
    await ctx.runMutation(internal.domains.operations.adminAuditLog.logAdminActionInternal, {
      action: "create_deletion_request",
      actionCategory: "security_event",
      actor: actorId,
      resourceType: "deletionRequests",
      resourceId: requestId,
      before: null,
      after: {
        scope: args.scope,
        subject: args.subject,
        recordCount: args.recordIds?.length ?? 0,
      },
      reason: `GDPR deletion request created for ${args.scope}: ${args.subject}`,
      metadata: {
        scope: args.scope,
        subject: args.subject,
        recordIdsCount: args.recordIds?.length ?? 0,
        gdprCompliance: true,
      },
    });

    return requestId;
  },
});

/**
 * Get retention policy for a table
 */
export const getRetentionPolicy = query({
  args: { table: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const dataClass = TABLE_DATA_CLASS_MAP[args.table];
    if (!dataClass) return null;

    return RETENTION_POLICIES[dataClass];
  },
});
