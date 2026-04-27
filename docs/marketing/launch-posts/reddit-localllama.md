# r/LocalLLaMA Post

**Title:** Open-source MCP server with 260 tools, model-tier routing, and progressive discovery that helps smaller models find the right tools

**Body:**

Built an MCP server designed to work well with models of all sizes, not just frontier. Two features make this relevant for the local LLM crowd:

## Progressive discovery (smaller models don't drown in tools)

Most MCP servers dump their entire tool list into context. With 260 tools, that's thousands of tokens of tool descriptions before the model even starts thinking. Smaller models choke on this.

NodeBench uses **progressive discovery**. The model starts with 6 meta-tools (search, browse, chain workflows). It searches for what it needs, and results include graph edges (`nextTools`, `relatedTools`) that guide it to the next step. The model only sees tools relevant to its current task.

The search system fuses 14 strategies via Reciprocal Rank Fusion:
- Keyword, fuzzy, n-gram, prefix, regex, bigram matching
- TF-IDF and semantic similarity
- Graph traversal and execution trace edges
- Embedding search (local HuggingFace all-MiniLM-L6-v2, 384-dim INT8)

Embedding search runs a local model by default -- no API calls needed. Falls back to Google (free tier) or OpenAI if you want cloud embeddings. Disable with `--no-embedding`.

## Model-tier complexity routing

Every tool has a complexity rating: `low`, `medium`, or `high`. This maps to Haiku/Sonnet/Opus tiers. The idea: if your orchestrator supports multi-model routing, don't waste your biggest model on `list_files` -- route it to a smaller model and save the big one for architecture decisions.

The complexity is derived from a 3-tier fallback: per-tool override -> per-category default -> medium. 32 categories have defaults, ~30 tools have specific overrides.

## Agent-as-a-Graph (arxiv:2511.18194)

Tools and domains are embedded as a bipartite graph. When a domain node matches a query, all tools in that domain get a boost. Type-specific weighted RRF with paper-optimal params (alpha_T=1.0, alpha_D=1.5, K=60). Validated via 6-config ablation grid.

Results: lexical-only search hit 60% recall at k=5. Hybrid+embedding+graph hit 87%. Zero drops.

## Presets

10 presets from 54 to 260 tools. `default` loads 9 domains (54 tools) -- enough for most tasks without context bloat. `full` loads all 49 domains.

```
default: 54 | web_dev: 106 | research: 71 | data: 78
devops: 68 | mobile: 95 | academic: 86 | multi_agent: 102
content: 77 | full: 260
```

## Install

Works with any MCP client (Claude Code, Cursor, Cline, Windsurf, etc.):

```bash
npx nodebench-mcp@latest
```

Or with Claude Code specifically:
```bash
claude mcp add nodebench -- npx nodebench-mcp@latest
```

Disable features you don't need:
```bash
npx nodebench-mcp@latest --no-embedding --no-toon --preset data
```

## What's in it

260 tools across 49 domains: quality gates, verification cycles, web scraping (Scrapling), session memory, structured eval harness, security recon, email (raw TLS), RSS, visual QA, architect tools (regex structural analysis), and more.

497+ tests across 13 test files. Eval bench includes SWE-bench-style tasks, BFCL v3 parallel eval, and comparative bench (bare agent vs MCP-augmented).

GitHub: https://github.com/HomenShum/nodebench-ai
npm: `nodebench-mcp`
MCP Registry: `io.github.HomenShum/nodebench`

Interested in hearing from anyone who's tried MCP with local models -- what tool counts start causing issues, and whether progressive discovery actually helps with context-limited models.
