// convex/domains/mcp/mcpClient.ts - MCP client actions for NodeBench (Node.js runtime)
// Simplified MCP implementation for static HTTP tool-calling only
"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

const rateLimiter = new Map<string, { count: number; expiresAt: number }>();

/**
 * Call an MCP tool via HTTP (static tool-calling only)
 */
export const callMcpTool: any = action({
  args: {
    serverId: v.optional(v.id("mcpServers")),
    toolName: v.string(),
    parameters: v.any(),
    prioritizedServers: v.optional(v.array(v.string())),
  },
  returns: v.object({
    success: v.boolean(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    serverId: v.optional(v.id("mcpServers")),
    serverName: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    serverId?: Id<"mcpServers">;
    serverName?: string;
  }> => {
    const userIdentity = await ctx.auth.getUserIdentity();
    const userId = userIdentity?.subject as Id<"users"> | undefined;

    // Durable per-user daily rate limit via dailyUsage
    const today = new Date().toISOString().slice(0, 10);
    const limitPerDay = 500;
    const usage = await ctx.runMutation((api as any).mcp.incrementMcpUsage, {
      userId,
      date: today,
      limit: limitPerDay,
    });
    if (!usage.allowed) {
      return {
        success: false,
        error: "MCP daily rate limit exceeded. Please retry tomorrow.",
      };
    }
    try {
      // Helper to score preferred servers (lower is better)
      const PRIORITY = (args.prioritizedServers && args.prioritizedServers.length > 0)
        ? args.prioritizedServers.map((p) => p.toLowerCase())
        : ["context7", "convex"];
      const scoreServer = (name?: string) => {
        if (!name) return PRIORITY.length + 1;
        const lower = name.toLowerCase();
        const idx = PRIORITY.findIndex((p) => lower.includes(p));
        return idx === -1 ? PRIORITY.length : idx;
      };

      let serverId = args.serverId as Id<"mcpServers"> | undefined;
      let server: any = null;

      // If no serverId provided, pick the best available server for the current user
      if (!serverId) {
        const servers = await ctx.runQuery(api.domains.mcp.mcp.listMcpServers, {});
        const withUrls = servers.filter((s: any) => Boolean(s.url));
        withUrls.sort((a: any, b: any) => {
          const scoreDiff = scoreServer(a.name) - scoreServer(b.name);
          if (scoreDiff !== 0) return scoreDiff;
          // Most recently updated wins as a tiebreaker
          return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
        });
        server = withUrls[0] ?? null;
        serverId = server?._id;
      }

      if (!serverId) {
        return { success: false, error: "No MCP server configured", serverId: undefined, serverName: undefined };
      }

      // Get server configuration from database (if not already fetched)
      if (!server) {
        server = await ctx.runQuery(api.domains.mcp.mcp.getMcpServerById, {
          serverId,
        });
      }

      if (!server) {
        return { success: false, error: "Server not found", serverId };
      }

      if (!server.url) {
        return { success: false, error: "Server URL not configured", serverId, serverName: server.name };
      }

      // Generate unique request ID for JSON-RPC 2.0
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Make HTTP request to MCP server using proper JSON-RPC 2.0 format
      const requestBody = {
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/call",
        params: {
          name: args.toolName,
          arguments: args.parameters || {},
        },
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
      };

      if (userId) {
        headers["X-User-Id"] = userId;
      }

      // Add API key if provided
      if (server.apiKey) {
        headers["Authorization"] = `Bearer ${server.apiKey}`;
      }

      console.log(`Making MCP request to ${server.url}:`, JSON.stringify(requestBody, null, 2));

      const response: Response = await fetch(server.url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log(`MCP response status: ${response.status} ${response.statusText}`);
      // Log response headers (Headers object doesn't have entries() in some environments)
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log(`MCP response headers:`, responseHeaders);

      // Get response text first for better error handling
      const responseText = await response.text();
      console.log(`MCP response body:`, responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${responseText}`);
      }

      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${responseText}. Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Handle JSON-RPC 2.0 error responses
      if (result.error) {
        throw new Error(`MCP Error ${result.error.code}: ${result.error.message}`);
      }

      // Validate JSON-RPC 2.0 response format
      if (result.jsonrpc !== "2.0" || result.id !== requestId) {
        console.warn("Response doesn't follow JSON-RPC 2.0 format, but proceeding...");
      }

      // TODO: Update tool usage statistics when properly implemented
      if (userId) {
        try {
          await ctx.runMutation((api as any).mcp.storeUsageHistory, {
            userId,
            toolId: serverId ? await findToolId(ctx, serverId, args.toolName) : (undefined as any),
            serverId: serverId as Id<"mcpServers">,
            naturalLanguageQuery: args.toolName,
            parameters: args.parameters,
            executionSuccess: true,
            resultPreview: JSON.stringify(result.result ?? result).slice(0, 500),
            errorMessage: undefined,
          });
        } catch (logErr) {
          console.warn("[mcpClient] Failed to store usage history", logErr);
        }
      }

      return {
        success: true,
        result: result.result || result,
        serverId,
        serverName: server?.name,
      };

    } catch (error) {
      console.error(`Failed to call MCP tool ${args.toolName}:`, error);
      if (userId) {
        try {
          await ctx.runMutation((api as any).mcp.storeUsageHistory, {
            userId,
            toolId: args.serverId ? await findToolId(ctx, args.serverId as Id<"mcpServers">, args.toolName) : (undefined as any),
            serverId: args.serverId as Id<"mcpServers">,
            naturalLanguageQuery: args.toolName,
            parameters: args.parameters,
            executionSuccess: false,
            resultPreview: undefined,
            errorMessage: error instanceof Error ? error.message : "Tool execution failed",
          });
        } catch (logErr) {
          console.warn("[mcpClient] Failed to store usage history (error path)", logErr);
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Tool execution failed",
        serverId: args.serverId ?? undefined,
      };
    }
  },
});

async function findToolId(ctx: any, serverId: Id<"mcpServers">, toolName: string) {
  const tool = await ctx.runQuery(api.domains.mcp.mcp.getToolByName, { serverId, name: toolName });
  return tool?._id;
}

/**
 * Fallback helper functions for compatibility (currently return errors in static mode)
 */
export const geminiQueryWithMcp = action({
  args: {
    serverId: v.id("mcpServers"),
    prompt: v.string(),
    model: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, { serverId: _serverId, prompt: _prompt, model: _model }) => {
    // In static mode, MCP queries are not supported
    return {
      success: false,
      error: "MCP queries not supported in static mode. Use callMcpTool for direct tool calling.",
    };
  },
});

/**
 * Fallback helper functions for compatibility (currently return errors in static mode)
 */
export const openaiQueryWithMcp = action({
  args: {
    serverId: v.id("mcpServers"),
    prompt: v.string(),
    model: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, { serverId: _serverId, prompt: _prompt, model: _model }) => {
    // In static mode, MCP queries are not supported
    return {
      success: false,
      error: "MCP queries not supported in static mode. Use callMcpTool for direct tool calling.",
    };
  },
});
