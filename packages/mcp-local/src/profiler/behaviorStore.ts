/**
 * behaviorStore.ts — Behavioral Profiling persistence layer.
 *
 * SQLite tables for logging sessions, queries, tool calls, context reuse,
 * and workflow paths. This is the foundation for the Founder Operating Profiler.
 *
 * Architecture:
 * - LLM for meaning (intent inference, pattern detection, optimization suggestions)
 * - Deterministic code for control (logging, storage, privacy, budget enforcement)
 *
 * Tables:
 * - behavior_sessions: session-level aggregates
 * - behavior_queries: every search/prompt with normalized intent
 * - behavior_tool_calls: every MCP tool call with cost/latency
 * - context_reuse_events: when prior packets/context were reused
 * - workflow_paths: end-to-end step sequences with outcomes
 * - optimization_suggestions: generated optimization recommendations
 * - behavior_profiles: compact learned user behavior (updated periodically)
 */

import { getDb, genId } from "../db.js";

// ── Schema initialization ────────────────────────────────────────────

export function initBehaviorTables(): void {
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

// ── Logging functions ────────────────────────────────────────────────

export function logSession(data: {
  userId?: string;
  companyId?: string;
  interfaceSurface?: string;
  roleInferred?: string;
  mainObjective?: string;
}): string {
  const db = getDb();
  const id = genId("bsess");
  db.prepare(`
    INSERT INTO behavior_sessions (id, user_id, company_id, interface_surface, role_inferred, start_time, main_objective)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.userId ?? null, data.companyId ?? null, data.interfaceSurface ?? "ai_app", data.roleInferred ?? "founder", new Date().toISOString(), data.mainObjective ?? null);
  return id;
}

export function logQuery(data: {
  sessionId: string;
  rawQuery: string;
  classification?: string;
  normalizedIntent?: string;
  entityTargets?: string[];
  ownCompanyMode?: boolean;
  followupToQueryId?: string;
  confidenceScore?: number;
  latencyMs?: number;
}): string {
  const db = getDb();
  const id = genId("bqry");
  db.prepare(`
    INSERT INTO behavior_queries (id, session_id, raw_query, normalized_intent, classification, entity_targets, own_company_mode, followup_to_query_id, confidence_score, latency_ms, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.sessionId, data.rawQuery, data.normalizedIntent ?? null, data.classification ?? null,
    JSON.stringify(data.entityTargets ?? []), data.ownCompanyMode ? 1 : 0,
    data.followupToQueryId ?? null, data.confidenceScore ?? null,
    data.latencyMs ?? null, new Date().toISOString()
  );
  return id;
}

export function logToolCall(data: {
  sessionId: string;
  queryId?: string;
  toolName: string;
  inputSummary?: string;
  outputSummary?: string;
  latencyMs: number;
  costEstimateUsd: number;
  cacheHit?: boolean;
  success: boolean;
  modelUsed?: string;
  tokenEstimate?: number;
  isRedundant?: boolean;
}): string {
  const db = getDb();
  const id = genId("btc");
  db.prepare(`
    INSERT INTO behavior_tool_calls (id, session_id, query_id, tool_name, input_summary, output_summary, latency_ms, cost_estimate_usd, cache_hit, success, model_used, token_estimate, is_redundant, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.sessionId, data.queryId ?? null, data.toolName,
    data.inputSummary ?? null, data.outputSummary ?? null,
    data.latencyMs, data.costEstimateUsd,
    data.cacheHit ? 1 : 0, data.success ? 1 : 0,
    data.modelUsed ?? null, data.tokenEstimate ?? null,
    data.isRedundant ? 1 : 0, new Date().toISOString()
  );

  // Update session aggregates
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

export function logContextReuse(data: {
  sessionId: string;
  reuseType: string;
  sourcePacketId?: string;
  sourceMemoId?: string;
  sourceQueryId?: string;
  fieldsReused?: string[];
  tokensSavedEstimate?: number;
}): string {
  const db = getDb();
  const id = genId("bcre");
  db.prepare(`
    INSERT INTO context_reuse_events (id, session_id, reuse_type, source_packet_id, source_memo_id, source_query_id, fields_reused, tokens_saved_estimate, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.sessionId, data.reuseType,
    data.sourcePacketId ?? null, data.sourceMemoId ?? null, data.sourceQueryId ?? null,
    JSON.stringify(data.fieldsReused ?? []), data.tokensSavedEstimate ?? 0,
    new Date().toISOString()
  );

  // Update session reuse count
  db.prepare(`UPDATE behavior_sessions SET reused_context_count = reused_context_count + 1 WHERE id = ?`).run(data.sessionId);

  return id;
}

// ── Query functions for insights ─────────────────────────────────────

export function getSessionInsights(sessionId: string): {
  session: any;
  queries: any[];
  toolCalls: any[];
  reuseEvents: any[];
  topTools: Array<{ tool: string; count: number; avgLatencyMs: number; totalCost: number }>;
} {
  const db = getDb();
  const session = db.prepare(`SELECT * FROM behavior_sessions WHERE id = ?`).get(sessionId);
  const queries = db.prepare(`SELECT * FROM behavior_queries WHERE session_id = ? ORDER BY timestamp`).all(sessionId);
  const toolCalls = db.prepare(`SELECT * FROM behavior_tool_calls WHERE session_id = ? ORDER BY timestamp`).all(sessionId);
  const reuseEvents = db.prepare(`SELECT * FROM context_reuse_events WHERE session_id = ? ORDER BY timestamp`).all(sessionId);

  // Aggregate tool stats
  const toolStats = db.prepare(`
    SELECT tool_name as tool, COUNT(*) as count,
      CAST(AVG(latency_ms) AS INTEGER) as avgLatencyMs,
      ROUND(SUM(cost_estimate_usd), 4) as totalCost
    FROM behavior_tool_calls WHERE session_id = ?
    GROUP BY tool_name ORDER BY count DESC LIMIT 10
  `).all(sessionId) as Array<{ tool: string; count: number; avgLatencyMs: number; totalCost: number }>;

  return { session, queries, toolCalls, reuseEvents, topTools: toolStats };
}

export function getAggregateInsights(daysBack: number = 7): {
  totalSessions: number;
  totalQueries: number;
  totalToolCalls: number;
  totalCostUsd: number;
  redundantCallRate: number;
  topTools: Array<{ tool: string; count: number; avgLatencyMs: number; totalCost: number }>;
  repeatedQueries: Array<{ query: string; count: number }>;
  reuseRate: number;
} {
  const db = getDb();
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

  const stats = db.prepare(`
    SELECT COUNT(*) as totalSessions,
      COALESCE(SUM(total_tool_calls), 0) as totalToolCalls,
      COALESCE(SUM(estimated_cost_usd), 0) as totalCost,
      COALESCE(SUM(redundant_calls), 0) as redundantCalls,
      COALESCE(SUM(reused_context_count), 0) as reusedCount
    FROM behavior_sessions WHERE start_time >= ?
  `).get(since) as any;

  const totalQueries = (db.prepare(`SELECT COUNT(*) as c FROM behavior_queries WHERE timestamp >= ?`).get(since) as any)?.c ?? 0;

  const topTools = db.prepare(`
    SELECT tool_name as tool, COUNT(*) as count,
      CAST(AVG(latency_ms) AS INTEGER) as avgLatencyMs,
      ROUND(SUM(cost_estimate_usd), 4) as totalCost
    FROM behavior_tool_calls WHERE timestamp >= ?
    GROUP BY tool_name ORDER BY count DESC LIMIT 15
  `).all(since) as Array<{ tool: string; count: number; avgLatencyMs: number; totalCost: number }>;

  // Find repeated queries (normalized)
  const repeatedQueries = db.prepare(`
    SELECT raw_query as query, COUNT(*) as count
    FROM behavior_queries WHERE timestamp >= ?
    GROUP BY LOWER(TRIM(raw_query)) HAVING count > 1
    ORDER BY count DESC LIMIT 10
  `).all(since) as Array<{ query: string; count: number }>;

  return {
    totalSessions: stats?.totalSessions ?? 0,
    totalQueries,
    totalToolCalls: stats?.totalToolCalls ?? 0,
    totalCostUsd: Math.round((stats?.totalCost ?? 0) * 1000) / 1000,
    redundantCallRate: stats?.totalToolCalls > 0 ? Math.round((stats?.redundantCalls / stats?.totalToolCalls) * 100) : 0,
    topTools,
    repeatedQueries,
    reuseRate: stats?.totalSessions > 0 ? Math.round((stats?.reusedCount / stats?.totalSessions) * 100) : 0,
  };
}

// ── Repeated question detection ──────────────────────────────────────

export function findSimilarPriorQuery(query: string, sessionId?: string): { found: boolean; priorQueryId?: string; priorAnswer?: string; similarity?: string } {
  const db = getDb();
  const normalized = query.toLowerCase().trim().replace(/[?!.,]+$/g, "");

  // Exact or near-exact match in last 7 days
  const prior = db.prepare(`
    SELECT id, raw_query, resulting_packet_type, classification
    FROM behavior_queries
    WHERE LOWER(TRIM(raw_query)) = ? AND (session_id != ? OR ? IS NULL)
    ORDER BY timestamp DESC LIMIT 1
  `).get(normalized, sessionId ?? null, sessionId ?? null) as any;

  if (prior) {
    return { found: true, priorQueryId: prior.id, similarity: "exact" };
  }

  return { found: false };
}
