import { createHash } from "node:crypto";

import { genId, getDb } from "../db.js";

export type FounderEpisodeStatus = "active" | "completed" | "error" | "aborted";
export type FounderEpisodeSurface = "web" | "api" | "browser" | "claude_code" | "openclaw" | "local_runtime";

export interface FounderEpisodeRecord {
  episodeId: string;
  correlationId: string;
  sessionKey?: string | null;
  workspaceId?: string | null;
  companyKey?: string | null;
  surface: FounderEpisodeSurface;
  episodeType: string;
  status: FounderEpisodeStatus;
  query?: string | null;
  lens?: string | null;
  entityName?: string | null;
  packetId?: string | null;
  packetType?: string | null;
  contextId?: string | null;
  taskId?: string | null;
  summary?: string | null;
  stateBefore?: Record<string, unknown>;
  stateAfter?: Record<string, unknown>;
  stateBeforeHash?: string | null;
  stateAfterHash?: string | null;
  spans: Array<Record<string, unknown>>;
  traceStepCount?: number | null;
  toolsInvoked: string[];
  artifactsProduced: string[];
  importantChangesDetected?: number | null;
  contradictionsDetected?: number | null;
  metadata?: Record<string, unknown>;
  startedAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

function json(value: unknown, fallback: unknown = {}): string {
  return JSON.stringify(value ?? fallback);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload ?? null)).digest("hex");
}

function parseRow(row: any): FounderEpisodeRecord {
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
    stateBefore: parseJson<Record<string, unknown>>(row.state_before_json, {}),
    stateAfter: parseJson<Record<string, unknown>>(row.state_after_json, {}),
    stateBeforeHash: row.state_before_hash ?? null,
    stateAfterHash: row.state_after_hash ?? null,
    spans: parseJson<Array<Record<string, unknown>>>(row.spans_json, []),
    traceStepCount: row.trace_step_count ?? null,
    toolsInvoked: parseJson<string[]>(row.tools_invoked_json, []),
    artifactsProduced: parseJson<string[]>(row.artifacts_produced_json, []),
    importantChangesDetected: row.important_changes_detected ?? null,
    contradictionsDetected: row.contradictions_detected ?? null,
    metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
  };
}

export function startFounderEpisode(input: {
  episodeId?: string;
  correlationId?: string;
  sessionKey?: string | null;
  workspaceId?: string | null;
  companyKey?: string | null;
  surface: FounderEpisodeSurface;
  episodeType: string;
  query?: string | null;
  lens?: string | null;
  entityName?: string | null;
  stateBefore?: Record<string, unknown>;
  stateBeforeHash?: string;
  metadata?: Record<string, unknown>;
  initialSpan?: Record<string, unknown>;
}): FounderEpisodeRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const episodeId = input.episodeId ?? genId("episode");
  const correlationId = input.correlationId ?? genId("corr");
  const existing = db.prepare(`
    SELECT *
    FROM founder_harness_episodes
    WHERE episode_id = ?
    LIMIT 1
  `).get(episodeId) as any;

  const stateBeforeHash = input.stateBeforeHash ?? hashPayload(input.stateBefore ?? null);
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
      input.stateBefore ? json(input.stateBefore) : null,
      stateBeforeHash,
      json(spans, []),
      input.metadata ? json(input.metadata) : null,
      now,
      episodeId,
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
      json(input.stateBefore),
      stateBeforeHash,
      json(spans, []),
      input.metadata ? json(input.metadata) : null,
      now,
      now,
    );
  }

  return getFounderEpisode(episodeId)!;
}

export function appendFounderEpisodeSpan(input: {
  episodeId: string;
  span: Record<string, unknown>;
  contextId?: string | null;
  taskId?: string | null;
  entityName?: string | null;
  packetId?: string | null;
  packetType?: string | null;
  workspaceId?: string | null;
  companyKey?: string | null;
  metadata?: Record<string, unknown>;
}): FounderEpisodeRecord {
  const db = getDb();
  const existing = getFounderEpisode(input.episodeId);
  if (!existing) {
    throw new Error(`Founder harness episode not found: ${input.episodeId}`);
  }

  const spans = [...existing.spans, input.span];
  const metadata = input.metadata ? { ...(existing.metadata ?? {}), ...input.metadata } : existing.metadata;
  const now = new Date().toISOString();

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
    json(spans, []),
    input.contextId ?? null,
    input.taskId ?? null,
    input.entityName ?? null,
    input.packetId ?? null,
    input.packetType ?? null,
    input.workspaceId ?? null,
    input.companyKey ?? null,
    json(metadata),
    now,
    input.episodeId,
  );

  return getFounderEpisode(input.episodeId)!;
}

export function finalizeFounderEpisode(input: {
  episodeId: string;
  status?: FounderEpisodeStatus;
  stateAfter?: Record<string, unknown>;
  stateAfterHash?: string;
  summary?: string | null;
  toolsInvoked?: string[];
  artifactsProduced?: string[];
  traceStepCount?: number | null;
  importantChangesDetected?: number | null;
  contradictionsDetected?: number | null;
  contextId?: string | null;
  taskId?: string | null;
  entityName?: string | null;
  packetId?: string | null;
  packetType?: string | null;
  workspaceId?: string | null;
  companyKey?: string | null;
  finalSpan?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): FounderEpisodeRecord {
  const db = getDb();
  const existing = getFounderEpisode(input.episodeId);
  if (!existing) {
    throw new Error(`Founder harness episode not found: ${input.episodeId}`);
  }

  const spans = input.finalSpan ? [...existing.spans, input.finalSpan] : existing.spans;
  const toolsInvoked = input.toolsInvoked
    ? Array.from(new Set([...(existing.toolsInvoked ?? []), ...input.toolsInvoked]))
    : existing.toolsInvoked;
  const artifactsProduced = input.artifactsProduced
    ? Array.from(new Set([...(existing.artifactsProduced ?? []), ...input.artifactsProduced]))
    : existing.artifactsProduced;
  const metadata = input.metadata ? { ...(existing.metadata ?? {}), ...input.metadata } : existing.metadata;
  const now = new Date().toISOString();

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
    input.stateAfter ? json(input.stateAfter) : null,
    input.stateAfterHash ?? hashPayload(input.stateAfter ?? existing.stateAfter ?? null),
    input.summary ?? null,
    json(toolsInvoked, []),
    json(artifactsProduced, []),
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
    json(spans, []),
    json(metadata),
    now,
    now,
    input.episodeId,
  );

  return getFounderEpisode(input.episodeId)!;
}

export function getFounderEpisode(episodeId: string): FounderEpisodeRecord | null {
  const row = getDb().prepare(`
    SELECT *
    FROM founder_harness_episodes
    WHERE episode_id = ?
    LIMIT 1
  `).get(episodeId) as any;

  return row ? parseRow(row) : null;
}

export function listFounderEpisodes(input: {
  sessionKey?: string | null;
  workspaceId?: string | null;
  status?: FounderEpisodeStatus;
  limit?: number;
} = {}): FounderEpisodeRecord[] {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  const db = getDb();

  let rows: any[] = [];
  if (input.sessionKey) {
    rows = db.prepare(`
      SELECT *
      FROM founder_harness_episodes
      WHERE session_key = ?
      ORDER BY started_at DESC
      LIMIT ?
    `).all(input.sessionKey, limit * 2) as any[];
  } else if (input.workspaceId) {
    rows = db.prepare(`
      SELECT *
      FROM founder_harness_episodes
      WHERE workspace_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `).all(input.workspaceId, limit * 2) as any[];
  } else {
    rows = db.prepare(`
      SELECT *
      FROM founder_harness_episodes
      ORDER BY started_at DESC
      LIMIT ?
    `).all(limit * 2) as any[];
  }

  const parsed = rows.map(parseRow);
  return input.status ? parsed.filter((row) => row.status === input.status).slice(0, limit) : parsed.slice(0, limit);
}
