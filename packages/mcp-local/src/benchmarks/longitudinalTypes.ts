/**
 * longitudinalTypes.ts — Types for the NodeBench longitudinal evaluation harness.
 *
 * The evaluation object is: User x Role x Scenario x Session Count x Time Horizon
 * Not "did one prompt work once?" but "does the system compound over time?"
 *
 * Layers:
 *   N=1   — Golden path smoke test (single flow works)
 *   N=5   — Role generalization (different users, same entity)
 *   N=10  — Repeated-session stability (same users, multiple sessions)
 *   N=100 — Longitudinal compounding (10 users x 10 sessions)
 */

/* ─── Core Dimensions ────────────────────────────────────────────────────── */

export type BenchmarkRole =
  | "founder"
  | "banker"
  | "ceo"
  | "researcher"
  | "student"
  | "legal"
  | "pm"
  | "contractor"
  | "investor"
  | "content";

export type BenchmarkScenario =
  | "weekly_reset"
  | "pre_delegation"
  | "important_change"
  | "company_search"
  | "competitor_brief"
  | "uploaded_notes"
  | "memo_export"
  | "html_export"
  | "packet_diff"
  | "role_switch";

export type BenchmarkSurface = "ai_app" | "mcp" | "local_dashboard" | "engine_api" | "mobile";

export type TimeHorizon = "same_session" | "same_day" | "next_day" | "weekly" | "monthly" | "quarterly" | "yearly";

/* ─── Benchmark Run ──────────────────────────────────────────────────────── */

export interface BenchmarkRun {
  runId: string;
  userId: string;
  role: BenchmarkRole;
  scenarioId: BenchmarkScenario;
  surface: BenchmarkSurface;
  sessionIndex: number;
  timeHorizon: TimeHorizon;
  entityScope: string;

  /** Input */
  prompt: string;
  attachedInputs: string[];
  seedDataId: string | null;

  /** State tracking */
  stateBeforeHash: string;
  stateAfterHash: string;
  packetVersion: number;
  artifactVersion: number;
  priorPacketId: string | null;

  /** Execution telemetry */
  toolsInvoked: string[];
  toolCallCount: number;
  readOpsCount: number;
  writeOpsCount: number;
  webEnrichmentCount: number;
  totalLatencyMs: number;
  totalTokensEst: number;

  /** Quality scores */
  judgeScore: number;
  humanScore: number | null;

  /** Compounding metrics (the real moat) */
  repeatedCognitionAvoided: boolean;
  packetReused: boolean;
  priorContextRestated: boolean;
  contradictionSurfaced: boolean;
  contradictionCorrect: boolean;
  suppressedNoise: boolean;
  falseAlertFired: boolean;
  artifactExported: boolean;
  delegationWithoutRestatement: boolean;

  /** Timestamps */
  timestampStart: string;
  timestampEnd: string;
}

/* ─── Cohort Definition ──────────────────────────────────────────────────── */

export interface BenchmarkUser {
  userId: string;
  role: BenchmarkRole;
  name: string;
  description: string;
  /** Scenarios this user should run */
  scenarios: BenchmarkScenario[];
  /** Entity they focus on (for multi-session continuity) */
  primaryEntity: string;
}

export interface BenchmarkCohort {
  cohortId: string;
  layer: "N1" | "N5" | "N10" | "N100";
  users: BenchmarkUser[];
  sessionsPerUser: number;
  timeHorizons: TimeHorizon[];
  description: string;
}

/* ─── Seed Dataset ───────────────────────────────────────────────────────── */

export interface SeedDataset {
  seedId: string;
  entityName: string;
  /** Pre-seeded company/entity records */
  entityProfile: Record<string, unknown>;
  /** Pre-seeded competitor changes over time */
  competitorChanges: Array<{ date: string; change: string; entity: string }>;
  /** Pre-seeded uploaded notes/docs */
  uploadedNotes: string[];
  /** Pre-seeded action history (simulates prior sessions) */
  actionHistory: Array<{ action: string; category: string; timestamp: string }>;
  /** Pre-seeded prior packets (for diff/reuse testing) */
  priorPackets: Array<{ packetId: string; packetType: string; generatedAt: string; summary: string }>;
  /** Time-horizon simulation data */
  timelineEvents: Array<{ timestamp: string; event: string; horizon: TimeHorizon }>;
}

/* ─── North Star Metrics ─────────────────────────────────────────────────── */

export interface CompoundingMetrics {
  /** Repeated Cognition Avoided — how often NodeBench prevented re-stating old context */
  rca: number;
  /** Packet Reuse Rate — how often a prior packet was useful in a later session */
  prr: number;
  /** Important-Change Precision — % of flagged changes that were actually important */
  importantChangePrecision: number;
  /** Contradiction Precision — % of surfaced contradictions that were real */
  contradictionPrecision: number;
  /** False Alert Rate — % of alerts that were noise */
  falseAlertRate: number;
  /** Export-to-Action Rate — % of exports that led to a downstream action */
  exportToActionRate: number;
  /** Delegation-without-Restatement Rate */
  delegationWithoutRestatementRate: number;
  /** Suppression Quality — % of low-signal items correctly suppressed */
  suppressionQuality: number;
}

/* ─── Batch Report ───────────────────────────────────────────────────────── */

export interface BenchmarkBatchReport {
  batchId: string;
  layer: "N1" | "N5" | "N10" | "N100";
  cohortId: string;
  timestamp: string;

  /** Summary */
  totalSessions: number;
  rolesCovered: BenchmarkRole[];
  scenariosCovered: BenchmarkScenario[];
  coreLoopsCovered: number;
  coreLoopsTotal: number;

  /** North star metrics */
  metrics: CompoundingMetrics;

  /** Scoring by N-level */
  n1Score: N1Score | null;
  n5Score: N5Score | null;
  n10Score: N10Score | null;
  n100Score: N100Score | null;

  /** Top issues */
  topRecurringRootCause: string;
  topRegressionRisk: string;
  regressionsSinceLast: number;

  /** Durability scoring (perturbation-aware) */
  durability: {
    completionStability: number;
    rerunSavings: number;
    artifactQuality: number;
    memoryUsefulness: number;
    driftResistance: number;
    crossSessionContinuity: number;
    composite: number;
  } | null;

  /** Maturity level: A (smoke) → B (stable) → C (hardened) → D (durable) → E (institutional) */
  maturityLevel: string | null;
  maturityLabel: string | null;

  /** Perturbation stats */
  perturbedRunCount: number;
  perturbedPassCount: number;

  /** Individual run summaries */
  runs: BenchmarkRun[];
}

/* ─── N-level specific scoring ───────────────────────────────────────────── */

export interface N1Score {
  /** Focus: correctness, output shape, no breakage */
  outputCorrect: boolean;
  packetShapeValid: boolean;
  noErrors: boolean;
  toolChainComplete: boolean;
}

export interface N5Score {
  /** Focus: role adaptation, consistent structure, export usability */
  roleAdaptationCorrect: boolean;
  packetStructureConsistent: boolean;
  exportUsable: boolean;
  sameEntityTruthAcrossRoles: boolean;
  noRoleHallucination: boolean;
}

export interface N10Score {
  /** Focus: session-to-session continuity, delta quality, contradiction handling */
  priorContextRemembered: boolean;
  deltaSurfacedWithoutReExplaining: boolean;
  packetRefreshedCorrectly: boolean;
  contradictionHandledProperly: boolean;
  repeatedCognitionRate: number;
}

export interface N100Score {
  /** Focus: compounding value, suppression, regression resistance */
  compoundingMetrics: CompoundingMetrics;
  regressionCount: number;
  packetStalenessRate: number;
  causalMemoryStability: number;
  lineageIntegrity: boolean;
  yearScaleUsefulnessEstimate: number;
}

/* ─── Pass/Fail Gates ────────────────────────────────────────────────────── */

export const PASS_GATES = {
  N1: {
    outputCorrect: true,
    packetShapeValid: true,
    noErrors: true,
  },
  N5: {
    roleAdaptationCorrect: true,
    sameEntityTruthAcrossRoles: true,
    noRoleHallucination: true,
  },
  N10: {
    repeatedCognitionRate: 0.3, // max 30% — should avoid 70%+ of repeated questions
    deltaSurfacedWithoutReExplaining: true,
    packetRefreshedCorrectly: true,
  },
  N100: {
    rca: 0.6, // min 60% repeated cognition avoided
    prr: 0.4, // min 40% packet reuse
    importantChangePrecision: 0.7, // min 70%
    falseAlertRate: 0.15, // max 15%
    regressionCount: 3, // max 3 regressions per batch
  },
} as const;
