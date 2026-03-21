/**
 * NodeBench Server — Express + WebSocket MCP Gateway + Voice Server
 *
 * Hosts:
 *   - MCP Gateway WebSocket at /mcp (remote tool access for Claude Code, Cursor, OpenClaw)
 *   - Voice session routes at /voice (OpenAI Realtime API WebRTC sessions)
 *   - Health check at /mcp/health
 *   - Root health at /health
 *
 * The MCP gateway dynamically loads all tools from the MCP local package
 * and serves them over WebSocket using JSON-RPC 2.0 (MCP wire protocol).
 *
 * Usage:
 *   npx tsx server/index.ts [--port 3100] [--preset full]
 */

import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { createMcpGateway, type McpGatewayConfig } from "./mcpGateway.js";
import { getMemoryStore, generateApiKey, hashPrefix, type ApiKeyRecord } from "./mcpAuth.js";
import type { McpTool } from "../packages/mcp-local/src/types.js";
import { createSessionRouter } from "./routes/session.js";

// ── CLI argument parsing ──────────────────────────────────────────────────

const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const PORT = portIdx >= 0 && args[portIdx + 1] ? parseInt(args[portIdx + 1], 10) : 3100;

// ── Tool loading ──────────────────────────────────────────────────────────

async function loadTools(): Promise<McpTool[]> {
  try {
    // Dynamic import of the toolset registry to get all available tools
    const { TOOLSET_MAP } = await import("../packages/mcp-local/src/toolsetRegistry.js");
    const allTools: McpTool[] = Object.values(TOOLSET_MAP).flat() as McpTool[];
    console.log(`[mcp-gateway] Loaded ${allTools.length} tools from ${Object.keys(TOOLSET_MAP).length} toolsets`);
    return allTools;
  } catch (err) {
    console.error("[mcp-gateway] Failed to load tools:", err);
    return [];
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const app = express();

  // CORS for HTTP endpoints
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type"],
    }),
  );

  app.use(express.json());

  // Load MCP tools
  const tools = await loadTools();

  if (tools.length === 0) {
    console.warn("[mcp-gateway] WARNING: No tools loaded — gateway will serve empty tool list");
  }

  // ── Seed a dev key if NODEBENCH_DEV_KEY is set ──────────────────────

  if (process.env.NODEBENCH_DEV_KEY) {
    console.log("[mcp-gateway] Dev mode: seeding in-memory API key from NODEBENCH_DEV_KEY");
    // The dev key is used as-is; we store its hash in the memory store
    const { createHash } = await import("node:crypto");
    const kHash = createHash("sha256").update(process.env.NODEBENCH_DEV_KEY).digest("hex");
    const prefix = hashPrefix(kHash);
    const store = getMemoryStore();
    store.set(prefix, {
      keyHash: kHash,
      keyHashPrefix: prefix,
      userId: "dev-user",
      permissions: ["tools:read", "tools:execute"],
      rateLimits: { perMinute: 100, perDay: 10_000 },
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      revokedAt: null,
    });
  }

  // ── Create MCP Gateway ──────────────────────────────────────────────

  const gatewayConfig: McpGatewayConfig = {
    tools,
    // In production, wire keyLookup to Convex:
    // keyLookup: async (prefix) => { /* call Convex internalQuery */ },
    // telemetryEmitter: async (telemetry) => { /* call Convex internalMutation */ },
    corsOrigins: ["*"],
  };

  const gateway = createMcpGateway(gatewayConfig);

  // ── HTTP routes ─────────────────────────────────────────────────────

  // Root health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "nodebench-server",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // MCP gateway health check
  app.get("/mcp/health", (req, res) => {
    gateway.healthHandler(req, res);
  });

  // MCP gateway info
  app.get("/mcp/info", (_req, res) => {
    res.json({
      name: "nodebench-mcp-gateway",
      version: "1.0.0",
      protocol: "MCP over WebSocket (JSON-RPC 2.0)",
      tools: gateway.getToolCount(),
      connections: gateway.getSessionCount(),
      endpoint: "wss://api.nodebenchai.com/mcp",
      auth: "Bearer nb_key_... (in Authorization header or ?token= query param)",
      docs: "https://docs.nodebenchai.com/mcp-gateway",
    });
  });

  // Dev-only: generate a temporary API key (disable in production)
  if (process.env.NODE_ENV !== "production") {
    app.post("/mcp/dev/generate-key", (req, res) => {
      const userId = (req.body as { userId?: string })?.userId ?? "dev-user";
      const { rawKey, keyHash, keyHashPrefix } = generateApiKey();
      const store = getMemoryStore();
      const record: ApiKeyRecord = {
        keyHash,
        keyHashPrefix,
        userId,
        permissions: ["tools:read", "tools:execute"],
        rateLimits: { perMinute: 100, perDay: 10_000 },
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        revokedAt: null,
      };
      store.set(keyHashPrefix, record);
      res.json({
        key: rawKey,
        message: "Store this key securely — it will not be shown again.",
        usage: `claude mcp add nodebench --transport websocket ws://localhost:${PORT}/mcp --header "Authorization: Bearer ${rawKey}"`,
      });
    });
  }

  // ── Voice session routes ───────────────────────────────────────────

  app.use("/voice", createSessionRouter());

  // ── Create HTTP server & wire WebSocket upgrade ─────────────────────

  const httpServer = createServer(app);

  httpServer.on("upgrade", (req, socket, head) => {
    const pathname = new URL(
      req.url ?? "/",
      `http://${req.headers.host ?? "localhost"}`,
    ).pathname;

    if (pathname === "/mcp") {
      gateway.handleUpgrade(req, socket, head);
    } else {
      // Reject non-MCP upgrade requests
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
    }
  });

  // ── Start server ────────────────────────────────────────────────────

  httpServer.listen(PORT, () => {
    console.log(`[nodebench-server] Listening on port ${PORT}`);
    console.log(`[nodebench-server] MCP Gateway WebSocket: ws://localhost:${PORT}/mcp`);
    console.log(`[nodebench-server] Health: http://localhost:${PORT}/mcp/health`);
    console.log(`[nodebench-server] Voice API: http://localhost:${PORT}/voice/session`);
    console.log(`[nodebench-server] Tools available: ${gateway.getToolCount()}`);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[nodebench-server] Dev key gen: POST http://localhost:${PORT}/mcp/dev/generate-key`);
    }
  });

  // ── Graceful shutdown ───────────────────────────────────────────────

  const shutdown = () => {
    console.log("\n[nodebench-server] Shutting down...");
    httpServer.close(() => {
      console.log("[nodebench-server] HTTP server closed");
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[nodebench-server] Fatal error:", err);
  process.exit(1);
});
