# MCP + AI Agents Hackathon Submission

**Hackathon:** Hackathon for MCP and AI Agents
**Dates:** April 4-17, 2026
**URL:** https://aihackathon.dev/

---

## Project: NodeBench — Operating Intelligence via MCP

### One-liner
350-tool MCP server that gives AI agents decision intelligence, entity research, and QA automation — with memory that compounds across sessions.

### Categories to enter (pick 2-3 of 5)

1. **Best MCP Server** — NodeBench is a 350-tool MCP server with progressive discovery, 14-strategy hybrid search, and lazy-loaded toolsets. Starts with 15 tools, expands to 350 as agents discover what they need.

2. **Best Agent Application** — NodeBench powers founder workflows: weekly resets, company analysis, competitor briefs, delegation packets, and decision memos — all with session memory that remembers context across conversations.

3. **Most Innovative Use of AI Agents** — Progressive discovery is the innovation: agents don't browse a flat tool list, they search semantically and load toolsets on demand. Thompson-style "what to do next" guidance built into every tool's quick ref.

### Demo flow (60 seconds)

```
0:00 - Install: curl -sL nodebenchai.com/install.sh | bash
0:10 - Show: 15 starter tools loaded, discover_tools available
0:15 - Query: discover_tools('investigate Anthropic')
0:20 - Result: ranked tools with quick refs, workflow chains
0:25 - Load: load_toolset('founder') → 40 tools activate
0:30 - Run: site_map({ url: 'https://anthropic.com' }) → crawl results
0:40 - Drill: site_map({ action: 'findings' }) → QA issues found
0:45 - Diff: diff_crawl for before/after comparison
0:50 - Suggest: suggest_tests → scenario-based test cases generated
0:55 - Savings: compare_savings() → token/time ROI report
0:60 - End: "350 tools. Progressive discovery. Memory that compounds."
```

### Technical highlights

- **Progressive discovery**: 14-strategy hybrid search (keyword, fuzzy, n-gram, prefix, semantic, TF-IDF, regex, bigram, domain cluster, dense, neural embedding, domain RRF, upward traversal, execution trace)
- **Lazy loading**: Only imports tools for requested domains. Starter = 15 tools, founder = 40, full = 350. Under 50 for IDE limits.
- **Session memory**: Cross-session learning, trajectory scoring, skill freshness tracking
- **TOON encoding**: ~40% token savings on all tool responses
- **Agentic reliability**: 8-point checklist baked into rules (BOUND, HONEST_STATUS, TIMEOUT, SSRF, etc.)
- **Zero external deps for core**: SQLite-backed, runs entirely local. Optional API keys for web search/LLM.

### Team

- **Homen Shum** — Builder-analyst: banking/finance + data engineering + agentic AI
- GitHub: https://github.com/HomenShum
- Product: https://nodebenchai.com

### Install

```bash
# One-liner
curl -sL https://nodebenchai.com/install.sh | bash

# Or manual
claude mcp add nodebench -- npx -y nodebench-mcp --preset founder

# Or Cursor
# Add to .cursor/mcp.json:
# { "mcpServers": { "nodebench": { "command": "npx", "args": ["-y", "nodebench-mcp"] } } }
```

### Repository

https://github.com/HomenShum/nodebench-ai/tree/main/packages/mcp-local
