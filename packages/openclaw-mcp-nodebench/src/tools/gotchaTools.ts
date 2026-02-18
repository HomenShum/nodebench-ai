import type { McpTool } from "../types.js";
import { getDb } from "../db.js";

export const gotchaTools: McpTool[] = [
  {
    name: "record_openclaw_gotcha",
    description:
      "Record a discovered OpenClaw pitfall or security finding. " +
      "Stored persistently and searchable across sessions. " +
      "Future agents can find and learn from these records.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            "Unique identifier for this gotcha (e.g. 'skill_sandbox_bypass_v2'). Use snake_case.",
        },
        content: {
          type: "string",
          description:
            "Detailed description of the gotcha: what happens, why it's dangerous, how to avoid it.",
        },
        category: {
          type: "string",
          enum: [
            "security",
            "permissions",
            "sandbox",
            "workflow",
            "performance",
            "compatibility",
            "deployment",
            "general",
          ],
          description: "Category for this gotcha (default: general)",
        },
        severity: {
          type: "string",
          enum: ["critical", "warning", "info"],
          description: "Severity level (default: warning)",
        },
        tags: {
          type: "string",
          description: "Comma-separated tags for search (e.g. 'sandbox,escape,cve')",
        },
      },
      required: ["key", "content"],
    },
    handler: async (args: any) => {
      const db = getDb();
      const key: string = args.key;
      const content: string = args.content;
      const category: string = args.category ?? "general";
      const severity: string = args.severity ?? "warning";
      const tags: string = args.tags ?? "";

      // Upsert: don't overwrite seed gotchas unless user-sourced
      const existing = db
        .prepare("SELECT id, source FROM openclaw_gotchas WHERE key = ?")
        .get(key) as any;

      if (existing) {
        db.prepare(
          `UPDATE openclaw_gotchas SET content = ?, category = ?, severity = ?, tags = ?,
           source = 'user', updated_at = datetime('now')
           WHERE key = ?`
        ).run(content, category, severity, tags, key);
      } else {
        db.prepare(
          `INSERT INTO openclaw_gotchas (key, content, category, severity, tags, source)
           VALUES (?, ?, ?, ?, ?, 'user')`
        ).run(key, content, category, severity, tags);
      }

      return {
        success: true,
        action: existing ? "updated" : "created",
        key,
        category,
        severity,
        quickRef: {
          nextAction: "Gotcha recorded. Search with search_openclaw_gotchas.",
          nextTools: ["search_openclaw_gotchas"],
          methodology: "agent_security",
        },
      };
    },
  },

  {
    name: "search_openclaw_gotchas",
    description:
      "Search stored OpenClaw pitfalls, security findings, and best practices. " +
      "Includes both built-in knowledge and user-recorded discoveries.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (supports FTS5 syntax: AND, OR, NOT, prefix*)",
        },
        category: {
          type: "string",
          description: "Filter by category (optional)",
        },
        severity: {
          type: "string",
          enum: ["critical", "warning", "info"],
          description: "Filter by severity (optional)",
        },
        limit: {
          type: "number",
          description: "Max results to return (default: 20)",
        },
      },
    },
    handler: async (args: any) => {
      const db = getDb();
      const query: string | null = args.query ?? null;
      const category: string | null = args.category ?? null;
      const severity: string | null = args.severity ?? null;
      const limit: number = Math.min(args.limit ?? 20, 100);

      let results: any[];

      if (query) {
        // FTS5 search
        let ftsQuery = `SELECT g.*, rank
          FROM openclaw_gotchas_fts fts
          JOIN openclaw_gotchas g ON g.id = fts.rowid
          WHERE openclaw_gotchas_fts MATCH ?`;
        const params: any[] = [query];

        if (category) {
          ftsQuery += " AND g.category = ?";
          params.push(category);
        }
        if (severity) {
          ftsQuery += " AND g.severity = ?";
          params.push(severity);
        }

        ftsQuery += " ORDER BY rank LIMIT ?";
        params.push(limit);

        results = db.prepare(ftsQuery).all(...params) as any[];
      } else {
        // Browse all (with optional filters)
        let browseQuery = "SELECT * FROM openclaw_gotchas WHERE 1=1";
        const params: any[] = [];

        if (category) {
          browseQuery += " AND category = ?";
          params.push(category);
        }
        if (severity) {
          browseQuery += " AND severity = ?";
          params.push(severity);
        }

        browseQuery += " ORDER BY updated_at DESC LIMIT ?";
        params.push(limit);

        results = db.prepare(browseQuery).all(...params) as any[];
      }

      return {
        results: results.map((r: any) => ({
          key: r.key,
          content: r.content,
          category: r.category,
          severity: r.severity,
          tags: r.tags,
          source: r.source,
          updatedAt: r.updated_at,
        })),
        totalResults: results.length,
        searchQuery: query,
        filters: { category, severity },
        quickRef: {
          nextAction: results.length > 0
            ? "Review gotchas and apply learnings to your workflow."
            : "No matching gotchas. Record new findings with record_openclaw_gotcha.",
          nextTools: ["record_openclaw_gotcha", "configure_sandbox_policy"],
          methodology: "agent_security",
        },
      };
    },
  },
];
