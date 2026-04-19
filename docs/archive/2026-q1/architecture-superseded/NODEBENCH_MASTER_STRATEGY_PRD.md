# NodeBench Master Strategy & PRD

> Canonical source of truth for NodeBench product direction.
> Last updated: 2026-03-23

## 0. Product north star

```text
NodeBench = the ambient operating intelligence layer that continuously
restructures evolving conversations, actions, market signals, and artifacts
into up-to-date business truth for humans and agents
```

Everything in the first product should reinforce this sequence:

```text
raw conversations and activity
-> NodeBench turns them into operating truth
-> NodeBench keeps that truth current
-> NodeBench prepares what humans and agents need next
```

**User promise:** You should not have to repeatedly ask for the state of your own product, industry, competitors, and opportunities. NodeBench should already know, show what changed, and prepare the next artifact or delegation packet.

**Ambient intelligence principle:** NodeBench should absorb the monitoring, transcription, restructuring, and continuity burden that power users currently perform manually across chat threads, docs, search, and agent sessions.

The core loop:

```text
messy context (chats, agents, docs, signals, actions)
-> ingestion + canonicalization
-> change / contradiction detection
-> ranked interpretation
-> Artifact Packet
-> memo / doc / HTML brief
-> handoff to agent
-> continuous monitoring (ambient)
```

That is the core loop to prove before broader platform expansion.

## 1. Canonical thesis

### Core statement

NodeBench should be built as a local-first, multi-entity operating-memory and context substrate that starts with a founder platform, expands to multi-role entity intelligence, and distributes through an open MCP CLI plus a local/cloud dashboard experience that shares the same mental model.

### Product interpretation

NodeBench is not just a founder dashboard and not just an agent control plane.

It is:
- a restructuring layer for messy operating context
- a canonical-truth and contradiction-detection system
- an Artifact Packet generator for humans and agents
- a local-first substrate that can later expand into broader multi-entity workflows

### Category statement

NodeBench should aim to define: **the local-first operating-memory and context-restructuring layer for agent-native businesses and entity-centered workflows**.

## 2. Hard strategic rules

1. **Do not market NodeBench as a generic agent shell.**
2. **The founder product proves the thesis first.** Broader entity, role, or workflow expansion comes after the founder loop is habitual.
3. **Local-first trust is the default.** The product must be useful with no cloud account, no forced sync, and no public listing.
4. **Local and cloud must feel like the same product.** Same mental model, same major views, same vocabulary.
5. **Truth comes before chat.** The founder should land on structured clarity, not a blank prompt box.
6. **The packet comes before the agent.** Agents consume structured truth; they do not replace it.
7. **Public exposure is optional, not required.**
8. **If a category already has a leader, NodeBench should win as the substrate underneath it, not by cloning its top layer.**
9. **Memory is replaceable plumbing. Business truth is the moat.** NodeBench should sit above memory providers (Supermemory, Zep, local) via a MemoryProvider interface, not compete as another memory API.
10. **The product should feel ambient.** When the user opens NodeBench, it should already show what changed, what contradicts, what competitors did, and what packet is ready. The user should never have to ask "what's the current state?" — NodeBench should already know.

## 3. What is commoditizing vs what remains open

### Commoditizing
- generic chat with agents
- terminal and browser control
- generic multi-agent orchestration
- generic "AI cockpit" positioning
- undifferentiated workflow execution

### Open layer / NodeBench wedge
- canonical company truth extraction
- contradiction and drift detection
- ranked interpretation of what matters now
- durable evidence and provenance
- reusable Artifact Packets for humans and agents
- continuity across weekly resets, pre-delegation briefings, and important-change reviews

## 4. The first 5 seconds

### What the user should see immediately

When NodeBench opens, the founder should not land on chat first.

They should see, above the fold:

```text
1. What company you are actually building
2. What changed
3. Biggest contradiction
4. Next 3 moves
```

That is the 5-second clarity wow.

### Desktop first 5 seconds

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ NODEBENCH                                                                   │
│ Founder Operating Memory                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Company: NodeBench                    Mode: Weekly Reset                    │
│ State: Forming / Clarifying Wedge     Confidence: 0.72                      │
├───────────────────────┬──────────────────────────┬───────────────────────────┤
│ WHAT COMPANY          │ WHAT CHANGED             │ NEXT 3 MOVES              │
│ Founder operating     │ Agent-control framing    │ 1. Lock wedge             │
│ memory + artifact     │ deprioritized            │ 2. Refresh packet         │
│ restructuring layer   │ Artifact loop sharpened  │ 3. Brief agents           │
├───────────────────────┴──────────────────────────┴───────────────────────────┤
│ BIGGEST CONTRADICTION:                                                      │
│ Product still risks reading like a broad command center instead of a        │
│ founder clarity + artifact system.                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Mobile first 5 seconds

```text
┌──────────────────────────────┐
│ NODEBENCH                    │
├──────────────────────────────┤
│ Company: NodeBench           │
│ State: Forming               │
│ Confidence: 0.72             │
├──────────────────────────────┤
│ WHAT THIS IS                 │
│ Founder operating memory     │
│ + artifact restructuring     │
├──────────────────────────────┤
│ WHAT CHANGED                 │
│ Artifact loop is clearer     │
├──────────────────────────────┤
│ BIGGEST CONTRADICTION        │
│ Still reads too platform-ish │
├──────────────────────────────┤
│ NEXT 3 MOVES                 │
│ 1. Lock wedge                │
│ 2. Refresh packet            │
│ 3. Brief agents              │
└──────────────────────────────┘
```

## 5. End-to-end flow

### Main founder flow

```text
┌──────────────┐
│ Context Intake│
└──────┬───────┘
       v
┌──────────────────────┐
│ Canonical Company     │
│ Truth Extraction      │
└──────┬───────────────┘
       v
┌──────────────────────┐
│ Change + Contradiction│
│ Detection             │
└──────┬───────────────┘
       v
┌──────────────────────┐
│ Founder Dashboard     │
│ Clarity Overview      │
└──────┬───────────────┘
       v
┌──────────────────────┐
│ Artifact Packet       │
│ Review + History      │
└──────┬───────────────┘
       v
┌──────────────────────┐
│ Export / Hand to Agent│
│ Memo / HTML / Brief   │
└──────┬───────────────┘
       v
┌──────────────────────┐
│ History + Important   │
│ Change Review         │
└──────────────────────┘
```

### Entry modes

All three modes must land in the same packet logic:

```text
A. Weekly founder operating reset
B. Pre-delegation agent briefing
C. Important-change review
```

That keeps one mental model and avoids product sprawl.

## 6. Phase plan

## Phase 1 — Complete FounderDashboardView integration

**Status: in progress**

This is the first phase and should be treated as the prove-first product surface.

### Exact implementation goals

- add packet state/history hooks and auto-generate initial weekly reset on first load
- mount `ArtifactPacketPanel` between `WhatChangedPanel` and `RankedInterventions`
- wire packet generation handlers using shared `buildFounderPacketSource`
- update `WhatChangedPanel` to use shared `buildFounderChangeFeed`
- lift `agentStatusOverrides` to the main view so both `AgentActivityPanel` and packet generation see the same state

### Why this phase matters

This phase makes the dashboard stop being a collection of cards and become one coherent founder clarity pipeline.

## Phase 2 — Artifact packet generation and export surfaces

### Goal

Make the packet a first-class typed product object, not a transient UI blob.

### Required outputs

- copy packet
- export memo / markdown
- export HTML brief
- hand packet to agent

## Phase 3 — Context intake and first-run onboarding

### Goal

Let the founder drop in messy material without setup friction.

### Inputs

- pasted notes
- uploaded docs
- links
- screenshots
- agent outputs
- prior local records

## Phase 4 — History and important-change review

### Goal

Make continuity visible and reusable.

### Functions

- compare current snapshot vs previous snapshot
- view prior operating memos
- reopen and refresh prior packet
- view important changes
- detect drift / contradiction changes

## Phase 5 — Agent handoff and FastAgentPanel

### Goal

The packet feeds the agent. The agent does not replace the packet.

### Rule

FastAgentPanel is downstream of truth.

## Phase 6 — Nearby entities and comparables

### Constraint

Keep this narrow in v1.

Allowed:
- company itself
- products
- initiatives
- top 3-5 competitors / comparables
- optional 1-2 partners/customers

This is supportive context, not a graph explorer.

## 7. Product surfaces and information architecture

### Surface 1 — Open NodeBench MCP CLI

Purpose: distribution into builder and agent-native workflows.

Core value:
- local founder/company canonicalization tools
- entity/context/evidence tools
- packet-aware context for downstream agents

### Surface 1.5 — Local Mirror Dashboard

Principle: the local dashboard should share the same routes, major cards, navigation vocabulary, and founder mental model as the cloud app. Only the data source changes.

### Surface 2 — Web and mobile app

The web/mobile app should preserve the same flow:

```text
Intake -> Overview -> Packet -> History -> Agent handoff
```

### Full desktop information architecture

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR                                                                     │
│ Dashboard                                                                   │
│ Intake                                                                      │
│ Artifact Packets                                                            │
│ History                                                                     │
│ Agents                                                                      │
│ Nearby Entities                                                             │
│ Settings                                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ TOP BAR                                                                     │
│ Workspace | Company | Mode | Privacy Tier | Sync Status                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ MAIN CANVAS                                                                 │
│ Founder Clarity Overview / Packet / History / Agents / Intake               │
├──────────────────────────────────────────────────────────────────────────────┤
│ RIGHT RAIL                                                                  │
│ Evidence Preview | Packet Actions | Important Change Alerts                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Full mobile information architecture

```text
┌──────────────────────────────┐
│ TOP                          │
│ Company / Mode / Alerts      │
├──────────────────────────────┤
│ TABS                         │
│ Overview | Packet | History  │
│ Agents  | Intake             │
├──────────────────────────────┤
│ MAIN FEED                    │
│ card-based stacked layout    │
├──────────────────────────────┤
│ BOTTOM ACTION BAR            │
│ Refresh | Export | Brief     │
└──────────────────────────────┘
```

Mobile should not try to mirror desktop density. It should preserve the same mental model with stacked cards and fast actions.

## 8. Artifact Packet as the product center of gravity

The packet is the structured layer between operating memory and downstream renderers.

Canonical packet fields:
- `packetId`
- `packetType`
- `audience`
- `objective`
- `canonicalEntity`
- `nearbyEntities`
- `whatChanged`
- `contradictions`
- `risks`
- `keyEvidence`
- `operatingMemo`
- `nextActions`
- `recommendedFraming`
- `tablesNeeded`
- `visualsSuggested`
- `provenance`
- `agentInstructions`

Renderer order:
1. open the Artifact Packet
2. export memo / HTML brief
3. show how an agent consumes the packet

This order must not be reversed.

## 9. Visual design language

### Desktop

- dense but readable
- 3-column overview
- cards with clear semantic hierarchy
- contradiction card visually prominent
- packet panel should feel reviewable and reusable, not like chat
- right rail for evidence and packet actions

### Mobile

- stacked cards
- top summary first
- packet and export actions reachable in one thumb zone
- important-change review should feel like a diff feed
- agent handoff should be one compact action block

### Visual priority

```text
Truth
-> Change
-> Contradiction
-> Next moves
-> Packet
-> Agent
-> History
```

Never reverse that order.

## 10. Success metrics

### Product utility
- time to first useful founder clarity overview
- time to first reusable Artifact Packet
- weekly reset retention
- pre-delegation packet usage
- important-change review usage
- export-to-agent handoff completion rate

### Quality thresholds
- `relativeUplift >= 0.03`
- `evidenceLinkage >= 0.75`
- `receiptCompleteness >= 0.80`

### Local-first adoption
- CLI installs
- local mirror dashboard activations
- % of users who remain local only
- % of users who later enable private sync

### Business
- local -> cloud conversion rate
- sync/history subscription conversion
- team workspace adoption

## 11. Anti-patterns and deferrals

Do not build first:
- a generic command-center story
- public directory as the core wedge
- workflow registry before the founder loop is useful
- broad role overlays as the primary launch story
- giant entity relationship explorer
- chat-heavy cockpit UX
- deck generation as the only export path

## 12. Competitive positioning

Adjacent players validate that MCP-native agent infrastructure, AI-assisted research, compliance workflows, and company intelligence all have real demand.

NodeBench should sit beneath and between those categories as:
- memory
- context
- evidence
- contradiction detection
- reusable packets
- local/cloud continuity

If a category already has a leader, NodeBench should become the foundational substrate that leader itself would want to consume.

## 13. Canonical demo order

```text
1. Drop in messy founder/company material
2. Show Founder Clarity Overview
3. Show Artifact Packet
4. Export memo / HTML brief
5. Hand packet to agent
6. Show packet history / important change review
```

That is the cleanest demo arc and matches the proof-first blueprint.

## 14. Final implementation instruction

Build NodeBench first as a local-first founder clarity system that produces reusable Artifact Packets for humans and agents, and only expand into broader entity, workflow, or presentation surfaces after the weekly reset, pre-delegation briefing, and important-change review flows prove habitual value.

## Source support

1. [Anthropic — Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)
2. [Anthropic — Donating the MCP and establishing the Agentic AI Foundation](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation)
3. [Linux Foundation — Formation of the Agentic AI Foundation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
4. [Anthropic Engineering — Desktop Extensions](https://www.anthropic.com/engineering/desktop-extensions)
5. [OpenAI — Rogo scales AI-driven financial research with o1](https://openai.com/index/rogo/)
6. [Sphinx — Raises $7.1M for AI compliance analysts](https://sphinxhq.com/blog-posts/sphinx-raises-7-1m-to-build-every-financial-institutions-last-compliance-hire)
7. [Morgan Stanley — AI @ Morgan Stanley Debrief launch](https://www.morganstanley.com/press-releases/ai-at-morgan-stanley-debrief-launch)
8. [Bloomberg — Bloomberg embraces MCP](https://www.bloomberg.com/company/stories/closing-the-agentic-ai-productionization-gap-bloomberg-embraces-mcp/)
9. [Crunchbase Pro product page](https://about.crunchbase.com/products/crunchbase-pro)
