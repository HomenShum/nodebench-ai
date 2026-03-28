import cors from "cors";
import express from "express";
import Database from "better-sqlite3";
import type { McpTool } from "../../packages/mcp-local/src/types.js";
import { entityEnrichmentTools } from "../../packages/mcp-local/src/tools/entityEnrichmentTools.js";
import { founderLocalPipelineTools } from "../../packages/mcp-local/src/tools/founderLocalPipeline.js";
import { reconTools } from "../../packages/mcp-local/src/tools/reconTools.js";
import { webTools } from "../../packages/mcp-local/src/tools/webTools.js";
import { createSearchRouter } from "../routes/search.js";
import { createSharedContextRouter } from "../routes/sharedContext.js";
import { SyncBridgeServer } from "../syncBridge.js";

if (!process.env.CONVEX_URL && process.env.VITE_CONVEX_URL) {
  process.env.CONVEX_URL = process.env.VITE_CONVEX_URL;
}

// Keep better-sqlite3 in the traced serverless bundle for shared-context storage.
void Database;

const tools: McpTool[] = [
  ...webTools,
  ...reconTools,
  ...founderLocalPipelineTools,
  ...entityEnrichmentTools,
];
const syncBridge = new SyncBridgeServer();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(createSearchRouter(tools));
app.use("/shared-context", createSharedContextRouter());
app.use("/api/shared-context", createSharedContextRouter());
app.get("/sync-bridge/health", (_req, res) => {
  res.json(syncBridge.getHealthSnapshot());
});
app.get("/api/sync-bridge/health", (_req, res) => {
  res.json(syncBridge.getHealthSnapshot());
});
app.get("/sync-bridge/accounts/:userId", (req, res) => {
  res.json(syncBridge.getAccountSnapshot(req.params.userId));
});
app.get("/api/sync-bridge/accounts/:userId", (req, res) => {
  res.json(syncBridge.getAccountSnapshot(req.params.userId));
});

export default app;
