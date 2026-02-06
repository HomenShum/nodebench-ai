/**
 * GAIA capability/accuracy benchmark: LLM-only vs LLM+NodeBench MCP tools.
 *
 * This test attempts to solve a small GAIA subset and scores answers against
 * the ground-truth "Final answer" (stored locally under `.cache/gaia`, gitignored).
 *
 * Safety:
 * - GAIA is gated. Do not commit fixtures that contain prompts/answers.
 * - This test logs only task IDs and aggregate metrics (no prompt/answer text).
 *
 * Disabled by default (cost + rate limits + external network). Run with:
 *   NODEBENCH_RUN_GAIA_CAPABILITY=1 npm --prefix packages/mcp-local run test
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import { webTools } from "../tools/webTools.js";
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
  complexityScore?: number;
};

type CapabilityFixture = {
  dataset: string;
  config: string;
  split: string;
  sourceUrl: string;
  generatedAt: string;
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

function resolveCapabilityFixturePath(): string {
  const override = process.env.NODEBENCH_GAIA_CAPABILITY_FIXTURE_PATH;
  if (override) {
    // Make override convenient when running from `packages/mcp-local` (vitest cwd),
    // while the fixture typically lives under repo-root `.cache/gaia/...`.
    if (path.isAbsolute(override)) return override;
    const repoRoot = resolveRepoRoot();
    return path.resolve(repoRoot, override);
  }

  const config = process.env.NODEBENCH_GAIA_CAPABILITY_CONFIG ?? "2023_all";
  const split = process.env.NODEBENCH_GAIA_CAPABILITY_SPLIT ?? "validation";
  const repoRoot = resolveRepoRoot();
  return path.join(repoRoot, ".cache", "gaia", `gaia_capability_${config}_${split}.sample.json`);
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
  for (const tool of webTools) byName.set(tool.name, tool);
  return byName;
}

function extractJsonObject(text: string): any | null {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  const slice = candidate.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

async function toolAugmentedAnswer(
  ai: any,
  task: CapabilityTask,
  opts: { maxSteps: number; maxToolCalls: number }
): Promise<{ answer: string; toolCalls: number }> {
  const toolIndex = buildToolIndex();
  const model = process.env.NODEBENCH_GAIA_TOOLS_MODEL ?? "gemini-2.5-flash";
  const forceWebSearch = process.env.NODEBENCH_GAIA_CAPABILITY_FORCE_WEB_SEARCH === "1";
  const forceFetchUrl = process.env.NODEBENCH_GAIA_CAPABILITY_FORCE_FETCH_URL === "1";
  const toolsMode = (process.env.NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE ?? "rag").toLowerCase();

  // "rag" mode: deterministic web_search + fetch_url + answer (more stable than agent loops).
  if (toolsMode === "rag") {
    const webSearch = toolIndex.get("web_search");
    const fetchUrl = toolIndex.get("fetch_url");
    if (!webSearch || !fetchUrl) throw new Error("Missing web_search/fetch_url tools");

    const search = await webSearch.handler({ query: task.prompt, maxResults: 5, provider: "auto" });
    const urls: string[] = Array.isArray((search as any)?.results)
      ? (search as any).results
          .map((r: any) => String(r?.url ?? "").trim())
          .filter((u: string) => u.startsWith("http"))
          .slice(0, 2)
      : [];

    const fetched: any[] = [];
    for (const url of urls) {
      // Keep extracts bounded; most GAIA tasks only need a small snippet.
      fetched.push(
        await fetchUrl.handler({
          url,
          extractMode: "markdown",
          maxLength: 12000,
        })
      );
    }

    const sourcesBlock = urls
      .map((u, i) => {
        const item = fetched[i] as any;
        const title = String(item?.title ?? "").trim();
        const content = String(item?.content ?? "").slice(0, 8000);
        return [`SOURCE ${i + 1}: ${title || u}`, `URL: ${u}`, `CONTENT:\n${content}`].join("\n");
      })
      .join("\n\n");

    const contents = [
      {
        role: "user" as const,
        parts: [
          {
            text:
              "Answer the question using ONLY the provided sources. " +
              "If the sources are insufficient, make the best supported guess.\n\n" +
              "Return ONLY the final answer, no explanation.\n\n" +
              `TASK_ID: ${task.id}\nQUESTION:\n${task.prompt}\n\n` +
              (sourcesBlock ? sourcesBlock : "NO_SOURCES_FOUND"),
          },
        ],
      },
    ];

    const answer = await geminiGenerateText(ai, model, contents);
    return { answer, toolCalls: 1 + urls.length };
  }

  const toolUsageSummary = [
    "You have access to tools:",
    "- web_search({query,maxResults,provider})",
    "- fetch_url({url,extractMode,maxLength})",
    "",
    "When using tools, respond with a single JSON object only:",
    `{"action":"tool","name":"web_search","arguments":{"query":"...","maxResults":5}}`,
    "When done, respond with:",
    `{"action":"final","answer":"..."}`,
    "",
    "Rules:",
    "- If the question depends on specific external sources or time-sensitive facts, use web_search.",
    "- Prefer web_search first, then fetch_url for the most relevant result(s).",
    "- Do NOT answer based only on snippets; fetch_url and extract the exact value when possible.",
    "- If the question specifies a timeframe (e.g. 'as of end of 2022'), prioritize archival sources (Wayback snapshots, Wikipedia revision oldid) that match that timeframe.",
    "- Keep tool arguments small (maxResults<=5, maxLength<=12000).",
    "- Do NOT include any explanation. Final answer must match the requested formatting.",
  ].join("\n");

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [
    {
      role: "user",
      parts: [
        {
          text: `${toolUsageSummary}\n\nTASK_ID: ${task.id}\nQUESTION:\n${task.prompt}`,
        },
      ],
    },
  ];

  let toolCalls = 0;
  let usedWebSearch = false;
  let usedFetchUrl = false;

  for (let step = 0; step < opts.maxSteps; step++) {
    const out = await geminiGenerateText(ai, model, contents);
    contents.push({ role: "model", parts: [{ text: out }] });

    const parsed = extractJsonObject(out);
    if (!parsed || typeof parsed !== "object") {
      // Ask the model to restate as JSON only.
      contents.push({
        role: "user",
        parts: [{ text: "Invalid format. Return JSON only with action tool|final." }],
      });
      continue;
    }

    if (parsed.action === "final") {
      if (forceWebSearch && !usedWebSearch) {
        contents.push({
          role: "user",
          parts: [{ text: "Before answering, you MUST call web_search at least once. Continue." }],
        });
        continue;
      }
      if (forceFetchUrl && !usedFetchUrl) {
        contents.push({
          role: "user",
          parts: [{ text: "Before answering, you MUST call fetch_url at least once. Continue." }],
        });
        continue;
      }
      const answer = String(parsed.answer ?? "").trim();
      return { answer, toolCalls };
    }

    if (parsed.action !== "tool") {
      contents.push({
        role: "user",
        parts: [{ text: "Invalid action. Return JSON only with action tool|final." }],
      });
      continue;
    }

    if (toolCalls >= opts.maxToolCalls) {
      contents.push({
        role: "user",
        parts: [{ text: "Tool call budget exceeded. Return final answer now." }],
      });
      continue;
    }

    const name = String(parsed.name ?? "");
    const tool = toolIndex.get(name);
    if (!tool) {
      contents.push({
        role: "user",
        parts: [{ text: `Unknown tool "${name}". Use only web_search or fetch_url.` }],
      });
      continue;
    }

    const args = (parsed.arguments ?? {}) as Record<string, unknown>;
    // Hard limits for safety.
    if (name === "web_search") {
      if (typeof args.maxResults !== "number") args.maxResults = 5;
      args.maxResults = Math.min(Number(args.maxResults) || 5, 5);
      if (!args.provider) args.provider = "auto";
    } else if (name === "fetch_url") {
      if (!args.extractMode) args.extractMode = "markdown";
      if (typeof args.maxLength !== "number") args.maxLength = 12000;
      args.maxLength = Math.min(Number(args.maxLength) || 12000, 12000);
    }

    toolCalls++;
    if (name === "web_search") usedWebSearch = true;
    if (name === "fetch_url") usedFetchUrl = true;
    const toolResult = await tool.handler(args);
    // Provide a bounded JSON summary to the model. Avoid dumping large content.
    const toolResultText = JSON.stringify(toolResult).slice(0, 12000);
    contents.push({
      role: "user",
      parts: [
        {
          text: `TOOL_RESULT ${name}:\n${toolResultText}\n\nContinue. Return JSON only.`,
        },
      ],
    });
  }

  // If we ran out of steps, force a final answer.
  contents.push({
    role: "user",
    parts: [{ text: "Out of steps. Return final answer now as JSON." }],
  });
  const out = await geminiGenerateText(ai, model, contents);
  const parsed = extractJsonObject(out);
  const answer =
    parsed && parsed.action === "final" ? String(parsed.answer ?? "").trim() : out.trim();
  return { answer, toolCalls };
}

async function loadFixture(fixturePath: string): Promise<CapabilityFixture> {
  const raw = await readFile(fixturePath, "utf8");
  const parsed = JSON.parse(raw) as CapabilityFixture;
  if (!parsed || !Array.isArray((parsed as any).tasks)) throw new Error("Invalid GAIA capability fixture");
  return parsed;
}

describe("Capability: GAIA accuracy (LLM-only vs LLM+tools)", () => {
  const testFn = shouldRun ? it : it.skip;

  testFn("should measure accuracy delta on a small GAIA subset", async () => {
    loadDotEnvLocalIfPresent();

    const fixturePath = resolveCapabilityFixturePath();
    if (!existsSync(fixturePath)) {
      throw new Error(
        `Missing GAIA capability fixture at ${fixturePath}. Generate it with: python packages/mcp-local/src/__tests__/fixtures/generateGaiaCapabilityFixture.py`
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

    const maxSteps = Number.parseInt(process.env.NODEBENCH_GAIA_CAPABILITY_MAX_STEPS ?? "7", 10);
    const maxToolCalls = Number.parseInt(process.env.NODEBENCH_GAIA_CAPABILITY_MAX_TOOL_CALLS ?? "5", 10);

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
            const tools = await toolAugmentedAnswer(ai, task, { maxSteps, maxToolCalls });
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
      `[gaia-capability] config=${fixture.config} split=${fixture.split} tasks=${tasks.length} concurrency=${concurrency} baseline=${baselineCorrect}/${tasks.length} tools=${toolsCorrect}/${tasks.length} improved=${improved} regressions=${regressions} avgBaselineMs=${avgBaseMs.toFixed(
        0
      )} avgToolsMs=${avgToolsMs.toFixed(0)} avgToolCalls=${avgToolCalls.toFixed(2)}`
    );
    console.log(
      `[gaia-capability] perTask: ${results
        .map((r) => `${r.taskId}:B${r.baselineCorrect ? "1" : "0"}T${r.toolsCorrect ? "1" : "0"}${r.error ? "E" : ""}`)
        .join(" ")}`
    );

    // By default this benchmark is informational and should not fail CI.
    // Set NODEBENCH_GAIA_CAPABILITY_ENFORCE=1 to turn the summary into a strict gate.
    const enforce = process.env.NODEBENCH_GAIA_CAPABILITY_ENFORCE === "1";
    if (enforce) {
      // Quality gate:
      // - Tools should not regress massively vs baseline (allow a small tolerance for web drift).
      // - Prefer at least one improvement so the run is measuring something tool-relevant.
      const allowedRegression = Math.max(1, Math.floor(tasks.length * 0.2));
      expect(improved).toBeGreaterThanOrEqual(1);
      expect(toolsCorrect).toBeGreaterThanOrEqual(baselineCorrect - allowedRegression);
      expect(toolsCorrect).toBeGreaterThanOrEqual(1);
    } else {
      // Informational mode: ensure we actually ran and produced results.
      expect(results.length).toBe(tasks.length);
      expect(results.some((r) => r.error)).toBe(false);
    }
  }, 15 * 60_000);
});
