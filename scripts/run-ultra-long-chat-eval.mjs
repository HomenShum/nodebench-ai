#!/usr/bin/env node

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

function runConvex(functionName, args = {}) {
  return runConvexJson(functionName, args, { cwd });
}

const cwd = process.cwd();
const benchmarkDir = join(cwd, "docs", "architecture", "benchmarks");
ensureDir(benchmarkDir);

const stamp = timestampFileSafe();
const jsonOut = getArg("--jsonOut");
const mdOut = getArg("--mdOut");

console.log("Running ultra-long chat eval...");

const progressive = runConvex(
  "domains/evaluation/scenarios/researchUltraLongChatEval:evaluateUltraLongChatProgressiveDisclosure",
  {},
);
const compare = runConvex(
  "domains/evaluation/scenarios/researchUltraLongChatEval:compareProgressiveDisclosureVsKitchenSink",
  {},
);
const realPath = runConvex(
  "domains/evaluation/scenarios/ultraLongChatRealPathEval:evaluateUltraLongChatRealPath",
  {},
);

const payload = {
  generatedAt: new Date().toISOString(),
  summary: {
    passed: Boolean(progressive?.passed) && Boolean(realPath?.passed),
    progressivePassed: Boolean(progressive?.passed),
    realPathPassed: Boolean(realPath?.passed),
    progressiveScore: Number(progressive?.overallScore ?? 0),
    realPathScore: Number(realPath?.overallScore ?? 0),
    savingsPercent: Number(realPath?.routing?.savingsPercent ?? 0),
    contextRotRisk: String(realPath?.kernel?.finalRotRisk ?? "unknown"),
  },
  progressive,
  compare,
  realPath,
};

const stampedJson = join(benchmarkDir, `ultra-long-chat-eval-${stamp}.json`);
const latestJson = join(benchmarkDir, "ultra-long-chat-eval-latest.json");
writeFileSync(stampedJson, JSON.stringify(payload, null, 2), "utf8");
writeFileSync(latestJson, JSON.stringify(payload, null, 2), "utf8");

if (jsonOut) {
  ensureDir(dirname(jsonOut));
  writeFileSync(jsonOut, JSON.stringify(payload, null, 2), "utf8");
}

const mdLines = [
  "# Ultra-Long Chat Eval",
  "",
  `Generated: ${payload.generatedAt}`,
  `Passed: ${payload.summary.passed}`,
  `Progressive score: ${payload.summary.progressiveScore}`,
  `Real-path score: ${payload.summary.realPathScore}`,
  `Kitchen-sink savings: ${payload.summary.savingsPercent}%`,
  `Final context rot risk: ${payload.summary.contextRotRisk}`,
  "",
  "## Progressive Disclosure",
  "",
  `Passed: ${Boolean(progressive?.passed)}`,
  `Overall score: ${Number(progressive?.overallScore ?? 0)}`,
  `Relevance accuracy: ${Number(progressive?.metrics?.relevanceAccuracy ?? 0)}`,
  `Token efficiency: ${Number(progressive?.metrics?.tokenEfficiencyScore ?? 0)}`,
  `Context rot score: ${Number(progressive?.metrics?.contextRotScore ?? 0)}`,
  "",
  "## Real Path",
  "",
  `Passed: ${Boolean(realPath?.passed)}`,
  `Overall score: ${Number(realPath?.overallScore ?? 0)}`,
  `Advisor model: ${String(realPath?.routing?.advisorModel ?? "n/a")}`,
  `Executor samples: ${Array.isArray(realPath?.routing?.executorSamples) ? realPath.routing.executorSamples.join(", ") : "n/a"}`,
  `Input-cost savings vs kitchen sink: ${Number(realPath?.routing?.savingsPercent ?? 0)}%`,
  "",
  "### Findings",
  "",
  ...(Array.isArray(realPath?.findings) ? realPath.findings : []).map((line) => `- ${line}`),
  "",
  "### Assertion Failures",
  "",
  ...((Array.isArray(realPath?.assertionFailures) && realPath.assertionFailures.length > 0)
    ? realPath.assertionFailures.map((line) => `- ${line}`)
    : ["- none"]),
  "",
  "## Progressive vs Kitchen Sink",
  "",
  `Progressive tokens: ${Number(compare?.progressiveDisclosure?.totalTokens ?? 0)}`,
  `Kitchen-sink tokens: ${Number(compare?.kitchenSink?.totalTokens ?? 0)}`,
  `Recommendation: ${String(compare?.recommendation ?? "n/a")}`,
  "",
  "## Artifacts",
  "",
  `- ${stampedJson.replace(/\\/g, "/")}`,
];

const stampedMd = join(benchmarkDir, `ultra-long-chat-eval-${stamp}.md`);
const latestMd = join(benchmarkDir, "ultra-long-chat-eval-latest.md");
writeFileSync(stampedMd, mdLines.join("\n"), "utf8");
writeFileSync(latestMd, mdLines.join("\n"), "utf8");

if (mdOut) {
  ensureDir(dirname(mdOut));
  writeFileSync(mdOut, mdLines.join("\n"), "utf8");
}

console.log(JSON.stringify(payload, null, 2));

if (!payload.summary.passed) {
  process.exitCode = 1;
}
