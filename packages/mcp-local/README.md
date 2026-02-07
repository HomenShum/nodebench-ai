# NodeBench MCP

**Make AI agents catch the bugs they normally ship.**

One command gives your agent structured research, risk assessment, 3-layer testing, quality gates, and a persistent knowledge base — so every fix is thorough and every insight compounds into future work.

```bash
claude mcp add nodebench -- npx -y nodebench-mcp
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

**Vision engineer** — Built agentic vision analysis using GPT 5.2 with Set-of-Mark (SoM) for boundary boxing, similar to Google Gemini 3 Flash's agentic code execution approach. Uses NodeBench's verification pipeline to validate detection accuracy across screenshot variants before shipping model changes.

**QA engineer** — Transitioned a manual QA workflow website into an AI agent-driven app for a pet care messaging platform. Uses NodeBench's quality gates, verification cycles, and eval runs to ensure the AI agent handles edge cases that manual QA caught but bare AI agents miss.

Both found different subsets of the 129 tools useful — which is why v2.8 ships with `--preset` gating to load only what you need.

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
# Claude Code CLI — all 129 tools
claude mcp add nodebench -- npx -y nodebench-mcp

# Or start lean — 39 tools, ~70% less token overhead
claude mcp add nodebench -- npx -y nodebench-mcp --preset lite
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
> Use getMethodology("overview") to see all workflows

# Before your next task — search for prior knowledge
> Use search_all_knowledge("what I'm about to work on")

# Run the full verification pipeline on a change
> Use getMethodology("mandatory_flywheel") and follow the 6 steps
```

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

| When you... | Use this | Impact |
|---|---|---|
| Prevent duplicate work | `claim_agent_task` / `release_agent_task` | Task locks — each task owned by exactly one agent |
| Specialize agents | `assign_agent_role` | 7 roles: implementer, test_writer, critic, etc. |
| Track context usage | `log_context_budget` | Prevents context exhaustion mid-fix |
| Validate against reference | `run_oracle_comparison` | Compare output against known-good oracle |
| Orient new sessions | `get_parallel_status` | See what all agents are doing and what's blocked |
| Bootstrap any repo | `bootstrap_parallel_agents` | Auto-detect gaps, scaffold coordination infra |

### Research and discovery

| When you... | Use this | Impact |
|---|---|---|
| Search the web | `web_search` | Gemini/OpenAI/Perplexity — latest docs and updates |
| Fetch a URL | `fetch_url` | Read any page as clean markdown |
| Find GitHub repos | `search_github` + `analyze_repo` | Discover and evaluate libraries and patterns |
| Analyze screenshots | `analyze_screenshot` | AI vision (Gemini/GPT-4o/Claude) for UI QA |

---

## Progressive Discovery (v2.8.1)

129 tools is a lot. The progressive disclosure system helps agents find exactly what they need:

### Multi-modal search engine

```
> discover_tools("verify my implementation")
```

The `discover_tools` search engine scores tools using **9 parallel strategies**:

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

**6 search modes**: `hybrid` (default, all strategies), `fuzzy`, `regex`, `prefix`, `semantic`, `exact`

Pass `explain: true` to see exactly which strategies contributed to each score.

### Quick refs — what to do next

Every tool response auto-appends a `_quickRef` with:
- **nextAction**: What to do immediately after this tool
- **nextTools**: Recommended follow-up tools
- **methodology**: Which methodology guide to consult
- **tip**: Practical usage advice

Call `get_tool_quick_ref("tool_name")` for any tool's guidance.

### Workflow chains — step-by-step recipes

11 pre-built chains for common workflows:

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

Ask the agent: `Use getMethodology("overview")` to see all 19 methodology topics.

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

---

## Toolset Gating (v2.8)

129 tools means tens of thousands of tokens of schema per API call. If you only need core methodology, gate the toolset:

### Presets

```bash
# Lite — 39 tools (verification, eval, gates, learning, recon, security, boilerplate + meta + discovery)
claude mcp add nodebench -- npx -y nodebench-mcp --preset lite

# Core — 87 tools (adds flywheel, bootstrap, self-eval, llm, platform, research_writing, flicker_detection, figma_flow, benchmark + meta + discovery)
claude mcp add nodebench -- npx -y nodebench-mcp --preset core

# Full — all 129 tools (default)
claude mcp add nodebench -- npx -y nodebench-mcp
```

Or in config:

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp", "--preset", "core"]
    }
  }
}
```

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

| Toolset | Tools | What it covers |
|---|---|---|
| verification | 8 | Cycles, gaps, triple-verify, status |
| eval | 6 | Eval runs, results, comparison, diff |
| quality_gate | 4 | Gates, presets, history |
| learning | 4 | Knowledge, search, record |
| recon | 7 | Research, findings, framework checks, risk |
| flywheel | 4 | Mandatory flywheel, promote, investigate |
| bootstrap | 11 | Project setup, agents.md, self-implement, autonomous, test runner |
| self_eval | 6 | Trajectory analysis, health reports |
| parallel | 10 | Task locks, roles, context budget, oracle |
| vision | 4 | Screenshot analysis, UI capture, diff |
| ui_capture | 2 | Playwright-based capture |
| web | 2 | Web search, URL fetch |
| github | 3 | Repo search, analysis, monitoring |
| docs | 4 | Documentation generation, reports |
| local_file | 17 | Deterministic parsing (CSV/XLSX/PDF/DOCX/PPTX/ZIP/JSON/JSONL/TXT) |
| llm | 3 | LLM calling, extraction, benchmarking |
| security | 3 | Dependency scanning, code analysis, terminal security scanning |
| platform | 4 | Convex bridge: briefs, funding, research, publish |
| research_writing | 8 | Academic paper polishing, translation, de-AI, logic check, captions, experiment analysis, reviewer simulation |
| flicker_detection | 5 | Android flicker detection + SSIM tooling |
| figma_flow | 4 | Figma flow analysis + rendering |
| boilerplate | 2 | Scaffold NodeBench projects + status |
| benchmark | 3 | Autonomous benchmark lifecycle (C-compiler pattern) |

Always included (regardless of gating):
- Meta: `findTools`, `getMethodology`
- Discovery: `discover_tools`, `get_tool_quick_ref`, `get_workflow_chain`

---

## Build from Source

```bash
git clone https://github.com/nodebench/nodebench-ai.git
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

## Troubleshooting

**"No search provider available"** — Set `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `PERPLEXITY_API_KEY`

**"GitHub API error 403"** — Set `GITHUB_TOKEN` for higher rate limits

**"Cannot find module"** — Run `npm run build` in the mcp-local directory

**MCP not connecting** — Check path is absolute, run `claude --mcp-debug`, ensure Node.js >= 18

---

## License

MIT
