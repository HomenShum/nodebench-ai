---
name: dep-skills-howto
description: Schema and authoring guide for dep-* skills — project-local migration runbooks for high-touch dependencies. Use when a dep major-bump breaks CI and you need to either apply an existing recipe or write a new one.
trigger: when user asks "how do I write a dep skill", "add a migration recipe", or when CI fails after a dependabot bump and no matching dep-* skill exists yet
---

# How to write `dep-*` skills

Project-local migration runbooks for dependencies that bite us on upgrade. Each `dep-<package>` skill captures the **mechanical recipe** for moving from one version to the next, plus the **list of files in this repo** that consume the package.

## Why these exist

Without these, every dependabot major bump turns into a 30-90 minute archaeology session: read upstream `MIGRATION.md`, grep for affected files, learn the new API, hope I didn't miss anything. Multiply by 9 packages in a single dependabot group bump and you get the kind of cascade we hit on 2026-04-26 (467 typecheck errors after PR #107 admin-merged a `convex-runtime` group).

These skills are the **runbook**. Read once, apply with confidence.

## Schema

Each skill is `.claude/skills/dep-<short-name>/SKILL.md` with this frontmatter:

```yaml
---
name: dep-<short-name>           # matches directory; loaded as skill of this name
description: <one sentence — what package, what bumps it covers>
trigger: when <package> appears in package.json diff, when CI fails with <signature errors>, when user asks to bump <package>
---
```

Required body sections:

### `## Last verified`
The exact version-pair you tested against. Format: `from X.Y.Z to A.B.C, verified 2026-MM-DD`.

### `## Coupled bumps`
Other packages that MUST move in lockstep (peer deps, AI-SDK families, etc.). Include exact version constraints.

### `## Recipe`
Numbered steps. Each step is one mechanical action. Format:
```
1. Edit `<file>:<line range>` — change `oldPattern` to `newPattern`
2. Run `<command>` — should produce `<expected outcome>`
```

### `## Affected files`
List of files in THIS repo that import or use the package. Auto-regenerable from `npx tsc --noEmit` failure output after the bump (see Maintenance below).

### `## Verification`
Commands that must pass before the migration is considered complete:
```
npx tsc --noEmit                        -> 0 errors
npx tsc --noEmit -p convex/tsconfig.json -> 0 errors
npx vite build                          -> success
```

### `## Rollback`
If the migration breaks something not caught by typecheck, the exact `package.json` revert + `npm install` to restore last-known-good.

### `## Why upstream did this`
One paragraph: the upstream rationale (link to changelog/blog/RFC). Helps when judging whether to chase the new API or stay pinned.

## Maintenance contract

- **When you fix a regression by applying a skill recipe**: update `## Last verified` with today's date.
- **When you discover a new affected file**: add it to `## Affected files`.
- **When upstream ships another major bump that needs a different recipe**: ADD a new section, don't replace. Keep `## Migration: 0.4 -> 0.6` and `## Migration: 0.6 -> 0.8` side-by-side. Skills are append-mostly.
- **When the package is no longer used**: archive the skill to `.claude/skills/_archived/` with a "removed in commit ABC" note.

## What NOT to do

- Don't include upstream `MIGRATION.md` verbatim. Link to it. Distill the recipe to what THIS repo needs.
- Don't write skills for packages we don't depend on directly. Transitive-only deps don't need skills (the direct dep does).
- Don't write skills for routine minor/patch bumps. Those land via dependabot grouping with no review.

## When to invoke a `dep-*` skill

When you (Claude) see one of these signals, look for a matching skill and load it before doing anything else:

1. CI failure after a dependabot bump — search `.claude/skills/dep-*` for a skill matching the package in the failing PR
2. Typecheck error mentioning a known problem package
3. User says "bump <package>" or "migrate to <package>@<version>"
4. `package.json` diff shows a major-version bump on a tracked package

If no matching skill exists and the migration is non-trivial: WRITE one as you go. The next session pays itself back.

## Existing skills (this project)

| Skill | Covers | Last verified |
|---|---|---|
| `dep-convex-agent` | `@convex-dev/agent` v0.2 → v0.6 (AI SDK v5 → v6) | 2026-04-26 |
| `dep-tiptap-pm` | `@tiptap/pm` regression on 3.22.4 (./collab dropped) | 2026-04-26 |
| `dep-xlsx` | `xlsx` ReDoS + Prototype Pollution remediation | 2026-04-26 |
| `dep-vega` | `vega` 5 → 6 (XSS CVE fix) + ecosystem coordination | 2026-04-26 |

## Auto-regenerating affected-files lists

Manual approach (works today):
```bash
# After bumping package X, before applying migration:
npx tsc --noEmit -p convex/tsconfig.json 2>&1 \
  | grep -oE 'convex/[^\(]+' \
  | sort -u
```

The output is the candidate `## Affected files` list. Paste into the skill, then verify each one.

A future `scripts/regen-dep-skills.mjs` could automate this end-to-end. Out of scope for now.
