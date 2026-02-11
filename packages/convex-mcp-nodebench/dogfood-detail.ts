import { getDb } from "./src/db.js";
import { resolve } from "node:path";

const db = getDb();
const P = resolve(import.meta.dirname, "../..");

// Get stored audit results
const auditTypes = [
  "schema", "functions", "authorization", "query_efficiency",
  "action_audit", "type_safety", "transaction_safety", "storage",
  "pagination", "data_modeling", "vector_search", "scheduler_audit",
];

console.log("=== CRITICAL ISSUES BY AUDIT TYPE ===\n");

let totalCritical = 0;
const criticalBreakdown: { type: string; count: number; samples: string[] }[] = [];

for (const type of auditTypes) {
  const row = db.prepare(
    "SELECT issues_json, issue_count FROM audit_results WHERE project_dir = ? AND audit_type = ? ORDER BY audited_at DESC LIMIT 1"
  ).get(P, type) as any;
  if (!row) { console.log(`  ${type}: no data`); continue; }

  try {
    const issues = JSON.parse(row.issues_json);
    if (!Array.isArray(issues)) continue;
    const criticals = issues.filter((i: any) => i.severity === "critical");
    const warnings = issues.filter((i: any) => i.severity === "warning");
    totalCritical += criticals.length;

    if (criticals.length > 0) {
      // Get unique message patterns
      const patterns = new Map<string, number>();
      for (const c of criticals) {
        const key = c.message?.replace(/`[^`]+`/g, '`X`').replace(/\d+/g, 'N') ?? 'unknown';
        patterns.set(key, (patterns.get(key) ?? 0) + 1);
      }
      const topPatterns = [...patterns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

      criticalBreakdown.push({
        type,
        count: criticals.length,
        samples: topPatterns.map(([k, v]) => `  (${v}x) ${k}`),
      });
    }

    console.log(`  ${type}: ${criticals.length} critical, ${warnings.length} warnings`);
  } catch { console.log(`  ${type}: parse error`); }
}

console.log(`\nTotal critical: ${totalCritical}\n`);

console.log("=== TOP CRITICAL PATTERNS ===\n");
criticalBreakdown.sort((a, b) => b.count - a.count);
for (const { type, count, samples } of criticalBreakdown) {
  console.log(`${type} (${count} critical):`);
  for (const s of samples) console.log(s);
  console.log();
}

// Also show unbounded collects detail
console.log("=== UNBOUNDED COLLECTS (top files) ===\n");
const qeRow = db.prepare(
  "SELECT issues_json FROM audit_results WHERE project_dir = ? AND audit_type = 'query_efficiency' ORDER BY audited_at DESC LIMIT 1"
).get(P) as any;
if (qeRow) {
  const issues = JSON.parse(qeRow.issues_json);
  const collects = issues.filter((i: any) => i.message?.includes(".collect()"));
  const byFile = new Map<string, number>();
  for (const c of collects) {
    byFile.set(c.file ?? 'unknown', (byFile.get(c.file ?? 'unknown') ?? 0) + 1);
  }
  [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([f, n]) => {
    console.log(`  ${n}x ${f}`);
  });
}
