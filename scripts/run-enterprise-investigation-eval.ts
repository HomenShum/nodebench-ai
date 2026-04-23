#!/usr/bin/env npx tsx

import dotenv from "dotenv";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import {
  ENTERPRISE_INVESTIGATION_EVAL_CASES,
  runEnterpriseInvestigationCase,
  serializeInvestigationForJudge,
} from "../apps/api-headless/src/lib/enterprise-investigation-eval.js";
import { evaluatePair } from "../packages/eval-engine/src/judges/text-judge.js";

type EnterpriseInvestigationPayload = Awaited<ReturnType<typeof runEnterpriseInvestigationCase>>["investigation"];

dotenv.config({ path: ".env.local" });
dotenv.config();

type LlmJudgeStatus = "passed" | "failed" | "error";

interface StreamEvent {
  at: string;
  type: string;
  lane?: number;
  caseId?: string;
  detail: string;
  request?: string;
  response?: string;
  telemetry?: Record<string, number | string | boolean | null>;
}

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parsePositiveInt(raw: string | undefined, fallback: number) {
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function tryGitSha() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function resolveNpxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function previewText(text: string, limit = 220) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1)}…`;
}

function getObservationCount(investigation: EnterpriseInvestigationPayload) {
  return investigation.observed_facts.length;
}

function getAnomalyCount(investigation: EnterpriseInvestigationPayload) {
  return investigation.derived_signals.anomalies.length;
}

function getSourceHashCount(investigation: EnterpriseInvestigationPayload) {
  return investigation.evidence_catalog.filter((item) => item.content_hash.length > 0).length;
}

function getProposedAction(investigation: EnterpriseInvestigationPayload) {
  return investigation.recommended_actions[0]?.action ?? "Action pending operator review";
}

function getForecastSummary(investigation: EnterpriseInvestigationPayload) {
  return investigation.derived_signals.forecast.summary;
}

function getObservedFactsSummary(investigation: EnterpriseInvestigationPayload) {
  return investigation.observed_facts.map((fact) => fact.statement).join(" | ");
}

function getConfidenceScore(investigation: EnterpriseInvestigationPayload) {
  return investigation.meta.overall_confidence;
}

function estimateJudgeCostUsd(model: string, inputTokens: number, outputTokens: number) {
  const normalized = model.toLowerCase();
  if (normalized.includes("gemini-3.1-flash-lite-preview") || normalized.includes("gemini-2.5-flash-lite")) {
    return Number((((inputTokens / 1_000_000) * 0.1) + ((outputTokens / 1_000_000) * 0.4)).toFixed(6));
  }
  if (normalized.includes("gpt-5.4-mini")) {
    return Number((((inputTokens / 1_000_000) * 0.75) + ((outputTokens / 1_000_000) * 4.5)).toFixed(6));
  }
  if (normalized.includes("kimi-k2.6") || normalized.includes("moonshotai/kimi-k2.6")) {
    return Number((((inputTokens / 1_000_000) * 0.95) + ((outputTokens / 1_000_000) * 4.0)).toFixed(6));
  }
  if (normalized.includes("haiku-4.5")) {
    return Number((((inputTokens / 1_000_000) * 1.0) + ((outputTokens / 1_000_000) * 5.0)).toFixed(6));
  }
  if (normalized.includes("haiku-3.5")) {
    return Number((((inputTokens / 1_000_000) * 0.8) + ((outputTokens / 1_000_000) * 4.0)).toFixed(6));
  }
  return null;
}

function loadProviderKeysFromConvexEnv() {
  const alreadyPresent =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENROUTER_API_KEY;
  if (alreadyPresent) {
    return { source: "process_env", loadedKeys: [] as string[] };
  }

  try {
    const raw = execSync(`${resolveNpxCommand()} convex env list`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const loadedKeys: string[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      const [, key, value] = match;
      if (!value) continue;
      if (
        ["GEMINI_API_KEY", "GOOGLE_AI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"].includes(key) &&
        !process.env[key]
      ) {
        process.env[key] = value.trim();
        loadedKeys.push(key);
      }
    }
    return { source: loadedKeys.length > 0 ? "convex_env" : "none", loadedKeys };
  } catch {
    return { source: "unavailable", loadedKeys: [] as string[] };
  }
}

function resolveJudgeModel() {
  const requested = getArg("--judge-model") ?? process.env.NODEBENCH_ENTERPRISE_EVAL_JUDGE_MODEL;
  if (requested) return requested;
  if (process.env.OPENROUTER_API_KEY) return "kimi-k2.6";
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) return "gemini-3.1-flash-lite-preview";
  if (process.env.OPENAI_API_KEY) return "gpt-5.4-mini";
  if (process.env.ANTHROPIC_API_KEY) return "claude-haiku-4.5";
  throw new Error(
    "No judge model credentials available. Set OPENROUTER_API_KEY, GEMINI_API_KEY, GOOGLE_AI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.",
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number, lane: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function runWorker(lane: number) {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]!, index, lane);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, (_, index) => runWorker(index + 1)),
  );
  return results;
}

async function main() {
  const concurrency = parsePositiveInt(getArg("--concurrency"), 2);
  const envBootstrap = loadProviderKeysFromConvexEnv();
  const judgeModel = resolveJudgeModel();
  const events: StreamEvent[] = [];
  const generatedAt = new Date().toISOString();
  const gitSha = tryGitSha();
  const suiteStartedAt = performance.now();

  events.push({
    at: generatedAt,
    type: "suite.started",
    detail: "Enterprise investigation eval suite started.",
    request: "Run the public fixture suite with required LLM judging and bounded parallelism.",
    response: "Initializing parallel lanes, deterministic scoring, and low-cost judge configuration.",
    telemetry: {
      caseCount: ENTERPRISE_INVESTIGATION_EVAL_CASES.length,
      concurrency,
      judgeModel,
      judgeKeysBootstrappedFromConvexEnv: envBootstrap.source === "convex_env",
      bootstrappedKeyCount: envBootstrap.loadedKeys.length,
    },
  });

  const caseResults = await mapWithConcurrency(
    ENTERPRISE_INVESTIGATION_EVAL_CASES,
    concurrency,
    async (testCase, _, lane) => {
      const caseStarted = performance.now();
      events.push({
        at: new Date().toISOString(),
        type: "case.started",
        lane,
        caseId: testCase.id,
        detail: `${testCase.title} started.`,
        request: previewText(
          `Query: ${testCase.query}\nSources: ${testCase.sourceRefs.join(", ")}\nTimeline events: ${testCase.timeline.length}`,
          340,
        ),
        telemetry: {
          lane,
          sourceCount: testCase.sourceRefs.length,
          timelineEvents: testCase.timeline.length,
          fixtureDocuments: testCase.documents.length,
          costProfile: testCase.costProfile,
        },
      });

      const buildStarted = performance.now();
      const evaluation = await runEnterpriseInvestigationCase(testCase);
      const buildDurationMs = Math.round(performance.now() - buildStarted);
      events.push({
        at: new Date().toISOString(),
        type: "case.investigation_built",
        lane,
        caseId: testCase.id,
        detail: `${testCase.title} produced enterprise investigation output.`,
        response: previewText(
          `Forecast: ${getForecastSummary(evaluation.investigation)}\nAction: ${getProposedAction(evaluation.investigation)}\nObserved facts: ${getObservedFactsSummary(evaluation.investigation)}`,
          420,
        ),
        telemetry: {
          lane,
          buildDurationMs,
          causalChainLength: getObservationCount(evaluation.investigation),
          anomalyCount: getAnomalyCount(evaluation.investigation),
          sourceHashCount: getSourceHashCount(evaluation.investigation),
          deterministicScore: evaluation.deterministic.overall,
          confidenceScore: getConfidenceScore(evaluation.investigation),
        },
      });

      const actual = serializeInvestigationForJudge(evaluation.investigation);
      const estimatedInputTokens = estimateTokens(testCase.groundTruthSummary + actual);
      events.push({
        at: new Date().toISOString(),
        type: "case.llm_judge_requested",
        lane,
        caseId: testCase.id,
        detail: `${testCase.title} sent to the required LLM judge.`,
        request: previewText(
          `Model: ${judgeModel}\nThreshold: 78\nExpected summary: ${testCase.groundTruthSummary}\nActual summary: ${actual}`,
          520,
        ),
        telemetry: {
          lane,
          estimatedInputTokens,
        },
      });

      const judgeStarted = performance.now();
      const llmJudge = await evaluatePair(testCase.groundTruthSummary, actual, {
        model: judgeModel,
        threshold: 78,
        criteria:
          "Judge whether the actual investigation reconstructs the temporal chain, incentive failure, traceability, and remedial action from the expected ground truth.",
        rubric: [
          "Score 0-100.",
          "Reward strong causal recall, source-backed time ordering, and correct organizational diagnosis.",
          "Penalize missing milestones, vague game-theory analysis, unsupported claims, or generic remediation.",
          "A passing answer must feel like a credible enterprise postmortem, not generic RAG output.",
        ].join("\n"),
      });
      const judgeDurationMs = performance.now() - judgeStarted;
      const estimatedOutputTokens = estimateTokens(
        `${llmJudge.reasoning}\n${llmJudge.evidence.join("\n")}`,
      );
      const estimatedJudgeCostUsd = estimateJudgeCostUsd(
        judgeModel,
        estimatedInputTokens,
        estimatedOutputTokens,
      );

      events.push({
        at: new Date().toISOString(),
        type: "case.judged",
        lane,
        caseId: testCase.id,
        detail: `${testCase.title} judged by ${judgeModel}.`,
        response: previewText(
          `Score: ${llmJudge.score}\nReasoning: ${llmJudge.reasoning}\nEvidence: ${llmJudge.evidence.join(" | ")}`,
          520,
        ),
        telemetry: {
          lane,
          judgeScore: llmJudge.score,
          judgePassed: llmJudge.passed,
          judgeDurationMs: Math.round(judgeDurationMs),
          estimatedInputTokens,
          estimatedOutputTokens,
          estimatedTotalTokens: estimatedInputTokens + estimatedOutputTokens,
          estimatedJudgeCostUsd,
        },
      });

      const totalDurationMs = Math.round(performance.now() - caseStarted);
      events.push({
        at: new Date().toISOString(),
        type: "case.completed",
        lane,
        caseId: testCase.id,
        detail: `${testCase.title} completed on lane ${lane}.`,
        telemetry: {
          lane,
          totalDurationMs,
          deterministicPassed: evaluation.deterministic.passed,
          judgePassed: llmJudge.passed,
          totalEstimatedTokens: estimatedInputTokens + estimatedOutputTokens,
          estimatedJudgeCostUsd,
        },
      });

      return {
        ...evaluation,
        llmJudge: {
          status: (llmJudge.passed ? "passed" : "failed") as LlmJudgeStatus,
          score: llmJudge.score,
          passed: llmJudge.passed,
          reasoning: llmJudge.reasoning,
          evidence: llmJudge.evidence,
          durationMs: llmJudge.durationMs,
          model: judgeModel,
          estimatedInputTokens,
          estimatedOutputTokens,
          estimatedTotalTokens: estimatedInputTokens + estimatedOutputTokens,
          estimatedJudgeCostUsd,
        },
        totalDurationMs,
      };
    },
  );

  const deterministicScores = caseResults.map((result) => result.deterministic.overall);
  const judgeScores = caseResults.map((result) => result.llmJudge.score);
  const totalEstimatedTokens = caseResults.reduce(
    (sum, result) => sum + result.llmJudge.estimatedTotalTokens,
    0,
  );
  const totalEstimatedJudgeCostUsd = Number(
    caseResults
      .reduce((sum, result) => sum + (result.llmJudge.estimatedJudgeCostUsd ?? 0), 0)
      .toFixed(6),
  );
  const failures = caseResults.flatMap((result) => {
    const items: string[] = [];
    if (!result.deterministic.passed) {
      items.push(`${result.caseId}: deterministic failures: ${result.deterministic.failures.join(", ")}`);
    }
    if (!result.llmJudge.passed) {
      items.push(`${result.caseId}: llm judge score ${result.llmJudge.score}`);
    }
    return items;
  });
  const totalWallClockMs = Math.round(performance.now() - suiteStartedAt);

  events.push({
    at: new Date().toISOString(),
    type: "suite.completed",
    detail:
      failures.length === 0
        ? "Enterprise investigation eval suite passed."
        : "Enterprise investigation eval suite completed with failures.",
    response: previewText(
      `Passed cases: ${caseResults.filter((result) => result.deterministic.passed && result.llmJudge.passed).length}/${caseResults.length}\nAverage deterministic: ${Math.round(average(deterministicScores))}\nAverage judge: ${Math.round(average(judgeScores))}\nEstimated tokens: ${totalEstimatedTokens}\nEstimated judge spend: ${totalEstimatedJudgeCostUsd}`,
      360,
    ),
    telemetry: {
      concurrency,
      totalWallClockMs,
      totalEstimatedTokens,
      totalEstimatedJudgeCostUsd,
      passedCases: caseResults.filter((result) => result.deterministic.passed && result.llmJudge.passed).length,
    },
  });

  const report = {
    generatedAt,
    gitSha,
    suite: "enterprise-investigation-eval-v1",
    suiteVersion: "v2_investigation_payload",
    strategy: {
      mode: "free_first_with_required_llm_judge",
      judgeModel,
      concurrency,
      costControl:
        "Fixture-backed cases avoid open-web churn. One flash-tier judge pass per case, bounded parallelism, and compressed judge inputs limit spend.",
      envBootstrap: envBootstrap.source,
    },
    summary: {
      totalCases: caseResults.length,
      passedCases: caseResults.filter((result) => result.deterministic.passed && result.llmJudge.passed).length,
      deterministicAverage: Math.round(average(deterministicScores)),
      llmJudgeAverage: Math.round(average(judgeScores)),
      totalEstimatedTokens,
      estimatedJudgeCostUsd: totalEstimatedJudgeCostUsd,
      totalWallClockMs,
    },
    cases: caseResults.map((result) => ({
      caseId: result.caseId,
      title: result.title,
      dataset: result.dataset,
      query: result.investigation.meta.query,
      deterministic: result.deterministic,
      llmJudge: result.llmJudge,
      meta: result.investigation.meta,
      telemetry: {
        totalDurationMs: result.totalDurationMs,
        anomalyCount: getAnomalyCount(result.investigation),
        causalChainLength: getObservationCount(result.investigation),
        sourceHashCount: getSourceHashCount(result.investigation),
        proposedAction: getProposedAction(result.investigation),
      },
      investigation: result.investigation,
    })),
    stream: {
      object: "enterprise_investigation_eval_stream",
      events,
      finalVerdict:
        failures.length === 0
          ? "PASS"
          : "FAIL",
      telemetry: {
        totalEstimatedTokens,
        averageJudgeScore: Math.round(average(judgeScores)),
        averageDeterministicScore: Math.round(average(deterministicScores)),
        totalWallClockMs,
        estimatedJudgeCostUsd: totalEstimatedJudgeCostUsd,
      },
      video: {
        status: "pending_capture",
        url: null,
        note: "Capture is triggered after the eval UI stream is stable.",
      },
    },
    realityCheck: {
      invariants: [
        "Every eval case must pass deterministic traceability checks and a required LLM judge.",
        "The suite must use public low-cost fixtures instead of paid retrieval during scoring.",
        "Parallelism is capped to keep wall-clock time down without multiplying judge spend.",
      ],
      remainingRisk:
        "This suite evaluates enterprise-investigation synthesis on curated public fixtures. It is stronger than point benchmarks, but it still under-tests live retrieval drift until a separate live-corpus lane is added.",
    },
    failures,
  };

  const docsDir = join(process.cwd(), "docs", "architecture", "benchmarks");
  const publicDir = join(process.cwd(), "public", "benchmarks");
  mkdirSync(docsDir, { recursive: true });
  mkdirSync(publicDir, { recursive: true });

  const jsonPath = join(docsDir, "enterprise-investigation-eval-latest.json");
  const mdPath = join(docsDir, "enterprise-investigation-eval-latest.md");
  const streamPath = join(docsDir, "enterprise-investigation-eval-stream-latest.json");
  const publicJsonPath = join(publicDir, "enterprise-investigation-eval-latest.json");
  const publicStreamPath = join(publicDir, "enterprise-investigation-eval-stream-latest.json");

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(streamPath, `${JSON.stringify(report.stream, null, 2)}\n`, "utf8");
  writeFileSync(publicJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(publicStreamPath, `${JSON.stringify(report.stream, null, 2)}\n`, "utf8");

  const markdown = [
    "# Enterprise Investigation Eval",
    "",
    `Generated: ${generatedAt}`,
    `Judge model: ${judgeModel}`,
    `Concurrency: ${concurrency}`,
    `Estimated judge spend: $${totalEstimatedJudgeCostUsd.toFixed(6)}`,
    `Total wall clock: ${totalWallClockMs}ms`,
    "",
    "## Summary",
    "",
    `- Passed cases: ${report.summary.passedCases}/${report.summary.totalCases}`,
    `- Deterministic average: ${report.summary.deterministicAverage}`,
    `- LLM judge average: ${report.summary.llmJudgeAverage}`,
    `- Estimated judge tokens: ${report.summary.totalEstimatedTokens}`,
    `- Estimated judge spend: $${totalEstimatedJudgeCostUsd.toFixed(6)}`,
    "",
    "## Cases",
    "",
    ...report.cases.flatMap((item) => [
      `### ${item.title}`,
      `- Deterministic: ${item.deterministic.overall} (${item.deterministic.passed ? "pass" : "fail"})`,
      `- LLM judge: ${item.llmJudge.score} (${item.llmJudge.passed ? "pass" : "fail"})`,
      `- LLM judge estimated spend: $${(item.llmJudge.estimatedJudgeCostUsd ?? 0).toFixed(6)}`,
      `- Observed facts: ${item.telemetry.causalChainLength}`,
      `- Evidence hashes: ${item.telemetry.sourceHashCount}`,
      `- Proposed action: ${item.telemetry.proposedAction}`,
      "",
    ]),
    failures.length === 0
      ? "Result: PASS"
      : `Result: FAIL\n\nFailures:\n${failures.map((item) => `- ${item}`).join("\n")}`,
    "",
  ].join("\n");

  writeFileSync(mdPath, markdown, "utf8");

  process.stdout.write(
    [
      `Wrote ${jsonPath}`,
      `Wrote ${mdPath}`,
      `Wrote ${streamPath}`,
      `Wrote ${publicJsonPath}`,
      `Wrote ${publicStreamPath}`,
    ].join("\n"),
  );

  if (failures.length > 0) {
    throw new Error(failures.join("; "));
  }
}

main().catch((error) => {
  process.stderr.write(`ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
