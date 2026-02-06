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
import { createMetaTools } from "./tools/metaTools.js";
import type { McpTool } from "./types.js";

// Initialize DB (creates ~/.nodebench/ and schema on first run)
getDb();

// Assemble tools
const domainTools: McpTool[] = [
  ...verificationTools,
  ...evalTools,
  ...qualityGateTools,
  ...learningTools,
  ...flywheelTools,
  ...reconTools,
  ...uiCaptureTools,
  ...visionTools,
  ...webTools,
  ...githubTools,
  ...documentationTools,
  ...agentBootstrapTools,
  ...selfEvalTools,
  ...parallelAgentTools,
];

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
          text: `You are connected to NodeBench Development Methodology MCP — a tool suite for rigorous software development.

FIRST TIME? Run these 3 steps:
1. Call bootstrap_project to register your project (tech stack, architecture, conventions)
2. Call getMethodology("overview") to see all available methodologies
3. Call search_all_knowledge("your current task") before starting any work

RETURNING? Your project context and all past learnings are persisted. Start with:
1. Call get_project_context to refresh your project awareness
2. Call search_all_knowledge with your current task
3. Follow the methodology tools as you work — they'll guide you step by step

KEY TOOLS:
- getMethodology — Step-by-step guides for verification, eval, flywheel, recon
- findTools — Discover tools by keyword or category
- search_all_knowledge — Search learnings + recon findings + resolved gaps
- bootstrap_project — Register/update project context
- run_mandatory_flywheel — Required 6-step verification for any non-trivial change

The knowledge base grows automatically as you work. Every verification cycle, eval run, and resolved gap contributes back.`,
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
  { name: "nodebench-mcp-methodology", version: "2.0.0" },
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

console.error(`nodebench-mcp-methodology ready (${allTools.length} tools, ${PROMPTS.length} prompts, SQLite at ~/.nodebench/)`);
