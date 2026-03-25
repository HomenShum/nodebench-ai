#!/usr/bin/env npx tsx
/**
 * pipelineEval.ts — Multi-step pipeline eval harness for NodeBench MCP
 *
 * Unlike llmJudgeEval.ts which tests tools independently, this harness tests
 * realistic multi-step chains where Tool A's output feeds Tool B's input.
 *
 * Architecture:
 *   1. Pipeline Definitions — 6 canonical pipelines modeling real agent workflows
 *   2. Chaining Engine — executes steps sequentially, extracts fields from output
 *   3. LLM Judge — Gemini Flash Lite evaluates 5 boolean criteria on full trace
 *   4. Per-step tracking — tool name, args, output size, duration, pass/fail
 *   5. SQLite persistence — pipeline_eval_runs + pipeline_eval_steps tables
 *
 * Usage:
 *   cd packages/mcp-local
 *   npx tsx src/benchmarks/pipelineEval.ts [--pipeline NAME] [--all]
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";
import { _setDbAccessor } from "../tools/toolRegistry.js";
import { loadToolsets, ALL_DOMAIN_KEYS } from "../toolsetRegistry.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type PipelineName =
  | "founder_weekly_reset"
  | "company_intelligence"
  | "competitor_brief"
  | "pre_delegation"
  | "important_change_review"
  | "session_memory_cycle";

export interface PipelineStep {
  /** Tool name to call */
  tool: string;
  /** Static args merged with dynamic args from previous steps */
  staticArgs: Record<string, unknown>;
  /**
   * Functions that extract values from the previous step's output to build
   * dynamic args. Key = arg name, value = extractor function.
   */
  dynamicArgs?: Record<string, (prevOutput: unknown) => unknown>;
  /** Human-readable description of what this step does */
  description: string;
}

export interface PipelineDefinition {
  name: PipelineName;
  description: string;
  steps: PipelineStep[];
}

export interface StepResult {
  stepIndex: number;
  tool: string;
  description: string;
  args: Record<string, unknown>;
  ok: boolean;
  outputSize: number;
  outputPreview: string;
  error?: string;
  ms: number;
}

export interface PipelineCriterion {
  criterion: string;
  weight: number;
  pass: boolean;
  evidence: string;
}

export interface PipelineRunResult {
  pipelineName: PipelineName;
  runId: string;
  steps: StepResult[];
  criteria: PipelineCriterion[];
  overallPass: boolean;
  totalMs: number;
  timestamp: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMA
// ══════════════════════════════════════════════════════════════════════════════

const PIPELINE_EVAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS pipeline_eval_runs (
  run_id         TEXT PRIMARY KEY,
  pipeline_name  TEXT NOT NULL,
  timestamp      TEXT NOT NULL DEFAULT (datetime('now')),
  step_count     INTEGER NOT NULL DEFAULT 0,
  steps_passed   INTEGER NOT NULL DEFAULT 0,
  overall_pass   INTEGER NOT NULL DEFAULT 0,
  criteria_json  TEXT,
  total_ms       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pipeline_eval_steps (
  id          TEXT PRIMARY KEY,
  run_id      TEXT NOT NULL,
  step_index  INTEGER NOT NULL,
  tool        TEXT NOT NULL,
  description TEXT,
  args_json   TEXT,
  ok          INTEGER NOT NULL DEFAULT 0,
  output_size INTEGER NOT NULL DEFAULT 0,
  output_preview TEXT,
  error       TEXT,
  ms          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pipeline_eval_steps_run ON pipeline_eval_steps(run_id);
`;

function ensureSchema(): void {
  const db = getDb();
  db.exec(PIPELINE_EVAL_SCHEMA);
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST DATA SEEDING — populate SQLite before pipeline execution
// ══════════════════════════════════════════════════════════════════════════════

const SEED_PREFIX = "pipe_eval_";

function ensureToolSchemas(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS causal_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      eventType TEXT NOT NULL,
      payload TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS causal_important_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      changeId TEXT UNIQUE NOT NULL,
      changeCategory TEXT NOT NULL,
      impactScore REAL NOT NULL DEFAULT 0,
      impactReason TEXT,
      affectedEntities TEXT,
      suggestedAction TEXT,
      status TEXT NOT NULL DEFAULT 'detected',
      timestampMs INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS founder_packets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      packetId TEXT UNIQUE NOT NULL,
      sessionId TEXT,
      packetType TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'founder',
      content TEXT NOT NULL,
      metadata TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tracking_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actionId TEXT UNIQUE NOT NULL,
      sessionId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      category TEXT NOT NULL,
      beforeState TEXT,
      afterState TEXT,
      reasoning TEXT,
      filesChanged TEXT,
      impactLevel TEXT NOT NULL,
      dayOfWeek TEXT NOT NULL,
      weekNumber INTEGER NOT NULL,
      month TEXT NOT NULL,
      quarter TEXT NOT NULL,
      year INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tracking_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      milestoneId TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      evidence TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS intent_residuals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intentId TEXT UNIQUE NOT NULL,
      intent TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      context TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS session_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT UNIQUE NOT NULL,
      summary TEXT NOT NULL,
      toolCount INTEGER NOT NULL DEFAULT 0,
      entityCount INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS recon_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT UNIQUE NOT NULL,
      target TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'quick',
      status TEXT NOT NULL DEFAULT 'active',
      findings TEXT,
      metadata TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seedPipelineData(): void {
  const db = getDb();
  ensureToolSchemas();

  const iso = new Date().toISOString();
  const dayAgo = Date.now() - 86_400_000;

  // Seed events
  const events = [
    { userId: `${SEED_PREFIX}user`, eventType: "packet.generated", payload: JSON.stringify({ summary: "Weekly founder briefing generated", entityId: "nodebench" }), createdAt: iso },
    { userId: `${SEED_PREFIX}user`, eventType: "recon.completed", payload: JSON.stringify({ target: "Anthropic", findings: 5 }), createdAt: iso },
    { userId: `${SEED_PREFIX}user`, eventType: "strategy.review", payload: JSON.stringify({ topic: "MCP distribution", status: "active" }), createdAt: iso },
  ];
  const evtStmt = db.prepare(`INSERT OR IGNORE INTO causal_events (userId, eventType, payload, createdAt) VALUES (?, ?, ?, ?)`);
  for (const e of events) evtStmt.run(e.userId, e.eventType, e.payload, e.createdAt);

  // Seed important changes
  const changes = [
    { changeId: `${SEED_PREFIX}chg_001`, changeCategory: "competitive", impactScore: 0.85, impactReason: "Anthropic launched Model Context Protocol marketplace with 200+ servers", affectedEntities: JSON.stringify(["anthropic", "nodebench"]), suggestedAction: "Evaluate marketplace listing for NodeBench", status: "detected", timestampMs: dayAgo },
    { changeId: `${SEED_PREFIX}chg_002`, changeCategory: "product", impactScore: 0.72, impactReason: "Supermemory raised $4M seed for memory-layer MCP server", affectedEntities: JSON.stringify(["supermemory"]), suggestedAction: "Analyze differentiation vs Supermemory approach", status: "detected", timestampMs: dayAgo + 3600_000 },
    { changeId: `${SEED_PREFIX}chg_003`, changeCategory: "strategy", impactScore: 0.68, impactReason: "NodeBench eval pass rate reached 100% — ready for distribution push", affectedEntities: JSON.stringify(["nodebench"]), suggestedAction: "Publish to npm and MCP registry", status: "detected", timestampMs: dayAgo + 7200_000 },
  ];
  const chgStmt = db.prepare(`INSERT OR IGNORE INTO causal_important_changes (changeId, changeCategory, impactScore, impactReason, affectedEntities, suggestedAction, status, timestampMs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const c of changes) chgStmt.run(c.changeId, c.changeCategory, c.impactScore, c.impactReason, c.affectedEntities, c.suggestedAction, c.status, c.timestampMs);

  // Seed a recon session for competitor_brief pipeline
  // recon_sessions schema: id, target, description, status, created_at
  try {
    const reconStmt = db.prepare(`INSERT OR IGNORE INTO recon_sessions (id, target, description, status, created_at) VALUES (?, ?, ?, ?, ?)`);
    reconStmt.run(
      `${SEED_PREFIX}recon_supermemory`,
      "Supermemory",
      "Memory-layer MCP server competitor analysis",
      "completed",
      iso,
    );
    // Also seed a finding for this session
    db.prepare(`INSERT OR IGNORE INTO recon_findings (id, session_id, category, finding, severity, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(`${SEED_PREFIX}finding_001`, `${SEED_PREFIX}recon_supermemory`, "new_feature", "Supermemory raised $4M seed for universal memory infrastructure with MCP distribution", "medium", "web_search", iso);
  } catch { /* table may not exist yet — will be created by run_recon */ }

  console.log(`[seedPipelineData] Seeded: 3 events, 3 important_changes, 1 recon session`);
}

function cleanupPipelineData(): void {
  const db = getDb();
  const prefix = `${SEED_PREFIX}%`;
  try {
    db.exec(`DELETE FROM causal_events WHERE userId LIKE '${prefix}'`);
    db.exec(`DELETE FROM causal_important_changes WHERE changeId LIKE '${prefix}'`);
    db.exec(`DELETE FROM recon_sessions WHERE sessionId LIKE '${prefix}'`);
    db.exec(`DELETE FROM tracking_actions WHERE sessionId LIKE '${prefix}'`);
    db.exec(`DELETE FROM tracking_milestones WHERE milestoneId LIKE '${prefix}'`);
    db.exec(`DELETE FROM intent_residuals WHERE intentId LIKE '${prefix}'`);
  } catch {
    /* tables may not exist yet */
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// OUTPUT EXTRACTION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/** Extract text from MCP content blocks or raw output */
function extractText(result: unknown): string {
  if (!result) return "(null)";
  if (typeof result === "string") return result;
  if (Array.isArray(result)) {
    const texts = result
      .map((block: any) => {
        if (typeof block === "string") return block;
        if (block?.type === "text") return block.text;
        if (block?.text) return block.text;
        return JSON.stringify(block);
      })
      .filter(Boolean);
    return texts.join("\n") || JSON.stringify(result);
  }
  if (typeof result === "object") return JSON.stringify(result);
  return String(result);
}

/** Try to parse JSON from text, return the object or null */
function tryParseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, unknown>;
  } catch {
    // Try extracting JSON from content blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      } catch { /* not JSON */ }
    }
  }
  return null;
}

/** Extract a nested field from an object using a dot path */
function extractField(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ══════════════════════════════════════════════════════════════════════════════
// PIPELINE DEFINITIONS — 6 canonical multi-step chains
// ══════════════════════════════════════════════════════════════════════════════

const PIPELINES: PipelineDefinition[] = [
  // ── Pipeline 1: founder_weekly_reset ──────────────────────────────
  {
    name: "founder_weekly_reset",
    description: "Full weekly reset: discover → load → synthesize → track → milestone",
    steps: [
      {
        tool: "discover_tools",
        staticArgs: { query: "founder weekly reset", limit: 10 },
        description: "Discover tools for founder weekly reset workflow",
      },
      {
        tool: "founder_local_weekly_reset",
        staticArgs: { query: "NodeBench weekly founder reset" },
        description: "Run the weekly reset pipeline",
      },
      {
        tool: "track_action",
        staticArgs: {
          category: "strategy",
          action: "weekly_reset",
          beforeState: "{}",
        },
        dynamicArgs: {
          afterState: (prev: unknown) => {
            const text = extractText(prev);
            return text.slice(0, 500);
          },
        },
        description: "Track the weekly reset action with before/after state",
      },
      {
        tool: "track_milestone",
        staticArgs: {
          title: "Weekly reset completed",
          category: "operations",
        },
        dynamicArgs: {
          description: (prev: unknown) => {
            const text = extractText(prev);
            return `Weekly reset tracked: ${text.slice(0, 200)}`;
          },
        },
        description: "Record a milestone for the completed weekly reset",
      },
    ],
  },

  // ── Pipeline 2: company_intelligence ──────────────────────────────
  {
    name: "company_intelligence",
    description: "Company analysis: discover → synthesize → export → track action",
    steps: [
      {
        tool: "discover_tools",
        staticArgs: { query: "company analysis Anthropic", limit: 10 },
        description: "Discover tools for company analysis",
      },
      {
        tool: "founder_local_synthesize",
        staticArgs: {
          query: "Analyze Anthropic competitive position",
          includeWeb: false,
          packetType: "company_search",
          daysBack: 7,
        },
        description: "Synthesize Anthropic competitive analysis",
      },
      {
        tool: "export_artifact_packet",
        staticArgs: { format: "markdown", audience: "banker", title: "Anthropic Competitive Analysis" },
        dynamicArgs: {
          content: (prev: unknown) => {
            const text = extractText(prev);
            const parsed = tryParseJson(text) as Record<string, unknown> | null;
            // Build a rich content object for the export
            if (parsed) {
              const syn = parsed.synthesis as Record<string, unknown> | undefined;
              return {
                summary: syn?.summary ?? parsed.summary ?? text.slice(0, 500),
                keyFindings: syn?.keyFindings ?? parsed.keyFindings ?? [],
                entities: syn?.entities ?? parsed.entities ?? ["Anthropic"],
                metrics: syn?.metrics ?? parsed.metrics ?? [],
                risks: syn?.risks ?? parsed.risks ?? [],
                nextSteps: syn?.nextSteps ?? parsed.nextSteps ?? [],
              };
            }
            return { summary: text.slice(0, 2000), entities: ["Anthropic"] };
          },
        },
        description: "Export the synthesis as a markdown artifact for banker audience",
      },
      {
        tool: "track_action",
        staticArgs: {
          category: "research",
          action: "anthropic_analysis_exported",
        },
        dynamicArgs: {
          afterState: (prev: unknown) => extractText(prev).slice(0, 300),
        },
        description: "Track the analysis export action",
      },
    ],
  },

  // ── Pipeline 3: competitor_brief ──────────────────────────────────
  {
    name: "competitor_brief",
    description: "Competitor research: discover → recon → synthesize → export → track",
    steps: [
      {
        tool: "discover_tools",
        staticArgs: { query: "competitor analysis", limit: 10 },
        description: "Discover tools for competitor analysis",
      },
      {
        tool: "run_recon",
        staticArgs: { target: "Supermemory", scope: "full", webEnrich: false },
        description: "Run recon on Supermemory competitor",
      },
      {
        tool: "founder_local_synthesize",
        dynamicArgs: {
          query: (prev: unknown) => {
            const text = extractText(prev);
            return `Analyze Supermemory as competitor based on recon findings: ${text.slice(0, 500)}`;
          },
        },
        staticArgs: { packetType: "competitor_brief", daysBack: 7 },
        description: "Synthesize recon findings into a competitor brief",
      },
      {
        tool: "export_artifact_packet",
        staticArgs: { format: "markdown", audience: "founder" },
        dynamicArgs: {
          content: (prev: unknown) => {
            const text = extractText(prev);
            const parsed = tryParseJson(text);
            if (parsed?.synthesis) return String(parsed.synthesis);
            return text.slice(0, 2000);
          },
        },
        description: "Export the competitor brief as a markdown artifact",
      },
      {
        tool: "track_action",
        staticArgs: { category: "research", action: "competitor_brief_exported" },
        dynamicArgs: {
          afterState: (prev: unknown) => extractText(prev).slice(0, 300),
        },
        description: "Track the competitor brief export action",
      },
    ],
  },

  // ── Pipeline 4: pre_delegation ────────────────────────────────────
  {
    name: "pre_delegation",
    description: "Delegation prep: synthesize → export → track intent → track action",
    steps: [
      {
        tool: "founder_local_synthesize",
        staticArgs: {
          query: "Prepare delegation packet for improving NodeBench suppression quality",
          packetType: "pre_delegation",
          daysBack: 7,
        },
        description: "Synthesize a delegation packet for suppression quality improvement",
      },
      {
        tool: "export_artifact_packet",
        staticArgs: { format: "markdown", audience: "teammate" },
        dynamicArgs: {
          content: (prev: unknown) => {
            const text = extractText(prev);
            const parsed = tryParseJson(text);
            if (parsed?.synthesis) return String(parsed.synthesis);
            if (parsed?.content) return String(parsed.content);
            return text.slice(0, 2000);
          },
        },
        description: "Export the delegation packet as markdown for a teammate",
      },
      {
        tool: "track_intent",
        staticArgs: {
          intent: "Improve suppression quality",
          status: "active",
        },
        description: "Track the delegation intent as active",
      },
      {
        tool: "track_action",
        staticArgs: {
          category: "delegation",
          action: "packet_created",
        },
        dynamicArgs: {
          afterState: (prev: unknown) => {
            const text = extractText(prev);
            return text.slice(0, 300);
          },
        },
        description: "Record the delegation packet creation action",
      },
    ],
  },

  // ── Pipeline 5: important_change_review ───────────────────────────
  {
    name: "important_change_review",
    description: "Change review: get alerts → synthesize → track action → track milestone",
    steps: [
      {
        tool: "get_proactive_alerts",
        staticArgs: { lookbackDays: 7, limit: 10 },
        description: "Get proactive alerts for recent changes",
      },
      {
        tool: "founder_local_synthesize",
        dynamicArgs: {
          query: (prev: unknown) => {
            const text = extractText(prev);
            return `Summarize these alerts and recommend next actions: ${text.slice(0, 500)}`;
          },
        },
        staticArgs: { packetType: "important_change", daysBack: 7 },
        description: "Synthesize a summary of important changes with action recommendations",
      },
      {
        tool: "track_action",
        staticArgs: { category: "strategy", action: "change_review_completed" },
        dynamicArgs: {
          afterState: (prev: unknown) => extractText(prev).slice(0, 300),
        },
        description: "Track the change review action",
      },
      {
        tool: "track_milestone",
        staticArgs: { title: "Important change review completed", category: "strategy" },
        dynamicArgs: {
          description: (prev: unknown) => `Change review: ${extractText(prev).slice(0, 200)}`,
        },
        description: "Record a milestone for the change review",
      },
    ],
  },

  // ── Pipeline 6: session_memory_cycle ──────────────────────────────
  {
    name: "session_memory_cycle",
    description: "Memory lifecycle: track intent → synthesize → summarize → recover → complete intent",
    steps: [
      {
        tool: "track_intent",
        staticArgs: {
          intent: "Investigate Anthropic valuation",
          status: "active",
        },
        description: "Track the investigation intent as active",
      },
      {
        tool: "founder_local_synthesize",
        staticArgs: {
          query: "What is Anthropic's current valuation?",
          packetType: "company_search",
          daysBack: 7,
        },
        description: "Synthesize information about Anthropic valuation",
      },
      {
        tool: "summarize_session",
        staticArgs: { sessionId: "pipeline_eval_session" },
        description: "Summarize the current session",
      },
      {
        tool: "get_compaction_recovery",
        staticArgs: {},
        description: "Recover compacted session context",
      },
      {
        tool: "track_intent",
        staticArgs: {
          intent: "Investigate Anthropic valuation",
          status: "completed",
        },
        description: "Mark the investigation intent as completed",
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTOR
// ══════════════════════════════════════════════════════════════════════════════

function findTool(tools: McpTool[], name: string): McpTool | null {
  return tools.find((t) => t.name === name) ?? null;
}

async function callTool(
  tool: McpTool,
  args: Record<string, unknown> = {},
): Promise<{ ok: boolean; result: unknown; error?: string; ms: number }> {
  const start = Date.now();
  try {
    const result = await tool.handler(args);
    return { ok: true, result, ms: Date.now() - start };
  } catch (err: any) {
    return { ok: false, result: null, error: err?.message ?? String(err), ms: Date.now() - start };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PIPELINE RUNNER — sequential execution with output chaining
// ══════════════════════════════════════════════════════════════════════════════

async function runPipeline(
  pipeline: PipelineDefinition,
  allTools: McpTool[],
): Promise<StepResult[]> {
  const results: StepResult[] = [];
  let prevOutput: unknown = null;

  for (let i = 0; i < pipeline.steps.length; i++) {
    const step = pipeline.steps[i];
    const tool = findTool(allTools, step.tool);

    if (!tool) {
      results.push({
        stepIndex: i,
        tool: step.tool,
        description: step.description,
        args: step.staticArgs,
        ok: false,
        outputSize: 0,
        outputPreview: "",
        error: `Tool "${step.tool}" not found in loaded toolsets`,
        ms: 0,
      });
      // Continue to next step — don't break the chain entirely
      continue;
    }

    // Build args: merge static + dynamic (extracted from previous output)
    const args: Record<string, unknown> = { ...step.staticArgs };
    if (step.dynamicArgs && prevOutput !== null) {
      for (const [key, extractor] of Object.entries(step.dynamicArgs)) {
        try {
          const extracted = extractor(prevOutput);
          if (extracted !== undefined && extracted !== null) {
            args[key] = extracted;
          }
        } catch {
          // Extractor failed — use static arg or skip
        }
      }
    }

    const { ok, result, error, ms } = await callTool(tool, args);
    const outputText = ok ? extractText(result) : (error ?? "(error)");

    results.push({
      stepIndex: i,
      tool: step.tool,
      description: step.description,
      args,
      ok,
      outputSize: outputText.length,
      outputPreview: outputText.slice(0, 500),
      error: ok ? undefined : error,
      ms,
    });

    // Pass output forward for chaining
    prevOutput = result;
  }

  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
// PIPELINE-LEVEL BOOLEAN CRITERIA (structural + LLM-judged)
// ══════════════════════════════════════════════════════════════════════════════

interface PipelineBooleanCriterion {
  criterion: string;
  weight: number;
}

const PIPELINE_CRITERIA: PipelineBooleanCriterion[] = [
  {
    criterion: "Final output contains structured data derived from earlier pipeline steps",
    weight: 2,
  },
  {
    criterion: "No step produced only errors or empty results",
    weight: 2,
  },
  {
    criterion: "Output entity names are consistent across pipeline steps",
    weight: 1,
  },
  {
    criterion: "Final artifact is usable without re-running the pipeline",
    weight: 1,
  },
  {
    criterion: "Pipeline completed all steps (no step was skipped due to missing input)",
    weight: 2,
  },
];

/** Structural code-graded criteria — deterministic, no LLM needed */
function codeGradeCriteria(
  steps: StepResult[],
  pipeline: PipelineDefinition,
): PipelineCriterion[] {
  const results: PipelineCriterion[] = [];

  // Criterion: "No step produced only errors or empty results"
  const allStepsProduced = steps.every((s) => s.ok && s.outputSize > 10);
  const errorSteps = steps.filter((s) => !s.ok || s.outputSize <= 10);
  results.push({
    criterion: PIPELINE_CRITERIA[1].criterion,
    weight: PIPELINE_CRITERIA[1].weight,
    pass: allStepsProduced,
    evidence: allStepsProduced
      ? `All ${steps.length} steps produced non-empty output`
      : `${errorSteps.length} step(s) failed or empty: ${errorSteps.map((s) => s.tool).join(", ")}`,
  });

  // Criterion: "Pipeline completed all steps (no step was skipped)"
  const allCompleted = steps.length === pipeline.steps.length && steps.every((s) => s.outputSize > 0 || s.ok);
  const missingTools = pipeline.steps
    .filter((_, i) => !steps[i] || steps[i].error?.includes("not found"))
    .map((s) => s.tool);
  results.push({
    criterion: PIPELINE_CRITERIA[4].criterion,
    weight: PIPELINE_CRITERIA[4].weight,
    pass: allCompleted,
    evidence: allCompleted
      ? `All ${pipeline.steps.length} steps executed`
      : `Missing/skipped: ${missingTools.join(", ") || errorSteps.map((s) => s.tool).join(", ")}`,
  });

  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
// LLM JUDGE — Gemini evaluates remaining criteria on full pipeline trace
// ══════════════════════════════════════════════════════════════════════════════

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

async function geminiJudgePipeline(
  pipeline: PipelineDefinition,
  steps: StepResult[],
  codeGraded: PipelineCriterion[],
): Promise<PipelineCriterion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // No API key — return heuristic-based results for LLM criteria
    return llmCriteriaHeuristic(steps);
  }

  // Build the full trace for the judge
  const traceText = steps
    .map(
      (s) =>
        `Step ${s.stepIndex + 1} [${s.tool}]: ${s.description}\n` +
        `  Args: ${JSON.stringify(s.args).slice(0, 300)}\n` +
        `  OK: ${s.ok}, Size: ${s.outputSize}b, Time: ${s.ms}ms\n` +
        `  Output: ${s.outputPreview}`,
    )
    .join("\n\n");

  // Only ask Gemini about criteria NOT already code-graded
  const codeGradedCriteria = new Set(codeGraded.map((c) => c.criterion));
  const llmCriteria = PIPELINE_CRITERIA.filter((c) => !codeGradedCriteria.has(c.criterion));

  if (llmCriteria.length === 0) return [];

  const criteriaList = llmCriteria.map((c, i) => `${i + 1}. ${c.criterion} (weight: ${c.weight})`).join("\n");

  const prompt = `You are an evaluation judge for NodeBench MCP pipeline chains.

Pipeline: "${pipeline.name}" — ${pipeline.description}

Full execution trace:

${traceText.slice(0, 8000)}

Evaluate these criteria:
${criteriaList}

RULES:
- A pipeline step that returns structured JSON or prose analysis is valid output
- "Derived from earlier steps" means the final output references entities, data, or concepts from previous steps
- "Entity names consistent" means if step 1 mentions "Anthropic", later steps should too (not switch to a different entity)
- "Usable without re-running" means the final output has enough context to be read standalone

Respond in this exact JSON format (no markdown, no explanation):
{
  "criteria": [
    {"criterion": "exact criterion text", "pass": true, "evidence": "brief explanation"}
  ]
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      console.warn(`[gemini] HTTP ${resp.status}: ${resp.statusText}`);
      return llmCriteriaHeuristic(steps);
    }

    const json = (await resp.json()) as any;
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return llmCriteriaHeuristic(steps);

    const parsed = JSON.parse(jsonMatch[0]) as {
      criteria: Array<{ criterion: string; pass: boolean; evidence: string }>;
    };

    return parsed.criteria.map((c) => {
      const def = llmCriteria.find((lc) => c.criterion.includes(lc.criterion.slice(0, 30)));
      return {
        criterion: c.criterion,
        weight: def?.weight ?? 1,
        pass: c.pass,
        evidence: c.evidence,
      };
    });
  } catch (err: any) {
    console.warn(`[gemini] Judge error: ${err?.message ?? err}`);
    return llmCriteriaHeuristic(steps);
  }
}

/** Heuristic fallback when Gemini is unavailable */
function llmCriteriaHeuristic(steps: StepResult[]): PipelineCriterion[] {
  const results: PipelineCriterion[] = [];
  const allOutputs = steps.map((s) => s.outputPreview).join(" ");
  const lastOutput = steps[steps.length - 1]?.outputPreview ?? "";

  // "Final output contains structured data derived from earlier pipeline steps"
  const hasStructuredFinal = lastOutput.length > 50 && (lastOutput.includes("{") || lastOutput.includes("##") || lastOutput.includes("- "));
  const referencesEarlier = steps.length > 1 && steps.slice(0, -1).some((s) => {
    // Check if any entity/keyword from earlier steps appears in final output
    const words = s.outputPreview.split(/\s+/).filter((w) => w.length > 5);
    return words.some((w) => lastOutput.toLowerCase().includes(w.toLowerCase()));
  });
  results.push({
    criterion: PIPELINE_CRITERIA[0].criterion,
    weight: PIPELINE_CRITERIA[0].weight,
    pass: hasStructuredFinal && (referencesEarlier || steps.length <= 2),
    evidence: hasStructuredFinal
      ? `Final output is ${lastOutput.length}b with structure; references earlier: ${referencesEarlier}`
      : `Final output too short (${lastOutput.length}b) or unstructured`,
  });

  // "Output entity names are consistent across pipeline steps"
  // Extract capitalized multi-word names from outputs
  const entitySets = steps
    .filter((s) => s.ok && s.outputSize > 20)
    .map((s) => {
      const matches = s.outputPreview.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [];
      return new Set(matches.filter((m) => m.length > 3));
    });
  const firstEntities = entitySets[0] ?? new Set<string>();
  const consistentEntities =
    entitySets.length <= 1 ||
    [...firstEntities].some((e) => entitySets.slice(1).some((s) => s.has(e)));
  results.push({
    criterion: PIPELINE_CRITERIA[2].criterion,
    weight: PIPELINE_CRITERIA[2].weight,
    pass: consistentEntities,
    evidence: consistentEntities
      ? `Entity names consistent across steps`
      : `No overlapping entities found between step outputs`,
  });

  // "Final artifact is usable without re-running the pipeline"
  const isUsable = lastOutput.length > 100 && !lastOutput.startsWith("ERROR") && !lastOutput.startsWith("(null)");
  results.push({
    criterion: PIPELINE_CRITERIA[3].criterion,
    weight: PIPELINE_CRITERIA[3].weight,
    pass: isUsable,
    evidence: isUsable
      ? `Final output is ${lastOutput.length}b, substantive and self-contained`
      : `Final output is too short or is an error`,
  });

  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE — SQLite storage
// ══════════════════════════════════════════════════════════════════════════════

function persistRun(result: PipelineRunResult): void {
  const db = getDb();
  ensureSchema();

  db.prepare(
    `INSERT INTO pipeline_eval_runs (run_id, pipeline_name, timestamp, step_count, steps_passed, overall_pass, criteria_json, total_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    result.runId,
    result.pipelineName,
    result.timestamp,
    result.steps.length,
    result.steps.filter((s) => s.ok).length,
    result.overallPass ? 1 : 0,
    JSON.stringify(result.criteria),
    result.totalMs,
  );

  const stepStmt = db.prepare(
    `INSERT INTO pipeline_eval_steps (id, run_id, step_index, tool, description, args_json, ok, output_size, output_preview, error, ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const step of result.steps) {
    stepStmt.run(
      genId("step"),
      result.runId,
      step.stepIndex,
      step.tool,
      step.description,
      JSON.stringify(step.args),
      step.ok ? 1 : 0,
      step.outputSize,
      step.outputPreview,
      step.error ?? null,
      step.ms,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EVAL RUNNER
// ══════════════════════════════════════════════════════════════════════════════

async function runPipelineEval(
  pipelineName?: PipelineName,
): Promise<PipelineRunResult[]> {
  // 1. Load all tools
  console.log("[pipeline-eval] Loading all tool domains...");
  const allTools = await loadToolsets(ALL_DOMAIN_KEYS);
  console.log(`[pipeline-eval] Loaded ${allTools.length} tools across ${ALL_DOMAIN_KEYS.length} domains`);

  // Also create progressive discovery tools
  const { createProgressiveDiscoveryTools } = await import("../tools/progressiveDiscoveryTools.js");
  const discoveryTools = createProgressiveDiscoveryTools(
    allTools.map((t) => ({ name: t.name, description: t.description })),
  );

  const fullToolset = [...allTools, ...discoveryTools];

  // 2. Seed test data
  console.log("[pipeline-eval] Seeding test data...");
  seedPipelineData();

  // 3. Select pipelines to run
  const pipelines = pipelineName
    ? PIPELINES.filter((p) => p.name === pipelineName)
    : PIPELINES;

  if (pipelines.length === 0) {
    console.error(`[pipeline-eval] Unknown pipeline: ${pipelineName}`);
    console.error(`  Available: ${PIPELINES.map((p) => p.name).join(", ")}`);
    process.exit(1);
  }

  // 4. Run each pipeline
  const results: PipelineRunResult[] = [];

  for (const pipeline of pipelines) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`PIPELINE: ${pipeline.name}`);
    console.log(`  ${pipeline.description}`);
    console.log(`  Steps: ${pipeline.steps.length}`);
    console.log("═".repeat(60));

    const runId = genId("pipe");
    const startMs = Date.now();

    // Execute the pipeline
    const steps = await runPipeline(pipeline, fullToolset);
    const totalMs = Date.now() - startMs;

    // Print step results
    for (const step of steps) {
      const status = step.ok ? "PASS" : "FAIL";
      const icon = step.ok ? "[+]" : "[-]";
      console.log(`  ${icon} Step ${step.stepIndex + 1}: ${step.tool} (${step.ms}ms) — ${status}`);
      if (step.error) {
        console.log(`      Error: ${step.error.slice(0, 150)}`);
      } else {
        console.log(`      Output: ${step.outputSize}b — ${step.outputPreview.slice(0, 120)}...`);
      }
    }

    // Grade criteria — code first, then LLM
    console.log(`\n  Grading criteria...`);
    const codeGraded = codeGradeCriteria(steps, pipeline);
    const llmGraded = await geminiJudgePipeline(pipeline, steps, codeGraded);
    const allCriteria = [...codeGraded, ...llmGraded];

    // Overall pass: weighted score
    const totalWeight = allCriteria.reduce((sum, c) => sum + c.weight, 0);
    const passedWeight = allCriteria.filter((c) => c.pass).reduce((sum, c) => sum + c.weight, 0);
    const weightedPassRate = totalWeight > 0 ? passedWeight / totalWeight : 0;
    const overallPass = weightedPassRate >= 0.6; // 60% weighted threshold

    // Print criteria results
    for (const c of allCriteria) {
      const icon = c.pass ? "[+]" : "[-]";
      console.log(`  ${icon} (w=${c.weight}) ${c.criterion}`);
      console.log(`      ${c.evidence}`);
    }

    console.log(`\n  RESULT: ${overallPass ? "PASS" : "FAIL"} (${(weightedPassRate * 100).toFixed(1)}% weighted, ${totalMs}ms)`);

    const runResult: PipelineRunResult = {
      pipelineName: pipeline.name,
      runId,
      steps,
      criteria: allCriteria,
      overallPass,
      totalMs,
      timestamp: new Date().toISOString(),
    };

    // Persist to SQLite
    try {
      persistRun(runResult);
    } catch (err: any) {
      console.warn(`  [persist] Warning: ${err?.message}`);
    }

    results.push(runResult);
  }

  // Cleanup seed data
  console.log("\n[pipeline-eval] Cleaning up seed data...");
  cleanupPipelineData();

  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY PRINTER
// ══════════════════════════════════════════════════════════════════════════════

function printSummary(results: PipelineRunResult[]): void {
  console.log("\n" + "═".repeat(60));
  console.log("PIPELINE EVAL SUMMARY");
  console.log("═".repeat(60));

  const passed = results.filter((r) => r.overallPass).length;
  const total = results.length;

  console.log(`\n  Pipelines: ${passed}/${total} passed`);
  console.log("");

  // Per-pipeline table
  console.log("  Pipeline                     Steps  Criteria  Time    Result");
  console.log("  " + "-".repeat(70));
  for (const r of results) {
    const stepsPassed = r.steps.filter((s) => s.ok).length;
    const critPassed = r.criteria.filter((c) => c.pass).length;
    const status = r.overallPass ? "PASS" : "FAIL";
    const name = r.pipelineName.padEnd(28);
    const stepsStr = `${stepsPassed}/${r.steps.length}`.padEnd(6);
    const critStr = `${critPassed}/${r.criteria.length}`.padEnd(9);
    const timeStr = `${r.totalMs}ms`.padEnd(7);
    console.log(`  ${name} ${stepsStr} ${critStr} ${timeStr} ${status}`);
  }

  // Aggregate criteria
  console.log("\n  Criteria Breakdown:");
  const criteriaMap = new Map<string, { pass: number; total: number }>();
  for (const r of results) {
    for (const c of r.criteria) {
      const entry = criteriaMap.get(c.criterion) ?? { pass: 0, total: 0 };
      entry.total++;
      if (c.pass) entry.pass++;
      criteriaMap.set(c.criterion, entry);
    }
  }
  for (const [criterion, stats] of criteriaMap) {
    const rate = ((stats.pass / stats.total) * 100).toFixed(0);
    const icon = stats.pass === stats.total ? "[+]" : "[-]";
    console.log(`  ${icon} ${rate}% — ${criterion.slice(0, 65)}`);
  }

  // Total time
  const totalTime = results.reduce((sum, r) => sum + r.totalMs, 0);
  console.log(`\n  Total time: ${totalTime}ms`);
  console.log(`  Overall pass rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log("");
}

// ══════════════════════════════════════════════════════════════════════════════
// CLI
// ══════════════════════════════════════════════════════════════════════════════

function parseArgs(argv: string[]): { pipeline?: PipelineName; all?: boolean } {
  const options: { pipeline?: PipelineName; all?: boolean } = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--pipeline":
        options.pipeline = argv[++i] as PipelineName;
        break;
      case "--all":
        options.all = true;
        break;
      default:
        if (arg.startsWith("--")) {
          console.error(`Unknown flag: ${arg}`);
          console.error(`Usage: npx tsx src/benchmarks/pipelineEval.ts [--pipeline NAME] [--all]`);
          console.error(`Pipelines: ${PIPELINES.map((p) => p.name).join(", ")}`);
          process.exit(1);
        }
    }
  }

  return options;
}

async function main() {
  // Load .env.local for GEMINI_API_KEY
  if (!process.env.GEMINI_API_KEY) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const candidates = [
        path.resolve(process.cwd(), ".env.local"),
        path.resolve(process.cwd(), "../../.env.local"),
        path.resolve(process.cwd(), "../../../.env.local"),
      ];
      for (const envPath of candidates) {
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, "utf-8");
          for (const line of content.split("\n")) {
            const match = line.match(/^([^#=]+)=(.*)$/);
            if (match) process.env[match[1].trim()] = match[2].trim();
          }
          if (process.env.GEMINI_API_KEY) {
            console.log(`[env] Loaded GEMINI_API_KEY from ${envPath}`);
            break;
          }
        }
      }
    } catch {
      /* ignore env loading errors */
    }
  }

  const options = parseArgs(process.argv.slice(2));

  console.log("NodeBench Pipeline Eval Harness");
  console.log("═".repeat(40));
  console.log(`  Gemini:   ${process.env.GEMINI_API_KEY ? "available" : "unavailable (heuristic fallback)"}`);
  console.log(`  Pipeline: ${options.pipeline ?? "all"}`);
  console.log("");

  // Wire up DB accessor for toolRegistry
  _setDbAccessor(getDb);

  const results = await runPipelineEval(options.pipeline);
  printSummary(results);

  // Exit with code based on pass rate
  const passRate = results.filter((r) => r.overallPass).length / results.length;
  process.exit(passRate >= 0.5 ? 0 : 1);
}

main().catch((err) => {
  console.error("[pipeline-eval] Fatal error:", err);
  process.exit(1);
});
