# NodeBench Agents Protocol

This file provides the standard operating procedure for AI agents using the NodeBench MCP. Drop this into any repository and agents will auto-configure their workflow.

Reference: [agents.md](https://agents.md/) standard.

---

## Quick Setup

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp"]
    }
  }
}
```

Restart Claude Code. 175 tools available immediately.

### Preset Selection

By default all toolsets are enabled. Use `--preset` to start with a scoped subset:

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp", "--preset", "meta"]
    }
  }
}
```

The **meta** preset is the recommended front door for new agents: start with just 5 discovery tools, use `discover_tools` to find what you need, then self-escalate to a larger preset. See [Toolset Gating & Presets](#toolset-gating--presets) for the full breakdown.

**→ Quick Refs:** After setup, run `getMethodology("overview")` | First task? See [Verification Cycle](#verification-cycle-workflow) | New to codebase? See [Environment Setup](#environment-setup) | Preset options: See [Toolset Gating & Presets](#toolset-gating--presets)

---

## The AI Flywheel (Mandatory)

Every non-trivial change MUST go through this 6-step verification process before shipping.

### Step 1: Static Analysis
```
tsc --noEmit
```
Zero errors. Zero warnings. No exceptions.

### Step 2: Happy-Path Test
Run the changed functionality with valid inputs. Confirm expected output.

### Step 3: Failure-Path Test
Test each failure mode the code handles. Invalid inputs, edge cases, error states.

### Step 4: Gap Analysis
Review the code for:
- Dead code, unused variables
- Missing integrations (new functions not wired to existing systems)
- Logic that doesn't match stated intent
- Hardcoded values that should be configurable

### Step 5: Fix and Re-Verify
If any gap found: fix it, then restart from Step 1.

### Step 6: Live E2E Test (MANDATORY)
**Before declaring done or publishing:**
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"YOUR_TOOL","arguments":{...}}}' | node dist/index.js
```
Every new/modified tool MUST pass stdio E2E test. No exceptions.

For workflow-level changes (verification, eval, recon, quality gates, flywheel, or knowledge tools), also run the long-running open-source benchmark:
```bash
npm --prefix packages/mcp-local run dataset:bfcl:refresh
NODEBENCH_OPEN_DATASET_TASK_LIMIT=12 NODEBENCH_OPEN_DATASET_CONCURRENCY=6 npm --prefix packages/mcp-local run test:open-dataset
npm --prefix packages/mcp-local run dataset:toolbench:refresh
NODEBENCH_TOOLBENCH_TASK_LIMIT=6 NODEBENCH_TOOLBENCH_CONCURRENCY=3 npm --prefix packages/mcp-local run test:open-dataset:toolbench
npm --prefix packages/mcp-local run dataset:swebench:refresh
NODEBENCH_SWEBENCH_TASK_LIMIT=8 NODEBENCH_SWEBENCH_CONCURRENCY=4 npm --prefix packages/mcp-local run test:open-dataset:swebench
```

### Step 7: Document Learnings
Record edge cases discovered. Update this file if needed.

**Rule: No change ships without passing all 7 steps.**

**→ Quick Refs:** Track progress with `start_verification_cycle` | Record findings with `record_learning` | Run gate with `run_quality_gate` | See [Post-Implementation Checklist](#post-implementation-checklist)

---

## Open-Source Long-Running MCP Benchmark

Use open-source long-context tasks to validate real orchestration behavior under parallel load.

- Dataset: `gorilla-llm/Berkeley-Function-Calling-Leaderboard`
- Split: `BFCL_v3_multi_turn_long_context`
- Source: `https://huggingface.co/datasets/gorilla-llm/Berkeley-Function-Calling-Leaderboard`

Refresh local fixture:
```bash
npm run mcp:dataset:refresh
```

Run parallel subagent benchmark:
```bash
NODEBENCH_OPEN_DATASET_TASK_LIMIT=12 NODEBENCH_OPEN_DATASET_CONCURRENCY=6 npm run mcp:dataset:test
```

Run refresh + benchmark in one shot:
```bash
npm run mcp:dataset:bench
```

Second lane (ToolBench multi-tool instructions):
- Dataset: `OpenBMB/ToolBench`
- Split: `data_example/instruction (G1,G2,G3)`
- Source: `https://github.com/OpenBMB/ToolBench`

Refresh ToolBench fixture:
```bash
npm run mcp:dataset:toolbench:refresh
```

Run ToolBench parallel subagent benchmark:
```bash
NODEBENCH_TOOLBENCH_TASK_LIMIT=6 NODEBENCH_TOOLBENCH_CONCURRENCY=3 npm run mcp:dataset:toolbench:test
```

Run all public lanes:
```bash
npm run mcp:dataset:bench:all
```

Third lane (SWE-bench Verified long-horizon software tasks):
- Dataset: `princeton-nlp/SWE-bench_Verified`
- Split: `test`
- Source: `https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified`

Refresh SWE-bench fixture:
```bash
npm run mcp:dataset:swebench:refresh
```

Run SWE-bench parallel subagent benchmark:
```bash
NODEBENCH_SWEBENCH_TASK_LIMIT=8 NODEBENCH_SWEBENCH_CONCURRENCY=4 npm run mcp:dataset:swebench:test
```

Fourth lane (GAIA gated long-horizon tool-augmented tasks):
- Dataset: `gaia-benchmark/GAIA` (gated)
- Default config: `2023_level3`
- Default split: `validation`
- Source: `https://huggingface.co/datasets/gaia-benchmark/GAIA`

Notes:
- Fixture is written to `.cache/gaia` (gitignored). Do not commit GAIA question/answer content.
- Refresh requires `HF_TOKEN` or `HUGGINGFACE_HUB_TOKEN` in your shell.
- Python deps: `pandas`, `huggingface_hub`, `pyarrow` (or equivalent parquet engine).

Refresh GAIA fixture:
```bash
npm run mcp:dataset:gaia:refresh
```

Run GAIA parallel subagent benchmark:
```bash
NODEBENCH_GAIA_TASK_LIMIT=8 NODEBENCH_GAIA_CONCURRENCY=4 npm run mcp:dataset:gaia:test
```

GAIA capability benchmark (accuracy: LLM-only vs LLM+tools):
- This runs real model calls and web search. It is disabled by default and only intended for regression checks.
- Uses Gemini by default. Ensure `GEMINI_API_KEY` is available (repo `.env.local` is loaded by the test).
- Scoring fixture includes ground-truth answers and MUST remain under `.cache/gaia` (gitignored).

Generate scoring fixture (local only, gated):
```bash
npm run mcp:dataset:gaia:capability:refresh
```

Run capability benchmark:
```bash
NODEBENCH_GAIA_CAPABILITY_TASK_LIMIT=6 NODEBENCH_GAIA_CAPABILITY_CONCURRENCY=1 npm run mcp:dataset:gaia:capability:test
```

GAIA capability benchmark (file-backed lane: PDF / XLSX / CSV):
- This lane measures the impact of deterministic local parsing tools on GAIA tasks with attachments.
- Fixture includes ground-truth answers and MUST remain under `.cache/gaia` (gitignored).
- Attachments are copied into `.cache/gaia/data/<file_path>` for offline deterministic runs after the first download.

Generate file-backed scoring fixture + download attachments (local only, gated):
```bash
npm run mcp:dataset:gaia:capability:files:refresh
```

Run file-backed capability benchmark:
```bash
NODEBENCH_GAIA_CAPABILITY_TASK_LIMIT=6 NODEBENCH_GAIA_CAPABILITY_CONCURRENCY=1 npm run mcp:dataset:gaia:capability:files:test
```

Modes:
- Recommended (more stable): `NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE=rag` (single deterministic extract + answer)
- More realistic (higher variance): `NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE=agent` (small tool loop)
Web lane only: `NODEBENCH_GAIA_CAPABILITY_FORCE_WEB_SEARCH=1` and/or `NODEBENCH_GAIA_CAPABILITY_FORCE_FETCH_URL=1`

Run all public lanes:
```bash
npm run mcp:dataset:bench:all
```

Run full lane suite (includes GAIA):
```bash
npm run mcp:dataset:bench:full
```

Implementation files:
- `packages/mcp-local/src/__tests__/fixtures/generateBfclLongContextFixture.ts`
- `packages/mcp-local/src/__tests__/fixtures/bfcl_v3_long_context.sample.json`
- `packages/mcp-local/src/__tests__/openDatasetParallelEval.test.ts`
- `packages/mcp-local/src/__tests__/fixtures/generateToolbenchInstructionFixture.ts`
- `packages/mcp-local/src/__tests__/fixtures/toolbench_instruction.sample.json`
- `packages/mcp-local/src/__tests__/openDatasetParallelEvalToolbench.test.ts`
- `packages/mcp-local/src/__tests__/fixtures/generateSwebenchVerifiedFixture.ts`
- `packages/mcp-local/src/__tests__/fixtures/swebench_verified.sample.json`
- `packages/mcp-local/src/__tests__/openDatasetParallelEvalSwebench.test.ts`
- `packages/mcp-local/src/__tests__/fixtures/generateGaiaLevel3Fixture.py`
- `.cache/gaia/gaia_2023_level3_validation.sample.json`
- `packages/mcp-local/src/__tests__/openDatasetParallelEvalGaia.test.ts`
- `packages/mcp-local/src/__tests__/fixtures/generateGaiaCapabilityFixture.py`
- `.cache/gaia/gaia_capability_2023_all_validation.sample.json`
- `packages/mcp-local/src/__tests__/gaiaCapabilityEval.test.ts`
- `packages/mcp-local/src/__tests__/fixtures/generateGaiaCapabilityFilesFixture.py`
- `.cache/gaia/gaia_capability_files_2023_all_validation.sample.json`
- `.cache/gaia/data/...` (local GAIA attachments; do not commit)
- `packages/mcp-local/src/__tests__/gaiaCapabilityFilesEval.test.ts`

Required tool chain per dataset task:
- `run_recon`
- `log_recon_finding`
- `findTools`
- `getMethodology`
- `start_eval_run`
- `record_eval_result`
- `complete_eval_run`
- `run_closed_loop`
- `run_mandatory_flywheel`
- `search_all_knowledge`

**→ Quick Refs:** Core process in [AI Flywheel](#the-ai-flywheel-mandatory) | Verification flow in [Verification Cycle](#verification-cycle-workflow) | Loop discipline in [Closed Loop Principle](#closed-loop-principle)

---

## MCP Tool Categories

Use `getMethodology("overview")` to see all available workflows.

| Category | Tools | When to Use |
|----------|-------|-------------|
| **Web** | `web_search`, `fetch_url` | Research, reading docs, market validation |
| **Local Files** | `read_pdf_text`, `pdf_search_text`, `read_xlsx_file`, `xlsx_select_rows`, `xlsx_aggregate`, `read_csv_file`, `csv_select_rows`, `csv_aggregate`, `read_text_file`, `read_json_file`, `json_select`, `read_jsonl_file`, `zip_list_files`, `zip_read_text_file`, `zip_extract_file`, `read_docx_text`, `read_pptx_text`, `read_image_ocr_text`, `transcribe_audio_file` | Deterministic parsing and aggregation of local attachments (GAIA file-backed lane) |
| **GitHub** | `search_github`, `analyze_repo` | Finding libraries, studying implementations |
| **Verification** | `start_cycle`, `log_phase`, `complete_cycle` | Tracking the flywheel process |
| **Eval** | `start_eval_run`, `log_test_result` | Test case management |
| **Quality Gates** | `run_quality_gate`, `get_gate_history` | Pass/fail checkpoints |
| **Learning** | `record_learning`, `search_all_knowledge` | Persistent knowledge base |
| **Vision** | `analyze_screenshot`, `capture_ui_screenshot` | UI/UX verification |
| **Bootstrap** | `discover_infrastructure`, `triple_verify`, `self_implement` | Self-setup, triple verification |
| **Autonomous** | `assess_risk`, `decide_re_update`, `run_self_maintenance` | Risk-aware execution, self-maintenance |
| **Parallel Agents** | `claim_agent_task`, `release_agent_task`, `list_agent_tasks`, `assign_agent_role`, `get_agent_role`, `log_context_budget`, `run_oracle_comparison`, `get_parallel_status`, `bootstrap_parallel_agents`, `generate_parallel_agents_md`, `send_agent_message`, `check_agent_inbox`, `broadcast_agent_update` | Multi-agent coordination, task locking, role specialization, oracle testing, agent mailbox |
| **LLM** | `call_llm`, `extract_structured_data`, `benchmark_models` | LLM calling, structured extraction, model comparison |
| **Security** | `scan_dependencies`, `run_code_analysis` | Dependency auditing, static code analysis |
| **Platform** | `query_daily_brief`, `query_funding_entities`, `query_research_queue`, `publish_to_queue` | Convex platform bridge: intelligence, funding, research, publishing |
| **Meta** | `findTools`, `getMethodology` | Discover tools, get workflow guides |
| **TOON** | `toon_encode`, `toon_decode` | Token-Oriented Object Notation — ~40% token savings vs JSON |
| **Pattern** | `mine_session_patterns`, `predict_risks_from_patterns` | Session sequence analysis, risk prediction from history |
| **Git Workflow** | `check_git_compliance`, `review_pr_checklist`, `enforce_merge_gate` | Branch validation, PR checklist, merge gates |
| **SEO** | `seo_audit_url`, `check_page_performance`, `analyze_seo_content`, `check_wordpress_site`, `scan_wordpress_updates` | Technical SEO audit, performance, WordPress |
| **Voice Bridge** | `design_voice_pipeline`, `analyze_voice_config`, `generate_voice_scaffold`, `benchmark_voice_latency` | Voice pipeline design, config, scaffolding, latency |
| **GAIA Solvers** | `solve_red_green_deviation_average_from_image`, `solve_green_polygon_area_from_image`, `grade_fraction_quiz_from_image`, `extract_fractions_and_simplify_from_image`, `solve_bass_clef_age_from_image`, `solve_storage_upgrade_cost_per_file_from_image` | GAIA media image solvers |
| **Session Memory** | `save_session_note`, `load_session_notes`, `refresh_task_context` | Compaction-resilient notes, attention refresh |
| **Discovery** | `discover_tools`, `get_tool_quick_ref`, `get_workflow_chain` | Hybrid search, quick refs, workflow chains |

Meta + Discovery tools (5 total) are **always included** regardless of preset. See [Toolset Gating & Presets](#toolset-gating--presets).

**→ Quick Refs:** Find tools by keyword: `findTools({ query: "verification" })` | Hybrid search: `discover_tools({ query: "security" })` | Get workflow guide: `getMethodology({ topic: "..." })` | See [Methodology Topics](#methodology-topics) for all topics

---

## Toolset Gating & Presets

NodeBench MCP supports 4 presets that control which domain toolsets are loaded at startup. Meta + Discovery tools (5 total) are **always included** on top of any preset.

### Preset Table

| Preset | Domain Toolsets | Domain Tools | Total (with meta+discovery) | Use Case |
|--------|----------------|-------------|----------------------------|----------|
| **meta** | 0 | 0 | 5 | Discovery-only front door. Agents start here and self-escalate. |
| **lite** | 8 | 38 | 43 | Lightweight verification-focused workflows. CI bots, quick checks. |
| **core** | 23 | 105 | 110 | Full development workflow. Most agent sessions. |
| **full** | 31 | 170 | 175 | Everything enabled. Benchmarking, exploration, advanced use. |

### Usage

```bash
npx nodebench-mcp --preset meta       # Discovery-only (5 tools)
npx nodebench-mcp --preset lite       # Verification + eval + recon + security
npx nodebench-mcp --preset core       # Full dev workflow without vision/parallel
npx nodebench-mcp --preset full       # All toolsets (default)
npx nodebench-mcp --toolsets verification,eval,recon   # Custom selection
npx nodebench-mcp --exclude vision,ui_capture          # Exclude specific toolsets
```

### The Meta Preset — Discovery-Only Front Door

The **meta** preset loads zero domain tools. Agents start with only 5 tools:

| Tool | Purpose |
|------|---------|
| `findTools` | Keyword search across all registered tools |
| `getMethodology` | Get workflow guides by topic |
| `discover_tools` | Hybrid search with relevance scoring (richer than findTools) |
| `get_tool_quick_ref` | Quick reference card for any specific tool |
| `get_workflow_chain` | Recommended tool sequence for common workflows |

This is the recommended starting point for autonomous agents. The self-escalation pattern:

```
1. Start with --preset meta (5 tools)
2. discover_tools({ query: "what I need to do" })    // Find relevant tools
3. get_workflow_chain({ workflow: "verification" })    // Get the tool sequence
4. If needed tools are not loaded:
   → Restart with --preset core or --preset full
   → Or use --toolsets to add specific domains
5. Proceed with full workflow
```

### Preset Domain Breakdown

**meta** (0 domains): No domain tools. Meta + Discovery only.

**lite** (8 domains): `verification`, `eval`, `quality_gate`, `learning`, `flywheel`, `recon`, `security`, `boilerplate`

**core** (22 domains): Everything in lite plus `bootstrap`, `self_eval`, `llm`, `platform`, `research_writing`, `flicker_detection`, `figma_flow`, `benchmark`, `session_memory`, `toon`, `pattern`, `git_workflow`, `seo`, `voice_bridge`

**full** (30 domains): All toolsets in TOOLSET_MAP including `ui_capture`, `vision`, `local_file`, `web`, `github`, `docs`, `parallel`, `gaia_solvers`, and everything in core.

**→ Quick Refs:** Check current toolset: `findTools({ query: "*" })` | Self-escalate: restart with `--preset core` | See [MCP Tool Categories](#mcp-tool-categories) | CLI help: `npx nodebench-mcp --help`

---

## Verification Cycle Workflow

Start every significant task with a verification cycle:

```
1. start_cycle({ goal: "Implement feature X" })
2. log_phase({ phase: "context", notes: "Researched existing patterns..." })
3. log_phase({ phase: "implementation", notes: "Added new function..." })
4. log_phase({ phase: "testing", notes: "All tests pass..." })
5. complete_cycle({ status: "success", summary: "Feature X shipped" })
```

If blocked or failed:
```
abandon_cycle({ reason: "Blocked by external dependency" })
```

**→ Quick Refs:** Before starting: `search_all_knowledge({ query: "your task" })` | After completing: `record_learning({ ... })` | Run flywheel: See [AI Flywheel](#the-ai-flywheel-mandatory) | Track quality: See [Quality Gates](#quality-gates)

---

## Recording Learnings

After discovering something useful, record it:

```
record_learning({
  title: "Convex index predicates must use withIndex chaining",
  content: "Using .filter() after .withIndex() bypasses the index...",
  category: "convex",
  tags: ["database", "performance", "gotcha"]
})
```

Search later with:
```
search_all_knowledge({ query: "convex index" })
```

**→ Quick Refs:** Search before implementing: `search_all_knowledge` | `search_learnings` and `list_learnings` are DEPRECATED | Part of flywheel Step 7 | See [Verification Cycle](#verification-cycle-workflow)

---

## Quality Gates

Before shipping, run quality gates:

```
run_quality_gate({
  gateName: "deploy_readiness",
  results: [
    { rule: "tests_pass", passed: true },
    { rule: "no_type_errors", passed: true },
    { rule: "code_reviewed", passed: true }
  ]
})
```

Gate history tracks pass/fail over time.

**→ Quick Refs:** Get preset rules: `get_gate_preset({ preset: "ui_ux_qa" })` | View history: `get_gate_history({ gateName: "..." })` | UI/UX gates: See [Vision](#vision-analysis) | Part of flywheel Step 5 re-verify

---

## Web Research Workflow

For market research or tech evaluation:

```
1. web_search({ query: "MCP servers 2026", maxResults: 10 })
2. search_github({ query: "mcp typescript", minStars: 100 })
3. analyze_repo({ repoUrl: "owner/repo" })  // study top results
4. fetch_url({ url: "https://docs.example.com" })  // read their docs
5. record_learning({ ... })  // save key findings
```

**→ Quick Refs:** Analyze repo structure: `analyze_repo` | Save findings: `record_learning` | Part of: `getMethodology({ topic: "project_ideation" })` | See [Recording Learnings](#recording-learnings)

---

## Project Ideation Workflow

Before building anything new:

```
getMethodology({ topic: "project_ideation" })
```

This returns a 6-step process:
1. Define Concept
2. Research Market
3. Analyze Competition
4. Define Requirements
5. Plan Metrics
6. Gate Approval

**→ Quick Refs:** Research tools: `web_search`, `search_github`, `analyze_repo` | Record requirements: `log_recon_finding` | Create baseline: `start_eval_run` | See [Web Research](#web-research-workflow)

---

## Closed Loop Principle

**Never present changes without full local verification.**

The loop:
1. Compile. Build clean.
2. Lint. Style clean. No warnings.
3. Test. Run automated suites.
4. Self-debug. If 1-3 fail: read logs, hypothesize, fix, restart loop.

Only when all green: present to user.

**→ Quick Refs:** Track loop: `run_closed_loop({ ... })` | Part of flywheel Steps 1-5 | See [AI Flywheel](#the-ai-flywheel-mandatory) | After loop: See [Post-Implementation Checklist](#post-implementation-checklist)

---

## Environment Setup

Check your environment:
```
setup_local_env({ checkSdks: true })
```

Returns:
- Node/npm versions
- Missing API keys
- Recommended SDK installations
- Actionable next steps

**→ Quick Refs:** After setup: `getMethodology("overview")` | Check vision: `discover_vision_env()` | See [API Keys](#api-keys-optional) | Then: See [Verification Cycle](#verification-cycle-workflow)

---

## API Keys (Optional)

Set these for enhanced functionality:

| Key | Purpose |
|-----|---------|
| `GEMINI_API_KEY` | Web search (Google grounding), vision analysis |
| `OPENAI_API_KEY` | Alternative search/vision provider |
| `GITHUB_TOKEN` | Higher rate limits (5000/hr vs 60/hr) |
| `ANTHROPIC_API_KEY` | Alternative vision provider |

**→ Quick Refs:** Check what's available: `setup_local_env({ checkSdks: true })` | Vision capabilities: `discover_vision_env()` | See [Environment Setup](#environment-setup)

---

## Vision Analysis

For UI/UX verification:

```
1. capture_ui_screenshot({ url: "http://localhost:3000", viewport: "desktop" })
2. analyze_screenshot({ imageBase64: "...", prompt: "Check accessibility" })
3. capture_responsive_suite({ url: "...", label: "homepage" })
```

**→ Quick Refs:** Check capabilities: `discover_vision_env()` | UI QA methodology: `getMethodology({ topic: "ui_ux_qa" })` | Agentic vision: `getMethodology({ topic: "agentic_vision" })` | See [Quality Gates](#quality-gates)

---

## Post-Implementation Checklist

After every implementation, answer these 3 questions:

1. **MCP gaps?** — Were all relevant tools called? Any unexpected results?
2. **Implementation gaps?** — Dead code? Missing integrations? Hardcoded values?
3. **Flywheel complete?** — All 7 steps passed including E2E test?

If any answer reveals a gap: fix it before proceeding.

**→ Quick Refs:** Run self-check: `run_self_maintenance({ scope: "quick" })` | Record learnings: `record_learning` | Update docs: `update_agents_md` | See [AI Flywheel](#the-ai-flywheel-mandatory)

---

## Agent Self-Bootstrap System

For agents to self-configure and validate against authoritative sources.

### 1. Discover Existing Infrastructure
```
discover_infrastructure({
  categories: ["agent_loop", "telemetry", "evaluation", "verification"],
  depth: "thorough"
})
```

Returns: discovered patterns, missing components, bootstrap plan.

### 2. Triple Verification (with Source Citations)

Run 3-layer verification with authoritative sources:

```
triple_verify({
  target: "my-feature",
  scope: "full",
  includeWebSearch: true,
  generateInstructions: true
})
```

**V1: Internal Analysis** — Checks codebase patterns
**V2: External Validation** — Cross-references Anthropic, OpenAI, LangChain, MCP spec
**V3: Synthesis** — Generates recommendations with source citations

### 3. Self-Implement Missing Components
```
self_implement({
  component: "telemetry",  // or: agent_loop, evaluation, verification, multi_channel
  dryRun: true
})
```

Generates production-ready templates based on industry patterns.

### 4. Generate Self-Instructions
```
generate_self_instructions({
  format: "skills_md",  // or: rules_md, guidelines, claude_md
  includeExternalSources: true
})
```

Creates persistent instructions with authoritative source citations.

### 5. Multi-Channel Information Gathering
```
connect_channels({
  channels: ["web", "github", "slack", "docs"],
  query: "agent verification patterns",
  aggressive: true
})
```

Aggregates findings from multiple sources.

### Authoritative Sources (Tier 1)
- https://www.anthropic.com/research/building-effective-agents
- https://openai.github.io/openai-agents-python/
- https://www.langchain.com/langgraph
- https://modelcontextprotocol.io/specification/2025-11-25

**→ Quick Refs:** Full methodology: `getMethodology({ topic: "agent_bootstrap" })` | After bootstrap: See [Autonomous Maintenance](#autonomous-self-maintenance-system) | Before implementing: `assess_risk` | See [Triple Verification](#2-triple-verification-with-source-citations)

---

## Autonomous Self-Maintenance System

Aggressive autonomous self-management with risk-aware execution. Based on OpenClaw patterns and Ralph Wiggum stop-hooks.

### 1. Risk-Tiered Execution

Before any action, assess its risk tier:

```
assess_risk({ action: "push to remote" })
```

Risk tiers:
- **Low**: Reading, analyzing, searching — auto-approve
- **Medium**: Writing local files, running tests — log and proceed
- **High**: Pushing to remote, posting externally — require confirmation

### 2. Re-Update Before Create

**CRITICAL:** Before creating new files, check if updating existing is better:

```
decide_re_update({
  targetContent: "New agent instructions",
  contentType: "instructions",
  existingFiles: ["AGENTS.md", "README.md"]
})
```

This prevents file sprawl and maintains single source of truth.

### 3. Self-Maintenance Cycles

Run periodic self-checks:

```
run_self_maintenance({
  scope: "standard",  // quick | standard | thorough
  autoFix: false,
  dryRun: true
})
```

Checks: TypeScript compilation, documentation sync, tool counts, test coverage.

### 4. Directory Scaffolding (OpenClaw Style)

When adding infrastructure, use standardized scaffolding:

```
scaffold_directory({
  component: "agent_loop",  // or: telemetry, evaluation, multi_channel, etc.
  includeTests: true,
  dryRun: true
})
```

Creates organized subdirectories with proper test structure.

### 5. Autonomous Loops with Guardrails

For multi-step autonomous tasks, use controlled loops:

```
run_autonomous_loop({
  goal: "Verify all tools pass static analysis",
  maxIterations: 5,
  maxDurationMs: 60000,
  stopOnFirstFailure: true
})
```

Implements Ralph Wiggum pattern with checkpoints and stop conditions.

**→ Quick Refs:** Full methodology: `getMethodology({ topic: "autonomous_maintenance" })` | Before actions: `assess_risk` | Before new files: `decide_re_update` | Scaffold structure: `scaffold_directory` | See [Self-Bootstrap](#agent-self-bootstrap-system)

---

## Methodology Topics

Available via `getMethodology({ topic: "..." })`:

| Topic | Description | Quick Ref |
|-------|-------------|-----------|
| `overview` | See all methodologies | Start here |
| `verification` | 6-phase development cycle | [AI Flywheel](#the-ai-flywheel-mandatory) |
| `eval` | Test case management | [Quality Gates](#quality-gates) |
| `flywheel` | Continuous improvement loop | [AI Flywheel](#the-ai-flywheel-mandatory) |
| `mandatory_flywheel` | Required verification for changes | [AI Flywheel](#the-ai-flywheel-mandatory) |
| `reconnaissance` | Codebase discovery | [Self-Bootstrap](#agent-self-bootstrap-system) |
| `quality_gates` | Pass/fail checkpoints | [Quality Gates](#quality-gates) |
| `ui_ux_qa` | Frontend verification | [Vision Analysis](#vision-analysis) |
| `agentic_vision` | AI-powered visual QA | [Vision Analysis](#vision-analysis) |
| `closed_loop` | Build/test before presenting | [Closed Loop](#closed-loop-principle) |
| `learnings` | Knowledge persistence | [Recording Learnings](#recording-learnings) |
| `project_ideation` | Validate ideas before building | [Project Ideation](#project-ideation-workflow) |
| `tech_stack_2026` | Dependency management | [Environment Setup](#environment-setup) |
| `agents_md_maintenance` | Keep docs in sync | [Auto-Update](#auto-update-this-file) |
| `agent_bootstrap` | Self-discover, triple verify | [Self-Bootstrap](#agent-self-bootstrap-system) |
| `autonomous_maintenance` | Risk-tiered execution | [Autonomous Maintenance](#autonomous-self-maintenance-system) |
| `parallel_agent_teams` | Multi-agent coordination, task locking, oracle testing | [Parallel Agent Teams](#parallel-agent-teams) |
| `self_reinforced_learning` | Trajectory analysis, self-eval, improvement recs | [Self-Reinforced Learning](#self-reinforced-learning-loop) |
| `toolset_gating` | 4 presets (meta, lite, core, full) and self-escalation | [Toolset Gating & Presets](#toolset-gating--presets) |
| `toon_format` | TOON encoding — ~40% token savings vs JSON | TOON is on by default since v2.14.1 |
| `seo_audit` | Full SEO audit workflow (technical + performance + content) | `seo_audit_url`, `check_page_performance`, `analyze_seo_content` |
| `voice_bridge` | Voice pipeline design, config analysis, scaffolding | `design_voice_pipeline`, `analyze_voice_config` |

**→ Quick Refs:** Find tools: `findTools({ query: "..." })` | Get any methodology: `getMethodology({ topic: "..." })` | See [MCP Tool Categories](#mcp-tool-categories)

---

## Parallel Agent Teams

Based on Anthropic's ["Building a C Compiler with Parallel Claudes"](https://www.anthropic.com/engineering/building-c-compiler) (Feb 2026).

Run multiple AI agents in parallel on a shared codebase with coordination via task locking, role specialization, context budget management, and oracle-based testing.

### Quick Start — Parallel Agents

```
1. get_parallel_status({ includeHistory: true })     // Orient: what's happening?
2. assign_agent_role({ role: "implementer" })         // Specialize
3. claim_agent_task({ taskKey: "fix_auth" })           // Lock task
4. ... do work ...
5. log_context_budget({ eventType: "test_output", tokensUsed: 5000 })  // Track budget
6. run_oracle_comparison({ testLabel: "auth_output", actualOutput: "...", expectedOutput: "...", oracleSource: "prod_v2" })
7. release_agent_task({ taskKey: "fix_auth", status: "completed", progressNote: "Fixed JWT, added tests" })
```

### Predefined Agent Roles

| Role | Focus |
|------|-------|
| `implementer` | Primary feature work. Picks failing tests, implements fixes. |
| `dedup_reviewer` | Finds and coalesces duplicate implementations. |
| `performance_optimizer` | Profiles bottlenecks, optimizes hot paths. |
| `documentation_maintainer` | Keeps READMEs and progress files in sync. |
| `code_quality_critic` | Structural improvements, pattern enforcement. |
| `test_writer` | Writes targeted tests for edge cases and failure modes. |
| `security_auditor` | Audits for vulnerabilities, logs CRITICAL gaps. |

### Key Patterns (from Anthropic blog)

- **Task Locking**: Claim before working. If two agents try the same task, the second picks a different one.
- **Context Window Budget**: Do NOT print thousands of useless bytes. Pre-compute summaries. Use `--fast` mode (1-10% random sample) for large test suites. Log errors with ERROR prefix on same line for grep.
- **Oracle Testing**: Compare output against known-good reference. Each failing comparison is an independent work item for a parallel agent.
- **Time Blindness**: Agents can't tell time. Print progress infrequently. Use deterministic random sampling per-agent but randomized across VMs.
- **Progress Files**: Maintain running docs of status, failed approaches, and remaining tasks. Fresh agent sessions read these to orient.
- **Delta Debugging**: When tests pass individually but fail together, split the set in half to narrow down the minimal failing combination.

### Bootstrap for External Repos

When nodebench-mcp is connected to a project that lacks parallel agent infrastructure, it can auto-detect gaps and scaffold everything needed:

```
1. bootstrap_parallel_agents({ projectRoot: "/path/to/their/repo", dryRun: true })
   // Scans 7 categories: task coordination, roles, oracle, context budget,
   // progress files, AGENTS.md parallel section, git worktrees

2. bootstrap_parallel_agents({ projectRoot: "...", dryRun: false, techStack: "TypeScript/React" })
   // Creates .parallel-agents/ dir, progress.md, roles.json, lock dirs, oracle dirs

3. generate_parallel_agents_md({ techStack: "TypeScript/React", projectName: "their-project", maxAgents: 4 })
   // Generates portable AGENTS.md section — paste into their repo

4. Run the 6-step flywheel plan returned by the bootstrap tool to verify
5. Fix any issues, re-verify
6. record_learning({ key: "bootstrap_their_project", content: "...", category: "pattern" })
```

The generated AGENTS.md section is framework-agnostic and works with any AI agent (Claude, GPT, etc.). It includes:
- Task locking protocol (file-based, no dependencies)
- Role definitions and assignment guide
- Oracle testing workflow with idiomatic examples
- Context budget rules
- Progress file protocol
- Anti-patterns to avoid
- Optional nodebench-mcp tool mapping table

### MCP Prompts for Parallel Agent Teams

- `parallel-agent-team` — Full team setup with role assignment and task breakdown
- `oracle-test-harness` — Oracle-based testing setup for a component
- `bootstrap-parallel-agents` — Detect and scaffold parallel agent infra for any external repo

**→ Quick Refs:** Full methodology: `getMethodology({ topic: "parallel_agent_teams" })` | Find parallel tools: `findTools({ category: "parallel_agents" })` | Bootstrap external repo: `bootstrap_parallel_agents({ projectRoot: "..." })` | See [AI Flywheel](#the-ai-flywheel-mandatory)

---

## Auto-Update This File

Agents can self-update this file:

```
update_agents_md({
  operation: "update_section",
  section: "Custom Section",
  content: "New content here...",
  projectRoot: "/path/to/project"
})
```

Or read current structure:
```
update_agents_md({ operation: "read", projectRoot: "/path/to/project" })
```

**→ Quick Refs:** Before updating: `decide_re_update({ contentType: "instructions", ... })` | After updating: Run flywheel Steps 1-7 | See [Re-Update Before Create](#2-re-update-before-create)

---

## License

MIT — Use freely in any project.
