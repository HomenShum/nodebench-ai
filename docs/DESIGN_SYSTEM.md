# NodeBench UI Design System (Persistent)

Last updated: 2026-02-23

## 1) Industry reference set (what we are aiming at)

NodeBench does not copy one app. We use a blended benchmark model:

1. Vercel
   - Neutral-first surfaces, one accent, subtle borders, low-shadow cards.
   - Layout rhythm and typography consistency.
2. Linear
   - Dense-but-calm spacing, clean list hierarchy, fast interaction feedback.
3. Stripe Dashboard
   - High data density with clear information hierarchy and disciplined table/chart treatment.
4. Notion
   - Strong content block rhythm and reliable compositional spacing.
5. ChatGPT
   - Fast interaction feedback and progressive disclosure in agent/chat workflows.

This exact reference set is codified in the dogfood Gemini QA prompt and used for scoring.

## 2) Product visual direction (converging target)

Single sentence direction:

- "Data-dense, calm, neutral-first workspace with one user-configurable accent."

Practical interpretation:

- Dense where it helps throughput (tables, logs, multi-panel workflows).
- Calm where it helps readability (cards, section spacing, typography hierarchy).
- No random route-specific visual identities.
- Accent token drives interactive emphasis globally.

## 3) Non-negotiable route-level UI contract

Every major route should follow this baseline unless there is an explicit exception:

1. Root layout
   - `nb-page-shell`
   - `nb-page-inner`
   - `nb-page-frame` OR `nb-page-frame-narrow`

2. Surface primitives
   - Card-like containers use `nb-surface-card` by default.
   - Avoid ad-hoc `rounded + border + bg` recipes for common containers.

3. Typography primitives
   - Page titles: `type-page-title`
   - Section titles: `type-section-title`
   - Captions/labels: `type-caption`, `type-label`

4. Button primitives
   - `btn-primary-sm`, `btn-outline-sm`, `btn-ghost-sm`
   - Ad-hoc buttons are acceptable only when behavior is truly custom.

5. Accent/focus behavior
   - Use accent tokens (`--accent-primary`, `--accent-primary-hover`, `--accent-primary-bg`).
   - Focus rings should use accent tokens, not hardcoded indigo/blue rings.

6. Exception rule
   - Semantic severity colors (error/warning/success) are allowed when they represent state.
   - Brand colors are allowed only for explicit brand identity blocks.

## 4) Tokens and primitives source of truth

Primary source is `src/index.css` component layer:

- Type scale
- Button primitives
- Page shell primitives
- Surface card primitive

Secondary source:

- Theme preferences and accent token wiring in theme context and theme types.

## 5) Route convergence model

Use this progression for each route:

1. Shell convergence
   - Move route into page shell primitives.
2. Card-density convergence
   - Replace one-off card containers with `nb-surface-card` where appropriate.
3. Accent convergence
   - Replace hardcoded indigo/blue interactive classes with accent tokens.
4. Typography convergence
   - Migrate route titles/section labels to shared type primitives.
5. QA convergence
   - Route must pass visual + token checks from the QA manual.

## 6) Definition of done for a "converged" route

A route is converged only if all are true:

- Uses shared shell/frame primitives.
- Uses shared card primitive for primary containers.
- No hardcoded indigo/blue focus rings for normal interactive states.
- Uses shared title/section typography.
- Dogfood screenshots updated and reviewed.
- Passes manual QA checks in `docs/QA_MANUAL.md`.

## 7) Color system (post-unification)

As of 2026-02-23, the codebase is unified on **semantic Tailwind aliases** that map 1:1 to CSS custom properties.

### Alias → CSS var mapping

| Tailwind alias | CSS var | Use for |
|---------------|---------|---------|
| `bg-surface` | `--bg-primary` | Page backgrounds, card fills |
| `bg-surface-secondary` | `--bg-secondary` | Sidebar, secondary panels |
| `bg-surface-hover` | `--bg-hover` | Hover states on interactive surfaces |
| `text-content` | `--text-primary` | Body text, headings |
| `text-content-secondary` | `--text-secondary` | Secondary labels, descriptions |
| `text-content-muted` | `--text-muted` | Hints, placeholders, disabled text |
| `border-edge` | `--border-color` | Card borders, dividers, separators |

### Extended alias contexts

The same aliases work in gradient, fill, ring, placeholder, scrollbar, and decoration utilities:

```
from-surface to-surface-secondary     # Gradients
fill-surface-secondary                # SVG fills
ring-offset-surface                   # Focus ring offsets
placeholder-content-muted             # Input placeholders
scrollbar-thumb-edge                  # Scrollbar styling
decoration-content                    # Text decorations
bg-content text-surface               # Inverted (buttons on dark bg)
```

### What's NOT aliased (intentional)

- **Inline styles** (`style={{ background: 'var(--bg-primary)' }}`) — CSS vars are correct here; Tailwind aliases only work in `className`.
- **CSS-in-JSX** (`<style>` blocks inside components) — raw CSS vars are correct.
- **Accent colors** — `var(--accent-primary)` stays as-is because `indigo-500` (#6366F1) !== `--accent-primary` (#5E6AD2). No safe mechanical replacement exists.
- **Semantic state colors** — `text-red-500`, `bg-green-100`, etc. are intentional for error/success/warning states.

### Migration metrics (2026-02-23)

| Phase | Scope | Files | Replacements |
|-------|-------|-------|-------------|
| 1: `[var(--bg/text/border)]` → alias | Core patterns | 166 | 2,719 |
| 1b: `[color:var(--...)]` variant | Missed syntax | 69 | ~800 |
| 1c: Gradient/fill/ring/placeholder | Extended patterns | 20 | ~200 |
| 2: CinematicHome glass morphism | Glass → flat | 1 | 15 |
| 3: `border-gray-200/800` → `border-edge` | Border convergence | 14 | 14 |
| **Total** | | **255** | **~3,750** |

## 8) QA pipeline

The automated design QA pipeline scores the UI against the 5 reference apps across 6 design axes.

### Running the pipeline

```bash
# 1. Capture screenshots (builds app, launches preview, records walkthrough)
node scripts/ui/runDogfoodWalkthroughLocal.mjs

# 2. Run QA scoring (Gemini Flash 2.0 vision)
node scripts/ui/runDogfoodGeminiQa.mjs --design --style linear

# 3. Combined (capture + score)
node scripts/ui/runDogfoodWalkthroughLocal.mjs && node scripts/ui/runDogfoodGeminiQa.mjs --design --style linear
```

### Scoring layers

| Layer | Weight | What it measures |
|-------|--------|-----------------|
| L0: Static analysis | — | Screenshot count, file presence |
| L1: Deterministic rubric | 60% | Functional correctness per-screenshot |
| L2: Severity classification | 30% | Bug severity (P1 critical → P4 polish) |
| L3: Taste/craft | 10% | Subjective polish assessment |
| **L4: Aspiration** | Separate | 6-axis score vs Vercel/Linear/ChatGPT/Stripe/Notion |

### Aspiration axes (L4)

1. **Typography** — type scale consistency, font weight hierarchy, line height
2. **Spacing** — 4/8px grid adherence, section rhythm, padding uniformity
3. **States** — hover/focus/active/disabled states, loading skeletons
4. **Hierarchy** — visual weight distribution, information density balance
5. **Interaction** — response feedback, transitions, progressive disclosure
6. **Craft** — border-radius consistency, shadow usage, color discipline

### Output files

| File | Contents |
|------|---------|
| `public/dogfood/qa-results.json` | Full QA scores + bug list + aspiration |
| `public/dogfood/scribe.json` | Screenshot metadata |
| `public/dogfood/scribe.md` | Human-readable walkthrough |
| `public/dogfood/walkthrough.mp4` | Video recording |
| `public/dogfood/frames/` | Individual frame JPEGs |
| `public/dogfood/screenshots/` | Route-level screenshots |

### Score targets

| Metric | Floor | Target | Stretch |
|--------|-------|--------|---------|
| Rubric QA (L1-L3) | 80/100 (B) | 95/100 (A) | 100/100 |
| Aspiration (L4) | 75/100 | 88/100 | 95/100 |
| Genuine bugs | 0 P1 | 0 any | — |

## 9) Current strategic intent

Near-term convergence order (high impact):

1. Navigation shell + top action bars
2. Workspace-family hubs (documents, calendar, agents)
3. Research-family surfaces (hub tabs, signals, funding)
4. QA/admin surfaces (activity log, dogfood, analytics panels)

This keeps global rhythm consistent before deeper visual polish.

### Remaining convergence work

| Work item | Status | Est. scope |
|-----------|--------|-----------|
| CSS var → alias | Done | 255 files |
| CinematicHome flat surface | Done | 1 file |
| Border convergence | Done | 14 files |
| Accent color discipline (indigo → token) | Deferred | ~100 files, ~333 instances |
| Shell primitive adoption (`nb-page-shell`) | Partial | ~15 routes |
| Card primitive adoption (`nb-surface-card`) | Partial | ~30 components |
| Typography primitive adoption | Not started | ~50 components |
| Glass morphism removal (remaining) | Not started | ~38 instances in 20 files |
