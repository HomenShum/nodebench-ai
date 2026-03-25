/**
 * packetDiff — Structured diff between two FounderArtifactPackets.
 *
 * Compares adjacent packets and returns a compact summary of what improved,
 * regressed, or stayed stable. Used by PacketHistoryTimeline for trend indicators.
 */

import type { FounderArtifactPacket } from "../types/artifactPacket";

/* ─── Public types ────────────────────────────────────────────────────────── */

export type OverallTrend = "improving" | "stable" | "declining";

export interface PacketDiffResult {
  /** Delta of identityConfidence (positive = improvement) */
  confidenceDelta: number;
  /** New contradictions not present in the previous packet */
  contradictionsAdded: number;
  /** Contradictions present in previous but absent in current (resolved) */
  contradictionsResolved: number;
  /** Actions present in previous but absent in current (likely completed) */
  actionsCompleted: number;
  /** New actions not present in the previous packet */
  actionsAdded: number;
  /** Net assessment */
  overallTrend: OverallTrend;
}

/* ─── Core diff function ──────────────────────────────────────────────────── */

/**
 * Compute a structured diff between two packets.
 * `previous` is the older packet, `current` is the newer one.
 */
export function diffPackets(
  previous: FounderArtifactPacket,
  current: FounderArtifactPacket,
): PacketDiffResult {
  // Confidence delta
  const confidenceDelta =
    current.canonicalEntity.identityConfidence -
    previous.canonicalEntity.identityConfidence;

  // Contradiction diff by title (stable identifier across packets)
  const prevContradictions = new Set(
    previous.contradictions.map((c) => c.title),
  );
  const currContradictions = new Set(
    current.contradictions.map((c) => c.title),
  );

  let contradictionsAdded = 0;
  for (const title of currContradictions) {
    if (!prevContradictions.has(title)) contradictionsAdded++;
  }

  let contradictionsResolved = 0;
  for (const title of prevContradictions) {
    if (!currContradictions.has(title)) contradictionsResolved++;
  }

  // Action diff by label
  const prevActions = new Set(previous.nextActions.map((a) => a.label));
  const currActions = new Set(current.nextActions.map((a) => a.label));

  let actionsCompleted = 0;
  for (const label of prevActions) {
    if (!currActions.has(label)) actionsCompleted++;
  }

  let actionsAdded = 0;
  for (const label of currActions) {
    if (!prevActions.has(label)) actionsAdded++;
  }

  // Overall trend: weighted scoring
  // Positive signals: confidence up, contradictions resolved, actions completed
  // Negative signals: confidence down, contradictions added
  let score = 0;
  if (confidenceDelta > 0.02) score += 2;
  else if (confidenceDelta < -0.02) score -= 2;

  score += contradictionsResolved;
  score -= contradictionsAdded;
  score += actionsCompleted;

  const overallTrend: OverallTrend =
    score > 0 ? "improving" : score < 0 ? "declining" : "stable";

  return {
    confidenceDelta,
    contradictionsAdded,
    contradictionsResolved,
    actionsCompleted,
    actionsAdded,
    overallTrend,
  };
}

/* ─── Formatting helpers ──────────────────────────────────────────────────── */

/** Format confidence delta as "+3%" or "-5%" */
export function formatConfidenceDelta(delta: number): string {
  const pct = Math.round(delta * 100);
  if (pct === 0) return "0%";
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

/** Human-readable trend label */
export function trendLabel(trend: OverallTrend): string {
  switch (trend) {
    case "improving":
      return "Improving";
    case "declining":
      return "Declining";
    case "stable":
      return "Stable";
  }
}
