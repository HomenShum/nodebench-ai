---
paths:
  - "**/*.tsx"
  - "**/*.ts"
  - "**/*.css"
  - "**/*.html"
related_: [reexamine_a11y, reexamine_polish, reexamine_process, reexamine_keyboard]
---

# Re-examine: Design Reduction (Jony Ive Principles)

## Core philosophy
Every element must earn its place. The default answer to "should we add this?" is no.
Reduction is not simplification — it's the discipline to remove everything that doesn't serve the user's immediate task.

## Kill jargon
- Replace technical terms with plain language users would use
- "Act I/II/III" → "Quick Pulse / Analysis / Deep Dive"
- "Orchestrator" → "Agent", "Trajectory" → "History", "Recon" → "Research"
- "Pipeline" → "Workflow", "Schema" → "Structure", "Emit" → "Send"
- Test: would a non-technical person understand this label in 2 seconds?

## Vanity metrics
- Remove stats that don't drive user action (streak counters, "free runs today", total counts without context)
- Keep only metrics that answer "what should I do next?"
- If a number doesn't change behavior, it's decoration — remove it

## Earned complexity
- Every tab, button, toggle, and section must justify its existence
- Default: fewer tabs. Combine related content before splitting into separate tabs
- Settings: group by user mental model (Profile, Account, Usage, Integrations), not by feature
- If a feature is used by <10% of users, hide it behind progressive disclosure

## Dark patterns
- No auto-expanding panels that steal focus
- No notification badges that never clear
- No "are you sure?" dialogs for reversible actions
- No hidden scroll areas with invisible scrollbars

## Tab/surface reduction
- Prefer 3-5 tabs maximum per view
- Before adding a new tab, try: accordion, inline section, or progressive disclosure
- Tab labels: 1-2 words, plain language, no icons-only

## Search over browse
- Any list >10 items needs fuzzy search, not just scroll
- Fuzzy scoring: prefix (100) > substring (60) > char-order (10+consecutive*5)
- Weight: label (1.0) > keywords (0.8) > description (0.6)
- Sort by score descending, not alphabetical

## Accessibility as reduction
- Semantic HTML reduces ARIA needs: `<nav>`, `<aside>`, `<main>`, `<dialog>`
- `aria-label` on every interactive element without visible text
- `aria-current="page"` on active nav items
- `type="button"` on non-submit buttons (prevents accidental form submission)
- `<label>` for every input (visible or `sr-only`)

## Motion budget
- Max 2 concurrent animations per viewport
- `prefers-reduced-motion: reduce` → disable all non-essential animation
- Spinning/pulsing elements: max 1 per screen, must convey loading state
- Decorative animations (orb rings, scanning lines, gradient flows) → remove or gate behind motion preference

## Checklist (run before shipping any UI change)
1. Can I remove an element without losing function? → Remove it
2. Can I combine two sections into one? → Combine them
3. Would a first-time user understand every label? → Rewrite jargon
4. Does every stat drive a decision? → Remove vanity metrics
5. Is there a search for lists >10 items? → Add fuzzy search
6. Are all interactive elements keyboard-accessible? → Add focus/aria
7. Does the view work with animations disabled? → Test reduced motion
