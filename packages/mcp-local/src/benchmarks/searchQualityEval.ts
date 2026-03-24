/**
 * searchQualityEval.ts — LLM Judge eval harness for search quality.
 *
 * Runs a corpus of test queries against the search route, judges each result
 * using the 7-criterion heuristic judge, and produces a regression-aware
 * scorecard with pass/fail verdicts and fix suggestions.
 *
 * Usage:
 *   npx tsx packages/mcp-local/src/benchmarks/searchQualityEval.ts [--base-url http://localhost:3100]
 *
 * Persists results to SQLite for regression tracking across runs.
 */

import { getDb } from "../db.js";

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface EvalQuery {
  id: string;
  query: string;
  lens: string;
  expectedType: "weekly_reset" | "pre_delegation" | "important_change" | "company_search" | "competitor" | "general";
  /** Boolean quality checks */
  checks: {
    hasEntityName: boolean;
    hasAnswer: boolean;
    hasConfidence: boolean;
    hasVariables: boolean;
    hasChanges: boolean;
    hasRisks: boolean;
    hasNextQuestions: boolean;
    confidenceAbove40: boolean;
    sourceCountAbove0: boolean;
    answerLengthAbove50: boolean;
    noErrorInResponse: boolean;
    latencyUnder10s: boolean;
  };
}

interface EvalResult {
  queryId: string;
  query: string;
  lens: string;
  expectedType: string;
  actualType: string;
  latencyMs: number;
  httpStatus: number;
  /** Per-check pass/fail */
  checks: Record<string, boolean>;
  /** Overall pass (all checks true) */
  pass: boolean;
  /** Total checks passed / total */
  score: string;
  /** Raw response snippet for debugging */
  responseSnippet: string;
  /** Judge verdict if available */
  judgeVerdict?: string;
  judgeScore?: number;
  judgeFailing?: string[];
}

interface EvalReport {
  runId: string;
  timestamp: string;
  baseUrl: string;
  totalQueries: number;
  passed: number;
  failed: number;
  passRate: number;
  avgLatencyMs: number;
  results: EvalResult[];
  regressions: string[];
  improvements: string[];
}

/* ─── Test Corpus ──────────────────────────────────────────────────────────── */

const TEST_CORPUS: Array<{
  id: string;
  query: string;
  lens: string;
  expectedType: string;
}> = [
  // Weekly reset queries
  { id: "wr-01", query: "Generate my founder weekly reset — what changed, main contradiction, next 3 moves", lens: "founder", expectedType: "weekly_reset" },
  { id: "wr-02", query: "founder weekly reset", lens: "founder", expectedType: "weekly_reset" },

  // Pre-delegation queries
  { id: "pd-01", query: "Build a pre-delegation packet for my agent", lens: "founder", expectedType: "pre_delegation" },
  { id: "pd-02", query: "Create an agent-ready delegation packet", lens: "founder", expectedType: "pre_delegation" },

  // Important change queries
  { id: "ic-01", query: "What changed in the last 7 days?", lens: "founder", expectedType: "important_change" },
  { id: "ic-02", query: "Show me important changes since my last session", lens: "ceo", expectedType: "important_change" },

  // Company search queries
  { id: "cs-01", query: "Analyze Anthropic's competitive position in the foundation model market", lens: "investor", expectedType: "company_search" },
  { id: "cs-02", query: "Tell me about Shopify's AI commerce strategy", lens: "ceo", expectedType: "company_search" },
  { id: "cs-03", query: "Search Rogo AI — what do they do and who did they acquire?", lens: "banker", expectedType: "company_search" },
  { id: "cs-04", query: "Analyze OpenAI's enterprise positioning", lens: "investor", expectedType: "company_search" },

  // Competitor queries
  { id: "cp-01", query: "Compare NodeBench vs Supermemory in the memory/context space", lens: "founder", expectedType: "competitor" },

  // General queries
  { id: "gn-01", query: "What should I focus on this week?", lens: "founder", expectedType: "general" },
  { id: "gn-02", query: "Summarize my current company state", lens: "ceo", expectedType: "company_search" },

  // Edge cases
  { id: "ec-01", query: "a", lens: "founder", expectedType: "general" }, // very short query
  { id: "ec-02", query: "What is the meaning of life?", lens: "student", expectedType: "general" }, // off-topic
];

/* ─── Evaluation Logic ─────────────────────────────────────────────────────── */

function checkResult(queryDef: typeof TEST_CORPUS[0], response: any, latencyMs: number): EvalResult {
  const data = response ?? {};
  const r = data.result ?? {};
  const entity = r.canonicalEntity ?? {};

  // Extract packet fields — handle both direct packet and canonicalEntity+memo shapes
  const entityName = entity.name ?? data.entity ?? r.entityName ?? "";
  const answer = entity.canonicalMission ?? r.answer ?? "";
  const confidence = entity.identityConfidence ?? r.confidence ?? 0;
  const variables = r.signals ?? r.variables ?? [];
  const changes = r.whatChanged ?? r.changes ?? [];
  const risks = r.contradictions ?? r.risks ?? [];
  const nextQuestions = r.nextQuestions ?? r.nextActions ?? [];
  const sourceCount = (changes.length ?? 0) + (variables.length ?? 0);

  const checks: Record<string, boolean> = {
    hasEntityName: !!entityName && entityName.length > 0,
    hasAnswer: !!answer && answer.length > 0,
    hasConfidence: typeof confidence === "number" && confidence > 0,
    hasVariables: Array.isArray(variables) && variables.length > 0,
    hasChanges: Array.isArray(changes) && changes.length > 0,
    hasRisks: Array.isArray(risks) && risks.length > 0,
    hasNextQuestions: Array.isArray(nextQuestions) && nextQuestions.length > 0,
    confidenceAbove40: confidence >= 40,
    sourceCountAbove0: sourceCount > 0,
    answerLengthAbove50: answer.length >= 50,
    noErrorInResponse: !data.error && data.success !== false,
    latencyUnder10s: latencyMs < 10_000,
    correctClassification: data.classification === queryDef.expectedType,
  };

  const passCount = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;

  return {
    queryId: queryDef.id,
    query: queryDef.query,
    lens: queryDef.lens,
    expectedType: queryDef.expectedType,
    actualType: data.classification ?? "unknown",
    latencyMs,
    httpStatus: data._httpStatus ?? 200,
    checks,
    pass: passCount === totalChecks,
    score: `${passCount}/${totalChecks}`,
    responseSnippet: JSON.stringify(data).slice(0, 500),
    judgeVerdict: data.judge?.verdict,
    judgeScore: data.judge?.score,
    judgeFailing: data.judge?.failingCriteria,
  };
}

/* ─── Runner ───────────────────────────────────────────────────────────────── */

async function runEval(baseUrl: string): Promise<EvalReport> {
  const runId = `eval_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const results: EvalResult[] = [];

  console.log(`\n🔍 Search Quality Eval — ${TEST_CORPUS.length} queries against ${baseUrl}`);
  console.log("─".repeat(70));

  for (const queryDef of TEST_CORPUS) {
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
    const result = checkResult(queryDef, response, latencyMs);
    results.push(result);

    const icon = result.pass ? "✅" : "❌";
    const passCount = Object.values(result.checks).filter(Boolean).length;
    const totalChecks = Object.keys(result.checks).length;
    console.log(
      `${icon} [${result.queryId}] ${result.score} | ${result.latencyMs}ms | ${result.actualType} | ${result.query.slice(0, 50)}`,
    );
    if (!result.pass) {
      const failing = Object.entries(result.checks)
        .filter(([, v]) => !v)
        .map(([k]) => k);
      console.log(`   ↳ Failing: ${failing.join(", ")}`);
    }
  }

  // Compute report
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  const passRate = results.length > 0 ? passed / results.length : 0;
  const avgLatencyMs = results.length > 0 ? results.reduce((s, r) => s + r.latencyMs, 0) / results.length : 0;

  // Check for regressions against last run
  const regressions: string[] = [];
  const improvements: string[] = [];

  try {
    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS eval_runs (
      run_id TEXT PRIMARY KEY,
      timestamp TEXT,
      base_url TEXT,
      total_queries INTEGER,
      passed INTEGER,
      failed INTEGER,
      pass_rate REAL,
      avg_latency_ms REAL,
      results_json TEXT,
      created_at INTEGER
    )`);

    // Get last run for regression comparison
    const lastRun = db.prepare(
      `SELECT * FROM eval_runs ORDER BY created_at DESC LIMIT 1`,
    ).get() as any;

    if (lastRun) {
      const lastResults: EvalResult[] = JSON.parse(lastRun.results_json ?? "[]");
      for (const current of results) {
        const prev = lastResults.find((r) => r.queryId === current.queryId);
        if (prev) {
          if (prev.pass && !current.pass) {
            regressions.push(`${current.queryId}: was passing, now failing`);
          }
          if (!prev.pass && current.pass) {
            improvements.push(`${current.queryId}: was failing, now passing`);
          }
        }
      }
    }

    // Persist this run
    db.prepare(
      `INSERT INTO eval_runs (run_id, timestamp, base_url, total_queries, passed, failed, pass_rate, avg_latency_ms, results_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      runId,
      new Date().toISOString(),
      baseUrl,
      results.length,
      passed,
      failed,
      passRate,
      avgLatencyMs,
      JSON.stringify(results),
      Date.now(),
    );
  } catch { /* SQLite persistence is non-fatal */ }

  const report: EvalReport = {
    runId,
    timestamp: new Date().toISOString(),
    baseUrl,
    totalQueries: results.length,
    passed,
    failed,
    passRate,
    avgLatencyMs: Math.round(avgLatencyMs),
    results,
    regressions,
    improvements,
  };

  // Print summary
  console.log("\n" + "═".repeat(70));
  console.log(`📊 EVAL REPORT: ${runId}`);
  console.log(`   Pass rate: ${passed}/${results.length} (${(passRate * 100).toFixed(1)}%)`);
  console.log(`   Avg latency: ${report.avgLatencyMs}ms`);
  if (regressions.length > 0) {
    console.log(`   🔴 REGRESSIONS: ${regressions.length}`);
    regressions.forEach((r) => console.log(`      - ${r}`));
  }
  if (improvements.length > 0) {
    console.log(`   🟢 IMPROVEMENTS: ${improvements.length}`);
    improvements.forEach((r) => console.log(`      - ${r}`));
  }
  console.log("═".repeat(70));

  return report;
}

/* ─── CLI entry ────────────────────────────────────────────────────────────── */

const baseUrl = process.argv.find((a) => a.startsWith("--base-url="))?.split("=")[1]
  ?? process.argv[process.argv.indexOf("--base-url") + 1]
  ?? "http://localhost:3100";

runEval(baseUrl).then((report) => {
  // Exit with non-zero if any regressions
  if (report.regressions.length > 0) {
    console.log("\n💥 Regressions detected — exiting with code 1");
    process.exit(1);
  }
  if (report.passRate < 0.5) {
    console.log(`\n⚠️ Pass rate below 50% (${(report.passRate * 100).toFixed(1)}%) — exiting with code 1`);
    process.exit(1);
  }
  console.log("\n✅ Eval complete — no regressions");
}).catch((err) => {
  console.error("Eval failed:", err);
  process.exit(2);
});

export { runEval, TEST_CORPUS, type EvalReport, type EvalResult };
