import Database from "better-sqlite3";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
let _db = null;
const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;

-- ═══════════════════════════════════════════
-- SANDBOX POLICIES
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS openclaw_policies (
  id                TEXT PRIMARY KEY,
  policy_name       TEXT NOT NULL UNIQUE,
  allowed_tools     TEXT NOT NULL DEFAULT '[]',
  blocked_tools     TEXT NOT NULL DEFAULT '[]',
  max_calls         INTEGER NOT NULL DEFAULT 100,
  max_duration_min  INTEGER NOT NULL DEFAULT 30,
  max_concurrent    INTEGER NOT NULL DEFAULT 1,
  monitoring_level  TEXT NOT NULL DEFAULT 'standard',
  forbidden_patterns TEXT NOT NULL DEFAULT '[]',
  require_approval  TEXT NOT NULL DEFAULT '[]',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════
-- SESSIONS
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS openclaw_sessions (
  id             TEXT PRIMARY KEY,
  policy_name    TEXT NOT NULL,
  deployment     TEXT NOT NULL DEFAULT 'local',
  session_label  TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  total_calls    INTEGER NOT NULL DEFAULT 0,
  violations     INTEGER NOT NULL DEFAULT 0,
  started_at     TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at       TEXT,
  end_reason     TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON openclaw_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_policy ON openclaw_sessions(policy_name);

-- ═══════════════════════════════════════════
-- AUDIT LOG (every proxied call)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS openclaw_audit_log (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL,
  skill_name       TEXT NOT NULL,
  args             TEXT,
  result_status    TEXT NOT NULL,
  violation_type   TEXT,
  violation_detail TEXT,
  duration_ms      REAL,
  justification    TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES openclaw_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_session ON openclaw_audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_status ON openclaw_audit_log(result_status);

-- ═══════════════════════════════════════════
-- WORKFLOW AUDITS
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workflow_audits (
  id             TEXT PRIMARY KEY,
  workflow_name  TEXT NOT NULL,
  audit_type     TEXT NOT NULL,
  findings       TEXT NOT NULL DEFAULT '[]',
  risk_score     REAL NOT NULL DEFAULT 0,
  audited_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════
-- SKILL RISK PROFILES
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skill_risk_profiles (
  id               TEXT PRIMARY KEY,
  skill_name       TEXT NOT NULL UNIQUE,
  permission_scope TEXT NOT NULL DEFAULT 'moderate',
  trust_score      REAL NOT NULL DEFAULT 50,
  known_vulns      TEXT NOT NULL DEFAULT '[]',
  last_audited     TEXT
);

-- ═══════════════════════════════════════════
-- OPENCLAW GOTCHAS (Persistent knowledge base)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS openclaw_gotchas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  key           TEXT NOT NULL UNIQUE,
  content       TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'general',
  severity      TEXT NOT NULL DEFAULT 'warning',
  tags          TEXT,
  source        TEXT NOT NULL DEFAULT 'seed',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS openclaw_gotchas_fts USING fts5(
  key,
  content,
  category,
  tags,
  content='openclaw_gotchas',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS gotchas_fts_insert AFTER INSERT ON openclaw_gotchas BEGIN
  INSERT INTO openclaw_gotchas_fts(rowid, key, content, category, tags)
  VALUES (new.id, new.key, new.content, new.category, COALESCE(new.tags, ''));
END;

CREATE TRIGGER IF NOT EXISTS gotchas_fts_delete AFTER DELETE ON openclaw_gotchas BEGIN
  INSERT INTO openclaw_gotchas_fts(openclaw_gotchas_fts, rowid, key, content, category, tags)
  VALUES ('delete', old.id, old.key, old.content, old.category, COALESCE(old.tags, ''));
END;

CREATE TRIGGER IF NOT EXISTS gotchas_fts_update AFTER UPDATE ON openclaw_gotchas BEGIN
  INSERT INTO openclaw_gotchas_fts(openclaw_gotchas_fts, rowid, key, content, category, tags)
  VALUES ('delete', old.id, old.key, old.content, old.category, COALESCE(old.tags, ''));
  INSERT INTO openclaw_gotchas_fts(rowid, key, content, category, tags)
  VALUES (new.id, new.key, new.content, new.category, COALESCE(new.tags, ''));
END;
`;
export function getDb() {
    if (_db)
        return _db;
    const dir = join(homedir(), ".openclaw-mcp-nodebench");
    mkdirSync(dir, { recursive: true });
    _db = new Database(join(dir, "openclaw.db"));
    _db.exec(SCHEMA_SQL);
    return _db;
}
export function genId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
export function seedGotchasIfEmpty(gotchas) {
    const db = getDb();
    const upsert = db.prepare(`INSERT INTO openclaw_gotchas (key, content, category, severity, tags, source)
     VALUES (?, ?, ?, ?, ?, 'seed')
     ON CONFLICT(key) DO UPDATE SET
       content = excluded.content,
       category = excluded.category,
       severity = excluded.severity,
       tags = excluded.tags,
       updated_at = datetime('now')
     WHERE source = 'seed'`);
    const tx = db.transaction(() => {
        for (const g of gotchas) {
            upsert.run(g.key, g.content, g.category, g.severity, g.tags);
        }
    });
    tx();
}
//# sourceMappingURL=db.js.map