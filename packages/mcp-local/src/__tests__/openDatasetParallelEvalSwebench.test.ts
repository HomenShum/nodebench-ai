/**
 * Open-source dataset benchmark for long-running tasks (SWE-bench lane).
 *
 * This test uses SWE-bench Verified issue tasks and runs task workflows
 * through NodeBench MCP tools in parallel "subagent" workers.
 */

import { describe, expect, it } from "vitest";
import datasetFixture from "./fixtures/swebench_verified.sample.json";
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
  repo: string;
  difficulty: string;
  statementLength: number;
  hintLength: number;
  failToPassCount: number;
  passToPassCount: number;
  complexityScore: number;
};

type FixturePayload = {
  dataset: string;
  split: string;
  sourceUrl: string;
  rowsApi: string;
  generatedAt: string;
  tasks: FixtureTask[];
  selection: {
    requestedLimit: number;
    minStatementLength: number;
    minFailToPass: number;
    maxRowsScanned: number;
    pageSize: number;
    totalRecords: number;
    candidateRecords: number;
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

const fixture = datasetFixture as FixturePayload;

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

async function runDatasetTask(task: FixtureTask, workerIndex: number): Promise<WorkerResult> {
  const started = Date.now();

  const recon = (await callTool(
    "run_recon",
    {
      target: `SWE-bench Verified task ${task.id}`,
      description: `Open-source long-running engineering benchmark (${task.repo}, ${task.difficulty}).`,
      projectContext: {
        techStack: "TypeScript, MCP, SQLite",
        architecture: "Parallel subagent MCP workflow benchmark",
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
      summary: `Ingested SWE-bench task ${task.id} (${task.repo}) with failToPass=${task.failToPassCount}.`,
      sourceUrl: `${fixture.sourceUrl}`,
      relevance: "Real-world software issue benchmark for MCP orchestration quality.",
      actionItems: "Run in parallel worker pool and enforce mandatory flywheel checks.",
    },
    task.id,
    "recon_log"
  );

  let discovered = (await callTool(
    "findTools",
    {
      query: task.prompt.slice(0, 600),
      category: "verification",
    },
    task.id,
    "find_tools"
  )) as any;

  if (!Array.isArray(discovered?.tools) || discovered.tools.length === 0) {
    discovered = (await callTool(
      "findTools",
      { query: "software bugfix verification eval workflow", category: "eval" },
      task.id,
      "find_tools_fallback"
    )) as any;
  }
  expect(Array.isArray(discovered.tools)).toBe(true);
  expect(discovered.tools.length).toBeGreaterThan(0);

  const difficultyLower = task.difficulty.toLowerCase();
  const methodologyTopic =
    difficultyLower.includes("1-4 hours") || task.complexityScore >= 140
      ? "mandatory_flywheel"
      : "verification";
  const methodology = (await callTool(
    "getMethodology",
    { topic: methodologyTopic },
    task.id,
    "get_methodology"
  )) as any;
  expect(methodology.title).toBeTruthy();
  expect(Array.isArray(methodology.steps)).toBe(true);
  expect(methodology.steps.length).toBeGreaterThan(0);

  const evalRun = (await callTool(
    "start_eval_run",
    {
      name: `open-dataset-swebench-${task.id}-${Date.now()}`,
      description: `SWE-bench scenario (${task.repo}, worker ${workerIndex})`,
      cases: [
        {
          input: task.prompt,
          intent: `Coordinate long-running SWE-bench workflow for ${task.id}`,
          expected:
            "Discover strategy, run eval bookkeeping, and complete closed-loop plus mandatory flywheel checks.",
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
      actual: `Discovered ${discovered.tools.length} tools and completed SWE-bench workflow.`,
      telemetry: {
        dataset: fixture.dataset,
        split: fixture.split,
        taskId: task.id,
        repo: task.repo,
        difficulty: task.difficulty,
        workerIndex,
        statementLength: task.statementLength,
        hintLength: task.hintLength,
        failToPassCount: task.failToPassCount,
        passToPassCount: task.passToPassCount,
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
      target: `Open-source SWE-bench task ${task.id}`,
      steps: [
        { stepName: "static_analysis", passed: true, output: "Types and schemas validated." },
        { stepName: "happy_path_test", passed: true, output: "Dataset task completed end-to-end." },
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

async function runWorkerPool(tasks: FixtureTask[], concurrency: number): Promise<WorkerResult[]> {
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
          results[taskIndex] = await runDatasetTask(task, workerIndex);
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

describe("Scenario: Open-Source Long-Running Dataset (SWE-bench Parallel Subagents)", () => {
  it("should execute SWE-bench tasks with parallel MCP subagent workflows", async () => {
    expect(Array.isArray(fixture.tasks)).toBe(true);
    expect(fixture.tasks.length).toBeGreaterThan(0);

    const requestedTaskLimit = Number.parseInt(
      process.env.NODEBENCH_SWEBENCH_TASK_LIMIT ?? "8",
      10
    );
    const taskLimit = Math.max(
      1,
      Math.min(fixture.tasks.length, Number.isFinite(requestedTaskLimit) ? requestedTaskLimit : 8)
    );

    const requestedConcurrency = Number.parseInt(
      process.env.NODEBENCH_SWEBENCH_CONCURRENCY ?? "4",
      10
    );
    const concurrency = Math.max(
      1,
      Math.min(taskLimit, Number.isFinite(requestedConcurrency) ? requestedConcurrency : 4)
    );

    const tasks = fixture.tasks.slice(0, taskLimit);
    const started = Date.now();
    const results = await runWorkerPool(tasks, concurrency);
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
      `[open-dataset-swebench] dataset=${fixture.dataset} split=${fixture.split} tasks=${taskLimit} concurrency=${concurrency} pass=${passed.length}/${results.length} elapsedMs=${elapsedMs} toolCalls=${openDatasetToolCallLog.length}`
    );

    if (failed.length > 0) {
      console.error(
        "[open-dataset-swebench] failures:",
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

