import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";
import { safeExec } from "../security/index.js";
import { reconTools } from "./reconTools.js";
import { verificationTools } from "./verificationTools.js";
import { qualityGateTools } from "./qualityGateTools.js";
import { flywheelTools } from "./flywheelTools.js";
import { dogfoodJudgeTools } from "./dogfoodJudgeTools.js";
import { llmJudgeLoopTools } from "./llmJudgeLoop.js";
import { learningTools } from "./learningTools.js";
import { sessionMemoryTools } from "./sessionMemoryTools.js";
import {
  linkDurableObjects,
  recordExecutionReceipt,
  recordLocalOutcome,
  upsertDurableObject,
} from "../sync/store.js";

type LoopStage =
  | "research"
  | "plan"
  | "implement"
  | "dogfood"
  | "judge"
  | "verify"
  | "learn";

type StageStatus = "running" | "completed" | "failed" | "skipped";

type CommandPhase =
  | "implement"
  | "compile"
  | "lint"
  | "test"
  | "self_debug"
  | "happy_path_test"
  | "failure_path_test";

interface ImplementationCommandInput {
  label: string;
  command: string;
  cwd?: string;
  timeoutMs?: number;
  phase?: CommandPhase;
}

interface ImplementationCommandResult {
  label: string;
  command: string;
  cwd: string;
  phase: CommandPhase;
  passed: boolean;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
}

interface AutonomousPlan {
  goal: string;
  researchTarget: string | null;
  researchHighlights: string[];
  implementationSequence: Array<{
    order: number;
    label: string;
    phase: CommandPhase;
    command: string;
  }>;
  dogfoodScenario: {
    scenarioId: string;
    prompt: string;
    toolName: string | null;
  } | null;
  verificationChecklist: string[];
  deliveryNote: string;
}

let schemaReady = false;

function ensureSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS autonomous_delivery_runs (
      run_id TEXT PRIMARY KEY,
      goal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      summary TEXT,
      research_summary TEXT,
      plan_json TEXT,
      implementation_summary TEXT,
      dogfood_summary TEXT,
      judge_summary TEXT,
      verification_summary TEXT,
      learning_summary TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS autonomous_delivery_steps (
      step_id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES autonomous_delivery_runs(run_id) ON DELETE CASCADE,
      stage TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      summary TEXT,
      details_json TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_autonomous_delivery_runs_created
      ON autonomous_delivery_runs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_autonomous_delivery_steps_run
      ON autonomous_delivery_steps(run_id, started_at);
  `);
  schemaReady = true;
}

function requireTool(tools: McpTool[], name: string): McpTool {
  const tool = tools.find((entry) => entry.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

function truncate(text: string | null | undefined, limit = 400): string {
  if (!text) return "";
  return text.length <= limit ? text : `${text.slice(0, limit)}...`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizePhase(command: ImplementationCommandInput): CommandPhase {
  if (command.phase) return command.phase;
  const haystack = `${command.label} ${command.command}`.toLowerCase();
  if (haystack.includes("lint")) return "lint";
  if (haystack.includes("compile") || haystack.includes("build") || haystack.includes("tsc")) return "compile";
  if (haystack.includes("debug")) return "self_debug";
  if (haystack.includes("failure") || haystack.includes("negative")) return "failure_path_test";
  if (haystack.includes("happy") || haystack.includes("smoke")) return "happy_path_test";
  if (
    haystack.includes("test") ||
    haystack.includes("vitest") ||
    haystack.includes("jest") ||
    haystack.includes("pytest")
  ) {
    return "test";
  }
  return "implement";
}

function summarizeResearch(researchSummary: any): string[] {
  if (!researchSummary) return [];
  const highlights: string[] = [];
  const categories = researchSummary.findingsByCategory ?? {};
  for (const [category, findings] of Object.entries(categories) as Array<
    [string, Array<{ summary?: string }>]
  >) {
    const first = findings[0]?.summary;
    if (first) highlights.push(`${category}: ${truncate(first, 140)}`);
  }
  if (Array.isArray(researchSummary.prioritizedActions)) {
    for (const action of researchSummary.prioritizedActions.slice(0, 3)) {
      if (action?.action) highlights.push(`action: ${truncate(String(action.action), 140)}`);
    }
  }
  return highlights.slice(0, 6);
}

function buildPlan(args: {
  goal: string;
  researchTarget?: string;
  researchSummary?: any;
  implementationCommands: ImplementationCommandInput[];
  dogfood?: {
    scenarioId: string;
    prompt: string;
    toolName?: string;
  } | null;
  saveSessionNote: boolean;
}): AutonomousPlan {
  return {
    goal: args.goal,
    researchTarget: args.researchTarget ?? null,
    researchHighlights: summarizeResearch(args.researchSummary),
    implementationSequence: args.implementationCommands.map((command, index) => ({
      order: index + 1,
      label: command.label,
      phase: normalizePhase(command),
      command: command.command,
    })),
    dogfoodScenario: args.dogfood
      ? {
          scenarioId: args.dogfood.scenarioId,
          prompt: args.dogfood.prompt,
          toolName: args.dogfood.toolName ?? null,
        }
      : null,
    verificationChecklist: [
      "Compile, lint, and test commands must all pass.",
      "Dogfood output must be judged before completion.",
      "Mandatory flywheel must have explicit static, happy-path, failure-path, gap-analysis, fix-and-reverify, and documentation evidence.",
      "At least one learning or durable note should be banked at the end of the run.",
    ],
    deliveryNote: args.saveSessionNote
      ? "A session note will be persisted to filesystem at the end of the run."
      : "Session note persistence is disabled for this run.",
  };
}

function mapImplementationToClosedLoopSteps(
  commands: ImplementationCommandResult[],
): Array<{ step: "compile" | "lint" | "test" | "self_debug"; passed: boolean; output: string }> {
  const phaseMap = new Map<string, ImplementationCommandResult[]>();
  for (const result of commands) {
    if (["compile", "lint", "test", "self_debug"].includes(result.phase)) {
      const existing = phaseMap.get(result.phase) ?? [];
      existing.push(result);
      phaseMap.set(result.phase, existing);
    }
  }

  const toOutput = (phase: "compile" | "lint" | "test" | "self_debug") => {
    const results = phaseMap.get(phase);
    if (!results || results.length === 0) {
      return {
        step: phase,
        passed: false,
        output: `No ${phase} step was recorded.`,
      };
    }
    return {
      step: phase,
      passed: results.every((entry) => entry.passed),
      output: results
        .map((entry) => `${entry.label}: ${entry.passed ? "passed" : "failed"} (${entry.exitCode})`)
        .join("; "),
    };
  };

  return [toOutput("compile"), toOutput("lint"), toOutput("test"), toOutput("self_debug")];
}

function deriveFlywheelSteps(args: {
  commandResults: ImplementationCommandResult[];
  dogfoodCompleted: boolean;
  judgePassed: boolean;
  researchCompleted: boolean;
  documentationPlanned: boolean;
}): Array<{ stepName: string; passed: boolean; output: string }> {
  const compileAndLint = args.commandResults.filter(
    (result) => result.phase === "compile" || result.phase === "lint",
  );
  const failurePath = args.commandResults.filter((result) => result.phase === "failure_path_test");
  const anyFailures = args.commandResults.some((result) => !result.passed);

  return [
    {
      stepName: "static_analysis",
      passed: compileAndLint.length > 0 && compileAndLint.every((result) => result.passed),
      output:
        compileAndLint.length > 0
          ? compileAndLint.map((result) => `${result.label}:${result.passed ? "pass" : "fail"}`).join(", ")
          : "No compile/lint command was supplied.",
    },
    {
      stepName: "happy_path_test",
      passed:
        args.dogfoodCompleted ||
        args.commandResults.some((result) => result.phase === "happy_path_test" && result.passed),
      output: args.dogfoodCompleted
        ? "Dogfood scenario completed."
        : "No explicit happy-path dogfood or happy_path_test step passed.",
    },
    {
      stepName: "failure_path_test",
      passed: failurePath.length > 0 && failurePath.every((result) => result.passed),
      output:
        failurePath.length > 0
          ? failurePath.map((result) => `${result.label}:${result.passed ? "pass" : "fail"}`).join(", ")
          : "No failure-path command was supplied.",
    },
    {
      stepName: "gap_analysis",
      passed: args.researchCompleted,
      output: args.researchCompleted
        ? "Recon and gap logging completed."
        : "Research/gap analysis was skipped or failed.",
    },
    {
      stepName: "fix_and_reverify",
      passed: !anyFailures,
      output: anyFailures
        ? "At least one implementation command failed; fix and re-run are still required."
        : "All implementation commands passed on the current loop.",
    },
    {
      stepName: "deploy_and_document",
      passed: args.documentationPlanned && args.judgePassed,
      output:
        args.documentationPlanned && args.judgePassed
          ? "Documentation/note step is enabled and judge passed."
          : "Documentation is missing or the judge did not pass.",
    },
  ];
}

function deriveDogfoodJudgeScores(verdict: any): {
  truthQuality: number;
  compressionQuality: number;
  anticipationQuality: number;
  outputQuality: number;
  delegationQuality: number;
  trustQuality: number;
} {
  const criteria = new Map<string, boolean>();
  for (const criterion of verdict?.criteria ?? []) {
    if (criterion?.criterion) criteria.set(String(criterion.criterion), Boolean(criterion.pass));
  }
  const pass = (name: string) => (criteria.get(name) ? 5 : 2);
  return {
    truthQuality: pass("Removed repeated cognition"),
    compressionQuality: pass("Suppressed noise"),
    anticipationQuality: pass("Surfaced right contradiction"),
    outputQuality: pass("Produced downstream artifact"),
    delegationQuality: pass("Returned usable packet"),
    trustQuality: pass("Trustworthy and reusable"),
  };
}

function createRun(goal: string): string {
  ensureSchema();
  const db = getDb();
  const runId = genId("auto");
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO autonomous_delivery_runs (run_id, goal, status, created_at, updated_at)
    VALUES (?, ?, 'running', ?, ?)
  `).run(runId, goal, now, now);
  upsertDurableObject({
    id: `run:${runId}`,
    kind: "run",
    label: goal,
    source: "autonomous_delivery",
    metadata: { runId, workflowName: "self_directed_delivery" },
  });
  upsertDurableObject({
    id: "workflow:self_directed_delivery",
    kind: "workflow",
    label: "Self-Directed Delivery Loop",
    source: "autonomous_delivery",
    metadata: { methodology: "ai_flywheel" },
  });
  linkDurableObjects({
    fromId: "workflow:self_directed_delivery",
    toId: `run:${runId}`,
    edgeType: "executes",
    metadata: { runId },
  });
  recordExecutionReceipt({
    runId,
    objectId: `run:${runId}`,
    actionType: "run_created",
    summary: `Autonomous delivery run created for goal: ${goal}`,
    status: "recorded",
    metadata: { workflowName: "self_directed_delivery" },
  });
  return runId;
}

function startStage(runId: string, stage: LoopStage, summary: string): string {
  ensureSchema();
  const db = getDb();
  const stepId = genId("auto_step");
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO autonomous_delivery_steps (step_id, run_id, stage, status, summary, started_at)
    VALUES (?, ?, ?, 'running', ?, ?)
  `).run(stepId, runId, stage, summary, now);
  db.prepare(`UPDATE autonomous_delivery_runs SET updated_at = ? WHERE run_id = ?`).run(now, runId);
  upsertDurableObject({
    id: `action:${stepId}`,
    kind: "action",
    label: `${stage} stage`,
    source: "autonomous_delivery",
    metadata: { runId, stepId, stage },
  });
  linkDurableObjects({
    fromId: `run:${runId}`,
    toId: `action:${stepId}`,
    edgeType: "contains_stage",
    metadata: { stage },
  });
  recordExecutionReceipt({
    runId,
    stepId,
    objectId: `action:${stepId}`,
    actionType: `${stage}_started`,
    summary,
    status: "running",
    metadata: { stage },
  });
  return stepId;
}

function finishStage(
  stepId: string,
  status: Exclude<StageStatus, "running">,
  summary: string,
  details?: unknown,
): void {
  ensureSchema();
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE autonomous_delivery_steps
    SET status = ?, summary = ?, details_json = ?, completed_at = ?
    WHERE step_id = ?
  `).run(status, summary, details ? JSON.stringify(details) : null, now, stepId);
  recordExecutionReceipt({
    stepId,
    objectId: `action:${stepId}`,
    actionType: "stage_completed",
    summary,
    status,
    metadata: { details },
  });
}

function updateRun(runId: string, patch: Record<string, unknown>): void {
  ensureSchema();
  const db = getDb();
  const now = new Date().toISOString();
  const fields = Object.keys(patch);
  if (fields.length === 0) return;
  const assignments = fields.map((field) => `${field} = ?`);
  assignments.push("updated_at = ?");
  const values = fields.map((field) => {
    const value = patch[field];
    if (value == null) return null;
    return typeof value === "string" ? value : JSON.stringify(value);
  });
  values.push(now, runId);
  db.prepare(`
    UPDATE autonomous_delivery_runs
    SET ${assignments.join(", ")}
    WHERE run_id = ?
  `).run(...values);
}

function completeRun(runId: string, status: "completed" | "failed" | "needs_attention", summary: string): void {
  ensureSchema();
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE autonomous_delivery_runs
    SET status = ?, summary = ?, updated_at = ?, completed_at = ?
    WHERE run_id = ?
  `).run(status, summary, now, now, runId);
  recordExecutionReceipt({
    runId,
    objectId: `run:${runId}`,
    actionType: "run_completed",
    summary,
    status,
    metadata: { completedAt: now },
  });
  recordLocalOutcome({
    id: `outcome:${runId}`,
    runId,
    objectId: `run:${runId}`,
    outcomeType: "autonomous_delivery",
    headline: summary,
    userValue: "One durable delivery run with explicit research, implementation, dogfood, and verification receipts.",
    stakeholderValue: "Replayable proof of work, verification state, and next actions tied to a single run.",
    status,
    evidence: [{ type: "run", id: runId }],
  });
}

async function resolveToolByName(toolName: string): Promise<McpTool> {
  const { loadToolsets, ALL_DOMAIN_KEYS, TOOLSET_MAP } = await import("../toolsetRegistry.js");
  await loadToolsets(ALL_DOMAIN_KEYS);
  const tool = Object.values(TOOLSET_MAP)
    .flat()
    .find((entry) => entry.name === toolName);
  if (!tool) throw new Error(`Unable to resolve dogfood tool: ${toolName}`);
  return tool;
}

export const autonomousDeliveryTools: McpTool[] = [
  {
    name: "run_self_directed_delivery_loop",
    description:
      "Run a local-first autonomous delivery loop across exploratory research, planning, implementation commands, dogfood, verification, and judge. Persists one durable run in SQLite and emits per-stage receipts so the whole loop can be resumed, audited, and synced later.",
    inputSchema: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          description: "The outcome this autonomous loop is trying to deliver.",
        },
        research: {
          type: "object",
          description: "Optional structured recon input for the research stage.",
          properties: {
            target: { type: "string" },
            description: { type: "string" },
            webEnrich: { type: "boolean" },
            projectContext: { type: "object", additionalProperties: true },
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    enum: [
                      "breaking_change",
                      "new_feature",
                      "deprecation",
                      "best_practice",
                      "dataset",
                      "benchmark",
                      "codebase_pattern",
                      "existing_implementation",
                    ],
                  },
                  summary: { type: "string" },
                  sourceUrl: { type: "string" },
                  relevance: { type: "string" },
                  actionItems: { type: "string" },
                },
                required: ["category", "summary"],
              },
            },
          },
        },
        implementation: {
          type: "object",
          description: "Shell commands to execute as the implementation and verification loop.",
          properties: {
            stopOnFailure: { type: "boolean" },
            commands: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  command: { type: "string" },
                  cwd: { type: "string" },
                  timeoutMs: { type: "number" },
                  phase: {
                    type: "string",
                    enum: [
                      "implement",
                      "compile",
                      "lint",
                      "test",
                      "self_debug",
                      "happy_path_test",
                      "failure_path_test",
                    ],
                  },
                },
                required: ["label", "command"],
              },
            },
          },
        },
        dogfood: {
          type: "object",
          description: "Optional dogfood scenario or precomputed output to judge.",
          properties: {
            loopType: {
              type: "string",
              enum: ["weekly_reset", "pre_delegation", "company_search"],
            },
            scenarioId: { type: "string" },
            prompt: { type: "string" },
            toolName: { type: "string" },
            toolArgs: { type: "object", additionalProperties: true },
            output: { type: "object", additionalProperties: true },
            userRole: {
              type: "string",
              enum: ["founder", "banker", "ceo", "operator", "researcher", "student"],
            },
            packetVersionUsed: { type: "string" },
            packetType: { type: "string" },
            attachedInputs: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["scenarioId", "prompt"],
        },
        autoRecordLearning: {
          type: "boolean",
          description: "Persist an automatic learning summary at the end of the run. Default: true.",
        },
        saveSessionNote: {
          type: "boolean",
          description: "Persist a filesystem session note at the end of the run. Default: true.",
        },
        learnings: {
          type: "array",
          description: "Optional explicit learnings to persist in addition to the automatic summary.",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              content: { type: "string" },
              category: {
                type: "string",
                enum: ["edge_case", "gotcha", "pattern", "regression", "convention"],
              },
              tags: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["key", "content", "category"],
          },
        },
      },
      required: ["goal"],
    },
    handler: async (args: {
      goal: string;
      research?: {
        target?: string;
        description?: string;
        webEnrich?: boolean;
        projectContext?: Record<string, unknown>;
        findings?: Array<{
          category: string;
          summary: string;
          sourceUrl?: string;
          relevance?: string;
          actionItems?: string;
        }>;
      };
      implementation?: {
        stopOnFailure?: boolean;
        commands?: ImplementationCommandInput[];
      };
      dogfood?: {
        loopType?: "weekly_reset" | "pre_delegation" | "company_search";
        scenarioId: string;
        prompt: string;
        toolName?: string;
        toolArgs?: Record<string, unknown>;
        output?: Record<string, unknown>;
        userRole?: "founder" | "banker" | "ceo" | "operator" | "researcher" | "student";
        packetVersionUsed?: string;
        packetType?: string;
        attachedInputs?: string[];
      };
      autoRecordLearning?: boolean;
      saveSessionNote?: boolean;
      learnings?: Array<{
        key: string;
        content: string;
        category: "edge_case" | "gotcha" | "pattern" | "regression" | "convention";
        tags?: string[];
      }>;
    }) => {
      ensureSchema();
      const runId = createRun(args.goal);
      const autoRecordLearning = args.autoRecordLearning !== false;
      const saveSessionNote = args.saveSessionNote !== false;
      const implementationCommands = args.implementation?.commands ?? [];
      const stopOnFailure = args.implementation?.stopOnFailure !== false;

      const researchTool = requireTool(reconTools, "run_recon");
      const logReconFindingTool = requireTool(reconTools, "log_recon_finding");
      const getReconSummaryTool = requireTool(reconTools, "get_recon_summary");
      const startVerificationCycleTool = requireTool(verificationTools, "start_verification_cycle");
      const logPhaseFindingsTool = requireTool(verificationTools, "log_phase_findings");
      const logGapTool = requireTool(verificationTools, "log_gap");
      const logTestResultTool = requireTool(verificationTools, "log_test_result");
      const runClosedLoopTool = requireTool(qualityGateTools, "run_closed_loop");
      const runMandatoryFlywheelTool = requireTool(flywheelTools, "run_mandatory_flywheel");
      const startDogfoodSessionTool = requireTool(dogfoodJudgeTools, "start_dogfood_session");
      const endDogfoodSessionTool = requireTool(dogfoodJudgeTools, "end_dogfood_session");
      const recordDogfoodTelemetryTool = requireTool(dogfoodJudgeTools, "record_dogfood_telemetry");
      const judgeSessionTool = requireTool(dogfoodJudgeTools, "judge_session");
      const judgeToolOutputTool = requireTool(llmJudgeLoopTools, "judge_tool_output");
      const recordLearningTool = requireTool(learningTools, "record_learning");
      const saveSessionNoteTool = requireTool(sessionMemoryTools, "save_session_note");

      let researchSummary: any = null;
      let plan: AutonomousPlan | null = null;
      let commandResults: ImplementationCommandResult[] = [];
      let dogfoodSummary: any = null;
      let judgeSummary: any = null;
      let verificationSummary: any = null;
      let learningSummary: any = null;
      let verificationCycleId: string | null = null;
      const recommendations: string[] = [];

      try {
        const researchStepId = startStage(runId, "research", "Starting recon and context gathering");
        try {
          if (args.research?.target) {
            const reconRun = (await researchTool.handler({
              target: args.research.target,
              description: args.research.description,
              projectContext: args.research.projectContext,
              webEnrich: args.research.webEnrich ?? false,
            })) as any;

            for (const finding of args.research.findings ?? []) {
              await logReconFindingTool.handler({
                sessionId: reconRun.sessionId,
                sourceUrl: finding.sourceUrl,
                category: finding.category,
                summary: finding.summary,
                relevance: finding.relevance,
                actionItems: finding.actionItems,
              });
            }

            researchSummary = await getReconSummaryTool.handler({
              sessionId: reconRun.sessionId,
              completeSession: true,
            });
            updateRun(runId, { research_summary: researchSummary });
            finishStage(researchStepId, "completed", `Research captured for ${args.research.target}.`, researchSummary);
          } else {
            finishStage(researchStepId, "skipped", "No research target provided.", null);
          }
        } catch (error: any) {
          finishStage(researchStepId, "failed", truncate(error?.message ?? "Research failed"), {
            error: error?.message ?? String(error),
          });
          throw error;
        }

        const planStepId = startStage(runId, "plan", "Building autonomous execution plan");
        plan = buildPlan({
          goal: args.goal,
          researchTarget: args.research?.target,
          researchSummary,
          implementationCommands,
          dogfood: args.dogfood
            ? {
                scenarioId: args.dogfood.scenarioId,
                prompt: args.dogfood.prompt,
                toolName: args.dogfood.toolName,
              }
            : null,
          saveSessionNote,
        });
        updateRun(runId, { plan_json: plan });
        finishStage(planStepId, "completed", "Execution plan generated.", plan);

        const implementStepId = startStage(runId, "implement", "Running implementation commands");
        try {
          if (implementationCommands.length > 0) {
            for (const command of implementationCommands) {
              const phase = normalizePhase(command);
              const result = safeExec(command.command, {
                cwd: command.cwd,
                timeout: command.timeoutMs,
              });
              commandResults.push({
                label: command.label,
                command: command.command,
                cwd: command.cwd ?? process.cwd(),
                phase,
                passed: result.exitCode === 0,
                exitCode: result.exitCode,
                timedOut: result.timedOut,
                durationMs: result.durationMs,
                stdout: truncate(result.stdout, 1200),
                stderr: truncate(result.stderr, 1200),
              });
              if (stopOnFailure && result.exitCode !== 0) break;
            }

            const failedCommands = commandResults.filter((entry) => !entry.passed);
            const implementationSummary = {
              commandCount: commandResults.length,
              failedCount: failedCommands.length,
              commands: commandResults,
            };
            updateRun(runId, { implementation_summary: implementationSummary });
            finishStage(
              implementStepId,
              failedCommands.length === 0 ? "completed" : "failed",
              failedCommands.length === 0
                ? `All ${commandResults.length} implementation commands passed.`
                : `${failedCommands.length} implementation command(s) failed.`,
              implementationSummary,
            );
            if (failedCommands.length > 0) {
              recommendations.push(`Fix failing command: ${failedCommands[0].label} (${failedCommands[0].command})`);
            }
          } else {
            finishStage(implementStepId, "skipped", "No implementation commands were supplied.", null);
          }
        } catch (error: any) {
          finishStage(implementStepId, "failed", truncate(error?.message ?? "Implementation failed"), {
            error: error?.message ?? String(error),
          });
          throw error;
        }

        const dogfoodStepId = startStage(runId, "dogfood", "Running dogfood scenario");
        let dogfoodSessionId: string | null = null;
        try {
          if (args.dogfood) {
            const dogfoodSession = (await startDogfoodSessionTool.handler({
              loopType: args.dogfood.loopType ?? "company_search",
              packetVersionUsed: args.dogfood.packetVersionUsed,
            })) as any;
            dogfoodSessionId = dogfoodSession.sessionId;

            const dogfoodOutput = args.dogfood.toolName
              ? await (await resolveToolByName(args.dogfood.toolName)).handler(args.dogfood.toolArgs ?? {})
              : args.dogfood.output ?? {
                  summary: "Dogfood stage was started without a toolName or output payload.",
                  goal: args.goal,
                };

            dogfoodSummary = {
              sessionId: dogfoodSessionId,
              scenarioId: args.dogfood.scenarioId,
              toolName: args.dogfood.toolName ?? "dogfood_output",
              output: dogfoodOutput,
            };
            updateRun(runId, { dogfood_summary: dogfoodSummary });

            await recordDogfoodTelemetryTool.handler({
              scenarioId: args.dogfood.scenarioId,
              userRole: args.dogfood.userRole ?? "founder",
              primaryPrompt: args.dogfood.prompt,
              packetType: args.dogfood.packetType,
              attachedInputs: args.dogfood.attachedInputs,
              toolsInvoked: args.dogfood.toolName ? [args.dogfood.toolName] : [],
              toolCallCount: args.dogfood.toolName ? 1 : 0,
              artifactsProduced: Object.keys(dogfoodOutput ?? {}),
              totalLatencyMs: 0,
            });

            finishStage(
              dogfoodStepId,
              "completed",
              `Dogfood scenario ${args.dogfood.scenarioId} completed.`,
              dogfoodSummary,
            );
          } else {
            finishStage(dogfoodStepId, "skipped", "No dogfood scenario was supplied.", null);
          }
        } catch (error: any) {
          finishStage(dogfoodStepId, "failed", truncate(error?.message ?? "Dogfood failed"), {
            error: error?.message ?? String(error),
          });
          if (dogfoodSessionId) {
            await endDogfoodSessionTool.handler({
              sessionId: dogfoodSessionId,
              notes: truncate(error?.message ?? "Dogfood failed"),
            });
          }
          throw error;
        }

        const judgeStepId = startStage(runId, "judge", "Judging dogfood output");
        try {
          if (args.dogfood && dogfoodSummary?.output) {
            judgeSummary = await judgeToolOutputTool.handler({
              scenarioId: args.dogfood.scenarioId,
              prompt: args.dogfood.prompt,
              toolName: dogfoodSummary.toolName,
              result: dogfoodSummary.output,
            });

            if (dogfoodSessionId) {
              await judgeSessionTool.handler({
                sessionId: dogfoodSessionId,
                ...deriveDogfoodJudgeScores(judgeSummary),
                notes: judgeSummary.criteria
                  ?.map((criterion: any) => `${criterion.pass ? "PASS" : "FAIL"} ${criterion.criterion}: ${criterion.reasoning}`)
                  .join("\n"),
                failureClasses: judgeSummary.criteria
                  ?.filter((criterion: any) => !criterion.pass)
                  .map((criterion: any) => criterion.criterion),
              });

              await endDogfoodSessionTool.handler({
                sessionId: dogfoodSessionId,
                notes: judgeSummary.verdict,
                timeToFirstUsefulOutput: 0,
                delegationSucceeded: judgeSummary.verdict === "PASS",
                packetExported: judgeSummary.verdict === "PASS",
              });
            }

            updateRun(runId, { judge_summary: judgeSummary });
            finishStage(
              judgeStepId,
              judgeSummary.verdict === "PASS" ? "completed" : "failed",
              judgeSummary.verdict === "PASS"
                ? `Judge passed with score ${judgeSummary.score}.`
                : `Judge failed with score ${judgeSummary.score}.`,
              judgeSummary,
            );
            if (judgeSummary.verdict !== "PASS") {
              recommendations.push(...(judgeSummary.fixSuggestions ?? []));
            }
          } else {
            finishStage(judgeStepId, "skipped", "No dogfood output was available to judge.", null);
          }
        } catch (error: any) {
          finishStage(judgeStepId, "failed", truncate(error?.message ?? "Judge failed"), {
            error: error?.message ?? String(error),
          });
          throw error;
        }

        const verifyStepId = startStage(runId, "verify", "Running verification cycle and mandatory flywheel");
        try {
          const verificationCycle = (await startVerificationCycleTool.handler({
            title: `Autonomous delivery: ${args.goal}`,
            description: plan?.deliveryNote,
          })) as any;
          verificationCycleId = verificationCycle.cycleId;

          await logPhaseFindingsTool.handler({
            cycleId: verificationCycleId,
            phaseNumber: 1,
            status: "passed",
            findings: {
              goal: args.goal,
              researchSummary: researchSummary ?? "No structured research was provided.",
            },
          });

          const phase2Gaps: Array<{
            severity: string;
            title: string;
            description: string;
            rootCause: string;
            fixStrategy: string;
          }> = [];

          for (const failedCommand of commandResults.filter((entry) => !entry.passed)) {
            phase2Gaps.push({
              severity:
                failedCommand.phase === "compile" ||
                failedCommand.phase === "lint" ||
                failedCommand.phase === "test"
                  ? "HIGH"
                  : "MEDIUM",
              title: `Command failed: ${failedCommand.label}`,
              description: failedCommand.stderr || failedCommand.stdout || "Command failed without output.",
              rootCause: `Autonomous implementation command exited with code ${failedCommand.exitCode}.`,
              fixStrategy: "Fix the command or underlying code, then rerun the autonomous loop.",
            });
          }

          for (const fixSuggestion of judgeSummary?.fixSuggestions ?? []) {
            phase2Gaps.push({
              severity: "MEDIUM",
              title: `Judge follow-up: ${truncate(String(fixSuggestion), 90)}`,
              description: String(fixSuggestion),
              rootCause: "The dogfood judge detected missing quality or structure in the output.",
              fixStrategy: "Apply the suggested fix, rerun dogfood, and re-judge the output.",
            });
          }

          for (const gap of phase2Gaps) {
            await logGapTool.handler({
              cycleId: verificationCycleId,
              severity: gap.severity,
              title: gap.title,
              description: gap.description,
              rootCause: gap.rootCause,
              fixStrategy: gap.fixStrategy,
            });
          }

          await logPhaseFindingsTool.handler({
            cycleId: verificationCycleId,
            phaseNumber: 2,
            status: "passed",
            findings: {
              gapCount: phase2Gaps.length,
              gaps: phase2Gaps,
            },
          });

          const implementationPassed = commandResults.every((entry) => entry.passed);
          await logPhaseFindingsTool.handler({
            cycleId: verificationCycleId,
            phaseNumber: 3,
            status: implementationPassed ? "passed" : "failed",
            findings: {
              commandCount: commandResults.length,
              failedCount: commandResults.filter((entry) => !entry.passed).length,
            },
          });

          const closedLoopSteps = mapImplementationToClosedLoopSteps(commandResults);
          for (const step of closedLoopSteps) {
            await logTestResultTool.handler({
              cycleId: verificationCycleId,
              layer:
                step.step === "compile" || step.step === "lint"
                  ? "static"
                  : step.step === "test"
                    ? "unit"
                    : "manual",
              label: step.step,
              passed: step.passed,
              output: step.output,
            });
          }

          const closedLoopResult = (await runClosedLoopTool.handler({
            cycleId: verificationCycleId,
            steps: closedLoopSteps,
          })) as any;

          const flywheelResult = (await runMandatoryFlywheelTool.handler({
            target: args.goal,
            cycleId: verificationCycleId,
            steps: deriveFlywheelSteps({
              commandResults,
              dogfoodCompleted: Boolean(args.dogfood && dogfoodSummary?.output),
              judgePassed: judgeSummary?.verdict === "PASS",
              researchCompleted: Boolean(researchSummary || args.research?.target),
              documentationPlanned: autoRecordLearning || saveSessionNote,
            }),
          })) as any;

          await logPhaseFindingsTool.handler({
            cycleId: verificationCycleId,
            phaseNumber: 4,
            status: closedLoopResult.allPassed ? "passed" : "failed",
            findings: closedLoopResult,
          });

          if (closedLoopResult.allPassed) {
            await logPhaseFindingsTool.handler({
              cycleId: verificationCycleId,
              phaseNumber: 5,
              status: flywheelResult.passed && judgeSummary?.verdict === "PASS" ? "passed" : "failed",
              findings: {
                flywheel: flywheelResult,
                judge: judgeSummary,
              },
            });
          }

          verificationSummary = {
            cycleId: verificationCycleId,
            closedLoop: closedLoopResult,
            flywheel: flywheelResult,
          };
          updateRun(runId, { verification_summary: verificationSummary });
          finishStage(
            verifyStepId,
            closedLoopResult.allPassed && flywheelResult.passed ? "completed" : "failed",
            closedLoopResult.allPassed && flywheelResult.passed
              ? "Verification cycle and flywheel passed."
              : "Verification cycle or flywheel failed.",
            verificationSummary,
          );
          if (!closedLoopResult.allPassed) recommendations.push(closedLoopResult.guidance);
          if (!flywheelResult.passed) recommendations.push(flywheelResult.guidance);
        } catch (error: any) {
          finishStage(verifyStepId, "failed", truncate(error?.message ?? "Verification failed"), {
            error: error?.message ?? String(error),
          });
          throw error;
        }

        const learnStepId = startStage(runId, "learn", "Persisting learning artifacts");
        const recordedLearnings: string[] = [];
        const persistedNotePaths: string[] = [];
        try {
          if (autoRecordLearning) {
            const autoKey = `autonomous-loop:${slugify(args.goal)}`;
            await recordLearningTool.handler({
              key: autoKey,
              category: judgeSummary?.verdict === "PASS" ? "pattern" : "regression",
              content: [
                `Goal: ${args.goal}`,
                `Run ID: ${runId}`,
                `Judge: ${judgeSummary?.verdict ?? "not_run"} ${judgeSummary?.score ?? ""}`.trim(),
                `Verification cycle: ${verificationCycleId ?? "not_started"}`,
                `Recommendations: ${(recommendations.length > 0 ? recommendations : ["none"]).join(" | ")}`,
              ].join("\n"),
              tags: ["autonomous-loop", "delivery"],
              sourceCycle: verificationCycleId ?? undefined,
            });
            recordedLearnings.push(autoKey);
          }

          for (const learning of args.learnings ?? []) {
            await recordLearningTool.handler({
              key: learning.key,
              content: learning.content,
              category: learning.category,
              tags: learning.tags,
              sourceCycle: verificationCycleId ?? undefined,
            });
            recordedLearnings.push(learning.key);
          }

          if (saveSessionNote) {
            const savedNote = (await saveSessionNoteTool.handler({
              title: `Autonomous delivery loop: ${args.goal}`,
              category: "progress",
              content: [
                `Run ID: ${runId}`,
                `Goal: ${args.goal}`,
                `Judge verdict: ${judgeSummary?.verdict ?? "not_run"} ${judgeSummary?.score ?? ""}`.trim(),
                `Verification cycle: ${verificationCycleId ?? "not_started"}`,
                `Top recommendations:`,
                ...(recommendations.length > 0 ? recommendations : ["- none"]),
              ].join("\n"),
              tags: ["autonomous-loop", "delivery"],
              citedFrom: args.goal,
            })) as any;
            if (savedNote?.filePath) persistedNotePaths.push(savedNote.filePath);
          }

          if (verificationCycleId && verificationSummary?.closedLoop?.allPassed && verificationSummary?.flywheel?.passed) {
            await logPhaseFindingsTool.handler({
              cycleId: verificationCycleId,
              phaseNumber: 6,
              status: "passed",
              findings: {
                recordedLearnings,
                persistedNotePaths,
              },
            });
          }

          learningSummary = { recordedLearnings, persistedNotePaths };
          updateRun(runId, { learning_summary: learningSummary });
          finishStage(learnStepId, "completed", "Learning artifacts persisted.", learningSummary);
        } catch (error: any) {
          finishStage(learnStepId, "failed", truncate(error?.message ?? "Learning persistence failed"), {
            error: error?.message ?? String(error),
          });
          throw error;
        }

        const finalStatus =
          verificationSummary?.closedLoop?.allPassed &&
          verificationSummary?.flywheel?.passed &&
          judgeSummary?.verdict === "PASS"
            ? "completed"
            : judgeSummary?.verdict === "PASS" && commandResults.every((entry) => entry.passed)
              ? "needs_attention"
              : "failed";
        const summary =
          finalStatus === "completed"
            ? `Autonomous delivery loop completed for "${args.goal}".`
            : `Autonomous delivery loop finished with status "${finalStatus}" for "${args.goal}".`;
        completeRun(runId, finalStatus, summary);

        return {
          runId,
          status: finalStatus,
          summary,
          researchSummary,
          plan,
          implementation: {
            commandCount: commandResults.length,
            failedCount: commandResults.filter((entry) => !entry.passed).length,
            commands: commandResults,
          },
          dogfood: dogfoodSummary,
          judge: judgeSummary,
          verification: verificationSummary,
          learning: learningSummary,
          recommendations,
        };
      } catch (error: any) {
        const summary = `Autonomous delivery loop failed for "${args.goal}": ${error?.message ?? String(error)}`;
        completeRun(runId, "failed", summary);
        return {
          runId,
          status: "failed",
          summary,
          recommendations,
        };
      }
    },
  },
  {
    name: "get_self_directed_delivery_run",
    description:
      "Load a previously recorded autonomous delivery run with all stage receipts, summaries, and final recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        runId: {
          type: "string",
          description: "Autonomous delivery run ID.",
        },
      },
      required: ["runId"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { runId: string }) => {
      ensureSchema();
      const db = getDb();
      const run = db.prepare(`SELECT * FROM autonomous_delivery_runs WHERE run_id = ?`).get(args.runId) as any;
      if (!run) {
        return {
          error: true,
          message: `Autonomous delivery run not found: ${args.runId}`,
        };
      }

      const steps = db
        .prepare(`
          SELECT * FROM autonomous_delivery_steps
          WHERE run_id = ?
          ORDER BY started_at ASC
        `)
        .all(args.runId) as any[];

      const parse = (value: string | null) => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      };

      return {
        runId: run.run_id,
        goal: run.goal,
        status: run.status,
        summary: run.summary,
        createdAt: run.created_at,
        completedAt: run.completed_at,
        researchSummary: parse(run.research_summary),
        plan: parse(run.plan_json),
        implementationSummary: parse(run.implementation_summary),
        dogfoodSummary: parse(run.dogfood_summary),
        judgeSummary: parse(run.judge_summary),
        verificationSummary: parse(run.verification_summary),
        learningSummary: parse(run.learning_summary),
        steps: steps.map((step) => ({
          stepId: step.step_id,
          stage: step.stage,
          status: step.status,
          summary: step.summary,
          startedAt: step.started_at,
          completedAt: step.completed_at,
          details: parse(step.details_json),
        })),
      };
    },
  },
  {
    name: "list_self_directed_delivery_runs",
    description:
      "List recent autonomous delivery runs so operators can reopen or compare them.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of runs to return. Default: 20.",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { limit?: number }) => {
      ensureSchema();
      const db = getDb();
      const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 20)));
      const runs = db
        .prepare(`
          SELECT run_id, goal, status, summary, created_at, completed_at
          FROM autonomous_delivery_runs
          ORDER BY created_at DESC
          LIMIT ?
        `)
        .all(limit) as any[];

      return {
        count: runs.length,
        runs: runs.map((run) => ({
          runId: run.run_id,
          goal: run.goal,
          status: run.status,
          summary: run.summary,
          createdAt: run.created_at,
          completedAt: run.completed_at,
        })),
      };
    },
  },
];
