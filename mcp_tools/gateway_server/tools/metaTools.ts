/**
 * Meta-tools for tool discovery and agent routing.
 */

import type { McpTool } from "./researchTools.js";

/**
 * Create meta-tools that reference the full tool list.
 * Must be called after all tool arrays are assembled.
 */
export function createMetaTools(allTools: McpTool[]): McpTool[] {
  return [
    {
      name: "findTools",
      description:
        "Search available tools by keyword or capability description. Returns matching tool names and descriptions. Use this to discover which tools are available for a task.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "What you want to do (e.g. 'find stock prices', 'create a document', 'search the web')",
          },
          category: {
            type: "string",
            enum: [
              "research",
              "narrative",
              "verification",
              "knowledge",
              "documents",
              "financial",
              "planning",
              "memory",
              "search",
            ],
            description: "Optional category filter",
          },
        },
        required: ["query"],
      },
      handler: async (args) => {
        const query = (args.query ?? "").toLowerCase();
        const words = query.split(/\s+/).filter(Boolean);

        const scored = allTools
          .filter((t) => t.name !== "findTools")
          .map((t) => {
            const text = `${t.name} ${t.description}`.toLowerCase();
            const hits = words.filter((w: string) => text.includes(w)).length;
            return { name: t.name, description: t.description, hits };
          })
          .filter((t) => t.hits > 0)
          .sort((a, b) => b.hits - a.hits);

        return {
          query: args.query,
          matches: scored.length,
          tools: scored.slice(0, 15).map((t) => ({
            name: t.name,
            description: t.description,
          })),
        };
      },
    },
  ];
}
