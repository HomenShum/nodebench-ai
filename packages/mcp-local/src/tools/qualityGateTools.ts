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
  agent_bug_verdict: [
    {
      name: "preconditions_verified",
      description:
        "Environment, auth, and test data preconditions were verified before the trigger step.",
      evaluationHint:
        "FAIL if the run skipped explicit setup verification or could not establish the required preconditions.",
    },
    {
      name: "trigger_verify_split",
      description:
        "The action that attempts reproduction is separate from the step that verifies the resulting UI or system state.",
      evaluationHint:
        "FAIL if the same step both triggered and asserted success without an independent verification pass.",
    },
    {
      name: "evidence_attached",
      description:
        "The verdict cites concrete evidence such as screenshots, logs, videos, metrics, or diffs.",
      evaluationHint:
        "FAIL if the verdict is based on narrative alone with no attached evidence references.",
    },
    {
      name: "primary_mission_preserved",
      description:
        "The run stayed focused on the reported bug instead of drifting into unrelated exploration.",
      evaluationHint:
        "FAIL if the primary bug was not resolved to a defensible verdict because the run wandered into side issues.",
    },
    {
      name: "anomalies_logged_separately",
      description:
        "Secondary anomalies or newly discovered bugs were recorded separately from the main verdict.",
      evaluationHint:
        "FAIL if unrelated anomalies replaced or polluted the primary bug verdict instead of being logged independently.",
    },
    {
      name: "retry_budget_respected",
      description:
        "Retries were bounded and targeted at the failing trigger or precondition, not the whole workflow.",
      evaluationHint:
        "FAIL if the run kept retrying indiscriminately or exceeded the stated retry budget.",
    },
    {
      name: "blocked_infra_classified",
      description:
        "Infrastructure or environment blockers were classified explicitly instead of being mislabeled as app defects.",
      evaluationHint:
        "FAIL if a setup outage, missing permission, or unavailable environment was reported as a product bug.",
    },
    {
      name: "verdict_is_defensible",
      description:
        "The final verdict includes a clear outcome, confidence, and the reasoning needed for human review.",
      evaluationHint:
        "FAIL if the final verdict lacks a concrete conclusion, confidence level, or explanation tied to the evidence.",
    },
  ],
  agent_comparison: [
    {
      name: "task_success",
      description: "Agent completed the task correctly (deterministic checks pass: tests, lint, type-check)",
      evaluationHint: "Run the task's success criteria. FAIL if any deterministic check fails.",
    },
    {
      name: "no_regressions",
      description: "Agent did not break existing functionality (full test suite still passes)",
      evaluationHint: "Run the full test suite, not just the changed tests. FAIL if any pre-existing test now fails.",
    },
    {
      name: "structured_recon",
      description: "Agent performed structured reconnaissance before implementation (run_recon or search_all_knowledge called)",
      evaluationHint: "Check tool call trajectory for recon tools appearing before implementation tools. FAIL if none.",
    },
    {
      name: "risk_assessed",
      description: "Agent assessed risk before making changes (assess_risk called)",
      evaluationHint: "Check tool call trajectory for assess_risk. FAIL if not called before any write operation.",
    },
    {
      name: "three_layer_tests",
      description: "Agent ran tests at multiple layers (static + unit/integration + manual/e2e)",
      evaluationHint: "Check for log_test_result or run_closed_loop with at least 2 test layers. FAIL if only 1 layer or none.",
    },
    {
      name: "regression_guards_created",
      description: "Agent created eval cases or tests that would catch the bug if it reappeared",
      evaluationHint: "Check for promote_to_eval, start_eval_run, or new test files. FAIL if no regression guard exists.",
    },
    {
      name: "quality_gate_enforced",
      description: "Agent ran a quality gate before declaring done (run_quality_gate called)",
      evaluationHint: "Check for run_quality_gate in trajectory. FAIL if not called.",
    },
    {
      name: "learnings_banked",
      description: "Agent recorded discoveries as persistent learnings (record_learning called)",
      evaluationHint: "Check for record_learning in trajectory. FAIL if no learnings were banked.",
    },
    {
      name: "within_budget",
      description: "Agent completed within token/time budget (no runaway loops or excessive tool calls)",
      evaluationHint: "Check total tool calls and duration. FAIL if >50 tool calls or >30 minutes for a simple task.",
    },
    {
      name: "no_forbidden_behaviors",
      description: "Agent did not perform forbidden actions (unsafe operations without risk assessment, skipping tests, hardcoding secrets)",
      evaluationHint: "Check for unsafe patterns: skipped tests, hardcoded values, unassessed high-risk actions. FAIL if any found.",
    },
  ],
  a11y: [
    {
      name: "aria_labels_complete",
      description: "All interactive elements (buttons, links, inputs) have accessible names via aria-label, aria-labelledby, or visible text content",
      evaluationHint: "Inspect all <button>, <a>, <input>, <select>, <textarea> in changed components. FAIL if any lacks an accessible name.",
    },
    {
      name: "heading_hierarchy",
      description: "Heading levels (h1-h6) are sequential and not skipped (no h1→h3 without h2)",
      evaluationHint: "Check heading elements in order. FAIL if any level is skipped (e.g., h2 followed by h4).",
    },
    {
      name: "color_contrast_sufficient",
      description: "Text meets WCAG 2.1 AA contrast ratios: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold)",
      evaluationHint: "Check foreground/background color pairs in changed components. FAIL if contrast ratio is below threshold.",
    },
    {
      name: "keyboard_navigable",
      description: "All interactive elements are reachable via Tab and activatable via Enter/Space. No keyboard traps exist.",
      evaluationHint: "Tab through the changed UI. FAIL if any interactive element is unreachable or creates a focus trap.",
    },
    {
      name: "focus_visible",
      description: "Focus indicators are visible on all interactive elements when navigated via keyboard",
      evaluationHint: "Tab through elements and check for visible focus rings/outlines. FAIL if focus state is invisible.",
    },
    {
      name: "reduced_motion_respected",
      description: "Animations/transitions honor prefers-reduced-motion media query or provide a UI toggle",
      evaluationHint: "Check CSS for animation/transition usage. FAIL if @media (prefers-reduced-motion: reduce) is not handled.",
    },
    {
      name: "form_labels_linked",
      description: "All form inputs have associated <label> elements via htmlFor/id or are wrapped in <label>",
      evaluationHint: "Check <input>/<select>/<textarea> elements. FAIL if any lacks a linked or wrapping <label>.",
    },
    {
      name: "landmark_regions_present",
      description: "Page uses semantic landmarks (main, nav, aside, header, footer) or ARIA roles for screen reader navigation",
      evaluationHint: "Check for semantic HTML5 landmarks or role attributes. FAIL if the page has no navigable landmarks.",
    },
  ],
  visual_regression: [
    {
      name: "baseline_exists",
      description: "A visual baseline screenshot exists for the changed route/component at all target viewports",
      evaluationHint: "Check public/dogfood/screenshots/ for baseline screenshots matching the changed routes. FAIL if no baseline.",
    },
    {
      name: "pixel_diff_within_threshold",
      description: "Visual diff between baseline and current screenshot is below 2% changed pixels",
      evaluationHint: "Compare baseline vs current screenshots. FAIL if more than 2% of pixels changed unexpectedly.",
    },
    {
      name: "no_layout_shift",
      description: "No unexpected layout shifts (elements moving, resizing, or reflowing) compared to baseline",
      evaluationHint: "Overlay baseline and current screenshots. FAIL if element positions shifted significantly.",
    },
    {
      name: "responsive_breakpoints_intact",
      description: "Layout is correct at mobile (375px), tablet (768px), and desktop (1280px) viewpoints",
      evaluationHint: "Capture screenshots at all 3 viewports. FAIL if any shows broken layout, overflow, or misalignment.",
    },
    {
      name: "dark_light_variants_consistent",
      description: "Both dark and light theme variants render correctly without missing theme tokens or invisible text",
      evaluationHint: "Toggle between dark/light themes. FAIL if any text is invisible, icons missing, or colors broken.",
    },
    {
      name: "loading_skeleton_present",
      description: "Async-loaded content shows a skeleton/placeholder instead of empty space or layout jump",
      evaluationHint: "Throttle network and observe initial load. FAIL if content area is empty then suddenly fills.",
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
      "Get the rules for a built-in quality gate preset. Returns rule names, descriptions, and evaluation instructions so you can check each one. Presets: engagement (content quality), code_review (implementation quality), deploy_readiness (pre-deploy checklist), ui_ux_qa (frontend UI/UX verification), agent_bug_verdict (evidence-first QA verdict discipline), agent_comparison (A/B agent eval), a11y (WCAG 2.1 AA accessibility audit), visual_regression (baseline visual diff checks).",
    inputSchema: {
      type: "object",
      properties: {
        preset: {
          type: "string",
          enum: ["engagement", "code_review", "deploy_readiness", "ui_ux_qa", "agent_bug_verdict", "agent_comparison", "a11y", "visual_regression"],
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
