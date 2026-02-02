/**
 * Research & Intelligence tools for external agents.
 * Proxies Convex queries/actions from research, forYouFeed, dashboard, and dossier domains.
 */

import { convexQuery, convexAction } from "../convexClient.js";

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: any) => Promise<unknown>;
};

export const researchTools: McpTool[] = [
  {
    name: "getForYouFeed",
    description:
      "Get the personalized For You feed with ranked research items, funding events, and industry signals. Returns verification-tagged items grouped by date.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max items to return (default 20)",
        },
      },
    },
    handler: async (args) => {
      return await convexQuery("domains/research/forYouFeed:getPublicForYouFeed", {
        limit: args.limit,
      });
    },
  },
  {
    name: "getLatestDashboard",
    description:
      "Get the latest research dashboard snapshot with metrics on deal flow, entity coverage, verification health, and model costs.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/research/dashboardQueries:getLatestDashboardSnapshot",
        {}
      );
    },
  },
  {
    name: "getTrendingRepos",
    description:
      "Get trending GitHub repositories tracked by NodeBench AI, sorted by growth velocity.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max repos to return (default 10)",
        },
      },
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/research/githubExplorer:getTrendingRepos",
        { limit: args.limit }
      );
    },
  },
  {
    name: "getFastestGrowingRepos",
    description:
      "Get fastest-growing GitHub repositories by star velocity over the past week.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max repos to return (default 10)",
        },
      },
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/research/githubExplorer:getFastestGrowingRepos",
        { limit: args.limit }
      );
    },
  },
  {
    name: "getLatestPublicDossier",
    description:
      "Get the latest public company/industry dossier with competitive analysis and market positioning.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/research/publicDossierQueries:getLatestPublicDossier",
        {}
      );
    },
  },
  {
    name: "getDealFlow",
    description:
      "Get the current deal flow pipeline with funding events, company data, and investment signals.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/research/dealFlowQueries:getDealFlow",
        {}
      );
    },
  },
  {
    name: "getEntityInsights",
    description:
      "Get deep entity insights for a company or person, including funding, key people, product pipeline, and persona-specific hooks (banker, VC, CTO, founder).",
    inputSchema: {
      type: "object",
      properties: {
        entityName: {
          type: "string",
          description: "Name of the entity to research",
        },
        entityType: {
          type: "string",
          enum: ["company", "person"],
          description: "Type of entity",
        },
        forceRefresh: {
          type: "boolean",
          description: "Force fresh LLM analysis (default false)",
        },
      },
      required: ["entityName", "entityType"],
    },
    handler: async (args) => {
      return await convexAction(
        "domains/knowledge/entityInsights:getEntityInsights",
        {
          entityName: args.entityName,
          entityType: args.entityType,
          forceRefresh: args.forceRefresh ?? false,
        }
      );
    },
  },
  {
    name: "getSignalTimeseries",
    description:
      "Get time-series signal data for research metrics like funding volume, entity mentions, or verification health over time.",
    inputSchema: {
      type: "object",
      properties: {
        signalType: {
          type: "string",
          description: "Type of signal to query",
        },
        days: {
          type: "number",
          description: "Number of days to look back (default 30)",
        },
      },
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/research/signalTimeseries:getSignalTimeseries",
        { signalType: args.signalType, days: args.days }
      );
    },
  },
];
