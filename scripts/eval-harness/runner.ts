#!/usr/bin/env npx tsx
/**
 * Eval Harness Runner — Executes tasks in bare vs MCP modes and generates comparison reports.
 *
 * Usage:
 *   npx tsx scripts/eval-harness/runner.ts --task t1_add_validator_returns --mode bare
 *   npx tsx scripts/eval-harness/runner.ts --task t1_add_validator_returns --mode mcp_core
 *   npx tsx scripts/eval-harness/runner.ts --all --seeds 3
 *   npx tsx scripts/eval-harness/runner.ts --compare t1_add_validator_returns
 *
 * Outputs: scripts/eval-harness/results/<taskId>_<mode>_<seed>.json
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EVAL_DATASET, getTaskById } from "./dataset.js";
import type {
  RunConfig,
  RunTelemetry,
  Scorecard,
  ComparisonReport,
  AgentMode,
  EvalTask,
} from "./types.js";

const RESULTS_DIR = join(import.meta.dirname || __dirname, "results");

function ensureResultsDir() {
  mkdirSync(RESULTS_DIR, { recursive: true });
}

// ── Scorecard Computation ───────────────────────────────────────────

function computeCompositeScore(scorecard: Scorecard): number {
  const weights = {
    correctness: 0.40,
    safety: 0.20,
    efficiency: 0.25,
    compounding: 0.15,
  };

  const correctnessScore =
    scorecard.correctness.taskSuccessRate * 0.7 +
    (1 - scorecard.correctness.regressionRate) * 0.3;

  const safetyScore =
    scorecard.safety.highRiskActionsGated * 0.6 +
    Math.min(scorecard.safety.issuesCaughtPreMerge / 5, 1) * 0.4;

  // Efficiency: normalize — lower is better for wall clock, tool calls, tokens
  const efficiencyScore =
    (1 - scorecard.efficiency.retryThrashRate) * 0.4 +
    Math.min(1, 60000 / Math.max(scorecard.efficiency.wallClockMs, 1)) * 0.3 +
    Math.min(1, 20 / Math.max(scorecard.efficiency.toolCallCount, 1)) * 0.3;

  const compoundingScore =
    scorecard.compounding.knowledgeReuseRate * 0.5 +
    Math.min(scorecard.compounding.evalCasesBanked / 3, 1) * 0.5;

  return (
    correctnessScore * weights.correctness +
    safetyScore * weights.safety +
    efficiencyScore * weights.efficiency +
    compoundingScore * weights.compounding
  );
}

// ── Stub runner (replace with real agent invocation) ─────────────────

function createStubTelemetry(config: RunConfig, task: EvalTask): RunTelemetry {
  const now = new Date().toISOString();
  const isMcp = config.agentMode !== "bare";

  // Stub scorecard — in production, this is computed from actual agent traces
  const scorecard: Scorecard = {
    correctness: {
      taskSuccessRate: 0,     // filled by real run
      regressionRate: 0,
    },
    safety: {
      highRiskActionsGated: task.riskTier === "low" ? 1 : 0,
      issuesCaughtPreMerge: 0,
    },
    efficiency: {
      wallClockMs: 0,
      toolCallCount: 0,
      tokenCount: 0,
      retryThrashRate: 0,
    },
    compounding: {
      knowledgeReuseRate: isMcp ? 0 : 0,
      evalCasesBanked: 0,
    },
  };

  return {
    runId: `run_${config.taskId}_${config.agentMode}_s${config.seed}_${Date.now()}`,
    config,
    startedAt: now,
    completedAt: now,
    scorecard,
    toolCalls: [],
    verificationCycles: [],
    outputHash: "",
    error: "STUB: Replace with real agent invocation",
  };
}

// ── Comparison Engine ───────────────────────────────────────────────

function loadResults(taskId: string): RunTelemetry[] {
  ensureResultsDir();
  const files = readdirSync(RESULTS_DIR).filter(
    (f) => f.startsWith(taskId) && f.endsWith(".json")
  );
  return files.map((f) => {
    const content = readFileSync(join(RESULTS_DIR, f), "utf-8");
    return JSON.parse(content) as RunTelemetry;
  });
}

function generateComparison(taskId: string): ComparisonReport | null {
  const task = getTaskById(taskId);
  if (!task) return null;

  const allResults = loadResults(taskId);
  if (allResults.length === 0) return null;

  const modes = [...new Set(allResults.map((r) => r.config.agentMode))];
  const results: ComparisonReport["results"] = {} as any;

  for (const mode of modes) {
    const modeResults = allResults.filter((r) => r.config.agentMode === mode);
    const scores = modeResults.map((r) => computeCompositeScore(r.scorecard));

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((acc, s) => acc + (s - mean) ** 2, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? sorted[0];

    results[mode] = {
      meanScore: mean,
      variance,
      p10Score: p10,
      meanWallClockMs:
        modeResults.reduce((a, r) => a + r.scorecard.efficiency.wallClockMs, 0) / modeResults.length,
      meanToolCalls:
        modeResults.reduce((a, r) => a + r.scorecard.efficiency.toolCallCount, 0) / modeResults.length,
      meanTokens:
        modeResults.reduce((a, r) => a + r.scorecard.efficiency.tokenCount, 0) / modeResults.length,
      successRate:
        modeResults.reduce((a, r) => a + r.scorecard.correctness.taskSuccessRate, 0) / modeResults.length,
      regressionRate:
        modeResults.reduce((a, r) => a + r.scorecard.correctness.regressionRate, 0) / modeResults.length,
    };
  }

  // Determine recommendation
  const bareScore = results["bare"]?.meanScore ?? 0;
  const mcpScores = modes
    .filter((m) => m !== "bare")
    .map((m) => ({ mode: m, score: results[m]?.meanScore ?? 0 }));
  const bestMcp = mcpScores.sort((a, b) => b.score - a.score)[0];

  let recommendation: ComparisonReport["recommendation"] = "inconclusive";
  let rationale = "";

  if (bestMcp && bareScore > 0) {
    const delta = bestMcp.score - bareScore;
    if (delta > 0.05) {
      recommendation = "mcp_wins";
      rationale = `MCP (${bestMcp.mode}) outperforms bare by ${(delta * 100).toFixed(1)}% composite score.`;
    } else if (delta < -0.05) {
      recommendation = "bare_wins";
      rationale = `Bare agent outperforms best MCP mode (${bestMcp.mode}) by ${(Math.abs(delta) * 100).toFixed(1)}%.`;
    } else {
      recommendation = "inconclusive";
      rationale = `Difference is within 5% margin (delta=${(delta * 100).toFixed(1)}%). Need more trials.`;
    }
  }

  return {
    taskId,
    taskName: task.name,
    configs: modes,
    trialsPerConfig: Math.min(...modes.map((m) => allResults.filter((r) => r.config.agentMode === m).length)),
    results,
    recommendation,
    rationale,
  };
}

// ── CLI ─────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  ensureResultsDir();

  if (args.includes("--list")) {
    console.log("Available eval tasks:");
    for (const task of EVAL_DATASET.tasks) {
      console.log(`  ${task.id} [${task.tier}] ${task.name}`);
    }
    return;
  }

  if (args.includes("--compare")) {
    const taskIdIdx = args.indexOf("--compare") + 1;
    const taskId = args[taskIdIdx];
    if (!taskId) {
      console.error("Usage: --compare <taskId>");
      process.exit(1);
    }
    const report = generateComparison(taskId);
    if (!report) {
      console.error(`No results found for task ${taskId}`);
      process.exit(1);
    }
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Single task run
  const taskIdx = args.indexOf("--task");
  const modeIdx = args.indexOf("--mode");
  const seedIdx = args.indexOf("--seed");

  if (taskIdx === -1) {
    console.log("Usage:");
    console.log("  --list                          List all tasks");
    console.log("  --task <id> --mode <mode>        Run a single task");
    console.log("  --compare <id>                  Compare results for a task");
    console.log("");
    console.log("Modes: bare, mcp_lite, mcp_core, mcp_full");
    return;
  }

  const taskId = args[taskIdx + 1];
  const mode = (args[modeIdx + 1] || "bare") as AgentMode;
  const seed = seedIdx !== -1 ? parseInt(args[seedIdx + 1]) : 1;

  const task = getTaskById(taskId);
  if (!task) {
    console.error(`Unknown task: ${taskId}`);
    process.exit(1);
  }

  const config: RunConfig = {
    taskId,
    agentMode: mode,
    model: "claude-sonnet-4-20250514",
    modelVersion: "20250514",
    seed,
    timeout: 300_000,
  };

  console.log(`Running: ${task.name} (${mode}, seed=${seed})`);
  const telemetry = createStubTelemetry(config, task);

  const outPath = join(RESULTS_DIR, `${taskId}_${mode}_s${seed}.json`);
  writeFileSync(outPath, JSON.stringify(telemetry, null, 2));
  console.log(`Result written to: ${outPath}`);
  console.log(`Composite score: ${computeCompositeScore(telemetry.scorecard).toFixed(3)}`);
}

main();
