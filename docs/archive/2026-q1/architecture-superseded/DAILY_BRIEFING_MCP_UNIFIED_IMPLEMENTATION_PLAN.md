# Daily Briefing + MCP Unified Implementation Plan
**Date:** 2026-01-03  
**Status:** Implementation Plan + In-Repo Implementation  
**Goal:** Make the Daily Briefing system reliable, observable, and resumable by using the existing MCP plan/memory substrate and completing the remaining broken/missing foundations.

---

## Why unify with MCP?

We already have a durable, cloud-reachable persistence substrate:

- **Plans**: `mcpPlans` table + HTTP API (`/api/mcpPlans*`, gated by `x-mcp-secret` == `MCP_SECRET`)
- **Memory**: `mcpMemoryEntries` table + HTTP API (`/api/mcpMemory*`, gated by `x-mcp-secret` == `MCP_SECRET`)
- **External enrichment**:
  - OpenBB actions (`convex/actions/openbbActions.ts`)
  - Research actions (`convex/actions/researchMcpActions.ts`)

This plan layers Daily Briefing enhancements on top of MCP so:
- every run has a **durable plan** (what should happen),
- every step writes **artifacts to memory** (what actually happened),
- any failure is diagnosable and resumable.

---

## Success criteria (acceptance)

- Timeline creation never calls `createForDocument` with `documentId: undefined`; timeline is keyed by `agentThreadId`.
- A public `#signals` route exists and shows day-based entries from `landingPageLog`.
- Task tracker state persists across cold starts (no in-memory global state dependence).
- When prompt/context exceeds 80% of context window, compaction is automatically triggered and logged.
- Daily morning brief automatically appends a `landingPageLog` entry and links to `#signals`.
- Model routing supports fallback chains and unlimited-small-model usage.
- Dossier/Calendar/Spreadsheet CRUD tools are available on `CoordinatorAgent`.
- Repo passes:
  - `npx tsc -p convex -noEmit`
  - `npm run test:run`

---

## MCP Status overview (reachability + persistence)

| ID | Task | Status |
|----|------|--------|
| mcp-1 | Core Agent MCP server cloud-ready | Implemented |
| mcp-2 | Convex MCP client + SDK transport updates | Implemented |
| mcp-3 | Convex HTTP endpoints for plan/memory persistence | Implemented |
| mcp-4 | OpenBB REST actions (cloud-ready) | Implemented |
| mcp-5 | Research REST actions + hardcoded URL removal | Implemented |

## Architecture: unified state + IO

### Durable state

| Concern | Primary Store | Keying |
|--------|---------------|--------|
| Brief pipeline plan | `mcpPlans` | `brief:<YYYY-MM-DD>` or `brief:<runId>` |
| Pipeline artifacts | `mcpMemoryEntries` | `brief:<YYYY-MM-DD>:<artifactName>` |
| Public landing log | `landingPageLog` | `day` + `createdAt` |
| Task tracker state | `mcpMemoryEntries` (or `agentTasks`) | `taskTracker:<agentThreadId>` |

### IO

- Convex ↔ Core Agent MCP uses JSON-RPC tool calls via `mcpClient.ts`
- Core Agent MCP ↔ Convex persistence uses `/api/mcpPlans*` and `/api/mcpMemory*` with `x-mcp-secret`
- Convex ↔ OpenBB/Research uses internal actions wrapping HTTPS endpoints

---

## Implementation phases (single integrated plan)

### Phase 1 — Fix foundations (unblocks correctness)

1. **Timeline creation fix**
   - Add `ensureForThread` mutation in `convex/domains/agents/agentTimelines.ts` keyed by `agentThreadId`.
   - Replace invalid timeline creation call site in `convex/domains/agents/fastAgentPanelStreaming.ts` to use `ensureForThread`.

2. **Task tracker persistence**
   - Replace in-memory `currentState` in `convex/domains/agents/mcp_tools/tracking/taskTrackerTool.ts` with Convex persistence (prefer MCP memory keyed by thread).

3. **80% auto-compaction**
   - Add token estimation in `fastAgentPanelStreaming.ts`.
   - When over threshold, invoke compaction automatically and write pre/post artifacts to `mcpMemoryEntries`.

### Phase 2 — Landing log + public signals UI (unblocks visibility)

4. **Schema: landingPageLog**
   - Add `landingPageLog` table to `convex/schema.ts` with indexes:
     - `by_createdAt`, `by_day_createdAt`, `by_anon_day_createdAt`, `by_agent_thread`

5. **Landing log module**
   - Create `convex/domains/landing/landingPageLog.ts`:
     - `listPublic(day)` (public query)
     - `appendFromUser` (auth)
     - `appendFromAnonymous` (anonymous, rate-limited)
     - `appendSystem` (internal mutation for crons/workflows)

6. **Public UI route**
   - Add `src/features/research/views/PublicSignalsLog.tsx`
   - Wire to `#signals` in `src/components/MainLayout.tsx`

### Phase 3 — Model routing reliability (unblocks production robustness)

7. **Fallback chain resolver**
   - Add fallback chains + resolver functions in `shared/llm/modelCatalog.ts`

8. **Unlimited small model usage**
   - Update `convex/domains/billing/rateLimiting.ts` to treat select small models as unlimited

9. **Automatic fallback on rate limits**
   - Update retry loop in `fastAgentPanelStreaming.ts` to swap models using fallback chains when rate-limited

### Phase 4 — Morning brief upgrades (makes it “feel done”)

10. **Auto-append brief to landing log**
   - Update `convex/workflows/dailyMorningBrief.ts` to append a `landingPageLog` entry after brief generation.

11. **Better notifications**
   - Update `convex/workflows/dailyMorningBrief.ts` notification formatting:
     - top 3 signals preview
     - link to `#signals`

12. **Fast Agent Panel integration**
   - Add a “Signals” quick-link/button in `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx`

### Phase 5 ƒ?" CRUD tools for Dossier/Calendar/Spreadsheet

13. **Dossier CRUD tools**
   - Add `convex/tools/dossier/dossierCrudTools.ts`
     - `createDossier`, `updateDossier`, `deleteDossier`, `listDossiers`
   - Add `createDossier` mutation in `convex/domains/documents/documents.ts`

14. **Calendar CRUD tools**
   - Add `convex/tools/calendar/calendarCrudTools.ts`
     - `createEvent`, `updateEvent`, `deleteEvent`, `listEvents`

15. **Spreadsheet CRUD tools**
   - Add `convex/tools/spreadsheet/spreadsheetCrudTools.ts`
     - `createSpreadsheet`, `listSpreadsheets`, `setCell`, `clearCell`, `setRange`, `insertRow`, `deleteRow`, `getSpreadsheet`
   - Add `listSheets`, `insertRow`, `deleteRow` in `convex/domains/integrations/spreadsheets.ts`

16. **Register CRUD tools in Coordinator**
   - Update `convex/domains/agents/core/coordinatorAgent.ts` to add:
     - `...dossierCrudTools`, `...calendarCrudTools`, `...spreadsheetCrudTools`

---

## Environment variables (Convex Cloud)

These must already be set for MCP reachability; Daily Briefing uses them indirectly:

- `MCP_SECRET` (required for `/api/mcpPlans*` + `/api/mcpMemory*`)
- `CORE_AGENT_MCP_SERVER_URL`, `CORE_AGENT_MCP_AUTH_TOKEN` (for MCP tool calls)
- `OPENBB_MCP_SERVER_URL`, `OPENBB_API_KEY` (OpenBB)
- `RESEARCH_MCP_SERVER_URL`, `RESEARCH_API_KEY` (Research)

---

## Verification checklist (post-implementation)

- [x] `ensureForThread` used everywhere timelines are created
- [x] `#signals` renders public entries for a day
- [x] `landingPageLog.appendSystem` called from morning brief workflow
- [x] task tracker state persists across cold start
- [x] compaction auto-triggers at 80% and writes artifacts
- [x] Dossier/Calendar/Spreadsheet CRUD tools registered on Coordinator
- [x] `npx tsc -p convex -noEmit` / `npx tsc -p . -noEmit` pass
- [x] `npm run test:run` passes
