/**
 * fetch-brief.mjs — Fetch daily brief from Convex HTTP API.
 *
 * Env:
 *   CONVEX_SITE_URL  — Convex deployment URL (e.g. https://xxx.convex.site)
 *   MCP_SECRET       — Shared secret for x-mcp-secret header
 *   FORCE_SIGNAL     — (optional) Manual signal override text
 *   GITHUB_OUTPUT    — (set by Actions) Path to write step outputs
 *
 * Outputs (GitHub Actions):
 *   has_signals  — "true" if signals found, "false" otherwise
 *   brief_path   — Path to the written JSON file
 */

import { writeFileSync, appendFileSync } from "node:fs";

const BRIEF_PATH = "/tmp/daily-brief.json";

function setOutput(key, value) {
  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput) {
    appendFileSync(ghOutput, `${key}=${value}\n`);
  }
  console.log(`::set-output name=${key}::${value}`);
}

async function main() {
  // Manual override mode
  const forceSignal = process.env.FORCE_SIGNAL;
  if (forceSignal && forceSignal.trim()) {
    console.log("Using manual signal override");
    const brief = {
      success: true,
      found: true,
      dateString: new Date().toISOString().slice(0, 10),
      persona: "GENERAL",
      narrativeThesis: forceSignal.trim(),
      signals: [{ title: "Manual Signal", summary: forceSignal.trim() }],
      actionItems: [],
      entitySpotlight: [],
      fundingRounds: [],
    };
    writeFileSync(BRIEF_PATH, JSON.stringify(brief, null, 2));
    setOutput("has_signals", "true");
    setOutput("brief_path", BRIEF_PATH);
    return;
  }

  // Fetch from Convex
  const siteUrl = process.env.CONVEX_SITE_URL;
  const secret = process.env.MCP_SECRET;

  if (!siteUrl || !secret) {
    console.error("Missing CONVEX_SITE_URL or MCP_SECRET");
    setOutput("has_signals", "false");
    return;
  }

  const url = `${siteUrl.replace(/\/$/, "")}/api/mcpBridge/daily-brief`;
  console.log(`Fetching daily brief from ${url}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(url, {
      method: "GET",
      headers: { "x-mcp-secret": secret },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`HTTP ${res.status}: ${await res.text()}`);
      setOutput("has_signals", "false");
      return;
    }

    const brief = await res.json();
    writeFileSync(BRIEF_PATH, JSON.stringify(brief, null, 2));

    const hasSignals =
      brief.found === true &&
      Array.isArray(brief.signals) &&
      brief.signals.length > 0;

    console.log(
      `Brief: found=${brief.found}, signals=${brief.signals?.length ?? 0}, thesis=${brief.narrativeThesis?.slice(0, 100) ?? "none"}`
    );

    setOutput("has_signals", hasSignals ? "true" : "false");
    setOutput("brief_path", BRIEF_PATH);
  } catch (err) {
    console.error(`Failed to fetch brief: ${err.message}`);
    setOutput("has_signals", "false");
  }
}

main();
