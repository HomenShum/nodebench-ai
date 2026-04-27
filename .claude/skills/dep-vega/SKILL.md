---
name: dep-vega
description: Coordinated bump runbook for the vega + vega-lite + vega-embed ecosystem. The 5 → 6 jump fixed CVE-2025-59840 (XSS) and required updating the spec schema URL from v5 to v6. Use when bumping any of these three packages or when the vega XSS CVE alert fires.
trigger: when vega, vega-lite, or vega-embed appears in package.json diff, when CVE-2025-59840 fires against vega, when user asks to bump charting deps, when SafeVegaChart spec schema needs updating
---

# `vega` ecosystem coordinated-bump runbook

## Last verified

- Working versions (since 2026-04-26):
  - `vega: ^6.2.0`
  - `vega-lite: ^6.4.3`
  - `vega-embed: ^7.1.0`
- Schema URL in `SafeVegaChart.tsx`: `https://vega.github.io/schema/vega-lite/v6.json`

## Why these three move together

The vega family has tight peer-dependency coupling:
- `vega-lite` peers on `vega: ^6.0.0`
- `vega-embed` peers on `vega: *` and `vega-lite: *` (loose, but in practice tracks majors)
- The Vega-Lite **spec schema URL** is version-locked in our component code

Bumping any one without the others either fails install (peer error) or runtime-fails when the schema URL doesn't match the installed Vega-Lite.

The 2026-04-26 bump in [PR #124](https://github.com/HomenShum/nodebench-ai/pull/124) was driven by `CVE-2025-59840` — a HIGH XSS vulnerability via expression abuse with `VEGA_DEBUG.toString` calls, fixed in `vega@6.2.0`.

## Coupled bumps (always do all three at once)

```json
"vega":         "^6.2.0",
"vega-embed":   "^7.1.0",
"vega-lite":    "^6.4.3"
```

Plus a schema URL update in code (see Recipe Step 3).

## Recipe (bumping to a newer 6.x or 7.x)

### Step 1 — Verify peer compatibility
```bash
npm view vega-lite@<target> peerDependencies      # confirm "vega: ^6.0.0" range
npm view vega-embed@<target> peerDependencies     # usually "vega: *", "vega-lite: *"
```

### Step 2 — Bump all three in `package.json`
```diff
-"vega":         "^6.2.0",
-"vega-embed":   "^7.1.0",
-"vega-lite":    "^6.4.3",
+"vega":         "^6.X.0",
+"vega-embed":   "^7.X.0",
+"vega-lite":    "^6.X.0",
```

Then `npm install`.

### Step 3 — Update spec schema URL (if vega-lite major changed)

If `vega-lite` major version changed (5 → 6 or 6 → 7), update the schema URL in [SafeVegaChart.tsx](src/features/research/components/SafeVegaChart.tsx):

```diff
- (spec as any).$schema = "https://vega.github.io/schema/vega-lite/v6.json";
+ (spec as any).$schema = "https://vega.github.io/schema/vega-lite/v7.json";
```

If only minor/patch, no schema URL change needed (URLs are pinned to the major).

### Step 4 — Verify
```bash
npx tsc --noEmit              # 0 errors
npx vite build                # success
```

### Step 5 — Visual smoke (only meaningful when SafeVegaChart is wired into a route)

As of 2026-04-26, `SafeVegaChart` is **defined but not imported anywhere** in the route tree — it's orphan code. Build verification covers everything that runs.

When/if it gets wired up:
1. Start dev server and navigate to the chart-rendering route
2. Verify the chart renders (or falls back to FallbackChart cleanly)
3. Check browser console for vega-embed errors

## Affected files

- [package.json](package.json) — three deps to coordinate
- [src/features/research/components/SafeVegaChart.tsx](src/features/research/components/SafeVegaChart.tsx) — schema URL constant on line ~246, plus dynamic `import("vega-embed")`
- [src/features/research/components/ScrollytellingLayout.tsx](src/features/research/components/ScrollytellingLayout.tsx) — references SafeVegaChart but isn't itself wired into a route

No other consumers of vega APIs in the repo.

## Verification

```bash
# After any vega ecosystem bump:
node -e "['vega','vega-lite','vega-embed'].forEach(p => console.log(p, require(p+'/package.json').version))"
# All three must be on the intended major

npx tsc --noEmit
npx vite build

# Spec schema URL check (manual):
grep "vega.github.io/schema/vega-lite/v" src/features/research/components/SafeVegaChart.tsx
# Must match the installed vega-lite major
```

## Rollback

If a bump breaks something, revert all three in `package.json`:
```json
"vega":         "^6.2.0",
"vega-embed":   "^7.1.0",
"vega-lite":    "^6.4.3"
```
And restore the schema URL to `v6.json` if it was bumped.

## Why upstream did this (5 → 6)

Vega 6 was a major rework of the expression evaluator + rendering pipeline. The XSS CVE (`CVE-2025-59840`) only exists in 5.x — the new evaluator in 6 doesn't expose `VEGA_DEBUG.toString` to user-supplied expressions. Vega-Embed 7 follows because it depends on the new vega evaluator API.

See https://github.com/vega/vega/security/advisories/GHSA-fjj7-mp6p-7g6r for the CVE detail.

## When to revisit

- A new vega major (7+) ships — coordinate all three bumps + schema URL update
- A new CVE appears against any of the three — check the advisory's "fixed in" version, then plan a coordinated bump
- `SafeVegaChart` finally gets wired into a route — at that point a visual smoke test becomes mandatory before any future bump
