/**
 * SpecDoc validation, scoring, and compliance mapping.
 * Uses Zod for schema validation — mirrors convex/domains/temporal/schema.ts.
 */
import { z } from "zod";
import type {
  SpecDoc,
  SpecCheck,
  SpecValidationResult,
  ComplianceMapping,
  ComplianceFramework,
} from "../types.js";

// ── Zod schemas ──────────────────────────────────────────────────────

const thresholdSchema = z.object({
  metric: z.string(),
  operator: z.enum(["gt", "gte", "lt", "lte", "eq"]),
  value: z.number(),
  units: z.string().optional(),
});

const specCheckResultSchema = z.object({
  passed: z.boolean(),
  actualValue: z.number().optional(),
  evidence: z.string().optional(),
  screenshotUrl: z.string().optional(),
  videoClipUrl: z.string().optional(),
  errorMessage: z.string().optional(),
  durationMs: z.number().optional(),
  verifiedAt: z.number(),
});

const specCheckSchema = z.object({
  checkId: z.string().min(1),
  category: z.enum([
    "functional",
    "security",
    "performance",
    "accessibility",
    "compliance",
    "data_integrity",
    "ux_quality",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  verificationMethod: z.enum([
    "automated_test",
    "visual_qa",
    "video_qa",
    "manual_review",
    "metric_threshold",
    "playwright_assertion",
  ]),
  threshold: thresholdSchema.optional(),
  status: z.enum(["pending", "running", "passed", "failed", "skipped", "blocked"]),
  result: specCheckResultSchema.optional(),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
});

const specDocTargetSchema = z.object({
  environment: z.enum(["staging", "production", "preview", "canary"]),
  url: z.string().optional(),
  branch: z.string().optional(),
  commitSha: z.string().optional(),
  deployedAt: z.number().optional(),
});

const specDocSchema = z.object({
  specKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  projectId: z.string().optional(),
  clientOrg: z.string().optional(),
  contractValue: z.number().optional(),
  deadline: z.number().optional(),
  target: specDocTargetSchema,
  checks: z.array(specCheckSchema).min(1),
  complianceFrameworks: z
    .array(z.enum(["SOC2", "HIPAA", "GDPR", "ISO27001", "PCI_DSS", "FedRAMP"]))
    .optional(),
  status: z.enum(["draft", "executing", "finalized", "blocked"]),
  overallVerdict: z.enum(["pending", "passed", "failed"]),
  passRate: z.number().min(0).max(100),
  totalChecks: z.number().int().min(0),
  passedChecks: z.number().int().min(0),
  failedChecks: z.number().int().min(0),
});

// ── Estimated run times by verification method (ms) ──────────────────

const METHOD_ESTIMATE_MS: Record<string, number> = {
  automated_test: 5_000,
  visual_qa: 15_000,
  video_qa: 30_000,
  manual_review: 60_000,
  metric_threshold: 2_000,
  playwright_assertion: 10_000,
};

// ── Validation ───────────────────────────────────────────────────────

/**
 * Validate a SpecDoc object against the schema.
 * Returns structured errors, warnings, category/priority breakdowns, and estimated run time.
 */
export function validateSpecDoc(spec: unknown): SpecValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  const parsed = specDocSchema.safeParse(spec);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join(".")}: ${issue.message}`);
    }
    return {
      valid: false,
      errors,
      warnings,
      checkCount: 0,
      byCategory,
      byPriority,
      estimatedRunTimeMs: 0,
    };
  }

  const doc = parsed.data;
  let estimatedRunTimeMs = 0;

  // Validate internal consistency
  if (doc.totalChecks !== doc.checks.length) {
    warnings.push(
      `totalChecks (${doc.totalChecks}) does not match checks array length (${doc.checks.length})`,
    );
  }

  const actualPassed = doc.checks.filter((c) => c.status === "passed").length;
  const actualFailed = doc.checks.filter((c) => c.status === "failed").length;

  if (doc.passedChecks !== actualPassed) {
    warnings.push(
      `passedChecks (${doc.passedChecks}) does not match actual passed count (${actualPassed})`,
    );
  }
  if (doc.failedChecks !== actualFailed) {
    warnings.push(
      `failedChecks (${doc.failedChecks}) does not match actual failed count (${actualFailed})`,
    );
  }

  // Check for duplicate checkIds
  const checkIds = new Set<string>();
  for (const check of doc.checks) {
    if (checkIds.has(check.checkId)) {
      errors.push(`Duplicate checkId: ${check.checkId}`);
    }
    checkIds.add(check.checkId);

    // Tally categories and priorities
    byCategory[check.category] = (byCategory[check.category] ?? 0) + 1;
    byPriority[check.priority] = (byPriority[check.priority] ?? 0) + 1;

    // Estimate run time
    estimatedRunTimeMs += METHOD_ESTIMATE_MS[check.verificationMethod] ?? 10_000;

    // Warn if metric_threshold has no threshold defined
    if (check.verificationMethod === "metric_threshold" && !check.threshold) {
      warnings.push(
        `Check "${check.checkId}" uses metric_threshold but has no threshold defined`,
      );
    }
  }

  // Deadline warning
  if (doc.deadline && doc.deadline < Date.now()) {
    warnings.push(`Deadline has already passed (${new Date(doc.deadline).toISOString()})`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checkCount: doc.checks.length,
    byCategory,
    byPriority,
    estimatedRunTimeMs,
  };
}

// ── Pass rate computation ────────────────────────────────────────────

/**
 * Compute pass/fail/pending stats from a checks array.
 */
export function computePassRate(
  checks: SpecCheck[],
): { passRate: number; passed: number; failed: number; pending: number } {
  const passed = checks.filter((c) => c.status === "passed").length;
  const failed = checks.filter((c) => c.status === "failed").length;
  const pending = checks.length - passed - failed;
  const denominator = passed + failed;
  const passRate = denominator > 0 ? Math.round((passed / denominator) * 100) : 0;
  return { passRate, passed, failed, pending };
}

// ── Checklist report ─────────────────────────────────────────────────

/**
 * Generate a Markdown checklist report from a SpecDoc.
 */
export function generateChecklistReport(spec: SpecDoc): string {
  const lines: string[] = [];
  lines.push(`# ${spec.title}`);
  lines.push("");
  lines.push(`> ${spec.description}`);
  lines.push("");
  lines.push(`**Status:** ${spec.status} | **Verdict:** ${spec.overallVerdict} | **Pass Rate:** ${spec.passRate}%`);
  if (spec.clientOrg) lines.push(`**Client:** ${spec.clientOrg}`);
  if (spec.deadline) lines.push(`**Deadline:** ${new Date(spec.deadline).toISOString()}`);
  lines.push("");
  lines.push(`**Target:** ${spec.target.environment}${spec.target.url ? ` — ${spec.target.url}` : ""}`);
  lines.push("");

  // Group by category
  const grouped: Record<string, SpecCheck[]> = {};
  for (const check of spec.checks) {
    (grouped[check.category] ??= []).push(check);
  }

  for (const [category, checks] of Object.entries(grouped)) {
    lines.push(`## ${category.replace(/_/g, " ").toUpperCase()}`);
    lines.push("");
    for (const check of checks) {
      const icon =
        check.status === "passed"
          ? "[x]"
          : check.status === "failed"
            ? "[ ] FAIL"
            : check.status === "skipped"
              ? "[-]"
              : "[ ]";
      lines.push(`- ${icon} **[${check.priority}]** ${check.title}`);
      lines.push(`  ${check.description}`);
      if (check.result?.evidence) {
        lines.push(`  Evidence: ${check.result.evidence}`);
      }
      if (check.result?.errorMessage) {
        lines.push(`  Error: ${check.result.errorMessage}`);
      }
    }
    lines.push("");
  }

  // Summary
  const { passed, failed, pending } = computePassRate(spec.checks);
  lines.push("---");
  lines.push(`**Summary:** ${passed} passed, ${failed} failed, ${pending} pending out of ${spec.checks.length} checks`);
  if (spec.complianceFrameworks?.length) {
    lines.push(`**Compliance:** ${spec.complianceFrameworks.join(", ")}`);
  }

  return lines.join("\n");
}

// ── Compliance mapping ───────────────────────────────────────────────

/**
 * Map of compliance frameworks to relevant check categories.
 */
const FRAMEWORK_CATEGORIES: Record<ComplianceFramework, string[]> = {
  SOC2: ["security", "data_integrity", "compliance"],
  HIPAA: ["security", "data_integrity", "compliance", "accessibility"],
  GDPR: ["security", "data_integrity", "compliance"],
  ISO27001: ["security", "data_integrity", "compliance", "performance"],
  PCI_DSS: ["security", "data_integrity", "compliance"],
  FedRAMP: ["security", "data_integrity", "compliance", "performance", "accessibility"],
};

/**
 * Map checks to a compliance framework's control areas.
 */
export function mapToComplianceFramework(
  checks: SpecCheck[],
  framework: string,
): ComplianceMapping {
  const relevantCategories =
    FRAMEWORK_CATEGORIES[framework as ComplianceFramework] ?? ["compliance"];

  const controlMap: Record<
    string,
    { description: string; mappedChecks: string[]; status: "covered" | "partial" | "uncovered" }
  > = {};

  for (const category of relevantCategories) {
    const matching = checks.filter((c) => c.category === category);
    const allPassed = matching.length > 0 && matching.every((c) => c.status === "passed");
    const anyPassed = matching.some((c) => c.status === "passed");

    controlMap[`${framework}-${category}`] = {
      description: `${framework} controls related to ${category.replace(/_/g, " ")}`,
      mappedChecks: matching.map((c) => c.checkId),
      status: allPassed ? "covered" : anyPassed ? "partial" : "uncovered",
    };
  }

  const controls = Object.entries(controlMap).map(([controlId, data]) => ({
    controlId,
    ...data,
  }));

  const covered = controls.filter((c) => c.status === "covered").length;
  const coveragePercent =
    controls.length > 0 ? Math.round((covered / controls.length) * 100) : 0;

  return { framework, controls, coveragePercent };
}
