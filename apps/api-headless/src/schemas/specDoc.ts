import { z } from "zod";

// ── Enums ──────────────────────────────────────────────────────────────────

export const CheckCategory = z.enum([
  "functional",
  "security",
  "performance",
  "accessibility",
  "compliance",
  "visual_regression",
  "api_contract",
]);
export type CheckCategory = z.infer<typeof CheckCategory>;

export const VerificationMethod = z.enum([
  "automated_test",
  "llm_eval",
  "human_review",
  "static_analysis",
  "runtime_monitor",
  "deterministic_replay",
]);
export type VerificationMethod = z.infer<typeof VerificationMethod>;

export const Priority = z.enum(["critical", "high", "medium", "low"]);
export type Priority = z.infer<typeof Priority>;

export const ComplianceFramework = z.enum([
  "SOC2",
  "HIPAA",
  "GDPR",
  "ISO27001",
  "PCI_DSS",
  "FedRAMP",
]);
export type ComplianceFramework = z.infer<typeof ComplianceFramework>;

export const SpecStatus = z.enum([
  "draft",
  "active",
  "running",
  "passed",
  "failed",
  "finalized",
]);
export type SpecStatus = z.infer<typeof SpecStatus>;

export const CheckResult = z.enum([
  "pending",
  "pass",
  "fail",
  "skip",
  "error",
]);
export type CheckResult = z.infer<typeof CheckResult>;

// ── Check Schema ───────────────────────────────────────────────────────────

export const checkSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  category: CheckCategory,
  method: VerificationMethod,
  priority: Priority,
  description: z.string().max(2000).optional(),
  expectedOutcome: z.string().max(1000).optional(),
  result: CheckResult.default("pending"),
  evidence: z
    .object({
      screenshot: z.string().url().optional(),
      log: z.string().max(10000).optional(),
      metric: z.record(z.number()).optional(),
      traceId: z.string().optional(),
    })
    .optional(),
  executedAt: z.string().datetime().optional(),
  durationMs: z.number().nonnegative().optional(),
});
export type Check = z.infer<typeof checkSchema>;

// ── SpecDoc Create Schema ──────────────────────────────────────────────────

export const specDocCreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  clientOrg: z.string().min(1).max(100).optional(),
  repo: z.string().max(500).optional(),
  branch: z.string().max(200).optional(),
  commitSha: z.string().max(64).optional(),
  compliance: z.array(ComplianceFramework).default([]),
  checks: z
    .array(
      checkSchema.omit({
        id: true,
        result: true,
        evidence: true,
        executedAt: true,
        durationMs: true,
      })
    )
    .min(1)
    .max(500),
  metadata: z.record(z.unknown()).optional(),
});
export type SpecDocCreate = z.infer<typeof specDocCreateSchema>;

// ── SpecDoc Full Schema ────────────────────────────────────────────────────

export const specDocSchema = z.object({
  specKey: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: SpecStatus,
  clientOrg: z.string().optional(),
  clientId: z.string().optional(),
  repo: z.string().optional(),
  branch: z.string().optional(),
  commitSha: z.string().optional(),
  compliance: z.array(ComplianceFramework),
  checks: z.array(checkSchema),
  proofPackKey: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  finalizedAt: z.string().datetime().optional(),
});
export type SpecDoc = z.infer<typeof specDocSchema>;

// ── Check Result Update Schema ─────────────────────────────────────────────

export const checkResultUpdateSchema = z.object({
  result: CheckResult,
  evidence: z
    .object({
      screenshot: z.string().url().optional(),
      log: z.string().max(10000).optional(),
      metric: z.record(z.number()).optional(),
      traceId: z.string().optional(),
    })
    .optional(),
  durationMs: z.number().nonnegative().optional(),
});
export type CheckResultUpdate = z.infer<typeof checkResultUpdateSchema>;

// ── Finalize Schema ────────────────────────────────────────────────────────

export const finalizeSchema = z.object({
  proofPackKey: z.string().optional(),
  notes: z.string().max(2000).optional(),
});
export type FinalizeInput = z.infer<typeof finalizeSchema>;

// ── Run Schemas ────────────────────────────────────────────────────────────

export const RunStatus = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export type RunStatus = z.infer<typeof RunStatus>;

export const runCreateSchema = z.object({
  specKey: z.string().min(1),
  environment: z.string().max(100).default("staging"),
  config: z
    .object({
      parallelism: z.number().int().min(1).max(20).default(4),
      timeout: z.number().int().min(1000).max(600000).default(120000),
      retryFailedChecks: z.boolean().default(false),
    })
    .optional(),
});
export type RunCreate = z.infer<typeof runCreateSchema>;

export const runEventSchema = z.object({
  eventId: z.string(),
  runId: z.string(),
  type: z.enum([
    "run_started",
    "check_started",
    "check_completed",
    "check_failed",
    "run_completed",
    "run_failed",
    "run_cancelled",
  ]),
  checkId: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});
export type RunEvent = z.infer<typeof runEventSchema>;

// ── Evidence / Proof Pack Schemas ──────────────────────────────────────────

export const proofPackCreateSchema = z.object({
  specKey: z.string().min(1),
  runId: z.string().optional(),
  title: z.string().min(1).max(300),
  compliance: z.array(ComplianceFramework).default([]),
  artifacts: z
    .array(
      z.object({
        type: z.enum(["screenshot", "log", "trace", "video", "metric", "report"]),
        label: z.string().max(200),
        url: z.string().url().optional(),
        data: z.string().max(50000).optional(),
      })
    )
    .default([]),
  signedBy: z.string().max(200).optional(),
});
export type ProofPackCreate = z.infer<typeof proofPackCreateSchema>;

export const proofPackSchema = z.object({
  packKey: z.string(),
  specKey: z.string(),
  runId: z.string().optional(),
  title: z.string(),
  compliance: z.array(ComplianceFramework),
  artifacts: z.array(
    z.object({
      type: z.string(),
      label: z.string(),
      url: z.string().optional(),
      data: z.string().optional(),
    })
  ),
  signedBy: z.string().optional(),
  createdAt: z.string().datetime(),
  immutable: z.boolean(),
  hash: z.string(),
});
export type ProofPack = z.infer<typeof proofPackSchema>;
