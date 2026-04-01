/**
 * workflowTemplates.ts — Workflow Template CRUD + Replay
 *
 * Save, list, replay, and delete reusable workflow templates.
 * A template is a compressed, validated tool chain that can be
 * re-executed with new inputs.
 */

import { getDb, genId } from "../db.js";

export interface WorkflowTemplate {
  id: string;
  name: string;
  objective: string;
  steps: Array<{ toolName: string; argsTemplate: Record<string, string>; purpose: string; parallel: boolean }>;
  avgLatencyMs: number;
  avgCostUsd: number;
  usageCount: number;
  lastUsedAt: string;
  createdAt: string;
  validated: boolean;
}

export function initWorkflowTemplateTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      objective TEXT NOT NULL,
      steps TEXT NOT NULL DEFAULT '[]',
      avg_latency_ms INTEGER DEFAULT 0,
      avg_cost_usd REAL DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      last_used_at TEXT,
      created_at TEXT NOT NULL,
      validated INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_wt_name ON workflow_templates(name);
  `);
}

export function saveTemplate(data: {
  name: string;
  objective: string;
  steps: WorkflowTemplate["steps"];
  avgLatencyMs?: number;
  avgCostUsd?: number;
}): string {
  const db = getDb();
  const id = genId("wft");
  db.prepare(`
    INSERT INTO workflow_templates (id, name, objective, steps, avg_latency_ms, avg_cost_usd, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.objective, JSON.stringify(data.steps), data.avgLatencyMs ?? 0, data.avgCostUsd ?? 0, new Date().toISOString());
  return id;
}

export function listTemplates(): WorkflowTemplate[] {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM workflow_templates ORDER BY usage_count DESC, created_at DESC LIMIT 50`).all() as any[];
  return rows.map(r => ({
    id: r.id, name: r.name, objective: r.objective,
    steps: JSON.parse(r.steps ?? "[]"),
    avgLatencyMs: r.avg_latency_ms, avgCostUsd: r.avg_cost_usd,
    usageCount: r.usage_count, lastUsedAt: r.last_used_at,
    createdAt: r.created_at, validated: !!r.validated,
  }));
}

export function getTemplate(id: string): WorkflowTemplate | null {
  const db = getDb();
  const r = db.prepare(`SELECT * FROM workflow_templates WHERE id = ?`).get(id) as any;
  if (!r) return null;
  return {
    id: r.id, name: r.name, objective: r.objective,
    steps: JSON.parse(r.steps ?? "[]"),
    avgLatencyMs: r.avg_latency_ms, avgCostUsd: r.avg_cost_usd,
    usageCount: r.usage_count, lastUsedAt: r.last_used_at,
    createdAt: r.created_at, validated: !!r.validated,
  };
}

export function recordTemplateUse(id: string, latencyMs: number, costUsd: number): void {
  const db = getDb();
  db.prepare(`
    UPDATE workflow_templates SET
      usage_count = usage_count + 1,
      last_used_at = ?,
      avg_latency_ms = CAST((avg_latency_ms * usage_count + ?) / (usage_count + 1) AS INTEGER),
      avg_cost_usd = (avg_cost_usd * usage_count + ?) / (usage_count + 1)
    WHERE id = ?
  `).run(new Date().toISOString(), latencyMs, costUsd, id);
}

export function deleteTemplate(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM workflow_templates WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function validateTemplate(id: string): void {
  const db = getDb();
  db.prepare(`UPDATE workflow_templates SET validated = 1 WHERE id = ?`).run(id);
}
