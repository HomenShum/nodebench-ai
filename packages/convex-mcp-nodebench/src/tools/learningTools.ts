import { getDb, genId } from "../db.js";
import { getQuickRef } from "./toolRegistry.js";
import type { McpTool } from "../types.js";

export const learningTools: McpTool[] = [
  {
    name: "convex_record_gotcha",
    description:
      "Record a Convex-specific gotcha, edge case, or pattern for future reference. Stored persistently and searchable via full-text search. Categories: validator, schema, function, deployment, auth, performance, general.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Short unique identifier (e.g., 'v-optional-default-undefined', 'cron-overlap-race')",
        },
        content: {
          type: "string",
          description: "Detailed description of the gotcha: what happened, why, and how to avoid it",
        },
        category: {
          type: "string",
          enum: ["validator", "schema", "function", "deployment", "auth", "performance", "general"],
          description: "Category of the gotcha",
        },
        severity: {
          type: "string",
          enum: ["critical", "warning", "info"],
          description: "How severe this gotcha is",
        },
        tags: {
          type: "string",
          description: "Comma-separated tags for searchability",
        },
      },
      required: ["key", "content", "category"],
    },
    handler: async (args: {
      key: string;
      content: string;
      category: string;
      severity?: string;
      tags?: string;
    }) => {
      const db = getDb();

      // Upsert: update if exists, insert if not
      const existing = db.prepare("SELECT id FROM convex_gotchas WHERE key = ?").get(args.key) as any;
      if (existing) {
        db.prepare(
          "UPDATE convex_gotchas SET content = ?, category = ?, severity = ?, tags = ?, source = 'user', updated_at = datetime('now') WHERE key = ?"
        ).run(args.content, args.category, args.severity || "warning", args.tags || "", args.key);
        return {
          action: "updated",
          key: args.key,
          quickRef: getQuickRef("convex_record_gotcha"),
        };
      }

      db.prepare(
        "INSERT INTO convex_gotchas (key, content, category, severity, tags, source) VALUES (?, ?, ?, ?, ?, 'user')"
      ).run(args.key, args.content, args.category, args.severity || "warning", args.tags || "");

      return {
        action: "created",
        key: args.key,
        quickRef: getQuickRef("convex_record_gotcha"),
      };
    },
  },
  {
    name: "convex_search_gotchas",
    description:
      "Search the persistent Convex gotcha database using full-text search. Returns relevant gotchas, edge cases, and patterns. Always search before starting a new Convex implementation to avoid known pitfalls.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What you're about to implement or the issue you're hitting (e.g., 'array validator', 'index query order', 'action runtime')",
        },
        category: {
          type: "string",
          enum: ["validator", "schema", "function", "deployment", "auth", "performance", "general"],
          description: "Optional: filter by category",
        },
        limit: {
          type: "number",
          description: "Max results (default 10)",
        },
      },
      required: ["query"],
    },
    handler: async (args: { query: string; category?: string; limit?: number }) => {
      const db = getDb();
      const limit = args.limit || 10;

      let results: any[];

      try {
        // FTS5 search
        let sql = `
          SELECT g.*, rank
          FROM convex_gotchas g
          JOIN convex_gotchas_fts fts ON g.id = fts.rowid
          WHERE convex_gotchas_fts MATCH ?
        `;
        const params: any[] = [args.query];

        if (args.category) {
          sql += " AND g.category = ?";
          params.push(args.category);
        }

        sql += " ORDER BY rank LIMIT ?";
        params.push(limit);

        results = db.prepare(sql).all(...params);
      } catch {
        // Fallback to LIKE search with JS-side BM25 scoring
        let sql = "SELECT * FROM convex_gotchas WHERE (key LIKE ? OR content LIKE ? OR tags LIKE ?)";
        const likeTerm = `%${args.query}%`;
        const params: any[] = [likeTerm, likeTerm, likeTerm];

        if (args.category) {
          sql += " AND category = ?";
          params.push(args.category);
        }

        sql += " LIMIT 100"; // Fetch more, then rank and trim
        const raw = db.prepare(sql).all(...params) as any[];

        // BM25-style scoring on LIKE results (field-weighted)
        const queryTerms = args.query.toLowerCase().match(/[a-z_]+/g) ?? [];
        if (queryTerms.length > 0 && raw.length > 1) {
          const avgLen = raw.reduce((s, r) => s + (r.content?.length ?? 0), 0) / raw.length || 1;
          const scored = raw.map((r) => {
            const keyText = (r.key ?? "").toLowerCase();
            const contentText = (r.content ?? "").toLowerCase();
            const tagsText = (r.tags ?? "").toLowerCase();
            const dl = contentText.length;
            let score = 0;
            for (const qt of queryTerms) {
              // Field-weighted term frequency: key 3x, tags 2x, content 1x
              const keyHits = (keyText.match(new RegExp(qt, "g")) ?? []).length * 3;
              const tagHits = (tagsText.match(new RegExp(qt, "g")) ?? []).length * 2;
              const contentHits = (contentText.match(new RegExp(qt, "g")) ?? []).length;
              const tf = keyHits + tagHits + contentHits;
              if (tf === 0) continue;
              // BM25 saturation + length normalization
              const k1 = 1.2, b = 0.75;
              score += (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / avgLen)));
            }
            return { ...r, _score: score };
          });
          scored.sort((a, b) => b._score - a._score);
          results = scored.slice(0, limit);
        } else {
          results = raw.slice(0, limit);
        }
      }

      return {
        totalResults: results.length,
        gotchas: results.map((r: any) => ({
          key: r.key,
          content: r.content,
          category: r.category,
          severity: r.severity,
          tags: r.tags,
          source: r.source,
        })),
        quickRef: getQuickRef("convex_search_gotchas"),
      };
    },
  },
];
