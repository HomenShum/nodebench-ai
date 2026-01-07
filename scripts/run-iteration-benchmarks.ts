#!/usr/bin/env npx tsx

/**
 * Run iteration benchmarks sequentially for all models
 * Usage: npx tsx scripts/run-iteration-benchmarks.ts --iteration 1 --suite pack
 */

import { spawnSync } from "node:child_process";

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

const MODELS = [
  { name: "claude-haiku-4.5", label: "Haiku 4.5" },
  { name: "gemini-3-flash", label: "Gemini 3 Flash" },
  { name: "gpt-5.2-mini", label: "GPT-5.2 Mini" },
  { name: "gpt-5.2", label: "GPT-5.2 (baseline)" },
];

async function main() {
  const iteration = getArg("--iteration") ?? "1";
  const suite = getArg("--suite") ?? "pack";

  console.log(`\n=== Running Iteration ${iteration} Benchmarks (Suite: ${suite}) ===\n`);

  for (const model of MODELS) {
    console.log(`\n[${model.label}] Starting...`);

    const outName = `${model.name.replace(/[^a-z0-9]/g, "-")}-${suite}-iter${iteration}`;
    const tsxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

    const result = spawnSync(
      tsxCmd,
      [
        "tsx",
        "scripts/run-persona-episode-eval.ts",
        "--model", model.name,
        "--suite", suite,
        "--pricing", "cache",
        "--out", outName,
      ],
      {
        encoding: "utf8",
        stdio: "inherit",
        env: process.env,
        cwd: process.cwd(),
        timeout: 3600000, // 1 hour
      }
    );

    if (result.error) {
      console.error(`❌ ${model.label} failed:`, result.error.message);
      continue;
    }

    if (result.status !== 0) {
      console.error(`❌ ${model.label} failed with exit code ${result.status}`);
      continue;
    }

    console.log(`✅ ${model.label} complete`);
  }

  console.log(`\n=== All benchmarks complete for iteration ${iteration} ===\n`);
}

main().catch((err) => {
  console.error("ERROR:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
