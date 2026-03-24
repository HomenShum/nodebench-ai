# Codebase Review Map

Date: 2026-03-19

Purpose:

- map the current repo before any larger directory restructure
- identify where humans are most likely to get lost
- separate canonical active architecture from historical or compatibility paths
- quantify the biggest hotspots so follow-up cleanup is based on repo reality

This is a review document, not an implementation plan.

## Executive Summary

The repo is navigable for an existing maintainer, but not yet 10x easier for a new developer.

The biggest sources of friction are:

1. too many top-level roots in the repo
2. an overloaded `src/features/` tree
3. an overloaded `convex/domains/` tree
4. a still-overloaded `src/components/` root
5. a flat `packages/mcp-local/src/tools/` directory
6. many architecture docs with mixed freshness

The good news is that the active product architecture is now clearer than the physical repo layout:

- canonical app shell is cockpit-first
- canonical route model is cockpit query-state at `/`
- shared crash handling is now truly under `src/shared/components/`
- active shell chrome is partially consolidated under `src/layouts/` and `src/layouts/chrome/`

The bad news is that the physical directory structure still lags behind that architecture.

## Repo Footprint

Top-level roots currently visible in the repo include:

- product/runtime roots: `src`, `convex`, `packages`, `apps`, `scripts`, `services`, `server`, `shared`
- documentation roots: `docs`, `plans`, `agents`, `skills`
- artifact and generated roots: `dist`, `public`, `playwright-report`, `test-results`, `screenshots`, `e2e-screenshots`, `.tmp`
- local/dev/system roots: `.claude`, `.cursor`, `.windsurf`, `.storybook`, `.vercel`, `.github`, `.serena`

This is a real source of onboarding noise. The repo looks bigger than the active product architecture actually is.

## Current Active Product Shape

Canonical frontend shell:

- `src/layouts/CockpitLayout.tsx`
- `src/layouts/ActiveSurfaceHost.tsx`
- `src/layouts/WorkspaceRail.tsx`
- `src/layouts/AgentPresenceRail.tsx`
- `src/layouts/TraceStrip.tsx`
- `src/layouts/chrome/QuickCaptureWidget.tsx`
- `src/lib/registry/viewRegistry.ts`
- `src/hooks/useCockpitRouting.ts`
- `src/layouts/useCockpitMode.ts`

Clarification:

- `src/layouts/TraceStrip.tsx` exists, but the current cockpit bottom status row is still effectively rendered inline through `CockpitLayout` rather than shipped as a fully adopted dedicated bottom-rail implementation.

Canonical route model:

- root cockpit at `/`
- state encoded via `?surface=...&entity=...&run=...&doc=...&workspace=...`
- legacy routes redirected into cockpit state

Canonical shared infra examples:

- `src/shared/components/ErrorBoundary.tsx`
- `src/layouts/chrome/*`
- feature-owned telemetry/admin implementation in `src/features/admin/components/CostDashboard.tsx`

## Frontend Inventory

Top-level `src/` counts:

- `features`: 499 files
- `components`: 85 files
- `lib`: 51 files
- `hooks`: 42 files
- `shared`: 44 files
- `layouts`: 21 files
- `test`: 27 files

Interpretation:

- `src/features` is where most active product code lives
- `src/components` is still too broad for a clean mental model
- `src/layouts` is now comparatively small and coherent
- `src/shared` is useful, but not yet the dominant home for reusable app-wide infrastructure

## Frontend Hotspots

Largest feature roots by file count:

- `research`: 145 files
- `agents`: 137 files
- `documents`: 60 files
- `editor`: 25 files
- `narrative`: 25 files
- `controlPlane`: 17 files
- `calendar`: 16 files
- `strategy`: 12 files
- `benchmarks`: 10 files

Interpretation:

- `research` and `agents` are the dominant frontend complexity centers
- `documents` is the next real hotspot
- many tiny feature roots exist that likely should be folded into parent domains over time

Small frontend slices that are likely fold candidates:

- `mcp`
- `observability`
- `dogfood`
- `engine`
- `evaluation`
- `missions`
- `successLoops`
- `trajectory`
- `social`
- `spreadsheets`

Not all of these should disappear, but many are too small to justify stand-alone discoverability for a new developer.

## `src/components/` Review

`src/components/` now has 80 recursive files, 5 direct files, and 16 subdirectories.

Largest legacy or compatibility files still reachable under that directory:

- `legacy/CleanSidebar.tsx` 513 lines
- `legacy/TabManager.tsx` 406 lines
- `legacy/SidebarGlobalNav.tsx` 188 lines
- `legacy/CleanHeader.tsx` 106 lines
- `grid-constants.ts` 45 lines

What this means:

- the root components directory still mixes legacy shell, reusable widgets, and feature-like UI
- the name `components` still implies “generic reusable UI,” but in practice it contains historical shell residue and app-specific panels
- this remains one of the highest-friction directories for new developers

Known compatibility exports now present there:

- `src/components/ErrorBoundary.tsx`
- `src/components/CostDashboard.tsx`
- `src/components/FiltersToolsBar.tsx`
- `src/components/TokenUsageBadge.tsx`
- `src/components/LiveRegion.tsx`
- `src/components/SkipLinks.tsx`

These now exist mainly for import compatibility, not as canonical homes.

Legacy shell residue is now more explicit than before:

- older shell files like `CleanSidebar.tsx`, `SidebarGlobalNav.tsx`, `CleanHeader.tsx`, and `TabManager.tsx` have been physically isolated under `src/components/legacy/`
- the remaining root-level direct files in `src/components/` are mostly compatibility stubs plus `grid-constants.ts`

## Route and Navigation Map

Current registry counts from `src/lib/registry/viewRegistry.ts`:

- total route ids: 45
- `core`: 4
- `nested`: 29
- `internal`: 12
- `navVisible: true`: 4
- `legacyRedirectTo` entries: 19

Current surface distribution:

- `ask`: 1
- `memo`: 1
- `research`: 14
- `investigate`: 1
- `compare`: 1
- `editor`: 7
- `graph`: 1
- `trace`: 2
- `telemetry`: 17

Interpretation:

- route count is still high even after cockpit consolidation
- most route weight now clusters under `telemetry` and `research`
- the app is no longer top-level-nav heavy, but it is still registry-heavy

This is an improvement over page-zoo navigation, but not yet simple enough for a newcomer to infer the product model from directory structure alone.

## Convex Inventory

Top-level `convex/` counts:

- `domains`: 1168 files
- `tools`: 118 files
- `workflows`: 19 files
- `lib`: 25 files
- `globalResearch`: 8 files

Interpretation:

- almost all backend complexity now lives in `convex/domains`
- `convex/domains` is the largest structural backend hotspot by far

Largest Convex domains by file count:

- `agents`: 233 files
- `research`: 155 files
- `evaluation`: 92 files
- `narrative`: 76 files
- `operations`: 65 files
- `documents`: 48 files
- `integrations`: 42 files
- `search`: 42 files

Mid-tier Convex domains that are still meaningful:

- `social`: 27
- `verification`: 27
- `enrichment`: 26
- `financial`: 25
- `mcp`: 20
- `messaging`: 19

Tiny Convex domains that are likely candidates for eventual folding:

- `landing`
- `learning`
- `telemetry`
- `testing`
- `teachability`
- `canonicalization`
- `world`
- `groundTruth`
- `signals`
- `channels`
- `quickCapture`
- `recommendations`
- `entities`

Interpretation:

- the backend is organized by very fine-grained domain boundaries
- this can be expressive for maintainers, but it imposes too much discovery overhead for new contributors
- `agents`, `research`, and `evaluation` are now the real backend centers of gravity

## MCP / Package Map

`packages/` footprint:

- `mcp-local`: 14612 files
- `convex-mcp-nodebench`: 7976 files
- `openclaw-mcp-nodebench`: 7918 files
- `eval-engine`: 16 files

Within `packages/mcp-local/src/`:

- `tools`: 62 files
- `__tests__`: 50 files
- `security`: 9 files
- `analytics`: 6 files

Interpretation:

- `mcp-local` is functionally important but visually flat
- `packages/mcp-local/src/tools/` is still one of the clearest physical-grouping opportunities
- public tool names can stay stable even if implementation files are regrouped later

## Docs Map

`docs/architecture/` currently contains 52 direct files and 291 recursive files.

`docs/` subdirectory counts:

- `architecture`: 300 files
- `agents`: 67
- `reports`: 36
- `completions`: 32
- `plans`: 22
- `guides`: 17

Interpretation:

- architecture knowledge is abundant but not sparse
- there are enough docs now that “go read the docs” is no longer a low-friction onboarding instruction
- the current repo needs a stronger separation between:
  - canonical current-state docs
  - future-state proposals
  - historical implementation reports

Canonical current-state docs should remain a very short list.

## Other Structural Weight

Additional notable roots:

- `apps`: 4102 files
- `scripts`: 279 files
- `services`: 25 files
- repo-root `shared`: 9 files

Interpretation:

- `apps` is a major footprint outside the main React app and Convex tree
- `scripts` is nontrivial and should likely be grouped more explicitly by function over time
- root-level `shared/` plus `src/shared/` plus `convex/shared/` is another source of naming ambiguity

## Canonical vs Historical

Today’s important distinction:

Canonical:

- cockpit shell in `src/layouts`
- active route registry in `src/lib/registry/viewRegistry.ts`
- shared runtime infra in `src/shared`
- active product code in `src/features`

Historical or compatibility residue still physically present:

- old shell files under `src/components` and `src/layouts`
- compatibility re-export files in `src/components`
- legacy route aliases and redirect entries in the view registry

This is why the repo still feels harder than the product model itself.

## Friction Hotspots Ranked

1. `convex/domains/`
Reason:
- largest backend surface
- many small adjacent domains
- high conceptual branching cost

2. `src/features/`
Reason:
- very broad
- two dominant clusters plus many tiny slices
- hard to infer which features are primary vs peripheral

3. `src/components/`
Reason:
- overloaded root
- mixes shell, app widgets, compatibility exports, and reusable UI

4. `packages/mcp-local/src/tools/`
Reason:
- physically flat
- lots of domain-mixed implementations

5. `docs/architecture/`
Reason:
- too many files for a newcomer to know which ones are current and authoritative

## Safe Review Conclusions

What is already clear enough:

- active shell direction
- active route model
- main frontend hotspots
- main Convex hotspots
- main MCP hotspot

What should not be done blindly:

- repo-wide rename waves
- massive frontend folder moves across all features at once
- Convex domain collapse without a clear target grouping
- deleting compatibility exports before import consumers are fully audited

## Recommended Review Questions Before More Changes

1. Do we want `src/components/` to become mostly legacy/compatibility, or remain a real active directory?
2. Which small frontend feature roots should be folded first into parent domains?
3. Which tiny Convex domains should merge into `agents`, `research`, `operations`, `documents`, or `governance`?
4. Should `packages/mcp-local/src/tools/` be grouped physically by domain now, while keeping tool names stable?
5. Which docs are canonical current-state docs, and which should be moved into archive/history buckets?

## Proposed Next Review Gate

Before the next restructure slice, review and approve:

- the canonical frontend homes:
  - `src/layouts`
  - `src/layouts/chrome`
  - `src/shared`
  - `src/features/*`
- the first fold targets in `src/components`
- the first fold targets in `convex/domains`
- whether docs should be split into `current`, `plans`, and `history`

No further large physical reorg should happen until that review is settled.

# Codebase Review Map

Date: 2026-03-19

Purpose:

- map the current repo before any larger directory restructure
- identify where humans are most likely to get lost
- separate canonical active architecture from historical or compatibility paths
- quantify the biggest hotspots so follow-up cleanup is based on repo reality

This is a review document, not an implementation plan.

## Executive Summary

The repo is navigable for an existing maintainer, but not yet 10x easier for a new developer.

The biggest sources of friction are:

1. too many top-level roots in the repo
2. an overloaded `src/features/` tree
3. an overloaded `convex/domains/` tree
4. a still-overloaded `src/components/` root
5. a flat `packages/mcp-local/src/tools/` directory
6. many architecture docs with mixed freshness

The good news is that the active product architecture is now clearer than the physical repo layout:

- canonical app shell is cockpit-first
- canonical route model is cockpit query-state at `/`
- shared crash handling is now truly under `src/shared/components/`
- active shell chrome is partially consolidated under `src/layouts/` and `src/layouts/chrome/`

The bad news is that the physical directory structure still lags behind that architecture.

## Repo Footprint

Top-level roots currently visible in the repo include:

- product/runtime roots: `src`, `convex`, `packages`, `apps`, `scripts`, `services`, `server`, `shared`
- documentation roots: `docs`, `plans`, `agents`, `skills`
- artifact and generated roots: `dist`, `public`, `playwright-report`, `test-results`, `screenshots`, `e2e-screenshots`, `.tmp`
- local/dev/system roots: `.claude`, `.cursor`, `.windsurf`, `.storybook`, `.vercel`, `.github`, `.serena`

This is a real source of onboarding noise. The repo looks bigger than the active product architecture actually is.

## Current Active Product Shape

Canonical frontend shell:

- `src/layouts/CockpitLayout.tsx`
- `src/layouts/ActiveSurfaceHost.tsx`
- `src/layouts/WorkspaceRail.tsx`
- `src/layouts/AgentPresenceRail.tsx`
- `src/layouts/StatusStrip.tsx`
- `src/layouts/CommandBar.tsx`
- `src/layouts/chrome/QuickCaptureWidget.tsx`
- `src/lib/registry/viewRegistry.ts`
- `src/hooks/useCockpitRouting.ts`
- `src/layouts/useCockpitMode.ts`

Clarification:

- there is no dedicated `src/layouts/TraceStrip.tsx` anymore
- the cockpit bottom trace/status row is rendered inline inside `src/layouts/CockpitLayout.tsx`

Canonical route model:

- root cockpit at `/`
- state encoded via `?surface=...&entity=...&run=...&doc=...&workspace=...`
- cockpit navigation intentionally clears stale `run` state when leaving trace-linked views so non-trace URLs do not inherit an old trace run id
- legacy routes redirected into cockpit state

Canonical shared infra examples:

- `src/shared/components/ErrorBoundary.tsx`
- `src/layouts/chrome/*`
- feature-owned telemetry/admin implementation in `src/features/admin/components/CostDashboard.tsx`

## Frontend Inventory

Top-level `src/` counts:

- `features`: 499 files
- `components`: 80 files
- `lib`: 51 files
- `hooks`: 42 files
- `shared`: 48 files
- `layouts`: 22 files
- `test`: 27 files

Interpretation:

- `src/features` is where most active product code lives
- `src/components` is still too broad for a clean mental model
- `src/layouts` is now comparatively small and coherent
- `src/shared` is useful, but not yet the dominant home for reusable app-wide infrastructure

## Frontend Hotspots

Largest feature roots by file count:

- `research`: 145 files
- `agents`: 137 files
- `documents`: 60 files
- `editor`: 25 files
- `narrative`: 25 files
- `controlPlane`: 17 files
- `calendar`: 16 files
- `strategy`: 12 files
- `benchmarks`: 10 files

Interpretation:

- `research` and `agents` are the dominant frontend complexity centers
- `documents` is the next real hotspot
- many tiny feature roots exist that likely should be folded into parent domains over time

Small frontend slices that are likely fold candidates:

- `mcp`
- `dogfood`
- `engine`
- `evaluation`
- `investigation`
- `missions`
- `monitoring`
- `observability`
- `trajectory`
- `devDashboard`

Not all of these should disappear, but many are too small to justify stand-alone discoverability for a new developer.

## `src/components/` Review

`src/components/` now has 80 recursive files, 5 direct files, and 16 subdirectories.

Largest legacy or compatibility files still reachable under that directory:

- `legacy/CleanSidebar.tsx` 513 lines
- `legacy/TabManager.tsx` 406 lines
- `legacy/SidebarGlobalNav.tsx` 188 lines
- `legacy/CleanHeader.tsx` 106 lines
- `grid-constants.ts` 45 lines

What this means:

- the root components directory still mixes legacy shell, reusable widgets, and feature-like UI
- the name `components` still implies “generic reusable UI,” but in practice it contains historical shell residue and app-specific panels
- this remains one of the highest-friction directories for new developers

Known compatibility exports now present there:

- `src/components/FiltersToolsBar.tsx`
- `src/components/TokenUsageBadge.tsx`
- `src/components/LiveRegion.tsx`
- `src/components/SkipLinks.tsx`

These now exist mainly for import compatibility, not as canonical homes.

Legacy shell residue is now more explicit than before:

- older shell files like `CleanSidebar.tsx`, `SidebarGlobalNav.tsx`, `CleanHeader.tsx`, and `TabManager.tsx` have been physically isolated under `src/components/legacy/`
- the remaining root-level direct files in `src/components/` are mostly compatibility stubs plus `grid-constants.ts`

## Route and Navigation Map

Current registry counts from `src/lib/registry/viewRegistry.ts`:

- total route ids: 45
- `core`: 4
- `nested`: 29
- `internal`: 12
- `navVisible: true`: 4
- `legacyRedirectTo` entries: 19

Current surface distribution:

- `ask`: 1
- `memo`: 1
- `research`: 14
- `investigate`: 1
- `compare`: 1
- `editor`: 7
- `graph`: 1
- `trace`: 2
- `telemetry`: 17

These are internal surface ids. Current user-facing `SURFACE_TITLES` labels are `DeepTrace`, `Decision Workbench`, `Research Hub`, `Investigation`, `Postmortem`, `Workspace`, `Entity Graph`, `Audit Trail`, and `The Oracle`.

Interpretation:

- route count is still high even after cockpit consolidation
- most route weight now clusters under `telemetry` and `research`
- the app is no longer top-level-nav heavy, but it is still registry-heavy

This is an improvement over page-zoo navigation, but not yet simple enough for a newcomer to infer the product model from directory structure alone.

## Convex Inventory

Top-level `convex/` counts:

- `domains`: 1168 files
- `tools`: 118 files
- `workflows`: 19 files
- `lib`: 25 files
- `globalResearch`: 8 files

Interpretation:

- almost all backend complexity now lives in `convex/domains`
- `convex/domains` is the largest structural backend hotspot by far

Largest Convex domains by file count:

- `agents`: 233 files
- `research`: 155 files
- `evaluation`: 92 files
- `narrative`: 76 files
- `operations`: 65 files
- `documents`: 48 files
- `integrations`: 42 files
- `search`: 42 files

Mid-tier Convex domains that are still meaningful:

- `social`: 27
- `verification`: 27
- `enrichment`: 26
- `financial`: 25
- `mcp`: 20
- `messaging`: 19

Tiny Convex domains that are likely candidates for eventual folding:

- `landing`
- `learning`
- `telemetry`
- `testing`
- `teachability`
- `canonicalization`
- `world`
- `groundTruth`
- `signals`
- `channels`
- `quickCapture`
- `recommendations`
- `entities`

Interpretation:

- the backend is organized by very fine-grained domain boundaries
- this can be expressive for maintainers, but it imposes too much discovery overhead for new contributors
- `agents`, `research`, and `evaluation` are now the real backend centers of gravity

## MCP / Package Map

`packages/` footprint:

- `mcp-local`: 14612 files
- `convex-mcp-nodebench`: 7976 files
- `openclaw-mcp-nodebench`: 7918 files
- `eval-engine`: 16 files

Within `packages/mcp-local/src/`:

- `tools`: 62 files
- `__tests__`: 50 files
- `security`: 9 files
- `analytics`: 6 files

Interpretation:

- `mcp-local` is functionally important but visually flat
- `packages/mcp-local/src/tools/` is still one of the clearest physical-grouping opportunities
- public tool names can stay stable even if implementation files are regrouped later

## Docs Map

`docs/architecture/` currently contains 53 direct files and 292 recursive files.

`docs/` subdirectory counts:

- `architecture`: 292 files
- `agents`: 67
- `reports`: 36
- `completions`: 41
- `plans`: 38
- `changelog`: 3
- `guides`: 17

Interpretation:

- architecture knowledge is abundant but not sparse
- there are enough docs now that “go read the docs” is no longer a low-friction onboarding instruction
- the current repo needs a stronger separation between:
  - canonical current-state docs
  - future-state proposals
  - historical implementation reports

Canonical current-state docs should remain a very short list.

## Other Structural Weight

Additional notable roots:

- `apps`: 4101 files
- `scripts`: 279 files
- `services`: 25 files
- repo-root `shared`: 9 files

Interpretation:

- `apps` is a major footprint outside the main React app and Convex tree
- `scripts` is nontrivial and should likely be grouped more explicitly by function over time
- root-level `shared/` plus `src/shared/` plus `convex/shared/` is another source of naming ambiguity

## Canonical vs Historical

Today’s important distinction:

Canonical:

- cockpit shell in `src/layouts`
- active route registry in `src/lib/registry/viewRegistry.ts`
- shared runtime infra in `src/shared`
- active product code in `src/features`

Historical or compatibility residue still physically present:

- old shell files now mainly isolated under `src/components/legacy/`
- compatibility re-export files in `src/components`
- legacy route aliases and redirect entries in the view registry

This is why the repo still feels harder than the product model itself.

## Friction Hotspots Ranked

1. `convex/domains/`
Reason:
- largest backend surface
- many small adjacent domains
- high conceptual branching cost

2. `src/features/`
Reason:
- very broad
- two dominant clusters plus many tiny slices
- hard to infer which features are primary vs peripheral

3. `src/components/`
Reason:
- overloaded root
- mixes shell, app widgets, compatibility exports, and reusable UI

4. `packages/mcp-local/src/tools/`
Reason:
- physically flat
- lots of domain-mixed implementations

5. `docs/architecture/`
Reason:
- too many files for a newcomer to know which ones are current and authoritative

## Safe Review Conclusions

What is already clear enough:

- active shell direction
- active route model
- main frontend hotspots
- main Convex hotspots
- main MCP hotspot

What should not be done blindly:

- repo-wide rename waves
- massive frontend folder moves across all features at once
- Convex domain collapse without a clear target grouping
- deleting compatibility exports before import consumers are fully audited

## Recommended Review Questions Before More Changes

1. Do we want `src/components/` to become mostly legacy/compatibility, or remain a real active directory?
2. Which small frontend feature roots should be folded first into parent domains?
3. Which tiny Convex domains should merge into `agents`, `research`, `operations`, `documents`, or `governance`?
4. Should `packages/mcp-local/src/tools/` be grouped physically by domain now, while keeping tool names stable?
5. Which docs are canonical current-state docs, and which should be moved into archive/history buckets?

## Proposed Next Review Gate

Before the next restructure slice, review and approve:

- the canonical frontend homes:
  - `src/layouts`
  - `src/layouts/chrome`
  - `src/shared`
  - `src/features/*`
- the first fold targets in `src/components`
- the first fold targets in `convex/domains`
- whether docs should be split into `current`, `plans`, and `history`

No further large physical reorg should happen until that review is settled.
