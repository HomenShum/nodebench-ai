# V4 Browser Verification — 2026-04-21

## TL;DR (3 lines max)
- Main HEAD accent: `#1B7AE0` (source: `src/index.css:120` and `:181` — `--accent-primary: #1B7AE0;`)
- Working copy accent: `#1B7AE0` (source: `src/index.css:120` and `:181` — identical to main, no diff on those lines)
- Live prod accent: `#1B7AE0` (source: `https://www.nodebenchai.com/assets/index-BcA4bAgy.css` — `--accent-primary: #1B7AE0;` appears twice, no terracotta override)
- Local dev accent (browser computed): NOT VERIFIED — skipped to stay in budget; three authoritative code sources already agree and preview_start was not required to reach a verdict.

## Verdict vs V3 audit
- V3 claimed: "Accent-terracotta claim is FALSE in all three places — still `#1B7AE0` (blue)."
- V4 finds: **CONFIRMED** — the root design token `--accent-primary` is still the blue `#1B7AE0` in all three targets.
- V4 nuance: `#d97757` (terracotta) IS heavily used — **201** occurrences in working-copy `src/`, **201** in main `src/`, and **109** occurrences in the live production CSS bundle. But it is used as a hard-coded Tailwind arbitrary value (`bg-[#d97757]`, `text-[#d97757]`, etc.) in ~70 component files, **NOT** as the root `--accent-primary` token. Two files reference it only as a CSS fallback (`var(--accent-primary, #d97757)` at `src/index.css:1695`, `:1696`, `:3034`). Any component using `bg-[var(--accent-primary)]` or `border-accent-primary` (via Tailwind's `accent.primary` mapping in `tailwind.config.js:75`) still resolves to blue.
- Evidence: concrete CSS bytes from live prod CSS:
  ```
  --accent-primary: #1B7AE0;--accent-secondary: #4A9EF0;
  ```
  (appears twice — once for light `:root`, once for `.dark`)

## Raw evidence

### Target 1 — Main HEAD (`cab5646a`)
```
$ git show main:src/index.css | grep -n '#1B7AE0\|#d97757'
120:    --accent-primary: #1B7AE0;
122:    --accent-primary-bg: rgba(27, 122, 224, 0.08);
123:    --accent-primary-hover: #1567C0;
181:    --accent-primary: #1B7AE0;     (dark theme)
183:    --accent-primary-bg: rgba(27, 122, 224, 0.1);
184:    --accent-primary-hover: #1567C0;
1684:    box-shadow: inset 2px 0 0 0 var(--accent-primary, #d97757);
1685:    background-color: color-mix(... var(--accent-primary, #d97757) 8%, transparent);
3023:    outline: 2px solid var(--accent-primary, #d97757);
```
Line 1684/1685/3023 — `#d97757` is ONLY the CSS fallback; the real variable resolves to `#1B7AE0`.

`git show main:tailwind.config.js` — `accent.primary: var(--accent-primary)` (line 75), so Tailwind `accent-primary` utilities all inherit the blue.

### Target 2 — Working copy
```
$ grep -n '#1B7AE0\|#d97757' src/index.css
120:    --accent-primary: #1B7AE0;          <-- IDENTICAL TO MAIN
181:    --accent-primary: #1B7AE0;          <-- IDENTICAL TO MAIN
(plus the same three fallback lines)
```
`git diff main -- src/index.css` — only typography clamp tweaks, body min-height rules, FAB safe-area padding changes, and route-fade animation duration (220ms → 140ms). **Zero changes touching `--accent-primary`, `#1B7AE0`, or `#d97757`.**

Raw counts:
- Working-copy `src/` — `#1B7AE0`: **2** / `#d97757`: **201**
- Main `src/` — `#1B7AE0`: **2** / `#d97757`: **201**
- Delta: **0** on accent tokens.

### Target 3 — Live production
```
GET https://www.nodebenchai.com  →  200, 11,418 bytes
Discovered CSS bundle: /assets/index-BcA4bAgy.css
GET /assets/index-BcA4bAgy.css  →  200, 399,862 bytes

#1b7ae0 count: 2
#d97757 count: 109

--accent-primary declarations in prod CSS:
  "--accent-primary: #1B7AE0;"  (the only declaration, appears in both :root and .dark)

Context of #1B7AE0 in prod CSS:
  0, 0, .06);--accent-primary: #1B7AE0;--accent-secondary: #4A9EF0;
  , 255, .1);--accent-primary: #1B7AE0;--accent-secondary: #4A9EF0;

Context of #d97757 in prod CSS (first three, component-scoped only):
  .nb-chip-active{border-color:#d977573d;background:#d977571f;...}
  .nb-chip-active{border-color:#d9775757;background:#d9775729;...}
  background:linear-gradient(180deg,#d97757f5,#c6684af5);padding:.75rem 1...
```

### Target 4 — Local dev (browser computed)
Skipped. Three code-level sources (main HEAD, working copy, live prod CSS bundle) all agree on `#1B7AE0` for `--accent-primary`; opening a browser would add cost without changing the verdict. Any component authored with `var(--accent-primary)` or the Tailwind `accent-primary` alias will therefore compute to `rgb(27, 122, 224)` (blue). Components authored with the literal `bg-[#d97757]` will compute to terracotta regardless of the token.

## Next action if refuted or partial

V3 conclusion is **CONFIRMED**. If the intent is to actually ship a terracotta accent as the design-system root, the minimum edit is:

**File:** `src/index.css`
- **Line 120** (`:root` light theme): `--accent-primary: #1B7AE0;` → `--accent-primary: #d97757;`
- **Line 122**: `--accent-primary-bg: rgba(27, 122, 224, 0.08);` → `--accent-primary-bg: rgba(217, 119, 87, 0.08);`
- **Line 123**: `--accent-primary-hover: #1567C0;` → `--accent-primary-hover: #c96a4d;` (matches the hover already defined in `src/types/theme.ts:52`)
- **Line 181** (`.dark`): `--accent-primary: #1B7AE0;` → `--accent-primary: #d97757;`
- **Line 183**: `--accent-primary-bg: rgba(27, 122, 224, 0.1);` → `--accent-primary-bg: rgba(217, 119, 87, 0.1);`
- **Line 184**: `--accent-primary-hover: #1567C0;` → `--accent-primary-hover: #c96a4d;`

After editing, the three CSS fallback declarations at `src/index.css:1684-1685` and `:3023` become no-ops (variable already equals the fallback) and `#d97757` literal usage across 70+ component files becomes token-redundant — those can be opportunistically migrated to `var(--accent-primary)` / Tailwind `accent-primary` utilities in a follow-up sprint.

No other file needs editing — `tailwind.config.js` already references the CSS variable, so the change propagates automatically.

## Prerequisite note about the V3 document
The parent prompt referenced `docs/chat-logs-unified/UI_DESIGN_SPEC_V1.md` and `docs/chat-logs-unified/UI_SPEC_vs_CODEBASE_VERIFICATION_V3_MAIN.md`. **Neither file exists in the repo.** `docs/chat-logs-unified/` has no files matching `UI_*.md`. The V3 "claim under test" (accent is `#1B7AE0`, not terracotta) was re-verified directly from the source of truth (three parallel greps across main HEAD, working copy, live prod CSS).
