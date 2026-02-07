/**
 * GAIA file-backed capability/accuracy benchmark: LLM-only vs LLM+NodeBench MCP local file tools.
 *
 * This lane targets GAIA tasks that include attachments (PDF / XLSX / CSV).
 * We provide deterministic local parsing via NodeBench MCP tools and score answers against
 * the ground-truth "Final answer" (stored locally under `.cache/gaia`, gitignored).
 *
 * Safety:
 * - GAIA is gated. Do not commit fixtures that contain prompts/answers.
 * - This test logs only task IDs and aggregate metrics (no prompt/answer text).
 *
 * Disabled by default (cost + rate limits). Run with:
 *   NODEBENCH_RUN_GAIA_CAPABILITY=1 npm --prefix packages/mcp-local run test
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import { localFileTools } from "../tools/localFileTools.js";
import type { McpTool } from "../types.js";

type CapabilityTask = {
  id: string;
  prompt: string;
  expectedAnswer: string;
  level?: string;
  questionLength?: number;
  annotator?: {
    numberOfSteps?: number;
    numberOfTools?: number;
    tools?: string;
  };
  hasFile?: boolean;
  fileName?: string;
  filePath?: string;
  fileExt?: string;
  localFilePath?: string;
  complexityScore?: number;
};

type CapabilityFixture = {
  dataset: string;
  config: string;
  split: string;
  sourceUrl: string;
  generatedAt: string;
  attachmentsRoot?: string;
  selection: Record<string, unknown>;
  tasks: CapabilityTask[];
};

type ScoredResult = {
  taskId: string;
  baselineCorrect: boolean;
  toolsCorrect: boolean;
  baselineMs: number;
  toolsMs: number;
  toolCalls: number;
  error?: string;
};

const shouldRun = process.env.NODEBENCH_RUN_GAIA_CAPABILITY === "1";

function resolveRepoRoot(): string {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(testDir, "../../../..");
}

function resolveCapabilityFilesFixturePath(): string {
  const override = process.env.NODEBENCH_GAIA_CAPABILITY_FILES_FIXTURE_PATH;
  if (override) {
    if (path.isAbsolute(override)) return override;
    const repoRoot = resolveRepoRoot();
    return path.resolve(repoRoot, override);
  }

  const config = process.env.NODEBENCH_GAIA_CAPABILITY_CONFIG ?? "2023_all";
  const split = process.env.NODEBENCH_GAIA_CAPABILITY_SPLIT ?? "validation";
  const repoRoot = resolveRepoRoot();
  return path.join(repoRoot, ".cache", "gaia", `gaia_capability_files_${config}_${split}.sample.json`);
}

function loadDotEnvLocalIfPresent(): void {
  const repoRoot = resolveRepoRoot();
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) return;

  const text = readFileSync(envPath, "utf8") as string;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function canImport(pkg: string): Promise<boolean> {
  try {
    await import(pkg);
    return true;
  } catch {
    return false;
  }
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "")
    .replace(/[.]+$/g, "")
    .toLowerCase();
}

async function createGeminiClient(): Promise<any> {
  const mod = await import("@google/genai");
  const { GoogleGenAI } = mod as any;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY (or GOOGLE_AI_API_KEY)");
  }
  return new GoogleGenAI({ apiKey });
}

async function geminiGenerateText(ai: any, model: string, contents: any[]): Promise<string> {
  const temperature = Number.parseFloat(process.env.NODEBENCH_GAIA_CAPABILITY_TEMPERATURE ?? "0");
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      temperature: Number.isFinite(temperature) ? temperature : 0,
      maxOutputTokens: 1024,
    },
  });

  const parts = (response as any)?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: any) => p?.text ?? "").join("").trim();
  return text;
}

async function baselineAnswer(ai: any, task: CapabilityTask): Promise<string> {
  const contents = [
    {
      role: "user" as const,
      parts: [
        {
          text: `Answer the question using your existing knowledge only. Do not browse the web.\n\nReturn ONLY the final answer, no explanation.\n\nQuestion:\n${task.prompt}`,
        },
      ],
    },
  ];
  return geminiGenerateText(ai, process.env.NODEBENCH_GAIA_BASELINE_MODEL ?? "gemini-2.5-flash", contents);
}

function buildToolIndex(): Map<string, McpTool> {
  const byName = new Map<string, McpTool>();
  for (const tool of localFileTools) byName.set(tool.name, tool);
  return byName;
}

function resolveTaskLocalFilePath(task: CapabilityTask): string {
  const repoRoot = resolveRepoRoot();
  const rel = String(task.localFilePath ?? "").trim();
  if (rel) return path.resolve(repoRoot, rel);

  // Fallback to the standard cache layout used by the fixture generator.
  const filePath = String(task.filePath ?? "").trim();
  if (!filePath) throw new Error("Task missing filePath/localFilePath");
  return path.join(repoRoot, ".cache", "gaia", "data", filePath);
}

async function toolAugmentedAnswerFromFile(
  ai: any,
  task: CapabilityTask
): Promise<{ answer: string; toolCalls: number }> {
  const toolIndex = buildToolIndex();
  const model = process.env.NODEBENCH_GAIA_TOOLS_MODEL ?? "gemini-2.5-flash";

  const localPath = resolveTaskLocalFilePath(task);
  if (!existsSync(localPath)) {
    throw new Error(
      `Missing attachment on disk. Expected at ${localPath}. Refresh with dataset:gaia:capability:files:refresh`
    );
  }

  const ext =
    String(task.fileExt ?? "").trim().toLowerCase() ||
    path.extname(task.fileName || task.filePath || "").toLowerCase().replace(/^\./, "");

  let extract: any;
  let toolCalls = 0;

  if (ext === "csv") {
    const tool = toolIndex.get("read_csv_file");
    if (!tool) throw new Error("Missing tool: read_csv_file");
    extract = await tool.handler({
      path: localPath,
      hasHeader: true,
      maxRows: 500,
      maxCols: 80,
      maxCellChars: 2000,
    });
    toolCalls = 1;
  } else if (ext === "xlsx") {
    const tool = toolIndex.get("read_xlsx_file");
    if (!tool) throw new Error("Missing tool: read_xlsx_file");
    extract = await tool.handler({
      path: localPath,
      headerRow: 1,
      maxRows: 500,
      maxCols: 80,
      maxCellChars: 2000,
    });
    toolCalls = 1;
  } else if (ext === "pdf") {
    const tool = toolIndex.get("read_pdf_text");
    if (!tool) throw new Error("Missing tool: read_pdf_text");
    extract = await tool.handler({
      path: localPath,
      pageStart: 1,
      pageEnd: 12,
      maxChars: 40000,
    });
    toolCalls = 1;
  } else {
    throw new Error(`Unsupported attachment type: ${ext || "(unknown)"}`);
  }

  // Keep the model input bounded. The tools already return bounded previews,
  // but JSON stringification can still be large on wide tables.
  const extractText = JSON.stringify(extract).slice(0, 40000);

  const contents = [
    {
      role: "user" as const,
      parts: [
        {
          text:
            "Answer the question using ONLY the provided file extract. " +
            "If the extract is insufficient, make the best supported guess.\n\n" +
            "Return ONLY the final answer, no explanation.\n\n" +
            `TASK_ID: ${task.id}\n` +
            `FILE_TYPE: ${ext}\n` +
            `LOCAL_FILE_PATH: ${localPath}\n` +
            `QUESTION:\n${task.prompt}\n\n` +
            `FILE_EXTRACT_JSON:\n${extractText}`,
        },
      ],
    },
  ];

  const answer = await geminiGenerateText(ai, model, contents);
  return { answer, toolCalls };
}

async function loadFixture(fixturePath: string): Promise<CapabilityFixture> {
  const raw = await readFile(fixturePath, "utf8");
  const parsed = JSON.parse(raw) as CapabilityFixture;
  if (!parsed || !Array.isArray((parsed as any).tasks)) throw new Error("Invalid GAIA capability files fixture");
  return parsed;
}

describe("Capability: GAIA accuracy (file-backed) (LLM-only vs LLM+local tools)", () => {
  const testFn = shouldRun ? it : it.skip;

  testFn("should measure accuracy delta on a small GAIA file-backed subset", async () => {
    loadDotEnvLocalIfPresent();

    const fixturePath = resolveCapabilityFilesFixturePath();
    if (!existsSync(fixturePath)) {
      throw new Error(
        `Missing GAIA capability files fixture at ${fixturePath}. Generate it with: python packages/mcp-local/src/__tests__/fixtures/generateGaiaCapabilityFilesFixture.py`
      );
    }

    const hasGemini = await canImport("@google/genai");
    expect(hasGemini).toBe(true);

    const ai = await createGeminiClient();

    const fixture = await loadFixture(fixturePath);
    expect(Array.isArray(fixture.tasks)).toBe(true);
    expect(fixture.tasks.length).toBeGreaterThan(0);

    const requestedLimit = Number.parseInt(process.env.NODEBENCH_GAIA_CAPABILITY_TASK_LIMIT ?? "6", 10);
    const taskLimit = Math.max(1, Math.min(fixture.tasks.length, Number.isFinite(requestedLimit) ? requestedLimit : 6));
    const tasks = fixture.tasks.slice(0, taskLimit);

    const requestedConcurrency = Number.parseInt(
      process.env.NODEBENCH_GAIA_CAPABILITY_CONCURRENCY ?? "1",
      10
    );
    const concurrency = Math.max(
      1,
      Math.min(tasks.length, Number.isFinite(requestedConcurrency) ? requestedConcurrency : 1)
    );

    const results: ScoredResult[] = new Array(tasks.length);
    let nextIndex = 0;

    const workers = Array.from({ length: concurrency }, () =>
      (async () => {
        while (true) {
          const idx = nextIndex++;
          if (idx >= tasks.length) return;

          const task = tasks[idx];
          const expected = normalizeAnswer(task.expectedAnswer);

          try {
            const baseStart = performance.now();
            const base = await baselineAnswer(ai, task);
            const baseMs = performance.now() - baseStart;

            const toolsStart = performance.now();
            const tools = await toolAugmentedAnswerFromFile(ai, task);
            const toolsMs = performance.now() - toolsStart;

            const baselineCorrect = normalizeAnswer(base) === expected;
            const toolsCorrect = normalizeAnswer(tools.answer) === expected;

            results[idx] = {
              taskId: task.id,
              baselineCorrect,
              toolsCorrect,
              baselineMs: baseMs,
              toolsMs,
              toolCalls: tools.toolCalls,
            };
          } catch (err: any) {
            results[idx] = {
              taskId: task.id,
              baselineCorrect: false,
              toolsCorrect: false,
              baselineMs: 0,
              toolsMs: 0,
              toolCalls: 0,
              error: err?.message ?? String(err),
            };
          }
        }
      })()
    );

    await Promise.all(workers);

    const baselineCorrect = results.filter((r) => r.baselineCorrect).length;
    const toolsCorrect = results.filter((r) => r.toolsCorrect).length;
    const improved = results.filter((r) => !r.baselineCorrect && r.toolsCorrect).length;
    const regressions = results.filter((r) => r.baselineCorrect && !r.toolsCorrect).length;

    const avg = (values: number[]) =>
      values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

    const avgBaseMs = avg(results.map((r) => r.baselineMs).filter((n) => n > 0));
    const avgToolsMs = avg(results.map((r) => r.toolsMs).filter((n) => n > 0));
    const avgToolCalls = avg(results.map((r) => r.toolCalls));

    console.log(
      `[gaia-capability-files] config=${fixture.config} split=${fixture.split} tasks=${tasks.length} concurrency=${concurrency} baseline=${baselineCorrect}/${tasks.length} tools=${toolsCorrect}/${tasks.length} improved=${improved} regressions=${regressions} avgBaselineMs=${avgBaseMs.toFixed(
        0
      )} avgToolsMs=${avgToolsMs.toFixed(0)} avgToolCalls=${avgToolCalls.toFixed(2)}`
    );
    console.log(
      `[gaia-capability-files] perTask: ${results
        .map((r) => `${r.taskId}:B${r.baselineCorrect ? "1" : "0"}T${r.toolsCorrect ? "1" : "0"}${r.error ? "E" : ""}`)
        .join(" ")}`
    );

    const enforce = process.env.NODEBENCH_GAIA_CAPABILITY_ENFORCE === "1";
    if (enforce) {
      // For file-backed tasks, the baseline is expected to be low. We still enforce that
      // tool-augmented performance is not worse than baseline and has at least one improvement.
      const allowedRegression = Math.max(1, Math.floor(tasks.length * 0.2));
      expect(improved).toBeGreaterThanOrEqual(1);
      expect(toolsCorrect).toBeGreaterThanOrEqual(baselineCorrect - allowedRegression);
      expect(toolsCorrect).toBeGreaterThanOrEqual(1);
    } else {
      expect(results.length).toBe(tasks.length);
      expect(results.some((r) => r.error)).toBe(false);
    }
  }, 300000);
});

