import { qualityGateTools } from "./src/tools/qualityGateTools.js";
import { getDb } from "./src/db.js";
import { resolve } from "node:path";

getDb();
const P = resolve(import.meta.dirname, "../..");
const gate = qualityGateTools.find((t) => t.name === "convex_quality_gate")!;

// Test different threshold configs to find the right calibration
const configs = [
  { name: "Default (strict)", thresholds: {} },
  { name: "Lenient (startup)", thresholds: { maxCritical: 100, maxWarnings: 500, maxAsAnyCasts: 1500, maxUnboundedCollects: 700, maxDanglingRefs: 150 } },
  { name: "Calibrated (current baseline)", thresholds: { maxCritical: 560, maxWarnings: 3300, maxAsAnyCasts: 1100, maxUnboundedCollects: 650, maxDanglingRefs: 5 } },
  { name: "Target (3-month goal)", thresholds: { maxCritical: 200, maxWarnings: 1000, maxAsAnyCasts: 800, maxUnboundedCollects: 300, maxDanglingRefs: 10 } },
];

console.log("=== QUALITY GATE CALIBRATION ===\n");

for (const config of configs) {
  const r = await gate.handler({ projectDir: P, thresholds: config.thresholds }) as any;
  const failing = r.checks.filter((c: any) => !c.passed).map((c: any) => c.metric).join(", ");
  console.log(`${config.name}:`);
  console.log(`  Score: ${r.score} | Grade: ${r.grade} | Passed: ${r.passed}`);
  if (failing) console.log(`  Failing: ${failing}`);
  console.log();
}
