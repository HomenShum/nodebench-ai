#!/usr/bin/env npx tsx

/**
 * Disclosure Summarizer Script
 *
 * Reads NDJSON evaluation output and generates disclosure metrics summary.
 * This is the jq/tsx-compatible summarizer from the P0 implementation plan.
 *
 * Usage:
 *   npx tsx scripts/summarize-disclosure.ts docs/architecture/benchmarks/fully-parallel-eval-*.ndjson
 *   npx tsx scripts/summarize-disclosure.ts --stdin < eval-results.ndjson
 *
 * Output:
 *   - Disclosure metrics by model
 *   - Skill search rate
 *   - Average tools expanded
 *   - Warning counts
 */

import { readFileSync, existsSync } from "node:fs";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
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
  warnings: string[];
}

interface Episode {
  model: string;
  scenario: string;
  ok: boolean;
  latencyMs: number;
  disclosure: DisclosureMetrics | null;
  checks: Record<string, boolean>;
  failureReasons: string[];
}

interface ModelStats {
  total: number;
  passed: number;
  withSkillSearch: number;
  totalToolsInvoked: number;
  disclosureLevels: { full: number; partial: number; none: number };
  warningCount: number;
  avgLatencyMs: number;
  totalToolSchemaTokens: number;  // P0: baseline tool schema token measurement
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    console.log(`
Disclosure Summarizer Script

Usage:
  npx tsx scripts/summarize-disclosure.ts <ndjson-file>
  npx tsx scripts/summarize-disclosure.ts --stdin < eval-results.ndjson

Options:
  --stdin    Read from stdin instead of file
  --help     Show this help message
  --verbose  Show per-scenario breakdown

Examples:
  npx tsx scripts/summarize-disclosure.ts docs/architecture/benchmarks/fully-parallel-eval-2026-01-07T20-18-56.ndjson
  cat *.ndjson | npx tsx scripts/summarize-disclosure.ts --stdin
`);
    process.exit(0);
  }

  const useStdin = args.includes("--stdin");
  const verbose = args.includes("--verbose");

  let content: string;

  if (useStdin) {
    // Read from stdin
    content = readFileSync(0, "utf-8"); // fd 0 = stdin
  } else {
    const filePath = args.find((a) => !a.startsWith("--"));
    if (!filePath) {
      console.error("Error: No file path provided");
      process.exit(1);
    }
    if (!existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }
    content = readFileSync(filePath, "utf-8");
  }

  // Parse NDJSON
  const lines = content.split("\n").filter(Boolean);
  const episodes: Episode[] = lines.map((line) => JSON.parse(line));

  if (episodes.length === 0) {
    console.error("Error: No episodes found in input");
    process.exit(1);
  }

  console.log(`\n📊 Disclosure Summary\n`);
  console.log(`Total episodes: ${episodes.length}`);
  console.log(`Passed: ${episodes.filter((e) => e.ok).length}`);
  console.log(`Failed: ${episodes.filter((e) => !e.ok).length}`);
  console.log(``);

  // Aggregate by model
  const byModel = new Map<string, ModelStats>();

  for (const ep of episodes) {
    if (!byModel.has(ep.model)) {
      byModel.set(ep.model, {
        total: 0,
        passed: 0,
        withSkillSearch: 0,
        totalToolsInvoked: 0,
        disclosureLevels: { full: 0, partial: 0, none: 0 },
        warningCount: 0,
        avgLatencyMs: 0,
        totalToolSchemaTokens: 0,
      });
    }

    const stats = byModel.get(ep.model)!;
    stats.total++;
    if (ep.ok) stats.passed++;
    stats.avgLatencyMs += ep.latencyMs;

    if (ep.disclosure) {
      if (ep.disclosure.skillSearchCalls > 0) stats.withSkillSearch++;
      stats.totalToolsInvoked += ep.disclosure.toolsInvoked.length;
      stats.disclosureLevels[ep.disclosure.disclosureLevel]++;
      stats.warningCount += ep.disclosure.warnings?.length ?? 0;
      stats.totalToolSchemaTokens += ep.disclosure.estimatedToolSchemaTokens ?? 0;
    } else {
      stats.disclosureLevels.none++;
    }
  }

  // Calculate averages
  for (const [, stats] of byModel) {
    stats.avgLatencyMs = stats.avgLatencyMs / stats.total;
  }

  // Print summary table
  console.log(`| Model | Skill Search Rate | Avg Tools Invoked | Avg Schema Tokens | Disclosure Level | Warnings |`);
  console.log(`|-------|-------------------|-------------------|-------------------|------------------|----------|`);

  for (const [model, stats] of byModel) {
    const skillSearchRate = ((stats.withSkillSearch / stats.total) * 100).toFixed(1);
    const avgToolsInvoked = (stats.totalToolsInvoked / stats.total).toFixed(1);
    const avgSchemaTokens = Math.round(stats.totalToolSchemaTokens / stats.total);
    const disclosureBreakdown = `${stats.disclosureLevels.full}F/${stats.disclosureLevels.partial}P/${stats.disclosureLevels.none}N`;

    console.log(
      `| ${model.padEnd(19)} | ${skillSearchRate.padStart(17)}% | ${avgToolsInvoked.padStart(17)} | ${avgSchemaTokens.toString().padStart(17)} | ${disclosureBreakdown.padStart(16)} | ${stats.warningCount.toString().padStart(8)} |`
    );
  }

  console.log(``);

  // Print disclosure level explanation
  console.log(`Disclosure Level Key: F=Full, P=Partial, N=None`);
  console.log(`- Full: Both skill search AND tool search used`);
  console.log(`- Partial: Some meta-tools used`);
  console.log(`- None: No progressive disclosure meta-tools used`);
  console.log(``);

  // Aggregate warnings
  const allWarnings: string[] = [];
  for (const ep of episodes) {
    if (ep.disclosure?.warnings) {
      for (const warning of ep.disclosure.warnings) {
        allWarnings.push(`[${ep.model}/${ep.scenario}] ${warning}`);
      }
    }
  }

  if (allWarnings.length > 0) {
    console.log(`⚠️ Disclosure Warnings (${allWarnings.length} total):`);
    console.log(``);

    // Group warnings by type
    const warningTypes = new Map<string, number>();
    for (const w of allWarnings) {
      // Extract warning type (text after the bracket)
      const match = w.match(/\] (.+)/);
      const type = match ? match[1] : w;
      warningTypes.set(type, (warningTypes.get(type) ?? 0) + 1);
    }

    for (const [type, count] of Array.from(warningTypes.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count}x: ${type}`);
    }
    console.log(``);
  }

  // Verbose: per-scenario breakdown
  if (verbose) {
    console.log(`\n📋 Per-Scenario Breakdown:\n`);
    console.log(`| Scenario | Model | OK | Skill Search | Disclosure | Warnings |`);
    console.log(`|----------|-------|----|--------------:|-----------:|--------:|`);

    for (const ep of episodes) {
      const ok = ep.ok ? "✅" : "❌";
      const skillSearch = ep.disclosure?.skillSearchCalls ?? 0;
      const disclosure = ep.disclosure?.disclosureLevel ?? "none";
      const warnings = ep.disclosure?.warnings?.length ?? 0;

      console.log(
        `| ${ep.scenario.slice(0, 30).padEnd(30)} | ${ep.model.padEnd(20)} | ${ok} | ${skillSearch.toString().padStart(12)} | ${disclosure.padStart(10)} | ${warnings.toString().padStart(7)} |`
      );
    }
  }

  // Exit with non-zero if any episodes failed
  const failedCount = episodes.filter((e) => !e.ok).length;
  if (failedCount > 0) {
    console.log(`\n❌ ${failedCount} episodes failed`);
    process.exit(1);
  }

  console.log(`\n✅ All ${episodes.length} episodes passed`);
}

main();
