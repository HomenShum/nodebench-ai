# Fast/Slow Agent Runtime — Design Spec

> Status: draft v1, 2026-04-21. Owner: hshum.
> Supersedes ad-hoc fast-agent plumbing in `convex/domains/agents/fastAgentPanelStreaming.ts` and `convex/actions/externalOrchestrator.ts`. Extends, does not replace, orchestrator-workers pattern in `.claude/rules/orchestrator_workers.md`.

---

## 1. Answer to the user's framing

**You were right to push back on "too fast too dumb."** A fast mode that only does a vector lookup and an LLM paraphrase is a demo, not a product. Nobody returns to it.

The right decomposition is not `dumb fast` vs `smart slow`. It is:

| Axis | Fast | Slow |
|---|---|---|
| Budget (wall-clock p95) | 1.5–8s | 3–30 min |
| Tool-call count ceiling | 5 | 30+ |
| Model tier | `fast` (Claude Sonnet 4 / Gemini 3 Flash / GPT-5.4-mini) | `premium` (Opus / Gemini Pro / GPT-5.4 flagship) |
| Orchestration shape | single-turn with optional 1-hop fan-out | orchestrator-workers fan-out with scratchpad |
| Context depth | JIT: session scratchpad + shared canonical cache | JIT + layered entity memory + fresh research |
| Output shape | cited paragraph or small table + escalation CTA | structured multi-block report with verdict |
| Idempotency | per-query cache | per `(entity, ingestHash, userId)` rejoin |
| Verdict | implicit (cited or not) | explicit: `verified / provisionally_verified / needs_review / failed` |

Both sit on the **same runtime primitives** (adapter, MCP tool layer, Convex scratchpad, model router, trace contract). Budget + tool ceiling + orchestration shape are the only things that differ. That split matches how Anthropic, Manus, and OpenAI now separate "agent answer" from "agent run."

### Why share one runtime

- **One trace schema.** Every fast turn can be escalated to slow without rewriting the trace. Trivially important at a conference demo where "dig deeper" is a button.
- **One tool allowlist logic.** Same MCP allowlist code, same SSRF guard, same size caps. Two runtimes = two security surfaces.
- **One verdict contract.** Fast answers are implicit `verified | needs_review` derived from grounding; slow answers are explicit. Same field, same UI.
- **One scratchpad.** Fast writes to the same per-thread scratchpad that slow can pick up and extend. The "escalate to deep run" button just re-enters the scratchpad with a larger budget envelope.
- **Shared canonical cache.** Fast populates it, slow reuses it, and vice-versa. Two runtimes would duplicate.

### Where shared runtime has real tradeoffs

- **Latency contamination.** If the slow path's telemetry writes are synchronous in the shared code path, fast mode gets dragged down. Mitigation: telemetry emits are fire-and-forget with `ERROR_BOUNDARY` around them. Already the house rule (`pipeline_operational_standard.md`).
- **Cost blast radius.** A fast path that accidentally invokes the premium tier burns budget. Mitigation: model router enforces tier from the call site; fast code path cannot pass `tier: "premium"`. Compile-time if possible.
- **Tool breadth temptation.** Shared runtime makes all 304 tools reachable from fast. Mitigation: fast presets gate to a ~25-tool allowlist, enforced at adapter boundary.
- **Background-run bleed.** Slow runs that take 30 min must not block fast threads. Mitigation: background mode (S17 in the CSV) runs via 202 + runId; UI polls, does not block.

### Competitor frame

- **Claude Code / Agent SDK** — fast turn inside editor is a tool-dispatching Claude call; slow `Task` spawns a subagent with a fresh context. Same runtime, different budget. This is the pattern I'm borrowing.
- **Manus AI** — UX-level fast/slow ("Chat" vs "Task"). Both write to the same virtual workspace. Shared state, different pacing. Same idea.
- **OpenAI Agents SDK + Deep Research** — explicitly two products: streaming chat completions vs Deep Research runs. They do not share runtime, and that's why context re-use is poor and escalation is awkward (user has to re-paste).
- **DeerFlow / Hermes-style graph orchestrators** — one runtime (graph), one budget model (node-level). Strong for research, weak for fast chat UX because graph cold-start exceeds fast budget.
- **OpenClaw / computer-use** — deliberately separates cheap reasoning loop from expensive computer-use tool loop. Same runtime, different tool allowlists.
- **LangGraph** — one runtime, budget enforced via `maxIterations` and checkpoints. Closest structural analog to what NodeBench should do. Already used in `convex/domains/agents/adapters/langgraph/`.

**Verdict:** share the runtime, enforce the split at three layers — budget envelope, tool allowlist, model tier. This matches Claude Code / Manus / LangGraph. It does not match the two-product split used by OpenAI because that split exists for their billing, not their users.

---

## 2. Fast-mode capability bar

Fast must clear all of these to earn the name:

1. **Cites its sources.** Every non-common-knowledge claim has a visible source. No citation = not shipped.
2. **Grounds on real data.** If retrieval confidence is low, it says so and offers escalation. It does not paraphrase thin air.
3. **Reuses prior context.** Follow-ups in the same thread use scratchpad, do not re-call the web.
4. **Honours the event scope.** If the user is in a conference/day context, recall is event-scoped, not global.
5. **Shares canonical cache.** If another user just asked about the same entity, fast path hits CSL, not the web.
6. **Offers escalation.** Every fast answer ends with an affordance to run the slow version if needed.
7. **Refuses cleanly.** Prompt injection sanitized; PII requests refused with a policy citation.
8. **Honest under load.** 429 is a real 429; timeout is a real 504; fabrication is banned.

Fast is not "the dumber one." Fast is "the one that admits its budget and still earns trust."

---

## 3. Shared-canonical cache architecture (conference / multi-user)

The problem: 100 people at Claude Summit, most ask about overlapping entities within minutes. Per-user fan-out would burn LLM + search API cost by ~100× and destroy p95.

The shape: **three cache layers, one privacy rule.**

### 3.1 Canonical Source Layer (CSL)

- **What:** raw fetched bodies from public URLs, keyed by `sha256(stableStringify({ url, fetch_day }))`.
- **Who reads:** any user, any mode.
- **Privacy:** public-domain sources only. Validated via `SSRF` blocklist + content-type allowlist on ingest. No user query text, no auth-gated URLs, no PII, ever enters CSL. If the source returned `Set-Cookie` or an auth challenge, it is not cached.
- **TTL:** source-type-specific. News 1h. Docs 24h. Regulatory filings 7d. Entity profile metadata 24h.
- **Schema:**
  ```ts
  csl: {
    key: string;              // sha256 of {url, fetch_day}
    url: string;              // canonical URL
    fetchedAt: number;        // ms
    ttlMs: number;            // source-type-specific
    contentType: "html" | "json" | "pdf" | "markdown";
    bytes: Bytes;             // max 1 MB; BOUND_READ enforced
    hashOfBody: string;       // sha256 of body — detect content drift
    sourceClass: "news" | "regulatory" | "careers" | "profile" | "other";
  }
  ```
- **Bound:** LRU cap at 50k entries. Eviction on insert.
- **Rule source:** `agentic_reliability.md` BOUND + BOUND_READ + SSRF.

### 3.2 Extracted Signal Layer (ESL)

- **What:** deduplicated facts extracted from CSL, keyed by `sha256(stableStringify({ entitySlug, signalType, dayBucket }))`.
- **Who reads:** any user. Used by both fast and slow.
- **Example entries:**
  - `(anthropic, funding_round_amount, 2026-04-21) → { amount: "$3.5B", source_csl_key: "...", confidence: 0.92 }`
  - `(mistral, ceo_name, 2026-04-21) → { value: "Arthur Mensch", source_csl_key: "...", confidence: 1.0 }`
- **Privacy:** only facts that are already public by virtue of being in CSL. Never contains user queries or user inference.
- **TTL:** matches source CSL entry's TTL.
- **Schema:**
  ```ts
  esl: {
    key: string;               // sha256 of {entitySlug, signalType, dayBucket}
    entitySlug: string;
    signalType: SignalType;    // bounded enum
    dayBucket: string;         // YYYY-MM-DD
    value: string;             // the extracted fact
    sourceCslKeys: string[];   // 1..N — citation chain
    confidence: number;        // 0..1, computed from #sources + agreement
    extractedAt: number;
    extractorModel: string;    // for repro
  }
  ```
- **Bound:** LRU 200k entries.
- **Rule source:** `grounded_eval.md` Layer 4 (citation chain via `sourceIdx`).

### 3.3 User Scratchpad Layer (USL)

- **What:** per-user, per-thread scratchpad. All user-written and user-adjacent state.
- **Who reads:** only the owning `userId`, enforced at Convex query level.
- **Contains:** query text, thread messages, per-run scratchpad, structured output, event tags.
- **Privacy:** this is the layer that never enters any shared cache. It is the boundary.

### 3.4 Privacy invariant

> Shared layers (CSL, ESL) contain only content that is public by origin. Private layer (USL) is the only place user-authored or user-inferred content lives. Reads cross-layer are one-way only: USL can read CSL/ESL; CSL/ESL cannot read USL. A lookup by `(entitySlug, signalType)` cannot reveal *which* user asked.

### 3.5 Conference worked example (F10)

```
t=0    User 1 asks "anthropic funding"
       - USL: write query to thread
       - ESL lookup (anthropic, funding_round_amount, 2026-04-21) → miss
       - CSL lookup for candidate URLs → miss
       - fetch web sources (budget 2.5s)
       - write CSL entries for each fetched URL
       - LLM extract → write ESL entry
       - return cited answer to user 1 at t ≈ 4.5s

t=12s  User 2 asks "anthropic funding"
       - USL: write query to user 2's thread
       - ESL lookup → HIT (from t=0)
       - assemble answer from ESL + CSL source bodies (for quote selection)
       - return cited answer to user 2 at t ≈ 0.9s

t=18s  User 3 asks "dig into anthropic" (slow mode)
       - ESL prewarms 7 blocks' worth of signals for free
       - slow orchestrator skips redundant tools, only fetches the gaps
       - cost of slow run drops by ~60% vs cold start
```

CSL and ESL are the reason fast mode stays fast under load. They are also the reason slow mode stays affordable under load.

### 3.6 What breaks this

- Ingesting URLs requiring auth (cookies, bearer tokens). Rejected at ingest.
- User-personalized search results (Google SERP with signed-in user). Not cacheable; route around.
- Jurisdiction/user-region-specific results (pricing pages). Keyed with region bucket in CSL key.
- Rapid news cycles shorter than TTL. Mitigation: for `news` sourceClass, TTL drops to 15 min for first hour after event.

---

## 4. Event-tied reports (recall at conferences / days)

### 4.1 The field

Every `thread`, `report`, `sharedMemo`, and `scratchpad` gets an optional `eventId`.

```ts
event: {
  _id: Id<"events">;
  slug: string;               // "claude-summit-2026-04-21"
  label: string;              // "Claude Summit"
  dayBucket: string;          // YYYY-MM-DD
  kind: "conference" | "weekly_brief" | "board_prep" | "personal_day" | "custom";
  ownerUserId: Id<"users">;
  visibility: "private" | "org";
}
```

### 4.2 Auto-inference rule

- If user is on a date-bounded page (calendar event, daily brief surface), set `eventId` from that context.
- Otherwise set `eventId` to a daily default `personal-day-{userId}-{YYYY-MM-DD}`.
- User can override via the thread-header pill: "Tagging this to: Claude Summit [change]".

### 4.3 Recall surfaces

- Event-scoped recall query: `getThreadsForEvent(userId, eventSlug)` — backs F16, S13 queries.
- At event start, a "today's event brief" surface loads: prior year's notes (if any), attendee list (if uploaded), target companies (if tagged).
- At event end (or manual "wrap"), a one-shot structuring pass rolls the day's threads into a single report tagged to that event.

### 4.4 Why this solves the recall problem

- Without event tags, "what did I investigate today?" requires a global date-range scan.
- With event tags, it's an index lookup `by_user_event`.
- Event tags also serve as the implicit dedup key for multi-thread recall: if I asked about Anthropic at 2 pm and 4 pm under the same event, the recall UI collapses them.

---

## 5. JIT context with a speed guarantee

Fast mode cannot wait for full context. It must stream early and refine. The contract:

1. **Budget tree.** Each request has a wall-clock budget that decomposes into stage budgets:
   - Context gather (ESL + thread scratchpad + event context): 150ms
   - Web fetch (only if ESL miss): 2500ms
   - LLM first token: 800ms
   - Total p95 budget: per-case (see CSV column `expected_total_ms_p95`).

2. **Race, don't serialize.** At fast entry:
   ```ts
   const context = await parallelWithBudgets({
     scratchpad: readScratchpad(threadId, { timeoutMs: 80 }),
     esl: eslLookup(entitySlug, signalType, dayBucket, { timeoutMs: 100 }),
     csl: cslLookup(candidateUrls, { timeoutMs: 150 }),
     eventMemory: eventScopedRecall(userId, eventId, { timeoutMs: 100 }),
   });
   ```
   The primitive already exists: `convex/tools/document/contextTools.ts::parallelWithBudgets` used by `fastAgentPanelStreaming.ts`.

3. **Ship early, patch later.** If an ESL hit returns, stream the cited answer immediately. If web_search is still in flight with a `fresh` flag, append a "latest update" block when it lands, marked clearly. Users see a live answer with a refresh band — not a blank screen.

4. **Low-confidence escalation.** If the gather stage returns nothing usable, fast refuses to fabricate: it returns the short-form "insufficient data — dig deeper?" card with the slow-run CTA pre-populated. This is the right kind of honest — matches `grounded_eval.md` Layer 1.

5. **Background warming.** Every fast answer triggers a background ESL-refresh for the queried entity if the ESL entry is > 50% of its TTL. Next user for that entity gets a fresh hit.

6. **Honest latency band.** UI shows a 3-state pill: `warm` (<1s, all cache), `fresh` (1–5s, web fetched this turn), `deep` (>5s, escalated). The user learns the tradeoff in one session.

---

## 6. Runtime diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               CLIENT (browser)                               │
│                                                                              │
│    ┌─────────────────────────┐          ┌──────────────────────────┐         │
│    │ AgentPanel (FAST)       │          │ DecisionWorkbench (SLOW) │         │
│    │ ask, cite, escalate CTA │          │ scratchpad stream,       │         │
│    │ event pill, voice in    │          │ block-level verdicts     │         │
│    └──────────┬──────────────┘          └──────────┬───────────────┘         │
│               │ stream tokens                      │ stream scratchpad       │
│               │ (ai-sdk, ws)                       │ (convex live query)     │
└───────────────┼────────────────────────────────────┼──────────────────────────┘
                │                                    │
┌───────────────┼────────────────────────────────────┼──────────────────────────┐
│               │        EDGE / Vercel               │                          │
│               │   Next.js routes + voice SSE       │                          │
└───────────────┼────────────────────────────────────┼──────────────────────────┘
                │                                    │
┌───────────────┴────────────────────────────────────┴──────────────────────────┐
│                            CONVEX (durable brain)                             │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐     │
│  │                 SHARED RUNTIME: adapter + trace contract             │     │
│  │                                                                      │     │
│  │  fast path                                slow path                  │     │
│  │  ─────────                                ──────────                 │     │
│  │  externalOrchestrator      ─────▶  orchestrator/worker.ts            │     │
│  │  fastAgentPanelStreaming              (orchestrator + N sub-agents,  │     │
│  │  budget: 8s, tools: 25                 scratchpad-first, fan-out)    │     │
│  │  model tier: fast                      budget: 30m, tools: 304,      │     │
│  │  verdict: implicit                     model tier: premium,          │     │
│  │                                        verdict: explicit             │     │
│  │                                                                      │     │
│  │             modelRouter.ts (single inference gate)                   │     │
│  │   ─ tier enforcement ─ cacheKey ─ audit ─ repro pin ─ rate limit     │     │
│  └──────────────────────────────────────────────────────────────────────┘     │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐     │
│  │                  STATE LAYERS (Convex tables)                        │     │
│  │                                                                      │     │
│  │  USL (private)        ESL (shared)           CSL (shared)            │     │
│  │  ─────────────        ────────────           ────────────            │     │
│  │  threads              extractedSignals       canonicalSources        │     │
│  │  messages             (entity, signal,       (url, day) → body      │     │
│  │  scratchpads          day) → value + cite    sourceClass, TTL        │     │
│  │  reports              confidence, extractor bound: 50k LRU           │     │
│  │  events               bound: 200k LRU        SSRF-validated ingest   │     │
│  │  eventTags                                                           │     │
│  │                                                                      │     │
│  │  traceAuditEntries    verdicts               rateLimitBuckets        │     │
│  │  toolHealthMetrics    scheduledRuns          deadLetterQueue         │     │
│  └──────────────────────────────────────────────────────────────────────┘     │
└────────────────────────┬───────────────────────────┬──────────────────────────┘
                         │                           │
            ┌────────────┴──────────────┐   ┌────────┴────────────────────┐
            │   MCP TOOL LAYER (304)    │   │   MODEL PROVIDERS            │
            │   toolsetRegistry + gate  │   │   OpenRouter (switchboard)   │
            │   SSRF, BOUND_READ,       │   │   Anthropic  (reason/slow)   │
            │   promptInjectionGuard    │   │   OpenAI     (fast/code)     │
            │   (fusionSearch, linkup,  │   │   Google     (fast/extract)  │
            │    entityLookup, deepSim, │   │                              │
            │    media, web, docs, …)   │   │   tier-routed per request    │
            └───────────────────────────┘   └──────────────────────────────┘
```

### Fast-path timeline (F10, warm cache, user 2)

```
t=0ms    Client:   sends query "anthropic funding" on thread T, event E
t=20ms   Convex:   resolveSession(userId, T) → scratchpad loaded
t=40ms   Convex:   parallelWithBudgets fires:
                     eslLookup(anthropic, funding_round_amount, 2026-04-21)
                     cslLookup(candidate URLs)
                     eventScopedRecall(userId, E)
                     scratchpadRead(T)
t=160ms  Convex:   ESL HIT (confidence 0.92, 2 sources)
                   CSL HIT for 2 source bodies (for quote selection)
t=180ms  router:   modelRouter.invoke(tier:fast, category:synthesis,
                     cacheKey = hash(query + ESL key), ttl=5min)
t=380ms  model:    first token streamed to client
t=1100ms full response streamed; trace + verdict (implicit: cited) written
t=1200ms scratchpad patch written; ESL refresh queued if TTL < 50%
t=1250ms event tag persisted on thread T
```

### Slow-path timeline (S01, cold)

```
t=0      submit → idempotency check passes → runId returned (202)
t=0..8s  orchestrator spawns 7 sub-agents in parallel, each with
         {tool_allowlist, scratchpad_section, budget}. Scratchpad stream
         live to UI.
t=30s    first block done (news). ESL writes queued.
...
t=5m     6 of 7 blocks green; patent block failed (USPTO 429).
         Retry scheduler: +12h.
t=5.2m   structuring pass reads final scratchpad → structured output
t=5.3m   verdict derived: provisionally_verified (1 block scheduled-retry)
t=5.3m   report saved + eventId tagged; user notified.
```

---

## 7. Rollout plan

1. **Land the three cache tables** (`canonicalSources`, `extractedSignals`, `events` + tagging on threads/reports). Writes gated behind a feature flag.
2. **Wire the JIT racer** in `fastAgentPanelStreaming.ts` (already uses `parallelWithBudgets`; add ESL/CSL lookup actions).
3. **Port the 40 scenarios** from `fast-slow-test-cases.csv` into the existing eval harness. Score them with `fast-slow-eval-template.md`.
4. **Dark-launch CSL/ESL writes** for 1 week. Measure: hit ratio vs cost saved. Target: ≥ 40% hit ratio on second-user queries for common entities, ≥ 60% fast-mode cost reduction at sustained 50-user conference load.
5. **Flip reads on** after CSL/ESL hit ratio clears bar + privacy audit passes (SEC2, SEC3 from eval).
6. **Escalation UX** — "dig deeper" button on every fast answer routes to slow runtime with the existing scratchpad and event tag pre-populated.

---

## 8. Non-goals

- Building a second runtime. Both modes share adapters, trace, MCP, and router.
- Per-user search personalization as a first-class layer. CSL/ESL are public-domain only.
- Cross-org cache sharing. CSL is global across authenticated users of NodeBench; not exposed externally without auth.

---

## 9. Prior art cited

- Anthropic Claude Code — one runtime, budget via `Task` subagents, shared trace (`orchestrator_workers.md`).
- Anthropic Building Effective Agents — orchestrator-workers pattern.
- Manus AI — shared virtual workspace across fast chat and slow task.
- LangGraph — `maxIterations` + checkpointers as budget enforcement in one runtime.
- DeerFlow / Hermes — graph-shaped fan-out used for slow; rejected for fast due to cold-start.
- Google Vertex grounding, Deepchecks — claim-level grounding informs Layer 2 of cache policy.

See rule files in `.claude/rules/`: `agentic_reliability.md`, `async_reliability.md`, `orchestrator_workers.md`, `scratchpad_first.md`, `grounded_eval.md`, `agent_run_verdict_workflow.md`, `pipeline_operational_standard.md`.

---

## 10. Artifact-state transitions (added from v2 eval schema)

The v2 eval schema named a first-class behavior I was folding into "verdict": **whether the run should create, save, or publish an artifact at all**. This is a separate axis from trace/verdict and needs its own contract.

### States (bounded enum)

```
none           — no artifact touched (fast lookup, adversarial refusal, ambiguous disambiguation)
none|draft     — either no artifact or an unsaved draft (fast answers, uncertain entity)
draft          — draft created, not saved (weak evidence, save-gate blocked)
draft_only     — draft locked as draft; save must be blocked even on user press
draft|saved    — either outcome allowed based on save-gate signal
saved          — persisted saved artifact
saved|published — saved + exported / shared
```

### Save-gate signal

A save gate fires only if all of:
- `resolution_expectation` was `exact` or `file_first`, not `ambiguous` or `probable`
- At least 2 independent citations support the primary claim
- `no_hallucinations` gate passes
- No adversarial category flagged
- User has an active event/thread scope to tag the artifact to (or user explicitly requested save)

If any fails: force `draft` or `draft_only`; surface "Save draft" affordance only.

### Why this matters

- **Silent-save is a product bug.** Fast mode creating a saved artifact for "tell me about Stripe" pollutes the user's workspace with low-quality canonicals. Fast defaults to `none|draft`.
- **Adversarial must not save.** `adversarial_injection`, `adversarial_pii`, `adversarial_ssrf`, `adversarial_exfil` must all land on `none`. The eval gate `artifact_decision_correct` is the check.
- **Ambiguous must not save.** Until disambiguation completes, no canonical. Prevents creating two competing "Arc" records.
- **Slow defaults differ by category.** Deep diligence → `draft|saved` (save-gate decides). Pulse generation → `saved` (scheduled job owns the artifact). CRM export → `saved|published`. Ambiguous deep → `none|draft` until disambiguation.

### Shared-runtime implication

Both fast and slow route artifact-state decisions through one gate, defined once. The gate reads: mode + primary_category + resolution_expectation + save-gate signals → returns the allowed final state. This is the same trust-boundary shape as model-tier enforcement (§1) — a single gate, not scattered checks.

---

## 11. Open questions

- TTL policy for `news` sourceClass during fast-moving events. Current default (1h then 15m for hot hour) is a guess; want first-week telemetry.
- Should ESL be org-shared instead of globally shared for paying customers? (private org-tenant CSL/ESL namespaces.)
- Rate-limit etiquette for the "one user's cold fetch primes many users" pattern — do we spread the first-user latency cost (N users pay slightly, user 1 pays less)?
- Voice-initiated slow runs (S17) — notification surface when user has closed the tab. Push? email? Reuse existing notification infra.
