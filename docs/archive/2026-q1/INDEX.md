# docs/archive/2026-q1 — Index

**Status:** Archived · read-only
**Archived:** 2026-04-19
**Reason:** Docs consolidation (Stage 1). These folders contained point-in-time records that are no longer load-bearing for the current architecture. Kept here for provenance.

## What's in here

| Folder | Was at | Count | Why archived |
|---|---|---|---|
| `completions/` | `docs/completions/` | 41 | Task-done records from sprints that shipped or were abandoned. Superseded by `docs/changelog/`. |
| `plans/` | `docs/plans/` | 38 | Historical plans, most shipped or deprecated. Living plans belong in issues/PRs now. |
| `reports/` | `docs/reports/` | 36 | Dogfood / QA reports — point-in-time evidence. Kept for reproducibility audits. |
| `sessions/` | `docs/sessions/` | 7 | Work-session transcripts. Reference-only. |
| `oracle/` | `docs/oracle/` | 4 | Notes for "The Oracle" surface, which was renamed to "System." Superseded. |
| `sitflow/` | `docs/sitflow/` | 2 | Experimental concept notes. Not wired into product. |
| `architecture-superseded/` | `docs/architecture/` (bulk) | 80+ | Architecture MDs superseded by the 13 canonical docs at `docs/architecture/`. Full provenance. |
| `loose-root-files/` | `docs/` (root) | 35+ | Formerly loose at `docs/` top level (PROACTIVE_*×7, REASONING_TOOL_*×5, NTFY/GLM/XAI/SMS integrations, old demo scripts, historical handoffs). |
| `prototypes/` | `docs/prototypes/` | 7 | HTML/MD prototypes. Historical reference. |
| `dogfood/` (where possible) | `docs/dogfood/` | variable | Dogfood findings and screenshots from prior QA sessions. May remain partial if filesystem locks prevented move. |

## Relocated off-repo for privacy (2026-04-19)

The `2025-Tax-Bundle/` folder (tax documents, 466 files, 34 MB) was deleted from the working tree — it had always been gitignored so no git history purge was required.

Additionally, **7 personal career markdowns** that were previously tracked in `docs/career/` were moved to `~/personal-notes/` (outside the repo) on 2026-04-19 for privacy:

- `AGENT_ENGINEER_PREP.md`
- `AGENTIC_ROLE_LANDSCAPE.md`
- `LINKEDIN_APPLICATION_LOG_MAR29.md`
- `LINKEDIN_POSTS_MAR29.md`
- `TAX_2025_CHECKLIST.md`
- `TESLA_INTERVIEW_PREP_MAR31.md`
- `UNANSWERED_REPLIES.md`

These files contained personal interview prep, job application logs, LinkedIn drafts, tax checklists, and private correspondence notes. They were reachable in the git history before 2026-04-19. If the repo ever becomes public, a deliberate `git filter-repo` pass should be planned separately to purge those files from history.

## Binary assets relocated off-repo (2026-04-19)

The following moved to `D:\NodeBench-Assets\` (outside the repo, not gitignored because not tracked):

- `demo-video/` — 102 MB, 656 files
- `demo-audio/` — 6 MB, 52 files
- `agent-setup-media/` — 145 MB, 59 iPhone HEIC/MOV captures (was `docs/agents/Agent_setup/` sans README)

Benchmark report JSONs + MDs moved in-repo from `docs/architecture/benchmarks/` to [`benchmarks/history/archived-2026-q1/`](../../../benchmarks/history/archived-2026-q1/) (28 MB, 237 files) — they stay tracked but in a more appropriate home.

## How to find something

- If you're looking for **how something works today**, start at [`docs/architecture/README.md`](../../architecture/README.md).
- If you're looking for **why a decision was made**, start at [`docs/decisions/`](../../decisions/) once that folder exists.
- If you're looking for **what shipped when**, see [`docs/changelog/`](../../changelog/).
- If you still can't find it, grep this archive.

## Restoring a file

If an archived doc turns out to still be load-bearing:

1. Confirm it's not already covered by a living doc in `docs/architecture/`.
2. If restoration is needed, `git mv` back to an appropriate live folder and update it to match the current architecture (don't restore stale).
3. Record the restoration in the commit message so the archive stays honest.

## Do not

- Do not treat archived docs as source of truth for the current system.
- Do not link to archived docs from living docs (except via this INDEX).
- Do not edit archived docs in place — if a concept still matters, the right move is to supersede, not resurrect.
