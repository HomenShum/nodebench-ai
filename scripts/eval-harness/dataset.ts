/**
 * Eval Dataset — 20 tasks for Bare vs MCP agent comparison.
 *
 * Tier 1 (10 tasks): Deterministic, single-file, auto-gradable
 * Tier 2 (5 tasks): Tool discovery + multi-file reasoning
 * Tier 3 (5 tasks): Production-grade, fixture-backed
 */

import type { EvalDataset, EvalTask } from "./types.js";

export const EVAL_DATASET: EvalDataset = {
  version: "1.0.0",
  createdAt: "2026-02-08T00:00:00Z",
  tasks: [
    // ═══════════════════════════════════════════════════════════════════
    // TIER 1: Deterministic (10 tasks)
    // ═══════════════════════════════════════════════════════════════════
    {
      id: "t1_add_validator_returns",
      name: "Add missing returns validator",
      tier: "tier1_deterministic",
      description: "Given a Convex query function missing `returns: v.null()`, add the correct return validator.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.5 },
        { id: "has_returns", type: "output_match", expectedPattern: "returns:\\s*v\\.", weight: 0.5 },
      ],
      riskTier: "low",
      tags: ["validator", "returns", "function"],
    },
    {
      id: "t1_replace_bigint",
      name: "Replace deprecated v.bigint()",
      tier: "tier1_deterministic",
      description: "Find and replace all v.bigint() calls with v.int64() in schema.ts.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "no_bigint", type: "output_match", expectedPattern: "^(?!.*v\\.bigint)", weight: 0.6 },
        { id: "has_int64", type: "output_match", expectedPattern: "v\\.int64\\(\\)", weight: 0.4 },
      ],
      riskTier: "low",
      tags: ["validator", "deprecated", "migration"],
    },
    {
      id: "t1_add_index",
      name: "Add missing index to table",
      tier: "tier1_deterministic",
      description: "Given a query that filters by `userId` on a table with no index, add a proper index with correct naming.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "has_index", type: "output_match", expectedPattern: "\\.index\\(.*by_userId", weight: 0.5 },
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.5 },
      ],
      riskTier: "low",
      tags: ["schema", "index", "performance"],
    },
    {
      id: "t1_make_internal",
      name: "Change public admin function to internal",
      tier: "tier1_deterministic",
      description: "A function named `adminDeleteUser` is registered as a public `mutation`. Change it to `internalMutation`.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "is_internal", type: "output_match", expectedPattern: "internalMutation", weight: 0.6 },
        { id: "not_public", type: "output_match", expectedPattern: "^(?!.*export.*=\\s*mutation)", weight: 0.4 },
      ],
      riskTier: "low",
      tags: ["function", "security", "internal"],
    },
    {
      id: "t1_fix_function_ref",
      name: "Fix direct function passing",
      tier: "tier1_deterministic",
      description: "Replace `ctx.runQuery(myFunc, args)` with `ctx.runQuery(api.file.myFunc, args)`.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "uses_api_ref", type: "output_match", expectedPattern: "ctx\\.runQuery\\(api\\.", weight: 0.6 },
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.4 },
      ],
      riskTier: "low",
      tags: ["function", "reference", "api"],
    },
    {
      id: "t1_add_args_validator",
      name: "Add args validator to bare function",
      tier: "tier1_deterministic",
      description: "Given a query using old syntax `query(async (ctx) => {...})`, convert to new syntax with args and returns.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "has_args", type: "output_match", expectedPattern: "args:\\s*\\{", weight: 0.3 },
        { id: "has_returns", type: "output_match", expectedPattern: "returns:\\s*v\\.", weight: 0.3 },
        { id: "has_handler", type: "output_match", expectedPattern: "handler:\\s*async", weight: 0.4 },
      ],
      riskTier: "low",
      tags: ["function", "syntax", "migration"],
    },
    {
      id: "t1_fix_undefined_return",
      name: "Fix function returning undefined",
      tier: "tier1_deterministic",
      description: "A mutation handler implicitly returns undefined. Add explicit `return null` and `returns: v.null()`.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "returns_null", type: "output_match", expectedPattern: "return null", weight: 0.5 },
        { id: "validator_null", type: "output_match", expectedPattern: "returns:\\s*v\\.null\\(\\)", weight: 0.5 },
      ],
      riskTier: "low",
      tags: ["validator", "null", "return"],
    },
    {
      id: "t1_fix_field_name",
      name: "Fix reserved field name prefix",
      tier: "tier1_deterministic",
      description: "A schema defines a field `_customStatus` which uses a reserved prefix. Rename to `customStatus`.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "no_underscore", type: "output_match", expectedPattern: "^(?!.*[\"']_customStatus[\"'])", weight: 0.5 },
        { id: "renamed", type: "output_match", expectedPattern: "[\"']customStatus[\"']", weight: 0.5 },
      ],
      riskTier: "low",
      tags: ["schema", "field", "reserved"],
    },
    {
      id: "t1_add_http_endpoint",
      name: "Add HTTP POST endpoint",
      tier: "tier1_deterministic",
      description: "Add a POST endpoint at /api/webhook using httpAction in convex/http.ts.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "has_route", type: "output_match", expectedPattern: 'path:\\s*["\\/]api\\/webhook', weight: 0.3 },
        { id: "has_post", type: "output_match", expectedPattern: 'method:\\s*"POST"', weight: 0.3 },
        { id: "has_httpAction", type: "output_match", expectedPattern: "httpAction", weight: 0.4 },
      ],
      riskTier: "low",
      tags: ["http", "endpoint", "webhook"],
    },
    {
      id: "t1_add_discriminated_union",
      name: "Add discriminated union to schema",
      tier: "tier1_deterministic",
      description: "Define a table with v.union() using v.literal() discriminators for success/error result types.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "has_union", type: "output_match", expectedPattern: "v\\.union\\(", weight: 0.3 },
        { id: "has_literal", type: "output_match", expectedPattern: "v\\.literal\\(", weight: 0.3 },
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.4 },
      ],
      riskTier: "low",
      tags: ["schema", "validator", "union"],
    },

    // ═══════════════════════════════════════════════════════════════════
    // TIER 2: Tool Discovery + Multi-file (5 tasks)
    // ═══════════════════════════════════════════════════════════════════
    {
      id: "t2_audit_and_fix_schema",
      name: "Run schema audit and fix all issues",
      tier: "tier2_tool_discovery",
      description: "Use convex_audit_schema to find issues, then fix all critical/warning issues in schema.ts.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "audit_clean", type: "llm_judge", rubric: "Agent ran convex_audit_schema, identified issues, fixed them, and re-ran to verify 0 critical issues remain.", weight: 0.6 },
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.4 },
      ],
      riskTier: "medium",
      tags: ["schema", "audit", "multi-step"],
    },
    {
      id: "t2_gotcha_driven_implementation",
      name: "Search gotchas before implementing pagination",
      tier: "tier2_tool_discovery",
      description: "Before implementing a paginated query, search gotchas for relevant patterns. Then implement correctly using paginationOptsValidator.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "searched_gotchas", type: "llm_judge", rubric: "Agent searched convex_search_gotchas for pagination or query patterns before coding.", weight: 0.3 },
        { id: "correct_pagination", type: "output_match", expectedPattern: "paginationOptsValidator", weight: 0.4 },
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.3 },
      ],
      riskTier: "low",
      tags: ["pagination", "gotcha", "knowledge"],
    },
    {
      id: "t2_pre_deploy_gate_pass",
      name: "Get pre-deploy gate to pass",
      tier: "tier2_tool_discovery",
      description: "Run convex_pre_deploy_gate, identify all blockers, fix them, and get a passing gate.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "gate_passes", type: "llm_judge", rubric: "Agent achieved a passing convex_pre_deploy_gate with 0 blockers after fixing issues.", weight: 0.7 },
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.3 },
      ],
      riskTier: "medium",
      tags: ["deploy", "gate", "quality"],
    },
    {
      id: "t2_function_security_audit",
      name: "Audit functions and fix security issues",
      tier: "tier2_tool_discovery",
      description: "Run convex_audit_functions, identify public functions that should be internal, fix all security warnings.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "audit_run", type: "llm_judge", rubric: "Agent ran convex_audit_functions and addressed all security warnings about public admin/delete functions.", weight: 0.6 },
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.4 },
      ],
      riskTier: "medium",
      tags: ["function", "security", "audit"],
    },
    {
      id: "t2_index_optimization",
      name: "Optimize query indexes from suggestions",
      tier: "tier2_tool_discovery",
      description: "Run convex_suggest_indexes, evaluate top 5 suggestions, add the most impactful ones to schema.ts.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "suggestions_evaluated", type: "llm_judge", rubric: "Agent ran convex_suggest_indexes, evaluated suggestions, and added at least 3 new indexes with correct naming.", weight: 0.6 },
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.4 },
      ],
      riskTier: "low",
      tags: ["index", "optimization", "schema"],
    },

    // ═══════════════════════════════════════════════════════════════════
    // TIER 3: Production-grade (5 tasks)
    // ═══════════════════════════════════════════════════════════════════
    {
      id: "t3_full_deploy_workflow",
      name: "Complete deploy verification workflow",
      tier: "tier3_production",
      description: "Execute the full convex_deploy_verification methodology: audit schema, audit functions, check env vars, run pre-deploy gate, record gotchas discovered.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "full_workflow", type: "llm_judge", rubric: "Agent followed the full deploy verification methodology in order, ran all 5+ tools, and documented any new gotchas discovered.", weight: 0.7 },
        { id: "gate_passes", type: "llm_judge", rubric: "Final pre-deploy gate passes with 0 blockers.", weight: 0.3 },
      ],
      riskTier: "high",
      tags: ["deploy", "workflow", "e2e"],
    },
    {
      id: "t3_schema_migration",
      name: "Multi-table schema migration with safety",
      tier: "tier3_production",
      description: "Add 3 new tables, create indexes, update existing table with new fields. Snapshot before/after. Verify with full audit.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "snapshot_before", type: "llm_judge", rubric: "Agent took a schema snapshot before changes.", weight: 0.15 },
        { id: "tables_added", type: "output_match", expectedPattern: "defineTable", weight: 0.25 },
        { id: "snapshot_after", type: "llm_judge", rubric: "Agent took a schema snapshot after changes and reviewed the diff.", weight: 0.15 },
        { id: "audit_clean", type: "llm_judge", rubric: "Post-migration audit shows 0 critical issues.", weight: 0.25 },
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.2 },
      ],
      fixtures: ["test_assets/schema_migration_fixture.ts"],
      riskTier: "high",
      tags: ["schema", "migration", "snapshot"],
    },
    {
      id: "t3_build_crud_module",
      name: "Build complete CRUD module from scratch",
      tier: "tier3_production",
      description: "Create a new Convex module with: schema table + indexes, 5 CRUD functions (create, get, list, update, delete) with proper validators, internal admin functions, and function references.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "schema_correct", type: "llm_judge", rubric: "Schema table has appropriate field types and at least 2 indexes.", weight: 0.2 },
        { id: "crud_functions", type: "llm_judge", rubric: "All 5 CRUD functions exist with args and returns validators.", weight: 0.3 },
        { id: "internal_admin", type: "output_match", expectedPattern: "internalMutation|internalAction", weight: 0.1 },
        { id: "references_valid", type: "llm_judge", rubric: "Function references use api.x.y pattern correctly.", weight: 0.2 },
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.2 },
      ],
      riskTier: "medium",
      tags: ["crud", "module", "full-stack"],
    },
    {
      id: "t3_auth_integration",
      name: "Add auth to existing unprotected queries",
      tier: "tier3_production",
      description: "Given 5 public queries that don't check auth, add ctx.auth.getUserIdentity() checks and proper error handling. Make admin queries internal.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "auth_checks", type: "output_match", expectedPattern: "getUserIdentity", weight: 0.3 },
        { id: "error_handling", type: "llm_judge", rubric: "Unauthorized requests throw appropriate errors, not just return null.", weight: 0.25 },
        { id: "admin_internal", type: "llm_judge", rubric: "Admin-only functions converted to internalQuery/internalMutation.", weight: 0.25 },
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.2 },
      ],
      riskTier: "high",
      tags: ["auth", "security", "migration"],
    },
    {
      id: "t3_knowledge_loop",
      name: "Full knowledge management loop",
      tier: "tier3_production",
      description: "Search gotchas → implement feature → hit an edge case → record new gotcha → verify it's searchable → update rules.md.",
      baseRef: "HEAD",
      acceptanceCriteria: [
        { id: "searched_first", type: "llm_judge", rubric: "Agent searched gotchas before implementing.", weight: 0.15 },
        { id: "recorded_gotcha", type: "llm_judge", rubric: "Agent recorded at least 1 new gotcha with proper key/content/category.", weight: 0.25 },
        { id: "gotcha_searchable", type: "llm_judge", rubric: "New gotcha is findable via convex_search_gotchas.", weight: 0.2 },
        { id: "rules_updated", type: "llm_judge", rubric: "Agent used convex_generate_rules_md to produce updated rules.", weight: 0.2 },
        { id: "typecheck", type: "typecheck", command: "npx tsc --noEmit", weight: 0.2 },
      ],
      riskTier: "low",
      tags: ["knowledge", "gotcha", "rules", "loop"],
    },
  ],
};

export function getTasksByTier(tier: string): EvalTask[] {
  return EVAL_DATASET.tasks.filter((t) => t.tier === tier);
}

export function getTaskById(id: string): EvalTask | undefined {
  return EVAL_DATASET.tasks.find((t) => t.id === id);
}
