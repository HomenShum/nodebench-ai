import { useState, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TrajectoryStepJudgeCriterion {
  criterion: string;
  pass: boolean;
  evidence: string;
}

export interface TrajectoryStepJudge {
  pass: boolean;
  criteria: TrajectoryStepJudgeCriterion[];
  model: string;
}

export interface TrajectoryStep {
  id: string;
  index: number;
  toolName: string;
  status: "pending" | "running" | "success" | "error" | "skipped";
  startMs: number;
  endMs?: number;
  durationMs?: number;
  inputSummary: string;
  outputSummary: string;
  outputSize?: number;
  error?: string;
  causedBy?: string;
  children?: string[];
  judge?: TrajectoryStepJudge;
  metadata?: Record<string, unknown>;
}

export interface TrajectoryTotals {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  running: number;
  durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useTrajectoryCapture() {
  const [steps, setSteps] = useState<TrajectoryStep[]>([]);

  const addStep = useCallback((step: Omit<TrajectoryStep, "index">) => {
    setSteps((prev) => [...prev, { ...step, index: prev.length }]);
  }, []);

  const updateStep = useCallback(
    (id: string, updates: Partial<Omit<TrajectoryStep, "id" | "index">>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const clearSteps = useCallback(() => {
    setSteps([]);
  }, []);

  const totals = useMemo<TrajectoryTotals>(() => {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let pending = 0;
    let running = 0;
    let durationMs = 0;

    for (const s of steps) {
      if (s.status === "success") passed++;
      else if (s.status === "error") failed++;
      else if (s.status === "skipped") skipped++;
      else if (s.status === "pending") pending++;
      else if (s.status === "running") running++;
      if (s.durationMs) durationMs += s.durationMs;
    }

    return { total: steps.length, passed, failed, skipped, pending, running, durationMs };
  }, [steps]);

  return { steps, addStep, updateStep, clearSteps, totals };
}
