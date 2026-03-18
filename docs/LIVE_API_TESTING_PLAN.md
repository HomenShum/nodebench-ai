# Live External API Testing & Validation Plan
**Status:** Ready to run  
**Scope:** Validate MCP reachability + external providers using the API keys already set in **Convex env vars**.

This plan is designed to:
- run safely in **production** without leaking secrets,
- separate **smoke** (reachability) vs **scenario** (persona quality) tests,
- keep CI deterministic (no flaky external data as hard failures).

---

## 0) Principles (so tests stay useful)

- **Do smoke checks first**: fail fast on connectivity/auth problems before running expensive agent flows.
- **Don’t print secrets**: never log API key values; only log presence booleans + high-level statuses.
- **External data is non-deterministic**: only enforce strict PASS/FAIL on *invariants* (schema shape, non-empty response, auth works), and treat freshness/content gates as warnings unless you control the dataset.
- **Use Convex actions for live checks**: they execute *inside* your Convex deployment, so they automatically use the env keys already configured there.

---

## 1) Smoke checks (recommended default)

### 1.1 Run smoke checks inside the deployment (uses Convex env keys)

**Convex function:** `domains/evaluation/liveApiSmoke:run`  
**What it checks:**
- Core Agent MCP: `tools/list` includes expected tool names
- OpenBB MCP: `/health` + `/admin/available_tools`
- Research MCP: `/health` + `/tools/list`
- Public API keys (deterministic, low/no cost): OpenAI/Anthropic/Gemini model listing + YouTube search
- Optional: Linkup live query (costs money)

**Important behavior**
- MCP server checks are **skipped by default** unless you set the corresponding `*_MCP_SERVER_URL` env vars (or explicitly enable localhost defaults for local dev).
- Use `--require-mcp` only when validating a deployment that is expected to have MCP servers reachable from Convex Cloud.

**Option A (recommended): local runner script**

- Set local env vars (values should match what you see in Convex env list):
  - `CONVEX_URL`
  - `MCP_SECRET`
- Run:
  - `npx tsx scripts/run-live-api-smoke.ts`
  - Optional (costly): `npx tsx scripts/run-live-api-smoke.ts --include-linkup --linkup-query "DISCO Pharmaceuticals seed funding"`
  - Require MCP servers to be reachable (deployment validation): `npx tsx scripts/run-live-api-smoke.ts --require-mcp`
  - Local-only convenience (tries `127.0.0.1` defaults for MCP servers): `npx tsx scripts/run-live-api-smoke.ts --try-localhost-mcp`

**Option B: Convex CLI**

- Run on prod without pushing code:
  - `npx convex run --prod domains/evaluation/liveApiSmoke:run '{"secret":"<MCP_SECRET>"}'`
- To include Linkup (costly):
  - `npx convex run --prod domains/evaluation/liveApiSmoke:run '{"secret":"<MCP_SECRET>","includeLinkup":true}'`

**PowerShell (avoids putting `MCP_SECRET` directly in the command):**
- Dev:
  - `$secret = (npx convex env get MCP_SECRET) -join ""; npx convex run domains/evaluation/liveApiSmoke:run "{secret:'$secret',includeLinkup:true}"`
- Prod:
  - `$secret = (npx convex env get MCP_SECRET --prod) -join ""; npx convex run --prod domains/evaluation/liveApiSmoke:run "{secret:'$secret',includeLinkup:true}"`

If any MCP server checks fail with “*_MCP_SERVER_URL is not set”, set these Convex env vars first:
- `CORE_AGENT_MCP_SERVER_URL`, `CORE_AGENT_MCP_AUTH_TOKEN`
- `OPENBB_MCP_SERVER_URL`, `OPENBB_API_KEY`
- `RESEARCH_MCP_SERVER_URL`, `RESEARCH_API_KEY`

---

## 2) Black-box HTTP checks (MCP persistence endpoints)

These validate that your **mcp-3 endpoints** work as intended from *outside* Convex Cloud:

- `POST /api/mcpPlans`
- `GET /api/mcpPlans`
- `POST /api/mcpMemory`
- `GET /api/mcpMemory`

Run from your machine (PowerShell examples):

- Create plan:
  - `Invoke-RestMethod -Method Post -Uri "$CONVEX_SITE_URL/api/mcpPlans" -Headers @{ 'x-mcp-secret' = $env:MCP_SECRET } -ContentType 'application/json' -Body '{\"goal\":\"smoke\",\"steps\":[{\"step\":\"ping\",\"status\":\"pending\"}]}'`

- Create memory:
  - `Invoke-RestMethod -Method Post -Uri "$CONVEX_SITE_URL/api/mcpMemory" -Headers @{ 'x-mcp-secret' = $env:MCP_SECRET } -ContentType 'application/json' -Body '{\"key\":\"smoke:test\",\"value\":\"ok\"}'`

Notes:
- Prefer running these against `https://<deployment>.convex.site`.
- Never paste secrets into chat logs or shared terminals; use `$env:MCP_SECRET`.

---

## 3) Scenario tests (persona + entity quality)

Use these only after smoke checks pass.

### 3.1 Run the built-in anonymous live evaluation

**Convex function:** `domains/evaluation/liveEval:runSingleEvalAnonymous`

This exercises the real agent and will hit external APIs/tools as needed.

Example:
- `npx convex run --prod domains/evaluation/liveEval:runSingleEvalAnonymous '{\"queryId\":\"banker-disco-1\"}'`

Recommendations:
- Run a small curated set (3–5 queries) in production to control cost.
- Treat “intentional FAIL” cases as pass criteria for guardrails.

---

## 4) Daily Briefing validation (end-to-end)

### 4.1 Trigger the workflow manually

**Convex function:** `workflows/testDailyBrief:runDailyBriefTest`

- `npx convex run --prod workflows/testDailyBrief:runDailyBriefTest '{}'`

Then verify:
- `landingPageLog` has a `kind='brief'` entry for today
- `#signals` route loads and renders day entries

---

## 5) Suggested rollout cadence

- Per deploy (staging + prod):
  - Run `scripts/run-live-api-smoke.ts`
  - Run 1–2 `runSingleEvalAnonymous` queries (cheap, representative)
- Weekly:
  - Run a larger persona matrix (10–20 queries) and store results in `evalRunTracking`
