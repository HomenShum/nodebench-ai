/**
 * cohorts.ts — Canonical cohort definitions for N=1, N=5, N=10, N=100 benchmarks.
 *
 * N=1   proves it can work
 * N=5   proves it is not just for you
 * N=10  proves it survives role and session variance
 * N=100 proves it compounds over time
 */

import type { BenchmarkCohort, BenchmarkUser } from "./longitudinalTypes.js";

/* ─── Canonical Users ────────────────────────────────────────────────────── */

const USERS: Record<string, BenchmarkUser> = {
  founder_homen: {
    userId: "u_founder_homen",
    role: "founder",
    name: "Homen (Founder)",
    description: "Solo technical founder building NodeBench. Weekly reset, delegation, strategy.",
    scenarios: ["weekly_reset", "pre_delegation", "important_change", "competitor_brief", "packet_diff"],
    primaryEntity: "NodeBench",
  },
  banker_sarah: {
    userId: "u_banker_sarah",
    role: "banker",
    name: "Sarah (Banker)",
    description: "Investment banker evaluating AI infrastructure companies for deal flow.",
    scenarios: ["company_search", "competitor_brief", "memo_export", "role_switch"],
    primaryEntity: "Anthropic",
  },
  ceo_marcus: {
    userId: "u_ceo_marcus",
    role: "ceo",
    name: "Marcus (CEO)",
    description: "CEO of a mid-stage startup. Quarterly strategy, board narrative, resource allocation.",
    scenarios: ["weekly_reset", "important_change", "company_search", "memo_export"],
    primaryEntity: "Shopify",
  },
  researcher_lin: {
    userId: "u_researcher_lin",
    role: "researcher",
    name: "Lin (Researcher)",
    description: "AI strategy analyst. Competitor intelligence, market mapping, evidence synthesis.",
    scenarios: ["competitor_brief", "company_search", "uploaded_notes", "html_export"],
    primaryEntity: "Supermemory",
  },
  student_aisha: {
    userId: "u_student_aisha",
    role: "student",
    name: "Aisha (Student)",
    description: "MBA student studying AI commerce strategy. Needs citation-friendly study briefs.",
    scenarios: ["company_search", "uploaded_notes", "memo_export", "role_switch"],
    primaryEntity: "Shopify",
  },
  legal_david: {
    userId: "u_legal_david",
    role: "legal",
    name: "David (Legal)",
    description: "In-house counsel reviewing AI partnerships. Regulatory exposure, governance, IP.",
    scenarios: ["company_search", "important_change", "memo_export"],
    primaryEntity: "Anthropic",
  },
  pm_rachel: {
    userId: "u_pm_rachel",
    role: "pm",
    name: "Rachel (PM)",
    description: "Product manager at an AI-native company. Feature prioritization, competitor tracking.",
    scenarios: ["weekly_reset", "competitor_brief", "important_change", "packet_diff"],
    primaryEntity: "NodeBench",
  },
  contractor_kai: {
    userId: "u_contractor_kai",
    role: "contractor",
    name: "Kai (Contractor)",
    description: "Freelance developer receiving delegation packets. Needs scoped context without full history.",
    scenarios: ["pre_delegation", "packet_diff", "uploaded_notes"],
    primaryEntity: "NodeBench",
  },
  investor_priya: {
    userId: "u_investor_priya",
    role: "investor",
    name: "Priya (Investor)",
    description: "VC partner evaluating AI infrastructure deals. Pipeline tracking, comparables, diligence.",
    scenarios: ["company_search", "competitor_brief", "memo_export", "role_switch"],
    primaryEntity: "Anthropic",
  },
  content_james: {
    userId: "u_content_james",
    role: "content",
    name: "James (Content)",
    description: "Content strategist tracking AI industry trends. Post performance, audience analysis.",
    scenarios: ["company_search", "important_change", "competitor_brief", "html_export"],
    primaryEntity: "Shopify",
  },
};

/* ─── N=1 — Golden Path ──────────────────────────────────────────────────── */

export const COHORT_N1: BenchmarkCohort = {
  cohortId: "cohort_n1_golden_path",
  layer: "N1",
  users: [USERS.founder_homen],
  sessionsPerUser: 1,
  timeHorizons: ["same_session"],
  description: "Single founder run: weekly reset → memo export → pre-delegation → important-change. Proves the golden path works.",
};

/* ─── N=5 — Role Generalization ──────────────────────────────────────────── */

export const COHORT_N5: BenchmarkCohort = {
  cohortId: "cohort_n5_role_variance",
  layer: "N5",
  users: [
    USERS.founder_homen,
    USERS.banker_sarah,
    USERS.ceo_marcus,
    USERS.researcher_lin,
    USERS.student_aisha,
  ],
  sessionsPerUser: 1,
  timeHorizons: ["same_session"],
  description: "5 users with different roles analyze the same entity. Proves role adaptation without hallucination.",
};

/* ─── N=10 — Repeated-Session Stability ──────────────────────────────────── */

export const COHORT_N10: BenchmarkCohort = {
  cohortId: "cohort_n10_session_stability",
  layer: "N10",
  users: [
    USERS.founder_homen,
    USERS.banker_sarah,
    USERS.ceo_marcus,
    USERS.researcher_lin,
    USERS.student_aisha,
  ],
  sessionsPerUser: 2,
  timeHorizons: ["same_session", "next_day"],
  description: "5 users × 2 sessions each. Session 2 tests: remembered context, surfaced delta, refreshed packet. Proves session continuity.",
};

/* ─── N=100 — Longitudinal Compounding ───────────────────────────────────── */

export const COHORT_N100: BenchmarkCohort = {
  cohortId: "cohort_n100_longitudinal",
  layer: "N100",
  users: Object.values(USERS),
  sessionsPerUser: 10,
  timeHorizons: ["same_session", "same_day", "next_day", "weekly", "monthly", "quarterly"],
  description: "10 users × 10 sessions across time horizons. Tests compounding memory, packet reuse, repeat-cognition avoidance, regression resistance.",
};

/* ─── All Cohorts ────────────────────────────────────────────────────────── */

export const ALL_COHORTS: BenchmarkCohort[] = [COHORT_N1, COHORT_N5, COHORT_N10, COHORT_N100];
export const ALL_USERS = USERS;
