# Diligence OS × Public Surfaces — Canonical Rewrite

**Date**: 2026-04-19 · **Status**: Supersedes `PUBLIC_ARTIFACT_VIEWS_DESIGN.md` and `PUBLIC_VIEWS_X_HARNESS_FLOW.md` · **Authority**: the 10-section canonical plan (in-thread, 2026-04-19)

## What I got wrong in the prior design

The prior thread proposed:
- `PublicFounderProfileView` as a sibling to `PublicCompanyProfileView` ❌
- `PublicMarketMapView` as a new route backed by a new `productMarketMaps` table ❌
- `PublicProductProfileView` as a new artifact-first snapshot view ❌
- On-paste hydration as a standalone UX concern ✅

Three out of four are wrong **not because the output goals are wrong**, but because the architecture is. The right abstraction is **one generic diligence-block primitive** with per-block configs, rendered into the existing entity surface via ProseMirror decorations and the existing `/company/:slug` + `/entity/:slug` pages. Founder is the first block. Product, Funding, News, Hiring, Patent, PublicOpinion, Competitor, Regulatory, Financial are later blocks on the same primitive.

## The corrected design

### 1. Founder is a trait, not a tab

- **No** `/founder/:slug` separate view component.
- **Yes** `/founder` as a **smart route** in `src/App.tsx`:
  - Viewer owns a founder profile → 302 to `/entity/<their-slug>`
  - Viewer is founder-tagged but has no profile → `/?surface=me#founder-profile`
  - Otherwise → `/?surface=me`
- **Yes** a conditional `FounderProfileSection` on `Me` that appears only when founder traits are detected (MCP connected / GitHub linked / founder lens / existing profile).

The previous proposal to add a new Public view file for founders violated this — founder **is a data block on an entity page**, not a new page shape.

### 2. All block outputs render via one primitive

- **No** per-block Public views (`PublicFounderProfileView`, `PublicMarketMapView`, etc.).
- **Yes** one generic `DiligenceSection` component that accepts `blockKind` and routes to the right renderer (`FounderRenderer`, `ProductRenderer`, `FundingRenderer`, `NewsRenderer`, …).
- **Yes** inside the notebook, block outputs become **ProseMirror decorations** (accept-to-convert) via `DiligenceDecorationPlugin` — not ad-hoc React cards.

Every block renders in three places with the same data shape:
1. `/entity/:slug` Classic view → stacked `<DiligenceSection kind="founder" />`
2. `/entity/:slug` Live notebook → `DiligenceDecorationPlugin` decorations
3. `/company/:slug` public view → same `DiligenceSection` components, no auth chrome

### 3. Two kinds of public URL, correctly separated

- **Entity-first** (living, per entity-type, already exists where shipped):
  - `/company/:slug` → `PublicCompanyProfileView` ✅ ships today
  - Person entities → render via `/entity/:slug` + the `/founder` smart route. **No new PublicPersonView component.**
- **Artifact-first** (immutable snapshot of one pipeline run):
  - `/memo/:id` → `ShareableMemoView` ✅ ships today (decision memo artifact)
  - Proposed `PublicPipelineSnapshotView` (formerly mis-named `PublicProductProfileView`). Renamed to remove conflict with the "product" diligence block. Backed by a `productPipelineSnapshots` table written by `completeSession`. Immutable; frozen at run time.

### 4. On-paste hydration remains valid — re-homed

- **Yes** `src/features/product/lib/onPasteHydration.ts` in the composer.
- **Now explicitly plugs into the diligence pipeline**: sets `entityTypeHint` (routes to the right entity shape) **and** `intentHint` (routes to the right set of diligence blocks). Example: paste a LinkedIn `/in/` URL → `entityTypeHint = "person"` + auto-include `founder` block in the run; skip `funding` block for the first pass.
- The hints flow: `ProductIntakeComposer.onPaste` → `startSession.operatorContext` → orchestrator reads and picks blocks → scratchpad written → structuring → entity merge.

## Restated PR sequence (aligned to the canonical week plan)

The previous 4-PR plan is replaced with the 4-week plan. Only the pieces that deliver public-surface value are listed here; the full list lives in the canonical plan.

### Week 1 — Foundation (no user-visible change)

- Formalize `ddEnhancedOrchestrator` into the generic `diligenceBlock` primitive.
- Extend `scratchpads` with drift / idempotency / entity-version-at-start.
- Align evidence tiers to `verified | corroborated | single-source | unverified` in `server/lib/evidenceSpan.ts`.
- Architecture docs + `.claude/rules/layered_memory.md` written first so implementation follows contracts.

### Week 2 — UI primitives (first user-visible delta)

- `DiligenceSection` generic classic renderer (the component `PublicFounderProfileView` was trying to be).
- `DiligenceDecorationPlugin` for the notebook.
- `EvidenceChip` shared credibility pill.
- `ContributionLog` ("built from 3 reports, 5 chats" tally — not a single origin string).
- `SessionArtifactsPanel` right-rail in Chat with Keep checkboxes + scratchpad toggle.
- `AgentTraceBlock` inline collapsible observability tree in Chat.
- On-paste hydration wired into the composer.

This is the week where the new design first **looks** different — not because we added Public views, but because the entity page renders block sections and the chat shows session artifacts.

### Week 3 — Memory + session workflow

- `entityMemoryIndex` + `entityMemoryTopics` tables.
- `server/pipeline/compaction.ts` deterministic merge into topics.
- `server/pipeline/jitRetrieval.ts` read-only, size-bounded.
- `SessionWrapUpModal` + `PendingArtifactsStrip` on Reports.
- `autoFeedback.ts` draft generator + `sanitizeFeedback.ts` redactor.

### Week 4 — Reliability + `/founder` routing

- Background mode: exponential backoff + scheduled retries + DLQ + metrics.
- `BackgroundRunsChip` in the top bar.
- `/founder` smart route.
- Anonymous claim flow at wrap-up.
- `useFounderTrait` hook + `FounderProfileSection` on `Me`.

## How this corrects the audit claim coverage

| Claim phrase | Previous design would deliver | Corrected design delivers |
|---|---|---|
| "ingests recruiter notes, LinkedIn URLs, pitch decks, and bios" | on-paste hydration only | on-paste hydration **plus** block-level routing so a LinkedIn paste runs the founder block against that person's page, and a recruiter-note paste attaches evidence to a job-type entity |
| "outputs decision memos" | unchanged | unchanged (`ShareableMemoView`) |
| "outputs founder profiles" | new `PublicFounderProfileView` (wrong) | `FounderRenderer` decoration + `DiligenceSection` on the entity page + `Me` founder card (right) |
| "outputs market maps" | new `PublicMarketMapView` + new table (wrong) | market is a **diligence block** with its own renderer; `market_map_compose` is a pipeline capability, not a standalone route. `MarketRenderer` decoration inside any company entity page that opens a market block. |
| "as shareable public URLs" | mostly unchanged | unchanged for `/company/:slug` + `/memo/:id`; adds `PublicPipelineSnapshotView` at `/product/:id` for immutable run snapshots (same concept, corrected name) |

## The naming contract (reaffirmed)

Once a `Public*View` ships to prod and real URLs exist in the wild, never rename. Add a sibling, or dispatch by type at the route level.

Current safe list, correctly scoped:
- `PublicCompanyProfileView` at `/company/:slug` — entity-first, ships
- `ShareableMemoView` at `/memo/:id` — artifact-first, ships
- `PublicPipelineSnapshotView` at `/product/:id` — artifact-first, **proposed** (name finalized here)

Not-new-views (deliberately):
- No `PublicFounderProfileView`. Founder lives on `/entity/:slug` + `Me` + `/founder` smart route.
- No `PublicMarketMapView`. Market lives as a diligence block rendered inside the right entity page.
- No `PublicPersonView`. Person entities use the generic `/entity/:slug`.

## The one-sentence connection

Every public surface renders the same block-typed diligence outputs, produced by one scratchpad-first pipeline, emitted into the entity's memory layers, and surfaced three ways — entity-page section, notebook decoration, or immutable run-snapshot URL — with the `/founder` route smart-redirecting to whichever of those the viewer is entitled to see.

## What gets archived (so future readers don't follow the wrong path)

- `PUBLIC_ARTIFACT_VIEWS_DESIGN.md` — keep for historical context, but superseded by this doc
- `PUBLIC_VIEWS_X_HARNESS_FLOW.md` — same; flow diagram still accurate for `/memo/:id` and `/company/:slug`; the Founder/Market sections are wrong and replaced above

The prior docs still teach the two-shape distinction (entity-first vs artifact-first), which stands. What they got wrong was treating each diligence block as a new view. This doc corrects that.
