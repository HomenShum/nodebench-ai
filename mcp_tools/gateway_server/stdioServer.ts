#!/usr/bin/env node
/**
 * NodeBench AI MCP Server — stdio transport
 *
 * Spawned as a local process by MCP clients (Cursor, Claude Desktop, etc.).
 * Reads JSON-RPC from stdin, writes to stdout. No HTTP server involved.
 *
 * Requires env vars:
 *   CONVEX_URL   – Convex HTTP actions URL (https://xxx.convex.site)
 *   MCP_SECRET   – Shared secret for Convex-side dispatcher auth
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { researchTools } from "./tools/researchTools.js";
import { narrativeTools } from "./tools/narrativeTools.js";
import { verificationTools } from "./tools/verificationTools.js";
import { knowledgeTools } from "./tools/knowledgeTools.js";
import { documentTools } from "./tools/documentTools.js";
import { planningTools } from "./tools/planningTools.js";
import { memoryTools } from "./tools/memoryTools.js";
import { searchTools } from "./tools/searchTools.js";
import { financialTools } from "./tools/financialTools.js";
import { createMetaTools } from "./tools/metaTools.js";

const domainTools = [
  ...researchTools,
  ...narrativeTools,
  ...verificationTools,
  ...knowledgeTools,
  ...documentTools,
  ...planningTools,
  ...memoryTools,
  ...searchTools,
  ...financialTools,
];
const allTools = [...domainTools, ...createMetaTools(domainTools)];

const server = new McpServer({
  name: "nodebench-mcp-unified",
  version: "1.0.0",
});

// Register every tool from the shared tool arrays.
// McpServer.tool() with a raw JSON schema object (no zod) works since SDK ^1.0.4.
for (const tool of allTools) {
  server.tool(
    tool.name,
    tool.description,
    tool.inputSchema as any,
    async (args: any) => {
      try {
        const result = await tool.handler(args);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          isError: false,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: err?.message || "Internal error" }],
          isError: true,
        };
      }
    }
  );
}

// Connect via stdio (stdin/stdout)
const transport = new StdioServerTransport();
await server.connect(transport);

// Log to stderr (stdout is reserved for MCP protocol)
console.error(`nodebench-mcp-unified stdio server ready (${allTools.length} tools)`);
