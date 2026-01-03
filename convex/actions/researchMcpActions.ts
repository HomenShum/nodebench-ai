/**
 * Research MCP Communication Layer
 *
 * This module provides actions for communicating with the Research MCP server.
 *
 * Server endpoints (python-mcp-servers/research):
 * - GET  /health
 * - GET  /tools/list
 * - POST /tools/execute   (expects { tool_name, parameters, secret })
 *
 * Environment variables:
 * - RESEARCH_MCP_SERVER_URL (default: http://127.0.0.1:8002)
 * - RESEARCH_API_KEY (required for /tools/execute; must match server MCP_SECRET)
 */

"use node";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

export const callResearchMcp = internalAction({
  args: {
    endpoint: v.string(),
    method: v.union(v.literal("GET"), v.literal("POST")),
    params: v.optional(v.any()),
    body: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    const baseUrl = process.env.RESEARCH_MCP_SERVER_URL || "http://127.0.0.1:8002";
    const url = new URL(args.endpoint, baseUrl);

    if (args.method === "GET" && args.params) {
      for (const [key, value] of Object.entries(args.params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: args.method,
      headers: { "Content-Type": "application/json" },
      ...(args.method === "POST" && args.body !== undefined ? { body: JSON.stringify(args.body) } : {}),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Research MCP request failed: ${response.status} ${response.statusText}\n${text}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  },
});

export const researchHealth = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.runAction(internal.actions.researchMcpActions.callResearchMcp, {
      endpoint: "/health",
      method: "GET",
    });
  },
});

export const researchListTools = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.runAction(internal.actions.researchMcpActions.callResearchMcp, {
      endpoint: "/tools/list",
      method: "GET",
    });
  },
});

export const researchExecuteTool = internalAction({
  args: {
    toolName: v.string(),
    parameters: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const secret = process.env.RESEARCH_API_KEY || process.env.MCP_SECRET || "";
    if (!secret) {
      throw new Error("Missing RESEARCH_API_KEY (or MCP_SECRET fallback) for Research tool execution");
    }

    return await ctx.runAction(internal.actions.researchMcpActions.callResearchMcp, {
      endpoint: "/tools/execute",
      method: "POST",
      body: {
        tool_name: args.toolName,
        parameters: args.parameters ?? {},
        secret,
      },
    });
  },
});
