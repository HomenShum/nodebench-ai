/**
 * chainEval.ts — Multi-step chain eval for NodeBench.
 *
 * Tests REAL agent workflows where Tool A's output feeds into Tool B's input.
 * Single-tool eval proves "can each tool respond."
 * Chain eval proves "can the pipeline produce a real result."
 *
 * 8 canonical chains matching the dogfood runbook:
 *   1. Founder Weekly Reset (5 steps)
 *   2. Pre-Delegation Packet (4 steps)
 *   3. Important-Change Review (4 steps)
 *   4. Competitor Intelligence (5 steps)
 *   5. Banker Company Search (4 steps)
 *   6. Student Strategy Brief (4 steps)
 *   7. Setup + Discovery (3 steps)
 *   8. Operator Causal Replay (4 steps)
 *
 * Usage:
 *   GEMINI_API_KEY=... npx tsx src/benchmarks/chainEval.ts [--chains N]
 */

import { loadAllToolsets } from "../toolsetRegistry.js";
import type { McpTool } from "../types.js";
import { getDb } from "../db.js";

// Meta tools are registered separately from domain toolsets
async function loadAllToolsIncludingMeta(): Promise<McpTool[]> {
  const domainTools = await loadAllToolsets();
  const extras: McpTool[] = [];

  // Load meta tools (check_mcp_setup, list_available_toolsets, etc.)
  try {
    const { createMetaTools } = await import("../tools/metaTools.js");
    extras.push(...createMetaTools(domainTools));
  } catch { /* metaTools not available */ }

  // Load progressive discovery tools (discover_tools, get_tool_quick_ref, etc.)
  try {
    const { createProgressiveDiscoveryTools } = await import("../tools/progressiveDiscoveryTools.js");
    extras.push(...createProgressiveDiscoveryTools([...domainTools, ...extras]));
  } catch { /* progressiveDiscoveryTools not available */ }

  return [...domainTools, ...extras];
}

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface ChainStep {
  tool: string;
  /** Build args from prior step outputs. Receives all prior results keyed by step index. */
  buildArgs: (priorResults: Record<number, any>) => Record<string, unknown>;
  /** Validate this step's output before feeding to next step */
  validate: (result: any) => { pass: boolean; reason: string };
}

interface ChainDefinition {
  id: string;
  name: string;
  scenario: string;
  lens: string;
  steps: ChainStep[];
  /** Overall chain validation — does the final output meet quality bar? */
  finalValidation: (allResults: Record<number, any>) => { pass: boolean; reasons: string[] };
}

interface ChainStepResult {
  stepIndex: number;
  tool: string;
  args: Record<string, unknown>;
  output: any;
  validation: { pass: boolean; reason: string };
  latencyMs: number;
  error?: string;
}

interface ChainResult {
  chainId: string;
  chainName: string;
  scenario: string;
  lens: string;
  steps: ChainStepResult[];
  finalValidation: { pass: boolean; reasons: string[] };
  totalLatencyMs: number;
  stepsCompleted: number;
  stepsTotal: number;
  chainBroken: boolean; // Did a step fail and prevent downstream steps?
  overallPass: boolean;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function hasField(obj: any, ...keys: string[]): boolean {
  if (!obj || typeof obj !== "object") return false;
  return keys.some(k => {
    if (k in obj && obj[k] !== null && obj[k] !== undefined) {
      if (typeof obj[k] === "string") return obj[k].length > 0;
      if (Array.isArray(obj[k])) return obj[k].length > 0;
      return true;
    }
    return false;
  });
}

function hasNonEmpty(obj: any, key: string): boolean {
  if (!obj || typeof obj !== "object") return false;
  const val = obj[key];
  if (val === null || val === undefined) return false;
  if (typeof val === "string") return val.length > 5;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return true;
}

function outputContains(obj: any, substring: string): boolean {
  const str = JSON.stringify(obj).toLowerCase();
  return str.includes(substring.toLowerCase());
}

/* ─── Chain Definitions ──────────────────────────────────────────────────── */

const CHAINS: ChainDefinition[] = [
  // Chain 1: Founder Weekly Reset (the #1 habit)
  {
    id: "founder_weekly_reset",
    name: "Founder Weekly Reset",
    scenario: "weekly_reset",
    lens: "founder",
    steps: [
      {
        tool: "get_context_bundle",
        buildArgs: () => ({ query: "founder weekly reset" }),
        validate: (r) => ({
          pass: hasField(r, "systemPromptPrefix", "pinned"),
          reason: hasField(r, "systemPromptPrefix") ? "Context bundle loaded" : "Missing systemPromptPrefix",
        }),
      },
      {
        tool: "founder_local_gather",
        buildArgs: () => ({ daysBack: 7 }),
        validate: (r) => ({
          pass: hasField(r, "identity", "gitActivity", "sessionMemory"),
          reason: hasField(r, "identity") ? "Context gathered with identity" : "Missing identity in gather",
        }),
      },
      {
        tool: "founder_local_synthesize",
        buildArgs: (prior) => ({
          packetType: "weekly_reset",
          daysBack: 7,
          query: "Generate my founder weekly reset — what company we're building, what changed, main contradiction, next 3 moves",
        }),
        validate: (r) => ({
          // LLM synthesis returns: summary, keyFindings, risks, nextSteps, entities
          // Local pipeline returns: memo, canonicalEntity, whatChanged, contradictions, nextActions
          pass: hasField(r, "summary", "memo") || hasField(r, "keyFindings", "whatChanged"),
          reason: hasField(r, "summary") ? "LLM synthesis produced" : hasField(r, "memo") ? "Local packet produced" : "No synthesis or memo",
        }),
      },
      {
        tool: "track_action",
        buildArgs: (prior) => {
          const entity = prior[2]?.summary?.slice(0, 40) ?? prior[2]?.canonicalEntity?.canonicalMission?.slice(0, 40) ?? "weekly reset";
          return { action: `Weekly reset: ${entity}`, category: "founder", impact: "significant" };
        },
        validate: (r) => ({
          pass: hasField(r, "actionId", "tracked", "action"),
          reason: "Action tracked",
        }),
      },
      {
        tool: "track_milestone",
        buildArgs: (prior) => ({
          title: "Weekly founder reset generated",
          description: `Findings: ${prior[2]?.keyFindings?.length ?? prior[2]?.contradictions?.length ?? 0}`,
          category: "founder_habit",
        }),
        validate: (r) => ({
          pass: hasField(r, "milestoneId", "tracked", "title"),
          reason: "Milestone tracked",
        }),
      },
    ],
    finalValidation: (all) => {
      const reasons: string[] = [];
      let pass = true;
      if (!all[0]?.systemPromptPrefix && !all[0]?.pinned) { reasons.push("FAIL: No context bundle"); pass = false; }
      if (!all[1]?.identity) { reasons.push("FAIL: No identity in gather"); pass = false; }
      // Accept either LLM synthesis or local memo
      if (!all[2]?.summary && !all[2]?.memo) { reasons.push("FAIL: No synthesis or memo"); pass = false; }
      else {
        const output = JSON.stringify(all[2]).toLowerCase();
        if (!output.includes("contradiction") && !output.includes("risk")) reasons.push("WARN: Missing contradictions/risks");
        if (!output.includes("next") && !output.includes("action") && !output.includes("step")) reasons.push("WARN: Missing next actions");
      }
      if (reasons.length === 0) reasons.push("PASS: Complete weekly reset chain");
      return { pass, reasons };
    },
  },

  // Chain 2: Pre-Delegation Packet
  {
    id: "pre_delegation",
    name: "Pre-Delegation Packet for Claude Code",
    scenario: "delegation",
    lens: "founder",
    steps: [
      {
        tool: "get_context_bundle",
        buildArgs: () => ({ query: "pre-delegation packet for Claude Code" }),
        validate: (r) => ({ pass: hasField(r, "pinned"), reason: "Context loaded" }),
      },
      {
        tool: "founder_local_gather",
        buildArgs: () => ({ daysBack: 7 }),
        validate: (r) => ({ pass: hasField(r, "identity"), reason: hasField(r, "identity") ? "Gathered" : "No identity" }),
      },
      {
        tool: "founder_local_synthesize",
        buildArgs: () => ({
          packetType: "pre_delegation",
          daysBack: 7,
          query: "Create a pre-delegation packet for Claude Code focusing on no-bandage fixes, weekly founder reset, and packet lineage",
        }),
        validate: (r) => ({
          pass: hasField(r, "summary", "memo", "keyFindings", "nextSteps"),
          reason: hasField(r, "summary") ? "Delegation synthesis produced" : hasField(r, "memo") ? "Delegation memo produced" : "No output",
        }),
      },
      {
        tool: "track_action",
        buildArgs: () => ({ action: "Pre-delegation packet created for Claude Code", category: "founder", impact: "significant" }),
        validate: (r) => ({ pass: true, reason: "Action tracked" }),
      },
    ],
    finalValidation: (all) => {
      const reasons: string[] = [];
      let pass = true;
      if (!all[2]?.summary && !all[2]?.memo) { reasons.push("FAIL: No delegation output"); pass = false; }
      if (reasons.length === 0) reasons.push("PASS: Complete delegation chain");
      return { pass, reasons };
    },
  },

  {
    id: "founder_direction_ops",
    name: "Founder Direction Ops",
    scenario: "delegation",
    lens: "founder",
    steps: [
      {
        tool: "register_shared_context_peer",
        buildArgs: () => ({
          peerId: "chain:founder:compiler",
          product: "nodebench",
          workspaceId: "chain:founder",
          surface: "local_runtime",
          role: "compiler",
          capabilities: ["founder-direction-assessment", "shared-context-publish"],
          contextScopes: ["workspace", "packet"],
        }),
        validate: (r) => ({ pass: hasField(r, "peerId"), reason: "Producer peer registered" }),
      },
      {
        tool: "register_shared_context_peer",
        buildArgs: () => ({
          peerId: "chain:founder:judge",
          product: "nodebench",
          workspaceId: "chain:founder",
          surface: "runner",
          role: "judge",
          capabilities: ["can-judge"],
          contextScopes: ["workspace", "packet"],
        }),
        validate: (r) => ({ pass: hasField(r, "peerId"), reason: "Assignee peer registered" }),
      },
      {
        tool: "founder_direction_assessment",
        buildArgs: () => ({
          query: "Should NodeBench lead with a Claude Code + MCP wedge for founders before building a broader dashboard subscription?",
          lens: "founder",
          marketWorkflow: ["Claude Code", "MCP"],
          constraints: ["solo founder", "specific skillset"],
        }),
        validate: (r) => ({
          pass: hasField(r, "strategicAngles", "recommendedNextAction"),
          reason: hasField(r, "strategicAngles") ? "Direction assessed" : "Assessment missing strategic angles",
        }),
      },
      {
        tool: "publish_founder_issue_packet",
        buildArgs: (prior) => ({
          producerPeerId: "chain:founder:compiler",
          workspaceId: "chain:founder",
          assessment: prior[2],
        }),
        validate: (r) => ({
          pass: hasField(r, "contextId", "resourceUri"),
          reason: hasField(r, "contextId") ? "Founder issue packet published" : "Issue packet missing",
        }),
      },
      {
        tool: "workflow_adoption_scan",
        buildArgs: () => ({
          query: "Lead with Claude Code + MCP for developer founders, then expand to team dashboard later.",
          marketWorkflow: ["Claude Code", "MCP"],
          installSurface: ["local", "dashboard"],
        }),
        validate: (r) => ({
          pass: hasField(r, "fitScore", "recommendedSurface"),
          reason: hasField(r, "fitScore") ? "Workflow adoption scanned" : "Missing fit score",
        }),
      },
      {
        tool: "delegate_founder_issue",
        buildArgs: (prior) => ({
          contextId: prior[3]?.contextId,
          proposerPeerId: "chain:founder:compiler",
          assigneePeerId: "chain:founder:judge",
          instructions: "Return a bounded follow-up packet on adoption and installability risk.",
        }),
        validate: (r) => ({
          pass: hasField(r, "taskId"),
          reason: hasField(r, "taskId") ? "Founder issue delegated" : "Delegation failed",
        }),
      },
    ],
    finalValidation: (all) => {
      const reasons: string[] = [];
      let pass = true;
      if (!all[2]?.strategicAngles) { reasons.push("FAIL: Missing direction assessment"); pass = false; }
      if (!all[3]?.contextId) { reasons.push("FAIL: Missing founder issue packet"); pass = false; }
      if (!all[4]?.fitScore) { reasons.push("FAIL: Missing adoption scan"); pass = false; }
      if (!all[5]?.taskId) { reasons.push("FAIL: Missing delegated task"); pass = false; }
      if (reasons.length === 0) reasons.push("PASS: Complete founder direction ops chain");
      return { pass, reasons };
    },
  },

  // Chain 3: Important-Change Review
  {
    id: "important_change",
    name: "Important-Change Review",
    scenario: "important_change",
    lens: "operator",
    steps: [
      {
        tool: "get_context_bundle",
        buildArgs: () => ({ query: "important changes since last session" }),
        validate: (r) => ({ pass: hasField(r, "pinned"), reason: "Context loaded" }),
      },
      {
        tool: "founder_local_gather",
        buildArgs: () => ({ daysBack: 14 }),
        validate: (r) => ({ pass: hasField(r, "identity", "gitActivity", "sessionMemory"), reason: hasField(r, "identity") ? "Context gathered" : "Partial gather" }),
      },
      {
        tool: "founder_local_synthesize",
        buildArgs: () => ({
          packetType: "important_change",
          daysBack: 14,
          query: "Show me only the important changes since my last meaningful session — strategy, positioning, architecture, competitor changes",
        }),
        validate: (r) => ({
          pass: hasField(r, "summary", "memo", "keyFindings", "whatChanged"),
          reason: hasField(r, "summary") ? "Changes synthesized" : hasField(r, "whatChanged") ? "Changes detected" : "No output",
        }),
      },
      {
        tool: "track_action",
        buildArgs: (prior) => ({
          action: `Important-change review: ${prior[2]?.keyFindings?.length ?? prior[2]?.whatChanged?.length ?? 0} findings`,
          category: "operator",
          impact: "moderate",
        }),
        validate: (r) => ({ pass: true, reason: "Tracked" }),
      },
    ],
    finalValidation: (all) => {
      const reasons: string[] = [];
      let pass = true;
      if (!all[2]?.summary && !all[2]?.whatChanged) {
        reasons.push("FAIL: No changes detected"); pass = false;
      }
      if (!all[2]?.summary && !all[2]?.memo) { reasons.push("FAIL: No output"); pass = false; }
      if (reasons.length === 0) reasons.push("PASS: Complete important-change chain");
      return { pass, reasons };
    },
  },

  // Chain 4: Competitor Intelligence Brief
  {
    id: "competitor_brief",
    name: "Competitor Intelligence: Supermemory",
    scenario: "competitor_brief",
    lens: "researcher",
    steps: [
      {
        tool: "get_context_bundle",
        buildArgs: () => ({ query: "Supermemory competitor analysis" }),
        validate: (r) => ({ pass: hasField(r, "pinned"), reason: "Context loaded" }),
      },
      {
        tool: "discover_tools",
        buildArgs: () => ({ query: "competitor intelligence analysis brief", limit: 5 }),
        validate: (r) => ({
          pass: r !== null && r !== undefined && typeof r === "object",
          reason: "Discovery executed",
        }),
      },
      {
        tool: "founder_local_synthesize",
        buildArgs: () => ({
          packetType: "competitor_brief",
          daysBack: 7,
          query: "Analyze Supermemory as a competitor — what category they own, distribution advantages, what to absorb vs avoid",
        }),
        validate: (r) => ({
          pass: hasField(r, "summary", "memo", "keyFindings"),
          reason: hasField(r, "summary") ? "Competitor synthesis produced" : hasField(r, "memo") ? "Competitor memo produced" : "No output",
        }),
      },
      {
        tool: "track_action",
        buildArgs: () => ({ action: "Competitor brief: Supermemory", category: "research", impact: "significant" }),
        validate: (r) => ({ pass: true, reason: "Tracked" }),
      },
      {
        tool: "track_milestone",
        buildArgs: () => ({
          title: "Competitor brief generated: Supermemory",
          description: "Analyzed competitive position, distribution advantages, absorb vs avoid",
          category: "research",
        }),
        validate: (r) => ({ pass: true, reason: "Milestone tracked" }),
      },
    ],
    finalValidation: (all) => {
      const reasons: string[] = [];
      let pass = true;
      if (!all[2]?.summary && !all[2]?.memo) { reasons.push("FAIL: No competitor output"); pass = false; }
      if (reasons.length === 0) reasons.push("PASS: Complete competitor chain");
      return { pass, reasons };
    },
  },

  // Chain 5: Banker Company Search (Anthropic)
  {
    id: "banker_company_search",
    name: "Banker Company Search: Anthropic",
    scenario: "company_search",
    lens: "banker",
    steps: [
      {
        tool: "get_context_bundle",
        buildArgs: () => ({ query: "Analyze Anthropic for a banker lens" }),
        validate: (r) => ({ pass: hasField(r, "pinned"), reason: "Context loaded" }),
      },
      {
        tool: "run_recon",
        buildArgs: () => ({ target: "Anthropic", focus: "company profile, valuation, revenue, risks" }),
        validate: (r) => ({
          pass: r !== null && r !== undefined && typeof r === "object",
          reason: "Recon executed",
        }),
      },
      {
        tool: "founder_local_synthesize",
        buildArgs: () => ({
          packetType: "competitor_brief",
          daysBack: 7,
          query: "Analyze Anthropic — company snapshot, strategic position, business quality, risks, 3 next diligence questions",
        }),
        validate: (r) => ({
          pass: hasField(r, "summary", "memo", "keyFindings"),
          reason: hasField(r, "summary") ? "Banker synthesis produced" : hasField(r, "memo") ? "Banker memo produced" : "No output",
        }),
      },
      {
        tool: "track_action",
        buildArgs: () => ({ action: "Banker company search: Anthropic", category: "research", impact: "significant" }),
        validate: (r) => ({ pass: true, reason: "Tracked" }),
      },
    ],
    finalValidation: (all) => {
      const reasons: string[] = [];
      let pass = true;
      if (!all[2]?.summary && !all[2]?.memo) { reasons.push("FAIL: No banker output"); pass = false; }
      if (reasons.length === 0) reasons.push("PASS: Complete banker chain");
      return { pass, reasons };
    },
  },

  // Chain 6: Student Strategy Brief (Shopify)
  {
    id: "student_strategy",
    name: "Student Strategy Brief: Shopify",
    scenario: "company_search",
    lens: "student",
    steps: [
      {
        tool: "get_context_bundle",
        buildArgs: () => ({ query: "Shopify AI commerce strategy" }),
        validate: (r) => ({ pass: hasField(r, "pinned"), reason: "Context loaded" }),
      },
      {
        tool: "founder_local_synthesize",
        buildArgs: () => ({
          packetType: "competitor_brief",
          daysBack: 7,
          query: "Help me understand Shopify's AI commerce strategy — plain-language summary, strategic upside, risks, 3 comparables, study brief",
        }),
        validate: (r) => ({
          pass: hasField(r, "summary", "memo", "keyFindings"),
          reason: hasField(r, "summary") ? "Study synthesis produced" : hasField(r, "memo") ? "Study brief produced" : "No output",
        }),
      },
      {
        tool: "track_action",
        buildArgs: () => ({ action: "Student strategy brief: Shopify AI commerce", category: "research", impact: "moderate" }),
        validate: (r) => ({ pass: true, reason: "Tracked" }),
      },
    ],
    finalValidation: (all) => {
      const reasons: string[] = [];
      let pass = true;
      if (!all[1]?.summary && !all[1]?.memo) { reasons.push("FAIL: No study output"); pass = false; }
      if (reasons.length === 0) reasons.push("PASS: Complete student chain");
      return { pass, reasons };
    },
  },

  // Chain 7: Setup + Discovery
  {
    id: "setup_discovery",
    name: "Setup + Discovery Sanity",
    scenario: "weekly_reset",
    lens: "founder",
    steps: [
      {
        tool: "check_mcp_setup",
        buildArgs: () => ({}),
        validate: (r) => ({
          pass: r !== null && r !== undefined && typeof r === "object",
          reason: outputContains(r ?? {}, "healthy") ? "Setup healthy" : "Setup responded",
        }),
      },
      {
        tool: "discover_tools",
        buildArgs: () => ({ query: "founder weekly reset company analysis", limit: 10 }),
        validate: (r) => ({
          pass: r !== null && r !== undefined && typeof r === "object",
          reason: "Discovery executed",
        }),
      },
      {
        tool: "get_tool_quick_ref",
        buildArgs: () => ({ toolName: "founder_local_synthesize" }),
        validate: (r) => ({
          pass: r !== null && r !== undefined && typeof r === "object",
          reason: "Quick ref loaded",
        }),
      },
    ],
    finalValidation: (all) => {
      const reasons: string[] = [];
      let pass = true;
      if (all[0] === null || all[0] === undefined) { reasons.push("FAIL: Setup failed"); pass = false; }
      if (all[1] === null || all[1] === undefined) { reasons.push("FAIL: Discovery failed"); pass = false; }
      if (all[2] === null || all[2] === undefined) { reasons.push("FAIL: Quick ref failed"); pass = false; }
      if (reasons.length === 0) reasons.push("PASS: Setup + discovery chain");
      return { pass, reasons };
    },
  },

  // Chain 8: Operator Causal Replay
  {
    id: "operator_causal",
    name: "Operator Causal Memory Replay",
    scenario: "important_change",
    lens: "operator",
    steps: [
      {
        tool: "get_context_bundle",
        buildArgs: () => ({ query: "causal chain product evolution" }),
        validate: (r) => ({ pass: hasField(r, "pinned"), reason: "Context loaded" }),
      },
      {
        tool: "get_session_journal",
        buildArgs: () => ({ daysBack: 7 }),
        validate: (r) => ({
          pass: r !== null && r !== undefined && typeof r === "object",
          reason: "Journal loaded",
        }),
      },
      {
        tool: "founder_local_synthesize",
        buildArgs: () => ({
          packetType: "important_change",
          daysBack: 7,
          query: "Reconstruct the causal chain for this week's product evolution — before/after state, important changes, trajectory",
        }),
        validate: (r) => ({
          pass: hasField(r, "summary", "memo", "keyFindings", "whatChanged"),
          reason: hasField(r, "summary") ? "Causal synthesis produced" : hasField(r, "whatChanged") ? "Changes detected" : "No output",
        }),
      },
      {
        tool: "track_action",
        buildArgs: (prior) => ({
          action: `Causal replay: ${prior[2]?.keyFindings?.length ?? prior[2]?.whatChanged?.length ?? 0} findings`,
          category: "operator",
          impact: "moderate",
        }),
        validate: (r) => ({ pass: true, reason: "Tracked" }),
      },
    ],
    finalValidation: (all) => {
      const reasons: string[] = [];
      let pass = true;
      if (!all[2]?.summary && !all[2]?.whatChanged) {
        reasons.push("FAIL: No causal replay output"); pass = false;
      }
      if (reasons.length === 0) reasons.push("PASS: Complete causal replay chain");
      return { pass, reasons };
    },
  },
];

/* ─── Chain Runner ───────────────────────────────────────────────────────── */

async function runChain(chain: ChainDefinition, tools: McpTool[]): Promise<ChainResult> {
  const stepResults: ChainStepResult[] = [];
  const allResults: Record<number, any> = {};
  let chainBroken = false;
  const chainStart = Date.now();

  for (let i = 0; i < chain.steps.length; i++) {
    const step = chain.steps[i];
    const stepStart = Date.now();

    if (chainBroken) {
      stepResults.push({
        stepIndex: i,
        tool: step.tool,
        args: {},
        output: null,
        validation: { pass: false, reason: "SKIPPED: prior step failed" },
        latencyMs: 0,
      });
      continue;
    }

    const tool = tools.find(t => t.name === step.tool);
    if (!tool) {
      stepResults.push({
        stepIndex: i,
        tool: step.tool,
        args: {},
        output: null,
        validation: { pass: false, reason: `Tool not found: ${step.tool}` },
        latencyMs: 0,
        error: `Tool not found: ${step.tool}`,
      });
      chainBroken = true;
      continue;
    }

    try {
      const args = step.buildArgs(allResults);
      const result = await tool.handler(args);
      const latencyMs = Date.now() - stepStart;
      const validation = step.validate(result);

      allResults[i] = result;
      stepResults.push({ stepIndex: i, tool: step.tool, args, output: result, validation, latencyMs });

      // If validation fails on a critical step, break the chain
      if (!validation.pass && i < chain.steps.length - 1) {
        // Allow tracking steps (track_action, track_milestone) to fail without breaking
        if (!step.tool.startsWith("track_")) {
          chainBroken = true;
        }
      }
    } catch (err: any) {
      const latencyMs = Date.now() - stepStart;
      stepResults.push({
        stepIndex: i,
        tool: step.tool,
        args: step.buildArgs(allResults),
        output: null,
        validation: { pass: false, reason: `Error: ${err.message?.slice(0, 100)}` },
        latencyMs,
        error: err.message,
      });
      if (!step.tool.startsWith("track_")) {
        chainBroken = true;
      }
    }
  }

  const finalValidation = chain.finalValidation(allResults);
  const totalLatencyMs = Date.now() - chainStart;
  const stepsCompleted = stepResults.filter(s => s.validation.pass).length;

  return {
    chainId: chain.id,
    chainName: chain.name,
    scenario: chain.scenario,
    lens: chain.lens,
    steps: stepResults,
    finalValidation,
    totalLatencyMs,
    stepsCompleted,
    stepsTotal: chain.steps.length,
    chainBroken,
    overallPass: finalValidation.pass && !chainBroken,
  };
}

/* ─── SQLite Persistence ─────────────────────────────────────────────────── */

function persistChainResult(result: ChainResult): void {
  try {
    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS chain_eval_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chainId TEXT NOT NULL,
      chainName TEXT NOT NULL,
      scenario TEXT NOT NULL,
      lens TEXT NOT NULL,
      stepsCompleted INTEGER NOT NULL,
      stepsTotal INTEGER NOT NULL,
      chainBroken INTEGER NOT NULL,
      overallPass INTEGER NOT NULL,
      totalLatencyMs INTEGER NOT NULL,
      finalReasons TEXT NOT NULL,
      stepsJson TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    db.prepare(`INSERT INTO chain_eval_runs (chainId, chainName, scenario, lens, stepsCompleted, stepsTotal, chainBroken, overallPass, totalLatencyMs, finalReasons, stepsJson) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      result.chainId, result.chainName, result.scenario, result.lens,
      result.stepsCompleted, result.stepsTotal, result.chainBroken ? 1 : 0,
      result.overallPass ? 1 : 0, result.totalLatencyMs,
      JSON.stringify(result.finalValidation.reasons),
      JSON.stringify(result.steps.map(s => ({
        tool: s.tool, pass: s.validation.pass, reason: s.validation.reason, latencyMs: s.latencyMs, error: s.error,
      }))),
    );
  } catch { /* SQLite not critical */ }
}

/* ─── Main ───────────────────────────────────────────────────────────────── */

async function main() {
  const args = process.argv.slice(2);
  const chainsFlag = args.find(a => a.startsWith("--chains="));
  const maxChains = chainsFlag ? parseInt(chainsFlag.split("=")[1], 10) : CHAINS.length;

  console.log(`\n  NodeBench Chain Eval — ${maxChains} multi-step workflows\n`);

  // Load all tools including meta/discovery tools
  const tools = await loadAllToolsIncludingMeta();
  console.log(`  Tools loaded: ${tools.length}`);

  const results: ChainResult[] = [];

  for (let i = 0; i < Math.min(maxChains, CHAINS.length); i++) {
    const chain = CHAINS[i];
    process.stdout.write(`  [${i + 1}/${maxChains}] ${chain.name} (${chain.steps.length} steps)... `);

    const result = await runChain(chain, tools);
    results.push(result);
    persistChainResult(result);

    const status = result.overallPass ? "✓ PASS" : result.chainBroken ? "✗ BROKEN" : "✗ FAIL";
    console.log(`${status} (${result.stepsCompleted}/${result.stepsTotal} steps, ${result.totalLatencyMs}ms)`);

    // Print step details for failures
    if (!result.overallPass) {
      for (const step of result.steps) {
        const icon = step.validation.pass ? "  ✓" : "  ✗";
        console.log(`    ${icon} ${step.tool}: ${step.validation.reason}${step.error ? ` [${step.error.slice(0, 60)}]` : ""} (${step.latencyMs}ms)`);
      }
      for (const reason of result.finalValidation.reasons) {
        console.log(`    → ${reason}`);
      }
    }
  }

  // Summary
  const passed = results.filter(r => r.overallPass).length;
  const broken = results.filter(r => r.chainBroken).length;
  const totalSteps = results.reduce((s, r) => s + r.stepsTotal, 0);
  const completedSteps = results.reduce((s, r) => s + r.stepsCompleted, 0);
  const avgLatency = Math.round(results.reduce((s, r) => s + r.totalLatencyMs, 0) / results.length);

  console.log(`\n  ═══════════════════════════════════════════`);
  console.log(`  Chain Pass Rate:  ${passed}/${results.length} (${Math.round(passed / results.length * 100)}%)`);
  console.log(`  Step Completion:  ${completedSteps}/${totalSteps} (${Math.round(completedSteps / totalSteps * 100)}%)`);
  console.log(`  Chains Broken:    ${broken}`);
  console.log(`  Avg Latency:      ${avgLatency}ms`);
  console.log(`  ═══════════════════════════════════════════\n`);

  // Per-chain summary table
  console.log(`  BY CHAIN:`);
  for (const r of results) {
    const icon = r.overallPass ? "✓" : "✗";
    console.log(`    ${icon} ${r.chainName.padEnd(40)} ${r.stepsCompleted}/${r.stepsTotal} steps  ${r.totalLatencyMs}ms  ${r.lens}`);
  }
  console.log();

  process.exit(passed === results.length ? 0 : 1);
}

main().catch(err => { console.error("Chain eval error:", err); process.exit(1); });
