import { schemaTools } from "./src/tools/schemaTools.js";
import { functionTools } from "./src/tools/functionTools.js";
import { authorizationTools } from "./src/tools/authorizationTools.js";
import { queryEfficiencyTools } from "./src/tools/queryEfficiencyTools.js";
import { actionAuditTools } from "./src/tools/actionAuditTools.js";
import { typeSafetyTools } from "./src/tools/typeSafetyTools.js";
import { transactionSafetyTools } from "./src/tools/transactionSafetyTools.js";
import { storageAuditTools } from "./src/tools/storageAuditTools.js";
import { paginationTools } from "./src/tools/paginationTools.js";
import { dataModelingTools } from "./src/tools/dataModelingTools.js";
import { vectorSearchTools } from "./src/tools/vectorSearchTools.js";
import { schedulerTools } from "./src/tools/schedulerTools.js";
import { qualityGateTools } from "./src/tools/qualityGateTools.js";
import { getDb } from "./src/db.js";
import { resolve } from "node:path";

getDb();

const P = resolve(import.meta.dirname, "../..");
console.log("=== DOGFOOD: Running all audits ===\nProject:", P);

const audits: [string, any[], string][] = [
  ["schema", schemaTools, "convex_audit_schema"],
  ["functions", functionTools, "convex_audit_functions"],
  ["authorization", authorizationTools, "convex_audit_authorization"],
  ["query_efficiency", queryEfficiencyTools, "convex_audit_query_efficiency"],
  ["action_audit", actionAuditTools, "convex_audit_actions"],
  ["type_safety", typeSafetyTools, "convex_check_type_safety"],
  ["transaction_safety", transactionSafetyTools, "convex_audit_transaction_safety"],
  ["storage", storageAuditTools, "convex_audit_storage_usage"],
  ["pagination", paginationTools, "convex_audit_pagination"],
  ["data_modeling", dataModelingTools, "convex_audit_data_modeling"],
  ["vector_search", vectorSearchTools, "convex_audit_vector_search"],
  ["scheduler_audit", schedulerTools, "convex_audit_schedulers"],
];

for (const [name, tools, toolName] of audits) {
  const t = tools.find((t: any) => t.name === toolName)!;
  await t.handler({ projectDir: P });
  console.log("  ran", name);
}

console.log("\n=== QUALITY GATE ===");
const gate = qualityGateTools.find((t) => t.name === "convex_quality_gate")!;
const r = await gate.handler({ projectDir: P }) as any;
for (const c of r.checks) {
  console.log(
    c.passed ? "PASS" : "FAIL",
    "|",
    c.metric.padEnd(22),
    "| actual:",
    String(c.actual).padEnd(8),
    "| threshold:",
    String(c.threshold).padEnd(8),
    "|",
    c.severity
  );
}
console.log("---");
console.log("Score:", r.score, "| Grade:", r.grade, "| Passed:", r.passed);
console.log(
  "Blockers:",
  r.checks.filter((c: any) => !c.passed && c.severity === "blocker").length
);
console.log(
  "Failing warnings:",
  r.checks.filter((c: any) => !c.passed && c.severity === "warning").length
);
