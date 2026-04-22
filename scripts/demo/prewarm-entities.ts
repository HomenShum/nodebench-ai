#!/usr/bin/env tsx
/**
 * Demo Pre-Warm — seed searchCache for conference entities
 *
 * Run the night before demo. Hits the fast path for each scripted entity
 * 3 times to populate:
 *  - Convex `searchCache` (existing, by normalized prompt)
 *  - In-memory singleflight caches (warm on first live hit)
 *
 * Usage:
 *   BASE_URL=https://www.nodebenchai.com \
 *   NODEBENCH_API_KEY=... \
 *   npx tsx scripts/demo/prewarm-entities.ts
 *
 * Output:
 *   JSON report to stdout + written to .tmp/demo-prewarm-{timestamp}.json
 *
 * Related: docs/architecture/DEMO_PREFLIGHT.md
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "https://www.nodebenchai.com";
const API_KEY = process.env.NODEBENCH_API_KEY ?? "";
const REPEATS = Number(process.env.PREWARM_REPEATS ?? 3);
const DELAY_BETWEEN_MS = Number(process.env.PREWARM_DELAY_MS ?? 250);

/**
 * Demo entities — the exact list the on-stage script will reference.
 * Keep in lockstep with the demo narrative. Edit before each demo.
 */
const DEMO_ENTITIES = [
  "Stripe",
  "Anthropic",
  "OpenAI",
  "Perplexity",
  "Cursor",
  "Ramp",
  "Figma",
  "Mistral",
  "Cohere",
  "Linear",
] as const;

/**
 * Demo prompts — for each entity, the exact fast-path prompts we plan to
 * demo. Mirror these in the Lane C eval subset.
 */
const DEMO_PROMPT_TEMPLATES = (entity: string) => [
  `Tell me about ${entity}.`,
  `What matters most about ${entity} right now?`,
  `Give me a 60-second pitch on ${entity}.`,
];

interface WarmupResult {
  entity: string;
  prompt: string;
  attempt: number;
  status: "ok" | "error";
  latencyMs: number;
  httpStatus?: number;
  sourceCount?: number;
  cachedHit?: boolean;
  errorMessage?: string;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function warmOne(prompt: string, attempt: number, entity: string): Promise<WarmupResult> {
  const start = Date.now();
  // Use a stable owner key for the pre-warm user — lets downstream analytics
  // and the rateLimitGuard bucket this traffic separately from real users.
  const ownerKey = process.env.PREWARM_OWNER_KEY ?? "demo-prewarm";
  try {
    const response = await fetch(`${BASE_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: API_KEY ? `Bearer ${API_KEY}` : "",
        "x-demo-prewarm": "true",
        "x-owner-key": ownerKey,
      },
      // Real /search POST payload shape per server/routes/search.ts parseSearchInput
      // (query/lens/daysBack/ownerKey/contextHint). We pass lens=founder to mirror
      // the most common stage-demo persona.
      body: JSON.stringify({
        query: prompt,
        lens: process.env.PREWARM_LENS ?? "founder",
        ownerKey,
        contextHint: "demo-prewarm",
      }),
    });
    const latencyMs = Date.now() - start;

    if (!response.ok) {
      return {
        entity,
        prompt,
        attempt,
        status: "error",
        latencyMs,
        httpStatus: response.status,
        errorMessage: await response.text().then((t) => t.slice(0, 200)),
      };
    }

    const data = await response.json().catch(() => ({}));
    // /search can return either { sources, ... } (result packet) or
    // { trace, ... } depending on flags. Extract source count defensively.
    const sources =
      (data as { sources?: unknown[] }).sources ??
      (data as { result?: { sources?: unknown[] } }).result?.sources;
    return {
      entity,
      prompt,
      attempt,
      status: "ok",
      latencyMs,
      httpStatus: response.status,
      sourceCount: Array.isArray(sources) ? sources.length : undefined,
      cachedHit: Boolean((data as { fromCache?: boolean }).fromCache),
    };
  } catch (err) {
    return {
      entity,
      prompt,
      attempt,
      status: "error",
      latencyMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  console.log(`[prewarm] target: ${BASE_URL}`);
  console.log(`[prewarm] entities: ${DEMO_ENTITIES.length}, repeats: ${REPEATS}`);

  const results: WarmupResult[] = [];
  const startAll = Date.now();

  for (const entity of DEMO_ENTITIES) {
    const prompts = DEMO_PROMPT_TEMPLATES(entity);
    for (const prompt of prompts) {
      for (let attempt = 1; attempt <= REPEATS; attempt++) {
        const r = await warmOne(prompt, attempt, entity);
        results.push(r);
        const statusIcon = r.status === "ok" ? "✓" : "✗";
        const cacheIcon = r.cachedHit ? "[cache]" : "[cold] ";
        console.log(
          `  ${statusIcon} ${cacheIcon} ${entity.padEnd(14)} attempt ${attempt}/${REPEATS}  ${r.latencyMs}ms  ${r.prompt}`,
        );
        await sleep(DELAY_BETWEEN_MS);
      }
    }
  }

  const totalMs = Date.now() - startAll;

  const summary = {
    baseUrl: BASE_URL,
    totalRequests: results.length,
    okCount: results.filter((r) => r.status === "ok").length,
    errorCount: results.filter((r) => r.status === "error").length,
    cachedHitCount: results.filter((r) => r.cachedHit).length,
    avgLatencyMs: Math.round(
      results.reduce((s, r) => s + r.latencyMs, 0) / Math.max(1, results.length),
    ),
    p95LatencyMs: percentile(
      results.map((r) => r.latencyMs),
      0.95,
    ),
    totalDurationMs: totalMs,
    results,
    completedAt: new Date().toISOString(),
  };

  const outDir = resolve(process.cwd(), ".tmp");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, `demo-prewarm-${Date.now()}.json`);
  writeFileSync(outFile, JSON.stringify(summary, null, 2));

  console.log("");
  console.log("========================================");
  console.log(`total       : ${summary.totalRequests}`);
  console.log(`ok          : ${summary.okCount}`);
  console.log(`errors      : ${summary.errorCount}`);
  console.log(`cache hits  : ${summary.cachedHitCount}`);
  console.log(`avg latency : ${summary.avgLatencyMs}ms`);
  console.log(`p95 latency : ${summary.p95LatencyMs}ms`);
  console.log(`total time  : ${totalMs}ms`);
  console.log(`written to  : ${outFile}`);
  console.log("========================================");

  // Exit non-zero if any errors — caller (make/CI) should halt demo ship
  if (summary.errorCount > 0) {
    console.error(`\n[prewarm] FAIL: ${summary.errorCount} requests errored.`);
    process.exit(1);
  }
  if (summary.p95LatencyMs > 6000) {
    console.error(`\n[prewarm] WARN: p95 latency ${summary.p95LatencyMs}ms > 6000ms budget.`);
    process.exit(2);
  }
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx] ?? 0;
}

void main();
