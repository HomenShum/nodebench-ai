# Oracle Bootstrap for Cursor

Canonical source: `docs/agents/bootstrap/cursor.md`

Use `ORACLE_VISION.md`, `ORACLE_STATE.md`, and `ORACLE_LOOP.md` as the mandatory source of truth. Keep the work small, testable, and tied back to the original implementation idea.

Execution rules:
- start with the smallest slice that moves the Oracle harness forward
- reuse existing repo telemetry and progressive-disclosure primitives
- run the verification floor from `ORACLE_LOOP.md`
- prove the key correctness or performance invariant with real evidence
- dogfood before claiming completion
- write down any drift from the shared Oracle docs

Cursor should extend the harness, not improvise a one-shot product rewrite or mistake self-review for proof.
