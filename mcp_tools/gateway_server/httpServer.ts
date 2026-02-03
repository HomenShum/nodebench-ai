#!/usr/bin/env node
/**
 * NodeBench AI Gateway MCP Server
 *
 * HTTP JSON-RPC 2.0 server that exposes research, narrative, verification,
 * and knowledge graph tools to external MCP agents.
 *
 * Requires:
 *   CONVEX_URL        – Convex deployment URL (e.g. https://xxx.convex.cloud)
 *   MCP_SECRET        – Shared secret for Convex-side dispatcher auth
 *   MCP_HTTP_TOKEN    – (optional) Bearer token for MCP client auth
 */

import http from "http";
import { researchTools } from "./tools/researchTools.js";
import { narrativeTools } from "./tools/narrativeTools.js";
import { verificationTools } from "./tools/verificationTools.js";
import { knowledgeTools } from "./tools/knowledgeTools.js";
import { documentTools } from "./tools/documentTools.js";

const allTools = [
  ...researchTools,
  ...narrativeTools,
  ...verificationTools,
  ...knowledgeTools,
  ...documentTools,
];

const HOST = process.env.MCP_HTTP_HOST || "0.0.0.0";
const PORT = process.env.PORT ? Number(process.env.PORT) : 4002;
const TOKEN = process.env.MCP_HTTP_TOKEN;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: any };
};

function respond(res: http.ServerResponse, status: number, payload: any) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(payload));
}

function getSuppliedToken(req: http.IncomingMessage): string | undefined {
  const headerToken = req.headers["x-mcp-token"] as string | undefined;
  if (headerToken) return headerToken;
  const auth = req.headers["authorization"];
  if (!auth) return undefined;
  const authValue = Array.isArray(auth) ? auth[0] : auth;
  if (!authValue) return undefined;
  if (!authValue.toLowerCase().startsWith("bearer ")) return undefined;
  return authValue.slice("bearer ".length);
}

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    respond(res, 200, {
      status: "ok",
      service: "nodebench-mcp-gateway",
      tools: allTools.length,
      categories: ["research", "narrative", "verification", "knowledge", "documents"],
    });
    return;
  }

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Accept, Authorization, x-mcp-token",
    });
    res.end();
    return;
  }

  if (req.method !== "POST") {
    respond(res, 405, { error: "Method not allowed" });
    return;
  }

  let body = "";
  req.on("data", (chunk: Buffer) => (body += chunk));

  req.on("end", async () => {
    try {
      const parsed: JsonRpcRequest = JSON.parse(body || "{}");
      const { id = null, method, params } = parsed;

      if (parsed.jsonrpc !== "2.0" || typeof method !== "string") {
        respond(res, 400, {
          jsonrpc: "2.0",
          id,
          error: { code: -32600, message: "Invalid Request" },
        });
        return;
      }

      // Token auth
      if (TOKEN) {
        const supplied = getSuppliedToken(req);
        if (!supplied || supplied !== TOKEN) {
          respond(res, 401, {
            jsonrpc: "2.0",
            id,
            error: { code: -32001, message: "Unauthorized" },
          });
          return;
        }
      }

      // MCP initialize
      if (method === "initialize") {
        respond(res, 200, {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2025-03-26",
            capabilities: { tools: {}, resources: {} },
            serverInfo: {
              name: "nodebench-mcp-gateway",
              version: "1.0.0",
            },
          },
        });
        return;
      }

      // MCP tools/list
      if (method === "tools/list") {
        respond(res, 200, {
          jsonrpc: "2.0",
          id,
          result: {
            tools: allTools.map((t) => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            })),
          },
        });
        return;
      }

      // MCP tools/call
      if (method === "tools/call") {
        const toolName = params?.name;
        const args = params?.arguments ?? {};
        const tool = allTools.find((t) => t.name === toolName);
        if (!tool) {
          respond(res, 404, {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Tool not found: ${toolName}`,
            },
          });
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
        return;
      }

      respond(res, 404, {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
    } catch {
      respond(res, 400, {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      });
    }
  });
});

server.listen(PORT, HOST, () => {
  console.error(
    `nodebench-mcp-gateway listening on http://${HOST}:${PORT} (${allTools.length} tools)`
  );
});
