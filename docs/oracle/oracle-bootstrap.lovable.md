# Oracle Bootstrap for Lovable

This repo is builder-first. Treat Oracle as an internal control tower before a consumer experience.

Read first:
1. `ORACLE_VISION.md`
2. `ORACLE_STATE.md`
3. `ORACLE_LOOP.md`

Lovable-specific guidance:
- if backend integration is not practical in the current slice, mock lightly but keep the UI shaped around the real task/session contract
- do not redesign around a generic career dashboard
- keep game-like framing presentational only; evidence and telemetry stay deterministic

Loop:
1. restate the smallest UI slice
2. confirm which existing data surface it extends
3. implement
4. dogfood the screen
5. record the result in `ORACLE_STATE.md`

Do not expand into full end-user Oracle coaching flows in v1.
