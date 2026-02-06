/**
 * Platform tools — Bridge MCP to Convex platform intelligence.
 *
 * Requires CONVEX_SITE_URL and MCP_SECRET env vars.
 * These tools give MCP agents access to live platform data:
 * - Daily brief (digest, signals, entities, funding)
 * - Funding intelligence search
 * - Research queue status
 * - LinkedIn content queue publishing
 */

import type { McpTool } from "../types.js";

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function getPlatformConfig(): { siteUrl: string; secret: string } | null {
  const siteUrl = process.env.CONVEX_SITE_URL;
  const secret = process.env.MCP_SECRET;
  if (!siteUrl || !secret) return null;
  return { siteUrl: siteUrl.replace(/\/$/, ""), secret };
}

async function platformGet(path: string, params?: Record<string, string>): Promise<any> {
  const config = getPlatformConfig();
  if (!config) {
    return { error: true, message: "Platform not configured. Set CONVEX_SITE_URL and MCP_SECRET env vars." };
  }

  const url = new URL(`${config.siteUrl}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "x-mcp-secret": config.secret },
  });

  return res.json();
}

async function platformPost(path: string, body: Record<string, unknown>): Promise<any> {
  const config = getPlatformConfig();
  if (!config) {
    return { error: true, message: "Platform not configured. Set CONVEX_SITE_URL and MCP_SECRET env vars." };
  }

  const res = await fetch(`${config.siteUrl}${path}`, {
    method: "POST",
    headers: {
      "x-mcp-secret": config.secret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const platformTools: McpTool[] = [
  {
    name: "query_daily_brief",
    description:
      "Get today's intelligence brief from the Convex platform: narrative thesis, top signals, entity spotlight, funding rounds, and action items. Requires CONVEX_SITE_URL and MCP_SECRET env vars.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (default: today)",
        },
        persona: {
          type: "string",
          description:
            "Persona filter: GENERAL, JPM_STARTUP_BANKER, etc. (default: GENERAL)",
        },
      },
    },
    handler: async (args: { date?: string; persona?: string }) => {
      const start = Date.now();
      const params: Record<string, string> = {};
      if (args.date) params.date = args.date;
      if (args.persona) params.persona = args.persona;

      const result = await platformGet("/api/mcpBridge/daily-brief", params);
      return { ...result, latencyMs: Date.now() - start };
    },
  },

  {
    name: "query_funding_entities",
    description:
      "Search funding intelligence from the Convex platform. Filter by company name, round type, or get recent events. Returns structured funding data with investors, amounts, and confidence scores.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Company name to search for",
        },
        roundType: {
          type: "string",
          description:
            "Filter by round type: pre-seed, seed, series-a, series-b, series-c, growth, debt",
        },
        limit: {
          type: "number",
          description: "Max results to return (default: 20, max: 50)",
        },
        daysBack: {
          type: "number",
          description: "How many days back to search (default: 30)",
        },
      },
    },
    handler: async (args: {
      query?: string;
      roundType?: string;
      limit?: number;
      daysBack?: number;
    }) => {
      const start = Date.now();
      const params: Record<string, string> = {};
      if (args.query) params.q = args.query;
      if (args.roundType) params.roundType = args.roundType;
      if (args.limit) params.limit = String(args.limit);
      if (args.daysBack) params.daysBack = String(args.daysBack);

      const result = await platformGet("/api/mcpBridge/funding", params);
      return { ...result, latencyMs: Date.now() - start };
    },
  },

  {
    name: "query_research_queue",
    description:
      "View the research task queue from the Convex platform. Shows active and pending research topics with priorities, entities, personas, and quality scores.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            "Filter by status: queued, researching, validating, publishing, completed, failed (default: queued)",
        },
        limit: {
          type: "number",
          description: "Max results to return (default: 20, max: 50)",
        },
      },
    },
    handler: async (args: { status?: string; limit?: number }) => {
      const start = Date.now();
      const params: Record<string, string> = {};
      if (args.status) params.status = args.status;
      if (args.limit) params.limit = String(args.limit);

      const result = await platformGet("/api/mcpBridge/research", params);
      return { ...result, latencyMs: Date.now() - start };
    },
  },

  {
    name: "publish_to_queue",
    description:
      "Push content to the LinkedIn content queue on the Convex platform. Content goes through the engagement gate and LLM judge before being scheduled for posting.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The post content to publish",
        },
        postType: {
          type: "string",
          description:
            "Type of post: insight, analysis, commentary, announcement, thread",
        },
        persona: {
          type: "string",
          description: "Persona to post as (default: GENERAL)",
        },
        target: {
          type: "string",
          description: "Target: personal or organization (default: personal)",
        },
        priority: {
          type: "number",
          description: "Priority 0-100 (default: 50)",
        },
      },
      required: ["content", "postType"],
    },
    handler: async (args: {
      content: string;
      postType: string;
      persona?: string;
      target?: string;
      priority?: number;
    }) => {
      const start = Date.now();
      const result = await platformPost("/api/mcpBridge/publish", {
        content: args.content,
        postType: args.postType,
        persona: args.persona,
        target: args.target,
        priority: args.priority,
      });
      return { ...result, latencyMs: Date.now() - start };
    },
  },
];
