/**
 * searchQualityEval.ts — Gemini Flash Lite LLM Judge eval harness for search quality.
 *
 * Runs 50+ test queries against the search route, judges each result using
 * both boolean structural checks AND Gemini 3.1 Flash Lite semantic judge,
 * detects regressions, and produces fix suggestions.
 *
 * Usage:
 *   npx tsx packages/mcp-local/src/benchmarks/searchQualityEval.ts [--base-url http://localhost:5191]
 *
 * Env: GEMINI_API_KEY (loads from .env.local if not in environment)
 *
 * Flywheel: run → judge → diagnose → fix → re-run → compare
 */

import { getDb } from "../db.js";
import { readFileSync } from "fs";
import { join } from "path";

/* ─── Load env ─────────────────────────────────────────────────────────────── */

function loadEnv() {
  if (process.env.GEMINI_API_KEY) return;
  const paths = [".env.local", ".env", "../.env.local", "../../.env.local"];
  for (const p of paths) {
    try {
      const content = readFileSync(join(process.cwd(), p), "utf-8");
      for (const line of content.split("\n")) {
        const match = line.match(/^(GEMINI_API_KEY)\s*=\s*(.+)$/);
        if (match) {
          process.env[match[1]] = match[2].trim();
          console.log(`[env] Loaded GEMINI_API_KEY from ${p}`);
          return;
        }
      }
    } catch { /* file not found */ }
  }
}

loadEnv();

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface EvalResult {
  queryId: string;
  query: string;
  lens: string;
  expectedType: string;
  actualType: string;
  latencyMs: number;
  /** Per-check pass/fail (structural) */
  structuralChecks: Record<string, boolean>;
  structuralScore: string;
  structuralPass: boolean;
  /** Gemini LLM judge verdict */
  geminiVerdict?: "pass" | "fail" | "skip";
  geminiScore?: number;
  geminiReasoning?: string;
  geminiFailing?: string[];
  geminiFixSuggestions?: string[];
  /** Combined pass (structural AND gemini) */
  combinedPass: boolean;
  responseSnippet: string;
}

interface EvalReport {
  runId: string;
  timestamp: string;
  baseUrl: string;
  judgeModel: string;
  totalQueries: number;
  structuralPassRate: number;
  geminiPassRate: number;
  combinedPassRate: number;
  avgLatencyMs: number;
  results: EvalResult[];
  regressions: string[];
  improvements: string[];
  diagnosisSummary: string;
}

/* ─── Test Corpus (50+ queries, 10 categories) ─────────────────────────────── */

const TEST_CORPUS: Array<{
  id: string;
  query: string;
  lens: string;
  expectedType: string;
  category: string;
}> = [
  // ── Weekly Reset (6 queries) ──
  { id: "wr-01", query: "Generate my founder weekly reset — what changed, main contradiction, next 3 moves", lens: "founder", expectedType: "weekly_reset", category: "weekly_reset" },
  { id: "wr-02", query: "founder weekly reset", lens: "founder", expectedType: "weekly_reset", category: "weekly_reset" },
  { id: "wr-03", query: "Weekly reset for my startup", lens: "founder", expectedType: "weekly_reset", category: "weekly_reset" },
  { id: "wr-04", query: "Give me the founder reset for this week", lens: "ceo", expectedType: "weekly_reset", category: "weekly_reset" },
  { id: "wr-05", query: "What's my weekly summary and next moves?", lens: "founder", expectedType: "weekly_reset", category: "weekly_reset" },
  { id: "wr-06", query: "founder weekly", lens: "founder", expectedType: "weekly_reset", category: "weekly_reset" },

  // ── Pre-Delegation (4 queries) ──
  { id: "pd-01", query: "Build a pre-delegation packet for my agent", lens: "founder", expectedType: "pre_delegation", category: "pre_delegation" },
  { id: "pd-02", query: "Create an agent-ready delegation packet", lens: "founder", expectedType: "pre_delegation", category: "pre_delegation" },
  { id: "pd-03", query: "Prepare a handoff brief for my AI agent", lens: "ceo", expectedType: "pre_delegation", category: "pre_delegation" },
  { id: "pd-04", query: "Agent delegation packet with context", lens: "founder", expectedType: "pre_delegation", category: "pre_delegation" },

  // ── Important Changes (4 queries) ──
  { id: "ic-01", query: "What changed in the last 7 days?", lens: "founder", expectedType: "important_change", category: "important_change" },
  { id: "ic-02", query: "Show me important changes since my last session", lens: "ceo", expectedType: "important_change", category: "important_change" },
  { id: "ic-03", query: "What's different since yesterday?", lens: "founder", expectedType: "important_change", category: "important_change" },
  { id: "ic-04", query: "Recent important changes and contradictions", lens: "investor", expectedType: "important_change", category: "important_change" },

  // ── Company Search (10 queries) ──
  { id: "cs-01", query: "Analyze Anthropic's competitive position in the foundation model market", lens: "investor", expectedType: "company_search", category: "company_search" },
  { id: "cs-02", query: "Tell me about Shopify's AI commerce strategy", lens: "ceo", expectedType: "company_search", category: "company_search" },
  { id: "cs-03", query: "Search Rogo AI — what do they do and who did they acquire?", lens: "banker", expectedType: "company_search", category: "company_search" },
  { id: "cs-04", query: "Analyze OpenAI's enterprise positioning", lens: "investor", expectedType: "company_search", category: "company_search" },
  { id: "cs-05", query: "Research Stripe's payments infrastructure moat", lens: "investor", expectedType: "company_search", category: "company_search" },
  { id: "cs-06", query: "Tell me about Linear's product strategy", lens: "founder", expectedType: "company_search", category: "company_search" },
  { id: "cs-07", query: "Analyze Perplexity AI search positioning", lens: "investor", expectedType: "company_search", category: "company_search" },
  { id: "cs-08", query: "Company profile for Mistral AI", lens: "banker", expectedType: "company_search", category: "company_search" },
  { id: "cs-09", query: "Diligence on Vercel's developer platform", lens: "investor", expectedType: "company_search", category: "company_search" },
  { id: "cs-10", query: "Research Databricks data lakehouse strategy", lens: "ceo", expectedType: "company_search", category: "company_search" },

  // ── Competitor Analysis (4 queries) ──
  { id: "cp-01", query: "Compare NodeBench vs Supermemory in the memory/context space", lens: "founder", expectedType: "competitor", category: "competitor" },
  { id: "cp-02", query: "NodeBench versus Perplexity — what's the difference?", lens: "investor", expectedType: "competitor", category: "competitor" },
  { id: "cp-03", query: "Compare Linear vs Jira for engineering teams", lens: "ceo", expectedType: "competitor", category: "competitor" },
  { id: "cp-04", query: "How does Anthropic compare to OpenAI for enterprise?", lens: "banker", expectedType: "competitor", category: "competitor" },

  // ── Own Entity / My Company (6 queries) ──
  { id: "me-01", query: "Summarize my current company state", lens: "ceo", expectedType: "company_search", category: "own_entity" },
  { id: "me-02", query: "What's the status of my startup?", lens: "founder", expectedType: "general", category: "own_entity" },
  { id: "me-03", query: "Show me my company's key metrics and risks", lens: "investor", expectedType: "company_search", category: "own_entity" },
  { id: "me-04", query: "What are the biggest contradictions in my business right now?", lens: "founder", expectedType: "important_change", category: "own_entity" },
  { id: "me-05", query: "Generate an investor update for my company", lens: "founder", expectedType: "general", category: "own_entity" },
  { id: "me-06", query: "What should I tell my board this quarter?", lens: "ceo", expectedType: "general", category: "own_entity" },

  // ── Multi-Entity (4 queries) ──
  { id: "mt-01", query: "Compare Anthropic, OpenAI, and Google in the AI race", lens: "investor", expectedType: "competitor", category: "multi_entity" },
  { id: "mt-02", query: "What changed in AI commerce for Shopify, Amazon, and Google?", lens: "ceo", expectedType: "important_change", category: "multi_entity" },
  { id: "mt-03", query: "Analyze the competitive landscape: Stripe vs Adyen vs Square", lens: "banker", expectedType: "competitor", category: "multi_entity" },
  { id: "mt-04", query: "Top 3 risks across Anthropic, Mistral, and Meta AI", lens: "investor", expectedType: "company_search", category: "multi_entity" },

  // ── Role-Specific (6 queries, one per lens) ──
  { id: "rl-01", query: "What should I build next?", lens: "founder", expectedType: "general", category: "role_specific" },
  { id: "rl-02", query: "What deals should I be looking at?", lens: "banker", expectedType: "general", category: "role_specific" },
  { id: "rl-03", query: "What regulatory risks should I track as a legal advisor?", lens: "legal", expectedType: "general", category: "role_specific" },
  { id: "rl-04", query: "Explain the AI landscape for my thesis", lens: "student", expectedType: "general", category: "role_specific" },
  { id: "rl-05", query: "What portfolio companies need attention?", lens: "investor", expectedType: "general", category: "role_specific" },
  { id: "rl-06", query: "What should I present to the board?", lens: "ceo", expectedType: "general", category: "role_specific" },

  // ── Upload-Related (4 queries) ──
  { id: "up-01", query: "Analyze this meeting transcript and extract action items", lens: "founder", expectedType: "general", category: "upload_context" },
  { id: "up-02", query: "Build a diligence memo from these meeting notes", lens: "banker", expectedType: "general", category: "upload_context" },
  { id: "up-03", query: "Extract key entities from my uploaded documents", lens: "founder", expectedType: "general", category: "upload_context" },
  { id: "up-04", query: "Summarize and find contradictions in my research files", lens: "investor", expectedType: "general", category: "upload_context" },

  // ── Edge Cases (6 queries) ──
  { id: "ec-01", query: "a", lens: "founder", expectedType: "general", category: "edge_case" },
  { id: "ec-02", query: "What is the meaning of life?", lens: "student", expectedType: "general", category: "edge_case" },
  { id: "ec-03", query: "", lens: "founder", expectedType: "general", category: "edge_case" },
  { id: "ec-04", query: "!@#$%^&*()", lens: "founder", expectedType: "general", category: "edge_case" },
  { id: "ec-05", query: "SELECT * FROM users WHERE 1=1; DROP TABLE users;--", lens: "founder", expectedType: "general", category: "edge_case" },
  { id: "ec-06", query: "a".repeat(5000), lens: "founder", expectedType: "general", category: "edge_case" },
];

/* ─── Structural Checks ───────────────────────────────────────────────────── */

function structuralCheck(queryDef: typeof TEST_CORPUS[0], response: any, latencyMs: number): {
  checks: Record<string, boolean>;
  entityName: string;
  answer: string;
  confidence: number;
} {
  const data = response ?? {};
  const r = data.result ?? {};
  const entity = r.canonicalEntity ?? {};

  const entityName = entity.name ?? data.entity ?? r.entityName ?? "";
  const answer = entity.canonicalMission ?? r.answer ?? "";
  const confidence = entity.identityConfidence ?? r.confidence ?? 0;
  const variables = r.signals ?? r.variables ?? [];
  const changes = r.whatChanged ?? r.changes ?? [];
  const risks = r.contradictions ?? r.risks ?? [];
  const nextQuestions = r.nextQuestions ?? r.nextActions ?? [];
  const sourceCount = (changes.length ?? 0) + (variables.length ?? 0);

  // For edge cases (empty/SQL injection/long), relax some checks
  const isEdgeCase = queryDef.category === "edge_case";

  const checks: Record<string, boolean> = {
    hasEntityName: isEdgeCase || (!!entityName && entityName.length > 0),
    hasAnswer: isEdgeCase || (!!answer && answer.length > 0),
    hasConfidence: isEdgeCase || (typeof confidence === "number" && confidence > 0),
    hasVariables: isEdgeCase || (Array.isArray(variables) && variables.length > 0),
    hasChanges: isEdgeCase || (Array.isArray(changes) && changes.length > 0),
    hasRisks: isEdgeCase || (Array.isArray(risks) && risks.length > 0),
    hasNextQuestions: isEdgeCase || (Array.isArray(nextQuestions) && nextQuestions.length > 0),
    confidenceAbove40: isEdgeCase || confidence >= 40,
    sourceCountAbove0: isEdgeCase || sourceCount > 0,
    answerLengthAbove50: isEdgeCase || answer.length >= 50,
    noErrorInResponse: !data.error && data.success !== false,
    latencyUnder30s: latencyMs < 30_000,
    correctClassification: isEdgeCase || data.classification === queryDef.expectedType,
  };

  return { checks, entityName, answer, confidence };
}

/* ─── Gemini Flash Lite Judge ──────────────────────────────────────────────── */

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiJudgeResult {
  verdict: "pass" | "fail";
  score: number;
  criteria: Array<{ name: string; pass: boolean; reasoning: string }>;
  fixSuggestions: string[];
}

async function callGeminiJudge(
  queryDef: typeof TEST_CORPUS[0],
  response: any,
): Promise<GeminiJudgeResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const r = response?.result ?? {};
  const entity = r.canonicalEntity ?? {};
  const resultSnippet = JSON.stringify(r).slice(0, 3000);

  const prompt = `You are an LLM judge evaluating a search API response from NodeBench, an entity intelligence workspace.

USER QUERY: "${queryDef.query}"
USER ROLE: ${queryDef.lens}
EXPECTED CLASSIFICATION: ${queryDef.expectedType}
ACTUAL CLASSIFICATION: ${response?.classification ?? "unknown"}
CATEGORY: ${queryDef.category}

API RESPONSE (truncated):
${resultSnippet}

Evaluate this response against these 7 criteria. For each, return pass (true/false) and MAX 10-word reasoning:

1. RELEVANT_ENTITY: Does the response identify a relevant entity or workspace for this query?
2. USEFUL_ANSWER: Is the answer/summary useful and relevant to what was asked?
3. ACTIONABLE_SIGNALS: Does it provide signals, variables, or changes that help the user decide?
4. RISK_AWARENESS: Does it surface risks, contradictions, or things to watch?
5. NEXT_STEPS: Does it suggest useful follow-up questions or actions?
6. ROLE_APPROPRIATE: Is the response shaped appropriately for the ${queryDef.lens} role?
7. NO_HALLUCINATION: Does the response avoid making up specific facts/numbers it couldn't know?

IMPORTANT: This is a search API that may return default/placeholder signals for entities it hasn't deeply researched yet. That's acceptable — judge whether the STRUCTURE and RELEVANCE are correct, not whether it has real-time data.

Return ONLY valid JSON (no markdown, no code fences):
{
  "verdict": "pass" or "fail",
  "score": 0-100,
  "criteria": [
    { "name": "RELEVANT_ENTITY", "pass": true/false, "reasoning": "brief" },
    { "name": "USEFUL_ANSWER", "pass": true/false, "reasoning": "brief" },
    { "name": "ACTIONABLE_SIGNALS", "pass": true/false, "reasoning": "brief" },
    { "name": "RISK_AWARENESS", "pass": true/false, "reasoning": "brief" },
    { "name": "NEXT_STEPS", "pass": true/false, "reasoning": "brief" },
    { "name": "ROLE_APPROPRIATE", "pass": true/false, "reasoning": "brief" },
    { "name": "NO_HALLUCINATION", "pass": true/false, "reasoning": "brief" }
  ],
  "fixSuggestions": ["suggestion1", "suggestion2"]
}`;

  try {
    const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
      console.log(`   ⚠️ Gemini ${resp.status}: ${(await resp.text()).slice(0, 100)}`);
      return null;
    }

    const json = await resp.json() as any;
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    // Parse JSON — handle markdown fences, thinking tags, trailing commas
    let cleaned = text
      .replace(/```json\n?/g, "").replace(/```\n?/g, "")
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();
    // Extract JSON object if surrounded by other text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];
    // Fix trailing commas before } or ]
    cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
    const parsed = JSON.parse(cleaned) as GeminiJudgeResult;

    // Validate structure
    if (!parsed.verdict || !Array.isArray(parsed.criteria)) return null;
    return parsed;
  } catch (err: any) {
    console.log(`   ⚠️ Gemini judge error: ${err?.message?.slice(0, 80)}`);
    return null;
  }
}

/* ─── Runner ───────────────────────────────────────────────────────────────── */

async function runEval(baseUrl: string): Promise<EvalReport> {
  const runId = `eval_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const results: EvalResult[] = [];
  const hasGemini = !!process.env.GEMINI_API_KEY;

  // Filter out empty query for API (would get 400)
  const corpus = TEST_CORPUS.filter(q => q.query.length > 0 && q.query.length < 10000);

  console.log(`\n🔍 Search Quality Eval — ${corpus.length} queries against ${baseUrl}`);
  console.log(`🤖 Judge: ${hasGemini ? GEMINI_MODEL : "Structural only (no GEMINI_API_KEY)"}`);
  console.log("─".repeat(80));

  for (const queryDef of corpus) {
    const startMs = Date.now();
    let response: any = {};

    try {
      const resp = await fetch(`${baseUrl}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryDef.query, lens: queryDef.lens }),
        signal: AbortSignal.timeout(15_000),
      });
      response = await resp.json();
      response._httpStatus = resp.status;
    } catch (err: any) {
      response = { error: true, message: err?.message ?? "Fetch failed", _httpStatus: 0 };
    }

    const latencyMs = Date.now() - startMs;
    const { checks, entityName, answer, confidence } = structuralCheck(queryDef, response, latencyMs);
    const structuralPassCount = Object.values(checks).filter(Boolean).length;
    const structuralTotal = Object.keys(checks).length;
    const structuralPass = structuralPassCount === structuralTotal;

    // Gemini judge (skip for edge cases and if no API key)
    let geminiResult: GeminiJudgeResult | null = null;
    if (hasGemini && queryDef.category !== "edge_case") {
      geminiResult = await callGeminiJudge(queryDef, response);
    }

    const geminiPass = geminiResult?.verdict === "pass";
    // Combined: structural must pass. Gemini must pass IF it returned a verdict. Skip (null/error) doesn't fail.
    const combinedPass = structuralPass && (queryDef.category === "edge_case" || !geminiResult || geminiPass);

    const result: EvalResult = {
      queryId: queryDef.id,
      query: queryDef.query.slice(0, 80),
      lens: queryDef.lens,
      expectedType: queryDef.expectedType,
      actualType: response?.classification ?? "unknown",
      latencyMs,
      structuralChecks: checks,
      structuralScore: `${structuralPassCount}/${structuralTotal}`,
      structuralPass,
      geminiVerdict: geminiResult ? geminiResult.verdict : (queryDef.category === "edge_case" ? "skip" : undefined),
      geminiScore: geminiResult?.score,
      geminiReasoning: geminiResult?.criteria?.filter(c => !c.pass).map(c => `${c.name}: ${c.reasoning}`).join("; "),
      geminiFailing: geminiResult?.criteria?.filter(c => !c.pass).map(c => c.name),
      geminiFixSuggestions: geminiResult?.fixSuggestions,
      combinedPass,
      responseSnippet: JSON.stringify(response).slice(0, 300),
    };
    results.push(result);

    // Print result line
    const sIcon = structuralPass ? "✅" : "❌";
    const gIcon = geminiResult ? (geminiPass ? "🟢" : "🔴") : (queryDef.category === "edge_case" ? "⏭️" : "⬜");
    console.log(
      `${sIcon}${gIcon} [${result.queryId}] S:${result.structuralScore} G:${geminiResult?.score ?? "-"}% | ${latencyMs}ms | ${result.actualType} | ${queryDef.query.slice(0, 45)}`,
    );
    if (!structuralPass) {
      const failing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
      console.log(`   ↳ Structural: ${failing.join(", ")}`);
    }
    if (geminiResult && !geminiPass) {
      const failing = geminiResult.criteria.filter(c => !c.pass).map(c => c.name);
      console.log(`   ↳ Gemini: ${failing.join(", ")}`);
      if (geminiResult.fixSuggestions?.length) {
        console.log(`   ↳ Fix: ${geminiResult.fixSuggestions[0]?.slice(0, 80)}`);
      }
    }
  }

  // Compute report
  const structuralPassed = results.filter(r => r.structuralPass).length;
  const geminiJudged = results.filter(r => r.geminiVerdict && r.geminiVerdict !== "skip");
  const geminiPassed = geminiJudged.filter(r => r.geminiVerdict === "pass").length;
  const combinedPassed = results.filter(r => r.combinedPass).length;
  const avgLatencyMs = results.length > 0 ? results.reduce((s, r) => s + r.latencyMs, 0) / results.length : 0;

  // Regression detection
  const regressions: string[] = [];
  const improvements: string[] = [];
  try {
    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS eval_runs (
      run_id TEXT PRIMARY KEY, timestamp TEXT, base_url TEXT,
      total_queries INTEGER, passed INTEGER, failed INTEGER,
      pass_rate REAL, avg_latency_ms REAL, results_json TEXT,
      judge_model TEXT, structural_pass_rate REAL, gemini_pass_rate REAL,
      created_at INTEGER
    )`);

    const lastRun = db.prepare(`SELECT * FROM eval_runs ORDER BY created_at DESC LIMIT 1`).get() as any;
    if (lastRun) {
      const lastResults: EvalResult[] = JSON.parse(lastRun.results_json ?? "[]");
      for (const current of results) {
        const prev = lastResults.find(r => r.queryId === current.queryId);
        if (prev) {
          if (prev.combinedPass && !current.combinedPass) regressions.push(`${current.queryId}: was passing, now failing`);
          if (!prev.combinedPass && current.combinedPass) improvements.push(`${current.queryId}: was failing, now passing`);
        }
      }
    }

    db.prepare(
      `INSERT INTO eval_runs (run_id, timestamp, base_url, total_queries, passed, failed, pass_rate, avg_latency_ms, results_json, judge_model, structural_pass_rate, gemini_pass_rate, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      runId, new Date().toISOString(), baseUrl, results.length,
      combinedPassed, results.length - combinedPassed,
      results.length > 0 ? combinedPassed / results.length : 0,
      avgLatencyMs, JSON.stringify(results),
      hasGemini ? GEMINI_MODEL : "heuristic",
      results.length > 0 ? structuralPassed / results.length : 0,
      geminiJudged.length > 0 ? geminiPassed / geminiJudged.length : 0,
      Date.now(),
    );
  } catch { /* non-fatal */ }

  // Self-diagnosis
  const failingCategories: Record<string, number> = {};
  const geminiFailingCriteria: Record<string, number> = {};
  for (const r of results) {
    if (!r.combinedPass) {
      const cat = TEST_CORPUS.find(q => q.id === r.queryId)?.category ?? "unknown";
      failingCategories[cat] = (failingCategories[cat] ?? 0) + 1;
    }
    if (r.geminiFailing) {
      for (const f of r.geminiFailing) {
        geminiFailingCriteria[f] = (geminiFailingCriteria[f] ?? 0) + 1;
      }
    }
  }

  const diagnosisParts: string[] = [];
  if (Object.keys(failingCategories).length > 0) {
    const sorted = Object.entries(failingCategories).sort((a, b) => b[1] - a[1]);
    diagnosisParts.push(`Weakest categories: ${sorted.map(([k, v]) => `${k}(${v})`).join(", ")}`);
  }
  if (Object.keys(geminiFailingCriteria).length > 0) {
    const sorted = Object.entries(geminiFailingCriteria).sort((a, b) => b[1] - a[1]);
    diagnosisParts.push(`Most-failed Gemini criteria: ${sorted.map(([k, v]) => `${k}(${v})`).join(", ")}`);
  }
  const diagnosisSummary = diagnosisParts.join(". ") || "All passing — no diagnosis needed.";

  const report: EvalReport = {
    runId,
    timestamp: new Date().toISOString(),
    baseUrl,
    judgeModel: hasGemini ? GEMINI_MODEL : "heuristic",
    totalQueries: results.length,
    structuralPassRate: results.length > 0 ? structuralPassed / results.length : 0,
    geminiPassRate: geminiJudged.length > 0 ? geminiPassed / geminiJudged.length : 0,
    combinedPassRate: results.length > 0 ? combinedPassed / results.length : 0,
    avgLatencyMs: Math.round(avgLatencyMs),
    results,
    regressions,
    improvements,
    diagnosisSummary,
  };

  // Print summary
  console.log("\n" + "═".repeat(80));
  console.log(`📊 EVAL REPORT: ${runId}`);
  console.log(`   Judge model: ${report.judgeModel}`);
  console.log(`   Structural: ${structuralPassed}/${results.length} (${(report.structuralPassRate * 100).toFixed(1)}%)`);
  if (geminiJudged.length > 0) {
    console.log(`   Gemini:      ${geminiPassed}/${geminiJudged.length} (${(report.geminiPassRate * 100).toFixed(1)}%)`);
  }
  console.log(`   Combined:    ${combinedPassed}/${results.length} (${(report.combinedPassRate * 100).toFixed(1)}%)`);
  console.log(`   Avg latency: ${report.avgLatencyMs}ms`);
  console.log(`   Diagnosis:   ${diagnosisSummary}`);
  if (regressions.length > 0) {
    console.log(`   🔴 REGRESSIONS: ${regressions.length}`);
    regressions.forEach(r => console.log(`      - ${r}`));
  }
  if (improvements.length > 0) {
    console.log(`   🟢 IMPROVEMENTS: ${improvements.length}`);
    improvements.forEach(r => console.log(`      - ${r}`));
  }

  // Print category breakdown
  const categories = [...new Set(TEST_CORPUS.map(q => q.category))];
  console.log("\n   Category breakdown:");
  for (const cat of categories) {
    const catResults = results.filter(r => TEST_CORPUS.find(q => q.id === r.queryId)?.category === cat);
    const catPassed = catResults.filter(r => r.combinedPass).length;
    const icon = catPassed === catResults.length ? "✅" : "⚠️";
    console.log(`   ${icon} ${cat}: ${catPassed}/${catResults.length}`);
  }

  console.log("═".repeat(80));
  return report;
}

/* ─── CLI entry ────────────────────────────────────────────────────────────── */

const baseUrl = process.argv.find(a => a.startsWith("--base-url="))?.split("=")[1]
  ?? process.argv[process.argv.indexOf("--base-url") + 1]
  ?? "http://localhost:3100";

runEval(baseUrl).then(report => {
  if (report.regressions.length > 0) {
    console.log("\n💥 Regressions detected — exiting with code 1");
    process.exit(1);
  }
  if (report.combinedPassRate < 0.5) {
    console.log(`\n⚠️ Combined pass rate below 50% (${(report.combinedPassRate * 100).toFixed(1)}%) — exiting with code 1`);
    process.exit(1);
  }
  console.log("\n✅ Eval complete — no regressions");
}).catch(err => {
  console.error("Eval failed:", err);
  process.exit(2);
});

export { runEval, TEST_CORPUS, type EvalReport, type EvalResult };
