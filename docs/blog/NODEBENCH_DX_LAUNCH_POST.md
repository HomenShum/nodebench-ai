# NodeBench MCP: 350 Tools That Install in One Command

**TL;DR:** NodeBench is a 450-tool MCP server that gives AI agents decision intelligence, entity research, QA automation, and session memory. Today we shipped one-liner install, 10 auto-installed rules, interactive site mapping, before/after diff crawling, test generation from crawl findings, and token savings tracking. Submitted to Claude Code Plugin Directory and Cursor Marketplace (in review).

---

## The Problem

Every developer using Claude Code or Cursor has the same experience: you install an MCP server, get 5-10 tools, and eventually hit a wall. The tool you need doesn't exist. So you install another server. And another. Soon you have 6 MCP servers, none of which talk to each other, and your agent can't remember what it learned yesterday.

## What We Built

NodeBench is a single MCP server with 450 tools across 68 domains. But you don't get 450 tools dumped on you. You start with 15 -- just decision intelligence and progressive discovery. As your agent works, it discovers more tools on demand.

The key insight: **agents should discover tools the same way developers discover APIs -- through search, not through scrolling.**

### What's New Today

**One-Command Install:**
```bash
curl -sL nodebenchai.com/install.sh | bash
```
This writes your `.mcp.json`, copies 10 rules to `~/.claude/rules/`, runs a health check, and you're ready. No manual JSON editing.

**Interactive Site Map:**
```
> site_map({ url: 'https://yoursite.com' })
Crawled: 6 screens, 42 elements, 2 findings

> site_map({ action: 'findings' })
ERROR  HTTP 404: /api/health
WARN   No interactive elements on /pricing
```
Agents crawl once, then drill into any screen interactively. No browser needed.

**Before/After Diff:**
```
> diff_crawl({ url: '...', baseline_id: 'sm_abc' })
+1 added: /settings
 2 changed: /dash (+3 elements), /search (title)
 0 new findings | 1 resolved
```
Prove your fixes actually fixed something.

**Auto-Generated Tests:**
```
> suggest_tests({ session_id: 'sm_abc' })
TEST 1: Page availability (first-time visitor)
TEST 2: Navigation completeness (2 orphan pages)
TEST 3: Mobile responsiveness (375x812)
```
Scenario-based test cases generated from crawl findings -- not boilerplate, real personas and goals.

**ROI Tracking:**
```
> compare_savings()
Tool calls: 127 | TOON savings: 40% tokens
Time saved: 10.6 hours vs manual | Cost: $0.38
```

### The Rules That Ship With It

When you install NodeBench, 10 rules automatically land in your `~/.claude/rules/` directory. These aren't generic -- they encode real engineering methodology:

- **Auto-QA** -- triggers quality checks after every code change
- **Analyst Diagnostic** -- 5-whys root cause before any fix
- **Agentic Reliability** -- 8-point checklist for agent-facing infrastructure
- **Scenario Testing** -- every test must model real human behavior
- **Self-Direction** -- agents decide next actions, don't wait for permission

Your Claude Code agent reads these rules every session and works more rigorously without you telling it to.

## How It Works

NodeBench uses **progressive discovery** -- a 14-strategy hybrid search engine that combines keyword matching, fuzzy search, n-gram overlap, TF-IDF, neural embeddings, domain clustering, and execution trace analysis.

When an agent calls `discover_tools('investigate a company')`, it doesn't get a flat list. It gets ranked results with Thompson-style "what to do next" guidance, workflow chains, and related tools for each result.

Tools are **lazy-loaded** -- only the domains you need are imported. The `starter` preset loads 15 tools. The `founder` preset loads 40. If you want everything, `full` gives you 350. All under the 50-tool IDE limit for Cursor.

**Session memory** persists across conversations. Your agent remembers what it learned, what tools it used, and what worked. The trajectory scoring system (8 dimensions) quantifies whether an agent is improving, flat, or drifting.

## Install

```bash
# One-liner (writes config, installs rules, runs health check)
curl -sL nodebenchai.com/install.sh | bash

# Or manual
claude mcp add nodebench -- npx -y nodebench-mcp

# Or Cursor
# Search "nodebench" in the Cursor Marketplace
```

## Links

- **GitHub:** github.com/HomenShum/nodebench-ai
- **npm:** npmjs.com/package/nodebench-mcp
- **Website:** nodebenchai.com

---

*NodeBench is MIT licensed. Built by Homen Shum -- banking background + agentic AI builder. The thesis: right context, right order, better odds of right judgment. Never certainty.*
