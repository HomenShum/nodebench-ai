#!/usr/bin/env node
/**
 * Minimal HTTP JSON-RPC 2.0 front for core_agent_server tools.
 * Requires CONVEX_BASE_URL and CONVEX_ADMIN_KEY for backend storage.
 */

import http from "http";
import { planningTools } from "./tools/planningTools.js";
import { memoryTools } from "./tools/memoryTools.js";

const allTools = [...planningTools, ...memoryTools];
const HOST = process.env.MCP_HTTP_HOST || "127.0.0.1";
const PORT = process.env.PORT ? Number(process.env.PORT) : 4001;
const TOKEN = process.env.MCP_HTTP_TOKEN;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: any };
};

function respond(res: http.ServerResponse, status: number, payload: any) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, x-mcp-token",
    });
    res.end();
    return;
  }

  if (req.method !== "POST") {
    respond(res, 405, { error: "Method not allowed" });
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));

  req.on("end", async () => {
    try {
      const parsed: JsonRpcRequest = JSON.parse(body || "{}");
      const { id = null, method, params } = parsed;

      if (parsed.jsonrpc !== "2.0" || method !== "tools/call") {
        respond(res, 400, { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request" } });
        return;
      }

      if (TOKEN) {
        const supplied = req.headers["x-mcp-token"] as string | undefined;
        if (!supplied || supplied !== TOKEN) {
          respond(res, 401, { jsonrpc: "2.0", id, error: { code: -32001, message: "Unauthorized" } });
          return;
        }
      }

      const toolName = params?.name;
      const args = params?.arguments ?? {};
      const tool = allTools.find((t) => t.name === toolName);
      if (!tool) {
        respond(res, 404, { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${toolName}` } });
        return;
      }

      try {
        const result = await tool.handler(args);
        respond(res, 200, { jsonrpc: "2.0", id, result });
      } catch (err: any) {
        respond(res, 500, {
          jsonrpc: "2.0",
          id,
          error: { code: -32000, message: err?.message || "Internal error" },
        });
      }
    } catch {
      respond(res, 400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    }
  });
});

server.listen(PORT, HOST, () => {
  console.error(`core_agent_server HTTP MCP front listening on http://${HOST}:${PORT}`);
});
