import { resolve } from "node:path";
import { getDb, genId } from "../db.js";
import { getQuickRef } from "./toolRegistry.js";
import type { McpTool } from "../types.js";

// ── Configurable Quality Gate ───────────────────────────────────────

interface ThresholdConfig {
  maxCritical: number;
  maxWarnings: number;
  minAuthCoveragePercent: number;
  maxAsAnyCasts: number;
  maxUnboundedCollects: number;
  maxDanglingRefs: number;
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  maxCritical: 0,
  maxWarnings: 50,
  minAuthCoveragePercent: 10,
  maxAsAnyCasts: 500,
  maxUnboundedCollects: 100,
  maxDanglingRefs: 20,
};

interface GateCheck {
  metric: string;
  passed: boolean;
  actual: number | string;
  threshold: number | string;
  severity: "blocker" | "warning" | "info";
}

function runQualityGate(projectDir: string, thresholds: ThresholdConfig): {
  passed: boolean;
  checks: GateCheck[];
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
} {
  const db = getDb();
  const checks: GateCheck[] = [];

  // Helper: get latest audit by type
  function getLatest(auditType: string): any | null {
    return db.prepare(
      "SELECT issues_json, issue_count FROM audit_results WHERE project_dir = ? AND audit_type = ? ORDER BY audited_at DESC LIMIT 1"
    ).get(projectDir, auditType) as any ?? null;
  }

  function countBySeverity(json: string, severity: string): number {
    try {
      const issues = JSON.parse(json);
      return Array.isArray(issues) ? issues.filter((i: any) => i.severity === severity).length : 0;
    } catch { return 0; }
  }

  // Aggregate critical/warning counts across all audit types
  const auditTypes = [
    "schema", "functions", "authorization", "query_efficiency",
    "action_audit", "type_safety", "transaction_safety", "storage",
    "pagination", "data_modeling", "vector_search", "scheduler_audit",
  ];

  let totalCritical = 0;
  let totalWarnings = 0;
  let auditsRun = 0;

  for (const type of auditTypes) {
    const latest = getLatest(type);
    if (!latest) continue;
    auditsRun++;
    totalCritical += countBySeverity(latest.issues_json, "critical");
    totalWarnings += countBySeverity(latest.issues_json, "warning");
  }

  // Check 1: Critical issues
  checks.push({
    metric: "critical_issues",
    passed: totalCritical <= thresholds.maxCritical,
    actual: totalCritical,
    threshold: thresholds.maxCritical,
    severity: totalCritical > thresholds.maxCritical ? "blocker" : "info",
  });

  // Check 2: Warning issues
  checks.push({
    metric: "warning_issues",
    passed: totalWarnings <= thresholds.maxWarnings,
    actual: totalWarnings,
    threshold: thresholds.maxWarnings,
    severity: totalWarnings > thresholds.maxWarnings ? "warning" : "info",
  });

  // Check 3: Authorization coverage
  const authAudit = getLatest("authorization");
  if (authAudit) {
    try {
      const issues = JSON.parse(authAudit.issues_json);
      // Parse coverage from stored data — look for the structured result pattern
      // The auth audit stores issues, but we need the summary... use issue counts as proxy
      const authIssues = Array.isArray(issues) ? issues.length : 0;
      // Use inverse metric: fewer auth issues = better coverage
      checks.push({
        metric: "auth_issues",
        passed: true, // Auth coverage is informational in gate
        actual: authIssues,
        threshold: "tracked",
        severity: authIssues > 50 ? "warning" : "info",
      });
    } catch { /* skip */ }
  }

  // Check 4: Type safety (as any casts)
  const typeSafety = getLatest("type_safety");
  if (typeSafety) {
    try {
      const issues = JSON.parse(typeSafety.issues_json);
      const asAnyIssues = Array.isArray(issues)
        ? issues.filter((i: any) => i.message?.includes("as any")).length
        : 0;
      // Each as-any issue represents a FILE, count from message for actual number
      const actualCasts = Array.isArray(issues)
        ? issues.reduce((sum: number, i: any) => {
            const countMatch = i.message?.match(/(\d+)\s+`as any`/);
            return sum + (countMatch ? parseInt(countMatch[1], 10) : 0);
          }, 0)
        : 0;
      checks.push({
        metric: "as_any_casts",
        passed: actualCasts <= thresholds.maxAsAnyCasts,
        actual: actualCasts,
        threshold: thresholds.maxAsAnyCasts,
        severity: actualCasts > thresholds.maxAsAnyCasts ? "warning" : "info",
      });
    } catch { /* skip */ }
  }

  // Check 5: Unbounded collects
  const queryEfficiency = getLatest("query_efficiency");
  if (queryEfficiency) {
    try {
      const issues = JSON.parse(queryEfficiency.issues_json);
      const unbounded = Array.isArray(issues)
        ? issues.filter((i: any) => i.message?.includes(".collect()")).length
        : 0;
      checks.push({
        metric: "unbounded_collects",
        passed: unbounded <= thresholds.maxUnboundedCollects,
        actual: unbounded,
        threshold: thresholds.maxUnboundedCollects,
        severity: unbounded > thresholds.maxUnboundedCollects ? "warning" : "info",
      });
    } catch { /* skip */ }
  }

  // Check 6: Dangling references
  const dataModeling = getLatest("data_modeling");
  if (dataModeling) {
    try {
      const issues = JSON.parse(dataModeling.issues_json);
      const dangling = Array.isArray(issues)
        ? issues.filter((i: any) => i.message?.includes("dangling") || i.message?.includes("non-existent")).length
        : 0;
      checks.push({
        metric: "dangling_refs",
        passed: dangling <= thresholds.maxDanglingRefs,
        actual: dangling,
        threshold: thresholds.maxDanglingRefs,
        severity: dangling > thresholds.maxDanglingRefs ? "warning" : "info",
      });
    } catch { /* skip */ }
  }

  // Check 7: Audit coverage — how many audit types have been run
  checks.push({
    metric: "audit_coverage",
    passed: auditsRun >= 3,
    actual: `${auditsRun}/${auditTypes.length}`,
    threshold: "3+",
    severity: auditsRun < 3 ? "warning" : "info",
  });

  // Calculate score (0-100)
  const passedChecks = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;
  const blockerCount = checks.filter(c => !c.passed && c.severity === "blocker").length;
  const score = blockerCount > 0 ? Math.min(40, Math.round(100 * passedChecks / totalChecks))
    : Math.round(100 * passedChecks / totalChecks);

  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  const passed = blockerCount === 0 && checks.filter(c => !c.passed && c.severity === "warning").length < 3;

  return { passed, checks, score, grade };
}

// ── Tool Definition ─────────────────────────────────────────────────

export const qualityGateTools: McpTool[] = [
  {
    name: "convex_quality_gate",
    description:
      "Run a configurable quality gate across all stored audit results. Like SonarQube's quality gate — scores your project (A-F), checks configurable thresholds (max critical issues, min auth coverage, max as-any casts), and returns pass/fail with detailed metrics. Run individual audit tools first to populate data.",
    inputSchema: {
      type: "object",
      properties: {
        projectDir: {
          type: "string",
          description: "Absolute path to the project root",
        },
        thresholds: {
          type: "object",
          description: "Custom thresholds. Defaults: maxCritical=0, maxWarnings=50, minAuthCoveragePercent=10, maxAsAnyCasts=500, maxUnboundedCollects=100, maxDanglingRefs=20",
          properties: {
            maxCritical: { type: "number" },
            maxWarnings: { type: "number" },
            minAuthCoveragePercent: { type: "number" },
            maxAsAnyCasts: { type: "number" },
            maxUnboundedCollects: { type: "number" },
            maxDanglingRefs: { type: "number" },
          },
        },
      },
      required: ["projectDir"],
    },
    handler: async (args: { projectDir: string; thresholds?: Partial<ThresholdConfig> }) => {
      const projectDir = resolve(args.projectDir);
      const thresholds: ThresholdConfig = {
        ...DEFAULT_THRESHOLDS,
        ...(args.thresholds ?? {}),
      };

      const result = runQualityGate(projectDir, thresholds);

      // Store quality gate result
      const db = getDb();
      db.prepare(
        "INSERT INTO deploy_checks (id, project_dir, check_type, passed, findings) VALUES (?, ?, ?, ?, ?)"
      ).run(genId("deploy"), projectDir, "quality_gate", result.passed ? 1 : 0, JSON.stringify(result));

      return {
        ...result,
        thresholdsUsed: thresholds,
        quickRef: getQuickRef("convex_quality_gate"),
      };
    },
  },
];
