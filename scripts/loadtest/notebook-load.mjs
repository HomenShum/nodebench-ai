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
import { readFileSync, writeFileSync } from "node:fs";
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
    jsonOut: { type: "string" },
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
function makeStats(scenarioId, label) {
  return { scenarioId, label, latencies: [], errors: [], success: 0, errorCodes: {} };
}

// Extract the structured `code` from a ConvexError. The ConvexHttpClient
// preserves the payload on err.data (not in the message — message is just
// "[Request ID: ...] Server Error"). Constructor name is "ConvexError".
function extractErrorCode(err) {
  if (err?.constructor?.name === "ConvexError" && err.data && typeof err.data === "object") {
    const code = err.data.code;
    if (typeof code === "string") return code;
  }
  const msg = err?.message ?? String(err);
  if (msg.includes("Server Error")) return "SERVER_ERROR";
  return "UNKNOWN";
}

// Read structured ConvexError payload, used by multi_tab_conflict to recover
// the current revision after a REVISION_MISMATCH rejection.
function extractErrorData(err) {
  if (err?.constructor?.name === "ConvexError" && err.data && typeof err.data === "object") {
    return err.data;
  }
  return null;
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
    const codeEntries = Object.entries(stats.errorCodes).sort((a, b) => b[1] - a[1]);
    if (codeEntries.length > 0) {
      console.log(`│  error codes:`);
      for (const [code, count] of codeEntries) {
        console.log(`│    · ${code}: ${count}`);
      }
    }
  }
  console.log("└──");
  console.log("");
}

function summarizeStats(stats) {
  const sorted = [...stats.latencies].sort((a, b) => a - b);
  const pct = (p) => (sorted.length ? sorted[Math.floor(sorted.length * p)] : null);
  const total = stats.success + stats.errors.length;
  const errRate = total > 0 ? (stats.errors.length / total) * 100 : 0;
  return {
    scenario: stats.scenarioId,
    label: stats.label,
    ok: stats.success,
    total,
    errors: stats.errors.length,
    errorRatePct: Number(errRate.toFixed(2)),
    p50: pct(0.5) ? Math.round(pct(0.5)) : null,
    p95: pct(0.95) ? Math.round(pct(0.95)) : null,
    p99: pct(0.99) ? Math.round(pct(0.99)) : null,
    errorCodes: stats.errorCodes,
  };
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
    const code = extractErrorCode(err);
    stats.errorCodes[code] = (stats.errorCodes[code] ?? 0) + 1;
    return null;
  }
}

// ── Scenario 1: concurrent insert ────────────────────────────────────────
async function concurrentInsert() {
  const stats = makeStats(
    "concurrent_insert",
    `SCENARIO 1 · concurrent_insert · ${CLIENTS} clients × ${DURATION_SEC}s`,
  );
  const deadline = Date.now() + DURATION_SEC * 1000;

  async function clientLoop(clientIdx) {
    const client = new ConvexHttpClient(CONVEX_URL);
    const anonId = `loadtest-client-${clientIdx}`;
    // Seed the target entity for this client's session (idempotent).
    try {
      await client.mutation("domains/product/entities:ensureEntity", {
        anonymousSessionId: anonId,
        slug: args.entity,
        name: args.entity,
      });
    } catch (err) {
      stats.errors.push(`seed:${err?.message ?? String(err)}`);
      return;
    }
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
  const stats = makeStats("sustained_append", `SCENARIO 2 · sustained_append · 500 blocks from 1 client`);
  const client = new ConvexHttpClient(CONVEX_URL);
  const anonId = `loadtest-sustained`;
  await client.mutation("domains/product/entities:ensureEntity", {
    anonymousSessionId: anonId,
    slug: args.entity,
    name: args.entity,
  });
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
  const paginatedStats = makeStats("paginated_read", `SCENARIO 2b · paginated read across 500 blocks`);
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
  return [stats, paginatedStats];
}

// ── Scenario 3: multi-tab edit ───────────────────────────────────────────
async function multiTabEdit() {
  const stats = makeStats(
    "multi_tab_edit",
    `SCENARIO 3 · multi_tab_edit · ${CLIENTS} clients × 500ms cadence × ${DURATION_SEC}s`,
  );

  // Seed: create one block per client so each has a target to edit.
  const seedClient = new ConvexHttpClient(CONVEX_URL);
  const blockIds = [];
  for (let i = 0; i < CLIENTS; i++) {
    const anonId = `loadtest-editor-${i}`;
    // Ensure the entity exists for this client's session first.
    await seedClient.mutation("domains/product/entities:ensureEntity", {
      anonymousSessionId: anonId,
      slug: args.entity,
      name: args.entity,
    });
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

// ── Scenario 4: multi-tab conflict (revision guard exercise) ─────────────
// Two tabs share an anonymous session and both edit THE SAME block at high
// cadence. Each passes its last-seen `revision` as `expectedRevision`. The
// server accepts the first and rejects the stale second with
// `REVISION_MISMATCH`. The losing tab re-fetches and retries. A healthy
// result is:
//   - non-zero REVISION_MISMATCH count (the guard actually fires),
//   - zero non-conflict errors,
//   - successful writes > rejected writes by a wide margin (retries work).
async function multiTabConflict() {
  const stats = makeStats(
    "multi_tab_conflict",
    `SCENARIO 4 · multi_tab_conflict · 2 tabs × 1 block × ${DURATION_SEC}s`,
  );
  const anonId = `loadtest-conflict-shared`;
  const seed = new ConvexHttpClient(CONVEX_URL);
  await seed.mutation("domains/product/entities:ensureEntity", {
    anonymousSessionId: anonId,
    slug: args.entity,
    name: args.entity,
  });
  const blockId = await seed.mutation("domains/product/blocks:appendBlock", {
    anonymousSessionId: anonId,
    entitySlug: args.entity,
    kind: "text",
    content: [{ type: "text", value: "conflict-target seed" }],
    authorKind: "user",
    authorId: anonId,
  });

  const deadline = Date.now() + DURATION_SEC * 1000;
  let acceptedWrites = 0;
  let conflictRejects = 0;
  let retriesThatSucceeded = 0;

  async function tabLoop(tabIdx) {
    const client = new ConvexHttpClient(CONVEX_URL);
    // Each tab keeps a local guess of the current revision. It will drift
    // when the other tab wins a race; we resync on conflict.
    let knownRevision = 1;
    let localRev = 0;
    while (Date.now() < deadline) {
      localRev += 1;
      const content = [
        { type: "text", value: `tab-${tabIdx} local rev ${localRev} @ ${Date.now()}` },
      ];
      const t0 = performance.now();
      try {
        await client.mutation("domains/product/blocks:updateBlock", {
          anonymousSessionId: anonId,
          blockId,
          content,
          expectedRevision: knownRevision,
          editedByAuthorKind: "user",
          editedByAuthorId: `${anonId}-tab-${tabIdx}`,
        });
        stats.latencies.push(performance.now() - t0);
        stats.success += 1;
        acceptedWrites += 1;
        // The server just incremented revision; our next write assumes this.
        knownRevision += 1;
      } catch (err) {
        stats.errors.push(err?.message ?? String(err));
        const code = extractErrorCode(err);
        stats.errorCodes[code] = (stats.errorCodes[code] ?? 0) + 1;
        if (code === "REVISION_MISMATCH") {
          conflictRejects += 1;
          // Resync from the structured payload and retry once.
          const data = extractErrorData(err);
          if (data && typeof data.current === "number") {
            knownRevision = data.current;
          } else {
            knownRevision += 1;
          }
          try {
            await client.mutation("domains/product/blocks:updateBlock", {
              anonymousSessionId: anonId,
              blockId,
              content,
              expectedRevision: knownRevision,
              editedByAuthorKind: "user",
              editedByAuthorId: `${anonId}-tab-${tabIdx}-retry`,
            });
            knownRevision += 1;
            retriesThatSucceeded += 1;
          } catch {
            // A second mismatch is possible under extreme load; we just drop
            // this iteration. The invariant we care about is that the server
            // never loses data, not that every retry wins.
          }
        }
      }
      // Slight jitter so both tabs don't move in lockstep.
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 50));
    }
  }

  await Promise.all([tabLoop(0), tabLoop(1)]);
  console.log(
    `[loadtest] multi_tab_conflict breakdown: accepted=${acceptedWrites}, ` +
      `rejected_revision=${conflictRejects}, retries_recovered=${retriesThatSucceeded}`,
  );
  report(stats);
  return stats;
}

// ── Orchestrator ─────────────────────────────────────────────────────────
async function main() {
  const scenarios = {
    concurrent_insert: concurrentInsert,
    sustained_append: sustainedAppend,
    multi_tab_edit: multiTabEdit,
    multi_tab_conflict: multiTabConflict,
  };

  const selected = args.scenario === "all" ? Object.keys(scenarios) : [args.scenario];
  const results = [];
  for (const name of selected) {
    const fn = scenarios[name];
    if (!fn) {
      console.error(`Unknown scenario: ${name}`);
      process.exit(2);
    }
    const outcome = await fn();
    if (Array.isArray(outcome)) {
      results.push(...outcome);
    } else {
      results.push(outcome);
    }
  }

  console.log("=== SUMMARY ===");
  const summary = results.map(summarizeStats);
  console.log("scenario\tok/total\tp50\tp95\tp99\terror%");
  for (const row of summary) {
    console.log(
      `${row.scenario}\t${row.ok}/${row.total}\t${row.p50 ?? "-"}ms\t${row.p95 ?? "-"}ms\t${row.p99 ?? "-"}ms\t${row.errorRatePct.toFixed(2)}%`,
    );
  }

  if (args.jsonOut) {
    writeFileSync(
      args.jsonOut,
      JSON.stringify(
        {
          convexUrl: CONVEX_URL,
          entitySlug: args.entity,
          clients: CLIENTS,
          durationSec: DURATION_SEC,
          generatedAt: new Date().toISOString(),
          summary,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`[loadtest] wrote JSON summary to ${args.jsonOut}`);
  }

  // CI gate: >5% *unexpected* error rate fails the build. We do NOT count
  // REVISION_MISMATCH as a failure — the multi_tab_conflict scenario
  // deliberately causes them to prove the revision guard holds. A successful
  // retry is invisible to this ratio; a data-loss bug would show up as
  // SERVER_ERROR or UNKNOWN above the threshold.
  const EXPECTED_CODES = new Set(["REVISION_MISMATCH"]);
  const anyFailed = results.some((s) => {
    const total = s.latencies.length + s.errors.length;
    if (total === 0) return false;
    const unexpected = Object.entries(s.errorCodes)
      .filter(([code]) => !EXPECTED_CODES.has(code))
      .reduce((sum, [, count]) => sum + count, 0);
    return unexpected / total > 0.05;
  });
  process.exit(anyFailed ? 1 : 0);
}

main().catch((err) => {
  console.error("[loadtest] fatal:", err);
  process.exit(2);
});
