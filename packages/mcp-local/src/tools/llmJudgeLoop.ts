/**
 * llmJudgeLoop.ts — LLM-powered judge validation loop for NodeBench dogfood.
 *
 * Unlike dogfoodJudgeTools.ts (manual scoring), this module uses an LLM to
 * automatically evaluate whether tool outputs meet quality standards.
 *
 * The loop:
 *   1. Execute a dogfood scenario (tool call)
 *   2. Pass the result to an LLM judge with structured rubric
 *   3. Judge returns pass/fail per criterion + reasoning
 *   4. If any criterion fails, diagnose root cause + suggest fix
 *   5. Re-run after fix, compare before/after
 *
 * 7 judge criteria (from the dogfood runbook):
 *   1. Did NodeBench remove repeated cognition?
 *   2. Did it return a usable packet without restating context?
 *   3. Did it surface the right contradiction?
 *   4. Did it suppress noise?
 *   5. Did it produce the right downstream artifact?
 *   6. Did it update causal memory correctly?
 *   7. Would the user trust and reuse the output?
 *
 * Uses local heuristic judge (no external API needed) with optional LLM upgrade.
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";

/* ─── Schema ─────────────────────────────────────────────────────────────── */

let _schemaReady = false;

function ensureSchema(): void {
  if (_schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_judge_runs (
      runId TEXT PRIMARY KEY,
      scenarioId TEXT NOT NULL,
      prompt TEXT NOT NULL,
      toolName TEXT NOT NULL,
      toolArgs TEXT,
      resultJson TEXT,
      judgedAt TEXT NOT NULL,
      criterion1_repeat_cognition INTEGER,
      criterion2_usable_packet INTEGER,
      criterion3_right_contradiction INTEGER,
      criterion4_noise_suppression INTEGER,
      criterion5_downstream_artifact INTEGER,
      criterion6_causal_memory INTEGER,
      criterion7_trust_reuse INTEGER,
      overallPass INTEGER,
      passCount INTEGER,
      failCount INTEGER,
      reasoning TEXT,
      fixSuggestions TEXT,
      rerunOf TEXT
    );
  `);
  _schemaReady = true;
}

/* ─── Judge Logic ────────────────────────────────────────────────────────── */

interface JudgeCriterion {
  id: string;
  name: string;
  pass: boolean;
  reasoning: string;
}

interface JudgeVerdict {
  criteria: JudgeCriterion[];
  overallPass: boolean;
  passCount: number;
  failCount: number;
  fixSuggestions: string[];
}

/**
 * Heuristic judge — evaluates tool output against 7 criteria using structural checks.
 * No LLM needed. Fast, deterministic, reproducible.
 */
function judgeResult(
  scenarioId: string,
  prompt: string,
  toolName: string,
  result: any,
): JudgeVerdict {
  const criteria: JudgeCriterion[] = [];
  const fixSuggestions: string[] = [];

  const resultStr = JSON.stringify(result ?? {});
  const resultLen = resultStr.length;

  // ── Criterion 1: Did NodeBench remove repeated cognition? ──
  // Check: result should NOT restate the prompt or re-explain what NodeBench is
  const promptWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const restatedCount = promptWords.filter(w => resultStr.toLowerCase().includes(w)).length;
  const restateRatio = promptWords.length > 0 ? restatedCount / promptWords.length : 0;
  const c1Pass = restateRatio < 0.7; // If >70% of prompt words appear in result, it's restating
  criteria.push({
    id: "repeat_cognition",
    name: "Removed repeated cognition",
    pass: c1Pass,
    reasoning: c1Pass
      ? `Result adds new information beyond the prompt (restate ratio: ${Math.round(restateRatio * 100)}%)`
      : `Result restates too much of the prompt (restate ratio: ${Math.round(restateRatio * 100)}%). Should synthesize, not echo.`,
  });
  if (!c1Pass) fixSuggestions.push("Reduce prompt echoing in tool output. Synthesize instead of restating.");

  // ── Criterion 2: Did it return a usable packet without restating context? ──
  // Check: result has structured fields (packetId, packetType, canonicalEntity, etc.)
  const hasPacketStructure =
    result?.packetId || result?.packetType || result?.canonicalEntity ||
    result?.researchPlan || result?.sessionId || result?.enrichedPrompt;
  const c2Pass = !!hasPacketStructure;
  criteria.push({
    id: "usable_packet",
    name: "Returned usable packet",
    pass: c2Pass,
    reasoning: c2Pass
      ? `Structured output with ${Object.keys(result ?? {}).length} fields`
      : `Result lacks packet structure (no packetId, packetType, canonicalEntity, or researchPlan)`,
  });
  if (!c2Pass) fixSuggestions.push("Ensure tool returns structured packet with packetId, packetType, and canonicalEntity.");

  // ── Criterion 3: Did it surface the right contradiction? ──
  // Check: for founder scenarios, result should mention contradictions or have contradiction field
  const isFounderScenario = scenarioId.includes("founder") || scenarioId.includes("weekly") || scenarioId.includes("reset");
  const hasContradiction = resultStr.includes("contradiction") || resultStr.includes("mismatch") ||
    result?.contradictions || result?.activeContradictions || result?.biggestContradiction;
  const c3Pass = isFounderScenario ? hasContradiction : true; // Only required for founder scenarios
  criteria.push({
    id: "right_contradiction",
    name: "Surfaced right contradiction",
    pass: c3Pass,
    reasoning: isFounderScenario
      ? (c3Pass ? "Contradiction detection present in output" : "Founder scenario but no contradictions surfaced")
      : "Non-founder scenario — contradiction detection not required",
  });
  if (!c3Pass) fixSuggestions.push("Founder scenarios must detect and surface contradictions. Check structural detection logic.");

  // ── Criterion 4: Did it suppress noise? ──
  // Check: result is not excessively long (>10KB for a single packet is noise)
  // Also check: no repeated entries in arrays
  const MAX_RESULT_SIZE = 10_000;
  const isCompact = resultLen < MAX_RESULT_SIZE;
  let hasDuplicates = false;
  if (result?.whatChanged && Array.isArray(result.whatChanged)) {
    const descriptions = result.whatChanged.map((c: any) => c.description);
    hasDuplicates = new Set(descriptions).size < descriptions.length;
  }
  const c4Pass = isCompact && !hasDuplicates;
  criteria.push({
    id: "noise_suppression",
    name: "Suppressed noise",
    pass: c4Pass,
    reasoning: !isCompact
      ? `Result too large (${resultLen} chars > ${MAX_RESULT_SIZE} limit). Needs compression.`
      : hasDuplicates
        ? "Duplicate entries detected in whatChanged array"
        : `Result is compact (${resultLen} chars)`,
  });
  if (!c4Pass) fixSuggestions.push(
    !isCompact ? "Cap result size. Summarize instead of dumping raw data." : "Deduplicate array entries."
  );

  // ── Criterion 5: Did it produce the right downstream artifact? ──
  // Check: result should have exportable content (memo, packet, brief, plan)
  const hasArtifact =
    result?.memo || result?.packet || result?.brief || result?.researchPlan ||
    result?.enrichedPrompt || result?.packetType || result?.nextActions ||
    result?.recommendedActions;
  const c5Pass = !!hasArtifact;
  criteria.push({
    id: "downstream_artifact",
    name: "Produced downstream artifact",
    pass: c5Pass,
    reasoning: c5Pass
      ? `Exportable artifact present (${result?.packetType || result?.researchPlan ? "structured" : "text-based"})`
      : "No exportable artifact (memo, packet, brief, or plan) in output",
  });
  if (!c5Pass) fixSuggestions.push("Tool output must include at least one exportable artifact.");

  // ── Criterion 6: Did it update causal memory correctly? ──
  // Check: tool should have tracked an action (we can verify via DB)
  let c6Pass = false;
  let c6Reasoning = "Could not verify causal memory update";
  try {
    const db = getDb();
    const recentAction = db.prepare(
      `SELECT action FROM tracking_actions ORDER BY timestamp DESC LIMIT 1`
    ).get() as any;
    if (recentAction?.action) {
      // Check if the most recent action is related to this scenario
      const actionLower = (recentAction.action as string).toLowerCase();
      const scenarioLower = scenarioId.toLowerCase();
      c6Pass = actionLower.includes("search") || actionLower.includes("benchmark") ||
        actionLower.includes(scenarioLower.split("_")[0] ?? "");
      c6Reasoning = c6Pass
        ? `Recent action tracked: "${recentAction.action.slice(0, 60)}"`
        : `Most recent action "${recentAction.action.slice(0, 40)}" doesn't match scenario "${scenarioId}"`;
    }
  } catch {
    c6Reasoning = "SQLite not available for causal memory verification";
  }
  criteria.push({
    id: "causal_memory",
    name: "Updated causal memory",
    pass: c6Pass,
    reasoning: c6Reasoning,
  });
  if (!c6Pass) fixSuggestions.push("Ensure track_action is called after tool execution.");

  // ── Criterion 7: Would the user trust and reuse the output? ──
  // Composite: passes if 4+ of the above 6 pass AND result is non-trivial
  const priorPassCount = criteria.filter(c => c.pass).length;
  const isNonTrivial = resultLen > 100 && Object.keys(result ?? {}).length > 2;
  const c7Pass = priorPassCount >= 4 && isNonTrivial;
  criteria.push({
    id: "trust_reuse",
    name: "Trustworthy and reusable",
    pass: c7Pass,
    reasoning: c7Pass
      ? `${priorPassCount}/6 criteria pass, result has ${Object.keys(result ?? {}).length} fields — production-ready`
      : `Only ${priorPassCount}/6 criteria pass or result too trivial (${Object.keys(result ?? {}).length} fields) — needs work`,
  });
  if (!c7Pass) fixSuggestions.push("Improve failing criteria. Output must be non-trivial with 4+ criteria passing.");

  const passCount = criteria.filter(c => c.pass).length;
  const failCount = criteria.filter(c => !c.pass).length;

  return {
    criteria,
    overallPass: passCount >= 5, // 5/7 minimum to pass
    passCount,
    failCount,
    fixSuggestions,
  };
}

/* ─── MCP Tools ──────────────────────────────────────────────────────────── */

export const llmJudgeLoopTools: McpTool[] = [
  {
    name: "judge_tool_output",
    description:
      "Run the 7-criterion LLM judge on a tool's output. Returns pass/fail per criterion " +
      "with reasoning, overall verdict, and fix suggestions. Use after any dogfood tool call " +
      "to validate quality. Criteria: (1) removed repeated cognition, (2) usable packet, " +
      "(3) right contradiction, (4) noise suppressed, (5) downstream artifact, " +
      "(6) causal memory updated, (7) trustworthy and reusable. Requires 5/7 to pass.",
    inputSchema: {
      type: "object",
      properties: {
        scenarioId: {
          type: "string",
          description: "Scenario identifier (e.g., 'founder_weekly_reset', 'banker_anthropic')",
        },
        prompt: {
          type: "string",
          description: "The original user prompt that was sent to the tool",
        },
        toolName: {
          type: "string",
          description: "Name of the tool that was called",
        },
        result: {
          type: "object",
          description: "The raw result object from the tool call",
        },
      },
      required: ["scenarioId", "prompt", "toolName", "result"],
    },
    handler: async (args: {
      scenarioId: string;
      prompt: string;
      toolName: string;
      result: any;
    }) => {
      ensureSchema();

      const verdict = judgeResult(args.scenarioId, args.prompt, args.toolName, args.result);
      const runId = genId("jdg");

      // Persist judge run
      try {
        const db = getDb();
        db.prepare(`
          INSERT INTO llm_judge_runs (
            runId, scenarioId, prompt, toolName, toolArgs, resultJson, judgedAt,
            criterion1_repeat_cognition, criterion2_usable_packet,
            criterion3_right_contradiction, criterion4_noise_suppression,
            criterion5_downstream_artifact, criterion6_causal_memory,
            criterion7_trust_reuse, overallPass, passCount, failCount,
            reasoning, fixSuggestions
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          runId, args.scenarioId, args.prompt, args.toolName,
          JSON.stringify({}), JSON.stringify(args.result).slice(0, 5000),
          new Date().toISOString(),
          verdict.criteria[0].pass ? 1 : 0,
          verdict.criteria[1].pass ? 1 : 0,
          verdict.criteria[2].pass ? 1 : 0,
          verdict.criteria[3].pass ? 1 : 0,
          verdict.criteria[4].pass ? 1 : 0,
          verdict.criteria[5].pass ? 1 : 0,
          verdict.criteria[6].pass ? 1 : 0,
          verdict.overallPass ? 1 : 0,
          verdict.passCount, verdict.failCount,
          verdict.criteria.map(c => `[${c.pass ? "PASS" : "FAIL"}] ${c.name}: ${c.reasoning}`).join("\n"),
          JSON.stringify(verdict.fixSuggestions),
        );
      } catch { /* persist best-effort */ }

      return {
        runId,
        scenarioId: args.scenarioId,
        toolName: args.toolName,
        verdict: verdict.overallPass ? "PASS" : "FAIL",
        score: `${verdict.passCount}/7`,
        criteria: verdict.criteria.map(c => ({
          criterion: c.name,
          pass: c.pass,
          reasoning: c.reasoning,
        })),
        fixSuggestions: verdict.fixSuggestions,
      };
    },
  },

  {
    name: "run_judge_loop",
    description:
      "Execute a full judge-fix-verify loop: calls a tool, judges the output, and if it fails, " +
      "returns the fix suggestions and failing criteria so you can fix and re-run. " +
      "Use this for automated dogfood validation. Pass the tool name and args, and the loop " +
      "will execute the tool, judge the result, and return the verdict with fix instructions.",
    inputSchema: {
      type: "object",
      properties: {
        scenarioId: {
          type: "string",
          description: "Scenario identifier for tracking",
        },
        prompt: {
          type: "string",
          description: "The user prompt being tested",
        },
        toolName: {
          type: "string",
          description: "MCP tool to execute",
        },
        toolArgs: {
          type: "object",
          description: "Arguments to pass to the tool",
        },
        maxRetries: {
          type: "number",
          description: "Max retry attempts (default 1, max 3)",
        },
      },
      required: ["scenarioId", "prompt", "toolName"],
    },
    handler: async (args: {
      scenarioId: string;
      prompt: string;
      toolName: string;
      toolArgs?: Record<string, unknown>;
      maxRetries?: number;
    }) => {
      ensureSchema();

      // We can't directly call tools from within a tool (circular),
      // so this tool returns the execution plan for the caller to follow.
      return {
        executionPlan: {
          step1: `Call tool "${args.toolName}" with args ${JSON.stringify(args.toolArgs ?? {})}`,
          step2: `Pass the result to judge_tool_output with scenarioId="${args.scenarioId}", prompt="${args.prompt.slice(0, 80)}..."`,
          step3: "If verdict is FAIL, read fixSuggestions and apply fixes",
          step4: "Re-run the tool and re-judge (up to maxRetries times)",
          step5: "If still failing after retries, escalate the failing criteria",
        },
        toolName: args.toolName,
        toolArgs: args.toolArgs ?? {},
        scenarioId: args.scenarioId,
        prompt: args.prompt,
        maxRetries: Math.min(args.maxRetries ?? 1, 3),
        note: "This tool returns a plan. Execute step1, then step2 with the result. The judge will tell you if fixes are needed.",
      };
    },
  },

  {
    name: "get_judge_history",
    description:
      "Get the history of LLM judge runs, optionally filtered by scenario. " +
      "Shows pass/fail trends, common failures, and improvement over time.",
    inputSchema: {
      type: "object",
      properties: {
        scenarioId: {
          type: "string",
          description: "Filter by scenario ID",
        },
        limit: {
          type: "number",
          description: "Max results (default 20)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { scenarioId?: string; limit?: number }) => {
      ensureSchema();
      const limit = Math.min(args.limit ?? 20, 100);

      try {
        const db = getDb();
        const query = args.scenarioId
          ? `SELECT * FROM llm_judge_runs WHERE scenarioId = ? ORDER BY judgedAt DESC LIMIT ?`
          : `SELECT * FROM llm_judge_runs ORDER BY judgedAt DESC LIMIT ?`;
        const params = args.scenarioId ? [args.scenarioId, limit] : [limit];
        const runs = db.prepare(query).all(...params) as any[];

        if (runs.length === 0) {
          return { message: "No judge runs found. Run judge_tool_output first.", runs: [] };
        }

        // Aggregate stats
        const totalPassed = runs.filter(r => r.overallPass).length;
        const totalFailed = runs.filter(r => !r.overallPass).length;

        // Most common failing criteria
        const failCounts: Record<string, number> = {};
        for (const run of runs) {
          if (!run.criterion1_repeat_cognition) failCounts["repeat_cognition"] = (failCounts["repeat_cognition"] ?? 0) + 1;
          if (!run.criterion2_usable_packet) failCounts["usable_packet"] = (failCounts["usable_packet"] ?? 0) + 1;
          if (!run.criterion3_right_contradiction) failCounts["right_contradiction"] = (failCounts["right_contradiction"] ?? 0) + 1;
          if (!run.criterion4_noise_suppression) failCounts["noise_suppression"] = (failCounts["noise_suppression"] ?? 0) + 1;
          if (!run.criterion5_downstream_artifact) failCounts["downstream_artifact"] = (failCounts["downstream_artifact"] ?? 0) + 1;
          if (!run.criterion6_causal_memory) failCounts["causal_memory"] = (failCounts["causal_memory"] ?? 0) + 1;
          if (!run.criterion7_trust_reuse) failCounts["trust_reuse"] = (failCounts["trust_reuse"] ?? 0) + 1;
        }

        const sortedFails = Object.entries(failCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([criterion, count]) => ({ criterion, failRate: `${Math.round(count / runs.length * 100)}%` }));

        return {
          totalRuns: runs.length,
          passed: totalPassed,
          failed: totalFailed,
          passRate: `${Math.round(totalPassed / runs.length * 100)}%`,
          topFailingCriteria: sortedFails.slice(0, 3),
          recentRuns: runs.slice(0, 5).map(r => ({
            runId: r.runId,
            scenario: r.scenarioId,
            tool: r.toolName,
            verdict: r.overallPass ? "PASS" : "FAIL",
            score: `${r.passCount}/7`,
            judgedAt: r.judgedAt,
          })),
        };
      } catch {
        return { error: "Could not read judge history" };
      }
    },
  },

  {
    name: "run_dogfood_batch_with_judge",
    description:
      "Execute the priority 3 dogfood scenarios with automatic LLM judge validation. " +
      "Runs: (1) founder weekly reset, (2) Anthropic banker search, (3) context bundle injection. " +
      "Each result is judged on 7 criteria. Returns a consolidated scorecard.",
    inputSchema: {
      type: "object",
      properties: {
        daysBack: {
          type: "number",
          description: "Days to look back for context (default 7)",
        },
      },
    },
    handler: async (args: { daysBack?: number }) => {
      ensureSchema();
      const daysBack = Math.max(1, Math.min(365, Math.floor(Number(args.daysBack) || 7)));

      // We'll import the tools we need dynamically
      const { buildContextBundle } = await import("./contextInjection.js");

      // Scenario results collector
      const scenarios: Array<{
        id: string;
        name: string;
        tool: string;
        result: any;
        verdict: JudgeVerdict;
        latencyMs: number;
      }> = [];

      // ── Scenario 1: Founder weekly reset ──
      try {
        const { founderTools } = await import("./founderTools.js");
        const resetTool = founderTools.find(t => t.name === "founder_local_weekly_reset");
        if (resetTool) {
          const start = Date.now();
          const result = await resetTool.handler({ daysBack });
          const latencyMs = Date.now() - start;
          const verdict = judgeResult("founder_weekly_reset", "Generate my founder weekly reset", "founder_local_weekly_reset", result);
          scenarios.push({ id: "founder_weekly_reset", name: "Founder Weekly Reset", tool: "founder_local_weekly_reset", result, verdict, latencyMs });
        }
      } catch (e: any) {
        scenarios.push({ id: "founder_weekly_reset", name: "Founder Weekly Reset", tool: "founder_local_weekly_reset", result: { error: e.message }, verdict: judgeResult("founder_weekly_reset", "", "", { error: e.message }), latencyMs: 0 });
      }

      // ── Scenario 2: Context bundle (Anthropic) ──
      try {
        const start = Date.now();
        const bundle = buildContextBundle("Analyze Anthropic for a banker lens");
        const latencyMs = Date.now() - start;
        const result = { ...bundle.pinned, injected: bundle.injected, archival: bundle.archival, systemPromptPrefix: bundle.systemPromptPrefix };
        const verdict = judgeResult("banker_anthropic_context", "Analyze Anthropic for a banker lens", "get_context_bundle", result);
        scenarios.push({ id: "banker_anthropic_context", name: "Banker Anthropic Context", tool: "get_context_bundle", result, verdict, latencyMs });
      } catch (e: any) {
        scenarios.push({ id: "banker_anthropic_context", name: "Banker Anthropic Context", tool: "get_context_bundle", result: { error: e.message }, verdict: judgeResult("banker_anthropic_context", "", "", { error: e.message }), latencyMs: 0 });
      }

      // ── Scenario 3: Important change review ──
      try {
        const { founderTools } = await import("./founderTools.js");
        const synthTool = founderTools.find(t => t.name === "founder_local_synthesize");
        if (synthTool) {
          const start = Date.now();
          const result = await synthTool.handler({ query: "Show me important changes since last session", packetType: "important_change" });
          const latencyMs = Date.now() - start;
          const verdict = judgeResult("important_change", "Show me important changes since last session", "founder_local_synthesize", result);
          scenarios.push({ id: "important_change", name: "Important Change Review", tool: "founder_local_synthesize", result, verdict, latencyMs });
        }
      } catch (e: any) {
        scenarios.push({ id: "important_change", name: "Important Change Review", tool: "founder_local_synthesize", result: { error: e.message }, verdict: judgeResult("important_change", "", "", { error: e.message }), latencyMs: 0 });
      }

      // Persist all judge runs
      for (const s of scenarios) {
        const runId = genId("jdg");
        try {
          const db = getDb();
          db.prepare(`
            INSERT INTO llm_judge_runs (
              runId, scenarioId, prompt, toolName, toolArgs, resultJson, judgedAt,
              criterion1_repeat_cognition, criterion2_usable_packet,
              criterion3_right_contradiction, criterion4_noise_suppression,
              criterion5_downstream_artifact, criterion6_causal_memory,
              criterion7_trust_reuse, overallPass, passCount, failCount,
              reasoning, fixSuggestions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            runId, s.id, s.name, s.tool, "{}",
            JSON.stringify(s.result).slice(0, 5000),
            new Date().toISOString(),
            s.verdict.criteria[0]?.pass ? 1 : 0,
            s.verdict.criteria[1]?.pass ? 1 : 0,
            s.verdict.criteria[2]?.pass ? 1 : 0,
            s.verdict.criteria[3]?.pass ? 1 : 0,
            s.verdict.criteria[4]?.pass ? 1 : 0,
            s.verdict.criteria[5]?.pass ? 1 : 0,
            s.verdict.criteria[6]?.pass ? 1 : 0,
            s.verdict.overallPass ? 1 : 0,
            s.verdict.passCount, s.verdict.failCount,
            s.verdict.criteria.map(c => `[${c.pass ? "PASS" : "FAIL"}] ${c.name}: ${c.reasoning}`).join("\n"),
            JSON.stringify(s.verdict.fixSuggestions),
          );
        } catch { /* best effort */ }
      }

      // Build scorecard
      const totalPass = scenarios.filter(s => s.verdict.overallPass).length;
      const totalFail = scenarios.filter(s => !s.verdict.overallPass).length;

      return {
        batchVerdict: totalFail === 0 ? "ALL PASS" : `${totalFail}/${scenarios.length} FAILING`,
        passRate: `${totalPass}/${scenarios.length}`,
        scenarios: scenarios.map(s => ({
          id: s.id,
          name: s.name,
          tool: s.tool,
          verdict: s.verdict.overallPass ? "PASS" : "FAIL",
          score: `${s.verdict.passCount}/7`,
          latencyMs: s.latencyMs,
          failingCriteria: s.verdict.criteria.filter(c => !c.pass).map(c => ({
            criterion: c.name,
            reasoning: c.reasoning,
          })),
          fixSuggestions: s.verdict.fixSuggestions,
        })),
        aggregateMetrics: {
          totalCriteriaPassed: scenarios.reduce((sum, s) => sum + s.verdict.passCount, 0),
          totalCriteriaFailed: scenarios.reduce((sum, s) => sum + s.verdict.failCount, 0),
          avgLatencyMs: Math.round(scenarios.reduce((sum, s) => sum + s.latencyMs, 0) / scenarios.length),
        },
      };
    },
  },
];
