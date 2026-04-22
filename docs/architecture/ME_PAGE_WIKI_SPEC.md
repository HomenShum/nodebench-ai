# Me Page IA + My Wiki Schema Spec

> Status: draft v1, 2026-04-22
> Owner: hshum
> Target: Me surface (`/me`) + a new `My Wiki` sub-surface
> Thesis: the Me page surfaces a **personal, generated, source-linked synthesis layer** built on top of NodeBench's structured durable truth. It is not a writable markdown swamp that becomes the source of truth.

---

## 1. One-sentence framing

> **My Wiki is a personal synthesis layer: AI-maintained pages, regenerable from structured artifact state, with user-owned note zones and a full evidence trail back to raw sources.**

Not a free-edit wiki. Not the database. A **read-mostly lens** over the durable artifact substrate that compounds your personal understanding over time.

---

## 2. Where it fits in the NodeBench system

```
Chat              → starts work
Reports / Notebook → durable artifact surfaces for active work
Pulse / Inbox     → what changed
Me / My Wiki     → your evolving personal map of what you know
```

The existing 9-term vocabulary freeze stays intact. My Wiki introduces three new durable object types (`WikiPage`, `WikiEdge`, `WikiRevision`) — all derivative. None replace `Artifact`, `ChatThread`, or `FileAsset`.

---

## 3. Me page IA

```
/me
├─ Overview                # usage snapshot + recent activity
├─ My Wiki                 # NEW — personal synthesis layer
│   ├─ Recently updated
│   ├─ Topics              # cross-entity concept pages
│   ├─ Companies
│   ├─ People
│   ├─ Products
│   ├─ Events
│   ├─ Locations
│   ├─ Jobs
│   └─ Contradictions / Open questions
├─ Files                   # existing uploads surface
├─ Connectors              # Gmail, Slack, etc.
├─ Pulse Preferences       # watched entities + cadence
├─ Exports / CRM           # existing crm_export artifact output
└─ Settings                # profile, theme, account
```

### Mobile IA alignment

On mobile, the five root tabs stay (Home · Reports · Chat · Inbox · Me). `My Wiki` lives **inside** Me, not at the root. Tapping Me on mobile opens Overview; a tap on the "My Wiki" section header drills in.

Rationale: the current root tab-bar is already at the reduction ceiling ("earned complexity" per `.claude/rules/reexamine_design_reduction`). Adding a 6th root tab would violate that. The wiki is a *personal reflection surface* — belongs under Me.

---

## 4. Anatomy of a wiki page

Every wiki page has **three zones**. The zone boundary is the trust boundary.

### Zone 1 — Generated overview (AI-maintained)
- `What it is`
- `Why it matters`
- `What changed recently`
- `What I'm less sure about`

**Write policy:** regenerated only, never edited in place. A regeneration is a new `WikiRevision` row; the old revision is retained.

### Zone 2 — Linked evidence + raw sources (deterministic)
- Source count (inline badge)
- Freshness pill per source (green / amber / red)
- Contradictions (count + drilldown)
- Back-links to reports, notebook sections, uploaded files, web evidence

**Write policy:** strictly derived from `productReports`, `productClaims`, `productEvidenceItems`, `canonicalSources`, `extractedSignals`. Never written directly.

### Zone 3 — My notes (human-owned)
- Free-edit markdown
- Clearly separated visually from Zone 1 (different background, label "Your notes")
- Never silently rewritten by the AI

**Write policy:** only the owning user mutates. AI may *read* these notes as context for Zone 1 regeneration, but cannot overwrite.

### Visual contract
- Zone 1: subtle amber/terracotta left-border (matches `--accent-primary`) + small "AI-maintained" pill with a regenerate icon
- Zone 2: neutral surface with citation chips
- Zone 3: distinct panel, slight cream/neutral background in light mode, `bg-white/[0.03]` in dark — "this is yours"

---

## 5. Schema (Convex tables)

Add to `convex/schema.ts` alongside the existing CSL/ESL tables.

```ts
/* ────────────────────────────────────────────────────────────────── */
/* MY WIKI — personal synthesis layer                                  */
/* Generated from productReports, productClaims, canonicalSources,     */
/* extractedSignals. NEVER the source of truth. Regenerable.           */
/* See: docs/architecture/ME_PAGE_WIKI_SPEC.md                         */
/* ────────────────────────────────────────────────────────────────── */
const userWikiPages = defineTable({
  ownerKey: v.string(),
  pageType: v.union(
    v.literal("topic"),
    v.literal("company"),
    v.literal("person"),
    v.literal("product"),
    v.literal("event"),
    v.literal("location"),
    v.literal("job"),
    v.literal("contradiction"),
  ),
  slug: v.string(),                    // canonical; per-owner unique
  title: v.string(),
  summary: v.string(),                 // short one-liner for lists
  // Freshness tier derived from newest linkedSourceId fetchedAt
  freshnessState: v.union(
    v.literal("fresh"),      // < 24h
    v.literal("recent"),     // 24h–7d
    v.literal("stale"),      // 7d–30d
    v.literal("very_stale"), // > 30d
    v.literal("unknown"),    // no linked source
  ),
  contradictionCount: v.number(),
  linkedArtifactIds: v.array(v.id("productReports")),
  linkedClaimIds: v.array(v.id("productClaims")),
  linkedSourceIds: v.array(v.id("canonicalSources")),
  linkedFileIds: v.array(v.id("files")),
  // Monotonically increments; old revision rows preserve history
  revision: v.number(),
  regeneratedAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_pageType", ["ownerKey", "pageType"])
  .index("by_owner_slug", ["ownerKey", "slug"])
  .index("by_owner_updated", ["ownerKey", "updatedAt"])
  .index("by_owner_freshness", ["ownerKey", "freshnessState"])
  .index("by_owner_contradictions", ["ownerKey", "contradictionCount"]);

const userWikiEdges = defineTable({
  ownerKey: v.string(),
  fromPageId: v.id("userWikiPages"),
  toPageId: v.id("userWikiPages"),
  relationType: v.union(
    v.literal("related"),
    v.literal("competitor"),
    v.literal("works_at"),
    v.literal("invested_in"),
    v.literal("acquired_by"),
    v.literal("based_in"),
    v.literal("mentioned_in"),
    v.literal("contradicts"),
  ),
  // 0..1, validator clamps
  confidence: v.number(),
  // Which derived fact established this edge (claim id or source csl key)
  provenanceClaimId: v.optional(v.id("productClaims")),
  provenanceSourceKey: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_from", ["ownerKey", "fromPageId"])
  .index("by_owner_to", ["ownerKey", "toPageId"])
  .index("by_owner_relation", ["ownerKey", "relationType"]);

const userWikiRevisions = defineTable({
  ownerKey: v.string(),
  pageId: v.id("userWikiPages"),
  revision: v.number(),
  // The Zone-1 generated prose at this revision
  generatedSummary: v.string(),
  generatedDetails: v.string(),
  whatChangedSection: v.string(),
  openQuestionsSection: v.string(),
  // Hash of source-snapshot inputs used to produce this revision.
  // Same inputs → same hash → same output (DETERMINISTIC rule).
  sourceSnapshotHash: v.string(),
  sourceSnapshotIds: v.array(v.string()),
  modelUsed: v.string(),
  generatedAt: v.number(),
  // Whether a user has explicitly approved this revision (optional strict mode)
  approvedByUser: v.boolean(),
  approvedAt: v.optional(v.number()),
})
  .index("by_owner_page_rev", ["ownerKey", "pageId", "revision"])
  .index("by_owner_page_generatedAt", ["ownerKey", "pageId", "generatedAt"]);

const userWikiNotes = defineTable({
  ownerKey: v.string(),
  pageId: v.id("userWikiPages"),
  // Zone 3 — the user-owned section. Never overwritten by AI.
  body: v.string(),
  // Bounded: 64 KB per page of personal notes
  bodyBytes: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_page", ["ownerKey", "pageId"]);
```

### Bounds (agentic_reliability rule)
- `MAX_USER_WIKI_NOTE_BYTES = 65_536`
- `MAX_WIKI_EDGES_PER_PAGE = 64`
- `MAX_WIKI_REVISIONS_RETAINED = 50` (older revisions pruned by scheduled job)
- `MAX_LINKED_SOURCES_PER_PAGE = 200`
- `MAX_WIKI_PAGES_PER_OWNER = 10_000` (quota; warn at 8k)

### Hash invariant for revisions
`sourceSnapshotHash = cyrb53(stableStringify({ sortedSourceIds, sortedClaimIds, sortedArtifactIds, modelUsed }))`

Same inputs → same hash → same generated prose. Deterministic replay satisfies the `DETERMINISTIC` rule in `agentic_reliability.md` — debugging an odd revision is possible by feeding the snapshot back in.

---

## 6. Regeneration model

### Triggers
1. **User manual refresh** — tap the "Regenerate" button on the page
2. **Pulse-driven** — when a watched entity's Pulse page emits a material change, schedule a wiki regeneration for that entity
3. **Artifact save** — when a `productReport` with a linked entity is saved, enqueue (debounced 5 min) a wiki regeneration for that entity
4. **Scheduled refresh** — daily cron for all pages whose `freshnessState` crosses `recent → stale`

### Flow
```
1. Build source snapshot for the page's target entity/topic:
   - Accepted claims (productClaims where status = "accepted")
   - Saved reports (productReports where entitySlug matches)
   - Canonical sources (canonicalSources referenced by those claims)
   - User's notes (userWikiNotes — read-only input to prompt)
2. Compute sourceSnapshotHash.
3. If hash matches the latest revision → skip (no new work).
4. Else: call modelRouter with category="synthesis" + tier="standard".
5. Write new userWikiRevisions row + update userWikiPages.revision.
6. Recompute userWikiEdges from the generated text (extract relations).
7. Recompute contradictionCount from productClaims where status="contradicted".
```

### Safety rails
- Regeneration goes through the **same `decideArtifactState` gate** as other AI writes — but for wiki-specific `primaryCategory` values (`topic`, `person`, etc.). Adversarial entities → no page created. Low confidence → `draft_only` revision.
- Regeneration output passes through the existing **answer-control pipeline** (`extractClaimsFromSections` → `summarizeClaimLedger`) so any unsupported claim in the generated text is caught **before** the revision is saved.
- If the answer-control pipeline flags unsupported content, the revision is created in `approvedByUser: false, draft` state and is NOT promoted to `userWikiPages.revision`. A card on the wiki page prompts the user to review.

---

## 7. Editing policy (the most important rule)

```
Generated zone (Zone 1)  → regenerated, not casually edited in place
Evidence zone (Zone 2)   → strictly derived; never writable by anyone
User notes (Zone 3)      → user-editable free-form; AI reads but never writes
```

### AI write boundaries
| Layer | AI writes? | User writes? | Notes |
|---|---|---|---|
| `userWikiPages` | via regeneration only | no direct | user can delete a page; deletion propagates to edges + revisions |
| `userWikiEdges` | via regeneration only | no direct | user can *mute* an edge (sets confidence=0) without deleting |
| `userWikiRevisions` | yes, append-only | no direct | historical record, never mutated |
| `userWikiNotes` | read-only | yes (owner) | bounded; never touched by agents |

### Approval mode (optional strict setting)
If user turns on "Require approval for Wiki rewrites" in settings:
- New revisions land with `approvedByUser=false`
- `userWikiPages.revision` does NOT advance until approval
- UI shows the pending revision as a diff vs. current for user to accept/reject

Default: off. Revisions auto-promote if answer-control passes.

---

## 8. Generation prompt contract

```
You are NodeBench's personal-synthesis model. You are regenerating the
user's wiki page for: {{title}} (type: {{pageType}}).

Source material (read-only inputs):
- Accepted claims: [{claimText, sourceUrl, dateAccepted}, ...]
- Saved reports: [{title, summary, updatedAt, sourceUrls}, ...]
- Canonical sources: [{url, fetchedAt, snippet}, ...]
- User notes on this page: "{{userNotes}}"

Output JSON only, matching this schema:
{
  "summary": string,              // 1-sentence lead
  "whatItIs": string,             // 2-3 sentences
  "whyItMatters": string,         // 1-2 sentences with at least one
                                  // claim citation via [claimId]
  "whatChanged": string,          // Last-30-day deltas with [claimId]
                                  // citations
  "openQuestions": string,        // What we are less sure about
}

Rules:
- Cite every specific fact with [claimId].
- Never invent dollar amounts, dates, names that aren't in the claims.
- If evidence is thin (< 3 claims), say so explicitly in openQuestions.
- Never rewrite or summarize the user's notes back at them; treat
  them as private context.
```

The output passes through `extractClaimsFromSections` on every sentence — any specific claim without a `[claimId]` reference is flagged as unsupported and the revision is held for approval.

---

## 9. Integration with existing surfaces

| Surface | Interaction with My Wiki |
|---|---|
| Chat | When a chat yields a saved report for entity X, schedule a wiki regen for Me/Wiki/Company/X |
| Reports | Each report has a "Promote to wiki" button — triggers immediate regen of that entity's wiki page |
| Pulse | Pulse-emitted material changes trigger wiki freshness recomputation |
| Inbox | An inbox item can now be: "Your wiki page on X has a pending revision — review" |
| Deep-sim | Deep-sim scenarios can link TO a wiki page but never rewrite it |
| Gemini Deep Research adapter | Its outputs flow through the same answer-control gate before landing in a wiki revision |

---

## 10. API surface (Convex)

### Queries
- `listWikiPages({ pageType?, limit?, cursor? })` — paginated, per-owner
- `getWikiPage({ slug })` — returns page + current revision + notes
- `getWikiPageRevisionHistory({ pageId, limit })` — max 50
- `listRecentlyUpdatedWikiPages({ limit })` — index-backed, since-timestamp
- `listContradictions({ limit })` — pages where contradictionCount > 0
- `listOpenQuestions({ limit })` — pages where freshness=stale OR openQuestions is non-empty

### Mutations
- `upsertUserWikiNotes({ pageId, body })` — user notes only
- `muteWikiEdge({ edgeId })` — sets confidence=0 (soft delete)
- `deleteWikiPage({ pageId })` — cascades to edges + revisions
- `approveWikiRevision({ revisionId })` — used in approval mode

### Actions (background)
- `regenerateWikiPage({ slug })` — node action; calls modelRouter + answer-control
- `pruneOldWikiRevisions()` — scheduled daily; keeps last 50 per page
- `recomputeFreshnessForStalePages()` — scheduled hourly

### What's intentionally not exposed
- No `createWikiPageManually` mutation — pages are only born from structured events (chat → report → synthesis)
- No `directWriteGeneratedContent` — Zone 1 is regen-only

---

## 11. UI component shape

### `<WikiPageHeader />`
- Title + type badge + freshness pill + contradiction count
- Right-side controls: "Regenerate" button + "View history" + "Delete page"

### `<WikiGeneratedZone />`
- 4 sections rendered from latest revision
- Each specific claim is a `<CitationChip claimId="..." />` — tap opens the claim drawer
- Footer: "Regenerated {X} ago by {modelUsed} · [{revisionNumber}]"

### `<WikiEvidenceZone />`
- Source list with favicons + fetch time
- Contradictions subsection (collapsed by default unless >0)
- "Jump to report" links

### `<WikiNotesZone />`
- Markdown editor (existing notebook block editor reused)
- "Your notes" header
- Character counter (64 KB cap)
- `data-testid="wiki-user-notes"`

### `<WikiPendingRevisionBanner />`
- Appears only when a revision is held for approval
- "A new draft of this page is ready. Review changes."
- Diff view: side-by-side Zone 1 old vs new

### Accessibility
- Zone 1 wrapped in `role="region" aria-label="AI-maintained summary"`
- Zone 2 wrapped in `role="region" aria-label="Evidence and sources"`
- Zone 3 wrapped in `role="region" aria-label="Your notes"`
- Regenerate button: `aria-busy` + live announcement when regen completes
- Contradiction count: icon + text (never color-alone per `reexamine_a11y`)

---

## 12. Rollout plan

### Phase 1 — Read-only generated pages (Week 1)
- Land `userWikiPages` + `userWikiRevisions` tables
- Read-only UI: Overview, Companies, People surfaces inside Me/My Wiki
- Regeneration triggered only on manual refresh
- No edges yet, no notes yet
- Pages source data from existing `productReports` entityslug index

**Demo moment:** open Me → My Wiki → Company → Stripe. See "What it is · Why it matters · What changed · Open questions" with claim citations.

### Phase 2 — Notes zone (Week 2)
- Land `userWikiNotes` table + mutations
- Notes panel on every wiki page
- AI reads notes as context in regeneration prompt (but never writes back)

### Phase 3 — Edges + contradiction surfacing (Week 3)
- Land `userWikiEdges` table
- Regeneration extracts relations → edge writes
- "Related" subsection on every page
- Dedicated "Contradictions / Open questions" root tab in My Wiki

### Phase 4 — Pulse + Inbox integration (Week 4)
- Auto-regeneration on Pulse material change
- Inbox items for pending revisions
- Approval mode setting + diff UI

### Phase 5 — Graph navigation (future)
- Cross-link graph view (lightweight)
- "Jump to related" chips on every page
- Search across all wiki pages

---

## 13. Metrics to watch

Recorded to `userBehaviorEvents` (existing table):
- `wiki.page.viewed` — per-page engagement
- `wiki.page.regenerated` — manual vs auto split
- `wiki.note.edited` — Zone 3 usage rate
- `wiki.revision.pending` — queue depth for approval mode
- `wiki.edge.muted` — how often user overrides AI-derived relations
- `wiki.contradiction.acknowledged` — user interaction with contradiction cards

### Health gates
- Regeneration success rate > 95%
- Answer-control unsupported-claim rate on new revisions < 5%
- Mean time to first wiki page after sign-up < 60s (first chat → first saved report → first wiki page)
- Mean notes-edit rate > 10% of pages viewed (if lower, user isn't adding personal signal — Zone 3 may be failing its job)

---

## 14. Anti-patterns — banned

- Treating `userWikiPages` as writable source of truth (e.g., "we couldn't find this fact in productReports, let's just update the wiki")
- Direct AI edits to Zone 1 without a new revision row
- Any AI write to `userWikiNotes`
- Pages auto-creating without a corresponding artifact (Phase 1 requires artifact precedence)
- Unbounded revision retention (must prune)
- Silent revision auto-promote when answer-control flagged unsupported content

---

## 15. What this rule enforces (repo-level integration)

- New Convex domain file: `convex/domains/product/userWiki.ts` with queries + mutations + actions
- New schema tables listed in §5 added to `convex/schema.ts` after `extractedSignals`
- New component folder: `src/features/me/components/wiki/` (Wiki* components)
- New route: `/me/wiki/:pageType/:slug`
- New sub-nav in Me surface
- Existing save paths updated: `convex/domains/product/chat.ts` saveProductReport handler → after report insert, `scheduleRegenerationForEntitySlug`
- `.claude/rules/me_wiki_write_policy.md` — new rule file locking in the Zone-1-regen-only, Zone-3-user-only write boundary

---

## 16. Prior art cited

- **Karpathy-style "AI as maintainer"** — the model of using AI to compound an individual's notes over time. This spec adapts it with the explicit constraint that the AI-maintained output is *derivative*, not authoritative.
- **Hybrid DB-as-truth + wiki-as-view** — the uploaded analysis's core recommendation. Structured state is primary; wiki is a regenerable lens.
- **Notion "AI pages" (2024)** — same three-zone pattern (generated summary + linked database + manual notes). Ours adds stricter write boundaries + provenance.
- **Apple Notes Intelligence (2024)** — on-device summary generation on personal corpora. Our Zone-1 regeneration is the NodeBench analog, server-side with answer-control gating.
- **Obsidian canvas / Roam backlinks** — the wiki-edge pattern borrows the backlink idea but confines it to AI-derived edges with explicit provenance, not user-authored ones.

---

## 17. Related in this repo

- `convex/schema.ts` — where new tables land
- `convex/domains/product/chat.ts` — hook for post-save wiki regen
- `convex/domains/search/sharedCache.ts` — CSL/ESL which wiki reads for source attribution
- `convex/domains/agents/safety/artifactDecisionGate.ts` — gate for wiki revision promotion
- `convex/domains/agents/safety/lowConfidenceGuard.ts` — used during regen to skip synthesis when retrieval is thin
- `.claude/rules/agentic_reliability.md` — BOUND, HONEST_STATUS, DETERMINISTIC apply
- `.claude/rules/scratchpad_first.md` — wiki revisions are *structured output*, so they follow scratchpad → structure pattern
- `.claude/rules/reexamine_design_reduction.md` — earned complexity test: don't let the wiki grow a 6th root tab
- `docs/architecture/FAST_SLOW_RUNTIME_SPEC.md` — shared runtime principles
- `docs/architecture/NODEBENCH_OPERATING_MEMO_2026_04_22.md` — 5 product checkpoints; My Wiki doesn't introduce a 6th, it deepens Checkpoint 3 ("the artifact is the product")

---

## 18. The shortest possible framing

> My Wiki is a read-mostly, AI-maintained, source-linked, user-annotated personal knowledge lens — generated from NodeBench's structured durable truth, never replacing it. Zone 1 regenerates. Zone 2 proves. Zone 3 is yours.

That is what goes on the Me page.
