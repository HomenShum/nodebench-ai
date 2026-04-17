#!/usr/bin/env node
/**
 * diagnose.mjs — bundles enough state to hand to Claude Code / Codex.
 *
 * Run when a ntfy alert fires:
 *   npm run notebook:diagnose
 *
 * Produces a single markdown string printed to stdout (also written to
 * .tmp/notebook-diagnose-latest.md for copy-paste via clipboard).
 *
 * Captures:
 *   - git sha + branch + last 5 commit messages
 *   - last hourly-health result (if any)
 *   - last daily summary (if any)
 *   - last N ntfy notifications from OPS_NTFY_URL (pulled from ntfy.sh JSON)
 *   - recent Convex errors (if npx convex logs is available)
 *   - current file state of the notebook surface
 *
 * Zero dependencies beyond Node built-ins and spawnSync.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TMP = resolve(ROOT, ".tmp");
mkdirSync(TMP, { recursive: true });

const OUT_FILE = resolve(TMP, "notebook-diagnose-latest.md");

const sections = [];

sections.push("# Notebook diagnose bundle");
sections.push(`**Generated**: ${new Date().toISOString()}`);
sections.push("");

// ── Git state ───────────────────────────────────────────────────────────
sections.push("## Git");
sections.push("```");
sections.push(`branch: ${run("git", ["rev-parse", "--abbrev-ref", "HEAD"])}`);
sections.push(`sha:    ${run("git", ["rev-parse", "--short", "HEAD"])}`);
sections.push(`dirty:  ${run("git", ["status", "--porcelain"]).split("\n").length} files`);
sections.push("");
sections.push("recent commits:");
sections.push(run("git", ["log", "--oneline", "-5"]));
sections.push("```");
sections.push("");

// ── Latest daily summary ────────────────────────────────────────────────
sections.push("## Last daily summary");
const dailyFiles = safeLs(TMP, /^notebook-daily-\d{4}-\d{2}-\d{2}\.json$/);
if (dailyFiles.length > 0) {
  const latest = dailyFiles.sort().slice(-1)[0];
  try {
    const daily = JSON.parse(readFileSync(resolve(TMP, latest), "utf8"));
    sections.push(`File: \`.tmp/${latest}\``);
    sections.push("```json");
    sections.push(JSON.stringify(daily.summary ?? daily, null, 2));
    sections.push("```");
  } catch (err) {
    sections.push(`_could not parse ${latest}: ${err?.message}_`);
  }
} else {
  sections.push("_no daily summary found — run `npm run notebook:daily` locally to generate one_");
}
sections.push("");

// ── Hourly health log ───────────────────────────────────────────────────
sections.push("## Hourly health (last local run)");
if (existsSync(resolve(TMP, "notebook-hourly-health.json"))) {
  sections.push("```json");
  sections.push(readFileSync(resolve(TMP, "notebook-hourly-health.json"), "utf8"));
  sections.push("```");
} else {
  sections.push("_no local hourly health log — run `npm run notebook:health` locally to populate_");
}
sections.push("");

// ── ntfy stream (last 15 messages) ──────────────────────────────────────
sections.push("## Recent ntfy alerts (last 15)");
const ntfyUrl = process.env.OPS_NTFY_URL;
if (ntfyUrl) {
  // ntfy exposes a /json endpoint that returns NDJSON. We poll with a timeout
  // so this doesn't hang.
  try {
    const topicUrl = new URL(ntfyUrl);
    // Path is `/<topic>` — append `/json?poll=1&since=1h` for recent history.
    const jsonUrl = `${topicUrl.origin}${topicUrl.pathname}/json?poll=1&since=6h`;
    const res = await fetchWithTimeout(jsonUrl, { method: "GET" }, 5000);
    if (res.ok) {
      const text = await res.text();
      const rows = text
        .split("\n")
        .filter(Boolean)
        .slice(-15)
        .map((line) => {
          try {
            const msg = JSON.parse(line);
            return `[${new Date(msg.time * 1000).toISOString()}] ${msg.title ?? ""}\n    ${(msg.message ?? "").slice(0, 200).replace(/\n/g, " | ")}`;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      sections.push("```");
      sections.push(rows.join("\n\n") || "(no messages in last 6h)");
      sections.push("```");
    } else {
      sections.push(`_ntfy fetch returned ${res.status}_`);
    }
  } catch (err) {
    sections.push(`_could not fetch ntfy history: ${err?.message}_`);
  }
} else {
  sections.push("_OPS_NTFY_URL not set — no alert history available_");
}
sections.push("");

// ── Convex logs (if available, last 100 lines) ──────────────────────────
sections.push("## Convex logs (last 100 lines)");
const convexLogs = run("npx", ["convex", "logs", "--prod", "--limit", "100"], { timeout: 10000 });
if (convexLogs.trim()) {
  sections.push("```");
  sections.push(convexLogs.slice(-6000));
  sections.push("```");
} else {
  sections.push("_no convex logs available (CLI missing or not authenticated)_");
}
sections.push("");

// ── Notebook source sha ─────────────────────────────────────────────────
sections.push("## Current notebook file state");
const files = [
  "src/features/entities/components/notebook/EntityNotebookLive.tsx",
  "convex/domains/product/blocks.ts",
  "convex/domains/product/blockOrdering.ts",
  "src/lib/notebookAlerts.ts",
];
sections.push("```");
for (const f of files) {
  const full = resolve(ROOT, f);
  if (existsSync(full)) {
    const stat = spawnSync("git", ["log", "-1", "--format=%h %s", "--", f], { cwd: ROOT });
    sections.push(`${f}: ${String(stat.stdout ?? "").trim()}`);
  }
}
sections.push("```");
sections.push("");

sections.push("## Next steps for the fix agent");
sections.push("");
sections.push("1. Read the ntfy alerts and the failing scenarios from the daily summary.");
sections.push("2. Use the Convex logs above to find the exact Request ID that failed.");
sections.push("3. Before writing any fix, trace root cause (see `.claude/rules/analyst_diagnostic.md`).");
sections.push("4. Run `node scripts/loadtest/notebook-load.mjs --scenario <name>` to reproduce.");
sections.push("5. Follow the runbook at `docs/architecture/NOTEBOOK_RUNBOOK.md` for per-code triage.");

const output = sections.join("\n");
console.log(output);
writeFileSync(OUT_FILE, output, "utf8");
console.error(`\n[diagnose] written to ${OUT_FILE}`);

// ----------------------------- helpers -----------------------------------

function run(cmd, args, options = {}) {
  try {
    const res = spawnSync(cmd, args, { cwd: ROOT, timeout: 5000, ...options });
    return String(res.stdout ?? "").trim() || String(res.stderr ?? "").trim();
  } catch {
    return "";
  }
}

function safeLs(dir, pattern) {
  try {
    return readdirSync(dir).filter((name) => pattern.test(name));
  } catch {
    return [];
  }
}

async function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
