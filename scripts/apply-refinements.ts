#!/usr/bin/env npx tsx

/**
 * Apply refinements based on benchmark analysis
 *
 * This script implements the optimization opportunities identified in benchmark analysis
 *
 * Usage: npx tsx scripts/apply-refinements.ts --iteration 1 --focus prompt,tool_delegation
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type RefinementCategory = "prompt" | "tool_delegation" | "parallelization" | "caching" | "model_selection";

interface Refinement {
  iteration: number;
  categories: RefinementCategory[];
  changes: Array<{
    file: string;
    description: string;
    applied: boolean;
    error?: string;
  }>;
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function applyPromptRefinements(iteration: number): any[] {
  const changes: any[] = [];

  // Refinement 1: Strengthen persona inference prompts
  const coordinatorPath = join(process.cwd(), "convex", "domains", "agents", "coordinatorAgent.ts");
  if (existsSync(coordinatorPath)) {
    // Read and analyze - we'll suggest changes rather than auto-apply
    changes.push({
      file: coordinatorPath,
      description: "Add explicit persona inference examples and verification steps",
      applied: false,
      suggestion: [
        "Add 'Before responding, verify you've identified the correct persona based on...'",
        "Include persona decision tree in system prompt",
        "Add explicit examples for ambiguous cases (e.g., JPM_STARTUP_BANKER vs EARLY_STAGE_VC)",
      ],
    });
  }

  // Refinement 2: Strengthen ground truth citation requirements
  const debriefPromptPath = join(process.cwd(), "convex", "domains", "evaluation", "personaEpisodeEval.ts");
  if (existsSync(debriefPromptPath)) {
    changes.push({
      file: debriefPromptPath,
      description: "Strengthen ground truth anchor citation requirements",
      applied: false,
      suggestion: [
        "Make citation format more explicit: {{fact:ground_truth:ENTITY_ID}}",
        "Add validation that EVERY key fact has a citation",
        "Fail if missing ground truth anchor in grounding[]",
      ],
    });
  }

  return changes;
}

function applyToolDelegationRefinements(iteration: number): any[] {
  const changes: any[] = [];

  // Refinement 1: Add tool budget awareness
  const coordinatorPath = join(process.cwd(), "convex", "domains", "agents", "coordinatorAgent.ts");
  if (existsSync(coordinatorPath)) {
    changes.push({
      file: coordinatorPath,
      description: "Add tool budget hints to system prompt",
      applied: false,
      suggestion: [
        "Add: 'You have a budget of 3-5 tool calls per query. Use them wisely.'",
        "Add: 'Combine related lookups when possible (e.g., entity + funding in one call)'",
        "Add: 'Skip tools if you already have the needed information from previous steps'",
      ],
    });
  }

  // Refinement 2: Optimize ground truth lookups
  const toolsPath = join(process.cwd(), "convex", "tools", "evaluation", "groundTruthTools.ts");
  if (existsSync(toolsPath)) {
    changes.push({
      file: toolsPath,
      description: "Add caching and deduplication to ground truth lookups",
      applied: false,
      suggestion: [
        "Cache lookupGroundTruthEntity results in memory for duration of agent run",
        "Return cached result if called twice with same entity ID",
        "Add hint in tool description: 'This tool is expensive - call once per entity'",
      ],
    });
  }

  return changes;
}

function applyParallelizationRefinements(iteration: number): any[] {
  const changes: any[] = [];

  // Refinement 1: Enable parallel tool execution hints
  const agentPath = join(process.cwd(), "convex", "domains", "agents", "fastAgentPanelStreaming.ts");
  if (existsSync(agentPath)) {
    changes.push({
      file: agentPath,
      description: "Add parallel tool execution support",
      applied: false,
      suggestion: [
        "Add system prompt hint: 'You can call multiple independent tools in parallel'",
        "Add example: 'Call lookupGroundTruthEntity AND linkupSearch in the same step if they don't depend on each other'",
        "Configure agent SDK to allow parallel tool use",
      ],
    });
  }

  return changes;
}

function applyCachingRefinements(iteration: number): any[] {
  const changes: any[] = [];

  // Refinement 1: Enable prompt caching
  const modelsPath = join(process.cwd(), "convex", "domains", "agents", "mcp_tools", "models.ts");
  if (existsSync(modelsPath)) {
    changes.push({
      file: modelsPath,
      description: "Enable prompt caching for Anthropic/OpenAI models",
      applied: false,
      suggestion: [
        "Add cache_control breakpoints in getLanguageModel",
        "Cache system prompts (they don't change between runs)",
        "Cache tool descriptions (static across scenarios)",
        "Cache persona definitions and ground truth schemas",
      ],
    });
  }

  return changes;
}

function generateRefinementReport(iteration: number, categories: RefinementCategory[]): string {
  const md: string[] = [];

  md.push(`# Refinement Plan - Iteration ${iteration}`);
  md.push(``);
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push(`Focus areas: ${categories.join(", ")}`);
  md.push(``);

  const allChanges: any[] = [];

  if (categories.includes("prompt")) {
    const changes = applyPromptRefinements(iteration);
    allChanges.push(...changes);
  }

  if (categories.includes("tool_delegation")) {
    const changes = applyToolDelegationRefinements(iteration);
    allChanges.push(...changes);
  }

  if (categories.includes("parallelization")) {
    const changes = applyParallelizationRefinements(iteration);
    allChanges.push(...changes);
  }

  if (categories.includes("caching")) {
    const changes = applyCachingRefinements(iteration);
    allChanges.push(...changes);
  }

  md.push(`## Proposed Changes`);
  md.push(``);
  md.push(`Total: ${allChanges.length} files`);
  md.push(``);

  for (const change of allChanges) {
    md.push(`### ${change.file}`);
    md.push(``);
    md.push(change.description);
    md.push(``);

    if (change.suggestion) {
      md.push(`**Suggestions:**`);
      for (const s of change.suggestion) {
        md.push(`- ${s}`);
      }
      md.push(``);
    }

    if (change.applied) {
      md.push(`✅ Applied automatically`);
    } else {
      md.push(`⚠️ Requires manual implementation`);
    }
    md.push(``);
  }

  md.push(`## Implementation Checklist`);
  md.push(``);

  const checklist = allChanges.map(c => `- [ ] ${c.file}: ${c.description}`);
  md.push(checklist.join("\n"));
  md.push(``);

  return md.join("\n");
}

function main() {
  const iteration = parseInt(getArg("--iteration") ?? "1", 10);
  const focusArg = getArg("--focus") ?? "prompt,tool_delegation,parallelization,caching";
  const categories = focusArg.split(",").map(c => c.trim() as RefinementCategory);

  console.log(`\n=== Generating Refinement Plan for Iteration ${iteration} ===\n`);
  console.log(`Focus areas: ${categories.join(", ")}\n`);

  const report = generateRefinementReport(iteration, categories);

  const outPath = join(
    process.cwd(),
    "docs",
    "architecture",
    "benchmarks",
    `refinement-plan-iter${iteration}.md`
  );

  writeFileSync(outPath, report, "utf8");

  console.log(report);
  console.log(`\n📝 Refinement plan saved to: ${outPath}\n`);
}

main();
