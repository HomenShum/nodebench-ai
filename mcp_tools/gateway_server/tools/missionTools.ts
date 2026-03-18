/**
 * Mission Orchestration MCP tools — expose mission lifecycle to external agents.
 * Proxies Convex queries/mutations from domains/missions/missionOrchestrator.
 */

import { convexQuery, convexMutation } from "../convexClient.js";

import type { McpTool } from "./researchTools.js";

export const missionTools: McpTool[] = [
  {
    name: "getMissionDashboard",
    description:
      "Get the mission control dashboard: active missions, judging queue, sniff checks, and recent completions.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/missions/missionOrchestrator:getMissionDashboard",
        {},
      );
    },
  },
  {
    name: "getMission",
    description: "Get a specific mission by its Convex ID.",
    inputSchema: {
      type: "object",
      properties: {
        missionId: { type: "string", description: "Convex mission ID" },
      },
      required: ["missionId"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/missions/missionOrchestrator:getMission",
        { missionId: args.missionId },
      );
    },
  },
  {
    name: "getMissionByKey",
    description: "Look up a mission by its unique missionKey string.",
    inputSchema: {
      type: "object",
      properties: {
        missionKey: { type: "string", description: "Unique mission key" },
      },
      required: ["missionKey"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/missions/missionOrchestrator:getMissionByKey",
        { missionKey: args.missionKey },
      );
    },
  },
  {
    name: "getTasksForMission",
    description:
      "Get all task plans for a mission, showing execution status, dependencies, and assigned agents.",
    inputSchema: {
      type: "object",
      properties: {
        missionId: { type: "string", description: "Convex mission ID" },
      },
      required: ["missionId"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/missions/missionOrchestrator:getTasksForMission",
        { missionId: args.missionId },
      );
    },
  },
  {
    name: "getPendingSniffChecks",
    description:
      "Get all pending human-in-the-loop sniff checks awaiting review.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/missions/missionOrchestrator:getPendingSniffChecks",
        {},
      );
    },
  },
  {
    name: "createMission",
    description:
      "Create a new mission with title, type, success criteria, output contract, and budget.",
    inputSchema: {
      type: "object",
      properties: {
        missionKey: { type: "string", description: "Unique mission key" },
        title: { type: "string", description: "Mission title" },
        description: { type: "string", description: "Mission description" },
        missionType: {
          type: "string",
          enum: [
            "investigation",
            "company_direction",
            "repo_shift",
            "document_enrichment",
            "app_building",
            "operational_monitor",
            "custom",
          ],
        },
        successCriteria: {
          type: "array",
          items: {
            type: "object",
            properties: {
              criterion: { type: "string" },
              verifiabilityTier: {
                type: "string",
                enum: ["machine_checkable", "expert_checkable", "human_sniff_check"],
              },
            },
            required: ["criterion", "verifiabilityTier"],
          },
        },
        budgetTokens: { type: "number", description: "Token budget (optional)" },
        budgetCostUsd: { type: "number", description: "Cost budget in USD (optional)" },
      },
      required: ["missionKey", "title", "description", "missionType", "successCriteria"],
    },
    handler: async (args) => {
      return await convexMutation(
        "domains/missions/missionOrchestrator:createMission",
        args,
      );
    },
  },
  {
    name: "claimTask",
    description:
      "Claim a pending task for execution. Returns the task if successful, null if already claimed or dependencies not met.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Convex task plan ID" },
        agentId: { type: "string", description: "ID of the claiming agent" },
      },
      required: ["taskId", "agentId"],
    },
    handler: async (args) => {
      return await convexMutation(
        "domains/missions/missionOrchestrator:claimTask",
        args,
      );
    },
  },
  {
    name: "resolveSniffCheck",
    description:
      "Resolve a pending sniff check with approved, rejected, or needs_revision.",
    inputSchema: {
      type: "object",
      properties: {
        sniffCheckId: { type: "string", description: "Convex sniff check ID" },
        decision: {
          type: "string",
          enum: ["approved", "rejected", "needs_revision"],
        },
        reviewerNotes: { type: "string", description: "Optional reviewer notes" },
        reviewedBy: { type: "string", description: "Reviewer identifier" },
      },
      required: ["sniffCheckId", "decision"],
    },
    handler: async (args) => {
      return await convexMutation(
        "domains/missions/missionOrchestrator:resolveSniffCheck",
        args,
      );
    },
  },
];
