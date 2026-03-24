# Developer Codebase Map

## Purpose

This is the current-state map of the repo after the persistent cockpit consolidation.

Use this first if you are new to the codebase. It explains:

- what is canonical now
- what is legacy compatibility code
- where to start for active product work
- which directories matter most

This document is grounded in the repo as it exists today. It is not a speculative future tree.

## Canonical Product Shape

NodeBench now has one active application shell:

- `src/layouts/CockpitLayout.tsx`

Deep-agent reference pattern:

- `docs/agents/OPENCLAW_ARCHITECTURE.md`

Use this distinction:

- product/runtime truth = code under `src/`, `convex/`, and `packages/`
- deep-agent target pattern = `docs/agents/OPENCLAW_ARCHITECTURE.md`

Canonical runtime model:

- root route: `/`
- deep-link state: `?surface=...&entity=...&run=...&doc=...&workspace=...`
- shell regions:
  - top: `StatusStrip`
  - left: `WorkspaceRail`
  - center: `ActiveSurfaceHost`
  - right: `AgentPresenceRail`
  - bottom: `TraceStrip`

## Start Here

### Frontend runtime

- `src/App.tsx`
- `src/layouts/CockpitLayout.tsx`
- `src/layouts/ActiveSurfaceHost.tsx`
- `src/hooks/useCockpitRouting.ts`
- `src/layouts/useCockpitMode.ts`
- `src/lib/registry/viewRegistry.ts`

### Frontend product surfaces

- `src/features/controlPlane/`
- `src/features/deepSim/`
- `src/features/research/`
- `src/features/documents/`
- `src/features/agents/`
- `src/features/oracle/`
- `src/features/trajectory/`
- `src/features/successLoops/`
- `src/features/benchmarks/`
- `src/features/strategy/`

### Convex backend

- `convex/schema.ts`
- `convex/crons.ts`
- `convex/domains/trajectory/`
- `convex/domains/successLoops/`
- `convex/domains/operations/`
- `convex/domains/agents/`
- `convex/domains/research/`
- `convex/domains/temporal/`
- `convex/domains/oracle/`
- `convex/domains/mcp/`

### Local MCP / tool execution

- `packages/mcp-local/src/index.ts`
- `packages/mcp-local/src/toolsetRegistry.ts`
- `packages/mcp-local/src/tools/`

## Current Repo Reality

Primary top-level roots:

- `src/` — frontend app
- `convex/` — backend domain logic
- `packages/` — MCP and supporting packages
- `docs/architecture/` — system specs and state docs
- `tests/` — E2E and integration
- `scripts/` — dogfood, build, QA, automation

Current sprawl still exists:

- `src/features/` is broad and uneven
- `convex/domains/` is highly fragmented
- legacy shell code still exists for compatibility
- architecture docs are numerous and vary in freshness

## Canonical vs Legacy

### Canonical frontend shell modules

- `src/layouts/CockpitLayout.tsx`
- `src/layouts/ActiveSurfaceHost.tsx`
- `src/layouts/WorkspaceRail.tsx`
- `src/layouts/AgentPresenceRail.tsx`
- `src/layouts/TraceStrip.tsx`
- `src/lib/registry/viewRegistry.ts`

### Legacy compatibility modules

These still exist, but they are not the active product architecture:

- `src/components/MainLayout.tsx`
- `src/layouts/FocalArea.tsx`
- `src/layouts/ModeRail.tsx`
- `src/layouts/CockpitIntelRail.tsx`
- `src/components/CleanSidebar.tsx`
- `src/components/SidebarGlobalNav.tsx`

Treat them as compatibility or audit surfaces, not the place to extend the main product.

## Frontend Structure

### `src/layouts/`

Canonical:

- `CockpitLayout.tsx`
- `ActiveSurfaceHost.tsx`
- `WorkspaceRail.tsx`
- `AgentPresenceRail.tsx`
- `TraceStrip.tsx`
- `StatusStrip.tsx`
- `CommandBar.tsx`
- `chrome/QuickCaptureWidget.tsx`
- `chrome/CommandPalette.tsx`
- `chrome/AgentMetadata.tsx`
- `chrome/HashtagQuickNotePopover.tsx`
- `useCockpitMode.ts`
- `cockpitModes.ts`
- `src/shared/components/ErrorBoundary.tsx` for shared crash containment

Historical but still present:

- `FocalArea.tsx`
- `ModeRail.tsx`
- `CockpitIntelRail.tsx`

### `src/features/`

Think of this in three buckets.

Active cockpit surfaces:

- `controlPlane`
- `deepSim`
- `research`
- `documents`
- `agents`
- `oracle`
- `benchmarks`
- `strategy`

Shared intelligence layers:

- `trajectory`
- `successLoops`
- `evaluation`
- `investigation`
- `monitoring`

Smaller or isolated slices:

- `calendar`
- `analytics`
- `dogfood`
- `mcp`
- `social`
- `settings`
- `onboarding`
- `engine`
- `devDashboard`

### `src/components/`

This directory is still overloaded. New work should prefer:

- `src/layouts/` for shell chrome
- `src/layouts/chrome/` for cockpit-owned shell support
- `src/features/*/components/` for feature-owned UI
- `src/shared/components/` or `src/shared/ui/` for reusable primitives

Examples of now-canonical homes:

- shared infrastructure: `src/shared/components/ErrorBoundary.tsx`
- shared accessibility chrome: `src/shared/components/SkipLinks.tsx`
- shared live-announcement helper: `src/shared/components/LiveRegion.tsx`
- shared animation helpers: `src/shared/components/AnimatedComponents.tsx`
- shared empty-state primitives: `src/shared/components/EmptyStates.tsx`
- shared context/breadcrumb helpers: `src/shared/components/ContextPills.tsx`, `src/shared/components/ViewBreadcrumbs.tsx`
- cockpit quick capture: `src/layouts/chrome/QuickCaptureWidget.tsx`
- document-filter toolbar: `src/features/documents/components/FiltersToolsBar.tsx`
- FastAgent token usage badge: `src/features/agents/components/FastAgentPanel/TokenUsageBadge.tsx`
- telemetry/admin surface implementations: `src/features/admin/components/CostDashboard.tsx`

`src/components/` still contains:

- old shell pieces, now mostly isolated under `src/components/legacy/`
- reusable widgets
- one-off dashboards
- a small number of root compatibility stubs
- settings and assorted app-level widgets

This is a cleanup target, not the ideal destination for new code.

## Convex Structure

`convex/domains/` is still too fragmented to be intuitive in one pass.

Practical grouping:

### Core product intelligence

- `agents`
- `trajectory`
- `successLoops`
- `temporal`
- `oracle`
- `research`
- `eval`
- `evaluation`

### Product surfaces and content

- `documents`
- `narrative`
- `social`
- `search`
- `world`
- `financial`

### Operations and internals

- `operations`
- `monitoring`
- `observability`
- `telemetry`
- `governance`
- `verification`
- `testing`
- `mcp`

### Eventual fold candidates

Examples of narrow domains likely to be merged over time:

- `blips`
- `landing`
- `operatorProfile`
- `quickCapture`
- `teachability`
- `canonicalization`
- `channels`
- `encounters`

## MCP Structure

`packages/mcp-local` is operationally important but visually flat.

Start with:

- `packages/mcp-local/src/index.ts`
- `packages/mcp-local/src/toolsetRegistry.ts`
- `packages/mcp-local/src/tools/toolRegistry.ts`

Current pain point:

- `packages/mcp-local/src/tools/` is still wide and domain-mixed

That should eventually be grouped physically, but not via one risky rename wave.

## What To Ignore At First

Do not try to understand the whole repo in one pass.

You can usually ignore on day 1:

- old page-first shell files
- most internal-only dashboards
- historic timeline JSON and generated dogfood artifacts
- most docs outside `docs/architecture/`
- low-level MCP eval fixtures unless you are working on MCP or benchmarking

## Recommended Entry Paths By Task

### Routing or navigation

- `src/lib/registry/viewRegistry.ts`
- `src/hooks/useCockpitRouting.ts`
- `src/layouts/useCockpitMode.ts`
- `src/layouts/CockpitLayout.tsx`

### Main product UX

- `src/layouts/CockpitLayout.tsx`
- `src/layouts/ActiveSurfaceHost.tsx`
- target feature under `src/features/*`
- `src/shared/components/ErrorBoundary.tsx`

### Agent shell / presence

- `src/layouts/WorkspaceRail.tsx`
- `src/layouts/AgentPresenceRail.tsx`
- `src/layouts/TraceStrip.tsx`
- `src/layouts/StatusStrip.tsx`

### Deep Sim / memo / HCSN

- `src/features/deepSim/`
- `docs/architecture/DEEP_SIM_PRODUCT_SPEC.md`
- `docs/architecture/HCSN_ARCHITECTURE.md`

### Oracle / trajectory / success loops

- `src/features/oracle/`
- `src/features/trajectory/`
- `src/features/successLoops/`
- `convex/domains/trajectory/`
- `convex/domains/successLoops/`
- `ORACLE_STATE.md`

### Agent backend / Convex

- `convex/domains/agents/`
- `convex/domains/operations/`
- `convex/domains/mcp/`
- `convex/crons.ts`
- `docs/agents/OPENCLAW_ARCHITECTURE.md` for the target deep-agent pattern

## Phased Cleanup Plan

Do not try to reorganize everything in one shot.

### Phase 1: Make the active architecture unmistakable

- cockpit is the only active shell
- remove visible classic-layout affordances
- keep routing and registry cockpit-first
- mark legacy shell files as compatibility-only

### Phase 2: Reduce frontend ambiguity

- move new shared primitives out of `src/components/`
- keep shell in `src/layouts/`
- keep reusable primitives in `src/shared/`
- stop adding new generic files to `src/components/`

### Phase 3: Fold narrow frontend slices

Examples:

- fold spreadsheet-specific route wrappers under `documents`
- fold telemetry-only wrappers under `oracle` or `monitoring`
- fold tiny isolated views into their parent feature

### Phase 4: Fold narrow Convex domains

Start with small islands and merge them into:

- `operations`
- `research`
- `agents`
- `documents`
- `governance`

### Phase 5: Group MCP tools by domain

- keep public tool names stable
- group implementation files physically
- avoid breaking the existing registry contract

## Rules For New Work

- Extend the cockpit. Do not build a second shell.
- Prefer active feature roots over creating new top-level directories.
- Do not add new cross-cutting UI to `src/components/` unless it is truly app-global.
- If a module exists only for compatibility, say so in the file header.
- Update `ORACLE_STATE.md` when Oracle- or cockpit-facing behavior changes.

## Verification Standard

For full-stack changes touching the active shell:

- `npx tsc --noEmit`
- `npm run build`
- `npm run dogfood:traverse`
- targeted tests where relevant
- if Convex behavior is involved, cross-check current Convex codegen or function shape and report pre-existing blockers explicitly

# Developer Codebase Map

## Purpose

This is the current-state map of the repo after the persistent cockpit consolidation.

Use this first if you are new to the codebase. It explains:

- what is canonical now
- what is legacy compatibility code
- where to start for active product work
- which directories matter most

This document is grounded in the repo as it exists today. It is not a speculative future tree.

## Canonical Product Shape

NodeBench now has one active application shell:

- `src/layouts/CockpitLayout.tsx`

Deep-agent reference pattern:

- `docs/agents/OPENCLAW_ARCHITECTURE.md`

Use this distinction:

- product/runtime truth = code under `src/`, `convex/`, and `packages/`
- deep-agent target pattern = `docs/agents/OPENCLAW_ARCHITECTURE.md`

Canonical runtime model:

- root route: `/`
- deep-link state: `?surface=...&entity=...&run=...&doc=...&workspace=...`
- current user-facing surface labels: `DeepTrace`, `Decision Workbench`, `Research Hub`, `Investigation`, `Postmortem`, `Workspace`, `Entity Graph`, `Audit Trail`, and `The Oracle`
- shell regions:
  - top: `StatusStrip`
  - left: `WorkspaceRail`
  - center: `ActiveSurfaceHost`
  - right: `AgentPresenceRail`
  - bottom trace/status row: inline in `CockpitLayout`
  - bottom command chrome: `CommandBar`

## Start Here

### Frontend runtime

- `src/App.tsx`
- `src/layouts/CockpitLayout.tsx`
- `src/layouts/ActiveSurfaceHost.tsx`
- `src/hooks/useCockpitRouting.ts`
- `src/layouts/useCockpitMode.ts`
- `src/lib/registry/viewRegistry.ts`

### Frontend product surfaces

- `src/features/controlPlane/`
- `src/features/deepSim/`
- `src/features/research/`
- `src/features/documents/`
- `src/features/editor/`
- `src/features/agents/`
- `src/features/admin/`
- `src/features/narrative/`
- `src/features/oracle/`
- `src/features/trajectory/`
- `src/features/benchmarks/`
- `src/features/strategy/`

### Convex backend

- `convex/schema.ts`
- `convex/crons.ts`
- `convex/domains/trajectory/`
- `convex/domains/successLoops/`
- `convex/domains/operations/`
- `convex/domains/agents/`
- `convex/domains/research/`
- `convex/domains/temporal/`
- `convex/domains/oracle/`
- `convex/domains/mcp/`

### Local MCP / tool execution

- `packages/mcp-local/src/index.ts`
- `packages/mcp-local/src/toolsetRegistry.ts`
- `packages/mcp-local/src/tools/`

## Current Repo Reality

Primary top-level roots:

- `src/` — frontend app
- `convex/` — backend domain logic
- `packages/` — MCP and supporting packages
- `docs/architecture/` — system specs and state docs
- `tests/` — E2E and integration
- `scripts/` — dogfood, build, QA, automation

Current sprawl still exists:

- `src/features/` is broad and uneven
- `convex/domains/` is highly fragmented
- legacy shell code still exists for compatibility
- architecture docs are numerous and vary in freshness

## Canonical vs Legacy

### Canonical frontend shell modules

- `src/layouts/CockpitLayout.tsx`
- `src/layouts/ActiveSurfaceHost.tsx`
- `src/layouts/WorkspaceRail.tsx`
- `src/layouts/AgentPresenceRail.tsx`
- `src/layouts/StatusStrip.tsx`
- `src/layouts/CommandBar.tsx`
- `src/layouts/chrome/QuickCaptureWidget.tsx`
- `src/lib/registry/viewRegistry.ts`

### Legacy compatibility modules

These still exist, but they are not the active product architecture:

- `src/components/legacy/CleanHeader.tsx`
- `src/components/legacy/CleanSidebar.tsx`
- `src/components/legacy/SidebarGlobalNav.tsx`
- `src/components/legacy/TabManager.tsx`

Treat them as compatibility or audit surfaces, not the place to extend the main product.

## Frontend Structure

### `src/layouts/`

Canonical:

- `CockpitLayout.tsx`
- `ActiveSurfaceHost.tsx`
- `WorkspaceRail.tsx`
- `AgentPresenceRail.tsx`
- `StatusStrip.tsx`
- `CommandBar.tsx`
- `chrome/QuickCaptureWidget.tsx`
- `chrome/CommandPalette.tsx`
- `chrome/AgentMetadata.tsx`
- `chrome/HashtagQuickNotePopover.tsx`
- `settings/SettingsModal.tsx`
- `useCockpitMode.ts`
- `cockpitModes.ts`
- `src/shared/components/ErrorBoundary.tsx` for shared crash containment

Historical but still present:

- the main historical shell residue now lives under `src/components/legacy/`

### `src/features/`

Think of this in three buckets.

Active cockpit surfaces:

- `controlPlane`
- `deepSim`
- `research`
- `documents`
- `editor`
- `agents`
- `admin`
- `narrative`
- `oracle`
- `benchmarks`
- `strategy`

Shared intelligence layers:

- `trajectory`
- `investigation`
- `monitoring`

Smaller or isolated slices:

- `calendar`
- `devDashboard`
- `dogfood`
- `evaluation`
- `mcp`
- `missions`
- `observability`
- `onboarding`
- `engine`

### `src/components/`

This directory is still overloaded. New work should prefer:

- `src/layouts/` for shell chrome
- `src/layouts/chrome/` for cockpit-owned shell support
- `src/shared/` for reusable primitives
- `src/features/*/components/` for feature-owned UI

`src/components/` still contains:

- old shell pieces, now mostly isolated under `src/components/legacy/`
- reusable widgets
- artifacts, HUD helpers, and one-off app panels
- a small number of root compatibility stubs
- skeletons, sidebar helpers, and assorted app-level widgets

This is a cleanup target, not the ideal destination for new code.

## Convex Structure

`convex/domains/` is still too fragmented to be intuitive in one pass.

Practical grouping:

### Core product intelligence

- `agents`
- `trajectory`
- `successLoops`
- `temporal`
- `oracle`
- `research`
- `eval`
- `evaluation`

### Product surfaces and content

- `documents`
- `narrative`
- `social`
- `search`
- `world`
- `financial`

### Operations and internals

- `operations`
- `monitoring`
- `observability`
- `telemetry`
- `governance`
- `verification`
- `testing`
- `mcp`

### Eventual fold candidates

Examples of narrow domains likely to be merged over time:

- `blips`
- `landing`
- `operatorProfile`
- `quickCapture`
- `teachability`
- `canonicalization`
- `channels`
- `encounters`

## MCP Structure

`packages/mcp-local` is operationally important but visually flat.

Start with:

- `packages/mcp-local/src/index.ts`
- `packages/mcp-local/src/toolsetRegistry.ts`
- `packages/mcp-local/src/tools/toolRegistry.ts`

Current pain point:

- `packages/mcp-local/src/tools/` is still wide and domain-mixed

That should eventually be grouped physically, but not via one risky rename wave.

## What To Ignore At First

Do not try to understand the whole repo in one pass.

You can usually ignore on day 1:

- old page-first shell files
- most internal-only dashboards
- historic timeline JSON and generated dogfood artifacts
- most docs outside `docs/architecture/`
- low-level MCP eval fixtures unless you are working on MCP or benchmarking

## Recommended Entry Paths By Task

### Routing or navigation

- `src/lib/registry/viewRegistry.ts`
- `src/hooks/useCockpitRouting.ts`
- `src/layouts/useCockpitMode.ts`
- `src/layouts/CockpitLayout.tsx`

### Main product UX

- `src/layouts/CockpitLayout.tsx`
- `src/layouts/ActiveSurfaceHost.tsx`
- target feature under `src/features/*`
- `src/shared/components/ErrorBoundary.tsx`

### Agent shell / presence

- `src/layouts/WorkspaceRail.tsx`
- `src/layouts/AgentPresenceRail.tsx`
- `src/layouts/StatusStrip.tsx`
- `src/layouts/CommandBar.tsx`
- the inline bottom trace/status row inside `src/layouts/CockpitLayout.tsx`

### Deep Sim / memo / HCSN

- `src/features/deepSim/`
- `docs/architecture/DEEP_SIM_PRODUCT_SPEC.md`
- `docs/architecture/HCSN_ARCHITECTURE.md`

### Oracle / trajectory / success loops

- `src/features/oracle/`
- `src/features/trajectory/`
- `src/features/agents/components/successLoops/`
- `convex/domains/trajectory/`
- `convex/domains/successLoops/`
- `ORACLE_STATE.md`

### Agent backend / Convex

- `convex/domains/agents/`
- `convex/domains/operations/`
- `convex/domains/mcp/`
- `convex/crons.ts`
- `docs/agents/OPENCLAW_ARCHITECTURE.md` for the target deep-agent pattern

## Phased Cleanup Plan

Do not try to reorganize everything in one shot.

### Phase 1: Make the active architecture unmistakable

- cockpit is the only active shell
- remove visible classic-layout affordances
- keep routing and registry cockpit-first
- mark legacy shell files as compatibility-only

### Phase 2: Reduce frontend ambiguity

- move new shared primitives out of `src/components/`
- keep shell in `src/layouts/`
- keep reusable primitives in `src/shared/`
- stop adding new generic files to `src/components/`

### Phase 3: Fold narrow frontend slices

Examples:

- keep spreadsheet-specific route wrappers under `documents`
- keep admin analytics dashboards under `src/features/admin/`
- fold telemetry-only wrappers under `oracle` or `monitoring`
- fold tiny isolated views into their parent feature

### Phase 4: Fold narrow Convex domains

Start with small islands and merge them into:

- `operations`
- `research`
- `agents`
- `documents`
- `governance`

### Phase 5: Group MCP tools by domain

- keep public tool names stable
- group implementation files physically
- avoid breaking the existing registry contract

## Rules For New Work

- Extend the cockpit. Do not build a second shell.
- Prefer active feature roots over creating new top-level directories.
- Do not add new cross-cutting UI to `src/components/` unless it is truly app-global.
- If a module exists only for compatibility, say so in the file header.
- Update `ORACLE_STATE.md` when Oracle- or cockpit-facing behavior changes.

## Verification Standard

For full-stack changes touching the active shell:

- `npx tsc --noEmit`
- `npm run build`
- `npm run dogfood:traverse`
- targeted tests where relevant
- if Convex behavior is involved, cross-check current Convex codegen or function shape and report pre-existing blockers explicitly
