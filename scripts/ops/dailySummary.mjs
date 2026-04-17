#!/usr/bin/env node
/**
 * dailySummary.mjs — runs the full load-test suite once per day, then
 * appends a summary row to the Notion ops database AND sends a single
 * ntfy digest to the `nodebench-dev` topic.
 *
 * Designed to be run from .github/workflows/notebook-daily.yml so it's
 * fully external to the app: even if the app is on fire, this keeps
 * producing evidence and paging the operator.
 *
 * Inputs (env):
 *   VITE_CONVEX_URL / CONVEX_URL   — required
 *   OPS_NTFY_URL                    — optional, posts digest
 *   NOTION_API_KEY, NOTION_DATABASE_ID  — optional, appends row
 *   DAILY_CLIENTS (default 10), DAILY_DURATION (default 60)
 *
 * Output:
 *   .tmp/notebook-daily-<date>.json  — full metrics for archival
 *   stdout: pretty-printed markdown summary
 *   ntfy: one message titled "[Daily] Notebook summary <date>"
 *   Notion: one database row with Status + P95 + Errors + detail body
 *
 * Exit codes:
 *   0 = green (within SLOs)
 *   1 = yellow (one scenario over threshold — worth reviewing, not paging)
 *   2 = red (multiple scenarios over threshold or fatal)
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendDailySummary, isNotionConfigured } from "./notionClient.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = resolve(ROOT, ".tmp");
mkdirSync(OUT_DIR, { recursive: true });

const TODAY = new Date().toISOString().slice(0, 10);
const OUT_JSON = resolve(OUT_DIR, `notebook-daily-${TODAY}.json`);

const CLIENTS = process.env.DAILY_CLIENTS ?? "10";
const DURATION = process.env.DAILY_DURATION ?? "60";

const SLO_P95_MS = Number(process.env.DAILY_P95_MS_BUDGET ?? 500);
const SLO_ERROR_RATE = Number(process.env.DAILY_ERROR_RATE_BUDGET ?? 0.05);

console.log(`[daily] starting ${TODAY} — clients=${CLIENTS}, duration=${DURATION}s`);

const result = spawnSync(
  "node",
  [
    "scripts/loadtest/notebook-load.mjs",
    "--entity", "softbank",
    "--scenario", "all",
    "--clients", CLIENTS,
    "--duration", DURATION,
    "--jsonOut", OUT_JSON,
  ],
  { cwd: ROOT, stdio: ["inherit", "inherit", "inherit"] },
);

if (result.error) {
  console.error("[daily] load-test crashed:", result.error.message);
  await postDigest("red", "Load test crashed", {
    error: result.error.message,
    date: TODAY,
  });
  process.exit(2);
}

let json;
try {
  json = JSON.parse(readFileSync(OUT_JSON, "utf8"));
} catch (err) {
  console.error("[daily] failed to parse output JSON:", err?.message);
  await postDigest("red", "Could not parse load-test JSON", {
    error: err?.message,
    date: TODAY,
  });
  process.exit(2);
}

const scenarios = json.summary ?? [];
const worstP95 = Math.max(0, ...scenarios.map((s) => s.p95 ?? 0));
const totalErrors = scenarios.reduce((sum, s) => sum + (s.errors ?? 0), 0);
const totalOps = scenarios.reduce((sum, s) => sum + (s.total ?? 0), 0);

// Per-scenario SLO check: expectedErrorCodes are subtracted before calling
// the error rate a breach.
function unexpectedErrorCount(s) {
  const expected = new Set(s.expectedErrorCodes ?? []);
  return Object.entries(s.errorCodes ?? {})
    .filter(([code]) => !expected.has(code))
    .reduce((sum, [, count]) => sum + count, 0);
}

const breaches = scenarios
  .map((s) => {
    const unexpected = unexpectedErrorCount(s);
    const errorRate = s.total > 0 ? unexpected / s.total : 0;
    const breached =
      (s.p95 != null && s.p95 > SLO_P95_MS) || errorRate > SLO_ERROR_RATE;
    return { scenario: s.scenario, p95: s.p95, errorRate, breached, unexpected };
  })
  .filter((x) => x.breached);

let status = "green";
if (breaches.length === 1) status = "yellow";
if (breaches.length >= 2 || result.status !== 0) status = "red";

const statusEmoji = { green: "✅", yellow: "⚠️", red: "🚨" }[status];

const bodyMarkdown = buildMarkdown({
  status,
  statusEmoji,
  date: TODAY,
  worstP95,
  totalErrors,
  totalOps,
  scenarios,
  breaches,
  sloP95: SLO_P95_MS,
  sloErrorRate: SLO_ERROR_RATE,
  gitSha: safeGitSha(),
});

console.log("\n\n" + bodyMarkdown + "\n");

// Push to Notion (best-effort — fail-open)
if (isNotionConfigured()) {
  const notionRes = await appendDailySummary({
    title: `${statusEmoji} Notebook daily — ${TODAY}`,
    status,
    p95Ms: worstP95,
    errorCount: totalErrors,
    bodyMarkdown,
  });
  if (notionRes.ok) {
    console.log(`[daily] posted to Notion: ${notionRes.pageId}`);
  } else {
    console.warn(`[daily] Notion post failed (fail-open):`, notionRes.error);
  }
} else {
  console.log("[daily] Notion not configured — skipped");
}

// Send ntfy digest (one message, regardless of status — users want the
// green heartbeat too so they know the job ran).
await postDigest(status, `Notebook daily — ${TODAY}`, {
  worstP95,
  totalErrors,
  totalOps,
  breaches: breaches.length,
  ntfyUrl: process.env.OPS_NTFY_URL ?? "(not configured)",
});

process.exit(status === "green" ? 0 : status === "yellow" ? 1 : 2);

// ----------------------------- helpers -----------------------------------

async function postDigest(status, title, body) {
  const url = process.env.OPS_NTFY_URL;
  if (!url) return;
  const priority = status === "red" ? 5 : status === "yellow" ? 4 : 3;
  const tag =
    status === "red" ? "rotating_light" : status === "yellow" ? "warning" : "white_check_mark";
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Title: `[Daily ${status.toUpperCase()}] ${title}`.slice(0, 250),
        Priority: String(priority),
        Tags: tag,
      },
      body:
        typeof body === "string"
          ? body
          : Object.entries(body)
              .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
              .join("\n"),
    });
  } catch (err) {
    console.warn("[daily] ntfy post failed (fail-open):", err?.message ?? err);
  }
}

function buildMarkdown({
  status, statusEmoji, date, worstP95, totalErrors, totalOps,
  scenarios, breaches, sloP95, sloErrorRate, gitSha,
}) {
  const lines = [
    `# ${statusEmoji} Notebook daily summary — ${date}`,
    "",
    `**Status**: ${status.toUpperCase()} · **Git**: ${gitSha} · **Ops**: ${totalOps.toLocaleString()} · **Errors**: ${totalErrors} · **Worst p95**: ${worstP95}ms (SLO ${sloP95}ms)`,
    "",
    "## Scenarios",
    "",
    "| Scenario | ok/total | p50 | p95 | p99 | error% |",
    "|---|---|---|---|---|---|",
  ];
  for (const s of scenarios) {
    lines.push(
      `| ${s.scenario} | ${s.ok}/${s.total} | ${s.p50 ?? "-"}ms | ${s.p95 ?? "-"}ms | ${s.p99 ?? "-"}ms | ${(s.errorRatePct ?? 0).toFixed(2)}% |`,
    );
  }
  lines.push("");
  if (breaches.length > 0) {
    lines.push("## SLO breaches");
    lines.push("");
    for (const b of breaches) {
      lines.push(
        `- **${b.scenario}**: p95 ${b.p95}ms, unexpected errors ${(b.errorRate * 100).toFixed(2)}% (SLO ${sloP95}ms, ${(sloErrorRate * 100).toFixed(0)}%)`,
      );
    }
    lines.push("");
    lines.push("### Next steps");
    lines.push("");
    lines.push("```bash");
    lines.push("# Capture state for a Claude Code or Codex fix session:");
    lines.push("npm run notebook:diagnose");
    lines.push("```");
    lines.push("");
    lines.push("See `docs/architecture/NOTEBOOK_RUNBOOK.md` for per-code triage.");
  } else {
    lines.push("_All scenarios within SLO. No action required._");
  }
  return lines.join("\n");
}

function safeGitSha() {
  try {
    const res = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT });
    return String(res.stdout ?? "unknown").trim() || "unknown";
  } catch {
    return "unknown";
  }
}
