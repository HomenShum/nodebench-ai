# ProseMirror Decorations — Diligence Blocks in the Live Notebook

**Status:** Living · Last reviewed 2026-04-19
**Owner:** Core team

## TL;DR

Diligence blocks render as **ProseMirror decorations** (read-only overlays) on top of the collaborative notebook, never as native document nodes. This pattern avoids conflict with user edits and real-time sync, while still letting users **accept** a block's content into editable prosemirror nodes if they want to own it.

## Prior art

| Reference | Pattern |
|---|---|
| **Notion AI blocks** | Agent output as accept-or-dismiss cards inside docs |
| **Arc Boosts** | Decoration-layer UI without altering underlying content |
| **Mem.ai auto-captures** | Passive capture suggestions — decoration-first |
| **Cursor composer inline diffs** | Suggested edits layered above source, accept per-hunk |

## Invariants

1. **Decorations don't occupy document slots.** They cannot conflict with user edits or sync.
2. **Accept-to-convert is frozen.** Once user accepts a block into editable content, it stops auto-updating. The unaccepted (decoration) form stays live.
3. **Dismiss is reversible.** Dismissed decorations stay in the underlying entity — removed only from this notebook's view.
4. **Anchor points respect user content.** Decorations sit *below* any freeform user heading, *above* any subsequent user heading.
5. **Prose-native rendering.** Blocks render as paragraphs and lists, not as transplanted React card grids.

## Architecture

```
┌──────────────────────────────────────────────┐
│ ProseMirror document                         │
│ ─────────────────────────────────────────────│
│ # About (user-written)                       │
│ Lorem ipsum ... (user content)               │
│                                               │
│ [ANCHOR: diligence-blocks]                    │
│ ┌ Decoration: FOUNDERS ─────────────┐        │
│ │ Identified 2 founders ...          │        │
│ │ [verified] [high confidence]       │        │
│ │ [Accept] [Refresh] [Dismiss]       │        │
│ └────────────────────────────────────┘        │
│ ┌ Decoration: PRODUCTS ─────────────┐        │
│ │ Acme offers 3 products ...         │        │
│ └────────────────────────────────────┘        │
│ ┌ Decoration: FUNDING, NEWS, ... ───┐        │
│ └────────────────────────────────────┘        │
│                                               │
│ # My notes (user-written)                    │
│ ...                                           │
└──────────────────────────────────────────────┘
```

## Data model

Decorations are a pure UI layer — backed by the already-existing `contributionLog` and structured block data. No new table.

`DiligenceDecorationPlugin.ts` subscribes to:
- `getEntityStructuredBlocks(entitySlug)` — returns the structured data per block
- `getEntityFreshness(entitySlug)` — returns per-block `last updated`

On each update, the plugin computes the new decoration set and diffs against prior.

## Accept-to-convert behavior

When user clicks "Accept into notebook" on a block decoration:

1. Capture current decoration content as a ProseMirror snapshot
2. Insert real prosemirror nodes at the anchor position (heading + bullet list + chips)
3. Emit a "frozen content" marker — future decoration updates skip this block
4. prosemirror-sync propagates the new nodes to collaborators normally

The user can later "unfreeze" to resume auto-updates — toggle stored in entity metadata.

## Collaborative-edit safety

- Decorations are per-user view overlays — no sync implications
- Accept creates real nodes → standard prosemirror-sync path
- Two users simultaneously accepting the same block → one wins the insert, the other sees the new nodes appear
- Pipeline writes never touch the document directly → no merge conflicts

## Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Anchor heading deleted mid-run | Plugin re-anchors to `[ANCHOR]` marker or document start | Decorations reflow, no data loss |
| User's document grows very long (10k+ nodes) | Performance budget | Lazy-render decorations only when scrolled near anchor |
| Accept-to-convert while pipeline is updating | Snapshot-then-insert is atomic | User gets the snapshot at the moment of click; future updates skip this block |

## How to extend

To add a new block's prose-native renderer:

1. Create `src/features/entities/components/notebook/renderers/<Block>Renderer.tsx`
2. Renderer must be pure: takes structured data, returns a ProseMirror decoration description
3. Register in `DiligenceDecorationPlugin.ts` block registry
4. Same component is reused for the Classic view (non-notebook)

## Related

- [DILIGENCE_BLOCKS.md](DILIGENCE_BLOCKS.md) — the structured data each renderer consumes
- [REPORTS_AND_ENTITIES.md](REPORTS_AND_ENTITIES.md) — the entity page where the notebook lives

## Changelog

| Date | Change |
|---|---|
| 2026-04-19 | Initial spec of decoration-first rendering + accept-to-convert |
