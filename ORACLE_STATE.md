# Oracle State

## Current milestone
Milestone: Unified Temporal Agentic OS Phase 1 substrate

## Completed work
- Oracle prompt pack contract defined at the repo root.
- Oracle control tower metadata fields added to task and trace surfaces.
- Builder-facing Oracle UI slice added to the agents workspace.
- Segmented test lanes and segmented dogfood verification added.
- Route-sharded dogfood capture added so smoke verification can exploit small parallel lanes.
- Temporal substrate tables added for observations, signals, causal chains, zero-drafts, and proof packs.
- Oracle control tower now exposes the 4-phase Unified Temporal Agentic OS roadmap.
- Task-manager Oracle contract repaired so sessions can persist vision fields instead of only typing them in the frontend.
- Root `docker-compose.yml` now boots the current day-1 local Unified Temporal stack: Oracle UI, headless QA API, TSFM inference, and ingestion extract.
- `services/ingestion-extract/app.py` now exposes extraction endpoints for entities, claims, numeric facts, and temporal markers with exact-source metadata.
- `apps/api-headless` route typing is repaired for Express 5 so the package builds cleanly in the local stack.
- Local stack runbook added at `docs/guides/UNIFIED_TEMPORAL_LOCAL_STACK.md`.
- `domains/temporal/ingestion:ingestStructuredSourceText` now bridges raw text into extracted observations, stored temporal signals, and first-pass forecasts.
- Temporal extraction now prefers the local `ingestion-extract` service and falls back to deterministic regex extraction when the service is unavailable.
- Forecasting now handles identical timestamps safely instead of dividing by a zero time step.
- `apps/api-headless` now exposes Linkup-style `POST /v1/search` and `POST /v1/fetch` endpoints backed by Convex search actions and the local extraction service.
- Grounded fetch now normalizes readable text from HTML and can attach exact-source extraction output for entities, claims, numeric facts, and temporal markers.
- `POST /v1/search` now uses a simpler mode model: `depth` plus `outputType`, so callers can request raw search hits, a cited answer, a temporal brief, or structured output from one endpoint.
- `POST /v1/fetch` now returns `markdown`, optional image extraction, and explicit warnings when callers ask for features like JS rendering that are not yet implemented.
- `POST /v1/search` now also supports `outputType: "enterpriseInvestigation"` for a VP-level temporal diagnosis payload with anomalies, forecast summary, causal chain, organizational friction analysis, recommended action, and audit metadata.
- `POST /v1/fetch` now returns immutable `snapshotHash` values so evidence chains can reference the exact content payload the system saw instead of only a mutable URL.
- `packages/eval-engine` now includes OTel-style MCP tool span helpers with CAS-hashed input, output, and monologue events for traceable agent trajectories.
- `POST /v1/search` enterprise investigations now register deterministic replay manifests, and `GET /v1/replay/:traceId` plus `GET /v1/replay/:traceId/trace` expose the stored request, response hash, source hashes, and replay-safe span timeline.
- The Oracle prompt pack now explicitly blocks "looks correct" completion criteria and requires measured invariants, remaining-risk notes, and anti-self-review guardrails.
- `apps/api-headless` now has a CI-safe latency regression guard for the fast search lane and the temporal enterprise investigation lane, with explicit p95 thresholds and evidence-shape assertions.
- A live api-headless guard script now measures the same public lanes against a real Convex backend, writes benchmark artifacts, and fails if latency or evidence integrity regresses under real source fetch conditions.
- The live api-headless guard has now been executed against `https://agile-caribou-964.convex.cloud` and produced a passing benchmark artifact using the default real-query lane.
- The Oracle UI now hard-gates live Convex queries behind `VITE_ENABLE_ORACLE_LIVE_DATA`, so the builder surface falls back to demo mode instead of crashing when the Oracle backend is not deployed.
- Builder-facing benchmark and navigation UX have been upgraded from the latest QA pass: mobile drawer behavior, tablet collapsed rail defaults, clickable published video proof, expandable telemetry payloads, clearer disabled-state explanations, improved benchmark empty states, and a text-based breadcrumb separator.
- The local dogfood runner now clears stale `dist/dogfood` output robustly on Windows before preview builds, which removes a recurring `ENOTEMPTY` failure during segmented verification.
- The Oracle homepage is now framed as a public product surface with a clear value proposition, explicit starting points, and preview/live data status instead of opening with unexplained internal jargon.
- Oracle session and trace surfaces now format long durations compactly and replace raw goal IDs with short goal references so internal storage identifiers are no longer leaked into the public UI.
- The command palette now only advertises real product destinations that exist in the current navigation model, replacing the previous dead-end analytics, calendar, and quality-review shortcuts.
- Research Hub embedded chrome now uses a neutral top summary instead of a misleading back-navigation control, and guest footer copy now explains what preview mode includes.
- Signal feed cards now use semantic headings and text-based source labels instead of emoji-only source markers, reducing ambiguity across screen readers and OS renderers.
- Benchmark copy now clarifies score and latency units, renames the chart toggle to a clearer action, and explains unrun leaderboard lanes as pending the first benchmark app connection.

## Open defects
- Keep long-running dogfood stable against stale client caches and route-level regressions.
- Connect proof-pack generation to a real task session once the first end-to-end temporal loop lands.
- Containerizing Convex is still deferred. The local stack expects an external `CONVEX_URL`.
- A real Convex ingestion run has not been executed yet because the repo-wide Convex resolver lane is currently blocked by unrelated pre-existing domain export issues.

## Next quest
Publish the refreshed public-facing homepage and benchmark/research polish to production, then run a focused live QA pass on `/`, `/research`, and `/benchmarks` to confirm the first-impression fixes are visible on the website.

## Blockers
- None at the contract level.

## Latest dogfood status
- Builder UI build passes.
- Dogfood verification uses segmented lanes.
- Parallel route shards are enabled through `DOGFOOD_ROUTE_SHARDS` or `--routeShards`.
- Oracle control tower now shows temporal substrate counts and the phase-by-phase execution roadmap.
- Full `npm run dogfood:verify` now passes again after the Oracle live-data gate and the layout/benchmark QA fixes.
- Scenario regression now passes the long-session route-accumulation lane, the mobile dark-mode lane, and the dogfood artifact ingestion lane in the same closed loop.
- The remaining dogfood noise is limited to benign `net::ERR_ABORTED` media request logs after navigation; artifact verification still passes with `screenshots=145`, `frames=36`, `scribe=36`, and `chapters=36`.
- After the public-facing copy and navigation cleanup, `npm run dogfood:verify` still passes with the same artifact floor and no new route-regression failures.

## Update rule
Any agent changing Oracle-related behavior must update this file after implementation, tests, dogfood, and a vision cross-check are complete.
