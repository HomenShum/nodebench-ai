#!/usr/bin/env npx tsx

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

type PhaseStatus = "passed" | "failed" | "skipped";

type PhaseResult = {
  id: string;
  label: string;
  command: string;
  status: PhaseStatus;
  durationMs: number;
  exitCode: number | null;
  stdoutPath?: string;
  stderrPath?: string;
  error?: string;
};

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function parseIntArg(flag: string, fallback: number) {
  const raw = getArg(flag);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function timestampFileSafe(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

async function runShell(command: string, cwd: string, timeoutMs: number, logBasePath: string): Promise<PhaseResult> {
  const startedAt = Date.now();
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const stdoutPath = `${logBasePath}.stdout.log`;
  const stderrPath = `${logBasePath}.stderr.log`;

  return await new Promise((resolveResult) => {
    const child = spawn(command, {
      cwd,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      stdoutChunks.push(text);
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      stderrChunks.push(text);
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      writeFileSync(stdoutPath, stdoutChunks.join(""), "utf8");
      writeFileSync(stderrPath, stderrChunks.join("") + `\n${error.message}\n`, "utf8");
      resolveResult({
        id: "",
        label: "",
        command,
        status: "failed",
        durationMs: Date.now() - startedAt,
        exitCode: 1,
        stdoutPath,
        stderrPath,
        error: error.message,
      });
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      writeFileSync(stdoutPath, stdoutChunks.join(""), "utf8");
      writeFileSync(stderrPath, stderrChunks.join(""), "utf8");
      const timedOut = signal === "SIGTERM" && Date.now() - startedAt >= timeoutMs;
      resolveResult({
        id: "",
        label: "",
        command,
        status: code === 0 && !timedOut ? "passed" : "failed",
        durationMs: Date.now() - startedAt,
        exitCode: code,
        stdoutPath,
        stderrPath,
        error: timedOut ? `Timed out after ${timeoutMs}ms` : undefined,
      });
    });
  });
}

function newestFile(dir: string, prefix: string, extension: string) {
  if (!existsSync(dir)) return null;
  const matches = readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(extension))
    .map((name) => ({ name, path: join(dir, name) }));
  if (matches.length === 0) return null;

  let bestPath = matches[0].path;
  let bestMtime = 0;
  for (const match of matches) {
    try {
      const mtime = Number(statSync(match.path).mtimeMs);
      if (mtime > bestMtime) {
        bestMtime = mtime;
        bestPath = match.path;
      }
    } catch {
      // ignore
    }
  }
  return bestPath;
}

function readJson<T = any>(path: string | null): T | null {
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function readLatestDogfoodEntry() {
  const qaResultsPath = join(process.cwd(), "public", "dogfood", "qa-results.json");
  const payload = readJson<any[]>(qaResultsPath);
  if (!Array.isArray(payload) || payload.length === 0) return null;
  return payload.reduce<any | null>((latest, entry) => {
    if (!entry || typeof entry !== "object") return latest;
    const entryTime = Date.parse(String(entry.timestamp ?? ""));
    const latestTime = Date.parse(String(latest?.timestamp ?? ""));
    if (!Number.isFinite(entryTime)) return latest;
    if (!latest || !Number.isFinite(latestTime) || entryTime > latestTime) {
      return entry;
    }
    return latest;
  }, null);
}

function formatMs(ms: number | null | undefined) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "n/a";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function summarizeNotebookLoad(payload: any) {
  const summary = Array.isArray(payload?.summary) ? payload.summary : [];
  const worstP95 = summary.reduce((max: number, row: any) => Math.max(max, Number(row?.p95 ?? 0)), 0);
  const worstUnexpectedErrorRate = summary.reduce((max: number, row: any) => {
    const hasExpectedErrors = Array.isArray(row?.expectedErrorCodes) && row.expectedErrorCodes.length > 0;
    return hasExpectedErrors ? max : Math.max(max, Number(row?.errorRatePct ?? 0));
  }, 0);
  return {
    summary,
    worstP95,
    worstUnexpectedErrorRate,
  };
}

function extractCapabilityMetrics(payload: any) {
  if (!payload || typeof payload !== "object") return {};
  if (payload.metrics && typeof payload.metrics === "object") return payload.metrics;
  return payload;
}

function summarizeHistoryLoad(payload: any) {
  const summary = Array.isArray(payload?.summary) ? payload.summary : [];
  const worstP95 = summary.reduce((max: number, row: any) => Math.max(max, Number(row?.p95 ?? 0)), 0);
  const worstErrorRate = summary.reduce((max: number, row: any) => Math.max(max, Number(row?.errorRatePct ?? 0)), 0);
  return {
    config: payload?.config ?? null,
    totals: payload?.totals ?? null,
    summary,
    worstP95,
    worstErrorRate,
  };
}

function summarizeAnswerControlEval(payload: any) {
  const summary = payload?.summary ?? null;
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const dimensions =
    summary && typeof summary.dimensions === "object" ? summary.dimensions : {};
  return {
    generatedAt: payload?.generatedAt ?? null,
    total: Number(summary?.total ?? results.length),
    passed: Number(summary?.passed ?? 0),
    passRate: Number(summary?.passRate ?? 0),
    dimensions,
    thresholds: summary?.thresholds ?? null,
    gateStatus: summary?.gateStatus ?? null,
    results,
  };
}

function summarizeExpandedEval(payload: any) {
  const summary = payload?.summary ?? null;
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const byCategory = new Map<string, { total: number; passed: number; avgElapsedMs: number }>();

  for (const row of results) {
    const category = typeof row?.category === "string" && row.category.trim() ? row.category : "unknown";
    const entry = byCategory.get(category) ?? { total: 0, passed: 0, avgElapsedMs: 0 };
    entry.total += 1;
    entry.passed += row?.passed ? 1 : 0;
    entry.avgElapsedMs += Number(row?.elapsed ?? 0);
    byCategory.set(category, entry);
  }

  const categorySummary = Array.from(byCategory.entries())
    .map(([category, entry]) => ({
      category,
      total: entry.total,
      passed: entry.passed,
      passRate: entry.total > 0 ? (entry.passed / entry.total) * 100 : 0,
      avgElapsedMs: entry.total > 0 ? entry.avgElapsedMs / entry.total : 0,
    }))
    .sort((left, right) => left.category.localeCompare(right.category));

  return {
    model: payload?.model ?? null,
    category: payload?.category ?? null,
    totalElapsed: Number(payload?.totalElapsed ?? 0),
    summary: summary
      ? {
          total: Number(summary.total ?? results.length),
          passed: Number(summary.passed ?? 0),
          failed: Number(summary.failed ?? 0),
          passRate: Number(summary.passRate ?? 0),
        }
      : null,
    categorySummary,
    results,
  };
}

function computeOverallVerdict(input: {
  phases: PhaseResult[];
  capability: any;
  dogfood: any;
  notebookLoad: ReturnType<typeof summarizeNotebookLoad> | null;
  historyLoad: ReturnType<typeof summarizeHistoryLoad> | null;
  expandedEval: ReturnType<typeof summarizeExpandedEval> | null;
  answerControl: ReturnType<typeof summarizeAnswerControlEval> | null;
}) {
  const capabilityMetrics = extractCapabilityMetrics(input.capability);
  const criteriaPassRates =
    capabilityMetrics?.judgeMetrics?.criteriaPassRates ?? {};
  const judgeAverage = Number(capabilityMetrics?.judgeMetrics?.avgScore ?? 0);
  const failingPhases = input.phases.filter((phase) => phase.status === "failed");
  const capabilityNextGate =
    Number(capabilityMetrics?.overallPassRate ?? 0) >= 65 &&
    Number(criteriaPassRates?.entityCorrect ?? 0) >= 80 &&
    Number(criteriaPassRates?.factuallyAccurate ?? 0) >= 50 &&
    Number(criteriaPassRates?.noHallucinations ?? 0) >= 60 &&
    Number(criteriaPassRates?.isActionable ?? 0) >= 55 &&
    Number(capabilityMetrics?.p95LatencyMs ?? 0) <= 90_000;
  const capabilityProductionGate =
    Number(capabilityMetrics?.overallPassRate ?? 0) >= 75 &&
    judgeAverage >= 7 &&
    Number(criteriaPassRates?.entityCorrect ?? 0) >= 90 &&
    Number(criteriaPassRates?.factuallyAccurate ?? 0) >= 75 &&
    Number(criteriaPassRates?.noHallucinations ?? 0) >= 85 &&
    Number(criteriaPassRates?.isActionable ?? 0) >= 70 &&
    Number(capabilityMetrics?.p95LatencyMs ?? 0) <= 70_000;
  const expandedPresent = input.expandedEval !== null;
  const expandedNextGate = !expandedPresent || Number(input.expandedEval?.summary?.passRate ?? 0) >= 75;
  const expandedProductionGate = !expandedPresent || Number(input.expandedEval?.summary?.passRate ?? 0) >= 75;
  const dogfoodNextGate =
    Number(input.dogfood?.score ?? 0) >= 85 &&
    Number(input.dogfood?.realIssueCount ?? 0) === 0;
  const dogfoodProductionGate =
    Number(input.dogfood?.score ?? 0) >= 85 &&
    Number(input.dogfood?.realIssueCount ?? 0) === 0;
  const notebookNextGate =
    input.notebookLoad !== null &&
    input.notebookLoad.worstUnexpectedErrorRate <= 5 &&
    input.notebookLoad.worstP95 <= 500;
  const notebookProductionGate =
    input.notebookLoad !== null &&
    input.notebookLoad.worstUnexpectedErrorRate <= 5 &&
    input.notebookLoad.worstP95 <= 500;
  const historyNextGate =
    input.historyLoad !== null &&
    input.historyLoad.worstErrorRate <= 5 &&
    input.historyLoad.worstP95 <= 800;
  const historyProductionGate =
    input.historyLoad !== null &&
    input.historyLoad.worstErrorRate <= 5 &&
    input.historyLoad.worstP95 <= 800;
  const answerControlNextGate =
    input.answerControl !== null &&
    Number(input.answerControl.dimensions?.artifact_decision_quality?.passRate ?? 0) >= 80 &&
    Number(input.answerControl.dimensions?.ambiguity_recovery?.passRate ?? 0) >= 75 &&
    Number(input.answerControl.dimensions?.entity_resolution?.passRate ?? 0) >= 80;
  const answerControlProductionGate =
    input.answerControl !== null &&
    Number(input.answerControl.dimensions?.artifact_decision_quality?.passRate ?? 0) >= 90 &&
    Number(input.answerControl.dimensions?.ambiguity_recovery?.passRate ?? 0) >= 75 &&
    Number(input.answerControl.dimensions?.entity_resolution?.passRate ?? 0) >= 90;

  const readiness =
    failingPhases.length === 0 &&
    capabilityProductionGate &&
    expandedProductionGate &&
    dogfoodProductionGate &&
    notebookProductionGate &&
    historyProductionGate &&
    answerControlProductionGate
      ? "production_candidate"
      : capabilityNextGate &&
          expandedNextGate &&
          notebookNextGate &&
          historyNextGate &&
          answerControlNextGate
        ? "demo_candidate"
        : "not_ready";

  return {
    readiness,
    capabilityNextGate,
    capabilityProductionGate,
    expandedNextGate,
    expandedProductionGate,
    expandedPresent,
    dogfoodNextGate,
    dogfoodProductionGate,
    notebookNextGate,
    notebookProductionGate,
    historyNextGate,
    historyProductionGate,
    answerControlNextGate,
    answerControlProductionGate,
    failingPhases: failingPhases.map((phase) => phase.id),
  };
}

async function main() {
  const cwd = process.cwd();
  const outDir = join(cwd, ".tmp", "evals");
  ensureDir(outDir);

  const benchmarkDir = join(cwd, "docs", "architecture", "benchmarks");
  ensureDir(benchmarkDir);

  const runStamp = timestampFileSafe();
  const models = getArg("--models") ?? "kimi-k2.6";
  const judgeModel = getArg("--judge-model") ?? process.env.EVAL_JUDGE_MODEL ?? "kimi-k2.6";
  const suite = getArg("--suite") ?? "full";
  const limit = parseIntArg("--limit", 0);
  const capabilityConcurrency = parseIntArg("--capability-concurrency", 3);
  const notebookClients = parseIntArg("--notebook-clients", 10);
  const notebookDuration = parseIntArg("--notebook-duration", 30);
  const historyOwners = parseIntArg("--history-owners", 3);
  const historyEntities = parseIntArg("--history-entities", 4);
  const historySessions = parseIntArg("--history-sessions", 4);
  const historyReads = parseIntArg("--history-reads", 24);
  const expandedModel = getArg("--expanded-model") ?? "kimi-k2.6";
  const expandedCategory = getArg("--expanded-category") ?? "all";
  const skipTypecheck = hasFlag("--skip-typecheck");
  const skipBuild = hasFlag("--skip-build");
  const skipCapability = hasFlag("--skip-capability");
  const skipExpanded = hasFlag("--skip-expanded");
  const skipAnswerControl = hasFlag("--skip-answer-control");
  const skipDogfood = hasFlag("--skip-dogfood");
  const skipNotebook = hasFlag("--skip-notebook");
  const skipHistory = hasFlag("--skip-history");

  const phases: PhaseResult[] = [];

  const commands = [
    {
      id: "typecheck",
      label: "Typecheck",
      command: "npx tsc --noEmit",
      timeoutMs: 15 * 60 * 1000,
      enabled: !skipTypecheck,
    },
    {
      id: "build",
      label: "Build",
      command: "npm run build",
      timeoutMs: 20 * 60 * 1000,
      enabled: !skipBuild,
    },
    {
      id: "capability_compare",
      label: "Capability and judge comparison",
      command: `npx tsx scripts/run-comprehensive-eval.ts --models ${models} --suite ${suite} --limit ${limit} --judge --judge-model ${judgeModel} --metrics --concurrency ${capabilityConcurrency}`,
      timeoutMs: 90 * 60 * 1000,
      enabled: !skipCapability,
    },
    {
      id: "expanded_feature_capability",
      label: "Expanded feature capability breadth",
      command: `npx tsx scripts/run-expanded-eval.ts --category ${expandedCategory} --model ${expandedModel}`,
      timeoutMs: 60 * 60 * 1000,
      enabled: !skipExpanded,
    },
    {
      id: "product_answer_control",
      label: "Product answer-control eval",
      command: "npx tsx scripts/run-product-answer-control-eval.ts --jsonOut .tmp/evals/product-answer-control-latest.json",
      timeoutMs: 20 * 60 * 1000,
      enabled: !skipAnswerControl,
    },
    {
      id: "dogfood_strict",
      label: "Dogfood strict QA",
      command: "npm run dogfood:verify:strict",
      timeoutMs: 70 * 60 * 1000,
      enabled: !skipDogfood,
    },
    {
      id: "notebook_capacity",
      label: "Notebook capacity load",
      command: `node scripts/loadtest/notebook-load.mjs --entity softbank --scenario all --clients ${notebookClients} --duration ${notebookDuration} --jsonOut .tmp/evals/notebook-load-latest.json`,
      timeoutMs: 20 * 60 * 1000,
      enabled: !skipNotebook,
    },
    {
      id: "product_history_soak",
      label: "Product chat history soak",
      command: `node scripts/loadtest/product-chat-history.mjs --owners ${historyOwners} --entities ${historyEntities} --sessions-per-entity ${historySessions} --history-reads ${historyReads} --jsonOut .tmp/evals/product-chat-history-latest.json`,
      timeoutMs: 20 * 60 * 1000,
      enabled: !skipHistory,
    },
  ];

  console.log(`\n=== FULL-STACK EVAL (${runStamp}) ===`);
  console.log(`models=${models}`);
  console.log(`suite=${suite} limit=${limit}`);
  console.log(`capability concurrency=${capabilityConcurrency}`);
  console.log(`expanded category=${expandedCategory} model=${expandedModel}`);
  console.log(`notebook clients=${notebookClients} duration=${notebookDuration}s`);
  console.log(`history owners=${historyOwners} entities=${historyEntities} sessions=${historySessions} reads=${historyReads}`);

  for (const phase of commands) {
    if (!phase.enabled) {
      phases.push({
        id: phase.id,
        label: phase.label,
        command: phase.command,
        status: "skipped",
        durationMs: 0,
        exitCode: null,
      });
      continue;
    }

    console.log(`\n--- ${phase.label} ---`);
    const raw = await runShell(phase.command, cwd, phase.timeoutMs, join(outDir, `${runStamp}-${phase.id}`));
    phases.push({
      ...raw,
      id: phase.id,
      label: phase.label,
    });
  }

  const comprehensiveJson = newestFile(benchmarkDir, "comprehensive-eval-", ".json");
  const expandedEvalJson = newestFile(benchmarkDir, "expanded-eval-", ".json");
  const answerControlJson = newestFile(benchmarkDir, "product-answer-control-eval-", ".json");
  const capability = readJson<any>(comprehensiveJson);
  const expandedEvalPayload = readJson<any>(expandedEvalJson);
  const answerControlPayload = readJson<any>(answerControlJson);
  const dogfood = readLatestDogfoodEntry();
  const notebookLoadPayload = readJson<any>(join(outDir, "notebook-load-latest.json"));
  const historyLoadPayload = readJson<any>(join(outDir, "product-chat-history-latest.json"));
  const notebookLoad = notebookLoadPayload ? summarizeNotebookLoad(notebookLoadPayload) : null;
  const historyLoad = historyLoadPayload ? summarizeHistoryLoad(historyLoadPayload) : null;
  const expandedEval = expandedEvalPayload ? summarizeExpandedEval(expandedEvalPayload) : null;
  const answerControl = answerControlPayload
    ? summarizeAnswerControlEval(answerControlPayload)
    : null;

  const verdict = computeOverallVerdict({
    phases,
    capability,
    dogfood,
    notebookLoad,
    historyLoad,
    expandedEval,
    answerControl,
  });

  const reportJson = {
    generatedAt: new Date().toISOString(),
    models,
    judgeModel,
    suite,
    limit,
    phases,
    capability,
    expandedEval,
    answerControl,
    dogfood,
    notebookLoad,
    historyLoad,
    verdict,
    artifacts: {
      comprehensiveJson,
      expandedEvalJson,
      answerControlJson,
      notebookLoadJson: join(outDir, "notebook-load-latest.json"),
      productHistoryJson: join(outDir, "product-chat-history-latest.json"),
      dogfoodResultsJson: join(cwd, "public", "dogfood", "qa-results.json"),
    },
  };

  const latestJsonPath = join(benchmarkDir, "full-stack-eval-latest.json");
  const stampedJsonPath = join(benchmarkDir, `full-stack-eval-${runStamp}.json`);
  writeFileSync(latestJsonPath, JSON.stringify(reportJson, null, 2), "utf8");
  writeFileSync(stampedJsonPath, JSON.stringify(reportJson, null, 2), "utf8");

  const capabilityMetrics = extractCapabilityMetrics(capability);
  const judgeMetrics = capabilityMetrics?.judgeMetrics ?? null;
  const criteriaPassRates = judgeMetrics?.criteriaPassRates ?? {};
  const dogfoodScore = Number(dogfood?.score ?? 0);
  const dogfoodGrade = String(dogfood?.grade ?? "n/a");

  const mdLines = [
    "# Full-Stack Eval",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Readiness: ${verdict.readiness}`,
    "",
    "## Phase Status",
    "",
    "| Phase | Status | Duration |",
    "|---|---|---|",
    ...phases.map((phase) => `| ${phase.id} | ${phase.status} | ${formatMs(phase.durationMs)} |`),
    "",
    "## Capability",
    "",
    `Overall pass rate: ${Number(capabilityMetrics?.overallPassRate ?? 0).toFixed(1)}%`,
    `LLM judge average: ${judgeMetrics ? Number(judgeMetrics.avgScore).toFixed(1) : "n/a"}/10`,
    `p95 latency: ${formatMs(capabilityMetrics?.p95LatencyMs ?? null)}`,
    `Entity correct: ${Number(criteriaPassRates?.entityCorrect ?? 0).toFixed(1)}%`,
    `Factually accurate: ${Number(criteriaPassRates?.factuallyAccurate ?? 0).toFixed(1)}%`,
    `No hallucinations: ${Number(criteriaPassRates?.noHallucinations ?? 0).toFixed(1)}%`,
    `Actionable: ${Number(criteriaPassRates?.isActionable ?? 0).toFixed(1)}%`,
    "",
    "| Model | Pass Rate | Judge Score | Avg Latency |",
    "|---|---|---|---|",
    ...Object.keys(capabilityMetrics?.passRateByModel ?? {}).map((model) => {
      const passRate = Number(capabilityMetrics.passRateByModel?.[model] ?? 0).toFixed(1);
      const judgeScore = judgeMetrics ? Number(judgeMetrics.scoreByModel?.[model] ?? 0).toFixed(1) : "n/a";
      const avgLatency = formatMs(capabilityMetrics.latencyByModel?.[model] ?? null);
      return `| ${model} | ${passRate}% | ${judgeScore} | ${avgLatency} |`;
    }),
    "",
    "## Feature Breadth",
    "",
    `Expanded pass rate: ${Number(expandedEval?.summary?.passRate ?? 0).toFixed(1)}%`,
    `Expanded model: ${String(expandedEval?.model ?? "n/a")} | category: ${String(expandedEval?.category ?? "n/a")} | total time: ${formatMs(expandedEval?.totalElapsed ?? null)}`,
    "",
    "| Category | Passed | Total | Pass Rate | Avg Latency |",
    "|---|---|---|---|---|",
    ...(expandedEval?.categorySummary ?? []).map(
      (row) =>
        `| ${row.category} | ${row.passed} | ${row.total} | ${Number(row.passRate ?? 0).toFixed(1)}% | ${formatMs(row.avgElapsedMs ?? null)} |`
    ),
    "",
    "## Answer Control",
    "",
    `Answer-control pass rate: ${Number(answerControl?.passRate ?? 0).toFixed(1)}%`,
    `Entity resolution: ${Number(answerControl?.dimensions?.entity_resolution?.passRate ?? 0).toFixed(1)}%`,
    `Artifact decision quality: ${Number(answerControl?.dimensions?.artifact_decision_quality?.passRate ?? 0).toFixed(1)}%`,
    `Ambiguity recovery: ${Number(answerControl?.dimensions?.ambiguity_recovery?.passRate ?? 0).toFixed(1)}%`,
    "",
    "| Dimension | Passed | Total | Pass Rate |",
    "|---|---|---|---|",
    ...Object.entries(answerControl?.dimensions ?? {}).map(
      ([dimension, row]: [string, any]) =>
        `| ${dimension} | ${Number(row?.passed ?? 0)} | ${Number(row?.total ?? 0)} | ${Number(row?.passRate ?? 0).toFixed(1)}% |`,
    ),
    "",
    "## UX / Dogfood",
    "",
    `Dogfood score: ${dogfoodScore}/100 (${dogfoodGrade})`,
    `Real issues: ${Number(dogfood?.realIssueCount ?? 0)}`,
    "",
    "## Capacity",
    "",
    `Notebook worst p95: ${formatMs(notebookLoad?.worstP95 ?? null)} | worst unexpected error rate: ${Number(notebookLoad?.worstUnexpectedErrorRate ?? 0).toFixed(2)}%`,
    `History soak worst p95: ${formatMs(historyLoad?.worstP95 ?? null)} | worst error rate: ${Number(historyLoad?.worstErrorRate ?? 0).toFixed(2)}%`,
    "",
    "### Notebook Load Rows",
    "",
    "| Scenario | p95 | Error % | Notes |",
    "|---|---|---|---|",
    ...(notebookLoad?.summary ?? []).map((row: any) => {
      const expected = Array.isArray(row.expectedErrorCodes) ? row.expectedErrorCodes.join(", ") : "";
      const notes = expected ? `expected conflict guards: ${expected}` : "";
      return `| ${row.scenario ?? row.id} | ${formatMs(row.p95 ?? null)} | ${Number(row.errorRatePct ?? 0).toFixed(2)}% | ${notes} |`;
    }),
    "",
    "### Product History Rows",
    "",
    "| Scenario | p95 | Error % |",
    "|---|---|---|",
    ...(historyLoad?.summary ?? []).map((row: any) => `| ${row.id} | ${formatMs(row.p95 ?? null)} | ${Number(row.errorRatePct ?? 0).toFixed(2)}% |`),
    "",
    "## Verdict",
    "",
    `Capability Next Gate OK: ${verdict.capabilityNextGate}`,
    `Capability Production Gate OK: ${verdict.capabilityProductionGate}`,
    `Expanded Feature Coverage Next Gate OK: ${verdict.expandedNextGate}`,
    `Expanded Feature Coverage Production Gate OK: ${verdict.expandedProductionGate}`,
    `Answer Control Next Gate OK: ${verdict.answerControlNextGate}`,
    `Answer Control Production Gate OK: ${verdict.answerControlProductionGate}`,
    `Dogfood Next Gate OK: ${verdict.dogfoodNextGate}`,
    `Dogfood Production Gate OK: ${verdict.dogfoodProductionGate}`,
    `Notebook Next Gate OK: ${verdict.notebookNextGate}`,
    `Notebook Production Gate OK: ${verdict.notebookProductionGate}`,
    `History Next Gate OK: ${verdict.historyNextGate}`,
    `History Production Gate OK: ${verdict.historyProductionGate}`,
    `Failing phases: ${verdict.failingPhases.length ? verdict.failingPhases.join(", ") : "none"}`,
    "",
    "## Artifacts",
    "",
    `- [Full-stack JSON](${stampedJsonPath.replace(/\\/g, "/")})`,
    comprehensiveJson ? `- [Capability JSON](${comprehensiveJson.replace(/\\/g, "/")})` : "- Capability JSON unavailable",
    expandedEvalJson ? `- [Expanded eval JSON](${expandedEvalJson.replace(/\\/g, "/")})` : "- Expanded eval JSON unavailable",
    answerControlJson ? `- [Answer-control JSON](${answerControlJson.replace(/\\/g, "/")})` : "- Answer-control JSON unavailable",
    `- [Notebook load JSON](${join(outDir, "notebook-load-latest.json").replace(/\\/g, "/")})`,
    `- [Product history JSON](${join(outDir, "product-chat-history-latest.json").replace(/\\/g, "/")})`,
  ];

  const latestMdPath = join(benchmarkDir, "full-stack-eval-latest.md");
  const stampedMdPath = join(benchmarkDir, `full-stack-eval-${runStamp}.md`);
  writeFileSync(latestMdPath, mdLines.join("\n"), "utf8");
  writeFileSync(stampedMdPath, mdLines.join("\n"), "utf8");

  console.log(`\nWrote reports:`);
  console.log(`- ${latestMdPath}`);
  console.log(`- ${stampedMdPath}`);
  console.log(`- ${latestJsonPath}`);
  console.log(`- ${stampedJsonPath}`);

  if (verdict.readiness === "not_ready" || phases.some((phase) => phase.status === "failed")) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
