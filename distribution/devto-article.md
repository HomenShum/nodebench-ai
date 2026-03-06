---
title: "How I Built a 239-Tool MCP Server That Makes AI Agents Actually Ship Quality Code"
published: false
description: "Progressive discovery, embedding search, and the AI Flywheel — lessons from building NodeBench MCP, one of the largest MCP tool servers."
tags: ai, mcp, developer-tools, open-source
cover_image:
---

## The Problem: AI Agents Ship Bugs

I have been using Claude Code, Cursor, and Windsurf daily for months. They are genuinely capable. But left to their own devices, AI coding agents share a consistent failure pattern: they skip tests, miss edge cases, and declare victory without verifying anything.

Here is a typical session. You ask Claude Code to "add pagination to the users endpoint." It writes the route, maybe adds a test, and says "Done!" You check the code and find: no edge case for page=0, no test for empty results, no verification that the existing tests still pass, and the error handling swallows failures silently. The code compiles. It even runs. But it is not production-ready.

This is not a model intelligence problem. The model *knows* how to write edge-case tests. It *knows* about error handling. It just does not have a structured methodology that forces it to do those things before declaring done.

I ran a comparative evaluation: 9 real-world prompt scenarios, 244+ tool calls, bare Claude Code vs. MCP-augmented Claude Code. The bare agent completed tasks faster but shipped measurably more gaps. The augmented agent took longer per task but produced code with verification artifacts, quality gates, and documented edge cases.

The gap is not capability. It is methodology.

That is why I built [NodeBench MCP](https://github.com/HomenShum/nodebench-ai) — a Model Context Protocol server that gives AI agents the structured methodology they lack. 239 tools across 49 domains, organized so agents discover what they need without being overwhelmed.

## The Architecture: MCP as Methodology Middleware

### Why MCP

The [Model Context Protocol](https://modelcontextprotocol.io/) is an open standard that lets AI agents call external tools over a standardized JSON-RPC transport. Think of it as a USB-C port for AI capabilities. Claude Code, Cursor, Windsurf, and other MCP-compatible clients can all connect to the same server.

NodeBench MCP sits between the agent and your codebase as a middleware layer. Instead of hoping the agent remembers to run tests, the server provides tools like `start_verification_cycle`, `run_quality_gate`, and `log_test_result` that make the methodology executable.

### 49 Domains, 10 Presets

The 239 tools are organized into 49 domains:

- **Core methodology**: verification, eval, quality_gate, learning, flywheel, recon, security
- **Development**: architect, git_workflow, seo, ui_capture, vision, web, github
- **Research**: research_writing, rss, email, llm, docs, research_optimizer
- **Analysis**: local_file (CSV/XLSX/PDF/JSON parsing), pattern, benchmark
- **Agent infrastructure**: parallel, session_memory, agent_traverse, engine_context, mcp_bridge
- **Specialized**: flicker_detection, figma_flow, voice_bridge, toon (token-optimized encoding), critter (accountability checkpoints)

Nobody needs all 239 tools at once. Presets control what loads:

| Preset | Tools | Use Case |
|--------|-------|----------|
| `default` | ~50 | Core AI Flywheel — verification, eval, quality gates |
| `web_dev` | ~106 | Web projects — adds visual QA, SEO, architecture |
| `research` | ~71 | Research workflows — adds web, LLM, RSS, email |
| `data` | ~78 | Data analysis — adds file parsing, LLM extraction |
| `academic` | ~86 | Academic papers — adds writing polish, logic check |
| `full` | 239 | Everything |

```bash
# Default preset (recommended starting point)
npx nodebench-mcp@latest

# Web development preset
npx nodebench-mcp@latest --preset web_dev

# Everything
npx nodebench-mcp@latest --preset full
```

### Progressive Discovery: Why 239 Tools Don't Overwhelm the Agent

This is the architectural problem I spent the most time on. If you dump 239 tools into an agent's context, it wastes tokens scanning irrelevant options and picks poorly. If you give it too few, it misses capabilities it needs.

The solution is progressive discovery with three layers:

**Layer 1: Hybrid search with 14 strategies.** The `discover_tools` tool accepts a natural language query and runs it through keyword matching, fuzzy search, n-gram overlap, prefix matching, semantic similarity, TF-IDF scoring, regex patterns, bigram matching, domain cluster boosting, dense retrieval, embedding-based tool RRF, embedding-based domain RRF, graph traversal, and execution trace edges. Results are fused via Reciprocal Rank Fusion. The agent asks "I need to check code quality" and gets back the 5 most relevant tools, ranked.

**Layer 2: Agent-as-a-Graph bipartite embeddings.** Based on [arxiv:2511.18194](https://arxiv.org/abs/2511.18194), tools and domains are embedded into a joint vector space as a bipartite graph. When the agent searches, it gets both direct tool matches (tool nodes) and domain-level matches (domain nodes) that surface sibling tools the agent would not have found otherwise. Type-conditioned weighted Reciprocal Rank Fusion assigns different weights to tool vs. domain matches. In A/B evaluation, this improved search recall from 60% (lexical-only) to 87% (hybrid+embedding).

**Layer 3: Model-tier complexity routing.** Each tool has a complexity rating (low, medium, high) derived from its category or an explicit override. This tells the orchestrating agent which model tier to route to: low-complexity tools can run on Haiku (fast, cheap), medium on Sonnet, and high-complexity tools on Opus. The agent does not need all tools loaded — it discovers them on demand, at the right abstraction level.

The three progressive discovery tools — `discover_tools`, `get_tool_quick_ref`, and `get_workflow_chain` — are always loaded regardless of preset. They are the front door.

## The AI Flywheel: 6-Phase Verification

The core methodology is a 6-phase verification cycle that I call the AI Flywheel. Each phase produces artifacts that feed the next:

**Phase 1: Static analysis.** TypeScript compiler checks (`tsc --noEmit`), linting, type coverage. This catches the obvious stuff before anything runs.

**Phase 2: Happy-path tests.** Run the changed functionality with valid inputs. Confirm it does what it claims.

**Phase 3: Failure-path tests.** Feed invalid inputs, trigger error handlers, test edge cases. This is where most AI-generated code falls apart — the agent writes the happy path but skips adversarial inputs.

**Phase 4: Gap analysis.** Dead code detection, unused variables, missing integrations, intent mismatch (does the code actually solve the original problem?). This phase catches the subtle bugs where code compiles and passes tests but does not fulfill the requirement.

**Phase 5: Fix and re-verify.** After any fix, re-run phases 1-3 from scratch. No partial verification. This prevents the common pattern where fixing one bug introduces another.

**Phase 6: Re-examine for 11/10.** After the work is "done," examine it with fresh eyes. Check accessibility (prefers-reduced-motion, color-blind safety), error resilience (partial failures, retry with backoff), keyboard efficiency, and progressive disclosure for large datasets. The goal is not "no bugs" but "this is exceptional."

The tools enforce this. `start_verification_cycle` opens a tracked cycle. `log_test_result` records outcomes. `run_quality_gate` checks that all phases passed before the agent can declare done. `check_contract_compliance` scores the agent's behavior against the methodology contract.

The flywheel compounds: artifacts from phase 3 (edge-case tests) expand the eval suite. Regressions caught by evals trigger a new verification cycle. Over time, the test coverage grows organically.

## Distribution: 10 Channels in One Session

Getting the server published was its own project. MCP is young, and the registry ecosystem is fragmented. Here is where NodeBench MCP is listed:

1. **npm**: [`nodebench-mcp`](https://www.npmjs.com/package/nodebench-mcp) — the primary distribution channel
2. **GitHub**: [HomenShum/nodebench-ai](https://github.com/HomenShum/nodebench-ai) — source, issues, discussions
3. **Official MCP Registry**: `io.github.HomenShum/nodebench` — the `mcpName` field in package.json makes this discoverable by any registry-aware client
4. **Glama**: Listed in the Glama MCP directory
5. **PulseMCP**: Listed in PulseMCP's curated collection
6. **mcp.so**: Community directory listing
7. **mcpservers.org**: Community directory listing
8. **mcphub.io**: Community directory listing
9. **smithery.ai**: Community directory listing

The key insight: MCP registries are becoming the new package managers. The `mcpName` field (`io.github.HomenShum/nodebench`) in `package.json` is the equivalent of a reverse-domain identifier. Clients that support registry discovery can find and install NodeBench MCP without the user ever visiting npm.

The `server.json` format that some registries use is straightforward — it maps your npm package to transport configuration and documents which tools are available. If you are building an MCP server, publish to the official registry first, then syndicate to community directories.

## Results

After 8 months of development and daily dogfooding:

- **239 tools** across **49 domains**, organized into **10 presets**
- **497+ tests** across 13 test files (eval harness, dataset-driven, parallel, comparative, ablation)
- **35 workflow chains** for common development patterns (new_feature, fix_bug, code_review, security_audit, deployment, etc.)
- **Zero config** for the default preset — `npx nodebench-mcp@latest` and you are running
- **Embedding search** with local HuggingFace model (no API key needed), Google, or OpenAI fallback
- **TOON encoding** that saves ~40% tokens on tool responses (on by default, opt out with `--no-toon`)

What I learned building this:

**Progressive discovery is non-negotiable.** Any MCP server with more than ~20 tools needs it. Without search, agents waste context scanning irrelevant tools.

**Methodology beats capability.** The model already knows how to write good code. It just needs guardrails that force the verification loop.

**Presets are the right abstraction.** Not every project needs 239 tools. Giving users named bundles (web_dev, research, data) that map to their workflow is better than a flat tool list.

**Embeddings pay for themselves.** The 60% to 87% search recall improvement from adding neural embeddings to the hybrid search was the single highest-impact change. Local HuggingFace inference (Xenova/all-MiniLM-L6-v2, 384-dim INT8) means no API key required.

## Get Started

### Claude Code
```bash
claude mcp add nodebench -- npx nodebench-mcp@latest
```

### Cursor / Windsurf
Add to your MCP config (`.cursor/mcp.json` or equivalent):
```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["nodebench-mcp@latest"]
    }
  }
}
```

### With a preset
```bash
claude mcp add nodebench -- npx nodebench-mcp@latest --preset web_dev
```

### What to try first

Once installed, ask your agent:

1. **"Use discover_tools to find verification tools"** — see progressive discovery in action
2. **"Start a verification cycle for [your current task]"** — experience the 6-phase flywheel
3. **"Run a quality gate before we ship"** — see the methodology enforce itself

---

**GitHub**: [github.com/HomenShum/nodebench-ai](https://github.com/HomenShum/nodebench-ai)
**npm**: [npmjs.com/package/nodebench-mcp](https://www.npmjs.com/package/nodebench-mcp)
**Registry**: `io.github.HomenShum/nodebench`

Built by [Homen Shum](https://www.linkedin.com/in/homenshum/) — builder-analyst working at the intersection of finance, data engineering, and agentic AI. I use NodeBench MCP every day to build NodeBench MCP. The flywheel is real.
