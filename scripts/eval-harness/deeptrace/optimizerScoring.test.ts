/**
 * DeepTrace Autoresearch Optimizer — Scoring & Allowlist Tests
 *
 * Scenario-based tests covering:
 * - Throughput scoring with realistic metric ranges
 * - Quality guard evaluation (pass/fail edge cases)
 * - Candidate promotion logic
 * - Allowlist enforcement for mutation scoping
 */

import { describe, expect, it } from "vitest";

import {
  computeThroughputScore,
  evaluateQualityGuards,
  scoreCandidate,
  shouldPromote,
  validateAllowlist,
} from "./optimizerScoring";
import {
  type BaselineSnapshot,
  type QualityMetrics,
  type ThroughputMetrics,
  MUTATION_ALLOWLIST,
  QUALITY_GUARDS,
} from "./optimizerTypes";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STRONG_THROUGHPUT: ThroughputMetrics = {
  taskCompletionRate: 0.95,
  timeToFirstDraftMs: 30_000,
  humanEditDistance: 80,
  wallClockMs: 60_000,
  toolCallCount: 20,
};

const WEAK_THROUGHPUT: ThroughputMetrics = {
  taskCompletionRate: 0.40,
  timeToFirstDraftMs: 300_000,
  humanEditDistance: 2000,
  wallClockMs: 600_000,
  toolCallCount: 200,
};

const PASSING_QUALITY: QualityMetrics = {
  factualPrecision: 0.92,
  relationshipPrecision: 0.88,
  evidenceLinkage: 0.82,
  receiptCompleteness: 0.85,
  falseConfidenceRate: 0.05,
  canaryRelativeUplift: 0.08,
};

const BASELINE_QUALITY: QualityMetrics = {
  factualPrecision: 0.90,
  relationshipPrecision: 0.87,
  evidenceLinkage: 0.80,
  receiptCompleteness: 0.83,
  falseConfidenceRate: 0.06,
  canaryRelativeUplift: 0.05,
};

function makeBaseline(overrides?: Partial<BaselineSnapshot>): BaselineSnapshot {
  return {
    baselineId: "baseline-abc12345-1710000000000",
    commitHash: "abc12345",
    throughputMetrics: WEAK_THROUGHPUT,
    qualityMetrics: BASELINE_QUALITY,
    capturedAt: "2026-03-15T12:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Throughput scoring
// ---------------------------------------------------------------------------

describe("computeThroughputScore", () => {
  it("scores a high-performing candidate near 1.0", () => {
    const score = computeThroughputScore({
      taskCompletionRate: 1.0,
      timeToFirstDraftMs: 0,
      humanEditDistance: 0,
      wallClockMs: 0,
      toolCallCount: 0,
    });
    // Perfect metrics should yield close to 1.0
    expect(score).toBeGreaterThan(0.95);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it("scores a degraded candidate lower than a strong one", () => {
    const strong = computeThroughputScore(STRONG_THROUGHPUT);
    const weak = computeThroughputScore(WEAK_THROUGHPUT);
    expect(strong).toBeGreaterThan(weak);
    // Strong should be meaningfully better
    expect(strong - weak).toBeGreaterThan(0.1);
  });

  it("clamps task completion rate to [0, 1]", () => {
    const overClamped = computeThroughputScore({
      ...STRONG_THROUGHPUT,
      taskCompletionRate: 1.5,
    });
    const atOne = computeThroughputScore({
      ...STRONG_THROUGHPUT,
      taskCompletionRate: 1.0,
    });
    expect(overClamped).toEqual(atOne);
  });

  it("handles zero tool calls gracefully", () => {
    const score = computeThroughputScore({
      ...STRONG_THROUGHPUT,
      toolCallCount: 0,
    });
    expect(score).toBeGreaterThan(0);
    expect(Number.isFinite(score)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Quality guard evaluation
// ---------------------------------------------------------------------------

describe("evaluateQualityGuards", () => {
  it("passes when all metrics are above baseline thresholds", () => {
    const result = evaluateQualityGuards(PASSING_QUALITY, BASELINE_QUALITY);
    expect(result.pass).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("fails when factual precision drops more than 1pp", () => {
    const degraded: QualityMetrics = {
      ...PASSING_QUALITY,
      factualPrecision: BASELINE_QUALITY.factualPrecision - 0.02,
    };
    const result = evaluateQualityGuards(degraded, BASELINE_QUALITY);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("factualPrecision"))).toBe(true);
  });

  it("fails when relationship precision drops more than 1pp", () => {
    const degraded: QualityMetrics = {
      ...PASSING_QUALITY,
      relationshipPrecision: BASELINE_QUALITY.relationshipPrecision - 0.02,
    };
    const result = evaluateQualityGuards(degraded, BASELINE_QUALITY);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("relationshipPrecision"))).toBe(true);
  });

  it("fails when evidence linkage drops below floor", () => {
    const degraded: QualityMetrics = {
      ...PASSING_QUALITY,
      evidenceLinkage: QUALITY_GUARDS.minEvidenceLinkage - 0.01,
    };
    const result = evaluateQualityGuards(degraded, BASELINE_QUALITY);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("evidenceLinkage"))).toBe(true);
  });

  it("fails when receipt completeness drops below floor", () => {
    const degraded: QualityMetrics = {
      ...PASSING_QUALITY,
      receiptCompleteness: QUALITY_GUARDS.minReceiptCompleteness - 0.01,
    };
    const result = evaluateQualityGuards(degraded, BASELINE_QUALITY);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("receiptCompleteness"))).toBe(true);
  });

  it("fails when false confidence rate exceeds ceiling", () => {
    const degraded: QualityMetrics = {
      ...PASSING_QUALITY,
      falseConfidenceRate: QUALITY_GUARDS.maxFalseConfidenceRate + 0.01,
    };
    const result = evaluateQualityGuards(degraded, BASELINE_QUALITY);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("falseConfidenceRate"))).toBe(true);
  });

  it("fails when canary uplift is below floor", () => {
    const degraded: QualityMetrics = {
      ...PASSING_QUALITY,
      canaryRelativeUplift: QUALITY_GUARDS.minCanaryRelativeUplift - 0.001,
    };
    const result = evaluateQualityGuards(degraded, BASELINE_QUALITY);
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes("canaryRelativeUplift"))).toBe(true);
  });

  it("accumulates multiple failures when several guards fail", () => {
    const veryDegraded: QualityMetrics = {
      factualPrecision: 0.5,
      relationshipPrecision: 0.5,
      evidenceLinkage: 0.3,
      receiptCompleteness: 0.3,
      falseConfidenceRate: 0.5,
      canaryRelativeUplift: 0.0,
    };
    const result = evaluateQualityGuards(veryDegraded, BASELINE_QUALITY);
    expect(result.pass).toBe(false);
    expect(result.failures.length).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Candidate promotion
// ---------------------------------------------------------------------------

describe("shouldPromote", () => {
  it("promotes when throughput improves >= 5% and guards pass", () => {
    const baseline = makeBaseline();
    const baselineThroughput = computeThroughputScore(baseline.throughputMetrics);
    const candidateScore = scoreCandidate(STRONG_THROUGHPUT, PASSING_QUALITY, baseline);
    expect(candidateScore.guardsPass).toBe(true);
    expect(shouldPromote(candidateScore, baselineThroughput)).toBe(true);
  });

  it("rejects when guards fail even with good throughput", () => {
    const baseline = makeBaseline();
    const baselineThroughput = computeThroughputScore(baseline.throughputMetrics);
    const badQuality: QualityMetrics = {
      ...PASSING_QUALITY,
      evidenceLinkage: 0.50, // below floor
    };
    const candidateScore = scoreCandidate(STRONG_THROUGHPUT, badQuality, baseline);
    expect(candidateScore.guardsPass).toBe(false);
    expect(shouldPromote(candidateScore, baselineThroughput)).toBe(false);
  });

  it("rejects when throughput improvement is < 5% even with passing guards", () => {
    const baseline = makeBaseline({ throughputMetrics: STRONG_THROUGHPUT });
    const baselineThroughput = computeThroughputScore(baseline.throughputMetrics);
    // Marginally different throughput
    const marginalThroughput: ThroughputMetrics = {
      ...STRONG_THROUGHPUT,
      toolCallCount: STRONG_THROUGHPUT.toolCallCount - 1,
    };
    const candidateScore = scoreCandidate(marginalThroughput, PASSING_QUALITY, baseline);
    expect(candidateScore.guardsPass).toBe(true);
    expect(shouldPromote(candidateScore, baselineThroughput)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Allowlist enforcement
// ---------------------------------------------------------------------------

describe("validateAllowlist", () => {
  it("accepts files within the DeepTrace mutation allowlist", () => {
    const allowed = [
      "convex/domains/deepTrace/dimensionEngine.ts",
      "convex/domains/deepTrace/heuristics.ts",
      "convex/workflows/deepTrace.ts",
      "packages/mcp-local/src/tools/dimensionTools.ts",
      "scripts/eval-harness/deeptrace/canary-benchmark-spec.json",
    ];
    const violations = validateAllowlist(allowed);
    expect(violations).toHaveLength(0);
  });

  it("rejects files outside the allowlist", () => {
    const mixed = [
      "convex/domains/deepTrace/schema.ts", // allowed
      "src/features/research/components/ForYouFeed.tsx", // not allowed
      "convex/domains/ai/genai.ts", // not allowed
    ];
    const violations = validateAllowlist(mixed);
    expect(violations).toHaveLength(2);
    expect(violations).toContain("src/features/research/components/ForYouFeed.tsx");
    expect(violations).toContain("convex/domains/ai/genai.ts");
  });

  it("rejects all files when none are in the allowlist", () => {
    const forbidden = [
      "src/App.tsx",
      "package.json",
    ];
    const violations = validateAllowlist(forbidden);
    expect(violations).toHaveLength(2);
  });

  it("accepts custom allowlist override", () => {
    const customAllowlist = ["src/custom/"];
    const files = ["src/custom/foo.ts"];
    const violations = validateAllowlist(files, customAllowlist);
    expect(violations).toHaveLength(0);
  });

  it("returns empty array for empty file list", () => {
    expect(validateAllowlist([])).toHaveLength(0);
  });
});
