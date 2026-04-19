# Onboarding — 30 minutes to productive

You just cloned the repo. This page gets you oriented and productive in
30 minutes, without reading all 13 architecture docs.

## Minute 0–5 — Know what this is

Read, in order:

1. [`/README.md`](../README.md) — what the product is, 5 surfaces, core idea
2. [`/ARCHITECTURE.md`](../ARCHITECTURE.md) — one-minute pipeline diagram
3. [`docs/architecture/README.md`](architecture/README.md) — 13-doc index, 4 tiers

If you stop reading here, you already understand: NodeBench is an
open-source MCP that turns any Claude-compatible agent into a founder-diligence
workflow. It runs an orchestrator-workers pipeline with a shared scratchpad,
produces structured diligence blocks (founder, product, funding, news, etc.),
and surfaces them as living reports the user can keep, dismiss, or watch.

## Minute 5–15 — Run it locally

```bash
# 1. Install deps
npm install
# or the preferred pnpm if pnpm-workspace.yaml is present

# 2. Convex dev (backend)
npx convex dev

# 3. In another terminal — Vite dev server (frontend)
npm run dev
# opens http://localhost:5173
```

Click around the 5 surfaces:
- `?surface=home` — composer + recent reports
- `?surface=chat` — conversation workspace
- `?surface=reports` — entity grid
- `?surface=nudges` — return-to queue
- `?surface=me` — your context

## Minute 15–20 — Know the rules

If you're using Claude Code on this repo, the `.claude/rules/` directory
is your contract. Skim these five first:

| Rule | Why it matters |
|---|---|
| [`agentic_reliability.md`](../.claude/rules/agentic_reliability.md) | 8-point checklist for every backend change (BOUND, HONEST_STATUS, TIMEOUT, SSRF, …) |
| [`analyst_diagnostic.md`](../.claude/rules/analyst_diagnostic.md) | Trace root cause, don't bandaid |
| [`scenario_testing.md`](../.claude/rules/scenario_testing.md) | Tests must start from a real persona + goal + failure mode |
| [`completion_traceability.md`](../.claude/rules/completion_traceability.md) | Every task-complete cites the original ask |
| [`self_direction.md`](../.claude/rules/self_direction.md) | Don't wait for permission — decide, act, verify visually |

The full set is 31 rules with two-hop `related_` cross-references. Start narrow.

## Minute 20–25 — Know where the code lives

```
src/features/<feature>/           ← UI, feature-first, 30 folders
convex/domains/<domain>/          ← backend, 19 domain folders
server/                           ← node runtime (Express routes, MCP gateway, pipeline)
packages/mcp-local/               ← the published nodebench-mcp npm package
.claude/rules/ + .claude/skills/  ← Claude Code conventions
docs/architecture/                ← 13 canonical docs
```

Each feature folder has the same shape:
```
src/features/<name>/
├── views/          ← top-level page components
├── components/     ← feature-internal components
├── hooks/          ← feature-internal hooks
├── lib/            ← feature-internal utils
└── __tests__/      ← colocated tests
```

## Minute 25–30 — Pick a first contribution

Good first tasks:

| Task | What it teaches |
|---|---|
| Fix a typo in copy | Dev loop basics — edit, hot reload, commit, PR |
| Add a test to an uncovered pure function | `scenario_testing` rule in practice |
| Write a 3-line `README.md` for a scope-unclear root directory | The repo's "wayfinding" discipline |
| Follow [`guides/adding-a-diligence-block.md`](guides/adding-a-diligence-block.md) (if present) to add a stub block | The orchestrator-workers + scratchpad pattern end-to-end |
| Improve the `docs/architecture/README.md` index | Documentation convention |

## Troubleshooting

| Problem | Try |
|---|---|
| `npx tsc --noEmit` errors | You probably pulled without installing. `npm install` first. |
| Convex dev won't start | Check `.env.local` for `VITE_CONVEX_URL` — it must point to a deployed Convex instance or `npx convex dev` must be running. |
| Vite port conflict | Kill existing dev servers. `lsof -i :5173` (Mac/Linux) or `netstat -ano | grep 5173` (Windows). |
| Tests fail on fresh clone | Check Node version — `.nvmrc` or `package.json` engines field. |
| `vite-*.log` files appear | These should be gitignored; if not, add them to `.gitignore`. |

## What to avoid

- Don't add silent failure paths — `HONEST_STATUS` rule
- Don't add unbounded in-memory caches — `BOUND` rule
- Don't add new surfaces without a State / Target / Transition / Invariant spec
- Don't copy-paste patterns — parameterize (see `ProposalInlineDecorations` → `DiligenceDecorationPlugin` as an example of the wrong vs right approach)
- Don't skip the `analyst_diagnostic` process on bug fixes — bandaids accumulate

## Asking for help

- Read the relevant `docs/architecture/*.md` doc first
- Search `.claude/rules/` for the pattern
- Search existing code for a sibling pattern — most new work has a precedent
- Then open a GitHub Discussion

## What "shipped" looks like

- `npx tsc --noEmit` → 0 errors
- `npx vitest run` → all green
- `npm run build` → clean
- `npx playwright test tests/e2e/product-shell-smoke.spec.ts` → green
- Visual verification: screenshot the change at 1440×900
- If backend/infra: run the 8-point reliability checklist

## Now go build

Pick a task above, branch from `main`, and ship. When in doubt: fewer
assumptions, smaller commits, honest tests.

Welcome to NodeBench.
