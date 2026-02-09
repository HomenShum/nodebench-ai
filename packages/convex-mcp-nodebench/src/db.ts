import Database from "better-sqlite3";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

let _db: Database.Database | null = null;

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;

-- ═══════════════════════════════════════════
-- CONVEX GOTCHAS (Persistent knowledge base)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS convex_gotchas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  key           TEXT NOT NULL UNIQUE,
  content       TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'general',
  severity      TEXT NOT NULL DEFAULT 'warning',
  convex_version TEXT,
  tags          TEXT,
  source        TEXT NOT NULL DEFAULT 'seed',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS convex_gotchas_fts USING fts5(
  key,
  content,
  category,
  tags,
  content='convex_gotchas',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS gotchas_fts_insert AFTER INSERT ON convex_gotchas BEGIN
  INSERT INTO convex_gotchas_fts(rowid, key, content, category, tags)
  VALUES (new.id, new.key, new.content, new.category, COALESCE(new.tags, ''));
END;

CREATE TRIGGER IF NOT EXISTS gotchas_fts_delete AFTER DELETE ON convex_gotchas BEGIN
  INSERT INTO convex_gotchas_fts(convex_gotchas_fts, rowid, key, content, category, tags)
  VALUES ('delete', old.id, old.key, old.content, old.category, COALESCE(old.tags, ''));
END;

CREATE TRIGGER IF NOT EXISTS gotchas_fts_update AFTER UPDATE ON convex_gotchas BEGIN
  INSERT INTO convex_gotchas_fts(convex_gotchas_fts, rowid, key, content, category, tags)
  VALUES ('delete', old.id, old.key, old.content, old.category, COALESCE(old.tags, ''));
  INSERT INTO convex_gotchas_fts(rowid, key, content, category, tags)
  VALUES (new.id, new.key, new.content, new.category, COALESCE(new.tags, ''));
END;

-- ═══════════════════════════════════════════
-- SCHEMA SNAPSHOTS (for diff/audit history)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS schema_snapshots (
  id            TEXT PRIMARY KEY,
  project_dir   TEXT NOT NULL,
  schema_json   TEXT NOT NULL,
  function_spec TEXT,
  snapshot_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_schema_snapshots_project ON schema_snapshots(project_dir);

-- ═══════════════════════════════════════════
-- DEPLOYMENT CHECKS (audit trail)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS deploy_checks (
  id            TEXT PRIMARY KEY,
  project_dir   TEXT NOT NULL,
  check_type    TEXT NOT NULL,
  passed        INTEGER NOT NULL DEFAULT 0,
  findings      TEXT,
  checked_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_deploy_checks_project ON deploy_checks(project_dir);

-- ═══════════════════════════════════════════
-- AUDIT RESULTS (per-file analysis cache)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_results (
  id            TEXT PRIMARY KEY,
  project_dir   TEXT NOT NULL,
  audit_type    TEXT NOT NULL,
  file_path     TEXT,
  issues_json   TEXT NOT NULL,
  issue_count   INTEGER NOT NULL DEFAULT 0,
  audited_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_results_project ON audit_results(project_dir);
CREATE INDEX IF NOT EXISTS idx_audit_results_type ON audit_results(audit_type);
`;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dir = join(homedir(), ".convex-mcp-nodebench");
  mkdirSync(dir, { recursive: true });
  _db = new Database(join(dir, "convex.db"));
  _db.exec(SCHEMA_SQL);
  return _db;
}

export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function seedGotchasIfEmpty(gotchas: Array<{ key: string; content: string; category: string; severity: string; tags: string }>) {
  const db = getDb();

  // Upsert: insert new seed gotchas, skip user-created ones (source != 'seed')
  const upsert = db.prepare(
    `INSERT INTO convex_gotchas (key, content, category, severity, tags, source)
     VALUES (?, ?, ?, ?, ?, 'seed')
     ON CONFLICT(key) DO UPDATE SET
       content = excluded.content,
       category = excluded.category,
       severity = excluded.severity,
       tags = excluded.tags,
       updated_at = datetime('now')
     WHERE source = 'seed'`
  );
  const tx = db.transaction(() => {
    for (const g of gotchas) {
      upsert.run(g.key, g.content, g.category, g.severity, g.tags);
    }
  });
  tx();
}
