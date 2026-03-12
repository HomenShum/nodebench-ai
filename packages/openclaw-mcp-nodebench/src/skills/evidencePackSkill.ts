/**
 * deeptrace-evidence-pack — ClawHub skill for evidence bundle management.
 *
 * Lets any OpenClaw agent create, search, and verify evidence packs —
 * temporal bundles of source artifacts with content-addressed hashes
 * for investigation and audit trail purposes.
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

function ensureEvidenceTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS deeptrace_evidence_chunks (
      id TEXT PRIMARY KEY,
      source_url TEXT,
      source_label TEXT NOT NULL DEFAULT '',
      text_content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_hash ON deeptrace_evidence_chunks(content_hash);

    CREATE TABLE IF NOT EXISTS deeptrace_evidence_packs (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      scope TEXT,
      chunk_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS deeptrace_evidence_fts USING fts5(
      source_label, text_content,
      content='deeptrace_evidence_chunks',
      content_rowid='rowid'
    );
  `);
}

function fnvHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export const evidencePackSkill: McpTool[] = [
  {
    name: "deeptrace_ingest_evidence",
    description:
      "Ingest a piece of evidence (article, filing, data point) into the evidence store. Returns a content-addressed chunk ID that can be referenced in receipts and evidence packs.",
    inputSchema: {
      type: "object",
      properties: {
        sourceUrl: { type: "string", description: "URL where this evidence was fetched from" },
        sourceLabel: { type: "string", description: "Human-readable label (e.g. 'SEC EDGAR Filing')" },
        textContent: { type: "string", description: "The actual evidence text content" },
      },
      required: ["textContent"],
    },
    handler: async (args: any) => {
      ensureEvidenceTables();
      const db = getDb();
      const id = genId("ev");
      const contentHash = `sha256:${fnvHash(args.textContent)}${fnvHash(args.sourceUrl ?? "")}`;

      // Check for duplicate by content hash
      const existing = db
        .prepare("SELECT id FROM deeptrace_evidence_chunks WHERE content_hash = ?")
        .get(contentHash) as any;

      if (existing) {
        return { chunkId: existing.id, contentHash, deduplicated: true };
      }

      db.prepare(
        `INSERT INTO deeptrace_evidence_chunks (id, source_url, source_label, text_content, content_hash)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(id, args.sourceUrl ?? null, args.sourceLabel ?? "", args.textContent, contentHash);

      // Update FTS index
      try {
        db.prepare(
          `INSERT INTO deeptrace_evidence_fts (rowid, source_label, text_content)
           VALUES ((SELECT rowid FROM deeptrace_evidence_chunks WHERE id = ?), ?, ?)`,
        ).run(id, args.sourceLabel ?? "", args.textContent);
      } catch {
        // FTS sync failure is non-fatal
      }

      return { chunkId: id, contentHash, deduplicated: false };
    },
  },

  {
    name: "deeptrace_create_evidence_pack",
    description:
      "Bundle multiple evidence chunks into a named evidence pack. Evidence packs are the unit of provenance — they capture what an agent saw at investigation time.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The investigation query this pack supports" },
        chunkIds: {
          type: "array",
          items: { type: "string" },
          description: "Evidence chunk IDs to include in the pack",
        },
        scope: { type: "string", description: "Optional scope descriptor (e.g. 'FTX bankruptcy 2022-2023')" },
      },
      required: ["query", "chunkIds"],
    },
    handler: async (args: any) => {
      ensureEvidenceTables();
      const db = getDb();
      const id = genId("pack");

      // Validate chunk IDs exist
      const validChunks: string[] = [];
      for (const chunkId of args.chunkIds) {
        const exists = db.prepare("SELECT id FROM deeptrace_evidence_chunks WHERE id = ?").get(chunkId);
        if (exists) validChunks.push(chunkId);
      }

      db.prepare(
        `INSERT INTO deeptrace_evidence_packs (id, query, scope, chunk_ids) VALUES (?, ?, ?, ?)`,
      ).run(id, args.query, args.scope ?? null, JSON.stringify(validChunks));

      return {
        packId: id,
        query: args.query,
        chunkCount: validChunks.length,
        invalidChunks: args.chunkIds.filter((c: string) => !validChunks.includes(c)),
      };
    },
  },

  {
    name: "deeptrace_search_evidence",
    description:
      "Full-text search across ingested evidence chunks. Returns matching chunks with relevance ranking, source URLs, and content hashes for provenance verification.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (FTS5 syntax supported)" },
        maxResults: { type: "number", description: "Max results (default 10, max 50)" },
      },
      required: ["query"],
    },
    handler: async (args: any) => {
      ensureEvidenceTables();
      const db = getDb();
      const limit = Math.min(args.maxResults ?? 10, 50);

      let results: any[];
      try {
        results = db
          .prepare(
            `SELECT c.id, c.source_url, c.source_label, c.content_hash, c.fetched_at,
                    SUBSTR(c.text_content, 1, 600) as quote
             FROM deeptrace_evidence_fts f
             JOIN deeptrace_evidence_chunks c ON c.rowid = f.rowid
             WHERE deeptrace_evidence_fts MATCH ?
             ORDER BY rank
             LIMIT ?`,
          )
          .all(args.query, limit) as any[];
      } catch {
        // FTS match failure — fall back to LIKE search
        results = db
          .prepare(
            `SELECT id, source_url, source_label, content_hash, fetched_at,
                    SUBSTR(text_content, 1, 600) as quote
             FROM deeptrace_evidence_chunks
             WHERE text_content LIKE ? OR source_label LIKE ?
             ORDER BY fetched_at DESC
             LIMIT ?`,
          )
          .all(`%${args.query}%`, `%${args.query}%`, limit) as any[];
      }

      return {
        results: results.map((r: any) => ({
          chunkId: r.id,
          sourceUrl: r.source_url,
          sourceLabel: r.source_label,
          contentHash: r.content_hash,
          fetchedAt: r.fetched_at,
          quote: r.quote,
        })),
        totalResults: results.length,
        query: args.query,
      };
    },
  },

  {
    name: "deeptrace_get_evidence_pack",
    description:
      "Retrieve an evidence pack by ID, including all its constituent chunks with full content and provenance metadata.",
    inputSchema: {
      type: "object",
      properties: {
        packId: { type: "string", description: "Evidence pack ID" },
      },
      required: ["packId"],
    },
    handler: async (args: any) => {
      ensureEvidenceTables();
      const db = getDb();

      const pack = db
        .prepare("SELECT * FROM deeptrace_evidence_packs WHERE id = ?")
        .get(args.packId) as any;

      if (!pack) {
        return { error: "Evidence pack not found", packId: args.packId };
      }

      const chunkIds: string[] = JSON.parse(pack.chunk_ids || "[]");
      const chunks = chunkIds.length > 0
        ? db
            .prepare(
              `SELECT id, source_url, source_label, content_hash, fetched_at,
                      SUBSTR(text_content, 1, 1000) as quote
               FROM deeptrace_evidence_chunks
               WHERE id IN (${chunkIds.map(() => "?").join(",")})`,
            )
            .all(...chunkIds) as any[]
        : [];

      return {
        packId: pack.id,
        query: pack.query,
        scope: pack.scope,
        createdAt: pack.created_at,
        chunks: chunks.map((c: any) => ({
          chunkId: c.id,
          sourceUrl: c.source_url,
          sourceLabel: c.source_label,
          contentHash: c.content_hash,
          fetchedAt: c.fetched_at,
          quote: c.quote,
        })),
      };
    },
  },
];
