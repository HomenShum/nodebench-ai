/**
 * viewToolMap — Maps each view to its contextually relevant WebMCP tools.
 *
 * When a user navigates to a view, these tools are registered via WebMCP
 * so browser agents can interact with view-specific functionality.
 *
 * Inspired by WebMCP's per-page tool registration pattern:
 * each page declares what tools are available when it's active.
 *
 * Tools are defined as templates — the execute functions are bound
 * at registration time by useViewWebMcpTools.
 */

import type { MainView } from "../../hooks/useMainLayoutRouting";

export interface ViewToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /**
   * MCP Gateway function name for server-side execution (maps to ALLOWLIST key).
   * If set, OpenClaw and server-side agents can call this tool via the gateway.
   * If absent, the tool is frontend-only (no backend endpoint).
   */
  gatewayFn?: string;
  /** "query" | "mutation" — defaults to "query" */
  fnType?: "query" | "mutation";
  /** Transform tool args → Convex function args. If absent, args passed through. */
  mapArgs?: (args: Record<string, unknown>) => Record<string, unknown>;
}

export type ViewToolMap = Partial<Record<MainView, ViewToolDefinition[]>>;

export const VIEW_TOOL_MAP: ViewToolMap = {
  research: [
    {
      name: "nb_search_research",
      description: "Search across research signals, briefings, and intelligence reports on the current view.",
      inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] },
      gatewayFn: "hybridSearch",
      mapArgs: (a) => ({ query: String(a.query ?? ""), topK: Number(a.limit ?? 10) }),
    },
    {
      name: "nb_get_signals",
      description: "Get the latest research signals with trend data and source attribution.",
      inputSchema: { type: "object", properties: { limit: { type: "number" } } },
      gatewayFn: "getSignalTimeseries",
    },
    {
      name: "nb_switch_research_tab",
      description: "Switch the research hub tab (overview, signals, briefing, deals, changes, changelog).",
      inputSchema: { type: "object", properties: { tab: { type: "string", enum: ["overview", "signals", "briefing", "deals", "changes", "changelog"] } }, required: ["tab"] },
      // Frontend-only — no backend endpoint
    },
  ],

  "for-you-feed": [
    {
      name: "nb_get_feed_items",
      description: "Get items from the personalized For You feed with ranking scores.",
      inputSchema: { type: "object", properties: { limit: { type: "number" }, sort: { type: "string", enum: ["hot", "new", "top"] } } },
      gatewayFn: "getPublicForYouFeed",
      mapArgs: (a) => ({ limit: Number(a.limit ?? 20) }),
    },
    {
      name: "nb_engage_feed_item",
      description: "Record engagement on a feed item (click, bookmark, share).",
      inputSchema: { type: "object", properties: { itemId: { type: "string" }, action: { type: "string", enum: ["click", "bookmark", "share"] } }, required: ["itemId", "action"] },
      // Frontend-only — engagement tracking is client-side
    },
  ],

  documents: [
    {
      name: "nb_list_documents",
      description: "List documents in the workspace with titles, tags, and last-modified dates.",
      inputSchema: { type: "object", properties: { limit: { type: "number" }, search: { type: "string" } } },
      gatewayFn: "mcpListDocuments",
    },
    {
      name: "nb_create_document",
      description: "Create a new document with markdown content.",
      inputSchema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["title", "content"] },
      gatewayFn: "mcpCreateDocument",
      fnType: "mutation",
    },
    {
      name: "nb_search_documents",
      description: "Full-text search across document content.",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
      gatewayFn: "mcpSearchDocuments",
    },
  ],

  agents: [
    {
      name: "nb_list_agents",
      description: "List available AI agent templates and active conversations.",
      inputSchema: { type: "object", properties: { status: { type: "string", enum: ["all", "active", "templates"] } } },
    },
    {
      name: "nb_start_agent",
      description: "Start a new agent conversation with an optional initial message.",
      inputSchema: { type: "object", properties: { templateId: { type: "string" }, message: { type: "string" } }, required: ["message"] },
    },
    {
      name: "nb_get_agent_status",
      description: "Get the status and recent activity of a running agent.",
      inputSchema: { type: "object", properties: { threadId: { type: "string" } }, required: ["threadId"] },
    },
  ],

  calendar: [
    {
      name: "nb_list_events",
      description: "List calendar events for a date range.",
      inputSchema: { type: "object", properties: { startDate: { type: "string" }, endDate: { type: "string" } } },
    },
    {
      name: "nb_create_event",
      description: "Create a new calendar event.",
      inputSchema: { type: "object", properties: { title: { type: "string" }, date: { type: "string" }, description: { type: "string" } }, required: ["title", "date"] },
    },
  ],

  funding: [
    {
      name: "nb_get_funding_brief",
      description: "Get the latest funding intelligence — recent rounds, sector trends, notable deals.",
      inputSchema: { type: "object", properties: {} },
      gatewayFn: "getDealFlow",
    },
    {
      name: "nb_list_deals",
      description: "List funding deals with filters for stage, sector, and amount.",
      inputSchema: { type: "object", properties: { stage: { type: "string" }, sector: { type: "string" }, minAmount: { type: "number" } } },
      gatewayFn: "getDealFlow",
    },
    {
      name: "nb_filter_by_stage",
      description: "Filter deals by funding stage (seed, series-a, etc.).",
      inputSchema: { type: "object", properties: { stage: { type: "string", enum: ["seed", "series-a", "series-b", "series-c", "growth", "ipo"] } }, required: ["stage"] },
      gatewayFn: "getDealFlow",
      mapArgs: (a) => ({ stage: a.stage }),
    },
  ],

  benchmarks: [
    {
      name: "nb_get_leaderboard",
      description: "Get the model evaluation leaderboard with scores and rankings.",
      inputSchema: { type: "object", properties: { metric: { type: "string" } } },
    },
    {
      name: "nb_list_scenarios",
      description: "List available eval scenarios with descriptions and difficulty.",
      inputSchema: { type: "object", properties: { category: { type: "string" } } },
    },
  ],

  "github-explorer": [
    {
      name: "nb_list_repos",
      description: "List tracked GitHub repositories with stats.",
      inputSchema: { type: "object", properties: { limit: { type: "number" } } },
      gatewayFn: "getTrendingRepos",
      mapArgs: (a) => ({ limit: Number(a.limit ?? 20) }),
    },
    {
      name: "nb_get_pr_status",
      description: "Get status of pull requests for a repository.",
      inputSchema: { type: "object", properties: { repo: { type: "string" } }, required: ["repo"] },
      // No direct gateway endpoint for PR status
    },
  ],

  signals: [
    {
      name: "nb_list_signals",
      description: "List public signals with filtering and sorting.",
      inputSchema: { type: "object", properties: { category: { type: "string" }, limit: { type: "number" } } },
      gatewayFn: "getSignalTimeseries",
    },
    {
      name: "nb_get_signal_detail",
      description: "Get detailed information about a specific signal.",
      inputSchema: { type: "object", properties: { signalId: { type: "string" } }, required: ["signalId"] },
      gatewayFn: "getSignalTimeseries",
    },
  ],

  dogfood: [
    {
      name: "nb_get_qa_results",
      description: "Get the latest QA pipeline results — scores, issues, governance violations.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "nb_view_screenshots",
      description: "Get captured route screenshots for visual QA.",
      inputSchema: { type: "object", properties: { route: { type: "string" } } },
    },
  ],
};

/** Get tools for a specific view, returns empty array if none defined */
export function getViewTools(viewId: MainView): ViewToolDefinition[] {
  return VIEW_TOOL_MAP[viewId] ?? [];
}

/** Count total tools across all views */
export function getTotalViewTools(): number {
  return Object.values(VIEW_TOOL_MAP).reduce((sum, tools) => sum + (tools?.length ?? 0), 0);
}
