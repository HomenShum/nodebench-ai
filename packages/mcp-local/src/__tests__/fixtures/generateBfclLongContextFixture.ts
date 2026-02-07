#!/usr/bin/env npx tsx

/**
 * Refreshes a local fixture from the open-source BFCL v3 long-context dataset.
 *
 * Usage:
 *   npx tsx src/__tests__/fixtures/generateBfclLongContextFixture.ts
 *   npx tsx src/__tests__/fixtures/generateBfclLongContextFixture.ts --limit 16 --min-turns 4 --min-path 5
 *   npx tsx src/__tests__/fixtures/generateBfclLongContextFixture.ts --output ./tmp/bfcl.sample.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SOURCE_URL =
  "https://huggingface.co/datasets/gorilla-llm/Berkeley-Function-Calling-Leaderboard/resolve/main/BFCL_v3_multi_turn_long_context.json";

type BfclMessage = {
  role: string;
  content: string;
};

type BfclTurn = BfclMessage[];

type BfclRawRecord = {
  id: string;
  question?: BfclTurn[];
  path?: string[];
  involved_classes?: string[];
};

type BfclFixtureTask = {
  id: string;
  title: string;
  prompt: string;
  turnCount: number;
  expectedPath: string[];
  expectedPathLength: number;
  involvedClasses: string[];
  complexityScore: number;
};

type BfclFixture = {
  dataset: string;
  split: string;
  sourceUrl: string;
  generatedAt: string;
  selection: {
    requestedLimit: number;
    minTurns: number;
    minExpectedPathLength: number;
    totalRecords: number;
    candidateRecords: number;
  };
  tasks: BfclFixtureTask[];
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

function buildPrompt(turns: BfclTurn[]): string {
  const renderedTurns = turns.map((turn, index) => {
    const userMessages = turn
      .filter((message) => message.role === "user")
      .map((message) => compactWhitespace(String(message.content ?? "")))
      .filter(Boolean);

    if (userMessages.length === 0) return "";
    return `Turn ${index + 1}: ${userMessages.join(" ")}`;
  });

  return renderedTurns.filter(Boolean).join("\n");
}

function parseJsonl(raw: string): BfclRawRecord[] {
  const lines = raw.split(/\r?\n/);
  const records: BfclRawRecord[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed = JSON.parse(trimmed) as BfclRawRecord;
      if (!parsed.id) continue;
      records.push(parsed);
    } catch {
      // Skip malformed lines instead of failing the whole refresh.
    }
  }

  return records;
}

function toTask(record: BfclRawRecord): BfclFixtureTask | null {
  if (!Array.isArray(record.question) || record.question.length === 0) return null;

  const prompt = buildPrompt(record.question);
  if (!prompt) return null;

  const expectedPath = Array.isArray(record.path)
    ? record.path.filter((step): step is string => typeof step === "string")
    : [];
  const involvedClasses = Array.isArray(record.involved_classes)
    ? record.involved_classes.filter((klass): klass is string => typeof klass === "string")
    : [];

  return {
    id: record.id,
    title: `BFCL ${record.id}`,
    prompt,
    turnCount: record.question.length,
    expectedPath,
    expectedPathLength: expectedPath.length,
    involvedClasses,
    complexityScore: record.question.length * 10 + expectedPath.length,
  };
}

async function main(): Promise<void> {
  const limit = Math.max(1, parseIntArg("--limit", 12));
  const minTurns = Math.max(1, parseIntArg("--min-turns", 4));
  const minExpectedPathLength = Math.max(1, parseIntArg("--min-path", 5));
  const sourceUrl = getArg("--url") ?? DEFAULT_SOURCE_URL;

  const here = dirname(fileURLToPath(import.meta.url));
  const outputPath =
    getArg("--output") ?? join(here, "bfcl_v3_long_context.sample.json");

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch BFCL dataset: ${response.status} ${response.statusText}`);
  }

  const raw = await response.text();
  const records = parseJsonl(raw);
  const tasks = records.map(toTask).filter((task): task is BfclFixtureTask => task !== null);

  const candidates = tasks
    .filter((task) => task.turnCount >= minTurns && task.expectedPathLength >= minExpectedPathLength)
    .sort((a, b) => {
      if (b.complexityScore !== a.complexityScore) return b.complexityScore - a.complexityScore;
      return a.id.localeCompare(b.id);
    });

  const selected = candidates.slice(0, limit);
  if (selected.length === 0) {
    throw new Error(
      `No BFCL tasks matched filters (minTurns=${minTurns}, minExpectedPathLength=${minExpectedPathLength}).`
    );
  }

  const fixture: BfclFixture = {
    dataset: "gorilla-llm/Berkeley-Function-Calling-Leaderboard",
    split: "BFCL_v3_multi_turn_long_context",
    sourceUrl,
    generatedAt: new Date().toISOString(),
    selection: {
      requestedLimit: limit,
      minTurns,
      minExpectedPathLength,
      totalRecords: tasks.length,
      candidateRecords: candidates.length,
    },
    tasks: selected,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(fixture, null, 2) + "\n", "utf8");

  console.log(`[bfcl-fixture] wrote ${selected.length} tasks to ${outputPath}`);
  console.log(
    `[bfcl-fixture] total=${tasks.length}, candidates=${candidates.length}, filters=turns>=${minTurns}, path>=${minExpectedPathLength}`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});

