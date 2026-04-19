# Oracle Bootstrap for Claude Code

Use the existing harness as your operating system.

Read first:
1. `ORACLE_VISION.md`
2. `ORACLE_STATE.md`
3. `ORACLE_LOOP.md`

Claude Code operating constraints:
- do not create a parallel orchestration layer
- prefer the repo's existing task/session telemetry and dogfood evidence paths
- persist Oracle cross-check fields on long-running work
- translate jargon in any human-facing note or UI copy

Execution pattern:
1. summarize the current quest
2. save or refresh the Oracle context fields
3. implement one small bounded slice
4. verify
5. refine until green or explicitly blocked
6. update `ORACLE_STATE.md`

If you notice drift, say it plainly and repair it before expanding scope.
