---
name: dep-tiptap-pm
description: Pin runbook for @tiptap/pm. Pinned to 3.22.3 because 3.22.4 dropped the ./collab package export, which some transitive consumer (likely @blocknote or @tiptap/extensions) still relies on. Use when bumping tiptap or when build fails with "./collab is not exported".
trigger: when @tiptap/pm appears in package.json diff, when vite build fails with "./collab is not exported under the conditions" or "rolldown:vite-resolve" error mentioning @tiptap/pm, when user asks to bump tiptap
---

# `@tiptap/pm` pin runbook

## Last verified

- Working pin: `3.22.3` (held since 2026-04-26)
- Known-bad version: `3.22.4` (drops `./collab` export, breaks `vite build`)

## Why we're pinned

`@tiptap/pm@3.22.4` removed `./collab` from its `package.json` `exports` map. Some transitive consumer in our dep graph still imports `@tiptap/pm/collab` — we couldn't find the importer with 87K-file grep across `node_modules`, suggesting either rolldown's transitive probing or a dynamic import we didn't catch.

The build error:
```
[rolldown:vite-resolve] Error:
"./collab" is not exported under the conditions
["module", "browser", "production", "import"] from package @tiptap/pm
```

This regression landed in [PR #113](https://github.com/HomenShum/nodebench-ai/pull/113) (minor-and-patch group bump that moved `@tiptap/pm` 3.13.0 → 3.22.4 alongside `@blocknote/*` 0.44 → 0.49). Hotfixed by [PR #148](https://github.com/HomenShum/nodebench-ai/pull/148).

## Version-by-version `./collab` history

Established by querying `npm view @tiptap/pm@<v> exports`:

| Version range | `./collab` exported? |
|---|---|
| ≤ 3.13.0 | ✅ yes |
| 3.14.0 – 3.21.0 | ✅ yes |
| 3.21.1 – 3.21.3 | ❌ NO (interim removal) |
| 3.22.0 – 3.22.3 | ✅ yes (restored) |
| 3.22.4 | ❌ NO (final removal) |

The pattern (remove → restore → remove again) suggests intentional deprecation. Don't expect 3.22.5+ to bring `./collab` back.

## Recipe (when an importer is finally identified)

### Option A — fix the importer

If we can find the package importing `@tiptap/pm/collab` (likely candidates: `@blocknote/core`, `@blocknote/react`, `@tiptap/extensions`):
1. Bump that package to a version that doesn't import `./collab` (likely a newer minor that switched to importing from `prosemirror-collab` directly).
2. Remove the `@tiptap/pm` pin in `package.json` (let it float to latest).
3. Run `npm install` then `npx vite build` — should succeed.

### Option B — replace `prosemirror-collab` import sites

If the importer is in OUR code (sometimes shows up after deeper grepping):
```diff
-import { collab } from "@tiptap/pm/collab"
+import { collab } from "prosemirror-collab"
```
`prosemirror-collab` is what `@tiptap/pm/collab` re-exported; the underlying package is unchanged.

### Option C — stay pinned (current state)

Just close any dependabot PR proposing 3.22.4 with a link to this skill.

## Recipe (just bumping tiptap minor/patch within the working range)

When dependabot proposes 3.22.0 – 3.22.3 (or earlier 3.x):
1. Verify no `./collab`-removal sub-version snuck in: `npm view @tiptap/pm@<target> exports --json | grep collab`
2. Bump in `package.json`
3. `npm install && npx vite build` — must succeed

## Affected files

No direct importers of `@tiptap/pm/collab` in `src/`, `convex/`, or `shared/` — confirmed via grep. The import is somewhere in the transitive graph below `@blocknote/*` or `@tiptap/extensions` but couldn't be precisely located in the 2026-04-26 hunt.

## Verification

```bash
node -e "console.log(Object.keys(require('@tiptap/pm/package.json').exports).includes('./collab'))"
# Must print: true

npx vite build
# Must succeed without "./collab is not exported" error
```

## Rollback

If a bump is attempted and breaks:
```json
"@tiptap/pm": "3.22.3"
```
Then `npm install`. Should restore working build.

## Why upstream did this

Tiptap is gradually decoupling from re-exporting prosemirror sub-packages, encouraging consumers to depend directly on `prosemirror-collab` etc. The `./collab` removal is part of that cleanup. See `@tiptap/pm` changelog when looking up specific versions.

## When to revisit the pin

- Whenever you find time to grep deeper for the actual `./collab` importer (try `npm ls --all @tiptap/pm` + walking each consumer's dist for the literal string)
- When `@blocknote/*` ships a version that explicitly notes "removed deprecated collab re-export"
- When dependabot proposes a `@blocknote/*` major bump — verify it doesn't reintroduce the import

## Coupled packages (move together)

`@blocknote/*` (core, react, mantine) — these are the prime suspects for the transitive `./collab` importer. Bumping `@tiptap/pm` past 3.22.3 likely needs a coordinated `@blocknote/*` bump.
