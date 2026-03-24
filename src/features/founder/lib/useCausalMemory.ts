/**
 * useCausalMemory — Phase 10 data hook
 *
 * Provides trajectory scores, event ledger, state diffs, time rollups,
 * packet/memo versions, and important changes.
 *
 * Pattern: Convex queries when authenticated, demo fixtures for guest mode.
 * Mirrors the useFounderPersistence() pattern from founderPersistence.ts.
 */

import { useMemo } from "react";

// ── Demo trajectory scores (30 days) ──────────────────────────────────

function generateDemoTrajectoryScores() {
  return Array.from({ length: 30 }, (_, i) => {
    const base = 0.55 + Math.sin(i / 5) * 0.1 + i * 0.005;
    return {
      date: new Date(Date.now() - (29 - i) * 86_400_000).toISOString().slice(0, 10),
      overallScore: Math.min(1, Math.max(0, base)),
      dimensions: {
        identityClarity: Math.min(1, 0.7 + Math.sin(i / 3) * 0.15),
        executionVelocity: Math.min(1, 0.5 + Math.sin(i / 4) * 0.2 + i * 0.005),
        agentAlignment: Math.min(1, 0.8 + Math.sin(i / 6) * 0.1),
        signalStrength: Math.min(1, 0.4 + Math.sin(i / 2) * 0.15 + i * 0.008),
        interventionEffectiveness: Math.min(1, 0.45 + Math.sin(i / 5) * 0.15 + i * 0.003),
        contradictionLoad: Math.min(1, 0.6 + Math.sin(i / 7) * 0.2),
        confidenceTrend: Math.min(1, 0.5 + Math.sin(i / 4) * 0.1 + i * 0.004),
      },
      slopeVsPriorDay: (Math.sin(i) - 0.3) * 0.05,
    };
  });
}

// ── Demo events ───────────────────────────────────────────────────────

function generateDemoEvents() {
  return [
    { id: "e1", eventType: "initiative.status_changed", actorType: "founder", entityType: "initiative", entityLabel: "MCP Distribution Push", summary: "Changed status from 'active' to 'completed'", createdAt: Date.now() - 3_600_000 },
    { id: "e2", eventType: "packet.generated", actorType: "system", entityType: "packet", entityLabel: "Artifact Packet v4", summary: "Auto-generated daily packet with 12 evidence sources", createdAt: Date.now() - 7_200_000 },
    { id: "e3", eventType: "contradiction.detected", actorType: "background_job", entityType: "company", entityLabel: "NodeBench AI", summary: "Wedge-initiative alignment dropped to 42%", createdAt: Date.now() - 10_800_000 },
    { id: "e4", eventType: "intervention.completed", actorType: "agent", entityType: "intervention", entityLabel: "Glass Card Contrast Fix", summary: "Completed with positive outcome — all cards visible", createdAt: Date.now() - 14_400_000 },
    { id: "e5", eventType: "agent.drift_detected", actorType: "system", entityType: "agent", entityLabel: "Claude Code Agent", summary: "Heartbeat lost for 45 minutes", createdAt: Date.now() - 18_000_000 },
    { id: "e6", eventType: "signal.ingested", actorType: "system", entityType: "signal", entityLabel: "MCP Registry Launch", summary: "New market signal: MCP Registry opened for public submissions", createdAt: Date.now() - 21_600_000 },
    { id: "e7", eventType: "decision.accepted", actorType: "founder", entityType: "decision", entityLabel: "Pivot to Founder DNA", summary: "Accepted strategic pivot from QA tool to founder operating memory", createdAt: Date.now() - 43_200_000 },
    { id: "e8", eventType: "memo.shared", actorType: "founder", entityType: "memo", entityLabel: "Weekly Investor Update", summary: "Shared via URL with 3 investors", createdAt: Date.now() - 86_400_000 },
    { id: "e9", eventType: "state.snapshot_taken", actorType: "background_job", entityType: "company", entityLabel: "NodeBench AI", summary: "Daily context snapshot generated", createdAt: Date.now() - 90_000_000 },
    { id: "e10", eventType: "intervention.suggested", actorType: "system", entityType: "intervention", entityLabel: "Mobile-first Agent Panel", summary: "Suggested based on usability scorecard gap", createdAt: Date.now() - 100_800_000 },
  ];
}

// ── Demo state diffs ──────────────────────────────────────────────────

function generateDemoDiffs() {
  return [
    {
      id: "d1", entityType: "company", entityLabel: "NodeBench AI", changeType: "identity",
      changedFields: ["canonicalMission", "wedge"],
      beforeState: { canonicalMission: "Operating Intelligence for Founders", wedge: "MCP tool quality scoring and agent trust" },
      afterState: { canonicalMission: "Entity Intelligence for Any Company, Market, or Question", wedge: "Local-first operating memory + entity context + artifact restructuring" },
      reason: "Strategic pivot based on founder DNA analysis", createdAt: Date.now() - 43_200_000,
    },
    {
      id: "d2", entityType: "initiative", entityLabel: "Glass Card Polish", changeType: "status",
      changedFields: ["status"],
      beforeState: { status: "active" }, afterState: { status: "completed" },
      reason: "All P0 contrast fixes verified on production", createdAt: Date.now() - 7_200_000,
    },
    {
      id: "d3", entityType: "initiative", entityLabel: "Phase 10 Build", changeType: "priority",
      changedFields: ["priorityScore", "riskLevel"],
      beforeState: { priorityScore: 7, riskLevel: "medium" }, afterState: { priorityScore: 9.5, riskLevel: "high" },
      reason: "Elevated after identifying causal memory as the critical missing layer", createdAt: Date.now() - 14_400_000,
    },
    {
      id: "d4", entityType: "agent", entityLabel: "Claude Code Agent", changeType: "status",
      changedFields: ["status"],
      beforeState: { status: "healthy" }, afterState: { status: "drifting" },
      reason: "Heartbeat lost for 45 minutes during active build sprint", createdAt: Date.now() - 18_000_000,
    },
  ];
}

// ── Demo path ─────────────────────────────────────────────────────────

function generateDemoPath() {
  return [
    { surfaceLabel: "Founder Dashboard", surfaceType: "view", durationMs: 45_000 },
    { surfaceLabel: "NodeBench AI (company)", surfaceType: "entity", durationMs: 12_000 },
    { surfaceLabel: "MCP Distribution Initiative", surfaceType: "entity", durationMs: 28_000 },
    { surfaceLabel: "Agent Brief", surfaceType: "view", durationMs: 8_000 },
    { surfaceLabel: "Claude Code Agent", surfaceType: "entity", durationMs: 15_000 },
    { surfaceLabel: "Artifact Packet v4", surfaceType: "artifact", durationMs: 35_000 },
    { surfaceLabel: "Export Center", surfaceType: "view", durationMs: 6_000 },
    { surfaceLabel: "Trajectory Timeline", surfaceType: "view", durationMs: 22_000 },
    { surfaceLabel: "Important Changes", surfaceType: "view", durationMs: 18_000 },
  ];
}

// ── Demo packet versions ──────────────────────────────────────────────

function generateDemoPacketVersions() {
  return [
    {
      id: "pv4", versionNumber: 4, audience: "founder", triggerType: "manual",
      inputSources: { evidenceCount: 12, signalCount: 8, initiativeIds: ["i1", "i2", "i3"], interventionIds: ["iv1", "iv2"] },
      changedSections: ["Company Truth", "What Changed", "Contradictions"],
      diffSummary: "Updated mission to 'Operating Intelligence for Founders'. Added 3 new signals. Resolved identity drift contradiction.",
      createdAt: Date.now() - 3_600_000,
    },
    {
      id: "pv3", versionNumber: 3, audience: "investor", triggerType: "scheduled",
      inputSources: { evidenceCount: 9, signalCount: 6, initiativeIds: ["i1", "i2"], interventionIds: ["iv1"] },
      changedSections: ["Next Moves", "Agent Activity"],
      diffSummary: "Added MCP distribution initiative. Updated agent status after heartbeat recovery.",
      createdAt: Date.now() - 86_400_000,
    },
    {
      id: "pv2", versionNumber: 2, audience: "agent", triggerType: "change_triggered",
      inputSources: { evidenceCount: 7, signalCount: 4, initiativeIds: ["i1"], interventionIds: [] },
      changedSections: ["Company Truth", "Interventions"],
      diffSummary: "Identity confidence dropped to 0.55. New contradiction flagged: wedge-initiative misalignment.",
      createdAt: Date.now() - 172_800_000,
    },
    {
      id: "pv1", versionNumber: 1, audience: "founder", triggerType: "manual",
      inputSources: { evidenceCount: 3, signalCount: 2, initiativeIds: ["i1"], interventionIds: [] },
      changedSections: [],
      diffSummary: "Initial packet generated from company setup.",
      createdAt: Date.now() - 345_600_000,
    },
  ];
}

// ── Demo memo versions ────────────────────────────────────────────────

function generateDemoMemoVersions() {
  return [
    {
      id: "mv3", versionNumber: 3, memoTitle: "Weekly Investor Update — W12", exportFormat: "shareable_url",
      sourcePacketVersion: 4,
      sharedWith: [
        { audience: "Investor A", method: "url", sharedAt: Date.now() - 1_800_000 },
        { audience: "Investor B", method: "email", sharedAt: Date.now() - 1_200_000 },
        { audience: "Advisory Board", method: "url", sharedAt: Date.now() - 600_000 },
      ],
      changedSections: ["Executive Summary", "Traction Metrics"],
      diffSummary: "Updated traction metrics with Phase 9 completion. Added deployment URL.",
      createdAt: Date.now() - 3_600_000,
    },
    {
      id: "mv2", versionNumber: 2, memoTitle: "Agent Brief — Claude Code", exportFormat: "agent_brief",
      sourcePacketVersion: 3,
      sharedWith: [
        { audience: "Claude Code Agent", method: "agent_handoff", sharedAt: Date.now() - 43_200_000 },
      ],
      changedSections: ["Context", "Goals"],
      diffSummary: "Updated goals to include Phase 10 causal memory build.",
      createdAt: Date.now() - 43_200_000,
    },
    {
      id: "mv1", versionNumber: 1, memoTitle: "Decision Memo — Pivot to Founder DNA", exportFormat: "markdown",
      sourcePacketVersion: 2, sharedWith: [], changedSections: [],
      diffSummary: "Initial memo capturing the strategic pivot decision.",
      createdAt: Date.now() - 172_800_000,
    },
  ];
}

// ── Demo important changes ────────────────────────────────────────────

function generateDemoChanges() {
  return [
    {
      id: "c1", changeCategory: "confidence_drop", impactScore: 0.75,
      impactReason: "Trajectory score dropped 8.2% in one day — largest single-day decline this quarter",
      affectedEntities: [{ entityType: "company", entityId: "co1", entityLabel: "NodeBench AI" }],
      shouldTriggerPacket: false, shouldTriggerBrief: true, shouldTriggerAlert: true,
      suggestedAction: "Review yesterday's changes: 3 initiatives were reprioritized and identity confidence shifted.",
      status: "detected" as const, createdAt: Date.now() - 1_800_000,
    },
    {
      id: "c2", changeCategory: "initiative_blocked", impactScore: 0.6,
      impactReason: "High-priority initiative blocked — MCP Registry submission depends on npm publish which is failing tests",
      affectedEntities: [
        { entityType: "initiative", entityId: "i1", entityLabel: "MCP Registry Publish" },
        { entityType: "initiative", entityId: "i2", entityLabel: "npm 2.33.0 Release" },
      ],
      shouldTriggerPacket: false, shouldTriggerBrief: true, shouldTriggerAlert: false,
      suggestedAction: "Fix test count assertion (307→315) and IR metrics threshold. Then retry npm publish.",
      status: "investigating" as const, createdAt: Date.now() - 7_200_000,
    },
    {
      id: "c3", changeCategory: "identity_drift", impactScore: 0.55,
      impactReason: "Wedge-initiative alignment at 42% — 3 of 7 active initiatives don't map to the declared wedge",
      affectedEntities: [
        { entityType: "company", entityId: "co1", entityLabel: "NodeBench AI" },
        { entityType: "initiative", entityId: "i3", entityLabel: "Demo Video Production" },
        { entityType: "initiative", entityId: "i4", entityLabel: "LinkedIn Pipeline" },
      ],
      shouldTriggerPacket: true, shouldTriggerBrief: true, shouldTriggerAlert: false,
      suggestedAction: "Either narrow the wedge to match current work, or reprioritize initiatives to match the wedge.",
      status: "acknowledged" as const, createdAt: Date.now() - 43_200_000,
    },
    {
      id: "c4", changeCategory: "agent_anomaly", impactScore: 0.4,
      impactReason: "Claude Code Agent heartbeat lost for 45 minutes during active build sprint",
      affectedEntities: [{ entityType: "agent", entityId: "a1", entityLabel: "Claude Code Agent" }],
      shouldTriggerPacket: false, shouldTriggerBrief: false, shouldTriggerAlert: true,
      suggestedAction: "Check agent connectivity and session state.",
      status: "resolved" as const, createdAt: Date.now() - 86_400_000,
    },
    {
      id: "c5", changeCategory: "signal_spike", impactScore: 0.5,
      impactReason: "Signal volume spiked: 12 signals in 15 min — MCP ecosystem activity surge",
      affectedEntities: [{ entityType: "company", entityId: "co1", entityLabel: "NodeBench AI" }],
      shouldTriggerPacket: false, shouldTriggerBrief: true, shouldTriggerAlert: false,
      suggestedAction: "Review incoming signals for emerging pattern. May indicate market timing opportunity.",
      status: "dismissed" as const, createdAt: Date.now() - 172_800_000,
    },
  ];
}

// ── Demo time rollups ─────────────────────────────────────────────────

type PeriodType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

interface RollupMetrics {
  initiativeCount: number;
  initiativesActive: number;
  initiativesBlocked: number;
  initiativesCompleted: number;
  interventionsSuggested: number;
  interventionsStarted: number;
  interventionsCompleted: number;
  signalsIngested: number;
  avgSignalImportance: number;
  identityConfidence: number;
  avgInitiativePriority: number;
  eventsRecorded: number;
  pathStepsRecorded: number;
  diffsRecorded: number;
  packetsGenerated: number;
  memosGenerated: number;
  agentsHealthy: number;
  agentsDrifting: number;
  importantChangesDetected: number;
  importantChangesResolved: number;
}

function makeDemoMetrics(seed: number): RollupMetrics {
  const s = Math.sin(seed) * 10000;
  const r = (min: number, max: number) => min + Math.abs(s % (max - min));
  return {
    initiativeCount: Math.round(r(8, 15)),
    initiativesActive: Math.round(r(4, 10)),
    initiativesBlocked: Math.round(r(0, 3)),
    initiativesCompleted: Math.round(r(1, 5)),
    interventionsSuggested: Math.round(r(3, 12)),
    interventionsStarted: Math.round(r(2, 8)),
    interventionsCompleted: Math.round(r(1, 6)),
    signalsIngested: Math.round(r(5, 25)),
    avgSignalImportance: Math.round(r(40, 85)) / 100,
    identityConfidence: Math.round(r(55, 85)) / 100,
    avgInitiativePriority: Math.round(r(50, 90)) / 100,
    eventsRecorded: Math.round(r(20, 80)),
    pathStepsRecorded: Math.round(r(10, 50)),
    diffsRecorded: Math.round(r(5, 20)),
    packetsGenerated: Math.round(r(1, 4)),
    memosGenerated: Math.round(r(0, 3)),
    agentsHealthy: Math.round(r(2, 5)),
    agentsDrifting: Math.round(r(0, 2)),
    importantChangesDetected: Math.round(r(1, 6)),
    importantChangesResolved: Math.round(r(0, 4)),
  };
}

function generateDemoRollups() {
  const periods: Record<PeriodType, { current: { key: string; metrics: RollupMetrics }; prior: { key: string; metrics: RollupMetrics } }> = {
    daily: { current: { key: "2026-03-23", metrics: makeDemoMetrics(1) }, prior: { key: "2026-03-22", metrics: makeDemoMetrics(2) } },
    weekly: { current: { key: "2026-W12", metrics: makeDemoMetrics(3) }, prior: { key: "2026-W11", metrics: makeDemoMetrics(4) } },
    monthly: { current: { key: "2026-03", metrics: makeDemoMetrics(5) }, prior: { key: "2026-02", metrics: makeDemoMetrics(6) } },
    quarterly: { current: { key: "2026-Q1", metrics: makeDemoMetrics(7) }, prior: { key: "2025-Q4", metrics: makeDemoMetrics(8) } },
    yearly: { current: { key: "2026", metrics: makeDemoMetrics(9) }, prior: { key: "2025", metrics: makeDemoMetrics(10) } },
  };
  return periods;
}

// ── Export types ───────────────────────────────────────────────────────

export interface CausalMemoryData {
  trajectoryScores: ReturnType<typeof generateDemoTrajectoryScores>;
  events: ReturnType<typeof generateDemoEvents>;
  diffs: ReturnType<typeof generateDemoDiffs>;
  path: ReturnType<typeof generateDemoPath>;
  packetVersions: ReturnType<typeof generateDemoPacketVersions>;
  memoVersions: ReturnType<typeof generateDemoMemoVersions>;
  importantChanges: ReturnType<typeof generateDemoChanges>;
  rollups: ReturnType<typeof generateDemoRollups>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// ── Main hook ─────────────────────────────────────────────────────────

/**
 * Provides all Phase 10 causal memory data.
 * Currently returns demo fixtures. When Convex codegen runs after deploying
 * the causalMemoryOps, this will switch to live queries for authenticated users.
 */
export function useCausalMemory(): CausalMemoryData {
  // TODO: Wire to Convex queries once codegen runs:
  // const { isAuthenticated } = useConvexAuth();
  // const cvxTrajectory = useQuery(api.domains.founder.causalMemoryOps.getDashboardTrajectory, ...);
  // const cvxEvents = useQuery(api.domains.founder.causalMemoryOps.getEventLedger, ...);
  // etc.

  const data = useMemo(() => ({
    trajectoryScores: generateDemoTrajectoryScores(),
    events: generateDemoEvents(),
    diffs: generateDemoDiffs(),
    path: generateDemoPath(),
    packetVersions: generateDemoPacketVersions(),
    memoVersions: generateDemoMemoVersions(),
    importantChanges: generateDemoChanges(),
    rollups: generateDemoRollups(),
    isLoading: false,
    isAuthenticated: false,
  }), []);

  return data;
}
