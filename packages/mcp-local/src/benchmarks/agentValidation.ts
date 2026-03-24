/**
 * Agent Validation Harness — Simulates how real AI agents (Claude Code,
 * OpenClaw, Cursor, Windsurf, generic MCP clients) interact with the
 * NodeBench MCP server and scores the experience.
 *
 * Validates: preset loading, tool count limits, progressive discovery,
 * toolset expansion, and workflow completion for each persona.
 *
 * All scoring is deterministic and heuristic-based (no LLM calls).
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";
import { loadToolsets, TOOLSET_MAP, ALL_DOMAIN_KEYS } from "../toolsetRegistry.js";
import {
  hybridSearch,
  ALL_REGISTRY_ENTRIES,
  TOOL_REGISTRY,
  WORKFLOW_CHAINS,
} from "../tools/toolRegistry.js";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface AgentPersona {
  name: string;
  maxTools: number; // tool limit (Cursor=40, others=unlimited)
  supportsWebSocket: boolean;
  supportsOAuth: boolean;
  preferredPreset: string;
  typicalWorkflow: string;
}

export interface PersonaScores {
  toolDiscovery: number;   // 0-1 — can discover_tools find relevant tools?
  workflowCompletion: number; // 0-1 — does the typical workflow chain exist?
  presetFit: number;       // 0-1 — does the preset load within maxTools?
  errorRate: number;       // 0-1 — 1 = no errors, 0 = all errors
}

export interface PersonaResult {
  name: string;
  scores: PersonaScores;
  passed: boolean;
  errors: string[];
  toolCount: number;
  presetUsed: string;
  durationMs: number;
}

export interface AgentValidationResult {
  personas: PersonaResult[];
  overallPassRate: number;
  recommendations: string[];
  totalDurationMs: number;
}

export interface WebMcpReadiness {
  ready: boolean;
  missingItems: string[];
}

/* ================================================================== */
/*  Persona Definitions                                                */
/* ================================================================== */

const AGENT_PERSONAS: AgentPersona[] = [
  {
    name: "claude_code",
    maxTools: Infinity,
    supportsWebSocket: true,
    supportsOAuth: false,
    preferredPreset: "founder",
    typicalWorkflow: "weekly_reset",
  },
  {
    name: "openclaw",
    maxTools: Infinity,
    supportsWebSocket: true,
    supportsOAuth: false,
    preferredPreset: "core",
    typicalWorkflow: "research",
  },
  {
    name: "cursor",
    maxTools: 40,
    supportsWebSocket: false,
    supportsOAuth: false,
    preferredPreset: "cursor",
    typicalWorkflow: "code_review",
  },
  {
    name: "windsurf",
    maxTools: Infinity,
    supportsWebSocket: false,
    supportsOAuth: false,
    preferredPreset: "core",
    typicalWorkflow: "code_review",
  },
  {
    name: "generic_mcp",
    maxTools: Infinity,
    supportsWebSocket: true,
    supportsOAuth: false,
    preferredPreset: "starter",
    typicalWorkflow: "company_search",
  },
];

/* ================================================================== */
/*  Workflow → search queries mapping                                  */
/* ================================================================== */

const WORKFLOW_QUERIES: Record<string, string[]> = {
  weekly_reset: [
    "weekly review",
    "action tracking",
    "milestone",
    "session history",
  ],
  research: [
    "research",
    "web search",
    "knowledge",
    "analysis",
  ],
  code_review: [
    "verification",
    "quality gate",
    "gap",
    "test",
  ],
  company_search: [
    "company",
    "search",
    "deep sim",
    "decision",
  ],
};

/* ================================================================== */
/*  Preset → domain mapping (mirrors index.ts PRESETS)                 */
/* ================================================================== */

const PRESET_DOMAINS: Record<string, string[]> = {
  starter: ["deep_sim"],
  default: ["deep_sim"],
  core: [
    "verification", "eval", "quality_gate", "learning", "flywheel",
    "recon", "security", "boilerplate", "skill_update", "context_sandbox",
    "observability", "execution_trace", "mission_harness", "deep_sim", "founder",
  ],
  founder: ["deep_sim", "founder", "learning", "local_dashboard"],
  cursor: ["deep_sim", "quality_gate", "learning", "session_memory", "web", "toon"],
  full: ALL_DOMAIN_KEYS,
};

/* ================================================================== */
/*  Schema bootstrap (idempotent)                                      */
/* ================================================================== */

let _schemaReady = false;

function ensureSchema(): void {
  if (_schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_validation_runs (
      id            TEXT PRIMARY KEY,
      timestamp     TEXT NOT NULL,
      personaName   TEXT NOT NULL,
      presetUsed    TEXT NOT NULL,
      toolCount     INTEGER NOT NULL,
      toolDiscovery REAL NOT NULL,
      workflowCompletion REAL NOT NULL,
      presetFit     REAL NOT NULL,
      errorRate     REAL NOT NULL,
      passed        INTEGER NOT NULL,
      errors        TEXT,
      durationMs    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_agent_validation_persona
      ON agent_validation_runs(personaName);
    CREATE INDEX IF NOT EXISTS idx_agent_validation_timestamp
      ON agent_validation_runs(timestamp);
  `);
  _schemaReady = true;
}

/* ================================================================== */
/*  Per-persona validation                                             */
/* ================================================================== */

async function validatePersona(persona: AgentPersona): Promise<PersonaResult> {
  const startMs = Date.now();
  const errors: string[] = [];
  const scores: PersonaScores = {
    toolDiscovery: 0,
    workflowCompletion: 0,
    presetFit: 0,
    errorRate: 1, // start optimistic
  };

  /* ── Step 1: Load the persona's preferred preset ──────────────── */

  const domains = PRESET_DOMAINS[persona.preferredPreset];
  if (!domains) {
    errors.push(`Unknown preset: ${persona.preferredPreset}`);
    scores.errorRate = 0;
    return {
      name: persona.name,
      scores,
      passed: false,
      errors,
      toolCount: 0,
      presetUsed: persona.preferredPreset,
      durationMs: Date.now() - startMs,
    };
  }

  let tools: McpTool[];
  try {
    tools = await loadToolsets(domains);
  } catch (err) {
    errors.push(`loadToolsets failed: ${String(err)}`);
    scores.errorRate = 0;
    return {
      name: persona.name,
      scores,
      passed: false,
      errors,
      toolCount: 0,
      presetUsed: persona.preferredPreset,
      durationMs: Date.now() - startMs,
    };
  }

  const toolCount = tools.length;

  /* ── Step 2: Check tool count fits within maxTools ─────────────── */

  if (toolCount <= persona.maxTools) {
    scores.presetFit = 1;
  } else {
    // Partial credit: how close is the fit?
    scores.presetFit = Math.max(0, persona.maxTools / toolCount);
    errors.push(
      `Preset '${persona.preferredPreset}' loads ${toolCount} tools but ${persona.name} supports max ${persona.maxTools}`,
    );
  }

  /* ── Step 3: Simulate tool discovery via hybridSearch ──────────── */

  const queries = WORKFLOW_QUERIES[persona.typicalWorkflow] ?? ["tools"];
  let discoveredCount = 0;
  let totalExpected = 0;

  for (const query of queries) {
    totalExpected++;
    try {
      const allToolDescs = ALL_REGISTRY_ENTRIES.map((e) => ({
        name: e.name,
        description: `${e.category} ${e.tags.join(" ")}`,
      }));
      const results = hybridSearch(query, allToolDescs, {
        limit: 5,
        mode: "hybrid",
      });
      if (results.length > 0) {
        discoveredCount++;
      }
    } catch (err) {
      errors.push(`discover_tools('${query}') failed: ${String(err)}`);
    }
  }

  scores.toolDiscovery = totalExpected > 0 ? discoveredCount / totalExpected : 0;

  /* ── Step 4: Check workflow chain availability ─────────────────── */

  const chainKeys = Object.keys(WORKFLOW_CHAINS);
  // Search for a chain matching the persona's typical workflow
  const workflowKeywords = persona.typicalWorkflow.split("_");
  const matchingChain = chainKeys.find((key) =>
    workflowKeywords.some((kw) => key.toLowerCase().includes(kw)),
  );

  if (matchingChain) {
    scores.workflowCompletion = 1;
  } else {
    // Partial credit: can we at least find tools relevant to the workflow?
    const relevantTools = ALL_REGISTRY_ENTRIES.filter((e) =>
      workflowKeywords.some(
        (kw) =>
          e.name.includes(kw) ||
          e.tags.some((t) => t.includes(kw)) ||
          e.category.includes(kw),
      ),
    );
    scores.workflowCompletion = relevantTools.length > 0
      ? Math.min(1, relevantTools.length / 3)
      : 0;
  }

  /* ── Step 5: Simulate load_toolset expansion ──────────────────── */

  // Verify that loading an additional domain works without error
  const expansionDomain = domains.includes("learning") ? "web" : "learning";
  try {
    await loadToolsets([expansionDomain]);
    // Expansion succeeded — no error
  } catch (err) {
    errors.push(`Toolset expansion to '${expansionDomain}' failed: ${String(err)}`);
  }

  /* ── Compute error rate ───────────────────────────────────────── */

  const totalChecks = 4; // preset load, discovery, workflow, expansion
  scores.errorRate = Math.max(0, 1 - errors.length / totalChecks);

  /* ── Pass/fail threshold ──────────────────────────────────────── */

  const avgScore =
    (scores.toolDiscovery +
      scores.workflowCompletion +
      scores.presetFit +
      scores.errorRate) /
    4;
  const passed = avgScore >= 0.6;

  return {
    name: persona.name,
    scores,
    passed,
    errors,
    toolCount,
    presetUsed: persona.preferredPreset,
    durationMs: Date.now() - startMs,
  };
}

/* ================================================================== */
/*  Run all personas                                                   */
/* ================================================================== */

export async function runAgentValidation(
  personaFilter?: string,
): Promise<AgentValidationResult> {
  ensureSchema();
  const overallStart = Date.now();

  const personas = personaFilter
    ? AGENT_PERSONAS.filter((p) => p.name === personaFilter)
    : AGENT_PERSONAS;

  if (personas.length === 0 && personaFilter) {
    return {
      personas: [],
      overallPassRate: 0,
      recommendations: [`Unknown agent persona: '${personaFilter}'. Available: ${AGENT_PERSONAS.map((p) => p.name).join(", ")}`],
      totalDurationMs: Date.now() - overallStart,
    };
  }

  const results: PersonaResult[] = [];

  for (const persona of personas) {
    const result = await validatePersona(persona);
    results.push(result);

    // Persist to SQLite
    const db = getDb();
    db.prepare(`
      INSERT INTO agent_validation_runs
        (id, timestamp, personaName, presetUsed, toolCount,
         toolDiscovery, workflowCompletion, presetFit, errorRate,
         passed, errors, durationMs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      genId("av"),
      new Date().toISOString(),
      result.name,
      result.presetUsed,
      result.toolCount,
      result.scores.toolDiscovery,
      result.scores.workflowCompletion,
      result.scores.presetFit,
      result.scores.errorRate,
      result.passed ? 1 : 0,
      JSON.stringify(result.errors),
      result.durationMs,
    );
  }

  /* ── Generate recommendations ─────────────────────────────────── */

  const recommendations: string[] = [];
  const passedCount = results.filter((r) => r.passed).length;
  const overallPassRate = results.length > 0 ? passedCount / results.length : 0;

  // Analyze failure patterns
  const lowDiscovery = results.filter((r) => r.scores.toolDiscovery < 0.5);
  if (lowDiscovery.length > 0) {
    recommendations.push(
      `Tool discovery scored low for: ${lowDiscovery.map((r) => r.name).join(", ")}. ` +
        `Consider adding more tags/aliases to tool registry entries for their workflow queries.`,
    );
  }

  const lowPresetFit = results.filter((r) => r.scores.presetFit < 1);
  if (lowPresetFit.length > 0) {
    recommendations.push(
      `Preset overflow for: ${lowPresetFit.map((r) => `${r.name} (${r.toolCount}/${AGENT_PERSONAS.find((p) => p.name === r.name)?.maxTools ?? "?"})`).join(", ")}. ` +
        `Create a slimmer preset or enable progressive discovery for these agents.`,
    );
  }

  const lowWorkflow = results.filter((r) => r.scores.workflowCompletion < 0.5);
  if (lowWorkflow.length > 0) {
    recommendations.push(
      `Missing workflow chains for: ${lowWorkflow.map((r) => `${r.name} (${AGENT_PERSONAS.find((p) => p.name === r.name)?.typicalWorkflow})`).join(", ")}. ` +
        `Add WORKFLOW_CHAINS entries in toolRegistry.ts for these workflows.`,
    );
  }

  const highErrorRate = results.filter((r) => r.scores.errorRate < 0.75);
  if (highErrorRate.length > 0) {
    recommendations.push(
      `High error rate for: ${highErrorRate.map((r) => `${r.name} (${r.errors.length} errors)`).join(", ")}. ` +
        `Review error details for root cause.`,
    );
  }

  if (overallPassRate === 1) {
    recommendations.push("All personas passed. Consider adding edge-case personas or stricter thresholds.");
  }

  return {
    personas: results,
    overallPassRate,
    recommendations,
    totalDurationMs: Date.now() - overallStart,
  };
}

/* ================================================================== */
/*  WebMCP Readiness Check                                             */
/* ================================================================== */

export function checkWebMcpReadiness(): WebMcpReadiness {
  const missingItems: string[] = [];

  // Check for WebMCP meta tags in index.html
  // These are not yet present — this is a placeholder for future integration
  missingItems.push("navigator.modelContext meta tag in index.html");
  missingItems.push("WebMCP tool declarations (<tool> elements)");
  missingItems.push("WebMCP manifest (/.well-known/mcp.json)");
  missingItems.push("Content-Security-Policy header for WebMCP origins");

  return {
    ready: missingItems.length === 0,
    missingItems,
  };
}

/* ================================================================== */
/*  MCP Tool: validate_agent_compatibility                             */
/* ================================================================== */

export const validateAgentCompatibilityTool: McpTool = {
  name: "validate_agent_compatibility",
  description:
    "Run the agent validation harness — simulates how AI agents (Claude Code, " +
    "OpenClaw, Cursor, Windsurf, generic MCP) interact with NodeBench tools. " +
    "Scores tool discovery, workflow completion, preset fit, and error rate " +
    "per persona. Pass agentName to run a single persona or omit for all 5.",
  inputSchema: {
    type: "object",
    properties: {
      agentName: {
        type: "string",
        description:
          "Run a single persona: claude_code, openclaw, cursor, windsurf, or generic_mcp. Omit to run all.",
        enum: ["claude_code", "openclaw", "cursor", "windsurf", "generic_mcp"],
      },
    },
  },
  annotations: {
    readOnlyHint: true,
  },
  handler: async (args: { agentName?: string }) => {
    const result = await runAgentValidation(args.agentName);
    const webMcp = checkWebMcpReadiness();

    return {
      ...result,
      webMcpReadiness: webMcp,
      summary:
        `${result.personas.length} persona(s) tested. ` +
        `Pass rate: ${(result.overallPassRate * 100).toFixed(0)}%. ` +
        `WebMCP: ${webMcp.ready ? "ready" : `not ready (${webMcp.missingItems.length} items missing)`}. ` +
        `Duration: ${result.totalDurationMs}ms.`,
    };
  },
};

/* ================================================================== */
/*  CLI entry point                                                    */
/* ================================================================== */

if (process.argv[1]?.endsWith("agentValidation.ts") || process.argv[1]?.endsWith("agentValidation.js")) {
  const personaArg = process.argv[2];
  console.log("=== NodeBench Agent Validation Harness ===\n");

  runAgentValidation(personaArg)
    .then((result) => {
      for (const p of result.personas) {
        const status = p.passed ? "PASS" : "FAIL";
        console.log(`[${status}] ${p.name} (preset: ${p.presetUsed}, tools: ${p.toolCount})`);
        console.log(`  toolDiscovery:      ${p.scores.toolDiscovery.toFixed(2)}`);
        console.log(`  workflowCompletion: ${p.scores.workflowCompletion.toFixed(2)}`);
        console.log(`  presetFit:          ${p.scores.presetFit.toFixed(2)}`);
        console.log(`  errorRate:          ${p.scores.errorRate.toFixed(2)}`);
        if (p.errors.length > 0) {
          console.log(`  errors: ${p.errors.join("; ")}`);
        }
        console.log();
      }

      console.log(`Overall pass rate: ${(result.overallPassRate * 100).toFixed(0)}%`);
      console.log(`Duration: ${result.totalDurationMs}ms\n`);

      if (result.recommendations.length > 0) {
        console.log("Recommendations:");
        for (const rec of result.recommendations) {
          console.log(`  - ${rec}`);
        }
      }

      const webMcp = checkWebMcpReadiness();
      console.log(`\nWebMCP readiness: ${webMcp.ready ? "READY" : "NOT READY"}`);
      if (webMcp.missingItems.length > 0) {
        console.log("  Missing:");
        for (const item of webMcp.missingItems) {
          console.log(`    - ${item}`);
        }
      }
    })
    .catch((err) => {
      console.error("Validation failed:", err);
      process.exit(1);
    });
}
