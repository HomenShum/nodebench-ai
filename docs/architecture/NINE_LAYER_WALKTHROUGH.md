# NodeBench: The 9-Layer Walkthrough

Plain English. No jargon. How the system works, why each layer exists, and where to find it.

Legacy note:
- This document preserves the legacy/current 9-layer framing as the baseline architecture walkthrough.
- It is intentionally useful for historical context, comparison, and interview explanation of how the system worked before the newer specification and anticipatory-prep additions.
- For the forward-looking proposal that adds Layer 0 (specification / elicitation), operator context, and anticipatory interaction prep, see [HARNESS_V2_PROPOSAL.md](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/HARNESS_V2_PROPOSAL.md).

---

## What NodeBench does in one sentence

You drop in messy stuff (screenshots, links, notes, questions) and get back a clear report with sources. Save it. Come back later. Get nudged when something changes.

---

## The user loop (the whole product)

```
  YOU                         NODEBENCH                      SAVED
   |                              |                            |
   |--- "tell me about Ramp" ---->|                            |
   |                              |--- search web              |
   |                              |--- read your files         |
   |                              |--- grade sources           |
   |                              |--- build report            |
   |                              |                            |
   |<---- clear report -----------|                            |
   |                              |                            |
   |--- "save it" --------------->|--- save to database ------>|
   |                              |                            |
   |  (2 days later)              |                            |
   |                              |<--- something changed -----|
   |<---- "Ramp raised $150M" ---|                            |
   |                              |                            |
   |--- "refresh it" ------------>|--- re-run with new data    |
   |<---- updated report ---------|--- save new version ------>|
```

---

## The 5 screens (what the user sees)

```
+--------+--------+----------+--------+------+
|  Home  |  Chat  | Reports  | Nudges |  Me  |
+--------+--------+----------+--------+------+

  Home     = ask bar. upload. start.
  Chat     = live answer with sources.
  Reports  = saved answers you can reopen.
  Nudges   = "something changed, come back."
  Me       = your files, profile, private context.
```

---

## The 9 layers (what's under the hood)

```
LAYER                    WHAT IT DOES                          WHERE IT LIVES
-----                    ------------                          --------------

1. FRONTEND              5 screens the user sees               src/features/{home,chat,reports,nudges,me}/
   (React + Vite)        nav, cards, search bar, editor        src/layouts/
                                                               src/components/

2. SERVER                HTTP routes, streaming,               server/
   (Express + SSE)       voice, search pipeline                server/routes/
                         WebSocket MCP gateway                 server/pipeline/

3. SERVICES              The brains: search pipeline,          server/pipeline/searchPipeline.ts
   (pipeline logic)      query routing, result assembly,       server/lib/searchContext.ts
                         evidence grading, caching             server/lib/multiSearch.ts

4. AGENTS                LLM-orchestrated tool planning:       server/agentHarness.ts   (plan + execute + synthesize)
   (LLM orchestration)   Gemini decides which tools to call,   server/harnessRuntime.ts (session + multi-turn)
                         in what order, then synthesizes        server/pipeline/searchPipeline.ts (5-node state machine)
                         results into a structured report       server/lib/searchContext.ts (carry-forward LRU cache)

5. DATABASE              Realtime DB, file storage,            convex/domains/product/
   (Convex)              scheduled jobs, auth                    reports.ts    (saved reports)
                         The canonical data layer                chat.ts      (sessions + events)
                                                                 entities.ts  (companies/people)
                                                                 nudges.ts    (return triggers)
                                                                 me.ts        (profile + files)

6. SECURITY              Input validation, SSRF guard,         packages/mcp-local/src/security/
   (3 guard layers)      output filtering, rate limiting       server/mcpAuth.ts

7. EVALUATION            Golden test sets, offline eval,       packages/mcp-local/src/benchmarks/
   (quality gates)       online monitoring, LLM judge          scripts/eval-harness/
                         "Did we give a good answer?"          tests/

8. OBSERVABILITY         Per-stage tracing, cost tracking,     server/pipeline/ (trace emission)
   (see what happened)   error logging, milestone timing       convex/domains/product/chat.ts
                         "What happened inside this run?"        (tool events, source events)

9. MCP TOOLS             350 tools for AI agents,              packages/mcp-local/
   (agent interface)     progressive discovery,                packages/mcp-client/
                         CLI subcommands, WebSocket gateway    packages/mcp-admin/
```

---

## How a single question flows through all 9 layers

```
USER: "What is Ramp and why does it matter?"

   Layer 1  FRONTEND         User types in Chat search bar, hits enter.
      |                      useStreamingSearch hook opens SSE connection.
      |                      Browser listens for: tool_start, tool_done,
      |                      source, answer, complete events.
      v
   Layer 2  SERVER           POST /api/search/stream hits Express route.
      |                      Opens SSE stream (Content-Type: text/event-stream).
      |                      Starts the harness pipeline.
      v
   Layer 3  SERVICES         searchPipeline.ts classifies the query:
      |                        1. classifyWithSession() -> "company_search"
      |                        2. Extract entity: "Ramp"
      |                        3. Check LRU cache for prior Ramp context
      |                        4. Hand off to the Agent Harness
      v
   Layer 4  AGENTS           This is the brain. Three phases:
      |
      |   PHASE 1: PLAN (Gemini 3.1 Flash Lite)
      |     The LLM reads the query + classification and DECIDES:
      |     - Which tools to call
      |     - In what order
      |     - What arguments to pass
      |     Output: HarnessPlan {
      |       steps: [
      |         { tool: "web_search", args: { query: "Ramp fintech" } },
      |         { tool: "run_recon", dependsOn: "web_search" },
      |         { tool: "founder_local_gather", parallel: true }
      |       ]
      |     }
      |     >> SSE: emit "plan" event -> frontend shows step list
      |
      |   PHASE 2: EXECUTE (tool-by-tool)
      |     The harness loops through the plan:
      |
      |     Step 1: web_search("Ramp fintech")
      |       >> SSE: tool_start { tool: "web_search", step: 1 }
      |       -> Linkup API returns 5 web sources
      |       >> SSE: tool_done { durationMs: 1200, preview: "5 sources" }
      |       >> SSE: source events (one per source found)
      |
      |     Step 2: run_recon(sources)  [waits for step 1]
      |       >> SSE: tool_start { tool: "run_recon", step: 2 }
      |       -> Gemini analyzes sources, extracts signals
      |       >> SSE: tool_done { durationMs: 800, tokensIn: 2400 }
      |
      |     Step 3: founder_local_gather()  [ran in parallel with step 2]
      |       -> Pulls user's saved context about Ramp (if any)
      |
      |     If a tool FAILS: harness can adapt the plan
      |       -> Re-plan with remaining budget (maxAdaptations)
      |
      |   PHASE 3: SYNTHESIZE (Gemini 3.1 Flash Lite)
      |     The LLM reads ALL tool results and produces:
      |     ResultPacket {
      |       answer: "Ramp is a corporate card and spend management..."
      |       signals: [{ text: "raised $300M Series D", evidence: [...] }]
      |       risks: [{ description: "Competing with Brex in saturated..." }]
      |       comparables: ["Brex", "Divvy", "Airbase"]
      |       keyMetrics: [{ label: "Valuation", value: "$7.65B" }]
      |       nextActions: ["Deep dive on unit economics"]
      |       sourceRefs: [{ url: "https://...", domain: "techcrunch.com" }]
      |     }
      |     >> SSE: "complete" event -> frontend renders full report
      v
   Layer 5  DATABASE         Convex stores everything in real-time:
      |                        - chat session: startSession mutation
      |                        - tool events: recordToolStart/recordToolDone
      |                        - final report: completeSession -> saves report
      |                        - entity: ensureEntityForReport("Ramp")
      |                        - source refs linked to report
      v
   Layer 6  SECURITY         Every step checks:
      |                        - Linkup URLs validated (no SSRF)
      |                        - Response bodies bounded (MAX_RESPONSE_BYTES)
      |                        - Rate limiting on API gateway (100/min)
      |                        - AbortController timeout budget (30s default)
      v
   Layer 7  EVALUATION       After the run:
      |                        - Structural: has sources? has 4 sections?
      |                        - LLM judge (Gemini): scores quality vs golden set
      |                        - Evidence grading: source quality score per claim
      |                        - Results tracked in eval_results table
      v
   Layer 8  OBSERVABILITY    The whole run emits a trace array:
      |                        - classify: 120ms, ok
      |                        - web_search: 1.2s, ok, 5 sources
      |                        - run_recon: 800ms, ok, 3 signals
      |                        - synthesize: 600ms, ok, 4 sections
      |                        - total: 2.7s, cost: $0.008
      |                        Dual-write: local SQLite + Convex
      v
   Layer 9  MCP TOOLS        Same pipeline available to AI agents:
                               - Claude Code: `web_search`, `entity_intelligence`
                               - Cursor: `get_workflow_chain`, `run_recon`
                               - WebSocket MCP gateway: 350 tools exposed
                               - Progressive discovery: agents find tools by intent
```

---

---

## Deep dive: Layer 4 — The Agent Orchestrator

This is the most interesting layer. Most AI apps use a flat "prompt in, answer out"
pattern. NodeBench uses an **LLM-orchestrated tool-calling harness** — the LLM itself
decides what tools to call, in what order, then synthesizes the results.

### The three files that matter

```
server/agentHarness.ts        3,497 lines  The brain. Plan + Execute + Synthesize.
server/harnessRuntime.ts        400 lines  Session state. Multi-turn. Compaction.
server/pipeline/searchPipeline.ts 1,251 lines  5-node state machine for the pipeline.
```

### How the harness works (plain English)

```
STEP 1: CLASSIFY
  "What is Ramp?" -> classification: "company_search", entity: "Ramp"

STEP 2: PLAN (LLM decides the tool chain)
  Gemini reads the query and classification.
  Gemini outputs a plan:

  +--------------------------------------------------+
  |  HarnessPlan                                      |
  |                                                    |
  |  objective: "Research Ramp fintech company"        |
  |  steps:                                            |
  |    1. web_search("Ramp fintech 2026")             |
  |    2. run_recon(sources)    [depends on 1]         |
  |    3. founder_local_gather  [parallel with 2]      |
  +--------------------------------------------------+

  The LLM decided. Not a hardcoded switch statement.
  Different queries get different plans:

  "Compare Ramp vs Brex" -> [web_search x2, run_recon x2, compare_entities]
  "What changed this week?" -> [founder_local_weekly_reset, web_search]
  "Draft a follow-up email" -> [founder_local_gather, synthesize_reply]

STEP 3: EXECUTE (tool-by-tool, with live streaming)

  +----------+     +-----------+     +--------------------+
  | web      | --> | run_recon | --> | founder_local      |
  | search   |     | (Gemini)  |     | gather             |
  | (Linkup) |     |           |     | (parallel)         |
  +----------+     +-----------+     +--------------------+
     1.2s              0.8s               0.3s

  Each tool call:
    - Emits SSE "tool_start" (frontend shows progress)
    - Runs the tool
    - Emits SSE "tool_done" with { durationMs, tokensIn, preview }
    - Records result in HarnessStepResult

  If a tool FAILS:
    - Harness can re-plan with remaining budget
    - maxAdaptations controls how many retries
    - Graceful degradation: partial results still synthesized

STEP 4: SYNTHESIZE (LLM reads all tool results, produces report)

  Gemini reads:
    - All tool outputs (search results, recon signals, local context)
    - The query and classification
    - The user's lens (founder, investor, banker, etc.)

  Gemini produces:
    +--------------------------------------------------+
    |  ResultPacket                                     |
    |                                                    |
    |  answer: "Ramp is a corporate card and spend..."  |
    |  signals: [3 verified signals with evidence]      |
    |  risks: [2 risk factors]                          |
    |  comparables: ["Brex", "Divvy", "Airbase"]       |
    |  keyMetrics: [{ "Valuation": "$7.65B" }]         |
    |  nextActions: ["Deep dive on unit economics"]     |
    |  sourceRefs: [5 graded web sources]               |
    +--------------------------------------------------+
```

### Evidence chain (how we prove claims)

```
  Signal: "Ramp raised $300M Series D at $7.65B valuation"
    |
    +-- Evidence span:
    |     source: techcrunch.com/2025/08/ramp-series-d
    |     snippet: "Ramp announced a $300M Series D round..."
    |     quality: 0.92 (official source, corroborated)
    |
    +-- Evidence span:
          source: pitchbook.com/profiles/ramp
          snippet: "Post-money valuation: $7.65B"
          quality: 0.88 (data provider, corroborated)

  Every claim links back to its source. The frontend renders [1] [2]
  citation chips that link to the actual URL.
```

### Session management (multi-turn)

```
  Turn 1: "What is Ramp?"
    -> Plan, execute, synthesize -> ResultPacket
    -> Save to HarnessSessionState.turns[0]

  Turn 2: "Compare it to Brex"
    -> Gemini sees Turn 1 results in context
    -> Plans a DIFFERENT tool chain (comparison-focused)
    -> Synthesizes with carry-forward knowledge
    -> Save to HarnessSessionState.turns[1]

  If conversation gets long (> COMPACTION_THRESHOLD):
    -> HarnessRuntime.compact() summarizes history
    -> Keeps token budget under control
```

### Tool cost tracking

```
  Tool              Cost/call    Why
  ----              ---------    ---
  web_search        $0.02        Linkup API call
  run_recon         $0.05        Gemini extraction (many tokens)
  founder_local     $0.003       Local DB query (cheap)
  synthesize        $0.05        Gemini synthesis (many tokens)

  Total cost for "What is Ramp?": ~$0.008
  Total cost for deep diligence:  ~$0.15

  Tracked per-session, per-turn, dual-write to SQLite + Convex.
```

### What makes this different from a basic RAG app

```
  BASIC RAG APP                    NODEBENCH HARNESS
  -------------                    -----------------
  query -> embed -> retrieve       query -> classify -> LLM plans tools
  -> prompt LLM -> answer          -> execute tools -> LLM synthesizes
                                   -> structured report with evidence

  Fixed pipeline                   Dynamic pipeline (LLM decides steps)
  One retrieval step               Multiple tools, parallel + sequential
  No evidence linking              Every claim traced to source
  No cost tracking                 Cost per tool, per session
  No adaptation on failure         Re-plan if tools fail
  Single-turn                      Multi-turn with compaction
```

### Two pipelines, not one

NodeBench actually has TWO execution paths. Which one runs depends on
the query type and the route:

```
PATH A: searchPipeline.ts (deterministic 4-stage pipeline)
  Used by: /api/search (the main search route)
  Stages: classify -> search (Linkup) -> analyze (Gemini) -> package
  Model: Gemini 3.1 Flash Lite (with fallback chain: Flash -> 2.5-Flash)
  Character: Predictable, fast, no re-planning. Good for simple lookups.
  The "analyze" stage sends sources to Gemini for structured extraction.
  The "package" stage classifies signals, creates evidence spans,
  detects pain resolutions, and optionally runs DCF/reverse-DCF.

PATH B: agentHarness.ts (LLM-orchestrated dynamic pipeline)
  Used by: harnessRuntime.ts (multi-turn sessions), harness route
  Phases: generatePlan (LLM) -> executeHarness (tools) -> synthesizeResults (LLM)
  Model: Gemini 3.1 Flash Lite plans the tool chain
  Character: Dynamic, adaptive, re-plans on failure. Good for complex queries.
  The LLM decides which tools to call based on intent classification.
  Falls back to deterministic buildFallbackPlan() if LLM planning fails.

HOW THEY CONNECT:
  The search route (Path A) can invoke the harness (Path B) for
  complex queries. The harness can call searchPipeline as one of its
  tools. They're composable, not competing.
```

### Model catalog (verified from source)

```
  FILE: server/agentHarness.ts lines 2345-2410

  GEMINI MODELS (primary):
    gemini-3.1-flash-lite-preview   32K context   Planning + synthesis (low cost)
    gemini-3.1-flash-preview       128K context   Complex analysis
    gemini-3.1-pro-preview         128K context   Deep reasoning

  OPENAI MODELS (available):
    gpt-5.4-nano                   Fast, cheap
    gpt-5.4-mini                   Balanced
    gpt-5.4                        Standard
    gpt-5.4-pro                    Best quality

  ANTHROPIC MODELS (available):
    claude-sonnet-4-6              200K context
    claude-opus-4-6                200K context

  DEFAULT FOR PLANNING: gemini-3.1-flash-lite-preview (cheapest, fast enough)
  FALLBACK CHAIN: flash-lite -> flash -> 2.5-flash (searchPipeline.ts L739)

  MODEL SELECTION LOGIC (agentHarness.ts L2403):
    TaskComplexity "low"    -> gemini-3.1-flash-lite-preview
    TaskComplexity "medium" -> gemini-3.1-flash-preview
    TaskComplexity "high"   -> gemini-3.1-pro-preview
```

### Coordinator agent (Convex-side, separate system)

There's also a SECOND agent system on the Convex backend. This is the
older architecture that predates the harness:

```
  FILE: convex/domains/agents/coordinator/agent.ts

  Uses: Vercel AI SDK generateText() with tool calling
  Model: Resolved via getLanguageModelSafe() (centralized catalog)
  Pattern: LangChain-inspired supervisor that delegates to subagents:
    - DataAccess agent (tasks, events, calendar)
    - Document agent (research, analysis)
    - Media agent (YouTube, media search)
    - SEC agent (SEC filings)
    - OpenBB agent (financial data)
    - Entity agent (company research)
    - Dossier agent (morning briefing)
    - Research agent (multi-source)

  This system runs inside Convex (serverless), separate from the
  Express server. It's used for the FastAgent panel, not the main
  Chat search flow. The main Chat flow uses Path A or B above.
```

---

## What ACTUALLY lives where today

### The 5 product screens (Layer 1: Frontend)

```
src/features/
  home/views/HomeLanding.tsx        <-- 1 file. The search page.
  chat/views/ChatHome.tsx           <-- 1 file. The answer page.
  reports/views/ReportsHome.tsx     <-- 1 file. The saved reports grid.
  nudges/views/NudgesHome.tsx       <-- 1 file. The "come back" page.
  me/views/MeHome.tsx               <-- 1 file. Your private context.
  entities/views/EntityPage.tsx     <-- Report detail / compound page.

  (also: 25 other feature dirs that are INTERNAL tooling, not user-facing)
```

### The search pipeline (Layer 3: Services)

```
server/pipeline/
  searchPipeline.ts     <-- THE core file. Takes query, returns report.
  hooks.ts              <-- Pipeline lifecycle hooks.

server/lib/
  searchContext.ts      <-- Builds context bundle for the LLM.
  multiSearch.ts        <-- Fans out to multiple search providers.
  routingHints.ts       <-- Decides which tools/providers to use.
  evidenceSpan.ts       <-- Grades and tracks evidence quality.
```

### The database (Layer 5: Convex)

```
convex/domains/product/           <-- THE core domain. 12 files.
  schema.ts       Reports, entities, evidence, chat, nudges, profile.
  reports.ts      Save/list/get reports.
  chat.ts         Start session, log tools, complete session.
  entities.ts     Create/list/get entities (companies, people).
  nudges.ts       Create/snooze/complete nudges. Daily cron.
  me.ts           Upload files, update profile.
  home.ts         Public cards, recent activity.
  documents.ts    Long-form document storage.
  delivery.ts     Report delivery/sharing.
  bootstrap.ts    First-run setup.
  helpers.ts      Shared utilities.
  shell.ts        Admin shell commands.

  (also: 60 other domain dirs that are LEGACY or INTERNAL)
```

### The MCP tools (Layer 9)

```
packages/mcp-local/               <-- 350 tools, the MCP server.
  src/tools/                      <-- Tool implementations.
  src/security/                   <-- Layer 6: Security guards.
  src/benchmarks/                 <-- Layer 7: Eval harness.
```

---

## The honest inventory

### What's clean (interview-ready)

```
CLEAN                                FILES    WHY
-----                                -----    ---
5 product screens                      6      One file each. Easy to explain.
Product database (convex/product/)    12      Reports, chat, entities, nudges, me.
Search pipeline (server/pipeline/)     2      The core brain. searchPipeline.ts.
Security module                       53      7 files, 53 tests. Solid.
MCP tool registry                    350      Progressive discovery. Well-documented.
Design system (index.css)              1      Tokens, cards, buttons. One file.
```

### What's sprawling (needs consolidation for interview clarity)

```
SPRAWLING                            COUNT    PROBLEM
---------                            -----    -------
src/features/ directories              31     Only 6 are product screens.
                                              25 are internal/legacy tooling.
convex/domains/ directories            67     Only product/ matters for the product.
                                              66 are legacy or internal services.
Root .md files                         16     Should be in docs/.
Scripts directories                    16     Scattered utility scripts.
Packages                                9     3 are meaningful (mcp-local, client, plugin).
                                              6 are thin wrappers or empty.
```

---

## The 9-layer interview walkthrough (what to say)

### "Walk me through NodeBench's architecture."

> "NodeBench is 9 layers. Let me walk you through a single query.
>
> **Layer 1 — Frontend.** Five screens: Home, Chat, Reports, Nudges, Me.
> React + Vite. The user types a question on Home, gets routed to Chat.
>
> **Layer 2 — Server.** Express handles the HTTP request, opens an SSE
> stream so the answer appears in real-time as it's built.
>
> **Layer 3 — Services.** The search pipeline classifies the query —
> is this a company lookup, a comparison, a weekly reset? Then it hands
> off to the Agent Harness.
>
> **Layer 4 — Agents.** This is the interesting part. Most AI apps have
> a hardcoded pipeline: search, then prompt, then answer. We don't.
> We give Gemini 3.1 Flash Lite the query and a tool catalog, and the
> LLM itself decides which tools to call, in what order, with what
> arguments. It outputs a HarnessPlan — literally a JSON execution plan.
> Then the harness executes that plan tool-by-tool, streaming progress
> to the frontend in real-time via SSE. If a tool fails, it can re-plan
> with the remaining budget. After all tools complete, the LLM reads
> every tool result and synthesizes a structured report: signals with
> evidence chains, risks, comparables, key metrics, and next actions.
> Every claim links back to its source URL through evidence spans.
>
> **Layer 5 — Database.** Convex stores everything in real-time: the chat
> session, tool events, sources, the final report, and the entity it
> belongs to. When you save a report, it becomes a living document that
> accumulates evidence over time.
>
> **Layer 6 — Security.** Three guard layers: input validation, SSRF
> protection, output filtering. Rate limiting on the API gateway.
>
> **Layer 7 — Evaluation.** Every answer gets judged: structural checks
> (does it have sources? sections?) plus an LLM judge that scores quality
> against a golden test set.
>
> **Layer 8 — Observability.** Every stage of the pipeline emits timing
> and cost data. You can see exactly what happened: classify took 120ms,
> web_search took 1.2s, total cost was $0.003.
>
> **Layer 9 — MCP Tools.** The same pipeline is exposed as 350 MCP tools.
> AI coding agents in Claude Code, Cursor, or Windsurf can call the same
> search, the same entity intelligence, the same report generation."

---

## How to reorganize (without breaking anything)

The trick: **re-export shims.** Move files to clean locations, leave a
one-line re-export at the old path so no import breaks.

### Phase 1: Root cleanup (5 min)

```
BEFORE                          AFTER
------                          -----
/AgentNativeUI.md               /docs/architecture/AgentNativeUI.md
/ORACLE_LOOP.md                 /docs/architecture/ORACLE_LOOP.md
/MOBILE_UX_COMPARISON.md        /docs/architecture/MOBILE_UX_COMPARISON.md
... (16 loose .md files)        ... (all in docs/)

Keep at root: CLAUDE.md, AGENTS.md, README.md (these 3 only)
```

### Phase 2: Feature dir consolidation (the big one)

```
BEFORE: 31 dirs under src/features/
AFTER:  7 dirs under src/features/

src/features/
  home/           <-- Home screen (keep)
  chat/           <-- Chat screen (keep)
  reports/        <-- Reports screen (keep)
  nudges/         <-- Nudges screen (keep)
  me/             <-- Me screen (keep)
  entities/       <-- Entity detail page (keep)
  _internal/      <-- Everything else (agents, research, documents,
                      controlPlane, deepSim, editor, narrative,
                      calendar, monitoring, telemetry, strategy,
                      benchmarks, admin, onboarding, founder, etc.)
```

The `_internal/` prefix signals: "this is infrastructure, not product."
No imports break because the files stay in their subdirs.

### Phase 3: Convex domain consolidation

```
BEFORE: 67 dirs under convex/domains/
AFTER:  3 groups

convex/domains/
  product/        <-- THE product (reports, chat, entities, nudges, me)
  platform/       <-- Shared infra (auth, search, agents, ai, mcp)
  _legacy/        <-- Everything else (67 dirs renamed to _legacy/)
```

### Phase 4: Package consolidation

```
BEFORE: 9 packages
AFTER:  3 that matter

packages/
  mcp-local/           <-- The MCP server (350 tools)
  mcp-client/          <-- Typed client SDK
  claude-code-plugin/  <-- Claude Code integration
  _archived/           <-- The rest
```

---

## The final clean tree (interview version)

```
nodebench-ai/
|
|-- CLAUDE.md                     AI agent context
|-- AGENTS.md                     Agent methodology
|-- README.md                     Project overview
|
|-- src/                          LAYER 1: FRONTEND
|   |-- features/
|   |   |-- home/                 Home screen (search bar)
|   |   |-- chat/                 Chat screen (live answer)
|   |   |-- reports/              Reports screen (saved grid)
|   |   |-- nudges/               Nudges screen (return triggers)
|   |   |-- me/                   Me screen (private context)
|   |   |-- entities/             Entity detail page
|   |   +-- _internal/            Internal tooling (25 dirs)
|   |-- layouts/                  Nav, tab bar, shell
|   |-- components/               Shared UI primitives
|   +-- lib/                      Utilities, registry, hooks
|
|-- server/                       LAYER 2+3: SERVER + SERVICES
|   |-- index.ts                  Express entry point
|   |-- pipeline/                 Search pipeline (THE core)
|   |-- routes/                   HTTP route handlers
|   |-- lib/                      Service utilities
|   |-- agents/                   LAYER 4: Agent orchestration
|   +-- nemoclaw/                 NemoClaw agent runner
|
|-- convex/                       LAYER 5: DATABASE
|   |-- domains/
|   |   |-- product/              Core product tables (12 files)
|   |   |-- platform/             Shared infra (auth, search, agents)
|   |   +-- _legacy/              Legacy domains (60+ dirs)
|   |-- schema.ts                 Schema definition
|   +-- crons/                    Scheduled jobs (nudges)
|
|-- packages/
|   |-- mcp-local/                LAYER 9: MCP TOOLS (350 tools)
|   |   +-- src/security/         LAYER 6: SECURITY
|   |   +-- src/benchmarks/       LAYER 7: EVALUATION
|   |-- mcp-client/               Typed client SDK
|   +-- claude-code-plugin/       Claude Code integration
|
|-- scripts/                      Ops + eval + utilities
|-- tests/                        E2E + scenario tests
|-- docs/                         Architecture + guides
+-- .claude/rules/                AI coding agent rules (20+)
```

---

## The 9-layer cheat sheet (tape this to your monitor)

```
+--------------------------------------------------+
|  1. FRONTEND    | React screens: Home Chat        |
|                 | Reports Nudges Me               |
+--------------------------------------------------+
|  2. SERVER      | Express + SSE streaming         |
+--------------------------------------------------+
|  3. SERVICES    | searchPipeline.ts = the brain   |
+--------------------------------------------------+
|  4. AGENTS      | LLM orchestration, self-correct |
+--------------------------------------------------+
|  5. DATABASE    | Convex: reports, entities, chat  |
+--------------------------------------------------+
|  6. SECURITY    | 3 guards: input, SSRF, output   |
+--------------------------------------------------+
|  7. EVALUATION  | Golden sets + LLM judge          |
+--------------------------------------------------+
|  8. OBSERVABILITY| Traces, timing, cost per query  |
+--------------------------------------------------+
|  9. MCP TOOLS   | 350 tools for AI agents          |
+--------------------------------------------------+
```

That's the whole system. Nine layers. One loop. Ask anything, get a report, save it, come back later.

---

## Appendix A: What's Missing in the Harness (Verified Gaps)

Deep-read of `agentHarness.ts` and `search.ts` reveals these gaps:

### Gap 1: No parallel group tracking

```
CURRENT HarnessStep:
  { id: "s1", toolName: "web_search", parallel: true }
  { id: "s2", toolName: "run_recon", parallel: true }
  { id: "s3", toolName: "founder_local_gather", parallel: true }

  Problem: s2 and s3 both depend on s1 finishing first,
  but there's no way to express "s2 and s3 are a parallel group
  that runs AFTER s1."

  parallel: true just means "can run alongside others."
  dependsOn is a single string, not an array.
  No groupId or parallelGroupId field exists.

PROPOSED FIX:
  interface HarnessStep {
    id: string;
    toolName: string;
    args: Record<string, unknown>;
    purpose: string;
    groupId?: string;         // NEW: parallel execution group
    dependsOn?: string[];     // FIX: array, not single string
    stepIndex?: number;       // NEW: explicit ordering
    model?: string;           // NEW: which LLM model this step uses
  }

  Example:
  { id: "s1", stepIndex: 0, toolName: "web_search", groupId: "search" }
  { id: "s2", stepIndex: 1, toolName: "run_recon", groupId: "analyze", dependsOn: ["s1"] }
  { id: "s3", stepIndex: 1, toolName: "founder_local", groupId: "analyze", dependsOn: ["s1"] }

  Now s2 and s3 share groupId "analyze" and both depend on s1.
  stepIndex shows they're at the same tier.
```

### Gap 2: No model attribution per step

```
CURRENT HarnessStepResult:
  { stepId, toolName, result, success, durationMs, error? }

  Problem: When run_recon calls Gemini internally, that model name
  is NOT recorded. You can't trace "step s2 used gemini-3.1-flash-lite."

PROPOSED FIX:
  interface HarnessStepResult {
    stepId: string;
    toolName: string;
    result: unknown;
    success: boolean;
    durationMs: number;
    error?: string;
    model?: string;           // NEW: which model this step used
    tokensIn?: number;        // NEW: input tokens consumed
    tokensOut?: number;       // NEW: output tokens produced
    costUsd?: number;         // NEW: estimated cost
  }

  This matters for:
  - Telemetry dashboard (show model per step)
  - Cost breakdown (which steps are expensive?)
  - Distillation (which model produced this trace?)
  - Finetuning (segment traces by model for training data)
```

### Gap 3: Steps don't see each other's results

```
CURRENT: Each step calls callTool(step.toolName, step.args)
  with ORIGINAL args only. No prior results injected.

  Problem: run_recon can't see web_search results at execution time.
  It runs with whatever args were in the original plan.

  Context recombination only happens in synthesizeResults() AFTER
  all steps complete.

PROPOSED FIX (two options):

  Option A: Inject prior results into dependent step args
    When step s2 has dependsOn: ["s1"], inject s1's result:
    callTool(s2.toolName, { ...s2.args, _priorResults: { s1: result1 } })

  Option B: Running context accumulator
    const runContext = new Map<string, unknown>();
    After each step: runContext.set(step.id, result);
    Each step receives: callTool(name, { ...args, _context: runContext })

  Option A is simpler. Option B is more flexible.
```

### Gap 4: No plan event streamed to frontend

```
CURRENT: The search route emits trace events per-step, but the
  HarnessPlan itself is never streamed.

  The frontend only sees:
    { type: "trace", entry: { step, tool, startMs, endMs, status, detail } }

  Problem: The user can't see the agent's PLAN before execution starts.
  They only see steps completing one by one.

PROPOSED FIX:
  Before executeHarness(), emit:
    res.write(`data: ${JSON.stringify({ type: "plan", plan })}\n\n`)

  Frontend renders:
    "Planning: 3 steps — web_search -> run_recon + founder_local (parallel)"
```

---

## Appendix B: What to Learn from Other Agent Architectures

### OpenClaw 4.10 — Memory as a Living System

```
KEY INSIGHT: Four-layer memory stack

  Layer 1: MEMORY.md         Long-term curated facts. Read every session.
  Layer 2: Daily notes        Auto-generated session logs. Last 2 days auto-load.
  Layer 3: SQLite + vectors   Hybrid search (BM25 + embeddings). Full history.
  Layer 4: Active Memory      NEW in 4.10. Pre-reply sub-agent that auto-recalls
                              relevant context BEFORE the main response.

  Plus "Dreaming" — background consolidation during idle time:
    Light sleep: ingest daily notes, deduplicate
    REM sleep: extract patterns, build summaries
    Deep sleep: promote high-scoring memories to MEMORY.md
    Scoring: 6 signals — Relevance (0.30), Frequency (0.24),
             Query diversity (0.15), Recency (0.15),
             Consolidation (0.10), Richness (0.06)
    Promotion gate: minScore 0.8, minRecallCount 3, minUniqueQueries 3

NODEBENCH GAP:
  We have entity memory (convex/domains/product/entities.ts) but:
  - No pre-reply auto-recall (like Active Memory)
  - No background consolidation (like Dreaming)
  - No memory scoring/promotion (like the 6-signal model)
  - Entity memories accumulate but never get pruned or ranked

WHAT TO BUILD:
  Before assembling a search response, run a lightweight entity memory
  query. Inject prior findings into the LLM context. This makes
  entity investigations compound across sessions.
```

### Hermes Agent — Skills as Procedural Memory

```
KEY INSIGHT: Self-improving through use

  When the agent completes a complex task:
    1. It extracts what worked as a reusable "skill" (markdown file)
    2. Skills are stored, loaded on-demand for similar future tasks
    3. Skills get UPDATED during use (the agent improves its own procedures)
    4. Skills get DELETED when obsolete

  Three-file context system:
    SOUL.md  = agent identity/personality
    MEMORY.md = environment facts, conventions, lessons
    USER.md  = user preferences, communication style

  The loop: experience -> skill extraction -> storage -> retrieval -> refinement
  This is genuine procedural memory — learns HOW, not just WHAT.

NODEBENCH GAP:
  We have skill freshness tracking (skillUpdateTools.ts) but:
  - No automatic skill extraction from successful runs
  - No skill refinement during use
  - No loading of relevant skills based on query type

WHAT TO BUILD:
  When a search pipeline produces a high-scoring result (eval judge PASS),
  extract: query pattern + entity type + tool chain as a reusable skill.
  Load it for similar future queries. The harness gets smarter over time.
```

### DeerFlow 2.0 (ByteDance) — Context Isolation for Sub-Agents

```
KEY INSIGHT: Sub-agents get scoped context, not everything

  Lead agent decomposes task into sub-tasks.
  Each sub-agent gets:
    - Its own scoped context (can't see other sub-agents)
    - Its own tool set (scoped to the sub-task)
    - Its own termination conditions

  Intermediate results are offloaded to filesystem.
  No-longer-relevant context gets compressed.
  This keeps context windows clean across long multi-step tasks.

  Memory updates happen through a debounced async queue (non-blocking).

NODEBENCH PARALLEL:
  Our harness already does this partially — each step runs with original
  args only (Gap 3 above). But we don't offload intermediate results
  to storage, and we don't compress old context.

  For parallel subagents (Codex, Claude Code, etc.):
  Each subagent should get a scoped context slice, not the full history.
```

### Codex (OpenAI GPT-5.3) — Mid-Turn Steering

```
KEY INSIGHT: You can inject context while the agent is working

  Three mechanisms:
    1. 400K context window with "Perfect Recall" attention
       (no degradation in mid-context — solves "lost in the middle")
    2. Phase metadata system — each step carries a phase field
       (MUST persist across requests or performance degrades)
    3. Cumulative context — steering adds to context, doesn't replace it

  Metaphor: "tapping a colleague on the shoulder while they're coding."
  You redirect approach without wiping progress.

NODEBENCH APPLICATION:
  Our trace steps already carry structured metadata (step, tool, status).
  Adding a phase field would enable mid-run steering:

  User sends: "btw, they just announced a merger with Acme"
  Harness: injects this as a high-priority context update
  Next tool call gets the new context appended to its args
  Synthesis incorporates the user-injected fact

  This is critical for long-running investigations where the
  user learns something mid-run.
```

### Claude Code — /btw Side-Chain Pattern

```
KEY INSIGHT: Read-only context snapshots for side questions

  /btw <question> creates a temporary overlay:
    - Sends the FULL conversation context as a read-only snapshot
    - The btw question is appended as the final user message
    - The response is NOT written back to main conversation history
    - Reuses prompt cache (minimal additional cost)

  It's the "inverse of a subagent":
    - A subagent has tools but limited context
    - /btw has full context but NO tools

  Limitation: Cannot promote /btw responses back INTO the conversation.
  (Open issue #37582 requesting this feature.)

NODEBENCH APPLICATION:
  During a search pipeline run, user should be able to ask:
    "btw, is this company public or private?"
  Without:
    - Stopping the pipeline
    - Polluting the investigation context
    - Starting a new session

  The response helps the user but doesn't steer the active run
  unless explicitly promoted.
```

---

## Appendix C: Tool Call Traces for Distillation and Training

### How agent traces become training data for smaller models

```
THE PIPELINE (state of the art, 2025-2026):

  1. TEACHER GENERATES TRACES
     NodeBench's Gemini-powered pipeline runs entity investigations.
     Each run produces structured trace:
       classify(120ms) -> web_search(1.2s) -> run_recon(800ms) -> synthesize(600ms)
     Plus: sources, signals, risks, sections, evidence spans.

  2. QUALITY FILTER
     Only keep traces that passed the eval judge.
     Low-quality traces (generic, hallucinated, empty sections) are discarded.
     This is the CRITICAL step — raw traces are noisy.

  3. SPAN SEGMENTATION
     Each trace is segmented into:
       Reasoning spans: classify intent, select tools, grade sources
       Action spans: call web_search, extract signals, assemble report
     Different loss weights applied to each during finetuning.

  4. BALANCE + CURATE
     Balance across entity types (company, person, market, role).
     Balance across intents (lookup, comparison, weekly_reset).
     ~18,000 filtered samples is state-of-the-art scale.

  5. FINETUNE SMALLER MODEL
     Target: Gemma 4 (12B) — has native function calling via 6 special tokens.
     Method: QLoRA or LoRA (Keras or Transformers).
     The native tool-calling token structure means traces align naturally
     with the model's built-in function calling protocol.

  6. DEPLOY ON-DEVICE
     Fine-tuned Gemma 4 runs entity investigations locally.
     No Gemini API cost per query.
     Quality: ~77% of teacher performance (FireAct benchmark).

NODEBENCH ALREADY HAS:
  - Structured traces (server/routes/search.ts trace emission)
  - Eval judge with quality scoring (searchQualityEval.ts)
  - TCWP bundle system (packages trajectories)

WHAT TO BUILD:
  - Span segmentation: tag each trace step as "reasoning" or "action"
  - Quality filter: only export traces with eval judge PASS
  - Export format: Gemma 4 function-calling compatible
  - attrition.sh integration: push traces for analysis + distillation

  The TCWP bundle system is 80% of the way there.
  It already packages trajectories — extend it to produce
  distillation-ready training data.
```

### The compounding flywheel

```
  +-------------------+
  |  User asks query  |
  +--------+----------+
           |
           v
  +-------------------+
  |  Gemini runs      |<------- Load relevant skill (Hermes pattern)
  |  investigation    |<------- Auto-recall entity memory (OpenClaw pattern)
  +--------+----------+
           |
           v
  +-------------------+
  |  Eval judge       |
  |  scores quality   |
  +--------+----------+
           |
    PASS?  |  FAIL?
     |     |    |
     v     |    v
  +--------+  discard
  | Extract |
  | skill   |  (Hermes: what tool chain worked?)
  +--------+
     |
     v
  +-------------------+
  |  Export trace for  |  (Span segmentation + quality filter)
  |  distillation      |
  +--------+----------+
           |
           v
  +-------------------+
  |  Finetune Gemma 4 |  (Smaller, cheaper, on-device)
  +--------+----------+
           |
           v
  +-------------------+
  |  Deploy locally   |  (No API cost per query)
  +--------+----------+
           |
           v
  +-------------------+
  |  Run 1 expensive, |
  |  Run N nearly     |
  |  free             |
  +-------------------+
```
