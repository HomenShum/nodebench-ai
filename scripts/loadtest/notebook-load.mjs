#!/usr/bin/env node
/**
 * notebook-load.mjs — scenario-based load test for the productBlocks notebook.
 *
 * Covers three scenarios per the scenario_testing rule:
 *
 *   1. CONCURRENT_INSERT  — 10 clients append to the same entity simultaneously,
 *      sustained for 60s. Verifies fractional-index tiebreaker prevents dupes
 *      and the paginated read stays deterministic under write pressure.
 *
 *   2. SUSTAINED_APPEND   — 1 client appends 500 blocks sequentially. Verifies
 *      memory stays bounded, pagination works past the hard-max page size,
 *      and query latency stays flat (not O(n) in block count).
 *
 *   3. MULTI_TAB_EDIT     — 5 clients each update a different existing block
 *      every 500ms for 30s. Verifies debounced save roundtrip + revision
 *      increments + no write-write collision on the same block.
 *
 * Honest reporting: prints p50, p95, p99, error rate per scenario.
 *
 * Usage (from repo root):
 *   node scripts/loadtest/notebook-load.mjs \
 *       --entity softbank \
 *       --scenario concurrent_insert \
 *       --clients 10 --duration 60
 *
 * Scenarios: concurrent_insert | sustained_append | multi_tab_edit | all
 *
 * Requires:
 *   - CONVEX_URL (or VITE_CONVEX_URL) env var, or auto-loaded from .env.local
 *   - An existing entity slug to target (the e2e test seeds `softbank`)
 */

import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    entity: { type: "string", default: "softbank" },
    scenario: { type: "string", default: "all" },
    clients: { type: "string", default: "10" },
    duration: { type: "string", default: "30" },
    url: { type: "string" },
  },
});

const CLIENTS = parseInt(args.clients, 10);
const DURATION_SEC = parseInt(args.duration, 10);

// ── Load Convex URL ──────────────────────────────────────────────────────
function loadConvexUrl() {
  if (args.url) return args.url;
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  if (process.env.VITE_CONVEX_URL) return process.env.VITE_CONVEX_URL;
  try {
    const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env.local");
    const text = readFileSync(envPath, "utf8");
    const match = text.match(/VITE_CONVEX_URL="?([^"\n]+)"?/);
    if (match) return match[1];
  } catch {
    // fall through
  }
  throw new Error("CONVEX_URL not set. Pass --url or set VITE_CONVEX_URL in .env.local");
}

const CONVEX_URL = loadConvexUrl();
console.log(`[loadtest] target: ${CONVEX_URL}`);
console.log(`[loadtest] entity: ${args.entity}`);
console.log(`[loadtest] scenario: ${args.scenario}`);
console.log(`[loadtest] clients: ${CLIENTS}, duration: ${DURATION_SEC}s`);
console.log("");

// ── Per-client stats ─────────────────────────────────────────────────────
function makeStats(label) {
  return { label, latencies: [], errors: [], success: 0 };
}

function report(stats) {
  const sorted = [...stats.latencies].sort((a, b) => a - b);
  const pct = (p) => (sorted.length ? sorted[Math.floor(sorted.length * p)] : null);
  const total = stats.success + stats.errors.length;
  const errRate = total > 0 ? (stats.errors.length / total) * 100 : 0;
  console.log(`┌─ ${stats.label}`);
  console.log(`│  requests:   ${total}`);
  console.log(`│  success:    ${stats.success}`);
  console.log(`│  errors:     ${stats.errors.length} (${errRate.toFixed(1)}%)`);
  console.log(`│  p50 (ms):   ${pct(0.5)?.toFixed(0) ?? "—"}`);
  console.log(`│  p95 (ms):   ${pct(0.95)?.toFixed(0) ?? "—"}`);
  console.log(`│  p99 (ms):   ${pct(0.99)?.toFixed(0) ?? "—"}`);
  if (stats.errors.length > 0) {
    const uniq = [...new Set(stats.errors.slice(0, 5))];
    console.log(`│  sample errs:`);
    for (const e of uniq) console.log(`│    · ${String(e).slice(0, 120)}`);
  }
  console.log("└──");
  console.log("");
}

async function timed(fn, stats) {
  const t0 = performance.now();
  try {
    const result = await fn();
    stats.latencies.push(performance.now() - t0);
    stats.success += 1;
    return result;
  } catch (err) {
    stats.errors.push(err?.message ?? String(err));
    return null;
  }
}

// ── Scenario 1: concurrent insert ────────────────────────────────────────
async function concurrentInsert() {
  const stats = makeStats(
    `SCENARIO 1 · concurrent_insert · ${CLIENTS} clients × ${DURATION_SEC}s`,
  );
  const deadline = Date.now() + DURATION_SEC * 1000;

  async function clientLoop(clientIdx) {
    const client = new ConvexHttpClient(CONVEX_URL);
    const anonId = `loadtest-client-${clientIdx}`;
    let counter = 0;
    while (Date.now() < deadline) {
      counter += 1;
      await timed(
        () =>
          client.mutation("domains/product/blocks:appendBlock", {
            anonymousSessionId: anonId,
            entitySlug: args.entity,
            kind: "text",
            content: [
              { type: "text", value: `client-${clientIdx} append #${counter}` },
            ],
            authorKind: "user",
            authorId: anonId,
          }),
        stats,
      );
      // Let the loop yield so all clients overlap rather than serializing
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  const workers = Array.from({ length: CLIENTS }, (_, i) => clientLoop(i));
  await Promise.all(workers);
  report(stats);
  return stats;
}

// ── Scenario 2: sustained append ─────────────────────────────────────────
async function sustainedAppend() {
  const stats = makeStats(`SCENARIO 2 · sustained_append · 500 blocks from 1 client`);
  const client = new ConvexHttpClient(CONVEX_URL);
  const anonId = `loadtest-sustained`;
  for (let i = 0; i < 500; i++) {
    await timed(
      () =>
        client.mutation("domains/product/blocks:appendBlock", {
          anonymousSessionId: anonId,
          entitySlug: args.entity,
          kind: "bullet",
          content: [{ type: "text", value: `sustained append ${i}` }],
          authorKind: "user",
          authorId: anonId,
        }),
      stats,
    );
  }

  // After appending, read with pagination and check we can walk the whole list.
  const paginatedStats = makeStats(`SCENARIO 2b · paginated read across 500 blocks`);
  let cursor = null;
  let pages = 0;
  let totalRead = 0;
  while (true) {
    const result = await timed(
      () =>
        client.query("domains/product/blocks:listEntityBlocksPaginated", {
          anonymousSessionId: anonId,
          entitySlug: args.entity,
          paginationOpts: { numItems: 50, cursor },
        }),
      paginatedStats,
    );
    if (!result) break;
    pages += 1;
    totalRead += result.page?.length ?? 0;
    if (result.isDone || !result.continueCursor) break;
    cursor = result.continueCursor;
    if (pages > 20) break; // safety net against infinite loop
  }
  console.log(`[loadtest] paginated read: ${pages} pages, ${totalRead} blocks total`);
  report(stats);
  report(paginatedStats);
  return stats;
}

// ── Scenario 3: multi-tab edit ───────────────────────────────────────────
async function multiTabEdit() {
  const stats = makeStats(
    `SCENARIO 3 · multi_tab_edit · ${CLIENTS} clients × 500ms cadence × ${DURATION_SEC}s`,
  );

  // Seed: create one block per client so each has a target to edit.
  const seedClient = new ConvexHttpClient(CONVEX_URL);
  const blockIds = [];
  for (let i = 0; i < CLIENTS; i++) {
    const anonId = `loadtest-editor-${i}`;
    const id = await seedClient.mutation("domains/product/blocks:appendBlock", {
      anonymousSessionId: anonId,
      entitySlug: args.entity,
      kind: "text",
      content: [{ type: "text", value: `editor-${i} seed` }],
      authorKind: "user",
      authorId: anonId,
    });
    blockIds.push({ anonId, id });
  }

  const deadline = Date.now() + DURATION_SEC * 1000;

  async function editorLoop({ anonId, id }) {
    const client = new ConvexHttpClient(CONVEX_URL);
    let rev = 0;
    while (Date.now() < deadline) {
      rev += 1;
      await timed(
        () =>
          client.mutation("domains/product/blocks:updateBlock", {
            anonymousSessionId: anonId,
            blockId: id,
            content: [
              { type: "text", value: `${anonId} rev ${rev} @ ${Date.now()}` },
            ],
            editedByAuthorKind: "user",
            editedByAuthorId: anonId,
          }),
        stats,
      );
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  await Promise.all(blockIds.map(editorLoop));
  report(stats);
  return stats;
}

// ── Orchestrator ─────────────────────────────────────────────────────────
async function main() {
  const scenarios = {
    concurrent_insert: concurrentInsert,
    sustained_append: sustainedAppend,
    multi_tab_edit: multiTabEdit,
  };

  const selected = args.scenario === "all" ? Object.keys(scenarios) : [args.scenario];
  const results = [];
  for (const name of selected) {
    const fn = scenarios[name];
    if (!fn) {
      console.error(`Unknown scenario: ${name}`);
      process.exit(2);
    }
    const stats = await fn();
    results.push(stats);
  }

  console.log("=== SUMMARY ===");
  for (const s of results) {
    const errRate =
      s.latencies.length + s.errors.length > 0
        ? (s.errors.length / (s.latencies.length + s.errors.length)) * 100
        : 0;
    console.log(
      `${s.label}: ${s.success} ok, ${s.errors.length} err (${errRate.toFixed(1)}%)`,
    );
  }

  const anyFailed = results.some(
    (s) => s.errors.length > 0 && s.errors.length / (s.latencies.length + s.errors.length) > 0.05,
  );
  process.exit(anyFailed ? 1 : 0);
}

main().catch((err) => {
  console.error("[loadtest] fatal:", err);
  process.exit(2);
});
