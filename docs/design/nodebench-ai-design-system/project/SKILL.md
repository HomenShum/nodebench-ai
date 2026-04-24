---
name: nodebench-ai-design
description: Use this skill to generate well-branded interfaces and assets for NodeBench AI, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Start points:

- `README.md` — full brand narrative, voice, visual foundations, iconography
- `colors_and_type.css` — token source of truth (import directly)
- `assets/` — logos (SVG), product renders (webp), hero backgrounds
- `ui_kits/nodebench-web/` — React/JSX components recreating the flagship app
- `preview/` — individual visual-token specimen cards (color, type, motion, components)

When in doubt, match the repo voice: sentence-case, verb-first CTAs, no emoji in UI chrome, Linear-style chrome (thin borders, terracotta accent), layered radial-gradient backgrounds, system font stack.
