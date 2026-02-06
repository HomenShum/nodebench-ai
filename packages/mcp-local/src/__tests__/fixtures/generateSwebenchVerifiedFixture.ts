#!/usr/bin/env npx tsx

/**
 * Refreshes a local fixture from SWE-bench Verified (open-source GitHub issue tasks).
 *
 * Source:
 *   - https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified
 *   - rows API: https://datasets-server.huggingface.co/rows
 *
 * Usage:
 *   npx tsx src/__tests__/fixtures/generateSwebenchVerifiedFixture.ts
 *   npx tsx src/__tests__/fixtures/generateSwebenchVerifiedFixture.ts --limit 12 --min-statement-length 700 --min-fail-to-pass 2
 *   npx tsx src/__tests__/fixtures/generateSwebenchVerifiedFixture.ts --output ./tmp/swebench.sample.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATASET = "princeton-nlp/SWE-bench_Verified";
const CONFIG = "default";
const SPLIT = "test";
const ROWS_API = "https://datasets-server.huggingface.co/rows";
const DATASET_PAGE = "https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified";

type SwebenchRawRow = {
  repo?: unknown;
  instance_id?: unknown;
  problem_statement?: unknown;
  hints_text?: unknown;
  difficulty?: unknown;
  FAIL_TO_PASS?: unknown;
  PASS_TO_PASS?: unknown;
};

type SwebenchFixtureTask = {
  id: string;
  title: string;
  prompt: string;
  repo: string;
  difficulty: string;
  statementLength: number;
  hintLength: number;
  failToPassCount: number;
  passToPassCount: number;
  complexityScore: number;
};

type SwebenchFixture = {
  dataset: string;
  split: string;
  sourceUrl: string;
  rowsApi: string;
  generatedAt: string;
  selection: {
    requestedLimit: number;
    minStatementLength: number;
    minFailToPass: number;
    maxRowsScanned: number;
    pageSize: number;
    totalRecords: number;
    candidateRecords: number;
  };
  tasks: SwebenchFixtureTask[];
};

type RowsApiPage = {
  rows?: Array<{ row?: SwebenchRawRow }>;
  num_rows_total?: number;
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

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value !== "string" || value.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function difficultyWeight(difficulty: string): number {
  const normalized = difficulty.toLowerCase();
  if (normalized.includes("1-4 hours")) return 50;
  if (normalized.includes("15 min - 1 hour")) return 30;
  if (normalized.includes("<15 min")) return 10;
  return 20;
}

function toTask(raw: SwebenchRawRow, index: number): SwebenchFixtureTask | null {
  const id = compactWhitespace(String(raw.instance_id ?? ""));
  const repo = compactWhitespace(String(raw.repo ?? ""));
  const problemStatement = compactWhitespace(String(raw.problem_statement ?? ""));
  if (!id || !repo || !problemStatement) return null;

  const hints = compactWhitespace(String(raw.hints_text ?? ""));
  const difficulty = compactWhitespace(String(raw.difficulty ?? "unspecified"));
  const failToPassCount = parseStringArray(raw.FAIL_TO_PASS).length;
  const passToPassCount = parseStringArray(raw.PASS_TO_PASS).length;
  const statementLength = problemStatement.length;
  const hintLength = hints.length;

  const complexityScore =
    Math.ceil(statementLength / 25) +
    Math.ceil(hintLength / 40) +
    failToPassCount * 14 +
    Math.ceil(passToPassCount / 8) +
    difficultyWeight(difficulty);

  const promptSections = [
    `Repository: ${repo}`,
    `Instance: ${id}`,
    `Difficulty: ${difficulty}`,
    `Problem: ${problemStatement}`,
  ];
  if (hints.length > 0) {
    promptSections.push(`Hints: ${hints}`);
  }

  return {
    id,
    title: `SWE-bench ${id}`,
    prompt: promptSections.join("\n"),
    repo,
    difficulty,
    statementLength,
    hintLength,
    failToPassCount,
    passToPassCount,
    complexityScore,
  };
}

async function fetchRows(offset: number, length: number): Promise<RowsApiPage> {
  const url = new URL(ROWS_API);
  url.searchParams.set("dataset", DATASET);
  url.searchParams.set("config", CONFIG);
  url.searchParams.set("split", SPLIT);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("length", String(length));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch SWE-bench rows: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as RowsApiPage;
}

async function loadRows(maxRows: number, pageSize: number): Promise<SwebenchRawRow[]> {
  const rows: SwebenchRawRow[] = [];
  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const remaining = maxRows - offset;
    const length = Math.max(1, Math.min(pageSize, remaining));
    const page = await fetchRows(offset, length);
    const pageRows = Array.isArray(page.rows) ? page.rows : [];
    if (pageRows.length === 0) break;

    for (const entry of pageRows) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry.row;
      if (row && typeof row === "object") rows.push(row);
    }

    if (pageRows.length < length) break;
  }

  return rows;
}

async function main(): Promise<void> {
  const limit = Math.max(1, parseIntArg("--limit", 12));
  const minStatementLength = Math.max(100, parseIntArg("--min-statement-length", 700));
  const minFailToPass = Math.max(1, parseIntArg("--min-fail-to-pass", 2));
  const maxRowsScanned = Math.max(50, parseIntArg("--max-rows", 500));
  const pageSize = Math.max(10, parseIntArg("--page-size", 100));

  const here = dirname(fileURLToPath(import.meta.url));
  const outputPath = getArg("--output") ?? join(here, "swebench_verified.sample.json");

  const rawRows = await loadRows(maxRowsScanned, pageSize);
  const tasks = rawRows
    .map((row, index) => toTask(row, index))
    .filter((task): task is SwebenchFixtureTask => task !== null);

  const candidates = tasks
    .filter(
      (task) => task.statementLength >= minStatementLength && task.failToPassCount >= minFailToPass
    )
    .sort((a, b) => {
      if (b.complexityScore !== a.complexityScore) return b.complexityScore - a.complexityScore;
      return a.id.localeCompare(b.id);
    });

  const selected = candidates.slice(0, limit);
  if (selected.length === 0) {
    throw new Error(
      `No SWE-bench tasks matched filters (minStatementLength=${minStatementLength}, minFailToPass=${minFailToPass}).`
    );
  }

  const fixture: SwebenchFixture = {
    dataset: DATASET,
    split: SPLIT,
    sourceUrl: DATASET_PAGE,
    rowsApi: ROWS_API,
    generatedAt: new Date().toISOString(),
    selection: {
      requestedLimit: limit,
      minStatementLength,
      minFailToPass,
      maxRowsScanned,
      pageSize,
      totalRecords: tasks.length,
      candidateRecords: candidates.length,
    },
    tasks: selected,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(fixture, null, 2) + "\n", "utf8");

  console.log(`[swebench-fixture] wrote ${selected.length} tasks to ${outputPath}`);
  console.log(
    `[swebench-fixture] total=${tasks.length}, candidates=${candidates.length}, filters=statement>=${minStatementLength}, failToPass>=${minFailToPass}`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});

