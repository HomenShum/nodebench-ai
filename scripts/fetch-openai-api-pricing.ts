#!/usr/bin/env npx tsx

import dotenv from "dotenv";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadOrFetchOpenAiApiPricingSnapshot } from "./pricing/openaiApiPricing";

dotenv.config({ path: ".env.local" });
dotenv.config();

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const outPath = join(process.cwd(), "docs", "architecture", "benchmarks", "openai-api-pricing-latest.json");
  mkdirSync(dirname(outPath), { recursive: true });

  const forceFetch = hasFlag("--force") || hasFlag("--latest");
  const maxAgeMs = forceFetch ? 0 : 24 * 60 * 60 * 1000;

  const { snapshot, source, path } = await loadOrFetchOpenAiApiPricingSnapshot({
    absolutePath: outPath,
    maxAgeMs,
    forceFetch,
  });

  const models = snapshot.models.map((m) => m.model).join(", ");
  process.stdout.write(
    `OpenAI API pricing (${source})\n- source: ${snapshot.sourceUrl}\n- fetchedAt: ${snapshot.fetchedAt}\n- file: ${path}\n- models: ${models}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`ERROR: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

