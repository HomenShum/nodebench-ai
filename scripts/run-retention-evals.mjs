/**
 * Run retention-focused evaluation suite.
 *
 * Usage:
 *   node scripts/run-retention-evals.mjs
 *   node scripts/run-retention-evals.mjs --ownerKey eval-test-user --jsonOut .tmp/evals/retention-latest.json
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { runConvexJson } from "./lib/convexCli.mjs";

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function timestampFileSafe(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

const ownerKey = getArg("--ownerKey") || "eval-test-user";
const jsonOut = getArg("--jsonOut");
const mdOut = getArg("--mdOut");
const cwd = process.cwd();
const benchmarkDir = join(cwd, "docs", "architecture", "benchmarks");
ensureDir(benchmarkDir);

console.log("Running retention evaluation suite...");
console.log(`Owner: ${ownerKey}`);
console.log("");

try {
  const payload = runConvexJson(
    "domains/product/wikiDreamingEvaluationNatural:runRetentionEvaluationSuite",
    { ownerKey },
    { cwd },
  );
  const stamp = timestampFileSafe();
  const report = {
    generatedAt: new Date().toISOString(),
    ownerKey,
    passRate:
      Number(payload?.scenariosRun ?? 0) > 0
        ? (Number(payload?.passed ?? 0) / Number(payload?.scenariosRun ?? 0)) * 100
        : 0,
    ...payload,
  };

  const stampedJson = join(benchmarkDir, `retention-eval-${stamp}.json`);
  const latestJson = join(benchmarkDir, "retention-eval-latest.json");
  writeFileSync(stampedJson, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(latestJson, JSON.stringify(report, null, 2), "utf8");

  if (jsonOut) {
    ensureDir(dirname(jsonOut));
    writeFileSync(jsonOut, JSON.stringify(report, null, 2), "utf8");
  }

  const mdLines = [
    "# Retention Eval",
    "",
    `Generated: ${report.generatedAt}`,
    `Owner: ${ownerKey}`,
    `Passed: ${Number(report?.passed ?? 0)}/${Number(report?.scenariosRun ?? 0)}`,
    `Pass rate: ${Number(report.passRate ?? 0).toFixed(1)}%`,
    `Summary: ${String(report?.summary ?? "n/a")}`,
    "",
    "## Risk Areas",
    "",
    ...((Array.isArray(report?.retentionRiskAreas) && report.retentionRiskAreas.length > 0)
      ? report.retentionRiskAreas.map((line) => `- ${line}`)
      : ["- none"]),
    "",
    "## Artifacts",
    "",
    `- ${stampedJson.replace(/\\/g, "/")}`,
  ];

  const stampedMd = join(benchmarkDir, `retention-eval-${stamp}.md`);
  const latestMd = join(benchmarkDir, "retention-eval-latest.md");
  writeFileSync(stampedMd, mdLines.join("\n"), "utf8");
  writeFileSync(latestMd, mdLines.join("\n"), "utf8");

  if (mdOut) {
    ensureDir(dirname(mdOut));
    writeFileSync(mdOut, mdLines.join("\n"), "utf8");
  }

  console.log(JSON.stringify(report, null, 2));
  if (Number(report?.passed ?? 0) < Number(report?.scenariosRun ?? 0)) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error("Error running evaluation:", error?.stderr || error?.message || String(error));
  process.exit(1);
}
