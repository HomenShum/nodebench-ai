/**
 * Subconscious Memory Blocks — 12 typed blocks for founder/company intelligence.
 *
 * Reuses the existing nodebench.db via getDb(). Each block is a singleton row
 * keyed by BlockType, with version tracking and confidence scoring.
 */

import { getDb, genId } from "../db.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type BlockType =
  | "founder_identity"
  | "company_identity"
  | "current_wedge"
  | "top_priorities"
  | "open_contradictions"
  | "readiness_gaps"
  | "validated_workflows"
  | "recent_important_changes"
  | "entity_watchlist"
  | "agent_preferences"
  | "artifact_preferences"
  | "packet_lineage";

export interface SubconsciousBlock {
  id: BlockType;
  label: string;
  value: string;
  version: number;
  confidence: "high" | "medium" | "low";
  sourceEvents: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BlockUpdate {
  value: string;
  confidence?: "high" | "medium" | "low";
  sourceEvent?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<BlockType, string> = {
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
  packet_lineage: "Packet Lineage",
};

export const ALL_BLOCK_TYPES: BlockType[] = Object.keys(BLOCK_LABELS) as BlockType[];

const MAX_SOURCE_EVENTS = 50;

// ── CRUD ───────────────────────────────────────────────────────────────────

export function ensureBlocksExist(): void {
  const db = getDb();
  for (const [id, label] of Object.entries(BLOCK_LABELS)) {
    db.prepare(
      `INSERT OR IGNORE INTO subconscious_blocks (id, label, value, version, confidence, source_events)
       VALUES (?, ?, '', 1, 'low', '[]')`
    ).run(id, label);
  }
}

export function getBlock(id: BlockType): SubconsciousBlock {
  ensureBlocksExist();
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM subconscious_blocks WHERE id = ?")
    .get(id) as any;
  if (!row) {
    return {
      id,
      label: BLOCK_LABELS[id],
      value: "",
      version: 1,
      confidence: "low",
      sourceEvents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return rowToBlock(row);
}

export function getAllBlocks(): SubconsciousBlock[] {
  ensureBlocksExist();
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM subconscious_blocks ORDER BY id")
    .all() as any[];
  return rows.map(rowToBlock);
}

export function getBlocksByIds(ids: BlockType[]): SubconsciousBlock[] {
  if (ids.length === 0) return [];
  ensureBlocksExist();
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT * FROM subconscious_blocks WHERE id IN (${placeholders})`)
    .all(...ids) as any[];
  return rows.map(rowToBlock);
}

export function updateBlock(id: BlockType, update: BlockUpdate): SubconsciousBlock {
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

export function getChangedBlocksSince(sinceVersion: Record<BlockType, number>): SubconsciousBlock[] {
  const all = getAllBlocks();
  return all.filter((b) => {
    const knownVersion = sinceVersion[b.id] ?? 0;
    return b.version > knownVersion;
  });
}

export function getStaleBlocks(maxAgeDays: number = 7): SubconsciousBlock[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffStr = cutoff.toISOString();
  const all = getAllBlocks();
  return all.filter((b) => b.value.length > 0 && b.updatedAt < cutoffStr);
}

export function getBlockSummary(): string {
  const blocks = getAllBlocks();
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.value.length === 0) continue;
    const firstLine = b.value.split("\n")[0].slice(0, 80);
    const stale = isStale(b) ? " [STALE]" : "";
    lines.push(`- ${b.label} (v${b.version}, ${b.confidence})${stale}: ${firstLine}`);
  }
  return lines.length > 0 ? lines.join("\n") : "(no blocks populated yet)";
}

// ── Whisper Log ────────────────────────────────────────────────────────────

export interface WhisperLogEntry {
  id: string;
  sessionId: string;
  blockIds: string[];
  whisperText: string;
  classification: string;
  suppressed: boolean;
  reason: string | null;
  createdAt: string;
}

export function logWhisper(entry: Omit<WhisperLogEntry, "id" | "createdAt">): void {
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

export function getRecentWhispers(sessionId: string, limit: number = 10): WhisperLogEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM subconscious_whisper_log
       WHERE session_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(sessionId, limit) as any[];
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    blockIds: JSON.parse(r.block_ids || "[]"),
    whisperText: r.whisper_text,
    classification: r.classification,
    suppressed: r.suppressed === 1,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}

// ── Helpers ────────────────────────────────────────────────────────────────

function rowToBlock(row: any): SubconsciousBlock {
  return {
    id: row.id as BlockType,
    label: row.label,
    value: row.value,
    version: row.version,
    confidence: row.confidence as "high" | "medium" | "low",
    sourceEvents: JSON.parse(row.source_events || "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStale(block: SubconsciousBlock, maxAgeDays: number = 7): boolean {
  if (block.value.length === 0) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  return new Date(block.updatedAt) < cutoff;
}
