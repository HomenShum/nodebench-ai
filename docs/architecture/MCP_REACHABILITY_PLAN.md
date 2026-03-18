# MCP Reachability Implementation Plan

> **Goal:** Make all MCP servers (Core Agent, OpenBB, Research) reachable from **Convex Cloud**, and make the Core Agent MCP server able to persist **plans + memory** back into Convex over authenticated HTTP.

---

## Status Overview

| ID | Task | Status |
|----|------|--------|
| mcp-1 | Core Agent MCP server cloud-ready | Completed |
| mcp-2 | Convex MCP client + SDK transport updates | Completed |
| mcp-3 | Convex HTTP endpoints for plan/memory persistence | Completed |
| mcp-4 | OpenBB REST actions (cloud-ready) | Completed |
| mcp-5 | Research REST actions + hardcoded URL removal | Completed |

---

## Completed Tasks

### mcp-1: Core Agent MCP Server Cloud-Ready

**Files modified:**
- `mcp_tools/core_agent_server/httpServer.ts`
- `mcp_tools/core_agent_server/tools/planningTools.ts`
- `mcp_tools/core_agent_server/tools/memoryTools.ts`

**What’s done:**
1. Binds to `0.0.0.0` (cloud/container friendly) via `MCP_HTTP_HOST` default.
2. Accepts auth via either `Authorization: Bearer <token>` or `x-mcp-token: <token>` (same token value).
3. Implements MCP JSON-RPC methods: `initialize`, `tools/list`, `tools/call`.
4. Uses global `fetch` (no `node-fetch` dependency).
5. Adds `x-mcp-secret` when calling back into Convex `/api/*` (used by mcp-3 once implemented).

**Important current constraint (addressed in mcp-3):**
- The Core Agent MCP tools currently require `CONVEX_BASE_URL` + `CONVEX_ADMIN_KEY` to persist to Convex, but the intended cloud-safe design is to rely on **`MCP_SECRET`-gated Convex HTTP endpoints** instead of an admin key.

---

### mcp-2: Convex MCP Client + SDK Transport Updates

**Files modified:**
- `convex/domains/mcp/mcpClient.ts`
- `convex/lib/mcpTransport.ts`
- `convex/domains/mcp/mcp.ts`

**What’s done:**

#### `mcpClient.ts`
- **Env fallback:** when a DB-configured MCP server is absent, uses:
  - `CORE_AGENT_MCP_SERVER_URL`
  - `CORE_AGENT_MCP_AUTH_TOKEN`
- **Dual auth headers:** sends both `Authorization: Bearer ...` and `x-mcp-token: ...`.
- **Usage history gating:** only writes tool-usage history when `userId && serverId` exist (avoids null writes for env-based fallback usage).

#### `mcpTransport.ts`
- `discoverToolsWithSdk(serverUrl, apiKey?)` accepts optional API key.
- `executeToolWithSdk(serverUrl, toolName, args, apiKey?)` accepts optional API key.
- Remote client sends `x-mcp-token` alongside `Authorization` (works with mcp-1 server).

#### `mcp.ts`
- Tool discovery functions accept and pass through optional `apiKey` (per-server).

---

## Remaining Tasks

### mcp-3: Convex HTTP Endpoints for Plan/Memory Persistence (9 endpoints)

**Objective:** Expose authenticated Convex HTTP endpoints that the Core Agent MCP server can call to persist:
- Plans → `mcpPlans`
- Memory → `mcpMemoryEntries`

**Where routes live in this repo:**
- Add routes in `convex/router.ts` (Convex `httpRouter()` definitions live here).
- `convex/http.ts` is a thin wrapper that exports the router; it typically does not define routes.

**Files to create/modify:**
- `convex/router.ts` (register routes)
- `convex/domains/mcp/mcpPlansHttp.ts` (new: HTTP handlers)
- `convex/domains/mcp/mcpMemoryHttp.ts` (new: HTTP handlers)
- `mcp_tools/core_agent_server/tools/planningTools.ts` (update caller to use new REST shape)
- `mcp_tools/core_agent_server/tools/memoryTools.ts` (update caller to use new REST shape)

**Endpoints to implement (9 total):**

| Resource | Method | Path | Description |
|----------|--------|------|-------------|
| Plans | POST | `/api/mcpPlans` | Create plan |
| Plans | GET | `/api/mcpPlans` | List plans (filters: `userId`, `goal`, `limit`) |
| Plans | GET | `/api/mcpPlans/:id` | Get plan by id |
| Plans | PATCH | `/api/mcpPlans/:id` | Update plan (partial) |
| Plans | DELETE | `/api/mcpPlans/:id` | Delete plan |
| Memory | POST | `/api/mcpMemory` | Create memory entry |
| Memory | GET | `/api/mcpMemory` | Search/list memories (filters: `key`, `contains`, `limit`) |
| Memory | GET | `/api/mcpMemory/:id` | Get memory by id |
| Memory | DELETE | `/api/mcpMemory/:id` | Delete memory by id |

**Security (required):**
- Every endpoint requires `x-mcp-secret: <value>`.
- Convex validates against `process.env.MCP_SECRET`.
- Missing/invalid secret → `401 Unauthorized`.

**Core Agent MCP server updates (required):**
- Update `planningTools.ts` and `memoryTools.ts` to call the new REST endpoints above.
- Drop the requirement for `CONVEX_ADMIN_KEY` for persistence flows; rely on `MCP_SECRET` instead.
- Keep `CONVEX_BASE_URL` (or equivalent Convex site URL) for the base HTTP origin.

**Estimated effort:** ~2–3 hours

---

### mcp-4: OpenBB REST Actions (cloud-ready)

**Objective:** Provide Convex actions that call the OpenBB Python MCP server over HTTPS and remove remaining hardcoded `localhost` usage in seeds.

**Current state (already present, but needs standardization + cloud polish):**
- Convex already has OpenBB actions in `convex/actions/openbbActions.ts` (HTTP to `OPENBB_MCP_SERVER_URL`, defaulting to `http://127.0.0.1:8001`).
- The OpenBB Python server exposes:
  - `GET /health`
  - `GET /admin/available_categories`
  - `GET /admin/available_tools` (optional `category` query param)
  - `POST /tools/execute`

**Work to complete:**
1. Add/standardize these 3 internal actions (wrapping the existing low-level call):
   - `openbbHealth` → `GET /health`
   - `openbbListTools` → `GET /admin/available_tools`
   - `openbbExecuteTool` → `POST /tools/execute`
2. Ensure all callers use these actions (avoid ad-hoc fetches).
3. Remove hardcoded local seed URLs (see mcp-5 for seed work; OpenBB is included there).

**Files to create/modify:**
- `convex/actions/openbbActions.ts` (extend with the 3 standardized actions; keep existing exports for compatibility)
- `convex/domains/utilities/seedGoldenDataset.ts` (stop forcing `http://localhost:8001` in seeds)

**Estimated effort:** ~2 hours

---

### mcp-5: Research REST Actions + Hardcoded URL Removal

**Objective:**
1. Add Convex actions to call the Research Python MCP server over HTTPS.
2. Remove remaining hardcoded MCP server URLs (localhost) from seeds and any other initialization code.

**Research server endpoints (Python MCP server):**
- `GET /health`
- `GET /tools/list`
- `POST /tools/execute` (expects `secret` in request body; validated against the server’s `MCP_SECRET`)

**Work to complete:**
1. Create these 3 internal actions:
   - `researchHealth`
   - `researchListTools`
   - `researchExecuteTool` (sends `secret` in JSON body)
2. Define the shared secret mapping:
   - Convex uses `RESEARCH_API_KEY` for outbound calls.
   - Research server sets its `MCP_SECRET` to the same value as Convex’s `RESEARCH_API_KEY`.
3. Remove hardcoded URLs from seeding:
   - `convex/domains/utilities/seedGoldenDataset.ts` currently seeds MCP servers with `http://localhost:*`.
   - Update seeding to use env-based URLs when present, or skip seeding MCP servers when not configured.

**Files to create/modify:**
- `convex/actions/researchMcpActions.ts` (new)
- `convex/domains/utilities/seedGoldenDataset.ts` (remove hardcoded `localhost` for MCP server seeds)

**Estimated effort:** ~2 hours

---

## Environment Variables (7 required in Convex Cloud)

These are the **Convex Cloud** environment variables required to make the system cloud-reachable end-to-end:

| Variable | Purpose |
|----------|---------|
| `CORE_AGENT_MCP_SERVER_URL` | Core Agent MCP server base URL (JSON-RPC endpoint) |
| `CORE_AGENT_MCP_AUTH_TOKEN` | Token sent as `Authorization: Bearer` and `x-mcp-token` |
| `MCP_SECRET` | Secret for Convex HTTP persistence endpoints (mcp-3) |
| `OPENBB_MCP_SERVER_URL` | OpenBB MCP server base URL |
| `OPENBB_API_KEY` | OpenBB API key / optional server auth token (deployment-specific) |
| `RESEARCH_MCP_SERVER_URL` | Research MCP server base URL |
| `RESEARCH_API_KEY` | Shared secret passed to research `/tools/execute` as `secret` |

---

## Deployment Checklist

### Pre-deploy
- [ ] Deploy Core Agent MCP server to public HTTPS (or internal VPC reachable by Convex if applicable)
- [ ] Deploy OpenBB MCP server to public HTTPS
- [ ] Deploy Research MCP server to public HTTPS
- [ ] Set the 7 Convex Cloud env vars listed above
- [ ] Ensure Research server `MCP_SECRET` matches Convex `RESEARCH_API_KEY`
- [ ] Ensure Convex `MCP_SECRET` is unique (do not reuse service-to-service tokens)

### Post-deploy verification
- [ ] Core Agent MCP: `POST /` `tools/list` returns tool list
- [ ] Core Agent MCP: `POST /` `tools/call` executes (auth required)
- [ ] Convex mcp-3: `/api/mcpPlans*` endpoints work with `x-mcp-secret`
- [ ] Convex mcp-3: `/api/mcpMemory*` endpoints work with `x-mcp-secret`
- [ ] OpenBB: `openbbHealth` succeeds against deployed URL
- [ ] Research: `researchHealth` succeeds against deployed URL

---

## Architecture Diagram (Convex ↔ MCP Servers)

```
                         (1) JSON-RPC (MCP)
   +--------------------------------------------------------------+
   |                        Convex Cloud                          |
   |                                                              |
   |  +------------------------+                                  |
   |  | convex/domains/mcp/*   |                                  |
   |  |  - mcpClient.ts        |  -----> Core Agent MCP Server     |
   |  |  - mcpTransport.ts     |         (TypeScript, mcp-1)       |
   |  +------------------------+                                  |
   |                                                              |
   |                          (2) Authenticated HTTP              |
   |  +------------------------+   <----- Core Agent MCP Server    |
   |  | convex/router.ts       |          (plan/memory persistence) |
   |  |  /api/mcpPlans*        |                                  |
   |  |  /api/mcpMemory*       |                                  |
   |  +------------------------+                                  |
   +--------------------------------------------------------------+

   +----------------------+    +----------------------+
   | OpenBB MCP (Python)  |    | Research MCP (Python) |
   |  /health             |    |  /health              |
   |  /admin/available_*  |    |  /tools/list          |
   |  /tools/execute      |    |  /tools/execute       |
   +----------------------+    +----------------------+
```

---

## Testing Strategy

### Unit tests
- Convex: validate `x-mcp-secret` gate logic for mcp-3 routes.
- Convex: validate request parsing + response shaping for `/api/mcpPlans*` and `/api/mcpMemory*`.
- Actions: mock `fetch` to OpenBB/Research servers and assert base URL + payload shape.

### Integration tests
- End-to-end: Core Agent MCP → Convex plan create/read/update (via `/api/mcpPlans*`).
- End-to-end: Core Agent MCP → Convex memory write/list/read/delete (via `/api/mcpMemory*`).
- End-to-end: Convex actions → OpenBB `/health`, `/admin/available_tools`, `/tools/execute`.
- End-to-end: Convex actions → Research `/health`, `/tools/list`, `/tools/execute` (with secret).

### Manual curl verification

```bash
# Core Agent MCP tools/list (JSON-RPC 2.0)
curl -X POST "https://core-agent-mcp.yourapp.com" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -H "x-mcp-token: TOKEN" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'

# Convex mcp-3: create plan
curl -X POST "https://your-deployment.convex.site/api/mcpPlans" \
  -H "Content-Type: application/json" \
  -H "x-mcp-secret: MCP_SECRET" \
  -d '{"goal":"Test Plan","steps":[{"step":"Do thing","status":"pending"}]}'

# OpenBB server health
curl -X GET "https://openbb-mcp.yourapp.com/health"

# Research list tools
curl -X GET "https://research-mcp.yourapp.com/tools/list"

# Research execute tool (secret in body)
curl -X POST "https://research-mcp.yourapp.com/tools/execute" \
  -H "Content-Type: application/json" \
  -d '{"tool_name":"search_web","parameters":{"query":"Convex MCP"},"secret":"RESEARCH_API_KEY"}'
```

---

## Timeline Estimate

| Task | Estimated Time |
|------|----------------|
| mcp-3: HTTP persistence endpoints | 2–3 hours |
| mcp-4: OpenBB actions standardization | ~2 hours |
| mcp-5: Research actions + URL removal | ~2 hours |
| Testing & verification | 1–2 hours |
| **Total** | **7–9 hours** |

---

## Notes

- This plan covers repo changes (Convex + MCP server code). Deployment/infra choices remain up to the operator.
- mcp-3 uses a shared-secret header (`MCP_SECRET`) as the initial security mechanism; upgrade path is JWT/mTLS + per-service principals.
- For production, add rate limiting + request size limits on `/api/mcpPlans*` and `/api/mcpMemory*` routes.
