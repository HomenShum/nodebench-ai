/**
 * Ablation Test Harness for MCP Tool Discovery
 *
 * Tests which search strategies matter for each user segment:
 * - New users: vague, natural language, no tool names
 * - Experienced users: domain keywords, knows categories
 * - Power users: exact tool names, multi-step chains
 *
 * Usage:
 *   npx tsx scripts/ablation-test.ts
 *   npx tsx scripts/ablation-test.ts --segment new
 *   npx tsx scripts/ablation-test.ts --segment power --verbose
 */

import {
  hybridSearch,
  ALL_REGISTRY_ENTRIES,
  type SearchResult,
} from "../src/tools/toolRegistry.js";
import { TOOL_TO_TOOLSET } from "../src/toolsetRegistry.js";

// ── Types ──────────────────────────────────────────────────────────────

interface AblationConfig {
  name: string;
  description: string;
  ablation: Record<string, boolean>;
}

interface QueryCase {
  query: string;
  expectedTools: string[];     // ground truth: must appear in top K
  expectedToolsets: string[];  // ground truth: toolsets that should be suggested
  k: number;                   // Recall@K threshold
}

interface SegmentCorpus {
  name: string;
  description: string;
  queries: QueryCase[];
}

interface AblationResult {
  config: string;
  segment: string;
  recallAt1: number;
  recallAt3: number;
  recallAt5: number;
  mrr: number;
  toolsetAccuracy: number;
  falsePositiveRate: number;
  avgScore: number;
  queries: number;
}

// ── Query Corpora ──────────────────────────────────────────────────────

const NEW_USER_CORPUS: SegmentCorpus = {
  name: "new_user",
  description: "Vague, natural language queries from someone who just installed the MCP",
  queries: [
    // Web / content tasks — no tool names
    { query: "I want to check if my website is fast", expectedTools: ["seo_audit_url"], expectedToolsets: ["seo"], k: 5 },
    { query: "can you look at this webpage for me", expectedTools: ["fetch_url"], expectedToolsets: ["web"], k: 5 },
    { query: "help me write a better readme", expectedTools: ["generate_report"], expectedToolsets: [], k: 5 },
    // File tasks — colloquial
    { query: "open this csv and show me the data", expectedTools: ["csv_select_rows", "read_csv_file"], expectedToolsets: ["local_file"], k: 5 },
    { query: "what's in this json file", expectedTools: ["read_json_file"], expectedToolsets: ["local_file"], k: 5 },
    { query: "I need to look at what's in this zip file", expectedTools: ["zip_read_text_file", "zip_list_files", "zip_extract_file"], expectedToolsets: ["local_file"], k: 5 },
    // Communication — informal
    { query: "send an email to my boss", expectedTools: ["send_email"], expectedToolsets: ["email"], k: 5 },
    { query: "check my inbox", expectedTools: ["read_emails", "check_agent_inbox"], expectedToolsets: ["email"], k: 5 },
    // Code quality — vague
    { query: "is my code any good", expectedTools: ["run_code_analysis", "run_quality_gate"], expectedToolsets: [], k: 5 },
    { query: "find bugs in my project", expectedTools: ["run_code_analysis", "scan_dependencies"], expectedToolsets: [], k: 5 },
    // AI tasks — no technical terms
    { query: "ask AI to summarize this", expectedTools: ["call_llm"], expectedToolsets: ["llm"], k: 5 },
    { query: "can the computer analyze this text for me", expectedTools: ["call_llm", "extract_structured_data"], expectedToolsets: ["llm"], k: 5 },
    // Testing — lay language
    { query: "run my tests and tell me what failed", expectedTools: ["run_tests_cli", "run_closed_loop"], expectedToolsets: [], k: 5 },
    { query: "make sure everything still works", expectedTools: ["run_closed_loop", "run_mandatory_flywheel"], expectedToolsets: [], k: 5 },
    // Typos and misspellings
    { query: "verifiy my code compiles", expectedTools: ["run_closed_loop", "start_verification_cycle"], expectedToolsets: [], k: 5 },
    { query: "analize the screenshoot", expectedTools: ["analyze_screenshot"], expectedToolsets: ["vision"], k: 5 },
    // Git — casual
    { query: "check if my commits are ok before I push", expectedTools: ["check_commit_messages"], expectedToolsets: ["git_workflow"], k: 5 },
    { query: "review my changes before merge", expectedTools: ["check_pr_checklist", "review_pr_checklist", "enforce_merge_gate"], expectedToolsets: ["git_workflow"], k: 5 },
  ],
};

const EXPERIENCED_USER_CORPUS: SegmentCorpus = {
  name: "experienced",
  description: "Domain-specific keywords, knows tool categories exist",
  queries: [
    // SEO — domain keywords
    { query: "seo audit lighthouse performance meta tags", expectedTools: ["seo_audit_url", "analyze_seo_content"], expectedToolsets: ["seo"], k: 5 },
    { query: "check page speed core web vitals", expectedTools: ["seo_audit_url"], expectedToolsets: ["seo"], k: 5 },
    // Security — technical terms
    { query: "scan npm dependencies for CVEs", expectedTools: ["scan_dependencies"], expectedToolsets: [], k: 5 },
    { query: "audit terminal history for leaked secrets", expectedTools: ["scan_terminal_security"], expectedToolsets: [], k: 5 },
    // Data — structured queries
    { query: "parse CSV aggregate by category compute average", expectedTools: ["csv_aggregate", "csv_select_rows"], expectedToolsets: ["local_file"], k: 5 },
    { query: "read JSON API response extract nested fields", expectedTools: ["json_select", "read_json_file"], expectedToolsets: ["local_file"], k: 5 },
    { query: "compare two datasets find differences", expectedTools: ["diff_outputs"], expectedToolsets: [], k: 5 },
    // LLM — knows the models
    { query: "call GPT-4o to evaluate this response", expectedTools: ["call_llm"], expectedToolsets: ["llm"], k: 5 },
    { query: "benchmark Gemini vs Claude on this prompt", expectedTools: ["benchmark_models"], expectedToolsets: ["llm"], k: 5 },
    { query: "extract structured JSON from unstructured text using LLM", expectedTools: ["extract_structured_data"], expectedToolsets: ["llm"], k: 5 },
    // Git — specific workflow
    { query: "check commit messages follow conventional commits", expectedTools: ["check_commit_messages"], expectedToolsets: ["git_workflow"], k: 5 },
    { query: "review PR checklist before merge", expectedTools: ["check_pr_checklist"], expectedToolsets: ["git_workflow"], k: 5 },
    // Vision — knows the domain
    { query: "analyze screenshot responsive breakpoints", expectedTools: ["analyze_screenshot", "capture_responsive_suite"], expectedToolsets: ["vision", "ui_capture"], k: 5 },
    { query: "capture UI at mobile tablet desktop widths", expectedTools: ["capture_responsive_suite", "capture_ui_screenshot"], expectedToolsets: ["ui_capture"], k: 5 },
    // Research writing — academic terms
    { query: "polish abstract remove AI tone academic paper", expectedTools: ["polish_prose"], expectedToolsets: ["research_writing"], k: 5 },
    { query: "check paper logic argument structure", expectedTools: ["check_paper_logic"], expectedToolsets: ["research_writing"], k: 5 },
    // Figma — design terms
    { query: "extract Figma frames design tokens", expectedTools: ["extract_figma_frames"], expectedToolsets: ["figma_flow"], k: 5 },
    { query: "analyze user flow Figma prototype", expectedTools: ["analyze_figma_flows"], expectedToolsets: ["figma_flow"], k: 5 },
  ],
};

const POWER_USER_CORPUS: SegmentCorpus = {
  name: "power_user",
  description: "Exact tool names, multi-step chains, knows the full catalog",
  queries: [
    // Exact tool name lookups
    { query: "call_llm", expectedTools: ["call_llm"], expectedToolsets: ["llm"], k: 1 },
    { query: "run_quality_gate", expectedTools: ["run_quality_gate"], expectedToolsets: [], k: 1 },
    { query: "seo_audit_url", expectedTools: ["seo_audit_url"], expectedToolsets: ["seo"], k: 1 },
    { query: "capture_responsive_suite", expectedTools: ["capture_responsive_suite"], expectedToolsets: ["ui_capture"], k: 1 },
    { query: "start_verification_cycle", expectedTools: ["start_verification_cycle"], expectedToolsets: [], k: 1 },
    // Category-scoped searches
    { query: "all security tools", expectedTools: ["scan_dependencies", "scan_terminal_security"], expectedToolsets: [], k: 5 },
    { query: "llm tools for structured extraction", expectedTools: ["extract_structured_data", "call_llm"], expectedToolsets: ["llm"], k: 5 },
    // Multi-tool chains described precisely
    { query: "fetch_url then extract_structured_data then send_email", expectedTools: ["fetch_url", "extract_structured_data", "send_email"], expectedToolsets: ["web", "llm", "email"], k: 5 },
    { query: "run_recon followed by log_phase_findings", expectedTools: ["run_recon", "log_phase_findings"], expectedToolsets: [], k: 5 },
    { query: "csv_aggregate then call_llm for analysis", expectedTools: ["csv_aggregate", "call_llm"], expectedToolsets: ["local_file", "llm"], k: 5 },
    // Methodology-aware queries
    { query: "6-phase verification cycle", expectedTools: ["start_verification_cycle"], expectedToolsets: [], k: 5 },
    { query: "mandatory flywheel quality gate", expectedTools: ["run_mandatory_flywheel", "run_quality_gate"], expectedToolsets: [], k: 3 },
    // Advanced: partial tool names (tab-completion style)
    { query: "analyze_", expectedTools: ["analyze_screenshot", "analyze_figma_flows", "analyze_repo"], expectedToolsets: ["vision", "figma_flow"], k: 5 },
    { query: "run_", expectedTools: ["run_quality_gate", "run_closed_loop", "run_recon"], expectedToolsets: [], k: 5 },
    { query: "record_learning", expectedTools: ["record_learning"], expectedToolsets: [], k: 1 },
    // Niche / rare tools
    { query: "benchmark voice latency RTVI", expectedTools: ["benchmark_voice_latency"], expectedToolsets: ["voice_bridge"], k: 5 },
    { query: "toon encode response", expectedTools: ["toon_encode"], expectedToolsets: ["toon"], k: 5 },
    { query: "generate flicker report", expectedTools: ["generate_flicker_report"], expectedToolsets: ["flicker_detection"], k: 3 },
  ],
};

// ── Ablation Configurations ────────────────────────────────────────────

const ABLATION_CONFIGS: AblationConfig[] = [
  { name: "baseline", description: "All strategies enabled", ablation: {} },
  { name: "-synonyms", description: "Disable synonym expansion", ablation: { disableSynonyms: true } },
  { name: "-fuzzy", description: "Disable Levenshtein fuzzy matching", ablation: { disableFuzzy: true } },
  { name: "-tagCoverage", description: "Disable tag coverage bonus", ablation: { disableTagCoverage: true } },
  { name: "-tfIdf", description: "Disable TF-IDF weighting (flat tag scores)", ablation: { disableTfIdf: true } },
  { name: "-ngram", description: "Disable trigram similarity", ablation: { disableNgram: true } },
  { name: "-bigram", description: "Disable bigram phrase matching", ablation: { disableBigram: true } },
  { name: "-dense", description: "Disable TF-IDF cosine similarity", ablation: { disableDense: true } },
  { name: "-domainBoost", description: "Disable domain cluster boosting", ablation: { disableDomainBoost: true } },
  { name: "-traceEdges", description: "Disable execution trace co-occurrence", ablation: { disableTraceEdges: true } },
  { name: "-prefix", description: "Disable prefix matching", ablation: { disablePrefix: true } },
  // Compound ablations: strip to minimal
  { name: "keyword_only", description: "Only keyword matching (no prefix, synonym, fuzzy, ngram, bigram, dense, domain, trace)", ablation: {
    disablePrefix: true, disableSynonyms: true, disableFuzzy: true, disableNgram: true,
    disableBigram: true, disableDense: true, disableDomainBoost: true, disableTraceEdges: true,
    disableTagCoverage: true,
  }},
  { name: "keyword+tfidf", description: "Keyword + TF-IDF only", ablation: {
    disablePrefix: true, disableSynonyms: true, disableFuzzy: true, disableNgram: true,
    disableBigram: true, disableDense: true, disableDomainBoost: true, disableTraceEdges: true,
    disableTagCoverage: true,
  }},
  { name: "keyword+synonyms", description: "Keyword + synonyms only", ablation: {
    disablePrefix: true, disableFuzzy: true, disableNgram: true,
    disableBigram: true, disableDense: true, disableDomainBoost: true, disableTraceEdges: true,
    disableTagCoverage: true, disableTfIdf: true,
  }},
  { name: "keyword+fuzzy", description: "Keyword + fuzzy matching only", ablation: {
    disablePrefix: true, disableSynonyms: true, disableNgram: true,
    disableBigram: true, disableDense: true, disableDomainBoost: true, disableTraceEdges: true,
    disableTagCoverage: true, disableTfIdf: true,
  }},
];

// ── Metrics ────────────────────────────────────────────────────────────

function buildSearchList() {
  return ALL_REGISTRY_ENTRIES.map(e => ({
    name: e.name,
    description: `${e.tags.join(" ")} ${e.category} ${e.phase}`,
  }));
}

function computeMetrics(
  queries: QueryCase[],
  config: AblationConfig,
  searchList: Array<{ name: string; description: string }>,
  verbose: boolean,
): AblationResult & { perQuery: Array<{ query: string; rank: number; found: boolean; topTools: string[] }> } {
  let totalRecipRank = 0;
  let recallAt1 = 0;
  let recallAt3 = 0;
  let recallAt5 = 0;
  let toolsetHits = 0;
  let toolsetChecks = 0;
  let totalFalsePositives = 0;
  let totalScoreSum = 0;
  const perQuery: Array<{ query: string; rank: number; found: boolean; topTools: string[] }> = [];

  for (const q of queries) {
    const results = hybridSearch(q.query, searchList, {
      limit: Math.max(q.k, 5),
      mode: "hybrid",
      searchFullRegistry: true,
      ablation: config.ablation,
    });

    const resultNames = results.map(r => r.name);
    const topK = resultNames.slice(0, q.k);

    // Recall@K: any expected tool in top K?
    const found1 = q.expectedTools.some(t => resultNames[0] === t);
    const found3 = q.expectedTools.some(t => resultNames.slice(0, 3).includes(t));
    const found5 = q.expectedTools.some(t => resultNames.slice(0, 5).includes(t));
    if (found1) recallAt1++;
    if (found3) recallAt3++;
    if (found5) recallAt5++;

    // MRR: reciprocal rank of first expected tool
    let bestRank = Infinity;
    for (const expected of q.expectedTools) {
      const idx = resultNames.indexOf(expected);
      if (idx >= 0 && idx < bestRank) bestRank = idx;
    }
    if (bestRank < Infinity) {
      totalRecipRank += 1 / (bestRank + 1);
    }

    // Toolset accuracy
    if (q.expectedToolsets.length > 0) {
      const suggestedToolsets = new Set<string>();
      for (const r of results.slice(0, 5)) {
        const ts = TOOL_TO_TOOLSET.get(r.name);
        if (ts) suggestedToolsets.add(ts);
      }
      const hits = q.expectedToolsets.filter(ts => suggestedToolsets.has(ts));
      toolsetHits += hits.length > 0 ? 1 : 0;
      toolsetChecks++;
    }

    // False positive rate: tools in top K that aren't in expected
    const expectedSet = new Set(q.expectedTools);
    const fpInTopK = topK.filter(t => !expectedSet.has(t)).length;
    totalFalsePositives += fpInTopK / Math.max(topK.length, 1);

    // Avg score of top result
    if (results.length > 0) totalScoreSum += results[0].score;

    perQuery.push({
      query: q.query,
      rank: bestRank < Infinity ? bestRank + 1 : -1,
      found: found5,
      topTools: resultNames.slice(0, 3),
    });

    if (verbose && !found5) {
      console.log(`    MISS: "${q.query}" expected:[${q.expectedTools.join(",")}] got:[${resultNames.slice(0, 5).join(",")}]`);
    }
  }

  const n = queries.length;
  return {
    config: config.name,
    segment: "",
    recallAt1: recallAt1 / n,
    recallAt3: recallAt3 / n,
    recallAt5: recallAt5 / n,
    mrr: totalRecipRank / n,
    toolsetAccuracy: toolsetChecks > 0 ? toolsetHits / toolsetChecks : 1,
    falsePositiveRate: totalFalsePositives / n,
    avgScore: totalScoreSum / n,
    queries: n,
    perQuery,
  };
}

// ── Output ─────────────────────────────────────────────────────────────

function printResultsTable(results: AblationResult[]) {
  const header = "| Config | Segment | R@1 | R@3 | R@5 | MRR | Toolset | FP Rate | Avg Score |";
  const sep    = "|---|---|---|---|---|---|---|---|---|";
  console.log(header);
  console.log(sep);
  for (const r of results) {
    console.log(`| ${r.config.padEnd(18)} | ${r.segment.padEnd(12)} | ${(r.recallAt1 * 100).toFixed(0)}% | ${(r.recallAt3 * 100).toFixed(0)}% | ${(r.recallAt5 * 100).toFixed(0)}% | ${r.mrr.toFixed(3)} | ${(r.toolsetAccuracy * 100).toFixed(0)}% | ${(r.falsePositiveRate * 100).toFixed(0)}% | ${r.avgScore.toFixed(0)} |`);
  }
}

function printDeltaTable(baseline: AblationResult[], ablated: AblationResult[]) {
  console.log("\n## Delta from Baseline (negative = degradation)");
  console.log("| Config | Segment | ΔR@1 | ΔR@3 | ΔR@5 | ΔMRR | ΔToolset |");
  console.log("|---|---|---|---|---|---|---|");
  for (const ab of ablated) {
    const base = baseline.find(b => b.segment === ab.segment);
    if (!base) continue;
    const d1 = ((ab.recallAt1 - base.recallAt1) * 100).toFixed(1);
    const d3 = ((ab.recallAt3 - base.recallAt3) * 100).toFixed(1);
    const d5 = ((ab.recallAt5 - base.recallAt5) * 100).toFixed(1);
    const dm = (ab.mrr - base.mrr).toFixed(3);
    const dt = ((ab.toolsetAccuracy - base.toolsetAccuracy) * 100).toFixed(1);
    const flag = (v: string) => parseFloat(v) < -5 ? " ⚠️" : "";
    console.log(`| ${ab.config.padEnd(18)} | ${ab.segment.padEnd(12)} | ${d1}${flag(d1)} | ${d3}${flag(d3)} | ${d5}${flag(d5)} | ${dm} | ${dt}${flag(dt)} |`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const segmentFilter = args.find(a => a.startsWith("--segment="))?.split("=")[1]
  ?? (args.includes("--segment") ? args[args.indexOf("--segment") + 1] : undefined);
const verbose = args.includes("--verbose");

const SEGMENTS: SegmentCorpus[] = [NEW_USER_CORPUS, EXPERIENCED_USER_CORPUS, POWER_USER_CORPUS];
const selectedSegments = segmentFilter
  ? SEGMENTS.filter(s => s.name.includes(segmentFilter))
  : SEGMENTS;

if (selectedSegments.length === 0) {
  console.error(`No segment matching "${segmentFilter}". Available: ${SEGMENTS.map(s => s.name).join(", ")}`);
  process.exit(1);
}

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║     MCP Tool Discovery — Ablation Test Harness             ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log(`\nSegments: ${selectedSegments.map(s => s.name).join(", ")}`);
console.log(`Ablation configs: ${ABLATION_CONFIGS.length}`);
console.log(`Total tools in registry: ${ALL_REGISTRY_ENTRIES.length}`);

const searchList = buildSearchList();
const allResults: AblationResult[] = [];
const baselineResults: AblationResult[] = [];

for (const segment of selectedSegments) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Segment: ${segment.name} (${segment.queries.length} queries)`);
  console.log(`${segment.description}`);
  console.log(`${"═".repeat(60)}`);

  for (const config of ABLATION_CONFIGS) {
    const result = computeMetrics(segment.queries, config, searchList, verbose);
    result.segment = segment.name;
    allResults.push(result);
    if (config.name === "baseline") baselineResults.push(result);

    if (verbose) {
      console.log(`  ${config.name}: R@5=${(result.recallAt5 * 100).toFixed(0)}% MRR=${result.mrr.toFixed(3)} TS=${(result.toolsetAccuracy * 100).toFixed(0)}%`);
    }
  }
}

// ── Print full results ──────────────────────────────────────────────────
console.log("\n\n## Full Results");
printResultsTable(allResults);

// ── Print delta from baseline ──────────────────────────────────────────
const nonBaseline = allResults.filter(r => r.config !== "baseline");
printDeltaTable(baselineResults, nonBaseline);

// ── Segment-specific insights ──────────────────────────────────────────
console.log("\n\n## Segment-Specific Impact Analysis");
console.log("Which strategies matter most for each user segment?\n");

for (const segment of selectedSegments) {
  console.log(`### ${segment.name}`);
  const segResults = allResults.filter(r => r.segment === segment.name);
  const base = segResults.find(r => r.config === "baseline")!;
  const impacts: Array<{ config: string; delta: number; metric: string }> = [];

  for (const r of segResults) {
    if (r.config === "baseline") continue;
    const deltaR5 = (r.recallAt5 - base.recallAt5) * 100;
    const deltaMRR = (r.mrr - base.mrr) * 100;
    // Use the worse of the two deltas
    const worstDelta = Math.min(deltaR5, deltaMRR);
    impacts.push({ config: r.config, delta: worstDelta, metric: deltaR5 < deltaMRR ? "R@5" : "MRR" });
  }

  impacts.sort((a, b) => a.delta - b.delta);

  console.log(`  Baseline: R@1=${(base.recallAt1 * 100).toFixed(0)}% R@3=${(base.recallAt3 * 100).toFixed(0)}% R@5=${(base.recallAt5 * 100).toFixed(0)}% MRR=${base.mrr.toFixed(3)}`);
  console.log(`  Most impactful strategies (removing hurts most):`);
  for (const imp of impacts.slice(0, 5)) {
    const severity = imp.delta < -10 ? "CRITICAL" : imp.delta < -5 ? "HIGH" : imp.delta < -2 ? "MEDIUM" : "LOW";
    console.log(`    ${severity.padEnd(8)} ${imp.config.padEnd(18)} ${imp.delta >= 0 ? "+" : ""}${imp.delta.toFixed(1)}pp (${imp.metric})`);
  }
  console.log();
}

// ── Summary verdict ────────────────────────────────────────────────────
console.log("## Verdict: Strategy Importance by Segment");
console.log("| Strategy | New User | Experienced | Power User |");
console.log("|---|---|---|---|");

const strategyNames = ABLATION_CONFIGS.filter(c => c.name.startsWith("-")).map(c => c.name);
for (const strat of strategyNames) {
  const cells: string[] = [];
  for (const segment of selectedSegments) {
    const base = allResults.find(r => r.segment === segment.name && r.config === "baseline")!;
    const ablated = allResults.find(r => r.segment === segment.name && r.config === strat);
    if (!ablated) { cells.push("—"); continue; }
    const delta = (ablated.recallAt5 - base.recallAt5) * 100;
    const label = delta < -10 ? "🔴 CRITICAL" : delta < -5 ? "🟡 HIGH" : delta < -2 ? "🟢 MEDIUM" : "⚪ LOW";
    cells.push(`${label} (${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%)`);
  }
  console.log(`| ${strat.padEnd(15)} | ${cells.join(" | ")} |`);
}

console.log(`\nTotal queries evaluated: ${allResults.reduce((s, r) => s + (r.config === "baseline" ? r.queries : 0), 0)}`);
console.log(`Total ablation runs: ${allResults.length}`);
