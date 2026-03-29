# NodeBench Distribution Posts — Platform-Specific Versions

---

## 1. TWITTER/X (Thread — 5 tweets)

**Tweet 1 (Hook):**
What if your AI agent had 450 tools and knew which ones to use?

We just shipped NodeBench MCP -- one command to install, 10 rules auto-applied, interactive site mapping, before/after diffs, test generation, and ROI tracking.

curl -sL nodebenchai.com/install.sh | bash

Thread:

**Tweet 2 (Install):**
The install story:
- Writes .mcp.json automatically
- Copies 10 methodology rules to ~/.claude/rules/
- Adds .mcp.json to .gitignore
- Runs health check
- Suggests what to try first

Zero manual JSON editing. Zero config.

**Tweet 3 (Site Map):**
The site_map tool:
1. site_map({ url }) -- crawl all pages
2. site_map({ action: 'findings' }) -- see QA issues
3. diff_crawl({ url, baseline_id }) -- before/after proof
4. suggest_tests({ session_id }) -- scenario-based test cases

Agents crawl once, explore interactively. No browser.

**Tweet 4 (Progressive Discovery):**
450 tools, but you start with 15.

Progressive discovery: 14-strategy hybrid search. Type what you need, get ranked results with "what to do next" guidance.

load_toolset('founder') activates 40 tools. 'web_dev' gives 150. 'full' unlocks all 350.

**Tweet 5 (CTA):**
Submitted to Claude Code Plugin Directory and Cursor Marketplace (in review).

MIT licensed. Local-first. No cloud dependency.

GitHub: github.com/HomenShum/nodebench-ai
npm: npx nodebench-mcp
Site: nodebenchai.com

---

## 2. LINKEDIN (Single post)

**NodeBench MCP: 350 Tools That Install in One Command**

We just shipped the DX parity update for NodeBench -- and the install story went from "edit JSON manually" to "one curl command."

What changed:

[1] One-liner install: curl -sL nodebenchai.com/install.sh | bash
- Auto-writes .mcp.json
- Copies 10 methodology rules to your Claude Code
- Runs health check
- Zero config

[2] Interactive site mapping: site_map crawls your app, then lets agents drill into any page, view findings, and generate test cases -- all via MCP tool calls. No browser needed.

[3] Before/after proof: diff_crawl captures a baseline, you make changes, then it shows exactly what was added, removed, or changed. Regression-free proof.

[4] Auto-generated tests: suggest_tests reads your crawl findings and generates scenario-based test cases with real personas, goals, and assertions.

[5] ROI tracking: compare_savings shows total tool calls, TOON token savings [40%], time saved vs manual, and cost estimates.

The thesis behind NodeBench: right context, right order, better odds of right judgment. Never certainty.

Now submitted to Claude Code Plugin Directory and Cursor Marketplace.

MIT licensed. 450 tools. 68 domains. Progressive discovery.

github.com/HomenShum/nodebench-ai

---

## 3. HACKER NEWS (Show HN)

**Title:** Show HN: NodeBench MCP -- 450-tool MCP server with progressive discovery and one-command install

**Text:**
Hi HN, I built NodeBench -- an MCP server that gives AI coding agents decision intelligence, entity research, QA automation, and session memory.

The problem: MCP servers give you 5-10 tools each. To get coverage, you install 6+ servers that don't share context. Your agent can't remember what it learned yesterday.

NodeBench is one server with 450 tools across 68 domains, but you start with 15. Progressive discovery [1] uses a 14-strategy hybrid search engine -- agents find tools by describing what they need, not by browsing a catalog.

What's new today:
- One-command install: `curl -sL nodebenchai.com/install.sh | bash`
- Interactive site map: crawl a URL, then drill into pages via tool calls
- Before/after diff: prove your fixes actually fixed something
- Test generation: scenario-based test cases from crawl findings
- Token savings: 40% reduction via TOON encoding

Technical details:
- Lazy-loaded toolsets [2] -- only imports domains you request
- 14 search strategies: keyword, fuzzy, n-gram, TF-IDF, neural embedding, domain clustering, execution trace
- Session memory persists across conversations with trajectory scoring [3]
- SQLite-backed, fully local, no cloud dependency
- MIT licensed

[1] Progressive discovery: arxiv.org/abs/2509.20386
[2] Lazy loading via dynamic import per domain
[3] 8-dimension trajectory scoring: spanQuality, evidenceCompleteness, adaptationVelocity, trustLeverage, interventionEffect, drift, rawCompounding, trustAdjustedCompounding

GitHub: github.com/HomenShum/nodebench-ai
npm: npmjs.com/package/nodebench-mcp

---

## 4. REDDIT r/ClaudeAI and r/cursor

**Title:** I built a 450-tool MCP server that installs in one command -- progressive discovery means your agent finds tools by searching, not scrolling

**Body:**
Been building NodeBench for the past few months. It's a single MCP server with 450 tools across 68 domains -- decision intelligence, entity research, QA automation, session memory.

The key idea: you don't get 450 tools dumped on you. You start with 15 [starter preset]. Your agent calls `discover_tools('investigate a company')` and gets ranked results with "what to do next" guidance. It can `load_toolset('founder')` to activate 40 tools mid-session.

Just shipped:
- `curl -sL nodebenchai.com/install.sh | bash` -- one-liner install
- 10 rules auto-installed to ~/.claude/rules/ [auto-QA, analyst diagnostic, agentic reliability, etc]
- `site_map` -- interactive site crawl with drill-down
- `diff_crawl` -- before/after comparison
- `suggest_tests` -- generates scenario-based test cases from findings
- `compare_savings` -- shows token/time ROI

Submitted to Claude Plugin Directory and Cursor Marketplace.

MIT licensed. Local-first. No API keys required for core features.

Install: `npx nodebench-mcp`
GitHub: github.com/HomenShum/nodebench-ai

---

## 5. DEV.TO / HASHNODE

Use the full blog post from `NODEBENCH_DX_LAUNCH_POST.md` with these additions:

**Tags:** mcp, claude, cursor, ai-agents, developer-tools, open-source
**Series:** "Building NodeBench"
**Cover image:** Use the DXParityDemo video thumbnail or a terminal screenshot of the install flow

---

## 6. PRODUCT HUNT (for launch day)

**Tagline:** 350 MCP tools that install in one command -- progressive discovery for AI agents

**Description:**
NodeBench is a single MCP server with 450 tools across 68 domains. Your AI agent starts with 15 tools and discovers more as it needs them -- through search, not scrolling.

**Key features:**
- One-command install [curl or npx]
- 10 methodology rules auto-installed
- Interactive site mapping with drill-down
- Before/after diff crawling
- Auto-generated scenario-based tests
- Token savings tracking [40% via TOON encoding]
- Session memory that compounds across conversations

**Maker comment:**
I built NodeBench because I was tired of installing 6 MCP servers that couldn't share context. The thesis: right context, right order, better odds of right judgment. Start with `npx nodebench-mcp` and see what your agent discovers.
