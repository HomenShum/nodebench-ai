#!/usr/bin/env node
/**
 * hourlyHealthCheck.mjs — 60-second health smoke against prod.
 *
 * Purpose (solo ops): give one signal every hour. Silent on green. Loud on red.
 *
 * What it does:
 *   1. ensures `softbank` entity exists on a throwaway loadtest session
 *   2. appends 60 blocks over 60 seconds (1 / second, a gentle heartbeat)
 *   3. paginates them back
 *   4. fails the run if p95 > 500ms OR error rate > 1% OR pagination breaks
 *   5. POSTs to OPS_NTFY_URL only when the run is degraded
 *
 * Run manually:
 *   node scripts/ops/hourlyHealthCheck.mjs
 *
 * Run in CI (see .github/workflows/notebook-hourly.yml). Set:
 *   VITE_CONVEX_URL or CONVEX_URL
 *   OPS_NTFY_URL=https://ntfy.sh/nodebench-dev
 *
 * Exit codes:
 *   0 = green (no alert sent)
 *   1 = degraded (alert sent)
 *   2 = script crashed before assessing (alert sent best-effort)
 */

import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BUDGET_P95_MS = Number(process.env.HEALTH_P95_MS_BUDGET ?? 500);
const BUDGET_ERROR_RATE = Number(process.env.HEALTH_ERROR_RATE_BUDGET ?? 0.01);
const APPEND_COUNT = Number(process.env.HEALTH_APPEND_COUNT ?? 60);

function loadConvexUrl() {
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  if (process.env.VITE_CONVEX_URL) return process.env.VITE_CONVEX_URL;
  try {
    const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env.local");
    const text = readFileSync(envPath, "utf8");
    const match = text.match(/VITE_CONVEX_URL="?([^"\n]+)"?/);
    if (match) return match[1];
  } catch {
    /* fall through */
  }
  throw new Error("CONVEX_URL / VITE_CONVEX_URL not set");
}

function extractErrorCode(err) {
  if (err?.constructor?.name === "ConvexError" && err.data?.code) return err.data.code;
  return "SERVER_ERROR";
}

async function publishNtfy(title, body, priority) {
  const url = process.env.OPS_NTFY_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Title: title.slice(0, 250),
        Priority: String(priority),
        Tags: priority >= 4 ? "rotating_light" : "warning",
      },
      body,
    });
  } catch {
    // Fail-open. Never throw from alerting.
  }
}

async function main() {
  const url = loadConvexUrl();
  const client = new ConvexHttpClient(url);
  const anonId = `hourly-health-${Date.now()}`;

  await client.mutation("domains/product/entities:ensureEntity", {
    anonymousSessionId: anonId,
    slug: "hourly-health",
    name: "hourly-health",
  });

  const latencies = [];
  const errorCodes = {};
  let successes = 0;

  // Append one block per second for APPEND_COUNT seconds. A heartbeat cadence
  // — not a stress test. We want to detect degradation, not cause it.
  for (let i = 0; i < APPEND_COUNT; i++) {
    const t0 = performance.now();
    try {
      await client.mutation("domains/product/blocks:appendBlock", {
        anonymousSessionId: anonId,
        entitySlug: "hourly-health",
        kind: "text",
        content: [{ type: "text", value: `heartbeat ${new Date().toISOString()}` }],
        authorKind: "user",
        authorId: anonId,
      });
      latencies.push(performance.now() - t0);
      successes++;
    } catch (err) {
      const code = extractErrorCode(err);
      errorCodes[code] = (errorCodes[code] ?? 0) + 1;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Paginate to verify reads
  let paginateOk = true;
  try {
    await client.query("domains/product/blocks:listEntityBlocksPaginated", {
      anonymousSessionId: anonId,
      entitySlug: "hourly-health",
      paginationOpts: { numItems: 50, cursor: null },
    });
  } catch {
    paginateOk = false;
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : null;
  const errorRate = successes + Object.values(errorCodes).reduce((s, c) => s + c, 0);
  const errorTotal = Object.values(errorCodes).reduce((s, c) => s + c, 0);
  const errorRateFraction = errorRate > 0 ? errorTotal / errorRate : 0;

  const degraded =
    !paginateOk ||
    (p95 !== null && p95 > BUDGET_P95_MS) ||
    errorRateFraction > BUDGET_ERROR_RATE;

  const summary = {
    timestamp: new Date().toISOString(),
    convexUrl: url,
    appends: successes,
    errors: errorTotal,
    errorCodes,
    p95Ms: p95 ? Math.round(p95) : null,
    paginateOk,
    degraded,
    budgetP95Ms: BUDGET_P95_MS,
    budgetErrorRate: BUDGET_ERROR_RATE,
  };

  // Always log JSON to stdout — makes CI log parsing trivial.
  console.log(JSON.stringify(summary, null, 2));

  if (degraded) {
    const reasons = [];
    if (!paginateOk) reasons.push("pagination failed");
    if (p95 !== null && p95 > BUDGET_P95_MS) reasons.push(`p95 ${Math.round(p95)}ms > ${BUDGET_P95_MS}ms`);
    if (errorRateFraction > BUDGET_ERROR_RATE) {
      reasons.push(`errors ${(errorRateFraction * 100).toFixed(1)}% > ${BUDGET_ERROR_RATE * 100}%`);
    }
    const body = [
      `When: ${summary.timestamp}`,
      `Why: ${reasons.join("; ")}`,
      `p95: ${summary.p95Ms}ms (budget ${BUDGET_P95_MS}ms)`,
      `Errors: ${JSON.stringify(errorCodes)}`,
      `Convex: ${url}`,
      "",
      "Next steps (paste into Claude Code / Codex):",
      "  npm run notebook:diagnose",
    ].join("\n");
    await publishNtfy("[P1] Notebook hourly health: degraded", body, 4);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(async (err) => {
  console.error("[hourly-health] fatal:", err?.message ?? err);
  await publishNtfy(
    "[P0] Notebook hourly health: script crashed",
    `Error: ${err?.message ?? String(err)}\nConvex: ${process.env.CONVEX_URL ?? "unknown"}`,
    5,
  );
  process.exit(2);
});
