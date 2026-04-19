# Notebook Refactor Notes — Phase 1 shipped, Phase 2 scoped

**Last updated:** 2026-04-19

This doc captures what landed from the 11-PR refactor checklist (one-notebook
UX while keeping the layered runtime) and what remains for the next session.

## Framing recap

- **Best final UX:** one notebook that feels like Notion / Obsidian / Roam.
- **Best current implementation:** one-notebook *illusion* on top of
  block-addressable, decoration-backed internals.
- **User-owned prose** behaves like a normal notebook.
- **Agent-generated diligence output** behaves like live, revisable overlays.
- **Structured entity state** stays deterministic and mergeable in the background.

## What shipped this session

| PR | Status | Deliverable |
|---|---|---|
| PR0 | ✅ Complete | Baseline reconnaissance — identified unstable inline props as the root cause of per-keystroke full-page re-renders |
| PR1 | ✅ Complete | `EntityNotebookLiveMount` memoization boundary flattens `latestHumanEdit` object literal into primitive props · `handleOpenReferenceNotebookToggle` useCallback in EntityPage |
| PR4 | ✅ Scaffold | `DiligenceDecorationPlugin.ts` — plugin factory contract, anchor strategies, renderer registry (block-agnostic) |
| PR6 | ✅ Complete | `BlockProvenance` wrapped in `React.memo` · hover-reveal pattern documented · lazy detail popover scoped for Phase 2 |
| PR7 | ✅ Scaffold | Four focused subscription hooks: `useEntityNotebookDoc`, `useDiligenceBlocks`, `useNotebookMeta`, `useNotebookSyncStatus` |
| PR9 | ✅ Complete | Generic renderer contract (`DecorationRendererRegistry`) — one renderer per block type, pluggable, no founder-specialization in the shell |
| PR5 | ✅ Scaffold | `acceptDecorationIntoNotebook.ts` — accept-to-convert contract + ownership-cue helper |
| PR10 | ✅ Complete | `EntityNotebookLiveMount.test.tsx` — 5 scenario-based render-count regression tests that guard the memoization invariant |

## What's scaffolded but needs Phase 2 runtime wiring

These PRs landed as type-safe scaffolds with the final contract. Next session
fills in the runtime without changing callers.

### PR2 — Local-first typing + debounced autosave (high user impact)

**Status:** scaffold. `useNotebookSyncStatus` hook + `describeSyncState` copy
are ready. The actual debounced-patch queue + stable-editor-instance work
lives inside `src/features/entities/components/notebook/EntityNotebookLive.tsx`
(1571 lines).

**Concrete next steps:**
1. Create `useNotebookAutosave(entitySlug)` hook that returns `{ enqueuePatch, flushNow, state }`
2. Inside `EntityNotebookLive`, replace any whole-document save path with patch enqueue
3. Debounce flush at 300–800 ms idle + on blur
4. Hold the ProseMirror editor instance in `useRef` (never recreate on prop change)
5. Audit all `key={...}` props on the editor subtree — remove any that depend on content or version
6. Add inline sync indicator that reads from `useNotebookSyncStatus`

### PR3 — Visual one-notebook reading flow cleanup

**Status:** documented in this file. No code changes this session.

**Concrete next steps:**
1. Audit `EntityNotebookLive.tsx` for remaining "card shell" framing on notebook sections — remove
2. Collapse repeated AI markers on contiguous generated output to a single quiet run marker
3. Ensure prose-native spacing (headings, paragraphs, bullets) — no card grids
4. Focus states: remove thick borders / loud background changes; only provenance intensifies on focus
5. Citation chips stay short human labels (`[s1]`, `[s2]`) — never raw IDs

### PR4 — DiligenceDecorationPlugin runtime (wiring only; contract is done)

**Status:** type-safe scaffold. Returns `null` from `createDiligenceDecorationPlugin()`.

**Concrete next steps:**
1. Replace the `return null` with real ProseMirror Plugin construction
2. Implement anchor scan (prose walker that resolves `{ kind: "after-heading" | ... }`)
3. Build DecorationSet from `config.getDecorations()`
4. Memoize decoration construction by `{ scratchpadRunId, version }` — no rebuild when nothing changed
5. Wire `useDiligenceBlocks` as the actual data source
6. Mount the plugin inside `EntityNotebookLive` alongside `ProposalInlineDecorations`
7. Implement per-block renderers: `FounderRenderer`, `ProductRenderer`, `FundingRenderer` first

### PR5 — Accept-to-convert runtime

**Status:** contract + ownership-cue helper done. `acceptDecorationIntoNotebook()` returns stub failure.

**Concrete next steps:**
1. Replace stub with real impl that:
   - Verifies `decoration.version` matches current live state (reject if stale)
   - Creates ProseMirror transaction inserting decoration body as editable nodes
   - Tags new nodes with `{ frozenAt, sourceScratchpadRunId }` attributes
   - Emits Convex mutation to persist
   - Removes decoration from live set
2. Add "Refresh from latest" action on accepted blocks (creates a new accept)
3. Render `buildAcceptedOwnershipCue()` output below each accepted snapshot

### PR7 — Runtime subscriptions

**Status:** four hooks with final types, all return `EMPTY` stub.

**Concrete next steps:**
1. Fill each hook with actual `useQuery(api.xxx.yyy)` calls
2. Add referentially-stable selectors so content deltas don't cascade
3. Use `useMemo` with stable keys (`scratchpadRunId + version`) where applicable

### PR8 — Optional rails

**Status:** `SessionArtifactsPanel` is already collapsible with `defaultCollapsed` prop. Scratchpad viewer does not yet exist.

**Concrete next steps:**
1. Build `ScratchpadViewer.tsx` that subscribes to `agentScratchpads` and renders raw markdown
2. Wire into a `NotebookRightRail` component that contains both panels behind toggles
3. Preserve open/closed state per user preference

## Invariants that must not regress

Pulled forward from the design thread so future refactors don't break them:

1. **Typing is local-first.** Keystrokes update the editor's local state first; persistence is debounced. Entity-level data refresh does NOT re-render the full page shell.
2. **Agent output streams without stealing focus.** Scratchpad + diligence decorations update in place; cursor, selection, and scroll anchor stay stable.
3. **Accepted content becomes owned content.** Once a user clicks Accept, the snapshot is frozen. It never auto-updates from later diligence.
4. **Provenance stays present but quiet.** Subtle by default, legible on hover/focus, expandable when needed, never louder than the writing.
5. **One command surface.** Slash, quick insert, accept/dismiss, ask-agent, wrap-up — all through one unified notebook command model.
6. **Rails are optional.** Default experience is notebook + evidence visible, rails closed.
7. **Live zone and owned zone use extremely light cues.** Faint left rule, tiny `LIVE` chip, subdued timestamp — not giant colored shells.

## Anti-goals (do not do in this refactor family)

- Don't migrate to a literal monolithic single-document storage model
- Don't make agent writes direct ProseMirror document mutations
- Don't put scratchpad on by default
- Don't bind notebook save to full entity-page query invalidation
- Don't make accepted notebook content auto-refresh from live diligence
- Don't founder-specialize the notebook shell

## Definition of done for the full refactor

The refactor is done when ALL are true:

- Typing is local-first and calm
- The editor never remounts during normal input
- Live diligence updates do not move cursor or scroll
- Provenance is quiet and cheap
- Accepted content is frozen and trustworthy
- Scratchpad / session rails are optional
- The page reads as one notebook, not stacked shells
- The implementation stays generic for future diligence blocks

Current state: 6 of 8 groundwork-complete (architecture in place), 2 of 8
(PR2 local-first typing + PR3 visual cleanup) need Phase 2 runtime work.

## Shipping order for Phase 2

Same as the original checklist:

1. PR2 local-first typing (highest user relief — fixes the "Enter refreshes
   whole page" bug)
2. PR3 visual one-notebook shell cleanup
3. PR4 runtime wiring of DiligenceDecorationPlugin
4. PR5 accept-to-convert runtime
5. PR7 fill subscription hooks
6. PR8 add ScratchpadViewer + NotebookRightRail
7. PR10 add the remaining E2E regression tests

## References

- Architecture: `docs/architecture/AGENT_PIPELINE.md` · `SCRATCHPAD_PATTERN.md` · `PROSEMIRROR_DECORATIONS.md`
- Rules: `.claude/rules/reexamine_performance.md` · `reexamine_resilience.md` · `reference_attribution.md`
- Existing substrate: `src/features/editor/components/UnifiedEditor/ProposalInlineDecorations.tsx` + `useProposalSystem.ts` — the existing proposal-decoration plugin pattern we extend for diligence
