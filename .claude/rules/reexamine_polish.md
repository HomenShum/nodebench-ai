---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.html"
  - "**/*.css"
related_: [reexamine_a11y, reexamine_performance, reexamine_process]
---

# Re-examine: Visual Polish

## Skeleton loading
- Replace blank areas during fetch with skeleton placeholders (gray shapes matching final layout)
- Shimmer animation: `background: linear-gradient(90deg, #2a2a3a 25%, #3a3a4a 50%, #2a2a3a 75%)`
- `background-size: 200% 100%; animation: shimmer 1.5s infinite`
- Respect `prefers-reduced-motion` → static gray background, no shimmer

## Staggered fade-ins
- Cards/list items appear with slight delay cascade: 50ms, 100ms, 150ms per item
- Use `animation-delay` or `transition-delay` — not JS setTimeout
- Keep total cascade under 500ms (10 items max before grouping)
- Disable under `prefers-reduced-motion`

## Transitions
- State changes (expand/collapse, show/hide) get 200-300ms ease transitions
- Use `transition: all 0.2s ease` on the specific properties, not `all` in production
- Hover effects: subtle scale (1.02), shadow lift, or background shift
- Don't animate `width`/`height` — use `transform: scale()` or `max-height` for performance

## Micro-interactions
- Button press: brief scale-down (0.97) on `:active`
- Tooltip on hover for truncated text (CSS `text-overflow: ellipsis` + `title` attribute)
- Copy-to-clipboard: brief "Copied!" feedback toast
- Empty states: helpful message + action button, not just blank space

## Print stylesheet
- `@media print`: light background, dark text, visible borders
- Hide interactive controls (buttons, search, navigation)
- Severity badges: add borders (colors may not print)
- Page-break-inside: avoid on cards