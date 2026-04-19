# Convex-Native Search Architecture

## Problem

The search pipeline runs on Vercel serverless with a 10s Hobby timeout. The pipeline chains 4-5 external calls (Linkup 8s + web_search 6s + Gemini extraction 10s + Gemini synthesis 20s + enrichment 10s) = 54s+ total. The current "fix" is a bandaid: reduce timeouts and add budget gates. The real fix is to move the search pipeline to Convex, which natively supports 10-minute actions, durable workflows, realtime reactivity, and persistent text streaming.

## What Convex Already Provides (installed, configured)

| Component | Package | Status | What It Does |
|-----------|---------|--------|--------------|
| **Workflow** | `@convex-dev/workflow` | Installed, used in `bankingMemoWorkflow.ts` | Durable step-by-step execution, pause/resume, retry, restart from step, realtime status observation |
| **Agent** | `@convex-dev/agent` | Installed, used in `parallelDelegation.ts` | LLM agent with tool dispatch, multi-model, conversation threads |
| **Persistent Text Streaming** | `@convex-dev/persistent-text-streaming` | Installed, used in `fastAgentPanelStreaming.ts` | SSE-like streaming that persists to DB — survives refreshes, observable by multiple clients |
| **Workpool** | `@convex-dev/workpool` | Installed | Parallelism limits, queue management for async work |
| **RAG** | `@convex-dev/rag` | Installed | Vector search, embedding, retrieval |
| **Actions** | Built-in | Used everywhere | 10-minute execution limit, 1000 concurrent IO ops, `fetch()` to external APIs |
| **Scheduled Functions** | Built-in | Used in `agentTriggers.ts` | `ctx.scheduler.runAfter()` — durable, survives restarts |
| **HTTP Actions** | Built-in | `convex/http.ts` | Expose HTTP endpoints on `*.convex.site`, same 10-min limit as actions |
| **Realtime Queries** | Built-in | Used everywhere | Subscribe to search status from React — no SSE needed, auto-updates |

## The Right Architecture

### Current (wrong): Vercel SSE → external calls → timeout

```
Browser → Vercel /api/search (10s limit)
         → Linkup (8s) → web_search (6s) → Gemini (10s) → synthesis (20s)
         → SSE stream back to browser
         → TIMEOUT → hang forever
```

### Proposed (correct): Convex Workflow + Realtime Subscription

```
Browser → Convex mutation: startSearch(query, lens)
         → Creates search document in DB
         → Schedules Convex action (10-min limit)
         → Returns searchId immediately

Browser subscribes via useQuery(getSearchStatus, { searchId })
         → Realtime updates as workflow progresses
         → No SSE needed — Convex reactivity handles it

Convex action (10 minutes available):
  Step 1: Classify query (Gemini, 3s)
  Step 2: Parallel tool dispatch (Linkup + web_search + recon, 30s max)
  Step 3: Gemini extraction from sources (15s)
  Step 4: Synthesize into packet (20s)
  Step 5: Enrichment (credibility + Monte Carlo, 15s)
  Step 6: Write final result to DB
  → Total: ~1.5 min, well within 10-min limit

Browser sees result appear via realtime subscription
```

### Why This Is Better

1. **10-minute budget** vs 10-second budget — no timeouts on reasonable queries
2. **Durable** — survives server restarts, can be retried from any step
3. **Realtime progress** — React `useQuery` shows trace steps live without SSE plumbing
4. **Persistent text streaming** — LLM synthesis can stream tokens via `@convex-dev/persistent-text-streaming`, persisted to DB
5. **Multi-client** — multiple tabs see the same search result without re-fetching
6. **Status observable** — "searching", "classifying", "enriching", "complete" visible reactively
7. **No Vercel function limit** — removes 1 of 12 precious serverless function slots
8. **Retry/restart** — if Linkup is down, restart from step 2 without re-classifying

## Schema Addition

```typescript
// convex/schema.ts (add to existing)
searchSessions: defineTable({
  query: v.string(),
  lens: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("classifying"),
    v.literal("searching"),
    v.literal("extracting"),
    v.literal("synthesizing"),
    v.literal("enriching"),
    v.literal("complete"),
    v.literal("error"),
  ),
  classification: v.optional(v.object({
    type: v.string(),
    entity: v.optional(v.string()),
    entities: v.optional(v.array(v.string())),
    lens: v.string(),
  })),
  trace: v.array(v.object({
    step: v.string(),
    tool: v.optional(v.string()),
    status: v.string(),
    detail: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    startedAt: v.number(),
  })),
  result: v.optional(v.any()), // ResultPacket — full search result
  error: v.optional(v.string()),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  userId: v.optional(v.id("users")),
})
  .index("by_user", ["userId", "startedAt"])
  .index("by_status", ["status"]),
```

## Implementation Plan

### Option A: Convex Action (simplest, covers 90% of cases)

Move the search pipeline to a Convex `internalAction` that:
1. Receives `searchId` from a mutation
2. Fetches from Linkup, web_search, Gemini via `fetch()` (all allowed in actions)
3. Writes trace steps to the `searchSessions` document via `ctx.runMutation()`
4. Writes final result via `ctx.runMutation()`

Frontend subscribes via `useQuery(api.search.getSearchSession, { searchId })`.

**Pros:** Simple, no new components needed, 10-minute budget
**Cons:** Not durable — if action crashes mid-way, no retry from step

### Option B: Convex Workflow (durable, retry, restart)

Use `@convex-dev/workflow` (already installed) to define the search as a multi-step durable workflow:

```typescript
const searchWorkflow = workflow.define({
  args: { searchId: v.id("searchSessions"), query: v.string(), lens: v.string() },
  handler: async (step, args) => {
    // Step 1: Classify
    const classification = await step.runAction(internal.search.classify, {
      query: args.query, lens: args.lens,
    });

    // Step 2: Parallel search (Linkup + web)
    const [linkupResult, webResult] = await Promise.all([
      step.runAction(internal.search.linkupSearch, { query: args.query, entity: classification.entity }),
      step.runAction(internal.search.webSearch, { query: args.query }),
    ]);

    // Step 3: Extract
    const extracted = await step.runAction(internal.search.geminiExtract, {
      query: args.query, sources: [...linkupResult.sources, ...webResult.sources],
    });

    // Step 4: Synthesize
    const packet = await step.runAction(internal.search.synthesize, {
      query: args.query, lens: args.lens, extracted, classification,
    });

    // Step 5: Write result
    await step.runMutation(internal.search.writeResult, {
      searchId: args.searchId, packet,
    });
  },
});
```

**Pros:** Durable, can restart from any step, retries configurable per step, status observable
**Cons:** Slightly more complex to set up

### Option C: Hybrid (recommended)

- Use **Option A** (simple action) for the search pipeline itself
- Use **Option B** (workflow) for the founder episode lifecycle (before/during/after spans)
- Use **Persistent Text Streaming** for LLM synthesis output (stream tokens to client while generating)
- Keep the Vercel `/api/search` route as a thin proxy that creates the Convex search session and returns the `searchId`

This way:
- The search API returns instantly with a `searchId`
- The frontend switches from SSE to `useQuery(getSearchSession, { searchId })`
- The actual work runs on Convex with 10 minutes of budget
- Founder episodes use durable workflows for before/during/after spans

## Frontend Changes

```typescript
// Current: SSE streaming from Vercel
const response = await fetch(`/api/search?stream=true`, { method: "POST", body: ... });
// Parse SSE events...

// Proposed: Convex mutation + realtime query
const searchId = await startSearch({ query, lens }); // mutation, returns instantly
const session = useQuery(api.search.getSearchSession, { searchId }); // realtime
// session.status updates automatically: pending → classifying → searching → complete
// session.trace grows in realtime as steps complete
// session.result appears when done
```

## Migration Path

1. Add `searchSessions` table to schema
2. Build Convex search action (classify + search + extract + synthesize)
3. Build `startSearch` mutation + `getSearchSession` query
4. Update frontend to use mutation + realtime query instead of SSE
5. Keep Vercel `/api/search` as a fallback during transition
6. Remove Vercel search route once Convex path is stable
7. Revert the timeout bandaid from `server/routes/search.ts`

## Founder Episode Integration

The founder episode lifecycle (before/during/after spans, packet lineage) should be a Convex workflow:

```
startFounderEpisode (mutation)
  → Schedule searchWorkflow
  → Append "before" span
  → Search completes → append "during" span with trace
  → Packet compiled → append "after" span
  → Subconscious routes relevant whisper for next session
```

This directly addresses the "founder intelligence harness" requirement from the corrected control-plane base.

## What the Bandaid Timeout Fix Should Be

The current timeout fix (REQUEST_BUDGET_MS, reduced timeouts, checkBudget gates) should stay temporarily as a safety net. It prevents the stream from hanging forever. But it's not the solution — the solution is moving search to Convex actions where 10 minutes is available.

## Key Insight

The entire search pipeline is already doing what Convex actions are designed for: calling external APIs (Linkup, Gemini, web search), processing results, and writing to a database. Moving it to Convex is not a refactor — it's using the right tool for the job.
