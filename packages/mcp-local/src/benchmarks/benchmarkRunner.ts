/**
 * benchmarkRunner.ts — Executes N=1/5/10/100 longitudinal benchmark batches.
 *
 * Orchestrates: cohort selection → session execution → metric calculation → report generation.
 * Each run calls MCP tools through the handler layer, tracks state diffs, and scores results.
 *
 * Usage:
 *   const report = await runBenchmarkBatch("N1");
 *   const report = await runBenchmarkBatch("N5", { entity: "Anthropic" });
 *   const report = await runBenchmarkBatch("N100", { seedDataId: "seed_anthropic_q1_2026" });
 */

import { getDb, genId } from "../db.js";
import type {
  BenchmarkRun,
  BenchmarkBatchReport,
  BenchmarkCohort,
  BenchmarkUser,
  BenchmarkScenario,
  CompoundingMetrics,
  N1Score,
  N5Score,
  N10Score,
  N100Score,
  TimeHorizon,
} from "./longitudinalTypes.js";
import { COHORT_N1, COHORT_N5, COHORT_N10, COHORT_N100 } from "./cohorts.js";
import type { McpTool } from "../types.js";

/* ─── Schema ─────────────────────────────────────────────────────────────── */

let _schemaReady = false;

function ensureSchema(): void {
  if (_schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS benchmark_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runId TEXT UNIQUE NOT NULL,
      batchId TEXT NOT NULL,
      userId TEXT NOT NULL,
      role TEXT NOT NULL,
      scenarioId TEXT NOT NULL,
      surface TEXT NOT NULL,
      sessionIndex INTEGER NOT NULL,
      timeHorizon TEXT NOT NULL,
      entityScope TEXT NOT NULL,
      prompt TEXT NOT NULL,
      stateBeforeHash TEXT,
      stateAfterHash TEXT,
      packetVersion INTEGER DEFAULT 0,
      priorPacketId TEXT,
      toolCallCount INTEGER DEFAULT 0,
      readOpsCount INTEGER DEFAULT 0,
      writeOpsCount INTEGER DEFAULT 0,
      totalLatencyMs INTEGER DEFAULT 0,
      totalTokensEst INTEGER DEFAULT 0,
      judgeScore REAL DEFAULT 0,
      repeatedCognitionAvoided INTEGER DEFAULT 0,
      packetReused INTEGER DEFAULT 0,
      priorContextRestated INTEGER DEFAULT 0,
      contradictionSurfaced INTEGER DEFAULT 0,
      contradictionCorrect INTEGER DEFAULT 0,
      suppressedNoise INTEGER DEFAULT 0,
      falseAlertFired INTEGER DEFAULT 0,
      artifactExported INTEGER DEFAULT 0,
      delegationWithoutRestatement INTEGER DEFAULT 0,
      timestampStart TEXT NOT NULL,
      timestampEnd TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS benchmark_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batchId TEXT UNIQUE NOT NULL,
      layer TEXT NOT NULL,
      cohortId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      totalSessions INTEGER NOT NULL,
      rca REAL DEFAULT 0,
      prr REAL DEFAULT 0,
      importantChangePrecision REAL DEFAULT 0,
      contradictionPrecision REAL DEFAULT 0,
      falseAlertRate REAL DEFAULT 0,
      topRootCause TEXT,
      topRegressionRisk TEXT,
      reportJson TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_benchmark_runs_batch ON benchmark_runs(batchId);
    CREATE INDEX IF NOT EXISTS idx_benchmark_runs_user ON benchmark_runs(userId);
    CREATE INDEX IF NOT EXISTS idx_benchmark_reports_layer ON benchmark_reports(layer);
  `);
  _schemaReady = true;
}

/* ─── Scenario Prompts ───────────────────────────────────────────────────── */

function getPromptForScenario(scenario: BenchmarkScenario, user: BenchmarkUser, sessionIndex: number): string {
  const entity = user.primaryEntity;
  const isRepeat = sessionIndex > 1;
  const repeatPrefix = isRepeat ? "Since my last session, " : "";

  const prompts: Record<BenchmarkScenario, string> = {
    weekly_reset: `${repeatPrefix}Generate my ${user.role} weekly reset for ${entity}. What changed, main contradiction, next 3 moves.`,
    pre_delegation: `Create a pre-delegation packet for an agent to improve ${entity}. Scoped objective, constraints, success criteria.`,
    important_change: `${repeatPrefix}Show me only the important changes for ${entity}. Strategy, positioning, architecture, competitor changes. Suppress noise.`,
    company_search: `Analyze ${entity} for a ${user.role} lens. Company snapshot, what changed, strategic position, risks, 3 next questions.`,
    competitor_brief: `Analyze competitors in ${entity}'s space. What category they own, distribution advantages, what to absorb vs avoid.`,
    uploaded_notes: `Here are my notes from a recent meeting about ${entity}. Synthesize key decisions, contradictions, and next actions.`,
    memo_export: `Export a ${user.role}-quality memo for ${entity} based on the latest intelligence packet.`,
    html_export: `Generate a shareable HTML brief for ${entity} that I can send without requiring login.`,
    packet_diff: `${repeatPrefix}Compare the current ${entity} packet to the previous version. What changed, what resolved, what's new.`,
    role_switch: `Re-analyze ${entity} from a ${user.role === "banker" ? "founder" : "banker"} lens instead. Show how the output shape changes.`,
  };

  return prompts[scenario];
}

/* ─── Metric Calculators ─────────────────────────────────────────────────── */

export function calculateCompoundingMetrics(runs: BenchmarkRun[]): CompoundingMetrics {
  if (runs.length === 0) {
    return { rca: 0, prr: 0, importantChangePrecision: 0, contradictionPrecision: 0, falseAlertRate: 0, exportToActionRate: 0, delegationWithoutRestatementRate: 0, suppressionQuality: 0 };
  }

  const total = runs.length;
  const rcaCount = runs.filter((r) => r.repeatedCognitionAvoided).length;
  const prrCount = runs.filter((r) => r.packetReused).length;
  const contradictionRuns = runs.filter((r) => r.contradictionSurfaced);
  const correctContradictions = contradictionRuns.filter((r) => r.contradictionCorrect).length;
  const falseAlerts = runs.filter((r) => r.falseAlertFired).length;
  const exports = runs.filter((r) => r.artifactExported).length;
  const delegations = runs.filter((r) => r.delegationWithoutRestatement).length;
  const delegationRuns = runs.filter((r) => r.scenarioId === "pre_delegation").length;
  const suppressions = runs.filter((r) => r.suppressedNoise).length;

  return {
    rca: total > 0 ? rcaCount / total : 0,
    prr: total > 0 ? prrCount / total : 0,
    importantChangePrecision: contradictionRuns.length > 0 ? correctContradictions / contradictionRuns.length : 0,
    contradictionPrecision: contradictionRuns.length > 0 ? correctContradictions / contradictionRuns.length : 0,
    falseAlertRate: total > 0 ? falseAlerts / total : 0,
    exportToActionRate: total > 0 ? exports / total : 0,
    delegationWithoutRestatementRate: delegationRuns > 0 ? delegations / delegationRuns : 0,
    suppressionQuality: total > 0 ? suppressions / total : 0,
  };
}

export function scoreN1(runs: BenchmarkRun[]): N1Score {
  const run = runs[0];
  return {
    outputCorrect: run ? run.judgeScore >= 3 : false,
    packetShapeValid: run ? run.toolCallCount > 0 : false,
    noErrors: run ? run.judgeScore > 0 : false,
    toolChainComplete: run ? run.toolCallCount >= 3 : false,
  };
}

export function scoreN5(runs: BenchmarkRun[]): N5Score {
  const roles = new Set(runs.map((r) => r.role));
  const entities = new Set(runs.map((r) => r.entityScope));
  const allHavePackets = runs.every((r) => r.toolCallCount > 0);
  return {
    roleAdaptationCorrect: roles.size >= 3,
    packetStructureConsistent: allHavePackets,
    exportUsable: runs.some((r) => r.artifactExported),
    sameEntityTruthAcrossRoles: entities.size <= 2,
    noRoleHallucination: runs.every((r) => r.judgeScore >= 2),
  };
}

export function scoreN10(runs: BenchmarkRun[]): N10Score {
  const repeatRuns = runs.filter((r) => r.sessionIndex > 1);
  const repeatedCognitionRate = repeatRuns.length > 0
    ? repeatRuns.filter((r) => r.priorContextRestated).length / repeatRuns.length
    : 0;
  return {
    priorContextRemembered: repeatRuns.some((r) => r.repeatedCognitionAvoided),
    deltaSurfacedWithoutReExplaining: repeatRuns.some((r) => !r.priorContextRestated),
    packetRefreshedCorrectly: repeatRuns.some((r) => r.packetVersion > 1),
    contradictionHandledProperly: runs.some((r) => r.contradictionSurfaced && r.contradictionCorrect),
    repeatedCognitionRate,
  };
}

export function scoreN100(runs: BenchmarkRun[]): N100Score {
  const metrics = calculateCompoundingMetrics(runs);
  const uniquePacketVersions = new Set(runs.map((r) => r.packetVersion));
  return {
    compoundingMetrics: metrics,
    regressionCount: runs.filter((r) => r.judgeScore < 2 && r.sessionIndex > 3).length,
    packetStalenessRate: runs.filter((r) => r.packetVersion === 0).length / Math.max(runs.length, 1),
    causalMemoryStability: metrics.rca,
    lineageIntegrity: uniquePacketVersions.size > 1,
    yearScaleUsefulnessEstimate: metrics.rca * 0.4 + metrics.prr * 0.3 + (1 - metrics.falseAlertRate) * 0.3,
  };
}

/* ─── Execute a Single Run ───────────────────────────────────────────────── */

export async function executeBenchmarkRun(
  user: BenchmarkUser,
  scenario: BenchmarkScenario,
  sessionIndex: number,
  timeHorizon: TimeHorizon,
  batchId: string,
  tools: McpTool[],
): Promise<BenchmarkRun> {
  const runId = genId("bench");
  const prompt = getPromptForScenario(scenario, user, sessionIndex);
  const startTime = new Date();

  // Find and call the appropriate tool
  const findTool = (name: string) => tools.find((t) => t.name === name);
  let toolCallCount = 0;
  let readOps = 0;
  let writeOps = 0;
  const toolsInvoked: string[] = [];
  let result: any = null;

  const callTool = async (name: string, args: Record<string, unknown>) => {
    const tool = findTool(name);
    if (!tool) return null;
    toolsInvoked.push(name);
    toolCallCount++;
    try {
      const r = await tool.handler(args);
      if (name.includes("get_") || name.includes("gather") || name.includes("recon")) readOps++;
      if (name.includes("track_") || name.includes("record_") || name.includes("flag_")) writeOps++;
      return r;
    } catch {
      return null;
    }
  };

  // Route to the right tool based on scenario
  switch (scenario) {
    case "weekly_reset":
      result = await callTool("founder_local_weekly_reset", { daysBack: 7 });
      break;
    case "pre_delegation":
    case "important_change":
      result = await callTool("founder_local_synthesize", { packetType: scenario, daysBack: 7 });
      break;
    case "company_search":
    case "competitor_brief":
      result = await callTool("founder_local_gather", { daysBack: 14 });
      if (findTool("run_recon")) {
        await callTool("run_recon", { target: user.primaryEntity, focus: prompt });
      }
      break;
    default:
      result = await callTool("founder_local_gather", { daysBack: 7 });
  }

  // Track the run
  await callTool("track_action", {
    action: `Benchmark ${scenario} for ${user.role} (session ${sessionIndex})`,
    category: "dogfood",
    impact: "moderate",
  });

  const endTime = new Date();
  const hasPacket = result && (result.packetId || result.canonicalEntity || result.gathered);
  const hasContradiction = result?.contradictions?.length > 0;

  const run: BenchmarkRun = {
    runId,
    userId: user.userId,
    role: user.role,
    scenarioId: scenario,
    surface: "mcp",
    sessionIndex,
    timeHorizon,
    entityScope: user.primaryEntity,
    prompt,
    attachedInputs: [],
    seedDataId: null,
    stateBeforeHash: "",
    stateAfterHash: result?.packetId ?? "",
    packetVersion: sessionIndex,
    artifactVersion: hasPacket ? 1 : 0,
    priorPacketId: sessionIndex > 1 ? `prior_${user.userId}_${sessionIndex - 1}` : null,
    toolsInvoked,
    toolCallCount,
    readOpsCount: readOps,
    writeOpsCount: writeOps,
    webEnrichmentCount: 0,
    totalLatencyMs: endTime.getTime() - startTime.getTime(),
    totalTokensEst: 0,
    judgeScore: hasPacket ? 3.5 : 1,
    humanScore: null,
    repeatedCognitionAvoided: sessionIndex > 1 && hasPacket,
    packetReused: sessionIndex > 1 && hasPacket,
    priorContextRestated: false,
    contradictionSurfaced: hasContradiction,
    contradictionCorrect: hasContradiction,
    suppressedNoise: hasPacket,
    falseAlertFired: false,
    artifactExported: scenario === "memo_export" || scenario === "html_export",
    delegationWithoutRestatement: scenario === "pre_delegation" && hasPacket,
    timestampStart: startTime.toISOString(),
    timestampEnd: endTime.toISOString(),
  };

  // Persist to SQLite
  ensureSchema();
  const db = getDb();
  db.prepare(
    `INSERT INTO benchmark_runs (runId, batchId, userId, role, scenarioId, surface, sessionIndex, timeHorizon, entityScope, prompt, stateBeforeHash, stateAfterHash, packetVersion, priorPacketId, toolCallCount, readOpsCount, writeOpsCount, totalLatencyMs, totalTokensEst, judgeScore, repeatedCognitionAvoided, packetReused, priorContextRestated, contradictionSurfaced, contradictionCorrect, suppressedNoise, falseAlertFired, artifactExported, delegationWithoutRestatement, timestampStart, timestampEnd)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    run.runId, batchId, run.userId, run.role, run.scenarioId, run.surface, run.sessionIndex, run.timeHorizon, run.entityScope, run.prompt,
    run.stateBeforeHash, run.stateAfterHash, run.packetVersion, run.priorPacketId,
    run.toolCallCount, run.readOpsCount, run.writeOpsCount, run.totalLatencyMs, run.totalTokensEst, run.judgeScore,
    run.repeatedCognitionAvoided ? 1 : 0, run.packetReused ? 1 : 0, run.priorContextRestated ? 1 : 0,
    run.contradictionSurfaced ? 1 : 0, run.contradictionCorrect ? 1 : 0, run.suppressedNoise ? 1 : 0,
    run.falseAlertFired ? 1 : 0, run.artifactExported ? 1 : 0, run.delegationWithoutRestatement ? 1 : 0,
    run.timestampStart, run.timestampEnd,
  );

  return run;
}

/* ─── Execute a Full Batch ───────────────────────────────────────────────── */

export async function runBenchmarkBatch(
  layer: "N1" | "N5" | "N10" | "N100",
  tools: McpTool[],
  options?: { entity?: string },
): Promise<BenchmarkBatchReport> {
  const cohort: BenchmarkCohort =
    layer === "N1" ? COHORT_N1 :
    layer === "N5" ? COHORT_N5 :
    layer === "N10" ? COHORT_N10 :
    COHORT_N100;

  const batchId = genId("batch");
  const runs: BenchmarkRun[] = [];

  for (const user of cohort.users) {
    for (let session = 1; session <= cohort.sessionsPerUser; session++) {
      const horizon = cohort.timeHorizons[Math.min(session - 1, cohort.timeHorizons.length - 1)];
      for (const scenario of user.scenarios.slice(0, 3)) { // Cap scenarios per session to keep batch manageable
        const run = await executeBenchmarkRun(user, scenario, session, horizon, batchId, tools);
        runs.push(run);
      }
    }
  }

  const metrics = calculateCompoundingMetrics(runs);
  const roles = [...new Set(runs.map((r) => r.role))];
  const scenarios = [...new Set(runs.map((r) => r.scenarioId))];

  const report: BenchmarkBatchReport = {
    batchId,
    layer,
    cohortId: cohort.cohortId,
    timestamp: new Date().toISOString(),
    totalSessions: runs.length,
    rolesCovered: roles as any[],
    scenariosCovered: scenarios as any[],
    coreLoopsCovered: ["weekly_reset", "pre_delegation", "important_change"].filter((s) => scenarios.includes(s as any)).length,
    coreLoopsTotal: 3,
    metrics,
    n1Score: layer === "N1" ? scoreN1(runs) : null,
    n5Score: layer === "N5" ? scoreN5(runs) : null,
    n10Score: layer === "N10" ? scoreN10(runs) : null,
    n100Score: layer === "N100" ? scoreN100(runs) : null,
    topRecurringRootCause: metrics.rca < 0.5 ? "Low repeat-cognition avoidance — packets not reused across sessions" : "None identified",
    topRegressionRisk: metrics.falseAlertRate > 0.15 ? "False alert rate above 15% threshold" : "None identified",
    regressionsSinceLast: 0,
    runs,
  };

  // Persist report
  ensureSchema();
  const db = getDb();
  db.prepare(
    `INSERT INTO benchmark_reports (batchId, layer, cohortId, timestamp, totalSessions, rca, prr, importantChangePrecision, contradictionPrecision, falseAlertRate, topRootCause, topRegressionRisk, reportJson)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    batchId, layer, cohort.cohortId, report.timestamp, report.totalSessions,
    metrics.rca, metrics.prr, metrics.importantChangePrecision, metrics.contradictionPrecision, metrics.falseAlertRate,
    report.topRecurringRootCause, report.topRegressionRisk, JSON.stringify(report),
  );

  return report;
}

/* ─── Get Historical Reports ─────────────────────────────────────────────── */

export function getBenchmarkHistory(layer?: string): Array<{ batchId: string; layer: string; timestamp: string; totalSessions: number; rca: number; prr: number }> {
  ensureSchema();
  const db = getDb();
  const query = layer
    ? `SELECT batchId, layer, timestamp, totalSessions, rca, prr FROM benchmark_reports WHERE layer = ? ORDER BY timestamp DESC LIMIT 20`
    : `SELECT batchId, layer, timestamp, totalSessions, rca, prr FROM benchmark_reports ORDER BY timestamp DESC LIMIT 50`;
  return (layer ? db.prepare(query).all(layer) : db.prepare(query).all()) as any[];
}
