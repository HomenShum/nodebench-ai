/**
 * perturbations.ts — Perturbation injection system for longitudinal benchmarks.
 *
 * N=100 should NOT be 100 identical runs. It should include:
 *   - repeated same-condition runs (baseline)
 *   - small UI/field changes
 *   - auth/session interruptions
 *   - environment drift
 *   - prompt/thread resets
 *   - model swaps
 *   - partial tool failures
 *   - stale memory injections
 *
 * Each perturbation is applied before a run and reverted after.
 */

import type { BenchmarkRun } from "./longitudinalTypes.js";

/* ─── Perturbation Types ─────────────────────────────────────────────────── */

export type PerturbationType =
  | "none"                    // Clean baseline
  | "session_reset"           // Clear session state, simulate new thread
  | "stale_memory"            // Inject outdated prior packet
  | "tool_failure"            // Simulate one tool returning an error
  | "field_change"            // Change entity field names/schema
  | "env_drift"               // Change environment variable
  | "model_swap"              // Simulate different model behavior (faster/cheaper/worse)
  | "thread_reset"            // New conversation thread, prior context lost
  | "partial_data"            // Some data sources return empty
  | "concurrent_mutation";    // Entity changed between gather and synthesize

export interface Perturbation {
  type: PerturbationType;
  description: string;
  /** Apply before the run — returns a cleanup function */
  apply: () => (() => void);
  /** Expected impact on quality (0-1, where 1 = devastating) */
  severity: number;
}

/* ─── Perturbation Implementations ───────────────────────────────────────── */

const PERTURBATIONS: Record<PerturbationType, Perturbation> = {
  none: {
    type: "none",
    description: "Clean baseline — no perturbation",
    apply: () => () => {},
    severity: 0,
  },

  session_reset: {
    type: "session_reset",
    description: "Clear session memory, simulate fresh start",
    apply: () => {
      // Store current session data, clear it, restore after
      const backupKey = `_bench_backup_${Date.now()}`;
      try {
        const { getDb } = require("../db.js");
        const db = getDb();
        // Mark all current session actions as archived
        db.prepare(`UPDATE tracking_actions SET category = 'archived_' || category WHERE category NOT LIKE 'archived_%'`).run();
        return () => {
          db.prepare(`UPDATE tracking_actions SET category = REPLACE(category, 'archived_', '') WHERE category LIKE 'archived_%'`).run();
        };
      } catch {
        return () => {};
      }
    },
    severity: 0.3,
  },

  stale_memory: {
    type: "stale_memory",
    description: "Inject an outdated prior packet that contradicts current state",
    apply: () => {
      // The stale memory is tracked as a flag on the run, not a real data mutation
      // The benchmark runner checks this flag when scoring memory quality
      return () => {};
    },
    severity: 0.4,
  },

  tool_failure: {
    type: "tool_failure",
    description: "Simulate one tool returning an error mid-chain",
    apply: () => {
      // Set a global flag that the benchmark runner checks
      (globalThis as any).__benchToolFailure = true;
      return () => {
        delete (globalThis as any).__benchToolFailure;
      };
    },
    severity: 0.5,
  },

  field_change: {
    type: "field_change",
    description: "Entity field names changed (simulates schema migration)",
    apply: () => {
      (globalThis as any).__benchFieldChange = true;
      return () => {
        delete (globalThis as any).__benchFieldChange;
      };
    },
    severity: 0.3,
  },

  env_drift: {
    type: "env_drift",
    description: "Environment variable changed (API key rotated, URL changed)",
    apply: () => {
      const original = process.env.NODEBENCH_BENCH_ENV;
      process.env.NODEBENCH_BENCH_ENV = "drifted";
      return () => {
        if (original) process.env.NODEBENCH_BENCH_ENV = original;
        else delete process.env.NODEBENCH_BENCH_ENV;
      };
    },
    severity: 0.2,
  },

  model_swap: {
    type: "model_swap",
    description: "Simulate cheaper/weaker model (reduced quality, faster latency)",
    apply: () => {
      (globalThis as any).__benchModelSwap = "cheap";
      return () => {
        delete (globalThis as any).__benchModelSwap;
      };
    },
    severity: 0.4,
  },

  thread_reset: {
    type: "thread_reset",
    description: "New conversation thread — prior context completely lost",
    apply: () => {
      (globalThis as any).__benchThreadReset = true;
      return () => {
        delete (globalThis as any).__benchThreadReset;
      };
    },
    severity: 0.6,
  },

  partial_data: {
    type: "partial_data",
    description: "Some data sources return empty (git unavailable, SQLite empty)",
    apply: () => {
      (globalThis as any).__benchPartialData = true;
      return () => {
        delete (globalThis as any).__benchPartialData;
      };
    },
    severity: 0.3,
  },

  concurrent_mutation: {
    type: "concurrent_mutation",
    description: "Entity changed between gather and synthesize steps",
    apply: () => {
      (globalThis as any).__benchConcurrentMutation = true;
      return () => {
        delete (globalThis as any).__benchConcurrentMutation;
      };
    },
    severity: 0.5,
  },
};

/* ─── Perturbation Schedule ──────────────────────────────────────────────── */

/**
 * Returns the perturbation to apply for a given session index.
 * N=1-5: no perturbations (baseline)
 * N=6-10: light perturbations (session_reset, stale_memory)
 * N=11-25: medium perturbations (tool_failure, field_change, env_drift)
 * N=26-100: full perturbation mix
 */
export function getPerturbationForSession(sessionIndex: number): Perturbation {
  if (sessionIndex <= 5) return PERTURBATIONS.none;

  if (sessionIndex <= 10) {
    const light: PerturbationType[] = ["none", "session_reset", "stale_memory", "thread_reset", "none"];
    return PERTURBATIONS[light[(sessionIndex - 6) % light.length]];
  }

  if (sessionIndex <= 25) {
    const medium: PerturbationType[] = [
      "none", "session_reset", "tool_failure", "field_change", "env_drift",
      "stale_memory", "none", "partial_data", "thread_reset", "none",
      "model_swap", "none", "session_reset", "stale_memory", "tool_failure",
    ];
    return PERTURBATIONS[medium[(sessionIndex - 11) % medium.length]];
  }

  // N=26-100: full mix including concurrent mutation
  const full: PerturbationType[] = [
    "none", "session_reset", "tool_failure", "stale_memory", "field_change",
    "env_drift", "model_swap", "thread_reset", "partial_data", "concurrent_mutation",
  ];
  return PERTURBATIONS[full[sessionIndex % full.length]];
}

/* ─── Durability Scoring ─────────────────────────────────────────────────── */

export interface DurabilityScore {
  /** 25% — Can the same workflow be completed consistently? */
  completionStability: number;
  /** 20% — Can the system cheaply verify after a change? */
  rerunSavings: number;
  /** 20% — Do artifacts stay correct under perturbation? */
  artifactQuality: number;
  /** 15% — Does accumulated memory help instead of hurt? */
  memoryUsefulness: number;
  /** 10% — Can the workflow survive change over time? */
  driftResistance: number;
  /** 10% — Does context carry across sessions? */
  crossSessionContinuity: number;
  /** Composite score (0-100) */
  composite: number;
}

export function computeDurabilityScore(runs: BenchmarkRun[]): DurabilityScore {
  if (runs.length === 0) {
    return { completionStability: 0, rerunSavings: 0, artifactQuality: 0, memoryUsefulness: 0, driftResistance: 0, crossSessionContinuity: 0, composite: 0 };
  }

  const total = runs.length;

  // Completion stability: % of runs that produced a result
  const completed = runs.filter(r => r.judgeScore >= 2).length;
  const completionStability = completed / total;

  // Rerun savings: do later sessions use fewer tool calls than first?
  const firstSessionRuns = runs.filter(r => r.sessionIndex === 1);
  const laterSessionRuns = runs.filter(r => r.sessionIndex > 1);
  const avgFirstCalls = firstSessionRuns.length > 0
    ? firstSessionRuns.reduce((s, r) => s + r.toolCallCount, 0) / firstSessionRuns.length
    : 0;
  const avgLaterCalls = laterSessionRuns.length > 0
    ? laterSessionRuns.reduce((s, r) => s + r.toolCallCount, 0) / laterSessionRuns.length
    : avgFirstCalls;
  const rerunSavings = avgFirstCalls > 0
    ? Math.max(0, Math.min(1, 1 - (avgLaterCalls / avgFirstCalls)))
    : 0;

  // Artifact quality: % of runs with judge score >= 3
  const highQuality = runs.filter(r => r.judgeScore >= 3).length;
  const artifactQuality = highQuality / total;

  // Memory usefulness: RCA rate (repeated cognition avoided)
  const memoryRuns = runs.filter(r => r.sessionIndex > 1);
  const memoryHits = memoryRuns.filter(r => r.repeatedCognitionAvoided).length;
  const memoryUsefulness = memoryRuns.length > 0 ? memoryHits / memoryRuns.length : 0;

  // Drift resistance: % of perturbed runs that still completed
  // (runs where sessionIndex > 5 are perturbed)
  const perturbedRuns = runs.filter(r => r.sessionIndex > 5);
  const perturbedCompleted = perturbedRuns.filter(r => r.judgeScore >= 2).length;
  const driftResistance = perturbedRuns.length > 0 ? perturbedCompleted / perturbedRuns.length : 1;

  // Cross-session continuity: % of repeat sessions that didn't restate prior context
  const continuityRuns = runs.filter(r => r.sessionIndex > 1);
  const noRestatement = continuityRuns.filter(r => !r.priorContextRestated).length;
  const crossSessionContinuity = continuityRuns.length > 0 ? noRestatement / continuityRuns.length : 0;

  // Composite: weighted average
  const composite = Math.round(
    (completionStability * 25 +
     rerunSavings * 20 +
     artifactQuality * 20 +
     memoryUsefulness * 15 +
     driftResistance * 10 +
     crossSessionContinuity * 10)
  );

  return {
    completionStability: Math.round(completionStability * 100) / 100,
    rerunSavings: Math.round(rerunSavings * 100) / 100,
    artifactQuality: Math.round(artifactQuality * 100) / 100,
    memoryUsefulness: Math.round(memoryUsefulness * 100) / 100,
    driftResistance: Math.round(driftResistance * 100) / 100,
    crossSessionContinuity: Math.round(crossSessionContinuity * 100) / 100,
    composite,
  };
}

/* ─── Maturity Level ─────────────────────────────────────────────────────── */

export type MaturityLevel = "A" | "B" | "C" | "D" | "E";

export function computeMaturityLevel(
  n1Pass: boolean,
  n5Pass: boolean,
  n10Pass: boolean,
  n100Score: DurabilityScore | null,
): { level: MaturityLevel; label: string } {
  if (!n1Pass) return { level: "A", label: "smoke-ready" };
  if (!n5Pass) return { level: "A", label: "smoke-ready" };
  if (!n10Pass) return { level: "B", label: "stable" };
  if (!n100Score || n100Score.composite < 50) return { level: "C", label: "hardened" };
  if (n100Score.composite < 75) return { level: "D", label: "durable" };
  return { level: "E", label: "institutional" };
}

export { PERTURBATIONS };
