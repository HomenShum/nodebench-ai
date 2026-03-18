# API Headless Live Guard

Generated: 2026-03-09T04:38:46.025Z
Base URL: http://127.0.0.1:51752
Iterations: 3
Warmups: 1

## Checks

- Fast search: object=search_result, results=5, citations=5, avg=1330ms, p95=1382ms, budget=2000ms
- Enterprise investigation: object=enterprise_investigation, causalChain=1, sourceHashes=1, avg=963ms, p95=2136ms, budget=5000ms
- Replay URL: /v1/replay/req_HffEtO7lzmBlVjp7

## Reality Check

- fast search must return grounded results plus citations
- enterprise investigation must return a causal chain, source hashes, and replay URL
- both lanes must stay within the configured p95 latency budgets
- Remaining risk: This live guard depends on the current Convex search backend and public source availability, so failures can come from backend drift or external source churn as well as api-headless regressions.

Result: PASS
