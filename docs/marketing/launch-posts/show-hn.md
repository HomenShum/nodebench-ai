# Show HN: NodeBench MCP -- 260-tool MCP server with progressive discovery and eval flywheel

**GitHub:** https://github.com/HomenShum/nodebench-ai
**npm:** `npx nodebench-mcp@latest`

I built an MCP server that gives AI agents quality gates, verification cycles, and structured eval -- the stuff that separates "it generated code" from "it shipped working code."

## What it does

260 tools across 49 domains. Zero config. But the interesting part isn't the tool count -- it's how agents find and use them.

**Progressive discovery.** Agents don't see 260 tools at once. They start with 6 meta-tools that let them search, browse, and chain workflows. Tool results include `nextTools` and `relatedTools` edges, forming a navigable graph. This matters because most MCP servers dump their entire tool list on context, burning tokens and confusing the model.

The discovery system uses 14 search strategies (keyword, fuzzy, n-gram, semantic, TF-IDF, bigram, graph traversal, execution trace edges) fused via Reciprocal Rank Fusion. Embedding search uses a local HuggingFace model (all-MiniLM-L6-v2, 384-dim) with fallback to Google/OpenAI APIs.

**Agent-as-a-Graph embeddings.** Based on arxiv:2511.18194. Tools and domains are embedded as a bipartite graph with type-specific weighted RRF (alpha_T=1.0, alpha_D=1.5, K=60). Domain matches boost all sibling tools. In A/B eval: lexical search hit 60% recall, hybrid+embedding hit 87%.

**AI Flywheel methodology.** 7-step loop: recon -> verify -> quality gate -> learn -> persist -> ship -> re-examine. The `re-examine` step is where agents catch the bugs they'd normally ship -- it forces a second pass through accessibility, resilience, performance, and design reduction checks.

**Eval results.** 497+ tests across 13 test files:
- 15-scenario eval harness (102 tool calls)
- 20 SWE-bench-style tasks (473 calls, 23 tools, 8 phases)
- BFCL v3 parallel eval (8 tasks, 80 calls, 4 concurrent workers)
- 9-scenario comparative bench: bare agent vs MCP-augmented agent

**Model-tier complexity routing.** Each tool has a complexity rating (low/medium/high) that maps to Haiku/Sonnet/Opus. Agents can route cheap lookups to Haiku and save Opus for architecture decisions.

## Presets

10 presets from 54 to 260 tools: default, web_dev, research, data, devops, mobile, academic, multi_agent, content, full. Pick the one that fits your workflow -- don't pay the context cost for tools you won't use.

## Install

```bash
claude mcp add nodebench -- npx nodebench-mcp@latest
```

Works with Claude Code, Cursor, Cline, Windsurf, or any MCP client. Also on the official MCP Registry as `io.github.HomenShum/nodebench`.

Built this because I kept watching agents skip verification, ship untested code, and forget what they were doing mid-session. The session memory tools alone (filesystem-persisted notes that survive context compaction) fixed half my issues.

Happy to answer questions about the progressive discovery architecture or the eval methodology.
