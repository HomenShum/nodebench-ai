import { resolve } from "node:path";
import { getDb, genId } from "../db.js";
import { getQuickRef } from "./toolRegistry.js";
import type { McpTool } from "../types.js";

// ── SARIF 2.1.0 Exporter ────────────────────────────────────────────

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: "error" | "warning" | "note" };
}

interface SarifResult {
  ruleId: string;
  level: "error" | "warning" | "note";
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region?: { startLine: number; startColumn?: number };
    };
  }>;
  fixes?: Array<{
    description: { text: string };
  }>;
}

function severityToSarif(sev: string): "error" | "warning" | "note" {
  if (sev === "critical") return "error";
  if (sev === "warning") return "warning";
  return "note";
}

function buildSarif(
  projectDir: string,
  auditTypes: string[],
  limit: number,
): Record<string, unknown> {
  const db = getDb();

  const placeholders = auditTypes.map(() => "?").join(", ");
  const rows = db.prepare(
    `SELECT audit_type, issues_json, issue_count, audited_at
     FROM audit_results
     WHERE project_dir = ? AND audit_type IN (${placeholders})
     ORDER BY audited_at DESC`
  ).all(projectDir, ...auditTypes) as any[];

  // Dedupe: keep only latest per audit_type
  const seen = new Set<string>();
  const latestRows: any[] = [];
  for (const row of rows) {
    if (!seen.has(row.audit_type)) {
      seen.add(row.audit_type);
      latestRows.push(row);
    }
  }

  const rulesMap = new Map<string, SarifRule>();
  const results: SarifResult[] = [];

  for (const row of latestRows) {
    let issues: any[];
    try {
      issues = JSON.parse(row.issues_json);
    } catch {
      continue;
    }
    if (!Array.isArray(issues)) continue;

    for (const issue of issues.slice(0, limit)) {
      const ruleId = `convex/${row.audit_type}/${issue.message?.slice(0, 40)?.replace(/[^a-zA-Z0-9]/g, "-") ?? "unknown"}`;

      if (!rulesMap.has(ruleId)) {
        rulesMap.set(ruleId, {
          id: ruleId,
          name: row.audit_type,
          shortDescription: { text: issue.message?.slice(0, 120) ?? "Issue found" },
          defaultConfiguration: { level: severityToSarif(issue.severity ?? "warning") },
        });
      }

      // Parse location "file:line" format
      const loc = issue.location ?? "";
      const colonIdx = loc.lastIndexOf(":");
      const file = colonIdx > 0 ? loc.slice(0, colonIdx) : loc;
      const line = colonIdx > 0 ? parseInt(loc.slice(colonIdx + 1), 10) : undefined;

      const sarifResult: SarifResult = {
        ruleId,
        level: severityToSarif(issue.severity ?? "warning"),
        message: { text: issue.message ?? "Issue detected" },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: file || "unknown" },
            ...(line && !isNaN(line) ? { region: { startLine: line } } : {}),
          },
        }],
      };

      if (issue.fix) {
        sarifResult.fixes = [{ description: { text: issue.fix } }];
      }

      results.push(sarifResult);
    }
  }

  return {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: {
        driver: {
          name: "convex-mcp-nodebench",
          version: "0.9.1",
          informationUri: "https://www.npmjs.com/package/@homenshum/convex-mcp-nodebench",
          rules: [...rulesMap.values()],
        },
      },
      results,
    }],
  };
}

// ── Baseline Diff Engine ────────────────────────────────────────────

interface DiffIssue {
  status: "new" | "fixed" | "existing";
  auditType: string;
  severity: string;
  location: string;
  message: string;
  fix?: string;
}

function fingerprint(issue: any): string {
  // Deterministic fingerprint from location + message prefix (ignoring counts)
  const loc = (issue.location ?? "").replace(/:\d+$/, ""); // strip line number for stability
  const msgPrefix = (issue.message ?? "").slice(0, 60);
  return `${loc}::${msgPrefix}`;
}

function computeBaselineDiff(projectDir: string): {
  newIssues: DiffIssue[];
  fixedIssues: DiffIssue[];
  existingIssues: DiffIssue[];
  summary: {
    totalNew: number;
    totalFixed: number;
    totalExisting: number;
    trend: "improving" | "stable" | "degrading";
  };
} {
  const db = getDb();

  // Get all audit types that have at least 2 runs
  const auditTypes = db.prepare(
    `SELECT DISTINCT audit_type FROM audit_results
     WHERE project_dir = ?
     GROUP BY audit_type
     HAVING COUNT(*) >= 2`
  ).all(projectDir) as any[];

  const newIssues: DiffIssue[] = [];
  const fixedIssues: DiffIssue[] = [];
  const existingIssues: DiffIssue[] = [];

  for (const { audit_type } of auditTypes) {
    const rows = db.prepare(
      `SELECT issues_json FROM audit_results
       WHERE project_dir = ? AND audit_type = ?
       ORDER BY audited_at DESC LIMIT 2`
    ).all(projectDir, audit_type) as any[];

    if (rows.length < 2) continue;

    let currentIssues: any[], previousIssues: any[];
    try {
      currentIssues = JSON.parse(rows[0].issues_json);
      previousIssues = JSON.parse(rows[1].issues_json);
    } catch {
      continue;
    }
    if (!Array.isArray(currentIssues) || !Array.isArray(previousIssues)) continue;

    const prevFingerprints = new Set(previousIssues.map(fingerprint));
    const currFingerprints = new Set(currentIssues.map(fingerprint));

    // New: in current but not in previous
    for (const issue of currentIssues) {
      const fp = fingerprint(issue);
      const diffIssue: DiffIssue = {
        status: prevFingerprints.has(fp) ? "existing" : "new",
        auditType: audit_type,
        severity: issue.severity ?? "warning",
        location: issue.location ?? "",
        message: issue.message ?? "",
        fix: issue.fix,
      };
      if (diffIssue.status === "new") newIssues.push(diffIssue);
      else existingIssues.push(diffIssue);
    }

    // Fixed: in previous but not in current
    for (const issue of previousIssues) {
      const fp = fingerprint(issue);
      if (!currFingerprints.has(fp)) {
        fixedIssues.push({
          status: "fixed",
          auditType: audit_type,
          severity: issue.severity ?? "warning",
          location: issue.location ?? "",
          message: issue.message ?? "",
        });
      }
    }
  }

  const trend = fixedIssues.length > newIssues.length ? "improving" :
    newIssues.length > fixedIssues.length ? "degrading" : "stable";

  return {
    newIssues,
    fixedIssues,
    existingIssues,
    summary: {
      totalNew: newIssues.length,
      totalFixed: fixedIssues.length,
      totalExisting: existingIssues.length,
      trend,
    },
  };
}

// ── Tool Definitions ────────────────────────────────────────────────

export const reportingTools: McpTool[] = [
  {
    name: "convex_export_sarif",
    description:
      "Export stored audit results as SARIF 2.1.0 JSON. SARIF is the industry standard for static analysis results — integrates with GitHub Code Scanning, VS Code Problems panel, and CI pipelines. Outputs file:line locations, severity levels, and fix suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        projectDir: {
          type: "string",
          description: "Absolute path to the project root",
        },
        auditTypes: {
          type: "array",
          items: { type: "string" },
          description: "Which audit types to include. Defaults to all. Options: schema, functions, authorization, query_efficiency, action_audit, type_safety, transaction_safety, storage, pagination, data_modeling, dev_setup, migration_plan",
        },
        maxResults: {
          type: "number",
          description: "Max results per audit type (default 100)",
        },
      },
      required: ["projectDir"],
    },
    handler: async (args: { projectDir: string; auditTypes?: string[]; maxResults?: number }) => {
      const projectDir = resolve(args.projectDir);
      const allTypes = [
        "schema", "functions", "authorization", "query_efficiency",
        "action_audit", "type_safety", "transaction_safety", "storage",
        "pagination", "data_modeling", "dev_setup", "migration_plan",
      ];
      const auditTypes = args.auditTypes?.length ? args.auditTypes : allTypes;
      const sarif = buildSarif(projectDir, auditTypes, args.maxResults ?? 100);

      const resultCount = ((sarif.runs as any[])?.[0]?.results as any[])?.length ?? 0;
      return {
        sarif,
        summary: {
          format: "SARIF 2.1.0",
          totalResults: resultCount,
          auditTypesIncluded: auditTypes,
          usage: "Pipe this JSON to a .sarif file, then upload to GitHub Code Scanning or open in VS Code SARIF Viewer",
        },
        quickRef: getQuickRef("convex_export_sarif"),
      };
    },
  },
  {
    name: "convex_audit_diff",
    description:
      "Compare the latest audit run against the previous run to show new issues, fixed issues, and trend direction (improving/stable/degrading). Like SonarQube's new code analysis — tells you whether your changes introduced or resolved issues.",
    inputSchema: {
      type: "object",
      properties: {
        projectDir: {
          type: "string",
          description: "Absolute path to the project root",
        },
      },
      required: ["projectDir"],
    },
    handler: async (args: { projectDir: string }) => {
      const projectDir = resolve(args.projectDir);
      const diff = computeBaselineDiff(projectDir);

      // Store the diff result
      const db = getDb();
      db.prepare(
        "INSERT INTO audit_results (id, project_dir, audit_type, issues_json, issue_count) VALUES (?, ?, ?, ?, ?)"
      ).run(genId("audit"), projectDir, "baseline_diff", JSON.stringify(diff.summary), diff.summary.totalNew);

      return {
        ...diff,
        newIssues: diff.newIssues.slice(0, 30),
        fixedIssues: diff.fixedIssues.slice(0, 30),
        existingIssues: undefined, // Too verbose — available via full audit
        quickRef: getQuickRef("convex_audit_diff"),
      };
    },
  },
];
