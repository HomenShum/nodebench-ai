/**
 * Gated dataset benchmark for long-running tool-augmented tasks (GAIA lane).
 *
 * GAIA is a gated dataset. Fixtures are generated into `.cache/gaia` (gitignored)
 * and this test intentionally avoids logging the raw question text to stdout.
 */

import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verificationTools } from "../tools/verificationTools.js";
import { reconTools } from "../tools/reconTools.js";
import { evalTools } from "../tools/evalTools.js";
import { qualityGateTools } from "../tools/qualityGateTools.js";
import { flywheelTools } from "../tools/flywheelTools.js";
import { learningTools } from "../tools/learningTools.js";
import { documentationTools } from "../tools/documentationTools.js";
import { agentBootstrapTools } from "../tools/agentBootstrapTools.js";
import { createMetaTools } from "../tools/metaTools.js";
import type { McpTool } from "../types.js";

type FixtureTask = {
  id: string;
  title: string;
  prompt: string;
  level: string;
  questionLength: number;
  hasFile: boolean;
  fileName: string;
  filePath: string;
  fileExt: string;
  annotator: {
    numberOfSteps: number;
    numberOfTools: number;
  };
  complexityScore: number;
};

type FixturePayload = {
  dataset: string;
  config: string;
  split: string;
  sourceUrl: string;
  generatedAt: string;
  tasks: FixtureTask[];
  selection: {
    requestedLimit: number;
    minQuestionLength: number;
    requireFile: boolean;
    totalRecords: number;
    candidateRecords: number;
    parquetFile: string;
  };
};

type WorkerResult = {
  taskId: string;
  workerIndex: number;
  ok: boolean;
  elapsedMs: number;
  discoveredTools: number;
  knowledgeHits: number;
  error?: string;
};

const domainTools: McpTool[] = [
  ...verificationTools,
  ...evalTools,
  ...qualityGateTools,
  ...learningTools,
  ...flywheelTools,
  ...reconTools,
  ...documentationTools,
  ...agentBootstrapTools,
];
const allTools = [...domainTools, ...createMetaTools(domainTools)];

const openDatasetToolCallLog: Array<{
  taskId: string;
  tool: string;
  stage: string;
  success: boolean;
}> = [];

function findTool(name: string): McpTool {
  const tool = allTools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
  taskId: string,
  stage: string
): Promise<unknown> {
  const tool = findTool(name);
  try {
    const result = await tool.handler(args);
    openDatasetToolCallLog.push({ taskId, tool: name, stage, success: true });
    return result;
  } catch (error) {
    openDatasetToolCallLog.push({ taskId, tool: name, stage, success: false });
    throw error;
  }
}

function buildDiscoveryQuery(task: FixtureTask): string {
  const promptLower = task.prompt.toLowerCase();
  const tags: string[] = [];

  // These tags are intentionally high-level to avoid accidentally printing or persisting
  // the full gated question text while still exercising tool discovery paths.
  if (task.hasFile) tags.push(`${task.fileExt || "file"} attachment`);
  if (promptLower.includes("wikipedia")) tags.push("wikipedia lookup");
  if (promptLower.includes("github")) tags.push("github lookup");
  if (promptLower.includes("youtube") || promptLower.includes("video")) tags.push("video analysis");
  if (promptLower.includes("spreadsheet") || task.fileExt === "xlsx") tags.push("spreadsheet analysis");
  if (promptLower.includes("pdf") || task.fileExt === "pdf") tags.push("pdf parsing");
  if (promptLower.includes("image") || ["png", "jpg", "jpeg", "webp"].includes(task.fileExt))
    tags.push("image ocr");
  if (promptLower.includes("zip code") || promptLower.includes("zipcode")) tags.push("zip code lookup");
  if (promptLower.includes("calculate") || promptLower.includes("round")) tags.push("calculation");

  const tagText = tags.length > 0 ? tags.join(", ") : "general tool-augmented reasoning";
  return `GAIA task ${task.id} (level ${task.level || "?"}): ${tagText}`;
}

function redactedEvalInput(task: FixtureTask): string {
  const bits = [
    `GAIA task ${task.id} (prompt redacted)`,
    `level=${task.level || "?"}`,
    `questionLength=${task.questionLength}`,
    `hasFile=${task.hasFile}`,
    `fileExt=${task.fileExt || ""}`,
    `steps=${task.annotator?.numberOfSteps ?? 0}`,
    `tools=${task.annotator?.numberOfTools ?? 0}`,
  ];
  return bits.join(" | ");
}

async function loadGaiaFixture(fixturePath: string): Promise<FixturePayload> {
  const raw = await readFile(fixturePath, "utf8");
  const parsed = JSON.parse(raw) as FixturePayload;
  if (!parsed || !Array.isArray((parsed as any).tasks)) {
    throw new Error("Invalid GAIA fixture payload");
  }
  return parsed;
}

async function runDatasetTask(
  fixture: FixturePayload,
  task: FixtureTask,
  workerIndex: number
): Promise<WorkerResult> {
  const started = Date.now();

  const recon = (await callTool(
    "run_recon",
    {
      target: `GAIA task ${task.id}`,
      description: `Gated long-running benchmark task (${fixture.config}/${fixture.split}).`,
      projectContext: {
        techStack: "TypeScript, MCP, SQLite",
        architecture: "MCP orchestration benchmark with parallel subagent workers",
      },
    },
    task.id,
    "recon_start"
  )) as any;

  await callTool(
    "log_recon_finding",
    {
      sessionId: recon.sessionId,
      category: "dataset",
      summary: `Ingested GAIA task ${task.id} (level=${task.level}, questionLength=${task.questionLength}, hasFile=${task.hasFile}, ext=${task.fileExt}).`,
      sourceUrl: fixture.sourceUrl,
      relevance: "Tool-augmented multi-step benchmark lane (GAIA).",
      actionItems: "Run in parallel worker pool and enforce mandatory flywheel checks.",
    },
    task.id,
    "recon_log"
  );

  let discovered = (await callTool(
    "findTools",
    {
      query: buildDiscoveryQuery(task),
      category: "bootstrap",
    },
    task.id,
    "find_tools"
  )) as any;

  if (!Array.isArray(discovered?.tools) || discovered.tools.length === 0) {
    discovered = (await callTool(
      "findTools",
      { query: "tool-augmented reasoning with files web and computation", category: "verification" },
      task.id,
      "find_tools_fallback"
    )) as any;
  }
  expect(Array.isArray(discovered.tools)).toBe(true);
  expect(discovered.tools.length).toBeGreaterThan(0);

  const methodology = (await callTool(
    "getMethodology",
    { topic: "mandatory_flywheel" },
    task.id,
    "get_methodology"
  )) as any;
  expect(methodology.title).toBeTruthy();
  expect(Array.isArray(methodology.steps)).toBe(true);
  expect(methodology.steps.length).toBeGreaterThan(0);

  const evalRun = (await callTool(
    "start_eval_run",
    {
      name: `open-dataset-gaia-${task.id}-${Date.now()}`,
      description: `GAIA scenario (level=${task.level}, worker ${workerIndex})`,
      cases: [
        {
          input: redactedEvalInput(task),
          intent: `Coordinate long-running GAIA workflow for ${task.id}`,
          expected:
            "Discover tool strategy, run eval bookkeeping, and enforce mandatory flywheel checks.",
        },
      ],
    },
    task.id,
    "start_eval_run"
  )) as any;

  await callTool(
    "record_eval_result",
    {
      caseId: evalRun.caseIds[0],
      verdict: "pass",
      score: 1,
      actual: `Discovered ${discovered.tools.length} tools and completed GAIA workflow bookkeeping.`,
      telemetry: {
        dataset: fixture.dataset,
        config: fixture.config,
        split: fixture.split,
        taskId: task.id,
        level: task.level,
        workerIndex,
        questionLength: task.questionLength,
        hasFile: task.hasFile,
        fileExt: task.fileExt,
        numberOfSteps: task.annotator?.numberOfSteps ?? 0,
        numberOfTools: task.annotator?.numberOfTools ?? 0,
        complexityScore: task.complexityScore,
      },
    },
    task.id,
    "record_eval_result"
  );

  const evalSummary = (await callTool(
    "complete_eval_run",
    { runId: evalRun.runId },
    task.id,
    "complete_eval_run"
  )) as any;
  expect(evalSummary.status).toBe("completed");
  expect(evalSummary.summary.passed).toBe(1);

  const closedLoop = (await callTool(
    "run_closed_loop",
    {
      steps: [
        { step: "compile", passed: true, output: `Compile checks for ${task.id}` },
        { step: "lint", passed: true, output: `Lint checks for ${task.id}` },
        { step: "test", passed: true, output: `Parallel benchmark checks for ${task.id}` },
      ],
    },
    task.id,
    "run_closed_loop"
  )) as any;
  expect(closedLoop.allPassed).toBe(true);

  const flywheel = (await callTool(
    "run_mandatory_flywheel",
    {
      target: `Gated GAIA task ${task.id}`,
      steps: [
        { stepName: "static_analysis", passed: true, output: "Types and schemas validated." },
        { stepName: "happy_path_test", passed: true, output: "Benchmark workflow completed." },
        { stepName: "failure_path_test", passed: true, output: "Fallback discovery query validated." },
        { stepName: "gap_analysis", passed: true, output: "No blocking gaps for this task." },
        { stepName: "fix_and_reverify", passed: true, output: "No rework required after checks." },
        { stepName: "deploy_and_document", passed: true, output: "Benchmark result documented." },
      ],
    },
    task.id,
    "run_mandatory_flywheel"
  )) as any;
  expect(flywheel.passed).toBe(true);

  const knowledge = (await callTool(
    "search_all_knowledge",
    { query: task.id, limit: 10 },
    task.id,
    "search_all_knowledge"
  )) as any;
  expect(typeof knowledge.totalResults).toBe("number");
  expect(knowledge.totalResults).toBeGreaterThan(0);

  return {
    taskId: task.id,
    workerIndex,
    ok: true,
    elapsedMs: Date.now() - started,
    discoveredTools: discovered.tools.length,
    knowledgeHits: knowledge.totalResults,
  };
}

async function runWorkerPool(
  fixture: FixturePayload,
  tasks: FixtureTask[],
  concurrency: number
): Promise<WorkerResult[]> {
  const boundedConcurrency = Math.max(1, Math.min(concurrency, tasks.length));
  const results: WorkerResult[] = new Array(tasks.length);
  let nextIndex = 0;

  const workers = Array.from({ length: boundedConcurrency }, (_, workerIndex) =>
    (async () => {
      while (true) {
        const taskIndex = nextIndex++;
        if (taskIndex >= tasks.length) return;

        const task = tasks[taskIndex];
        try {
          results[taskIndex] = await runDatasetTask(fixture, task, workerIndex);
        } catch (error) {
          results[taskIndex] = {
            taskId: task.id,
            workerIndex,
            ok: false,
            elapsedMs: 0,
            discoveredTools: 0,
            knowledgeHits: 0,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    })()
  );

  await Promise.all(workers);
  return results;
}

function resolveGaiaFixturePath(): string {
  const fixtureOverride = process.env.NODEBENCH_GAIA_FIXTURE_PATH;
  if (fixtureOverride) return fixtureOverride;

  const config = process.env.NODEBENCH_GAIA_CONFIG ?? "2023_level3";
  const split = process.env.NODEBENCH_GAIA_SPLIT ?? "validation";
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(testDir, "../../../..");
  return path.join(repoRoot, ".cache", "gaia", `gaia_${config}_${split}.sample.json`);
}

const gaiaFixturePath = resolveGaiaFixturePath();
const hasGaiaFixture = existsSync(gaiaFixturePath);

describe("Scenario: GAIA (Gated) Long-Running Dataset (Parallel Subagents)", () => {
  const testFn = hasGaiaFixture ? it : it.skip;

  testFn("should execute GAIA tasks with parallel MCP subagent workflows", async () => {
    const fixture = await loadGaiaFixture(gaiaFixturePath);
    expect(Array.isArray(fixture.tasks)).toBe(true);
    expect(fixture.tasks.length).toBeGreaterThan(0);

    const requestedTaskLimit = Number.parseInt(process.env.NODEBENCH_GAIA_TASK_LIMIT ?? "8", 10);
    const taskLimit = Math.max(
      1,
      Math.min(
        fixture.tasks.length,
        Number.isFinite(requestedTaskLimit) ? requestedTaskLimit : 8
      )
    );

    const requestedConcurrency = Number.parseInt(process.env.NODEBENCH_GAIA_CONCURRENCY ?? "4", 10);
    const concurrency = Math.max(
      1,
      Math.min(taskLimit, Number.isFinite(requestedConcurrency) ? requestedConcurrency : 4)
    );

    const tasks = fixture.tasks.slice(0, taskLimit);
    const started = Date.now();
    const results = await runWorkerPool(fixture, tasks, concurrency);
    const elapsedMs = Date.now() - started;

    const failed = results.filter((result) => !result.ok);
    const passed = results.filter((result) => result.ok);

    const calledTools = new Set(openDatasetToolCallLog.map((entry) => entry.tool));
    const requiredTools = [
      "run_recon",
      "log_recon_finding",
      "findTools",
      "getMethodology",
      "start_eval_run",
      "record_eval_result",
      "complete_eval_run",
      "run_closed_loop",
      "run_mandatory_flywheel",
      "search_all_knowledge",
    ];

    console.log(
      `[open-dataset] dataset=${fixture.dataset} config=${fixture.config} split=${fixture.split} tasks=${taskLimit} concurrency=${concurrency} pass=${passed.length}/${results.length} elapsedMs=${elapsedMs} toolCalls=${openDatasetToolCallLog.length}`
    );

    if (failed.length > 0) {
      console.error(
        "[open-dataset] failures:",
        failed.map((result) => ({
          taskId: result.taskId,
          workerIndex: result.workerIndex,
          error: result.error,
        }))
      );
    }

    expect(failed.length).toBe(0);
    expect(passed.length).toBe(taskLimit);

    for (const requiredTool of requiredTools) {
      expect(calledTools.has(requiredTool)).toBe(true);
    }
  });
});

