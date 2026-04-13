# NodeBench MCP: Behavioral Reexamination

**Date:** 2026-04-11
**Lens:** Behavioral design — not features, not polish. What agents and developers actually experience.

---

## The Verdict

NodeBench MCP is a **platform masquerading as a tool**.

Top MCP servers do one job: Filesystem (8 tools), Git (10 tools), Brave Search (6 tools), Sequential Thinking (1 tool). Playwright cut from 70+ to 8 essential tools and agent performance *improved*. Addy Osmani's agent-skills has **zero tools** — pure markdown workflows — and it's 12.6k stars.

NodeBench ships 418 tools across 59 categories with an embedding search engine, analytics pipeline, A/B testing framework, dashboard server, profiling hooks, and a dynamic tool loader — all in the hot path of "start server, answer task."

That's not an MCP server. That's an operating system nobody asked for yet.

---

## Root Cause Analysis (5 Whys)

**Symptom:** "Our MCP server is bloated, its performance is unverifiable, god knows how costly it is to run."

1. **Why is it bloated?** Because every new capability was added as tools rather than as workflows. 59 categories = 59 separate "what if the agent needs this" decisions.
2. **Why tools instead of workflows?** Because the architecture optimizes for *catalog completeness* (350+ tools!) rather than *task completion rate*.
3. **Why catalog completeness?** Because the product story is "breadth of intelligence" — more tools = more capable.
4. **Why that story?** Because there's no measurement of whether agents actually *complete tasks* with these tools. No time-to-value, no task success rate, no cost-per-completed-job.
5. **Why no measurement?** Because the eval harness tests *tool quality* (does the tool return good data?) not *workflow quality* (did the agent accomplish its goal?).

**Root cause: The MCP server is built around tool inventory, not job completion. It measures itself against its own catalog, not against what users accomplish.**

---

## Behavioral Principles Applied to nodebench-mcp

### 1. VALUE BEFORE IDENTITY (time-to-wow < 5 seconds)

**What good looks like:**
- Brave Search MCP: Agent calls `web_search("anthropic funding")`, gets results. Done. 1 tool, 1 job, < 2 seconds.
- agent-skills: Agent reads `skills/planning-and-task-breakdown/SKILL.md`, follows the steps. No discovery needed.

**NodeBench now:**
- Agent connects, receives 19 tools (starter preset). Good.
- Agent wants to research a company. Which tool? `entity_lookup`? `web_search`? `deep_sim_scenario`? `company_search`? `reconnaissance_map`?
- Agent calls `discover_tools("company research")`. Gets 15 results ranked by hybrid search across 14 strategies. Still has to pick one.
- **Time to first useful action: 30+ seconds of tool selection, not 2 seconds of doing the job.**

**The gap:** Discovery is search-shaped, not answer-shaped. "Here are 15 options" when the agent needs "use this one."

### 2. SPEED IS A FEATURE, NOT A METRIC

**What good looks like:**
- Linear: Sub-50ms for every interaction. They treat >200ms as a product bug.
- Playwright MCP: `navigate` + `snapshot` + `click`. Three tools, each returns in <1s.

**NodeBench now:**
- Boot time: ~3-4 seconds to start (measured). Includes embedding index load, analytics init, dashboard launch check.
- `discover_tools` with embedding search: depends on HuggingFace/Google/OpenAI API latency. No SLA. No fallback latency budget.
- Cost estimation: hardcoded lookup table (`costEstimator.ts`), not actual measured spend.
- No interaction latency budget. No "this tool call must complete in < Xms" enforcement.

**The gap:** Performance is aspirational, not instrumented. There are profiling hooks but no SLOs and no automated regression detection.

### 3. THE OUTPUT IS THE DISTRIBUTION

**What good looks like:**
- Perplexity: Every answer has a shareable URL with citations.
- ChatGPT: Every conversation is screenshot-worthy.
- agent-skills: Every skill produces verifiable evidence (test output, build result, screenshot).

**NodeBench now:**
- Tool results are JSON blobs returned to the agent. No shareable artifact.
- No "here's a URL to the investigation you just ran."
- No export format that works outside the MCP context.
- The web app has reports, but the MCP server doesn't produce anything shareable.

**The gap:** The MCP server produces data for agents, not artifacts for humans. There's no "show someone what NodeBench found" moment.

### 4. MEET USERS WHERE THEY ARE

**What good looks like:**
- The MCP protocol itself IS this principle — tools inside Claude Code, Cursor, Windsurf.
- Filesystem MCP: `npx -y @modelcontextprotocol/server-filesystem /path`. One command. Done.

**NodeBench now:**
- Install: `npx nodebench-mcp` works. Good.
- But then: which preset? What API keys? What embedding provider? What about the dashboard?
- The GETTING_STARTED.md is 246 lines. Filesystem MCP's is ~20 lines.
- Configuration surface area: 13 presets, 6+ env vars, 5 CLI flags, optional dashboard, optional engine mode.

**The gap:** The install is simple but the configuration is a platform. Agents using NodeBench must understand a *system*, not just call a *tool*.

### 5. THE PRODUCT IMPROVES ITSELF

**What good looks like:**
- TikTok: Algorithm gets better with every swipe.
- ChatGPT: Memory + custom instructions = personalized over time.
- NodeBench MCP *claims* this: session memory, progressive discovery rankings, co-occurrence edges, skill freshness.

**NodeBench now:**
- Co-occurrence edges exist in the registry. But do they actually improve discovery? No A/B test with real agents proves this.
- Session memory tools exist. But the compounding is invisible — the agent doesn't see "your last 3 sessions focused on fintech companies, prioritizing fintech tools."
- Skill freshness tracking exists. But it's a bookkeeping mechanism, not a behavioral signal.

**The gap:** Infrastructure for compounding exists but the feedback loop is invisible. No agent sees "NodeBench got smarter about your work."

---

## Structural Comparison

### What Agent-Skills Gets Right That NodeBench Doesn't

| agent-skills | nodebench-mcp |
|-------------|---------------|
| 0 tools, 20 skills (pure workflow) | 418 tools, no workflow pipeline |
| Lifecycle pipeline: DEFINE -> PLAN -> BUILD -> VERIFY -> REVIEW -> SHIP | Flat catalog with search |
| Anti-rationalization tables (prevents agents from skipping steps) | No behavioral guardrails |
| Every skill terminates with verifiable evidence | Tool results are JSON, verification is optional |
| 7 slash commands as entry points | 19+ discovery/meta tools as entry points |
| Token-conscious: every section justifies inclusion | 418 tools + embedding index + analytics in context |
| 12.6k stars, 1.5k forks | N/A |

**The fundamental difference:** agent-skills is a behavior system. nodebench-mcp is a capability catalog.

### What Top MCPs Get Right

| Pattern | Top MCPs | nodebench-mcp |
|---------|----------|---------------|
| **Tool count** | 5-20 focused tools | 418 tools across 59 categories |
| **Single responsibility** | One domain per server | 59 domains in one server |
| **First connection** | Full capability visible immediately | 19 tools + discovery system to find the rest |
| **Configuration** | Zero config or 1 CLI arg | 13 presets, 6+ env vars, 5 flags |
| **Install** | `npx -y @pkg/server` | `npx nodebench-mcp --preset founder` |
| **Cost** | Transparent (one API key = one cost) | Unknown (embedding + Gemini + web scraping + analytics) |
| **Verification** | Tool works or doesn't | 53-query eval harness (tests tools, not workflows) |

---

## The 6 Structural Causes (Applied to MCP Server)

### 1. "Home still behaves partly like a page"
**MCP equivalent:** The starter preset (19 tools) behaves like a catalog index, not a launchpad.
- **Symptom:** Agent's first action is `discover_tools`, not `do_the_job`.
- **Fix:** Starter preset should have 5-8 action tools (search, investigate, summarize, compare, track) + 1 meta tool (discover_tools for power users). Not 19 meta/discovery tools.
- **Metric:** Percentage of first tool calls that are action tools vs. discovery tools.
- **Target files:** `packages/mcp-local/src/tools/toolsetRegistry.ts` (starter preset definition)

### 2. "Chat still explains too much before it proves value"
**MCP equivalent:** Tool descriptions are marketing copy, not job descriptions.
- **Symptom:** `discover_tools` returns paragraphs of description per tool. Agent reads marketing, not instructions.
- **Fix:** Tool descriptions should be <50 words. What it does + when to use it. Period. The agent-skills pattern: "Use when [trigger conditions]."
- **Metric:** Average tool description length (words). Target: <50.
- **Target files:** `packages/mcp-local/src/tools/toolRegistry.ts` (all 418 descriptions)

### 3. "Reports is still archive-shaped"
**MCP equivalent:** Tool results are JSON blobs, not usable artifacts.
- **Symptom:** Agent gets data back but can't share it, reference it, or build on it.
- **Fix:** High-value tools should return both structured data (for agents) AND a shareable URL or markdown artifact (for humans).
- **Metric:** Percentage of tool results that produce a citable/shareable artifact.
- **Target files:** Tool handlers in `packages/mcp-local/src/tools/*.ts`

### 4. "Nudges still reads like future potential"
**MCP equivalent:** The 59 domains are theoretical capability, not proven workflows.
- **Symptom:** 59 categories exist. How many have been used by real agents to complete real tasks? Unknown.
- **Fix:** Instrument actual tool usage by external agents (not eval harness). Kill domains with <1% usage after 90 days.
- **Metric:** Tool usage distribution. Domains with zero external usage.
- **Target files:** `packages/mcp-local/src/analytics/toolTracker.ts`, `usageStats.ts`

### 5. "Me still reads like settings"
**MCP equivalent:** Session memory and context exist but don't compound visibly.
- **Symptom:** Agent uses NodeBench 100 times. 101st time is identical to 1st.
- **Fix:** On connection, if prior sessions exist, surface: "You've researched 5 fintech companies. Tools prioritized for fintech." Make compounding the first thing agents see.
- **Metric:** Returning-session personalization rate.
- **Target files:** `packages/mcp-local/src/tools/sessionMemoryTools.ts`, `index.ts` (startup)

### 6. "No true quality operating system"
**MCP equivalent:** No time-to-task-completion measurement. No cost tracking. No SLOs.
- **Symptom:** "God knows how costly it is to run and how well it ACTUALLY added value."
- **Fix:** Instrument: (a) actual API spend per tool call, not hardcoded estimates, (b) time from first tool call to task completion, (c) agent satisfaction signal (did the agent use the result or retry?).
- **Metric:** Cost per completed workflow. Task completion rate. Retry rate.
- **Target files:** `packages/mcp-local/src/profiling/costEstimator.ts`, new instrumentation

---

## Execution Board

| # | Cause | Symptom in nodebench-mcp | File/Component Targets | Metric to Enforce | Ship Order |
|---|-------|--------------------------|----------------------|-------------------|------------|
| 1 | Platform, not tool | 418 tools / 59 domains. Agent decision paralysis. | `toolsetRegistry.ts`, `toolRegistry.ts` | Starter preset: <=8 action tools. Total exposed: <=50 per preset. | **P0 — Week 1** |
| 2 | No workflow pipeline | Flat catalog with search. No DEFINE->PLAN->BUILD->VERIFY->SHIP. | New: `workflows/` directory with SKILL.md-style workflow files | % of agent sessions that follow a complete workflow. Target: >40%. | **P0 — Week 1** |
| 3 | Cost is invisible | Hardcoded cost table. No actual spend tracking. No user signal. | `costEstimator.ts`, `index.ts` (startup), new: cost dashboard tool | Actual $/tool call measured and surfaced. Budget alerts at $1, $5, $20. | **P0 — Week 2** |
| 4 | Performance unverified | Profiling exists but no SLOs. Boot = 3-4s. No latency budget per tool. | `index.ts` (startup), tool handlers, new: SLO enforcement | Boot <1.5s. Tool response p95 <2s. Embed search p95 <500ms. | **P1 — Week 2** |
| 5 | Descriptions are marketing | Tool descriptions average 80+ words. Marketing copy, not job specs. | `toolRegistry.ts` (all 418 entries) | All descriptions <50 words. Format: "Does X. Use when Y." | **P1 — Week 3** |
| 6 | No shareable artifacts | Tool results are JSON for agents only. No human-readable output. | High-value tool handlers (entity, research, deep_sim) | Top 10 tools produce markdown + optional shareable URL. | **P2 — Week 3** |
| 7 | Dead domains | 59 categories. Unknown how many have real external usage. | `toolTracker.ts`, `usageStats.ts` | Kill domains with <1% usage after 90-day measurement. Target: <=30 domains. | **P2 — Week 4** |
| 8 | No visible compounding | Session memory exists but 101st use = 1st use. | `sessionMemoryTools.ts`, `index.ts` | Returning sessions show personalized tool priority. Measurable via A/B. | **P2 — Week 4** |
| 9 | Config is a platform | 13 presets, 6+ env vars, 5 flags. | `index.ts`, GETTING_STARTED.md | Zero-config default works for 80% of users. README <60 lines. | **P1 — Week 2** |
| 10 | Eval tests tools, not jobs | 53-query eval harness tests tool output quality, not task completion. | `searchQualityEval.ts`, new: workflow completion eval | New eval: "Agent was asked to research Anthropic. Did it complete the task? How long? How much?" | **P1 — Week 3** |

---

## The Hard Question

> If you deleted 350 of the 418 tools, which 68 would an agent actually miss?

If you can't answer that from usage data, that's the problem.

The agent-skills pattern suggests the answer is closer to: **8 action tools + 3 workflow templates + 1 discovery meta-tool = 12 total.** Everything else is either a power-user extension (load on demand) or dead weight (delete).

---

## What "Premium MCP" Looks Like

```
# Install
npx nodebench-mcp

# That's it. No flags. No presets. No API keys for basic usage.
# 8 tools available immediately:

1. investigate(entity)     — Deep research on a company/person/topic
2. compare(entities[])     — Side-by-side analysis
3. track(entity)           — Watch for changes, get nudges
4. summarize(context)      — Synthesize any input into structured brief
5. search(query)           — Web + entity + knowledge search
6. forecast(scenario)      — What-if analysis with evidence scoring
7. report(topic)           — Generate shareable markdown report
8. discover_tools()        — Power users: unlock 350+ specialized tools

# Each tool returns:
# - Structured data (for agent consumption)
# - Markdown summary (for human reading)
# - Shareable URL (for distribution)
# - Cost: $0.002 (actual measured spend)
# - Latency: 1.2s (actual measured)
```

That's the MCP server people would install, use, and tell others about.

---

## References

- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) — 12.6k stars, 0 tools, pure workflow
- [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — 83.5k stars, 7 reference servers, 5-11 tools each
- [Speakeasy: Playwright MCP went from 70+ to 8 tools](https://www.speakeasy.com/blog/playwright-tool-proliferation) — agent performance improved
- [Progressive disclosure MCP: 85x token savings](https://matthewkruczek.ai/blog/progressive-disclosure-mcp-servers.html)
- [Evil Martians: 6 principles for developer tools](https://evilmartians.com/chronicles/six-things-developer-tools-must-have-to-earn-trust-and-adoption)
- [Linear: Quality Wednesdays + Zero-bugs policy](https://linear.app/blog)
- [Notion: Software sprawl problem](https://notion.so)
- [Perplexity: Answer engine architecture](https://perplexity.ai)
- Internal audit: `packages/mcp-local/` — 418 tools, 59 categories, 100+ source files, 3-4s boot
