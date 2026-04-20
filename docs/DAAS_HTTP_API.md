# DaaS HTTP API

Public ingest endpoint for pushing expert-model traces into the Distillation-as-a-Service pipeline.

- **Base URL**: `https://agile-caribou-964.convex.site`
- **Endpoint**: `POST /api/daas/ingest`
- **CORS**: `*` (intended for cross-origin captures from any codebase)
- **Auth**: optional `x-daas-api-key` header. If server env `DAAS_REQUIRE_API_KEY=true`, header is mandatory.
- **Rate limit**: 10 req/min per IP (unauthed), 120 req/min per API key (authed). DB-backed, persists across serverless containers.

## Request

```http
POST /api/daas/ingest HTTP/1.1
Host: agile-caribou-964.convex.site
Content-Type: application/json
x-daas-api-key: <optional, 16+ chars>

{
  "sessionId": "floorai_milk_delivery_20260419",
  "sourceModel": "gemini-3.1-pro-preview",
  "advisorModel": null,
  "sourceSystem": "floorai-convex-agent",
  "query": "What's happening with our milk delivery?",
  "finalAnswer": "The expert Pro response text...",
  "totalCostUsd": 0.00691,
  "totalTokens": 4385,
  "durationMs": 4200,
  "repoContextJson": "{\"url\":\"github.com/HomenShum/floorai\",\"store_id\":\"STR-101\"}",
  "stepsJson": "[...optional TraceStep[] JSON]"
}
```

### Required fields

| Field | Type | Notes |
|-------|------|-------|
| `sessionId` | string | Unique per trace; becomes the natural key |
| `sourceModel` | string | e.g. `gemini-3.1-pro-preview` |
| `query` | string | User's input |
| `finalAnswer` | string | Expert model output |
| `totalCostUsd` | number | Measured from API `usageMetadata` — not estimated |
| `totalTokens` | number | Measured |
| `durationMs` | number | Non-negative |

### Optional fields

| Field | Type | Notes |
|-------|------|-------|
| `advisorModel` | string | If using advisor pattern |
| `sourceSystem` | string | `claude-code`, `convex-agent`, `raw-jsonl`, etc. |
| `repoContextJson` | string | JSON-stringified repo context (URL, CLAUDE.md excerpt, etc.) |
| `stepsJson` | string | JSON-stringified array of TraceStep objects |

## Responses

### 201 Created (success)

```json
{
  "ok": true,
  "traceId": "nx98mr07rrxyxgjv4wz487r711854xvr",
  "sessionId": "floorai_milk_delivery_20260419"
}
```

Response headers include:

- `X-RateLimit-Limit`: quota (10 or 120)
- `X-RateLimit-Remaining`: requests left in current window
- `X-RateLimit-Reset`: Unix epoch (seconds) when window resets

### 400 Bad Request

Returned when:

- JSON body fails to parse → `{"error":"invalid_json"}`
- Missing a required field → `{"error":"missing_required_field","field":"sessionId"}`
- Numeric field is negative or non-finite → `{"error":"invalid_totalCostUsd"}` etc.

### 401 Unauthorized

Only when `DAAS_REQUIRE_API_KEY=true`:

```json
{ "error": "unauthorized", "hint": "provide x-daas-api-key" }
```

### 405 Method Not Allowed

Non-POST request (other than OPTIONS preflight which returns 204).

### 413 Payload Too Large

Body exceeds 256 KB:

```json
{ "error": "payload_too_large", "limit_bytes": 262144, "received": 300241 }
```

### 429 Too Many Requests

Rate limit exceeded:

```json
{
  "error": "rate_limited",
  "limit": 10,
  "window_ms": 60000,
  "retry_at": "2026-04-19T18:30:00.000Z"
}
```

### 500 Internal Server Error

```json
{ "error": "ingest_failed", "detail": "..." }
```

## Quick examples

### curl

```bash
curl -X POST https://agile-caribou-964.convex.site/api/daas/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"my_trace_001",
    "sourceModel":"gemini-3.1-pro-preview",
    "query":"What is the status?",
    "finalAnswer":"...",
    "totalCostUsd":0.005,
    "totalTokens":3000,
    "durationMs":1800
  }'
```

### Python

```python
import urllib.request, json
req = urllib.request.Request(
    "https://agile-caribou-964.convex.site/api/daas/ingest",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req) as r:
    print(r.status, r.read())
```

### TypeScript / fetch

```ts
const res = await fetch("https://agile-caribou-964.convex.site/api/daas/ingest", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const json = await res.json();
```

## After ingest

Once a trace is ingested, the UI at `https://www.nodebenchai.com/daas` will display it in the run list. Trigger the LLM-rubric judge via the "RE-JUDGE" button in the run detail panel, or programmatically via `domains/daas/actions:judgeReplay` (requires a replay to exist for that trace).

## Agentic reliability

- **HONEST_STATUS**: every failure path returns its real HTTP code (no fake 2xx)
- **BOUND_READ**: 256 KB body cap, returns 413 on overflow
- **BOUND**: DB-backed rate limit bucket garbage-collected by `updatedAt` index
- **HONEST_SCORES**: no numeric values invented — all fields pass through unchanged to `ingestTrace` mutation which validates them again
- **ERROR_BOUNDARY**: try/catch around the mutation call; no unhandled rejections leak to the client

## What's next

- Authed API keys with per-key quotas stored in a `daasApiKeys` table
- Webhook signing secret for trusted callers
- Server-side `distill` / `generate` / `replay` actions reachable via HTTP (currently Python-only)
