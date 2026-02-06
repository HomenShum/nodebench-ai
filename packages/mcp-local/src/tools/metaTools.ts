/**
 * Meta tools — tool discovery and methodology guidance.
 * findTools helps agents discover what's available.
 * getMethodology teaches agents the development process.
 */

import type { McpTool } from "../types.js";

const METHODOLOGY_CONTENT: Record<string, Record<string, any>> = {
  verification: {
    title: "6-Phase Iterative Deep-Dive Verification Process",
    description:
      "Standard verification workflow for any non-trivial implementation. Run this before declaring any integration, migration, or protocol-level change done.",
    steps: [
      {
        phase: 1,
        name: "Context Gathering",
        description:
          "Launch parallel research into SDK/protocol specs, current codebase patterns, dispatcher/backend audits, and external API status. Use recon tools to structure this research.",
        tools: [
          "search_learnings",
          "run_recon",
          "check_framework_updates",
          "log_recon_finding",
        ],
        action:
          "Start with search_learnings for past issues. Call run_recon to structure your research (include projectContext for holistic view). Use check_framework_updates for known ecosystems. Log findings with log_recon_finding. Then call log_phase_findings with your context notes.",
      },
      {
        phase: 2,
        name: "Gap Analysis",
        description:
          "Compare findings against current implementation. Categorize each gap as CRITICAL/HIGH/MEDIUM/LOW.",
        tools: ["log_gap"],
        action:
          "Record each gap with severity, root cause, and fix strategy. Call log_phase_findings when complete.",
      },
      {
        phase: 3,
        name: "Implementation",
        description:
          "Fix CRITICAL and HIGH gaps first. Each fix is discrete and testable. Follow existing patterns.",
        tools: ["resolve_gap"],
        action:
          "Implement fixes, call resolve_gap for each. Call log_phase_findings when done.",
      },
      {
        phase: 4,
        name: "Testing & Validation",
        description:
          "Run tests at 5 layers: static (tsc), unit, integration, manual, live_e2e. ALL must pass.",
        tools: ["log_test_result", "run_closed_loop"],
        action:
          "Record each test with log_test_result. Use run_closed_loop for compile/lint/test cycle. Call log_phase_findings when all layers pass.",
      },
      {
        phase: 5,
        name: "Self-Closed-Loop Verification",
        description:
          "Parallel checks: spec compliance, functional correctness, argument compatibility. Any FAIL loops back to Phase 3.",
        tools: ["run_quality_gate"],
        action:
          "Run verification checks. If any fail, loop back to Phase 3. Call log_phase_findings with results.",
      },
      {
        phase: 6,
        name: "Document Learnings",
        description:
          "Record edge cases, gotchas, patterns discovered. This prevents future regressions.",
        tools: ["record_learning"],
        action:
          "Call record_learning for each discovery. Call log_phase_findings to complete the cycle.",
      },
    ],
    composesWith:
      "After completing, use promote_to_eval to feed test cases into the Eval loop.",
  },
  eval: {
    title: "Eval-Driven Development Loop",
    description:
      "Continuous improvement cycle. Changes only ship if evals improve — never on gut feel alone. The eval batch is the gatekeeper, not human intuition.",
    steps: [
      {
        step: 1,
        name: "Run Eval Batch",
        description:
          "Define test cases with input (prompt/scenario), intent (ground truth goal), and expected behavior.",
        tools: ["start_eval_run"],
        action: "Create an eval run with your test cases.",
      },
      {
        step: 2,
        name: "Execute & Record",
        description:
          "Run each test case. Record actual results, verdict (pass/fail/partial), telemetry, and judge notes.",
        tools: ["record_eval_result"],
        action:
          "For each case: execute it, then record what happened with record_eval_result.",
      },
      {
        step: 3,
        name: "Aggregate & Analyze",
        description:
          "Finalize the run. Compute pass rate, average score, failure patterns, and improvement suggestions.",
        tools: ["complete_eval_run"],
        action: "Call complete_eval_run to get aggregate scores.",
      },
      {
        step: 4,
        name: "Compare & Decide",
        description:
          "Compare against baseline. DEPLOY if improved, REVERT if regressed, INVESTIGATE if flat.",
        tools: ["compare_eval_runs"],
        action:
          "Call compare_eval_runs with baseline and candidate run IDs. Follow the recommendation.",
      },
      {
        step: 5,
        name: "Track Over Time",
        description:
          "Monitor eval history for drift. Regressions trigger verification investigations.",
        tools: ["list_eval_runs", "trigger_investigation"],
        action:
          "Use list_eval_runs to spot trends. If regression detected, call trigger_investigation.",
      },
    ],
    composesWith:
      "Regressions trigger 6-Phase Verification via trigger_investigation.",
  },
  flywheel: {
    title: "The AI Flywheel (Verification × Eval)",
    description:
      "The 6-Phase Verification (inner loop) and Eval-Driven Development (outer loop) are not separate processes — they are nested loops that reinforce each other. Every verification produces eval artifacts. Every eval regression triggers verification.",
    steps: [
      {
        name: "Inner → Outer (Verification feeds Evals)",
        items: [
          "Phase 4 test cases become eval batch test cases with known-good expected outputs",
          "Phase 5 PASS/FAIL checklists become eval scoring rubrics",
          "Phase 6 edge cases become adversarial eval cases targeting discovered failure modes",
        ],
        tools: ["promote_to_eval"],
      },
      {
        name: "Outer → Inner (Evals trigger Verification)",
        items: [
          "Tool calling inefficiency → Phase 2 gap analysis on that tool",
          "Eval scores regress after deploy → Full Phase 1-6 cycle (treat as production incident)",
          "New tool/prompt change suggested → Phase 3 implementation + Phase 4-5 validation",
          "Recurring failure pattern → Phase 1 deep dive into root cause",
        ],
        tools: ["trigger_investigation"],
      },
      {
        name: "When to use which",
        items: [
          "Building/changing a feature → Run 6-Phase Verification (Is this correct?)",
          "Measuring system quality over time → Run Eval loop (Is this better?)",
          "Both, always → They compound. Every 6-Phase run produces eval artifacts. Every eval regression triggers 6-Phase.",
        ],
        tools: ["get_flywheel_status"],
      },
      {
        name: "Mandatory Minimum Verification",
        items: [
          "Every non-trivial change MUST pass the 6-step mandatory flywheel before being declared done.",
          "This is the floor, not the ceiling. The full 6-Phase cycle is the gold standard.",
          "Only skip for trivial changes (typos, comments, config) with explicit justification.",
          'Call getMethodology("mandatory_flywheel") for the full 6-step checklist and the variety-check dead-code example.',
        ],
        tools: ["run_mandatory_flywheel"],
      },
    ],
  },
  ui_ux_qa: {
    title: "UI/UX QA Verification (Frontend Changes)",
    description:
      "After any implementation that touches frontend UI — new components, layout changes, interaction updates — run this QA process before declaring work done. Uses existing testing infrastructure: Vitest, Playwright, Storybook, Lighthouse.",
    steps: [
      {
        step: 1,
        name: "Component Verification",
        description:
          "Run component tests for changed files. Check for React render errors, missing props, broken imports.",
        tools: ["run_closed_loop"],
        action:
          "Run `npm run test:run` to execute Vitest component tests. Run compile + lint + test closed loop. FAIL if any component test fails.",
      },
      {
        step: 2,
        name: "Visual & Layout QA",
        description:
          "Capture screenshots at 3 breakpoints (375px mobile, 768px tablet, 1280px desktop) using capture_responsive_suite. Verify visual consistency with adjacent components. Run Storybook to check component in isolation.",
        tools: ["capture_responsive_suite", "capture_ui_screenshot", "get_gate_preset"],
        action:
          'Call capture_responsive_suite(url, label) to screenshot at mobile/tablet/desktop. Visually inspect each capture. Run `npm run storybook` for isolated view. Call get_gate_preset("ui_ux_qa") for the full rule checklist.',
      },
      {
        step: 3,
        name: "Accessibility Audit",
        description:
          "Verify keyboard navigation (Tab order, Enter/Space activation). Check aria-labels on interactive elements. Run Storybook a11y addon panel for automated axe checks. Run Lighthouse accessibility audit.",
        tools: ["run_quality_gate"],
        action:
          "Tab through the changed UI. Check Storybook's Accessibility panel for axe violations. Run `npm run perf:lighthouse` for accessibility score. Record results.",
      },
      {
        step: 4,
        name: "Interaction & State QA",
        description:
          "Test loading states, error states, empty states. Verify form validation and error messages. Check hover/focus/active states on interactive elements.",
        tools: ["log_test_result"],
        action:
          'Manually test each interaction state. Log results with log_test_result(layer: "manual"). FAIL if any async operation lacks loading/error/empty states.',
      },
      {
        step: 5,
        name: "E2E Smoke Test",
        description:
          "Run relevant Playwright tests. If no existing test covers the change, write one. Capture screenshot for visual reference using capture_ui_screenshot.",
        tools: ["log_test_result", "capture_ui_screenshot"],
        action:
          'Run `npm run test:e2e` for Playwright tests. Call capture_ui_screenshot for visual reference of the final state. Log results with log_test_result(layer: "live_e2e"). If no test exists, create one in tests/e2e/.',
      },
      {
        step: 6,
        name: "Record & Gate",
        description:
          "Run the ui_ux_qa quality gate with boolean results for all 8 rules. Record learnings for any UI gotchas discovered.",
        tools: ["run_quality_gate", "record_learning"],
        action:
          'Evaluate all 8 rules from the ui_ux_qa preset. Call run_quality_gate(gateName: "ui_ux_qa", rules: [...]) with your results. Call record_learning for any UI patterns or gotchas discovered.',
      },
    ],
    composesWith:
      "Use after Phase 3 (Implementation) of a verification cycle when the change involves frontend code. The ui_ux_qa gate result feeds into Phase 5 (Self-Verification).",
    commands: {
      component_tests: "npm run test:run",
      e2e_tests: "npm run test:e2e",
      storybook: "npm run storybook",
      lighthouse: "npm run perf:lighthouse",
      bundle_analysis: "npm run perf:bundle",
    },
  },
  agentic_vision: {
    title: "Agentic Vision (AI-Powered Visual Verification)",
    description:
      "Use AI vision models to analyze UI screenshots programmatically. The Discover-Capture-Analyze-Manipulate-Iterate-Gate loop provides automated visual QA that goes beyond what rule-based checks can catch. Gemini with code execution provides the richest analysis (zoom, crop, compute within the model). Falls back to GPT-4o, Claude, or OpenRouter vision.",
    steps: [
      {
        step: 1,
        name: "Discover",
        description:
          "Check what vision capabilities are available in the current environment. API keys and SDKs determine which providers can be used for visual analysis.",
        tools: ["discover_vision_env"],
        action:
          "Call discover_vision_env to see available providers. If none are available, set an API key (GEMINI_API_KEY recommended for agentic vision with code execution).",
      },
      {
        step: 2,
        name: "Capture",
        description:
          "Take screenshots of the UI at relevant viewports. Use capture_responsive_suite for comprehensive coverage or capture_ui_screenshot for a specific viewport.",
        tools: ["capture_ui_screenshot", "capture_responsive_suite"],
        action:
          "Call capture_responsive_suite(url, label) for 3-breakpoint coverage, or capture_ui_screenshot(url) for a single viewport. Both return base64 images inline + console errors.",
      },
      {
        step: 3,
        name: "Analyze",
        description:
          "Send the captured screenshot to a vision model for AI-powered analysis. The model evaluates layout, spacing, typography, color, accessibility, and component states. Gemini with code execution can zoom into regions, measure distances, and annotate issues autonomously.",
        tools: ["analyze_screenshot"],
        action:
          'Call analyze_screenshot(imageBase64) with the base64 data from step 2. Optionally provide a custom prompt for focused analysis (e.g., "Check if the navigation menu is accessible on mobile"). Gemini will use code execution to zoom, crop, and compute.',
      },
      {
        step: 4,
        name: "Manipulate (Optional)",
        description:
          "If the analysis identifies specific regions of concern, crop or annotate the screenshot for deeper inspection or documentation. Crop to isolate a component, annotate to mark issues.",
        tools: ["manipulate_screenshot"],
        action:
          "Call manipulate_screenshot with operation='crop' to extract a region, or operation='annotate' to mark issues with bounding boxes and labels. Feed cropped images back to analyze_screenshot for focused analysis.",
      },
      {
        step: 5,
        name: "Iterate",
        description:
          "If issues were found, fix the code, re-capture, and re-analyze. Repeat until the analysis shows no CRITICAL or HIGH issues. This is the closed loop.",
        tools: ["capture_ui_screenshot", "analyze_screenshot"],
        action:
          "Fix identified issues in code. Re-capture the same URL. Re-analyze. Compare before/after. Continue until the vision model reports clean results.",
      },
      {
        step: 6,
        name: "Gate",
        description:
          "Run the ui_ux_qa quality gate using the vision analysis results to inform your boolean evaluation of each gate rule.",
        tools: ["run_quality_gate", "get_gate_preset", "record_learning"],
        action:
          'Call get_gate_preset("ui_ux_qa") for the 8 rules. Use vision analysis results to evaluate each rule with evidence. Call run_quality_gate with boolean results. Record any visual patterns or gotchas as learnings.',
      },
    ],
    composesWith:
      "Use after capture_ui_screenshot or capture_responsive_suite to add AI-powered analysis. Combines with ui_ux_qa methodology (getMethodology('ui_ux_qa')) for comprehensive frontend verification.",
    providerPriority: {
      gemini:
        "Best choice. Code execution enables agentic vision — model can zoom, crop, measure, annotate within its reasoning loop. Set GEMINI_API_KEY.",
      openai:
        "GPT-4o provides strong vision analysis without code execution. Set OPENAI_API_KEY.",
      anthropic:
        "Claude provides detailed text analysis of visual elements. Set ANTHROPIC_API_KEY.",
      openrouter:
        "Routes to various vision models via OpenAI-compatible API. Fallback option. Set OPENROUTER_API_KEY.",
    },
  },
  quality_gates: {
    title: "Quality Gates (Boolean Check Pattern)",
    description:
      "Deterministic pre-action validation using boolean checks. Define rules, evaluate each one, aggregate into pass/fail. Built-in presets: engagement (content quality), code_review (implementation quality), deploy_readiness (pre-deploy checklist), ui_ux_qa (frontend UI/UX verification).",
    steps: [
      {
        step: 1,
        name: "Get Rules",
        description:
          "Use a built-in preset or define custom rules. Each rule has a name, description, and evaluation hint.",
        tools: ["get_gate_preset"],
        action:
          'Call get_gate_preset with "engagement", "code_review", or "deploy_readiness" to get rule definitions.',
      },
      {
        step: 2,
        name: "Evaluate",
        description:
          "Check each rule against your target (content, code, PR). Record boolean pass/fail for each.",
        tools: [],
        action:
          "Evaluate each rule yourself. Note which pass and which fail.",
      },
      {
        step: 3,
        name: "Record Results",
        description:
          "Submit rule results. The tool aggregates score and persists the run.",
        tools: ["run_quality_gate"],
        action:
          "Call run_quality_gate with your boolean results. Review failures.",
      },
      {
        step: 4,
        name: "Track Trends",
        description: "Monitor pass/fail trends over time for each gate.",
        tools: ["get_gate_history"],
        action: "Call get_gate_history to see if quality is improving.",
      },
    ],
  },
  closed_loop: {
    title: "Closed Loop Verification",
    description:
      "Local green loop: compile → lint → test → self-debug. Never present changes to anyone without a full green loop. If any step fails: read logs, hypothesize, fix, restart from the failed step.",
    steps: [
      {
        step: 1,
        name: "Compile",
        description: "Build clean. No errors.",
        action: "Run your build command (tsc, go build, cargo build, etc.)",
      },
      {
        step: 2,
        name: "Lint",
        description: "Style clean. No warnings.",
        action: "Run your linter (eslint, golint, clippy, etc.)",
      },
      {
        step: 3,
        name: "Test",
        description: "Run automated test suites. All must pass.",
        action: "Run your test suite (jest, pytest, go test, etc.)",
      },
      {
        step: 4,
        name: "Self-Debug",
        description:
          "If steps 1-3 fail: read logs, hypothesize root cause, fix, restart loop.",
        action:
          "Analyze failures, implement fix, go back to step 1. Repeat until green.",
      },
    ],
    composesWith:
      "Record the loop result with run_closed_loop. Use as part of Phase 4 in a verification cycle.",
  },
  learnings: {
    title: "Learnings (Persistent Knowledge Base)",
    description:
      "Store edge cases, gotchas, patterns, and regressions discovered during development. Search before starting new work to avoid repeating mistakes. Always record learnings after completing a verification cycle.",
    steps: [
      {
        step: 1,
        name: "Search Before You Start",
        description:
          "Before implementing anything, search for relevant learnings from past work. Use search_all_knowledge for a unified view across learnings, recon findings, and resolved gaps.",
        tools: ["search_learnings", "search_all_knowledge"],
        action:
          'Call search_all_knowledge with what you\'re about to work on (e.g. "convex http routing"). This searches learnings, recon findings, AND resolved gaps in one call.',
      },
      {
        step: 2,
        name: "Record As You Go",
        description:
          "When you discover an edge case, gotcha, or pattern, record it immediately.",
        tools: ["record_learning"],
        action:
          "Call record_learning with key, content, category, and tags.",
      },
      {
        step: 3,
        name: "Browse & Review",
        description:
          "Periodically review the knowledge base to refresh your understanding.",
        tools: ["list_learnings"],
        action:
          "Call list_learnings with a category filter to browse specific types of learnings.",
      },
    ],
    composesWith:
      "Learnings are recorded in Phase 6 of verification cycles. They feed into future Phase 1 context gathering.",
  },
  mandatory_flywheel: {
    title: "Mandatory AI Flywheel Testing (Minimum 6 Steps)",
    description:
      "After any non-trivial code change, feature addition, or bug fix, this verification process MUST be run before declaring work done. This is not optional. It catches production bugs that smoke tests miss.",
    steps: [
      {
        step: 1,
        name: "Static Analysis",
        description:
          "Type checking must pass with zero errors. tsc --noEmit, convex dev --once --typecheck=enable, or your stack's equivalent.",
        action: "Run all static analysis tools. Must be completely green.",
      },
      {
        step: 2,
        name: "Happy-Path Test",
        description:
          "Run the changed functionality with valid inputs and confirm expected output.",
        action:
          "Execute the main use case with known-good inputs. Verify output matches expectations exactly.",
      },
      {
        step: 3,
        name: "Failure-Path Test",
        description:
          "Test each failure mode the code is supposed to handle: invalid inputs, edge cases, error states.",
        action:
          "Send bad inputs, trigger error paths, test boundary conditions. Ensure errors are handled, not swallowed silently.",
      },
      {
        step: 4,
        name: "Gap Analysis",
        description:
          "Review code for dead code, unused variables, missing integrations, or logic that doesn't match stated intent.",
        action:
          "Read the implementation line-by-line. Look for: data fetched but never used, conditionals always true/false, missing error handling, incomplete features.",
      },
      {
        step: 5,
        name: "Fix and Re-Verify",
        description:
          "If any gap is found, fix it and re-run steps 1-3 FROM SCRATCH. Don't just re-run the failed step.",
        action:
          "Fix the gap, then restart from step 1. The full re-run catches cascading issues the fix might introduce.",
      },
      {
        step: 6,
        name: "Deploy and Document",
        description:
          "Deploy the verified fix. Document any gaps found and how they were resolved.",
        tools: ["record_learning"],
        action:
          "Deploy to production. Call record_learning for each gap discovered during this process.",
      },
    ],
    whenToSkip:
      "Only skip for trivial changes where blast radius is near zero: typo fixes, comment updates, config tweaks with no code execution impact. All other changes require all 6 steps.",
    realWorldExample: {
      title: "The Variety Check Dead-Code Bug",
      description:
        "The first deployment of the pre-post verification pipeline had a bug where the variety check fetched scheduled queue items but never actually compared entities against them (dead code). This was only caught because the flywheel process was run after the initial 'it works' smoke tests. Without it, the bug would have gone to production silently.",
      lesson:
        "Smoke tests show 'it runs' but not 'it works correctly'. Step 4 (Gap Analysis) catches logic bugs that type systems and basic tests miss. Step 5 (Fix and Re-Verify from scratch) catches cascading issues.",
    },
    tools: ["run_mandatory_flywheel"],
  },
  reconnaissance: {
    title: "Reconnaissance & Research (Structured Phase 1 Context Gathering)",
    description:
      "Before implementing or fixing anything, gather comprehensive context about BOTH external sources (latest SDK versions, API changes, known issues) AND internal context (existing codebase patterns, project architecture, team conventions). Structure this research as a trackable recon session.",
    steps: [
      {
        step: 1,
        name: "Start Recon Session",
        description:
          "Define what you're researching and why. Provide project context (tech stack, versions, architecture) for holistic analysis.",
        tools: ["run_recon"],
        action:
          "Call run_recon with target, description, and projectContext. If project context is unknown, the tool will suggest questions to ask.",
      },
      {
        step: 2,
        name: "Check Framework Sources",
        description:
          "Use pre-built source checklists for known ecosystems: anthropic, langchain, openai, google, mcp.",
        tools: ["check_framework_updates"],
        action:
          "Call check_framework_updates for each relevant ecosystem. Visit each source URL systematically.",
      },
      {
        step: 3,
        name: "Visit Sources & Record Findings",
        description:
          "Check each source systematically. Record EVERY relevant finding — both from external sources and from the existing codebase.",
        tools: ["log_recon_finding"],
        action:
          "For each discovery: call log_recon_finding. Categories: breaking_change, new_feature, deprecation, best_practice, dataset, benchmark, codebase_pattern, existing_implementation.",
      },
      {
        step: 4,
        name: "Aggregate & Prioritize",
        description:
          "Review all findings grouped by category. Prioritize: breaking changes > deprecations > existing implementations > new features.",
        tools: ["get_recon_summary", "search_all_knowledge"],
        action:
          "Call get_recon_summary with completeSession=true. Use search_all_knowledge to cross-reference with past learnings and resolved gaps. Use prioritized action items to inform gap analysis.",
      },
    ],
    composesWith:
      "Use at the start of Phase 1 (Context Gathering) in a verification cycle. Findings inform Phase 2 (Gap Analysis). Also call search_learnings to check past findings.",
    categories: {
      breaking_change: "Requires immediate action before deploying",
      deprecation: "Plan migration path, may break in future",
      new_feature: "Potential improvements or capabilities to leverage",
      best_practice: "Recommended patterns or approaches",
      dataset: "Useful datasets or benchmarks for evaluation",
      benchmark: "Performance or quality baselines to evaluate against",
      codebase_pattern: "Existing patterns in the project codebase",
      existing_implementation:
        "Code that already handles part of what you're building",
    },
  },
  project_ideation: {
    title: "Project Ideation & Validation Process",
    description:
      "Structured approach for validating project concepts before development. Captures requirements, constraints, success metrics, and competitive analysis. Use this before starting any new project or major feature.",
    steps: [
      {
        phase: 1,
        name: "Define Concept",
        description:
          "Define the problem, target users, and core value proposition. Search existing knowledge for similar past projects.",
        tools: ["record_learning", "search_all_knowledge"],
        action:
          "Document the problem statement and why it matters. Call search_all_knowledge to check for similar past projects or relevant learnings.",
      },
      {
        phase: 2,
        name: "Research Market",
        description:
          "Validate demand, find prior art, and understand the competitive landscape.",
        tools: ["web_search", "search_github", "research_job_market"],
        action:
          "Use web_search for market research. Call search_github to find similar projects. Use research_job_market to understand skill demand.",
      },
      {
        phase: 3,
        name: "Analyze Competition",
        description:
          "Study competitor implementations, understand patterns, and identify differentiation opportunities.",
        tools: ["fetch_url", "analyze_repo"],
        action:
          "Use fetch_url to read competitor docs. Call analyze_repo to understand their tech stack and patterns. Note what to adopt vs. differentiate.",
      },
      {
        phase: 4,
        name: "Define Requirements",
        description:
          "List functional and non-functional requirements with priority and rationale.",
        tools: ["log_recon_finding", "update_agents_md"],
        action:
          "Record each requirement with log_recon_finding. Update AGENTS.md with project requirements using update_agents_md.",
      },
      {
        phase: 5,
        name: "Plan Metrics",
        description:
          "Define measurable success criteria and create baseline eval test cases.",
        tools: ["start_eval_run"],
        action:
          "Create eval test cases that represent success. Call start_eval_run with initial baseline cases.",
      },
      {
        phase: 6,
        name: "Gate Approval",
        description:
          "Document findings, run quality gate, and mark project as ready or needs rework.",
        tools: ["run_quality_gate", "record_learning"],
        action:
          "Call run_quality_gate with ideation rules. Record key decisions with record_learning. Mark project as approved or needs iteration.",
      },
    ],
    composesWith:
      "Phase 1 (Concept) informs verification cycle planning. Success metrics feed directly into eval batches. Requirements inform AGENTS.md documentation.",
  },
  tech_stack_2026: {
    title: "Tech Stack & Dependency Management (2026)",
    description:
      "Systematic approach to evaluating, documenting, and maintaining technology choices. Ensures alignment with project goals and minimizes tech debt. Run periodically or when considering new dependencies.",
    steps: [
      {
        step: 1,
        name: "Inventory Current Stack",
        description:
          "Document all frameworks, libraries, and tools in use with versions and purposes.",
        tools: ["record_learning", "search_all_knowledge", "setup_local_env"],
        action:
          "Call setup_local_env to detect current environment. List every dependency with version, purpose, and maintenance status. Use search_all_knowledge to find past tech decisions.",
      },
      {
        step: 2,
        name: "Evaluate Against Goals",
        description:
          "Compare each component against current project requirements. Check for updates and breaking changes.",
        tools: ["check_framework_updates", "web_search"],
        action:
          "For each major dependency, call check_framework_updates for known ecosystems. Use web_search for latest release notes and migration guides.",
      },
      {
        step: 3,
        name: "Research Alternatives",
        description:
          "Research newer or better-suited alternatives. Compare features, community, performance.",
        tools: ["search_github", "analyze_repo", "fetch_url"],
        action:
          "Use search_github to find promising alternatives. Call analyze_repo to understand their architecture. Use fetch_url to read their documentation.",
      },
      {
        step: 4,
        name: "Plan Migrations",
        description:
          "For each desired change, outline migration steps and risk assessment.",
        tools: ["log_gap"],
        action:
          "Log each migration as a gap with complexity and risk level. Prioritize: breaking changes > critical perf gains > nice-to-haves.",
      },
      {
        step: 5,
        name: "Document Rationale",
        description:
          "Record why each tech choice was made and when to reconsider.",
        tools: ["record_learning", "update_agents_md"],
        action:
          "Call record_learning with decision rationale, trade-offs, and review frequency. Update AGENTS.md Tech Stack section with update_agents_md.",
      },
    ],
    composesWith:
      "Migrations discovered become verification cycles. Findings inform agentic vision setup (provider choices). Updates feed into AGENTS.md maintenance.",
  },
  telemetry_setup: {
    title: "Telemetry & Instrumentation Setup",
    description:
      "Establish observability for system behavior, performance, and quality metrics. Build dashboards and alerting for early problem detection.",
    steps: [
      {
        step: 1,
        name: "Define Metrics & Signals",
        description:
          "Identify what to measure: latency, errors, quality scores, user actions.",
        tools: ["record_learning"],
        action:
          "Document each metric's purpose, collection method, and alerting thresholds. Call record_learning to persist the instrumentation plan.",
      },
      {
        step: 2,
        name: "Instrument Code",
        description:
          "Add logging, tracing, and metric collection to key functions.",
        tools: ["log_test_result"],
        action:
          "Add telemetry calls at phase boundaries. Use log_test_result to capture execution metrics during development.",
      },
      {
        step: 3,
        name: "Aggregate & Visualize",
        description:
          "Set up dashboards and queries to view metric trends.",
        action:
          "Build dashboards in your observability tool (DataDog, Prometheus, CloudWatch). Include: pass rates, cycle times, tool latencies.",
      },
      {
        step: 4,
        name: "Define Alerts & SLOs",
        description:
          "Create alert rules and service-level objectives.",
        action:
          "Set alert thresholds for critical metrics. Define SLOs: eval pass rate >95%, verification cycle time <4 hours.",
      },
      {
        step: 5,
        name: "Review & Adjust",
        description:
          "Periodically review telemetry to catch patterns and adjust thresholds.",
        tools: ["search_learnings", "get_gate_history", "list_eval_runs"],
        action:
          "Weekly review of metric trends. Use get_gate_history and list_eval_runs as data sources. Adjust thresholds as system matures.",
      },
    ],
    composesWith:
      "Telemetry data enriches verification and eval outputs. Use get_gate_history and list_eval_runs as dashboard data sources.",
  },
  agents_md_maintenance: {
    title: "AGENTS.md Documentation Maintenance",
    description:
      "Keep AGENTS.md synchronized with actual agent implementations, tool updates, and deployment procedures. Single source of truth for agent setup and troubleshooting.",
    steps: [
      {
        step: 1,
        name: "Audit Current Documentation",
        description:
          "Review AGENTS.md against actual implementations. Flag mismatches.",
        tools: ["update_agents_md", "search_all_knowledge"],
        action:
          'Call update_agents_md({ operation: "read" }) to see current sections. Compare against actual code. Use search_all_knowledge to find recent learnings.',
      },
      {
        step: 2,
        name: "Identify Changes",
        description:
          "List all recent code changes that impact agent setup or deployment.",
        tools: ["search_github", "setup_local_env"],
        action:
          "Call setup_local_env to check current environment. Use search_github to find recent changes in relevant repos. Note new tools, changed schemas, breaking changes.",
      },
      {
        step: 3,
        name: "Update Sections",
        description:
          "Sync AGENTS.md sections: tool catalog, setup steps, environment variables.",
        tools: ["update_agents_md", "record_learning"],
        action:
          'Call update_agents_md({ operation: "update_section", section: "...", content: "..." }) for each outdated section. Record gotchas with record_learning.',
      },
      {
        step: 4,
        name: "Verify with Real Setup",
        description:
          "Test setup steps on a clean machine or CI environment.",
        tools: ["run_closed_loop"],
        action:
          "Follow AGENTS.md steps exactly. Run run_closed_loop to verify build/test pass. If failures, update docs or fix the process.",
      },
      {
        step: 5,
        name: "Version & Schedule",
        description:
          "Document when AGENTS.md was last updated. Schedule periodic reviews.",
        tools: ["record_learning"],
        action:
          'Add timestamp header to AGENTS.md. Call record_learning with category "documentation" to schedule monthly review.',
      },
    ],
    composesWith:
      "AGENTS.md is the source of truth for Phase 1 context gathering. Keep in sync with actual implementations and tool changes.",
  },
  agent_bootstrap: {
    title: "Agent Self-Bootstrap & Triple Verification System",
    description:
      "Comprehensive system for agents to self-discover infrastructure, run triple verification with authoritative sources, self-implement missing components, and generate their own instructions. Based on patterns from Anthropic, OpenAI, LangChain, and OpenClaw.",
    steps: [
      {
        step: 1,
        name: "Discover Existing Infrastructure",
        description:
          "Scan codebase for existing agent patterns: agent_loop, telemetry, evaluation, verification, multi_channel, self_learning, governance.",
        tools: ["discover_infrastructure"],
        action:
          'Call discover_infrastructure to see what exists and what\'s missing. Returns bootstrap plan for missing components.',
      },
      {
        step: 2,
        name: "Triple Verification",
        description:
          "Run 3-layer verification: V1 internal codebase analysis, V2 external authoritative source validation (Anthropic, OpenAI, LangChain docs), V3 synthesis with source citations.",
        tools: ["triple_verify"],
        action:
          'Call triple_verify(target, scope="full", includeWebSearch=true). Gets authoritative sources from tier1 (Anthropic, OpenAI, LangChain, MCP spec) and tier2 (community best practices).',
      },
      {
        step: 3,
        name: "Self-Implement Missing Components",
        description:
          "Bootstrap missing infrastructure using production-ready templates: agent loops, telemetry, eval harness, governance.",
        tools: ["self_implement"],
        action:
          'Call self_implement(component, dryRun=true) to preview. Then dryRun=false to create files. Supports: agent_loop, telemetry, evaluation, verification, multi_channel, self_learning, governance.',
      },
      {
        step: 4,
        name: "Generate Self-Instructions",
        description:
          "Create agent instructions in various formats that persist across sessions.",
        tools: ["generate_self_instructions"],
        action:
          'Call generate_self_instructions with format: "skills_md" (SKILL.md), "rules_md" (RULES.md), "guidelines", or "claude_md" (CLAUDE.md). Includes authoritative source citations.',
      },
      {
        step: 5,
        name: "Connect Information Channels",
        description:
          "Aggressive multi-channel information gathering: slack, telegram, discord, email, web, github, docs.",
        tools: ["connect_channels"],
        action:
          'Call connect_channels with query and channels array. Set aggressive=true to also check calendars, meeting notes, PR comments.',
      },
    ],
    authoritativeSources: {
      tier1_authoritative: [
        "https://www.anthropic.com/research/building-effective-agents",
        "https://openai.github.io/openai-agents-python/",
        "https://www.langchain.com/langgraph",
        "https://modelcontextprotocol.io/specification/2025-11-25",
      ],
      tier2_reliable: [
        "https://github.com/openclaw/openclaw",
        "https://developers.cloudflare.com/agents/",
        "https://opentelemetry.io/blog/2025/ai-agent-observability/",
      ],
    },
    composesWith:
      "Use after discover_infrastructure to bootstrap missing pieces. Run triple_verify before any deployment. Generate self-instructions to persist learnings across sessions.",
  },
  autonomous_maintenance: {
    title: "Autonomous Self-Maintenance & Risk-Tiered Execution",
    description:
      "Aggressive autonomous self-management with risk-aware execution. Implements 're-update before create' pattern, Ralph Wiggum stop-hooks, and OpenClaw directory scaffolding. Ensures agents proactively maintain infrastructure without destructive accidents.",
    steps: [
      {
        step: 1,
        name: "Assess Risk Before Action",
        description:
          "Before any non-trivial action, assess its risk tier. Low-risk actions auto-approve, medium-risk log and proceed, high-risk require confirmation.",
        tools: ["assess_risk"],
        action:
          'Call assess_risk(action) before executing. Follow recommendation: auto_approve → proceed, log_and_proceed → log then proceed, require_confirmation → stop and ask.',
      },
      {
        step: 2,
        name: "Re-Update Before Create",
        description:
          "Before creating any new file (especially instructions/documentation), check if updating an existing file is better. Prevents file sprawl and maintains single source of truth.",
        tools: ["decide_re_update"],
        action:
          'Call decide_re_update({ targetContent, contentType, existingFiles }). Follow recommendation: update_existing → edit that file, create_new → proceed with new file, merge → add to appropriate section.',
      },
      {
        step: 3,
        name: "Run Self-Maintenance Cycle",
        description:
          "Periodic self-checks: TypeScript compilation, documentation sync, tool count validation, test coverage, dependency freshness.",
        tools: ["run_self_maintenance"],
        action:
          'Call run_self_maintenance({ scope: "standard" }) regularly. Use scope="thorough" weekly. Set autoFix=true for low-risk auto-corrections.',
      },
      {
        step: 4,
        name: "Scaffold with OpenClaw Patterns",
        description:
          "When adding new infrastructure, use standardized directory scaffolding. Creates organized subdirectories with proper test structure.",
        tools: ["scaffold_directory"],
        action:
          'Call scaffold_directory({ component, dryRun: true }) to preview. Then dryRun=false to create. Follow with self_implement for code templates.',
      },
      {
        step: 5,
        name: "Autonomous Loop with Guardrails",
        description:
          "For multi-step autonomous tasks, use controlled loops with iteration limits, timeouts, and checkpoint saves.",
        tools: ["run_autonomous_loop"],
        action:
          'Call run_autonomous_loop({ goal, maxIterations: 5, maxDurationMs: 60000, stopOnFirstFailure: true }). Review results before proceeding to next phase.',
      },
    ],
    riskTiers: {
      low: "Reading, analyzing, searching, creating temp files — auto-approve",
      medium: "Writing local files, running tests, creating branches — log and proceed",
      high: "Pushing to remote, posting externally, deleting, modifying production — require confirmation",
    },
    patterns: {
      ralph_wiggum: "Stop-hooks prevent runaway autonomous loops. Always set maxIterations and maxDurationMs.",
      re_update_before_create: "Check if existing files should be updated rather than creating new ones. Maintains single source of truth.",
      openclaw_scaffolding: "Standardized directory structure with convex/domains/{component}/ pattern.",
    },
    composesWith:
      "Use alongside agent_bootstrap for complete autonomous infrastructure setup. Feeds into triple_verify for validation.",
  },
  parallel_agent_teams: {
    title: "Parallel Agent Teams — Multi-Agent Coordination",
    description:
      'Based on Anthropic\'s "Building a C Compiler with Parallel Claudes" (Feb 2026). Patterns for running multiple AI agents in parallel on a shared codebase: task locking to prevent duplicate work, role specialization, context window budget management, oracle-based testing, and progress tracking for fresh agent sessions. Reference: https://www.anthropic.com/engineering/building-c-compiler',
    steps: [
      {
        step: 1,
        name: "Orient — Check Parallel Status",
        description:
          "Every new agent session starts by checking what other agents are doing. Avoid duplicate work. Review blocked tasks that need fresh eyes.",
        tools: ["get_parallel_status", "list_agent_tasks"],
        action:
          "Call get_parallel_status to see active tasks, roles, failed oracle tests, and context budgets. Then call list_agent_tasks to see what's claimed.",
      },
      {
        step: 2,
        name: "Assign Role — Specialize",
        description:
          "Assign yourself a role. Specialization enables parallelism: implementer, dedup_reviewer, performance_optimizer, documentation_maintainer, code_quality_critic, test_writer, security_auditor.",
        tools: ["assign_agent_role", "get_agent_role"],
        action:
          'Call assign_agent_role({ role: "implementer", focusArea: "auth module" }). Each parallel agent should have a different role or focus area.',
      },
      {
        step: 3,
        name: "Claim Task — Lock Before Working",
        description:
          "Claim a task lock before starting work. This prevents two agents from solving the same problem. If another agent already claimed the task, pick a different one.",
        tools: ["claim_agent_task"],
        action:
          'Call claim_agent_task({ taskKey: "fix_auth_middleware", description: "Fix JWT validation" }). If conflict, pick another task.',
      },
      {
        step: 4,
        name: "Work — Monitor Context Budget",
        description:
          "Work on the task. Track context window usage to prevent pollution. Pre-compute summaries instead of dumping raw output. Log errors with ERROR prefix on same line for easy grep.",
        tools: ["log_context_budget"],
        action:
          "After reading large files or receiving large test output, call log_context_budget to track usage. Heed warnings about approaching limits.",
      },
      {
        step: 5,
        name: "Validate — Oracle Comparison",
        description:
          "Compare your output against a known-good reference (oracle). The oracle pattern enables parallel debugging: each failing comparison can be assigned to a different agent.",
        tools: ["run_oracle_comparison"],
        action:
          'Call run_oracle_comparison({ testLabel: "api_output", actualOutput: "...", expectedOutput: "...", oracleSource: "production_v2" }). Fix differences before committing.',
      },
      {
        step: 6,
        name: "Release — Handoff to Next Agent",
        description:
          "Release the task lock with a progress note. If blocked, mark as blocked so another agent can pick it up with context about what was tried.",
        tools: ["release_agent_task"],
        action:
          'Call release_agent_task({ taskKey: "fix_auth_middleware", status: "completed", progressNote: "Fixed JWT validation, added tests" }).',
      },
    ],
    keyPatterns: {
      task_locking:
        "File-based locks in Anthropic's implementation; SQLite-based locks in NodeBench. Prevents duplicate work when agents run in parallel.",
      role_specialization:
        "Different agents for different concerns: one implements features, one deduplicates code, one optimizes performance, one maintains docs, one reviews code quality.",
      context_pollution_prevention:
        "Test harnesses should NOT print thousands of useless bytes. Pre-compute summaries, use --fast sampling for large suites, log details to files.",
      time_blindness_mitigation:
        "Agents can't tell time. Print incremental progress infrequently. Include --fast option for 1-10% random sample of tests.",
      oracle_testing:
        "Use a known-good reference as an oracle. Compare outputs to identify which specific components are broken. Enables parallel debugging.",
      progress_files:
        "Maintain running docs of status, failed approaches, and remaining tasks. Fresh agent sessions read these to orient themselves.",
      bootstrap_external_repos:
        "When connected to another project that lacks parallel agent capabilities, use bootstrap_parallel_agents to auto-detect gaps and scaffold infrastructure. The tool scans 7 categories (task coordination, roles, oracle, context budget, progress files, AGENTS.md parallel section, git worktrees) and generates ready-to-use files. Follow the AI Flywheel closed loop: detect → scaffold → verify → fix → document.",
    },
    bootstrapForExternalRepos: {
      description:
        "When nodebench-mcp detects that a target project repo does not have parallel agent infrastructure, it can automatically bootstrap it using the AI Flywheel closed loop.",
      steps: [
        "1. DETECT: Call bootstrap_parallel_agents({ projectRoot: '/path/to/their/repo', dryRun: true }) — scans 7 categories and returns gap report",
        "2. SCAFFOLD: Call bootstrap_parallel_agents({ projectRoot: '...', dryRun: false, techStack: 'TypeScript/React' }) — creates .parallel-agents/ dir, progress.md, roles.json, lock dirs, oracle dirs",
        "3. AGENTS.MD: Call generate_parallel_agents_md({ techStack: '...', projectName: '...', maxAgents: 4 }) — generates portable AGENTS.md section, paste into their repo",
        "4. VERIFY: Run the 6-step flywheel plan returned by bootstrap_parallel_agents — static analysis, happy path, conflict test, oracle test, gap re-scan, document",
        "5. FIX: If any flywheel step fails, fix and re-verify from step 1",
        "6. DOCUMENT: Call record_learning with patterns discovered during bootstrap",
      ],
    },
    authoritativeSource:
      "https://www.anthropic.com/engineering/building-c-compiler",
    composesWith:
      "Works with verification cycles (each agent runs its own), eval runs (aggregate across agents), and learnings (shared knowledge base). Task claims compose with the mandatory flywheel. bootstrap_parallel_agents works on ANY project directory — not just nodebench.",
  },
  self_reinforced_learning: {
    title: "Self-Reinforced Learning Loop",
    description:
      "Continuous self-improvement cycle for agents using the MCP. Tool calls are now auto-instrumented — every call is automatically logged with timing and status. The loop: Use tools → Auto-log → Analyze trajectories → Find gaps → Clean stale data → Synthesize recon → Recommend improvements → Apply → Re-analyze. Over time, the system gets smarter about the project's specific development patterns.",
    steps: [
      {
        step: 1,
        name: "Instrument",
        description:
          "Log tool calls during your workflow. Call log_tool_call after each tool invocation to record timing, status, and phase context.",
        tools: ["log_tool_call"],
        action:
          "After each tool call, call log_tool_call({ sessionId, toolName, durationMs, resultStatus, phase }). Group related calls under the same sessionId.",
      },
      {
        step: 2,
        name: "Analyze Trajectories",
        description:
          "Review tool usage patterns across sessions. Identify frequently used tools, error-prone tools, and sequential patterns (tool A always followed by tool B).",
        tools: ["get_trajectory_analysis"],
        action:
          "Call get_trajectory_analysis periodically or after a session completes. Review topTools, topPatterns, and errorProneTools.",
      },
      {
        step: 3,
        name: "Self-Evaluate",
        description:
          "Cross-reference all persisted data for a comprehensive health assessment. Check verification completion rates, gap resolution, eval trends, and knowledge growth.",
        tools: ["get_self_eval_report"],
        action:
          "Call get_self_eval_report to get the healthScore and grade. Focus on areas with low scores.",
      },
      {
        step: 4,
        name: "Get Recommendations",
        description:
          "Surface actionable improvements based on accumulated data. The system detects unused tools, missing quality gates, knowledge gaps, and process bottlenecks.",
        tools: ["get_improvement_recommendations"],
        action:
          "Call get_improvement_recommendations. Address high-priority items first. Record learnings for each fix.",
      },
      {
        step: 5,
        name: "Clean & Synthesize",
        description:
          "Clean up stale runs and synthesize recon findings into learnings. Orphaned eval runs and stale gaps skew health scores. Recon findings are ephemeral — convert them into searchable learnings.",
        tools: ["cleanup_stale_runs", "synthesize_recon_to_learnings"],
        action:
          "Call cleanup_stale_runs(dryRun=true) to preview, then dryRun=false to clean. Call synthesize_recon_to_learnings(dryRun=true) to preview conversions, then dryRun=false.",
      },
      {
        step: 6,
        name: "Apply & Re-Analyze",
        description:
          "Implement the top recommendations, then re-run the analysis to verify improvement. This closes the loop and makes the system progressively smarter.",
        tools: ["record_learning", "get_self_eval_report"],
        action:
          "Apply fixes, call record_learning for each insight, then re-run get_self_eval_report. Compare health scores before and after.",
      },
    ],
    composesWith:
      "Feeds into the AI Flywheel outer loop. Trajectory analysis informs eval case design. Recommendations trigger verification cycles. Learnings persist across sessions.",
  },
  overview: {
    title: "NodeBench Development Methodology — Overview",
    description:
      "A dual-loop system for rigorous development. The inner loop (6-Phase Verification) ensures correctness. The outer loop (Eval-Driven Development) ensures improvement. Together they form the AI Flywheel.",
    steps: [
      {
        name: "Start here",
        description:
          "Call getMethodology with a specific topic to get detailed guidance.",
        topics: {
          verification:
            "6-Phase Verification — systematic correctness checking",
          eval: "Eval-Driven Development — measure improvement objectively",
          flywheel:
            "AI Flywheel — how the two loops compose and reinforce each other",
          mandatory_flywheel:
            "Mandatory Flywheel — 6-step minimum verification before declaring work done",
          reconnaissance:
            "Reconnaissance — structured research and context gathering for Phase 1",
          quality_gates:
            "Quality Gates — boolean check validation pattern",
          ui_ux_qa:
            "UI/UX QA — frontend verification after UI implementations",
          agentic_vision:
            "Agentic Vision — AI-powered visual verification using vision models (Gemini code execution, GPT-4o, Claude)",
          closed_loop:
            "Closed Loop — compile/lint/test/debug before presenting work",
          learnings:
            "Learnings — persistent knowledge base to prevent repeating mistakes",
          project_ideation:
            "Project Ideation — validate concepts before development with market research and competitive analysis",
          tech_stack_2026:
            "Tech Stack Management — evaluate and maintain technology choices for 2026",
          telemetry_setup:
            "Telemetry Setup — observability, instrumentation, and early problem detection",
          agents_md_maintenance:
            "AGENTS.md Maintenance — keep documentation synchronized with implementations",
          agent_bootstrap:
            "Agent Bootstrap — self-discover infrastructure, triple verification with authoritative sources, self-implement missing components",
          autonomous_maintenance:
            "Autonomous Maintenance — risk-tiered execution, re-update before create, self-maintenance cycles, OpenClaw scaffolding, Ralph Wiggum loops",
          parallel_agent_teams:
            "Parallel Agent Teams — task locking, role specialization, context budget management, oracle testing. Based on Anthropic's 'Building a C Compiler with Parallel Claudes' (Feb 2026)",
          self_reinforced_learning:
            "Self-Reinforced Learning — auto-instrumented trajectory analysis, self-evaluation reports, improvement recommendations, stale run cleanup, recon synthesis, closed-loop optimization",
        },
      },
      {
        name: "Quick start for first-time setup",
        sequence: [
          "1. bootstrap_project — Register your project (tech stack, architecture, conventions)",
          '2. getMethodology("overview") — See all available methodologies',
          "3. search_all_knowledge — Check if the knowledge base has relevant past findings",
        ],
      },
      {
        name: "Quick start for a new feature",
        sequence: [
          "1. search_all_knowledge — Check learnings, recon findings, and resolved gaps",
          "2. start_verification_cycle — Begin 6-phase process",
          "3. Follow phases 1-6 (guided by tool responses)",
          "4. record_learning — Capture what you discovered",
          "5. promote_to_eval — Turn findings into eval cases",
          "6. start_eval_run + compare_eval_runs — Verify improvement",
        ],
      },
      {
        name: "Quick start for checking quality",
        sequence: [
          "1. get_gate_preset — Get rules for your context",
          "2. Evaluate each rule",
          "3. run_quality_gate — Record results",
          "4. run_closed_loop — Ensure compile/lint/test pass",
        ],
      },
    ],
  },
};

export function createMetaTools(allTools: McpTool[]): McpTool[] {
  return [
    {
      name: "findTools",
      description:
        "Search available methodology tools by keyword or capability description. Returns matching tool names and descriptions. Use this to discover which tools are available for a task.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              'What you want to do (e.g. "verify implementation", "track quality", "record edge case")',
          },
          category: {
            type: "string",
            enum: [
              "verification",
              "eval",
              "quality_gate",
              "learning",
              "flywheel",
              "reconnaissance",
              "ui_capture",
              "vision",
              "web",
              "github",
              "documentation",
              "bootstrap",
              "self_eval",
              "parallel_agents",
              "meta",
            ],
            description: "Filter by tool category (optional)",
          },
        },
        required: ["query"],
      },
      handler: async (args) => {
        const query = (args.query ?? "").toLowerCase();
        const category = args.category;

        // Category mapping
        const categoryMap: Record<string, string[]> = {
          verification: [
            "start_verification_cycle",
            "log_phase_findings",
            "log_gap",
            "resolve_gap",
            "log_test_result",
            "get_verification_status",
            "list_verification_cycles",
          ],
          eval: [
            "start_eval_run",
            "record_eval_result",
            "complete_eval_run",
            "compare_eval_runs",
            "list_eval_runs",
          ],
          quality_gate: [
            "run_quality_gate",
            "get_gate_preset",
            "get_gate_history",
            "run_closed_loop",
          ],
          learning: [
            "record_learning",
            "search_learnings",
            "list_learnings",
            "delete_learning",
          ],
          flywheel: [
            "get_flywheel_status",
            "promote_to_eval",
            "trigger_investigation",
            "run_mandatory_flywheel",
          ],
          reconnaissance: [
            "run_recon",
            "log_recon_finding",
            "get_recon_summary",
            "check_framework_updates",
            "search_all_knowledge",
            "bootstrap_project",
            "get_project_context",
          ],
          ui_capture: [
            "capture_ui_screenshot",
            "capture_responsive_suite",
          ],
          vision: [
            "discover_vision_env",
            "analyze_screenshot",
            "manipulate_screenshot",
          ],
          web: [
            "web_search",
            "fetch_url",
          ],
          github: [
            "search_github",
            "analyze_repo",
          ],
          documentation: [
            "update_agents_md",
            "research_job_market",
            "setup_local_env",
          ],
          bootstrap: [
            "discover_infrastructure",
            "triple_verify",
            "self_implement",
            "generate_self_instructions",
            "connect_channels",
            "assess_risk",
            "decide_re_update",
            "run_self_maintenance",
            "scaffold_directory",
            "run_autonomous_loop",
          ],
          self_eval: [
            "log_tool_call",
            "get_trajectory_analysis",
            "get_self_eval_report",
            "get_improvement_recommendations",
            "cleanup_stale_runs",
            "synthesize_recon_to_learnings",
          ],
          parallel_agents: [
            "claim_agent_task",
            "release_agent_task",
            "list_agent_tasks",
            "assign_agent_role",
            "get_agent_role",
            "log_context_budget",
            "run_oracle_comparison",
            "get_parallel_status",
            "bootstrap_parallel_agents",
            "generate_parallel_agents_md",
          ],
          meta: ["findTools", "getMethodology"],
        };

        let candidates = allTools;
        if (category && categoryMap[category]) {
          const names = new Set(categoryMap[category]);
          candidates = allTools.filter((t) => names.has(t.name));
        }

        const matches = candidates.filter((t) => {
          const text = `${t.name} ${t.description}`.toLowerCase();
          return query.split(/\s+/).some((word: string) => text.includes(word));
        });

        return {
          query,
          count: matches.length,
          tools: matches.map((t) => ({
            name: t.name,
            description: t.description,
          })),
        };
      },
    },
    {
      name: "getMethodology",
      description:
        'Get step-by-step guidance for a development methodology. Topics: verification, eval, flywheel, mandatory_flywheel, reconnaissance, quality_gates, ui_ux_qa, agentic_vision, closed_loop, learnings, project_ideation, tech_stack_2026, telemetry_setup, agents_md_maintenance, agent_bootstrap, autonomous_maintenance, parallel_agent_teams, self_reinforced_learning, overview. Call with topic "overview" to see all available methodologies.',
      inputSchema: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: [
              "verification",
              "eval",
              "flywheel",
              "mandatory_flywheel",
              "reconnaissance",
              "quality_gates",
              "ui_ux_qa",
              "agentic_vision",
              "closed_loop",
              "learnings",
              "project_ideation",
              "tech_stack_2026",
              "telemetry_setup",
              "agents_md_maintenance",
              "agent_bootstrap",
              "autonomous_maintenance",
              "parallel_agent_teams",
              "self_reinforced_learning",
              "overview",
            ],
            description: "Which methodology to explain",
          },
        },
        required: ["topic"],
      },
      handler: async (args) => {
        const content = METHODOLOGY_CONTENT[args.topic];
        if (!content)
          throw new Error(
            `Unknown topic: ${args.topic}. Available: ${Object.keys(METHODOLOGY_CONTENT).join(", ")}`
          );

        return content;
      },
    },
  ];
}
