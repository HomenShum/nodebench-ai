# NodeBench AI

Entity intelligence for any company, market, or question.

**Live:** [nodebenchai.com](https://www.nodebenchai.com)  
**npm:** `npx nodebench-mcp` / `npx nodebench-mcp-power` / `npx nodebench-mcp-admin`  
**GitHub:** [HomenShum/nodebench-ai](https://github.com/HomenShum/nodebench-ai)

## Product

NodeBench is a research and reporting product built around five user-facing
surfaces:

- `Home` = start quickly
- `Chat` = do the work
- `Reports` = reusable memory
- `Nudges` = return at the right moment
- `Me` = operator context and control

The core idea is simple:

users do not just need a chatbot that answers once.

They need a system that can:

- take a question, file, URL, or prior thread
- search and synthesize with sources
- turn the run into a reusable artifact
- watch for meaningful change later
- improve the next run from what it learned

## What Shipped

- five-surface web app across `Home`, `Chat`, `Reports`, `Nudges`, and `Me`
- typed search and reporting pipeline
- live SSE streaming with saved runtime state
- Convex-backed product state for sessions, reports, entities, nudges, files,
  and related objects
- shared-context handoff and delegation plumbing
- local and deployed server runtime for search, streaming, voice, and shared
  context routes
- `nodebench-mcp`, `nodebench-mcp-power`, and `nodebench-mcp-admin`
  distribution lanes
- builder-facing Oracle, dogfood, eval, replay, and control-plane
  infrastructure

## Product At A Glance

```text
USER SURFACES
-------------
Home      -> start quickly
Chat      -> answer, sources, trace, follow-ups
Reports   -> reusable report memory
Nudges    -> return loop
Me        -> operator context, permissions, controls

BACKEND
-------
Convex tables and product state for sessions, reports, entities, nudges,
files, shared context, and evaluation artifacts

RUNTIME
-------
search pipeline
  -> answer packet
  -> saved report
  -> tracked entity / tracked theme / follow-up task
  -> nudge or prep brief
  -> resumed chat or reopened report

COMPOUNDING LOOP
----------------
question
  -> answer
  -> saved report
  -> watch item
  -> useful nudge
  -> better next run

DISTRIBUTION
------------
nodebenchai.com
nodebench-mcp
nodebench-mcp-power
nodebench-mcp-admin
```

## Why This Design

NodeBench is designed around a few product realities:

1. A useful answer should not disappear after one chat turn.
2. Saved work should become reusable memory, not a dead archive row.
3. The product should bring the user back only when something meaningful
   changes.
4. The system should gradually learn how the user works without forcing a heavy
   onboarding flow.
5. Operator context should improve future runs without turning the system into
   corporate-speak or fake-agreeable sludge.

That drives the current design:

- answer-first execution
- advisor mode by design via dynamic routing:
  - fast executive lane for routine work
  - deeper advisor lane for ambiguity, planning, and harder reasoning
  - similar in spirit to Claude Code's official `opusplan` split:
    stronger planning lane, cheaper execution lane
- saved artifacts as first-class objects
- visible sources and traceability
- a five-page loop instead of five unrelated tabs
- future `Harness v2` work focused on specification, operator context, and
  compounding behavior

Plain English:

```text
NodeBench should not spend the most expensive reasoning path on every request.
It should move fast by default, then go deeper when the task, evidence, or user
request justifies it.
```

The detailed implementation, verification, and evaluation plan for this mode
lives in:

- [HARNESS_V2_PROPOSAL.md](./docs/architecture/HARNESS_V2_PROPOSAL.md)
- [HARNESS_V2_BUILD_PLAN.md](./docs/architecture/HARNESS_V2_BUILD_PLAN.md)

## How The Five Pages Compound

NodeBench should not feel like five separate destinations.

The intended product behavior is:

```text
Home
  -> start quickly

Chat
  -> do the work
  -> create the first useful artifact

Reports
  -> turn that artifact into reusable memory

Nudges
  -> bring the user back when something important changes

Me
  -> improve how the next run is handled

Next Home or Chat run
  -> starts with more context than before
```

The shortest version of the compounding loop is:

```text
question
  -> answer
  -> saved report
  -> watch item
  -> useful nudge
  -> better next run
```

Plain-English artifact flow:

```text
input
  -> answer packet
  -> saved report
  -> tracked entity / tracked theme / follow-up task
  -> nudge or prep brief
  -> resumed report or resumed chat
  -> user correction or confirmation
  -> updated operator context
  -> better next run
```

What each page contributes:

- `Home` starts the run with the least friction possible
- `Chat` creates the answer, sources, trace, entities, and next actions
- `Reports` turns those into a durable report the user can reopen, refresh, and
  reuse
- `Nudges` watches that report or entity and decides when it matters again
- `Me` stores the operator context that improves the next answer

## Current Legacy Infrastructure

NodeBench is not starting from zero. The repo already contains a substantial
legacy stack that works today.

Current legacy foundation:

- five-surface web product
- Convex-backed canonical data layer
- local and deployed server runtime
- harness v1 planning and execution path
- shared-context handoff and delegation support
- MCP distribution lanes
- builder-facing evaluation and control-plane systems

What that means:

- the problem is not missing architecture
- the problem is product behavior, workflow compression, and clearer
  cross-surface compounding

## Roadmap

The near-term goal is:

```text
keep the working legacy foundation
remove accidental complexity
add specification-aware operator context
ship one clear compounding workflow
```

Main tasks still to finish:

- [ ] make `Home -> Chat -> Reports -> Nudges -> Me` behave like one continuous
      workflow instead of five adjacent surfaces
- [ ] turn harness v1 into the clearer v2 shape described in
      [HARNESS_V2_PROPOSAL](docs/architecture/HARNESS_V2_PROPOSAL.md)
- [ ] ship `Layer 0` operator context so the system can learn useful workflow
      patterns without forcing a heavy onboarding flow
- [ ] support permissioned transcript ingestion from NodeBench chats first, then
      optional external logs such as Claude Code JSONL transcripts for
      `nodebench-mcp`
- [ ] add style-drift guardrails so the system learns judgment and workflow
      without overfitting to corporate voice, filler, or sycophancy
- [ ] add anticipatory prep behavior so the system can prepare the user before
      important interactions, not only answer after the fact
- [ ] make saved reports behave like reusable memory, not storage
- [ ] make `Nudges` a real return loop with at least one working daily trigger
- [ ] make `Me` clearly improve future runs by exposing what context is being
      used and why
- [ ] finish the `nodebench-mcp` v3 cut-and-split plan so default runtime,
      power runtime, and admin runtime are clearly separated
- [ ] instrument real latency, real cost, real artifact completion, and real
      reuse across both web and MCP flows
- [ ] keep README, runtime behavior, and exposed tool counts in sync so the
      public story matches the actual system
- [ ] keep dogfood, eval, and builder-control infrastructure as internal
      leverage instead of letting it leak into the main user-facing product

## Quick Start

### Web app

Open [nodebenchai.com](https://www.nodebenchai.com) and start in `Home`.

### MCP

```bash
# Claude Code
claude mcp add nodebench -- npx -y nodebench-mcp

# Claude Code power lane
claude mcp add nodebench-power -- npx -y nodebench-mcp-power

# Claude Code admin lane
claude mcp add nodebench-admin -- npx -y nodebench-mcp-admin

# Cursor
npx nodebench-mcp --preset cursor

# Generic MCP client
npx nodebench-mcp
```

### Local development

```bash
git clone https://github.com/HomenShum/nodebench-ai.git
cd nodebench-ai
npm install
cp .env.example .env.local

# Frontend + Convex + voice server
npm run dev

# Production build
npm run build
```

## Architecture

```text
nodebenchai.com (React + Vite + Tailwind)
    |
Convex Cloud (sessions, reports, entities, nudges, files, product state)
    |
server runtime + search pipeline + SSE
    |
answer packet
    |
saved report
    |
tracked entities / watch conditions / nudges
    |
future runs with better operator context
```

### Key tech

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Convex
- Search: Linkup + Gemini extraction + grounding pipeline
- MCP server: Node.js + TypeScript
- Realtime runtime: SSE + Convex-backed persistence

## API Keys

Set these in `.env.local` for local work or in Convex / Vercel for deployed
environments.

| Key | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | classification, extraction, synthesis |
| `LINKUP_API_KEY` | Recommended | web search and sourced answers |
| `VITE_CONVEX_URL` | Yes | Convex deployment URL |

## Codebase map

Top-3 levels, annotated. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the
pipeline diagram and [`docs/architecture/README.md`](docs/architecture/README.md)
for the 13 canonical architecture docs.

```text
nodebench-ai/
├── README.md                   ← you are here
├── ARCHITECTURE.md             ← top-level pipeline diagram
├── CONTRIBUTING.md             ← contribution bar
├── CLAUDE.md                   ← Claude Code conventions for this repo
├── AGENTS.md                   ← agent methodology + eval bench
├── LICENSE                     ← MIT
│
├── src/                        ← React frontend (Vite)
│   ├── features/               ← feature-first, 30 folders (Home · Chat · Reports · Nudges · Me · entities · agents · …)
│   │   └── <feature>/          ← views · components · hooks · lib · __tests__ (colocated)
│   ├── shared/                 ← shared UI primitives, hooks, utils
│   ├── lib/                    ← registry, analytics, error reporting
│   └── layouts/                ← shell + cockpit + public
│
├── server/                     ← Node runtime (Express + MCP gateway)
│   ├── pipeline/               ← agent harness runtime + diligence blocks
│   ├── routes/                 ← HTTP routes (search, harness, founder episodes)
│   ├── mcpGateway.ts           ← WebSocket MCP gateway
│   └── services/               ← shared services
│
├── convex/                     ← Convex backend
│   ├── domains/                ← 19 domain folders (agents · product · research · founder · search · …)
│   ├── schema.ts               ← database schema (includes agentScratchpads)
│   └── crons.ts                ← scheduled jobs
│
├── packages/
│   ├── mcp-local/              ← the published nodebench-mcp npm package (MIT)
│   ├── mcp-client/             ← typed client SDK
│   └── convex-mcp-nodebench/   ← Convex-side MCP auditor
│
├── .claude/
│   ├── README.md               ← map of the .claude/ layout
│   ├── rules/                  ← 31 modular rules with related_ cross-refs
│   ├── skills/                 ← reusable how-to procedures
│   ├── agents/                 ← subagent configs
│   └── commands/               ← custom slash commands
│
├── docs/
│   ├── README.md               ← docs tree map
│   ├── ONBOARDING.md           ← 30-minute new-contributor path
│   ├── architecture/           ← 13 canonical specs + plans/ + README index
│   ├── agents/                 ← agent docs + bootstrap configs
│   ├── guides/                 ← how-to for builders
│   ├── decisions/              ← ADRs
│   ├── changelog/              ← release notes
│   ├── product/                ← product decisions
│   ├── qa/                     ← QA protocols
│   └── archive/                ← superseded content, provenance-only
│
├── tests/
│   ├── e2e/                    ← Playwright end-to-end
│   └── fixtures/               ← shared fixtures
│
├── scripts/                    ← dogfood, eval harness, one-offs
├── public/                     ← static assets served by Vite + Vercel
└── vendor/                     ← third-party references
```

## Related Docs

**Start here:** [`docs/ONBOARDING.md`](docs/ONBOARDING.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`docs/architecture/README.md`](docs/architecture/README.md)

The 13 canonical architecture docs are organized in 4 tiers. See [`docs/architecture/README.md`](docs/architecture/README.md) for the indexed map:

- **Tier 1 (core pipeline):** [`AGENT_PIPELINE`](docs/architecture/AGENT_PIPELINE.md) · [`DILIGENCE_BLOCKS`](docs/architecture/DILIGENCE_BLOCKS.md) · [`USER_FEEDBACK_SECURITY`](docs/architecture/USER_FEEDBACK_SECURITY.md)
- **Tier 2 (sub-patterns):** [`SCRATCHPAD_PATTERN`](docs/architecture/SCRATCHPAD_PATTERN.md) · [`PROSEMIRROR_DECORATIONS`](docs/architecture/PROSEMIRROR_DECORATIONS.md) · [`AGENT_OBSERVABILITY`](docs/architecture/AGENT_OBSERVABILITY.md) · [`SESSION_ARTIFACTS`](docs/architecture/SESSION_ARTIFACTS.md)
- **Tier 3 (features):** [`FOUNDER_FEATURE`](docs/architecture/FOUNDER_FEATURE.md) · [`REPORTS_AND_ENTITIES`](docs/architecture/REPORTS_AND_ENTITIES.md) · [`AUTH_AND_SHARING`](docs/architecture/AUTH_AND_SHARING.md)
- **Tier 4 (cross-cutting):** [`MCP_INTEGRATION`](docs/architecture/MCP_INTEGRATION.md) · [`EVAL_AND_FLYWHEEL`](docs/architecture/EVAL_AND_FLYWHEEL.md) · [`DESIGN_SYSTEM`](docs/architecture/DESIGN_SYSTEM.md)

Historical specs are preserved in [`docs/archive/2026-q1/`](docs/archive/2026-q1/INDEX.md).

## Product Suite

```text
NodeBench AI   = flagship user surface
nodebench-mcp  = workflow lane
Attrition.sh   = measured replay + optimization lane
```

Attrition is not a third flagship. It is the measurable optimization lane for
the same NodeBench workflow.

## License

MIT
