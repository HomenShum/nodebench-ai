---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.html"
  - "**/*.css"
related_: [reexamine_keyboard, reexamine_polish, reexamine_process]
---

# Re-examine: Accessibility

## ARIA & Semantics
- Every interactive element has `role` or is a native interactive element (`<button>`, `<a>`, `<input>`)
- `aria-label` on icon-only buttons (no visible text = must have aria-label)
- `aria-pressed` on toggles, `aria-selected` on tabs, `aria-expanded` on collapsibles
- `role="region"` with `aria-label` on landmark sections
- No `<div onclick>` — use `<button>` or `<a>` with proper keyboard handling

## Reduced motion
- `@media (prefers-reduced-motion: reduce)` disables: transitions, animations, auto-scroll, carousel auto-play
- Skeleton shimmer → static placeholder under reduced-motion
- Staggered fade-ins → instant appearance

## Color-blind safety
- Never rely on color alone — pair with icons, patterns, or text labels
- Severity badges: use border + text, not just background color
- Test with simulated protanopia/deuteranopia if possible

## Screen readers
- `<label>` elements for every `<input>`, `<select>`, `<textarea>` (visible or `.sr-only`)
- `.sr-only` class: `position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0)`
- Skip links at page top: `<a href="#main-content" class="sr-only focus:not-sr-only">`
- Meaningful alt text on images; decorative images get `alt=""`

## Focus management
- `:focus-visible` outlines on all interactive elements (not `:focus` — avoids mouse-click outlines)
- Focus trap in modals/dialogs: Tab cycles within, Escape closes
- After dynamic content load, move focus to the new content or announce via `aria-live`
