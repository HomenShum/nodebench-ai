# QA Dogfood Protocol

After ANY implementation change (new feature, bug fix, refactor, style change):

1. Run `npx tsc --noEmit` -- must be 0 errors
2. Run `npx vitest run` -- must be 0 failures
3. Start preview server and verify ALL 5 surfaces render:
   - Ask (DeepTrace), Memo (Decision Workbench), Research (Research Hub), Editor (Workspace), Telemetry (The Oracle)
4. Test navigation: left rail switches, CTA buttons, demo cards
5. Check console for errors on every surface
6. Verify right rail shows correct surface title (not generic names)
7. Verify trace bar renders with timestamp
8. If FastAgent panel was modified, verify "Ask NodeBench" branding

## Automated checks

Run `node scripts/qa-dogfood.mjs` to execute build checks and print the full manual checklist.

## Navigation regression checks

- Navigate to trace surface with a runId, then switch away -- runId must clear from URL
- Navigate back to trace -- no stale runId should appear
- Right rail title must update on every surface switch

## Never declare work complete without running this checklist.

## Related rules
- `dogfood_verification` -- UI dogfood protocol + screenshot evidence
- `analyst_diagnostic` -- root-cause diagnosis, not bandaids
- `flywheel_continuous` -- continuous poll/diagnose/fix/dogfood loop
- `completion_traceability` -- cite original request on task completion
