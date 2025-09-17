// convex/mcpClient.ts - MCP client actions for NodeBench (Node.js runtime)
// Simplified MCP implementation for static HTTP tool-calling only
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Call an MCP tool via HTTP (static tool-calling only)
 */
export const callMcpTool: any = action({
  args: {
    serverId: v.id("mcpServers"),
    toolName: v.string(),
    parameters: v.any(),
  },
  returns: v.object({
    success: v.boolean(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> => {
    try {
      // Get server configuration from database
      const server: any = await ctx.runQuery(api.mcp.getMcpServerById, {
        serverId: args.serverId,
      });

      if (!server) {
        return { success: false, error: "Server not found" };
      }

      if (!server.url) {
        return { success: false, error: "Server URL not configured" };
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

      // Add API key if provided - check for different auth patterns
      if (server.apiKey) {
        // Try different auth patterns that MCP servers might expect
        if (server.url.includes('tavilyApiKey=')) {
          // For Tavily, the API key is in the URL
        } else {
          headers["Authorization"] = `Bearer ${server.apiKey}`;
        }
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
      // Currently disabled due to parameter mismatch

      return {
        success: true,
        result: result.result || result,
      };

    } catch (error) {
      console.error(`Failed to call MCP tool ${args.toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Tool execution failed",
      };
    }
  },
});

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
