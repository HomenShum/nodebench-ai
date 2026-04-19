# Public Views × Harnessed Agent — End-to-End Flow

**Date**: 2026-04-19 · **Status**: Connective-tissue design · **Follows**: `PUBLIC_ARTIFACT_VIEWS_DESIGN.md`

The critical insight that makes the new public views cheap to add: **every agent run today already writes to both an artifact AND an entity**. We're not adding pipeline steps — we're just exposing the two outputs under different public URLs.

## The existing harness pipeline (already in prod)

```
┌───────────────────────────────────────────────────────────────────────┐
│ CHAT SURFACE                                                           │
│  ProductIntakeComposer  ──(text + links + files)──►  startSession()   │
│    ▲                                                     │             │
│    │                                    inserts productChatSessions    │
│    │                                                     │             │
│    │                                                     ▼             │
│    │                                             agent harness runs   │
│    │                                     (streams tokens to panel)    │
│    │                                                     │             │
│    │                    packet (sections + sources + entity hint)     │
│    │                                                     ▼             │
│    │                                              completeSession()   │
│    │                                                     │             │
│    │                     ┌───────────────────────────────┼──────────┐ │
│    │                     ▼                               ▼          │ │
│    │            productReports insert          ensureEntityForReport │ │
│    │            (immutable snapshot)           upserts productEntities│ │
│    │                     │                               │          │ │
│    │                     │                               ▼          │ │
│    │                     │                     productBlocks written │ │
│    │                     │                     by agent via blocks.ts│ │
│    │                     │                               │          │ │
│    └─────────────────────┴───────────────────────────────┘          │ │
│                                                                       │
└──────────┬────────────────────────────────────┬───────────────────────┘
           │                                    │
           ▼                                    ▼
     REPORT SURFACE                    ENTITY PAGE
  /?surface=reports                    /entity/:slug
  reads productReports                 reads productEntities + productBlocks
           │                                    │
           │                                    │
        SHARE                                 SHARE
           │                                    │
           ▼                                    ▼
  PUBLIC URLS (existing)              PUBLIC URLS (entity-first)
  /memo/:id            ✅              /company/:slug    ✅
                                       /founder/:slug    ⬜ new
                                       /market/:slug     ⬜ new
           │
           │  ──────► add sibling artifact-first view
           ▼
  /product/:id                        ⬜ new
  (frozen snapshot of the run)
```

Source of truth:
- `convex/domains/product/chat.ts:79` — `startSession` creates the chat record
- `convex/domains/product/chat.ts:288` — `completeSession` is the fork point that writes **both** a report and an entity upsert
- `convex/domains/product/chat.ts:319` → `ensureEntityForReport` (in `entities.ts:340`)
- `convex/domains/product/blocks.ts` — block persistence the agent writes into

Every new Public view plugs into ONE of those existing outputs. Nothing new in the pipeline itself.

## How each new view connects

### `PublicFounderProfileView` at `/founder/:slug`

**Data source**: `productEntities` where `entityType === "person"` + `productBlocks` scoped to that entity.

**Harness connection**: ZERO new pipeline work. `ensureEntityForReport` already infers `entityType` via `inferProductEntityType` at `entities.ts:208` — LinkedIn person URLs already resolve to `"person"`. The agent already writes founder-shaped blocks when the entity is a person (roles, affiliations, network mentions). The new view is **pure rendering** of data the harness has been producing since day one, just with a different template than the company view uses.

**What triggers routing to a person entity**: today it's the inference heuristic + any `entitySlugHint` passed to `completeSession`. After PR-1 (on-paste hydration), paste of a LinkedIn `/in/` URL sets `entityTypeHint = "person"` BEFORE `startSession` fires, so `completeSession` passes it as `entitySlugHint` and the right entity shape is created on the first run.

### `PublicMarketMapView` at `/market/:slug`

**Data source**: proposed new `productMarketMaps` table (one row per market, with axes + node layout + cluster labels + whitespace notes).

**Harness connection**: REQUIRES a new agent tool. Today the agent doesn't produce "2D scatter with X/Y positions and cluster labels" — it produces prose sections. The tool would be:

```
market_map_compose(entitySlug: string) → {
  axes: { x: {label, range}, y: {label, range} },
  nodes: [{ slug, x, y, cluster, sourceRefs }],
  clusters: [{ label, memberSlugs, summary }],
  whitespace: [{ label, positionHint }]
}
```

The tool is called from a specific routing branch in the harness when `entityType === "market"`. The tool's output goes into `productMarketMaps` and is rendered by `PublicMarketMapView`. Without the tool, the route is empty-state.

This is why the earlier audit marked market maps as the **biggest gap** — it's not just a rendering hole, it's a missing agent capability.

### `PublicProductProfileView` at `/product/:id`

**Data source**: proposed new `productPipelineSnapshots` table — immutable row per pipeline run, frozen at `completeSession` time.

**Harness connection**: ONE new write at `completeSession`. Today `completeSession` already:
1. Inserts a `productReports` row
2. Upserts `productEntities`
3. Writes `productBlocks` via agent blocks API

Adding a step 4: write a `productPipelineSnapshots` row that captures:
- `entitySlug` (frozen string, NOT a foreign key, so it survives entity deletion)
- `entityName` at the time
- `reportId` pointer
- `toolTrace` — list of tool calls + truncated results from this run
- `sources` — frozen list of `{ url, title, excerpt }` as they were cited
- `producedAt` timestamp

That's ~40 lines added to `completeSession`. The immutability is the feature: `/memo/:id` and `/product/:id` both guarantee the reader sees the exact run you shared, not "the current state of SoftBank."

### On-paste hydration — where it plugs into Chat

**File**: proposed `src/features/product/lib/onPasteHydration.ts`.

**Wiring point**: `ProductIntakeComposer.onPaste` + `onDrop`. Runs BEFORE the user clicks Send.

**Effect on the harness**: populates two previously-empty hint fields on the session draft:
- `entityTypeHint` → flows into `startSession` → propagated to `completeSession` → read by `ensureEntityForReport` (at `entities.ts:345` — the field `entitySlugHint` already exists; we'd add `entityTypeHint` alongside)
- `intentHint` ("pitch_deck" / "recruiter_note" / "bio") → flows into `productChatSessions.operatorContext` → agent system prompt picks a specialized routing branch

Cost on the harness: one optional field through `startSession` + `completeSession` + `ensureEntityForReport`. Touching three places, ~20 lines total.

## The rendering contract

Every Public view follows the same rule at the top of the component:

```ts
const data = useQuery(
  api.domains.product.<X>.<getSnapshot or getEntity>,
  { slug_or_id: routeParam, shareToken: null },
);
if (data === undefined) return <Skeleton />;
if (data === null)      return <NotFound artifactType="..." />;
return <Render ... />;
```

The only difference between Founder / Company / Market / Product views is WHICH query they call and WHICH renderer they use. All four share the same route guard pattern (`src/App.tsx:118-144`), the same error boundary, the same theme wrapper.

## The connective-tissue principle

Every new Public view must answer three questions before it ships:

1. **Where does its data come from in the pipeline?** (one of: existing `productEntities`, existing `productReports`, or a new snapshot table)
2. **Does the harness already produce the right shape?** If not, what tool is added?
3. **What's the one field that routes the run to this view?** (`entityType`, `intentHint`, or `artifactKind`)

Run through for the new ones:

| View | Pipeline source | New harness capability? | Routing field |
|---|---|---|---|
| `PublicFounderProfileView` | `productEntities` + `productBlocks` | No | `entityType === "person"` |
| `PublicMarketMapView` | new `productMarketMaps` | YES — new tool | `entityType === "market"` |
| `PublicProductProfileView` | new `productPipelineSnapshots` | No (one new write at `completeSession`) | `artifactKind === "product"` |

## What this tells us about sequencing

The earlier design doc staged the PRs by cost. This flow diagram tells us the same sequence by **harness surface area touched**:

1. **PR-1 on-paste hydration** — touches chat intake only. No pipeline change. Pure UX hints.
2. **PR-2 `PublicFounderProfileView`** — touches NO pipeline. Pure rendering. Data already exists for every person entity in prod.
3. **PR-3 `PublicProductProfileView`** — touches `completeSession` with one new write. Every subsequent run produces a snapshot. Old runs without snapshots get a "snapshot unavailable; see living entity page →" fallback.
4. **PR-4 `PublicMarketMapView`** — the real work. Requires the market-map agent tool. This is the only one that expands what NodeBench can produce.

If a PR ever feels expensive, it's because it's touching the harness. PR-1 / PR-2 / PR-3 don't. PR-4 does.

## Verification — how we'd know each connection works

Code-grounded checks, no Playwright needed:

- PR-1 ships → paste `https://linkedin.com/in/test` → `onPaste` fires → `entityTypeHint="person"` visible in React devtools on the composer state. Send → inspect `productChatSessions.operatorContext` — should contain the hint.
- PR-2 ships → visit `/founder/softbank-founder-handle` (if one exists) → rendered with founder template, same data the entity page uses.
- PR-3 ships → trigger a chat run → `completeSession` returns a `snapshotId` → visit `/product/<that-id>` → frozen output visible. Delete the entity. Refresh `/product/<id>` — still renders (proves immutability).
- PR-4 ships → chat "map the LLM infrastructure market" → `market_map_compose` tool called (visible in agent trace) → `productMarketMaps` row written → `/market/llm-infra` renders the 2D scatter.

## One claim this lets us make honestly

> Every agent run in NodeBench produces three outputs: a report (snapshot), an entity (living record), and — once the pipeline snapshot write lands — a frozen product profile you can cite forever. Any of them can be rendered under a public no-auth URL.

That's the marketing claim after PR-1, PR-2, PR-3 land. PR-4 unlocks the market-map addition to the same sentence.
