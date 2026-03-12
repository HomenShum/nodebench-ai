/**
 * Adversarial Review Engine — deterministic, rule-based confidence downgrade.
 *
 * Takes a GoldenInvestigation (or any matching shape) and applies 6 challenge
 * rules that test for common reasoning traps: temporal proximity, missing
 * mechanisms, heuristic detectors, retroactive framing, source concentration,
 * and source recency mismatch.
 *
 * Pure function. No LLM, no API call. Reproducible and auditable.
 *
 * Confidence adjustment formula:
 *   adjustedConfidence = clamp(originalConfidence - sum(uniquePenalties), 0.25, 0.99)
 *
 * Penalties apply to investigation-level confidence, not individual fact confidence.
 * Facts retain their local confidence scores; adversarial penalties hit hypothesis
 * confidence and overall investigation confidence.
 */

import type { GoldenInvestigation } from "../data/ftxGoldenDataset";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReviewType =
  | "temporal_proximity"
  | "missing_mechanism"
  | "heuristic_detector"
  | "retroactive_framing"
  | "source_concentration"
  | "source_recency_mismatch";

export interface AdversarialChallenge {
  targetFactId: string | null;
  reviewType: ReviewType;
  finding: string;
  confidencePenalty: number;
  resolution: string;
}

export interface AdversarialReviewResult {
  originalConfidence: number;
  adjustedConfidence: number;
  challenges: AdversarialChallenge[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TOTAL_PENALTY = 0.3;
const CONFIDENCE_FLOOR = 0.25;
const TEMPORAL_PROXIMITY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Challenge rules
// ---------------------------------------------------------------------------

function checkTemporalProximity(
  investigation: GoldenInvestigation,
): AdversarialChallenge | null {
  const facts = investigation.observed_facts;
  if (facts.length < 2) return null;

  // Check if any two consecutive facts reference evidence captured within 24h
  for (let i = 0; i < facts.length - 1; i++) {
    const refA = facts[i]!.evidence_refs[0];
    const refB = facts[i + 1]!.evidence_refs[0];
    if (!refA || !refB) continue;

    const evA = investigation.evidence_catalog.find((e) => e.evidence_id === refA);
    const evB = investigation.evidence_catalog.find((e) => e.evidence_id === refB);
    if (!evA || !evB) continue;

    const delta = Math.abs(
      new Date(evB.capture_time).getTime() - new Date(evA.capture_time).getTime(),
    );

    if (delta < TEMPORAL_PROXIMITY_THRESHOLD_MS && delta > 0) {
      return {
        targetFactId: facts[i + 1]!.fact_id,
        reviewType: "temporal_proximity",
        finding: `Facts "${facts[i]!.fact_id}" and "${facts[i + 1]!.fact_id}" are based on evidence captured within ${Math.round(delta / 3_600_000)} hours. Temporal proximity does not establish causation.`,
        confidencePenalty: 0.05,
        resolution:
          "Provide an explicit mechanism linking the two events, or additional evidence from an independent source confirming the causal relationship.",
      };
    }
  }

  return null;
}

function checkMissingMechanism(
  investigation: GoldenInvestigation,
): AdversarialChallenge | null {
  const bestHypothesis = investigation.hypotheses.find(
    (h) => h.status === "best_supported",
  );
  if (!bestHypothesis || bestHypothesis.confidence > 0.7) return null;

  return {
    targetFactId: null,
    reviewType: "missing_mechanism",
    finding:
      "No hypothesis achieves confidence above 0.70. The causal mechanism connecting observed facts to the proposed root cause is not well-established by available evidence.",
    confidencePenalty: 0.08,
    resolution:
      "Provide direct evidence of the causal mechanism (e.g., internal communications, system logs, or financial records showing the specific linkage).",
  };
}

function checkHeuristicDetector(
  investigation: GoldenInvestigation,
): AdversarialChallenge | null {
  const heuristicAnomalies = investigation.derived_signals.anomalies.filter(
    (a) =>
      a.detector === "heuristic_fallback" || a.detector === "heuristic-fallback",
  );

  if (heuristicAnomalies.length === 0) return null;

  return {
    targetFactId: null,
    reviewType: "heuristic_detector",
    finding: `${heuristicAnomalies.length} anomaly detection(s) used heuristic fallback instead of a statistical model. Alternative explanations for the observed pattern have not been statistically excluded.`,
    confidencePenalty: 0.07,
    resolution:
      "Run the signal through a TSFM (TimesFM or Chronos) with sufficient data points to produce a model-backed regime shift detection.",
  };
}

function checkRetroactiveFraming(
  investigation: GoldenInvestigation,
): AdversarialChallenge | null {
  // Check if all evidence was captured after the last observed fact
  const factDates = investigation.observed_facts
    .flatMap((f) => f.evidence_refs)
    .map((ref) => {
      const ev = investigation.evidence_catalog.find(
        (e) => e.evidence_id === ref,
      );
      return ev ? new Date(ev.capture_time).getTime() : 0;
    })
    .filter((t) => t > 0);

  if (factDates.length === 0) return null;

  const allCaptures = investigation.evidence_catalog.map((e) =>
    new Date(e.capture_time).getTime(),
  );
  const latestFact = Math.max(...factDates);
  const allPostHoc = allCaptures.every((t) => t >= latestFact);

  if (!allPostHoc) return null;

  return {
    targetFactId: null,
    reviewType: "retroactive_framing",
    finding:
      "All evidence in the catalog was captured at or after the time of the final observed fact. This investigation may exhibit retroactive framing bias — the narrative was constructed after the outcome was already known.",
    confidencePenalty: 0.1,
    resolution:
      "Include evidence that was captured before the outcome was known (e.g., pre-event forecasts, real-time alerts, or contemporaneous communications).",
  };
}

function checkSourceConcentration(
  investigation: GoldenInvestigation,
): AdversarialChallenge | null {
  const catalog = investigation.evidence_catalog;
  if (catalog.length < 3) return null;

  const typeCounts = new Map<string, number>();
  for (const ev of catalog) {
    typeCounts.set(ev.source_type, (typeCounts.get(ev.source_type) ?? 0) + 1);
  }

  for (const [sourceType, count] of typeCounts) {
    if (count / catalog.length > 0.5) {
      return {
        targetFactId: null,
        reviewType: "source_concentration",
        finding: `${count} of ${catalog.length} evidence sources are of type "${sourceType}". Single-source-type concentration creates systematic bias risk — if that source category has a systematic error, the entire investigation inherits it.`,
        confidencePenalty: 0.06,
        resolution: `Add evidence from at least 2 additional source types (e.g., regulatory filings, internal communications, system telemetry) to reduce single-source dependency.`,
      };
    }
  }

  return null;
}

function checkSourceRecencyMismatch(
  investigation: GoldenInvestigation,
): AdversarialChallenge | null {
  // Find the earliest observed fact timestamp (the "early-warning window")
  const factEvidenceIds = new Set(
    investigation.observed_facts.flatMap((f) => f.evidence_refs),
  );
  const factCaptureTimes = investigation.evidence_catalog
    .filter((e) => factEvidenceIds.has(e.evidence_id))
    .map((e) => new Date(e.capture_time).getTime());

  if (factCaptureTimes.length === 0) return null;

  const latestFactCapture = Math.max(...factCaptureTimes);

  // Find hypothesis-supporting evidence that post-dates all fact evidence
  const hypothesisSupportingIds = new Set(
    investigation.hypotheses.flatMap((h) => h.supporting_evidence_ids),
  );

  const laterEnforcementSources = investigation.evidence_catalog.filter(
    (e) =>
      hypothesisSupportingIds.has(e.evidence_id) &&
      new Date(e.capture_time).getTime() > latestFactCapture,
  );

  if (laterEnforcementSources.length === 0) return null;

  return {
    targetFactId: null,
    reviewType: "source_recency_mismatch",
    finding: `${laterEnforcementSources.length} evidence source(s) supporting hypotheses became public only after the outcome was known (${laterEnforcementSources.map((e) => e.evidence_id).join(", ")}). These strengthen the retrospective narrative but should not be presented as contemporaneously knowable at the time of the early warning.`,
    confidencePenalty: 0.05,
    resolution:
      "Separate later-validation evidence from contemporaneous early-warning evidence. Label post-hoc sources explicitly so viewers understand temporal availability.",
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Apply deterministic adversarial review to an investigation.
 *
 * Formula: adjustedConfidence = clamp(originalConfidence - sum(penalties), 0.25, 0.99)
 * Max total penalty: 0.30. Confidence floor: 0.25.
 *
 * Penalties target investigation-level confidence, NOT individual fact confidence.
 */
export function applyAdversarialReview(
  investigation: GoldenInvestigation,
): AdversarialReviewResult {
  const checks = [
    checkTemporalProximity,
    checkMissingMechanism,
    checkHeuristicDetector,
    checkRetroactiveFraming,
    checkSourceConcentration,
    checkSourceRecencyMismatch,
  ];

  const challenges: AdversarialChallenge[] = [];
  for (const check of checks) {
    const result = check(investigation);
    if (result) {
      challenges.push(result);
    }
  }

  const totalPenalty = Math.min(
    MAX_TOTAL_PENALTY,
    challenges.reduce((sum, c) => sum + c.confidencePenalty, 0),
  );

  const originalConfidence = investigation.meta.overall_confidence;
  const adjustedConfidence = Math.max(
    CONFIDENCE_FLOOR,
    Math.min(0.99, Number((originalConfidence - totalPenalty).toFixed(2))),
  );

  return {
    originalConfidence,
    adjustedConfidence,
    challenges,
  };
}
