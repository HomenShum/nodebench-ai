/**
 * Eval Harness for NodeBench MCP Tools
 *
 * Tests REAL agent scenarios to prove tools work in practice.
 * Each scenario exercises multiple tools in realistic workflows.
 *
 * Coverage Goals:
 * - Every tool called at least once
 * - Every methodology workflow tested
 * - Cross-tool integration verified
 */
import { describe, it, expect, beforeAll } from "vitest";
import { verificationTools } from "../tools/verificationTools.js";
import { reconTools } from "../tools/reconTools.js";
import { evalTools } from "../tools/evalTools.js";
import { qualityGateTools } from "../tools/qualityGateTools.js";
import { flywheelTools } from "../tools/flywheelTools.js";
import { learningTools } from "../tools/learningTools.js";
import { documentationTools } from "../tools/documentationTools.js";
import { agentBootstrapTools } from "../tools/agentBootstrapTools.js";
import { selfEvalTools } from "../tools/selfEvalTools.js";
import { flickerDetectionTools } from "../tools/flickerDetectionTools.js";
import { figmaFlowTools } from "../tools/figmaFlowTools.js";
import { boilerplateTools } from "../tools/boilerplateTools.js";
import { cCompilerBenchmarkTools } from "../tools/cCompilerBenchmarkTools.js";
import { createMetaTools } from "../tools/metaTools.js";
import type { McpTool } from "../types.js";

// Assemble all tools
const domainTools: McpTool[] = [
  ...verificationTools,
  ...evalTools,
  ...qualityGateTools,
  ...learningTools,
  ...flywheelTools,
  ...reconTools,
  ...documentationTools,
  ...agentBootstrapTools,
  ...selfEvalTools,
  ...flickerDetectionTools,
  ...figmaFlowTools,
  ...boilerplateTools,
  ...cCompilerBenchmarkTools,
];
const allTools = [...domainTools, ...createMetaTools(domainTools)];

const findTool = (name: string) => {
  const tool = allTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
};

// Track which tools are called
const toolCallLog: { tool: string; scenario: string; success: boolean }[] = [];

async function callTool(name: string, args: any, scenario: string) {
  const tool = findTool(name);
  try {
    const result = await tool.handler(args);
    toolCallLog.push({ tool: name, scenario, success: true });
    return result;
  } catch (error) {
    toolCallLog.push({ tool: name, scenario, success: false });
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 1: New Feature Development (verification methodology)
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: New Feature Development", () => {
  let cycleId: string;
  let gapId: string;

  it("Step 1: Start verification cycle", async () => {
    const result = await callTool("start_verification_cycle", {
      title: "eval-feature-development",
      description: "Implementing user authentication",
    }, "feature-dev") as any;

    expect(result.cycleId).toBeTruthy();
    cycleId = result.cycleId;
  });

  it("Step 2: Log context gathering (Phase 1)", async () => {
    const result = await callTool("log_phase_findings", {
      cycleId,
      phaseNumber: 1,
      status: "passed",
      findings: { patterns: ["JWT", "session-based"], recommendation: "use JWT" },
    }, "feature-dev") as any;

    expect(result.phaseRecorded).toBe(1);
  });

  it("Step 3: Log a gap found during implementation", async () => {
    const result = await callTool("log_gap", {
      cycleId,
      severity: "MEDIUM",
      title: "Missing rate limiting",
      description: "Auth endpoint needs rate limiting",
      rootCause: "Security oversight",
      fixStrategy: "Add express-rate-limit middleware",
    }, "feature-dev") as any;

    expect(result.gapId).toBeTruthy();
    gapId = result.gapId;
  });

  it("Step 4: Get verification status", async () => {
    const result = await callTool("get_verification_status", {
      cycleId,
    }, "feature-dev") as any;

    // Tool returns status (active/completed/abandoned), currentPhase, etc.
    expect(result.status).toBeTruthy();
  });

  it("Step 5: Resolve the gap", async () => {
    const result = await callTool("resolve_gap", {
      gapId,
    }, "feature-dev") as any;

    expect(result.status).toBe("resolved");
  });

  it("Step 6: Log test result", async () => {
    const result = await callTool("log_test_result", {
      cycleId,
      layer: "integration", // Required field
      label: "auth-integration-test", // Required field (not testName)
      passed: true,
      output: "All auth flows passing",
    }, "feature-dev") as any;

    expect(result.testId).toBeTruthy();
  });

  it("Step 7: Cleanup - abandon cycle", async () => {
    const result = await callTool("abandon_cycle", {
      cycleId,
      reason: "eval harness cleanup",
    }, "feature-dev") as any;

    expect(result.abandoned).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 2: Eval-Driven Development (eval methodology)
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Eval-Driven Development", () => {
  let evalRunId: string;
  let caseIds: string[];

  it("Step 1: Start eval run with test cases", async () => {
    // Actual schema: name, cases (with input, intent, expected)
    const result = await callTool("start_eval_run", {
      name: "eval-harness-run",
      description: "Testing prompt quality",
      cases: [
        { input: "Hello", intent: "greeting" },
        { input: "Help me code", intent: "assistance" },
      ],
    }, "eval-driven") as any;

    expect(result.runId).toBeTruthy();
    evalRunId = result.runId;
    caseIds = result.caseIds;
  });

  it("Step 2: Record eval results", async () => {
    // Actual schema: caseId, verdict (pass/fail/partial), actual, score
    const result1 = await callTool("record_eval_result", {
      caseId: caseIds[0],
      actual: "greeting response",
      verdict: "pass",
      score: 0.9,
    }, "eval-driven") as any;

    expect(result1.caseId).toBe(caseIds[0]);
    expect(result1.verdict).toBe("pass");

    const result2 = await callTool("record_eval_result", {
      caseId: caseIds[1],
      actual: "help response",
      verdict: "pass",
      score: 0.85,
    }, "eval-driven") as any;

    expect(result2.caseId).toBe(caseIds[1]);
  });

  it("Step 3: Complete eval run", async () => {
    const result = await callTool("complete_eval_run", {
      runId: evalRunId,
    }, "eval-driven") as any;

    expect(result.runId).toBe(evalRunId);
    expect(result.status).toBe("completed");
    expect(result.summary).toBeDefined();
  });

  it("Step 4: List eval runs", async () => {
    const result = await callTool("list_eval_runs", {
      limit: 10,
    }, "eval-driven") as any;

    expect(result.runs).toBeDefined();
    expect(result.runs.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 3: Knowledge Management (learning methodology)
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Knowledge Management", () => {
  const uniqueKey = `eval-learning-${Date.now()}`;

  it("Step 1: Record a learning", async () => {
    const result = await callTool("record_learning", {
      key: uniqueKey,
      category: "pattern",
      content: "Use scenario-based testing to verify tool chains work together",
      tags: ["testing", "eval", "integration"],
    }, "knowledge") as any;

    expect(result.key).toBe(uniqueKey);
    expect(result.success).toBe(true);
  });

  it("Step 2: Search for the learning", async () => {
    // Returns { query, count, learnings: [...] }
    const result = await callTool("search_learnings", {
      query: "scenario testing",
    }, "knowledge") as any;

    expect(result.learnings).toBeDefined();
  });

  it("Step 3: List all learnings", async () => {
    const result = await callTool("list_learnings", {
      limit: 20,
    }, "knowledge") as any;

    expect(result.learnings).toBeDefined();
  });

  it("Step 4: Delete the learning", async () => {
    // Returns { success: true, message }
    const result = await callTool("delete_learning", {
      key: uniqueKey,
    }, "knowledge") as any;

    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 4: Quality Gates (quality_gates methodology)
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Quality Gates", () => {
  it("Step 1: Get deploy_readiness preset", async () => {
    const result = await callTool("get_gate_preset", {
      preset: "deploy_readiness",
    }, "quality-gates") as any;

    expect(result.preset).toBe("deploy_readiness");
    expect(result.rules.length).toBeGreaterThan(0);
  });

  it("Step 2: Run quality gate", async () => {
    const result = await callTool("run_quality_gate", {
      gateName: "deploy_readiness",
      target: "eval-harness-test",
      rules: [
        { name: "tests_pass", passed: true },
        { name: "no_type_errors", passed: true },
        { name: "no_lint_errors", passed: true },
        { name: "coverage_threshold", passed: false },
      ],
    }, "quality-gates") as any;

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("coverage_threshold");
  });

  it("Step 3: Get gate history", async () => {
    // Returns { gateName, runs: [...], trend }
    const result = await callTool("get_gate_history", {
      gateName: "deploy_readiness",
      limit: 10,
    }, "quality-gates") as any;

    expect(result.gateName).toBe("deploy_readiness");
    expect(result.runs).toBeDefined();
  });

  it("Step 4: Run closed loop verification", async () => {
    // Actual schema: steps with { step: enum, passed: boolean }
    const result = await callTool("run_closed_loop", {
      steps: [
        { step: "compile", passed: true },
        { step: "lint", passed: true },
        { step: "test", passed: true },
      ],
    }, "quality-gates") as any;

    expect(result.allPassed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 5: Flywheel Orchestration (flywheel methodology)
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Flywheel Orchestration", () => {
  it("Step 1: Get flywheel status", async () => {
    // Returns { innerLoop, outerLoop, connections }
    const result = await callTool("get_flywheel_status", {}, "flywheel") as any;

    expect(result).toHaveProperty("innerLoop");
    expect(result).toHaveProperty("outerLoop");
    expect(result).toHaveProperty("connections");
  });

  it("Step 2: Run mandatory flywheel check", async () => {
    // Actual schema: target, steps array with stepName enum
    const result = await callTool("run_mandatory_flywheel", {
      target: "Added new auth feature",
      steps: [
        { stepName: "static_analysis", passed: true },
        { stepName: "happy_path_test", passed: true },
        { stepName: "failure_path_test", passed: true },
        { stepName: "gap_analysis", passed: true },
        { stepName: "fix_and_reverify", passed: true },
        { stepName: "deploy_and_document", passed: true },
      ],
    }, "flywheel") as any;

    expect(result).toHaveProperty("passed");
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 5.5: Flywheel Integration (promote, investigate, compare)
// Tests the 4 previously untested flywheel integration tools
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Flywheel Integration", () => {
  // Test the 4 previously untested flywheel tools in isolated tests

  it("Step 1: list_verification_cycles - lists cycles", async () => {
    // First create a cycle so we have something to list
    const createResult = await callTool("start_verification_cycle", {
      title: "List test cycle", // Note: title, not goal
      description: "Testing list_verification_cycles",
    }, "flywheel-integration") as any;
    const testCycleId = createResult.cycleId;

    // Now list cycles
    const result = await callTool("list_verification_cycles", {
      limit: 10,
    }, "flywheel-integration") as any;

    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("cycles");
    expect(Array.isArray(result.cycles)).toBe(true);
    // Each cycle has cycleId property (not id)
    expect(result.cycles.some((c: any) => c.cycleId === testCycleId)).toBe(true);

    // Cleanup
    await callTool("abandon_cycle", {
      cycleId: testCycleId,
      reason: "Test cleanup",
    }, "flywheel-integration");
  });

  it("Step 2: promote_to_eval - promotes verification to eval suite", async () => {
    // Create a cycle to promote from
    const cycleResult = await callTool("start_verification_cycle", {
      title: "Promote test cycle",
      description: "Testing promote_to_eval",
    }, "flywheel-integration") as any;

    // Promote with explicit cases (required)
    const result = await callTool("promote_to_eval", {
      cycleId: cycleResult.cycleId,
      evalRunName: "promoted-eval-test",
      cases: [
        { input: "test input", intent: "Test intent" },
      ],
    }, "flywheel-integration") as any;

    expect(result).toHaveProperty("evalRunId");
    expect(result).toHaveProperty("caseIds");
    expect(result.caseCount).toBe(1);

    // Cleanup
    await callTool("abandon_cycle", {
      cycleId: cycleResult.cycleId,
      reason: "Test cleanup",
    }, "flywheel-integration");
  });

  it("Step 3: compare_eval_runs - compares two completed evals", async () => {
    // Create and complete baseline eval
    const baseline = await callTool("start_eval_run", {
      name: "baseline-for-compare",
      cases: [{ input: "test", intent: "baseline" }],
    }, "flywheel-integration") as any;
    await callTool("record_eval_result", {
      caseId: baseline.caseIds[0],
      actual: "result",
      verdict: "pass",
    }, "flywheel-integration");
    await callTool("complete_eval_run", {
      runId: baseline.runId,
    }, "flywheel-integration");

    // Create and complete candidate eval
    const candidate = await callTool("start_eval_run", {
      name: "candidate-for-compare",
      cases: [{ input: "test", intent: "candidate" }],
    }, "flywheel-integration") as any;
    await callTool("record_eval_result", {
      caseId: candidate.caseIds[0],
      actual: "result",
      verdict: "pass",
    }, "flywheel-integration");
    await callTool("complete_eval_run", {
      runId: candidate.runId,
    }, "flywheel-integration");

    // Compare them
    const result = await callTool("compare_eval_runs", {
      baselineRunId: baseline.runId,
      candidateRunId: candidate.runId,
    }, "flywheel-integration") as any;

    expect(result).toHaveProperty("recommendation");
    expect(["DEPLOY", "REVERT", "INVESTIGATE"]).toContain(result.recommendation);
  });

  it("Step 4: trigger_investigation - creates investigation cycle", async () => {
    // Create and complete an eval run to investigate
    const eval1 = await callTool("start_eval_run", {
      name: "eval-to-investigate",
      cases: [{ input: "test", intent: "investigate" }],
    }, "flywheel-integration") as any;
    await callTool("record_eval_result", {
      caseId: eval1.caseIds[0],
      actual: "failed",
      verdict: "fail",
    }, "flywheel-integration");
    await callTool("complete_eval_run", {
      runId: eval1.runId,
    }, "flywheel-integration");

    // Trigger investigation
    const result = await callTool("trigger_investigation", {
      evalRunId: eval1.runId,
      regressionDescription: "Test failure detected",
    }, "flywheel-integration") as any;

    // Returns cycleId, title, linkedEvalRun, phase1Instructions
    expect(result).toHaveProperty("cycleId");
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("linkedEvalRun");

    // Cleanup
    await callTool("abandon_cycle", {
      cycleId: result.cycleId,
      reason: "Test cleanup",
    }, "flywheel-integration");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 6: Research & Discovery (recon methodology)
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Research & Discovery", () => {
  let reconSessionId: string;

  it("Step 1: Start recon session", async () => {
    // Actual schema: target (required), description, projectContext
    const result = await callTool("run_recon", {
      target: "MCP server best practices",
      description: "Research for eval harness",
    }, "research") as any;

    expect(result.sessionId).toBeTruthy();
    reconSessionId = result.sessionId;
  });

  it("Step 2: Log recon finding", async () => {
    // Actual schema: sessionId, category (enum), summary, sourceUrl, relevance
    const result = await callTool("log_recon_finding", {
      sessionId: reconSessionId,
      category: "best_practice",
      summary: "Organize tools by domain for better discoverability",
      sourceUrl: "https://docs.anthropic.com",
      relevance: "Applies to MCP tool organization",
    }, "research") as any;

    expect(result.findingId).toBeTruthy();
    expect(result.findingCount).toBeGreaterThan(0);
  });

  it("Step 3: Get recon summary", async () => {
    // Returns { sessionId, target, status, totalFindings, findingsByCategory, ... }
    const result = await callTool("get_recon_summary", {
      sessionId: reconSessionId,
    }, "research") as any;

    expect(result.sessionId).toBe(reconSessionId);
    expect(result.totalFindings).toBeGreaterThan(0);
  });

  it("Step 4: Check framework updates", async () => {
    // Actual schema: ecosystem (enum)
    const result = await callTool("check_framework_updates", {
      ecosystem: "mcp",
    }, "research") as any;

    expect(result.ecosystem).toBe("mcp");
    expect(result.sources).toBeDefined();
  });

  it("Step 5: Bootstrap project context", async () => {
    // Actual schema: projectName (required), techStack, architecture, etc.
    const result = await callTool("bootstrap_project", {
      projectName: "eval-harness-project",
      techStack: "TypeScript, Vitest, MCP",
      architecture: "Modular tool system",
    }, "research") as any;

    expect(result.projectName).toBe("eval-harness-project");
    expect(result.storedFields).toBeDefined();
  });

  it("Step 6: Get project context", async () => {
    // Returns { context: {}, knowledgeBase: {} }
    const result = await callTool("get_project_context", {}, "research") as any;

    expect(result).toHaveProperty("context");
    expect(result).toHaveProperty("knowledgeBase");
  });

  it("Step 7: Search all knowledge", async () => {
    const result = await callTool("search_all_knowledge", {
      query: "MCP tools",
    }, "research") as any;

    expect(result).toHaveProperty("learnings");
    expect(result).toHaveProperty("reconFindings");
    expect(result).toHaveProperty("gaps");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 7: Agent Self-Bootstrap (agent_bootstrap methodology)
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Agent Self-Bootstrap", () => {
  it("Step 1: Discover infrastructure", async () => {
    const result = await callTool("discover_infrastructure", {
      categories: ["agent_loop", "telemetry"],
      depth: "shallow",
    }, "bootstrap") as any;

    expect(result).toHaveProperty("discovered");
    expect(result).toHaveProperty("missing");
  });

  it("Step 2: Triple verify a component", async () => {
    const result = await callTool("triple_verify", {
      target: "verification-tools",
      scope: "implementation", // Valid: implementation|integration|deployment|full
      includeWebSearch: false,
    }, "bootstrap") as any;

    // Returns verification1_internal, verification2_external, verification3_synthesis
    expect(result).toHaveProperty("verification1_internal");
    expect(result).toHaveProperty("verification2_external");
    expect(result).toHaveProperty("verification3_synthesis");
  });

  it("Step 3: Self-implement missing component", async () => {
    const result = await callTool("self_implement", {
      component: "telemetry",
      dryRun: true,
    }, "bootstrap") as any;

    expect(result).toHaveProperty("component");
    // Returns plan, files, nextSteps
    expect(result).toHaveProperty("plan");
    expect(result).toHaveProperty("files");
  });

  it("Step 4: Generate self-instructions", async () => {
    const result = await callTool("generate_self_instructions", {
      format: "claude_md",
      includeExternalSources: false,
    }, "bootstrap") as any;

    expect(result).toHaveProperty("format");
    // Returns content (not instructions)
    expect(result).toHaveProperty("content");
  });

  it("Step 5: Connect channels", async () => {
    const result = await callTool("connect_channels", {
      channels: ["web", "github"],
      query: "mcp tools",
      aggressive: false,
    }, "bootstrap") as any;

    // Returns query, results (array of {channel, findings, sources})
    expect(result).toHaveProperty("query");
    expect(result).toHaveProperty("results");
    expect(Array.isArray(result.results)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 8: Autonomous Maintenance (autonomous_maintenance methodology)
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Autonomous Maintenance", () => {
  it("Step 1: Assess risk before action", async () => {
    const result = await callTool("assess_risk", {
      action: "update_agents_md",
      context: "Adding new documentation",
    }, "autonomous") as any;

    expect(result.assessment.tier).toBe("medium");
    expect(result.assessment.recommendation).toBe("log_and_proceed");
  });

  it("Step 2: Decide re-update vs create", async () => {
    const result = await callTool("decide_re_update", {
      targetContent: "New methodology documentation",
      contentType: "documentation",
      existingFiles: ["README.md", "AGENTS.md"],
    }, "autonomous") as any;

    expect(["update_existing", "create_new", "merge"]).toContain(result.action);
  });

  it("Step 3: Run self-maintenance", async () => {
    const result = await callTool("run_self_maintenance", {
      scope: "quick",
      autoFix: false,
      dryRun: true,
    }, "autonomous") as any;

    expect(result).toHaveProperty("checksPerformed");
    expect(result).toHaveProperty("issuesFound");
  });

  it("Step 4: Scaffold directory structure", async () => {
    const result = await callTool("scaffold_directory", {
      component: "agent_loop",
      includeTests: true,
      dryRun: true,
    }, "autonomous") as any;

    expect(result.component).toBe("agent_loop");
    expect(result.structure.files.length).toBeGreaterThan(0);
  });

  it("Step 5: Run autonomous loop with guardrails", async () => {
    const result = await callTool("run_autonomous_loop", {
      goal: "Verify all documentation is in sync",
      maxIterations: 3,
      maxDurationMs: 5000,
      stopOnFirstFailure: true,
    }, "autonomous") as any;

    expect(result.goal).toBeTruthy();
    expect(result.iterations).toBeLessThanOrEqual(3);
    expect(["completed", "stopped", "timeout", "failed"]).toContain(result.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 9: Meta Tools (tool discovery)
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Meta Tool Discovery", () => {
  it("Step 1: Find tools by keyword", async () => {
    const result = await callTool("findTools", {
      query: "verification",
    }, "meta") as any;

    expect(result.tools.length).toBeGreaterThan(0);
  });

  it("Step 2: Find tools by category", async () => {
    const result = await callTool("findTools", {
      category: "bootstrap",
    }, "meta") as any;

    expect(result.tools.length).toBeGreaterThan(0);
  });

  it("Step 3: Get methodology overview", async () => {
    const result = await callTool("getMethodology", {
      topic: "overview",
    }, "meta") as any;

    expect(result.title).toContain("Overview");
    const topics = Object.keys(result.steps[0].topics);
    expect(topics.length).toBe(24);
  });

  it("Step 4: Get specific methodology", async () => {
    const methodologies = [
      "verification", "eval", "flywheel", "mandatory_flywheel",
      "reconnaissance", "quality_gates", "ui_ux_qa", "agentic_vision",
      "closed_loop", "learnings", "project_ideation", "tech_stack_2026",
      "telemetry_setup", "agents_md_maintenance", "agent_bootstrap",
      "autonomous_maintenance",
      "self_reinforced_learning",
    ];

    for (const topic of methodologies) {
      const result = await callTool("getMethodology", { topic }, "meta") as any;
      expect(result.title).toBeTruthy();
      expect(result.steps.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 10: Self-Reinforced Learning (trajectory analysis)
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Self-Reinforced Learning", () => {
  it("Step 1: Log tool calls to build trajectory data", async () => {
    const result = await callTool("log_tool_call", {
      sessionId: "eval-harness-self-eval",
      toolName: "start_verification_cycle",
      durationMs: 25,
      resultStatus: "success",
      phase: "verification",
    }, "self-eval") as any;
    expect(result.logged).toBe(true);

    await callTool("log_tool_call", {
      sessionId: "eval-harness-self-eval",
      toolName: "log_phase_findings",
      durationMs: 12,
      resultStatus: "success",
      phase: "verification",
    }, "self-eval");

    await callTool("log_tool_call", {
      sessionId: "eval-harness-self-eval",
      toolName: "run_mandatory_flywheel",
      durationMs: 35,
      resultStatus: "success",
      phase: "flywheel",
    }, "self-eval");
  });

  it("Step 2: Analyze trajectory patterns", async () => {
    const result = await callTool("get_trajectory_analysis", {
      sessionId: "eval-harness-self-eval",
    }, "self-eval") as any;
    expect(result.totalCalls).toBeGreaterThanOrEqual(3);
    expect(result.uniqueTools).toBeGreaterThanOrEqual(3);
    expect(result.topTools.length).toBeGreaterThan(0);
  });

  it("Step 3: Generate self-eval health report", async () => {
    const result = await callTool("get_self_eval_report", {
      sinceDaysAgo: 30,
    }, "self-eval") as any;
    expect(typeof result.healthScore).toBe("number");
    expect(result).toHaveProperty("verification");
    expect(result).toHaveProperty("gaps");
    expect(result).toHaveProperty("evalRuns");
    expect(result).toHaveProperty("toolTrajectory");
  });

  it("Step 4: Get improvement recommendations", async () => {
    const result = await callTool("get_improvement_recommendations", {
      sinceDaysAgo: 30,
      focus: "all",
    }, "self-eval") as any;
    expect(typeof result.totalRecommendations).toBe("number");
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result._selfReinforcement.nextSteps.length).toBe(4);
  });

  it("Step 5: Cleanup stale runs (dry run)", async () => {
    const result = await callTool("cleanup_stale_runs", {
      staleDays: 7,
      dryRun: true,
    }, "self-eval") as any;
    expect(result.dryRun).toBe(true);
    expect(result).toHaveProperty("staleEvalRuns");
    expect(result).toHaveProperty("staleCycles");
    expect(result).toHaveProperty("staleGaps");
    expect(result.staleEvalRuns).toHaveProperty("count");
  });

  it("Step 6: Synthesize recon to learnings (dry run)", async () => {
    const result = await callTool("synthesize_recon_to_learnings", {
      sinceDaysAgo: 30,
      dryRun: true,
    }, "self-eval") as any;
    expect(result.dryRun).toBe(true);
    expect(result).toHaveProperty("totalFindings");
    expect(result).toHaveProperty("newLearnings");
    expect(result).toHaveProperty("preview");
    expect(result.created).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 11: Flicker Detection (env-gated — returns "not configured")
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Flicker Detection Pipeline", () => {
  it("Step 1: run_flicker_detection returns not-configured when no server", async () => {
    const result = await callTool("run_flicker_detection", {
      durationS: 5,
    }, "flicker-detection") as any;
    expect(result.error).toBe(true);
    expect(result.message).toContain("not configured");
  });

  it("Step 2: capture_surface_stats returns not-configured", async () => {
    const result = await callTool("capture_surface_stats", {}, "flicker-detection") as any;
    expect(result.error).toBe(true);
    expect(result.message).toContain("not configured");
  });

  it("Step 3: extract_video_frames returns not-configured", async () => {
    const result = await callTool("extract_video_frames", {}, "flicker-detection") as any;
    expect(result.error).toBe(true);
    expect(result.message).toContain("not configured");
  });

  it("Step 4: compute_ssim_analysis returns not-configured", async () => {
    const result = await callTool("compute_ssim_analysis", {
      framePaths: ["/tmp/frame1.jpg", "/tmp/frame2.jpg"],
    }, "flicker-detection") as any;
    expect(result.error).toBe(true);
    expect(result.message).toContain("not configured");
  });

  it("Step 5: generate_flicker_report returns not-configured", async () => {
    const result = await callTool("generate_flicker_report", {
      ssimScores: [0.95, 0.93, 0.88, 0.91],
      threshold: 0.90,
    }, "flicker-detection") as any;
    expect(result.error).toBe(true);
    expect(result.message).toContain("not configured");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 12: Figma Flow Analysis (env-gated — returns "not configured")
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Figma Flow Analysis Pipeline", () => {
  it("Step 1: analyze_figma_flows returns not-configured when no server", async () => {
    const result = await callTool("analyze_figma_flows", {
      fileKey: "abc123",
    }, "figma-flow") as any;
    expect(result.error).toBe(true);
    expect(result.message).toContain("not configured");
  });

  it("Step 2: extract_figma_frames returns not-configured", async () => {
    const result = await callTool("extract_figma_frames", {
      fileKey: "abc123",
    }, "figma-flow") as any;
    expect(result.error).toBe(true);
    expect(result.message).toContain("not configured");
  });

  it("Step 3: cluster_figma_flows returns not-configured", async () => {
    const result = await callTool("cluster_figma_flows", {
      frames: [],
    }, "figma-flow") as any;
    expect(result.error).toBe(true);
    expect(result.message).toContain("not configured");
  });

  it("Step 4: render_flow_visualization returns not-configured", async () => {
    const result = await callTool("render_flow_visualization", {
      flowGroups: [],
    }, "figma-flow") as any;
    expect(result.error).toBe(true);
    expect(result.message).toContain("not configured");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 13: Boilerplate Scaffolding
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Boilerplate Scaffolding", () => {
  it("Step 1: scaffold_nodebench_project dry run", async () => {
    const result = await callTool("scaffold_nodebench_project", {
      projectPath: "/tmp/eval-harness-scaffold-test",
      projectName: "eval-test-project",
      techStack: "TypeScript/Node.js",
      dryRun: true,
    }, "boilerplate") as any;
    expect(result.dryRun).toBe(true);
    expect(result.summary.totalFiles).toBeGreaterThan(5);
  });

  it("Step 2: get_boilerplate_status on empty dir", async () => {
    const result = await callTool("get_boilerplate_status", {
      projectPath: process.cwd(),
    }, "boilerplate") as any;
    expect(typeof result.completionPercentage).toBe("number");
    expect(result.total).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 14: C-Compiler Benchmark
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: C-Compiler Benchmark", () => {
  let benchmarkId: string;

  it("Step 1: start_autonomy_benchmark with challenge list", async () => {
    const result = await callTool("start_autonomy_benchmark", {
      challenge: "list",
    }, "benchmark") as any;
    expect(result.availableChallenges.length).toBe(5);
  });

  it("Step 2: start_autonomy_benchmark with c_compiler", async () => {
    const result = await callTool("start_autonomy_benchmark", {
      challenge: "c_compiler",
    }, "benchmark") as any;
    expect(result.totalPoints).toBe(100);
    expect(result.milestones.length).toBe(10);
    benchmarkId = result.benchmarkId;
  });

  it("Step 3: log_benchmark_milestone", async () => {
    const result = await callTool("log_benchmark_milestone", {
      benchmarkId,
      milestoneId: "lexer",
      verificationPassed: true,
      notes: "Lexer tokenizes all C keywords correctly",
    }, "benchmark") as any;
    expect(result.milestoneId).toBe("lexer");
    expect(result.points).toBe(15);
  });

  it("Step 4: complete_autonomy_benchmark", async () => {
    const result = await callTool("complete_autonomy_benchmark", {
      benchmarkId,
      reason: "completed",
    }, "benchmark") as any;
    expect(result.score.earnedPoints).toBe(15);
    expect(result.milestones.completed).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 15: Contract Compliance
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Contract Compliance", () => {
  it("Step 1: check_contract_compliance with empty session", async () => {
    const result = await callTool("check_contract_compliance", {
      sessionId: `evalharness-empty-${Date.now()}`,
    }, "self_eval") as any;
    expect(result.score).toBe(0);
    expect(result.grade).toBe("N/A");
  });

  it("Step 2: check_contract_compliance scores a compliant session", async () => {
    // First seed some tool calls
    const sessionId = `evalharness-compliant-${Date.now()}`;
    const logTool = allTools.find(t => t.name === "log_tool_call")!;
    const sequence = [
      "search_all_knowledge", "getMethodology", "discover_tools",
      "run_recon", "assess_risk",
      "run_closed_loop", "log_test_result", "start_eval_run",
      "run_quality_gate", "run_mandatory_flywheel", "record_learning",
    ];
    for (const toolName of sequence) {
      await logTool.handler({ sessionId, toolName, resultStatus: "success" });
    }

    const result = await callTool("check_contract_compliance", {
      sessionId,
    }, "self_eval") as any;
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.grade).toMatch(/^[AB]/);
    expect(result.dimensions).toBeDefined();
    expect(result.dimensions.front_door.score).toBeGreaterThanOrEqual(15);
    expect(result.dimensions.ship_gates.score).toBeGreaterThanOrEqual(20);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 16: Controlled Evaluation (Task Bank + Ablation Grading)
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Controlled Evaluation", () => {
  const taskId = `evalharness-bugfix-${Date.now()}`;

  it("Step 1: create_task_bank creates a task", async () => {
    const result = await callTool("create_task_bank", {
      taskId,
      title: "Fix JWT token expiry bug",
      category: "bugfix",
      difficulty: "medium",
      prompt: "Fix the bug where JWT tokens expire 1 hour early due to timezone offset",
      successCriteria: ["tests pass", "no lint errors", "token expiry is correct"],
      forbiddenBehaviors: ["hardcode timezone", "skip tests"],
      timeBudgetMinutes: 20,
    }, "self_eval") as any;
    expect(result.action).toBe("created");
    expect(result.taskId).toBe(taskId);
    expect(result.totalTasksInBank).toBeGreaterThanOrEqual(1);
  });

  it("Step 2: grade_agent_run grades a bare condition", async () => {
    const result = await callTool("grade_agent_run", {
      taskId,
      condition: "bare",
      outcomeResults: [
        { criterion: "tests pass", passed: true },
        { criterion: "no lint errors", passed: true },
        { criterion: "token expiry is correct", passed: false },
      ],
      durationMinutes: 15,
    }, "self_eval") as any;
    expect(result.grade).toBeDefined();
    expect(result.scores.outcome.score).toBeGreaterThan(0);
    expect(result.scores.process.score).toBe(25); // No session = half credit
    expect(result.outcomeDetails.passed).toBe(2);
    expect(result.outcomeDetails.total).toBe(3);
  });

  it("Step 3: grade_agent_run grades a full condition with session", async () => {
    const sessionId = `evalharness-full-${Date.now()}`;
    const logTool = allTools.find(t => t.name === "log_tool_call")!;
    for (const toolName of ["search_all_knowledge", "assess_risk", "run_closed_loop", "log_test_result", "run_quality_gate", "record_learning"]) {
      await logTool.handler({ sessionId, toolName, resultStatus: "success" });
    }

    const result = await callTool("grade_agent_run", {
      taskId,
      sessionId,
      condition: "full",
      outcomeResults: [
        { criterion: "tests pass", passed: true },
        { criterion: "no lint errors", passed: true },
        { criterion: "token expiry is correct", passed: true },
      ],
      durationMinutes: 12,
    }, "self_eval") as any;
    expect(result.scores.outcome.score).toBeGreaterThan(40);
    expect(result.scores.process.score).toBeGreaterThan(20);
    expect(result.ablationComparison).toBeDefined();
    expect(result.ablationComparison.length).toBe(2); // bare + full
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COVERAGE REPORT
// ═══════════════════════════════════════════════════════════════════════════

describe("Coverage Report", () => {
  it("should generate comprehensive Proof of Work report", () => {
    const testedTools = new Set(toolCallLog.map(l => l.tool));
    const allToolNames = allTools.map(t => t.name);

    // Tools that require external dependencies (skip in automated tests)
    const externalDependencyTools = [
      "capture_ui_screenshot",      // Requires Playwright
      "capture_responsive_suite",   // Requires Playwright
      "discover_vision_env",        // Dynamic SDK imports
      "analyze_screenshot",         // Requires AI API key
      "manipulate_screenshot",      // Requires Sharp
      "web_search",                 // Requires AI API key
      "fetch_url",                  // External network calls
      "search_github",              // Requires GitHub API
      "analyze_repo",               // Requires GitHub API
      "update_agents_md",           // File system - tested separately
      "research_job_market",        // Covered in tools.test.ts
      "setup_local_env",            // Covered in tools.test.ts
      "call_llm",                   // Requires AI API key
      "extract_structured_data",    // Requires AI API key
      "scan_dependencies",          // Runs npm audit - covered in tools.test.ts
      "run_code_analysis",          // Covered in tools.test.ts
      "diff_outputs",               // Covered in tools.test.ts
      "query_daily_brief",          // Requires CONVEX_SITE_URL - covered in tools.test.ts
      "query_funding_entities",     // Requires CONVEX_SITE_URL - covered in tools.test.ts
      "query_research_queue",       // Requires CONVEX_SITE_URL - covered in tools.test.ts
      "publish_to_queue",           // Requires CONVEX_SITE_URL - covered in tools.test.ts
      "benchmark_models",           // Requires AI API keys - covered in tools.test.ts
      "diff_screenshots",           // Requires sharp - covered in tools.test.ts
      "generate_report",            // Covered in tools.test.ts
      "monitor_repo",               // Requires GitHub API - covered in tools.test.ts
      "run_tests_cli",              // Covered in tools.test.ts
      "check_mcp_setup",            // Env-dependent diagnostic wizard - covered in tools.test.ts
      "scan_capabilities",           // Requires file path - covered in tools.test.ts
      "verify_concept_support",      // Requires file path - covered in tools.test.ts
      "generate_implementation_plan", // Depends on verify_concept_support output - covered in tools.test.ts
    ];

    // Deprecated tools (kept for backwards compatibility, but flagged)
    const deprecatedTools = [
      { tool: "search_learnings", reason: "DEPRECATED: Use search_all_knowledge instead" },
      { tool: "list_learnings", reason: "DEPRECATED: Use search_all_knowledge instead" },
    ];

    const untestedTools = allToolNames.filter(
      name => !testedTools.has(name) && !externalDependencyTools.includes(name)
    );

    // Build tool-by-scenario matrix
    const toolScenarioMap = new Map<string, string[]>();
    toolCallLog.forEach(l => {
      if (!toolScenarioMap.has(l.tool)) toolScenarioMap.set(l.tool, []);
      if (!toolScenarioMap.get(l.tool)!.includes(l.scenario)) {
        toolScenarioMap.get(l.tool)!.push(l.scenario);
      }
    });

    // Count successes and failures
    const successCount = toolCallLog.filter(l => l.success).length;
    const failureCount = toolCallLog.filter(l => !l.success).length;

    // Build scenario summary
    const byScenario = new Map<string, { tools: string[]; success: number; fail: number }>();
    toolCallLog.forEach(l => {
      if (!byScenario.has(l.scenario)) {
        byScenario.set(l.scenario, { tools: [], success: 0, fail: 0 });
      }
      const s = byScenario.get(l.scenario)!;
      if (!s.tools.includes(l.tool)) s.tools.push(l.tool);
      if (l.success) s.success++; else s.fail++;
    });

    console.log("\n");
    console.log("╔═══════════════════════════════════════════════════════════════════════════╗");
    console.log("║                    NODEBENCH MCP - PROOF OF WORK REPORT                   ║");
    console.log("╚═══════════════════════════════════════════════════════════════════════════╝");
    console.log("");
    console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ SUMMARY                                                                     │");
    console.log("├─────────────────────────────────────────────────────────────────────────────┤");
    console.log(`│ Total Tools in MCP:           ${String(allToolNames.length).padStart(3)}                                         │`);
    console.log(`│ Tools Tested in Scenarios:    ${String(testedTools.size).padStart(3)}  (${Math.round(testedTools.size / allToolNames.length * 100)}%)                                   │`);
    console.log(`│ External Dependency (skip):   ${String(externalDependencyTools.length).padStart(3)}  (require API keys/network)               │`);
    console.log(`│ Untested (GAPS):              ${String(untestedTools.length).padStart(3)}                                         │`);
    console.log(`│ Total Tool Calls:             ${String(toolCallLog.length).padStart(3)}                                         │`);
    console.log(`│ Success Rate:                 ${successCount}/${toolCallLog.length} (${Math.round(successCount / toolCallLog.length * 100)}%)                                  │`);
    console.log("└─────────────────────────────────────────────────────────────────────────────┘");
    console.log("");

    // Scenario breakdown
    console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ SCENARIOS TESTED                                                            │");
    console.log("├─────────────────────────────────────────────────────────────────────────────┤");
    byScenario.forEach((data, scenario) => {
      const status = data.fail === 0 ? "✓" : "✗";
      const line = `│ ${status} ${scenario.padEnd(25)} ${String(data.tools.length).padStart(2)} tools, ${String(data.success).padStart(2)} calls`;
      console.log(line.padEnd(78) + "│");
    });
    console.log("└─────────────────────────────────────────────────────────────────────────────┘");
    console.log("");

    // Tool coverage matrix (grouped by domain)
    const domainMap: Record<string, string[]> = {
      "Verification": ["start_verification_cycle", "log_phase_findings", "log_gap", "resolve_gap", "log_test_result", "get_verification_status", "list_verification_cycles", "abandon_cycle"],
      "Eval": ["start_eval_run", "record_eval_result", "complete_eval_run", "compare_eval_runs", "list_eval_runs"],
      "Quality Gates": ["run_quality_gate", "get_gate_preset", "get_gate_history", "run_closed_loop"],
      "Learning": ["record_learning", "search_learnings", "list_learnings", "delete_learning"],
      "Flywheel": ["get_flywheel_status", "promote_to_eval", "trigger_investigation", "run_mandatory_flywheel"],
      "Recon": ["run_recon", "log_recon_finding", "get_recon_summary", "check_framework_updates", "search_all_knowledge", "bootstrap_project", "get_project_context"],
      "Bootstrap": ["discover_infrastructure", "triple_verify", "self_implement", "generate_self_instructions", "connect_channels"],
      "Autonomous": ["assess_risk", "decide_re_update", "run_self_maintenance", "scaffold_directory", "run_autonomous_loop"],
      "Self-Eval": ["log_tool_call", "get_trajectory_analysis", "get_self_eval_report", "get_improvement_recommendations", "cleanup_stale_runs", "synthesize_recon_to_learnings", "check_contract_compliance", "create_task_bank", "grade_agent_run"],
      "Flicker Detection": ["run_flicker_detection", "capture_surface_stats", "extract_video_frames", "compute_ssim_analysis", "generate_flicker_report"],
      "Figma Flow": ["analyze_figma_flows", "extract_figma_frames", "cluster_figma_flows", "render_flow_visualization"],
      "Boilerplate": ["scaffold_nodebench_project", "get_boilerplate_status"],
      "Benchmark": ["start_autonomy_benchmark", "log_benchmark_milestone", "complete_autonomy_benchmark"],
      "Meta": ["findTools", "getMethodology", "check_mcp_setup"],
      "Architect": ["scan_capabilities", "verify_concept_support", "generate_implementation_plan"],
      "External (skip)": externalDependencyTools,
    };

    console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ TOOL COVERAGE BY DOMAIN                                                     │");
    console.log("├─────────────────────────────────────────────────────────────────────────────┤");
    for (const [domain, tools] of Object.entries(domainMap)) {
      const tested = tools.filter(t => testedTools.has(t)).length;
      const total = tools.length;
      const pct = Math.round(tested / total * 100);
      const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
      const line = `│ ${domain.padEnd(18)} ${bar} ${String(tested).padStart(2)}/${String(total).padStart(2)} (${String(pct).padStart(3)}%)`;
      console.log(line.padEnd(78) + "│");
    }
    console.log("└─────────────────────────────────────────────────────────────────────────────┘");
    console.log("");

    // Gaps
    if (untestedTools.length > 0) {
      console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
      console.log("│ ⚠ GAPS (Untested Tools)                                                    │");
      console.log("├─────────────────────────────────────────────────────────────────────────────┤");
      untestedTools.forEach(t => {
        console.log(`│   - ${t}`.padEnd(78) + "│");
      });
      console.log("└─────────────────────────────────────────────────────────────────────────────┘");
      console.log("");
    }

    // Deprecated tools analysis
    console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ ⚠️  DEPRECATED TOOLS                                                         │");
    console.log("├─────────────────────────────────────────────────────────────────────────────┤");
    if (deprecatedTools.length === 0) {
      console.log("│   No deprecated tools.".padEnd(78) + "│");
    } else {
      deprecatedTools.forEach(d => {
        console.log(`│   - ${d.tool}: ${d.reason}`.slice(0, 77).padEnd(78) + "│");
      });
    }
    console.log("│                                                                              │");
    console.log("│   These tools are kept for backwards compatibility but return a             │");
    console.log("│   deprecation notice. Use search_all_knowledge for unified search.          │");
    console.log("└─────────────────────────────────────────────────────────────────────────────┘");
    console.log("");

    // Final verdict
    const allCovered = untestedTools.length === 0;
    const allPassed = failureCount === 0;
    console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
    console.log("│ VERDICT                                                                      │");
    console.log("├─────────────────────────────────────────────────────────────────────────────┤");
    if (allCovered && allPassed) {
      console.log("│   ✅ ALL TOOLS TESTED AND WORKING                                           │");
      console.log("│   \"Yah it definitely works!\"                                                │");
    } else if (allPassed) {
      console.log("│   ✅ ALL TESTED TOOLS WORKING                                               │");
      console.log(`│   ⚠ ${untestedTools.length} tools not covered in scenario tests (see gaps above)`.padEnd(78) + "│");
    } else {
      console.log(`│   ❌ ${failureCount} tool calls failed - investigate before shipping`.padEnd(78) + "│");
    }
    console.log("└─────────────────────────────────────────────────────────────────────────────┘");
    console.log("");

    // Assert minimum coverage
    expect(testedTools.size).toBeGreaterThan(35); // Should test at least 35 tools
    expect(untestedTools.length).toBe(0); // All non-external tools should be tested
    expect(failureCount).toBe(0); // No failures allowed
  });
});
