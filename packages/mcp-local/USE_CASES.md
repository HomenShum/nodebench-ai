# NodeBench MCP — Complete Tool Use Cases & Workflow Guide

> Every tool across both presets with exact prompts, workflow chains, and real-world benefits.
> **Default Preset**: 44 tools (8 toolsets) — core AI Flywheel methodology
> **Full Preset**: 175 tools (34 toolsets) — complete coverage for any project type

---

## Table of Contents

- [How to Read This Guide](#how-to-read-this-guide)
- [PART 1: DEFAULT PRESET (44 tools)](#part-1-default-preset-44-tools)
  - [1. verification (8 tools)](#1-verification-8-tools)
  - [2. eval (6 tools)](#2-eval-6-tools)
  - [3. quality_gate (4 tools)](#3-quality_gate-4-tools)
  - [4. learning (4 tools)](#4-learning-4-tools)
  - [5. flywheel (4 tools)](#5-flywheel-4-tools)
  - [6. recon (7 tools)](#6-recon-7-tools)
  - [7. security (3 tools)](#7-security-3-tools)
  - [8. boilerplate (2 tools)](#8-boilerplate-2-tools)
  - [Meta/Discovery (always included, 6 tools)](#metadiscovery-always-included-6-tools)
- [PART 2: FULL PRESET (additional toolsets)](#part-2-full-preset-additional-131-tools-across-26-toolsets)
  - [9. ui_capture (2 tools)](#9-ui_capture-2-tools)
  - [10. vision (4 tools)](#10-vision-4-tools)
  - [11. web (2 tools)](#11-web-2-tools)
  - [12. github (3 tools)](#12-github-3-tools)
  - [13. docs (4 tools)](#13-docs-4-tools)
  - [14. bootstrap (11 tools)](#14-bootstrap-11-tools)
  - [15. self_eval (9 tools)](#15-self_eval-9-tools)
  - [16. parallel (13 tools)](#16-parallel-13-tools)
  - [17. llm (3 tools)](#17-llm-3-tools)
  - [18. platform (4 tools)](#18-platform-4-tools)
  - [19. research_writing (8 tools)](#19-research_writing-8-tools)
  - [20. flicker_detection (5 tools)](#20-flicker_detection-5-tools)
  - [21. figma_flow (4 tools)](#21-figma_flow-4-tools)
  - [22. local_file (18 tools)](#22-local_file-18-tools)
  - [23. benchmark (3 tools)](#23-benchmark-3-tools)
  - [24. session_memory (3 tools)](#24-session_memory-3-tools)
  - [25. gaia_solvers (6 tools)](#25-gaia_solvers-6-tools)
  - [26. toon (2 tools)](#26-toon-2-tools)
  - [27. pattern (2 tools)](#27-pattern-2-tools)
  - [28. git_workflow (3 tools)](#28-git_workflow-3-tools)
  - [29. seo (5 tools)](#29-seo-5-tools)
  - [30. voice_bridge (4 tools)](#30-voice_bridge-4-tools)
  - [31. critter (1 tool)](#31-critter-1-tool)
  - [32. email (4 tools)](#32-email-4-tools)
  - [33. rss (4 tools)](#33-rss-4-tools)
  - [34. architect (3 tools)](#34-architect-3-tools)
- [PART 3: END-TO-END WORKFLOW EXAMPLES](#part-3-end-to-end-workflow-examples)

---

## How to Read This Guide

Each tool entry follows this format:
- **Tool name** — one-line purpose
- **Exact prompt** — copy-paste into your AI agent
- **Workflow chain** — what to call before/after this tool
- **Benefit** — why this tool matters

---

# PART 1: DEFAULT PRESET (44 tools)

These 8 toolsets form the core AI Flywheel methodology. Every project benefits from them.

```
npx nodebench-mcp --preset default
```

---

## 1. verification (8 tools)

The 6-Phase Verification inner loop. Use for any non-trivial change.

### `start_verification_cycle`
Start a new 6-phase verification cycle.

**Prompt:**
```
I'm about to migrate our auth system from JWT to session-based auth.
Start a verification cycle titled "Auth migration: JWT to sessions"
with scope "auth module, middleware, protected routes, token refresh logic".
```

**Chain:** `start_verification_cycle` → `run_recon` → `log_phase_findings` → ...
**Benefit:** Prevents shipping half-baked changes. Forces structured investigation before code.

---

### `log_phase_findings`
Record findings for the current phase and advance.

**Prompt:**
```
Log phase findings for cycle cyc_abc123:
Phase 1 findings:
- The existing JWT middleware is in src/middleware/auth.ts (247 lines)
- 14 routes use requireAuth() middleware
- Token refresh is handled client-side in useAuth hook
- No existing session store infrastructure
Phase passed: true
```

**Chain:** `start_verification_cycle` → **`log_phase_findings`** (repeat per phase) → `get_verification_status`
**Benefit:** Creates an audit trail of what was investigated at each phase.

---

### `log_gap`
Record a gap found during Phase 2 (Gap Analysis).

**Prompt:**
```
Log gap for cycle cyc_abc123:
title: "No session store configured"
severity: HIGH
description: "The app has no Redis/DB session store. Express-session defaults to MemoryStore which leaks memory and doesn't survive restarts."
suggestedFix: "Add connect-redis with ioredis as session store"
```

**Chain:** `log_phase_findings` (Phase 2) → **`log_gap`** (repeat per gap) → `resolve_gap`
**Benefit:** Tracks every gap with severity so nothing falls through the cracks.

---

### `resolve_gap`
Mark a gap as resolved after implementing the fix.

**Prompt:**
```
Resolve gap gap_xyz789:
resolution: "Added connect-redis session store with ioredis.
Config in src/config/session.ts. TTL set to 24h.
Tested with Redis 7.2 locally."
```

**Chain:** `log_gap` → implement fix → **`resolve_gap`** → `get_verification_status`
**Benefit:** Tracks fix completeness. Shows remaining gap counts by severity.

---

### `log_test_result`
Record test results for Phase 4 (Testing & Validation).

**Prompt:**
```
Log test result for cycle cyc_abc123:
layer: "integration"
testName: "Session persistence across restart"
passed: true
output: "Session cookie maintained after server restart. Redis store confirmed via redis-cli KEYS."
```

**Chain:** `resolve_gap` → run tests → **`log_test_result`** (repeat per layer) → `run_closed_loop`
**Benefit:** All 5 test layers (static, unit, integration, manual, live_e2e) must pass before proceeding.

---

### `get_verification_status`
Get current status of a verification cycle.

**Prompt:**
```
Get verification status for cycle cyc_abc123
```

**Chain:** Use anytime during a cycle to check progress.
**Benefit:** Shows exactly where you are, what's done, what's blocking.

---

### `list_verification_cycles`
List all verification cycles.

**Prompt:**
```
List verification cycles with status "completed" from the last 30 days
```

**Chain:** Use at session start to find previous cycles.
**Benefit:** Review past verifications before starting new related work.

---

### `abandon_cycle`
Abandon a stale or orphaned cycle.

**Prompt:**
```
Abandon cycle cyc_old456 with reason "Requirements changed, this migration is no longer needed"
```

**Chain:** Standalone cleanup tool.
**Benefit:** Keeps the cycle list clean. Prevents stale cycles from skewing reports.

---

## 2. eval (6 tools)

The Eval-Driven Development outer loop. No change ships without an eval improvement.

### `start_eval_run`
Define and start a new eval batch.

**Prompt:**
```
Start eval run named "Search relevance v2.1" with test cases:
1. input: "how to reset password", intent: "find password reset flow", expected: "returns password reset page as top result"
2. input: "pricing plans", intent: "find pricing page", expected: "returns /pricing with plan comparison"
3. input: "cancel subscription", intent: "find cancellation flow", expected: "returns account settings with cancel option"
4. input: "react hooks tutorial", intent: "find docs", expected: "returns docs/hooks page, not blog posts"
```

**Chain:** **`start_eval_run`** → execute each case → `record_eval_result` → `complete_eval_run`
**Benefit:** Defines success criteria upfront. No ambiguity about what "works" means.

---

### `record_eval_result`
Record the actual result for a specific eval case.

**Prompt:**
```
Record eval result for run eval_abc, case index 0:
actual: "Returns /auth/reset-password as result #1, /faq as #2"
verdict: "pass"
score: 0.95
judgeNotes: "Correct page ranked first. FAQ result is reasonable secondary."
```

**Chain:** `start_eval_run` → **`record_eval_result`** (repeat per case) → `complete_eval_run`
**Benefit:** Captures granular per-case outcomes for analysis.

---

### `complete_eval_run`
Finalize an eval run and compute aggregate scores.

**Prompt:**
```
Complete eval run eval_abc
```

**Chain:** `record_eval_result` → **`complete_eval_run`** → `compare_eval_runs`
**Benefit:** Returns pass rate, average score, failure patterns, improvement suggestions.

---

### `compare_eval_runs`
Compare two eval runs to decide ship/revert.

**Prompt:**
```
Compare eval runs: baseline eval_v20 vs candidate eval_v21
```

**Chain:** `complete_eval_run` (both) → **`compare_eval_runs`** → ship or revert
**Benefit:** Data-driven deploy decisions. Shows side-by-side scores and a recommendation.

---

### `list_eval_runs`
List recent eval runs with scores.

**Prompt:**
```
List eval runs from the last 14 days, limit 10
```

**Chain:** Use at session start to understand quality trends.
**Benefit:** Tracks quality over time. Detects drift before users notice.

---

### `diff_outputs`
Compare two text or JSON outputs structurally.

**Prompt:**
```
Diff these two API responses:
outputA: {"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}], "total": 2}
outputB: {"users": [{"id": 1, "name": "Alice Chen"}, {"id": 3, "name": "Charlie"}], "total": 2}
```

**Chain:** Standalone comparison tool. Useful inside eval workflows.
**Benefit:** Structured diff with similarity score. Catches regressions in output format.

---

## 3. quality_gate (4 tools)

Boolean check pattern for deterministic pre-action validation.

### `run_quality_gate`
Evaluate content/code against boolean rules.

**Prompt:**
```
Run quality gate "code_review" with rules:
- compiles_clean: true
- no_lint_warnings: true
- tests_pass: true
- no_hardcoded_secrets: true
- error_handling_present: false
- follows_existing_patterns: true
- has_regression_test: false
```

**Chain:** `get_gate_preset` → evaluate each rule → **`run_quality_gate`**
**Benefit:** Deterministic pass/fail. No subjective "looks good to me."

---

### `get_gate_preset`
Get built-in rule sets for common gates.

**Prompt:**
```
Get the gate preset for "engagement" — I need to check my LinkedIn post before publishing.
```

**Chain:** **`get_gate_preset`** → evaluate rules → `run_quality_gate`
**Benefit:** Pre-built rules for engagement, code review, deploy readiness, and UI/UX QA.

---

### `get_gate_history`
View pass/fail trends for a gate over time.

**Prompt:**
```
Get gate history for "code_review" — last 20 runs
```

**Chain:** After multiple gate runs. Use for trend analysis.
**Benefit:** Shows whether quality is improving or regressing.

---

### `run_closed_loop`
Track compile-lint-test-debug iterations.

**Prompt:**
```
Run closed loop with steps:
- compile: passed (tsc --noEmit clean)
- lint: passed (eslint 0 warnings)
- test: failed (2 of 47 tests failing — auth.test.ts)
- self_debug: not run yet
```

**Chain:** Implement change → **`run_closed_loop`** → fix failures → re-run until green
**Benefit:** Never present changes without a full green loop. Prevents shipping broken code.

---

## 4. learning (4 tools)

Persistent knowledge base that grows with every session.

### `record_learning`
Store an edge case, gotcha, or pattern.

**Prompt:**
```
Record learning:
key: "convex-validator-null-return"
category: "gotcha"
tags: ["convex", "validators", "typescript"]
content: "Convex functions that don't explicitly return a value return null, not undefined. Always add returns: v.null() to the validator. Forgetting this causes runtime validator mismatch errors that are hard to debug."
```

**Chain:** End of any verification cycle → **`record_learning`**
**Benefit:** Prevents repeating the same mistakes. Searchable knowledge that persists forever.

---

### `search_learnings` (deprecated — use `search_all_knowledge`)
### `list_learnings` (deprecated — use `search_all_knowledge`)
### `delete_learning`
Remove outdated or incorrect learnings.

**Prompt:**
```
Delete learning with key "old-api-workaround" — the API bug was fixed in v3.2
```

---

## 5. flywheel (4 tools)

Connects the inner (verification) and outer (eval) loops.

### `get_flywheel_status`
See how both loops connect and what's active.

**Prompt:**
```
Get the flywheel status — show me active verification cycles, recent eval trends, and cross-loop connections.
```

**Chain:** Start of session → **`get_flywheel_status`** → decide what to work on
**Benefit:** Single view of your entire quality posture.

---

### `promote_to_eval`
Convert verification findings into eval test cases.

**Prompt:**
```
Promote findings from verification cycle cyc_abc123 to a new eval run.
Convert Phase 4 test results into eval cases and Phase 5 checklists into scoring rubrics.
```

**Chain:** Complete verification → **`promote_to_eval`** → eval run created automatically
**Benefit:** Inner loop feeds outer loop. Every verification makes future evals stronger.

---

### `trigger_investigation`
When eval shows regression, trigger a verification cycle.

**Prompt:**
```
Eval run eval_v22 shows 15% regression in search relevance.
Trigger investigation for the search module.
```

**Chain:** `compare_eval_runs` shows regression → **`trigger_investigation`** → new verification cycle
**Benefit:** Outer loop feeds inner loop. Regressions get systematic investigation.

---

### `run_mandatory_flywheel`
Enforce 6-step verification after any non-trivial change.

**Prompt:**
```
Run mandatory flywheel for change: "Added WebSocket support for real-time notifications"
Compile: passed
Lint: passed
Test: passed (all 52 tests green)
Types: passed
Self-review: passed (no obvious issues)
Commit message: "feat(ws): add WebSocket notification channel with heartbeat"
```

**Chain:** After implementation → **`run_mandatory_flywheel`** → all 6 must pass
**Benefit:** The floor, not the ceiling. Minimum verification before declaring done.

---

## 6. recon (7 tools)

Research and knowledge management.

### `run_recon`
Start a structured research session.

**Prompt:**
```
Run recon for topic "Migrating from Prisma to Drizzle ORM"
focusing on: breaking changes, migration path, query API differences, and performance implications.
Sources to check: Drizzle docs, Prisma migration guide, GitHub issues, community benchmarks.
```

**Chain:** **`run_recon`** → `log_recon_finding` (repeat) → `get_recon_summary`
**Benefit:** Organized research with structured findings. No more scattered notes.

---

### `log_recon_finding`
Record a finding from research.

**Prompt:**
```
Log recon finding for session recon_abc:
category: "breaking_change"
source: "https://orm.drizzle.team/docs/migration"
content: "Drizzle uses $count() instead of Prisma's count(). All aggregate queries need rewriting."
confidence: "high"
```

**Chain:** `run_recon` → **`log_recon_finding`** (repeat) → `get_recon_summary`
**Benefit:** Every finding is categorized, sourced, and confidence-rated.

---

### `get_recon_summary`
Get aggregated summary of all findings.

**Prompt:**
```
Get recon summary for session recon_abc — group by category with prioritized action items.
```

**Chain:** `log_recon_finding` → **`get_recon_summary`** → plan implementation
**Benefit:** Turns scattered research into a prioritized action plan.

---

### `check_framework_updates`
Get a checklist of sources to check for framework updates.

**Prompt:**
```
Check framework updates for "anthropic" — what should I verify before upgrading the SDK?
```

**Chain:** **`check_framework_updates`** → `run_recon` → `log_recon_finding`
**Benefit:** Pre-built source lists for Anthropic, LangChain, OpenAI, Google, MCP.

---

### `search_all_knowledge`
Search ALL accumulated knowledge in one call.

**Prompt:**
```
Search all knowledge for "rate limiting" — check learnings, recon findings, and resolved gaps.
```

**Chain:** Start of any task → **`search_all_knowledge`** → see what's already known
**Benefit:** Unified search across learnings + recon findings + gaps. Prevents re-research.

---

### `bootstrap_project`
Register your project's context for all future sessions.

**Prompt:**
```
Bootstrap project:
projectName: "my-saas-app"
techStack: "TypeScript, React 18, Next.js 14, Convex, TailwindCSS"
architecture: "Next.js App Router frontend, Convex serverless backend, Clerk auth"
buildCommand: "npm run build"
testCommand: "npm run test"
conventions: "Prefer server components. Use Convex queries for data. Zod for validation."
```

**Chain:** First session only → **`bootstrap_project`** → `get_project_context` in future sessions
**Benefit:** Every future agent session knows your project without re-explaining.

---

### `get_project_context`
Retrieve stored project context at session start.

**Prompt:**
```
Get project context — what do you know about this project?
```

**Chain:** Start of every session → **`get_project_context`** → proceed with task
**Benefit:** Instant project awareness without re-bootstrapping.

---

## 7. security (3 tools)

Security scanning and analysis.

### `scan_dependencies`
Scan for vulnerabilities and outdated packages.

**Prompt:**
```
Scan dependencies in this project — check for vulnerabilities and outdated packages.
```

**Chain:** Before deploy → **`scan_dependencies`** → fix critical vulns → deploy
**Benefit:** Auto-detects package.json, requirements.txt, Cargo.toml, go.mod.

---

### `run_code_analysis`
Static analysis for security issues and code quality.

**Prompt:**
```
Run code analysis on this file content:
```typescript
const API_KEY = "sk-abc123def456";
const userInput = req.query.search;
db.query(`SELECT * FROM users WHERE name = '${userInput}'`);
```
```

**Chain:** During code review → **`run_code_analysis`** → fix findings
**Benefit:** Catches hardcoded secrets, SQL injection, XSS, homograph attacks, ANSI injection.

---

### `scan_terminal_security`
Scan for terminal-level security threats.

**Prompt:**
```
Scan terminal security in this project — check dotfiles, CI configs, env files, and shell scripts.
```

**Chain:** After adding new CI/CD or shell scripts → **`scan_terminal_security`**
**Benefit:** Catches Unicode homograph attacks, ANSI escape injections, invisible characters.

---

## 8. boilerplate (2 tools)

Project scaffolding pre-configured for NodeBench.

### `scaffold_nodebench_project`
Create a complete project template.

**Prompt:**
```
Scaffold a new NodeBench project:
name: "api-gateway"
template: "typescript"
dryRun: true (preview first)
```

**Chain:** **`scaffold_nodebench_project`** (dry run) → review → `scaffold_nodebench_project` (apply)
**Benefit:** Generates package.json, AGENTS.md, .mcp.json, CI/CD, tsconfig — ready to go.

---

### `get_boilerplate_status`
Check what NodeBench infrastructure exists vs what's missing.

**Prompt:**
```
Get boilerplate status — what NodeBench infrastructure is set up and what's missing?
```

**Chain:** **`get_boilerplate_status`** → `scaffold_nodebench_project` for missing pieces
**Benefit:** Gap report with recommendations for what to add.

---

## Meta/Discovery (always included, 6 tools)

These tools help agents find and navigate all other tools.

### `discover_tools`
Search and filter all available tools.

**Prompt:**
```
Discover tools related to "testing" — I need to run tests and track results.
```

**Benefit:** 8-mode hybrid search (keyword, semantic, domain, phase, workflow, embedding, graph, fuzzy).

### `get_tool_quick_ref`
Get the recommended next step after using any tool.

**Prompt:**
```
Get quick ref for "start_verification_cycle" — what should I do next?
```

### `get_workflow_chain`
Get a step-by-step tool sequence for a workflow.

**Prompt:**
```
Get workflow chain for "feature_development" — show me the full tool sequence.
```

**Benefit:** 25 pre-built chains: feature dev, debugging, security audit, deployment, research, academic writing, CI/CD, multi-agent coordination, and more.

---

# PART 2: FULL PRESET (additional 131 tools across 26 toolsets)

Everything in default, plus specialized toolsets for specific project types.

```
npx nodebench-mcp --preset full
```

---

## 9. ui_capture (2 tools)

Screenshot capture for visual verification.

### `capture_ui_screenshot`
Capture a screenshot at a specific viewport.

**Prompt:**
```
Capture screenshot of http://localhost:3000/dashboard at mobile viewport (375px).
Wait 2 seconds for dynamic content to load.
```

**Chain:** **`capture_ui_screenshot`** → `analyze_screenshot` (vision) → fix issues → re-capture
**Benefit:** Multimodal agents can see the actual rendered UI and evaluate it.

---

### `capture_responsive_suite`
Capture at all 3 standard breakpoints in one call.

**Prompt:**
```
Capture responsive suite for http://localhost:3000/pricing — mobile, tablet, and desktop.
```

**Chain:** After UI change → **`capture_responsive_suite`** → `analyze_screenshot` per viewport
**Benefit:** Quickly verify responsive behavior across all breakpoints.

---

## 10. vision (4 tools)

AI-powered visual analysis using Gemini, GPT-4o, or Claude.

### `discover_vision_env`
Check which vision providers are available.

**Prompt:**
```
Discover vision environment — which AI providers can analyze screenshots?
```

### `analyze_screenshot`
Send a screenshot to a vision model for analysis.

**Prompt:**
```
Analyze this screenshot with prompt: "Check the navigation menu alignment, button spacing, and color contrast. Are there any accessibility concerns?"
```

**Chain:** `capture_ui_screenshot` → **`analyze_screenshot`** → fix issues → re-capture
**Benefit:** Gemini with code execution can zoom, crop, measure, and annotate autonomously.

### `manipulate_screenshot`
Crop, resize, or annotate screenshots.

**Prompt:**
```
Manipulate screenshot: crop region x=100, y=200, width=400, height=300 to isolate the sidebar component.
```

### `diff_screenshots`
Compare two screenshots for visual regression.

**Prompt:**
```
Diff screenshots: before.png vs after.png — compute pixel-level similarity and highlight differences.
```

**Benefit:** Visual regression testing without external tools.

---

## 11. web (2 tools)

Web search and content fetching.

### `web_search`
Search the web with AI grounding.

**Prompt:**
```
Web search: "Convex serverless database vs Supabase 2024 comparison performance benchmarks"
```

**Chain:** `run_recon` → **`web_search`** → `fetch_url` → `log_recon_finding`
**Benefit:** Auto-selects best provider: Gemini > OpenAI > Perplexity.

### `fetch_url`
Fetch a URL and extract content as markdown.

**Prompt:**
```
Fetch URL https://docs.convex.dev/functions/query-functions and extract as markdown.
```

**Benefit:** Reads documentation, blog posts, API references without a browser.

---

## 12. github (3 tools)

GitHub research and monitoring.

### `search_github`
Search repositories by query, topic, language.

**Prompt:**
```
Search GitHub for "MCP server typescript" with minimum 100 stars, sorted by stars.
```

### `analyze_repo`
Analyze a repo's structure and tech stack.

**Prompt:**
```
Analyze repo "anthropics/anthropic-cookbook" — show me the tech stack, file structure, and dependencies.
```

### `monitor_repo`
Track a repo's metrics over time.

**Prompt:**
```
Monitor repo "vercel/next.js" — show stars trend, recent releases, and contributor activity.
```

---

## 13. docs (4 tools)

Documentation generation and environment setup.

### `update_agents_md`
Generate or update AGENTS.md with project methodology.

**Prompt:**
```
Update AGENTS.md for this project — include verification methodology, tool recommendations, and quality gates.
```

### `research_job_market`
Research job market requirements for a role.

**Prompt:**
```
Research job market for "Senior Full-Stack Developer" — what skills are in demand?
```

### `setup_local_env`
Discover and diagnose the local dev environment.

**Prompt:**
```
Setup local env — check what API keys are configured, what SDKs are installed, and what's missing.
```

### `generate_report`
Compile findings into a formatted markdown report.

**Prompt:**
```
Generate report compiling the last verification cycle, eval results, and quality gate data.
Title: "Auth Migration Verification Report"
```

---

## 14. bootstrap (11 tools)

Agent infrastructure discovery and self-implementation.

### `discover_infrastructure`
Scan codebase for existing agent infrastructure.

**Prompt:**
```
Discover infrastructure — what agent loops, telemetry, evaluation, and verification systems already exist?
```

### `triple_verify`
Run 3-layer verification on agent implementation.

**Prompt:**
```
Triple verify "WebSocket integration" — V1: codebase analysis, V2: external source validation, V3: synthesis.
```

### `self_implement`
Generate implementation plan and code for missing infrastructure.

**Prompt:**
```
Self-implement missing "telemetry" infrastructure with dryRun: true.
```

### `generate_self_instructions`
Generate self-instructions in various formats.

**Prompt:**
```
Generate self-instructions as "claude_md" format for this project.
```

### `assess_risk`
Assess risk tier before executing an action.

**Prompt:**
```
Assess risk for action: "Dropping and recreating the users table with new schema"
```

**Benefit:** Returns tier (low/medium/high), reversibility, external impact, and recommendation.

### `run_tests_cli`
Execute a shell test command with structured results.

**Prompt:**
```
Run tests CLI: command "npm run test -- --reporter=json" with timeout 60 seconds.
```

### Other bootstrap tools:
- **`connect_channels`** — Gather info from slack, github, docs, email
- **`decide_re_update`** — Should I update existing docs or create new ones?
- **`run_self_maintenance`** — Autonomous maintenance cycle (quick/standard/thorough)
- **`scaffold_directory`** — Create organized directory structure
- **`run_autonomous_loop`** — Execute autonomous verification with guardrails

---

## 15. self_eval (9 tools)

Self-evaluation and trajectory analysis.

### `get_trajectory_analysis`
Analyze tool usage patterns across sessions.

**Prompt:**
```
Get trajectory analysis for the last 7 days — show tool frequency, error rates, and sequential patterns.
```

### `get_self_eval_report`
Comprehensive self-evaluation report.

**Prompt:**
```
Get self-eval report — cross-reference all verification cycles, eval runs, quality gates, and tool trajectories.
```

### `get_improvement_recommendations`
Actionable improvement suggestions.

**Prompt:**
```
Get improvement recommendations — what tools am I underusing? What quality gates am I skipping?
```

### `check_contract_compliance`
Verify agent followed the methodology contract.

**Prompt:**
```
Check contract compliance for the last session — did I do recon before implementation? Did I run tests at multiple layers?
```

### `create_task_bank`
Create controlled evaluation tasks.

**Prompt:**
```
Create task bank entry:
category: "bugfix"
difficulty: "medium"
description: "Fix race condition in useOptimistic hook"
successCriteria: ["tests pass", "no console errors", "optimistic update visible within 100ms"]
forbiddenBehaviors: ["deleting existing tests", "adding setTimeout workarounds"]
```

### `grade_agent_run`
Grade an agent run on outcome + process quality.

**Prompt:**
```
Grade agent run for task "fix-auth-redirect" — check outcome (did it work?) and process (did it follow methodology?).
```

### Other self_eval tools:
- **`log_tool_call`** — Record a tool invocation (auto-instrumented)
- **`cleanup_stale_runs`** — Clean up orphaned eval runs
- **`synthesize_recon_to_learnings`** — Convert recon findings into persistent learnings

---

## 16. parallel (13 tools)

Multi-agent coordination based on Anthropic's parallel Claudes pattern.

### `claim_agent_task`
Claim a task lock to prevent duplicate work.

**Prompt:**
```
Claim agent task "implement-auth-module" with description "Building the authentication middleware and login flow".
```

### `list_agent_tasks`
See what all agents are working on.

**Prompt:**
```
List agent tasks — show active claims, blocked tasks, and recently completed work.
```

### `assign_agent_role`
Specialize the current agent session.

**Prompt:**
```
Assign agent role "security_auditor" — I want to focus on finding security issues in this PR.
```

### `run_oracle_comparison`
Compare output against a known-good reference.

**Prompt:**
```
Run oracle comparison:
testLabel: "add function output"
actualOutput: "5"
expectedOutput: "5"
oracleSource: "GCC reference compiler"
```

### `send_agent_message` / `check_agent_inbox` / `broadcast_agent_update`
Inter-agent messaging for task handoffs.

**Prompt:**
```
Send agent message to role "implementer":
category: "handoff"
subject: "Auth module ready for integration"
body: "Session store is configured. Redis connection tested. Ready for route integration."
priority: "high"
```

### Other parallel tools:
- **`release_agent_task`** — Release a task lock after completion
- **`get_agent_role`** — Get current role and instructions
- **`log_context_budget`** — Track context window usage
- **`get_parallel_status`** — Overview of all parallel agent activity
- **`bootstrap_parallel_agents`** — Scaffold parallel agent infrastructure
- **`generate_parallel_agents_md`** — Generate AGENTS.md parallel section

---

## 17. llm (3 tools)

Direct LLM calling for agent pipelines.

### `call_llm`
Call an LLM and get response with metrics.

**Prompt:**
```
Call LLM with system: "You are a code reviewer. Be concise." and prompt: "Review this function for edge cases: function divide(a, b) { return a / b; }"
```

### `extract_structured_data`
Extract structured JSON from unstructured text.

**Prompt:**
```
Extract structured data from this job posting:
"Senior React Developer at Acme Corp. $150-200k. Remote. 5+ years experience. React, TypeScript, Node.js required."
Fields: company, title, salary_range, location, requirements
```

### `benchmark_models`
Compare multiple LLMs on the same prompt.

**Prompt:**
```
Benchmark models on prompt: "Explain the CAP theorem in 2 sentences" — compare Gemini, OpenAI, and Anthropic.
```

---

## 18. platform (4 tools)

Convex platform integration (requires CONVEX_SITE_URL).

### `query_daily_brief` / `query_funding_entities` / `query_research_queue` / `publish_to_queue`

**Prompt:**
```
Query today's daily brief — show narrative thesis, top signals, and action items.
```

---

## 19. research_writing (8 tools)

Academic paper writing and review.

### `polish_academic_text`
Deep-polish text for top-venue quality.

**Prompt:**
```
Polish academic text for NeurIPS submission:
"We proposes a new method that leverages the power of transformers to delve into the intricacies of..."
```

### `review_paper_as_reviewer`
Simulate a peer reviewer.

**Prompt:**
```
Review this paper abstract as a harsh NeurIPS reviewer:
"We present FooNet, a novel architecture that achieves state-of-the-art on CIFAR-10..."
```

### Other research_writing tools:
- **`translate_academic`** — Chinese/English academic translation
- **`compress_or_expand_text`** — Precise word count adjustment
- **`remove_ai_signatures`** — Detect and remove AI writing patterns
- **`check_paper_logic`** — Find contradictions and undefined terms
- **`generate_academic_caption`** — Figure/table captions
- **`analyze_experiment_data`** — Publication-ready data analysis

---

## 20. flicker_detection (5 tools)

Android UI flicker detection pipeline (requires ADB + FLICKER_SERVER_URL).

### `run_flicker_detection`
Full 4-layer detection pipeline.

**Prompt:**
```
Run flicker detection on the Android app — full pipeline with SurfaceFlinger stats, screen recording, SSIM analysis, and semantic verification.
```

### Other: `capture_surface_stats`, `extract_video_frames`, `compute_ssim_analysis`, `generate_flicker_report`

---

## 21. figma_flow (4 tools)

Figma design file analysis (requires FIGMA_ACCESS_TOKEN).

### `analyze_figma_flows`
Full flow analysis pipeline.

**Prompt:**
```
Analyze Figma flows for file key "abc123XYZ" — extract frames, cluster into flows, and generate visualization.
```

### Other: `extract_figma_frames`, `cluster_figma_flows`, `render_flow_visualization`

---

## 22. local_file (18 tools)

Parse local files without network access.

### CSV: `read_csv_file`, `csv_select_rows`, `csv_aggregate`
```
Read CSV file at ./data/sales.csv — show first 50 rows with headers.
Select rows from ./data/sales.csv where region = "West" and amount > 1000.
Aggregate ./data/sales.csv: sum of "amount" grouped by "region".
```

### Excel: `read_xlsx_file`, `xlsx_select_rows`, `xlsx_aggregate`
```
Read XLSX file at ./reports/Q4.xlsx — sheet "Revenue", first 100 rows.
```

### PDF: `read_pdf_text`, `pdf_search_text`
```
Read PDF text from ./docs/spec.pdf, pages 1-5.
Search PDF ./docs/contract.pdf for "termination clause".
```

### JSON: `read_json_file`, `json_select`, `read_jsonl_file`
```
Read JSON file at ./config/settings.json with max depth 3.
Select JSON pointer "/database/connectionString" from ./config/settings.json.
```

### Archive: `zip_list_files`, `zip_read_text_file`, `zip_extract_file`
```
List files in ./data/archive.zip.
Read text file "README.md" from inside ./data/archive.zip.
```

### Office: `read_docx_text`, `read_pptx_text`
```
Read text from ./docs/proposal.docx.
Extract text from ./slides/pitch.pptx.
```

### OCR: `read_image_ocr_text`
```
Extract text from ./screenshots/error.png using OCR.
```

### Audio: `transcribe_audio_file`
```
Transcribe audio file ./recordings/meeting.mp3 to text.
```

---

## 23. benchmark (3 tools)

Autonomous capability benchmarks inspired by Anthropic's C compiler test.

### `start_autonomy_benchmark`
Start a complex build challenge.

**Prompt:**
```
Start autonomy benchmark: challenge "rest_api" — build a production REST API with auth, CRUD, tests, and docs.
```

### Other: complete_benchmark_milestone, get_benchmark_status

---

## 24. session_memory (3 tools)

Persist critical state across context compaction.

### `save_session_note`
Persist a finding or decision to filesystem.

**Prompt:**
```
Save session note:
category: "decision"
content: "Decided to use Redis for session store instead of PostgreSQL. Reason: lower latency for session lookups, built-in TTL support."
tags: ["architecture", "auth", "redis"]
```

### `load_session_notes`
Recover state after context compaction or /clear.

**Prompt:**
```
Load session notes from today — filter by category "decision".
```

### `refresh_task_context`
Combat attention drift after 30+ tool calls.

**Prompt:**
```
Refresh task context — re-inject my active verification cycle, open gaps, and recent learnings.
```

---

## 25. gaia_solvers (6 tools)

Specialized math/image solvers for GAIA benchmark tasks.

- **`solve_red_green_deviation_average_from_image`**
- **`solve_green_polygon_area_from_image`**
- **`grade_fraction_quiz_from_image`**
- **`extract_fractions_and_simplify_from_image`**
- **`solve_bass_clef_age_from_image`**
- **`solve_storage_upgrade_cost_per_file_from_image`**

---

## 26. toon (2 tools)

Token-Oriented Object Notation (~40% fewer tokens).

### `toon_encode`
Convert JSON to TOON format.

**Prompt:**
```
TOON encode this data: [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
```

### `toon_decode`
Convert TOON back to JSON.

**Prompt:**
```
TOON decode: "name,age\nAlice,30\nBob,25"
```

**Benefit:** Reduces context window usage by ~40% when passing data between agents.

---

## 27. pattern (2 tools)

Mine historical patterns from tool usage.

### `mine_session_patterns`
Find recurring success/failure tool sequences.

**Prompt:**
```
Mine session patterns from the last 30 days — show me which tool workflows reliably succeed and which tend to fail.
```

### `predict_risks_from_patterns`
Predict failure modes for a task based on history.

**Prompt:**
```
Predict risks from patterns for task: "Migrating database from PostgreSQL to MongoDB"
```

---

## 28. git_workflow (3 tools)

Git compliance and merge gating.

### `check_git_compliance`
Validate branch state and commit format.

**Prompt:**
```
Check git compliance — am I on a protected branch? Are there uncommitted changes? Do recent commits follow conventional format?
```

### `review_pr_checklist`
Structured PR review with verification cross-reference.

**Prompt:**
```
Review PR checklist for this pull request — check title format, description, file scope, test coverage, and verification completion.
```

### `enforce_merge_gate`
Pre-merge validation combining all checks.

**Prompt:**
```
Enforce merge gate for branch "feature/auth-migration" — check git state, verification cycles, eval runs, tests, and quality gates.
```

---

## 29. seo (5 tools)

SEO audit and WordPress security.

### `seo_audit_url`
Full SEO element analysis.

**Prompt:**
```
SEO audit URL https://mysite.com — check title, meta, OG tags, headings, alt text, structured data.
```

### `check_page_performance`
Lightweight performance check via HTTP.

**Prompt:**
```
Check page performance for https://mysite.com — response time, compression, caching headers.
```

### `check_wordpress_site` / `scan_wordpress_updates`
WordPress detection and security assessment.

**Prompt:**
```
Check WordPress site https://myblog.com — detect plugins, theme, and security posture.
```

### `analyze_seo_content`
Content quality analysis.

**Prompt:**
```
Analyze SEO content of this HTML — word count, readability score, heading structure, keyword density for "typescript tutorial".
```

---

## 30. voice_bridge (4 tools)

Voice pipeline design and scaffolding.

### `design_voice_pipeline`
Recommend optimal STT/TTS/LLM stack.

**Prompt:**
```
Design voice pipeline with requirements:
- Max 500ms round-trip latency
- Must work offline (no cloud STT)
- Budget: $0 (all local)
- Platform: macOS with Apple Silicon
```

### `generate_voice_scaffold`
Generate starter code for a voice bridge.

**Prompt:**
```
Generate voice scaffold for stack "whisper_edge" — Python, local Whisper STT + Edge TTS.
```

### Other: `analyze_voice_config`, `benchmark_voice_latency`

---

## 31. critter (1 tool)

Accountability partner for task clarity.

### `critter_check`
Answer "Why?" and "Who?" before starting work.

**Prompt:**
```
Critter check:
task: "Adding dark mode to the dashboard"
why: "Users in our Discord have been requesting it. 3 of our top 5 competitors have it."
who: "Power users who work late hours and find the current white theme straining"
```

**Benefit:** Prevents scope creep and aimless work. The friction is the feature.

---

## 32. email (4 tools)

SMTP/IMAP email integration.

### `check_email_setup`
Diagnose email configuration.

**Prompt:**
```
Check email setup — verify EMAIL_USER and EMAIL_PASS are configured, test SMTP/IMAP connections.
```

### `send_email` / `read_emails` / `draft_email_reply`

**Prompt:**
```
Read emails from INBOX — last 5 unread messages.
Draft email reply to the thread about "Q4 planning" — tone: professional, instructions: "Accept the meeting time but suggest adding 15 minutes for Q&A".
Send email to team@company.com, subject "Deploy complete", body "v2.1 deployed to production. All health checks passing."
```

---

## 33. rss (4 tools)

RSS/Atom feed monitoring and research digest.

### `add_rss_source`
Register a feed for monitoring.

**Prompt:**
```
Add RSS source: url "https://arxiv.org/rss/cs.AI", name "arXiv AI", category "ai-research"
```

### `fetch_rss_feeds` → `build_research_digest`

**Prompt:**
```
Fetch RSS feeds — pull new articles from all registered sources.
Build research digest — show new articles from the last 24 hours, format as markdown.
```

### `scaffold_research_pipeline`
Generate a standalone automated digest project.

**Prompt:**
```
Scaffold research pipeline with daily schedule, feeds:
- arXiv AI: https://arxiv.org/rss/cs.AI
- Hacker News Top: https://hnrss.org/newest?points=100
Email digest to: me@company.com
```

---

## 34. architect (3 tools)

Structural code analysis and concept verification.

### `scan_capabilities`
Analyze code for structural patterns.

**Prompt:**
```
Scan capabilities of src/components/Dashboard.tsx — what can this component structurally do?
```

**Benefit:** Shows state management, layout, interactions, rendering patterns — pure regex, no LLM.

### `verify_concept_support`
Check if a file has all required signatures for a concept.

**Prompt:**
```
Verify concept support for "Dark Mode" in src/App.tsx:
Required signatures: ["prefers-color-scheme", "theme.*dark", "toggle.*theme", "ThemeProvider"]
```

### `generate_implementation_plan`
Plan how to add missing signatures.

**Prompt:**
```
Generate implementation plan for concept "Dark Mode" with missing signatures: ["prefers-color-scheme", "toggle.*theme"]
Target file: src/App.tsx
```

---

# PART 3: END-TO-END WORKFLOW EXAMPLES

## Workflow 1: Feature Development (Default Preset)

```
1. get_project_context              → Know the project
2. search_all_knowledge             → Check what's already known about this area
3. run_recon                        → Research the feature requirements
4. log_recon_finding (repeat)       → Record what you learn
5. get_recon_summary                → Summarize findings into action plan
6. start_verification_cycle         → Begin structured implementation
7. log_phase_findings (Phase 1)     → Record context gathering
8. log_gap (Phase 2, repeat)        → Identify all gaps
9. resolve_gap (Phase 3, repeat)    → Implement fixes
10. log_test_result (Phase 4)       → Test at all layers
11. run_closed_loop                 → Compile-lint-test-debug loop
12. run_quality_gate (Phase 5)      → Boolean quality checks
13. record_learning (Phase 6)       → Document edge cases
14. promote_to_eval                 → Feed findings into eval system
```

## Workflow 2: Bug Investigation (Default Preset)

```
1. search_all_knowledge             → Has this bug been seen before?
2. start_verification_cycle         → Structured investigation
3. log_phase_findings               → Record what you find
4. log_gap                          → Document the root cause
5. resolve_gap                      → Implement the fix
6. log_test_result                  → Regression test
7. run_closed_loop                  → Verify fix doesn't break anything
8. record_learning                  → Prevent recurrence
9. start_eval_run                   → Create eval to catch this class of bug
10. run_mandatory_flywheel          → 6-step final check
```

## Workflow 3: Visual QA (Full Preset)

```
1. discover_vision_env              → Check available vision providers
2. capture_responsive_suite         → Screenshots at 3 breakpoints
3. analyze_screenshot (x3)          → AI analysis of each viewport
4. manipulate_screenshot            → Crop problem areas for deeper analysis
5. diff_screenshots                 → Compare before/after
6. get_gate_preset("ui_ux_qa")      → Get the 8 UI/UX rules
7. run_quality_gate                 → Boolean pass/fail on each rule
8. record_learning                  → Document visual patterns found
```

## Workflow 4: Multi-Agent Coordination (Full Preset)

```
Agent A:
1. bootstrap_parallel_agents        → Set up coordination infrastructure
2. assign_agent_role("implementer") → Specialize as implementer
3. claim_agent_task("auth-module")  → Lock the task
4. [do implementation work]
5. release_agent_task               → Mark done
6. send_agent_message               → Notify reviewer

Agent B:
1. check_agent_inbox                → Pick up handoff
2. assign_agent_role("code_quality_critic")
3. claim_agent_task("auth-review")
4. run_code_analysis                → Security scan
5. run_quality_gate("code_review")  → Quality gate
6. broadcast_agent_update           → Announce results to all agents
```

## Workflow 5: Research Digest Pipeline (Full Preset)

```
1. add_rss_source (repeat)          → Register feeds
2. fetch_rss_feeds                  → Pull new articles
3. build_research_digest            → Generate digest of new content
4. call_llm                         → Summarize key findings
5. send_email                       → Deliver to inbox
6. scaffold_research_pipeline       → Make it self-sustaining (cron job)
```

## Workflow 6: Academic Paper Writing (Full Preset)

```
1. polish_academic_text             → Clean up draft
2. remove_ai_signatures             → Remove AI writing patterns
3. check_paper_logic                → Find contradictions
4. compress_or_expand_text          → Hit word limit
5. generate_academic_caption        → Figure/table captions
6. analyze_experiment_data          → Data analysis paragraphs
7. review_paper_as_reviewer         → Simulate harsh peer review
8. translate_academic               → Chinese/English translation
```

## Workflow 7: Security Audit (Mixed Preset)

```
1. scan_dependencies                → Check for vulnerable packages
2. run_code_analysis                → Static analysis on code
3. scan_terminal_security           → Check for terminal threats
4. check_wordpress_site             → (if WordPress) Detect plugins and security posture
5. scan_wordpress_updates           → Check for known CVEs
6. run_quality_gate("code_review")  → Security-focused gate
7. record_learning                  → Document security patterns
```

---

## Quick Reference: When to Use Which Preset

| Scenario | Preset | Why |
|---|---|---|
| **Any backend/frontend project** | `default` | Core methodology covers 90% of needs |
| **UI-heavy project** | `full` or `--toolsets default,ui_capture,vision` | Visual verification |
| **Research/academic** | `full` or `--toolsets default,research_writing,web` | Paper writing + web research |
| **Multi-agent teams** | `full` or `--toolsets default,parallel` | Task locking + messaging |
| **Data analysis** | `full` or `--toolsets default,local_file,llm` | File parsing + LLM extraction |
| **WordPress/SEO** | `full` or `--toolsets default,seo,web` | SEO audit + WordPress scanning |
| **Voice applications** | `full` or `--toolsets default,voice_bridge` | Pipeline design + scaffolding |
| **Mobile (Android)** | `full` or `--toolsets default,flicker_detection` | UI flicker detection |
| **Design review** | `full` or `--toolsets default,figma_flow,vision` | Figma analysis + visual QA |
| **CI/CD pipelines** | `default` + `--toolsets git_workflow` | Git compliance + merge gating |
