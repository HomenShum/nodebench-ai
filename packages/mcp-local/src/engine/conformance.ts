/**
 * Engine Conformance Scoring
 *
 * Computes a deterministic conformance score from a session's tool call history.
 * Used to generate "Conformance Reports" — the sellable output of the engine.
 */

import type { EngineSession, ToolCallRecord } from "./session.js";

export interface ConformanceBreakdown {
  stepsCompleted: boolean;
  qualityGatePassed: boolean;
  testLayersLogged: boolean;
  flywheelCompleted: boolean;
  learningsRecorded: boolean;
  reconPerformed: boolean;
  verificationCycleStarted: boolean;
  noErrors: boolean;
}

export interface ConformanceReport {
  sessionId: string;
  preset: string;
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: ConformanceBreakdown;
  summary: string;
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  totalDurationMs: number;
  generatedAt: number;
}

const FLYWHEEL_TOOLS = [
  "start_flywheel",
  "log_flywheel_step",
  "run_quality_gate",
];

const TEST_TOOLS = [
  "log_test_result",
];

const LEARNING_TOOLS = [
  "log_learning",
  "save_session_note",
  "search_all_knowledge",
];

const RECON_TOOLS = [
  "run_recon",
  "log_recon_finding",
];

const VERIFICATION_TOOLS = [
  "start_verification_cycle",
  "log_verification_step",
];

const QUALITY_GATE_TOOLS = [
  "run_quality_gate",
];

function hasToolCalled(history: ToolCallRecord[], toolNames: string[]): boolean {
  return history.some((r) => toolNames.includes(r.toolName) && r.status === "success");
}

function countByStatus(history: ToolCallRecord[], status: "success" | "error"): number {
  return history.filter((r) => r.status === status).length;
}

export function computeConformance(
  session: EngineSession,
  expectedSteps?: number,
): ConformanceReport {
  const history = session.callHistory;
  const successful = countByStatus(history, "success");
  const failed = countByStatus(history, "error");
  const total = history.length;
  const totalDurationMs = history.reduce((sum, r) => sum + r.durationMs, 0);

  const breakdown: ConformanceBreakdown = {
    stepsCompleted: expectedSteps ? successful >= expectedSteps : successful > 0,
    qualityGatePassed: hasToolCalled(history, QUALITY_GATE_TOOLS),
    testLayersLogged: hasToolCalled(history, TEST_TOOLS),
    flywheelCompleted: hasToolCalled(history, FLYWHEEL_TOOLS),
    learningsRecorded: hasToolCalled(history, LEARNING_TOOLS),
    reconPerformed: hasToolCalled(history, RECON_TOOLS),
    verificationCycleStarted: hasToolCalled(history, VERIFICATION_TOOLS),
    noErrors: failed === 0,
  };

  // Score: each check is worth 12.5 points (8 checks × 12.5 = 100)
  const checks = Object.values(breakdown);
  const passed = checks.filter(Boolean).length;
  const score = Math.round((passed / checks.length) * 100);

  const grade: ConformanceReport["grade"] =
    score >= 90 ? "A" :
    score >= 75 ? "B" :
    score >= 60 ? "C" :
    score >= 40 ? "D" : "F";

  const failedChecks = Object.entries(breakdown)
    .filter(([, v]) => !v)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase().trim());

  const summary = score === 100
    ? `All conformance checks passed. ${successful}/${total} tool calls succeeded in ${totalDurationMs}ms.`
    : `Score ${score}/100 (${grade}). Missing: ${failedChecks.join(", ")}. ${successful}/${total} calls succeeded.`;

  return {
    sessionId: session.id,
    preset: session.preset,
    score,
    grade,
    breakdown,
    summary,
    totalSteps: total,
    successfulSteps: successful,
    failedSteps: failed,
    totalDurationMs,
    generatedAt: Date.now(),
  };
}
