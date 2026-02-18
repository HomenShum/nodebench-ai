#!/usr/bin/env node
/**
 * openclaw-mcp-nodebench — Safe OpenClaw AI Agent Server
 *
 * Security enforcement + workflow checking + knowledge base for safe AI agent management.
 * Audits and controls OpenClaw agent sessions.
 *
 * Data stored in ~/.openclaw-mcp-nodebench/openclaw.db
 *
 * Usage:
 *   npx openclaw-mcp-nodebench          (stdio transport)
 *   npx tsx src/index.ts                (dev mode)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { encode as toonEncode } from "@toon-format/toon";
import { getDb, seedGotchasIfEmpty } from "./db.js";
import { sandboxTools } from "./tools/sandboxTools.js";
import { sessionTools } from "./tools/sessionTools.js";
import { proxyTools } from "./tools/proxyTools.js";
import { auditTools } from "./tools/auditTools.js";
import { workflowAuditTools } from "./tools/workflowAuditTools.js";
import { scaffoldTools } from "./tools/scaffoldTools.js";
import { gotchaTools } from "./tools/gotchaTools.js";
import { OPENCLAW_GOTCHAS } from "./gotchaSeed.js";
import { REGISTRY, WORKFLOW_CHAINS } from "./tools/toolRegistry.js";
import type { McpTool } from "./types.js";

// ── CLI flags ────────────────────────────────────────────────────────
const cliArgs = process.argv.slice(2);
const useToon = !cliArgs.includes("--no-toon");

// ── All tools ───────────────────────────────────────────────────────

const ALL_TOOLS: McpTool[] = [
  ...sandboxTools,
  ...sessionTools,
  ...proxyTools,
  ...auditTools,
  ...workflowAuditTools,
  ...scaffoldTools,
  ...gotchaTools,
];

const toolMap = new Map<string, McpTool>();
for (const tool of ALL_TOOLS) {
  toolMap.set(tool.name, tool);
}

// ── Server setup ────────────────────────────────────────────────────

const server = new Server(
  {
    name: "openclaw-mcp-nodebench",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// ── Initialize DB + seed gotchas ────────────────────────────────────

getDb();
seedGotchasIfEmpty(
  OPENCLAW_GOTCHAS as unknown as Array<{
    key: string;
    content: string;
    category: string;
    severity: string;
    tags: string;
  }>
);

// ── Tool listing ────────────────────────────────────────────────────
// Includes MCP 2025-11-25 spec annotations

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: ALL_TOOLS.map((t) => {
      const entry = REGISTRY.find((e) => e.name === t.name);
      return {
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        ...(entry
          ? {
              annotations: {
                title: t.name.replace(/_/g, " "),
                category: entry.category,
                phase: entry.phase,
                complexity: entry.complexity,
              },
            }
          : {}),
      };
    }),
  };
});

// ── Tool execution ──────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = toolMap.get(name);

  if (!tool) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: `Unknown tool: ${name}`,
            availableTools: ALL_TOOLS.map((t) => t.name),
          }),
        },
      ],
    };
  }

  try {
    const result = await tool.handler(args || {});

    let serialized: string;
    if (useToon) {
      try {
        serialized = toonEncode(result as Record<string, unknown>);
      } catch {
        serialized = JSON.stringify(result, null, 2);
      }
    } else {
      serialized = JSON.stringify(result, null, 2);
    }

    return {
      content: [{ type: "text", text: serialized }],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error.message || String(error),
            tool: name,
          }),
        },
      ],
      isError: true,
    };
  }
});

// ── MCP Resources ───────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "openclaw://sandbox-policies",
        name: "Sandbox Policies",
        description: "All configured sandbox policies with session stats",
        mimeType: "application/json",
      },
      {
        uri: "openclaw://active-sessions",
        name: "Active Sessions",
        description: "Currently active OpenClaw sessions with call counts and violations",
        mimeType: "application/json",
      },
      {
        uri: "openclaw://gotcha-db",
        name: "OpenClaw Known Issues",
        description:
          "All stored OpenClaw pitfalls (built-in + user-recorded) with categories and severity",
        mimeType: "application/json",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const db = getDb();

  if (uri === "openclaw://sandbox-policies") {
    const policies = db
      .prepare("SELECT * FROM openclaw_policies ORDER BY updated_at DESC")
      .all() as any[];

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              totalPolicies: policies.length,
              policies: policies.map((p: any) => ({
                name: p.policy_name,
                allowedTools: JSON.parse(p.allowed_tools).length,
                blockedTools: JSON.parse(p.blocked_tools).length,
                maxCalls: p.max_calls,
                monitoringLevel: p.monitoring_level,
                updatedAt: p.updated_at,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (uri === "openclaw://active-sessions") {
    const sessions = db
      .prepare(
        "SELECT * FROM openclaw_sessions WHERE status = 'active' ORDER BY started_at DESC"
      )
      .all() as any[];

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              activeSessions: sessions.length,
              sessions: sessions.map((s: any) => ({
                id: s.id,
                policyName: s.policy_name,
                deployment: s.deployment,
                totalCalls: s.total_calls,
                violations: s.violations,
                startedAt: s.started_at,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (uri === "openclaw://gotcha-db") {
    const gotchas = db
      .prepare(
        "SELECT key, category, severity, tags, source, updated_at FROM openclaw_gotchas ORDER BY updated_at DESC"
      )
      .all() as any[];

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              totalGotchas: gotchas.length,
              bySource: {
                seed: gotchas.filter((g: any) => g.source === "seed").length,
                user: gotchas.filter((g: any) => g.source === "user").length,
              },
              gotchas,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  return {
    contents: [{ uri, mimeType: "text/plain", text: `Unknown resource: ${uri}` }],
  };
});

// ── MCP Prompts ─────────────────────────────────────────────────────

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "secure-openclaw-session",
        description:
          "Set up and run a fully sandboxed OpenClaw session: configure policy, connect, invoke skills, audit, disconnect",
        arguments: [
          {
            name: "allowedSkills",
            description: "Comma-separated list of skills to allow",
            required: true,
          },
          {
            name: "task",
            description: "What the OpenClaw agent should accomplish",
            required: true,
          },
        ],
      },
      {
        name: "skill-security-audit",
        description:
          "Run a security check on OpenClaw skills: scan definitions, check risk profiles, review known issues",
      },
      {
        name: "sandbox-setup",
        description:
          "Generate Docker sandbox, configure policy, and verify readiness for secure OpenClaw deployment",
        arguments: [
          {
            name: "projectPath",
            description: "Path for sandbox files",
            required: true,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: promptArgs } = request.params;

  if (name === "secure-openclaw-session") {
    const skills = ((promptArgs as any)?.allowedSkills ?? "web_search")
      .split(",")
      .map((s: string) => s.trim());
    const task = (promptArgs as any)?.task ?? "Perform a web research task";

    return {
      description: "Secure OpenClaw session workflow",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text",
            text: `Run a secure OpenClaw session:

1. check_openclaw_status — Verify system readiness
2. configure_sandbox_policy({ policyName: "session-policy", allowedTools: ${JSON.stringify(skills)}, maxCalls: 50, monitoringLevel: "standard" })
3. connect_openclaw({ policyName: "session-policy" })
4. Execute task: "${task}" using call_openclaw_skill
5. get_openclaw_audit — Review all calls and rule breaks
6. get_session_compliance — Get safety score
7. disconnect_openclaw — End session with summary
8. Record any lessons learned with record_openclaw_gotcha

IMPORTANT — Analyst diagnostic: If any skill call fails or produces unexpected results, diagnose the ROOT CAUSE before retrying. Ask "why did this fail?" 5 times. Don't just retry or suppress errors — trace upstream to the actual problem.`,
          },
        },
      ],
    };
  }

  if (name === "skill-security-audit") {
    return {
      description: "Skill security audit workflow",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text",
            text: `Run a comprehensive OpenClaw skill security audit:

1. audit_openclaw_skills — Scan all installed skills for dangerous patterns, untrusted sources, excessive permissions
2. get_skill_risk_profile — Review risk profiles for all scanned skills
3. search_openclaw_gotchas({ query: "security" }) — Check known security issues
4. Record any new findings with record_openclaw_gotcha

Focus on: untrusted sources, broad permissions, known attack patterns, and data leakage risks.

Analyst diagnostic: For each risk, trace the ROOT CAUSE — what system condition allows this vulnerability? Don't just flag it; explain why it exists and how to prevent it structurally.`,
          },
        },
      ],
    };
  }

  if (name === "sandbox-setup") {
    const projectPath = (promptArgs as any)?.projectPath ?? "./openclaw-sandbox";

    return {
      description: "Docker sandbox setup workflow",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text",
            text: `Set up a Docker sandbox for OpenClaw at "${projectPath}":

1. check_openclaw_status({ checkDocker: true }) — Verify Docker availability
2. scaffold_openclaw_sandbox({ projectPath: "${projectPath}", dryRun: true }) — Preview sandbox files
3. Review security features (non-root, no network, capabilities dropped)
4. scaffold_openclaw_sandbox({ projectPath: "${projectPath}", dryRun: false }) — Write files
5. configure_sandbox_policy — Create a policy for the Docker sandbox
6. Provide instructions to build and run: docker compose -f docker-compose.openclaw-sandbox.yml up

If any step fails, diagnose the ROOT CAUSE — don't retry blindly. Check Docker logs, permissions, and network state to understand WHY before attempting a fix.`,
          },
        },
      ],
    };
  }

  return {
    description: "Unknown prompt",
    messages: [
      {
        role: "user" as const,
        content: { type: "text", text: `Unknown prompt: ${name}` },
      },
    ],
  };
});

// ── Start server ────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
