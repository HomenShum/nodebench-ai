/**
 * DeepTrace Autoresearch Optimizer — Scoring engine
 *
 * Computes throughput scores and evaluates hard quality guards.
 * All functions are pure — no side effects, no I/O.
 */

import {
  type BaselineSnapshot,
  type CandidateScore,
  type QualityMetrics,
  type ThroughputMetrics,
  MIN_THROUGHPUT_IMPROVEMENT,
  MUTATION_ALLOWLIST,
  QUALITY_GUARDS,
  THROUGHPUT_WEIGHTS,
} from "./optimizerTypes";

// ---------------------------------------------------------------------------
// Throughput scoring
// ---------------------------------------------------------------------------

/**
 * Compute a weighted throughput score in [0, 1].
 * Inverse metrics use `1 / (1 + normalized)` so lower raw values produce higher scores.
 */
export function computeThroughputScore(metrics: ThroughputMetrics): number {
  const { taskCompletionRate, timeToFirstDraftMs, humanEditDistance, wallClockMs, toolCallCount } = metrics;

  // taskCompletionRate is already in [0, 1]
  const completionComponent = clamp01(taskCompletionRate);

  // Inverse metrics: lower is better. Normalize to reasonable ranges.
  const draftComponent = 1 / (1 + timeToFirstDraftMs / 60_000); // 60s reference
  const editComponent = 1 / (1 + humanEditDistance / 500); // 500 char reference
  const clockComponent = 1 / (1 + wallClockMs / 120_000); // 2min reference
  const toolComponent = 1 / (1 + toolCallCount / 50); // 50 calls reference

  return (
    THROUGHPUT_WEIGHTS.taskCompletionRate * completionComponent +
    THROUGHPUT_WEIGHTS.inverseTimeToFirstDraft * draftComponent +
    THROUGHPUT_WEIGHTS.inverseHumanEditDistance * editComponent +
    THROUGHPUT_WEIGHTS.inverseWallClockTime * clockComponent +
    THROUGHPUT_WEIGHTS.inverseToolCallCount * toolComponent
  );
}

// ---------------------------------------------------------------------------
// Quality guard evaluation
// ---------------------------------------------------------------------------

export interface GuardResult {
  pass: boolean;
  failures: string[];
}

/**
 * Check all hard quality guards against baseline metrics.
 * Returns pass/fail plus a list of human-readable failure reasons.
 */
export function evaluateQualityGuards(
  candidate: QualityMetrics,
  baseline: QualityMetrics,
): GuardResult {
  const failures: string[] = [];

  const factualDrop = baseline.factualPrecision - candidate.factualPrecision;
  if (factualDrop > QUALITY_GUARDS.maxFactualPrecisionDrop) {
    failures.push(
      `factualPrecision dropped ${(factualDrop * 100).toFixed(1)}pp (max ${QUALITY_GUARDS.maxFactualPrecisionDrop * 100}pp)`,
    );
  }

  const relDrop = baseline.relationshipPrecision - candidate.relationshipPrecision;
  if (relDrop > QUALITY_GUARDS.maxRelationshipPrecisionDrop) {
    failures.push(
      `relationshipPrecision dropped ${(relDrop * 100).toFixed(1)}pp (max ${QUALITY_GUARDS.maxRelationshipPrecisionDrop * 100}pp)`,
    );
  }

  if (candidate.evidenceLinkage < QUALITY_GUARDS.minEvidenceLinkage) {
    failures.push(
      `evidenceLinkage ${candidate.evidenceLinkage.toFixed(2)} < floor ${QUALITY_GUARDS.minEvidenceLinkage}`,
    );
  }

  if (candidate.receiptCompleteness < QUALITY_GUARDS.minReceiptCompleteness) {
    failures.push(
      `receiptCompleteness ${candidate.receiptCompleteness.toFixed(2)} < floor ${QUALITY_GUARDS.minReceiptCompleteness}`,
    );
  }

  if (candidate.falseConfidenceRate > QUALITY_GUARDS.maxFalseConfidenceRate) {
    failures.push(
      `falseConfidenceRate ${candidate.falseConfidenceRate.toFixed(2)} > ceiling ${QUALITY_GUARDS.maxFalseConfidenceRate}`,
    );
  }

  if (candidate.canaryRelativeUplift < QUALITY_GUARDS.minCanaryRelativeUplift) {
    failures.push(
      `canaryRelativeUplift ${candidate.canaryRelativeUplift.toFixed(3)} < floor ${QUALITY_GUARDS.minCanaryRelativeUplift}`,
    );
  }

  return { pass: failures.length === 0, failures };
}

// ---------------------------------------------------------------------------
// Full candidate scoring
// ---------------------------------------------------------------------------

/**
 * Score a candidate run against a baseline.
 * Returns the composite score, guard evaluation, and promotion verdict.
 */
export function scoreCandidate(
  candidateMetrics: ThroughputMetrics,
  candidateQuality: QualityMetrics,
  baseline: BaselineSnapshot,
): CandidateScore {
  const throughputScore = computeThroughputScore(candidateMetrics);
  const guards = evaluateQualityGuards(candidateQuality, baseline.qualityMetrics);

  return {
    throughputScore,
    qualityMetrics: candidateQuality,
    guardsPass: guards.pass,
    guardFailures: guards.failures,
  };
}

/**
 * Decide whether a candidate should be promoted or discarded.
 * Returns `true` if the candidate should replace the baseline.
 */
export function shouldPromote(
  candidateScore: CandidateScore,
  baselineThroughput: number,
): boolean {
  if (!candidateScore.guardsPass) return false;
  const improvement = (candidateScore.throughputScore - baselineThroughput) / Math.max(baselineThroughput, 0.001);
  return improvement >= MIN_THROUGHPUT_IMPROVEMENT;
}

// ---------------------------------------------------------------------------
// Allowlist enforcement
// ---------------------------------------------------------------------------

/**
 * Validate that a set of changed file paths all fall within the mutation allowlist.
 * Returns the list of violating paths, or empty array if all are allowed.
 */
export function validateAllowlist(
  changedFiles: string[],
  allowlist: readonly string[] = MUTATION_ALLOWLIST,
): string[] {
  return changedFiles.filter(
    (file) => !allowlist.some((prefix) => file.startsWith(prefix)),
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
