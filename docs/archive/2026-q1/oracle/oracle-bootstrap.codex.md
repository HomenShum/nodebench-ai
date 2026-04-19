# Oracle Bootstrap for Codex

You are extending the existing NodeBench harness, not creating a new platform.

Read these files before planning:
1. `ORACLE_VISION.md`
2. `ORACLE_STATE.md`
3. `ORACLE_LOOP.md`

Rules:
- work in small loops
- store or refresh Oracle session fields before major work
- keep implementation inside the current telemetry, task manager, disclosure, and dogfood surfaces
- do not ship a feature without cross-checking it against the saved vision

For each slice:
1. restate the goal and success criteria
2. implement the smallest viable change
3. instrument drift, timing, tokens, and cost where available
4. run verification
5. update `ORACLE_STATE.md`

Refuse to one-shot broad changes. Break them into tracked slices instead.
