/**
 * Verification pipeline tools for external agents.
 * Proxies Convex queries from the verification domain (claims, facts, calibration).
 */

import { convexQuery } from "../convexClient.js";
import type { McpTool } from "./researchTools.js";

export const verificationTools: McpTool[] = [
  {
    name: "getVerificationSummary",
    description:
      "Get a summary of verification health across all tracked facts. Returns counts by verdict (VERIFIED, CORROBORATED, UNVERIFIED, CONTRADICTED, OUTDATED, INSUFFICIENT) and overall trust score.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/verification/claimVerifications:getVerificationSummary",
        {}
      );
    },
  },
  {
    name: "getVerificationsForFact",
    description:
      "Get all verification attempts for a specific fact, including source citations, verdicts, and confidence scores.",
    inputSchema: {
      type: "object",
      properties: {
        factId: {
          type: "string",
          description: "Convex ID of the fact to check",
        },
      },
      required: ["factId"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/verification/claimVerifications:getVerificationsForFact",
        { factId: args.factId }
      );
    },
  },
  {
    name: "getArtifactsWithHealth",
    description:
      "Get source artifacts annotated with verification health status. Shows which sources are verified, stale, or contradicted.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/verification/claimVerifications:getArtifactsWithHealth",
        {}
      );
    },
  },
  {
    name: "getCalibrationStats",
    description:
      "Get calibration statistics for the verification pipeline, including accuracy, F1 scores, and inter-annotator agreement.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/verification/calibration:getCalibrationStats",
        {}
      );
    },
  },
  {
    name: "getFactsByRun",
    description:
      "Get all extracted facts from a specific verification run (e.g., from a daily brief or narrative pipeline run).",
    inputSchema: {
      type: "object",
      properties: {
        runId: {
          type: "string",
          description: "ID of the verification run",
        },
      },
      required: ["runId"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/verification/facts:getFactsByRun",
        { runId: args.runId }
      );
    },
  },
  {
    name: "getFactById",
    description:
      "Get a single fact by ID with its full context: source, extracted claim, linked artifacts, and verification status.",
    inputSchema: {
      type: "object",
      properties: {
        factId: {
          type: "string",
          description: "Convex ID of the fact",
        },
      },
      required: ["factId"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/verification/facts:getFactById",
        { factId: args.factId }
      );
    },
  },
  {
    name: "getSloMetricsSummary",
    description:
      "Get SLO metrics for verification pipeline performance: latency percentiles, throughput, error rates.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/verification/calibration:getSloMetricsSummary",
        {}
      );
    },
  },
];
