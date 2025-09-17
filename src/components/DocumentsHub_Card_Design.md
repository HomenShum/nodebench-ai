# Document Card Design System (rundown)

Below is a concise map of the document-card element you pasted and how all visual + interactive parts work, with pointers to the source. This matches the hybrid card style we’ve been using.

## Structure (DOM + classes)
- __Root wrapper__:
  - `div[role="button"][tabindex="0"]` with DnD attrs (`aria-roledescription="sortable"`) and inline `transform` styles from the drag lib.
  - `group relative` enables coordinated hover states inside.

- __Card container__:
  - `document-card--hybrid ring-1 ... bg-gradient-to-br` provides the rounded surface, subtle border/ring, and gentle gradient.
  - Clips background watermark; card theme is applied via CSS variables + per-type classes (see Theming).

- __Watermark icon__:
  - `document-card__bg text-<typeColor>` big, rotated `FileTypeIcon` set as low-contrast background.
  - Subtle/transparent by design to respect the compact preference.

- __Top bar__:
  - __Left__: 40px “icon tile” (`w-10 h-10 rounded-lg ... bg-<typeColor>`) containing a white `FileTypeIcon` (strokes use `currentColor`).
  - __Right actions__: hidden by default, `opacity-0 group-hover:opacity-100`
    - Pin: neutral button → hover accent text + scale
    - Delete: hover red bg/text + red border; both have `focus-visible` rings

- __Inline selection checkbox__:
  - Absolutely positioned at `top-2 left-2`
  - Hidden by default, fades in on group hover
  - Accessible label and `focus:ring` for keyboard users

- __Title__:
  - `h3 font-semibold text-base line-clamp-2 leading-snug` for two-line clamp

- __Footer__:
  - Top divider: `border-t border-[var(--border-color)]`
  - Pills row: `document-card__pills` (Meta pills live here; see Pills section)

## Theming
- __Per-type theme__ in `nodebench_ai3/src/lib/documentThemes.ts`:
  - Non-calendar docs: consistent ring tint + faint gradient, icon tile bg, label color, and watermark tint (`theme.watermarkText`).
  - Calendar docs: special amber ring/labels (unchanged per spec).
- __File icons__: `nodebench_ai3/src/components/FileTypeIcon.tsx` uses `currentColor` so both tile and watermark inherit color from parent classes.
- __Variables used__:
  - `--accent-primary`, `--bg-primary`, `--bg-hover`, `--text-primary`, `--text-secondary`, `--border-color`

## Hover, focus, selection
- __Group hover__:
  - Shows checkbox (`opacity-0 → 100`) and action buttons (`opacity-0 → 100`)
- __Button hover__:
  - `hover:scale-110` micro-interaction
  - Delete turns red; Pin gets accent text/border
- __Focus-visible__:
  - Action buttons and checkbox show `focus-visible:ring-2` for keyboard users
- __DnD motion__:
  - Wrapper has `transition: transform linear; backface-visibility: hidden;` so drag movements are smooth without flicker

## Pills (Meta)
- Rendered via `MetaPills` inside `document-card__pills` in `nodebench_ai3/src/components/MetaPills.tsx`.
- __Common pills__:
  - __Type pill__ (`pill pill--type`): per-type colored bg/border/text (e.g., `bg-blue-500/10 border-blue-500/30 text-blue-700`)
  - __Time pill__ (`pill pill--time`): relative “Just created”, “Updated 2h ago”, etc.
  - Optional: project, link, updated, details (CSS modifiers in `src/index.css`).
- __Behavior__:
  - Truncation to ~22 chars
  - Up to 5 pills max
  - Small icon/emoji span `text-[13px]` to keep height tight

## Accessibility
- __Root__ `role="button"` + `tabindex="0"` for keyboard access (Enter/Space to open; wired in component handlers).
- __Checkbox__ has `aria-label` and proper `focus:ring`.
- __Action buttons__ have `title` tooltips and `focus-visible` rings.
- __DnD labels__ via `aria-roledescription="sortable"` and `aria-describedby` from the drag lib.

## Visual states (quick reference)
- __Default__: subtle ring + gradient, watermark faint in background, action buttons hidden.
- __Hover__: actions fade in; hover effects (delete turns red, pin accent text); checkbox appears.
- __Active drag__: transform applied from DnD with linear transition.
- __Keyboard focus__: visible focus rings on actionable controls.

## Special case: Calendar cards
- Amber ring + watermark tint; labels follow calendar theme (rest stays consistent with hybrid pattern).
- Calendar summary tiles use same watermark + pill treatments but explicit amber palette.

## Where this lives (source map)
- __Card rendering__: `nodebench_ai3/src/components/DocumentsHomeHub.tsx` and `nodebench_ai3/src/components/DocumentCards.tsx`
- __Pills__: `nodebench_ai3/src/components/MetaPills.tsx`
- __Theming__: `nodebench_ai3/src/lib/documentThemes.ts`
- __Icons__: `nodebench_ai3/src/components/FileTypeIcon.tsx`
- __Pill styles__: `nodebench_ai3/src/index.css` (pill modifiers and hybrid styling helpers)

## Notes aligned with your snippet and preferences
- __Subtle watermark__: implemented via `document-card__bg` and per-type `watermarkText` color; clipped by the card container.
- __Compact layout__: small tile, tight title/pills, micro-interactions on hover.
- __Consistent hybrid style__: list/grid cards, planner/task updates, and public docs reuse the same pattern so visuals align app-wide.

# Summary
Provided a complete, practical rundown of the document card’s structure, theming, hover/selection effects, pills, and accessibility, with exact class behaviors and file references. This follows the prior design memories for hybrid styling, per-type theming, watermark tinting, and MetaPills integration. If you want, I can add an in-file comment block in `DocumentsHomeHub.tsx` documenting this map for future contributors.