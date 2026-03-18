# NodeBench AI — Comprehensive Implementation Plan
**Date:** 2026-01-04  
**Status:** Implementation In Progress  
**Audience:** Engineering / Architecture  

## Executive Summary

This document defines a dependency-aware plan to extend NodeBench AI with:
- Distributed agent orchestration (leasing + workers)
- Unified work products (dossier ↔ docs ↔ spreadsheets ↔ tasks ↔ events ↔ sources)
- Systematic citation + source artifact pipelines
- Social intelligence ingestion (video + comments) with transcription + fact-checking
- Benchmarking harness + report generation

The codebase already contains substantial infrastructure (CoordinatorAgent, delegation, work products, evaluation) that should be leveraged rather than duplicated.

## Current State Assessment

### What Already Exists (Leverage These)

| Component | Status | Location |
|---|---:|---|
| Coordinator Agent | ✅ | `convex/domains/agents/core/coordinatorAgent.ts` |
| Subagent delegation | ✅ | `convex/domains/agents/core/delegation/` |
| Agent runs + event tables | ✅ | `agentRuns`, `agentRunEvents`, `agentWriteEvents` in `convex/schema.ts` |
| Document CRUD | ✅ | `convex/tools/document/documentTools.ts` |
| Dossier system | ✅ | `convex/tools/dossier/dossierCrudTools.ts` |
| Spreadsheet CRUD | ✅ | `convex/tools/spreadsheet/spreadsheetCrudTools.ts` |
| Tasks | ✅ | `userEvents` + tools |
| Calendar | ✅ | `events` + `calendarCrudTools.ts` |
| Evaluation framework (10 personas) | ✅ | `convex/domains/evaluation/` |
| FastAgentPanel streaming | ✅ | `convex/domains/agents/fastAgentPanelStreaming.ts` |
| MCP services | ✅ deployed | `python-mcp-servers/openbb`, `python-mcp-servers/research`, `mcp_tools/core_agent_server/` |
| Knowledge graph + entity insights | ✅ | agent tools + graph utilities |
| Funding detection | ✅ | `fundingEvents` + detection pipeline |

### What Needs Enhancement / Creation

| Component | Status | Gap |
|---|---:|---|
| Distributed queue / leasing | ⚠️ partial | Need lease protocol + heartbeat + reclaim cron |
| Source artifacts | ⚠️ partial | URL analysis exists; need unified durable snapshot table |
| Citation pipeline | ⚠️ partial | Tools exist; need systematic capture + linkage into work products |
| Instagram ingestion | ❌ | New pipeline + schema + UI |
| Gemini video transcription | ❌ | New integration + transcript schema |
| Benchmark harness | ⚠️ partial | Eval exists; needs durable benchmark tasks/runs/scores |
| Report generation | ❌ | New export scripts + publishable markdown/json |

## Workstreams

### Workstream A — MCP Deployments / Consolidation

**Target:** 3 services (openbb, research, core-agent) live with stable `/health` and Convex env pointing at them.  
**Acceptance Criteria**
- All 3 services respond `200` on `/health`
- `validate-mcp-e2e.ps1 -Mode live` passes

### Workstream B — Distributed Orchestrator (Queue + Leasing)

**Target:** multi-worker safe execution on Convex-backed leases, with reclaim + basic health tracking.

#### B1. Control Plane Data Model
- Add lease fields to `agentRuns` (optional; backwards compatible)
- Add `sourceArtifacts` table for unified snapshots
- Add `toolHealth` table for adaptive routing / circuit breaker

#### B2. Leasing Protocol
Implement mutations:
- `enqueueRun`
- `claimNextWorkItem`
- `heartbeatLease`
- `completeWorkItem`
- `failWorkItem`
- `reclaimExpiredLeases` (cron target)

**Acceptance Criteria**
- Two workers cannot claim the same run concurrently
- Expired leases reclaimed within 1 minute

#### B3. Tool Router + Adaptive Behavior
Add:
- health-aware scoring (success/fail counts, avg latency)
- circuit breaker (opens on consecutive failures)
- retry/fallback policy

**Acceptance Criteria**
- Tool failures update `toolHealth`
- Circuit breaker opens after threshold failures

### Workstream C — Unified Work Products (Linking + Citations + Revisions)

**Target:** every output artifact is linkable and verifiable via citations and/or source artifacts.

Key additions:
- `documents.linkedArtifacts` to link sheets/tasks/events/sourceArtifacts
- `documents.citations` (or block-level metadata mutation) to attach citations
- `getDocumentRevisions` query from nodes tree
- spreadsheet formula evaluation support (SUM/AVERAGE + financial helpers)

### Workstream D — Banking Opportunity Memo Workflow

**Target:** a workflow that produces a complete banker-ready package with citations:
- Dossier
- Memo document (with citations)
- Background + financial spreadsheets
- Tasks + calendar milestones

### Workstream E — Social Intelligence (Instagram Upload Mode First)

**Target:** upload video + optional comments → transcript → claims → fact-check → dossier view.

Key steps:
- schema: `mediaAssets`, `socialComments`, `videoTranscripts`, `factCheckResults`
- transcription action (Gemini)
- claim extraction + verification pipeline (Linkup + sourceArtifacts)
- UI dossier view with video + timestamp navigation + claim table + sources

### Workstream F — Fast Agent Chat Panel ↔ Orchestrator Integration

**Target:** route chat runs through leasing queue while preserving real-time UI updates.

### Workstream G — Benchmarking Harness + Reports

**Target:** durable benchmark storage and deterministic report generation.

Key tables:
- `benchmarkTasks`
- `benchmarkRuns`
- `benchmarkScores`

Add scripts:
- `scripts/generate-benchmark-report.ts` → `docs/benchmark-results.md` + `docs/benchmark-results.json`

## Execution Order (Dependency-Aware)

### Phase 1 — Foundation (Week 1)
- A: MCP health + Convex env wiring
- B1/B2: lease fields + `sourceArtifacts` + `toolHealth` + queue protocol

### Phase 2 — Core Infrastructure (Week 2)
- B3: tool router + circuit breaker
- C: link artifacts + citations + formula evaluation
- F: integrate chat panel with orchestrator queue

### Phase 3 — Workflows (Week 3)
- D: banking memo workflow + templates
- E1–E3: social ingestion backend (upload + transcription + fact-check)

### Phase 4 — Completion (Week 4)
- E4–E5: social UI + dossier chat grounding
- G: benchmark suites + automated scoring + reports
- H: documentation + publishing

## Final Ship Gates Checklist

**Infrastructure**
- Railway services green; `/health` ok
- `validate-mcp-e2e.ps1 -Mode live` passes

**Orchestrator**
- No double-execution with concurrent claims
- Lease reclaim within 1 minute
- Tool health tracking updates
- Circuit breaker opens on threshold failures

**Work products**
- Dossier links all artifacts
- Citations attach to blocks and reference `sourceArtifacts`
- Spreadsheet formulas compute

**Workflows**
- Banking memo produces full artifact bundle, with citations and idempotency
- Social dossier supports playback + transcript timestamps + claim verification

**Benchmarks**
- Tasks stored + replayable
- Scores deterministic + version comparable
- Reports exported as markdown/json

