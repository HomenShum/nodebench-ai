import { getDb } from "./src/db.js";
import { resolve, join } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
const db = getDb();
const P = resolve(import.meta.dirname, "../..");
const convexDir = join(P, "convex");

// === AS ANY BREAKDOWN ===
console.log("=== AS ANY BREAKDOWN ===");
const tsRow = db.prepare("SELECT issues_json FROM audit_results WHERE project_dir = ? AND audit_type = 'type_safety' ORDER BY audited_at DESC LIMIT 1").get(P) as any;
if (tsRow) {
  const issues = JSON.parse(tsRow.issues_json);
  const asAny = issues.filter((i: any) => i.message?.includes("as any"));
  let inTests = 0, inEval = 0, inTools = 0, inDomains = 0, inOther = 0;
  for (const i of asAny) {
    const loc = i.location ?? "";
    if (/test|__tests__|spec|\.test\.|\.spec\.|fixtures|mocks/i.test(loc)) inTests++;
    else if (/evaluation|eval[A-Z]|liveEval|liveApiSmoke|benchmark|calibration|harness/i.test(loc)) inEval++;
    else if (/tools\//i.test(loc)) inTools++;
    else if (/domains\//i.test(loc)) inDomains++;
    else inOther++;
  }
  console.log(`Total as_any: ${asAny.length}`);
  console.log(`  In test files: ${inTests}`);
  console.log(`  In eval/benchmark: ${inEval}`);
  console.log(`  In tools/: ${inTools}`);
  console.log(`  In domains/: ${inDomains}`);
  console.log(`  Other: ${inOther}`);
}

// === UNBOUNDED COLLECTS ===
console.log("\n=== UNBOUNDED COLLECTS ===");
const qeRow = db.prepare("SELECT issues_json FROM audit_results WHERE project_dir = ? AND audit_type = 'query_efficiency' ORDER BY audited_at DESC LIMIT 1").get(P) as any;
if (qeRow) {
  const issues = JSON.parse(qeRow.issues_json);
  const collects = issues.filter((i: any) => i.message?.includes(".collect()"));
  console.log(`Total: ${collects.length}`);
  const patterns = new Map<string, number>();
  for (const c of collects) {
    const key = (c.message ?? "?").replace(/"[^"]+"/g, "X").replace(/\d+/g, "N").slice(0, 120);
    patterns.set(key, (patterns.get(key) ?? 0) + 1);
  }
  console.log("Patterns:");
  [...patterns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([k, v]) => console.log(`  (${v}x) ${k}`));
}

// === ACTION ctx.db DETAIL ===
console.log("\n=== ACTION ctx.db DETAIL ===");
const actRow = db.prepare("SELECT issues_json FROM audit_results WHERE project_dir = ? AND audit_type = 'action_audit' ORDER BY audited_at DESC LIMIT 1").get(P) as any;
if (actRow) {
  const issues = JSON.parse(actRow.issues_json);
  const dbAccess = issues.filter((i: any) => i.message?.includes("ctx.db"));
  console.log(`Total ctx.db criticals: ${dbAccess.length}`);
  for (const issue of dbAccess.slice(0, 8)) {
    const loc = issue.location ?? "";
    const file = loc.split(":")[0];
    const line = parseInt(loc.split(":")[1] ?? "0", 10);
    const fullPath = join(convexDir, file);
    if (!existsSync(fullPath)) { console.log(`  ${loc}: FILE NOT FOUND`); continue; }
    const content = readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");
    const start = Math.max(0, line - 1);
    const end = Math.min(lines.length, start + 80);
    const body = lines.slice(start, end).join("\n");
    const hasRunMutation = /ctx\.runMutation/.test(body);
    const hasRunQuery = /ctx\.runQuery/.test(body);
    console.log(`  ${loc}: fn=${issue.functionName}, runMutation=${hasRunMutation}, runQuery=${hasRunQuery}`);
  }
}

// === AUTH WRAPPER PATTERNS ===
console.log("\n=== AUTH WRAPPER PATTERNS ===");
function collectTs(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== "_generated") results.push(...collectTs(full));
    else if (e.isFile() && e.name.endsWith(".ts")) results.push(full);
  }
  return results;
}
const allFiles = collectTs(convexDir);
let customAuthWrapper = 0;
const wrapperNames = new Set<string>();
for (const f of allFiles) {
  const c = readFileSync(f, "utf-8");
  const wrappers = c.match(/\b(custom|authed|protected|authenticated|withAuth|authGuard)\w*(Mutation|Query|Action)\b/g);
  if (wrappers) {
    customAuthWrapper += wrappers.length;
    wrappers.forEach((w: string) => wrapperNames.add(w));
  }
}
console.log(`Custom auth wrapper usages: ${customAuthWrapper}`);
console.log(`Wrapper names: ${[...wrapperNames].join(", ") || "(none)"}`);

// Also check: how many auth criticals are in files that use customQuery/customMutation from convex-helpers?
let customCtxFiles = 0;
for (const f of allFiles) {
  const c = readFileSync(f, "utf-8");
  if (/customQuery|customMutation|customAction/.test(c)) customCtxFiles++;
}
console.log(`Files using customQuery/customMutation/customAction: ${customCtxFiles}`);
