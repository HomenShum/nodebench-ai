# NodeBench AI

Entity intelligence for any company, market, or question.

**Live:** [nodebenchai.com](https://www.nodebenchai.com)  
**npm:** `npx nodebench-mcp`  
**GitHub:** [HomenShum/nodebench-ai](https://github.com/HomenShum/nodebench-ai)

## Product

NodeBench is a research and reporting product built around five user-facing surfaces:

- `Home` = discovery and intake
- `Chat` = live agent execution
- `Reports` = saved memory
- `Nudges` = follow-ups and action
- `Me` = private context

Current strengths already in the repo:

- typed research pipeline
- packet-first runtime
- live SSE streaming
- shared-context handoff and delegation
- builder-facing Oracle and flywheel infrastructure

The main product problem is not missing infrastructure. It is product behavior and surface consolidation.

## Quick Start

### Web app

Open [nodebenchai.com](https://www.nodebenchai.com) and start in `Home`.

### MCP

```bash
# Claude Code
claude mcp add nodebench -- npx -y nodebench-mcp --preset founder

# Cursor
npx nodebench-mcp --preset cursor

# Generic MCP client
npx nodebench-mcp --preset starter
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

## RETHINK REDESIGN APR 2026

The key shift is: stop treating this as a visual polish problem and treat it as a product-behavior problem.

### The five principles

- value before identity
- speed as product behavior
- output as distribution
- meeting users where they are
- visible compounding over time

### The six current gaps

- `Home` is still page-shaped
- `Chat` still over-explains before proving value
- `Reports` still feels archival
- `Nudges` is not yet a closed loop
- `Me` still feels like settings
- there is no real quality operating system yet

That diagnosis matches current repo reality. NodeBench already has a typed pipeline, a packet-first Ask surface, shared-context handoff, delegation, and builder-facing evaluation infrastructure. What it does not yet have is one canonical workflow backbone across the user surfaces, nor a mature `Retention` / `Attrition` runtime path exposed in a product-ready way.

### Ruthless execution board

#### 1. Home is still explaining the product instead of launching the product

Symptom in NodeBench:
- the user sees framing, cards, and side surfaces before the first useful run starts

What to change:
- ask bar first
- upload second
- one example result below fold
- no explanatory chrome before the first action

Targets:
- `Home` route shell
- ask composer
- upload entry
- any discovery wall above the first fold

Metric:
- `landing_to_first_run_start < 5s`
- `first_input_visible_on_first_paint`

Ship order:
- `1`

#### 2. Chat is not yet the product

Symptom in NodeBench:
- the answer does not dominate enough
- the user still works too hard to understand what is happening

What to change:
- every ask routes into one persistent live session
- answer stays central
- sources attach to answer blocks
- activity rail supports trust without dominating
- follow-ups continue the same session

Targets:
- `ResultWorkspace.tsx`
- live search / SSE render path
- answer block renderer
- inline sources
- session persistence layer

Metric:
- `first_partial_answer_at < 800ms`
- `first_source_at < 2s`
- `first_completed_section_at < 5s`

Ship order:
- `2`

#### 3. Speed is not yet expressed as product behavior

Symptom in NodeBench:
- the frontend still feels like it waits and then reveals

What to change:
- classify result paints immediately
- source chips appear while search is still running
- answer blocks stream progressively
- skeletons hold layout stable
- no large layout jumps after first paint

Targets:
- SSE event mapping
- partial answer renderer
- source chip renderer
- loading skeletons for `Home`, `Chat`, and `Reports`

Metric:
- no layout jump larger than one component height
- `chat_stage_visible_progressively = true`

Ship order:
- `3`

#### 4. Reports is shaped like storage, not reusable memory

Symptom in NodeBench:
- saved work still feels archival rather than compounding

What to change:
- clean reusable report pages
- first render already useful
- each report shows:
  - what it is
  - why it matters
  - what is missing
  - what could break
  - what to do next
- every report reopens directly into `Chat`

Targets:
- report grid
- report detail page
- saved report object
- report refresh flow
- report-to-chat action

Metric:
- `first_saved_report_at`
- `first_return_visit_to_report_at`
- `report_to_chat_reentry_rate`

Ship order:
- `4`

#### 5. Nudges is still a promise, not a loop

Symptom in NodeBench:
- there is no concrete daily closed-loop behavior yet

What to change:
- start with one real loop only:
  - report changed
  - reply draft ready
  - follow-up due

Targets:
- nudge feed
- one nudge generator
- one action path back into `Chat` or `Reports`
- connector status cards

Metric:
- `nudge_open_rate`
- `nudge_to_action_rate`
- `nudge_to_chat_or_report_return_rate`

Ship order:
- `5`

#### 6. Me still looks like settings instead of leverage

Symptom in NodeBench:
- users cannot feel that private context improves future runs

What to change:
- show what context exists
- show what will improve the next run
- show what files / reports / entities are being used

Targets:
- saved files
- saved entities
- profile summary
- visible "using your context" chips in `Chat`

Metric:
- `runs_using_me_context`
- `me_context_improves_completion_rate`
- `visible_context_usage_rate`

Ship order:
- `6`

#### 7. There is no permanent quality operating system yet

Symptom in NodeBench:
- good improvements can drift without a standing quality lane

What to change:
- weekly papercut pass
- no bug backlog dumping
- every release reviewed for:
  - spacing
  - loading
  - empty states
  - hover / focus
  - motion
  - source visibility
  - layout stability

Targets:
- release checklist
- bug triage rules
- perf dashboard
- UX quality review checklist

Metric:
- bug age
- papercut count shipped weekly
- regressions in time-to-value
- layout shift incidents

Ship order:
- `parallel from day 1`

### What to strip immediately

Remove or hide from the main user surface:

- `Compare` as a top-level workflow
- builder-only eval surfaces
- `Improvements` as user-facing product
- raw workflow / replay / trajectory terminology
- any page that is mainly about internal system state rather than user value

### What to keep and lean into

Keep these because they are real strengths:

- typed pipeline
- packet-first runtime
- shared-context handoff
- real streaming
- bounded delegation targets
- early replay/template substrate
- builder-facing evaluation loop

### Correct product hierarchy

User sees:

```text
Home -> Chat -> Reports -> Nudges -> Me
```

System does:

```text
typed pipeline -> packet/report -> shared context -> save -> nudge
                         |
                         +-> Retention remembers useful patterns
                         +-> Attrition trims future reruns
                         +-> Hyperagent reviews quality
                         +-> ARE tests robustness
```

### Top 3 to ship first

1. `Home` becomes launchpad only
2. `Chat` becomes the dominant product surface
3. one real nudge loop

### nodebench-mcp v3: Cut, Split, Measure

The MCP server problem is not "needs cleanup." It is: **tool platform pretending to be a simple MCP.**

README and runtime tool counts do not match. Presets are much larger than they appear from the docs. The boot path is overloaded. Cost is estimated, not truly measured. Performance testing is mostly harness-overhead oriented, not outcome-oriented.

The next move is a **v3 cut + split + measure** reset.

#### v3 package split

```text
nodebench-mcp        -> tiny default install (core 8 tools, fast boot, measurable cost)
nodebench-mcp-power  -> optional extended tool packs (extra domains, specialist flows)
nodebench-mcp-admin  -> profiling / eval / debug / dashboards (internal only)
```

#### Cut from default runtime

These should not load in the main happy path:

- dashboard launchers
- profiling proxies
- A/B harnesses
- embedding bootloaders
- benchmark runners
- admin analytics tools
- debug-only discovery helpers
- giant preset/domain catalogs
- anything that exists mainly to inspect the platform rather than complete user work

#### Cut from default messaging

Delete from the front-door pitch:

- "350+ tools"
- giant preset menus
- domain-count flexing
- meta-discovery as the primary experience

Replace with: one wedge, one workflow, one artifact, one measurable outcome.

#### Default tools (6-8, not 418)

```text
1. investigate(entity)     — deep research on a company/person/topic
2. compare(entities[])     — side-by-side analysis
3. track(entity)           — watch for changes, get nudges
4. summarize(context)      — synthesize any input into structured brief
5. search(query)           — web + entity + knowledge search
6. report(topic)           — generate shareable markdown report
7. ask_context(question)   — query against saved private context
8. discover_tools()        — power users: unlock extended tool packs
```

#### Every default tool must return

```text
- structured data       (for agent consumption)
- readable markdown     (for human reading)
- sources used          (for trust)
- actual latency        (measured, not estimated)
- actual cost           (measured, not hardcoded)
- artifact id           (shareable handle or URL)
```

#### Canonical workflow

Not "discover tools." Do the job.

```text
ASK -> CHECK -> WRITE -> SAVE
```

An agent should begin with "do the job," not "discover tools."

#### Package promise (12 words or less)

```text
Investigate a topic and return a sourced report fast.
```

#### Measurement reset

##### Startup targets

| Metric | Target |
|--------|--------|
| `stdio ready` p50 | < 500ms warm |
| `--health` p50 | < 300ms warm |
| `tools/list` payload | < 25 tools |
| Default install visible tools | <= 8 core |

##### Per-tool targets

| Metric | Target |
|--------|--------|
| Latency p50 / p95 | Measured and logged |
| Real provider cost | Measured, not hardcoded |
| Error rate | Tracked per tool |
| Artifact completion rate | Tracked |

##### Per-workflow targets

| Metric | Target |
|--------|--------|
| Time to first useful artifact | < 10s happy path |
| Cost per artifact | Shown on every workflow |
| Artifact quality score | Tracked |
| Reuse rate | Tracked |
| Follow-up success rate | Tracked |

#### Hard latency budgets

| Event | Target |
|-------|--------|
| First visible response in Chat | < 800ms |
| First source visible | < 2s |
| First section completed | < 5s |
| No layout jump > 1 component height after first paint | Always |
| MCP tool boot | < 1.5s |
| MCP tool response p95 | < 2s |
| Embedding search p95 | < 500ms |

#### CI guardrails (add immediately)

```text
1. preset count check           — runtime matches README
2. tools/list snapshot check    — no accidental tool creep
3. startup latency budget check — boot stays under 1.5s
4. README/runtime truth check   — published claims match reality
5. cost instrumentation gate    — provider-backed tools must log real cost
```

#### Every workflow must end in a human artifact

Not a JSON blob. One of:

- memo
- report
- comparison brief
- watch item
- follow-up summary

That is how output becomes distribution.

#### Ship order for v3

**Week 1 — Cut and simplify**
- Freeze new MCP tools
- Inventory every exposed tool
- Define core 8
- Hide or remove everything else from default
- Rewrite README to match truth
- Remove huge preset-first messaging

**Week 2 — Split the package**
- `nodebench-mcp` (core)
- `nodebench-mcp-power` (extended)
- `nodebench-mcp-admin` (internal)
- Move optional systems out of default boot path

**Week 3 — Instrument reality**
- Real cost logging per tool call
- Real latency logging per tool call
- Real workflow success metrics
- Preset count verification in CI

**Week 4 — Workflow-first release**
- Ship one canonical workflow end-to-end
- One artifact type done really well
- One shareable output path
- One benchmark based on actual artifact quality

#### The hard question

> If you deleted 350 of the 418 tools, which 68 would an agent actually miss?

If you can't answer that from usage data, that's the problem.

#### The reframe

```text
NodeBench MCP should not be a monolithic tool warehouse.
It should be a small number of opinionated workflow products
backed by a measurable runtime.
```

#### References

- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) — 12.6k stars, 0 tools, pure workflow
- [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — 83.5k stars, 7 reference servers
- [Speakeasy: Playwright cut from 70+ to 8 tools](https://www.speakeasy.com/blog/playwright-tool-proliferation)
- [Progressive disclosure MCP: 85x token savings](https://matthewkruczek.ai/blog/progressive-disclosure-mcp-servers.html)
- [Evil Martians: 6 principles for developer tools](https://evilmartians.com/chronicles/six-things-developer-tools-must-have-to-earn-trust-and-adoption)
- [Linear: Quality Wednesdays + Zero-bugs policy](https://linear.app/blog)
- Unified workflow spec: [`docs/architecture/UNIFIED_WORKFLOW_SPEC.md`](docs/architecture/UNIFIED_WORKFLOW_SPEC.md)
- Full analysis: [`docs/architecture/MCP_BEHAVIORAL_REEXAMINATION.md`](docs/architecture/MCP_BEHAVIORAL_REEXAMINATION.md)

---

## Architecture

```text
nodebenchai.com (React + Vite + Tailwind)
    |
Convex Cloud (realtime DB + actions + workflows)
    |
Typed search pipeline
    |
Packet / report output
    |
Shared context + nudges + future learning loops
```

### Key tech

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Convex
- Search: Linkup + Gemini extraction + grounding pipeline
- MCP server: Node.js + TypeScript
- Realtime runtime: SSE + Convex-backed persistence

## API Keys

Set these in `.env.local` for local work or in Convex / Vercel for deployed environments.

| Key | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | classification, extraction, synthesis |
| `LINKUP_API_KEY` | Recommended | web search and sourced answers |
| `VITE_CONVEX_URL` | Yes | Convex deployment URL |

## Project Structure

```text
nodebench-ai/
├── src/                      # React frontend
│   ├── features/             # Home, Chat, Reports, Nudges, Me, controlPlane
│   ├── hooks/                # Streaming and UI hooks
│   └── layouts/              # Public shell and route host
├── convex/                   # Convex backend
│   ├── domains/product/      # Canonical product objects and queries
│   ├── domains/search/       # Search pipeline
│   └── schema.ts             # Database schema
├── server/                   # Local / Vercel server runtime
├── packages/mcp-local/       # MCP server package
└── docs/architecture/        # Specs, audits, and redesign notes
```

## Related Docs

- [ATTRITION_REDESIGN_SPEC](docs/architecture/ATTRITION_REDESIGN_SPEC.md)
- [MCP_BEHAVIORAL_REEXAMINATION](docs/architecture/MCP_BEHAVIORAL_REEXAMINATION.md)
- [UNIFIED_WEB_MCP_PRODUCTION_SPEC](docs/architecture/UNIFIED_WEB_MCP_PRODUCTION_SPEC.md)
- [APP_SCORING_AND_DOGFOOD_INSTRUCTIONS](docs/architecture/APP_SCORING_AND_DOGFOOD_INSTRUCTIONS.md)
- [ORACLE_VISION](docs/architecture/ORACLE_VISION.md)
- [ORACLE_STATE](docs/architecture/ORACLE_STATE.md)
- [ORACLE_LOOP](docs/architecture/ORACLE_LOOP.md)

## License

MIT

### Three-Product Stack (Apr 2026)

```
NodeBench AI   = flagship user surface
nodebench-mcp  = embedded workflow lane
Attrition.sh   = measured replay + optimization lane
```

Attrition is NOT a third flagship. It is the measurable optimization lane for the same NodeBench workflow. One job: capture, measure, compress, replay, prove savings.

Full spec: see attrition repo `docs/THREE_PRODUCT_STACK_SPEC.md`
