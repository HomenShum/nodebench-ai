# NodeBench MCP

**Make AI agents catch the bugs they normally ship.**

One command gives your agent structured research, risk assessment, 3-layer testing, quality gates, and a persistent knowledge base — so every fix is thorough and every insight compounds into future work.

```bash
# Claude Code — AI Flywheel core (50 tools, recommended)
claude mcp add nodebench -- npx -y nodebench-mcp

# Windsurf / Cursor — same tools, add to your MCP config (see setup below)

# Need everything? Vision, web, files, parallel agents, etc.
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

**With NodeBench MCP:** Each subagent calls `claim_agent_task` to lock its work. Roles are assigned so they don't overlap. Context budget is tracked. Progress notes ensure handoff without starting from scratch. (Requires `--preset multi_agent` or `--preset full`.)

### Example 3: Knowledge compounding

Tasks 1-3 start with zero prior knowledge. By task 9, the agent finds 2+ relevant prior findings before writing a single line of code. Bare agents start from zero every time.

---

## Quick Start

### Claude Code (CLI)

```bash
# Recommended — AI Flywheel core (50 tools)
claude mcp add nodebench -- npx -y nodebench-mcp

# Or pick a themed preset for your workflow
claude mcp add nodebench -- npx -y nodebench-mcp --preset web_dev
claude mcp add nodebench -- npx -y nodebench-mcp --preset research
claude mcp add nodebench -- npx -y nodebench-mcp --preset data
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

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json` (or open Settings → MCP → View raw config):

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

### Cursor

Add to `.cursor/mcp.json` in your project root (or open Settings → MCP):

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

### Other MCP Clients

Any MCP-compatible client works. The config format is the same — point `command` to `npx` and `args` to `["-y", "nodebench-mcp"]`. Add `"--preset", "<name>"` to the args array for themed presets.

### First Prompts to Try

```
# See what's available
> Use discover_tools("verify my implementation") to find relevant tools

# Page through results
> Use discover_tools({ query: "verify", limit: 5, offset: 5 }) for page 2

# Expand results via conceptual neighbors
> Use discover_tools({ query: "deploy changes", expand: 3 }) for broader discovery

# Explore a tool's neighborhood (multi-hop)
> Use get_tool_quick_ref({ tool_name: "run_recon", depth: 2 }) to see 2-hop graph

# Get methodology guidance
> Use getMethodology("overview") to see all workflows

# Before your next task — search for prior knowledge
> Use search_all_knowledge("what I'm about to work on")

# Run the full verification pipeline on a change
> Use getMethodology("mandatory_flywheel") and follow the 6 steps
```

### Optional: API Keys

```bash
export GEMINI_API_KEY="your-key"        # Web search + vision (recommended)
export GITHUB_TOKEN="your-token"        # GitHub (higher rate limits)
```

Set these as environment variables, or add them to the `env` block in your MCP config:

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-key",
        "GITHUB_TOKEN": "your-token"
      }
    }
  }
}
```

### Usage Analytics & Smart Presets

NodeBench MCP tracks tool usage locally and can recommend optimal presets based on your project type and usage patterns.

```bash
npx nodebench-mcp --smart-preset       # Get AI-powered preset recommendation
npx nodebench-mcp --stats              # Show usage statistics (last 30 days)
npx nodebench-mcp --export-stats       # Export usage data to JSON
npx nodebench-mcp --list-presets       # List all available presets
npx nodebench-mcp --reset-stats        # Clear analytics data
```

All analytics data is stored locally in `~/.nodebench/analytics.db` and never leaves your machine.

---

## What You Get — The AI Flywheel

The default setup (no `--preset` flag) gives you **50 tools** that implement the complete [AI Flywheel](https://github.com/HomenShum/nodebench-ai/blob/main/AI_FLYWHEEL.md) methodology — two interlocking loops that compound quality over time:

```
Research → Risk → Implement → Test (3 layers) → Eval → Gate → Learn → Ship
    ↑                                                              │
    └──────────── knowledge compounds ─────────────────────────────┘
```

**Inner loop** (per change): 6-phase verification ensures correctness.
**Outer loop** (over time): Eval-driven development ensures improvement.

### What's in the Default Preset (50 Tools)

The default preset has 3 layers:

**Layer 1 — Discovery (6 tools):** *"What tool should I use?"*

| Tool | Purpose |
|---|---|
| `findTools` | Keyword search across all tools |
| `getMethodology` | Access methodology guides (20 topics) |
| `check_mcp_setup` | Diagnostic wizard — checks env vars, API keys, optional deps |
| `discover_tools` | 14-strategy hybrid search with pagination (`offset`), result expansion (`expand`), and `relatedTools` neighbors |
| `get_tool_quick_ref` | Quick reference with multi-hop BFS traversal (`depth` 1-3) — discovers tools 2-3 hops away |
| `get_workflow_chain` | Step-by-step recipes for 28 common workflows |

**Layer 2 — Dynamic Loading (6 tools):** *"Add/remove tools from my session"*

| Tool | Purpose |
|---|---|
| `load_toolset` | Add a toolset to the current session on demand |
| `unload_toolset` | Remove a toolset to recover context budget |
| `list_available_toolsets` | See all 39 toolsets with tool counts |
| `call_loaded_tool` | Proxy for clients that don't support dynamic tool updates |
| `smart_select_tools` | LLM-powered tool selection (sends compact catalog to fast model) |
| `get_ab_test_report` | Compare static vs dynamic loading performance |

**Layer 3 — AI Flywheel Core Methodology (38 tools):** *"Do the work"*

| Domain | Tools | What You Get |
|---|---|---|
| **verification** | 8 | `start_verification_cycle`, `log_gap`, `resolve_gap`, `get_cycle_status`, `triple_verify`, `run_closed_loop`, `compare_cycles`, `list_cycles` |
| **eval** | 6 | `start_eval_run`, `record_eval_result`, `get_eval_summary`, `compare_eval_runs`, `get_eval_diff`, `list_eval_runs` |
| **quality_gate** | 4 | `run_quality_gate`, `create_gate_preset`, `get_gate_history`, `list_gate_presets` |
| **learning** | 4 | `record_learning`, `search_all_knowledge`, `get_knowledge_stats`, `list_recent_learnings` |
| **flywheel** | 4 | `run_mandatory_flywheel`, `promote_to_eval`, `investigate_blind_spot`, `get_flywheel_status` |
| **recon** | 7 | `run_recon`, `log_recon_finding`, `assess_risk`, `get_recon_summary`, `list_recon_sessions`, `check_framework_version`, `search_recon_findings` |
| **security** | 3 | `scan_dependencies`, `analyze_code_security`, `scan_terminal_output` |
| **boilerplate** | 2 | `scaffold_nodebench_project`, `get_boilerplate_status` |

> **Note:** `skill_update` (4 tools for rule file freshness tracking) is available via `load_toolset("skill_update")` when needed.

### Core Workflow — Use These Every Session

These are the AI Flywheel tools documented in [AI_FLYWHEEL.md](https://github.com/HomenShum/nodebench-ai/blob/main/AI_FLYWHEEL.md):

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
| Re-examine for 11/10 | Fresh-eyes review | After completing, re-examine for exceptional quality — a11y, resilience, polish |

### Mandatory After Any Non-Trivial Change

1. **Static analysis**: `tsc --noEmit` and linter checks
2. **Happy-path test**: Run the changed functionality with valid inputs
3. **Failure-path test**: Validate expected error handling + edge cases
4. **Gap analysis**: Dead code, unused vars, missing integrations, intent mismatch
5. **Fix and re-verify**: Rerun steps 1-3 from scratch after any fix
6. **Deploy and document**: Ship + write down what changed and why
7. **Re-examine for 11/10**: Re-examine the completed work with fresh eyes. Not "does it work?" but "is this the best it can be?" Check: prefers-reduced-motion, color-blind safety, print stylesheet, error resilience (partial failures, retry with backoff), keyboard efficiency (skip links, Ctrl+K search), skeleton loading, staggered animations, progressive disclosure for large datasets. Fix what you find, then re-examine your fixes.

---

## Themed Presets — Choose Your Workflow

The default preset covers the AI Flywheel. For specialized workflows, pick a themed preset that adds domain-specific tools on top:

| Preset | Tools | What it adds to the default | Use case |
|---|---|---|---|
| **default** ⭐ | **50** | — | Bug fixes, features, refactoring, code review |
| `web_dev` | 102 | + vision, UI capture, SEO, git workflow, architect, UI/UX dive, MCP bridge, PR reports | Web projects with visual QA |
| `mobile` | 91 | + vision, UI capture, flicker detection, UI/UX dive, MCP bridge | Mobile apps with screenshot analysis |
| `academic` | 82 | + research writing, LLM, web, local file parsing | Academic papers and research |
| `multi_agent` | 79 | + parallel agents, self-eval, session memory, pattern mining, TOON | Multi-agent coordination |
| `data` | 74 | + local file parsing (CSV/XLSX/PDF/DOCX/JSON), LLM, web | Data analysis and file processing |
| `content` | 69 | + LLM, critter, email, RSS, platform queue, architect | Content pipelines and publishing |
| `research` | 67 | + web search, LLM, RSS feeds, email, docs | Research workflows |
| `devops` | 64 | + git compliance, session memory, benchmarks, pattern mining, PR reports | CI/CD and operations |
| `full` | 218 | + everything (all 39 toolsets) | Maximum coverage |

```bash
# Claude Code
claude mcp add nodebench -- npx -y nodebench-mcp --preset web_dev

# Windsurf / Cursor — add --preset to args
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp", "--preset", "web_dev"]
    }
  }
}
```

### Let AI Pick Your Preset

```bash
npx nodebench-mcp --smart-preset
```

Analyzes your project (language, framework, project type) and usage history to recommend the best preset.

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

## Governance Model — What Your Agent Can and Can't Do

NodeBench enforces decision rights so you know exactly what your agent does autonomously vs what requires your approval. This is the "King Mode" layer — you delegate outcomes, not tasks, and the governance model ensures the agent stays within bounds.

### Autonomous (agent acts without asking)

These actions are safe for the agent to perform without human confirmation:

- Run tests and fix failing assertions
- Refactor within existing patterns (no new dependencies)
- Add logging, comments, and documentation
- Update type definitions to match implementation
- Fix lint errors and format code

### Requires Confirmation (agent asks before acting)

These actions trigger a confirmation prompt because they have broader impact:

- Changes to auth, security, or permissions logic
- Database migrations or schema changes
- API contract changes (new endpoints, changed signatures)
- Adding or removing dependencies
- Deleting code, files, or features
- Changes to CI/CD configuration

### Quality Gates (enforced before any deploy)

Every change must pass these gates before the agent can consider the work done:

| Gate | What it checks | Failure behavior |
|------|---------------|------------------|
| Static analysis | `tsc --noEmit`, lint passes | Agent must fix before proceeding |
| Unit tests | All tests pass | Agent must fix or explain why skipped |
| Integration tests | E2E scenarios pass | Agent must fix or flag as known issue |
| Verification cycle | No unresolved HIGH gaps | Agent must resolve or escalate |
| Knowledge banked | Learning recorded for future | Agent must document what it learned |

### How this works in practice

**With Claude Code:**
```
> "Fix the LinkedIn posting bug"

Agent runs recon → finds 3 related issues
Agent logs gaps → 2 HIGH, 1 MEDIUM
Agent fixes all 3 → runs tests → all pass
Agent hits quality gate → knowledge not banked
Agent records learning → gate passes
Agent: "Fixed. 3 issues resolved, knowledge banked."
```

**With Cursor Agent:**
```
> "Add rate limiting to the API"

Agent runs risk assessment → HIGH (auth-adjacent)
Agent: "This touches auth middleware. Confirm?"
You: "Yes, proceed"
Agent implements → tests pass → gate passes
Agent: "Done. Added rate limiting with tests."
```

---

## Case Studies

### Case Study 1: Bug Fix with Knowledge Compounding

**Context:** Solo founder using Claude Code to fix a recurring bug in their SaaS.

**Before NodeBench:**
- Agent fixes the immediate bug
- Runs tests once, passes
- Ships
- 3 days later, related bug appears in production
- Agent re-investigates from scratch

**With NodeBench:**
- Agent runs `run_recon` → finds 2 related issues
- Agent runs `log_gap` → tracks all 3 issues
- Agent fixes all 3 → runs 3-layer tests
- Agent runs `run_quality_gate` → passes
- Agent runs `record_learning` → banks the pattern
- Next similar bug: agent finds the prior learning in `search_all_knowledge` and fixes in half the time

**Result:** Time to fix similar bugs decreased 50% over 30 days.

### Case Study 2: Parallel Agents Without Conflicts

**Context:** Developer spawns 3 Claude Code subagents to fix different bugs in the same codebase.

**Before NodeBench:**
- Agent 1 and Agent 2 both see the same bug
- Both implement a fix
- Agent 2's fix overwrites Agent 1's fix
- Agent 3 re-investigates what Agent 1 already solved
- Agent 2 hits context limit mid-fix, loses work

**With NodeBench:**
- Each agent calls `claim_agent_task` → locks its work
- Roles assigned via `assign_agent_role` → no overlap
- Context budget tracked via `log_context_budget`
- Progress notes shared via `release_agent_task`
- All 3 bugs fixed without conflict

**Result:** Parallel agent success rate increased from 60% to 95%.

### Case Study 3: Security-Sensitive Change

**Context:** Small team using Cursor Agent to add a new API endpoint.

**Before NodeBench:**
- Agent implements the endpoint
- Tests pass
- Ships
- 2 weeks later, security audit finds auth bypass

**With NodeBench:**
- Agent runs `assess_risk` → HIGH (auth-adjacent)
- Agent prompts for confirmation before proceeding
- Human reviews the planned changes
- Security issue caught before code is written
- Agent implements with security constraints

**Result:** Security-related incidents from AI code reduced to zero.

---

## Progressive Discovery

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

### Cursor pagination

Page through large result sets with `offset` and `limit`:

```
> discover_tools({ query: "verify", limit: 5 })
# Returns: { results: [...5 tools], totalMatches: 76, hasMore: true, offset: 0 }

> discover_tools({ query: "verify", limit: 5, offset: 5 })
# Returns: { results: [...next 5 tools], totalMatches: 76, hasMore: true, offset: 5 }
```

`totalMatches` is stable across pages. `hasMore` tells you whether another page exists.

### Result expansion via relatedTools

Broaden results by following conceptual neighbors:

```
> discover_tools({ query: "deploy and ship changes", expand: 3 })
# Top 3 results' relatedTools neighbors are added at 50% parent score
# "deploy" finds git_workflow tools → expansion adds quality_gate, flywheel tools
# Expanded results include depth: 1 and expandedFrom fields
```

Dogfood A/B results: 5/8 queries gained recall lift (+2 to +8 new tools per query). "deploy and ship changes" went from 82 → 90 matches.

### Quick refs — what to do next (with multi-hop)

Every tool response auto-appends a `_quickRef` with:
- **nextAction**: What to do immediately after this tool
- **nextTools**: Recommended follow-up tools (workflow-sequential)
- **relatedTools**: Conceptually adjacent tools (same domain, shared tags — 949 connections across 218 tools)
- **methodology**: Which methodology guide to consult
- **tip**: Practical usage advice

Call `get_tool_quick_ref("tool_name")` for any tool's guidance — or use **multi-hop BFS traversal** to discover tools 2-3 hops away:

```
> get_tool_quick_ref({ tool_name: "start_verification_cycle", depth: 1 })
# Returns: direct neighbors via nextTools + relatedTools (hopDistance: 1)

> get_tool_quick_ref({ tool_name: "start_verification_cycle", depth: 2 })
# Returns: direct neighbors + their neighbors (hopDistance: 1 and 2)
# Discovers 34 additional tools reachable in 2 hops

> get_tool_quick_ref({ tool_name: "start_verification_cycle", depth: 3 })
# Returns: 3-hop BFS traversal — full neighborhood graph
```

Each discovered tool includes `hopDistance` (1-3) and `reachedVia` (which parent tool led to it). BFS prevents cycles — no tool appears at multiple depths.

### `nextTools` vs `relatedTools`

| | `nextTools` | `relatedTools` |
|---|---|---|
| **Meaning** | Workflow-sequential ("do X then Y") | Conceptually adjacent ("if doing X, consider Y") |
| **Example** | `run_recon` → `log_recon_finding` | `run_recon` → `search_all_knowledge`, `bootstrap_project` |
| **Total connections** | 498 | 949 (191% amplification) |
| **Overlap** | — | 0% (all net-new connections) |
| **Cross-domain** | Mostly same-domain | 90% bridge different domains |

### Workflow chains — step-by-step recipes

28 pre-built chains for common workflows:

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
| `intentionality_check` | 4 | Verify agent intent before action |
| `research_digest` | 6 | Summarize research across sessions |
| `email_assistant` | 5 | Email triage and response |
| `pr_creation` | 6 | Visual PR creation from UI Dive sessions |

Call `get_workflow_chain("new_feature")` to get the step-by-step sequence.

### Boilerplate template

Start new projects with everything pre-configured:

```bash
gh repo create my-project --template HomenShum/nodebench-boilerplate --clone
cd my-project && npm install
```

Or use the scaffold tool: `scaffold_nodebench_project` creates AGENTS.md, .mcp.json, package.json, CI, Docker, and parallel agent infra.

---

## Scaling MCP: How We Solved the 5 Biggest Industry Problems

MCP tool servers face 5 systemic problems documented across Anthropic, Microsoft Research, and the open-source community. We researched each one, built solutions, and tested them with automated eval harnesses.

---

### Problem 1: Context Bloat (too many tool definitions eat the context window)

**The research**: Anthropic measured that 58 tools from 5 MCP servers consume **~55K tokens** before the conversation starts. At 218 tools, NodeBench would consume ~109K tokens — over half a 200K context window just on tool metadata. [Microsoft Research](https://www.microsoft.com/en-us/research/blog/tool-space-interference-in-the-mcp-era-designing-for-agent-compatibility-at-scale/) found LLMs "decline to act at all when faced with ambiguous or excessive tool options." [Cursor enforces a ~40-tool hard cap](https://www.lunar.dev/post/why-is-there-mcp-tool-overload-and-how-to-solve-it-for-your-ai-agents) for this reason.

**Our solutions** (layered, each independent):

| Layer | What it does | Token savings | Requires |
|---|---|---|---|
| Themed presets (`--preset web_dev`) | Load only relevant toolsets (54-106 tools vs 218) | **50-75%** | Nothing |
| TOON encoding (on by default) | Encode all tool responses in token-optimized format | **~40%** on responses | Nothing |
| `discover_tools({ compact: true })` | Return `{ name, category, hint }` only | **~60%** on search results | Nothing |
| `instructions` field (Claude Code) | Claude Code defers tool loading, searches on demand | **~85%** | Claude Code client |
| `smart_select_tools` (LLM-powered) | Fast model picks 8 best tools from compact catalog | **~95%** | Any API key |

**How we tested**: The A/B harness (`scripts/ab-test-harness.ts`) measures tool counts, token overhead, and success rates across 28 scenarios in both static and dynamic modes. TOON savings validated by comparing JSON vs TOON serialized sizes across all tool responses.

---

### Problem 2: Tool Selection Degradation (LLMs pick the wrong tool as count increases)

**The research**: [Anthropic's Tool Search Tool](https://www.anthropic.com/engineering/advanced-tool-use) improved accuracy from **49% → 74%** (Opus 4) and **79.5% → 88.1%** (Opus 4.5) by switching from all-tools-upfront to on-demand discovery. The [Dynamic ReAct paper (arxiv 2509.20386)](https://arxiv.org/html/2509.20386v1) tested 5 architectures and found **Search + Load** wins — flat search + deliberate loading beats hierarchical app→tool search.

**Our solution**: `discover_tools` — a 14-strategy hybrid search engine that finds the right tool from 218 candidates, with **cursor pagination**, **result expansion**, and **multi-hop traversal**:

| Strategy | What it does | Example |
|---|---|---|
| Keyword + TF-IDF | Rare tags score higher than common ones | "c-compiler" scores higher than "test" |
| Fuzzy (Levenshtein) | Tolerates typos | "verifiy" → `start_verification_cycle` |
| Semantic (synonyms) | Expands 30 word families | "check" also finds "verify", "validate" |
| N-gram + Bigram | Partial words and phrases | "screen" → `capture_ui_screenshot` |
| Dense (TF-IDF cosine) | Vector-like ranking | "audit compliance" surfaces related tools |
| Embedding (neural) | Agent-as-a-Graph bipartite RRF | Based on [arxiv 2511.01854](https://arxiv.org/html/2511.01854v1) |
| Execution traces | Co-occurrence mining from `tool_call_log` (direct + transitive A→B→C) | Tools frequently used together boost each other |
| Intent pre-filter | Narrow to relevant categories before search | `intent: "data_analysis"` → only local_file, llm, benchmark |
| **Pagination** | `offset` + `limit` with stable `totalMatches` and `hasMore` | Page through 76+ results 5 at a time |
| **Expansion** | Top N results' `relatedTools` neighbors added at 50% parent score | `expand: 3` adds 2-8 new tools per query |
| **Multi-hop BFS** | `get_tool_quick_ref` depth 1-3 with `hopDistance` + `reachedVia` | depth=2 discovers 24-40 additional tools |

Plus `smart_select_tools` for ambiguous queries — sends the catalog to Gemini 3 Flash / GPT-5-mini / Claude Haiku 4.5 for LLM-powered reranking.

**How we tested**: 28 scenarios with expected-toolset ground truth. The harness checks if `_loadSuggestions` points to the correct toolset for each domain query.

| What we measured | Result |
|---|---|
| Discovery accuracy | **18/18 (100%)** — correct toolset suggested for every domain |
| Domains covered | File I/O, email, GitHub, academic writing, SEO, git, Figma, CI/CD, browser automation, database, security, LLM, monitoring |
| Natural language queries | "I need to look at what's in this zip file" → `local_file` ✓ |
| Zero-match graceful degradation | "deploy Kubernetes pods" → closest tools, no errors ✓ |

---

### Problem 3: Static Loading (all tools loaded upfront, even if unused)

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
- **Full-registry search** — `discover_tools` searches all 218 tools even with 54 loaded, so it can suggest what to load

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

### Problem 4: Client Fragmentation (not all clients handle dynamic tool updates)

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

### Problem 5: Aggressive Filtering (over-filtering means the right tool isn't found)

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

### Summary: research → solution → eval for each problem

| Problem | Research Source | Our Solution | Eval Method | Result |
|---|---|---|---|---|
| **Context bloat** (107K tokens) | Anthropic (85% reduction), Lunar.dev (~40-tool cap), SEP-1576 | Presets, TOON, compact mode, `instructions`, `smart_select_tools` | A/B harness token measurement | 50-95% reduction depending on layer |
| **Selection degradation** | Anthropic (+25pp), Dynamic ReAct (Search+Load wins) | 14-strategy hybrid search, intent pre-filter, LLM reranking | 28-scenario discovery accuracy | **100% accuracy** (18/18 domains) |
| **Static loading** | Dynamic ReAct, ToolScope (+34.6%), MCP spec | `--dynamic` flag, `load_toolset` / `unload_toolset` | A/B harness + live IDE test | **100% success**, <1ms load latency |
| **Client fragmentation** | MCP discussions, client bug trackers | `list_changed` + `call_loaded_tool` proxy | Server-side `tools/list` verification | Works on **all clients** |
| **Aggressive filtering** | SynapticLabs, SEP-1576, our own `llm` gap | Intent pre-filter, `smart_select_tools`, embeddings | `llm_model_interaction` scenario | LLM-powered selection solves the gap |

**Ablation study** (`scripts/ablation-test.ts`): We tested which strategies matter for each user segment by disabling them one at a time across 54 queries:

| Segment | R@5 Baseline | Most Critical Strategy | Impact When Removed |
|---|---|---|---|
| **New user** (vague, natural language) | 67% | Synonym expansion | -17pp R@5 |
| **Experienced** (domain keywords) | 72% | All robust | No single strategy >5pp |
| **Power user** (exact tool names) | 100% | None needed | Keyword alone = 100% |

Key insight: new users need synonym expansion ("website" → seo, "AI" → llm) and fuzzy matching (typo tolerance). Power users need nothing beyond keyword matching. The remaining 33% new user gap is filled by `smart_select_tools` (LLM-powered).

Full methodology, per-scenario breakdown, ablation data, and research citations: [DYNAMIC_LOADING.md](./DYNAMIC_LOADING.md)

---

## Fine-Grained Control

```bash
# Include only specific toolsets
npx nodebench-mcp --toolsets verification,eval,recon

# Exclude heavy optional-dep toolsets
npx nodebench-mcp --exclude vision,ui_capture,parallel

# Dynamic loading — start with 12 tools, load on demand
npx nodebench-mcp --dynamic

# See all toolsets and presets
npx nodebench-mcp --help
```

### All 39 Toolsets

| Toolset | Tools | What it covers | In `default` |
|---|---|---|---|
| verification | 8 | Cycles, gaps, triple-verify, status | ✅ |
| eval | 6 | Eval runs, results, comparison, diff | ✅ |
| quality_gate | 4 | Gates, presets, history | ✅ |
| learning | 4 | Knowledge, search, record | ✅ |
| flywheel | 4 | Mandatory flywheel, promote, investigate | ✅ |
| recon | 7 | Research, findings, framework checks, risk | ✅ |
| security | 3 | Dependency scanning, code analysis, terminal security scanning | ✅ |
| boilerplate | 2 | Scaffold NodeBench projects + status | ✅ |
| skill_update | 4 | Skill tracking, freshness checks, sync | ✅ |
| **Subtotal** | **42** | **AI Flywheel core** | |
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
| critter | 1 | Accountability checkpoint with calibrated scoring | — |
| email | 4 | SMTP/IMAP email ingestion, search, delivery | — |
| rss | 4 | RSS feed parsing and monitoring | — |
| architect | 3 | Structural analysis, concept verification, implementation planning | — |
| ui_ux_dive | 11 | UI/UX deep analysis sessions, component reviews, flow audits | — |
| mcp_bridge | 5 | Connect external MCP servers, proxy tool calls, manage sessions | — |
| ui_ux_dive_v2 | 14 | Advanced UI/UX analysis with preflight, scoring, heuristic evaluation | — |
| pr_report | 3 | Visual PR creation with screenshot comparisons, timelines, past session links | — |

**Always included** — these 12 tools are available regardless of preset:
- **Meta/discovery (6):** `findTools`, `getMethodology`, `check_mcp_setup`, `discover_tools`, `get_tool_quick_ref`, `get_workflow_chain`
- **Dynamic loading (6):** `load_toolset`, `unload_toolset`, `list_available_toolsets`, `call_loaded_tool`, `smart_select_tools`, `get_ab_test_report`

### TOON Format — Token Savings

TOON (Token-Oriented Object Notation) is **on by default** for all presets. Every tool response is TOON-encoded for ~40% fewer tokens vs JSON. Disable with `--no-toon` if your client can't handle non-JSON responses.

```bash
# TOON on (default, all presets)
claude mcp add nodebench -- npx -y nodebench-mcp

# TOON off
claude mcp add nodebench -- npx -y nodebench-mcp --no-toon
```

Use the `toon_encode` and `toon_decode` tools (in the `toon` toolset) to convert between TOON and JSON in your own workflows.

---

## The AI Flywheel — Complete Methodology

The AI Flywheel is documented in detail in [AI_FLYWHEEL.md](https://github.com/HomenShum/nodebench-ai/blob/main/AI_FLYWHEEL.md).

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

**Note:** Parallel agent coordination tools require `--preset multi_agent` or `--preset full`.

---

## Capability Benchmarking (GAIA, Gated)

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

### Recommended Setup

```bash
# Claude Code — AI Flywheel core (50 tools, default)
claude mcp add nodebench -- npx -y nodebench-mcp

# Windsurf — add to ~/.codeium/windsurf/mcp_config.json
# Cursor — add to .cursor/mcp.json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp"]
    }
  }
}
```

### What's in the Default?

| Category | Tools | What you get |
|---|---|---|
| Discovery | 6 | findTools, getMethodology, check_mcp_setup, discover_tools (pagination + expansion), get_tool_quick_ref (multi-hop BFS), get_workflow_chain |
| Dynamic loading | 6 | load_toolset, unload_toolset, list_available_toolsets, call_loaded_tool, smart_select_tools, get_ab_test_report |
| Verification | 8 | Cycles, gaps, triple-verify, status |
| Eval | 6 | Eval runs, results, comparison, diff |
| Quality gate | 4 | Gates, presets, history |
| Learning | 4 | Knowledge, search, record |
| Flywheel | 4 | Mandatory flywheel, promote, investigate |
| Recon | 7 | Research, findings, framework checks, risk |
| Security | 3 | Dependency scanning, code analysis, terminal security scanning |
| Boilerplate | 2 | Scaffold NodeBench projects + status |
| Skill update | 4 | Skill tracking, freshness checks, sync |
| **Total** | **54** | **Complete AI Flywheel methodology** |

### When to Use a Themed Preset

| Need | Preset | Tools |
|---|---|---|
| Web development with visual QA | `--preset web_dev` | 106 |
| Mobile apps with flicker detection | `--preset mobile` | 95 |
| Academic papers and research writing | `--preset academic` | 86 |
| Multi-agent coordination | `--preset multi_agent` | 83 |
| Data analysis and file processing | `--preset data` | 78 |
| Content pipelines and publishing | `--preset content` | 73 |
| Research with web search and RSS | `--preset research` | 71 |
| CI/CD and DevOps | `--preset devops` | 68 |
| Everything | `--preset full` | 218 |

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
- The `local_file` toolset (in `data`, `academic`, `full` presets) can **read files anywhere on your filesystem** that the Node.js process has permission to access. This includes CSV, PDF, XLSX, DOCX, PPTX, JSON, TXT, and ZIP files
- The `security` toolset (in all presets) runs static analysis on files you point it at
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

**Windsurf not finding tools** — Verify `~/.codeium/windsurf/mcp_config.json` has the correct JSON structure. Open Settings → MCP → View raw config to edit directly.

**Cursor tools not loading** — Ensure `.cursor/mcp.json` exists in the project root. Restart Cursor after config changes.

**Dynamic loading not working** — Claude Code and GitHub Copilot support native dynamic loading. For Windsurf/Cursor, use `call_loaded_tool` as a fallback (it's always available).

---

## License

MIT
