# NodeBench MCP

**Make AI agents catch the bugs they normally ship.**

One command gives your agent structured research, risk assessment, 3-layer testing, quality gates, and a persistent knowledge base — so every fix is thorough and every insight compounds into future work.

```bash
# Default (50 tools) - complete AI Flywheel methodology
claude mcp add nodebench -- npx -y nodebench-mcp

# Full (175 tools) - everything including vision, web, files, etc.
claude mcp add nodebench -- npx -y nodebench-mcp --preset full
```

---

## Why — What Bare Agents Miss

We benchmarked 9 real production prompts — things like *"The LinkedIn posting pipeline is creating duplicate posts"* and *"The agent loop hits budget but still gets new events"* — comparing a bare agent vs one with NodeBench MCP.

| What gets measured | Bare Agent | With NodeBench MCP |
|---|---|---|
| Issues detected before deploy | 0 | **13** (4 high, 8 medium, 1 low) |
| Research findings before coding | 0 | **21** |
| Risk assessments | 0 | **9** |
| Test coverage layers | 1 | **3** (static + unit + integration) |
| Integration failures caught early | 0 | **4** |
| Regression eval cases created | 0 | **22** |
| Quality gate rules enforced | 0 | **52** |
| Deploys blocked by gate violations | 0 | **4** |
| Knowledge entries banked | 0 | **9** |
| Blind spots shipped to production | **26** | **0** |

The bare agent reads the code, implements a fix, runs tests once, and ships. The MCP agent researches first, assesses risk, tracks issues to resolution, runs 3-layer tests, creates regression guards, enforces quality gates, and banks everything as knowledge for next time.

Every additional tool call produces a concrete artifact — an issue found, a risk assessed, a regression guarded — that compounds across future tasks.

---

## Who's Using It

**Vision engineer** — Built agentic vision analysis using GPT 5.2 with Set-of-Mark (SoM) for boundary boxing, similar to Google Gemini 3 Flash's agentic code execution approach. Uses NodeBench's verification pipeline to validate detection accuracy across screenshot variants before shipping model changes. (Uses `full` preset for vision tools)

**QA engineer** — Transitioned a manual QA workflow website into an AI agent-driven app for a pet care messaging platform. Uses NodeBench's quality gates, verification cycles, and eval runs to ensure the AI agent handles edge cases that manual QA caught but bare AI agents miss. (Uses `default` preset — all core AI Flywheel tools)

Both found different subsets of the tools useful — which is why NodeBench ships with just 2 `--preset` levels. The `default` preset (50 tools) covers the complete AI Flywheel methodology with ~76% fewer tools. Add `--preset full` for specialized tools (vision, web, files, parallel agents, security).

---

## How It Works — 3 Real Examples

### Example 1: Bug fix

You type: *"The content queue has 40 items stuck in 'judging' status for 6 hours"*

**Bare agent:** Reads the queue code, finds a potential fix, runs tests, ships.

**With NodeBench MCP:** The agent runs structured recon and discovers 3 blind spots the bare agent misses:
- No retry backoff on OpenRouter rate limits (HIGH)
- JSON regex `match(/\{[\s\S]*\}/)` grabs last `}` — breaks on multi-object responses (MEDIUM)
- No timeout on LLM call — hung request blocks entire cron for 15+ min (not detected by unit tests)

All 3 are logged as gaps, resolved, regression-tested, and the patterns banked so the next similar bug is fixed faster.

### Example 2: Parallel agents overwriting each other

You type: *"I launched 3 Claude Code subagents but they keep overwriting each other's changes"*

**Without NodeBench:** Both agents see the same bug and both implement a fix. The third agent re-investigates what agent 1 already solved. Agent 2 hits context limit mid-fix and loses work.

**With NodeBench MCP:** Each subagent calls `claim_agent_task` to lock its work. Roles are assigned so they don't overlap. Context budget is tracked. Progress notes ensure handoff without starting from scratch.

### Example 3: Knowledge compounding

Tasks 1-3 start with zero prior knowledge. By task 9, the agent finds 2+ relevant prior findings before writing a single line of code. Bare agents start from zero every time.

---

## Quick Start

### Install (30 seconds)

```bash
# Default (50 tools) - complete AI Flywheel methodology
claude mcp add nodebench -- npx -y nodebench-mcp

# Full (175 tools) - everything including vision, UI capture, web, GitHub, docs, parallel, local files, GAIA solvers
claude mcp add nodebench -- npx -y nodebench-mcp --preset full
```

Or add to `~/.claude/settings.json` or `.claude.json`:

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

### First prompts to try

```
# See what's available
> Use discover_tools("verify my implementation") to find relevant tools

# Get methodology guidance
> Use getMethodology("overview") to see all workflows

# Before your next task — search for prior knowledge
> Use search_all_knowledge("what I'm about to work on")

# Run the full verification pipeline on a change
> Use getMethodology("mandatory_flywheel") and follow the 6 steps
```

### Usage Analytics & Smart Presets

NodeBench MCP tracks tool usage locally and can recommend optimal presets based on your project type and usage patterns.

**Get smart preset recommendation:**
```bash
npx nodebench-mcp --smart-preset
```

This analyzes your project (detects language, framework, project type) and usage history to recommend the best preset.

**View usage statistics:**
```bash
npx nodebench-mcp --stats
```

Shows tool usage patterns, most used toolsets, and success rates for the last 30 days.

**Export usage data:**
```bash
npx nodebench-mcp --export-stats > usage-stats.json
```

**List all available presets:**
```bash
npx nodebench-mcp --list-presets
```

**Clear analytics data:**
```bash
npx nodebench-mcp --reset-stats
```

All analytics data is stored locally in `~/.nodebench/analytics.db` and never leaves your machine.

### Optional: API keys for web search and vision

```bash
export GEMINI_API_KEY="your-key"        # Web search + vision (recommended)
export GITHUB_TOKEN="your-token"        # GitHub (higher rate limits)
```

### Capability benchmarking (GAIA, gated)

NodeBench MCP treats tools as "Access". To measure real capability lift, we benchmark baseline (LLM-only) vs tool-augmented accuracy on GAIA (gated).

Notes:
- GAIA fixtures and attachments are written under `.cache/gaia` (gitignored). Do not commit GAIA content.
- Fixture generation requires `HF_TOKEN` or `HUGGINGFACE_HUB_TOKEN`.

Web lane (web_search + fetch_url):
```bash
npm run mcp:dataset:gaia:capability:refresh
NODEBENCH_GAIA_CAPABILITY_TASK_LIMIT=6 NODEBENCH_GAIA_CAPABILITY_CONCURRENCY=1 npm run mcp:dataset:gaia:capability:test
```

File-backed lane (PDF / XLSX / CSV / DOCX / PPTX / JSON / JSONL / TXT / ZIP via `local_file` tools):
```bash
npm run mcp:dataset:gaia:capability:files:refresh
NODEBENCH_GAIA_CAPABILITY_TASK_LIMIT=6 NODEBENCH_GAIA_CAPABILITY_CONCURRENCY=1 npm run mcp:dataset:gaia:capability:files:test
```

Modes:
- Stable: `NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE=rag`
- More realistic: `NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE=agent`

Notes:
- ZIP attachments require `NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE=agent` (multi-step extract -> parse).

---

## What You Get

### The AI Flywheel — Core Methodology

The `default` preset (50 tools) gives you the complete AI Flywheel methodology from [AI_FLYWHEEL.md](https://github.com/HomenShum/nodebench-ai/blob/main/AI_FLYWHEEL.md):

```
Research → Risk → Implement → Test (3 layers) → Eval → Gate → Learn → Ship
    ↑                                                              │
    └──────────── knowledge compounds ─────────────────────────────┘
```

**Inner loop** (per change): 6-phase verification ensures correctness.
**Outer loop** (over time): Eval-driven development ensures improvement.

### Recommended Workflow: Start with Default

The `default` preset includes 50 tools in 3 groups:

1. **Discovery tools (6)** — *"What tool should I use?"* — `findTools`, `getMethodology`, `check_mcp_setup`, `discover_tools`, `get_tool_quick_ref`, `get_workflow_chain`. These help agents find the right tool via keyword search, 14-strategy hybrid search, workflow chains, and methodology guides.

2. **Dynamic loading tools (6)** — *"Add/remove tools from my session"* — `load_toolset`, `unload_toolset`, `list_available_toolsets`, `call_loaded_tool`, `smart_select_tools`, `get_ab_test_report`. These let agents manage their own context budget by loading toolsets on demand and unloading them when done.

3. **Core methodology (38)** — *"Do the work"* — verification (8), eval (6), quality_gate (4), learning (4), flywheel (4), recon (7), security (3), boilerplate (2). These are the AI Flywheel tools that enforce structured research, risk assessment, 3-layer testing, quality gates, and persistent knowledge.

**Self-escalate**: Add `--preset full` when you need vision, web, files, or parallel agents.

This approach minimizes token overhead while ensuring agents have access to the complete methodology when needed.

### Core workflow (use these every session)

| When you... | Use this | Impact |
|---|---|---|
| Start any task | `search_all_knowledge` | Find prior findings — avoid repeating past mistakes |
| Research before coding | `run_recon` + `log_recon_finding` | Structured research with surfaced findings |
| Assess risk before acting | `assess_risk` | Risk tier determines if action needs confirmation |
| Track implementation | `start_verification_cycle` + `log_gap` | Issues logged with severity, tracked to resolution |
| Test thoroughly | `log_test_result` (3 layers) | Static + unit + integration vs running tests once |
| Guard against regression | `start_eval_run` + `record_eval_result` | Eval cases that protect this fix in the future |
| Gate before deploy | `run_quality_gate` | Boolean rules enforced — violations block deploy |
| Bank knowledge | `record_learning` | Persisted findings compound across future sessions |
| Verify completeness | `run_mandatory_flywheel` | 6-step minimum — catches dead code and intent mismatches |

### When running parallel agents (Claude Code subagents, worktrees)

| When you... | Use this | Impact | Preset |
|---|---|---|---|
| Prevent duplicate work | `claim_agent_task` / `release_agent_task` | Task locks — each task owned by exactly one agent | `full` |
| Specialize agents | `assign_agent_role` | 7 roles: implementer, test_writer, critic, etc. | `full` |
| Track context usage | `log_context_budget` | Prevents context exhaustion mid-fix | `full` |
| Validate against reference | `run_oracle_comparison` | Compare output against known-good oracle | `full` |
| Orient new sessions | `get_parallel_status` | See what all agents are doing and what's blocked | `full` |
| Bootstrap any repo | `bootstrap_parallel_agents` | Auto-detect gaps, scaffold coordination infra | `full` |

**Note:** Parallel agent coordination tools are only available in the `full` preset. For single-agent workflows, the `default` preset provides all the core AI Flywheel tools you need.

### Research and discovery

| When you... | Use this | Impact | Preset |
|---|---|---|---|
| Search the web | `web_search` | Gemini/OpenAI/Perplexity — latest docs and updates | `full` |
| Fetch a URL | `fetch_url` | Read any page as clean markdown | `full` |
| Find GitHub repos | `search_github` + `analyze_repo` | Discover and evaluate libraries and patterns | `full` |
| Analyze screenshots | `analyze_screenshot` | AI vision (Gemini 3 Flash/GPT-5-mini/Claude) for UI QA | `full` |

**Note:** Web search, GitHub, and vision tools are only available in the `full` preset. The `default` preset focuses on the core AI Flywheel methodology (verification, eval, learning, recon, flywheel, security, boilerplate).

---

## Impact-Driven Methodology

Every tool call, methodology step, and workflow path must answer: **"What concrete thing did this produce?"**

| Tool / Phase | Concrete Impact |
|---|---|
| `run_recon` + `log_recon_finding` | N findings surfaced before writing code |
| `assess_risk` | Risk tier assigned - HIGH triggers confirmation before action |
| `start_verification_cycle` + `log_gap` | N issues detected with severity, all tracked to resolution |
| `log_test_result` (3 layers) | 3x test coverage vs single-layer; catches integration failures |
| `start_eval_run` + `record_eval_result` | N regression cases protecting against future breakage |
| `run_quality_gate` | N gate rules enforced; violations blocked before deploy |
| `record_learning` + `search_all_knowledge` | Knowledge compounds - later tasks reuse prior findings |
| `run_mandatory_flywheel` | 6-step minimum verification; catches dead code and intent mismatches |

The comparative benchmark validates this with 9 real production scenarios:
- 13 issues detected (4 HIGH, 8 MEDIUM, 1 LOW) - bare agent ships all of them
- 21 recon findings before implementation
- 26 blind spots prevented
- Knowledge compounding: 0 hits on task 1 → 2+ hits by task 9

---

## Progressive Discovery

The `default` preset (50 tools) provides the complete AI Flywheel methodology with discovery built in. The progressive disclosure system helps agents find exactly what they need:

### Multi-modal search engine

```
> discover_tools("verify my implementation")
```

The `discover_tools` search engine scores tools using **14 parallel strategies** (including Agent-as-a-Graph bipartite embedding search):

| Strategy | What it does | Example |
|---|---|---|
| Keyword | Exact/partial word matching on name, tags, description | "benchmark" → `benchmark_models` |
| Fuzzy | Levenshtein distance — tolerates typos | "verifiy" → `start_verification_cycle` |
| N-gram | Trigram similarity for partial words | "screen" → `capture_ui_screenshot` |
| Prefix | Matches tool name starts | "cap" → `capture_*` tools |
| Semantic | Synonym expansion (30 word families) | "check" also finds "verify", "validate" |
| TF-IDF | Rare tags score higher than common ones | "c-compiler" scores higher than "test" |
| Regex | Pattern matching | `"^run_.*loop$"` → `run_closed_loop` |
| Bigram | Phrase matching | "quality gate" matched as unit |
| Domain boost | Related categories boosted together | verification + quality_gate cluster |
| Dense | TF-IDF cosine similarity for vector-like ranking | "audit compliance" surfaces related tools |

**7 search modes**: `hybrid` (default, all strategies), `fuzzy`, `regex`, `prefix`, `semantic`, `exact`, `dense`

Pass `explain: true` to see exactly which strategies contributed to each score.

### Quick refs — what to do next

Every tool response auto-appends a `_quickRef` with:
- **nextAction**: What to do immediately after this tool
- **nextTools**: Recommended follow-up tools
- **methodology**: Which methodology guide to consult
- **tip**: Practical usage advice

Call `get_tool_quick_ref("tool_name")` for any tool's guidance.

### Workflow chains — step-by-step recipes

24 pre-built chains for common workflows:

| Chain | Steps | Use case |
|---|---|---|
| `new_feature` | 12 | End-to-end feature development |
| `fix_bug` | 6 | Structured debugging |
| `ui_change` | 7 | Frontend with visual verification |
| `parallel_project` | 7 | Multi-agent coordination |
| `research_phase` | 8 | Context gathering |
| `academic_paper` | 7 | Paper writing pipeline |
| `c_compiler_benchmark` | 10 | Autonomous capability test |
| `security_audit` | 9 | Comprehensive security assessment |
| `code_review` | 8 | Structured code review |
| `deployment` | 8 | Ship with full verification |
| `migration` | 10 | SDK/framework upgrade |
| `coordinator_spawn` | 10 | Parallel coordinator setup |
| `self_setup` | 8 | Agent self-onboarding |
| `flicker_detection` | 7 | Android flicker analysis |
| `figma_flow_analysis` | 5 | Figma prototype flow audit |
| `agent_eval` | 9 | Evaluate agent performance |
| `contract_compliance` | 5 | Check agent contract adherence |
| `ablation_eval` | 10 | Ablation experiment design |
| `session_recovery` | 6 | Recover context after compaction |
| `attention_refresh` | 4 | Reload bearings mid-session |
| `task_bank_setup` | 9 | Create evaluation task banks |
| `pr_review` | 5 | Pull request review |
| `seo_audit` | 6 | Full SEO audit |
| `voice_pipeline` | 6 | Voice pipeline implementation |

Call `get_workflow_chain("new_feature")` to get the step-by-step sequence.

### Boilerplate template

Start new projects with everything pre-configured:

```bash
gh repo create my-project --template HomenShum/nodebench-boilerplate --clone
cd my-project && npm install
```

Or use the scaffold tool: `scaffold_nodebench_project` creates AGENTS.md, .mcp.json, package.json, CI, Docker, and parallel agent infra.

---

## The Methodology Pipeline

NodeBench MCP isn't just a bag of tools — it's a pipeline. Each step feeds the next:

```
Research → Risk → Implement → Test (3 layers) → Eval → Gate → Learn → Ship
    ↑                                                              │
    └──────────── knowledge compounds ─────────────────────────────┘
```

**Inner loop** (per change): 6-phase verification ensures correctness.
**Outer loop** (over time): Eval-driven development ensures improvement.
**Together**: The AI Flywheel — every verification produces eval artifacts, every regression triggers verification.

### The 6-Phase Verification Process (Inner Loop)

Every non-trivial change should go through these 6 steps:

1. **Context Gathering** — Parallel subagent deep dive into SDK specs, implementation patterns, dispatcher/backend audit, external API research
2. **Gap Analysis** — Compare findings against current implementation, categorize gaps (CRITICAL/HIGH/MEDIUM/LOW)
3. **Implementation** — Apply fixes following production patterns exactly
4. **Testing & Validation** — 5 layers: static analysis, unit tests, integration tests, manual verification, live end-to-end
5. **Self-Closed-Loop Verification** — Parallel verification subagents check spec compliance, functional correctness, argument compatibility
6. **Document Learnings** — Update documentation with edge cases and key learnings

### The Eval-Driven Development Loop (Outer Loop)

1. **Run Eval Batch** — Send test cases through the target workflow
2. **Capture Telemetry** — Collect complete agent execution trace
3. **LLM-as-Judge Analysis** — Score goal alignment, tool efficiency, output quality
4. **Retrieve Results** — Aggregate pass/fail rates and improvement suggestions
5. **Fix, Optimize, Enhance** — Apply changes based on judge feedback
6. **Re-run Evals** — Deploy only if scores improve

**Rule: No change ships without an eval improvement.**

Ask the agent: `Use getMethodology("overview")` to see all 20 methodology topics.

---

## Parallel Agents with Claude Code

Based on Anthropic's ["Building a C Compiler with Parallel Claudes"](https://www.anthropic.com/engineering/building-c-compiler) (Feb 2026).

**When to use:** Only when running 2+ agent sessions. Single-agent workflows use the standard pipeline above.

**How it works with Claude Code's Task tool:**

1. **COORDINATOR** (your main session) breaks work into independent tasks
2. Each **Task tool** call spawns a subagent with instructions to:
   - `claim_agent_task` — lock the task
   - `assign_agent_role` — specialize (implementer, test_writer, critic, etc.)
   - Do the work
   - `release_agent_task` — handoff with progress note
3. Coordinator calls `get_parallel_status` to monitor all subagents
4. Coordinator runs `run_quality_gate` on the aggregate result

**MCP Prompts available:**
- `claude-code-parallel` — Step-by-step Claude Code subagent coordination
- `parallel-agent-team` — Full team setup with role assignment
- `oracle-test-harness` — Validate outputs against known-good reference
- `bootstrap-parallel-agents` — Scaffold parallel infra for any repo

**Note:** Parallel agent coordination tools are only available in the `full` preset. For single-agent workflows, the `default` preset provides all the core AI Flywheel tools you need.

---

## Toolset Gating

The default preset (50 tools) gives you the complete AI Flywheel methodology with ~78% fewer tools compared to the full suite (175 tools).

### Presets — Choose What You Need

| Preset | Tools | Domains | Use case |
|---|---|---|---|
| **default** ⭐ | **50** | 7 | **Recommended** — Complete AI Flywheel: verification, eval, quality_gate, learning, flywheel, recon, boilerplate + discovery + dynamic loading |
| `full` | 175 | 34 | Everything — vision, UI capture, web, GitHub, docs, parallel, local files, GAIA solvers, security, email, RSS, architect |

```bash
# ⭐ Recommended: Default (50 tools) - complete AI Flywheel
claude mcp add nodebench -- npx -y nodebench-mcp

# Everything: All 175 tools
claude mcp add nodebench -- npx -y nodebench-mcp --preset full
```

Or in config:

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

### Scaling MCP: How We Solved the 5 Biggest Industry Problems

MCP tool servers face 5 systemic problems documented across Anthropic, Microsoft Research, and the open-source community. We researched each one, built solutions, and tested them with automated eval harnesses. Here's the full breakdown — problem by problem.

---

#### Problem 1: Context Bloat (too many tool definitions eat the context window)

**The research**: Anthropic measured that 58 tools from 5 MCP servers consume **~55K tokens** before the conversation starts. At 175 tools, NodeBench would consume ~87K tokens — up to 44% of a 200K context window just on tool metadata. [Microsoft Research](https://www.microsoft.com/en-us/research/blog/tool-space-interference-in-the-mcp-era-designing-for-agent-compatibility-at-scale/) found LLMs "decline to act at all when faced with ambiguous or excessive tool options." [Cursor enforces a ~40-tool hard cap](https://www.lunar.dev/post/why-is-there-mcp-tool-overload-and-how-to-solve-it-for-your-ai-agents) for this reason.

**Our solutions** (layered, each independent):

| Layer | What it does | Token savings | Requires |
|---|---|---|---|
| Themed presets (`--preset web_dev`) | Load only relevant toolsets (44-60 tools vs 175) | **60-75%** | Nothing |
| TOON encoding (on by default) | Encode all tool responses in token-optimized format | **~40%** on responses | Nothing |
| `discover_tools({ compact: true })` | Return `{ name, category, hint }` only | **~60%** on search results | Nothing |
| `instructions` field (Claude Code) | Claude Code defers tool loading, searches on demand | **~85%** | Claude Code client |
| `smart_select_tools` (LLM-powered) | Fast model picks 8 best tools from compact catalog | **~95%** | Any API key |

**How we tested**: The A/B harness (`scripts/ab-test-harness.ts`) measures tool counts, token overhead, and success rates across 28 scenarios in both static and dynamic modes. TOON savings validated by comparing JSON vs TOON serialized sizes across all tool responses.

---

#### Problem 2: Tool Selection Degradation (LLMs pick the wrong tool as count increases)

**The research**: [Anthropic's Tool Search Tool](https://www.anthropic.com/engineering/advanced-tool-use) improved accuracy from **49% → 74%** (Opus 4) and **79.5% → 88.1%** (Opus 4.5) by switching from all-tools-upfront to on-demand discovery. The [Dynamic ReAct paper (arxiv 2509.20386)](https://arxiv.org/html/2509.20386v1) tested 5 architectures and found **Search + Load** wins — flat search + deliberate loading beats hierarchical app→tool search.

**Our solution**: `discover_tools` — a 14-strategy hybrid search engine that finds the right tool from 175 candidates:

| Strategy | What it does | Example |
|---|---|---|
| Keyword + TF-IDF | Rare tags score higher than common ones | "c-compiler" scores higher than "test" |
| Fuzzy (Levenshtein) | Tolerates typos | "verifiy" → `start_verification_cycle` |
| Semantic (synonyms) | Expands 30 word families | "check" also finds "verify", "validate" |
| N-gram + Bigram | Partial words and phrases | "screen" → `capture_ui_screenshot` |
| Dense (TF-IDF cosine) | Vector-like ranking | "audit compliance" surfaces related tools |
| Embedding (neural) | Agent-as-a-Graph bipartite RRF | Based on [arxiv 2511.01854](https://arxiv.org/html/2511.01854v1) |
| Execution traces | Co-occurrence mining from `tool_call_log` | Tools frequently used together boost each other |
| Intent pre-filter | Narrow to relevant categories before search | `intent: "data_analysis"` → only local_file, llm, benchmark |

Plus `smart_select_tools` for ambiguous queries — sends the catalog to Gemini 3 Flash / GPT-5-mini / Claude Haiku 4.5 for LLM-powered reranking.

**How we tested**: 28 scenarios with expected-toolset ground truth. The harness checks if `_loadSuggestions` points to the correct toolset for each domain query.

| What we measured | Result |
|---|---|
| Discovery accuracy | **18/18 (100%)** — correct toolset suggested for every domain |
| Domains covered | File I/O, email, GitHub, academic writing, SEO, git, Figma, CI/CD, browser automation, database, security, LLM, monitoring |
| Natural language queries | "I need to look at what's in this zip file" → `local_file` ✓ |
| Zero-match graceful degradation | "deploy Kubernetes pods" → closest tools, no errors ✓ |

---

#### Problem 3: Static Loading (all tools loaded upfront, even if unused)

**The research**: The Dynamic ReAct paper found that **Search + Load with 2 meta tools** beats all other architectures. Hierarchical search (search apps → search tools → load) adds overhead without improving accuracy. [ToolScope (arxiv 2510.20036)](https://arxiv.org/html/2510.20036) showed **+34.6%** tool selection accuracy with hybrid retrieval + tool deduplication.

**Our solution**: `--dynamic` flag enables Search + Load:

```bash
npx nodebench-mcp --dynamic
```

```
> discover_tools("analyze screenshot for UI bugs")
# _loadSuggestions: [{ toolset: "vision", action: "load_toolset('vision')" }]

> load_toolset("vision")
# 4 vision tools now directly bound (not indirected through a proxy)

> unload_toolset("vision")
# Tools removed, token budget recovered
```

Key design decisions from the research:
- **No hierarchical search** — Dynamic ReAct Section 3.4: "search_apps introduces an additional call without significantly improving accuracy"
- **Direct tool binding** — Dynamic ReAct Section 3.5: LLMs perform best with directly bound tools; `call_tool` indirection degrades in long conversations
- **Full-registry search** — `discover_tools` searches all 175 tools even with 44 loaded, so it can suggest what to load

**How we tested**: Automated A/B harness + live IDE session.

| What we measured | Result |
|---|---|
| Scenarios tested | **28** aligned to [real MCP usage data](https://towardsdatascience.com/mcp-in-practice/) — Web/Browser (24.8%), SWE (24.7%), DB/Search (23.1%), File Ops, Comms, Design, Security, AI, Monitoring |
| Success rate | **100%** across 128 tool calls per round (both modes) |
| Load latency | **<1ms** per `load_toolset` call |
| Long sessions | 6 loads + 2 unloads in a single session — correct tool count at every step |
| Burst performance | 6 consecutive calls averaging **1ms** each |
| Live agent test | Verified in real Windsurf session: load, double-load (idempotent), unload, unload-protection |
| Unit tests | **266 passing** (24 dedicated to dynamic loading) |
| Bugs found during testing | 5 (all fixed) — most critical: search results only showed loaded tools, not full registry |

---

#### Problem 4: Client Fragmentation (not all clients handle dynamic tool updates)

**The research**: The MCP spec defines `notifications/tools/list_changed` for servers to tell clients to re-fetch the tool list. But [Cursor hasn't implemented it](https://forum.cursor.com/t/enhance-mcp-integration-in-cursor-dynamic-tool-updates-roots-support-progress-tokens-streamable-http/99903), [Claude Desktop didn't support it](https://github.com/orgs/modelcontextprotocol/discussions/76) (as of Dec 2024), and [Gemini CLI has an open issue](https://github.com/google-gemini/gemini-cli/issues/13850).

**Our solution**: Two-tier compatibility — native `list_changed` for clients that support it, plus a `call_loaded_tool` proxy fallback for those that don't.

| Client | Dynamic Loading | How |
|---|---|---|
| **Claude Code** | ✅ Native | Re-fetches tools automatically after `list_changed` |
| **GitHub Copilot** | ✅ Native | Same |
| **Windsurf / Cursor / Claude Desktop / Gemini CLI / LibreChat** | ✅ Via fallback | `call_loaded_tool` proxy (always in tool list) |

```
> load_toolset("vision")
# Response includes: toolNames: ["analyze_screenshot", "manipulate_screenshot", ...]

> call_loaded_tool({ tool: "analyze_screenshot", args: { imagePath: "page.png" } })
# Dispatches internally — works on ALL clients
```

**How we tested**: Server-side verification in the A/B harness proves correct `tools/list` updates:

```
tools/list BEFORE:       95 tools
load_toolset("voice_bridge")
tools/list AFTER:        99 tools (+4)    ← new tools visible
call_loaded_tool proxy:  ✓ OK            ← fallback dispatch works
unload_toolset("voice_bridge")
tools/list AFTER UNLOAD: 95 tools (-4)   ← tools removed
```

---

#### Problem 5: Aggressive Filtering (over-filtering means the right tool isn't found)

**The research**: This is the flip side of Problem 1. If you reduce context aggressively (e.g., keyword-only search), ambiguous queries like "call an AI model" fail to match the `llm` toolset because every tool mentions "AI" in its description. [SynapticLabs' Bounded Context Packs](https://blog.synapticlabs.ai/bounded-context-packs-tool-bloat-tipping-point) addresses this with progressive disclosure. [SEP-1576](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1576) proposes adaptive granularity at the protocol level.

**Our solutions** (3 tiers, progressively smarter):

**Tier 1 — Intent pre-filter (no API key):**
```
> discover_tools({ query: "parse a CSV file", intent: "data_analysis" })
# Narrows search to: local_file, llm, benchmark categories only
# 15 intents: file_processing, web_research, code_quality, security_audit,
#   academic_writing, data_analysis, llm_interaction, visual_qa, devops_ci,
#   team_coordination, communication, seo_audit, design_review, voice_ui, project_setup
```

**Tier 2 — LLM-powered selection (API key):**
```
> smart_select_tools({ task: "parse a PDF, extract tables, email a summary" })
# Sends compact catalog (~4K tokens: name + category + 5 tags per tool) to
# Gemini 3 Flash / GPT-5-mini / Claude Haiku 4.5
# Returns the 8 best tools + _loadSuggestions for unloaded toolsets
# Falls back to heuristic search if no API key is set
```

**Tier 3 — Embedding search (optional):**
Neural bipartite graph search (tool nodes + domain nodes) based on [Agent-as-a-Graph (arxiv 2511.18194)](https://arxiv.org/html/2511.18194). Enable with `--embedding` or set `OPENAI_API_KEY` / `GEMINI_API_KEY`.

**How we tested**: The `llm_model_interaction` scenario in the A/B harness specifically tests this — the query "call LLM generate prompt GPT Claude Gemini" must surface the `llm` toolset in `_loadSuggestions`. A tag coverage bonus in hybrid search ensures tools where many query words match tags rank highest. For even more ambiguous queries, `smart_select_tools` lets an LLM pick the right tools semantically.

---

#### Summary: research → solution → eval for each problem

| Problem | Research Source | Our Solution | Eval Method | Result |
|---|---|---|---|---|
| **Context bloat** (87K tokens) | Anthropic (85% reduction), Lunar.dev (~40-tool cap), SEP-1576 | Presets, TOON, compact mode, `instructions`, `smart_select_tools` | A/B harness token measurement | 60-95% reduction depending on layer |
| **Selection degradation** | Anthropic (+25pp), Dynamic ReAct (Search+Load wins) | 14-strategy hybrid search, intent pre-filter, LLM reranking | 28-scenario discovery accuracy | **100% accuracy** (18/18 domains) |
| **Static loading** | Dynamic ReAct, ToolScope (+34.6%), MCP spec | `--dynamic` flag, `load_toolset` / `unload_toolset` | A/B harness + live IDE test | **100% success**, <1ms load latency |
| **Client fragmentation** | MCP discussions, client bug trackers | `list_changed` + `call_loaded_tool` proxy | Server-side `tools/list` verification | Works on **all clients** |
| **Aggressive filtering** | SynapticLabs, SEP-1576, our own `llm` gap | Intent pre-filter, `smart_select_tools`, embeddings | `llm_model_interaction` scenario | LLM-powered selection solves the gap |

**Ablation study** (`scripts/ablation-test.ts`): We tested which strategies matter for each user segment by disabling them one at a time across 54 queries:

| Segment | R@5 Baseline | Most Critical Strategy | Impact When Removed |
|---|---|---|---|
| **New user** (vague, natural language) | 67% | Synonym expansion | 🔴 -17pp R@5 |
| **Experienced** (domain keywords) | 72% | All robust | ⚪ No single strategy >5pp |
| **Power user** (exact tool names) | 100% | None needed | ⚪ Keyword alone = 100% |

Key insight: new users need synonym expansion ("website" → seo, "AI" → llm) and fuzzy matching (typo tolerance). Power users need nothing beyond keyword matching. The remaining 33% new user gap is filled by `smart_select_tools` (LLM-powered).

Full methodology, per-scenario breakdown, ablation data, and research citations: [DYNAMIC_LOADING.md](./DYNAMIC_LOADING.md)

### Fine-grained control

```bash
# Include only specific toolsets
npx nodebench-mcp --toolsets verification,eval,recon

# Exclude heavy optional-dep toolsets
npx nodebench-mcp --exclude vision,ui_capture,parallel

# See all toolsets and presets
npx nodebench-mcp --help
```

### Available toolsets

| Toolset | Tools | What it covers | In `default` |
|---|---|---|---|
| verification | 8 | Cycles, gaps, triple-verify, status | ✅ |
| eval | 6 | Eval runs, results, comparison, diff | ✅ |
| quality_gate | 4 | Gates, presets, history | ✅ |
| learning | 4 | Knowledge, search, record | ✅ |
| recon | 7 | Research, findings, framework checks, risk | ✅ |
| flywheel | 4 | Mandatory flywheel, promote, investigate | ✅ |
| security | 3 | Dependency scanning, code analysis, terminal security scanning | ✅ |
| **Total** | **44** | **Complete AI Flywheel** |
| boilerplate | 2 | Scaffold NodeBench projects + status | ✅ |
| bootstrap | 11 | Project setup, agents.md, self-implement, autonomous, test runner | — |
| self_eval | 9 | Trajectory analysis, health reports, task banks, grading, contract compliance | — |
| parallel | 13 | Task locks, roles, context budget, oracle, agent mailbox | — |
| vision | 4 | Screenshot analysis, UI capture, diff | — |
| ui_capture | 2 | Playwright-based capture | — |
| web | 2 | Web search, URL fetch | — |
| github | 3 | Repo search, analysis, monitoring | — |
| docs | 4 | Documentation generation, reports | — |
| local_file | 19 | Deterministic parsing (CSV/XLSX/PDF/DOCX/PPTX/ZIP/JSON/JSONL/TXT/OCR/audio) | — |
| llm | 3 | LLM calling, extraction, benchmarking | — |
| platform | 4 | Convex bridge: briefs, funding, research, publish | — |
| research_writing | 8 | Academic paper polishing, translation, de-AI, logic check, captions | — |
| flicker_detection | 5 | Android flicker detection + SSIM tooling | — |
| figma_flow | 4 | Figma flow analysis + rendering | — |
| benchmark | 3 | Autonomous benchmark lifecycle | — |
| session_memory | 3 | Compaction-resilient notes, attention refresh, context reload | — |
| gaia_solvers | 6 | GAIA media image solvers | — |
| toon | 2 | TOON encode/decode (~40% token savings) | — |
| pattern | 2 | Session pattern mining + risk prediction | — |
| git_workflow | 3 | Branch compliance, PR checklist review, merge gate | — |
| seo | 5 | Technical SEO audit, page performance, content analysis | — |
| voice_bridge | 4 | Voice pipeline design, config analysis, scaffold | — |
| email | 4 | SMTP/IMAP email ingestion, search, delivery | — |
| rss | 4 | RSS feed parsing and monitoring | — |
| architect | 3 | Architecture analysis and decision logging | — |

**Always included** — these 12 tools are always available:
- **Meta/discovery (6):** `findTools`, `getMethodology`, `check_mcp_setup`, `discover_tools`, `get_tool_quick_ref`, `get_workflow_chain`
- **Dynamic loading (6):** `load_toolset`, `unload_toolset`, `list_available_toolsets`, `call_loaded_tool`, `smart_select_tools`, `get_ab_test_report`

The `default` preset includes 50 tools (38 domain + 6 meta/discovery + 6 dynamic loading).

### TOON Format — Token Savings

TOON (Token-Oriented Object Notation) is **on by default** for all presets since v2.14.1. Every tool response is TOON-encoded for ~40% fewer tokens vs JSON. Disable with `--no-toon` if your client can't handle non-JSON responses.

```bash
# TOON on (default, all presets)
claude mcp add nodebench -- npx -y nodebench-mcp

# TOON off
claude mcp add nodebench -- npx -y nodebench-mcp --no-toon
```

Use the `toon_encode` and `toon_decode` tools to convert between TOON and JSON in your own workflows.

### When to Use Each Preset

| Preset | Use when... | Example |
|---|---|---|
| **default** ⭐ | You want the complete AI Flywheel methodology with minimal token overhead | Most users — bug fixes, features, refactoring, code review |
| `full` | You need vision, UI capture, web search, GitHub, local file parsing, or GAIA solvers | Vision QA, web scraping, file processing, parallel agents, capability benchmarking |

---

## AI Flywheel — Complete Methodology

The AI Flywheel is documented in detail in [AI_FLYWHEEL.md](https://github.com/HomenShum/nodebench-ai/blob/main/AI_FLYWHEEL.md). Here's a summary:

### Two Loops That Compound

```
┌─────────────────────────────────────────────────────────────────┐
│  OUTER LOOP: Eval-Driven Development                           │
│                                                                 │
│  Eval Batch ──→ Telemetry ──→ LLM Judge ──→ Suggestions        │
│       │                                          │              │
│       │         ┌───────────────────────────┐    │              │
│       │         │ INNER LOOP: 6-Phase       │    │              │
│       │         │                           │    │              │
│       ▼         │  P1 Context Gather        │    │              │
│   Regression    │  P2 Gap Analysis    ◄─────┼────┘              │
│   detected or   │  P3 Implementation       │  Judge suggestions │
│   new intent    │  P4 Test & Validate ─────┼──► feeds back as   │
│   added         │  P5 Self-Closed Verify   │    new eval cases  │
│       │         │  P6 Document Learnings ──┼──► updates edge    │
│       │         │                           │    case registry   │
│       ▼         └───────────────────────────┘                   │
│  Re-run Eval Batch ──→ Score improved? ──→ Deploy              │
│                          │                                      │
│                          NO → revert, try different approach    │
└─────────────────────────────────────────────────────────────────┘
```

### Inner Loop → Outer Loop (Verification feeds Evals)

| 6-Phase output | Feeds into Eval Loop as |
|---|---|
| Phase 4 test cases (static, unit, integration, E2E) | New eval batch test cases with known-good expected outputs |
| Phase 5 subagent PASS/FAIL checklists | Eval scoring rubrics — each checklist item becomes a boolean eval criterion |
| Phase 6 edge cases & learnings | New adversarial eval cases targeting discovered failure modes |

### Outer Loop → Inner Loop (Evals trigger Verification)

| Eval Loop output | Triggers 6-Phase as |
|---|---|
| Judge finds tool calling inefficiency | Phase 2 gap analysis scoped to that tool's implementation |
| Eval scores regress after deploy | Full Phase 1-6 cycle on the regression — treat as a production incident |
| Judge suggests new tool or prompt change | Phase 3 implementation following existing patterns, validated through Phase 4-5 |
| Recurring failure pattern across batch | Phase 1 deep dive into root cause (maybe upstream API changed, maybe schema drifted) |

### When to Use Which

- **Building or changing a feature** → Run the 6-Phase inner loop. You're asking: *"Is this implementation correct?"*
- **Measuring system quality over time** → Run the Eval outer loop. You're asking: *"Is the system getting better?"*
- **Both, always** → Every 6-Phase run produces artifacts (test cases, edge cases, checklists) that expand the eval suite. Every eval regression triggers a 6-Phase investigation. They are not optional alternatives — they compound.

---

## Build from Source

```bash
git clone https://github.com/HomenShum/nodebench-ai.git
cd nodebench-ai/packages/mcp-local
npm install && npm run build
```

Then use absolute path:

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "node",
      "args": ["/path/to/packages/mcp-local/dist/index.js"]
    }
  }
}
```

---

## Quick Reference

### Recommended Setup for Most Users

```bash
# Claude Code / Windsurf — AI Flywheel core tools (50 tools, default)
claude mcp add nodebench -- npx -y nodebench-mcp
```

### What's in the default preset?

| Domain | Tools | What you get |
|---|---|---|
| verification | 8 | Cycles, gaps, triple-verify, status |
| eval | 6 | Eval runs, results, comparison, diff |
| quality_gate | 4 | Gates, presets, history |
| learning | 4 | Knowledge, search, record |
| recon | 7 | Research, findings, framework checks, risk |
| flywheel | 4 | Mandatory flywheel, promote, investigate |
| security | 3 | Dependency scanning, code analysis, terminal security scanning |
| boilerplate | 2 | Scaffold NodeBench projects + status |
| meta + discovery | 6 | findTools, getMethodology, check_mcp_setup, discover_tools, get_tool_quick_ref, get_workflow_chain |
| dynamic loading | 6 | load_toolset, unload_toolset, list_available_toolsets, call_loaded_tool, smart_select_tools, get_ab_test_report |

**Total: 50 tools** — Complete AI Flywheel methodology with ~70% less token overhead.

### When to Upgrade Presets

| Need | Upgrade to |
|---|---|
| Everything: vision, UI capture, web search, GitHub, local file parsing, GAIA solvers | `--preset full` (175 tools) |

### First Prompts to Try

```
# See what's available
> Use getMethodology("overview") to see all workflows

# Before your next task — search for prior knowledge
> Use search_all_knowledge("what I'm about to work on")

# Run the full verification pipeline on a change
> Use getMethodology("mandatory_flywheel") and follow the 6 steps

# Find tools for a specific task
> Use discover_tools("verify my implementation")
```

### Key Methodology Topics

| Topic | Command |
|---|---|
| AI Flywheel overview | `getMethodology("overview")` |
| 6-phase verification | `getMethodology("mandatory_flywheel")` |
| Parallel agents | `getMethodology("parallel_agent_teams")` |
| Eval-driven development | `getMethodology("eval_driven_development")` |

---

## Security & Trust Boundaries

NodeBench MCP runs locally on your machine. Here's what it can and cannot access:

### Data locality
- All persistent data is stored in **`~/.nodebench/`** (SQLite databases for tool logs, analytics, learnings, eval results)
- **No data is sent to external servers** unless you explicitly provide API keys and use tools that call external APIs (web search, LLM, GitHub, email)
- Analytics data never leaves your machine

### File system access
- The `local_file` toolset (`--preset full` only) can **read files anywhere on your filesystem** that the Node.js process has permission to access. This includes CSV, PDF, XLSX, DOCX, PPTX, JSON, TXT, and ZIP files
- The `security` toolset runs static analysis on files you point it at
- Session notes and project bootstrapping write to the current working directory or `~/.nodebench/`
- **Trust boundary**: If you grant an AI agent access to NodeBench MCP with `--preset full`, that agent can read any file your user account can read. Use the `default` preset if you want to restrict file system access

### API keys
- All API keys are read from environment variables (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, etc.)
- No keys are hardcoded or logged
- Keys are passed to their respective provider APIs only — never to NodeBench servers (there are none)

### SQL injection protection
- All database queries use parameterized statements — no string concatenation in SQL

---

## Troubleshooting

**"No search provider available"** — Set `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `PERPLEXITY_API_KEY`

**"GitHub API error 403"** — Set `GITHUB_TOKEN` for higher rate limits

**"Cannot find module"** — Run `npm run build` in the mcp-local directory

**MCP not connecting** — Check path is absolute, run `claude --mcp-debug`, ensure Node.js >= 18

---

## License

MIT
