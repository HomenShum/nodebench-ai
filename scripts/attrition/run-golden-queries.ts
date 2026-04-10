#!/usr/bin/env node
/**
 * run-golden-queries.ts — Attrition-powered pipeline quality benchmark.
 *
 * Runs all golden queries against Pipeline v2, judges each result,
 * produces a pass/fail scorecard. Designed to run:
 * - After every deploy (GitHub Action)
 * - On demand (npx tsx scripts/attrition/run-golden-queries.ts)
 * - Via attrition.sh benchmark lane
 *
 * Exit code 0 = all pass, 1 = regressions detected.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const API_URL = process.env.NODEBENCH_API_URL ?? "http://localhost:3100";
const GOLDEN_PATH = path.join(import.meta.dirname ?? __dirname, "golden-queries.json");

interface GoldenQuery {
  id: string;
  query: string;
  lens: string;
  expectedEntity: string | null;
  minConfidence: number;
  minSignals: number;
  minSources: number;
  expectDCF: boolean;
  tags: string[];
}

interface QueryResult {
  id: string;
  query: string;
  passed: boolean;
  failures: string[];
  entityName: string;
  confidence: number;
  signals: number;
  sources: number;
  hasDCF: boolean;
  durationMs: number;
  painResolutions: number;
}

async function runQuery(gq: GoldenQuery): Promise<QueryResult> {
  const start = Date.now();
  try {
    const resp = await fetch(`${API_URL}/api/pipeline/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: gq.query, lens: gq.lens }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok) {
      return {
        id: gq.id, query: gq.query, passed: false,
        failures: [`HTTP ${resp.status}`],
        entityName: "", confidence: 0, signals: 0, sources: 0,
        hasDCF: false, durationMs: Date.now() - start, painResolutions: 0,
      };
    }

    const data = await resp.json() as any;
    const failures: string[] = [];

    const entityName = data.entityName ?? "";
    const confidence = data.confidence ?? 0;
    const signals = data.variables?.length ?? 0;
    const sources = data.sourceRefs?.length ?? 0;
    const hasDCF = !!data.dcf;
    const painResolutions = data.painResolutions?.length ?? 0;

    // Judge against golden criteria
    if (gq.expectedEntity && !entityName.toLowerCase().includes(gq.expectedEntity.toLowerCase())) {
      failures.push(`Entity mismatch: got "${entityName}", expected "${gq.expectedEntity}"`);
    }
    if (confidence < gq.minConfidence) {
      failures.push(`Confidence ${confidence}% < min ${gq.minConfidence}%`);
    }
    if (signals < gq.minSignals) {
      failures.push(`Signals ${signals} < min ${gq.minSignals}`);
    }
    if (sources < gq.minSources) {
      failures.push(`Sources ${sources} < min ${gq.minSources}`);
    }
    if (gq.expectDCF && !hasDCF) {
      failures.push(`Expected DCF valuation but none produced`);
    }

    return {
      id: gq.id, query: gq.query, passed: failures.length === 0,
      failures, entityName, confidence, signals, sources,
      hasDCF, durationMs: Date.now() - start, painResolutions,
    };
  } catch (err: any) {
    return {
      id: gq.id, query: gq.query, passed: false,
      failures: [err.message ?? "Unknown error"],
      entityName: "", confidence: 0, signals: 0, sources: 0,
      hasDCF: false, durationMs: Date.now() - start, painResolutions: 0,
    };
  }
}

async function main() {
  console.log(`\n  🔍 NodeBench Golden Queries Benchmark\n  API: ${API_URL}\n`);

  const golden: { queries: GoldenQuery[] } = JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf-8"));
  const results: QueryResult[] = [];

  for (const gq of golden.queries) {
    process.stdout.write(`  ${gq.id.padEnd(25)}`);
    const result = await runQuery(gq);
    results.push(result);

    if (result.passed) {
      console.log(`\x1b[32m✓ PASS\x1b[0m  ${result.confidence}% conf  ${result.signals} sig  ${result.sources} src  ${result.durationMs}ms${result.hasDCF ? "  DCF" : ""}`);
    } else {
      console.log(`\x1b[31m✗ FAIL\x1b[0m  ${result.failures.join(" | ")}`);
    }
  }

  // Scorecard
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const passRate = Math.round((passed / total) * 100);
  const avgConfidence = Math.round(results.reduce((s, r) => s + r.confidence, 0) / total);
  const avgLatency = Math.round(results.reduce((s, r) => s + r.durationMs, 0) / total);
  const dcfCount = results.filter(r => r.hasDCF).length;

  console.log(`\n  ─── SCORECARD ───`);
  console.log(`  Pass rate:      ${passed}/${total} (${passRate}%)`);
  console.log(`  Avg confidence: ${avgConfidence}%`);
  console.log(`  Avg latency:    ${avgLatency}ms`);
  console.log(`  DCF produced:   ${dcfCount}/${results.filter(r => golden.queries.find(q => q.id === r.id)?.expectDCF).length} expected`);
  console.log(`  Pain resolved:  ${results.reduce((s, r) => s + r.painResolutions, 0)} total\n`);

  // Write results to file for attrition ingestion
  const reportPath = path.join(import.meta.dirname ?? __dirname, "golden-results.json");
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    apiUrl: API_URL,
    passRate,
    passed,
    total,
    avgConfidence,
    avgLatency,
    results,
  }, null, 2));
  console.log(`  Results: ${reportPath}\n`);

  process.exit(passed === total ? 0 : 1);
}

main();
