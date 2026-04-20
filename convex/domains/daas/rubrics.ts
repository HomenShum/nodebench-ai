// Rubric registry for the DaaS judge.
//
// Every rubric is a bounded set of named boolean checks, each with a
// prompt sentence. The judge LLM must return one {name, passed, reason}
// object per check, in order. Names form an allowlist — the judge cannot
// invent new checks (filtered before storage).
//
// Adding a new rubric:
//   1. Add an entry to RUBRICS with a unique id (e.g. "daas.coding.v1").
//   2. Bump the version when checks change materially; old version rows
//      stay readable + filterable so dashboards can show apples-to-apples
//      comparisons across rubric revisions.
//
// See:
//   docs/DISTILLATION_AS_A_SERVICE.md
//   docs/BENCHMARK_STRATEGY.md (Vellum-derived benchmark guidance)

export type RubricCheck = {
  name: string;
  prompt: string;
};

export type Rubric = {
  id: string;
  version: string;
  description: string;
  checks: RubricCheck[];
};

// ── daas.generic.v1 ─────────────────────────────────────────────────────────
const GENERIC_V1: Rubric = {
  id: "daas.generic.v1",
  version: "2026-04-19",
  description:
    "Cross-domain rubric for expert vs replay comparison. Works for any workflow where the expert answer cites specific identifiers and prescribes actions.",
  checks: [
    {
      name: "cites_specific_ids",
      prompt:
        "Does the replay cite specific identifiers (e.g. ISS-*, POL-*, SKU-*, ticket numbers, ticker symbols) that appear in the original expert response?",
    },
    {
      name: "no_hallucinated_ids",
      prompt:
        "Does the replay AVOID inventing identifiers that are NOT present in the original expert response or context?",
    },
    {
      name: "includes_immediate_actions",
      prompt:
        "Does the replay include numbered immediate actions / steps to take right now?",
    },
    {
      name: "includes_followup_actions",
      prompt:
        "Does the replay include follow-up / next-step actions beyond the immediate response?",
    },
    {
      name: "matches_domain_rules",
      prompt:
        "Does the replay honor the domain rules / thresholds / policies that the expert response applied (e.g. safety thresholds, escalation rules)?",
    },
    {
      name: "structured_output",
      prompt:
        "Is the replay well-structured (sections, headers, numbered lists) comparable to the expert response?",
    },
    {
      name: "grounded_in_context",
      prompt:
        "Does the replay ground its claims in concrete facts (numbers, IDs, evidence) rather than generic advice?",
    },
    {
      name: "covers_main_points",
      prompt:
        "Does the replay cover the main substantive points from the expert response (core diagnosis / recommendation / rationale)?",
    },
    {
      name: "actionable_for_user",
      prompt:
        "Could the intended user (store manager, operator, analyst) act on this response directly, without needing to re-query?",
    },
    {
      name: "internally_consistent",
      prompt:
        "Is the replay internally consistent (no contradictions between its recommendations, cited facts, or action order)?",
    },
  ],
};

// ── daas.retail_ops.v1 — domain-specific for FloorAI-style workloads ────────
const RETAIL_OPS_V1: Rubric = {
  id: "daas.retail_ops.v1",
  version: "2026-04-19",
  description:
    "Retail operations rubric for store-manager queries. Adds food-safety + staffing + vendor-delay specific checks on top of the generic pattern.",
  checks: [
    {
      name: "cites_issue_id",
      prompt:
        "Does the replay cite the specific ISS-* issue identifier from the context that matches the query?",
    },
    {
      name: "cites_policy_id",
      prompt:
        "Does the replay cite the specific POL-* policy identifier that applies to the situation?",
    },
    {
      name: "cites_store_id",
      prompt:
        "When the query mentions a specific store, does the replay reference the STR-* identifier correctly?",
    },
    {
      name: "includes_immediate_actions",
      prompt:
        "Does the replay list numbered immediate actions (within 15 minutes) appropriate to the severity of the issue?",
    },
    {
      name: "respects_safety_thresholds",
      prompt:
        "For food-safety / refrigeration / perishable topics, does the replay respect the safety thresholds from the expert response (e.g. 41F cooler limit, 2hr product-discard rule)?",
    },
    {
      name: "revenue_or_impact_quantified",
      prompt:
        "Does the replay quantify revenue or operational impact (dollar amount, affected SKUs, customer reach) when the expert response did?",
    },
    {
      name: "correct_escalation_path",
      prompt:
        "Does the replay route escalations to the correct role (regional manager, HR, loss prevention) when the situation warrants it?",
    },
    {
      name: "cross_store_pattern_checked",
      prompt:
        "Does the replay consider cross-store patterns or chain-wide implications when relevant?",
    },
    {
      name: "documentation_and_followup",
      prompt:
        "Does the replay specify documentation + follow-up requirements (shrinkage log, incident report, vendor claim) matching the expert?",
    },
    {
      name: "no_hallucinated_ids_or_policies",
      prompt:
        "Does the replay avoid inventing issue IDs, policy IDs, or store IDs that are NOT in the expert response or context?",
    },
  ],
};

// ── daas.coding.v1 — for software-engineering workflow replays ─────────────
const CODING_V1: Rubric = {
  id: "daas.coding.v1",
  version: "2026-04-19",
  description:
    "Software engineering rubric for code-writing / debugging / review workflows. Designed for future replays against SWE-bench-style traces.",
  checks: [
    {
      name: "identifies_root_cause",
      prompt:
        "Does the replay correctly identify the root cause of the bug or required change, matching the expert diagnosis?",
    },
    {
      name: "cites_specific_files",
      prompt:
        "Does the replay reference the specific file paths / line numbers from the expert response (not just generic 'check the code')?",
    },
    {
      name: "proposes_minimal_diff",
      prompt:
        "Does the replay propose a minimal, targeted change rather than a sprawling rewrite?",
    },
    {
      name: "considers_tests",
      prompt:
        "Does the replay mention running or adding tests to verify the fix, matching the expert's verification step?",
    },
    {
      name: "no_hallucinated_apis",
      prompt:
        "Does the replay avoid inventing APIs, function names, or library calls that aren't in the expert response or codebase context?",
    },
    {
      name: "respects_code_style",
      prompt:
        "Does the replay respect the existing code style / language idioms visible in the context (e.g. error handling patterns, import style)?",
    },
    {
      name: "handles_edge_cases",
      prompt:
        "Does the replay acknowledge edge cases (null inputs, concurrency, error paths) that the expert covered?",
    },
    {
      name: "provides_verification_steps",
      prompt:
        "Does the replay provide concrete verification steps (how to reproduce the bug, how to confirm the fix)?",
    },
    {
      name: "internally_consistent",
      prompt:
        "Is the replay internally consistent — proposed changes don't contradict each other or break invariants?",
    },
    {
      name: "actionable_as_a_pr",
      prompt:
        "Could an engineer open a PR from the replay's output directly, without further clarification?",
    },
  ],
};

// ── Registry ────────────────────────────────────────────────────────────────
const RUBRICS: Record<string, Rubric> = {
  [GENERIC_V1.id]: GENERIC_V1,
  [RETAIL_OPS_V1.id]: RETAIL_OPS_V1,
  [CODING_V1.id]: CODING_V1,
};

export const DEFAULT_RUBRIC_ID = GENERIC_V1.id;

/** Get a rubric by id. Returns GENERIC if unknown (HONEST_STATUS:
 *  callers can check the returned id to see if fallback happened). */
export function getRubric(id: string | undefined | null): Rubric {
  if (!id) return GENERIC_V1;
  return RUBRICS[id] ?? GENERIC_V1;
}

/** List all registered rubrics (for UI pickers). */
export function listRubrics(): Array<{
  id: string;
  version: string;
  description: string;
  checkCount: number;
}> {
  return Object.values(RUBRICS).map((r) => ({
    id: r.id,
    version: r.version,
    description: r.description,
    checkCount: r.checks.length,
  }));
}
