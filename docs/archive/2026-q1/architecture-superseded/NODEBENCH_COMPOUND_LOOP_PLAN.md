# Plan: Map NodeBench to the Prototype-Plan Pattern

## Context

The `FloorAI -> PropertyAI -> CourseAI` pattern is:

```text
one domain
  -> one or two primary personas
  -> one single-entity workspace
  -> one multi-entity workspace
  -> one shared chat surface
```

NodeBench is different.

NodeBench is not a domain fork. It is one compound intelligence product that
needs to support many persona lanes, many deliverable shapes, and many tool
families through one shared five-surface loop.

Current public product shape in code:

- `Home` -> [src/features/home/views/HomeLanding.tsx](../../src/features/home/views/HomeLanding.tsx)
- `Chat` -> [src/features/chat/views/ChatHome.tsx](../../src/features/chat/views/ChatHome.tsx)
- `Reports` -> [src/features/reports/views/ReportsHome.tsx](../../src/features/reports/views/ReportsHome.tsx)
- `Nudges` -> [src/features/nudges/views/NudgesHome.tsx](../../src/features/nudges/views/NudgesHome.tsx)
- `Me` -> [src/features/me/views/MeHome.tsx](../../src/features/me/views/MeHome.tsx)
- report detail workspace -> [src/features/entities/views/EntityPage.tsx](../../src/features/entities/views/EntityPage.tsx)

Current product-state owners:

- [convex/domains/product/home.ts](../../convex/domains/product/home.ts)
- [convex/domains/product/chat.ts](../../convex/domains/product/chat.ts)
- [convex/domains/product/reports.ts](../../convex/domains/product/reports.ts)
- [convex/domains/product/nudges.ts](../../convex/domains/product/nudges.ts)
- [convex/domains/product/me.ts](../../convex/domains/product/me.ts)

Current runtime owners:

- [server/routes/search.ts](../../server/routes/search.ts)
- [server/harnessRuntime.ts](../../server/harnessRuntime.ts)
- [server/agentHarness.ts](../../server/agentHarness.ts)
- [packages/mcp-local/src/toolsetRegistry.ts](../../packages/mcp-local/src/toolsetRegistry.ts)
- [packages/mcp-local/src/agents/subAgents.ts](../../packages/mcp-local/src/agents/subAgents.ts)

## NodeBench Product Shape

The clean mapping is:

```text
DOMAIN-SPECIFIC PROTOTYPE PATTERN
--------------------------------
landing
  -> single-entity workspace
  -> multi-entity workspace
  -> shared chat

NODEBENCH PATTERN
-----------------
Home
  -> Chat
  -> Reports
  -> Nudges
  -> Me
  -> back into Home or Chat

detail workspace:
  /entity/:slug
    = the saved report / compound note page
```

That means the NodeBench equivalent of `single-property view`, `portfolio
view`, and `group chat` is not three separate top-level apps. It is:

- `Chat` for active execution
- `Reports + /entity/:slug` for durable entity workspaces
- `Nudges` for return-loop re-entry
- `Me` for operator context and control

So the product rule is:

```text
do not design five tabs
design one loop
```

## Architecture Reuse Map

```text
ALREADY SHIPPED / REUSABLE             MUST BE TIGHTENED / SIMPLIFIED         NET-NEW HARNESS V2 WORK
--------------------------             -------------------------------         ------------------------
5 core surfaces                        Home information density               Layer 0 operator context
Convex product domains                 Reports browse hierarchy               Elicitation before/during/after use
Chat -> saved report path              Entity page section ordering           Versioned operator context packets
Entity report workspace                Nudges grouping and dedupe             Transcript ingestion with permission
Nudge actions and mutations            Me connector / context clarity         Anticipatory prep mode
Dynamic routing / advisor mode         Cross-surface naming consistency       Section-level source recall
Shared-context delegation plumbing     Source drill-down ergonomics           Skill extraction from good runs
MCP distribution lanes                 Export / share action clarity          Trace distillation and reusable templates
Dogfood / eval / control-plane infra   Hidden-vs-mounted surface hygiene      Stronger planner / replanner logic
```

Plain English:

- NodeBench already has the spine.
- The remaining work is not "invent the product."
- The remaining work is:
  - compress the loop
  - simplify the surfaces
  - make saved artifacts deeper and more reusable
  - add specification-aware context and better routing

## Personas: NodeBench Is Wider Than A Two-Persona App

### 1. Public entry personas already implied by the product

These show up directly in the public story and lens framing:

- founder
- investor
- banker
- buyer
- operator
- student

These are not separate apps. They are different reading and output modes over
the same research engine.

### 2. Broader persona families already designed in the repo

The timeline roadmap and architecture docs already model wider persona coverage:

- Venture Capitalists
- JPM Startup Banking
- Mercury Bankers
- Investment Bankers
- Technology Leaders
- Startup Founders
- Developers
- Biotech Professionals
- Fintech Professionals
- PitchBook Analysts

Grounding:

- [src/components/timelineRoadmap/TimelineRoadmapView.tsx](../../src/components/timelineRoadmap/TimelineRoadmapView.tsx)
- [docs/architecture/ATTRITION_REDESIGN_SPEC.md](./ATTRITION_REDESIGN_SPEC.md)
- [docs/architecture/AGENT_QUESTION_CATALOG.md](./AGENT_QUESTION_CATALOG.md)

### 3. Builder and internal personas that also matter

These are real product users too, even if they are not the main public story:

- product builder
- engineer
- operator reviewing trace and source quality
- MCP user delegating from NodeBench into Claude Code or OpenClaw

This matters because NodeBench reports need controllable depth:

```text
summary
  -> section
  -> source
  -> trace
```

The same saved artifact has to work for:

- a fast stakeholder read
- a follow-up operator workflow
- a deeper engineering or builder audit

## Tool and Agent Design: NodeBench Is A Horizontal Tool Product

Unlike a narrow vertical app, NodeBench already has many tool families.

Current specialist-agent pattern:

- `ResearchAgent`
- `AnalysisAgent`
- `SynthesisAgent`
- `ProfilerAgent`

Grounding:

- [packages/mcp-local/src/agents/subAgents.ts](../../packages/mcp-local/src/agents/subAgents.ts)

Current tool families already present in the runtime:

- research and retrieval
  - `web`, `recon`, `entity enrichment`, `docs`
- workflow and state
  - `core_workflow`, `workspace`, `context`, `shared_context`, `sync_bridge`
- verification and eval
  - `verification`, `eval`, `quality_gate`, `execution_trace`, `flywheel`
- operator and founder workflows
  - `founder_local_pipeline`, `founder_operating_model`, `founder_strategic_ops`
- multimodal and capture
  - `vision`, `voice_bridge`, `ui_capture`
- forecasting and time-aware intelligence
  - `forecasting`, `entity_temporal`
- design, delivery, and builder tooling
  - `figma_flow`, `autonomous_delivery`, `boilerplate`, `bootstrap`

Grounding:

- [packages/mcp-local/src/toolsetRegistry.ts](../../packages/mcp-local/src/toolsetRegistry.ts)

Important product implication:

```text
NodeBench is not "a chat app with a few tools"
NodeBench is "a routing and artifact system over many tool domains"
```

That is why the five-page loop matters. Without the loop, the product just
looks like too many capabilities in one place.

## Real Workflow Scenario Families

These are the NodeBench equivalent of the `PropertyAI broker` or `CourseAI
professor` scenarios. They are grounded in the current product direction and
existing persona/tool design.

### 1. Cold-start company question

Persona examples:

- founder
- investor
- banker
- student

Intent:

- "What does this company do?"
- "What matters most right now?"
- "Give me the shortest useful read with sources."

Core loop:

```text
Home
  -> Chat
  -> Reports
```

Primary artifact:

- first saved report for an entity

### 2. Return to an entity and update it

Persona examples:

- founder
- investor
- operator

Intent:

- "What changed since the last report?"
- "Refresh this dossier."
- "Reopen the saved work instead of starting from zero."

Core loop:

```text
Reports
  -> /entity/:slug
  -> Chat
  -> Reports
```

Primary artifact:

- refreshed report revision with deltas

### 3. Ongoing market or competitor watch

Persona examples:

- startup founder
- technology leader
- banker
- VC

Intent:

- "Tell me when this company, market, or competitor materially changes."

Core loop:

```text
Reports
  -> Nudges
  -> /entity/:slug
  -> Chat
```

Primary artifact:

- tracked entity + useful nudge + resumed report/chat

### 4. Deal screening and dossier generation

Persona examples:

- venture capitalist
- investment banker
- JPM startup banking
- PitchBook analyst

Intent:

- "Screen this company fast."
- "Build a banker-ready or investor-ready packet."
- "Show comps, credibility, and timing context."

Core loop:

```text
Home
  -> Chat
  -> Reports
  -> /entity/:slug
  -> export or share
```

Primary artifact:

- deal and dossier pack

### 5. Technical research radar

Persona examples:

- developer
- technology leader
- startup founder

Intent:

- "What changed in models, repos, papers, or benchmarks?"
- "Summarize the technical shift and what it means."

Core loop:

```text
Home
  -> Chat
  -> Reports
  -> Nudges
```

Primary artifact:

- research radar report with later refresh triggers

### 6. Regulatory and risk monitoring

Persona examples:

- biotech professional
- fintech professional
- banker covering regulated sectors

Intent:

- "Track regulatory calendars, approvals, or risk changes."
- "Bring me back only when a change matters."

Core loop:

```text
Home
  -> Chat
  -> Reports
  -> Nudges
  -> /entity/:slug
```

Primary artifact:

- regulatory and risk radar

### 7. Weekly reset and delegation prep

Persona examples:

- founder
- operator
- executive

Intent:

- "What changed this week?"
- "What should I delegate?"
- "Prepare me for the next meeting or handoff."

Core loop:

```text
Nudges
  -> Reports
  -> Chat
  -> shared-context handoff
```

Primary artifact:

- prep brief or delegation packet

### 8. Personal context shaping

Persona examples:

- returning power user
- founder
- operator
- MCP user

Intent:

- "Use my files, notes, and preferences."
- "Show me what the system knows about how I work."
- "Improve future runs without bloated onboarding."

Core loop:

```text
Me
  -> Chat
  -> Reports
  -> future Nudges / future Home runs
```

Primary artifact:

- stronger operator context

### 9. Export and handoff

Persona examples:

- banker
- analyst
- founder
- internal builder

Intent:

- "Turn this into something I can send."
- "Export a memo, CRM block, Slack handoff, or Gmail draft."

Core loop:

```text
Reports
  -> /entity/:slug
  -> share / export / delegate
```

Primary artifact:

- outward-facing deliverable derived from the saved report

### 10. Builder deep dive and QA

Persona examples:

- engineer
- product builder
- internal operator

Intent:

- "Why did this answer look like this?"
- "What sources, sections, and trace steps support it?"
- "How should we simplify or improve this feature?"

Core loop:

```text
Reports
  -> /entity/:slug
  -> section
  -> source
  -> trace
```

Primary artifact:

- actionable product or prompt improvement insight

## NodeBench Mapping: What Replaces The Old Single-View / Regional-View Split

In the domain prototypes, there was a clean split:

- one page for one entity
- one page for many entities
- one shared chat

In NodeBench, that split becomes:

```text
ONE ENTITY
----------
Chat run for one question
  -> saved report
  -> /entity/:slug workspace

MANY ENTITIES
-------------
Reports browse
  + Nudges queue
  + compare / benchmark / role-lens layers

SHARED EXECUTION SURFACE
------------------------
Chat

SHARED CONTROL SURFACE
----------------------
Me
```

That is the correct abstraction for NodeBench:

```text
NodeBench is a cross-persona intelligence operating system,
not a domain-specific workspace clone.
```

## Execution Sequence For NodeBench

### Phase 1: Tighten the loop that already exists

Goal:

```text
Home
  -> Chat
  -> saved report
  -> Reports
  -> Nudges
```

Primary owners:

- [src/features/home/views/HomeLanding.tsx](../../src/features/home/views/HomeLanding.tsx)
- [src/features/chat/views/ChatHome.tsx](../../src/features/chat/views/ChatHome.tsx)
- [src/features/reports/views/ReportsHome.tsx](../../src/features/reports/views/ReportsHome.tsx)
- [src/features/nudges/views/NudgesHome.tsx](../../src/features/nudges/views/NudgesHome.tsx)
- [convex/domains/product/chat.ts](../../convex/domains/product/chat.ts)
- [convex/domains/product/reports.ts](../../convex/domains/product/reports.ts)
- [convex/domains/product/nudges.ts](../../convex/domains/product/nudges.ts)

Done when:

- one successful chat run reliably creates a useful saved report
- that report can create a useful nudge
- that nudge can reopen the right report or chat context

### Phase 2: Make `/entity/:slug` the best report workspace in the product

Goal:

```text
report-first reading
  -> section drill-down
  -> source drill-down
  -> trace on demand
```

Primary owners:

- [src/features/entities/views/EntityPage.tsx](../../src/features/entities/views/EntityPage.tsx)
- [convex/domains/product/reports.ts](../../convex/domains/product/reports.ts)

Done when:

- stakeholders can read the short version fast
- power users can inspect sources in an organized way
- builders can reach trace without polluting the main report body

### Phase 3: Ship Layer 0 operator context through `Me`

Goal:

```text
lightweight onboarding
  + continuous learning
  + explicit user control
```

Primary owners:

- [src/features/me/views/MeHome.tsx](../../src/features/me/views/MeHome.tsx)
- [convex/domains/product/me.ts](../../convex/domains/product/me.ts)
- future operator-context records described in
  [HARNESS_V2_PROPOSAL.md](./HARNESS_V2_PROPOSAL.md)

Done when:

- the user can see what context affects the next run
- the user can add, edit, or reset parts of that context
- the next run actually changes based on that context

### Phase 4: Finish advisor mode and dynamic routing

Goal:

```text
fast by default
deeper when needed
user can force the deeper lane
```

Primary owners:

- [server/harnessRuntime.ts](../../server/harnessRuntime.ts)
- [server/routes/search.ts](../../server/routes/search.ts)
- [server/agentHarness.ts](../../server/agentHarness.ts)

Done when:

- easy runs stay fast
- hard runs escalate correctly more often than not
- the route choice is visible in product state and reports

### Phase 5: Add anticipatory behavior

Goal:

```text
not just answer after the question
prepare before the next interaction
```

Primary owners:

- reports and nudges product domains
- shared-context and delegation routes
- prep-brief artifact shapes from Harness v2 docs

Done when:

- a saved report can trigger a prep brief or follow-up brief
- the product can help before a meeting or handoff, not only after a search

### Phase 6: Expand persona-aware deliverables without fracturing the product

Goal:

```text
one product core
many persona outputs
```

Primary owners:

- role-lens and comparison surfaces
- report export shapes
- prompt and artifact templates

Grounding:

- [docs/architecture/ATTRITION_REDESIGN_SPEC.md](./ATTRITION_REDESIGN_SPEC.md)
- [src/components/timelineRoadmap/TimelineRoadmapView.tsx](../../src/components/timelineRoadmap/TimelineRoadmapView.tsx)

Done when:

- the same saved packet can become:
  - founder brief
  - investor screen
  - banker dossier
  - operator update
  - student explanation

### Phase 7: Strengthen distribution and delegation

Goal:

```text
web run
  -> shared context packet
  -> MCP or coding-agent handoff
  -> traceable continuation
```

Primary owners:

- shared context routes
- sync bridge
- MCP distribution lanes

Done when:

- the user does not have to restate the same context in a second system
- the web product and MCP lanes share the same durable packet shape

## Verification

### Product verification

- `Home` can start a real run
- `Chat` can complete with sources and a saved report
- `Reports` can reopen the right work
- `/entity/:slug` can refresh, export, and drill into sources
- `Nudges` can reopen or close loops cleanly
- `Me` can change future behavior instead of acting like a dead settings page

### Engineering verification

```bash
npx tsc --noEmit
npx vitest run server/harnessRuntime.test.ts server/searchRoute.test.ts
npx vitest run src/features/entities/views/EntityPage.test.tsx src/features/nudges/views/NudgesHome.test.tsx
npm run build
```

### Browser verification

Minimum live path:

```text
Home
  -> Chat
  -> Open full report
  -> /entity/:slug
  -> Refresh now
  -> Reports
  -> Nudges
  -> Me
  -> back into Chat
```

## Short Takeaway

The prototype-plan pattern still applies, but the mapping is different.

The right NodeBench translation is:

```text
not:
  one domain app
  -> one entity page
  -> one portfolio page

instead:
  one compound intelligence product
  -> many personas
  -> one five-page loop
  -> one saved artifact ladder
  -> one routing layer over many tools
```

If FloorAI-style apps are `vertical products`, NodeBench is a `horizontal
intelligence operating system` that still has to feel simple from the outside.
