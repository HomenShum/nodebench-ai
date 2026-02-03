/**
 * Search tools — fusion search and quick search via Convex dispatcher.
 * Ported from python-mcp-servers/research/.
 */

import { callGateway } from "../convexClient.js";
import type { McpTool } from "./researchTools.js";

export const searchTools: McpTool[] = [
  {
    name: "quickSearch",
    description:
      "Execute a quick multi-source search query. Returns ranked results from web, news, and academic sources.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        maxResults: {
          type: "number",
          description: "Maximum number of results (default 10)",
        },
      },
      required: ["query"],
    },
    handler: async (args) => {
      return await callGateway("quickSearch", {
        query: args.query,
        maxResults: args.maxResults,
      });
    },
  },
  {
    name: "fusionSearch",
    description:
      "Multi-source fusion search with reranking. Modes: fast (single source), balanced (2-3 sources), comprehensive (all sources with reranking).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        mode: {
          type: "string",
          enum: ["fast", "balanced", "comprehensive"],
          description: "Search mode (default: balanced)",
        },
      },
      required: ["query"],
    },
    handler: async (args) => {
      return await callGateway("fusionSearch", {
        query: args.query,
        mode: args.mode,
      });
    },
  },
  {
    name: "getMigrationStats",
    description:
      "Get model migration statistics for chat threads and messages.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await callGateway("getMigrationStats", {});
    },
  },
];
