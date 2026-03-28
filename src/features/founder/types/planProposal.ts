/**
 * planProposal.ts — Types for context-conditioned plan synthesis.
 *
 * Plans are NOT generic PRDs. They are shaped by:
 * - Founder profile (mission, wedge, company state)
 * - Active initiatives and recent decisions
 * - Codebase readiness (what exists, what's partial, what's missing)
 * - Competitor/market intelligence
 * - Active contradictions and risks
 */

/* ─── Plan Types ─────────────────────────────────────────────────────────── */

export type PlanProposalType = "feature_plan" | "integration_proposal" | "extension_plan";

export type PlanPriority = "critical" | "high" | "medium" | "low";

export type EffortEstimate = "hours" | "days" | "weeks" | "months";

export type ReadinessStatus = "ready" | "partial" | "missing";

/* ─── Strategic Fit ──────────────────────────────────────────────────────── */

export interface StrategicFit {
  wedgeAlignment: number;            // 0-1, how well this aligns with company wedge
  whyNow: string;                    // Strategic timing justification
  initiativeLinks: string[];          // IDs of linked founderInitiatives
  contradictionRisks: string[];       // Active contradictions this plan touches
}

/* ─── Plan Phase ─────────────────────────────────────────────────────────── */

export interface PlanPhase {
  id: string;
  title: string;
  description: string;
  dependencies: string[];             // IDs of phases this depends on
  estimatedEffort: EffortEstimate;
  affectedSurfaces: string[];         // UI routes, API endpoints, DB tables
  acceptanceCriteria: string[];
}

/* ─── Competitor Context ─────────────────────────────────────────────────── */

export interface CompetitorContext {
  entity: string;
  relevantCapability: string;
  ourGap: string;
  source: string;
}

/* ─── Codebase Readiness ─────────────────────────────────────────────────── */

export interface CodebaseReadiness {
  capability: string;
  status: ReadinessStatus;
  files: string[];
  notes: string;
}

/* ─── Plan Risk ──────────────────────────────────────────────────────────── */

export interface PlanRisk {
  title: string;
  severity: "high" | "medium" | "low";
  mitigation: string;
  linkedContradiction?: string;
}

/* ─── Delegation Packet ──────────────────────────────────────────────────── */

export interface PlanDelegationPacket {
  scope: string;
  constraints: string[];
  affectedFiles: string[];
  desiredBehavior: string;
  acceptanceCriteria: string[];
  contextNotToLose: string[];
}

/* ─── Provenance ─────────────────────────────────────────────────────────── */

export interface PlanProvenance {
  generatedAt: string;
  sourceCount: number;
  contextSources: string[];
  triggerQuery: string;
}

/* ─── Main Plan Structure ────────────────────────────────────────────────── */

export interface FeaturePlan {
  planId: string;
  planType: PlanProposalType;
  title: string;
  summary: string;
  strategicFit: StrategicFit;
  phases: PlanPhase[];
  competitorContext: CompetitorContext[];
  codebaseReadiness: CodebaseReadiness[];
  risks: PlanRisk[];
  delegationPacket: PlanDelegationPacket;
  provenance: PlanProvenance;
}

/* ─── Synthesis Context (assembled from all available sources) ───────────── */

export interface PlanSynthesisContext {
  founderProfile: {
    name: string;
    mission: string;
    wedge: string;
    companyState: string;
    foundingMode: string;
  };
  activeInitiatives: Array<{
    id: string;
    title: string;
    status: string;
    priorityScore: number;
    objective: string;
  }>;
  recentDecisions: Array<{
    title: string;
    outcome: string;
    date: string;
  }>;
  activeContradictions: Array<{
    title: string;
    severity: string;
    detail: string;
  }>;
  competitorEntities: Array<{
    name: string;
    signals: string[];
  }>;
  codebaseCapabilities: Array<{
    capability: string;
    status: ReadinessStatus;
    files: string[];
  }>;
}
