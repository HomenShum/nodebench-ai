# Oracle Bootstrap for Claude Code

Canonical source: `docs/agents/bootstrap/claude-code.md`

Before any code change, read `ORACLE_VISION.md`, `ORACLE_STATE.md`, and `ORACLE_LOOP.md`. Then pick a small slice, implement it, verify it, dogfood it, and update state.

Claude Code must not one-shot the full Oracle product. The expected behavior is a closed loop:
- plan the smallest slice
- code the slice
- run verification
- prove the main invariant with measured evidence
- run dogfood
- compare with the shared Oracle docs
- record alignment or drift

If a recommendation lacks evidence or source refs, it is incomplete. If the same model wrote the code, its self-review does not count as sufficient proof.
