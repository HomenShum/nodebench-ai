/**
 * proofEngine.ts — Validated Path Compression
 *
 * Never blindly recommend shortcuts. This engine:
 * 1. Records baseline workflow execution (full path)
 * 2. Generates optimized candidate (shorter path)
 * 3. Replays both on same input
 * 4. Compares quality (packet completeness, evidence, scores)
 * 5. Promotes only if quality holds within thresholds
 */

import { getDb, genId } from "../db.js";

export interface ProofRun {
  id: string;
  templateId?: string;
  baselineSteps: number;
  baselineCostUsd: number;
  baselineLatencyMs: number;
  baselineScore: number;
  optimizedSteps: number;
  optimizedCostUsd: number;
  optimizedLatencyMs: number;
  optimizedScore: number;
  costDeltaPct: number;
  latencyDeltaPct: number;
  qualityDeltaPct: number;
  approved: boolean;
  reason: string;
  createdAt: string;
}

export function initProofEngineTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS proof_runs (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      baseline_steps INTEGER,
      baseline_cost_usd REAL,
      baseline_latency_ms INTEGER,
      baseline_score REAL,
      optimized_steps INTEGER,
      optimized_cost_usd REAL,
      optimized_latency_ms INTEGER,
      optimized_score REAL,
      cost_delta_pct REAL,
      latency_delta_pct REAL,
      quality_delta_pct REAL,
      approved INTEGER DEFAULT 0,
      reason TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pr_template ON proof_runs(template_id);
    CREATE INDEX IF NOT EXISTS idx_pr_approved ON proof_runs(approved);
  `);
}

// Thresholds for promotion
const PROMOTION_THRESHOLDS = {
  minCostReduction: 25,      // Must save at least 25% cost
  minLatencyReduction: 30,   // OR save at least 30% latency
  maxQualityLoss: 2,         // Quality can't drop more than 2%
};

export function evaluateOptimization(baseline: {
  steps: number; costUsd: number; latencyMs: number; score: number;
}, optimized: {
  steps: number; costUsd: number; latencyMs: number; score: number;
}, templateId?: string): ProofRun {
  const db = getDb();
  const id = genId("proof");

  const costDelta = baseline.costUsd > 0
    ? ((baseline.costUsd - optimized.costUsd) / baseline.costUsd) * 100 : 0;
  const latencyDelta = baseline.latencyMs > 0
    ? ((baseline.latencyMs - optimized.latencyMs) / baseline.latencyMs) * 100 : 0;
  const qualityDelta = baseline.score > 0
    ? ((optimized.score - baseline.score) / baseline.score) * 100 : 0;

  const meetsThreshold = (
    (costDelta >= PROMOTION_THRESHOLDS.minCostReduction || latencyDelta >= PROMOTION_THRESHOLDS.minLatencyReduction)
    && qualityDelta >= -PROMOTION_THRESHOLDS.maxQualityLoss
  );

  const reason = meetsThreshold
    ? `Approved: ${Math.round(costDelta)}% cost reduction, ${Math.round(latencyDelta)}% latency reduction, ${Math.round(qualityDelta)}% quality delta`
    : `Rejected: cost=${Math.round(costDelta)}% (need ${PROMOTION_THRESHOLDS.minCostReduction}%), latency=${Math.round(latencyDelta)}% (need ${PROMOTION_THRESHOLDS.minLatencyReduction}%), quality=${Math.round(qualityDelta)}% (max loss ${PROMOTION_THRESHOLDS.maxQualityLoss}%)`;

  const run: ProofRun = {
    id, templateId,
    baselineSteps: baseline.steps, baselineCostUsd: baseline.costUsd,
    baselineLatencyMs: baseline.latencyMs, baselineScore: baseline.score,
    optimizedSteps: optimized.steps, optimizedCostUsd: optimized.costUsd,
    optimizedLatencyMs: optimized.latencyMs, optimizedScore: optimized.score,
    costDeltaPct: Math.round(costDelta * 10) / 10,
    latencyDeltaPct: Math.round(latencyDelta * 10) / 10,
    qualityDeltaPct: Math.round(qualityDelta * 10) / 10,
    approved: meetsThreshold, reason,
    createdAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO proof_runs (id, template_id, baseline_steps, baseline_cost_usd, baseline_latency_ms, baseline_score,
      optimized_steps, optimized_cost_usd, optimized_latency_ms, optimized_score,
      cost_delta_pct, latency_delta_pct, quality_delta_pct, approved, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, templateId ?? null, baseline.steps, baseline.costUsd, baseline.latencyMs, baseline.score,
    optimized.steps, optimized.costUsd, optimized.latencyMs, optimized.score,
    run.costDeltaPct, run.latencyDeltaPct, run.qualityDeltaPct, meetsThreshold ? 1 : 0, reason, run.createdAt);

  return run;
}

export function getProofRuns(templateId?: string): ProofRun[] {
  const db = getDb();
  const query = templateId
    ? db.prepare(`SELECT * FROM proof_runs WHERE template_id = ? ORDER BY created_at DESC LIMIT 20`).all(templateId)
    : db.prepare(`SELECT * FROM proof_runs ORDER BY created_at DESC LIMIT 20`).all();
  return (query as any[]).map(r => ({
    id: r.id, templateId: r.template_id,
    baselineSteps: r.baseline_steps, baselineCostUsd: r.baseline_cost_usd,
    baselineLatencyMs: r.baseline_latency_ms, baselineScore: r.baseline_score,
    optimizedSteps: r.optimized_steps, optimizedCostUsd: r.optimized_cost_usd,
    optimizedLatencyMs: r.optimized_latency_ms, optimizedScore: r.optimized_score,
    costDeltaPct: r.cost_delta_pct, latencyDeltaPct: r.latency_delta_pct,
    qualityDeltaPct: r.quality_delta_pct, approved: !!r.approved,
    reason: r.reason, createdAt: r.created_at,
  }));
}
