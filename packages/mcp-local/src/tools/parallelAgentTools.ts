/**
 * Parallel Agent Coordination Tools
 *
 * Inspired by Anthropic's "Building a C Compiler with Parallel Claudes" (Feb 2026).
 * Implements task locking, role specialization, context budget management,
 * and oracle-based testing patterns for multi-agent development workflows.
 *
 * Key patterns from the blog post:
 * - Task locking: Prevent two agents from solving the same problem simultaneously
 * - Agent roles: Specialization (implementer, dedup, perf, docs, critic)
 * - Context window management: Prevent pollution, track budget, pre-compute summaries
 * - Oracle testing: Compare against known-good reference outputs
 * - Progress tracking: Maintain running docs of status for fresh agent sessions
 *
 * Reference: https://www.anthropic.com/engineering/building-c-compiler
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

const PREDEFINED_ROLES: Record<string, { description: string; instructions: string }> = {
  implementer: {
    description: "Primary feature implementer. Picks failing tests and implements fixes.",
    instructions:
      "Focus on making failing tests pass. Pick the next most obvious failing test, fix it, run tests, commit. Avoid refactoring unrelated code. Update progress notes after each commit.",
  },
  dedup_reviewer: {
    description: "Code deduplication specialist. Finds and coalesces duplicate implementations.",
    instructions:
      "Search for duplicated logic across the codebase. Coalesce into shared utilities. Do NOT change external behavior. Run all tests after each consolidation. Log each dedup as a learning.",
  },
  performance_optimizer: {
    description: "Performance specialist. Profiles and optimizes hot paths.",
    instructions:
      "Profile the system for bottlenecks. Optimize hot paths without changing correctness. Benchmark before and after. Use oracle comparisons to verify output hasn't changed. Document optimizations as learnings.",
  },
  documentation_maintainer: {
    description: "Documentation specialist. Keeps READMEs, progress files, and docs in sync.",
    instructions:
      "Review all documentation for accuracy against current code. Update READMEs, progress files, and inline docs. Ensure new agents can orient themselves quickly. Use decide_re_update before creating new files.",
  },
  code_quality_critic: {
    description: "Code quality reviewer. Structural improvements and pattern enforcement.",
    instructions:
      "Review code from the perspective of an expert developer. Identify structural issues, anti-patterns, and opportunities for improvement. Make changes that improve maintainability without breaking tests. Log patterns discovered as learnings.",
  },
  test_writer: {
    description: "Test specialist. Writes and improves test coverage.",
    instructions:
      "Identify untested code paths. Write targeted tests for edge cases and failure modes. Ensure tests are deterministic and fast. Use oracle comparisons for complex output validation. Log test patterns as learnings.",
  },
  security_auditor: {
    description: "Security specialist. Finds and fixes vulnerabilities.",
    instructions:
      "Audit code for security vulnerabilities: injection, auth bypass, data exposure, unsafe defaults. Log each finding as a CRITICAL or HIGH gap. Fix vulnerabilities and verify with targeted tests.",
  },
};

// ============================================================================
// Portable AGENTS.md Generator
// ============================================================================

function generateParallelAgentsMdSection(
  techStack = "general",
  projectName = "this project",
  maxAgents = 4,
  includeNodebench = true
): string {
  const isTs = techStack.toLowerCase().includes("typescript") || techStack.toLowerCase().includes("node") || techStack.toLowerCase().includes("js");
  const isPython = techStack.toLowerCase().includes("python");

  const buildCmd = isTs ? "npm run build" : isPython ? "python -m py_compile" : "make build";
  const testCmd = isTs ? "npm test" : isPython ? "pytest" : "make test";
  const lintCmd = isTs ? "npx tsc --noEmit" : isPython ? "ruff check ." : "make lint";

  // Role recommendations based on agent count
  const roleRecs =
    maxAgents >= 4
      ? `- Agent 1: **implementer** — Primary feature work
- Agent 2: **test_writer** — Test coverage and edge cases
- Agent 3: **code_quality_critic** — Refactoring and pattern enforcement
- Agent 4: **documentation_maintainer** — Docs, progress files, READMEs`
      : maxAgents >= 2
        ? `- Agent 1: **implementer** — Feature work and bug fixes
- Agent 2: **test_writer** — Tests and quality review`
        : `- Agent 1: **implementer** — All work (single agent mode)`;

  let md = `## Parallel Agent Coordination Protocol

> Based on Anthropic's "Building a C Compiler with Parallel Claudes" (Feb 2026).
> Reference: https://www.anthropic.com/engineering/building-c-compiler

This section enables ${maxAgents} AI agents to work on ${projectName} in parallel without conflicts.

### Task Locking Protocol

**Before starting any work**, claim your task to prevent duplicate effort:

1. Check \`.parallel-agents/current_tasks/\` for active claims
2. Create a lock file: \`.parallel-agents/current_tasks/<task_key>.lock\`
   - Content: \`{ "agent": "<session_id>", "started": "<ISO timestamp>", "description": "<what you plan to do>" }\`
3. Do your work
4. When done, delete the lock file and update \`.parallel-agents/progress.md\`

**If a lock file already exists for your intended task**: pick a different task. Do NOT delete another agent's lock.

**If a lock file is stale** (older than 2 hours with no progress update): the agent may have crashed. You may reclaim it — but add a note in progress.md.

### Role Specialization

Recommended role assignments for ${maxAgents} parallel agents:

${roleRecs}

Each agent should:
- Stay focused on their role's responsibilities
- Avoid making changes outside their scope
- Update progress.md after each significant commit
- Record learnings about patterns discovered in their domain

### Oracle Testing Workflow

Use known-good reference outputs to validate changes:

1. **Capture oracle**: Run the reference implementation and save output
   \`\`\`
   ${isTs ? "node reference-impl.js > .parallel-agents/oracle/test_1.golden" : isPython ? "python reference_impl.py > .parallel-agents/oracle/test_1.golden" : "./reference-impl > .parallel-agents/oracle/test_1.golden"}
   \`\`\`
2. **Compare**: After changes, run your implementation and diff against golden file
   \`\`\`
   ${isTs ? "node your-impl.js > /tmp/actual.txt && diff .parallel-agents/oracle/test_1.golden /tmp/actual.txt" : isPython ? "python your_impl.py > /tmp/actual.txt && diff .parallel-agents/oracle/test_1.golden /tmp/actual.txt" : "./your-impl > /tmp/actual.txt && diff .parallel-agents/oracle/test_1.golden /tmp/actual.txt"}
   \`\`\`
3. **Triage failures**: Each failing comparison is an independent work item — assign to a different agent
4. **Delta debugging**: If tests pass alone but fail together, split the set in half to isolate the conflict

### Context Budget Rules

LLM agents have finite context windows. Prevent pollution:

- **DO NOT** print thousands of lines of test output — log to file, print summary only
- **DO NOT** read entire large files — use targeted grep/search
- **DO** pre-compute aggregate stats before reporting
- **DO** use \`--fast\` mode (1-10% random sample) for large test suites during development
- **DO** log errors with ERROR prefix on same line for easy grep
- **Budget guideline**: If a single tool output exceeds ~5,000 tokens, summarize it first

### Progress File Protocol

File: \`.parallel-agents/progress.md\`

Every agent MUST read this file at session start and update it after significant work:

- **Current Status**: What's done, what's in progress
- **Active Agents**: Who is working on what (check lock files too)
- **Blocked Items**: What needs help from another agent or human
- **Failed Approaches**: What was tried and didn't work (prevents other agents from repeating mistakes)
- **Key Decisions**: Architectural choices made during parallel work

### Anti-Patterns to Avoid

- **Two agents on same task**: Always check lock files before starting
- **Context dumping**: Never paste >100 lines of raw output into context
- **Stuck loops**: If stuck >30 minutes on one problem, mark as blocked and move on
- **Silent overwrites**: Always pull/rebase before pushing — check for other agents' recent commits
- **No progress updates**: Fresh agents waste time re-orienting without progress.md updates
- **Scope creep**: Stay in your role — an implementer should not refactor unless assigned as critic

### Flywheel Verification (After Bootstrap)

Run this 6-step check to verify parallel agent setup works:

1. **Static Analysis**: \`${lintCmd}\` — zero errors
2. **Happy Path**: One agent claims task → does work → releases → progress.md updated
3. **Conflict Test**: Two agents claim same task → second gets conflict
4. **Oracle Test**: Create golden file → make change → diff catches it
5. **Gap Re-scan**: Re-run detection — all 7 categories should show as present
6. **Document**: Record any new learnings discovered during verification
`;

  if (includeNodebench) {
    md += `
### NodeBench MCP Setup (Optional but Recommended)

Install nodebench-mcp for full parallel agent tool support:

\`\`\`bash
# Claude Code CLI
claude mcp add nodebench -- npx -y nodebench-mcp

# Or manual config in .claude.json / settings.json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp"]
    }
  }
}
\`\`\`

**Tool mapping** (file-based protocol → MCP tools):

| File-Based | NodeBench MCP Tool | Description |
|------------|-------------------|-------------|
| Lock file in \`current_tasks/\` | \`claim_agent_task\` | Claim a task lock |
| Delete lock file | \`release_agent_task\` | Release with progress note |
| Read \`current_tasks/\` | \`list_agent_tasks\` | See all claims |
| Manual role notes | \`assign_agent_role\` | 7 predefined roles |
| \`diff\` against golden file | \`run_oracle_comparison\` | Oracle testing with history |
| Read progress.md | \`get_parallel_status\` | Full orientation overview |
| Manual token counting | \`log_context_budget\` | Automated budget tracking |
| Run detection manually | \`bootstrap_parallel_agents\` | Auto-detect and scaffold |

**First-time setup with MCP**:
\`\`\`
> Use bootstrap_parallel_agents to scan this project and set up parallel agent infrastructure
> Use getMethodology("parallel_agent_teams") for the full 6-step workflow
\`\`\`
`;
  }

  return md;
}

export const parallelAgentTools: McpTool[] = [
  // ─── Task Locking ───────────────────────────────────────────
  {
    name: "claim_agent_task",
    description:
      "Claim a task lock so other parallel agents know you're working on it. Prevents duplicate work when multiple agents run simultaneously. Based on Anthropic's parallel Claude task locking pattern. Returns conflict info if another agent already claimed this task.",
    inputSchema: {
      type: "object",
      properties: {
        taskKey: {
          type: "string",
          description:
            "Unique task identifier (e.g. 'fix_auth_middleware', 'implement_ssr_hydration'). Use snake_case, descriptive names.",
        },
        description: {
          type: "string",
          description: "What you plan to do for this task",
        },
        sessionId: {
          type: "string",
          description:
            "Your agent session ID. If omitted, uses the MCP connection session.",
        },
      },
      required: ["taskKey"],
    },
    handler: async (args) => {
      const db = getDb();
      const taskKey = args.taskKey;
      const sessionId = args.sessionId || `agent_${Date.now()}`;
      const description = args.description || "";

      // Check if task is already claimed by another active agent
      const existing = db
        .prepare(
          "SELECT * FROM agent_tasks WHERE task_key = ? AND status = 'claimed'"
        )
        .get(taskKey) as any;

      if (existing && existing.session_id !== sessionId) {
        return {
          claimed: false,
          conflict: true,
          existingClaim: {
            sessionId: existing.session_id,
            claimedAt: existing.claimed_at,
            description: existing.description,
            progressNote: existing.progress_note,
          },
          suggestion:
            "Another agent is already working on this task. Pick a different task or wait for them to release it. Use list_agent_tasks to see all current claims.",
        };
      }

      // Claim or re-claim the task
      const id = genId("task");
      db.prepare(
        "INSERT OR REPLACE INTO agent_tasks (id, task_key, session_id, status, description, claimed_at) VALUES (?, ?, ?, 'claimed', ?, datetime('now'))"
      ).run(id, taskKey, sessionId, description);

      // Count total active tasks for this session
      const myTasks = db
        .prepare(
          "SELECT COUNT(*) as c FROM agent_tasks WHERE session_id = ? AND status = 'claimed'"
        )
        .get(sessionId) as any;

      return {
        claimed: true,
        taskId: id,
        taskKey,
        sessionId,
        activeTasks: myTasks.c,
        tip: "Update progress with release_agent_task when done. Other agents can see your claim via list_agent_tasks.",
      };
    },
  },
  {
    name: "release_agent_task",
    description:
      "Release a task lock after completing work. Updates status and optionally records a progress note for the next agent session. Part of the parallel agent coordination pattern.",
    inputSchema: {
      type: "object",
      properties: {
        taskKey: {
          type: "string",
          description: "The task key to release",
        },
        status: {
          type: "string",
          enum: ["completed", "blocked", "abandoned"],
          description:
            "Final status: completed (done), blocked (needs help), abandoned (giving up)",
        },
        progressNote: {
          type: "string",
          description:
            "Note for the next agent picking up this task (e.g. failed approaches, remaining work)",
        },
        sessionId: {
          type: "string",
          description: "Your agent session ID (must match the claim)",
        },
      },
      required: ["taskKey"],
    },
    handler: async (args) => {
      const db = getDb();
      const taskKey = args.taskKey;
      const status = args.status || "completed";
      const progressNote = args.progressNote || "";
      const sessionId = args.sessionId;

      // Find the active claim
      let query = "UPDATE agent_tasks SET status = ?, progress_note = ?, released_at = datetime('now') WHERE task_key = ? AND status = 'claimed'";
      const params: any[] = [status, progressNote, taskKey];

      if (sessionId) {
        query += " AND session_id = ?";
        params.push(sessionId);
      }

      const result = db.prepare(query).run(...params);

      if (result.changes === 0) {
        return {
          released: false,
          error: "No active claim found for this task key",
        };
      }

      return {
        released: true,
        taskKey,
        status,
        progressNote: progressNote || "(none)",
        tip:
          status === "blocked"
            ? "Task marked as blocked. Another agent or human should review the progress note."
            : status === "abandoned"
              ? "Task abandoned. Consider recording a learning about why this failed."
              : "Task completed. Other agents can now pick related tasks.",
      };
    },
  },
  {
    name: "list_agent_tasks",
    description:
      "List all current task claims across parallel agents. Shows who is working on what, blocked tasks, and recently completed work. Essential for new agent sessions to orient themselves and avoid duplicate work.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["claimed", "completed", "blocked", "abandoned", "all"],
          description: "Filter by status (default: 'all')",
        },
        limit: {
          type: "number",
          description: "Max results (default: 50)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const status = args.status || "all";
      const limit = args.limit || 50;

      let query = "SELECT * FROM agent_tasks";
      const params: any[] = [];

      if (status !== "all") {
        query += " WHERE status = ?";
        params.push(status);
      }

      query += " ORDER BY claimed_at DESC LIMIT ?";
      params.push(limit);

      const tasks = db.prepare(query).all(...params) as any[];

      // Summary stats
      const stats = db
        .prepare(
          "SELECT status, COUNT(*) as count FROM agent_tasks GROUP BY status"
        )
        .all() as any[];

      return {
        tasks: tasks.map((t) => ({
          taskKey: t.task_key,
          sessionId: t.session_id,
          status: t.status,
          description: t.description,
          progressNote: t.progress_note,
          claimedAt: t.claimed_at,
          releasedAt: t.released_at,
        })),
        stats: Object.fromEntries(stats.map((s) => [s.status, s.count])),
        total: tasks.length,
        tip: "Claimed tasks are actively being worked on. Pick unclaimed work or blocked tasks that need fresh eyes.",
      };
    },
  },

  // ─── Agent Role Specialization ──────────────────────────────
  {
    name: "assign_agent_role",
    description:
      'Assign a specialized role to the current agent session. Roles define focus area and behavioral instructions. Predefined roles: implementer, dedup_reviewer, performance_optimizer, documentation_maintainer, code_quality_critic, test_writer, security_auditor. Based on Anthropic\'s "multiple agent roles" pattern where specialized agents handle dedup, performance, documentation, and code quality.',
    inputSchema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description:
            "Role name. Use predefined: implementer, dedup_reviewer, performance_optimizer, documentation_maintainer, code_quality_critic, test_writer, security_auditor. Or define a custom role.",
        },
        sessionId: {
          type: "string",
          description: "Agent session ID to assign the role to",
        },
        customInstructions: {
          type: "string",
          description:
            "Custom instructions for the role (overrides predefined instructions if set)",
        },
        focusArea: {
          type: "string",
          description:
            "Specific area to focus on (e.g. 'auth module', 'API routes', 'frontend components')",
        },
      },
      required: ["role"],
    },
    handler: async (args) => {
      const db = getDb();
      const role = args.role;
      const sessionId = args.sessionId || `agent_${Date.now()}`;
      const focusArea = args.focusArea || "";

      const predefined = PREDEFINED_ROLES[role];
      const instructions =
        args.customInstructions ||
        (predefined ? predefined.instructions : `Custom role: ${role}`);

      const id = genId("role");
      db.prepare(
        "INSERT OR REPLACE INTO agent_roles (id, session_id, role, instructions, focus_area, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
      ).run(id, sessionId, role, instructions, focusArea);

      return {
        assigned: true,
        role,
        sessionId,
        description: predefined?.description || `Custom role: ${role}`,
        instructions,
        focusArea: focusArea || "(general)",
        availableRoles: Object.keys(PREDEFINED_ROLES),
        tip: "Your role shapes what tasks you should claim and how you approach work. Use claim_agent_task to pick tasks aligned with your role.",
      };
    },
  },
  {
    name: "get_agent_role",
    description:
      "Get the current agent's assigned role and instructions. Returns role-specific behavioral guidance. If no role is assigned, suggests one based on current project state.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Agent session ID to look up",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const sessionId = args.sessionId;

      if (sessionId) {
        const role = db
          .prepare("SELECT * FROM agent_roles WHERE session_id = ?")
          .get(sessionId) as any;

        if (role) {
          return {
            hasRole: true,
            role: role.role,
            instructions: role.instructions,
            focusArea: role.focus_area,
            assignedAt: role.created_at,
          };
        }
      }

      // No role assigned — list all active roles
      const activeRoles = db
        .prepare("SELECT * FROM agent_roles ORDER BY created_at DESC LIMIT 20")
        .all() as any[];

      return {
        hasRole: false,
        activeRoles: activeRoles.map((r) => ({
          sessionId: r.session_id,
          role: r.role,
          focusArea: r.focus_area,
          assignedAt: r.created_at,
        })),
        availableRoles: Object.entries(PREDEFINED_ROLES).map(([k, v]) => ({
          role: k,
          description: v.description,
        })),
        tip: "No role assigned for this session. Call assign_agent_role to specialize. This helps parallel agents coordinate by role.",
      };
    },
  },

  // ─── Context Window Budget Management ───────────────────────
  {
    name: "log_context_budget",
    description:
      "Track context window usage to prevent pollution. LLM agents have finite context and, as Anthropic's blog notes, test harnesses should NOT print thousands of useless bytes. Use this to track token usage, flag when approaching limits, and recommend summarization. Implements the 'context window pollution prevention' pattern.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Agent session ID",
        },
        eventType: {
          type: "string",
          enum: [
            "tool_output",
            "file_read",
            "test_output",
            "log_output",
            "search_result",
            "checkpoint",
          ],
          description: "What kind of content consumed context",
        },
        tokensUsed: {
          type: "number",
          description:
            "Approximate tokens consumed by this event (estimate: chars / 4)",
        },
        tokensLimit: {
          type: "number",
          description:
            "Total context window limit (default: 200000 for Claude)",
        },
        description: {
          type: "string",
          description: "What generated this context usage",
        },
      },
      required: ["eventType", "tokensUsed"],
    },
    handler: async (args) => {
      const db = getDb();
      const sessionId = args.sessionId || `agent_${Date.now()}`;
      const eventType = args.eventType;
      const tokensUsed = args.tokensUsed;
      const tokensLimit = args.tokensLimit || 200000;
      const description = args.description || "";

      const id = genId("ctx");
      db.prepare(
        "INSERT INTO context_budget_log (id, session_id, event_type, tokens_used, tokens_limit, description, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
      ).run(id, sessionId, eventType, tokensUsed, tokensLimit, description);

      // Calculate total usage for this session
      const total = db
        .prepare(
          "SELECT SUM(tokens_used) as total FROM context_budget_log WHERE session_id = ?"
        )
        .get(sessionId) as any;

      const totalUsed = total?.total || 0;
      const percentUsed = Math.round((totalUsed / tokensLimit) * 100);

      // Breakdown by event type
      const breakdown = db
        .prepare(
          "SELECT event_type, SUM(tokens_used) as total, COUNT(*) as count FROM context_budget_log WHERE session_id = ? GROUP BY event_type ORDER BY total DESC"
        )
        .all(sessionId) as any[];

      const warnings: string[] = [];
      if (percentUsed > 80) {
        warnings.push(
          "CRITICAL: Over 80% context budget used. Summarize findings and start a fresh session."
        );
      } else if (percentUsed > 60) {
        warnings.push(
          "WARNING: Over 60% context budget used. Avoid reading large files. Use targeted grep instead of full file reads."
        );
      } else if (percentUsed > 40) {
        warnings.push(
          "NOTE: Approaching 40% context budget. Consider pre-computing summaries rather than dumping raw output."
        );
      }

      // Check for the biggest polluter
      if (breakdown.length > 0 && breakdown[0].total > tokensLimit * 0.3) {
        warnings.push(
          `Biggest context consumer: '${breakdown[0].event_type}' (${breakdown[0].total} tokens, ${breakdown[0].count} events). Consider reducing output from this source.`
        );
      }

      return {
        logged: true,
        sessionId,
        event: { type: eventType, tokens: tokensUsed, description },
        budget: {
          totalUsed,
          limit: tokensLimit,
          percentUsed,
          remaining: tokensLimit - totalUsed,
        },
        breakdown: breakdown.map((b) => ({
          eventType: b.event_type,
          totalTokens: b.total,
          eventCount: b.count,
        })),
        warnings,
        bestPractices: [
          "Log errors with ERROR prefix on same line for easy grep",
          "Pre-compute aggregate stats instead of dumping raw data",
          "Use --fast mode (random 1-10% sample) for large test suites",
          "Write detailed output to log files, print only summaries to context",
        ],
      };
    },
  },

  // ─── Oracle-Based Testing ───────────────────────────────────
  {
    name: "run_oracle_comparison",
    description:
      'Compare actual output against a known-good oracle reference. Based on Anthropic\'s pattern of using GCC as an "online known-good compiler oracle" to identify which specific components are broken. The oracle pattern enables parallel debugging: each agent can work on different failing comparisons independently.',
    inputSchema: {
      type: "object",
      properties: {
        testLabel: {
          type: "string",
          description:
            "Label for this comparison (e.g. 'auth_middleware_output', 'api_response_format')",
        },
        actualOutput: {
          type: "string",
          description: "The actual output from your implementation",
        },
        expectedOutput: {
          type: "string",
          description: "The known-good reference output (oracle)",
        },
        oracleSource: {
          type: "string",
          description:
            "Where the oracle output came from (e.g. 'production_v2.1', 'reference_implementation', 'golden_file')",
        },
        sessionId: {
          type: "string",
          description: "Agent session ID for tracking",
        },
        cycleId: {
          type: "string",
          description: "Verification cycle ID to link this comparison to",
        },
      },
      required: ["testLabel", "actualOutput", "expectedOutput", "oracleSource"],
    },
    handler: async (args) => {
      const db = getDb();
      const testLabel = args.testLabel;
      const actualOutput = args.actualOutput;
      const expectedOutput = args.expectedOutput;
      const oracleSource = args.oracleSource;
      const sessionId = args.sessionId || "";
      const cycleId = args.cycleId || "";

      // Compute match and diff
      const exactMatch = actualOutput === expectedOutput;

      // Simple line-level diff
      const actualLines = actualOutput.split("\n");
      const expectedLines = expectedOutput.split("\n");
      const diffLines: string[] = [];
      const maxLines = Math.max(actualLines.length, expectedLines.length);

      let matchingLines = 0;
      for (let i = 0; i < maxLines; i++) {
        const a = actualLines[i] ?? "(missing)";
        const e = expectedLines[i] ?? "(missing)";
        if (a === e) {
          matchingLines++;
        } else {
          if (diffLines.length < 20) {
            diffLines.push(`Line ${i + 1}: expected "${e.slice(0, 100)}" got "${a.slice(0, 100)}"`);
          }
        }
      }

      const matchPercent =
        maxLines > 0 ? Math.round((matchingLines / maxLines) * 100) : 100;

      const diffSummary =
        diffLines.length > 0
          ? diffLines.join("\n")
          : "Exact match — no differences";

      const id = genId("oracle");
      db.prepare(
        "INSERT INTO oracle_comparisons (id, test_label, oracle_source, actual_output, expected_output, match, diff_summary, session_id, cycle_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
      ).run(
        id,
        testLabel,
        oracleSource,
        actualOutput,
        expectedOutput,
        exactMatch ? 1 : 0,
        diffSummary,
        sessionId,
        cycleId
      );

      // Get recent comparison history for this label
      const history = db
        .prepare(
          "SELECT match, created_at FROM oracle_comparisons WHERE test_label = ? ORDER BY created_at DESC LIMIT 5"
        )
        .all(testLabel) as any[];

      return {
        comparisonId: id,
        testLabel,
        oracleSource,
        result: {
          exactMatch,
          matchPercent,
          totalLines: maxLines,
          matchingLines,
          diffCount: maxLines - matchingLines,
        },
        diff: diffSummary,
        history: history.map((h) => ({
          match: h.match === 1,
          at: h.created_at,
        })),
        tip: exactMatch
          ? "Output matches oracle. Safe to proceed."
          : `${maxLines - matchingLines} lines differ. Fix differences before committing. Each differing section can be assigned to a parallel agent.`,
      };
    },
  },

  // ─── Parallel Agent Overview ────────────────────────────────
  {
    name: "get_parallel_status",
    description:
      "Get a comprehensive overview of all parallel agent activity: active task claims, role assignments, context budget status, and recent oracle comparison results. Essential for new agent sessions to orient themselves (Anthropic pattern: 'agents dropped into a fresh container with no context').",
    inputSchema: {
      type: "object",
      properties: {
        includeHistory: {
          type: "boolean",
          description:
            "Include completed/abandoned tasks and past comparisons (default: false)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const includeHistory = args.includeHistory || false;

      // Active tasks
      const activeTasks = db
        .prepare(
          "SELECT * FROM agent_tasks WHERE status = 'claimed' ORDER BY claimed_at DESC"
        )
        .all() as any[];

      const blockedTasks = db
        .prepare(
          "SELECT * FROM agent_tasks WHERE status = 'blocked' ORDER BY released_at DESC LIMIT 10"
        )
        .all() as any[];

      // Roles
      const roles = db
        .prepare(
          "SELECT * FROM agent_roles ORDER BY created_at DESC LIMIT 20"
        )
        .all() as any[];

      // Recent oracle results
      const recentOracle = db
        .prepare(
          "SELECT test_label, match, oracle_source, created_at FROM oracle_comparisons ORDER BY created_at DESC LIMIT 10"
        )
        .all() as any[];

      // Context budget summaries
      const budgetSummary = db
        .prepare(
          "SELECT session_id, SUM(tokens_used) as total_tokens, MAX(tokens_limit) as budget, COUNT(*) as events FROM context_budget_log GROUP BY session_id ORDER BY total_tokens DESC LIMIT 10"
        )
        .all() as any[];

      // Task stats
      const taskStats = db
        .prepare(
          "SELECT status, COUNT(*) as count FROM agent_tasks GROUP BY status"
        )
        .all() as any[];

      // Optional history
      let completedTasks: any[] = [];
      if (includeHistory) {
        completedTasks = db
          .prepare(
            "SELECT * FROM agent_tasks WHERE status IN ('completed', 'abandoned') ORDER BY released_at DESC LIMIT 20"
          )
          .all() as any[];
      }

      // Failed oracle comparisons (opportunities for parallel work)
      const failedOracle = db
        .prepare(
          "SELECT test_label, diff_summary, oracle_source, created_at FROM oracle_comparisons WHERE match = 0 ORDER BY created_at DESC LIMIT 10"
        )
        .all() as any[];

      return {
        activeTasks: activeTasks.map((t) => ({
          taskKey: t.task_key,
          sessionId: t.session_id,
          description: t.description,
          claimedAt: t.claimed_at,
        })),
        blockedTasks: blockedTasks.map((t) => ({
          taskKey: t.task_key,
          progressNote: t.progress_note,
          releasedAt: t.released_at,
        })),
        roles: roles.map((r) => ({
          sessionId: r.session_id,
          role: r.role,
          focusArea: r.focus_area,
        })),
        taskStats: Object.fromEntries(
          taskStats.map((s) => [s.status, s.count])
        ),
        recentOracleResults: recentOracle.map((o) => ({
          testLabel: o.test_label,
          match: o.match === 1,
          oracleSource: o.oracle_source,
          at: o.created_at,
        })),
        failedOracleTests: failedOracle.map((o) => ({
          testLabel: o.test_label,
          diffSummary: (o.diff_summary || "").slice(0, 200),
          oracleSource: o.oracle_source,
        })),
        contextBudgets: budgetSummary.map((b) => ({
          sessionId: b.session_id,
          totalTokens: b.total_tokens,
          budget: b.budget,
          percentUsed: Math.round((b.total_tokens / b.budget) * 100),
          events: b.events,
        })),
        ...(includeHistory ? { completedTasks: completedTasks.map((t) => ({
          taskKey: t.task_key,
          status: t.status,
          progressNote: t.progress_note,
          releasedAt: t.released_at,
        })) } : {}),
        orientation: {
          summary: `${activeTasks.length} active tasks, ${blockedTasks.length} blocked, ${roles.length} agents with roles, ${failedOracle.length} failing oracle tests`,
          nextSteps: [
            activeTasks.length > 0
              ? "Review active tasks — avoid claiming the same work"
              : "No active tasks — pick the next most impactful work item",
            blockedTasks.length > 0
              ? "Blocked tasks need fresh eyes — review progress notes"
              : null,
            failedOracle.length > 0
              ? `${failedOracle.length} oracle tests failing — each can be assigned to a different agent`
              : null,
          ].filter(Boolean),
        },
      };
    },
  },

  // ─── Bootstrap Parallel Agents for External Repos ──────────
  {
    name: "bootstrap_parallel_agents",
    description:
      "Detect whether a target project repo has parallel agent infrastructure and, if not, scaffold everything needed. Scans for task coordination, role configs, oracle testing, context budget tracking, progress files, AGENTS.md parallel sections, and git worktrees. Returns a gap report with severity ratings and ready-to-use scaffold commands. Uses the AI Flywheel closed loop: detect → research → implement → test → fix → document. Works on ANY project directory — not just nodebench.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: {
          type: "string",
          description:
            "Root directory of the target project to scan and bootstrap (default: current working directory)",
        },
        dryRun: {
          type: "boolean",
          description:
            "Preview only — show what would be created without writing files (default: true)",
        },
        includeAgentsMd: {
          type: "boolean",
          description:
            "Generate and include a portable AGENTS.md parallel section for the target repo (default: true)",
        },
        techStack: {
          type: "string",
          description:
            "Target project's tech stack hint (e.g. 'TypeScript/Node', 'Python/FastAPI', 'Rust') — helps generate idiomatic scaffolds",
        },
      },
    },
    handler: async (args) => {
      const projectRoot = args.projectRoot || process.cwd();
      const dryRun = args.dryRun !== false;
      const includeAgentsMd = args.includeAgentsMd !== false;
      const techStack = args.techStack || "unknown";

      // ── Phase 1: Detection ──────────────────────────────────
      const fs = await import("fs");
      const path = await import("path");

      interface DetectionResult {
        category: string;
        detected: boolean;
        confidence: number;
        evidence: string[];
        severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      }

      const results: DetectionResult[] = [];

      // Helper: check if a path exists
      const exists = (p: string) => {
        try {
          fs.accessSync(p);
          return true;
        } catch {
          return false;
        }
      };

      // Helper: check if a file contains a pattern
      const fileContains = (filePath: string, patterns: string[]): string[] => {
        try {
          const content = fs.readFileSync(filePath, "utf-8").toLowerCase();
          return patterns.filter((p) => content.includes(p.toLowerCase()));
        } catch {
          return [];
        }
      };

      // Helper: find files matching patterns in top-level dirs
      const findFiles = (root: string, namePatterns: string[], maxDepth = 3): string[] => {
        const found: string[] = [];
        const scan = (dir: string, depth: number) => {
          if (depth > maxDepth) return;
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.name.startsWith(".") && entry.name !== ".parallel-agents") continue;
              if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "__pycache__") continue;
              const full = path.join(dir, entry.name);
              if (entry.isFile()) {
                const lower = entry.name.toLowerCase();
                if (namePatterns.some((p) => lower.includes(p.toLowerCase()))) {
                  found.push(full);
                }
              } else if (entry.isDirectory()) {
                scan(full, depth + 1);
              }
            }
          } catch { /* permission denied, etc */ }
        };
        scan(root, 0);
        return found;
      };

      // 1. Task Coordination
      {
        const evidence: string[] = [];
        const taskDirs = ["current_tasks", ".parallel-agents", "tasks", ".tasks"];
        for (const d of taskDirs) {
          if (exists(path.join(projectRoot, d))) evidence.push(`Directory found: ${d}/`);
        }
        const taskFiles = findFiles(projectRoot, ["task_lock", "taskLock", "claim_task", "claimTask"]);
        for (const f of taskFiles) evidence.push(`Task file: ${path.relative(projectRoot, f)}`);
        // Check AGENTS.md / CLAUDE.md for task coordination mentions
        for (const agentsFile of ["AGENTS.md", "CLAUDE.md", "agents.md"]) {
          const matches = fileContains(path.join(projectRoot, agentsFile), ["task lock", "claim_task", "parallel agent", "worktree"]);
          if (matches.length > 0) evidence.push(`${agentsFile} mentions: ${matches.join(", ")}`);
        }
        results.push({
          category: "task_coordination",
          detected: evidence.length > 0,
          confidence: Math.min(evidence.length * 0.3, 1),
          evidence,
          severity: "CRITICAL",
        });
      }

      // 2. Role Configuration
      {
        const evidence: string[] = [];
        const roleFiles = findFiles(projectRoot, ["role", "agent_role", "agentRole"]);
        for (const f of roleFiles.slice(0, 5)) evidence.push(`Role file: ${path.relative(projectRoot, f)}`);
        for (const agentsFile of ["AGENTS.md", "CLAUDE.md"]) {
          const matches = fileContains(path.join(projectRoot, agentsFile), ["agent role", "role specializ", "implementer", "dedup_reviewer"]);
          if (matches.length > 0) evidence.push(`${agentsFile} mentions roles: ${matches.join(", ")}`);
        }
        results.push({
          category: "role_specialization",
          detected: evidence.length > 0,
          confidence: Math.min(evidence.length * 0.35, 1),
          evidence,
          severity: "HIGH",
        });
      }

      // 3. Oracle Testing
      {
        const evidence: string[] = [];
        const oracleDirs = ["oracle", "golden", "golden_files", "reference_outputs", "snapshots", "__snapshots__"];
        for (const d of oracleDirs) {
          if (exists(path.join(projectRoot, d))) evidence.push(`Oracle dir: ${d}/`);
        }
        const oracleFiles = findFiles(projectRoot, ["oracle", "golden", "reference_output", "snapshot"]);
        for (const f of oracleFiles.slice(0, 5)) evidence.push(`Oracle file: ${path.relative(projectRoot, f)}`);
        results.push({
          category: "oracle_testing",
          detected: evidence.length > 0,
          confidence: Math.min(evidence.length * 0.25, 1),
          evidence,
          severity: "HIGH",
        });
      }

      // 4. Context Budget Tracking
      {
        const evidence: string[] = [];
        const budgetFiles = findFiles(projectRoot, ["context_budget", "contextBudget", "token_budget", "tokenBudget"]);
        for (const f of budgetFiles.slice(0, 5)) evidence.push(`Budget file: ${path.relative(projectRoot, f)}`);
        for (const agentsFile of ["AGENTS.md", "CLAUDE.md"]) {
          const matches = fileContains(path.join(projectRoot, agentsFile), ["context budget", "token budget", "context pollution", "context window"]);
          if (matches.length > 0) evidence.push(`${agentsFile} mentions: ${matches.join(", ")}`);
        }
        results.push({
          category: "context_budget",
          detected: evidence.length > 0,
          confidence: Math.min(evidence.length * 0.35, 1),
          evidence,
          severity: "MEDIUM",
        });
      }

      // 5. Progress Files
      {
        const evidence: string[] = [];
        const progressFiles = ["PROGRESS.md", "progress.md", "claude-progress.txt", "STATUS.md", "CHANGELOG.md"];
        for (const f of progressFiles) {
          if (exists(path.join(projectRoot, f))) evidence.push(`Progress file: ${f}`);
        }
        results.push({
          category: "progress_files",
          detected: evidence.length > 0,
          confidence: Math.min(evidence.length * 0.4, 1),
          evidence,
          severity: "MEDIUM",
        });
      }

      // 6. AGENTS.md Parallel Section
      {
        const evidence: string[] = [];
        for (const agentsFile of ["AGENTS.md", "CLAUDE.md", "agents.md", "NODEBENCH_AGENTS.md"]) {
          const fp = path.join(projectRoot, agentsFile);
          if (exists(fp)) {
            evidence.push(`Found: ${agentsFile}`);
            const matches = fileContains(fp, ["parallel agent", "multi-agent", "subagent", "worktree", "task locking"]);
            if (matches.length > 0) evidence.push(`${agentsFile} has parallel content: ${matches.join(", ")}`);
          }
        }
        results.push({
          category: "agents_md_parallel",
          detected: evidence.some((e) => e.includes("parallel content")),
          confidence: evidence.some((e) => e.includes("parallel content")) ? 0.9 : 0,
          evidence,
          severity: "CRITICAL",
        });
      }

      // 7. Git Worktrees
      {
        const evidence: string[] = [];
        const worktreeDir = path.join(projectRoot, ".git", "worktrees");
        if (exists(worktreeDir)) {
          try {
            const wts = fs.readdirSync(worktreeDir);
            evidence.push(`Git worktrees found: ${wts.length} (${wts.slice(0, 5).join(", ")})`);
          } catch { /* no access */ }
        }
        results.push({
          category: "git_worktrees",
          detected: evidence.length > 0,
          confidence: evidence.length > 0 ? 0.9 : 0,
          evidence,
          severity: "LOW",
        });
      }

      // ── Phase 2: Gap Report ─────────────────────────────────
      const missing = results.filter((r) => !r.detected);
      const detected = results.filter((r) => r.detected);
      const hasParallelInfra = missing.filter((m) => m.severity === "CRITICAL").length === 0;

      // ── Phase 3: Scaffold Plan ──────────────────────────────
      interface ScaffoldFile {
        path: string;
        content: string;
        description: string;
      }

      const scaffoldFiles: ScaffoldFile[] = [];

      // Determine comment style based on tech stack
      const isTs = techStack.toLowerCase().includes("typescript") || techStack.toLowerCase().includes("node") || techStack.toLowerCase().includes("js");
      const isPython = techStack.toLowerCase().includes("python");
      const isRust = techStack.toLowerCase().includes("rust");

      // Task coordination directory
      if (!results.find((r) => r.category === "task_coordination")?.detected) {
        scaffoldFiles.push({
          path: ".parallel-agents/README.md",
          content: `# Parallel Agent Coordination

This directory manages parallel agent task coordination.

## Structure
- \`current_tasks/\` — Active task lock files (one per claimed task)
- \`progress.md\` — Running status document for agent orientation
- \`roles.json\` — Active role assignments
- \`oracle/\` — Golden reference outputs for oracle testing

## How it works
1. Before starting work, an agent creates a lock file in \`current_tasks/\`
2. Other agents check this directory to avoid duplicate work
3. When done, the agent removes the lock and updates \`progress.md\`

## Using with NodeBench MCP
If you have nodebench-mcp installed, these operations are handled by:
- \`claim_agent_task\` / \`release_agent_task\` — Task locking
- \`assign_agent_role\` — Role specialization
- \`run_oracle_comparison\` — Oracle testing
- \`get_parallel_status\` — Agent orientation

Install: \`npx -y nodebench-mcp\` or \`claude mcp add nodebench -- npx -y nodebench-mcp\`
`,
          description: "Parallel agents coordination directory README",
        });

        scaffoldFiles.push({
          path: ".parallel-agents/current_tasks/.gitkeep",
          content: "",
          description: "Task lock directory (empty, agents create lock files here)",
        });

        scaffoldFiles.push({
          path: ".parallel-agents/oracle/.gitkeep",
          content: "",
          description: "Oracle golden files directory",
        });
      }

      // Progress file
      if (!results.find((r) => r.category === "progress_files")?.detected) {
        scaffoldFiles.push({
          path: ".parallel-agents/progress.md",
          content: `# Parallel Agent Progress

> Updated by agents after each work session. Read this FIRST when starting a new session.

## Current Status
- [ ] No tasks started yet

## Active Agents
(none)

## Completed Work
(none yet)

## Blocked Items
(none)

## Failed Approaches
(Record what didn't work so other agents don't repeat mistakes)

## Key Decisions
(Record architectural or design decisions made during parallel work)
`,
          description: "Running progress document for agent orientation",
        });
      }

      // Role configuration
      if (!results.find((r) => r.category === "role_specialization")?.detected) {
        scaffoldFiles.push({
          path: ".parallel-agents/roles.json",
          content: JSON.stringify(
            {
              _comment: "Agent role assignments. Updated by assign_agent_role or manually.",
              predefinedRoles: {
                implementer: "Primary feature work. Picks failing tests, implements fixes.",
                test_writer: "Writes targeted tests for edge cases and failure modes.",
                code_quality_critic: "Structural improvements, pattern enforcement.",
                documentation_maintainer: "Keeps READMEs and progress files in sync.",
                dedup_reviewer: "Finds and coalesces duplicate implementations.",
                performance_optimizer: "Profiles bottlenecks, optimizes hot paths.",
                security_auditor: "Audits for vulnerabilities, logs CRITICAL gaps.",
              },
              activeAssignments: [],
            },
            null,
            2
          ),
          description: "Role definitions and active assignments",
        });
      }

      // AGENTS.md parallel section
      let agentsMdContent = "";
      if (!results.find((r) => r.category === "agents_md_parallel")?.detected && includeAgentsMd) {
        agentsMdContent = generateParallelAgentsMdSection(techStack);
        const existingAgentsMd = exists(path.join(projectRoot, "AGENTS.md"));
        scaffoldFiles.push({
          path: existingAgentsMd ? "AGENTS.md.parallel-append" : "AGENTS.md",
          content: existingAgentsMd
            ? `\n\n${agentsMdContent}`
            : `# Agent Instructions\n\n${agentsMdContent}`,
          description: existingAgentsMd
            ? "Append this content to your existing AGENTS.md"
            : "New AGENTS.md with parallel agent coordination section",
        });
      }

      // ── Phase 4: Write files (if not dry run) ──────────────
      const created: string[] = [];
      if (!dryRun) {
        for (const file of scaffoldFiles) {
          const fullPath = path.join(projectRoot, file.path);
          const dir = path.dirname(fullPath);
          try {
            fs.mkdirSync(dir, { recursive: true });
            // Don't overwrite existing files (except .gitkeep and append markers)
            if (!file.path.endsWith(".gitkeep") && !file.path.endsWith("-append") && exists(fullPath)) {
              continue;
            }
            fs.writeFileSync(fullPath, file.content, "utf-8");
            created.push(file.path);
          } catch (e: any) {
            // Log but don't fail
            created.push(`FAILED: ${file.path} — ${e.message}`);
          }
        }
      }

      // ── Phase 5: Flywheel Verification Plan ────────────────
      const flywheelPlan = [
        {
          step: 1,
          name: "Static Analysis",
          action: "Verify scaffold files are valid and don't conflict with existing project structure",
          tool: "run_closed_loop({ steps: [{ step: 'compile', passed: true }] })",
        },
        {
          step: 2,
          name: "Happy Path Test",
          action: "Have one agent claim a task, do work, release it. Verify progress.md updates.",
          tool: "claim_agent_task → release_agent_task → list_agent_tasks",
        },
        {
          step: 3,
          name: "Conflict Test",
          action: "Have two agents try to claim the same task. Verify the second gets a conflict response.",
          tool: "claim_agent_task (agent A) → claim_agent_task (agent B, same key)",
        },
        {
          step: 4,
          name: "Oracle Validation",
          action: "Create a golden file, run oracle comparison, verify match detection works.",
          tool: "run_oracle_comparison({ testLabel: 'smoke', actualOutput: 'hello', expectedOutput: 'hello', oracleSource: 'manual' })",
        },
        {
          step: 5,
          name: "Gap Analysis",
          action: "Re-run bootstrap_parallel_agents to verify all gaps are now filled.",
          tool: "bootstrap_parallel_agents({ projectRoot: '...', dryRun: true })",
        },
        {
          step: 6,
          name: "Document",
          action: "Record learnings and update AGENTS.md with any new patterns discovered.",
          tool: "record_learning + update_agents_md",
        },
      ];

      return {
        projectRoot,
        dryRun,
        detection: {
          hasParallelInfra,
          detected: detected.map((r) => ({
            category: r.category,
            confidence: r.confidence,
            evidence: r.evidence,
          })),
          missing: missing.map((r) => ({
            category: r.category,
            severity: r.severity,
            description: {
              task_coordination: "No task locking mechanism — parallel agents may duplicate work",
              role_specialization: "No role configuration — agents won't specialize effectively",
              oracle_testing: "No oracle/golden file infrastructure — can't validate against known-good references",
              context_budget: "No context budget tracking — risk of context window pollution",
              progress_files: "No progress files — fresh agent sessions can't orient themselves",
              agents_md_parallel: "AGENTS.md has no parallel agent section — agents won't know the coordination protocol",
              git_worktrees: "No git worktrees — parallel agents will need separate clones or worktrees",
            }[r.category] || `Missing ${r.category}`,
          })),
          score: `${detected.length}/${results.length} capabilities present`,
        },
        scaffold: {
          files: scaffoldFiles.map((f) => ({
            path: f.path,
            description: f.description,
            sizeBytes: f.content.length,
          })),
          totalFiles: scaffoldFiles.length,
          ...(dryRun ? {} : { created }),
        },
        flywheelPlan,
        nextSteps: [
          dryRun && scaffoldFiles.length > 0
            ? "Run with dryRun=false to create scaffold files"
            : null,
          scaffoldFiles.some((f) => f.path.endsWith("-append"))
            ? "Manually append the AGENTS.md.parallel-append content to your existing AGENTS.md"
            : null,
          "Run the 6-step flywheel verification plan above to validate the setup",
          "Install nodebench-mcp for full tool support: claude mcp add nodebench -- npx -y nodebench-mcp",
          "Set up 3-5 git worktrees for maximum parallel throughput: git worktree add ../project-wt1 -b agent-1",
          missing.length === 0
            ? "All parallel agent infrastructure detected! Ready for multi-agent work."
            : null,
        ].filter(Boolean),
        tip: hasParallelInfra
          ? "This project already has parallel agent infrastructure. Use get_parallel_status to orient and start working."
          : `This project is missing ${missing.length} parallel agent capabilities. ${dryRun ? "Run with dryRun=false to scaffold them automatically." : `Scaffolded ${created.length} files. Run the flywheel plan to verify.`}`,
      };
    },
  },
  {
    name: "generate_parallel_agents_md",
    description:
      "Generate a portable, framework-agnostic AGENTS.md section for parallel agent coordination. Designed to be dropped into ANY project repo so that AI agents (Claude, GPT, etc.) automatically know how to coordinate in parallel. Includes task locking protocol, role definitions, oracle testing workflow, context budget rules, and anti-patterns. Output is ready to paste into an existing AGENTS.md or use standalone.",
    inputSchema: {
      type: "object",
      properties: {
        techStack: {
          type: "string",
          description:
            "Target project tech stack (e.g. 'TypeScript/React', 'Python/Django', 'Rust'). Tailors examples to the stack.",
        },
        projectName: {
          type: "string",
          description: "Project name for the header (default: 'this project')",
        },
        maxAgents: {
          type: "number",
          description: "Expected max parallel agents (default: 4). Affects role recommendations.",
        },
        includeNodebenchSetup: {
          type: "boolean",
          description:
            "Include nodebench-mcp installation and tool mapping instructions (default: true)",
        },
      },
    },
    handler: async (args) => {
      const techStack = args.techStack || "general";
      const projectName = args.projectName || "this project";
      const maxAgents = args.maxAgents || 4;
      const includeNodebench = args.includeNodebenchSetup !== false;

      const content = generateParallelAgentsMdSection(techStack, projectName, maxAgents, includeNodebench);

      return {
        format: "markdown",
        content,
        usage: [
          "Option A: Paste into your existing AGENTS.md (append at the end)",
          "Option B: Save as a new AGENTS.md in your project root",
          "Option C: Save as .parallel-agents/PROTOCOL.md for a standalone guide",
        ],
        charCount: content.length,
        sections: [
          "Parallel Agent Coordination Protocol",
          "Task Locking Protocol",
          "Role Specialization",
          "Oracle Testing Workflow",
          "Context Budget Rules",
          "Progress File Protocol",
          "Anti-Patterns",
          "Flywheel Verification",
          includeNodebench ? "NodeBench MCP Setup" : null,
        ].filter(Boolean),
      };
    },
  },

  // ─── Agent Mailbox — Inter-Agent Messaging ─────────────────────
  {
    name: "send_agent_message",
    description:
      "Send a message to another agent by session ID or role. Enables asynchronous inter-agent communication for task handoffs, status reports, blockers, and findings. Messages persist in SQLite so agents spawned later can read them.",
    inputSchema: {
      type: "object",
      properties: {
        senderId: {
          type: "string",
          description: "Sender agent session ID (defaults to current session)",
        },
        recipientId: {
          type: "string",
          description: "Target agent session ID (for direct messages)",
        },
        recipientRole: {
          type: "string",
          description:
            "Target agent role (e.g. 'implementer', 'test_writer'). Used for role-based routing when you don't know the session ID.",
        },
        category: {
          type: "string",
          enum: ["task_assignment", "status_report", "finding", "blocker", "handoff"],
          description: "Message category for filtering",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "critical"],
          description: "Message priority (default: normal)",
        },
        subject: {
          type: "string",
          description: "Short message subject line",
        },
        body: {
          type: "string",
          description: "Full message body with details",
        },
      },
      required: ["subject", "body"],
    },
    handler: async (args) => {
      const db = getDb();
      const id = genId("msg");
      const senderId = args.senderId || `agent_${Date.now()}`;
      const recipientId = args.recipientId || null;
      const recipientRole = args.recipientRole || null;
      const category = args.category || "status_report";
      const priority = args.priority || "normal";

      if (!recipientId && !recipientRole) {
        return {
          error: true,
          message: "Provide either recipientId (session ID) or recipientRole to route the message.",
        };
      }

      db.prepare(
        "INSERT INTO agent_mailbox (id, sender_id, recipient_id, recipient_role, category, priority, subject, body, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))"
      ).run(id, senderId, recipientId, recipientRole, category, priority, args.subject, args.body);

      return {
        sent: true,
        messageId: id,
        to: recipientId || `role:${recipientRole}`,
        category,
        priority,
        subject: args.subject,
      };
    },
  },
  {
    name: "check_agent_inbox",
    description:
      "Read unread messages for the current agent session. Filter by category, sender, or priority. Messages are marked as read after retrieval. Use this at the start of a session to pick up handoffs and blockers from other agents.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Your agent session ID to check messages for",
        },
        role: {
          type: "string",
          description: "Your agent role — also receives role-addressed messages",
        },
        category: {
          type: "string",
          enum: ["task_assignment", "status_report", "finding", "blocker", "handoff"],
          description: "Filter by message category",
        },
        senderFilter: {
          type: "string",
          description: "Filter by sender session ID",
        },
        priorityFilter: {
          type: "string",
          enum: ["low", "normal", "high", "critical"],
          description: "Filter by minimum priority",
        },
        unreadOnly: {
          type: "boolean",
          description: "Only return unread messages (default: true)",
        },
        markAsRead: {
          type: "boolean",
          description: "Mark retrieved messages as read (default: true)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const sessionId = args.sessionId || "";
      const role = args.role || "";
      const unreadOnly = args.unreadOnly !== false;
      const markAsRead = args.markAsRead !== false;

      const conditions: string[] = [];
      const params: any[] = [];

      // Match by session ID, role, or broadcast messages
      if (sessionId && role) {
        conditions.push("(recipient_id = ? OR recipient_id = '__broadcast__' OR recipient_role = ?)");
        params.push(sessionId, role);
      } else if (sessionId) {
        conditions.push("(recipient_id = ? OR recipient_id = '__broadcast__')");
        params.push(sessionId);
      } else if (role) {
        conditions.push("(recipient_role = ? OR recipient_id = '__broadcast__')");
        params.push(role);
      } else {
        // No filter — return broadcasts only
        conditions.push("recipient_id = '__broadcast__'");
      }

      if (unreadOnly) {
        conditions.push("read = 0");
      }

      if (args.category) {
        conditions.push("category = ?");
        params.push(args.category);
      }

      if (args.senderFilter) {
        conditions.push("sender_id = ?");
        params.push(args.senderFilter);
      }

      if (args.priorityFilter) {
        const priorityOrder = ["low", "normal", "high", "critical"];
        const minIdx = priorityOrder.indexOf(args.priorityFilter);
        if (minIdx >= 0) {
          const validPriorities = priorityOrder.slice(minIdx);
          conditions.push(`priority IN (${validPriorities.map(() => "?").join(",")})`);
          params.push(...validPriorities);
        }
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const messages = db
        .prepare(`SELECT * FROM agent_mailbox ${where} ORDER BY created_at DESC LIMIT 50`)
        .all(...params) as any[];

      // Mark as read
      if (markAsRead && messages.length > 0) {
        const ids = messages.filter((m) => !m.read).map((m) => m.id);
        if (ids.length > 0) {
          db.prepare(
            `UPDATE agent_mailbox SET read = 1 WHERE id IN (${ids.map(() => "?").join(",")})`
          ).run(...ids);
        }
      }

      return {
        messages: messages.map((m) => ({
          id: m.id,
          from: m.sender_id,
          category: m.category,
          priority: m.priority,
          subject: m.subject,
          body: m.body,
          read: !!m.read,
          createdAt: m.created_at,
        })),
        count: messages.length,
        unreadCount: messages.filter((m) => !m.read).length,
      };
    },
  },
  {
    name: "broadcast_agent_update",
    description:
      "Broadcast a status update to all active agents. Unlike send_agent_message (point-to-point), this creates a message with no specific recipient that all agents can see via check_agent_inbox. Useful for announcing blockers, completed milestones, or coordination changes.",
    inputSchema: {
      type: "object",
      properties: {
        senderId: {
          type: "string",
          description: "Sender agent session ID",
        },
        category: {
          type: "string",
          enum: ["task_assignment", "status_report", "finding", "blocker", "handoff"],
          description: "Message category (default: status_report)",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "critical"],
          description: "Message priority (default: normal)",
        },
        subject: {
          type: "string",
          description: "Broadcast subject line",
        },
        body: {
          type: "string",
          description: "Broadcast message body",
        },
      },
      required: ["subject", "body"],
    },
    handler: async (args) => {
      const db = getDb();
      const id = genId("bcast");
      const senderId = args.senderId || `agent_${Date.now()}`;
      const category = args.category || "status_report";
      const priority = args.priority || "normal";

      // Broadcast: recipient_id = '__broadcast__', no recipient_role
      db.prepare(
        "INSERT INTO agent_mailbox (id, sender_id, recipient_id, recipient_role, category, priority, subject, body, read, created_at) VALUES (?, ?, '__broadcast__', NULL, ?, ?, ?, ?, 0, datetime('now'))"
      ).run(id, senderId, category, priority, args.subject, args.body);

      // Count active agents (from recent task claims)
      const activeAgents = db
        .prepare(
          "SELECT COUNT(DISTINCT session_id) as count FROM agent_tasks WHERE status = 'claimed'"
        )
        .get() as any;

      return {
        broadcast: true,
        messageId: id,
        category,
        priority,
        subject: args.subject,
        activeAgentCount: activeAgents?.count || 0,
      };
    },
  },
];
