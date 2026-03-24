/**
 * benchmarkTools.ts — MCP tools for running longitudinal benchmarks.
 *
 * Tools:
 *   run_benchmark_batch — Execute N=1/N=5/N=10/N=100 benchmark
 *   get_benchmark_history — View historical benchmark results
 *   get_benchmark_report — Get a specific batch report
 */

import type { McpTool } from "../types.js";
import { runBenchmarkBatch, getBenchmarkHistory } from "./benchmarkRunner.js";
import { getDb } from "../db.js";
import { PASS_GATES } from "./longitudinalTypes.js";

export const benchmarkTools: McpTool[] = [
  {
    name: "run_benchmark_batch",
    description:
      "Run a longitudinal benchmark batch. N=1 is a smoke test (1 founder, 1 session). " +
      "N=5 tests role generalization (5 users, different lenses). N=10 tests session stability " +
      "(5 users × 2 sessions). N=100 tests compounding over time (10 users × 10 sessions). " +
      "Returns a full batch report with RCA, PRR, and pass/fail gates.",
    inputSchema: {
      type: "object",
      properties: {
        layer: {
          type: "string",
          enum: ["N1", "N5", "N10", "N100"],
          description: "Benchmark layer: N1 (smoke), N5 (role variance), N10 (session stability), N100 (longitudinal)",
        },
      },
      required: ["layer"],
    },
    handler: async (args: { layer: string }, _extra?: { tools?: McpTool[] }) => {
      const layer = args.layer as "N1" | "N5" | "N10" | "N100";

      // Get tools from the global TOOLSET_MAP
      let tools: McpTool[] = [];
      try {
        const tsReg = await import("../toolsetRegistry.js");
        await tsReg.loadAllToolsets();
        for (const domainTools of Object.values(tsReg.TOOLSET_MAP)) {
          tools.push(...(domainTools as McpTool[]));
        }
      } catch {
        return { error: true, message: "Failed to load tools for benchmark" };
      }

      const report = await runBenchmarkBatch(layer, tools);

      // Check pass/fail gates
      const gates = PASS_GATES[layer];
      let passed = true;
      const failures: string[] = [];

      if (layer === "N1" && report.n1Score) {
        for (const [key, expected] of Object.entries(gates)) {
          if (report.n1Score[key as keyof typeof report.n1Score] !== expected) {
            passed = false;
            failures.push(`N1.${key}: expected ${expected}, got ${report.n1Score[key as keyof typeof report.n1Score]}`);
          }
        }
      }

      if (layer === "N100") {
        const g = gates as typeof PASS_GATES.N100;
        if (report.metrics.rca < g.rca) { passed = false; failures.push(`RCA ${(report.metrics.rca * 100).toFixed(0)}% < ${g.rca * 100}% threshold`); }
        if (report.metrics.prr < g.prr) { passed = false; failures.push(`PRR ${(report.metrics.prr * 100).toFixed(0)}% < ${g.prr * 100}% threshold`); }
        if (report.metrics.falseAlertRate > g.falseAlertRate) { passed = false; failures.push(`False alert rate ${(report.metrics.falseAlertRate * 100).toFixed(0)}% > ${g.falseAlertRate * 100}% threshold`); }
      }

      return {
        batchId: report.batchId,
        layer,
        passed,
        failures,
        totalSessions: report.totalSessions,
        rolesCovered: report.rolesCovered.length,
        coreLoops: `${report.coreLoopsCovered}/${report.coreLoopsTotal}`,
        metrics: {
          rca: `${(report.metrics.rca * 100).toFixed(0)}%`,
          prr: `${(report.metrics.prr * 100).toFixed(0)}%`,
          contradictionPrecision: `${(report.metrics.contradictionPrecision * 100).toFixed(0)}%`,
          falseAlertRate: `${(report.metrics.falseAlertRate * 100).toFixed(0)}%`,
          suppressionQuality: `${(report.metrics.suppressionQuality * 100).toFixed(0)}%`,
        },
        topRootCause: report.topRecurringRootCause,
        topRegressionRisk: report.topRegressionRisk,
        avgLatencyMs: Math.round(report.runs.reduce((s, r) => s + r.totalLatencyMs, 0) / Math.max(report.runs.length, 1)),
      };
    },
  },

  {
    name: "get_benchmark_history",
    description:
      "View historical benchmark batch results. Shows RCA and PRR trends over time. " +
      "Filter by layer (N1/N5/N10/N100) to see specific benchmark levels.",
    inputSchema: {
      type: "object",
      properties: {
        layer: {
          type: "string",
          enum: ["N1", "N5", "N10", "N100"],
          description: "Filter by benchmark layer (optional)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { layer?: string }) => {
      const history = getBenchmarkHistory(args.layer);
      return {
        totalBatches: history.length,
        batches: history.map((h) => ({
          ...h,
          rca: `${(h.rca * 100).toFixed(0)}%`,
          prr: `${(h.prr * 100).toFixed(0)}%`,
        })),
      };
    },
  },

  {
    name: "get_benchmark_report",
    description:
      "Get the full detailed report for a specific benchmark batch by batchId.",
    inputSchema: {
      type: "object",
      properties: {
        batchId: { type: "string", description: "Batch ID from run_benchmark_batch or get_benchmark_history" },
      },
      required: ["batchId"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { batchId: string }) => {
      const db = getDb();
      const row = db.prepare(`SELECT reportJson FROM benchmark_reports WHERE batchId = ?`).get(args.batchId) as any;
      if (!row) return { error: true, message: `No report found for batchId: ${args.batchId}` };
      return JSON.parse(row.reportJson);
    },
  },
];
