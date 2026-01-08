#!/usr/bin/env npx tsx

/**
 * Fully Parallel Persona Episode Evaluation Runner
 *
 * Runs ALL scenarios across ALL models in complete parallel (every combination simultaneously).
 * Creates individual evaluation tasks for each (model, scenario) pair.
 *
 * Usage:
 *   set CONVEX_URL=...; set MCP_SECRET=...
 *   npx tsx scripts/run-fully-parallel-eval.ts --models gpt-5-mini,claude-haiku-4.5,gemini-3-flash --limit 5
 *   npx tsx scripts/run-fully-parallel-eval.ts --all --suite core
 *   npx tsx scripts/run-fully-parallel-eval.ts --all --ndjson   # Enable NDJSON streaming output
 */

import dotenv from "dotenv";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// ═══════════════════════════════════════════════════════════════════════════
// DISCLOSURE METRICS TYPES (P0 Instrumentation)
// ═══════════════════════════════════════════════════════════════════════════

interface DisclosureMetrics {
  skillSearchCalls: number;
  skillsActivated: string[];
  toolSearchCalls: number;
  toolsExpanded: string[];
  toolsInvoked: string[];
  toolInvokeErrors: number;
  usedSkillFirst: boolean;
  usedMetaTools: boolean;
  directToolCalls: string[];
  disclosureLevel: "none" | "partial" | "full";
  estimatedToolSchemaTokens: number;  // P0: baseline for tool schema token measurement
  warnings: string[];
}

dotenv.config({ path: ".env.local" });
dotenv.config();

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function tryReadConvexEnvVar(name: string): string | null {
  const local = process.env[name];
  if (local && local.trim()) return local.trim();

  const cli = join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "convex.cmd" : "convex");
  const res =
    process.platform === "win32"
      ? spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `& '${cli}' env get ${name}`], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        })
      : spawnSync(cli, ["env", "get", name], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        });
  if (res.status !== 0) return null;
  const value = String(res.stdout ?? "").trim();
  return value.length ? value : null;
}

/**
 * Run a single scenario for a single model
 */
async function runSingleScenarioEval(
  client: ConvexHttpClient,
  secret: string,
  model: string,
  scenario: any,
  suite: string
): Promise<any> {
  const startTime = Date.now();

  try {
    const result = await client.action(api.domains.evaluation.personaEpisodeEval.runPersonaEpisodeEval, {
      secret,
      model,
      suite: suite as any,
      offset: 0,
      limit: 1,
      scenarios: [
        {
          id: scenario.id,
          name: scenario.name,
          query: scenario.query,
          expectedPersona: scenario.expectedPersona,
          expectedEntityId: scenario.expectedEntityId,
        },
      ],
    });

    const elapsed = Date.now() - startTime;
    const runs = result?.runs ?? [];
    const run = runs[0];

    return { model, scenarioId: scenario.id, result: run, elapsed, error: null };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : String(err);
    return { model, scenarioId: scenario.id, result: null, elapsed, error: msg };
  }
}

async function main() {
  const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
  if (!convexUrl) throw new Error("Missing CONVEX_URL (or VITE_CONVEX_URL).");

  const secret = tryReadConvexEnvVar("MCP_SECRET");
  if (!secret) throw new Error("Missing MCP_SECRET.");

  // Parse arguments
  const modelsArg = getArg("--models");
  const allModels = hasFlag("--all");
  const suite = getArg("--suite") || "core"; // Default to core suite
  const limit = parsePositiveInt(getArg("--limit")) ?? 3;
  const ndjsonMode = hasFlag("--ndjson"); // P0: Enable NDJSON streaming output

  // Determine which models to test
  const availableModels = ["gpt-5-mini", "claude-haiku-4.5", "gemini-3-flash"];
  let modelsToTest: string[];

  if (allModels) {
    modelsToTest = availableModels;
  } else if (modelsArg) {
    modelsToTest = modelsArg.split(",").map((m) => m.trim());
  } else {
    modelsToTest = availableModels;
  }

  // Define core scenarios (DEFAULT_SCENARIOS from personaEpisodeEval.ts)
  const coreScenarios = [
    {
      id: "banker_vague_disco",
      name: "Banker vague outreach debrief",
      query: "DISCO — I'm trying to figure out if this is worth reaching out on and what I should do with it.",
      expectedPersona: "JPM_STARTUP_BANKER",
      expectedEntityId: "DISCO",
    },
    {
      id: "vc_vague_openautoglm",
      name: "VC wedge from OSS signal",
      query: "OpenAutoGLM — what does this imply about the agent market and where is the wedge?",
      expectedPersona: "EARLY_STAGE_VC",
      expectedEntityId: "OPEN-AUTOGLM",
    },
    {
      id: "cto_vague_quickjs",
      name: "CTO risk exposure + patch plan",
      query: "QuickJS — do I have risk exposure and what is my patch plan?",
      expectedPersona: "CTO_TECH_LEAD",
      expectedEntityId: "MQUICKJS",
    },
    {
      id: "exec_vague_gemini",
      name: "Exec vendor evaluation",
      query: "Gemini 3 — should we consider this, and what's the procurement next step?",
      expectedPersona: "ENTERPRISE_EXEC",
      expectedEntityId: "GEMINI_3",
    },
    {
      id: "ecosystem_vague_soundcloud",
      name: "Ecosystem second-order effects",
      query: "SoundCloud VPN issue — who benefits and what partnerships does this create?",
      expectedPersona: "ECOSYSTEM_PARTNER",
      expectedEntityId: "SOUNDCLOUD",
    },
    {
      id: "founder_salesforce_positioning",
      name: "Founder positioning vs incumbent",
      query: "Salesforce Agentforce — what does this mean for a founder's positioning and what should we do next?",
      expectedPersona: "FOUNDER_STRATEGY",
      expectedEntityId: "SALESFORCE",
    },
    {
      id: "academic_ryr2_anchor",
      name: "Academic literature anchor",
      query: "RyR2 / Alzheimer's — what's the literature anchor and what's methodologically solid?",
      expectedPersona: "ACADEMIC_RD",
      expectedEntityId: "ALZHEIMERS",
    },
    {
      id: "quant_disco_signal",
      name: "Quant signal extraction",
      query: "DISCO — extract the funding signal and timeline points you'd track.",
      expectedPersona: "QUANT_ANALYST",
      expectedEntityId: "DISCO",
    },
    {
      id: "product_disco_card",
      name: "Product designer schema card",
      query: "DISCO — I need a schema-dense UI card JSON that can be rendered.",
      expectedPersona: "PRODUCT_DESIGNER",
      expectedEntityId: "DISCO",
    },
    {
      id: "sales_disco_onepager",
      name: "Sales engineer one-screen summary",
      query: "DISCO — write a share-ready single-screen outbound summary.",
      expectedPersona: "SALES_ENGINEER",
      expectedEntityId: "DISCO",
    },
  ];

  const scenarios = coreScenarios.slice(0, limit);

  console.log(`\n🚀 Starting FULLY PARALLEL evaluation:`);
  console.log(`   Models: ${modelsToTest.join(", ")}`);
  console.log(`   Suite: ${suite}`);
  console.log(`   Scenarios: ${scenarios.length}`);
  console.log(`   Total evaluations: ${modelsToTest.length * scenarios.length}`);
  console.log(``);

  const client = new ConvexHttpClient(convexUrl);
  const authToken = process.env.CONVEX_AUTH_TOKEN;
  if (authToken) client.setAuth(authToken);

  const startTime = Date.now();

  // Create all (model, scenario) combinations
  const tasks: Promise<any>[] = [];
  for (const model of modelsToTest) {
    for (const scenario of scenarios) {
      console.log(`[${model}/${scenario.id}] Starting...`);
      tasks.push(runSingleScenarioEval(client, secret, model, scenario, suite));
    }
  }

  // Run ALL tasks in parallel
  const results = await Promise.all(tasks);

  const totalElapsed = Date.now() - startTime;

  console.log(`\n📊 All ${results.length} evaluations completed in ${(totalElapsed / 1000).toFixed(1)}s\n`);

  // Organize results by model
  const resultsByModel: Record<string, any[]> = {};
  for (const model of modelsToTest) {
    resultsByModel[model] = results.filter((r) => r.model === model);
  }

  // Generate summary report
  const summaryLines: string[] = [];
  summaryLines.push(`# Fully Parallel Evaluation Results`);
  summaryLines.push(``);
  summaryLines.push(`Generated: ${new Date().toISOString()}`);
  summaryLines.push(`Total Time: ${(totalElapsed / 1000).toFixed(1)}s`);
  summaryLines.push(`Suite: ${suite}`);
  summaryLines.push(`Models: ${modelsToTest.length}`);
  summaryLines.push(`Scenarios: ${scenarios.length}`);
  summaryLines.push(`Total evaluations: ${results.length}`);
  summaryLines.push(``);
  summaryLines.push(`## Summary by Model`);
  summaryLines.push(``);
  summaryLines.push(`| Model | Total | Passed | Failed | Avg Time (s) |`);
  summaryLines.push(`|-------|-------|--------|--------|--------------|`);

  for (const model of modelsToTest) {
    const modelResults = resultsByModel[model];
    const passed = modelResults.filter((r) => r.result?.ok === true).length;
    const failed = modelResults.filter((r) => r.result?.ok === false || r.error).length;
    const avgTime = modelResults.reduce((sum, r) => sum + r.elapsed, 0) / modelResults.length / 1000;

    summaryLines.push(`| ${model} | ${modelResults.length} | ${passed} | ${failed} | ${avgTime.toFixed(1)} |`);
  }

  summaryLines.push(``);
  summaryLines.push(`## Summary by Scenario`);
  summaryLines.push(``);
  summaryLines.push(`| Scenario | Total | Passed | Failed |`);
  summaryLines.push(`|----------|-------|--------|--------|`);

  for (const scenario of scenarios) {
    const scenarioResults = results.filter((r) => r.scenarioId === scenario.id);
    const passed = scenarioResults.filter((r) => r.result?.ok === true).length;
    const failed = scenarioResults.filter((r) => r.result?.ok === false || r.error).length;

    summaryLines.push(`| ${scenario.name} | ${scenarioResults.length} | ${passed} | ${failed} |`);
  }

  summaryLines.push(``);
  summaryLines.push(`## Detailed Results`);
  summaryLines.push(``);

  for (const model of modelsToTest) {
    summaryLines.push(`### ${model}`);
    summaryLines.push(``);

    const modelResults = resultsByModel[model];

    summaryLines.push(`| Scenario | Status | Time (s) | Failures |`);
    summaryLines.push(`|----------|--------|----------|----------|`);

    for (const r of modelResults) {
      const status = r.error ? "❌ ERROR" : r.result?.ok ? "✅ PASS" : "❌ FAIL";
      const time = (r.elapsed / 1000).toFixed(1);
      const failures = r.error
        ? r.error.slice(0, 80)
        : Array.isArray(r.result?.failureReasons) && r.result.failureReasons.length > 0
          ? r.result.failureReasons[0].slice(0, 80)
          : "-";

      const scenarioName = scenarios.find((s) => s.id === r.scenarioId)?.name || r.scenarioId;
      summaryLines.push(`| ${scenarioName} | ${status} | ${time} | ${failures} |`);
    }

    summaryLines.push(``);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // P0: DISCLOSURE METRICS SUMMARY (Non-scored warnings, Week 1-2 mode)
  // ═══════════════════════════════════════════════════════════════════════════

  // Collect disclosure warnings from all results
  const allWarnings: string[] = [];
  const disclosureByModel: Record<string, { full: number; partial: number; none: number }> = {};

  for (const r of results) {
    const disclosure = r.result?.disclosure as DisclosureMetrics | undefined;
    if (disclosure) {
      // Collect warnings with model/scenario context
      for (const warning of disclosure.warnings ?? []) {
        allWarnings.push(`⚠️ [${r.model}/${r.scenarioId}] ${warning}`);
      }

      // Track disclosure level by model
      if (!disclosureByModel[r.model]) {
        disclosureByModel[r.model] = { full: 0, partial: 0, none: 0 };
      }
      disclosureByModel[r.model][disclosure.disclosureLevel]++;
    }
  }

  // Add disclosure summary section
  summaryLines.push(`## Disclosure Metrics (P0 Instrumentation)`);
  summaryLines.push(``);
  summaryLines.push(`### Disclosure Level by Model`);
  summaryLines.push(``);
  summaryLines.push(`| Model | Full | Partial | None |`);
  summaryLines.push(`|-------|------|---------|------|`);

  for (const model of modelsToTest) {
    const d = disclosureByModel[model] ?? { full: 0, partial: 0, none: 0 };
    summaryLines.push(`| ${model} | ${d.full} | ${d.partial} | ${d.none} |`);
  }

  summaryLines.push(``);

  // Add disclosure warnings (non-scored)
  if (allWarnings.length > 0) {
    summaryLines.push(`### Disclosure Warnings (Non-Scored)`);
    summaryLines.push(``);
    summaryLines.push(`> **Note:** These warnings are informational and do not affect pass/fail.`);
    summaryLines.push(`> They track progressive disclosure usage for Week 1-2 observability.`);
    summaryLines.push(``);
    for (const warning of allWarnings.slice(0, 50)) { // Cap at 50 warnings
      summaryLines.push(warning);
    }
    if (allWarnings.length > 50) {
      summaryLines.push(`... and ${allWarnings.length - 50} more warnings`);
    }
    summaryLines.push(``);
  } else {
    summaryLines.push(`### Disclosure Warnings (Non-Scored)`);
    summaryLines.push(``);
    summaryLines.push(`✅ No disclosure warnings generated.`);
    summaryLines.push(``);
  }

  // Write results to file
  const outDir = join(process.cwd(), "docs", "architecture", "benchmarks");
  mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const mdPath = join(outDir, `fully-parallel-eval-${timestamp}.md`);
  const jsonPath = join(outDir, `fully-parallel-eval-${timestamp}.json`);

  writeFileSync(mdPath, summaryLines.join("\n"), "utf8");
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalElapsed,
        modelsToTest,
        suite,
        scenarios: scenarios.length,
        totalEvaluations: results.length,
        results,
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  console.log(`\n📄 Results written to:`);
  console.log(`   ${mdPath}`);
  console.log(`   ${jsonPath}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // P0: NDJSON OUTPUT MODE (Stream-processable, one JSON object per episode)
  // ═══════════════════════════════════════════════════════════════════════════

  if (ndjsonMode) {
    const ndjsonPath = join(outDir, `fully-parallel-eval-${timestamp}.ndjson`);

    // Write each episode as a single JSON line
    for (const r of results) {
      const episode = {
        model: r.model,
        scenario: r.scenarioId,
        ok: r.result?.ok ?? false,
        latencyMs: r.elapsed,
        disclosure: r.result?.disclosure ?? null,
        // Compact summary for stream processing
        checks: r.result?.checks ?? {},
        failureReasons: r.result?.failureReasons ?? [],
      };
      appendFileSync(ndjsonPath, JSON.stringify(episode) + "\n", "utf8");
    }

    console.log(`   ${ndjsonPath} (NDJSON stream-processable)`);

    // Print quick disclosure summary to console
    console.log(`\n📊 Disclosure Summary (NDJSON mode):`);
    for (const model of modelsToTest) {
      const d = disclosureByModel[model] ?? { full: 0, partial: 0, none: 0 };
      console.log(`   ${model}: ${d.full} full, ${d.partial} partial, ${d.none} none`);
    }
    if (allWarnings.length > 0) {
      console.log(`   ⚠️ ${allWarnings.length} disclosure warnings generated`);
    }
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? (err.stack || err.message || String(err)) : String(err);
  process.stderr.write(`ERROR: ${msg}\n`);
  process.exit(1);
});
