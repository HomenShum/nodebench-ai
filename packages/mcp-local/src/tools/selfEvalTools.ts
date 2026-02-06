/**
 * Self-Eval Tools — Trajectory Analysis & Self-Reinforced Learning.
 *
 * Enables the MCP to observe its own tool usage patterns, identify gaps,
 * measure efficiency, and recommend improvements. Every tool call can be
 * logged, then analyzed to produce actionable insights that feed back into
 * the development process via the AI Flywheel.
 *
 * Closed-loop: Use → Log → Analyze → Recommend → Apply → Use again
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

export const selfEvalTools: McpTool[] = [
  // ─── Tool 1: log_tool_call ─────────────────────────────────────────────
  {
    name: "log_tool_call",
    description:
      "Record a tool invocation with timing, status, and context. Agents should call this after each tool use so the self-eval system can analyze trajectories. Lightweight — just appends a row to the tool_call_log table.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description:
            "Session identifier grouping related tool calls (e.g. a verification cycle ID, eval run ID, or a custom session key)",
        },
        toolName: {
          type: "string",
          description: "Name of the tool that was called",
        },
        durationMs: {
          type: "number",
          description: "How long the call took in milliseconds",
        },
        resultStatus: {
          type: "string",
          enum: ["success", "error", "partial"],
          description: "Outcome of the tool call (default: success)",
        },
        error: {
          type: "string",
          description: "Error message if resultStatus is error",
        },
        phase: {
          type: "string",
          description:
            "Which phase/stage this call belongs to (e.g. recon, verification, eval, flywheel)",
        },
      },
      required: ["sessionId", "toolName"],
    },
    handler: async (args) => {
      const db = getDb();
      const id = genId("tcl");
      const {
        sessionId,
        toolName,
        durationMs = 0,
        resultStatus = "success",
        error,
        phase,
      } = args;

      db.prepare(
        "INSERT INTO tool_call_log (id, session_id, tool_name, result_status, duration_ms, error, phase, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"
      ).run(id, sessionId, toolName, resultStatus, durationMs, error ?? null, phase ?? null);

      return { id, sessionId, toolName, resultStatus, logged: true };
    },
  },

  // ─── Tool 2: get_trajectory_analysis ───────────────────────────────────
  {
    name: "get_trajectory_analysis",
    description:
      "Analyze tool usage trajectories across sessions. Returns tool frequency, error rates, average duration, phase distribution, and sequential patterns. Use this to understand how tools are actually being used and identify bottlenecks.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Analyze a specific session (optional — omit for global analysis)",
        },
        sinceDaysAgo: {
          type: "number",
          description: "Only analyze calls from the last N days (default: 30)",
        },
        limit: {
          type: "number",
          description: "Max records to analyze (default: 1000)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const sinceDays = args.sinceDaysAgo ?? 30;
      const limit = args.limit ?? 1000;
      const sinceDate = new Date(Date.now() - sinceDays * 86400000).toISOString();

      let rows: any[];
      if (args.sessionId) {
        rows = db
          .prepare(
            "SELECT * FROM tool_call_log WHERE session_id = ? AND created_at >= ? ORDER BY created_at ASC LIMIT ?"
          )
          .all(args.sessionId, sinceDate, limit) as any[];
      } else {
        rows = db
          .prepare(
            "SELECT * FROM tool_call_log WHERE created_at >= ? ORDER BY created_at ASC LIMIT ?"
          )
          .all(sinceDate, limit) as any[];
      }

      if (rows.length === 0) {
        return {
          totalCalls: 0,
          message: "No tool call data found. Use log_tool_call after each tool invocation to build trajectory data.",
          recommendation: "Start logging tool calls to enable trajectory analysis.",
        };
      }

      // Tool frequency
      const toolFreq: Record<string, number> = {};
      const toolErrors: Record<string, number> = {};
      const toolDurations: Record<string, number[]> = {};
      const phaseFreq: Record<string, number> = {};
      const sessionSet = new Set<string>();

      for (const row of rows) {
        const name = row.tool_name;
        toolFreq[name] = (toolFreq[name] ?? 0) + 1;
        if (row.result_status === "error") {
          toolErrors[name] = (toolErrors[name] ?? 0) + 1;
        }
        if (!toolDurations[name]) toolDurations[name] = [];
        toolDurations[name].push(row.duration_ms);
        if (row.phase) {
          phaseFreq[row.phase] = (phaseFreq[row.phase] ?? 0) + 1;
        }
        sessionSet.add(row.session_id);
      }

      // Top tools by frequency
      const topTools = Object.entries(toolFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([name, count]) => ({
          tool: name,
          calls: count,
          errors: toolErrors[name] ?? 0,
          errorRate: toolErrors[name]
            ? Math.round(((toolErrors[name] ?? 0) / count) * 100) / 100
            : 0,
          avgDurationMs: Math.round(
            (toolDurations[name]?.reduce((s, v) => s + v, 0) ?? 0) /
              (toolDurations[name]?.length ?? 1)
          ),
        }));

      // Sequential pattern detection (bigrams)
      const bigrams: Record<string, number> = {};
      for (let i = 0; i < rows.length - 1; i++) {
        if (rows[i].session_id === rows[i + 1].session_id) {
          const pair = `${rows[i].tool_name} → ${rows[i + 1].tool_name}`;
          bigrams[pair] = (bigrams[pair] ?? 0) + 1;
        }
      }
      const topPatterns = Object.entries(bigrams)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([pattern, count]) => ({ pattern, count }));

      // Error-prone tools
      const errorProne = Object.entries(toolErrors)
        .filter(([name]) => (toolErrors[name] ?? 0) / (toolFreq[name] ?? 1) > 0.1)
        .sort(([, a], [, b]) => b - a)
        .map(([name, errors]) => ({
          tool: name,
          errors,
          totalCalls: toolFreq[name] ?? 0,
          errorRate: Math.round((errors / (toolFreq[name] ?? 1)) * 100) / 100,
        }));

      return {
        totalCalls: rows.length,
        uniqueTools: Object.keys(toolFreq).length,
        uniqueSessions: sessionSet.size,
        timeRange: {
          from: rows[0]?.created_at,
          to: rows[rows.length - 1]?.created_at,
        },
        topTools,
        phaseDistribution: Object.entries(phaseFreq)
          .sort(([, a], [, b]) => b - a)
          .map(([phase, count]) => ({ phase, count })),
        topPatterns,
        errorProneTools: errorProne,
      };
    },
  },

  // ─── Tool 3: get_self_eval_report ──────────────────────────────────────
  {
    name: "get_self_eval_report",
    description:
      "Generate a comprehensive self-evaluation report by cross-referencing all persisted data: verification cycles, eval runs, quality gates, gaps, learnings, recon sessions, and tool call trajectories. Identifies strengths, weaknesses, and areas for improvement.",
    inputSchema: {
      type: "object",
      properties: {
        sinceDaysAgo: {
          type: "number",
          description: "Report window in days (default: 30)",
        },
        includeDetails: {
          type: "boolean",
          description: "Include detailed breakdowns (default: false)",
        },
        excludeTestSessions: {
          type: "boolean",
          description: "Exclude test/eval harness sessions from health score calculation (default: true). Test suites create hundreds of cycles that skew the health score.",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const sinceDays = args.sinceDaysAgo ?? 30;
      const includeDetails = args.includeDetails ?? false;
      const excludeTestSessions = args.excludeTestSessions ?? true;
      const sinceDate = new Date(Date.now() - sinceDays * 86400000).toISOString();

      // Test session patterns — filters eval harness, dataset bench, vitest artifacts, MCP dev cycles
      const TEST_PATTERNS = [
        "eval_", "eval-", "test_", "test-", "bench_", "bench-",
        "bfcl_", "bfcl-", "swe_", "swebench-",
        "integration-test", "search-test", "list test", "promote test",
        "investigation:", "vitest-marker", "gap-vitest-marker",
        "self-verification:", "mcp prompts",
        "open-dataset", "promoted-eval", "baseline-for-", "candidate-for-", "comparison-",
        "testcomponent",
      ];

      const isTestArtifact = (value: string): boolean => {
        const v = (value || "").toLowerCase();
        return TEST_PATTERNS.some((p) => v.startsWith(p));
      };

      // Verification cycles — filter test artifacts and collect test cycle IDs
      const rawCycles = db
        .prepare("SELECT * FROM verification_cycles WHERE created_at >= ? ORDER BY created_at DESC")
        .all(sinceDate) as any[];
      const testCycleIds = new Set<string>();
      let allCycles: any[];
      if (excludeTestSessions) {
        for (const c of rawCycles) {
          if (isTestArtifact(c.id) || isTestArtifact(c.title)) testCycleIds.add(c.id);
        }
        allCycles = rawCycles.filter((c) => !testCycleIds.has(c.id));
      } else {
        allCycles = rawCycles;
      }
      const completedCycles = allCycles.filter((c) => c.status === "completed");
      const activeCycles = allCycles.filter((c) => c.status === "active");
      const abandonedCycles = allCycles.filter((c) => c.status === "abandoned");

      // Gaps — filter by title pattern AND by membership in test cycles
      let allGaps = db
        .prepare("SELECT * FROM gaps WHERE created_at >= ? ORDER BY created_at DESC")
        .all(sinceDate) as any[];
      if (excludeTestSessions) {
        allGaps = allGaps.filter((g) => !isTestArtifact(g.title) && !testCycleIds.has(g.cycle_id));
      }
      const openGaps = allGaps.filter((g) => g.status === "open");
      const resolvedGaps = allGaps.filter((g) => g.status === "resolved");
      const gapsBySeverity: Record<string, number> = {};
      for (const gap of allGaps) {
        gapsBySeverity[gap.severity] = (gapsBySeverity[gap.severity] ?? 0) + 1;
      }

      // Eval runs — filter by name pattern
      let evalRuns = db
        .prepare("SELECT * FROM eval_runs WHERE created_at >= ? ORDER BY created_at DESC")
        .all(sinceDate) as any[];
      if (excludeTestSessions) {
        evalRuns = evalRuns.filter((r) => !isTestArtifact(r.name));
      }
      const completedEvals = evalRuns.filter((r) => r.status === "completed");
      let avgPassRate = 0;
      let avgScore = 0;
      let passRateCounted = 0;
      if (completedEvals.length > 0) {
        for (const run of completedEvals) {
          try {
            const summary = JSON.parse(run.summary ?? "{}");
            if (summary.autoCleaned) continue; // Skip auto-cleaned runs
            if (typeof summary.passRate === "number") {
              avgPassRate += summary.passRate;
              passRateCounted++;
            }
            avgScore += summary.avgScore ?? 0;
          } catch {
            /* ignore */
          }
        }
        if (passRateCounted > 0) avgPassRate = Math.round((avgPassRate / passRateCounted) * 100) / 100;
        avgScore = Math.round((avgScore / completedEvals.length) * 100) / 100;
      }

      // Quality gates — filter by target pattern
      let gateRuns = db
        .prepare("SELECT * FROM quality_gate_runs WHERE created_at >= ? ORDER BY created_at DESC")
        .all(sinceDate) as any[];
      if (excludeTestSessions) {
        gateRuns = gateRuns.filter((g) => !isTestArtifact(g.target));
      }
      const gatePassRate =
        gateRuns.length > 0
          ? Math.round(
              (gateRuns.filter((g) => g.passed).length / gateRuns.length) * 100
            ) / 100
          : 0;

      // Learnings
      const learningCount = (
        db.prepare("SELECT COUNT(*) as c FROM learnings WHERE created_at >= ?").get(sinceDate) as any
      )?.c ?? 0;
      const learningsByCategory = db
        .prepare(
          "SELECT category, COUNT(*) as count FROM learnings WHERE created_at >= ? GROUP BY category ORDER BY count DESC"
        )
        .all(sinceDate) as any[];

      // Recon sessions
      const reconSessions = db
        .prepare("SELECT COUNT(*) as c FROM recon_sessions WHERE created_at >= ?")
        .get(sinceDate) as any;
      const reconFindings = db
        .prepare("SELECT COUNT(*) as c FROM recon_findings WHERE created_at >= ?")
        .get(sinceDate) as any;

      // Tool call trajectories
      const trajectoryCount = (
        db.prepare("SELECT COUNT(*) as c FROM tool_call_log WHERE created_at >= ?").get(sinceDate) as any
      )?.c ?? 0;
      const trajectoryErrors = (
        db
          .prepare(
            "SELECT COUNT(*) as c FROM tool_call_log WHERE created_at >= ? AND result_status = 'error'"
          )
          .get(sinceDate) as any
      )?.c ?? 0;

      // Health scores
      const completionRate =
        allCycles.length > 0
          ? Math.round((completedCycles.length / allCycles.length) * 100) / 100
          : 0;
      const gapResolutionRate =
        allGaps.length > 0
          ? Math.round((resolvedGaps.length / allGaps.length) * 100) / 100
          : 0;
      const toolErrorRate =
        trajectoryCount > 0
          ? Math.round((trajectoryErrors / trajectoryCount) * 100) / 100
          : 0;

      // Overall health (weighted composite)
      const healthScore = Math.round(
        (completionRate * 0.25 +
          gapResolutionRate * 0.2 +
          avgPassRate * 0.25 +
          gatePassRate * 0.15 +
          (1 - toolErrorRate) * 0.15) *
          100
      ) / 100;

      const report: Record<string, unknown> = {
        reportPeriod: `Last ${sinceDays} days`,
        generatedAt: new Date().toISOString(),
        healthScore,
        healthGrade:
          healthScore >= 0.9
            ? "A"
            : healthScore >= 0.75
              ? "B"
              : healthScore >= 0.6
                ? "C"
                : healthScore >= 0.4
                  ? "D"
                  : "F",
        verification: {
          totalCycles: allCycles.length,
          completed: completedCycles.length,
          active: activeCycles.length,
          abandoned: abandonedCycles.length,
          completionRate,
        },
        gaps: {
          total: allGaps.length,
          open: openGaps.length,
          resolved: resolvedGaps.length,
          resolutionRate: gapResolutionRate,
          bySeverity: gapsBySeverity,
        },
        evalRuns: {
          total: evalRuns.length,
          completed: completedEvals.length,
          avgPassRate,
          avgScore,
        },
        qualityGates: {
          total: gateRuns.length,
          passRate: gatePassRate,
        },
        knowledge: {
          learnings: learningCount,
          byCategory: learningsByCategory,
          reconSessions: reconSessions?.c ?? 0,
          reconFindings: reconFindings?.c ?? 0,
        },
        toolTrajectory: {
          totalCalls: trajectoryCount,
          errors: trajectoryErrors,
          errorRate: toolErrorRate,
        },
      };

      if (includeDetails) {
        report.cycleDetails = allCycles.map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          phase: c.current_phase,
          created: c.created_at,
        }));
        report.openGapDetails = openGaps.map((g) => ({
          id: g.id,
          severity: g.severity,
          title: g.title,
          cycleId: g.cycle_id,
        }));
      }

      return report;
    },
  },

  // ─── Tool 4: get_improvement_recommendations ──────────────────────────
  {
    name: "get_improvement_recommendations",
    description:
      "Analyze all persisted data and return actionable improvement recommendations. Detects: unused tools, missing quality gates, unresolved gaps, knowledge gaps, underutilized phases, and tool error patterns. The self-reinforced learning engine.",
    inputSchema: {
      type: "object",
      properties: {
        sinceDaysAgo: {
          type: "number",
          description: "Analysis window in days (default: 30)",
        },
        focus: {
          type: "string",
          enum: ["tools", "process", "quality", "knowledge", "all"],
          description: "Focus area for recommendations (default: all)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const sinceDays = args.sinceDaysAgo ?? 30;
      const focus = args.focus ?? "all";
      const sinceDate = new Date(Date.now() - sinceDays * 86400000).toISOString();

      const recommendations: Array<{
        category: string;
        priority: "high" | "medium" | "low";
        finding: string;
        recommendation: string;
        action: string;
      }> = [];

      // ── TOOL ANALYSIS ──
      if (focus === "all" || focus === "tools") {
        const toolCalls = db
          .prepare(
            "SELECT tool_name, COUNT(*) as calls, SUM(CASE WHEN result_status = 'error' THEN 1 ELSE 0 END) as errors, AVG(duration_ms) as avg_ms FROM tool_call_log WHERE created_at >= ? GROUP BY tool_name"
          )
          .all(sinceDate) as any[];

        const usedTools = new Set(toolCalls.map((t) => t.tool_name));

        // Known tool catalog for gap detection
        const KNOWN_TOOLS = [
          "start_verification_cycle", "log_phase_findings", "log_gap", "resolve_gap",
          "log_test_result", "get_verification_status", "list_verification_cycles",
          "abandon_cycle", "start_eval_run", "record_eval_result", "complete_eval_run",
          "compare_eval_runs", "list_eval_runs", "run_quality_gate", "get_gate_preset",
          "get_gate_history", "run_closed_loop", "record_learning", "search_learnings",
          "list_learnings", "delete_learning", "search_all_knowledge",
          "get_flywheel_status", "promote_to_eval", "trigger_investigation",
          "run_mandatory_flywheel", "run_recon", "log_recon_finding",
          "get_recon_summary", "check_framework_updates", "bootstrap_project",
          "get_project_context", "findTools", "getMethodology",
          "discover_infrastructure", "triple_verify", "self_implement",
          "generate_self_instructions", "connect_channels", "assess_risk",
          "decide_re_update", "run_self_maintenance", "scaffold_directory",
          "run_autonomous_loop", "log_tool_call", "get_trajectory_analysis",
          "get_self_eval_report", "get_improvement_recommendations",
          "cleanup_stale_runs", "synthesize_recon_to_learnings",
        ];

        // Find underused tools
        const unusedTools = KNOWN_TOOLS.filter((t) => !usedTools.has(t));
        if (unusedTools.length > 10) {
          recommendations.push({
            category: "tools",
            priority: "medium",
            finding: `${unusedTools.length} tools have never been used in the last ${sinceDays} days.`,
            recommendation:
              "Review unused tools to see if they could improve your workflow. Call findTools to discover relevant capabilities.",
            action: `findTools({ query: "${unusedTools.slice(0, 3).join(" ")}" })`,
          });
        }

        // Error-prone tools
        for (const tc of toolCalls) {
          if (tc.calls >= 3 && tc.errors / tc.calls > 0.2) {
            recommendations.push({
              category: "tools",
              priority: "high",
              finding: `Tool "${tc.tool_name}" has a ${Math.round((tc.errors / tc.calls) * 100)}% error rate (${tc.errors}/${tc.calls} calls).`,
              recommendation:
                "Investigate the root cause. Common issues: incorrect arguments, missing prerequisites, or schema mismatches.",
              action: `get_trajectory_analysis({ sessionId: "latest" }) — then search_all_knowledge({ query: "${tc.tool_name} error" })`,
            });
          }
        }

        // Slow tools
        for (const tc of toolCalls) {
          if (tc.avg_ms > 5000 && tc.calls >= 2) {
            recommendations.push({
              category: "tools",
              priority: "low",
              finding: `Tool "${tc.tool_name}" averages ${Math.round(tc.avg_ms)}ms per call (${tc.calls} calls).`,
              recommendation:
                "Consider batching calls or pre-fetching data to reduce latency.",
              action: `record_learning({ key: "slow-tool-${tc.tool_name}", content: "..." })`,
            });
          }
        }
      }

      // ── PROCESS ANALYSIS ──
      if (focus === "all" || focus === "process") {
        // Abandoned cycles
        const abandoned = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM verification_cycles WHERE status = 'abandoned' AND created_at >= ?"
            )
            .get(sinceDate) as any
        )?.c ?? 0;
        const total = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM verification_cycles WHERE created_at >= ?"
            )
            .get(sinceDate) as any
        )?.c ?? 0;

        if (total > 0 && abandoned / total > 0.3) {
          recommendations.push({
            category: "process",
            priority: "high",
            finding: `${Math.round((abandoned / total) * 100)}% of verification cycles were abandoned (${abandoned}/${total}).`,
            recommendation:
              "Abandoning too many cycles suggests scope creep or unclear goals. Break work into smaller, completable units.",
            action: "list_verification_cycles — review abandoned cycle titles for patterns.",
          });
        }

        // Cycles stuck in early phases
        const stuckCycles = db
          .prepare(
            "SELECT COUNT(*) as c FROM verification_cycles WHERE status = 'active' AND current_phase <= 2 AND created_at < datetime('now', '-3 days')"
          )
          .get() as any;
        if (stuckCycles?.c > 0) {
          recommendations.push({
            category: "process",
            priority: "medium",
            finding: `${stuckCycles.c} verification cycles have been stuck in early phases for 3+ days.`,
            recommendation:
              "Either complete or abandon stale cycles. Stale context leads to incorrect gap analysis.",
            action: "list_verification_cycles — identify and triage stale cycles.",
          });
        }

        // Missing flywheel runs
        const flywheelRuns = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM quality_gate_runs WHERE gate_name = 'mandatory_flywheel' AND created_at >= ?"
            )
            .get(sinceDate) as any
        )?.c ?? 0;
        const completedCycles = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM verification_cycles WHERE status = 'completed' AND created_at >= ?"
            )
            .get(sinceDate) as any
        )?.c ?? 0;

        if (completedCycles > 0 && flywheelRuns < completedCycles) {
          recommendations.push({
            category: "process",
            priority: "high",
            finding: `Only ${flywheelRuns} mandatory flywheel runs for ${completedCycles} completed cycles. Every non-trivial change needs a flywheel run.`,
            recommendation:
              "Run run_mandatory_flywheel after every verification cycle completion.",
            action: 'getMethodology({ topic: "mandatory_flywheel" })',
          });
        }
      }

      // ── QUALITY ANALYSIS ──
      if (focus === "all" || focus === "quality") {
        // Declining eval scores
        const recentEvals = db
          .prepare(
            "SELECT summary FROM eval_runs WHERE status = 'completed' AND created_at >= ? ORDER BY created_at DESC LIMIT 10"
          )
          .all(sinceDate) as any[];

        const passRates: number[] = [];
        for (const run of recentEvals) {
          try {
            const summary = JSON.parse(run.summary ?? "{}");
            if (typeof summary.passRate === "number") passRates.push(summary.passRate);
          } catch {
            /* ignore */
          }
        }

        if (passRates.length >= 3) {
          const recent = passRates.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
          const older = passRates.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, passRates.slice(-3).length);
          if (recent < older - 0.1) {
            recommendations.push({
              category: "quality",
              priority: "high",
              finding: `Eval pass rates are declining: recent avg ${Math.round(recent * 100)}% vs earlier avg ${Math.round(older * 100)}%.`,
              recommendation:
                "Trigger an investigation to find the regression root cause.",
              action: "trigger_investigation — link to the most recent failing eval run.",
            });
          }
        }

        // Unresolved critical/high gaps
        const criticalGaps = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM gaps WHERE status = 'open' AND severity IN ('CRITICAL', 'HIGH')"
            )
            .get() as any
        )?.c ?? 0;
        if (criticalGaps > 0) {
          recommendations.push({
            category: "quality",
            priority: "high",
            finding: `${criticalGaps} CRITICAL/HIGH severity gaps remain unresolved.`,
            recommendation:
              "Resolve critical gaps before shipping. Each open critical gap is a potential production incident.",
            action: "get_verification_status — review and resolve_gap for each critical gap.",
          });
        }
      }

      // ── KNOWLEDGE ANALYSIS ──
      if (focus === "all" || focus === "knowledge") {
        const learningCount = (
          db.prepare("SELECT COUNT(*) as c FROM learnings WHERE created_at >= ?").get(sinceDate) as any
        )?.c ?? 0;
        const cycleCount = (
          db.prepare("SELECT COUNT(*) as c FROM verification_cycles WHERE created_at >= ?").get(sinceDate) as any
        )?.c ?? 0;

        if (cycleCount > 0 && learningCount / cycleCount < 1) {
          recommendations.push({
            category: "knowledge",
            priority: "medium",
            finding: `Only ${learningCount} learnings recorded for ${cycleCount} verification cycles (ratio: ${(learningCount / cycleCount).toFixed(1)}).`,
            recommendation:
              "Record at least 1 learning per verification cycle. Every cycle should produce at least one gotcha, pattern, or edge case.",
            action: "record_learning — capture insights from each completed cycle.",
          });
        }

        // Check for orphan recon sessions
        const orphanRecon = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM recon_sessions WHERE status = 'active' AND created_at < datetime('now', '-7 days')"
            )
            .get() as any
        )?.c ?? 0;
        if (orphanRecon > 0) {
          recommendations.push({
            category: "knowledge",
            priority: "low",
            finding: `${orphanRecon} recon sessions have been active for 7+ days without completion.`,
            recommendation:
              "Complete or close stale recon sessions. Incomplete research creates knowledge gaps.",
            action: "get_recon_summary({ sessionId: '...', completeSession: true })",
          });
        }
      }

      // Sort by priority
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      recommendations.sort(
        (a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
      );

      return {
        analysisWindow: `Last ${sinceDays} days`,
        focus,
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter((r) => r.priority === "high").length,
        mediumPriority: recommendations.filter((r) => r.priority === "medium").length,
        lowPriority: recommendations.filter((r) => r.priority === "low").length,
        recommendations,
        _selfReinforcement: {
          instruction:
            "Apply the top recommendations, then re-run this tool to verify improvement. This creates a self-reinforcing loop: Use → Analyze → Improve → Re-analyze.",
          nextSteps: [
            "1. Address high-priority recommendations first",
            "2. Record learnings for each fix applied",
            "3. Re-run get_improvement_recommendations to verify improvement",
            "4. Run get_self_eval_report for the full health dashboard",
          ],
        },
      };
    },
  },

  // ─── Tool 5: cleanup_stale_runs ─────────────────────────────────────
  {
    name: "cleanup_stale_runs",
    description:
      "Clean up orphaned eval runs stuck in 'running'/'pending' state and optionally close stale gaps. Eval runs left in running state forever skew health scores. This tool auto-completes them with a summary noting they were cleaned up.",
    inputSchema: {
      type: "object",
      properties: {
        staleDays: {
          type: "number",
          description: "Consider runs stale if older than N days (default: 7)",
        },
        closeStaleGaps: {
          type: "boolean",
          description: "Also close LOW/MEDIUM gaps older than staleDays that are still open (default: false)",
        },
        dryRun: {
          type: "boolean",
          description: "Preview what would be cleaned up without actually modifying data (default: true)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const staleDays = args.staleDays ?? 7;
      const closeStaleGaps = args.closeStaleGaps ?? false;
      const dryRun = args.dryRun ?? true;
      const cutoff = new Date(Date.now() - staleDays * 86400000).toISOString();

      // Find stale eval runs
      const staleEvals = db
        .prepare(
          "SELECT id, name, status, created_at FROM eval_runs WHERE status IN ('pending', 'running') AND created_at < ?"
        )
        .all(cutoff) as any[];

      // Find stale verification cycles
      const staleCycles = db
        .prepare(
          "SELECT id, title, status, current_phase, created_at FROM verification_cycles WHERE status = 'active' AND created_at < ?"
        )
        .all(cutoff) as any[];

      // Find stale gaps (optional)
      let staleGaps: any[] = [];
      if (closeStaleGaps) {
        staleGaps = db
          .prepare(
            "SELECT id, title, severity, status, created_at FROM gaps WHERE status = 'open' AND severity IN ('LOW', 'MEDIUM') AND created_at < ?"
          )
          .all(cutoff) as any[];
      }

      if (!dryRun) {
        // Clean up stale eval runs
        for (const run of staleEvals) {
          db.prepare(
            "UPDATE eval_runs SET status = 'completed', summary = ?, completed_at = datetime('now') WHERE id = ?"
          ).run(
            JSON.stringify({ autoCleaned: true, note: `Auto-cleaned: stale ${run.status} run from ${run.created_at}` }),
            run.id
          );
        }

        // Abandon stale verification cycles
        for (const cycle of staleCycles) {
          db.prepare(
            "UPDATE verification_cycles SET status = 'abandoned', updated_at = datetime('now') WHERE id = ?"
          ).run(cycle.id);
        }

        // Close stale gaps
        for (const gap of staleGaps) {
          db.prepare(
            "UPDATE gaps SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?"
          ).run(gap.id);
        }
      }

      return {
        dryRun,
        staleDays,
        staleEvalRuns: {
          count: staleEvals.length,
          action: dryRun ? "would complete" : "completed",
          runs: staleEvals.map((r) => ({ id: r.id, name: r.name, status: r.status, created: r.created_at })),
        },
        staleCycles: {
          count: staleCycles.length,
          action: dryRun ? "would abandon" : "abandoned",
          cycles: staleCycles.map((c) => ({ id: c.id, title: c.title, phase: c.current_phase, created: c.created_at })),
        },
        staleGaps: closeStaleGaps
          ? {
              count: staleGaps.length,
              action: dryRun ? "would resolve" : "resolved",
              gaps: staleGaps.map((g) => ({ id: g.id, title: g.title, severity: g.severity, created: g.created_at })),
            }
          : { skipped: true, reason: "Set closeStaleGaps=true to include" },
        nextStep: dryRun
          ? "Review the above, then re-run with dryRun=false to apply changes."
          : "Cleanup applied. Run get_self_eval_report to verify improved health score.",
      };
    },
  },

  // ─── Tool 6: synthesize_recon_to_learnings ──────────────────────────
  {
    name: "synthesize_recon_to_learnings",
    description:
      "Convert recon findings into persistent learnings. Recon findings are ephemeral research notes; learnings are the distilled, searchable knowledge base. This tool reviews recent recon findings and creates learnings from the most actionable ones.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Synthesize findings from a specific recon session (optional — omit for all recent sessions)",
        },
        sinceDaysAgo: {
          type: "number",
          description: "Only look at findings from the last N days (default: 30)",
        },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Only synthesize findings in these categories (optional — omit for all)",
        },
        dryRun: {
          type: "boolean",
          description: "Preview learnings that would be created without saving (default: true)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const sinceDays = args.sinceDaysAgo ?? 30;
      const dryRun = args.dryRun ?? true;
      const sinceDate = new Date(Date.now() - sinceDays * 86400000).toISOString();

      // Fetch recon findings
      let findings: any[];
      if (args.sessionId) {
        findings = db
          .prepare(
            "SELECT rf.*, rs.target as session_target FROM recon_findings rf JOIN recon_sessions rs ON rf.session_id = rs.id WHERE rf.session_id = ? AND rf.created_at >= ? ORDER BY rf.created_at DESC"
          )
          .all(args.sessionId, sinceDate) as any[];
      } else {
        findings = db
          .prepare(
            "SELECT rf.*, rs.target as session_target FROM recon_findings rf JOIN recon_sessions rs ON rf.session_id = rs.id WHERE rf.created_at >= ? ORDER BY rf.created_at DESC"
          )
          .all(sinceDate) as any[];
      }

      // Filter by categories if specified
      if (args.categories && Array.isArray(args.categories)) {
        const cats = new Set((args.categories as string[]).map((c) => c.toLowerCase()));
        findings = findings.filter((f) => cats.has((f.category || "").toLowerCase()));
      }

      // Check which findings already have corresponding learnings (by key pattern)
      const existingKeys = new Set(
        (db.prepare("SELECT key FROM learnings").all() as any[]).map((r) => r.key)
      );

      // Generate learning candidates from findings
      const candidates: Array<{
        key: string;
        content: string;
        category: string;
        tags: string;
        finding: any;
        alreadyExists: boolean;
      }> = [];

      for (const f of findings) {
        const key = `recon-${f.category}-${(f.summary || "").slice(0, 40).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;
        const alreadyExists = existingKeys.has(key);

        candidates.push({
          key,
          content: `[From recon: ${f.session_target || "unknown"}] ${f.summary}${f.action_items ? ` Action: ${f.action_items}` : ""}`,
          category: f.category || "recon",
          tags: `recon,${f.category || "general"},synthesized`,
          finding: {
            id: f.id,
            category: f.category,
            summary: (f.summary || "").slice(0, 100),
            sessionTarget: f.session_target,
          },
          alreadyExists,
        });
      }

      const newCandidates = candidates.filter((c) => !c.alreadyExists);
      let created = 0;

      if (!dryRun) {
        for (const c of newCandidates) {
          try {
            db.prepare(
              "INSERT INTO learnings (key, content, category, tags, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
            ).run(c.key, c.content, c.category, c.tags);
            created++;
          } catch {
            // Duplicate key — skip silently
          }
        }
      }

      return {
        dryRun,
        totalFindings: findings.length,
        alreadySynthesized: candidates.filter((c) => c.alreadyExists).length,
        newLearnings: newCandidates.length,
        created: dryRun ? 0 : created,
        preview: newCandidates.slice(0, 10).map((c) => ({
          key: c.key,
          content: c.content.slice(0, 200),
          category: c.category,
          fromFinding: c.finding,
        })),
        nextStep: dryRun
          ? "Review the preview, then re-run with dryRun=false to create learnings."
          : `${created} learnings created. Run search_all_knowledge to verify they're searchable.`,
      };
    },
  },
];
