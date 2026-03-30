/**
 * LocalMemoryProvider — SQLite-backed MemoryProvider implementation.
 *
 * Uses the existing NodeBench SQLite database (via getDb()) with FTS5
 * for full-text recall. All data stays local on disk at ~/.nodebench/nodebench.db.
 *
 * Tables created on connect:
 *   - memory_items       — core memory storage
 *   - memory_items_fts   — FTS5 virtual table for search
 *   - memory_relations   — directed edges between memories
 *   - memory_profiles    — cached user profile aggregates (optional)
 *
 * Follows the same schema patterns as db.ts (triggers for FTS sync, indexes).
 */

import { randomUUID } from "node:crypto";
import { getDb } from "../db.js";
import type Database from "better-sqlite3";
import type {
  MemoryProvider,
  ProviderConfig,
  MemoryInput,
  Memory,
  MemoryRelation,
  RecallOptions,
  ListOptions,
  UserProfile,
  SyncResult,
} from "./memoryProvider.js";

// ═══════════════════════════════════════════════════════════════════════════
// Schema SQL — executed once on connect
// ═══════════════════════════════════════════════════════════════════════════

const MEMORY_SCHEMA_SQL = `
-- Core memory storage
CREATE TABLE IF NOT EXISTS memory_items (
  id          TEXT PRIMARY KEY,
  content     TEXT NOT NULL,
  metadata    TEXT NOT NULL DEFAULT '{}',
  scope       TEXT NOT NULL DEFAULT 'general',
  tags        TEXT NOT NULL DEFAULT '[]',
  source      TEXT NOT NULL DEFAULT '',
  user_id     TEXT NOT NULL DEFAULT 'default',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_memory_items_scope ON memory_items(scope);
CREATE INDEX IF NOT EXISTS idx_memory_items_source ON memory_items(source);
CREATE INDEX IF NOT EXISTS idx_memory_items_user ON memory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_items_created ON memory_items(created_at);

-- FTS5 for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS memory_items_fts USING fts5(
  content,
  scope,
  tags,
  source,
  content='memory_items',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS memory_items_fts_insert AFTER INSERT ON memory_items BEGIN
  INSERT INTO memory_items_fts(rowid, content, scope, tags, source)
  VALUES (new.rowid, new.content, new.scope, new.tags, new.source);
END;

CREATE TRIGGER IF NOT EXISTS memory_items_fts_delete AFTER DELETE ON memory_items BEGIN
  INSERT INTO memory_items_fts(memory_items_fts, rowid, content, scope, tags, source)
  VALUES ('delete', old.rowid, old.content, old.scope, old.tags, old.source);
END;

CREATE TRIGGER IF NOT EXISTS memory_items_fts_update AFTER UPDATE ON memory_items BEGIN
  INSERT INTO memory_items_fts(memory_items_fts, rowid, content, scope, tags, source)
  VALUES ('delete', old.rowid, old.content, old.scope, old.tags, old.source);
  INSERT INTO memory_items_fts(rowid, content, scope, tags, source)
  VALUES (new.rowid, new.content, new.scope, new.tags, new.source);
END;

-- Directed relations between memories
CREATE TABLE IF NOT EXISTS memory_relations (
  id          TEXT PRIMARY KEY,
  from_id     TEXT NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
  to_id       TEXT NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  label       TEXT,
  confidence  REAL DEFAULT 1.0,
  metadata    TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(from_id, to_id, type)
);

CREATE INDEX IF NOT EXISTS idx_memory_relations_from ON memory_relations(from_id);
CREATE INDEX IF NOT EXISTS idx_memory_relations_to ON memory_relations(to_id);
CREATE INDEX IF NOT EXISTS idx_memory_relations_type ON memory_relations(type);
`;

// ═══════════════════════════════════════════════════════════════════════════
// Helper — row-to-Memory mapping
// ═══════════════════════════════════════════════════════════════════════════

interface MemoryRow {
  id: string;
  content: string;
  metadata: string;
  scope: string;
  tags: string;
  source: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  rank?: number;
}

function rowToMemory(row: MemoryRow, relevanceScore?: number): Memory {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(row.metadata);
  } catch { /* keep empty */ }

  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags);
  } catch { /* keep empty */ }

  return {
    id: row.id,
    content: row.content,
    metadata,
    scope: row.scope,
    tags,
    source: row.source,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(relevanceScore !== undefined ? { relevanceScore } : {}),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LocalMemoryProvider
// ═══════════════════════════════════════════════════════════════════════════

export class LocalMemoryProvider implements MemoryProvider {
  readonly name = "local-sqlite";
  readonly type = "local" as const;

  private db: Database.Database | null = null;
  private config: ProviderConfig = {};
  private connected = false;

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async connect(config: ProviderConfig): Promise<void> {
    this.config = config;
    const db = getDb();
    db.exec(MEMORY_SCHEMA_SQL);
    this.db = db;
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    // We don't close the shared DB — other modules use it.
    // Just mark ourselves as disconnected.
    this.connected = false;
    this.db = null;
  }

  isConnected(): boolean {
    return this.connected && this.db !== null;
  }

  private ensureConnected(): Database.Database {
    if (!this.db || !this.connected) {
      throw new Error("LocalMemoryProvider is not connected — call connect() first");
    }
    return this.db;
  }

  // ── CRUD ───────────────────────────────────────────────────────────────

  async store(memory: MemoryInput): Promise<string> {
    const db = this.ensureConnected();
    const id = randomUUID();
    const now = new Date().toISOString();
    const userId = memory.userId ?? this.config.userId ?? "default";

    db.prepare(`
      INSERT INTO memory_items (id, content, metadata, scope, tags, source, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      memory.content,
      JSON.stringify(memory.metadata ?? {}),
      memory.scope ?? "general",
      JSON.stringify(memory.tags ?? []),
      memory.source ?? "",
      userId,
      memory.timestamp ?? now,
      now,
    );

    return id;
  }

  async update(id: string, memory: MemoryInput): Promise<void> {
    const db = this.ensureConnected();
    const now = new Date().toISOString();

    const existing = db.prepare("SELECT id FROM memory_items WHERE id = ?").get(id) as
      | { id: string }
      | undefined;
    if (!existing) {
      throw new Error(`Memory not found: ${id}`);
    }

    db.prepare(`
      UPDATE memory_items
      SET content = ?, metadata = ?, scope = ?, tags = ?, source = ?, updated_at = ?
      WHERE id = ?
    `).run(
      memory.content,
      JSON.stringify(memory.metadata ?? {}),
      memory.scope ?? "general",
      JSON.stringify(memory.tags ?? []),
      memory.source ?? "",
      now,
      id,
    );
  }

  async delete(id: string): Promise<void> {
    const db = this.ensureConnected();
    const result = db.prepare("DELETE FROM memory_items WHERE id = ?").run(id);
    if (result.changes === 0) {
      throw new Error(`Memory not found: ${id}`);
    }
  }

  // ── Retrieval ──────────────────────────────────────────────────────────

  async recall(query: string, options?: RecallOptions): Promise<Memory[]> {
    const db = this.ensureConnected();
    const limit = options?.limit ?? 10;

    // Build FTS5 query — escape special characters for safety
    const safeQuery = query
      .replace(/['"]/g, " ")
      .replace(/[^\w\s-]/g, " ")
      .trim();

    if (!safeQuery) return [];

    // FTS5 search with BM25 ranking
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    // Base FTS match
    const ftsQuery = safeQuery
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => `"${w}"`)
      .join(" OR ");

    if (!ftsQuery) return [];

    // Optional filters applied as post-filter on joined rows
    let filterSql = "";
    if (options?.scope) {
      whereClauses.push("m.scope = ?");
      params.push(options.scope);
    }
    if (options?.source) {
      whereClauses.push("m.source = ?");
      params.push(options.source);
    }
    if (options?.userId) {
      whereClauses.push("m.user_id = ?");
      params.push(options.userId);
    } else if (this.config.userId) {
      whereClauses.push("m.user_id = ?");
      params.push(this.config.userId);
    }
    if (options?.after) {
      whereClauses.push("m.created_at > ?");
      params.push(options.after);
    }
    if (options?.before) {
      whereClauses.push("m.created_at < ?");
      params.push(options.before);
    }

    if (whereClauses.length > 0) {
      filterSql = " AND " + whereClauses.join(" AND ");
    }

    const sql = `
      SELECT m.*, rank
      FROM memory_items_fts fts
      JOIN memory_items m ON m.rowid = fts.rowid
      WHERE memory_items_fts MATCH ?${filterSql}
      ORDER BY rank
      LIMIT ?
    `;

    const rows = db.prepare(sql).all(ftsQuery, ...params, limit) as MemoryRow[];

    // Normalize BM25 rank to 0-1 relevance score
    const maxRank = rows.length > 0
      ? Math.max(...rows.map((r) => Math.abs(r.rank ?? 0)), 1)
      : 1;

    const results = rows.map((row) => {
      const absRank = Math.abs(row.rank ?? 0);
      const score = maxRank > 0 ? absRank / maxRank : 0;
      return rowToMemory(row, score);
    });

    // Post-filter by tags if specified
    if (options?.tags && options.tags.length > 0) {
      const tagSet = new Set(options.tags);
      return results.filter((m) =>
        m.tags.some((t) => tagSet.has(t)),
      );
    }

    // Post-filter by minScore
    if (options?.minScore !== undefined) {
      return results.filter(
        (m) => (m.relevanceScore ?? 0) >= (options.minScore ?? 0),
      );
    }

    return results;
  }

  async get(id: string): Promise<Memory | null> {
    const db = this.ensureConnected();
    const row = db.prepare("SELECT * FROM memory_items WHERE id = ?").get(id) as
      | MemoryRow
      | undefined;
    return row ? rowToMemory(row) : null;
  }

  async list(options?: ListOptions): Promise<Memory[]> {
    const db = this.ensureConnected();
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const orderBy = options?.orderBy === "updatedAt"
      ? "updated_at"
      : "created_at";
    const direction = options?.orderDirection === "asc" ? "ASC" : "DESC";

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (options?.scope) {
      whereClauses.push("scope = ?");
      params.push(options.scope);
    }
    if (options?.source) {
      whereClauses.push("source = ?");
      params.push(options.source);
    }
    if (options?.userId) {
      whereClauses.push("user_id = ?");
      params.push(options.userId);
    } else if (this.config.userId) {
      whereClauses.push("user_id = ?");
      params.push(this.config.userId);
    }

    const whereClause =
      whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

    const sql = `
      SELECT * FROM memory_items
      ${whereClause}
      ORDER BY ${orderBy} ${direction}
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(sql).all(...params, limit, offset) as MemoryRow[];

    let results = rows.map((row) => rowToMemory(row));

    // Post-filter by tags if specified
    if (options?.tags && options.tags.length > 0) {
      const tagSet = new Set(options.tags);
      results = results.filter((m) =>
        m.tags.some((t) => tagSet.has(t)),
      );
    }

    return results;
  }

  // ── Relations ──────────────────────────────────────────────────────────

  async relate(
    fromId: string,
    toId: string,
    relation: MemoryRelation,
  ): Promise<void> {
    const db = this.ensureConnected();
    const id = randomUUID();

    // Verify both memories exist
    const fromExists = db.prepare("SELECT id FROM memory_items WHERE id = ?").get(fromId);
    const toExists = db.prepare("SELECT id FROM memory_items WHERE id = ?").get(toId);
    if (!fromExists) throw new Error(`Source memory not found: ${fromId}`);
    if (!toExists) throw new Error(`Target memory not found: ${toId}`);

    db.prepare(`
      INSERT OR REPLACE INTO memory_relations (id, from_id, to_id, type, label, confidence, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      fromId,
      toId,
      relation.type,
      relation.label ?? null,
      relation.confidence ?? 1.0,
      JSON.stringify(relation.metadata ?? {}),
    );
  }

  // ── Profile ────────────────────────────────────────────────────────────

  async getProfile(userId?: string): Promise<UserProfile | null> {
    const db = this.ensureConnected();
    const uid = userId ?? this.config.userId ?? "default";

    const countRow = db.prepare(
      "SELECT COUNT(*) as c FROM memory_items WHERE user_id = ?",
    ).get(uid) as { c: number };

    if (countRow.c === 0) return null;

    const scopeRows = db.prepare(
      "SELECT DISTINCT scope FROM memory_items WHERE user_id = ?",
    ).all(uid) as Array<{ scope: string }>;

    const firstRow = db.prepare(
      "SELECT created_at FROM memory_items WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
    ).get(uid) as { created_at: string } | undefined;

    const lastRow = db.prepare(
      "SELECT created_at FROM memory_items WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    ).get(uid) as { created_at: string } | undefined;

    // Aggregate tags — parse JSON arrays and count
    const allRows = db.prepare(
      "SELECT tags, source FROM memory_items WHERE user_id = ?",
    ).all(uid) as Array<{ tags: string; source: string }>;

    const tagCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();

    for (const row of allRows) {
      try {
        const tags = JSON.parse(row.tags) as string[];
        for (const tag of tags) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      } catch { /* skip malformed */ }

      if (row.source) {
        sourceCounts.set(row.source, (sourceCounts.get(row.source) ?? 0) + 1);
      }
    }

    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    const topSources = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));

    return {
      userId: uid,
      memoryCount: countRow.c,
      scopes: scopeRows.map((r) => r.scope),
      topTags,
      topSources,
      firstMemoryAt: firstRow?.created_at ?? null,
      lastMemoryAt: lastRow?.created_at ?? null,
    };
  }

  // ── Sync ───────────────────────────────────────────────────────────────

  async sync(direction: "push" | "pull" | "both"): Promise<SyncResult> {
    // Local provider — no remote to sync with. Return no-op result.
    return {
      direction,
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      errors: 0,
      completedAt: new Date().toISOString(),
    };
  }
}
