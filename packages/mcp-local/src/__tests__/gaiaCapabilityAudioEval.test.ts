/**
 * GAIA audio-backed capability/accuracy benchmark: LLM-only vs LLM+NodeBench MCP local audio tools.
 *
 * This lane targets GAIA tasks that include audio attachments (MP3/WAV/etc).
 * We provide deterministic local transcription via NodeBench MCP tools and score answers against
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
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import { localFileTools } from "../tools/localFileTools.js";
import type { McpTool } from "../types.js";
import {
  createTextLlmClient,
  generateTextFromHistory,
  type TextLlmClient,
  type TextLlmHistoryMessage,
} from "./helpers/textLlm.js";
import { answersMatchWithJudge, autoDiscoverJudge } from "./helpers/answerMatch.js";

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
  judgeProvider?: string;
  judgeInvoked?: boolean;
};

const shouldRun = process.env.NODEBENCH_RUN_GAIA_CAPABILITY === "1";
const shouldWriteReport = process.env.NODEBENCH_WRITE_GAIA_REPORT === "1";

type GaiaCapabilityAudioPublicSummary = {
  suiteId: "gaia_capability_audio";
  lane: "audio";
  generatedAtIso: string;
  config: string;
  split: string;
  taskCount: number;
  concurrency: number;
  baseline: { model: string; correct: number; passRatePct: number; avgMs: number };
  tools: {
    model: string;
    mode: string;
    correct: number;
    passRatePct: number;
    avgMs: number;
    avgToolCalls: number;
  };
  improved: number;
  regressions: number;
  notes: string;
};

async function safeWriteJson(filePath: string, payload: unknown): Promise<void> {
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  } catch (err: any) {
    console.warn(`[gaia-capability-audio] report write failed: ${err?.message ?? String(err)}`);
  }
}

function resolveRepoRoot(): string {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(testDir, "../../../..");
}

function resolveCapabilityAudioFixturePath(): string {
  const override = process.env.NODEBENCH_GAIA_CAPABILITY_AUDIO_FIXTURE_PATH;
  if (override) {
    if (path.isAbsolute(override)) return override;
    const repoRoot = resolveRepoRoot();
    return path.resolve(repoRoot, override);
  }

  const config = process.env.NODEBENCH_GAIA_CAPABILITY_CONFIG ?? "2023_all";
  const split = process.env.NODEBENCH_GAIA_CAPABILITY_SPLIT ?? "validation";
  const repoRoot = resolveRepoRoot();
  return path.join(repoRoot, ".cache", "gaia", `gaia_capability_audio_${config}_${split}.sample.json`);
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

async function llmGenerateText(llm: TextLlmClient, history: TextLlmHistoryMessage[]): Promise<string> {
  const temperature = Number.parseFloat(process.env.NODEBENCH_GAIA_CAPABILITY_TEMPERATURE ?? "0");
  return generateTextFromHistory(llm, history, {
    temperature: Number.isFinite(temperature) ? temperature : 0,
    maxOutputTokens: 1024,
  });
}

async function baselineAnswer(llm: TextLlmClient, task: CapabilityTask): Promise<string> {
  const contents: TextLlmHistoryMessage[] = [
    {
      role: "user",
      parts: [
        {
          text: `Answer the question using your existing knowledge only. Do not browse the web.\n\nReturn ONLY the final answer, no explanation.\n\nQuestion:\n${task.prompt}`,
        },
      ],
    },
  ];
  return llmGenerateText(llm, contents);
}

async function loadFixture(filePath: string): Promise<CapabilityFixture> {
  const raw = await readFile(filePath, "utf8");
  const json = JSON.parse(raw) as CapabilityFixture;
  return json;
}

function createToolIndex(tools: McpTool[]): Map<string, McpTool> {
  const m = new Map<string, McpTool>();
  for (const t of tools) m.set(t.name, t);
  return m;
}

async function toolAugmentedAnswerFromAudio(
  llm: TextLlmClient,
  task: CapabilityTask,
  opts: { maxToolCalls: number }
): Promise<{ answer: string; toolCalls: number }> {
  const localPath = String(task.localFilePath ?? "").trim();
  if (!localPath) throw new Error("Task missing localFilePath");

  const toolIndex = createToolIndex(localFileTools);
  const tool = toolIndex.get("transcribe_audio_file");
  if (!tool) throw new Error("Missing tool: transcribe_audio_file");

  if (opts.maxToolCalls < 1) {
    throw new Error("maxToolCalls must be >= 1 to run audio lane");
  }

  const transcript = (await tool.handler({
    path: localPath,
    model: process.env.NODEBENCH_AUDIO_MODEL ?? "tiny.en",
    maxChars: 20000,
    timeoutMs: 300000,
  })) as any;

  const transcriptText = String(transcript?.text ?? "").trim();
  if (!transcriptText) {
    throw new Error("Empty transcript from transcribe_audio_file");
  }

  const contents: TextLlmHistoryMessage[] = [
    {
      role: "user",
      parts: [
        {
          text: `You are given a transcript of an attached audio file. Use it to answer the question.\n\nRules:\n- Do not browse the web.\n- Return ONLY the final answer, no explanation.\n\nQuestion:\n${task.prompt}\n\nAudio transcript:\n${transcriptText}`,
        },
      ],
    },
  ];

  const answer = await llmGenerateText(llm, contents);
  return { answer, toolCalls: 1 };
}

describe("GAIA capability: audio lane", () => {
  const testFn = shouldRun ? it : it.skip;

  testFn("should measure accuracy delta on a small GAIA audio subset", async () => {
    loadDotEnvLocalIfPresent();

    const fixturePath = resolveCapabilityAudioFixturePath();
    if (!existsSync(fixturePath)) {
      throw new Error(
        `Missing GAIA audio fixture at ${fixturePath}. Generate it with: python packages/mcp-local/src/__tests__/fixtures/generateGaiaCapabilityAudioFixture.py`
      );
    }

    const baselineModel = process.env.NODEBENCH_GAIA_BASELINE_MODEL ?? "gemini-3-flash-preview";
    const toolsModel = process.env.NODEBENCH_GAIA_TOOLS_MODEL ?? baselineModel;
    const baselineLlm = await createTextLlmClient({ model: baselineModel });
    const toolsLlm = await createTextLlmClient({ model: toolsModel });
    const baselineModelLabel = `${baselineLlm.provider}:${baselineLlm.model}`;
    const toolsModelLabel = `${toolsLlm.provider}:${toolsLlm.model}`;

    const fixture = await loadFixture(fixturePath);
    expect(Array.isArray(fixture.tasks)).toBe(true);
    expect(fixture.tasks.length).toBeGreaterThan(0);

    const requestedLimit = Number.parseInt(process.env.NODEBENCH_GAIA_CAPABILITY_TASK_LIMIT ?? "4", 10);
    const taskLimit = Math.max(
      1,
      Math.min(fixture.tasks.length, Number.isFinite(requestedLimit) ? requestedLimit : 4)
    );
    const tasks = fixture.tasks.slice(0, taskLimit);

    const requestedConcurrency = Number.parseInt(process.env.NODEBENCH_GAIA_CAPABILITY_CONCURRENCY ?? "1", 10);
    const concurrency = Math.max(
      1,
      Math.min(tasks.length, Number.isFinite(requestedConcurrency) ? requestedConcurrency : 1)
    );

    const maxToolCalls = Number.parseInt(process.env.NODEBENCH_GAIA_CAPABILITY_MAX_TOOL_CALLS ?? "1", 10);

    // Auto-discover judge (free OpenRouter → paid LLM → deterministic-only)
    const judge = await autoDiscoverJudge(toolsLlm);

    const results: ScoredResult[] = new Array(tasks.length);
    let nextIndex = 0;

    const workers = Array.from({ length: concurrency }, () =>
      (async () => {
        while (true) {
          const idx = nextIndex++;
          if (idx >= tasks.length) return;

          const task = tasks[idx];

          try {
            const baseStart = performance.now();
            const base = await baselineAnswer(baselineLlm, task);
            const baseMs = performance.now() - baseStart;

            const toolsStart = performance.now();
            const tools = await toolAugmentedAnswerFromAudio(toolsLlm, task, { maxToolCalls });
            const toolsMs = performance.now() - toolsStart;

            const baseJudge = await answersMatchWithJudge(task.expectedAnswer, base, judge);
            const toolsJudge = await answersMatchWithJudge(task.expectedAnswer, tools.answer, judge);

            results[idx] = {
              taskId: task.id,
              baselineCorrect: baseJudge.match,
              toolsCorrect: toolsJudge.match,
              baselineMs: baseMs,
              toolsMs,
              toolCalls: tools.toolCalls,
              judgeProvider: toolsJudge.judgeProvider,
              judgeInvoked: toolsJudge.judgeInvoked,
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
    const baselinePassRate = (baselineCorrect / results.length) * 100;
    const toolsPassRate = (toolsCorrect / results.length) * 100;
    const avgBaseMs = results.reduce((sum, r) => sum + r.baselineMs, 0) / results.length;
    const avgToolsMs = results.reduce((sum, r) => sum + r.toolsMs, 0) / results.length;
    const avgToolCalls = results.reduce((sum, r) => sum + r.toolCalls, 0) / results.length;

    const improved = results.filter((r) => !r.baselineCorrect && r.toolsCorrect).length;
    const regressions = results.filter((r) => r.baselineCorrect && !r.toolsCorrect).length;

    console.log(
      `[gaia-capability-audio] tasks=${results.length} baseline=${baselineCorrect}/${results.length} (${baselinePassRate.toFixed(
        1
      )}%) tools=${toolsCorrect}/${results.length} (${toolsPassRate.toFixed(1)}%) delta=${(
        toolsPassRate - baselinePassRate
      ).toFixed(1)}% improved=${improved} regressions=${regressions} avgToolCalls=${avgToolCalls.toFixed(2)}`
    );

    const toolsMode = (process.env.NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE ?? "audio").toLowerCase();
    const publicSummary: GaiaCapabilityAudioPublicSummary = {
      suiteId: "gaia_capability_audio",
      lane: "audio",
      generatedAtIso: new Date().toISOString(),
      config: fixture.config,
      split: fixture.split,
      taskCount: results.length,
      concurrency,
      baseline: {
        model: baselineModelLabel,
        correct: baselineCorrect,
        passRatePct: baselinePassRate,
        avgMs: avgBaseMs,
      },
      tools: {
        model: toolsModelLabel,
        mode: toolsMode,
        correct: toolsCorrect,
        passRatePct: toolsPassRate,
        avgMs: avgToolsMs,
        avgToolCalls,
      },
      improved,
      regressions,
      notes:
        "GAIA audio lane (audio attachments). No prompts/answers persisted; only aggregate metrics are written to public/evals.",
    };

    if (shouldWriteReport) {
      const repoRoot = resolveRepoRoot();
      await safeWriteJson(
        path.join(repoRoot, "public", "evals", "gaia_capability_audio_latest.json"),
        publicSummary
      );

      const detailed = {
        ...publicSummary,
        results: results.map((r) => ({
          taskId: r.taskId,
          baselineCorrect: r.baselineCorrect,
          toolsCorrect: r.toolsCorrect,
          baselineMs: Math.round(r.baselineMs),
          toolsMs: Math.round(r.toolsMs),
          toolCalls: r.toolCalls,
          ...(r.error ? { error: r.error } : {}),
        })),
      };
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      await safeWriteJson(
        path.join(
          repoRoot,
          ".cache",
          "gaia",
          "reports",
          `gaia_capability_audio_${fixture.config}_${fixture.split}_${stamp}.json`
        ),
        detailed
      );
    }

    expect(toolsPassRate).toBeGreaterThanOrEqual(baselinePassRate);
  }, 600000);
});
