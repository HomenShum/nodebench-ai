import { getDb } from "./src/db.js";
import { resolve } from "node:path";

const db = getDb();
const P = resolve(import.meta.dirname, "../..");

// ── 1. Authorization: what auth patterns does the codebase actually use? ──
console.log("=== AUTH PATTERNS ANALYSIS ===\n");
const authRow = db.prepare(
  "SELECT issues_json FROM audit_results WHERE project_dir = ? AND audit_type = 'authorization' ORDER BY audited_at DESC LIMIT 1"
).get(P) as any;
if (authRow) {
  const issues = JSON.parse(authRow.issues_json);
  const criticals = issues.filter((i: any) => i.severity === "critical");

  // Check how many of these files also use getAuthUserId
  const { readFileSync, existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  const convexDir = join(P, "convex");

  let hasGetAuthUserId = 0;
  let hasGetAuthSessionId = 0;
  let hasNoAltAuth = 0;
  const fileAuthPatterns = new Map<string, string[]>();

  for (const issue of criticals) {
    const loc = issue.location ?? "";
    const file = loc.split(":")[0];
    if (!file) continue;

    const fullPath = join(convexDir, file);
    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath, "utf-8");
    const patterns: string[] = [];

    if (/getAuthUserId/.test(content)) { hasGetAuthUserId++; patterns.push("getAuthUserId"); }
    if (/getAuthSessionId/.test(content)) { hasGetAuthSessionId++; patterns.push("getAuthSessionId"); }
    if (/authenticated\(/.test(content)) { patterns.push("authenticated()"); }
    if (/withAuth/.test(content)) { patterns.push("withAuth"); }
    if (patterns.length === 0) hasNoAltAuth++;

    fileAuthPatterns.set(file, patterns);
  }

  console.log(`  330 auth criticals breakdown:`);
  console.log(`    File has getAuthUserId: ${hasGetAuthUserId}`);
  console.log(`    File has getAuthSessionId: ${hasGetAuthSessionId}`);
  console.log(`    File has NO alt auth pattern: ${hasNoAltAuth}`);

  // Show files with no alt auth (genuine issues)
  const genuineFiles = [...fileAuthPatterns.entries()].filter(([, p]) => p.length === 0);
  const byFile = new Map<string, number>();
  for (const [file] of genuineFiles) {
    byFile.set(file, (byFile.get(file) ?? 0) + 1);
  }
  console.log(`\n  Files with NO alt auth (${genuineFiles.length} issues):`);
  [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([f, n]) => {
    console.log(`    ${n}x ${f}`);
  });
}

// ── 2. Action audit: what Node APIs trigger the criticals? ──
console.log("\n=== ACTION AUDIT ANALYSIS ===\n");
const actionRow = db.prepare(
  "SELECT issues_json FROM audit_results WHERE project_dir = ? AND audit_type = 'action_audit' ORDER BY audited_at DESC LIMIT 1"
).get(P) as any;
if (actionRow) {
  const issues = JSON.parse(actionRow.issues_json);
  const criticals = issues.filter((i: any) => i.severity === "critical");

  const { readFileSync, existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  const convexDir = join(P, "convex");

  const nodeApis = /\b(require|__dirname|__filename|Buffer\.|process\.env|fs\.|path\.|crypto\.|child_process|net\.|http\.|https\.)\b/;

  let processEnvOnly = 0;
  let otherNodeApis = 0;
  const apiBreakdown = new Map<string, number>();

  for (const issue of criticals) {
    const loc = issue.location ?? "";
    const file = loc.split(":")[0];
    if (!file) continue;

    const fullPath = join(convexDir, file);
    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath, "utf-8");

    // Check which specific Node API triggered it
    const apis: string[] = [];
    if (/\bprocess\.env\b/.test(content)) apis.push("process.env");
    if (/\brequire\b/.test(content) && !/\brequire\b.*\btype\b|\btype\b.*\brequire\b/.test(content)) apis.push("require");
    if (/\b__dirname\b/.test(content)) apis.push("__dirname");
    if (/\bBuffer\./.test(content)) apis.push("Buffer");
    if (/\bfs\./.test(content)) apis.push("fs.");
    if (/\bpath\./.test(content)) apis.push("path.");
    if (/\bcrypto\./.test(content)) apis.push("crypto.");
    if (/\bhttp\./.test(content)) apis.push("http.");
    if (/\bhttps\./.test(content)) apis.push("https.");

    for (const api of apis) {
      apiBreakdown.set(api, (apiBreakdown.get(api) ?? 0) + 1);
    }

    if (apis.length === 1 && apis[0] === "process.env") processEnvOnly++;
    else otherNodeApis++;
  }

  console.log(`  60 action criticals breakdown:`);
  console.log(`    process.env ONLY: ${processEnvOnly}`);
  console.log(`    Other Node APIs: ${otherNodeApis}`);
  console.log(`\n  API breakdown:`);
  [...apiBreakdown.entries()].sort((a, b) => b[1] - a[1]).forEach(([api, n]) => {
    console.log(`    ${n}x ${api}`);
  });
}

// ── 3. Vector search: show the actual critical details ──
console.log("\n=== VECTOR SEARCH ANALYSIS ===\n");
const vsRow = db.prepare(
  "SELECT issues_json FROM audit_results WHERE project_dir = ? AND audit_type = 'vector_search' ORDER BY audited_at DESC LIMIT 1"
).get(P) as any;
if (vsRow) {
  const issues = JSON.parse(vsRow.issues_json);
  const criticals = issues.filter((i: any) => i.severity === "critical");
  for (const c of criticals) {
    console.log(`  [${c.severity}] ${c.location}: ${c.message}`);
  }
}

// ── 4. Type safety criticals ──
console.log("\n=== TYPE SAFETY ANALYSIS ===\n");
const tsRow = db.prepare(
  "SELECT issues_json FROM audit_results WHERE project_dir = ? AND audit_type = 'type_safety' ORDER BY audited_at DESC LIMIT 1"
).get(P) as any;
if (tsRow) {
  const issues = JSON.parse(tsRow.issues_json);
  const criticals = issues.filter((i: any) => i.severity === "critical");
  for (const c of criticals) {
    console.log(`  [${c.severity}] ${c.location}: ${c.message}`);
  }
}

// ── 5. Pagination criticals ──
console.log("\n=== PAGINATION ANALYSIS ===\n");
const pgRow = db.prepare(
  "SELECT issues_json FROM audit_results WHERE project_dir = ? AND audit_type = 'pagination' ORDER BY audited_at DESC LIMIT 1"
).get(P) as any;
if (pgRow) {
  const issues = JSON.parse(pgRow.issues_json);
  const criticals = issues.filter((i: any) => i.severity === "critical");
  for (const c of criticals) {
    console.log(`  [${c.severity}] ${c.location}: ${c.message}`);
  }
}
