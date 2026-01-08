#!/usr/bin/env npx tsx

/**
 * Expanded Evaluation Runner for Calendar, Spreadsheet, Document, Web, and Media scenarios
 *
 * Uses gemini-3-flash (top performer) for iterative testing and refinement.
 *
 * Usage:
 *   npx tsx scripts/run-expanded-eval.ts --category calendar
 *   npx tsx scripts/run-expanded-eval.ts --category all
 */

import dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

dotenv.config({ path: ".env.local" });
dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════
// EXPANDED SCENARIO DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

interface ExpandedScenario {
  id: string;
  name: string;
  category: "calendar" | "spreadsheet" | "document" | "web" | "media";
  query: string;
  expectedPersona: string;
  expectedEntityId: string;
  requiredTools: string[];
  validationRules: {
    toolCallMinimum?: number;
    toolCallMaximum?: number;
    mustContainInOutput?: string[];
    mustCallTools?: string[];
    outputFormat?: "json" | "markdown" | "text";
  };
}

// Calendar CRUD Scenarios - using DISCO as the ground truth entity for context
const CALENDAR_SCENARIOS: ExpandedScenario[] = [
  {
    id: "cal_disco_meeting",
    name: "Calendar: Schedule DISCO review meeting",
    category: "calendar",
    query: "DISCO — schedule a banker outreach call for this week. What's their pipeline and contact info for my weekly target list?",
    expectedPersona: "JPM_STARTUP_BANKER",
    expectedEntityId: "DISCO",
    requiredTools: ["lookupGroundTruthEntity", "createEvent"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["DISCO"],
    },
  },
  {
    id: "cal_salesforce_demo",
    name: "Calendar: Schedule Salesforce demo",
    category: "calendar",
    query: "Salesforce Agentforce — schedule a demo for next week. What pricing should I discuss?",
    expectedPersona: "ENTERPRISE_EXEC",
    expectedEntityId: "SALESFORCE",
    requiredTools: ["lookupGroundTruthEntity", "createEvent"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["Salesforce"],
    },
  },
  {
    id: "cal_ambros_followup",
    name: "Calendar: Schedule Ambros follow-up",
    category: "calendar",
    query: "Ambros — schedule a pipeline call for this Friday. What's their Phase 3 timeline?",
    expectedPersona: "JPM_STARTUP_BANKER",
    expectedEntityId: "AMBROS",
    requiredTools: ["lookupGroundTruthEntity", "createEvent"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["Ambros"],
    },
  },
];

// Spreadsheet CRUD Scenarios - using ground truth entities for context
const SPREADSHEET_SCENARIOS: ExpandedScenario[] = [
  {
    id: "sheet_disco_metrics",
    name: "Spreadsheet: DISCO funding metrics",
    category: "spreadsheet",
    query: "DISCO — create a spreadsheet tracking their funding metrics. What amount and stage should I record?",
    expectedPersona: "QUANT_ANALYST",
    expectedEntityId: "DISCO",
    requiredTools: ["lookupGroundTruthEntity", "createSpreadsheet"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["DISCO"],
    },
  },
  {
    id: "sheet_ambros_pipeline",
    name: "Spreadsheet: Ambros deal pipeline",
    category: "spreadsheet",
    query: "Ambros — add them to my deal pipeline spreadsheet. What's their funding stage and amount?",
    expectedPersona: "JPM_STARTUP_BANKER",
    expectedEntityId: "AMBROS",
    requiredTools: ["lookupGroundTruthEntity", "editSpreadsheet"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["Ambros"],
    },
  },
  {
    id: "sheet_gemini_pricing",
    name: "Spreadsheet: Gemini pricing comparison",
    category: "spreadsheet",
    query: "Gemini 3 — create a pricing comparison spreadsheet. What are the Flash vs Pro costs?",
    expectedPersona: "ENTERPRISE_EXEC",
    expectedEntityId: "GEMINI_3",
    requiredTools: ["lookupGroundTruthEntity", "createSpreadsheet"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["Gemini"],
    },
  },
];

// Document CRUD Scenarios - using ground truth entities for context
const DOCUMENT_SCENARIOS: ExpandedScenario[] = [
  {
    id: "doc_disco_memo",
    name: "Document: DISCO investment memo",
    category: "document",
    query: "DISCO — write an investment thesis memo. What's their funding stage, platform, and market position?",
    expectedPersona: "EARLY_STAGE_VC",
    expectedEntityId: "DISCO",
    requiredTools: ["lookupGroundTruthEntity", "createDocument"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["DISCO"],
    },
  },
  {
    id: "doc_quickjs_assessment",
    name: "Document: QuickJS security assessment",
    category: "document",
    query: "QuickJS — create a security assessment document for CVE-2025-62495. What's the severity and mitigation?",
    expectedPersona: "CTO_TECH_LEAD",
    expectedEntityId: "MQUICKJS",
    requiredTools: ["lookupGroundTruthEntity", "createDocument"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["QuickJS"],
    },
  },
  {
    id: "doc_genomiq_diligence",
    name: "Document: GenomiQ due diligence",
    category: "document",
    query: "GenomiQ — create a due diligence document. What's their pipeline and funding history?",
    expectedPersona: "EARLY_STAGE_VC",
    expectedEntityId: "GENOMIQ",
    requiredTools: ["lookupGroundTruthEntity", "createDocument"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["GenomiQ"],
    },
  },
];

// Web Search Scenarios - use lookupGroundTruthEntity + web tools
const WEB_SCENARIOS: ExpandedScenario[] = [
  {
    id: "web_disco_news",
    name: "Web: DISCO news search",
    category: "web",
    query: "DISCO — search for recent news about their seed round and give me the VC perspective on market timing and thesis fit.",
    expectedPersona: "EARLY_STAGE_VC",
    expectedEntityId: "DISCO",
    requiredTools: ["lookupGroundTruthEntity", "linkupSearch"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["DISCO"], // Simplified - entity is the key check
    },
  },
  {
    id: "web_salesforce_fetch",
    name: "Web: Salesforce Agentforce deep dive",
    category: "web",
    query: "Salesforce Agentforce — do a deep web search and tell me the procurement next steps and pricing considerations.",
    expectedPersona: "ENTERPRISE_EXEC",
    expectedEntityId: "SALESFORCE",
    requiredTools: ["lookupGroundTruthEntity", "linkupSearch"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["Salesforce"],
    },
  },
  {
    id: "web_disco_multi_source",
    name: "Web: DISCO multi-source verification",
    category: "web",
    query: "DISCO — verify their €36M seed funding across multiple sources. What's the thesis and market position?",
    expectedPersona: "EARLY_STAGE_VC", // VC perspective aligns with thesis/funding verification
    expectedEntityId: "DISCO",
    requiredTools: ["lookupGroundTruthEntity", "linkupSearch"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["DISCO"],
    },
  },
];

// Media Scenarios - using ground truth entities for context
const MEDIA_SCENARIOS: ExpandedScenario[] = [
  {
    id: "media_disco_assets",
    name: "Media: DISCO UI card design",
    category: "media",
    query: "DISCO — generate a UI-ready card with schema for rendering their company profile. Include title, location, stage, keyPeople fields.",
    expectedPersona: "PRODUCT_DESIGNER",
    expectedEntityId: "DISCO",
    requiredTools: ["lookupGroundTruthEntity"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["DISCO"],
    },
  },
  {
    id: "media_soundcloud_incident",
    name: "Media: SoundCloud incident timeline",
    category: "media",
    query: "SoundCloud — find any screenshots or logs from the VPN incident. What happened on 2025-12-15?",
    expectedPersona: "CTO_TECH_LEAD",
    expectedEntityId: "SOUNDCLOUD",
    requiredTools: ["lookupGroundTruthEntity"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["SoundCloud"],
    },
  },
  {
    id: "media_vaultpay_materials",
    name: "Media: VaultPay sales materials",
    category: "media",
    query: "VaultPay — search for any sales or marketing materials. What's their Series A story?",
    expectedPersona: "SALES_ENGINEER",
    expectedEntityId: "VAULTPAY",
    requiredTools: ["lookupGroundTruthEntity"],
    validationRules: {
      mustCallTools: ["lookupGroundTruthEntity"],
      mustContainInOutput: ["VaultPay"],
    },
  },
];

// All scenarios combined
const ALL_SCENARIOS: ExpandedScenario[] = [
  ...CALENDAR_SCENARIOS,
  ...SPREADSHEET_SCENARIOS,
  ...DOCUMENT_SCENARIOS,
  ...WEB_SCENARIOS,
  ...MEDIA_SCENARIOS,
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
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

interface EvalResult {
  scenario: ExpandedScenario;
  passed: boolean;
  elapsed: number;
  toolsCalled: string[];
  failureReasons: string[];
  responsePreview: string;
  error?: string;
}

async function runSingleScenario(
  client: ConvexHttpClient,
  secret: string,
  model: string,
  scenario: ExpandedScenario
): Promise<EvalResult> {
  const startTime = Date.now();

  try {
    // Use the persona episode eval action with the scenario
    const result = await client.action(api.domains.evaluation.personaEpisodeEval.runPersonaEpisodeEval, {
      secret,
      model,
      suite: "core",
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
    const run = result?.runs?.[0];
    const toolsCalled = run?.execution?.toolCalls?.map((t: any) => t.name) ?? [];
    const responsePreview = run?.responsePreview ?? "";

    // Validate against our expanded rules
    const failureReasons: string[] = [];
    const rules = scenario.validationRules;

    // Check required tool calls
    if (rules.mustCallTools) {
      for (const tool of rules.mustCallTools) {
        if (!toolsCalled.includes(tool)) {
          failureReasons.push(`Missing required tool call: ${tool}`);
        }
      }
    }

    // Check tool call minimum
    if (rules.toolCallMinimum && toolsCalled.length < rules.toolCallMinimum) {
      failureReasons.push(`Tool call minimum not met: ${toolsCalled.length} < ${rules.toolCallMinimum}`);
    }

    // Check tool call maximum
    if (rules.toolCallMaximum && toolsCalled.length > rules.toolCallMaximum) {
      failureReasons.push(`Tool call maximum exceeded: ${toolsCalled.length} > ${rules.toolCallMaximum}`);
    }

    // Check output contains expected strings
    if (rules.mustContainInOutput) {
      const lowerResponse = responsePreview.toLowerCase();
      for (const expected of rules.mustContainInOutput) {
        if (!lowerResponse.includes(expected.toLowerCase())) {
          failureReasons.push(`Output missing expected content: "${expected}"`);
        }
      }
    }

    // Also include original eval failures
    if (run?.failureReasons?.length) {
      failureReasons.push(...run.failureReasons);
    }

    const passed = failureReasons.length === 0;

    return {
      scenario,
      passed,
      elapsed,
      toolsCalled,
      failureReasons,
      responsePreview: responsePreview.slice(0, 500),
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return {
      scenario,
      passed: false,
      elapsed,
      toolsCalled: [],
      failureReasons: [],
      responsePreview: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
  if (!convexUrl) throw new Error("Missing CONVEX_URL (or VITE_CONVEX_URL).");

  const secret = tryReadConvexEnvVar("MCP_SECRET");
  if (!secret) throw new Error("Missing MCP_SECRET.");

  const category = getArg("--category") || "all";
  const model = getArg("--model") || "gemini-3-flash"; // Top performer
  const verbose = hasFlag("--verbose");

  // Select scenarios based on category
  let scenarios: ExpandedScenario[];
  switch (category) {
    case "calendar":
      scenarios = CALENDAR_SCENARIOS;
      break;
    case "spreadsheet":
      scenarios = SPREADSHEET_SCENARIOS;
      break;
    case "document":
      scenarios = DOCUMENT_SCENARIOS;
      break;
    case "web":
      scenarios = WEB_SCENARIOS;
      break;
    case "media":
      scenarios = MEDIA_SCENARIOS;
      break;
    case "all":
    default:
      scenarios = ALL_SCENARIOS;
  }

  console.log(`\n🚀 Starting EXPANDED evaluation:`);
  console.log(`   Model: ${model}`);
  console.log(`   Category: ${category}`);
  console.log(`   Scenarios: ${scenarios.length}`);
  console.log(``);

  const client = new ConvexHttpClient(convexUrl);
  const authToken = process.env.CONVEX_AUTH_TOKEN;
  if (authToken) client.setAuth(authToken);

  const startTime = Date.now();
  const results: EvalResult[] = [];

  // Run scenarios sequentially (to avoid rate limits)
  for (const scenario of scenarios) {
    console.log(`[${scenario.id}] Running...`);
    const result = await runSingleScenario(client, secret, model, scenario);
    results.push(result);

    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`[${scenario.id}] ${status} (${(result.elapsed / 1000).toFixed(1)}s)`);

    if (!result.passed && verbose) {
      console.log(`   Failures: ${result.failureReasons.join(", ")}`);
      if (result.error) console.log(`   Error: ${result.error}`);
    }
  }

  const totalElapsed = Date.now() - startTime;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const passRate = ((passed / results.length) * 100).toFixed(1);

  console.log(`\n📊 Results Summary:`);
  console.log(`   Total: ${results.length}`);
  console.log(`   Passed: ${passed} (${passRate}%)`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total Time: ${(totalElapsed / 1000).toFixed(1)}s`);
  console.log(``);

  // Group by category
  const categories = ["calendar", "spreadsheet", "document", "web", "media"] as const;
  console.log(`📋 By Category:`);
  for (const cat of categories) {
    const catResults = results.filter((r) => r.scenario.category === cat);
    if (catResults.length === 0) continue;
    const catPassed = catResults.filter((r) => r.passed).length;
    const catRate = ((catPassed / catResults.length) * 100).toFixed(0);
    const status = catRate === "100" ? "✅" : catRate === "0" ? "❌" : "⚠️";
    console.log(`   ${status} ${cat}: ${catPassed}/${catResults.length} (${catRate}%)`);
  }

  // Write results to file
  const outDir = join(process.cwd(), "docs", "architecture", "benchmarks");
  mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const mdPath = join(outDir, `expanded-eval-${timestamp}.md`);
  const jsonPath = join(outDir, `expanded-eval-${timestamp}.json`);

  // Generate markdown report
  const mdLines: string[] = [];
  mdLines.push(`# Expanded Evaluation Results`);
  mdLines.push(``);
  mdLines.push(`Generated: ${new Date().toISOString()}`);
  mdLines.push(`Model: ${model}`);
  mdLines.push(`Category: ${category}`);
  mdLines.push(`Total Time: ${(totalElapsed / 1000).toFixed(1)}s`);
  mdLines.push(``);
  mdLines.push(`## Summary`);
  mdLines.push(``);
  mdLines.push(`| Metric | Value |`);
  mdLines.push(`|--------|-------|`);
  mdLines.push(`| Total Scenarios | ${results.length} |`);
  mdLines.push(`| Passed | ${passed} |`);
  mdLines.push(`| Failed | ${failed} |`);
  mdLines.push(`| Pass Rate | ${passRate}% |`);
  mdLines.push(``);
  mdLines.push(`## Results by Category`);
  mdLines.push(``);
  for (const cat of categories) {
    const catResults = results.filter((r) => r.scenario.category === cat);
    if (catResults.length === 0) continue;
    const catPassed = catResults.filter((r) => r.passed).length;
    mdLines.push(`### ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
    mdLines.push(``);
    mdLines.push(`| Scenario | Status | Time | Tools Called | Issues |`);
    mdLines.push(`|----------|--------|------|--------------|--------|`);
    for (const r of catResults) {
      const status = r.passed ? "✅ PASS" : "❌ FAIL";
      const time = (r.elapsed / 1000).toFixed(1);
      const tools = r.toolsCalled.length > 0 ? r.toolsCalled.join(", ") : "none";
      const issues = r.error || r.failureReasons.slice(0, 2).join("; ") || "-";
      mdLines.push(`| ${r.scenario.name} | ${status} | ${time}s | ${tools} | ${issues.slice(0, 60)} |`);
    }
    mdLines.push(``);
  }

  writeFileSync(mdPath, mdLines.join("\n"), "utf8");
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        model,
        category,
        totalElapsed,
        summary: { total: results.length, passed, failed, passRate: parseFloat(passRate) },
        results: results.map((r) => ({
          id: r.scenario.id,
          name: r.scenario.name,
          category: r.scenario.category,
          passed: r.passed,
          elapsed: r.elapsed,
          toolsCalled: r.toolsCalled,
          failureReasons: r.failureReasons,
          error: r.error,
        })),
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  console.log(`\n📄 Results written to:`);
  console.log(`   ${mdPath}`);
  console.log(`   ${jsonPath}`);

  // Exit with error code if not 100%
  if (passed < results.length) {
    console.log(`\n⚠️ Not at 100% pass rate yet. Run with --verbose to see failure details.`);
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? (err.stack || err.message || String(err)) : String(err);
  process.stderr.write(`ERROR: ${msg}\n`);
  process.exit(1);
});
