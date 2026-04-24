# NodeBench AI — Web App UI Kit

High-fidelity visual recreation of the flagship NodeBench AI web app. Built as
a clickable prototype in React/JSX so components can be composed into new
mockups.

**Not production code.** Styles and interactions match the product; logic is
stubbed.

## What's in here

- `index.html` — Interactive demo. Hop between Home → Reports → Chat →
  Inbox → Me. Start a run from a prompt card and watch the answer packet
  stream in.
- `TopNav.jsx` — Sticky translucent topbar (logo mark, surface tabs,
  search, session menu).
- `Composer.jsx` — Homepage composer with suggested prompt cards and
  routing lane chips.
- `AnswerPacket.jsx` — Streaming answer with branches, inline citations,
  verified badge, follow-up bar.
- `ReportCard.jsx` — Saved-report row with status, source count, "watch"
  toggle.
- `NudgeList.jsx` — Timeline of nudges with entity mention and dismiss.
- Nudges belong inside Inbox; they are not a top-level operating tab.
- `EntityNotebook.jsx` — Paper-surface notebook view with terracotta
  left margin rule.
- `App.jsx` — Top-level state + router for the five surfaces.
- `nodebench.css` — Local copy of the minimum tokens + utility classes
  needed by these components (import order: load first).

## Token source

All values come from `../../colors_and_type.css` (root of the design
system). This folder only redeclares what's needed so the kit runs
standalone.

## Known trims

- No real streaming — answer packet fades in with a staggered reveal.
- Search (⌘K) is non-functional.
- Dark mode is reached by toggling `html[data-theme="dark"]` on the root;
  the top-right icon toggles it.
