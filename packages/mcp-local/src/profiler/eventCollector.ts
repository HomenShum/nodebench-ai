/**
 * eventCollector.ts — Unified Event Collector for the Integration Layer.
 *
 * All observation paths (MCP proxy, OTel, hooks, framework wrappers)
 * convert into one canonical event schema and flow through this collector.
 *
 * The collector:
 * 1. Normalizes events from any source into UnifiedEvent
 * 2. Stores in SQLite (bounded, with eviction)
 * 3. Detects duplicates and correlates by session/trace
 * 4. Feeds the pattern engine and proof layer
 *
 * Integration paths:
 * A. Claude Code / local hook → logHookEvent()
 * B. MCP proxy → logMcpProxyEvent()
 * C. OTel receiver → logOtelSpan()
 * D. Framework wrappers → logFrameworkEvent()
 *
 * All converge to: ingestEvent(UnifiedEvent)
 */

import { getDb, genId } from "../db.js";

// ── Unified Event Schema ─────────────────────────────────────────────

export interface UnifiedEvent {
  eventId: string;
  timestamp: string;
  surface: "claude_code" | "cursor" | "windsurf" | "openclaw" | "ai_app" | "mcp_direct" | "otel" | "framework" | "unknown";
  integrationPath: "mcp_proxy" | "otel_receiver" | "local_hook" | "framework_wrapper" | "direct";
  sessionId: string;
  traceId?: string;
  spanId?: string;
  companyId?: string;
  userId?: string;
  toolName: string;
  toolInputSummary?: string;
  toolOutputSummary?: string;
  latencyMs: number;
  tokenIn?: number;
  tokenOut?: number;
  estimatedCostUsd: number;
  cacheHit: boolean;
  success: boolean;
  modelUsed?: string;
  packetId?: string;
  entityIds?: string[];
  artifactIds?: string[];
  pathStepIndex?: number;
  // Metadata for dedup + correlation
  fingerprint?: string;  // Hash of toolName + inputSummary for dedup
  parentSpanId?: string;
}

// ── Cost estimation by tool + model ──────────────────────────────────

const MODEL_COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  "gemini-3.1-flash-lite-preview": { input: 0.00002, output: 0.00008 },
  "gemini-3.1-flash-preview": { input: 0.00015, output: 0.0006 },
  "gemini-2.5-flash-preview": { input: 0.00015, output: 0.0006 },
  "claude-sonnet-4-6": { input: 0.003, output: 0.015 },
  "claude-opus-4-6": { input: 0.015, output: 0.075 },
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  _default: { input: 0.001, output: 0.003 },
};

const TOOL_BASE_COST: Record<string, number> = {
  web_search: 0.008,
  fetch_url: 0.002,
  enrich_entity: 0.015,
  run_deep_sim: 0.05,
  build_claim_graph: 0.03,
  render_decision_memo: 0.01,
  _default: 0.003,
};

export function estimateEventCost(event: Partial<UnifiedEvent>): number {
  let cost = TOOL_BASE_COST[event.toolName ?? ""] ?? TOOL_BASE_COST._default;

  if (event.modelUsed && (event.tokenIn || event.tokenOut)) {
    const rates = MODEL_COST_PER_1K_TOKENS[event.modelUsed] ?? MODEL_COST_PER_1K_TOKENS._default;
    cost += ((event.tokenIn ?? 0) / 1000) * rates.input;
    cost += ((event.tokenOut ?? 0) / 1000) * rates.output;
  }

  return Math.round(cost * 10000) / 10000;
}

// ── Schema initialization ────────────────────────────────────────────

export function initEventCollectorTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS unified_events (
      event_id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      surface TEXT NOT NULL DEFAULT 'unknown',
      integration_path TEXT NOT NULL DEFAULT 'direct',
      session_id TEXT NOT NULL,
      trace_id TEXT,
      span_id TEXT,
      company_id TEXT,
      user_id TEXT,
      tool_name TEXT NOT NULL,
      tool_input_summary TEXT,
      tool_output_summary TEXT,
      latency_ms INTEGER DEFAULT 0,
      token_in INTEGER DEFAULT 0,
      token_out INTEGER DEFAULT 0,
      estimated_cost_usd REAL DEFAULT 0,
      cache_hit INTEGER DEFAULT 0,
      success INTEGER DEFAULT 1,
      model_used TEXT,
      packet_id TEXT,
      entity_ids TEXT DEFAULT '[]',
      artifact_ids TEXT DEFAULT '[]',
      path_step_index INTEGER,
      fingerprint TEXT,
      parent_span_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ue_session ON unified_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_ue_tool ON unified_events(tool_name);
    CREATE INDEX IF NOT EXISTS idx_ue_timestamp ON unified_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_ue_fingerprint ON unified_events(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_ue_surface ON unified_events(surface);
  `);
}

// ── Fingerprinting for dedup ─────────────────────────────────────────

function computeFingerprint(toolName: string, inputSummary?: string): string {
  const raw = `${toolName}:${(inputSummary ?? "").toLowerCase().trim().slice(0, 200)}`;
  // Simple hash — not crypto, just dedup
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

// ── Core ingestion ───────────────────────────────────────────────────

const MAX_EVENTS = 10000;
let eventCount = 0;

export function ingestEvent(event: Partial<UnifiedEvent>): { eventId: string; isDuplicate: boolean; estimatedCost: number } {
  const db = getDb();

  const eventId = event.eventId ?? genId("evt");
  const timestamp = event.timestamp ?? new Date().toISOString();
  const fingerprint = event.fingerprint ?? computeFingerprint(event.toolName ?? "unknown", event.toolInputSummary);
  const estimatedCost = event.estimatedCostUsd ?? estimateEventCost(event);

  // Dedup: check for same fingerprint in same session within 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const duplicate = db.prepare(`
    SELECT event_id FROM unified_events
    WHERE fingerprint = ? AND session_id = ? AND timestamp > ?
    LIMIT 1
  `).get(fingerprint, event.sessionId ?? "unknown", fiveMinAgo) as any;

  const isDuplicate = !!duplicate;

  db.prepare(`
    INSERT OR IGNORE INTO unified_events
    (event_id, timestamp, surface, integration_path, session_id, trace_id, span_id,
     company_id, user_id, tool_name, tool_input_summary, tool_output_summary,
     latency_ms, token_in, token_out, estimated_cost_usd, cache_hit, success,
     model_used, packet_id, entity_ids, artifact_ids, path_step_index, fingerprint, parent_span_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId, timestamp,
    event.surface ?? "unknown", event.integrationPath ?? "direct",
    event.sessionId ?? "unknown", event.traceId ?? null, event.spanId ?? null,
    event.companyId ?? null, event.userId ?? null,
    event.toolName ?? "unknown", event.toolInputSummary ?? null, event.toolOutputSummary ?? null,
    event.latencyMs ?? 0, event.tokenIn ?? 0, event.tokenOut ?? 0,
    estimatedCost, event.cacheHit ? 1 : 0, event.success !== false ? 1 : 0,
    event.modelUsed ?? null, event.packetId ?? null,
    JSON.stringify(event.entityIds ?? []), JSON.stringify(event.artifactIds ?? []),
    event.pathStepIndex ?? null, fingerprint, event.parentSpanId ?? null,
  );

  // Bounded eviction
  eventCount++;
  if (eventCount % 500 === 0) {
    const total = (db.prepare(`SELECT COUNT(*) as c FROM unified_events`).get() as any)?.c ?? 0;
    if (total > MAX_EVENTS) {
      db.prepare(`DELETE FROM unified_events WHERE event_id IN (SELECT event_id FROM unified_events ORDER BY timestamp ASC LIMIT ?)`).run(total - MAX_EVENTS);
    }
  }

  return { eventId, isDuplicate, estimatedCost };
}

// ── Path-specific ingestion helpers ──────────────────────────────────

/** Path A: Claude Code / local hook */
export function logHookEvent(data: {
  sessionId: string;
  toolName: string;
  toolInput?: string;
  toolOutput?: string;
  durationMs?: number;
  success?: boolean;
}): ReturnType<typeof ingestEvent> {
  return ingestEvent({
    surface: "claude_code",
    integrationPath: "local_hook",
    sessionId: data.sessionId,
    toolName: data.toolName,
    toolInputSummary: data.toolInput?.slice(0, 500),
    toolOutputSummary: data.toolOutput?.slice(0, 500),
    latencyMs: data.durationMs ?? 0,
    success: data.success ?? true,
  });
}

/** Path B: MCP proxy interception */
export function logMcpProxyEvent(data: {
  sessionId: string;
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
  durationMs: number;
  success: boolean;
  modelUsed?: string;
  tokenIn?: number;
  tokenOut?: number;
}): ReturnType<typeof ingestEvent> {
  return ingestEvent({
    surface: "mcp_direct",
    integrationPath: "mcp_proxy",
    sessionId: data.sessionId,
    toolName: data.toolName,
    toolInputSummary: JSON.stringify(data.args).slice(0, 500),
    toolOutputSummary: typeof data.result === "string" ? data.result.slice(0, 500) : JSON.stringify(data.result).slice(0, 500),
    latencyMs: data.durationMs,
    success: data.success,
    modelUsed: data.modelUsed,
    tokenIn: data.tokenIn,
    tokenOut: data.tokenOut,
  });
}

/** Path C: OTel span */
export function logOtelSpan(data: {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  toolName: string;
  startTimeMs: number;
  endTimeMs: number;
  attributes?: Record<string, unknown>;
}): ReturnType<typeof ingestEvent> {
  const attrs = data.attributes ?? {};
  return ingestEvent({
    surface: "otel",
    integrationPath: "otel_receiver",
    sessionId: data.traceId, // Use trace as session for OTel
    traceId: data.traceId,
    spanId: data.spanId,
    parentSpanId: data.parentSpanId,
    toolName: data.toolName,
    toolInputSummary: attrs["gen_ai.prompt"] as string ?? attrs["input"] as string,
    toolOutputSummary: attrs["gen_ai.completion"] as string ?? attrs["output"] as string,
    latencyMs: data.endTimeMs - data.startTimeMs,
    tokenIn: attrs["gen_ai.usage.prompt_tokens"] as number ?? undefined,
    tokenOut: attrs["gen_ai.usage.completion_tokens"] as number ?? undefined,
    modelUsed: attrs["gen_ai.request.model"] as string ?? undefined,
    success: attrs["error"] ? false : true,
  });
}

/** Path D: Framework wrapper (LangChain, CrewAI, etc.) */
export function logFrameworkEvent(data: {
  framework: string;
  sessionId: string;
  toolName: string;
  input?: string;
  output?: string;
  durationMs: number;
  modelUsed?: string;
  tokenIn?: number;
  tokenOut?: number;
  success?: boolean;
}): ReturnType<typeof ingestEvent> {
  return ingestEvent({
    surface: "framework",
    integrationPath: "framework_wrapper",
    sessionId: data.sessionId,
    toolName: data.toolName,
    toolInputSummary: data.input?.slice(0, 500),
    toolOutputSummary: data.output?.slice(0, 500),
    latencyMs: data.durationMs,
    modelUsed: data.modelUsed,
    tokenIn: data.tokenIn,
    tokenOut: data.tokenOut,
    success: data.success ?? true,
  });
}

// ── Query functions for the pattern engine ────────────────────────────

export function getRecentEvents(sessionId: string, limit: number = 50): UnifiedEvent[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM unified_events WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?`).all(sessionId, limit) as any[];
}

export function getDuplicateRate(daysBack: number = 7): { total: number; duplicates: number; rate: number } {
  const db = getDb();
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();
  const total = (db.prepare(`SELECT COUNT(*) as c FROM unified_events WHERE timestamp >= ?`).get(since) as any)?.c ?? 0;

  // Count events with same fingerprint appearing 2+ times in same session
  const duplicates = (db.prepare(`
    SELECT COUNT(*) as c FROM (
      SELECT fingerprint, session_id, COUNT(*) as cnt
      FROM unified_events WHERE timestamp >= ?
      GROUP BY fingerprint, session_id HAVING cnt > 1
    )
  `).get(since) as any)?.c ?? 0;

  return { total, duplicates, rate: total > 0 ? Math.round((duplicates / total) * 100) : 0 };
}

export function getCostByModel(daysBack: number = 7): Array<{ model: string; calls: number; totalCost: number; avgLatency: number }> {
  const db = getDb();
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();
  return db.prepare(`
    SELECT COALESCE(model_used, 'no_model') as model,
      COUNT(*) as calls,
      ROUND(SUM(estimated_cost_usd), 4) as totalCost,
      CAST(AVG(latency_ms) AS INTEGER) as avgLatency
    FROM unified_events WHERE timestamp >= ?
    GROUP BY model ORDER BY totalCost DESC
  `).all(since) as any[];
}

export function getCostBySurface(daysBack: number = 7): Array<{ surface: string; calls: number; totalCost: number }> {
  const db = getDb();
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();
  return db.prepare(`
    SELECT surface, COUNT(*) as calls, ROUND(SUM(estimated_cost_usd), 4) as totalCost
    FROM unified_events WHERE timestamp >= ?
    GROUP BY surface ORDER BY totalCost DESC
  `).all(since) as any[];
}

export function getTopToolChains(daysBack: number = 7, chainLength: number = 3): Array<{ chain: string; count: number }> {
  const db = getDb();
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

  // Get all sessions with 3+ events
  const sessions = db.prepare(`
    SELECT session_id FROM unified_events WHERE timestamp >= ?
    GROUP BY session_id HAVING COUNT(*) >= ? ORDER BY COUNT(*) DESC LIMIT 100
  `).all(since, chainLength) as Array<{ session_id: string }>;

  const chainCounts = new Map<string, number>();
  for (const { session_id } of sessions) {
    const events = db.prepare(`
      SELECT tool_name FROM unified_events
      WHERE session_id = ? AND timestamp >= ?
      ORDER BY timestamp ASC
    `).all(session_id, since) as Array<{ tool_name: string }>;

    for (let i = 0; i <= events.length - chainLength; i++) {
      const chain = events.slice(i, i + chainLength).map(e => e.tool_name).join(" → ");
      chainCounts.set(chain, (chainCounts.get(chain) ?? 0) + 1);
    }
  }

  return Array.from(chainCounts.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([chain, count]) => ({ chain, count }));
}
