/**
 * Quality Gate tools — boolean check validation pattern + closed loop verification.
 * Deterministic gates that evaluate content/code against defined rules.
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

const GATE_PRESETS: Record<
  string,
  Array<{ name: string; description: string; evaluationHint: string }>
> = {
  engagement: [
    {
      name: "noReportHeader",
      description:
        "First 2 lines must NOT be a title card (Daily Intelligence Brief, VC DEAL FLOW MEMO, etc.)",
      evaluationHint:
        "Check if the first 2 lines look like a report header or title card. FAIL if they do.",
    },
    {
      name: "hasHook",
      description:
        "First sentence must be a concrete claim, surprising stat, or contrarian take — not a label",
      evaluationHint:
        "Check if the opening is a specific, engaging claim. FAIL if it's generic or just a topic label.",
    },
    {
      name: "noWallOfText",
      description:
        "No more than 3 consecutive structured blocks (bullet lists, headers). Break with a 1-sentence human observation.",
      evaluationHint:
        "Count consecutive structured blocks. FAIL if more than 3 in a row without a conversational break.",
    },
    {
      name: "hasQuestion",
      description:
        "Must contain at least one genuine question to the audience (not rhetorical). Questions drive comments.",
      evaluationHint:
        "Look for a real question mark that invites a response. FAIL if no genuine question found.",
    },
    {
      name: "noGenericHashtags",
      description:
        "Must NOT use #AI, #TechIntelligence, #DailyBrief alone — use specific hashtags tied to the content.",
      evaluationHint:
        "Check hashtags. FAIL if they are generic catch-alls. PASS if specific to the content topic.",
    },
    {
      name: "underCharLimit",
      description: "Max 1500 chars for org page daily posts. Shorter posts get higher engagement.",
      evaluationHint:
        "Count characters. FAIL if over 1500.",
    },
    {
      name: "hasOpinion",
      description:
        'Must contain at least one first-person interpretive statement ("This signals...", "Watch for...").',
      evaluationHint:
        "Look for first-person analysis or interpretation. FAIL if purely informational with no opinion.",
    },
  ],
  code_review: [
    {
      name: "compiles_clean",
      description: "TypeScript compiles with zero errors (tsc --noEmit)",
      evaluationHint: "Run tsc --noEmit. FAIL if any errors.",
    },
    {
      name: "no_lint_warnings",
      description: "Linter passes with zero warnings",
      evaluationHint: "Run the project linter. FAIL if any warnings or errors.",
    },
    {
      name: "tests_pass",
      description: "All existing test suites pass",
      evaluationHint: "Run test suite. FAIL if any test fails.",
    },
    {
      name: "no_hardcoded_secrets",
      description: "No API keys, tokens, or passwords in code",
      evaluationHint:
        "Search for patterns like API_KEY=, token=, password=, hardcoded URLs with credentials. FAIL if found.",
    },
    {
      name: "error_handling_present",
      description: "Error paths are handled, not swallowed silently",
      evaluationHint:
        "Check try/catch blocks and promise chains. FAIL if errors are caught but ignored.",
    },
    {
      name: "follows_existing_patterns",
      description: "New code follows the same patterns as surrounding code",
      evaluationHint:
        "Compare with adjacent files. FAIL if new abstractions or patterns diverge from established conventions.",
    },
    {
      name: "has_regression_test",
      description: "Every bug fix ships with a test that would have caught it",
      evaluationHint:
        "Check if a test exists for the specific fix. FAIL if no test covers the fixed behavior.",
    },
  ],
  ui_ux_qa: [
    {
      name: "component_renders",
      description:
        "Changed/new components render without errors in tests and browser",
      evaluationHint:
        "Run `npm run test:run` for component tests or check browser console for React errors. FAIL if render errors.",
    },
    {
      name: "responsive_check",
      description:
        "UI works at mobile (375px), tablet (768px), and desktop (1280px) breakpoints",
      evaluationHint:
        "Resize viewport or check media queries in changed components. FAIL if layout breaks at any breakpoint.",
    },
    {
      name: "keyboard_navigable",
      description:
        "All interactive elements reachable via Tab, activated via Enter/Space",
      evaluationHint:
        "Tab through the changed UI. FAIL if any button, link, or input is unreachable by keyboard.",
    },
    {
      name: "aria_labels_present",
      description:
        "Interactive elements have accessible names (aria-label, aria-labelledby, or visible text)",
      evaluationHint:
        "Check changed components for buttons/inputs without accessible names. FAIL if any interactive element is unlabeled.",
    },
    {
      name: "loading_states_handled",
      description:
        "Async operations show loading indicator, error state, and empty state",
      evaluationHint:
        "Trigger the async operation. FAIL if no loading spinner, no error boundary, or no empty state message.",
    },
    {
      name: "no_console_errors",
      description:
        "Browser console has zero errors/warnings from changed code",
      evaluationHint:
        "Open browser devtools console while using the feature. FAIL if errors or warnings from changed files.",
    },
    {
      name: "visual_consistency",
      description:
        "Fonts, colors, spacing match existing design system and adjacent components",
      evaluationHint:
        "Compare changed UI against adjacent components. FAIL if inconsistent typography, color, or spacing.",
    },
    {
      name: "storybook_story_exists",
      description:
        "New/changed components have a Storybook story for documentation and visual testing",
      evaluationHint:
        "Check if a .stories.tsx file exists for the component. FAIL if new component has no story.",
    },
  ],
  deploy_readiness: [
    {
      name: "all_tests_green",
      description: "Full test suite passes (static + unit + integration + e2e)",
      evaluationHint: "Run complete test suite. FAIL if any test fails.",
    },
    {
      name: "no_critical_gaps",
      description: "No CRITICAL or HIGH gaps remain open",
      evaluationHint:
        "Check gap list. FAIL if any CRITICAL or HIGH severity gaps are still open.",
    },
    {
      name: "eval_scores_improved",
      description:
        "Eval scores are equal to or better than baseline (use compare_eval_runs)",
      evaluationHint:
        "Compare latest eval run against baseline. FAIL if scores regressed.",
    },
    {
      name: "learnings_documented",
      description: "Edge cases and gotchas from this work are recorded as learnings",
      evaluationHint:
        "Check if record_learning was called for discoveries during this cycle. FAIL if no learnings recorded.",
    },
    {
      name: "no_todo_comments",
      description: "No TODO or FIXME comments left in changed files",
      evaluationHint:
        "Search changed files for TODO/FIXME/HACK comments. FAIL if any remain.",
    },
  ],
};

export const qualityGateTools: McpTool[] = [
  {
    name: "run_quality_gate",
    description:
      "Evaluate content or code against a set of boolean rules. Returns pass/fail with specific failures listed. The agent evaluates each rule and passes boolean results — the tool persists and aggregates.",
    inputSchema: {
      type: "object",
      properties: {
        gateName: {
          type: "string",
          description:
            "Name for this gate (e.g. 'engagement', 'code_review', 'deploy_readiness', or custom)",
        },
        target: {
          type: "string",
          description:
            "What is being checked (content text, file path, PR description)",
        },
        rules: {
          type: "array",
          description: "Boolean rules with evaluation results",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Rule name" },
              passed: {
                type: "boolean",
                description: "Did this rule pass?",
              },
            },
            required: ["name", "passed"],
          },
        },
      },
      required: ["gateName", "rules"],
    },
    handler: async (args) => {
      const { gateName, target, rules } = args;
      if (!rules || rules.length === 0)
        throw new Error("At least one rule is required");

      const db = getDb();
      const gateRunId = genId("gate");

      const ruleResults: Record<string, boolean> = {};
      const failures: string[] = [];
      let passedCount = 0;

      for (const rule of rules) {
        ruleResults[rule.name] = rule.passed;
        if (rule.passed) {
          passedCount++;
        } else {
          failures.push(rule.name);
        }
      }

      const totalRules = rules.length;
      const score = totalRules > 0 ? passedCount / totalRules : 0;
      const passed = failures.length === 0;

      db.prepare(
        "INSERT INTO quality_gate_runs (id, gate_name, target, passed, score, total_rules, failures, rule_results) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        gateRunId,
        gateName,
        target ?? null,
        passed ? 1 : 0,
        score,
        totalRules,
        JSON.stringify(failures),
        JSON.stringify(ruleResults)
      );

      return {
        gateRunId,
        gateName,
        passed,
        score: Math.round(score * 100) / 100,
        totalRules,
        passedCount,
        failures,
        ruleResults,
      };
    },
  },
  {
    name: "get_gate_preset",
    description:
      "Get the rules for a built-in quality gate preset. Returns rule names, descriptions, and evaluation instructions so you can check each one. Presets: engagement (content quality), code_review (implementation quality), deploy_readiness (pre-deploy checklist), ui_ux_qa (frontend UI/UX verification).",
    inputSchema: {
      type: "object",
      properties: {
        preset: {
          type: "string",
          enum: ["engagement", "code_review", "deploy_readiness", "ui_ux_qa"],
          description: "Which preset to retrieve",
        },
      },
      required: ["preset"],
    },
    handler: async (args) => {
      const preset = GATE_PRESETS[args.preset];
      if (!preset) throw new Error(`Unknown preset: ${args.preset}`);

      return {
        preset: args.preset,
        ruleCount: preset.length,
        rules: preset,
        usage: `Evaluate each rule against your target, then call run_quality_gate with gateName="${args.preset}" and the boolean results.`,
      };
    },
  },
  {
    name: "get_gate_history",
    description:
      "Get the history of quality gate runs for a given gate name. Shows pass/fail trend over time.",
    inputSchema: {
      type: "object",
      properties: {
        gateName: { type: "string", description: "Gate name to look up" },
        limit: {
          type: "number",
          description: "Max results (default 20)",
        },
      },
      required: ["gateName"],
    },
    handler: async (args) => {
      const db = getDb();
      const limit = args.limit ?? 20;

      const runs = db
        .prepare(
          "SELECT * FROM quality_gate_runs WHERE gate_name = ? ORDER BY created_at DESC LIMIT ?"
        )
        .all(args.gateName, limit) as any[];

      const totalRuns = runs.length;
      const passedRuns = runs.filter((r: any) => r.passed === 1).length;

      return {
        gateName: args.gateName,
        runs: runs.map((r: any) => ({
          gateRunId: r.id,
          passed: r.passed === 1,
          score: r.score,
          failures: r.failures ? JSON.parse(r.failures) : [],
          createdAt: r.created_at,
        })),
        trend: {
          totalRuns,
          passRate:
            totalRuns > 0
              ? Math.round((passedRuns / totalRuns) * 100) / 100
              : 0,
        },
      };
    },
  },
  {
    name: "run_closed_loop",
    description:
      "Track a compile-lint-test-debug closed loop iteration. Record the result of each step. Never present changes without a full green loop.",
    inputSchema: {
      type: "object",
      properties: {
        cycleId: {
          type: "string",
          description: "Optional: link to a verification cycle",
        },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: {
                type: "string",
                enum: ["compile", "lint", "test", "self_debug"],
              },
              passed: { type: "boolean" },
              output: { type: "string" },
            },
            required: ["step", "passed"],
          },
        },
      },
      required: ["steps"],
    },
    handler: async (args) => {
      const { steps, cycleId } = args;
      if (!steps || steps.length === 0)
        throw new Error("At least one step is required");

      const db = getDb();
      const gateRunId = genId("gate");

      const ruleResults: Record<string, boolean> = {};
      const failures: string[] = [];
      let firstFailure: string | null = null;

      for (const s of steps) {
        ruleResults[s.step] = s.passed;
        if (!s.passed) {
          failures.push(s.step);
          if (!firstFailure) firstFailure = s.step;
        }
      }

      const allPassed = failures.length === 0;
      const score = steps.length > 0
        ? steps.filter((s: any) => s.passed).length / steps.length
        : 0;

      db.prepare(
        "INSERT INTO quality_gate_runs (id, gate_name, target, passed, score, total_rules, failures, rule_results) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        gateRunId,
        "closed_loop",
        cycleId ?? null,
        allPassed ? 1 : 0,
        score,
        steps.length,
        JSON.stringify(failures),
        JSON.stringify(ruleResults)
      );

      const guidance = allPassed
        ? "Full green loop achieved. Changes are ready to present."
        : `Fix the '${firstFailure}' failure, then re-run from that step. Do not proceed until green.`;

      return {
        gateRunId,
        allPassed,
        firstFailure,
        score: Math.round(score * 100) / 100,
        guidance,
      };
    },
  },
];
