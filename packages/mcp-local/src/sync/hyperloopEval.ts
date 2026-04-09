/**
 * hyperloopEval.ts — Per-task evaluation metrics + improvement@k tracking.
 *
 * Runs after every task to compute quality metrics.
 * Compares against archive reference variant to compute improvement delta.
 * Tracks improvement@k across generations for cross-domain transfer measurement.
 */

import { getDb, genId } from "../db.js";
import { lookupBestVariant, addArchiveEntry, type ArchiveEntryType } from "./hyperloopArchive.js";

// ─── Per-Task Evaluation ─────────────────────────────────────────

export interface TaskEvaluation {
  evalId: string;
  episodeId: string;
  query: string;
  lens: string;
  entity: string | null;
  classification: string;

  // Quality metrics
  evidenceCoverage: number;      // verified / total signals
  contradictionRate: number;     // contradictions caught / total claims
  groundingRate: number;         // grounded claims / total claims
  userEditDistance: number;      // 0-1 (0 = no edits, 1 = complete rewrite)
  wasExported: boolean;
  wasDelegated: boolean;

  // Performance metrics
  latencyMs: number;
  costUsd: number;
  toolCallCount: number;

  // Composite
  qualityScore: number;          // 0-1 weighted composite
  rubricVersion: string;
  scoreComponents: HyperloopScoreComponent[];
  gates: HyperloopGateResult[];
  policyAction: "archive_only" | "candidate";
  llmJudge?: HyperloopLlmJudgeSummary;

  // Archive comparison
  referenceVariantId: string | null;
  improvementDelta: number;      // quality - reference quality (can be negative)

  timestamp: string;
}

export interface HyperloopScoreComponent {
  key: string;
  label: string;
  weight: number;
  rawValue: number;
  normalizedScore: number;
  weightedContribution: number;
  detail: string;
}

export interface HyperloopGateResult {
  key: string;
  label: string;
  passed: boolean;
  critical: boolean;
  reason: string;
}

export interface HyperloopLlmJudgeSummary {
  verdict: string;
  score?: string;
  failingCriteria: string[];
  fixSuggestions: string[];
  reasoningSummary: string;
}

// ─── Schema ──────────────────────────────────────────────────────

export function initEvalTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS hyperloop_evaluations (
      eval_id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL,
      query TEXT NOT NULL,
      lens TEXT NOT NULL,
      entity TEXT,
      classification TEXT NOT NULL,
      evidence_coverage REAL NOT NULL,
      contradiction_rate REAL NOT NULL,
      grounding_rate REAL NOT NULL,
      user_edit_distance REAL NOT NULL,
      was_exported INTEGER NOT NULL DEFAULT 0,
      was_delegated INTEGER NOT NULL DEFAULT 0,
      latency_ms INTEGER NOT NULL,
      cost_usd REAL NOT NULL DEFAULT 0,
      tool_call_count INTEGER NOT NULL DEFAULT 0,
      quality_score REAL NOT NULL,
      rubric_version TEXT NOT NULL DEFAULT 'hyperloop_v2',
      score_components TEXT NOT NULL DEFAULT '[]',
      gates TEXT NOT NULL DEFAULT '[]',
      policy_action TEXT NOT NULL DEFAULT 'archive_only',
      llm_judge TEXT,
      reference_variant_id TEXT,
      improvement_delta REAL NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_eval_episode ON hyperloop_evaluations(episode_id);
    CREATE INDEX IF NOT EXISTS idx_eval_quality ON hyperloop_evaluations(quality_score DESC);
    CREATE INDEX IF NOT EXISTS idx_eval_classification ON hyperloop_evaluations(classification);
  `);

  ensureEvalColumn("rubric_version", "TEXT NOT NULL DEFAULT 'hyperloop_v2'");
  ensureEvalColumn("score_components", "TEXT NOT NULL DEFAULT '[]'");
  ensureEvalColumn("gates", "TEXT NOT NULL DEFAULT '[]'");
  ensureEvalColumn("policy_action", "TEXT NOT NULL DEFAULT 'archive_only'");
  ensureEvalColumn("llm_judge", "TEXT");
}

function ensureEvalColumn(columnName: string, definition: string): void {
  const db = getDb();
  const columns = db.prepare("PRAGMA table_info(hyperloop_evaluations)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE hyperloop_evaluations ADD COLUMN ${columnName} ${definition}`);
  }
}

// ─── Compute quality score ───────────────────────────────────────

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number): number {
  return Math.round(clamp01(value) * 100) / 100;
}

export function buildHyperloopScorecard(metrics: {
  evidenceCoverage: number;
  groundingRate: number;
  contradictionRate: number;
  userEditDistance: number;
  wasExported: boolean;
  wasDelegated: boolean;
  latencyMs: number;
}): {
  qualityScore: number;
  scoreComponents: HyperloopScoreComponent[];
  gates: HyperloopGateResult[];
  policyAction: "archive_only" | "candidate";
} {
  const scoreComponents: HyperloopScoreComponent[] = [
    {
      key: "evidence_coverage",
      label: "Evidence coverage",
      weight: 0.3,
      rawValue: roundScore(metrics.evidenceCoverage),
      normalizedScore: roundScore(metrics.evidenceCoverage),
      weightedContribution: roundScore(metrics.evidenceCoverage * 0.3),
      detail: "Verified or source-backed signals divided by total surfaced signals.",
    },
    {
      key: "claim_grounding",
      label: "Claim grounding",
      weight: 0.25,
      rawValue: roundScore(metrics.groundingRate),
      normalizedScore: roundScore(metrics.groundingRate),
      weightedContribution: roundScore(metrics.groundingRate * 0.25),
      detail: "Claims with explicit evidence text divided by total surfaced claims.",
    },
    {
      key: "contradiction_capture",
      label: "Contradiction capture",
      weight: 0.15,
      rawValue: roundScore(metrics.contradictionRate),
      normalizedScore: roundScore(Math.min(1, metrics.contradictionRate * 4)),
      weightedContribution: roundScore(Math.min(1, metrics.contradictionRate * 4) * 0.15),
      detail: "Non-zero only when the run actually surfaced contradictions or diligence flags.",
    },
    {
      key: "human_edit_burden",
      label: "Human edit burden",
      weight: 0.15,
      rawValue: roundScore(1 - metrics.userEditDistance),
      normalizedScore: roundScore(1 - metrics.userEditDistance),
      weightedContribution: roundScore((1 - metrics.userEditDistance) * 0.15),
      detail: "Starts at 1.0 and falls as the human has to rewrite more of the result.",
    },
    {
      key: "outcome_readiness",
      label: "Outcome readiness",
      weight: 0.1,
      rawValue: roundScore((metrics.wasExported ? 0.5 : 0) + (metrics.wasDelegated ? 0.5 : 0)),
      normalizedScore: roundScore((metrics.wasExported ? 0.5 : 0) + (metrics.wasDelegated ? 0.5 : 0)),
      weightedContribution: roundScore(((metrics.wasExported ? 0.5 : 0) + (metrics.wasDelegated ? 0.5 : 0)) * 0.1),
      detail: "Gives credit only when the result was strong enough to export or delegate.",
    },
    {
      key: "latency_budget",
      label: "Latency budget",
      weight: 0.05,
      rawValue: metrics.latencyMs,
      normalizedScore: metrics.latencyMs <= 5000 ? 1 : metrics.latencyMs <= 12000 ? 0.6 : metrics.latencyMs <= 20000 ? 0.35 : 0.1,
      weightedContribution: roundScore((metrics.latencyMs <= 5000 ? 1 : metrics.latencyMs <= 12000 ? 0.6 : metrics.latencyMs <= 20000 ? 0.35 : 0.1) * 0.05),
      detail: "Fast runs get a small bonus, but speed is deliberately not a dominant factor.",
    },
  ].map((component) => ({
    ...component,
    normalizedScore: roundScore(component.normalizedScore),
    weightedContribution: roundScore(component.weightedContribution),
  }));

  const qualityScore = roundScore(scoreComponents.reduce((sum, component) => sum + component.weightedContribution, 0));

  const gates: HyperloopGateResult[] = [
    {
      key: "minimum_evidence",
      label: "Minimum evidence",
      passed: metrics.evidenceCoverage >= 0.25,
      critical: true,
      reason: metrics.evidenceCoverage >= 0.25
        ? "Evidence coverage cleared the minimum threshold."
        : "Too few surfaced signals were actually source-backed.",
    },
    {
      key: "minimum_grounding",
      label: "Minimum grounding",
      passed: metrics.groundingRate >= 0.25,
      critical: true,
      reason: metrics.groundingRate >= 0.25
        ? "Grounding rate cleared the minimum threshold."
        : "Too many claims are unsupported or missing direct evidence text.",
    },
    {
      key: "human_edit_load",
      label: "Human edit load",
      passed: metrics.userEditDistance <= 0.6,
      critical: false,
      reason: metrics.userEditDistance <= 0.6
        ? "Human edit burden is still within acceptable review bounds."
        : "The human would need to rewrite too much of this output.",
    },
    {
      key: "latency_window",
      label: "Latency window",
      passed: metrics.latencyMs <= 15000,
      critical: false,
      reason: metrics.latencyMs <= 15000
        ? "Latency stayed within the target review window."
        : "This run was too slow for routine founder use.",
    },
    {
      key: "archive_candidate_score",
      label: "Archive candidate score",
      passed: qualityScore >= 0.62,
      critical: false,
      reason: qualityScore >= 0.62
        ? "Composite score is high enough to consider archive candidacy."
        : "Composite score is still too weak for a reusable archive candidate.",
    },
  ];

  const hasCriticalFailure = gates.some((gate) => gate.critical && !gate.passed);
  const policyAction: "archive_only" | "candidate" =
    !hasCriticalFailure && qualityScore >= 0.62 ? "candidate" : "archive_only";

  return {
    qualityScore,
    scoreComponents,
    gates,
    policyAction,
  };
}

// ─── Evaluate a completed task ───────────────────────────────────

export function evaluateTask(input: {
  episodeId: string;
  query: string;
  lens: string;
  entity: string | null;
  classification: string;
  totalSignals: number;
  verifiedSignals: number;
  totalClaims: number;
  groundedClaims: number;
  contradictionsCaught: number;
  userEditDistance: number;
  wasExported: boolean;
  wasDelegated: boolean;
  latencyMs: number;
  costUsd: number;
  toolCallCount: number;
  llmJudge?: {
    verdict?: string;
    score?: string;
    failingCriteria?: string[];
    fixSuggestions?: string[];
  } | null;
}): TaskEvaluation {
  const db = getDb();
  initEvalTables();

  const evidenceCoverage = input.totalSignals > 0 ? input.verifiedSignals / input.totalSignals : 0;
  const groundingRate = input.totalClaims > 0 ? input.groundedClaims / input.totalClaims : 0;
  const contradictionRate = input.totalClaims > 0 ? input.contradictionsCaught / input.totalClaims : 0;

  const {
    qualityScore,
    scoreComponents,
    gates,
    policyAction,
  } = buildHyperloopScorecard({
    evidenceCoverage,
    groundingRate,
    contradictionRate,
    userEditDistance: input.userEditDistance,
    wasExported: input.wasExported,
    wasDelegated: input.wasDelegated,
    latencyMs: input.latencyMs,
  });

  // Look up reference variant to compute improvement delta
  const archiveType = classificationToArchiveType(input.classification);
  const reference = lookupBestVariant(archiveType, input.lens, input.entity ?? undefined);
  const improvementDelta = reference
    ? Math.round((qualityScore - reference.qualityScore) * 100) / 100
    : 0;

  const evalId = genId("eval");
  const timestamp = new Date().toISOString();
  const llmJudge = normalizeLlmJudge(input.llmJudge);

  db.prepare(`
    INSERT INTO hyperloop_evaluations (eval_id, episode_id, query, lens, entity, classification, evidence_coverage, contradiction_rate, grounding_rate, user_edit_distance, was_exported, was_delegated, latency_ms, cost_usd, tool_call_count, quality_score, rubric_version, score_components, gates, policy_action, llm_judge, reference_variant_id, improvement_delta, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    evalId, input.episodeId, input.query, input.lens, input.entity,
    input.classification, evidenceCoverage, contradictionRate, groundingRate,
    input.userEditDistance, input.wasExported ? 1 : 0, input.wasDelegated ? 1 : 0,
    input.latencyMs, input.costUsd, input.toolCallCount,
    qualityScore, "hyperloop_v2", JSON.stringify(scoreComponents), JSON.stringify(gates), policyAction,
    llmJudge ? JSON.stringify(llmJudge) : null, reference?.id ?? null, improvementDelta, timestamp,
  );

  // If quality is good enough, create archive candidate
  if (policyAction === "candidate") {
    addArchiveEntry({
      type: archiveType,
      name: `${input.classification}:${input.entity ?? input.lens}`,
      description: `Structured candidate (${Math.round(qualityScore * 100)}%) from "${input.query.slice(0, 60)}"`,
      content: JSON.stringify({
        classification: input.classification,
        lens: input.lens,
        entity: input.entity,
        toolCallCount: input.toolCallCount,
        latencyMs: input.latencyMs,
        rubricVersion: "hyperloop_v2",
        scoreComponents,
        gates,
        llmJudge,
      }),
      sourceEpisodeId: input.episodeId,
      sourceQuery: input.query,
      sourceLens: input.lens,
      sourceEntity: input.entity,
      evidenceCoverage,
      contradictionsCaught: input.contradictionsCaught,
      userEditDistance: input.userEditDistance,
      wasExported: input.wasExported,
      wasDelegated: input.wasDelegated,
      qualityScore,
      improvementDelta,
      createdAt: timestamp,
    });
  }

  return {
    evalId,
    episodeId: input.episodeId,
    query: input.query,
    lens: input.lens,
    entity: input.entity,
    classification: input.classification,
    evidenceCoverage,
    contradictionRate,
    groundingRate,
    userEditDistance: input.userEditDistance,
    wasExported: input.wasExported,
    wasDelegated: input.wasDelegated,
    latencyMs: input.latencyMs,
    costUsd: input.costUsd,
    toolCallCount: input.toolCallCount,
    qualityScore,
    rubricVersion: "hyperloop_v2",
    scoreComponents,
    gates,
    policyAction,
    llmJudge,
    referenceVariantId: reference?.id ?? null,
    improvementDelta,
    timestamp,
  };
}

// ─── Improvement@k ───────────────────────────────────────────────

export interface ImprovementAtK {
  classification: string;
  k: number;                    // generation
  avgQuality: number;
  avgImprovement: number;
  sampleSize: number;
}

export interface RecentEvaluationSummary {
  evalId: string;
  query: string;
  classification: string;
  qualityScore: number;
  improvementDelta: number;
  evidenceCoverage: number;
  groundingRate: number;
  latencyMs: number;
  toolCallCount: number;
  timestamp: string;
  rubricVersion: string;
  policyAction: "archive_only" | "candidate";
  scoreComponents: HyperloopScoreComponent[];
  gates: HyperloopGateResult[];
  llmJudge?: HyperloopLlmJudgeSummary;
}

/** Compute improvement@k for a classification type. */
export function computeImprovementAtK(classification: string, k = 5): ImprovementAtK[] {
  const db = getDb();
  initEvalTables();

  const rows = db.prepare(
    "SELECT quality_score, improvement_delta FROM hyperloop_evaluations WHERE classification = ? ORDER BY timestamp ASC"
  ).all(classification) as any[];

  if (rows.length === 0) return [];

  const results: ImprovementAtK[] = [];
  const chunkSize = Math.max(1, Math.floor(rows.length / k));

  for (let gen = 0; gen < k && gen * chunkSize < rows.length; gen++) {
    const chunk = rows.slice(gen * chunkSize, (gen + 1) * chunkSize);
    const avgQuality = chunk.reduce((s: number, r: any) => s + r.quality_score, 0) / chunk.length;
    const avgImprovement = chunk.reduce((s: number, r: any) => s + r.improvement_delta, 0) / chunk.length;

    results.push({
      classification,
      k: gen + 1,
      avgQuality: Math.round(avgQuality * 100) / 100,
      avgImprovement: Math.round(avgImprovement * 100) / 100,
      sampleSize: chunk.length,
    });
  }

  return results;
}

export function listRecentEvaluations(limit = 12): RecentEvaluationSummary[] {
  const db = getDb();
  initEvalTables();

  const rows = db.prepare(
    `SELECT eval_id, query, classification, quality_score, improvement_delta, evidence_coverage, grounding_rate, latency_ms, tool_call_count, timestamp, rubric_version, policy_action, score_components, gates, llm_judge
     FROM hyperloop_evaluations
     ORDER BY timestamp DESC
     LIMIT ?`,
  ).all(limit) as any[];

  return rows.map((row) => ({
    evalId: row.eval_id,
    query: row.query,
    classification: row.classification,
    qualityScore: row.quality_score,
    improvementDelta: row.improvement_delta,
    evidenceCoverage: row.evidence_coverage,
    groundingRate: row.grounding_rate,
    latencyMs: row.latency_ms,
    toolCallCount: row.tool_call_count,
    timestamp: row.timestamp,
    rubricVersion: row.rubric_version ?? "hyperloop_v2",
    policyAction: row.policy_action ?? "archive_only",
    scoreComponents: parseJsonArray<HyperloopScoreComponent>(row.score_components),
    gates: parseJsonArray<HyperloopGateResult>(row.gates),
    llmJudge: parseJsonObject<HyperloopLlmJudgeSummary>(row.llm_judge),
  }));
}

export function listTrackedClassifications(limit = 6): string[] {
  const db = getDb();
  initEvalTables();

  const rows = db.prepare(
    `SELECT classification, COUNT(*) as cnt
     FROM hyperloop_evaluations
     GROUP BY classification
     ORDER BY cnt DESC, MAX(timestamp) DESC
     LIMIT ?`,
  ).all(limit) as Array<{ classification: string }>;

  return rows.map((row) => row.classification);
}

// ─── Helpers ─────────────────────────────────────────────────────

function classificationToArchiveType(classification: string): ArchiveEntryType {
  const map: Record<string, ArchiveEntryType> = {
    company_search: "packet_template",
    competitor: "packet_template",
    multi_entity: "packet_template",
    weekly_reset: "workflow_path",
    pre_delegation: "delegation_shape",
    important_change: "signal_recipe",
    idea_validation: "packet_template",
    general: "routing_policy",
  };
  return map[classification] ?? "routing_policy";
}

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function parseJsonObject<T>(value: string | null | undefined): T | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as T : undefined;
  } catch {
    return undefined;
  }
}

function normalizeLlmJudge(input?: {
  verdict?: string;
  score?: string;
  failingCriteria?: string[];
  fixSuggestions?: string[];
} | null): HyperloopLlmJudgeSummary | undefined {
  if (!input) return undefined;
  const verdict = input.verdict?.trim();
  const score = input.score?.trim();
  const failingCriteria = Array.isArray(input.failingCriteria) ? input.failingCriteria.filter(Boolean) : [];
  const fixSuggestions = Array.isArray(input.fixSuggestions) ? input.fixSuggestions.filter(Boolean) : [];
  const reasoningParts = [
    verdict ? `Verdict: ${verdict}.` : null,
    failingCriteria.length > 0 ? `Failures: ${failingCriteria.join("; ")}.` : "Failures: none called out.",
    fixSuggestions.length > 0 ? `Fixes: ${fixSuggestions.join("; ")}.` : "Fixes: none suggested.",
  ].filter(Boolean);
  if (!verdict && !score && failingCriteria.length === 0 && fixSuggestions.length === 0) {
    return undefined;
  }
  return {
    verdict: verdict ?? "UNSPECIFIED",
    score,
    failingCriteria,
    fixSuggestions,
    reasoningSummary: reasoningParts.join(" "),
  };
}
