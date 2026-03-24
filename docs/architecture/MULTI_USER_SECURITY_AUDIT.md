# Multi-User Security, Privacy & Attack Surface Audit

**Date:** 2026-03-21
**Scope:** NodeBench Founder Platform — 8 files across server layer, Convex domain, and frontend views
**Auditor:** Automated deep-read security audit

---

## Executive Summary

The Founder Platform has **7 P0 findings**, **6 P1 findings**, and **4 P2 findings**. The most critical pattern is **missing workspace ownership validation on every Convex mutation** — any authenticated user who guesses or enumerates a Convex document ID can modify another user's company, initiative, agent, or task packet. The server layer (commandBridge, mcpGateway) is significantly more hardened than the Convex layer.

---

## P0 — Fix Immediately (Data Breach / Privilege Escalation)

### P0-1: Convex mutations have ZERO ownership validation

**File:** `convex/domains/founder/operations.ts`
**Lines:** 267-346 (createCompany), 352-381 (createInitiative), 432-472 (createAgent), 509-538 (ingestSignal), 544-563 (createDecision), 589-616 (createIntervention), 919-984 (createTaskPacket), 1235-1272 (sendMessage), 1296-1325 (createApproval)

**Symptom:** Every mutation that takes a `workspaceId`, `companyId`, or entity ID trusts it blindly. No mutation checks whether the calling user owns the workspace referenced.

**Root cause (5 whys):**
1. Why can User A mutate User B's data? Because mutations don't verify ownership.
2. Why don't they verify ownership? Because `ctx.auth.getUserIdentity()` is never called in entity mutations.
3. Why isn't it called? Because the mutations were designed for a single-user demo first.
4. Why wasn't multi-user auth added before shipping? Because the platform was scaffolded with fixture data.
5. Why does this matter now? Because the schema is deployed to Convex, and any authenticated client can call any mutation with any ID.

**Impact:** Complete cross-tenant data manipulation. User A can create companies in User B's workspace, inject signals, dispatch tasks to User B's agents, send messages as User B, approve/reject User B's approvals.

**Fix:** Add ownership validation to every mutation. Pattern:

```typescript
// Helper — reusable across all mutations
async function assertWorkspaceOwner(
  ctx: { db: any; auth: any },
  workspaceId: Id<"founderWorkspaces">,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) throw new Error("Workspace not found");
  if (workspace.ownerUserId !== identity.subject) {
    throw new Error("Access denied — workspace not owned by caller");
  }
  return identity.subject;
}
```

Apply to every mutation that accepts `workspaceId` directly. For mutations that accept `companyId` or child entity IDs, traverse up to the workspace and validate.

---

### P0-2: Convex queries have ZERO ownership scoping

**File:** `convex/domains/founder/operations.ts`
**Lines:** 19-24 (getWorkspace), 30-35 (getCompany), 55-63 (getInitiativesByCompany), 69-77 (getAgentsByWorkspace), 83-95 (getSignalsByCompany), 101-108 (getDecisionsByCompany), 177-238 (getDashboardSummary), 797-802 (getTaskPacket), 808-836 (getTasksByAgent), 876-893 (getPendingTasks), 1045-1054 (getAgentPresence), 1197-1210 (getConversationMessages)

**Symptom:** Every query returns data for any ID passed — no check that the caller owns the workspace.

**Root cause:** Same as P0-1. Queries trust the client to only ask for their own data.

**Impact:** Complete cross-tenant data read. User A can read User B's companies, agents, signals, decisions, interventions, task packets, conversation messages, and approval queue.

**Fix:** Add auth check to every query:

```typescript
export const getWorkspace = query({
  args: { workspaceId: v.id("founderWorkspaces") },
  handler: async (ctx, { workspaceId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");
    const ws = await ctx.db.get(workspaceId);
    if (!ws || ws.ownerUserId !== identity.subject) return null;
    return ws;
  },
});
```

For queries that take `companyId`, look up the company -> workspace -> check owner.

---

### P0-3: `createWorkspace` allows unauthenticated creation with "anonymous" fallback

**File:** `convex/domains/founder/operations.ts`, line 251-252

**Code:**
```typescript
const identity = await ctx.auth.getUserIdentity();
const ownerUserId = identity?.subject ?? "anonymous";
```

**Root cause:** The `?? "anonymous"` fallback means unauthenticated callers can create workspaces. All workspaces created without auth share the same "anonymous" owner, meaning they can all access each other's data (once P0-1/P0-2 are fixed, the "anonymous" user would own all anonymous workspaces).

**Impact:** Unauthenticated workspace creation; shared "anonymous" identity collapses multi-tenancy.

**Fix:**
```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Authentication required");
const ownerUserId = identity.subject;
```

---

### P0-4: `getConversationMessages` query has no workspace scoping at all

**File:** `convex/domains/founder/operations.ts`, lines 1197-1210

**Code:**
```typescript
export const getConversationMessages = query({
  args: {
    conversationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { conversationId, limit }) => {
    const cap = Math.min(limit ?? 100, 200);
    return ctx.db
      .query("founderCommandMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .take(cap);
  },
});
```

**Root cause:** `conversationId` is an opaque string. Anyone who guesses or enumerates conversation IDs can read all messages. There is no `workspaceId` filter or auth check.

**Impact:** Cross-tenant message leakage. If conversation IDs are sequential or predictable (e.g. `conv_1`, `conv_2`), this is trivially exploitable.

**Fix:** Require `workspaceId` arg, validate ownership, and add workspace filter:

```typescript
export const getConversationMessages = query({
  args: {
    workspaceId: v.id("founderWorkspaces"),
    conversationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { workspaceId, conversationId, limit }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");
    const ws = await ctx.db.get(workspaceId);
    if (!ws || ws.ownerUserId !== identity.subject) return [];
    const cap = Math.min(limit ?? 100, 200);
    return ctx.db
      .query("founderCommandMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .take(cap);
  },
});
```

---

### P0-5: `updateCompany`, `updateInitiative`, `updateAgentStatus`, `updateDecisionStatus`, `updateInterventionStatus`, `updateTaskStatus`, `cancelTask`, `resolveApproval` — direct ID mutation with no ownership check

**File:** `convex/domains/founder/operations.ts`

**Symptom:** All update/patch mutations accept a document ID and mutate it directly. No check that the calling user owns the parent workspace.

**Example — `cancelTask` (line 1026-1035):**
```typescript
export const cancelTask = mutation({
  args: { taskPacketId: v.id("founderTaskPackets") },
  handler: async (ctx, { taskPacketId }) => {
    await ctx.db.patch(taskPacketId, {
      taskStatus: "cancelled",
      updatedAt: Date.now(),
    });
    return taskPacketId;
  },
});
```

**Impact:** Any authenticated user can cancel any other user's tasks, change company status, update agent goals, resolve approvals, etc.

**Fix:** For every update mutation, look up the entity, traverse to workspace, validate ownership. Example:

```typescript
export const cancelTask = mutation({
  args: { taskPacketId: v.id("founderTaskPackets") },
  handler: async (ctx, { taskPacketId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");
    const task = await ctx.db.get(taskPacketId);
    if (!task) throw new Error("Task not found");
    const ws = await ctx.db.get(task.workspaceId);
    if (!ws || ws.ownerUserId !== identity.subject) {
      throw new Error("Access denied");
    }
    await ctx.db.patch(taskPacketId, {
      taskStatus: "cancelled",
      updatedAt: Date.now(),
    });
    return taskPacketId;
  },
});
```

---

### P0-6: Command Bridge `broadcast()` sends to ALL connected agents across ALL users

**File:** `server/commandBridge.ts`, lines 926-929

**Code:**
```typescript
broadcast(message: BridgeMessage): void {
  for (const [agentId] of this.connections) {
    this.sendToAgent(agentId, message);
  }
}
```

**Root cause:** Broadcast iterates all connections regardless of `userId`. There is no user/workspace scoping.

**Impact:** If User A calls broadcast, it reaches User B's agents. Task packets, approval responses, or error messages could leak across tenants.

**Fix:** Scope broadcast by userId:

```typescript
broadcastToUser(userId: string, message: BridgeMessage): void {
  for (const [agentId, conn] of this.connections) {
    if (conn.userId === userId) {
      this.sendToAgent(agentId, message);
    }
  }
}
```

---

### P0-7: Command Bridge `dispatchTask` has no user-scoping — any caller can dispatch to any agent

**File:** `server/commandBridge.ts`, lines 686-757

**Symptom:** `dispatchTask(agentId, packet)` only checks if the agent is connected and has capabilities. It does not verify that the caller owns the agent or belongs to the same workspace.

**Root cause:** The agentId is a server-generated UUID, but the dispatch function is a public method on the CommandBridge class. Any server-side code that holds a reference to the bridge can dispatch to any agent.

**Impact:** If the API layer (e.g. an HTTP endpoint or Convex action) exposes task dispatch, User A could dispatch tasks to User B's agents.

**Fix:** Add userId validation:

```typescript
dispatchTask(userId: string, agentId: string, packet: OutboundTaskPacket): DispatchResult {
  const conn = this.connections.get(agentId);
  if (!conn) {
    return { dispatched: false, reason: "Agent not connected" };
  }
  // SECURITY: verify the dispatching user owns this agent
  if (conn.userId !== userId) {
    return { dispatched: false, reason: "Access denied — agent belongs to different user" };
  }
  // ... rest of dispatch logic
}
```

---

## P1 — Fix This Sprint (Security Hardening)

### P1-1: Health endpoints leak operational topology

**File:** `server/index.ts`, lines 127-158; `server/commandBridge.ts`, lines 934-969

**Symptom:** `/health`, `/mcp/health`, `/mcp/info`, `/bridge/health` are all unauthenticated and expose:
- Active session count
- Max connection limits
- Agent type distribution (how many claude_code vs openclaw)
- Pending task count
- Uptime
- Latency percentiles

**Impact:** Reconnaissance. An attacker learns capacity limits, can time attacks for peak load, and infer internal architecture.

**Fix:** For production, either:
1. Put health endpoints behind a shared secret header, or
2. Return only `{ status: "ok" }` to unauthenticated callers, with full details only when a valid admin key is provided.

---

### P1-2: `corsOrigins: ["*"]` set in server/index.ts

**File:** `server/index.ts`, lines 53-59 and line 98

**Code:**
```typescript
app.use(cors({ origin: "*", ... }));
// ...
const gatewayConfig: McpGatewayConfig = { ... corsOrigins: ["*"] };
```

**Impact:** Any origin can make credentialed requests to the API. Combined with the dev key-gen endpoint, this allows cross-site attacks in development.

**Fix:** In production, restrict to the actual frontend origin. The gateway already defaults to `[]` (same-origin) — the server config overrides this to `["*"]`.

---

### P1-3: Dev key-gen endpoint uses weak `NODE_ENV` guard

**File:** `server/index.ts`, lines 161-183

**Symptom:** `POST /mcp/dev/generate-key` is only gated by `process.env.NODE_ENV !== "production"`. If `NODE_ENV` is unset (common in staging or misconfigured deployments), the endpoint is exposed.

**Impact:** Unauthenticated API key generation on any non-production deployment.

**Fix:** Add an explicit allowlist:

```typescript
if (process.env.NODEBENCH_ENABLE_DEV_KEY_GEN === "true") {
```

---

### P1-4: `resolveApproval` error message leaks existence of document IDs

**File:** `convex/domains/founder/operations.ts`, line 1341

**Code:**
```typescript
if (!approval) throw new Error("Approval not found");
```

**Impact:** An attacker can enumerate valid approval IDs by checking which return "not found" vs "access denied" (once auth is added). The error message itself is safe, but the response timing may differ. Once ownership checks are added, use a consistent "Access denied or not found" message for both missing and unauthorized.

---

### P1-5: `v.any()` used in `metadata` fields allows arbitrary data injection

**File:** `convex/domains/founder/schema.ts`, lines 338 (`founderEvidence.metadata`), 496 (`founderCommandMessages.metadata`)

**Symptom:** `v.any()` accepts any JSON value, including deeply nested objects that could exhaust storage or contain XSS payloads stored in the DB.

**Impact:** Storage exhaustion via large metadata objects. Stored XSS if metadata is rendered without sanitization.

**Fix:** Replace `v.any()` with a bounded `v.optional(v.object({...}))` or at minimum `v.optional(v.string())` with a size limit enforced in the mutation handler.

---

### P1-6: Command Bridge stale cleanup interval creates an interval that is never cleared

**File:** `server/commandBridge.ts`, lines 269-271

**Code:**
```typescript
setInterval(() => {
  this.cleanupStaleConnections();
}, this.heartbeatIntervalMs * 5);
```

**Impact:** This `setInterval` is never stored and never cleared during `shutdown()`. In long-running processes or hot-reload scenarios, this leaks timers. Not a security vulnerability per se, but a reliability issue under multi-user load — orphaned intervals accumulate.

**Fix:** Store the interval handle and clear it in `shutdown()`.

---

## P2 — Fix When Touched (Hardening / Best Practice)

### P2-1: Frontend views render agent names and content without sanitization

**File:** `src/features/founder/views/FounderDashboardView.tsx` (lines 465-474), `src/features/founder/views/CommandPanelView.tsx` (message content rendering)

**Symptom:** Agent names, goals, message content, and evidence previews are rendered directly into JSX. Currently using demo fixtures, but when wired to Convex, a malicious agent name like `<img src=x onerror=alert(1)>` could execute.

**Impact:** React's JSX auto-escapes string interpolation, so this is NOT a live XSS risk. However, if any field is ever rendered via `dangerouslySetInnerHTML` or in an `href`, it becomes exploitable.

**Fix:** Ensure no `dangerouslySetInnerHTML` is ever used for user/agent-supplied content. Add CSP headers. This is currently safe due to React's default escaping.

---

### P2-2: API key token passed in URL query string

**File:** `server/mcpGateway.ts`, lines 153-160

**Code:**
```typescript
const url = new URL(req.url ?? "/", ...);
const token = url.searchParams.get("token");
```

**Impact:** API keys in URLs are logged in server access logs, browser history, and proxy logs. The header-based and subprotocol-based methods are preferred.

**Fix:** Log a deprecation warning when `?token=` is used. In a future release, remove query string auth entirely.

---

### P2-3: `sendMessage` mutation allows impersonation (senderType not validated)

**File:** `convex/domains/founder/operations.ts`, lines 1235-1272

**Symptom:** The `senderType` field ("founder", "orchestrator", "agent") is caller-supplied. An agent could send messages as "founder", or a founder could send as "orchestrator".

**Impact:** UI confusion, audit trail poisoning. Not a data breach, but damages trust in the message timeline.

**Fix:** Validate `senderType` against the caller's identity. If the caller is an authenticated user, force `senderType: "founder"`. If from a server action, allow "orchestrator" or "agent".

---

### P2-4: No rate limiting on Convex mutations

**File:** `convex/domains/founder/operations.ts` (all mutations)

**Symptom:** There is no rate limiting on any Convex mutation. An attacker could flood `ingestSignal`, `sendMessage`, or `createTaskPacket` to exhaust Convex function invocations or storage.

**Impact:** Denial of service via Convex billing exhaustion.

**Fix:** Add rate limiting at the Convex layer using a counter table or at the API gateway level. At minimum, add `.take()` bounds on write-heavy paths.

---

## Production Multi-User Stress Assessment

### 100 concurrent users, each with 5 agents

| Component | Capacity | Risk |
|-----------|----------|------|
| MCP Gateway | Max 100 sessions (hardcoded) | At 100 users, the 101st is rejected. Needs per-user fairness. |
| Command Bridge | Max 50 agent connections (hardcoded) | 500 agents would be rejected. Need to raise or shard. |
| Rate limit counters (mcpAuth) | Max 200 tracked keys, LRU eviction | At 100 users, fine. At 200+, eviction means some users lose rate limit state, allowing brief bursts. |
| Pending tasks (commandBridge) | Max 500 global | Shared across all users. One user could consume all 500 slots. Need per-user caps. |
| Convex queries | Bounded by `.take()` | Good — all queries have bounds. |
| Memory (dayTimestamps in rate limiter) | 86,400 entries/key at 1 req/sec | At 100 keys x 10K/day = 1M timestamps in memory. Manageable but worth monitoring. |

### Fairness gaps:
1. **No per-user connection limit** — one user could open 100 MCP sessions, blocking all others
2. **No per-user pending task cap** — one user could fill all 500 pending task slots
3. **Global rate limit counters** — eviction under load means some users briefly bypass rate limits

---

## Summary Table

| ID | Severity | Component | Finding |
|----|----------|-----------|---------|
| P0-1 | P0 | Convex mutations | Zero ownership validation on all mutations |
| P0-2 | P0 | Convex queries | Zero ownership scoping on all queries |
| P0-3 | P0 | Convex createWorkspace | Unauthenticated creation with "anonymous" fallback |
| P0-4 | P0 | Convex getConversationMessages | No workspace scoping, enumerable conversation IDs |
| P0-5 | P0 | Convex update mutations | Direct ID mutation with no ownership check |
| P0-6 | P0 | Command Bridge broadcast | Sends to ALL agents across ALL users |
| P0-7 | P0 | Command Bridge dispatchTask | No user-scoping on task dispatch |
| P1-1 | P1 | Health endpoints | Leak operational topology unauthenticated |
| P1-2 | P1 | server/index.ts | CORS wildcard in production config |
| P1-3 | P1 | server/index.ts | Dev key-gen uses weak NODE_ENV guard |
| P1-4 | P1 | Convex resolveApproval | Error timing may leak document existence |
| P1-5 | P1 | Convex schema | v.any() metadata allows arbitrary injection |
| P1-6 | P1 | Command Bridge | Stale cleanup interval never cleared |
| P2-1 | P2 | Frontend views | Agent content rendered without extra sanitization |
| P2-2 | P2 | MCP Gateway | API key in URL query string |
| P2-3 | P2 | Convex sendMessage | senderType not validated against caller |
| P2-4 | P2 | Convex mutations | No rate limiting on mutations |
