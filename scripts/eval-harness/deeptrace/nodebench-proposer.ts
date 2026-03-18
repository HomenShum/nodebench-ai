/**
 * NodeBench Proposer — Multi-Iteration Canary Benchmark Module
 *
 * Simulates 15 candidate variants of the DeepTrace research cell with
 * varying strategy emphasis. Each iteration models a different branch
 * configuration / budget allocation that trades off throughput and quality
 * in distinct ways.
 *
 * Contract: export a default function matching OptimizerProposeFn.
 *   (worktreePath: string, baseline: BaselineSnapshot, iteration: number)
 *   => Promise<OptimizerProposal | null>
 */

import type { BaselineSnapshot } from "./optimizerTypes.js";
import type { OptimizerProposal } from "./optimizerRunner.js";

// ---------------------------------------------------------------------------
// Candidate strategy profiles — 15 variants
// ---------------------------------------------------------------------------

interface StrategyProfile {
  id: string;
  label: string;
  throughput: {
    taskCompletionRate: number;
    timeToFirstDraftMs: number;
    humanEditDistance: number;
    wallClockMs: number;
    toolCallCount: number;
  };
  quality: {
    factualPrecision: number;
    relationshipPrecision: number;
    evidenceLinkage: number;
    receiptCompleteness: number;
    falseConfidenceRate: number;
    canaryRelativeUplift: number;
  };
}

const STRATEGIES: StrategyProfile[] = [
  // --- High-confidence variants (strong throughput lift) ---
  {
    id: "research-cell-balanced-v1",
    label: "Balanced 3-branch re-analysis",
    throughput: { taskCompletionRate: +0.15, timeToFirstDraftMs: 0, humanEditDistance: -80, wallClockMs: 0, toolCallCount: 0 },
    quality:    { factualPrecision: +0.01, relationshipPrecision: +0.02, evidenceLinkage: +0.08, receiptCompleteness: +0.10, falseConfidenceRate: -0.03, canaryRelativeUplift: +0.05 },
  },
  {
    id: "research-cell-gap-focus-v1",
    label: "Evidence gap-fill emphasis (2 branches)",
    throughput: { taskCompletionRate: +0.08, timeToFirstDraftMs: +800, humanEditDistance: -50, wallClockMs: +800, toolCallCount: +2 },
    quality:    { factualPrecision: +0.02, relationshipPrecision: +0.01, evidenceLinkage: +0.12, receiptCompleteness: +0.08, falseConfidenceRate: -0.01, canaryRelativeUplift: +0.06 },
  },
  {
    id: "research-cell-counter-hyp-v1",
    label: "Counter-hypothesis emphasis",
    throughput: { taskCompletionRate: +0.12, timeToFirstDraftMs: +1500, humanEditDistance: -35, wallClockMs: +1500, toolCallCount: +4 },
    quality:    { factualPrecision: +0.03, relationshipPrecision: +0.01, evidenceLinkage: +0.05, receiptCompleteness: +0.06, falseConfidenceRate: -0.05, canaryRelativeUplift: +0.04 },
  },
  {
    id: "research-cell-dimension-v1",
    label: "Dimension coverage emphasis",
    throughput: { taskCompletionRate: +0.09, timeToFirstDraftMs: +1000, humanEditDistance: -40, wallClockMs: +1000, toolCallCount: +3 },
    quality:    { factualPrecision: +0.01, relationshipPrecision: +0.03, evidenceLinkage: +0.06, receiptCompleteness: +0.09, falseConfidenceRate: -0.02, canaryRelativeUplift: +0.05 },
  },
  {
    id: "research-cell-fast-v1",
    label: "Fast single-branch re-analysis",
    throughput: { taskCompletionRate: +0.06, timeToFirstDraftMs: +400, humanEditDistance: -55, wallClockMs: +400, toolCallCount: +1 },
    quality:    { factualPrecision: +0.01, relationshipPrecision: +0.01, evidenceLinkage: +0.04, receiptCompleteness: +0.05, falseConfidenceRate: -0.01, canaryRelativeUplift: +0.04 },
  },

  // --- Medium-confidence variants (moderate trade-offs) ---
  {
    id: "research-cell-deep-v1",
    label: "Deep 3-branch with 2 refinement rounds",
    throughput: { taskCompletionRate: +0.14, timeToFirstDraftMs: +3000, humanEditDistance: -30, wallClockMs: +3000, toolCallCount: +8 },
    quality:    { factualPrecision: +0.03, relationshipPrecision: +0.04, evidenceLinkage: +0.10, receiptCompleteness: +0.12, falseConfidenceRate: -0.04, canaryRelativeUplift: +0.07 },
  },
  {
    id: "research-cell-source-div-v1",
    label: "Source diversification emphasis",
    throughput: { taskCompletionRate: +0.07, timeToFirstDraftMs: +900, humanEditDistance: -38, wallClockMs: +900, toolCallCount: +3 },
    quality:    { factualPrecision: +0.02, relationshipPrecision: +0.02, evidenceLinkage: +0.09, receiptCompleteness: +0.07, falseConfidenceRate: -0.02, canaryRelativeUplift: +0.05 },
  },
  {
    id: "research-cell-aggressive-v1",
    label: "Aggressive 3-branch max-budget",
    throughput: { taskCompletionRate: +0.15, timeToFirstDraftMs: +4000, humanEditDistance: -25, wallClockMs: +4000, toolCallCount: +10 },
    quality:    { factualPrecision: +0.04, relationshipPrecision: +0.05, evidenceLinkage: +0.12, receiptCompleteness: +0.14, falseConfidenceRate: -0.05, canaryRelativeUplift: +0.08 },
  },
  {
    id: "research-cell-minimal-v1",
    label: "Minimal overhead single query",
    throughput: { taskCompletionRate: +0.03, timeToFirstDraftMs: +200, humanEditDistance: -60, wallClockMs: +200, toolCallCount: +1 },
    quality:    { factualPrecision: +0.00, relationshipPrecision: +0.01, evidenceLinkage: +0.02, receiptCompleteness: +0.03, falseConfidenceRate: -0.00, canaryRelativeUplift: +0.03 },
  },
  {
    id: "research-cell-balanced-v2",
    label: "Balanced v2 — tuned edit distance",
    throughput: { taskCompletionRate: +0.11, timeToFirstDraftMs: +1400, humanEditDistance: -55, wallClockMs: +1400, toolCallCount: +4 },
    quality:    { factualPrecision: +0.02, relationshipPrecision: +0.02, evidenceLinkage: +0.09, receiptCompleteness: +0.11, falseConfidenceRate: -0.03, canaryRelativeUplift: +0.06 },
  },

  // --- Boundary / stress variants ---
  {
    id: "research-cell-quality-guard-edge",
    label: "Near quality guard thresholds",
    throughput: { taskCompletionRate: +0.10, timeToFirstDraftMs: +1000, humanEditDistance: -40, wallClockMs: +1000, toolCallCount: +3 },
    quality:    { factualPrecision: -0.005, relationshipPrecision: -0.005, evidenceLinkage: +0.06, receiptCompleteness: +0.09, falseConfidenceRate: -0.01, canaryRelativeUplift: +0.04 },
  },
  {
    id: "research-cell-evidence-regress",
    label: "Evidence linkage regression (should fail guard)",
    throughput: { taskCompletionRate: +0.12, timeToFirstDraftMs: +500, humanEditDistance: -50, wallClockMs: +500, toolCallCount: +2 },
    quality:    { factualPrecision: +0.01, relationshipPrecision: +0.01, evidenceLinkage: -0.05, receiptCompleteness: +0.10, falseConfidenceRate: -0.02, canaryRelativeUplift: +0.05 },
  },
  {
    id: "research-cell-false-conf-regress",
    label: "False confidence regression (should fail guard)",
    throughput: { taskCompletionRate: +0.08, timeToFirstDraftMs: +800, humanEditDistance: -40, wallClockMs: +800, toolCallCount: +3 },
    quality:    { factualPrecision: +0.01, relationshipPrecision: +0.01, evidenceLinkage: +0.07, receiptCompleteness: +0.08, falseConfidenceRate: +0.02, canaryRelativeUplift: +0.04 },
  },
  {
    id: "research-cell-receipt-regress",
    label: "Receipt completeness regression (should fail guard)",
    throughput: { taskCompletionRate: +0.10, timeToFirstDraftMs: +1000, humanEditDistance: -45, wallClockMs: +1000, toolCallCount: +3 },
    quality:    { factualPrecision: +0.01, relationshipPrecision: +0.01, evidenceLinkage: +0.08, receiptCompleteness: -0.05, falseConfidenceRate: -0.02, canaryRelativeUplift: +0.05 },
  },
  {
    id: "research-cell-throughput-neutral",
    label: "Quality improvement but throughput-neutral",
    throughput: { taskCompletionRate: +0.02, timeToFirstDraftMs: +2000, humanEditDistance: -10, wallClockMs: +2000, toolCallCount: +5 },
    quality:    { factualPrecision: +0.03, relationshipPrecision: +0.03, evidenceLinkage: +0.10, receiptCompleteness: +0.12, falseConfidenceRate: -0.04, canaryRelativeUplift: +0.06 },
  },
];

// ---------------------------------------------------------------------------
// Proposer
// ---------------------------------------------------------------------------

export default async function propose(
  _worktreePath: string,
  baseline: BaselineSnapshot,
  iteration: number,
): Promise<OptimizerProposal | null> {
  if (iteration >= STRATEGIES.length) return null;

  const strategy = STRATEGIES[iteration];
  const bt = baseline.throughputMetrics;
  const bq = baseline.qualityMetrics;
  const d = strategy;

  return {
    candidateId: d.id,
    rationale: `Simulated strategy: ${d.label}. This candidate is tuned to exercise the optimizer's promotion/discard logic under the measured canary baseline.`,
    throughput: {
      taskCompletionRate:   Math.min(1.0, bt.taskCompletionRate   + d.throughput.taskCompletionRate),
      timeToFirstDraftMs:   Math.max(0,   bt.timeToFirstDraftMs   + d.throughput.timeToFirstDraftMs),
      humanEditDistance:     Math.max(0,   bt.humanEditDistance     + d.throughput.humanEditDistance),
      wallClockMs:           Math.max(0,   bt.wallClockMs          + d.throughput.wallClockMs),
      toolCallCount:         Math.max(0,   bt.toolCallCount        + d.throughput.toolCallCount),
    },
    quality: {
      factualPrecision:      Math.min(1.0, Math.max(0, bq.factualPrecision      + d.quality.factualPrecision)),
      relationshipPrecision: Math.min(1.0, Math.max(0, bq.relationshipPrecision + d.quality.relationshipPrecision)),
      evidenceLinkage:       Math.min(1.0, Math.max(0, bq.evidenceLinkage       + d.quality.evidenceLinkage)),
      receiptCompleteness:   Math.min(1.0, Math.max(0, bq.receiptCompleteness   + d.quality.receiptCompleteness)),
      falseConfidenceRate:   Math.min(1.0, Math.max(0, bq.falseConfidenceRate   + d.quality.falseConfidenceRate)),
      canaryRelativeUplift:  bq.canaryRelativeUplift + d.quality.canaryRelativeUplift,
    },
  };
}

