/**
 * Performance comparison: "no tools" (noop handlers) vs NodeBench MCP toolchain.
 *
 * Notes:
 * - This is a wall-clock micro-benchmark for local harness overhead, not capability/accuracy.
 * - Disabled by default to avoid noisy perf output in normal test runs.
 *   Set NODEBENCH_RUN_PERF_COMPARE=1 to run.
 * - GAIA is gated; if a local GAIA fixture exists in `.cache/gaia`, it will be included.
 */

import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import bfclFixture from "./fixtures/bfcl_v3_long_context.sample.json";
import toolbenchFixture from "./fixtures/toolbench_instruction.sample.json";
import swebenchFixture from "./fixtures/swebench_verified.sample.json";

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

type GenericTask = {
  id: string;
  prompt: string;
  meta?: Record<string, unknown>;
};

type DatasetRunConfig = {
  id: string;
  tasks: GenericTask[];
  // env vars to control taskLimit/concurrency
  limitEnv: string;
  concurrencyEnv: string;
  // For gated datasets, avoid persisting raw prompt text to tool calls
  redactedEvalInput?: (task: GenericTask) => string;
  redactedFindToolsQuery?: (task: GenericTask) => string;
};

type WorkerResult = {
  taskId: string;
  workerIndex: number;
  ok: boolean;
  elapsedMs: number;
  error?: string;
};

type CallToolFn = (
  name: string,
  args: Record<string, unknown>,
  taskId: string,
  stage: string
) => Promise<unknown>;

const shouldRun = process.env.NODEBENCH_RUN_PERF_COMPARE === "1";

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

function findTool(name: string): McpTool {
  const tool = allTools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

function buildNoopToolCaller(): CallToolFn {
  return async (name, _args, taskId, _stage) => {
    switch (name) {
      case "run_recon":
        return { sessionId: `noop_${taskId}` };
      case "log_recon_finding":
        return { ok: true };
      case "findTools":
        return { tools: [{ name: "noop_tool" }] };
      case "getMethodology":
        return { title: "noop", steps: ["noop-step"] };
      case "start_eval_run":
        return { runId: `noop_run_${taskId}`, caseIds: [`noop_case_${taskId}`] };
      case "record_eval_result":
        return { ok: true };
      case "complete_eval_run":
        return { status: "completed", summary: { passed: 1 } };
      case "run_closed_loop":
        return { allPassed: true };
      case "run_mandatory_flywheel":
        return { passed: true };
      case "search_all_knowledge":
        return { totalResults: 1 };
      default:
        throw new Error(`noop tool not implemented: ${name}`);
    }
  };
}

function buildNodebenchToolCaller(
  toolCallLog: Array<{ taskId: string; tool: string; stage: string; success: boolean }>
): CallToolFn {
  return async (name, args, taskId, stage) => {
    const tool = findTool(name);
    try {
      const result = await tool.handler(args);
      toolCallLog.push({ taskId, tool: name, stage, success: true });
      return result;
    } catch (error) {
      toolCallLog.push({ taskId, tool: name, stage, success: false });
      throw error;
    }
  };
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  const asNum = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, asNum));
}

async function runPipelineForTask(
  task: GenericTask,
  datasetId: string,
  callTool: CallToolFn,
  workerIndex: number,
  opts?: {
    redactedEvalInput?: (task: GenericTask) => string;
    redactedFindToolsQuery?: (task: GenericTask) => string;
  }
): Promise<WorkerResult> {
  const started = performance.now();

  const recon = (await callTool(
    "run_recon",
    {
      target: `${datasetId} task ${task.id}`,
      description: "Perf comparison pipeline run.",
      projectContext: {
        techStack: "TypeScript, MCP, SQLite",
        architecture: "Perf comparison harness (noop vs NodeBench tools)",
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
      summary: `Perf comparison task ${task.id} (dataset=${datasetId}).`,
      relevance: "Measure overhead of toolchain vs noop baseline.",
    },
    task.id,
    "recon_log"
  );

  const findToolsQuery =
    opts?.redactedFindToolsQuery?.(task) ?? task.prompt.slice(0, 600) ?? task.id;
  const discovered = (await callTool(
    "findTools",
    { query: findToolsQuery, category: "bootstrap" },
    task.id,
    "find_tools"
  )) as any;
  expect(Array.isArray(discovered?.tools)).toBe(true);

  const methodology = (await callTool(
    "getMethodology",
    { topic: "mandatory_flywheel" },
    task.id,
    "get_methodology"
  )) as any;
  expect(methodology.title).toBeTruthy();

  const evalInput = opts?.redactedEvalInput?.(task) ?? task.prompt;
  const evalRun = (await callTool(
    "start_eval_run",
    {
      name: `perf-${datasetId}-${task.id}-${Date.now()}`,
      description: `Perf comparison (${datasetId}, worker ${workerIndex})`,
      cases: [
        {
          input: evalInput,
          intent: `Perf compare pipeline for ${task.id}`,
          expected: "Complete bookkeeping toolchain steps without errors.",
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
      actual: "Perf comparison pass.",
      telemetry: { dataset: datasetId, taskId: task.id, workerIndex },
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

  const closedLoop = (await callTool(
    "run_closed_loop",
    {
      steps: [
        { step: "compile", passed: true, output: "ok" },
        { step: "lint", passed: true, output: "ok" },
        { step: "test", passed: true, output: "ok" },
      ],
    },
    task.id,
    "run_closed_loop"
  )) as any;
  expect(closedLoop.allPassed).toBe(true);

  const flywheel = (await callTool(
    "run_mandatory_flywheel",
    {
      target: `Perf compare ${datasetId} ${task.id}`,
      steps: [
        { stepName: "static_analysis", passed: true, output: "ok" },
        { stepName: "happy_path_test", passed: true, output: "ok" },
        { stepName: "failure_path_test", passed: true, output: "ok" },
        { stepName: "gap_analysis", passed: true, output: "ok" },
        { stepName: "fix_and_reverify", passed: true, output: "ok" },
        { stepName: "deploy_and_document", passed: true, output: "ok" },
      ],
    },
    task.id,
    "run_mandatory_flywheel"
  )) as any;
  expect(flywheel.passed).toBe(true);

  const knowledge = (await callTool(
    "search_all_knowledge",
    { query: task.id, limit: 5 },
    task.id,
    "search_all_knowledge"
  )) as any;
  expect(typeof knowledge.totalResults).toBe("number");

  return {
    taskId: task.id,
    workerIndex,
    ok: true,
    elapsedMs: performance.now() - started,
  };
}

async function runWorkerPool(
  datasetId: string,
  tasks: GenericTask[],
  concurrency: number,
  callTool: CallToolFn,
  opts?: {
    redactedEvalInput?: (task: GenericTask) => string;
    redactedFindToolsQuery?: (task: GenericTask) => string;
  }
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
          results[taskIndex] = await runPipelineForTask(
            task,
            datasetId,
            callTool,
            workerIndex,
            opts
          );
        } catch (error) {
          results[taskIndex] = {
            taskId: task.id,
            workerIndex,
            ok: false,
            elapsedMs: 0,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    })()
  );

  await Promise.all(workers);
  return results;
}

function toGenericTasks(fixture: any): GenericTask[] {
  const tasks = Array.isArray(fixture?.tasks) ? fixture.tasks : [];
  return tasks
    .map((t: any) => ({
      id: String(t?.id ?? "").trim(),
      prompt: String(t?.prompt ?? "").trim(),
      meta: typeof t === "object" && t ? t : undefined,
    }))
    .filter((t: any) => t.id && t.prompt);
}

function resolveGaiaFixturePath(): string {
  const config = process.env.NODEBENCH_GAIA_CONFIG ?? "2023_level3";
  const split = process.env.NODEBENCH_GAIA_SPLIT ?? "validation";
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(testDir, "../../../..");
  return path.join(repoRoot, ".cache", "gaia", `gaia_${config}_${split}.sample.json`);
}

async function tryLoadGaiaFixture(): Promise<any | null> {
  const gaiaPath = resolveGaiaFixturePath();
  if (!existsSync(gaiaPath)) return null;
  const raw = await readFile(gaiaPath, "utf8");
  return JSON.parse(raw);
}

function gaiaRedactedEvalInput(task: GenericTask): string {
  const meta = (task.meta ?? {}) as any;
  return [
    `GAIA task ${task.id} (prompt redacted)`,
    `level=${meta.level ?? "?"}`,
    `questionLength=${meta.questionLength ?? ""}`,
    `hasFile=${meta.hasFile ?? ""}`,
    `fileExt=${meta.fileExt ?? ""}`,
  ].join(" | ");
}

function gaiaRedactedFindToolsQuery(task: GenericTask): string {
  const meta = (task.meta ?? {}) as any;
  const ext = String(meta.fileExt ?? "");
  return `GAIA task ${task.id} (level ${meta.level ?? "?"}) | hasFile=${meta.hasFile ?? false} | ext=${ext}`;
}

const datasets: DatasetRunConfig[] = [
  {
    id: "bfcl",
    tasks: toGenericTasks(bfclFixture),
    limitEnv: "NODEBENCH_OPEN_DATASET_TASK_LIMIT",
    concurrencyEnv: "NODEBENCH_OPEN_DATASET_CONCURRENCY",
  },
  {
    id: "toolbench",
    tasks: toGenericTasks(toolbenchFixture),
    limitEnv: "NODEBENCH_TOOLBENCH_TASK_LIMIT",
    concurrencyEnv: "NODEBENCH_TOOLBENCH_CONCURRENCY",
  },
  {
    id: "swebench",
    tasks: toGenericTasks(swebenchFixture),
    limitEnv: "NODEBENCH_SWEBENCH_TASK_LIMIT",
    concurrencyEnv: "NODEBENCH_SWEBENCH_CONCURRENCY",
  },
];

describe("Benchmark: No-Tools vs NodeBench MCP Toolchain (Perf Compare)", () => {
  const testFn = shouldRun ? it : it.skip;

  testFn("should compare wall-clock runtime for noop vs NodeBench toolchain", async () => {
    const gaia = await tryLoadGaiaFixture();
    if (gaia) {
      datasets.push({
        id: "gaia",
        tasks: toGenericTasks(gaia),
        limitEnv: "NODEBENCH_GAIA_TASK_LIMIT",
        concurrencyEnv: "NODEBENCH_GAIA_CONCURRENCY",
        redactedEvalInput: gaiaRedactedEvalInput,
        redactedFindToolsQuery: gaiaRedactedFindToolsQuery,
      });
    }

    const noopCaller = buildNoopToolCaller();
    const nodebenchToolCallLog: Array<{
      taskId: string;
      tool: string;
      stage: string;
      success: boolean;
    }> = [];
    const nodebenchCaller = buildNodebenchToolCaller(nodebenchToolCallLog);

    for (const dataset of datasets) {
      expect(dataset.tasks.length).toBeGreaterThan(0);

      const taskLimit = clampInt(process.env[dataset.limitEnv], 8, 1, dataset.tasks.length);
      const concurrency = clampInt(process.env[dataset.concurrencyEnv], 4, 1, taskLimit);
      const tasks = dataset.tasks.slice(0, taskLimit);

      const noopStarted = performance.now();
      const noopResults = await runWorkerPool(dataset.id, tasks, concurrency, noopCaller, {
        redactedEvalInput: dataset.redactedEvalInput,
        redactedFindToolsQuery: dataset.redactedFindToolsQuery,
      });
      const noopElapsed = performance.now() - noopStarted;

      const nodebenchStarted = performance.now();
      const nodebenchResults = await runWorkerPool(dataset.id, tasks, concurrency, nodebenchCaller, {
        redactedEvalInput: dataset.redactedEvalInput,
        redactedFindToolsQuery: dataset.redactedFindToolsQuery,
      });
      const nodebenchElapsed = performance.now() - nodebenchStarted;

      const noopFailed = noopResults.filter((r) => !r.ok);
      const nodebenchFailed = nodebenchResults.filter((r) => !r.ok);
      if (noopFailed.length > 0 || nodebenchFailed.length > 0) {
        console.error("[perf-compare] failures", {
          dataset: dataset.id,
          noopFailed,
          nodebenchFailed,
        });
      }
      expect(noopFailed.length).toBe(0);
      expect(nodebenchFailed.length).toBe(0);

      const overhead = nodebenchElapsed - noopElapsed;
      const ratio = noopElapsed > 0 ? nodebenchElapsed / noopElapsed : Number.POSITIVE_INFINITY;
      const overheadPerTask = overhead / Math.max(1, tasks.length);

      console.log(
        `[perf-compare] dataset=${dataset.id} tasks=${tasks.length} concurrency=${concurrency} noopMs=${noopElapsed.toFixed(
          2
        )} nodebenchMs=${nodebenchElapsed.toFixed(2)} overheadMs=${overhead.toFixed(
          2
        )} overheadPerTaskMs=${overheadPerTask.toFixed(2)} ratio=${ratio.toFixed(2)}`
      );
    }

    const requiredTools = new Set([
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
    ]);
    const calledTools = new Set(nodebenchToolCallLog.map((e) => e.tool));
    for (const name of requiredTools) {
      expect(calledTools.has(name)).toBe(true);
    }
  });
});

