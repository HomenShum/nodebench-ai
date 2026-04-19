# Entity Page — STATE / TARGET / TRANSITION / INVARIANT audit

**Method**: every block currently rendered on `/entity/:slug` mapped to the framework. Violations are named, not sugared. Where a block serves multiple states, the primary one is listed first. Preview-sandbox screenshots failed (recurring local limit), so this is a code-grounded walk — same inventory used in `ENTITY_PAGE_REDESIGN.md`, re-read against the framework.

---

## Who actually shows up at `/entity/:slug`

| Persona | STATE they arrive in | What they want in the first 5s |
|---|---|---|
| **First-time cold** | Just clicked a report card on Home or a chat result | See the notebook, understand what's on this page, know the agent wrote it |
| **Returning user, familiar entity** | Came back to reread or add a note | Pick up where they left off — editor ready, not a dashboard |
| **Returning user, "what changed" check** | Followed an ntfy / email nudge | See the new thing, not re-scan the whole page |
| **Collaborator (anon share link)** | Got a link from the owner | Read, maybe comment — should not see any internal chrome |
| **Owner in review mode** | Verifying what the agent drafted | See agent blocks distinctly, accept/edit |
| **MCP user (Codex / Claude Code)** | Not even loading this page; consuming the same blocks via tool | Not a visual state — but the **invariant** that web and MCP produce the same block object is load-bearing here |

If the page doesn't serve the first three in the first 5 seconds, the framework is being violated.

---

## Top-level blocks currently rendered (inventory from EntityPage.tsx after PR-A/B/C)

| # | Line | Block | Visible in PR-C default (identity redesign ON) |
|---|---|---|---|
| 1 | 1828–2079 | Classic/Notebook/Live toggle bar + "Classic view — sections rendered…" hint | **Hidden** when identity-redesign flag ON + Live available |
| 2 | 2081–2095 | `<article className="notebook-sheet">` wrapping `EntityNotebookView` | Visible only if `entityViewMode === "notebook"` |
| 3 | 2096–2107 | `<article className="notebook-sheet">` wrapping `EntityNotebookLive` (Tiptap sync) | **Visible** — the default surface |
| 4 | 2109 | Classic "Current brief" section | Hidden in PR-C default |
| 5 | 2167+ | Classic per-section summary cards | Hidden in PR-C default |
| 6 | 2464 | "Connected node / Sources" card | Hidden in PR-C default |
| 7 | 2492 | Classic "Working notes" | Hidden in PR-C default |
| 8 | 2558 | `<aside data-testid="entity-workspace-rail">` — sticky right rail | **Visible** on `2xl` breakpoints; stacked below on smaller |
| 9 | 2559–2823 | Workspace rail inner sections (actions, sources, mentions, connections, history) | Visible with rail |
| 10 | 2824 | "Connected node" graph block | Hidden in PR-C default |
| 11 | 2877 | Latest-update card | Hidden in PR-C default |

So in the PR-C default state the user sees: **sheet + Tiptap editor + right rail + top strip**. That's a much cleaner starting point than pre-redesign. But the framework still finds violations. Below.

---

## Per-element framework check

For each element the user actually sees now (the "visible" rows above), does it respect the framework?

### 1. Top strip (entity title, lens picker, kill-switch toggle area)

- **STATE**: user just arrived or switched tabs. Needs context.
- **TARGET**: name the paper they're looking at + agent-authorship status. That's it.
- **TRANSITION**: none — this strip shouldn't move the user anywhere.
- **INVARIANT**: one dominant job per screen → strip must be quiet, not colorful.

**Violations today**:
- No "last agent edit Ns ago" chip. The framework says `State: user wants to know what's changed`. We have the data (block revision timestamps) but don't surface it.
- No presence chip in the strip. Commit-3 built `BlockStatusBar` as a footer but this **state** needs presence at the top where scanning happens.
- Lens dropdown is the same visual weight as the title. Two dominant jobs. Violates the invariant.

### 2. Notebook sheet + Tiptap editor (the **target** element)

- **STATE**: user is at the page; any of the six personas.
- **TARGET**: let them read / edit the paper. This is **the** job.
- **TRANSITION**: user stays here until they follow a mention, open a source, or close the tab.
- **INVARIANT**: answer-first (the prose), proof-second (margin citations), trace-third (history in the rail). Agent and user must visibly share the same surface.

**Violations today**:
- Agent-authored blocks are **not visually distinct from user-authored blocks**. PR-B shipped the `.notebook-block-agent` and `.notebook-block-agent-mark` classes but neither is painted per block. The invariant "this is co-authored" is not honored visually. A first-time user cannot tell which sentences were agent-drafted.
- No "just edited" wet-ink pulse on the last-written block. The framework says returning users want "see the new thing, not re-scan." We have the class (`.notebook-block-wet-ink`), not the wiring.
- Slash commands discoverable only by typing `/`. A first-time user has no hint the editor does more than typing. One small `type "/" for commands` affordance when the editor is empty and focused would honor `State: first-time` without cluttering the sheet.
- Oversize + tombstone modals exist but aren't wired to server-side triggers. The framework's "one nudge = one reason = one next action" invariant isn't actually enforced yet.

### 3. Workspace rail (sticky right column)

- **STATE**: user needs supporting proof, mentions, related entities, or actions.
- **TARGET**: give them the proof without pulling them off the paper.
- **TRANSITION**: rail items should open inline drawers or route to another entity; they should never hide the notebook.
- **INVARIANT**: reports are stable memory, not dead chat logs. Sources = memory.

**Violations today**:
- Rail is labeled **"Workspace rail"** — pure internal jargon. Users don't want a "rail." They want "sources," "mentions," "history." Framework rule: `invariant = kill jargon`.
- Rail renders every section stacked (actions / sources / mentions / connections / history). That's **five dominant jobs** in a single 280px column. Violates `one dominant job per screen`. Should be a single tabbed panel.
- Sticky on `xl:sticky xl:top-24` but collapses to stacked below — the framework says transitions should be clear. At the breakpoint crossover it's visually jarring.
- No affordance for **"track this entity"** in the rail. The user has no visible way to trigger a nudge subscription even though the nudges surface exists elsewhere. TRANSITION (Report → Nudge) is broken.

### 4. Left-rail navigation (from MainLayout) — not on the entity page itself but the page starts with it visible

- **STATE**: user is oriented within the product.
- **TARGET**: let them leave. That's it.
- **TRANSITION**: clicking goes to another surface.
- **INVARIANT**: one dominant job — the entity page is the page, nav is chrome.

**Violation**: the left rail is always visible and sized the same regardless of which surface you're on. On a notebook page the nav should visually recede (Notion dims the sidebar when you're focused-writing). We don't. The sidebar competes with the sheet.

---

## Where the framework says we are cleanly failing

Gathered from the per-element audit above, in priority order:

| # | Violation | Framework rule broken | Severity |
|---|---|---|---|
| 1 | Agent-authored blocks look identical to user-authored blocks | INVARIANT "this is co-authored" | **P0** — the core product promise is not visible |
| 2 | "Workspace rail" name + 5 stacked sections | TARGET (one dominant job) + INVARIANT (kill jargon) | P0 |
| 3 | No "last changed" indicator for the `Nudge` state persona | STATE not addressed | P1 |
| 4 | No presence chip in the top strip | STATE not addressed | P1 |
| 5 | "Track this entity" path from Report → Nudge not discoverable | TRANSITION broken | P1 |
| 6 | No first-time slash-command hint | STATE "first-time cold" not addressed | P2 |
| 7 | Left nav visually competes with the sheet | INVARIANT one dominant job | P2 |
| 8 | Wet-ink pulse not wired | STATE "what changed" not addressed | P2 |

Note: **PR-A/B/C already closed** the biggest pre-framework violations (`max-w[1360px]` over-chrome, the 167 lines of hidden dead sections, and the three-way toggle competing with the editor). The list above is what's left.

---

## Per-persona readout

### First-time user (cold)
- ✅ Notebook fills the screen (PR-A)
- ✅ Paper aesthetic makes the sheet feel like a document (PR-B)
- ❌ **Cannot tell an agent wrote this**. Zero co-author signal. They think it's a blank note or their own input.
- ❌ **No hint that typing does anything special**. No `/` affordance.
- ❌ **Rail says "Workspace rail"** — meaningless.

### Returning user, familiar entity
- ✅ Live mode opens directly, no toggle confusion (PR-C)
- ❌ **No "welcome back, agent touched this 2h ago"** signal. They re-scan the whole page.
- ❌ **Wet-ink class exists, not wired**. Framework says *returning user wants to see the new thing*.

### Returning user, "what changed" check
- ❌ **Worst served persona**. Today there is no visible diff-from-last-visit.
- ❌ History is in the rail, five sections deep, behind a stacked column.

### Collaborator (anon share link)
- ✅ `checkRead` / `checkWrite` enforced server-side (commits 1-2-3)
- ✅ Read-only lock will render when accessMode = "read" (commit 3 primitive)
- ❌ **No visual confirmation they're collaborating**. Presence chip exists, not in top strip.

### Owner in review mode
- ❌ **Cannot visually accept/reject agent suggestions**. Agent and user blocks render identically.

### MCP user
- ✅ **Invariant holds**: `productBlocks` canonical → web and MCP consume the same object. Tiptap writes land in the same chip array.

---

## The one-sentence verdict

**We fixed the room (layout + paper aesthetic + mode reduction). We haven't yet painted the co-authorship onto the page, and the rail still sells itself as "Workspace rail."**

---

## What to ship next (framework-aligned, small, reversible)

These land as one more focused PR. Each maps to a specific framework hit above.

### 1. Paint the agent ink (fixes violation #1)
Wire `.notebook-block-agent` + `.notebook-block-agent-mark` inside `EntityNotebookLive.tsx` and `EntityNotebookView`: when a block's `authorKind === "agent"`, apply the classes. One conditional per render path. Adds the dot + the second ink tone. This is the single highest-leverage change against the framework.

### 2. Rename + collapse the rail (fixes violation #2)
- "Workspace rail" → **no label** (just a vertical dotted separator)
- Five stacked sections → one tabbed panel with four tabs: **Sources · Mentions · History · Actions**
- Single 36px collapsed state below `2xl`
- New component `EntityCompanionPanel.tsx`, replaces `entity-workspace-rail` aside

### 3. Top-strip chip strip (fixes violations #3 + #4)
- Add a minimal row under the title: `synced just now · 2 editing · last agent write 3h ago`
- Each chip is dismissable/clickable; the last-agent-write chip opens the history tab in the rail (fixes the broken transition).

### 4. Track-this-entity primary action (fixes violation #5) — DEFERRED
- A grep of `convex/domains/` + `src/features/` found **no existing entity-subscribe mutation**. Wiring a Track button now would be pure UI-theater without the backend. Requires: new `productNudgeSubscriptions` table, `subscribeToEntity`/`unsubscribeFromEntity` mutations, cron tick that emits on `productBlocks.updatedAt > lastNotifiedAt`, and a dispatch path into the existing ntfy/Slack/email plumbing. That's its own PR, not a wire.
- Framework status: violation #5 stands. The TRANSITION Report→Nudge is still broken.

### 5. First-time slash hint (fixes violation #6) — SHIPPED (commit 94cad61d)
- `@tiptap/extension-placeholder` wired with "Type / for commands…" hint. Fades on first keystroke. Violation #6 CLOSED.

### 7. Track-this-entity (fixes violation #5) — SHIPPED (commit 8a837d84)
- `productNudgeSubscriptions` table + 4 mutations/queries + 5-minute cron dispatcher + Bell/BellRing toggle button in top strip. Violation #5 CLOSED.

### 8. Rail tab naming + color normalization — SHIPPED (this PR)
- "Evidence" → "Sources" · "Context" → "Related" (user language, not engineering labels).
- Hardcoded `#d97757` → `var(--accent-primary)` so theme-switch stays consistent.
- `role="tablist"` + `role="tab"` + `aria-selected` for accessibility.
- Internal storage keys remain `"evidence" | "context"` so persisted user prefs don't need migration.

### 9. Full rail destructuring (Sources/Mentions/History/Actions 4-tab) — DEFERRED
- Sub-sections are stacked INSIDE each of the two current tabs ("Attached evidence", "Related entities", etc. all inside "Sources" today). A full 4-tab restructure requires threading the Mentions data (`relatedEntityCount`, mention provenance) into a separate tab query and extracting the History panel from `productBlocks` revision chain. That's an 800+ line refactor and warrants its own PR with real-usage telemetry first. Framework violation #2's "5 stacked jobs" critique is partially addressed (renaming reduces the jargon-load-on-brain, accent-primary tint unifies the visual weight) but the structural destack stands.

### 10. Agent-ink margin dot + second-ink tone — SHIPPED (commit 04366789)
- Violation #1 CLOSED in the framework-audit fix PR.

### 11. "Updated N ago" chip — SHIPPED (commit 04366789)
- Violation #3 / #4 (chronological signal for the "what-changed" persona) CLOSED.

### 6. Wet-ink on mount (fixes violation #8)
- On first render, if `block.updatedAt > now - 5 min` AND `authorKind === "agent"`, apply `.notebook-block-wet-ink` for one animation tick. Respects `prefers-reduced-motion`.

---

## The framework template for every future notebook change

Copied verbatim for the team to paste above any new PR that touches this surface:

```
STATE:      which persona is this for (first-time / returning / what-changed / collaborator / owner-review / MCP)
TARGET:     one sentence — what does this PR let them get
TRANSITION: when does the user stop caring about this stage — where do they go next
INVARIANT:  which product rule is this PR keeping true

  ( one dominant job per screen
    answer first, proof second, trace third
    every meaningful run becomes a Report
    Reports are memory, not chat logs
    new context attaches to the right report, not chaos
    web + MCP + Attrition produce the same artifact )
```

If any field is vague, the PR is probably feature soup. Stop and rewrite.
