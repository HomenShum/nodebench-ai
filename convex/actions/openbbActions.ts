/**
 * OpenBB MCP Communication Layer
 * 
 * This module provides actions for communicating with the OpenBB MCP server.
 * OpenBB provides financial data including stocks, crypto, economy, and news.
 * 
 * Setup:
 * 1. Install OpenBB MCP server: pip install openbb-mcp-server
 * 2. Start server: openbb-mcp --transport streamable-http --port 8001 --default-categories equity,crypto,economy,news
 * 3. Set environment variables:
 *    - OPENBB_MCP_SERVER_URL (default: http://127.0.0.1:8001)
 *    - OPENBB_MCP_AUTH_TOKEN (optional)
 */

"use node";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Call OpenBB MCP server endpoint
 * 
 * This is a low-level action for making HTTP requests to the OpenBB MCP server.
 * Most tools should use the higher-level tool wrappers instead.
 */
export const callOpenBBMCP = internalAction({
  args: {
    endpoint: v.string(),
    method: v.union(v.literal("GET"), v.literal("POST")),
    params: v.optional(v.any()),
    body: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const baseUrl = process.env.OPENBB_MCP_SERVER_URL || "http://127.0.0.1:8001";
    const url = new URL(args.endpoint, baseUrl);

    // Add query parameters for GET requests
    if (args.method === "GET" && args.params) {
      Object.entries(args.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    try {
      const response = await fetch(url.toString(), {
        method: args.method,
        headers: {
          "Content-Type": "application/json",
          ...(process.env.OPENBB_MCP_AUTH_TOKEN && {
            "Authorization": `Bearer ${process.env.OPENBB_MCP_AUTH_TOKEN}`,
          }),
        },
        ...(args.method === "POST" && args.body && {
          body: JSON.stringify(args.body),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenBB MCP request failed: ${response.status} ${response.statusText}\n${errorText}`
        );
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error("OpenBB MCP error:", error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * Test OpenBB MCP server connection
 *
 * Use this to verify that the OpenBB MCP server is running and accessible.
 */
export const testOpenBBConnection = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    try {
      const result: any = await ctx.runAction(internal.actions.openbbActions.callOpenBBMCP, {
        endpoint: "/health",
        method: "GET",
      });

      if (result.success) {
        return {
          success: true,
          message: "OpenBB MCP server is accessible",
          serverUrl: process.env.OPENBB_MCP_SERVER_URL || "http://127.0.0.1:8001",
        };
      } else {
        return {
          success: false,
          message: "OpenBB MCP server is not accessible",
          error: result.error,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to connect to OpenBB MCP server",
        error: error.message,
      };
    }
  },
});

/**
 * Get available OpenBB categories
 * 
 * Returns the list of available data categories (equity, crypto, economy, news, etc.)
 */
export const getOpenBBCategories = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const result: any = await ctx.runAction(internal.actions.openbbActions.callOpenBBMCP, {
      endpoint: "/admin/available_categories",
      method: "GET",
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to get OpenBB categories");
    }

    return result.data;
  },
});

/**
 * Get available OpenBB tools
 * 
 * Returns the list of available tools for a specific category
 */
export const getOpenBBTools = internalAction({
  args: {
    category: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const result: any = await ctx.runAction(internal.actions.openbbActions.callOpenBBMCP, {
      endpoint: "/admin/available_tools",
      method: "GET",
      params: args.category ? { category: args.category } : undefined,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to get OpenBB tools");
    }

    return result.data;
  },
});

