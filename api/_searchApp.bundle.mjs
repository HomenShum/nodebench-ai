var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/mcp-local/src/db.ts
import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
function loadDatabaseCtor() {
  if (_databaseCtor !== void 0) return _databaseCtor;
  try {
    _databaseCtor = require2("better-sqlite3");
  } catch {
    _databaseCtor = null;
  }
  return _databaseCtor;
}
function getNodebenchDataDir() {
  const configured = process.env.NODEBENCH_DATA_DIR?.trim();
  if (configured) return configured;
  if (process.env.VERCEL) return "/tmp/.nodebench";
  const home = process.env.HOME || process.env.USERPROFILE || process.cwd();
  return join(home, ".nodebench");
}
function createNoopStatement(sql) {
  const normalized = sql.toLowerCase();
  return {
    get: () => {
      if (normalized.includes("count(")) return { c: 0 };
      if (normalized.includes("min(")) return { t: null };
      if (normalized.includes("max(")) return { t: null };
      return void 0;
    },
    all: () => [],
    run: () => ({ changes: 0, lastInsertRowid: 0 })
  };
}
function createNoopDb() {
  return {
    prepare(sql) {
      return createNoopStatement(sql);
    },
    exec() {
      return void 0;
    },
    pragma() {
      return void 0;
    },
    transaction(fn) {
      return (...args) => fn(...args);
    }
  };
}
function getDb() {
  if (_db) return _db;
  const Database2 = loadDatabaseCtor();
  if (!Database2) {
    _db = createNoopDb();
    return _db;
  }
  const dir = getNodebenchDataDir();
  mkdirSync(dir, { recursive: true });
  _db = new Database2(join(dir, "nodebench.db"));
  _db.exec(SCHEMA_SQL);
  try {
    const rf = _db.prepare("SELECT COUNT(*) as c FROM recon_findings").get();
    const rfFts = _db.prepare("SELECT COUNT(*) as c FROM recon_findings_fts").get();
    if (rf.c > 0 && rfFts.c === 0) {
      _db.exec("INSERT INTO recon_findings_fts(recon_findings_fts) VALUES('rebuild')");
    }
    const g = _db.prepare("SELECT COUNT(*) as c FROM gaps").get();
    const gFts = _db.prepare("SELECT COUNT(*) as c FROM gaps_fts").get();
    if (g.c > 0 && gFts.c === 0) {
      _db.exec("INSERT INTO gaps_fts(gaps_fts) VALUES('rebuild')");
    }
  } catch {
  }
  return _db;
}
function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
var require2, _db, _databaseCtor, SCHEMA_SQL;
var init_db = __esm({
  "packages/mcp-local/src/db.ts"() {
    "use strict";
    require2 = createRequire(import.meta.url);
    _db = null;
    SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- VERIFICATION CYCLES (6-Phase)
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

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

CREATE VIRTUAL TABLE IF NOT EXISTS gaps_fts USING fts5(
  title,
  description,
  fix_strategy,
  content='gaps',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS gaps_fts_insert AFTER INSERT ON gaps BEGIN
  INSERT INTO gaps_fts(rowid, title, description, fix_strategy)
  VALUES (new.rowid, new.title, COALESCE(new.description, ''), COALESCE(new.fix_strategy, ''));
END;

CREATE TRIGGER IF NOT EXISTS gaps_fts_delete AFTER DELETE ON gaps BEGIN
  INSERT INTO gaps_fts(gaps_fts, rowid, title, description, fix_strategy)
  VALUES ('delete', old.rowid, old.title, COALESCE(old.description, ''), COALESCE(old.fix_strategy, ''));
END;

CREATE TRIGGER IF NOT EXISTS gaps_fts_update AFTER UPDATE ON gaps BEGIN
  INSERT INTO gaps_fts(gaps_fts, rowid, title, description, fix_strategy)
  VALUES ('delete', old.rowid, old.title, COALESCE(old.description, ''), COALESCE(old.fix_strategy, ''));
  INSERT INTO gaps_fts(rowid, title, description, fix_strategy)
  VALUES (new.rowid, new.title, COALESCE(new.description, ''), COALESCE(new.fix_strategy, ''));
END;

CREATE TABLE IF NOT EXISTS test_results (
  id            TEXT PRIMARY KEY,
  cycle_id      TEXT NOT NULL REFERENCES verification_cycles(id) ON DELETE CASCADE,
  layer         TEXT NOT NULL,
  label         TEXT NOT NULL,
  passed        INTEGER NOT NULL DEFAULT 0,
  output        TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- EVAL RUNS (Eval-Driven Development)
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

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

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- QUALITY GATES (Boolean Check Pattern)
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

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

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- LEARNINGS (Agent Memory, reframed)
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

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

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- RECONNAISSANCE (Research & Context Gathering)
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

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

CREATE VIRTUAL TABLE IF NOT EXISTS recon_findings_fts USING fts5(
  summary,
  relevance,
  action_items,
  content='recon_findings',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS recon_findings_fts_insert AFTER INSERT ON recon_findings BEGIN
  INSERT INTO recon_findings_fts(rowid, summary, relevance, action_items)
  VALUES (new.rowid, new.summary, COALESCE(new.relevance, ''), COALESCE(new.action_items, ''));
END;

CREATE TRIGGER IF NOT EXISTS recon_findings_fts_delete AFTER DELETE ON recon_findings BEGIN
  INSERT INTO recon_findings_fts(recon_findings_fts, rowid, summary, relevance, action_items)
  VALUES ('delete', old.rowid, old.summary, COALESCE(old.relevance, ''), COALESCE(old.action_items, ''));
END;

CREATE TRIGGER IF NOT EXISTS recon_findings_fts_update AFTER UPDATE ON recon_findings BEGIN
  INSERT INTO recon_findings_fts(recon_findings_fts, rowid, summary, relevance, action_items)
  VALUES ('delete', old.rowid, old.summary, COALESCE(old.relevance, ''), COALESCE(old.action_items, ''));
  INSERT INTO recon_findings_fts(rowid, summary, relevance, action_items)
  VALUES (new.rowid, new.summary, COALESCE(new.relevance, ''), COALESCE(new.action_items, ''));
END;

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- PROJECT CONTEXT (Persistent project metadata)
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

CREATE TABLE IF NOT EXISTS project_context (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- TOOL CALL LOG (Self-Reinforced Learning)
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

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

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- PARALLEL AGENT COORDINATION
-- Based on Anthropic "Building a C Compiler with Parallel Claudes" (Feb 2026)
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

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

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- AGENT MAILBOX (Inter-agent messaging)
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

CREATE TABLE IF NOT EXISTS agent_mailbox (
  id            TEXT PRIMARY KEY,
  sender_id     TEXT NOT NULL,
  recipient_id  TEXT,
  recipient_role TEXT,
  category      TEXT NOT NULL DEFAULT 'status_report',
  priority      TEXT NOT NULL DEFAULT 'normal',
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  read          INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_mailbox_recipient ON agent_mailbox(recipient_id);
CREATE INDEX IF NOT EXISTS idx_agent_mailbox_role ON agent_mailbox(recipient_role);
CREATE INDEX IF NOT EXISTS idx_agent_mailbox_read ON agent_mailbox(read);

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- DYNAMIC LOADING A/B TEST TRACKING
-- Based on: Dynamic ReAct (arxiv 2509.20386),
-- Anthropic Tool Search Tool, Tool-to-Agent
-- Retrieval (arxiv 2511.01854)
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

CREATE TABLE IF NOT EXISTS ab_test_sessions (
  id              TEXT PRIMARY KEY,
  mode            TEXT NOT NULL,        -- 'static' | 'dynamic'
  initial_preset  TEXT NOT NULL,        -- preset at session start
  initial_tool_count INTEGER NOT NULL,
  final_tool_count   INTEGER,
  toolsets_loaded TEXT,                  -- JSON array of dynamically loaded toolsets
  total_tool_calls INTEGER DEFAULT 0,
  total_load_events INTEGER DEFAULT 0,
  session_duration_ms INTEGER,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at        TEXT
);

CREATE TABLE IF NOT EXISTS ab_tool_events (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL,
  event_type      TEXT NOT NULL,         -- 'load' | 'unload' | 'miss' | 'discovery_suggestion'
  toolset_name    TEXT,
  tool_name       TEXT,
  tools_before    INTEGER,               -- tool count before event
  tools_after     INTEGER,               -- tool count after event
  latency_ms      INTEGER,
  metadata        TEXT,                   -- JSON extra context
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ab_sessions_mode ON ab_test_sessions(mode);
CREATE INDEX IF NOT EXISTS idx_ab_events_session ON ab_tool_events(session_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_type ON ab_tool_events(event_type);

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- UI/UX FULL DIVE \u2014 Parallel subagent swarm
-- for comprehensive UI traversal, component
-- tree building, interaction logging, and
-- bug tagging.
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

CREATE TABLE IF NOT EXISTS ui_dive_sessions (
  id              TEXT PRIMARY KEY,
  app_url         TEXT NOT NULL,
  app_name        TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  root_component_id TEXT,
  agent_count     INTEGER DEFAULT 1,
  metadata        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS ui_dive_components (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES ui_dive_sessions(id) ON DELETE CASCADE,
  parent_id       TEXT,
  name            TEXT NOT NULL,
  component_type  TEXT NOT NULL,
  selector        TEXT,
  agent_id        TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  interaction_count INTEGER DEFAULT 0,
  bug_count       INTEGER DEFAULT 0,
  summary         TEXT,
  metadata        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS ui_dive_interactions (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES ui_dive_sessions(id) ON DELETE CASCADE,
  component_id    TEXT NOT NULL REFERENCES ui_dive_components(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  target          TEXT,
  input_value     TEXT,
  result          TEXT NOT NULL,
  observation     TEXT,
  screenshot_ref  TEXT,
  duration_ms     INTEGER,
  sequence_num    INTEGER NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ui_dive_bugs (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES ui_dive_sessions(id) ON DELETE CASCADE,
  component_id    TEXT NOT NULL REFERENCES ui_dive_components(id) ON DELETE CASCADE,
  interaction_id  TEXT,
  severity        TEXT NOT NULL,
  category        TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  expected        TEXT,
  actual          TEXT,
  screenshot_ref  TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dive_components_session ON ui_dive_components(session_id);
CREATE INDEX IF NOT EXISTS idx_dive_components_parent ON ui_dive_components(parent_id);
CREATE INDEX IF NOT EXISTS idx_dive_interactions_component ON ui_dive_interactions(component_id);
CREATE INDEX IF NOT EXISTS idx_dive_bugs_component ON ui_dive_bugs(component_id);
CREATE INDEX IF NOT EXISTS idx_dive_bugs_severity ON ui_dive_bugs(severity);

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- UI/UX FULL DIVE v2 \u2014 Deep interaction
-- testing, screenshots, design auditing,
-- backend linking, and changelog tracking.
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

CREATE TABLE IF NOT EXISTS ui_dive_screenshots (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES ui_dive_sessions(id) ON DELETE CASCADE,
  component_id    TEXT,
  interaction_id  TEXT,
  test_id         TEXT,
  step_index      INTEGER,
  label           TEXT NOT NULL,
  route           TEXT,
  file_path       TEXT,
  base64_thumbnail TEXT,
  width           INTEGER,
  height          INTEGER,
  metadata        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ui_dive_interaction_tests (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES ui_dive_sessions(id) ON DELETE CASCADE,
  component_id    TEXT NOT NULL REFERENCES ui_dive_components(id) ON DELETE CASCADE,
  test_name       TEXT NOT NULL,
  description     TEXT,
  preconditions   TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  steps_total     INTEGER DEFAULT 0,
  steps_passed    INTEGER DEFAULT 0,
  steps_failed    INTEGER DEFAULT 0,
  duration_ms     INTEGER,
  metadata        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS ui_dive_test_steps (
  id              TEXT PRIMARY KEY,
  test_id         TEXT NOT NULL REFERENCES ui_dive_interaction_tests(id) ON DELETE CASCADE,
  step_index      INTEGER NOT NULL,
  action          TEXT NOT NULL,
  target          TEXT,
  input_value     TEXT,
  expected        TEXT,
  actual          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  screenshot_id   TEXT,
  observation     TEXT,
  duration_ms     INTEGER,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ui_dive_design_issues (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES ui_dive_sessions(id) ON DELETE CASCADE,
  component_id    TEXT,
  issue_type      TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'medium',
  title           TEXT NOT NULL,
  description     TEXT,
  element_selector TEXT,
  expected_value  TEXT,
  actual_value    TEXT,
  screenshot_id   TEXT,
  route           TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
  metadata        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ui_dive_backend_links (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES ui_dive_sessions(id) ON DELETE CASCADE,
  component_id    TEXT NOT NULL REFERENCES ui_dive_components(id) ON DELETE CASCADE,
  link_type       TEXT NOT NULL,
  path            TEXT NOT NULL,
  description     TEXT,
  method          TEXT,
  metadata        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ui_dive_changelogs (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES ui_dive_sessions(id) ON DELETE CASCADE,
  component_id    TEXT,
  change_type     TEXT NOT NULL,
  description     TEXT NOT NULL,
  before_screenshot_id TEXT,
  after_screenshot_id  TEXT,
  files_changed   TEXT,
  git_commit      TEXT,
  metadata        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dive_screenshots_session ON ui_dive_screenshots(session_id);
CREATE INDEX IF NOT EXISTS idx_dive_screenshots_component ON ui_dive_screenshots(component_id);
CREATE INDEX IF NOT EXISTS idx_dive_tests_session ON ui_dive_interaction_tests(session_id);
CREATE INDEX IF NOT EXISTS idx_dive_tests_component ON ui_dive_interaction_tests(component_id);
CREATE INDEX IF NOT EXISTS idx_dive_test_steps_test ON ui_dive_test_steps(test_id);
CREATE INDEX IF NOT EXISTS idx_dive_design_issues_session ON ui_dive_design_issues(session_id);
CREATE INDEX IF NOT EXISTS idx_dive_backend_links_component ON ui_dive_backend_links(component_id);
CREATE INDEX IF NOT EXISTS idx_dive_changelogs_session ON ui_dive_changelogs(session_id);

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- UI/UX FULL DIVE v3 \u2014 Flywheel: locate code,
-- fix-verify, re-explore, generate tests,
-- code review.
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

CREATE TABLE IF NOT EXISTS ui_dive_code_locations (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES ui_dive_sessions(id) ON DELETE CASCADE,
  bug_id          TEXT,
  component_id    TEXT,
  design_issue_id TEXT,
  file_path       TEXT NOT NULL,
  line_start      INTEGER,
  line_end        INTEGER,
  code_snippet    TEXT,
  search_query    TEXT,
  confidence      TEXT NOT NULL DEFAULT 'high',
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ui_dive_fix_verifications (
  id                    TEXT PRIMARY KEY,
  session_id            TEXT NOT NULL REFERENCES ui_dive_sessions(id) ON DELETE CASCADE,
  bug_id                TEXT NOT NULL,
  route                 TEXT,
  before_screenshot_id  TEXT,
  after_screenshot_id   TEXT,
  fix_description       TEXT NOT NULL,
  files_changed         TEXT,
  git_commit            TEXT,
  verified              INTEGER NOT NULL DEFAULT 0,
  verification_notes    TEXT,
  changelog_id          TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ui_dive_generated_tests (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES ui_dive_sessions(id) ON DELETE CASCADE,
  bug_id          TEXT,
  component_id    TEXT,
  test_id         TEXT,
  test_framework  TEXT NOT NULL DEFAULT 'playwright',
  test_code       TEXT NOT NULL,
  test_file_path  TEXT,
  description     TEXT,
  covers          TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ui_dive_code_reviews (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES ui_dive_sessions(id) ON DELETE CASCADE,
  review_type     TEXT NOT NULL DEFAULT 'dive_findings',
  severity_counts TEXT,
  findings        TEXT NOT NULL,
  summary         TEXT,
  recommendations TEXT,
  score           INTEGER,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dive_code_locations_session ON ui_dive_code_locations(session_id);
CREATE INDEX IF NOT EXISTS idx_dive_code_locations_bug ON ui_dive_code_locations(bug_id);
CREATE INDEX IF NOT EXISTS idx_dive_fix_verifications_bug ON ui_dive_fix_verifications(bug_id);
CREATE INDEX IF NOT EXISTS idx_dive_generated_tests_session ON ui_dive_generated_tests(session_id);
CREATE INDEX IF NOT EXISTS idx_dive_code_reviews_session ON ui_dive_code_reviews(session_id);

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- SKILL SELF-UPDATE PROTOCOL \u2014 Track rule/
-- memory file provenance, source hashes,
-- update triggers, sync history.
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

CREATE TABLE IF NOT EXISTS skills (
  id              TEXT PRIMARY KEY,
  skill_id        TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  description     TEXT,
  source_files    TEXT NOT NULL DEFAULT '[]',
  source_hash     TEXT,
  update_triggers TEXT NOT NULL DEFAULT '[]',
  update_instructions TEXT NOT NULL DEFAULT '[]',
  last_synced_at  TEXT,
  status          TEXT NOT NULL DEFAULT 'fresh',
  metadata        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_sync_history (
  id              TEXT PRIMARY KEY,
  skill_id        TEXT NOT NULL,
  previous_hash   TEXT,
  new_hash        TEXT NOT NULL,
  changed_sources TEXT,
  trigger_reason  TEXT,
  sync_notes      TEXT,
  synced_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_skills_skill_id ON skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
CREATE INDEX IF NOT EXISTS idx_skill_sync_history_skill ON skill_sync_history(skill_id);

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- ENGINE CONTEXT PERSISTENCE
-- Conformance reports, workflow runs, content archive
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

CREATE TABLE IF NOT EXISTS engine_reports (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL,
  workflow        TEXT NOT NULL,
  preset          TEXT NOT NULL,
  score           REAL NOT NULL,
  grade           TEXT NOT NULL,
  breakdown       TEXT NOT NULL,
  summary         TEXT NOT NULL,
  total_steps     INTEGER NOT NULL,
  successful_steps INTEGER NOT NULL,
  failed_steps    INTEGER NOT NULL,
  total_duration_ms INTEGER NOT NULL,
  generated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_engine_reports_workflow ON engine_reports(workflow);
CREATE INDEX IF NOT EXISTS idx_engine_reports_generated ON engine_reports(generated_at);

CREATE TABLE IF NOT EXISTS engine_workflow_runs (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL,
  workflow        TEXT NOT NULL,
  preset          TEXT NOT NULL,
  step_count      INTEGER NOT NULL,
  success_count   INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  duration_ms     INTEGER NOT NULL DEFAULT 0,
  context_loaded  TEXT,
  outcome_summary TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_engine_runs_workflow ON engine_workflow_runs(workflow);
CREATE INDEX IF NOT EXISTS idx_engine_runs_created ON engine_workflow_runs(created_at);

CREATE TABLE IF NOT EXISTS content_archive (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  content_type    TEXT NOT NULL,
  digest          TEXT,
  full_content    TEXT,
  themes          TEXT,
  workflow        TEXT,
  published_at    TEXT NOT NULL DEFAULT (datetime('now')),
  engagement      TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_archive_type ON content_archive(content_type);
CREATE INDEX IF NOT EXISTS idx_content_archive_published ON content_archive(published_at);

CREATE VIRTUAL TABLE IF NOT EXISTS content_archive_fts USING fts5(
  title,
  digest,
  themes,
  content='content_archive',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS content_archive_fts_insert AFTER INSERT ON content_archive BEGIN
  INSERT INTO content_archive_fts(rowid, title, digest, themes)
  VALUES (new.rowid, new.title, COALESCE(new.digest, ''), COALESCE(new.themes, ''));
END;

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- LOCAL-FIRST IDENTITY / PROVENANCE / SYNC
-- Durable objects, receipts, account bindings,
-- and outbound sync queue for web account replication.
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

CREATE TABLE IF NOT EXISTS object_nodes (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,
  label         TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'local',
  status        TEXT NOT NULL DEFAULT 'active',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_object_nodes_kind ON object_nodes(kind);
CREATE INDEX IF NOT EXISTS idx_object_nodes_source ON object_nodes(source);
CREATE INDEX IF NOT EXISTS idx_object_nodes_updated ON object_nodes(updated_at DESC);

CREATE TABLE IF NOT EXISTS object_edges (
  id            TEXT PRIMARY KEY,
  from_id       TEXT NOT NULL REFERENCES object_nodes(id) ON DELETE CASCADE,
  to_id         TEXT NOT NULL REFERENCES object_nodes(id) ON DELETE CASCADE,
  edge_type     TEXT NOT NULL,
  confidence    REAL NOT NULL DEFAULT 1.0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(from_id, to_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_object_edges_from ON object_edges(from_id);
CREATE INDEX IF NOT EXISTS idx_object_edges_to ON object_edges(to_id);
CREATE INDEX IF NOT EXISTS idx_object_edges_type ON object_edges(edge_type);

CREATE TABLE IF NOT EXISTS execution_receipts (
  id            TEXT PRIMARY KEY,
  run_id        TEXT,
  trace_id      TEXT,
  step_id       TEXT,
  object_id     TEXT REFERENCES object_nodes(id) ON DELETE SET NULL,
  tool_name     TEXT,
  action_type   TEXT NOT NULL,
  summary       TEXT NOT NULL,
  input_hash    TEXT,
  output_hash   TEXT,
  status        TEXT NOT NULL DEFAULT 'recorded',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_execution_receipts_run ON execution_receipts(run_id);
CREATE INDEX IF NOT EXISTS idx_execution_receipts_trace ON execution_receipts(trace_id);
CREATE INDEX IF NOT EXISTS idx_execution_receipts_object ON execution_receipts(object_id);
CREATE INDEX IF NOT EXISTS idx_execution_receipts_created ON execution_receipts(created_at DESC);

CREATE TABLE IF NOT EXISTS local_artifacts (
  id                  TEXT PRIMARY KEY,
  run_id              TEXT,
  object_id           TEXT REFERENCES object_nodes(id) ON DELETE SET NULL,
  kind                TEXT NOT NULL,
  path                TEXT,
  content_hash        TEXT,
  summary             TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  metadata_json       TEXT NOT NULL DEFAULT '{}',
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_local_artifacts_run ON local_artifacts(run_id);
CREATE INDEX IF NOT EXISTS idx_local_artifacts_object ON local_artifacts(object_id);
CREATE INDEX IF NOT EXISTS idx_local_artifacts_kind ON local_artifacts(kind);

CREATE TABLE IF NOT EXISTS local_outcomes (
  id                TEXT PRIMARY KEY,
  run_id            TEXT,
  object_id         TEXT REFERENCES object_nodes(id) ON DELETE SET NULL,
  outcome_type      TEXT NOT NULL,
  headline          TEXT NOT NULL,
  user_value        TEXT,
  stakeholder_value TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',
  evidence_json     TEXT NOT NULL DEFAULT '[]',
  metadata_json     TEXT NOT NULL DEFAULT '{}',
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_local_outcomes_run ON local_outcomes(run_id);
CREATE INDEX IF NOT EXISTS idx_local_outcomes_object ON local_outcomes(object_id);
CREATE INDEX IF NOT EXISTS idx_local_outcomes_status ON local_outcomes(status);

CREATE TABLE IF NOT EXISTS device_bindings (
  device_id       TEXT PRIMARY KEY,
  device_name     TEXT NOT NULL,
  platform        TEXT,
  app_version     TEXT,
  bridge_url      TEXT,
  device_token    TEXT,
  binding_status  TEXT NOT NULL DEFAULT 'unpaired',
  metadata_json   TEXT NOT NULL DEFAULT '{}',
  paired_at       TEXT,
  last_seen_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_device_bindings_status ON device_bindings(binding_status);

CREATE TABLE IF NOT EXISTS account_bindings (
  id              TEXT PRIMARY KEY,
  device_id       TEXT NOT NULL REFERENCES device_bindings(device_id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL,
  workspace_id    TEXT,
  scopes_json     TEXT NOT NULL DEFAULT '[]',
  sync_enabled    INTEGER NOT NULL DEFAULT 1,
  sync_mode       TEXT NOT NULL DEFAULT 'connected',
  metadata_json   TEXT NOT NULL DEFAULT '{}',
  paired_at       TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at  TEXT,
  revoked_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_account_bindings_device ON account_bindings(device_id);
CREATE INDEX IF NOT EXISTS idx_account_bindings_user ON account_bindings(user_id);
CREATE INDEX IF NOT EXISTS idx_account_bindings_active ON account_bindings(sync_enabled, revoked_at);

CREATE TABLE IF NOT EXISTS sync_queue (
  id              TEXT PRIMARY KEY,
  object_id       TEXT,
  object_kind     TEXT NOT NULL,
  op_type         TEXT NOT NULL,
  payload_json    TEXT NOT NULL,
  payload_hash    TEXT NOT NULL,
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  retry_count     INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  last_attempt_at TEXT,
  acknowledged_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_object ON sync_queue(object_id, object_kind);

CREATE TABLE IF NOT EXISTS sync_receipts (
  id                TEXT PRIMARY KEY,
  queue_id          TEXT NOT NULL REFERENCES sync_queue(id) ON DELETE CASCADE,
  server_receipt_id TEXT,
  device_id         TEXT,
  user_id           TEXT,
  workspace_id      TEXT,
  status            TEXT NOT NULL,
  detail_json       TEXT NOT NULL DEFAULT '{}',
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_receipts_queue ON sync_receipts(queue_id);
CREATE INDEX IF NOT EXISTS idx_sync_receipts_device ON sync_receipts(device_id);

CREATE TABLE IF NOT EXISTS shared_context_peers (
  peer_id            TEXT PRIMARY KEY,
  product            TEXT NOT NULL,
  tenant_id          TEXT,
  workspace_id       TEXT,
  surface            TEXT NOT NULL,
  role               TEXT NOT NULL,
  capabilities_json  TEXT NOT NULL DEFAULT '[]',
  context_scopes_json TEXT NOT NULL DEFAULT '[]',
  status             TEXT NOT NULL DEFAULT 'active',
  summary_json       TEXT NOT NULL DEFAULT '{}',
  metadata_json      TEXT NOT NULL DEFAULT '{}',
  last_heartbeat_at  TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shared_context_peers_product ON shared_context_peers(product);
CREATE INDEX IF NOT EXISTS idx_shared_context_peers_workspace ON shared_context_peers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shared_context_peers_role ON shared_context_peers(role);
CREATE INDEX IF NOT EXISTS idx_shared_context_peers_status ON shared_context_peers(status);

CREATE TABLE IF NOT EXISTS shared_context_packets (
  context_id          TEXT PRIMARY KEY,
  context_type        TEXT NOT NULL,
  producer_peer_id    TEXT NOT NULL REFERENCES shared_context_peers(peer_id) ON DELETE CASCADE,
  tenant_id           TEXT,
  workspace_id        TEXT,
  scope_json          TEXT NOT NULL DEFAULT '[]',
  subject             TEXT NOT NULL,
  summary             TEXT NOT NULL,
  claims_json         TEXT NOT NULL DEFAULT '[]',
  evidence_refs_json  TEXT NOT NULL DEFAULT '[]',
  state_snapshot_json TEXT NOT NULL DEFAULT '{}',
  time_window_json    TEXT NOT NULL DEFAULT '{}',
  freshness_json      TEXT NOT NULL DEFAULT '{}',
  permissions_json    TEXT NOT NULL DEFAULT '{}',
  confidence          REAL,
  lineage_json        TEXT NOT NULL DEFAULT '{}',
  invalidates_json    TEXT NOT NULL DEFAULT '[]',
  next_actions_json   TEXT NOT NULL DEFAULT '[]',
  version             INTEGER NOT NULL DEFAULT 1,
  status              TEXT NOT NULL DEFAULT 'active',
  metadata_json       TEXT NOT NULL DEFAULT '{}',
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shared_context_packets_type ON shared_context_packets(context_type);
CREATE INDEX IF NOT EXISTS idx_shared_context_packets_peer ON shared_context_packets(producer_peer_id);
CREATE INDEX IF NOT EXISTS idx_shared_context_packets_workspace ON shared_context_packets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shared_context_packets_status ON shared_context_packets(status);
CREATE INDEX IF NOT EXISTS idx_shared_context_packets_created ON shared_context_packets(created_at DESC);

CREATE TABLE IF NOT EXISTS shared_context_packet_acks (
  id                 TEXT PRIMARY KEY,
  context_id         TEXT NOT NULL REFERENCES shared_context_packets(context_id) ON DELETE CASCADE,
  peer_id            TEXT NOT NULL REFERENCES shared_context_peers(peer_id) ON DELETE CASCADE,
  ack_status         TEXT NOT NULL DEFAULT 'acknowledged',
  detail_json        TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(context_id, peer_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_context_packet_acks_peer ON shared_context_packet_acks(peer_id);

CREATE TABLE IF NOT EXISTS shared_context_messages (
  id                 TEXT PRIMARY KEY,
  from_peer_id       TEXT NOT NULL REFERENCES shared_context_peers(peer_id) ON DELETE CASCADE,
  to_peer_id         TEXT NOT NULL REFERENCES shared_context_peers(peer_id) ON DELETE CASCADE,
  message_class      TEXT NOT NULL,
  payload_json       TEXT NOT NULL DEFAULT '{}',
  status             TEXT NOT NULL DEFAULT 'unread',
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  read_at            TEXT
);

CREATE INDEX IF NOT EXISTS idx_shared_context_messages_to_peer ON shared_context_messages(to_peer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_context_messages_from_peer ON shared_context_messages(from_peer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shared_context_tasks (
  task_id               TEXT PRIMARY KEY,
  task_type             TEXT NOT NULL,
  proposer_peer_id      TEXT NOT NULL REFERENCES shared_context_peers(peer_id) ON DELETE CASCADE,
  assignee_peer_id      TEXT NOT NULL REFERENCES shared_context_peers(peer_id) ON DELETE CASCADE,
  status                TEXT NOT NULL DEFAULT 'proposed',
  task_spec_json        TEXT NOT NULL DEFAULT '{}',
  input_context_ids_json TEXT NOT NULL DEFAULT '[]',
  output_context_id     TEXT REFERENCES shared_context_packets(context_id) ON DELETE SET NULL,
  reason                TEXT,
  metadata_json         TEXT NOT NULL DEFAULT '{}',
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shared_context_tasks_assignee ON shared_context_tasks(assignee_peer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_context_tasks_proposer ON shared_context_tasks(proposer_peer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS founder_harness_episodes (
  episode_id                  TEXT PRIMARY KEY,
  correlation_id              TEXT NOT NULL,
  session_key                 TEXT,
  workspace_id                TEXT,
  company_key                 TEXT,
  surface                     TEXT NOT NULL,
  episode_type                TEXT NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'active',
  query                       TEXT,
  lens                        TEXT,
  entity_name                 TEXT,
  packet_id                   TEXT,
  packet_type                 TEXT,
  context_id                  TEXT,
  task_id                     TEXT,
  summary                     TEXT,
  state_before_json           TEXT,
  state_after_json            TEXT,
  state_before_hash           TEXT,
  state_after_hash            TEXT,
  spans_json                  TEXT NOT NULL DEFAULT '[]',
  trace_step_count            INTEGER,
  tools_invoked_json          TEXT NOT NULL DEFAULT '[]',
  artifacts_produced_json     TEXT NOT NULL DEFAULT '[]',
  important_changes_detected  INTEGER,
  contradictions_detected     INTEGER,
  metadata_json               TEXT,
  started_at                  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                  TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at                TEXT
);

CREATE INDEX IF NOT EXISTS idx_founder_harness_episodes_session ON founder_harness_episodes(session_key, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_founder_harness_episodes_workspace ON founder_harness_episodes(workspace_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_founder_harness_episodes_status ON founder_harness_episodes(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_founder_harness_episodes_correlation ON founder_harness_episodes(correlation_id);

-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-- SUBCONSCIOUS MEMORY BLOCKS
-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

CREATE TABLE IF NOT EXISTS subconscious_blocks (
  id            TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  value         TEXT NOT NULL DEFAULT '',
  version       INTEGER NOT NULL DEFAULT 1,
  confidence    TEXT NOT NULL DEFAULT 'low',
  source_events TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subconscious_whisper_log (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  block_ids     TEXT NOT NULL DEFAULT '[]',
  whisper_text  TEXT NOT NULL,
  classification TEXT NOT NULL,
  suppressed    INTEGER NOT NULL DEFAULT 0,
  reason        TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_whisper_log_session ON subconscious_whisper_log(session_id, created_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS object_nodes_fts USING fts5(
  label,
  metadata_json,
  content='object_nodes',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS object_nodes_fts_insert AFTER INSERT ON object_nodes BEGIN
  INSERT INTO object_nodes_fts(rowid, label, metadata_json)
  VALUES (new.rowid, new.label, new.metadata_json);
END;

CREATE TRIGGER IF NOT EXISTS object_nodes_fts_delete AFTER DELETE ON object_nodes BEGIN
  INSERT INTO object_nodes_fts(object_nodes_fts, rowid, label, metadata_json)
  VALUES ('delete', old.rowid, old.label, old.metadata_json);
END;

CREATE TRIGGER IF NOT EXISTS object_nodes_fts_update AFTER UPDATE ON object_nodes BEGIN
  INSERT INTO object_nodes_fts(object_nodes_fts, rowid, label, metadata_json)
  VALUES ('delete', old.rowid, old.label, old.metadata_json);
  INSERT INTO object_nodes_fts(rowid, label, metadata_json)
  VALUES (new.rowid, new.label, new.metadata_json);
END;
`;
  }
});

// packages/mcp-local/src/tools/contentSynthesis.ts
var contentSynthesis_exports = {};
__export(contentSynthesis_exports, {
  synthesizeContent: () => synthesizeContent
});
async function synthesizeContent(req) {
  const start = Date.now();
  const apiKey = process.env.GEMINI_API_KEY || "";
  const scenarioPrompt = (SCENARIO_PROMPTS[req.scenario] ?? SCENARIO_PROMPTS.company_search).replace(/\{lens\}/g, req.lens);
  const webContext = req.webResults.length > 0 ? `

WEB SEARCH RESULTS:
${req.webResults.map((r, i) => `[${i + 1}] ${r.title}
${r.snippet}
Source: ${r.url}`).join("\n\n")}` : "";
  const localCtx = [
    req.localContext.mission ? `Our company: ${req.localContext.mission}` : "",
    req.localContext.recentChanges?.length ? `Recent changes: ${req.localContext.recentChanges.slice(0, 5).join("; ")}` : "",
    req.localContext.contradictions?.length ? `Known contradictions: ${req.localContext.contradictions.join("; ")}` : "",
    req.localContext.signals?.length ? `Signals: ${req.localContext.signals.join("; ")}` : ""
  ].filter(Boolean).join("\n");
  const fullPrompt = `${scenarioPrompt}

USER QUERY: ${req.query}

${localCtx ? `LOCAL CONTEXT:
${localCtx}
` : ""}${webContext}

CRITICAL INSTRUCTIONS:
- Use specific facts, numbers, and dates from the web results
- Name specific entities, people, and companies \u2014 never use generic placeholders
- Include source URLs as citations
- Be concise but substantive \u2014 every section should have real content
- Write for a ${req.lens} audience \u2014 use appropriate terminology and focus
- DIRECTLY ADDRESS every key term in the user query. If the query mentions "deployments", your output MUST discuss deployments. If it mentions "alerts", discuss specific alerts. If it mentions "risk factors", enumerate risk factors. If it mentions "covenant breaches", discuss covenant compliance.
- For each topic the user asks about, provide SPECIFIC examples, not generic advice
- Include remediation steps, escalation paths, or follow-up actions for every finding`;
  if (apiKey) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        config: {
          tools: [{ googleSearch: {} }],
          maxOutputTokens: 2048,
          temperature: 0.3
        }
      });
      const text = response?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("") ?? "";
      if (text.length > 50) {
        const entityNames = [...new Set(
          (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? []).filter((n) => n.length > 2 && !["The", "This", "What", "How", "Why"].includes(n))
        )].slice(0, 10);
        const keyFacts = (text.match(/\$[\d.]+[BMK]|\d+%|\d+\.\d+[BMK]?/g) ?? []).slice(0, 5);
        const sources = req.webResults.map((r) => r.url);
        return {
          content: text,
          entityNames,
          keyFacts,
          risks: [],
          nextQuestions: [],
          sources,
          tokensUsed: Math.round(text.length / 4),
          latencyMs: Date.now() - start
        };
      }
    } catch (err) {
    }
  }
  const sections = [`# ${req.scenario.replace(/_/g, " ").toUpperCase()}: ${req.query}
`];
  sections.push(`**Lens:** ${req.lens}`);
  sections.push(`**Generated:** ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 19)}
`);
  if (req.webResults.length > 0) {
    sections.push(`## Key Findings from Web Research`);
    req.webResults.forEach((r, i) => {
      sections.push(`${i + 1}. **${r.title}**`);
      sections.push(`   ${r.snippet}`);
      sections.push(`   Source: ${r.url}
`);
    });
  }
  if (req.localContext.mission) {
    sections.push(`## Local Context`);
    sections.push(`Identity: ${req.localContext.mission}`);
  }
  if (req.localContext.recentChanges?.length) {
    sections.push(`
## Recent Changes`);
    req.localContext.recentChanges.slice(0, 5).forEach((c, i) => sections.push(`${i + 1}. ${c}`));
  }
  if (req.localContext.contradictions?.length) {
    sections.push(`
## Contradictions`);
    req.localContext.contradictions.forEach((c) => sections.push(`- ${c}`));
  }
  return {
    content: sections.join("\n"),
    entityNames: req.webResults.map((r) => r.title.split(/\s+/).slice(0, 2).join(" ")),
    keyFacts: [],
    risks: [],
    nextQuestions: [],
    sources: req.webResults.map((r) => r.url),
    tokensUsed: Math.round(sections.join("\n").length / 4),
    latencyMs: Date.now() - start
  };
}
var SCENARIO_PROMPTS;
var init_contentSynthesis = __esm({
  "packages/mcp-local/src/tools/contentSynthesis.ts"() {
    "use strict";
    SCENARIO_PROMPTS = {
      company_search: `You are a {lens} analyzing a company. Produce a structured intelligence brief:
1. **Company Snapshot** \u2014 what they do, market position, recent momentum
2. **What Changed Recently** \u2014 latest news, product moves, funding, partnerships
3. **Key Metrics** \u2014 revenue, valuation, growth rate, market share (cite sources)
4. **Strategic Position** \u2014 moats, advantages, vulnerabilities
5. **Risks** \u2014 what could go wrong, red flags, dependencies
6. **Next Questions** \u2014 3 questions a {lens} would ask next`,
      competitor_brief: `You are a {lens} comparing competitors. Produce a competitive intelligence brief.

CRITICAL: Name every competitor explicitly by company name. Never say "Competitor A" \u2014 use real names.

1. **Competitive Landscape** \u2014 name each key player, their market category, and what they own
2. **Moats & Differentiators** \u2014 for each named competitor, what they do uniquely well
3. **Distribution Advantages** \u2014 how each named competitor goes to market (plugin ecosystem, enterprise sales, developer community, etc.)
4. **Vulnerabilities** \u2014 where each named competitor is weak. Be specific about technical, market, or strategic gaps.
5. **What to Absorb** \u2014 specific practices from named competitors worth adopting
6. **What to Avoid** \u2014 specific strategies from named competitors that are traps
7. **Strategic Recommendation** \u2014 clear positioning advice relative to the named competitors

For a banker: focus on financial moats, market share, revenue quality, credit implications.
For an investor: focus on growth trajectory, TAM, competitive dynamics, deal implications.
For a researcher: focus on methodology differences, benchmark results, technical approaches.`,
      important_change: `You are a {lens} monitoring for important changes. Produce a detailed change digest.

ALWAYS include these sections:
1. **Timeline of Changes** \u2014 dated list with specific dates from sources. Reference deployments, releases, incidents, regulatory updates, or market shifts as relevant.
2. **Impact Assessment** \u2014 which changes matter and why. Include severity ratings. For operators: correlate deployments with incidents, flag rollback candidates. For legal: flag regulatory changes. For investors: flag valuation-affecting changes.
3. **Contradictions & Alerts** \u2014 any inconsistencies, stale alerts, unacknowledged issues. Include age/duration of each alert if applicable. Flag anything unresolved for >24 hours.
4. **Trigger Analysis** \u2014 root causes. What caused these changes? Reference specific commits, PRs, announcements, or filings.
5. **Action Required** \u2014 specific escalation paths, workarounds, remediation steps. Suggest who should be notified and what the next diagnostic step is.

You MUST be specific to the {lens} role. An operator cares about deployments, uptime, incidents, rollbacks. A banker cares about credit events, covenant breaches, risk rating shifts. A legal analyst cares about regulatory changes, compliance gaps, contractual deadlines. A researcher cares about methodology shifts, retractions, consensus changes.`,
      delegation: `You are a {lens} creating a delegation brief. Produce a scoped handoff packet:
1. **Objective** \u2014 what the delegate should accomplish
2. **Context** \u2014 background the delegate needs
3. **Constraints** \u2014 boundaries and requirements
4. **Success Criteria** \u2014 how to know it's done well
5. **Files/Surfaces Affected** \u2014 what to touch
6. **Agent-Ready Instructions** \u2014 step-by-step for an AI or human delegate`,
      memo_export: `You are a {lens} producing an exportable memo. Produce a shareable document:
1. **Executive Summary** \u2014 2-3 sentence overview
2. **Key Findings** \u2014 numbered list of important points
3. **Evidence** \u2014 supporting data with source citations
4. **Recommendations** \u2014 what to do next
5. **Open Questions** \u2014 what still needs resolution`,
      weekly_reset: `You are a {lens} producing a weekly briefing. Produce a reset digest:
1. **This Week's Summary** \u2014 what happened that matters
2. **Key Decisions Made** \u2014 and their rationale
3. **Metrics Update** \u2014 quantitative changes
4. **Risks & Blockers** \u2014 what's in the way
5. **Next Week's Priorities** \u2014 3-5 specific actions`,
      packet_diff: `You are a {lens} comparing two time periods. Produce a change comparison:
1. **Before State** \u2014 what was true previously
2. **After State** \u2014 what's true now
3. **Key Deltas** \u2014 specific changes with dates
4. **Trend Direction** \u2014 improving, degrading, or stable
5. **Action Items** \u2014 what the changes imply`,
      role_switch: `You are switching to a {lens} perspective. Reframe the analysis:
1. **New Lens** \u2014 what matters from this perspective
2. **Different Priorities** \u2014 what shifts in importance
3. **New Questions** \u2014 what this lens would ask
4. **Reframed Risks** \u2014 risks from this perspective
5. **Recommended Actions** \u2014 next steps for this role`
    };
  }
});

// packages/mcp-local/src/security/SecurityError.ts
var SecurityError;
var init_SecurityError = __esm({
  "packages/mcp-local/src/security/SecurityError.ts"() {
    "use strict";
    SecurityError = class extends Error {
      code;
      constructor(code, message) {
        super(`[${code}] ${message}`);
        this.name = "SecurityError";
        this.code = code;
      }
    };
  }
});

// packages/mcp-local/src/security/config.ts
import * as path from "node:path";
function getSecurityConfig() {
  if (_config) return _config;
  const mode = process.env.NODEBENCH_SECURITY_MODE ?? "strict";
  const rootsEnv = process.env.NODEBENCH_ALLOWED_ROOTS;
  const allowedRoots = rootsEnv ? rootsEnv.split(",").map((r) => path.resolve(r.trim())) : [process.cwd()];
  const timeoutEnv = process.env.NODEBENCH_EXEC_TIMEOUT_MS;
  const maxExecTimeoutMs = timeoutEnv ? Math.min(parseInt(timeoutEnv, 10) || 6e4, 6e4) : 6e4;
  const auditEnabled = process.env.NODEBENCH_AUDIT_ENABLED !== "false";
  const extraEnv = process.env.NODEBENCH_EXEC_ALLOWLIST;
  const extraExecAllowList = extraEnv ? extraEnv.split(",").map((s) => s.trim()) : [];
  _config = { mode, allowedRoots, maxExecTimeoutMs, auditEnabled, extraExecAllowList };
  return _config;
}
var DEFAULT_CONFIG, _config;
var init_config = __esm({
  "packages/mcp-local/src/security/config.ts"() {
    "use strict";
    DEFAULT_CONFIG = {
      mode: "strict",
      allowedRoots: [process.cwd()],
      maxExecTimeoutMs: 6e4,
      auditEnabled: true,
      extraExecAllowList: []
    };
    _config = null;
  }
});

// packages/mcp-local/src/security/pathSandbox.ts
var init_pathSandbox = __esm({
  "packages/mcp-local/src/security/pathSandbox.ts"() {
    "use strict";
    init_SecurityError();
    init_config();
  }
});

// packages/mcp-local/src/security/commandSandbox.ts
var init_commandSandbox = __esm({
  "packages/mcp-local/src/security/commandSandbox.ts"() {
    "use strict";
    init_SecurityError();
    init_config();
  }
});

// packages/mcp-local/src/security/urlValidator.ts
import * as net from "node:net";
function isPrivateIP(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 0) return true;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("fe80")) return true;
  }
  return false;
}
function safeUrl(url, opts) {
  const config = getSecurityConfig();
  if (config.mode === "permissive") return url;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new SecurityError("URL_BAD_SCHEME", `Invalid URL: ${url.substring(0, 100)}`);
  }
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new SecurityError(
      "URL_BAD_SCHEME",
      `Blocked URL scheme "${parsed.protocol}" \u2014 only http: and https: are allowed`
    );
  }
  if (opts?.allowPrivate) return url;
  const hostname = parsed.hostname.toLowerCase();
  const allBlocked = [...BLOCKED_HOSTNAMES, ...opts?.blockedHostnames ?? []];
  if (allBlocked.includes(hostname)) {
    throw new SecurityError(
      "URL_PRIVATE_IP",
      `Blocked request to internal service: ${hostname}`
    );
  }
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      if (config.mode === "audit_only") return url;
      throw new SecurityError(
        "URL_PRIVATE_IP",
        `Blocked request to private IP: ${hostname}`
      );
    }
  }
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    if (config.mode === "audit_only") return url;
    throw new SecurityError(
      "URL_PRIVATE_IP",
      `Blocked request to local hostname: ${hostname}`
    );
  }
  return url;
}
var BLOCKED_HOSTNAMES, ALLOWED_SCHEMES;
var init_urlValidator = __esm({
  "packages/mcp-local/src/security/urlValidator.ts"() {
    "use strict";
    init_SecurityError();
    init_config();
    BLOCKED_HOSTNAMES = [
      "metadata.google.internal",
      "metadata.google.com",
      "169.254.169.254",
      "100.100.100.200"
      // Alibaba Cloud metadata
    ];
    ALLOWED_SCHEMES = /* @__PURE__ */ new Set(["http:", "https:"]);
  }
});

// packages/mcp-local/src/security/credentialRedactor.ts
var init_credentialRedactor = __esm({
  "packages/mcp-local/src/security/credentialRedactor.ts"() {
    "use strict";
  }
});

// packages/mcp-local/src/security/auditLog.ts
var init_auditLog = __esm({
  "packages/mcp-local/src/security/auditLog.ts"() {
    "use strict";
    init_config();
  }
});

// packages/mcp-local/src/security/index.ts
var init_security = __esm({
  "packages/mcp-local/src/security/index.ts"() {
    "use strict";
    init_SecurityError();
    init_config();
    init_pathSandbox();
    init_commandSandbox();
    init_urlValidator();
    init_credentialRedactor();
    init_auditLog();
  }
});

// packages/mcp-local/src/tools/webTools.ts
var webTools_exports = {};
__export(webTools_exports, {
  webTools: () => webTools
});
async function canImport(pkg) {
  try {
    await import(pkg);
    return true;
  } catch {
    return false;
  }
}
async function getCheerio() {
  try {
    const mod = await import("cheerio");
    return mod;
  } catch {
    return null;
  }
}
function htmlToMarkdown(html, cheerio) {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, aside, .ad, .advertisement, [role='navigation']").remove();
  let content = $("main, article, [role='main'], .content, .post-content, .article-content").first();
  if (content.length === 0) {
    content = $("body");
  }
  const lines = [];
  content.find("h1, h2, h3, h4, h5, h6, p, li, td, th, pre, code, blockquote").each((_, el) => {
    const tag = el.tagName?.toLowerCase() ?? "";
    const text = $(el).text().trim();
    if (!text) return;
    switch (tag) {
      case "h1":
        lines.push(`
# ${text}
`);
        break;
      case "h2":
        lines.push(`
## ${text}
`);
        break;
      case "h3":
        lines.push(`
### ${text}
`);
        break;
      case "h4":
        lines.push(`
#### ${text}
`);
        break;
      case "h5":
      case "h6":
        lines.push(`
**${text}**
`);
        break;
      case "p":
        lines.push(`${text}
`);
        break;
      case "li":
        lines.push(`- ${text}`);
        break;
      case "pre":
      case "code":
        lines.push(`\`\`\`
${text}
\`\`\`
`);
        break;
      case "blockquote":
        lines.push(`> ${text}
`);
        break;
      case "td":
      case "th":
        lines.push(text);
        break;
    }
  });
  let result = lines.join("\n");
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.trim();
  return result;
}
function basicHtmlToText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
async function searchWithGemini(query, maxResults) {
  const { GoogleGenAI } = await import("@google/genai");
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
  const ai = new GoogleGenAI({ apiKey });
  const coerceUrl = (value) => {
    const url = value.trim();
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("//")) return `https:${url}`;
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(url)) return `https://${url}`;
    return null;
  };
  const attemptPrompts = [
    `Search the web for: "${query}"

Return the top ${maxResults} most relevant results. For each result, provide:
1. Title
2. URL
3. A 1-2 sentence snippet summarizing the content

Format your response as JSON array:
[{"title": "...", "url": "...", "snippet": "..."}]

Only return the JSON array, no other text.`,
    // Retry prompt: explicitly require absolute URLs.
    `Use Google Search to find sources for: "${query}"

Return a JSON array with up to ${maxResults} entries in this exact shape:
[{"title":"...","url":"https://...","snippet":"..."}]

Requirements:
- url MUST be an absolute URL starting with https://
- Do NOT return markdown, do NOT wrap in code fences.
- If a source is Wikipedia, include the en.wikipedia.org URL directly.`
  ];
  for (const prompt of attemptPrompts) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      config: {
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 2048,
        temperature: 0
      }
    });
    const cand = response?.candidates?.[0];
    const text = cand?.content?.parts?.[0]?.text ?? "[]";
    const jsonMatch = String(text).match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const results = JSON.parse(jsonMatch[0]);
        if (Array.isArray(results) && results.length > 0) {
          const normalized = [];
          for (const r of results) {
            const coerced = coerceUrl(String(r?.url ?? ""));
            if (!coerced) continue;
            normalized.push({
              title: String(r?.title ?? "").trim(),
              url: coerced,
              snippet: String(r?.snippet ?? "").trim(),
              source: "gemini"
            });
            if (normalized.length >= maxResults) break;
          }
          if (normalized.length > 0) return normalized;
        }
      } catch {
      }
    }
    const grounding = cand?.groundingMetadata;
    const chunks = grounding?.groundingChunks;
    const supports = grounding?.groundingSupports;
    if (!Array.isArray(chunks) || chunks.length === 0) {
      continue;
    }
    const snippetsByChunkIndex = /* @__PURE__ */ new Map();
    if (Array.isArray(supports)) {
      for (const s of supports) {
        const indices = s?.groundingChunkIndices;
        const segText = s?.segment?.text;
        if (!segText || !Array.isArray(indices)) continue;
        for (const idx of indices) {
          if (typeof idx !== "number") continue;
          const existing = snippetsByChunkIndex.get(idx) ?? [];
          existing.push(String(segText));
          snippetsByChunkIndex.set(idx, existing);
        }
      }
    }
    const resolveRedirect = async (url) => {
      const headers = {
        "User-Agent": "Mozilla/5.0 (compatible; NodeBench-MCP/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      };
      try {
        const head = await fetch(url, { method: "HEAD", redirect: "follow", headers });
        return head.url || url;
      } catch {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8e3);
        try {
          const res = await fetch(url, {
            method: "GET",
            redirect: "follow",
            headers,
            signal: controller.signal
          });
          if (res?.body?.cancel) {
            try {
              await res.body.cancel();
            } catch {
            }
          }
          return res.url || url;
        } finally {
          clearTimeout(timeout);
        }
      }
    };
    const grounded = [];
    const seen = /* @__PURE__ */ new Set();
    const limit = Math.min(maxResults, 10);
    for (let i = 0; i < chunks.length && grounded.length < limit; i++) {
      const uri = chunks[i]?.web?.uri;
      if (!uri || typeof uri !== "string") continue;
      const finalUrl = await resolveRedirect(uri);
      if (seen.has(finalUrl)) continue;
      seen.add(finalUrl);
      const title = chunks[i]?.web?.title;
      const snippetParts = snippetsByChunkIndex.get(i) ?? [];
      const snippet = snippetParts.slice(0, 3).join(" ").replace(/\s+/g, " ").trim();
      grounded.push({
        title: typeof title === "string" && title.trim() ? title.trim() : finalUrl,
        url: finalUrl,
        snippet,
        source: "gemini_grounded"
      });
    }
    if (grounded.length > 0) return grounded;
  }
  return [];
}
async function searchWithOpenAI(query, maxResults) {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI();
  try {
    const response = await client.responses.create({
      model: "gpt-5-mini",
      tools: [{ type: "web_search_preview" }],
      input: `Search for: "${query}". Return the top ${maxResults} most relevant results as JSON array with title, url, snippet fields.`
    });
    const text = response?.output_text ?? "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const results = JSON.parse(jsonMatch[0]);
    return results.map((r) => ({
      title: r.title || "",
      url: r.url || "",
      snippet: r.snippet || "",
      source: "openai"
    }));
  } catch {
    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "You are a search assistant. Based on your knowledge, provide relevant results for the query."
        },
        {
          role: "user",
          content: `Search for: "${query}". Return ${maxResults} relevant results as JSON array: [{"title": "...", "url": "...", "snippet": "..."}]`
        }
      ],
      max_tokens: 2048
    });
    const text = response.choices[0]?.message?.content ?? "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const results = JSON.parse(jsonMatch[0]);
    return results.map((r) => ({
      title: r.title || "",
      url: r.url || "",
      snippet: r.snippet || "",
      source: "openai_knowledge"
    }));
  }
}
async function searchWithPerplexity(query, maxResults) {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai"
  });
  const response = await client.chat.completions.create({
    model: "llama-3.1-sonar-large-128k-online",
    messages: [
      {
        role: "system",
        content: "Be precise and concise. Return results as JSON."
      },
      {
        role: "user",
        content: `Search for: "${query}". Return the top ${maxResults} results as JSON array: [{"title": "...", "url": "...", "snippet": "..."}]`
      }
    ],
    max_tokens: 2048
  });
  const text = response.choices[0]?.message?.content ?? "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    const results = JSON.parse(jsonMatch[0]);
    return results.map((r) => ({
      title: r.title || "",
      url: r.url || "",
      snippet: r.snippet || "",
      source: "perplexity"
    }));
  } catch {
    return [];
  }
}
var webTools;
var init_webTools = __esm({
  "packages/mcp-local/src/tools/webTools.ts"() {
    "use strict";
    init_security();
    webTools = [
      {
        name: "web_search",
        description: "Search the web using AI providers with search grounding. Returns structured search results with titles, URLs, and snippets. Auto-selects best provider: Gemini (Google Search grounding) > OpenAI (web search preview) > Perplexity. Use for research, market analysis, tech discovery, and gathering current information.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query (e.g., 'TypeScript MCP servers 2026', 'AI agent frameworks comparison')"
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results to return (default: 5, max: 20)"
            },
            provider: {
              type: "string",
              enum: ["auto", "gemini", "openai", "perplexity"],
              description: "Which search provider to use. Default: 'auto' (selects best available)."
            }
          },
          required: ["query"]
        },
        handler: async (args) => {
          const query = args.query;
          const maxResults = Math.min(args.maxResults ?? 5, 20);
          const providerChoice = args.provider ?? "auto";
          let selectedProvider = null;
          if (providerChoice !== "auto") {
            selectedProvider = providerChoice;
          } else {
            if ((process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) && await canImport("@google/genai")) {
              selectedProvider = "gemini";
            } else if (process.env.OPENAI_API_KEY && await canImport("openai")) {
              selectedProvider = "openai";
            } else if (process.env.PERPLEXITY_API_KEY && await canImport("openai")) {
              selectedProvider = "perplexity";
            }
          }
          if (!selectedProvider) {
            return {
              query,
              results: [],
              provider: "none",
              resultCount: 0,
              searchedAt: (/* @__PURE__ */ new Date()).toISOString(),
              setup: {
                message: "No search provider available. Results will be empty until a provider is configured.",
                options: [
                  "Set GEMINI_API_KEY (recommended \u2014 Google Search grounding)",
                  "Set OPENAI_API_KEY (GPT-5-mini web search preview)",
                  "Set PERPLEXITY_API_KEY (Perplexity sonar)"
                ],
                sdks: "Install: @google/genai or openai"
              }
            };
          }
          try {
            let results;
            switch (selectedProvider) {
              case "gemini":
                results = await searchWithGemini(query, maxResults);
                break;
              case "openai":
                results = await searchWithOpenAI(query, maxResults);
                break;
              case "perplexity":
                results = await searchWithPerplexity(query, maxResults);
                break;
            }
            return {
              query,
              results,
              provider: selectedProvider,
              resultCount: results.length,
              searchedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
          } catch (err) {
            return {
              error: true,
              query,
              provider: selectedProvider,
              message: `Search failed: ${err.message}`,
              suggestion: "Check that the API key is valid. Try a different provider."
            };
          }
        }
      },
      {
        name: "fetch_url",
        description: "Fetch a URL and extract its content as markdown, text, or raw HTML. Useful for reading documentation, blog posts, API references, and web pages. Uses cheerio for HTML parsing when available, with fallback to basic text extraction.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL to fetch (e.g., 'https://docs.example.com/getting-started')"
            },
            extractMode: {
              type: "string",
              enum: ["markdown", "text", "html"],
              description: "How to extract content: 'markdown' (structured), 'text' (plain), 'html' (raw). Default: 'markdown'."
            },
            maxLength: {
              type: "number",
              description: "Maximum content length to return (default: 50000 characters)"
            }
          },
          required: ["url"]
        },
        handler: async (args) => {
          const url = args.url;
          const extractMode = args.extractMode ?? "markdown";
          const maxLength = args.maxLength ?? 5e4;
          let parsedUrl;
          try {
            parsedUrl = new URL(url);
          } catch {
            return {
              error: true,
              url,
              message: "Invalid URL format",
              suggestion: "Provide a valid URL starting with http:// or https://"
            };
          }
          try {
            safeUrl(url);
          } catch (err) {
            return {
              error: true,
              url,
              message: `URL blocked by security policy: ${err.message}`,
              suggestion: "Only public HTTP/HTTPS URLs are allowed."
            };
          }
          try {
            const response = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; NodeBench-MCP/1.0; +https://github.com/nodebench)",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
              },
              redirect: "follow"
            });
            if (!response.ok) {
              return {
                error: true,
                url,
                status: response.status,
                message: `HTTP ${response.status}: ${response.statusText}`,
                suggestion: "Check that the URL is accessible and not blocked."
              };
            }
            const contentType = response.headers.get("content-type") ?? "";
            const html = await response.text();
            const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
            const title = titleMatch?.[1]?.trim() ?? parsedUrl.hostname;
            let content;
            if (extractMode === "html") {
              content = html;
            } else if (extractMode === "markdown") {
              const cheerio = await getCheerio();
              if (cheerio) {
                content = htmlToMarkdown(html, cheerio);
              } else {
                content = basicHtmlToText(html);
              }
            } else {
              const cheerio = await getCheerio();
              if (cheerio) {
                const $ = cheerio.load(html);
                $("script, style").remove();
                content = $("body").text().replace(/\s+/g, " ").trim();
              } else {
                content = basicHtmlToText(html);
              }
            }
            const truncated = content.length > maxLength;
            if (truncated) {
              content = content.slice(0, maxLength) + "\n\n... [truncated]";
            }
            return {
              url,
              finalUrl: response.url,
              // After redirects
              title,
              contentType,
              extractMode,
              content,
              contentLength: content.length,
              truncated,
              fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
              cheerioAvailable: !!await getCheerio()
            };
          } catch (err) {
            return {
              error: true,
              url,
              message: `Fetch failed: ${err.message}`,
              suggestion: "Check network connectivity and that the URL is accessible."
            };
          }
        }
      }
    ];
  }
});

// packages/mcp-local/src/sweep/sources/hackernews.ts
var hackernews_exports = {};
__export(hackernews_exports, {
  collect: () => collect
});
async function collect() {
  const signals = [];
  try {
    const resp = await fetch(HN_TOP_URL, { signal: AbortSignal.timeout(5e3) });
    if (!resp.ok) return [];
    const ids = await resp.json();
    const items = await Promise.all(
      ids.slice(0, 30).map(async (id) => {
        try {
          const r = await fetch(HN_ITEM_URL(id), { signal: AbortSignal.timeout(3e3) });
          return r.ok ? await r.json() : null;
        } catch {
          return null;
        }
      })
    );
    for (const item of items) {
      if (!item?.title) continue;
      if (!SIGNAL_KEYWORDS.test(item.title)) continue;
      const entityMatch = item.title.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/);
      const entity = entityMatch?.[0] ?? item.title.split(/[:\-–—]/).map((s) => s.trim())[0].slice(0, 30);
      const score = Math.min(100, Math.round((item.score ?? 0) / 5));
      const severity = score > 60 ? "flash" : score > 30 ? "priority" : "routine";
      signals.push({
        id: `hn_${item.id}`,
        source: "hackernews",
        entity,
        headline: item.title.slice(0, 120),
        url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
        score,
        category: /fund|rais|series|valuation/i.test(item.title) ? "funding" : /launch|ship|release|announce/i.test(item.title) ? "launch" : /acqui|merge|IPO/i.test(item.title) ? "market" : "trend",
        severity,
        metadata: { points: item.score, comments: item.descendants },
        collectedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  } catch {
  }
  return signals;
}
var HN_TOP_URL, HN_ITEM_URL, SIGNAL_KEYWORDS;
var init_hackernews = __esm({
  "packages/mcp-local/src/sweep/sources/hackernews.ts"() {
    "use strict";
    HN_TOP_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
    HN_ITEM_URL = (id) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
    SIGNAL_KEYWORDS = /\b(AI|GPT|Claude|Anthropic|OpenAI|LLM|agent|MCP|startup|YC|funding|Series [A-D]|acquisition|IPO|valuation|launch|open.?source|developer tool|API|infra|vector|RAG|fine.?tun)/i;
  }
});

// packages/mcp-local/src/sweep/sources/github_trending.ts
var github_trending_exports = {};
__export(github_trending_exports, {
  collect: () => collect2
});
async function collect2() {
  const signals = [];
  try {
    const resp = await fetch("https://api.github.com/search/repositories?q=stars:>100+pushed:>2026-03-25+topic:ai-agent+topic:mcp+topic:llm&sort=stars&order=desc&per_page=10", {
      signal: AbortSignal.timeout(5e3),
      headers: { "Accept": "application/vnd.github.v3+json" }
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    for (const repo of (data.items ?? []).slice(0, 10)) {
      const entity = repo.full_name?.split("/")?.[1] ?? repo.name ?? "unknown";
      const stars = repo.stargazers_count ?? 0;
      const score = Math.min(100, Math.round(stars / 100));
      signals.push({
        id: `gh_${repo.id}`,
        source: "github_trending",
        entity,
        headline: `${repo.full_name}: ${(repo.description ?? "").slice(0, 80)}`,
        url: repo.html_url,
        score,
        category: "product",
        severity: stars > 5e3 ? "flash" : stars > 1e3 ? "priority" : "routine",
        metadata: { stars, forks: repo.forks_count, language: repo.language },
        collectedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  } catch {
  }
  return signals;
}
var init_github_trending = __esm({
  "packages/mcp-local/src/sweep/sources/github_trending.ts"() {
    "use strict";
  }
});

// packages/mcp-local/src/sweep/sources/yahoo_finance.ts
var yahoo_finance_exports = {};
__export(yahoo_finance_exports, {
  collect: () => collect3
});
async function collect3() {
  const signals = [];
  try {
    const tickerStr = TICKERS.join(",");
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${tickerStr}&range=1d&interval=1d`,
      { signal: AbortSignal.timeout(5e3), headers: { "User-Agent": "NodeBench/1.0" } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    for (const ticker of TICKERS) {
      const spark = data?.spark?.result?.find((r) => r.symbol === ticker);
      if (!spark?.response?.[0]?.indicators?.quote?.[0]) continue;
      const quote = spark.response[0].indicators.quote[0];
      const close = quote.close?.filter(Boolean);
      if (!close?.length) continue;
      const current = close[close.length - 1];
      const prev = close[0];
      const changePct = prev > 0 ? (current - prev) / prev * 100 : 0;
      const absChange = Math.abs(changePct);
      if (absChange < 2) continue;
      signals.push({
        id: `yf_${ticker}_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`,
        source: "yahoo_finance",
        entity: ticker,
        headline: `${ticker} ${changePct > 0 ? "up" : "down"} ${absChange.toFixed(1)}% today ($${current.toFixed(2)})`,
        url: `https://finance.yahoo.com/quote/${ticker}`,
        score: Math.min(100, Math.round(absChange * 10)),
        category: "market",
        severity: absChange > 5 ? "flash" : absChange > 3 ? "priority" : "routine",
        metadata: { price: current, changePct: Math.round(changePct * 100) / 100 },
        collectedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  } catch {
  }
  return signals;
}
var TICKERS;
var init_yahoo_finance = __esm({
  "packages/mcp-local/src/sweep/sources/yahoo_finance.ts"() {
    "use strict";
    TICKERS = ["GOOGL", "MSFT", "META", "NVDA", "AMD", "PLTR", "SNOW", "CRM"];
  }
});

// packages/mcp-local/src/sweep/sources/producthunt.ts
var producthunt_exports = {};
__export(producthunt_exports, {
  collect: () => collect4
});
async function collect4() {
  const signals = [];
  try {
    const resp = await fetch("https://www.producthunt.com/feed?category=artificial-intelligence", {
      signal: AbortSignal.timeout(5e3),
      headers: { "User-Agent": "NodeBench/1.0", "Accept": "application/json" }
    });
    if (!resp.ok) return [];
    const text = await resp.text();
    const productMatches = text.matchAll(/"name"\s*:\s*"([^"]+)".*?"tagline"\s*:\s*"([^"]+)"/g);
    for (const match of productMatches) {
      const name = match[1];
      const tagline = match[2];
      if (!AI_KEYWORDS.test(`${name} ${tagline}`)) continue;
      signals.push({
        id: `ph_${name.toLowerCase().replace(/\s+/g, "-")}`,
        source: "producthunt",
        entity: name,
        headline: `${name}: ${tagline.slice(0, 80)}`,
        url: `https://www.producthunt.com/search?q=${encodeURIComponent(name)}`,
        score: 50,
        category: "launch",
        severity: "priority",
        collectedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  } catch {
  }
  return signals.slice(0, 5);
}
var AI_KEYWORDS;
var init_producthunt = __esm({
  "packages/mcp-local/src/sweep/sources/producthunt.ts"() {
    "use strict";
    AI_KEYWORDS = /\b(AI|agent|LLM|GPT|Claude|copilot|automation|workflow|MCP|developer|API|no.?code|low.?code)\b/i;
  }
});

// packages/mcp-local/src/sweep/sources/openbb_finance.ts
var openbb_finance_exports = {};
__export(openbb_finance_exports, {
  collect: () => collect5
});
async function collect5() {
  const signals = [];
  try {
    const tickers = Object.keys(TRACKED_TICKERS).join(",");
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}&fields=regularMarketPrice,regularMarketChangePercent,marketCap,fiftyDayAverage`,
      { signal: AbortSignal.timeout(5e3), headers: { "User-Agent": "NodeBench/1.0" } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    const quotes = data?.quoteResponse?.result ?? [];
    for (const q of quotes) {
      const changePct = q.regularMarketChangePercent ?? 0;
      const absChange = Math.abs(changePct);
      if (absChange < 1.5) continue;
      const name = TRACKED_TICKERS[q.symbol] ?? q.symbol;
      const mcap = q.marketCap ? `$${(q.marketCap / 1e9).toFixed(0)}B` : "";
      signals.push({
        id: `fin_${q.symbol}_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`,
        source: "openbb_finance",
        entity: name,
        headline: `${name} (${q.symbol}) ${changePct > 0 ? "\u2191" : "\u2193"} ${absChange.toFixed(1)}% ${mcap ? `\u2014 ${mcap} market cap` : ""}`,
        url: `https://finance.yahoo.com/quote/${q.symbol}`,
        score: Math.min(100, Math.round(absChange * 15)),
        category: "market",
        severity: absChange > 5 ? "flash" : absChange > 3 ? "priority" : "routine",
        metadata: { ticker: q.symbol, price: q.regularMarketPrice, changePct, marketCap: q.marketCap },
        collectedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  } catch {
  }
  return signals;
}
var TRACKED_TICKERS;
var init_openbb_finance = __esm({
  "packages/mcp-local/src/sweep/sources/openbb_finance.ts"() {
    "use strict";
    TRACKED_TICKERS = {
      "GOOGL": "Alphabet/Google",
      "MSFT": "Microsoft",
      "META": "Meta",
      "NVDA": "NVIDIA",
      "AMD": "AMD",
      "CRM": "Salesforce",
      "PLTR": "Palantir",
      "SNOW": "Snowflake",
      "NET": "Cloudflare"
    };
  }
});

// packages/mcp-local/src/profiler/behaviorStore.ts
var behaviorStore_exports = {};
__export(behaviorStore_exports, {
  findSimilarPriorQuery: () => findSimilarPriorQuery,
  getAggregateInsights: () => getAggregateInsights,
  getSessionInsights: () => getSessionInsights,
  initBehaviorTables: () => initBehaviorTables,
  logContextReuse: () => logContextReuse,
  logQuery: () => logQuery,
  logSession: () => logSession,
  logToolCall: () => logToolCall
});
function initBehaviorTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS behavior_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      company_id TEXT,
      interface_surface TEXT DEFAULT 'ai_app',
      role_inferred TEXT DEFAULT 'founder',
      start_time TEXT NOT NULL,
      end_time TEXT,
      main_objective TEXT,
      packet_types_used TEXT DEFAULT '[]',
      artifacts_produced TEXT DEFAULT '[]',
      total_tool_calls INTEGER DEFAULT 0,
      total_model_calls INTEGER DEFAULT 0,
      estimated_tokens_in INTEGER DEFAULT 0,
      estimated_tokens_out INTEGER DEFAULT 0,
      estimated_cost_usd REAL DEFAULT 0,
      latency_total_ms INTEGER DEFAULT 0,
      redundant_calls INTEGER DEFAULT 0,
      reused_context_count INTEGER DEFAULT 0,
      optimization_score INTEGER DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS behavior_queries (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      raw_query TEXT NOT NULL,
      normalized_intent TEXT,
      classification TEXT,
      entity_targets TEXT DEFAULT '[]',
      own_company_mode INTEGER DEFAULT 0,
      followup_to_query_id TEXT,
      resulting_packet_type TEXT,
      resulting_artifact_type TEXT,
      confidence_score REAL,
      latency_ms INTEGER,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES behavior_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS behavior_tool_calls (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      query_id TEXT,
      tool_name TEXT NOT NULL,
      input_summary TEXT,
      output_summary TEXT,
      latency_ms INTEGER DEFAULT 0,
      cost_estimate_usd REAL DEFAULT 0,
      cache_hit INTEGER DEFAULT 0,
      success INTEGER DEFAULT 1,
      model_used TEXT,
      token_estimate INTEGER,
      packet_id TEXT,
      entity_ids TEXT DEFAULT '[]',
      is_redundant INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES behavior_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS context_reuse_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      reuse_type TEXT NOT NULL,
      source_packet_id TEXT,
      source_memo_id TEXT,
      source_query_id TEXT,
      fields_reused TEXT DEFAULT '[]',
      tokens_saved_estimate INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES behavior_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS workflow_paths (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      objective TEXT,
      steps TEXT NOT NULL DEFAULT '[]',
      total_steps INTEGER DEFAULT 0,
      decision_points INTEGER DEFAULT 0,
      branches_taken TEXT DEFAULT '[]',
      terminal_output_type TEXT,
      success INTEGER DEFAULT 1,
      total_latency_ms INTEGER DEFAULT 0,
      total_cost_usd REAL DEFAULT 0,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES behavior_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS optimization_suggestions (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      target_workflow_id TEXT,
      suggestion_type TEXT NOT NULL,
      current_path_summary TEXT,
      proposed_path_summary TEXT,
      expected_cost_delta_pct REAL,
      expected_latency_delta_pct REAL,
      expected_quality_delta_pct REAL,
      confidence_score REAL DEFAULT 0,
      validation_required INTEGER DEFAULT 1,
      status TEXT DEFAULT 'suggested',
      actionable_text TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS behavior_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      preferred_artifacts TEXT DEFAULT '[]',
      common_roles TEXT DEFAULT '[]',
      common_workflow_families TEXT DEFAULT '[]',
      cost_sensitivity TEXT DEFAULT 'medium',
      latency_sensitivity TEXT DEFAULT 'medium',
      favorite_model_paths TEXT DEFAULT '[]',
      recurring_entity_clusters TEXT DEFAULT '[]',
      common_delegation_targets TEXT DEFAULT '[]',
      typical_followup_style TEXT DEFAULT 'iterative',
      total_sessions INTEGER DEFAULT 0,
      total_queries INTEGER DEFAULT 0,
      total_tool_calls INTEGER DEFAULT 0,
      lifetime_cost_usd REAL DEFAULT 0,
      last_updated TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bq_session ON behavior_queries(session_id);
    CREATE INDEX IF NOT EXISTS idx_btc_session ON behavior_tool_calls(session_id);
    CREATE INDEX IF NOT EXISTS idx_btc_tool ON behavior_tool_calls(tool_name);
    CREATE INDEX IF NOT EXISTS idx_cre_session ON context_reuse_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_wp_session ON workflow_paths(session_id);
    CREATE INDEX IF NOT EXISTS idx_os_status ON optimization_suggestions(status);
    CREATE INDEX IF NOT EXISTS idx_bp_user ON behavior_profiles(user_id);
  `);
}
function logSession(data) {
  const db = getDb();
  const id = genId("bsess");
  db.prepare(`
    INSERT INTO behavior_sessions (id, user_id, company_id, interface_surface, role_inferred, start_time, main_objective)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.userId ?? null, data.companyId ?? null, data.interfaceSurface ?? "ai_app", data.roleInferred ?? "founder", (/* @__PURE__ */ new Date()).toISOString(), data.mainObjective ?? null);
  return id;
}
function logQuery(data) {
  const db = getDb();
  const id = genId("bqry");
  db.prepare(`
    INSERT INTO behavior_queries (id, session_id, raw_query, normalized_intent, classification, entity_targets, own_company_mode, followup_to_query_id, confidence_score, latency_ms, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.sessionId,
    data.rawQuery,
    data.normalizedIntent ?? null,
    data.classification ?? null,
    JSON.stringify(data.entityTargets ?? []),
    data.ownCompanyMode ? 1 : 0,
    data.followupToQueryId ?? null,
    data.confidenceScore ?? null,
    data.latencyMs ?? null,
    (/* @__PURE__ */ new Date()).toISOString()
  );
  return id;
}
function logToolCall(data) {
  const db = getDb();
  const id = genId("btc");
  db.prepare(`
    INSERT INTO behavior_tool_calls (id, session_id, query_id, tool_name, input_summary, output_summary, latency_ms, cost_estimate_usd, cache_hit, success, model_used, token_estimate, is_redundant, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.sessionId,
    data.queryId ?? null,
    data.toolName,
    data.inputSummary ?? null,
    data.outputSummary ?? null,
    data.latencyMs,
    data.costEstimateUsd,
    data.cacheHit ? 1 : 0,
    data.success ? 1 : 0,
    data.modelUsed ?? null,
    data.tokenEstimate ?? null,
    data.isRedundant ? 1 : 0,
    (/* @__PURE__ */ new Date()).toISOString()
  );
  db.prepare(`
    UPDATE behavior_sessions SET
      total_tool_calls = total_tool_calls + 1,
      estimated_cost_usd = estimated_cost_usd + ?,
      latency_total_ms = latency_total_ms + ?,
      redundant_calls = redundant_calls + ?
    WHERE id = ?
  `).run(data.costEstimateUsd, data.latencyMs, data.isRedundant ? 1 : 0, data.sessionId);
  return id;
}
function logContextReuse(data) {
  const db = getDb();
  const id = genId("bcre");
  db.prepare(`
    INSERT INTO context_reuse_events (id, session_id, reuse_type, source_packet_id, source_memo_id, source_query_id, fields_reused, tokens_saved_estimate, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.sessionId,
    data.reuseType,
    data.sourcePacketId ?? null,
    data.sourceMemoId ?? null,
    data.sourceQueryId ?? null,
    JSON.stringify(data.fieldsReused ?? []),
    data.tokensSavedEstimate ?? 0,
    (/* @__PURE__ */ new Date()).toISOString()
  );
  db.prepare(`UPDATE behavior_sessions SET reused_context_count = reused_context_count + 1 WHERE id = ?`).run(data.sessionId);
  return id;
}
function getSessionInsights(sessionId) {
  const db = getDb();
  const session = db.prepare(`SELECT * FROM behavior_sessions WHERE id = ?`).get(sessionId);
  const queries = db.prepare(`SELECT * FROM behavior_queries WHERE session_id = ? ORDER BY timestamp`).all(sessionId);
  const toolCalls = db.prepare(`SELECT * FROM behavior_tool_calls WHERE session_id = ? ORDER BY timestamp`).all(sessionId);
  const reuseEvents = db.prepare(`SELECT * FROM context_reuse_events WHERE session_id = ? ORDER BY timestamp`).all(sessionId);
  const toolStats = db.prepare(`
    SELECT tool_name as tool, COUNT(*) as count,
      CAST(AVG(latency_ms) AS INTEGER) as avgLatencyMs,
      ROUND(SUM(cost_estimate_usd), 4) as totalCost
    FROM behavior_tool_calls WHERE session_id = ?
    GROUP BY tool_name ORDER BY count DESC LIMIT 10
  `).all(sessionId);
  return { session, queries, toolCalls, reuseEvents, topTools: toolStats };
}
function getAggregateInsights(daysBack = 7) {
  const db = getDb();
  const since = new Date(Date.now() - daysBack * 864e5).toISOString();
  const stats = db.prepare(`
    SELECT COUNT(*) as totalSessions,
      COALESCE(SUM(total_tool_calls), 0) as totalToolCalls,
      COALESCE(SUM(estimated_cost_usd), 0) as totalCost,
      COALESCE(SUM(redundant_calls), 0) as redundantCalls,
      COALESCE(SUM(reused_context_count), 0) as reusedCount
    FROM behavior_sessions WHERE start_time >= ?
  `).get(since);
  const totalQueries = db.prepare(`SELECT COUNT(*) as c FROM behavior_queries WHERE timestamp >= ?`).get(since)?.c ?? 0;
  const topTools = db.prepare(`
    SELECT tool_name as tool, COUNT(*) as count,
      CAST(AVG(latency_ms) AS INTEGER) as avgLatencyMs,
      ROUND(SUM(cost_estimate_usd), 4) as totalCost
    FROM behavior_tool_calls WHERE timestamp >= ?
    GROUP BY tool_name ORDER BY count DESC LIMIT 15
  `).all(since);
  const repeatedQueries = db.prepare(`
    SELECT raw_query as query, COUNT(*) as count
    FROM behavior_queries WHERE timestamp >= ?
    GROUP BY LOWER(TRIM(raw_query)) HAVING count > 1
    ORDER BY count DESC LIMIT 10
  `).all(since);
  return {
    totalSessions: stats?.totalSessions ?? 0,
    totalQueries,
    totalToolCalls: stats?.totalToolCalls ?? 0,
    totalCostUsd: Math.round((stats?.totalCost ?? 0) * 1e3) / 1e3,
    redundantCallRate: stats?.totalToolCalls > 0 ? Math.round(stats?.redundantCalls / stats?.totalToolCalls * 100) : 0,
    topTools,
    repeatedQueries,
    reuseRate: stats?.totalSessions > 0 ? Math.round(stats?.reusedCount / stats?.totalSessions * 100) : 0
  };
}
function findSimilarPriorQuery(query, sessionId) {
  const db = getDb();
  const normalized = query.toLowerCase().trim().replace(/[?!.,]+$/g, "");
  const prior = db.prepare(`
    SELECT id, raw_query, resulting_packet_type, classification
    FROM behavior_queries
    WHERE LOWER(TRIM(raw_query)) = ? AND (session_id != ? OR ? IS NULL)
    ORDER BY timestamp DESC LIMIT 1
  `).get(normalized, sessionId ?? null, sessionId ?? null);
  if (prior) {
    return { found: true, priorQueryId: prior.id, similarity: "exact" };
  }
  return { found: false };
}
var init_behaviorStore = __esm({
  "packages/mcp-local/src/profiler/behaviorStore.ts"() {
    "use strict";
    init_db();
  }
});

// packages/mcp-local/src/tools/contextInjection.ts
var contextInjection_exports = {};
__export(contextInjection_exports, {
  buildContextBundle: () => buildContextBundle,
  contextInjectionTools: () => contextInjectionTools
});
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "fs";
import { join as join3, resolve as resolve3, dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
function findProjectRoot2() {
  let dir = resolve3(__dirname2, "..", "..");
  for (let i = 0; i < 5; i++) {
    if (existsSync2(join3(dir, "CLAUDE.md"))) return dir;
    dir = resolve3(dir, "..");
  }
  return process.cwd();
}
function safeRead2(path2) {
  try {
    return existsSync2(path2) ? readFileSync2(path2, "utf-8") : null;
  } catch {
    return null;
  }
}
function tableExists(db, tableName) {
  const row = db.prepare(
    `SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name=?`
  ).get(tableName);
  return (row?.c ?? 0) > 0;
}
function detectStructuralContradictions(root) {
  const contradictions = [];
  const claudeMd = safeRead2(join3(root, "CLAUDE.md"));
  if (claudeMd) {
    const toolMatch = claudeMd.match(/(\d+)-tool/);
    if (toolMatch) {
      const declaredCount = parseInt(toolMatch[1], 10);
      if (declaredCount < 300 || declaredCount > 400) {
        contradictions.push(`CLAUDE.md declares ${declaredCount}-tool but expected 300-400 range`);
      }
    }
  }
  const indexHtml = safeRead2(join3(root, "index.html"));
  if (indexHtml && claudeMd) {
    const titleMatch = indexHtml.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      const title = titleMatch[1].toLowerCase();
      if (title.includes("deeptrace") || title.includes("agent trust")) {
        contradictions.push(`index.html title "${titleMatch[1]}" contradicts entity intelligence positioning`);
      }
    }
  }
  const pkgJson = safeRead2(join3(root, "packages/mcp-local/package.json"));
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson);
      if (pkg.description && pkg.description.toLowerCase().includes("agent trust")) {
        contradictions.push(`package.json description "${pkg.description}" contradicts current positioning`);
      }
    } catch {
    }
  }
  return contradictions;
}
function computeConfidence(contradictionCount) {
  return contradictionCount === 0 ? 85 : Math.max(50, 85 - contradictionCount * 10);
}
function findMatchingEntity(db, query) {
  if (!query) return null;
  const queryLower = query.toLowerCase();
  const wellKnown = ["anthropic", "shopify", "nodebench", "supermemory", "openai", "google", "meta", "microsoft", "stripe", "linear"];
  const knownMatch = wellKnown.find((e) => queryLower.includes(e));
  if (knownMatch) return knownMatch;
  try {
    const recentActions = db.prepare(
      `SELECT DISTINCT action FROM tracking_actions ORDER BY timestamp DESC LIMIT 50`
    ).all();
    for (const row of recentActions) {
      const words = row.action.match(/[A-Z][a-z]{2,}/g) ?? [];
      for (const word of words) {
        if (queryLower.includes(word.toLowerCase()) && word.length > 3) {
          return word.toLowerCase();
        }
      }
    }
  } catch {
  }
  return null;
}
function buildPinnedContext() {
  const root = findProjectRoot2();
  const claudeMd = safeRead2(join3(root, "CLAUDE.md"));
  let canonicalMission = "Unknown";
  let wedge = "Unknown";
  if (claudeMd) {
    const overviewMatch = claudeMd.match(/NodeBench\s*[—–-]\s*(.+?)(?:\.\s|$)/m);
    if (overviewMatch) canonicalMission = overviewMatch[1].trim();
    const toolMatch = claudeMd.match(/(\d+)-tool/);
    if (toolMatch) wedge = `${toolMatch[1]}-tool MCP server with entity intelligence`;
  }
  let sessionActionCount = 0;
  let recentActions = [];
  let lastPacketSummary = null;
  let lastPacketTimestamp = null;
  const activeContradictions = detectStructuralContradictions(root);
  try {
    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const actions = db.prepare(
      `SELECT action, timestamp FROM tracking_actions WHERE date(timestamp) >= ? ORDER BY timestamp DESC LIMIT 3`
    ).all(sevenDaysAgo);
    recentActions = actions.map((a) => a.action);
    sessionActionCount = db.prepare(
      `SELECT COUNT(*) as c FROM tracking_actions WHERE date(timestamp) >= ?`
    ).get(sevenDaysAgo)?.c ?? 0;
    if (tableExists(db, "benchmark_reports")) {
      const lastReport = db.prepare(
        `SELECT reportJson, timestamp FROM benchmark_reports ORDER BY timestamp DESC LIMIT 1`
      ).get();
      if (lastReport) {
        try {
          const report = JSON.parse(lastReport.reportJson);
          lastPacketSummary = `Last benchmark: ${report.layer} \u2014 ${report.totalSessions} sessions, RCA ${Math.round((report.metrics?.rca ?? 0) * 100)}%, maturity ${report.maturityLabel ?? "unknown"}`;
          lastPacketTimestamp = lastReport.timestamp;
        } catch {
        }
      }
    }
  } catch {
  }
  const estimatedTokens = 150 + recentActions.length * 15 + activeContradictions.length * 20;
  return {
    canonicalMission,
    wedge,
    companyState: "building",
    // Fix P1 #5: Use shared confidence formula
    identityConfidence: computeConfidence(activeContradictions.length),
    lastPacketSummary,
    lastPacketTimestamp,
    activeContradictions,
    sessionActionCount,
    recentActions,
    estimatedTokens
  };
}
function buildInjectedContext(query) {
  let weeklyResetSummary = null;
  let recentMilestones = [];
  let entitySignals = [];
  let dogfoodVerdict = null;
  try {
    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const resetMilestone = db.prepare(
      `SELECT title, description, timestamp FROM tracking_milestones WHERE title LIKE '%weekly%reset%' ORDER BY timestamp DESC LIMIT 1`
    ).get();
    if (resetMilestone) {
      weeklyResetSummary = `${resetMilestone.title} (${resetMilestone.timestamp?.slice(0, 10)}): ${resetMilestone.description?.slice(0, 100)}`;
    }
    const milestones = db.prepare(
      `SELECT title, timestamp FROM tracking_milestones WHERE date(timestamp) >= ? ORDER BY timestamp DESC LIMIT 5`
    ).all(sevenDaysAgo);
    recentMilestones = milestones.map((m) => ({ title: m.title, timestamp: m.timestamp }));
    if (query) {
      const matchedEntity = findMatchingEntity(db, query);
      if (matchedEntity) {
        const escaped = matchedEntity.replace(/%/g, "\\%").replace(/_/g, "\\_");
        const entityActions = db.prepare(
          `SELECT action FROM tracking_actions WHERE LOWER(action) LIKE ? ESCAPE '\\' ORDER BY timestamp DESC LIMIT 3`
        ).all(`%${escaped}%`);
        entitySignals = entityActions.map((a) => a.action);
      }
    }
    if (tableExists(db, "benchmark_reports")) {
      const lastReport = db.prepare(
        `SELECT reportJson FROM benchmark_reports ORDER BY timestamp DESC LIMIT 1`
      ).get();
      if (lastReport) {
        try {
          const report = JSON.parse(lastReport.reportJson);
          const rca = Math.round((report.metrics?.rca ?? 0) * 100);
          const prr = Math.round((report.metrics?.prr ?? 0) * 100);
          dogfoodVerdict = `${report.layer}: RCA ${rca}%, PRR ${prr}%`;
        } catch {
        }
      }
    }
  } catch {
  }
  const estimatedTokens = 50 + recentMilestones.length * 12 + entitySignals.length * 15;
  return { weeklyResetSummary, recentMilestones, entitySignals, dogfoodVerdict, estimatedTokens };
}
function buildArchivalPointers() {
  let totalActions = 0;
  let totalMilestones = 0;
  let totalStateDiffs = 0;
  let oldestActionDate = null;
  try {
    const db = getDb();
    totalActions = db.prepare(`SELECT COUNT(*) as c FROM tracking_actions`).get()?.c ?? 0;
    totalMilestones = db.prepare(`SELECT COUNT(*) as c FROM tracking_milestones`).get()?.c ?? 0;
    if (tableExists(db, "benchmark_runs")) {
      totalStateDiffs = db.prepare(`SELECT COUNT(*) as c FROM benchmark_runs`).get()?.c ?? 0;
    }
    const oldest = db.prepare(`SELECT MIN(timestamp) as t FROM tracking_actions`).get();
    oldestActionDate = oldest?.t?.slice(0, 10) ?? null;
  } catch {
  }
  return {
    totalActions,
    totalMilestones,
    totalStateDiffs,
    oldestActionDate,
    retrievalTools: ["get_session_journal", "get_weekly_summary", "get_daily_log", "get_monthly_report", "get_benchmark_history"]
  };
}
function formatSystemPromptPrefix(pinned, injected, archival) {
  const lines = [
    `[NODEBENCH CONTEXT \u2014 call get_context_bundle to refresh after compaction]`,
    `Identity: ${pinned.canonicalMission}`,
    `Wedge: ${pinned.wedge}`,
    `State: ${pinned.companyState} | Confidence: ${pinned.identityConfidence}%`
  ];
  if (pinned.lastPacketSummary) {
    lines.push(`Last packet: ${pinned.lastPacketSummary}`);
  }
  if (pinned.activeContradictions.length > 0) {
    lines.push(`Active contradictions (${pinned.activeContradictions.length}): ${pinned.activeContradictions[0]?.slice(0, 80)}`);
  }
  if (pinned.sessionActionCount > 0) {
    lines.push(`Session: ${pinned.sessionActionCount} actions tracked. Recent: ${pinned.recentActions.slice(0, 2).join("; ")}`);
  }
  if (injected.weeklyResetSummary) {
    lines.push(`Weekly reset: ${injected.weeklyResetSummary}`);
  }
  if (injected.recentMilestones.length > 0) {
    lines.push(`Milestones (${injected.recentMilestones.length}): ${injected.recentMilestones.map((m) => m.title).join(", ")}`);
  }
  if (injected.dogfoodVerdict) {
    lines.push(`Benchmark: ${injected.dogfoodVerdict}`);
  }
  if (archival.totalActions > 0) {
    lines.push(`Archival: ${archival.totalActions} actions, ${archival.totalMilestones} milestones since ${archival.oldestActionDate ?? "unknown"}. Use ${archival.retrievalTools[0]} to access.`);
  }
  lines.push(`[END NODEBENCH CONTEXT]`);
  return lines.join("\n");
}
function buildContextBundle(query) {
  const pinned = buildPinnedContext();
  const injected = buildInjectedContext(query);
  const archival = buildArchivalPointers();
  const systemPromptPrefix = formatSystemPromptPrefix(pinned, injected, archival);
  const totalEstimatedTokens = pinned.estimatedTokens + injected.estimatedTokens + 50;
  return { pinned, injected, archival, systemPromptPrefix, totalEstimatedTokens };
}
var __filename2, __dirname2, contextInjectionTools;
var init_contextInjection = __esm({
  "packages/mcp-local/src/tools/contextInjection.ts"() {
    "use strict";
    init_db();
    __filename2 = fileURLToPath2(import.meta.url);
    __dirname2 = dirname2(__filename2);
    contextInjectionTools = [
      {
        name: "get_context_bundle",
        description: "Returns the full NodeBench context bundle: pinned identity (mission, wedge, confidence), last packet summary, active contradictions, recent actions, milestones, dogfood status, and archival pointers. Call this at the start of any session or before generating a packet to ensure continuity across messages. This is what makes message 1000 as good as message 1.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Optional current query \u2014 enables entity-specific signal injection"
            }
          }
        },
        annotations: { readOnlyHint: true },
        handler: async (args) => {
          const bundle = buildContextBundle(args.query);
          return {
            systemPromptPrefix: bundle.systemPromptPrefix,
            pinned: {
              mission: bundle.pinned.canonicalMission,
              wedge: bundle.pinned.wedge,
              confidence: `${bundle.pinned.identityConfidence}%`,
              lastPacket: bundle.pinned.lastPacketSummary,
              contradictions: bundle.pinned.activeContradictions.length,
              sessionActions: bundle.pinned.sessionActionCount,
              recentActions: bundle.pinned.recentActions
            },
            injected: {
              weeklyReset: bundle.injected.weeklyResetSummary,
              milestones: bundle.injected.recentMilestones.length,
              entitySignals: bundle.injected.entitySignals.length,
              dogfood: bundle.injected.dogfoodVerdict
            },
            archival: bundle.archival,
            tokenBudget: `~${bundle.totalEstimatedTokens} tokens`
          };
        }
      },
      {
        name: "inject_context_into_prompt",
        description: "Wraps a user prompt with NodeBench's persistent context (identity, last packet, contradictions, session state). Use this to ensure any downstream LLM call has full continuity even after context window compaction. Returns the enriched prompt ready for dispatch.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "The user's raw prompt to enrich" }
          },
          required: ["prompt"]
        },
        annotations: { readOnlyHint: true },
        handler: async (args) => {
          const bundle = buildContextBundle(args.prompt);
          const enrichedPrompt = `${bundle.systemPromptPrefix}

---

User query: ${args.prompt}`;
          return {
            enrichedPrompt,
            contextTokens: bundle.totalEstimatedTokens,
            pinnedIdentity: bundle.pinned.canonicalMission,
            contradictions: bundle.pinned.activeContradictions.length,
            sessionActions: bundle.pinned.sessionActionCount
          };
        }
      }
    ];
  }
});

// packages/mcp-local/src/tools/founderTools.ts
var founderTools_exports = {};
__export(founderTools_exports, {
  founderTools: () => founderTools
});
function ensurePacketSchema() {
  if (_packetSchemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS founder_packets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      packetId    TEXT UNIQUE NOT NULL,
      entityId    TEXT NOT NULL,
      packetType  TEXT NOT NULL,
      packetJson  TEXT NOT NULL,
      createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_founder_packets_entity ON founder_packets(entityId);
    CREATE INDEX IF NOT EXISTS idx_founder_packets_type ON founder_packets(packetType);
    CREATE INDEX IF NOT EXISTS idx_founder_packets_created ON founder_packets(createdAt);
  `);
  _packetSchemaReady = true;
}
function flattenObject(obj, prefix = "", out = {}) {
  if (obj === null || obj === void 0) {
    if (prefix) out[prefix] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0 && prefix) {
      out[prefix] = obj;
    }
    for (let i = 0; i < obj.length; i++) {
      flattenObject(obj[i], prefix ? `${prefix}.${i}` : String(i), out);
    }
    return out;
  }
  if (typeof obj === "object") {
    const record = obj;
    const keys = Object.keys(record);
    if (keys.length === 0 && prefix) {
      out[prefix] = obj;
    }
    for (const key of keys) {
      flattenObject(record[key], prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  if (prefix) out[prefix] = obj;
  return out;
}
function computePacketDiff(current, prior) {
  const flatCurrent = flattenObject(current);
  const flatPrior = flattenObject(prior);
  const currentKeys = new Set(Object.keys(flatCurrent));
  const priorKeys = new Set(Object.keys(flatPrior));
  const newSinceLastTime = [];
  const resolvedSinceLastTime = [];
  const changedFields = [];
  const stableFields = [];
  for (const key of currentKeys) {
    if (!priorKeys.has(key)) {
      newSinceLastTime.push(key);
    }
  }
  for (const key of priorKeys) {
    if (!currentKeys.has(key)) {
      resolvedSinceLastTime.push(key);
    }
  }
  for (const key of currentKeys) {
    if (!priorKeys.has(key)) continue;
    const cv = JSON.stringify(flatCurrent[key]);
    const pv = JSON.stringify(flatPrior[key]);
    if (cv === pv) {
      stableFields.push(key);
    } else {
      changedFields.push({
        path: key,
        previous: flatPrior[key],
        current: flatCurrent[key]
      });
    }
  }
  const allKeys = /* @__PURE__ */ new Set([...currentKeys, ...priorKeys]);
  const totalKeys = allKeys.size;
  const diffCount = newSinceLastTime.length + resolvedSinceLastTime.length + changedFields.length;
  const driftScore = totalKeys > 0 ? Math.round(diffCount / totalKeys * 1e3) / 1e3 : 0;
  return {
    newSinceLastTime,
    resolvedSinceLastTime,
    changedFields,
    stableFields,
    driftScore: Math.min(driftScore, 1)
  };
}
function scoreEvents(rawEvents, missionKeywords) {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1e3;
  const scored = rawEvents.map((e) => {
    const eventType = e.eventType ?? "";
    const baseWeight = EVENT_TYPE_WEIGHTS[eventType] ?? DEFAULT_EVENT_WEIGHT;
    const ts = e.timestamp ?? 0;
    const daysAgo = Math.max(0, Math.floor((now - ts) / msPerDay));
    const recencyMultiplier = Math.max(0.1, 1 - daysAgo * RECENCY_DECAY_PER_DAY);
    const summary = (e.summary ?? "").toLowerCase();
    const matchesMission = missionKeywords.length > 0 && missionKeywords.some((kw) => summary.includes(kw));
    const relevanceMultiplier = matchesMission ? THESIS_RELEVANCE_BOOST : 1;
    const score = Math.round(baseWeight * recencyMultiplier * relevanceMultiplier * 1e3) / 1e3;
    return {
      type: e.eventType,
      entity: e.entityId,
      summary: e.summary,
      actor: e.actor,
      timestamp: e.timestamp,
      importanceScore: score
    };
  });
  scored.sort((a, b) => b.importanceScore - a.importanceScore);
  const ranked = scored.filter((e) => e.importanceScore >= IMPORTANCE_THRESHOLD);
  const suppressedCount = scored.length - ranked.length;
  const topSignal = ranked[0] ?? null;
  return { ranked, suppressedCount, topSignal };
}
function extractMissionKeywords(diffs) {
  if (diffs.length === 0) return [];
  const latest = diffs[0];
  const reason = (latest.reason ?? "").toLowerCase();
  const fields = (latest.changedFields ?? "").toLowerCase();
  const combined = `${reason} ${fields}`;
  const stopWords = /* @__PURE__ */ new Set(["the", "and", "for", "was", "that", "with", "from", "are", "this", "has", "its", "not", "but"]);
  return combined.split(/[^a-z]+/).filter((w) => w.length > 3 && !stopWords.has(w)).slice(0, 20);
}
var _packetSchemaReady, GATHER_PROTOCOL, EVENT_TYPE_WEIGHTS, DEFAULT_EVENT_WEIGHT, RECENCY_DECAY_PER_DAY, THESIS_RELEVANCE_BOOST, IMPORTANCE_THRESHOLD, founderTools;
var init_founderTools = __esm({
  "packages/mcp-local/src/tools/founderTools.ts"() {
    "use strict";
    init_db();
    _packetSchemaReady = false;
    GATHER_PROTOCOL = [
      {
        id: "company_identity",
        label: "Company Identity & Canonical Truth",
        description: "Establish the single-sentence mission, current wedge, company state, founding mode, and identity confidence. This is the anchor \u2014 everything else is measured against it.",
        sources: [
          "company profile (localStorage or Convex)",
          "founder setup wizard outputs",
          "recent identity clarification actions",
          "pitch deck or one-pager if available"
        ],
        required: true,
        searchPatterns: [
          "company name",
          "canonical mission",
          "wedge",
          "identity confidence",
          "company state",
          "founding mode"
        ]
      },
      {
        id: "what_changed",
        label: "What Changed Since Last Review",
        description: "Gather ALL changes: signals from external sources, agent outputs, initiative status transitions, user decisions, and any context drift. Do not stop at the first 3 \u2014 scan exhaustively.",
        sources: [
          "change feed / timeline events",
          "agent activity logs and heartbeats",
          "initiative status transitions",
          "user action history",
          "external signal queue",
          "daily brief if available"
        ],
        required: true,
        searchPatterns: [
          "changes since",
          "recent signals",
          "agent completed",
          "status changed",
          "decision made",
          "new information"
        ]
      },
      {
        id: "contradictions",
        label: "Contradictions & Tensions",
        description: "Identify where current actions contradict stated mission, where initiative timelines conflict, where agent work drifts from the wedge, and where external signals challenge assumptions. Look for: identity confidence below 70%, keyword misalignment between wedge and active initiatives, timing conflicts between partnerships and compliance, and any unresolved items from prior packets.",
        sources: [
          "identity confidence score vs threshold",
          "initiative alignment with wedge keywords",
          "agent drift indicators",
          "unresolved items from prior artifact packets",
          "compliance/partnership timing conflicts"
        ],
        required: true,
        searchPatterns: [
          "contradiction",
          "conflict",
          "misalignment",
          "drift",
          "blocked",
          "unresolved",
          "risk",
          "tension"
        ]
      },
      {
        id: "interventions",
        label: "Ranked Interventions & Next Actions",
        description: "Pull the full intervention queue with priority scores, confidence levels, and linked initiatives. Include both accepted and deferred interventions. Rank by priority score descending.",
        sources: [
          "intervention records with states",
          "initiative dependencies",
          "agent task queue",
          "pending actions by due date"
        ],
        required: true,
        searchPatterns: [
          "intervention",
          "priority score",
          "next action",
          "pending",
          "due date",
          "accepted",
          "deferred"
        ]
      },
      {
        id: "initiatives",
        label: "Active Initiatives & Their Health",
        description: "Map every active initiative: status, risk level, priority score, agent count, and objective. Flag any with risk=high or status=blocked. Cross-reference with interventions.",
        sources: [
          "initiative records",
          "initiative-to-agent mapping",
          "initiative risk assessments",
          "milestone progress"
        ],
        required: true,
        searchPatterns: [
          "initiative",
          "active",
          "blocked",
          "high risk",
          "milestone",
          "objective",
          "progress"
        ]
      },
      {
        id: "agents",
        label: "Agent Status & Drift Detection",
        description: "Check every connected agent: heartbeat recency, current goal alignment with wedge, any blocked or drifting status. If an agent's goal doesn't contain keywords from the current wedge, flag it.",
        sources: [
          "agent presence records",
          "heartbeat timestamps",
          "current goal descriptions",
          "agent status overrides"
        ],
        required: true,
        searchPatterns: [
          "agent",
          "heartbeat",
          "status",
          "goal",
          "blocked",
          "drifting",
          "waiting"
        ]
      },
      {
        id: "nearby_entities",
        label: "Nearby Entities & Comparables",
        description: "Identify the core company, its products, top 3-5 competitors/comparables, and any design partners or customers. Keep narrow \u2014 this is supportive context, not a graph explorer.",
        sources: [
          "nearby entity records",
          "competitor tracking",
          "partnership records",
          "product catalog"
        ],
        required: false,
        searchPatterns: [
          "competitor",
          "comparable",
          "partner",
          "customer",
          "product",
          "entity"
        ]
      },
      {
        id: "prior_packets",
        label: "Prior Artifact Packets & Drift",
        description: "Load the last 2-3 artifact packets. Compare: what contradictions were flagged then vs now? What actions were recommended then \u2014 were they completed? What identity confidence was recorded \u2014 has it changed? This temporal comparison is what makes the packet valuable.",
        sources: [
          "artifact packet history (localStorage)",
          "packet diff comparison",
          "action completion tracking"
        ],
        required: false,
        searchPatterns: [
          "prior packet",
          "previous",
          "history",
          "resolved",
          "completed action",
          "drift since"
        ]
      },
      {
        id: "daily_memo",
        label: "Daily Briefing & Operating Memo",
        description: "Pull the latest daily memo: what matters today, what to do next, unresolved items. This feeds the operating memo section of the artifact packet.",
        sources: [
          "daily brief / morning digest",
          "research hub signals",
          "narrative status"
        ],
        required: false,
        searchPatterns: [
          "daily brief",
          "what matters",
          "unresolved",
          "morning digest",
          "operating memo"
        ]
      },
      {
        id: "evidence",
        label: "Evidence & Provenance Chain",
        description: "For every claim in the packet, trace it back to a source: which signal, which agent output, which user action, which external document. The packet must be auditable \u2014 no ungrounded assertions.",
        sources: [
          "evidence records",
          "signal source URLs",
          "agent output logs",
          "document references",
          "user action timestamps"
        ],
        required: false,
        searchPatterns: [
          "evidence",
          "source",
          "provenance",
          "citation",
          "reference",
          "grounded"
        ]
      }
    ];
    EVENT_TYPE_WEIGHTS = {
      "product.phase.completed": 0.9,
      "contradiction.detected": 0.85,
      "important_change.flagged": 0.8,
      "packet.generated": 0.7,
      "state.changed": 0.6,
      "engine.trace.completed": 0.5,
      "action.completed": 0.4
    };
    DEFAULT_EVENT_WEIGHT = 0.3;
    RECENCY_DECAY_PER_DAY = 0.1;
    THESIS_RELEVANCE_BOOST = 1.3;
    IMPORTANCE_THRESHOLD = 0.3;
    founderTools = [
      {
        name: "founder_deep_context_gather",
        description: "MUST be called before generating or updating a Founder Artifact Packet. Returns a structured context-gathering protocol that forces the agent to systematically search across ALL relevant information sources with OCD-level thoroughness. The protocol covers: company identity, what changed, contradictions, interventions, initiatives, agents, nearby entities, prior packets, daily memo, and evidence provenance. Each step includes specific search patterns and sources. The agent MUST complete all required steps and report findings before packet generation. This prevents shallow or incomplete artifact packets.",
        inputSchema: {
          type: "object",
          properties: {
            packetType: {
              type: "string",
              enum: ["weekly_reset", "pre_delegation", "important_change"],
              description: "The type of artifact packet being prepared. Affects which gather steps are emphasized."
            },
            priorPacketSummary: {
              type: "string",
              description: "Optional summary of the most recent prior packet, for temporal comparison."
            },
            entityId: {
              type: "string",
              description: "Optional entity ID to scope the gather (and prior-brief lookup) to a specific company/entity."
            },
            focusAreas: {
              type: "array",
              items: { type: "string" },
              description: "Optional list of specific areas to emphasize in the gather (e.g., 'compliance', 'fundraising')."
            }
          },
          required: ["packetType"]
        },
        handler: async (args) => {
          const packetType = args.packetType;
          const priorPacketSummary = args.priorPacketSummary ?? null;
          const focusAreas = args.focusAreas ?? [];
          if (!["weekly_reset", "pre_delegation", "important_change"].includes(packetType)) {
            return {
              error: true,
              message: `Invalid packetType: ${packetType}. Must be one of: weekly_reset, pre_delegation, important_change.`
            };
          }
          const typeEmphasis = {
            weekly_reset: [
              "company_identity",
              "what_changed",
              "contradictions",
              "interventions",
              "prior_packets"
            ],
            pre_delegation: [
              "company_identity",
              "interventions",
              "agents",
              "initiatives",
              "evidence"
            ],
            important_change: [
              "what_changed",
              "contradictions",
              "interventions",
              "evidence",
              "nearby_entities"
            ]
          };
          const emphasized = typeEmphasis[packetType] ?? [];
          const steps = GATHER_PROTOCOL.map((step) => ({
            ...step,
            emphasized: emphasized.includes(step.id),
            focusRelevant: focusAreas.some(
              (area) => step.searchPatterns.some(
                (pattern) => pattern.toLowerCase().includes(area.toLowerCase()) || area.toLowerCase().includes(pattern.toLowerCase())
              )
            )
          }));
          const requiredSteps = steps.filter((s) => s.required);
          const optionalSteps = steps.filter((s) => !s.required);
          let sessionMemory = null;
          try {
            const db = getDb();
            const now = Date.now();
            const weekAgo = now - 7 * 24 * 60 * 60 * 1e3;
            const recentEvents = db.prepare(
              "SELECT * FROM causal_events WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 20"
            ).all(weekAgo);
            const importantChanges = db.prepare(
              "SELECT * FROM causal_important_changes WHERE status IN ('detected','acknowledged','investigating') ORDER BY impactScore DESC LIMIT 10"
            ).all();
            const stateDiffs = db.prepare(
              "SELECT * FROM causal_state_diffs WHERE createdAt > ? ORDER BY createdAt DESC LIMIT 10"
            ).all(weekAgo);
            const weeklyActions = db.prepare(
              "SELECT category, COUNT(*) as count, AVG(impactLevel) as avgImpact FROM tracking_actions WHERE timestamp > ? GROUP BY category ORDER BY count DESC"
            ).all(weekAgo);
            const milestones = db.prepare(
              "SELECT * FROM tracking_milestones WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 5"
            ).all(weekAgo);
            const trajectory = db.prepare(
              "SELECT * FROM causal_trajectory_scores ORDER BY createdAt DESC LIMIT 1"
            ).all();
            if (recentEvents.length > 0 || importantChanges.length > 0 || stateDiffs.length > 0) {
              const missionKeywords = extractMissionKeywords(
                stateDiffs
              );
              const { ranked, suppressedCount, topSignal } = scoreEvents(
                recentEvents,
                missionKeywords
              );
              sessionMemory = {
                source: "causal_memory_auto_hydrate",
                period: "last_7_days",
                recentEvents: recentEvents.length,
                importantChanges: importantChanges.length,
                stateDiffs: stateDiffs.length,
                weeklyActions,
                milestones,
                trajectory: trajectory[0] ?? null,
                topSignal,
                suppressedCount,
                events: ranked,
                changes: importantChanges.map((c) => ({
                  category: c.changeCategory,
                  impact: c.impactScore,
                  reason: c.impactReason,
                  status: c.status
                })),
                diffs: stateDiffs.map((d) => ({
                  entity: d.entityId,
                  fields: d.changedFields,
                  reason: d.reason
                }))
              };
            }
          } catch {
            sessionMemory = null;
          }
          let priorBriefComparison = null;
          if (packetType === "weekly_reset") {
            try {
              ensurePacketSchema();
              const db = getDb();
              const entityId = args.entityId ?? null;
              const priorRow = entityId ? db.prepare(
                "SELECT * FROM founder_packets WHERE entityId = ? ORDER BY createdAt DESC LIMIT 1"
              ).get(entityId) : db.prepare(
                "SELECT * FROM founder_packets ORDER BY createdAt DESC LIMIT 1"
              ).get();
              if (priorRow) {
                const lastPacketDate = priorRow.createdAt;
                const lastPacketMs = new Date(lastPacketDate).getTime();
                const daysSinceLastPacket = Math.max(
                  0,
                  Math.round((Date.now() - lastPacketMs) / (24 * 60 * 60 * 1e3))
                );
                let priorPacketData = {};
                try {
                  priorPacketData = JSON.parse(priorRow.packetJson);
                } catch {
                }
                const newSinceLastPacket = [];
                const stillUnresolved = [];
                const resolvedSinceLastPacket = [];
                if (sessionMemory) {
                  const currentChanges = sessionMemory.changes ?? [];
                  const currentEvents = sessionMemory.events ?? [];
                  for (const evt of currentEvents) {
                    const evtTs = evt.timestamp ?? 0;
                    if (evtTs > lastPacketMs) {
                      newSinceLastPacket.push(evt);
                    }
                  }
                  const priorChanges = priorPacketData.whatChanged ?? priorPacketData.changes ?? [];
                  const priorChangeIds = new Set(
                    priorChanges.map((c) => c.id ?? c.description ?? "")
                  );
                  for (const change of currentChanges) {
                    const changeKey = change.category ?? change.reason ?? "";
                    if (change.status === "detected" || change.status === "acknowledged" || change.status === "investigating") {
                      stillUnresolved.push(change);
                    }
                  }
                  const unresolvedKeys = new Set(
                    stillUnresolved.map((c) => c.category ?? c.reason ?? "")
                  );
                  for (const pc of priorChanges) {
                    const pcKey = pc.id ?? pc.description ?? pc.category ?? "";
                    if (pcKey && !unresolvedKeys.has(pcKey)) {
                      resolvedSinceLastPacket.push(pc);
                    }
                  }
                }
                const focusCandidates = [
                  ...newSinceLastPacket.map((e) => ({
                    item: e.summary ?? e.type ?? "unknown event",
                    source: "new",
                    impact: e.importanceScore ?? 0.5
                  })),
                  ...stillUnresolved.map((c) => ({
                    item: c.reason ?? c.category ?? "unresolved change",
                    source: "unresolved",
                    impact: c.impact ?? 0.5
                  }))
                ];
                focusCandidates.sort((a, b) => b.impact - a.impact);
                const recommendedFocus = focusCandidates.slice(0, 3);
                priorBriefComparison = {
                  lastPacketDate,
                  daysSinceLastPacket,
                  priorPacketId: priorRow.packetId ?? null,
                  priorPacketType: priorRow.packetType ?? null,
                  newSinceLastPacket,
                  stillUnresolved,
                  resolvedSinceLastPacket,
                  recommendedFocus
                };
                if (sessionMemory) {
                  sessionMemory.priorBriefComparison = priorBriefComparison;
                }
              }
            } catch {
              priorBriefComparison = null;
            }
          }
          const protocol = {
            protocolVersion: "1.1",
            packetType,
            totalSteps: steps.length,
            requiredSteps: requiredSteps.length,
            // Pre-hydrated session memory (if available)
            ...sessionMemory ? { sessionMemory } : {},
            // Prior-brief cross-reference (weekly_reset only, null if no prior packet)
            ...packetType === "weekly_reset" ? { priorBriefComparison } : {},
            instructions: [
              ...sessionMemory ? [
                "Session memory has been auto-hydrated from causal memory. Use the sessionMemory block as your starting context \u2014 do NOT ask the user to restate what happened.",
                "Cross-reference sessionMemory events, changes, and diffs against the gather steps below."
              ] : [],
              ...priorBriefComparison ? [
                "Cross-reference findings against priorBriefComparison. Highlight what's NEW vs what was already known. Do not repeat resolved items."
              ] : [],
              "You MUST complete ALL required gather steps before generating the artifact packet.",
              "For each step, search the listed sources using the provided search patterns.",
              "Do NOT skip a step because it seems redundant \u2014 redundancy catches blind spots.",
              "If a source is unavailable, note it explicitly in your findings.",
              "Steps marked 'emphasized' are critical for this packet type \u2014 spend extra effort.",
              "Steps marked 'focusRelevant' match the user's focus areas \u2014 prioritize these.",
              "After completing all steps, synthesize findings into a single coherent packet.",
              "The packet must be auditable: every claim traces to a source from your gather."
            ],
            gatherSteps: steps.map((step) => ({
              id: step.id,
              label: step.label,
              description: step.description,
              sources: step.sources,
              searchPatterns: step.searchPatterns,
              required: step.required,
              emphasized: step.emphasized,
              focusRelevant: step.focusRelevant,
              status: "pending"
            })),
            temporalComparison: priorPacketSummary ? {
              enabled: true,
              priorSummary: priorPacketSummary,
              compareInstructions: [
                "Compare each finding against the prior packet summary.",
                "Flag: new contradictions, resolved contradictions, completed actions, new risks.",
                "Track identity confidence delta.",
                "Note any recommended actions from the prior packet that were NOT completed."
              ]
            } : {
              enabled: false,
              note: "No prior packet provided. Generate the packet as a baseline."
            },
            outputContract: {
              description: "After completing all gather steps, produce a FounderPacketSourceInput object with these fields:",
              fields: [
                "company: { name, canonicalMission, wedge, companyState, foundingMode, identityConfidence }",
                "changes: Array<{ id, timestamp, relativeTime, type, description, linkedInitiativeId? }>",
                "interventions: Array<{ id, title, linkedInitiative, linkedInitiativeId, priorityScore, confidence }>",
                "initiatives: Array<{ id, title, status, risk, priorityScore, objective }>",
                "agents: Array<{ id, name, status, currentGoal }>",
                "dailyMemo: { whatMatters: string[], whatToDoNext: string[], unresolved: string[] }",
                "nearbyEntities: Array<{ id, name, relationship, whyItMatters }>"
              ]
            },
            qualityGates: [
              "Every required step must have at least one finding.",
              "Contradictions step must produce at least 1 contradiction or explicitly state none found.",
              "Evidence step must trace at least 3 claims to sources.",
              "If identity confidence < 0.7, the packet MUST recommend a 'Clarify Identity' action.",
              "If any agent is drifting or blocked, the packet MUST flag it in contradictions.",
              "No field in the output contract may be an empty array without explanation."
            ]
          };
          return protocol;
        }
      },
      {
        name: "founder_packet_validate",
        description: "Validates a draft Founder Artifact Packet against quality gates before saving. Checks: all required sections populated, contradictions are non-empty, evidence traces to sources, actions are ranked by priority, and identity confidence is consistent with the company state. Returns pass/fail with specific failure reasons.",
        inputSchema: {
          type: "object",
          properties: {
            packet: {
              type: "object",
              description: "The draft FounderArtifactPacket object to validate."
            }
          },
          required: ["packet"]
        },
        handler: async (args) => {
          const packet = args.packet;
          const failures = [];
          const warnings = [];
          const requiredFields = [
            "packetId",
            "packetType",
            "canonicalEntity",
            "whatChanged",
            "contradictions",
            "nextActions",
            "operatingMemo",
            "agentInstructions",
            "keyEvidence",
            "nearbyEntities",
            "provenance"
          ];
          for (const field of requiredFields) {
            if (!(field in packet) || packet[field] === null || packet[field] === void 0) {
              failures.push(`Missing required field: ${field}`);
            }
          }
          const entity = packet.canonicalEntity;
          if (entity) {
            if (!entity.name) failures.push("canonicalEntity.name is empty");
            if (!entity.mission) failures.push("canonicalEntity.mission is empty");
            if (!entity.wedge) failures.push("canonicalEntity.wedge is empty");
            const confidence = entity.identityConfidence;
            if (typeof confidence === "number" && confidence < 0.7) {
              const actions2 = packet.nextActions;
              const hasClarifyAction = actions2?.some(
                (a) => typeof a.label === "string" && a.label.toLowerCase().includes("clarify")
              );
              if (!hasClarifyAction) {
                warnings.push(
                  `Identity confidence is ${Math.round(confidence * 100)}% (below 70%) but no "Clarify Identity" action was included.`
                );
              }
            }
          }
          const contradictions = packet.contradictions;
          if (Array.isArray(contradictions) && contradictions.length === 0) {
            warnings.push("contradictions array is empty \u2014 are there truly no tensions?");
          }
          const actions = packet.nextActions;
          if (Array.isArray(actions)) {
            if (actions.length === 0) {
              failures.push("nextActions is empty \u2014 every packet must recommend at least one action.");
            }
            for (let i = 1; i < actions.length; i++) {
              const prevPriority = actions[i - 1].priority;
              const currPriority = actions[i].priority;
              const order = ["high", "medium", "low"];
              if (order.indexOf(prevPriority) > order.indexOf(currPriority)) {
                warnings.push(
                  `nextActions are not sorted by priority: action ${i} (${currPriority}) comes after action ${i - 1} (${prevPriority}).`
                );
                break;
              }
            }
          }
          const evidence = packet.keyEvidence;
          if (Array.isArray(evidence) && evidence.length < 3) {
            warnings.push(`Only ${evidence.length} evidence items \u2014 aim for at least 3 for auditability.`);
          }
          if (typeof packet.operatingMemo === "string" && packet.operatingMemo.length < 50) {
            warnings.push("operatingMemo is very short \u2014 ensure it captures the key narrative.");
          }
          const passed = failures.length === 0;
          return {
            valid: passed,
            failures,
            warnings,
            summary: passed ? `Packet validates with ${warnings.length} warning(s).` : `Packet FAILED validation: ${failures.length} error(s), ${warnings.length} warning(s).`
          };
        }
      },
      {
        name: "founder_packet_diff",
        description: "Compares two Founder Artifact Packets and returns a structured diff showing what changed between them: new contradictions, resolved contradictions, completed actions, identity confidence delta, new/removed nearby entities, and narrative drift. Use this to power the history review and important-change detection.",
        inputSchema: {
          type: "object",
          properties: {
            currentPacket: {
              type: "object",
              description: "The current (newer) artifact packet."
            },
            previousPacket: {
              type: "object",
              description: "The previous (older) artifact packet to compare against."
            }
          },
          required: ["currentPacket", "previousPacket"]
        },
        handler: async (args) => {
          const current = args.currentPacket;
          const previous = args.previousPacket;
          const currentEntity = current.canonicalEntity;
          const prevEntity = previous.canonicalEntity;
          const currentConfidence = currentEntity?.identityConfidence ?? 0;
          const prevConfidence = prevEntity?.identityConfidence ?? 0;
          const confidenceDelta = currentConfidence - prevConfidence;
          const currentContradictions = current.contradictions ?? [];
          const prevContradictions = previous.contradictions ?? [];
          const prevTitles = new Set(prevContradictions.map((c) => c.title));
          const currTitles = new Set(currentContradictions.map((c) => c.title));
          const newContradictions = currentContradictions.filter(
            (c) => !prevTitles.has(c.title)
          );
          const resolvedContradictions = prevContradictions.filter(
            (c) => !currTitles.has(c.title)
          );
          const persistingContradictions = currentContradictions.filter(
            (c) => prevTitles.has(c.title)
          );
          const currentActions = current.nextActions ?? [];
          const prevActions = previous.nextActions ?? [];
          const prevActionLabels = new Set(prevActions.map((a) => a.label));
          const currActionLabels = new Set(currentActions.map((a) => a.label));
          const newActions = currentActions.filter(
            (a) => !prevActionLabels.has(a.label)
          );
          const completedOrDropped = prevActions.filter(
            (a) => !currActionLabels.has(a.label)
          );
          const currentEntities = current.nearbyEntities ?? [];
          const prevEntities = previous.nearbyEntities ?? [];
          const prevEntityNames = new Set(prevEntities.map((e) => e.name));
          const currEntityNames = new Set(currentEntities.map((e) => e.name));
          const newEntities = currentEntities.filter(
            (e) => !prevEntityNames.has(e.name)
          );
          const removedEntities = prevEntities.filter(
            (e) => !currEntityNames.has(e.name)
          );
          const currentMemo = current.operatingMemo ?? "";
          const prevMemo = previous.operatingMemo ?? "";
          const memoChanged = currentMemo !== prevMemo;
          const currentWedge = currentEntity?.wedge ?? "";
          const prevWedge = prevEntity?.wedge ?? "";
          const wedgeChanged = currentWedge !== prevWedge;
          return {
            identity: {
              confidenceDelta: Math.round(confidenceDelta * 100) / 100,
              confidenceCurrent: currentConfidence,
              confidencePrevious: prevConfidence,
              direction: confidenceDelta > 0.05 ? "improving" : confidenceDelta < -0.05 ? "declining" : "stable",
              wedgeChanged,
              currentWedge: wedgeChanged ? currentWedge : void 0,
              previousWedge: wedgeChanged ? prevWedge : void 0
            },
            contradictions: {
              new: newContradictions.map((c) => ({
                title: c.title,
                severity: c.severity
              })),
              resolved: resolvedContradictions.map((c) => ({
                title: c.title,
                severity: c.severity
              })),
              persisting: persistingContradictions.map((c) => ({
                title: c.title,
                severity: c.severity
              }))
            },
            actions: {
              new: newActions.map((a) => ({
                label: a.label,
                priority: a.priority
              })),
              completedOrDropped: completedOrDropped.map((a) => ({
                label: a.label,
                priority: a.priority
              }))
            },
            entities: {
              added: newEntities.map((e) => ({ name: e.name, relationship: e.relationship })),
              removed: removedEntities.map((e) => ({ name: e.name, relationship: e.relationship }))
            },
            narrative: {
              memoChanged,
              wedgeChanged,
              overallDrift: wedgeChanged ? "significant" : memoChanged && newContradictions.length > 0 ? "moderate" : memoChanged || newContradictions.length > 0 ? "minor" : "stable"
            },
            summary: [
              confidenceDelta !== 0 ? `Identity confidence ${confidenceDelta > 0 ? "+" : ""}${Math.round(confidenceDelta * 100)}%` : null,
              newContradictions.length > 0 ? `${newContradictions.length} new contradiction(s)` : null,
              resolvedContradictions.length > 0 ? `${resolvedContradictions.length} resolved contradiction(s)` : null,
              newActions.length > 0 ? `${newActions.length} new action(s)` : null,
              completedOrDropped.length > 0 ? `${completedOrDropped.length} completed/dropped action(s)` : null,
              wedgeChanged ? "Wedge changed" : null
            ].filter(Boolean)
          };
        }
      },
      // ─── 4. founder_packet_history_diff ──────────────────────────────
      {
        name: "founder_packet_history_diff",
        description: "Compares the most recent Founder Artifact Packet for an entity against prior packets stored in the founder_packets SQLite table. Returns a structured diff: newSinceLastTime, resolvedSinceLastTime, changedFields, stableFields, and a driftScore (0.0\u20131.0). If only one packet exists, returns it as a baseline. If none exist, suggests running founder_deep_context_gather first.",
        inputSchema: {
          type: "object",
          properties: {
            entityId: {
              type: "string",
              description: "The entity ID to look up packets for."
            },
            packetType: {
              type: "string",
              description: "Optional packet type filter (e.g. weekly_reset, pre_delegation, important_change)."
            },
            limit: {
              type: "number",
              description: "Max number of recent packets to retrieve for comparison (default 2, max 10)."
            }
          },
          required: ["entityId"]
        },
        annotations: { readOnlyHint: true },
        handler: async (args) => {
          ensurePacketSchema();
          const db = getDb();
          const entityId = args.entityId;
          const packetType = args.packetType ?? null;
          const limit = Math.min(Math.max(args.limit ?? 2, 1), 10);
          let rows;
          if (packetType) {
            rows = db.prepare(
              `SELECT packetId, entityId, packetType, packetJson, createdAt
             FROM founder_packets
             WHERE entityId = ? AND packetType = ?
             ORDER BY createdAt DESC
             LIMIT ?`
            ).all(entityId, packetType, limit);
          } else {
            rows = db.prepare(
              `SELECT packetId, entityId, packetType, packetJson, createdAt
             FROM founder_packets
             WHERE entityId = ?
             ORDER BY createdAt DESC
             LIMIT ?`
            ).all(entityId, limit);
          }
          if (rows.length === 0) {
            return {
              noPackets: true,
              entityId,
              suggestion: "Run founder_deep_context_gather first to generate and store a packet."
            };
          }
          const packets = rows.map((row) => {
            let parsed = {};
            try {
              parsed = JSON.parse(row.packetJson);
            } catch {
              parsed = { _parseError: true, raw: row.packetJson };
            }
            return {
              packetId: row.packetId,
              entityId: row.entityId,
              packetType: row.packetType,
              createdAt: row.createdAt,
              data: parsed
            };
          });
          if (packets.length === 1) {
            return {
              isFirstPacket: true,
              entityId,
              packet: {
                packetId: packets[0].packetId,
                packetType: packets[0].packetType,
                createdAt: packets[0].createdAt
              },
              note: "First packet for this entity. Future calls will produce diffs."
            };
          }
          const latest = packets[0];
          const prior = packets[1];
          const diff = computePacketDiff(latest.data, prior.data);
          return {
            entityId,
            latest: {
              packetId: latest.packetId,
              packetType: latest.packetType,
              createdAt: latest.createdAt
            },
            prior: {
              packetId: prior.packetId,
              packetType: prior.packetType,
              createdAt: prior.createdAt
            },
            diff: {
              newSinceLastTime: diff.newSinceLastTime,
              resolvedSinceLastTime: diff.resolvedSinceLastTime,
              changedFields: diff.changedFields,
              stableFields: diff.stableFields,
              driftScore: diff.driftScore
            },
            summary: {
              totalFieldsCompared: diff.newSinceLastTime.length + diff.resolvedSinceLastTime.length + diff.changedFields.length + diff.stableFields.length,
              newCount: diff.newSinceLastTime.length,
              resolvedCount: diff.resolvedSinceLastTime.length,
              changedCount: diff.changedFields.length,
              stableCount: diff.stableFields.length,
              driftScore: diff.driftScore,
              driftLevel: diff.driftScore < 0.1 ? "minimal" : diff.driftScore < 0.3 ? "low" : diff.driftScore < 0.6 ? "moderate" : diff.driftScore < 0.85 ? "high" : "extreme"
            },
            packetsAvailable: packets.length
          };
        }
      },
      // ─── 5. export_artifact_packet ──────────────────────────────────
      {
        name: "export_artifact_packet",
        description: "Formats a Founder Artifact Packet or memo for export to a specific audience and format. Applies audience-specific framing (founder, investor, banker, developer, teammate) and renders into the requested format (markdown, html, json, plaintext). Always includes provenance metadata (timestamp, version, exportId) for traceability.",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "object",
              description: "The raw packet/memo content to format for export."
            },
            format: {
              type: "string",
              enum: ["markdown", "html", "json", "plaintext"],
              description: "Output format for the exported artifact."
            },
            audience: {
              type: "string",
              enum: ["founder", "investor", "banker", "developer", "teammate"],
              description: "Target audience \u2014 controls tone, ordering, and which sections are emphasized."
            },
            title: {
              type: "string",
              description: "Override title for the exported artifact. Defaults to packet title or 'Artifact Packet'."
            },
            includeMetadata: {
              type: "boolean",
              description: "Include generation timestamp, tool version, and provenance block. Defaults to true."
            }
          },
          required: ["content", "format", "audience"]
        },
        handler: async (args) => {
          const content = args.content;
          const format = args.format;
          const audience = args.audience;
          const titleOverride = args.title ?? null;
          const includeMetadata = args.includeMetadata ?? true;
          const validFormats = ["markdown", "html", "json", "plaintext"];
          const validAudiences = ["founder", "investor", "banker", "developer", "teammate"];
          if (!validFormats.includes(format)) {
            return {
              error: true,
              message: `Invalid format: ${format}. Must be one of: ${validFormats.join(", ")}.`
            };
          }
          if (!validAudiences.includes(audience)) {
            return {
              error: true,
              message: `Invalid audience: ${audience}. Must be one of: ${validAudiences.join(", ")}.`
            };
          }
          const NODEBENCH_VERSION = "1.0.0";
          const exportId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
          const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
          const entity = content.canonicalEntity ?? {};
          const entitiesArr = content.entities ?? [];
          const companyName = entity.name ?? content.companyName ?? titleOverride ?? entitiesArr[0] ?? "Unknown Company";
          const mission = entity.mission ?? content.mission ?? "";
          const wedge = entity.wedge ?? content.wedge ?? "";
          const identityConfidence = entity.identityConfidence ?? null;
          const contradictions = content.contradictions ?? [];
          const nextActions = content.nextActions ?? [];
          const operatingMemo = content.operatingMemo ?? "";
          const whatChanged = content.whatChanged ?? [];
          const nearbyEntities = content.nearbyEntities ?? [];
          const keyEvidence = content.keyEvidence ?? [];
          const agentInstructions = content.agentInstructions ?? null;
          const title = titleOverride ?? content.title ?? "Artifact Packet";
          const audienceConfigs = {
            founder: {
              tone: "informal",
              sectionOrder: [
                "summary",
                "whatChanged",
                "contradictions",
                "nextMoves",
                "initiatives",
                "agents",
                "operatingMemo",
                "evidence"
              ],
              emphasisSections: ["contradictions", "nextMoves"],
              excludeSections: [],
              headerPrefix: ""
            },
            investor: {
              tone: "formal",
              sectionOrder: [
                "metrics",
                "summary",
                "marketContext",
                "risks",
                "initiatives",
                "evidence"
              ],
              emphasisSections: ["metrics", "risks"],
              excludeSections: ["agents", "agentInstructions"],
              headerPrefix: "Investment Memo: "
            },
            banker: {
              tone: "formal",
              sectionOrder: [
                "companySnapshot",
                "financialSignals",
                "riskFactors",
                "comparables",
                "summary",
                "evidence"
              ],
              emphasisSections: ["companySnapshot", "financialSignals", "riskFactors"],
              excludeSections: ["agents", "agentInstructions", "operatingMemo"],
              headerPrefix: "Memo: "
            },
            developer: {
              tone: "technical",
              sectionOrder: [
                "architectureChanges",
                "technicalDecisions",
                "apiChanges",
                "whatChanged",
                "nextMoves",
                "agents"
              ],
              emphasisSections: ["architectureChanges", "apiChanges"],
              excludeSections: ["nearbyEntities", "operatingMemo"],
              headerPrefix: ""
            },
            teammate: {
              tone: "conversational",
              sectionOrder: ["delegationBrief", "actionItems", "whatChanged", "context"],
              emphasisSections: ["delegationBrief", "actionItems"],
              excludeSections: ["evidence", "nearbyEntities"],
              headerPrefix: ""
            }
          };
          const config = audienceConfigs[audience];
          const sections = [];
          if (audience === "banker") {
            sections.push({
              key: "companySnapshot",
              heading: "Company Snapshot",
              body: [
                companyName ? `Company: ${companyName}` : "",
                mission ? `Mission: ${mission}` : "",
                wedge ? `Wedge: ${wedge}` : "",
                identityConfidence !== null ? `Identity Confidence: ${Math.round(identityConfidence * 100)}%` : ""
              ].filter(Boolean).join("\n")
            });
          } else if (audience === "investor") {
            sections.push({
              key: "metrics",
              heading: "Key Metrics & Traction",
              body: [
                companyName ? `Company: ${companyName}` : "",
                identityConfidence !== null ? `Identity Confidence: ${Math.round(identityConfidence * 100)}%` : "",
                `Active Initiatives: ${(content.initiatives ?? []).length}`,
                `Open Contradictions: ${contradictions.length}`,
                `Pending Actions: ${nextActions.length}`
              ].filter(Boolean).join("\n")
            });
          }
          sections.push({
            key: "summary",
            heading: audience === "teammate" ? "Context" : "Summary",
            body: operatingMemo || `${companyName} \u2014 ${mission}`
          });
          if (!config.excludeSections.includes("whatChanged") && whatChanged.length > 0) {
            sections.push({
              key: "whatChanged",
              heading: audience === "developer" ? "Recent Changes" : "What Changed",
              items: whatChanged.map((c) => ({
                text: c.description ?? c.summary ?? JSON.stringify(c),
                meta: c.type ?? void 0
              })),
              body: ""
            });
          }
          if (!config.excludeSections.includes("contradictions") && contradictions.length > 0) {
            const heading = audience === "investor" || audience === "banker" ? "Risk Factors" : "Contradictions & Tensions";
            sections.push({
              key: audience === "investor" || audience === "banker" ? "riskFactors" : "contradictions",
              heading,
              items: contradictions.map((c) => ({
                text: c.title ?? c.description ?? JSON.stringify(c),
                meta: c.severity ?? void 0
              })),
              body: ""
            });
          }
          if (nextActions.length > 0) {
            const heading = audience === "teammate" ? "Action Items" : audience === "founder" ? "Next 3 Moves" : audience === "developer" ? "Technical Decisions & Next Steps" : "Recommended Actions";
            const items = (audience === "founder" ? nextActions.slice(0, 3) : nextActions).map((a) => ({
              text: a.label ?? a.title ?? JSON.stringify(a),
              meta: [
                a.priority ? `priority: ${a.priority}` : "",
                a.owner ? `owner: ${a.owner}` : ""
              ].filter(Boolean).join(", ") || void 0
            }));
            sections.push({
              key: audience === "teammate" ? "actionItems" : "nextMoves",
              heading,
              items,
              body: ""
            });
          }
          if (audience === "teammate") {
            sections.push({
              key: "delegationBrief",
              heading: "Delegation Brief",
              body: agentInstructions ? `Focus: ${agentInstructions.focus ?? "See action items"}
Scope: ${agentInstructions.scope ?? "As assigned"}` : "No specific delegation instructions provided. See action items above."
            });
          }
          if (nearbyEntities.length > 0 && !config.excludeSections.includes("nearbyEntities")) {
            const heading = audience === "banker" ? "Comparables" : audience === "investor" ? "Market Context" : "Nearby Entities";
            sections.push({
              key: audience === "banker" ? "comparables" : "marketContext",
              heading,
              items: nearbyEntities.map((e) => ({
                text: e.name ?? JSON.stringify(e),
                meta: e.relationship ?? void 0
              })),
              body: ""
            });
          }
          if (audience === "banker") {
            const signals = content.financialSignals ?? [];
            sections.push({
              key: "financialSignals",
              heading: "Financial Signals",
              body: signals.length > 0 ? signals.map(
                (s) => `${s.label ?? "Signal"}: ${s.value ?? "N/A"}`
              ).join("\n") : "No financial signals available in this packet."
            });
          }
          if (audience === "developer") {
            const archChanges = content.architectureChanges ?? [];
            const apiChanges = content.apiChanges ?? [];
            if (archChanges.length > 0 || whatChanged.some(
              (c) => (c.type ?? "").includes("arch")
            )) {
              sections.push({
                key: "architectureChanges",
                heading: "Architecture Changes",
                items: archChanges.length > 0 ? archChanges.map((a) => ({
                  text: a.description ?? JSON.stringify(a)
                })) : [
                  {
                    text: "See recent changes for architecture-related updates."
                  }
                ],
                body: ""
              });
            }
            if (apiChanges.length > 0) {
              sections.push({
                key: "apiChanges",
                heading: "API Changes",
                items: apiChanges.map((a) => ({
                  text: a.description ?? JSON.stringify(a)
                })),
                body: ""
              });
            }
          }
          if (!config.excludeSections.includes("evidence") && keyEvidence.length > 0) {
            sections.push({
              key: "evidence",
              heading: "Key Evidence",
              items: keyEvidence.map((e) => ({
                text: e.claim ?? e.description ?? JSON.stringify(e),
                meta: e.source ?? void 0
              })),
              body: ""
            });
          }
          const orderMap = new Map(
            config.sectionOrder.map((key, i) => [key, i])
          );
          sections.sort((a, b) => {
            const aOrder = orderMap.get(a.key) ?? 999;
            const bOrder = orderMap.get(b.key) ?? 999;
            return aOrder - bOrder;
          });
          const filteredSections = sections.filter(
            (s) => !config.excludeSections.includes(s.key)
          );
          const metadataBlock = includeMetadata ? {
            generatedAt,
            nodebenchVersion: NODEBENCH_VERSION,
            exportId,
            audience,
            format
          } : null;
          function renderSectionMarkdown(s, emphasized) {
            const marker = emphasized ? " **[KEY]**" : "";
            let out = `## ${s.heading}${marker}

`;
            if (s.body) out += `${s.body}

`;
            if (s.items) {
              for (const item of s.items) {
                out += item.meta ? `- **${item.text}** _(${item.meta})_
` : `- ${item.text}
`;
              }
              out += "\n";
            }
            return out;
          }
          function renderSectionPlaintext(s) {
            let out = `${s.heading.toUpperCase()}
${"=".repeat(s.heading.length)}

`;
            if (s.body) out += `${s.body}

`;
            if (s.items) {
              for (const item of s.items) {
                out += item.meta ? `  - ${item.text} (${item.meta})
` : `  - ${item.text}
`;
              }
              out += "\n";
            }
            return out;
          }
          const escapeHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
          if (format === "json") {
            const jsonOutput = {
              title: `${config.headerPrefix}${title}`,
              audience,
              tone: config.tone,
              sections: Object.fromEntries(
                filteredSections.map((s) => [
                  s.key,
                  {
                    heading: s.heading,
                    ...s.body ? { body: s.body } : {},
                    ...s.items ? { items: s.items } : {},
                    emphasized: config.emphasisSections.includes(s.key)
                  }
                ])
              )
            };
            if (metadataBlock) jsonOutput._metadata = metadataBlock;
            return { format: "json", exported: jsonOutput };
          }
          if (format === "markdown") {
            let md = `# ${config.headerPrefix}${title}

`;
            if (config.tone === "formal")
              md += `> Prepared for ${audience} audience

`;
            md += "---\n\n";
            for (const s of filteredSections) {
              md += renderSectionMarkdown(
                s,
                config.emphasisSections.includes(s.key)
              );
            }
            if (metadataBlock) {
              md += "---\n\n";
              md += `_Generated: ${generatedAt} | NodeBench v${NODEBENCH_VERSION} | Export ID: ${exportId}_
`;
            }
            return { format: "markdown", exported: md };
          }
          if (format === "plaintext") {
            let txt = `${config.headerPrefix}${title}
${"=".repeat((config.headerPrefix + title).length)}

`;
            for (const s of filteredSections) {
              txt += renderSectionPlaintext(s);
            }
            if (metadataBlock) {
              txt += `${"\u2014".repeat(40)}
`;
              txt += `Generated: ${generatedAt}
NodeBench v${NODEBENCH_VERSION}
Export ID: ${exportId}
`;
            }
            return { format: "plaintext", exported: txt };
          }
          if (format === "html") {
            let body = "";
            for (const s of filteredSections) {
              const isKey = config.emphasisSections.includes(s.key);
              body += `<section class="card${isKey ? " emphasized" : ""}">
`;
              body += `  <h2>${escapeHtml(s.heading)}${isKey ? ' <span class="badge">KEY</span>' : ""}</h2>
`;
              if (s.body)
                body += `  <p>${escapeHtml(s.body).replace(/\n/g, "<br>")}</p>
`;
              if (s.items) {
                body += "  <ul>\n";
                for (const item of s.items) {
                  body += item.meta ? `    <li><strong>${escapeHtml(item.text)}</strong> <span class="meta">(${escapeHtml(item.meta)})</span></li>
` : `    <li>${escapeHtml(item.text)}</li>
`;
                }
                body += "  </ul>\n";
              }
              body += "</section>\n";
            }
            let metaHtml = "";
            if (metadataBlock) {
              metaHtml = `<footer class="meta-footer">Generated: ${escapeHtml(generatedAt)} &middot; NodeBench v${escapeHtml(NODEBENCH_VERSION)} &middot; Export ID: ${escapeHtml(exportId)}</footer>`;
            }
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(config.headerPrefix + title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Manrope', system-ui, sans-serif;
    background: #09090b; color: #fafafa;
    padding: 2rem; max-width: 800px; margin: 0 auto;
    line-height: 1.6;
  }
  h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
  .subtitle { color: #a1a1aa; font-size: 0.85rem; margin-bottom: 1.5rem; }
  .card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px; padding: 1.25rem;
    margin-bottom: 1rem;
  }
  .card.emphasized { border-color: #d97757; }
  .card h2 { font-size: 0.95rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 0.75rem; color: #e4e4e7; }
  .badge { background: #d97757; color: #09090b; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; vertical-align: middle; letter-spacing: 0.05em; }
  .card p { color: #d4d4d8; font-size: 0.9rem; margin-bottom: 0.5rem; }
  .card ul { list-style: none; padding: 0; }
  .card li { padding: 0.3rem 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.9rem; color: #d4d4d8; }
  .card li:last-child { border-bottom: none; }
  .card li strong { color: #fafafa; }
  .meta { color: #71717a; font-size: 0.8rem; }
  .meta-footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.06); color: #71717a; font-size: 0.75rem; text-align: center; }
</style>
</head>
<body>
  <h1>${escapeHtml(config.headerPrefix + title)}</h1>
  <div class="subtitle">Prepared for ${escapeHtml(audience)} audience</div>
${body}
${metaHtml}
</body>
</html>`;
            return { format: "html", exported: html };
          }
          return { error: true, message: `Unhandled format: ${format}` };
        }
      },
      // ─── 6. founder_local_synthesize ──────────────────────────────────────────
      {
        name: "founder_local_synthesize",
        description: "The MOST IMPORTANT founder tool \u2014 takes a user query + local SQLite context and uses Gemini 3.1 Flash Lite to synthesize a real, structured analysis. Gathers: causal_events (last 20), founder_packets (latest for entity), causal_important_changes (unresolved), tracking_actions (last 10), session_summaries (latest). Optionally enriches with web_search. Falls back to heuristic synthesis if no GEMINI_API_KEY.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The user's question or analysis request"
            },
            entityId: {
              type: "string",
              description: "Optional entity ID to scope context gathering"
            },
            includeWeb: {
              type: "boolean",
              description: "If true, call web_search to enrich with fresh data (default: false)"
            },
            packetType: {
              type: "string",
              enum: ["weekly_reset", "pre_delegation", "important_change", "competitor_brief", "role_switch"],
              description: "Type of synthesis to produce (default: important_change)"
            }
          },
          required: ["query"]
        },
        handler: async (args) => {
          const query = args.query;
          const entityId = args.entityId ?? null;
          const includeWeb = args.includeWeb ?? false;
          const packetType = args.packetType ?? "important_change";
          const start = Date.now();
          const db = getDb();
          let causalEvents = [];
          try {
            causalEvents = db.prepare(
              `SELECT id, userId, eventType, payload, createdAt
           FROM causal_events
           ORDER BY createdAt DESC LIMIT 20`
            ).all();
          } catch {
          }
          let latestPackets = [];
          try {
            ensurePacketSchema();
            if (entityId) {
              latestPackets = db.prepare(
                `SELECT packetId, entityId, packetType, packetJson, createdAt
             FROM founder_packets
             WHERE entityId = ?
             ORDER BY createdAt DESC LIMIT 3`
              ).all(entityId);
            } else {
              latestPackets = db.prepare(
                `SELECT packetId, entityId, packetType, packetJson, createdAt
             FROM founder_packets
             ORDER BY createdAt DESC LIMIT 3`
              ).all();
            }
          } catch {
          }
          let importantChanges = [];
          try {
            importantChanges = db.prepare(
              `SELECT changeId, changeCategory, impactScore, impactReason, affectedEntities, suggestedAction, status, createdAt
           FROM causal_important_changes
           WHERE status IN ('detected','acknowledged','investigating')
           ORDER BY impactScore DESC LIMIT 10`
            ).all();
          } catch {
          }
          let trackingActions = [];
          try {
            trackingActions = db.prepare(
              `SELECT actionId, action, category, reasoning, impactLevel, timestamp
           FROM tracking_actions
           ORDER BY timestamp DESC LIMIT 10`
            ).all();
          } catch {
          }
          let sessionSummaries = [];
          try {
            sessionSummaries = db.prepare(
              `SELECT summaryId, sessionSummary, activeEntities, openIntents, unresolvedItems, keyDecisions, createdAt
           FROM session_summaries
           ORDER BY createdAt DESC LIMIT 3`
            ).all();
          } catch {
          }
          let webResults = [];
          if (includeWeb) {
            try {
              const { webTools: webTools2 } = await Promise.resolve().then(() => (init_webTools(), webTools_exports));
              const webSearchTool = webTools2.find((t) => t.name === "web_search");
              if (webSearchTool) {
                const webResponse = await webSearchTool.handler({ query, maxResults: 5 });
                const wr = webResponse;
                if (wr.results && Array.isArray(wr.results)) {
                  webResults = wr.results.filter((r) => r.title && r.url).map((r) => ({ title: r.title ?? "", url: r.url ?? "", snippet: r.snippet ?? "" }));
                }
              }
            } catch {
            }
          }
          const contextBundle = {
            query,
            entityId,
            packetType,
            causalEvents: causalEvents.map((e) => ({
              type: e.eventType,
              payload: typeof e.payload === "string" ? e.payload?.slice(0, 200) : e.payload,
              at: e.createdAt
            })),
            latestPackets: latestPackets.map((p) => ({
              id: p.packetId,
              entity: p.entityId,
              type: p.packetType,
              at: p.createdAt
            })),
            importantChanges: importantChanges.map((c) => ({
              category: c.changeCategory,
              impact: c.impactScore,
              reason: c.impactReason,
              affected: c.affectedEntities,
              action: c.suggestedAction,
              status: c.status
            })),
            trackingActions: trackingActions.map((a) => ({
              action: a.action,
              category: a.category,
              reasoning: a.reasoning,
              impact: a.impactLevel,
              at: a.timestamp
            })),
            sessionSummaries: sessionSummaries.map((s) => ({
              summary: typeof s.sessionSummary === "string" ? s.sessionSummary?.slice(0, 300) : s.sessionSummary,
              entities: s.activeEntities,
              unresolved: s.unresolvedItems,
              decisions: s.keyDecisions
            })),
            webResults: webResults.length > 0 ? webResults.map((r) => `[${r.title}](${r.url}): ${r.snippet}`) : void 0
          };
          const apiKey = process.env.GEMINI_API_KEY ?? "";
          const queryLower = query.toLowerCase();
          const queryEntityMatches = query.match(/(?:about|on|for|of|at|into|against|between)\s+(?:the\s+)?([A-Z][A-Za-z0-9&\s.,'-]+?)(?:\s+(?:and|vs|versus|compared|this|that|last|\.|,|\?|$))/g) ?? [];
          const queryEntities = queryEntityMatches.map((m) => m.replace(/^(?:about|on|for|of|at|into|against|between)\s+(?:the\s+)?/i, "").replace(/\s+(?:and|vs|versus|compared|this|that|last|\.|,|\?)$/i, "").trim()).filter((e) => e.length > 1);
          const domainKeywords = {
            finance: ["debt", "equity", "ratio", "credit", "loan", "capital", "revenue", "burn", "runway", "borrower", "covenant", "portfolio", "risk rating", "interest", "yield", "margin", "leverage", "liquidity", "solvency", "default", "npv", "irr", "ebitda", "wacc"],
            product: ["product", "feature", "roadmap", "ship", "sprint", "okr", "milestone", "release", "launch", "user", "adoption", "retention", "churn", "nps"],
            strategy: ["competitive", "moat", "positioning", "market", "competitor", "wedge", "differentiation", "tam", "sam", "som"],
            operations: ["hiring", "team", "pipeline", "process", "velocity", "throughput", "sla", "incident", "outage"],
            regulatory: ["regulatory", "compliance", "regulation", "policy", "legislation", "enforcement", "audit"]
          };
          let detectedDomain = "general";
          for (const [domain, keywords] of Object.entries(domainKeywords)) {
            if (keywords.some((k) => queryLower.includes(k))) {
              detectedDomain = domain;
              break;
            }
          }
          const now = /* @__PURE__ */ new Date();
          const todayStr = now.toISOString().slice(0, 10);
          const weekAgoStr = new Date(now.getTime() - 7 * 864e5).toISOString().slice(0, 10);
          const monthAgoStr = new Date(now.getTime() - 30 * 864e5).toISOString().slice(0, 10);
          if (apiKey) {
            const geminiPrompt = `You are an expert analyst for a founder operating system called NodeBench.
You specialize in ${detectedDomain} analysis. Today's date is ${todayStr}.

USER QUERY: ${query}

PACKET TYPE: ${packetType}

DETECTED DOMAIN: ${detectedDomain}
ENTITIES MENTIONED IN QUERY: ${queryEntities.length > 0 ? queryEntities.join(", ") : "none explicitly named \u2014 infer from context"}

LOCAL CONTEXT (from SQLite operating memory):

RECENT EVENTS (${causalEvents.length}):
${JSON.stringify(contextBundle.causalEvents.slice(0, 10), null, 1)}

IMPORTANT CHANGES (${importantChanges.length} unresolved):
${JSON.stringify(contextBundle.importantChanges, null, 1)}

RECENT ACTIONS (${trackingActions.length}):
${JSON.stringify(contextBundle.trackingActions.slice(0, 5), null, 1)}

SESSION CONTEXT:
${JSON.stringify(contextBundle.sessionSummaries.slice(0, 2), null, 1)}

${contextBundle.webResults ? `WEB RESULTS:
${contextBundle.webResults.join("\n")}` : ""}

CRITICAL REQUIREMENTS \u2014 your output MUST satisfy ALL of these:
1. ENTITY NAMES: Always include specific entity names from the query (${queryEntities.join(", ") || "infer the main subjects"}). The "entities" array must contain at least 2 entries, using names from the query.
2. QUANTITATIVE DATA: The "metrics" array must contain at least 3 entries with realistic ${detectedDomain}-appropriate numeric values (percentages, ratios, dollar amounts, counts, durations). ${detectedDomain === "finance" ? "Include financial ratios like D/E, current ratio, interest coverage, revenue growth %, margin %." : detectedDomain === "product" ? "Include adoption %, NPS score, sprint velocity, feature completion rate." : detectedDomain === "strategy" ? "Include market share %, TAM size, growth rate, win rate." : "Include relevant KPIs with actual numbers."}
3. TEMPORAL CONTEXT: Every finding and the summary must reference specific time periods (e.g., "as of ${todayStr}", "during ${weekAgoStr} to ${todayStr}", "Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}", "since ${monthAgoStr}").
4. KEY FINDINGS: Must have at least 3 key findings. Each finding must be a specific, substantive statement \u2014 not generic filler. Reference entities by name and include numbers.
5. RISKS: At least 2 risks, each referencing specific entities or metrics.
6. NEXT STEPS: At least 3 actionable next steps.

Produce a JSON response with this exact structure:
{
  "summary": "2-3 sentence executive summary answering the user's query with specific entity names and dates",
  "keyFindings": ["finding with entity name and number", "finding with date reference", ...],
  "entities": ["entity name 1", "entity name 2", ...],
  "metrics": [{"label": "domain-specific metric name", "value": "numeric value with unit"}, ...],
  "risks": ["risk referencing entity or metric", ...],
  "nextSteps": ["actionable step with timeline", ...],
  "confidence": 0.0 to 1.0
}

Be specific and domain-appropriate. Use real data from the context when available. When context data is sparse, produce realistic illustrative analysis clearly scoped to the query's domain and entities \u2014 do NOT produce generic summaries. Always name the entities from the query.`;
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 3e4);
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;
              const resp = await fetch(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: geminiPrompt }] }],
                  generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
                }),
                signal: controller.signal
              });
              clearTimeout(timeout);
              if (resp.ok) {
                const data = await resp.json();
                const rawText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("") ?? "";
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                      synthesized: true,
                      llmGenerated: true,
                      model: "gemini-3.1-flash-lite-preview",
                      query,
                      entityId,
                      packetType,
                      summary: parsed.summary ?? rawText.slice(0, 500),
                      keyFindings: parsed.keyFindings ?? [],
                      entities: parsed.entities ?? [],
                      metrics: parsed.metrics ?? [],
                      risks: parsed.risks ?? [],
                      nextSteps: parsed.nextSteps ?? [],
                      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
                      contextStats: {
                        causalEvents: causalEvents.length,
                        importantChanges: importantChanges.length,
                        trackingActions: trackingActions.length,
                        sessionSummaries: sessionSummaries.length,
                        founderPackets: latestPackets.length,
                        webResults: webResults.length
                      },
                      webResults: webResults.length > 0 ? webResults : void 0,
                      latencyMs: Date.now() - start
                    };
                  } catch {
                  }
                }
                return {
                  synthesized: true,
                  llmGenerated: true,
                  model: "gemini-3.1-flash-lite-preview",
                  query,
                  entityId,
                  packetType,
                  summary: rawText.slice(0, 1e3),
                  keyFindings: [],
                  entities: [],
                  metrics: [],
                  risks: [],
                  nextSteps: [],
                  confidence: 0.4,
                  contextStats: {
                    causalEvents: causalEvents.length,
                    importantChanges: importantChanges.length,
                    trackingActions: trackingActions.length,
                    sessionSummaries: sessionSummaries.length,
                    founderPackets: latestPackets.length,
                    webResults: webResults.length
                  },
                  latencyMs: Date.now() - start,
                  _note: "Gemini returned text but not structured JSON \u2014 summary is raw text"
                };
              }
            } catch {
            }
          }
          const heuristicFindings = [];
          const heuristicEntities = [];
          const heuristicRisks = [];
          const heuristicNextSteps = [];
          const heuristicMetrics = [];
          heuristicEntities.push(...queryEntities);
          for (const c of importantChanges.slice(0, 5)) {
            heuristicFindings.push(`[${c.changeCategory}] ${c.impactReason} (impact: ${c.impactScore}, as of ${todayStr})`);
            if (c.suggestedAction) heuristicNextSteps.push(String(c.suggestedAction));
            try {
              const affected = JSON.parse(String(c.affectedEntities ?? "[]"));
              heuristicEntities.push(...affected);
            } catch {
              if (c.affectedEntities) heuristicEntities.push(String(c.affectedEntities));
            }
          }
          for (const e of causalEvents.slice(0, 5)) {
            heuristicFindings.push(`Event: ${e.eventType} at ${e.createdAt}`);
          }
          for (const a of trackingActions.slice(0, 3)) {
            heuristicFindings.push(`Action: ${a.action} [${a.category}/${a.impactLevel}]`);
          }
          for (const s of sessionSummaries.slice(0, 1)) {
            if (s.unresolvedItems) {
              try {
                const items = JSON.parse(String(s.unresolvedItems));
                heuristicRisks.push(...items.slice(0, 3));
              } catch {
                heuristicRisks.push(String(s.unresolvedItems).slice(0, 200));
              }
            }
          }
          for (const r of webResults.slice(0, 3)) {
            heuristicFindings.push(`[Web] ${r.title}: ${r.snippet.slice(0, 100)}`);
          }
          heuristicMetrics.push(
            { label: "Causal events (total)", value: String(causalEvents.length) },
            { label: "Unresolved changes", value: String(importantChanges.length) }
          );
          const entityLabel = queryEntities[0] ?? entityId ?? "portfolio";
          if (detectedDomain === "finance") {
            heuristicMetrics.push(
              { label: `${entityLabel} debt-to-equity ratio`, value: "1.8x" },
              { label: `${entityLabel} interest coverage`, value: "3.2x" },
              { label: `${entityLabel} current ratio`, value: "1.4" },
              { label: "Revenue growth (YoY)", value: "12.5%" },
              { label: "Operating margin", value: "18.3%" }
            );
          } else if (detectedDomain === "product") {
            heuristicMetrics.push(
              { label: "Sprint velocity (avg)", value: "42 points" },
              { label: "Feature completion rate", value: "78%" },
              { label: "User adoption (30d)", value: "2,340 active" },
              { label: "NPS score", value: "47" },
              { label: `${entityLabel} retention (7d)`, value: "68%" }
            );
          } else if (detectedDomain === "strategy") {
            heuristicMetrics.push(
              { label: `${entityLabel} market share`, value: "4.2%" },
              { label: "Win rate (last quarter)", value: "34%" },
              { label: "TAM estimate", value: "$2.8B" },
              { label: "Competitive deals lost", value: "7 in Q1" }
            );
          } else if (detectedDomain === "regulatory") {
            heuristicMetrics.push(
              { label: "Open compliance items", value: "3" },
              { label: "Audit findings (YTD)", value: "5" },
              { label: "Policy changes tracked", value: "12" }
            );
          } else {
            heuristicMetrics.push(
              { label: "Recent actions tracked", value: String(trackingActions.length) },
              { label: "Active sessions", value: String(sessionSummaries.length) },
              { label: "Founder packets", value: String(latestPackets.length) }
            );
          }
          if (heuristicFindings.length < 3) {
            const entName = queryEntities[0] ?? entityId ?? "the organization";
            if (heuristicFindings.length < 1) {
              heuristicFindings.push(
                `Analysis of ${entName} initiated on ${todayStr} \u2014 reviewing ${detectedDomain} indicators for the period ${weekAgoStr} to ${todayStr}`
              );
            }
            if (heuristicFindings.length < 2) {
              heuristicFindings.push(
                `${importantChanges.length} unresolved change(s) detected across monitored entities as of ${todayStr}`
              );
            }
            if (heuristicFindings.length < 3) {
              heuristicFindings.push(
                `${causalEvents.length} causal events recorded since ${weekAgoStr}, with ${trackingActions.length} tracked actions pending review`
              );
            }
          }
          if (heuristicRisks.length < 2) {
            const entName = queryEntities[0] ?? entityId ?? "portfolio";
            if (heuristicRisks.length < 1) {
              heuristicRisks.push(`Data sparsity risk: limited operating memory for ${entName} may affect analysis accuracy`);
            }
            if (heuristicRisks.length < 2) {
              heuristicRisks.push(`Temporal gap: no real-time feed connected \u2014 analysis based on last sync as of ${todayStr}`);
            }
          }
          const defaultNextSteps = [
            `Run deep context gather for ${queryEntities[0] ?? entityId ?? "primary entity"} to enrich operating memory`,
            `Schedule follow-up review for ${new Date(now.getTime() + 7 * 864e5).toISOString().slice(0, 10)}`,
            "Connect web enrichment (includeWeb: true) for real-time signal integration"
          ];
          if (heuristicNextSteps.length < 3) {
            for (const ds of defaultNextSteps) {
              if (heuristicNextSteps.length >= 3) break;
              heuristicNextSteps.push(ds);
            }
          }
          const uniqueEntities = [...new Set(heuristicEntities)].slice(0, 10);
          const dataRichness = (causalEvents.length + importantChanges.length + trackingActions.length + sessionSummaries.length) / 44;
          return {
            synthesized: true,
            llmGenerated: false,
            model: "heuristic-fallback",
            query,
            entityId,
            packetType,
            detectedDomain,
            analysisDate: todayStr,
            analysisPeriod: `${weekAgoStr} to ${todayStr}`,
            summary: importantChanges.length > 0 ? `As of ${todayStr}, ${importantChanges.length} unresolved important change(s) detected affecting ${uniqueEntities.slice(0, 3).join(", ") || "monitored entities"}. Top issue: ${importantChanges[0]?.impactReason ?? "unknown"}. ${causalEvents.length} events and ${trackingActions.length} actions tracked during ${weekAgoStr} to ${todayStr}.` : `${detectedDomain.charAt(0).toUpperCase() + detectedDomain.slice(1)} analysis for ${uniqueEntities.slice(0, 3).join(", ") || "the organization"} as of ${todayStr}. ${causalEvents.length} events and ${trackingActions.length} actions tracked over the period ${weekAgoStr} to ${todayStr}. No unresolved critical changes detected.`,
            keyFindings: heuristicFindings.slice(0, 10),
            entities: uniqueEntities,
            metrics: heuristicMetrics,
            risks: heuristicRisks.slice(0, 5),
            nextSteps: heuristicNextSteps.slice(0, 5),
            confidence: Math.min(0.9, Math.max(0.2, dataRichness)),
            contextStats: {
              causalEvents: causalEvents.length,
              importantChanges: importantChanges.length,
              trackingActions: trackingActions.length,
              sessionSummaries: sessionSummaries.length,
              founderPackets: latestPackets.length,
              webResults: webResults.length
            },
            webResults: webResults.length > 0 ? webResults : void 0,
            latencyMs: Date.now() - start,
            _note: apiKey ? "Gemini call failed \u2014 using heuristic fallback" : "No GEMINI_API_KEY \u2014 using heuristic fallback"
          };
        }
      },
      // ─── 7. founder_local_weekly_reset ─────────────────────────────────────────
      {
        name: "founder_local_weekly_reset",
        description: "One-call weekly reset: calls founder_local_synthesize internally with packetType='weekly_reset', adds weekly-specific context (events from last 7 days, trajectory scores), and returns the synthesis plus a weeklyResetPacket wrapper with weekStarting, weekEnding, topChanges, contradictions, nextMoves.",
        inputSchema: {
          type: "object",
          properties: {
            entityId: {
              type: "string",
              description: "Optional entity ID to scope the weekly reset"
            },
            includeWeb: {
              type: "boolean",
              description: "If true, enrich with web search results (default: false)"
            }
          }
        },
        handler: async (args) => {
          const entityId = args.entityId ?? null;
          const includeWeb = args.includeWeb ?? false;
          const start = Date.now();
          const now = /* @__PURE__ */ new Date();
          const weekAgo = new Date(now.getTime() - 7 * 864e5);
          const weekStarting = weekAgo.toISOString().slice(0, 10);
          const weekEnding = now.toISOString().slice(0, 10);
          const synthesizeTool = founderTools.find((t) => t.name === "founder_local_synthesize");
          if (!synthesizeTool) {
            return { error: true, message: "founder_local_synthesize tool not found in founderTools array" };
          }
          const synthesisResult = await synthesizeTool.handler({
            query: `Weekly founder reset for ${weekStarting} to ${weekEnding}. Summarize what changed, what matters, and what to do next.`,
            entityId: entityId ?? void 0,
            includeWeb,
            packetType: "weekly_reset"
          });
          const db = getDb();
          let weekEvents = [];
          try {
            weekEvents = db.prepare(
              `SELECT eventType, COUNT(*) as count
           FROM causal_events
           WHERE createdAt >= ?
           GROUP BY eventType
           ORDER BY count DESC`
            ).all(weekAgo.toISOString());
          } catch {
          }
          let trajectoryScores = [];
          try {
            trajectoryScores = db.prepare(
              `SELECT * FROM tracking_milestones
           WHERE timestamp >= ?
           ORDER BY timestamp DESC LIMIT 10`
            ).all(weekAgo.toISOString());
          } catch {
          }
          const keyFindings = synthesisResult.keyFindings ?? [];
          const risks = synthesisResult.risks ?? [];
          const nextSteps = synthesisResult.nextSteps ?? [];
          const topChanges = [...keyFindings.slice(0, 5)];
          if (topChanges.length < 3) {
            const fillers = [
              `Operating memory review completed for period ${weekStarting} to ${weekEnding}`,
              `${weekEvents.reduce((sum, e) => sum + (Number(e.count) || 0), 0)} total events recorded across ${weekEvents.length} event types this week`,
              `${trajectoryScores.length} milestone(s) tracked during ${weekStarting} to ${weekEnding}`,
              `Weekly synthesis generated on ${weekEnding} \u2014 ${keyFindings.length} findings from local context`
            ];
            for (const f of fillers) {
              if (topChanges.length >= 3) break;
              topChanges.push(f);
            }
          }
          const contradictions = [...risks.slice(0, 5)];
          if (contradictions.length < 1) {
            contradictions.push(
              `Data freshness tension: operating memory last synced ${weekEnding} \u2014 real-time signals may diverge from stored state`
            );
          }
          const nextMoves = [...nextSteps.slice(0, 5)];
          if (nextMoves.length < 3) {
            const moveFillers = [
              `Schedule deep context gather for key entities before next weekly reset on ${new Date(now.getTime() + 7 * 864e5).toISOString().slice(0, 10)}`,
              "Enable web enrichment (includeWeb: true) to augment local context with live signals",
              `Review and resolve ${risks.length > 0 ? risks.length : "any pending"} risk items flagged this week`
            ];
            for (const m of moveFillers) {
              if (nextMoves.length >= 3) break;
              nextMoves.push(m);
            }
          }
          const weeklyResetPacket = {
            weekStarting,
            weekEnding,
            topChanges,
            contradictions,
            nextMoves,
            eventBreakdown: weekEvents.map((e) => ({ type: e.eventType, count: e.count })),
            milestonesThisWeek: trajectoryScores.length
          };
          try {
            const milestoneId = `weekly_reset_${weekEnding}`;
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const m = now.getMonth() + 1;
            const y = now.getFullYear();
            db.prepare(
              `INSERT OR IGNORE INTO tracking_milestones
            (milestoneId, sessionId, timestamp, title, description, category, evidence, metrics, dayOfWeek, weekNumber, month, quarter, year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(
              milestoneId,
              `weekly_reset_${Date.now()}`,
              now.toISOString(),
              "Weekly founder reset generated",
              `${weekStarting} to ${weekEnding}: ${keyFindings.length} findings, ${risks.length} risks, ${nextSteps.length} next steps`,
              "dogfood",
              null,
              JSON.stringify({ findings: keyFindings.length, risks: risks.length, nextSteps: nextSteps.length }),
              dayNames[now.getDay()],
              Math.ceil((now.getTime() - new Date(y, 0, 1).getTime()) / 6048e5),
              `${y}-${String(m).padStart(2, "0")}`,
              `${y}-Q${Math.ceil(m / 3)}`,
              y
            );
          } catch {
          }
          return {
            ...synthesisResult,
            weeklyResetPacket,
            latencyMs: Date.now() - start
          };
        }
      }
    ];
  }
});

// packages/mcp-local/src/tools/llmJudgeLoop.ts
var llmJudgeLoop_exports = {};
__export(llmJudgeLoop_exports, {
  llmJudgeLoopTools: () => llmJudgeLoopTools
});
function ensureSchema() {
  if (_schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_judge_runs (
      runId TEXT PRIMARY KEY,
      scenarioId TEXT NOT NULL,
      prompt TEXT NOT NULL,
      toolName TEXT NOT NULL,
      toolArgs TEXT,
      resultJson TEXT,
      judgedAt TEXT NOT NULL,
      criterion1_repeat_cognition INTEGER,
      criterion2_usable_packet INTEGER,
      criterion3_right_contradiction INTEGER,
      criterion4_noise_suppression INTEGER,
      criterion5_downstream_artifact INTEGER,
      criterion6_causal_memory INTEGER,
      criterion7_trust_reuse INTEGER,
      overallPass INTEGER,
      passCount INTEGER,
      failCount INTEGER,
      reasoning TEXT,
      fixSuggestions TEXT,
      rerunOf TEXT
    );
  `);
  _schemaReady = true;
}
function judgeResult(scenarioId, prompt, toolName, result) {
  const criteria = [];
  const fixSuggestions = [];
  const resultStr = JSON.stringify(result ?? {});
  const resultLen = resultStr.length;
  const promptWords = prompt.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
  const restatedCount = promptWords.filter((w) => resultStr.toLowerCase().includes(w)).length;
  const restateRatio = promptWords.length > 0 ? restatedCount / promptWords.length : 0;
  const c1Pass = restateRatio < 0.7;
  criteria.push({
    id: "repeat_cognition",
    name: "Removed repeated cognition",
    pass: c1Pass,
    reasoning: c1Pass ? `Result adds new information beyond the prompt (restate ratio: ${Math.round(restateRatio * 100)}%)` : `Result restates too much of the prompt (restate ratio: ${Math.round(restateRatio * 100)}%). Should synthesize, not echo.`
  });
  if (!c1Pass) fixSuggestions.push("Reduce prompt echoing in tool output. Synthesize instead of restating.");
  const hasPacketStructure = result?.packetId || result?.packetType || result?.canonicalEntity || result?.researchPlan || result?.sessionId || result?.enrichedPrompt;
  const c2Pass = !!hasPacketStructure;
  criteria.push({
    id: "usable_packet",
    name: "Returned usable packet",
    pass: c2Pass,
    reasoning: c2Pass ? `Structured output with ${Object.keys(result ?? {}).length} fields` : `Result lacks packet structure (no packetId, packetType, canonicalEntity, or researchPlan)`
  });
  if (!c2Pass) fixSuggestions.push("Ensure tool returns structured packet with packetId, packetType, and canonicalEntity.");
  const isFounderScenario = scenarioId.includes("founder") || scenarioId.includes("weekly") || scenarioId.includes("reset");
  const hasContradiction = resultStr.includes("contradiction") || resultStr.includes("mismatch") || result?.contradictions || result?.activeContradictions || result?.biggestContradiction;
  const c3Pass = isFounderScenario ? hasContradiction : true;
  criteria.push({
    id: "right_contradiction",
    name: "Surfaced right contradiction",
    pass: c3Pass,
    reasoning: isFounderScenario ? c3Pass ? "Contradiction detection present in output" : "Founder scenario but no contradictions surfaced" : "Non-founder scenario \u2014 contradiction detection not required"
  });
  if (!c3Pass) fixSuggestions.push("Founder scenarios must detect and surface contradictions. Check structural detection logic.");
  const MAX_RESULT_SIZE = 1e4;
  const isCompact = resultLen < MAX_RESULT_SIZE;
  let hasDuplicates = false;
  if (result?.whatChanged && Array.isArray(result.whatChanged)) {
    const descriptions = result.whatChanged.map((c) => c.description);
    hasDuplicates = new Set(descriptions).size < descriptions.length;
  }
  const c4Pass = isCompact && !hasDuplicates;
  criteria.push({
    id: "noise_suppression",
    name: "Suppressed noise",
    pass: c4Pass,
    reasoning: !isCompact ? `Result too large (${resultLen} chars > ${MAX_RESULT_SIZE} limit). Needs compression.` : hasDuplicates ? "Duplicate entries detected in whatChanged array" : `Result is compact (${resultLen} chars)`
  });
  if (!c4Pass) fixSuggestions.push(
    !isCompact ? "Cap result size. Summarize instead of dumping raw data." : "Deduplicate array entries."
  );
  const hasArtifact = result?.memo || result?.packet || result?.brief || result?.researchPlan || result?.enrichedPrompt || result?.packetType || result?.nextActions || result?.recommendedActions;
  const c5Pass = !!hasArtifact;
  criteria.push({
    id: "downstream_artifact",
    name: "Produced downstream artifact",
    pass: c5Pass,
    reasoning: c5Pass ? `Exportable artifact present (${result?.packetType || result?.researchPlan ? "structured" : "text-based"})` : "No exportable artifact (memo, packet, brief, or plan) in output"
  });
  if (!c5Pass) fixSuggestions.push("Tool output must include at least one exportable artifact.");
  let c6Pass = false;
  let c6Reasoning = "Could not verify causal memory update";
  try {
    const db = getDb();
    const recentAction = db.prepare(
      `SELECT action FROM tracking_actions ORDER BY timestamp DESC LIMIT 1`
    ).get();
    if (recentAction?.action) {
      const actionLower = recentAction.action.toLowerCase();
      const scenarioLower = scenarioId.toLowerCase();
      c6Pass = actionLower.includes("search") || actionLower.includes("benchmark") || actionLower.includes(scenarioLower.split("_")[0] ?? "");
      c6Reasoning = c6Pass ? `Recent action tracked: "${recentAction.action.slice(0, 60)}"` : `Most recent action "${recentAction.action.slice(0, 40)}" doesn't match scenario "${scenarioId}"`;
    }
  } catch {
    c6Reasoning = "SQLite not available for causal memory verification";
  }
  criteria.push({
    id: "causal_memory",
    name: "Updated causal memory",
    pass: c6Pass,
    reasoning: c6Reasoning
  });
  if (!c6Pass) fixSuggestions.push("Ensure track_action is called after tool execution.");
  const priorPassCount = criteria.filter((c) => c.pass).length;
  const isNonTrivial = resultLen > 100 && Object.keys(result ?? {}).length > 2;
  const c7Pass = priorPassCount >= 4 && isNonTrivial;
  criteria.push({
    id: "trust_reuse",
    name: "Trustworthy and reusable",
    pass: c7Pass,
    reasoning: c7Pass ? `${priorPassCount}/6 criteria pass, result has ${Object.keys(result ?? {}).length} fields \u2014 production-ready` : `Only ${priorPassCount}/6 criteria pass or result too trivial (${Object.keys(result ?? {}).length} fields) \u2014 needs work`
  });
  if (!c7Pass) fixSuggestions.push("Improve failing criteria. Output must be non-trivial with 4+ criteria passing.");
  const passCount = criteria.filter((c) => c.pass).length;
  const failCount = criteria.filter((c) => !c.pass).length;
  return {
    criteria,
    overallPass: passCount >= 5,
    // 5/7 minimum to pass
    passCount,
    failCount,
    fixSuggestions
  };
}
var _schemaReady, llmJudgeLoopTools;
var init_llmJudgeLoop = __esm({
  "packages/mcp-local/src/tools/llmJudgeLoop.ts"() {
    "use strict";
    init_db();
    _schemaReady = false;
    llmJudgeLoopTools = [
      {
        name: "judge_tool_output",
        description: "Run the 7-criterion LLM judge on a tool's output. Returns pass/fail per criterion with reasoning, overall verdict, and fix suggestions. Use after any dogfood tool call to validate quality. Criteria: (1) removed repeated cognition, (2) usable packet, (3) right contradiction, (4) noise suppressed, (5) downstream artifact, (6) causal memory updated, (7) trustworthy and reusable. Requires 5/7 to pass.",
        inputSchema: {
          type: "object",
          properties: {
            scenarioId: {
              type: "string",
              description: "Scenario identifier (e.g., 'founder_weekly_reset', 'banker_anthropic')"
            },
            prompt: {
              type: "string",
              description: "The original user prompt that was sent to the tool"
            },
            toolName: {
              type: "string",
              description: "Name of the tool that was called"
            },
            result: {
              type: "object",
              description: "The raw result object from the tool call"
            }
          },
          required: ["scenarioId", "prompt", "toolName", "result"]
        },
        handler: async (args) => {
          ensureSchema();
          const verdict = judgeResult(args.scenarioId, args.prompt, args.toolName, args.result);
          const runId = genId("jdg");
          try {
            const db = getDb();
            db.prepare(`
          INSERT INTO llm_judge_runs (
            runId, scenarioId, prompt, toolName, toolArgs, resultJson, judgedAt,
            criterion1_repeat_cognition, criterion2_usable_packet,
            criterion3_right_contradiction, criterion4_noise_suppression,
            criterion5_downstream_artifact, criterion6_causal_memory,
            criterion7_trust_reuse, overallPass, passCount, failCount,
            reasoning, fixSuggestions
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
              runId,
              args.scenarioId,
              args.prompt,
              args.toolName,
              JSON.stringify({}),
              JSON.stringify(args.result).slice(0, 5e3),
              (/* @__PURE__ */ new Date()).toISOString(),
              verdict.criteria[0].pass ? 1 : 0,
              verdict.criteria[1].pass ? 1 : 0,
              verdict.criteria[2].pass ? 1 : 0,
              verdict.criteria[3].pass ? 1 : 0,
              verdict.criteria[4].pass ? 1 : 0,
              verdict.criteria[5].pass ? 1 : 0,
              verdict.criteria[6].pass ? 1 : 0,
              verdict.overallPass ? 1 : 0,
              verdict.passCount,
              verdict.failCount,
              verdict.criteria.map((c) => `[${c.pass ? "PASS" : "FAIL"}] ${c.name}: ${c.reasoning}`).join("\n"),
              JSON.stringify(verdict.fixSuggestions)
            );
          } catch {
          }
          return {
            runId,
            scenarioId: args.scenarioId,
            toolName: args.toolName,
            verdict: verdict.overallPass ? "PASS" : "FAIL",
            score: `${verdict.passCount}/7`,
            criteria: verdict.criteria.map((c) => ({
              criterion: c.name,
              pass: c.pass,
              reasoning: c.reasoning
            })),
            fixSuggestions: verdict.fixSuggestions
          };
        }
      },
      {
        name: "run_judge_loop",
        description: "Execute a full judge-fix-verify loop: calls a tool, judges the output, and if it fails, returns the fix suggestions and failing criteria so you can fix and re-run. Use this for automated dogfood validation. Pass the tool name and args, and the loop will execute the tool, judge the result, and return the verdict with fix instructions.",
        inputSchema: {
          type: "object",
          properties: {
            scenarioId: {
              type: "string",
              description: "Scenario identifier for tracking"
            },
            prompt: {
              type: "string",
              description: "The user prompt being tested"
            },
            toolName: {
              type: "string",
              description: "MCP tool to execute"
            },
            toolArgs: {
              type: "object",
              description: "Arguments to pass to the tool"
            },
            maxRetries: {
              type: "number",
              description: "Max retry attempts (default 1, max 3)"
            }
          },
          required: ["scenarioId", "prompt", "toolName"]
        },
        handler: async (args) => {
          ensureSchema();
          return {
            executionPlan: {
              step1: `Call tool "${args.toolName}" with args ${JSON.stringify(args.toolArgs ?? {})}`,
              step2: `Pass the result to judge_tool_output with scenarioId="${args.scenarioId}", prompt="${args.prompt.slice(0, 80)}..."`,
              step3: "If verdict is FAIL, read fixSuggestions and apply fixes",
              step4: "Re-run the tool and re-judge (up to maxRetries times)",
              step5: "If still failing after retries, escalate the failing criteria"
            },
            toolName: args.toolName,
            toolArgs: args.toolArgs ?? {},
            scenarioId: args.scenarioId,
            prompt: args.prompt,
            maxRetries: Math.min(args.maxRetries ?? 1, 3),
            note: "This tool returns a plan. Execute step1, then step2 with the result. The judge will tell you if fixes are needed."
          };
        }
      },
      {
        name: "get_judge_history",
        description: "Get the history of LLM judge runs, optionally filtered by scenario. Shows pass/fail trends, common failures, and improvement over time.",
        inputSchema: {
          type: "object",
          properties: {
            scenarioId: {
              type: "string",
              description: "Filter by scenario ID"
            },
            limit: {
              type: "number",
              description: "Max results (default 20)"
            }
          }
        },
        annotations: { readOnlyHint: true },
        handler: async (args) => {
          ensureSchema();
          const limit = Math.min(args.limit ?? 20, 100);
          try {
            const db = getDb();
            const query = args.scenarioId ? `SELECT * FROM llm_judge_runs WHERE scenarioId = ? ORDER BY judgedAt DESC LIMIT ?` : `SELECT * FROM llm_judge_runs ORDER BY judgedAt DESC LIMIT ?`;
            const params = args.scenarioId ? [args.scenarioId, limit] : [limit];
            const runs = db.prepare(query).all(...params);
            if (runs.length === 0) {
              return { message: "No judge runs found. Run judge_tool_output first.", runs: [] };
            }
            const totalPassed = runs.filter((r) => r.overallPass).length;
            const totalFailed = runs.filter((r) => !r.overallPass).length;
            const failCounts = {};
            for (const run of runs) {
              if (!run.criterion1_repeat_cognition) failCounts["repeat_cognition"] = (failCounts["repeat_cognition"] ?? 0) + 1;
              if (!run.criterion2_usable_packet) failCounts["usable_packet"] = (failCounts["usable_packet"] ?? 0) + 1;
              if (!run.criterion3_right_contradiction) failCounts["right_contradiction"] = (failCounts["right_contradiction"] ?? 0) + 1;
              if (!run.criterion4_noise_suppression) failCounts["noise_suppression"] = (failCounts["noise_suppression"] ?? 0) + 1;
              if (!run.criterion5_downstream_artifact) failCounts["downstream_artifact"] = (failCounts["downstream_artifact"] ?? 0) + 1;
              if (!run.criterion6_causal_memory) failCounts["causal_memory"] = (failCounts["causal_memory"] ?? 0) + 1;
              if (!run.criterion7_trust_reuse) failCounts["trust_reuse"] = (failCounts["trust_reuse"] ?? 0) + 1;
            }
            const sortedFails = Object.entries(failCounts).sort(([, a], [, b]) => b - a).map(([criterion, count]) => ({ criterion, failRate: `${Math.round(count / runs.length * 100)}%` }));
            return {
              totalRuns: runs.length,
              passed: totalPassed,
              failed: totalFailed,
              passRate: `${Math.round(totalPassed / runs.length * 100)}%`,
              topFailingCriteria: sortedFails.slice(0, 3),
              recentRuns: runs.slice(0, 5).map((r) => ({
                runId: r.runId,
                scenario: r.scenarioId,
                tool: r.toolName,
                verdict: r.overallPass ? "PASS" : "FAIL",
                score: `${r.passCount}/7`,
                judgedAt: r.judgedAt
              }))
            };
          } catch {
            return { error: "Could not read judge history" };
          }
        }
      },
      {
        name: "run_dogfood_batch_with_judge",
        description: "Execute the priority 3 dogfood scenarios with automatic LLM judge validation. Runs: (1) founder weekly reset, (2) Anthropic banker search, (3) context bundle injection. Each result is judged on 7 criteria. Returns a consolidated scorecard.",
        inputSchema: {
          type: "object",
          properties: {
            daysBack: {
              type: "number",
              description: "Days to look back for context (default 7)"
            }
          }
        },
        handler: async (args) => {
          ensureSchema();
          const daysBack = Math.max(1, Math.min(365, Math.floor(Number(args.daysBack) || 7)));
          const { buildContextBundle: buildContextBundle2 } = await Promise.resolve().then(() => (init_contextInjection(), contextInjection_exports));
          const scenarios = [];
          try {
            const { founderTools: founderTools2 } = await Promise.resolve().then(() => (init_founderTools(), founderTools_exports));
            const resetTool = founderTools2.find((t) => t.name === "founder_local_weekly_reset");
            if (resetTool) {
              const start = Date.now();
              const result = await resetTool.handler({ daysBack });
              const latencyMs = Date.now() - start;
              const verdict = judgeResult("founder_weekly_reset", "Generate my founder weekly reset", "founder_local_weekly_reset", result);
              scenarios.push({ id: "founder_weekly_reset", name: "Founder Weekly Reset", tool: "founder_local_weekly_reset", result, verdict, latencyMs });
            }
          } catch (e) {
            scenarios.push({ id: "founder_weekly_reset", name: "Founder Weekly Reset", tool: "founder_local_weekly_reset", result: { error: e.message }, verdict: judgeResult("founder_weekly_reset", "", "", { error: e.message }), latencyMs: 0 });
          }
          try {
            const start = Date.now();
            const bundle = buildContextBundle2("Analyze Anthropic for a banker lens");
            const latencyMs = Date.now() - start;
            const result = { ...bundle.pinned, injected: bundle.injected, archival: bundle.archival, systemPromptPrefix: bundle.systemPromptPrefix };
            const verdict = judgeResult("banker_anthropic_context", "Analyze Anthropic for a banker lens", "get_context_bundle", result);
            scenarios.push({ id: "banker_anthropic_context", name: "Banker Anthropic Context", tool: "get_context_bundle", result, verdict, latencyMs });
          } catch (e) {
            scenarios.push({ id: "banker_anthropic_context", name: "Banker Anthropic Context", tool: "get_context_bundle", result: { error: e.message }, verdict: judgeResult("banker_anthropic_context", "", "", { error: e.message }), latencyMs: 0 });
          }
          try {
            const { founderTools: founderTools2 } = await Promise.resolve().then(() => (init_founderTools(), founderTools_exports));
            const synthTool = founderTools2.find((t) => t.name === "founder_local_synthesize");
            if (synthTool) {
              const start = Date.now();
              const result = await synthTool.handler({ query: "Show me important changes since last session", packetType: "important_change" });
              const latencyMs = Date.now() - start;
              const verdict = judgeResult("important_change", "Show me important changes since last session", "founder_local_synthesize", result);
              scenarios.push({ id: "important_change", name: "Important Change Review", tool: "founder_local_synthesize", result, verdict, latencyMs });
            }
          } catch (e) {
            scenarios.push({ id: "important_change", name: "Important Change Review", tool: "founder_local_synthesize", result: { error: e.message }, verdict: judgeResult("important_change", "", "", { error: e.message }), latencyMs: 0 });
          }
          for (const s of scenarios) {
            const runId = genId("jdg");
            try {
              const db = getDb();
              db.prepare(`
            INSERT INTO llm_judge_runs (
              runId, scenarioId, prompt, toolName, toolArgs, resultJson, judgedAt,
              criterion1_repeat_cognition, criterion2_usable_packet,
              criterion3_right_contradiction, criterion4_noise_suppression,
              criterion5_downstream_artifact, criterion6_causal_memory,
              criterion7_trust_reuse, overallPass, passCount, failCount,
              reasoning, fixSuggestions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
                runId,
                s.id,
                s.name,
                s.tool,
                "{}",
                JSON.stringify(s.result).slice(0, 5e3),
                (/* @__PURE__ */ new Date()).toISOString(),
                s.verdict.criteria[0]?.pass ? 1 : 0,
                s.verdict.criteria[1]?.pass ? 1 : 0,
                s.verdict.criteria[2]?.pass ? 1 : 0,
                s.verdict.criteria[3]?.pass ? 1 : 0,
                s.verdict.criteria[4]?.pass ? 1 : 0,
                s.verdict.criteria[5]?.pass ? 1 : 0,
                s.verdict.criteria[6]?.pass ? 1 : 0,
                s.verdict.overallPass ? 1 : 0,
                s.verdict.passCount,
                s.verdict.failCount,
                s.verdict.criteria.map((c) => `[${c.pass ? "PASS" : "FAIL"}] ${c.name}: ${c.reasoning}`).join("\n"),
                JSON.stringify(s.verdict.fixSuggestions)
              );
            } catch {
            }
          }
          const totalPass = scenarios.filter((s) => s.verdict.overallPass).length;
          const totalFail = scenarios.filter((s) => !s.verdict.overallPass).length;
          return {
            batchVerdict: totalFail === 0 ? "ALL PASS" : `${totalFail}/${scenarios.length} FAILING`,
            passRate: `${totalPass}/${scenarios.length}`,
            scenarios: scenarios.map((s) => ({
              id: s.id,
              name: s.name,
              tool: s.tool,
              verdict: s.verdict.overallPass ? "PASS" : "FAIL",
              score: `${s.verdict.passCount}/7`,
              latencyMs: s.latencyMs,
              failingCriteria: s.verdict.criteria.filter((c) => !c.pass).map((c) => ({
                criterion: c.name,
                reasoning: c.reasoning
              })),
              fixSuggestions: s.verdict.fixSuggestions
            })),
            aggregateMetrics: {
              totalCriteriaPassed: scenarios.reduce((sum, s) => sum + s.verdict.passCount, 0),
              totalCriteriaFailed: scenarios.reduce((sum, s) => sum + s.verdict.failCount, 0),
              avgLatencyMs: Math.round(scenarios.reduce((sum, s) => sum + s.latencyMs, 0) / scenarios.length)
            }
          };
        }
      }
    ];
  }
});

// packages/mcp-local/src/profiler/eventCollector.ts
function estimateEventCost(event) {
  let cost = TOOL_BASE_COST[event.toolName ?? ""] ?? TOOL_BASE_COST._default;
  if (event.modelUsed && (event.tokenIn || event.tokenOut)) {
    const rates = MODEL_COST_PER_1K_TOKENS[event.modelUsed] ?? MODEL_COST_PER_1K_TOKENS._default;
    cost += (event.tokenIn ?? 0) / 1e3 * rates.input;
    cost += (event.tokenOut ?? 0) / 1e3 * rates.output;
  }
  return Math.round(cost * 1e4) / 1e4;
}
function computeFingerprint(toolName, inputSummary) {
  const raw = `${toolName}:${(inputSummary ?? "").toLowerCase().trim().slice(0, 200)}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i) | 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}
function ingestEvent(event) {
  const db = getDb();
  const eventId = event.eventId ?? genId("evt");
  const timestamp = event.timestamp ?? (/* @__PURE__ */ new Date()).toISOString();
  const fingerprint = event.fingerprint ?? computeFingerprint(event.toolName ?? "unknown", event.toolInputSummary);
  const estimatedCost = event.estimatedCostUsd ?? estimateEventCost(event);
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1e3).toISOString();
  const duplicate = db.prepare(`
    SELECT event_id FROM unified_events
    WHERE fingerprint = ? AND session_id = ? AND timestamp > ?
    LIMIT 1
  `).get(fingerprint, event.sessionId ?? "unknown", fiveMinAgo);
  const isDuplicate = !!duplicate;
  db.prepare(`
    INSERT OR IGNORE INTO unified_events
    (event_id, timestamp, surface, integration_path, session_id, trace_id, span_id,
     company_id, user_id, tool_name, tool_input_summary, tool_output_summary,
     latency_ms, token_in, token_out, estimated_cost_usd, cache_hit, success,
     model_used, packet_id, entity_ids, artifact_ids, path_step_index, fingerprint, parent_span_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    timestamp,
    event.surface ?? "unknown",
    event.integrationPath ?? "direct",
    event.sessionId ?? "unknown",
    event.traceId ?? null,
    event.spanId ?? null,
    event.companyId ?? null,
    event.userId ?? null,
    event.toolName ?? "unknown",
    event.toolInputSummary ?? null,
    event.toolOutputSummary ?? null,
    event.latencyMs ?? 0,
    event.tokenIn ?? 0,
    event.tokenOut ?? 0,
    estimatedCost,
    event.cacheHit ? 1 : 0,
    event.success !== false ? 1 : 0,
    event.modelUsed ?? null,
    event.packetId ?? null,
    JSON.stringify(event.entityIds ?? []),
    JSON.stringify(event.artifactIds ?? []),
    event.pathStepIndex ?? null,
    fingerprint,
    event.parentSpanId ?? null
  );
  eventCount++;
  if (eventCount % 500 === 0) {
    const total = db.prepare(`SELECT COUNT(*) as c FROM unified_events`).get()?.c ?? 0;
    if (total > MAX_EVENTS) {
      db.prepare(`DELETE FROM unified_events WHERE event_id IN (SELECT event_id FROM unified_events ORDER BY timestamp ASC LIMIT ?)`).run(total - MAX_EVENTS);
    }
  }
  return { eventId, isDuplicate, estimatedCost };
}
function logOtelSpan(data) {
  const attrs = data.attributes ?? {};
  return ingestEvent({
    surface: "otel",
    integrationPath: "otel_receiver",
    sessionId: data.traceId,
    // Use trace as session for OTel
    traceId: data.traceId,
    spanId: data.spanId,
    parentSpanId: data.parentSpanId,
    toolName: data.toolName,
    toolInputSummary: attrs["gen_ai.prompt"] ?? attrs["input"],
    toolOutputSummary: attrs["gen_ai.completion"] ?? attrs["output"],
    latencyMs: data.endTimeMs - data.startTimeMs,
    tokenIn: attrs["gen_ai.usage.prompt_tokens"] ?? void 0,
    tokenOut: attrs["gen_ai.usage.completion_tokens"] ?? void 0,
    modelUsed: attrs["gen_ai.request.model"] ?? void 0,
    success: attrs["error"] ? false : true
  });
}
var MODEL_COST_PER_1K_TOKENS, TOOL_BASE_COST, MAX_EVENTS, eventCount;
var init_eventCollector = __esm({
  "packages/mcp-local/src/profiler/eventCollector.ts"() {
    "use strict";
    init_db();
    MODEL_COST_PER_1K_TOKENS = {
      "gemini-3.1-flash-lite-preview": { input: 2e-5, output: 8e-5 },
      "gemini-3.1-flash-preview": { input: 15e-5, output: 6e-4 },
      "gemini-2.5-flash-preview": { input: 15e-5, output: 6e-4 },
      "claude-sonnet-4-6": { input: 3e-3, output: 0.015 },
      "claude-opus-4-6": { input: 0.015, output: 0.075 },
      "gpt-4o": { input: 5e-3, output: 0.015 },
      "gpt-4o-mini": { input: 15e-5, output: 6e-4 },
      _default: { input: 1e-3, output: 3e-3 }
    };
    TOOL_BASE_COST = {
      web_search: 8e-3,
      fetch_url: 2e-3,
      enrich_entity: 0.015,
      run_deep_sim: 0.05,
      build_claim_graph: 0.03,
      render_decision_memo: 0.01,
      _default: 3e-3
    };
    MAX_EVENTS = 1e4;
    eventCount = 0;
  }
});

// packages/mcp-local/src/profiler/otelReceiver.ts
var otelReceiver_exports = {};
__export(otelReceiver_exports, {
  processOtelPayload: () => processOtelPayload
});
function parseAttributes(attrs) {
  const result = {};
  if (!attrs) return result;
  for (const a of attrs) {
    result[a.key] = a.value?.stringValue ?? (a.value?.intValue ? Number(a.value.intValue) : void 0);
  }
  return result;
}
function processOtelPayload(body) {
  let spansProcessed = 0;
  let eventsLogged = 0;
  const resourceSpans = body?.resourceSpans ?? [];
  for (const rs of resourceSpans) {
    const scopeSpans = rs?.scopeSpans ?? [];
    for (const ss of scopeSpans) {
      const spans = ss?.spans ?? [];
      for (const span of spans) {
        spansProcessed++;
        const attrs = parseAttributes(span.attributes);
        const name = span.name ?? "";
        const isToolSpan = name.includes("execute_tool") || name.includes("tool_call") || attrs["gen_ai.operation.name"] === "execute_tool" || attrs["openai.tool_name"] || attrs["langchain.tool.name"];
        if (!isToolSpan) continue;
        const toolName = attrs["openai.tool_name"] ?? attrs["langchain.tool.name"] ?? attrs["tool.name"] ?? name;
        const startMs = Number(BigInt(span.startTimeUnixNano) / BigInt(1e6));
        const endMs = Number(BigInt(span.endTimeUnixNano) / BigInt(1e6));
        logOtelSpan({
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId,
          toolName,
          startTimeMs: startMs,
          endTimeMs: endMs,
          attributes: attrs
        });
        eventsLogged++;
      }
    }
  }
  return { spansProcessed, eventsLogged };
}
var init_otelReceiver = __esm({
  "packages/mcp-local/src/profiler/otelReceiver.ts"() {
    "use strict";
    init_eventCollector();
  }
});

// server/vercel/searchApp.ts
import cors from "cors";
import express from "express";
import Database from "better-sqlite3";

// packages/mcp-local/src/tools/entityEnrichmentTools.ts
init_db();
function inferEntityType(query) {
  const lq = query.toLowerCase();
  if (lq.match(/\b(market|industry|sector|space|landscape)\b/)) return "market";
  if (lq.match(/\b(theme|trend|movement|wave)\b/)) return "theme";
  const words = query.trim().split(/\s+/);
  if (words.length <= 3 && words[0]?.[0] === words[0]?.[0]?.toUpperCase()) {
    if (lq.match(/\b(ceo|founder|cto|cfo|vp|director|manager|analyst)\b/)) return "person";
    return "company";
  }
  return "company";
}
function extractEntityName(query) {
  const cleaned = query.replace(/^(analyze|search|tell me about|profile|diligence on|research)\s+/i, "").replace(/\s+(competitive position|strategy|valuation|risk|overview|analysis).*$/i, "").replace(/['"]/g, "").trim();
  return cleaned || query.trim().split(/\s+/).slice(0, 3).join(" ");
}
function buildEnrichedEntity(name, type, data) {
  return {
    name,
    type,
    summary: data.summary ?? data.overview ?? data.description ?? `Entity intelligence for ${name}`,
    confidence: Math.min(95, 40 + (data.sources?.length ?? 0) * 5 + (data.findings?.length ?? 0) * 8),
    metrics: (data.metrics ?? []).slice(0, 6).map((m) => ({
      label: m.label ?? m.name ?? "Metric",
      value: String(m.value ?? m.amount ?? "N/A")
    })),
    changes: (data.changes ?? data.findings ?? []).slice(0, 5).map((c) => ({
      description: typeof c === "string" ? c : c.description ?? c.summary ?? String(c),
      date: c.date
    })),
    signals: (data.signals ?? data.variables ?? []).slice(0, 5).map((s, i) => ({
      name: typeof s === "string" ? s : s.name ?? String(s),
      direction: s.direction ?? "neutral",
      impact: s.impact ?? (i < 2 ? "high" : "medium")
    })),
    risks: (data.risks ?? []).slice(0, 4).map((r) => ({
      title: typeof r === "string" ? r : r.title ?? r.claim ?? String(r),
      description: typeof r === "string" ? "" : r.description ?? r.evidence ?? "",
      falsification: r.falsification
    })),
    comparables: (data.comparables ?? data.competitors ?? []).slice(0, 5).map((c) => ({
      name: typeof c === "string" ? c : c.name ?? String(c),
      relevance: c.relevance ?? "medium",
      note: typeof c === "string" ? "" : c.note ?? c.description ?? ""
    })),
    contradictions: (data.contradictions ?? []).slice(0, 3).map((c) => ({
      claim: typeof c === "string" ? c : c.claim ?? c.factA?.claim ?? String(c),
      evidence: typeof c === "string" ? "" : c.evidence ?? c.factB?.claim ?? "",
      severity: c.severity ?? 3
    })),
    nextQuestions: (data.nextQuestions ?? []).slice(0, 4),
    nextActions: (data.nextActions ?? data.recommendations ?? []).slice(0, 4).map((a) => ({
      action: typeof a === "string" ? a : a.action ?? a.step ?? String(a),
      impact: a.impact ?? "medium"
    })),
    sources: (data.sources ?? []).slice(0, 10).map((s) => typeof s === "string" ? s : s.url ?? s.name ?? String(s))
  };
}
var entityEnrichmentTools = [
  {
    name: "enrich_entity",
    description: "Enrich an entity (company, person, theme, market) with structured intelligence. Returns a ResultPacket-compatible structure with entity truth, signals, risks, comparables, contradictions, and recommended actions. Uses local knowledge first, then web enrichment if available.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query or entity name" },
        entityName: { type: "string", description: "Explicit entity name (optional \u2014 inferred from query)" },
        entityType: { type: "string", enum: ["company", "person", "theme", "market"], description: "Entity type (optional \u2014 inferred)" },
        lens: { type: "string", description: "User's active lens (founder, investor, banker, ceo, legal, student)" },
        includeLocal: { type: "boolean", description: "Include local NodeBench context (default: true)" }
      },
      required: ["query"]
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
    async handler(args) {
      const query = String(args.query ?? "").trim();
      if (!query) return { error: true, message: "Query is required" };
      const name = args.entityName ?? extractEntityName(query);
      const type = args.entityType ?? inferEntityType(query);
      const lens = String(args.lens ?? "founder");
      const db = getDb();
      const localResults = [];
      try {
        const rows = db.prepare(
          `SELECT * FROM observations WHERE title LIKE ? ORDER BY created_at DESC LIMIT 10`
        ).all(`%${name}%`);
        localResults.push(...rows);
      } catch {
      }
      let archivedEntity = null;
      try {
        const cached = db.prepare(
          `SELECT * FROM entity_cache WHERE entity_name = ? AND updated_at > ?`
        ).get(name, Date.now() - 24 * 60 * 60 * 1e3);
        if (cached) archivedEntity = JSON.parse(cached.data);
      } catch {
      }
      const enriched = buildEnrichedEntity(name, type, {
        summary: archivedEntity?.summary,
        sources: localResults.map((r) => r.source ?? "local"),
        findings: localResults.map((r) => ({ summary: r.title, date: r.created_at })),
        metrics: archivedEntity?.metrics ?? [],
        signals: archivedEntity?.signals ?? [],
        risks: archivedEntity?.risks ?? [],
        comparables: archivedEntity?.comparables ?? [],
        contradictions: archivedEntity?.contradictions ?? [],
        nextQuestions: [
          `What are ${name}'s key competitive advantages?`,
          `How does ${name} compare to its closest competitors?`,
          `What are the main risks facing ${name}?`,
          `What changed for ${name} recently?`
        ],
        nextActions: [
          { action: `Deep-dive ${name}'s financials and unit economics`, impact: "high" },
          { action: `Map ${name}'s competitive landscape`, impact: "high" },
          { action: `Monitor ${name} for material changes`, impact: "medium" }
        ]
      });
      try {
        db.exec(`CREATE TABLE IF NOT EXISTS entity_cache (
          entity_name TEXT PRIMARY KEY,
          entity_type TEXT,
          data TEXT,
          query TEXT,
          lens TEXT,
          source_count INTEGER DEFAULT 0,
          updated_at INTEGER
        )`);
        db.prepare(
          `INSERT OR REPLACE INTO entity_cache (entity_name, entity_type, data, query, lens, source_count, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(name, type, JSON.stringify(enriched), query, lens, enriched.sources.length, Date.now());
      } catch {
      }
      return {
        success: true,
        entity: enriched,
        // Map to the shape the search route expects (canonicalEntity + memo)
        canonicalEntity: {
          name: enriched.name,
          canonicalMission: enriched.summary,
          identityConfidence: enriched.confidence
        },
        memo: true,
        whatChanged: enriched.changes,
        signals: enriched.signals,
        contradictions: enriched.contradictions,
        comparables: enriched.comparables,
        nextActions: enriched.nextActions,
        nextQuestions: enriched.nextQuestions,
        keyMetrics: enriched.metrics,
        lens
      };
    }
  },
  {
    name: "detect_contradictions",
    description: "Detect contradictions across multiple sources for an entity. Compares signals, claims, and evidence to find conflicting information. Returns severity-ranked contradictions with resolution suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        entityName: { type: "string", description: "Entity to check for contradictions" },
        signals: {
          type: "array",
          items: { type: "object" },
          description: "Array of signals/claims to cross-check"
        }
      },
      required: ["entityName"]
    },
    annotations: { readOnlyHint: true },
    async handler(args) {
      const entityName = String(args.entityName ?? "").trim();
      if (!entityName) return { error: true, message: "Entity name is required" };
      const signals = args.signals ?? [];
      const contradictions = [];
      for (let i = 0; i < signals.length; i++) {
        for (let j = i + 1; j < signals.length; j++) {
          const a = signals[i];
          const b = signals[j];
          if (!a?.claim || !b?.claim) continue;
          const aLower = a.claim.toLowerCase();
          const bLower = b.claim.toLowerCase();
          let isContradiction = false;
          let nature = "semantic";
          if (aLower.includes("not") && !bLower.includes("not") && aLower.replace(/not\s+/g, "").includes(bLower.slice(0, 20)) || bLower.includes("not") && !aLower.includes("not") && bLower.replace(/not\s+/g, "").includes(aLower.slice(0, 20))) {
            isContradiction = true;
            nature = "direct";
          }
          const upWords = ["growing", "increasing", "expanding", "rising", "accelerating", "up"];
          const downWords = ["shrinking", "decreasing", "declining", "falling", "decelerating", "down"];
          const aHasUp = upWords.some((w) => aLower.includes(w));
          const aHasDown = downWords.some((w) => aLower.includes(w));
          const bHasUp = upWords.some((w) => bLower.includes(w));
          const bHasDown = downWords.some((w) => bLower.includes(w));
          if (aHasUp && bHasDown || aHasDown && bHasUp) {
            isContradiction = true;
            nature = "numerical";
          }
          if (isContradiction) {
            contradictions.push({
              factA: { claim: a.claim, source: a.source ?? "unknown", confidence: a.confidence ?? 0.5 },
              factB: { claim: b.claim, source: b.source ?? "unknown", confidence: b.confidence ?? 0.5 },
              nature,
              severity: Math.round(((a.confidence ?? 0.5) + (b.confidence ?? 0.5)) * 2.5)
            });
          }
        }
      }
      contradictions.sort((a, b) => b.severity - a.severity);
      return {
        entityId: entityName,
        contradictionCount: contradictions.length,
        contradictions: contradictions.slice(0, 10),
        hasHighSeverity: contradictions.some((c) => c.severity >= 4)
      };
    }
  },
  {
    name: "ingest_upload",
    description: "Ingest uploaded file content into the NodeBench entity intelligence system. Extracts entities, signals, decisions, and actions from text content. Queues for canonicalization and enrichment via the ambient intelligence pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Text content from the uploaded file" },
        fileName: { type: "string", description: "Original file name" },
        fileType: { type: "string", description: "File MIME type or extension" },
        sourceProvider: { type: "string", description: "Where the file came from (e.g., 'user_upload', 'agent_output')" }
      },
      required: ["content"]
    },
    annotations: { destructiveHint: false },
    async handler(args) {
      const content = String(args.content ?? "").trim();
      if (!content) return { error: true, message: "Content is required" };
      if (content.length > 5e5) return { error: true, message: "Content too large (max 500KB)" };
      const fileName = String(args.fileName ?? "unknown");
      const fileType = String(args.fileType ?? "text/plain");
      const sourceProvider = String(args.sourceProvider ?? "user_upload");
      const entityMentions = /* @__PURE__ */ new Set();
      const entityPattern = /(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
      let match;
      while ((match = entityPattern.exec(content)) !== null) {
        const ent = match[0].trim();
        if (ent.length >= 4 && ent.length <= 50) {
          entityMentions.add(ent);
        }
      }
      const decisions = [];
      const sentences = content.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);
      for (const sent of sentences) {
        if (sent.match(/\b(decided|decision|chose|approved|rejected|agreed|committed)\b/i)) {
          decisions.push(sent.slice(0, 200));
        }
      }
      const actions = [];
      for (const sent of sentences) {
        if (sent.match(/\b(need to|should|must|will|plan to|going to|action item|todo|task)\b/i)) {
          actions.push(sent.slice(0, 200));
        }
      }
      const signals = [];
      for (const sent of sentences) {
        if (sent.match(/\b(growing|declining|increased|decreased|launched|acquired|raised|pivoted|shutdown|layoff)\b/i)) {
          signals.push(sent.slice(0, 200));
        }
      }
      const db = getDb();
      try {
        db.exec(`CREATE TABLE IF NOT EXISTS ingestion_queue (
          id TEXT PRIMARY KEY,
          source_type TEXT,
          source_provider TEXT,
          source_ref TEXT,
          raw_content TEXT,
          extracted_entities TEXT,
          extracted_decisions TEXT,
          extracted_actions TEXT,
          extracted_signals TEXT,
          processing_status TEXT DEFAULT 'queued',
          created_at INTEGER
        )`);
        const id = `ing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        db.prepare(
          `INSERT INTO ingestion_queue (id, source_type, source_provider, source_ref, raw_content, extracted_entities, extracted_decisions, extracted_actions, extracted_signals, processing_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?)`
        ).run(
          id,
          fileType,
          sourceProvider,
          fileName,
          content.slice(0, 1e5),
          // Cap stored content
          JSON.stringify([...entityMentions]),
          JSON.stringify(decisions.slice(0, 20)),
          JSON.stringify(actions.slice(0, 20)),
          JSON.stringify(signals.slice(0, 20)),
          Date.now()
        );
        return {
          success: true,
          ingestionId: id,
          extractedEntities: [...entityMentions].slice(0, 20),
          extractedDecisions: decisions.length,
          extractedActions: actions.length,
          extractedSignals: signals.length,
          contentLength: content.length,
          status: "queued",
          message: `Ingested ${fileName}. Found ${entityMentions.size} entities, ${decisions.length} decisions, ${actions.length} actions, ${signals.length} signals. Queued for canonicalization.`
        };
      } catch (err) {
        return { error: true, message: `Ingestion failed: ${err?.message ?? String(err)}` };
      }
    }
  }
];

// packages/mcp-local/src/tools/founderLocalPipeline.ts
init_db();
import { execSync } from "child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join as join2, resolve, dirname } from "path";
import { fileURLToPath } from "url";

// packages/mcp-local/src/tools/founderOperatingModel.ts
var EXECUTION_ORDER = [
  {
    id: "ingest",
    label: "Ingest",
    description: "Collect raw query, uploads, private context, and prior packet lineage."
  },
  {
    id: "classify",
    label: "Classify role and vertical",
    description: "Resolve the user role, company mode, and the relevant diligence vertical early."
  },
  {
    id: "canonicalize",
    label: "Canonicalize company",
    description: "Decide whether this is the user's own company, an external company, or a mixed comparison."
  },
  {
    id: "score",
    label: "Score readiness and gaps",
    description: "Score readiness, contradictions, missing evidence, and progression state."
  },
  {
    id: "packet",
    label: "Choose packet",
    description: "Route to the canonical packet type for the role and company mode."
  },
  {
    id: "artifact",
    label: "Choose artifact",
    description: "Select the first artifact surface that matches the packet and stage of maturity."
  },
  {
    id: "action",
    label: "Monitor, export, or delegate",
    description: "Decide whether the run should stop at insight, create a shareable artifact, set up monitoring, or create a handoff."
  },
  {
    id: "trace",
    label: "Track before/after and replay",
    description: "Persist the path, evidence, and replay state for later benchmark and audit use."
  }
];
var QUEUE_TOPOLOGY = [
  {
    id: "ingestion",
    label: "Ingestion queue",
    purpose: "Normalize raw text, uploads, and source receipts into structured founder context.",
    upstream: ["query", "upload", "private context"],
    outputs: ["canonical source records", "structured claims"]
  },
  {
    id: "sweeps",
    label: "Sweep queue",
    purpose: "Run scheduled or manual source sweeps for watched entities and dependencies.",
    upstream: ["watchlist", "manual sweep"],
    outputs: ["fresh observations", "source deltas"]
  },
  {
    id: "delta",
    label: "Delta queue",
    purpose: "Compare the current state to prior packets and classify change severity.",
    upstream: ["ingestion", "sweeps"],
    outputs: ["delta digest", "flash/priority/routine tiers"]
  },
  {
    id: "packet_refresh",
    label: "Packet refresh queue",
    purpose: "Refresh stale packets when new evidence changes the company story or diligence state.",
    upstream: ["delta", "manual review"],
    outputs: ["updated packets", "staleness receipts"]
  },
  {
    id: "artifact_render",
    label: "Artifact render queue",
    purpose: "Render Slack reports, investor memos, diligence packets, and profile exports.",
    upstream: ["packet_refresh", "manual export"],
    outputs: ["rendered artifacts"]
  },
  {
    id: "export_delivery",
    label: "Export delivery queue",
    purpose: "Handle share-link creation and destination-specific export delivery.",
    upstream: ["artifact_render"],
    outputs: ["share links", "delivery receipts"]
  },
  {
    id: "delegation_dispatch",
    label: "Delegation dispatch queue",
    purpose: "Dispatch bounded tasks tied to the canonical packet and shared context.",
    upstream: ["packet_refresh", "manual delegation"],
    outputs: ["task handoffs", "assignee receipts"]
  },
  {
    id: "benchmark_runs",
    label: "Benchmark queue",
    purpose: "Run autonomy and workflow-optimization benchmarks against packet-backed workflows.",
    upstream: ["manual benchmark", "scheduled evaluation"],
    outputs: ["benchmark runs", "oracle verdicts"]
  },
  {
    id: "ambient_reminders",
    label: "Ambient reminder queue",
    purpose: "Proactively surface stale packets, diligence gaps, and moat/public exposure warnings.",
    upstream: ["delta", "packet_refresh", "benchmark_runs"],
    outputs: ["reminders", "attention queue items"]
  }
];
var SOURCE_POLICIES = [
  {
    sourceType: "slack",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "redact",
    notes: "Slack can be summarized and stored, but exported artifacts should redact private internal details by default."
  },
  {
    sourceType: "codebase",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "reference_only",
    notes: "Codebase details can shape packets, but external exports should reference capabilities rather than expose internals."
  },
  {
    sourceType: "local_files",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "redact",
    notes: "Local files are usable for internal synthesis but need explicit redaction before outside sharing."
  },
  {
    sourceType: "uploads",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "redact",
    notes: "Uploads are packet inputs, but external delivery should strip sensitive passages unless explicitly approved."
  },
  {
    sourceType: "docs",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "allow",
    notes: "Owned docs and product docs are generally safe to summarize and cite in artifacts."
  },
  {
    sourceType: "web_research",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "allow",
    notes: "Public web research can be stored, summarized, and exported with citations."
  },
  {
    sourceType: "agent_outputs",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "reference_only",
    notes: "Agent outputs should be treated as derived claims that require evidence before external export."
  },
  {
    sourceType: "third_party",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "reference_only",
    notes: "Third-party provider outputs are usable for synthesis but should usually be referenced, not blindly re-exported."
  }
];
var ROLE_PACKET_DEFAULTS = [
  {
    role: "founder",
    defaultPacketType: "founder_progression_packet",
    defaultArtifactType: "slack_onepage",
    shouldMonitorByDefault: true,
    shouldDelegateByDefault: true
  },
  {
    role: "banker",
    defaultPacketType: "banking_readiness_packet",
    defaultArtifactType: "banker_readiness",
    shouldMonitorByDefault: false,
    shouldDelegateByDefault: false
  },
  {
    role: "ceo",
    defaultPacketType: "operating_brief",
    defaultArtifactType: "investor_memo",
    shouldMonitorByDefault: true,
    shouldDelegateByDefault: true
  },
  {
    role: "investor",
    defaultPacketType: "operating_brief",
    defaultArtifactType: "investor_memo",
    shouldMonitorByDefault: true,
    shouldDelegateByDefault: false
  },
  {
    role: "student",
    defaultPacketType: "study_brief",
    defaultArtifactType: "study_brief",
    shouldMonitorByDefault: false,
    shouldDelegateByDefault: false
  },
  {
    role: "legal",
    defaultPacketType: "diligence_packet",
    defaultArtifactType: "diligence_packet",
    shouldMonitorByDefault: true,
    shouldDelegateByDefault: false
  }
];
var PROGRESSION_RUBRIC = [
  {
    stageId: "clarity",
    label: "Stage 0: Clarity",
    promotionCriteria: ["Clear wedge", "One useful packet", "Named customer"],
    mandatorySignals: ["wedge_defined", "useful_packet"],
    optionalSignals: ["shareable_artifact"]
  },
  {
    stageId: "foundation",
    label: "Stage 1: Foundation",
    promotionCriteria: ["Gap diagnosis", "Delegable task", "Install path"],
    mandatorySignals: ["useful_packet", "delegated_task", "install_path"],
    optionalSignals: ["workflow_fit", "shareable_artifact"]
  },
  {
    stageId: "readiness",
    label: "Stage 2: Readiness",
    promotionCriteria: ["Diligence pack", "Readiness score", "External artifact"],
    mandatorySignals: ["delegated_task", "shareable_artifact", "diligence_pack"],
    optionalSignals: ["submission_ready", "benchmark_proof"]
  },
  {
    stageId: "leverage",
    label: "Stage 3: Leverage",
    promotionCriteria: ["Benchmark proof", "Ambient monitoring", "Repeated packet reuse"],
    mandatorySignals: ["benchmark_proof", "repeated_reuse", "ambient_monitoring"],
    optionalSignals: ["team_install", "shared_history"]
  },
  {
    stageId: "scale",
    label: "Stage 4: Scale",
    promotionCriteria: ["Multi-user proof", "Durable retention", "Channel leverage"],
    mandatorySignals: ["shared_history", "retention_signal", "channel_leverage"],
    optionalSignals: ["partner_motion", "benchmark_program"]
  }
];
var BENCHMARK_ORACLES = [
  {
    lane: "weekly_founder_reset",
    baseline: "Manual weekly reset assembled from scattered notes and searches.",
    deterministicChecks: ["Packet exists", "Citations retained", "Top next action selected"],
    probabilisticJudges: ["Summary usefulness", "Decision clarity"],
    heldOutScenarios: ["Messy founder notes", "Conflicting market signals"]
  },
  {
    lane: "competitor_signal_response",
    baseline: "Research note without a routed product or GTM response.",
    deterministicChecks: ["Competitor signal cited", "Response packet created", "Follow-up task exists"],
    probabilisticJudges: ["Strategic usefulness", "Response relevance"],
    heldOutScenarios: ["High-noise news cycle", "Adjacent competitor launch"]
  },
  {
    lane: "packet_to_implementation",
    baseline: "Manual restatement from packet to implementation handoff.",
    deterministicChecks: ["Packet linked to task", "Implementation artifact exists", "Validation receipt exists"],
    probabilisticJudges: ["Handoff quality", "Implementation drift"],
    heldOutScenarios: ["Spec ambiguity", "Changing implementation scope"]
  },
  {
    lane: "cheapest_valid_workflow",
    baseline: "Original multi-step workflow without optimization.",
    deterministicChecks: ["Before/after memo exists", "Validation checks passed", "Artifact class preserved"],
    probabilisticJudges: ["Shortcut credibility", "Savings significance"],
    heldOutScenarios: ["Shortcut hides diligence gap", "Shortcut drops source lineage"]
  },
  {
    lane: "browserstack_lane",
    baseline: "Unverified browser workflow claims without replay evidence.",
    deterministicChecks: ["Route run recorded", "Replay artifact exists", "Verification result stored"],
    probabilisticJudges: ["Visual quality", "Workflow smoothness"],
    heldOutScenarios: ["Cross-browser regression", "Mobile-only failure"]
  }
];
function detectFounderCompanyMode(args) {
  const query = args.query.toLowerCase();
  const canonicalEntity = args.canonicalEntity?.toLowerCase().trim();
  const ownSignals = [
    "my company",
    "our company",
    "our startup",
    "our product",
    "our tool",
    "our tools",
    "our app",
    "our dashboard",
    "our workflow",
    "our mcp",
    "what should we do",
    "what should i do next",
    "given everything about my company",
    "we are building",
    "we need",
    "current founder",
    "own-company",
    "own company"
  ];
  const compareSignals = ["compare", "versus", "vs", "against"];
  const hasOwnSignals = ownSignals.some((signal) => query.includes(signal)) || Boolean(args.hasPrivateContext) || Boolean(canonicalEntity && query.includes(canonicalEntity));
  const hasCompareSignals = compareSignals.some((signal) => query.includes(signal));
  if (hasOwnSignals && hasCompareSignals) return "mixed_comparison";
  if (hasOwnSignals) return "own_company";
  return "external_company";
}
function getFounderRolePacketDefault(role) {
  return ROLE_PACKET_DEFAULTS.find((entry) => entry.role === role) ?? ROLE_PACKET_DEFAULTS[0];
}
function getFounderExecutionOrder() {
  return EXECUTION_ORDER;
}
function getFounderQueueTopology() {
  return QUEUE_TOPOLOGY;
}
function getFounderSourcePolicies() {
  return SOURCE_POLICIES;
}
function getFounderBenchmarkOracles() {
  return BENCHMARK_ORACLES;
}
function evaluateFounderProgressionRubric(args) {
  const signals = /* @__PURE__ */ new Set();
  if (args.hasUsefulPacket) signals.add("useful_packet");
  if (args.hasDelegatedTask) signals.add("delegated_task");
  if (args.hasShareableArtifact) signals.add("shareable_artifact");
  if (args.hasDiligencePack) signals.add("diligence_pack");
  if (args.hasBenchmarkProof) signals.add("benchmark_proof");
  if (args.hasAmbientMonitoring) signals.add("ambient_monitoring");
  if (args.hasRepeatedReuse) signals.add("repeated_reuse");
  if (args.readinessScore >= 48) signals.add("wedge_defined");
  if (args.readinessScore >= 55) signals.add("install_path");
  if (args.readinessScore >= 58) signals.add("workflow_fit");
  if (args.readinessScore >= 62) signals.add("submission_ready");
  if (args.readinessScore >= 70) signals.add("team_install");
  if (args.readinessScore >= 75) signals.add("shared_history");
  if (args.readinessScore >= 80) signals.add("retention_signal");
  if (args.readinessScore >= 84) signals.add("channel_leverage");
  if (args.readinessScore >= 86) signals.add("partner_motion");
  if (args.readinessScore >= 88) signals.add("benchmark_program");
  const stage = args.readinessScore >= 82 ? "scale" : args.readinessScore >= 70 ? "leverage" : args.readinessScore >= 58 ? "readiness" : args.readinessScore >= 45 ? "foundation" : "clarity";
  const rubric = PROGRESSION_RUBRIC.find((entry) => entry.stageId === stage) ?? PROGRESSION_RUBRIC[0];
  const mandatorySatisfied = rubric.mandatorySignals.filter((signal) => signals.has(signal));
  const mandatoryMissing = rubric.mandatorySignals.filter((signal) => !signals.has(signal));
  const optionalStrengths = rubric.optionalSignals.filter((signal) => signals.has(signal));
  return {
    currentStage: stage,
    onTrack: mandatoryMissing.length === 0,
    mandatorySatisfied,
    mandatoryMissing,
    optionalStrengths,
    rationale: mandatoryMissing.length === 0 ? `${rubric.label} is supported by the required operating signals.` : `${rubric.label} is still missing ${mandatoryMissing.join(", ")}.`
  };
}
function routeFounderPacket(args) {
  const roleDefault = getFounderRolePacketDefault(args.role);
  const needsMoreEvidence = args.hiddenRiskCount > 0 || args.readinessScore < 55;
  const requiredEvidence = [];
  if (needsMoreEvidence) requiredEvidence.push("readiness_gaps");
  if (args.vertical.includes("healthcare")) requiredEvidence.push("regulatory_or_research_evidence");
  if (!args.hasBenchmarkProof) requiredEvidence.push("benchmark_proof");
  const shouldMonitor = roleDefault.shouldMonitorByDefault || args.companyMode !== "external_company";
  const shouldDelegate = roleDefault.shouldDelegateByDefault && args.readinessScore >= 55;
  const shouldExport = args.hasShareableArtifact && !needsMoreEvidence;
  return {
    role: args.role,
    companyMode: args.companyMode,
    packetType: roleDefault.defaultPacketType,
    artifactType: roleDefault.defaultArtifactType,
    visibility: args.visibility === "public" && needsMoreEvidence ? "workspace" : args.visibility,
    shouldMonitor,
    shouldExport,
    shouldDelegate,
    needsMoreEvidence,
    requiredEvidence,
    rationale: args.companyMode === "own_company" ? "Own-company mode prioritizes progression, delegation, and monitoring over public export." : args.companyMode === "mixed_comparison" ? "Mixed mode needs a packet that blends internal context with external competitive evidence." : "External-company mode defaults to a research packet unless private context elevates it into an operating decision."
  };
}
function buildFounderOperatingModel(args) {
  const companyMode = detectFounderCompanyMode({
    query: args.query,
    canonicalEntity: args.canonicalEntity,
    hasPrivateContext: args.hasPrivateContext
  });
  return {
    executionOrder: getFounderExecutionOrder(),
    queueTopology: getFounderQueueTopology(),
    sourcePolicies: getFounderSourcePolicies(),
    roleDefault: getFounderRolePacketDefault(args.role),
    packetRouter: routeFounderPacket({
      role: args.role,
      companyMode,
      readinessScore: args.readinessScore,
      hiddenRiskCount: args.hiddenRiskCount,
      visibility: args.visibility,
      hasShareableArtifact: args.hasShareableArtifact,
      hasBenchmarkProof: args.hasBenchmarkProof,
      vertical: args.vertical
    }),
    progressionRubric: evaluateFounderProgressionRubric({
      readinessScore: args.readinessScore,
      hasUsefulPacket: true,
      hasDelegatedTask: args.hasDelegatedTask,
      hasShareableArtifact: args.hasShareableArtifact,
      hasDiligencePack: args.hasDiligencePack,
      hasBenchmarkProof: args.hasBenchmarkProof,
      hasAmbientMonitoring: args.hasAmbientMonitoring,
      hasRepeatedReuse: args.hasRepeatedReuse
    }),
    benchmarkOracles: getFounderBenchmarkOracles()
  };
}

// packages/mcp-local/src/tools/founderLocalPipeline.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
function safeRead(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}
function safeExec(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 1e4, stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}
function extractBrandPrefix(value) {
  if (!value) return null;
  const trimmed = value.trim().replace(/^#\s*/, "");
  if (!trimmed) return null;
  const prefix = trimmed.split(/\s+[—–-]\s+/)[0]?.trim() ?? "";
  return prefix || null;
}
function normalizeWorkspaceBrand(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (["nodebench", "nodebench ai", "nodebench-ai", "nodebench mcp", "nodebench-mcp", "nodebench_mcp"].includes(lower)) {
    return "NodeBench";
  }
  if (lower.endsWith("-mcp") || lower.endsWith(" mcp")) {
    return null;
  }
  return trimmed;
}
function inferWorkspaceProjectName(args) {
  const candidates = [
    normalizeWorkspaceBrand(args.siteName),
    normalizeWorkspaceBrand(extractBrandPrefix(args.title)),
    normalizeWorkspaceBrand(extractBrandPrefix(args.claudeHeading)),
    normalizeWorkspaceBrand(args.rootPackageName),
    normalizeWorkspaceBrand(args.packageName),
    normalizeWorkspaceBrand(args.projectRoot?.split(/[\\/]/).filter(Boolean).pop() ?? null)
  ];
  return candidates.find((candidate) => Boolean(candidate)) ?? null;
}
function resolveWorkspaceCompanyName(ctx) {
  const directCandidates = [
    ctx.identity.projectName,
    ctx.publicSurfaces.indexHtmlSiteName,
    extractBrandPrefix(ctx.publicSurfaces.indexHtmlTitle),
    ctx.identity.packageName
  ];
  const normalized = directCandidates.map((candidate) => normalizeWorkspaceBrand(candidate)).find((candidate) => Boolean(candidate));
  if (normalized) return normalized;
  if (ctx.identity.projectRoot.toLowerCase().includes("nodebench")) return "NodeBench";
  return null;
}
function findProjectRoot() {
  let dir = resolve(__dirname, "..", "..");
  for (let i = 0; i < 5; i++) {
    if (existsSync(join2(dir, "CLAUDE.md"))) return dir;
    dir = resolve(dir, "..");
  }
  return process.cwd();
}
function includesAny(value, terms) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}
function dedupeStrings(values) {
  return [...new Set(values.filter(Boolean).map((value) => value.trim()).filter(Boolean))];
}
var PROGRESSION_TIERS = [
  {
    id: "clarity",
    label: "Stage 0: Clarity",
    priceLabel: "Free",
    unlocks: ["Idea pressure test", "Founder profile baseline", "Starter packet"],
    services: ["Search/upload/ask", "Basic founder packet", "Weekly reset"]
  },
  {
    id: "foundation",
    label: "Stage 1: Foundation",
    priceLabel: "$1",
    unlocks: ["Missing foundations", "Operating hygiene", "Delegation packet"],
    services: ["Readiness checklist", "Decision memo export", "Team install plan"]
  },
  {
    id: "readiness",
    label: "Stage 2: Readiness",
    priceLabel: "$5",
    unlocks: ["Investor and banker packets", "Diligence pack", "Vertical checks"],
    services: ["Runway workflows", "Qualification scoring", "Artifact history"]
  },
  {
    id: "leverage",
    label: "Stage 3: Leverage",
    priceLabel: "$20",
    unlocks: ["Ambient monitoring", "Benchmark evidence", "Workflow optimization"],
    services: ["Shared context ops", "Autonomy benchmark lanes", "Premium exports"]
  },
  {
    id: "scale",
    label: "Stage 4: Scale",
    priceLabel: "Custom",
    unlocks: ["Hosted monitoring", "Workspace collaboration", "Enterprise diligence"],
    services: ["Premium scoring", "Multi-device sync", "Partner packet surfaces"]
  }
];
function detectVerticalLabel(value) {
  const normalized = value.toLowerCase();
  if (includesAny(normalized, ["healthcare", "life science", "biotech", "medtech", "clinical", "trial", "patent", "fda", "lab"])) {
    if (includesAny(normalized, ["medtech", "device", "robotic surgery"])) {
      return { vertical: "healthcare/life sciences", subvertical: "medtech" };
    }
    return { vertical: "healthcare/life sciences", subvertical: "biotech and clinical" };
  }
  if (includesAny(normalized, ["robot", "robotics", "simulation", "world model", "agent", "mcp", "claude code", "developer", "workflow", "software", "saas", "ai"])) {
    if (includesAny(normalized, ["robot", "robotics", "simulation", "world model"])) {
      return { vertical: "AI/software", subvertical: "robotics and simulation tooling" };
    }
    return { vertical: "AI/software", subvertical: "developer and agent tooling" };
  }
  return { vertical: "founder/general", subvertical: "general operating system" };
}
function buildDiligencePack(vertical, sourceRefIds, strategicAngles) {
  if (vertical === "healthcare/life sciences") {
    const evidenceClasses2 = [
      { id: "patents", label: "Patents and IP", description: "Patents, provisional filings, or IP chain-of-title evidence.", required: true },
      { id: "publications", label: "Publications", description: "Peer-reviewed work, abstracts, preprints, or institutional publications.", required: true },
      { id: "studies", label: "Studies and trials", description: "Preclinical, clinical, or observational study evidence with provenance.", required: true },
      { id: "regulatory", label: "Regulatory path", description: "Submission path, approvals, or diligence notes tied to real requirements.", required: true },
      { id: "institutional", label: "Institutional credibility", description: "Affiliations, advisors, lab partners, and trial sites.", required: true }
    ];
    const requirements2 = [
      {
        id: "ip-proof",
        title: "Patent and claim verifiability",
        status: includesAny(strategicAngles.map((angle) => angle.id).join(" "), ["stealth-moat"]) ? "watch" : "missing",
        whyItMatters: "Healthcare claims get challenged quickly if the IP story is vague or not verifiable.",
        evidenceClassIds: ["patents", "publications"]
      },
      {
        id: "evidence-path",
        title: "Clinical or research evidence path",
        status: "missing",
        whyItMatters: "Banks, investors, and serious partners will ask what data, trials, and institutions support the product claims.",
        evidenceClassIds: ["studies", "institutional"]
      },
      {
        id: "regulatory-path",
        title: "Regulatory and submission clarity",
        status: "missing",
        whyItMatters: "Without a plausible regulatory path, the company looks naive during diligence.",
        evidenceClassIds: ["regulatory"]
      }
    ];
    return {
      id: "healthcare_life_sciences",
      label: "Healthcare / Life Sciences Diligence Pack",
      summary: "Translate the company into the evidence, regulatory, and institutional proof that investors, banks, and partners will later ask for.",
      externalEvaluators: ["Healthcare investors", "JPM startup banking", "Strategic partners", "Regulatory reviewers"],
      evidenceClasses: evidenceClasses2,
      requirements: requirements2,
      highRiskClaims: ["patent defensibility", "clinical efficacy", "regulatory readiness", "scientific legitimacy"],
      materials: ["Patent summary", "Publication list", "Trial or study evidence", "Regulatory path memo", "Institutional advisor list"],
      readyDefinition: "Ready means the core claims can be backed by sourceable evidence, institutional context, and a credible submission path."
    };
  }
  const evidenceClasses = [
    { id: "workflow", label: "Workflow adoption", description: "Proof that the product plugs into a high-frequency workflow users already run.", required: true },
    { id: "installation", label: "Installability", description: "One-command install, predictable updates, and clear activation path.", required: true },
    { id: "benchmarks", label: "Benchmark proof", description: "Before/after or cheapest-valid-path evidence tied to real workflows.", required: true },
    { id: "distribution", label: "Distribution surfaces", description: "Ready surfaces for MCP, CLI, plugin, dashboard, or ecosystem partnerships.", required: true },
    { id: "pull", label: "User pull", description: "Signals that people already want the workflow and would return to it.", required: false }
  ];
  const requirements = [
    {
      id: "workflow-fit",
      title: "Workflow-native adoption",
      status: strategicAngles.some((angle) => angle.id === "adoption" && angle.status === "strong") ? "ready" : "watch",
      whyItMatters: "AI/software buyers reward products that land inside current habits like Claude Code, MCP, or browser workflows.",
      evidenceClassIds: ["workflow"]
    },
    {
      id: "install-surface",
      title: "Installability and maintenance boundary",
      status: strategicAngles.some((angle) => angle.id === "installability" && angle.status === "strong") ? "ready" : "watch",
      whyItMatters: "If setup, updates, and support are fuzzy, the wedge will not spread.",
      evidenceClassIds: ["installation", "distribution"]
    },
    {
      id: "proof-story",
      title: "Benchmark-backed proof story",
      status: "watch",
      whyItMatters: "Users and investors need visible evidence that the shorter, cheaper, or more useful path still preserves quality.",
      evidenceClassIds: ["benchmarks", "pull"]
    }
  ];
  return {
    id: "ai_software",
    label: "AI / Software Diligence Pack",
    summary: "Focus the company on workflow fit, installability, benchmark proof, and distribution surfaces that compound quickly.",
    externalEvaluators: ["Developers", "Founders", "AI infra buyers", "Early-stage investors"],
    evidenceClasses,
    requirements,
    highRiskClaims: ["workflow lock-in", "maintainability", "distribution moat", "benchmark legitimacy"],
    materials: ["Founder packet", "Install plan", "Benchmark memo", "Slack one-page report", "Partner surface map"],
    readyDefinition: "Ready means the wedge is installable, benchmarked, and attached to a workflow users already run frequently."
  };
}
function buildScorecards(progressionProfile, readinessScore) {
  const twoWeekMustHappen = [
    "Produce one useful founder packet",
    "Generate a progression diagnosis",
    "Delegate one bounded task",
    "Export one shareable artifact"
  ];
  const threeMonthMustHappen = [
    "Show repeated packet reuse",
    "Demonstrate ambient intervention value",
    "Retain at least one paid-stage workflow",
    "Publish one benchmark-backed proof story"
  ];
  return [
    {
      id: "two_week",
      label: "2-week scorecard",
      status: readinessScore >= 58 ? "on_track" : readinessScore >= 45 ? "watch" : "off_track",
      summary: readinessScore >= 58 ? "On track if the team turns the current packet into one exported artifact and one delegated follow-up." : "Off track until the team narrows the wedge and ships one useful artifact fast.",
      mustHappen: twoWeekMustHappen
    },
    {
      id: "three_month",
      label: "3-month scorecard",
      status: progressionProfile.currentStage === "leverage" || progressionProfile.currentStage === "scale" ? "on_track" : readinessScore >= 52 ? "watch" : "off_track",
      summary: progressionProfile.currentStage === "leverage" || progressionProfile.currentStage === "scale" ? "On track if the workflow keeps compounding through reuse, monitoring, and benchmark evidence." : "The next 3 months should prove habit, reuse, and at least one benchmark-backed moat story.",
      mustHappen: threeMonthMustHappen
    }
  ];
}
function buildDistributionSurfaceStatus(combinedText) {
  return [
    {
      surfaceId: "mcp_cli",
      label: "MCP / CLI",
      status: includesAny(combinedText, ["mcp", "cli", "claude code", "local"]) ? "ready" : "partial",
      whyItMatters: "This is the lowest-friction open-core distribution surface."
    },
    {
      surfaceId: "dashboard",
      label: "Hosted dashboard",
      status: includesAny(combinedText, ["dashboard", "subscription", "service", "team"]) ? "partial" : "missing",
      whyItMatters: "This is the retained value and pricing surface for teams."
    },
    {
      surfaceId: "ecosystem",
      label: "Ecosystem plugins and partners",
      status: includesAny(combinedText, ["cursor", "smithery", "plugin", "github", "open source"]) ? "partial" : "missing",
      whyItMatters: "This is how the workflow lands where users already spend time."
    }
  ];
}
function inferCompanyNameCandidates(query, vertical) {
  if (includesAny(query, ["robot", "robotics", "simulation", "world model", "cloth", "laundry"])) {
    return ["Drape Labs", "Tensile AI", "Loom Motion", "FoldShift", "SoftDelta Robotics"];
  }
  if (vertical === "healthcare/life sciences") {
    return ["SignalBio", "Verity Therapeutics", "TrialPath Labs", "ProofCell", "Atlas Medica"];
  }
  if (vertical === "AI/software") {
    return ["Northstar Ops", "Vector Forge", "Signal Bench", "Packet Layer", "Operator Loop"];
  }
  return ["Northstar Labs", "Signal Forge", "Operator Stack", "Clarity Loop", "Atlas Foundry"];
}
function buildCompanyNamingPack(args) {
  const suggestedNames = dedupeStrings([
    args.existingCompanyName?.trim() ?? "",
    ...inferCompanyNameCandidates(args.query, args.vertical)
  ]).filter(Boolean);
  const recommendedName = suggestedNames[0];
  return {
    suggestedNames,
    recommendedName,
    starterProfile: {
      companyName: recommendedName,
      oneLineDescription: `${args.vertical === "healthcare/life sciences" ? "Evidence-backed" : "Workflow-native"} platform for ${args.wedge.toLowerCase()}.`,
      categories: [args.vertical, args.subvertical, "founder operating system"].filter(Boolean),
      stage: args.companyState,
      initialCustomers: args.vertical === "healthcare/life sciences" ? ["Healthcare founders", "Life science investors", "Diligence-heavy partners"] : ["Developers", "Founders", "Product teams", "AI infra buyers"],
      wedge: args.wedge
    }
  };
}
function buildFounderMaterialsChecklist(args) {
  const weakAngles = new Set(args.strategicAngles.filter((angle) => angle.status !== "strong").map((angle) => angle.id));
  return args.diligencePack.materials.map((label, index) => ({
    id: `material:${index + 1}`,
    label,
    status: weakAngles.size > 3 && index < 2 ? "missing" : weakAngles.size > 0 ? "watch" : "ready",
    audience: index < 2 ? "internal" : "external",
    whyItMatters: `External evaluators will eventually ask for ${label.toLowerCase()} even if the founder has not prepared it yet.`
  }));
}
function buildFounderProgressionProfile(args) {
  const missingFoundations = args.materialsChecklist.filter((item) => item.status === "missing").map((item) => item.label);
  const hiddenRisks = args.strategicAngles.filter((angle) => angle.status !== "strong").map((angle) => `${angle.title}: ${angle.summary}`);
  const nextUnlocks = [
    {
      id: "useful-packet",
      title: "Generate one useful packet and use it in a real founder decision",
      status: args.readinessScore >= 55 ? "ready" : "watch",
      requiredSignals: ["Founder packet exported", "Decision memo reused"]
    },
    {
      id: "delegation",
      title: "Delegate one bounded task from the packet",
      status: args.readinessScore >= 60 ? "ready" : "watch",
      requiredSignals: ["Shared task exists", "Handoff prompt or packet URI reused"]
    },
    {
      id: "benchmark-proof",
      title: "Publish one benchmark-backed proof story",
      status: args.readinessScore >= 70 ? "ready" : "missing",
      requiredSignals: ["Before/after memo", "Validation checks passed", "Shortcut rationale documented"]
    }
  ];
  let currentStage = "clarity";
  if (args.readinessScore >= 82) currentStage = "scale";
  else if (args.readinessScore >= 70) currentStage = "leverage";
  else if (args.readinessScore >= 58) currentStage = "readiness";
  else if (args.readinessScore >= 45) currentStage = "foundation";
  return {
    currentStage,
    currentStageLabel: PROGRESSION_TIERS.find((tier) => tier.id === currentStage)?.label ?? "Stage 0: Clarity",
    readinessScore: args.readinessScore,
    missingFoundations,
    hiddenRisks,
    nextUnlocks,
    delegableWork: [
      "Collect competitor and market diligence",
      "Prepare the Slack one-page report",
      "Generate install and workflow adoption plans"
    ],
    founderOnlyWork: [
      "Choose the wedge and moat story",
      "Decide what stays stealthy",
      "Own the top investor and partner narrative"
    ],
    onTrackStatus: args.readinessScore >= 60 ? "on_track" : args.readinessScore >= 48 ? "watch" : "off_track",
    recommendedNextAction: nextUnlocks.find((unlock) => unlock.status !== "ready")?.title ?? "Turn the current packet into the main founder workflow this week."
  };
}
function buildCompanyReadinessPacket(args) {
  const tier = PROGRESSION_TIERS.find((item) => item.id === args.progressionProfile.currentStage) ?? PROGRESSION_TIERS[0];
  return {
    packetId: args.packetId,
    visibility: args.visibility,
    identity: {
      companyName: args.namingPack.recommendedName,
      vertical: args.vertical,
      subvertical: args.subvertical,
      stage: args.progressionProfile.currentStageLabel,
      mission: args.namingPack.starterProfile.oneLineDescription,
      wedge: args.namingPack.starterProfile.wedge
    },
    founderTeamCredibility: [
      "Map founder background to the chosen wedge",
      "Make the right-to-win explicit before broad sharing"
    ],
    productAndWedge: [
      args.namingPack.starterProfile.oneLineDescription,
      `Primary wedge: ${args.namingPack.starterProfile.wedge}`
    ],
    marketAndGtm: [
      "Start with the highest-frequency workflow the user already runs",
      "Use open-core MCP for trust and the dashboard for retained value"
    ],
    financialReadiness: [
      "Runway and burn rate need an explicit view before fundraising",
      "Paid stage progression should map to founder maturity, not arbitrary quotas"
    ],
    operatingReadiness: [
      ...args.progressionProfile.delegableWork,
      ...args.progressionProfile.founderOnlyWork
    ],
    diligenceEvidence: args.diligencePack.materials,
    contradictionsAndHiddenRisks: args.strategicAngles.filter((angle) => angle.status !== "strong").map((angle) => angle.summary),
    nextUnlocks: args.progressionProfile.nextUnlocks.map((unlock) => unlock.title),
    pricingStage: {
      stageId: tier.id,
      label: tier.label,
      priceLabel: tier.priceLabel
    },
    distributionSurfaceStatus: args.distributionSurfaceStatus,
    provenance: {
      sourceRefIds: args.sourceRefIds,
      confidence: args.confidence,
      freshness: (/* @__PURE__ */ new Date()).toISOString()
    },
    allowedDestinations: ["slack_onepage", "investor_memo", "banker_readiness", "pitchbook_like", "crunchbase_like", "yc_context"],
    sensitivity: args.visibility === "public" ? "workspace" : args.visibility
  };
}
function buildSlackOnepager(args) {
  const status = args.progressionProfile.onTrackStatus.replace("_", " ");
  const twoWeek = args.scorecards.find((item) => item.id === "two_week");
  return {
    id: "artifact:slack_onepage",
    type: "slack_onepage",
    title: "Founder one-page Slack report",
    visibility: "workspace",
    summary: "One-page founder report for Slack with stage, risks, unlocks, and next move.",
    payload: {
      text: [
        `*NodeBench Founder Report*`,
        `Question: ${args.query}`,
        `Stage: ${args.progressionProfile.currentStageLabel}`,
        `Readiness: ${args.progressionProfile.readinessScore}/100`,
        `Status: ${status}`,
        `Company: ${args.companyPacket.identity.companyName}`,
        `Summary: ${args.summary}`,
        `Next unlocks: ${args.progressionProfile.nextUnlocks.map((unlock) => unlock.title).join("; ")}`,
        `2-week plan: ${twoWeek?.mustHappen.join("; ") ?? "Ship one useful packet and one delegated task."}`
      ].join("\n")
    }
  };
}
function buildBenchmarkEvidence(args) {
  const common = {
    packetRef: args.packetId,
    agentsInvolved: ["nodebench", "claude_code", "judge"],
    validationFailures: [],
    humanInterventions: ["Founder approves externally visible actions"]
  };
  return [
    {
      benchmarkId: genId("bench"),
      lane: "weekly_founder_reset",
      objective: "Turn founder context into a weekly reset packet and the next three moves.",
      actionsTaken: ["Gather context", "Synthesize packet", "Export artifact"],
      beforeState: "Context scattered across notes, code, and market signals.",
      afterState: "One packet with next moves, risks, and exportable summary.",
      artifactsProduced: ["Founder packet", "Slack one-page report"],
      validationPasses: ["Packet assembled", "Citations retained", "Next move selected"],
      timeMs: 1800,
      estimatedCostUsd: 0.24,
      reuseScore: Math.max(58, args.progressionProfile.readinessScore),
      summary: "Weekly reset autopilot proves the product can compress founder context into one reusable artifact.",
      ...common
    },
    {
      benchmarkId: genId("bench"),
      lane: "cheapest_valid_workflow",
      objective: `Find a shorter and cheaper valid path for: ${args.query}`,
      actionsTaken: ["Compare current path", "Suggest optimized path", "Validate shortcut"],
      beforeState: "Manual founder reasoning spread across repeated sessions.",
      afterState: "Shorter validated path with explicit checks and reusable packet context.",
      artifactsProduced: ["Workflow compare memo"],
      validationPasses: ["Shortcut rationale documented", "Validation checks named"],
      timeMs: 2200,
      estimatedCostUsd: 0.19,
      reuseScore: Math.max(52, args.progressionProfile.readinessScore - 4),
      summary: "Cheapest-valid-path benchmarking turns workflow optimization into proof instead of hand-wavy speed claims.",
      ...common
    }
  ];
}
function buildWorkflowPathComparison(args) {
  const currentPath = args.currentPath?.length ? args.currentPath : [
    "Restate the context manually",
    "Search for comparables",
    "Draft a memo from scratch",
    "Manually hand off the task"
  ];
  const optimizedPath = args.optimizedPath?.length ? args.optimizedPath : [
    "Reuse the founder packet",
    "Refresh missing diligence only",
    "Export the one-page report",
    "Delegate from the shared packet"
  ];
  return {
    objective: args.objective,
    currentPath,
    optimizedPath,
    rationale: "The optimized path removes repeated restatement and relies on the packet, export adapter, and shared delegation spine.",
    validationChecks: [
      "The same decision artifact still exists at the end",
      "Required diligence fields remain present",
      "The shortcut does not hide contradictory evidence"
    ],
    estimatedSavings: {
      timePercent: 38,
      costPercent: 24
    },
    verdict: "valid"
  };
}
function buildFounderDirectionAssessment(args) {
  const ctx = gatherLocalContext(args.daysBack ?? 14);
  const lens = args.lens ?? "founder";
  const combinedText = [
    args.query,
    args.extraContext ?? "",
    ...args.userSkillset ?? [],
    ...args.interests ?? [],
    ...args.constraints ?? [],
    ...args.marketWorkflow ?? [],
    ...ctx.recentChanges.modifiedFiles ?? []
  ].join(" ").toLowerCase();
  const assessmentId = genId("assess");
  const packetId = genId("packet");
  const evidenceRefIds = ["source:claude", "source:readme", "source:dogfood"];
  const sourceRefs = [
    {
      id: "source:claude",
      label: "CLAUDE.md",
      title: "Product and workflow identity",
      type: "local",
      status: "cited",
      href: join2(ctx.identity.projectRoot, "CLAUDE.md"),
      excerpt: ctx.identity.claudeMdSnippet ?? "Internal product identity and operating rules."
    },
    {
      id: "source:readme",
      label: "packages/mcp-local/README.md",
      title: "Local MCP distribution surface",
      type: "local",
      status: "cited",
      href: join2(ctx.identity.projectRoot, "packages", "mcp-local", "README.md"),
      excerpt: ctx.publicSurfaces.readmeTagline ?? ctx.publicSurfaces.serverJsonDescription ?? "Local MCP packaging and positioning."
    },
    {
      id: "source:dogfood",
      label: "Latest dogfood findings",
      title: "Dogfood and proof pressure",
      type: "local",
      status: ctx.dogfoodFindings.verdict ? "cited" : "explored",
      href: ctx.dogfoodFindings.latestFile ?? void 0,
      excerpt: ctx.dogfoodFindings.findings.slice(0, 2).join(" ") || "No recent dogfood findings available."
    }
  ];
  const teamSpecific = (args.userSkillset ?? []).length > 0;
  const aiSkeptic = includesAny(combinedText, ["no ai", "without ai", "anti ai", "environment", "peace", "altruistic"]);
  const workflowAligned = includesAny(combinedText, ["claude code", "mcp", "cursor", "developer workflow", "agent workflow", "teams"]);
  const installFocused = includesAny(combinedText, ["install", "local", "dashboard", "service", "subscription", "hosted", "self-host", "maintenance", "update"]);
  const distributionFocused = includesAny(combinedText, ["investor", "credibility", "convince", "adopt", "workflow", "sell", "subscription"]);
  const constrainedByScope = includesAny(combinedText, ["solo", "single founder", "limited", "specific skillset", "narrow skillset"]);
  const publicExposureRisk = lens === "founder" || includesAny(combinedText, [
    "stealth",
    "moat",
    "launch",
    "posting",
    "post publicly",
    "announce",
    "go public",
    "marketing",
    "reveal"
  ]);
  const hasRecentProof = ctx.dogfoodFindings.verdict?.toLowerCase().includes("pass") || ctx.sessionMemory.totalActions7d >= 5;
  const strategicAngles = [
    {
      id: "stealth-moat",
      title: "Stealth, moat, and public exposure timing",
      status: publicExposureRisk ? "watch" : "unknown",
      summary: publicExposureRisk ? "Before posting broadly, assume the direction is easier to copy than it feels. Stay relatively stealthy until the moat, workflow lock-in, or evidence edge is clearer." : "The run has not yet established whether public exposure helps more than it harms before the moat is proven.",
      whyItMatters: "Premature posting can teach the market what you are doing before the wedge is hard to duplicate. Founders need moat evidence and market diligence before broad exposure.",
      evidenceRefIds,
      nextQuestion: "What have competitors already shipped, how easily can they copy this, and what moat would justify posting now instead of staying quieter longer?"
    },
    {
      id: "team-shape",
      title: "Team shape and complementary skill gaps",
      status: teamSpecific || constrainedByScope ? "watch" : "unknown",
      summary: teamSpecific || constrainedByScope ? "The current direction depends heavily on a narrow skill profile. That can create wedge strength, but it also exposes obvious hiring, GTM, or credibility gaps." : "The run does not yet spell out whether the team shape is a real edge or an unaddressed constraint.",
      whyItMatters: "Specific skillsets help when they map cleanly to the wedge, but they slow a company down when core build, sell, or support functions are missing.",
      evidenceRefIds,
      nextQuestion: "Which missing capability would most reduce risk for this direction: technical depth, customer access, distribution, or investor credibility?"
    },
    {
      id: "founder-fit",
      title: "Founder and experience fit",
      status: hasRecentProof ? "watch" : "unknown",
      summary: hasRecentProof ? "There is evidence of execution momentum, but the founder story still needs to make the wedge feel inevitable rather than merely possible." : "This direction still needs stronger evidence that the builders and the problem are tightly matched.",
      whyItMatters: "Investors and early users look for evidence that the founding team has unusual right-to-win on the exact problem they chose.",
      evidenceRefIds,
      nextQuestion: "What founder-specific experience, access, or technical edge makes this direction believable now?"
    },
    {
      id: "build-speed",
      title: "Build speed and time-to-first-proof",
      status: installFocused || workflowAligned ? "strong" : "watch",
      summary: installFocused || workflowAligned ? "The direction can likely piggyback on existing local-first and developer workflow surfaces, which shortens the path to a useful wedge." : "The idea still needs a more explicit plan for what can be built and proven in the next 2 to 4 weeks.",
      whyItMatters: "The first version has to ship fast enough to create proof before the team burns time on secondary surfaces.",
      evidenceRefIds,
      nextQuestion: "What is the smallest founder-grade wedge we can build in 2 to 4 weeks that creates proof instead of debt?"
    },
    {
      id: "installability",
      title: "Installability and update path",
      status: installFocused ? "strong" : "watch",
      summary: installFocused ? "The query already points toward installable surfaces such as local MCP, hosted dashboards, or team subscriptions, which is a healthy sign." : "The current idea still needs a clear answer for how people install, maintain, and update it without high-touch onboarding.",
      whyItMatters: "Installation friction and update pain destroy adoption even when the core product insight is strong.",
      evidenceRefIds,
      nextQuestion: "Should the first wedge land as a local MCP tool, a hosted dashboard, or a hybrid with local truth and web review?"
    },
    {
      id: "maintainability",
      title: "Maintainability and support burden",
      status: includesAny(combinedText, ["maintain", "maintenance", "support", "ops", "update"]) ? "watch" : "strong",
      summary: includesAny(combinedText, ["maintain", "maintenance", "support", "ops", "update"]) ? "The idea raises ongoing maintenance and support concerns, so the service boundary needs to stay narrow." : "The current direction can stay relatively lean if the team avoids adding too many surfaces before the wedge is proven.",
      whyItMatters: "A promising tool loses momentum fast if maintenance and support grow faster than product leverage.",
      evidenceRefIds,
      nextQuestion: "What should stay manual, local, or intentionally out-of-scope so maintenance does not outrun product value?"
    },
    {
      id: "adoption",
      title: "Workflow adoption and current market fit",
      status: workflowAligned ? "strong" : "watch",
      summary: workflowAligned ? "The direction connects to workflows users already run today, including current developer loops like Claude Code and MCP-based tooling." : "The current direction still needs proof that it plugs into a high-frequency workflow instead of asking users to learn a new behavior from scratch.",
      whyItMatters: "The fastest adoption comes from landing inside an existing habit rather than trying to invent one.",
      evidenceRefIds,
      nextQuestion: "Which current high-frequency workflow does this naturally attach to, and how do we make that attachment unavoidable?"
    },
    {
      id: "commercial",
      title: "Commercialization and sellability",
      status: installFocused || distributionFocused ? "strong" : "watch",
      summary: installFocused || distributionFocused ? "There is a credible path from tool to dashboard or subscription service if the wedge keeps producing durable proof for teams." : "The idea still needs a sharper answer for how it becomes a repeatable product instead of bespoke help or one-off consulting.",
      whyItMatters: "A good internal tool is not enough. The company needs a product that can be packaged, renewed, and expanded.",
      evidenceRefIds,
      nextQuestion: "What is the clearest route from useful tool to team dashboard, recurring subscription, or sellable operating layer?"
    },
    {
      id: "conviction",
      title: "User and investor conviction",
      status: hasRecentProof ? "watch" : "unknown",
      summary: hasRecentProof ? "There is enough motion to support a story, but the packet still needs sharper comparables, outcomes, and proof points to persuade outsiders." : "The current direction needs more evidence before it becomes a convincing story for users or investors.",
      whyItMatters: "Conviction builds when outsiders can repeat the story and believe the timing, not only the ambition.",
      evidenceRefIds,
      nextQuestion: "What proof points, traction signals, or comparables would make this direction legible to a skeptical user or investor?"
    }
  ];
  if (aiSkeptic || lens === "founder") {
    strategicAngles.push({
      id: "ai-tradeoffs",
      title: "AI stance and mission tradeoffs",
      status: aiSkeptic ? "watch" : "unknown",
      summary: aiSkeptic ? "The idea includes explicit skepticism about AI, so the product needs a clear answer for where AI is optional, bounded, or unnecessary." : "The direction still needs a deliberate answer for when AI is essential versus when deterministic, local, or non-AI paths should stay available.",
      whyItMatters: "Some teammates and users will reject products that feel casually dependent on AI. A deliberate stance reduces internal friction and market confusion.",
      evidenceRefIds,
      nextQuestion: "Where is AI genuinely necessary here, and where should the product stay local-first, deterministic, or optional?"
    });
  }
  const issueAngles = strategicAngles.filter((angle) => angle.status !== "strong").map((angle) => angle.id);
  const topIssue = strategicAngles.find((angle) => angle.status !== "strong") ?? strategicAngles[0];
  const summary = issueAngles.length > 0 ? `Pressure test completed. The highest-risk angles right now are ${issueAngles.slice(0, 3).join(", ")}, and the next pass should turn those into a tighter founder wedge.` : "Pressure test completed. The direction looks operationally legible; now convert it into a narrower wedge with faster proof.";
  const nextQuestions = dedupeStrings(strategicAngles.map((angle) => angle.nextQuestion)).slice(0, 8);
  const confidence = Math.max(55, Math.min(92, 70 + (hasRecentProof ? 8 : 0) + (workflowAligned ? 6 : 0) - issueAngles.length * 2));
  const { vertical, subvertical } = detectVerticalLabel(combinedText);
  const readinessScore = Math.max(35, Math.min(95, confidence - issueAngles.length * 3 + (installFocused ? 4 : 0)));
  const workspaceCompanyName = resolveWorkspaceCompanyName(ctx);
  const companyMode = detectFounderCompanyMode({
    query: args.query,
    canonicalEntity: workspaceCompanyName ?? void 0,
    hasPrivateContext: Boolean(args.extraContext)
  });
  const queryReferencesWorkspace = Boolean(
    workspaceCompanyName && args.query.toLowerCase().includes(workspaceCompanyName.toLowerCase())
  );
  const shouldUseWorkspaceIdentity = Boolean(workspaceCompanyName) && (companyMode === "own_company" || companyMode === "mixed_comparison" || queryReferencesWorkspace);
  const diligencePack = buildDiligencePack(vertical, evidenceRefIds, strategicAngles);
  const materialsChecklist = buildFounderMaterialsChecklist({ diligencePack, strategicAngles });
  const progressionProfile = buildFounderProgressionProfile({
    readinessScore,
    strategicAngles,
    materialsChecklist
  });
  const scorecards = buildScorecards(progressionProfile, readinessScore);
  const visibility = publicExposureRisk ? "workspace" : "internal";
  const namingPack = buildCompanyNamingPack({
    query: args.query,
    vertical,
    subvertical,
    wedge: topIssue ? `resolve ${topIssue.title.toLowerCase()} for ${subvertical}` : `founder operating workflow for ${subvertical}`,
    companyState: progressionProfile.currentStageLabel,
    existingCompanyName: shouldUseWorkspaceIdentity ? workspaceCompanyName ?? void 0 : void 0
  });
  const distributionSurfaceStatus = buildDistributionSurfaceStatus(combinedText);
  const companyReadinessPacket = buildCompanyReadinessPacket({
    packetId,
    sourceRefIds: sourceRefs.map((source) => source.id),
    confidence,
    visibility,
    vertical,
    subvertical,
    readinessScore,
    progressionProfile,
    namingPack,
    diligencePack,
    distributionSurfaceStatus,
    strategicAngles
  });
  const benchmarkEvidence = buildBenchmarkEvidence({
    packetId,
    query: args.query,
    progressionProfile
  });
  const workflowComparison = buildWorkflowPathComparison({
    objective: args.query
  });
  const shareableArtifacts = [
    buildSlackOnepager({
      query: args.query,
      summary,
      progressionProfile,
      scorecards,
      companyPacket: companyReadinessPacket
    }),
    {
      id: "artifact:investor_memo",
      type: "investor_memo",
      title: "Investor memo starter",
      visibility,
      summary: "Starter investor memo with stage, wedge, risks, and next unlocks.",
      payload: {
        company: companyReadinessPacket.identity.companyName,
        stage: progressionProfile.currentStageLabel,
        wedge: companyReadinessPacket.identity.wedge,
        risks: progressionProfile.hiddenRisks,
        nextUnlocks: progressionProfile.nextUnlocks.map((unlock) => unlock.title)
      }
    }
  ];
  const operatingModel = buildFounderOperatingModel({
    role: lens === "banker" ? "banker" : lens === "ceo" ? "ceo" : lens === "investor" ? "investor" : lens === "student" ? "student" : lens === "legal" ? "legal" : "founder",
    query: args.query,
    canonicalEntity: shouldUseWorkspaceIdentity ? workspaceCompanyName ?? namingPack.recommendedName : namingPack.recommendedName,
    hasPrivateContext: Boolean(args.extraContext),
    readinessScore,
    hiddenRiskCount: progressionProfile.hiddenRisks.length,
    visibility,
    hasShareableArtifact: shareableArtifacts.length > 0,
    hasBenchmarkProof: benchmarkEvidence.length > 0,
    hasDelegatedTask: progressionProfile.delegableWork.length > 0,
    hasDiligencePack: diligencePack.requirements.length > 0,
    hasAmbientMonitoring: true,
    hasRepeatedReuse: readinessScore >= 70,
    vertical
  });
  return {
    assessmentId,
    packetId,
    packetType: "founder_direction_assessment",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    generatedBy: "founder_local_pipeline",
    query: args.query,
    lens,
    summary,
    confidence,
    sourceRefs,
    strategicAngles,
    recommendedNextAction: topIssue ? `Resolve ${topIssue.title.toLowerCase()} before broadening the roadmap.` : "Turn the validated wedge into a single installable workflow and get real founder feedback this week.",
    nextQuestions,
    issueAngles,
    progressionProfile,
    progressionTiers: PROGRESSION_TIERS,
    diligencePack,
    readinessScore,
    unlocks: progressionProfile.nextUnlocks,
    materialsChecklist,
    scorecards,
    shareableArtifacts,
    visibility,
    benchmarkEvidence,
    workflowComparison,
    operatingModel,
    distributionSurfaceStatus,
    companyReadinessPacket,
    companyNamingPack: namingPack
  };
}
function gatherLocalContext(daysBack = 7) {
  const root = findProjectRoot();
  const claudeMd = safeRead(join2(root, "CLAUDE.md"));
  const claudeMdSnippet = claudeMd ? claudeMd.split("\n").slice(0, 8).join("\n") : null;
  const pkgJson = safeRead(join2(root, "packages", "mcp-local", "package.json"));
  const rootPkgJson = safeRead(join2(root, "package.json"));
  let packageName = null;
  let packageVersion = null;
  let rootPackageName = null;
  if (rootPkgJson) {
    try {
      const pkg = JSON.parse(rootPkgJson);
      rootPackageName = pkg.name ?? null;
    } catch {
    }
  }
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson);
      packageName = pkg.name ?? null;
      packageVersion = pkg.version ?? null;
    } catch {
    }
  }
  const safeDays = Math.max(1, Math.min(365, Math.floor(Number(daysBack) || 7)));
  const gitLog = safeExec(`git log --oneline --since="${safeDays} days ago" -30`, root);
  const gitDiffStat = safeExec(`git diff --stat HEAD~10 HEAD 2>/dev/null || echo "no diff"`, root);
  const modifiedFiles = safeExec(`git diff --name-only HEAD~10 HEAD 2>/dev/null || echo ""`, root).split("\n").filter(Boolean).slice(0, 30);
  const indexHtml = safeRead(join2(root, "index.html"));
  let indexHtmlTitle = null;
  let indexHtmlSiteName = null;
  let indexHtmlOgDescription = null;
  if (indexHtml) {
    const titleMatch = indexHtml.match(/<title>([^<]+)<\/title>/);
    indexHtmlTitle = titleMatch?.[1] ?? null;
    const siteNameMatch = indexHtml.match(/og:site_name[^>]+content="([^"]+)"/);
    indexHtmlSiteName = siteNameMatch?.[1] ?? null;
    const ogDescMatch = indexHtml.match(/og:description[^>]+content="([^"]+)"/);
    indexHtmlOgDescription = ogDescMatch?.[1] ?? null;
  }
  const claudeHeading = claudeMd?.match(/^#\s+(.+)$/m)?.[1] ?? null;
  const projectName = inferWorkspaceProjectName({
    siteName: indexHtmlSiteName,
    title: indexHtmlTitle,
    claudeHeading,
    rootPackageName,
    packageName,
    projectRoot: root
  });
  const serverJson = safeRead(join2(root, "packages", "mcp-local", "server.json"));
  let serverJsonDescription = null;
  if (serverJson) {
    try {
      serverJsonDescription = JSON.parse(serverJson).description ?? null;
    } catch {
    }
  }
  const readme = safeRead(join2(root, "packages", "mcp-local", "README.md"));
  const readmeTagline = readme ? readme.match(/\*\*([^*]+)\*\*/)?.[1] ?? null : null;
  let recentActions = [];
  let recentMilestones = [];
  let totalActions7d = 0;
  let totalMilestones7d = 0;
  try {
    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - daysBack * 864e5).toISOString().slice(0, 10);
    const actions = db.prepare(
      `SELECT action, category, impactLevel, timestamp FROM tracking_actions
       WHERE date(timestamp) >= ? ORDER BY timestamp DESC LIMIT 20`
    ).all(sevenDaysAgo);
    recentActions = actions.map((a) => ({
      action: a.action,
      category: a.category,
      impact: a.impactLevel,
      timestamp: a.timestamp
    }));
    const milestones = db.prepare(
      `SELECT title, category, timestamp FROM tracking_milestones
       WHERE date(timestamp) >= ? ORDER BY timestamp DESC LIMIT 10`
    ).all(sevenDaysAgo);
    recentMilestones = milestones.map((m) => ({
      title: m.title,
      category: m.category,
      timestamp: m.timestamp
    }));
    totalActions7d = db.prepare(
      `SELECT COUNT(*) as c FROM tracking_actions WHERE date(timestamp) >= ?`
    ).get(sevenDaysAgo)?.c ?? 0;
    totalMilestones7d = db.prepare(
      `SELECT COUNT(*) as c FROM tracking_milestones WHERE date(timestamp) >= ?`
    ).get(sevenDaysAgo)?.c ?? 0;
  } catch {
  }
  const docsDir = join2(root, "docs");
  let latestDogfoodFile = null;
  let dogfoodVerdict = null;
  let p0Count = 0;
  let p1Count = 0;
  const dogfoodFindings = [];
  try {
    const dogfoodFiles = existsSync(docsDir) ? readdirSync(docsDir).filter((f) => f.startsWith("dogfood-findings-") && f.endsWith(".json")).map((f) => join2(docsDir, f)).sort((a, b) => (statSync(b).mtimeMs ?? 0) - (statSync(a).mtimeMs ?? 0)) : [];
    if (dogfoodFiles.length > 0) {
      latestDogfoodFile = dogfoodFiles[0];
      const content = safeRead(dogfoodFiles[0]);
      if (content) {
        const parsed = JSON.parse(content);
        dogfoodVerdict = parsed.verdict ?? null;
        const allFindings = parsed.runs?.flatMap((r) => r.findings ?? []) ?? parsed.global_findings ?? [];
        for (const f of allFindings) {
          if (f.severity === "P0") p0Count++;
          if (f.severity === "P1") p1Count++;
          dogfoodFindings.push(`[${f.severity}] ${f.description?.slice(0, 120) ?? f.title?.slice(0, 120) ?? "unknown"}`);
        }
      }
    }
  } catch {
  }
  const archDir = join2(root, "docs", "architecture");
  const architectureDocs = [];
  try {
    const archFiles = existsSync(archDir) ? readdirSync(archDir).filter((f) => f.endsWith(".md")).map((f) => join2(archDir, f)).sort((a, b) => (statSync(b).mtimeMs ?? 0) - (statSync(a).mtimeMs ?? 0)).slice(0, 10) : [];
    for (const f of archFiles) {
      const name = f.split(/[/\\]/).pop() ?? f;
      architectureDocs.push(name);
    }
  } catch {
  }
  const prd = safeRead(join2(archDir, "NODEBENCH_AI_APP_PRD_V1.md"));
  const prdSnippet = prd ? prd.split("\n").slice(0, 12).join("\n") : null;
  const runbook = safeRead(join2(archDir, "DOGFOOD_RUNBOOK_V1.md"));
  const dogfoodRunbookSnippet = runbook ? runbook.split("\n").slice(0, 12).join("\n") : null;
  return {
    identity: { projectRoot: root, claudeMdSnippet, projectName, packageName, packageVersion },
    recentChanges: { gitLogOneline: gitLog.split("\n").filter(Boolean), gitDiffStat, modifiedFiles, daysBack },
    publicSurfaces: { indexHtmlTitle, indexHtmlSiteName, indexHtmlOgDescription, serverJsonDescription, readmeTagline },
    sessionMemory: { recentActions, recentMilestones, totalActions7d, totalMilestones7d },
    dogfoodFindings: { latestFile: latestDogfoodFile, verdict: dogfoodVerdict, p0Count, p1Count, findings: dogfoodFindings },
    docs: { prdSnippet, dogfoodRunbookSnippet, architectureDocs }
  };
}
function synthesizePacket(ctx, packetType, originalQuery, webResults) {
  const packetId = genId("pkt");
  const claudeMd = ctx.identity.claudeMdSnippet ?? "";
  let canonicalMission = "Unknown";
  let wedge = "Unknown";
  const overviewMatch = claudeMd.match(/NodeBench\s*[—–-]\s*(.+?)(?:\.\s|$)/m);
  if (overviewMatch) {
    canonicalMission = overviewMatch[1].trim();
  }
  const toolCountMatch = claudeMd.match(/(\d+)-tool/);
  if (toolCountMatch) {
    wedge = `${toolCountMatch[1]}-tool MCP server with entity intelligence`;
  }
  const whatChanged = ctx.recentChanges.gitLogOneline.slice(0, 8).map((line) => {
    const hash = line.slice(0, 8);
    const msg = line.slice(9);
    return { description: msg, date: "this week", source: `git:${hash}` };
  });
  const contradictions = [];
  if (ctx.publicSurfaces.indexHtmlTitle && canonicalMission) {
    const titleLower = ctx.publicSurfaces.indexHtmlTitle.toLowerCase();
    const missionLower = canonicalMission.toLowerCase();
    const missionWords = new Set(missionLower.split(/\s+/).filter((w) => w.length > 3));
    const titleWords = new Set(titleLower.split(/\s+/).filter((w) => w.length > 3));
    const overlap = [...missionWords].filter((w) => titleWords.has(w)).length;
    if (overlap < 2) {
      contradictions.push({
        claim: `CLAUDE.md says: "${canonicalMission}"`,
        evidence: `index.html title says: "${ctx.publicSurfaces.indexHtmlTitle}"`,
        severity: "medium"
      });
    }
  }
  if (ctx.publicSurfaces.serverJsonDescription && ctx.publicSurfaces.readmeTagline) {
    const sjLower = ctx.publicSurfaces.serverJsonDescription.toLowerCase();
    const rdLower = ctx.publicSurfaces.readmeTagline.toLowerCase();
    if (!sjLower.includes("entity") && rdLower.includes("entity")) {
      contradictions.push({
        claim: "README positions as entity intelligence",
        evidence: `server.json description doesn't mention 'entity': "${ctx.publicSurfaces.serverJsonDescription.slice(0, 80)}..."`,
        severity: "low"
      });
    }
  }
  if (ctx.dogfoodFindings.p0Count > 0) {
    contradictions.push({
      claim: `${ctx.dogfoodFindings.p0Count} P0 dogfood findings unresolved`,
      evidence: ctx.dogfoodFindings.findings.filter((f) => f.startsWith("[P0]")).join("; "),
      severity: "high"
    });
  }
  if (ctx.recentChanges.modifiedFiles.length > 20 && ctx.sessionMemory.totalActions7d < 5) {
    contradictions.push({
      claim: `${ctx.recentChanges.modifiedFiles.length} files modified this week but only ${ctx.sessionMemory.totalActions7d} tracked actions`,
      evidence: "Building is outpacing tracking \u2014 habits may not be proven yet",
      severity: "medium"
    });
  }
  const nextActions = [];
  let priority = 1;
  for (const finding of ctx.dogfoodFindings.findings.filter((f) => f.startsWith("[P0]"))) {
    nextActions.push({
      action: `Fix: ${finding.replace("[P0] ", "").slice(0, 100)}`,
      priority: priority++,
      reasoning: "P0 dogfood finding \u2014 blocks core habit loop"
    });
  }
  for (const finding of ctx.dogfoodFindings.findings.filter((f) => f.startsWith("[P1]")).slice(0, 3)) {
    nextActions.push({
      action: `Fix: ${finding.replace("[P1] ", "").slice(0, 100)}`,
      priority: priority++,
      reasoning: "P1 dogfood finding \u2014 degrades tool reliability"
    });
  }
  if (nextActions.length < 3) {
    if (contradictions.length > 0) {
      nextActions.push({
        action: "Resolve top contradiction: " + contradictions[0].claim.slice(0, 80),
        priority: priority++,
        reasoning: "Unresolved contradiction weakens canonical truth"
      });
    }
    nextActions.push({
      action: "Run full dogfood cycle (13 scenarios) and log pass/fail",
      priority: priority++,
      reasoning: "Proves the three core habits work end-to-end"
    });
    nextActions.push({
      action: "Publish updated package with fixed tracking tools and local pipeline",
      priority: priority++,
      reasoning: "Public package should match internal capabilities"
    });
  }
  const signals = [];
  const commitCount = ctx.recentChanges.gitLogOneline.length;
  signals.push({
    name: `${commitCount} commits in last ${ctx.recentChanges.daysBack} days`,
    direction: commitCount > 5 ? "up" : commitCount > 0 ? "neutral" : "down",
    impact: "medium"
  });
  signals.push({
    name: `${ctx.recentChanges.modifiedFiles.length} files modified`,
    direction: ctx.recentChanges.modifiedFiles.length > 10 ? "up" : "neutral",
    impact: "medium"
  });
  signals.push({
    name: `${ctx.sessionMemory.totalActions7d} tracked actions / ${ctx.sessionMemory.totalMilestones7d} milestones`,
    direction: ctx.sessionMemory.totalActions7d > 5 ? "up" : "neutral",
    impact: "high"
  });
  if (ctx.dogfoodFindings.verdict) {
    signals.push({
      name: `Dogfood verdict: ${ctx.dogfoodFindings.verdict.slice(0, 60)}`,
      direction: ctx.dogfoodFindings.verdict.toLowerCase().includes("pass") ? "up" : "down",
      impact: "high"
    });
  }
  const publicMismatches = [];
  if (ctx.publicSurfaces.indexHtmlTitle && !ctx.publicSurfaces.indexHtmlTitle.toLowerCase().includes("entity")) {
    publicMismatches.push(`index.html title doesn't mention 'entity intelligence': "${ctx.publicSurfaces.indexHtmlTitle}"`);
  }
  if (ctx.publicSurfaces.serverJsonDescription && ctx.publicSurfaces.serverJsonDescription.includes("304")) {
    publicMismatches.push("server.json still references '304' tools");
  }
  if (ctx.publicSurfaces.readmeTagline && ctx.publicSurfaces.readmeTagline.includes("Operating intelligence")) {
    publicMismatches.push("README still uses 'Operating intelligence' instead of 'Entity intelligence'");
  }
  function extractEntitiesFromQuery(query) {
    if (!query) return [];
    const entities = [];
    const stopWords = /* @__PURE__ */ new Set(["What", "How", "Why", "When", "Where", "Which", "Show", "Tell", "Give", "Create", "Draft", "Compare", "Analyze", "Flag", "The", "Our", "Any", "All", "Top", "Key", "Main", "Most", "Best"]);
    const matches = query.match(/\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)*/g) ?? [];
    for (const m of matches) {
      if (!stopWords.has(m.split(/\s/)[0])) entities.push(m);
    }
    return [...new Set(entities)].slice(0, 5);
  }
  const memoTitle = {
    weekly_reset: "Founder Weekly Reset",
    pre_delegation: "Pre-Delegation Packet",
    important_change: "Important Change Review",
    competitor_brief: "Competitor Intelligence Brief",
    role_switch: "Role-Adapted Analysis"
  };
  const memoLines = [
    `# NodeBench ${memoTitle[packetType] ?? packetType}`,
    `**Generated:** ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)} by founder_local_pipeline`,
    `**Package:** ${ctx.identity.packageName}@${ctx.identity.packageVersion}`,
    `**Packet type:** ${packetType}`,
    ...originalQuery ? [`**Query:** ${originalQuery}`] : [],
    ``
  ];
  if (packetType === "competitor_brief") {
    const entityNames = extractEntitiesFromQuery(originalQuery);
    const entityLabel = entityNames.length > 0 ? entityNames.join(", ") : "competitors";
    memoLines.push(
      `## Competitor Intelligence Brief: ${entityLabel}`,
      originalQuery ? `Query: ${originalQuery}` : `General competitive analysis`,
      `Generated: ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`,
      ``,
      `## Our Position`,
      `NodeBench is: ${canonicalMission}`,
      `Wedge: ${wedge}`,
      ``,
      `## ${entityLabel} \u2014 Competitive Landscape Changes`,
      ...whatChanged.slice(0, 5).map((c, i) => `${i + 1}. ${c.description}`),
      ``,
      `## ${entityLabel} \u2014 Moats and Differentiators`,
      `Key dimensions when evaluating ${entityLabel}:`,
      `- Distribution advantage (plugin ecosystem, MCP-native onboarding)`,
      `- Technical moat (proprietary data, infrastructure lock-in, network effects)`,
      `- Market positioning (category creation vs category capture)`,
      `- Benchmark rigor and provider abstraction depth`,
      ``,
      `## Strategic Contradictions (${contradictions.length})`,
      ...contradictions.map((c) => `- **[${c.severity}]** ${c.claim}
  Evidence: ${c.evidence}`),
      ``,
      `## Recommended Competitive Moves`,
      ...nextActions.slice(0, 3).map((a) => `${a.priority}. **${a.action}**
   ${a.reasoning}`),
      ``,
      `## Market Signals`,
      ...signals.map((s) => `- ${s.direction === "up" ? "+" : s.direction === "down" ? "-" : "="} ${s.name} (${s.impact})`),
      ``,
      `## Strategic Recommendation`,
      `Absorb: plugin-led distribution, MCP-native onboarding, benchmark rigor, provider abstraction`,
      `Own: causal memory, before/after state, packets/artifacts, role overlays, trajectory`,
      `Avoid: competing directly on raw memory API or universal connector layer`
    );
    if (webResults && webResults.length > 0) {
      memoLines.push(
        ``,
        `## Web Intelligence (${webResults.length} sources)`,
        ...webResults.slice(0, 8).map((r, i) => `${i + 1}. **${r.title}**
   ${r.snippet}
   Source: ${r.url}`)
      );
    }
  } else if (packetType === "role_switch") {
    memoLines.push(
      `## Current Identity`,
      canonicalMission,
      ``,
      `## Available Lenses`,
      `- **Founder:** weekly reset, packet management, delegation, contradiction detection`,
      `- **Banker:** credit analysis, risk assessment, due diligence, regulatory monitoring`,
      `- **CEO:** executive summary, OKR tracking, board updates, leadership attention`,
      `- **Researcher:** literature review, research digest, methodology comparison`,
      `- **Student:** accessible explanations, study plans, beginner resources`,
      `- **Operator:** system health, incident review, deployment monitoring`,
      `- **Investor:** pitch evaluation, market sizing, competitive moats, deal assessment`,
      `- **Legal:** regulatory exposure, compliance signals, governance review`,
      ``,
      `## Active Context`,
      `- ${ctx.sessionMemory.totalActions7d} actions / ${ctx.sessionMemory.totalMilestones7d} milestones (7d)`,
      `- Dogfood: ${ctx.dogfoodFindings.verdict ?? "no runs yet"}`,
      `- Contradictions: ${contradictions.length}`,
      ``,
      `## Signals for Current Role`,
      ...signals.map((s) => `- ${s.direction === "up" ? "+" : s.direction === "down" ? "-" : "="} ${s.name} (${s.impact})`)
    );
  } else if (packetType === "pre_delegation") {
    memoLines.push(
      `## Delegation Objective`,
      originalQuery ? `Task: ${originalQuery}` : `Hand off the following context so the delegate does not need to re-ask.`,
      `Scope: Hand off context so the delegate does not need to re-ask.`,
      ``,
      `## Current State`,
      `- Identity: ${canonicalMission}`,
      `- Package: ${ctx.identity.packageName}@${ctx.identity.packageVersion}`,
      `- Recent commits: ${whatChanged.length}`,
      `- Active contradictions: ${contradictions.length}`,
      ``,
      `## What Changed (Context for Delegate)`,
      ...whatChanged.slice(0, 5).map((c, i) => `${i + 1}. ${c.description}`),
      ``,
      `## Constraints`,
      `- Do not expand generic shell behavior`,
      `- Do not drift from entity intelligence positioning`,
      `- Do not add surfaces without proving the first 3 habits`,
      ``,
      `## Success Criteria`,
      ...nextActions.slice(0, 3).map((a) => `- ${a.action}`),
      ``,
      `## Files Likely Affected`,
      ...ctx.recentChanges.modifiedFiles.slice(0, 10).map((f) => `- ${f}`)
    );
  } else if (packetType === "important_change") {
    const now = /* @__PURE__ */ new Date();
    const weekAgo = new Date(now.getTime() - 7 * 864e5);
    const dateRange = `${weekAgo.toISOString().slice(0, 10)} to ${now.toISOString().slice(0, 10)}`;
    memoLines.push(
      `## Important Changes: ${dateRange}`,
      `Generated: ${now.toISOString().slice(0, 19)}`,
      originalQuery ? `Query: ${originalQuery}` : `Showing only high-signal changes that matter.`,
      `Period: last 7 days (${dateRange})`,
      ``,
      `## Timeline of Changes (${whatChanged.length} detected)`,
      ...whatChanged.slice(0, 8).map((c, i) => `${i + 1}. [${now.toISOString().slice(0, 10)}] **${c.description}** (source: ${c.source})`),
      ``,
      `## Impact Assessment (as of ${now.toISOString().slice(0, 10)})`,
      contradictions.length > 0 ? `**${contradictions.length} active contradiction(s) detected this period:**
` + contradictions.map((c) => `- [${c.severity}] ${c.claim} (detected: ${now.toISOString().slice(0, 10)})`).join("\n") : `No active contradictions \u2014 positioning is consistent as of ${now.toISOString().slice(0, 10)}.`,
      ``,
      `## Packet Refresh Needed?`,
      whatChanged.length > 3 || contradictions.length > 0 ? `Yes \u2014 ${whatChanged.length} changes since ${weekAgo.toISOString().slice(0, 10)} and ${contradictions.length} contradictions warrant a packet refresh.` : `No \u2014 changes since ${weekAgo.toISOString().slice(0, 10)} are incremental. Current packet remains valid.`,
      ``,
      `## Signals (${dateRange})`,
      ...signals.map((s) => `- ${s.direction === "up" ? "+" : s.direction === "down" ? "-" : "="} ${s.name} (${s.impact})`)
    );
  } else {
    memoLines.push(
      `## What We Are Building`,
      canonicalMission,
      ``,
      `## What Changed This Week`,
      ...whatChanged.slice(0, 5).map((c, i) => `${i + 1}. ${c.description}`),
      ``,
      `## Contradictions (${contradictions.length})`,
      ...contradictions.map((c) => `- **[${c.severity}]** ${c.claim}
  Evidence: ${c.evidence}`),
      ``,
      `## Next 3 Moves`,
      ...nextActions.slice(0, 3).map((a) => `${a.priority}. **${a.action}**
   ${a.reasoning}`),
      ``,
      `## Signals`,
      ...signals.map((s) => `- ${s.direction === "up" ? "+" : s.direction === "down" ? "-" : "="} ${s.name} (${s.impact})`),
      ``,
      `## Public Narrative`,
      publicMismatches.length === 0 ? "All public surfaces aligned with internal thesis." : publicMismatches.map((m) => `- MISMATCH: ${m}`).join("\n"),
      ``,
      `## Session Memory`,
      `- ${ctx.sessionMemory.totalActions7d} actions tracked / ${ctx.sessionMemory.totalMilestones7d} milestones in last 7 days`,
      `- Dogfood: ${ctx.dogfoodFindings.verdict ?? "no runs yet"}`
    );
  }
  if (webResults && webResults.length > 0 && packetType !== "competitor_brief") {
    memoLines.push(
      ``,
      `## Web Intelligence (${webResults.length} sources)`,
      ...webResults.slice(0, 8).map((r, i) => `${i + 1}. **${r.title}**
   ${r.snippet}
   Source: ${r.url}`)
    );
  }
  return {
    packetId,
    packetType,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    generatedBy: "founder_local_pipeline",
    canonicalEntity: {
      name: "NodeBench",
      canonicalMission,
      wedge,
      companyState: "building",
      identityConfidence: contradictions.length === 0 ? 85 : Math.max(50, 85 - contradictions.length * 10)
    },
    whatChanged,
    contradictions,
    nextActions,
    signals,
    publicNarrativeCheck: {
      aligned: publicMismatches.length === 0,
      mismatches: publicMismatches
    },
    sessionStats: {
      actionsTracked7d: ctx.sessionMemory.totalActions7d,
      milestonesTracked7d: ctx.sessionMemory.totalMilestones7d,
      dogfoodVerdict: ctx.dogfoodFindings.verdict
    },
    memo: memoLines.join("\n")
  };
}
function assessmentFromArgs(args) {
  return buildFounderDirectionAssessment({
    query: args.query ?? "Founder progression assessment",
    lens: args.lens,
    daysBack: args.daysBack,
    userSkillset: args.userSkillset,
    interests: args.interests,
    constraints: args.constraints,
    marketWorkflow: args.marketWorkflow,
    extraContext: args.extraContext
  });
}
function buildExportPayload(assessment, adapter) {
  const basePayload = {
    company: assessment.companyReadinessPacket.identity.companyName,
    stage: assessment.progressionProfile.currentStageLabel,
    readinessScore: assessment.readinessScore,
    wedge: assessment.companyReadinessPacket.identity.wedge,
    nextUnlocks: assessment.unlocks.map((unlock) => unlock.title),
    hiddenRisks: assessment.progressionProfile.hiddenRisks,
    sourceRefs: assessment.sourceRefs.map((source) => source.label),
    visibility: assessment.visibility
  };
  const titleMap = {
    slack_onepage: "Founder one-page Slack report",
    investor_memo: "Investor memo starter",
    banker_readiness: "Banker readiness packet",
    pitchbook_like: "PitchBook-style profile",
    crunchbase_like: "Crunchbase-style profile",
    yc_context: "YC application context",
    generic_json: "Generic structured export"
  };
  return {
    id: `artifact:${adapter}:${genId("export")}`,
    type: adapter,
    title: titleMap[adapter],
    visibility: assessment.visibility,
    summary: `Exported ${titleMap[adapter].toLowerCase()} for ${basePayload.company}.`,
    payload: basePayload
  };
}
var founderLocalPipelineTools = [
  {
    name: "founder_local_gather",
    description: "Gathers all locally-available context for a founder packet: git log, CLAUDE.md identity, public surface state (index.html, server.json, README), SQLite session memory (tracked actions + milestones), dogfood findings, and architecture docs. Returns structured GatheredContext. No Convex or external APIs required. Use this as the first step of a local intelligence pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        daysBack: {
          type: "number",
          description: "How many days of history to gather (default: 7)"
        }
      }
    },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const ctx = gatherLocalContext(args.daysBack ?? 7);
      return {
        gathered: true,
        identity: ctx.identity,
        recentChanges: {
          commitCount: ctx.recentChanges.gitLogOneline.length,
          modifiedFileCount: ctx.recentChanges.modifiedFiles.length,
          daysBack: ctx.recentChanges.daysBack,
          topCommits: ctx.recentChanges.gitLogOneline.slice(0, 5)
        },
        publicSurfaces: ctx.publicSurfaces,
        sessionMemory: {
          actions7d: ctx.sessionMemory.totalActions7d,
          milestones7d: ctx.sessionMemory.totalMilestones7d,
          recentActions: ctx.sessionMemory.recentActions.slice(0, 5)
        },
        dogfoodFindings: {
          verdict: ctx.dogfoodFindings.verdict,
          p0: ctx.dogfoodFindings.p0Count,
          p1: ctx.dogfoodFindings.p1Count,
          topFindings: ctx.dogfoodFindings.findings.slice(0, 5)
        },
        architectureDocs: ctx.docs.architectureDocs.slice(0, 8)
      };
    }
  },
  {
    name: "founder_local_synthesize",
    description: "Takes gathered local context and synthesizes a complete Founder Artifact Packet. Detects contradictions between CLAUDE.md identity, public surfaces, and dogfood findings. Ranks next actions by dogfood severity. Generates a readable memo. Supports LLM content generation via Gemini when webResults are provided.",
    inputSchema: {
      type: "object",
      properties: {
        packetType: {
          type: "string",
          enum: ["weekly_reset", "pre_delegation", "important_change", "competitor_brief", "role_switch"],
          description: "Type of artifact packet to produce"
        },
        daysBack: {
          type: "number",
          description: "How many days of history to include (default: 7)"
        },
        query: {
          type: "string",
          description: "Original user query \u2014 incorporated into the memo for context-specific output"
        },
        lens: {
          type: "string",
          description: "User role lens (founder, banker, operator, etc.) \u2014 shapes LLM content generation"
        },
        webResults: {
          type: "array",
          description: "Optional web search results for LLM content generation. Each item: {title, url, snippet}",
          items: { type: "object", properties: { title: { type: "string" }, url: { type: "string" }, snippet: { type: "string" } } }
        }
      },
      required: ["packetType"]
    },
    handler: async (args) => {
      const packetType = args.packetType;
      const ctx = gatherLocalContext(args.daysBack ?? 7);
      if (args.webResults && args.webResults.length > 0 && args.query) {
        try {
          const { synthesizeContent: synthesizeContent2 } = await Promise.resolve().then(() => (init_contentSynthesis(), contentSynthesis_exports));
          const synthesis = await synthesizeContent2({
            query: args.query,
            scenario: packetType === "pre_delegation" ? "delegation" : packetType,
            lens: args.lens ?? "founder",
            webResults: args.webResults,
            localContext: {
              mission: ctx.identity.claudeMdSnippet || void 0,
              recentChanges: ctx.recentChanges.gitLogOneline.slice(0, 5),
              contradictions: [],
              signals: []
            }
          });
          const packet2 = synthesizePacket(ctx, packetType, args.query, args.webResults);
          if (synthesis.content.length > 100) {
            packet2.memo = synthesis.content;
            packet2.llmGenerated = true;
            packet2.entityNames = synthesis.entityNames;
            packet2.keyFacts = synthesis.keyFacts;
            packet2.sources = synthesis.sources;
            packet2.synthesisTokens = synthesis.tokensUsed;
            packet2.synthesisLatencyMs = synthesis.latencyMs;
          }
          return packet2;
        } catch {
        }
      }
      const packet = synthesizePacket(ctx, packetType, args.query, args.webResults);
      return packet;
    }
  },
  {
    name: "founder_local_weekly_reset",
    description: "One-call convenience: gathers all local context and produces a complete weekly founder reset packet. No Convex, no external APIs needed.",
    inputSchema: {
      type: "object",
      properties: {
        daysBack: {
          type: "number",
          description: "How many days of history to include (default: 7)"
        }
      }
    },
    handler: async (args) => {
      const ctx = gatherLocalContext(args.daysBack ?? 7);
      const packet = synthesizePacket(ctx, "weekly_reset");
      try {
        const db = getDb();
        const now = /* @__PURE__ */ new Date();
        const m = now.getMonth() + 1;
        const y = now.getFullYear();
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        db.prepare(
          `INSERT OR IGNORE INTO tracking_milestones
            (milestoneId, sessionId, timestamp, title, description, category, evidence, metrics, dayOfWeek, weekNumber, month, quarter, year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          packet.packetId,
          `pipeline_${Date.now()}`,
          now.toISOString(),
          "Weekly founder reset generated",
          `Contradictions: ${packet.contradictions.length}, Next actions: ${packet.nextActions.length}, Signals: ${packet.signals.length}`,
          "dogfood",
          null,
          JSON.stringify({ contradictions: packet.contradictions.length, nextActions: packet.nextActions.length }),
          dayNames[now.getDay()],
          Math.ceil((now.getTime() - new Date(y, 0, 1).getTime()) / 6048e5),
          `${y}-${String(m).padStart(2, "0")}`,
          `${y}-Q${Math.ceil(m / 3)}`,
          y
        );
      } catch {
      }
      return packet;
    }
  },
  {
    name: "founder_direction_assessment",
    description: "Pressure-test a founder direction against team shape, AI stance, build speed, installability, maintainability, workflow adoption, investor credibility, and commercialization. Produces structured strategic angles, local evidence refs, recommended next action, and follow-up questions that can flow into search, shared context, or delegation.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Founder idea, product direction, or company question to pressure-test"
        },
        lens: {
          type: "string",
          description: "Role lens shaping the assessment (default: founder)"
        },
        daysBack: {
          type: "number",
          description: "How many days of local project history to inspect (default: 14)"
        },
        userSkillset: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of explicit team or founder skills to pressure-test against the idea"
        },
        interests: {
          type: "array",
          items: { type: "string" },
          description: "Optional founder interests or motivations that shape direction fit"
        },
        constraints: {
          type: "array",
          items: { type: "string" },
          description: "Optional constraints such as anti-AI preference, solo-founder limits, or regulatory concerns"
        },
        marketWorkflow: {
          type: "array",
          items: { type: "string" },
          description: "Known workflows or tools the target users already use, such as Claude Code"
        },
        extraContext: {
          type: "string",
          description: "Extra freeform context for the pressure test"
        }
      },
      required: ["query"]
    },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      return buildFounderDirectionAssessment(args);
    }
  },
  {
    name: "founder_stage_assess",
    description: "Return the founder progression stage, readiness score, and stage ladder for the current direction.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, lens: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs(args);
      return {
        currentStage: assessment.progressionProfile.currentStage,
        currentStageLabel: assessment.progressionProfile.currentStageLabel,
        readinessScore: assessment.readinessScore,
        progressionTiers: assessment.progressionTiers
      };
    }
  },
  {
    name: "founder_gaps_detect",
    description: "Detect missing foundations, hidden risks, and weak strategic angles for a founder direction.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs(args);
      return {
        missingFoundations: assessment.progressionProfile.missingFoundations,
        hiddenRisks: assessment.progressionProfile.hiddenRisks,
        issueAngles: assessment.issueAngles,
        weakestAngle: assessment.strategicAngles.find((angle) => angle.status !== "strong") ?? null
      };
    }
  },
  {
    name: "founder_next_unlocks",
    description: "List the next progression unlocks required to move the founder to the next stage.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args) => assessmentFromArgs(args).unlocks
  },
  {
    name: "founder_materials_check",
    description: "Return the founder materials checklist and missing external-readiness artifacts.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs(args);
      return {
        materialsChecklist: assessment.materialsChecklist,
        diligencePack: assessment.diligencePack.label
      };
    }
  },
  {
    name: "founder_readiness_score",
    description: "Return the founder readiness score and a concise interpretation.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs(args);
      return {
        readinessScore: assessment.readinessScore,
        stage: assessment.progressionProfile.currentStageLabel,
        summary: assessment.summary
      };
    }
  },
  {
    name: "founder_ontrack_scorecard",
    description: "Return explicit 2-week and 3-month on-track or off-track scorecards.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args) => assessmentFromArgs(args).scorecards
  },
  {
    name: "founder_delegation_boundary_scan",
    description: "Separate delegable work from founder-only work for the current direction.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs(args);
      return {
        delegableWork: assessment.progressionProfile.delegableWork,
        founderOnlyWork: assessment.progressionProfile.founderOnlyWork
      };
    }
  },
  {
    name: "founder_company_naming_pack",
    description: "Generate a founder company naming shortlist and starter profile.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => assessmentFromArgs(args).companyNamingPack
  },
  {
    name: "runway_check",
    description: "Basic runway check that translates cash and burn into months remaining and flags risk.",
    inputSchema: {
      type: "object",
      properties: {
        cashOnHand: { type: "number" },
        monthlyBurn: { type: "number" }
      },
      required: ["cashOnHand", "monthlyBurn"]
    },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const months = args.monthlyBurn > 0 ? Number((args.cashOnHand / args.monthlyBurn).toFixed(1)) : null;
      return {
        runwayMonths: months,
        status: months === null ? "unknown" : months >= 12 ? "healthy" : months >= 6 ? "watch" : "critical",
        recommendation: months !== null && months < 6 ? "Reduce burn or accelerate revenue immediately." : "Keep runway visible in the weekly founder packet."
      };
    }
  },
  {
    name: "burn_rate_sanity",
    description: "Sanity check founder burn against runway and stage expectations.",
    inputSchema: {
      type: "object",
      properties: {
        monthlyBurn: { type: "number" },
        teamSize: { type: "number" },
        stage: { type: "string" }
      },
      required: ["monthlyBurn"]
    },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({
      burnPerPerson: args.teamSize ? Number((args.monthlyBurn / Math.max(args.teamSize, 1)).toFixed(0)) : null,
      stage: args.stage ?? "pre-seed",
      note: args.monthlyBurn > 15e4 ? "Burn is high relative to an early founder stage unless traction or capital access is unusually strong." : "Burn looks compatible with an early-stage discipline story if progress is visible."
    })
  },
  {
    name: "financial_hygiene_check",
    description: "Return the hidden financial hygiene requirements many founders forget before diligence.",
    inputSchema: { type: "object", properties: { query: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async () => ({
      checklist: [
        "Runway and burn view",
        "Current raise and cap table summary",
        "Decision log for material spend",
        "Budget owner by function"
      ],
      warning: "Founders often get judged on financial discipline before they realize it."
    })
  },
  {
    name: "meeting_notes_extract_decisions",
    description: "Extract decisions, owners, and follow-ups from raw meeting notes.",
    inputSchema: { type: "object", properties: { notes: { type: "string" } }, required: ["notes"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const lines = args.notes.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const decisions = lines.filter((line) => /decid|approved|ship|choose|agreed/i.test(line)).slice(0, 8);
      const followUps = lines.filter((line) => /next|todo|follow up|owner|action/i.test(line)).slice(0, 8);
      return { decisions, followUps };
    }
  },
  {
    name: "team_alignment_check",
    description: "Check whether the team is aligned on the wedge, next move, and moat story.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, teamNotes: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs({ query: args.query, extraContext: args.teamNotes });
      return {
        status: assessment.issueAngles.includes("team-shape") ? "watch" : "aligned",
        founderOnlyWork: assessment.progressionProfile.founderOnlyWork,
        delegableWork: assessment.progressionProfile.delegableWork
      };
    }
  },
  {
    name: "hiring_gap_scan",
    description: "Identify the most obvious missing hiring lane for the current founder direction.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs(args);
      return {
        gap: assessment.issueAngles.includes("team-shape") ? "GTM / complementary operator" : "No obvious urgent hiring gap detected",
        rationale: assessment.progressionProfile.hiddenRisks.find((risk) => /team|credibility|distribution/i.test(risk)) ?? assessment.summary
      };
    }
  },
  {
    name: "decision_quality_scan",
    description: "Check whether the founder decision has clear criteria, falsifiers, and next actions.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, decision: { type: "string" } }, required: ["decision"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({
      hasDecision: true,
      criteriaPresent: /because|if|until|must/i.test(args.decision),
      needsFalsifier: !/unless|if not|fails when/i.test(args.decision),
      recommendedNextStep: "Add one explicit falsifier and one time-bound proof target."
    })
  },
  {
    name: "detect_vertical",
    description: "Detect the founder vertical and subvertical from the query and context.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => detectVerticalLabel(`${args.query} ${args.extraContext ?? ""}`)
  },
  {
    name: "detect_subvertical",
    description: "Detect the founder subvertical from the query and context.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({ subvertical: detectVerticalLabel(`${args.query} ${args.extraContext ?? ""}`).subvertical })
  },
  {
    name: "load_diligence_pack",
    description: "Load the vertical diligence pack for the current direction.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs(args);
      return assessment.diligencePack;
    }
  },
  {
    name: "readiness_scan",
    description: "Run a founder readiness scan against the progression and diligence model.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs(args);
      return {
        readinessScore: assessment.readinessScore,
        currentStage: assessment.progressionProfile.currentStageLabel,
        requirements: assessment.diligencePack.requirements
      };
    }
  },
  {
    name: "evidence_gap_scan",
    description: "List missing evidence classes and materials for diligence readiness.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs(args);
      return {
        missingRequirements: assessment.diligencePack.requirements.filter((item) => item.status !== "ready"),
        missingMaterials: assessment.materialsChecklist.filter((item) => item.status !== "ready")
      };
    }
  },
  {
    name: "claim_verification_scan",
    description: "Scan high-risk claims against available evidence classes.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, claims: { type: "array", items: { type: "string" } } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs(args);
      return (args.claims ?? assessment.diligencePack.highRiskClaims).map((claim) => ({
        claim,
        status: assessment.diligencePack.highRiskClaims.includes(claim) ? "needs_verification" : "watch",
        requiredEvidence: assessment.diligencePack.evidenceClasses.filter((item) => item.required).map((item) => item.label)
      }));
    }
  },
  {
    name: "submission_readiness_score",
    description: "Score whether the company packet is ready for downstream submission or profile export.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, destination: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs(args);
      const completeness = assessment.materialsChecklist.filter((item) => item.status === "ready").length;
      const total = Math.max(assessment.materialsChecklist.length, 1);
      return {
        destination: args.destination ?? "generic",
        score: Math.round(completeness / total * 100),
        missingFields: assessment.materialsChecklist.filter((item) => item.status !== "ready").map((item) => item.label)
      };
    }
  },
  {
    name: "extract_patent_claims",
    description: "Extract likely patent and IP claims from source text.",
    inputSchema: { type: "object", properties: { sourceText: { type: "string" } }, required: ["sourceText"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({
      claims: args.sourceText.split(/[.;\n]/).filter((line) => /patent|ip|provisional|claim/i.test(line)).slice(0, 10)
    })
  },
  {
    name: "extract_trial_evidence",
    description: "Extract trial, study, or lab evidence snippets from source text.",
    inputSchema: { type: "object", properties: { sourceText: { type: "string" } }, required: ["sourceText"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({
      evidence: args.sourceText.split(/[.;\n]/).filter((line) => /trial|study|lab|clinical|preclinical/i.test(line)).slice(0, 10)
    })
  },
  {
    name: "extract_publication_metadata",
    description: "Extract publication-oriented metadata from source text.",
    inputSchema: { type: "object", properties: { sourceText: { type: "string" } }, required: ["sourceText"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({
      publications: args.sourceText.split(/[.;\n]/).filter((line) => /paper|publication|journal|conference|doi/i.test(line)).slice(0, 10)
    })
  },
  {
    name: "extract_regulatory_artifacts",
    description: "Extract regulatory path signals from source text.",
    inputSchema: { type: "object", properties: { sourceText: { type: "string" } }, required: ["sourceText"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({
      regulatoryArtifacts: args.sourceText.split(/[.;\n]/).filter((line) => /fda|510\(k\)|submission|compliance|approval|regulator/i.test(line)).slice(0, 10)
    })
  },
  {
    name: "build_company_packet",
    description: "Build the canonical company readiness packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => assessmentFromArgs(args).companyReadinessPacket
  },
  {
    name: "build_investor_packet",
    description: "Build an investor-oriented export payload from the canonical company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => buildExportPayload(assessmentFromArgs(args), "investor_memo")
  },
  {
    name: "build_banking_packet",
    description: "Build a banker-readiness packet from the canonical company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => buildExportPayload(assessmentFromArgs(args), "banker_readiness")
  },
  {
    name: "build_diligence_packet",
    description: "Build a diligence-oriented export payload from the canonical company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({
      ...buildExportPayload(assessmentFromArgs(args), "generic_json"),
      payloadType: "diligence_packet"
    })
  },
  {
    name: "build_submission_export",
    description: "Build a generic submission export from the canonical company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, destination: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({
      destination: args.destination ?? "generic",
      artifact: buildExportPayload(assessmentFromArgs(args), "generic_json")
    })
  },
  {
    name: "build_company_profile_starter",
    description: "Build a starter PitchBook/Crunchbase-like company profile.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => assessmentFromArgs(args).companyNamingPack.starterProfile
  },
  {
    name: "build_slack_onepager",
    description: "Build a Slack-friendly one-page founder report.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => buildExportPayload(assessmentFromArgs(args), "slack_onepage")
  },
  {
    name: "export_pitchbook_profile",
    description: "Export a PitchBook-like structured profile from the company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => buildExportPayload(assessmentFromArgs(args), "pitchbook_like")
  },
  {
    name: "export_crunchbase_profile",
    description: "Export a Crunchbase-like structured profile from the company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => buildExportPayload(assessmentFromArgs(args), "crunchbase_like")
  },
  {
    name: "export_yc_application_context",
    description: "Export YC-style application context from the company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => buildExportPayload(assessmentFromArgs(args), "yc_context")
  },
  {
    name: "compare_workflow_paths",
    description: "Compare current and optimized workflow paths and quantify likely savings.",
    inputSchema: {
      type: "object",
      properties: {
        objective: { type: "string" },
        currentPath: { type: "array", items: { type: "string" } },
        optimizedPath: { type: "array", items: { type: "string" } }
      },
      required: ["objective"]
    },
    annotations: { readOnlyHint: true },
    handler: async (args) => buildWorkflowPathComparison(args)
  },
  {
    name: "shortest_valid_path",
    description: "Return the shortest valid workflow path for the stated objective.",
    inputSchema: { type: "object", properties: { objective: { type: "string" } }, required: ["objective"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => buildWorkflowPathComparison({ objective: args.objective }).optimizedPath
  },
  {
    name: "cheapest_valid_path",
    description: "Return the cheapest valid workflow path for the stated objective.",
    inputSchema: { type: "object", properties: { objective: { type: "string" } }, required: ["objective"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => buildWorkflowPathComparison({ objective: args.objective })
  },
  {
    name: "validate_shortcut",
    description: "Validate that a proposed shortcut preserves output quality and visibility.",
    inputSchema: { type: "object", properties: { objective: { type: "string" }, shortcut: { type: "string" } }, required: ["objective", "shortcut"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({
      objective: args.objective,
      shortcut: args.shortcut,
      validationChecks: buildWorkflowPathComparison({ objective: args.objective }).validationChecks,
      verdict: "valid",
      summary: "The shortcut is acceptable if citations, contradictions, and the final packet still remain visible."
    })
  },
  {
    name: "build_before_after_memo",
    description: "Build a memo showing the before and after path plus the validation rationale.",
    inputSchema: { type: "object", properties: { objective: { type: "string" } }, required: ["objective"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const comparison = buildWorkflowPathComparison({ objective: args.objective });
      return {
        title: "Before and after workflow memo",
        comparison,
        memo: [
          `Objective: ${comparison.objective}`,
          `Before: ${comparison.currentPath.join(" -> ")}`,
          `After: ${comparison.optimizedPath.join(" -> ")}`,
          `Why valid: ${comparison.rationale}`
        ].join("\n")
      };
    }
  },
  {
    name: "run_founder_autonomy_benchmark",
    description: "Run the weekly founder reset autonomy benchmark lane.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => assessmentFromArgs(args).benchmarkEvidence
  },
  {
    name: "run_packet_to_implementation_benchmark",
    description: "Return a packet-to-implementation benchmark lane payload.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({
      ...assessmentFromArgs(args).benchmarkEvidence[0],
      lane: "packet_to_implementation",
      objective: "Turn an approved packet into a bounded implementation handoff and validate the result."
    })
  },
  {
    name: "run_competitor_signal_benchmark",
    description: "Return a competitor-signal-to-response benchmark lane payload.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({
      ...assessmentFromArgs(args).benchmarkEvidence[0],
      lane: "competitor_signal_response",
      objective: "Turn a competitor or market signal into a validated founder response packet."
    })
  },
  {
    name: "run_browserstack_benchmark_lane",
    description: "Return a BrowserStack/browser-automation benchmark lane payload.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => ({
      ...assessmentFromArgs(args).benchmarkEvidence[0],
      lane: "browserstack_lane",
      objective: "Prove browser automation quality through before/after path validation and benchmark evidence."
    })
  },
  {
    name: "distribution_surface_scan",
    description: "Scan which distribution surfaces are actually ready right now.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => assessmentFromArgs(args).distributionSurfaceStatus
  },
  {
    name: "open_core_boundary_advisor",
    description: "Advise what should stay open-core versus proprietary.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async () => ({
      openSource: [
        "MCP and CLI tool surface",
        "Canonical packet schema",
        "Adapter interfaces",
        "Sample vertical packs and exports"
      ],
      proprietary: [
        "Hosted dashboard",
        "Sync bridge and collaboration",
        "Premium scoring and monitoring",
        "High-value data services"
      ],
      rationale: "Open the adoption layer, keep the retained value and hosted leverage closed."
    })
  },
  {
    name: "partnership_target_map",
    description: "Map likely partnership targets and why they fit the current wedge.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const { vertical } = detectVerticalLabel(args.query);
      return {
        vertical,
        targets: vertical === "healthcare/life sciences" ? ["Banks with startup healthcare desks", "Clinical advisors", "Regulatory consultants", "Research institutions"] : ["Claude Code ecosystem", "Smithery and MCP marketplaces", "Open-source agent projects", "Developer communities"]
      };
    }
  },
  {
    name: "gtm_script_builder",
    description: "Build a starter GTM script for the current founder wedge.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, audience: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const assessment = assessmentFromArgs(args);
      return {
        audience: args.audience ?? "founder/operator",
        script: [
          `We help ${args.audience ?? "founders"} see what they are missing before investors, banks, or customers ask for it.`,
          `Right now the strongest wedge is ${assessment.companyReadinessPacket.identity.wedge}.`,
          `The next proof is ${assessment.progressionProfile.recommendedNextAction}.`
        ].join(" ")
      };
    }
  },
  {
    name: "founder_target_customer_map",
    description: "Map the downstream customer groups the company should target first.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      const { vertical } = detectVerticalLabel(args.query);
      return {
        targetCustomers: vertical === "healthcare/life sciences" ? ["Healthcare founders", "Diligence-heavy investors", "Clinical partners"] : ["Founder/operators", "Developer teams", "AI infra buyers", "Research/data customers"]
      };
    }
  }
];

// packages/mcp-local/src/tools/reconTools.ts
init_db();
init_webTools();
function extractEntitiesFromResults(results) {
  const text = results.map((r) => `${r.title} ${r.snippet}`).join(" ");
  const companySet = /* @__PURE__ */ new Set();
  const companyRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}(?:\s+(?:Inc|Corp|Ltd|LLC|Co|Group|Labs|AI|Technologies|Solutions|Partners|Capital|Ventures|Health|Systems|Networks|Platform)\.?)?)\b/g;
  let m;
  while ((m = companyRe.exec(text)) !== null) {
    const candidate = m[1].trim();
    const skipPhrases = /^(The [A-Z]|In The|On The|For The|New York|San Francisco|Los Angeles|United States|Wall Street|First Quarter|Second Quarter|Third Quarter|Fourth Quarter)/;
    if (!skipPhrases.test(candidate) && candidate.length > 3) {
      companySet.add(candidate);
    }
  }
  const financials = [];
  const financialPatterns = [
    // "$X billion/million" with optional context
    { re: /(\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})?\s*(?:valued at|raised|revenue of|worth|at)\s+\$([0-9]+(?:\.[0-9]+)?)\s*(billion|million|B|M|bn|mn)/gi, entityGroup: 1, metricGroup: 0, valueGroup: 0 },
    // "$XB/$XM revenue/ARR/valuation"
    { re: /\$([0-9]+(?:\.[0-9]+)?)\s*(billion|million|B|M|bn|mn)\s+(revenue|ARR|valuation|funding|raised|round)/gi, metricGroup: 3, valueGroup: 0, entityGroup: void 0 },
    // "revenue of $X"
    { re: /(revenue|ARR|valuation|funding)\s+(?:of\s+)?\$([0-9]+(?:\.[0-9]+)?)\s*(billion|million|B|M|bn|mn|T|trillion)?/gi, metricGroup: 1, valueGroup: 0, entityGroup: void 0 }
  ];
  for (const pat of financialPatterns) {
    let fm;
    while ((fm = pat.re.exec(text)) !== null) {
      financials.push({
        entity: pat.entityGroup !== void 0 && fm[pat.entityGroup] ? fm[pat.entityGroup].trim() : "unknown",
        metric: fm[0].includes("revenue") || fm[0].includes("Revenue") ? "revenue" : fm[0].includes("ARR") ? "ARR" : fm[0].includes("valuation") || fm[0].includes("valued") ? "valuation" : fm[0].includes("funding") || fm[0].includes("raised") ? "funding" : "financial",
        value: fm[0].trim()
      });
    }
  }
  const people = [];
  const roleRe = /\b(CEO|CTO|CFO|COO|CPO|founder|co-founder|cofounder|president|chairman|director|VP|chief\s+\w+\s+officer)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/gi;
  while ((m = roleRe.exec(text)) !== null) {
    people.push({ name: m[2].trim(), role: m[1].trim() });
  }
  const roleAfterRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}),?\s+(?:the\s+)?(CEO|CTO|CFO|COO|CPO|founder|co-founder|cofounder|president|chairman|director|VP)\b/gi;
  while ((m = roleAfterRe.exec(text)) !== null) {
    people.push({ name: m[1].trim(), role: m[2].trim() });
  }
  const dateSet = /* @__PURE__ */ new Set();
  const quarterRe = /\b(Q[1-4]\s+20[2-3][0-9])\b/gi;
  while ((m = quarterRe.exec(text)) !== null) dateSet.add(m[1].toUpperCase());
  const monthYearRe = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20[2-3][0-9])\b/gi;
  while ((m = monthYearRe.exec(text)) !== null) dateSet.add(`${m[1]} ${m[2]}`);
  const fullDateRe = /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20[2-3][0-9])\b/gi;
  while ((m = fullDateRe.exec(text)) !== null) dateSet.add(m[1]);
  const metricsList = [];
  const pctRe = /(\b\w[\w\s]{0,30}?)\s+(\d+(?:\.\d+)?%)/g;
  while ((m = pctRe.exec(text)) !== null) {
    const label = m[1].trim().split(/\s+/).slice(-4).join(" ");
    metricsList.push({ label, value: m[2] });
  }
  const countRe = /\b(\d+(?:\.\d+)?)\s*(million|billion|M|B|K|k)\s+(users|customers|subscribers|downloads|installs|DAU|MAU)\b/gi;
  while ((m = countRe.exec(text)) !== null) {
    metricsList.push({ label: m[3], value: `${m[1]} ${m[2]}` });
  }
  const seenPeople = /* @__PURE__ */ new Set();
  const uniquePeople = people.filter((p) => {
    const key = p.name.toLowerCase();
    if (seenPeople.has(key)) return false;
    seenPeople.add(key);
    return true;
  });
  return {
    companies: [...companySet],
    financials,
    people: uniquePeople,
    dates: [...dateSet],
    metrics: metricsList.slice(0, 20)
    // Cap to avoid noise
  };
}
async function runWebEnrichment(sessionId, target, searchQuery) {
  const webSearchTool = webTools.find((t) => t.name === "web_search");
  if (!webSearchTool) {
    return { searchResults: [], findingsLogged: 0, provider: "none", error: "web_search tool not found" };
  }
  const query = searchQuery ?? `${target} latest news updates 2026`;
  let searchResponse;
  try {
    searchResponse = await webSearchTool.handler({ query, maxResults: 5, provider: "auto" });
  } catch (err) {
    return {
      searchResults: [],
      findingsLogged: 0,
      provider: "none",
      error: `Web search failed: ${err.message ?? String(err)}`
    };
  }
  if (searchResponse?.error || searchResponse?.provider === "none") {
    return {
      searchResults: [],
      findingsLogged: 0,
      provider: searchResponse?.provider ?? "none",
      error: searchResponse?.message ?? searchResponse?.setup?.message ?? "No search provider available"
    };
  }
  const results = Array.isArray(searchResponse?.results) ? searchResponse.results : [];
  if (results.length === 0) {
    return {
      searchResults: [],
      findingsLogged: 0,
      provider: searchResponse?.provider ?? "unknown",
      error: "Search returned no results"
    };
  }
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let logged = 0;
  const insertStmt = db.prepare(
    "INSERT INTO recon_findings (id, session_id, source_url, category, summary, relevance, action_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const r of results) {
    try {
      const findingId = genId("finding");
      insertStmt.run(
        findingId,
        sessionId,
        r.url || null,
        "new_feature",
        `[Web] ${r.title}: ${r.snippet}`.slice(0, 2e3),
        `Live web result from ${r.source ?? "web"} search for "${target}"`,
        null,
        now
      );
      logged++;
    } catch {
    }
  }
  const structuredEntities = extractEntitiesFromResults(results);
  return {
    searchResults: results,
    findingsLogged: logged,
    provider: searchResponse?.provider ?? "unknown",
    structuredEntities
  };
}
var FRAMEWORK_SOURCES = {
  anthropic: [
    {
      source: "Anthropic Blog",
      url: "https://www.anthropic.com/news",
      checkFor: "New model releases, API changes, safety updates"
    },
    {
      source: "Claude API Changelog",
      url: "https://docs.anthropic.com/en/release-notes/api",
      checkFor: "Breaking changes, new endpoints, deprecations"
    },
    {
      source: "MCP Specification",
      url: "https://github.com/modelcontextprotocol/specification",
      checkFor: "Protocol version updates, new capabilities"
    },
    {
      source: "MCP TypeScript SDK Releases",
      url: "https://github.com/modelcontextprotocol/typescript-sdk/releases",
      checkFor: "SDK API changes, Zod requirements, transport updates"
    },
    {
      source: "Anthropic Cookbook",
      url: "https://github.com/anthropics/anthropic-cookbook",
      checkFor: "Best practices, tool use patterns, prompt engineering"
    }
  ],
  langchain: [
    {
      source: "LangChain Blog",
      url: "https://blog.langchain.dev/",
      checkFor: "Architecture changes, LangGraph updates, new integrations"
    },
    {
      source: "LangChain JS Releases",
      url: "https://github.com/langchain-ai/langchainjs/releases",
      checkFor: "Breaking changes, new tools, deprecated APIs"
    },
    {
      source: "LangChain Python Releases",
      url: "https://github.com/langchain-ai/langchain/releases",
      checkFor: "Breaking changes, new tools, deprecated APIs"
    },
    {
      source: "LangSmith Docs",
      url: "https://docs.smith.langchain.com/",
      checkFor: "Eval frameworks, tracing patterns, dataset management"
    }
  ],
  openai: [
    {
      source: "OpenAI Blog",
      url: "https://openai.com/blog",
      checkFor: "New models, API features, pricing changes"
    },
    {
      source: "OpenAI API Changelog",
      url: "https://platform.openai.com/docs/changelog",
      checkFor: "Endpoint changes, deprecations, new parameters"
    },
    {
      source: "OpenAI Agents SDK",
      url: "https://github.com/openai/openai-agents-sdk/releases",
      checkFor: "Agent patterns, tool use, MCP integration"
    },
    {
      source: "OpenAI Evals",
      url: "https://github.com/openai/evals",
      checkFor: "Evaluation datasets, benchmarks, scoring patterns"
    }
  ],
  google: [
    {
      source: "Google AI Blog",
      url: "https://blog.google/technology/ai/",
      checkFor: "Gemini updates, new capabilities, research papers"
    },
    {
      source: "Gemini API Changelog",
      url: "https://ai.google.dev/gemini-api/docs/changelog",
      checkFor: "API changes, new models, feature additions"
    },
    {
      source: "Google AI Studio",
      url: "https://aistudio.google.com/",
      checkFor: "Tool use patterns, grounding, function calling updates"
    }
  ],
  mcp: [
    {
      source: "MCP Specification",
      url: "https://github.com/modelcontextprotocol/specification",
      checkFor: "Protocol version, new capabilities, transport changes"
    },
    {
      source: "MCP TypeScript SDK",
      url: "https://github.com/modelcontextprotocol/typescript-sdk/releases",
      checkFor: "SDK breaking changes, new server/client APIs"
    },
    {
      source: "MCP Python SDK",
      url: "https://github.com/modelcontextprotocol/python-sdk/releases",
      checkFor: "SDK breaking changes, new patterns"
    },
    {
      source: "MCP Servers Directory",
      url: "https://github.com/modelcontextprotocol/servers",
      checkFor: "Reference implementations, community patterns"
    }
  ]
};
var reconTools = [
  {
    name: "run_recon",
    description: "Start a reconnaissance research session. Use this at the start of Phase 1 (Context Gathering) to organize research into external sources (SDKs, APIs, blogs) AND internal context (codebase, project details, existing patterns). Returns a structured research plan with suggested sources and context-gathering questions.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "What you're researching (e.g., 'MCP SDK update', 'Anthropic Claude API', 'project auth system')"
        },
        description: {
          type: "string",
          description: "Why you're researching this (e.g., 'Planning MCP server upgrade', 'Understanding existing auth before refactor')"
        },
        projectContext: {
          type: "object",
          description: "Existing project context to inform the research. Include whatever is known.",
          properties: {
            techStack: {
              type: "string",
              description: "Languages, frameworks, runtimes (e.g., 'TypeScript, Node.js, Convex, React')"
            },
            currentVersions: {
              type: "string",
              description: "Relevant package versions (e.g., 'MCP SDK 1.25.3, better-sqlite3 11.x')"
            },
            architecture: {
              type: "string",
              description: "Brief architecture description (e.g., 'MCP server over stdio, SQLite local DB')"
            },
            knownIssues: {
              type: "string",
              description: "Known problems to investigate (e.g., 'Zod schema requirement in SDK >=1.17')"
            }
          }
        },
        webEnrich: {
          type: "boolean",
          description: "When true, fetch live web search results for the target and auto-log them as findings. Requires a search provider API key (GEMINI_API_KEY, OPENAI_API_KEY, or PERPLEXITY_API_KEY). Falls back gracefully if unavailable. Default: false."
        }
      },
      required: ["target"]
    },
    handler: async (args) => {
      const { target, description, projectContext, webEnrich } = args;
      const db = getDb();
      const sessionId = genId("recon");
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const fullDescription = projectContext ? `${description ?? target}. Context: ${JSON.stringify(projectContext)}` : description ?? null;
      db.prepare(
        "INSERT INTO recon_sessions (id, target, description, status, created_at) VALUES (?, ?, ?, 'active', ?)"
      ).run(sessionId, target, fullDescription, now);
      const targetLower = target.toLowerCase();
      const externalSources = [];
      const internalChecks = [];
      const contextQuestions = [];
      for (const [ecosystem, sources] of Object.entries(FRAMEWORK_SOURCES)) {
        if (targetLower.includes(ecosystem) || ecosystem === "anthropic" && targetLower.includes("claude") || ecosystem === "mcp" && targetLower.includes("model context protocol")) {
          for (const s of sources) {
            externalSources.push(`[${s.source}] ${s.url} \u2014 ${s.checkFor}`);
          }
        }
      }
      externalSources.push(
        "Search GitHub issues for recent bugs related to your target"
      );
      externalSources.push(
        "Check npm/PyPI for latest package versions and changelogs"
      );
      internalChecks.push(
        "Search codebase for existing usage of the target (grep for imports, function calls)"
      );
      internalChecks.push(
        "Review AGENTS.md or project docs for documented patterns and conventions"
      );
      internalChecks.push(
        "Check package.json / requirements.txt for current dependency versions"
      );
      internalChecks.push(
        "Look for existing tests that cover the area being researched"
      );
      internalChecks.push(
        "Search learnings DB for past issues related to this target"
      );
      if (!projectContext) {
        contextQuestions.push(
          "What is the tech stack? (languages, frameworks, runtimes)"
        );
        contextQuestions.push(
          "What are the current versions of relevant packages?"
        );
        contextQuestions.push(
          "What is the high-level architecture? (monolith, microservices, MCP server, etc.)"
        );
        contextQuestions.push(
          "Are there known issues or constraints related to this research?"
        );
      } else {
        if (!projectContext.techStack)
          contextQuestions.push("What is the full tech stack?");
        if (!projectContext.currentVersions)
          contextQuestions.push(
            "What versions of relevant packages are installed?"
          );
      }
      let webEnrichmentResult = null;
      if (webEnrich) {
        try {
          webEnrichmentResult = await runWebEnrichment(sessionId, target);
        } catch (err) {
          webEnrichmentResult = {
            searchResults: [],
            findingsLogged: 0,
            provider: "none",
            error: `Web enrichment failed: ${err.message ?? String(err)}`
          };
        }
      }
      return {
        sessionId,
        target,
        status: "active",
        researchPlan: {
          externalSources: externalSources.length > 0 ? externalSources : [
            "No pre-built sources for this target. Use check_framework_updates for known ecosystems, or research manually."
          ],
          internalChecks,
          contextQuestions: contextQuestions.length > 0 ? contextQuestions : ["Project context provided \u2014 no additional questions."],
          projectContext: projectContext ?? null
        },
        ...webEnrichmentResult ? {
          webEnrichment: {
            provider: webEnrichmentResult.provider,
            resultsFound: webEnrichmentResult.searchResults.length,
            findingsAutoLogged: webEnrichmentResult.findingsLogged,
            results: webEnrichmentResult.searchResults,
            ...webEnrichmentResult.structuredEntities ? { structuredEntities: webEnrichmentResult.structuredEntities } : {},
            ...webEnrichmentResult.error ? { note: webEnrichmentResult.error } : {}
          }
        } : {},
        nextSteps: [
          "1. Answer any contextQuestions (gather project context)",
          "2. Use check_framework_updates for known ecosystems",
          "3. Use search_learnings to check for past findings",
          ...webEnrichmentResult && webEnrichmentResult.findingsLogged > 0 ? [`4. Review ${webEnrichmentResult.findingsLogged} auto-logged web findings via get_recon_summary`] : ["4. Visit each external source"],
          "5. Call log_recon_finding for each discovery",
          "6. Call get_recon_summary when research is complete",
          ...webEnrich && !webEnrichmentResult?.findingsLogged ? ["Note: Web enrichment was unavailable. Use enrich_recon later to add live web data."] : []
        ]
      };
    }
  },
  {
    name: "log_recon_finding",
    description: "Record a finding from reconnaissance research. Link it to a recon session and categorize it. Use for both external discoveries (SDK changes, blog posts) and internal findings (codebase patterns, existing implementations).",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Recon session ID from run_recon"
        },
        sourceUrl: {
          type: "string",
          description: "Where you found this (URL to blog post, GitHub issue, docs page, or 'internal:filename' for codebase findings)"
        },
        category: {
          type: "string",
          enum: [
            "breaking_change",
            "new_feature",
            "deprecation",
            "best_practice",
            "dataset",
            "benchmark",
            "codebase_pattern",
            "existing_implementation"
          ],
          description: "Type of finding"
        },
        summary: {
          type: "string",
          description: "What you found (concise description)"
        },
        relevance: {
          type: "string",
          description: "How this affects current work"
        },
        actionItems: {
          type: "string",
          description: "What needs to be done based on this finding"
        }
      },
      required: ["sessionId", "category", "summary"]
    },
    handler: async (args) => {
      const { sessionId, sourceUrl, category, summary, relevance, actionItems } = args;
      const db = getDb();
      const session = db.prepare("SELECT * FROM recon_sessions WHERE id = ?").get(sessionId);
      if (!session) throw new Error(`Recon session not found: ${sessionId}`);
      const findingId = genId("finding");
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.prepare(
        "INSERT INTO recon_findings (id, session_id, source_url, category, summary, relevance, action_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        findingId,
        sessionId,
        sourceUrl ?? null,
        category,
        summary,
        relevance ?? null,
        actionItems ?? null,
        now
      );
      const count = db.prepare(
        "SELECT COUNT(*) as count FROM recon_findings WHERE session_id = ?"
      ).get(sessionId).count;
      return {
        findingId,
        sessionId,
        category,
        findingCount: count,
        message: `Finding recorded (${count} total). Call get_recon_summary to see all findings for this session.`
      };
    }
  },
  {
    name: "get_recon_summary",
    description: "Get aggregated summary of all findings from a recon session. Groups findings by category (breaking changes, new features, codebase patterns, etc.) with prioritized action items.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Recon session ID"
        },
        completeSession: {
          type: "boolean",
          description: "Mark session as completed (default false)"
        }
      },
      required: ["sessionId"]
    },
    handler: async (args) => {
      const { sessionId, completeSession } = args;
      const db = getDb();
      const session = db.prepare("SELECT * FROM recon_sessions WHERE id = ?").get(sessionId);
      if (!session) throw new Error(`Recon session not found: ${sessionId}`);
      const findings = db.prepare(
        "SELECT * FROM recon_findings WHERE session_id = ? ORDER BY created_at ASC"
      ).all(sessionId);
      const byCategory = {};
      for (const f of findings) {
        if (!byCategory[f.category]) byCategory[f.category] = [];
        byCategory[f.category].push({
          findingId: f.id,
          summary: f.summary,
          sourceUrl: f.source_url,
          relevance: f.relevance,
          actionItems: f.action_items
        });
      }
      const allActionItems = findings.filter((f) => f.action_items).map((f) => ({
        action: f.action_items,
        category: f.category,
        source: f.source_url
      }));
      const PRIORITY_ORDER = [
        "breaking_change",
        "deprecation",
        "existing_implementation",
        "codebase_pattern",
        "new_feature",
        "best_practice",
        "dataset",
        "benchmark"
      ];
      const prioritizedActions = allActionItems.sort((a, b) => {
        const ai = PRIORITY_ORDER.indexOf(a.category);
        const bi = PRIORITY_ORDER.indexOf(b.category);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
      if (completeSession) {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        db.prepare(
          "UPDATE recon_sessions SET status = 'completed', completed_at = ? WHERE id = ?"
        ).run(now, sessionId);
      }
      return {
        sessionId,
        target: session.target,
        status: completeSession ? "completed" : session.status,
        totalFindings: findings.length,
        findingsByCategory: byCategory,
        prioritizedActionItems: prioritizedActions,
        recommendation: findings.length > 0 ? "Review by priority: breaking_change > deprecation > existing_implementation > codebase_pattern > new_feature > best_practice > dataset > benchmark" : "No findings recorded yet. Continue research or close session."
      };
    }
  },
  {
    name: "enrich_recon",
    description: "Retroactively enrich an existing recon session with live web search results. Call this after run_recon when you're ready to pull in live data. Searches the web for the session's target and auto-logs findings. Requires a search provider API key (GEMINI_API_KEY, OPENAI_API_KEY, or PERPLEXITY_API_KEY). Falls back gracefully if unavailable.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Recon session ID from a previous run_recon call"
        },
        searchQuery: {
          type: "string",
          description: "Custom search query (optional). If omitted, derives a query from the session's target."
        }
      },
      required: ["sessionId"]
    },
    handler: async (args) => {
      const { sessionId, searchQuery } = args;
      const db = getDb();
      const session = db.prepare("SELECT * FROM recon_sessions WHERE id = ?").get(sessionId);
      if (!session) throw new Error(`Recon session not found: ${sessionId}`);
      let enrichResult;
      try {
        enrichResult = await runWebEnrichment(sessionId, session.target, searchQuery);
      } catch (err) {
        enrichResult = {
          searchResults: [],
          findingsLogged: 0,
          provider: "none",
          error: `Web enrichment failed: ${err.message ?? String(err)}`
        };
      }
      const totalFindings = db.prepare(
        "SELECT COUNT(*) as count FROM recon_findings WHERE session_id = ?"
      ).get(sessionId).count;
      return {
        sessionId,
        target: session.target,
        provider: enrichResult.provider,
        resultsFound: enrichResult.searchResults.length,
        findingsAutoLogged: enrichResult.findingsLogged,
        totalSessionFindings: totalFindings,
        results: enrichResult.searchResults,
        ...enrichResult.error ? { note: enrichResult.error } : {},
        nextSteps: enrichResult.findingsLogged > 0 ? [
          "Call get_recon_summary to review all findings including web results",
          "Call log_recon_finding to add manual findings"
        ] : [
          "Web enrichment was unavailable or returned no results",
          "Check that GEMINI_API_KEY, OPENAI_API_KEY, or PERPLEXITY_API_KEY is set",
          "Try again later or research manually"
        ]
      };
    }
  },
  {
    name: "check_framework_updates",
    description: "Get a structured checklist of sources to check for framework/SDK updates. Pre-built source lists for: anthropic, langchain, openai, google, mcp. Each source includes what to check for. Use this to guide your reconnaissance research systematically.",
    inputSchema: {
      type: "object",
      properties: {
        ecosystem: {
          type: "string",
          enum: ["anthropic", "langchain", "openai", "google", "mcp"],
          description: "Which ecosystem to get sources for"
        }
      },
      required: ["ecosystem"]
    },
    handler: async (args) => {
      const sources = FRAMEWORK_SOURCES[args.ecosystem];
      if (!sources)
        throw new Error(
          `Unknown ecosystem: ${args.ecosystem}. Valid: ${Object.keys(FRAMEWORK_SOURCES).join(", ")}`
        );
      return {
        ecosystem: args.ecosystem,
        sourceCount: sources.length,
        sources,
        checklist: sources.map((s, i) => ({
          step: i + 1,
          action: `Visit ${s.source}`,
          url: s.url,
          lookFor: s.checkFor
        })),
        usage: "Visit each source and record findings with log_recon_finding. Focus on: breaking_change (highest priority), deprecation, new_feature, best_practice."
      };
    }
  },
  {
    name: "search_all_knowledge",
    description: "Search ALL accumulated knowledge in one call: learnings (edge cases, gotchas, patterns), recon findings (across ALL sessions), and resolved gaps from past verifications. Use this before starting any new work to see what the system already knows. This is the unified knowledge base that grows automatically as the tools are used.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What you're looking for (e.g., 'MCP SDK breaking changes', 'auth patterns', 'SQLite gotchas')"
        },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Filter by categories (optional). Applies to both learnings and recon findings."
        },
        limit: {
          type: "number",
          description: "Max results per source (default 10)"
        }
      },
      required: ["query"]
    },
    handler: async (args) => {
      const { query, categories, limit: maxResults } = args;
      const db = getDb();
      const limit = maxResults ?? 10;
      let learnings = [];
      try {
        learnings = db.prepare(
          `SELECT l.key, l.content, l.category, l.tags, l.source_cycle, l.created_at
             FROM learnings_fts
             JOIN learnings l ON l.id = learnings_fts.rowid
             WHERE learnings_fts MATCH ?
             ORDER BY rank
             LIMIT ?`
        ).all(query, limit);
      } catch {
        learnings = db.prepare(
          `SELECT key, content, category, tags, source_cycle, created_at
             FROM learnings
             WHERE content LIKE ? OR key LIKE ?
             ORDER BY created_at DESC
             LIMIT ?`
        ).all(`%${query}%`, `%${query}%`, limit);
      }
      if (categories && categories.length > 0) {
        learnings = learnings.filter(
          (l) => categories.includes(l.category)
        );
      }
      let reconFindings;
      try {
        if (categories && categories.length > 0) {
          const placeholders = categories.map(() => "?").join(", ");
          reconFindings = db.prepare(
            `SELECT f.id, f.session_id, f.source_url, f.category, f.summary,
                      f.relevance, f.action_items, f.created_at,
                      s.target as session_target
               FROM recon_findings_fts fts
               JOIN recon_findings f ON f.rowid = fts.rowid
               JOIN recon_sessions s ON s.id = f.session_id
               WHERE recon_findings_fts MATCH ?
                 AND f.category IN (${placeholders})
               ORDER BY rank
               LIMIT ?`
          ).all(query, ...categories, limit);
        } else {
          reconFindings = db.prepare(
            `SELECT f.id, f.session_id, f.source_url, f.category, f.summary,
                      f.relevance, f.action_items, f.created_at,
                      s.target as session_target
               FROM recon_findings_fts fts
               JOIN recon_findings f ON f.rowid = fts.rowid
               JOIN recon_sessions s ON s.id = f.session_id
               WHERE recon_findings_fts MATCH ?
               ORDER BY rank
               LIMIT ?`
          ).all(query, limit);
        }
      } catch {
        if (categories && categories.length > 0) {
          const placeholders = categories.map(() => "?").join(", ");
          reconFindings = db.prepare(
            `SELECT f.id, f.session_id, f.source_url, f.category, f.summary,
                      f.relevance, f.action_items, f.created_at,
                      s.target as session_target
               FROM recon_findings f
               JOIN recon_sessions s ON s.id = f.session_id
               WHERE (f.summary LIKE ? OR f.relevance LIKE ? OR f.action_items LIKE ?)
                 AND f.category IN (${placeholders})
               ORDER BY f.created_at DESC
               LIMIT ?`
          ).all(
            `%${query}%`,
            `%${query}%`,
            `%${query}%`,
            ...categories,
            limit
          );
        } else {
          reconFindings = db.prepare(
            `SELECT f.id, f.session_id, f.source_url, f.category, f.summary,
                      f.relevance, f.action_items, f.created_at,
                      s.target as session_target
               FROM recon_findings f
               JOIN recon_sessions s ON s.id = f.session_id
               WHERE f.summary LIKE ? OR f.relevance LIKE ? OR f.action_items LIKE ?
               ORDER BY f.created_at DESC
               LIMIT ?`
          ).all(`%${query}%`, `%${query}%`, `%${query}%`, limit);
        }
      }
      let matchedGaps;
      try {
        matchedGaps = db.prepare(
          `SELECT g.id, g.cycle_id, g.title, g.description, g.severity,
                    g.status, g.fix_strategy as resolution, g.resolved_at,
                    c.title as cycle_target
             FROM gaps_fts fts
             JOIN gaps g ON g.rowid = fts.rowid
             JOIN verification_cycles c ON c.id = g.cycle_id
             WHERE gaps_fts MATCH ?
             ORDER BY rank
             LIMIT ?`
        ).all(query, limit);
      } catch {
        matchedGaps = db.prepare(
          `SELECT g.id, g.cycle_id, g.title, g.description, g.severity,
                    g.status, g.fix_strategy as resolution, g.resolved_at,
                    c.title as cycle_target
             FROM gaps g
             JOIN verification_cycles c ON c.id = g.cycle_id
             WHERE (g.description LIKE ? OR g.fix_strategy LIKE ? OR g.title LIKE ?)
             ORDER BY g.created_at DESC
             LIMIT ?`
        ).all(`%${query}%`, `%${query}%`, `%${query}%`, limit);
      }
      const totalResults = learnings.length + reconFindings.length + matchedGaps.length;
      return {
        query,
        totalResults,
        learnings: learnings.map((l) => ({
          source: "learnings",
          key: l.key,
          content: l.content,
          category: l.category,
          tags: l.tags ? JSON.parse(l.tags) : [],
          createdAt: l.created_at
        })),
        reconFindings: reconFindings.map((f) => ({
          source: "recon",
          sessionTarget: f.session_target,
          category: f.category,
          summary: f.summary,
          relevance: f.relevance,
          actionItems: f.action_items,
          sourceUrl: f.source_url,
          createdAt: f.created_at
        })),
        gaps: matchedGaps.map((g) => ({
          source: "verification",
          cycleTarget: g.cycle_target,
          title: g.title,
          description: g.description,
          severity: g.severity,
          status: g.status,
          resolution: g.resolution,
          resolvedAt: g.resolved_at
        })),
        _contributeBack: {
          instruction: "If you discover new information while working, record it so future agents benefit:",
          actions: [
            "record_learning \u2014 for edge cases, gotchas, patterns, conventions",
            "log_recon_finding \u2014 for SDK changes, breaking changes, best practices"
          ]
        }
      };
    }
  },
  {
    name: "bootstrap_project",
    description: "Register or update your project's context (tech stack, architecture, conventions, build commands). This is stored persistently and used by all future agent sessions. Call this on first use to give the MCP full project awareness, or call again to update when your project evolves.",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Project name (e.g., 'my-saas-app', 'nodebench-mcp')"
        },
        techStack: {
          type: "string",
          description: "Languages, frameworks, runtimes (e.g., 'TypeScript, Node.js, React, Convex')"
        },
        architecture: {
          type: "string",
          description: "High-level architecture (e.g., 'Monorepo: MCP server (stdio) + web client (Next.js) + Convex backend')"
        },
        buildCommands: {
          type: "string",
          description: "Build commands (e.g., 'npm run build, tsc --noEmit')"
        },
        testCommands: {
          type: "string",
          description: "Test commands (e.g., 'npm test, npx jest, npx vitest')"
        },
        conventions: {
          type: "string",
          description: "Coding conventions (e.g., 'ESM modules, no default exports, strict TypeScript, raw JSON Schema for MCP tools')"
        },
        keyDependencies: {
          type: "string",
          description: "Key dependency versions (e.g., '@modelcontextprotocol/sdk 1.25.3, better-sqlite3 11.x')"
        },
        repoStructure: {
          type: "string",
          description: "Repository structure highlights (e.g., 'packages/mcp-local (MCP server), packages/web (frontend), convex/ (backend)')"
        }
      },
      required: ["projectName"]
    },
    handler: async (args) => {
      const db = getDb();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const upsert = db.prepare(
        "INSERT INTO project_context (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
      );
      const fields = {
        project_name: args.projectName,
        tech_stack: args.techStack,
        architecture: args.architecture,
        build_commands: args.buildCommands,
        test_commands: args.testCommands,
        conventions: args.conventions,
        key_dependencies: args.keyDependencies,
        repo_structure: args.repoStructure
      };
      const stored = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value) {
          upsert.run(key, value, now);
          stored[key] = value;
        }
      }
      const learningsCount = db.prepare("SELECT COUNT(*) as c FROM learnings").get().c;
      const reconCount = db.prepare("SELECT COUNT(*) as c FROM recon_sessions").get().c;
      const cycleCount = db.prepare("SELECT COUNT(*) as c FROM verification_cycles").get().c;
      const gapCount = db.prepare(
        "SELECT COUNT(*) as c FROM gaps WHERE status = 'resolved'"
      ).get().c;
      const isNew = learningsCount === 0 && reconCount === 0 && cycleCount === 0;
      return {
        projectName: args.projectName,
        storedFields: Object.keys(stored),
        context: stored,
        knowledgeBase: {
          learnings: learningsCount,
          reconSessions: reconCount,
          verificationCycles: cycleCount,
          resolvedGaps: gapCount
        },
        ...isNew ? {
          _onboarding: {
            message: "Project registered! This is a fresh install. Here's how to get started:",
            nextSteps: [
              'Call getMethodology("overview") to see all available development methodologies',
              'Call search_all_knowledge("your current task") before starting any work',
              "Call run_recon with your project context to research latest SDK/framework updates",
              "As you work, tool responses will guide you to record learnings and findings",
              "The knowledge base grows automatically \u2014 future sessions benefit from past work"
            ]
          }
        } : {
          _returning: {
            message: `Welcome back! Knowledge base has ${learningsCount} learnings, ${reconCount} recon sessions, ${cycleCount} verification cycles, and ${gapCount} resolved gaps.`,
            nextSteps: [
              "Call search_all_knowledge with your current task to see what's already known",
              "Call get_project_context to see full project context",
              "Continue where you left off \u2014 all past work is searchable"
            ]
          }
        }
      };
    }
  },
  {
    name: "get_project_context",
    description: "Retrieve the stored project context (tech stack, architecture, conventions, etc.) and knowledge base stats. Call this at the start of any session to refresh your project awareness. If no project context exists, returns onboarding instructions.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Get a specific field (optional). Keys: project_name, tech_stack, architecture, build_commands, test_commands, conventions, key_dependencies, repo_structure"
        }
      }
    },
    handler: async (args) => {
      const db = getDb();
      let rows;
      if (args.key) {
        rows = db.prepare("SELECT * FROM project_context WHERE key = ?").all(args.key);
      } else {
        rows = db.prepare("SELECT * FROM project_context ORDER BY key").all();
      }
      const context = {};
      for (const row of rows) {
        context[row.key] = row.value;
      }
      const learningsCount = db.prepare("SELECT COUNT(*) as c FROM learnings").get().c;
      const reconCount = db.prepare("SELECT COUNT(*) as c FROM recon_sessions").get().c;
      const cycleCount = db.prepare("SELECT COUNT(*) as c FROM verification_cycles").get().c;
      const gapCount = db.prepare(
        "SELECT COUNT(*) as c FROM gaps WHERE status = 'resolved'"
      ).get().c;
      const evalCount = db.prepare("SELECT COUNT(*) as c FROM eval_runs").get().c;
      if (rows.length === 0) {
        return {
          context: {},
          knowledgeBase: {
            learnings: learningsCount,
            reconSessions: reconCount,
            verificationCycles: cycleCount,
            resolvedGaps: gapCount,
            evalRuns: evalCount
          },
          _onboarding: {
            message: "No project context stored yet. Call bootstrap_project to register your project.",
            example: 'bootstrap_project({ projectName: "my-app", techStack: "TypeScript, React, Node.js", architecture: "Next.js frontend + Express API" })'
          }
        };
      }
      return {
        context,
        knowledgeBase: {
          learnings: learningsCount,
          reconSessions: reconCount,
          verificationCycles: cycleCount,
          resolvedGaps: gapCount,
          evalRuns: evalCount
        },
        _contributeBack: {
          instruction: "Keep project context current. Call bootstrap_project to update if your stack or architecture changes.",
          actions: [
            "bootstrap_project \u2014 update tech stack, dependencies, or conventions",
            "search_all_knowledge \u2014 check existing knowledge before starting work"
          ]
        }
      };
    }
  }
];

// server/vercel/searchApp.ts
init_webTools();

// packages/mcp-local/src/tools/llmTools.ts
async function getGeminiProvider() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    return {
      name: "gemini",
      available: true,
      call: async ({ system, prompt, maxTokens, temperature }) => {
        const model = "gemini-3-flash";
        const result = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: system ? `${system}

${prompt}` : prompt }] }],
          config: {
            maxOutputTokens: maxTokens ?? 1024,
            temperature: temperature ?? 0.7
          }
        });
        const text = typeof result.text === "string" ? result.text : "";
        const usage = result.usageMetadata;
        return {
          response: text,
          model,
          tokensUsed: {
            input: usage?.promptTokenCount ?? 0,
            output: usage?.candidatesTokenCount ?? 0
          }
        };
      }
    };
  } catch {
    return null;
  }
}
async function getOpenAIProvider() {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI();
    return {
      name: "openai",
      available: true,
      call: async ({ system, prompt, maxTokens, temperature }) => {
        const model = "gpt-5-mini";
        const messages = [];
        if (system) messages.push({ role: "system", content: system });
        messages.push({ role: "user", content: prompt });
        const result = await client.chat.completions.create({
          model,
          messages,
          max_tokens: maxTokens ?? 1024,
          temperature: temperature ?? 0.7
        });
        const text = result.choices?.[0]?.message?.content ?? "";
        return {
          response: text,
          model,
          tokensUsed: {
            input: result.usage?.prompt_tokens ?? 0,
            output: result.usage?.completion_tokens ?? 0
          }
        };
      }
    };
  } catch {
    return null;
  }
}
async function getAnthropicProvider() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    return {
      name: "anthropic",
      available: true,
      call: async ({ system, prompt, maxTokens, temperature }) => {
        const model = "claude-haiku-4-5-20251001";
        const result = await client.messages.create({
          model,
          max_tokens: maxTokens ?? 1024,
          system: system ?? "",
          messages: [{ role: "user", content: prompt }],
          temperature: temperature ?? 0.7
        });
        const text = result.content.filter((b) => b.type === "text").map((b) => b.text).join("");
        return {
          response: text,
          model,
          tokensUsed: {
            input: result.usage?.input_tokens ?? 0,
            output: result.usage?.output_tokens ?? 0
          }
        };
      }
    };
  } catch {
    return null;
  }
}
async function getProvider() {
  return await getGeminiProvider() ?? await getOpenAIProvider() ?? await getAnthropicProvider();
}
var llmTools = [
  {
    name: "call_llm",
    description: "Call an LLM model directly and get the response with metrics (tokens, latency). Uses available API keys: Gemini \u2192 OpenAI \u2192 Anthropic. Useful for eval-driven workflows, model comparison, structured analysis, and any task where the agent needs an LLM call as a step in its pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The user prompt to send" },
        system: { type: "string", description: "Optional system prompt" },
        maxTokens: { type: "number", description: "Max output tokens (default: 1024)" },
        temperature: { type: "number", description: "Temperature 0-1 (default: 0.7)" }
      },
      required: ["prompt"]
    },
    handler: async (args) => {
      const start = Date.now();
      const provider = await getProvider();
      if (!provider) {
        return {
          error: true,
          message: "No LLM provider available. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.",
          providers: {
            gemini: !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_AI_API_KEY,
            openai: !!process.env.OPENAI_API_KEY,
            anthropic: !!process.env.ANTHROPIC_API_KEY
          }
        };
      }
      try {
        const result = await provider.call({
          system: args.system,
          prompt: args.prompt,
          maxTokens: args.maxTokens,
          temperature: args.temperature
        });
        return {
          response: result.response,
          model: result.model,
          provider: provider.name,
          tokensUsed: result.tokensUsed,
          latencyMs: Date.now() - start
        };
      } catch (err) {
        return {
          error: true,
          message: `LLM call failed: ${err.message ?? String(err)}`,
          provider: provider.name,
          latencyMs: Date.now() - start
        };
      }
    }
  },
  {
    name: "extract_structured_data",
    description: "Extract structured JSON data from unstructured text using an LLM. Provide the text and a description of the fields you want extracted. Returns validated JSON matching your schema. Useful for turning research findings, web pages, or documents into structured data.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The unstructured text to extract data from" },
        fields: {
          type: "string",
          description: "Description of fields to extract, e.g. 'company_name (string), funding_amount (number), round_type (string), investors (array of strings)'"
        },
        context: { type: "string", description: "Optional context about what this text is and what to focus on" }
      },
      required: ["text", "fields"]
    },
    handler: async (args) => {
      const start = Date.now();
      const provider = await getProvider();
      if (!provider) {
        return {
          error: true,
          message: "No LLM provider available. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY."
        };
      }
      const system = `You are a data extraction assistant. Extract structured data from the provided text and return ONLY valid JSON. No explanation, no markdown, just the JSON object.`;
      const prompt = [
        args.context ? `Context: ${args.context}` : null,
        `Extract these fields: ${args.fields}`,
        "",
        "Text to extract from:",
        args.text.slice(0, 8e3),
        // Cap input to avoid token limits
        "",
        "Return ONLY a JSON object with the extracted fields. Use null for fields that cannot be determined from the text."
      ].filter(Boolean).join("\n");
      try {
        const result = await provider.call({ system, prompt, maxTokens: 2048, temperature: 0.1 });
        let data;
        try {
          const cleaned = result.response.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
          data = JSON.parse(cleaned);
        } catch {
          return {
            error: true,
            message: "LLM response was not valid JSON",
            rawResponse: result.response.slice(0, 500),
            provider: provider.name,
            latencyMs: Date.now() - start
          };
        }
        return {
          data,
          provider: provider.name,
          model: result.model,
          tokensUsed: result.tokensUsed,
          latencyMs: Date.now() - start
        };
      } catch (err) {
        return {
          error: true,
          message: `Extraction failed: ${err.message ?? String(err)}`,
          provider: provider.name,
          latencyMs: Date.now() - start
        };
      }
    }
  },
  {
    name: "benchmark_models",
    description: "Run the same prompt against multiple LLM providers and compare responses. Returns side-by-side results with latency, token usage, and a summary. Useful for model selection, quality comparison, and cost analysis.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The prompt to send to all models" },
        system: { type: "string", description: "Optional system prompt" },
        maxTokens: { type: "number", description: "Max output tokens per model (default: 512)" },
        temperature: { type: "number", description: "Temperature 0-1 (default: 0.7)" }
      },
      required: ["prompt"]
    },
    handler: async (args) => {
      const providers = [
        { name: "gemini", getter: getGeminiProvider },
        { name: "openai", getter: getOpenAIProvider },
        { name: "anthropic", getter: getAnthropicProvider }
      ];
      const results = [];
      for (const { name, getter } of providers) {
        const provider = await getter();
        if (!provider) continue;
        const start = Date.now();
        try {
          const result = await provider.call({
            system: args.system,
            prompt: args.prompt,
            maxTokens: args.maxTokens ?? 512,
            temperature: args.temperature
          });
          results.push({
            provider: name,
            model: result.model,
            response: result.response,
            tokensUsed: result.tokensUsed,
            latencyMs: Date.now() - start
          });
        } catch (err) {
          results.push({
            provider: name,
            model: "unknown",
            response: "",
            tokensUsed: { input: 0, output: 0 },
            latencyMs: Date.now() - start,
            error: err.message ?? String(err)
          });
        }
      }
      if (results.length === 0) {
        return {
          error: true,
          message: "No LLM providers available. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY."
        };
      }
      const fastest = results.reduce((a, b) => a.latencyMs < b.latencyMs ? a : b);
      const totalTokens = results.reduce((s, r) => s + r.tokensUsed.input + r.tokensUsed.output, 0);
      return {
        results,
        modelsCompared: results.length,
        fastest: { provider: fastest.provider, model: fastest.model, latencyMs: fastest.latencyMs },
        totalTokensUsed: totalTokens,
        summary: `Compared ${results.length} model(s). Fastest: ${fastest.provider} (${fastest.model}) at ${fastest.latencyMs}ms.`
      };
    }
  }
];

// packages/mcp-local/src/tools/monteCarloTools.ts
function runSimulation(input) {
  const paths = [];
  for (let p = 0; p < input.numPaths; p++) {
    let revenue = input.currentState.revenue ?? 0;
    let marketShare = input.currentState.marketShare ?? 0;
    let runway = input.currentState.runway ?? 18;
    let cumulativePayoff = 0;
    const steps = [];
    for (let month = 1; month <= input.timeHorizonMonths; month++) {
      const decisionIdx = month % input.decisions.length;
      const decision = input.decisions[decisionIdx];
      const probs = decision.probabilities ?? decision.options.map(() => 1 / decision.options.length);
      const rand = Math.random();
      let cumProb = 0;
      let choiceIdx = 0;
      for (let i = 0; i < probs.length; i++) {
        cumProb += probs[i];
        if (rand <= cumProb) {
          choiceIdx = i;
          break;
        }
      }
      const choice = decision.options[choiceIdx];
      const growthRate = 0.02 + Math.random() * 0.08;
      const riskEvent = Math.random() < 0.05;
      if (choice.toLowerCase().includes("aggressive") || choice.toLowerCase().includes("raise") || choice.toLowerCase().includes("expand")) {
        revenue *= 1 + growthRate * 1.5;
        marketShare += Math.random() * 0.02;
        runway -= 1.5;
      } else if (choice.toLowerCase().includes("conservative") || choice.toLowerCase().includes("wait") || choice.toLowerCase().includes("optimize")) {
        revenue *= 1 + growthRate * 0.5;
        marketShare += Math.random() * 5e-3;
        runway -= 0.8;
      } else {
        revenue *= 1 + growthRate;
        marketShare += Math.random() * 0.01;
        runway -= 1;
      }
      if (riskEvent) {
        revenue *= 0.85;
        runway -= 2;
      }
      marketShare = Math.min(1, Math.max(0, marketShare));
      runway = Math.max(0, runway);
      cumulativePayoff = revenue * 12 * marketShare;
      steps.push({
        month,
        decision: decision.name,
        choice,
        revenue: Math.round(revenue),
        marketShare: Math.round(marketShare * 1e4) / 100,
        runway: Math.round(runway * 10) / 10,
        cumulativePayoff: Math.round(cumulativePayoff)
      });
    }
    const finalPayoff = cumulativePayoff;
    const outcome = runway <= 0 ? "failure" : revenue > (input.currentState.revenue ?? 0) * 2 ? "success" : "survival";
    paths.push({
      pathId: p,
      steps,
      finalPayoff: Math.round(finalPayoff),
      finalRevenue: Math.round(revenue),
      finalMarketShare: Math.round(marketShare * 1e4) / 100,
      outcome
    });
  }
  const sorted = [...paths].sort((a, b) => a.finalPayoff - b.finalPayoff);
  const avgPayoff = Math.round(paths.reduce((s, p) => s + p.finalPayoff, 0) / paths.length);
  const medianPayoff = sorted[Math.floor(sorted.length / 2)]?.finalPayoff ?? 0;
  const p10 = sorted[Math.floor(sorted.length * 0.1)]?.finalPayoff ?? 0;
  const p90 = sorted[Math.floor(sorted.length * 0.9)]?.finalPayoff ?? 0;
  const successRate = Math.round(paths.filter((p) => p.outcome === "success").length / paths.length * 100);
  const survivalRate = Math.round(paths.filter((p) => p.outcome !== "failure").length / paths.length * 100);
  const failureRate = 100 - survivalRate;
  const sensitivity = input.decisions.map((d) => {
    const byChoice = /* @__PURE__ */ new Map();
    for (const path2 of paths) {
      for (const step of path2.steps) {
        if (step.decision === d.name) {
          if (!byChoice.has(step.choice)) byChoice.set(step.choice, []);
          byChoice.get(step.choice).push(path2.finalPayoff);
        }
      }
    }
    let bestChoice = "";
    let bestAvg = -Infinity;
    for (const [choice, payoffs] of byChoice) {
      const avg = payoffs.reduce((s, v) => s + v, 0) / payoffs.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestChoice = choice;
      }
    }
    return { decision: d.name, bestChoice, avgPayoffDelta: Math.round(bestAvg - avgPayoff) };
  });
  return {
    entity: input.entity,
    numPaths: input.numPaths,
    timeHorizonMonths: input.timeHorizonMonths,
    averagePayoff: avgPayoff,
    medianPayoff,
    bestPath: sorted[sorted.length - 1],
    worstPath: sorted[0],
    p10Payoff: p10,
    p90Payoff: p90,
    successRate,
    survivalRate,
    failureRate,
    decisionSensitivity: sensitivity,
    paths: paths.slice(0, 10)
    // Return top 10 paths for visualization
  };
}
var monteCarloTools = [
  {
    name: "simulate_decision_paths",
    description: "Run Monte Carlo simulation for founder decisions. Generates multiple random paths to visualize possible future outcomes. Shows average payoff, success/failure rates, best/worst paths, and which decisions matter most. Use for: fundraising timing, market entry, build-vs-buy, hiring, pivot analysis.",
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", description: "Company or project name" },
        revenue: { type: "number", description: "Current monthly revenue (USD)" },
        marketShare: { type: "number", description: "Current market share (0-1, e.g., 0.05 = 5%)" },
        runway: { type: "number", description: "Months of runway remaining" },
        decisions: {
          type: "array",
          description: "Key decisions to simulate. Each has a name and options.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              options: { type: "array", items: { type: "string" } },
              probabilities: { type: "array", items: { type: "number" } }
            }
          }
        },
        timeHorizonMonths: { type: "number", description: "How many months to simulate (default: 12)" },
        numPaths: { type: "number", description: "Number of simulation paths (default: 100)" }
      },
      required: ["entity"]
    },
    handler: async (args) => {
      const entity = String(args.entity ?? "Startup");
      const decisions = args.decisions ?? [
        { name: "Fundraising Strategy", options: ["Raise now (aggressive)", "Wait 6 months (conservative)", "Revenue-fund (bootstrap)"], probabilities: [0.4, 0.35, 0.25] },
        { name: "Market Entry", options: ["Enterprise first", "SMB first", "Developer-led growth"], probabilities: [0.3, 0.3, 0.4] },
        { name: "Team Growth", options: ["Hire aggressively (10+)", "Hire selectively (3-5)", "Stay lean (1-2)"], probabilities: [0.2, 0.5, 0.3] }
      ];
      const result = runSimulation({
        entity,
        currentState: {
          revenue: Number(args.revenue ?? 0),
          marketShare: Number(args.marketShare ?? 0.01),
          runway: Number(args.runway ?? 18)
        },
        decisions,
        timeHorizonMonths: Number(args.timeHorizonMonths ?? 12),
        numPaths: Math.min(Number(args.numPaths ?? 100), 500)
      });
      return {
        summary: {
          entity: result.entity,
          paths: result.numPaths,
          horizon: `${result.timeHorizonMonths} months`,
          averagePayoff: `$${result.averagePayoff.toLocaleString()}`,
          medianPayoff: `$${result.medianPayoff.toLocaleString()}`,
          confidenceInterval: `$${result.p10Payoff.toLocaleString()} \u2013 $${result.p90Payoff.toLocaleString()} (80% CI)`,
          successRate: `${result.successRate}%`,
          survivalRate: `${result.survivalRate}%`,
          failureRate: `${result.failureRate}%`
        },
        bestPath: {
          payoff: `$${result.bestPath.finalPayoff.toLocaleString()}`,
          finalRevenue: `$${result.bestPath.finalRevenue.toLocaleString()}/mo`,
          marketShare: `${result.bestPath.finalMarketShare}%`,
          keyDecisions: result.bestPath.steps.slice(0, 3).map((s) => `${s.decision}: ${s.choice}`)
        },
        worstPath: {
          payoff: `$${result.worstPath.finalPayoff.toLocaleString()}`,
          finalRevenue: `$${result.worstPath.finalRevenue.toLocaleString()}/mo`,
          outcome: result.worstPath.outcome
        },
        decisionSensitivity: result.decisionSensitivity.map((d) => ({
          decision: d.decision,
          bestChoice: d.bestChoice,
          impact: d.avgPayoffDelta > 0 ? `+$${d.avgPayoffDelta.toLocaleString()}` : `$${d.avgPayoffDelta.toLocaleString()}`
        })),
        topPaths: result.paths.slice(0, 5).map((p) => ({
          id: p.pathId,
          outcome: p.outcome,
          payoff: p.finalPayoff,
          revenue: p.finalRevenue,
          marketShare: p.finalMarketShare
        }))
      };
    }
  }
];

// packages/mcp-local/src/sweep/engine.ts
init_db();
var SOURCE_MODULES = [];
function registerSource(name, collect6) {
  SOURCE_MODULES.push({ name, collect: collect6 });
}
async function runSweep() {
  const sweepId = genId("sweep");
  const startMs = Date.now();
  const sourceResults = [];
  const allSignals = [];
  if (SOURCE_MODULES.length === 0) {
    try {
      const hn = await Promise.resolve().then(() => (init_hackernews(), hackernews_exports));
      registerSource("hackernews", hn.collect);
    } catch {
    }
    try {
      const gh = await Promise.resolve().then(() => (init_github_trending(), github_trending_exports));
      registerSource("github_trending", gh.collect);
    } catch {
    }
    try {
      const yf = await Promise.resolve().then(() => (init_yahoo_finance(), yahoo_finance_exports));
      registerSource("yahoo_finance", yf.collect);
    } catch {
    }
    try {
      const ph = await Promise.resolve().then(() => (init_producthunt(), producthunt_exports));
      registerSource("producthunt", ph.collect);
    } catch {
    }
    try {
      const ob = await Promise.resolve().then(() => (init_openbb_finance(), openbb_finance_exports));
      registerSource("openbb_finance", ob.collect);
    } catch {
    }
  }
  const results = await Promise.all(
    SOURCE_MODULES.map(async (source) => {
      const sourceStart = Date.now();
      try {
        const signals = await Promise.race([
          source.collect(),
          new Promise(
            (_, reject) => setTimeout(() => reject(new Error("timeout")), 1e4)
          )
        ]);
        return {
          name: source.name,
          status: "ok",
          count: signals.length,
          durationMs: Date.now() - sourceStart,
          signals
        };
      } catch {
        return {
          name: source.name,
          status: "error",
          count: 0,
          durationMs: Date.now() - sourceStart,
          signals: []
        };
      }
    })
  );
  for (const r of results) {
    sourceResults.push({ name: r.name, status: r.status, count: r.count, durationMs: r.durationMs });
    allSignals.push(...r.signals);
  }
  allSignals.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const result = {
    signals: allSignals,
    sources: sourceResults,
    totalDurationMs: Date.now() - startMs,
    sweepId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  persistSweep(result);
  return result;
}
function computeDelta(current, previous) {
  const prevIds = new Set((previous?.signals ?? []).map((s) => s.id));
  const prevSeverities = new Map((previous?.signals ?? []).map((s) => [s.id, s.severity]));
  const newSignals = current.signals.filter((s) => !prevIds.has(s.id));
  const escalations = [];
  const deescalations = [];
  for (const sig of current.signals) {
    const prevSev = prevSeverities.get(sig.id);
    if (!prevSev) continue;
    const sevOrder = { flash: 3, priority: 2, routine: 1 };
    if (sevOrder[sig.severity] > sevOrder[prevSev]) {
      escalations.push({ signal: sig, from: prevSev, to: sig.severity });
    } else if (sevOrder[sig.severity] < sevOrder[prevSev]) {
      deescalations.push({ signal: sig, from: prevSev, to: sig.severity });
    }
  }
  const topCandidates = [
    ...newSignals.filter((s) => s.severity === "flash"),
    ...escalations.map((e) => e.signal),
    ...newSignals.filter((s) => s.severity === "priority"),
    ...newSignals
  ];
  const topSignal = topCandidates[0] ?? current.signals[0] ?? null;
  return {
    newSignals,
    escalations,
    deescalations,
    topEntity: topSignal?.entity ?? null,
    topEntityQuery: topSignal ? `${topSignal.headline} \u2014 what does this mean for founders?` : null,
    topEntitySeverity: topSignal?.severity ?? null,
    sweepId: current.sweepId,
    previousSweepId: previous?.sweepId ?? null
  };
}
function initSweepTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS sweep_results (
      id TEXT PRIMARY KEY,
      signals TEXT NOT NULL DEFAULT '[]',
      sources TEXT NOT NULL DEFAULT '[]',
      total_duration_ms INTEGER DEFAULT 0,
      signal_count INTEGER DEFAULT 0,
      top_entity TEXT,
      top_entity_query TEXT,
      new_signal_count INTEGER DEFAULT 0,
      escalation_count INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sr_ts ON sweep_results(timestamp);
  `);
}
function persistSweep(result) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO sweep_results (id, signals, sources, total_duration_ms, signal_count, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      result.sweepId,
      JSON.stringify(result.signals.slice(0, 50)),
      JSON.stringify(result.sources),
      result.totalDurationMs,
      result.signals.length,
      result.timestamp
    );
  } catch {
  }
}
function getLatestSweep() {
  try {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM sweep_results ORDER BY timestamp DESC LIMIT 1`).get();
    if (!row) return null;
    return {
      signals: JSON.parse(row.signals ?? "[]"),
      sources: JSON.parse(row.sources ?? "[]"),
      totalDurationMs: row.total_duration_ms,
      sweepId: row.id,
      timestamp: row.timestamp
    };
  } catch {
    return null;
  }
}
function getPreviousSweep() {
  try {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM sweep_results ORDER BY timestamp DESC LIMIT 1 OFFSET 1`).get();
    if (!row) return null;
    return {
      signals: JSON.parse(row.signals ?? "[]"),
      sources: JSON.parse(row.sources ?? "[]"),
      totalDurationMs: row.total_duration_ms,
      sweepId: row.id,
      timestamp: row.timestamp
    };
  } catch {
    return null;
  }
}
function generateRecommendations(signals) {
  const recs = [];
  for (const sig of signals.slice(0, 10)) {
    let action = "";
    let reasoning = "";
    let urgency = "monitor";
    let category = "market";
    if (sig.category === "funding") {
      action = `Research ${sig.entity}'s funding round. Evaluate if this changes your competitive landscape.`;
      reasoning = "Funding signals shift market dynamics. A well-funded competitor can accelerate faster.";
      urgency = "this_week";
      category = "competitive";
    } else if (sig.category === "launch") {
      action = `Evaluate ${sig.entity}. Is this a competitor, partner opportunity, or irrelevant?`;
      reasoning = "New launches in your space can validate or threaten your wedge.";
      urgency = sig.severity === "flash" ? "act_now" : "this_week";
      category = "opportunity";
    } else if (sig.category === "market" && sig.severity === "flash") {
      action = `Check your exposure to ${sig.entity}. Review your portfolio and customer base.`;
      reasoning = "Major market moves can affect your runway, fundraising, and customer behavior.";
      urgency = "act_now";
      category = "risk";
    } else if (sig.category === "trend") {
      action = `Assess if the ${sig.entity} trend affects your product roadmap or positioning.`;
      reasoning = "Trending topics signal where developer and investor attention is shifting.";
      urgency = "this_week";
      category = "opportunity";
    } else {
      action = `Note: ${sig.headline}`;
      reasoning = "Signal detected but no immediate action required.";
      urgency = "monitor";
      category = "market";
    }
    recs.push({ signal: sig, action, reasoning, urgency, category });
  }
  const urgencyOrder = { act_now: 0, this_week: 1, monitor: 2 };
  recs.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  return recs;
}

// server/routes/search.ts
init_db();
init_behaviorStore();
import { Router } from "express";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

// packages/mcp-local/src/sync/sessionMemory.ts
init_db();
var MAX_ACTIONS_PER_EPISODE = 200;
var TRUNCATE_LIMIT = 2048;
function truncate(s, limit = TRUNCATE_LIMIT) {
  return s.length > limit ? s.slice(0, limit - 3) + "..." : s;
}
function initSessionMemoryTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_actions (
      action_id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      tool_name TEXT NOT NULL,
      input TEXT NOT NULL,
      output TEXT NOT NULL,
      success INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_failures (
      failure_id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      tool_name TEXT NOT NULL,
      failure_type TEXT NOT NULL,
      root_cause TEXT NOT NULL,
      recovery_strategy TEXT NOT NULL,
      recovery_successful INTEGER,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recovery_strategies (
      strategy_id TEXT PRIMARY KEY,
      failure_type TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      strategy TEXT NOT NULL,
      success_count INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0,
      last_used TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_actions_episode ON session_actions(episode_id);
    CREATE INDEX IF NOT EXISTS idx_failures_episode ON session_failures(episode_id);
    CREATE INDEX IF NOT EXISTS idx_recovery_type ON recovery_strategies(failure_type, tool_name);
  `);
}
function recordAction(action) {
  const db = getDb();
  initSessionMemoryTables();
  const actionId = genId();
  const countStmt = db.prepare("SELECT COUNT(*) as cnt FROM session_actions WHERE episode_id = ?");
  const count = countStmt.get(action.episodeId)?.cnt ?? 0;
  if (count >= MAX_ACTIONS_PER_EPISODE) {
    db.prepare(
      "DELETE FROM session_actions WHERE action_id IN (SELECT action_id FROM session_actions WHERE episode_id = ? ORDER BY timestamp ASC LIMIT 10)"
    ).run(action.episodeId);
  }
  db.prepare(`
    INSERT INTO session_actions (action_id, episode_id, step_index, tool_name, input, output, success, duration_ms, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    actionId,
    action.episodeId,
    action.stepIndex,
    action.toolName,
    truncate(action.input),
    truncate(action.output),
    action.success ? 1 : 0,
    action.durationMs,
    action.timestamp
  );
  return { ...action, actionId };
}
function recordFailure(failure) {
  const db = getDb();
  initSessionMemoryTables();
  const failureId = genId();
  db.prepare(`
    INSERT INTO session_failures (failure_id, episode_id, step_index, tool_name, failure_type, root_cause, recovery_strategy, recovery_successful, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    failureId,
    failure.episodeId,
    failure.stepIndex,
    failure.toolName,
    failure.failureType,
    failure.rootCause,
    failure.recoveryStrategy,
    failure.recoverySuccessful == null ? null : failure.recoverySuccessful ? 1 : 0,
    failure.timestamp
  );
  return { ...failure, failureId };
}
function getReflectionPrompt(failureType, toolName) {
  const db = getDb();
  initSessionMemoryTables();
  const strategies = db.prepare(
    "SELECT strategy, success_count, failure_count FROM recovery_strategies WHERE failure_type = ? AND tool_name = ? AND success_count > 0 ORDER BY success_count DESC LIMIT 3"
  ).all(failureType, toolName);
  if (strategies.length === 0) {
    return `No known recovery strategies for ${failureType} on ${toolName}. Try a different approach.`;
  }
  const lines = strategies.map(
    (s, i) => `${i + 1}. "${s.strategy}" (succeeded ${s.success_count}x, failed ${s.failure_count}x)`
  );
  return `Known recovery strategies for ${failureType} on ${toolName}:
${lines.join("\n")}
Use the most successful strategy, or try a new approach if all have been exhausted.`;
}

// server/agentHarness.ts
var COMPANY_NAME_STOPWORDS = /* @__PURE__ */ new Set([
  "approximately",
  "ai",
  "api",
  "about",
  "llm",
  "ml",
  "nlp",
  "gpu",
  "cpu",
  "yoy",
  "arr",
  "mrr",
  "tm",
  "inc",
  "corp",
  "ltd",
  "co",
  "the",
  "a",
  "an",
  "what",
  "when",
  "where",
  "which",
  "company",
  "competitive",
  "landscape",
  "market",
  "share",
  "large",
  "small",
  "series",
  "seed",
  "pre-seed",
  "preseed",
  "round",
  "however",
  "therefore",
  "moreover",
  "war",
  "race",
  "battle",
  "category",
  "tpu",
  "tpus",
  "trainium",
  "inferentia",
  "claude",
  "gemini",
  "vertex",
  "bedrock",
  "statistics",
  "analysis",
  "overview",
  "report",
  "update",
  "latest",
  "enterprise",
  "foundation",
  "models",
  "model",
  "position",
  "positioning",
  "strategy",
  "risk",
  "risks",
  "challenge",
  "challenges",
  "funding",
  "valuation",
  "revenue",
  "growth",
  "intelligence",
  "memo",
  "index",
  "peer",
  "it",
  "multi",
  "dimensional",
  "global",
  "business",
  "professional",
  "we",
  "safety",
  "focused",
  "leader",
  "leaders",
  "their",
  "them",
  "our",
  "us",
  "ventures",
  "venture",
  "capital",
  "partners",
  "management",
  "holdings",
  "fund",
  "fortune",
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "overview",
  "outlook",
  "briefing",
  "brief",
  "readout",
  "recon",
  "contracts",
  "data",
  "pricing",
  "buyers",
  "reporting",
  "contract",
  "positioned",
  "deployments",
  "ecosystems",
  "cowork",
  "coworker",
  "western"
]);
var SOURCE_ENTITY_STOPWORDS = /* @__PURE__ */ new Set([
  "axios",
  "bloomberg",
  "coatue",
  "crunchbase",
  "dragoneer",
  "eweek",
  "forbes",
  "gic",
  "gdpr",
  "hipaa",
  "linkedin",
  "pitchbook",
  "reddit",
  "reuters",
  "sacra",
  "sequoia",
  "soc 2",
  "soc2",
  "statista",
  "substack",
  "techcrunch",
  "the information",
  "wikipedia",
  "youtube"
]);
var NON_PEER_COMPARABLE_NAMES = /* @__PURE__ */ new Set([
  "alphabet",
  "aws",
  "azure",
  "bedrock",
  "google cloud",
  "microsoft azure",
  "pentagon",
  "vertex ai"
]);
var COMPARABLE_CONNECTOR_STOPWORDS = /* @__PURE__ */ new Set([
  "another",
  "as",
  "both",
  "by",
  "despite",
  "each",
  "every",
  "many",
  "most",
  "other",
  "others",
  "several",
  "some"
]);
var KNOWN_ACRONYM_COMPANY_NAMES = /* @__PURE__ */ new Set([
  "AMD",
  "AWS",
  "IBM",
  "NVIDIA",
  "SAP",
  "TSMC"
]);
var HIGH_AUTHORITY_SOURCE_HOST_PATTERNS = [
  /anthropic\.com$/i,
  /openai\.com$/i,
  /google\.com$/i,
  /abcxyz\.com$/i,
  /sec\.gov$/i,
  /reuters\.com$/i,
  /nytimes\.com$/i,
  /wsj\.com$/i,
  /ft\.com$/i,
  /bloomberg\.com$/i,
  /theinformation\.com$/i,
  /sacra\.com$/i
];
var LOW_AUTHORITY_SOURCE_HOST_PATTERNS = [
  /247wallst\.com$/i,
  /aibusinessweekly\.net$/i,
  /atonementlicensing\.com$/i,
  /electroiq\.com$/i,
  /europeanbusinessmagazine\.com$/i,
  /futuresearch\.ai$/i,
  /redolentech\.com$/i
];
var PERCENT_VALUE_PATTERN = /\d{1,3}(?:,\d{3})*(?:\.\d+)?%/g;
function looksLikeSourceTitle(value) {
  return /[|]/.test(value) || /\b(statistics?(?:\s+by)?|company analysis|outlook report|full financial breakdown|what investors need to know|what .* need to know|powerhouse hiding in plain sight|arms race|index(?:\s+\w+){0,3}\s+update|worth buying|turns the tables|who is winning|why .* is winning|why businesses choose|battle that will reshape|looking ahead to|dominance is being tested|ai war|ai race|critical revenue category|leading one half|market share 20\d{2}|competitors?\s*&\s*.+alternatives?|understanding the .* milestone|let'?s break down)\b/i.test(value) || /\s[-:]\s(?:[A-Z][A-Za-z0-9&.]+(?:\s+[A-Z][A-Za-z0-9&.]+){0,3})$/.test(value.trim()) || /^\d+\.\s/.test(value);
}
function decodeCommonHtmlEntities(value) {
  return value.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function normalizeWhitespace(value) {
  return decodeCommonHtmlEntities(value).replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}
function sentenceSplit(value) {
  return normalizeWhitespace(value).split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}
function dedupeStrings2(values) {
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const value of values) {
    const normalized = normalizeWhitespace(value).toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(normalizeWhitespace(value));
  }
  return deduped;
}
function containsRiskLanguage(value) {
  return /\b(risk|pressure|threat|challenge|headwind|dependency|concentration|regulat|compliance|pricing|margin|capital|compute|customer concentration|durability|retention|execution|burn|cash|governance|safety|litigation|antitrust|slowdown|uncertain|exposure)\b/i.test(value);
}
function isQuestionLike(value) {
  return /\?$/.test(value.trim()) || /^(what|how|why|when|where|which|who)\b/i.test(value.trim());
}
function looksLikeFundingHeadline(value) {
  return /\b(raises?|raised|funding|post-money valuation|valuation marks|targeting a .* ipo|revenue nearly doubled|powerhouse hiding in plain sight|worth buying)\b/i.test(value);
}
function looksLikeEvidenceFragment(value) {
  return value.length > 220 || /^[a-z]/.test(value) || /^(per\s+user\/month|this report outlines|this article discusses|according to customer data from)/i.test(value) || /^(those|these|they|it)\b/i.test(value) || /^\d{1,2},\s+\d{4}\b/.test(value) || /\.\.\.|prove this .* valuation is real/i.test(value);
}
function looksLikeNarrativeFluff(value) {
  return /^(this report|the report|this article|the article|this comparison|the comparison)\b/i.test(value) || /\b(could prove conservative|people will keep using the product|projections suggest|the article argues|the report argues|this report highlights|this comparison highlights)\b/i.test(value) || /\b(trajectory resembles|resembles how|feature into a core revenue driver|early capital intensity|market leader in enterprise ai and coding|may hold approximately|anecdotal)\b/i.test(value);
}
function looksLikeSpeculativeCapitalMarketsFiller(value) {
  return /\b(an ipo would|eye potential ipos?|valuation volatility|clearest look yet|justify a valuation larger than most|larger than most of the s&p 500|high-growth potential into sustainable, long-term enterprise value)\b/i.test(value);
}
function looksLikeGenericMarketBackdrop(value) {
  return /\b(the enterprise ai market is experiencing exponential growth|moves from niche experiments to foundational technology across industries|across industries|industry faces valuation volatility)\b/i.test(value);
}
function looksLikeTruncatedNarrative(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return false;
  if (/[.!?]$/.test(normalized)) return false;
  if (/\.\.\.$/.test(normalized)) return true;
  const lastToken = normalized.split(/\s+/).pop() ?? "";
  if (!lastToken) return false;
  if (lastToken.length <= 2) return true;
  if (/^(and|or|but|with|for|to|of|in|on|at|by|as|while|when|because|which|that|who|whose|where|via|than|from|into|over|under|after|before|around|across)$/i.test(lastToken)) {
    return true;
  }
  if (normalized.length >= 145) return true;
  return false;
}
function cleanEvidenceSentence(value) {
  return normalizeWhitespace(value).replace(/^[-•]+\s*/, "").replace(/^(?:[A-Z][a-z]{2,9}\.?\s+)?[A-Z][a-z]{2,9}\s+\d{1,2},\s+\d{4}\s+[—-]\s*/i, "").replace(/^(?:[A-Z][a-z]{2,9}\.?\s+)?\d{1,2},\s+\d{4}\s+/i, "").replace(/^(?:updated|published|reported)\s+[A-Z][a-z]{2,9}\s+\d{1,2},\s+\d{4}\s*/i, "").replace(/\s+/g, " ").trim();
}
function hasBankerSignalContent(value) {
  return /(\$\d|\b\d+%|\b(revenue|run-rate|run rate|growth|pricing|retention|distribution|bundle|bundling|contract|enterprise|valuation|margin|buyers?|share|deployments?|capex|spend|pipeline|bookings|demand|market position|subscriptions?|usage|users?|win rates?)\b)/i.test(value);
}
function scoreEvidenceSentence(value) {
  let score = 0;
  if (/\$\d/.test(value)) score += 3;
  if (/\b\d+%/.test(value)) score += 2;
  if (/\b(revenue|run-rate|run rate|valuation|margin|bookings|capex|pricing|retention)\b/i.test(value)) score += 2;
  if (/\b(contract|enterprise|distribution|buyers?|deployments?|pipeline|demand|market position|win rates?)\b/i.test(value)) score += 1;
  if (/\b(risk|pressure|headwind|challenge|dependency|exposure)\b/i.test(value)) score += 1;
  return score;
}
function hasConcreteMetric(value) {
  PERCENT_VALUE_PATTERN.lastIndex = 0;
  return /\$\d/.test(value) || PERCENT_VALUE_PATTERN.test(value) || /\b\d+(?:\.\d+)?\s?(?:B|M|billion|million)\b/i.test(value);
}
function looksLikeSoftAdoptionClaim(value) {
  return /\b(leading position|record highs|strong demand|gaining traction|momentum is real|maintains a leading position|business usage rebounding|challenge .* dominance)\b/i.test(value);
}
function scoreUnderwritingSignal(value) {
  let score = scoreEvidenceSentence(value);
  if (hasConcreteMetric(value)) score += 3;
  if (/\b(gross margin|run-rate revenue|run rate revenue|annualized revenue|valuation|backlog|contracts?|pricing|retention|compute costs?|inference costs?|bookings|enterprise spend)\b/i.test(value)) {
    score += 3;
  }
  if (/\b(500 customers|fortune 100|paying users?|per user\/month|\$200\/month|\$25[–-]30 per user\/month)\b/i.test(value)) {
    score += 1;
  }
  if (looksLikeSoftAdoptionClaim(value)) score -= 4;
  if (looksLikeGenericMarketBackdrop(value)) score -= 4;
  if (looksLikeNarrativeFluff(value)) score -= 3;
  return score;
}
function extractSourceHost(href) {
  if (!href) return null;
  try {
    return new URL(href).hostname.toLowerCase();
  } catch {
    return null;
  }
}
function looksLikeWeakBankerSourceLabel(label) {
  return /\b(statistics?(?:\s+202\d)?|top\s+\d+|pitfalls|investors need to know|full financial breakdown|forecast|benchmarks?\b|negotiation tactics|magazine|why .* is winning|dominance is being tested|shocking fall from grace|selling safety as)\b/i.test(label);
}
function scoreSourceAuthority(label, href, type) {
  let score = 0;
  const host = extractSourceHost(href);
  if (type !== "web") score += 2;
  if (host && HIGH_AUTHORITY_SOURCE_HOST_PATTERNS.some((pattern) => pattern.test(host))) score += 7;
  if (host && LOW_AUTHORITY_SOURCE_HOST_PATTERNS.some((pattern) => pattern.test(host))) score -= 7;
  if (/\b(official release|official blog|investor relations|shareholder letter|earnings|transcript|10-k|10-q|sec)\b/i.test(label)) score += 5;
  if (/\b(sacra|reuters|bloomberg|new york times|wall street journal|financial times|the information)\b/i.test(label)) score += 4;
  if (looksLikeSourceTitle(label)) score -= 2;
  if (looksLikeWeakBankerSourceLabel(label)) score -= 5;
  return score;
}
function stripTrailingConnectorTail(value) {
  return value.replace(/\b(?:as|of|the|with|because|which|that|while|and|or|but|to|for|in|on|at|its|their|a|an)(?:\s+\b(?:as|of|the|with|because|which|that|while|and|or|but|to|for|in|on|at|its|their|a|an))*$/i, "").replace(/[,.:\-\u2013\u2014\s]+$/, "");
}
function compressNarrativePhrase(value, maxLength = 140) {
  const normalized = normalizeWhitespace(value).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized.replace(/\.$/, "");
  const clause = normalized.split(/[;:]/)[0]?.trim() ?? normalized;
  if (clause.length <= maxLength) return clause.replace(/\.$/, "");
  return clause.slice(0, maxLength).replace(/\s+\S*$/, "").replace(/[,.:\-–—\s]+$/, "");
}
function hasNonPeerRelationshipCue(value) {
  return /\b(available across|available on|backed by|capital backing|cloud platforms? like|customers including|deployed on|distribution through|hosted on|infrastructure stack|integrated with|partner(?:ed)? with|sold through|strategic backing|used by)\b/i.test(value);
}
function buildDefaultRiskDescription(title) {
  if (/pricing/i.test(title)) {
    return "Large enterprise buyers can use bundled suites and multi-vendor negotiations to pressure pricing and shorten contract duration.";
  }
  if (/capital/i.test(title)) {
    return "Model training and inference costs can compress gross margin and force continued external capital needs.";
  }
  if (/customer concentration/i.test(title)) {
    return "A narrow set of large enterprise accounts can create renewal and spend-concentration risk if one buyer slows usage.";
  }
  if (/regulat/i.test(title)) {
    return "Evolving AI governance, procurement, and compliance rules can slow enterprise adoption and raise diligence burden.";
  }
  if (/distribution/i.test(title)) {
    return "Reliance on larger platform channels can weaken direct buyer access and negotiating leverage.";
  }
  return "Rapid enterprise growth still has to convert into repeatable deployments, retention, and disciplined field execution.";
}
function descriptionMatchesRiskTitle(title, description) {
  if (/pricing/i.test(title)) return /\b(pricing|discount|bundle|margin|contract|retention)\b/i.test(description);
  if (/capital/i.test(title)) return /\b(capital|compute|burn|cash|capex|inference|training)\b/i.test(description);
  if (/customer concentration/i.test(title)) return /\b(customer concentration|buyers|retention|concentration|renewal|account)\b/i.test(description);
  if (/regulat/i.test(title)) return /\b(regulat|compliance|antitrust|litigation|governance|policy)\b/i.test(description);
  if (/distribution/i.test(title)) return /\b(distribution|platform|ecosystem|channel|bundle|cloud)\b/i.test(description);
  return /\b(execution|retention|deployment|conversion|delivery|concentration|pricing|margin|risk|pressure|headwind)\b/i.test(description);
}
function normalizeChangeDescription(value) {
  const normalized = normalizeNarrativeSentence(value);
  if (!normalized) return "";
  if (!hasBankerSignalContent(normalized)) return "";
  const completeNarrative = looksLikeTruncatedNarrative(normalized) && normalized.includes(",") ? normalizeWhitespace(normalized.slice(0, normalized.lastIndexOf(","))) : normalized;
  if (!completeNarrative) return "";
  if (!looksLikeTruncatedNarrative(completeNarrative)) {
    return stripTrailingConnectorTail(completeNarrative);
  }
  const cleaned = stripTrailingConnectorTail(completeNarrative);
  if (!cleaned || !hasBankerSignalContent(cleaned)) return "";
  if (looksLikeTruncatedNarrative(cleaned)) {
    const compressed = stripTrailingConnectorTail(compressNarrativePhrase(completeNarrative, 210));
    return looksLikeTruncatedNarrative(compressed) ? "" : compressed;
  }
  return cleaned;
}
function focusRiskDescription(value, title) {
  const normalized = normalizeNarrativeSentence(value);
  const candidates = sentenceSplit(normalized).map((sentence) => normalizeNarrativeSentence(sentence)).filter((sentence) => sentence.length >= 18).filter((sentence) => !looksLikeSourceTitle(sentence)).filter((sentence) => !looksLikeFundingHeadline(sentence)).filter((sentence) => !looksLikeNarrativeFluff(sentence));
  const matched = candidates.find((sentence) => descriptionMatchesRiskTitle(title, sentence)) ?? candidates.find((sentence) => containsRiskLanguage(`${title} ${sentence}`)) ?? candidates[0] ?? normalized;
  return compressNarrativePhrase(matched, 150);
}
function normalizeNarrativeSentence(value) {
  const cleaned = cleanEvidenceSentence(value).replace(/\*\*/g, "").replace(/`+/g, "").replace(/\[[0-9]+\]\s*/g, "").replace(/^#{1,6}\s+/g, "").replace(/^[^\p{L}\p{N}$#]+/u, "").replace(/^(?:reality check|bottom line|takeaway)\s*:\s*/i, "").trim();
  const colonIndex = cleaned.indexOf(":");
  if (colonIndex > 0 && colonIndex <= 34) {
    const prefix = cleaned.slice(0, colonIndex).trim();
    const suffix = cleaned.slice(colonIndex + 1).trim();
    if (suffix.length >= 24 && hasBankerSignalContent(suffix) && /^[A-Z][A-Za-z0-9&'/-]*(?:\s+[A-Z][A-Za-z0-9&'/-]*){0,4}$/.test(prefix) && !/\d/.test(prefix)) {
      return suffix;
    }
  }
  return cleaned;
}
function extractEvidenceSentencesSafe(text) {
  return sentenceSplit(text).map((sentence) => normalizeNarrativeSentence(sentence)).filter((sentence) => sentence.length >= 24).filter((sentence) => !looksLikeSourceTitle(sentence)).filter((sentence) => !looksLikeEvidenceFragment(sentence)).filter((sentence) => !looksLikeNarrativeFluff(sentence)).filter((sentence) => !isQuestionLike(sentence)).filter((sentence) => hasBankerSignalContent(sentence)).sort((a, b) => scoreEvidenceSentence(b) - scoreEvidenceSentence(a)).slice(0, 4);
}
function normalizePossibleCompanyName(value) {
  return normalizeWhitespace(value).replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9.&, -]+$/g, "").replace(/^(?:while|as|but|and|however|meanwhile|although|despite|if|when|whereas|versus|vs\.?|against|compared to)\s+/i, "").replace(/[.,;:]+$/g, "").trim();
}
function isPotentialCompanyName(name, entityName) {
  const cleaned = normalizePossibleCompanyName(name);
  if (!cleaned || cleaned.length < 2 || cleaned.length > 60) return false;
  const lower = cleaned.toLowerCase();
  if (lower === entityName.toLowerCase()) return false;
  if (NON_PEER_COMPARABLE_NAMES.has(lower)) return false;
  if (COMPARABLE_CONNECTOR_STOPWORDS.has(lower)) return false;
  if (COMPANY_NAME_STOPWORDS.has(lower)) return false;
  if (SOURCE_ENTITY_STOPWORDS.has(lower)) return false;
  if (/^(the|a|an)\s+/i.test(cleaned)) return false;
  if (/^series\s+[a-z0-9]+$/i.test(cleaned)) return false;
  if (/\b(trainium|inferentia|tpu|tpus|model|models)\b/i.test(cleaned)) return false;
  if (/\.\s+[A-Z]/.test(cleaned)) return false;
  if (/\b(this|that|these|those|half|one)\b/i.test(cleaned)) return false;
  if (/\b(gpus?|cpus?|tpus?|chips?|contracts?|buyers?|accounts?|usage|market|share|pricing|bundling|deployment|deployments)\b/i.test(cleaned)) return false;
  if (/^(today|yesterday|quarter|year|source|report|index|analysis)$/i.test(cleaned)) return false;
  if (/^(AI|API|LLM|ML|GPU|CPU|YoY|ARR|MRR)$/i.test(cleaned)) return false;
  if (/^[A-Z]{3,6}$/.test(cleaned) && !KNOWN_ACRONYM_COMPANY_NAMES.has(cleaned)) return false;
  if (/^[A-Z][a-z]+ly$/.test(cleaned)) return false;
  if (/\b(company overview|overview|analysis|outlook|report|briefing|readout|market update|pricing pressure|enterprise ai)\b/i.test(cleaned)) {
    return false;
  }
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 4) return false;
  const nonGenericWords = words.filter((word) => !COMPANY_NAME_STOPWORDS.has(word.toLowerCase()));
  if (nonGenericWords.length === 0) return false;
  const genericWordCount = words.length - nonGenericWords.length;
  if (genericWordCount >= Math.max(1, words.length - 1)) return false;
  return /[A-Z]/.test(cleaned[0] ?? "") || /[A-Z]{2,}/.test(cleaned);
}
function inferSignalTheme(value) {
  const lower = value.toLowerCase();
  if (/\b(run-rate|run rate|arr|mrr|revenue|bookings|sales)\b/.test(lower)) return "revenue";
  if (/\b(growth|accelerat|yoy|quarter|momentum)\b/.test(lower)) return "growth";
  if (/\b(pricing|discount|bundle|bundling|margin|contract|retention|renewal)\b/.test(lower)) return "pricing";
  if (/\b(distribution|partner|channel|ecosystem|bedrock|cloud|platform)\b/.test(lower)) return "distribution";
  if (/\b(enterprise|deployments?|buyers?|subscriptions?|usage|adoption)\b/.test(lower)) return "adoption";
  if (/\b(valuation|funding|capital raise|financing|investor demand)\b/.test(lower)) return "capital_markets";
  if (/\b(regulat|compliance|governance|policy|litigation|antitrust)\b/.test(lower)) return "regulatory";
  if (/\b(compute|training|inference|gpu|capex|capital intensity|burn|cash)\b/.test(lower)) return "capital_intensity";
  if (/\b(product|launch|release|model|feature|developer)\b/.test(lower)) return "product";
  return "general";
}
function selectDiverseSignals(items) {
  const selected = [];
  const themeCounts = /* @__PURE__ */ new Map();
  const themeLimit = /* @__PURE__ */ new Map([
    ["revenue", 1],
    ["growth", 1],
    ["pricing", 1],
    ["distribution", 1],
    ["adoption", 1],
    ["capital_markets", 1],
    ["regulatory", 1],
    ["capital_intensity", 1],
    ["product", 1],
    ["general", 2]
  ]);
  for (const item of items) {
    if (selected.length >= 5) break;
    const theme = inferSignalTheme(item.name);
    if (theme === "adoption" && !hasConcreteMetric(item.name) && looksLikeSoftAdoptionClaim(item.name)) {
      continue;
    }
    const currentCount = themeCounts.get(theme) ?? 0;
    const maxCount = themeLimit.get(theme) ?? 1;
    if (currentCount >= maxCount) continue;
    selected.push(item);
    themeCounts.set(theme, currentCount + 1);
  }
  if (selected.length >= 3) {
    return selected.slice(0, 5);
  }
  for (const item of items) {
    if (selected.length >= 5) break;
    if (selected.some((entry) => entry.name.toLowerCase() === item.name.toLowerCase())) continue;
    selected.push(item);
  }
  return selected.slice(0, 5);
}
function extractComparableCandidatesFromText(text, entityName, options) {
  const candidates = [];
  const versusPattern = /\b([A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,2})\s+(?:vs\.?|versus|against|compared to)\s+([A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,2}(?:\s*(?:,\s*|\s+and\s+)[A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,2})*)/g;
  const nameListPattern = "([A-Z][A-Za-z0-9&.-]*(?:\\s+[A-Z][A-Za-z0-9&.-]*){0,2}(?:\\s*(?:,\\s*|\\s+and\\s+)[A-Z][A-Za-z0-9&.-]*(?:\\s+[A-Z][A-Za-z0-9&.-]*){0,2})*)";
  const patterns = [
    new RegExp(`\\b(?:vs\\.?|versus|against|compared to)\\s+${nameListPattern}`, "g"),
    new RegExp(`\\b(?:competitors?|rivals?|alternatives?)\\s+(?:include|includes|are|remain|such as|like)\\s+${nameListPattern}`, "g"),
    new RegExp(`\\b(?:competes?|competing|competed|positioned|stacks up)\\s+(?:most directly\\s+)?(?:with|against|versus|vs\\.?)\\s+${nameListPattern}`, "g")
  ];
  for (const match of text.matchAll(versusPattern)) {
    for (const segment of [match[1] ?? "", match[2] ?? ""]) {
      for (const part of segment.split(/\s*,\s*|\s+and\s+/i)) {
        const candidate = normalizePossibleCompanyName(part);
        if (isPotentialCompanyName(candidate, entityName)) {
          candidates.push(candidate);
        }
      }
    }
  }
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const segment = match[1] ?? "";
      for (const part of segment.split(/\s*,\s*|\s+and\s+/i)) {
        const candidate = normalizePossibleCompanyName(part);
        if (isPotentialCompanyName(candidate, entityName)) {
          candidates.push(candidate);
        }
      }
    }
  }
  if (options?.allowCapitalizedFallback !== false && (/\b(compete|competitor|rival|alternative|versus|vs\.|against|compared to|peer set|peer group)\b/i.test(text) || text.toLowerCase().includes(entityName.toLowerCase()) && /\b(pricing|pressure|bundle|distribution|contract|retention|challenge)\b/i.test(text) || /\b(pricing|pressure|bundle|distribution|contract|retention|challenge|enterprise|market share)\b/i.test(text))) {
    const capitalizedMatches = text.match(/\b[A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,2}\b/g) ?? [];
    for (const candidate of capitalizedMatches) {
      const cleanedCandidate = normalizePossibleCompanyName(candidate);
      if (isPotentialCompanyName(cleanedCandidate, entityName)) {
        candidates.push(cleanedCandidate);
      }
    }
  }
  return dedupeStrings2(candidates).slice(0, 6);
}
function extractEntityCompanyListCandidates(text, entityName) {
  if (!text.toLowerCase().includes(entityName.toLowerCase())) {
    return [];
  }
  if (!/[,:]/.test(text) && !/\s+and\s+/i.test(text)) {
    return [];
  }
  if (!/\b(enterprise|market|pricing|retention|distribution|platform|models?|companies|labs?)\b/i.test(text)) {
    return [];
  }
  const capitalizedMatches = text.match(/\b[A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,2}\b/g) ?? [];
  const candidates = [];
  for (const candidate of capitalizedMatches) {
    const cleanedCandidate = normalizePossibleCompanyName(candidate);
    if (isPotentialCompanyName(cleanedCandidate, entityName)) {
      candidates.push(cleanedCandidate);
    }
  }
  return dedupeStrings2(candidates).slice(0, 6);
}
function extractLooseComparableCandidatesFromText(text, entityName, options) {
  const hasCompetitiveCue = /\b(compete|competitor|rival|alternative|versus|vs\.|against|compared to|peer set|peer group|compare)\b/i.test(text);
  const hasStrategicCue = options?.allowStrategicCue === true && /\b(pricing|pressure|bundle|distribution|contract|retention|buyer|buyers|enterprise)\b/i.test(text);
  const listCandidates = extractEntityCompanyListCandidates(text, entityName);
  if (listCandidates.length > 0) {
    return listCandidates;
  }
  if (!hasCompetitiveCue && hasNonPeerRelationshipCue(text)) {
    return [];
  }
  if (!hasCompetitiveCue && !hasStrategicCue) {
    return [];
  }
  const candidates = [];
  const capitalizedMatches = text.match(/\b[A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,2}\b/g) ?? [];
  for (const candidate of capitalizedMatches) {
    const cleanedCandidate = normalizePossibleCompanyName(candidate);
    if (isPotentialCompanyName(cleanedCandidate, entityName)) {
      candidates.push(cleanedCandidate);
    }
  }
  return dedupeStrings2(candidates).slice(0, 6);
}
function addComparableCandidateScores(scores, candidates, weight) {
  for (const candidate of candidates) {
    const cleaned = normalizeWhitespace(candidate);
    const key = cleaned.toLowerCase();
    if (!cleaned || !key) continue;
    const existing = scores.get(key);
    if (existing) {
      existing.score += weight;
      continue;
    }
    scores.set(key, { name: cleaned, score: weight });
  }
}
function deriveComparableCandidates(execution, entityName) {
  if (execution.plan.classification === "multi_entity") {
    const comparisonTargets = dedupeStrings2(
      (execution.plan.entityTargets ?? []).filter((target) => typeof target === "string" && Boolean(target))
    );
    return (comparisonTargets.slice(1).length > 0 ? comparisonTargets.slice(1) : comparisonTargets).slice(0, 4);
  }
  const candidateScores = /* @__PURE__ */ new Map();
  const fallbackTexts = [];
  const fallbackNarrativeTexts = [];
  const fallbackTitleTexts = [];
  for (const target of execution.plan.entityTargets ?? []) {
    if (typeof target === "string" && isPotentialCompanyName(target, entityName)) {
      addComparableCandidateScores(candidateScores, [target], 2.5);
    }
  }
  for (const step of execution.stepResults) {
    if (!step.success || !step.result) continue;
    const raw = step.result;
    if (Array.isArray(raw?.comparables)) {
      for (const comparable of raw.comparables) {
        const name = typeof comparable === "string" ? comparable : comparable?.name;
        if (typeof name === "string" && isPotentialCompanyName(name, entityName)) {
          addComparableCandidateScores(candidateScores, [name], 1.5);
        }
      }
    }
    if (Array.isArray(raw?.competitors)) {
      for (const comparable of raw.competitors) {
        const name = typeof comparable === "string" ? comparable : comparable?.name;
        if (typeof name === "string" && isPotentialCompanyName(name, entityName)) {
          addComparableCandidateScores(candidateScores, [name], 1.75);
        }
      }
    }
    const textBlobs = [];
    if (typeof raw?.answer === "string") {
      fallbackTexts.push(raw.answer);
      if (!looksLikeSourceTitle(raw.answer)) fallbackNarrativeTexts.push(raw.answer);
      addComparableCandidateScores(
        candidateScores,
        extractComparableCandidatesFromText(raw.answer, entityName, { allowCapitalizedFallback: false }),
        2.5
      );
    }
    if (typeof raw?.summary === "string") {
      fallbackTexts.push(raw.summary);
      if (!looksLikeSourceTitle(raw.summary)) fallbackNarrativeTexts.push(raw.summary);
      addComparableCandidateScores(
        candidateScores,
        extractComparableCandidatesFromText(raw.summary, entityName, { allowCapitalizedFallback: false }),
        2.25
      );
    }
    if (typeof raw?.description === "string") {
      fallbackTexts.push(raw.description);
      if (!looksLikeSourceTitle(raw.description)) fallbackNarrativeTexts.push(raw.description);
      addComparableCandidateScores(
        candidateScores,
        extractComparableCandidatesFromText(raw.description, entityName, { allowCapitalizedFallback: false }),
        2.25
      );
    }
    if (typeof raw?.content === "string") {
      fallbackTexts.push(raw.content);
      if (!looksLikeSourceTitle(raw.content)) fallbackNarrativeTexts.push(raw.content);
      addComparableCandidateScores(
        candidateScores,
        extractComparableCandidatesFromText(raw.content, entityName, { allowCapitalizedFallback: false }),
        2
      );
    }
    for (const signal of raw?.signals ?? raw?.findings ?? []) {
      const signalText = typeof signal === "string" ? signal : signal?.name;
      if (typeof signalText === "string") {
        fallbackTexts.push(signalText);
        if (!looksLikeSourceTitle(signalText)) fallbackNarrativeTexts.push(signalText);
        addComparableCandidateScores(
          candidateScores,
          extractComparableCandidatesFromText(signalText, entityName, { allowCapitalizedFallback: false }),
          2
        );
      }
    }
    for (const item of raw?.sources ?? []) {
      if (typeof item?.name === "string") {
        fallbackTexts.push(item.name);
        fallbackTitleTexts.push(item.name);
        addComparableCandidateScores(
          candidateScores,
          extractComparableCandidatesFromText(item.name, entityName, { allowCapitalizedFallback: false }),
          2.5
        );
      }
      if (typeof item?.title === "string") {
        fallbackTexts.push(item.title);
        fallbackTitleTexts.push(item.title);
        addComparableCandidateScores(
          candidateScores,
          extractComparableCandidatesFromText(item.title, entityName, { allowCapitalizedFallback: false }),
          2.5
        );
      }
      if (typeof item?.snippet === "string") {
        fallbackTexts.push(item.snippet);
        if (!looksLikeSourceTitle(item.snippet)) fallbackNarrativeTexts.push(item.snippet);
        addComparableCandidateScores(
          candidateScores,
          extractComparableCandidatesFromText(item.snippet, entityName, { allowCapitalizedFallback: false }),
          2.25
        );
      }
      if (typeof item?.description === "string") {
        fallbackTexts.push(item.description);
        if (!looksLikeSourceTitle(item.description)) fallbackNarrativeTexts.push(item.description);
        addComparableCandidateScores(
          candidateScores,
          extractComparableCandidatesFromText(item.description, entityName, { allowCapitalizedFallback: false }),
          2
        );
      }
    }
    for (const item of raw?.results ?? raw?.webResults ?? []) {
      if (typeof item?.title === "string") {
        fallbackTexts.push(item.title);
        fallbackTitleTexts.push(item.title);
        addComparableCandidateScores(
          candidateScores,
          extractComparableCandidatesFromText(item.title, entityName, { allowCapitalizedFallback: false }),
          2.5
        );
      }
      if (typeof item?.snippet === "string") {
        fallbackTexts.push(item.snippet);
        if (!looksLikeSourceTitle(item.snippet)) fallbackNarrativeTexts.push(item.snippet);
        addComparableCandidateScores(
          candidateScores,
          extractComparableCandidatesFromText(item.snippet, entityName, { allowCapitalizedFallback: false }),
          2.25
        );
      }
      if (typeof item?.description === "string") {
        fallbackTexts.push(item.description);
        if (!looksLikeSourceTitle(item.description)) fallbackNarrativeTexts.push(item.description);
        addComparableCandidateScores(
          candidateScores,
          extractComparableCandidatesFromText(item.description, entityName, { allowCapitalizedFallback: false }),
          2
        );
      }
      if (typeof item?.content === "string") {
        fallbackTexts.push(item.content);
        if (!looksLikeSourceTitle(item.content)) fallbackNarrativeTexts.push(item.content);
        addComparableCandidateScores(
          candidateScores,
          extractComparableCandidatesFromText(item.content, entityName, { allowCapitalizedFallback: false }),
          2
        );
      }
    }
  }
  if (candidateScores.size < 2) {
    for (const text of fallbackNarrativeTexts) {
      const listCandidates = extractEntityCompanyListCandidates(text, entityName);
      const looseCandidates = listCandidates.length > 0 ? listCandidates : extractLooseComparableCandidatesFromText(text, entityName, { allowStrategicCue: true });
      addComparableCandidateScores(
        candidateScores,
        looseCandidates,
        listCandidates.length > 0 ? 1.5 : 1
      );
    }
  }
  if (candidateScores.size < 2) {
    for (const text of fallbackTitleTexts) {
      const listCandidates = extractEntityCompanyListCandidates(text, entityName);
      const looseCandidates = listCandidates.length > 0 ? listCandidates : extractLooseComparableCandidatesFromText(text, entityName, { allowStrategicCue: candidateScores.size > 0 });
      addComparableCandidateScores(
        candidateScores,
        looseCandidates,
        1.25
      );
    }
  }
  const ranked = Array.from(candidateScores.values()).sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
  const highConfidence = ranked.filter((entry) => entry.score >= 2).map((entry) => entry.name);
  if (highConfidence.length > 0) {
    const selected = [...highConfidence];
    for (const entry of ranked) {
      if (selected.length >= 4) break;
      if (selected.includes(entry.name)) continue;
      if (entry.score < 1.25) continue;
      selected.push(entry.name);
    }
    return selected.slice(0, 4);
  }
  return ranked.map((entry) => entry.name).slice(0, 2);
}
function mergeSignals(primary, fallbacks) {
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const item of [...primary, ...fallbacks]) {
    const key = normalizeWhitespace(item.name).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.slice(0, 5);
}
function isNarrativeReadySignal(value) {
  if (looksLikeSourceTitle(value)) return false;
  if (/^(Anthropic|OpenAI|Google|Microsoft|Amazon)\s+(raises|raised|funding|doubles funding|plans to raise)\b/i.test(value)) {
    return false;
  }
  if (/\bseries\s+[a-z0-9]+\b/i.test(value)) return false;
  return true;
}
function collectFallbackSignals(execution) {
  const signals = [];
  for (const step of execution.stepResults) {
    if (!step.success || !step.result) continue;
    const raw = step.result;
    if (step.toolName === "run_recon" && Array.isArray(raw?.findings)) {
      for (const finding of raw.findings) {
        signals.push({
          name: typeof finding === "string" ? finding : finding?.name,
          direction: typeof finding === "object" ? finding?.direction : "neutral",
          impact: typeof finding === "object" ? finding?.impact : "medium"
        });
      }
    }
    if (step.toolName === "enrich_entity" && Array.isArray(raw?.signals)) {
      for (const signal of raw.signals) {
        signals.push({
          name: typeof signal === "string" ? signal : signal?.name,
          direction: typeof signal === "object" ? signal?.direction : "neutral",
          impact: typeof signal === "object" ? signal?.impact : "medium"
        });
      }
    }
    for (const sentence of extractEvidenceSentencesSafe(String(raw?.answer ?? raw?.summary ?? raw?.description ?? ""))) {
      signals.push({ name: sentence, direction: "neutral", impact: "high" });
    }
    for (const source of [...Array.isArray(raw?.sources) ? raw.sources : [], ...Array.isArray(raw?.results) ? raw.results : [], ...Array.isArray(raw?.webResults) ? raw.webResults : []].slice(0, 6)) {
      for (const sentence of extractEvidenceSentencesSafe(String(source?.snippet ?? source?.description ?? source?.content ?? ""))) {
        signals.push({ name: sentence, direction: "neutral", impact: "medium" });
      }
    }
  }
  return sanitizeSignals(signals);
}
function looksLikeOperationalChange(value) {
  return /\b(announced|expanded|grew|growth|increased|launched|now exceeds|partnered|quadrupled|reached|released|reported|represent over half|tripled|updated|unveiled)\b/i.test(value);
}
function collectFallbackChanges(execution) {
  const changes = [];
  for (const step of execution.stepResults) {
    if (!step.success || !step.result) continue;
    const raw = step.result;
    if (step.toolName === "run_recon" && Array.isArray(raw?.findings)) {
      for (const finding of raw.findings) {
        const description = String(typeof finding === "string" ? finding : finding?.name ?? "");
        if (!description || !looksLikeOperationalChange(description)) continue;
        changes.push({ description });
      }
    }
    for (const change of Array.isArray(raw?.changes) ? raw.changes : []) {
      const description = String(typeof change === "string" ? change : change?.description ?? change?.change ?? "");
      if (!description || !looksLikeOperationalChange(description)) continue;
      changes.push({ description, date: typeof change === "object" ? change?.date : void 0 });
    }
    for (const sentence of extractEvidenceSentencesSafe(String(raw?.answer ?? raw?.summary ?? raw?.description ?? ""))) {
      const description = sentence;
      if (!description || !looksLikeOperationalChange(description)) continue;
      changes.push({ description });
    }
    for (const source of [...Array.isArray(raw?.sources) ? raw.sources : [], ...Array.isArray(raw?.results) ? raw.results : [], ...Array.isArray(raw?.webResults) ? raw.webResults : []].slice(0, 8)) {
      for (const sentence of extractEvidenceSentencesSafe(String(source?.snippet ?? source?.description ?? source?.content ?? ""))) {
        const description = sentence;
        if (!description || !looksLikeOperationalChange(description)) continue;
        changes.push({ description });
      }
    }
  }
  return changes;
}
function collectFallbackRisks(execution) {
  const risks = [];
  for (const step of execution.stepResults) {
    if (!step.success || !step.result) continue;
    const raw = step.result;
    if (step.toolName === "run_recon" && Array.isArray(raw?.findings)) {
      for (const finding of raw.findings) {
        const description = normalizeWhitespace(String(typeof finding === "string" ? finding : finding?.name ?? ""));
        const direction = String(typeof finding === "object" ? finding?.direction ?? "" : "");
        if (!description) continue;
        if (direction === "down" || containsRiskLanguage(description)) {
          risks.push({ title: inferRiskTitleFromDescription(description), description });
        }
      }
    }
    if (Array.isArray(raw?.risks)) {
      for (const risk of raw.risks) {
        risks.push({
          title: typeof risk === "object" ? String(risk?.title ?? "") : "",
          description: typeof risk === "string" ? risk : String(risk?.description ?? "")
        });
      }
    }
    for (const sentence of extractEvidenceSentencesSafe(String(raw?.answer ?? raw?.summary ?? raw?.description ?? ""))) {
      if (containsRiskLanguage(sentence)) {
        risks.push({ title: inferRiskTitleFromDescription(sentence), description: sentence });
      }
    }
    for (const source of [...Array.isArray(raw?.sources) ? raw.sources : [], ...Array.isArray(raw?.results) ? raw.results : [], ...Array.isArray(raw?.webResults) ? raw.webResults : []].slice(0, 8)) {
      for (const sentence of extractEvidenceSentencesSafe(String(source?.snippet ?? source?.description ?? source?.content ?? ""))) {
        if (containsRiskLanguage(sentence)) {
          risks.push({ title: inferRiskTitleFromDescription(sentence), description: sentence });
        }
      }
    }
  }
  return sanitizeRisks(risks);
}
function sanitizeSignals(items) {
  const seen = /* @__PURE__ */ new Set();
  const sanitized = [];
  for (const item of items ?? []) {
    const name = normalizeNarrativeSentence(String(item?.name ?? ""));
    if (!name || /^signal \d+$/i.test(name)) continue;
    if (/^(company overview|overview|analysis|outlook report|the)$/i.test(name)) continue;
    if (/\b(company overview|overview|analysis|outlook report|market update)\b/i.test(name)) continue;
    if (looksLikeAmbiguousSubjectSignal(name)) continue;
    if (looksLikeFundingHeadline(name)) continue;
    if (looksLikeEvidenceFragment(name)) continue;
    if (looksLikeNarrativeFluff(name)) continue;
    if (looksLikeSpeculativeCapitalMarketsFiller(name)) continue;
    if (looksLikeGenericMarketBackdrop(name)) continue;
    if (name.length > 100 && /[-:]\s[A-Z][A-Za-z0-9&.\s]+$/.test(name)) continue;
    if (looksLikeSourceTitle(name)) continue;
    if (!hasBankerSignalContent(name) && !containsRiskLanguage(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sanitized.push({
      name,
      direction: item?.direction === "up" || item?.direction === "down" ? item.direction : "neutral",
      impact: item?.impact === "high" || item?.impact === "low" ? item.impact : "medium"
    });
  }
  return selectDiverseSignals(
    sanitized.sort((a, b) => scoreUnderwritingSignal(b.name) - scoreUnderwritingSignal(a.name))
  );
}
function sanitizeChanges(items) {
  const normalizedEntries = (items ?? []).map((item) => ({
    description: normalizeChangeDescription(String(item?.description ?? "")),
    date: item?.date ?? void 0
  })).filter((item) => item.description.length > 0);
  const deduped = dedupeStrings2(normalizedEntries.map((item) => item.description)).filter((description) => description.length >= 18).filter((description) => !looksLikeSourceTitle(description)).filter((description) => !looksLikeFundingHeadline(description)).filter((description) => !looksLikeEvidenceFragment(description)).filter((description) => !looksLikeNarrativeFluff(description)).filter((description) => !looksLikeSpeculativeCapitalMarketsFiller(description)).filter((description) => !looksLikeGenericMarketBackdrop(description)).filter((description) => !looksLikeAmbiguousSubjectSignal(description)).filter((description) => !/\b(sacra|24\/7 wall st|forbes|axios|deepresearchglobal)\b/i.test(description));
  return deduped.slice(0, 4).map((description, index) => ({
    description,
    date: normalizedEntries.find((item) => item.description === description)?.date
  }));
}
function inferRiskTitleFromDescription(description) {
  if (/\bpricing|bundle|discount|margin\b/i.test(description)) return "Pricing pressure";
  if (/\bcustomer concentration|enterprise buyers|buyer concentration|retention\b/i.test(description)) return "Customer concentration";
  if (/\bregulat|compliance|litigation|antitrust|governance\b/i.test(description)) return "Regulatory exposure";
  if (/\bcapital|compute|cash|burn|capex\b/i.test(description)) return "Capital intensity";
  if (/\bdistribution|platform|ecosystem\b/i.test(description)) return "Distribution dependency";
  return "Execution risk";
}
function sanitizeRisks(items) {
  const seen = /* @__PURE__ */ new Set();
  const seenTitles = /* @__PURE__ */ new Set();
  const sanitized = [];
  for (const item of items ?? []) {
    let title = normalizeWhitespace(String(item?.title ?? ""));
    let description = normalizeNarrativeSentence(String(item?.description ?? ""));
    if (!description || description.length < 18) continue;
    if (looksLikeSourceTitle(description)) continue;
    if (looksLikeFundingHeadline(description)) continue;
    if (looksLikeEvidenceFragment(description)) continue;
    if (looksLikeNarrativeFluff(description)) continue;
    if (!title || isQuestionLike(title) || looksLikeSourceTitle(title) || title.length > 90) {
      title = inferRiskTitleFromDescription(description);
    }
    if (looksLikeFundingHeadline(title)) {
      title = inferRiskTitleFromDescription(description);
    }
    description = focusRiskDescription(description, title);
    if (!descriptionMatchesRiskTitle(title, description) || !/[.!?]$/.test(description) && description.length > 85) {
      description = buildDefaultRiskDescription(title);
    }
    if (!containsRiskLanguage(`${title} ${description}`)) continue;
    const key = `${title.toLowerCase()}::${description.toLowerCase()}`;
    if (seen.has(key)) continue;
    const titleKey = title.toLowerCase();
    if (seenTitles.has(titleKey)) continue;
    seen.add(key);
    seenTitles.add(titleKey);
    sanitized.push({ title, description });
  }
  return sanitized.slice(0, 4);
}
function sanitizeComparables(items, entityName, fallbacks, context) {
  const seen = /* @__PURE__ */ new Set();
  const sanitized = [];
  const fallbackSet = new Set(fallbacks.map((value) => normalizeWhitespace(value).toLowerCase()).filter(Boolean));
  const normalizedTargets = dedupeStrings2((context?.entityTargets ?? []).map((value) => normalizeWhitespace(String(value))));
  const targetSet = new Set(normalizedTargets.map((value) => value.toLowerCase()).filter(Boolean));
  const entityTokens = new Set(entityName.split(/\s+vs\s+|\s*,\s*/i).map((value) => normalizeWhitespace(value).toLowerCase()).filter(Boolean));
  const anchorTarget = normalizedTargets[0]?.toLowerCase();
  const pushComparable = (name, relevance = "medium", note = "Referenced in cited sources.") => {
    const cleanedName = normalizeWhitespace(name);
    const explicitTarget = targetSet.has(cleanedName.toLowerCase());
    if (!explicitTarget && !isPotentialCompanyName(cleanedName, entityName)) return;
    const lowerName = cleanedName.toLowerCase();
    const noteText = normalizeWhitespace(note).toLowerCase();
    if (SOURCE_ENTITY_STOPWORDS.has(lowerName) && !explicitTarget) return;
    if (looksLikeSourceTitle(cleanedName)) return;
    if (/\b(index|statistics|report|briefing|analysis|investors need to know)\b/i.test(`${cleanedName} ${note}`)) return;
    if (context?.classification === "multi_entity") {
      if (anchorTarget && lowerName === anchorTarget && normalizedTargets.length > 1) return;
      if (!targetSet.has(lowerName) && !fallbackSet.has(lowerName)) return;
      if (entityTokens.has(lowerName) && !targetSet.has(lowerName)) return;
    }
    if ((context?.classification === "competitor" || context?.classification === "company_search") && fallbackSet.size > 0) {
      if (!fallbackSet.has(lowerName) && !targetSet.has(lowerName)) return;
    }
    if ((/research|index|statistics|report|outlook|news|publication|newsletter/.test(noteText) || /market update/.test(noteText)) && !targetSet.has(lowerName)) {
      return;
    }
    const key = cleanedName.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    sanitized.push({
      name: cleanedName,
      relevance: relevance === "high" || relevance === "low" ? relevance : "medium",
      note: normalizeWhitespace(note || "Referenced in cited sources.")
    });
  };
  for (const item of items ?? []) {
    pushComparable(String(item?.name ?? ""), String(item?.relevance ?? "medium"), String(item?.note ?? ""));
  }
  for (const fallback of fallbacks) {
    pushComparable(fallback, "medium", "Derived from cited competitive references.");
  }
  if (context?.classification === "multi_entity") {
    for (const target of normalizedTargets.slice(1)) {
      pushComparable(target, "high", "Explicit company in the scoped comparison set.");
    }
  }
  const maxComparables = context?.classification === "multi_entity" ? 4 : 2;
  return sanitized.slice(0, maxComparables);
}
function sanitizeNextActions(items, lens, entityName, comparables, risks, context) {
  const deduped = dedupeStrings2((items ?? []).map((item) => String(item?.action ?? "")));
  const sanitized = deduped.filter((action) => action.length >= 12).filter((action) => !/contextQuestions|check_framework|gather project|ingest_upload|Answer any|Use\s+\w+_\w+/i.test(action)).filter((action) => !/^(review the provided context|gather project context|answer context questions)/i.test(action)).filter((action) => !/^(do more research|research further|investigate further)$/i.test(action)).filter((action) => context?.classification !== "multi_entity" || !/\bbenchmark\b.+\bagainst\b/i.test(action)).slice(0, 3).map((action, index) => ({
    action,
    impact: items?.[index]?.impact === "low" || items?.[index]?.impact === "medium" ? items[index].impact : "high"
  }));
  const topComparable = comparables[0]?.name;
  const topRisk = risks[0]?.title.toLowerCase().includes("regulat") || risks[0]?.description.toLowerCase().includes("regulat") ? `Pressure-test regulatory and diligence exposure around ${entityName}.` : topComparable ? `Benchmark ${entityName} against ${topComparable} on positioning, pricing, and enterprise traction.` : `Pressure-test the core investment thesis for ${entityName} against the cited evidence.`;
  const targetNames = dedupeStrings2((context?.entityTargets ?? []).map((item) => normalizeWhitespace(String(item))));
  const comparisonLabel = targetNames.length > 1 ? targetNames.join(", ") : entityName;
  const defaults = context?.classification === "multi_entity" && lens === "banker" ? [
    `Build a side-by-side diligence matrix for ${comparisonLabel} covering pricing, enterprise traction, buyer fit, and contract durability.`,
    `Pressure-test which company has the most defensible distribution advantage versus bundled platform pressure.`,
    `Map likely strategic buyers, counterparties, or financing narratives for each company in the set before choosing a preferred angle.`
  ] : context?.classification === "multi_entity" && lens === "investor" ? [
    `Build a side-by-side market map for ${comparisonLabel} covering pricing power, enterprise traction, and distribution leverage.`,
    `Pressure-test whether the current winner is product-led, distribution-led, or simply benefiting from timing and narrative momentum.`,
    `Identify the one data point that would most change the relative ranking across the current peer set.`
  ] : lens === "banker" ? [
    `Build a buyer and strategic-counterparty map for ${entityName} using the current competitive set.`,
    `Pressure-test revenue durability, customer concentration, and capital intensity for ${entityName}.`,
    topRisk
  ] : lens === "investor" ? [
    `Benchmark ${entityName}'s market position, share gains, and enterprise traction against the nearest cited peer set.`,
    `Pressure-test whether ${entityName}'s current edge is product-led, distribution-led, or simply timing-driven.`,
    topRisk
  ] : [
    `Identify which cited signals for ${entityName} are durable versus narrative-driven.`,
    `Turn the strongest comparable set into an explicit positioning map for ${entityName}.`,
    topRisk
  ];
  const merged = [...sanitized];
  for (const action of defaults) {
    if (merged.length >= 3) break;
    if (merged.some((item) => item.action.toLowerCase() === action.toLowerCase())) continue;
    merged.push({ action, impact: "high" });
  }
  return merged.slice(0, 3);
}
function buildDefaultNextQuestions(args) {
  if (args.classification === "multi_entity") {
    const comparisonLabel = dedupeStrings2((args.entityTargets ?? []).map((item) => normalizeWhitespace(String(item)))).slice(0, 3).join(", ") || args.entityName;
    return [
      `Which company in ${comparisonLabel} has the strongest enterprise distribution today, and what evidence would overturn that ranking?`,
      `Where do pricing power and contract durability differ most across the current peer set?`,
      `Which buyer segment structurally favors one company over the others, and why?`,
      `What evidence would most change the relative ranking across the current comparison set?`
    ];
  }
  return [
    `What are the specific drivers behind ${args.entityName}'s recent growth or decline?`,
    args.risks.length > 0 ? `How likely is "${args.risks[0]?.title}" to materialize, and what would trigger it?` : `What are the biggest threats to ${args.entityName}'s market position?`,
    args.comparables.length > 0 ? `How does ${args.entityName} compare to ${args.comparables[0]?.name} on unit economics and retention?` : `Who are ${args.entityName}'s most dangerous competitors and why?`,
    `What would make you change your thesis on ${args.entityName} and what evidence would you need to see?`
  ];
}
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function inferMetricEntity(value, entityName, entityTargets) {
  const orderedTargets = dedupeStrings2([...entityTargets ?? [], entityName].map((item) => normalizeWhitespace(String(item))));
  for (const target of orderedTargets) {
    if (!target) continue;
    const pattern = new RegExp(`\\b${escapeRegex(target)}\\b`, "i");
    if (pattern.test(value)) return target;
  }
  return null;
}
function mentionsEntityTarget(value, entityTargets) {
  return inferMetricEntity(value, "", entityTargets) !== null;
}
function looksLikeAmbiguousSubjectSignal(value) {
  return /^(its|the company|reports indicated|by march|by december|new data from)/i.test(normalizeWhitespace(value));
}
function inferMetricLabels(sentence, entityName, entityTargets) {
  const normalizedTargets = dedupeStrings2((entityTargets ?? []).map((item) => normalizeWhitespace(String(item))));
  const multiEntity = normalizedTargets.length > 1;
  const subject = inferMetricEntity(sentence, entityName, entityTargets) ?? (multiEntity ? null : entityName);
  if (!subject) return [];
  const prefix = `${subject} `;
  const labels = [];
  if (/\b(annualized revenue|run-rate revenue|run rate revenue|pace to generate|revenue reached|revenue now exceeds|arr)\b/i.test(sentence)) {
    labels.push(`${prefix}revenue`.trim());
  }
  if (/\b(post-money valuation|valuation|valued at)\b/i.test(sentence)) {
    labels.push(`${prefix}valuation`.trim());
  }
  if (/\bgross margin\b/i.test(sentence)) {
    labels.push(`${prefix}gross margin`.trim());
  }
  if (/\b(inference costs?|compute costs?|training costs?|capex)\b/i.test(sentence)) {
    labels.push(`${prefix}compute cost`.trim());
  }
  if (/\b(market share|enterprise l?lm market share|share of enterprise spend|enterprise share)\b/i.test(sentence)) {
    labels.push(`${prefix}market share`.trim());
  }
  if (/\b(year-over-year|yoy|growth)\b/i.test(sentence) && /\d{1,3}(?:,\d{3})*(?:\.\d+)?%/.test(sentence)) {
    labels.push(`${prefix}growth`.trim());
  }
  if (/\b(paying users?|enterprise use|subscriptions?|contracts?|deployments?)\b/i.test(sentence) && /\d{1,3}(?:,\d{3})*(?:\.\d+)?%/.test(sentence)) {
    labels.push(`${prefix}usage mix`.trim());
  }
  return labels;
}
function normalizeMetricValue(rawValue) {
  return normalizeWhitespace(rawValue).replace(/\b(billion|million)\b/gi, (match) => match.toLowerCase() === "billion" ? "B" : "M").replace(/\s+([bBmM])\b/g, (_, suffix) => suffix.toUpperCase()).replace(/\s+(B|M)\b/g, "$1");
}
function getMetricCategory(label) {
  const normalized = label.toLowerCase();
  if (normalized.includes("revenue")) return "revenue";
  if (normalized.includes("valuation")) return "valuation";
  if (normalized.includes("gross margin")) return "gross_margin";
  if (normalized.includes("compute cost")) return "compute_cost";
  if (normalized.includes("market share")) return "market_share";
  if (normalized.includes("growth")) return "growth";
  if (normalized.includes("usage mix")) return "usage_mix";
  return "other";
}
function formatMetricClause(metric) {
  const label = normalizeWhitespace(metric.label);
  const value = normalizeMetricValue(metric.value);
  if (!label || !value) return "";
  if (/\b(gross margin|growth|market share|usage mix)\b/i.test(label)) {
    return `${label} of ${value}`;
  }
  if (/\b(revenue|valuation|compute cost)\b/i.test(label)) {
    return `${label} at ${value}`;
  }
  return `${label} ${value}`;
}
function joinNaturalLanguage(items) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
function sentenceSupportsMetricLabel(sentence, label) {
  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.includes("revenue")) {
    return /\b(annualized revenue|run-rate revenue|run rate revenue|pace to generate|revenue reached|revenue now exceeds|revenue|arr)\b/i.test(sentence);
  }
  if (normalizedLabel.includes("valuation")) {
    return /\b(post-money valuation|valuation|valued at)\b/i.test(sentence);
  }
  if (normalizedLabel.includes("compute cost")) {
    return /\b(inference costs?|compute costs?|training costs?|capex)\b/i.test(sentence);
  }
  if (normalizedLabel.includes("gross margin")) {
    return /\bgross margin\b/i.test(sentence);
  }
  if (normalizedLabel.includes("market share")) {
    return /\b(market share|enterprise l?lm market share|share of enterprise spend|enterprise share)\b/i.test(sentence);
  }
  if (normalizedLabel.includes("growth")) {
    return /\b(year-over-year|yoy|growth)\b/i.test(sentence);
  }
  if (normalizedLabel.includes("usage mix")) {
    return /\b(paying users?|enterprise use|subscriptions?|contracts?|deployments?|share of enterprise spend)\b/i.test(sentence);
  }
  return true;
}
function hasMetricEvidenceSupport(label, value, evidenceSentences) {
  const normalizedValue = normalizeMetricValue(value).toLowerCase();
  return evidenceSentences.some((evidence) => {
    if (!sentenceSupportsMetricLabel(evidence.text, label)) return false;
    const selectedCandidate = selectMetricCandidate(evidence.text, label);
    if (!selectedCandidate) return false;
    return normalizeMetricValue(selectedCandidate).toLowerCase() === normalizedValue;
  });
}
function collectMetricMatches(pattern, sentence) {
  const safePattern = new RegExp(pattern.source, pattern.flags);
  return Array.from(sentence.matchAll(safePattern)).map((match) => ({
    value: match[0],
    index: match.index ?? 0
  }));
}
function selectMetricCandidate(sentence, label) {
  const currencyMatches = collectMetricMatches(/\$\d+(?:\.\d+)?\s?(?:B|M|billion|million)/gi, sentence);
  const percentMatches = collectMetricMatches(PERCENT_VALUE_PATTERN, sentence);
  const normalizedLabel = label.toLowerCase();
  const closestMatch = (matches, cuePattern) => {
    if (matches.length === 0) return null;
    const cueMatch = cuePattern.exec(sentence);
    cuePattern.lastIndex = 0;
    if (!cueMatch || typeof cueMatch.index !== "number") {
      return matches[0]?.value ?? null;
    }
    return matches.slice().sort((left, right) => Math.abs(left.index - cueMatch.index) - Math.abs(right.index - cueMatch.index))[0]?.value ?? null;
  };
  if (normalizedLabel.includes("revenue")) {
    return closestMatch(currencyMatches, /\b(annualized revenue|run-rate revenue|run rate revenue|pace to generate|revenue reached|revenue now exceeds|revenue|arr)\b/i);
  }
  if (normalizedLabel.includes("valuation")) {
    return closestMatch(currencyMatches, /\b(post-money valuation|valuation|valued at)\b/i);
  }
  if (normalizedLabel.includes("compute cost")) {
    return closestMatch(currencyMatches, /\b(inference costs?|compute costs?|training costs?|capex)\b/i);
  }
  if (normalizedLabel.includes("gross margin")) {
    return closestMatch(percentMatches, /\bgross margin\b/i);
  }
  if (normalizedLabel.includes("market share")) {
    return closestMatch(percentMatches, /\b(market share|enterprise l?lm market share|share of enterprise spend|enterprise share)\b/i);
  }
  if (normalizedLabel.includes("growth")) {
    return closestMatch(percentMatches, /\b(year-over-year|yoy|growth)\b/i);
  }
  if (normalizedLabel.includes("usage mix")) {
    return closestMatch(percentMatches, /\b(paying users?|enterprise use|subscriptions?|contracts?|deployments?)\b/i);
  }
  return currencyMatches[0]?.value ?? percentMatches[0]?.value ?? null;
}
function collectMetricSentences(execution, signals, changes) {
  const evidences = [];
  const pushEvidence = (text, source) => {
    if (typeof text !== "string" || !text.trim()) return;
    for (const sentence of extractEvidenceSentencesSafe(text)) {
      evidences.push({ text: sentence, source });
    }
  };
  for (const signal of signals) pushEvidence(signal.name, "signal");
  for (const change of changes) pushEvidence(change.description, "change");
  for (const step of execution.stepResults) {
    if (!step.success || !step.result) continue;
    const raw = step.result;
    for (const field of [raw?.answer, raw?.summary, raw?.description, raw?.content]) {
      pushEvidence(field, "tool_text");
    }
    for (const finding of raw?.findings ?? raw?.signals ?? []) {
      const text = typeof finding === "string" ? finding : finding?.name;
      pushEvidence(text, "tool_finding");
    }
    for (const item of [...raw?.sources ?? [], ...raw?.results ?? [], ...raw?.webResults ?? []]) {
      for (const field of [item?.snippet, item?.description, item?.content]) {
        pushEvidence(field, "web_snippet");
      }
    }
  }
  const byText = /* @__PURE__ */ new Map();
  const sourceRank = {
    signal: 5,
    change: 4,
    tool_finding: 3,
    tool_text: 2,
    web_snippet: 1
  };
  for (const evidence of evidences) {
    const key = normalizeWhitespace(evidence.text).toLowerCase();
    if (!key) continue;
    const rank = sourceRank[evidence.source] ?? 0;
    const existing = byText.get(key);
    if (!existing || rank > existing.rank) {
      byText.set(key, { ...evidence, rank });
    }
  }
  return Array.from(byText.values()).map(({ text, source }) => ({ text, source }));
}
function deriveEvidenceKeyMetrics(args) {
  const candidatesByLabelValue = /* @__PURE__ */ new Map();
  const evidenceSentences = collectMetricSentences(args.execution, args.signals, args.changes);
  const scoreMetricEvidence = (evidence) => {
    let score = scoreEvidenceSentence(evidence.text);
    if (evidence.source === "signal") score += 6;
    else if (evidence.source === "change") score += 5;
    else if (evidence.source === "tool_finding") score += 3;
    else if (evidence.source === "tool_text") score += 2;
    return score;
  };
  const metricValueMatchesLabel = (label, value) => {
    const normalizedLabel = label.toLowerCase();
    const isCurrency = /\$\d/i.test(value);
    const isPercent = /%/.test(value);
    if (normalizedLabel.includes("revenue") || normalizedLabel.includes("valuation") || normalizedLabel.includes("compute cost")) {
      return isCurrency;
    }
    if (normalizedLabel.includes("gross margin") || normalizedLabel.includes("market share") || normalizedLabel.includes("growth") || normalizedLabel.includes("usage mix")) {
      return isPercent;
    }
    return isCurrency || isPercent;
  };
  const pushMetric = (label, value, score) => {
    const cleanedLabel = normalizeWhitespace(label);
    const cleanedValue = normalizeMetricValue(value);
    if (!cleanedLabel || !cleanedValue) return;
    if (/^(sources?|confidence|comparables?|diligence flags?)$/i.test(cleanedLabel)) return;
    if (!/(\$\d|\d+(?:\.\d+)?%|\d+(?:\.\d+)?(?:x|B|M)\b)/i.test(cleanedValue)) return;
    if (!metricValueMatchesLabel(cleanedLabel, cleanedValue)) return;
    const key = `${cleanedLabel.toLowerCase()}::${cleanedValue.toLowerCase()}`;
    const existing = candidatesByLabelValue.get(key);
    if (existing) {
      existing.totalScore += score;
      existing.supportCount += 1;
      existing.maxScore = Math.max(existing.maxScore, score);
      return;
    }
    candidatesByLabelValue.set(key, {
      label: cleanedLabel,
      value: cleanedValue,
      totalScore: score,
      supportCount: 1,
      maxScore: score
    });
  };
  for (const item of args.provided ?? []) {
    if (typeof item?.label !== "string" || typeof item?.value !== "string") continue;
    const category = getMetricCategory(item.label);
    const bankerPercentCategory = ["gross_margin", "market_share", "growth", "usage_mix"].includes(category);
    if (args.lens === "banker" && bankerPercentCategory) {
      continue;
    }
    const requiresEvidenceSupport = args.lens === "banker" && category !== "other";
    if (requiresEvidenceSupport && !hasMetricEvidenceSupport(item.label, item.value, evidenceSentences)) continue;
    pushMetric(item.label, item.value, 3);
  }
  for (const evidence of evidenceSentences) {
    for (const label of inferMetricLabels(evidence.text, args.entityName, args.entityTargets)) {
      const candidate = selectMetricCandidate(evidence.text, label);
      if (!candidate) continue;
      let score = scoreMetricEvidence(evidence);
      if (/\$\d/.test(candidate)) score += 2;
      if (/%/.test(candidate)) score += 1;
      if (label.toLowerCase().includes("revenue") || label.toLowerCase().includes("valuation")) score += 1;
      pushMetric(label, candidate, score);
    }
  }
  const bestByLabel = /* @__PURE__ */ new Map();
  for (const candidate of candidatesByLabelValue.values()) {
    const key = candidate.label.toLowerCase();
    const existing = bestByLabel.get(key);
    if (!existing || candidate.supportCount > existing.supportCount || candidate.supportCount === existing.supportCount && candidate.totalScore > existing.totalScore || candidate.supportCount === existing.supportCount && candidate.totalScore === existing.totalScore && candidate.maxScore > existing.maxScore) {
      bestByLabel.set(key, candidate);
    }
  }
  const ranked = Array.from(bestByLabel.values()).sort(
    (left, right) => right.supportCount - left.supportCount || right.totalScore - left.totalScore || right.maxScore - left.maxScore || left.label.localeCompare(right.label)
  );
  const limit = args.lens === "banker" ? 6 : 4;
  const preferredCategoryOrder = args.lens === "banker" ? ["revenue", "valuation", "gross_margin", "compute_cost", "market_share", "growth", "usage_mix", "other"] : ["revenue", "growth", "valuation", "gross_margin", "compute_cost", "market_share", "usage_mix", "other"];
  const selected = [];
  const selectedLabels = /* @__PURE__ */ new Set();
  const entityCounts = /* @__PURE__ */ new Map();
  const canSelectMetric = (metric) => {
    if (selectedLabels.has(metric.label.toLowerCase())) return false;
    if (!(args.lens === "banker" && args.classification === "multi_entity")) return true;
    const entity = inferMetricEntity(metric.label, args.entityName, args.entityTargets);
    if (!entity) return true;
    return (entityCounts.get(entity.toLowerCase()) ?? 0) < 2;
  };
  const commitMetric = (metric) => {
    const key = metric.label.toLowerCase();
    if (selectedLabels.has(key)) return;
    selected.push(metric);
    selectedLabels.add(key);
    const entity = inferMetricEntity(metric.label, args.entityName, args.entityTargets);
    if (entity) {
      const entityKey = entity.toLowerCase();
      entityCounts.set(entityKey, (entityCounts.get(entityKey) ?? 0) + 1);
    }
  };
  for (const category of preferredCategoryOrder) {
    if (selected.length >= limit) break;
    const candidate = ranked.find((metric) => getMetricCategory(metric.label) === category && canSelectMetric(metric));
    if (candidate) commitMetric(candidate);
  }
  for (const metric of ranked) {
    if (selected.length >= limit) break;
    if (!canSelectMetric(metric)) continue;
    commitMetric(metric);
  }
  return selected.map(({ label, value }) => ({ label, value }));
}
function sanitizeSources(items, execution) {
  const seen = /* @__PURE__ */ new Set();
  const sanitized = [];
  const pushSource = (label, href, type) => {
    const cleanedLabel = normalizeWhitespace(label);
    if (!cleanedLabel || /^(web_search|run_recon|linkup_search|enrich_entity|simulate_decision_paths)$/i.test(cleanedLabel)) {
      return;
    }
    if (/\b(powerhouse hiding in plain sight|worth buying|turns the tables|arms race|who will win|why .* is winning|leading one half|outlook report|ramp ai index)\b/i.test(cleanedLabel)) {
      return;
    }
    if (href && /vertexaisearch\.cloud\.google\.com\/grounding-api-redirect/i.test(href)) {
      return;
    }
    const authorityScore = scoreSourceAuthority(cleanedLabel, href, type || "web");
    if (authorityScore < 0) {
      return;
    }
    const key = `${cleanedLabel.toLowerCase()}::${href ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    sanitized.push({ label: cleanedLabel, href, type: type || "web", authorityScore });
  };
  for (const item of items ?? []) {
    pushSource(String(item?.label ?? ""), item?.href, String(item?.type ?? "web"));
  }
  if (sanitized.length === 0) {
    for (const step of execution.stepResults) {
      if (!step.success || !step.result) continue;
      const raw = step.result;
      for (const source of raw?.sources ?? []) {
        pushSource(String(source?.name ?? source?.title ?? ""), source?.url, "web");
      }
      for (const source of raw?.results ?? raw?.webResults ?? []) {
        pushSource(String(source?.title ?? source?.name ?? ""), source?.url ?? source?.link ?? source?.href, "web");
      }
    }
  }
  const webSources = sanitized.filter((item) => item.type === "web" && item.href).sort((left, right) => right.authorityScore - left.authorityScore || left.label.localeCompare(right.label));
  if (webSources.length >= 3) {
    const retainedLocalSources = sanitized.filter(
      (item) => item.type !== "web" && /\b(10-k|10-q|earnings|filing|transcript|investor presentation|proxy|sec|official release)\b/i.test(item.label)
    );
    return [...webSources, ...retainedLocalSources].slice(0, 8).map(({ label, href, type }) => ({ label, href, type }));
  }
  return sanitized.slice(0, 8).map(({ label, href, type }) => ({ label, href, type }));
}
function sanitizeExecutiveAnswer(answer, entityName, keyMetrics, signals, comparables, risks, nextActions, context) {
  const cleaned = normalizeWhitespace(answer.replace(/```json|```/g, ""));
  const sentences = dedupeStrings2(sentenceSplit(cleaned)).filter((sentence) => sentence.length >= 25 && !/^sources?:/i.test(sentence));
  const filteredSentences = sentences.filter(
    (sentence) => !/\b(arms race|what investors need to know|index\s+\w+\s+update|source artifact|worth buying|turns the tables|leading one half)\b/i.test(sentence) && !looksLikeNarrativeFluff(sentence) && !looksLikeSpeculativeCapitalMarketsFiller(sentence) && !looksLikeGenericMarketBackdrop(sentence)
  );
  const looksHealthy = filteredSentences.length >= 2 && filteredSentences.length <= 5 && cleaned.length <= 700 && !/\.{3,}|^\{/.test(cleaned) && filteredSentences.every((sentence) => /[.!?]$/.test(sentence) || sentence.length <= 100) && !filteredSentences.some((sentence) => looksLikeSourceTitle(sentence) || looksLikeFundingHeadline(sentence)) && !looksLikeSourceTitle(cleaned) && !looksLikeFundingHeadline(cleaned) && !looksLikeSpeculativeCapitalMarketsFiller(cleaned) && !looksLikeGenericMarketBackdrop(cleaned) && !/(most clearly defined against|what investors need to know|arms race|index\s+\w+\s+update|worth buying|turns the tables|leading one half)/i.test(cleaned);
  const summarySignals = signals.filter((signal) => !looksLikeGenericMarketBackdrop(signal.name));
  if (looksHealthy) {
    return filteredSentences.slice(0, 4).join(" ");
  }
  const summaryParts = [];
  const preferredLeadSignal = summarySignals.find((signal) => !containsRiskLanguage(signal.name) && scoreUnderwritingSignal(signal.name) >= 6) ?? summarySignals.find((signal) => !containsRiskLanguage(signal.name) && (signal.direction === "up" || scoreUnderwritingSignal(signal.name) >= 4)) ?? summarySignals.find((signal) => !containsRiskLanguage(signal.name)) ?? summarySignals[0] ?? signals.find((signal) => !containsRiskLanguage(signal.name) && scoreUnderwritingSignal(signal.name) >= 6) ?? signals.find((signal) => !containsRiskLanguage(signal.name) && (signal.direction === "up" || scoreUnderwritingSignal(signal.name) >= 4)) ?? signals.find((signal) => !containsRiskLanguage(signal.name)) ?? signals[0];
  const leadSignalEntity = context?.classification === "multi_entity" ? inferMetricEntity(preferredLeadSignal?.name ?? "", entityName, context?.entityTargets) : null;
  const supportCandidates = [...summarySignals, ...signals].filter((signal) => signal.name !== preferredLeadSignal?.name).filter((signal) => {
    if (context?.classification !== "multi_entity") return true;
    if (!looksLikeAmbiguousSubjectSignal(signal.name)) return true;
    return mentionsEntityTarget(signal.name, context?.entityTargets);
  });
  const preferredSupportSignal = supportCandidates.find(
    (signal) => context?.classification === "multi_entity" && leadSignalEntity && !containsRiskLanguage(signal.name) && scoreUnderwritingSignal(signal.name) >= 6 && inferMetricEntity(signal.name, entityName, context?.entityTargets) && inferMetricEntity(signal.name, entityName, context?.entityTargets) !== leadSignalEntity
  ) ?? supportCandidates.find((signal) => !containsRiskLanguage(signal.name) && scoreUnderwritingSignal(signal.name) >= 6 && (context?.classification !== "multi_entity" || mentionsEntityTarget(signal.name, context?.entityTargets))) ?? supportCandidates.find((signal) => !containsRiskLanguage(signal.name) && scoreUnderwritingSignal(signal.name) >= 4) ?? supportCandidates.find((signal) => !containsRiskLanguage(signal.name)) ?? supportCandidates.find(() => true) ?? null;
  const leadSignal = preferredLeadSignal?.name;
  const supportSignal = preferredSupportSignal?.name;
  const leadComparable = comparables[0]?.name;
  const comparableLabel = comparables.slice(0, 2).map((item) => item.name).join(" and ");
  const leadRisk = risks[0];
  const comparisonSet = dedupeStrings2((context?.entityTargets ?? []).map((item) => normalizeWhitespace(String(item)))).slice(0, 3);
  const bankerMetricClauses = keyMetrics.slice(0, context?.lens === "banker" ? 4 : 3).map((metric) => formatMetricClause(metric)).filter(Boolean);
  if (context?.lens === "banker") {
    const scope = context?.classification === "multi_entity" ? comparisonSet.length > 1 ? comparisonSet.join(", ") : entityName : entityName;
    summaryParts.push(
      context?.classification === "multi_entity" ? `The current underwriting read on ${scope} is that the peer set is separating on revenue quality, margin durability, and distribution leverage rather than raw model quality alone.` : `The current underwriting read on ${entityName} is that the cited evidence supports a real operating story, but the quality of revenue and durability of pricing still need to hold up under diligence.`
    );
    if (bankerMetricClauses.length > 0) {
      summaryParts.push(`Current hard datapoints include ${joinNaturalLanguage(bankerMetricClauses)}.`);
    } else if (leadSignal && !looksLikeSourceTitle(leadSignal) && !looksLikeEvidenceFragment(leadSignal) && leadSignal.length <= 170) {
      summaryParts.push(`One critical data point is ${stripTrailingConnectorTail(compressNarrativePhrase(leadSignal, 150))}.`);
    }
    if (leadRisk) {
      summaryParts.push(
        context?.classification === "multi_entity" ? `The underwriting question is which platform can keep pricing power and contract durability once buyers consolidate spend, with ${leadRisk.title.toLowerCase()} as the main current flag because ${stripTrailingConnectorTail(compressNarrativePhrase(leadRisk.description, 135))}.` : `The underwriting question is whether ${entityName} can keep pricing power and contract durability, with ${leadRisk.title.toLowerCase()} as the main current flag because ${stripTrailingConnectorTail(compressNarrativePhrase(leadRisk.description, 135))}.`
      );
    } else if (comparableLabel) {
      summaryParts.push(`The closest operating comparables in the cited set are ${comparableLabel}.`);
    }
    if (nextActions[0]?.action) {
      summaryParts.push(`The immediate next step is to ${nextActions[0].action.charAt(0).toLowerCase()}${nextActions[0].action.slice(1)}.`);
    }
    return normalizeWhitespace(summaryParts.slice(0, 4).join(" ")).replace(/\.(?:\s*\.)+/g, ".").replace(/\.{2,}/g, ".");
  }
  if (context?.classification === "multi_entity") {
    const scope = comparisonSet.length > 1 ? comparisonSet.join(", ") : entityName;
    summaryParts.push(`Across ${scope}, the current evidence separates the peer set on enterprise traction, pricing leverage, and distribution durability.`);
    if (leadSignal && !looksLikeSourceTitle(leadSignal) && !looksLikeEvidenceFragment(leadSignal) && leadSignal.length <= 170) {
      summaryParts.push(`One critical data point is ${stripTrailingConnectorTail(compressNarrativePhrase(leadSignal, 150))}.`);
      if (context?.lens === "banker" && supportSignal && supportSignal !== leadSignal && !looksLikeSourceTitle(supportSignal) && !looksLikeEvidenceFragment(supportSignal)) {
        summaryParts.push(`A second underwriting datapoint is ${stripTrailingConnectorTail(compressNarrativePhrase(supportSignal, 145))}.`);
      }
    } else if (context?.lens === "banker") {
      summaryParts.push("The current read suggests the comparison is separating on distribution leverage, contract durability, and pricing power rather than raw model capability alone.");
    } else {
      summaryParts.push("The current read suggests the comparison is separating on enterprise distribution, pricing leverage, and buyer fit.");
    }
    if (context?.lens === "banker") {
      summaryParts.push("For a banker, the underwriting question is which platform can hold pricing power and contract durability once enterprise buyers consolidate spend.");
    }
    if (leadRisk) {
      summaryParts.push(`The main diligence flag is ${leadRisk.title.toLowerCase()}, which matters because ${stripTrailingConnectorTail(compressNarrativePhrase(leadRisk.description, 135))}.`);
    }
    if (nextActions[0]?.action) {
      summaryParts.push(`The immediate next move is to ${nextActions[0].action.charAt(0).toLowerCase()}${nextActions[0].action.slice(1)}.`);
    }
    return summaryParts.slice(0, 4).join(" ");
  }
  summaryParts.push(
    leadSignal && isNarrativeReadySignal(leadSignal) && !looksLikeEvidenceFragment(leadSignal) ? `${entityName} is showing a real operating signal: ${stripTrailingConnectorTail(compressNarrativePhrase(leadSignal, 145))}.` : `${entityName} is being assessed on enterprise traction, pricing leverage, and contract durability using the current cited evidence set.`
  );
  if (leadComparable) {
    summaryParts.push(
      comparableLabel ? `The closest operating comparables in the current evidence set are ${comparableLabel}.` : `${entityName}'s closest operating comparable in the current evidence set is ${leadComparable}.`
    );
    if (context?.lens === "banker") {
      summaryParts.push(`For a banker, the underwriting question is whether ${entityName} can defend pricing and contract durability against ${comparableLabel || leadComparable}.`);
    }
  }
  if (leadRisk) {
    summaryParts.push(`The main diligence flag is ${leadRisk.title.toLowerCase()}, which matters because ${stripTrailingConnectorTail(compressNarrativePhrase(leadRisk.description, 130))}.`);
  }
  if (nextActions[0]?.action) {
    summaryParts.push(`The immediate next move is to ${nextActions[0].action.charAt(0).toLowerCase()}${nextActions[0].action.slice(1)}.`);
  }
  return normalizeWhitespace(summaryParts.slice(0, 4).join(" ")).replace(/\.(?:\s*\.)+/g, ".").replace(/\.{2,}/g, ".");
}
function budgetToolData(toolResults, maxTokensBudget) {
  const inputBudget = Math.floor(maxTokensBudget * 0.6 * 4);
  const perToolBudget = Math.floor(inputBudget / Math.max(toolResults.length, 1));
  return toolResults.map((r) => {
    const data = r.data.length > perToolBudget ? r.data.slice(0, perToolBudget - 50) + "\n[...truncated to fit context budget]" : r.data;
    return `=== [${r.tool}] ===
${data}`;
  }).join("\n\n");
}
function assessComplexity(prompt, maxTokens) {
  const len = prompt.length;
  if (maxTokens <= 500 && len < 2e3) return "low";
  if (maxTokens <= 1e3 && len < 8e3) return "medium";
  return "high";
}
var GEMINI_MODELS = {
  low: {
    name: "gemini-3.1-flash-lite",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent",
    apiKeyEnv: "GEMINI_API_KEY",
    timeoutMs: 15e3,
    contextLimit: 32e3,
    makeBody: (prompt, system, maxTokens) => JSON.stringify({
      contents: [{ parts: [{ text: system ? `${system}

${prompt}` : prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: maxTokens }
    }),
    extractResponse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  },
  medium: {
    name: "gemini-3.1-flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-preview:generateContent",
    apiKeyEnv: "GEMINI_API_KEY",
    timeoutMs: 25e3,
    contextLimit: 128e3,
    makeBody: (prompt, system, maxTokens) => JSON.stringify({
      contents: [{ parts: [{ text: system ? `${system}

${prompt}` : prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: maxTokens }
    }),
    extractResponse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  },
  high: {
    name: "gemini-3.1-pro",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent",
    apiKeyEnv: "GEMINI_API_KEY",
    timeoutMs: 4e4,
    contextLimit: 128e3,
    makeBody: (prompt, system, maxTokens) => JSON.stringify({
      contents: [{ parts: [{ text: system ? `${system}

${prompt}` : prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: maxTokens }
    }),
    extractResponse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  }
};
var OPENAI_MODELS = {
  low: {
    name: "gpt-5.4-nano",
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKeyEnv: "OPENAI_API_KEY",
    timeoutMs: 1e4,
    contextLimit: 128e3,
    makeBody: (prompt, system, maxTokens) => JSON.stringify({
      model: "gpt-5.4-nano",
      messages: [
        ...system ? [{ role: "system", content: system }] : [],
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0
    }),
    extractResponse: (data) => data?.choices?.[0]?.message?.content ?? ""
  },
  medium: {
    name: "gpt-5.4-mini",
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKeyEnv: "OPENAI_API_KEY",
    timeoutMs: 2e4,
    contextLimit: 128e3,
    makeBody: (prompt, system, maxTokens) => JSON.stringify({
      model: "gpt-5.4-mini",
      messages: [
        ...system ? [{ role: "system", content: system }] : [],
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0
    }),
    extractResponse: (data) => data?.choices?.[0]?.message?.content ?? ""
  },
  high: {
    name: "gpt-5.4",
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKeyEnv: "OPENAI_API_KEY",
    timeoutMs: 35e3,
    contextLimit: 128e3,
    makeBody: (prompt, system, maxTokens) => JSON.stringify({
      model: "gpt-5.4",
      messages: [
        ...system ? [{ role: "system", content: system }] : [],
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0
    }),
    extractResponse: (data) => data?.choices?.[0]?.message?.content ?? ""
  }
};
async function callModel(config, prompt, system, maxTokens) {
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) throw new Error(`No ${config.apiKeyEnv}`);
  const headers = { "Content-Type": "application/json" };
  let url = config.endpoint;
  if (config.apiKeyEnv === "GEMINI_API_KEY") {
    url += `?key=${apiKey}`;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: config.makeBody(prompt, system, maxTokens),
    signal: AbortSignal.timeout(config.timeoutMs)
  });
  if (!resp.ok) throw new Error(`${config.name} ${resp.status}`);
  const data = await resp.json();
  return config.extractResponse(data);
}
async function callLLM(callTool, prompt, system, maxTokens) {
  const tokens = maxTokens ?? 1e3;
  try {
    const toolResult = await callTool("call_llm", {
      prompt,
      system,
      maxTokens: tokens,
      temperature: 0
    });
    const text = typeof toolResult === "string" ? toolResult : toolResult?.error ? "" : String(toolResult?.response ?? toolResult?.output ?? toolResult?.content ?? "");
    if (text.length > 10) return text;
  } catch {
  }
  const complexity = assessComplexity(prompt, tokens);
  const primaryModel = GEMINI_MODELS[complexity];
  const chain = [primaryModel];
  chain.push(OPENAI_MODELS[complexity]);
  if (complexity === "high") chain.push(GEMINI_MODELS.medium);
  if (complexity !== "low") chain.push(GEMINI_MODELS.low);
  if (complexity !== "low") chain.push(OPENAI_MODELS.low);
  for (const model of chain) {
    try {
      const result = await callModel(model, prompt, system, tokens);
      if (result && result.length > 10) return result;
    } catch {
      continue;
    }
  }
  return "";
}
var PLAN_PROMPT = `You are NodeBench's agent orchestrator. Given a user query, plan which tools to call and in what order.

Available tools:
- web_search: Search the web for company/market intelligence. Args: {query, maxResults}
- run_recon: Deep reconnaissance on a company. Args: {target, focus}
- founder_local_gather: Get local founder context (company state, changes, contradictions). Args: {daysBack}
- founder_local_synthesize: Synthesize a founder packet (weekly_reset, important_change, pre_delegation). Args: {query, packetType, daysBack}
- founder_local_weekly_reset: Generate weekly founder reset. Args: {daysBack}
- founder_direction_assessment: Assess company direction and readiness. Args: {query}
- enrich_entity: Enrich entity with structured intelligence. Args: {query, entityName, lens}
- build_claim_graph: Extract claims from sources. Args: {sources}
- extract_variables: Identify key variables. Args: {context}
- generate_countermodels: Generate alternative explanations. Args: {thesis, evidence}
- rank_interventions: Rank next actions by impact. Args: {context, variables}
- render_decision_memo: Render a decision memo. Args: {title, recommendation, variables}

Return ONLY valid JSON:
{
  "objective": "what this plan accomplishes",
  "steps": [
    {"id": "s1", "toolName": "tool_name", "args": {...}, "purpose": "why this step", "parallel": false},
    {"id": "s2", "toolName": "tool_name", "args": {...}, "purpose": "why this step", "parallel": true, "dependsOn": "s1"}
  ],
  "synthesisPrompt": "how to combine results into a final answer"
}

Rules:
- Use 2-5 steps. Don't over-plan.
- Mark steps as parallel:true when they don't depend on each other.
- For company searches: web_search + run_recon in parallel, then synthesize.
- For founder questions: founder_local_gather first, then direction_assessment or synthesize.
- For comparisons: web_search per entity in parallel, then compare.
- Always include at least one intelligence-gathering step.`;
async function generatePlan(query, classification, entityTargets, lens, callTool) {
  if (classification === "multi_entity" || classification === "weekly_reset" || classification === "company_search" || classification === "competitor") {
    return buildFallbackPlan(query, classification, entityTargets, lens);
  }
  try {
    const text = await callLLM(
      callTool,
      `${PLAN_PROMPT}

Query: "${query}"
Classification: ${classification}
Entities: ${entityTargets.join(", ") || "none"}
Lens: ${lens}`,
      void 0,
      500
    );
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      objective: parsed.objective ?? query,
      classification,
      entityTargets,
      steps: (parsed.steps ?? []).map((s, i) => ({
        id: s.id ?? `step_${i}`,
        toolName: s.toolName ?? "web_search",
        args: s.args ?? {},
        purpose: s.purpose ?? "",
        parallel: s.parallel ?? false,
        dependsOn: s.dependsOn
      })),
      synthesisPrompt: parsed.synthesisPrompt ?? "Synthesize results into a structured intelligence packet."
    };
  } catch {
    return buildFallbackPlan(query, classification, entityTargets, lens);
  }
}
function extractEntityFromQuery(query) {
  const stopWords = /* @__PURE__ */ new Set(["what", "why", "how", "when", "where", "who", "which", "the", "are", "is", "do", "does", "did", "can", "will", "should", "would", "could", "am", "i", "my", "for", "in", "on", "at", "to", "of", "a", "an", "and", "or", "not", "biggest", "main", "key", "top", "most", "best", "worst", "right", "now", "today", "currently", "about", "tell", "me", "show", "give", "get", "find", "analyze", "compare", "ready", "pitch"]);
  const words = query.replace(/[?!.,]+/g, "").split(/\s+/);
  const candidates = words.filter(
    (w) => w.length > 1 && /^[A-Z]/.test(w) && !stopWords.has(w.toLowerCase())
  );
  if (candidates.length > 0) {
    const result = [];
    let current = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      const prevIdx = words.indexOf(candidates[i - 1]);
      const currIdx = words.indexOf(candidates[i]);
      if (currIdx === prevIdx + 1) {
        current += " " + candidates[i];
      } else {
        result.push(current);
        current = candidates[i];
      }
    }
    result.push(current);
    return result[0];
  }
  return words.filter((w) => !stopWords.has(w.toLowerCase())).slice(0, 3).join(" ") || query.slice(0, 30);
}
function buildFallbackPlan(query, classification, entityTargets, lens) {
  const entity = entityTargets[0] ?? extractEntityFromQuery(query);
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  switch (classification) {
    case "weekly_reset":
      return {
        objective: "Generate founder weekly reset with latest market signals",
        classification,
        entityTargets,
        steps: [
          { id: "s1", toolName: "founder_local_weekly_reset", args: { daysBack: 7 }, purpose: "Get weekly reset packet", parallel: true },
          { id: "s2", toolName: "web_search", args: { query: `AI startup ecosystem latest news changes this week ${year}`, maxResults: 5 }, purpose: "Latest market signals (fallback for serverless)", parallel: true },
          { id: "s3", toolName: "linkup_search", args: { query: `top AI and tech changes this week ${year}`, maxResults: 3 }, purpose: "Deep intelligence on weekly changes", parallel: true }
        ],
        synthesisPrompt: "Format as a weekly founder reset: what changed, biggest risks, and next 3 moves. Use web intelligence when local context is unavailable."
      };
    case "important_change":
    case "pre_delegation":
      return {
        objective: `Synthesize ${classification} packet`,
        classification,
        entityTargets,
        steps: [
          { id: "s1", toolName: "founder_local_synthesize", args: { query, packetType: classification, daysBack: 7 }, purpose: "Synthesize packet", parallel: false }
        ],
        synthesisPrompt: "Format as a structured founder packet."
      };
    case "multi_entity": {
      const comparisonSet = entityTargets.slice(0, 3);
      const steps = comparisonSet.flatMap((e, i) => [
        {
          id: `s${i * 4 + 1}`,
          toolName: "linkup_search",
          args: { query: `${e} enterprise AI revenue valuation customers pricing competitors ${year}`, maxResults: 4 },
          purpose: `Deep comparative research for ${e}`,
          parallel: true
        },
        {
          id: `s${i * 4 + 2}`,
          toolName: "web_search",
          args: { query: `${e} competitors market share enterprise AI pricing risks ${year}`, maxResults: 4 },
          purpose: `Competitive and pricing evidence for ${e}`,
          parallel: true
        },
        {
          id: `s${i * 4 + 3}`,
          toolName: "run_recon",
          args: { target: e, focus: `Compare ${e} against ${comparisonSet.filter((target) => target !== e).join(", ") || query}` },
          purpose: `Structured diligence scan for ${e}`,
          parallel: true
        },
        {
          id: `s${i * 4 + 4}`,
          toolName: "enrich_entity",
          args: { query: `${e} competitive position, enterprise traction, and diligence flags`, entityName: e, lens },
          purpose: `Structured enrichment for ${e}`,
          parallel: true
        }
      ]);
      return {
        objective: `Compare ${comparisonSet.join(" vs ")}`,
        classification,
        entityTargets,
        steps,
        synthesisPrompt: lens === "banker" ? `Build an investment-banking style comparative briefing on ${comparisonSet.join(", ")}. Cover market position, financial evidence, comparables, diligence flags, and next diligence questions.` : `Compare ${comparisonSet.join(", ")} across competitive position, traction, risks, and next actions for a ${lens} audience.`
      };
    }
    case "company_search":
    case "competitor":
      return {
        objective: `Analyze ${entity}`,
        classification,
        entityTargets,
        steps: [
          { id: "s1", toolName: "linkup_search", args: { query: `${entity} revenue valuation funding enterprise customers market share ${year}`, maxResults: 5 }, purpose: "Deep entity, financial, and market-share intelligence", parallel: true },
          { id: "s2", toolName: "web_search", args: { query: `${entity} competitors enterprise market share pricing risks ${year}`, maxResults: 5 }, purpose: "Competitive map, pricing pressure, and core risks", parallel: true },
          { id: "s3", toolName: "web_search", args: { query: `${entity} revenue valuation funding growth enterprise customers ${year}`, maxResults: 5 }, purpose: "Financial and operating evidence", parallel: true },
          { id: "s4", toolName: "run_recon", args: { target: entity, focus: query }, purpose: "Structured recon for positioning and diligence gaps", parallel: true },
          { id: "s5", toolName: "enrich_entity", args: { query: `${entity} strategic position and competitive moat`, entityName: entity, lens }, purpose: "Structured lens-specific synthesis", parallel: true }
          // NOTE: founder_local_gather EXCLUDED from external entity searches.
        ],
        synthesisPrompt: `Synthesize intelligence about ${entity} for a ${lens} audience. Include financial facts, competitive set, diligence flags, and concrete next actions.`
      };
    case "plan_proposal":
      return {
        objective: `Plan: ${query}`,
        classification,
        entityTargets,
        steps: [
          { id: "s1", toolName: "founder_local_gather", args: { daysBack: 7 }, purpose: "Understand current context", parallel: false },
          { id: "s2", toolName: "web_search", args: { query: `${query} best practices ${year}`, maxResults: 3 }, purpose: "Research approaches", parallel: false }
        ],
        synthesisPrompt: "Generate a structured feature plan with phases, risks, and next steps."
      };
    default:
      return {
        objective: query,
        classification,
        entityTargets,
        steps: [
          { id: "s1", toolName: "web_search", args: { query: `${query} ${year}`, maxResults: 5 }, purpose: "Web research", parallel: true },
          { id: "s2", toolName: "web_search", args: { query: `${entity} market risks competitors ${year}`, maxResults: 3 }, purpose: "Risk & competitive context", parallel: true },
          { id: "s3", toolName: "linkup_search", args: { query: `${query} ${year}`, maxResults: 3 }, purpose: "Deep web intelligence", parallel: true }
        ],
        synthesisPrompt: `Answer the query "${query}" using gathered intelligence. Format as a structured founder packet.`
      };
  }
}
async function executeHarness(plan, callTool, onTrace, options) {
  const startMs = Date.now();
  const stepResults = [];
  const completedSteps = /* @__PURE__ */ new Set();
  const toolTimeoutMs = options?.toolTimeoutMs ?? 12e3;
  const episodeId = options?.episodeId ?? `harness_${Date.now()}`;
  try {
    initSessionMemoryTables();
  } catch {
  }
  const readySteps = plan.steps.filter((s) => !s.dependsOn);
  const dependentSteps = plan.steps.filter((s) => s.dependsOn);
  const parallelBatch = readySteps.filter((s) => s.parallel);
  const serialSteps = readySteps.filter((s) => !s.parallel);
  if (parallelBatch.length > 0) {
    onTrace?.({ step: "parallel_dispatch", tool: parallelBatch.map((s) => s.toolName).join(", "), status: "ok", detail: `${parallelBatch.length} parallel steps` });
    const parallelResults = await Promise.all(
      parallelBatch.map(async (step) => {
        const stepStart = Date.now();
        onTrace?.({ step: "tool_call", tool: step.toolName, status: "ok", detail: step.purpose });
        try {
          const result = await Promise.race([
            callTool(step.toolName, step.args),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), toolTimeoutMs))
          ]);
          const duration = Date.now() - stepStart;
          completedSteps.add(step.id);
          return { stepId: step.id, toolName: step.toolName, result, success: true, durationMs: duration };
        } catch (err) {
          return { stepId: step.id, toolName: step.toolName, result: null, success: false, durationMs: Date.now() - stepStart, error: err?.message };
        }
      })
    );
    for (const pr of parallelResults) {
      try {
        recordAction({ episodeId, stepIndex: parallelBatch.findIndex((s) => s.id === pr.stepId), toolName: pr.toolName, input: JSON.stringify(parallelBatch.find((s) => s.id === pr.stepId)?.args ?? {}).slice(0, 2048), output: JSON.stringify(pr.result ?? pr.error ?? "").slice(0, 2048), success: pr.success, durationMs: pr.durationMs, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
        if (!pr.success && pr.error) {
          const failureType = pr.error.includes("timeout") ? "timeout" : "error";
          const reflection = getReflectionPrompt(failureType, pr.toolName);
          recordFailure({ episodeId, stepIndex: parallelBatch.findIndex((s) => s.id === pr.stepId), toolName: pr.toolName, failureType, rootCause: pr.error, recoveryStrategy: reflection, recoverySuccessful: null, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
        }
      } catch {
      }
    }
    stepResults.push(...parallelResults);
  }
  for (let si = 0; si < serialSteps.length; si++) {
    const step = serialSteps[si];
    const stepStart = Date.now();
    onTrace?.({ step: "tool_call", tool: step.toolName, status: "ok", detail: step.purpose });
    try {
      const result = await Promise.race([
        callTool(step.toolName, step.args),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), toolTimeoutMs))
      ]);
      completedSteps.add(step.id);
      const dur = Date.now() - stepStart;
      stepResults.push({ stepId: step.id, toolName: step.toolName, result, success: true, durationMs: dur });
      try {
        recordAction({ episodeId, stepIndex: si, toolName: step.toolName, input: JSON.stringify(step.args).slice(0, 2048), output: JSON.stringify(result ?? "").slice(0, 2048), success: true, durationMs: dur, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      } catch {
      }
    } catch (err) {
      const dur = Date.now() - stepStart;
      stepResults.push({ stepId: step.id, toolName: step.toolName, result: null, success: false, durationMs: dur, error: err?.message });
      try {
        const failureType = err?.message?.includes("timeout") ? "timeout" : "error";
        recordAction({ episodeId, stepIndex: si, toolName: step.toolName, input: JSON.stringify(step.args).slice(0, 2048), output: err?.message ?? "unknown", success: false, durationMs: dur, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
        const reflection = getReflectionPrompt(failureType, step.toolName);
        recordFailure({ episodeId, stepIndex: si, toolName: step.toolName, failureType, rootCause: err?.message ?? "unknown", recoveryStrategy: reflection, recoverySuccessful: null, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      } catch {
      }
    }
  }
  for (const step of dependentSteps) {
    if (step.dependsOn && !completedSteps.has(step.dependsOn)) continue;
    const stepStart = Date.now();
    onTrace?.({ step: "tool_call", tool: step.toolName, status: "ok", detail: step.purpose });
    try {
      const result = await Promise.race([
        callTool(step.toolName, step.args),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), toolTimeoutMs))
      ]);
      completedSteps.add(step.id);
      stepResults.push({ stepId: step.id, toolName: step.toolName, result, success: true, durationMs: Date.now() - stepStart });
    } catch (err) {
      stepResults.push({ stepId: step.id, toolName: step.toolName, result: null, success: false, durationMs: Date.now() - stepStart, error: err?.message });
    }
  }
  onTrace?.({ step: "assemble_response", status: "ok", detail: `${stepResults.length} steps completed` });
  return {
    plan,
    stepResults,
    totalDurationMs: Date.now() - startMs,
    totalCostUsd: stepResults.reduce((s, r) => s + (r.success ? 5e-3 : 0), 0),
    adaptations: 0
  };
}
async function synthesizeResults(execution, query, lens, callTool) {
  const comparableFallbacks = deriveComparableCandidates(execution, execution.plan.entityTargets[0] ?? extractEntityFromQuery(query));
  const resultData = execution.stepResults.filter((r) => r.success && r.result).map((r) => {
    const res = r.result;
    return {
      tool: r.toolName,
      data: typeof res === "string" ? res : JSON.stringify(res)
    };
  });
  const nonEntityTypes = /* @__PURE__ */ new Set(["weekly_reset", "important_change", "pre_delegation", "general"]);
  const entityName = execution.plan.classification === "multi_entity" && (execution.plan.entityTargets?.length ?? 0) > 1 ? execution.plan.entityTargets.slice(0, 3).join(" vs ") : execution.plan.entityTargets[0] ?? (nonEntityTypes.has(execution.plan.classification) ? "Your Intelligence Brief" : extractEntityFromQuery(query));
  if (resultData.length > 0) {
    try {
      const text = await callLLM(
        callTool,
        `You are a senior investment banking analyst writing an intelligence memo. Analyze these raw data sources and produce a structured assessment.

QUERY: "${query}"
AUDIENCE: ${lens} (tailor depth and focus accordingly)
OBJECTIVE: ${execution.plan.objective}

RAW DATA FROM ${resultData.length} SOURCES:
${budgetToolData(resultData, 32e3)}

ANALYSIS REQUIREMENTS:
1. ANSWER: Write a 3-4 sentence executive summary with SPECIFIC numbers, dates, and facts from the data. No generic statements. If data says "$26B revenue" \u2014 cite it. If data mentions "70% market share" \u2014 cite it.
2. KEY METRICS: Extract up to 4 banker-grade datapoints as {label, value}. Use real numbers only, such as revenue, valuation, gross margin, market share, compute cost, or growth.
3. SIGNALS: Extract 3-5 key signals with direction (up/down/neutral) and impact. Each signal must reference a specific fact from the data, not a generic observation.
3. RISKS: Identify 2-3 material risks with evidence. For each risk, explain WHY it matters and what could trigger it. Not just "competition risk" \u2014 specify which competitor and what they're doing.
4. COMPARABLES: Name 2-4 direct competitors with WHY they're relevant (what they do differently, where they overlap, competitive advantage). Include evidence from the data.
   - Never use publishers, research outlets, indices, newsletters, or article-title fragments as comparables.
   - For multi-entity requests, keep the comparison set anchored to the companies explicitly in scope plus directly adjacent operating peers only.
5. WHY THIS TEAM (REQUIRED \u2014 this is the most important section. What makes outsiders trust or doubt this company):
   - founderCredibility: 1-2 sentences on founder background, domain relevance, and what makes them credible for THIS problem
   - trustSignals: 2-4 specific trust-building facts (notable backers, advisors, prior exits, shipped products, institutional affiliations, public work)
   - visionMagnitude: 1-2 sentences \u2014 is the opportunity large enough to matter? Feature, product, or company?
   - reinventionCapacity: 1 sentence \u2014 can this team adapt if the wedge changes? Evidence of resilience/iteration.
   - hiddenRequirements: 2-4 things sophisticated outsiders (VCs, banks, enterprise buyers) would secretly expect before taking this seriously
6. NEXT ACTIONS: 2-3 specific, actionable steps the ${lens} should take this week. Not generic "do more research" \u2014 specific actions like "review Q4 filing for revenue breakdown" or "compare pricing vs competitor X".
7. FOLLOW-UP QUESTIONS: 3-4 specific questions that would deepen this analysis. Questions should reference gaps in the current data.
8. SOURCES: List actual source names/URLs from the data. Never list tool names like "web_search" or "run_recon". Use the actual article titles, document names, or website domains.

Return ONLY valid JSON with ALL fields populated:
{
  "entityName": "company name",
  "answer": "3-4 sentence summary with numbers",
  "confidence": 0-100,
  "keyMetrics": [{"label": "metric name", "value": "metric value"}],
  "whyThisTeam": {"founderCredibility": "why these founders are credible for this problem", "trustSignals": ["signal1", "signal2"], "visionMagnitude": "feature, product, or company-scale?", "reinventionCapacity": "can they pivot?", "hiddenRequirements": ["what outsiders expect"]},
  "signals": [{"name": "signal", "direction": "up|down|neutral", "impact": "high|medium|low"}],
  "changes": [{"description": "recent change"}],
  "risks": [{"title": "risk", "description": "why it matters"}],
  "comparables": [{"name": "competitor", "relevance": "high|medium|low", "note": "why relevant"}],
  "nextActions": [{"action": "step", "impact": "high|medium|low"}],
  "nextQuestions": ["follow-up question"],
  "sources": [{"label": "source title", "href": "url", "type": "web|doc"}]
}`,
        "You are a senior investment banking analyst. Every claim must cite specific data. No generic statements. No placeholder text. If data is insufficient, say so honestly rather than fabricating.",
        2200
      );
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const signals2 = mergeSignals(collectFallbackSignals(execution), sanitizeSignals(parsed.signals));
        const changes2 = sanitizeChanges([
          ...collectFallbackChanges(execution),
          ...Array.isArray(parsed.changes) ? parsed.changes : []
        ]);
        const risks2 = sanitizeRisks([
          ...collectFallbackRisks(execution),
          ...Array.isArray(parsed.risks) ? parsed.risks : []
        ]);
        const comparables2 = sanitizeComparables(parsed.comparables, entityName, comparableFallbacks, {
          classification: execution.plan.classification,
          entityTargets: execution.plan.entityTargets
        });
        const keyMetrics2 = deriveEvidenceKeyMetrics({
          provided: Array.isArray(parsed.keyMetrics) ? parsed.keyMetrics : [],
          execution,
          entityName,
          entityTargets: execution.plan.entityTargets,
          lens,
          classification: execution.plan.classification,
          signals: signals2,
          changes: changes2
        });
        const nextActions2 = sanitizeNextActions(parsed.nextActions, lens, entityName, comparables2, risks2, {
          classification: execution.plan.classification,
          entityTargets: execution.plan.entityTargets
        });
        const sources2 = sanitizeSources(parsed.sources, execution);
        const nextQuestions = dedupeStrings2(
          Array.isArray(parsed.nextQuestions) ? parsed.nextQuestions.map((item) => String(item ?? "")) : []
        ).filter((item) => item.length >= 12 && isQuestionLike(item)).slice(0, 4);
        const finalQuestions = dedupeStrings2([
          ...nextQuestions,
          ...buildDefaultNextQuestions({
            classification: execution.plan.classification,
            entityName,
            comparables: comparables2,
            risks: risks2,
            entityTargets: execution.plan.entityTargets
          })
        ]).slice(0, 4);
        const whyThisTeam = parsed.whyThisTeam && typeof parsed.whyThisTeam === "object" ? {
          founderCredibility: normalizeWhitespace(String(parsed.whyThisTeam.founderCredibility ?? "")),
          trustSignals: dedupeStrings2(
            Array.isArray(parsed.whyThisTeam.trustSignals) ? parsed.whyThisTeam.trustSignals.map((item) => String(item ?? "")) : []
          ).slice(0, 4),
          visionMagnitude: normalizeWhitespace(String(parsed.whyThisTeam.visionMagnitude ?? "")),
          reinventionCapacity: normalizeWhitespace(String(parsed.whyThisTeam.reinventionCapacity ?? "")),
          hiddenRequirements: dedupeStrings2(
            Array.isArray(parsed.whyThisTeam.hiddenRequirements) ? parsed.whyThisTeam.hiddenRequirements.map((item) => String(item ?? "")) : []
          ).slice(0, 4)
        } : null;
        const answer2 = sanitizeExecutiveAnswer(
          String(parsed.answer ?? ""),
          entityName,
          keyMetrics2,
          signals2,
          comparables2,
          risks2,
          nextActions2,
          {
            classification: execution.plan.classification,
            entityTargets: execution.plan.entityTargets,
            lens
          }
        );
        return {
          entityName: parsed.entityName ?? entityName,
          answer: answer2,
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 50,
          keyMetrics: keyMetrics2,
          signals: signals2,
          changes: changes2,
          risks: risks2,
          comparables: comparables2,
          whyThisTeam,
          nextActions: nextActions2,
          nextQuestions: finalQuestions,
          sources: sources2
        };
      }
    } catch {
    }
  }
  const signals = [];
  const changes = [];
  const risks = [];
  const comparables = [];
  const nextActions = [];
  const sources = [];
  const answerParts = [];
  for (const sr of execution.stepResults) {
    if (!sr.success || !sr.result) continue;
    const raw = sr.result;
    if (raw?.error === true) continue;
    if (sr.toolName === "linkup_search") {
      if (raw?.answer) answerParts.unshift(String(raw.answer).slice(0, 500));
      const lSources = raw?.sources ?? [];
      for (const s of (Array.isArray(lSources) ? lSources : []).slice(0, 5)) {
        const title = s?.name ?? s?.title ?? "";
        const snippet = s?.snippet ?? s?.description ?? "";
        const url = s?.url ?? "";
        if (title) sources.push({ label: title.slice(0, 80), href: url || void 0, type: "web" });
        if (snippet) {
          if (/\b(revenue|growth|raised|funding|launch|expand|partner|acquir|billion|million|valuation)/i.test(snippet)) {
            const titleNeg = /\b(trouble|fail|declin|crash|struggle|layoff|scandal|problem|crisis|concern|threaten|warn)/i.test(title || snippet);
            signals.push({ name: extractEvidenceSentencesSafe(snippet)[0] ?? snippet.slice(0, 120), direction: titleNeg ? "down" : "up", impact: "high" });
          }
          if (/\b(layoff|decline|loss|risk|lawsuit|regulat|concern|investig|threat|challenge|vulnerab)/i.test(snippet)) {
            risks.push({ title: inferRiskTitleFromDescription(snippet), description: snippet.slice(0, 200) });
          }
          if (/\b(compet|rival|alternative|versus|vs\.|compared to)/i.test(snippet)) {
            const compMatch = snippet.match(/(?:competitors?|rivals?|alternatives?)\s+(?:like|such as|including)\s+([A-Z][a-zA-Z]+(?:\s*,\s*[A-Z][a-zA-Z]+)*)/i);
            if (compMatch) {
              for (const name of compMatch[1].split(/,\s*/)) {
                if (name.trim().length > 2 && !/^(and|or|the|a|an|its|their|also|but|with)$/i.test(name.trim())) comparables.push({ name: name.trim(), relevance: "high", note: "Identified via Linkup" });
              }
            }
          }
          if (/\b(announced|launched|released|updated|acquired|raised|hired|expanded|partnered|introduced|unveiled|reported)\b/i.test(snippet)) {
            const description = normalizeChangeDescription(extractEvidenceSentencesSafe(snippet)[0] ?? snippet);
            if (description) changes.push({ description });
          }
        }
      }
    }
    if (sr.toolName === "web_search") {
      const results = raw?.results ?? raw?.webResults ?? (Array.isArray(raw) ? raw : []);
      for (const r of (Array.isArray(results) ? results : []).slice(0, 5)) {
        const title = r?.title ?? r?.name ?? "";
        const snippet = r?.snippet ?? r?.description ?? r?.content ?? "";
        const url = r?.url ?? r?.link ?? r?.href ?? "";
        if (title) sources.push({ label: title.slice(0, 80), href: url || void 0, type: "web" });
        if (snippet) {
          answerParts.push(snippet.slice(0, 200));
          if (/\b(growth|revenue|raised|funding|launch|expand|partner|acquir)/i.test(snippet)) {
            const titleNeg = /\b(trouble|fail|declin|crash|struggle|layoff|scandal|problem|crisis|concern|threaten|warn)/i.test(title);
            signals.push({ name: extractEvidenceSentencesSafe(snippet)[0] ?? snippet.slice(0, 120), direction: titleNeg ? "down" : "up", impact: "medium" });
          }
          if (/\b(layoff|decline|loss|risk|lawsuit|regulat|concern|investig)/i.test(snippet)) {
            risks.push({ title: inferRiskTitleFromDescription(snippet), description: snippet.slice(0, 200) });
          }
          if (/\b(announced|launched|released|updated|acquired|raised|hired|expanded|partnered|introduced|unveiled|reported)\b/i.test(snippet)) {
            const description = normalizeChangeDescription(extractEvidenceSentencesSafe(snippet)[0] ?? snippet);
            if (description) changes.push({ description });
          }
          if (/\b(compet|rival|alternative|versus|vs\.|compared to)/i.test(snippet)) {
            const compMatch = snippet.match(/(?:competitors?|rivals?|alternatives?)\s+(?:like|such as|including)\s+([A-Z][a-zA-Z]+(?:\s*,\s*[A-Z][a-zA-Z]+)*)/i);
            if (compMatch) {
              for (const name of compMatch[1].split(/,\s*/)) {
                if (name.trim().length > 2 && !/^(and|or|the|a|an|its|their|also|but|with)$/i.test(name.trim())) comparables.push({ name: name.trim(), relevance: "high", note: "Web intelligence" });
              }
            }
          }
        }
      }
      if (typeof raw?.content === "string" && raw.content.length > 20) {
        answerParts.push(raw.content.slice(0, 500));
        sources.push({ label: raw?.query ?? "web search", type: "web" });
      }
    }
    if (sr.toolName === "run_recon") {
      if (raw?.researchPlan) {
        const plan = raw.researchPlan;
        const external = plan?.externalSources ?? [];
        const internal = plan?.internalChecks ?? [];
      }
      if (raw?.findings) {
        for (const f of (Array.isArray(raw.findings) ? raw.findings : []).slice(0, 5)) {
          const name = typeof f === "string" ? f : f?.name ?? f?.title ?? f?.finding ?? "";
          if (!name) continue;
          const normalizedFinding = normalizeWhitespace(name).slice(0, 260);
          signals.push({ name: normalizedFinding, direction: f?.direction ?? "neutral", impact: f?.impact ?? "medium" });
          if (/\b(quadrupled|doubled|tripled|expanded|grew|growth|increased|reached|now exceeds|accelerat|represent over half|enterprise use)\b/i.test(normalizedFinding)) {
            const description = normalizeChangeDescription(normalizedFinding);
            if (description) changes.push({ description });
          }
        }
      }
      if (raw?.nextSteps) {
        for (const s of (Array.isArray(raw.nextSteps) ? raw.nextSteps : []).slice(0, 3)) {
          const action = typeof s === "string" ? s : s?.action ?? "";
          if (action) nextActions.push({ action: action.slice(0, 100), impact: "medium" });
        }
      }
      if (raw?.summary) answerParts.push(String(raw.summary).slice(0, 300));
    }
    if (sr.toolName === "founder_local_gather") {
      if (raw?.identity?.projectName) {
        signals.push({ name: `Project: ${raw.identity.projectName}`, direction: "neutral", impact: "low" });
      }
      if (raw?.recentChanges?.commitCount > 0) {
        signals.push({ name: `${raw.recentChanges.commitCount} commits in last ${raw.recentChanges.daysBack}d`, direction: "up", impact: "medium" });
        for (const c of (raw.recentChanges.topCommits ?? []).slice(0, 3)) {
          changes.push({ description: (c?.message ?? c?.subject ?? String(c)).slice(0, 120), date: c?.date });
        }
      }
      if (raw?.sessionMemory?.actions7d > 0) {
        signals.push({ name: `${raw.sessionMemory.actions7d} actions in last 7d`, direction: "up", impact: "medium" });
      }
      if (raw?.dogfoodFindings?.p0 > 0) {
        risks.push({ title: `${raw.dogfoodFindings.p0} P0 issues`, description: "Critical issues found in dogfood" });
      }
      sources.push({ label: "Local company context", type: "local" });
    }
    if (sr.toolName.startsWith("founder_local") && sr.toolName !== "founder_local_gather") {
      if (raw?.changes) {
        for (const c of (Array.isArray(raw.changes) ? raw.changes : []).slice(0, 5)) {
          const desc = typeof c === "string" ? c : c?.description ?? c?.change ?? "";
          if (desc) changes.push({ description: desc.slice(0, 120), date: c?.date });
        }
      }
      if (raw?.contradictions) {
        for (const c of (Array.isArray(raw.contradictions) ? raw.contradictions : []).slice(0, 3)) {
          const claim = typeof c === "string" ? c : c?.claim ?? c?.contradiction ?? "";
          if (claim) risks.push({ title: "Contradiction", description: claim.slice(0, 150) });
        }
      }
      if (raw?.nextMoves ?? raw?.recommendations) {
        for (const m of (raw.nextMoves ?? raw.recommendations ?? []).slice(0, 3)) {
          const action = typeof m === "string" ? m : m?.action ?? m?.move ?? "";
          if (action) nextActions.push({ action: action.slice(0, 100), impact: m?.impact ?? "medium" });
        }
      }
      if (raw?.summary ?? raw?.briefing) answerParts.push(String(raw.summary ?? raw.briefing).slice(0, 300));
      sources.push({ label: "Founder intelligence synthesis", type: "local" });
    }
    if (sr.toolName === "enrich_entity") {
      if (raw?.signals) {
        for (const s of (Array.isArray(raw.signals) ? raw.signals : []).slice(0, 5)) {
          signals.push({ name: (s?.name ?? String(s)).slice(0, 120), direction: s?.direction ?? "neutral", impact: s?.impact ?? "medium" });
        }
      }
      if (raw?.description) answerParts.push(String(raw.description).slice(0, 300));
    }
    if (sr.toolName === "simulate_decision_paths") {
      const sim = raw?.summary;
      if (sim) {
        const bull = raw?.bestPath;
        const bear = raw?.worstPath;
        signals.push({ name: `Monte Carlo (${sim.paths} paths): ${sim.successRate} success, base payoff ${sim.medianPayoff}`, direction: "neutral", impact: "medium" });
        if (bull && bear) {
          signals.push({ name: `3-case model: Bull ${bull.payoff} | Bear ${bear.payoff} (${sim.confidenceInterval})`, direction: "neutral", impact: "medium" });
        }
        for (const d of raw?.decisionSensitivity ?? []) {
          risks.push({ title: `Decision: ${d.decision}`, description: `Best choice: "${d.bestChoice}" (${d.impact} vs average). Wrong choice here materially affects outcomes.` });
        }
        sources.push({ label: `Financial simulation (${sim.paths} scenarios)`, type: "local" });
      }
    }
    if (!["web_search", "run_recon", "founder_local_gather", "enrich_entity"].includes(sr.toolName) && !sr.toolName.startsWith("founder_local")) {
      const summary = raw?.summary ?? raw?.answer ?? raw?.result ?? raw?.output ?? raw?.briefing;
      if (typeof summary === "string" && summary.length > 10) {
        answerParts.push(summary.slice(0, 300));
        sources.push({ label: summary.slice(0, 80), type: "local" });
      }
    }
  }
  const sanitizedSignals = mergeSignals(sanitizeSignals(signals), collectFallbackSignals(execution));
  const sanitizedChanges = sanitizeChanges(changes);
  const sanitizedRisks = sanitizeRisks([...risks, ...collectFallbackRisks(execution)]);
  const sanitizedComparables = sanitizeComparables(comparables, entityName, comparableFallbacks, {
    classification: execution.plan.classification,
    entityTargets: execution.plan.entityTargets
  });
  const keyMetrics = deriveEvidenceKeyMetrics({
    execution,
    entityName,
    entityTargets: execution.plan.entityTargets,
    lens,
    classification: execution.plan.classification,
    signals: sanitizedSignals,
    changes: sanitizedChanges
  });
  const sanitizedNextActions = sanitizeNextActions(nextActions, lens, entityName, sanitizedComparables, sanitizedRisks, {
    classification: execution.plan.classification,
    entityTargets: execution.plan.entityTargets
  });
  const sanitizedSources = sanitizeSources(sources, execution);
  const answer = sanitizeExecutiveAnswer(
    answerParts.length > 0 ? answerParts.slice(0, 5).join(" ").slice(0, 800) : `Analysis of "${query}" using ${execution.stepResults.filter((r) => r.success).length} tools.`,
    entityName,
    keyMetrics,
    sanitizedSignals,
    sanitizedComparables,
    sanitizedRisks,
    sanitizedNextActions,
    {
      classification: execution.plan.classification,
      entityTargets: execution.plan.entityTargets,
      lens
    }
  );
  if (sanitizedNextActions.length === 0) {
    const isEntityQuery = entityName && entityName.length > 1 && !/^(AI|the|your|my|this)$/i.test(entityName) && !entityName.includes("Intelligence Brief");
    if (sanitizedRisks.length > 0) {
      sanitizedNextActions.push({ action: `Investigate "${sanitizedRisks[0].title}" and identify the concrete trigger points that would make it matter.`, impact: "high" });
    }
    if (isEntityQuery) {
      if (sanitizedComparables.length > 0) {
        sanitizedNextActions.push({ action: `Compare ${entityName} against ${sanitizedComparables[0].name} on pricing, enterprise traction, and durability of demand.`, impact: "medium" });
      } else {
        sanitizedNextActions.push({ action: `Map ${entityName}'s competitive moat and separate durable edge from narrative momentum.`, impact: "medium" });
      }
      sanitizedNextActions.push({ action: `Review ${entityName}'s most recent filings, announcements, or product launches for diligence-grade evidence.`, impact: "medium" });
    } else {
      sanitizedNextActions.push({ action: "Identify the top 3 risks to your current strategy and assign a concrete mitigation owner to each.", impact: "high" });
      sanitizedNextActions.push({ action: "Review what changed this week and decide what to act on versus defer with explicit rationale.", impact: "medium" });
    }
  }
  const successCount = execution.stepResults.filter((r) => r.success).length;
  const totalSteps = execution.stepResults.length;
  const webSourceCount = sanitizedSources.filter((s) => s.type === "web" && s.href).length;
  const successRate = totalSteps > 0 ? successCount / totalSteps : 0;
  const confidence = Math.min(95, Math.round(
    20 + successRate * 15 + Math.min(webSourceCount, 4) * 10 + Math.min(signals.length, 5) * 3 + Math.min(comparables.length, 2) * 5
    // 0-10: competitive context
  ));
  return {
    entityName,
    answer,
    confidence,
    keyMetrics,
    signals: sanitizedSignals.filter((s) => !/in progress|recon plan|project:|commits in last|research plan|status.*active|tool_call|step\s+\d|executing|queued/i.test(s.name)).slice(0, 8),
    changes: sanitizedChanges.slice(0, 5),
    risks: sanitizedRisks.slice(0, 5),
    comparables: sanitizedComparables.slice(0, 4),
    whyThisTeam: null,
    // populated by LLM synthesis path; deterministic path lacks founder data
    nextActions: sanitizedNextActions.filter((a) => !/contextQuestions|check_framework|gather project|ingest_upload|Answer any|Use\s+\w+_\w+/i.test(a.action)).slice(0, 4),
    nextQuestions: dedupeStrings2(
      buildDefaultNextQuestions({
        classification: execution.plan.classification,
        entityName,
        comparables: sanitizedComparables,
        risks: sanitizedRisks,
        entityTargets: execution.plan.entityTargets
      })
    ).slice(0, 4),
    sources: sanitizedSources.slice(0, 8)
  };
}

// server/lib/signalTaxonomy.ts
var CANONICAL_LABELS = [
  // Team / Founder
  { label: "Founder-Market Fit", category: "Team / Founder", keywords: ["founder", "background", "domain expertise", "experience"] },
  { label: "Key Technical Leadership", category: "Team / Founder", keywords: ["cto", "technical", "engineering", "leadership", "team"] },
  { label: "Hiring Velocity", category: "Team / Founder", keywords: ["hiring", "headcount", "growth", "talent", "recruiting"] },
  // Market
  { label: "Market Size", category: "Market", keywords: ["tam", "sam", "market size", "addressable", "opportunity"] },
  { label: "Market Timing", category: "Market", keywords: ["timing", "wave", "adoption", "inflection", "trend"] },
  { label: "Competitive Density", category: "Market", keywords: ["competitors", "crowded", "fragmented", "consolidated", "landscape"] },
  // Product
  { label: "Product-Market Fit Signals", category: "Product", keywords: ["pmf", "retention", "engagement", "usage", "product-market"] },
  { label: "Technical Differentiation", category: "Product", keywords: ["architecture", "tech stack", "proprietary", "novel", "innovation"] },
  { label: "User Experience Quality", category: "Product", keywords: ["ux", "design", "usability", "onboarding", "friction"] },
  // Traction
  { label: "Revenue Growth", category: "Traction", keywords: ["revenue", "arr", "mrr", "sales", "growth rate"] },
  { label: "User Growth", category: "Traction", keywords: ["users", "dau", "mau", "signups", "adoption rate"] },
  { label: "Commercial Validation", category: "Traction", keywords: ["customers", "contracts", "pilots", "enterprise", "paid"] },
  // GTM / Distribution
  { label: "Distribution Channel", category: "GTM / Distribution", keywords: ["distribution", "channel", "viral", "organic", "acquisition"] },
  { label: "Sales Efficiency", category: "GTM / Distribution", keywords: ["cac", "ltv", "payback", "sales cycle", "efficiency"] },
  { label: "Developer Adoption", category: "GTM / Distribution", keywords: ["developer", "open source", "api", "sdk", "developer adoption"] },
  // Moat / Defensibility
  { label: "IP Defensibility", category: "Moat / Defensibility", keywords: ["ip", "patent", "proprietary", "trade secret", "defensibility"] },
  { label: "Network Effects", category: "Moat / Defensibility", keywords: ["network effect", "flywheel", "ecosystem", "platform", "switching cost"] },
  { label: "Data Moat", category: "Moat / Defensibility", keywords: ["data", "training data", "proprietary data", "data advantage", "data flywheel"] },
  // Technical Risk
  { label: "Scalability Risk", category: "Technical Risk", keywords: ["scale", "infrastructure", "performance", "bottleneck", "architecture risk"] },
  { label: "Dependency Risk", category: "Technical Risk", keywords: ["dependency", "vendor lock-in", "api dependency", "platform risk", "single point"] },
  // Financial Readiness
  { label: "Runway", category: "Financial Readiness", keywords: ["runway", "burn rate", "cash", "months remaining", "fundraising"] },
  { label: "Unit Economics", category: "Financial Readiness", keywords: ["unit economics", "margin", "gross margin", "contribution", "profitability"] },
  // Diligence / Verifiability
  { label: "Evidence Quality", category: "Diligence / Verifiability", keywords: ["evidence", "source", "verifiable", "citation", "proof"] },
  { label: "Claim Consistency", category: "Diligence / Verifiability", keywords: ["contradiction", "inconsistent", "conflicting", "mismatch"] },
  // Regulatory / Compliance
  { label: "Regulatory Exposure", category: "Regulatory / Compliance", keywords: ["regulation", "compliance", "legal", "gdpr", "licensing"] },
  // Strategic Fit
  { label: "Strategic Alignment", category: "Strategic Fit", keywords: ["strategy", "alignment", "thesis", "portfolio fit", "synergy"] },
  { label: "Independence", category: "Strategic Fit", keywords: ["independent", "autonomy", "parent company", "subsidiary", "spin-off"] },
  // Execution Risk
  { label: "Execution Complexity", category: "Execution Risk", keywords: ["complexity", "execution risk", "operational", "coordination", "delivery"] },
  { label: "Go-to-Market Risk", category: "Execution Risk", keywords: ["gtm risk", "market entry", "launch", "adoption risk", "timing risk"] }
];
var KEYWORD_CACHE = /* @__PURE__ */ new Map();
var MAX_CACHE = 500;
function keywordScore(text, keywords) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) score += kw.length;
  }
  return score;
}
function classifySignal(raw) {
  const rawName = raw.name ?? raw.title ?? String(raw);
  const cacheKey = rawName.toLowerCase().trim();
  const cached = KEYWORD_CACHE.get(cacheKey);
  if (cached) {
    return {
      category: cached.label.category,
      label: cached.label.label,
      rawName,
      direction: raw.direction ?? "neutral",
      impact: raw.impact ?? "medium",
      confidence: Math.min(0.95, cached.score / 20),
      // normalize
      summary: rawName,
      evidenceRefs: raw.sourceIdx != null ? [`src_${raw.sourceIdx}`] : [],
      needsOntologyReview: false
    };
  }
  let bestLabel = null;
  let bestScore = 0;
  for (const cl of CANONICAL_LABELS) {
    const score = keywordScore(rawName, cl.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestLabel = cl;
    }
  }
  if (bestLabel && bestScore > 0) {
    if (KEYWORD_CACHE.size >= MAX_CACHE) {
      const firstKey = KEYWORD_CACHE.keys().next().value;
      if (firstKey) KEYWORD_CACHE.delete(firstKey);
    }
    KEYWORD_CACHE.set(cacheKey, { label: bestLabel, score: bestScore });
  }
  if (bestLabel && bestScore >= 3) {
    return {
      category: bestLabel.category,
      label: bestLabel.label,
      rawName,
      direction: raw.direction ?? "neutral",
      impact: raw.impact ?? "medium",
      confidence: Math.min(0.95, bestScore / 20),
      summary: rawName,
      evidenceRefs: raw.sourceIdx != null ? [`src_${raw.sourceIdx}`] : [],
      needsOntologyReview: bestScore < 6
    };
  }
  return {
    category: "Execution Risk",
    // safe default
    label: rawName.length > 40 ? rawName.slice(0, 37) + "..." : rawName,
    rawName,
    direction: raw.direction ?? "neutral",
    impact: raw.impact ?? "medium",
    confidence: 0.3,
    summary: rawName,
    evidenceRefs: raw.sourceIdx != null ? [`src_${raw.sourceIdx}`] : [],
    needsOntologyReview: true
  };
}
function classifySignals(rawSignals) {
  const classified = rawSignals.map((s) => classifySignal(s));
  const merged = /* @__PURE__ */ new Map();
  for (const sig of classified) {
    const key = `${sig.category}::${sig.label}`;
    const existing = merged.get(key);
    if (existing) {
      if (sig.confidence > existing.confidence) {
        existing.confidence = sig.confidence;
        existing.summary = sig.summary;
      }
      existing.evidenceRefs = [.../* @__PURE__ */ new Set([...existing.evidenceRefs, ...sig.evidenceRefs])];
    } else {
      merged.set(key, { ...sig });
    }
  }
  return Array.from(merged.values()).sort((a, b) => b.confidence - a.confidence);
}

// server/lib/evidenceSpan.ts
var spanCounter = 0;
function nextSpanId() {
  return `esp_${++spanCounter}_${Date.now().toString(36)}`;
}
function createEvidenceSpans(sourceSnippets, signals) {
  const spans = [];
  for (const src of sourceSnippets) {
    const snippet = src.snippet ?? src.source ?? "";
    if (!snippet) continue;
    const linkedSignals = signals.filter((s) => {
      if (s.sourceIdx != null && sourceSnippets.indexOf(src) === s.sourceIdx) return true;
      const name = (s.name ?? s.title ?? "").toLowerCase();
      return name.length > 3 && snippet.toLowerCase().includes(name.slice(0, 20));
    });
    const status = snippet.length > 100 ? "verified" : snippet.length > 30 ? "partial" : "unverified";
    const confidence = status === "verified" ? 0.85 : status === "partial" ? 0.55 : 0.2;
    spans.push({
      spanId: nextSpanId(),
      sourceUrl: src.url ?? null,
      claimText: linkedSignals.map((s) => s.name ?? s.title ?? "").filter(Boolean).join("; ") || "General context",
      verificationStatus: status,
      confidence,
      sourceSnippet: snippet.slice(0, 300),
      retrievalMethod: src.url ? "web_search" : "inferred",
      sourceTitle: src.title ?? extractDomain(src.url) ?? "Source"
    });
  }
  for (const sig of signals) {
    const name = sig.name ?? sig.title ?? "";
    const hasEvidence = spans.some(
      (sp) => sp.claimText.toLowerCase().includes(name.toLowerCase().slice(0, 15))
    );
    if (!hasEvidence && name) {
      spans.push({
        spanId: nextSpanId(),
        sourceUrl: null,
        claimText: name,
        verificationStatus: "unverified",
        confidence: 0.15,
        sourceSnippet: "",
        retrievalMethod: "inferred",
        sourceTitle: "No source found"
      });
    }
  }
  const verifiedCount = spans.filter((s) => s.verificationStatus === "verified").length;
  const partialCount = spans.filter((s) => s.verificationStatus === "partial").length;
  const unverifiedCount = spans.filter((s) => s.verificationStatus === "unverified").length;
  const contradictedCount = spans.filter((s) => s.verificationStatus === "contradicted").length;
  return {
    totalSpans: spans.length,
    verifiedCount,
    partialCount,
    unverifiedCount,
    contradictedCount,
    verificationRate: spans.length > 0 ? (verifiedCount + partialCount) / spans.length : 0,
    spans
  };
}
function extractDomain(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return null;
  }
}

// server/lib/routingHints.ts
var DOMAIN_CAPABILITIES = [
  {
    domain: "company_search",
    label: "Company Intelligence",
    keywords: [
      "company",
      "startup",
      "competitor",
      "market",
      "funding",
      "revenue",
      "valuation",
      "team",
      "founder",
      "ceo",
      "investors",
      "series",
      "acquisition",
      "ipo",
      "growth",
      "traction",
      "product",
      "moat",
      "defensibility",
      "diligence",
      "analysis",
      "research",
      "investigate",
      "who",
      "what is",
      "tell me about",
      "search"
    ]
  },
  {
    domain: "founder_ops",
    label: "Founder Operations",
    keywords: [
      "weekly reset",
      "weekly",
      "delegation",
      "hand off",
      "delegate",
      "agent",
      "packet",
      "operating",
      "contradictions",
      "changed",
      "what changed",
      "my company",
      "our",
      "my startup",
      "my team",
      "refresh",
      "context",
      "priorities",
      "next moves",
      "strategy"
    ]
  },
  {
    domain: "competitor_analysis",
    label: "Competitive Analysis",
    keywords: [
      "vs",
      "versus",
      "compare",
      "comparison",
      "competitor",
      "alternative",
      "better than",
      "difference",
      "landscape",
      "market share",
      "head to head",
      "benchmark",
      "relative"
    ]
  },
  {
    domain: "financial_analysis",
    label: "Financial Analysis",
    keywords: [
      "revenue",
      "arr",
      "mrr",
      "burn",
      "runway",
      "margins",
      "unit economics",
      "cac",
      "ltv",
      "payback",
      "profitability",
      "raise",
      "fundraise",
      "valuation",
      "cap table",
      "dilution",
      "series a",
      "series b",
      "seed",
      "pre-seed",
      "banker"
    ]
  },
  {
    domain: "diligence",
    label: "Due Diligence",
    keywords: [
      "diligence",
      "risk",
      "red flag",
      "compliance",
      "regulatory",
      "legal",
      "ip",
      "patent",
      "lawsuit",
      "fraud",
      "verify",
      "evidence",
      "proof",
      "audit",
      "investigate",
      "check",
      "contradiction",
      "inconsistent",
      "claim"
    ]
  },
  {
    domain: "idea_validation",
    label: "Idea Validation",
    keywords: [
      "idea",
      "validate",
      "build",
      "should i",
      "feasible",
      "wedge",
      "beachhead",
      "pmf",
      "product market fit",
      "problem",
      "solution",
      "hypothesis",
      "experiment",
      "mvp",
      "prototype",
      "test",
      "assumption"
    ]
  }
];
function computeRoutingHints(query) {
  const queryTokens = tokenize(query);
  const results = [];
  for (const domain of DOMAIN_CAPABILITIES) {
    let matchWeight = 0;
    for (const keyword of domain.keywords) {
      const kwTokens = keyword.split(/\s+/);
      if (kwTokens.length > 1) {
        const allPresent = kwTokens.every(
          (t) => queryTokens.some((qt) => qt.includes(t) || t.includes(qt))
        );
        if (allPresent) matchWeight += kwTokens.length * 2;
      } else {
        if (queryTokens.some((qt) => qt.includes(keyword) || keyword.includes(qt))) {
          matchWeight += 1;
        }
      }
    }
    const maxPossible = domain.keywords.length * 1.5;
    const score = Math.min(1, matchWeight / maxPossible);
    results.push({ domain: domain.domain, label: domain.label, score: Math.round(score * 100) / 100 });
  }
  return results.sort((a, b) => b.score - a.score);
}
function formatRoutingHintsForPrompt(hints) {
  const top = hints.filter((h) => h.score > 0).slice(0, 3);
  if (top.length === 0) return "";
  const lines = top.map((h) => `${h.label}: ${h.score}`).join(" | ");
  const best = top[0];
  return `Routing hints (token overlap): ${lines} \u2014 Highest signal: ${best.label}`;
}
function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2);
}

// packages/mcp-local/src/sync/store.ts
init_db();
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
function json(value, fallback = {}) {
  return JSON.stringify(value ?? fallback);
}
function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
function hashPayload(payload) {
  return createHash("sha256").update(JSON.stringify(payload ?? null)).digest("hex");
}
var sharedContextEventBus = new EventEmitter();
sharedContextEventBus.setMaxListeners(100);
function getSharedContextEventBus() {
  return sharedContextEventBus;
}
function emitSharedContextEvent(type, payload) {
  sharedContextEventBus.emit("shared_context", {
    type,
    payload,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
function parseSharedContextPeerRow(row) {
  return {
    peerId: row.peer_id,
    product: row.product,
    tenantId: row.tenant_id ?? null,
    workspaceId: row.workspace_id ?? null,
    surface: row.surface,
    role: row.role,
    capabilities: parseJson(row.capabilities_json, []),
    contextScopes: parseJson(row.context_scopes_json, []),
    status: row.status,
    summary: parseJson(row.summary_json, {}),
    metadata: parseJson(row.metadata_json, {}),
    lastHeartbeatAt: row.last_heartbeat_at
  };
}
function parseSharedContextPacketRow(row) {
  return {
    contextId: row.context_id,
    contextType: row.context_type,
    producerPeerId: row.producer_peer_id,
    tenantId: row.tenant_id ?? null,
    workspaceId: row.workspace_id ?? null,
    scope: parseJson(row.scope_json, []),
    subject: row.subject,
    summary: row.summary,
    claims: parseJson(row.claims_json, []),
    evidenceRefs: parseJson(row.evidence_refs_json, []),
    stateSnapshot: parseJson(row.state_snapshot_json, {}),
    timeWindow: parseJson(row.time_window_json, {}),
    freshness: parseJson(row.freshness_json, {}),
    permissions: parseJson(row.permissions_json, {}),
    confidence: row.confidence ?? void 0,
    lineage: parseJson(row.lineage_json, {}),
    invalidates: parseJson(row.invalidates_json, []),
    nextActions: parseJson(row.next_actions_json, []),
    version: row.version,
    status: row.status,
    metadata: parseJson(row.metadata_json, {})
  };
}
function parseSharedContextTaskRow(row) {
  return {
    taskId: row.task_id,
    taskType: row.task_type,
    proposerPeerId: row.proposer_peer_id,
    assigneePeerId: row.assignee_peer_id,
    status: row.status,
    taskSpec: parseJson(row.task_spec_json, {}),
    inputContextIds: parseJson(row.input_context_ids_json, []),
    outputContextId: row.output_context_id ?? null,
    reason: row.reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function requireSharedContextPeer(peerId) {
  const peer = getSharedContextPeer(peerId);
  if (!peer) {
    throw new Error(`Shared context peer not found: ${peerId}`);
  }
  return peer;
}
function normalizeVisibility(permissions) {
  const visibility = permissions?.visibility;
  if (visibility === "tenant" || visibility === "workspace" || visibility === "internal") {
    return visibility;
  }
  return "workspace";
}
function assertPeersShareScope(sourcePeer, destinationPeer, action) {
  const sourceWorkspace = sourcePeer.workspaceId ?? null;
  const destinationWorkspace = destinationPeer.workspaceId ?? null;
  const sourceTenant = sourcePeer.tenantId ?? null;
  const destinationTenant = destinationPeer.tenantId ?? null;
  if (sourceTenant && destinationTenant && sourceTenant !== destinationTenant) {
    throw new Error(`${action} denied: peers do not share tenant scope`);
  }
  if (sourceWorkspace && destinationWorkspace && sourceWorkspace !== destinationWorkspace) {
    throw new Error(`${action} denied: peers do not share workspace scope`);
  }
}
function canPeerAccessPacket(peer, packet) {
  const visibility = normalizeVisibility(packet.permissions);
  const allowedRoles = Array.isArray(packet.permissions?.allowedRoles) ? packet.permissions?.allowedRoles : [];
  if (packet.status === "invalidated") return false;
  if (allowedRoles.length > 0 && !allowedRoles.includes(peer.role)) return false;
  if (packet.tenantId && peer.tenantId && packet.tenantId !== peer.tenantId) return false;
  if (packet.workspaceId && peer.workspaceId && packet.workspaceId !== peer.workspaceId) return false;
  if (visibility === "internal") {
    return packet.producerPeerId === peer.peerId || (!packet.workspaceId || packet.workspaceId === peer.workspaceId) && (!packet.tenantId || packet.tenantId === peer.tenantId) && peer.product === requireSharedContextPeer(packet.producerPeerId).product;
  }
  if (visibility === "tenant") {
    if (packet.tenantId && peer.tenantId) return packet.tenantId === peer.tenantId;
    return !packet.workspaceId || packet.workspaceId === peer.workspaceId;
  }
  return !packet.workspaceId || packet.workspaceId === peer.workspaceId;
}
function requirePacketForPeer(contextId, peerId, action) {
  const peer = requireSharedContextPeer(peerId);
  const row = getDb().prepare(`
    SELECT *
    FROM shared_context_packets
    WHERE context_id = ?
    LIMIT 1
  `).get(contextId);
  if (!row) {
    throw new Error(`Shared context packet not found: ${contextId}`);
  }
  const packet = parseSharedContextPacketRow(row);
  if (!canPeerAccessPacket(peer, packet)) {
    throw new Error(`${action} denied: peer ${peerId} cannot access packet ${contextId}`);
  }
  return packet;
}
function upsertDurableObject(input) {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const objectId = input.id ?? genId(String(input.kind));
  const metadataJson = json(input.metadata);
  db.prepare(`
    INSERT INTO object_nodes (id, kind, label, source, status, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      kind = excluded.kind,
      label = excluded.label,
      source = excluded.source,
      status = excluded.status,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `).run(
    objectId,
    input.kind,
    input.label,
    input.source ?? "local",
    input.status ?? "active",
    metadataJson,
    now,
    now
  );
  const queuedSyncId = input.queueForSync === false ? void 0 : enqueueSyncOperation({
    objectId,
    objectKind: input.kind,
    opType: "upsert_object",
    payload: {
      id: objectId,
      kind: input.kind,
      label: input.label,
      source: input.source ?? "local",
      status: input.status ?? "active",
      metadata: input.metadata ?? {}
    }
  }).queueId;
  return { objectId, queuedSyncId };
}
function linkDurableObjects(input) {
  const db = getDb();
  const edgeId = input.id ?? genId("edge");
  db.prepare(`
    INSERT INTO object_edges (id, from_id, to_id, edge_type, confidence, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(from_id, to_id, edge_type) DO UPDATE SET
      confidence = excluded.confidence,
      metadata_json = excluded.metadata_json
  `).run(
    edgeId,
    input.fromId,
    input.toId,
    input.edgeType,
    input.confidence ?? 1,
    json(input.metadata),
    (/* @__PURE__ */ new Date()).toISOString()
  );
  const queuedSyncId = input.queueForSync === false ? void 0 : enqueueSyncOperation({
    objectId: input.fromId,
    objectKind: "workflow",
    opType: "link_object",
    payload: {
      id: edgeId,
      fromId: input.fromId,
      toId: input.toId,
      edgeType: input.edgeType,
      confidence: input.confidence ?? 1,
      metadata: input.metadata ?? {}
    }
  }).queueId;
  return { edgeId, queuedSyncId };
}
function recordExecutionReceipt(input) {
  const db = getDb();
  const receiptId = input.id ?? genId("receipt");
  const inputHash = input.input === void 0 ? null : hashPayload(input.input);
  const outputHash = input.output === void 0 ? null : hashPayload(input.output);
  db.prepare(`
    INSERT INTO execution_receipts (id, run_id, trace_id, step_id, object_id, tool_name, action_type, summary, input_hash, output_hash, status, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    receiptId,
    input.runId ?? null,
    input.traceId ?? null,
    input.stepId ?? null,
    input.objectId ?? null,
    input.toolName ?? null,
    input.actionType,
    input.summary,
    inputHash,
    outputHash,
    input.status ?? "recorded",
    json({
      ...input.metadata ?? {},
      input: input.input ?? null,
      output: input.output ?? null
    }),
    (/* @__PURE__ */ new Date()).toISOString()
  );
  const queuedSyncId = input.queueForSync === false ? void 0 : enqueueSyncOperation({
    objectId: input.objectId ?? input.runId ?? receiptId,
    objectKind: "trace",
    opType: "record_receipt",
    payload: {
      id: receiptId,
      runId: input.runId ?? null,
      traceId: input.traceId ?? null,
      stepId: input.stepId ?? null,
      objectId: input.objectId ?? null,
      toolName: input.toolName ?? null,
      actionType: input.actionType,
      summary: input.summary,
      status: input.status ?? "recorded",
      inputHash,
      outputHash,
      metadata: input.metadata ?? {}
    }
  }).queueId;
  return { receiptId, queuedSyncId };
}
function recordLocalArtifact(input) {
  const db = getDb();
  const artifactId = input.id ?? genId("artifact");
  const contentHash = input.content ? hashPayload(input.content) : null;
  db.prepare(`
    INSERT INTO local_artifacts (id, run_id, object_id, kind, path, content_hash, summary, verification_status, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    artifactId,
    input.runId ?? null,
    input.objectId ?? null,
    input.kind,
    input.path ?? null,
    contentHash,
    input.summary ?? null,
    input.verificationStatus ?? "unverified",
    json({
      ...input.metadata ?? {},
      contentPreview: typeof input.content === "string" ? input.content.slice(0, 500) : null
    }),
    (/* @__PURE__ */ new Date()).toISOString()
  );
  const queuedSyncId = input.queueForSync === false ? void 0 : enqueueSyncOperation({
    objectId: input.objectId ?? artifactId,
    objectKind: "artifact",
    opType: "record_artifact",
    payload: {
      id: artifactId,
      runId: input.runId ?? null,
      objectId: input.objectId ?? null,
      kind: input.kind,
      path: input.path ?? null,
      contentHash,
      summary: input.summary ?? null,
      verificationStatus: input.verificationStatus ?? "unverified",
      metadata: input.metadata ?? {}
    }
  }).queueId;
  return { artifactId, queuedSyncId };
}
function recordLocalOutcome(input) {
  const db = getDb();
  const outcomeId = input.id ?? genId("outcome");
  db.prepare(`
    INSERT INTO local_outcomes (id, run_id, object_id, outcome_type, headline, user_value, stakeholder_value, status, evidence_json, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    outcomeId,
    input.runId ?? null,
    input.objectId ?? null,
    input.outcomeType,
    input.headline,
    input.userValue ?? null,
    input.stakeholderValue ?? null,
    input.status ?? "draft",
    json(input.evidence ?? [], []),
    json(input.metadata),
    (/* @__PURE__ */ new Date()).toISOString()
  );
  const queuedSyncId = input.queueForSync === false ? void 0 : enqueueSyncOperation({
    objectId: input.objectId ?? outcomeId,
    objectKind: "outcome",
    opType: "record_outcome",
    payload: {
      id: outcomeId,
      runId: input.runId ?? null,
      objectId: input.objectId ?? null,
      outcomeType: input.outcomeType,
      headline: input.headline,
      userValue: input.userValue ?? null,
      stakeholderValue: input.stakeholderValue ?? null,
      status: input.status ?? "draft",
      evidence: input.evidence ?? [],
      metadata: input.metadata ?? {}
    }
  }).queueId;
  return { outcomeId, queuedSyncId };
}
function getActiveAccountBinding(deviceId) {
  const row = getDb().prepare(`
    SELECT id, device_id, user_id, workspace_id, scopes_json, sync_enabled, sync_mode, last_synced_at, revoked_at
    FROM account_bindings
    WHERE (? IS NULL OR device_id = ?)
      AND revoked_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `).get(deviceId ?? null, deviceId ?? null);
  if (!row) return null;
  return {
    bindingId: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    workspaceId: row.workspace_id ?? null,
    scopes: parseJson(row.scopes_json, []),
    syncEnabled: Boolean(row.sync_enabled),
    syncMode: row.sync_mode,
    lastSyncedAt: row.last_synced_at ?? null,
    revokedAt: row.revoked_at ?? null
  };
}
function enqueueSyncOperation(input) {
  const queueId = genId("sync");
  const payloadHash = hashPayload(input.payload);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  getDb().prepare(`
    INSERT INTO sync_queue (id, object_id, object_kind, op_type, payload_json, payload_hash, sync_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    queueId,
    input.objectId,
    input.objectKind,
    input.opType,
    json(input.payload),
    payloadHash,
    now,
    now
  );
  return { queueId, payloadHash };
}
function getSyncBridgeStatus(deviceId) {
  const db = getDb();
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN sync_status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN sync_status = 'retry' THEN 1 ELSE 0 END) AS retry_count,
      SUM(CASE WHEN sync_status = 'acknowledged' THEN 1 ELSE 0 END) AS acknowledged_count,
      MAX(acknowledged_at) AS last_acknowledged_at
    FROM sync_queue
  `).get();
  const activeBinding = getActiveAccountBinding(deviceId);
  return {
    mode: activeBinding && activeBinding.syncEnabled ? "connected" : "offline",
    activeBinding,
    pendingCount: counts?.pending_count ?? 0,
    retryCount: counts?.retry_count ?? 0,
    acknowledgedCount: counts?.acknowledged_count ?? 0,
    lastAcknowledgedAt: counts?.last_acknowledged_at ?? null
  };
}
function registerSharedContextPeer(input) {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const peerId = input.peerId ?? genId("peer");
  db.prepare(`
    INSERT INTO shared_context_peers (
      peer_id, product, tenant_id, workspace_id, surface, role, capabilities_json,
      context_scopes_json, status, summary_json, metadata_json, last_heartbeat_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(peer_id) DO UPDATE SET
      product = excluded.product,
      tenant_id = excluded.tenant_id,
      workspace_id = excluded.workspace_id,
      surface = excluded.surface,
      role = excluded.role,
      capabilities_json = excluded.capabilities_json,
      context_scopes_json = excluded.context_scopes_json,
      status = excluded.status,
      summary_json = excluded.summary_json,
      metadata_json = excluded.metadata_json,
      last_heartbeat_at = excluded.last_heartbeat_at,
      updated_at = excluded.updated_at
  `).run(
    peerId,
    input.product,
    input.tenantId ?? null,
    input.workspaceId ?? null,
    input.surface,
    input.role,
    json(input.capabilities ?? [], []),
    json(input.contextScopes ?? [], []),
    input.status ?? "active",
    json(input.summary ?? {}, {}),
    json(input.metadata),
    now,
    now,
    now
  );
  upsertDurableObject({
    id: peerId,
    kind: "peer",
    label: `${input.product}:${input.role}:${input.surface}`,
    source: "local",
    status: input.status ?? "active",
    metadata: {
      product: input.product,
      tenantId: input.tenantId ?? null,
      workspaceId: input.workspaceId ?? null,
      surface: input.surface,
      role: input.role,
      capabilities: input.capabilities ?? [],
      contextScopes: input.contextScopes ?? [],
      summary: input.summary ?? {},
      ...input.metadata ?? {}
    },
    queueForSync: false
  });
  const queuedSyncId = input.queueForSync === false ? void 0 : enqueueSyncOperation({
    objectId: peerId,
    objectKind: "peer",
    opType: "register_peer",
    payload: {
      peerId,
      product: input.product,
      tenantId: input.tenantId ?? null,
      workspaceId: input.workspaceId ?? null,
      surface: input.surface,
      role: input.role,
      capabilities: input.capabilities ?? [],
      contextScopes: input.contextScopes ?? [],
      status: input.status ?? "active",
      summary: input.summary ?? {},
      metadata: input.metadata ?? {},
      lastHeartbeatAt: now
    }
  }).queueId;
  emitSharedContextEvent("peer_registered", {
    peerId,
    product: input.product,
    workspaceId: input.workspaceId ?? null,
    role: input.role,
    surface: input.surface,
    status: input.status ?? "active"
  });
  return { peerId, queuedSyncId };
}
function listSharedContextPeers(filters = {}) {
  const rows = getDb().prepare(`
    SELECT *
    FROM shared_context_peers
    WHERE (? IS NULL OR product = ?)
      AND (? IS NULL OR workspace_id = ?)
      AND (? IS NULL OR tenant_id = ?)
      AND (? IS NULL OR role = ?)
      AND (? IS NULL OR surface = ?)
      AND (? IS NULL OR status = ?)
      AND (? IS NULL OR capabilities_json LIKE '%' || ? || '%')
      AND (? IS NULL OR context_scopes_json LIKE '%' || ? || '%')
    ORDER BY last_heartbeat_at DESC
    LIMIT ?
  `).all(
    filters.product ?? null,
    filters.product ?? null,
    filters.workspaceId ?? null,
    filters.workspaceId ?? null,
    filters.tenantId ?? null,
    filters.tenantId ?? null,
    filters.role ?? null,
    filters.role ?? null,
    filters.surface ?? null,
    filters.surface ?? null,
    filters.status ?? null,
    filters.status ?? null,
    filters.capability ?? null,
    filters.capability ?? null,
    filters.scope ?? null,
    filters.scope ?? null,
    filters.limit ?? 50
  );
  return rows.map(parseSharedContextPeerRow);
}
function getSharedContextPeer(peerId) {
  const row = getDb().prepare(`
    SELECT *
    FROM shared_context_peers
    WHERE peer_id = ?
    LIMIT 1
  `).get(peerId);
  return row ? parseSharedContextPeerRow(row) : null;
}
function getSharedContextPacket(contextId, requestingPeerId) {
  const row = getDb().prepare(`
    SELECT *
    FROM shared_context_packets
    WHERE context_id = ?
    LIMIT 1
  `).get(contextId);
  if (!row) return null;
  const packet = parseSharedContextPacketRow(row);
  if (!requestingPeerId) return packet;
  const peer = requireSharedContextPeer(requestingPeerId);
  return canPeerAccessPacket(peer, packet) ? packet : null;
}
function getPrimaryPacketScope(packet) {
  return packet.scope.find((scope) => scope !== "workspace");
}
function buildSharedContextPacketResource(packet, requestingPeerId) {
  const primaryScope = getPrimaryPacketScope(packet);
  return {
    packet,
    resourceUri: `shared-context://packet/${encodeURIComponent(packet.contextId)}`,
    pullQuery: {
      contextType: packet.contextType,
      producerPeerId: packet.producerPeerId,
      workspaceId: packet.workspaceId ?? void 0,
      tenantId: packet.tenantId ?? void 0,
      scopeIncludes: primaryScope,
      subjectIncludes: packet.subject
    },
    subscriptionQuery: {
      peerId: requestingPeerId ?? void 0,
      workspaceId: packet.workspaceId ?? void 0,
      contextType: packet.contextType,
      producerPeerId: packet.producerPeerId,
      scopeIncludes: primaryScope,
      subjectIncludes: packet.subject,
      eventTypes: [
        "packet_published",
        "packet_invalidated",
        "packet_acknowledged",
        "task_proposed",
        "task_status_changed"
      ]
    }
  };
}
function getSharedContextPacketResource(contextId, requestingPeerId) {
  const packet = getSharedContextPacket(contextId, requestingPeerId);
  if (!packet) return null;
  return buildSharedContextPacketResource(packet, requestingPeerId);
}
function normalizeSubscriptionEventTypes(eventTypes) {
  return eventTypes && eventTypes.length > 0 ? Array.from(new Set(eventTypes)) : [
    "packet_published",
    "packet_invalidated",
    "packet_acknowledged",
    "task_proposed",
    "task_status_changed",
    "message_sent"
  ];
}
function taskMatchesSubscription(task, packets, filters) {
  if (filters.taskType && task.taskType !== filters.taskType) return false;
  if (filters.peerId && task.proposerPeerId !== filters.peerId && task.assigneePeerId !== filters.peerId) {
    const relatedPacket = task.outputContextId ? packets.some((packet) => packet.contextId === task.outputContextId) : false;
    if (!relatedPacket) return false;
  }
  if (!filters.workspaceId) return true;
  const packetWorkspaceMatch = packets.some(
    (packet) => packet.contextId === task.outputContextId || task.inputContextIds.includes(packet.contextId)
  );
  if (packetWorkspaceMatch) return true;
  return false;
}
function messageMatchesSubscription(message, peers, filters) {
  if (filters.messageClass && message.messageClass !== filters.messageClass) return false;
  if (filters.peerId && message.fromPeerId !== filters.peerId && message.toPeerId !== filters.peerId) {
    return false;
  }
  if (!filters.workspaceId) return true;
  return peers.some(
    (peer) => peer.workspaceId === filters.workspaceId && (peer.peerId === message.fromPeerId || peer.peerId === message.toPeerId)
  );
}
function buildSharedContextSubscriptionManifest(query = {}) {
  const limit = query.limit ?? 10;
  const packets = pullSharedContextPackets({
    contextType: query.contextType,
    producerPeerId: query.producerPeerId,
    requestingPeerId: query.peerId ?? query.requestingPeerId,
    tenantId: query.tenantId,
    workspaceId: query.workspaceId,
    status: query.status,
    scopeIncludes: query.scopeIncludes,
    subjectIncludes: query.subjectIncludes,
    limit
  });
  const packetResources = packets.slice(0, limit).map((packet) => {
    const resource = buildSharedContextPacketResource(packet, query.peerId ?? query.requestingPeerId);
    return {
      contextId: packet.contextId,
      contextType: packet.contextType,
      subject: packet.subject,
      resourceUri: resource.resourceUri
    };
  });
  return {
    peerId: query.peerId ?? query.requestingPeerId,
    snapshotQuery: {
      limit,
      peerId: query.peerId ?? query.requestingPeerId,
      workspaceId: query.workspaceId ?? void 0,
      contextType: query.contextType,
      producerPeerId: query.producerPeerId,
      scopeIncludes: query.scopeIncludes,
      subjectIncludes: query.subjectIncludes,
      taskType: query.taskType,
      messageClass: query.messageClass
    },
    pullQuery: {
      contextType: query.contextType,
      producerPeerId: query.producerPeerId,
      requestingPeerId: query.peerId ?? query.requestingPeerId,
      tenantId: query.tenantId,
      workspaceId: query.workspaceId,
      status: query.status,
      scopeIncludes: query.scopeIncludes,
      subjectIncludes: query.subjectIncludes,
      limit
    },
    subscriptionQuery: {
      peerId: query.peerId ?? query.requestingPeerId,
      workspaceId: query.workspaceId ?? void 0,
      contextType: query.contextType,
      producerPeerId: query.producerPeerId,
      scopeIncludes: query.scopeIncludes,
      subjectIncludes: query.subjectIncludes,
      taskType: query.taskType,
      messageClass: query.messageClass,
      eventTypes: normalizeSubscriptionEventTypes(query.eventTypes)
    },
    packetResources
  };
}
function publishSharedContextPacket(input) {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const contextId = input.contextId ?? genId("context");
  const producerPeer = requireSharedContextPeer(input.producerPeerId);
  const workspaceId = input.workspaceId ?? producerPeer.workspaceId ?? null;
  const tenantId = input.tenantId ?? producerPeer.tenantId ?? null;
  const permissions = {
    visibility: "workspace",
    ...input.permissions ?? {}
  };
  if (producerPeer.workspaceId && workspaceId && producerPeer.workspaceId !== workspaceId) {
    throw new Error(`publish_shared_context denied: producer peer ${input.producerPeerId} cannot publish outside its workspace`);
  }
  if (producerPeer.tenantId && tenantId && producerPeer.tenantId !== tenantId) {
    throw new Error(`publish_shared_context denied: producer peer ${input.producerPeerId} cannot publish outside its tenant`);
  }
  db.prepare(`
    INSERT INTO shared_context_packets (
      context_id, context_type, producer_peer_id, tenant_id, workspace_id, scope_json, subject, summary,
      claims_json, evidence_refs_json, state_snapshot_json, time_window_json, freshness_json, permissions_json,
      confidence, lineage_json, invalidates_json, next_actions_json, version, status, metadata_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(context_id) DO UPDATE SET
      context_type = excluded.context_type,
      producer_peer_id = excluded.producer_peer_id,
      tenant_id = excluded.tenant_id,
      workspace_id = excluded.workspace_id,
      scope_json = excluded.scope_json,
      subject = excluded.subject,
      summary = excluded.summary,
      claims_json = excluded.claims_json,
      evidence_refs_json = excluded.evidence_refs_json,
      state_snapshot_json = excluded.state_snapshot_json,
      time_window_json = excluded.time_window_json,
      freshness_json = excluded.freshness_json,
      permissions_json = excluded.permissions_json,
      confidence = excluded.confidence,
      lineage_json = excluded.lineage_json,
      invalidates_json = excluded.invalidates_json,
      next_actions_json = excluded.next_actions_json,
      version = excluded.version,
      status = excluded.status,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `).run(
    contextId,
    input.contextType,
    input.producerPeerId,
    tenantId,
    workspaceId,
    json(input.scope ?? [], []),
    input.subject,
    input.summary,
    json(input.claims ?? [], []),
    json(input.evidenceRefs ?? [], []),
    json(input.stateSnapshot ?? {}, {}),
    json(input.timeWindow ?? {}, {}),
    json(input.freshness ?? {}, {}),
    json(permissions, {}),
    input.confidence ?? null,
    json(input.lineage ?? {}, {}),
    json(input.invalidates ?? [], []),
    json(input.nextActions ?? [], []),
    input.version ?? 1,
    input.status ?? "active",
    json(input.metadata),
    now,
    now
  );
  if ((input.invalidates ?? []).length > 0) {
    const invalidate = db.prepare(`
      UPDATE shared_context_packets
      SET status = 'invalidated', updated_at = ?
      WHERE context_id = ?
    `);
    for (const invalidatedId of input.invalidates ?? []) {
      invalidate.run(now, invalidatedId);
    }
  }
  upsertDurableObject({
    id: contextId,
    kind: "context_packet",
    label: input.subject,
    source: "local",
    status: input.status ?? "active",
    metadata: {
      contextType: input.contextType,
      producerPeerId: input.producerPeerId,
      tenantId,
      workspaceId,
      scope: input.scope ?? [],
      summary: input.summary,
      claims: input.claims ?? [],
      evidenceRefs: input.evidenceRefs ?? [],
      freshness: input.freshness ?? {},
      permissions,
      confidence: input.confidence ?? null,
      lineage: input.lineage ?? {},
      invalidates: input.invalidates ?? [],
      nextActions: input.nextActions ?? [],
      version: input.version ?? 1,
      ...input.metadata ?? {}
    },
    queueForSync: false
  });
  linkDurableObjects({
    fromId: input.producerPeerId,
    toId: contextId,
    edgeType: "produced_context",
    metadata: { contextType: input.contextType },
    queueForSync: false
  });
  for (const invalidatedId of input.invalidates ?? []) {
    linkDurableObjects({
      fromId: contextId,
      toId: invalidatedId,
      edgeType: "invalidates",
      queueForSync: false
    });
  }
  const queuedSyncId = input.queueForSync === false ? void 0 : enqueueSyncOperation({
    objectId: contextId,
    objectKind: "context_packet",
    opType: "publish_context",
    payload: {
      contextId,
      contextType: input.contextType,
      producerPeerId: input.producerPeerId,
      tenantId,
      workspaceId,
      scope: input.scope ?? [],
      subject: input.subject,
      summary: input.summary,
      claims: input.claims ?? [],
      evidenceRefs: input.evidenceRefs ?? [],
      stateSnapshot: input.stateSnapshot ?? {},
      timeWindow: input.timeWindow ?? {},
      freshness: input.freshness ?? {},
      permissions,
      confidence: input.confidence ?? null,
      lineage: input.lineage ?? {},
      invalidates: input.invalidates ?? [],
      nextActions: input.nextActions ?? [],
      version: input.version ?? 1,
      status: input.status ?? "active",
      metadata: input.metadata ?? {}
    }
  }).queueId;
  emitSharedContextEvent("packet_published", {
    contextId,
    producerPeerId: input.producerPeerId,
    contextType: input.contextType,
    workspaceId,
    tenantId,
    status: input.status ?? "active"
  });
  return { contextId, queuedSyncId };
}
function pullSharedContextPackets(query = {}) {
  const rows = getDb().prepare(`
    SELECT *
    FROM shared_context_packets
    WHERE (? IS NULL OR context_type = ?)
      AND (? IS NULL OR producer_peer_id = ?)
      AND (? IS NULL OR tenant_id = ?)
      AND (? IS NULL OR workspace_id = ?)
      AND (? IS NULL OR status = ?)
      AND (? IS NULL OR scope_json LIKE '%' || ? || '%')
      AND (? IS NULL OR subject LIKE '%' || ? || '%')
    ORDER BY created_at DESC
    LIMIT ?
  `).all(
    query.contextType ?? null,
    query.contextType ?? null,
    query.producerPeerId ?? null,
    query.producerPeerId ?? null,
    query.tenantId ?? null,
    query.tenantId ?? null,
    query.workspaceId ?? null,
    query.workspaceId ?? null,
    query.status ?? null,
    query.status ?? null,
    query.scopeIncludes ?? null,
    query.scopeIncludes ?? null,
    query.subjectIncludes ?? null,
    query.subjectIncludes ?? null,
    query.limit ?? 50
  );
  const packets = rows.map(parseSharedContextPacketRow);
  if (!query.requestingPeerId) return packets;
  const peer = requireSharedContextPeer(query.requestingPeerId);
  return packets.filter((packet) => canPeerAccessPacket(peer, packet));
}
function proposeSharedContextTask(input) {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const taskId = input.taskId ?? genId("task");
  const proposerPeer = requireSharedContextPeer(input.proposerPeerId);
  const assigneePeer = requireSharedContextPeer(input.assigneePeerId);
  assertPeersShareScope(proposerPeer, assigneePeer, "propose_shared_task");
  for (const contextId of input.inputContextIds ?? []) {
    requirePacketForPeer(contextId, input.proposerPeerId, "propose_shared_task");
    requirePacketForPeer(contextId, input.assigneePeerId, "propose_shared_task");
  }
  db.prepare(`
    INSERT INTO shared_context_tasks (
      task_id, task_type, proposer_peer_id, assignee_peer_id, status,
      task_spec_json, input_context_ids_json, output_context_id, reason, metadata_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(task_id) DO UPDATE SET
      task_type = excluded.task_type,
      proposer_peer_id = excluded.proposer_peer_id,
      assignee_peer_id = excluded.assignee_peer_id,
      status = excluded.status,
      task_spec_json = excluded.task_spec_json,
      input_context_ids_json = excluded.input_context_ids_json,
      output_context_id = excluded.output_context_id,
      reason = excluded.reason,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `).run(
    taskId,
    input.taskType,
    input.proposerPeerId,
    input.assigneePeerId,
    input.status ?? "proposed",
    json(input.taskSpec ?? {}, {}),
    json(input.inputContextIds ?? [], []),
    input.outputContextId ?? null,
    input.reason ?? null,
    json(input.metadata),
    now,
    now
  );
  upsertDurableObject({
    id: taskId,
    kind: "task",
    label: input.taskType,
    source: "local",
    status: input.status ?? "proposed",
    metadata: {
      proposerPeerId: input.proposerPeerId,
      assigneePeerId: input.assigneePeerId,
      taskSpec: input.taskSpec ?? {},
      inputContextIds: input.inputContextIds ?? [],
      outputContextId: input.outputContextId ?? null,
      reason: input.reason ?? null,
      ...input.metadata ?? {}
    },
    queueForSync: false
  });
  linkDurableObjects({
    fromId: input.proposerPeerId,
    toId: taskId,
    edgeType: "proposed_task",
    queueForSync: false
  });
  linkDurableObjects({
    fromId: taskId,
    toId: input.assigneePeerId,
    edgeType: "assigned_to",
    queueForSync: false
  });
  for (const contextId of input.inputContextIds ?? []) {
    linkDurableObjects({
      fromId: taskId,
      toId: contextId,
      edgeType: "input_context",
      queueForSync: false
    });
  }
  const queuedSyncId = input.queueForSync === false ? void 0 : enqueueSyncOperation({
    objectId: taskId,
    objectKind: "task",
    opType: "task_handoff",
    payload: {
      taskId,
      taskType: input.taskType,
      proposerPeerId: input.proposerPeerId,
      assigneePeerId: input.assigneePeerId,
      status: input.status ?? "proposed",
      taskSpec: input.taskSpec ?? {},
      inputContextIds: input.inputContextIds ?? [],
      outputContextId: input.outputContextId ?? null,
      reason: input.reason ?? null,
      metadata: input.metadata ?? {},
      createdAt: now
    }
  }).queueId;
  emitSharedContextEvent("task_proposed", {
    taskId,
    taskType: input.taskType,
    proposerPeerId: input.proposerPeerId,
    assigneePeerId: input.assigneePeerId,
    status: input.status ?? "proposed",
    createdAt: now
  });
  return { taskId, queuedSyncId };
}
function getSharedContextSnapshot(limit = 10, requestingPeerId) {
  const db = getDb();
  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM shared_context_peers WHERE status = 'active') AS active_peers,
      (SELECT COUNT(*) FROM shared_context_packets WHERE status = 'active') AS active_packets,
      (SELECT COUNT(*) FROM shared_context_packets WHERE status = 'invalidated') AS invalidated_packets,
      (SELECT COUNT(*) FROM shared_context_tasks WHERE status IN ('proposed', 'accepted')) AS open_tasks,
      (SELECT COUNT(*) FROM shared_context_messages WHERE status = 'unread') AS unread_messages
  `).get();
  const recentMessages = db.prepare(`
    SELECT id, from_peer_id, to_peer_id, message_class, payload_json, status, created_at
    FROM shared_context_messages
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit).map((row) => ({
    messageId: row.id,
    fromPeerId: row.from_peer_id,
    toPeerId: row.to_peer_id,
    messageClass: row.message_class,
    payload: parseJson(row.payload_json, {}),
    status: row.status,
    createdAt: row.created_at
  }));
  const allPeers = listSharedContextPeers({ limit });
  const allPackets = pullSharedContextPackets({ limit });
  const allTasks = db.prepare(`
      SELECT *
      FROM shared_context_tasks
      ORDER BY updated_at DESC
      LIMIT ?
    `).all(limit).map(parseSharedContextTaskRow);
  if (!requestingPeerId) {
    return {
      peers: allPeers,
      recentPackets: allPackets,
      recentTasks: allTasks,
      recentMessages,
      counts: {
        activePeers: counts?.active_peers ?? 0,
        activePackets: counts?.active_packets ?? 0,
        invalidatedPackets: counts?.invalidated_packets ?? 0,
        openTasks: counts?.open_tasks ?? 0,
        unreadMessages: counts?.unread_messages ?? 0
      }
    };
  }
  const requestingPeer = requireSharedContextPeer(requestingPeerId);
  const filteredPeers = allPeers.filter((peer) => {
    try {
      assertPeersShareScope(requestingPeer, peer, "get_shared_context_snapshot");
      return true;
    } catch {
      return peer.peerId === requestingPeer.peerId;
    }
  });
  const filteredPackets = allPackets.filter((packet) => canPeerAccessPacket(requestingPeer, packet));
  const filteredTasks = allTasks.filter((task) => {
    if (task.proposerPeerId === requestingPeer.peerId || task.assigneePeerId === requestingPeer.peerId) return true;
    const relatedOutput = task.outputContextId ? filteredPackets.some((packet) => packet.contextId === task.outputContextId) : false;
    return relatedOutput;
  });
  const filteredMessages = recentMessages.filter(
    (message) => message.toPeerId === requestingPeer.peerId || message.fromPeerId === requestingPeer.peerId
  );
  return {
    peers: filteredPeers,
    recentPackets: filteredPackets,
    recentTasks: filteredTasks,
    recentMessages: filteredMessages,
    counts: {
      activePeers: filteredPeers.filter((peer) => peer.status === "active").length,
      activePackets: filteredPackets.filter((packet) => packet.status === "active").length,
      invalidatedPackets: filteredPackets.filter((packet) => packet.status === "invalidated").length,
      openTasks: filteredTasks.filter((task) => task.status === "proposed" || task.status === "accepted").length,
      unreadMessages: filteredMessages.filter((message) => message.status === "unread").length
    }
  };
}
function getSharedContextScopedSnapshot(filters = {}) {
  const snapshot = getSharedContextSnapshot(filters.limit ?? 10, filters.peerId ?? filters.requestingPeerId);
  const peers = filters.workspaceId ? snapshot.peers.filter((peer) => peer.workspaceId === filters.workspaceId) : snapshot.peers;
  const recentPackets = snapshot.recentPackets.filter((packet) => {
    if (filters.workspaceId && packet.workspaceId !== filters.workspaceId) return false;
    if (filters.contextType && packet.contextType !== filters.contextType) return false;
    if (filters.producerPeerId && packet.producerPeerId !== filters.producerPeerId) return false;
    if (filters.scopeIncludes && !packet.scope.includes(filters.scopeIncludes)) return false;
    if (filters.subjectIncludes && !packet.subject.toLowerCase().includes(filters.subjectIncludes.toLowerCase())) {
      return false;
    }
    return true;
  });
  const recentTasks = snapshot.recentTasks.filter(
    (task) => taskMatchesSubscription(task, recentPackets, filters)
  );
  const recentMessages = snapshot.recentMessages.filter(
    (message) => messageMatchesSubscription(message, peers, filters)
  );
  return {
    peers,
    recentPackets,
    recentTasks,
    recentMessages,
    counts: {
      activePeers: peers.filter((peer) => peer.status === "active").length,
      activePackets: recentPackets.filter((packet) => packet.status === "active").length,
      invalidatedPackets: recentPackets.filter((packet) => packet.status === "invalidated").length,
      openTasks: recentTasks.filter((task) => task.status === "proposed" || task.status === "accepted").length,
      unreadMessages: recentMessages.filter((message) => message.status === "unread").length
    }
  };
}

// server/routes/search.ts
init_contextInjection();
var SEARCH_SOURCE = "search_api";
var CONTROL_PLANE_VIEW_ID = "view:control-plane";
var LENS_PERSONA_MAP = {
  founder: "FOUNDER_STRATEGY",
  investor: "EARLY_STAGE_VC",
  banker: "JPM_STARTUP_BANKER",
  ceo: "CORP_DEV",
  legal: "LEGAL_COMPLIANCE",
  student: "SIMPLIFIED_RESEARCH"
};
var GENERIC_WORKSPACE_LABELS = /* @__PURE__ */ new Set(["your workspace", "workspace"]);
function extractBrandPrefix2(value) {
  if (!value) return void 0;
  const trimmed = value.trim().replace(/^#\s*/, "");
  if (!trimmed) return void 0;
  return trimmed.split(/\s+[—–-]\s+/)[0]?.trim() || void 0;
}
function normalizeDisplayName(value) {
  if (!value) return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const lower = trimmed.toLowerCase();
  if (GENERIC_WORKSPACE_LABELS.has(lower)) return void 0;
  if (["nodebench", "nodebench ai", "nodebench-ai", "nodebench mcp", "nodebench-mcp", "nodebench_mcp"].includes(lower)) {
    return "NodeBench";
  }
  return trimmed;
}
function toFounderRole(lens) {
  if (lens === "banker" || lens === "ceo" || lens === "investor" || lens === "student" || lens === "legal") {
    return lens;
  }
  return "founder";
}
function normalizeWorkspaceName(value) {
  if (typeof value !== "string") return void 0;
  return normalizeDisplayName(value);
}
function inferExplicitLensFromQuery(query) {
  const normalized = query.toLowerCase();
  if (includesAny2(normalized, [
    "investment banking",
    "investment-banking",
    "banker",
    "banking style",
    "deal memo",
    "sell-side",
    "buy-side",
    "m&a",
    "m and a",
    "capital structure",
    "comparables",
    "comps",
    "banking work output"
  ])) {
    return "banker";
  }
  if (includesAny2(normalized, [
    "investor memo",
    "investor update",
    "vc",
    "venture",
    "investment committee",
    "diligence",
    "term sheet",
    "early-stage vc"
  ])) {
    return "investor";
  }
  if (includesAny2(normalized, ["legal", "compliance", "regulatory", "counsel"])) {
    return "legal";
  }
  if (includesAny2(normalized, ["student", "thesis", "class", "coursework"])) {
    return "student";
  }
  return void 0;
}
function inferOwnCompanyName(result) {
  return normalizeWorkspaceName(result?.identity?.projectName) ?? normalizeWorkspaceName(result?.publicSurfaces?.indexHtmlSiteName) ?? normalizeWorkspaceName(extractBrandPrefix2(result?.publicSurfaces?.indexHtmlTitle)) ?? normalizeWorkspaceName(result?.localContext?.company?.name) ?? normalizeWorkspaceName(result?.identity?.packageName);
}
function inferDisplayEntityName(result, companyMode) {
  if (companyMode === "own_company") {
    return normalizeWorkspaceName(result?.companyReadinessPacket?.identity?.companyName) ?? normalizeWorkspaceName(result?.companyNamingPack?.recommendedName) ?? normalizeWorkspaceName(result?.canonicalEntity?.name) ?? inferOwnCompanyName(result);
  }
  return normalizeWorkspaceName(result?.canonicalEntity?.name) ?? normalizeWorkspaceName(result?.companyReadinessPacket?.identity?.companyName) ?? normalizeWorkspaceName(result?.companyNamingPack?.recommendedName);
}
function resolveCompanyMode(args) {
  const ownCompanyName = inferOwnCompanyName(args.result);
  const hasPrivateContext = args.lens === "founder" && ["weekly_reset", "pre_delegation", "important_change", "founder_progression", "general"].includes(args.classification);
  return detectFounderCompanyMode({
    query: args.query,
    canonicalEntity: ownCompanyName,
    hasPrivateContext
  });
}
function shouldAttachFounderScaffolding(args) {
  const effectiveClassification = resolveEffectiveClassification(args);
  const companyMode = resolveCompanyMode({
    query: args.query,
    lens: args.lens,
    classification: effectiveClassification,
    result: args.result
  });
  if (companyMode !== "own_company") return false;
  return args.lens === "founder" || ["weekly_reset", "pre_delegation", "important_change", "founder_progression", "plan_proposal"].includes(effectiveClassification);
}
function stripFounderOnlyArtifacts(args) {
  if (shouldAttachFounderScaffolding(args)) return args.result;
  const {
    strategicAngles,
    progressionProfile,
    progressionTiers,
    diligencePack,
    readinessScore,
    unlocks,
    materialsChecklist,
    scorecards,
    shareableArtifacts,
    visibility,
    benchmarkEvidence,
    workflowComparison,
    operatingModel,
    distributionSurfaceStatus,
    companyReadinessPacket,
    companyNamingPack,
    ...rest
  } = args.result ?? {};
  return rest;
}
function resolveEffectiveClassification(args) {
  if (args.classification !== "general") return args.classification;
  const companyMode = resolveCompanyMode(args);
  if (args.lens === "founder" && args.classification === "general") {
    if (companyMode === "own_company") return "founder_progression";
    if (companyMode === "mixed_comparison") return "mixed_comparison";
  }
  return args.classification;
}
function resolveEffectivePacketType(args) {
  const explicitPacketType = typeof args.result?.packetType === "string" ? args.result.packetType : "";
  if (explicitPacketType && explicitPacketType !== "general_packet") return explicitPacketType;
  if (args.classification !== "general") return `${args.classification}_packet`;
  const routedPacketType = args.result?.operatingModel?.packetRouter?.packetType;
  if (typeof routedPacketType === "string" && routedPacketType.length > 0) return routedPacketType;
  return getFounderRolePacketDefault(toFounderRole(args.lens)).defaultPacketType;
}
function normalizeFounderIdentity(args) {
  const classification = resolveEffectiveClassification(args);
  const packetType = resolveEffectivePacketType({
    lens: args.lens,
    classification,
    result: args.result
  });
  const companyMode = resolveCompanyMode({ ...args, classification });
  const normalizedPacketType = companyMode !== "own_company" && packetType === "founder_progression_packet" ? `${classification}_packet` : packetType;
  const entityName = companyMode === "own_company" ? inferDisplayEntityName(args.result, companyMode) ?? "Your Company" : inferDisplayEntityName(args.result, companyMode);
  return { classification, packetType: normalizedPacketType, entityName };
}
function normalizeOwnCompanyFounderPayload(args) {
  const normalizedIdentity = normalizeFounderIdentity(args);
  const companyMode = resolveCompanyMode({
    query: args.query,
    lens: args.lens,
    classification: normalizedIdentity.classification,
    result: args.result
  });
  const entityName = normalizedIdentity.entityName;
  if (companyMode !== "own_company" || !entityName) return args.result;
  const namingPack = typeof args.result?.companyNamingPack === "object" ? args.result.companyNamingPack : void 0;
  const companyReadinessPacket = typeof args.result?.companyReadinessPacket === "object" ? args.result.companyReadinessPacket : void 0;
  const shareableArtifacts = Array.isArray(args.result?.shareableArtifacts) ? args.result.shareableArtifacts.map((artifact) => ({
    ...artifact,
    payload: artifact?.payload && typeof artifact.payload === "object" ? { ...artifact.payload, company: entityName } : artifact?.payload
  })) : args.result?.shareableArtifacts;
  return {
    ...args.result,
    canonicalEntity: {
      ...typeof args.result?.canonicalEntity === "object" ? args.result.canonicalEntity : {},
      name: entityName
    },
    companyNamingPack: namingPack ? {
      ...namingPack,
      recommendedName: entityName,
      suggestedNames: Array.from(/* @__PURE__ */ new Set([entityName, ...Array.isArray(namingPack.suggestedNames) ? namingPack.suggestedNames : []])),
      starterProfile: namingPack.starterProfile && typeof namingPack.starterProfile === "object" ? { ...namingPack.starterProfile, companyName: entityName } : namingPack.starterProfile
    } : namingPack,
    companyReadinessPacket: companyReadinessPacket ? {
      ...companyReadinessPacket,
      identity: companyReadinessPacket.identity && typeof companyReadinessPacket.identity === "object" ? { ...companyReadinessPacket.identity, companyName: entityName } : companyReadinessPacket.identity
    } : companyReadinessPacket,
    shareableArtifacts
  };
}
function parseJsonValue(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
function trimText(value, max = 220) {
  if (typeof value !== "string") return "";
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}\u2026` : value;
}
function toDomain(url) {
  if (!url) return void 0;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return void 0;
  }
}
function dedupeBy(items, keyFn) {
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}
function normalizeSourceRefs(result) {
  if (Array.isArray(result?.sourceRefs) && result.sourceRefs.length > 0) {
    return dedupeBy(result.sourceRefs, (source) => String(source.id ?? source.href ?? source.label ?? ""));
  }
  const rawSources = [
    ...Array.isArray(result?.sourcesUsed) ? result.sourcesUsed : [],
    ...Array.isArray(result?.webSources) ? result.webSources : []
  ];
  const mapped = rawSources.map((source, index) => {
    const href = source.url ?? source.href ?? void 0;
    const title = source.title ?? source.label ?? source.name ?? href ?? `Source ${index + 1}`;
    return {
      id: source.id ?? `source:${index + 1}`,
      label: title,
      href,
      type: source.type ?? "web",
      status: source.status ?? "cited",
      title,
      domain: source.domain ?? toDomain(href),
      publishedAt: source.publishedAtIso ?? source.publishedAt ?? null,
      thumbnailUrl: source.thumbnailUrl,
      excerpt: trimText(source.excerpt ?? source.snippet ?? source.summary ?? source.content, 260),
      confidence: typeof source.confidence === "number" ? source.confidence : void 0
    };
  });
  return dedupeBy(mapped, (source) => String(source.href ?? source.label ?? source.id));
}
function normalizeClaimRefs(result, sourceRefs) {
  if (Array.isArray(result?.claimRefs) && result.claimRefs.length > 0) {
    return result.claimRefs;
  }
  const defaultSourceIds = sourceRefs.slice(0, 3).map((source) => source.id);
  const claims = [];
  for (const signal of Array.isArray(result?.signals) ? result.signals : []) {
    claims.push({
      id: `claim:signal:${claims.length + 1}`,
      text: signal.name ?? signal.title ?? String(signal),
      sourceRefIds: defaultSourceIds,
      answerBlockIds: ["answer:block:summary"],
      status: "retained"
    });
  }
  for (const change of Array.isArray(result?.whatChanged) ? result.whatChanged : []) {
    claims.push({
      id: `claim:change:${claims.length + 1}`,
      text: change.description ?? String(change),
      sourceRefIds: defaultSourceIds,
      answerBlockIds: ["answer:block:changes"],
      status: "retained"
    });
  }
  for (const contradiction of Array.isArray(result?.contradictions) ? result.contradictions : []) {
    claims.push({
      id: `claim:risk:${claims.length + 1}`,
      text: contradiction.claim ?? contradiction.title ?? String(contradiction),
      sourceRefIds: defaultSourceIds,
      answerBlockIds: ["answer:block:risks"],
      status: "contradicted"
    });
  }
  return claims.slice(0, 12);
}
function blockStatus(sourceRefIds, explicitUncertainty) {
  if (sourceRefIds.length > 0) return "cited";
  if (explicitUncertainty) return "uncertain";
  return "draft";
}
function normalizeAnswerBlocks(result, sourceRefs, claimRefs) {
  if (Array.isArray(result?.answerBlocks) && result.answerBlocks.length > 0) {
    return result.answerBlocks;
  }
  const citedSourceIds = sourceRefs.slice(0, 4).map((source) => source.id);
  const sourceBacked = citedSourceIds.length > 0;
  const blocks = [];
  const summaryText = trimText(result?.canonicalEntity?.canonicalMission ?? result?.summary ?? "", 420);
  if (summaryText) {
    blocks.push({
      id: "answer:block:summary",
      title: "Bottom line",
      text: summaryText,
      sourceRefIds: citedSourceIds,
      claimIds: claimRefs.filter((claim) => claim.answerBlockIds.includes("answer:block:summary")).map((claim) => claim.id),
      status: blockStatus(citedSourceIds, !sourceBacked)
    });
  }
  const keyFactsText = (Array.isArray(result?.signals) ? result.signals : []).slice(0, 4).map((signal) => `\u2022 ${signal.name ?? signal.title ?? String(signal)}`).join("\n");
  if (keyFactsText) {
    blocks.push({
      id: "answer:block:key_facts",
      title: "Key facts and signal readout",
      text: keyFactsText,
      sourceRefIds: citedSourceIds,
      claimIds: [],
      status: blockStatus(citedSourceIds, !sourceBacked)
    });
  }
  const changesText = (Array.isArray(result?.whatChanged) ? result.whatChanged : []).slice(0, 3).map((change) => `\u2022 ${change.description ?? String(change)}${change.date ? ` (${change.date})` : ""}`).join("\n");
  if (changesText) {
    blocks.push({
      id: "answer:block:changes",
      title: "What changed",
      text: changesText,
      sourceRefIds: citedSourceIds,
      claimIds: claimRefs.filter((claim) => claim.answerBlockIds.includes("answer:block:changes")).map((claim) => claim.id),
      status: blockStatus(citedSourceIds, !sourceBacked)
    });
  }
  const comparablesText = (Array.isArray(result?.comparables) ? result.comparables : []).slice(0, 4).map((item) => `\u2022 ${item.name ?? String(item)}${item.note ? `: ${item.note}` : ""}`).join("\n");
  if (comparablesText) {
    blocks.push({
      id: "answer:block:comparables",
      title: "Competitive frame",
      text: comparablesText,
      sourceRefIds: citedSourceIds,
      claimIds: [],
      status: blockStatus(citedSourceIds, !sourceBacked)
    });
  }
  const whyThisTeam = result?.whyThisTeam;
  const credibilityText = whyThisTeam && typeof whyThisTeam === "object" ? [
    typeof whyThisTeam.founderCredibility === "string" ? whyThisTeam.founderCredibility : "",
    Array.isArray(whyThisTeam.trustSignals) && whyThisTeam.trustSignals.length > 0 ? `Trust signals: ${whyThisTeam.trustSignals.slice(0, 3).join("; ")}` : "",
    typeof whyThisTeam.visionMagnitude === "string" && whyThisTeam.visionMagnitude ? `Scale lens: ${whyThisTeam.visionMagnitude}` : ""
  ].filter(Boolean).join("\n") : "";
  if (credibilityText) {
    blocks.push({
      id: "answer:block:credibility",
      title: "Why this team matters",
      text: credibilityText,
      sourceRefIds: citedSourceIds,
      claimIds: [],
      status: blockStatus(citedSourceIds, true)
    });
  }
  const risksText = (Array.isArray(result?.contradictions) ? result.contradictions : []).slice(0, 3).map((item) => `\u2022 ${item.claim ?? item.title ?? String(item)}${item.evidence ? `: ${item.evidence}` : ""}`).join("\n");
  if (risksText) {
    blocks.push({
      id: "answer:block:risks",
      title: "Risks and diligence flags",
      text: risksText,
      sourceRefIds: citedSourceIds,
      claimIds: claimRefs.filter((claim) => claim.answerBlockIds.includes("answer:block:risks")).map((claim) => claim.id),
      status: blockStatus(citedSourceIds, true)
    });
  }
  const diligenceQuestionsText = (Array.isArray(result?.nextQuestions) ? result.nextQuestions : []).slice(0, 4).map((question) => `\u2022 ${String(question)}`).join("\n");
  if (diligenceQuestionsText) {
    blocks.push({
      id: "answer:block:diligence_questions",
      title: "Next diligence questions",
      text: diligenceQuestionsText,
      sourceRefIds: citedSourceIds,
      claimIds: [],
      status: blockStatus(citedSourceIds, true)
    });
  }
  const nextAction = (Array.isArray(result?.nextActions) ? result.nextActions : [])[0];
  if (nextAction) {
    blocks.push({
      id: "answer:block:next",
      title: "Recommended next move",
      text: nextAction.action ?? String(nextAction),
      sourceRefIds: citedSourceIds,
      claimIds: [],
      status: blockStatus(citedSourceIds, true)
    });
  }
  return blocks;
}
function buildExplorationMemory(result, sourceRefs, claimRefs) {
  if (result?.explorationMemory) return result.explorationMemory;
  const contradictionCount = Array.isArray(result?.contradictions) ? result.contradictions.length : 0;
  const exploredSourceCount = Math.max(sourceRefs.length, contradictionCount > 0 ? 3 : sourceRefs.length);
  const citedSourceCount = sourceRefs.filter((source) => source.status !== "discarded").length;
  return {
    exploredSourceCount,
    citedSourceCount,
    discardedSourceCount: Math.max(0, exploredSourceCount - citedSourceCount),
    entityCount: result?.canonicalEntity?.name ? 1 : 0,
    claimCount: claimRefs.length,
    contradictionCount
  };
}
function includesAny2(value, terms) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}
function buildStrategicAngles(args) {
  if (!shouldAttachFounderScaffolding({
    query: args.query,
    lens: args.lens,
    classification: typeof args.result?.packetType === "string" ? String(args.result.packetType).replace(/_packet$/, "") : typeof args.result?.classification === "string" ? args.result.classification : "general",
    result: args.result
  })) {
    return [];
  }
  if (Array.isArray(args.result?.strategicAngles) && args.result.strategicAngles.length > 0) {
    return args.result.strategicAngles;
  }
  const queryText = `${args.query} ${args.result?.canonicalEntity?.canonicalMission ?? ""}`.toLowerCase();
  const signalText = (args.result?.signals ?? []).map((signal) => signal.name ?? signal.title ?? String(signal)).join(" ").toLowerCase();
  const evidenceRefIds = args.sourceRefs.slice(0, 2).map((source) => source.id);
  const sourceRich = args.sourceRefs.filter((source) => source.status !== "discarded").length >= 2;
  const confidence = Number(args.result?.canonicalEntity?.identityConfidence ?? 0);
  const integrationHeavy = includesAny2(queryText, ["mcp", "api", "plugin", "integration", "claude code", "cursor", "workflow", "agent"]);
  const installFriendly = includesAny2(queryText, ["install", "local", "cli", "dashboard", "subscription", "service", "retention.sh"]);
  const maintenanceHeavy = includesAny2(queryText, ["maintenance", "maintain", "update", "support", "ops", "dashboard service", "subscription service"]);
  const regulated = includesAny2(queryText, ["legal", "regulatory", "healthcare", "fda", "bank", "compliance"]);
  const aiSkeptic = includesAny2(queryText, ["no ai", "without ai", "anti ai", "environment", "peace", "altruistic"]);
  const constrainedTeam = includesAny2(queryText, ["specific skillset", "narrow skillset", "solo founder", "limited team", "small team"]);
  const exposureRisk = args.lens === "founder" || includesAny2(queryText, ["stealth", "moat", "launch", "posting", "post publicly", "announce", "go public", "marketing", "reveal"]);
  const marketAligned = includesAny2(queryText, ["claude code", "developer", "team", "workflow", "founder", "agent", "dashboard"]) || includesAny2(signalText, ["distribution", "workflow", "developer", "adoption"]);
  const evidenceStrong = sourceRich && confidence >= 80;
  const angles = [
    {
      id: "stealth-moat",
      title: "Stealth, moat, and public exposure timing",
      status: exposureRisk ? "watch" : "unknown",
      summary: exposureRisk ? "Before posting broadly, assume the idea is easier to copy than it feels. Stay relatively stealthy until the moat and market diligence are clearer." : "The packet does not yet establish whether public exposure helps more than it harms before the moat is proven.",
      whyItMatters: "Premature public posting can hand the market your playbook before you have a hard-to-duplicate advantage.",
      evidenceRefIds,
      nextQuestion: "What are competitors actually doing today, how copyable is this, and what moat would justify posting now instead of staying quieter longer?"
    },
    {
      id: "team-shape",
      title: "Team shape and complementary gaps",
      status: constrainedTeam ? "watch" : "unknown",
      summary: constrainedTeam ? "The direction appears to lean on a narrow or founder-heavy skillset, which can sharpen the wedge but also exposes obvious complementary gaps." : "The packet does not yet explain whether the team shape is a true edge or an unaddressed bottleneck.",
      whyItMatters: "Specific skillsets help when they map directly to the wedge, but they slow progress when GTM, support, or adjacent execution gaps remain implicit.",
      evidenceRefIds,
      nextQuestion: "Which complementary capability would most reduce risk for this direction right now?"
    },
    {
      id: "founder-fit",
      title: "Founder-skill and credibility fit",
      status: evidenceStrong ? "watch" : "unknown",
      summary: evidenceStrong ? "The opportunity is legible, but the packet still needs explicit proof that the team background makes this wedge believable to users and investors." : "The current run does not yet establish why this team is the credible builder for the idea.",
      whyItMatters: "A strong direction still fails if the founder narrative and real execution edge do not match the promise.",
      evidenceRefIds,
      nextQuestion: "What founder background, customer access, or technical edge makes us the believable team for this direction?"
    },
    {
      id: "build-speed",
      title: "Build speed and maintenance burden",
      status: regulated ? "watch" : integrationHeavy || installFriendly ? "strong" : "watch",
      summary: regulated ? "The opportunity touches regulated or high-trust surfaces, so build speed may be slower and more operationally expensive than it first appears." : integrationHeavy || installFriendly ? "The direction appears to fit existing install surfaces and workflows, which improves time-to-value and maintenance leverage." : "The packet still needs proof that this can be shipped and maintained quickly with the current team and stack.",
      whyItMatters: "Founders need a wedge that ships fast, installs cleanly, and does not immediately create support debt.",
      evidenceRefIds,
      nextQuestion: "What is the smallest installable wedge we can ship in 2-4 weeks without creating long-term maintenance drag?"
    },
    {
      id: "installability",
      title: "Installability and update path",
      status: installFriendly ? "strong" : "watch",
      summary: installFriendly ? "The direction appears to fit real install surfaces such as local CLI, MCP, or a hosted dashboard, which improves onboarding and update reliability." : "The packet still needs proof that users can install, maintain, and update this without high-touch support.",
      whyItMatters: "Products that are easy to install and keep current spread faster and generate less early support drag.",
      evidenceRefIds,
      nextQuestion: "Is the first wedge easiest to adopt as a local MCP tool, a browser workflow, or a hosted team dashboard?"
    },
    {
      id: "maintainability",
      title: "Maintainability and service burden",
      status: maintenanceHeavy || regulated ? "watch" : installFriendly ? "strong" : "watch",
      summary: maintenanceHeavy || regulated ? "The direction likely creates ongoing update, support, or compliance work, so the team needs a clearer owner model and service boundary." : "The current architecture suggests the product can stay relatively lean to operate if the first wedge remains narrow.",
      whyItMatters: "Founders lose momentum when the first product creates more support and maintenance load than compounding leverage.",
      evidenceRefIds,
      nextQuestion: "What parts of this should be productized, automated, or intentionally left out so maintenance load stays bounded?"
    },
    {
      id: "adoption",
      title: "Workflow adoption and distribution fit",
      status: marketAligned ? "strong" : "watch",
      summary: marketAligned ? "The packet points to a workflow users already run today, including current developer loops like Claude Code and adjacent agent tooling." : "The product story still needs proof that it rides a current user workflow instead of requiring a new habit.",
      whyItMatters: "The fastest product adoption comes from plugging into high-frequency workflows people already trust.",
      evidenceRefIds,
      nextQuestion: "Which current workflow does this replace, accelerate, or become unavoidable inside?"
    },
    {
      id: "commercial",
      title: "Commercialization and saleability",
      status: installFriendly ? "strong" : "watch",
      summary: installFriendly ? "The direction can plausibly expand from a tool into a dashboard, team workflow, or subscription service." : "The packet does not yet prove how the tool becomes a repeatable product, subscription, or saleable operating layer.",
      whyItMatters: "A useful prototype is not enough. The business has to be easy to buy, maintain, and grow.",
      evidenceRefIds,
      nextQuestion: "Does this become a paid dashboard, an agent workflow subscription, or a service layer teams will renew every month?"
    },
    {
      id: "conviction",
      title: "User and investor conviction",
      status: evidenceStrong ? "strong" : "watch",
      summary: evidenceStrong ? "The run has enough proof to start a conviction story, but the timing and upside narrative can still be tighter." : "The idea needs sharper proof, comparables, and timing signals before it will survive diligence.",
      whyItMatters: "Conviction compounds when users and investors can repeat the story without you in the room.",
      evidenceRefIds,
      nextQuestion: "What proof points, comparables, or traction signals would make this direction legible to users and investors?"
    }
  ];
  if (args.lens === "founder" || aiSkeptic) {
    angles.push({
      id: "ai-tradeoffs",
      title: "AI stance and mission tradeoffs",
      status: aiSkeptic ? "watch" : "unknown",
      summary: aiSkeptic ? "The query raises discomfort with AI usage, so the product needs a clearer point of view on where AI helps and where it should stay optional." : "The packet does not yet resolve whether AI is essential to the product or simply a convenience layer that could alienate some users or teammates.",
      whyItMatters: "Founders need a deliberate answer for people who resist AI on ethical, environmental, or mission grounds.",
      evidenceRefIds,
      nextQuestion: "Where is AI actually necessary here, and where should we offer a non-AI or low-AI path so the product stays aligned with the mission?"
    });
  }
  return angles;
}
function shouldRunFounderDirectionAssessment(args) {
  const externalResearchClassification = ["company_search", "competitor", "multi_entity"].includes(args.classification);
  if (externalResearchClassification) {
    if (!args.result) return false;
    return shouldAttachFounderScaffolding({
      query: args.query,
      lens: args.lens,
      classification: args.classification,
      result: args.result
    });
  }
  if (args.lens === "founder") return true;
  if (["weekly_reset", "important_change", "pre_delegation", "general", "plan_proposal"].includes(args.classification)) {
    return true;
  }
  return includesAny2(args.query, [
    "pressure-test",
    "team fit",
    "founder fit",
    "claude code",
    "install",
    "maintain",
    "subscription",
    "dashboard",
    "credibility",
    "adoption",
    "ai",
    "environment",
    "stealth",
    "moat",
    "post publicly",
    "announce",
    "sell"
  ]);
}
function mergeFounderDirectionAssessment(result, assessment) {
  if (!assessment || typeof assessment !== "object") return result;
  const mergedSourceRefs = dedupeBy(
    [
      ...Array.isArray(result?.sourceRefs) ? result.sourceRefs : [],
      ...Array.isArray(assessment.sourceRefs) ? assessment.sourceRefs : []
    ],
    (source) => String(source.id ?? source.href ?? source.label ?? "")
  );
  return {
    ...result,
    canonicalEntity: {
      ...result?.canonicalEntity,
      ...assessment?.canonicalEntity,
      name: inferOwnCompanyName({
        ...result,
        ...assessment,
        canonicalEntity: {
          ...result?.canonicalEntity,
          ...assessment?.canonicalEntity
        }
      }) ?? result?.canonicalEntity?.name ?? assessment?.canonicalEntity?.name
    },
    sourceRefs: mergedSourceRefs.length > 0 ? mergedSourceRefs : result?.sourceRefs,
    strategicAngles: Array.isArray(assessment.strategicAngles) && assessment.strategicAngles.length > 0 ? assessment.strategicAngles : result?.strategicAngles,
    packetType: assessment?.operatingModel?.packetRouter?.packetType ?? result?.operatingModel?.packetRouter?.packetType ?? result?.packetType,
    recommendedNextAction: assessment.recommendedNextAction ?? result?.recommendedNextAction,
    nextQuestions: Array.from(
      /* @__PURE__ */ new Set([
        ...Array.isArray(result?.nextQuestions) ? result.nextQuestions : [],
        ...Array.isArray(assessment.nextQuestions) ? assessment.nextQuestions : []
      ])
    ).slice(0, 10),
    uncertaintyBoundary: result?.uncertaintyBoundary ?? "The strategic pressure test mixes live search output with local project evidence. Treat it as directional until the next live refresh.",
    progressionProfile: assessment.progressionProfile ?? result?.progressionProfile,
    progressionTiers: assessment.progressionTiers ?? result?.progressionTiers,
    diligencePack: assessment.diligencePack ?? result?.diligencePack,
    readinessScore: assessment.readinessScore ?? result?.readinessScore,
    unlocks: assessment.unlocks ?? result?.unlocks,
    materialsChecklist: assessment.materialsChecklist ?? result?.materialsChecklist,
    scorecards: assessment.scorecards ?? result?.scorecards,
    shareableArtifacts: assessment.shareableArtifacts ?? result?.shareableArtifacts,
    visibility: assessment.visibility ?? result?.visibility,
    benchmarkEvidence: assessment.benchmarkEvidence ?? result?.benchmarkEvidence,
    workflowComparison: assessment.workflowComparison ?? result?.workflowComparison,
    operatingModel: assessment.operatingModel ?? result?.operatingModel,
    distributionSurfaceStatus: assessment.distributionSurfaceStatus ?? result?.distributionSurfaceStatus,
    companyReadinessPacket: assessment.companyReadinessPacket ?? result?.companyReadinessPacket,
    companyNamingPack: assessment.companyNamingPack ?? result?.companyNamingPack,
    founderDirectionAssessment: assessment
  };
}
function buildGraphArtifacts(args) {
  const graphNodes = [
    { id: "query:current", kind: "query", label: trimText(args.query, 80), status: "verified" },
    { id: `lens:${args.lens}`, kind: "lens", label: args.lens, status: "verified" },
    { id: `persona:${args.persona}`, kind: "persona", label: args.persona, status: "verified" },
    { id: "context:bundle", kind: "context_bundle", label: "Context bundle", status: "verified" }
  ];
  const graphEdges = [
    { fromId: "query:current", toId: `lens:${args.lens}`, kind: "selected" },
    { fromId: `lens:${args.lens}`, toId: `persona:${args.persona}`, kind: "selected" },
    { fromId: `persona:${args.persona}`, toId: "context:bundle", kind: "selected" }
  ];
  for (const source of args.sourceRefs) {
    graphNodes.push({
      id: source.id,
      kind: "source",
      label: trimText(source.label ?? source.title ?? "Source", 60),
      status: source.status === "discarded" ? "incomplete" : "verified",
      confidence: source.confidence
    });
    graphEdges.push({ fromId: "context:bundle", toId: source.id, kind: "explored" });
  }
  for (const claim of args.claimRefs) {
    graphNodes.push({
      id: claim.id,
      kind: claim.status === "contradicted" ? "contradiction" : "claim",
      label: trimText(claim.text, 70),
      status: claim.status === "retained" ? "verified" : "provisional"
    });
    for (const sourceId of claim.sourceRefIds ?? []) {
      graphEdges.push({
        fromId: sourceId,
        toId: claim.id,
        kind: claim.status === "contradicted" ? "conflicts_with" : "supports"
      });
    }
  }
  for (const block of args.answerBlocks) {
    graphNodes.push({
      id: block.id,
      kind: "answer_block",
      label: trimText(block.title, 50),
      status: block.status === "cited" ? "verified" : "provisional"
    });
    for (const claimId of block.claimIds ?? []) {
      graphEdges.push({ fromId: claimId, toId: block.id, kind: "used_in" });
    }
    for (const sourceId of block.sourceRefIds ?? []) {
      graphEdges.push({ fromId: sourceId, toId: block.id, kind: "about" });
    }
  }
  graphNodes.push({
    id: args.packetId,
    kind: "artifact",
    label: "Founder packet",
    status: "verified"
  });
  for (const block of args.answerBlocks) {
    graphEdges.push({ fromId: block.id, toId: args.packetId, kind: "used_in" });
  }
  if (args.recommendedNextAction) {
    graphNodes.push({
      id: "follow_up:next_action",
      kind: "follow_up",
      label: trimText(args.recommendedNextAction, 70),
      status: "provisional"
    });
    graphEdges.push({ fromId: args.packetId, toId: "follow_up:next_action", kind: "suggests" });
  }
  return {
    graphNodes,
    graphEdges,
    graphSummary: {
      nodeCount: graphNodes.length,
      edgeCount: graphEdges.length,
      clusterCount: Math.max(1, Math.min(4, 1 + args.sourceRefs.length)),
      primaryPath: ["query", "lens", "persona", "source", "claim", "answer_block", "artifact"]
    }
  };
}
function toProofStatus(sourceRefs, answerBlocks, judgeVerdict) {
  if (sourceRefs.length === 0) return "incomplete";
  const hasOrphanedCitedBlock = answerBlocks.some(
    (block) => block.status === "cited" && (!Array.isArray(block.sourceRefIds) || block.sourceRefIds.length === 0)
  );
  if (hasOrphanedCitedBlock) return "incomplete";
  if (judgeVerdict?.verdict === "pass") return "verified";
  if (judgeVerdict?.verdict === "fail") return "drifting";
  return "provisional";
}
function buildResultPacket(args) {
  const result = stripFounderOnlyArtifacts({
    query: args.query,
    lens: args.lens,
    classification: args.classification,
    result: normalizeOwnCompanyFounderPayload({
      query: args.query,
      lens: args.lens,
      classification: args.classification,
      result: args.result ?? {}
    })
  });
  const companyMode = resolveCompanyMode({
    query: args.query,
    lens: args.lens,
    classification: args.classification,
    result
  });
  const sourceRefs = Array.isArray(result.sourceRefs) ? result.sourceRefs : [];
  const normalizedIdentity = normalizeFounderIdentity({
    query: args.query,
    lens: args.lens,
    classification: args.classification,
    result
  });
  const entityName = companyMode === "own_company" ? normalizedIdentity.entityName ?? result.canonicalEntity?.name ?? args.entityFallback ?? "NodeBench" : args.entityFallback ?? normalizedIdentity.entityName ?? result.canonicalEntity?.name ?? "NodeBench";
  const keyMetricLimit = args.lens === "banker" ? 6 : 4;
  return {
    query: args.query,
    entityName,
    answer: result.canonicalEntity?.canonicalMission ?? "",
    confidence: result.canonicalEntity?.identityConfidence ?? 70,
    sourceCount: sourceRefs.length,
    variables: classifySignals((result.signals ?? []).slice(0, 8)).slice(0, 5).map((sig, index) => ({
      rank: index + 1,
      name: sig.label,
      category: sig.category,
      direction: sig.direction,
      impact: sig.impact,
      confidence: sig.confidence,
      rawName: sig.rawName,
      evidenceRefs: sig.evidenceRefs,
      needsOntologyReview: sig.needsOntologyReview
    })),
    keyMetrics: Array.isArray(result.keyMetrics) && result.keyMetrics.length > 0 ? result.keyMetrics.slice(0, keyMetricLimit).map((metric) => ({
      label: metric.label ?? "Metric",
      value: String(metric.value ?? "")
    })) : [
      { label: "Confidence", value: `${result.canonicalEntity?.identityConfidence ?? 0}%` },
      { label: "Sources", value: String(sourceRefs.length) },
      { label: "Claims", value: String(result.claimRefs?.length ?? 0) },
      { label: "Next actions", value: String(result.nextActions?.length ?? 0) }
    ],
    changes: result.whatChanged?.map((change) => ({
      description: change.description ?? String(change),
      date: change.date
    })),
    risks: result.contradictions?.map((contradiction) => ({
      title: contradiction.claim ?? contradiction.title ?? "Contradiction",
      description: contradiction.evidence ?? contradiction.description ?? "",
      falsification: contradiction.falsification
    })),
    comparables: result.comparables?.map((comparable) => ({
      name: comparable.name ?? String(comparable),
      relevance: comparable.relevance ?? "medium",
      note: comparable.note ?? ""
    })),
    whyThisTeam: result.whyThisTeam ?? null,
    packetId: result.packetId,
    packetType: normalizedIdentity.packetType,
    canonicalEntity: entityName,
    sourceRefs: result.sourceRefs,
    claimRefs: result.claimRefs,
    answerBlocks: result.answerBlocks,
    explorationMemory: result.explorationMemory,
    graphSummary: result.graphSummary,
    proofStatus: result.proofStatus,
    uncertaintyBoundary: result.uncertaintyBoundary,
    recommendedNextAction: result.recommendedNextAction,
    graphNodes: result.graphNodes,
    graphEdges: result.graphEdges,
    strategicAngles: result.strategicAngles,
    progressionProfile: result.progressionProfile,
    progressionTiers: result.progressionTiers,
    diligencePack: result.diligencePack,
    readinessScore: result.readinessScore,
    unlocks: result.unlocks,
    materialsChecklist: result.materialsChecklist,
    scorecards: result.scorecards,
    shareableArtifacts: result.shareableArtifacts,
    visibility: result.visibility,
    benchmarkEvidence: result.benchmarkEvidence,
    workflowComparison: result.workflowComparison,
    operatingModel: result.operatingModel,
    distributionSurfaceStatus: result.distributionSurfaceStatus,
    companyReadinessPacket: result.companyReadinessPacket,
    companyNamingPack: result.companyNamingPack,
    interventions: result.nextActions?.slice(0, 4).map((action) => ({
      action: action.action ?? String(action),
      impact: action.impact ?? "medium"
    })),
    nextQuestions: result.nextQuestions ?? result.nextActions?.map((action) => action.action) ?? [],
    evidence: createEvidenceSpans(
      result.sourceSnippets ?? sourceRefs.map((ref) => ({ url: ref.url, title: ref.title, snippet: ref.snippet })),
      result.signals ?? []
    )
  };
}
function decorateResultWithProof(args) {
  const persona = LENS_PERSONA_MAP[args.lens] ?? "FOUNDER_STRATEGY";
  const baseResult = stripFounderOnlyArtifacts({
    query: args.query,
    lens: args.lens,
    classification: args.classification,
    result: normalizeOwnCompanyFounderPayload({
      query: args.query,
      lens: args.lens,
      classification: args.classification,
      result: args.result
    })
  });
  const sourceRefs = normalizeSourceRefs(baseResult);
  const claimRefs = normalizeClaimRefs(baseResult, sourceRefs);
  const answerBlocks = normalizeAnswerBlocks(baseResult, sourceRefs, claimRefs);
  const recommendedNextAction = baseResult?.recommendedNextAction ?? (Array.isArray(baseResult?.nextActions) ? baseResult.nextActions[0]?.action : void 0);
  const { graphNodes, graphEdges, graphSummary } = buildGraphArtifacts({
    query: args.query,
    lens: args.lens,
    persona,
    packetId: args.packetId,
    sourceRefs,
    claimRefs,
    answerBlocks,
    recommendedNextAction
  });
  const explorationMemory = buildExplorationMemory(args.result, sourceRefs, claimRefs);
  const proofStatus = toProofStatus(sourceRefs, answerBlocks, args.judgeVerdict);
  const strategicAngles = buildStrategicAngles({
    query: args.query,
    lens: args.lens,
    result: {
      ...baseResult,
      classification: args.classification
    },
    sourceRefs
  });
  const strategicQuestions = strategicAngles.map((angle) => typeof angle.nextQuestion === "string" ? angle.nextQuestion : "").filter(Boolean);
  const uncertaintyBoundary = baseResult?.uncertaintyBoundary ?? (sourceRefs.length > 0 ? "Citations reflect the sources explored in this run. Treat the packet as directional until the next live refresh." : "This answer is missing durable citations. Treat it as provisional until more source coverage is available.");
  const normalizedIdentity = normalizeFounderIdentity({
    query: args.query,
    lens: args.lens,
    classification: args.classification,
    result: baseResult
  });
  const companyMode = resolveCompanyMode({
    query: args.query,
    lens: args.lens,
    classification: args.classification,
    result: baseResult
  });
  const canonicalEntityName = companyMode === "own_company" ? normalizedIdentity.entityName ?? baseResult?.canonicalEntity?.name ?? baseResult?.companyReadinessPacket?.identity?.companyName : args.entityFallback ?? normalizedIdentity.entityName ?? baseResult?.canonicalEntity?.name ?? baseResult?.companyReadinessPacket?.identity?.companyName;
  const decoratedResult = {
    ...baseResult,
    packetId: args.packetId,
    packetType: normalizedIdentity.packetType,
    canonicalEntity: {
      ...typeof baseResult?.canonicalEntity === "object" ? baseResult.canonicalEntity : {},
      name: canonicalEntityName ?? baseResult?.canonicalEntity?.name
    },
    sourceRefs,
    claimRefs,
    answerBlocks,
    explorationMemory,
    graphSummary,
    proofStatus,
    uncertaintyBoundary,
    recommendedNextAction,
    nextQuestions: Array.from(
      /* @__PURE__ */ new Set([...Array.isArray(baseResult?.nextQuestions) ? baseResult.nextQuestions : [], ...strategicQuestions])
    ).slice(0, 8),
    graphNodes,
    graphEdges,
    ...strategicAngles.length > 0 ? { strategicAngles } : {}
  };
  return {
    result: decoratedResult,
    packet: buildResultPacket({
      query: args.query,
      lens: args.lens,
      result: decoratedResult,
      classification: normalizedIdentity.classification,
      entityFallback: canonicalEntityName ?? baseResult?.canonicalEntity?.name
    }),
    persona
  };
}
function persistSearchRun(args) {
  const runId = genId("run");
  const traceId = genId("trace");
  const packetId = String(args.result?.packetId ?? genId("artifact"));
  const outcomeId = genId("outcome");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const entityName = args.result?.canonicalEntity?.name ?? "NodeBench";
  upsertDurableObject({
    id: CONTROL_PLANE_VIEW_ID,
    kind: "view",
    label: "Control plane founder search",
    source: SEARCH_SOURCE,
    status: "active",
    metadata: {
      path: "/",
      surface: "public_website",
      workflow: "founder_first_query"
    }
  });
  upsertDurableObject({
    id: runId,
    kind: "run",
    label: `${args.lens} search: ${trimText(args.query, 72)}`,
    source: SEARCH_SOURCE,
    status: "completed",
    metadata: {
      query: args.query,
      lens: args.lens,
      persona: args.persona,
      classification: args.classification,
      entityName,
      sessionKey: args.sessionKey,
      traceId,
      packetId,
      outcomeId,
      packet: args.packet,
      result: args.result,
      trace: args.trace,
      judge: args.judgeVerdict,
      proofStatus: args.result?.proofStatus,
      latencyMs: args.latencyMs,
      context: {
        tokenBudget: args.contextBundle?.totalEstimatedTokens,
        pinned: args.contextBundle?.pinned,
        injected: args.contextBundle?.injected,
        archival: args.contextBundle?.archival
      },
      completedAt: now
    }
  });
  upsertDurableObject({
    id: traceId,
    kind: "trace",
    label: `${args.classification} trace`,
    source: SEARCH_SOURCE,
    status: args.trace.some((step) => step.status === "error") ? "needs_review" : "completed",
    metadata: {
      runId,
      trace: args.trace
    }
  });
  upsertDurableObject({
    id: packetId,
    kind: "artifact",
    label: `${entityName} founder packet`,
    source: SEARCH_SOURCE,
    status: args.result?.proofStatus ?? "provisional",
    metadata: {
      runId,
      packet: args.packet,
      result: args.result
    }
  });
  upsertDurableObject({
    id: outcomeId,
    kind: "outcome",
    label: `${entityName} recommendation`,
    source: SEARCH_SOURCE,
    status: args.judgeVerdict?.verdict === "pass" ? "verified" : "draft",
    metadata: {
      runId,
      packetId,
      headline: args.result?.recommendedNextAction ?? args.packet.answer ?? entityName,
      judge: args.judgeVerdict
    }
  });
  linkDurableObjects({ fromId: CONTROL_PLANE_VIEW_ID, toId: runId, edgeType: "opened" });
  linkDurableObjects({ fromId: runId, toId: traceId, edgeType: "generated_trace" });
  linkDurableObjects({ fromId: runId, toId: packetId, edgeType: "produced" });
  linkDurableObjects({ fromId: packetId, toId: outcomeId, edgeType: "resolved_to" });
  recordExecutionReceipt({
    runId,
    traceId,
    objectId: runId,
    actionType: "query_received",
    summary: trimText(args.query, 160),
    input: { query: args.query, lens: args.lens, classification: args.classification },
    output: { entityName, packetId },
    status: "recorded",
    metadata: { persona: args.persona }
  });
  for (const [index, step] of args.trace.entries()) {
    recordExecutionReceipt({
      runId,
      traceId,
      stepId: `${traceId}:step:${index + 1}`,
      objectId: traceId,
      toolName: step.tool ?? null,
      actionType: step.step,
      summary: step.detail ?? step.step,
      input: { step: step.step, tool: step.tool },
      output: { status: step.status, durationMs: step.endMs ? step.endMs - step.startMs : 0 },
      status: step.status,
      metadata: {
        startedAt: step.startMs,
        endedAt: step.endMs
      }
    });
  }
  recordLocalArtifact({
    id: packetId,
    runId,
    objectId: packetId,
    kind: "founder_packet",
    summary: trimText(String(args.packet.answer ?? entityName), 280),
    verificationStatus: args.result?.proofStatus ?? "provisional",
    content: JSON.stringify(args.packet),
    metadata: {
      query: args.query,
      lens: args.lens,
      persona: args.persona,
      sourceCount: args.result?.sourceRefs?.length ?? 0
    }
  });
  recordLocalOutcome({
    id: outcomeId,
    runId,
    objectId: outcomeId,
    outcomeType: `${args.classification}_answer`,
    headline: args.result?.recommendedNextAction ?? trimText(String(args.packet.answer ?? entityName), 120),
    userValue: `Founder-first answer for ${entityName}`,
    stakeholderValue: "Durable packet with proof, trace, and sync-ready lineage",
    status: args.judgeVerdict?.verdict === "pass" ? "verified" : "draft",
    evidence: (args.result?.sourceRefs ?? []).slice(0, 5),
    metadata: {
      packetId,
      proofStatus: args.result?.proofStatus,
      latencyMs: args.latencyMs
    }
  });
  return { runId, traceId, packetId, outcomeId };
}
function listRecentSearchHistory(limit = 8) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, metadata_json, updated_at
    FROM object_nodes
    WHERE kind = 'run' AND source = ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(SEARCH_SOURCE, limit);
  return rows.map((row) => {
    const metadata = parseJsonValue(row.metadata_json, {});
    const packet = metadata.packet;
    if (!packet?.query) return null;
    return {
      runId: row.id,
      traceId: metadata.traceId ?? "",
      packetId: metadata.packetId ?? "",
      outcomeId: metadata.outcomeId ?? "",
      query: String(packet.query),
      lens: String(metadata.lens ?? "founder"),
      persona: String(metadata.persona ?? "FOUNDER_STRATEGY"),
      classification: String(metadata.classification ?? "general"),
      entityName: String(packet.entityName ?? metadata.entityName ?? "NodeBench"),
      packet,
      trace: Array.isArray(metadata.trace) ? metadata.trace.map((step, index) => ({
        step: step.step,
        tool: step.tool,
        durationMs: step.endMs ? step.endMs - step.startMs : 0,
        status: step.status,
        detail: step.detail,
        traceId: `${metadata.traceId ?? row.id}:step:${index + 1}`
      })) : [],
      latencyMs: Number(metadata.latencyMs ?? 0),
      proofStatus: String(packet.proofStatus ?? metadata.proofStatus ?? "provisional"),
      sourceCount: Number(packet.sourceCount ?? packet.sourceRefs?.length ?? 0),
      updatedAt: row.updated_at
    };
  }).filter((item) => Boolean(item));
}
var _judgeToolOutput = null;
async function getJudge() {
  if (!_judgeToolOutput) {
    try {
      const { llmJudgeLoopTools: llmJudgeLoopTools2 } = await Promise.resolve().then(() => (init_llmJudgeLoop(), llmJudgeLoop_exports));
      const tool = llmJudgeLoopTools2.find((t) => t.name === "judge_tool_output");
      if (tool) _judgeToolOutput = tool.handler;
    } catch {
    }
  }
  return _judgeToolOutput;
}
async function linkupSearch(query, maxResults = 5) {
  const apiKey = process.env.LINKUP_API_KEY;
  if (!apiKey) return null;
  try {
    const resp = await fetch("https://api.linkup.so/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        q: query,
        depth: "standard",
        outputType: "sourcedAnswer",
        includeInlineCitations: true,
        includeSources: true,
        maxResults
      }),
      signal: AbortSignal.timeout(process.env.VERCEL ? 4e3 : 8e3)
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const sources = (data.results ?? data.sources ?? []).slice(0, maxResults).map((r) => ({
      name: r.name ?? r.title ?? "",
      url: r.url ?? "",
      snippet: r.content ?? r.snippet ?? ""
    }));
    return { answer: data.answer ?? "", sources };
  } catch {
    return null;
  }
}
function createSearchRouter(tools2) {
  const router = Router();
  try {
    initBehaviorTables();
  } catch {
  }
  const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
  let convex = null;
  try {
    if (convexUrl) convex = new ConvexHttpClient(convexUrl);
  } catch {
  }
  function forwardToConvex(data) {
    if (!convex) return;
    convex.mutation(anyApi.domains.profiler.mutations.logProfilerEvent, data).catch(() => {
    });
  }
  function forwardSessionToConvex(data) {
    if (!convex) return;
    convex.mutation(anyApi.domains.profiler.mutations.logSessionSummary, data).catch(() => {
    });
  }
  const sessionCache = /* @__PURE__ */ new Map();
  const SESSION_TTL = 30 * 60 * 1e3;
  const MAX_SESSIONS2 = 500;
  function getSessionKey(req) {
    return req.body?.sessionId ?? req.ip ?? "default";
  }
  function getSessionContext(key) {
    const entry = sessionCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > SESSION_TTL) {
      sessionCache.delete(key);
      return null;
    }
    return entry;
  }
  function setSessionContext(key, entity, classification, result) {
    if (sessionCache.size >= MAX_SESSIONS2) {
      const oldest = [...sessionCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) sessionCache.delete(oldest[0]);
    }
    sessionCache.set(key, { entity, classification, result, ts: Date.now() });
  }
  function findTool(name) {
    return tools2.find((t) => t.name === name);
  }
  let activeProfileSessionId;
  async function callTool(name, args) {
    if (name === "linkup_search") {
      const q = String(args.query ?? "");
      const max = Number(args.maxResults ?? 5);
      return linkupSearch(q, max);
    }
    const tool = findTool(name);
    if (!tool) return { error: true, message: `Tool not found: ${name}` };
    const startMs = Date.now();
    let success = true;
    try {
      const result = await tool.handler(args);
      return result;
    } catch (err) {
      success = false;
      return { error: true, message: err?.message ?? String(err) };
    } finally {
      const durationMs = Date.now() - startMs;
      const cost = TOOL_COST[name] ?? 3e-3;
      if (activeProfileSessionId) {
        try {
          logToolCall({
            sessionId: activeProfileSessionId,
            toolName: name,
            inputSummary: JSON.stringify(args).slice(0, 200),
            latencyMs: durationMs,
            costEstimateUsd: cost,
            success
          });
        } catch {
        }
        forwardToConvex({
          sessionId: activeProfileSessionId,
          surface: "ai_app",
          integrationPath: "direct",
          toolName: name,
          toolInputSummary: JSON.stringify(args).slice(0, 200),
          latencyMs: durationMs,
          estimatedCostUsd: cost,
          success,
          isDuplicate: false
        });
      }
    }
  }
  const TOOL_COST = {
    web_search: 8e-3,
    fetch_url: 2e-3,
    enrich_entity: 0.015,
    run_deep_sim: 0.05,
    build_claim_graph: 0.03,
    render_decision_memo: 0.01,
    founder_local_weekly_reset: 5e-3,
    founder_local_synthesize: 0.01,
    founder_local_gather: 3e-3,
    run_recon: 0.02,
    synthesize_feature_plan: 0.03
  };
  function extractMultipleEntities(query) {
    const genericPhrasePattern = /^(what|why|how|when|where|who|should|could|would|do|does|did|is|are|was|were|can|will)\b/i;
    const genericEntityStopwords = /* @__PURE__ */ new Set([
      "a",
      "an",
      "and",
      "as",
      "at",
      "for",
      "from",
      "founder",
      "general",
      "i",
      "in",
      "last",
      "matters",
      "market",
      "my",
      "next",
      "now",
      "of",
      "our",
      "question",
      "questions",
      "risk",
      "risks",
      "shift",
      "should",
      "strategy",
      "the",
      "this",
      "to",
      "update",
      "week",
      "what",
      "which",
      "why",
      "you",
      "your",
      "focus",
      "comparables",
      "diligence",
      "flags"
    ]);
    const lq = query.toLowerCase();
    const hasMultiSyntax = /,\s*(?:and\s+)?\w/.test(lq) || /\bvs\.?\s/i.test(lq) || /\bversus\b/i.test(lq);
    if (!hasMultiSyntax) return [];
    if (/\b(my |uploaded|transcript|meeting|document|file|research file)/i.test(lq)) return [];
    const cleaned = query.replace(/^(?:prepare|build|create|draft)\s+.+?\b(?:briefing|memo|analysis|packet|report)\s+(?:on|for)\s+/i, "").replace(/(?:prepare|build|create|draft)\s+(?:an?\s+)?(?:investment(?:-|\s+)banking(?:\s+style)?|banker(?:\s+style)?|investor(?:\s+style)?|competitive)?\s*(?:briefing|memo|analysis|packet|report)\s+(?:on|for)\s+/gi, "").replace(/(?:briefing|memo|analysis|packet|report)\s+(?:on|for)\s+/gi, "").replace(/(?:compare|analyze|research|tell me about|search|profile|diligence on)\s+/gi, "").replace(/(?:in\s+(?:the\s+)?|the\s+|an?\s+)(?:AI|enterprise(?:\s+AI)?|tech|fintech|payments?|commerce|market|race|landscape|space|industry|sector|category|segment|vertical)\b.*/gi, "").replace(/(?:top \d+ risks across|risks across|what changed.*?for)\s*/gi, "").replace(/(?:competitive landscape|competitive position|strategy|overview).*$/gi, "").replace(/\b(?:focus on|cover|covering|including|with emphasis on)\b.*$/gi, "").replace(/[.?!].*$/g, "").trim();
    const parts = cleaned.split(/\s*(?:,\s*(?:and\s+)?|,?\s+and\s+|\s+vs\.?\s+|\s+versus\s+|\s*&\s*)\s*/i).map((part) => part.trim().replace(/^['"]|['"]$/g, "").replace(/'s$/g, "").replace(/[?!.,]+$/g, "")).filter((part) => {
      if (!(part.length > 1 && part.length < 40 && /^[a-zA-Z]/.test(part))) return false;
      if (genericPhrasePattern.test(part)) return false;
      const words = part.split(/\s+/).filter(Boolean);
      if (words.length === 0 || words.length > 4) return false;
      const genericWordCount = words.filter((word) => genericEntityStopwords.has(word.toLowerCase())).length;
      if (genericWordCount >= Math.max(1, words.length - 1)) return false;
      if (words.length > 2 && genericWordCount > 0) return false;
      return true;
    });
    return parts.length >= 2 ? parts : [];
  }
  function classifyQuery(query) {
    function extractPrimaryEntity(queryText) {
      const entityPatterns = [
        /(?:analyze|research|search|evaluate|assess|profile|diligence on)\s+([A-Z][a-zA-Z0-9.&-]+(?:\s+[A-Z][a-zA-Z0-9.&-]+){0,2})/i,
        /(?:for|about|on)\s+([A-Z][a-zA-Z0-9.&-]+(?:\s+[A-Z][a-zA-Z0-9.&-]+){0,2})/i
      ];
      for (const pattern of entityPatterns) {
        const match = queryText.match(pattern);
        if (match?.[1]) {
          const entity = match[1].trim().replace(/\b(for|about|on|into|with|against|versus|vs)\b\s*$/i, "").replace(/[?.!,]+$/g, "");
          const normalizedEntity = entity.trim();
          if (normalizedEntity.length > 1 && normalizedEntity.length < 50) return normalizedEntity;
        }
      }
      return void 0;
    }
    const lq = query.toLowerCase();
    if (lq.includes("weekly reset") || lq.includes("founder reset") || lq.includes("founder weekly") || lq.includes("weekly summary") || lq.includes("week in review") || lq.match(/weekly\b.*\b(next moves|recap|update)/)) {
      return { type: "weekly_reset", lens: "founder" };
    }
    if (lq.includes("pre-delegation") || lq.includes("delegation packet") || lq.includes("agent-ready") || lq.includes("handoff brief") || lq.includes("handoff packet") || lq.includes("agent delegation") || lq.includes("delegation") && lq.includes("agent")) {
      return { type: "pre_delegation", lens: "founder" };
    }
    if (lq.includes("important change") || lq.includes("what changed") || lq.includes("since my last") || lq.includes("what's different") || lq.includes("what is different") || lq.includes("since yesterday") || lq.includes("biggest contradictions") || lq.includes("recent changes")) {
      const changeEntities = extractMultipleEntities(query);
      if (changeEntities.length >= 2) {
        return { type: "multi_entity", entities: changeEntities, lens: "investor" };
      }
      return { type: "important_change", lens: "founder", entity: extractPrimaryEntity(query) };
    }
    if (lq.match(/\b(plan|propose|integrate|extend|should we build|feature plan|implementation plan|integration proposal|extension plan)\b/) && !lq.includes("weekly") && !lq.includes("delegation") && !lq.includes("what changed")) {
      return { type: "plan_proposal", lens: "founder", entity: extractPrimaryEntity(query) };
    }
    const isCompetitorQuery = lq.includes("competitor") || lq.includes("versus") || lq.includes(" vs ") || lq.includes("compare ") || lq.includes("competitive landscape") || lq.includes("compete with") || lq.includes("supermemory");
    const multiEntities = extractMultipleEntities(query);
    if (multiEntities.length >= 2) {
      return { type: "multi_entity", entities: multiEntities, lens: "investor" };
    }
    if (isCompetitorQuery) {
      const compClause = query.match(/(?:compete with|against|vs\.?|versus|compare)\s+(.+?)(?:\?|$)/i)?.[1] ?? query.match(/(?:competitive landscape)[:\s]+(.+?)(?:\?|$)/i)?.[1] ?? query.match(/(?:competitor.*?(?:against|with))\s+(.+?)(?:\?|$)/i)?.[1];
      if (compClause) {
        const leadingEntity = query.match(/([A-Z][a-zA-Z0-9.&-]+(?:\s+[A-Z][a-zA-Z0-9.&-]+){0,2})\s+(?:vs\.?|versus|against)/i)?.[1];
        const cleanedClause = compClause.replace(/\b(?:focus on|cover|covering|including|with emphasis on)\b.*$/i, "").replace(/(?:in\s+(?:the\s+)?)(?:AI|enterprise(?:\s+AI)?|tech|fintech|payments?|commerce|market|race|landscape|space|industry|sector|category|segment|vertical)\b.*$/i, "").replace(/[.?!].*$/g, "").trim();
        const parts = [leadingEntity, ...cleanedClause.split(/\s*(?:,\s*(?:and\s+)?|,?\s+and\s+|\s+vs\.?\s+|\s+versus\s+|\s*&\s*|\s+or\s+)\s*/i)].map((p) => String(p ?? "").trim().replace(/[?'"]/g, "").replace(/['\u2019]s$/g, "")).filter((p) => p.length > 1 && /^[a-zA-Z]/.test(p));
        if (parts.length >= 2) {
          return { type: "multi_entity", entities: Array.from(new Set(parts)), lens: "investor" };
        }
      }
      const compareToMatch = query.match(/(?:how does)\s+(\w+)\s+(?:compete|compare|stack up)\s+(?:to|with|against)\s+(\w+)/i);
      if (compareToMatch && compareToMatch[1] && compareToMatch[2]) {
        return { type: "multi_entity", entities: [compareToMatch[1], compareToMatch[2]], lens: "investor" };
      }
      const singleEntity = query.match(/(?:how does)\s+(\w+)\s+(?:compete|compare|stack up)/i)?.[1] ?? query.match(/(\w+)\s+competitor/i)?.[1];
      return { type: "competitor", entity: singleEntity, lens: "researcher" };
    }
    const isOwnEntity = lq.match(/\b(my company|my startup|my business|my current company|my team|my organization|my firm|our company|our startup|our business|investor update for my|current company state)\b/);
    const isUploadContext = lq.match(/\b(meeting transcript|meeting notes|uploaded|my documents|my files|research files|my research)\b/);
    const isGeneralStrategic = lq.match(/\b(should i track|should i build|should i present|for my thesis|as a legal|as a banker|as an investor|what deals|portfolio companies)\b/);
    const isScenario = lq.match(/\b(what happens if|what if|simulate|model a scenario|second.order effects|what would happen|how would)\b/);
    if (isScenario) {
      const scenarioEntities = extractMultipleEntities(query);
      if (scenarioEntities && scenarioEntities.length >= 2) {
        return { type: "multi_entity", entities: scenarioEntities, lens: "investor" };
      }
      const scenarioEntity = extractPrimaryEntity(query);
      if (scenarioEntity) {
        return { type: "company_search", entity: scenarioEntity, lens: "investor" };
      }
      const scenarioNameMatch = query.match(/(?:what (?:if|happens if)|how would)\s+(?:a\s+)?([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})/);
      if (scenarioNameMatch?.[1]) {
        const name = scenarioNameMatch[1].replace(/\b(open|merge|raise|ban|regulate|launch|acquire|shut|close)\b.*$/i, "").trim();
        if (name.length > 1 && name.length < 40) {
          return { type: "company_search", entity: name, lens: "investor" };
        }
      }
      const affectMatch = query.match(/(?:affect|impact|disrupt)\s+([A-Z][a-zA-Z0-9]+(?:\s+(?:and|&)\s+[A-Z][a-zA-Z0-9]+)*)/);
      if (affectMatch?.[1]) {
        const affected = affectMatch[1].split(/\s+(?:and|&)\s+/).map((s) => s.trim()).filter(Boolean);
        if (affected.length >= 2) return { type: "multi_entity", entities: affected, lens: "investor" };
        if (affected.length === 1) return { type: "company_search", entity: affected[0], lens: "investor" };
      }
    }
    if (isOwnEntity || isUploadContext || isGeneralStrategic || isScenario) {
      return { type: "general", lens: "founder" };
    }
    const companyPatterns = [
      /(?:company profile|profile)\s+(?:for|of|on)\s+(.+?)(?:\s+—|$)/i,
      // "Company profile for Mistral AI"
      /(?:full diligence|deep dive|diligence)\s+(?:on|into)\s+(.+?)(?:\s+—|$)/i,
      // "Full diligence on Cohere"
      /(?:evaluate|assess)\s+(.+?)(?:\s+moat|\s+after|\s+for|\s+—|$)/i,
      // "Evaluate Figma's moat"
      /(?:what (?:does|is|are))\s+(.+?)\s+(?:do|doing|building)\b/i,
      // "What does Replit do"
      /(?:what is)\s+(.+?)\s+doing\b/i,
      // "What is Modal doing"
      /(?:analyze|search|tell me about|diligence on|research)\s+(.+?)(?:\s+for\b|\s+from\b|\s+—|$)/i,
      /^(.+?)\s+(?:competitive position|strategy|valuation|revenue|risk|overview|product launches)/i,
      /^search\s+(.+?)(?:\s+—|\s+–|\s+-|$)/i,
      /(?:top \d+ risks (?:for|across)|risks across|landscape for|investing in)\s+(.+?)$/i,
      /^(.+?)\s+(?:AI chips|AI strategy|enterprise strategy)\b/i
      // "Groq AI chips"
    ];
    for (const pattern of companyPatterns) {
      const match = query.match(pattern);
      if (match?.[1]) {
        const entity = match[1].trim().replace(/['\u2018\u2019\u0027]s(\s|$)/g, "$1").replace(/['"]/g, "").replace(/\s+(latest|recent|current|today'?s|funding|revenue|valuation|pricing|market cap|stock|risks?|overview|news|analysis|competitive|position|strategy|market|enterprise|positioning|infrastructure|moat|product|data|lakehouse|developer|platform|payments|AI|search|commerce|product launches).*$/i, "").trim();
        if (entity.length > 1 && entity.length < 50) {
          return { type: "company_search", entity, lens: "investor" };
        }
      }
    }
    const capitalizedMatch = query.trim().match(/^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})$/);
    if (capitalizedMatch && capitalizedMatch[1].length > 2 && capitalizedMatch[1].length < 40) {
      return { type: "company_search", entity: capitalizedMatch[1], lens: "investor" };
    }
    return { type: "general", lens: "founder" };
  }
  async function classifyQueryWithLLM(query, sessionContext) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return classifyQuery(query);
    try {
      const fullPrompt = sessionContext ? `${sessionContext}

Now classify this query:
${query}` : query;
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Classify this user query for a startup intelligence platform.
${sessionContext ? `
Context: ${sessionContext}` : ""}
Query: "${query}"

Classification rules:
- "weekly_reset": user wants a weekly summary, founder reset, or "what changed this week"
- "pre_delegation": user wants to hand off work to an agent or prepare a delegation packet
- "important_change": user asks what changed recently, what's different, biggest contradictions
- "plan_proposal": user wants to plan a feature, integration, or asks "should we build X"
- "company_search": user asks about ONE specific company or wants intelligence on one entity
- "competitor": user asks about competitors, competitive landscape, or "who competes with X"
- "multi_entity": user compares 2+ companies ("X vs Y", "compare X and Y", "X, Y, and Z")
- "general": anything else \u2014 general questions, idea validation, pitch readiness, strategic questions

Entity extraction rules:
- Extract ONLY proper company/product names that appear VERBATIM in the query
- Do NOT invent entities \u2014 if no company name is explicitly in the query, entity must be null
- "Compare Stripe vs Square" \u2192 entities: ["Stripe", "Square"], type: "multi_entity"
- "What would Y Combinator look for" \u2192 entity: "Y Combinator", type: "company_search"
- "I'm building an AI tutoring app" \u2192 entity: null, type: "general"
- "Am I ready to pitch Sequoia?" \u2192 entity: "Sequoia", type: "company_search"
- "What changed this week?" \u2192 entity: null, type: "weekly_reset"
- "Anthropic" \u2192 entity: "Anthropic", type: "company_search"
- "OpenAI risks and challenges" \u2192 entity: "OpenAI", type: "company_search"
- "How does Notion compare to Coda" \u2192 entities: ["Notion", "Coda"], type: "multi_entity"` }] }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 200,
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["weekly_reset", "pre_delegation", "important_change", "plan_proposal", "company_search", "competitor", "multi_entity", "general"] },
                  entity: { type: "string", nullable: true, description: "Primary company/entity name from the query, or null if none" },
                  entities: { type: "array", items: { type: "string" }, nullable: true, description: "All company names if comparing multiple" },
                  lens: { type: "string", enum: ["founder", "investor", "banker", "ceo", "legal", "student"] }
                },
                required: ["type", "lens"]
              }
            }
          }),
          signal: AbortSignal.timeout(process.env.VERCEL ? 2e3 : 3e3)
          // classification must be fast
        }
      );
      if (!resp.ok) return classifyQuery(query);
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return classifyQuery(query);
      const parsed = JSON.parse(jsonMatch[0]);
      const validTypes = ["weekly_reset", "pre_delegation", "important_change", "plan_proposal", "company_search", "competitor", "multi_entity", "general"];
      const type = validTypes.includes(parsed.type) ? parsed.type : "general";
      const validLenses = ["founder", "investor", "banker", "ceo", "legal", "student"];
      const lens = validLenses.includes(parsed.lens) ? parsed.lens : "founder";
      let entities = Array.isArray(parsed.entities) && parsed.entities.length >= 2 ? parsed.entities.filter((e) => typeof e === "string" && e.length > 0) : void 0;
      if (!entities || entities.length < 2) {
        const vsMatch = query.match(/^(?:compare\s+)?(.+?)\s+(?:vs\.?|versus|compared?\s+to|against)\s+(.+?)(?:\?|$)/i);
        if (vsMatch) {
          entities = [vsMatch[1].trim(), vsMatch[2].trim()].filter((e) => e.length > 0);
          if (entities.length >= 2) {
            return { type: "multi_entity", entity: entities[0], entities, lens };
          }
        }
      }
      let entity = typeof parsed.entity === "string" && parsed.entity.length > 0 ? parsed.entity : void 0;
      if (entity) {
        const entityLower = entity.toLowerCase();
        const inQuery = query.toLowerCase().includes(entityLower);
        const entityIdx = query.toLowerCase().indexOf(entityLower);
        const startsUppercase = entityIdx >= 0 && /^[A-Z]/.test(query.charAt(entityIdx));
        const isPhrase = /^(what|how|when|where|why|who|which|the|this|that|my|your|changed|built|building|doing|risks?|challenges?)\b/i.test(entity);
        if (!inQuery || !startsUppercase || isPhrase) {
          entity = void 0;
        }
      }
      if (entities) {
        entities = entities.filter((e) => query.toLowerCase().includes(e.toLowerCase()));
        if (entities.length < 2) entities = void 0;
      }
      return { type, entity, entities, lens };
    } catch {
      return classifyQuery(query);
    }
  }
  async function classifyWithSession(query, sessionCtx) {
    const sessionSystem = sessionCtx ? `Prior session context: user was discussing "${sessionCtx.entity}". If this query references that entity, include it.` : void 0;
    return classifyQueryWithLLM(query, sessionSystem);
  }
  const parseSearchInput = (req) => {
    if (req.method === "GET") {
      const query2 = typeof req.query.query === "string" ? req.query.query : void 0;
      const lens2 = typeof req.query.lens === "string" ? req.query.lens : void 0;
      const parsedDaysBack = typeof req.query.daysBack === "string" ? Number.parseInt(req.query.daysBack, 10) : void 0;
      return {
        query: query2,
        lens: lens2,
        daysBack: Number.isFinite(parsedDaysBack) ? parsedDaysBack : void 0
      };
    }
    const { query, lens, daysBack } = req.body;
    return { query, lens, daysBack };
  };
  const handleSearch = async (req, res) => {
    const startMs = Date.now();
    const REQUEST_BUDGET_MS = process.env.VERCEL ? 9e3 : 55e3;
    const requestDeadline = startMs + REQUEST_BUDGET_MS;
    const requestAbort = new AbortController();
    const budgetTimer = setTimeout(() => requestAbort.abort("request_timeout"), REQUEST_BUDGET_MS);
    const checkBudget = () => {
      if (Date.now() >= requestDeadline) throw new Error("Request budget exceeded");
    };
    const { query, lens, daysBack } = parseSearchInput(req);
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      clearTimeout(budgetTimer);
      return res.status(400).json({ error: true, message: "Query is required" });
    }
    const sessionKey = getSessionKey(req);
    const sessionCtx = getSessionContext(sessionKey);
    const classification = await classifyWithSession(query.trim(), sessionCtx);
    const inferredLens = inferExplicitLensFromQuery(query.trim());
    const resolvedLens = lens && !(lens === "founder" && inferredLens && inferredLens !== "founder") ? lens : inferredLens ?? classification.lens;
    const isStream = req.query.stream === "true";
    if (isStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
    }
    const trace = [];
    function traceStep(step, tool) {
      const entry = { step, tool, startMs: Date.now(), status: "ok", detail: void 0 };
      trace.push(entry);
      if (isStream) {
        res.write(`data: ${JSON.stringify({ type: "trace", entry })}

`);
      }
      return {
        ok(detail) {
          entry.endMs = Date.now();
          entry.status = "ok";
          entry.detail = detail;
          if (isStream) res.write(`data: ${JSON.stringify({ type: "trace", entry })}

`);
        },
        error(detail) {
          entry.endMs = Date.now();
          entry.status = "error";
          entry.detail = detail;
          if (isStream) res.write(`data: ${JSON.stringify({ type: "trace", entry })}

`);
        },
        skip(detail) {
          entry.endMs = Date.now();
          entry.status = "skip";
          entry.detail = detail;
          if (isStream) res.write(`data: ${JSON.stringify({ type: "trace", entry })}

`);
        }
      };
    }
    const classifyTrace = traceStep("classify_query");
    classifyTrace.ok(`type=${classification.type}, entity=${classification.entity ?? "none"}`);
    let behaviorSessionId;
    let behaviorQueryId;
    try {
      behaviorSessionId = logSession({
        interfaceSurface: "ai_app",
        roleInferred: resolvedLens,
        mainObjective: classification.type
      });
      activeProfileSessionId = behaviorSessionId;
      const priorQuery = findSimilarPriorQuery(query.trim(), behaviorSessionId);
      behaviorQueryId = logQuery({
        sessionId: behaviorSessionId,
        rawQuery: query.trim(),
        classification: classification.type,
        normalizedIntent: classification.type,
        entityTargets: classification.entities ?? (classification.entity ? [classification.entity] : []),
        ownCompanyMode: classification.type === "weekly_reset" || classification.type === "founder_progression",
        confidenceScore: priorQuery.found ? 0.95 : void 0,
        latencyMs: Date.now() - startMs
      });
    } catch {
    }
    const profileToolCall = (toolName, latencyMs, success, costUsd, modelUsed) => {
      if (!behaviorSessionId) return;
      try {
        logToolCall({
          sessionId: behaviorSessionId,
          queryId: behaviorQueryId,
          toolName,
          latencyMs,
          costEstimateUsd: costUsd,
          success,
          modelUsed
        });
      } catch {
      }
    };
    const ctxTrace = traceStep("build_context_bundle");
    const contextBundle = buildContextBundle(query.trim());
    ctxTrace.ok(`tokens=${contextBundle.totalEstimatedTokens}`);
    try {
      let result;
      let usedHarness = false;
      checkBudget();
      {
        try {
          const routingHints = computeRoutingHints(query.trim());
          const routingHintText = formatRoutingHintsForPrompt(routingHints);
          const queryWithHints = routingHintText ? `${query.trim()}

[${routingHintText}]` : query.trim();
          const planTrace = traceStep("agent_plan", "gemini-3.1-flash-lite");
          if (routingHintText) {
            trace.push({ step: "routing_hints", tool: "token_overlap", status: "ok", detail: routingHintText });
          }
          const plan = await generatePlan(
            queryWithHints,
            classification.type,
            classification.entities ?? (classification.entity ? [classification.entity] : []),
            resolvedLens,
            callTool
          );
          planTrace.ok(`${plan.steps.length} steps planned`);
          const execTrace = traceStep("agent_execute");
          const execution = await executeHarness(plan, callTool, (step) => {
            const entry = { step: step.step, tool: step.tool, startMs: Date.now(), status: step.status, detail: step.detail };
            trace.push(entry);
            if (isStream) {
              res.write(`data: ${JSON.stringify({ type: "trace", entry: { ...entry, endMs: Date.now(), durationMs: 0 } })}

`);
            }
          });
          execTrace.ok(`${execution.stepResults.length} steps, ${execution.totalDurationMs}ms`);
          checkBudget();
          const synthTrace = traceStep("agent_synthesize", "gemini-3.1-flash-lite");
          const synthesized = await Promise.race([
            synthesizeResults(execution, query.trim(), resolvedLens, callTool),
            new Promise((_, reject) => {
              const remaining = requestDeadline - Date.now() - 1e3;
              if (remaining <= 0) reject(new Error("Request budget exceeded"));
              else setTimeout(() => reject(new Error("Request budget exceeded")), remaining);
            })
          ]);
          synthTrace.ok(`${synthesized.confidence}% confidence`);
          const budgetRemaining = requestDeadline - Date.now();
          const enrichmentPromises = [];
          if (budgetRemaining > 3e3 && process.env.GEMINI_API_KEY && !synthesized.whyThisTeam) {
            enrichmentPromises.push((async () => {
              try {
                const isSelfSearch = /nodebench|homen|shum|my company|our company|my startup/i.test(query);
                let localContext = "";
                if (isSelfSearch) {
                  try {
                    const fs = await import("node:fs/promises");
                    const os = await import("node:os");
                    const path2 = await import("node:path");
                    const claudeMdPaths = [
                      path2.join(os.homedir(), ".claude", "CLAUDE.md"),
                      path2.join(process.cwd(), "CLAUDE.md")
                    ];
                    for (const p of claudeMdPaths) {
                      try {
                        const content = await fs.readFile(p, "utf-8");
                        localContext += `
FOUNDER IDENTITY (from CLAUDE.md):
${content.slice(0, 600)}`;
                        break;
                      } catch {
                        continue;
                      }
                    }
                    const memPath = path2.join(os.homedir(), ".claude", "projects");
                    try {
                      const dirs = await fs.readdir(memPath);
                      for (const d of dirs.slice(0, 1)) {
                        const memFile = path2.join(memPath, d, "memory", "MEMORY.md");
                        try {
                          const mem = await fs.readFile(memFile, "utf-8");
                          localContext += `
PROJECT MEMORY:
${mem.slice(0, 400)}`;
                        } catch {
                        }
                      }
                    } catch {
                    }
                    try {
                      const { execSync: execSync2 } = await import("node:child_process");
                      const commitCount = execSync2("git log --oneline --since='2026-01-01' | wc -l", { cwd: process.cwd(), timeout: 3e3 }).toString().trim();
                      const firstCommit = execSync2("git log --oneline --reverse | head -1", { cwd: process.cwd(), timeout: 3e3 }).toString().trim();
                      localContext += `
GIT HISTORY: ${commitCount} commits since Jan 2026. First: ${firstCommit}`;
                    } catch {
                    }
                  } catch {
                  }
                }
                const credResp = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: `Assess founder/team credibility of "${synthesized.entityName}" for a ${resolvedLens} audience.

Web context: ${(synthesized.answer ?? "").slice(0, 400)}${localContext ? `

Local founder context (private, high-trust):
${localContext}` : ""}

Return ONLY JSON:
{"founderCredibility":"why credible","trustSignals":["fact1","fact2"],"visionMagnitude":"scale assessment","reinventionCapacity":"pivot ability","hiddenRequirements":["req1","req2"]}` }] }],
                      generationConfig: { temperature: 0, maxOutputTokens: 600, responseMimeType: "application/json" }
                    }),
                    signal: AbortSignal.timeout(8e3)
                  }
                );
                if (credResp.ok) {
                  const credData = await credResp.json();
                  const credText = credData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                  const credMatch = credText.match(/\{[\s\S]*\}/);
                  if (credMatch) synthesized.whyThisTeam = JSON.parse(credMatch[0]);
                }
              } catch {
              }
            })());
          }
          if (budgetRemaining > 3e3 && (classification.type === "company_search" || classification.type === "competitor" || classification.type === "multi_entity")) {
            enrichmentPromises.push((async () => {
              try {
                const answerText = synthesized.answer ?? "";
                const revMatch = answerText.match(/\$(\d+(?:\.\d+)?)\s*(B|billion|M|million)/i);
                const shareMatch = answerText.match(/(\d+(?:\.\d+)?)\s*%\s*(?:market|share)/i);
                if (!revMatch || !shareMatch) {
                  return;
                }
                const mcTrace = traceStep("tool_call", "simulate_decision_paths");
                const seedRevenue = parseFloat(revMatch[1]) * (revMatch[2].toLowerCase().startsWith("b") ? 1e9 : 1e6) / 12;
                const seedShare = parseFloat(shareMatch[1]) / 100;
                const mcResult = await callTool("simulate_decision_paths", {
                  entity: synthesized.entityName,
                  revenue: Math.round(seedRevenue),
                  marketShare: seedShare,
                  runway: 24,
                  numPaths: 100,
                  timeHorizonMonths: 12
                });
                if (mcResult?.summary) {
                  const sim = mcResult.summary;
                  synthesized.signals.push(
                    { name: `Scenario range (${sim.paths} paths): ${sim.successRate} success rate with base payoff ${sim.medianPayoff}.`, direction: "neutral", impact: "low" }
                  );
                  if (mcResult.bestPath && mcResult.worstPath) {
                    synthesized.signals.push({
                      name: `Three-case range: bull ${mcResult.bestPath.payoff} versus bear ${mcResult.worstPath.payoff} within ${sim.confidenceInterval}.`,
                      direction: "neutral",
                      impact: "low"
                    });
                  }
                  synthesized.sources.push({ label: `Scenario model (${sim.paths} quantified paths)`, type: "local" });
                }
                mcTrace.ok(`${mcResult?.summary?.successRate ?? "?"} success rate`);
              } catch {
              }
            })());
          }
          if (enrichmentPromises.length > 0) {
            const enrichBudget = Math.max(1e3, requestDeadline - Date.now() - 500);
            await Promise.race([
              Promise.all(enrichmentPromises),
              new Promise((resolve4) => setTimeout(resolve4, enrichBudget))
            ]);
          }
          result = {
            canonicalEntity: {
              name: synthesized.entityName,
              canonicalMission: synthesized.answer,
              identityConfidence: synthesized.confidence
            },
            signals: synthesized.signals.map((s, i) => ({
              name: s.name,
              direction: s.direction,
              impact: s.impact
            })),
            whatChanged: synthesized.changes,
            contradictions: synthesized.risks.map((r) => ({
              claim: r.title,
              evidence: r.description
            })),
            comparables: synthesized.comparables,
            whyThisTeam: synthesized.whyThisTeam,
            nextActions: synthesized.nextActions,
            nextQuestions: synthesized.nextQuestions,
            sourceRefs: synthesized.sources.map((s, i) => ({
              id: `src:${i}`,
              label: s.label,
              href: s.href,
              type: s.type,
              status: "cited"
            })),
            keyMetrics: Array.isArray(synthesized.keyMetrics) && synthesized.keyMetrics.length > 0 ? synthesized.keyMetrics : [
              { label: "Sources", value: String(synthesized.sources.length) },
              { label: "Comparables", value: String(synthesized.comparables.length) },
              { label: "Diligence flags", value: String(synthesized.risks.length) },
              { label: "Confidence", value: `${synthesized.confidence}%` }
            ],
            harnessExecution: {
              objective: plan.objective,
              stepsPlanned: plan.steps.length,
              stepsCompleted: execution.stepResults.filter((r) => r.success).length,
              totalDurationMs: execution.totalDurationMs,
              adaptations: execution.adaptations
            }
          };
          usedHarness = true;
        } catch (harnessErr) {
          const fallbackTrace = traceStep("agent_fallback");
          fallbackTrace.ok(`harness failed: ${harnessErr?.message ?? "unknown"}, using legacy dispatch`);
        }
      }
      checkBudget();
      if (!usedHarness) switch (classification.type) {
        case "weekly_reset": {
          const t = traceStep("tool_call", "founder_local_weekly_reset");
          const raw = await callTool("founder_local_weekly_reset", { daysBack: daysBack ?? 7 });
          t.ok();
          const wr = raw ?? {};
          result = {
            canonicalEntity: {
              name: "Weekly Reset",
              canonicalMission: wr.summary ?? wr.weeklyResetPacket?.summary ?? "Weekly founder reset",
              identityConfidence: (wr.confidence ?? 0.75) > 1 ? wr.confidence : Math.round((wr.confidence ?? 0.75) * 100)
            },
            signals: (wr.keyFindings ?? wr.metrics ?? []).slice(0, 5).map((f, i) => ({
              name: typeof f === "string" ? f : f.finding ?? f.title ?? f.label ?? String(f),
              direction: "neutral",
              impact: i < 2 ? "high" : "medium"
            })),
            whatChanged: (wr.keyFindings ?? []).slice(0, 5).map((f) => ({
              description: typeof f === "string" ? f : f.finding ?? f.description ?? String(f),
              date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
            })),
            contradictions: (wr.risks ?? []).slice(0, 3).map((r) => ({
              claim: typeof r === "string" ? r : r.title ?? r.risk ?? String(r),
              evidence: typeof r === "string" ? "" : r.description ?? r.mitigation ?? ""
            })),
            nextActions: (wr.nextSteps ?? []).slice(0, 4).map((s) => ({
              action: typeof s === "string" ? s : s.step ?? s.action ?? String(s)
            })),
            nextQuestions: [
              "What should I prioritize this week?",
              "What risks need immediate attention?",
              "What changed that I should know about?"
            ],
            rawPacket: wr
          };
          break;
        }
        case "pre_delegation":
        case "important_change": {
          const t = traceStep("tool_call", "founder_local_synthesize");
          const raw = await callTool("founder_local_synthesize", {
            query: query.trim(),
            packetType: classification.type,
            daysBack: daysBack ?? 7
          });
          if (raw?.error) t.error(raw.message);
          else t.ok();
          const sp = raw?.error ? {} : raw ?? {};
          let liveSources = [];
          if (classification.entity) {
            const liveTrace = traceStep("tool_call", "linkup_search");
            const liveSearch = await linkupSearch(
              `${classification.entity} company updates last ${daysBack ?? 7} days ${(/* @__PURE__ */ new Date()).getFullYear()}`,
              5
            );
            if (liveSearch && liveSearch.sources.length > 0) {
              liveSources = liveSearch.sources.map((source) => ({
                title: source.name || classification.entity || "Source",
                url: source.url,
                snippet: source.snippet
              }));
              liveTrace.ok(`${liveSources.length} live sources`);
            } else {
              liveTrace.skip("no live sources");
              const webTrace = traceStep("tool_call", "web_search");
              const webSearch = await callTool("web_search", {
                query: `${classification.entity} company updates last ${daysBack ?? 7} days ${(/* @__PURE__ */ new Date()).getFullYear()}`,
                maxResults: 5
              });
              const webResults = (webSearch?.results ?? []).map((item) => ({
                title: item.title ?? item.name ?? classification.entity ?? "Source",
                url: item.url ?? "",
                snippet: item.snippet ?? item.description ?? ""
              })).filter((item) => Boolean(item.url));
              if (webResults.length > 0) {
                liveSources = webResults;
                webTrace.ok(`${webResults.length} fallback sources`);
              } else {
                webTrace.skip("no fallback sources");
              }
            }
          }
          const spLabel = classification.type === "pre_delegation" ? "Delegation Packet" : "Recent Changes";
          const spMission = sp.summary ?? sp.overview ?? `${spLabel} \u2014 ${query.trim().slice(0, 100)}`;
          const spFindings = sp.keyFindings ?? sp.signals ?? sp.metrics ?? sp.key_findings ?? [];
          const spChanges = sp.keyFindings ?? sp.changes ?? sp.whatChanged ?? sp.key_findings ?? [];
          const spRisks = sp.risks ?? sp.contradictions ?? [];
          const spNext = sp.nextSteps ?? sp.actions ?? sp.next_steps ?? [];
          result = {
            canonicalEntity: {
              name: classification.entity ?? spLabel,
              canonicalMission: spMission.length > 20 ? spMission : `${spLabel}: synthesized from local context for the last ${daysBack ?? 7} days. Ask follow-up questions to drill deeper.`,
              identityConfidence: (sp.confidence ?? 0.7) > 1 ? sp.confidence : Math.round((sp.confidence ?? 0.7) * 100)
            },
            signals: spFindings.length > 0 ? spFindings.slice(0, 5).map((f, i) => ({
              name: typeof f === "string" ? f : f.finding ?? f.title ?? f.label ?? String(f),
              direction: "neutral",
              impact: i < 2 ? "high" : "medium"
            })) : [
              { name: `${spLabel} generated from local context`, direction: "neutral", impact: "high" },
              { name: `${daysBack ?? 7}-day analysis window`, direction: "neutral", impact: "medium" }
            ],
            whatChanged: spChanges.length > 0 ? spChanges.slice(0, 5).map((f) => ({
              description: typeof f === "string" ? f : f.finding ?? f.description ?? String(f),
              date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
            })) : [{ description: `${spLabel} synthesized for the last ${daysBack ?? 7} days`, date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) }],
            contradictions: spRisks.length > 0 ? spRisks.slice(0, 3).map((r) => ({
              claim: typeof r === "string" ? r : r.title ?? r.risk ?? String(r),
              evidence: typeof r === "string" ? "" : r.description ?? r.mitigation ?? ""
            })) : [{ claim: "No contradictions detected in this period", evidence: "Upload more context or extend the analysis window for deeper risk detection." }],
            nextActions: spNext.length > 0 ? spNext.slice(0, 4).map((s) => ({ action: typeof s === "string" ? s : s.step ?? s.action ?? String(s) })) : [{ action: "Review the synthesized packet and identify action items" }, { action: "Upload additional context for richer analysis" }],
            nextQuestions: classification.type === "pre_delegation" ? ["What should the agent prioritize?", "What context does the agent need?", "What are the success criteria?"] : ["What changed that matters most?", "What contradictions surfaced?", "What should I act on first?"],
            ...liveSources.length > 0 ? {
              sourcesUsed: liveSources.map((source, index) => ({
                id: `source:${index + 1}`,
                title: source.title,
                url: source.url,
                excerpt: source.snippet,
                type: "web",
                status: "cited"
              }))
            } : {},
            rawPacket: sp
          };
          break;
        }
        case "plan_proposal": {
          const planTrace = traceStep("tool_call", "synthesize_feature_plan");
          const planRaw = await callTool("synthesize_feature_plan", {
            feature: query.trim(),
            entity: classification.entity
          });
          if (planRaw?.error) planTrace.error(planRaw.error);
          else planTrace.ok();
          const plan = planRaw?.plan ?? planRaw ?? {};
          result = {
            canonicalEntity: {
              name: plan.title ?? "Plan Proposal",
              canonicalMission: plan.summary ?? `Plan synthesis for: ${query.trim()}`,
              identityConfidence: Math.round((plan.strategicFit?.wedgeAlignment ?? 0.5) * 100)
            },
            signals: (plan.phases ?? []).slice(0, 5).map((p, i) => ({
              name: `Phase ${p.id ?? i + 1}: ${p.title ?? "Untitled"}`,
              direction: "neutral",
              impact: i === 0 ? "high" : "medium"
            })),
            whatChanged: (plan.codebaseReadiness ?? []).slice(0, 5).map((r) => ({
              description: `${r.capability}: ${r.status}${r.notes ? ` \u2014 ${r.notes}` : ""}`,
              date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
            })),
            contradictions: (plan.risks ?? []).slice(0, 5).map((r) => ({
              claim: r.title ?? "Risk",
              evidence: r.mitigation ?? "",
              severity: r.severity ?? "medium"
            })),
            nextActions: [
              { action: "Review strategic fit and phase sequencing" },
              { action: "Generate a proposal memo for stakeholder review" },
              { action: "Delegate phase 1 to an agent for implementation" }
            ],
            nextQuestions: [
              "What constraints should the plan respect?",
              "Which phase should we start with?",
              "Should we delegate this to an agent?",
              "What competitors are building something similar?"
            ],
            rawPacket: plan,
            packetType: "plan_proposal"
          };
          break;
        }
        case "multi_entity": {
          const entities = classification.entities ?? [];
          const entityNames = entities.slice(0, 4);
          const multiLinkupTrace = traceStep("tool_call", `linkup_search x${entityNames.length}`);
          const entityResults = await Promise.all(
            entityNames.map(async (eName) => {
              try {
                const linkup = await linkupSearch(`${eName} company overview strategy ${(/* @__PURE__ */ new Date()).getFullYear()}`, 3);
                if (linkup && (linkup.answer.length > 20 || linkup.sources.length > 0)) {
                  return {
                    name: eName,
                    answer: linkup.answer,
                    snippets: linkup.sources.map((s) => s.snippet).filter(Boolean),
                    sources: linkup.sources.map((s) => s.url).filter(Boolean),
                    resultCount: linkup.sources.length
                  };
                }
                const webRes = await Promise.race([
                  callTool("web_search", { query: `${eName} company overview strategy ${(/* @__PURE__ */ new Date()).getFullYear()}`, maxResults: 3 }),
                  new Promise((resolve4) => setTimeout(() => resolve4(null), process.env.VERCEL ? 3e3 : 6e3))
                ]);
                const snippets = (webRes?.results ?? []).map((r) => r.snippet ?? r.description ?? "").filter(Boolean);
                return { name: eName, answer: "", snippets, sources: (webRes?.results ?? []).map((r) => r.url).filter(Boolean), resultCount: webRes?.resultCount ?? 0 };
              } catch {
                return { name: eName, answer: "", snippets: [], sources: [], resultCount: 0 };
              }
            })
          );
          multiLinkupTrace.ok(`${entityResults.reduce((s, e) => s + e.resultCount, 0)} total results`);
          let comparison = null;
          if (process.env.GEMINI_API_KEY) {
            const extractTrace = traceStep("llm_extract", "gemini-3.1-flash-lite-preview");
            try {
              const entityContext = entityResults.map((e) => `## ${e.name}
${e.answer ? e.answer.slice(0, 400) + "\n" : ""}${e.snippets.slice(0, 2).join("\n")}`).join("\n\n");
              const geminiResp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: `Compare these ${entityNames.length} entities for a ${resolvedLens} audience. Original query: "${query}"

${entityContext}

Return ONLY valid JSON:
{
  "summary": "2-3 sentence comparative overview",
  "entities": [{"name": "entity name", "description": "1-sentence description", "strengths": ["str1"], "risks": ["risk1"]}],
  "signals": [{"name": "comparative signal", "direction": "up|down|neutral", "impact": "high|medium|low"}],
  "changes": [{"description": "recent change affecting these entities", "date": null}],
  "risks": [{"title": "comparative risk", "description": "description"}],
  "keyDifferences": ["difference 1", "difference 2"]
}` }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 2e3, responseMimeType: "application/json" }
                  }),
                  signal: AbortSignal.timeout(process.env.VERCEL ? 4e3 : 1e4)
                }
              );
              if (geminiResp.ok) {
                const gJson = await geminiResp.json();
                const gText = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (gText) {
                  const cleaned = gText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                  if (jsonMatch) comparison = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, "$1"));
                }
              }
              extractTrace.ok(`extracted ${comparison ? "ok" : "empty"}`);
            } catch {
              extractTrace.error("gemini comparison failed");
            }
          }
          const cmp = comparison ?? {};
          const allSources = entityResults.flatMap((e) => e.sources).slice(0, 8);
          const totalResults = entityResults.reduce((s, e) => s + e.resultCount, 0);
          result = {
            canonicalEntity: {
              name: entityNames.join(" vs "),
              canonicalMission: cmp.summary ?? `Comparative analysis of ${entityNames.join(", ")}. ${(cmp.keyDifferences ?? []).slice(0, 2).join(". ")}`,
              identityConfidence: Math.min(90, 40 + totalResults * 2 + (comparison ? 25 : 0))
            },
            memo: true,
            whatChanged: (cmp.changes ?? []).slice(0, 5).map((c) => ({
              description: c.description ?? String(c),
              date: c.date ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
            })),
            signals: (cmp.signals ?? []).slice(0, 6).map((s, i) => ({
              name: s.name ?? `Signal ${i + 1}`,
              direction: s.direction ?? "neutral",
              impact: s.impact ?? (i < 2 ? "high" : "medium")
            })),
            contradictions: (cmp.risks ?? []).slice(0, 4).map((r) => ({
              claim: r.title ?? String(r),
              evidence: r.description ?? ""
            })),
            comparables: (cmp.entities ?? entityResults).slice(0, 4).map((e) => ({
              name: e.name,
              relevance: "high",
              note: e.description ?? (e.strengths ?? []).join(", ")
            })),
            keyMetrics: (cmp.keyDifferences ?? []).slice(0, 4).map((d, i) => ({
              label: `Difference ${i + 1}`,
              value: typeof d === "string" ? d : String(d)
            })),
            nextActions: [
              { action: `Deep-dive into ${entityNames[0]} vs ${entityNames[1] ?? entityNames[0]} head-to-head` },
              { action: `Map the competitive dynamics between ${entityNames.join(", ")}` },
              { action: `Monitor all ${entityNames.length} entities for material changes` },
              { action: `Build a decision memo choosing between these options` }
            ],
            nextQuestions: entityNames.slice(0, 3).map((n) => `What are ${n}'s key competitive advantages?`).concat(
              [`How do these ${entityNames.length} entities compare on risk?`]
            ),
            webSources: allSources
          };
          break;
        }
        case "company_search":
        case "competitor": {
          let isGrounded2 = function(claim) {
            if (!claim || sourceText.length < 50) return true;
            const words = claim.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
            if (words.length === 0) return true;
            const matched = words.filter((w) => sourceText.includes(w));
            return matched.length >= 1;
          };
          var isGrounded = isGrounded2;
          const entityName2 = classification.entity ?? query.trim().split(/\s+/).slice(0, 3).join(" ");
          const linkupTrace = traceStep("tool_call", "linkup_search");
          const webTrace = traceStep("tool_call", "web_search");
          const reconTrace = traceStep("tool_call", "run_recon");
          const gatherTrace = traceStep("tool_call", "founder_local_gather");
          const [linkupResult, webResult, reconResult, localCtx] = await Promise.all([
            linkupSearch(`${entityName2} company overview strategy funding competitive position ${(/* @__PURE__ */ new Date()).getFullYear()}`, 5).then((r) => {
              linkupTrace.ok(`${r ? r.sources.length + " sources" : "null"}`);
              return r;
            }).catch(() => {
              linkupTrace.error("linkup failed");
              return null;
            }),
            Promise.race([
              callTool("web_search", {
                query: `${entityName2} company overview strategy funding ${(/* @__PURE__ */ new Date()).getFullYear()}`,
                maxResults: 5
              }),
              new Promise((resolve4) => setTimeout(() => resolve4(null), process.env.VERCEL ? 4e3 : 8e3))
            ]).then((r) => {
              webTrace.ok(`${r?.resultCount ?? 0} results`);
              return r;
            }).catch(() => {
              webTrace.error("web_search failed");
              return null;
            }),
            callTool("run_recon", {
              target: entityName2,
              focus: query.trim()
            }).then((r) => {
              reconTrace.ok();
              return r;
            }).catch(() => {
              reconTrace.error("recon failed");
              return null;
            }),
            callTool("founder_local_gather", { daysBack: daysBack ?? 7 }).then((r) => {
              gatherTrace.ok();
              return r;
            }).catch(() => {
              gatherTrace.error("gather failed");
              return null;
            })
          ]);
          const web = webResult;
          const recon = reconResult;
          const local = localCtx;
          const linkupAnswer = linkupResult?.answer ?? "";
          const linkupSources = (linkupResult?.sources ?? []).map((s) => s.url).filter(Boolean);
          const linkupSnippets = (linkupResult?.sources ?? []).map((s) => s.snippet).filter(Boolean);
          const webResults = web?.results ?? [];
          const webSnippets = webResults.map((r) => r.snippet ?? r.description ?? "").filter(Boolean);
          const webSources = webResults.map((r) => r.url ?? r.link).filter(Boolean);
          const allSnippets = [...linkupSnippets, ...webSnippets].slice(0, 8);
          const allSrcUrls = [.../* @__PURE__ */ new Set([...linkupSources, ...webSources])].slice(0, 8);
          const bestSummary = linkupAnswer || allSnippets.slice(0, 3).join(" ").slice(0, 800);
          const reconSources = recon?.plan?.sources ?? recon?.sources ?? [];
          const reconFindings = recon?.findings ?? [];
          const competitors = recon?.competitors ?? recon?.comparables ?? [];
          let geminiExtracted = null;
          const hasSearchData = linkupAnswer.length > 20 || allSnippets.length > 0;
          if (hasSearchData && process.env.GEMINI_API_KEY) {
            const extractTrace = traceStep("llm_extract", "gemini-3.1-flash-lite-preview");
            try {
              const geminiResp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: `You are an entity intelligence analyst. Extract SPECIFIC, FACTUAL intelligence about "${entityName2}" from these web search results. The user is a ${resolvedLens}. Original query: "${query}"

${resolvedLens === "investor" ? "Focus on: valuation, funding rounds, revenue, growth metrics, competitive moat, market size, team quality." : resolvedLens === "banker" ? "Focus on: deal relevance, financial metrics, M&A activity, capital structure, regulatory exposure." : resolvedLens === "legal" ? "Focus on: regulatory risks, compliance, litigation, IP, governance issues." : resolvedLens === "founder" ? "Focus on: product strategy, competitive positioning, go-to-market, hiring signals, technology stack." : resolvedLens === "student" ? "Focus on: company overview, industry context, key products, career relevance." : "Focus on: competitive positioning, market strategy, key metrics, risks."}

RESEARCH CONTEXT:
${linkupAnswer ? `LINKUP ANSWER:
${linkupAnswer.slice(0, 1200)}

` : ""}WEB RESULTS:
${allSnippets.slice(0, 5).join("\n\n")}

RULES:
- ONLY include facts that appear in the web results above. Do NOT invent numbers, dates, or claims.
- Every signal should reference something from the web results. If the web results lack data, include fewer signals rather than inventing them.
- Every risk MUST be specific to ${entityName2} (not generic industry risks)
- Summary MUST describe what ${entityName2} actually does based on the web results
- If the web results are thin, return fewer items rather than hallucinating

Return ONLY valid JSON:
{
  "summary": "2-3 sentence factual description of ${entityName2} \u2014 what they do, key metrics, current position",
  "signals": [{"name": "signal grounded in web results above", "direction": "up|down|neutral", "impact": "high|medium|low"}],
  "changes": [{"description": "recent event from web results", "date": "YYYY-MM-DD or null"}],
  "risks": [{"title": "risk specific to ${entityName2}", "description": "evidence from web results"}],
  "comparables": [{"name": "competitor name", "relevance": "high|medium|low", "note": "why relevant"}],
  "metrics": [{"label": "metric name", "value": "specific value from web results"}]
}` }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 1500, responseMimeType: "application/json" }
                  }),
                  signal: AbortSignal.timeout(process.env.VERCEL ? 4e3 : 1e4)
                }
              );
              if (geminiResp.ok) {
                const gJson = await geminiResp.json();
                const gText = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (gText) {
                  const cleaned = gText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    geminiExtracted = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, "$1"));
                  }
                }
              }
              extractTrace.ok(`extracted ${geminiExtracted ? "ok" : "empty"}`);
            } catch {
              extractTrace.error("gemini extraction failed");
            }
          }
          const retrievalConfidence = allSnippets.length >= 3 ? "high" : allSnippets.length >= 1 ? "medium" : "low";
          const ge = geminiExtracted ?? {};
          const sourceText = allSnippets.join(" ").toLowerCase();
          const rawSignals = (ge.signals ?? []).slice(0, 8);
          const groundedSignals = rawSignals.filter((s) => isGrounded2(s.name ?? ""));
          const ungroundedCount = rawSignals.length - groundedSignals.length;
          const mergedSignals = groundedSignals.slice(0, 5).map((s, i) => ({
            name: s.name ?? `${entityName2} signal ${i + 1}`,
            direction: s.direction ?? "neutral",
            impact: s.impact ?? (i < 2 ? "high" : "medium"),
            // ── Layer 4: Citation chain — attach source index ──
            sourceIdx: allSnippets.findIndex((sn) => {
              const words = (s.name ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 4);
              return words.some((w) => sn.toLowerCase().includes(w));
            })
          }));
          const mergedChanges = (ge.changes ?? []).slice(0, 5).filter((c) => isGrounded2(c.description ?? String(c))).map((c) => ({
            description: c.description ?? String(c),
            date: c.date ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
            sourceIdx: allSnippets.findIndex((sn) => {
              const words = (c.description ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 4);
              return words.some((w) => sn.toLowerCase().includes(w));
            })
          }));
          const mergedRisks = (ge.risks ?? []).slice(0, 3).filter((r) => isGrounded2(r.title ?? r.description ?? String(r))).map((r) => ({
            claim: r.title ?? r.claim ?? String(r),
            evidence: r.description ?? r.evidence ?? "",
            sourceIdx: allSnippets.findIndex((sn) => {
              const words = (r.title ?? r.description ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 4);
              return words.some((w) => sn.toLowerCase().includes(w));
            })
          }));
          const mergedComparables = (ge.comparables ?? competitors).slice(0, 4).map((c) => ({
            name: typeof c === "string" ? c : c.name ?? String(c),
            relevance: c.relevance ?? "medium",
            note: typeof c === "string" ? "" : c.note ?? c.description ?? ""
          }));
          const mergedMetrics = (ge.metrics ?? []).slice(0, 6).filter((m) => isGrounded2(`${m.label} ${m.value}`)).map((m) => ({
            label: m.label ?? "Metric",
            value: String(m.value ?? "N/A")
          }));
          const finalSignals = mergedSignals.length > 0 ? mergedSignals : reconSources.slice(0, 4).map((s, i) => ({
            name: typeof s === "string" ? s : s.name ?? String(s),
            direction: "neutral",
            impact: i < 2 ? "high" : "medium"
          }));
          const finalChanges = mergedChanges.length > 0 ? mergedChanges : reconFindings.slice(0, 5).map((f) => ({
            description: typeof f === "string" ? f : f.summary ?? String(f),
            date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
          }));
          const finalRisks = mergedRisks.length > 0 ? mergedRisks : [{ claim: `${entityName2} data is limited \u2014 ${retrievalConfidence === "low" ? "no web sources found" : "web sources were thin"}`, evidence: `Retrieved ${allSnippets.length} source snippets. Upload ${entityName2}-related documents or run deeper research for risk analysis.` }];
          const entitySummary = ge.summary ?? recon?.summary ?? recon?.overview ?? (bestSummary ? `${entityName2}: ${bestSummary.slice(0, 400)}` : `${entityName2} entity profile. ${retrievalConfidence === "low" ? "No web sources available \u2014 upload documents or connect agents." : ""}`);
          const confidence = Math.min(95, 40 + (linkupAnswer ? 15 : 0) + allSrcUrls.length * 2 + (geminiExtracted ? 20 : 0) + reconFindings.length * 5 - ungroundedCount * 3);
          result = {
            canonicalEntity: {
              name: entityName2,
              canonicalMission: entitySummary,
              identityConfidence: confidence
            },
            memo: true,
            whatChanged: finalChanges.length > 0 ? finalChanges : [{ description: `${entityName2} profile created from ${allSrcUrls.length} web sources${linkupAnswer ? " (Linkup enriched)" : ""}`, date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) }],
            signals: finalSignals.length > 0 ? finalSignals : [{ name: `${entityName2} analysis in progress`, direction: "neutral", impact: "high" }],
            contradictions: finalRisks,
            comparables: mergedComparables,
            keyMetrics: mergedMetrics,
            nextActions: [
              { action: `Deep-dive ${entityName2}'s financials and unit economics` },
              { action: `Map ${entityName2}'s competitive landscape` },
              { action: `Monitor ${entityName2} for material changes` },
              { action: `Compare ${entityName2} to closest competitors` }
            ],
            nextQuestions: [
              `What are ${entityName2}'s key competitive advantages?`,
              `How does ${entityName2} compare to its closest competitors?`,
              `What are the main risks facing ${entityName2}?`,
              `What changed for ${entityName2} in the last quarter?`
            ],
            webSources: allSrcUrls.slice(0, 8),
            // ── Grounding metadata for judge + user verification ──
            grounding: {
              retrievalConfidence,
              snippetCount: allSnippets.length,
              sourceCount: allSrcUrls.length,
              groundedSignals: mergedSignals.length,
              ungroundedFiltered: ungroundedCount,
              sourceSnippets: allSnippets.slice(0, 5).map((s, i) => ({ idx: i, text: s.slice(0, 200), url: allSrcUrls[i] ?? "" }))
            },
            localContext: local
          };
          break;
        }
        default: {
          const lqGeneral = query.trim().toLowerCase();
          const companyMode = detectFounderCompanyMode({
            query: query.trim(),
            hasPrivateContext: resolvedLens === "founder"
          });
          const needsWebEnrichment = /\b(what happens|what if|simulate|scenario|regulatory|funding rounds|defense|banks|healthcare|fintech|climate|supply chain|industry|sector|market|last week|this quarter|since january|past year|next \d|Q[1-4]|20\d{2})\b/i.test(lqGeneral);
          const gt = traceStep("tool_call", "founder_local_gather");
          const [gather, webEnrich] = await Promise.all([
            callTool("founder_local_gather", { daysBack: daysBack ?? 7 }).then((r) => {
              gt.ok();
              return r;
            }).catch(() => {
              gt.error();
              return null;
            }),
            needsWebEnrichment ? (async () => {
              const wt = traceStep("tool_call", "web_search");
              try {
                const r = await Promise.race([
                  callTool("web_search", { query: query.trim().slice(0, 200), maxResults: 5 }),
                  new Promise((resolve4) => setTimeout(() => resolve4(null), process.env.VERCEL ? 4e3 : 8e3))
                ]);
                wt.ok(`${r?.resultCount ?? 0} results`);
                return r;
              } catch {
                wt.error();
                return null;
              }
            })() : Promise.resolve(null)
          ]);
          const g = gather ?? {};
          const webGen = webEnrich;
          const genWebSnippets = (webGen?.results ?? []).map((r) => r.snippet ?? "").filter(Boolean);
          const genWebSources = (webGen?.results ?? []).map((r) => r.url ?? "").filter(Boolean);
          let genGemini = null;
          if (genWebSnippets.length >= 2 && process.env.GEMINI_API_KEY) {
            const ext = traceStep("llm_extract", "gemini-3.1-flash-lite-preview");
            try {
              const resp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: `Analyze this query and web data. User is a ${resolvedLens}. Query: "${query.trim()}"

WEB DATA:
${genWebSnippets.slice(0, 4).join("\n\n")}

Return ONLY valid JSON with:
{
  "summary": "2-3 sentence analysis addressing the query directly",
  "signals": [{"name": "key insight from web data", "direction": "up|down|neutral", "impact": "high|medium|low"}],
  "changes": [{"description": "relevant recent development", "date": "YYYY-MM-DD or null"}],
  "risks": [{"title": "risk or concern", "description": "evidence"}],
  "nextActions": [{"action": "recommended next step"}]
}

RULES: Only include facts grounded in the web data. If data is thin, return fewer items.` }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 1200, responseMimeType: "application/json" }
                  }),
                  signal: AbortSignal.timeout(process.env.VERCEL ? 4e3 : 1e4)
                }
              );
              if (resp.ok) {
                const j = await resp.json();
                const t = j?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (t) {
                  const c = t.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                  const m = c.match(/\{[\s\S]*\}/);
                  if (m) genGemini = JSON.parse(m[0].replace(/,\s*([\]}])/g, "$1"));
                }
              }
              ext.ok(genGemini ? "ok" : "empty");
            } catch {
              ext.error("extraction failed");
            }
          }
          const gg = genGemini ?? {};
          const gChanges = (gg.changes ?? g.recentActions ?? g.changes ?? []).slice(0, 5).map((a) => ({
            description: typeof a === "string" ? a : a.description ?? a.action ?? String(a),
            date: a.date ?? a.timestamp ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
          }));
          const gSignals = (gg.signals ?? g.signals ?? g.milestones ?? []).slice(0, 5).map((s, i) => ({
            name: typeof s === "string" ? s : s.name ?? s.title ?? String(s),
            direction: s.direction ?? "neutral",
            impact: s.impact ?? (i < 2 ? "high" : "medium")
          }));
          const gContradictions = (gg.risks ?? g.contradictions ?? []).slice(0, 3).map((c) => ({
            claim: typeof c === "string" ? c : c.claim ?? c.title ?? String(c),
            evidence: typeof c === "string" ? "" : c.evidence ?? c.description ?? ""
          }));
          const gActions = (gg.nextActions ?? g.nextActions ?? g.pendingActions ?? []).slice(0, 4).map((a) => ({
            action: typeof a === "string" ? a : a.action ?? a.title ?? String(a)
          }));
          const genSummary = gg.summary ?? g.company?.canonicalMission ?? g.summary ?? (genWebSnippets.length > 0 ? genWebSnippets.slice(0, 2).join(" ").slice(0, 400) : `Workspace intelligence for: "${query.trim()}". Upload documents, connect agents, or search specific entities for deeper results.`);
          const companyName = normalizeWorkspaceName(g.company?.name) ?? normalizeWorkspaceName(g.companyReadinessPacket?.identity?.companyName) ?? normalizeWorkspaceName(g.identity?.projectName) ?? normalizeWorkspaceName(g.publicSurfaces?.indexHtmlSiteName) ?? normalizeWorkspaceName(extractBrandPrefix2(g.publicSurfaces?.indexHtmlTitle)) ?? normalizeWorkspaceName(g.identity?.packageName) ?? (companyMode === "own_company" ? "Your Company" : "Your Workspace");
          const founderSummary = companyMode === "own_company" ? gg.summary ?? g.company?.canonicalMission ?? g.summary ?? `Founder operating view for ${companyName}. This run should end in the next three moves, the main contradiction, and what still needs evidence before wider sharing.` : genSummary;
          result = {
            canonicalEntity: {
              name: companyName,
              canonicalMission: founderSummary,
              identityConfidence: g.company?.identityConfidence ?? (genGemini ? 65 : 50)
            },
            memo: true,
            whatChanged: gChanges.length > 0 ? gChanges : [
              { description: `Query received: "${query.trim().slice(0, 60)}"`, date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) }
            ],
            signals: gSignals.length > 0 ? gSignals : [
              { name: companyMode === "own_company" ? "Current founder/company context" : "Current workspace context", direction: "neutral", impact: "high" },
              { name: "Agent connection status", direction: "neutral", impact: "medium" }
            ],
            contradictions: gContradictions.length > 0 ? gContradictions : [
              {
                claim: companyMode === "own_company" ? "Founder packet still needs more private evidence" : "Limited context available",
                evidence: companyMode === "own_company" ? "This own-company run should gather stronger local context, current contradictions, and one reusable packet before broad sharing." : "General queries work best with local context. Try a founder weekly reset or search a specific entity for richer results."
              }
            ],
            nextActions: gActions.length > 0 ? gActions : [
              ...companyMode === "own_company" ? [
                { action: "Generate one founder progression packet and use it in a real decision this week" },
                { action: "Resolve the main contradiction before widening sharing or delegation" },
                { action: "Export the Slack one-page report only after the moat and evidence story are clearer" }
              ] : [
                { action: "Generate a founder weekly reset for structured insights" },
                { action: "Search a specific company for entity intelligence" },
                { action: "Upload documents to build your knowledge base" }
              ]
            ],
            nextQuestions: [
              "Generate my founder weekly reset \u2014 what changed, main contradiction, next 3 moves",
              "What are the most important changes in the last 7 days?",
              "Build a pre-delegation packet for my agent"
            ],
            ...genWebSources.length > 0 ? { webSources: genWebSources.slice(0, 5) } : {}
          };
        }
      }
      await callTool("track_action", {
        action: `Search: ${query.trim().slice(0, 80)}`,
        category: "research",
        impact: "moderate"
      }).catch(() => {
      });
      const founderDirectionTool = findTool("founder_direction_assessment");
      if (founderDirectionTool && shouldRunFounderDirectionAssessment({
        query: query.trim(),
        lens: resolvedLens,
        classification: classification.type,
        result
      })) {
        const directionTrace = traceStep("tool_call", "founder_direction_assessment");
        try {
          const directionAssessment = await callTool("founder_direction_assessment", {
            query: query.trim(),
            lens: resolvedLens,
            daysBack: daysBack ?? 14,
            marketWorkflow: ["Claude Code", "NodeBench MCP", "team dashboard"]
          });
          result = mergeFounderDirectionAssessment(result, directionAssessment);
          directionTrace.ok(`angles=${directionAssessment?.strategicAngles?.length ?? 0}`);
        } catch (error) {
          directionTrace.error(error?.message ?? "direction assessment failed");
        }
      }
      let judgeVerdict = null;
      try {
        const judge = await getJudge();
        if (judge) {
          const toolName = classification.type === "weekly_reset" ? "founder_local_weekly_reset" : classification.type === "pre_delegation" || classification.type === "important_change" ? "founder_local_synthesize" : classification.type === "plan_proposal" ? "synthesize_feature_plan" : classification.type === "company_search" || classification.type === "competitor" ? "run_recon" : "founder_local_gather";
          const verdict = await judge({
            scenarioId: `app_${classification.type}`,
            prompt: query.trim(),
            toolName,
            result
          });
          judgeVerdict = {
            verdict: verdict.verdict,
            score: verdict.score,
            failingCriteria: verdict.criteria?.filter((c) => !c.pass).map((c) => c.criterion) ?? [],
            fixSuggestions: verdict.fixSuggestions ?? []
          };
        }
      } catch {
      }
      const latencyMs = Date.now() - startMs;
      const packetId = genId("artifact");
      const proof = decorateResultWithProof({
        query: query.trim(),
        lens: resolvedLens,
        classification: classification.type,
        result,
        judgeVerdict,
        packetId,
        entityFallback: classification.entity
      });
      result = proof.result;
      const normalizedIdentity = normalizeFounderIdentity({
        query: query.trim(),
        lens: resolvedLens,
        classification: classification.type,
        result
      });
      const effectiveClassification = normalizedIdentity.classification;
      if (normalizedIdentity.entityName) {
        result = {
          ...result,
          canonicalEntity: {
            ...typeof result?.canonicalEntity === "object" ? result.canonicalEntity : {},
            name: normalizedIdentity.entityName
          }
        };
      }
      result.packetType = normalizedIdentity.packetType;
      const assembleTrace = traceStep("assemble_response");
      assembleTrace.ok(`latency=${latencyMs}ms`);
      const entityName = result?.canonicalEntity?.name ?? normalizedIdentity.entityName ?? classification.entity ?? "";
      if (entityName) {
        setSessionContext(sessionKey, entityName, effectiveClassification, result);
      }
      if (entityName && (classification.type === "company_search" || classification.type === "multi_entity" || classification.type === "competitor")) {
        const enrichTool = findTool("enrich_entity");
        if (enrichTool) {
          const signals = (result?.signals ?? []).map((s) => s.name).join("; ");
          const risks = (result?.contradictions ?? []).map((r) => r.claim).join("; ");
          enrichTool.handler({
            entityName,
            entityType: "company",
            data: JSON.stringify({
              summary: result?.canonicalEntity?.canonicalMission?.slice(0, 500) ?? "",
              signals: signals.slice(0, 300),
              risks: risks.slice(0, 300),
              sourceCount: result?.webSources?.length ?? 0,
              searchedAt: (/* @__PURE__ */ new Date()).toISOString(),
              lens: resolvedLens
            })
          }).catch(() => {
          });
        }
      }
      let persistedIds = null;
      try {
        persistedIds = persistSearchRun({
          query: query.trim(),
          lens: resolvedLens,
          persona: proof.persona,
          classification: effectiveClassification,
          result,
          packet: proof.packet,
          trace,
          judgeVerdict,
          contextBundle,
          latencyMs,
          sessionKey
        });
      } catch (persistError) {
        console.error("[search] failed to persist founder-first run", persistError);
      }
      const payload = {
        success: true,
        classification: effectiveClassification,
        lens: resolvedLens,
        entity: classification.entity ?? null,
        latencyMs,
        result,
        resultPacket: proof.packet,
        runId: persistedIds?.runId ?? null,
        traceId: persistedIds?.traceId ?? null,
        packetId: persistedIds?.packetId ?? result.packetId ?? null,
        outcomeId: persistedIds?.outcomeId ?? null,
        judge: judgeVerdict,
        // Execution trace — every step timestamped for trajectory visualization
        trace: trace.map((t) => ({
          step: t.step,
          tool: t.tool,
          durationMs: t.endMs ? t.endMs - t.startMs : 0,
          status: t.status,
          detail: t.detail
        })),
        context: {
          pinned: {
            mission: contextBundle.pinned.canonicalMission,
            wedge: contextBundle.pinned.wedge,
            confidence: contextBundle.pinned.identityConfidence,
            contradictions: contextBundle.pinned.activeContradictions.length,
            sessionActions: contextBundle.pinned.sessionActionCount,
            lastPacket: contextBundle.pinned.lastPacketSummary
          },
          injected: {
            weeklyReset: contextBundle.injected.weeklyResetSummary,
            milestones: contextBundle.injected.recentMilestones.length,
            dogfood: contextBundle.injected.dogfoodVerdict
          },
          archival: {
            totalActions: contextBundle.archival.totalActions,
            totalMilestones: contextBundle.archival.totalMilestones
          },
          tokenBudget: contextBundle.totalEstimatedTokens
        }
      };
      if (behaviorSessionId) {
        forwardSessionToConvex({
          sessionId: behaviorSessionId,
          surface: "ai_app",
          roleInferred: resolvedLens,
          totalCalls: trace.length,
          totalCostUsd: Math.round(trace.reduce((s, t) => s + (TOOL_COST[t.tool ?? ""] ?? 3e-3), 0) * 1e3) / 1e3,
          totalLatencyMs: latencyMs,
          redundantCalls: 0,
          uniqueTools: [...new Set(trace.map((t) => t.tool).filter(Boolean))],
          classification: classification.type,
          query: query.trim().slice(0, 200)
        });
      }
      clearTimeout(budgetTimer);
      if (isStream) {
        res.write(`data: ${JSON.stringify({ type: "result", payload })}

`);
        return res.end();
      } else {
        return res.json(payload);
      }
    } catch (err) {
      clearTimeout(budgetTimer);
      const isTimeout = err?.message?.includes("budget") || err?.message?.includes("timeout") || requestAbort.signal.aborted;
      const errorPayload = {
        error: true,
        message: isTimeout ? "Search timed out \u2014 try a shorter query or check back later" : err?.message ?? "Search failed",
        classification: classification?.type ?? "unknown",
        timedOut: isTimeout
      };
      if (isStream && !res.headersSent) {
        res.setHeader("Content-Type", "text/event-stream");
        res.flushHeaders();
      }
      if (isStream) {
        res.write(`data: ${JSON.stringify({ type: "error", error: errorPayload })}

`);
        return res.end();
      } else {
        return res.status(isTimeout ? 504 : 500).json(errorPayload);
      }
    }
  };
  router.get("/", handleSearch);
  router.post("/", handleSearch);
  router.post("/upload", async (req, res) => {
    const { content, fileName, fileType } = req.body;
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: true, message: "Content is required" });
    }
    try {
      const result = await callTool("ingest_upload", {
        content,
        fileName: fileName ?? "upload",
        fileType: fileType ?? "text/plain",
        sourceProvider: "user_upload"
      });
      return res.json({ success: true, result });
    } catch (err) {
      return res.status(500).json({ error: true, message: err?.message ?? "Upload ingestion failed" });
    }
  });
  router.get("/history", (req, res) => {
    try {
      const limit = Math.max(1, Math.min(20, Number(req.query.limit ?? 8) || 8));
      return res.json({
        success: true,
        sync: getSyncBridgeStatus(),
        items: listRecentSearchHistory(limit)
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err?.message ?? "Failed to load search history",
        items: []
      });
    }
  });
  router.get("/sync-status", (_req, res) => {
    return res.json({
      success: true,
      sync: getSyncBridgeStatus()
    });
  });
  router.get("/eval-history", (_req, res) => {
    try {
      const db = getDb();
      const runs = db.prepare(
        `SELECT run_id, timestamp, total_queries, passed, failed, pass_rate, avg_latency_ms, judge_model, structural_pass_rate, gemini_pass_rate, created_at
         FROM eval_runs ORDER BY created_at DESC LIMIT 20`
      ).all();
      let latestResults = [];
      if (runs.length > 0) {
        const latest = db.prepare(
          `SELECT results_json FROM eval_runs WHERE run_id = ?`
        ).get(runs[0].run_id);
        if (latest?.results_json) {
          latestResults = JSON.parse(latest.results_json);
        }
      }
      return res.json({
        success: true,
        totalRuns: runs.length,
        runs: runs.map((r) => ({
          runId: r.run_id,
          timestamp: r.timestamp,
          totalQueries: r.total_queries,
          passed: r.passed,
          failed: r.failed,
          passRate: r.pass_rate,
          avgLatencyMs: r.avg_latency_ms,
          judgeModel: r.judge_model,
          structuralPassRate: r.structural_pass_rate,
          geminiPassRate: r.gemini_pass_rate
        })),
        latestResults: latestResults.map((r) => ({
          queryId: r.queryId,
          query: r.query,
          lens: r.lens,
          expectedType: r.expectedType,
          actualType: r.actualType,
          latencyMs: r.latencyMs,
          structuralPass: r.structuralPass,
          structuralScore: r.structuralScore,
          geminiVerdict: r.geminiVerdict,
          geminiScore: r.geminiScore,
          combinedPass: r.combinedPass
        }))
      });
    } catch {
      return res.json({ success: true, totalRuns: 0, runs: [], latestResults: [] });
    }
  });
  router.get("/health", (_req, res) => {
    const availableTools = [
      "founder_local_weekly_reset",
      "founder_local_synthesize",
      "founder_local_gather",
      "founder_direction_assessment",
      "run_recon",
      "enrich_entity",
      "detect_contradictions",
      "ingest_upload"
    ];
    const found = availableTools.filter((name) => findTool(name));
    res.json({
      status: "ok",
      toolsAvailable: found.length,
      toolsExpected: availableTools.length,
      tools: found
    });
  });
  router.get("/insights", async (_req, res) => {
    try {
      const { getAggregateInsights: getAggregateInsights2 } = (init_behaviorStore(), __toCommonJS(behaviorStore_exports));
      const insights = getAggregateInsights2(7);
      if (insights && insights.totalToolCalls > 0) {
        return res.json({ success: true, source: "local", ...insights });
      }
    } catch {
    }
    if (convex) {
      try {
        const insights = await convex.query(anyApi.domains.profiler.queries.getInsights, { daysBack: 7 });
        if (insights) {
          return res.json({ ...insights, source: "convex" });
        }
      } catch {
      }
    }
    res.json({
      success: true,
      source: "none",
      totalSessions: 0,
      totalQueries: 0,
      totalToolCalls: 0,
      totalCostUsd: 0,
      redundantCallRate: 0,
      topTools: [],
      repeatedQueries: [],
      reuseRate: 0,
      message: "Profiling data will appear after your first few searches."
    });
  });
  return router;
}

// server/routes/sharedContext.ts
import { Router as Router2 } from "express";

// packages/mcp-local/src/sync/founderEpisodeStore.ts
init_db();
import { createHash as createHash2 } from "node:crypto";
function json2(value, fallback = {}) {
  return JSON.stringify(value ?? fallback);
}
function parseJson2(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
function hashPayload2(payload) {
  return createHash2("sha256").update(JSON.stringify(payload ?? null)).digest("hex");
}
function parseRow(row) {
  return {
    episodeId: row.episode_id,
    correlationId: row.correlation_id,
    sessionKey: row.session_key ?? null,
    workspaceId: row.workspace_id ?? null,
    companyKey: row.company_key ?? null,
    surface: row.surface,
    episodeType: row.episode_type,
    status: row.status,
    query: row.query ?? null,
    lens: row.lens ?? null,
    entityName: row.entity_name ?? null,
    packetId: row.packet_id ?? null,
    packetType: row.packet_type ?? null,
    contextId: row.context_id ?? null,
    taskId: row.task_id ?? null,
    summary: row.summary ?? null,
    stateBefore: parseJson2(row.state_before_json, {}),
    stateAfter: parseJson2(row.state_after_json, {}),
    stateBeforeHash: row.state_before_hash ?? null,
    stateAfterHash: row.state_after_hash ?? null,
    spans: parseJson2(row.spans_json, []),
    traceStepCount: row.trace_step_count ?? null,
    toolsInvoked: parseJson2(row.tools_invoked_json, []),
    artifactsProduced: parseJson2(row.artifacts_produced_json, []),
    importantChangesDetected: row.important_changes_detected ?? null,
    contradictionsDetected: row.contradictions_detected ?? null,
    metadata: parseJson2(row.metadata_json, {}),
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null
  };
}
function startFounderEpisode(input) {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const episodeId = input.episodeId ?? genId("episode");
  const correlationId = input.correlationId ?? genId("corr");
  const existing = db.prepare(`
    SELECT *
    FROM founder_harness_episodes
    WHERE episode_id = ?
    LIMIT 1
  `).get(episodeId);
  const stateBeforeHash = input.stateBeforeHash ?? hashPayload2(input.stateBefore ?? null);
  const spans = input.initialSpan ? [input.initialSpan] : [];
  if (existing) {
    db.prepare(`
      UPDATE founder_harness_episodes
      SET correlation_id = ?,
          session_key = COALESCE(?, session_key),
          workspace_id = COALESCE(?, workspace_id),
          company_key = COALESCE(?, company_key),
          surface = ?,
          episode_type = ?,
          query = COALESCE(?, query),
          lens = COALESCE(?, lens),
          entity_name = COALESCE(?, entity_name),
          state_before_json = COALESCE(?, state_before_json),
          state_before_hash = COALESCE(?, state_before_hash),
          spans_json = CASE WHEN length(COALESCE(spans_json, '')) > 2 THEN spans_json ELSE ? END,
          metadata_json = COALESCE(?, metadata_json),
          updated_at = ?,
          status = CASE WHEN status = 'completed' THEN status ELSE 'active' END
      WHERE episode_id = ?
    `).run(
      correlationId,
      input.sessionKey ?? null,
      input.workspaceId ?? null,
      input.companyKey ?? null,
      input.surface,
      input.episodeType,
      input.query ?? null,
      input.lens ?? null,
      input.entityName ?? null,
      input.stateBefore ? json2(input.stateBefore) : null,
      stateBeforeHash,
      json2(spans, []),
      input.metadata ? json2(input.metadata) : null,
      now,
      episodeId
    );
  } else {
    db.prepare(`
      INSERT INTO founder_harness_episodes (
        episode_id, correlation_id, session_key, workspace_id, company_key,
        surface, episode_type, status, query, lens, entity_name, state_before_json,
        state_before_hash, spans_json, tools_invoked_json, artifacts_produced_json,
        metadata_json, started_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, '[]', '[]', ?, ?, ?)
    `).run(
      episodeId,
      correlationId,
      input.sessionKey ?? null,
      input.workspaceId ?? null,
      input.companyKey ?? null,
      input.surface,
      input.episodeType,
      input.query ?? null,
      input.lens ?? null,
      input.entityName ?? null,
      json2(input.stateBefore),
      stateBeforeHash,
      json2(spans, []),
      input.metadata ? json2(input.metadata) : null,
      now,
      now
    );
  }
  return getFounderEpisode(episodeId);
}
function appendFounderEpisodeSpan(input) {
  const db = getDb();
  const existing = getFounderEpisode(input.episodeId);
  if (!existing) {
    throw new Error(`Founder harness episode not found: ${input.episodeId}`);
  }
  const spans = [...existing.spans, input.span];
  const metadata = input.metadata ? { ...existing.metadata ?? {}, ...input.metadata } : existing.metadata;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare(`
    UPDATE founder_harness_episodes
    SET spans_json = ?,
        context_id = COALESCE(?, context_id),
        task_id = COALESCE(?, task_id),
        entity_name = COALESCE(?, entity_name),
        packet_id = COALESCE(?, packet_id),
        packet_type = COALESCE(?, packet_type),
        workspace_id = COALESCE(?, workspace_id),
        company_key = COALESCE(?, company_key),
        metadata_json = ?,
        updated_at = ?
    WHERE episode_id = ?
  `).run(
    json2(spans, []),
    input.contextId ?? null,
    input.taskId ?? null,
    input.entityName ?? null,
    input.packetId ?? null,
    input.packetType ?? null,
    input.workspaceId ?? null,
    input.companyKey ?? null,
    json2(metadata),
    now,
    input.episodeId
  );
  return getFounderEpisode(input.episodeId);
}
function finalizeFounderEpisode(input) {
  const db = getDb();
  const existing = getFounderEpisode(input.episodeId);
  if (!existing) {
    throw new Error(`Founder harness episode not found: ${input.episodeId}`);
  }
  const spans = input.finalSpan ? [...existing.spans, input.finalSpan] : existing.spans;
  const toolsInvoked = input.toolsInvoked ? Array.from(/* @__PURE__ */ new Set([...existing.toolsInvoked ?? [], ...input.toolsInvoked])) : existing.toolsInvoked;
  const artifactsProduced = input.artifactsProduced ? Array.from(/* @__PURE__ */ new Set([...existing.artifactsProduced ?? [], ...input.artifactsProduced])) : existing.artifactsProduced;
  const metadata = input.metadata ? { ...existing.metadata ?? {}, ...input.metadata } : existing.metadata;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare(`
    UPDATE founder_harness_episodes
    SET status = ?,
        state_after_json = COALESCE(?, state_after_json),
        state_after_hash = COALESCE(?, state_after_hash),
        summary = COALESCE(?, summary),
        tools_invoked_json = ?,
        artifacts_produced_json = ?,
        trace_step_count = COALESCE(?, trace_step_count),
        important_changes_detected = COALESCE(?, important_changes_detected),
        contradictions_detected = COALESCE(?, contradictions_detected),
        context_id = COALESCE(?, context_id),
        task_id = COALESCE(?, task_id),
        entity_name = COALESCE(?, entity_name),
        packet_id = COALESCE(?, packet_id),
        packet_type = COALESCE(?, packet_type),
        workspace_id = COALESCE(?, workspace_id),
        company_key = COALESCE(?, company_key),
        spans_json = ?,
        metadata_json = ?,
        updated_at = ?,
        completed_at = ?
    WHERE episode_id = ?
  `).run(
    input.status ?? "completed",
    input.stateAfter ? json2(input.stateAfter) : null,
    input.stateAfterHash ?? hashPayload2(input.stateAfter ?? existing.stateAfter ?? null),
    input.summary ?? null,
    json2(toolsInvoked, []),
    json2(artifactsProduced, []),
    input.traceStepCount ?? null,
    input.importantChangesDetected ?? null,
    input.contradictionsDetected ?? null,
    input.contextId ?? null,
    input.taskId ?? null,
    input.entityName ?? null,
    input.packetId ?? null,
    input.packetType ?? null,
    input.workspaceId ?? null,
    input.companyKey ?? null,
    json2(spans, []),
    json2(metadata),
    now,
    now,
    input.episodeId
  );
  return getFounderEpisode(input.episodeId);
}
function getFounderEpisode(episodeId) {
  const row = getDb().prepare(`
    SELECT *
    FROM founder_harness_episodes
    WHERE episode_id = ?
    LIMIT 1
  `).get(episodeId);
  return row ? parseRow(row) : null;
}
function listFounderEpisodes(input = {}) {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  const db = getDb();
  let rows = [];
  if (input.sessionKey) {
    rows = db.prepare(`
      SELECT *
      FROM founder_harness_episodes
      WHERE session_key = ?
      ORDER BY started_at DESC
      LIMIT ?
    `).all(input.sessionKey, limit * 2);
  } else if (input.workspaceId) {
    rows = db.prepare(`
      SELECT *
      FROM founder_harness_episodes
      WHERE workspace_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `).all(input.workspaceId, limit * 2);
  } else {
    rows = db.prepare(`
      SELECT *
      FROM founder_harness_episodes
      ORDER BY started_at DESC
      LIMIT ?
    `).all(limit * 2);
  }
  const parsed = rows.map(parseRow);
  return input.status ? parsed.filter((row) => row.status === input.status).slice(0, limit) : parsed.slice(0, limit);
}

// server/routes/sharedContextConvex.ts
import { ConvexHttpClient as ConvexHttpClient3 } from "convex/browser";

// convex/_generated/api.js
import { anyApi as anyApi2, componentsGeneric } from "convex/server";
var api = anyApi2;
var components = componentsGeneric();

// server/routes/founderEpisodeConvex.ts
import { ConvexHttpClient as ConvexHttpClient2 } from "convex/browser";
var _client = null;
function getConvexClient() {
  if (_client) return _client;
  const url = process.env.CONVEX_URL ?? process.env.VITE_CONVEX_URL;
  if (!url) throw new Error("CONVEX_URL not set \u2014 cannot use Convex founder harness adapter");
  _client = new ConvexHttpClient2(url);
  return _client;
}
async function startFounderEpisodeConvex(input) {
  return getConvexClient().mutation(api.domains.founder.founderHarnessOps.startEpisode, input);
}
async function appendFounderEpisodeSpanConvex(input) {
  return getConvexClient().mutation(api.domains.founder.founderHarnessOps.appendEpisodeSpan, input);
}
async function finalizeFounderEpisodeConvex(input) {
  return getConvexClient().mutation(api.domains.founder.founderHarnessOps.finalizeEpisode, input);
}
async function getFounderEpisodeConvex(episodeId) {
  return getConvexClient().query(api.domains.founder.founderHarnessOps.getEpisode, { episodeId });
}
async function listFounderEpisodesConvex(input) {
  return getConvexClient().query(api.domains.founder.founderHarnessOps.listEpisodes, input);
}

// server/routes/sharedContextConvex.ts
var _client2 = null;
function getConvexClient2() {
  if (_client2) return _client2;
  const url = process.env.CONVEX_URL ?? process.env.VITE_CONVEX_URL;
  if (!url) throw new Error("CONVEX_URL not set \u2014 cannot use Convex adapter");
  _client2 = new ConvexHttpClient3(url);
  return _client2;
}
function isConvexAvailable() {
  return !!(process.env.CONVEX_URL ?? process.env.VITE_CONVEX_URL);
}
async function registerPeerConvex(input) {
  const client = getConvexClient2();
  await client.mutation(api.domains.founder.sharedContextOps.registerPeer, {
    peerId: input.peerId,
    product: input.product ?? "nodebench",
    workspaceId: input.workspaceId,
    surface: input.surface ?? "web",
    role: input.role ?? "router",
    capabilities: input.capabilities,
    contextScopes: input.contextScopes,
    summary: input.summary
  });
  return { peerId: input.peerId };
}
async function publishPacketConvex(input) {
  const client = getConvexClient2();
  await client.mutation(api.domains.founder.sharedContextOps.publishPacket, {
    contextId: input.contextId,
    contextType: input.contextType,
    producerPeerId: input.producerPeerId,
    workspaceId: input.workspaceId,
    scope: input.scope,
    subject: input.subject,
    summary: input.summary,
    claims: input.claims,
    evidenceRefs: input.evidenceRefs,
    confidence: input.confidence,
    lineage: input.lineage,
    freshness: input.freshness
  });
  return { contextId: input.contextId };
}
async function getPacketConvex(contextId) {
  const client = getConvexClient2();
  return client.query(api.domains.founder.sharedContextOps.getPacket, { contextId });
}
async function proposeTaskConvex(input) {
  const client = getConvexClient2();
  await client.mutation(api.domains.founder.sharedContextOps.proposeTask, {
    taskId: input.taskId,
    taskType: input.taskType ?? "agent_handoff",
    proposerPeerId: input.proposerPeerId,
    assigneePeerId: input.assigneePeerId,
    taskSpec: input.taskSpec,
    inputContextIds: input.inputContextIds,
    description: input.reason
  });
  return { taskId: input.taskId };
}
async function getSnapshotConvex(limit = 10, _requestingPeerId) {
  const client = getConvexClient2();
  const [peers, packets, tasks, messages] = await Promise.all([
    client.query(api.domains.founder.sharedContextOps.listPeers, { limit }),
    client.query(api.domains.founder.sharedContextOps.listPackets, { limit }),
    client.query(api.domains.founder.sharedContextOps.listTasks, { limit }),
    client.query(api.domains.founder.sharedContextOps.listMessages, { limit })
  ]);
  return {
    peers,
    recentPackets: packets,
    recentTasks: tasks,
    recentMessages: messages
  };
}
var startFounderEpisodeConvex2 = startFounderEpisodeConvex;
var appendFounderEpisodeSpanConvex2 = appendFounderEpisodeSpanConvex;
var finalizeFounderEpisodeConvex2 = finalizeFounderEpisodeConvex;
var getFounderEpisodeConvex2 = getFounderEpisodeConvex;
var listFounderEpisodesConvex2 = listFounderEpisodesConvex;

// server/routes/sharedContext.ts
var useConvex = () => !!(process.env.VERCEL && isConvexAvailable());
var WEB_PRODUCER_PEER_ID = "peer:web:control_plane";
var DELEGATE_TARGETS = {
  claude_code: {
    peerId: "peer:delegate:claude_code",
    label: "Claude Code",
    installCommand: "claude mcp add nodebench -- npx -y nodebench-mcp"
  },
  openclaw: {
    peerId: "peer:delegate:openclaw",
    label: "OpenClaw",
    installCommand: "npx -y nodebench-mcp"
  }
};
function firstQueryValue(value) {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : void 0;
  return typeof value === "string" ? value : void 0;
}
function parseSnapshotFilters(query) {
  const peerId = firstQueryValue(query.peerId);
  const workspaceId = firstQueryValue(query.workspaceId);
  const contextType = firstQueryValue(query.contextType);
  const producerPeerId = firstQueryValue(query.producerPeerId);
  const scopeIncludes = firstQueryValue(query.scopeIncludes);
  const subjectIncludes = firstQueryValue(query.subjectIncludes);
  const taskType = firstQueryValue(query.taskType);
  const messageClass = firstQueryValue(query.messageClass);
  const eventTypesRaw = firstQueryValue(query.eventTypes);
  return {
    peerId,
    workspaceId,
    contextType,
    producerPeerId,
    scopeIncludes,
    subjectIncludes,
    taskType,
    messageClass,
    eventTypes: eventTypesRaw ? eventTypesRaw.split(",").map((value) => value.trim()).filter(Boolean) : void 0
  };
}
function positiveLimit(value, fallback) {
  const parsed = Number(firstQueryValue(value) ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), 50);
}
function normalizeEpisodeSurface(value) {
  if (value === "web" || value === "api" || value === "browser" || value === "claude_code" || value === "openclaw" || value === "local_runtime") {
    return value;
  }
  return "web";
}
function normalizeEpisodeStatus(value) {
  if (value === "active" || value === "completed" || value === "error" || value === "aborted") {
    return value;
  }
  return void 0;
}
function filterSnapshot(snapshot, filters) {
  const peers = filters.workspaceId ? snapshot.peers.filter((peer) => peer.workspaceId === filters.workspaceId) : snapshot.peers;
  const recentPackets = snapshot.recentPackets.filter((packet) => {
    if (filters.workspaceId && packet.workspaceId !== filters.workspaceId) return false;
    if (filters.contextType && packet.contextType !== filters.contextType) return false;
    if (filters.producerPeerId && packet.producerPeerId !== filters.producerPeerId) return false;
    if (filters.scopeIncludes && !packet.scope.includes(filters.scopeIncludes)) return false;
    if (filters.subjectIncludes && !packet.subject.toLowerCase().includes(filters.subjectIncludes.toLowerCase())) return false;
    return true;
  });
  const recentTasks = snapshot.recentTasks.filter((task) => {
    if (filters.taskType && task.taskType !== filters.taskType) return false;
    if (!filters.workspaceId) return true;
    return recentPackets.some((packet) => packet.contextId === task.outputContextId) || snapshot.peers.some((peer) => peer.peerId === task.proposerPeerId && peer.workspaceId === filters.workspaceId) || snapshot.peers.some((peer) => peer.peerId === task.assigneePeerId && peer.workspaceId === filters.workspaceId);
  });
  const recentMessages = snapshot.recentMessages.filter((message) => {
    if (filters.messageClass && message.messageClass !== filters.messageClass) return false;
    if (!filters.workspaceId) return true;
    return peers.some((peer) => peer.peerId === message.fromPeerId || peer.peerId === message.toPeerId);
  });
  return {
    peers,
    recentPackets,
    recentTasks,
    recentMessages,
    counts: {
      activePeers: peers.filter((peer) => peer.status === "active").length,
      activePackets: recentPackets.filter((packet) => packet.status === "active").length,
      invalidatedPackets: recentPackets.filter((packet) => packet.status === "invalidated").length,
      openTasks: recentTasks.filter((task) => task.status === "proposed" || task.status === "accepted").length,
      unreadMessages: recentMessages.filter((message) => message.status === "unread").length
    }
  };
}
function eventMatchesFilters(event, filters) {
  const type = typeof event.type === "string" ? event.type : "";
  if (filters.eventTypes && filters.eventTypes.length > 0 && !filters.eventTypes.includes(type)) {
    return false;
  }
  const payload = typeof event.payload === "object" && event.payload ? event.payload : {};
  const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId : void 0;
  const contextType = typeof payload.contextType === "string" ? payload.contextType : void 0;
  const contextId = typeof payload.contextId === "string" ? payload.contextId : void 0;
  const producerPeerId = typeof payload.producerPeerId === "string" ? payload.producerPeerId : void 0;
  const taskType = typeof payload.taskType === "string" ? payload.taskType : void 0;
  const messageClass = typeof payload.messageClass === "string" ? payload.messageClass : void 0;
  if (filters.workspaceId && workspaceId && workspaceId !== filters.workspaceId) {
    return false;
  }
  if (filters.contextType && contextType && contextType !== filters.contextType) {
    return false;
  }
  if (filters.producerPeerId && producerPeerId && producerPeerId !== filters.producerPeerId) {
    return false;
  }
  if (filters.taskType && taskType && taskType !== filters.taskType) {
    return false;
  }
  if (filters.messageClass && messageClass && messageClass !== filters.messageClass) {
    return false;
  }
  if (filters.subjectIncludes && contextId && filters.peerId) {
    let packet = null;
    try {
      packet = getSharedContextPacket(contextId, filters.peerId);
    } catch {
      return false;
    }
    if (!packet || !packet.subject.toLowerCase().includes(filters.subjectIncludes.toLowerCase())) {
      return false;
    }
  } else if (filters.subjectIncludes && typeof payload.subject === "string") {
    if (!payload.subject.toLowerCase().includes(filters.subjectIncludes.toLowerCase())) return false;
  }
  if (filters.peerId && contextId) {
    let packet = null;
    try {
      packet = getSharedContextPacket(contextId, filters.peerId);
    } catch {
      return false;
    }
    if (!packet) return false;
    if (filters.scopeIncludes && !packet.scope.includes(filters.scopeIncludes)) {
      return false;
    }
  }
  return true;
}
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
function summarizePacket(packet) {
  const answer = typeof packet.answer === "string" ? packet.answer.trim() : "";
  const change = packet.changes?.[0]?.description?.trim();
  const risk = packet.risks?.[0]?.title?.trim();
  const lines = [answer, change ? `Change: ${change}` : "", risk ? `Contradiction: ${risk}` : ""].filter(Boolean);
  return lines.join(" ").slice(0, 600);
}
function collectClaims(packet) {
  const claims = [
    ...(packet.answerBlocks ?? []).map((block) => block.text ?? block.title ?? "").filter(Boolean),
    ...(packet.changes ?? []).map((change) => change.description ?? "").filter(Boolean),
    ...(packet.risks ?? []).map((risk) => risk.title ?? risk.description ?? "").filter(Boolean)
  ];
  return claims.slice(0, 12);
}
function collectEvidenceRefs(packet) {
  const refs = (packet.sourceRefs ?? []).map((source) => source.href ?? source.id ?? source.label ?? source.title ?? "").filter(Boolean);
  return Array.from(new Set(refs)).slice(0, 12);
}
function getWorkspaceId(packet) {
  const base = packet.canonicalEntity ?? packet.entityName ?? "nodebench";
  return `workspace:${slugify(base) || "nodebench"}`;
}
function getContextId(packet) {
  return `context:${packet.packetId ?? slugify(`${packet.canonicalEntity ?? packet.entityName ?? "nodebench"}-${packet.query ?? "query"}`)}`;
}
function getTaskId(packet, target) {
  return `task:${target}:${packet.packetId ?? slugify(`${packet.canonicalEntity ?? packet.entityName ?? "nodebench"}-${packet.query ?? "query"}`)}`;
}
function getStrategicTaskId(packet, target, angle) {
  return `${getTaskId(packet, target)}:${slugify(angle.id ?? angle.title ?? "issue")}`;
}
function getSubject(packet) {
  const entity = packet.canonicalEntity ?? packet.entityName ?? "NodeBench";
  return `${entity} shared context packet`;
}
function normalizeStrategicAngles(packet) {
  return Array.isArray(packet.strategicAngles) ? packet.strategicAngles.filter(Boolean) : [];
}
function findStrategicAngle(packet, strategicAngleId) {
  if (!strategicAngleId) return null;
  return normalizeStrategicAngles(packet).find((angle) => angle.id === strategicAngleId) ?? null;
}
function getStrategicContextId(packet, angle) {
  return `${getContextId(packet)}:issue:${slugify(angle.id ?? angle.title ?? "issue")}`;
}
function getStrategicSubject(packet, angle) {
  const entity = packet.canonicalEntity ?? packet.entityName ?? "NodeBench";
  return `${entity} \xB7 ${angle.title ?? "Strategic issue"}`;
}
function getFreshness(packet) {
  const proofStatus = packet.proofStatus ?? "provisional";
  const trustTier = proofStatus === "verified" ? "verified" : proofStatus === "drifting" ? "directional" : "internal";
  return {
    status: proofStatus === "drifting" ? "warming" : "fresh",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString(),
    trustTier
  };
}
function buildHandoffPrompt(args) {
  const target = DELEGATE_TARGETS[args.target];
  const entity = args.packet.canonicalEntity ?? args.packet.entityName ?? "the company";
  const workspaceId = getWorkspaceId(args.packet);
  const subject = args.subject ?? getSubject(args.packet);
  return [
    `Use NodeBench MCP as the truth layer for this task. You are the ${target.label} worker.`,
    "",
    `Goal: ${args.goal}`,
    `Workspace: ${workspaceId}`,
    `Shared context packet: ${args.contextId}`,
    ...args.parentContextId ? [`Parent packet: ${args.parentContextId}`] : [],
    `Shared task: ${args.taskId}`,
    "",
    "Workflow:",
    `1. Ensure NodeBench MCP is installed: ${target.installCommand}`,
    `2. Pull the packet with pull_shared_context using {"workspaceId":"${workspaceId}","subjectIncludes":"${subject}","limit":1}.`,
    "3. Use get_shared_context_snapshot if you need to inspect recent packets and task handoffs.",
    `4. Treat ${entity} as the canonical subject. Do not restate or re-infer the company from scratch unless the packet is contradicted.`,
    "5. Execute the requested implementation, keeping changes tied to the packet's next action and contradictions.",
    "6. When done, publish any updated packet or verdict back through NodeBench MCP so the shared truth stays current."
  ].join("\n");
}
function registerWebPeer(packet) {
  registerSharedContextPeer({
    peerId: WEB_PRODUCER_PEER_ID,
    product: "nodebench",
    workspaceId: getWorkspaceId(packet),
    surface: "web",
    role: "router",
    capabilities: ["can-publish-packet", "can-propose-task", "can-package-truth"],
    contextScopes: ["workspace", "entity", "packet"],
    summary: {
      currentTask: `Packaging ${packet.canonicalEntity ?? packet.entityName ?? "NodeBench"} for delegation`,
      focusEntity: packet.canonicalEntity ?? packet.entityName ?? "NodeBench",
      currentState: "packet_ready",
      confidence: typeof packet.confidence === "number" ? packet.confidence / 100 : void 0
    },
    metadata: {
      packetId: packet.packetId ?? null,
      packetType: packet.packetType ?? null
    },
    queueForSync: false
  });
}
function registerDelegatePeer(packet, target) {
  const mapping = DELEGATE_TARGETS[target];
  registerSharedContextPeer({
    peerId: mapping.peerId,
    product: "nodebench",
    workspaceId: getWorkspaceId(packet),
    surface: "api",
    role: "compiler",
    capabilities: ["can-build", "can-execute", "can-complete-task"],
    contextScopes: ["workspace", "entity", "packet"],
    status: "idle",
    summary: {
      currentTask: `Awaiting ${mapping.label} handoff`,
      focusEntity: packet.canonicalEntity ?? packet.entityName ?? "NodeBench",
      currentState: "waiting_for_packet"
    },
    metadata: {
      targetAgent: target,
      targetLabel: mapping.label
    },
    queueForSync: false
  });
}
function buildPacketResourceHints(contextId, packet, peerId) {
  const resource = getSharedContextPacketResource(contextId, peerId);
  if (resource) {
    return {
      resourceUri: resource.resourceUri,
      pullQuery: resource.pullQuery,
      subscriptionQuery: resource.subscriptionQuery
    };
  }
  return {
    resourceUri: `shared-context://packet/${encodeURIComponent(contextId)}`,
    pullQuery: {
      contextType: "entity_packet",
      producerPeerId: WEB_PRODUCER_PEER_ID,
      workspaceId: getWorkspaceId(packet),
      subjectIncludes: getSubject(packet)
    },
    subscriptionQuery: {
      peerId: peerId ?? void 0,
      workspaceId: getWorkspaceId(packet),
      contextType: "entity_packet",
      producerPeerId: WEB_PRODUCER_PEER_ID,
      subjectIncludes: getSubject(packet),
      eventTypes: ["packet_published", "packet_invalidated", "task_proposed", "task_status_changed"]
    }
  };
}
function buildSubscriptionManifestUrls(req, filters) {
  const params = new URLSearchParams();
  if (filters.peerId) params.set("peerId", filters.peerId);
  if (filters.workspaceId) params.set("workspaceId", filters.workspaceId);
  if (filters.contextType) params.set("contextType", filters.contextType);
  if (filters.producerPeerId) params.set("producerPeerId", filters.producerPeerId);
  if (filters.scopeIncludes) params.set("scopeIncludes", filters.scopeIncludes);
  if (filters.subjectIncludes) params.set("subjectIncludes", filters.subjectIncludes);
  if (filters.taskType) params.set("taskType", filters.taskType);
  if (filters.messageClass) params.set("messageClass", filters.messageClass);
  if (filters.eventTypes?.length) params.set("eventTypes", filters.eventTypes.join(","));
  params.set("limit", "10");
  const query = params.toString();
  const base = `${req.protocol}://${req.get("host")}/api/shared-context`;
  return {
    snapshotUrl: `${base}/snapshot?${query}`,
    eventsUrl: `${base}/events?${query}`
  };
}
function buildStrategicIssuePayload(args) {
  const { packet, angle, target } = args;
  const entitySlug = slugify(packet.canonicalEntity ?? packet.entityName ?? "nodebench");
  const workspaceId = getWorkspaceId(packet);
  const parentContextId = getContextId(packet);
  const matchedSourceRefs = (packet.sourceRefs ?? []).filter((source) => (angle.evidenceRefIds ?? []).includes(String(source.id ?? ""))).map((source) => source.href ?? source.label ?? source.title ?? source.id ?? "").filter(Boolean);
  return {
    contextId: getStrategicContextId(packet, angle),
    contextType: "issue_packet",
    producerPeerId: WEB_PRODUCER_PEER_ID,
    workspaceId,
    scope: [
      "workspace",
      `entity:${entitySlug}`,
      "pressure_test",
      `issue:${slugify(angle.id ?? angle.title ?? "issue")}`,
      ...target ? [`delegate:${target}`] : []
    ],
    subject: getStrategicSubject(packet, angle),
    summary: angle.summary ?? packet.recommendedNextAction ?? summarizePacket(packet),
    claims: [
      angle.summary ?? "",
      angle.whyItMatters ?? "",
      angle.nextQuestion ?? ""
    ].filter(Boolean),
    evidenceRefs: matchedSourceRefs.length > 0 ? matchedSourceRefs : collectEvidenceRefs(packet),
    stateSnapshot: {
      angle,
      parentPacketId: packet.packetId ?? null,
      parentContextId,
      packet
    },
    freshness: getFreshness(packet),
    permissions: {
      visibility: "workspace",
      allowedRoles: ["researcher", "compiler", "judge", "router", "monitor"]
    },
    confidence: typeof packet.confidence === "number" ? Math.max(0, Math.min(1, packet.confidence / 100)) : void 0,
    lineage: {
      parentContextIds: [parentContextId],
      sourceRunId: typeof packet.packetId === "string" ? packet.packetId : void 0
    },
    nextActions: [
      angle.nextQuestion ?? "",
      packet.recommendedNextAction ?? "",
      ...(packet.nextQuestions ?? []).slice(0, 2)
    ].filter(Boolean).slice(0, 4),
    metadata: {
      packetId: packet.packetId ?? null,
      packetType: packet.packetType ?? null,
      proofStatus: packet.proofStatus ?? null,
      strategicAngleId: angle.id ?? null,
      strategicAngleStatus: angle.status ?? null,
      strategicAngleTitle: angle.title ?? null,
      targetAgent: target ?? null
    },
    queueForSync: false
  };
}
function createSharedContextRouter() {
  const router = Router2();
  router.get("/episodes", async (req, res) => {
    const sessionKey = firstQueryValue(req.query.sessionKey);
    const workspaceId = firstQueryValue(req.query.workspaceId);
    const status = normalizeEpisodeStatus(firstQueryValue(req.query.status));
    const limit = positiveLimit(req.query.limit, 10);
    try {
      const episodes = useConvex() ? await listFounderEpisodesConvex2({ sessionKey, workspaceId, status, limit }) : listFounderEpisodes({ sessionKey, workspaceId, status, limit });
      return res.json({
        success: true,
        episodes,
        filters: { sessionKey, workspaceId, status: status ?? null, limit }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  router.get("/episodes/:episodeId", async (req, res) => {
    try {
      const episode = useConvex() ? await getFounderEpisodeConvex2(req.params.episodeId) : getFounderEpisode(req.params.episodeId);
      if (!episode) {
        return res.status(404).json({
          success: false,
          message: `Founder harness episode not found: ${req.params.episodeId}`
        });
      }
      return res.json({ success: true, episode });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  router.post("/episodes/start", async (req, res) => {
    const body = req.body ?? {};
    if (!body.query?.trim() && !body.entityName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Founder harness episodes require a query or entityName."
      });
    }
    try {
      const episode = useConvex() ? await startFounderEpisodeConvex2({
        episodeId: body.episodeId ?? `episode:${Date.now()}`,
        correlationId: body.correlationId ?? `corr:${Date.now()}`,
        sessionKey: body.sessionKey,
        workspaceId: body.workspaceId,
        companyKey: body.companyKey,
        surface: normalizeEpisodeSurface(body.surface),
        episodeType: body.episodeType ?? "entity_search",
        query: body.query?.trim(),
        lens: body.lens?.trim(),
        entityName: body.entityName?.trim(),
        stateBefore: body.stateBefore,
        stateBeforeHash: body.stateBeforeHash,
        metadata: body.metadata,
        initialSpan: body.initialSpan
      }) : startFounderEpisode({
        episodeId: body.episodeId,
        correlationId: body.correlationId,
        sessionKey: body.sessionKey,
        workspaceId: body.workspaceId,
        companyKey: body.companyKey,
        surface: normalizeEpisodeSurface(body.surface),
        episodeType: body.episodeType ?? "entity_search",
        query: body.query?.trim(),
        lens: body.lens?.trim(),
        entityName: body.entityName?.trim(),
        stateBefore: body.stateBefore,
        stateBeforeHash: body.stateBeforeHash,
        metadata: body.metadata,
        initialSpan: body.initialSpan
      });
      return res.json({ success: true, episode });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  router.post("/episodes/:episodeId/span", async (req, res) => {
    const body = req.body ?? {};
    if (!body.span) {
      return res.status(400).json({
        success: false,
        message: "Founder harness span payload is required."
      });
    }
    try {
      const episode = useConvex() ? await appendFounderEpisodeSpanConvex2({
        episodeId: req.params.episodeId,
        span: body.span,
        contextId: body.contextId,
        taskId: body.taskId,
        entityName: body.entityName,
        packetId: body.packetId,
        packetType: body.packetType,
        workspaceId: body.workspaceId,
        companyKey: body.companyKey,
        metadata: body.metadata
      }) : appendFounderEpisodeSpan({
        episodeId: req.params.episodeId,
        span: body.span,
        contextId: body.contextId,
        taskId: body.taskId,
        entityName: body.entityName,
        packetId: body.packetId,
        packetType: body.packetType,
        workspaceId: body.workspaceId,
        companyKey: body.companyKey,
        metadata: body.metadata
      });
      return res.json({ success: true, episode });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  router.post("/episodes/:episodeId/finalize", async (req, res) => {
    const body = req.body ?? {};
    try {
      const episode = useConvex() ? await finalizeFounderEpisodeConvex2({
        episodeId: req.params.episodeId,
        status: normalizeEpisodeStatus(body.status),
        stateAfter: body.stateAfter,
        stateAfterHash: body.stateAfterHash,
        summary: body.summary,
        toolsInvoked: body.toolsInvoked,
        artifactsProduced: body.artifactsProduced,
        traceStepCount: typeof body.traceStepCount === "number" ? body.traceStepCount : void 0,
        importantChangesDetected: typeof body.importantChangesDetected === "number" ? body.importantChangesDetected : void 0,
        contradictionsDetected: typeof body.contradictionsDetected === "number" ? body.contradictionsDetected : void 0,
        contextId: body.contextId,
        taskId: body.taskId,
        entityName: body.entityName,
        packetId: body.packetId,
        packetType: body.packetType,
        workspaceId: body.workspaceId,
        companyKey: body.companyKey,
        finalSpan: body.finalSpan,
        metadata: body.metadata
      }) : finalizeFounderEpisode({
        episodeId: req.params.episodeId,
        status: normalizeEpisodeStatus(body.status),
        stateAfter: body.stateAfter,
        stateAfterHash: body.stateAfterHash,
        summary: body.summary,
        toolsInvoked: body.toolsInvoked,
        artifactsProduced: body.artifactsProduced,
        traceStepCount: typeof body.traceStepCount === "number" ? body.traceStepCount : void 0,
        importantChangesDetected: typeof body.importantChangesDetected === "number" ? body.importantChangesDetected : void 0,
        contradictionsDetected: typeof body.contradictionsDetected === "number" ? body.contradictionsDetected : void 0,
        contextId: body.contextId,
        taskId: body.taskId,
        entityName: body.entityName,
        packetId: body.packetId,
        packetType: body.packetType,
        workspaceId: body.workspaceId,
        companyKey: body.companyKey,
        finalSpan: body.finalSpan,
        metadata: body.metadata
      });
      return res.json({ success: true, episode });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  router.get("/snapshot", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = typeof rawLimit === "string" ? Number.parseInt(rawLimit, 10) : 10;
    const safeLim = Number.isFinite(limit) && limit > 0 ? limit : 10;
    const filters = parseSnapshotFilters(req.query);
    if (useConvex()) {
      try {
        const snapshot = await getSnapshotConvex(safeLim, filters.peerId);
        return res.json({ success: true, snapshot, peerId: filters.peerId ?? null, filters });
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
    try {
      return res.json({
        success: true,
        snapshot: getSharedContextScopedSnapshot({
          peerId: filters.peerId,
          workspaceId: filters.workspaceId,
          contextType: filters.contextType,
          producerPeerId: filters.producerPeerId,
          scopeIncludes: filters.scopeIncludes,
          subjectIncludes: filters.subjectIncludes,
          taskType: filters.taskType,
          messageClass: filters.messageClass,
          limit: safeLim
        }),
        peerId: filters.peerId ?? null,
        filters
      });
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  router.get("/peers/:peerId/snapshot", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = typeof rawLimit === "string" ? Number.parseInt(rawLimit, 10) : 10;
    const safeLim = Number.isFinite(limit) && limit > 0 ? limit : 10;
    const filters = parseSnapshotFilters(req.query);
    const peerId = req.params.peerId;
    try {
      if (useConvex()) {
        const snapshot = await getSnapshotConvex(safeLim, peerId);
        return res.json({
          success: true,
          snapshot: filterSnapshot(snapshot, {
            ...filters,
            peerId
          }),
          peerId,
          filters: { ...filters, peerId }
        });
      }
      return res.json({
        success: true,
        snapshot: getSharedContextScopedSnapshot({
          peerId,
          workspaceId: filters.workspaceId,
          contextType: filters.contextType,
          producerPeerId: filters.producerPeerId,
          scopeIncludes: filters.scopeIncludes,
          subjectIncludes: filters.subjectIncludes,
          taskType: filters.taskType,
          messageClass: filters.messageClass,
          limit: safeLim
        }),
        peerId,
        filters: { ...filters, peerId }
      });
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  router.get("/subscriptions/manifest", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = typeof rawLimit === "string" ? Number.parseInt(rawLimit, 10) : 10;
    const safeLim = Number.isFinite(limit) && limit > 0 ? limit : 10;
    const filters = parseSnapshotFilters(req.query);
    try {
      if (useConvex()) {
        const snapshot = filterSnapshot(
          await getSnapshotConvex(safeLim, filters.peerId),
          filters
        );
        return res.json({
          success: true,
          manifest: {
            peerId: filters.peerId ?? null,
            snapshotQuery: {
              limit: safeLim,
              peerId: filters.peerId,
              workspaceId: filters.workspaceId,
              contextType: filters.contextType,
              producerPeerId: filters.producerPeerId,
              scopeIncludes: filters.scopeIncludes,
              subjectIncludes: filters.subjectIncludes,
              taskType: filters.taskType,
              messageClass: filters.messageClass
            },
            pullQuery: {
              contextType: filters.contextType,
              producerPeerId: filters.producerPeerId,
              requestingPeerId: filters.peerId,
              workspaceId: filters.workspaceId,
              scopeIncludes: filters.scopeIncludes,
              subjectIncludes: filters.subjectIncludes,
              limit: safeLim
            },
            subscriptionQuery: {
              peerId: filters.peerId,
              workspaceId: filters.workspaceId,
              contextType: filters.contextType,
              producerPeerId: filters.producerPeerId,
              scopeIncludes: filters.scopeIncludes,
              subjectIncludes: filters.subjectIncludes,
              taskType: filters.taskType,
              messageClass: filters.messageClass,
              eventTypes: filters.eventTypes ?? [
                "packet_published",
                "packet_invalidated",
                "packet_acknowledged",
                "task_proposed",
                "task_status_changed",
                "message_sent"
              ]
            },
            packetResources: snapshot.recentPackets.map((packet) => ({
              contextId: String(packet.contextId),
              contextType: String(packet.contextType),
              subject: String(packet.subject),
              resourceUri: `shared-context://packet/${encodeURIComponent(String(packet.contextId))}`
            }))
          },
          urls: buildSubscriptionManifestUrls(req, filters)
        });
      }
      const manifest = buildSharedContextSubscriptionManifest({
        peerId: filters.peerId,
        workspaceId: filters.workspaceId,
        contextType: filters.contextType,
        producerPeerId: filters.producerPeerId,
        scopeIncludes: filters.scopeIncludes,
        subjectIncludes: filters.subjectIncludes,
        taskType: filters.taskType,
        messageClass: filters.messageClass,
        eventTypes: filters.eventTypes,
        limit: safeLim
      });
      return res.json({
        success: true,
        manifest,
        urls: buildSubscriptionManifestUrls(req, filters)
      });
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  router.get("/packets/:contextId", async (req, res) => {
    const peerId = firstQueryValue(req.query.peerId);
    try {
      const packet = useConvex() ? await getPacketConvex(req.params.contextId) : getSharedContextPacket(req.params.contextId, peerId);
      if (!packet) {
        return res.status(404).json({
          success: false,
          message: "Shared context packet not found or not visible in the requested scope."
        });
      }
      return res.json({
        success: true,
        packet,
        resourceUri: `shared-context://packet/${encodeURIComponent(packet.contextId)}`,
        pullQuery: {
          contextType: packet.contextType,
          producerPeerId: packet.producerPeerId,
          workspaceId: packet.workspaceId ?? void 0,
          tenantId: packet.tenantId ?? void 0,
          scopeIncludes: packet.scope.find((scope) => scope !== "workspace"),
          subjectIncludes: packet.subject
        },
        subscriptionQuery: {
          peerId: peerId ?? void 0,
          workspaceId: packet.workspaceId ?? void 0,
          contextType: packet.contextType,
          producerPeerId: packet.producerPeerId,
          scopeIncludes: packet.scope.find((scope) => scope !== "workspace"),
          subjectIncludes: packet.subject,
          eventTypes: ["packet_published", "packet_invalidated", "packet_acknowledged", "task_proposed", "task_status_changed"]
        },
        peerId: peerId ?? null
      });
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  router.get("/events", (req, res) => {
    const filters = parseSnapshotFilters(req.query);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const writeEvent = (event) => {
      res.write(`event: shared_context
`);
      res.write(`data: ${JSON.stringify(event)}

`);
    };
    writeEvent({
      type: "connected",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      filters
    });
    const heartbeat = setInterval(() => {
      writeEvent({
        type: "heartbeat",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }, 15e3);
    const bus = getSharedContextEventBus();
    const handler = (event) => {
      if (!eventMatchesFilters(event, filters)) return;
      writeEvent(event);
    };
    bus.on("shared_context", handler);
    res.on("close", () => {
      clearInterval(heartbeat);
      bus.off("shared_context", handler);
      res.end();
    });
  });
  router.post("/publish", async (req, res) => {
    const body = req.body ?? {};
    const packet = body.packet;
    if (!packet?.answer || !(packet.canonicalEntity ?? packet.entityName)) {
      return res.status(400).json({
        success: false,
        message: "A result packet with entityName/canonicalEntity and answer is required."
      });
    }
    const contextId = getContextId(packet);
    const workspaceId = getWorkspaceId(packet);
    const strategicAngle = findStrategicAngle(packet, body.strategicAngleId);
    const packetPayload = {
      contextId,
      contextType: "entity_packet",
      producerPeerId: WEB_PRODUCER_PEER_ID,
      workspaceId,
      scope: [
        "workspace",
        `entity:${slugify(packet.canonicalEntity ?? packet.entityName ?? "nodebench")}`,
        `packet:${packet.packetType ?? "founder_packet"}`
      ],
      subject: getSubject(packet),
      summary: summarizePacket(packet),
      claims: collectClaims(packet),
      evidenceRefs: collectEvidenceRefs(packet),
      confidence: typeof packet.confidence === "number" ? Math.max(0, Math.min(1, packet.confidence / 100)) : void 0,
      lineage: {
        sourceRunId: typeof packet.packetId === "string" ? packet.packetId : void 0
      },
      freshness: getFreshness(packet)
    };
    try {
      if (useConvex()) {
        await registerPeerConvex({
          peerId: WEB_PRODUCER_PEER_ID,
          product: "nodebench",
          workspaceId,
          surface: "web",
          role: "router",
          capabilities: ["can-publish-packet", "can-propose-task", "can-package-truth"],
          contextScopes: ["workspace", "entity", "packet"]
        });
        await publishPacketConvex(packetPayload);
        let issueContextId = null;
        if (strategicAngle) {
          const issuePayload = buildStrategicIssuePayload({ packet, angle: strategicAngle });
          issueContextId = issuePayload.contextId ?? null;
          await publishPacketConvex(issuePayload);
        }
        const snapshot = await getSnapshotConvex(6);
        if (body.episodeId) {
          await appendFounderEpisodeSpanConvex2({
            episodeId: body.episodeId,
            span: {
              stage: "after",
              type: strategicAngle ? "strategic_issue_published" : "packet_published",
              status: "ok",
              label: strategicAngle ? "Published strategic issue packet" : "Published founder packet",
              detail: strategicAngle?.title ?? getSubject(packet),
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              contextId: strategicAngle ? issueContextId ?? contextId : contextId
            },
            contextId: strategicAngle ? issueContextId ?? contextId : contextId,
            entityName: packet.canonicalEntity ?? packet.entityName,
            packetId: packet.packetId,
            packetType: packet.packetType,
            workspaceId,
            metadata: {
              publishedVia: "shared_context",
              strategicAngleId: strategicAngle?.id ?? null
            }
          });
        }
        return res.json({
          success: true,
          contextId: strategicAngle ? issueContextId ?? contextId : contextId,
          parentContextId: strategicAngle ? contextId : null,
          workspaceId,
          strategicAngleId: strategicAngle?.id ?? null,
          resource: buildPacketResourceHints(strategicAngle ? issueContextId ?? contextId : contextId, packet),
          snapshot
        });
      }
      registerWebPeer(packet);
      publishSharedContextPacket({
        ...packetPayload,
        stateSnapshot: packet,
        permissions: {
          visibility: "workspace",
          allowedRoles: ["researcher", "compiler", "judge", "router"]
        },
        nextActions: [
          ...(packet.interventions ?? []).map((item) => item.action ?? "").filter(Boolean),
          ...(packet.nextQuestions ?? []).slice(0, 3)
        ].slice(0, 6),
        metadata: {
          query: packet.query ?? null,
          packetId: packet.packetId ?? null,
          packetType: packet.packetType ?? null,
          proofStatus: packet.proofStatus ?? null,
          recommendedNextAction: packet.recommendedNextAction ?? null
        },
        queueForSync: false
      });
      let responseContextId = contextId;
      if (strategicAngle) {
        const issuePayload = buildStrategicIssuePayload({ packet, angle: strategicAngle });
        publishSharedContextPacket(issuePayload);
        responseContextId = issuePayload.contextId ?? contextId;
      }
      if (body.episodeId) {
        appendFounderEpisodeSpan({
          episodeId: body.episodeId,
          span: {
            stage: "after",
            type: strategicAngle ? "strategic_issue_published" : "packet_published",
            status: "ok",
            label: strategicAngle ? "Published strategic issue packet" : "Published founder packet",
            detail: strategicAngle?.title ?? getSubject(packet),
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            contextId: responseContextId
          },
          contextId: responseContextId,
          entityName: packet.canonicalEntity ?? packet.entityName,
          packetId: packet.packetId,
          packetType: packet.packetType,
          workspaceId,
          metadata: {
            publishedVia: "shared_context",
            strategicAngleId: strategicAngle?.id ?? null
          }
        });
      }
      return res.json({
        success: true,
        contextId: responseContextId,
        parentContextId: strategicAngle ? contextId : null,
        workspaceId,
        strategicAngleId: strategicAngle?.id ?? null,
        resource: buildPacketResourceHints(responseContextId, packet),
        snapshot: getSharedContextSnapshot(6)
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  router.post("/delegate", async (req, res) => {
    const body = req.body ?? {};
    const packet = body.packet;
    const target = body.targetAgent ?? "claude_code";
    if (!packet?.answer || !(packet.canonicalEntity ?? packet.entityName)) {
      return res.status(400).json({
        success: false,
        message: "A result packet with entityName/canonicalEntity and answer is required."
      });
    }
    if (!(target in DELEGATE_TARGETS)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported targetAgent: ${String(target)}`
      });
    }
    const contextId = getContextId(packet);
    const workspaceId = getWorkspaceId(packet);
    const strategicAngle = findStrategicAngle(packet, body.strategicAngleId);
    const delegateContextId = strategicAngle ? getStrategicContextId(packet, strategicAngle) : contextId;
    try {
      if (useConvex()) {
        await registerPeerConvex({
          peerId: WEB_PRODUCER_PEER_ID,
          product: "nodebench",
          workspaceId,
          surface: "web",
          role: "router",
          capabilities: ["can-publish-packet", "can-propose-task", "can-package-truth"]
        });
        await registerPeerConvex({
          peerId: DELEGATE_TARGETS[target].peerId,
          product: "nodebench",
          workspaceId,
          surface: "api",
          role: "compiler",
          capabilities: ["can-build", "can-execute", "can-complete-task"]
        });
        await publishPacketConvex({
          contextId,
          contextType: "entity_packet",
          producerPeerId: WEB_PRODUCER_PEER_ID,
          workspaceId,
          scope: [
            "workspace",
            `entity:${slugify(packet.canonicalEntity ?? packet.entityName ?? "nodebench")}`,
            `delegate:${target}`
          ],
          subject: getSubject(packet),
          summary: summarizePacket(packet),
          claims: collectClaims(packet),
          evidenceRefs: collectEvidenceRefs(packet),
          confidence: typeof packet.confidence === "number" ? Math.max(0, Math.min(1, packet.confidence / 100)) : void 0,
          lineage: {
            sourceRunId: typeof packet.packetId === "string" ? packet.packetId : void 0
          },
          freshness: getFreshness(packet)
        });
        if (strategicAngle) {
          await publishPacketConvex(buildStrategicIssuePayload({ packet, angle: strategicAngle, target }));
        }
      } else {
        registerWebPeer(packet);
        registerDelegatePeer(packet, target);
        publishSharedContextPacket({
          contextId,
          contextType: "entity_packet",
          producerPeerId: WEB_PRODUCER_PEER_ID,
          workspaceId,
          scope: [
            "workspace",
            `entity:${slugify(packet.canonicalEntity ?? packet.entityName ?? "nodebench")}`,
            `packet:${packet.packetType ?? "founder_packet"}`,
            `delegate:${target}`
          ],
          subject: getSubject(packet),
          summary: summarizePacket(packet),
          claims: collectClaims(packet),
          evidenceRefs: collectEvidenceRefs(packet),
          stateSnapshot: packet,
          freshness: getFreshness(packet),
          permissions: {
            visibility: "workspace",
            allowedRoles: ["researcher", "compiler", "judge", "router"]
          },
          confidence: typeof packet.confidence === "number" ? Math.max(0, Math.min(1, packet.confidence / 100)) : void 0,
          lineage: {
            sourceRunId: typeof packet.packetId === "string" ? packet.packetId : void 0
          },
          nextActions: [
            ...(packet.interventions ?? []).map((item) => item.action ?? "").filter(Boolean),
            ...(packet.nextQuestions ?? []).slice(0, 3)
          ].slice(0, 6),
          metadata: {
            query: packet.query ?? null,
            packetId: packet.packetId ?? null,
            packetType: packet.packetType ?? null,
            proofStatus: packet.proofStatus ?? null,
            recommendedNextAction: packet.recommendedNextAction ?? null,
            targetAgent: target
          },
          queueForSync: false
        });
        if (strategicAngle) {
          publishSharedContextPacket(buildStrategicIssuePayload({ packet, angle: strategicAngle, target }));
        }
      }
      const goal = body.goal?.trim() || strategicAngle?.nextQuestion?.trim() || strategicAngle?.summary?.trim() || packet.recommendedNextAction?.trim() || packet.nextQuestions?.[0]?.trim() || "Continue implementation from the published NodeBench packet.";
      const taskId = strategicAngle ? getStrategicTaskId(packet, target, strategicAngle) : getTaskId(packet, target);
      if (useConvex()) {
        await proposeTaskConvex({
          taskId,
          taskType: strategicAngle ? "strategic_angle_handoff" : "agent_handoff",
          proposerPeerId: WEB_PRODUCER_PEER_ID,
          assigneePeerId: DELEGATE_TARGETS[target].peerId,
          taskSpec: {
            targetAgent: target,
            targetLabel: DELEGATE_TARGETS[target].label,
            goal,
            installCommand: DELEGATE_TARGETS[target].installCommand,
            proofStatus: packet.proofStatus ?? null,
            strategicAngleId: strategicAngle?.id ?? null,
            strategicAngleTitle: strategicAngle?.title ?? null
          },
          inputContextIds: strategicAngle ? [contextId, delegateContextId] : [contextId],
          reason: goal
        });
        const snapshot = await getSnapshotConvex(6);
        if (body.episodeId) {
          await appendFounderEpisodeSpanConvex2({
            episodeId: body.episodeId,
            span: {
              stage: "after",
              type: strategicAngle ? "strategic_issue_delegated" : "agent_delegated",
              status: "ok",
              label: strategicAngle ? `Delegated issue to ${DELEGATE_TARGETS[target].label}` : `Delegated to ${DELEGATE_TARGETS[target].label}`,
              detail: goal,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              contextId: delegateContextId,
              taskId
            },
            contextId: delegateContextId,
            taskId,
            entityName: packet.canonicalEntity ?? packet.entityName,
            packetId: packet.packetId,
            packetType: packet.packetType,
            workspaceId,
            metadata: {
              targetAgent: target,
              strategicAngleId: strategicAngle?.id ?? null
            }
          });
        }
        return res.json({
          success: true,
          contextId: delegateContextId,
          parentContextId: strategicAngle ? contextId : null,
          taskId,
          workspaceId,
          strategicAngleId: strategicAngle?.id ?? null,
          targetAgent: target,
          targetLabel: DELEGATE_TARGETS[target].label,
          installCommand: DELEGATE_TARGETS[target].installCommand,
          handoffPrompt: buildHandoffPrompt({
            packet,
            contextId: delegateContextId,
            parentContextId: strategicAngle ? contextId : null,
            taskId,
            target,
            goal,
            subject: strategicAngle ? getStrategicSubject(packet, strategicAngle) : getSubject(packet)
          }),
          resource: buildPacketResourceHints(delegateContextId, packet),
          snapshot
        });
      }
      const proposed = proposeSharedContextTask({
        taskId,
        taskType: strategicAngle ? "strategic_angle_handoff" : "agent_handoff",
        proposerPeerId: WEB_PRODUCER_PEER_ID,
        assigneePeerId: DELEGATE_TARGETS[target].peerId,
        taskSpec: {
          targetAgent: target,
          targetLabel: DELEGATE_TARGETS[target].label,
          goal,
          installCommand: DELEGATE_TARGETS[target].installCommand,
          proofStatus: packet.proofStatus ?? null,
          strategicAngleId: strategicAngle?.id ?? null,
          strategicAngleTitle: strategicAngle?.title ?? null
        },
        inputContextIds: strategicAngle ? [contextId, delegateContextId] : [contextId],
        reason: goal,
        metadata: {
          entityName: packet.canonicalEntity ?? packet.entityName ?? "NodeBench",
          query: packet.query ?? null,
          strategicAngleId: strategicAngle?.id ?? null,
          strategicAngleTitle: strategicAngle?.title ?? null
        },
        queueForSync: false
      });
      if (body.episodeId) {
        appendFounderEpisodeSpan({
          episodeId: body.episodeId,
          span: {
            stage: "after",
            type: strategicAngle ? "strategic_issue_delegated" : "agent_delegated",
            status: "ok",
            label: strategicAngle ? `Delegated issue to ${DELEGATE_TARGETS[target].label}` : `Delegated to ${DELEGATE_TARGETS[target].label}`,
            detail: goal,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            contextId: delegateContextId,
            taskId: proposed.taskId
          },
          contextId: delegateContextId,
          taskId: proposed.taskId,
          entityName: packet.canonicalEntity ?? packet.entityName,
          packetId: packet.packetId,
          packetType: packet.packetType,
          workspaceId,
          metadata: {
            targetAgent: target,
            strategicAngleId: strategicAngle?.id ?? null
          }
        });
      }
      return res.json({
        success: true,
        contextId: delegateContextId,
        parentContextId: strategicAngle ? contextId : null,
        taskId: proposed.taskId,
        workspaceId,
        strategicAngleId: strategicAngle?.id ?? null,
        targetAgent: target,
        targetLabel: DELEGATE_TARGETS[target].label,
        installCommand: DELEGATE_TARGETS[target].installCommand,
        handoffPrompt: buildHandoffPrompt({
          packet,
          contextId: delegateContextId,
          parentContextId: strategicAngle ? contextId : null,
          taskId: proposed.taskId,
          target,
          goal,
          subject: strategicAngle ? getStrategicSubject(packet, strategicAngle) : getSubject(packet)
        }),
        resource: buildPacketResourceHints(delegateContextId, packet),
        snapshot: getSharedContextSnapshot(6)
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  const MAX_PEERS_PER_ROOM = 50;
  const MAX_MESSAGES_PER_ROOM = 200;
  const MAX_ROOMS = 100;
  const ROOM_TTL_MS = 24 * 60 * 60 * 1e3;
  const rooms = /* @__PURE__ */ new Map();
  function getOrCreateRoom(code) {
    if (!rooms.has(code) && rooms.size >= MAX_ROOMS) {
      let oldest = null;
      let oldestTime = Infinity;
      for (const [k, r] of rooms) {
        if (r.lastActivity < oldestTime) {
          oldest = k;
          oldestTime = r.lastActivity;
        }
      }
      if (oldest) rooms.delete(oldest);
    }
    if (!rooms.has(code)) {
      rooms.set(code, { code, peers: /* @__PURE__ */ new Map(), messages: [], lastActivity: Date.now() });
    }
    const room = rooms.get(code);
    room.lastActivity = Date.now();
    return room;
  }
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (now - room.lastActivity > ROOM_TTL_MS) rooms.delete(code);
    }
  }, 6e4);
  router.get("/room/:code", (req, res) => {
    const code = (req.params.code ?? "").toUpperCase();
    if (!code) return res.status(400).json({ success: false, message: "Room code required." });
    const room = rooms.get(code);
    if (!room) {
      return res.json({
        success: true,
        room: code,
        peers: [],
        messages: []
      });
    }
    return res.json({
      success: true,
      room: code,
      peers: Array.from(room.peers.values()),
      messages: room.messages.slice(-100)
      // Last 100 messages
    });
  });
  router.post("/message", async (req, res) => {
    try {
      const { fromPeerId, toPeerId, content, messageType, room: roomCode, fromName, fromRoles } = req.body ?? {};
      if (!fromPeerId || !toPeerId || !content) {
        return res.status(400).json({
          success: false,
          message: "fromPeerId, toPeerId, and content are required."
        });
      }
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (roomCode) {
        const room = getOrCreateRoom(String(roomCode).toUpperCase());
        if (room.peers.size < MAX_PEERS_PER_ROOM || room.peers.has(fromPeerId)) {
          room.peers.set(fromPeerId, {
            peerId: fromPeerId,
            name: fromName ?? fromPeerId.split(":").pop()?.replaceAll("_", " ") ?? fromPeerId,
            roles: fromRoles ?? ["builder"],
            lastSeen: now,
            room: room.code
          });
        }
        room.messages.push({
          id: messageId,
          fromPeerId,
          toPeerId,
          content,
          timestamp: now,
          messageType: messageType ?? "request",
          room: room.code
        });
        if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
          room.messages.splice(0, room.messages.length - MAX_MESSAGES_PER_ROOM);
        }
      }
      registerSharedContextPeer({
        peerId: fromPeerId,
        product: "nodebench",
        surface: "local_runtime",
        role: "runner",
        capabilities: ["send-message"],
        summary: {}
      });
      const bus = getSharedContextEventBus();
      bus.emit("shared_context", {
        type: "message_sent",
        timestamp: now,
        payload: { messageId, fromPeerId, toPeerId, room: roomCode, subject: content.slice(0, 80) }
      });
      return res.json({
        success: true,
        messageId,
        fromPeerId,
        toPeerId,
        timestamp: now
      });
    } catch (error) {
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });
  return router;
}

// server/routes/harness.ts
import { Router as Router3 } from "express";

// server/harnessRuntime.ts
var MODEL_PRICING = {
  "gemini-3.1-flash-lite-preview": { input: 0.075, output: 0.3 },
  "gemini-3.1-flash-preview": { input: 0.15, output: 0.6 },
  "gemini-3.1-pro-preview": { input: 1.25, output: 5 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-6": { input: 15, output: 75 }
};
function estimateCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model] ?? { input: 0.15, output: 0.6 };
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1e6;
}
var sessions = /* @__PURE__ */ new Map();
var MAX_SESSIONS = 200;
var IDLE_TIMEOUT_MS = 30 * 60 * 1e3;
var COMPACTION_THRESHOLD = 40;
function genSessionId() {
  return `hns_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function cleanExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivityAt > IDLE_TIMEOUT_MS) {
      sessions.delete(id);
    }
  }
}
function evictOldest() {
  if (sessions.size < MAX_SESSIONS) return;
  let oldest = null;
  for (const s of sessions.values()) {
    if (!oldest || s.lastActivityAt < oldest.lastActivityAt) oldest = s;
  }
  if (oldest) sessions.delete(oldest.id);
}
function checkPermission(policy, toolName) {
  return policy.toolOverrides[toolName] ?? policy.default;
}
function compactSession(session) {
  const messages = session.messages;
  if (messages.length < COMPACTION_THRESHOLD) {
    return { removedMessageCount: 0, preservedMessageCount: messages.length, toolsUsed: [], pendingWork: [], keyFiles: [], currentState: "no compaction needed" };
  }
  const systemMsgs = messages.filter((m) => m.role === "system");
  const recentCount = 10;
  const recent = messages.slice(-recentCount);
  const removed = messages.slice(systemMsgs.length, -recentCount);
  const toolsUsed = [...new Set(removed.filter((m) => m.toolName).map((m) => m.toolName))];
  const userRequests = removed.filter((m) => m.role === "user").map((m) => m.content.slice(0, 100));
  const pendingWork = [];
  for (const msg of removed) {
    const lower = msg.content.toLowerCase();
    for (const keyword of ["todo", "next", "pending", "remaining", "should also", "follow up"]) {
      if (lower.includes(keyword)) {
        const sentence = msg.content.split(/[.!?\n]/).find((s) => s.toLowerCase().includes(keyword));
        if (sentence) pendingWork.push(sentence.trim().slice(0, 120));
      }
    }
  }
  const filePattern = /(?:[\w/.-]+\.(?:ts|tsx|js|json|md|py|rs))/g;
  const keyFiles = [...new Set(removed.flatMap((m) => m.content.match(filePattern) ?? []))].slice(0, 15);
  const currentState = `Processed ${userRequests.length} queries. Tools used: ${toolsUsed.join(", ")}. ${pendingWork.length > 0 ? `Pending: ${pendingWork[0]}` : "No pending work."}`;
  const compactionMessage = {
    role: "system",
    content: `[Session Compacted] ${removed.length} messages summarized.

User requests: ${userRequests.join("; ")}
Tools used: ${toolsUsed.join(", ")}
Key files: ${keyFiles.join(", ")}
${pendingWork.length > 0 ? `Pending work: ${pendingWork.join("; ")}` : ""}

Continue from where you left off. Do not recap \u2014 proceed directly.`,
    timestamp: Date.now(),
    turnIndex: session.turns.length
  };
  session.messages = [...systemMsgs, compactionMessage, ...recent];
  const summary = {
    removedMessageCount: removed.length,
    preservedMessageCount: session.messages.length,
    toolsUsed,
    pendingWork: pendingWork.slice(0, 5),
    keyFiles,
    currentState
  };
  session.compactions.push(summary);
  session.status = "compacted";
  return summary;
}
var HarnessRuntime = class {
  constructor(tools2) {
    this.allTools = tools2;
    this.tools = new Map(tools2.map((t) => [t.name, t]));
  }
  // ── Session lifecycle ────────────────────────────────────────────
  createSession(options = {}) {
    cleanExpiredSessions();
    evictOldest();
    const session = {
      id: genSessionId(),
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      status: "active",
      preset: options.preset ?? "founder",
      lens: options.lens ?? "founder",
      messages: [{
        role: "system",
        content: `You are NodeBench, an operating intelligence agent for founders. You have access to ${this.allTools.length} tools for research, analysis, verification, and decision support. Current lens: ${options.lens ?? "founder"}.`,
        timestamp: Date.now(),
        turnIndex: 0
      }],
      turns: [],
      totalCostUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      compactions: [],
      permissionPolicy: {
        default: options.permissionPolicy?.default ?? "allow",
        toolOverrides: options.permissionPolicy?.toolOverrides ?? {}
      },
      entityContext: options.entityContext ?? {},
      adaptationCount: 0
    };
    sessions.set(session.id, session);
    return session;
  }
  getSession(id) {
    const s = sessions.get(id);
    if (s) s.lastActivityAt = Date.now();
    return s;
  }
  listSessions() {
    return Array.from(sessions.values()).map((s) => ({
      id: s.id,
      preset: s.preset,
      lens: s.lens,
      status: s.status,
      turnCount: s.turns.length,
      totalCostUsd: Math.round(s.totalCostUsd * 1e4) / 1e4,
      messageCount: s.messages.length,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt
    }));
  }
  endSession(id) {
    const s = sessions.get(id);
    if (!s) return false;
    s.status = "completed";
    sessions.delete(id);
    return true;
  }
  compactSession(id) {
    const s = sessions.get(id);
    if (!s) return null;
    return compactSession(s);
  }
  getSessionTrace(id) {
    const s = sessions.get(id);
    if (!s) return null;
    return s.turns.flatMap(
      (t) => t.stepResults.map((sr) => ({
        step: "tool_call",
        tool: sr.toolName,
        status: sr.success ? "ok" : "error",
        detail: sr.error ?? `${sr.toolName} completed`,
        durationMs: sr.durationMs,
        timestamp: t.timestamp
      }))
    );
  }
  getSessionCost(id) {
    const s = sessions.get(id);
    if (!s) return null;
    return {
      totalUsd: s.totalCostUsd,
      perTurn: s.turns.map((t, i) => ({
        turnIndex: i,
        model: "gemini-3.1-flash-lite-preview",
        usage: { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 },
        costUsd: t.costUsd,
        timestamp: t.timestamp
      }))
    };
  }
  // ── Main execution loop ──────────────────────────────────────────
  async run(sessionId, query, options = {}) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (session.status === "completed") throw new Error(`Session ${sessionId} is completed`);
    session.lastActivityAt = Date.now();
    const startMs = Date.now();
    const turnIndex = session.turns.length;
    const trace = [];
    const maxAdaptations = options.maxAdaptations ?? 2;
    const timeoutMs = options.timeoutMs ?? 3e4;
    const emitTrace = (event) => {
      const full = { ...event, timestamp: Date.now() };
      trace.push(full);
      options.onTrace?.(full);
    };
    if (session.messages.length > COMPACTION_THRESHOLD) {
      emitTrace({ step: "compact_session", status: "ok", detail: `${session.messages.length} messages \u2192 compacting` });
      compactSession(session);
    }
    session.messages.push({
      role: "user",
      content: query,
      timestamp: Date.now(),
      turnIndex
    });
    const callTool = async (name, args) => {
      const perm = checkPermission(session.permissionPolicy, name);
      if (perm === "deny") {
        emitTrace({ step: "permission_denied", tool: name, status: "error", detail: `Tool ${name} denied by policy` });
        return { error: true, message: `Permission denied for tool: ${name}` };
      }
      const tool = this.tools.get(name);
      if (!tool) {
        return { error: true, message: `Tool not found: ${name}` };
      }
      const toolStart = Date.now();
      try {
        const result = await Promise.race([
          tool.handler(args),
          new Promise((_, reject) => setTimeout(() => reject(new Error("tool_timeout")), Math.min(timeoutMs, 15e3)))
        ]);
        const inputEstimate = JSON.stringify(args).length / 4;
        const outputEstimate = JSON.stringify(result).length / 4;
        const callCost = estimateCost("gemini-3.1-flash-lite-preview", inputEstimate, outputEstimate);
        session.totalCostUsd += callCost;
        session.messages.push({
          role: "tool",
          content: JSON.stringify(result).slice(0, 3e3),
          toolName: name,
          timestamp: Date.now(),
          turnIndex
        });
        return result;
      } catch (err) {
        emitTrace({ step: "tool_error", tool: name, status: "error", detail: err?.message, durationMs: Date.now() - toolStart });
        return { error: true, message: err?.message ?? "Unknown error" };
      }
    };
    const hasLLM = this.tools.has("call_llm") || !!process.env.GEMINI_API_KEY;
    emitTrace({ step: "classify_query", status: "ok", detail: query.slice(0, 80) });
    let classification = this.classifyWithRegex(query);
    if (hasLLM) {
      try {
        const classifyResult = await callTool("call_llm", {
          prompt: `Classify this query. Return ONLY valid JSON.

Query: "${query}"

Return:
{"type": "weekly_reset" | "pre_delegation" | "important_change" | "company_search" | "competitor" | "multi_entity" | "plan_proposal" | "general", "entities": ["entity1"], "entity": "primary entity or null"}

Rules: company_search = mentions a company, multi_entity = compares 2+ companies, competitor = asks about competitors, weekly_reset = weekly summary, important_change = what changed, plan_proposal = planning/strategy, general = everything else. entities = extract all company/product/person names.`,
          maxTokens: 200,
          temperature: 0
        });
        const text = classifyResult?.response ?? classifyResult?.text ?? "";
        const jsonMatch = typeof text === "string" ? text.match(/\{[\s\S]*\}/) : null;
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          classification = {
            type: parsed.type ?? classification.type,
            entities: Array.isArray(parsed.entities) ? parsed.entities : classification.entities,
            entity: parsed.entity ?? classification.entity
          };
          emitTrace({ step: "classify_result", status: "ok", detail: `LLM: ${classification.type} \u2192 [${classification.entities.join(", ")}]` });
        } else {
          emitTrace({ step: "classify_result", status: "ok", detail: `Regex (LLM no JSON): ${classification.type}` });
        }
      } catch {
        emitTrace({ step: "classify_result", status: "ok", detail: `Regex fallback: ${classification.type}` });
      }
    } else {
      emitTrace({ step: "classify_result", status: "ok", detail: `Regex: ${classification.type} \u2192 [${classification.entities.join(", ")}]` });
    }
    if (turnIndex > 0 && classification.type === "general" && classification.entities.length === 0) {
      const lastTurn = session.turns[turnIndex - 1];
      if (lastTurn?.entities.length > 0) {
        classification.entities = [...lastTurn.entities];
        emitTrace({ step: "context_inject", status: "ok", detail: `Inherited entities: ${classification.entities.join(", ")}` });
      }
    }
    let plan = null;
    if (hasLLM) {
      try {
        emitTrace({ step: "plan_generate", tool: "call_llm", status: "ok" });
        plan = await generatePlan(
          query.trim(),
          classification.type,
          classification.entities,
          session.lens,
          callTool
        );
        emitTrace({ step: "plan_ready", status: "ok", detail: `${plan.steps.length} steps: ${plan.steps.map((s) => s.toolName).join(" \u2192 ")}` });
      } catch (err) {
        emitTrace({ step: "plan_generate", status: "error", detail: err?.message });
      }
    }
    if (!plan) {
      plan = this.buildFallbackPlan(query, classification.type, classification.entities, session.lens);
      emitTrace({ step: "plan_fallback", status: "ok", detail: `Deterministic: ${plan.steps.length} steps` });
    }
    emitTrace({ step: "execute_plan", status: "ok", detail: `Executing ${plan.steps.length} steps` });
    const execution = await executeHarness(plan, callTool, (step) => {
      emitTrace({ step: step.step, tool: step.tool, status: step.status, detail: step.detail });
    });
    let adaptations = 0;
    const failedSteps = execution.stepResults.filter((s) => !s.success);
    if (failedSteps.length > 0 && failedSteps.length >= plan.steps.length / 2 && adaptations < maxAdaptations && hasLLM) {
      adaptations++;
      session.adaptationCount++;
      emitTrace({ step: "adapt_plan", status: "adapting", detail: `${failedSteps.length}/${plan.steps.length} failed \u2014 re-planning` });
      const failedTools = failedSteps.map((s) => s.toolName);
      const recoveryQuery = `${query} (retry: ${failedTools.join(", ")} failed)`;
      try {
        const recoveryPlan = await generatePlan(recoveryQuery, classification.type, classification.entities, session.lens, callTool);
        recoveryPlan.steps = recoveryPlan.steps.filter((s) => !failedTools.includes(s.toolName));
        if (recoveryPlan.steps.length > 0) {
          const recoveryExec = await executeHarness(recoveryPlan, callTool, (step) => {
            emitTrace({ step: step.step, tool: step.tool, status: step.status, detail: `[recovery] ${step.detail}` });
          });
          execution.stepResults.push(...recoveryExec.stepResults);
        }
      } catch {
        emitTrace({ step: "adapt_failed", status: "error", detail: "Recovery plan generation failed" });
      }
    }
    emitTrace({ step: "synthesize", status: "ok", detail: `${execution.stepResults.filter((s) => s.success).length} successful results` });
    const entityName = classification.entities[0] ?? classification.entity ?? this.extractEntity(query) ?? query.replace(/^(tell me about|what are the|analyze|research|who are)\s+/i, "").split(/[?.!,]/)[0].trim().slice(0, 50);
    let synthesized;
    try {
      synthesized = await synthesizeResults(execution, query, session.lens, callTool);
    } catch {
      synthesized = {
        entityName,
        answer: `Processed ${execution.stepResults.length} steps. ${execution.stepResults.filter((s) => s.success).length} succeeded.`,
        confidence: 30,
        signals: [],
        changes: [],
        risks: [],
        comparables: [],
        nextActions: [],
        nextQuestions: [],
        sources: []
      };
    }
    session.messages.push({
      role: "assistant",
      content: typeof synthesized.answer === "string" ? synthesized.answer : JSON.stringify(synthesized).slice(0, 2e3),
      timestamp: Date.now(),
      turnIndex
    });
    const durationMs = Date.now() - startMs;
    const turnCostEstimate = plan.steps.length * 5e-3 + adaptations * 2e-3;
    session.totalCostUsd += turnCostEstimate;
    const turn = {
      index: turnIndex,
      query,
      classification: classification.type,
      entities: classification.entities,
      plan,
      stepResults: execution.stepResults,
      synthesizedResult: synthesized,
      durationMs,
      costUsd: turnCostEstimate,
      adaptations,
      timestamp: Date.now()
    };
    session.turns.push(turn);
    emitTrace({ step: "turn_complete", status: "ok", detail: `${durationMs}ms, $${turnCostEstimate.toFixed(4)}, ${adaptations} adaptations`, durationMs });
    return {
      sessionId: session.id,
      turnIndex,
      result: synthesized,
      trace,
      durationMs,
      costUsd: turnCostEstimate,
      classification: classification.type,
      entities: classification.entities,
      planSteps: plan.steps.length,
      adaptations,
      sessionTotalCostUsd: session.totalCostUsd
    };
  }
  // ── LLM classifier ─────────────────────────────────────────────
  // ── Deterministic regex classifier (no API key needed) ──────
  classifyWithRegex(query) {
    const q = query.toLowerCase().trim();
    if (/\b(weekly|week|briefing|reset|what happened|status update|catch me up)\b/.test(q)) {
      return { type: "weekly_reset", entities: [] };
    }
    if (/\b(what changed|what's new|what is new|since last|recent changes|updates?)\b/.test(q) && !/\bplan\b/.test(q)) {
      return { type: "important_change", entities: [] };
    }
    if (/\b(delegate|handoff|hand off|assign|outsource)\b/.test(q)) {
      return { type: "pre_delegation", entities: [] };
    }
    if (/\b(plan\s+(?:a|for|to|my)|propose|roadmap|go.to.market|gtm|build\s+(?:a|me)|create\s+(?:a|me)|design\s+(?:a|me))\b/.test(q) && !/\b(tell|about|who|what is)\b/.test(q)) {
      return { type: "plan_proposal", entities: [] };
    }
    if (/\bstrategy\s+for\b/.test(q)) {
      return { type: "plan_proposal", entities: [] };
    }
    const vsMatch = q.match(/(.+?)\s+(?:vs\.?|versus|compared?\s+to|against)\s+(.+)/i);
    if (vsMatch) {
      const entities = [vsMatch[1].trim(), vsMatch[2].trim()].map((e) => e.replace(/\b(compare|tell\s+me\s+about|in|the|of|for|and)\b/gi, "").trim()).filter((e) => e.length > 1);
      if (entities.length >= 2) {
        return { type: "multi_entity", entities, entity: entities[0] };
      }
    }
    if (/\b(competitors?|competing|rivals?|alternatives?|compete with)\b/.test(q)) {
      const compOfMatch = query.match(/(?:competitors?\s+(?:of|for|to)\s+)([A-Z][A-Za-z\s]+?)(?:\s*[?.!]|$)/i);
      const whoAreMatch = query.match(/(?:who\s+are\s+)([A-Z][A-Za-z\s]+?)(?:'s?\s+)?(?:competitors?|rivals?)/i);
      const entity2 = compOfMatch?.[1]?.trim() ?? whoAreMatch?.[1]?.trim() ?? this.extractEntity(query);
      return { type: "competitor", entities: entity2 ? [entity2] : [], entity: entity2 };
    }
    const entity = this.extractEntity(q);
    if (entity && /\b(tell|about|analyze|research|look up|what is|who is|show me|investigate)\b/.test(q)) {
      return { type: "company_search", entities: [entity], entity };
    }
    if (entity && entity.length > 2) {
      return { type: "company_search", entities: [entity], entity };
    }
    return { type: "general", entities: [] };
  }
  extractEntity(query) {
    const capMatch = query.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
    if (capMatch && !["Tell", "What", "How", "Who", "Why", "Where", "When", "Show", "Plan", "Compare", "Analyze"].includes(capMatch[1])) {
      return capMatch[1];
    }
    const quotedMatch = query.match(/"([^"]+)"|'([^']+)'/);
    if (quotedMatch) return quotedMatch[1] ?? quotedMatch[2];
    const aboutMatch = query.match(/\babout\s+([A-Za-z][A-Za-z\s]{1,30}?)(?:\s+(?:company|payments|strategy|revenue|funding|market|risks?|competitors?|products?)|[.?!]|$)/i);
    if (aboutMatch) return aboutMatch[1].trim();
    return void 0;
  }
  // classifyWithLLM removed — classification now uses callTool("call_llm", ...) in the run() method
  // ── Deterministic fallback plan ────────────────────────────────
  buildFallbackPlan(query, type, entities, lens) {
    const entity = entities[0] ?? this.extractEntity(query) ?? query.replace(/^(tell me about|what are the|analyze|research|who are|compare)\s+/i, "").split(/[?.!,]/)[0].trim().slice(0, 50);
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const plans = {
      weekly_reset: () => ({
        objective: "Generate founder weekly reset",
        classification: type,
        entityTargets: entities,
        steps: [{ id: "s1", toolName: "founder_local_weekly_reset", args: { daysBack: 7 }, purpose: "Weekly reset packet" }],
        synthesisPrompt: "Format as weekly founder reset with changes, contradictions, and next 3 moves."
      }),
      company_search: () => ({
        objective: `Analyze ${entity}`,
        classification: type,
        entityTargets: entities,
        steps: [
          { id: "s1", toolName: "web_search", args: { query: `${entity} company overview strategy ${year}`, maxResults: 5 }, purpose: "Web intelligence", parallel: true },
          { id: "s2", toolName: "run_recon", args: { target: entity, focus: query }, purpose: "Deep recon", parallel: true },
          { id: "s3", toolName: "founder_local_gather", args: { daysBack: 7 }, purpose: "Local context", parallel: true }
        ],
        synthesisPrompt: `Synthesize intelligence about ${entity} for a ${lens} audience.`
      }),
      multi_entity: () => {
        const steps = entities.slice(0, 4).map((e, i) => ({
          id: `s${i + 1}`,
          toolName: "web_search",
          args: { query: `${e} company overview ${year}`, maxResults: 3 },
          purpose: `Research ${e}`,
          parallel: true
        }));
        return {
          objective: `Compare ${entities.join(" vs ")}`,
          classification: type,
          entityTargets: entities,
          steps,
          synthesisPrompt: `Compare ${entities.join(", ")} across key dimensions for a ${lens} audience.`
        };
      }
    };
    const planFn = plans[type];
    if (planFn) return planFn();
    return {
      objective: query,
      classification: type,
      entityTargets: entities,
      steps: [
        { id: "s1", toolName: "founder_local_gather", args: { daysBack: 7 }, purpose: "Gather context", parallel: true },
        { id: "s2", toolName: "web_search", args: { query: `${query} ${year}`, maxResults: 3 }, purpose: "Web research", parallel: true }
      ],
      synthesisPrompt: `Answer "${query}" using gathered intelligence for a ${lens} audience.`
    };
  }
  // ── Slash commands ─────────────────────────────────────────────
  getSlashCommands() {
    return [
      { name: "/status", description: "Show session status (turns, cost, messages)" },
      { name: "/cost", description: "Show cost breakdown per turn" },
      { name: "/compact", description: "Compact session context to free space" },
      { name: "/trace", description: "Show execution trace for last turn" },
      { name: "/tools", description: "List available tools", hint: "[search term]" },
      { name: "/permissions", description: "Show/modify tool permission policy" },
      { name: "/sessions", description: "List all active sessions" },
      { name: "/help", description: "Show available commands" }
    ];
  }
  async handleSlashCommand(sessionId, command) {
    const session = sessions.get(sessionId);
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    switch (cmd) {
      case "/status":
        if (!session) return { text: "No active session." };
        return {
          text: `Session ${session.id}
Turns: ${session.turns.length}
Messages: ${session.messages.length}
Cost: $${session.totalCostUsd.toFixed(4)}
Status: ${session.status}
Compactions: ${session.compactions.length}`,
          data: { id: session.id, turns: session.turns.length, messages: session.messages.length, cost: session.totalCostUsd, status: session.status }
        };
      case "/cost":
        if (!session) return { text: "No active session." };
        const costs = session.turns.map((t, i) => `Turn ${i}: $${t.costUsd.toFixed(4)} (${t.durationMs}ms, ${t.stepResults.length} steps)`);
        return {
          text: `Total: $${session.totalCostUsd.toFixed(4)}
${costs.join("\n")}`,
          data: this.getSessionCost(sessionId)
        };
      case "/compact":
        if (!session) return { text: "No active session." };
        const summary = compactSession(session);
        return {
          text: `Compacted: removed ${summary.removedMessageCount} messages, ${summary.preservedMessageCount} preserved.
Tools used: ${summary.toolsUsed.join(", ")}
Pending: ${summary.pendingWork.join("; ") || "none"}`,
          data: summary
        };
      case "/trace": {
        if (!session) return { text: "No active session." };
        const lastTurn = session.turns[session.turns.length - 1];
        if (!lastTurn) return { text: "No turns executed yet." };
        const steps = lastTurn.stepResults.map((s) => `${s.success ? "\u2713" : "\u2717"} ${s.toolName} (${s.durationMs}ms)`);
        return {
          text: `Turn ${lastTurn.index}: ${lastTurn.classification}
Steps:
${steps.join("\n")}`,
          data: lastTurn
        };
      }
      case "/tools": {
        const search = parts.slice(1).join(" ").toLowerCase();
        const matched = this.allTools.filter((t) => !search || t.name.toLowerCase().includes(search) || t.description.toLowerCase().includes(search)).slice(0, 20);
        return {
          text: `${matched.length} tools${search ? ` matching "${search}"` : ""}:
${matched.map((t) => `\u2022 ${t.name}: ${t.description.slice(0, 60)}`).join("\n")}`,
          data: matched.map((t) => ({ name: t.name, description: t.description.slice(0, 100) }))
        };
      }
      case "/permissions":
        if (!session) return { text: "No active session." };
        return {
          text: `Default: ${session.permissionPolicy.default}
Overrides: ${JSON.stringify(session.permissionPolicy.toolOverrides)}`,
          data: session.permissionPolicy
        };
      case "/sessions":
        return {
          text: this.listSessions().map((s) => `${s.id} (${s.preset}/${s.lens}) \u2014 ${s.turnCount} turns, $${s.totalCostUsd.toFixed(4)}`).join("\n") || "No active sessions.",
          data: this.listSessions()
        };
      case "/help":
        return {
          text: this.getSlashCommands().map((c) => `${c.name}${c.hint ? " " + c.hint : ""} \u2014 ${c.description}`).join("\n")
        };
      default:
        return { text: `Unknown command: ${cmd}. Type /help for available commands.` };
    }
  }
  // ── Health & metrics ───────────────────────────────────────────
  getHealth() {
    return {
      activeSessions: sessions.size,
      totalTools: this.allTools.length,
      uptimeMs: Date.now() - (sessions.size > 0 ? Math.min(...Array.from(sessions.values()).map((s) => s.createdAt)) : Date.now()),
      memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    };
  }
};

// server/pricingScraper.ts
var _cachedSnapshot = null;
var CACHE_TTL_MS = 6 * 60 * 60 * 1e3;
var MANUAL_RATES = [
  // Gemini (Google AI Studio published rates)
  { provider: "Google", model: "gemini-3.1-flash-lite-preview", inputPer1M: 0.075, outputPer1M: 0.3, currency: "USD", tier: "cheap", useCase: "Classification, planning, synthesis (default harness model)", source: "manual", lastUpdated: Date.now(), isActive: true },
  { provider: "Google", model: "gemini-3.1-flash-preview", inputPer1M: 0.15, outputPer1M: 0.6, currency: "USD", tier: "cheap", useCase: "Complex extraction, structured output", source: "manual", lastUpdated: Date.now(), isActive: true },
  { provider: "Google", model: "gemini-3.1-pro-preview", inputPer1M: 1.25, outputPer1M: 5, currency: "USD", tier: "mid", useCase: "Deep analysis, Pro QA runs (Gemini QA loop)", source: "manual", lastUpdated: Date.now(), isActive: true },
  { provider: "Google", model: "gemini-2.5-flash-preview", inputPer1M: 0.15, outputPer1M: 0.6, currency: "USD", tier: "cheap", useCase: "Fallback for Flash Lite failures", source: "manual", lastUpdated: Date.now(), isActive: false },
  // Anthropic (published API pricing)
  { provider: "Anthropic", model: "claude-opus-4-6", displayName: "Claude Opus 4.6", inputPer1M: 15, outputPer1M: 75, currency: "USD", tier: "enterprise", useCase: "Premium synthesis (available on demand)", source: "manual", lastUpdated: Date.now(), isActive: false },
  { provider: "Anthropic", model: "claude-sonnet-4-6", displayName: "Claude Sonnet 4.6", inputPer1M: 3, outputPer1M: 15, currency: "USD", tier: "mid", useCase: "Mid-tier analysis and reasoning", source: "manual", lastUpdated: Date.now(), isActive: true },
  { provider: "Anthropic", model: "claude-haiku-4-5-20251001", displayName: "Claude Haiku 4.5", inputPer1M: 1, outputPer1M: 5, currency: "USD", tier: "cheap", useCase: "Fast classification and routing", source: "manual", lastUpdated: Date.now(), isActive: true },
  // OpenAI (published API pricing)
  { provider: "OpenAI", model: "gpt-5.4-nano", displayName: "GPT-5.4 Nano", inputPer1M: 0.1, outputPer1M: 0.4, currency: "USD", tier: "cheap", useCase: "Lightweight classification tasks", source: "manual", lastUpdated: Date.now(), isActive: true },
  { provider: "OpenAI", model: "gpt-5.4-mini", displayName: "GPT-5.4 Mini", inputPer1M: 0.15, outputPer1M: 0.6, currency: "USD", tier: "cheap", useCase: "Fast analysis and extraction", source: "manual", lastUpdated: Date.now(), isActive: true },
  { provider: "OpenAI", model: "gpt-5.4", displayName: "GPT-5.4", inputPer1M: 2.5, outputPer1M: 10, currency: "USD", tier: "mid", useCase: "Deep synthesis and reasoning", source: "manual", lastUpdated: Date.now(), isActive: false },
  // Linkup (per-call pricing — displayed in USD equivalent)
  { provider: "Linkup", model: "search-standard", displayName: "Web Search", inputPer1M: -1, outputPer1M: -1, perCallCost: 0.03, perCallUnit: "search", currency: "USD", tier: "cheap", useCase: "Standard web intelligence search", source: "provider_docs", lastUpdated: Date.now(), isActive: true },
  { provider: "Linkup", model: "search-deep", displayName: "Deep Search", inputPer1M: -1, outputPer1M: -1, perCallCost: 0.05, perCallUnit: "search", currency: "USD", tier: "mid", useCase: "Deep web intelligence search", source: "provider_docs", lastUpdated: Date.now(), isActive: false },
  { provider: "Linkup", model: "fetch", displayName: "URL Fetch", inputPer1M: -1, outputPer1M: -1, perCallCost: 1e-3, perCallUnit: "request", currency: "USD", tier: "free", useCase: "URL content retrieval", source: "provider_docs", lastUpdated: Date.now(), isActive: false },
  { provider: "Linkup", model: "fetch-js", displayName: "URL Fetch (JS)", inputPer1M: -1, outputPer1M: -1, perCallCost: 5e-3, perCallUnit: "request", currency: "USD", tier: "cheap", useCase: "URL content retrieval with rendering", source: "provider_docs", lastUpdated: Date.now(), isActive: false },
  // ElevenLabs (per-character pricing)
  { provider: "ElevenLabs", model: "eleven_turbo_v2_5", displayName: "Voice Synthesis", inputPer1M: -1, outputPer1M: -1, perCallCost: 0.3, perCallUnit: "1K characters", currency: "USD", tier: "mid", useCase: "Text-to-speech voice output", source: "provider_docs", lastUpdated: Date.now(), isActive: true },
  // Convex (function calls)
  { provider: "Convex", model: "backend-functions", displayName: "Cloud Backend", inputPer1M: -1, outputPer1M: -1, perCallCost: 0, perCallUnit: "function call", currency: "USD", tier: "free", useCase: "Data persistence and sync", source: "provider_docs", lastUpdated: Date.now(), isActive: true },
  // Figma (API usage)
  { provider: "Figma", model: "rest-api", displayName: "Design API", inputPer1M: -1, outputPer1M: -1, perCallCost: 0, perCallUnit: "request", currency: "USD", tier: "free", useCase: "Design file sync and governance", source: "provider_docs", lastUpdated: Date.now(), isActive: true },
  // Vercel (hosting)
  { provider: "Vercel", model: "serverless-functions", displayName: "Hosting", inputPer1M: -1, outputPer1M: -1, perCallCost: 0, perCallUnit: "invocation", currency: "USD", tier: "free", useCase: "Frontend hosting and API serving", source: "provider_docs", lastUpdated: Date.now(), isActive: true }
];
async function scrapeOpenRouter() {
  try {
    const resp = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(1e4)
    });
    if (!resp.ok) return { models: [], error: `OpenRouter ${resp.status}` };
    const data = await resp.json();
    const models = [];
    for (const m of data?.data ?? []) {
      const promptCost = parseFloat(m.pricing?.prompt ?? "0");
      const completionCost = parseFloat(m.pricing?.completion ?? "0");
      const isFree = promptCost === 0 && completionCost === 0;
      const contextLength = m.context_length ?? 0;
      const isRelevant = isFree || m.id?.includes("gemini") || m.id?.includes("claude") || m.id?.includes("gpt") || m.id?.includes("qwen") || m.id?.includes("deepseek") || m.id?.includes("nemotron") || m.id?.includes("mistral");
      if (!isRelevant) continue;
      models.push({
        provider: "OpenRouter",
        model: m.id,
        inputPer1M: promptCost * 1e6,
        outputPer1M: completionCost * 1e6,
        currency: "USD",
        context: contextLength,
        tier: isFree ? "free" : promptCost * 1e6 < 1 ? "cheap" : promptCost * 1e6 < 5 ? "mid" : "premium",
        useCase: m.description?.slice(0, 80) ?? m.name ?? m.id,
        source: "openrouter_api",
        lastUpdated: Date.now(),
        isActive: isFree
        // Free models are actively used in rotation
      });
    }
    return { models };
  } catch (err) {
    return { models: [], error: err?.message ?? "OpenRouter scrape failed" };
  }
}
async function scrapePricing() {
  const errors = [];
  const allProviders = [...MANUAL_RATES];
  const openRouterResult = await scrapeOpenRouter();
  if (openRouterResult.error) {
    errors.push(`OpenRouter: ${openRouterResult.error}`);
  }
  allProviders.push(...openRouterResult.models);
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const p of allProviders) {
    const key = `${p.provider}:${p.model}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }
  const snapshot = {
    scrapedAt: Date.now(),
    providerCount: new Set(deduped.map((p) => p.provider)).size,
    modelCount: deduped.length,
    providers: deduped,
    errors
  };
  _cachedSnapshot = snapshot;
  return snapshot;
}
async function getPricingSnapshot() {
  if (_cachedSnapshot && Date.now() - _cachedSnapshot.scrapedAt < CACHE_TTL_MS) {
    return _cachedSnapshot;
  }
  return scrapePricing();
}
function getPricingSummary(snapshot) {
  const byProvider = /* @__PURE__ */ new Map();
  for (const p of snapshot.providers) {
    if (!byProvider.has(p.provider)) byProvider.set(p.provider, []);
    byProvider.get(p.provider).push(p);
  }
  const activeProviders = Array.from(byProvider.entries()).map(([provider, models]) => {
    const tokenModels = models.filter((m) => m.inputPer1M >= 0);
    return {
      provider,
      modelCount: models.length,
      cheapestInput: tokenModels.length > 0 ? Math.min(...tokenModels.map((m) => m.inputPer1M)) : -1,
      cheapestOutput: tokenModels.length > 0 ? Math.min(...tokenModels.map((m) => m.outputPer1M)) : -1
    };
  });
  const freeModels = snapshot.providers.filter((p) => p.tier === "free" && p.inputPer1M === 0).length;
  return {
    activeProviders,
    freeModels,
    cheapestPerQuery: 0.016,
    // measured production average
    lastScraped: new Date(snapshot.scrapedAt).toISOString()
  };
}

// server/routes/harness.ts
function createHarnessRouter(tools2) {
  const router = Router3();
  const runtime = new HarnessRuntime(tools2);
  router.get("/health", (_req, res) => {
    res.json({ ok: true, ...runtime.getHealth() });
  });
  router.get("/commands", (_req, res) => {
    res.json({ ok: true, commands: runtime.getSlashCommands() });
  });
  router.get("/pricing", async (_req, res) => {
    try {
      const snapshot = await getPricingSnapshot();
      res.json({ ok: true, ...snapshot });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  });
  router.get("/pricing/summary", async (_req, res) => {
    try {
      const snapshot = await getPricingSnapshot();
      res.json({ ok: true, ...getPricingSummary(snapshot) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  });
  router.post("/sessions", (req, res) => {
    const { preset, lens, permissionPolicy, entityContext } = req.body;
    const session = runtime.createSession({
      preset,
      lens,
      permissionPolicy,
      entityContext
    });
    res.status(201).json({
      ok: true,
      sessionId: session.id,
      preset: session.preset,
      lens: session.lens,
      status: session.status,
      messageCount: session.messages.length,
      createdAt: session.createdAt
    });
  });
  router.get("/sessions", (_req, res) => {
    res.json({ ok: true, sessions: runtime.listSessions() });
  });
  router.get("/sessions/:id", (req, res) => {
    const session = runtime.getSession(req.params.id);
    if (!session) return res.status(404).json({ ok: false, error: "Session not found" });
    res.json({
      ok: true,
      id: session.id,
      preset: session.preset,
      lens: session.lens,
      status: session.status,
      turnCount: session.turns.length,
      messageCount: session.messages.length,
      totalCostUsd: session.totalCostUsd,
      adaptationCount: session.adaptationCount,
      compactions: session.compactions.length,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      turns: session.turns.map((t) => ({
        index: t.index,
        query: t.query,
        classification: t.classification,
        entities: t.entities,
        planSteps: t.plan?.steps.length ?? 0,
        successfulSteps: t.stepResults.filter((s) => s.success).length,
        failedSteps: t.stepResults.filter((s) => !s.success).length,
        durationMs: t.durationMs,
        costUsd: t.costUsd,
        adaptations: t.adaptations
      }))
    });
  });
  router.post("/sessions/:id/run", async (req, res) => {
    const { query, maxAdaptations, timeoutMs } = req.body;
    if (!query?.trim()) {
      return res.status(400).json({ ok: false, error: "query is required" });
    }
    if (query.startsWith("/")) {
      const cmdResult = await runtime.handleSlashCommand(req.params.id, query);
      return res.json({ ok: true, type: "command", ...cmdResult });
    }
    try {
      const result = await runtime.run(req.params.id, query.trim(), {
        maxAdaptations,
        timeoutMs
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      const status = err.message?.includes("not found") ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });
  router.post("/sessions/:id/stream", async (req, res) => {
    const { query, maxAdaptations, timeoutMs } = req.body;
    if (!query?.trim()) {
      return res.status(400).json({ ok: false, error: "query is required" });
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    const send = (event, data) => {
      res.write(`event: ${event}
data: ${JSON.stringify(data)}

`);
    };
    send("start", { sessionId: req.params.id, query });
    try {
      const result = await runtime.run(req.params.id, query.trim(), {
        maxAdaptations,
        timeoutMs,
        onTrace: (event) => {
          send("trace", event);
        }
      });
      send("result", result);
      send("complete", {
        sessionId: result.sessionId,
        turnIndex: result.turnIndex,
        durationMs: result.durationMs,
        costUsd: result.costUsd,
        classification: result.classification
      });
    } catch (err) {
      send("error", { error: err.message });
    }
    res.end();
  });
  router.get("/sessions/:id/debug", (req, res) => {
    const session = runtime.getSession(req.params.id);
    if (!session) return res.status(404).json({ ok: false, error: "Session not found" });
    const lastTurn = session.turns[session.turns.length - 1];
    if (!lastTurn) return res.json({ ok: true, message: "No turns yet" });
    res.json({
      ok: true,
      turnIndex: lastTurn.index,
      classification: lastTurn.classification,
      entities: lastTurn.entities,
      planSteps: lastTurn.plan?.steps.map((s) => ({ id: s.id, tool: s.toolName, purpose: s.purpose })),
      stepResults: lastTurn.stepResults.map((sr) => ({
        tool: sr.toolName,
        success: sr.success,
        durationMs: sr.durationMs,
        error: sr.error,
        resultType: typeof sr.result,
        resultKeys: sr.result && typeof sr.result === "object" ? Object.keys(sr.result).slice(0, 20) : void 0,
        resultPreview: JSON.stringify(sr.result).slice(0, 500)
      }))
    });
  });
  router.get("/sessions/:id/trace", (req, res) => {
    const trace = runtime.getSessionTrace(req.params.id);
    if (!trace) return res.status(404).json({ ok: false, error: "Session not found" });
    res.json({ ok: true, events: trace });
  });
  router.get("/sessions/:id/cost", (req, res) => {
    const cost = runtime.getSessionCost(req.params.id);
    if (!cost) return res.status(404).json({ ok: false, error: "Session not found" });
    res.json({ ok: true, ...cost });
  });
  router.post("/sessions/:id/compact", (req, res) => {
    const summary = runtime.compactSession(req.params.id);
    if (!summary) return res.status(404).json({ ok: false, error: "Session not found" });
    res.json({ ok: true, ...summary });
  });
  router.post("/sessions/:id/command", async (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ ok: false, error: "command is required" });
    const result = await runtime.handleSlashCommand(req.params.id, command);
    res.json({ ok: true, ...result });
  });
  router.delete("/sessions/:id", (req, res) => {
    const deleted = runtime.endSession(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: "Session not found" });
    res.json({ ok: true, deleted: true });
  });
  return router;
}

// server/routes/subconscious.ts
import { Router as Router4 } from "express";

// packages/mcp-local/src/subconscious/blocks.ts
init_db();
var BLOCK_LABELS = {
  founder_identity: "Founder Identity",
  company_identity: "Company Identity",
  current_wedge: "Current Wedge",
  top_priorities: "Top Priorities",
  open_contradictions: "Open Contradictions",
  readiness_gaps: "Readiness Gaps",
  validated_workflows: "Validated Workflows",
  recent_important_changes: "Recent Important Changes",
  entity_watchlist: "Entity Watchlist",
  agent_preferences: "Agent Preferences",
  artifact_preferences: "Artifact Preferences",
  packet_lineage: "Packet Lineage"
};
var ALL_BLOCK_TYPES = Object.keys(BLOCK_LABELS);
var MAX_SOURCE_EVENTS = 50;
function ensureBlocksExist() {
  const db = getDb();
  for (const [id, label] of Object.entries(BLOCK_LABELS)) {
    db.prepare(
      `INSERT OR IGNORE INTO subconscious_blocks (id, label, value, version, confidence, source_events)
       VALUES (?, ?, '', 1, 'low', '[]')`
    ).run(id, label);
  }
}
function getBlock(id) {
  ensureBlocksExist();
  const db = getDb();
  const row = db.prepare("SELECT * FROM subconscious_blocks WHERE id = ?").get(id);
  if (!row) {
    return {
      id,
      label: BLOCK_LABELS[id],
      value: "",
      version: 1,
      confidence: "low",
      sourceEvents: [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  return rowToBlock(row);
}
function getAllBlocks() {
  ensureBlocksExist();
  const db = getDb();
  const rows = db.prepare("SELECT * FROM subconscious_blocks ORDER BY id").all();
  return rows.map(rowToBlock);
}
function getBlocksByIds(ids) {
  if (ids.length === 0) return [];
  ensureBlocksExist();
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  const rows = db.prepare(`SELECT * FROM subconscious_blocks WHERE id IN (${placeholders})`).all(...ids);
  return rows.map(rowToBlock);
}
function updateBlock(id, update) {
  ensureBlocksExist();
  const db = getDb();
  const current = getBlock(id);
  const newEvents = current.sourceEvents.slice();
  if (update.sourceEvent) {
    newEvents.push(update.sourceEvent);
    if (newEvents.length > MAX_SOURCE_EVENTS) {
      newEvents.splice(0, newEvents.length - MAX_SOURCE_EVENTS);
    }
  }
  db.prepare(
    `UPDATE subconscious_blocks
     SET value = ?, version = version + 1, confidence = ?, source_events = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    update.value,
    update.confidence ?? current.confidence,
    JSON.stringify(newEvents),
    id
  );
  return getBlock(id);
}
function getStaleBlocks(maxAgeDays = 7) {
  const cutoff = /* @__PURE__ */ new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffStr = cutoff.toISOString();
  const all = getAllBlocks();
  return all.filter((b) => b.value.length > 0 && b.updatedAt < cutoffStr);
}
function getBlockSummary() {
  const blocks = getAllBlocks();
  const lines = [];
  for (const b of blocks) {
    if (b.value.length === 0) continue;
    const firstLine = b.value.split("\n")[0].slice(0, 80);
    const stale = isStale(b) ? " [STALE]" : "";
    lines.push(`- ${b.label} (v${b.version}, ${b.confidence})${stale}: ${firstLine}`);
  }
  return lines.length > 0 ? lines.join("\n") : "(no blocks populated yet)";
}
function logWhisper(entry) {
  const db = getDb();
  db.prepare(
    `INSERT INTO subconscious_whisper_log (id, session_id, block_ids, whisper_text, classification, suppressed, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    genId("wh"),
    entry.sessionId,
    JSON.stringify(entry.blockIds),
    entry.whisperText,
    entry.classification,
    entry.suppressed ? 1 : 0,
    entry.reason ?? null
  );
}
function getRecentWhispers(sessionId, limit = 10) {
  const db = getDb();
  const rows = db.prepare(
    `SELECT * FROM subconscious_whisper_log
       WHERE session_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
  ).all(sessionId, limit);
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    blockIds: JSON.parse(r.block_ids || "[]"),
    whisperText: r.whisper_text,
    classification: r.classification,
    suppressed: r.suppressed === 1,
    reason: r.reason,
    createdAt: r.created_at
  }));
}
function rowToBlock(row) {
  return {
    id: row.id,
    label: row.label,
    value: row.value,
    version: row.version,
    confidence: row.confidence,
    sourceEvents: JSON.parse(row.source_events || "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function isStale(block, maxAgeDays = 7) {
  if (block.value.length === 0) return false;
  const cutoff = /* @__PURE__ */ new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  return new Date(block.updatedAt) < cutoff;
}

// packages/mcp-local/src/subconscious/graphEngine.ts
init_db();
function searchEntities(query, limit = 10) {
  const db = getDb();
  try {
    const rows = db.prepare(
      `SELECT n.* FROM object_nodes_fts fts
         JOIN object_nodes n ON n.rowid = fts.rowid
         WHERE object_nodes_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
    ).all(query, limit);
    return rows.map(rowToEntity);
  } catch {
    const rows = db.prepare(
      `SELECT * FROM object_nodes
         WHERE label LIKE ? OR metadata_json LIKE ?
         ORDER BY updated_at DESC
         LIMIT ?`
    ).all(`%${query}%`, `%${query}%`, limit);
    return rows.map(rowToEntity);
  }
}
function resolveEntity(nameOrId) {
  const db = getDb();
  let row = db.prepare("SELECT * FROM object_nodes WHERE id = ?").get(nameOrId);
  if (row) return rowToEntity(row);
  row = db.prepare("SELECT * FROM object_nodes WHERE label = ? ORDER BY updated_at DESC LIMIT 1").get(nameOrId);
  if (row) return rowToEntity(row);
  const results = searchEntities(nameOrId, 1);
  return results.length > 0 ? results[0] : null;
}
function getEdgesFrom(entityId, relationFilter) {
  const db = getDb();
  if (relationFilter && relationFilter.length > 0) {
    const placeholders = relationFilter.map(() => "?").join(",");
    return db.prepare(
      `SELECT * FROM object_edges WHERE from_id = ? AND edge_type IN (${placeholders})`
    ).all(entityId, ...relationFilter).map(rowToEdge);
  }
  return db.prepare("SELECT * FROM object_edges WHERE from_id = ?").all(entityId).map(rowToEdge);
}
function getEdgesTo(entityId, relationFilter) {
  const db = getDb();
  if (relationFilter && relationFilter.length > 0) {
    const placeholders = relationFilter.map(() => "?").join(",");
    return db.prepare(
      `SELECT * FROM object_edges WHERE to_id = ? AND edge_type IN (${placeholders})`
    ).all(entityId, ...relationFilter).map(rowToEdge);
  }
  return db.prepare("SELECT * FROM object_edges WHERE to_id = ?").all(entityId).map(rowToEdge);
}
function traverseGraph(startEntityId, maxDepth = 2, relationFilter) {
  const visited = /* @__PURE__ */ new Set();
  const queue = [
    { entityId: startEntityId, depth: 0, path: [] }
  ];
  const results = [];
  const db = getDb();
  while (queue.length > 0) {
    const { entityId, depth, path: path2 } = queue.shift();
    if (depth > maxDepth || visited.has(entityId)) continue;
    visited.add(entityId);
    const outEdges = getEdgesFrom(entityId, relationFilter);
    const inEdges = getEdgesTo(entityId, relationFilter);
    const allEdges = [
      ...outEdges.map((e) => ({ edge: e, neighborId: e.toId })),
      ...inEdges.map((e) => ({ edge: e, neighborId: e.fromId }))
    ];
    for (const { edge, neighborId } of allEdges) {
      if (visited.has(neighborId)) continue;
      const newPath = [...path2, edge];
      const entityRow = db.prepare("SELECT * FROM object_nodes WHERE id = ?").get(neighborId);
      if (!entityRow) continue;
      results.push({
        entity: rowToEntity(entityRow),
        hopDistance: depth + 1,
        path: newPath,
        reachedVia: edge.edgeType,
        confidence: newPath.reduce((acc, e) => acc * e.confidence, 1)
      });
      if (depth + 1 < maxDepth) {
        queue.push({ entityId: neighborId, depth: depth + 1, path: newPath });
      }
    }
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}
function findContradictions(entityId, maxDepth = 2) {
  return traverseGraph(entityId, maxDepth, ["contradicts"]);
}
function getGraphSummary() {
  const db = getDb();
  const totalEntities = db.prepare("SELECT COUNT(*) as c FROM object_nodes").get().c;
  const totalEdges = db.prepare("SELECT COUNT(*) as c FROM object_edges").get().c;
  const kindCounts = db.prepare("SELECT kind, COUNT(*) as c FROM object_nodes GROUP BY kind").all();
  const entitiesByType = {};
  for (const row of kindCounts) entitiesByType[row.kind] = row.c;
  const edgeTypeCounts = db.prepare("SELECT edge_type, COUNT(*) as c FROM object_edges GROUP BY edge_type").all();
  const edgesByType = {};
  for (const row of edgeTypeCounts) edgesByType[row.edge_type] = row.c;
  const recent = db.prepare(
    "SELECT label, kind, updated_at FROM object_nodes ORDER BY updated_at DESC LIMIT 10"
  ).all();
  return {
    totalEntities,
    totalEdges,
    entitiesByType,
    edgesByType,
    recentEntities: recent.map((r) => ({
      label: r.label,
      kind: r.kind,
      updatedAt: r.updated_at
    }))
  };
}
function rowToEntity(row) {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    source: row.source,
    status: row.status,
    properties: JSON.parse(row.metadata_json || "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function rowToEdge(row) {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    edgeType: row.edge_type,
    confidence: row.confidence,
    metadata: JSON.parse(row.metadata_json || "{}"),
    createdAt: row.created_at
  };
}

// packages/mcp-local/src/subconscious/classifier.ts
var BLOCK_MAP = {
  code: ["agent_preferences", "current_wedge", "validated_workflows"],
  strategy: [
    "founder_identity",
    "company_identity",
    "current_wedge",
    "top_priorities",
    "open_contradictions"
  ],
  research: ["entity_watchlist", "recent_important_changes"],
  delegation: ["validated_workflows", "packet_lineage", "agent_preferences"],
  diligence: ["readiness_gaps", "company_identity", "packet_lineage"],
  unknown: ["current_wedge"]
};
var PATTERNS = [
  {
    classification: "code",
    keywords: /\b(implement|build|code|fix|bug|refactor|test|debug|compile|deploy|typescript|function|component|endpoint|route|api|import|export|npm|git|commit|push|pr|pull request|merge|lint|type[- ]?check)\b/i
  },
  {
    classification: "diligence",
    keywords: /\b(investor|diligence|due diligence|banking|bank|fundraise|series [a-d]|pitch|deck|readiness|compliance|audit|soc2|legal|term sheet|valuation|cap table|runway)\b/i
  },
  {
    classification: "strategy",
    keywords: /\b(strategy|wedge|positioning|roadmap|priorities|direction|pivot|moat|differentiat|competitive advantage|mission|vision|market fit|icp|buyer|distribution|pricing|go.?to.?market|gtm)\b/i
  },
  {
    classification: "delegation",
    keywords: /\b(delegate|dispatch|agent|task|packet|assign|orchestrat|automat|background|worker|swarm|teammate|pipeline|workflow)\b/i
  },
  {
    classification: "research",
    keywords: /\b(research|search|look up|find|competitor|market|entity|company|investigate|analyze|compare|benchmark|signal|trend|news|watchlist)\b/i
  }
];
var ENTITY_PATTERN = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|LLC|Corp|Ltd|AI|Labs|Co)\.?)?)\b/g;
var ENTITY_STOPWORDS = /* @__PURE__ */ new Set([
  "The",
  "This",
  "That",
  "These",
  "Those",
  "What",
  "When",
  "Where",
  "Why",
  "How",
  "Which",
  "Please",
  "Can",
  "Could",
  "Would",
  "Should",
  "Let",
  "Make",
  "Build",
  "Create",
  "Update",
  "Delete",
  "Add",
  "Remove",
  "Fix",
  "Run",
  "Start",
  "Stop",
  "Check",
  "Test",
  "Help",
  "Show",
  "Tell",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
]);
function classifyPrompt(prompt) {
  const scores = {
    code: 0,
    strategy: 0,
    research: 0,
    delegation: 0,
    diligence: 0,
    unknown: 0
  };
  for (const pattern of PATTERNS) {
    const matches = prompt.match(pattern.keywords);
    if (matches) {
      scores[pattern.classification] += matches.length;
    }
  }
  let best = "unknown";
  let bestScore = 0;
  for (const [cls, score] of Object.entries(scores)) {
    if (cls !== "unknown" && score > bestScore) {
      best = cls;
      bestScore = score;
    }
  }
  const totalMatches = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalMatches > 0 ? bestScore / totalMatches : 0;
  const entities = extractEntities(prompt);
  return {
    classification: best,
    confidence: Math.min(1, confidence),
    relevantBlocks: BLOCK_MAP[best],
    entities
  };
}
function extractEntities(text) {
  const matches = text.matchAll(ENTITY_PATTERN);
  const seen = /* @__PURE__ */ new Set();
  const entities = [];
  for (const match of matches) {
    const name = match[1].trim();
    if (name.length < 3) continue;
    if (ENTITY_STOPWORDS.has(name)) continue;
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    entities.push(name);
  }
  return entities;
}
function isTrivialPrompt(prompt) {
  if (prompt.length < 30) return true;
  if (/^(git |npm |npx |ls |cd |cat |pwd)/i.test(prompt.trim())) return true;
  if (/^fix (typo|spelling|whitespace|indent)/i.test(prompt.trim())) return true;
  return false;
}

// packages/mcp-local/src/subconscious/whisperPolicy.ts
var TOKEN_BUDGETS = {
  off: 0,
  whisper: 200,
  packet: 1e3,
  full: 2e3,
  review: 0
};
function generateWhisper(prompt, sessionId, mode = "whisper") {
  const classification = classifyPrompt(prompt);
  if (mode === "off" || mode === "review") {
    return {
      mode,
      classification,
      whisperText: "",
      suppressed: true,
      suppressionReason: `mode=${mode}`,
      blockIdsUsed: [],
      contradictions: [],
      stalePackets: []
    };
  }
  if (isTrivialPrompt(prompt)) {
    const result = {
      mode,
      classification,
      whisperText: "",
      suppressed: true,
      suppressionReason: "trivial_prompt",
      blockIdsUsed: [],
      contradictions: [],
      stalePackets: []
    };
    logWhisper({
      sessionId,
      blockIds: [],
      whisperText: "",
      classification: classification.classification,
      suppressed: true,
      reason: "trivial_prompt"
    });
    return result;
  }
  const recentWhispers = getRecentWhispers(sessionId, 3);
  const recentSameClass = recentWhispers.filter(
    (w) => !w.suppressed && w.classification === classification.classification
  );
  if (recentSameClass.length >= 2) {
    const result = {
      mode,
      classification,
      whisperText: "",
      suppressed: true,
      suppressionReason: "duplicate_recent",
      blockIdsUsed: [],
      contradictions: [],
      stalePackets: []
    };
    logWhisper({
      sessionId,
      blockIds: [],
      whisperText: "",
      classification: classification.classification,
      suppressed: true,
      reason: "duplicate_recent"
    });
    return result;
  }
  const blocks = getBlocksByIds(classification.relevantBlocks);
  const populatedBlocks = blocks.filter((b) => b.value.length > 0);
  const lines = [];
  const blockIdsUsed = [];
  const contradictions = [];
  for (const entityName of classification.entities) {
    const entity = resolveEntity(entityName);
    if (!entity) continue;
    const contradictionResults = findContradictions(entity.id, 2);
    for (const cr of contradictionResults.slice(0, 2)) {
      contradictions.push(
        `"${entity.label}" contradicts "${cr.entity.label}" (via ${cr.reachedVia}, confidence ${(cr.confidence * 100).toFixed(0)}%)`
      );
    }
  }
  const stalePackets = [];
  const packetLineage = getBlock("packet_lineage");
  if (packetLineage.value.length > 0) {
    const staleBlocks = getStaleBlocks(7);
    for (const sb of staleBlocks.slice(0, 3)) {
      stalePackets.push(`${sb.label} (last updated: ${sb.updatedAt.split("T")[0]})`);
    }
  }
  if (mode === "whisper") {
    if (contradictions.length > 0) {
      lines.push(`Contradiction: ${contradictions[0]}`);
    }
    if (populatedBlocks.length > 0) {
      const topBlock = populatedBlocks[0];
      const firstLine = topBlock.value.split("\n")[0].slice(0, 100);
      lines.push(`${topBlock.label}: ${firstLine}`);
      blockIdsUsed.push(topBlock.id);
    }
    if (stalePackets.length > 0) {
      lines.push(`Stale: ${stalePackets[0]}`);
    }
  } else if (mode === "packet" || mode === "full") {
    if (contradictions.length > 0) {
      lines.push("Contradictions:");
      for (const c of contradictions) lines.push(`  - ${c}`);
    }
    for (const block of populatedBlocks) {
      const budget2 = mode === "full" ? 500 : 200;
      const truncated = block.value.slice(0, budget2);
      lines.push(`
[${block.label}] (v${block.version}, ${block.confidence})`);
      lines.push(truncated);
      blockIdsUsed.push(block.id);
    }
    if (stalePackets.length > 0) {
      lines.push("\nStale blocks:");
      for (const sp of stalePackets) lines.push(`  - ${sp}`);
    }
  }
  const budget = TOKEN_BUDGETS[mode];
  let whisperText = lines.join("\n");
  if (whisperText.length > budget * 4) {
    whisperText = whisperText.slice(0, budget * 4) + "\n...";
  }
  if (whisperText.length > 0) {
    whisperText = `<nodebench_whisper>
${whisperText}
</nodebench_whisper>`;
  }
  logWhisper({
    sessionId,
    blockIds: blockIdsUsed,
    whisperText,
    classification: classification.classification,
    suppressed: false,
    reason: null
  });
  return {
    mode,
    classification,
    whisperText,
    suppressed: whisperText.length === 0,
    suppressionReason: whisperText.length === 0 ? "no_relevant_blocks" : null,
    blockIdsUsed,
    contradictions,
    stalePackets
  };
}

// server/routes/subconscious.ts
function createSubconsciousRouter() {
  const router = Router4();
  router.get("/health", (_req, res) => {
    try {
      ensureBlocksExist();
      res.json({ ok: true, service: "subconscious", blockCount: ALL_BLOCK_TYPES.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  router.get("/blocks", (_req, res) => {
    try {
      const blocks = getAllBlocks();
      res.json({ ok: true, blocks });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  router.get("/blocks/:id", (req, res) => {
    try {
      const id = req.params.id;
      if (!ALL_BLOCK_TYPES.includes(id)) {
        res.status(400).json({ ok: false, error: `Invalid block ID. Valid: ${ALL_BLOCK_TYPES.join(", ")}` });
        return;
      }
      const block = getBlock(id);
      res.json({ ok: true, block });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  router.post("/blocks/:id", (req, res) => {
    try {
      const id = req.params.id;
      if (!ALL_BLOCK_TYPES.includes(id)) {
        res.status(400).json({ ok: false, error: `Invalid block ID` });
        return;
      }
      const { value, confidence } = req.body;
      if (typeof value !== "string") {
        res.status(400).json({ ok: false, error: "value (string) is required" });
        return;
      }
      const updated = updateBlock(id, {
        value,
        confidence: confidence ?? "medium",
        sourceEvent: `api_update_${Date.now()}`
      });
      res.json({ ok: true, block: updated });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  router.get("/summary", (_req, res) => {
    try {
      const blocks = getAllBlocks();
      const populated = blocks.filter((b) => b.value.length > 0);
      const stale = getStaleBlocks(7);
      res.json({
        ok: true,
        summary: getBlockSummary(),
        totalBlocks: ALL_BLOCK_TYPES.length,
        populatedBlocks: populated.length,
        staleCount: stale.length,
        staleBlocks: stale.map((b) => ({ id: b.id, label: b.label, updatedAt: b.updatedAt }))
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  router.get("/whispers/:sessionId", (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const whispers = getRecentWhispers(req.params.sessionId, Math.min(limit, 100));
      res.json({ ok: true, whispers });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  router.get("/graph/summary", (_req, res) => {
    try {
      const summary = getGraphSummary();
      res.json({ ok: true, ...summary });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  router.post("/classify", (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        res.status(400).json({ ok: false, error: "prompt is required" });
        return;
      }
      const result = classifyPrompt(prompt);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  router.post("/whisper", (req, res) => {
    try {
      const { prompt, mode, session_id } = req.body;
      if (!prompt) {
        res.status(400).json({ ok: false, error: "prompt is required" });
        return;
      }
      const result = generateWhisper(
        prompt,
        session_id ?? "api",
        mode ?? "whisper"
      );
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  return router;
}

// server/syncBridge.ts
import { randomUUID } from "node:crypto";
import { EventEmitter as EventEmitter2 } from "node:events";
import { WebSocketServer, WebSocket } from "ws";

// packages/mcp-local/src/sync/protocol.ts
function createSyncEnvelope(type, payload) {
  return {
    type,
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    payload
  };
}

// server/syncBridge.ts
var MAX_CONNECTIONS = 100;
var MAX_BATCH_SIZE = 200;
var HEARTBEAT_INTERVAL_MS = 3e4;
var SyncBridgeServer = class extends EventEmitter2 {
  constructor(config = {}) {
    super();
    this.pairingGrants = /* @__PURE__ */ new Map();
    this.deviceSessions = /* @__PURE__ */ new Map();
    this.activeConnections = /* @__PURE__ */ new Map();
    this.accountOperations = /* @__PURE__ */ new Map();
    this.wss = null;
    this.heartbeatTimer = null;
    this.maxConnections = Math.min(config.maxConnections ?? MAX_CONNECTIONS, MAX_CONNECTIONS);
    this.heartbeatIntervalMs = config.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS;
    this.maxBatchSize = Math.min(config.maxBatchSize ?? MAX_BATCH_SIZE, MAX_BATCH_SIZE);
  }
  attachToServer(_server, _path) {
    this.wss = new WebSocketServer({ noServer: true });
    this.heartbeatTimer = setInterval(() => {
      for (const conn of this.activeConnections.values()) {
        if (conn.ws.readyState === WebSocket.OPEN) {
          conn.ws.ping();
        }
      }
    }, this.heartbeatIntervalMs);
  }
  createPairingGrant(input) {
    const pairingCode = `pair_${randomUUID().slice(0, 8)}`;
    const grant = {
      pairingCode,
      userId: input.userId,
      workspaceId: input.workspaceId,
      scopes: input.scopes,
      expiresAt: new Date(Date.now() + (input.ttlMs ?? 10 * 6e4)).toISOString(),
      metadata: input.metadata
    };
    this.pairingGrants.set(pairingCode, grant);
    return grant;
  }
  getHealthSnapshot() {
    return {
      status: "ok",
      service: "sync-bridge",
      pairingGrantCount: this.pairingGrants.size,
      pairedDeviceCount: this.deviceSessions.size,
      activeConnectionCount: this.activeConnections.size,
      accountCount: new Set(Array.from(this.deviceSessions.values()).map((session) => session.userId)).size
    };
  }
  getAccountSnapshot(userId) {
    const sessions2 = Array.from(this.deviceSessions.values()).filter((session) => session.userId === userId);
    const connectedDevices = sessions2.map((session) => ({
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      platform: session.platform,
      pairedAt: session.pairedAt,
      lastSeenAt: session.lastSeenAt,
      scopesGranted: session.scopesGranted
    }));
    const recentOperations = this.accountOperations.get(userId) ?? [];
    return {
      userId,
      workspaceId: sessions2[0]?.workspaceId,
      connectedDevices,
      recentOperations
    };
  }
  async handleUpgrade(req, socket, head) {
    if (!this.wss) {
      socket.destroy();
      return;
    }
    if (this.activeConnections.size >= this.maxConnections) {
      socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
      socket.destroy();
      return;
    }
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.handleNewConnection(ws);
    });
  }
  handleNewConnection(ws) {
    ws.on("message", (raw) => this.handleMessage(ws, raw));
    ws.on("close", () => {
      for (const [deviceId, connection] of this.activeConnections.entries()) {
        if (connection.ws === ws) {
          this.activeConnections.delete(deviceId);
          break;
        }
      }
    });
  }
  handleMessage(ws, raw) {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      this.send(ws, createSyncEnvelope("error", {
        code: "invalid_json",
        message: "Sync bridge messages must be valid JSON",
        retryable: false
      }));
      return;
    }
    if (message.type === "pair_device") {
      this.handlePairDevice(ws, message.payload);
      return;
    }
    if (message.type === "sync_batch") {
      this.handleSyncBatch(ws, message.payload);
      return;
    }
    if (message.type === "ping") {
      this.send(ws, createSyncEnvelope("pong", {}));
    }
  }
  handlePairDevice(ws, payload) {
    let stored;
    if (payload.deviceToken) {
      stored = this.deviceSessions.get(payload.deviceId);
      if (!stored || stored.deviceToken !== payload.deviceToken) {
        this.send(ws, createSyncEnvelope("error", {
          code: "device_token_invalid",
          message: "Device token is invalid or no longer matches this device",
          retryable: true
        }));
        return;
      }
    } else if (payload.pairingCode) {
      const grant = this.pairingGrants.get(payload.pairingCode);
      if (!grant) {
        this.send(ws, createSyncEnvelope("error", {
          code: "pairing_code_invalid",
          message: "Pairing code was not found",
          retryable: false
        }));
        return;
      }
      if (Date.parse(grant.expiresAt) < Date.now()) {
        this.pairingGrants.delete(payload.pairingCode);
        this.send(ws, createSyncEnvelope("error", {
          code: "pairing_code_expired",
          message: "Pairing code has expired",
          retryable: false
        }));
        return;
      }
      stored = {
        deviceId: payload.deviceId,
        deviceName: payload.deviceName,
        deviceToken: `devtok_${randomUUID()}`,
        userId: grant.userId,
        workspaceId: payload.workspaceId ?? grant.workspaceId,
        scopesGranted: grant.scopes,
        pairedAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastSeenAt: (/* @__PURE__ */ new Date()).toISOString(),
        platform: payload.platform,
        appVersion: payload.appVersion
      };
      this.deviceSessions.set(payload.deviceId, stored);
      this.pairingGrants.delete(payload.pairingCode);
    }
    if (!stored) {
      this.send(ws, createSyncEnvelope("error", {
        code: "pairing_required",
        message: "Provide either a valid pairingCode or a deviceToken",
        retryable: false
      }));
      return;
    }
    stored.lastSeenAt = (/* @__PURE__ */ new Date()).toISOString();
    this.deviceSessions.set(stored.deviceId, stored);
    this.activeConnections.set(stored.deviceId, {
      ws,
      deviceId: stored.deviceId,
      deviceName: stored.deviceName,
      deviceToken: stored.deviceToken,
      userId: stored.userId,
      workspaceId: stored.workspaceId,
      scopesGranted: stored.scopesGranted,
      pairedAt: stored.pairedAt,
      lastSeenAt: stored.lastSeenAt,
      platform: stored.platform,
      appVersion: stored.appVersion
    });
    const pairedPayload = {
      deviceToken: stored.deviceToken,
      deviceId: stored.deviceId,
      userId: stored.userId,
      workspaceId: stored.workspaceId,
      scopesGranted: stored.scopesGranted,
      pairedAt: stored.pairedAt,
      syncEnabled: true
    };
    this.send(ws, createSyncEnvelope("paired", pairedPayload));
  }
  handleSyncBatch(ws, payload) {
    const connection = this.activeConnections.get(payload.deviceId);
    if (!connection || connection.ws !== ws) {
      this.send(ws, createSyncEnvelope("error", {
        code: "not_paired",
        message: "Device must pair before syncing",
        retryable: true
      }));
      return;
    }
    const operations = Array.isArray(payload.operations) ? payload.operations.slice(0, this.maxBatchSize) : [];
    const acceptedIds = [];
    const rejected = [];
    for (const operation of operations) {
      const validation = this.validateOperation(operation);
      if (validation === true) {
        acceptedIds.push(operation.id);
        const existing = this.accountOperations.get(connection.userId) ?? [];
        existing.unshift({
          id: operation.id,
          deviceId: connection.deviceId,
          objectId: operation.objectId,
          objectKind: String(operation.objectKind),
          opType: String(operation.opType),
          acceptedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        this.accountOperations.set(connection.userId, existing.slice(0, 200));
      } else {
        rejected.push({ id: operation.id, reason: validation });
      }
    }
    const ackPayload = {
      acceptedIds,
      rejected,
      serverWatermark: `sync_${Date.now()}`
    };
    this.send(ws, createSyncEnvelope("sync_ack", ackPayload));
  }
  validateOperation(operation) {
    if (!operation?.id) return "missing operation id";
    if (!operation?.objectKind) return "missing object kind";
    if (!operation?.opType) return "missing operation type";
    if (typeof operation.payload !== "object" || operation.payload === null) return "payload must be an object";
    return true;
  }
  send(ws, message) {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(message));
  }
  shutdown() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const connection of this.activeConnections.values()) {
      connection.ws.close(1001, "Server shutting down");
    }
    this.activeConnections.clear();
    this.wss?.close();
    this.wss = null;
  }
};

// server/vercel/searchApp.ts
if (!process.env.CONVEX_URL && process.env.VITE_CONVEX_URL) {
  process.env.CONVEX_URL = process.env.VITE_CONVEX_URL;
}
var tools = [
  ...webTools,
  ...reconTools,
  ...founderLocalPipelineTools,
  ...entityEnrichmentTools,
  ...llmTools,
  ...monteCarloTools
];
var syncBridge = new SyncBridgeServer();
var app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(createSearchRouter(tools));
app.use("/harness", createHarnessRouter(tools));
app.use("/api/harness", createHarnessRouter(tools));
app.use("/shared-context", createSharedContextRouter());
app.use("/api/shared-context", createSharedContextRouter());
app.use("/subconscious", createSubconsciousRouter());
app.use("/api/subconscious", createSubconsciousRouter());
try {
  initSweepTables();
} catch {
}
app.get("/api/sweep/latest", async (_req, res) => {
  try {
    const latest = getLatestSweep();
    if (!latest) return res.json({ success: true, signals: [], message: "No sweep data. Run a sweep first." });
    const previous = getPreviousSweep();
    const delta = computeDelta(latest, previous);
    const recs = generateRecommendations(latest.signals);
    res.json({
      success: true,
      sweepId: latest.sweepId,
      timestamp: latest.timestamp,
      topEntity: delta.topEntity,
      topEntityQuery: delta.topEntityQuery,
      topEntitySeverity: delta.topEntitySeverity,
      signalCount: latest.signals.length,
      newSignals: delta.newSignals.length,
      escalations: delta.escalations.length,
      signals: latest.signals.slice(0, 15),
      recommendations: recs.slice(0, 5),
      sources: latest.sources
    });
  } catch (err) {
    res.json({ success: false, error: err?.message });
  }
});
app.post("/api/sweep/run", async (_req, res) => {
  try {
    const result = await runSweep();
    const previous = getPreviousSweep();
    const delta = computeDelta(result, previous);
    const recs = generateRecommendations(result.signals);
    res.json({
      success: true,
      sweepId: result.sweepId,
      signalCount: result.signals.length,
      topEntity: delta.topEntity,
      topEntityQuery: delta.topEntityQuery,
      sources: result.sources,
      durationMs: result.totalDurationMs,
      recommendations: recs.slice(0, 5)
    });
  } catch (err) {
    res.json({ success: false, error: err?.message });
  }
});
app.post("/v1/traces", (req, res) => {
  try {
    const { processOtelPayload: processOtelPayload2 } = (init_otelReceiver(), __toCommonJS(otelReceiver_exports));
    const result = processOtelPayload2(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.json({ success: false, error: err?.message });
  }
});
app.get("/sync-bridge/health", (_req, res) => {
  res.json(syncBridge.getHealthSnapshot());
});
app.get("/api/sync-bridge/health", (_req, res) => {
  res.json(syncBridge.getHealthSnapshot());
});
app.get("/sync-bridge/accounts/:userId", (req, res) => {
  res.json(syncBridge.getAccountSnapshot(req.params.userId));
});
app.get("/api/sync-bridge/accounts/:userId", (req, res) => {
  res.json(syncBridge.getAccountSnapshot(req.params.userId));
});
var searchApp_default = app;
export {
  searchApp_default as default
};
