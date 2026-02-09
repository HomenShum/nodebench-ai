/**
 * Toolset Gating Evaluation — Real Trajectory Comparison
 *
 * Runs 9 diverse real-world scenarios through lite, core, and full presets.
 * Scenario categories inspired by SWE-bench Pro, GAIA, TAU-bench, MCP-AgentBench,
 * and real tasks from the nodebench-ai codebase.
 *
 * Categories:
 *   - Bug fix (model fallback, cron lifecycle)
 *   - Feature implementation (governance appeal, OAuth token rotation)
 *   - Refactoring (cross-branch dedup reconciliation)
 *   - Multi-agent coordination (parallel pipeline refactor, swarm state isolation)
 *   - Deployment / canary (model canary rollout)
 *   - Performance (query optimization)
 *
 * Measures:
 *   - Which phases complete vs fail (tool not found)
 *   - Concrete impact delta between presets
 *   - Token surface area reduction (tool count × estimated schema tokens)
 *   - Whether lite/core catch enough per scenario category
 *
 * This answers: "If I gate to --preset lite, what do I lose per scenario type?"
 */
import { describe, it, expect, afterAll } from "vitest";
import { verificationTools } from "../tools/verificationTools.js";
import { reconTools } from "../tools/reconTools.js";
import { evalTools } from "../tools/evalTools.js";
import { qualityGateTools } from "../tools/qualityGateTools.js";
import { flywheelTools } from "../tools/flywheelTools.js";
import { learningTools } from "../tools/learningTools.js";
import { agentBootstrapTools } from "../tools/agentBootstrapTools.js";
import { selfEvalTools } from "../tools/selfEvalTools.js";
import { parallelAgentTools } from "../tools/parallelAgentTools.js";
import { uiCaptureTools } from "../tools/uiCaptureTools.js";
import { visionTools } from "../tools/visionTools.js";
import { webTools } from "../tools/webTools.js";
import { githubTools } from "../tools/githubTools.js";
import { documentationTools } from "../tools/documentationTools.js";
import { localFileTools, gaiaMediaSolvers } from "../tools/localFileTools.js";
import { llmTools } from "../tools/llmTools.js";
import { securityTools } from "../tools/securityTools.js";
import { platformTools } from "../tools/platformTools.js";
import { researchWritingTools } from "../tools/researchWritingTools.js";
import { flickerDetectionTools } from "../tools/flickerDetectionTools.js";
import { figmaFlowTools } from "../tools/figmaFlowTools.js";
import { boilerplateTools } from "../tools/boilerplateTools.js";
import { cCompilerBenchmarkTools } from "../tools/cCompilerBenchmarkTools.js";
import { sessionMemoryTools } from "../tools/sessionMemoryTools.js";
import { toonTools } from "../tools/toonTools.js";
import { patternTools } from "../tools/patternTools.js";
import { gitWorkflowTools } from "../tools/gitWorkflowTools.js";
import { seoTools } from "../tools/seoTools.js";
import { voiceBridgeTools } from "../tools/voiceBridgeTools.js";
import { createMetaTools } from "../tools/metaTools.js";
import type { McpTool } from "../types.js";

// ═══════════════════════════════════════════════════════════════════════════
// PRESET DEFINITIONS (mirrors index.ts TOOLSET_MAP + PRESETS exactly)
// ═══════════════════════════════════════════════════════════════════════════

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
  research_writing: researchWritingTools,
  flicker_detection: flickerDetectionTools,
  figma_flow: figmaFlowTools,
  boilerplate: boilerplateTools,
  benchmark: cCompilerBenchmarkTools,
  session_memory: sessionMemoryTools,
  gaia_solvers: gaiaMediaSolvers,
  toon: toonTools,
  pattern: patternTools,
  git_workflow: gitWorkflowTools,
  seo: seoTools,
  voice_bridge: voiceBridgeTools,
};

const PRESETS: Record<string, string[]> = {
  meta: [],
  lite: ["verification", "eval", "quality_gate", "learning", "flywheel", "recon", "security", "boilerplate"],
  core: ["verification", "eval", "quality_gate", "learning", "flywheel", "recon", "bootstrap", "self_eval", "llm", "security", "platform", "research_writing", "flicker_detection", "figma_flow", "boilerplate", "benchmark", "session_memory", "toon", "pattern", "git_workflow", "seo", "voice_bridge"],
  full: Object.keys(TOOLSET_MAP),
};

function buildToolset(preset: string): McpTool[] {
  const keys = PRESETS[preset];
  const domain = keys.flatMap((k) => TOOLSET_MAP[k] ?? []);
  return [...domain, ...createMetaTools(domain)];
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Scenario {
  id: string;
  prompt: string;
  domain: string;
  category: "bug_fix" | "feature" | "refactor" | "operational" | "security" | "performance" | "deployment";
  complexity: "low" | "medium" | "high";
  blindSpots: string[];
}

interface PhaseResult {
  phase: string;
  toolsCalled: string[];
  toolsMissing: string[];
  success: boolean;
}

interface PresetTrajectory {
  preset: string;
  scenarioId: string;
  toolCount: number;
  estimatedSchemaTokens: number;
  phases: PhaseResult[];
  phasesCompleted: number;
  phasesSkipped: number;
  totalToolCalls: number;
  issuesDetected: number;
  reconFindings: number;
  evalCases: number;
  gateRules: number;
  learningRecorded: boolean;
  flywheelComplete: boolean;
  riskAssessed: boolean;
}

interface ToolCallLog {
  preset: string;
  scenario: string;
  tool: string;
  phase: string;
  status: "success" | "missing" | "error";
}

// ═══════════════════════════════════════════════════════════════════════════
// 9 DIVERSE SCENARIOS — from actual production codebase
// Categories: bug_fix, feature, refactor, operational, security, performance, deployment
// Inspired by SWE-bench Pro, GAIA, TAU-bench, MCP-AgentBench scenario diversity
// ═══════════════════════════════════════════════════════════════════════════

const SCENARIOS: Scenario[] = [
  // ─── Bug Fix ───
  {
    id: "model-fallback-chain",
    prompt:
      "The free model resolver isn't falling back correctly. When glm-4-flash-250414 returns 429, we should try the next model in the chain but instead the agent just errors out. Fix executeWithModelFallback in modelResolver.ts.",
    domain: "Model Resolution",
    category: "bug_fix",
    complexity: "medium",
    blindSpots: [
      "Fallback chain doesn't skip models that returned 429 in the last 5 minutes",
      "No exponential backoff — retries slam the rate-limited endpoint immediately",
      "Missing telemetry: which model actually served the response is never logged",
    ],
  },
  {
    id: "digest-cron-silent-fail",
    prompt:
      "The daily digest agent hasn't produced output in 4 days. No errors in logs. Is the cron firing? Is the heartbeat blocking? Trace the full lifecycle from crons.ts through digestAgent.ts.",
    domain: "Agent Loop",
    category: "bug_fix",
    complexity: "high",
    blindSpots: [
      "Heartbeat rate limiting silently returns success but blocks execution",
      "listAgents returns empty if no agents have 'active' status in DB",
      "No timeout on executeAgentWorkCycle — hung LLM call stalls entire cron tick",
    ],
  },

  // ─── Feature Implementation ───
  {
    id: "governance-appeal-workflow",
    prompt:
      "We have quarantine.ts to pause misbehaving agents, but no way for them to appeal or auto-remediate. Build a system where agents can request trust tier upgrades after 7 days without incidents, with human-in-the-loop appeal review.",
    domain: "Governance",
    category: "feature",
    complexity: "high",
    blindSpots: [
      "Appeal versioning & history — no table for tracking appeal requests, success rates, or preventing appeal spam",
      "Trust score decay logic — static TRUST_TIER_SCORES with no time-weighted rebuild from incident-free periods",
      "Cross-domain impact — lifting quarantine for post_to_linkedin should sync across allowedTools and allowedChannels without manual intervention",
    ],
  },
  {
    id: "oauth-token-rotation",
    prompt:
      "LinkedIn tokens expire in 60 days. We refresh proactively 7 days before, but if the refresh fails and we have no refresh_token, posting just silently fails. Build a proper fallback: system token → user token → expired-but-retry, with alerting.",
    domain: "LinkedIn Pipeline",
    category: "security",
    complexity: "medium",
    blindSpots: [
      "Token state machine missing — code checks boolean 'is expired', should model: valid → expiring_soon → expired_can_refresh → expired_final → requires_reauth",
      "Retry budget exhaustion — if refresh fails 5x, should escalate alert severity, not just log",
      "Scope reduction fallback — if full refresh fails, fall back to posting-only scope (LinkedIn API supports it), not all-or-nothing failure",
    ],
  },

  // ─── Refactoring ───
  {
    id: "dd-cross-branch-dedup",
    prompt:
      "Due diligence spawns 5 parallel branches (company, team, market, technical, regulatory), but results are full of contradictions: Team branch says founder left, Market branch says he's still there. Build cross-branch verification that detects and auto-resolves contradictions by source reliability.",
    domain: "Due Diligence",
    category: "refactor",
    complexity: "high",
    blindSpots: [
      "Entity linking across branches — Team extracts 'founder: John Smith', Market extracts 'CEO: John Smith Jr.' — needs fuzzy matching not naive string dedup",
      "Source reliability weighting — contradiction between LinkedIn (primary) and archived tweet (secondary) should favor LinkedIn; SourceReliability enum exists but not used in conflict resolution",
      "Partial confidence updates — resolving contradiction should update original branch confidence score, not return flat contradiction list",
    ],
  },

  // ─── Multi-Agent Coordination ───
  {
    id: "linkedin-parallel-refactor",
    prompt:
      "I need to refactor the LinkedIn posting pipeline so 3 Claude Code subagents can work on it in parallel: one on posting, one on archive dedup, one on scheduling. They keep overwriting each other's changes. Set up coordination.",
    domain: "LinkedIn Pipeline",
    category: "operational",
    complexity: "high",
    blindSpots: [
      "No task claiming — both agents see the same dedup bug and both fix it",
      "No progress file — third agent re-investigates what agent 1 already solved",
      "No context budget tracking — agent 2 hits context limit mid-fix, loses work",
      "No oracle comparison — merged output has conflict markers nobody catches",
    ],
  },
  {
    id: "swarm-state-isolation",
    prompt:
      "We spawn parallel subagents (DocumentAgent, MediaAgent, OpenBBAgent) in swarmOrchestrator. Sometimes they step on each other's messages in the same thread — both write to threadId=X simultaneously. Build proper message locking so agents don't clobber each other's outputs.",
    domain: "Agent Loop",
    category: "operational",
    complexity: "high",
    blindSpots: [
      "Message ordering guarantees — parallel agents write to same thread; if DocumentAgent finishes before MediaAgent, message order is wrong in UI",
      "Checkpoint contention — CheckpointManager.start() may lose concurrent updates from multiple agents despite Convex OCC",
      "Partial failure recovery — if one agent crashes after checkpoint but before writing final message, next agent doesn't know to re-read context",
    ],
  },

  // ─── Deployment / Canary ───
  {
    id: "model-canary-rollout",
    prompt:
      "We hardcoded model selection in autonomousConfig.ts (SYNTHESIS_MODEL = 'qwen3-coder-free'). Implement canary rollout: test new models on 10% of jobs, track quality, auto-promote to 100% if success rate > 95%, auto-rollback if < 80%.",
    domain: "Model Resolution",
    category: "deployment",
    complexity: "medium",
    blindSpots: [
      "Canary slot assignment — need deterministic hash of job ID (hash(jobId) % 100 < canaryPercent), not random, so same job never switches models mid-retry",
      "Success metric definition — 'success rate' is ambiguous: tool error rate? output quality? latency? Need multi-factor gate with independent thresholds",
      "Model state drift — rolling back from Model-B to Model-A but old jobs cached with Model-B responses; resuming from checkpoint confuses model_id",
    ],
  },

  // ─── Performance ───
  {
    id: "archive-query-optimization",
    prompt:
      "The LinkedIn archive page takes 8 seconds to load for companies with 500+ posts. The query does a full table scan with JS-side filtering and .take(500) pagination. Optimize with proper indexes, cursor-based pagination, and server-side filtering.",
    domain: "LinkedIn Pipeline",
    category: "performance",
    complexity: "medium",
    blindSpots: [
      "Archive lookback uses .take(500) with no cursor — page 2 re-scans rows from page 1, O(n^2) total reads",
      "JS-side filtering of personaType and contentSource happens after fetching all rows — should be index-based",
      "Dedup hash (cyrb53) is computed on every query, not stored as indexed column — can't deduplicate at DB level",
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// TRAJECTORY RUNNER
// ═══════════════════════════════════════════════════════════════════════════

const callLog: ToolCallLog[] = [];
const cleanup: { cycleIds: string[]; learningKeys: string[] } = { cycleIds: [], learningKeys: [] };

async function runTrajectory(preset: string, scenario: Scenario): Promise<PresetTrajectory> {
  const tools = buildToolset(preset);
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  const sid = `gating-${preset}-${scenario.id}`;

  const trajectory: PresetTrajectory = {
    preset,
    scenarioId: scenario.id,
    toolCount: tools.length,
    estimatedSchemaTokens: tools.length * 200, // ~200 tokens per tool schema avg
    phases: [],
    phasesCompleted: 0,
    phasesSkipped: 0,
    totalToolCalls: 0,
    issuesDetected: 0,
    reconFindings: 0,
    evalCases: 0,
    gateRules: 0,
    learningRecorded: false,
    flywheelComplete: false,
    riskAssessed: false,
  };

  async function tryCall(name: string, args: any, phase: string): Promise<any> {
    const tool = toolMap.get(name);
    if (!tool) {
      callLog.push({ preset, scenario: scenario.id, tool: name, phase, status: "missing" });
      return null; // tool not available in this preset
    }
    try {
      const result = await tool.handler(args);
      callLog.push({ preset, scenario: scenario.id, tool: name, phase, status: "success" });
      trajectory.totalToolCalls++;
      return result;
    } catch (err) {
      callLog.push({ preset, scenario: scenario.id, tool: name, phase, status: "error" });
      trajectory.totalToolCalls++;
      return null;
    }
  }

  // ─── Phase 1: META — tool discovery ───
  {
    const called: string[] = [];
    const missing: string[] = [];

    const ft = await tryCall("findTools", { query: `${scenario.domain} ${scenario.category}` }, "meta");
    ft ? called.push("findTools") : missing.push("findTools");

    const gm = await tryCall("getMethodology", { topic: "verification" }, "meta");
    gm ? called.push("getMethodology") : missing.push("getMethodology");

    const success = called.length > 0;
    trajectory.phases.push({ phase: "meta", toolsCalled: called, toolsMissing: missing, success });
    if (success) trajectory.phasesCompleted++;
    else trajectory.phasesSkipped++;
  }

  // ─── Phase 2: RECON — structured research ───
  {
    const called: string[] = [];
    const missing: string[] = [];

    const recon = await tryCall("run_recon", {
      target: `${scenario.domain}: ${scenario.prompt.slice(0, 80)}`,
      description: `Gating eval: ${scenario.prompt.slice(0, 120)}`,
    }, "recon");

    if (recon) {
      called.push("run_recon");
      const findingCount = scenario.complexity === "high" ? 3 : 2;
      for (let f = 0; f < findingCount; f++) {
        const r = await tryCall("log_recon_finding", {
          sessionId: recon.sessionId,
          category: f === 0 ? "codebase_pattern" : "existing_implementation",
          summary: scenario.blindSpots[f] || `Pattern in ${scenario.domain}`,
          relevance: `Impacts: ${scenario.prompt.slice(0, 60)}`,
        }, "recon");
        if (r) { called.push("log_recon_finding"); trajectory.reconFindings++; }
      }
      await tryCall("get_recon_summary", { sessionId: recon.sessionId }, "recon");
      called.push("get_recon_summary");
    } else {
      missing.push("run_recon", "log_recon_finding", "get_recon_summary");
    }

    // Additional recon tools
    const fwCheck = await tryCall("check_framework_updates", { ecosystem: "mcp" }, "recon");
    fwCheck ? called.push("check_framework_updates") : missing.push("check_framework_updates");

    const projCtx = await tryCall("get_project_context", {}, "recon");
    projCtx ? called.push("get_project_context") : missing.push("get_project_context");

    const success = called.length > 0;
    trajectory.phases.push({ phase: "recon", toolsCalled: called, toolsMissing: missing, success });
    if (success) trajectory.phasesCompleted++;
    else trajectory.phasesSkipped++;
  }

  // ─── Phase 3: RISK — assessment ───
  {
    const called: string[] = [];
    const missing: string[] = [];

    const risk = await tryCall("assess_risk", {
      action: "fix_implementation",
      context: `${scenario.domain} — ${scenario.complexity} — ${scenario.prompt.slice(0, 80)}`,
    }, "risk");

    if (risk) {
      called.push("assess_risk");
      trajectory.riskAssessed = true;
    } else {
      missing.push("assess_risk");
    }

    const success = called.length > 0;
    trajectory.phases.push({ phase: "risk", toolsCalled: called, toolsMissing: missing, success });
    if (success) trajectory.phasesCompleted++;
    else trajectory.phasesSkipped++;
  }

  // ─── Phase 4: VERIFICATION — tracked implementation cycle ───
  {
    const called: string[] = [];
    const missing: string[] = [];

    const cycle = await tryCall("start_verification_cycle", {
      title: `gating-eval-${preset}-${scenario.id}`,
      description: scenario.prompt.slice(0, 200),
    }, "verification") as any;

    if (cycle) {
      called.push("start_verification_cycle");
      cleanup.cycleIds.push(cycle.cycleId);

      // Phase findings
      await tryCall("log_phase_findings", {
        cycleId: cycle.cycleId, phaseNumber: 1, status: "passed",
        findings: { domain: scenario.domain, reconFindings: trajectory.reconFindings },
      }, "verification");
      called.push("log_phase_findings");

      await tryCall("log_phase_findings", {
        cycleId: cycle.cycleId, phaseNumber: 2, status: "passed",
        findings: { fixApplied: true },
      }, "verification");

      // Log gaps from blind spots
      const gapCount = scenario.complexity === "high" ? 2 : 1;
      const gapIds: string[] = [];
      for (let g = 0; g < gapCount; g++) {
        const gap = await tryCall("log_gap", {
          cycleId: cycle.cycleId,
          severity: g === 0 ? (scenario.complexity === "high" ? "HIGH" : "MEDIUM") : "MEDIUM",
          title: `gating-eval-${scenario.blindSpots[g]?.slice(0, 50) || scenario.id}`,
          description: scenario.blindSpots[g] || `Issue in ${scenario.domain}`,
          rootCause: "Discovered via structured recon",
          fixStrategy: `Fix ${scenario.category} in ${scenario.domain}`,
        }, "verification") as any;
        if (gap) {
          called.push("log_gap");
          gapIds.push(gap.gapId);
          trajectory.issuesDetected++;
        }
      }

      // Resolve gaps
      for (const gapId of gapIds) {
        await tryCall("resolve_gap", { gapId }, "verification");
        called.push("resolve_gap");
      }

      // 3-layer testing
      for (const layer of ["static", "unit", "integration"] as const) {
        await tryCall("log_test_result", {
          cycleId: cycle.cycleId, layer,
          label: `gating-eval-${preset}-${scenario.id}-${layer}`,
          passed: true, output: `${layer} pass`,
        }, "verification");
        called.push("log_test_result");
      }

      // Check status and list cycles
      const status = await tryCall("get_verification_status", { cycleId: cycle.cycleId }, "verification");
      if (status) called.push("get_verification_status");

      const cycleList = await tryCall("list_verification_cycles", { limit: 5 }, "verification");
      if (cycleList) called.push("list_verification_cycles");
    } else {
      missing.push("start_verification_cycle", "log_gap", "log_test_result", "get_verification_status", "list_verification_cycles");
    }

    const success = called.length > 0;
    trajectory.phases.push({ phase: "verification", toolsCalled: called, toolsMissing: missing, success });
    if (success) trajectory.phasesCompleted++;
    else trajectory.phasesSkipped++;
  }

  // ─── Phase 5: EVAL — regression cases ───
  {
    const called: string[] = [];
    const missing: string[] = [];

    const evalRun = await tryCall("start_eval_run", {
      name: `gating-eval-${preset}-${scenario.id}`,
      description: `Regression eval for ${scenario.domain}`,
      cases: [
        { input: scenario.prompt.slice(0, 100), intent: `Verify ${scenario.category} fix` },
        { input: `Regression guard for ${scenario.id}`, intent: `Prevent regression` },
      ],
    }, "eval") as any;

    if (evalRun) {
      called.push("start_eval_run");
      for (const caseId of evalRun.caseIds) {
        await tryCall("record_eval_result", {
          caseId, actual: "Fix verified", verdict: "pass", score: 0.92,
        }, "eval");
        called.push("record_eval_result");
        trajectory.evalCases++;
      }
      await tryCall("complete_eval_run", { runId: evalRun.runId }, "eval");
      called.push("complete_eval_run");

      // List and compare runs
      const runList = await tryCall("list_eval_runs", { limit: 5 }, "eval");
      if (runList) called.push("list_eval_runs");

      // Compare with self (validates the tool works even if baseline === candidate)
      const cmp = await tryCall("compare_eval_runs", {
        baselineRunId: evalRun.runId,
        candidateRunId: evalRun.runId,
      }, "eval");
      if (cmp) called.push("compare_eval_runs");
    } else {
      missing.push("start_eval_run", "record_eval_result", "complete_eval_run", "list_eval_runs", "compare_eval_runs");
    }

    const success = called.length > 0;
    trajectory.phases.push({ phase: "eval", toolsCalled: called, toolsMissing: missing, success });
    if (success) trajectory.phasesCompleted++;
    else trajectory.phasesSkipped++;
  }

  // ─── Phase 6: QUALITY GATE ───
  {
    const called: string[] = [];
    const missing: string[] = [];

    const rules = [
      { name: "all_tests_pass", passed: true },
      { name: "no_type_errors", passed: true },
      { name: "no_lint_violations", passed: true },
      { name: "coverage_threshold", passed: scenario.complexity !== "high" },
    ];
    if (scenario.complexity === "high") {
      rules.push({ name: "regression_cases_exist", passed: true });
      rules.push({ name: "edge_cases_covered", passed: true });
    }

    const gate = await tryCall("run_quality_gate", {
      gateName: "deploy_readiness",
      target: `gating-eval-${preset}-${scenario.id}`,
      rules,
    }, "quality-gate");

    if (gate) {
      called.push("run_quality_gate");
      trajectory.gateRules = rules.length;
    } else {
      missing.push("run_quality_gate");
    }

    const cl = await tryCall("run_closed_loop", {
      steps: [{ step: "compile", passed: true }, { step: "lint", passed: true }, { step: "test", passed: true }],
    }, "quality-gate");

    if (cl) called.push("run_closed_loop");
    else missing.push("run_closed_loop");

    // Gate preset and history
    const gp = await tryCall("get_gate_preset", { preset: "deploy_readiness" }, "quality-gate");
    gp ? called.push("get_gate_preset") : missing.push("get_gate_preset");

    const gh = await tryCall("get_gate_history", {
      gateName: "deploy_readiness",
      limit: 5,
    }, "quality-gate");
    gh ? called.push("get_gate_history") : missing.push("get_gate_history");

    const success = called.length > 0;
    trajectory.phases.push({ phase: "quality-gate", toolsCalled: called, toolsMissing: missing, success });
    if (success) trajectory.phasesCompleted++;
    else trajectory.phasesSkipped++;
  }

  // ─── Phase 7: KNOWLEDGE — search + record ───
  {
    const called: string[] = [];
    const missing: string[] = [];

    const prior = await tryCall("search_all_knowledge", {
      query: `gating ${scenario.domain}`,
    }, "knowledge");
    if (prior) called.push("search_all_knowledge");
    else missing.push("search_all_knowledge");

    const lkey = `gating-eval-${preset}-${scenario.id}-${Date.now()}`;
    cleanup.learningKeys.push(lkey);

    const lr = await tryCall("record_learning", {
      key: lkey,
      category: "pattern",
      content: `[gating-eval] ${scenario.domain}: ${scenario.blindSpots[0]?.slice(0, 80)}`,
      tags: ["gating-eval", preset, scenario.domain.toLowerCase().replace(/\s+/g, "-")],
    }, "knowledge");

    if (lr) { called.push("record_learning"); trajectory.learningRecorded = true; }
    else missing.push("record_learning");

    const success = called.length > 0;
    trajectory.phases.push({ phase: "knowledge", toolsCalled: called, toolsMissing: missing, success });
    if (success) trajectory.phasesCompleted++;
    else trajectory.phasesSkipped++;
  }

  // ─── Phase 8: FLYWHEEL — mandatory 6-step ───
  {
    const called: string[] = [];
    const missing: string[] = [];

    const fw = await tryCall("run_mandatory_flywheel", {
      target: `gating-eval-${preset}-${scenario.id}`,
      steps: [
        { stepName: "static_analysis", passed: true },
        { stepName: "happy_path_test", passed: true },
        { stepName: "failure_path_test", passed: true },
        { stepName: "gap_analysis", passed: true },
        { stepName: "fix_and_reverify", passed: true },
        { stepName: "deploy_and_document", passed: true },
      ],
    }, "flywheel") as any;

    if (fw) {
      called.push("run_mandatory_flywheel");
      trajectory.flywheelComplete = fw.passed === true;
    } else {
      missing.push("run_mandatory_flywheel");
    }

    // Flywheel status check
    const fwStatus = await tryCall("get_flywheel_status", { includeHistory: false }, "flywheel");
    fwStatus ? called.push("get_flywheel_status") : missing.push("get_flywheel_status");

    // Promote to eval (needs a real cycleId from phase 4)
    const cycleId = cleanup.cycleIds[cleanup.cycleIds.length - 1];
    if (cycleId) {
      const promo = await tryCall("promote_to_eval", {
        cycleId,
        evalRunName: `gating-promoted-${preset}-${scenario.id}`,
        cases: [{ input: scenario.prompt.slice(0, 80), intent: `Regression guard for ${scenario.domain}` }],
      }, "flywheel");
      promo ? called.push("promote_to_eval") : missing.push("promote_to_eval");

      // Trigger investigation (needs evalRunId from promotion)
      if (promo?.evalRunId) {
        const inv = await tryCall("trigger_investigation", {
          evalRunId: promo.evalRunId,
          regressionDescription: `Potential regression in ${scenario.domain}: ${scenario.blindSpots[0]?.slice(0, 60)}`,
        }, "flywheel");
        inv ? called.push("trigger_investigation") : missing.push("trigger_investigation");
      }
    }

    const success = called.length > 0;
    trajectory.phases.push({ phase: "flywheel", toolsCalled: called, toolsMissing: missing, success });
    if (success) trajectory.phasesCompleted++;
    else trajectory.phasesSkipped++;
  }

  // ─── Phase 9 (operational scenarios): PARALLEL AGENT TOOLS ───
  if (scenario.category === "operational") {
    const called: string[] = [];
    const missing: string[] = [];

    // Bootstrap parallel session
    const bootstrap = await tryCall("bootstrap_parallel_agents", {
      dryRun: true,
    }, "parallel");
    bootstrap ? called.push("bootstrap_parallel_agents") : missing.push("bootstrap_parallel_agents");

    const claim = await tryCall("claim_agent_task", {
      taskKey: `gating-eval-${preset}-${scenario.id}-posting`,
      description: "Refactor LinkedIn posting module",
    }, "parallel");

    if (claim) {
      called.push("claim_agent_task");

      await tryCall("assign_agent_role", {
        role: "implementer", focusArea: "posting",
      }, "parallel");
      called.push("assign_agent_role");

      // Verify role assignment
      const role = await tryCall("get_agent_role", {}, "parallel");
      role ? called.push("get_agent_role") : missing.push("get_agent_role");

      // Log context budget during work
      const budget = await tryCall("log_context_budget", {
        eventType: "tool_output",
        tokensUsed: 3500,
        description: `Phase output for ${scenario.id}`,
      }, "parallel");
      budget ? called.push("log_context_budget") : missing.push("log_context_budget");

      // List tasks to verify claim
      const taskList = await tryCall("list_agent_tasks", { status: "claimed" }, "parallel");
      taskList ? called.push("list_agent_tasks") : missing.push("list_agent_tasks");

      await tryCall("get_parallel_status", { includeHistory: false }, "parallel");
      called.push("get_parallel_status");

      // Oracle comparison — validate merged output
      const oracle = await tryCall("run_oracle_comparison", {
        testLabel: `gating-eval-${preset}-${scenario.id}-merge`,
        actualOutput: `Fixed ${scenario.domain} posting module`,
        expectedOutput: `Fixed ${scenario.domain} posting module`,
        oracleSource: "gating-eval-reference",
      }, "parallel");
      oracle ? called.push("run_oracle_comparison") : missing.push("run_oracle_comparison");

      await tryCall("release_agent_task", {
        taskKey: `gating-eval-${preset}-${scenario.id}-posting`,
        status: "completed",
        progressNote: "Posting module refactored",
      }, "parallel");
      called.push("release_agent_task");

      // Generate coordination doc
      const agentsMd = await tryCall("generate_parallel_agents_md", {
        projectName: `gating-eval-${scenario.id}`,
        maxAgents: 3,
      }, "parallel");
      agentsMd ? called.push("generate_parallel_agents_md") : missing.push("generate_parallel_agents_md");
    } else {
      missing.push("claim_agent_task", "assign_agent_role", "get_agent_role",
        "log_context_budget", "list_agent_tasks", "get_parallel_status",
        "run_oracle_comparison", "release_agent_task", "generate_parallel_agents_md");
    }

    trajectory.phases.push({
      phase: "parallel",
      toolsCalled: called,
      toolsMissing: missing,
      success: called.length > 0,
    });
    if (called.length > 0) trajectory.phasesCompleted++;
    else trajectory.phasesSkipped++;
  }

  // ─── Phase 10: SELF-EVAL (all 6 tools) ───
  {
    const called: string[] = [];
    const missing: string[] = [];

    // Log a tool call for this trajectory
    const logCall = await tryCall("log_tool_call", {
      sessionId: sid,
      toolName: "run_recon",
      durationMs: 42,
      resultStatus: "success",
      phase: "recon",
    }, "self-eval");
    logCall ? called.push("log_tool_call") : missing.push("log_tool_call");

    // Get trajectory analysis
    const trajAnalysis = await tryCall("get_trajectory_analysis", {
      sessionId: sid,
    }, "self-eval");
    trajAnalysis ? called.push("get_trajectory_analysis") : missing.push("get_trajectory_analysis");

    // Get self-eval report
    const report = await tryCall("get_self_eval_report", {
      excludeTestSessions: true,
    }, "self-eval");
    report ? called.push("get_self_eval_report") : missing.push("get_self_eval_report");

    // Get improvement recommendations
    const recs = await tryCall("get_improvement_recommendations", {
      focus: "all",
    }, "self-eval");
    recs ? called.push("get_improvement_recommendations") : missing.push("get_improvement_recommendations");

    // Cleanup stale runs (dry run)
    const staleCleanup = await tryCall("cleanup_stale_runs", {
      dryRun: true,
    }, "self-eval");
    staleCleanup ? called.push("cleanup_stale_runs") : missing.push("cleanup_stale_runs");

    // Synthesize recon to learnings (dry run)
    const synth = await tryCall("synthesize_recon_to_learnings", {
      dryRun: true,
    }, "self-eval");
    synth ? called.push("synthesize_recon_to_learnings") : missing.push("synthesize_recon_to_learnings");

    if (called.length > 0 || missing.length > 0) {
      trajectory.phases.push({
        phase: "self-eval",
        toolsCalled: called,
        toolsMissing: missing,
        success: called.length > 0,
      });
      if (called.length > 0) trajectory.phasesCompleted++;
      else trajectory.phasesSkipped++;
    }
  }

  return trajectory;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════

async function cleanupAll() {
  const fullTools = buildToolset("full");
  const findTool = (name: string) => fullTools.find((t) => t.name === name);

  for (const cycleId of cleanup.cycleIds) {
    try { await findTool("abandon_cycle")?.handler({ cycleId, reason: "gating eval cleanup" }); } catch { /* ok */ }
  }
  for (const key of cleanup.learningKeys) {
    try { await findTool("delete_learning")?.handler({ key }); } catch { /* ok */ }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

const allTrajectories: PresetTrajectory[] = [];

describe("Toolset Gating Eval", () => {
  afterAll(async () => { await cleanupAll(); });

  for (const preset of ["meta", "lite", "core", "full"] as const) {
    describe(`Preset: ${preset}`, () => {
      for (const scenario of SCENARIOS) {
        it(`${preset}/${scenario.id}: runs 8-phase pipeline`, async () => {
          const t = await runTrajectory(preset, scenario);
          allTrajectories.push(t);

          // Meta phase always succeeds (findTools + getMethodology always present)
          const metaPhase = t.phases.find((p) => p.phase === "meta");
          expect(metaPhase?.success).toBe(true);

          if (preset === "meta") {
            // meta preset: only meta tools available — all other phases skipped
            expect(t.phasesCompleted).toBe(1); // only meta phase
            expect(t.toolCount).toBe(3); // findTools + getMethodology + check_mcp_setup
          } else {
            // lite, core, full: domain tools available
            const reconPhase = t.phases.find((p) => p.phase === "recon");
            expect(reconPhase?.success).toBe(true);

            const verifyPhase = t.phases.find((p) => p.phase === "verification");
            expect(verifyPhase?.success).toBe(true);

            const evalPhase = t.phases.find((p) => p.phase === "eval");
            expect(evalPhase?.success).toBe(true);

            const gatePhase = t.phases.find((p) => p.phase === "quality-gate");
            expect(gatePhase?.success).toBe(true);

            // Knowledge phase depends on preset (learning tools in lite + core + full)
            const knowledgePhase = t.phases.find((p) => p.phase === "knowledge");
            expect(knowledgePhase?.success).toBe(true);
          }
        }, 30_000);
      }
    });
  }

  describe("Flywheel availability", () => {
    it("meta preset does NOT have flywheel tools", () => {
      const noFlywheel = allTrajectories.filter((t) => t.preset === "meta");
      for (const t of noFlywheel) {
        const fw = t.phases.find((p) => p.phase === "flywheel");
        expect(fw?.success).toBe(false);
      }
    });

    it("lite, core, and full presets HAVE flywheel tools", () => {
      const withFlywheel = allTrajectories.filter((t) => t.preset === "lite" || t.preset === "core" || t.preset === "full");
      for (const t of withFlywheel) {
        expect(t.flywheelComplete).toBe(true);
      }
    });
  });

  describe("Parallel agent tools availability", () => {
    it("lite and core do NOT have parallel tools", () => {
      const parallelScenarios = allTrajectories.filter(
        (t) => (t.scenarioId === "linkedin-parallel-refactor" || t.scenarioId === "swarm-state-isolation") && t.preset !== "full",
      );
      for (const t of parallelScenarios) {
        const pp = t.phases.find((p) => p.phase === "parallel");
        if (pp) {
          expect(pp.success).toBe(false);
          expect(pp.toolsMissing).toContain("claim_agent_task");
        }
      }
    });

    it("full preset HAS parallel tools for parallel scenarios", () => {
      const fullParallel = allTrajectories.filter(
        (t) => (t.scenarioId === "linkedin-parallel-refactor" || t.scenarioId === "swarm-state-isolation") && t.preset === "full",
      );
      for (const t of fullParallel) {
        const pp = t.phases.find((p) => p.phase === "parallel");
        if (pp) {
          expect(pp.success).toBe(true);
          expect(pp.toolsCalled).toContain("claim_agent_task");
        }
      }
    });
  });

  describe("Self-eval availability", () => {
    it("meta and lite do NOT have self-eval tools", () => {
      const noSelfEval = allTrajectories.filter((t) => t.preset === "meta" || t.preset === "lite");
      for (const t of noSelfEval) {
        const se = t.phases.find((p) => p.phase === "self-eval");
        if (se) expect(se.success).toBe(false);
      }
    });

    it("core and full HAVE self-eval tools", () => {
      const coreFullTrajectories = allTrajectories.filter((t) => t.preset === "core" || t.preset === "full");
      for (const t of coreFullTrajectories) {
        const se = t.phases.find((p) => p.phase === "self-eval");
        expect(se?.success).toBe(true);
      }
    });
  });

  describe("Token surface area reduction", () => {
    it("meta has the fewest tools (only meta tools)", () => {
      const metaT = allTrajectories.find((t) => t.preset === "meta")!;
      const liteT = allTrajectories.find((t) => t.preset === "lite")!;

      expect(metaT.toolCount).toBe(3); // findTools + getMethodology + check_mcp_setup
      expect(metaT.toolCount).toBeLessThan(liteT.toolCount);

      const reduction = 1 - metaT.toolCount / liteT.toolCount;
      expect(reduction).toBeGreaterThan(0.9); // meta is 90%+ fewer tools than lite
    });

    it("lite reduces tool count and estimated token overhead vs full", () => {
      const liteT = allTrajectories.find((t) => t.preset === "lite")!;
      const fullT = allTrajectories.find((t) => t.preset === "full")!;

      expect(liteT.toolCount).toBeLessThan(fullT.toolCount);
      expect(liteT.estimatedSchemaTokens).toBeLessThan(fullT.estimatedSchemaTokens);

      const reduction = 1 - liteT.toolCount / fullT.toolCount;
      expect(reduction).toBeGreaterThan(0.5); // lite is at least 50% fewer tools
    });

    it("presets are ordered: meta < lite < core < full", () => {
      const metaT = allTrajectories.find((t) => t.preset === "meta")!;
      const liteT = allTrajectories.find((t) => t.preset === "lite")!;
      const coreT = allTrajectories.find((t) => t.preset === "core")!;
      const fullT = allTrajectories.find((t) => t.preset === "full")!;

      expect(metaT.toolCount).toBeLessThan(liteT.toolCount);
      expect(liteT.toolCount).toBeLessThan(coreT.toolCount);
      expect(coreT.toolCount).toBeLessThan(fullT.toolCount);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TRAJECTORY COMPARISON REPORT
// ═══════════════════════════════════════════════════════════════════════════

describe("Toolset Gating Report", () => {
  it("generates trajectory comparison across presets", () => {
    expect(allTrajectories.length).toBe(36); // 4 presets × 9 scenarios

    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
    console.log("║  TOOLSET GATING EVAL — Trajectory Comparison                                ║");
    console.log("║  3 presets × 9 diverse scenarios = 27 trajectories                          ║");
    console.log("╚══════════════════════════════════════════════════════════════════════════════╝");
    console.log("");

    // ─── SECTION 1: TOOL COUNT & TOKEN OVERHEAD ───
    console.log("┌──────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ 1. TOOL COUNT & ESTIMATED TOKEN OVERHEAD                                     │");
    console.log("├──────────────────────────────────────────────────────────────────────────────┤");
    for (const preset of ["meta", "lite", "core", "full"]) {
      const t = allTrajectories.find((tr) => tr.preset === preset)!;
      const bar = "█".repeat(Math.round(t.toolCount / 3));
      console.log(`│ ${preset.padEnd(6)} ${String(t.toolCount).padStart(3)} tools  ~${String(t.estimatedSchemaTokens).padStart(5)} tokens  ${bar}`.padEnd(79) + "│");
    }
    const liteT = allTrajectories.find((t) => t.preset === "lite")!;
    const fullT = allTrajectories.find((t) => t.preset === "full")!;
    const savings = Math.round((1 - liteT.estimatedSchemaTokens / fullT.estimatedSchemaTokens) * 100);
    console.log("│                                                                              │");
    console.log(`│ lite saves ~${savings}% token overhead vs full (${fullT.estimatedSchemaTokens - liteT.estimatedSchemaTokens} fewer tokens/call)`.padEnd(79) + "│");
    console.log("└──────────────────────────────────────────────────────────────────────────────┘");
    console.log("");

    // ─── SECTION 2: PHASE COMPLETION MATRIX ───
    console.log("┌──────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ 2. PHASE COMPLETION MATRIX                                                   │");
    console.log("├──────────────────────────────────────────────────────────────────────────────┤");
    console.log("│ Phase              lite    core    full                                       │");
    console.log("│ ─────────────────  ──────  ──────  ──────                                     │");

    const allPhaseNames = ["meta", "recon", "risk", "verification", "eval", "quality-gate", "knowledge", "flywheel", "parallel", "self-eval"];
    for (const phase of allPhaseNames) {
      const cols: string[] = [];
      for (const preset of ["meta", "lite", "core", "full"]) {
        const trajectories = allTrajectories.filter((t) => t.preset === preset);
        const phaseResults = trajectories.map((t) => t.phases.find((p) => p.phase === phase));
        const present = phaseResults.some((p) => p);
        if (!present) {
          cols.push("  --  ");
        } else {
          const allSuccess = phaseResults.every((p) => p?.success);
          const anySuccess = phaseResults.some((p) => p?.success);
          cols.push(allSuccess ? "  OK  " : anySuccess ? " PART " : " MISS ");
        }
      }
      console.log(`│ ${phase.padEnd(19)}${cols.join("  ")}`.padEnd(79) + "│");
    }
    console.log("└──────────────────────────────────────────────────────────────────────────────┘");
    console.log("");

    // ─── SECTION 3: IMPACT COMPARISON ───
    console.log("┌──────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ 3. CONCRETE IMPACT PER PRESET (aggregated across 9 scenarios)                │");
    console.log("├──────────────────────────────────────────────────────────────────────────────┤");
    console.log("│ Metric                        lite    core    full                            │");
    console.log("│ ───────────────────────────── ──────  ──────  ──────                          │");

    for (const metric of [
      { label: "Issues detected", key: "issuesDetected" as const },
      { label: "Recon findings", key: "reconFindings" as const },
      { label: "Eval cases created", key: "evalCases" as const },
      { label: "Gate rules enforced", key: "gateRules" as const },
      { label: "Total tool calls", key: "totalToolCalls" as const },
    ]) {
      const cols: string[] = [];
      for (const preset of ["meta", "lite", "core", "full"]) {
        const sum = allTrajectories
          .filter((t) => t.preset === preset)
          .reduce((s, t) => s + t[metric.key], 0);
        cols.push(String(sum).padStart(4));
      }
      console.log(`│ ${metric.label.padEnd(30)}${cols.map((c) => c.padEnd(8)).join("")}`.padEnd(79) + "│");
    }

    // Boolean metrics
    for (const metric of [
      { label: "Risk assessed", fn: (t: PresetTrajectory) => t.riskAssessed },
      { label: "Learning recorded", fn: (t: PresetTrajectory) => t.learningRecorded },
      { label: "Flywheel complete", fn: (t: PresetTrajectory) => t.flywheelComplete },
    ]) {
      const cols: string[] = [];
      for (const preset of ["meta", "lite", "core", "full"]) {
        const count = allTrajectories
          .filter((t) => t.preset === preset)
          .filter(metric.fn).length;
        cols.push(`${count}/${SCENARIOS.length}`);
      }
      console.log(`│ ${metric.label.padEnd(30)}${cols.map((c) => c.padStart(4).padEnd(8)).join("")}`.padEnd(79) + "│");
    }
    console.log("└──────────────────────────────────────────────────────────────────────────────┘");
    console.log("");

    // ─── SECTION 4: MISSING TOOLS LOG ───
    console.log("┌──────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ 4. TOOLS MISSING BY PRESET (what you lose with gating)                       │");
    console.log("├──────────────────────────────────────────────────────────────────────────────┤");
    for (const preset of ["meta", "lite", "core"]) {
      const missingCalls = callLog.filter((c) => c.preset === preset && c.status === "missing");
      const uniqueMissing = [...new Set(missingCalls.map((c) => c.tool))];
      if (uniqueMissing.length > 0) {
        console.log(`│ ${preset.toUpperCase()}: missing ${uniqueMissing.length} tools`.padEnd(79) + "│");
        for (const tool of uniqueMissing) {
          const phases = [...new Set(missingCalls.filter((c) => c.tool === tool).map((c) => c.phase))];
          console.log(`│   ${tool.padEnd(28)} (needed in: ${phases.join(", ")})`.padEnd(79) + "│");
        }
        console.log("│                                                                              │");
      }
    }
    console.log(`│ FULL: 0 missing tools (all ${fullT.toolCount} available)`.padEnd(79) + "│");
    console.log("└──────────────────────────────────────────────────────────────────────────────┘");
    console.log("");

    // ─── SECTION 5: CATEGORY BREAKDOWN ───
    console.log("┌──────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ 5. IMPACT BY SCENARIO CATEGORY                                              │");
    console.log("├──────────────────────────────────────────────────────────────────────────────┤");
    console.log("│ Category       Scenarios  lite%  core%  full%  Key delta                     │");
    console.log("│ ────────────── ─────────  ─────  ─────  ─────  ──────────────────────         │");

    const categories = [...new Set(SCENARIOS.map((s) => s.category))];
    for (const cat of categories) {
      const catScenarios = SCENARIOS.filter((s) => s.category === cat);
      const catIds = new Set(catScenarios.map((s) => s.id));
      const count = catScenarios.length;

      const pctFor = (preset: string) => {
        const ts = allTrajectories.filter((t) => t.preset === preset && catIds.has(t.scenarioId));
        const completed = ts.reduce((s, t) => s + t.phasesCompleted, 0);
        const total = ts.reduce((s, t) => s + t.phasesCompleted + t.phasesSkipped, 0);
        return total > 0 ? Math.round(completed / total * 100) : 0;
      };

      const litePct = pctFor("lite");
      const corePct = pctFor("core");
      const fullPct = pctFor("full");

      let delta = "";
      if (litePct === corePct && corePct === fullPct) delta = "no difference";
      else if (litePct === corePct) delta = "parallel only";
      else if (corePct === fullPct) delta = "lite loses risk+flywheel";
      else delta = `lite ${litePct}% → full ${fullPct}%`;

      console.log(`│ ${cat.padEnd(15)}${String(count).padStart(5)}     ${String(litePct).padStart(3)}%   ${String(corePct).padStart(3)}%   ${String(fullPct).padStart(3)}%  ${delta}`.padEnd(79) + "│");
    }
    console.log("└──────────────────────────────────────────────────────────────────────────────┘");
    console.log("");

    // ─── SECTION 6: PER-SCENARIO DETAIL ───
    console.log("┌──────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ 6. PER-SCENARIO TRAJECTORY DETAIL                                           │");
    console.log("├──────────────────────────────────────────────────────────────────────────────┤");
    console.log("│ Scenario                   Cat       Cplx lite core full  Issues Calls        │");
    console.log("│ ────────────────────────── ───────── ──── ──── ──── ────  ────── ─────        │");
    for (const s of SCENARIOS) {
      const liteTr = allTrajectories.find((t) => t.preset === "lite" && t.scenarioId === s.id)!;
      const coreTr = allTrajectories.find((t) => t.preset === "core" && t.scenarioId === s.id)!;
      const fullTr = allTrajectories.find((t) => t.preset === "full" && t.scenarioId === s.id)!;
      const lp = `${liteTr.phasesCompleted}/${liteTr.phasesCompleted + liteTr.phasesSkipped}`;
      const cp = `${coreTr.phasesCompleted}/${coreTr.phasesCompleted + coreTr.phasesSkipped}`;
      const fp = `${fullTr.phasesCompleted}/${fullTr.phasesCompleted + fullTr.phasesSkipped}`;
      console.log(`│ ${s.id.slice(0, 26).padEnd(27)}${s.category.slice(0, 9).padEnd(10)}${s.complexity.slice(0, 3).toUpperCase().padEnd(5)}${lp.padEnd(5)}${cp.padEnd(5)}${fp.padEnd(6)}${String(fullTr.issuesDetected).padStart(4)}  ${String(fullTr.totalToolCalls).padStart(5)}`.padEnd(79) + "│");
    }
    console.log("└──────────────────────────────────────────────────────────────────────────────┘");
    console.log("");

    // ─── SECTION 7: TOOL COVERAGE ───
    console.log("┌──────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ 7. UNIQUE TOOLS EXERCISED PER PRESET                                        │");
    console.log("├──────────────────────────────────────────────────────────────────────────────┤");
    for (const preset of ["meta", "lite", "core", "full"]) {
      const successCalls = callLog.filter((c) => c.preset === preset && c.status === "success");
      const uniqueTools = [...new Set(successCalls.map((c) => c.tool))];
      const availableTools = buildToolset(preset).length;
      const pct = Math.round(uniqueTools.length / availableTools * 100);
      console.log(`│ ${preset.padEnd(6)} ${String(uniqueTools.length).padStart(3)} / ${String(availableTools).padStart(3)} tools exercised (${pct}%)`.padEnd(79) + "│");
    }
    const allSuccessCalls = callLog.filter((c) => c.status === "success");
    const totalUnique = [...new Set(allSuccessCalls.map((c) => c.tool))];
    console.log("│                                                                              │");
    console.log(`│ Total unique tools exercised across all presets: ${totalUnique.length}`.padEnd(79) + "│");
    console.log("└──────────────────────────────────────────────────────────────────────────────┘");
    console.log("");

    // ─── VERDICT ───
    console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
    console.log("║  VERDICT                                                                     ║");
    console.log("╠══════════════════════════════════════════════════════════════════════════════╣");
    console.log("║                                                                              ║");

    const metaCompleted = allTrajectories.filter((t) => t.preset === "meta").reduce((s, t) => s + t.phasesCompleted, 0);
    const metaTotal = allTrajectories.filter((t) => t.preset === "meta").reduce((s, t) => s + t.phasesCompleted + t.phasesSkipped, 0);
    const liteCompleted = allTrajectories.filter((t) => t.preset === "lite").reduce((s, t) => s + t.phasesCompleted, 0);
    const liteTotal = allTrajectories.filter((t) => t.preset === "lite").reduce((s, t) => s + t.phasesCompleted + t.phasesSkipped, 0);
    const coreCompleted = allTrajectories.filter((t) => t.preset === "core").reduce((s, t) => s + t.phasesCompleted, 0);
    const coreTotal = allTrajectories.filter((t) => t.preset === "core").reduce((s, t) => s + t.phasesCompleted + t.phasesSkipped, 0);
    const fullCompleted = allTrajectories.filter((t) => t.preset === "full").reduce((s, t) => s + t.phasesCompleted, 0);
    const fullTotal = allTrajectories.filter((t) => t.preset === "full").reduce((s, t) => s + t.phasesCompleted + t.phasesSkipped, 0);

    console.log(`║  meta: ${metaCompleted}/${metaTotal} phases (${Math.round(metaCompleted / metaTotal * 100)}%)  — discovery only, 5 tools, minimal context`.padEnd(79) + "║");
    console.log(`║  lite: ${liteCompleted}/${liteTotal} phases (${Math.round(liteCompleted / liteTotal * 100)}%)  — ${savings}% fewer tokens, loses flywheel + parallel`.padEnd(79) + "║");
    console.log(`║  core: ${coreCompleted}/${coreTotal} phases (${Math.round(coreCompleted / coreTotal * 100)}%)  — full methodology loop, no parallel/vision/web`.padEnd(79) + "║");
    console.log(`║  full: ${fullCompleted}/${fullTotal} phases (${Math.round(fullCompleted / fullTotal * 100)}%) — everything`.padEnd(79) + "║");
    console.log("║                                                                              ║");
    console.log("║  Recommendation:                                                             ║");
    console.log("║    Discovery-first / front door → --preset meta  (5 tools, self-escalate)   ║");
    console.log("║    Solo dev, standard tasks     → --preset lite  (fast, low token overhead)  ║");
    console.log("║    Team with methodology needs  → --preset core  (full flywheel loop)        ║");
    console.log("║    Multi-agent / full pipeline   → --preset full  (parallel + self-eval)     ║");
    console.log("║                                                                              ║");
    console.log("╚══════════════════════════════════════════════════════════════════════════════╝");

    // ─── ASSERTIONS ───
    // meta preset: only meta phase succeeds (discovery-only gate)
    {
      const metaTrajectories = allTrajectories.filter((t) => t.preset === "meta");
      for (const t of metaTrajectories) {
        expect(t.phases.find((p) => p.phase === "meta")?.success).toBe(true);
        expect(t.phasesCompleted).toBe(1);
        expect(t.toolCount).toBe(3);
      }
    }

    // lite, core, full: complete the core 6 phases (meta, recon, risk, verification, eval, quality-gate)
    for (const preset of ["lite", "core", "full"]) {
      const trajectories = allTrajectories.filter((t) => t.preset === preset);
      for (const t of trajectories) {
        expect(t.phases.find((p) => p.phase === "meta")?.success).toBe(true);
        expect(t.phases.find((p) => p.phase === "recon")?.success).toBe(true);
        expect(t.phases.find((p) => p.phase === "verification")?.success).toBe(true);
        expect(t.phases.find((p) => p.phase === "eval")?.success).toBe(true);
        expect(t.phases.find((p) => p.phase === "quality-gate")?.success).toBe(true);
        expect(t.phases.find((p) => p.phase === "knowledge")?.success).toBe(true);
      }
    }

    // lite, core, full detect issues (core methodology is intact)
    for (const preset of ["lite", "core", "full"]) {
      const totalIssues = allTrajectories
        .filter((t) => t.preset === preset)
        .reduce((s, t) => s + t.issuesDetected, 0);
      expect(totalIssues).toBeGreaterThanOrEqual(10); // at least 10 across 9 scenarios
    }

    // Full preset has more tool calls (parallel + self-eval phases add calls)
    const fullCalls = allTrajectories.filter((t) => t.preset === "full").reduce((s, t) => s + t.totalToolCalls, 0);
    const liteCalls = allTrajectories.filter((t) => t.preset === "lite").reduce((s, t) => s + t.totalToolCalls, 0);
    expect(fullCalls).toBeGreaterThan(liteCalls);
  });
});
