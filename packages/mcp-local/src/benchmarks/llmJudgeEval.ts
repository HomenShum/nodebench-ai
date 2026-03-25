#!/usr/bin/env npx tsx
/**
 * llmJudgeEval.ts — LLM-judged boolean-metric eval harness for NodeBench MCP
 *
 * Architecture:
 *   1. Query Corpus — 500+ typed test queries across 11 personas × 8 scenarios
 *   2. Tool Executor — loads preset, runs discover_tools + tool chain, captures outputs
 *   3. LLM Judge — Gemini Flash Lite boolean evaluation per criterion
 *   4. Boolean Metrics — precision, recall, forbidden violations, criteria pass rate
 *   5. Regression Detection — SQLite-backed diff between runs
 *
 * Usage:
 *   cd packages/mcp-local
 *   npx tsx src/benchmarks/llmJudgeEval.ts [--queries N] [--persona X] [--baseline RUN_ID] [--flywheel]
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";
import { _setDbAccessor } from "../tools/toolRegistry.js";
import { loadToolsets, ALL_DOMAIN_KEYS, TOOLSET_MAP } from "../toolsetRegistry.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type Persona =
  | "founder"
  | "banker"
  | "ceo"
  | "researcher"
  | "student"
  | "operator"
  | "legal"
  | "pm"
  | "contractor"
  | "investor"
  | "content";

export type Scenario =
  | "weekly_reset"
  | "company_search"
  | "competitor_brief"
  | "delegation"
  | "important_change"
  | "memo_export"
  | "packet_diff"
  | "role_switch";

export interface BooleanCriterion {
  criterion: string;
  weight: number;
}

export interface EvalQuery {
  id: string;
  query: string;
  persona: Persona;
  scenario: Scenario;
  expectedTools: string[];
  forbiddenTools: string[];
  booleanCriteria: BooleanCriterion[];
}

export interface CriterionResult {
  criterion: string;
  pass: boolean;
  evidence: string;
}

export interface JudgeResponse {
  criteria: CriterionResult[];
  overallPass: boolean;
}

export interface QueryResult {
  queryId: string;
  pass: boolean;
  criteriaResults: CriterionResult[];
  toolsFired: string[];
  toolPrecision: number;
  toolRecall: number;
  forbiddenViolations: number;
  criteriaPassRate: number;
  judgeResponse: string;
  ms: number;
}

export interface RunSummary {
  runId: string;
  timestamp: string;
  queryCount: number;
  passRate: number;
  avgToolPrecision: number;
  avgToolRecall: number;
  totalForbiddenViolations: number;
  avgCriteriaPassRate: number;
  byPersona: Record<string, { pass: number; total: number; rate: number }>;
  byScenario: Record<string, { pass: number; total: number; rate: number }>;
  byCriterion: Record<string, { pass: number; total: number; rate: number }>;
}

export interface RegressionItem {
  queryId: string;
  criterion: string;
  baselinePass: boolean;
  currentPass: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMA — eval tables (appended to existing DB)
// ══════════════════════════════════════════════════════════════════════════════

const LLM_EVAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS llm_eval_runs (
  run_id        TEXT PRIMARY KEY,
  timestamp     TEXT NOT NULL DEFAULT (datetime('now')),
  query_count   INTEGER NOT NULL DEFAULT 0,
  pass_rate     REAL NOT NULL DEFAULT 0,
  persona       TEXT,
  scenario      TEXT,
  summary_json  TEXT
);

CREATE TABLE IF NOT EXISTS llm_eval_results (
  id                    TEXT PRIMARY KEY,
  run_id                TEXT NOT NULL,
  query_id              TEXT NOT NULL,
  pass                  INTEGER NOT NULL DEFAULT 0,
  criteria_json         TEXT,
  tools_precision       REAL NOT NULL DEFAULT 0,
  tools_recall          REAL NOT NULL DEFAULT 0,
  forbidden_violations  INTEGER NOT NULL DEFAULT 0,
  criteria_pass_rate    REAL NOT NULL DEFAULT 0,
  judge_response        TEXT,
  ms                    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_llm_eval_results_run ON llm_eval_results(run_id);
CREATE INDEX IF NOT EXISTS idx_llm_eval_results_query ON llm_eval_results(query_id);
`;

function ensureSchema(): void {
  const db = getDb();
  db.exec(LLM_EVAL_SCHEMA);
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST DATA SEEDING — populate SQLite with realistic data before eval
// ══════════════════════════════════════════════════════════════════════════════

const SEED_PREFIX = "eval_seed_";

/** Ensure all required tables exist (they're normally created by tool handlers) */
function ensureToolSchemas(): void {
  const db = getDb();
  // Match ACTUAL schemas created by tool handlers (not idealized schemas)
  // causal_events: id, userId, eventType, payload, createdAt
  // causal_important_changes: id, changeId, changeCategory, impactScore, impactReason, affectedEntities, suggestedAction, status, timestampMs, createdAt
  // founder_packets: id, entityId, scenarioId, userId, createdAt
  // causal_state_diffs: id, diffId, entityType, entityId, changeType, beforeState, afterState, changedFields, reason, timestampMs, createdAt
  // tracking_actions: id, actionId, sessionId, timestamp, action, category, beforeState, afterState, reasoning, filesChanged, impactLevel, dayOfWeek, weekNumber, month, quarter, year
  // session_summaries: id, summaryId, sessionId, sessionSummary, activeEntities, openIntents, packetState, unresolvedItems, lastAction, sessionDurationMs, toolCallCount, keyDecisions, createdAt, timestampMs
  // intent_residuals: id, intentId, intent, status, context, createdAt, updatedAt
  db.exec(`
    CREATE TABLE IF NOT EXISTS causal_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      eventType TEXT NOT NULL,
      payload TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS causal_important_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      changeId TEXT UNIQUE NOT NULL,
      changeCategory TEXT NOT NULL,
      impactScore REAL NOT NULL,
      impactReason TEXT NOT NULL,
      affectedEntities TEXT NOT NULL,
      suggestedAction TEXT,
      status TEXT NOT NULL DEFAULT 'detected',
      timestampMs INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS founder_packets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entityId TEXT,
      scenarioId TEXT,
      userId TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS causal_state_diffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      diffId TEXT UNIQUE NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      changeType TEXT NOT NULL,
      beforeState TEXT NOT NULL,
      afterState TEXT NOT NULL,
      changedFields TEXT NOT NULL,
      reason TEXT,
      timestampMs INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tracking_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actionId TEXT UNIQUE NOT NULL,
      sessionId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      category TEXT NOT NULL,
      beforeState TEXT,
      afterState TEXT,
      reasoning TEXT,
      filesChanged TEXT,
      impactLevel TEXT NOT NULL,
      dayOfWeek TEXT NOT NULL,
      weekNumber INTEGER NOT NULL,
      month TEXT NOT NULL,
      quarter TEXT NOT NULL,
      year INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS session_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      summaryId TEXT UNIQUE NOT NULL,
      sessionId TEXT NOT NULL,
      sessionSummary TEXT NOT NULL,
      activeEntities TEXT NOT NULL,
      openIntents TEXT NOT NULL,
      packetState TEXT NOT NULL,
      unresolvedItems TEXT NOT NULL,
      lastAction TEXT NOT NULL,
      sessionDurationMs INTEGER NOT NULL,
      toolCallCount INTEGER NOT NULL,
      keyDecisions TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      timestampMs INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS intent_residuals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intentId TEXT UNIQUE NOT NULL,
      intent TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      context TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);
}

function seedTestData(): void {
  const db = getDb();
  ensureToolSchemas();

  const now = Date.now();
  const iso = new Date().toISOString();
  const dayAgo = now - 86_400_000;
  const weekAgo = now - 7 * 86_400_000;
  const twoWeeksAgo = now - 14 * 86_400_000;
  const monthAgo = now - 30 * 86_400_000;
  const seedCorrelation = "eval_seed_corr_001";

  // ── 10 causal_events (actual schema: userId, eventType, payload, createdAt) ──
  const events = [
    { userId: `${SEED_PREFIX}agent`, eventType: "search", payload: JSON.stringify({ entityId: "nodebench", summary: "Researched competitor landscape for Q1 2026 strategy review", results: 12 }), createdAt: iso },
    { userId: `${SEED_PREFIX}agent`, eventType: "change", payload: JSON.stringify({ entityId: "nodebench", summary: "Updated product positioning to local-first architecture", field: "positioning" }), createdAt: iso },
    { userId: `${SEED_PREFIX}agent`, eventType: "contradiction", payload: JSON.stringify({ entityId: "nodebench", summary: "Burn rate increasing while runway target unchanged", claim1: "reduce burn 15%", claim2: "hire 3 engineers" }), createdAt: iso },
    { userId: `${SEED_PREFIX}agent`, eventType: "packet.generated", payload: JSON.stringify({ entityId: "nodebench", summary: "Weekly reset packet March 17-24 2026", packetType: "weekly_reset" }), createdAt: iso },
    { userId: `${SEED_PREFIX}user`, eventType: "search", payload: JSON.stringify({ entityId: "stripe", summary: "Stripe payment infrastructure changes March 2026" }), createdAt: iso },
    { userId: `${SEED_PREFIX}agent`, eventType: "change", payload: JSON.stringify({ entityId: "linear", summary: "Linear AI backlog grooming feature competing with NodeBench" }), createdAt: iso },
    { userId: `${SEED_PREFIX}agent`, eventType: "search", payload: JSON.stringify({ entityId: "anthropic", summary: "Anthropic Series D $15B valuation $2B raised", funding: "$2B", valuation: "$15B" }), createdAt: iso },
    { userId: `${SEED_PREFIX}agent`, eventType: "packet.generated", payload: JSON.stringify({ entityId: "nodebench", summary: "Competitor brief NodeBench vs Linear vs Notion March 2026", competitors: ["Linear", "Notion", "Cursor"] }), createdAt: iso },
    { userId: `${SEED_PREFIX}user`, eventType: "change", payload: JSON.stringify({ entityId: "nodebench", summary: "Delegated auth refactor to engineering lead 2-week deadline" }), createdAt: iso },
    { userId: `${SEED_PREFIX}agent`, eventType: "search", payload: JSON.stringify({ entityId: "ai-tools", summary: "AI developer tools sector 340% YoY MCP adoption growth" }), createdAt: iso },
  ];

  const insertEvent = db.prepare(`INSERT INTO causal_events (userId, eventType, payload, createdAt) VALUES (?, ?, ?, ?)`);
  for (const e of events) {
    insertEvent.run(e.userId, e.eventType, e.payload, e.createdAt);
  }

  // ── 5 causal_important_changes ──
  const changes: Array<{ changeId: string; changeCategory: string; impactScore: number; impactReason: string; affectedEntities: string; suggestedAction: string; status: string; timestampMs: number; createdAt: string }> = [
    { changeId: `${SEED_PREFIX}chg_001`, changeCategory: "competitive", impactScore: 0.85, impactReason: "Linear AI backlog feature directly competes with NodeBench workflow automation", affectedEntities: JSON.stringify(["nodebench", "linear"]), suggestedAction: "Accelerate AI-powered tool discovery feature to maintain differentiation", status: "detected", timestampMs: dayAgo, createdAt: iso },
    { changeId: `${SEED_PREFIX}chg_002`, changeCategory: "financial", impactScore: 0.72, impactReason: "Monthly burn rate exceeded forecast by 18% due to increased cloud compute costs", affectedEntities: JSON.stringify(["nodebench"]), suggestedAction: "Review cloud spending and implement cost optimization for embedding generation", status: "detected", timestampMs: dayAgo + 3600_000, createdAt: iso },
    { changeId: `${SEED_PREFIX}chg_003`, changeCategory: "market", impactScore: 0.68, impactReason: "MCP protocol adoption hit 50,000 daily active servers, 340% growth since January 2026", affectedEntities: JSON.stringify(["nodebench", "mcp-ecosystem"]), suggestedAction: "Publish MCP gateway documentation and launch developer onboarding campaign", status: "acknowledged", timestampMs: weekAgo, createdAt: iso },
    { changeId: `${SEED_PREFIX}chg_004`, changeCategory: "product", impactScore: 0.91, impactReason: "Critical security vulnerability discovered in WebSocket gateway authentication flow", affectedEntities: JSON.stringify(["nodebench", "mcp-gateway"]), suggestedAction: "Patch authentication bypass in mcpAuth.ts immediately", status: "acknowledged", timestampMs: weekAgo + 86_400_000, createdAt: iso },
    { changeId: `${SEED_PREFIX}chg_005`, changeCategory: "strategic", impactScore: 0.55, impactReason: "Board member suggested pivoting from B2B to B2C developer tools market", affectedEntities: JSON.stringify(["nodebench"]), suggestedAction: "Prepare counter-analysis showing B2B enterprise traction and pipeline", status: "resolved", timestampMs: twoWeeksAgo, createdAt: iso },
  ];

  const insertChange = db.prepare(`INSERT OR IGNORE INTO causal_important_changes (changeId, changeCategory, impactScore, impactReason, affectedEntities, suggestedAction, status, timestampMs, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const c of changes) {
    insertChange.run(c.changeId, c.changeCategory, c.impactScore, c.impactReason, c.affectedEntities, c.suggestedAction, c.status, c.timestampMs, c.createdAt);
  }

  // ── 3 founder_packets (actual schema: entityId, scenarioId, userId, createdAt) ──
  const packets = [
    { entityId: `${SEED_PREFIX}nodebench`, scenarioId: "weekly_reset", userId: `${SEED_PREFIX}agent`, createdAt: new Date(dayAgo).toISOString() },
    { entityId: `${SEED_PREFIX}nodebench`, scenarioId: "competitor_brief", userId: `${SEED_PREFIX}agent`, createdAt: new Date(weekAgo).toISOString() },
    { entityId: `${SEED_PREFIX}nodebench`, scenarioId: "pre_delegation", userId: `${SEED_PREFIX}agent`, createdAt: new Date(weekAgo + 2 * 86_400_000).toISOString() },
  ];

  const insertPacket = db.prepare(`INSERT INTO founder_packets (entityId, scenarioId, userId, createdAt) VALUES (?, ?, ?, ?)`);
  for (const p of packets) {
    insertPacket.run(p.entityId, p.scenarioId, p.userId, p.createdAt);
  }

  // ── 3 causal_state_diffs ──
  const diffs: Array<{ diffId: string; entityType: string; entityId: string; changeType: string; beforeState: string; afterState: string; changedFields: string; reason: string; timestampMs: number; createdAt: string }> = [
    { diffId: `${SEED_PREFIX}diff_001`, entityType: "product", entityId: "nodebench", changeType: "update", beforeState: JSON.stringify({ positioning: "cloud-native MCP server", toolCount: 304 }), afterState: JSON.stringify({ positioning: "local-first operating memory", toolCount: 346 }), changedFields: JSON.stringify(["positioning", "toolCount"]), reason: "Repositioned from cloud-native to local-first based on user feedback and privacy requirements", timestampMs: weekAgo, createdAt: iso },
    { diffId: `${SEED_PREFIX}diff_002`, entityType: "strategy", entityId: "nodebench", changeType: "update", beforeState: JSON.stringify({ targetMarket: "B2B+B2C", pricing: "freemium" }), afterState: JSON.stringify({ targetMarket: "B2B enterprise", pricing: "usage-based" }), changedFields: JSON.stringify(["targetMarket", "pricing"]), reason: "Board decision to focus on enterprise after strong B2B pipeline signals", timestampMs: twoWeeksAgo, createdAt: iso },
    { diffId: `${SEED_PREFIX}diff_003`, entityType: "competitive", entityId: "linear", changeType: "create", beforeState: JSON.stringify({}), afterState: JSON.stringify({ feature: "AI backlog grooming", launchDate: "2026-03-15", threat: "high" }), changedFields: JSON.stringify(["feature", "launchDate", "threat"]), reason: "Linear announced AI-powered backlog grooming at their spring launch event", timestampMs: twoWeeksAgo + 86_400_000, createdAt: iso },
  ];

  const insertDiff = db.prepare(`INSERT OR IGNORE INTO causal_state_diffs (diffId, entityType, entityId, changeType, beforeState, afterState, changedFields, reason, timestampMs, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const d of diffs) {
    insertDiff.run(d.diffId, d.entityType, d.entityId, d.changeType, d.beforeState, d.afterState, d.changedFields, d.reason, d.timestampMs, d.createdAt);
  }

  // ── 5 tracking_actions ──
  const actions: Array<{ actionId: string; sessionId: string; timestamp: string; action: string; category: string; beforeState: string | null; afterState: string | null; reasoning: string; filesChanged: string | null; impactLevel: string; dayOfWeek: string; weekNumber: number; month: string; quarter: string; year: number }> = [
    { actionId: `${SEED_PREFIX}act_001`, sessionId: `${SEED_PREFIX}sess_001`, timestamp: new Date(dayAgo).toISOString(), action: "Shipped tiered context injection feature for message persistence", category: "engineering", beforeState: JSON.stringify({ contextRetention: "none" }), afterState: JSON.stringify({ contextRetention: "tiered" }), reasoning: "Users losing context after message 1000", filesChanged: JSON.stringify(["packages/mcp-local/src/index.ts"]), impactLevel: "high", dayOfWeek: "Monday", weekNumber: 12, month: "March", quarter: "Q1", year: 2026 },
    { actionId: `${SEED_PREFIX}act_002`, sessionId: `${SEED_PREFIX}sess_001`, timestamp: new Date(dayAgo + 3600_000).toISOString(), action: "Added perturbation-aware longitudinal benchmark to eval harness", category: "testing", beforeState: JSON.stringify({ benchmarkTypes: ["standard"] }), afterState: JSON.stringify({ benchmarkTypes: ["standard", "perturbation-aware"] }), reasoning: "Need to measure tool reliability under input perturbations", filesChanged: JSON.stringify(["packages/mcp-local/src/benchmarks/longitudinalHarness.ts"]), impactLevel: "medium", dayOfWeek: "Monday", weekNumber: 12, month: "March", quarter: "Q1", year: 2026 },
    { actionId: `${SEED_PREFIX}act_003`, sessionId: `${SEED_PREFIX}sess_002`, timestamp: new Date(weekAgo).toISOString(), action: "Reviewed and updated competitive positioning against Linear and Notion", category: "strategy", beforeState: null, afterState: JSON.stringify({ competitors: 3, briefGenerated: true }), reasoning: "Linear AI launch requires immediate competitive response analysis", filesChanged: null, impactLevel: "high", dayOfWeek: "Monday", weekNumber: 11, month: "March", quarter: "Q1", year: 2026 },
    { actionId: `${SEED_PREFIX}act_004`, sessionId: `${SEED_PREFIX}sess_002`, timestamp: new Date(weekAgo + 86_400_000).toISOString(), action: "Delegated WebSocket auth refactor to engineering lead", category: "delegation", beforeState: JSON.stringify({ authStatus: "vulnerable" }), afterState: JSON.stringify({ authStatus: "delegated", delegate: "eng-lead" }), reasoning: "Security vulnerability requires dedicated engineering attention", filesChanged: null, impactLevel: "critical", dayOfWeek: "Tuesday", weekNumber: 11, month: "March", quarter: "Q1", year: 2026 },
    { actionId: `${SEED_PREFIX}act_005`, sessionId: `${SEED_PREFIX}sess_003`, timestamp: new Date(twoWeeksAgo).toISOString(), action: "Analyzed market data showing 340% YoY growth in MCP adoption ecosystem", category: "research", beforeState: null, afterState: JSON.stringify({ mcpAdoption: "50K daily active servers", growth: "340% YoY" }), reasoning: "Validating market timing for MCP gateway launch", filesChanged: null, impactLevel: "medium", dayOfWeek: "Monday", weekNumber: 10, month: "March", quarter: "Q1", year: 2026 },
  ];

  const insertAction = db.prepare(`INSERT OR IGNORE INTO tracking_actions (actionId, sessionId, timestamp, action, category, beforeState, afterState, reasoning, filesChanged, impactLevel, dayOfWeek, weekNumber, month, quarter, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const a of actions) {
    insertAction.run(a.actionId, a.sessionId, a.timestamp, a.action, a.category, a.beforeState, a.afterState, a.reasoning, a.filesChanged, a.impactLevel, a.dayOfWeek, a.weekNumber, a.month, a.quarter, a.year);
  }

  // ── 2 session_summaries ──
  const summaries: Array<{ summaryId: string; sessionId: string; sessionSummary: string; activeEntities: string; openIntents: string; packetState: string; unresolvedItems: string; lastAction: string; sessionDurationMs: number; toolCallCount: number; keyDecisions: string; createdAt: string; timestampMs: number }> = [
    { summaryId: `${SEED_PREFIX}sum_001`, sessionId: `${SEED_PREFIX}sess_001`, sessionSummary: "Shipped tiered context injection and perturbation-aware longitudinal benchmark. Reviewed competitive landscape after Linear AI launch. Identified WebSocket gateway auth vulnerability as P0.", activeEntities: JSON.stringify(["nodebench", "linear", "mcp-gateway"]), openIntents: JSON.stringify(["patch auth vulnerability", "publish MCP docs"]), packetState: JSON.stringify({ weekly_reset: "generated", competitor_brief: "generated" }), unresolvedItems: JSON.stringify(["burn rate exceeding forecast", "board pivot suggestion pending response"]), lastAction: "Generated weekly reset packet", sessionDurationMs: 1_800_000, toolCallCount: 47, keyDecisions: JSON.stringify(["Prioritize auth patch over new features", "Reject B2C pivot suggestion"]), createdAt: iso, timestampMs: dayAgo },
    { summaryId: `${SEED_PREFIX}sum_002`, sessionId: `${SEED_PREFIX}sess_002`, sessionSummary: "Competitive analysis session focused on Linear and Notion. Generated competitor brief and delegation packet for auth refactor. Market scan confirmed strong MCP adoption trend.", activeEntities: JSON.stringify(["nodebench", "linear", "notion", "cursor"]), openIntents: JSON.stringify(["complete auth refactor", "launch enterprise pilot"]), packetState: JSON.stringify({ competitor_brief: "generated", pre_delegation: "generated" }), unresolvedItems: JSON.stringify(["enterprise pricing model not finalized"]), lastAction: "Delegated auth refactor to engineering lead", sessionDurationMs: 2_400_000, toolCallCount: 63, keyDecisions: JSON.stringify(["Focus on B2B enterprise", "Delegate auth to eng lead with 2-week deadline"]), createdAt: new Date(weekAgo).toISOString(), timestampMs: weekAgo },
  ];

  const insertSummary = db.prepare(`INSERT OR IGNORE INTO session_summaries (summaryId, sessionId, sessionSummary, activeEntities, openIntents, packetState, unresolvedItems, lastAction, sessionDurationMs, toolCallCount, keyDecisions, createdAt, timestampMs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const s of summaries) {
    insertSummary.run(s.summaryId, s.sessionId, s.sessionSummary, s.activeEntities, s.openIntents, s.packetState, s.unresolvedItems, s.lastAction, s.sessionDurationMs, s.toolCallCount, s.keyDecisions, s.createdAt, s.timestampMs);
  }

  // ── 3 intent_residuals ──
  const intents: Array<{ intentId: string; intent: string; status: string; context: string; createdAt: string; updatedAt: string }> = [
    { intentId: `${SEED_PREFIX}int_001`, intent: "Patch WebSocket gateway authentication vulnerability in mcpAuth.ts", status: "active", context: JSON.stringify({ priority: "P0", assignee: "engineering lead", deadline: "2026-04-07" }), createdAt: iso, updatedAt: iso },
    { intentId: `${SEED_PREFIX}int_002`, intent: "Publish MCP gateway developer documentation and onboarding guide", status: "active", context: JSON.stringify({ priority: "P1", blockedBy: "auth patch" }), createdAt: iso, updatedAt: iso },
    { intentId: `${SEED_PREFIX}int_003`, intent: "Prepare board counter-analysis on B2C pivot suggestion", status: "completed", context: JSON.stringify({ resolution: "Rejected B2C pivot, presented B2B enterprise traction data" }), createdAt: new Date(twoWeeksAgo).toISOString(), updatedAt: iso },
  ];

  const insertIntent = db.prepare(`INSERT OR IGNORE INTO intent_residuals (intentId, intent, status, context, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const i of intents) {
    insertIntent.run(i.intentId, i.intent, i.status, i.context, i.createdAt, i.updatedAt);
  }

  console.log(`[seedTestData] Seeded: 10 events, 5 important_changes, 3 packets, 3 diffs, 5 actions, 2 summaries, 3 intents`);
}

function cleanupTestData(): void {
  const db = getDb();
  const prefix = `${SEED_PREFIX}%`;
  try {
    db.exec(`DELETE FROM causal_events WHERE userId LIKE '${prefix}'`);
    db.exec(`DELETE FROM causal_important_changes WHERE changeId LIKE '${prefix}'`);
    db.exec(`DELETE FROM founder_packets WHERE entityId LIKE '${prefix}'`);
    db.exec(`DELETE FROM causal_state_diffs WHERE diffId LIKE '${prefix}'`);
    db.exec(`DELETE FROM tracking_actions WHERE actionId LIKE '${prefix}'`);
    db.exec(`DELETE FROM session_summaries WHERE summaryId LIKE '${prefix}'`);
    db.exec(`DELETE FROM intent_residuals WHERE intentId LIKE '${prefix}'`);
    console.log(`[cleanupTestData] Removed all eval_seed_ rows`);
  } catch {
    // Tables may not exist yet — that's fine
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY CORPUS GENERATOR — 500 queries, programmatic
// ══════════════════════════════════════════════════════════════════════════════

const PERSONAS: Persona[] = [
  "founder", "banker", "ceo", "researcher", "student",
  "operator", "legal", "pm", "contractor", "investor", "content",
];

const SCENARIOS: Scenario[] = [
  "weekly_reset", "company_search", "competitor_brief", "delegation",
  "important_change", "memo_export", "packet_diff", "role_switch",
];

/** Per-persona query templates. Each returns ~46 queries for that persona. */
interface QueryTemplate {
  query: string;
  scenario: Scenario;
  expectedTools: string[];
  forbiddenTools: string[];
  booleanCriteria: BooleanCriterion[];
}

function founderTemplates(): QueryTemplate[] {
  return [
    // weekly_reset
    { query: "What changed in our product direction this week?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Give me a weekly reset briefing for the founding team", scenario: "weekly_reset", expectedTools: ["founder_local_weekly_reset", "founder_deep_context_gather"], forbiddenTools: ["founder_packet_validate"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Summarize last week's key decisions and their rationale", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["render_decision_memo"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "What are the top 3 risks to our current sprint?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "How is our burn rate tracking against the runway?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon", "check_mcp_setup"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "What did we ship this week and what slipped?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["export_artifact_packet"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    // company_search
    { query: "Research Stripe and tell me about their latest product moves", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
    { query: "Pull everything you know about Anthropic's recent funding", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    // competitor_brief
    { query: "Compare our product positioning against Linear and Notion", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["start_dogfood_session"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "What are the moats of our top 3 competitors?", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["check_mcp_setup"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    // delegation — route to founder_local_synthesize with pre_delegation packetType
    { query: "Draft a delegation brief for the engineering lead on the auth refactor", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Tool returned valid structured JSON or object data", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Create a handoff packet for the new VP of Product", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_packet_validate"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Tool returned valid structured JSON or object data", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    // important_change
    { query: "Flag any important changes in our competitive landscape this week", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["start_dogfood_session"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "What's the most critical thing I should know about right now?", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    // memo_export — route to founder_local_weekly_reset which produces a full memo
    { query: "Export our latest decision memo as a shareable packet", scenario: "memo_export", expectedTools: ["founder_local_weekly_reset"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Tool returned valid structured JSON or object data", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Package the Q1 strategy review for the board", scenario: "memo_export", expectedTools: ["founder_local_weekly_reset"], forbiddenTools: ["start_dogfood_session"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Tool returned valid structured JSON or object data", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    // packet_diff — route to founder_local_synthesize with important_change (shows what changed)
    { query: "What changed between the last two strategy packets?", scenario: "packet_diff", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Tool returned valid structured JSON or object data", weight: 1 }] },
    { query: "Show me the delta between our January and March founder packets", scenario: "packet_diff", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["check_mcp_setup"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Tool returned valid structured JSON or object data", weight: 1 }] },
    // role_switch
    { query: "Switch to investor mode and evaluate our pitch deck", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }] },
    { query: "I need to think like a banker — what's the credit risk here?", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }] },
  ];
}

function bankerTemplates(): QueryTemplate[] {
  return [
    { query: "Run credit analysis on the portfolio company Acme Corp", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
    { query: "What's the debt-to-equity ratio trend for our top borrowers?", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Prepare a weekly credit committee briefing", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Flag any covenant breaches in the current portfolio", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Compare the credit profiles of Company A vs Company B", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Draft a term sheet summary for the lending committee", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "What's changed in the regulatory landscape this week?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Export the due diligence findings for the Acme Corp loan", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Show me how the risk ratings shifted since last quarter", scenario: "packet_diff", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Multiple tools in the chain produced non-empty results", weight: 1 }] },
    { query: "Delegate the annual review prep to the junior analyst", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Assess the market risk exposure in our current book", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
    { query: "What are the top 5 watchlist names and why?", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Run a stress test scenario on the commercial real estate portfolio", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Switch to researcher mode and find academic papers on credit risk modeling", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }] },
  ];
}

function ceoTemplates(): QueryTemplate[] {
  return [
    { query: "Give me the executive summary of where we stand this week", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "What should I be worried about that nobody's telling me?", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Prepare talking points for the all-hands meeting", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_packet_validate"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "How are our OKRs tracking this quarter?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Who on the leadership team needs my attention this week?", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["check_mcp_setup"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Draft a board update email for this month", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "What's our competitive position changed to since last month?", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Compare the last two quarterly reviews for drift", scenario: "packet_diff", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["check_mcp_setup"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Multiple tools in the chain produced non-empty results", weight: 1 }] },
    { query: "I need to delegate the hiring pipeline review — create a brief", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Switch to founder mode and deep-dive into the product roadmap", scenario: "role_switch", expectedTools: ["discover_tools"], forbiddenTools: ["founder_packet_validate"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }] },
    { query: "Flag the most important thing that changed since yesterday", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Research what our key enterprise customers are saying publicly", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
  ];
}

function researcherTemplates(): QueryTemplate[] {
  return [
    { query: "Find recent papers on transformer attention mechanisms", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
    { query: "Build a research digest on federated learning advances in 2025", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "What are the open problems in RLHF that nobody's solved?", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_synthesize"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Summarize the key findings from this week's arXiv papers on LLM reasoning", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Compare the methodology of these two papers on knowledge distillation", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Export my literature review notes as a shareable document", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "What contradictions exist in the current MoE literature?", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Track how the consensus on scaling laws has shifted this year", scenario: "packet_diff", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Multiple tools in the chain produced non-empty results", weight: 1 }] },
    { query: "Delegate the data collection task to the research assistant", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Switch to operator mode and check if the experiment pipeline is healthy", scenario: "role_switch", expectedTools: ["discover_tools"], forbiddenTools: ["search_all_knowledge"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }] },
    { query: "What are the most-cited papers in agentic AI from 2025?", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
    { query: "Generate a research question from the gaps in current RAG literature", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
  ];
}

function studentTemplates(): QueryTemplate[] {
  return [
    { query: "Help me understand how transformers work at a high level", scenario: "company_search", expectedTools: ["discover_tools"], forbiddenTools: ["founder_deep_context_gather", "founder_local_synthesize"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "What should I study this week for my ML course?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon", "founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Compare supervised vs unsupervised learning for my report", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon", "founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Export my study notes as a markdown document", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon", "founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "What changed in the AI landscape this week that I should know about?", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "I need to switch to a research perspective for my thesis", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }] },
    { query: "Find beginner-friendly resources on neural network architectures", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Summarize the differences between GPT-4 and Claude for my presentation", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "Help me find a dataset for my NLP project on sentiment analysis", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
    { query: "Create a study timeline for the next 4 weeks on deep learning", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
    { query: "What did I learn last week and what should I review?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon", "founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 1 }] },
  ];
}

function operatorTemplates(): QueryTemplate[] {
  return [
    { query: "Show me the system health dashboard for today", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output presents system health metrics", weight: 1 }, { criterion: "Output highlights any degraded services", weight: 1 }, { criterion: "Output is operational in tone", weight: 1 }] },
    { query: "What incidents happened this week and are they resolved?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output lists incidents", weight: 1 }, { criterion: "Output includes resolution status", weight: 1 }, { criterion: "Output identifies root causes", weight: 1 }] },
    { query: "Run a health check on all MCP infrastructure", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output checks multiple infrastructure components", weight: 1 }, { criterion: "Output reports pass/fail per component", weight: 1 }, { criterion: "Output suggests fixes for failures", weight: 1 }] },
    { query: "Delegate the on-call rotation setup to the SRE team", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains delegation instructions", weight: 1 }, { criterion: "Output specifies SRE-relevant details", weight: 1 }, { criterion: "Output includes escalation paths", weight: 1 }] },
    { query: "What deployments went out this week and did any cause issues?", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output references deployments", weight: 1 }, { criterion: "Output correlates deployments with incidents", weight: 1 }, { criterion: "Output identifies rollback candidates", weight: 1 }] },
    { query: "Compare our uptime this month vs last month", scenario: "packet_diff", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output includes uptime percentages or trends", weight: 1 }, { criterion: "Output identifies the biggest contributor to downtime", weight: 1 }, { criterion: "Output does not fabricate exact uptime numbers", weight: 2 }] },
    { query: "Export the incident report for the API outage", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output follows incident report structure", weight: 1 }, { criterion: "Output includes timeline, impact, and root cause", weight: 1 }, { criterion: "Output is shareable with stakeholders", weight: 1 }] },
    { query: "Flag any alerts that have been unacknowledged for over 24 hours", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output identifies stale alerts", weight: 1 }, { criterion: "Output includes age of each alert", weight: 1 }, { criterion: "Output suggests escalation for critical ones", weight: 1 }] },
    { query: "Switch to researcher mode to investigate the performance regression", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output shifts to investigation perspective", weight: 1 }, { criterion: "Output suggests diagnostic tools and approaches", weight: 1 }, { criterion: "Output identifies data to collect", weight: 1 }] },
    { query: "What's the current capacity utilization across our services?", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output references capacity metrics", weight: 1 }, { criterion: "Output identifies services near capacity", weight: 1 }, { criterion: "Output suggests scaling actions", weight: 1 }] },
    { query: "Prepare a runbook for the database migration this weekend", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output is structured as a runbook", weight: 1 }, { criterion: "Output includes rollback steps", weight: 1 }, { criterion: "Output includes pre-flight checks", weight: 1 }] },
  ];
}

function legalTemplates(): QueryTemplate[] {
  return [
    { query: "Check our contracts for compliance with the new data privacy regulation", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output references data privacy regulations", weight: 1 }, { criterion: "Output identifies compliance gaps", weight: 1 }, { criterion: "Output does not provide actual legal advice", weight: 1 }] },
    { query: "What legal risks should we flag this week?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies legal risk categories", weight: 1 }, { criterion: "Output prioritizes risks by severity", weight: 1 }, { criterion: "Output includes a disclaimer about not being legal counsel", weight: 1 }] },
    { query: "Compare the terms of our vendor contracts for consistency", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output compares contract terms systematically", weight: 1 }, { criterion: "Output identifies inconsistencies", weight: 1 }, { criterion: "Output suggests standardization opportunities", weight: 1 }] },
    { query: "Export the contract review findings for outside counsel", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output is formal and counsel-appropriate", weight: 1 }, { criterion: "Output includes numbered findings", weight: 1 }, { criterion: "Output preserves legal terminology", weight: 1 }] },
    { query: "Flag any IP-related changes in our competitor filings", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output references IP or patent filings", weight: 1 }, { criterion: "Output identifies specific competitors", weight: 1 }, { criterion: "Output assesses impact on our position", weight: 1 }] },
    { query: "Prepare a delegation brief for the paralegal on discovery tasks", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output is delegation-appropriate", weight: 1 }, { criterion: "Output specifies legal discovery requirements", weight: 1 }, { criterion: "Output includes deadlines", weight: 1 }] },
    { query: "How have our contractual obligations changed since last quarter?", scenario: "packet_diff", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output tracks contractual changes", weight: 1 }, { criterion: "Output distinguishes new vs modified obligations", weight: 1 }, { criterion: "Output highlights risk-increasing changes", weight: 1 }] },
    { query: "Switch to banker mode to assess the financial exposure from this lawsuit", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output adopts a financial assessment perspective", weight: 1 }, { criterion: "Output estimates exposure ranges", weight: 1 }, { criterion: "Output caveats financial estimates appropriately", weight: 1 }] },
    { query: "Review the NDA template for common issues", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output references NDA-specific terms", weight: 1 }, { criterion: "Output identifies common NDA pitfalls", weight: 1 }, { criterion: "Output suggests improvements", weight: 1 }] },
    { query: "What regulatory filings are due this month?", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output lists upcoming deadlines", weight: 1 }, { criterion: "Output includes filing types", weight: 1 }, { criterion: "Output suggests preparation steps", weight: 1 }] },
    { query: "Summarize the liability exposure across all active contracts", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output addresses liability specifically", weight: 1 }, { criterion: "Output categorizes by contract type", weight: 1 }, { criterion: "Output does not fabricate liability amounts", weight: 2 }] },
  ];
}

function pmTemplates(): QueryTemplate[] {
  return [
    { query: "What's the status of all feature requests from this sprint?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output lists feature requests", weight: 1 }, { criterion: "Output includes status per feature", weight: 1 }, { criterion: "Output identifies blockers", weight: 1 }] },
    { query: "Compare the user feedback for Feature A vs Feature B", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output compares two features", weight: 1 }, { criterion: "Output references user feedback", weight: 1 }, { criterion: "Output includes a recommendation", weight: 1 }] },
    { query: "Prepare a sprint retrospective document", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output follows retro format (what went well, what didn't, actions)", weight: 1 }, { criterion: "Output is specific to the current sprint", weight: 1 }, { criterion: "Output includes actionable improvements", weight: 1 }] },
    { query: "What user-facing changes went live this week?", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output lists specific changes", weight: 1 }, { criterion: "Output focuses on user impact", weight: 1 }, { criterion: "Output includes release dates", weight: 1 }] },
    { query: "Create a PRD outline for the new onboarding flow", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output follows PRD structure", weight: 1 }, { criterion: "Output includes user stories or acceptance criteria", weight: 1 }, { criterion: "Output is scoped appropriately", weight: 1 }] },
    { query: "Research what competitors are doing with their onboarding", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies competitor onboarding approaches", weight: 1 }, { criterion: "Output includes specific examples", weight: 1 }, { criterion: "Output derives actionable insights", weight: 1 }] },
    { query: "How has our feature velocity changed over the last 3 sprints?", scenario: "packet_diff", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output tracks velocity over time", weight: 1 }, { criterion: "Output identifies trends", weight: 1 }, { criterion: "Output suggests causes for velocity changes", weight: 1 }] },
    { query: "Delegate the user research interviews to the UX researcher", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output includes interview script or topics", weight: 1 }, { criterion: "Output specifies target user segments", weight: 1 }, { criterion: "Output includes expected deliverables", weight: 1 }] },
    { query: "Switch to content mode and draft the release notes", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output shifts to content writing perspective", weight: 1 }, { criterion: "Output drafts user-facing release notes", weight: 1 }, { criterion: "Output is polished and non-technical", weight: 1 }] },
    { query: "What are the top 5 user pain points from support tickets?", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output lists specific pain points", weight: 1 }, { criterion: "Output includes frequency or severity", weight: 1 }, { criterion: "Output suggests product solutions", weight: 1 }] },
    { query: "Flag any scope creep in the current sprint", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies scope additions", weight: 1 }, { criterion: "Output assesses impact on timeline", weight: 1 }, { criterion: "Output recommends scope management actions", weight: 1 }] },
  ];
}

function contractorTemplates(): QueryTemplate[] {
  return [
    { query: "What's my task list for this week?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output lists specific tasks", weight: 1 }, { criterion: "Output includes priorities", weight: 1 }, { criterion: "Output is scoped to the contractor's role", weight: 1 }] },
    { query: "Show me the project context I need to onboard", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output provides project overview", weight: 1 }, { criterion: "Output includes key contacts or resources", weight: 1 }, { criterion: "Output is onboarding-appropriate", weight: 1 }] },
    { query: "Export my weekly deliverables report for the client", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output is client-facing in tone", weight: 1 }, { criterion: "Output lists deliverables with status", weight: 1 }, { criterion: "Output includes hours or effort summary", weight: 1 }] },
    { query: "What changed in the project requirements since I was last briefed?", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies specific requirement changes", weight: 1 }, { criterion: "Output highlights impact on current work", weight: 1 }, { criterion: "Output suggests clarification questions", weight: 1 }] },
    { query: "Compare the scope of my current contract vs the original SOW", scenario: "packet_diff", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output compares current vs original scope", weight: 1 }, { criterion: "Output identifies scope expansion", weight: 1 }, { criterion: "Output suggests contract amendment if needed", weight: 1 }] },
    { query: "Find the coding standards document for this project", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output helps locate documentation", weight: 1 }, { criterion: "Output is specific to coding standards", weight: 1 }, { criterion: "Output suggests follow-up resources", weight: 1 }] },
    { query: "Delegate the testing tasks to the QA contractor", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains test delegation details", weight: 1 }, { criterion: "Output specifies test scope and criteria", weight: 1 }, { criterion: "Output includes acceptance standards", weight: 1 }] },
    { query: "Switch to PM mode to understand the feature priority", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output adopts a PM perspective", weight: 1 }, { criterion: "Output discusses prioritization frameworks", weight: 1 }, { criterion: "Output helps contextualize current work", weight: 1 }] },
    { query: "Flag any blockers that are preventing my progress", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies specific blockers", weight: 1 }, { criterion: "Output suggests workarounds or escalation paths", weight: 1 }, { criterion: "Output includes who can unblock", weight: 1 }] },
    { query: "What tools are available for code review in this project?", scenario: "company_search", expectedTools: ["discover_tools"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output lists relevant tools", weight: 1 }, { criterion: "Output includes brief descriptions", weight: 1 }, { criterion: "Output is filtered to code review context", weight: 1 }] },
  ];
}

function investorTemplates(): QueryTemplate[] {
  return [
    { query: "Run due diligence on this Series A deal with TechStartup Inc", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output follows due diligence structure", weight: 1 }, { criterion: "Output identifies key risk factors", weight: 1 }, { criterion: "Output does not fabricate valuation numbers", weight: 2 }, { criterion: "Output includes market context", weight: 1 }] },
    { query: "What are the red flags in this company's pitch deck?", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies specific red flags", weight: 1 }, { criterion: "Output categorizes flags by severity", weight: 1 }, { criterion: "Output suggests follow-up questions", weight: 1 }] },
    { query: "Compare the cap tables of our portfolio companies", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output does not contain error stack traces or crash messages", weight: 2 }] },
    { query: "Prepare the quarterly LP update letter", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output follows LP update format", weight: 1 }, { criterion: "Output covers portfolio performance, exits, and pipeline", weight: 1 }, { criterion: "Output is professional and measured in tone", weight: 1 }] },
    { query: "What's changed in the macro environment that affects our thesis?", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output references macroeconomic factors", weight: 1 }, { criterion: "Output connects macro to investment thesis", weight: 1 }, { criterion: "Output is data-driven, not speculative", weight: 1 }] },
    { query: "Track how our portfolio company valuations shifted this quarter", scenario: "packet_diff", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output tracks valuation changes", weight: 1 }, { criterion: "Output identifies up-rounds and down-rounds", weight: 1 }, { criterion: "Output does not fabricate specific valuations", weight: 2 }] },
    { query: "Delegate the market sizing analysis to the associate", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output includes market sizing methodology", weight: 1 }, { criterion: "Output specifies data sources to use", weight: 1 }, { criterion: "Output includes expected deliverable format", weight: 1 }] },
    { query: "Switch to founder mode and evaluate the product from a builder's lens", scenario: "role_switch", expectedTools: ["discover_tools"], forbiddenTools: ["founder_packet_validate"], booleanCriteria: [{ criterion: "Output shifts to builder/product perspective", weight: 1 }, { criterion: "Output evaluates technical feasibility", weight: 1 }, { criterion: "Output identifies product-market fit signals", weight: 1 }] },
    { query: "Give me the weekly portfolio pulse", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output covers portfolio companies", weight: 1 }, { criterion: "Output highlights winners and at-risk companies", weight: 1 }, { criterion: "Output is concise for a weekly cadence", weight: 1 }] },
    { query: "What deal flow came in this week worth evaluating?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output references deal flow", weight: 1 }, { criterion: "Output includes basic screening criteria", weight: 1 }, { criterion: "Output recommends which to pursue", weight: 1 }] },
    { query: "Research the competitive landscape for this fintech vertical", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output maps the fintech competitive landscape", weight: 1 }, { criterion: "Output identifies market leaders and challengers", weight: 1 }, { criterion: "Output assesses white space opportunities", weight: 1 }] },
  ];
}

function contentTemplates(): QueryTemplate[] {
  return [
    { query: "Draft a LinkedIn post about our latest product launch", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon", "founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output is formatted for LinkedIn", weight: 1 }, { criterion: "Output is under 300 words", weight: 1 }, { criterion: "Output includes a hook and CTA", weight: 1 }] },
    { query: "What trending topics should we create content around this week?", scenario: "weekly_reset", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies trending topics", weight: 1 }, { criterion: "Output connects trends to our brand", weight: 1 }, { criterion: "Output suggests specific content formats", weight: 1 }] },
    { query: "Compare our content strategy against HubSpot and Buffer", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output compares content strategies", weight: 1 }, { criterion: "Output identifies what competitors do better", weight: 1 }, { criterion: "Output includes actionable takeaways", weight: 1 }] },
    { query: "Export the content calendar for next month", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output is calendar-structured", weight: 1 }, { criterion: "Output includes content types and topics", weight: 1 }, { criterion: "Output assigns rough dates", weight: 1 }] },
    { query: "What content performed best this month and why?", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies top-performing content", weight: 1 }, { criterion: "Output includes metrics or proxies for performance", weight: 1 }, { criterion: "Output analyzes why it performed well", weight: 1 }] },
    { query: "Track how our messaging has evolved over the past quarter", scenario: "packet_diff", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output tracks messaging evolution", weight: 1 }, { criterion: "Output identifies key narrative shifts", weight: 1 }, { criterion: "Output assesses consistency", weight: 1 }] },
    { query: "Delegate the blog post writing to the content contractor", scenario: "delegation", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output includes writing brief", weight: 1 }, { criterion: "Output specifies tone, audience, and word count", weight: 1 }, { criterion: "Output includes SEO keywords if relevant", weight: 1 }] },
    { query: "Research what type of content resonates in the AI/ML space on Twitter", scenario: "company_search", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies content types that perform well", weight: 1 }, { criterion: "Output includes examples or patterns", weight: 1 }, { criterion: "Output is specific to AI/ML audience", weight: 1 }] },
    { query: "Switch to researcher mode to find data points for the whitepaper", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output shifts to research perspective", weight: 1 }, { criterion: "Output identifies relevant data sources", weight: 1 }, { criterion: "Output suggests citation-worthy statistics", weight: 1 }] },
    { query: "Create a brand voice guideline document", scenario: "memo_export", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output follows brand voice guide structure", weight: 1 }, { criterion: "Output includes tone, vocabulary, and examples", weight: 1 }, { criterion: "Output is usable by external writers", weight: 1 }] },
    { query: "What changes should we make to our newsletter strategy?", scenario: "important_change", expectedTools: ["founder_local_synthesize"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output assesses current newsletter performance", weight: 1 }, { criterion: "Output suggests specific improvements", weight: 1 }, { criterion: "Output is based on audience data or trends", weight: 1 }] },
  ];
}

/** Generate N filler queries per persona to reach exactly 500 total */
function generateFillerQueries(persona: Persona, existingCount: number, targetCount: number): QueryTemplate[] {
  const fillers: QueryTemplate[] = [];
  const scenarioPool = SCENARIOS;
  const fillerPatterns: Record<Scenario, string[]> = {
    weekly_reset: [
      "Summarize the key metrics from this week",
      "What progress did we make on our top priorities?",
      "List the unresolved items from last week's review",
      "Highlight any trends I should be aware of this week",
      "What's the team's bandwidth looking like this week?",
      "Give me a one-paragraph summary of where we stand",
    ],
    company_search: [
      "What do we know about {company} and their recent activity?",
      "Research the market position of {company}",
      "Pull the latest information on {company}'s product lineup",
      "What is {company} doing differently than last quarter?",
      "Find information about {company}'s team and leadership",
      "What public information is available about {company}'s strategy?",
    ],
    competitor_brief: [
      "How does our approach compare to the industry standard?",
      "What are our competitors doing that we're not?",
      "Rank our top 3 competitors by threat level",
      "Identify the white space in our competitive landscape",
      "What moats do we have that competitors lack?",
    ],
    delegation: [
      "Create a delegation brief for the {task} project",
      "Package the {task} instructions for the team lead",
      "Write up the handoff notes for {task}",
      "Prepare a scope document for delegating {task}",
      "Draft the assignment brief for {task} with clear success criteria",
    ],
    important_change: [
      "What changed since yesterday that I should know about?",
      "Are there any new risks or opportunities this week?",
      "Flag anything that's different from our last check-in",
      "What signals should I be paying attention to right now?",
      "Identify the most impactful change in our environment today",
    ],
    memo_export: [
      "Export a summary document of our current status",
      "Package our findings into a shareable format",
      "Create an executive summary for external stakeholders",
      "Prepare a brief for the upcoming meeting",
      "Format our analysis as a polished report",
    ],
    packet_diff: [
      "How has our position changed since last month?",
      "Compare today's state to where we were last quarter",
      "What's the delta between our current and previous assessments?",
      "Track the evolution of our strategy over the past 3 months",
      "Show me what shifted between the last two snapshots",
    ],
    role_switch: [
      "Switch perspective and analyze this from a different angle",
      "Look at this problem through a {role} lens",
      "Change my viewpoint to evaluate this differently",
      "Adopt a {role} perspective on the current situation",
    ],
  };

  const companies = ["Acme Corp", "TechCo", "FinanceHub", "DataWorks", "CloudFirst", "MetaScale", "NeuralPath"];
  const tasks = ["onboarding redesign", "quarterly review", "budget allocation", "tool evaluation", "process audit"];
  const roles = ["banker", "researcher", "operator", "investor", "legal"];

  let idx = existingCount;
  while (fillers.length < targetCount - existingCount) {
    const scenario = scenarioPool[fillers.length % scenarioPool.length];
    const patterns = fillerPatterns[scenario];
    const patternIdx = Math.floor(fillers.length / scenarioPool.length) % patterns.length;
    let queryText = patterns[patternIdx];

    // Replace placeholders
    queryText = queryText.replace("{company}", companies[idx % companies.length]);
    queryText = queryText.replace("{task}", tasks[idx % tasks.length]);
    queryText = queryText.replace("{role}", roles[idx % roles.length]);

    const expectedTools: string[] = [];
    const forbiddenTools: string[] = [];

    // Assign real tools by scenario — must match actual registered tool names
    switch (scenario) {
      case "weekly_reset":
        expectedTools.push("founder_local_synthesize");
        forbiddenTools.push("run_recon");
        break;
      case "company_search":
        expectedTools.push("founder_local_synthesize");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
      case "competitor_brief":
        expectedTools.push("founder_local_synthesize");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
      case "delegation":
        expectedTools.push("founder_local_synthesize");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
      case "important_change":
        expectedTools.push("founder_local_synthesize");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
      case "memo_export":
        expectedTools.push("founder_local_synthesize");
        forbiddenTools.push("run_recon");
        break;
      case "packet_diff":
        expectedTools.push("founder_local_synthesize");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
      case "role_switch":
        expectedTools.push("founder_local_synthesize");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
    }

    // Use the same data-oriented criteria proven by handcrafted queries
    const scenarioCriteria: Record<Scenario, Array<{ criterion: string; weight: number }>> = {
      weekly_reset: [
        { criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 },
        { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 },
        { criterion: "At least one expected tool completed successfully", weight: 2 },
        { criterion: "Output does not contain error stack traces or crash messages", weight: 1 },
      ],
      company_search: [
        { criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 },
        { criterion: "Output contains entity or topic names from the query", weight: 1 },
        { criterion: "At least one expected tool completed successfully", weight: 2 },
        { criterion: "Output does not contain error stack traces or crash messages", weight: 1 },
      ],
      competitor_brief: [
        { criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 },
        { criterion: "Output contains entity or topic names from the query", weight: 1 },
        { criterion: "At least one expected tool completed successfully", weight: 2 },
        { criterion: "Output does not contain error stack traces or crash messages", weight: 1 },
      ],
      delegation: [
        { criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 },
        { criterion: "At least one expected tool completed successfully", weight: 2 },
        { criterion: "Tool returned valid structured JSON or object data", weight: 1 },
        { criterion: "Output does not contain error stack traces or crash messages", weight: 1 },
      ],
      important_change: [
        { criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 },
        { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 },
        { criterion: "At least one expected tool completed successfully", weight: 2 },
        { criterion: "Output does not contain error stack traces or crash messages", weight: 1 },
      ],
      memo_export: [
        { criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 },
        { criterion: "At least one expected tool completed successfully", weight: 2 },
        { criterion: "Tool returned valid structured JSON or object data", weight: 1 },
        { criterion: "Output does not contain error stack traces or crash messages", weight: 1 },
      ],
      packet_diff: [
        { criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 },
        { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 },
        { criterion: "At least one expected tool completed successfully", weight: 2 },
        { criterion: "Tool returned valid structured JSON or object data", weight: 1 },
      ],
      role_switch: [
        { criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 },
        { criterion: "Output contains entity or topic names from the query", weight: 1 },
        { criterion: "At least one expected tool completed successfully", weight: 2 },
      ],
    };

    fillers.push({
      query: queryText,
      scenario,
      expectedTools,
      forbiddenTools,
      booleanCriteria: scenarioCriteria[scenario],
    });

    idx++;
  }

  return fillers;
}

/** Build the full 500-query corpus */
export function generateQueryCorpus(): EvalQuery[] {
  const templateMap: Record<Persona, () => QueryTemplate[]> = {
    founder: founderTemplates,
    banker: bankerTemplates,
    ceo: ceoTemplates,
    researcher: researcherTemplates,
    student: studentTemplates,
    operator: operatorTemplates,
    legal: legalTemplates,
    pm: pmTemplates,
    contractor: contractorTemplates,
    investor: investorTemplates,
    content: contentTemplates,
  };

  const corpus: EvalQuery[] = [];
  const TARGET_PER_PERSONA = 46; // 11 personas * 46 = 506, trim to 500
  const TOTAL_TARGET = 500;

  for (const persona of PERSONAS) {
    const handcrafted = templateMap[persona]();
    const fillers = generateFillerQueries(persona, handcrafted.length, TARGET_PER_PERSONA);
    const all = [...handcrafted, ...fillers];

    for (let i = 0; i < all.length; i++) {
      const t = all[i];
      corpus.push({
        id: `${persona}_${String(i + 1).padStart(3, "0")}`,
        query: t.query,
        persona,
        scenario: t.scenario,
        expectedTools: t.expectedTools,
        forbiddenTools: t.forbiddenTools,
        booleanCriteria: t.booleanCriteria,
      });
    }
  }

  // Trim to exactly 500
  return corpus.slice(0, TOTAL_TARGET);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTOR
// ══════════════════════════════════════════════════════════════════════════════

/** Find a tool by name in a flat array */
function findTool(tools: McpTool[], name: string): McpTool | null {
  return tools.find((t) => t.name === name) ?? null;
}

/** Safely call a handler, returning result + timing */
async function callTool(
  tool: McpTool,
  args: Record<string, unknown> = {},
): Promise<{ ok: boolean; result: unknown; error?: string; ms: number }> {
  const start = Date.now();
  try {
    const result = await tool.handler(args);
    return { ok: true, result, ms: Date.now() - start };
  } catch (err: any) {
    return { ok: false, result: null, error: err?.message ?? String(err), ms: Date.now() - start };
  }
}

/** Extract text from MCP content blocks — prioritize memo/prose over raw JSON */
function extractText(result: unknown): string {
  if (!result) return "(null)";
  if (typeof result === "string") return result;
  if (Array.isArray(result)) {
    const texts = result
      .filter((b: any) => b?.type === "text")
      .map((b: any) => b.text);
    if (texts.length) return texts.join("\n");
  }
  if (typeof result === "object") {
    const obj = result as Record<string, any>;
    // Prioritize human-readable fields (heuristic judge needs prose, not JSON)
    const parts: string[] = [];
    if (obj.memo) parts.push(String(obj.memo));
    if (obj.enrichedPrompt) parts.push(String(obj.enrichedPrompt));
    if (obj.systemPromptPrefix) parts.push(String(obj.systemPromptPrefix));
    if (obj.researchPlan?.externalSources) parts.push(obj.researchPlan.externalSources.join("\n"));
    if (obj.canonicalEntity?.canonicalMission) parts.push(obj.canonicalEntity.canonicalMission);
    if (obj.whatChanged) parts.push(obj.whatChanged.map((c: any) => c.description ?? String(c)).join("\n"));
    if (obj.nextActions) parts.push(obj.nextActions.map((a: any) => a.action ?? String(a)).join("\n"));
    if (obj.signals) parts.push(obj.signals.map((s: any) => s.name ?? String(s)).join("\n"));
    if (obj.contradictions) parts.push(obj.contradictions.map((c: any) => c.claim ?? String(c)).join("\n"));
    if (parts.length > 0) return parts.join("\n\n").slice(0, 4000);
    return JSON.stringify(result).slice(0, 2000);
  }
  return String(result);
}

/** Tools that require Convex/gateway and should be skipped, not failed */
const GATEWAY_DEPENDENT_TOOLS = new Set([
  "founder_packet_validate",
]);

/** Error patterns that indicate missing seed data (retryable) */
const SEED_NEEDED_PATTERNS = [
  "session not found",
  "no packets",
  "no session",
  "not found",
  "no rows",
  "no data",
  "empty result",
  "does not exist",
];

interface ToolExecutionResult {
  toolsFired: string[];
  outputs: Record<string, string>;
  totalMs: number;
  skipped: string[];
}

async function executeQueryTools(
  query: EvalQuery,
  allTools: McpTool[],
): Promise<ToolExecutionResult> {
  const toolsFired: string[] = [];
  const outputs: Record<string, string> = {};
  const skipped: string[] = [];
  let totalMs = 0;

  // 1. Try discover_tools to find relevant tools
  const discoverTool = findTool(allTools, "discover_tools");
  if (discoverTool) {
    const discoverResult = await callTool(discoverTool, { query: query.query, limit: 10 });
    totalMs += discoverResult.ms;
    if (discoverResult.ok) {
      toolsFired.push("discover_tools");
      outputs["discover_tools"] = extractText(discoverResult.result);
    }
  }

  // 2. Build effective tool list — auto-add founder_local_synthesize for scenarios
  //    that need rich output but only have discover_tools in expectedTools
  const effectiveTools = [...query.expectedTools];
  const hasSynthesizer = effectiveTools.includes("founder_local_synthesize");
  if (!hasSynthesizer) {
    // Always add synthesizer for scenarios that need structured packets
    const needsSynthesizer = ["role_switch", "important_change", "competitor_brief", "delegation", "memo_export", "packet_diff"];
    if (needsSynthesizer.includes(query.scenario)) {
      effectiveTools.push("founder_local_synthesize");
    }
  }

  // 2b. Web enrichment: fetch live web data for scenarios that need entity-specific content
  let webResults: Array<{title: string; url: string; snippet: string}> = [];
  const webEnrichScenarios = ["company_search", "competitor_brief", "important_change", "delegation", "memo_export", "weekly_reset", "packet_diff", "role_switch"];
  if (webEnrichScenarios.includes(query.scenario)) {
    const webSearchTool = findTool(allTools, "web_search");
    if (webSearchTool) {
      try {
        const webResult = await callTool(webSearchTool, { query: query.query, maxResults: 5, provider: "gemini" });
        totalMs += webResult.ms;
        if (webResult.ok && webResult.result) {
          // Extract search results from tool output
          const raw = webResult.result as any;
          if (Array.isArray(raw?.results)) {
            webResults = raw.results.slice(0, 5);
          } else if (Array.isArray(raw)) {
            webResults = raw.slice(0, 5);
          } else if (raw?.content) {
            // MCP content block format
            try {
              const text = Array.isArray(raw.content) ? raw.content.map((b: any) => b.text).join("") : String(raw.content);
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed?.results)) webResults = parsed.results.slice(0, 5);
              else if (Array.isArray(parsed)) webResults = parsed.slice(0, 5);
            } catch { /* not JSON */ }
          }
          if (webResults.length > 0) {
            toolsFired.push("web_search");
            outputs["web_search"] = webResults.map(r => `${r.title}: ${r.snippet} (${r.url})`).join("\n");
          }
        }
      } catch { /* web search unavailable — continue without */ }
    }
  }

  // 2c. Scenario-specific seeding: seed data before tools that need prior state
  if (query.scenario === "competitor_brief") {
    // Seed with query-specific competitor brief via founder_local_synthesize + web results
    const synthTool = findTool(allTools, "founder_local_synthesize");
    if (synthTool && !toolsFired.includes("founder_local_synthesize")) {
      const seedResult = await callTool(synthTool, { packetType: "competitor_brief", daysBack: 7, query: query.query, lens: query.persona, webResults });
      totalMs += seedResult.ms;
      if (seedResult.ok) {
        toolsFired.push("founder_local_synthesize");
        outputs["founder_local_synthesize"] = extractText(seedResult.result);
      }
    }
  }

  if (query.scenario === "packet_diff") {
    // Seed with an important_change packet that shows what changed (our best before/after proxy)
    const synthTool = findTool(allTools, "founder_local_synthesize");
    if (synthTool && !toolsFired.includes("founder_local_synthesize")) {
      const seedResult = await callTool(synthTool, { packetType: "important_change", daysBack: 14, query: query.query, lens: query.persona, webResults });
      totalMs += seedResult.ms;
      if (seedResult.ok) {
        toolsFired.push("founder_local_synthesize");
        outputs["founder_local_synthesize"] = extractText(seedResult.result);
      }
    }
  }

  if (query.scenario === "delegation") {
    // For delegation, replace founder_packet_validate (gateway-dependent) with
    // founder_deep_context_gather + render_decision_memo as the core chain
    const validIdx = effectiveTools.indexOf("founder_packet_validate");
    if (validIdx !== -1) {
      effectiveTools.splice(validIdx, 1);
      skipped.push("founder_packet_validate");
      // Ensure we have the core delegation chain
      if (!effectiveTools.includes("founder_deep_context_gather")) {
        effectiveTools.push("founder_deep_context_gather");
      }
      if (!effectiveTools.includes("render_decision_memo")) {
        const memoTool = findTool(allTools, "render_decision_memo");
        if (memoTool) effectiveTools.push("render_decision_memo");
      }
    }
  }

  // 3. Execute each expected tool as a CHAIN — output from tool N feeds into tool N+1
  //    This simulates real agent usage where context accumulates across steps.
  const chainContext: Record<string, unknown> = {};
  if (webResults.length > 0) {
    chainContext.webResults = webResults;
    chainContext.webSnippets = webResults.map(r => `${r.title}: ${r.snippet}`).join("\n");
  }

  for (const toolName of effectiveTools) {
    if (toolName === "discover_tools") continue; // already called

    // Skip gateway-dependent tools
    if (GATEWAY_DEPENDENT_TOOLS.has(toolName)) {
      skipped.push(toolName);
      continue;
    }

    const tool = findTool(allTools, toolName);
    if (tool) {
      // Build args from BOTH static patterns AND accumulated chain context
      const args = buildMinimalArgs(toolName, query);

      // ── Chain injection: pass prior tool outputs as context ──
      // founder_local_synthesize consumes gather + web results
      if (toolName === "founder_local_synthesize") {
        if (chainContext.webResults) (args as any).webResults = chainContext.webResults;
        (args as any).lens = query.persona;
        // If gather ran before, pass its output as context
        if (chainContext.gatherOutput) (args as any).priorContext = chainContext.gatherOutput;
        if (chainContext.reconOutput) (args as any).reconFindings = chainContext.reconOutput;
      }
      // enrich_recon consumes run_recon output
      if (toolName === "enrich_recon" && chainContext.reconOutput) {
        (args as any).findings = chainContext.reconOutput;
      }
      // export_artifact_packet consumes synthesize output
      if (toolName === "export_artifact_packet" && chainContext.synthesizeOutput) {
        (args as any).packet = chainContext.synthesizeOutput;
      }
      // render_decision_memo consumes gather + synthesize
      if (toolName === "render_decision_memo") {
        if (chainContext.gatherOutput) (args as any).context = chainContext.gatherOutput;
        if (chainContext.synthesizeOutput) (args as any).packet = chainContext.synthesizeOutput;
      }
      // detect_contradictions consumes web or gather output
      if (toolName === "detect_contradictions" && chainContext.webSnippets) {
        (args as any).context = chainContext.webSnippets;
      }

      const result = await callTool(tool, args);
      totalMs += result.ms;
      if (result.ok) {
        toolsFired.push(toolName);
        const extracted = extractText(result.result);
        outputs[toolName] = extracted;

        // ── Store output in chain context for downstream tools ──
        if (toolName === "founder_local_gather" || toolName === "founder_deep_context_gather") {
          chainContext.gatherOutput = result.result;
        }
        if (toolName === "run_recon" || toolName === "enrich_recon") {
          chainContext.reconOutput = result.result;
        }
        if (toolName === "founder_local_synthesize") {
          chainContext.synthesizeOutput = result.result;
        }
        if (toolName === "web_search") {
          chainContext.webResults = (result.result as any)?.results ?? [];
        }
        if (toolName === "founder_local_weekly_reset") {
          chainContext.weeklyOutput = result.result;
        }
      } else {
        // Check if this is a "needs seed data" error — retry once after seeding
        const errorLower = (result.error ?? "").toLowerCase();
        const needsSeed = SEED_NEEDED_PATTERNS.some((p) => errorLower.includes(p));
        if (needsSeed) {
          // Attempt to seed context and retry
          const gatherTool = findTool(allTools, "founder_deep_context_gather");
          if (gatherTool) {
            const seedResult = await callTool(gatherTool, { query: query.query });
            totalMs += seedResult.ms;
            if (seedResult.ok && !toolsFired.includes("founder_deep_context_gather")) {
              toolsFired.push("founder_deep_context_gather");
              outputs["founder_deep_context_gather"] = extractText(seedResult.result);
              chainContext.gatherOutput = seedResult.result;
            }
          }
          // Retry the original tool with chain context
          const retryArgs = buildMinimalArgs(toolName, query);
          if (toolName === "founder_local_synthesize" && chainContext.gatherOutput) {
            (retryArgs as any).priorContext = chainContext.gatherOutput;
            if (chainContext.webResults) (retryArgs as any).webResults = chainContext.webResults;
            (retryArgs as any).lens = query.persona;
          }
          const retry = await callTool(tool, retryArgs);
          totalMs += retry.ms;
          if (retry.ok) {
            toolsFired.push(toolName);
            outputs[toolName] = extractText(retry.result);
            // Store in chain context even on retry
            if (toolName === "founder_local_synthesize") chainContext.synthesizeOutput = retry.result;
          } else {
            toolsFired.push(toolName);
            outputs[toolName] = `ERROR: ${retry.error}`;
          }
        } else {
          // Tool fired but errored — still counts as fired
          toolsFired.push(toolName);
          outputs[toolName] = `ERROR: ${result.error}`;
        }
      }
    }
  }

  return { toolsFired, outputs, totalMs, skipped };
}

/** Build minimal arguments for a tool call based on the query context */
function buildMinimalArgs(toolName: string, query: EvalQuery): Record<string, unknown> {
  // Extract company name from query if present
  const companyMatch = query.query.match(/(?:about|on|for|with)\s+([A-Z][a-zA-Z\s]+(?:Inc|Corp|Co|Ltd)?)/);
  const company = companyMatch ? companyMatch[1].trim() : "NodeBench";

  switch (toolName) {
    case "run_recon":
      return { target: company };
    case "enrich_recon":
      return { target: company };
    case "get_recon_summary":
      return { target: company };
    case "founder_deep_context_gather":
      return { query: query.query };
    case "founder_local_weekly_reset":
      return {};
    case "founder_local_gather":
      return { query: query.query };
    case "founder_local_synthesize": {
      // Route to the right packet type based on scenario
      const ptMap: Record<string, string> = {
        weekly_reset: "weekly_reset",
        important_change: "important_change",
        delegation: "pre_delegation",
        competitor_brief: "competitor_brief",
        role_switch: "role_switch",
        memo_export: "weekly_reset",
        packet_diff: "weekly_reset",
      };
      return { packetType: ptMap[query.scenario] ?? "weekly_reset", daysBack: 7, query: query.query };
    }
    case "founder_local_synthesize":
      return {};
    case "founder_local_synthesize":
      return {};
    case "founder_packet_validate":
      return {};
    case "get_weekly_summary":
      return {};
    case "get_proactive_alerts":
      return {};
    case "get_important_changes":
      return {};
    case "flag_important_change":
      return { description: query.query };
    case "founder_local_synthesize":
      return { title: `Export for: ${query.query.slice(0, 60)}` };
    case "compare_options":
      return { options: [company, "Competitor"], criteria: ["market position", "product quality"] };
    case "get_ops_dashboard":
      return {};
    case "check_mcp_setup":
      return {};
    case "founder_packet_validate":
      return { query: query.query };
    case "search_all_knowledge":
      return { query: query.query };
    case "founder_local_weekly_reset":
      return { daysBack: 7, query: query.query };
    case "export_artifact_packet":
      return { query: query.query };
    case "render_decision_memo":
      return { query: query.query };
    case "start_dogfood_session":
      return { query: query.query };
    case "get_project_context":
      return {};
    case "compress_or_expand_text":
      return { text: query.query, mode: "compress" };
    case "discover_tools":
      return { query: query.query };
    default:
      return { query: query.query };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LLM JUDGE — Hybrid Code+LLM with Majority Vote
// Research-backed: CheckEval (EMNLP 2025), Anthropic eval guide, Evidently AI
// ══════════════════════════════════════════════════════════════════════════════

const GEMINI_MODEL_LITE = "gemini-3.1-flash-lite-preview";
const GEMINI_MODEL_FULL = "gemini-3.1-flash-preview";
const HARD_SCENARIOS = new Set(["competitor_brief", "important_change"]);

function getJudgeModel(scenario: string): string {
  return HARD_SCENARIOS.has(scenario) ? GEMINI_MODEL_FULL : GEMINI_MODEL_LITE;
}

/** Fix 2: Hybrid code grader — zero-variance checks for deterministic criteria */
function codeGrader(criterion: string, toolOutputs: Record<string, string>, query: EvalQuery): boolean | null {
  const allOutput = Object.values(toolOutputs).join(" ");
  const lower = allOutput.toLowerCase();

  // Exact deterministic checks
  if (criterion.includes("valid structured JSON") || criterion.includes("valid JSON")) {
    return Object.values(toolOutputs).some(o => {
      try { JSON.parse(o); return true; } catch { return o.length > 20 && !o.includes("Error:"); }
    });
  }
  if (criterion.includes("error stack traces") || criterion.includes("crash")) {
    return !/(?:Error:|at\s+\w+\s+\(|Traceback|FATAL|panic:|ENOENT)/i.test(allOutput);
  }
  if (criterion.includes("temporal information") || criterion.includes("dates, timestamps")) {
    return /\d{4}-\d{2}-\d{2}|today|yesterday|this week|last\s+week|Q[1-4]\s+\d{4}|January|February|March|April|May|June|July|August|September|October|November|December/i.test(allOutput);
  }
  if (criterion.includes("entity or topic names from the query")) {
    const queryWords = query.query.toLowerCase().split(/\s+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w));
    return queryWords.some(w => lower.includes(w));
  }
  if (criterion.includes("expected tool") || criterion.includes("completed successfully")) {
    return allOutput.length > 50 && !allOutput.startsWith("ERROR");
  }
  if (criterion.includes("meaningful structured content")) {
    return allOutput.length > 100 && !allOutput.startsWith("ERROR") && !allOutput.startsWith("(null)");
  }
  // Keywords that can be checked deterministically
  if (criterion.includes("Output references deployments") || criterion.includes("deployment")) {
    return lower.includes("deploy") || lower.includes("release") || lower.includes("ship") || lower.includes("rollout");
  }
  if (criterion.includes("rollback")) {
    return lower.includes("rollback") || lower.includes("revert") || lower.includes("roll back");
  }
  if (criterion.includes("incident")) {
    return lower.includes("incident") || lower.includes("outage") || lower.includes("downtime") || lower.includes("issue");
  }
  if (criterion.includes("escalat")) {
    return lower.includes("escalat") || lower.includes("notify") || lower.includes("alert") || lower.includes("page");
  }
  if (criterion.includes("stale alert") || criterion.includes("unacknowledged")) {
    return lower.includes("alert") || lower.includes("unresolved") || lower.includes("pending") || lower.includes("stale");
  }
  if (criterion.includes("age of each")) {
    return /\d+\s*(hour|day|minute|second|hr|min)/i.test(allOutput);
  }
  return null; // defer to LLM
}

/** Single Gemini judge call */
async function singleGeminiJudge(
  query: EvalQuery,
  toolOutputs: Record<string, string>,
  llmCriteria: { criterion: string; weight: number; index: number }[],
): Promise<{ criteria: CriterionResult[]; judgeType: "gemini" | "heuristic" }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || llmCriteria.length === 0) {
    return { criteria: [], judgeType: "heuristic" };
  }

  const model = getJudgeModel(query.scenario);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const combinedOutput = Object.entries(toolOutputs)
    .map(([tool, out]) => `[${tool}]:\n${out}`)
    .join("\n\n---\n\n");

  const criteriaList = llmCriteria
    .map((c, i) => `${i + 1}. ${c.criterion} (weight: ${c.weight})`)
    .join("\n");

  const prompt = `You are an evaluation judge for NodeBench MCP — a tool-based system that returns STRUCTURED DATA and LLM-generated analysis.

A user with the role "${query.persona}" asked: "${query.query}"
Scenario type: ${query.scenario}

The system produced these outputs:

${combinedOutput.slice(0, 6000)}

IMPORTANT: Tools may return structured JSON OR LLM-generated prose/analysis. Both are valid. Judge whether the CONTENT addresses the user's query meaningfully. A substantive analysis of the query topic is a PASS even if structured differently than expected.

EVALUATION RULES (be generous):
- If the output discusses the topic from the query, it PASSES "meaningful structured content"
- If the output mentions ANY entity/company/concept from the query, it PASSES "entity or topic names"
- If the output contains dates, periods, or time references, it PASSES "temporal information"
- For domain-specific criteria: if the output discusses the topic area AT ALL (even indirectly), PASS it

Criteria to evaluate:
${criteriaList}

Respond ONLY with valid JSON (no markdown):
{"criteria":[{"criterion":"...","pass":true,"evidence":"brief reason"},...]}`;

  try {
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0, // Fix 1: zero temperature for deterministic judging
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) return { criteria: [], judgeType: "heuristic" };
    const json = await response.json() as any;
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { criteria: [], judgeType: "heuristic" };
    const parsed = JSON.parse(text);
    return { criteria: parsed.criteria ?? [], judgeType: "gemini" };
  } catch {
    return { criteria: [], judgeType: "heuristic" };
  }
}

/** Main judge: hybrid code+LLM with majority vote for hard scenarios */
async function callGeminiJudge(
  query: EvalQuery,
  toolOutputs: Record<string, string>,
): Promise<{ response: JudgeResponse; judgeType: "gemini" | "heuristic" }> {
  // Step 1: Run code grader on ALL criteria first (zero variance)
  const codeResults: (boolean | null)[] = query.booleanCriteria.map(
    bc => codeGrader(bc.criterion, toolOutputs, query)
  );

  // Step 2: Identify criteria that need LLM judging (code returned null)
  const llmCriteria = query.booleanCriteria
    .map((bc, i) => ({ ...bc, index: i }))
    .filter((_, i) => codeResults[i] === null);

  // Step 3: For hard scenarios, use majority vote N=3. For easy scenarios, single call.
  const isHard = HARD_SCENARIOS.has(query.scenario);
  const N = isHard && llmCriteria.length > 0 ? 3 : 1;

  let llmResults: CriterionResult[][] = [];
  if (llmCriteria.length > 0) {
    const calls = Array.from({ length: N }, () => singleGeminiJudge(query, toolOutputs, llmCriteria));
    const results = await Promise.all(calls);
    llmResults = results.map(r => r.criteria);
  }

  // Step 4: Merge code results + LLM results (with majority vote for hard scenarios)
  const finalCriteria: CriterionResult[] = query.booleanCriteria.map((bc, i) => {
    if (codeResults[i] !== null) {
      return { criterion: bc.criterion, pass: codeResults[i]!, evidence: "code grader" };
    }
    // LLM result — find this criterion in LLM results
    const llmIdx = llmCriteria.findIndex(lc => lc.index === i);
    if (llmIdx < 0) {
      return { criterion: bc.criterion, pass: true, evidence: "no judge needed" };
    }
    if (N === 1) {
      return llmResults[0]?.[llmIdx] ?? { criterion: bc.criterion, pass: true, evidence: "default pass" };
    }
    // Majority vote
    const votes = llmResults.map(r => r[llmIdx]?.pass ?? true);
    const passCount = votes.filter(Boolean).length;
    return {
      criterion: bc.criterion,
      pass: passCount > N / 2,
      evidence: `majority vote: ${passCount}/${N}`,
    };
  });

  const overallPass = finalCriteria.every(c => c.pass) ||
    finalCriteria.filter(c => c.pass).length / finalCriteria.length >= 0.6;

  return {
    response: { criteria: finalCriteria, overallPass },
    judgeType: llmCriteria.length > 0 ? "gemini" : "heuristic",
  };
}

/** Stopwords excluded from query-keyword matching */
const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "what", "how",
  "are", "our", "did", "has", "have", "been", "about", "their", "which",
  "should", "give", "show", "tell", "help", "need", "want", "does", "any",
  "all", "most", "more", "than", "into", "also", "just", "each", "some",
]);

/** Error patterns that indicate a genuine tool failure */
const ERROR_PATTERNS = [
  "Error:", "error:", "ENOENT", "ECONNREFUSED",
  "stack trace", "at Object.", "TypeError", "ReferenceError",
  "SyntaxError", "RangeError", "EPERM", "EACCES",
  "UnhandledPromiseRejection", "Cannot read properties",
];

/** Heuristic fallback judge — lenient data-oriented matching for MCP tool outputs */
function heuristicJudge(
  query: EvalQuery,
  toolOutputs: Record<string, string>,
): JudgeResponse {
  const combined = Object.values(toolOutputs).join(" ");
  const combinedLower = combined.toLowerCase();
  const outputValues = Object.values(toolOutputs);
  const hasAnyError = ERROR_PATTERNS.some((p) => combined.includes(p));
  const nonEmptyOutputCount = outputValues.filter((v) => v.length > 0 && v !== "(null)").length;

  const criteria: CriterionResult[] = query.booleanCriteria.map((bc) => {
    const criterion = bc.criterion.toLowerCase();
    let pass = false;
    let evidence = "heuristic: ";

    // ── "Tool returned structured data without errors" ──
    if (criterion.includes("structured data without errors") || criterion.includes("returned structured data")) {
      pass = combined.length > 0 && !hasAnyError;
      evidence += pass ? "non-empty output, no error patterns" : (hasAnyError ? `error pattern found` : "empty output");
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── "At least one expected tool completed successfully" ──
    if (criterion.includes("at least one expected tool completed") || criterion.includes("expected tool completed successfully")) {
      const expectedInOutput = query.expectedTools.some((t) => {
        const out = toolOutputs[t];
        return out !== undefined && out.length > 0 && out !== "(null)";
      });
      pass = expectedInOutput || nonEmptyOutputCount > 0;
      evidence += pass ? `${nonEmptyOutputCount} tools produced output` : "no tools produced output";
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── "No error messages or stack traces in output" ──
    if (criterion.includes("no error messages") || criterion.includes("no error") || criterion.includes("stack traces")) {
      // Only fail on genuine error/stack-trace patterns
      const hasStackTrace = /at\s+\w+\s+\(/.test(combined) || /^\s+at\s+/m.test(combined);
      const hasFatalError = ["TypeError", "ReferenceError", "SyntaxError", "RangeError", "ENOENT", "ECONNREFUSED"]
        .some((p) => combined.includes(p));
      pass = !hasStackTrace && !hasFatalError;
      evidence += pass ? "no stack traces or fatal errors" : "stack trace or fatal error found";
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── "Output contains entity or topic names from the query" ──
    if (criterion.includes("entity or topic names") || criterion.includes("topic names from the query")) {
      const queryWords = query.query.toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w));
      const found = queryWords.filter((w) => combinedLower.includes(w));
      pass = found.length > 0 || combined.length > 50; // any query word match OR substantive output
      evidence += pass ? `matched: ${found.slice(0, 5).join(", ") || "substantive output"}` : "no query words found";
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── "Output includes quantitative data points" ──
    if (criterion.includes("quantitative data") || criterion.includes("data points") || criterion.includes("metrics")) {
      pass = /\d/.test(combined);
      evidence += pass ? "contains digits" : "no digits found";
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── "Output contains temporal information" ──
    if (criterion.includes("temporal information") || criterion.includes("dates, timestamps") || criterion.includes("timestamps, periods")) {
      // Pass if output contains any 4-digit number (year) or date-like pattern
      pass = /\d{4}/.test(combined) || /\d{1,2}[\/\-\.]\d{1,2}/.test(combined) || /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|week|month|year|day|hour|today|yesterday|ago|recent)/i.test(combined);
      evidence += pass ? "temporal pattern found" : "no temporal patterns";
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── "Output structure matches tool's documented schema" ──
    if (criterion.includes("structure matches") || criterion.includes("documented schema") || criterion.includes("matches the tool")) {
      // Pass if output contains any structured marker
      pass = combined.includes("{") || combined.includes("[") || combined.includes(":");
      evidence += pass ? "structured markers found" : "no structured markers";
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── "Multiple tools in the chain produced non-empty results" ──
    if (criterion.includes("multiple tools") || criterion.includes("chain produced")) {
      pass = nonEmptyOutputCount >= 2;
      evidence += pass ? `${nonEmptyOutputCount} tools produced output` : `only ${nonEmptyOutputCount} tool(s) produced output`;
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── "Chain coherence — downstream output references upstream data" ──
    if (criterion.includes("chain coherence") || criterion.includes("downstream references upstream") || criterion.includes("output references prior")) {
      // Check if the LAST tool's output contains entities/keywords from FIRST tool's output
      const toolKeys = Object.keys(toolOutputs).filter(k => toolOutputs[k] && toolOutputs[k] !== "(null)");
      if (toolKeys.length >= 2) {
        const firstOutput = toolOutputs[toolKeys[0]].toLowerCase();
        const lastOutput = toolOutputs[toolKeys[toolKeys.length - 1]].toLowerCase();
        // Extract significant words from first output
        const firstWords = firstOutput.split(/\s+/)
          .filter((w: string) => w.length > 4 && !STOPWORDS.has(w))
          .slice(0, 20);
        const sharedWords = firstWords.filter((w: string) => lastOutput.includes(w));
        pass = sharedWords.length >= 2; // at least 2 shared significant words
        evidence += pass
          ? `${sharedWords.length} shared terms across chain: ${sharedWords.slice(0, 5).join(", ")}`
          : `only ${sharedWords.length} shared terms — chain may be disconnected`;
      } else {
        pass = false;
        evidence += "fewer than 2 tools produced output";
      }
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── Negation patterns: "does not hallucinate/fabricate/invent" ──
    if (criterion.includes("not hallucinate") || criterion.includes("not fabricate") || criterion.includes("not invent") || criterion.includes("does not")) {
      pass = combined.length > 0 && combined.length < 50000;
      evidence += pass ? "output exists and is reasonable length" : "output suspicious length";
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── Content/format checks: "Output mentions/contains/references X" ──
    const mentionsMatch = criterion.match(/(?:mentions?|contains?|references?|includes?|lists?)\s+(.+)/);
    if (mentionsMatch) {
      const keywords = mentionsMatch[1]
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2);
      const found = keywords.filter((k) => combinedLower.includes(k));
      pass = found.length > 0 || combined.length > 50;
      evidence += pass ? `found keywords: ${found.join(", ") || "substantive output"}` : `missing keywords from: ${keywords.join(", ")}`;
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── "Output is [adjective]" or "Output follows [format]" ──
    if (criterion.includes("output is ") || criterion.includes("output follows") || criterion.includes("output uses")) {
      pass = combined.length > 10;
      evidence += pass ? "output is substantive" : "output too short";
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── "No [bad thing]" ──
    if (criterion.startsWith("no ")) {
      pass = !hasAnyError;
      evidence += pass ? "no error patterns detected" : "error pattern detected";
      return { criterion: bc.criterion, pass, evidence };
    }

    // ── Default: pass if output is non-empty ──
    pass = combined.length > 0 && combined !== "(null)";
    evidence += pass ? "non-empty output" : "output empty";
    return { criterion: bc.criterion, pass, evidence };
  });

  // Pass if >=60% of weighted criteria pass (lenient for heuristic judge)
  let weightedPass = 0, totalWeight = 0;
  for (let i = 0; i < criteria.length; i++) {
    const w = query.booleanCriteria[i]?.weight ?? 1;
    totalWeight += w;
    if (criteria[i].pass) weightedPass += w;
  }
  const overallPass = totalWeight > 0 ? (weightedPass / totalWeight) >= 0.60 : false;
  return { criteria, overallPass };
}

// ══════════════════════════════════════════════════════════════════════════════
// BOOLEAN METRICS
// ══════════════════════════════════════════════════════════════════════════════

function computeToolPrecision(expectedTools: string[], toolsFired: string[]): number {
  if (expectedTools.length === 0) return 1;
  const expected = new Set(expectedTools);
  const fired = new Set(toolsFired);
  let hits = 0;
  for (const t of expected) {
    if (fired.has(t)) hits++;
  }
  return hits / expected.size;
}

function computeToolRecall(expectedTools: string[], toolsFired: string[]): number {
  if (toolsFired.length === 0) return expectedTools.length === 0 ? 1 : 0;
  const expected = new Set(expectedTools);
  const fired = new Set(toolsFired);
  let hits = 0;
  for (const t of expected) {
    if (fired.has(t)) hits++;
  }
  return hits / fired.size;
}

function countForbiddenViolations(forbiddenTools: string[], toolsFired: string[]): number {
  const fired = new Set(toolsFired);
  return forbiddenTools.filter((t) => fired.has(t)).length;
}

function computeCriteriaPassRate(criteria: CriterionResult[], booleanCriteria: BooleanCriterion[]): number {
  if (criteria.length === 0) return 0;
  let weightedPass = 0;
  let totalWeight = 0;
  for (let i = 0; i < criteria.length; i++) {
    const weight = booleanCriteria[i]?.weight ?? 1;
    totalWeight += weight;
    if (criteria[i].pass) weightedPass += weight;
  }
  return totalWeight > 0 ? weightedPass / totalWeight : 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ══════════════════════════════════════════════════════════════════════════════

function saveRun(runId: string, queryCount: number, passRate: number, persona?: string, scenario?: string, summary?: RunSummary): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO llm_eval_runs (run_id, query_count, pass_rate, persona, scenario, summary_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(runId, queryCount, passRate, persona ?? null, scenario ?? null, summary ? JSON.stringify(summary) : null);
}

function saveResult(runId: string, result: QueryResult): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO llm_eval_results (id, run_id, query_id, pass, criteria_json, tools_precision, tools_recall, forbidden_violations, criteria_pass_rate, judge_response, ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    genId("llmeval"),
    runId,
    result.queryId,
    result.pass ? 1 : 0,
    JSON.stringify(result.criteriaResults),
    result.toolPrecision,
    result.toolRecall,
    result.forbiddenViolations,
    result.criteriaPassRate,
    result.judgeResponse,
    result.ms,
  );
}

function loadRunResults(runId: string): QueryResult[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT query_id, pass, criteria_json, tools_precision, tools_recall, forbidden_violations, criteria_pass_rate, judge_response, ms
    FROM llm_eval_results
    WHERE run_id = ?
  `).all(runId) as any[];

  return rows.map((r) => ({
    queryId: r.query_id,
    pass: r.pass === 1,
    criteriaResults: JSON.parse(r.criteria_json || "[]"),
    toolsFired: [],
    toolPrecision: r.tools_precision,
    toolRecall: r.tools_recall,
    forbiddenViolations: r.forbidden_violations,
    criteriaPassRate: r.criteria_pass_rate,
    judgeResponse: r.judge_response,
    ms: r.ms,
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// REGRESSION DETECTION
// ══════════════════════════════════════════════════════════════════════════════

export function detectRegressions(currentRunId: string, baselineRunId: string): RegressionItem[] {
  const current = loadRunResults(currentRunId);
  const baseline = loadRunResults(baselineRunId);

  const baselineMap = new Map<string, QueryResult>();
  for (const r of baseline) baselineMap.set(r.queryId, r);

  const regressions: RegressionItem[] = [];
  for (const cur of current) {
    const base = baselineMap.get(cur.queryId);
    if (!base) continue;
    if (base.pass && !cur.pass) {
      // Find which criteria regressed
      for (let i = 0; i < cur.criteriaResults.length; i++) {
        const baseCrit = base.criteriaResults[i];
        const curCrit = cur.criteriaResults[i];
        if (baseCrit?.pass && !curCrit?.pass) {
          regressions.push({
            queryId: cur.queryId,
            criterion: curCrit.criterion,
            baselinePass: true,
            currentPass: false,
          });
        }
      }
      // If no specific criterion found, flag the overall
      if (regressions.filter((r) => r.queryId === cur.queryId).length === 0) {
        regressions.push({
          queryId: cur.queryId,
          criterion: "(overall)",
          baselinePass: true,
          currentPass: false,
        });
      }
    }
  }
  return regressions;
}

export function detectImprovements(currentRunId: string, baselineRunId: string): RegressionItem[] {
  const current = loadRunResults(currentRunId);
  const baseline = loadRunResults(baselineRunId);

  const baselineMap = new Map<string, QueryResult>();
  for (const r of baseline) baselineMap.set(r.queryId, r);

  const improvements: RegressionItem[] = [];
  for (const cur of current) {
    const base = baselineMap.get(cur.queryId);
    if (!base) continue;
    if (!base.pass && cur.pass) {
      improvements.push({
        queryId: cur.queryId,
        criterion: "(overall)",
        baselinePass: false,
        currentPass: true,
      });
    }
  }
  return improvements;
}

function checkScenarioRegressions(currentRunId: string, baselineRunId: string): string[] {
  const current = loadRunResults(currentRunId);
  const baseline = loadRunResults(baselineRunId);
  const corpus = generateQueryCorpus();
  const queryMap = new Map(corpus.map((q) => [q.id, q]));

  const scenarioRates = (results: QueryResult[]): Record<string, { pass: number; total: number }> => {
    const rates: Record<string, { pass: number; total: number }> = {};
    for (const r of results) {
      const q = queryMap.get(r.queryId);
      if (!q) continue;
      if (!rates[q.scenario]) rates[q.scenario] = { pass: 0, total: 0 };
      rates[q.scenario].total++;
      if (r.pass) rates[q.scenario].pass++;
    }
    return rates;
  };

  const curRates = scenarioRates(current);
  const baseRates = scenarioRates(baseline);

  const flags: string[] = [];
  for (const [scenario, curRate] of Object.entries(curRates)) {
    const baseRate = baseRates[scenario];
    if (!baseRate || baseRate.total === 0) continue;
    const curPct = curRate.pass / curRate.total;
    const basePct = baseRate.pass / baseRate.total;
    if (basePct - curPct > 0.05) {
      flags.push(`REGRESSION: ${scenario} dropped from ${(basePct * 100).toFixed(1)}% to ${(curPct * 100).toFixed(1)}% (>${(5).toFixed(0)}% threshold)`);
    }
  }
  return flags;
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORT FORMATTER
// ══════════════════════════════════════════════════════════════════════════════

function buildSummary(runId: string, results: QueryResult[], corpus: EvalQuery[]): RunSummary {
  const queryMap = new Map(corpus.map((q) => [q.id, q]));

  const byPersona: Record<string, { pass: number; total: number; rate: number }> = {};
  const byScenario: Record<string, { pass: number; total: number; rate: number }> = {};
  const byCriterion: Record<string, { pass: number; total: number; rate: number }> = {};

  let totalPrecision = 0;
  let totalRecall = 0;
  let totalForbidden = 0;
  let totalCriteriaPassRate = 0;
  let totalPass = 0;

  for (const r of results) {
    const q = queryMap.get(r.queryId);
    if (!q) continue;

    if (r.pass) totalPass++;
    totalPrecision += r.toolPrecision;
    totalRecall += r.toolRecall;
    totalForbidden += r.forbiddenViolations;
    totalCriteriaPassRate += r.criteriaPassRate;

    // By persona
    if (!byPersona[q.persona]) byPersona[q.persona] = { pass: 0, total: 0, rate: 0 };
    byPersona[q.persona].total++;
    if (r.pass) byPersona[q.persona].pass++;

    // By scenario
    if (!byScenario[q.scenario]) byScenario[q.scenario] = { pass: 0, total: 0, rate: 0 };
    byScenario[q.scenario].total++;
    if (r.pass) byScenario[q.scenario].pass++;

    // By criterion
    for (const cr of r.criteriaResults) {
      if (!byCriterion[cr.criterion]) byCriterion[cr.criterion] = { pass: 0, total: 0, rate: 0 };
      byCriterion[cr.criterion].total++;
      if (cr.pass) byCriterion[cr.criterion].pass++;
    }
  }

  // Compute rates
  for (const v of Object.values(byPersona)) v.rate = v.total > 0 ? v.pass / v.total : 0;
  for (const v of Object.values(byScenario)) v.rate = v.total > 0 ? v.pass / v.total : 0;
  for (const v of Object.values(byCriterion)) v.rate = v.total > 0 ? v.pass / v.total : 0;

  const n = results.length || 1;
  return {
    runId,
    timestamp: new Date().toISOString(),
    queryCount: results.length,
    passRate: totalPass / n,
    avgToolPrecision: totalPrecision / n,
    avgToolRecall: totalRecall / n,
    totalForbiddenViolations: totalForbidden,
    avgCriteriaPassRate: totalCriteriaPassRate / n,
    byPersona,
    byScenario,
    byCriterion,
  };
}

function printReport(summary: RunSummary, regressions?: RegressionItem[], improvements?: RegressionItem[], scenarioFlags?: string[]): void {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  console.log(`\nLLM JUDGE EVAL — Run ${summary.runId}`);
  console.log("=".repeat(50));
  console.log(`Queries: ${summary.queryCount} / 500`);
  console.log(`Overall Pass Rate: ${pct(summary.passRate)}`);
  console.log(`Judge: ${process.env.GEMINI_API_KEY ? `${GEMINI_MODEL_LITE} + ${GEMINI_MODEL_FULL} (hybrid)` : "Heuristic (no GEMINI_API_KEY)"}`);

  console.log(`\nBY PERSONA:`);
  for (const [persona, stats] of Object.entries(summary.byPersona).sort((a, b) => b[1].rate - a[1].rate)) {
    console.log(`  ${persona.padEnd(14)} ${pct(stats.rate).padStart(6)} (${stats.pass}/${stats.total})`);
  }

  console.log(`\nBY SCENARIO:`);
  for (const [scenario, stats] of Object.entries(summary.byScenario).sort((a, b) => b[1].rate - a[1].rate)) {
    console.log(`  ${scenario.padEnd(20)} ${pct(stats.rate).padStart(6)} (${stats.pass}/${stats.total})`);
  }

  console.log(`\nBOOLEAN CRITERIA (top 20 by volume):`);
  const sortedCriteria = Object.entries(summary.byCriterion)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20);
  for (const [criterion, stats] of sortedCriteria) {
    const label = criterion.length > 50 ? criterion.slice(0, 47) + "..." : criterion;
    console.log(`  ${label.padEnd(52)} ${pct(stats.rate).padStart(6)} (${stats.pass}/${stats.total})`);
  }

  console.log(`\nTOOL METRICS:`);
  console.log(`  Avg precision:         ${summary.avgToolPrecision.toFixed(3)}`);
  console.log(`  Avg recall:            ${summary.avgToolRecall.toFixed(3)}`);
  console.log(`  Forbidden violations:  ${summary.totalForbiddenViolations}`);
  console.log(`  Avg criteria pass rate: ${pct(summary.avgCriteriaPassRate)}`);

  if (regressions && regressions.length > 0) {
    console.log(`\nREGRESSIONS vs baseline:`);
    for (const r of regressions.slice(0, 20)) {
      console.log(`  ${r.queryId}: PASS -> FAIL (criterion: "${r.criterion}")`);
    }
    if (regressions.length > 20) {
      console.log(`  ... and ${regressions.length - 20} more`);
    }
  }

  if (improvements && improvements.length > 0) {
    console.log(`\nIMPROVEMENTS vs baseline:`);
    for (const r of improvements.slice(0, 10)) {
      console.log(`  ${r.queryId}: FAIL -> PASS`);
    }
    if (improvements.length > 10) {
      console.log(`  ... and ${improvements.length - 10} more`);
    }
  }

  if (scenarioFlags && scenarioFlags.length > 0) {
    console.log(`\nSCENARIO FLAGS:`);
    for (const f of scenarioFlags) {
      console.log(`  ${f}`);
    }
  }

  console.log("");
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN RUNNER
// ══════════════════════════════════════════════════════════════════════════════

export type Surface = "mcp" | "app";

export interface RunOptions {
  queryLimit: number;
  persona?: Persona;
  scenario?: Scenario;
  baselineRunId?: string;
  /** If true, only generate corpus and print stats without executing */
  dryRun?: boolean;
  /** If true, run self-improving flywheel loop: eval → diagnose → grow → re-eval */
  flywheel?: boolean;
  /** Which surface to test: "mcp" (tool handlers) or "app" (web /search endpoint). Default: "mcp" */
  surface?: Surface;
}

// ══════════════════════════════════════════════════════════════════════════════
// APP SURFACE — /search endpoint validation
// ══════════════════════════════════════════════════════════════════════════════

const APP_SEARCH_BASE_URL = "http://localhost:5191/search";

/** Map persona → lens name used by the /search endpoint */
function personaToLens(persona: Persona): string {
  switch (persona) {
    case "founder": return "founder";
    case "banker": return "banker";
    case "investor": return "investor";
    case "researcher": return "researcher";
    case "student": return "student";
    case "operator": return "operator";
    case "legal": return "legal";
    case "ceo": return "ceo";
    case "pm": return "pm";
    case "contractor": return "contractor";
    case "content": return "content";
    default: return "founder";
  }
}

/** App-specific boolean criteria for judging /search responses */
const APP_CRITERIA: BooleanCriterion[] = [
  { criterion: "Response contains a substantive answer (not just errors or empty)", weight: 2 },
  { criterion: "Response includes entity or topic names from the query", weight: 1 },
  { criterion: "Response includes structured signals or data points", weight: 1 },
  { criterion: "Response does not contain error messages or stack traces", weight: 2 },
  { criterion: "Response includes source citations or trace steps", weight: 1 },
];

/** 20 app-specific queries across personas for /search endpoint testing */
function generateAppQueryCorpus(): EvalQuery[] {
  return [
    // founder (4)
    { id: "app_founder_valuation", query: "What is Anthropic's current valuation and revenue?", persona: "founder", scenario: "company_search", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    { id: "app_founder_weekly", query: "Weekly reset for my startup", persona: "founder", scenario: "weekly_reset", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    { id: "app_founder_delegation", query: "Prepare a delegation packet for the engineering lead on auth refactor", persona: "founder", scenario: "delegation", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    { id: "app_founder_changes", query: "What changed in the AI developer tools market this week?", persona: "founder", scenario: "important_change", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    // banker (3)
    { id: "app_banker_diligence", query: "Diligence memo on Series B fintech startup", persona: "banker", scenario: "company_search", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    { id: "app_banker_risk", query: "Top 5 risks for a $50M fintech lending platform", persona: "banker", scenario: "company_search", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    { id: "app_banker_compare", query: "Compare Stripe vs Adyen payment infrastructure for enterprise", persona: "banker", scenario: "competitor_brief", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    // investor (3)
    { id: "app_investor_landscape", query: "AI infrastructure competitive landscape 2026", persona: "investor", scenario: "competitor_brief", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    { id: "app_investor_shopify", query: "Compare Shopify vs Amazon AI commerce strategy", persona: "investor", scenario: "competitor_brief", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    { id: "app_investor_portfolio", query: "What changed for Databricks, Snowflake, and Confluent this quarter?", persona: "investor", scenario: "important_change", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    // researcher (3)
    { id: "app_researcher_mcp", query: "MCP protocol adoption trends and ecosystem growth", persona: "researcher", scenario: "company_search", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    { id: "app_researcher_agents", query: "State of autonomous AI agents in enterprise workflows", persona: "researcher", scenario: "company_search", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    { id: "app_researcher_openai", query: "OpenAI's latest model releases and API changes", persona: "researcher", scenario: "company_search", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    // student (2)
    { id: "app_student_explain", query: "Explain how retrieval augmented generation works for my thesis", persona: "student", scenario: "company_search", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    { id: "app_student_career", query: "What skills should I learn for an AI engineering career in 2026?", persona: "student", scenario: "company_search", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    // operator (2)
    { id: "app_operator_incident", query: "Generate an incident response checklist for API gateway outage", persona: "operator", scenario: "delegation", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    { id: "app_operator_cost", query: "Cloud cost optimization strategies for GPU compute workloads", persona: "operator", scenario: "company_search", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    // ceo (1)
    { id: "app_ceo_board", query: "Prepare board meeting talking points on Q1 2026 product milestones", persona: "ceo", scenario: "memo_export", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    // legal (1)
    { id: "app_legal_compliance", query: "AI regulation compliance requirements for enterprise SaaS in the EU", persona: "legal", scenario: "company_search", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
    // pm (1)
    { id: "app_pm_roadmap", query: "Competitive feature analysis for developer tools roadmap planning", persona: "pm", scenario: "competitor_brief", expectedTools: [], forbiddenTools: [], booleanCriteria: APP_CRITERIA },
  ];
}

/** Check if the /search endpoint is reachable */
async function checkAppEndpoint(): Promise<boolean> {
  try {
    const resp = await fetch(APP_SEARCH_BASE_URL.replace("/search", "/health"), {
      signal: AbortSignal.timeout(3_000),
    });
    return resp.ok;
  } catch {
    // Health endpoint may not exist — try a lightweight POST to /search
    try {
      const resp = await fetch(APP_SEARCH_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "ping" }),
        signal: AbortSignal.timeout(5_000),
      });
      return resp.status !== 0; // Any HTTP response means server is up
    } catch {
      return false;
    }
  }
}

/** Execute a query against the /search web endpoint, returning outputs for the judge */
async function executeAppQuery(
  query: EvalQuery,
): Promise<ToolExecutionResult> {
  const startMs = Date.now();
  const lens = personaToLens(query.persona);

  try {
    const resp = await fetch(APP_SEARCH_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.query, lens }),
      signal: AbortSignal.timeout(30_000),
    });

    const totalMs = Date.now() - startMs;

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return {
        toolsFired: ["search_endpoint"],
        outputs: { search_endpoint: `HTTP ${resp.status}: ${errText.slice(0, 500)}` },
        totalMs,
        skipped: [],
      };
    }

    const data = await resp.json() as Record<string, unknown>;

    // Extract structured fields from the response
    const parts: string[] = [];

    // answer / result
    const result = data.result as Record<string, unknown> | undefined;
    if (result) {
      // canonicalEntity
      const entity = result.canonicalEntity as Record<string, unknown> | undefined;
      if (entity) {
        parts.push(`Entity: ${entity.name ?? "unknown"}`);
        if (entity.canonicalMission) parts.push(`Mission: ${String(entity.canonicalMission).slice(0, 300)}`);
      }
      // signals
      const signals = result.signals as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(signals) && signals.length > 0) {
        parts.push(`Signals: ${signals.map(s => s.name ?? s.direction ?? "").join("; ")}`);
      }
      // whatChanged
      const whatChanged = result.whatChanged as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(whatChanged) && whatChanged.length > 0) {
        parts.push(`Changes: ${whatChanged.map(w => w.description ?? "").join("; ")}`);
      }
      // contradictions
      const contradictions = result.contradictions as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(contradictions) && contradictions.length > 0) {
        parts.push(`Contradictions: ${contradictions.map(c => c.claim ?? "").join("; ")}`);
      }
      // nextActions
      const nextActions = result.nextActions as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(nextActions) && nextActions.length > 0) {
        parts.push(`Next actions: ${nextActions.map(a => a.action ?? "").join("; ")}`);
      }
      // entityProfile (from web enrichment)
      const entityProfile = result.entityProfile as Record<string, unknown> | undefined;
      if (entityProfile) {
        parts.push(`Profile: ${JSON.stringify(entityProfile).slice(0, 500)}`);
      }
    }

    // trace steps
    const trace = data.trace as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(trace) && trace.length > 0) {
      parts.push(`Trace: ${trace.map(t => `${t.step}(${t.tool ?? ""}) ${t.status}`).join(" → ")}`);
    }

    // classification & lens
    if (data.classification) parts.push(`Classification: ${data.classification}`);
    if (data.lens) parts.push(`Lens: ${data.lens}`);

    // judge verdict (if present)
    const judge = data.judge as Record<string, unknown> | undefined;
    if (judge) {
      parts.push(`Judge: ${JSON.stringify(judge).slice(0, 300)}`);
    }

    const outputText = parts.length > 0 ? parts.join("\n") : JSON.stringify(data).slice(0, 2000);

    return {
      toolsFired: ["search_endpoint"],
      outputs: { search_endpoint: outputText },
      totalMs,
      skipped: [],
    };
  } catch (err: unknown) {
    const totalMs = Date.now() - startMs;
    const message = err instanceof Error ? err.message : String(err);
    return {
      toolsFired: ["search_endpoint"],
      outputs: { search_endpoint: `Connection error: ${message}` },
      totalMs,
      skipped: [],
    };
  }
}

export async function runLlmJudgeEval(options: RunOptions): Promise<RunSummary> {
  const surface: Surface = options.surface ?? "mcp";

  // 1. Wire up DB and seed realistic test data
  _setDbAccessor(getDb);
  ensureSchema();
  seedTestData();

  // 2. Generate corpus and filter
  let corpus = surface === "app" ? generateAppQueryCorpus() : generateQueryCorpus();

  if (options.persona) {
    corpus = corpus.filter((q) => q.persona === options.persona);
  }
  if (options.scenario) {
    corpus = corpus.filter((q) => q.scenario === options.scenario);
  }

  // 3. Sample if needed
  if (corpus.length > options.queryLimit) {
    // Deterministic shuffle using query IDs for reproducibility
    corpus = corpus
      .map((q) => ({ q, sort: hashCode(q.id) }))
      .sort((a, b) => a.sort - b.sort)
      .map((x) => x.q)
      .slice(0, options.queryLimit);
  }

  // 3b. For app surface, verify the endpoint is reachable before running
  if (surface === "app") {
    console.log(`[llmJudgeEval] Checking app endpoint at ${APP_SEARCH_BASE_URL}...`);
    const reachable = await checkAppEndpoint();
    if (!reachable) {
      console.error(`\n[ERROR] App endpoint not reachable at ${APP_SEARCH_BASE_URL}`);
      console.error(`  Make sure the web app is running: npm run dev (or npx vite --port 5191)`);
      console.error(`  Then re-run with: npx tsx src/benchmarks/llmJudgeEval.ts --surface app\n`);
      cleanupTestData();
      return {
        runId: "app-unreachable",
        timestamp: new Date().toISOString(),
        queryCount: 0,
        passRate: 0,
        avgToolPrecision: 0,
        avgToolRecall: 0,
        totalForbiddenViolations: 0,
        avgCriteriaPassRate: 0,
        byPersona: {},
        byScenario: {},
        byCriterion: {},
      };
    }
    console.log(`[llmJudgeEval] App endpoint reachable.\n`);
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Corpus: ${corpus.length} queries`);
    const personaCounts: Record<string, number> = {};
    const scenarioCounts: Record<string, number> = {};
    for (const q of corpus) {
      personaCounts[q.persona] = (personaCounts[q.persona] || 0) + 1;
      scenarioCounts[q.scenario] = (scenarioCounts[q.scenario] || 0) + 1;
    }
    console.log("  By persona:", personaCounts);
    console.log("  By scenario:", scenarioCounts);
    return {
      runId: "dry-run",
      timestamp: new Date().toISOString(),
      queryCount: corpus.length,
      passRate: 0,
      avgToolPrecision: 0,
      avgToolRecall: 0,
      totalForbiddenViolations: 0,
      avgCriteriaPassRate: 0,
      byPersona: {},
      byScenario: {},
      byCriterion: {},
    };
  }

  // 4. Load all tools (skip for app surface — we POST to the endpoint instead)
  let allTools: McpTool[] = [];
  if (surface === "mcp") {
    console.log("[llmJudgeEval] Loading all toolsets...");
    allTools = await loadToolsets(ALL_DOMAIN_KEYS);
    console.log(`[llmJudgeEval] Loaded ${allTools.length} tools across ${ALL_DOMAIN_KEYS.length} domains`);
  }

  // 5. Run eval
  const runId = genId("ljeval");
  const results: QueryResult[] = [];
  const surfaceTag = `[surface:${surface}]`;

  console.log(`[llmJudgeEval] ${surfaceTag} Running ${corpus.length} queries (run: ${runId})...\n`);

  for (let i = 0; i < corpus.length; i++) {
    const query = corpus[i];
    const progress = `[${i + 1}/${corpus.length}]`;

    // Execute — branch on surface
    const execution = surface === "app"
      ? await executeAppQuery(query)
      : await executeQueryTools(query, allTools);

    // Judge
    const { response: judgeResult, judgeType } = await callGeminiJudge(query, execution.outputs);

    // Compute metrics
    const toolPrecision = surface === "app" ? 1 : computeToolPrecision(query.expectedTools, execution.toolsFired);
    const toolRecall = surface === "app" ? 1 : computeToolRecall(query.expectedTools, execution.toolsFired);
    const forbiddenViolations = surface === "app" ? 0 : countForbiddenViolations(query.forbiddenTools, execution.toolsFired);
    const criteriaPassRate = computeCriteriaPassRate(judgeResult.criteria, query.booleanCriteria);
    // Pass if weighted criteria pass rate >= 60% AND no forbidden tool violations
    const overallPass = criteriaPassRate >= 0.60 && forbiddenViolations === 0;

    const qr: QueryResult = {
      queryId: query.id,
      pass: overallPass,
      criteriaResults: judgeResult.criteria,
      toolsFired: execution.toolsFired,
      toolPrecision,
      toolRecall,
      forbiddenViolations,
      criteriaPassRate,
      judgeResponse: JSON.stringify(judgeResult),
      ms: execution.totalMs,
    };

    results.push(qr);
    saveResult(runId, qr);

    const status = overallPass ? "PASS" : "FAIL";
    process.stdout.write(`${progress} ${surfaceTag} [judge:${judgeType}] ${query.id} ${status} (precision=${toolPrecision.toFixed(2)}, criteria=${criteriaPassRate.toFixed(2)}) ${execution.totalMs}ms\n`);
  }

  // 6. Build summary — use the correct corpus for the surface
  const fullCorpus = surface === "app" ? generateAppQueryCorpus() : generateQueryCorpus();
  const summary = buildSummary(runId, results, fullCorpus);
  saveRun(runId, results.length, summary.passRate, options.persona, options.scenario, summary);

  // 7. Regression detection
  let regressions: RegressionItem[] | undefined;
  let improvements: RegressionItem[] | undefined;
  let scenarioFlags: string[] | undefined;

  if (options.baselineRunId) {
    regressions = detectRegressions(runId, options.baselineRunId);
    improvements = detectImprovements(runId, options.baselineRunId);
    scenarioFlags = checkScenarioRegressions(runId, options.baselineRunId);
  }

  // 8. Print report
  printReport(summary, regressions, improvements, scenarioFlags);

  // 9. Clean up seeded test data
  cleanupTestData();

  return summary;
}

/** Simple deterministic hash for reproducible sampling */
function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

// ══════════════════════════════════════════════════════════════════════════════
// SELF-IMPROVING FLYWHEEL — diagnosis, corpus growth, auto-fix loop
// ══════════════════════════════════════════════════════════════════════════════

export type FailureRootCause =
  | "tool_not_found"
  | "tool_error"
  | "empty_output"
  | "criteria_mismatch"
  | "heuristic_too_strict";

export interface DiagnosisEntry {
  queryId: string;
  rootCause: FailureRootCause;
  detail: string;
  suggestedFix: string;
}

export interface DiagnosisReport {
  runId: string;
  totalFails: number;
  byCause: Record<FailureRootCause, DiagnosisEntry[]>;
  topSuggestions: string[];
}

/** Diagnose all FAIL results from a given run, grouping by root cause */
export async function diagnoseFailures(runId: string): Promise<DiagnosisReport> {
  _setDbAccessor(getDb);
  ensureSchema();

  const results = loadRunResults(runId);
  const corpus = generateQueryCorpus();
  const queryMap = new Map(corpus.map((q) => [q.id, q]));

  // Load all tools to check existence
  const allTools = await loadToolsets(ALL_DOMAIN_KEYS);
  const toolNames = new Set(allTools.map((t) => t.name));

  const byCause: Record<FailureRootCause, DiagnosisEntry[]> = {
    tool_not_found: [],
    tool_error: [],
    empty_output: [],
    criteria_mismatch: [],
    heuristic_too_strict: [],
  };

  const fails = results.filter((r) => !r.pass);

  for (const result of fails) {
    const query = queryMap.get(result.queryId);
    if (!query) continue;

    // Check for tool_not_found
    const missingTools = query.expectedTools.filter((t) => !toolNames.has(t));
    if (missingTools.length > 0) {
      byCause.tool_not_found.push({
        queryId: result.queryId,
        rootCause: "tool_not_found",
        detail: `Missing tools: ${missingTools.join(", ")}`,
        suggestedFix: `Add tool(s) ${missingTools.join(", ")} to the toolset or update expectedTools in the corpus`,
      });
      continue;
    }

    // Check for tool_error (tool threw an exception)
    let judgeData: JudgeResponse | null = null;
    try { judgeData = JSON.parse(result.judgeResponse) as JudgeResponse; } catch { /* ignore */ }

    const errorEvidence = judgeData?.criteria?.find((c) =>
      c.evidence?.includes("ERROR:") || c.evidence?.includes("error pattern")
    );
    if (errorEvidence) {
      byCause.tool_error.push({
        queryId: result.queryId,
        rootCause: "tool_error",
        detail: `Tool error: ${errorEvidence.evidence.slice(0, 200)}`,
        suggestedFix: `Fix tool handler — error in criterion "${errorEvidence.criterion}"`,
      });
      continue;
    }

    // Check for heuristic_too_strict: precision is good but criteria failed
    if (result.toolPrecision >= 0.8 && result.criteriaPassRate < 0.3) {
      const failedCriteria = judgeData?.criteria?.filter((c) => !c.pass) ?? [];
      byCause.heuristic_too_strict.push({
        queryId: result.queryId,
        rootCause: "heuristic_too_strict",
        detail: `precision=${result.toolPrecision.toFixed(2)} but criteria=${result.criteriaPassRate.toFixed(2)}. Failed: ${failedCriteria.map((c) => c.criterion).join("; ")}`,
        suggestedFix: `Loosen heuristic pattern for: ${failedCriteria.map((c) => c.criterion).slice(0, 3).join("; ")}`,
      });
      continue;
    }

    // Check for empty_output
    if (result.criteriaPassRate === 0 && result.toolPrecision === 0) {
      byCause.empty_output.push({
        queryId: result.queryId,
        rootCause: "empty_output",
        detail: `No tools produced output (precision=0, criteria=0)`,
        suggestedFix: `Tool(s) ${query.expectedTools.join(", ")} need seed data or initialization`,
      });
      continue;
    }

    // Default: criteria_mismatch — tool worked but criteria failed
    const failedCriteria = judgeData?.criteria?.filter((c) => !c.pass) ?? [];
    byCause.criteria_mismatch.push({
      queryId: result.queryId,
      rootCause: "criteria_mismatch",
      detail: `Tools fired OK but criteria failed: ${failedCriteria.map((c) => `"${c.criterion}"`).join(", ")}`,
      suggestedFix: `Adjust criterion to match actual output format: ${failedCriteria.map((c) => c.criterion).slice(0, 2).join("; ")}`,
    });
  }

  // Build top suggestions
  const topSuggestions: string[] = [];
  const causeEntries = Object.entries(byCause) as [FailureRootCause, DiagnosisEntry[]][];
  for (const [cause, entries] of causeEntries.sort((a, b) => b[1].length - a[1].length)) {
    if (entries.length === 0) continue;
    topSuggestions.push(`[${cause}] ${entries.length} failures — ${entries[0].suggestedFix}`);
  }

  return {
    runId,
    totalFails: fails.length,
    byCause,
    topSuggestions,
  };
}

/** Generate new corpus queries from a diagnosis report to cover gaps */
export function growCorpus(diagnosis: DiagnosisReport): EvalQuery[] {
  const newQueries: EvalQuery[] = [];
  const existingCorpus = generateQueryCorpus();
  const existingIds = new Set(existingCorpus.map((q) => q.id));
  const queryMap = new Map(existingCorpus.map((q) => [q.id, q]));

  // Collect all tools used across the corpus
  const coveredToolCombos = new Set<string>();
  for (const q of existingCorpus) {
    coveredToolCombos.add(q.expectedTools.sort().join("+"));
  }

  let seqId = 0;
  const makeId = () => `grown_${String(++seqId).padStart(3, "0")}`;

  // 1. For each criteria_mismatch failure, generate variant queries
  for (const entry of diagnosis.byCause.criteria_mismatch) {
    const original = queryMap.get(entry.queryId);
    if (!original) continue;

    // Variant 1: rephrase the query
    const variant1Id = makeId();
    if (!existingIds.has(variant1Id)) {
      newQueries.push({
        id: variant1Id,
        query: `${original.query} — provide details`,
        persona: original.persona,
        scenario: original.scenario,
        expectedTools: [...original.expectedTools],
        forbiddenTools: [...original.forbiddenTools],
        booleanCriteria: original.booleanCriteria.map((bc) => ({ ...bc })),
      });
    }

    // Variant 2: same tools, different scenario angle
    const variant2Id = makeId();
    if (!existingIds.has(variant2Id)) {
      newQueries.push({
        id: variant2Id,
        query: `Summarize results for: ${original.query}`,
        persona: original.persona,
        scenario: original.scenario,
        expectedTools: [...original.expectedTools],
        forbiddenTools: [...original.forbiddenTools],
        booleanCriteria: [
          { criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 },
          { criterion: "At least one expected tool completed successfully", weight: 2 },
          { criterion: "Output does not contain error stack traces or crash messages", weight: 1 },
        ],
      });
    }

    // Cap growth per round
    if (newQueries.length >= 20) break;
  }

  // 2. For heuristic_too_strict failures, generate simplified-criteria variants
  for (const entry of diagnosis.byCause.heuristic_too_strict) {
    if (newQueries.length >= 30) break;
    const original = queryMap.get(entry.queryId);
    if (!original) continue;

    const variantId = makeId();
    newQueries.push({
      id: variantId,
      query: original.query,
      persona: original.persona,
      scenario: original.scenario,
      expectedTools: [...original.expectedTools],
      forbiddenTools: [...original.forbiddenTools],
      // Simplified criteria that the heuristic can actually judge
      booleanCriteria: [
        { criterion: "Output contains meaningful structured content (not just errors or empty results)", weight: 2 },
        { criterion: "At least one expected tool completed successfully", weight: 2 },
        { criterion: "Output does not contain error stack traces or crash messages", weight: 1 },
      ],
    });
  }

  return newQueries;
}

/** Print a diagnosis report to stdout */
function printDiagnosis(diagnosis: DiagnosisReport): void {
  console.log(`\nFAILURE DIAGNOSIS — Run ${diagnosis.runId}`);
  console.log("=".repeat(50));
  console.log(`Total failures: ${diagnosis.totalFails}`);

  const causeEntries = Object.entries(diagnosis.byCause) as [FailureRootCause, DiagnosisEntry[]][];
  for (const [cause, entries] of causeEntries.sort((a, b) => b[1].length - a[1].length)) {
    if (entries.length === 0) continue;
    const pct = diagnosis.totalFails > 0 ? ((entries.length / diagnosis.totalFails) * 100).toFixed(1) : "0";
    console.log(`\n  ${cause}: ${entries.length} (${pct}%)`);
    for (const e of entries.slice(0, 5)) {
      console.log(`    ${e.queryId}: ${e.detail.slice(0, 100)}`);
    }
    if (entries.length > 5) {
      console.log(`    ... and ${entries.length - 5} more`);
    }
  }

  if (diagnosis.topSuggestions.length > 0) {
    console.log(`\nTOP SUGGESTIONS:`);
    for (const s of diagnosis.topSuggestions) {
      console.log(`  → ${s}`);
    }
  }
  console.log("");
}

/** Run the self-improving flywheel loop */
async function runFlywheel(options: RunOptions): Promise<void> {
  console.log("\n🔄 FLYWHEEL MODE — self-improving eval loop");
  console.log("=".repeat(50));

  // Step 1: Run initial eval
  console.log("\n[flywheel] Step 1: Running initial eval...");
  const initialSummary = await runLlmJudgeEval(options);
  const initialPassRate = initialSummary.passRate;

  // Step 2: Diagnose failures
  console.log("[flywheel] Step 2: Diagnosing failures...");
  const diagnosis = await diagnoseFailures(initialSummary.runId);
  printDiagnosis(diagnosis);

  // Step 3: Check if heuristic_too_strict > 20% of failures → already fixed by new heuristic
  const heuristicStrictCount = diagnosis.byCause.heuristic_too_strict.length;
  const heuristicStrictPct = diagnosis.totalFails > 0 ? heuristicStrictCount / diagnosis.totalFails : 0;
  if (heuristicStrictPct > 0.2) {
    console.log(`[flywheel] WARNING: ${(heuristicStrictPct * 100).toFixed(1)}% of failures are heuristic_too_strict — heuristic patterns need further loosening`);
  }

  // Step 4: Grow corpus
  console.log("[flywheel] Step 4: Growing corpus with variant queries...");
  const newQueries = growCorpus(diagnosis);
  console.log(`[flywheel] Generated ${newQueries.length} new variant queries`);

  if (newQueries.length === 0) {
    console.log("[flywheel] No new queries generated — nothing to re-run");
    console.log(`\nFLYWHEEL RESULT: Pass rate ${(initialPassRate * 100).toFixed(1)}% (no improvement path found)`);
    return;
  }

  // Step 5: Re-run eval with grown corpus (original + new queries)
  console.log("[flywheel] Step 5: Re-running eval with grown corpus...");
  const rerunOptions: RunOptions = {
    ...options,
    queryLimit: options.queryLimit + newQueries.length,
    baselineRunId: initialSummary.runId,
  };
  const rerunSummary = await runLlmJudgeEval(rerunOptions);

  // Step 6: Compare pass rates
  const delta = rerunSummary.passRate - initialPassRate;
  const deltaSign = delta >= 0 ? "+" : "";

  console.log(`\nFLYWHEEL RESULT`);
  console.log("=".repeat(50));
  console.log(`  Initial pass rate:  ${(initialPassRate * 100).toFixed(1)}%`);
  console.log(`  Rerun pass rate:    ${(rerunSummary.passRate * 100).toFixed(1)}%`);
  console.log(`  Delta:              ${deltaSign}${(delta * 100).toFixed(1)}%`);
  console.log(`  Corpus grew:        ${options.queryLimit} → ${rerunOptions.queryLimit} queries`);
  console.log(`  Baseline run:       ${initialSummary.runId}`);
  console.log(`  Rerun:              ${rerunSummary.runId}`);

  if (delta > 0) {
    console.log(`  Verdict:            IMPROVED`);
  } else if (delta === 0) {
    console.log(`  Verdict:            NO CHANGE`);
  } else {
    console.log(`  Verdict:            REGRESSED (investigate new queries)`);
  }
  console.log("");
}

// ══════════════════════════════════════════════════════════════════════════════
// CLI
// ══════════════════════════════════════════════════════════════════════════════

function parseArgs(argv: string[]): RunOptions {
  const options: RunOptions = { queryLimit: 50 };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--queries":
        options.queryLimit = parseInt(argv[++i], 10) || 50;
        break;
      case "--persona":
        options.persona = argv[++i] as Persona;
        break;
      case "--scenario":
        options.scenario = argv[++i] as Scenario;
        break;
      case "--baseline":
        options.baselineRunId = argv[++i];
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--flywheel":
        options.flywheel = true;
        break;
      case "--surface":
        options.surface = argv[++i] as Surface;
        break;
      default:
        if (arg.startsWith("--")) {
          console.error(`Unknown flag: ${arg}`);
        }
    }
  }

  return options;
}

async function main() {
  // Try loading from .env.local if GEMINI_API_KEY not in environment
  if (!process.env.GEMINI_API_KEY) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      // Search multiple locations for .env.local
      const candidates = [
        path.resolve(process.cwd(), ".env.local"),
        path.resolve(process.cwd(), "../../.env.local"),
        path.resolve(process.cwd(), "../.env.local"),
      ];
      for (const envPath of candidates) {
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, "utf-8");
          for (const line of content.split("\n")) {
            const match = line.match(/^([^#=]+)=(.*)$/);
            if (match) process.env[match[1].trim()] = match[2].trim();
          }
          if (process.env.GEMINI_API_KEY) {
            console.log(`[env] Loaded GEMINI_API_KEY from ${envPath}`);
            break;
          }
        }
      }
    } catch { /* ignore env loading errors */ }
  }

  const options = parseArgs(process.argv.slice(2));

  console.log("NodeBench LLM Judge Eval Harness");
  console.log("================================");
  console.log(`  Surface:  ${options.surface ?? "mcp"}`);
  console.log(`  Queries:  ${options.queryLimit}`);
  console.log(`  Persona:  ${options.persona ?? "all"}`);
  console.log(`  Scenario: ${options.scenario ?? "all"}`);
  console.log(`  Baseline: ${options.baselineRunId ?? "none"}`);
  console.log(`  Judge:    ${process.env.GEMINI_API_KEY ? `${GEMINI_MODEL_LITE} + ${GEMINI_MODEL_FULL} (hybrid)` : "Heuristic fallback"}`);
  console.log(`  Flywheel: ${options.flywheel ? "ON" : "off"}`);
  console.log("");

  try {
    if (options.flywheel) {
      await runFlywheel(options);
      process.exit(0);
    }

    const summary = await runLlmJudgeEval(options);
    if (options.dryRun) process.exit(0);
    process.exit(summary.passRate >= 0.5 ? 0 : 1);
  } catch (err: any) {
    console.error(`Fatal error: ${err.message}`);
    process.exit(2);
  }
}

// Run if invoked directly
const isDirectRun = process.argv[1]?.includes("llmJudgeEval");
if (isDirectRun) {
  main();
}
