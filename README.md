# NodeBench AI

---

### MCP runtime audit

### The Verdict

NodeBench MCP is a **platform masquerading as a tool**.

Top MCP servers do one job: Filesystem (8 tools), Git (10 tools), Brave Search (6 tools), Sequential Thinking (1 tool). Playwright cut from 70+ to 8 essential tools and agent performance *improved*. Addy Osmani's [agent-skills](https://github.com/addyosmani/agent-skills) has **zero tools** — pure markdown workflows — and it's 12.6k stars.

NodeBench ships 418 tools across 59 categories with an embedding search engine, analytics pipeline, A/B testing framework, dashboard server, profiling hooks, and a dynamic tool loader — all in the hot path of "start server, answer task."

That's not an MCP server. That's an operating system nobody asked for yet.

---

### Root Cause Analysis (5 Whys)

**Symptom:** "Our MCP server is bloated, its performance is unverifiable, god knows how costly it is to run."

1. **Why is it bloated?** Every new capability was added as tools rather than as workflows. 59 categories = 59 separate "what if the agent needs this" decisions.
2. **Why tools instead of workflows?** The architecture optimizes for *catalog completeness* (350+ tools!) rather than *task completion rate*.
3. **Why catalog completeness?** The product story is "breadth of intelligence" — more tools = more capable.
4. **Why that story?** There's no measurement of whether agents actually *complete tasks* with these tools. No time-to-value, no task success rate, no cost-per-completed-job.
5. **Why no measurement?** The eval harness tests *tool quality* (does the tool return good data?) not *workflow quality* (did the agent accomplish its goal?).

**Root cause: The MCP server is built around tool inventory, not job completion. It measures itself against its own catalog, not against what users accomplish.**

---

### 5 Behavioral Gaps

#### 1. VALUE BEFORE IDENTITY (time-to-wow < 5 seconds)

**What good looks like:**
- Brave Search MCP: Agent calls `web_search("anthropic funding")`, gets results. 1 tool, 1 job, < 2 seconds.
- agent-skills: Agent reads `skills/planning-and-task-breakdown/SKILL.md`, follows the steps. No discovery needed.

**NodeBench now:**
- Agent connects, receives 19 tools (starter preset). Good start.
- Agent wants to research a company. Which tool? `entity_lookup`? `web_search`? `deep_sim_scenario`? `company_search`? `reconnaissance_map`?
- Agent calls `discover_tools("company research")`. Gets 15 results ranked by hybrid search across 14 strategies. Still has to pick one.
- **Time to first useful action: 30+ seconds of tool selection, not 2 seconds of doing the job.**

**The gap:** Discovery is search-shaped, not answer-shaped. "Here are 15 options" when the agent needs "use this one."

#### 2. SPEED IS A FEATURE, NOT A METRIC

**What good looks like:**
- Linear: Sub-50ms for every interaction. They treat >200ms as a product bug.
- Playwright MCP: `navigate` + `snapshot` + `click`. Three tools, each returns in <1s.

**NodeBench now:**
- Boot time: ~3-4 seconds. Includes embedding index load, analytics init, dashboard launch check.
- `discover_tools` with embedding search: depends on HuggingFace/Google/OpenAI API latency. No SLA. No fallback latency budget.
- Cost estimation: hardcoded lookup table (`costEstimator.ts`), not actual measured spend.
- No interaction latency budget. No "this tool call must complete in < Xms" enforcement.

**The gap:** Performance is aspirational, not instrumented. Profiling hooks exist but no SLOs and no automated regression detection.

#### 3. THE OUTPUT IS THE DISTRIBUTION

**What good looks like:**
- Perplexity: Every answer has a shareable URL with citations.
- ChatGPT: Every conversation is screenshot-worthy.
- agent-skills: Every skill produces verifiable evidence (test output, build result, screenshot).

**NodeBench now:**
- Tool results are JSON blobs returned to the agent. No shareable artifact.
- No "here's a URL to the investigation you just ran."
- No export format that works outside the MCP context.

**The gap:** The MCP server produces data for agents, not artifacts for humans. No "show someone what NodeBench found" moment.

#### 4. MEET USERS WHERE THEY ARE

**What good looks like:**
- The MCP protocol itself IS this principle — tools inside Claude Code, Cursor, Windsurf.
- Filesystem MCP: `npx -y @modelcontextprotocol/server-filesystem /path`. One command. Done.

**NodeBench now:**
- Install: `npx nodebench-mcp` works. Good.
- But then: which preset? What API keys? What embedding provider? What about the dashboard?
- GETTING_STARTED.md is 246 lines. Filesystem MCP's is ~20 lines.
- Configuration surface: 13 presets, 6+ env vars, 5 CLI flags, optional dashboard, optional engine mode.

**The gap:** The install is simple but the configuration is a platform.

#### 5. THE PRODUCT IMPROVES ITSELF

**What good looks like:**
- TikTok: Algorithm gets better with every swipe.
- ChatGPT: Memory + custom instructions = personalized over time.

**NodeBench now:**
- Session memory, co-occurrence edges, skill freshness tracking all exist.
- But the compounding is invisible. No agent sees "NodeBench got smarter about your work."
- The 101st session is identical to the 1st.

**The gap:** Infrastructure for compounding exists but the feedback loop is invisible.

---

### Structural Comparison

#### What agent-skills Gets Right That NodeBench Doesn't

| agent-skills | nodebench-mcp |
|-------------|---------------|
| 0 tools, 20 skills (pure workflow) | 418 tools, no workflow pipeline |
| Lifecycle: DEFINE > PLAN > BUILD > VERIFY > REVIEW > SHIP | Flat catalog with search |
| Anti-rationalization tables (prevents agents from skipping steps) | No behavioral guardrails |
| Every skill terminates with verifiable evidence | Tool results are JSON, verification is optional |
| 7 slash commands as entry points | 19+ discovery/meta tools as entry points |
| Token-conscious: every section justifies inclusion | 418 tools + embedding index + analytics in context |

**The fundamental difference:** agent-skills is a behavior system. nodebench-mcp is a capability catalog.

#### What Top MCPs Get Right

| Pattern | Top MCPs | nodebench-mcp |
|---------|----------|---------------|
| Tool count | 5-20 focused tools | 418 tools across 59 categories |
| Single responsibility | One domain per server | 59 domains in one server |
| First connection | Full capability visible immediately | 19 tools + discovery system for the rest |
| Configuration | Zero config or 1 CLI arg | 13 presets, 6+ env vars, 5 flags |
| Cost | Transparent (one API key = one cost) | Unknown (embedding + Gemini + web scraping + analytics) |

---

### 6 Structural Causes (from Product Behavioral Design)

**1. Home behaves like a page, not a launchpad.**
- MCP equivalent: The starter preset (19 tools) is a catalog index, not a launchpad.
- Agent's first action is `discover_tools`, not `do_the_job`.
- Fix: 5-8 action tools + 1 meta tool. Not 19 meta/discovery tools.

**2. Chat explains too much before proving value.**
- MCP equivalent: Tool descriptions are marketing copy, not job descriptions.
- Fix: All descriptions <50 words. "Does X. Use when Y." Period.

**3. Reports are archive-shaped.**
- MCP equivalent: Tool results are JSON blobs, not usable artifacts.
- Fix: High-value tools return structured data + markdown summary + shareable URL.

**4. Nudges read like future potential.**
- MCP equivalent: 59 domains are theoretical capability, not proven workflows.
- Fix: Instrument actual external usage. Kill domains with <1% usage after 90 days.

**5. Me reads like settings.**
- MCP equivalent: Session memory exists but doesn't compound visibly.
- Fix: On reconnection, surface "You've researched 5 fintech companies. Prioritizing fintech tools."

**6. No true quality operating system.**
- MCP equivalent: No time-to-task-completion. No real cost tracking. No SLOs.
- Fix: Instrument actual API spend, task completion time, agent retry rate.

---

### Execution Board

| # | Cause | Symptom | Target Files | Metric | Ship |
|---|-------|---------|-------------|--------|------|
| 1 | Platform, not tool | 418 tools / 59 domains. Agent decision paralysis. | `toolsetRegistry.ts`, `toolRegistry.ts` | Starter preset: <=8 action tools | **P0 Wk1** |
| 2 | No workflow pipeline | Flat catalog with search. No lifecycle pipeline. | New: `workflows/` with SKILL.md-style files | >40% sessions follow complete workflow | **P0 Wk1** |
| 3 | Cost invisible | Hardcoded cost table. No actual spend tracking. | `costEstimator.ts`, `index.ts` | Actual $/tool call measured and surfaced | **P0 Wk2** |
| 4 | Performance unverified | No SLOs. Boot = 3-4s. No latency budget. | `index.ts`, tool handlers | Boot <1.5s. Tool p95 <2s. Embed p95 <500ms | **P1 Wk2** |
| 5 | Descriptions are marketing | Avg 80+ words per tool description. | `toolRegistry.ts` (all 418 entries) | All descriptions <50 words | **P1 Wk3** |
| 6 | No shareable artifacts | Tool results = JSON for agents only. | High-value tool handlers | Top 10 tools produce markdown + URL | **P2 Wk3** |
| 7 | Dead domains | 59 categories, unknown real usage. | `toolTracker.ts`, `usageStats.ts` | Kill domains <1% usage. Target: <=30 | **P2 Wk4** |
| 8 | No visible compounding | 101st session = 1st session. | `sessionMemoryTools.ts`, `index.ts` | Returning sessions show personalized priority | **P2 Wk4** |
| 9 | Config is a platform | 13 presets, 6+ env vars, 5 flags. | `index.ts`, GETTING_STARTED.md | Zero-config for 80%. README <60 lines | **P1 Wk2** |
| 10 | Eval tests tools not jobs | 53-query eval tests tool output, not task completion. | `searchQualityEval.ts`, new eval | Cost per workflow. Task completion rate. Retry rate. | **P1 Wk3** |

---

### The Hard Question

> If you deleted 350 of the 418 tools, which 68 would an agent actually miss?

If you can't answer that from usage data, that's the problem.

---

### What "Premium MCP" Looks Like

```
npx nodebench-mcp

# No flags. No presets. No API keys for basic usage.
# 8 tools available immediately:

investigate(entity)     # Deep research on a company/person/topic
compare(entities[])     # Side-by-side analysis
track(entity)           # Watch for changes, get nudges
summarize(context)      # Synthesize any input into structured brief
search(query)           # Web + entity + knowledge search
forecast(scenario)      # What-if analysis with evidence scoring
report(topic)           # Generate shareable markdown report
discover_tools()        # Power users: unlock 350+ specialized tools

# Each tool returns:
# - Structured data (for agent consumption)
# - Markdown summary (for human reading)
# - Shareable URL (for distribution)
# - Cost: $0.002 (actual measured spend)
# - Latency: 1.2s (actual measured)
```

---

### What Made Premium Products Premium

Not empty-state cards, better pills, or prettier borders. It was:

- **Fewer jobs per screen** — Notion subtracts tools and consolidates workflows
- **Faster time to first value** — Linear treats >200ms as a product bug
- **Visible trust signals** — Perplexity: direct answer, trusted sources, synthesis in one place
- **Integrated context** — ChatGPT memory makes later interactions more relevant
- **Relentless quality discipline** — Linear Quality Wednesdays: 1,000+ small fixes as standing habit
- **Hard latency standards** — First visible response <800ms, first source <2s, first section <5s

### Interaction Budgets

| Event | Target |
|-------|--------|
| First visible response in Chat | < 800ms |
| First source visible | < 2s |
| First section completed | < 5s |
| No layout jump larger than one component height after first paint | Always |
| MCP tool boot | < 1.5s |
| MCP tool response p95 | < 2s |
| Embedding search p95 | < 500ms |

### The Context Loop That Must Work

```
Home -> Chat -> Report -> Nudge -> Chat
```

If that loop is weak, the app will always feel like isolated screens. Every surface must feed the next. Reports reusable as context. Nudges triggering new investigations. Chat building on prior sessions.

---

### References

- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) — 12.6k stars, 0 tools, pure workflow
- [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — 83.5k stars, 7 reference servers
- [Speakeasy: Playwright cut from 70+ to 8 tools](https://www.speakeasy.com/blog/playwright-tool-proliferation)
- [Progressive disclosure MCP: 85x token savings](https://matthewkruczek.ai/blog/progressive-disclosure-mcp-servers.html)
- [Evil Martians: 6 principles for developer tools](https://evilmartians.com/chronicles/six-things-developer-tools-must-have-to-earn-trust-and-adoption)
- [Linear: Quality Wednesdays](https://linear.app/blog) — 1,000+ quality fixes as standing habit
- [Linear: Zero-bugs policy](https://linear.app/blog) — no backlog sink, fix now or decline
- Full analysis: [`docs/architecture/MCP_BEHAVIORAL_REEXAMINATION.md`](docs/architecture/MCP_BEHAVIORAL_REEXAMINATION.md)

Entity intelligence for any company, market, or question.

**Live:** [nodebenchai.com](https://www.nodebenchai.com) · **npm:** `npx nodebench-mcp` · **GitHub:** [HomenShum/nodebench-ai](https://github.com/HomenShum/nodebench-ai)

---

## What It Does

Search any company. Get a decision-ready intelligence packet with people, timeline, financials, competitive landscape, product intelligence, and risk flags — shaped for your role (founder, investor, banker, CEO, legal, student).

- **Deep diligence**: 6 parallel research branches, each chaining up to 3 levels deep
- **Gap remediation**: Every risk comes with actionable steps, effort estimates, and expected outcomes
- **SEO audit**: Automatic discoverability scoring with missing-presence detection
- **Self-search**: Search your own company — NodeBench injects your local context for honest self-assessment

## Quick Start

### Option 1: Use the Web App

Go to [nodebenchai.com](https://www.nodebenchai.com) and search.

### Option 2: Connect via MCP (Claude Code / Cursor / Windsurf)

```bash
# Claude Code (one command)
claude mcp add nodebench -- npx -y nodebench-mcp --preset founder

# Cursor
npx nodebench-mcp --preset cursor

# Any MCP client
npx nodebench-mcp --preset starter
```

That's it. NodeBench starts with 15 tools and discovers more as you need them.

### Option 2b: Claude Code Plugin (slash commands + Codex delegation)

```bash
/plugin marketplace add HomenShum/nodebench-ai
/plugin install nodebench@nodebench
/reload-plugins
/nodebench:setup
```

Commands: `/nodebench:search`, `/nodebench:diligence`, `/nodebench:remediate`, `/nodebench:packet`

With [Codex plugin](https://github.com/openai/codex-plugin-cc) installed, `/nodebench:remediate --delegate` sends gap fixes to Codex for background implementation.

### Option 3: Run Everything Locally

```bash
git clone https://github.com/HomenShum/nodebench-ai.git
cd nodebench-ai
npm install
cp .env.example .env.local  # Add your API keys

# Start the app
npm run dev                  # Frontend (Vite, port 5191)
npx convex dev               # Backend (Convex)

# Or just the MCP server
cd packages/mcp-local && npx tsx src/index.ts
```

## Claude Code Setup Guide

After running `claude mcp add nodebench -- npx -y nodebench-mcp --preset founder`, Claude Code can guide itself. Here's what to tell it:

```
I have NodeBench MCP connected. Help me:

1. Run `discover_tools` to see what's available
2. Search my company: use `web_search` + `enrich_entity` for "[Your Company]"
3. Get my weekly reset: use `founder_local_weekly_reset`
4. Analyze a competitor: use `run_recon` for "[Competitor Name]"
```

### Presets

| Preset | Tools | Best for |
|--------|-------|----------|
| `starter` | 15 | First-time users, any IDE |
| `founder` | ~40 | Founders — weekly reset, delegation, company truth |
| `banker` | ~40 | Bankers — diligence, credit memo, risk analysis |
| `cursor` | 28 | Cursor IDE (fits tool cap) |
| `full` | 350+ | Power users — everything |

## RETHINK REDESIGN APR 2026

This section captures the redesign doctrine for NodeBench after comparing the product against the interaction standards set by Linear, Notion, Vercel, ChatGPT, and Perplexity.

The core lesson: premium product quality does not come from patching empty states, adding cards, or polishing borders. Those are symptoms. The real work is fixing the behavioral causes.

### What Actually Makes Competitor-Grade Products Feel Good

#### 1. One dominant job per screen

The best products reduce cognitive switching. They do not ask the user to interpret multiple equal-weight surfaces at once.

For NodeBench this means:
- `Home` is a launchpad, not a dashboard
- `Chat` is the product, not one panel among many
- `Reports` is reusable memory, not an archive browser
- `Nudges` is an action layer, not a notification dump
- `Me` is private leverage, not a profile/settings graveyard

#### 2. Trust comes from visible reasoning

Premium AI products make it clear:
- what the system is doing
- what sources it used
- what it still does not know
- what changed

For NodeBench this means:
- the answer column must stay primary
- sources must be visible without tab switching
- agent activity should support trust, not compete with the answer
- partial report construction should feel live and grounded

#### 3. Speed is product behavior

Users judge quality by how fast the product becomes useful, not by backend claims.

For NodeBench this means enforcing:
- first useful response fast
- first cited source fast
- first completed section fast
- no jarring layout shifts after the first paint
- stable input, rail, and answer regions during streaming

#### 4. Quality must be a system

Linear feels premium because quality is institutionalized, not because of one redesign sprint.

For NodeBench this means:
- no piling up papercuts for later
- spacing, type, states, and motion must be reviewed continuously
- bugs and regressions must be fixed or explicitly rejected
- the public product shell must not drift back into internal-tool clutter

#### 5. Context must compound over time

The best products get more useful because they remember the right things and reuse them in the right place.

For NodeBench this means:
- `Home -> Chat -> Report -> Nudge -> Chat` is the primary loop
- saved work must reopen cleanly
- private context from `Me` must materially improve the next run
- Nudges must route back into useful action, not passive viewing

#### 6. Fewer surfaces, stronger hierarchy

Competitor-grade products are opinionated about hierarchy. They do not give every box the same visual weight.

For NodeBench this means:
- one primary surface per page
- quieter secondary rails
- fewer borders, more hierarchy from spacing and typography
- less hero noise and fewer stacked cards competing equally

### What This Means In Practice For NodeBench

#### Product laws

- `Home = discovery`
- `Chat = execution`
- `Reports = memory`
- `Nudges = action`
- `Me = private context`

#### Design laws

- image-first cards
- split-screen reading on desktop
- answer-first chat
- sources visible without switching tabs
- minimal wasted vertical space
- consistent interactive states
- light and dark mode must both feel first-class

#### Engineering laws

- optimize for time to value, not just render completion
- preserve stable layout during SSE streaming
- instrument first-answer, first-source, first-report timings
- treat motion, loading, and empty states as product behavior
- keep public routing separate from internal/admin complexity

### Metrics To Enforce

- `ask_submitted_at`
- `first_partial_answer_at`
- `first_source_at`
- `first_saved_report_at`
- `first_return_visit_to_report_at`

Target behavior:
- first visible response under `800ms` when possible
- first source visible under `2s`
- first meaningful report section under `5s`
- no large layout jumps after initial paint

### What Not To Confuse With Real Progress

These help, but they are not the root:
- prettier empty states
- more cards
- more pills
- more labels
- more decorative motion
- more top-level pages

If NodeBench feels weak, assume the cause is one of:
- unclear dominant job
- slow time to value
- weak trust signals
- poor context reuse
- inconsistent quality discipline
- too much equal-weight UI

### Product Inspiration References

These are not clones. They are reference points for the underlying product behavior:
- Notion on reducing software sprawl: https://www.notion.com/blog/how-were-killing-software-sprawl-by-using-our-own-product
- Notion AI design thinking: https://www.notion.com/blog/the-design-thinking-behind-notion-ai
- Vercel on designing time-to-aha product tours: https://vercel.com/blog/designing-the-vercel-virtual-product-tour
- Vercel on dashboard performance: https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast
- Linear on transparent AI reasoning: https://linear.app/now/how-we-built-triage-intelligence
- Linear on systematic quality: https://linear.app/now/quality-wednesdays
- Linear on zero-bugs policy: https://linear.app/now/zero-bugs-policy
- OpenAI on memory and context reuse in ChatGPT: https://openai.com/index/memory-and-new-controls-for-chatgpt/
- OpenAI on connected work surfaces in ChatGPT Pulse: https://openai.com/index/introducing-chatgpt-pulse/
- Perplexity on answer-engine behavior: https://www.perplexity.ai/help-center/en/articles/10354917-what-is-an-answer-engine-and-how-does-perplexity-work-as-one
- Perplexity on Research mode: https://www.perplexity.ai/help-center/en/articles/10738684-what-is-research-mode

### Non-Negotiable Redesign Standard

NodeBench should not feel like:
- a stretched mobile app on desktop
- an internal dashboard exposed to users
- a stack of equally loud cards
- a chat window with hidden reasoning
- a product that forgets prior work

NodeBench should feel like:
- one clear place to start
- one clear place to watch the work happen
- one clear place to reopen useful outputs
- one clear place to act on follow-ups
- one clear place where private context compounds over time

## Architecture

```
nodebenchai.com (React + Vite + Tailwind)
    ↓
Convex Cloud (realtime DB + 10-min actions + durable workflows)
    ↓
Deep Diligence Pipeline:
  Entity Resolution → 6 Parallel Branches → Chained Depth (3 levels)
    ├── People & Leadership
    ├── Company History & Timeline
    ├── Financials & Metrics
    ├── Market & Competitive
    ├── Products & Technology
    └── Risks & Diligence Flags
    ↓
Gap Remediation → SEO Audit → Actionable Next Steps
    ↓
Result Packet (realtime via Convex subscription)
```

### Key Tech

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: Convex (realtime database, serverless functions, durable workflows)
- **Search**: Linkup API + Gemini 3.1 extraction + 4-layer grounding pipeline
- **MCP Server**: Node.js, TypeScript, better-sqlite3, 350+ tools across 57 domains
- **Design**: Glass cards, terracotta `#d97757`, Manrope + JetBrains Mono

## API Keys

Set these in `.env.local` (local dev) or Convex environment (production):

| Key | Required | Purpose |
|-----|----------|---------|
| `GEMINI_API_KEY` | Yes | Gemini 3.1 for classification, extraction, synthesis |
| `LINKUP_API_KEY` | Recommended | Deep web search with sourced answers |
| `VITE_CONVEX_URL` | Yes (app) | Convex deployment URL |

```bash
# Set Convex env vars
npx convex env set GEMINI_API_KEY "your-key"
npx convex env set LINKUP_API_KEY "your-key"
```

## Project Structure

```
nodebench-ai/
├── src/                          # React frontend
│   ├── features/                 # Feature modules (controlPlane, founder, monitoring)
│   ├── hooks/useConvexSearch.ts  # Convex search hook (realtime polling)
│   └── layouts/                  # App shell, surface routing
├── convex/                       # Convex backend
│   ├── domains/search/           # Deep diligence pipeline
│   │   ├── searchPipeline.ts     # Mutations + queries (start, get, cache)
│   │   ├── searchPipelineNode.ts # Quick search action
│   │   └── deepDiligence.ts      # 6-branch deep diligence + remediation
│   └── schema.ts                 # Database schema (50+ tables)
├── packages/mcp-local/           # MCP server (npm: nodebench-mcp)
│   ├── src/tools/                # 350+ tool implementations
│   ├── src/subconscious/         # Memory blocks, graph engine, whisper policy
│   └── src/toolsetRegistry.ts    # Lazy-loading tool domains
├── server/                       # Express server (local dev + Vercel)
│   ├── routes/search.ts          # SSE search (Vercel fallback)
│   └── agentHarness.ts           # Agent orchestration
└── docs/architecture/            # Specs and analysis
```

## RETHINK REDESIGN APR 2026

### What Was Done

**Audit phase** -- 40 pages traversed at 1440px (desktop) and 375px (mobile) via parallel agents. attrition.sh deconstructed as design target (3 pages vs NodeBench's 40+ routes). 6 Addy Osmani agent-skills indexed (frontend-ui-engineering, code-simplification, deprecation-migration, performance-optimization, browser-testing, accessibility-checklist).

**P0 fixes (8):**
- Root route default changed from memo to ask
- Table overflow fixed on pricing and telemetry (mobile)
- Temporal Gate widget removed from user-facing surfaces
- Tool count normalized to 350 across 6 files (was 304/338/350+)
- About page version dynamically read from package.json (was hardcoded v2.70.0)
- Onboarding wizard scoped to main surfaces only (was appearing on /pricing, /legal)
- textTransform SVG attribute removed (React DOM warning)
- CommandPalette crash investigated -- false positive, import confirmed correct

**Attrition-style landing page:**
- `LandingScroll.tsx` (370 lines) -- 7 scroll-reveal sections with IntersectionObserver
- Sections: Product in One Screen, Six Role Lenses, How It Works, Comparison Table, Real Metrics, Who It's For, Get Started
- Glass card DNA, terracotta accents, `[N/8]` section numbering, `prefers-reduced-motion` respected
- Integrated into `HomeLanding.tsx` (the actual ask surface renderer)

**Route migration:**
- 18 routes marked `group: "legacy"` with `legacyRedirectTo`
- /deep-sim (dead), 13 founder/* routes, 4 -home routes
- All legacy route components set to `component: null`
- SURFACE_DEFAULT_VIEW updated (memo: deep-sim to decision-snapshot)

**Dead code removal (16 files deleted):**
- 11 orphaned founder view components
- AgentHandoffPanel, ControlPlaneLanding + test, ForecastGateSummary, ForecastGateCard
- Registry helpers cleaned (viewToolMap, viewCapabilityRegistry stale entries removed)

**Premium polish pass (agent-skills framework):**
- Focus-visible rings on all interactive elements (WCAG 2.4.7)
- Section headers promoted to semantic H2 (NudgesHome, MeHome)
- Typography tokens standardized (tracking: 0.18em, size: 11px)
- Chat content ordering fixed -- answer first on mobile (was buried under metadata)
- Reports filter sidebar collapses on mobile with toggle button
- Reports preview panel hidden on mobile
- Nav breakpoint unified (lg to xl) -- eliminated duplicate nav 1024-1280px
- Chip/pill sizing -- data-density="compact" excludes 44px global override
- TopNav padding responsive (py-2.5 mobile, py-4 desktop)

### Current Scores (Post-Polish)

| Surface | Visual | Density | Interaction | Empty State | Investor-Ready | AVG |
|---------|--------|---------|-------------|-------------|----------------|-----|
| Home    | 7      | 8       | 7           | 7           | 7              | 7.2 |
| Chat    | 7      | 6       | 7           | 8           | 7              | 7.0 |
| Reports | 5      | 3       | 6           | 5           | 4              | 4.6 |
| Nudges  | 6      | 5       | 6           | 7           | 6              | 6.0 |
| Me      | 8      | 8       | 6           | 7           | 7              | 7.2 |
| **AVG** | **6.6**| **6.0** | **6.4**     | **6.8**     | **6.2**        | **6.4** |

### What Makes It Not 100

The gap is not polish. It is 5 behavioral principles that Linear, ChatGPT, Perplexity, Notion, and Vercel share:

**1. VALUE BEFORE IDENTITY (time-to-wow < 5s)**
ChatGPT: one text box, type, get answer, no signup. Perplexity: search bar, instant synthesis. NodeBench: landing page with cards and explanations before the user can do anything. The search bar exists but is surrounded by demo content. First pixel should be the input field.

**2. SPEED IS A FEATURE, NOT A METRIC**
Linear: sub-50ms everything. ChatGPT: streaming makes latency feel like thinking. NodeBench: surface transitions have no skeleton/loading. Cards pop in all at once. No progressive reveal during streaming.

**3. THE OUTPUT IS THE DISTRIBUTION**
ChatGPT: every conversation is a screenshot people share. Perplexity: shareable answer URLs with citations. NodeBench: reports exist but no one-click share URL. No shareable artifact that works without auth.

**4. MEET USERS WHERE THEY ARE**
Linear: Cmd+K everywhere. ChatGPT: one text box, absence of UI IS the UI. NodeBench: 5-surface app with top nav + bottom nav. User must learn navigation before getting value. The MCP server meets users in Claude Code/Cursor -- the web app should too.

**5. THE PRODUCT IMPROVES ITSELF**
TikTok: algorithm improves with every swipe. ChatGPT: memory + custom instructions = personalization. NodeBench: no visible learning. No "based on your previous searches." Me surface has the infrastructure but nothing visible says "getting better for you."

### What Closes the Gap

| Principle | Build | Effort |
|-----------|-------|--------|
| Value before identity | Strip Home to JUST search bar + one live result. Kill Trending Reports above-fold. First pixel = input. | S |
| Speed as feature | Skeleton loading on surface transitions. Stream report sections progressively. Cmd+K to focus search. | M |
| Output = distribution | Shareable report URLs that render without auth. Copy link + Share on every report card. | M |
| Meet them where they are | Support `?q=anthropic+ai` URL queries that go straight to results. The MCP server already does this. | S |
| Product improves itself | Show "Based on your 3 recent searches" on Home. Surface Me context visibly. | M |

### Key Files

- Spec: `docs/architecture/ATTRITION_REDESIGN_SPEC.md`
- Landing scroll: `src/features/controlPlane/components/LandingScroll.tsx`
- Home surface: `src/features/home/views/HomeLanding.tsx`
- Chat surface: `src/features/chat/views/ChatHome.tsx`
- Reports surface: `src/features/reports/views/ReportsHome.tsx`
- Nudges surface: `src/features/nudges/views/NudgesHome.tsx`
- Me surface: `src/features/me/views/MeHome.tsx`
- View registry: `src/lib/registry/viewRegistry.ts`
- Design tokens: `src/index.css`
- Top nav: `src/layouts/ProductTopNav.tsx`
- Mobile tab bar: `src/layouts/MobileTabBar.tsx`

## License

MIT
## RETHINK REDESIGN APR 2026

### Why This Section Exists

We applied the same behavioral design principles that made Linear, Perplexity, ChatGPT, Notion, and Vercel feel premium — and found that both NodeBench and attrition.sh violate all five of them. This section is a permanent record of that audit and the execution plan.

### The 5 Principles We Violate

#### 1. VALUE BEFORE IDENTITY — time-to-wow < 5 seconds

**What premium products do**: ChatGPT has one text box. Perplexity has one search bar. Linear lets you create an issue in 3 seconds from Cmd+K. The first pixel IS the first action.

**What we do wrong**: Both products lead with explanation pages, competitive tables, feature cards, and navigation systems. The user must understand what we are before they can use us.

**Fix**: The first thing on screen must be the thing you do. For attrition: a scan input. For NodeBench: the Ask search bar. Everything else is below the fold.

#### 2. SPEED IS A FEATURE, NOT A METRIC

**What premium products do**: Linear renders in sub-50ms. ChatGPT streams responses so 3 seconds feels like watching someone think. Perplexity shows sources progressively.

**What we do wrong**: Attrition's chat panel has hardcoded fake delays. Cloud Run cold starts take 1-5s with no feedback. NodeBench's pipeline has no progressive streaming of answer sections. No skeleton loading on surface transitions.

**Fix**: Hard latency budgets — first visible response < 800ms, first source < 2s, first complete section < 5s. Progressive rendering, not batch reveals.

#### 3. THE OUTPUT IS THE DISTRIBUTION

**What premium products do**: Every ChatGPT conversation is a screenshot people share. Every Perplexity answer has a shareable URL with citations. TikTok watermarks videos for cross-platform sharing.

**What we do wrong**: Neither product generates shareable URLs for results. No screenshot-worthy artifact. No "send this to a colleague" moment.

**Fix**: Generate shareable result URLs (`/scan/:id`, `/report/:id`) that render without auth. Design result cards as screenshot-worthy single visuals.

#### 4. MEET USERS WHERE THEY ARE

**What premium products do**: Linear has Cmd+K everywhere. ChatGPT's absence of UI IS the UI. Products meet users in their existing workflow, not in a new navigation system.

**What we do wrong**: Attrition has 11 pages with 4+ nav tabs. NodeBench has 5 surfaces with sidebar + top nav + bottom nav. Users must learn a navigation system before getting value.

**Fix**: Make chat/search the primary surface. Everything reachable from one input. URL-based queries (`?q=` or `?scan=`) that skip all navigation.

#### 5. THE PRODUCT IMPROVES ITSELF

**What premium products do**: TikTok's algorithm gets better with every swipe. ChatGPT's memory makes later interactions more relevant. Notion AI fits into existing blocks.

**What we do wrong**: No visible learning in either product. The infrastructure exists (correction learner, Me context, workflow memory) but nothing in the UI says "I'm getting better for you."

**Fix**: Show "based on your previous N sessions" suggestions. Show correction learning visibly. Make returning users see personalized context that proves the product knows them.

### The Deeper Problem: Surface Sprawl

**attrition.sh**: 11 pages (Landing, Proof, Improvements, Get Started, Live, Workflows, Judge, Anatomy, Benchmark, Compare, Chat) for a product that does ONE thing — catch when agents skip steps. Should be 3 surfaces: scanner + chat + docs.

**NodeBench**: 5 surfaces (Ask, Workspace, Packets, History, Connect) plus Oracle, flywheel, trajectory, benchmark, and dogfood surfaces. The MCP server has 350+ tools across 57 domains. Should follow the Addy Osmani agent-skills pattern: each skill = ONE thing, ONE workflow.

### The MCP Bloat Problem

Both products have MCP tool registries that grew by accretion, not by design.

**NodeBench MCP**: 350+ tools, 57 domains, progressive discovery layers, analytics client, embedding index, dashboard launcher, profiling hooks — all in the boot path. Performance is self-benchmarked, not user-value-benchmarked.

**attrition MCP**: 12 tools where 6 would do. `bp.sitemap`, `bp.ux_audit`, `bp.diff_crawl`, `bp.workflow`, `bp.pipeline`, `bp.workflows` are sub-features of `bp.check` and `bp.capture`.

**What good looks like** (Addy Osmani's agent-skills):
- Each skill is ONE thing with ONE workflow
- README shows: what it does, how to use it, what you get
- No discovery layer — install what you want
- No 350-tool registry — 5 skills that each do 1 thing well

### Concrete Execution Board

| # | Principle | Fix | Metric to enforce | Ship order |
|---|-----------|-----|--------------------|------------|
| 1 | Value before identity | First pixel = input field, not explanation | Time from load to first action < 5s | Week 1 |
| 2 | Speed as feature | Progressive rendering, remove fake delays, hard latency budgets | First visible result < 800ms | Week 1 |
| 3 | Output = distribution | Shareable result URLs, screenshot-worthy cards | Every result has a shareable URL | Week 2 |
| 4 | Meet users where they are | Chat/search as primary surface, collapse nav | User can do everything from one input | Week 2 |
| 5 | Product improves itself | Visible learning, personalized suggestions | Returning user sees context from prior sessions | Week 3 |
| 6 | MCP discipline | Reduce to core tools, one workflow per skill | attrition: 6 tools. NodeBench: skill-based, not registry-based | Week 3 |

### Root Causes (from competitor analysis)

1. **One dominant job per screen** — Notion frames the problem as software sprawl. The fix is subtracting tools, not adding surfaces.
2. **Trust comes from visible reasoning, not decorative UI** — Linear and Perplexity build trust through transparent reasoning and cited sources, not bordered cards.
3. **Speed is product behavior, not backend optimization** — If it takes >200ms, make it faster. Premium feel comes from response cadence and zero hesitation.
4. **Quality is a system, not a cleanup sprint** — Linear has Quality Wednesdays (1,000+ small fixes) and zero-bugs policy (fix now or explicitly decline).
5. **The product gets more useful as it knows more context** — ChatGPT memory, Notion AI in existing blocks, Perplexity exportable artifacts.

### Quality Operating System (from Linear)

Without a permanent quality lane, the UI will drift back into inconsistency.

- **Weekly**: papercut pass — motion, spacing, hover, focus, empty-state review
- **Per-push**: no bug backlog dumping — bugs are fixed now or explicitly declined
- **Instrumented**: time-to-value metrics, not just render counts
  - `ask_submitted_at`
  - `first_partial_answer_at`
  - `first_source_at`
  - `first_saved_report_at`
  - `first_return_visit_at`

### The One-Line Version

**Both products should feel like Perplexity for their domain: one input, one answer, shareable results, visibly getting smarter.**

Not: multi-surface dashboards with competitive comparison tables and 350-tool registries.

### References

- [Linear on speed + transparent reasoning](https://linear.app)
- [Perplexity answer engine model](https://perplexity.ai)
- [Notion on software sprawl](https://notion.so)
- [Vercel virtual product tour](https://vercel.com)
- [ChatGPT memory + connected apps](https://openai.com)
- [Addy Osmani agent-skills](https://github.com/addyosmani/agent-skills)
- [Meta HyperAgents](https://hyperagents.agency/)
- [Linear Quality Wednesdays](https://linear.app/blog)
- [Linear Zero-bugs policy](https://linear.app/blog)
- Full audit: `docs/BEHAVIORAL_DESIGN_AUDIT.md`
