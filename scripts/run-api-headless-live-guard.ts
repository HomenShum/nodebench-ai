#!/usr/bin/env npx tsx

import dotenv from "dotenv";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

dotenv.config({ path: ".env.local" });
dotenv.config();

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

function parsePositiveInt(raw: string | undefined, fallback: number) {
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function readThreshold(envKey: string, fallback: number) {
  const raw = process.env[envKey];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], ratio: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index] ?? 0;
}

async function startInProcessServer() {
  const { createApp } = await import("../apps/api-headless/src/app.js");
  const app = createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
  };
}

async function measurePostRoute(args: {
  baseUrl: string;
  path: string;
  body: Record<string, unknown>;
  iterations: number;
  warmups: number;
}) {
  const durations: number[] = [];
  let lastJson: any = null;

  for (let index = 0; index < args.warmups + args.iterations; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(`${args.baseUrl}${args.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify(args.body),
    });
    const json = await response.json();
    const durationMs = performance.now() - startedAt;

    if (!response.ok) {
      throw new Error(`${args.path} failed with ${response.status}: ${JSON.stringify(json)}`);
    }

    if (index >= args.warmups) {
      durations.push(durationMs);
    }
    lastJson = json;
  }

  return {
    averageMs: average(durations),
    p95Ms: percentile(durations, 0.95),
    rawDurationsMs: durations,
    lastJson,
  };
}

async function main() {
  const iterations = parsePositiveInt(getArg("--iterations"), 3);
  const warmups = parsePositiveInt(getArg("--warmups"), 1);
  const fastQuery =
    getArg("--fast-query") ??
    process.env.NODEBENCH_API_LIVE_FAST_QUERY ??
    "latest Oracle AI infrastructure news";
  const enterpriseQuery =
    getArg("--enterprise-query") ??
    process.env.NODEBENCH_API_LIVE_ENTERPRISE_QUERY ??
    "Oracle Stargate AI infrastructure timeline 2025 2026";

  if (!process.env.CONVEX_URL) {
    throw new Error("Missing CONVEX_URL. Live api-headless guard requires a real Convex backend.");
  }

  const fastP95BudgetMs = readThreshold("NODEBENCH_API_LIVE_SEARCH_P95_MS", 2000);
  const enterpriseP95BudgetMs = readThreshold(
    "NODEBENCH_API_LIVE_ENTERPRISE_INVESTIGATION_P95_MS",
    5000
  );

  const baseUrlFromEnv = process.env.HEADLESS_API_BASE_URL;
  let server: Server | undefined;
  let baseUrl = baseUrlFromEnv;

  if (!baseUrl) {
    const started = await startInProcessServer();
    server = started.server;
    baseUrl = started.baseUrl;
  }

  const generatedAt = new Date().toISOString();

  try {
    const fastMetrics = await measurePostRoute({
      baseUrl,
      path: "/v1/search",
      iterations,
      warmups,
      body: {
        query: fastQuery,
        mode: "fast",
        outputType: "searchResults",
        maxResults: 5,
      },
    });

    const enterpriseMetrics = await measurePostRoute({
      baseUrl,
      path: "/v1/search",
      iterations,
      warmups,
      body: {
        query: enterpriseQuery,
        depth: "temporal",
        outputType: "enterpriseInvestigation",
        maxResults: 5,
      },
    });

    const report = {
      generatedAt,
      baseUrl,
      usedExternalBaseUrl: Boolean(baseUrlFromEnv),
      config: {
        iterations,
        warmups,
        fastQuery,
        enterpriseQuery,
        thresholds: {
          fastSearchP95Ms: fastP95BudgetMs,
          enterpriseInvestigationP95Ms: enterpriseP95BudgetMs,
        },
      },
      checks: {
        fastSearch: {
          object: fastMetrics.lastJson?.object,
          resultCount: Array.isArray(fastMetrics.lastJson?.results)
            ? fastMetrics.lastJson.results.length
            : 0,
          citationCount: Array.isArray(fastMetrics.lastJson?.citations)
            ? fastMetrics.lastJson.citations.length
            : 0,
          telemetry: fastMetrics.lastJson?.telemetry,
          averageMs: fastMetrics.averageMs,
          p95Ms: fastMetrics.p95Ms,
          passesBudget: fastMetrics.p95Ms <= fastP95BudgetMs,
        },
        enterpriseInvestigation: {
          object: enterpriseMetrics.lastJson?.object,
          causalChainLength: Array.isArray(enterpriseMetrics.lastJson?.causal_chain)
            ? enterpriseMetrics.lastJson.causal_chain.length
            : 0,
          snapshotHashCount: Array.isArray(
            enterpriseMetrics.lastJson?.audit_proof_pack?.source_snapshot_hashes
          )
            ? enterpriseMetrics.lastJson.audit_proof_pack.source_snapshot_hashes.length
            : 0,
          replayUrl: enterpriseMetrics.lastJson?.audit_proof_pack?.replay_url ?? null,
          proposedAction:
            enterpriseMetrics.lastJson?.zero_friction_execution?.proposed_action ?? null,
          averageMs: enterpriseMetrics.averageMs,
          p95Ms: enterpriseMetrics.p95Ms,
          passesBudget: enterpriseMetrics.p95Ms <= enterpriseP95BudgetMs,
        },
      },
      realityCheck: {
        invariants: [
          "fast search must return grounded results plus citations",
          "enterprise investigation must return a causal chain, source hashes, and replay URL",
          "both lanes must stay within the configured p95 latency budgets",
        ],
        remainingRisk:
          "This live guard depends on the current Convex search backend and public source availability, so failures can come from backend drift or external source churn as well as api-headless regressions.",
      },
    };

    const failures: string[] = [];
    if (report.checks.fastSearch.object !== "search_result") {
      failures.push("fastSearch returned an unexpected object type");
    }
    if (report.checks.fastSearch.resultCount < 1) {
      failures.push("fastSearch returned no results");
    }
    if (report.checks.fastSearch.citationCount < 1) {
      failures.push("fastSearch returned no citations");
    }
    if (!report.checks.fastSearch.passesBudget) {
      failures.push(
        `fastSearch p95 ${Math.round(report.checks.fastSearch.p95Ms)}ms exceeded ${fastP95BudgetMs}ms`
      );
    }
    if (report.checks.enterpriseInvestigation.object !== "enterprise_investigation") {
      failures.push("enterpriseInvestigation returned an unexpected object type");
    }
    if (report.checks.enterpriseInvestigation.causalChainLength < 1) {
      failures.push("enterpriseInvestigation returned no causal chain");
    }
    if (report.checks.enterpriseInvestigation.snapshotHashCount < 1) {
      failures.push("enterpriseInvestigation returned no source snapshot hashes");
    }
    if (!report.checks.enterpriseInvestigation.replayUrl) {
      failures.push("enterpriseInvestigation returned no replay URL");
    }
    if (!report.checks.enterpriseInvestigation.proposedAction) {
      failures.push("enterpriseInvestigation returned no proposed action");
    }
    if (!report.checks.enterpriseInvestigation.passesBudget) {
      failures.push(
        `enterpriseInvestigation p95 ${Math.round(report.checks.enterpriseInvestigation.p95Ms)}ms exceeded ${enterpriseP95BudgetMs}ms`
      );
    }

    const outDir = join(process.cwd(), "docs", "architecture", "benchmarks");
    mkdirSync(outDir, { recursive: true });
    const publicOutDir = join(process.cwd(), "public", "benchmarks");
    mkdirSync(publicOutDir, { recursive: true });

    const outJson = join(outDir, "api-headless-live-guard-latest.json");
    const outMd = join(outDir, "api-headless-live-guard-latest.md");
    const publicOutJson = join(publicOutDir, "api-headless-live-guard-latest.json");

    const reportJson = `${JSON.stringify({ ...report, failures }, null, 2)}\n`;
    writeFileSync(outJson, reportJson, "utf8");
    writeFileSync(publicOutJson, reportJson, "utf8");

    const md = [
      "# API Headless Live Guard",
      "",
      `Generated: ${generatedAt}`,
      `Base URL: ${baseUrl}`,
      `Iterations: ${iterations}`,
      `Warmups: ${warmups}`,
      "",
      "## Checks",
      "",
      `- Fast search: object=${report.checks.fastSearch.object}, results=${report.checks.fastSearch.resultCount}, citations=${report.checks.fastSearch.citationCount}, avg=${Math.round(report.checks.fastSearch.averageMs)}ms, p95=${Math.round(report.checks.fastSearch.p95Ms)}ms, budget=${fastP95BudgetMs}ms`,
      `- Enterprise investigation: object=${report.checks.enterpriseInvestigation.object}, causalChain=${report.checks.enterpriseInvestigation.causalChainLength}, sourceHashes=${report.checks.enterpriseInvestigation.snapshotHashCount}, avg=${Math.round(report.checks.enterpriseInvestigation.averageMs)}ms, p95=${Math.round(report.checks.enterpriseInvestigation.p95Ms)}ms, budget=${enterpriseP95BudgetMs}ms`,
      report.checks.enterpriseInvestigation.replayUrl
        ? `- Replay URL: ${report.checks.enterpriseInvestigation.replayUrl}`
        : "- Replay URL: missing",
      "",
      "## Reality Check",
      "",
      ...report.realityCheck.invariants.map((line) => `- ${line}`),
      `- Remaining risk: ${report.realityCheck.remainingRisk}`,
      "",
      failures.length === 0 ? "Result: PASS" : `Result: FAIL\n\nFailures:\n${failures.map((f) => `- ${f}`).join("\n")}`,
      "",
    ].join("\n");

    writeFileSync(outMd, md, "utf8");

    process.stdout.write(`Wrote:\n- ${outMd}\n- ${outJson}\n- ${publicOutJson}\n`);

    if (failures.length > 0) {
      throw new Error(failures.join("; "));
    }
  } finally {
    if (server) {
      server.closeIdleConnections?.();
      server.closeAllConnections?.();
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
    }
  }
}

main().catch((error) => {
  process.stderr.write(`ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
