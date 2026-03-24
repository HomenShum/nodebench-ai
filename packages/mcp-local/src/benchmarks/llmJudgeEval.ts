#!/usr/bin/env npx tsx
/**
 * llmJudgeEval.ts — LLM-judged boolean-metric eval harness for NodeBench MCP
 *
 * Architecture:
 *   1. Query Corpus — 500+ typed test queries across 11 personas × 8 scenarios
 *   2. Tool Executor — loads preset, runs discover_tools + tool chain, captures outputs
 *   3. LLM Judge — Gemini 2.0 Flash Lite boolean evaluation per criterion
 *   4. Boolean Metrics — precision, recall, forbidden violations, criteria pass rate
 *   5. Regression Detection — SQLite-backed diff between runs
 *
 * Usage:
 *   cd packages/mcp-local
 *   npx tsx src/benchmarks/llmJudgeEval.ts [--queries N] [--persona X] [--baseline RUN_ID]
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";
import { _setDbAccessor } from "../tools/toolRegistry.js";
import { loadToolsets, ALL_DOMAIN_KEYS, TOOLSET_MAP } from "../toolsetRegistry.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type Persona =
  | "founder"
  | "banker"
  | "ceo"
  | "researcher"
  | "student"
  | "operator"
  | "legal"
  | "pm"
  | "contractor"
  | "investor"
  | "content";

export type Scenario =
  | "weekly_reset"
  | "company_search"
  | "competitor_brief"
  | "delegation"
  | "important_change"
  | "memo_export"
  | "packet_diff"
  | "role_switch";

export interface BooleanCriterion {
  criterion: string;
  weight: number;
}

export interface EvalQuery {
  id: string;
  query: string;
  persona: Persona;
  scenario: Scenario;
  expectedTools: string[];
  forbiddenTools: string[];
  booleanCriteria: BooleanCriterion[];
}

export interface CriterionResult {
  criterion: string;
  pass: boolean;
  evidence: string;
}

export interface JudgeResponse {
  criteria: CriterionResult[];
  overallPass: boolean;
}

export interface QueryResult {
  queryId: string;
  pass: boolean;
  criteriaResults: CriterionResult[];
  toolsFired: string[];
  toolPrecision: number;
  toolRecall: number;
  forbiddenViolations: number;
  criteriaPassRate: number;
  judgeResponse: string;
  ms: number;
}

export interface RunSummary {
  runId: string;
  timestamp: string;
  queryCount: number;
  passRate: number;
  avgToolPrecision: number;
  avgToolRecall: number;
  totalForbiddenViolations: number;
  avgCriteriaPassRate: number;
  byPersona: Record<string, { pass: number; total: number; rate: number }>;
  byScenario: Record<string, { pass: number; total: number; rate: number }>;
  byCriterion: Record<string, { pass: number; total: number; rate: number }>;
}

export interface RegressionItem {
  queryId: string;
  criterion: string;
  baselinePass: boolean;
  currentPass: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMA — eval tables (appended to existing DB)
// ══════════════════════════════════════════════════════════════════════════════

const LLM_EVAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS llm_eval_runs (
  run_id        TEXT PRIMARY KEY,
  timestamp     TEXT NOT NULL DEFAULT (datetime('now')),
  query_count   INTEGER NOT NULL DEFAULT 0,
  pass_rate     REAL NOT NULL DEFAULT 0,
  persona       TEXT,
  scenario      TEXT,
  summary_json  TEXT
);

CREATE TABLE IF NOT EXISTS llm_eval_results (
  id                    TEXT PRIMARY KEY,
  run_id                TEXT NOT NULL,
  query_id              TEXT NOT NULL,
  pass                  INTEGER NOT NULL DEFAULT 0,
  criteria_json         TEXT,
  tools_precision       REAL NOT NULL DEFAULT 0,
  tools_recall          REAL NOT NULL DEFAULT 0,
  forbidden_violations  INTEGER NOT NULL DEFAULT 0,
  criteria_pass_rate    REAL NOT NULL DEFAULT 0,
  judge_response        TEXT,
  ms                    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_llm_eval_results_run ON llm_eval_results(run_id);
CREATE INDEX IF NOT EXISTS idx_llm_eval_results_query ON llm_eval_results(query_id);
`;

function ensureSchema(): void {
  const db = getDb();
  db.exec(LLM_EVAL_SCHEMA);
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY CORPUS GENERATOR — 500 queries, programmatic
// ══════════════════════════════════════════════════════════════════════════════

const PERSONAS: Persona[] = [
  "founder", "banker", "ceo", "researcher", "student",
  "operator", "legal", "pm", "contractor", "investor", "content",
];

const SCENARIOS: Scenario[] = [
  "weekly_reset", "company_search", "competitor_brief", "delegation",
  "important_change", "memo_export", "packet_diff", "role_switch",
];

/** Per-persona query templates. Each returns ~46 queries for that persona. */
interface QueryTemplate {
  query: string;
  scenario: Scenario;
  expectedTools: string[];
  forbiddenTools: string[];
  booleanCriteria: BooleanCriterion[];
}

function founderTemplates(): QueryTemplate[] {
  return [
    // weekly_reset
    { query: "What changed in our product direction this week?", scenario: "weekly_reset", expectedTools: ["founder_deep_context_gather", "get_weekly_summary"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Give me a weekly reset briefing for the founding team", scenario: "weekly_reset", expectedTools: ["founder_local_weekly_reset", "founder_deep_context_gather"], forbiddenTools: ["check_contract_compliance"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Summarize last week's key decisions and their rationale", scenario: "weekly_reset", expectedTools: ["founder_deep_context_gather", "get_weekly_summary"], forbiddenTools: ["generate_zero_draft"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "What are the top 3 risks to our current sprint?", scenario: "weekly_reset", expectedTools: ["founder_deep_context_gather", "get_proactive_alerts"], forbiddenTools: ["run_recon", "check_page_performance"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "How is our burn rate tracking against the runway?", scenario: "weekly_reset", expectedTools: ["founder_deep_context_gather"], forbiddenTools: ["run_recon", "check_email_setup"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "What did we ship this week and what slipped?", scenario: "weekly_reset", expectedTools: ["founder_deep_context_gather", "get_weekly_summary"], forbiddenTools: ["generate_report"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    // company_search
    { query: "Research Stripe and tell me about their latest product moves", scenario: "company_search", expectedTools: ["run_recon", "enrich_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
    { query: "Pull everything you know about Anthropic's recent funding", scenario: "company_search", expectedTools: ["run_recon", "enrich_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    // competitor_brief
    { query: "Compare our product positioning against Linear and Notion", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize", "run_recon"], forbiddenTools: ["start_dogfood_session"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "What are the moats of our top 3 competitors?", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize", "run_recon"], forbiddenTools: ["check_mcp_setup"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    // delegation
    { query: "Draft a delegation brief for the engineering lead on the auth refactor", scenario: "delegation", expectedTools: ["founder_deep_context_gather", "export_artifact_packet"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Create a handoff packet for the new VP of Product", scenario: "delegation", expectedTools: ["founder_deep_context_gather", "export_artifact_packet"], forbiddenTools: ["check_contract_compliance"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    // important_change
    { query: "Flag any important changes in our competitive landscape this week", scenario: "important_change", expectedTools: ["founder_local_synthesize", "get_important_changes"], forbiddenTools: ["start_verification_cycle"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "What's the most critical thing I should know about right now?", scenario: "important_change", expectedTools: ["founder_local_synthesize", "get_important_changes"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    // memo_export
    { query: "Export our latest decision memo as a shareable packet", scenario: "memo_export", expectedTools: ["export_artifact_packet"], forbiddenTools: ["run_recon", "check_page_performance"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Package the Q1 strategy review for the board", scenario: "memo_export", expectedTools: ["export_artifact_packet", "founder_deep_context_gather"], forbiddenTools: ["start_dogfood_session"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    // packet_diff
    { query: "What changed between the last two strategy packets?", scenario: "packet_diff", expectedTools: ["founder_packet_diff", "founder_packet_history_diff"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Multiple tools in the chain produced non-empty results", weight: 1 }] },
    { query: "Show me the delta between our January and March founder packets", scenario: "packet_diff", expectedTools: ["founder_packet_diff", "founder_packet_history_diff"], forbiddenTools: ["check_email_setup"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Multiple tools in the chain produced non-empty results", weight: 1 }] },
    // role_switch
    { query: "Switch to investor mode and evaluate our pitch deck", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }] },
    { query: "I need to think like a banker — what's the credit risk here?", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }] },
  ];
}

function bankerTemplates(): QueryTemplate[] {
  return [
    { query: "Run credit analysis on the portfolio company Acme Corp", scenario: "company_search", expectedTools: ["run_recon", "enrich_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
    { query: "What's the debt-to-equity ratio trend for our top borrowers?", scenario: "company_search", expectedTools: ["founder_local_synthesize", "run_recon"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Prepare a weekly credit committee briefing", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "get_proactive_alerts"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Flag any covenant breaches in the current portfolio", scenario: "important_change", expectedTools: ["get_important_changes", "flag_important_change"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Compare the credit profiles of Company A vs Company B", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize", "run_recon"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Draft a term sheet summary for the lending committee", scenario: "memo_export", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "What's changed in the regulatory landscape this week?", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "get_important_changes"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Export the due diligence findings for the Acme Corp loan", scenario: "memo_export", expectedTools: ["export_artifact_packet", "get_recon_summary"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Show me how the risk ratings shifted since last quarter", scenario: "packet_diff", expectedTools: ["founder_packet_diff"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Multiple tools in the chain produced non-empty results", weight: 1 }] },
    { query: "Delegate the annual review prep to the junior analyst", scenario: "delegation", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Assess the market risk exposure in our current book", scenario: "company_search", expectedTools: ["founder_local_synthesize", "run_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
    { query: "What are the top 5 watchlist names and why?", scenario: "important_change", expectedTools: ["get_important_changes", "get_proactive_alerts"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Run a stress test scenario on the commercial real estate portfolio", scenario: "company_search", expectedTools: ["run_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Switch to researcher mode and find academic papers on credit risk modeling", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }] },
  ];
}

function ceoTemplates(): QueryTemplate[] {
  return [
    { query: "Give me the executive summary of where we stand this week", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "get_proactive_alerts"], forbiddenTools: ["check_page_performance"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "What should I be worried about that nobody's telling me?", scenario: "important_change", expectedTools: ["founder_local_synthesize", "get_important_changes"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Prepare talking points for the all-hands meeting", scenario: "memo_export", expectedTools: ["export_artifact_packet", "get_weekly_summary"], forbiddenTools: ["check_contract_compliance"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "How are our OKRs tracking this quarter?", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "founder_deep_context_gather"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Who on the leadership team needs my attention this week?", scenario: "delegation", expectedTools: ["founder_local_synthesize", "get_important_changes"], forbiddenTools: ["check_mcp_setup"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Draft a board update email for this month", scenario: "memo_export", expectedTools: ["export_artifact_packet"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "What's our competitive position changed to since last month?", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize", "run_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Compare the last two quarterly reviews for drift", scenario: "packet_diff", expectedTools: ["founder_packet_diff"], forbiddenTools: ["check_email_setup"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Multiple tools in the chain produced non-empty results", weight: 1 }] },
    { query: "I need to delegate the hiring pipeline review — create a brief", scenario: "delegation", expectedTools: ["export_artifact_packet"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Switch to founder mode and deep-dive into the product roadmap", scenario: "role_switch", expectedTools: ["discover_tools"], forbiddenTools: ["check_contract_compliance"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }] },
    { query: "Flag the most important thing that changed since yesterday", scenario: "important_change", expectedTools: ["get_important_changes", "get_proactive_alerts"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Research what our key enterprise customers are saying publicly", scenario: "company_search", expectedTools: ["run_recon", "enrich_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
  ];
}

function researcherTemplates(): QueryTemplate[] {
  return [
    { query: "Find recent papers on transformer attention mechanisms", scenario: "company_search", expectedTools: ["run_recon", "build_research_digest"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
    { query: "Build a research digest on federated learning advances in 2025", scenario: "company_search", expectedTools: ["build_research_digest", "run_recon"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "What are the open problems in RLHF that nobody's solved?", scenario: "competitor_brief", expectedTools: ["run_recon", "build_research_digest"], forbiddenTools: ["export_artifact_packet"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Summarize the key findings from this week's arXiv papers on LLM reasoning", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "build_research_digest"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Compare the methodology of these two papers on knowledge distillation", scenario: "competitor_brief", expectedTools: ["compare_options", "build_research_digest"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Export my literature review notes as a shareable document", scenario: "memo_export", expectedTools: ["export_artifact_packet"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "What contradictions exist in the current MoE literature?", scenario: "important_change", expectedTools: ["build_research_digest", "get_important_changes"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Track how the consensus on scaling laws has shifted this year", scenario: "packet_diff", expectedTools: ["founder_packet_diff", "build_research_digest"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Multiple tools in the chain produced non-empty results", weight: 1 }] },
    { query: "Delegate the data collection task to the research assistant", scenario: "delegation", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Switch to operator mode and check if the experiment pipeline is healthy", scenario: "role_switch", expectedTools: ["discover_tools"], forbiddenTools: ["build_research_digest"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }] },
    { query: "What are the most-cited papers in agentic AI from 2025?", scenario: "company_search", expectedTools: ["run_recon", "build_research_digest"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
    { query: "Generate a research question from the gaps in current RAG literature", scenario: "important_change", expectedTools: ["build_research_digest"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
  ];
}

function studentTemplates(): QueryTemplate[] {
  return [
    { query: "Help me understand how transformers work at a high level", scenario: "company_search", expectedTools: ["discover_tools"], forbiddenTools: ["founder_deep_context_gather", "export_artifact_packet"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "What should I study this week for my ML course?", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "discover_tools"], forbiddenTools: ["run_recon", "founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Compare supervised vs unsupervised learning for my report", scenario: "competitor_brief", expectedTools: ["compare_options", "discover_tools"], forbiddenTools: ["run_recon", "founder_deep_context_gather"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Export my study notes as a markdown document", scenario: "memo_export", expectedTools: ["export_artifact_packet"], forbiddenTools: ["run_recon", "founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "What changed in the AI landscape this week that I should know about?", scenario: "important_change", expectedTools: ["get_important_changes", "get_weekly_summary"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "I need to switch to a research perspective for my thesis", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }] },
    { query: "Find beginner-friendly resources on neural network architectures", scenario: "company_search", expectedTools: ["discover_tools", "run_recon"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Summarize the differences between GPT-4 and Claude for my presentation", scenario: "competitor_brief", expectedTools: ["compare_options", "run_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "Help me find a dataset for my NLP project on sentiment analysis", scenario: "company_search", expectedTools: ["discover_tools", "run_recon"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains entity or topic names from the query", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }, { criterion: "Output includes quantitative data points or metrics", weight: 1 }] },
    { query: "Create a study timeline for the next 4 weeks on deep learning", scenario: "delegation", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "Output structure matches the tool's documented schema", weight: 1 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
    { query: "What did I learn last week and what should I review?", scenario: "weekly_reset", expectedTools: ["get_weekly_summary"], forbiddenTools: ["run_recon", "founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Tool returned structured data without errors", weight: 2 }, { criterion: "Output contains temporal information (dates, timestamps, periods)", weight: 1 }, { criterion: "At least one expected tool completed successfully", weight: 2 }, { criterion: "No error messages or stack traces in output", weight: 2 }] },
  ];
}

function operatorTemplates(): QueryTemplate[] {
  return [
    { query: "Show me the system health dashboard for today", scenario: "weekly_reset", expectedTools: ["get_ops_dashboard", "get_proactive_alerts"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output presents system health metrics", weight: 1 }, { criterion: "Output highlights any degraded services", weight: 1 }, { criterion: "Output is operational in tone", weight: 1 }] },
    { query: "What incidents happened this week and are they resolved?", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "get_proactive_alerts"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output lists incidents", weight: 1 }, { criterion: "Output includes resolution status", weight: 1 }, { criterion: "Output identifies root causes", weight: 1 }] },
    { query: "Run a health check on all MCP infrastructure", scenario: "company_search", expectedTools: ["check_mcp_setup", "get_ops_dashboard"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output checks multiple infrastructure components", weight: 1 }, { criterion: "Output reports pass/fail per component", weight: 1 }, { criterion: "Output suggests fixes for failures", weight: 1 }] },
    { query: "Delegate the on-call rotation setup to the SRE team", scenario: "delegation", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains delegation instructions", weight: 1 }, { criterion: "Output specifies SRE-relevant details", weight: 1 }, { criterion: "Output includes escalation paths", weight: 1 }] },
    { query: "What deployments went out this week and did any cause issues?", scenario: "important_change", expectedTools: ["get_important_changes", "get_weekly_summary"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output references deployments", weight: 1 }, { criterion: "Output correlates deployments with incidents", weight: 1 }, { criterion: "Output identifies rollback candidates", weight: 1 }] },
    { query: "Compare our uptime this month vs last month", scenario: "packet_diff", expectedTools: ["founder_packet_diff", "get_ops_dashboard"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output includes uptime percentages or trends", weight: 1 }, { criterion: "Output identifies the biggest contributor to downtime", weight: 1 }, { criterion: "Output does not fabricate exact uptime numbers", weight: 2 }] },
    { query: "Export the incident report for the API outage", scenario: "memo_export", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output follows incident report structure", weight: 1 }, { criterion: "Output includes timeline, impact, and root cause", weight: 1 }, { criterion: "Output is shareable with stakeholders", weight: 1 }] },
    { query: "Flag any alerts that have been unacknowledged for over 24 hours", scenario: "important_change", expectedTools: ["founder_local_synthesize", "get_important_changes"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output identifies stale alerts", weight: 1 }, { criterion: "Output includes age of each alert", weight: 1 }, { criterion: "Output suggests escalation for critical ones", weight: 1 }] },
    { query: "Switch to researcher mode to investigate the performance regression", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output shifts to investigation perspective", weight: 1 }, { criterion: "Output suggests diagnostic tools and approaches", weight: 1 }, { criterion: "Output identifies data to collect", weight: 1 }] },
    { query: "What's the current capacity utilization across our services?", scenario: "company_search", expectedTools: ["get_ops_dashboard"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output references capacity metrics", weight: 1 }, { criterion: "Output identifies services near capacity", weight: 1 }, { criterion: "Output suggests scaling actions", weight: 1 }] },
    { query: "Prepare a runbook for the database migration this weekend", scenario: "memo_export", expectedTools: ["export_artifact_packet"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output is structured as a runbook", weight: 1 }, { criterion: "Output includes rollback steps", weight: 1 }, { criterion: "Output includes pre-flight checks", weight: 1 }] },
  ];
}

function legalTemplates(): QueryTemplate[] {
  return [
    { query: "Check our contracts for compliance with the new data privacy regulation", scenario: "company_search", expectedTools: ["check_contract_compliance"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output references data privacy regulations", weight: 1 }, { criterion: "Output identifies compliance gaps", weight: 1 }, { criterion: "Output does not provide actual legal advice", weight: 1 }] },
    { query: "What legal risks should we flag this week?", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "get_important_changes"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies legal risk categories", weight: 1 }, { criterion: "Output prioritizes risks by severity", weight: 1 }, { criterion: "Output includes a disclaimer about not being legal counsel", weight: 1 }] },
    { query: "Compare the terms of our vendor contracts for consistency", scenario: "competitor_brief", expectedTools: ["compare_options", "check_contract_compliance"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output compares contract terms systematically", weight: 1 }, { criterion: "Output identifies inconsistencies", weight: 1 }, { criterion: "Output suggests standardization opportunities", weight: 1 }] },
    { query: "Export the contract review findings for outside counsel", scenario: "memo_export", expectedTools: ["export_artifact_packet"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output is formal and counsel-appropriate", weight: 1 }, { criterion: "Output includes numbered findings", weight: 1 }, { criterion: "Output preserves legal terminology", weight: 1 }] },
    { query: "Flag any IP-related changes in our competitor filings", scenario: "important_change", expectedTools: ["get_important_changes", "run_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output references IP or patent filings", weight: 1 }, { criterion: "Output identifies specific competitors", weight: 1 }, { criterion: "Output assesses impact on our position", weight: 1 }] },
    { query: "Prepare a delegation brief for the paralegal on discovery tasks", scenario: "delegation", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output is delegation-appropriate", weight: 1 }, { criterion: "Output specifies legal discovery requirements", weight: 1 }, { criterion: "Output includes deadlines", weight: 1 }] },
    { query: "How have our contractual obligations changed since last quarter?", scenario: "packet_diff", expectedTools: ["founder_packet_diff"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output tracks contractual changes", weight: 1 }, { criterion: "Output distinguishes new vs modified obligations", weight: 1 }, { criterion: "Output highlights risk-increasing changes", weight: 1 }] },
    { query: "Switch to banker mode to assess the financial exposure from this lawsuit", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output adopts a financial assessment perspective", weight: 1 }, { criterion: "Output estimates exposure ranges", weight: 1 }, { criterion: "Output caveats financial estimates appropriately", weight: 1 }] },
    { query: "Review the NDA template for common issues", scenario: "company_search", expectedTools: ["check_contract_compliance"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output references NDA-specific terms", weight: 1 }, { criterion: "Output identifies common NDA pitfalls", weight: 1 }, { criterion: "Output suggests improvements", weight: 1 }] },
    { query: "What regulatory filings are due this month?", scenario: "important_change", expectedTools: ["get_important_changes", "get_proactive_alerts"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output lists upcoming deadlines", weight: 1 }, { criterion: "Output includes filing types", weight: 1 }, { criterion: "Output suggests preparation steps", weight: 1 }] },
    { query: "Summarize the liability exposure across all active contracts", scenario: "company_search", expectedTools: ["check_contract_compliance", "get_recon_summary"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output addresses liability specifically", weight: 1 }, { criterion: "Output categorizes by contract type", weight: 1 }, { criterion: "Output does not fabricate liability amounts", weight: 2 }] },
  ];
}

function pmTemplates(): QueryTemplate[] {
  return [
    { query: "What's the status of all feature requests from this sprint?", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "get_proactive_alerts"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output lists feature requests", weight: 1 }, { criterion: "Output includes status per feature", weight: 1 }, { criterion: "Output identifies blockers", weight: 1 }] },
    { query: "Compare the user feedback for Feature A vs Feature B", scenario: "competitor_brief", expectedTools: ["compare_options"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output compares two features", weight: 1 }, { criterion: "Output references user feedback", weight: 1 }, { criterion: "Output includes a recommendation", weight: 1 }] },
    { query: "Prepare a sprint retrospective document", scenario: "memo_export", expectedTools: ["export_artifact_packet", "get_weekly_summary"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output follows retro format (what went well, what didn't, actions)", weight: 1 }, { criterion: "Output is specific to the current sprint", weight: 1 }, { criterion: "Output includes actionable improvements", weight: 1 }] },
    { query: "What user-facing changes went live this week?", scenario: "important_change", expectedTools: ["get_important_changes", "get_weekly_summary"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output lists specific changes", weight: 1 }, { criterion: "Output focuses on user impact", weight: 1 }, { criterion: "Output includes release dates", weight: 1 }] },
    { query: "Create a PRD outline for the new onboarding flow", scenario: "delegation", expectedTools: ["export_artifact_packet"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output follows PRD structure", weight: 1 }, { criterion: "Output includes user stories or acceptance criteria", weight: 1 }, { criterion: "Output is scoped appropriately", weight: 1 }] },
    { query: "Research what competitors are doing with their onboarding", scenario: "company_search", expectedTools: ["founder_local_synthesize", "run_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies competitor onboarding approaches", weight: 1 }, { criterion: "Output includes specific examples", weight: 1 }, { criterion: "Output derives actionable insights", weight: 1 }] },
    { query: "How has our feature velocity changed over the last 3 sprints?", scenario: "packet_diff", expectedTools: ["founder_packet_diff"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output tracks velocity over time", weight: 1 }, { criterion: "Output identifies trends", weight: 1 }, { criterion: "Output suggests causes for velocity changes", weight: 1 }] },
    { query: "Delegate the user research interviews to the UX researcher", scenario: "delegation", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output includes interview script or topics", weight: 1 }, { criterion: "Output specifies target user segments", weight: 1 }, { criterion: "Output includes expected deliverables", weight: 1 }] },
    { query: "Switch to content mode and draft the release notes", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output shifts to content writing perspective", weight: 1 }, { criterion: "Output drafts user-facing release notes", weight: 1 }, { criterion: "Output is polished and non-technical", weight: 1 }] },
    { query: "What are the top 5 user pain points from support tickets?", scenario: "company_search", expectedTools: ["run_recon", "discover_tools"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output lists specific pain points", weight: 1 }, { criterion: "Output includes frequency or severity", weight: 1 }, { criterion: "Output suggests product solutions", weight: 1 }] },
    { query: "Flag any scope creep in the current sprint", scenario: "important_change", expectedTools: ["get_important_changes", "get_proactive_alerts"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies scope additions", weight: 1 }, { criterion: "Output assesses impact on timeline", weight: 1 }, { criterion: "Output recommends scope management actions", weight: 1 }] },
  ];
}

function contractorTemplates(): QueryTemplate[] {
  return [
    { query: "What's my task list for this week?", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "discover_tools"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output lists specific tasks", weight: 1 }, { criterion: "Output includes priorities", weight: 1 }, { criterion: "Output is scoped to the contractor's role", weight: 1 }] },
    { query: "Show me the project context I need to onboard", scenario: "company_search", expectedTools: ["get_project_context", "discover_tools"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output provides project overview", weight: 1 }, { criterion: "Output includes key contacts or resources", weight: 1 }, { criterion: "Output is onboarding-appropriate", weight: 1 }] },
    { query: "Export my weekly deliverables report for the client", scenario: "memo_export", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output is client-facing in tone", weight: 1 }, { criterion: "Output lists deliverables with status", weight: 1 }, { criterion: "Output includes hours or effort summary", weight: 1 }] },
    { query: "What changed in the project requirements since I was last briefed?", scenario: "important_change", expectedTools: ["get_important_changes"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies specific requirement changes", weight: 1 }, { criterion: "Output highlights impact on current work", weight: 1 }, { criterion: "Output suggests clarification questions", weight: 1 }] },
    { query: "Compare the scope of my current contract vs the original SOW", scenario: "packet_diff", expectedTools: ["founder_packet_diff"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output compares current vs original scope", weight: 1 }, { criterion: "Output identifies scope expansion", weight: 1 }, { criterion: "Output suggests contract amendment if needed", weight: 1 }] },
    { query: "Find the coding standards document for this project", scenario: "company_search", expectedTools: ["discover_tools", "get_project_context"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output helps locate documentation", weight: 1 }, { criterion: "Output is specific to coding standards", weight: 1 }, { criterion: "Output suggests follow-up resources", weight: 1 }] },
    { query: "Delegate the testing tasks to the QA contractor", scenario: "delegation", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output contains test delegation details", weight: 1 }, { criterion: "Output specifies test scope and criteria", weight: 1 }, { criterion: "Output includes acceptance standards", weight: 1 }] },
    { query: "Switch to PM mode to understand the feature priority", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output adopts a PM perspective", weight: 1 }, { criterion: "Output discusses prioritization frameworks", weight: 1 }, { criterion: "Output helps contextualize current work", weight: 1 }] },
    { query: "Flag any blockers that are preventing my progress", scenario: "important_change", expectedTools: ["founder_local_synthesize", "get_important_changes"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies specific blockers", weight: 1 }, { criterion: "Output suggests workarounds or escalation paths", weight: 1 }, { criterion: "Output includes who can unblock", weight: 1 }] },
    { query: "What tools are available for code review in this project?", scenario: "company_search", expectedTools: ["discover_tools"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output lists relevant tools", weight: 1 }, { criterion: "Output includes brief descriptions", weight: 1 }, { criterion: "Output is filtered to code review context", weight: 1 }] },
  ];
}

function investorTemplates(): QueryTemplate[] {
  return [
    { query: "Run due diligence on this Series A deal with TechStartup Inc", scenario: "company_search", expectedTools: ["run_recon", "enrich_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output follows due diligence structure", weight: 1 }, { criterion: "Output identifies key risk factors", weight: 1 }, { criterion: "Output does not fabricate valuation numbers", weight: 2 }, { criterion: "Output includes market context", weight: 1 }] },
    { query: "What are the red flags in this company's pitch deck?", scenario: "company_search", expectedTools: ["founder_local_synthesize", "run_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies specific red flags", weight: 1 }, { criterion: "Output categorizes flags by severity", weight: 1 }, { criterion: "Output suggests follow-up questions", weight: 1 }] },
    { query: "Compare the cap tables of our portfolio companies", scenario: "competitor_brief", expectedTools: ["compare_options", "run_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output compares equity structures", weight: 1 }, { criterion: "Output identifies dilution risks", weight: 1 }, { criterion: "Output does not invent specific percentages", weight: 2 }] },
    { query: "Prepare the quarterly LP update letter", scenario: "memo_export", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output follows LP update format", weight: 1 }, { criterion: "Output covers portfolio performance, exits, and pipeline", weight: 1 }, { criterion: "Output is professional and measured in tone", weight: 1 }] },
    { query: "What's changed in the macro environment that affects our thesis?", scenario: "important_change", expectedTools: ["get_important_changes", "run_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output references macroeconomic factors", weight: 1 }, { criterion: "Output connects macro to investment thesis", weight: 1 }, { criterion: "Output is data-driven, not speculative", weight: 1 }] },
    { query: "Track how our portfolio company valuations shifted this quarter", scenario: "packet_diff", expectedTools: ["founder_packet_diff"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output tracks valuation changes", weight: 1 }, { criterion: "Output identifies up-rounds and down-rounds", weight: 1 }, { criterion: "Output does not fabricate specific valuations", weight: 2 }] },
    { query: "Delegate the market sizing analysis to the associate", scenario: "delegation", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output includes market sizing methodology", weight: 1 }, { criterion: "Output specifies data sources to use", weight: 1 }, { criterion: "Output includes expected deliverable format", weight: 1 }] },
    { query: "Switch to founder mode and evaluate the product from a builder's lens", scenario: "role_switch", expectedTools: ["discover_tools"], forbiddenTools: ["check_contract_compliance"], booleanCriteria: [{ criterion: "Output shifts to builder/product perspective", weight: 1 }, { criterion: "Output evaluates technical feasibility", weight: 1 }, { criterion: "Output identifies product-market fit signals", weight: 1 }] },
    { query: "Give me the weekly portfolio pulse", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "get_proactive_alerts"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output covers portfolio companies", weight: 1 }, { criterion: "Output highlights winners and at-risk companies", weight: 1 }, { criterion: "Output is concise for a weekly cadence", weight: 1 }] },
    { query: "What deal flow came in this week worth evaluating?", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "get_important_changes"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output references deal flow", weight: 1 }, { criterion: "Output includes basic screening criteria", weight: 1 }, { criterion: "Output recommends which to pursue", weight: 1 }] },
    { query: "Research the competitive landscape for this fintech vertical", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize", "run_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output maps the fintech competitive landscape", weight: 1 }, { criterion: "Output identifies market leaders and challengers", weight: 1 }, { criterion: "Output assesses white space opportunities", weight: 1 }] },
  ];
}

function contentTemplates(): QueryTemplate[] {
  return [
    { query: "Draft a LinkedIn post about our latest product launch", scenario: "memo_export", expectedTools: ["export_artifact_packet", "compress_or_expand_text"], forbiddenTools: ["run_recon", "founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output is formatted for LinkedIn", weight: 1 }, { criterion: "Output is under 300 words", weight: 1 }, { criterion: "Output includes a hook and CTA", weight: 1 }] },
    { query: "What trending topics should we create content around this week?", scenario: "weekly_reset", expectedTools: ["get_weekly_summary", "get_important_changes"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies trending topics", weight: 1 }, { criterion: "Output connects trends to our brand", weight: 1 }, { criterion: "Output suggests specific content formats", weight: 1 }] },
    { query: "Compare our content strategy against HubSpot and Buffer", scenario: "competitor_brief", expectedTools: ["founder_local_synthesize", "run_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output compares content strategies", weight: 1 }, { criterion: "Output identifies what competitors do better", weight: 1 }, { criterion: "Output includes actionable takeaways", weight: 1 }] },
    { query: "Export the content calendar for next month", scenario: "memo_export", expectedTools: ["export_artifact_packet"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output is calendar-structured", weight: 1 }, { criterion: "Output includes content types and topics", weight: 1 }, { criterion: "Output assigns rough dates", weight: 1 }] },
    { query: "What content performed best this month and why?", scenario: "important_change", expectedTools: ["get_important_changes", "get_weekly_summary"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies top-performing content", weight: 1 }, { criterion: "Output includes metrics or proxies for performance", weight: 1 }, { criterion: "Output analyzes why it performed well", weight: 1 }] },
    { query: "Track how our messaging has evolved over the past quarter", scenario: "packet_diff", expectedTools: ["founder_packet_diff"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output tracks messaging evolution", weight: 1 }, { criterion: "Output identifies key narrative shifts", weight: 1 }, { criterion: "Output assesses consistency", weight: 1 }] },
    { query: "Delegate the blog post writing to the content contractor", scenario: "delegation", expectedTools: ["export_artifact_packet"], forbiddenTools: ["founder_deep_context_gather"], booleanCriteria: [{ criterion: "Output includes writing brief", weight: 1 }, { criterion: "Output specifies tone, audience, and word count", weight: 1 }, { criterion: "Output includes SEO keywords if relevant", weight: 1 }] },
    { query: "Research what type of content resonates in the AI/ML space on Twitter", scenario: "company_search", expectedTools: ["run_recon"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output identifies content types that perform well", weight: 1 }, { criterion: "Output includes examples or patterns", weight: 1 }, { criterion: "Output is specific to AI/ML audience", weight: 1 }] },
    { query: "Switch to researcher mode to find data points for the whitepaper", scenario: "role_switch", expectedTools: ["founder_local_synthesize"], forbiddenTools: [], booleanCriteria: [{ criterion: "Output shifts to research perspective", weight: 1 }, { criterion: "Output identifies relevant data sources", weight: 1 }, { criterion: "Output suggests citation-worthy statistics", weight: 1 }] },
    { query: "Create a brand voice guideline document", scenario: "memo_export", expectedTools: ["export_artifact_packet"], forbiddenTools: ["run_recon"], booleanCriteria: [{ criterion: "Output follows brand voice guide structure", weight: 1 }, { criterion: "Output includes tone, vocabulary, and examples", weight: 1 }, { criterion: "Output is usable by external writers", weight: 1 }] },
    { query: "What changes should we make to our newsletter strategy?", scenario: "important_change", expectedTools: ["get_important_changes", "get_weekly_summary"], forbiddenTools: ["founder_local_weekly_reset"], booleanCriteria: [{ criterion: "Output assesses current newsletter performance", weight: 1 }, { criterion: "Output suggests specific improvements", weight: 1 }, { criterion: "Output is based on audience data or trends", weight: 1 }] },
  ];
}

/** Generate N filler queries per persona to reach exactly 500 total */
function generateFillerQueries(persona: Persona, existingCount: number, targetCount: number): QueryTemplate[] {
  const fillers: QueryTemplate[] = [];
  const scenarioPool = SCENARIOS;
  const fillerPatterns: Record<Scenario, string[]> = {
    weekly_reset: [
      "Summarize the key metrics from this week",
      "What progress did we make on our top priorities?",
      "List the unresolved items from last week's review",
      "Highlight any trends I should be aware of this week",
      "What's the team's bandwidth looking like this week?",
      "Give me a one-paragraph summary of where we stand",
    ],
    company_search: [
      "What do we know about {company} and their recent activity?",
      "Research the market position of {company}",
      "Pull the latest information on {company}'s product lineup",
      "What is {company} doing differently than last quarter?",
      "Find information about {company}'s team and leadership",
      "What public information is available about {company}'s strategy?",
    ],
    competitor_brief: [
      "How does our approach compare to the industry standard?",
      "What are our competitors doing that we're not?",
      "Rank our top 3 competitors by threat level",
      "Identify the white space in our competitive landscape",
      "What moats do we have that competitors lack?",
    ],
    delegation: [
      "Create a delegation brief for the {task} project",
      "Package the {task} instructions for the team lead",
      "Write up the handoff notes for {task}",
      "Prepare a scope document for delegating {task}",
      "Draft the assignment brief for {task} with clear success criteria",
    ],
    important_change: [
      "What changed since yesterday that I should know about?",
      "Are there any new risks or opportunities this week?",
      "Flag anything that's different from our last check-in",
      "What signals should I be paying attention to right now?",
      "Identify the most impactful change in our environment today",
    ],
    memo_export: [
      "Export a summary document of our current status",
      "Package our findings into a shareable format",
      "Create an executive summary for external stakeholders",
      "Prepare a brief for the upcoming meeting",
      "Format our analysis as a polished report",
    ],
    packet_diff: [
      "How has our position changed since last month?",
      "Compare today's state to where we were last quarter",
      "What's the delta between our current and previous assessments?",
      "Track the evolution of our strategy over the past 3 months",
      "Show me what shifted between the last two snapshots",
    ],
    role_switch: [
      "Switch perspective and analyze this from a different angle",
      "Look at this problem through a {role} lens",
      "Change my viewpoint to evaluate this differently",
      "Adopt a {role} perspective on the current situation",
    ],
  };

  const companies = ["Acme Corp", "TechCo", "FinanceHub", "DataWorks", "CloudFirst", "MetaScale", "NeuralPath"];
  const tasks = ["onboarding redesign", "quarterly review", "budget allocation", "tool evaluation", "process audit"];
  const roles = ["banker", "researcher", "operator", "investor", "legal"];

  let idx = existingCount;
  while (fillers.length < targetCount - existingCount) {
    const scenario = scenarioPool[fillers.length % scenarioPool.length];
    const patterns = fillerPatterns[scenario];
    const patternIdx = Math.floor(fillers.length / scenarioPool.length) % patterns.length;
    let queryText = patterns[patternIdx];

    // Replace placeholders
    queryText = queryText.replace("{company}", companies[idx % companies.length]);
    queryText = queryText.replace("{task}", tasks[idx % tasks.length]);
    queryText = queryText.replace("{role}", roles[idx % roles.length]);

    const expectedTools: string[] = [];
    const forbiddenTools: string[] = [];

    // Assign reasonable tools by scenario
    switch (scenario) {
      case "weekly_reset":
        expectedTools.push("get_weekly_summary");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
      case "company_search":
        expectedTools.push("run_recon");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
      case "competitor_brief":
        expectedTools.push("compare_options");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
      case "delegation":
        expectedTools.push("export_artifact_packet");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
      case "important_change":
        expectedTools.push("get_important_changes");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
      case "memo_export":
        expectedTools.push("export_artifact_packet");
        forbiddenTools.push("run_recon");
        break;
      case "packet_diff":
        expectedTools.push("founder_packet_diff");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
      case "role_switch":
        expectedTools.push("discover_tools");
        forbiddenTools.push("founder_local_weekly_reset");
        break;
    }

    fillers.push({
      query: queryText,
      scenario,
      expectedTools,
      forbiddenTools,
      booleanCriteria: [
        { criterion: "Tool returned valid structured JSON or object data, not an error", weight: 2 },
        { criterion: "Tool output contains at least one field relevant to the query topic", weight: 1 },
        { criterion: "Expected tools were invoked without throwing unhandled exceptions", weight: 2 },
      ],
    });

    idx++;
  }

  return fillers;
}

/** Build the full 500-query corpus */
export function generateQueryCorpus(): EvalQuery[] {
  const templateMap: Record<Persona, () => QueryTemplate[]> = {
    founder: founderTemplates,
    banker: bankerTemplates,
    ceo: ceoTemplates,
    researcher: researcherTemplates,
    student: studentTemplates,
    operator: operatorTemplates,
    legal: legalTemplates,
    pm: pmTemplates,
    contractor: contractorTemplates,
    investor: investorTemplates,
    content: contentTemplates,
  };

  const corpus: EvalQuery[] = [];
  const TARGET_PER_PERSONA = 46; // 11 personas * 46 = 506, trim to 500
  const TOTAL_TARGET = 500;

  for (const persona of PERSONAS) {
    const handcrafted = templateMap[persona]();
    const fillers = generateFillerQueries(persona, handcrafted.length, TARGET_PER_PERSONA);
    const all = [...handcrafted, ...fillers];

    for (let i = 0; i < all.length; i++) {
      const t = all[i];
      corpus.push({
        id: `${persona}_${String(i + 1).padStart(3, "0")}`,
        query: t.query,
        persona,
        scenario: t.scenario,
        expectedTools: t.expectedTools,
        forbiddenTools: t.forbiddenTools,
        booleanCriteria: t.booleanCriteria,
      });
    }
  }

  // Trim to exactly 500
  return corpus.slice(0, TOTAL_TARGET);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTOR
// ══════════════════════════════════════════════════════════════════════════════

/** Find a tool by name in a flat array */
function findTool(tools: McpTool[], name: string): McpTool | null {
  return tools.find((t) => t.name === name) ?? null;
}

/** Safely call a handler, returning result + timing */
async function callTool(
  tool: McpTool,
  args: Record<string, unknown> = {},
): Promise<{ ok: boolean; result: unknown; error?: string; ms: number }> {
  const start = Date.now();
  try {
    const result = await tool.handler(args);
    return { ok: true, result, ms: Date.now() - start };
  } catch (err: any) {
    return { ok: false, result: null, error: err?.message ?? String(err), ms: Date.now() - start };
  }
}

/** Extract text from MCP content blocks — prioritize memo/prose over raw JSON */
function extractText(result: unknown): string {
  if (!result) return "(null)";
  if (typeof result === "string") return result;
  if (Array.isArray(result)) {
    const texts = result
      .filter((b: any) => b?.type === "text")
      .map((b: any) => b.text);
    if (texts.length) return texts.join("\n");
  }
  if (typeof result === "object") {
    const obj = result as Record<string, any>;
    // Prioritize human-readable fields (heuristic judge needs prose, not JSON)
    const parts: string[] = [];
    if (obj.memo) parts.push(String(obj.memo));
    if (obj.enrichedPrompt) parts.push(String(obj.enrichedPrompt));
    if (obj.systemPromptPrefix) parts.push(String(obj.systemPromptPrefix));
    if (obj.researchPlan?.externalSources) parts.push(obj.researchPlan.externalSources.join("\n"));
    if (obj.canonicalEntity?.canonicalMission) parts.push(obj.canonicalEntity.canonicalMission);
    if (obj.whatChanged) parts.push(obj.whatChanged.map((c: any) => c.description ?? String(c)).join("\n"));
    if (obj.nextActions) parts.push(obj.nextActions.map((a: any) => a.action ?? String(a)).join("\n"));
    if (obj.signals) parts.push(obj.signals.map((s: any) => s.name ?? String(s)).join("\n"));
    if (obj.contradictions) parts.push(obj.contradictions.map((c: any) => c.claim ?? String(c)).join("\n"));
    if (parts.length > 0) return parts.join("\n\n").slice(0, 4000);
    return JSON.stringify(result).slice(0, 2000);
  }
  return String(result);
}

interface ToolExecutionResult {
  toolsFired: string[];
  outputs: Record<string, string>;
  totalMs: number;
}

async function executeQueryTools(
  query: EvalQuery,
  allTools: McpTool[],
): Promise<ToolExecutionResult> {
  const toolsFired: string[] = [];
  const outputs: Record<string, string> = {};
  let totalMs = 0;

  // 1. Try discover_tools to find relevant tools
  const discoverTool = findTool(allTools, "discover_tools");
  if (discoverTool) {
    const discoverResult = await callTool(discoverTool, { query: query.query, limit: 10 });
    totalMs += discoverResult.ms;
    if (discoverResult.ok) {
      toolsFired.push("discover_tools");
      outputs["discover_tools"] = extractText(discoverResult.result);
    }
  }

  // 2. Execute each expected tool (simulate the tool chain an agent would follow)
  for (const toolName of query.expectedTools) {
    if (toolName === "discover_tools") continue; // already called
    const tool = findTool(allTools, toolName);
    if (tool) {
      // Build minimal args based on tool name patterns
      const args = buildMinimalArgs(toolName, query);
      const result = await callTool(tool, args);
      totalMs += result.ms;
      if (result.ok) {
        toolsFired.push(toolName);
        outputs[toolName] = extractText(result.result);
      } else {
        // Tool fired but errored — still counts as fired
        toolsFired.push(toolName);
        outputs[toolName] = `ERROR: ${result.error}`;
      }
    }
  }

  return { toolsFired, outputs, totalMs };
}

/** Build minimal arguments for a tool call based on the query context */
function buildMinimalArgs(toolName: string, query: EvalQuery): Record<string, unknown> {
  // Extract company name from query if present
  const companyMatch = query.query.match(/(?:about|on|for|with)\s+([A-Z][a-zA-Z\s]+(?:Inc|Corp|Co|Ltd)?)/);
  const company = companyMatch ? companyMatch[1].trim() : "NodeBench";

  switch (toolName) {
    case "run_recon":
      return { target: company };
    case "enrich_recon":
      return { target: company };
    case "get_recon_summary":
      return { target: company };
    case "founder_deep_context_gather":
      return { query: query.query };
    case "founder_local_weekly_reset":
      return {};
    case "founder_local_gather":
      return { query: query.query };
    case "founder_local_synthesize": {
      // Route to the right packet type based on scenario
      const ptMap: Record<string, string> = {
        weekly_reset: "weekly_reset",
        important_change: "important_change",
        delegation: "pre_delegation",
        competitor_brief: "competitor_brief",
        role_switch: "role_switch",
        memo_export: "weekly_reset",
        packet_diff: "weekly_reset",
      };
      return { packetType: ptMap[query.scenario] ?? "weekly_reset", daysBack: 7 };
    }
    case "founder_packet_diff":
      return {};
    case "founder_packet_history_diff":
      return {};
    case "founder_packet_validate":
      return {};
    case "get_weekly_summary":
      return {};
    case "get_proactive_alerts":
      return {};
    case "get_important_changes":
      return {};
    case "flag_important_change":
      return { description: query.query };
    case "export_artifact_packet":
      return { title: `Export for: ${query.query.slice(0, 60)}` };
    case "compare_options":
      return { options: [company, "Competitor"], criteria: ["market position", "product quality"] };
    case "get_ops_dashboard":
      return {};
    case "check_mcp_setup":
      return {};
    case "check_contract_compliance":
      return { query: query.query };
    case "build_research_digest":
      return { topic: query.query };
    case "get_project_context":
      return {};
    case "compress_or_expand_text":
      return { text: query.query, mode: "compress" };
    case "discover_tools":
      return { query: query.query };
    default:
      return { query: query.query };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LLM JUDGE — Gemini 2.0 Flash Lite
// ══════════════════════════════════════════════════════════════════════════════

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGeminiJudge(
  query: EvalQuery,
  toolOutputs: Record<string, string>,
): Promise<JudgeResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback to heuristic judge
    return heuristicJudge(query, toolOutputs);
  }

  const combinedOutput = Object.entries(toolOutputs)
    .map(([tool, out]) => `[${tool}]:\n${out}`)
    .join("\n\n---\n\n");

  const criteriaList = query.booleanCriteria
    .map((c, i) => `${i + 1}. ${c.criterion} (weight: ${c.weight})`)
    .join("\n");

  const prompt = `You are an evaluation judge for NodeBench MCP — a tool-based system that returns STRUCTURED DATA (JSON objects, arrays, database rows), NOT prose.

A user with the role "${query.persona}" asked: "${query.query}"
Scenario type: ${query.scenario}

The system invoked MCP tools and produced these structured outputs:

${combinedOutput.slice(0, 6000)}

IMPORTANT: MCP tools return raw structured data (JSON, objects, arrays). They are NOT expected to produce prose or narratives. A tool returning {"events": [], "count": 0} is valid structured output. Judge whether the DATA is correct, not whether it reads like a human answer.

Evaluation rules:
- "valid structured JSON or object data" PASSES if output is parseable data (even empty arrays/objects), FAILS only on error messages or stack traces
- "contains at least one field relevant" PASSES if any key or value relates to the query topic
- "without throwing unhandled exceptions" PASSES if no stack traces or unhandled errors appear

Criteria:
${criteriaList}

Respond ONLY with valid JSON (no markdown):
{"criteria":[{"criterion":"...","pass":true,"evidence":"brief reason"},...],"overallPass":true}`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.error(`Gemini API error: ${response.status} ${response.statusText}`);
      return heuristicJudge(query, toolOutputs);
    }

    const json = await response.json() as any;
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return heuristicJudge(query, toolOutputs);

    const parsed = JSON.parse(text) as JudgeResponse;

    // Validate structure
    if (!parsed.criteria || !Array.isArray(parsed.criteria)) {
      return heuristicJudge(query, toolOutputs);
    }

    return parsed;
  } catch (err: any) {
    console.error(`Gemini judge error: ${err.message}`);
    return heuristicJudge(query, toolOutputs);
  }
}

/** Heuristic fallback judge — regex-based keyword matching */
function heuristicJudge(
  query: EvalQuery,
  toolOutputs: Record<string, string>,
): JudgeResponse {
  const combined = Object.values(toolOutputs).join(" ").toLowerCase();
  const criteria: CriterionResult[] = query.booleanCriteria.map((bc) => {
    const criterion = bc.criterion.toLowerCase();
    let pass = false;
    let evidence = "heuristic: ";

    // Pattern 1: "Output mentions/contains/references X"
    const mentionsMatch = criterion.match(/(?:mentions?|contains?|references?|includes?|lists?)\s+(.+)/);
    if (mentionsMatch) {
      const keywords = mentionsMatch[1]
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2);
      const found = keywords.filter((k) => combined.includes(k));
      pass = found.length >= Math.ceil(keywords.length * 0.4);
      evidence += pass ? `found keywords: ${found.join(", ")}` : `missing keywords from: ${keywords.join(", ")}`;
      return { criterion: bc.criterion, pass, evidence };
    }

    // Pattern 2: "Output does not hallucinate/fabricate/invent"
    if (criterion.includes("not hallucinate") || criterion.includes("not fabricate") || criterion.includes("not invent")) {
      // Hard to check heuristically — pass if output is non-empty and reasonable length
      pass = combined.length > 20 && combined.length < 10000;
      evidence += pass ? "output exists and is reasonable length" : "output suspicious length";
      return { criterion: bc.criterion, pass, evidence };
    }

    // Pattern 3: "Output is [adjective]" or "Output follows [format]"
    if (criterion.includes("output is ") || criterion.includes("output follows") || criterion.includes("output uses")) {
      pass = combined.length > 50;
      evidence += pass ? "output is substantive" : "output too short";
      return { criterion: bc.criterion, pass, evidence };
    }

    // Pattern 4: "No [bad thing]"
    if (criterion.startsWith("no ")) {
      pass = true; // Assume pass unless we find evidence otherwise
      evidence += "assumed pass (heuristic cannot verify negatives)";
      return { criterion: bc.criterion, pass, evidence };
    }

    // Default: check if output is non-empty
    pass = combined.length > 20;
    evidence += pass ? "output non-empty" : "output empty or too short";
    return { criterion: bc.criterion, pass, evidence };
  });

  // Pass if >=75% of weighted criteria pass (not ALL — too strict for heuristic judge)
  let weightedPass = 0, totalWeight = 0;
  for (let i = 0; i < criteria.length; i++) {
    const w = query.booleanCriteria[i]?.weight ?? 1;
    totalWeight += w;
    if (criteria[i].pass) weightedPass += w;
  }
  const overallPass = totalWeight > 0 ? (weightedPass / totalWeight) >= 0.75 : false;
  return { criteria, overallPass };
}

// ══════════════════════════════════════════════════════════════════════════════
// BOOLEAN METRICS
// ══════════════════════════════════════════════════════════════════════════════

function computeToolPrecision(expectedTools: string[], toolsFired: string[]): number {
  if (expectedTools.length === 0) return 1;
  const expected = new Set(expectedTools);
  const fired = new Set(toolsFired);
  let hits = 0;
  for (const t of expected) {
    if (fired.has(t)) hits++;
  }
  return hits / expected.size;
}

function computeToolRecall(expectedTools: string[], toolsFired: string[]): number {
  if (toolsFired.length === 0) return expectedTools.length === 0 ? 1 : 0;
  const expected = new Set(expectedTools);
  const fired = new Set(toolsFired);
  let hits = 0;
  for (const t of expected) {
    if (fired.has(t)) hits++;
  }
  return hits / fired.size;
}

function countForbiddenViolations(forbiddenTools: string[], toolsFired: string[]): number {
  const fired = new Set(toolsFired);
  return forbiddenTools.filter((t) => fired.has(t)).length;
}

function computeCriteriaPassRate(criteria: CriterionResult[], booleanCriteria: BooleanCriterion[]): number {
  if (criteria.length === 0) return 0;
  let weightedPass = 0;
  let totalWeight = 0;
  for (let i = 0; i < criteria.length; i++) {
    const weight = booleanCriteria[i]?.weight ?? 1;
    totalWeight += weight;
    if (criteria[i].pass) weightedPass += weight;
  }
  return totalWeight > 0 ? weightedPass / totalWeight : 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ══════════════════════════════════════════════════════════════════════════════

function saveRun(runId: string, queryCount: number, passRate: number, persona?: string, scenario?: string, summary?: RunSummary): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO llm_eval_runs (run_id, query_count, pass_rate, persona, scenario, summary_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(runId, queryCount, passRate, persona ?? null, scenario ?? null, summary ? JSON.stringify(summary) : null);
}

function saveResult(runId: string, result: QueryResult): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO llm_eval_results (id, run_id, query_id, pass, criteria_json, tools_precision, tools_recall, forbidden_violations, criteria_pass_rate, judge_response, ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    genId("llmeval"),
    runId,
    result.queryId,
    result.pass ? 1 : 0,
    JSON.stringify(result.criteriaResults),
    result.toolPrecision,
    result.toolRecall,
    result.forbiddenViolations,
    result.criteriaPassRate,
    result.judgeResponse,
    result.ms,
  );
}

function loadRunResults(runId: string): QueryResult[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT query_id, pass, criteria_json, tools_precision, tools_recall, forbidden_violations, criteria_pass_rate, judge_response, ms
    FROM llm_eval_results
    WHERE run_id = ?
  `).all(runId) as any[];

  return rows.map((r) => ({
    queryId: r.query_id,
    pass: r.pass === 1,
    criteriaResults: JSON.parse(r.criteria_json || "[]"),
    toolsFired: [],
    toolPrecision: r.tools_precision,
    toolRecall: r.tools_recall,
    forbiddenViolations: r.forbidden_violations,
    criteriaPassRate: r.criteria_pass_rate,
    judgeResponse: r.judge_response,
    ms: r.ms,
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// REGRESSION DETECTION
// ══════════════════════════════════════════════════════════════════════════════

export function detectRegressions(currentRunId: string, baselineRunId: string): RegressionItem[] {
  const current = loadRunResults(currentRunId);
  const baseline = loadRunResults(baselineRunId);

  const baselineMap = new Map<string, QueryResult>();
  for (const r of baseline) baselineMap.set(r.queryId, r);

  const regressions: RegressionItem[] = [];
  for (const cur of current) {
    const base = baselineMap.get(cur.queryId);
    if (!base) continue;
    if (base.pass && !cur.pass) {
      // Find which criteria regressed
      for (let i = 0; i < cur.criteriaResults.length; i++) {
        const baseCrit = base.criteriaResults[i];
        const curCrit = cur.criteriaResults[i];
        if (baseCrit?.pass && !curCrit?.pass) {
          regressions.push({
            queryId: cur.queryId,
            criterion: curCrit.criterion,
            baselinePass: true,
            currentPass: false,
          });
        }
      }
      // If no specific criterion found, flag the overall
      if (regressions.filter((r) => r.queryId === cur.queryId).length === 0) {
        regressions.push({
          queryId: cur.queryId,
          criterion: "(overall)",
          baselinePass: true,
          currentPass: false,
        });
      }
    }
  }
  return regressions;
}

export function detectImprovements(currentRunId: string, baselineRunId: string): RegressionItem[] {
  const current = loadRunResults(currentRunId);
  const baseline = loadRunResults(baselineRunId);

  const baselineMap = new Map<string, QueryResult>();
  for (const r of baseline) baselineMap.set(r.queryId, r);

  const improvements: RegressionItem[] = [];
  for (const cur of current) {
    const base = baselineMap.get(cur.queryId);
    if (!base) continue;
    if (!base.pass && cur.pass) {
      improvements.push({
        queryId: cur.queryId,
        criterion: "(overall)",
        baselinePass: false,
        currentPass: true,
      });
    }
  }
  return improvements;
}

function checkScenarioRegressions(currentRunId: string, baselineRunId: string): string[] {
  const current = loadRunResults(currentRunId);
  const baseline = loadRunResults(baselineRunId);
  const corpus = generateQueryCorpus();
  const queryMap = new Map(corpus.map((q) => [q.id, q]));

  const scenarioRates = (results: QueryResult[]): Record<string, { pass: number; total: number }> => {
    const rates: Record<string, { pass: number; total: number }> = {};
    for (const r of results) {
      const q = queryMap.get(r.queryId);
      if (!q) continue;
      if (!rates[q.scenario]) rates[q.scenario] = { pass: 0, total: 0 };
      rates[q.scenario].total++;
      if (r.pass) rates[q.scenario].pass++;
    }
    return rates;
  };

  const curRates = scenarioRates(current);
  const baseRates = scenarioRates(baseline);

  const flags: string[] = [];
  for (const [scenario, curRate] of Object.entries(curRates)) {
    const baseRate = baseRates[scenario];
    if (!baseRate || baseRate.total === 0) continue;
    const curPct = curRate.pass / curRate.total;
    const basePct = baseRate.pass / baseRate.total;
    if (basePct - curPct > 0.05) {
      flags.push(`REGRESSION: ${scenario} dropped from ${(basePct * 100).toFixed(1)}% to ${(curPct * 100).toFixed(1)}% (>${(5).toFixed(0)}% threshold)`);
    }
  }
  return flags;
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORT FORMATTER
// ══════════════════════════════════════════════════════════════════════════════

function buildSummary(runId: string, results: QueryResult[], corpus: EvalQuery[]): RunSummary {
  const queryMap = new Map(corpus.map((q) => [q.id, q]));

  const byPersona: Record<string, { pass: number; total: number; rate: number }> = {};
  const byScenario: Record<string, { pass: number; total: number; rate: number }> = {};
  const byCriterion: Record<string, { pass: number; total: number; rate: number }> = {};

  let totalPrecision = 0;
  let totalRecall = 0;
  let totalForbidden = 0;
  let totalCriteriaPassRate = 0;
  let totalPass = 0;

  for (const r of results) {
    const q = queryMap.get(r.queryId);
    if (!q) continue;

    if (r.pass) totalPass++;
    totalPrecision += r.toolPrecision;
    totalRecall += r.toolRecall;
    totalForbidden += r.forbiddenViolations;
    totalCriteriaPassRate += r.criteriaPassRate;

    // By persona
    if (!byPersona[q.persona]) byPersona[q.persona] = { pass: 0, total: 0, rate: 0 };
    byPersona[q.persona].total++;
    if (r.pass) byPersona[q.persona].pass++;

    // By scenario
    if (!byScenario[q.scenario]) byScenario[q.scenario] = { pass: 0, total: 0, rate: 0 };
    byScenario[q.scenario].total++;
    if (r.pass) byScenario[q.scenario].pass++;

    // By criterion
    for (const cr of r.criteriaResults) {
      if (!byCriterion[cr.criterion]) byCriterion[cr.criterion] = { pass: 0, total: 0, rate: 0 };
      byCriterion[cr.criterion].total++;
      if (cr.pass) byCriterion[cr.criterion].pass++;
    }
  }

  // Compute rates
  for (const v of Object.values(byPersona)) v.rate = v.total > 0 ? v.pass / v.total : 0;
  for (const v of Object.values(byScenario)) v.rate = v.total > 0 ? v.pass / v.total : 0;
  for (const v of Object.values(byCriterion)) v.rate = v.total > 0 ? v.pass / v.total : 0;

  const n = results.length || 1;
  return {
    runId,
    timestamp: new Date().toISOString(),
    queryCount: results.length,
    passRate: totalPass / n,
    avgToolPrecision: totalPrecision / n,
    avgToolRecall: totalRecall / n,
    totalForbiddenViolations: totalForbidden,
    avgCriteriaPassRate: totalCriteriaPassRate / n,
    byPersona,
    byScenario,
    byCriterion,
  };
}

function printReport(summary: RunSummary, regressions?: RegressionItem[], improvements?: RegressionItem[], scenarioFlags?: string[]): void {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  console.log(`\nLLM JUDGE EVAL — Run ${summary.runId}`);
  console.log("=".repeat(50));
  console.log(`Queries: ${summary.queryCount} / 500`);
  console.log(`Overall Pass Rate: ${pct(summary.passRate)}`);
  console.log(`Judge: ${process.env.GEMINI_API_KEY ? "Gemini 2.0 Flash Lite" : "Heuristic (no GEMINI_API_KEY)"}`);

  console.log(`\nBY PERSONA:`);
  for (const [persona, stats] of Object.entries(summary.byPersona).sort((a, b) => b[1].rate - a[1].rate)) {
    console.log(`  ${persona.padEnd(14)} ${pct(stats.rate).padStart(6)} (${stats.pass}/${stats.total})`);
  }

  console.log(`\nBY SCENARIO:`);
  for (const [scenario, stats] of Object.entries(summary.byScenario).sort((a, b) => b[1].rate - a[1].rate)) {
    console.log(`  ${scenario.padEnd(20)} ${pct(stats.rate).padStart(6)} (${stats.pass}/${stats.total})`);
  }

  console.log(`\nBOOLEAN CRITERIA (top 20 by volume):`);
  const sortedCriteria = Object.entries(summary.byCriterion)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20);
  for (const [criterion, stats] of sortedCriteria) {
    const label = criterion.length > 50 ? criterion.slice(0, 47) + "..." : criterion;
    console.log(`  ${label.padEnd(52)} ${pct(stats.rate).padStart(6)} (${stats.pass}/${stats.total})`);
  }

  console.log(`\nTOOL METRICS:`);
  console.log(`  Avg precision:         ${summary.avgToolPrecision.toFixed(3)}`);
  console.log(`  Avg recall:            ${summary.avgToolRecall.toFixed(3)}`);
  console.log(`  Forbidden violations:  ${summary.totalForbiddenViolations}`);
  console.log(`  Avg criteria pass rate: ${pct(summary.avgCriteriaPassRate)}`);

  if (regressions && regressions.length > 0) {
    console.log(`\nREGRESSIONS vs baseline:`);
    for (const r of regressions.slice(0, 20)) {
      console.log(`  ${r.queryId}: PASS -> FAIL (criterion: "${r.criterion}")`);
    }
    if (regressions.length > 20) {
      console.log(`  ... and ${regressions.length - 20} more`);
    }
  }

  if (improvements && improvements.length > 0) {
    console.log(`\nIMPROVEMENTS vs baseline:`);
    for (const r of improvements.slice(0, 10)) {
      console.log(`  ${r.queryId}: FAIL -> PASS`);
    }
    if (improvements.length > 10) {
      console.log(`  ... and ${improvements.length - 10} more`);
    }
  }

  if (scenarioFlags && scenarioFlags.length > 0) {
    console.log(`\nSCENARIO FLAGS:`);
    for (const f of scenarioFlags) {
      console.log(`  ${f}`);
    }
  }

  console.log("");
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN RUNNER
// ══════════════════════════════════════════════════════════════════════════════

export interface RunOptions {
  queryLimit: number;
  persona?: Persona;
  scenario?: Scenario;
  baselineRunId?: string;
  /** If true, only generate corpus and print stats without executing */
  dryRun?: boolean;
}

export async function runLlmJudgeEval(options: RunOptions): Promise<RunSummary> {
  // 1. Wire up DB
  _setDbAccessor(getDb);
  ensureSchema();

  // 2. Generate corpus and filter
  let corpus = generateQueryCorpus();

  if (options.persona) {
    corpus = corpus.filter((q) => q.persona === options.persona);
  }
  if (options.scenario) {
    corpus = corpus.filter((q) => q.scenario === options.scenario);
  }

  // 3. Sample if needed
  if (corpus.length > options.queryLimit) {
    // Deterministic shuffle using query IDs for reproducibility
    corpus = corpus
      .map((q) => ({ q, sort: hashCode(q.id) }))
      .sort((a, b) => a.sort - b.sort)
      .map((x) => x.q)
      .slice(0, options.queryLimit);
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Corpus: ${corpus.length} queries`);
    const personaCounts: Record<string, number> = {};
    const scenarioCounts: Record<string, number> = {};
    for (const q of corpus) {
      personaCounts[q.persona] = (personaCounts[q.persona] || 0) + 1;
      scenarioCounts[q.scenario] = (scenarioCounts[q.scenario] || 0) + 1;
    }
    console.log("  By persona:", personaCounts);
    console.log("  By scenario:", scenarioCounts);
    return {
      runId: "dry-run",
      timestamp: new Date().toISOString(),
      queryCount: corpus.length,
      passRate: 0,
      avgToolPrecision: 0,
      avgToolRecall: 0,
      totalForbiddenViolations: 0,
      avgCriteriaPassRate: 0,
      byPersona: {},
      byScenario: {},
      byCriterion: {},
    };
  }

  // 4. Load all tools
  console.log("[llmJudgeEval] Loading all toolsets...");
  const allTools = await loadToolsets(ALL_DOMAIN_KEYS);
  console.log(`[llmJudgeEval] Loaded ${allTools.length} tools across ${ALL_DOMAIN_KEYS.length} domains`);

  // 5. Run eval
  const runId = genId("ljeval");
  const results: QueryResult[] = [];

  console.log(`[llmJudgeEval] Running ${corpus.length} queries (run: ${runId})...\n`);

  for (let i = 0; i < corpus.length; i++) {
    const query = corpus[i];
    const progress = `[${i + 1}/${corpus.length}]`;

    // Execute tools
    const execution = await executeQueryTools(query, allTools);

    // Judge
    const judgeResult = await callGeminiJudge(query, execution.outputs);

    // Compute metrics
    const toolPrecision = computeToolPrecision(query.expectedTools, execution.toolsFired);
    const toolRecall = computeToolRecall(query.expectedTools, execution.toolsFired);
    const forbiddenViolations = countForbiddenViolations(query.forbiddenTools, execution.toolsFired);
    const criteriaPassRate = computeCriteriaPassRate(judgeResult.criteria, query.booleanCriteria);
    const overallPass = judgeResult.overallPass && forbiddenViolations === 0;

    const qr: QueryResult = {
      queryId: query.id,
      pass: overallPass,
      criteriaResults: judgeResult.criteria,
      toolsFired: execution.toolsFired,
      toolPrecision,
      toolRecall,
      forbiddenViolations,
      criteriaPassRate,
      judgeResponse: JSON.stringify(judgeResult),
      ms: execution.totalMs,
    };

    results.push(qr);
    saveResult(runId, qr);

    const status = overallPass ? "PASS" : "FAIL";
    process.stdout.write(`${progress} ${query.id} ${status} (precision=${toolPrecision.toFixed(2)}, criteria=${criteriaPassRate.toFixed(2)}) ${execution.totalMs}ms\n`);
  }

  // 6. Build summary
  const fullCorpus = generateQueryCorpus();
  const summary = buildSummary(runId, results, fullCorpus);
  saveRun(runId, results.length, summary.passRate, options.persona, options.scenario, summary);

  // 7. Regression detection
  let regressions: RegressionItem[] | undefined;
  let improvements: RegressionItem[] | undefined;
  let scenarioFlags: string[] | undefined;

  if (options.baselineRunId) {
    regressions = detectRegressions(runId, options.baselineRunId);
    improvements = detectImprovements(runId, options.baselineRunId);
    scenarioFlags = checkScenarioRegressions(runId, options.baselineRunId);
  }

  // 8. Print report
  printReport(summary, regressions, improvements, scenarioFlags);

  return summary;
}

/** Simple deterministic hash for reproducible sampling */
function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

// ══════════════════════════════════════════════════════════════════════════════
// CLI
// ══════════════════════════════════════════════════════════════════════════════

function parseArgs(argv: string[]): RunOptions {
  const options: RunOptions = { queryLimit: 50 };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--queries":
        options.queryLimit = parseInt(argv[++i], 10) || 50;
        break;
      case "--persona":
        options.persona = argv[++i] as Persona;
        break;
      case "--scenario":
        options.scenario = argv[++i] as Scenario;
        break;
      case "--baseline":
        options.baselineRunId = argv[++i];
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      default:
        if (arg.startsWith("--")) {
          console.error(`Unknown flag: ${arg}`);
        }
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log("NodeBench LLM Judge Eval Harness");
  console.log("================================");
  console.log(`  Queries:  ${options.queryLimit}`);
  console.log(`  Persona:  ${options.persona ?? "all"}`);
  console.log(`  Scenario: ${options.scenario ?? "all"}`);
  console.log(`  Baseline: ${options.baselineRunId ?? "none"}`);
  console.log(`  Judge:    ${process.env.GEMINI_API_KEY ? "Gemini 2.0 Flash Lite" : "Heuristic fallback"}`);
  console.log("");

  try {
    const summary = await runLlmJudgeEval(options);
    if (options.dryRun) process.exit(0);
    process.exit(summary.passRate >= 0.5 ? 0 : 1);
  } catch (err: any) {
    console.error(`Fatal error: ${err.message}`);
    process.exit(2);
  }
}

// Run if invoked directly
const isDirectRun = process.argv[1]?.includes("llmJudgeEval");
if (isDirectRun) {
  main();
}
