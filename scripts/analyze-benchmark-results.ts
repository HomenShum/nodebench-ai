#!/usr/bin/env npx tsx

/**
 * Analyze benchmark results and generate refinement recommendations
 *
 * Usage: npx tsx scripts/analyze-benchmark-results.ts --results haiku-45-pack-iter1.json,gemini-3-flash-pack-iter1.json
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

interface FailurePattern {
  scenarioId: string;
  scenarioName: string;
  failureCount: number;
  models: string[];
  commonReasons: string[];
  avgToolCalls: number;
  avgLatencyMs: number;
}

interface OptimizationOpportunity {
  category: "prompt" | "tool_delegation" | "parallelization" | "caching" | "model_selection";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact: {
    quality?: string;
    cost?: string;
    latency?: string;
  };
  implementation: string[];
}

function loadBenchmarkResult(path: string): any {
  if (!existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  const content = readFileSync(path, "utf8");
  return JSON.parse(content);
}

function extractModelName(result: any): string {
  return result?.model ?? result?.result?.runs?.[0]?.execution?.modelUsed ?? "unknown";
}

function analyzeFailurePatterns(results: any[]): FailurePattern[] {
  const scenarioFailures = new Map<string, {
    name: string;
    count: number;
    models: Set<string>;
    reasons: string[];
    toolCalls: number[];
    latencies: number[];
  }>();

  for (const result of results) {
    const model = extractModelName(result);
    const runs = result?.result?.runs ?? [];

    for (const run of runs) {
      if (run.ok === false) {
        const id = run.id;
        const existing = scenarioFailures.get(id) ?? {
          name: run.name,
          count: 0,
          models: new Set(),
          reasons: [],
          toolCalls: [],
          latencies: [],
        };

        existing.count++;
        existing.models.add(model);
        if (Array.isArray(run.failureReasons)) {
          existing.reasons.push(...run.failureReasons);
        }
        existing.toolCalls.push(run.execution?.toolCalls?.length ?? 0);
        existing.latencies.push(run.execution?.latencyMs ?? 0);

        scenarioFailures.set(id, existing);
      }
    }
  }

  return Array.from(scenarioFailures.entries())
    .map(([id, data]) => ({
      scenarioId: id,
      scenarioName: data.name,
      failureCount: data.count,
      models: Array.from(data.models),
      commonReasons: [...new Set(data.reasons)],
      avgToolCalls: data.toolCalls.reduce((a, b) => a + b, 0) / Math.max(1, data.toolCalls.length),
      avgLatencyMs: data.latencies.reduce((a, b) => a + b, 0) / Math.max(1, data.latencies.length),
    }))
    .sort((a, b) => b.failureCount - a.failureCount);
}

function analyzeToolUsage(results: any[]): any {
  const toolStats = new Map<string, { calls: number; failures: number; avgLatency: number; latencies: number[] }>();

  for (const result of results) {
    const runs = result?.result?.runs ?? [];

    for (const run of runs) {
      const toolCalls = run.execution?.toolCalls ?? [];

      for (const call of toolCalls) {
        const name = call.name;
        const stats = toolStats.get(name) ?? { calls: 0, failures: 0, avgLatency: 0, latencies: [] };

        stats.calls++;
        if (call.error || call.ok === false) {
          stats.failures++;
        }

        toolStats.set(name, stats);
      }
    }
  }

  const sorted = Array.from(toolStats.entries())
    .map(([name, stats]) => ({
      name,
      calls: stats.calls,
      failures: stats.failures,
      failureRate: stats.calls > 0 ? stats.failures / stats.calls : 0,
    }))
    .sort((a, b) => b.calls - a.calls);

  return {
    byFrequency: sorted,
    highFailureRate: sorted.filter(t => t.failureRate > 0.1),
    underutilized: sorted.filter(t => t.calls < 3), // tools called < 3 times across all scenarios
  };
}

function generateOptimizations(
  failurePatterns: FailurePattern[],
  toolUsage: any,
  results: any[]
): OptimizationOpportunity[] {
  const opportunities: OptimizationOpportunity[] = [];

  // High-failure scenarios
  const criticalFailures = failurePatterns.filter(p => p.failureCount >= 2);
  if (criticalFailures.length > 0) {
    opportunities.push({
      category: "prompt",
      priority: "high",
      title: "Fix high-failure scenarios with targeted prompts",
      description: `${criticalFailures.length} scenarios failing across multiple models`,
      impact: {
        quality: `+${criticalFailures.length * 4}% pass rate (fix ${criticalFailures.length} scenarios)`,
      },
      implementation: [
        `Focus on: ${criticalFailures.slice(0, 3).map(f => f.scenarioId).join(", ")}`,
        "Add explicit examples for persona inference",
        "Strengthen ground truth citation requirements",
        "Add verification step prompts for tool-driven scenarios",
      ],
    });
  }

  // Tool delegation issues
  const avgToolCallsPerModel = results.map(r => {
    const runs = r?.result?.runs ?? [];
    const totalCalls = runs.reduce((sum: number, run: any) =>
      sum + (run.execution?.toolCalls?.length ?? 0), 0);
    return {
      model: extractModelName(r),
      avgCalls: totalCalls / Math.max(1, runs.length),
    };
  });

  const baselineAvg = avgToolCallsPerModel.find(m => m.model.includes("gpt-5.2") && !m.model.includes("mini"))?.avgCalls ?? 0;
  const inefficientModels = avgToolCallsPerModel.filter(m => m.avgCalls > baselineAvg * 1.3);

  if (inefficientModels.length > 0) {
    opportunities.push({
      category: "tool_delegation",
      priority: "high",
      title: "Optimize tool selection for faster models",
      description: `Models using ${((inefficientModels[0].avgCalls / baselineAvg - 1) * 100).toFixed(0)}% more tools than baseline`,
      impact: {
        cost: "-15% to -25% (fewer redundant tool calls)",
        latency: "-20% to -30% (less sequential tool execution)",
      },
      implementation: [
        "Add 'tool budget' awareness to coordinator agent",
        "Teach models to combine tool calls (e.g., lookup + search in one step)",
        "Add explicit 'skip if cached' logic for ground truth lookups",
        `Target models: ${inefficientModels.map(m => m.model).join(", ")}`,
      ],
    });
  }

  // Parallelization opportunities
  const sequentialHeavyScenarios = failurePatterns
    .filter(p => p.avgLatencyMs > 45000 && p.avgToolCalls >= 3);

  if (sequentialHeavyScenarios.length > 0) {
    opportunities.push({
      category: "parallelization",
      priority: "medium",
      title: "Enable parallel tool execution for slow scenarios",
      description: `${sequentialHeavyScenarios.length} scenarios taking >45s with 3+ sequential tool calls`,
      impact: {
        latency: "-30% to -50% for affected scenarios",
      },
      implementation: [
        "Add parallel tool hints for independent lookups",
        "Batch ground truth + web search calls where possible",
        `Focus on: ${sequentialHeavyScenarios.slice(0, 3).map(s => s.scenarioId).join(", ")}`,
      ],
    });
  }

  // Caching opportunities
  const hasCachedTokens = results.some(r =>
    (r?.result?.estimatedUsage?.cachedInputTokens ?? 0) > 0
  );

  if (!hasCachedTokens) {
    opportunities.push({
      category: "caching",
      priority: "medium",
      title: "Enable prompt caching for repeated context",
      description: "No cached tokens detected - missing 50-90% cost savings",
      impact: {
        cost: "-50% to -75% (with prompt caching)",
      },
      implementation: [
        "Add cache_control breakpoints for system prompts",
        "Cache persona definitions and ground truth schemas",
        "Cache tool descriptions (they don't change between runs)",
      ],
    });
  }

  // Model selection
  const bestCostQuality = results
    .map(r => ({
      model: extractModelName(r),
      passRate: (r?.result?.summary?.passed ?? 0) / Math.max(1, r?.result?.summary?.total ?? 1),
      cost: r?.result?.estimatedUsage?.estimatedCostUsd ?? 0,
    }))
    .filter(m => m.passRate >= 0.95)
    .sort((a, b) => a.cost - b.cost)[0];

  if (bestCostQuality && !bestCostQuality.model.includes("gpt-5.2")) {
    opportunities.push({
      category: "model_selection",
      priority: "low",
      title: `Switch to ${bestCostQuality.model} for cost savings`,
      description: `${(bestCostQuality.passRate * 100).toFixed(1)}% pass rate at lowest cost`,
      impact: {
        cost: "Best cost-quality ratio in benchmark",
        quality: `${(bestCostQuality.passRate * 100).toFixed(1)}% pass rate maintained`,
      },
      implementation: [
        `Use ${bestCostQuality.model} as default for production`,
        "Keep GPT-5.2 for complex/ambiguous cases",
        "Add model router based on scenario complexity",
      ],
    });
  }

  return opportunities.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function generateReport(results: any[]): string {
  const md: string[] = [];

  md.push(`# Benchmark Analysis & Refinement Recommendations`);
  md.push(``);
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push(`Models analyzed: ${results.length}`);
  md.push(``);

  // Overview
  md.push(`## Overview`);
  md.push(``);
  md.push(`| Model | Pass Rate | Total Cost | Avg Latency | Scenarios |`);
  md.push(`|---|---:|---:|---:|---:|`);

  for (const result of results) {
    const model = extractModelName(result);
    const summary = result?.result?.summary ?? {};
    const usage = result?.result?.estimatedUsage ?? {};
    const runs = result?.result?.runs ?? [];

    const passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : "0.0";
    const cost = usage.estimatedCostUsd?.toFixed(4) ?? "N/A";

    const latencies = runs
      .map((r: any) => Number(r?.execution?.latencyMs ?? 0))
      .filter((n: number) => n > 0);
    const avgLatency = latencies.length > 0
      ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(0)
      : "N/A";

    md.push(`| ${model} | ${passRate}% | $${cost} | ${avgLatency}ms | ${summary.total ?? 0} |`);
  }
  md.push(``);

  // Failure analysis
  const failurePatterns = analyzeFailurePatterns(results);

  if (failurePatterns.length > 0) {
    md.push(`## Failure Patterns`);
    md.push(``);
    md.push(`| Scenario | Failures | Models | Avg Tools | Avg Latency |`);
    md.push(`|---|---:|---|---:|---:|`);

    for (const pattern of failurePatterns.slice(0, 10)) {
      md.push(
        `| ${pattern.scenarioName} | ${pattern.failureCount} | ${pattern.models.join(", ")} | ${pattern.avgToolCalls.toFixed(1)} | ${pattern.avgLatencyMs.toFixed(0)}ms |`
      );
    }
    md.push(``);

    // Common failure reasons
    md.push(`### Common Failure Reasons`);
    md.push(``);
    const allReasons = failurePatterns.flatMap(p => p.commonReasons);
    const reasonCounts = new Map<string, number>();
    for (const reason of allReasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }

    const topReasons = Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [reason, count] of topReasons) {
      md.push(`- **${count}x:** ${reason.slice(0, 200)}`);
    }
    md.push(``);
  }

  // Tool usage analysis
  const toolUsage = analyzeToolUsage(results);

  md.push(`## Tool Usage Analysis`);
  md.push(``);
  md.push(`### Most Frequent Tools`);
  md.push(``);
  for (const tool of toolUsage.byFrequency.slice(0, 10)) {
    md.push(`- **${tool.name}:** ${tool.calls} calls, ${(tool.failureRate * 100).toFixed(1)}% failure rate`);
  }
  md.push(``);

  if (toolUsage.highFailureRate.length > 0) {
    md.push(`### Tools with High Failure Rate (>10%)`);
    md.push(``);
    for (const tool of toolUsage.highFailureRate) {
      md.push(`- **${tool.name}:** ${(tool.failureRate * 100).toFixed(1)}% failures (${tool.failures}/${tool.calls})`);
    }
    md.push(``);
  }

  // Optimization opportunities
  const optimizations = generateOptimizations(failurePatterns, toolUsage, results);

  md.push(`## Refinement Recommendations`);
  md.push(``);

  for (const opt of optimizations) {
    const priorityEmoji = opt.priority === "high" ? "🔴" : opt.priority === "medium" ? "🟡" : "🟢";

    md.push(`### ${priorityEmoji} [${opt.priority.toUpperCase()}] ${opt.title}`);
    md.push(``);
    md.push(opt.description);
    md.push(``);

    if (Object.keys(opt.impact).length > 0) {
      md.push(`**Expected Impact:**`);
      if (opt.impact.quality) md.push(`- Quality: ${opt.impact.quality}`);
      if (opt.impact.cost) md.push(`- Cost: ${opt.impact.cost}`);
      if (opt.impact.latency) md.push(`- Latency: ${opt.impact.latency}`);
      md.push(``);
    }

    md.push(`**Implementation Steps:**`);
    for (const step of opt.implementation) {
      md.push(`1. ${step}`);
    }
    md.push(``);
  }

  return md.join("\n");
}

function main() {
  const resultsArg = process.argv.find(arg => arg.startsWith("--results="))?.split("=")[1];
  if (!resultsArg) {
    console.error("Usage: npx tsx scripts/analyze-benchmark-results.ts --results=file1.json,file2.json");
    process.exit(1);
  }

  const benchmarkDir = join(process.cwd(), "docs", "architecture", "benchmarks");
  const resultPaths = resultsArg.split(",").map(p =>
    p.includes("/") || p.includes("\\") ? p : join(benchmarkDir, p)
  );

  const results = resultPaths.map(loadBenchmarkResult);

  const report = generateReport(results);
  console.log(report);
}

main();
