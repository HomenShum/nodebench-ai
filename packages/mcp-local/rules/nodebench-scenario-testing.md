# NodeBench: Scenario-Based Testing

Never write simple tests. Every test must be scenario-based.

## Every test must answer 6 questions

1. **Who** — Which user persona? (first-timer, power user, adversarial, mobile)
2. **What** — What is the user trying to achieve? (goal, not function)
3. **How** — Action sequence, timing, concurrency pattern
4. **Scale** — 1 user, 10 concurrent, 100 sustained
5. **Duration** — Short-running (burst) AND long-running (accumulation)
6. **Failure modes** — Edge cases, race conditions, degraded inputs

## Required categories per feature

| Category | What it covers |
|---|---|
| Happy path | Baseline correctness |
| Sad paths | Every error condition, boundary value |
| Concurrent | Race conditions, dirty reads, double-submit |
| Degraded | Slow network, auth expiry, partial failures |
| Long-running | State after 100+ sessions, memory growth |
| Adversarial | Injection, replay attacks, unexpected payloads |

## Anti-patterns (banned)

- Tests with no defined user persona
- Tests that mock everything and test nothing real
- Tests that pass at 1 user and are never run at 10+
- Declaring "tested" after a single happy-path check
