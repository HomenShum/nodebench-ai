#!/usr/bin/env npx tsx

/**
 * Model Benchmark Comparison Script
 *
 * Runs persona-episode-eval across multiple models to compare:
 * - Quality (pass rate, ground truth accuracy)
 * - Cost (per run, per scenario)
 * - Latency (avg, p50, p95, p99)
 * - Tool usage efficiency (calls per scenario, parallelization)
 *
 * Usage:
 *   npx tsx scripts/run-model-benchmark-comparison.ts --iteration 1
 *   npx tsx scripts/run-model-benchmark-comparison.ts --iteration 2 --models "claude-haiku-4.5,gemini-3-flash"
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type ModelConfig = {
  name: string;
  displayName: string;
  expectedProvider: "openai" | "anthropic" | "google";
  tier: "baseline" | "fast" | "mini";
};

const MODELS: ModelConfig[] = [
  { name: "gpt-5.2", displayName: "GPT-5.2 (baseline)", expectedProvider: "openai", tier: "baseline" },
  { name: "claude-haiku-4.5", displayName: "Claude Haiku 4.5", expectedProvider: "anthropic", tier: "fast" },
  { name: "gemini-3-flash", displayName: "Gemini 3 Flash", expectedProvider: "google", tier: "fast" },
  { name: "gpt-5-mini", displayName: "GPT-5 Mini", expectedProvider: "openai", tier: "mini" },
];

const BASELINE_FILE = join(
  process.cwd(),
  "docs",
  "architecture",
  "benchmarks",
  "persona-episode-eval-pack-20260105-161514.json"
);

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function timestampForFilename(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-").slice(0, 19).replace("T", "-");
}

async function runBenchmark(model: string, iteration: number, suite: string = "pack"): Promise<any> {
  console.log(`\n[Iteration ${iteration}] Running benchmark for ${model}...`);

  const timestamp = timestampForFilename();
  const outName = `persona-episode-eval-${suite}-${model.replace(/[^a-zA-Z0-9]/g, "-")}-iter${iteration}-${timestamp}`;

  const tsxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    tsxCmd,
    [
      "tsx",
      "scripts/run-persona-episode-eval.ts",
      "--model", model,
      "--suite", suite,
      "--pricing", "cache",
      "--out", outName,
    ],
    {
      encoding: "utf8",
      stdio: "inherit",
      env: process.env,
      cwd: process.cwd(),
      timeout: 3600000, // 1 hour timeout for full suite
    }
  );

  if (result.error) {
    throw new Error(`Benchmark failed for ${model}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Benchmark failed for ${model} with exit code ${result.status}`);
  }

  const jsonPath = join(
    process.cwd(),
    "docs",
    "architecture",
    "benchmarks",
    `${outName}.json`
  );

  if (!existsSync(jsonPath)) {
    throw new Error(`Expected output file not found: ${jsonPath}`);
  }

  const content = readFileSync(jsonPath, "utf8");
  return { ...JSON.parse(content), _outputPath: jsonPath };
}

function calculateMetrics(benchmarkResult: any): any {
  const runs = Array.isArray(benchmarkResult?.result?.runs) ? benchmarkResult.result.runs : [];

  const latencies = runs
    .map((r: any) => Number(r?.execution?.latencyMs ?? 0))
    .filter((n: number) => Number.isFinite(n) && n > 0)
    .sort((a: number, b: number) => a - b);

  const toolCallCounts = runs.map((r: any) =>
    Array.isArray(r?.execution?.toolCalls) ? r.execution.toolCalls.length : 0
  );

  const providerUsage = benchmarkResult?.result?.estimatedUsage ?? {};

  const passed = runs.filter((r: any) => r?.ok === true).length;
  const total = runs.length;

  const avgToolCalls = toolCallCounts.reduce((a: number, b: number) => a + b, 0) / Math.max(1, total);
  const maxToolCalls = Math.max(...toolCallCounts, 0);
  const minToolCalls = Math.min(...toolCallCounts, 0);

  const p50Idx = Math.floor(latencies.length * 0.5);
  const p95Idx = Math.floor(latencies.length * 0.95);
  const p99Idx = Math.floor(latencies.length * 0.99);

  return {
    quality: {
      passRate: total > 0 ? passed / total : 0,
      passed,
      total,
      failed: total - passed,
    },
    cost: {
      totalUsd: Number(providerUsage?.estimatedCostUsd ?? 0),
      perScenarioUsd: total > 0 ? Number(providerUsage?.estimatedCostUsd ?? 0) / total : 0,
      inputTokens: Number(providerUsage?.inputTokens ?? 0),
      outputTokens: Number(providerUsage?.outputTokens ?? 0),
      cachedInputTokens: Number(providerUsage?.cachedInputTokens ?? 0),
    },
    latency: {
      avgMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      p50Ms: latencies[p50Idx] ?? 0,
      p95Ms: latencies[p95Idx] ?? 0,
      p99Ms: latencies[p99Idx] ?? 0,
      minMs: latencies[0] ?? 0,
      maxMs: latencies[latencies.length - 1] ?? 0,
    },
    toolUsage: {
      avgCallsPerScenario: avgToolCalls,
      minCalls: minToolCalls,
      maxCalls: maxToolCalls,
      totalCalls: toolCallCounts.reduce((a: number, b: number) => a + b, 0),
    },
    elapsedMs: Number(benchmarkResult?.elapsedMs ?? 0),
  };
}

function compareToBaseline(metrics: any, baselineMetrics: any): any {
  const qualityDelta = metrics.quality.passRate - baselineMetrics.quality.passRate;
  const costDelta = metrics.cost.totalUsd - baselineMetrics.cost.totalUsd;
  const costRatio = baselineMetrics.cost.totalUsd > 0 ? metrics.cost.totalUsd / baselineMetrics.cost.totalUsd : 1;
  const latencyDelta = metrics.latency.avgMs - baselineMetrics.latency.avgMs;
  const latencyRatio = baselineMetrics.latency.avgMs > 0 ? metrics.latency.avgMs / baselineMetrics.latency.avgMs : 1;

  return {
    quality: {
      passRateDelta: qualityDelta,
      passRateDeltaPct: qualityDelta * 100,
      passedDelta: metrics.quality.passed - baselineMetrics.quality.passed,
    },
    cost: {
      totalUsdDelta: costDelta,
      costRatio,
      savings: costDelta < 0 ? Math.abs(costDelta) : 0,
      savingsPct: costRatio < 1 ? (1 - costRatio) * 100 : 0,
    },
    latency: {
      avgMsDelta: latencyDelta,
      latencyRatio,
      speedup: latencyRatio < 1 ? (1 / latencyRatio) : 1,
      speedupPct: latencyRatio < 1 ? ((1 / latencyRatio - 1) * 100) : 0,
    },
    toolUsage: {
      avgCallsDelta: metrics.toolUsage.avgCallsPerScenario - baselineMetrics.toolUsage.avgCallsPerScenario,
    },
  };
}

function generateComparisonReport(
  iteration: number,
  results: Array<{ model: ModelConfig; benchmark: any; metrics: any; comparison?: any }>
): { markdown: string; summary: any } {
  const md: string[] = [];

  md.push(`# Model Benchmark Comparison - Iteration ${iteration}`);
  md.push(``);
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push(`Suite: pack (24 scenarios)`);
  md.push(``);

  // Summary table
  md.push(`## Summary`);
  md.push(``);
  md.push(`| Model | Pass Rate | Total Cost | Avg Latency | Cost vs Baseline | Speed vs Baseline |`);
  md.push(`|---|---:|---:|---:|---:|---:|`);

  for (const r of results) {
    const passRatePct = (r.metrics.quality.passRate * 100).toFixed(1);
    const costVsBaseline = r.comparison
      ? `${r.comparison.cost.savingsPct.toFixed(1)}% cheaper`
      : "baseline";
    const speedVsBaseline = r.comparison
      ? `${r.comparison.latency.speedupPct.toFixed(1)}% faster`
      : "baseline";

    md.push(
      `| ${r.model.displayName} | ${passRatePct}% (${r.metrics.quality.passed}/${r.metrics.quality.total}) | $${r.metrics.cost.totalUsd.toFixed(4)} | ${r.metrics.latency.avgMs.toFixed(0)}ms | ${costVsBaseline} | ${speedVsBaseline} |`
    );
  }
  md.push(``);

  // Detailed metrics
  md.push(`## Detailed Metrics`);
  md.push(``);

  for (const r of results) {
    md.push(`### ${r.model.displayName}`);
    md.push(``);
    md.push(`**Quality:**`);
    md.push(`- Pass rate: ${(r.metrics.quality.passRate * 100).toFixed(1)}% (${r.metrics.quality.passed}/${r.metrics.quality.total})`);
    if (r.comparison) {
      md.push(`- vs Baseline: ${r.comparison.quality.passRateDeltaPct >= 0 ? "+" : ""}${r.comparison.quality.passRateDeltaPct.toFixed(1)}%`);
    }
    md.push(``);

    md.push(`**Cost:**`);
    md.push(`- Total: $${r.metrics.cost.totalUsd.toFixed(4)}`);
    md.push(`- Per scenario: $${r.metrics.cost.perScenarioUsd.toFixed(4)}`);
    md.push(`- Input tokens: ${r.metrics.cost.inputTokens.toLocaleString()}`);
    md.push(`- Output tokens: ${r.metrics.cost.outputTokens.toLocaleString()}`);
    md.push(`- Cached tokens: ${r.metrics.cost.cachedInputTokens.toLocaleString()}`);
    if (r.comparison) {
      md.push(`- vs Baseline: ${r.comparison.cost.savingsPct.toFixed(1)}% cheaper ($${Math.abs(r.comparison.cost.totalUsdDelta).toFixed(4)} savings)`);
    }
    md.push(``);

    md.push(`**Latency:**`);
    md.push(`- Average: ${r.metrics.latency.avgMs.toFixed(0)}ms`);
    md.push(`- P50: ${r.metrics.latency.p50Ms.toFixed(0)}ms`);
    md.push(`- P95: ${r.metrics.latency.p95Ms.toFixed(0)}ms`);
    md.push(`- P99: ${r.metrics.latency.p99Ms.toFixed(0)}ms`);
    if (r.comparison) {
      md.push(`- vs Baseline: ${r.comparison.latency.speedupPct.toFixed(1)}% faster (${r.comparison.latency.speedup.toFixed(2)}x)`);
    }
    md.push(``);

    md.push(`**Tool Usage:**`);
    md.push(`- Avg calls/scenario: ${r.metrics.toolUsage.avgCallsPerScenario.toFixed(1)}`);
    md.push(`- Min calls: ${r.metrics.toolUsage.minCalls}`);
    md.push(`- Max calls: ${r.metrics.toolUsage.maxCalls}`);
    md.push(`- Total calls: ${r.metrics.toolUsage.totalCalls}`);
    md.push(``);
  }

  // Gaps & Optimization Opportunities
  md.push(`## Gaps & Optimization Opportunities`);
  md.push(``);

  const baselineResult = results.find(r => r.model.tier === "baseline");
  const fastResults = results.filter(r => r.model.tier === "fast" || r.model.tier === "mini");

  const gaps: string[] = [];

  for (const r of fastResults) {
    if (!r.comparison) continue;

    if (r.comparison.quality.passRateDelta < 0) {
      gaps.push(`**${r.model.displayName} Quality Gap:** ${Math.abs(r.comparison.quality.passRateDelta * 100).toFixed(1)}% lower pass rate than baseline (${r.comparison.quality.passedDelta} fewer passes)`);
    }

    if (r.comparison.toolUsage.avgCallsDelta > 1) {
      gaps.push(`**${r.model.displayName} Tool Efficiency:** ${r.comparison.toolUsage.avgCallsDelta.toFixed(1)} more tool calls per scenario on average`);
    }

    if (r.comparison.latency.latencyRatio > 1.2) {
      gaps.push(`**${r.model.displayName} Latency:** ${((r.comparison.latency.latencyRatio - 1) * 100).toFixed(1)}% slower than baseline despite being a faster model`);
    }
  }

  if (gaps.length === 0) {
    md.push(`✅ No significant gaps detected. All models performing at or above baseline.`);
  } else {
    gaps.forEach(g => md.push(`- ${g}`));
  }
  md.push(``);

  // Recommendations
  md.push(`## Recommendations for Next Iteration`);
  md.push(``);

  const recommendations: string[] = [];

  // Analyze failure patterns
  const failedScenarios = new Map<string, number>();
  for (const r of fastResults) {
    const runs = r.benchmark?.result?.runs ?? [];
    for (const run of runs) {
      if (run.ok === false) {
        const key = `${run.id}`;
        failedScenarios.set(key, (failedScenarios.get(key) ?? 0) + 1);
      }
    }
  }

  if (failedScenarios.size > 0) {
    const sortedFailures = [...failedScenarios.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    recommendations.push(`**Focus on High-Failure Scenarios:** ${sortedFailures.map(([id, count]) => `${id} (${count} failures)`).join(", ")}`);
  }

  // Tool usage optimization
  const avgToolCallsBaseline = baselineResult?.metrics.toolUsage.avgCallsPerScenario ?? 0;
  const highToolUsage = fastResults.filter(r => r.metrics.toolUsage.avgCallsPerScenario > avgToolCallsBaseline * 1.2);
  if (highToolUsage.length > 0) {
    recommendations.push(`**Optimize Tool Delegation:** Models ${highToolUsage.map(r => r.model.name).join(", ")} using ${(avgToolCallsBaseline * 0.2).toFixed(1)}+ more tools than baseline - improve prompt for smarter tool selection`);
  }

  // Cost efficiency
  const bestCostModel = results
    .filter(r => r.metrics.quality.passRate >= (baselineResult?.metrics.quality.passRate ?? 0) * 0.95)
    .sort((a, b) => a.metrics.cost.totalUsd - b.metrics.cost.totalUsd)[0];

  if (bestCostModel && bestCostModel.model.tier !== "baseline") {
    recommendations.push(`**Best Cost-Quality Balance:** ${bestCostModel.model.displayName} achieves ${(bestCostModel.metrics.quality.passRate * 100).toFixed(1)}% pass rate at ${bestCostModel.comparison?.cost.savingsPct.toFixed(1)}% lower cost`);
  }

  // Latency optimization
  const slowScenarios = baselineResult?.benchmark?.result?.runs
    ?.filter((r: any) => Number(r?.execution?.latencyMs ?? 0) > 60000)
    ?.map((r: any) => r.id) ?? [];

  if (slowScenarios.length > 0) {
    recommendations.push(`**Parallelize Slow Scenarios:** ${slowScenarios.slice(0, 3).join(", ")} taking >60s - add parallel tool execution hints`);
  }

  if (recommendations.length === 0) {
    md.push(`✅ System is well-optimized. Consider testing with more challenging scenarios or edge cases.`);
  } else {
    recommendations.forEach(r => md.push(`${/^\*\*/.test(r) ? "" : "- "}${r}`));
  }
  md.push(``);

  const summary = {
    iteration,
    totalModels: results.length,
    bestQuality: results.sort((a, b) => b.metrics.quality.passRate - a.metrics.quality.passRate)[0]?.model.displayName,
    bestCost: results.sort((a, b) => a.metrics.cost.totalUsd - b.metrics.cost.totalUsd)[0]?.model.displayName,
    bestLatency: results.sort((a, b) => a.metrics.latency.avgMs - b.metrics.latency.avgMs)[0]?.model.displayName,
    gaps: gaps.length,
    recommendations: recommendations.length,
  };

  return { markdown: md.join("\n"), summary };
}

async function main() {
  const iteration = parsePositiveInt(getArg("--iteration")) ?? 1;
  const modelsArg = getArg("--models");
  const suite = getArg("--suite") ?? "pack";

  const selectedModels = modelsArg
    ? modelsArg.split(",").map(name => MODELS.find(m => m.name === name.trim())).filter(Boolean) as ModelConfig[]
    : MODELS;

  console.log(`\n=== Model Benchmark Comparison - Iteration ${iteration} ===`);
  console.log(`Models: ${selectedModels.map(m => m.displayName).join(", ")}`);
  console.log(`Suite: ${suite}`);
  console.log(``);

  // Load baseline
  let baselineMetrics: any = null;
  if (existsSync(BASELINE_FILE)) {
    console.log(`Loading baseline from ${BASELINE_FILE}...`);
    const baselineContent = readFileSync(BASELINE_FILE, "utf8");
    const baselineData = JSON.parse(baselineContent);
    baselineMetrics = calculateMetrics(baselineData);
    console.log(`Baseline loaded: ${baselineMetrics.quality.passed}/${baselineMetrics.quality.total} pass rate, $${baselineMetrics.cost.totalUsd.toFixed(4)} cost\n`);
  } else {
    console.log(`⚠️  Baseline file not found: ${BASELINE_FILE}`);
    console.log(`Running without baseline comparison.\n`);
  }

  // Run benchmarks
  const results: Array<{ model: ModelConfig; benchmark: any; metrics: any; comparison?: any }> = [];

  for (const model of selectedModels) {
    try {
      const benchmark = await runBenchmark(model.name, iteration, suite);
      const metrics = calculateMetrics(benchmark);

      const comparison = model.tier === "baseline" ? undefined : baselineMetrics
        ? compareToBaseline(metrics, baselineMetrics)
        : undefined;

      results.push({ model, benchmark, metrics, comparison });

      console.log(`✅ ${model.displayName}: ${metrics.quality.passed}/${metrics.quality.total} passed, $${metrics.cost.totalUsd.toFixed(4)} cost, ${metrics.latency.avgMs.toFixed(0)}ms avg latency`);
    } catch (err) {
      console.error(`❌ ${model.displayName} failed:`, err instanceof Error ? err.message : String(err));
    }
  }

  // Generate comparison report
  const { markdown, summary } = generateComparisonReport(iteration, results);

  const timestamp = timestampForFilename();
  const outDir = join(process.cwd(), "docs", "architecture", "benchmarks");
  mkdirSync(outDir, { recursive: true });

  const reportPath = join(outDir, `model-comparison-iter${iteration}-${timestamp}.md`);
  const summaryPath = join(outDir, `model-comparison-iter${iteration}-${timestamp}.json`);

  writeFileSync(reportPath, markdown, "utf8");
  writeFileSync(summaryPath, JSON.stringify({ iteration, timestamp, summary, results }, null, 2), "utf8");

  console.log(`\n📊 Comparison report saved:`);
  console.log(`   ${reportPath}`);
  console.log(`   ${summaryPath}`);
  console.log(``);
  console.log(`Summary:`);
  console.log(`  - Best quality: ${summary.bestQuality}`);
  console.log(`  - Best cost: ${summary.bestCost}`);
  console.log(`  - Best latency: ${summary.bestLatency}`);
  console.log(`  - Gaps identified: ${summary.gaps}`);
  console.log(`  - Recommendations: ${summary.recommendations}`);
}

main().catch((err) => {
  console.error("ERROR:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
