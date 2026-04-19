# Enterprise Investigation Eval

Generated: 2026-03-15T10:28:50.117Z
Judge model: gemini-2.0-flash
Concurrency: 2
Estimated judge spend: $0.000719
Total wall clock: 4267ms

## Summary

- Passed cases: 0/4
- Deterministic average: 85
- LLM judge average: 88
- Estimated judge tokens: 3649
- Estimated judge spend: $0.000719

## Cases

### XZ Utils trust-capture backdoor
- Deterministic: 85 (fail)
- LLM judge: 88 (pass)
- LLM judge estimated spend: $0.000192
- Observed facts: 3
- Evidence hashes: 3
- Proposed action: Freeze the affected release lane, rotate privileged maintainership, and require two-person review plus reproducible builds before the next distribution push.

### GitLab 2017 production database loss
- Deterministic: 85 (fail)
- LLM judge: 88 (pass)
- LLM judge estimated spend: $0.000184
- Observed facts: 3
- Evidence hashes: 3
- Proposed action: Lock down destructive production access, rehearse recovery from backup and replica promotion, and require two-person approval on irreversible data-plane commands.

### Enron off-balance-sheet coordination
- Deterministic: 82 (fail)
- LLM judge: 88 (pass)
- LLM judge estimated spend: $0.000190
- Observed facts: 3
- Evidence hashes: 3
- Proposed action: Tighten disclosure controls, segregate entity approvals from performance incentives, and require governance review before any related-entity reporting leaves finance.

### FTX and Alameda balance-sheet regime shift
- Deterministic: 89 (fail)
- LLM judge: 88 (pass)
- LLM judge estimated spend: $0.000153
- Observed facts: 3
- Evidence hashes: 3
- Proposed action: Segregate treasury authority, reconcile related-party exposures against primary ledgers, and require disclosure controls before any further capital movement.

Result: FAIL

Failures:
- xz-backdoor: deterministic failures: game_theory
- gitlab-db-loss: deterministic failures: game_theory
- enron-entities: deterministic failures: game_theory
- ftx-alameda: deterministic failures: game_theory
