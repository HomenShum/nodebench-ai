/**
 * Shared DRANE Narrative Validators (Phase 7)
 *
 * Single source of truth for validators used across mutations, queries, and schema.
 * Import these instead of defining inline to avoid copy-paste drift.
 *
 * @module domains/narrative/validators
 */

import { v } from "convex/values";

// ─── Speculative Risk ────────────────────────────────────────────────────────
export const speculativeRiskValidator = v.union(
  v.literal("grounded"),
  v.literal("mixed"),
  v.literal("speculative")
);

export type SpeculativeRisk = "grounded" | "mixed" | "speculative";

// ─── Entailment Verdict ──────────────────────────────────────────────────────
export const entailmentVerdictValidator = v.union(
  v.literal("entailed"),
  v.literal("neutral"),
  v.literal("contradicted")
);

export type EntailmentVerdict = "entailed" | "neutral" | "contradicted";

// ─── Claim Kind ──────────────────────────────────────────────────────────────
export const claimKindValidator = v.union(
  v.literal("verifiable"),
  v.literal("interpretation"),
  v.literal("prediction")
);

export type ClaimKind = "verifiable" | "interpretation" | "prediction";

// ─── ClaimSet Item (Phase 7) ─────────────────────────────────────────────────
export const claimSetItemValidator = v.object({
  claim: v.string(),
  confidence: v.number(),
  evidenceArtifactIds: v.array(v.string()),
  kind: v.optional(claimKindValidator),
  uncertainty: v.optional(v.number()),
  speculativeRisk: v.optional(speculativeRiskValidator),
  entailmentVerdict: v.optional(entailmentVerdictValidator),
  hypothesisId: v.optional(v.string()),
});

export const claimSetValidator = v.optional(v.array(claimSetItemValidator));

// ─── Hypothesis Status ───────────────────────────────────────────────────────
export const hypothesisStatusValidator = v.union(
  v.literal("active"),
  v.literal("supported"),
  v.literal("weakened"),
  v.literal("inconclusive"),
  v.literal("retired")
);

export type HypothesisStatus = "active" | "supported" | "weakened" | "inconclusive" | "retired";

// ─── Signal Metric Domain ────────────────────────────────────────────────────
export const signalDomainValidator = v.union(
  v.literal("attention"),
  v.literal("policy"),
  v.literal("labor"),
  v.literal("market"),
  v.literal("sentiment")
);

export type SignalDomain = "attention" | "policy" | "labor" | "market" | "sentiment";

// ─── Source Tier ─────────────────────────────────────────────────────────────
export const sourceTierValidator = v.union(
  v.literal("tier1"),
  v.literal("tier2"),
  v.literal("tier3"),
  v.literal("tier4")
);

export type SourceTier = "tier1" | "tier2" | "tier3" | "tier4";

// ─── Hypothesis Candidate (shared between Analyst agent and NewsroomState) ───
export interface HypothesisCandidate {
  label: string;
  title: string;
  claimForm: string;
  measurementApproach: string;
  speculativeRisk: SpeculativeRisk;
  falsificationCriteria?: string;
}
