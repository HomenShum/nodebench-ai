import { getDb } from "./src/db.js";
import { resolve } from "node:path";
const db = getDb();
const P = resolve(import.meta.dirname, "../..");
const types = ["schema","functions","authorization","query_efficiency","action_audit","type_safety","transaction_safety","storage","pagination","data_modeling","vector_search","scheduler_audit"];

console.log("=== WARNING BREAKDOWN ===");
let totalW = 0;
for (const type of types) {
  const row = db.prepare("SELECT issues_json FROM audit_results WHERE project_dir = ? AND audit_type = ? ORDER BY audited_at DESC LIMIT 1").get(P, type) as any;
  if (!row) continue;
  try {
    const issues = JSON.parse(row.issues_json);
    if (!Array.isArray(issues)) continue;
    const warnings = issues.filter((i: any) => i.severity === "warning");
    totalW += warnings.length;
    if (warnings.length === 0) continue;
    const patterns = new Map<string, number>();
    for (const w of warnings) {
      const key = (w.message ?? "unknown").replace(/`[^`]+`/g, "X").replace(/"[^"]+"/g, "X").replace(/\d+/g, "N").slice(0, 100);
      patterns.set(key, (patterns.get(key) ?? 0) + 1);
    }
    console.log(`\n${type} (${warnings.length} warnings):`);
    [...patterns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(([k, v]) => console.log(`  (${v}x) ${k}`));
  } catch {}
}
console.log(`\nTotal warnings: ${totalW}`);

// Auth criticals detail
console.log("\n\n=== AUTH CRITICALS DETAIL ===");
const authRow = db.prepare("SELECT issues_json FROM audit_results WHERE project_dir = ? AND audit_type = 'authorization' ORDER BY audited_at DESC LIMIT 1").get(P) as any;
if (authRow) {
  const issues = JSON.parse(authRow.issues_json);
  const criticals = issues.filter((i: any) => i.severity === "critical");
  const msgPatterns = new Map<string, number>();
  for (const c of criticals) {
    const msg = (c.message ?? "").replace(/"[^"]+"/g, "X").replace(/\d+/g, "N");
    msgPatterns.set(msg, (msgPatterns.get(msg) ?? 0) + 1);
  }
  console.log(`Total auth criticals: ${criticals.length}`);
  console.log("Patterns:");
  [...msgPatterns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => console.log(`  (${v}x) ${k}`));
  const byFile = new Map<string, number>();
  for (const c of criticals) {
    const f = (c.location ?? "?").split(":")[0];
    byFile.set(f, (byFile.get(f) ?? 0) + 1);
  }
  console.log(`\nTop files (${byFile.size} files total):`);
  [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([f, n]) => console.log(`  ${n}x ${f}`));
}
