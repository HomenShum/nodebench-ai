# NodeBench Founder Platform — Engineering PRD

**Date:** March 23, 2026
**Version:** v0.2
**Status:** Canonical founder-platform engineering PRD

## 0. Product rule

This PRD exists to implement the prove-first founder product described in `docs/architecture/NODEBENCH_MASTER_STRATEGY_PRD.md`.

The founder platform must reinforce this exact sequence:

```text
messy context
-> canonical company truth
-> change / contradiction detection
-> ranked interpretation
-> Artifact Packet
-> memo / doc / HTML brief
-> handoff to agent
```

The first founder product should not optimize for generic chat, broad workflow execution, or giant entity exploration before this loop is habitual.

## 1. Executive summary

NodeBench founder mode is a local-first founder clarity system that turns messy operating context into reusable Artifact Packets for humans and agents.

The first job of the founder platform is not to help the founder "chat with AI." It is to help the founder:
- see what company they are actually building
- see what changed
- see the biggest contradiction
- see the next 3 moves
- generate a reusable packet and hand it to an agent only after truth is clear

## 2. Existing codebase anchors to reuse

These repo surfaces already exist and should anchor implementation rather than be reinvented:

- `src/features/founder/views/FounderDashboardView.tsx`
  - renders the current founder operating surface
  - already contains `buildFounderChangeFeed`
  - already contains `buildFounderPacketSource`
  - already auto-generates an initial weekly reset packet on first load
- `src/features/founder/components/ArtifactPacketPanel.tsx`
  - packet review UI
  - packet history UI
  - action affordances for copy/export/handoff patterns
- `src/features/founder/types/artifactPacket.ts`
  - canonical `FounderArtifactPacket` schema
  - defines `ArtifactPacketType = "weekly_reset" | "pre_delegation" | "important_change"`
- `src/features/founder/lib/artifactPacket.ts`
  - packet builder and typed derivation logic
  - labels/objectives/audiences by packet mode
- `src/features/founder/lib/founderPacketEngine.ts`
  - shared helper layer for the founder packet pipeline
  - intended center of gravity for packet-oriented founder flows
- `convex/domains/founder/operations.ts`
  - backend founder summary/query anchor for future non-demo dashboard state

## 3. Primary user modes

All founder surfaces should flow through the same packet logic, with mode-specific labels and objectives.

### 3.1 Weekly reset

Purpose: re-establish what company the founder is building, what changed this week, and the next three actions that matter most.

### 3.2 Pre-delegation briefing

Purpose: package the current business truth so a connected agent can execute without rediscovering the story from scratch.

### 3.3 Important-change review

Purpose: assess a material change, surface the contradiction it creates, and compress the response into a decision-ready packet.

## 4. Founder clarity overview

### Product contract

When `/founder` opens, the founder should not land on chat first. They should see above the fold:

```text
1. What company you are actually building
2. What changed
3. Biggest contradiction
4. Next 3 moves
```

### Current dashboard anchor

`FounderDashboardView.tsx` already renders these core blocks in practice:
- `CompanyIdentityCard`
- `WhatChangedPanel`
- `ArtifactPacketPanel`
- `RankedInterventions`
- `InitiativesGrid`
- `AgentActivityPanel`
- `DailyMemoCard`

Engineering direction: preserve these anchors, but make the overall page read as one clarity pipeline rather than a loose set of cards.

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

## 5. End-to-end founder flow

```text
User pastes messy notes / uploads docs
-> NodeBench normalizes context
-> canonical company truth is resolved
-> changes and contradictions are detected
-> Founder Clarity Overview renders
-> Artifact Packet is generated or refreshed
-> memo / HTML brief is exported if needed
-> packet is handed to agent if needed
-> history is preserved for later review
```

## 6. Primary surfaces

### 6.1 Context Intake

Purpose: accept messy founder/company context without asking the user to pre-structure it.

Inputs:
- pasted notes
- uploaded docs
- links
- screenshots
- agent outputs
- prior local records

Optional scope controls:
- top 3-5 competitors / comparables
- 1-2 partners or customers

### 6.2 Founder Dashboard (`/founder`)

Purpose: deliver the 5-second wow and maintain the live founder clarity overview.

Required outputs:
- canonical company truth
- what changed
- biggest contradiction
- next 3 moves
- packet status / packet history

### 6.3 Artifact Packet Review

Purpose: show the reusable structured output for humans and agents.

Required sections:
- audience
- objective
- canonical company
- nearby entities
- what changed
- contradictions / risks
- key evidence
- operating memo
- next actions
- recommended framing
- tables needed
- suggested visuals
- provenance
- agent instructions

Required actions:
- copy packet
- export memo / markdown
- export HTML brief
- hand packet to agent

### 6.4 History and important-change review

Purpose: make continuity visible and reusable.

Required functions:
- compare current snapshot vs previous snapshot
- reopen and refresh prior packet
- review prior operating memos
- inspect important changes
- detect contradiction drift over time

### 6.5 Agent handoff

Purpose: make FastAgentPanel downstream of structured truth.

Rule: the packet feeds the agent. The agent does not replace the packet.

## 7. Artifact Packet contract

The typed contract in `src/features/founder/types/artifactPacket.ts` is canonical for founder packet structure.

### Current fields

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

### Engineering rule

Do not invent an untyped founder packet blob. All dashboard, export, and agent-handoff flows should build from the typed packet contract.

## 8. Shared helper model

The shared helper model should be standardized around the existing packet pipeline anchors.

### Current anchor helpers

- `buildFounderChangeFeed(...)`
- `buildFounderPacketSource(...)`
- `buildFounderArtifactPacket(...)`

### Canonical source shape

The packet source should consistently combine:
- canonical company truth
- founder change feed
- ranked interventions / next actions
- agent status and overrides
- daily memo / unresolved items
- nearby entities
- evidence references

## 9. Phase 1 implementation plan

### Goal

Turn `FounderDashboardView` into one coherent founder clarity pipeline.

### Exact implementation goals

- add packet state/history hooks and ensure initial weekly reset auto-generation on first load remains intact
- keep `ArtifactPacketPanel` mounted between `WhatChangedPanel` and `RankedInterventions`
- use shared `buildFounderPacketSource` for packet generation handlers
- use shared `buildFounderChangeFeed` for the change feed instead of duplicative local derivation
- lift `agentStatusOverrides` so both `AgentActivityPanel` and packet generation read the same source of truth

### Expected dashboard composition

```text
FounderDashboardView
  CompanyIdentityCard
  WhatChangedPanel
  ArtifactPacketPanel
  RankedInterventions
  InitiativesGrid
  AgentActivityPanel
  DailyMemoCard
```

## 10. Phase 2-6 engineering roadmap

### Phase 2 — Packet generation and export

- formalize packet actions for copy/export/handoff
- keep packet review reusable across weekly reset, pre-delegation, and important-change modes
- ensure export outputs preserve packet semantics and provenance

### Phase 3 — Context intake and first-run onboarding

- implement low-friction intake for notes, files, links, and screenshots
- preserve company identity resolution paths: start new, continue existing, merge prior work
- generate the initial weekly reset packet from intake output

### Phase 4 — History and important-change review

- snapshot current vs prior packet state
- show what changed, what resolved, and what newly contradicted prior assumptions
- allow packet refresh from history

### Phase 5 — Agent handoff and FastAgentPanel integration

- attach the active packet to FastAgentPanel sessions
- expose canonical truth, changes, contradictions, next actions, evidence, and constraints to the agent
- preserve a reusable briefing artifact after handoff

### Phase 6 — Nearby entities and comparables

- keep nearby entities narrow in v1
- allowed set: company, products, initiatives, top 3-5 competitors/comparables, optional 1-2 partners/customers
- do not expand into a broad graph explorer before the founder loop proves value

## 11. Desktop and mobile IA

### Desktop

```text
Sidebar: Dashboard | Intake | Artifact Packets | History | Agents | Nearby Entities | Settings
Top bar: Company | Mode | Privacy Tier | Sync Status
Main canvas: Overview / Packet / History / Intake
Right rail: Evidence | Packet actions | Important change alerts
```

### Mobile

```text
Top: Company / Mode / Alerts
Tabs: Overview | Packet | History | Agents | Intake
Bottom action bar: Refresh | Export | Brief
```

Mobile should preserve the same mental model with stacked cards rather than desktop density.

## 12. Success metrics

- % of users reaching a Founder Clarity Overview from messy context
- time to first reusable packet
- weekly reset retention
- pre-delegation briefing usage
- important-change review usage
- packet export rate
- packet-to-agent handoff rate
- mean time to regain context on return

## 13. Anti-patterns

- do not make founder mode chat-first
- do not put the agent before the packet
- do not make nearby entities the main story in v1
- do not treat the dashboard as disconnected cards
- do not create separate persistence models per surface when one typed packet can anchor them
- do not expand into broad workflow registry or role-overlay complexity before the founder loop is habitual
