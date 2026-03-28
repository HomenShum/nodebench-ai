import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

type NodebenchDb = any;
type StatementResult = { changes: number; lastInsertRowid: number };

const require = createRequire(import.meta.url);

let _db: NodebenchDb | null = null;
let _databaseCtor: any | null | undefined;

function loadDatabaseCtor(): any | null {
  if (_databaseCtor !== undefined) return _databaseCtor;
  try {
    _databaseCtor = require("better-sqlite3");
  } catch {
    _databaseCtor = null;
  }
  return _databaseCtor;
}

function getNodebenchDataDir(): string {
  const configured = process.env.NODEBENCH_DATA_DIR?.trim();
  if (configured) return configured;
  if (process.env.VERCEL) return "/tmp/.nodebench";
  const home = process.env.HOME || process.env.USERPROFILE || process.cwd();
  return join(home, ".nodebench");
}

function createNoopStatement(sql: string) {
  const normalized = sql.toLowerCase();
  return {
    get: (): Record<string, unknown> | undefined => {
      if (normalized.includes("count(")) return { c: 0 };
      if (normalized.includes("min(")) return { t: null };
      if (normalized.includes("max(")) return { t: null };
      return undefined;
    },
    all: (): unknown[] => [],
    run: (): StatementResult => ({ changes: 0, lastInsertRowid: 0 }),
  };
}

function createNoopDb(): NodebenchDb {
  return {
    prepare(sql: string) {
      return createNoopStatement(sql);
    },
    exec() {
      return undefined;
    },
    pragma() {
      return undefined;
    },
    transaction<T extends (...args: any[]) => any>(fn: T): T {
      return ((...args: Parameters<T>) => fn(...args)) as T;
    },
  };
}

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

-- ═══════════════════════════════════════════
-- AGENT MAILBOX (Inter-agent messaging)
-- ═══════════════════════════════════════════

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

-- ═══════════════════════════════════════════
-- DYNAMIC LOADING A/B TEST TRACKING
-- Based on: Dynamic ReAct (arxiv 2509.20386),
-- Anthropic Tool Search Tool, Tool-to-Agent
-- Retrieval (arxiv 2511.01854)
-- ═══════════════════════════════════════════

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

-- ═══════════════════════════════════════════
-- UI/UX FULL DIVE — Parallel subagent swarm
-- for comprehensive UI traversal, component
-- tree building, interaction logging, and
-- bug tagging.
-- ═══════════════════════════════════════════

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

-- ═══════════════════════════════════════════
-- UI/UX FULL DIVE v2 — Deep interaction
-- testing, screenshots, design auditing,
-- backend linking, and changelog tracking.
-- ═══════════════════════════════════════════

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

-- ═══════════════════════════════════════════
-- UI/UX FULL DIVE v3 — Flywheel: locate code,
-- fix-verify, re-explore, generate tests,
-- code review.
-- ═══════════════════════════════════════════

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

-- ═══════════════════════════════════════════
-- SKILL SELF-UPDATE PROTOCOL — Track rule/
-- memory file provenance, source hashes,
-- update triggers, sync history.
-- ═══════════════════════════════════════════

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

-- ═══════════════════════════════════════════
-- ENGINE CONTEXT PERSISTENCE
-- Conformance reports, workflow runs, content archive
-- ═══════════════════════════════════════════

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

-- ═══════════════════════════════════════════
-- LOCAL-FIRST IDENTITY / PROVENANCE / SYNC
-- Durable objects, receipts, account bindings,
-- and outbound sync queue for web account replication.
-- ═══════════════════════════════════════════

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
`;

export function getDb(): NodebenchDb {
  if (_db) return _db;
  const Database = loadDatabaseCtor();
  if (!Database) {
    _db = createNoopDb();
    return _db;
  }
  const dir = getNodebenchDataDir();
  mkdirSync(dir, { recursive: true });
  _db = new Database(join(dir, "nodebench.db"));
  _db.exec(SCHEMA_SQL);

  // One-time FTS5 rebuild for existing data (idempotent, skips if already synced)
  try {
    const rf = _db.prepare("SELECT COUNT(*) as c FROM recon_findings").get() as any;
    const rfFts = _db.prepare("SELECT COUNT(*) as c FROM recon_findings_fts").get() as any;
    if (rf.c > 0 && rfFts.c === 0) {
      _db.exec("INSERT INTO recon_findings_fts(recon_findings_fts) VALUES('rebuild')");
    }
    const g = _db.prepare("SELECT COUNT(*) as c FROM gaps").get() as any;
    const gFts = _db.prepare("SELECT COUNT(*) as c FROM gaps_fts").get() as any;
    if (g.c > 0 && gFts.c === 0) {
      _db.exec("INSERT INTO gaps_fts(gaps_fts) VALUES('rebuild')");
    }
  } catch { /* FTS tables not yet available — fresh DB, triggers will handle it */ }

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
