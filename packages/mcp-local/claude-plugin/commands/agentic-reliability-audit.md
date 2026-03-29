# Agentic Reliability Audit

Run the 8-point reliability checklist on all agent-facing infrastructure.

## Scan targets

1. **In-memory structures** — grep for `new Map`, `new Set`, `const.*[]`. Check each for eviction.
2. **HTTP responses** — grep for `res.status(2` in catch/fallback branches. Each is a candidate honest-status violation.
3. **Scores/metrics** — grep for `passed: true`, `score:.*1`, `"VERIFIED"` literals. Check if computed or hardcoded.
4. **Fetch calls** — grep for `fetch(` where URL is a variable. Check for SSRF validation and response bounding.
5. **Async handlers** — grep for `async.*req.*res` without try/catch or asyncHandler wrapper.
6. **Hash operations** — grep for `JSON.stringify` feeding into `createHash`. Check for key ordering.

## The 8 checks

1. BOUND — in-memory collections have MAX + eviction
2. HONEST_STATUS — no 2xx on failure paths
3. HONEST_SCORES — no hardcoded score floors
4. TIMEOUT — AbortController + budget gates
5. SSRF — URL validation before fetch
6. BOUND_READ — response size caps
7. ERROR_BOUNDARY — async error handling
8. DETERMINISTIC — sorted-key hashing

## Severity

- P0 (crash/SSRF/false data): Fix immediately
- P1 (degraded data): Fix same session
- P2 (suboptimal): Fix when touched
