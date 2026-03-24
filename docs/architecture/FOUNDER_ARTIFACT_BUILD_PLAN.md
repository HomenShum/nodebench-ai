# NodeBench Founder Artifact Build Plan

> End-to-end implementation plan for the proof-first founder loop.
> Last updated: 2026-03-23

## Product north star

```
NodeBench = the restructuring layer between messy operating context
and decision-ready artifacts for humans and agents
```

Core sequence:
```
messy context -> canonical company truth -> change/contradiction detection
-> ranked interpretation -> Artifact Packet -> memo/doc/HTML brief -> handoff to agent
```

## The first 5 seconds

When NodeBench opens, the founder sees above the fold:
1. What company you are actually building
2. What changed
3. Biggest contradiction
4. Next 3 moves

## Phase plan

### Phase 1 — FounderDashboardView integration (DONE)
- Rewrote dashboard as 7-section coherent clarity pipeline
- HeaderBar with mode switcher (Weekly Reset / Pre-delegation / Important Change)
- FounderClarityOverview: 3-column grid (company truth, what changed, next 3 moves)
- ContradictionBanner: severity-styled prominent card
- ArtifactPacketPanel: packet state/history/generate/export with simplified interface
- RankedInterventionsPanel: drag-and-drop with animated re-ranking + keyboard shortcuts
- AgentActivityPanel: health monitoring with lifted agentStatusOverrides
- TimelineMemoStrip: daily briefing strip
- Persisted packet snapshot and history (localStorage, max 12)
- Cross-screen nav buttons: "Add Context" (with intake count badge) + "History"

### Phase 2 — Artifact Packet typed contract + export surfaces (DONE)
- ExportArtifactPacketButton: 4 formats (copy, markdown, HTML, hand to agent) + native Share API
- ShareableMemoView: public `/memo/:id` route, no auth required, print stylesheet
- Share buttons on landing Decision Packet + Founder Dashboard interventions
- `/memo/demo` always works with pre-seeded data
- OG meta tags for social sharing

### Phase 3 — Context Intake + first-run onboarding (DONE)
- ContextIntakeView at `/founder/intake`: 5 source types (Note, Document, Link, Screenshot, Agent Output)
- Textarea input with Cmd+Enter, character count, AnimatePresence animations
- Nearby entities section: add competitors/partners/customers as chips (max 7)
- Generate CTA navigates to `/founder` dashboard
- localStorage persistence: `nodebench-context-intake`, `nodebench-intake-comparables`
- Intake entries feed into dashboard change feed via `loadIntakeEntries()`
- Intake comparables merge into packet nearbyEntities via `loadIntakeComparables()`

### Phase 4 — History + important-change review (DONE)
- HistoryView at `/founder/history`: snapshot timeline with click-to-select, auto-compare
- `diffPackets()` engine: compares whatChanged, operatingMemo, contradictions (added/resolved), actions (new), identity confidence
- Color-coded diff cards (green=added, red=removed, blue=changed)
- Selected packet detail view with memo, contradictions, actions
- Restore & Refresh, Export Timeline to markdown
- Empty state with CTA to dashboard

### Phase 5 — FastAgentPanel handoff + reusable briefing packets (DONE)
- Fixed ArtifactPacketPanel prop interface mismatch (was passing wrong prop names)
- Wired all 5 action handlers: onRefresh, onExportMarkdown, onExportHTML, onCopyPacket, onHandToAgent
- `handleHandToAgent` uses `useFastAgent().openWithContext()` to open agent panel pre-loaded with packet markdown
- Agent receives full structured context: canonical entity, contradictions, operating memo, next actions
- Export handlers generate downloadable .md and .html files via Blob URLs
- Copy handler writes packet markdown to clipboard via navigator.clipboard API

### Phase 6 — Narrow nearby entities / comparables (DONE)
- `NearbyEntitiesPanel` component with color-coded entity chips by relationship type
- 5 relationship types: product, initiative, comparable, design partner, market signal
- Merges intake comparables (from ContextIntakeView) with demo entities, user entries first, max 7
- "Add" button navigates to `/founder/intake` for adding new entities
- Tooltip on each chip shows `whyItMatters` context

### Phase 7 — Private sync / cross-device continuity (DEFERRED)
> Expand only after founder loop proves habitual value.

### Phase 8 — Role overlays, evidence viewer, trajectory intelligence (DEFERRED)
> Expand only after founder loop proves habitual value.

### Phase 9 — Spreadsheet/deck export adapters, workflow registry (DEFERRED)
> Expand only after founder loop proves habitual value.

## Completion summary

### Artifact Packet field coverage: 16/16

All PRD-specified fields render in ArtifactPacketPanel:

| Field | Rendered | Location |
|-------|----------|----------|
| packetId | ✅ | Header (copy button) |
| packetType | ✅ | Header badge |
| audience | ✅ | Pill below header |
| objective | ✅ | Pill below header |
| canonicalEntity | ✅ | Identity section (name, stage, confidence) |
| nearbyEntities | ✅ | Color-coded chips by relationship type |
| whatChanged | ✅ | Narrative paragraph + numbered items |
| contradictions | ✅ | Severity-styled cards |
| risks | ✅ | Warning-styled list |
| keyEvidence | ✅ | Source-linked evidence cards |
| operatingMemo | ✅ | Full memo section |
| nextActions | ✅ | Numbered action items |
| recommendedFraming | ✅ | Framing guidance section |
| tablesNeeded | ✅ | Table chip badges |
| visualsSuggested | ✅ | Visual chip badges |
| provenance | ✅ | Timestamp + generatedBy footer |
| agentInstructions | ✅ | Agent-scoped instruction block |

### localStorage audit: 17 keys, all balanced (read+write)

| Key | View | Purpose |
|-----|------|---------|
| nodebench-founder-packets | Dashboard, History | Packet snapshots (max 12) |
| nodebench-founder-interventions | Dashboard | Intervention states |
| nodebench-founder-streak | Dashboard | Consecutive visit tracking |
| nodebench-founder-actions | Dashboard | User action timeline |
| nodebench-founder-visit-count | Dashboard | Visit counter |
| nodebench-founder-agent-status | Dashboard | Agent health snapshots |
| nodebench-context-intake | Intake, Dashboard | Raw context entries |
| nodebench-intake-comparables | Intake, Dashboard | Comparable entities |
| nodebench-founder-company | CompanySetup | Company identity |
| nodebench-founder-initiatives | InitiativeWorkspace | Initiative list |
| nodebench-founder-memos | Export, ShareableMemo | Saved memos |
| nodebench-founder-messages | CommandPanel | Conversation threads |
| nodebench-founder-approvals | CommandPanel | Approval decisions |
| nodebench-founder-search-lens | CompanySearch | Last selected lens |
| nodebench-founder-search-output | CompanySearch | Last selected output |
| nodebench-founder-onboarding | Dashboard | Onboarding completion flag |
| nodebench-founder-mode | Dashboard | Selected operating mode |

### Supporting views: 6 files, ~4,310 lines

| View | Route | Lines | Status |
|------|-------|-------|--------|
| CompanySetupView | /founder/setup | ~520 | Production-ready |
| InitiativeWorkspaceView | /founder/initiative | ~480 | Production-ready |
| AgentOversightView | /founder/agents | ~620 | Production-ready |
| CommandPanelView | /founder/command | ~750 | Production-ready |
| CompanySearchView | /founder/search | ~400 | Production-ready |
| CompanyAnalysisView | /founder/analysis | ~580 | Production-ready |

### Integration points

- Landing page CTA: "Open Founder Dashboard" button on ControlPlaneLanding
- Agent handoff: `useFastAgent().openWithContext()` with full packet markdown
- Breadcrumb navigation: ContextIntakeView + HistoryView → Dashboard
- Auto-generate: First load triggers `weekly_reset` packet if none exists
- OG meta tags: ShareableMemoView sets title/description/image for social sharing

## Desktop information architecture

```
SIDEBAR: Dashboard | Intake | Artifact Packets | History | Agents | Nearby Entities | Settings
TOP BAR: Workspace | Company | Mode | Privacy Tier | Sync Status
MAIN CANVAS: Founder Clarity Overview / Packet / History / Agents / Intake
RIGHT RAIL: Evidence Preview | Packet Actions | Important Change Alerts
```

## Component hierarchy (current)

```
FounderDashboardViewInner (memo-wrapped)
  HeaderBar                  — mode switcher + streak + nav buttons (Add Context, History)
  FounderClarityOverview     — 3-column: company truth, what changed, next 3 moves
  ContradictionBanner        — severity-styled prominent contradiction card
  ArtifactPacketPanel        — 16/16 fields rendered, 5 action handlers wired
  RankedInterventionsPanel   — drag-and-drop + keyboard shortcuts + animated re-ranking
  AgentActivityPanel         — health monitoring (receives agentStatusOverrides)
  NearbyEntitiesPanel        — color-coded entity chips, merges intake + demo data (max 7)
  TimelineMemoStrip          — daily briefing strip

ContextIntakeView            — /founder/intake — 5 source types, nearby entities, breadcrumb nav
HistoryView                  — /founder/history — timeline, diff engine, restore, breadcrumb nav
ShareableMemoView            — /memo/:id — public, no auth, print stylesheet, OG meta
ExportArtifactPacketButton   — 4 formats + native Share API
CompanySetupView             — /founder/setup — 4-step wizard
InitiativeWorkspaceView      — /founder/initiative — initiative + agent management
AgentOversightView           — /founder/agents — runtime surface + agent modes
CommandPanelView             — /founder/command — 3-panel messaging UI
CompanySearchView            — /founder/search — lens-based analysis entry
CompanyAnalysisView          — /founder/analysis — banker/CEO/strategy/diligence output
```

## Data flow (current)

```
ContextIntakeView
  writes → localStorage (nodebench-context-intake, nodebench-intake-comparables)

FounderDashboardView
  reads ← localStorage (intake entries + comparables)
  loadIntakeEntries() → buildFounderChangeFeed() → FounderClarityOverview "What Changed"
  loadIntakeComparables() → buildFounderPacketSource() → ArtifactPacketPanel nearbyEntities
  packet generation → localStorage (nodebench-founder-packets)
  auto-generate on first load → weekly_reset packet
  handleHandToAgent → useFastAgent().openWithContext() → FastAgentPanel

HistoryView
  reads ← localStorage (nodebench-founder-packets)
  diffPackets() → color-coded diff cards
  restore → overwrites active packet in localStorage

CompanySearchView → CompanyAnalysisView
  lens + output target → URL params → analysis rendering

CommandPanelView
  reads/writes ← localStorage (messages + approvals)
  threaded conversation persistence
```

## Shared helpers

```
buildFounderPacketSource(identityConfidence, interventionStates, userActions, agentStatusOverrides)
  + loadIntakeEntries() — intake context merged into change feed
  + loadIntakeComparables() — intake comparables merged into nearbyEntities (max 7)
buildFounderChangeFeed(userActions)
buildFounderArtifactPacket({ packetType, source })
artifactPacketToMarkdown(packet)
artifactPacketToHtml(packet)
diffPackets(a, b) — whatChanged, operatingMemo, contradictions, actions, confidence
```

## Visual priority (never reverse)

```
Truth -> Change -> Contradiction -> Next moves -> Packet -> Agent -> History
```

## Canonical demo order

1. Drop in messy founder/company material
2. Show Founder Clarity Overview (5-second wow)
3. Show Artifact Packet (all 16 fields)
4. Export memo / HTML brief
5. Hand packet to agent (opens FastAgentPanel with full context)
6. Show packet history / important change review
7. Share memo via public URL (/memo/:id)
