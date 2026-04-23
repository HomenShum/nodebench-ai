# NodeBench Mobile Button Inventory — 2026-04-22

Captured live via preview_eval against `http://localhost:5200/?surface=<s>` at mobile 414×896.

## /?surface=chat (empty state)

| top | left | size | aria-label | text | inferred action |
|---|---|---|---|---|---|
| -1 | 360 | 44×44 | Open search | (icon only) | Opens global search overlay |
| 77 | 11 | 270×51 | — | "What does this company actually do..." (suggestion chip) | `setInput(prompt)` + `beginRun(prompt, lens)` |
| 752 | 240 | 44×44 | Attach files | (paperclip icon) | Opens `ProductFileAssetPicker` |
| 752 | 291 | 44×44 | Record voice memo | (mic icon) | (hooks into voice capture) |
| 752 | 342 | 44×44 | Ask NodeBench | (↑ inside terracotta ring) | `handleSubmit` → classify + `beginRun` |
| 836 | 20 | 48×48 | Home | "Home" | `/?surface=home` |
| 836 | 98 | 59×48 | Reports | "Reports" | `/?surface=reports` |
| 831 | 187 | 56×65 | Chat | "Chat" | current route |
| 836 | 273 | 46×48 | Inbox | "Inbox" | `/?surface=inbox` |
| 836 | 350 | 44×48 | Me | "Me" | `/?surface=me` |

## /?surface=home

- 5 bottom-nav tabs (same as above)
- Composer intent toggle: **Ask / Note / Task** at top (still visible here — I only hid these on /chat)
- Composer tools row: Attach files · Screenshot · Voice · Start run
- Lens pill row: **Founder · Investor · Banker · CEO · Legal · Student** (still visible here)
- Daily Pulse card clickable

## /?surface=inbox

- 5 bottom-nav tabs
- Empty-state CTAs: **Open Chat** · **Open saved report**
- (Plus action-required / updates / all tabs on non-empty state — not captured because empty)

## /?surface=me

- 5 bottom-nav tabs
- **Add to home screen** button (PWA install)
- Lens pills: Founder · Investor · Banker · CEO · Legal · Student (settings panel)
- Style pills: **Concise · Balanced · Detailed**

## /?surface=reports

- 5 bottom-nav tabs
- 3 filter dropdowns: **Origin · Date · Type**
- 6 filter pills with counts: **All(10) · Companies(9) · People(1) · Jobs · Markets · Notes**
- Per-report row: tap row → detail; **Share {entityName}** button per row

## Open questions (to resolve against Manus map)

1. What does the **"Open search"** top-right icon actually do? If `Ctrl+K` overlay — good parity with Manus 3-dot menu behavior.
2. Does the suggestion chip tap submit the prompt or just fill the input? Looking at the code: it submits immediately via `beginRun`. Manus has no equivalent — chip tap in NodeBench is a feature.
3. What's the behavior of `Ask NodeBench ↑` submit ring? Visible keyboard + runs classifier + fires `beginRun`.
4. Does pulling down in the Chat surface refresh? No gesture wired.
5. Does the bottom nav Chat tab — when already active — do anything (e.g. scroll to top, clear thread)? Need to verify.
