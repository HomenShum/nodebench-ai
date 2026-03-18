/**
 * Eval & Evolution MCP tools — expose eval engine and hygiene operations.
 * Proxies Convex queries/mutations from domains/evaluation/operations
 * and domains/operations/postExecutionHygiene.
 */

import { convexQuery, convexMutation } from "../convexClient.js";

import type { McpTool } from "./researchTools.js";

export const evalTools: McpTool[] = [
  // --- Evolution Dashboard ---
  {
    name: "getEvolutionDashboard",
    description:
      "Get the evolution dashboard: latest canary, pending routing recommendations, recent comparisons, and error summary.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/evaluation/operations:getEvolutionDashboard",
        {},
      );
    },
  },

  // --- Canary Runs ---
  {
    name: "getCanaryTrend",
    description:
      "Get canary benchmark trend: throughput score, quality score, verdict, and delta over time.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of runs (default 20)" },
      },
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/evaluation/operations:getCanaryTrend",
        { limit: args.limit },
      );
    },
  },
  {
    name: "getCanaryRegressions",
    description: "Get recent canary runs that detected regressions.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/evaluation/operations:getCanaryRegressions",
        {},
      );
    },
  },
  {
    name: "recordCanaryRun",
    description: "Record a new canary benchmark run with throughput and quality scores.",
    inputSchema: {
      type: "object",
      properties: {
        runKey: { type: "string" },
        commitHash: { type: "string" },
        fixtureCount: { type: "number" },
        throughputScore: { type: "number" },
        qualityScore: { type: "number" },
        throughputMetrics: { type: "object" },
        qualityMetrics: { type: "object" },
        regressions: { type: "array", items: { type: "string" } },
        wallClockMs: { type: "number" },
        costUsd: { type: "number" },
      },
      required: [
        "runKey", "fixtureCount", "throughputScore", "qualityScore",
        "throughputMetrics", "qualityMetrics", "regressions", "wallClockMs", "costUsd",
      ],
    },
    handler: async (args) => {
      return await convexMutation(
        "domains/evaluation/operations:recordCanaryRun",
        args,
      );
    },
  },

  // --- Model Cost Analytics ---
  {
    name: "getModelCostSummary",
    description:
      "Get cost, token, latency, and error summary for a specific model over N days.",
    inputSchema: {
      type: "object",
      properties: {
        model: { type: "string", description: "Model identifier" },
        sinceDaysAgo: { type: "number", description: "Lookback days (default 7)" },
      },
      required: ["model"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/evaluation/operations:getModelCostSummary",
        args,
      );
    },
  },

  // --- Routing Recommendations ---
  {
    name: "getPendingRoutingRecommendations",
    description: "Get pending model routing recommendations from the eval engine.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/evaluation/operations:getPendingRecommendations",
        {},
      );
    },
  },
  {
    name: "resolveRoutingRecommendation",
    description: "Accept, reject, or expire a routing recommendation.",
    inputSchema: {
      type: "object",
      properties: {
        recommendationId: { type: "string" },
        status: { type: "string", enum: ["accepted", "rejected", "expired"] },
      },
      required: ["recommendationId", "status"],
    },
    handler: async (args) => {
      return await convexMutation(
        "domains/evaluation/operations:resolveRoutingRecommendation",
        args,
      );
    },
  },

  // --- Baseline Comparisons ---
  {
    name: "getComparisonTrend",
    description:
      "Get baseline comparison trend for a benchmark family (investigation, canary, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        benchmarkFamily: {
          type: "string",
          enum: [
            "investigation", "company_direction", "repo_shift",
            "document_enrichment", "app_building", "operational", "canary", "custom",
          ],
        },
        limit: { type: "number" },
      },
      required: ["benchmarkFamily"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/evaluation/operations:getComparisonTrend",
        args,
      );
    },
  },

  // --- Hygiene ---
  {
    name: "getHygieneReport",
    description:
      "Get post-execution hygiene report: stale missions, pending sniff checks, error rates.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/operations/postExecutionHygiene:getHygieneReport",
        {},
      );
    },
  },
  {
    name: "runSpotFixScan",
    description:
      "Scan for common operational issues: stale missions, blocked tasks with met deps, old sniff checks.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/operations/postExecutionHygiene:runSpotFixScan",
        {},
      );
    },
  },
  {
    name: "auditTelemetry",
    description:
      "Audit inference call telemetry for anomalies: cost spikes, latency outliers, zero-cost suspicious calls.",
    inputSchema: {
      type: "object",
      properties: {
        sinceDaysAgo: { type: "number", description: "Lookback days (default 1)" },
      },
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/operations/postExecutionHygiene:auditTelemetry",
        args,
      );
    },
  },
];
