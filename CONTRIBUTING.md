# Contributing to NodeBench AI

Thanks for your interest. NodeBench is open source (MIT). This guide tells you
where to start, what bar to meet, and how to ship.

## Start here — 30 minutes

1. **Read** [`docs/README.md`](docs/README.md) — overall doc layout.
2. **Read** [`docs/architecture/README.md`](docs/architecture/README.md) — the 13 canonical docs and the 4-tier structure.
3. **Read** [`docs/runbooks/PROD_PARITY_UI_KIT_WORKFLOW.md`](docs/runbooks/PROD_PARITY_UI_KIT_WORKFLOW.md) before any UI/design-kit work.
4. **Skim** [`.claude/rules/`](.claude/rules/) — if you're using Claude Code on this repo, these are the enforced conventions (31 modular rules, each with `related_` frontmatter for two-hop discovery).
5. **Run** the app locally per [`docs/guides/local-development.md`](docs/guides/local-development.md) if it exists, otherwise `README.md` quickstart.

## What we accept

| Contribution | Bar |
|---|---|
| Bug fix | Reproduce, root-cause (see `.claude/rules/analyst_diagnostic.md`), fix the cause not the symptom, add a scenario test |
| New diligence block | Follows `DiligenceBlock<T>` contract in [`docs/architecture/DILIGENCE_BLOCKS.md`](docs/architecture/DILIGENCE_BLOCKS.md) · authority allowlist · gates · fixtures · legal check |
| UI change | Visual verification (screenshot before/after) · `npx tsc --noEmit` clean · `npx vitest run` clean · respects `docs/architecture/DESIGN_SYSTEM.md` |
| New rule or skill | Follows the template of existing files in `.claude/rules/` (frontmatter, `related_`, prior art citation) |
| Architecture change | New ADR in `docs/architecture/plans/` with date prefix; supersedes existing via clear "Supersedes: [OLD.md]" header |

## What we don't accept (without discussion first)

- Silent auto-persistence of agent output (every new artifact needs an explicit promote flow)
- Unbounded in-memory caches (see `.claude/rules/agentic_reliability.md`)
- Fake confidence scores / hardcoded evidence floors
- New surface areas without a State / Target / Transition / Invariant spec
- New top-level directories without a 3-line README explaining purpose

## How to submit a change

1. Branch from current `main` unless maintainers explicitly say otherwise.
2. Commit small, reviewable units (ideally <300 lines changed per commit)
3. `npx tsc --noEmit` must be 0 errors
4. `npx vitest run` must pass all tests
5. If you touched the UI: include before/after screenshots at 1440x900 and `375x812` (mobile)
6. If you touched agent pipeline or backend: run `npm run dogfood:verify:smoke` if it exists
7. Open a PR with a clear description — what changed, why, what risks, how verified

## Repository controls

The expected GitHub repository baseline is documented in
[`docs/runbooks/GITHUB_REPOSITORY_SETUP.md`](docs/runbooks/GITHUB_REPOSITORY_SETUP.md).

Maintainers should keep these controls enabled:

- `main` branch protection with required PR review
- Code Owner review
- required checks: `CI / Typecheck`, `CI / Runtime smoke`, `CI / Build`
- Dependabot alerts and security updates
- automatic branch deletion after merge

If repository settings drift, run:

```powershell
node scripts/github/configureRepoSettings.mjs --apply
```

## Code style

- **TypeScript strict mode** — no `any` in new code unless justified in comment
- **No ESLint disables** without a comment explaining why
- **Feature-first** — new code goes under `src/features/<feature>/`, not in loose `src/` folders
- **Tests colocated** — `*.test.ts` next to the file it tests (except e2e which lives in `tests/e2e/`)
- **Scenario tests, not shallow tests** — see `.claude/rules/scenario_testing.md`

## Commits

Conventional commit prefixes are encouraged:
- `feat(scope):` — new feature
- `fix(scope):` — bug fix
- `refactor(scope):` — refactor, no behavior change
- `docs(scope):` — docs only
- `test(scope):` — tests only

Commit body should answer "why", not just "what". The "what" is in the diff.

## Reporting security issues

Do **not** open a public issue for security vulnerabilities. Email the
maintainer (see [`package.json`](package.json) `author` field) or contact
privately via GitHub security advisories.

See [`docs/architecture/USER_FEEDBACK_SECURITY.md`](docs/architecture/USER_FEEDBACK_SECURITY.md)
for our threat model on user-submitted content.

## Where to ask

- Design questions → open a GitHub Discussion
- Bug reports → GitHub Issues with the `bug` label + reproduction steps
- Feature requests → GitHub Issues with the `enhancement` label + user story

## Attribution for prior art

Many patterns in this repo borrow from well-documented industry practice
(Anthropic's "Building Effective Agents", Manus AI's virtual workspace,
Cognition Devin, Claude Code's layered file-based memory, Cursor, Perplexity,
LangSmith, etc.). When adding a new pattern, cite its prior art in the
module header comment AND in the relevant `docs/architecture/` doc. See
`.claude/rules/reference_attribution.md` (if present) for the exact format.

## License

By contributing, you agree that your contributions will be licensed under the
same MIT license that covers the project. See [`LICENSE`](LICENSE).
