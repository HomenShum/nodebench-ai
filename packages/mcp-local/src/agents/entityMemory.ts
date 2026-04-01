/**
 * entityMemory.ts — Long-term entity knowledge store (DeerFlow pattern).
 *
 * Stores entity snapshots across sessions. Enables:
 * - "Anthropic was at $14B revenue last time you checked"
 * - "Market share changed from 40% to 70% since your last search"
 * - Drift detection between snapshots
 */

import { getDb, genId } from "../db.js";

export interface EntitySnapshot {
  id: string;
  entityName: string;
  confidence: number;
  answer: string;
  signalCount: number;
  riskCount: number;
  comparableCount: number;
  sourceCount: number;
  keyMetrics: Record<string, string>;
  timestamp: string;
}

export function initEntityMemoryTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_snapshots (
      id TEXT PRIMARY KEY,
      entity_name TEXT NOT NULL,
      confidence REAL DEFAULT 0,
      answer TEXT,
      signal_count INTEGER DEFAULT 0,
      risk_count INTEGER DEFAULT 0,
      comparable_count INTEGER DEFAULT 0,
      source_count INTEGER DEFAULT 0,
      key_metrics TEXT DEFAULT '{}',
      timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_es_entity ON entity_snapshots(entity_name, timestamp);
  `);
}

export function saveEntitySnapshot(data: {
  entityName: string;
  confidence: number;
  answer: string;
  signalCount: number;
  riskCount: number;
  comparableCount: number;
  sourceCount: number;
  keyMetrics?: Record<string, string>;
}): string {
  const db = getDb();
  const id = genId("esnap");
  db.prepare(`
    INSERT INTO entity_snapshots (id, entity_name, confidence, answer, signal_count, risk_count, comparable_count, source_count, key_metrics, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.entityName, data.confidence, data.answer?.slice(0, 500),
    data.signalCount, data.riskCount, data.comparableCount, data.sourceCount,
    JSON.stringify(data.keyMetrics ?? {}), new Date().toISOString());
  return id;
}

export function getEntityHistory(entityName: string, limit: number = 10): EntitySnapshot[] {
  const db = getDb();
  return (db.prepare(`
    SELECT * FROM entity_snapshots WHERE entity_name = ? ORDER BY timestamp DESC LIMIT ?
  `).all(entityName, limit) as any[]).map(r => ({
    id: r.id, entityName: r.entity_name, confidence: r.confidence,
    answer: r.answer, signalCount: r.signal_count, riskCount: r.risk_count,
    comparableCount: r.comparable_count, sourceCount: r.source_count,
    keyMetrics: JSON.parse(r.key_metrics ?? "{}"), timestamp: r.timestamp,
  }));
}

export function detectEntityDrift(entityName: string): {
  hasDrift: boolean;
  previousConfidence?: number;
  currentConfidence?: number;
  confidenceDelta?: number;
  previousAnswer?: string;
  daysSinceLastCheck?: number;
} | null {
  const history = getEntityHistory(entityName, 2);
  if (history.length < 2) return null;

  const [current, previous] = history;
  const daysDiff = (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 86400000;
  const confDelta = current.confidence - previous.confidence;

  return {
    hasDrift: Math.abs(confDelta) > 10 || daysDiff > 7,
    previousConfidence: previous.confidence,
    currentConfidence: current.confidence,
    confidenceDelta: Math.round(confDelta),
    previousAnswer: previous.answer?.slice(0, 200),
    daysSinceLastCheck: Math.round(daysDiff),
  };
}
