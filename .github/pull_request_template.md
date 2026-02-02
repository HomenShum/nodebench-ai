## Audit lane checklist (DRANE/Newsroom)

If this PR touches Newsroom/DRANE behavior or golden sets:

- [ ] Ran `npm run golden:generate` (if changing corpus generation)
- [ ] Ran `npm run golden:build`
- [ ] Ran `npm run golden:check`
- [ ] Ran deterministic QA lane (Convex): `domains/narrative/tests/qaFramework:runFullSuite`
- [ ] Updated suite `version` for any expectation changes
- [ ] Added/updated governance notes for corpus changes (`convex/domains/narrative/tests/goldenSets/GOVERNANCE.md`)

## Summary

Describe the change and why it is safe from an audit/replay perspective.

