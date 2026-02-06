#!/usr/bin/env npx tsx

/**
 * Refreshes a local fixture from the open-source ToolBench instruction dataset.
 *
 * Source:
 *   - https://github.com/OpenBMB/ToolBench
 *   - data_example/instruction/G1_query.json
 *   - data_example/instruction/G2_query.json
 *   - data_example/instruction/G3_query.json
 *
 * Usage:
 *   npx tsx src/__tests__/fixtures/generateToolbenchInstructionFixture.ts
 *   npx tsx src/__tests__/fixtures/generateToolbenchInstructionFixture.ts --limit 10 --min-api 6
 *   npx tsx src/__tests__/fixtures/generateToolbenchInstructionFixture.ts --output ./tmp/toolbench.sample.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCES = [
  {
    group: "G1",
    url: "https://raw.githubusercontent.com/OpenBMB/ToolBench/master/data_example/instruction/G1_query.json",
  },
  {
    group: "G2",
    url: "https://raw.githubusercontent.com/OpenBMB/ToolBench/master/data_example/instruction/G2_query.json",
  },
  {
    group: "G3",
    url: "https://raw.githubusercontent.com/OpenBMB/ToolBench/master/data_example/instruction/G3_query.json",
  },
] as const;

type SourceGroup = (typeof SOURCES)[number]["group"];

type ToolbenchApi = {
  category_name?: unknown;
  tool_name?: unknown;
  api_name?: unknown;
  required_parameters?: unknown;
  optional_parameters?: unknown;
};

type ToolbenchRawRecord = {
  query_id?: unknown;
  query?: unknown;
  api_list?: unknown;
  "relevant APIs"?: unknown;
};

type ToolbenchFixtureTask = {
  id: string;
  title: string;
  prompt: string;
  group: SourceGroup;
  apiCount: number;
  relevantApiCount: number;
  requiredParameterCount: number;
  optionalParameterCount: number;
  apiCategories: string[];
  complexityScore: number;
};

type ToolbenchFixture = {
  dataset: string;
  split: string;
  sourceUrls: Record<SourceGroup, string>;
  generatedAt: string;
  selection: {
    requestedLimit: number;
    minApiCount: number;
    minQueryLength: number;
    totalRecords: number;
    candidateRecords: number;
  };
  tasks: ToolbenchFixtureTask[];
};

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

function parseIntArg(flag: string, fallback: number): number {
  const raw = getArg(flag);
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return fallback;
  return value;
}

function compactWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toTask(record: ToolbenchRawRecord, group: SourceGroup, index: number): ToolbenchFixtureTask | null {
  const query = compactWhitespace(String(record.query ?? ""));
  if (!query) return null;

  const apiList = asArray<ToolbenchApi>(record.api_list).filter(
    (entry): entry is ToolbenchApi => typeof entry === "object" && entry !== null
  );

  const requiredParameterCount = apiList.reduce((count, api) => {
    return count + asArray<unknown>(api.required_parameters).length;
  }, 0);
  const optionalParameterCount = apiList.reduce((count, api) => {
    return count + asArray<unknown>(api.optional_parameters).length;
  }, 0);
  const apiCategories = Array.from(
    new Set(
      apiList
        .map((api) => String(api.category_name ?? "").trim())
        .filter((name) => name.length > 0)
    )
  );

  const apiCount = apiList.length;
  const relevantApiCount = asArray<unknown>(record["relevant APIs"]).length;

  const rawId = String(record.query_id ?? `${group}_${index + 1}`).trim();
  const id = `${group}_${rawId}`;
  const title = `ToolBench ${group} query ${rawId}`;

  const complexityScore =
    apiCount * 12 +
    requiredParameterCount * 2 +
    optionalParameterCount +
    relevantApiCount * 3 +
    Math.ceil(query.length / 40);

  return {
    id,
    title,
    prompt: query,
    group,
    apiCount,
    relevantApiCount,
    requiredParameterCount,
    optionalParameterCount,
    apiCategories,
    complexityScore,
  };
}

async function fetchSource(group: SourceGroup, url: string): Promise<ToolbenchRawRecord[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${group} dataset: ${response.status} ${response.statusText}`);
  }

  const raw = await response.json();
  if (!Array.isArray(raw)) {
    throw new Error(`Unexpected payload for ${group}: expected array`);
  }

  return raw as ToolbenchRawRecord[];
}

async function main(): Promise<void> {
  const limit = Math.max(1, parseIntArg("--limit", 10));
  const minApiCount = Math.max(1, parseIntArg("--min-api", 6));
  const minQueryLength = Math.max(1, parseIntArg("--min-query-length", 180));

  const here = dirname(fileURLToPath(import.meta.url));
  const outputPath =
    getArg("--output") ?? join(here, "toolbench_instruction.sample.json");

  const fetched = await Promise.all(
    SOURCES.map(async (source) => {
      const records = await fetchSource(source.group, source.url);
      return { ...source, records };
    })
  );

  const tasks = fetched.flatMap((entry) =>
    entry.records
      .map((record, index) => toTask(record, entry.group, index))
      .filter((task): task is ToolbenchFixtureTask => task !== null)
  );

  const candidates = tasks
    .filter((task) => task.apiCount >= minApiCount && task.prompt.length >= minQueryLength)
    .sort((a, b) => {
      if (b.complexityScore !== a.complexityScore) return b.complexityScore - a.complexityScore;
      return a.id.localeCompare(b.id);
    });

  const selected = candidates.slice(0, limit);
  if (selected.length === 0) {
    throw new Error(
      `No ToolBench tasks matched filters (minApiCount=${minApiCount}, minQueryLength=${minQueryLength}).`
    );
  }

  const sourceUrls = SOURCES.reduce(
    (acc, source) => {
      acc[source.group] = source.url;
      return acc;
    },
    {} as Record<SourceGroup, string>
  );

  const fixture: ToolbenchFixture = {
    dataset: "OpenBMB/ToolBench",
    split: "data_example/instruction (G1,G2,G3)",
    sourceUrls,
    generatedAt: new Date().toISOString(),
    selection: {
      requestedLimit: limit,
      minApiCount,
      minQueryLength,
      totalRecords: tasks.length,
      candidateRecords: candidates.length,
    },
    tasks: selected,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(fixture, null, 2) + "\n", "utf8");

  console.log(`[toolbench-fixture] wrote ${selected.length} tasks to ${outputPath}`);
  console.log(
    `[toolbench-fixture] total=${tasks.length}, candidates=${candidates.length}, filters=api>=${minApiCount}, queryLength>=${minQueryLength}`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});

