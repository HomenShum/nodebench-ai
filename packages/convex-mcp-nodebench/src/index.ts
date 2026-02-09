#!/usr/bin/env node
/**
 * convex-mcp-nodebench — Convex-Specific MCP Server
 *
 * Applies NodeBench self-instruct diligence patterns to Convex development.
 * Schema audit, function compliance, deployment gates, persistent gotcha DB,
 * and methodology guidance.
 *
 * Data stored in ~/.convex-mcp-nodebench/convex.db
 *
 * Usage:
 *   npx convex-mcp-nodebench          (stdio transport)
 *   npx tsx src/index.ts              (dev mode)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getDb, seedGotchasIfEmpty } from "./db.js";
import { schemaTools } from "./tools/schemaTools.js";
import { functionTools } from "./tools/functionTools.js";
import { deploymentTools } from "./tools/deploymentTools.js";
import { learningTools } from "./tools/learningTools.js";
import { methodologyTools } from "./tools/methodologyTools.js";
import { integrationBridgeTools } from "./tools/integrationBridgeTools.js";
import { cronTools } from "./tools/cronTools.js";
import { componentTools } from "./tools/componentTools.js";
import { httpTools } from "./tools/httpTools.js";
import { CONVEX_GOTCHAS } from "./gotchaSeed.js";
import { REGISTRY } from "./tools/toolRegistry.js";
import { initEmbeddingIndex } from "./tools/embeddingProvider.js";
import type { McpTool } from "./types.js";

// ── All tools ───────────────────────────────────────────────────────

const ALL_TOOLS: McpTool[] = [
  ...schemaTools,
  ...functionTools,
  ...deploymentTools,
  ...learningTools,
  ...methodologyTools,
  ...integrationBridgeTools,
  ...cronTools,
  ...componentTools,
  ...httpTools,
];

const toolMap = new Map<string, McpTool>();
for (const tool of ALL_TOOLS) {
  toolMap.set(tool.name, tool);
}

// ── Server setup ────────────────────────────────────────────────────

const server = new Server(
  {
    name: "convex-mcp-nodebench",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ── Initialize DB + seed gotchas ────────────────────────────────────

getDb();
seedGotchasIfEmpty(CONVEX_GOTCHAS as unknown as Array<{
  key: string;
  content: string;
  category: string;
  severity: string;
  tags: string;
}>);

// ── Background: initialize embedding index for semantic search ───────
const embeddingCorpus = REGISTRY.map((entry) => ({
  name: entry.name,
  text: `${entry.name} ${entry.tags.join(" ")} ${entry.category} ${entry.phase}`,
}));
initEmbeddingIndex(embeddingCorpus).catch(() => {
  /* Embedding init failed — semantic search stays disabled */
});

// ── Tool listing ────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: ALL_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
});

// ── Tool execution ──────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = toolMap.get(name);

  if (!tool) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: `Unknown tool: ${name}`,
            availableTools: ALL_TOOLS.map((t) => t.name),
          }),
        },
      ],
    };
  }

  try {
    const result = await tool.handler(args || {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error.message || String(error),
            tool: name,
          }),
        },
      ],
      isError: true,
    };
  }
});

// ── Start server ────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server is now running on stdio
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
