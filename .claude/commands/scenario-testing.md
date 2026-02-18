# Scenario Testing Review

Review the tests in the current file or feature against the scenario-based testing mandate.

## What to check

For every test in scope, verify it meets ALL six criteria:

1. **Who** — Is a specific user persona defined? (not just "a user")
2. **What** — Is the test starting from a user goal, not a function signature?
3. **How** — Are action sequence, timing, and concurrency explicitly specified?
4. **Scale** — Does the test define behavior at 1 user AND 10+ concurrent? If not, flag it.
5. **Duration** — Does the test cover both short-running (burst) AND long-running (sustained) scenarios?
6. **Failure modes** — Are edge cases, degraded conditions, and adversarial inputs covered?

## Output format

For each test found, output:

```
Test: <test name>
Persona: <defined / MISSING>
Goal orientation: <user goal / function-signature-oriented — REWRITE>
Scale coverage: <1x only / 10x / 100x>
Duration: <short-only / long-only / BOTH>
Failure modes covered: <list or NONE>
Verdict: PASS / NEEDS REWORK
```

Then for each NEEDS REWORK:
- Explain what's missing
- Provide a rewritten scenario docstring using the anatomy template:

```
Scenario: <name>
User:      <persona>
Goal:      <user goal>
Prior state: <system state before scenario>
Actions:   <sequence with timing>
Scale:     <1x / 10x / 100x>
Duration:  <single request / session / multi-day>
Expected:  <state + side effects + UI>
Edge cases: <degraded / adversarial / partial>
```

## Anti-patterns to catch and flag

- Test has no persona ("user" with no context)
- Clean DB every time — no accumulated state
- No concurrency
- All assertions on return values only, no side effect checks
- `mockImplementation(() => ({}))` covering every dependency
- Happy path only — no sad paths
- "It passes in CI" with no production-scale verification plan