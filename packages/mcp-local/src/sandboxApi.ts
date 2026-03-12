/**
 * Headless API server for the context sandbox.
 *
 * Exposes sandbox tools as REST endpoints for non-MCP consumers
 * (other agents, CI/CD pipelines, scripts, dashboards).
 *
 * Start: `npx tsx packages/mcp-local/src/sandboxApi.ts`
 * Or via CLI: `npx nodebench-mcp --sandbox-api`
 *
 * Endpoints:
 *   POST /api/sandbox/ingest   — Index content into FTS5
 *   POST /api/sandbox/search   — BM25 search across sandbox
 *   POST /api/sandbox/execute  — Run command + index output
 *   POST /api/sandbox/batch    — Batch commands + queries
 *   GET  /api/sandbox/stats    — Session stats + savings
 *   GET  /api/sandbox/health   — Health check
 */

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { contextSandboxTools } from "./tools/contextSandboxTools.js";

const PORT = parseInt(process.env.NODEBENCH_SANDBOX_PORT || "6277", 10);

// Map tool names to their handlers
const toolMap = new Map(contextSandboxTools.map((t) => [t.name, t.handler]));

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf-8");
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

const ROUTE_MAP: Record<string, { method: string; tool: string }> = {
  "/api/sandbox/ingest": { method: "POST", tool: "sandbox_ingest" },
  "/api/sandbox/search": { method: "POST", tool: "sandbox_search" },
  "/api/sandbox/execute": { method: "POST", tool: "sandbox_execute" },
  "/api/sandbox/batch": { method: "POST", tool: "sandbox_batch" },
  "/api/sandbox/stats": { method: "GET", tool: "sandbox_stats" },
};

const server = createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = req.url?.split("?")[0] || "";

  // Health check
  if (url === "/api/sandbox/health") {
    sendJson(res, 200, { status: "ok", version: "2.30.0", tools: contextSandboxTools.length });
    return;
  }

  const route = ROUTE_MAP[url];
  if (!route) {
    sendJson(res, 404, { error: "Not found", endpoints: Object.keys(ROUTE_MAP) });
    return;
  }

  if (req.method !== route.method) {
    sendJson(res, 405, { error: `Method ${req.method} not allowed. Use ${route.method}.` });
    return;
  }

  const handler = toolMap.get(route.tool);
  if (!handler) {
    sendJson(res, 500, { error: `Tool ${route.tool} not found` });
    return;
  }

  try {
    const args = req.method === "POST" ? await parseBody(req) : {};
    const result = await handler(args);
    sendJson(res, 200, result);
  } catch (err: any) {
    sendJson(res, 500, { error: err.message ?? String(err) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.error(`[nodebench-sandbox-api] Listening on http://127.0.0.1:${PORT}`);
  console.error(`[nodebench-sandbox-api] Endpoints:`);
  for (const [path, { method }] of Object.entries(ROUTE_MAP)) {
    console.error(`  ${method.padEnd(5)} ${path}`);
  }
  console.error(`  GET   /api/sandbox/health`);
});

export { server };
