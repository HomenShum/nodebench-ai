#!/usr/bin/env npx tsx

import dotenv from "dotenv";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadOrFetchAnthropicApiPricingSnapshot } from "./pricing/anthropicApiPricing";

dotenv.config({ path: ".env.local" });
dotenv.config();

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const outPath = join(process.cwd(), "docs", "architecture", "benchmarks", "anthropic-api-pricing-latest.json");
  mkdirSync(dirname(outPath), { recursive: true });

  const forceFetch = hasFlag("--force") || hasFlag("--latest");
  const maxAgeMs = forceFetch ? 0 : 24 * 60 * 60 * 1000;

  const { snapshot, source, path } = await loadOrFetchAnthropicApiPricingSnapshot({
    absolutePath: outPath,
    maxAgeMs,
    forceFetch,
  });

  const models = snapshot.models.map((m) => `${m.model} (in=$${m.baseInputUsdPer1MTokens}/MTok out=$${m.outputUsdPer1MTokens}/MTok)`).join(", ");
  process.stdout.write(
    `Anthropic API pricing (${source})\n- source: ${snapshot.sourceUrl}\n- fetchedAt: ${snapshot.fetchedAt}\n- file: ${path}\n- models: ${models}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`ERROR: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

