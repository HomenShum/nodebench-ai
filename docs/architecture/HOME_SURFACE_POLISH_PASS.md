# Home Surface — Polish Pass against Industry Benchmarks

**Date**: 2026-04-19 · **Reference**: screenshot of `localhost:5173/?surface=home` · **Benchmarks**: Perplexity, Claude, Linear, Notion, ChatGPT

## What the current Home reads like

Dark surface with warm gradient · center-stage composer · "What do you want to understand?" hero · lens pills row · "Pick up where you left off" with three recent reports. Everything needed is already there. What's off is **hierarchy + density + card consistency** — the page looks like a proof-of-concept, not a product.

## Top 8 improvements, ranked by impact

### 1. Composer: cavernous textarea → tight, purposeful input (P0)

**Problem**: textarea is ~6 lines tall with only 2 lines of placeholder. The empty space reads as "nothing is happening here." Perplexity's composer is tall enough to feel inviting (3 lines) but never looks empty.

**Fix** in the composer component (`src/features/product/components/ProductIntakeComposer.tsx`):
- `min-h-[140px]` → `min-h-[96px]` · `max-h-[320px]` auto-grow
- Add focus-ring glow: `focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/30`
- Placeholder becomes one sentence, not a wrap ("Paste a LinkedIn URL, drop a pitch deck, or describe the company")

### 2. Button hierarchy: two equal-weight buttons → one primary, one ghost (P0)

**Problem**: "Attach files" and "Start run" both look like buttons. Perplexity + Linear + Claude all pick ONE primary action per form.

**Fix**:
- `Start run` → filled `bg-[var(--accent-primary)]` + white text + keyboard hint `⌘↵` in the label
- `Attach files` → ghost (no bg, neutral border), paperclip icon only on mobile
- Disabled state on `Start run` when textarea is empty — current behavior is passive

### 3. Lens pills: mixed weight → uniform row with clear active (P1)

**Problem**: "Founder" is solid terracotta, the others are muted text. Looks like Founder is "default" — fine — but the inactive pills could be prettier. Linear's segmented control is the reference.

**Fix** (same component):
- Wrap pill row in `border border-white/10 rounded-full p-1` to make it read as a segmented control
- Inactive pills: transparent bg, muted text
- Active pill: `bg-[var(--accent-primary)]` + white
- Hover on inactive: `bg-white/5` (subtle reveal)
- Add `aria-pressed` for a11y

### 4. Hero label "● NEW RUN" → remove or demote (P1)

**Problem**: The "● NEW RUN" pill competes with the h1. ChatGPT and Claude don't label their hero — the composer IS the call to action.

**Fix**:
- Delete the pill entirely, or move it as a thin timestamp-ish tag under the subtitle at `text-[10px] tracking-[0.2em] opacity-60`

### 5. Helper text: one long paragraph → two lines max (P1)

**Problem**: "Accepts: LinkedIn/GitHub/X URLs · press articles · pitch decks (.pdf/.pptx) · bios (.pdf/.docx/.md) · recruiter & founder notes. Drag files or attach them below." wraps to two rows and reads like paperwork.

**Fix**:
- First line: `Accepts LinkedIn URLs, pitch decks, bios, notes.`
- Second line (as a `<details>` or collapsible chip): `Supported file types ↓`
- Alternately: replace with 4 small icon-only chips (link, PDF, doc, text) with `title` tooltips

### 6. Recent report cards: inconsistent thumbnails + height mismatch (P1)

**Problem**: We fixed the height-mismatch in PR-A (flex h-full + min-h on summary). But the **thumbnail gradients are inconsistent** — left card is near-solid dark, middle is brown-to-black, right is brown-to-black. Looks like three different tone indices picked per render.

**Fix** (`src/features/home/views/HomeLanding.tsx` + `ProductThumbnail.tsx`):
- Audit `getReportThumbnailTone(type, lens, index)` — today it returns 0-5 based on type/lens mix, but index fallback causes randomness. For "Company" type, always pin tone `0` unless there's a meaningful signal (lens === "investor" picks 1, banker picks 5).
- Move the `4/18/2026` date from top-right corner to bottom-meta area alongside "SYSTEM INTELLIGENCE" (date is metadata, not identity)
- Replace "COMPANY" label with a small building-icon + "Company" to get some visual signal without shouting

### 7. Card hover: static → gentle lift (P2)

**Problem**: Cards sit flat. Linear and Notion use a subtle 1-2px lift + border glow on hover to tell you they're clickable.

**Fix**:
- `hover:-translate-y-0.5 hover:border-[var(--accent-primary)]/30 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.3)]`
- `transition-all duration-200 ease-out`
- Disable under `prefers-reduced-motion`

### 8. Background: two radial glows → layered with section separator (P2)

**Problem**: The dark-mode body gradient has a blue radial top-left + terracotta top-right. They're nice but bleed into the entire page including the Recent Reports section below the fold, which washes out card contrast.

**Fix** (`src/index.css` line 229-234):
- Keep the atmospheric gradient for the hero
- After 100vh, transition to a flat `#101317` so cards sit cleanly
- OR: apply the gradient only to the hero `<section>`, not the `body`

## Typography pass

Minor but compounding:

| Element | Current | Proposed |
|---|---|---|
| Hero h1 | `text-2xl` or `text-3xl` with default tracking | `text-[28px] leading-[1.15] tracking-[-0.01em] font-semibold` — matches Claude's headline weight |
| Subtitle | single dense line | `text-[15px] leading-[1.5] text-gray-400 max-w-[540px] mx-auto` — cap width so it doesn't stretch on wide screens |
| Section header | `PICK UP WHERE YOU LEFT OFF` uppercase | keep, but reduce tracking from `0.2em` → `0.16em` and opacity to 55% |

## What Perplexity / Claude / Linear do that we can steal (per-surface)

- **Perplexity**: composer fills 60% of above-fold, no chrome, lens pills immediately below, example prompts as small chips BELOW the composer not as a section header. Search-bar is the whole hero.
- **Claude**: warm off-white default, minimal border-radius, one CTA, conversational microcopy ("What are we working on?")
- **Linear**: segmented controls instead of separate pills, ⌘K everywhere, "keyboard hint" on every primary button
- **Notion**: soft gradient cards with a single accent color per card type, date as bottom metadata not top
- **ChatGPT**: zero chrome on home, centered composer, everything else is one click away

## One concrete composed version

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│        What do you want to understand?                       │
│        A company, a market, a person, a decision.            │
│                                                              │
│        ┌──────────────────────────────────────────────────┐  │
│        │  Paste a LinkedIn URL, drop a pitch deck, or…    │  │
│        │                                                  │  │
│        │                                                  │  │
│        │  🔗📄📝 · drop to attach               ⌘↵  Run →  │  │
│        └──────────────────────────────────────────────────┘  │
│                                                              │
│        ┌ Founder · Investor · Banker · CEO · Legal · Student ┐
│        └                                                     ┘
│                                                              │
│        Try: "Diligence SoftBank"  "Prep brief for Stripe"    │
│                                                              │
│                                                              │
│  ───── recent work ─────                                     │
│                                                              │
│  [company card] [company card] [company card]                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Key deltas vs today: pill + subtitle compressed, textarea shorter, primary button is the center of gravity, examples as inline chips not a row of prompt buttons, Recent section reads as a quiet "resume your work" footer not a second competing region.

## File-by-file change list

1. `src/features/product/components/ProductIntakeComposer.tsx`
   - Textarea min/max height
   - Primary/ghost button hierarchy
   - Lens segmented control wrapper
   - Focus ring
   - Drop "NEW RUN" label (if rendered here) or delete it from parent
   - Compress helper text

2. `src/features/home/views/HomeLanding.tsx`
   - Card hover lift + border glow
   - Card slot pinning is already done (PR-A) — no change
   - Examples chip row above Recent Reports (optional — A/B)
   - Reduce vertical spacing between hero and recents from `mt-24` → `mt-16`

3. `src/features/product/components/ProductThumbnail.tsx`
   - Pin tone by entity type first; only fall back to index when neither type nor lens gives a signal
   - Move date from corner to bottom-meta

4. `src/index.css`
   - Option A: add `section.hero { background: <current gradient> }` and flatten `body` to solid
   - Option B: reduce gradient opacity by 30%

5. `src/features/controlPlane/components/SuggestedPrompts.tsx` (if it exists; otherwise inline in HomeLanding)
   - Render as inline chips instead of button row

## Staging

One focused PR can ship all 8 points. Estimated diff: ~250 lines across 4-5 files. Every change is a CSS-string or prop-value tweak — no state logic, no routing, no schema. Revertible per file.

If you want to stage:
- **PR-1 (~30 min)** composer hierarchy + focus ring + lens segmented control (items 1-3)
- **PR-2 (~20 min)** hero label removal + helper text compression + typography (items 4-5 + typography pass)
- **PR-3 (~20 min)** card hover + thumbnail tone pinning + date position + background separation (items 6-8)

All three can merge the same day and reviewed independently.
