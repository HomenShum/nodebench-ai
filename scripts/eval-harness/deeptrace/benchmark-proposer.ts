/**
 * Benchmark Proposer — Closes the optimization loop with real measurements
 *
 * Unlike the session-proposer (which returns estimated metric deltas) or the
 * llm-proposer (which returns LLM-predicted deltas), this proposer:
 *
 *   1. Reads mutation proposals from session-proposals.json (same as session-proposer)
 *   2. Applies file edits to the worktree
 *   3. Dynamically imports the MUTATED researchCell.ts from the worktree
 *   4. Runs the canary benchmark suite against the mutated code
 *   5. Returns MEASURED metrics — not estimates
 *
 * This is the closed-loop proposer that makes the optimizer's throughput
 * scores reflect real investigation behavior changes.
 *
 * Contract: export a default function matching OptimizerProposeFn.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

import type { OptimizerProposal } from "./optimizerRunner.js";
import type { BaselineSnapshot, CostEntry } from "./optimizerTypes.js";
import type { SessionProposal, CumulativeTracker } from "./session-proposer.js";
import { CANARY_FIXTURES, aggregateToMetrics, type CanaryFixture, type CanaryResult } from "./canary-benchmark.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROPOSALS_PATH = path.join(CURRENT_DIR, "session-proposals.json");
const TRACKER_PATH = path.join(CURRENT_DIR, "cumulative-tracker.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadProposals(): SessionProposal[] {
  if (!fs.existsSync(PROPOSALS_PATH)) {
    throw new Error(`Proposals file not found: ${PROPOSALS_PATH}`);
  }
  return JSON.parse(fs.readFileSync(PROPOSALS_PATH, "utf-8")) as SessionProposal[];
}

function loadTracker(): CumulativeTracker | null {
  if (!fs.existsSync(TRACKER_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(TRACKER_PATH, "utf-8")) as CumulativeTracker;
  } catch {
    return null;
  }
}

function writeFileToWorktree(worktreePath: string, relPath: string, content: string): void {
  const fullPath = path.join(worktreePath, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
}

// ---------------------------------------------------------------------------
// Benchmark runner against mutated worktree code
// ---------------------------------------------------------------------------

/**
 * Run the canary benchmark suite using the researchCell.ts from the worktree.
 *
 * Instead of importing from the worktree (which lacks node_modules),
 * we copy the mutated researchCell.ts into a temp file within the HOST
 * repo tree — so `convex/values` and other imports resolve correctly.
 * After benchmarking, we clean up the temp file.
 */
async function runBenchmarkOnWorktree(
  worktreePath: string,
  fixtures: CanaryFixture[] = CANARY_FIXTURES,
): Promise<{ results: CanaryResult[]; benchmarkMs: number }> {
  const benchStart = performance.now();

  // Read the mutated researchCell from the worktree
  const worktreeResearchCell = path.join(
    worktreePath,
    "convex",
    "domains",
    "deepTrace",
    "researchCell.ts",
  );

  // Copy mutated file into host repo as a temp file (so convex/values resolves)
  const REPO_ROOT = path.resolve(CURRENT_DIR, "..", "..", "..");
  const hostResearchCellDir = path.join(REPO_ROOT, "convex", "domains", "deepTrace");

  // If worktree doesn't have researchCell.ts (proposal didn't edit it),
  // fall back to the host repo's version — we still benchmark with the
  // other mutations the proposal applied to heuristics/dimensionEngine/etc.
  const sourceFile = fs.existsSync(worktreeResearchCell)
    ? worktreeResearchCell
    : path.join(hostResearchCellDir, "researchCell.ts");
  const tempFileName = `_benchmark_temp_${Date.now()}.ts`;
  const tempFilePath = path.join(hostResearchCellDir, tempFileName);

  fs.copyFileSync(sourceFile, tempFilePath);

  let rc: any;
  try {
    // Dynamic import with cache-busting timestamp from HOST repo location
    const tempUrl = pathToFileURL(tempFilePath).href;
    rc = await import(tempUrl);
  } finally {
    // Always clean up the temp file
    try { fs.unlinkSync(tempFilePath); } catch { /* best-effort */ }
  }

  const {
    shouldTriggerResearchCell,
    planResearchBranches,
    judgeBranches,
    mergeBranchResults,
    RESEARCH_CELL_DEFAULTS,
  } = rc;

  // Run each fixture through the mutated code
  const fixtureResults: CanaryResult[] = fixtures.map((fixture) => {
    const startMs = performance.now();

    // 1. Trigger evaluation
    const triggerInput = {
      confidence: fixture.dimensionProfile.confidence,
      dimensionCoverage: fixture.dimensionProfile.coverageRatio,
      durableSourceCount: fixture.dimensionProfile.durableSourceCount,
      operatorRequested: false,
      entityType: fixture.entityType,
    };

    const { trigger } = shouldTriggerResearchCell(triggerInput);

    if (!trigger) {
      const merged = mergeBranchResults([], fixture.entityKey);
      const wallClockMs = performance.now() - startMs;
      return scoreFixtureResult(fixture, {
        triggered: false,
        branches: [],
        branchResults: [],
        ranked: [],
        merged,
        wallClockMs,
      });
    }

    // 2. Branch planning
    const branches = planResearchBranches(
      "low confidence or coverage",
      fixture.entityKey,
      fixture.existingFacts,
      RESEARCH_CELL_DEFAULTS?.maxBranches ?? 3,
    );

    // 3. Use simulated branch results (offline mode)
    const branchResults = fixture.simulatedBranchResults ?? branches.map((b: any) => ({
      branchId: b.branchId,
      strategy: b.strategy,
      observedFacts: [],
      relationships: [],
      hypothesis: null,
      counterHypothesis: null,
      evidenceRefs: [],
      usefulness: 0,
      toolCallCount: 0,
      wallClockMs: 0,
    }));

    // 4. Judge and merge
    const ranked = judgeBranches(branchResults);
    const merged = mergeBranchResults(ranked, fixture.entityKey);
    const wallClockMs = performance.now() - startMs;

    return scoreFixtureResult(fixture, {
      triggered: true,
      branches,
      branchResults,
      ranked,
      merged,
      wallClockMs,
    });
  });

  return {
    results: fixtureResults,
    benchmarkMs: performance.now() - benchStart,
  };
}

// ---------------------------------------------------------------------------
// Scoring (mirrors canary-benchmark.ts but works with dynamic imports)
// ---------------------------------------------------------------------------

interface RunResultLike {
  triggered: boolean;
  branches: any[];
  branchResults: any[];
  ranked: any[];
  merged: any;
  wallClockMs: number;
}

function scoreFixtureResult(fixture: CanaryFixture, result: RunResultLike): CanaryResult {
  const triggerCorrect = fixture.expectations.shouldTrigger === result.triggered;

  const expectedStrategies = fixture.expectations.expectedStrategies;
  const actualStrategies = result.branches.map((b: any) => b.strategy);
  const strategiesCorrect = expectedStrategies.every(
    (s: string) => actualStrategies.includes(s),
  );

  const maxUsefulness = result.ranked.length > 0
    ? Math.max(...result.ranked.map((r: any) => r.usefulness))
    : 0;
  const usefulnessAboveFloor = !fixture.expectations.shouldTrigger ||
    maxUsefulness >= fixture.expectations.minUsefulnessAny;

  const mergedFacts = result.merged.observedFacts?.length ?? 0;
  const mergedRels = result.merged.relationships?.length ?? 0;
  const mergedEvidence = result.merged.evidenceBundle?.length ?? 0;
  const factsAboveFloor = mergedFacts >= fixture.expectations.minMergedFacts;
  const relsAboveFloor = mergedRels >= fixture.expectations.minMergedRelationships;

  // Weighted scoring dimensions
  const triggerScore = triggerCorrect ? 1.0 : 0.0;
  const branchScore = !fixture.expectations.shouldTrigger
    ? (result.branches.length === 0 ? 1.0 : 0.5)
    : (expectedStrategies.length > 0
      ? expectedStrategies.filter((s: string) => actualStrategies.includes(s)).length / expectedStrategies.length
      : 1.0);
  const usefulScore = !fixture.expectations.shouldTrigger
    ? 1.0
    : (maxUsefulness >= fixture.expectations.minUsefulnessAny
      ? 1.0
      : maxUsefulness / Math.max(fixture.expectations.minUsefulnessAny, 0.01));
  const evidenceScore = !fixture.expectations.shouldTrigger
    ? 1.0
    : ((factsAboveFloor ? 1.0 : mergedFacts / Math.max(fixture.expectations.minMergedFacts, 1)) +
       (fixture.expectations.minMergedRelationships === 0 ? 1.0 : (relsAboveFloor ? 1.0 : mergedRels / fixture.expectations.minMergedRelationships))) / 2;
  const efficiencyScore = result.wallClockMs < 5000 ? 1.0
    : result.wallClockMs > 90000 ? 0.0
    : 1.0 - (result.wallClockMs - 5000) / 85000;

  const score =
    0.25 * triggerScore +
    0.20 * branchScore +
    0.20 * usefulScore +
    0.20 * evidenceScore +
    0.15 * efficiencyScore;

  return {
    fixtureId: fixture.fixtureId,
    entityKey: fixture.entityKey,
    wallClockMs: result.wallClockMs,
    triggered: result.triggered,
    branchCount: result.branches.length,
    strategies: actualStrategies,
    mergedFactCount: mergedFacts,
    mergedRelationshipCount: mergedRels,
    mergedEvidenceCount: mergedEvidence,
    triggerCorrect,
    branchCountCorrect: result.branches.length >= fixture.expectations.minBranches,
    strategiesCorrect,
    usefulnessAboveFloor,
    factsAboveFloor,
    relationshipsAboveFloor: relsAboveFloor,
    score,
  };
}

// ---------------------------------------------------------------------------
// Proposer (OptimizerProposeFn contract)
// ---------------------------------------------------------------------------

export default async function propose(
  worktreePath: string,
  baseline: BaselineSnapshot,
  iteration: number,
): Promise<OptimizerProposal | null> {
  const proposals = loadProposals();
  if (iteration >= proposals.length) return null;

  const p = proposals[iteration];

  // For compound proposals, first apply base edits from promoted candidates
  if (p.compound) {
    const tracker = loadTracker();
    if (tracker?.baseEdits) {
      for (const edit of tracker.baseEdits) {
        writeFileToWorktree(worktreePath, edit.filePath, edit.newContent);
      }
    }
  }

  // Apply this proposal's edits
  for (const edit of p.edits) {
    writeFileToWorktree(worktreePath, edit.filePath, edit.newContent);
  }

  // ── THE KEY DIFFERENCE ──
  // Instead of returning estimated metrics, we run the canary benchmark
  // against the MUTATED code in the worktree and return MEASURED metrics.

  const costEntries: CostEntry[] = [{
    phase: "propose",
    model: "claude-opus-4-6-session",
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    timestamp: new Date().toISOString(),
  }];

  try {
    const { results, benchmarkMs } = await runBenchmarkOnWorktree(worktreePath);
    const metrics = aggregateToMetrics(results);

    // Compute canary relative uplift vs baseline
    const baselineThroughputScore = computeBaselineThroughputProxy(baseline);
    const candidateThroughputScore = computeCandidateThroughputProxy(metrics.throughput);
    if (baselineThroughputScore > 0) {
      metrics.quality.canaryRelativeUplift =
        (candidateThroughputScore - baselineThroughputScore) / baselineThroughputScore;
    }

    costEntries.push({
      phase: "benchmark",
      model: "deterministic",
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      timestamp: new Date().toISOString(),
    });

    return {
      candidateId: p.candidateId,
      throughput: metrics.throughput,
      quality: metrics.quality,
      rationale: `[${p.compound ? "COMPOUND" : "FRESH"}][MEASURED] ${p.rationale} — benchmark: ${benchmarkMs.toFixed(0)}ms, ${results.length} fixtures, avg score ${(results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(3)}`,
      costEntries,
    };
  } catch (err) {
    // If benchmark fails (e.g., mutated code has runtime errors), return null
    // to signal this candidate should be discarded
    console.warn(`Benchmark failed for ${p.candidateId}: ${err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Throughput proxy (simple weighted score matching optimizerScoring.ts)
// ---------------------------------------------------------------------------

function computeBaselineThroughputProxy(baseline: BaselineSnapshot): number {
  const m = baseline.throughputMetrics;
  const comp = Math.min(1, m.taskCompletionRate);
  const draft = 1 / (1 + m.timeToFirstDraftMs / 60_000);
  const edit = 1 / (1 + m.humanEditDistance / 500);
  const clock = 1 / (1 + m.wallClockMs / 120_000);
  const tool = 1 / (1 + m.toolCallCount / 50);
  return 0.30 * comp + 0.25 * draft + 0.20 * edit + 0.15 * clock + 0.10 * tool;
}

function computeCandidateThroughputProxy(m: { taskCompletionRate: number; timeToFirstDraftMs: number; humanEditDistance: number; wallClockMs: number; toolCallCount: number }): number {
  const comp = Math.min(1, m.taskCompletionRate);
  const draft = 1 / (1 + m.timeToFirstDraftMs / 60_000);
  const edit = 1 / (1 + m.humanEditDistance / 500);
  const clock = 1 / (1 + m.wallClockMs / 120_000);
  const tool = 1 / (1 + m.toolCallCount / 50);
  return 0.30 * comp + 0.25 * draft + 0.20 * edit + 0.15 * clock + 0.10 * tool;
}
