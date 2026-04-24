# NodeBench AI — Design System

A designer's guide to building with the NodeBench AI brand and UI. Extracted
from the live repo so new prototypes, slides, and marketing assets look like
they belong in the product.

**Live product:** [nodebenchai.com](https://www.nodebenchai.com)
**Source repo:** [HomenShum/nodebench-ai](https://github.com/HomenShum/nodebench-ai)

## Product context

NodeBench AI is an **entity-intelligence research platform** — a team of AI
researchers that scour the web, analyze documents, and synthesize
decision-ready briefs for founders pitching VCs and investors doing diligence.
Every answer is backed by source evidence and receipts instead of
hallucinations.

The product is organized around **five user surfaces**:

| Surface | Purpose |
| --- | --- |
| **Home**    | start quickly |
| **Chat**    | do the work — answer, sources, trace, follow-ups |
| **Reports** | turn a run into reusable memory |
| **Nudges**  | return at the right moment, when something meaningful changes |
| **Me**      | operator context and control |

The mental model: `question → answer → saved report → watch item → useful
nudge → better next run`.

### Products represented in this design system

1. **NodeBench AI** — the flagship web app (React + Vite + Tailwind). The
   primary UI kit.
2. **Marketing / public surface** — the `nb-public-*` landing shell, hero,
   and feature grid seen on nodebenchai.com.
3. **nodebench-mcp** (distribution lane, CLI/MCP) — command-line-adjacent, so
   not a visual UI kit, but typography and tone rules still apply.

### Sources used

All tokens and components in this folder were extracted from:

- `src/index.css` — ~2,800 lines of design tokens + component classes
  (`--accent-primary`, `.nb-primary-button`, `.nb-panel`, notebook/paper
  tokens, entrance animations, etc.)
- `tailwind.config.js` — colors, shadows, radii, keyframes, easing
- `index.html` — head theming, OG image, favicon, meta strategy
- `public/assets/` — hero background, dossier preview, media collage,
  landing-page imagery
- `public/logos/` — 7 partner/customer logos (augment, bolto, cognition,
  greylock, mercor, sevenai, turing)
- `README.md` — product narrative, surface map, voice samples

## Index — what's in this folder

```
NodeBench Design System/
├── README.md                    ← you are here
├── SKILL.md                     ← Agent Skill wrapper
├── colors_and_type.css          ← all tokens (colors, type, radii, shadows, motion)
│
├── assets/                      ← logos, icons, brand imagery
│   ├── logo-mark.svg            ← 32×32 squircle "N" mark (terracotta)
│   ├── logo-192.png / 512.png   ← PWA marks
│   ├── apple-touch-icon.png
│   ├── mask-icon.svg            ← Safari pinned-tab mask
│   ├── og-nodebench.svg         ← 1200×630 OG card
│   ├── hero_bg.webp             ← dark blue flowing-particle hero
│   ├── dossier_preview.webp     ← glass-panel 3D product render
│   ├── media_collage.webp       ← newsletter / media collage render
│   ├── newsletter_digest.webp   ← newsletter digest render
│   └── landing/                 ← reference landing screenshots
│
├── preview/                     ← Design-system-tab cards
│   ├── color-accent.html
│   ├── color-neutrals-light.html
│   ├── color-neutrals-dark.html
│   ├── color-semantic.html
│   ├── type-scale.html
│   ├── type-kickers.html
│   ├── type-mono.html
│   ├── spacing-radius.html
│   ├── spacing-shadows.html
│   ├── motion-easing.html
│   ├── component-buttons.html
│   ├── component-inputs.html
│   ├── component-chips.html
│   ├── component-badges.html
│   ├── component-panel.html
│   ├── component-empty.html
│   ├── brand-logo.html
│   └── brand-imagery.html
│
└── ui_kits/
    └── nodebench-web/           ← Flagship app UI kit
        ├── README.md
        ├── index.html           ← interactive clickthrough
        ├── TopNav.jsx
        ├── Composer.jsx
        ├── ReportCard.jsx
        ├── AnswerPacket.jsx
        ├── NudgeList.jsx
        └── EntityNotebook.jsx
```

---

## CONTENT FUNDAMENTALS

NodeBench's voice is confident, concrete, and allergic to filler. Internal
rules from `AGENTS.md` explicitly call out style-drift guardrails against
"corporate voice, filler, or sycophancy."

### Voice

- **Operator, not hype-man.** Talks like an analyst briefing a PM. Prefers
  nouns + verbs to adjectives + adverbs. No "unleash," no "seamless," no
  "revolutionary."
- **Second-person on action, first-person-plural on posture.** The product
  addresses **you** ("search any company," "start quickly"). When the
  company speaks, it's "we" ("we ship answers, then we watch the world for
  you").
- **Receipts over claims.** Always pair a claim with the concrete thing that
  proves it. README example: "**production-ready for all quality scenarios**"
  is always followed by the eval numbers.
- **Bullet-heavy, diagram-friendly.** ASCII diagrams, numbered steps, and
  terse bullet lists. Sentences rarely exceed 25 words.
- **Plain-English disclaimers.** When something is hedged, the hedge is
  plain: *"the only outstanding item is p95 latency optimization — a
  performance enhancement, not a correctness blocker."*

### Tone samples (lifted verbatim from the repo)

- "Entity intelligence for any company, market, or question."
- "users do not just need a chatbot that answers once."
- "answer-first execution"
- "saved artifacts as first-class objects"
- "UX should feel monolithic. Runtime should stay layered."
- "advisor mode by design via dynamic routing"
- "make saved reports behave like reusable memory, not storage"

### Casing

- **Sentence case** everywhere by default — nav, buttons, section headers.
  Headlines in marketing are sentence case too. "Entity intelligence for any
  company" — not "Entity Intelligence For Any Company."
- **ALL CAPS + `0.18em` tracking** for section kickers and eyebrows only
  (`.type-kicker`, `.type-label`).
- Product names are literal: `NodeBench AI`, `nodebench-mcp`,
  `nodebench-mcp-power`, `nodebench-mcp-admin`, `Attrition`.
- Surface names are Title-Cased single words: **Home · Chat · Reports ·
  Nudges · Me**.

### Copy patterns

- **Verb-first CTAs.** *Start a run · Save report · Watch entity · Refresh ·
  Ask a follow-up.* Never "Get started," never "Learn more."
- **Empty states explain WHY and WHAT-NEXT in one breath.**
  "No reports yet. Save the next answer to build reusable memory."
- **Status language is dry.** "verified · provisionally_verified ·
  needs_review · failed." No 🎉, no green checkmark emoji in-product.
- **Footnote-style provenance.** Inline citations appear as small superscript
  numbers linking to a sources panel. The tone is academic, not social.

### Emoji

- **Not used in product UI.** No emoji in buttons, nav, labels, empty
  states, or inline copy.
- **Used sparingly in engineering docs.** The README uses ✅ / ⚠️ in eval
  tables only as status glyphs, never decoratively. Reproduce this discipline
  — status glyphs in tables are fine, everywhere else is off-brand.

### "I" vs "you"

- The product talks to **you**, the operator.
- Agent authorship is signaled by typography (lighter grey "agent ink") and a
  left-margin dot, not by first-person copy ("I found…" is avoided).

---

## VISUAL FOUNDATIONS

### Colors

**One warm accent, lots of neutrals.** The system is almost monochrome; the
terracotta is the only non-neutral that appears in UI chrome.

- **Accent primary** — `#D97757` (terracotta). Used on primary buttons, links
  on hover, focus rings, "paper margin" rule on entity pages, status badges
  marked "accent." Hover darkens to `#C76648`; in dark mode hover lightens
  to `#E59579`.
- **Brand dark** — `#111827` for headings on light.
- **Brand indigo** — `#5E6AD2`, Linear-style, reserved for the MCP lane and
  occasional atmospheric gradient.
- **Light surfaces** — `#FFFFFF` / `#F3F4F6` / `#E5E7EB` / app bg `#FAFAFA`.
- **Dark surfaces** — `#111418` / `#171B20` / `#1B2027` / app bg `#09090B`.
- **Paper** — warm off-white `#FBF8F2` (light) and graphite `#1B1A18`
  (dark) reserved for the notebook reading surface.
- **Semantic** — success `#047857`, destructive `#DC2626`, warning `#B45309`.
  Text on white meets WCAG AA at minimum (muted text is `#4B5563`, 4.6:1).

Color is layered **warm over cool**: the public site uses two radial glows
(terracotta top-left, indigo top-right, ~8% opacity) over a near-black base
(`#101317 → #11151A`). On the light app, the glows are even softer (~6%).

### Type

- **System stack first.** `-apple-system, BlinkMacSystemFont, Inter, Manrope,
  system-ui, sans-serif` — SF Pro on Apple devices, Inter everywhere else,
  Manrope as brand fallback. Both UI and display share the same family —
  weight + size carry the hierarchy, not a second font.
- **Mono** is JetBrains Mono for code, inline `code`, keyboard hints.
- **Sizes** — body 14px (13px compact density, 15px spacious). Page titles
  are `1.95rem / 700 / -0.02em`. Section titles are `1.02rem / 600 / tight`.
- **Kickers** are 11px, uppercase, `0.18em` tracking, muted.
- **Letter-spacing** — panels get `-0.02em`, labels `-0.01em`, kickers
  `0.18em`.
- **Line-height** — body `1.5`, prose `1.85`, headings `1.15`.

### Spacing & density

Three density scales on `html[data-density]`:

| Density     | Base | Page px | Card p | Gap |
| ---         | ---- | ----    | ----   | --- |
| compact     | 13px | ~16px   | 12px   | 8px |
| comfortable | 14px | ~32px   | 20px   | 16px|
| spacious    | 15px | ~48px   | 28px   | 24px|

Component-level tokens: `form-field: 16px`, `section: 32px`.

### Corners (radii)

8px is the default. Small chrome (`rounded-sm`) is 6px; containers 12px;
cards/panels 12–16px; the "big" hero panels reach **20–22px**. Pills and
icon buttons are fully rounded.

### Shadows

**Very subtle.** Every shadow layer starts with a 1px `rgba(0,0,0,.02-.04)`
border-equivalent inset to replace a literal border, then adds one or two
soft drops.

- `shadow-sm` — neutral card
- `shadow-md` — elevated card / menu
- `shadow-lg` — modal / popover
- `shadow-hover` — brightens the outline on hover
- `shadow-accent` — terracotta drop, reserved for the primary CTA

In dark mode, `box-shadow` is replaced by a `0 0 0 1px rgba(255,255,255,.04)`
inset "line shadow" — elevation is a border, not a drop.

### Backgrounds

- **App background is layered radial gradients**, not flat. Light:
  `radial-gradient(circle at top, rgba(67,97,238,.08), transparent 28%),
  radial-gradient(circle at bottom right, rgba(255,87,34,.06), transparent
  22%)`. Dark: terracotta radial at top-left + top-right, with a
  `linear-gradient(180deg, #101317, #111419)` base.
- **Selectable patterns** — `data-background-pattern="spotlight | grid |
  dots | lines | noise | paper"` on `<html>` swaps in alternates.
- **Paper surface** on the notebook/entity page uses `#FBF8F2` with a
  terracotta left-margin rule — deliberately non-white to feel like a
  physical sheet.
- **Full-bleed imagery** is used in marketing (`hero_bg.webp` — dark blue
  particle wave) and for product renders (`dossier_preview.webp` —
  glass/prism UI panels with subtle cyan/violet rim-light).

### Imagery vibe

- **Cool dark** for hero backdrops (deep blue, particle waves, low contrast).
- **Glass + prism** for product illustrations — layered translucent cards,
  cyan/violet rim-lights, on a black circuit-board plate.
- **Warm paper** for editorial / report views (the notebook).
- Partner logos appear at ~40–60% opacity in light mode, hovered to 100%.

### Animation & motion

- Two easing tokens do everything: `--ease-out-expo:
  cubic-bezier(0.16, 1, 0.3, 1)` and `--ease-spring:
  cubic-bezier(0.32, 0.72, 0, 1)`.
- Three durations: fast 120ms, normal 200ms, slow 400ms.
- **Entrance patterns** (`.reveal`, `.reveal-scale`, `.reveal-blur`,
  `.reveal-left`, `.reveal-right`) — opacity + 30px rise, 8–10px blur fade,
  40px lateral slide. Staggered in 100ms increments via `.reveal-stagger`.
- **Decoration reveal** — when the agent drops new content into a notebook
  block, it fades + rises 6px over 280ms.
- **Wet-ink pulse** — the most recently edited block gets an 800ms
  `ink-agent-bg` fade to signal "just written."
- **Respects `prefers-reduced-motion`** everywhere — animations become
  no-ops, not slowed-down versions.

### Hover states

- Primary button: `filter: brightness(1.02)` + shadow intensity up slightly.
- Secondary / ghost: background lightens (`rgba(255,255,255,.04 → .08)` in
  dark).
- Cards: `.nb-hover-lift` — `translateY(-2px)` + deeper shadow, `180ms`
  `ease-out-expo`.
- Accent cards: border tints to `color-mix(accent 30%, transparent)`.

### Press states

- Buttons: `translateY(1px) scale(0.985)`, 75ms.
- Mobile tap (<1280px): `scale(0.97)`, 80ms.
- Cards: transform returns to baseline with a quicker 75ms duration.

### Focus states

- Interactive buttons/links/tabs use Tailwind's `focus-visible:ring-2` with
  `primary/25` halo — a **soft glow**, not a hard outline.
- Catch-all rule: any other focusable gets a 1px `rgba(15,23,42,.25)`
  outline with 2px offset. Linear-style thin neutral ring.
- A `.focus-ring` utility offers a premium 3-layer glow for hero inputs.

### Borders

- Everywhere: `1px solid rgba(15,23,42,.06-.10)` on light,
  `rgba(255,255,255,.07-.12)` on dark.
- Dashed borders used **only** for empty-state placeholders.
- `border-strong: #E5E7EB` for form field chrome and dividers.

### Transparency & blur

- Topnav is translucent: `background: rgba(250,248,245,.88) +
  backdrop-filter: blur(18px)` (dark: `rgba(13,16,20,.82)`).
- Pills and chips sit on `rgba(255,255,255,.74)` with a 1px hairline border.
- Modal backdrops dim to `rgba(0,0,0,.4)` with no blur — the modal itself
  is opaque.

### Protection gradients

Used on full-bleed hero imagery only: `linear-gradient(180deg,
rgba(0,0,0,0), rgba(0,0,0,.5))` to keep white text readable. In panel
contexts, the accent CTA uses its own downward `linear-gradient(180deg,
#D97757 96%, #C6684A 96%)` to add depth without a literal highlight strip.

### Cards

- Default: `.nb-panel` — 12px radius, 1px `rgba(15,23,42,.06)` border,
  white background, `0 1px 3px rgba(0,0,0,.04)`.
- Soft: `.nb-panel-soft` — 22px radius, 86% opacity surface, sits on
  gradient backgrounds.
- Inset: `.nb-panel-inset` — 20px radius, 92% opacity, secondary surface.
- Reports / dossier: inherit `.nb-surface-card-interactive` — adds
  `hover:shadow-md` + `hover:border-primary/20`.

### Layout rules

- Page max widths: `nb-page-frame` = `max-w-6xl` (72rem), narrow =
  `max-w-5xl`. Notebook sheet caps at 960px (live) / 720px (read).
- Sticky chrome lives at `z-sticky` (30); nav drawers at `z-sidebar` (20);
  modals at `z-modal` (50); toasts at `z-toast` (60).
- Mobile safe-area insets respected via `.pb-safe`, `.mb-safe`.
- Fab positioned to stay above the mobile tab bar
  (`bottom: max(5.25rem, …)`).

---

## ICONOGRAPHY

NodeBench's icon approach is **lucide-react first**, which you'll find
imported all over `src/features/**`. There is no custom icon font or in-repo
sprite sheet; the app relies on Lucide's stroke-based line icons (1.5px
stroke, `currentColor`, 20px default in chrome, 16px in inline).

### Rules

- **Stroke icons only.** Use Lucide on CDN:
  `https://unpkg.com/lucide-static@latest/icons/<name>.svg` — or the
  `lucide-react` npm package in real code.
- **Single color.** Icons inherit `currentColor`. Two-tone or filled icons
  are off-brand.
- **20px in nav/chrome, 16px inline, 14px in pills and status badges.**
  Always pair with a 12px text label — icon-only buttons need a tooltip.
- **No emoji in UI.** ✅ / ⚠️ appear only in docs and eval reports.
- **Unicode chars** are used sparingly as typographic separators (·, →, ↗)
  in nav breadcrumbs and link trails.
- **The only raster icons are PWA marks** (`logo-192.png`, `logo-512.png`,
  `apple-touch-icon.png`) — everything else is SVG.

### Brand mark

The logo is a 32×32 rounded-square (6px radius) in `#D97757` with a bold
white "N" (sans-serif, 20px, 700 weight). On dark backgrounds the mark
holds; on light backgrounds it gains a 1px `rgba(0,0,0,.06)` hairline. No
wordmark ships with the product — the literal string "NodeBench AI" in the
UI stack is the wordmark.

### SVG usage

- All 7 partner logos (augment, bolto, cognition, greylock, mercor, sevenai,
  turing) are inline SVGs, currentColor-driven.
- The favicon, mask-icon, and OG card are SVG.
- Never hand-draw brand imagery as SVG — use the webp product renders
  instead (`hero_bg`, `dossier_preview`, `media_collage`,
  `newsletter_digest`).

### Substitutions

- Lucide was confirmed as the icon stack. If you're working on a prototype
  without npm, link from `https://unpkg.com/lucide-static/icons/<name>.svg`.
- Fonts: Inter + JetBrains Mono are both on Google Fonts; SF Pro is Apple's
  and is accessed via `-apple-system`. **If a downstream environment can't
  resolve `-apple-system`, Inter is a near-perfect substitute.**

### Flagged for your review

- **The repo did not include `.ttf`/`.woff2` font files** — fonts are loaded
  from Google Fonts at runtime. If you need offline/embedded fonts (for a
  PPTX or PDF deliverable), pull Inter + JetBrains Mono .woff2 from Google
  Fonts and save under `fonts/`.
- **No single hero illustration was provided** other than the webp renders.
  For novel marketing, keep the "glass panels on black circuitboard" render
  style and the "dark blue flowing particle wave" backdrop style — don't
  invent new illustration languages.

---

## Iteration

This design system is a living document. Things likely to change:

- **Dark is the default** in the product today, but the light mode is
  receiving active polish — if you see light-mode artifacts in this system,
  flag them.
- **The notebook/paper surface** is a relatively new visual layer; tokens
  exist (`--paper-bg`, `--ink-agent`) but usage is still spreading.
- **MCP CLI** has its own visual language (terminal / ANSI output) that is
  not captured here beyond "use JetBrains Mono + accent terracotta."
