# NodeBench: Analyst Diagnostic

Guide yourself like an analyst diagnosing root cause, not a junior dev slapping on a bandaid.

## Before writing ANY fix

1. **Reproduce** — Confirm the exact failure mode
2. **Trace upstream** — Walk from symptom → intermediate state → root cause
3. **Ask "why" 5 times** — Each answer goes one level deeper
4. **Fix the cause** — The right fix makes the symptom impossible, not just invisible
5. **Verify no shift** — Check adjacent behavior didn't break

## Red flags you're bandaiding

- `try/catch` that swallows errors without understanding them
- `?.` optional chaining to mask `undefined` instead of finding why
- `as any` to silence type errors instead of fixing the mismatch
- Timeouts/retries to paper over race conditions
- "It works now" without understanding why it didn't before

## NodeBench tools for diagnosis

- `discover_tools('diagnose')` — find diagnostic tools
- `get_system_pulse()` — health snapshot
- `get_watchdog_log()` — drift detection history
