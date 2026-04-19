# Repo Structure Audit — Golden Standard for New Contributors

Grading the repo against "would a student, colleague, or future-me be able to
onboard in under 30 minutes without help?"

## Grade: **B−**

Strong foundations (monorepo layout, feature-first src, rich `.claude/rules/`,
comprehensive `docs/architecture/`). Fails on wayfinding: a new contributor
drops into a root with 16 random `.md` files, 20+ tmp/test artifacts, no
`LICENSE`, no `CONTRIBUTING.md`, no `ARCHITECTURE.md`, and no "start here"
pointer.

Going from B− to A requires ~2 hours of cleanup, not a refactor.

## What's golden ✅

| Asset | Why it's good |
|---|---|
| `packages/` monorepo split | `mcp-local`, `mcp-client`, `convex-mcp-nodebench` have clear scope each |
| `src/features/*` feature-first | 30 feature folders, each with views/components/hooks — consistent |
| `convex/domains/*` domain split | 19 domains, not 55 — matches the March 2026 restructuring |
| `.claude/rules/` (31 rules) | Modular, each with `related_` frontmatter — two-hop discovery works |
| `docs/architecture/` depth | 128 ADR-style documents capture every significant decision |
| `docs/` subdivision | 17 subdirectories by topic (agents, architecture, benchmarks, career, changelog, dogfood, golden-sets, guides, hackathon, product, qa, research, sitflow, …) |
| `README.md` | Exists at root + docs has its own README |
| Tests colocated with features | `*.test.ts` next to source — discoverable |

## What's not golden 🔴 — concrete gaps

### Gap 1 — No root `LICENSE` file (confirmed earlier audit)
- GitHub auto-detection shows `license: null`
- Pitch claims "Open-source (MIT)" but top-level repo has no license badge
- **Fix:** copy `packages/mcp-local/LICENSE` to repo root. 30-second change.

### Gap 2 — Missing onboarding trilogy
- No `CONTRIBUTING.md` — OSS contributors have nowhere to start
- No `ONBOARDING.md` / `NEW_CONTRIBUTOR.md` — internal onboarding undocumented
- No root-level `ARCHITECTURE.md` pointing into `docs/architecture/*`
- New contributor has to read 128 files to find the entry point
- **Fix:** write three short docs (each <200 lines); link to existing rule + ADR files

### Gap 3 — Root folder clutter (20+ stray files)
```
NUL                              Windows artifact, never gitignored
CODEBASE_STRUCTURE.json          should be under docs/architecture/
eng.traineddata                  tesseract data — belongs in test_assets/
dt-force.json, dt-no-rc.json,
  dt-proof-skip.bat, dt-query-test.json, dt-query.json, dt-skip.json,
  dt-threshold.json             7 DeepTrace dev JSON files — belong in scripts/deeptrace/ or .gitignore
tmp-capture-mobile.js           tmp file committed
tmp-chrome-procs.txt            tmp file committed
tmp-mcp-ledger-route-proof.png  tmp file committed
tmp-playwright-procs.txt        tmp file committed
tmp-playwright-profile.txt      tmp file committed
tmp-vite-qa.log                 log file committed
test-output.log, test-results.json  test artifacts committed
vite-5174.error.log, vite-5174.log  log files committed
```
- **Fix:** add to `.gitignore`, delete from repo, move keepers to proper folders

### Gap 4 — Stray `.md` files at repo root (16 total)
Should be at root: `README.md`, `CLAUDE.md`, `AGENTS.md` (3 — appropriate)
Should move to docs/:
- `AI_FLYWHEEL.md` → `docs/architecture/`
- `AgentNativeUI.md` → `docs/architecture/`
- `MOBILE_BOTTOM_TAB_PROMPT.md` → `docs/product/`
- `MOBILE_UX_COMPARISON.md` → `docs/product/`
- `NODEBENCH_MOBILE_UX_PRINCIPLES.md` → `docs/product/`
- `ORACLE_LOOP.md`, `ORACLE_STATE.md`, `ORACLE_VISION.md` → `docs/architecture/oracle/`
- `UNIFIED_TEMPORAL_AGENTIC_OS.md` → `docs/architecture/`
- `oracle-bootstrap.claude-code.md`, `.codex.md`, `.cursor.md`, `.lovable.md` → `docs/agents/bootstrap/`

### Gap 5 — No index for `docs/architecture/` (128 files)
- No `docs/architecture/INDEX.md` or table-of-contents
- Student opens `docs/architecture/` and faces 128 alphabetical file names
- **Fix:** generate `INDEX.md` with one-line summary per file, grouped by topic

### Gap 6 — No repo tree map for newcomers
- `README.md` doesn't show the top-3-levels directory layout
- New contributor must `ls` every folder to understand scope
- **Fix:** add a "Codebase map" section to README with annotated tree

### Gap 7 — Scope-unclear top-level dirs
```
agents/           Purpose? Distinct from src/features/agents/?
api/              Deprecated next-app/api or active?
apps/             What lives here vs packages/?
dev/              Dev-only scripts? Or something else?
dist/             Build artifact (should gitignore if not already)
distribution/     npm publish staging?
mcp_tools/        Duplicate of packages/mcp-local?
out/              Build artifact
plans/            WIP doc drafts? Should be docs/plans/
remotion/         Video rendering? One-liner purpose doc missing
services/         Purpose? Distinct from server/services/?
shared/           Purpose? Distinct from src/shared/?
skills/           Active? Distinct from .claude/skills/?
test-agents/      Agent fixtures for tests? Belongs in tests/fixtures/
test_assets/      OK — test data
vault/            What? No README
vendor/           Third-party — good if readme present
```
Many of these may be legitimate — but a new student can't tell. Each needs a
one-line README explaining purpose + linking canonical location.

### Gap 8 — `src/features/research/` is 2030 files
Largest feature by an order of magnitude. Likely absorbs multiple responsibilities.
Unclear if a new contributor should treat it as one feature or as 3–4 sub-features.
- **Fix:** either split into sub-features (`research/signals`, `research/diligence`, `research/narrative`) or add a `README.md` explaining the internal structure

### Gap 9 — `.claude/skills/` had 3 skills earlier but count unstable
Earlier grep showed `agent-run-verdict-workflow`, `flywheel-ui-dogfood`, `owner-mode-end-to-end`.
Later count showed 0. Likely a path/symlink/depth issue.
- **Fix:** audit one canonical location for skills; document in `.claude/README.md`

## What "A-grade" looks like

Minimum set of additions to earn A:

```
/LICENSE                                     MIT, copied from packages/mcp-local/
/CONTRIBUTING.md                             how to contribute, PR flow, test bar
/ARCHITECTURE.md                             top-level pointer → docs/architecture/INDEX.md
/docs/ONBOARDING.md                          30-minute new-contributor path
/docs/architecture/INDEX.md                  catalogue of the 128 ADRs, grouped
/docs/architecture/REPO_STRUCTURE_GOLDEN_AUDIT.md   (this file)
/.claude/README.md                           explains .claude/ layout + rules + skills
/.gitignore                                  add: NUL, tmp-*, *.log, dt-*, test-output.log, test-results/, dist/, out/
/README.md                                   add "Codebase map" section with annotated tree
```

Plus cleanup: remove the 20 stray tmp/log files, move 10 stray root `.md`
files into `docs/` subdirs.

## Sample tree map for README (proposed)

```
nodebench-ai/
├─ CLAUDE.md                  # Claude Code conventions for this repo
├─ AGENTS.md                  # agent methodology, eval bench
├─ README.md                  # this file
├─ LICENSE                    # MIT
├─ CONTRIBUTING.md            # how to contribute
├─ ARCHITECTURE.md            # architectural map → docs/architecture/
│
├─ src/
│  ├─ features/               # feature-first UI (30 feature folders)
│  ├─ shared/                 # shared components, hooks, utils
│  ├─ lib/                    # libraries (registry, analytics, errorReporting)
│  └─ …
│
├─ server/
│  ├─ pipeline/               # agent harness runtime + diligence blocks
│  ├─ routes/                 # HTTP routes (Express)
│  ├─ mcpGateway.ts, mcpAuth  # WebSocket MCP gateway
│  └─ …
│
├─ convex/
│  ├─ domains/                # 19 domain folders (agents, product, research, …)
│  ├─ schema.ts               # database schema
│  └─ crons.ts                # scheduled jobs
│
├─ packages/
│  ├─ mcp-local/              # the published nodebench-mcp npm package
│  ├─ mcp-client/             # typed client SDK
│  └─ convex-mcp-nodebench/   # Convex-side MCP auditor
│
├─ .claude/
│  ├─ rules/                  # 31 modular rules with related_ cross-refs
│  ├─ skills/                 # reusable how-to procedures
│  └─ README.md               # map of the .claude/ layout
│
├─ docs/
│  ├─ architecture/           # 128 ADRs — see INDEX.md
│  ├─ agents/                 # agent-specific docs
│  ├─ guides/                 # how-to guides
│  ├─ product/                # product decisions
│  ├─ qa/                     # QA protocols
│  └─ …
│
├─ tests/
│  ├─ e2e/                    # Playwright end-to-end
│  └─ fixtures/               # shared fixtures
│
├─ scripts/                   # one-off scripts (dogfood, eval harness)
├─ public/                    # static assets served by Vite + Vercel
└─ vendor/                    # third-party (claw3d, openclaw refs)
```

## One-line purpose doc template (for each scope-unclear dir)

Each of `agents/`, `apps/`, `dev/`, `distribution/`, `mcp_tools/`, `plans/`,
`remotion/`, `services/`, `shared/` at root should get a 3-line README:

```markdown
# <name>/

Purpose: <one sentence>
Owner: <person / team>
Status: active | deprecated | experimental
Canonical location (if deprecated): <path>
```

## Migration order (least risk → most risk)

1. Add `LICENSE`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `docs/ONBOARDING.md`, `docs/architecture/INDEX.md` (additions — zero risk)
2. Add `.gitignore` entries + delete tmp/log files (no callers — zero risk)
3. Move 10 stray root `.md` files into `docs/` subdirs (need to update any internal links — low risk)
4. Add 3-line READMEs to scope-unclear dirs (additions — zero risk)
5. Audit and either split `src/features/research/` or add its own README (low risk)
6. Evaluate scope-unclear dirs for removal/consolidation (higher risk — defer)

Steps 1–4 can happen in a single PR and take ~2 hours.

## Net verdict

The bones are golden. The polish is missing. A new student would get lost in
the first 5 minutes because there's no "start here" doc — not because the
architecture is bad. Two hours of cleanup + three onboarding docs move the
grade from B− to A.

## Suggested Phase 0 — ship before the diligence-block work

Add the 2-hour cleanup as "Phase 0" before the 4-week Phase 1 implementation.
Prevents every future contributor (including future-Claude sessions) from
re-paying the wayfinding cost on each read.
