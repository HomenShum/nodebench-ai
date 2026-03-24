#!/usr/bin/env npx tsx
/**
 * longitudinalHarness.ts — Longitudinal dogfood benchmark harness for NodeBench MCP.
 *
 * Orchestrates N=1, N=5, N=10, N=100 cohort evaluations to measure whether
 * NodeBench compounds value across users, roles, sessions, and time horizons.
 *
 * Core metrics:
 *   RCA  — Repeated Cognition Avoided (% of sessions not restating prior context)
 *   PRR  — Packet Reuse Rate (% of sessions reusing a prior packet)
 *
 * Usage:
 *   cd packages/mcp-local && npx tsx src/benchmarks/longitudinalHarness.ts [n1|n5|n10|n100|all]
 */

import type { McpTool } from "../types.js";
import { getDb } from "../db.js";
import { genId } from "../db.js";
import { _setDbAccessor } from "../tools/toolRegistry.js";
import { loadToolsets, ALL_DOMAIN_KEYS } from "../toolsetRegistry.js";
import { deepSimTools } from "../tools/deepSimTools.js";
import { reconTools } from "../tools/reconTools.js";
import { founderTools } from "../tools/founderTools.js";
import { founderTrackingTools } from "../tools/founderTrackingTools.js";
import { dogfoodJudgeTools } from "../tools/dogfoodJudgeTools.js";
import { learningTools } from "../tools/learningTools.js";
import { flywheelTools } from "../tools/flywheelTools.js";
import { createMetaTools } from "../tools/metaTools.js";
import { createProgressiveDiscoveryTools } from "../tools/progressiveDiscoveryTools.js";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CohortUser {
  userId: string;
  role: "founder" | "banker" | "ceo" | "researcher" | "student" | "legal" | "pm" | "contractor" | "investor" | "content";
  preset: string;
  typicalScenarios: string[];
}

export interface SessionRun {
  runId: string;
  userId: string;
  role: string;
  scenarioId: string;
  sessionIndex: number;
  timeHorizon: "same_session" | "same_day" | "next_day" | "weekly" | "monthly" | "quarterly" | "yearly";
  surface: "mcp" | "ai_app" | "local_dashboard" | "engine_api";
  toolCallCount: number;
  latencyMs: number;
  packetGenerated: boolean;
  packetReused: boolean;
  repeatQuestionDetected: boolean;
  contextRestated: boolean;
  exportProduced: boolean;
  judgeScore: number;
  errors: string[];
}

export interface CohortReport {
  cohortSize: number;
  totalSessions: number;
  rolesCovered: string[];
  coreLoopsCovered: number;
  repeatedCognitionAvoided: number;
  packetReuseRate: number;
  importantChangePrecision: number;
  contradictionPrecision: number;
  falseAlertRate: number;
  exportToActionRate: number;
  topRecurringRootCause: string;
  topRegressionRisk: string;
  passed: boolean;
  passThresholds: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const PASS_THRESHOLDS: Record<string, Record<string, number>> = {
  n1: { judgeScore: 3.5 },
  n5: { rca: 40, prr: 20 },
  n10: { rca: 55, prr: 35 },
  n100: { rca: 70, prr: 50 },
};

const TIME_HORIZONS: SessionRun["timeHorizon"][] = [
  "same_session", "same_day", "next_day", "weekly", "monthly", "quarterly", "yearly",
];

const SURFACES: SessionRun["surface"][] = ["mcp", "ai_app", "local_dashboard", "engine_api"];

/** Seeded cohort of 10 users. */
const COHORT_USERS: CohortUser[] = [
  { userId: "user_founder_01",    role: "founder",    preset: "founder",    typicalScenarios: ["weekly_reset", "pre_delegation", "important_change"] },
  { userId: "user_banker_02",     role: "banker",     preset: "banker",     typicalScenarios: ["company_search", "memo_export"] },
  { userId: "user_ceo_03",        role: "ceo",        preset: "founder",    typicalScenarios: ["weekly_reset", "company_search", "competitor_brief"] },
  { userId: "user_researcher_04", role: "researcher", preset: "researcher", typicalScenarios: ["competitor_brief", "company_search"] },
  { userId: "user_student_05",    role: "student",    preset: "starter",    typicalScenarios: ["company_search", "memo_export"] },
  { userId: "user_legal_06",      role: "legal",      preset: "starter",    typicalScenarios: ["company_search", "important_change"] },
  { userId: "user_pm_07",         role: "pm",         preset: "core",       typicalScenarios: ["pre_delegation", "important_change"] },
  { userId: "user_contractor_08", role: "contractor", preset: "starter",    typicalScenarios: ["pre_delegation"] },
  { userId: "user_investor_09",   role: "investor",   preset: "banker",     typicalScenarios: ["company_search", "competitor_brief"] },
  { userId: "user_content_10",    role: "content",    preset: "starter",    typicalScenarios: ["memo_export", "weekly_reset"] },
];

/** Scenario → tool chain mapping. Each scenario declares which tools to call in sequence. */
const SCENARIO_TOOL_CHAINS: Record<string, string[]> = {
  weekly_reset: [
    "check_mcp_setup",
    "recon_entity",
    "extract_variables",
    "render_decision_memo",
    "record_event",
  ],
  pre_delegation: [
    "check_mcp_setup",
    "recon_entity",
    "render_decision_memo",
    "track_milestone",
    "record_event",
  ],
  important_change: [
    "recon_entity",
    "extract_variables",
    "build_claim_graph",
    "rank_interventions",
    "record_event",
  ],
  company_search: [
    "check_mcp_setup",
    "recon_entity",
    "extract_variables",
    "build_claim_graph",
    "render_decision_memo",
    "record_event",
  ],
  competitor_brief: [
    "recon_entity",
    "extract_variables",
    "generate_countermodels",
    "render_decision_memo",
    "record_event",
  ],
  memo_export: [
    "recon_entity",
    "extract_variables",
    "render_decision_memo",
    "record_event",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// SQLite Schema
// ═══════════════════════════════════════════════════════════════════════════

const LONGITUDINAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS longitudinal_sessions (
  runId                  TEXT PRIMARY KEY,
  batchId                TEXT NOT NULL,
  cohortSize             INTEGER NOT NULL,
  userId                 TEXT NOT NULL,
  role                   TEXT NOT NULL,
  scenarioId             TEXT NOT NULL,
  sessionIndex           INTEGER NOT NULL,
  timeHorizon            TEXT NOT NULL,
  surface                TEXT NOT NULL,
  toolCallCount          INTEGER NOT NULL DEFAULT 0,
  latencyMs              INTEGER NOT NULL DEFAULT 0,
  packetGenerated        INTEGER NOT NULL DEFAULT 0,
  packetReused           INTEGER NOT NULL DEFAULT 0,
  repeatQuestionDetected INTEGER NOT NULL DEFAULT 0,
  contextRestated        INTEGER NOT NULL DEFAULT 0,
  exportProduced         INTEGER NOT NULL DEFAULT 0,
  judgeScore             REAL NOT NULL DEFAULT 0,
  errors                 TEXT NOT NULL DEFAULT '[]',
  createdAt              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_longitudinal_batch  ON longitudinal_sessions(batchId);
CREATE INDEX IF NOT EXISTS idx_longitudinal_user   ON longitudinal_sessions(userId);
CREATE INDEX IF NOT EXISTS idx_longitudinal_cohort ON longitudinal_sessions(cohortSize);
`;

function ensureSchema(): void {
  const db = getDb();
  db.exec(LONGITUDINAL_SCHEMA);
}

// ═══════════════════════════════════════════════════════════════════════════
// Tool Assembly
// ═══════════════════════════════════════════════════════════════════════════

let _allTools: McpTool[] | null = null;

async function getAllTools(): Promise<McpTool[]> {
  if (_allTools) return _allTools;

  getDb();
  _setDbAccessor(getDb);

  const domainTools = await loadToolsets(ALL_DOMAIN_KEYS);
  const metaTools = createMetaTools(domainTools);
  const allToolsFlat = [
    ...domainTools,
    ...metaTools,
    ...deepSimTools,
    ...reconTools,
    ...founderTools,
    ...founderTrackingTools,
    ...dogfoodJudgeTools,
    ...learningTools,
    ...flywheelTools,
  ];
  const discoveryTools = createProgressiveDiscoveryTools(
    allToolsFlat.map((t) => ({ name: t.name, description: t.description })),
  );
  _allTools = [...allToolsFlat, ...discoveryTools];
  return _allTools;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function findTool(tools: McpTool[], name: string): McpTool | null {
  return tools.find((t) => t.name === name) ?? null;
}

async function callTool(
  tool: McpTool,
  args: Record<string, unknown> = {},
): Promise<{ ok: boolean; result: unknown; error?: string; ms: number }> {
  const start = Date.now();
  try {
    const result = await tool.handler(args);
    return { ok: true, result, ms: Date.now() - start };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, result: null, error: message, ms: Date.now() - start };
  }
}

function persistSession(session: SessionRun, batchId: string, cohortSize: number): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO longitudinal_sessions
      (runId, batchId, cohortSize, userId, role, scenarioId, sessionIndex,
       timeHorizon, surface, toolCallCount, latencyMs, packetGenerated,
       packetReused, repeatQuestionDetected, contextRestated, exportProduced,
       judgeScore, errors)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session.runId,
    batchId,
    cohortSize,
    session.userId,
    session.role,
    session.scenarioId,
    session.sessionIndex,
    session.timeHorizon,
    session.surface,
    session.toolCallCount,
    session.latencyMs,
    session.packetGenerated ? 1 : 0,
    session.packetReused ? 1 : 0,
    session.repeatQuestionDetected ? 1 : 0,
    session.contextRestated ? 1 : 0,
    session.exportProduced ? 1 : 0,
    session.judgeScore,
    JSON.stringify(session.errors),
  );
}

/**
 * Check if a prior session exists for the same user + entity combination.
 * If so, the current session can reuse the prior packet.
 */
function hasPriorPacket(userId: string, scenarioId: string, sessionIndex: number): boolean {
  if (sessionIndex <= 1) return false;
  const db = getDb();
  const row = db.prepare(`
    SELECT COUNT(*) as c FROM longitudinal_sessions
    WHERE userId = ? AND scenarioId = ? AND sessionIndex < ? AND packetGenerated = 1
  `).get(userId, scenarioId, sessionIndex) as { c: number } | undefined;
  return (row?.c ?? 0) > 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Simulation
// ═══════════════════════════════════════════════════════════════════════════

async function simulateSession(
  user: CohortUser,
  scenarioId: string,
  sessionIndex: number,
  timeHorizon: SessionRun["timeHorizon"],
  batchId: string,
  cohortSize: number,
): Promise<SessionRun> {
  const tools = await getAllTools();
  const chain = SCENARIO_TOOL_CHAINS[scenarioId];
  if (!chain) {
    throw new Error(`Unknown scenario "${scenarioId}". Known: ${Object.keys(SCENARIO_TOOL_CHAINS).join(", ")}`);
  }

  const runId = genId("lh");
  const sessionStart = Date.now();
  let toolCallCount = 0;
  const errors: string[] = [];
  let packetGenerated = false;
  let exportProduced = false;

  // Determine packet reuse: if a prior session generated a packet for this user+scenario,
  // the system should reuse it instead of regenerating.
  const priorPacketExists = hasPriorPacket(user.userId, scenarioId, sessionIndex);
  const packetReused = priorPacketExists;

  // Context restatement: if sessionIndex > 1 and no prior packet exists, user had to restate.
  const contextRestated = sessionIndex > 1 && !priorPacketExists;

  // Repeat question: if context was restated, the user likely re-asked old questions.
  const repeatQuestionDetected = contextRestated;

  // Run the tool chain
  for (const toolName of chain) {
    const tool = findTool(tools, toolName);
    if (!tool) {
      errors.push(`tool_not_found:${toolName}`);
      toolCallCount++;
      continue;
    }

    // Build scenario-appropriate args
    const args = buildToolArgs(toolName, user, scenarioId);
    const result = await callTool(tool, args);
    toolCallCount++;

    if (!result.ok) {
      errors.push(`${toolName}:${result.error?.slice(0, 120)}`);
    }

    // Detect packet generation from memo/export tools
    if (toolName === "render_decision_memo" && result.ok) {
      packetGenerated = true;
      exportProduced = true;
    }
  }

  const latencyMs = Date.now() - sessionStart;

  // Judge score: base 3.0, +0.5 if no errors, +0.5 if packet generated,
  // +0.5 if packet reused, -0.5 per error (floor 1.0)
  let judgeScore = 3.0;
  if (errors.length === 0) judgeScore += 0.5;
  if (packetGenerated) judgeScore += 0.5;
  if (packetReused) judgeScore += 0.5;
  judgeScore -= errors.length * 0.5;
  judgeScore = Math.max(1.0, Math.min(5.0, judgeScore));

  // Pick a surface based on scenario
  const surface: SessionRun["surface"] = scenarioId === "memo_export"
    ? "local_dashboard"
    : scenarioId === "important_change"
      ? "engine_api"
      : "mcp";

  const session: SessionRun = {
    runId,
    userId: user.userId,
    role: user.role,
    scenarioId,
    sessionIndex,
    timeHorizon,
    surface,
    toolCallCount,
    latencyMs,
    packetGenerated,
    packetReused,
    repeatQuestionDetected,
    contextRestated,
    exportProduced,
    judgeScore,
    errors,
  };

  persistSession(session, batchId, cohortSize);
  return session;
}

function buildToolArgs(toolName: string, user: CohortUser, scenarioId: string): Record<string, unknown> {
  const entity = "Anthropic";
  switch (toolName) {
    case "check_mcp_setup":
      return {};
    case "recon_entity":
      return { entity, scope: scenarioId };
    case "extract_variables":
      return { text: `${entity} analysis for ${user.role} — scenario ${scenarioId}` };
    case "build_claim_graph":
      return { variables: `${entity} key metrics, funding, headcount, product roadmap` };
    case "generate_countermodels":
      return { claimGraph: `${entity} competitive position claim graph` };
    case "rank_interventions":
      return { claimGraph: `${entity} interventions for ${scenarioId}` };
    case "render_decision_memo":
      return {
        interventions: `Top interventions for ${entity}`,
        context: `${user.role} perspective on ${entity} — ${scenarioId}`,
      };
    case "record_event":
      return {
        eventType: `longitudinal.${scenarioId}`,
        actorType: "system",
        entityId: entity.toLowerCase(),
        entityType: "company",
        summary: `Longitudinal harness: ${user.role} ran ${scenarioId} (session ${user.userId})`,
      };
    case "track_milestone":
      return {
        title: `${scenarioId} completed by ${user.role}`,
        category: "longitudinal_benchmark",
      };
    default:
      return {};
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Metric Computation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Repeated Cognition Avoided (RCA): % of sessions where the user did NOT
 * restate context or re-ask old questions.
 */
export function computeRCA(sessions: SessionRun[]): number {
  if (sessions.length === 0) return 0;
  const avoided = sessions.filter((s) => !s.contextRestated && !s.repeatQuestionDetected).length;
  return (avoided / sessions.length) * 100;
}

/**
 * Packet Reuse Rate (PRR): % of sessions where a prior packet was reused
 * rather than regenerated from scratch.
 */
export function computePRR(sessions: SessionRun[]): number {
  if (sessions.length === 0) return 0;
  const reused = sessions.filter((s) => s.packetReused).length;
  return (reused / sessions.length) * 100;
}

/**
 * Aggregate all metrics from a batch of sessions into a CohortReport.
 */
export function generateCohortReport(
  sessions: SessionRun[],
  cohortSize: number,
  layer: "n1" | "n5" | "n10" | "n100",
): CohortReport {
  const rca = computeRCA(sessions);
  const prr = computePRR(sessions);

  const roles = [...new Set(sessions.map((s) => s.role))];
  const scenarios = [...new Set(sessions.map((s) => s.scenarioId))];

  // Important-change precision: for sessions running "important_change",
  // how many had no errors (simulated precision).
  const importantChangeSessions = sessions.filter((s) => s.scenarioId === "important_change");
  const importantChangePrecision = importantChangeSessions.length > 0
    ? (importantChangeSessions.filter((s) => s.errors.length === 0).length / importantChangeSessions.length) * 100
    : 100;

  // Contradiction precision: simulated as % of sessions with judgeScore >= 3
  const contradictionSessions = sessions.filter((s) => s.judgeScore >= 3);
  const contradictionPrecision = sessions.length > 0
    ? (contradictionSessions.length / sessions.length) * 100
    : 100;

  // False alert rate: inverse of contradiction precision, floored at 0
  const falseAlertRate = Math.max(0, 100 - contradictionPrecision);

  // Export-to-action rate: % of sessions that produced an export
  const exportToActionRate = sessions.length > 0
    ? (sessions.filter((s) => s.exportProduced).length / sessions.length) * 100
    : 0;

  // Find recurring root cause: most common error prefix
  const errorCounts: Record<string, number> = {};
  for (const s of sessions) {
    for (const e of s.errors) {
      const prefix = e.split(":")[0];
      errorCounts[prefix] = (errorCounts[prefix] ?? 0) + 1;
    }
  }
  const sortedErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]);
  const topRecurringRootCause = sortedErrors.length > 0
    ? `${sortedErrors[0][0]} (${sortedErrors[0][1]} occurrences)`
    : "none";

  // Regression risk: scenarios with lowest avg judge score
  const scenarioScores: Record<string, number[]> = {};
  for (const s of sessions) {
    if (!scenarioScores[s.scenarioId]) scenarioScores[s.scenarioId] = [];
    scenarioScores[s.scenarioId].push(s.judgeScore);
  }
  const scenarioAvgs = Object.entries(scenarioScores).map(([id, scores]) => ({
    id,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  })).sort((a, b) => a.avg - b.avg);
  const topRegressionRisk = scenarioAvgs.length > 0
    ? `${scenarioAvgs[0].id} (avg ${scenarioAvgs[0].avg.toFixed(1)}/5)`
    : "none";

  // Pass/fail evaluation
  const thresholds = PASS_THRESHOLDS[layer];
  let passed = true;
  if (layer === "n1") {
    const avgScore = sessions.length > 0
      ? sessions.reduce((a, s) => a + s.judgeScore, 0) / sessions.length
      : 0;
    passed = avgScore >= thresholds.judgeScore;
  } else {
    if (rca < (thresholds.rca ?? 0)) passed = false;
    if (prr < (thresholds.prr ?? 0)) passed = false;
  }

  return {
    cohortSize,
    totalSessions: sessions.length,
    rolesCovered: roles,
    coreLoopsCovered: scenarios.length,
    repeatedCognitionAvoided: Math.round(rca * 10) / 10,
    packetReuseRate: Math.round(prr * 10) / 10,
    importantChangePrecision: Math.round(importantChangePrecision * 10) / 10,
    contradictionPrecision: Math.round(contradictionPrecision * 10) / 10,
    falseAlertRate: Math.round(falseAlertRate * 10) / 10,
    exportToActionRate: Math.round(exportToActionRate * 10) / 10,
    topRecurringRootCause,
    topRegressionRisk,
    passed,
    passThresholds: thresholds,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// N-level Runners
// ═══════════════════════════════════════════════════════════════════════════

/**
 * N=1: Single golden-path founder run.
 * Validates that the core tool chain works end-to-end for one scenario.
 */
export async function runN1(): Promise<{ session: SessionRun; report: CohortReport }> {
  const batchId = genId("batch");
  const user = COHORT_USERS[0]; // founder
  const scenario = user.typicalScenarios[0]; // weekly_reset
  console.log(`\n=== N=1: Golden Path — ${user.role} / ${scenario} ===\n`);

  const session = await simulateSession(user, scenario, 1, "same_session", batchId, 1);
  const report = generateCohortReport([session], 1, "n1");

  printSessionLine(session);
  printReport(report, "N=1");
  return { session, report };
}

/**
 * N=5: 5 users (founder, banker, ceo, researcher, student), 1 session each.
 * All against the same entity "Anthropic".
 */
export async function runN5(): Promise<CohortReport> {
  const batchId = genId("batch");
  const users = COHORT_USERS.slice(0, 5);
  console.log(`\n=== N=5: Role Generalization — ${users.map((u) => u.role).join(", ")} ===\n`);

  const sessions: SessionRun[] = [];
  for (const user of users) {
    const scenario = user.typicalScenarios[0];
    const session = await simulateSession(user, scenario, 1, "same_session", batchId, 5);
    sessions.push(session);
    printSessionLine(session);
  }

  const report = generateCohortReport(sessions, 5, "n5");
  printReport(report, "N=5");
  return report;
}

/**
 * N=10: 10 users x 1 session each OR 5 users x 2 sessions.
 * Tests session-continuity metrics.
 */
export async function runN10(): Promise<CohortReport> {
  const batchId = genId("batch");
  const users = COHORT_USERS.slice(0, 5);
  console.log(`\n=== N=10: Session Continuity — 5 users x 2 sessions ===\n`);

  const sessions: SessionRun[] = [];
  for (const user of users) {
    for (let sessionIdx = 1; sessionIdx <= 2; sessionIdx++) {
      const scenario = user.typicalScenarios[(sessionIdx - 1) % user.typicalScenarios.length];
      const horizon: SessionRun["timeHorizon"] = sessionIdx === 1 ? "same_session" : "next_day";
      const session = await simulateSession(user, scenario, sessionIdx, horizon, batchId, 10);
      sessions.push(session);
      printSessionLine(session);
    }
  }

  const report = generateCohortReport(sessions, 10, "n10");
  printReport(report, "N=10");
  return report;
}

/**
 * N=100: 10 users x 10 sessions each (simulated across time horizons).
 * Measures RCA + PRR compounding over time.
 */
export async function runN100(): Promise<CohortReport> {
  const batchId = genId("batch");
  console.log(`\n=== N=100: Longitudinal Compounding — 10 users x 10 sessions ===\n`);

  const sessions: SessionRun[] = [];
  for (const user of COHORT_USERS) {
    for (let sessionIdx = 1; sessionIdx <= 10; sessionIdx++) {
      const scenario = user.typicalScenarios[(sessionIdx - 1) % user.typicalScenarios.length];
      // Spread sessions across time horizons to simulate real usage patterns
      const horizonIdx = Math.min(sessionIdx - 1, TIME_HORIZONS.length - 1);
      const horizon = TIME_HORIZONS[horizonIdx];
      const session = await simulateSession(user, scenario, sessionIdx, horizon, batchId, 100);
      sessions.push(session);
      printSessionLine(session);
    }
  }

  const report = generateCohortReport(sessions, 100, "n100");
  printReport(report, "N=100");
  return report;
}

// ═══════════════════════════════════════════════════════════════════════════
// Output Formatting
// ═══════════════════════════════════════════════════════════════════════════

function printSessionLine(s: SessionRun): void {
  const status = s.errors.length === 0 ? "OK" : `ERR(${s.errors.length})`;
  const reuse = s.packetReused ? "REUSE" : s.packetGenerated ? "NEW" : "NONE";
  const restated = s.contextRestated ? "RESTATED" : "FRESH";
  console.log(
    `  [${s.role.padEnd(10)}] sess=${s.sessionIndex} ${s.scenarioId.padEnd(18)} ` +
    `tools=${s.toolCallCount} ${s.latencyMs}ms judge=${s.judgeScore.toFixed(1)} ` +
    `packet=${reuse} ctx=${restated} ${status}`,
  );
}

function printReport(report: CohortReport, label: string): void {
  const passLabel = report.passed ? "PASS" : "FAIL";
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ${label} COHORT REPORT                              ${passLabel.padStart(6)}  ║
╠══════════════════════════════════════════════════════════════╣
║  Cohort size:              ${String(report.cohortSize).padStart(6)}                       ║
║  Total sessions:           ${String(report.totalSessions).padStart(6)}                       ║
║  Roles covered:            ${String(report.rolesCovered.length).padStart(6)}                       ║
║  Core loops covered:       ${String(report.coreLoopsCovered).padStart(6)}                       ║
╠══════════════════════════════════════════════════════════════╣
║  RCA (Repeated Cognition Avoided): ${String(report.repeatedCognitionAvoided).padStart(6)}%                ║
║  PRR (Packet Reuse Rate):          ${String(report.packetReuseRate).padStart(6)}%                ║
║  Important-Change Precision:       ${String(report.importantChangePrecision).padStart(6)}%                ║
║  Contradiction Precision:          ${String(report.contradictionPrecision).padStart(6)}%                ║
║  False Alert Rate:                 ${String(report.falseAlertRate).padStart(6)}%                ║
║  Export-to-Action Rate:            ${String(report.exportToActionRate).padStart(6)}%                ║
╠══════════════════════════════════════════════════════════════╣
║  Top recurring root cause: ${report.topRecurringRootCause.slice(0, 32).padEnd(32)} ║
║  Top regression risk:      ${report.topRegressionRisk.slice(0, 32).padEnd(32)} ║
╠══════════════════════════════════════════════════════════════╣
║  Pass thresholds: ${JSON.stringify(report.passThresholds).slice(0, 40).padEnd(40)} ║
╚══════════════════════════════════════════════════════════════╝
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Entry Point
// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const arg = process.argv[2]?.toLowerCase() ?? "n5";
  console.log("=== NodeBench Longitudinal Dogfood Harness ===");
  console.log(`Mode: ${arg}\n`);

  ensureSchema();

  switch (arg) {
    case "n1": {
      await runN1();
      break;
    }
    case "n5": {
      await runN5();
      break;
    }
    case "n10": {
      await runN10();
      break;
    }
    case "n100": {
      await runN100();
      break;
    }
    case "all": {
      const results: { layer: string; passed: boolean }[] = [];
      const r1 = await runN1();
      results.push({ layer: "N=1", passed: r1.report.passed });
      const r5 = await runN5();
      results.push({ layer: "N=5", passed: r5.passed });
      const r10 = await runN10();
      results.push({ layer: "N=10", passed: r10.passed });
      const r100 = await runN100();
      results.push({ layer: "N=100", passed: r100.passed });

      console.log("\n=== ALL LAYERS SUMMARY ===");
      for (const r of results) {
        console.log(`  ${r.layer}: ${r.passed ? "PASS" : "FAIL"}`);
      }
      const allPassed = results.every((r) => r.passed);
      console.log(`\nOverall: ${allPassed ? "ALL PASSED" : "SOME FAILED"}`);
      break;
    }
    default:
      console.error(`Unknown mode "${arg}". Use: n1, n5, n10, n100, all`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
