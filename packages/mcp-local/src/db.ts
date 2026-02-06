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
-- VERIFICATION CYCLES (6-Phase)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS verification_cycles (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  current_phase INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS verification_phases (
  id            TEXT PRIMARY KEY,
  cycle_id      TEXT NOT NULL REFERENCES verification_cycles(id) ON DELETE CASCADE,
  phase_number  INTEGER NOT NULL,
  phase_name    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  findings      TEXT,
  started_at    TEXT,
  completed_at  TEXT,
  UNIQUE(cycle_id, phase_number)
);

CREATE TABLE IF NOT EXISTS gaps (
  id            TEXT PRIMARY KEY,
  cycle_id      TEXT NOT NULL REFERENCES verification_cycles(id) ON DELETE CASCADE,
  severity      TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  root_cause    TEXT,
  fix_strategy  TEXT,
  status        TEXT NOT NULL DEFAULT 'open',
  resolved_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS test_results (
  id            TEXT PRIMARY KEY,
  cycle_id      TEXT NOT NULL REFERENCES verification_cycles(id) ON DELETE CASCADE,
  layer         TEXT NOT NULL,
  label         TEXT NOT NULL,
  passed        INTEGER NOT NULL DEFAULT 0,
  output        TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════
-- EVAL RUNS (Eval-Driven Development)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS eval_runs (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  summary       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT
);

CREATE TABLE IF NOT EXISTS eval_cases (
  id            TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  input         TEXT NOT NULL,
  intent        TEXT NOT NULL,
  expected      TEXT,
  actual        TEXT,
  telemetry     TEXT,
  verdict       TEXT,
  judge_notes   TEXT,
  score         REAL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════
-- QUALITY GATES (Boolean Check Pattern)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS quality_gate_runs (
  id            TEXT PRIMARY KEY,
  gate_name     TEXT NOT NULL,
  target        TEXT,
  passed        INTEGER NOT NULL DEFAULT 0,
  score         REAL,
  total_rules   INTEGER NOT NULL DEFAULT 0,
  failures      TEXT,
  rule_results  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════
-- LEARNINGS (Agent Memory, reframed)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS learnings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  key           TEXT NOT NULL UNIQUE,
  content       TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'general',
  tags          TEXT,
  source_cycle  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS learnings_fts USING fts5(
  key,
  content,
  category,
  content='learnings',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS learnings_fts_insert AFTER INSERT ON learnings BEGIN
  INSERT INTO learnings_fts(rowid, key, content, category)
  VALUES (new.id, new.key, new.content, new.category);
END;

CREATE TRIGGER IF NOT EXISTS learnings_fts_delete AFTER DELETE ON learnings BEGIN
  INSERT INTO learnings_fts(learnings_fts, rowid, key, content, category)
  VALUES ('delete', old.id, old.key, old.content, old.category);
END;

CREATE TRIGGER IF NOT EXISTS learnings_fts_update AFTER UPDATE ON learnings BEGIN
  INSERT INTO learnings_fts(learnings_fts, rowid, key, content, category)
  VALUES ('delete', old.id, old.key, old.content, old.category);
  INSERT INTO learnings_fts(rowid, key, content, category)
  VALUES (new.id, new.key, new.content, new.category);
END;

-- ═══════════════════════════════════════════
-- RECONNAISSANCE (Research & Context Gathering)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recon_sessions (
  id            TEXT PRIMARY KEY,
  target        TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT
);

CREATE TABLE IF NOT EXISTS recon_findings (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES recon_sessions(id) ON DELETE CASCADE,
  source_url    TEXT,
  category      TEXT NOT NULL,
  summary       TEXT NOT NULL,
  relevance     TEXT,
  action_items  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recon_findings_session ON recon_findings(session_id);
CREATE INDEX IF NOT EXISTS idx_recon_findings_category ON recon_findings(category);

-- ═══════════════════════════════════════════
-- PROJECT CONTEXT (Persistent project metadata)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS project_context (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════
-- TOOL CALL LOG (Self-Reinforced Learning)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tool_call_log (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  tool_name     TEXT NOT NULL,
  args_hash     TEXT,
  result_status TEXT NOT NULL DEFAULT 'success',
  duration_ms   INTEGER NOT NULL DEFAULT 0,
  error         TEXT,
  phase         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tool_call_log_session ON tool_call_log(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_call_log_tool ON tool_call_log(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_call_log_created ON tool_call_log(created_at);

-- ═══════════════════════════════════════════
-- PARALLEL AGENT COORDINATION
-- Based on Anthropic "Building a C Compiler with Parallel Claudes" (Feb 2026)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_tasks (
  id            TEXT PRIMARY KEY,
  task_key      TEXT NOT NULL,
  session_id    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'claimed',
  description   TEXT,
  progress_note TEXT,
  claimed_at    TEXT NOT NULL DEFAULT (datetime('now')),
  released_at   TEXT,
  UNIQUE(task_key, session_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_key ON agent_tasks(task_key);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);

CREATE TABLE IF NOT EXISTS agent_roles (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL,
  instructions  TEXT,
  focus_area    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS context_budget_log (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  tokens_used   INTEGER NOT NULL DEFAULT 0,
  tokens_limit  INTEGER NOT NULL DEFAULT 200000,
  description   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_context_budget_session ON context_budget_log(session_id);

CREATE TABLE IF NOT EXISTS oracle_comparisons (
  id            TEXT PRIMARY KEY,
  test_label    TEXT NOT NULL,
  oracle_source TEXT NOT NULL,
  actual_output TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  match         INTEGER NOT NULL DEFAULT 0,
  diff_summary  TEXT,
  session_id    TEXT,
  cycle_id      TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_oracle_comparisons_label ON oracle_comparisons(test_label);
`;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dir = join(homedir(), ".nodebench");
  mkdirSync(dir, { recursive: true });
  _db = new Database(join(dir, "nodebench.db"));
  _db.exec(SCHEMA_SQL);
  return _db;
}

export function isFirstRun(): boolean {
  const db = getDb();
  const ctx = db.prepare("SELECT COUNT(*) as c FROM project_context").get() as any;
  return ctx.c === 0;
}

export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
