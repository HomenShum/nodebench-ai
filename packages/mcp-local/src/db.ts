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
`;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dir = join(homedir(), ".nodebench");
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
