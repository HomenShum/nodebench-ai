/**
 * Agent Invoker — Bridges the eval harness to real LLM agent execution.
 *
 * Supports multiple invocation backends:
 * - "stub": Returns empty scorecard (for CI gate / smoke tests)
 * - "anthropic": Uses Anthropic Messages API with tool_use for MCP modes
 * - "openai": Uses OpenAI Chat Completions with function calling
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY — required for anthropic backend
 *   OPENAI_API_KEY   — required for openai backend
 *   EVAL_BACKEND     — "stub" | "anthropic" | "openai" (default: "stub")
 *   EVAL_MODEL       — model override (default: per-backend)
 */

import type { RunConfig, RunTelemetry, Scorecard, ToolCallRecord, EvalTask } from "./types.js";

export type InvokerBackend = "stub" | "anthropic" | "openai";

interface InvokerOptions {
  backend: InvokerBackend;
  apiKey?: string;
  model?: string;
  verbose?: boolean;
}

function getDefaultModel(backend: InvokerBackend): string {
  switch (backend) {
    case "anthropic": return "claude-sonnet-4-20250514";
    case "openai": return "gpt-4o";
    case "stub": return "stub-model";
  }
}

function detectBackend(): InvokerOptions {
  const backend = (process.env.EVAL_BACKEND || "stub") as InvokerBackend;
  const apiKey = backend === "anthropic"
    ? process.env.ANTHROPIC_API_KEY
    : backend === "openai"
    ? process.env.OPENAI_API_KEY
    : undefined;

  return {
    backend,
    apiKey,
    model: process.env.EVAL_MODEL || getDefaultModel(backend),
    verbose: process.env.EVAL_VERBOSE === "true",
  };
}

// ── Stub Backend ────────────────────────────────────────────────────

function createStubScorecard(): Scorecard {
  return {
    correctness: { taskSuccessRate: 0, regressionRate: 0 },
    safety: { highRiskActionsGated: 1, issuesCaughtPreMerge: 0 },
    efficiency: { wallClockMs: 0, toolCallCount: 0, tokenCount: 0, retryThrashRate: 0 },
    compounding: { knowledgeReuseRate: 0, evalCasesBanked: 0 },
  };
}

async function invokeStub(config: RunConfig, _task: EvalTask): Promise<RunTelemetry> {
  const now = new Date().toISOString();
  return {
    runId: `stub_${config.taskId}_${config.agentMode}_s${config.seed}_${Date.now()}`,
    config,
    startedAt: now,
    completedAt: now,
    scorecard: createStubScorecard(),
    toolCalls: [],
    verificationCycles: [],
    outputHash: "stub",
    error: "STUB: No real agent invocation — set EVAL_BACKEND=anthropic|openai",
  };
}

// ── Anthropic Backend (scaffold) ────────────────────────────────────

async function invokeAnthropic(
  config: RunConfig,
  task: EvalTask,
  options: InvokerOptions
): Promise<RunTelemetry> {
  if (!options.apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for anthropic backend");
  }

  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const toolCalls: ToolCallRecord[] = [];

  // Build system prompt based on agent mode
  const systemPrompt = buildSystemPrompt(config, task);

  // Build tool definitions for MCP modes
  const tools = config.agentMode !== "bare" ? buildMcpToolDefs(config) : [];

  // TODO: Replace with real Anthropic API call
  // const response = await fetch("https://api.anthropic.com/v1/messages", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     "x-api-key": options.apiKey,
  //     "anthropic-version": "2023-06-01",
  //   },
  //   body: JSON.stringify({
  //     model: options.model,
  //     max_tokens: 8192,
  //     system: systemPrompt,
  //     messages: [{ role: "user", content: task.description }],
  //     tools: tools.length > 0 ? tools : undefined,
  //   }),
  // });

  const wallClockMs = Date.now() - startMs;
  const completedAt = new Date().toISOString();

  // Score based on acceptance criteria
  const scorecard: Scorecard = {
    correctness: { taskSuccessRate: 0, regressionRate: 0 },
    safety: {
      highRiskActionsGated: task.riskTier === "low" ? 1 : 0,
      issuesCaughtPreMerge: 0,
    },
    efficiency: {
      wallClockMs,
      toolCallCount: toolCalls.length,
      tokenCount: 0,
      retryThrashRate: 0,
    },
    compounding: {
      knowledgeReuseRate: toolCalls.some(t => t.toolName.includes("search_gotchas")) ? 1 : 0,
      evalCasesBanked: 0,
    },
  };

  return {
    runId: `anthropic_${config.taskId}_${config.agentMode}_s${config.seed}_${Date.now()}`,
    config,
    startedAt,
    completedAt,
    scorecard,
    toolCalls,
    verificationCycles: [],
    outputHash: "",
    error: "SCAFFOLD: Anthropic API call not yet wired — implement real invocation",
  };
}

// ── OpenAI Backend (scaffold) ───────────────────────────────────────

async function invokeOpenAI(
  config: RunConfig,
  task: EvalTask,
  options: InvokerOptions
): Promise<RunTelemetry> {
  if (!options.apiKey) {
    throw new Error("OPENAI_API_KEY is required for openai backend");
  }

  // Similar scaffold as Anthropic
  const startedAt = new Date().toISOString();
  const wallClockMs = 0;

  return {
    runId: `openai_${config.taskId}_${config.agentMode}_s${config.seed}_${Date.now()}`,
    config,
    startedAt,
    completedAt: new Date().toISOString(),
    scorecard: createStubScorecard(),
    toolCalls: [],
    verificationCycles: [],
    outputHash: "",
    error: "SCAFFOLD: OpenAI API call not yet wired — implement real invocation",
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

function buildSystemPrompt(config: RunConfig, task: EvalTask): string {
  const base = `You are a Convex development agent. Your task: ${task.description}`;

  if (config.agentMode === "bare") {
    return `${base}\n\nYou have no MCP tools available. Use your knowledge of Convex to complete the task.`;
  }

  const toolsetDesc = config.agentMode === "mcp_lite"
    ? "You have basic Convex MCP tools: schema audit, function audit."
    : config.agentMode === "mcp_core"
    ? "You have core Convex MCP tools: schema, function, deployment, and learning tools."
    : "You have the full Convex MCP toolset: schema, function, deployment, learning, methodology, integration, cron, and component tools.";

  return `${base}\n\n${toolsetDesc}\n\nMethodology: Search gotchas before implementing. Record new gotchas after discovering edge cases.`;
}

function buildMcpToolDefs(config: RunConfig): Array<{ name: string; description: string }> {
  const lite = [
    { name: "convex_audit_schema", description: "Audit schema.ts for anti-patterns" },
    { name: "convex_audit_functions", description: "Audit function registration" },
  ];

  const core = [
    ...lite,
    { name: "convex_suggest_indexes", description: "Suggest missing indexes" },
    { name: "convex_check_validator_coverage", description: "Check validator coverage" },
    { name: "convex_check_function_refs", description: "Check function references" },
    { name: "convex_pre_deploy_gate", description: "Pre-deploy quality gate" },
    { name: "convex_check_env_vars", description: "Check environment variables" },
    { name: "convex_record_gotcha", description: "Record a gotcha" },
    { name: "convex_search_gotchas", description: "Search gotchas" },
  ];

  const full = [
    ...core,
    { name: "convex_get_methodology", description: "Get methodology guide" },
    { name: "convex_discover_tools", description: "Discover available tools" },
    { name: "convex_generate_rules_md", description: "Generate rules markdown" },
    { name: "convex_snapshot_schema", description: "Snapshot schema for diffing" },
    { name: "convex_bootstrap_project", description: "Bootstrap project health check" },
    { name: "convex_check_crons", description: "Validate cron definitions" },
    { name: "convex_analyze_components", description: "Analyze Convex components" },
  ];

  switch (config.agentMode) {
    case "mcp_lite": return lite;
    case "mcp_core": return core;
    case "mcp_full": return full;
    default: return [];
  }
}

// ── Public API ──────────────────────────────────────────────────────

export async function invokeAgent(
  config: RunConfig,
  task: EvalTask,
  options?: Partial<InvokerOptions>
): Promise<RunTelemetry> {
  const opts = { ...detectBackend(), ...options };

  switch (opts.backend) {
    case "anthropic":
      return invokeAnthropic(config, task, opts);
    case "openai":
      return invokeOpenAI(config, task, opts);
    case "stub":
    default:
      return invokeStub(config, task);
  }
}

export { detectBackend, buildSystemPrompt, buildMcpToolDefs };
