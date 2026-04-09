/**
 * hyperloopArchive.ts — Archive of historically successful variants.
 *
 * Meta HyperAgent pattern: keep a population of successful variants
 * as stepping stones for improvement. Each entry is a packet template,
 * workflow path, routing policy, or signal recipe that worked.
 *
 * SQLite-backed. Bounded (MAX_ARCHIVE entries with eviction by lowest score).
 */

import { getDb, genId } from "../db.js";

// ─── Types ───────────────────────────────────────────────────────

export type ArchiveEntryType =
  | "packet_template"
  | "workflow_path"
  | "routing_policy"
  | "signal_recipe"
  | "export_adapter"
  | "delegation_shape";

export type ArchiveEntryStatus = "candidate" | "validated" | "promoted" | "retired";

export interface ArchiveEntry {
  id: string;
  type: ArchiveEntryType;
  name: string;
  description: string;
  content: string;             // JSON-stringified template/path/policy
  sourceEpisodeId: string;
  sourceQuery: string;
  sourceLens: string;
  sourceEntity: string | null;
  evidenceCoverage: number;
  contradictionsCaught: number;
  userEditDistance: number;
  wasExported: boolean;
  wasDelegated: boolean;
  qualityScore: number;
  improvementDelta: number;
  status: ArchiveEntryStatus;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ───────────────────────────────────────────────────

const MAX_ARCHIVE = 200;
const PROMOTE_USAGE_THRESHOLD = 5;
const VALIDATE_USAGE_THRESHOLD = 3;
const PROMOTE_QUALITY_THRESHOLD = 0.7;

// ─── Schema init ─────────────────────────────────────────────────

export function initHyperloopTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS hyperloop_archive (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      source_episode_id TEXT NOT NULL,
      source_query TEXT NOT NULL,
      source_lens TEXT NOT NULL,
      source_entity TEXT,
      evidence_coverage REAL NOT NULL DEFAULT 0,
      contradictions_caught INTEGER NOT NULL DEFAULT 0,
      user_edit_distance REAL NOT NULL DEFAULT 1,
      was_exported INTEGER NOT NULL DEFAULT 0,
      was_delegated INTEGER NOT NULL DEFAULT 0,
      quality_score REAL NOT NULL DEFAULT 0,
      improvement_delta REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'candidate',
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_archive_type_status ON hyperloop_archive(type, status);
    CREATE INDEX IF NOT EXISTS idx_archive_quality ON hyperloop_archive(quality_score DESC);
    CREATE INDEX IF NOT EXISTS idx_archive_type_quality ON hyperloop_archive(type, quality_score DESC);
  `);
}

// ─── CRUD ────────────────────────────────────────────────────────

export function addArchiveEntry(entry: Omit<ArchiveEntry, "id" | "status" | "usageCount" | "updatedAt">): ArchiveEntry {
  const db = getDb();
  initHyperloopTables();

  const id = genId("hyp");
  const now = new Date().toISOString();

  // Bounded: evict lowest quality if over limit
  const countRow = db.prepare("SELECT COUNT(*) as cnt FROM hyperloop_archive").get() as any;
  if ((countRow?.cnt ?? 0) >= MAX_ARCHIVE) {
    db.prepare(
      "DELETE FROM hyperloop_archive WHERE id IN (SELECT id FROM hyperloop_archive WHERE status = 'candidate' ORDER BY quality_score ASC LIMIT 10)"
    ).run();
  }

  db.prepare(`
    INSERT INTO hyperloop_archive (id, type, name, description, content, source_episode_id, source_query, source_lens, source_entity, evidence_coverage, contradictions_caught, user_edit_distance, was_exported, was_delegated, quality_score, improvement_delta, status, usage_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', 0, ?, ?)
  `).run(
    id, entry.type, entry.name, entry.description, entry.content,
    entry.sourceEpisodeId, entry.sourceQuery, entry.sourceLens, entry.sourceEntity ?? null,
    entry.evidenceCoverage, entry.contradictionsCaught, entry.userEditDistance,
    entry.wasExported ? 1 : 0, entry.wasDelegated ? 1 : 0,
    entry.qualityScore, entry.improvementDelta,
    entry.createdAt, now,
  );

  return { ...entry, id, status: "candidate", usageCount: 0, updatedAt: now };
}

/** Find the best archive entry for a given type + query context. */
export function lookupBestVariant(
  type: ArchiveEntryType,
  lens?: string,
  entity?: string,
): ArchiveEntry | null {
  const db = getDb();
  initHyperloopTables();

  // Prefer promoted > validated > candidate. Match lens/entity if possible.
  let row: any = null;

  if (entity) {
    row = db.prepare(
      "SELECT * FROM hyperloop_archive WHERE type = ? AND status = 'promoted' AND source_entity = ? ORDER BY quality_score DESC LIMIT 1"
    ).get(type, entity);
  }

  if (!row && lens) {
    row = db.prepare(
      "SELECT * FROM hyperloop_archive WHERE type = ? AND status = 'promoted' AND source_lens = ? ORDER BY quality_score DESC LIMIT 1"
    ).get(type, lens);
  }

  if (!row) {
    row = db.prepare(
      "SELECT * FROM hyperloop_archive WHERE type = ? AND status IN ('promoted', 'validated') ORDER BY quality_score DESC LIMIT 1"
    ).get(type);
  }

  if (!row) return null;

  // Increment usage count
  db.prepare("UPDATE hyperloop_archive SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), row.id);

  return rowToEntry(row);
}

/** Validate entries that meet thresholds. Promotion is human-gated in Convex. */
export function runPromotionCycle(): { promoted: number; validated: number } {
  const db = getDb();
  initHyperloopTables();

  // Candidate → Validated: usage >= 3, quality > 0.6
  const validated = db.prepare(
    "UPDATE hyperloop_archive SET status = 'validated', updated_at = ? WHERE status = 'candidate' AND usage_count >= ? AND quality_score > 0.6"
  ).run(new Date().toISOString(), VALIDATE_USAGE_THRESHOLD);

  // Validated → Promoted: usage >= 5, quality > 0.7, improvement_delta > 0
  // Promotion is deliberately not automatic here. Use the Convex HyperLoop
  // promotion mutation so reviewer id and deterministic gates are preserved.
  const promoted = { changes: 0 };

  return {
    promoted: promoted.changes,
    validated: validated.changes,
  };
}

/** Get archive stats. */
export function getArchiveStats(): {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  avgQuality: number;
} {
  const db = getDb();
  initHyperloopTables();

  const total = (db.prepare("SELECT COUNT(*) as cnt FROM hyperloop_archive").get() as any)?.cnt ?? 0;

  const typeRows = db.prepare("SELECT type, COUNT(*) as cnt FROM hyperloop_archive GROUP BY type").all() as any[];
  const byType: Record<string, number> = {};
  for (const r of typeRows) byType[r.type] = r.cnt;

  const statusRows = db.prepare("SELECT status, COUNT(*) as cnt FROM hyperloop_archive GROUP BY status").all() as any[];
  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = r.cnt;

  const avgRow = db.prepare("SELECT AVG(quality_score) as avg FROM hyperloop_archive").get() as any;
  const avgQuality = avgRow?.avg ?? 0;

  return { total, byType, byStatus, avgQuality: Math.round(avgQuality * 100) / 100 };
}

/** List top archive entries. */
export function listTopEntries(type?: ArchiveEntryType, limit = 10): ArchiveEntry[] {
  const db = getDb();
  initHyperloopTables();

  const rows = type
    ? db.prepare("SELECT * FROM hyperloop_archive WHERE type = ? ORDER BY quality_score DESC LIMIT ?").all(type, limit)
    : db.prepare("SELECT * FROM hyperloop_archive ORDER BY quality_score DESC LIMIT ?").all(limit);

  return (rows as any[]).map(rowToEntry);
}

// ─── Helpers ─────────────────────────────────────────────────────

function rowToEntry(row: any): ArchiveEntry {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description,
    content: row.content,
    sourceEpisodeId: row.source_episode_id,
    sourceQuery: row.source_query,
    sourceLens: row.source_lens,
    sourceEntity: row.source_entity,
    evidenceCoverage: row.evidence_coverage,
    contradictionsCaught: row.contradictions_caught,
    userEditDistance: row.user_edit_distance,
    wasExported: !!row.was_exported,
    wasDelegated: !!row.was_delegated,
    qualityScore: row.quality_score,
    improvementDelta: row.improvement_delta,
    status: row.status,
    usageCount: row.usage_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
