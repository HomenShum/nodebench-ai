#!/usr/bin/env node
/**
 * NodeBench MCP — Development Methodology Edition
 *
 * Zero-config, fully local MCP server backed by SQLite.
 * Packages the 6-Phase Verification, Eval-Driven Development, AI Flywheel,
 * Quality Gates, and Learnings methodologies as MCP tools that guide agents
 * to work more rigorously.
 *
 * Data stored in ~/.nodebench/nodebench.db
 *
 * Uses the low-level Server class to register tools with raw JSON Schema
 * (the high-level McpServer.tool() requires Zod schemas in SDK >=1.17).
 *
 * Usage:
 *   npx @nodebench/mcp          (stdio transport)
 *   npx tsx src/index.ts         (dev mode)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getDb, genId } from "./db.js";
import { verificationTools } from "./tools/verificationTools.js";
import { evalTools } from "./tools/evalTools.js";
import { qualityGateTools } from "./tools/qualityGateTools.js";
import { learningTools } from "./tools/learningTools.js";
import { flywheelTools } from "./tools/flywheelTools.js";
import { reconTools } from "./tools/reconTools.js";
import { uiCaptureTools } from "./tools/uiCaptureTools.js";
import { visionTools } from "./tools/visionTools.js";
import { webTools } from "./tools/webTools.js";
import { githubTools } from "./tools/githubTools.js";
import { documentationTools } from "./tools/documentationTools.js";
import { agentBootstrapTools } from "./tools/agentBootstrapTools.js";
import { selfEvalTools } from "./tools/selfEvalTools.js";
import { parallelAgentTools } from "./tools/parallelAgentTools.js";
import { llmTools } from "./tools/llmTools.js";
import { securityTools } from "./tools/securityTools.js";
import { platformTools } from "./tools/platformTools.js";
import { createMetaTools } from "./tools/metaTools.js";
import { localFileTools } from "./tools/localFileTools.js";
import type { McpTool } from "./types.js";

// ── CLI argument parsing ──────────────────────────────────────────────
const cliArgs = process.argv.slice(2);

const TOOLSET_MAP: Record<string, McpTool[]> = {
  verification: verificationTools,
  eval: evalTools,
  quality_gate: qualityGateTools,
  learning: learningTools,
  flywheel: flywheelTools,
  recon: reconTools,
  ui_capture: uiCaptureTools,
  vision: visionTools,
  local_file: localFileTools,
  web: webTools,
  github: githubTools,
  docs: documentationTools,
  bootstrap: agentBootstrapTools,
  self_eval: selfEvalTools,
  parallel: parallelAgentTools,
  llm: llmTools,
  security: securityTools,
  platform: platformTools,
};

const PRESETS: Record<string, string[]> = {
  core: ["verification", "eval", "quality_gate", "learning", "flywheel", "recon", "bootstrap", "self_eval", "llm", "security", "platform"],
  lite: ["verification", "eval", "quality_gate", "learning", "recon", "security"],
  full: Object.keys(TOOLSET_MAP),
};

function parseToolsets(): McpTool[] {
  if (cliArgs.includes("--help")) {
    const lines = [
      "nodebench-mcp v2.5.0 — Development Methodology MCP Server",
      "",
      "Usage: nodebench-mcp [options]",
      "",
      "Options:",
      "  --toolsets <list>   Comma-separated toolsets to enable (default: all)",
      "  --exclude <list>    Comma-separated toolsets to exclude",
      "  --preset <name>     Use a preset: core, lite, or full",
      "  --help              Show this help and exit",
      "",
      "Available toolsets:",
      ...Object.entries(TOOLSET_MAP).map(([k, v]) => `  ${k.padEnd(16)} ${v.length} tools`),
      "",
      "Presets:",
      ...Object.entries(PRESETS).map(([k, v]) => `  ${k.padEnd(16)} ${v.join(", ")}`),
      "",
      "Examples:",
      "  npx nodebench-mcp --preset core",
      "  npx nodebench-mcp --toolsets verification,eval,recon",
      "  npx nodebench-mcp --exclude vision,ui_capture,parallel",
      "",
      "Pro tip: Use findTools and getMethodology at runtime for dynamic tool discovery.",
      "See: https://www.anthropic.com/engineering/code-execution-with-mcp",
    ];
    console.error(lines.join("\n"));
    process.exit(0);
  }

  const presetIdx = cliArgs.indexOf("--preset");
  if (presetIdx !== -1 && cliArgs[presetIdx + 1]) {
    const presetName = cliArgs[presetIdx + 1];
    const presetKeys = PRESETS[presetName];
    if (!presetKeys) {
      console.error(`Unknown preset: ${presetName}. Available: ${Object.keys(PRESETS).join(", ")}`);
      process.exit(1);
    }
    return presetKeys.flatMap((k) => TOOLSET_MAP[k] ?? []);
  }

  const tsIdx = cliArgs.indexOf("--toolsets");
  if (tsIdx !== -1 && cliArgs[tsIdx + 1]) {
    const requested = cliArgs[tsIdx + 1].split(",").map((s) => s.trim());
    const invalid = requested.filter((k) => !TOOLSET_MAP[k]);
    if (invalid.length) {
      console.error(`Unknown toolsets: ${invalid.join(", ")}. Available: ${Object.keys(TOOLSET_MAP).join(", ")}`);
      process.exit(1);
    }
    return requested.flatMap((k) => TOOLSET_MAP[k]);
  }

  const exIdx = cliArgs.indexOf("--exclude");
  if (exIdx !== -1 && cliArgs[exIdx + 1]) {
    const excluded = new Set(cliArgs[exIdx + 1].split(",").map((s) => s.trim()));
    const invalid = [...excluded].filter((k) => !TOOLSET_MAP[k]);
    if (invalid.length) {
      console.error(`Unknown toolsets: ${invalid.join(", ")}. Available: ${Object.keys(TOOLSET_MAP).join(", ")}`);
      process.exit(1);
    }
    return Object.entries(TOOLSET_MAP)
      .filter(([k]) => !excluded.has(k))
      .flatMap(([, v]) => v);
  }

  return Object.values(TOOLSET_MAP).flat();
}

// Initialize DB (creates ~/.nodebench/ and schema on first run)
getDb();

// Assemble tools (filtered by --toolsets / --exclude / --preset if provided)
const domainTools: McpTool[] = parseToolsets();
const allTools = [...domainTools, ...createMetaTools(domainTools)];

// Build a lookup map for fast tool dispatch
const toolMap = new Map<string, McpTool>();
for (const tool of allTools) {
  toolMap.set(tool.name, tool);
}

// Auto-instrumentation: generate a session ID per MCP connection
const SESSION_ID = genId("mcp");

// Tools to skip auto-logging (avoid infinite recursion and noise)
const SKIP_AUTO_LOG = new Set(["log_tool_call", "get_trajectory_analysis", "get_self_eval_report", "get_improvement_recommendations", "cleanup_stale_runs", "synthesize_recon_to_learnings"]);

// MCP Prompts — protocol-native agent instructions for onboarding
const PROMPTS = [
  {
    name: "onboarding",
    description:
      "Get started with NodeBench Development Methodology MCP. Shows first-time setup steps and key tools.",
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `You are connected to NodeBench MCP — tools that make you catch the bugs you'd normally ship.

WHAT THIS DOES:
In benchmarks across 9 real production prompts, agents with NodeBench MCP caught 13 issues (4 HIGH severity)
that bare agents shipped to production. 26 blind spots prevented. Knowledge compounds — by task 9,
the agent finds 2+ prior findings before writing a single line of code.

HOW IT WORKS:
Every task follows a pipeline: Research → Risk → Implement → Test (3 layers) → Eval → Gate → Learn → Ship.
Each step produces a concrete artifact (an issue found, a regression guarded, a pattern banked) that
compounds into future tasks.

FIRST TIME? Run these 3 steps:
1. Call bootstrap_project to register your project (tech stack, architecture, conventions)
2. Call getMethodology("overview") to see all available methodologies
3. Call search_all_knowledge("your current task") before starting any work

RETURNING? Your project context and all past learnings are persisted. Start with:
1. Call search_all_knowledge with your current task
2. Follow the methodology tools as you work — they'll guide you step by step

KEY TOOLS:
- search_all_knowledge — Search prior findings before starting (avoid repeating past mistakes)
- run_mandatory_flywheel — 6-step minimum verification before declaring work done
- getMethodology — Step-by-step guides for verification, eval, flywheel, recon
- findTools — Discover tools by keyword or category
- assess_risk — Assess risk before acting (HIGH = needs confirmation)

PARALLEL AGENTS? If using Claude Code subagents or multiple terminals:
- claim_agent_task / release_agent_task — Lock tasks to prevent duplicate work
- get_parallel_status — See what all agents are doing
- Use the "claude-code-parallel" prompt for step-by-step guidance`,
        },
      },
    ],
  },
  {
    name: "project-setup",
    description:
      "Guided project bootstrapping. Walks you through registering project context so the MCP has full project awareness.",
    arguments: [
      {
        name: "projectName",
        description: "Name of the project to set up",
        required: true,
      },
    ],
    messages: (args: Record<string, string>) => [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Help me set up NodeBench methodology tracking for project: ${args.projectName}

Please gather and record the following using the bootstrap_project tool:
1. Tech stack (languages, frameworks, runtimes)
2. Key dependency versions
3. Architecture overview
4. Build/test commands
5. Known conventions or patterns
6. Repository structure highlights

After bootstrapping, run a reconnaissance session with run_recon to check for latest updates on the project's key frameworks and SDKs.`,
        },
      },
    ],
  },
  {
    name: "ui-qa-checklist",
    description:
      "UI/UX QA checklist for frontend implementations. Run after any change that touches React components, layouts, or interactions. Guides the agent through component tests, accessibility, responsive checks, and E2E validation.",
    arguments: [
      {
        name: "componentName",
        description:
          "The component or feature that changed (e.g. 'AgentStatusCard', 'Settings page dark mode')",
        required: true,
      },
    ],
    messages: (args: Record<string, string>) => [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `You just implemented UI changes to: ${args.componentName}

Before declaring this work done, run the UI/UX QA checklist:

1. COMPONENT TESTS: Run \`npm run test:run\` — all component tests must pass
2. STORYBOOK: Run \`npm run storybook\` — verify the component renders in isolation
3. RESPONSIVE: Check at 375px, 768px, 1280px — layout must not break
4. ACCESSIBILITY: Tab through the UI, check aria-labels, run Storybook a11y panel
5. STATES: Verify loading, error, and empty states are handled
6. CONSOLE: Check browser devtools for errors/warnings
7. CAPTURE: Call capture_responsive_suite(url, label) to screenshot at 3 breakpoints
8. E2E: Run \`npm run test:e2e\` if relevant tests exist
9. LIGHTHOUSE: Run \`npm run perf:lighthouse\` for performance + accessibility scores

After checking each item, record results:
  call get_gate_preset("ui_ux_qa") to see the 8 evaluation rules
  evaluate each rule against ${args.componentName}
  call run_quality_gate(gateName: "ui_ux_qa", rules: [{name, passed}, ...]) with your boolean results
  call record_learning for any UI gotchas discovered

For the full step-by-step methodology, call getMethodology("ui_ux_qa").

Commands available:
  npm run test:run        — Vitest component tests
  npm run test:e2e        — Playwright E2E tests
  npm run storybook       — Storybook dev server (port 6006)
  npm run perf:lighthouse — Lighthouse audit
  npm run perf:bundle     — Bundle size analysis`,
        },
      },
    ],
  },
  {
    name: "parallel-agent-team",
    description:
      "Set up and coordinate a parallel agent team. Based on Anthropic's 'Building a C Compiler with Parallel Claudes' (Feb 2026). Guides multi-agent orchestration with task locking, role assignment, and progress tracking.",
    arguments: [
      {
        name: "projectGoal",
        description:
          "The overall project goal the team is working toward (e.g. 'Build REST API', 'Migrate auth system')",
        required: true,
      },
      {
        name: "agentCount",
        description:
          "Number of parallel agents (default: 4)",
        required: false,
      },
    ],
    messages: (args: Record<string, string>) => {
      const agentCount = parseInt(args.agentCount || "4", 10);
      return [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `You are coordinating a parallel agent team for: ${args.projectGoal}

This follows the pattern from Anthropic's "Building a C Compiler with Parallel Claudes" (Feb 2026).
Reference: https://www.anthropic.com/engineering/building-c-compiler

SETUP (run these in order):

1. ORIENT — Check what's already happening:
   call get_parallel_status({ includeHistory: true })
   call list_agent_tasks({ status: "all" })

2. PLAN ROLES — Assign ${agentCount} specialized agents:
   Recommended role split for ${agentCount} agents:
   ${agentCount >= 4 ? `- Agent 1: assign_agent_role({ role: "implementer", focusArea: "core features" })
   - Agent 2: assign_agent_role({ role: "test_writer", focusArea: "test coverage" })
   - Agent 3: assign_agent_role({ role: "code_quality_critic", focusArea: "refactoring" })
   - Agent 4: assign_agent_role({ role: "documentation_maintainer", focusArea: "docs and progress" })` :
   `- Agent 1: assign_agent_role({ role: "implementer" })
   - Agent 2: assign_agent_role({ role: "test_writer" })`}

3. BREAK DOWN WORK — Create task claims:
   For each independent piece of work:
   call claim_agent_task({ taskKey: "descriptive_snake_case", description: "What to do" })

4. WORK LOOP (each agent independently):
   a. claim_agent_task — Lock your task
   b. Do the work (implement, test, review)
   c. log_context_budget — Track context usage, avoid pollution
   d. run_oracle_comparison — Validate output against known-good reference
   e. release_agent_task — Release with progress note
   f. Pick next task (repeat)

5. ANTI-PATTERNS TO AVOID:
   - Two agents working on the same task (always claim first)
   - Dumping thousands of lines of test output (log to file, print summary)
   - Spending hours on one stuck problem (mark as blocked, move on)
   - Overwriting each other's changes (commit frequently, pull before push)

KEY INSIGHT from Anthropic: When all agents get stuck on the same bug (like compiling the Linux kernel),
use oracle-based testing to split the problem into independent sub-problems that each agent can solve in parallel.

For the full methodology: call getMethodology("parallel_agent_teams")`,
          },
        },
      ];
    },
  },
  {
    name: "oracle-test-harness",
    description:
      "Set up oracle-based testing for a component. Compares your implementation's output against a known-good reference to identify exactly which parts are broken. Enables parallel debugging by splitting failures into independent work items.",
    arguments: [
      {
        name: "componentName",
        description:
          "The component to validate (e.g. 'API response formatter', 'auth middleware', 'data pipeline')",
        required: true,
      },
      {
        name: "oracleSource",
        description:
          "Where the known-good reference comes from (e.g. 'production_v2', 'reference_impl', 'golden_files')",
        required: true,
      },
    ],
    messages: (args: Record<string, string>) => [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Set up oracle-based testing for: ${args.componentName}
Oracle source: ${args.oracleSource}

This follows the pattern from Anthropic's C Compiler project where GCC served as a
"known-good compiler oracle" to identify which specific files were broken.

SETUP:

1. DEFINE ORACLE — Capture known-good reference outputs:
   Run the reference implementation (${args.oracleSource}) on each test input.
   Save outputs as golden files or capture them in the oracle comparison tool.

2. RUN COMPARISONS — For each test case:
   call run_oracle_comparison({
     testLabel: "${args.componentName}_test_1",
     actualOutput: "<your implementation's output>",
     expectedOutput: "<oracle's output>",
     oracleSource: "${args.oracleSource}"
   })

3. TRIAGE FAILURES — Review diff summaries:
   Each failing comparison is an independent work item.
   Assign each to a different parallel agent via claim_agent_task.

4. BINARY SEARCH (for complex failures):
   If a test passes individually but fails when combined with others,
   use delta debugging: split the test set in half, test each half,
   narrow down to the minimal failing combination.
   (This is how Anthropic found pairs of files that failed together but worked independently.)

5. TRACK PROGRESS — Monitor convergence:
   call get_parallel_status to see how many oracle tests are still failing.
   As agents fix failures, the match percentage should trend toward 100%.

CONTEXT BUDGET TIP: Large test outputs pollute context. Instead of printing full output,
call log_context_budget to track usage and only show diff summaries (first 20 differing lines).

After all oracle tests pass:
  call record_learning with patterns discovered
  call run_mandatory_flywheel to verify the full change`,
        },
      },
    ],
  },
  {
    name: "claude-code-parallel",
    description:
      "Guide for using NodeBench MCP with Claude Code's native Task tool to run parallel subagents. Each subagent gets its own context window and can coordinate via shared NodeBench MCP tools (claim_agent_task, assign_agent_role, run_oracle_comparison). Use this when you want multiple Claude Code subagents working on independent tasks without duplicate effort.",
    arguments: [
      {
        name: "taskDescription",
        description:
          "The overall task to split across parallel subagents (e.g. 'Fix auth, add tests, update docs')",
        required: true,
      },
      {
        name: "subagentCount",
        description:
          "Number of parallel subagents to coordinate (default: 3)",
        required: false,
      },
    ],
    messages: (args: Record<string, string>) => {
      const count = parseInt(args.subagentCount || "3", 10);
      return [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `You are coordinating ${count} parallel Claude Code subagents for: ${args.taskDescription}

## How This Works

Claude Code's Task tool spawns subagents — each is an independent Claude instance with its own
context window. NodeBench MCP tools coordinate them via a shared SQLite database.

**Your role: COORDINATOR.** You break work into independent tasks and spawn subagents.
**Subagent role: WORKER.** Each claims a task, does work, releases with a progress note.

## Step-by-Step

### 1. PLAN — Break work into ${count} independent tasks
Identify ${count} pieces of work that can run in parallel without dependencies.
Each task should be independently completable and testable.

### 2. SPAWN — Launch subagents with coordination instructions
For each task, use the Task tool:

\`\`\`
Task tool call:
  prompt: "You have access to NodeBench MCP. Do the following:
    1. Call claim_agent_task({ taskKey: '<task_key>', description: '<what to do>' })
    2. Call assign_agent_role({ role: 'implementer', focusArea: '<area>' })
    3. Do the work
    4. Call log_context_budget({ eventType: 'checkpoint', tokensUsed: <estimate> })
    5. Call release_agent_task({ taskKey: '<task_key>', status: 'completed', progressNote: '<summary>' })
    6. Call record_learning({ key: '<key>', content: '<what you learned>', category: 'pattern' })"
\`\`\`

### 3. MONITOR — Check progress
After spawning all subagents:
  call get_parallel_status({ includeHistory: true })
  call list_agent_tasks({ status: "all" })

### 4. VALIDATE — Run oracle comparisons if applicable
If subagents produced outputs that should match a reference:
  call run_oracle_comparison for each output

### 5. GATE — Quality check the aggregate result
  call run_quality_gate with rules covering all ${count} tasks
  call run_mandatory_flywheel to verify the combined change

## Concrete IMPACT of This Workflow

| What NodeBench Adds             | Without It (bare subagents)           |
|---------------------------------|---------------------------------------|
| Task locks prevent duplicate work | Two subagents might fix the same bug |
| Role specialization             | All subagents do everything           |
| Context budget tracking         | Subagent runs out of context silently |
| Oracle comparisons              | No reference-based validation         |
| Progress notes for handoff      | Next session starts from scratch      |
| Learnings persisted             | Knowledge lost when subagent exits    |
| Quality gate on aggregate       | No validation that pieces fit together |

## Anti-Patterns
- DO NOT spawn subagents for work that has dependencies (sequential steps)
- DO NOT skip claim_agent_task — without it, two subagents may duplicate effort
- DO NOT dump large outputs into subagent context — use log_context_budget to track
- DO NOT forget release_agent_task — orphaned claims block future sessions

For the full parallel agent methodology: call getMethodology("parallel_agent_teams")`,
          },
        },
      ];
    },
  },
  {
    name: "bootstrap-parallel-agents",
    description:
      "Detect and scaffold parallel agent infrastructure for any project. Scans a target repo for 7 categories of parallel agent capabilities (task locking, roles, oracle testing, context budget, progress files, AGENTS.md, worktrees) and bootstraps what's missing. Uses the AI Flywheel closed loop: detect → scaffold → verify → fix → document.",
    arguments: [
      {
        name: "projectPath",
        description:
          "Absolute path to the target project root (e.g. '/home/user/their-project')",
        required: true,
      },
      {
        name: "techStack",
        description:
          "Target project's tech stack (e.g. 'TypeScript/React', 'Python/Django', 'Rust')",
        required: false,
      },
    ],
    messages: (args: Record<string, string>) => [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Bootstrap parallel agent infrastructure for: ${args.projectPath}
${args.techStack ? `Tech stack: ${args.techStack}` : ""}

This follows the AI Flywheel closed loop: detect → scaffold → verify → fix → document.

STEP 1 — DETECT (dry run first):
  call bootstrap_parallel_agents({
    projectRoot: "${args.projectPath}",
    dryRun: true,
    ${args.techStack ? `techStack: "${args.techStack}",` : ""}
    includeAgentsMd: true
  })

  Review the gap report. It scans 7 categories:
  - Task coordination (lock files, claim directories)
  - Role specialization (role configs, AGENTS.md mentions)
  - Oracle testing (golden files, reference outputs, snapshots)
  - Context budget tracking (budget configs, AGENTS.md mentions)
  - Progress files (PROGRESS.md, STATUS.md, claude-progress.txt)
  - AGENTS.md parallel section (parallel agent coordination protocol)
  - Git worktrees (for true parallel work)

STEP 2 — SCAFFOLD (create files):
  If gaps found, run with dryRun=false:
  call bootstrap_parallel_agents({
    projectRoot: "${args.projectPath}",
    dryRun: false,
    ${args.techStack ? `techStack: "${args.techStack}",` : ""}
    includeAgentsMd: true
  })

  This creates:
  - .parallel-agents/ directory with README, current_tasks/, oracle/, roles.json
  - progress.md template for agent orientation
  - AGENTS.md parallel section (or .parallel-append file for existing AGENTS.md)

STEP 3 — GENERATE AGENTS.MD (if needed):
  call generate_parallel_agents_md({
    ${args.techStack ? `techStack: "${args.techStack}",` : ""}
    projectName: "${args.projectPath.split("/").pop() || "project"}",
    maxAgents: 4,
    includeNodebenchSetup: true
  })

  Copy the output into the target repo's AGENTS.md.

STEP 4 — VERIFY (6-step flywheel):
  The bootstrap tool returns a flywheelPlan. Execute each step:
  1. Static analysis — verify scaffold files don't conflict
  2. Happy path — claim task → work → release → progress.md updated
  3. Conflict test — two claims on same task → second gets conflict
  4. Oracle test — create golden file → diff catches changes
  5. Gap re-scan — re-run bootstrap with dryRun=true → all gaps filled
  6. Document — record_learning with patterns discovered

STEP 5 — FIX (if anything fails):
  Fix the issue, then re-run from Step 4.

STEP 6 — DOCUMENT:
  call record_learning({
    key: "bootstrap_parallel_${args.projectPath.split("/").pop() || "project"}",
    content: "Bootstrapped parallel agent infrastructure for ${args.projectPath}. <summary of what was created and any issues found>",
    category: "pattern",
    tags: ["parallel-agents", "bootstrap", "external-repo"]
  })

For the full methodology: call getMethodology("parallel_agent_teams")`,
        },
      },
    ],
  },
];

const server = new Server(
  { name: "nodebench-mcp-methodology", version: "2.4.0" },
  { capabilities: { tools: {}, prompts: {} } }
);

// Handle tools/list — return all tools with their JSON Schema inputSchemas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
});

// Handle tools/call — dispatch to the matching tool handler (auto-instrumented)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = toolMap.get(name);
  if (!tool) {
    return {
      content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  const startMs = Date.now();
  let resultStatus = "success";
  let errorMsg: string | null = null;

  try {
    const result = await tool.handler(args ?? {});

    // Detect soft errors (tools that return { error: true } without throwing)
    if (result && typeof result === "object" && !Array.isArray(result) && (result as any).error) {
      resultStatus = "error";
      errorMsg = (result as any).message ?? "soft error";
    }

    // Auto-log (skip self-eval tools to avoid recursion/noise)
    if (!SKIP_AUTO_LOG.has(name)) {
      try {
        const db = getDb();
        db.prepare(
          "INSERT INTO tool_call_log (id, session_id, tool_name, result_status, duration_ms, error, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
        ).run(genId("tcl"), SESSION_ID, name, resultStatus, Date.now() - startMs, errorMsg);
      } catch { /* never let instrumentation break tool dispatch */ }
    }

    // Tools with rawContent return ContentBlock[] directly (e.g. image captures)
    if (tool.rawContent && Array.isArray(result)) {
      return { content: result, isError: false };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      isError: false,
    };
  } catch (err: any) {
    resultStatus = "error";
    errorMsg = err?.message || "Internal error";

    // Auto-log errors
    if (!SKIP_AUTO_LOG.has(name)) {
      try {
        const db = getDb();
        db.prepare(
          "INSERT INTO tool_call_log (id, session_id, tool_name, result_status, duration_ms, error, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
        ).run(genId("tcl"), SESSION_ID, name, resultStatus, Date.now() - startMs, errorMsg);
      } catch { /* never let instrumentation break tool dispatch */ }
    }

    return {
      content: [{ type: "text" as const, text: errorMsg }],
      isError: true,
    };
  }
});

// Handle prompts/list — return available prompts for agent discovery
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: PROMPTS.map((p) => ({
      name: p.name,
      description: p.description,
      ...(("arguments" in p && p.arguments) ? { arguments: p.arguments } : {}),
    })),
  };
});

// Handle prompts/get — return prompt messages
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const prompt = PROMPTS.find((p) => p.name === name);
  if (!prompt) {
    throw new Error(
      `Unknown prompt: ${name}. Available: ${PROMPTS.map((p) => p.name).join(", ")}`
    );
  }

  const messages =
    typeof prompt.messages === "function"
      ? prompt.messages(args ?? {})
      : prompt.messages;

  return {
    description: prompt.description,
    messages,
  };
});

// Connect via stdio
const transport = new StdioServerTransport();
await server.connect(transport);

const toolsetInfo = cliArgs.includes("--toolsets") || cliArgs.includes("--exclude") || cliArgs.includes("--preset")
  ? ` [gated: ${domainTools.length} domain + 2 meta]`
  : "";
console.error(`nodebench-mcp ready (${allTools.length} tools, ${PROMPTS.length} prompts${toolsetInfo}, SQLite at ~/.nodebench/)`);
