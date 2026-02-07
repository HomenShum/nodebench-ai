/**
 * Learning tools — persistent edge case / gotcha / pattern store backed by SQLite FTS5.
 * Reframed from generic "agent memory" to development learnings that prevent repeating mistakes.
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

export const learningTools: McpTool[] = [
  {
    name: "record_learning",
    description:
      "Store an edge case, gotcha, pattern, or regression discovered during verification. Learnings are searchable via full-text search and prevent repeating the same mistakes. Always record learnings at the end of a verification cycle.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            "Short identifier (e.g. 'convex-use-node-export-restriction', 'stooq-crypto-suffix')",
        },
        content: {
          type: "string",
          description:
            "The learning: what happened, why, and how to avoid it",
        },
        category: {
          type: "string",
          enum: ["edge_case", "gotcha", "pattern", "regression", "convention"],
          description: "Type of learning",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Searchable tags",
        },
        sourceCycle: {
          type: "string",
          description:
            "Verification cycle ID that produced this learning (optional)",
        },
      },
      required: ["key", "content", "category"],
    },
    handler: async (args) => {
      const { key, content, category, tags, sourceCycle } = args;
      if (!key || !content) throw new Error("Key and content are required");

      const db = getDb();
      const now = new Date().toISOString();
      const tagsJson = tags ? JSON.stringify(tags) : null;

      db.prepare(`
        INSERT INTO learnings (key, content, category, tags, source_cycle, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          content = excluded.content,
          category = excluded.category,
          tags = excluded.tags,
          source_cycle = excluded.source_cycle,
          updated_at = excluded.updated_at
      `).run(key, content, category, tagsJson, sourceCycle ?? null, now, now);

      const row = db
        .prepare("SELECT id FROM learnings WHERE key = ?")
        .get(key) as any;

      return {
        success: true,
        learningId: row?.id,
        key,
        category,
        message: `Learning recorded. It will surface in future searches.`,
      };
    },
  },
  {
    name: "search_learnings",
    description:
      "[DEPRECATED: Use search_all_knowledge instead] Search past learnings. PREFER search_all_knowledge which searches learnings + recon findings + gaps in a unified query.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "What you are about to work on (e.g. 'convex http routing', 'crypto price API')",
        },
        category: {
          type: "string",
          enum: ["edge_case", "gotcha", "pattern", "regression", "convention"],
          description: "Filter by category (optional)",
        },
        limit: {
          type: "number",
          description: "Max results (default 10)",
        },
      },
      required: ["query"],
    },
    handler: async (args) => {
      const db = getDb();
      const limit = args.limit ?? 10;
      const query = args.query;

      let results: any[];
      if (args.category) {
        results = db
          .prepare(
            `
          SELECT l.id, l.key, l.content, l.category, l.tags, l.source_cycle, l.created_at,
                 rank
          FROM learnings_fts
          JOIN learnings l ON l.id = learnings_fts.rowid
          WHERE learnings_fts MATCH ?
            AND l.category = ?
          ORDER BY rank
          LIMIT ?
        `
          )
          .all(query, args.category, limit) as any[];
      } else {
        results = db
          .prepare(
            `
          SELECT l.id, l.key, l.content, l.category, l.tags, l.source_cycle, l.created_at,
                 rank
          FROM learnings_fts
          JOIN learnings l ON l.id = learnings_fts.rowid
          WHERE learnings_fts MATCH ?
          ORDER BY rank
          LIMIT ?
        `
          )
          .all(query, limit) as any[];
      }

      return {
        deprecated: true,
        deprecationNotice: "Use search_all_knowledge instead - it searches learnings + recon findings + gaps in one unified query.",
        query,
        count: results.length,
        learnings: results.map((r: any) => ({
          key: r.key,
          content: r.content,
          category: r.category,
          tags: r.tags ? JSON.parse(r.tags) : [],
          sourceCycle: r.source_cycle,
          createdAt: r.created_at,
        })),
      };
    },
  },
  {
    name: "list_learnings",
    description:
      "[DEPRECATED: Use search_all_knowledge instead] List stored learnings. PREFER search_all_knowledge for unified knowledge search across learnings, recon findings, and gaps.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["edge_case", "gotcha", "pattern", "regression", "convention"],
          description: "Filter by category (optional)",
        },
        limit: {
          type: "number",
          description: "Max results (default 50)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const limit = args.limit ?? 50;

      const rows = args.category
        ? (db
            .prepare(
              "SELECT * FROM learnings WHERE category = ? ORDER BY created_at DESC LIMIT ?"
            )
            .all(args.category, limit) as any[])
        : (db
            .prepare(
              "SELECT * FROM learnings ORDER BY created_at DESC LIMIT ?"
            )
            .all(limit) as any[]);

      return {
        deprecated: true,
        deprecationNotice: "Use search_all_knowledge instead - it provides unified search across learnings, recon findings, and gaps.",
        count: rows.length,
        learnings: rows.map((r: any) => ({
          key: r.key,
          content: r.content,
          category: r.category,
          tags: r.tags ? JSON.parse(r.tags) : [],
          sourceCycle: r.source_cycle,
          createdAt: r.created_at,
        })),
      };
    },
  },
  {
    name: "delete_learning",
    description:
      "Delete a learning by key. Use when a learning is outdated or incorrect.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "Key of the learning to delete" },
      },
      required: ["key"],
    },
    handler: async (args) => {
      const db = getDb();
      const result = db
        .prepare("DELETE FROM learnings WHERE key = ?")
        .run(args.key);
      if (result.changes === 0)
        throw new Error(`No learning found for key: ${args.key}`);
      return {
        success: true,
        message: `Deleted learning '${args.key}'`,
      };
    },
  },
];
