#!/usr/bin/env node
/**
 * Sentinel Bridge - Push probe results into Convex observability tables
 *
 * Reads .sentinel/latest.json and posts each probe result as a health check
 * to the Convex backend via the HTTP API, bridging local CI/dev probes
 * with the live observability dashboard.
 *
 * Usage:
 *   node scripts/sentinel/bridge.mjs                   # push latest report
 *   node scripts/sentinel/bridge.mjs --dry-run          # preview without pushing
 *   CONVEX_URL=https://... node scripts/sentinel/bridge.mjs  # custom deployment
 */

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(import.meta.dirname, "../..");
const REPORT_PATH = join(ROOT, ".sentinel", "latest.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

// Convex deployment URL (HTTP actions endpoint)
const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || "";
const CONVEX_SITE_URL = CONVEX_URL.replace(/\.cloud\//, ".site/");

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

// Map sentinel probe names to health monitor component names
const PROBE_TO_COMPONENT = {
  build: "build_pipeline",
  e2e: "e2e_tests",
  design: "design_lint",
  dogfood: "dogfood_gate",
  voice: "voice_coverage",
  a11y: "accessibility",
  visual: "visual_qa",
  performance: "bundle_perf",
  contract: "mcp_contract",
};

function probeToHealthCheck(probe) {
  const component = PROBE_TO_COMPONENT[probe.probe] || probe.probe;
  const statusMap = { pass: "healthy", warn: "degraded", fail: "down", skip: "unknown" };

  return {
    component,
    status: statusMap[probe.status] || "unknown",
    latencyMs: probe.duration || 0,
    metrics: probe.meta || {},
    issues: (probe.failures || []).slice(0, 10),
    source: "sentinel",
    probeCategory: probe.category || probe.probe,
  };
}

async function pushToConvex(healthChecks) {
  if (!CONVEX_SITE_URL) {
    log("No CONVEX_URL set — cannot push to Convex. Set CONVEX_URL env var.");
    log("Checks that would be pushed:");
    for (const check of healthChecks) {
      log(`  ${check.component}: ${check.status} (${check.latencyMs}ms, ${check.issues.length} issues)`);
    }
    return;
  }

  const endpoint = `${CONVEX_SITE_URL}/api/sentinel/health-checks`;
  log(`Pushing ${healthChecks.length} health checks to ${endpoint}`);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checks: healthChecks, timestamp: Date.now() }),
    });

    if (res.ok) {
      const result = await res.json();
      log(`Pushed successfully: ${JSON.stringify(result)}`);
    } else {
      log(`Push failed: ${res.status} ${res.statusText}`);
      const body = await res.text().catch(() => "");
      if (body) log(`  Response: ${body.slice(0, 200)}`);
    }
  } catch (err) {
    log(`Push error: ${err.message}`);
  }
}

async function main() {
  log("=== Sentinel Bridge ===");

  if (!existsSync(REPORT_PATH)) {
    log(`No report found at ${REPORT_PATH}`);
    log("Run 'npm run sentinel:test' first to generate a report.");
    process.exit(1);
  }

  const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));
  log(`Report: ${report.id} (${report.probes?.length || 0} probes)`);

  const healthChecks = (report.probes || []).map(probeToHealthCheck);

  log(`\nHealth checks to push:`);
  for (const check of healthChecks) {
    const icon = check.status === "healthy" ? "+" : check.status === "degraded" ? "~" : check.status === "down" ? "X" : "?";
    log(`  [${icon}] ${check.component}: ${check.status} (${check.latencyMs}ms)${check.issues.length > 0 ? ` — ${check.issues.length} issues` : ""}`);
  }

  if (dryRun) {
    log("\n--dry-run: not pushing to Convex.");
    process.exit(0);
  }

  await pushToConvex(healthChecks);

  // Also write a bridge-specific summary for local consumption
  const summary = {
    bridgedAt: new Date().toISOString(),
    reportId: report.id,
    checks: healthChecks.length,
    healthy: healthChecks.filter((c) => c.status === "healthy").length,
    degraded: healthChecks.filter((c) => c.status === "degraded").length,
    down: healthChecks.filter((c) => c.status === "down").length,
  };

  log(`\nBridge summary: ${summary.healthy}/${summary.checks} healthy, ${summary.degraded} degraded, ${summary.down} down`);
  process.exit(summary.down > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Bridge crashed:", err);
  process.exit(2);
});
