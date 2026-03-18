# Unified Temporal Local Stack

This is the day-1 local development stack for the Unified Temporal Agentic OS.

## What it runs

- `oracle-ui` on `http://localhost:5173`
  - the builder-facing Oracle UI and control tower
- `api-headless` on `http://localhost:8020`
  - the B2B headless QA API plus grounded `search` and `fetch` endpoints
- `tsfm-inference` on `http://localhost:8010`
  - zero-shot forecasting and anomaly detection for numeric sequences
- `ingestion-extract` on `http://localhost:8011`
  - exact-source extraction for entities, claims, numeric facts, and temporal markers

## What it does not run

- Convex is not containerized here.
- Use your existing hosted or local Convex deployment and provide `CONVEX_URL` through `.env.local` or your shell.

## Start the stack

```powershell
docker compose up --build tsfm-inference ingestion-extract api-headless oracle-ui
```

To stop and remove containers:

```powershell
docker compose down
```

## Required environment

Minimum:

- `CONVEX_URL`

Optional private extraction backends:

- `OLLAMA_URL`
- `OLLAMA_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

If no LLM backend is configured, `ingestion-extract` falls back to deterministic regex and rule-based extractors.

## Quick verification

Health checks:

```powershell
curl http://localhost:8010/health
curl http://localhost:8011/health
curl http://localhost:8020/health
curl http://localhost:5173
```

Sample ingestion run:

```powershell
curl -X POST http://localhost:8011/extract `
  -H "Content-Type: application/json" `
  -d "{\"sourceLabel\":\"jira-history\",\"text\":\"Q1 2026: Project Atlas reduced token cost by 18%. The payment retry bug caused a three day delay.\"}"
```

Grounded search:

```powershell
curl -X POST http://localhost:8020/v1/search `
  -H "Content-Type: application/json" `
  -d "{\"query\":\"latest Oracle AI infrastructure news\",\"depth\":\"standard\",\"outputType\":\"searchResults\",\"maxResults\":5}"
```

Grounded sourced answer:

```powershell
curl -X POST http://localhost:8020/v1/search `
  -H "Content-Type: application/json" `
  -d "{\"q\":\"what changed in Oracle AI infrastructure\",\"outputType\":\"sourcedAnswer\",\"includeInlineCitations\":true}"
```

Temporal brief:

```powershell
curl -X POST http://localhost:8020/v1/search `
  -H "Content-Type: application/json" `
  -d "{\"query\":\"payment retry delay causal chain\",\"depth\":\"temporal\",\"outputType\":\"temporalBrief\",\"maxResults\":5}"
```

Enterprise investigation:

```powershell
curl -X POST http://localhost:8020/v1/search `
  -H "Content-Type: application/json" `
  -d "{\"query\":\"Trace the temporal causal chain and architectural decisions leading to the Payment Gateway timeout vulnerability detected on March 4, 2026.\",\"depth\":\"temporal\",\"outputType\":\"enterpriseInvestigation\",\"maxResults\":5}"
```

Replay the returned investigation manifest:

```powershell
curl http://localhost:8020/v1/replay/<traceId-from-audit_proof_pack.replay_url>
curl http://localhost:8020/v1/replay/<traceId-from-audit_proof_pack.replay_url>/trace
```

Grounded fetch:

```powershell
curl -X POST http://localhost:8020/v1/fetch `
  -H "Content-Type: application/json" `
  -d "{\"url\":\"https://example.com\",\"includeExtraction\":true,\"includeImages\":true,\"renderJs\":true,\"maxChars\":12000}"
```

API latency guard:

```powershell
npm run bench:api-headless:guard
```

Optional CI threshold overrides:

```powershell
$env:NODEBENCH_API_SEARCH_P95_MS=180
$env:NODEBENCH_API_ENTERPRISE_INVESTIGATION_P95_MS=450
npm run bench:api-headless:guard
```

Live backend guard with real Convex and fetched sources:

```powershell
$env:CONVEX_URL="https://<your-deployment>.convex.cloud"
npm run bench:api-headless:live
```

Optional live threshold overrides and custom queries:

```powershell
$env:NODEBENCH_API_LIVE_SEARCH_P95_MS=2000
$env:NODEBENCH_API_LIVE_ENTERPRISE_INVESTIGATION_P95_MS=5000
$env:NODEBENCH_API_LIVE_FAST_QUERY="latest Oracle AI infrastructure news"
$env:NODEBENCH_API_LIVE_ENTERPRISE_QUERY="Oracle Stargate AI infrastructure timeline 2025 2026"
npm run bench:api-headless:live -- --iterations 3 --warmups 1
```

Artifacts:
- `docs/architecture/benchmarks/api-headless-live-guard-latest.md`
- `docs/architecture/benchmarks/api-headless-live-guard-latest.json`

`/v1/fetch` now returns immutable `snapshotHash` values for the normalized content and the citation record so downstream causal claims can point to a cryptographically stable payload rather than a mutable URL alone.

End-to-end Convex ingestion run:

```powershell
npx convex run --push "domains/temporal/ingestion:ingestStructuredSourceText" "{\
  text:\"Q1 2026: Project Atlas reduced token cost by 18%. Q2 2026: Token cost dropped another 9%. Q3 2026: Token cost stabilized at 6%. Payment retries caused a three day delay.\",\
  streamKey:\"oracle_demo_token_cost\",\
  sourceType:\"jira\",\
  sourceLabel:\"jira-history\",\
  sourceUrl:\"https://example.com/jira/ATLAS-123\",\
  forecastHorizonDays:14\
}"
```

This action:

- calls the extraction service
- stores exact-source observations in `timeSeriesObservations`
- derives signals in `timeSeriesSignals`
- returns the first forecast when enough numeric observations exist

Sample TSFM run:

```powershell
curl -X POST http://localhost:8010/forecast `
  -H "Content-Type: application/json" `
  -d "{\"values\":[10,12,13,15,18],\"horizon\":3,\"model\":\"auto\"}"
```

## Day-1 usage

### Internal builder

- Start the stack.
- Open `http://localhost:5173`.
- Use the Oracle control tower to inspect long-running loops, cost drift, and next actions.
- Run `ingestStructuredSourceText` once to move Phase 1 from empty substrate to stored evidence.
- Run `npm run bench:api-headless:guard` before claiming API or temporal retrieval performance improvements.
- Run `npm run bench:api-headless:live` when `CONVEX_URL` is available and the claim depends on real backend latency or real fetched-source behavior.

### QA or platform operator

- Hit `http://localhost:8020/health`.
- Use the `/v1/specs`, `/v1/runs`, and `/v1/evidence` endpoints to run headless verification flows and inspect proof-pack artifacts.
- Use `/v1/search` when a run needs grounded retrieval and `/v1/fetch` when an operator needs exact-source extraction from a live URL before building a proof pack.
- Use `outputType:\"sourcedAnswer\"` when the operator needs a short cited answer instead of raw links.
- Use `depth:\"temporal\"` plus `outputType:\"temporalBrief\"` when the operator needs timeline-style evidence and progressive next-step guidance.
- Use `outputType:\"enterpriseInvestigation\"` when the operator needs a VP-level response payload with temporal intelligence, causal chain, organizational friction analysis, recommended action, and audit metadata in one object.
- Open the `audit_proof_pack.replay_url` from an enterprise investigation when the operator needs deterministic replay manifest inspection or the stored span timeline behind the diagnosis.

### Temporal or data engineer

- Send numeric histories to `tsfm-inference`.
- Use the forecast and anomaly outputs to feed temporal signals into the Convex substrate.
- For mixed text dumps, use the Convex ingestion action instead of hand-creating observations.

### Knowledge or research operator

- Send Slack, Jira, notes, or article dumps to `ingestion-extract`.
- Capture exact-source entities, claims, and temporal markers before downstream reasoning or drafting.
- For web-first work, call `/v1/search` to find candidate sources and `/v1/fetch` to pull back readable text plus structured extraction in one pass.
- If the question is evolving, keep the same `/v1/search` endpoint and switch `outputType` instead of switching APIs.
- When trust matters, prefer the fetched source hashes from `/v1/fetch` or the enterprise investigation payload over raw URLs because the URL target can change after the analysis was run.
- When a result needs to be challenged or re-checked, pull the replay manifest and trace instead of trying to reconstruct the tool path from logs.

### External developer

- Call `/v1/search` on day 1 for Linkup-style grounded retrieval without learning our internal MCP surface.
- Call `/v1/fetch` on day 1 to fetch a URL, normalize readable text, and optionally attach source-aware extraction output.
- Open `/v1/replay/:traceId` from an enterprise investigation response to inspect the stored request, response hash, source hashes, and replay-safe spans.
- Use the QA endpoints separately when the goal is proof-pack execution rather than search/fetch.

## Why this shape

This mirrors the real repo today:

- the Oracle UI is the current root Vite app
- the enterprise API lives in `apps/api-headless`
- the heavy extraction and TSFM workloads stay isolated in Python services

That keeps the time-series math, extraction, and application surfaces separate without pretending the repo has already been migrated into a different workspace layout.
