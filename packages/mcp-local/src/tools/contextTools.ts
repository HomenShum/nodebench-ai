/**
 * Engine Context Tools — MCP tools for querying accumulated engine knowledge.
 *
 * 4 tools in the `engine_context` domain:
 * - get_engine_context_health: Overall health of accumulated knowledge
 * - get_workflow_history: Past runs with scores for a given workflow
 * - archive_content: Save content to archive (prevents repetition)
 * - search_content_archive: FTS5 search past content by theme/title
 */

import type { McpTool } from "../types.js";
import {
  getContextHealth,
  getWorkflowHistory,
  archiveContent,
  searchContentArchive,
} from "../engine/contextBridge.js";

export const contextTools: McpTool[] = [
  // ── get_engine_context_health ──────────────────────────────────────
  {
    name: "get_engine_context_health",
    description:
      "Returns accumulated knowledge health: learnings count + freshness, conformance trend direction (improving/stable/regressing), recent run scores, content archive size, and workflow coverage. Use to understand how much context the engine has built up over time.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      try {
        const health = getContextHealth();
        return {
          ...health,
          _hint: health.learningsCount === 0
            ? "No learnings recorded yet. Run workflows via the engine to accumulate context."
            : `${health.learningsCount} learnings accumulated. Trend: ${health.trendDirection}.`,
        };
      } catch (err: any) {
        return { error: err.message ?? String(err), _hint: "Context tables may not exist yet. Start the engine to initialize." };
      }
    },
  },

  // ── get_workflow_history ───────────────────────────────────────────
  {
    name: "get_workflow_history",
    description:
      "Returns past runs for a specific workflow with scores, grades, step counts, and durations. Use to track conformance improvements over time and identify regression patterns.",
    inputSchema: {
      type: "object",
      properties: {
        workflow: {
          type: "string",
          description: "Workflow name (e.g., 'content_pipeline', 'fix_bug', 'new_feature')",
        },
        limit: {
          type: "number",
          description: "Max results to return (default: 10)",
        },
      },
      required: ["workflow"],
    },
    handler: async (args) => {
      const workflow = String(args.workflow ?? "");
      if (!workflow) return { error: "workflow is required" };
      const limit = typeof args.limit === "number" ? args.limit : 10;

      try {
        const history = getWorkflowHistory(workflow, limit);
        return {
          workflow,
          runs: history,
          totalRuns: history.length,
          _hint: history.length === 0
            ? `No runs found for "${workflow}". Run this workflow via the engine API to start tracking.`
            : `${history.length} runs found. Latest score: ${history[0].score} (${history[0].grade}).`,
        };
      } catch (err: any) {
        return { error: err.message ?? String(err) };
      }
    },
  },

  // ── archive_content ───────────────────────────────────────────────
  {
    name: "archive_content",
    description:
      "Save generated content to the archive for deduplication and theme tracking. Prevents the engine from regenerating similar content. Supports digest, post, report, and brief content types.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Content title",
        },
        content_type: {
          type: "string",
          enum: ["digest", "post", "report", "brief"],
          description: "Type of content",
        },
        digest: {
          type: "string",
          description: "Short summary/digest of the content",
        },
        themes: {
          type: "array",
          items: { type: "string" },
          description: "Themes/topics covered (for deduplication)",
        },
        workflow: {
          type: "string",
          description: "Workflow that generated this content (optional)",
        },
        full_content: {
          type: "string",
          description: "Full content body (optional, for storage)",
        },
      },
      required: ["title", "content_type", "digest", "themes"],
    },
    handler: async (args) => {
      const title = String(args.title ?? "");
      const contentType = String(args.content_type ?? "");
      const digest = String(args.digest ?? "");
      const themes = Array.isArray(args.themes) ? args.themes.map(String) : [];

      if (!title || !contentType || !digest) {
        return { error: "title, content_type, and digest are required" };
      }

      try {
        archiveContent(
          title,
          contentType,
          digest,
          themes,
          args.workflow ? String(args.workflow) : undefined,
          args.full_content ? String(args.full_content) : undefined,
        );
        return {
          archived: true,
          title,
          contentType,
          themeCount: themes.length,
          _hint: "Content archived. Future workflows will see these themes to avoid repetition.",
        };
      } catch (err: any) {
        return { error: err.message ?? String(err) };
      }
    },
  },

  // ── search_content_archive ────────────────────────────────────────
  {
    name: "search_content_archive",
    description:
      "Search past content by theme, title, or keywords using FTS5 full-text search. Use before generating new content to check what's already been covered and avoid repetition.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (FTS5 syntax supported, or plain keywords)",
        },
        content_type: {
          type: "string",
          enum: ["digest", "post", "report", "brief"],
          description: "Filter by content type (optional)",
        },
        limit: {
          type: "number",
          description: "Max results (default: 10)",
        },
      },
    },
    handler: async (args) => {
      const query = String(args.query ?? "");
      const contentType = args.content_type ? String(args.content_type) : undefined;
      const limit = typeof args.limit === "number" ? args.limit : 10;

      try {
        const results = searchContentArchive(query, contentType, limit);
        return {
          results,
          totalFound: results.length,
          _hint: results.length === 0
            ? "No matching content found. This topic hasn't been covered yet."
            : `Found ${results.length} matching items. Check themes to avoid overlap.`,
        };
      } catch (err: any) {
        return { error: err.message ?? String(err) };
      }
    },
  },
];
