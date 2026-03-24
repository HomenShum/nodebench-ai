# Phase 10 — Causal Memory and Trajectory Intelligence

## Purpose
Turn NodeBench from "many good surfaces" into "true compounding operating memory" by adding a canonical causal memory layer that explains how truth, packets, artifacts, and actions changed over time.

## Sub-phases

### 10A — Event Ledger (write-ahead log)
Canonical typed events for every meaningful state change. Replaces the generic `founderTimelineEvents.eventType: string` with a typed union.

**Table: `founderEventLedger`**
- Typed event union (30+ canonical types)
- Causality chain via `causedByEventId`
- Actor tracking (founder, agent, system, background_job)
- Entity polymorphism (company, initiative, packet, memo, agent, intervention)

### 10B — Path Graph
Track sequences of views, entities, agent tasks, and artifacts visited. Enable path replay, reusable exploration memory, and "what path led to this artifact."

**Table: `founderPathSteps`**
- Session-scoped ordered steps
- Entity references per step
- Duration tracking per step
- Path-to-artifact linkage

### 10C — Before/After Diff Engine
Capture state snapshots before and after significant changes. Enable "what changed" views across any entity.

**Table: `founderStateDiffs`**
- Entity-polymorphic diffs
- Structured before/after JSON
- Change classification (identity, priority, status, content, confidence)
- Triggering event reference

### 10D — Time Rollups
Comparative rollups at day/week/month/quarter/year granularity. Not just archives — active comparison views.

**Table: `founderTimeRollups`**
- Period type (daily, weekly, monthly, quarterly, yearly)
- Period key (2026-03-23, 2026-W12, 2026-03, 2026-Q1, 2026)
- Metric snapshots (initiative counts by status, intervention counts, signal volume, confidence trajectory)
- Comparison deltas vs prior period

### 10E — Packet/Memo Lineage
Version history for artifact packets and decision memos. Track what inputs, what audience, what changed.

**Table: `founderPacketVersions`**
- Version number, parent version
- Input sources (which evidence, which signals, which snapshot)
- Audience (founder, investor, agent, peer)
- Content hash for dedup
- Diff from prior version

**Table: `founderMemoVersions`**
- Same structure, for exported memos
- Export format tracking
- Share history

### 10F — Important Change Engine
Detect and surface changes that matter — not just log everything, but classify what deserves attention.

**Table: `founderImportantChanges`**
- Change type classification
- Impact score
- Affected entities
- Whether it should trigger a new packet, brief, or alert
- Resolution status

## New Convex Tables (8 total)

| # | Table | Purpose | Indexes |
|---|-------|---------|---------|
| 19 | founderEventLedger | Typed write-ahead event log | by_workspace, by_company, by_entity, by_event_type, by_caused_by |
| 20 | founderPathSteps | Session path graph | by_session, by_workspace, by_entity |
| 21 | founderStateDiffs | Before/after state diffs | by_entity, by_company, by_change_type |
| 22 | founderTimeRollups | Period-based metric rollups | by_company_period, by_period_type |
| 23 | founderPacketVersions | Artifact packet version history | by_company, by_packet_chain |
| 24 | founderMemoVersions | Decision memo version history | by_company, by_memo_chain |
| 25 | founderImportantChanges | Detected significant changes | by_company, by_status, by_impact |
| 26 | founderTrajectoryScores | Daily trajectory scoring | by_company_date |

## New Frontend Views (4)

| View | Route | Purpose |
|------|-------|---------|
| TrajectoryTimelineView | /founder/trajectory | Event ledger + path replay + before/after diffs |
| TimeRollupView | /founder/rollups | Day/week/month/quarter/year comparison dashboard |
| PacketLineageView | /founder/lineage | Packet + memo version history with diffs |
| ChangeDetectorView | /founder/changes | Important changes requiring attention |

## New Convex Operations (~30)

### Mutations
- `recordEvent` — write to event ledger
- `recordPathStep` — append path step
- `recordStateDiff` — capture before/after
- `generateTimeRollup` — compute period rollup
- `createPacketVersion` — version a packet
- `createMemoVersion` — version a memo
- `flagImportantChange` — detect and flag
- `resolveImportantChange` — mark resolved
- `recordTrajectoryScore` — daily score

### Queries
- `getEventLedger(companyId, filters)` — filtered event stream
- `getPathBySession(sessionId)` — full path replay
- `getStateDiffs(entityType, entityId)` — entity change history
- `getTimeRollup(companyId, periodType, periodKey)` — single rollup
- `compareTimeRollups(companyId, periodA, periodB)` — period comparison
- `getPacketVersions(companyId)` — version chain
- `getMemoVersions(companyId)` — version chain
- `getImportantChanges(companyId, status)` — filtered changes
- `getTrajectoryScores(companyId, range)` — score time series
- `getDashboardTrajectory(companyId)` — aggregated trajectory view

## Implementation Order
1. Schema tables (all 8) — single migration
2. Core mutations (recordEvent, recordPathStep, recordStateDiff)
3. Time rollup engine (generateTimeRollup + background job)
4. Packet/memo versioning
5. Important change detection
6. Frontend views
7. Wire into existing surfaces (dashboard, history, command panel)
