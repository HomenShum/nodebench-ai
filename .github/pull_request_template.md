## Summary

What changed, why, and what user/runtime risk does it reduce?

## Scope guard

- [ ] This PR has one concern.
- [ ] I did not wholesale-merge old dirty worktrees or stale parity branches.
- [ ] If this touches UI/design, I followed `docs/runbooks/PROD_PARITY_UI_KIT_WORKFLOW.md`.
- [ ] If this touches runtime/backend, live Convex/API behavior is preserved.
- [ ] No `.env*`, screenshots with private data, build outputs, or generated noise are included.

## Verification

- [ ] `npx tsc --noEmit --pretty false`
- [ ] Targeted Vitest or scenario tests for touched code
- [ ] `npm run build`
- [ ] Browser verification for changed UI/routes, if applicable
- [ ] Convex/typecheck/deploy verification noted, if applicable

## UI/product checks

- [ ] Main web nav remains `Home - Reports - Chat - Inbox - Me`, if touched.
- [ ] Workspace remains a separate deployed surface, if touched.
- [ ] Screenshots or visual notes are attached for changed views, if applicable.
- [ ] No production path silently falls back to fixtures/starter data.

## Audit lane checklist (DRANE/Newsroom)

If this PR touches Newsroom/DRANE behavior or golden sets:

- [ ] Ran `npm run golden:generate` (if changing corpus generation)
- [ ] Ran `npm run golden:build`
- [ ] Ran `npm run golden:check`
- [ ] Ran deterministic QA lane (Convex): `domains/narrative/tests/qaFramework:runFullSuite`
- [ ] Updated suite `version` for any expectation changes
- [ ] Added/updated governance notes for corpus changes (`convex/domains/narrative/tests/goldenSets/GOVERNANCE.md`)
