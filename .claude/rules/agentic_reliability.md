---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.py"
  - "**/*.json"
related_: [analyst_diagnostic, reexamine_resilience, scenario_testing, self_direction, reexamine_process, completion_traceability]
---

# Agentic Systems Reliability

Every tool response must be honest, every resource bounded, every failure surfaced. Agents trust tool output literally — a lie in infrastructure becomes a false belief that propagates through reasoning chains.

## Role: Agentic Systems Reliability Engineer

This is NOT optional polish. This is a **mandatory audit pass** on every piece of code that agents interact with — tool endpoints, APIs, middleware, data stores, evidence scores, status codes. Run this checklist BEFORE declaring any backend/infrastructure work complete.

## When to trigger

- Writing or modifying ANY tool endpoint, API route, or MCP handler
- Creating or modifying ANY in-memory data structure (Map, Array, Set, object cache)
- Writing code that returns status codes, scores, or metrics that agents will read
- Adding fetch/HTTP calls where the URL could come from agent-generated input
- Any middleware that sits in the request path of agent tool calls

## The 8-Point Reliability Checklist

Every code change touching agent-facing infrastructure MUST pass all 8:

### 1. Bounded Memory (`BOUND`)
Every in-memory collection (Map, Array, Set, cache) MUST have a maximum size with eviction.

- **Check**: Is there a `MAX_*` constant? Is there an eviction function called on insert?
- **Fix pattern**: LRU via Map insertion order (`delete` oldest key), ring buffer for arrays, cap-and-reject for Maps
- **Red flag**: `new Map()` or `const cache: Record<>` without a size guard anywhere nearby
- **Why agents amplify**: Agents in flywheel loops hit tool endpoints thousands of times. Every unbounded structure is a ticking OOM.

### 2. Honest Status Codes (`HONEST_STATUS`)
Every HTTP response MUST return the true outcome. Never return success when the operation failed.

- **Check**: Does a failure path return 2xx? Does a timeout return 200 with partial data?
- **Fix pattern**: 502 for backend unavailable, 504 for timeout, 500 for unhandled. Never fake 201.
- **Red flag**: `res.status(201).json(...)` in a catch/fallback branch
- **Why agents amplify**: Agents parse status codes to decide next action. A 201 means "proceed" — a lie here causes agents to build on phantom state.

### 3. Honest Metrics & Scores (`HONEST_SCORES`)
Every score, evidence rating, or confidence metric MUST reflect actual measured data. No hardcoded floors.

- **Check**: Are there literal `true`, `1.0`, or `"VERIFIED"` values that bypass actual computation?
- **Fix pattern**: Default to `false`/`0`/`"UNKNOWN"` when data is unavailable. Score only what you measured.
- **Red flag**: `passed: true` with a comment like "caller should validate" or "LLM-derived in production"
- **Why agents amplify**: An agent reading 4/6 evidence score decides "strong enough, skip manual review." Fake floors corrupt agent judgment systemically.

### 4. Request Timeout Budget (`TIMEOUT`)
Every route that calls external services MUST have a total timeout budget with checkpoints.

- **Check**: Is there an `AbortController` with `setTimeout`? Are there `checkBudget()` gates between async stages?
- **Fix pattern**: Create controller at route entry, clear in `finally`, throw typed `"request_timeout"` error, return 504
- **Red flag**: `await externalService()` without any timeout or abort signal
- **Why agents amplify**: Agent orchestrators queue 10+ parallel investigations. Without budgets, one slow query blocks the entire swarm lane.

### 5. SSRF Protection (`SSRF`)
Every `fetch()` where the URL originates from user/agent input MUST validate the host.

- **Check**: Is there a blocklist for RFC1918, link-local, localhost, cloud metadata endpoints?
- **Fix pattern**: Parse URL → check protocol (http/https only) → check hostname against blocklist → fetch validated URL
- **Blocklist minimum**: `localhost`, `127.*`, `10.*`, `172.16-31.*`, `192.168.*`, `169.254.*`, `0.0.0.0`, `[::1]`, `metadata.google.internal`
- **Red flag**: `fetch(input.url)` or `fetch(userProvidedUrl)` with no validation
- **Why agents amplify**: Agents generate URLs from reasoning — one hallucinated URL away from `http://169.254.169.254/metadata`.

### 6. Bounded Response Reading (`BOUND_READ`)
Every `response.text()` or `response.json()` from external sources MUST have a size limit.

- **Check**: Is there a `MAX_RESPONSE_BYTES` with streaming reader that cancels on overflow?
- **Fix pattern**: `ReadableStream.getReader()` loop tracking `totalBytes`, `reader.cancel()` when exceeded
- **Red flag**: `await response.text()` on any externally-fetched content
- **Why agents amplify**: Agents fetch diverse URLs. A single 500MB response OOMs the process serving all agents.

### 7. Async Error Boundary (`ERROR_BOUNDARY`)
Every async route handler MUST catch errors and return structured error responses.

- **Check**: Is there a try/catch or `asyncHandler` wrapper? Does `!res.headersSent` guard prevent double-send?
- **Fix pattern**: Wrap all async handlers: `fn(req, res).catch(err => { if (!res.headersSent) res.status(500)... })`
- **Red flag**: `router.post("/", async (req, res) => {` with no error handling
- **Why agents amplify**: Unhandled rejections crash the process, killing all concurrent agent requests.

### 8. Deterministic Reproducibility (`DETERMINISTIC`)
Every hash, ID, or fingerprint used for content-addressed storage MUST be deterministic.

- **Check**: Does `JSON.stringify` get called on objects that might have non-deterministic key order?
- **Fix pattern**: Use `stableStringify` with sorted keys recursively. Verify same input always produces same hash.
- **Red flag**: `createHash("sha256").update(JSON.stringify(obj))` on any object with dynamic keys
- **Why agents amplify**: When an agent produces wrong output, replay must reproduce exactly the same tool I/O. Non-deterministic hashing makes agent debugging impossible.

## Audit Process

When auditing existing code (e.g., `/agentic-reliability-audit`):

1. **Scan all in-memory structures** — grep for `new Map`, `new Set`, `const.*: .*\[\]`, `{}` caches. Check each for eviction.
2. **Scan all HTTP responses** — grep for `res.status(2` in catch/fallback branches. Each is a candidate honest-status violation.
3. **Scan all scores/metrics** — grep for `passed: true`, `score:.*1`, `"VERIFIED"` literals. Check if they're computed or hardcoded.
4. **Scan all fetch calls** — grep for `fetch(` where the URL is a variable. Check for SSRF validation and response bounding.
5. **Scan all async handlers** — grep for `async.*req.*res` without try/catch or asyncHandler wrapper.
6. **Scan all hash operations** — grep for `JSON.stringify` feeding into `createHash`. Check for key ordering.

## Severity Classification

| Severity | Definition | SLA |
|----------|-----------|-----|
| P0 | Agent can crash the process, leak to internal network, or make permanently wrong decisions based on false data | Fix immediately, block ship |
| P1 | Agent gets degraded data but won't crash or make irreversible decisions | Fix in same session |
| P2 | Agent gets suboptimal data but system is still safe and honest | Fix when adjacent code is touched |

## Anti-patterns — banned

- `as any` to silence type errors in agent-facing code
- `try { ... } catch { /* ignore */ }` that swallows errors agents need to see
- `?.` optional chaining to mask `undefined` instead of finding why it's undefined
- Retry loops without idempotency guarantees
- "Theater metrics" — scores/dashboards that look impressive but aren't computed from real data
- `response.text()` without size limits on external content
- In-memory state decorated with enterprise language but missing basic eviction

## Integration with other rules

- **analyst_diagnostic**: The 5-whys process applies to every finding. Don't just add eviction — understand why the unbounded Map existed.
- **scenario_testing**: Every reliability fix needs a scenario test covering the agent-amplified failure mode (1000 rapid calls, not 1 happy path).
- **reexamine_resilience**: Graceful degradation applies — but degradation must be HONEST (return 503, not fake 200 with empty data).
- **self_direction**: Don't wait to be asked to audit. Run this checklist on every backend PR automatically.
- **completion_traceability**: Cite which checklist item each fix addresses.
