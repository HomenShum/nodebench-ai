#!/usr/bin/env node
/**
 * convex-mcp-nodebench — Convex-Specific MCP Server
 *
 * Applies NodeBench self-instruct diligence patterns to Convex development.
 * Schema audit, function compliance, deployment gates, persistent gotcha DB,
 * and methodology guidance.
 *
 * Data stored in ~/.convex-mcp-nodebench/convex.db
 *
 * Usage:
 *   npx convex-mcp-nodebench          (stdio transport)
 *   npx tsx src/index.ts              (dev mode)
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
import { getDb, seedGotchasIfEmpty } from "./db.js";
import { schemaTools } from "./tools/schemaTools.js";
import { functionTools } from "./tools/functionTools.js";
import { deploymentTools } from "./tools/deploymentTools.js";
import { learningTools } from "./tools/learningTools.js";
import { methodologyTools } from "./tools/methodologyTools.js";
import { integrationBridgeTools } from "./tools/integrationBridgeTools.js";
import { cronTools } from "./tools/cronTools.js";
import { componentTools } from "./tools/componentTools.js";
import { httpTools } from "./tools/httpTools.js";
import { critterTools } from "./tools/critterTools.js";
import { authorizationTools } from "./tools/authorizationTools.js";
import { queryEfficiencyTools } from "./tools/queryEfficiencyTools.js";
import { actionAuditTools } from "./tools/actionAuditTools.js";
import { typeSafetyTools } from "./tools/typeSafetyTools.js";
import { transactionSafetyTools } from "./tools/transactionSafetyTools.js";
import { storageAuditTools } from "./tools/storageAuditTools.js";
import { paginationTools } from "./tools/paginationTools.js";
import { dataModelingTools } from "./tools/dataModelingTools.js";
import { devSetupTools } from "./tools/devSetupTools.js";
import { migrationTools } from "./tools/migrationTools.js";
import { reportingTools } from "./tools/reportingTools.js";
import { vectorSearchTools } from "./tools/vectorSearchTools.js";
import { schedulerTools } from "./tools/schedulerTools.js";
import { qualityGateTools } from "./tools/qualityGateTools.js";
import { architectTools } from "./tools/architectTools.js";
import { CONVEX_GOTCHAS } from "./gotchaSeed.js";
import { REGISTRY } from "./tools/toolRegistry.js";
import { initEmbeddingIndex } from "./tools/embeddingProvider.js";
import type { McpTool } from "./types.js";

// ── All tools ───────────────────────────────────────────────────────

const ALL_TOOLS: McpTool[] = [
  ...schemaTools,
  ...functionTools,
  ...deploymentTools,
  ...learningTools,
  ...methodologyTools,
  ...integrationBridgeTools,
  ...cronTools,
  ...componentTools,
  ...httpTools,
  ...critterTools,
  ...authorizationTools,
  ...queryEfficiencyTools,
  ...actionAuditTools,
  ...typeSafetyTools,
  ...transactionSafetyTools,
  ...storageAuditTools,
  ...paginationTools,
  ...dataModelingTools,
  ...devSetupTools,
  ...migrationTools,
  ...reportingTools,
  ...vectorSearchTools,
  ...schedulerTools,
  ...qualityGateTools,
  ...architectTools,
];

const toolMap = new Map<string, McpTool>();
for (const tool of ALL_TOOLS) {
  toolMap.set(tool.name, tool);
}

// ── Server setup ────────────────────────────────────────────────────

const server = new Server(
  {
    name: "convex-mcp-nodebench",
    version: "0.9.4",
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
seedGotchasIfEmpty(CONVEX_GOTCHAS as unknown as Array<{
  key: string;
  content: string;
  category: string;
  severity: string;
  tags: string;
}>);

// ── Background: initialize embedding index for semantic search ───────
// Uses Agent-as-a-Graph bipartite corpus: tool nodes + domain nodes for graph-aware retrieval
const descMap = new Map(ALL_TOOLS.map((t) => [t.name, t.description]));

// Tool nodes: individual tools with full metadata text
const toolCorpus = REGISTRY.map((entry) => ({
  name: entry.name,
  text: `${entry.name} ${entry.tags.join(" ")} ${entry.category} ${entry.phase} ${descMap.get(entry.name) ?? ""}`,
  nodeType: "tool" as const,
}));

// Domain nodes: aggregate category descriptions for upward traversal
// When a domain matches, all tools in that domain get a sibling boost
const categoryTools = new Map<string, string[]>();
for (const entry of REGISTRY) {
  const list = categoryTools.get(entry.category) ?? [];
  list.push(entry.name);
  categoryTools.set(entry.category, list);
}
const domainCorpus = [...categoryTools.entries()].map(([category, toolNames]) => {
  const allTags = new Set<string>();
  const descs: string[] = [];
  for (const tn of toolNames) {
    const e = REGISTRY.find((r) => r.name === tn);
    if (e) e.tags.forEach((t) => allTags.add(t));
    const d = descMap.get(tn);
    if (d) descs.push(d);
  }
  return {
    name: `domain:${category}`,
    text: `${category} domain: ${toolNames.join(" ")} ${[...allTags].join(" ")} ${descs.map(d => d.slice(0, 80)).join(" ")}`,
    nodeType: "domain" as const,
  };
});

const embeddingCorpus = [...toolCorpus, ...domainCorpus];
initEmbeddingIndex(embeddingCorpus).catch(() => {
  /* Embedding init failed — semantic search stays disabled */
});

// ── Tool listing ────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: ALL_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
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
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
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
        uri: "convex://project-health",
        name: "Project Health Summary",
        description: "Latest quality gate score, audit coverage, and issue counts across all audit types",
        mimeType: "application/json",
      },
      {
        uri: "convex://recent-audits",
        name: "Recent Audit Results",
        description: "Summary of the 10 most recent audit runs with issue counts and timestamps",
        mimeType: "application/json",
      },
      {
        uri: "convex://gotcha-db",
        name: "Gotcha Knowledge Base",
        description: "All stored Convex gotchas (seeded + user-recorded) with categories and severity",
        mimeType: "application/json",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const db = getDb();

  if (uri === "convex://project-health") {
    // Aggregate across all projects
    const audits = db.prepare(
      "SELECT audit_type, issue_count, audited_at FROM audit_results ORDER BY audited_at DESC LIMIT 50"
    ).all() as any[];

    const byType: Record<string, { count: number; latest: string }> = {};
    for (const a of audits) {
      if (!byType[a.audit_type]) {
        byType[a.audit_type] = { count: a.issue_count, latest: a.audited_at };
      }
    }

    const totalIssues = Object.values(byType).reduce((s, v) => s + v.count, 0);
    const auditTypes = Object.keys(byType).length;

    const latestGate = db.prepare(
      "SELECT findings FROM deploy_checks WHERE check_type = 'quality_gate' ORDER BY checked_at DESC LIMIT 1"
    ).get() as any;

    let gateResult = null;
    if (latestGate?.findings) {
      try { gateResult = JSON.parse(latestGate.findings); } catch { /* skip */ }
    }

    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify({
          totalIssues,
          auditTypesRun: auditTypes,
          issuesByType: byType,
          latestQualityGate: gateResult ? { score: gateResult.score, grade: gateResult.grade, passed: gateResult.passed } : null,
          toolCount: ALL_TOOLS.length,
        }, null, 2),
      }],
    };
  }

  if (uri === "convex://recent-audits") {
    const audits = db.prepare(
      "SELECT id, project_dir, audit_type, issue_count, audited_at FROM audit_results ORDER BY audited_at DESC LIMIT 10"
    ).all() as any[];

    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify({ audits }, null, 2),
      }],
    };
  }

  if (uri === "convex://gotcha-db") {
    const gotchas = db.prepare(
      "SELECT key, category, severity, tags, source, updated_at FROM convex_gotchas ORDER BY updated_at DESC"
    ).all() as any[];

    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify({
          totalGotchas: gotchas.length,
          bySource: {
            seed: gotchas.filter(g => g.source === "seed").length,
            user: gotchas.filter(g => g.source === "user").length,
          },
          gotchas,
        }, null, 2),
      }],
    };
  }

  return {
    contents: [{
      uri,
      mimeType: "text/plain",
      text: `Unknown resource: ${uri}`,
    }],
  };
});

// ── MCP Prompts ─────────────────────────────────────────────────────

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "full-audit",
        description: "Run a complete Convex project audit: schema, functions, auth, queries, actions, type safety, transactions, storage, pagination, data modeling, dev setup, vectors, schedulers — then quality gate",
        arguments: [
          {
            name: "projectDir",
            description: "Absolute path to the project root",
            required: true,
          },
        ],
      },
      {
        name: "pre-deploy-checklist",
        description: "Step-by-step pre-deployment verification: audit critical issues, check env vars, review migration plan, run quality gate",
        arguments: [
          {
            name: "projectDir",
            description: "Absolute path to the project root",
            required: true,
          },
        ],
      },
      {
        name: "security-review",
        description: "Security-focused audit: authorization coverage, type safety, action safety, storage permissions",
        arguments: [
          {
            name: "projectDir",
            description: "Absolute path to the project root",
            required: true,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: promptArgs } = request.params;
  const projectDir = (promptArgs as any)?.projectDir ?? ".";

  if (name === "full-audit") {
    return {
      description: "Complete Convex project audit sequence",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text",
            text: `Run a complete audit of the Convex project at "${projectDir}". Execute these tools in order:

1. convex_audit_schema — Check schema.ts for anti-patterns
2. convex_audit_functions — Audit function registration and compliance
3. convex_audit_authorization — Check auth coverage on public endpoints
4. convex_audit_query_efficiency — Find unbounded queries and missing indexes
5. convex_audit_actions — Validate action safety (no ctx.db, error handling)
6. convex_check_type_safety — Find as-any casts and type issues
7. convex_audit_transaction_safety — Detect race conditions
8. convex_audit_storage_usage — Check file storage patterns
9. convex_audit_pagination — Validate pagination implementations
10. convex_audit_data_modeling — Check schema design quality
11. convex_audit_vector_search — Validate vector search setup
12. convex_audit_schedulers — Check scheduled function safety
13. convex_audit_dev_setup — Verify project setup
14. convex_quality_gate — Run configurable quality gate across all results

After running all audits, summarize:
- Total issues by severity (critical/warning/info)
- Top 5 most impactful issues to fix first
- Quality gate score and grade
- Trend direction if previous audits exist (use convex_audit_diff)`,
          },
        },
      ],
    };
  }

  if (name === "pre-deploy-checklist") {
    return {
      description: "Pre-deployment verification sequence",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text",
            text: `Run pre-deployment checks for the Convex project at "${projectDir}":

1. convex_pre_deploy_gate — Structural checks (schema, auth config, initialization)
2. convex_check_env_vars — Verify all required env vars are set
3. convex_audit_authorization — Ensure auth coverage is adequate
4. convex_audit_actions — No ctx.db access in actions
5. convex_snapshot_schema — Capture current schema state
6. convex_schema_migration_plan — Compare against previous snapshot for breaking changes
7. convex_quality_gate — Final quality check with thresholds

Report: DEPLOY or DO NOT DEPLOY with specific blockers to fix.`,
          },
        },
      ],
    };
  }

  if (name === "security-review") {
    return {
      description: "Security-focused audit sequence",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text",
            text: `Run a security review of the Convex project at "${projectDir}":

1. convex_audit_authorization — Auth coverage on all public endpoints
2. convex_check_type_safety — Type safety bypasses (as any)
3. convex_audit_actions — Action safety (ctx.db, error handling, "use node")
4. convex_audit_storage_usage — Storage permission patterns
5. convex_audit_pagination — Unbounded numItems (DoS risk)
6. convex_audit_transaction_safety — Race condition risks

Focus on: unauthorized data access, unvalidated inputs, missing error boundaries, and potential data corruption vectors.`,
          },
        },
      ],
    };
  }

  return {
    description: "Unknown prompt",
    messages: [{
      role: "user" as const,
      content: { type: "text", text: `Unknown prompt: ${name}` },
    }],
  };
});

// ── Start server ────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server is now running on stdio
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
