# NodeBench: Agentic Reliability Checklist

Run this 8-point checklist on every backend/infra change that agents interact with.

## The 8 Checks

1. **BOUND** — Every in-memory collection (Map, Array, Set) has MAX size + eviction
2. **HONEST_STATUS** — No 2xx on failure paths. 502/504/500 for real failures.
3. **HONEST_SCORES** — No hardcoded score floors. Default to 0/"UNKNOWN" when data is unavailable.
4. **TIMEOUT** — AbortController + budget gates on every external call
5. **SSRF** — URL validation before fetch (block RFC1918, metadata endpoints)
6. **BOUND_READ** — Response size caps on external bodies (streaming reader + cancel)
7. **ERROR_BOUNDARY** — Async error handling on all routes (try/catch or asyncHandler)
8. **DETERMINISTIC** — Sorted-key hashing for content-addressed storage

## Severity

| Level | Definition | SLA |
|-------|-----------|-----|
| P0 | Crash, SSRF, false data → Fix immediately |
| P1 | Degraded data, no crash → Fix same session |
| P2 | Suboptimal but safe → Fix when touched |

## Why agents amplify every bug

- Unbounded Maps OOM in minutes under agent loops
- Fake 201s become false beliefs in reasoning chains
- Inflated scores cause agents to skip verification
- Unhandled rejections crash the process for ALL concurrent agents

Use `nodebench-mcp --health` to check system status.
Use `discover_tools('reliability')` to find audit tools.
