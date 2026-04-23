# NodeBench — Master Engineering Handoff v2026-04-21

**Audience:** a brand-new engineer setting up the entire project from scratch and preparing for investor/customer/developer grill.
**Scope:** product vision, mobile IA, runtime, Convex data model, multi-SDK orchestration, capacity math, costs, evaluation, marketing, refactor checklist, QA gates.
**Supersedes:** `ENGINEER_HANDOFF.md` (v1).

---

## 0. 60-second TL;DR (grill-ready)

- **Product:** NodeBench = durable chat + long-running agent + report-pipeline over **6 report categories** (Entity, People, Location, Event, Product, Jobs) with a **ProseMirror live notebook** the user can edit mid-run. Mobile-first PWA, Vite + Convex.
- **Primary surface:** **Chat.** Everything else (Home, Library, Inbox, Me) supports Chat.
- **Two speeds:** *fast* (live progressive stream, < 3 s first token) and *slow* (background async deep research, 30 s – 10 min, finishes while user lives life).
- **Why it's durable:** Convex reactive queries + ACID mutations over a single multiplexed WebSocket. No separate WS server, no Redis, no custom retry logic.
- **Providers:** every LLM/search SDK (Convex Agent Component, OpenAI, Gemini, Claude, LangChain/LangGraph, OpenRouter, Vercel AI SDK, Linkup) is normalized behind **one server-side adapter** — never imported in the client.
- **Cost math:** a 1 000-request fan-out query ≈ **$25–35** (LLM + search). 10 concurrent users × 1 query each ≈ **$300 burst spike** → provisioned via rate-limited queues + circuit breakers, not raw fan-out.
- **Judge layer:** every run ends in a deterministic 10-gate judge → bounded verdict (`verified / provisionally_verified / needs_review / failed`). No verdict, no "done."

---

## 1. Product vision

### 1.1 Signature dish

> **"Ask anything. We research, stream it live, and save it in a report you can edit, re-ask, and share."**

Not: "agent trust infrastructure," not "context graph flywheel," not "operating intelligence for founders." Those are real internal concepts, but they are the kitchen, not the menu. The menu is one sentence above.

### 1.2 Who it's for

Founders, operators, recruiters, analysts — anyone who needs to **turn messy input into a decision** on the go. On-the-go means **mobile-first, progressive, resumable**.

### 1.3 Promises to the user

1. Type (or paste, or upload) → get a useful answer **immediately** (first token < 3 s).
2. Keep watching as the agent goes deeper (streaming, visible steps).
3. Close the app → come back tomorrow → the report kept working in the background.
4. Edit the notebook while the agent writes (cooperative locks per block).
5. Share to a colleague via a public URL, or export to CSV for CRM.
6. Ask follow-ups that retrieve context across **all** your threads and reports.

---

## 2. Mobile IA + Navigation Spec (v2026-04-21)

### 2.1 Five-tab shell

```
+----------------------------------------------------------------+
|                         [Active Screen]                        |
|                                                                |
|                                                                |
+----------------------------------------------------------------+
|  Home   |  Chat*  |  Library  |  Inbox  |   Me                 |
|   🏠    |   💬    |    📚     |   📬    |   👤                |
+----------------------------------------------------------------+
                     * default landing route
```

| Tab | Purpose | Contents |
|---|---|---|
| **Home** | Lightweight pulse | Daily brief preview, pinned library, recent inbox, quick capture, suggested prompts. **No duplicate chat history.** |
| **Chat** | Primary entry | Composer ("Ask NodeBench"), thread list (`Active / Recent / Needs attention`), new ask, live thread stream. |
| **Library** | Saved work unified | One searchable list. Filters: `All / Files / Companies / People / Markets / Jobs / Notes`. Favorites = toggle state. |
| **Inbox** | Action queue | Tabs: `Action required / Updates / All`. Merges nudges + run completions + connector alerts. |
| **Me** | Profile + account | Profile, Files, Connectors, Credits & plan, Settings, Privacy. |

### 2.2 Chat surface detail

```
┌─────────────────────────────────────────┐
│  ◀   Chat                    +  ⋯        │   ← header
├─────────────────────────────────────────┤
│  [  Ask NodeBench…            ] ➤       │   ← composer (sticky top)
├─────────────────────────────────────────┤
│  ACTIVE (2)                             │
│  ┌───────────────────────────────────┐  │
│  │ 🟢 Anthropic diligence            │  │   ← thread card
│  │ streaming · 3 artifacts · 2 files │  │     (latest run status,
│  │ "found 3 recent funding signals…" │  │      summary, counts)
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ 🟡 GlobalFoundries vs TSMC        │  │
│  │ needs approval · 1 artifact       │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  RECENT (7)                              │
│    ...                                  │
├─────────────────────────────────────────┤
│  NEEDS ATTENTION (1)                    │
│    ...                                  │
└─────────────────────────────────────────┘
```

### 2.3 Thread detail (tabs)

```
┌─────────────────────────────────────────┐
│  ◀   Anthropic diligence     ⋯  share   │
├─────────────────────────────────────────┤
│  [Conversation] [Steps] [Artifacts] [Files]
├─────────────────────────────────────────┤
│   ← active tab content                   │
│                                          │
│   (Conversation default — streams        │
│    scratchpad + final output as it       │
│    grows; agent-touched blocks are       │
│    locked with a subtle pulse.)          │
└─────────────────────────────────────────┘
```

- **Conversation** — the user-facing view. Streams scratchpad → structured output.
- **Steps** — runtime trace, provider budgets, approvals, retries. Hidden by default.
- **Artifacts** — generated memos, tables, maps. Full-screen viewer + export.
- **Files** — uploaded or agent-pulled source files (PDFs, decks, screenshots).

### 2.4 The 16-screenshot mapping (from the Manus recording study)

| # | Manus screen | NodeBench equivalent | What we learn |
|---|---|---|---|
| 1 | Chat entry | `Chat` tab default | Chat IS the app |
| 2 | Prompt with attachment chip | Composer w/ file chip | File is a first-class token |
| 3 | Task execution list (expand) | Steps tab + inline mini-trace | Progressive disclosure — collapsed by default |
| 4 | Artifact chip (link) | Artifact inline card | One tap = full viewer |
| 5 | Document view (Modified) | Notebook viewer | ProseMirror, not Markdown |
| 6 | Document view (Diff) | History panel | Drift + edit audit |
| 7 | Document view (Original) | Source attribution | `sourceRef` per block |
| 8 | Share menu | Share sheet (public/member/private) | Public URL is viral artifact |
| 9 | Three-dot menu | Thread action sheet | Favorite / rename / delete / details |
| 10 | Task details | Run envelope metadata | Credits, created, judge verdict |
| 11 | Files screen (tabs) | Library → Files filter | One unified surface |
| 12 | Home (Manus hub) | Home tab | Daily brief + pinned library |
| 13 | Account | Me → Profile | One screen, no dead ends |
| 14 | Credits | Me → Credits & plan | Live balance + history |
| 15 | Upgrade modal | Pricing modal | $X/mo Pro, enterprise CTA |
| 16 | Notifications | Inbox | Merges nudges + updates |

### 2.5 Transition states (full graph)

```
                   ┌──────────────┐
                   │     Home     │
                   └──┬────────┬──┘
                      │        │
        ┌─────────────┘        └──────────────┐
        ▼                                     ▼
┌──────────────┐        ┌──────────────┐      ┌──────────────┐
│  Composer    │───────▶│ Thread list  │      │   Library    │
│  (new ask)   │        │   (Chat)     │      │ (saved work) │
└──────┬───────┘        └──────┬───────┘      └──────┬───────┘
       │ send                   │ tap                │ tap
       ▼                        ▼                    ▼
┌──────────────────────────────────────┐    ┌──────────────────┐
│         Thread Detail                │    │  Library item    │
│  [Conv] [Steps] [Artifacts] [Files]  │    │    detail        │
└──────┬───────────────┬──────────┬────┘    └─────┬────────────┘
       │ share         │ artifact │ file         │
       ▼               ▼          ▼              ▼
┌────────────┐  ┌────────────┐ ┌────────────┐  ┌──────────────────┐
│Public URL  │  │ Notebook   │ │ File viewer│  │ Entity workspace │
│  viewer    │  │  viewer    │ │            │  │[Brief|NB|Src|Hx] │
└────────────┘  └────────────┘ └────────────┘  └──────────────────┘
```

### 2.6 Critical UX fixes (the "tell me about" bug + source chips)

| Gap | Root cause | Fix |
|---|---|---|
| `"tell me about Anthropic"` → entity = `"tell"` | Regex-first entity extraction before intent classification | **Prompt pre-parser** (deterministic) before model classification. Strip verbs ("tell me about", "show me", "what's up with"), prefer file/URL metadata, then ask LLM. |
| Source chips show single letter, unreadable | Domain favicon only, no label | Render **domain + 12-char label** (e.g. `techcrunch.com • Anthropic Series E`). Min-width 80px, max 220px, truncate middle. |
| Half-screen content on mobile | Desktop sticky-side assumption | Single-column layout below 768px. Side rails become bottom sheets. |
| Hover-only affordances | Desktop-first CSS | Convert to tap-to-reveal; long-press for secondary actions. |
| Running trace shown in default conversation | Missing tab boundary | Move to **Steps** tab; conversation shows only scratchpad + final output. |

---

## 3. Runtime architecture — full ASCII

### 3.1 System topology

```
                           ┌────────────────────────────────────────┐
                           │         Mobile PWA (Vite + React)      │
                           │  ┌──────────────────────────────────┐  │
                           │  │ @convex/react  useQuery/useMut   │  │
                           │  │ ProseMirror  live notebook       │  │
                           │  │ useAction (streaming)            │  │
                           │  └──────────────┬───────────────────┘  │
                           └─────────────────┼──────────────────────┘
                                             │  ONE multiplexed WebSocket
                                             ▼
                ┌─────────────────────────────────────────────────────┐
                │                 Convex Cloud                        │
                │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
                │  │  Queries    │  │  Mutations  │  │  Actions    │  │
                │  │ (reactive,  │  │ (ACID txn)  │  │ (long-run,  │  │
                │  │  cached)    │  │             │  │  no txn)    │  │
                │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
                │         │                │                │         │
                │         ▼                ▼                ▼         │
                │  ┌────────────────────────────────────────────────┐ │
                │  │  ACID Document DB + Full-text + Vectors        │ │
                │  └────────────────────────────────────────────────┘ │
                │                                                     │
                │  ┌────────────────────────────────────────────────┐ │
                │  │  Workpool + Scheduler (background jobs)         │ │
                │  └────────────────────────────────────────────────┘ │
                │                                                     │
                │  ┌────────────────────────────────────────────────┐ │
                │  │  Agent Component  (Convex-native agent runtime)│ │
                │  └────────────────────────────────────────────────┘ │
                └──────────────┬──────────────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌──────────────┐       ┌──────────────┐        ┌──────────────┐
│ Provider     │       │ Search       │        │ External     │
│ Adapter      │       │ Adapter      │        │ Tools        │
│ (one iface)  │       │              │        │              │
│ ┌──────────┐ │       │ ┌──────────┐ │        │ ┌──────────┐ │
│ │ Claude   │ │       │ │ Linkup   │ │        │ │ GitHub   │ │
│ │ OpenAI   │ │       │ │ Tavily   │ │        │ │ LinkedIn │ │
│ │ Gemini   │ │       │ │ Exa      │ │        │ │ Slack    │ │
│ │ OpenRouter│ │      │ │ Google   │ │        │ │ …        │ │
│ │ Vercel AI│ │       │ │  (fallbk)│ │        │ └──────────┘ │
│ │ LangChain│ │       │ └──────────┘ │        └──────────────┘
│ │ LangGraph│ │       └──────────────┘
│ └──────────┘ │
└──────────────┘
```

### 3.2 Fast chat path (< 3 s first token, < 30 s completion)

```
User types "Analyze Anthropic" + taps send
│
│  t=0ms  Client optimistic append ──► ChatThread.latestUser = "…"
│                                     (UI shows message immediately)
│
│  t=30ms Mutation messages.send ────► Convex
│         validate + ACID insert    ┌─►  messages table (transactional)
│                                   └─►  run_envelopes (new run, status=queued)
│
│  t=60ms Subscriber push          ◄── reactive query re-runs, UI updated
│
│  t=80ms Action fastChat ────────────► scheduler.runAfter(0, …)
│         (not in txn, can call LLM)
│
│  t=150ms Provider adapter ─────────► claude-sonnet-4-6 (streaming)
│
│  t=450ms First token ──────────────► mutation appendToken
│                                     (every ~50ms a batch-append mutation
│                                      writes tokens; reactive query pushes)
│
│  t=2800ms Final token + judge gate
│          deterministic 10-gate judge runs synchronously (pure fn)
│          verdict = verified | needs_review | failed
│          run_envelopes.status = 'completed' + verdict
│
│  t=2850ms Reactive query push — UI shows final state + verdict badge
```

Key invariants:
- **Client only calls mutations + queries** (and occasional `useAction` for streams). Never touches providers.
- **Tokens are batched** into ~50 ms append windows to avoid mutation-storm.
- **Judge is deterministic and pure** — no LLM call, no wall-clock. Same telemetry → same verdict.

### 3.3 Slow deep-research path (async, 30 s – 10 min)

```
User taps "Run deep research" or background mode is selected
│
├─ Client ──► mutation research.enqueue(threadId, mode=background)
│             returns { runId } in < 500 ms     ← 202-fast-path
│
├─ Mutation writes run_envelopes (status=queued) + queues a job in workpool
│
└─ Action research.orchestrate  (scheduled, not on request path)
   │
   │  1. Fan-out into 6 sub-agents (one per report category)
   │      each with fresh context, scoped tools, budget envelope
   │
   │       orchestrator
   │          │
   │     ┌────┼─────┬─────┬─────┬─────┬─────┐
   │     ▼    ▼     ▼     ▼     ▼     ▼     ▼
   │   entity people loc  event prod  job  (6 sub-agents)
   │
   │  2. Each sub-agent writes to its OWN scratchpad section (markdown)
   │     via scratchpadAppend mutations → reactive push to UI
   │     (user sees live progress even in background mode)
   │
   │  3. Sub-agent calls web_search (Linkup → Tavily → Google fallback)
   │     + extract (Gemini/Claude structured output)
   │     + writes markdown with sourceRef tags
   │
   │  4. Budget exceeded or confidence reached → sub-agent returns
   │
   │  5. Orchestrator runs structuring pass
   │     (second LLM call reads final scratchpad → emits typed blocks)
   │
   │  6. Attribution merge → entity updates (deterministic, sort-stable)
   │
   │  7. Judge gate → verdict persisted on run_envelopes
   │
   │  8. If background mode: notifications.insert(kind=run_completed)
   │     UI Inbox badge increments via reactive push
```

Fallback chain per sub-agent: 3 retries with exponential backoff + jitter (2s, 6s, 18s). On permanent fail → DLQ (fingerprinted) + surface in run envelope's `failed_blocks` list. **Partial success is first-class** — 5/6 blocks complete → ship the 5, surface the 1.

### 3.4 Report generation pipeline (6 categories)

```
┌──────────────────────────────────────────────────────────────────┐
│                   User query / upload / URL                      │
└─────────────────────────────┬────────────────────────────────────┘
                              ▼
                   ┌─────────────────────┐
                   │  Prompt pre-parser  │  ← strips verbs, extracts URL metadata
                   │  (deterministic)    │
                   └──────────┬──────────┘
                              ▼
                   ┌─────────────────────┐
                   │   Intent classifier │  ← 6 categories + follow-up
                   │      (LLM)          │
                   └──────────┬──────────┘
                              ▼
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
       ┌─────────┐      ┌──────────┐      ┌────────┐
       │ entity  │      │  people  │      │location│
       │ (co)    │      │ (founder)│      │ (market│
       │         │      │          │      │  city) │
       └────┬────┘      └────┬─────┘      └───┬────┘
            │                │                │
       ┌────┴────┐      ┌────┴─────┐      ┌───┴────┐
       │  event  │      │  product │      │  job   │
       │ (news,  │      │ (SKU,    │      │ (role, │
       │  fundr) │      │  SaaS)   │      │  grow) │
       └─────────┘      └──────────┘      └────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Sub-agent per cat.  │   ← orchestrator-workers pattern
                   │ (fresh context,     │
                   │  scoped tools)      │
                   └──────────┬──────────┘
                              ▼
                   ┌─────────────────────┐
                   │   Shared scratchpad │   ← markdown, per-section, mutable
                   │ (Convex table, live │
                   │  stream via query)  │
                   └──────────┬──────────┘
                              ▼
                   ┌─────────────────────┐
                   │  Structuring pass   │   ← second LLM call → typed blocks
                   └──────────┬──────────┘
                              ▼
                   ┌─────────────────────┐
                   │  Deterministic judge│   ← 10-gate, bounded verdict
                   └──────────┬──────────┘
                              ▼
                   ┌─────────────────────┐
                   │  Live notebook      │   ← ProseMirror, block-level lock
                   │  (user can edit     │     while agent writes adjacent blocks
                   │   non-locked blocks)│
                   └─────────────────────┘
```

### 3.5 Live notebook co-editing (agent + human)

```
ProseMirror document = array of nodes, each with { id, authorId, lockedBy? }

Agent writes block B1:
   mutation nb.claimBlock(blockId=B1, runId) → sets lockedBy=runId
   ... agent writes ...
   mutation nb.releaseBlock(blockId=B1) → clears lockedBy

User tries to edit B1:
   Client sees lockedBy != user → UI greys block + subtle pulse
                                 "Agent is writing…"
   User tries to edit B2 (unlocked):
   Client calls mutation nb.updateBlock(B2, content)
   mutation asserts lockedBy == null or lockedBy == userId
                                 (soft-lock, not hard-lock — user can steal
                                  with explicit "Take over" action)

Conflict resolution:
   Both wrote B3 within same second → Convex orders atomically;
   second write wins; first write persisted to history for audit.
```

### 3.6 Cross-thread context retrieval ("ask across all my reports")

```
User: "What have I learned about Anthropic across all my work?"
│
├─ Intent classifier detects scope = cross_thread
│
├─ Query fans into 3 retrieval sources (parallel):
│    1. Per-entity MEMORY.md index + topic files  (glob/grep, size-bounded)
│    2. Vector search over message_embeddings     (top-k=20)
│    3. Structured query on entities table        (exact match + aliases)
│
├─ Results merged → reranker LLM call (small, fast — Haiku or Gemini Flash)
│
├─ Top 10 passages passed to synthesis LLM with sourceRefs
│
└─ Response streamed with inline citations back to this new thread
```

---

## 4. Multi-SDK unification

The user can run **one** of many providers, but the server has **one** agent runtime contract.

### 4.1 Adapter interface

```typescript
// convex/agents/adapter.ts
export interface AgentAdapter {
  name: 'claude' | 'openai' | 'gemini' | 'openrouter' | 'vercel_ai' | 'langchain' | 'langgraph' | 'convex_agent';
  stream(input: AdapterInput): AsyncIterable<AdapterChunk>;
  callTool(toolName: string, args: unknown): Promise<unknown>;
  estimateCost(input: AdapterInput): { inputTokens: number; outputTokens: number; usd: number };
}

interface AdapterInput {
  messages: Message[];
  tools?: ToolDef[];
  budget: { wallMs: number; outTokens: number; toolCalls: number };
  reasoningEffort?: 'low' | 'medium' | 'high';
}

type AdapterChunk =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string; args: unknown; callId: string }
  | { type: 'tool_result'; callId: string; result: unknown }
  | { type: 'done'; usage: Usage };
```

### 4.2 Which SDK does what

| Layer | SDK | Role |
|---|---|---|
| **Runtime** | **Convex Agent Component** | Default. Convex-native, persists state in your DB, no extra infra. |
| **Provider** | Anthropic SDK | Claude Sonnet 4.6 / Opus 4.7 / Haiku 4.5 — primary. |
| **Provider** | OpenAI SDK | GPT-5 family fallback + tool-calling parity. |
| **Provider** | Google Gemini SDK | Gemini 3 Flash — cheap judge + extraction. |
| **Provider** | OpenRouter | Catch-all / experimental models behind one key. |
| **Adapter** | Vercel AI SDK | **Client-side streaming helpers only** when a browser stream is needed; server still routes through Convex. |
| **Graph runtime** | **LangGraph** | Reserved for **complex deterministic graph workflows** (diligence DAGs, compliance pipelines). **Not** the general UI state model. |
| **Composition** | LangChain | Optional tool wrappers where LangChain has a good integration we don't want to rewrite. |
| **Search** | Linkup (primary), Tavily, Exa, Google Grounding | Cascading fallback. |

### 4.3 Prior art we borrow (attribute in every module header)

| Pattern | Source |
|---|---|
| Orchestrator-workers + fresh sub-agent context | Anthropic — *Building Effective Agents* (2024) |
| Scratchpad-first external memory | Manus AI virtual workspace |
| Per-run markdown notes file | Cognition Devin |
| Filesystem-native memory layers | Anthropic Claude Code (`CLAUDE.md`, `MEMORY.md`, topic files) |
| 4-hook always-on judge | Attrition (our sibling product) / Hermes agent primitives |
| Graph-DAG workflows | LangGraph |
| Stream scratchpad + structure later | Deer Flow |
| Self-modifying skills | OpenClaw |

Every borrowed pattern must be cited in the module header comment and the relevant `docs/architecture/<NAME>.md`. See `.claude/rules/reference_attribution.md`.

---

## 5. Convex data model

### 5.1 Schema (core tables only — full schema in `convex/schema.ts`)

```typescript
defineSchema({
  // USERS
  users: defineTable({
    email: v.string(),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_email', ['email']),

  // CHAT THREADS (user-facing)
  chat_threads: defineTable({
    userId: v.id('users'),
    title: v.string(),
    latestSummary: v.string(),
    latestRunStatus: v.union(v.literal('idle'), v.literal('queued'), v.literal('streaming'), v.literal('completed'), v.literal('failed'), v.literal('needs_attention')),
    needsAttention: v.boolean(),
    updatedAt: v.number(),
    artifactCount: v.number(),
    fileCount: v.number(),
  }).index('by_user_updated', ['userId', 'updatedAt']),

  // MESSAGES (conversation)
  messages: defineTable({
    threadId: v.id('chat_threads'),
    runId: v.optional(v.id('run_envelopes')),  // if produced by an agent run
    authorKind: v.union(v.literal('user'), v.literal('agent'), v.literal('system')),
    authorId: v.optional(v.string()),
    body: v.string(),
    attachments: v.optional(v.array(v.id('files'))),
    sourceRefs: v.optional(v.array(v.object({ idx: v.number(), url: v.string(), title: v.string() }))),
    createdAt: v.number(),
  }).index('by_thread_created', ['threadId', 'createdAt']),

  // RUN ENVELOPES (internal durable execution)
  run_envelopes: defineTable({
    threadId: v.id('chat_threads'),
    mode: v.union(v.literal('interactive'), v.literal('background')),
    status: v.union(v.literal('queued'), v.literal('streaming'), v.literal('completed'), v.literal('failed'), v.literal('needs_review')),
    stepSummary: v.string(),
    startedAt: v.number(),
    updatedAt: v.number(),
    requiresAttention: v.boolean(),
    verdict: v.optional(v.union(v.literal('verified'), v.literal('provisionally_verified'), v.literal('needs_review'), v.literal('failed'))),
    gateResults: v.optional(v.array(v.object({ gate: v.string(), pass: v.boolean(), note: v.string() }))),
    costUsd: v.optional(v.number()),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    toolCalls: v.optional(v.number()),
    failedBlocks: v.optional(v.array(v.string())),
  }).index('by_thread', ['threadId']).index('by_status_updated', ['status', 'updatedAt']),

  // SCRATCHPADS (agent working memory, streamed to UI)
  scratchpads: defineTable({
    runId: v.id('run_envelopes'),
    section: v.string(),              // 'entity' | 'people' | 'location' | 'event' | 'product' | 'job' | 'open_questions'
    markdown: v.string(),
    entityVersionAtStart: v.optional(v.number()),
    updatedAt: v.number(),
  }).index('by_run_section', ['runId', 'section']),

  // LIBRARY ITEMS (saved work — unified: files, entities, people, markets, jobs, notes)
  library_items: defineTable({
    userId: v.id('users'),
    itemType: v.union(v.literal('file'), v.literal('company'), v.literal('person'), v.literal('market'), v.literal('event'), v.literal('product'), v.literal('job'), v.literal('note')),
    title: v.string(),
    summary: v.string(),
    favorite: v.boolean(),
    linkedThreadId: v.optional(v.id('chat_threads')),
    canonicalEntityId: v.optional(v.string()),   // stable slug across threads
    updatedAt: v.number(),
  }).index('by_user_type_updated', ['userId', 'itemType', 'updatedAt']).searchIndex('by_title', { searchField: 'title' }),

  // ENTITIES (canonical — accumulated across runs)
  entities: defineTable({
    slug: v.string(),
    kind: v.union(v.literal('company'), v.literal('person'), v.literal('location'), v.literal('event'), v.literal('product'), v.literal('job')),
    version: v.number(),
    aliases: v.array(v.string()),
    blocks: v.any(),                   // typed by kind — schema enforced at mutation layer
    memoryIndex: v.string(),           // MEMORY.md one-liner summaries per topic file
    updatedAt: v.number(),
  }).index('by_slug', ['slug']),

  // ENTITY TOPICS (per-block per-entity accumulation — the topic files)
  entity_topics: defineTable({
    entitySlug: v.string(),
    topic: v.string(),                 // 'funding' | 'hiring' | 'product' | ...
    markdown: v.string(),
    updatedAt: v.number(),
  }).index('by_entity_topic', ['entitySlug', 'topic']),

  // NOTEBOOK BLOCKS (ProseMirror nodes with block-level locks)
  notebook_blocks: defineTable({
    docId: v.string(),                 // one notebook per entity per run, or standalone
    blockId: v.string(),
    parentOrder: v.number(),
    content: v.any(),                  // PM node JSON
    authorKind: v.union(v.literal('user'), v.literal('agent')),
    authorId: v.string(),
    lockedBy: v.optional(v.string()),  // runId or userId
    updatedAt: v.number(),
  }).index('by_doc_order', ['docId', 'parentOrder']),

  // FILES
  files: defineTable({
    userId: v.id('users'),
    threadId: v.optional(v.id('chat_threads')),
    storageId: v.id('_storage'),
    mimeType: v.string(),
    filename: v.string(),
    bytes: v.number(),
    extractedText: v.optional(v.string()),
    embeddingId: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_thread', ['threadId']).index('by_user_created', ['userId', 'createdAt']),

  // INBOX
  inbox_items: defineTable({
    userId: v.id('users'),
    kind: v.union(v.literal('nudge'), v.literal('run_completed'), v.literal('connector_alert'), v.literal('system')),
    priority: v.union(v.literal('high'), v.literal('normal'), v.literal('low')),
    title: v.string(),
    body: v.string(),
    targetRoute: v.string(),
    readState: v.union(v.literal('unread'), v.literal('read'), v.literal('actioned')),
    createdAt: v.number(),
  }).index('by_user_created', ['userId', 'createdAt']),

  // SHARES (public URLs + named-member invites)
  shares: defineTable({
    resourceKind: v.union(v.literal('thread'), v.literal('report'), v.literal('entity'), v.literal('notebook')),
    resourceId: v.string(),
    visibility: v.union(v.literal('public_view'), v.literal('public_edit'), v.literal('member_view'), v.literal('member_edit'), v.literal('private')),
    slug: v.string(),                  // for public URLs
    invitedEmails: v.optional(v.array(v.string())),
    createdBy: v.id('users'),
    createdAt: v.number(),
  }).index('by_slug', ['slug']),

  // EMBEDDINGS (for cross-thread retrieval)
  message_embeddings: defineTable({
    messageId: v.id('messages'),
    threadId: v.id('chat_threads'),
    userId: v.id('users'),
    vector: v.array(v.float64()),      // 384-d HuggingFace or 1536-d OpenAI
  }).vectorIndex('by_vector', { vectorField: 'vector', dimensions: 384, filterFields: ['userId'] }),
});
```

### 5.2 Index discipline

- **Every query** uses an index. No full-table scans. No unbounded `.collect()`.
- **Every query is bounded** (`.take(N)` with N ≤ 200) — see `.claude/rules/agentic_reliability.md` → BOUND.
- **Every write is atomic** and runs inside the mutation's automatic transaction.

---

## 6. Capacity + cost math (grill-ready)

### 6.1 Request anatomy

A single user query can fan out into:

| Layer | Typical | Heavy (1 query × 1000 req) |
|---|---|---|
| LLM calls (agent runtime) | 5–20 | 400–700 |
| Search API calls (Linkup + fallbacks) | 3–10 | 200–400 |
| Extraction LLM (Gemini Flash) | 5–20 | 100–200 |
| Convex mutations (tokens, state) | 50–200 | 2 000–5 000 |
| Convex queries (reactive) | 20–100 | 200–500 |

### 6.2 Per-query cost model (conservative, Apr 2026 prices)

| Component | Unit cost | Typical query | Heavy query (1000-req) |
|---|---|---|---|
| Claude Sonnet 4.6 in/out | $3/M in, $15/M out | 5k in, 15k out = **$0.24** | 500k in, 1.5M out = **$24** |
| Gemini 3 Flash Lite (judge/extract) | $0.10/M in, $0.40/M out | 20k in, 30k out = **$0.015** | 1M in, 1.5M out = **$0.70** |
| Linkup search | ~$0.007/call | 10 calls = **$0.07** | 400 calls = **$2.80** |
| Convex function calls | $2/M beyond free tier | 200 calls = negligible | 5 000 calls = **$0.01** |
| Convex bandwidth | $0.20/GB | ~1 MB = **$0.0002** | ~50 MB = **$0.01** |
| **TOTAL per query** | | **~$0.33** | **~$27.50** |

### 6.3 Concurrency model — 10 users × 1 heavy query each

```
Burst: 10 × $27.50 = ~$275 over 5–10 minutes
│
├─ LLM concurrency: ~10 × 700 = 7 000 calls over 10 min
│  = ~12 calls/sec across all providers
│  ✓ Well under Anthropic default Tier-2 rate (1000 RPM = 16 /sec)
│  ✓ Spread across Claude + OpenAI + Gemini via adapter round-robin
│
├─ Linkup: ~10 × 400 = 4 000 calls over 10 min = 6.7/sec
│  → Buy higher tier or add Tavily cascade (both configured)
│
├─ Convex function calls: ~10 × 5 000 = 50 000 over 10 min
│  = 83/sec burst. Convex handles this natively.
│
└─ WebSocket connections: 10 concurrent
   Convex multiplexes everything over one WS per client.
   No connection-pool exhaustion scenario.
```

### 6.4 Horizontal scaling — how Convex gets us there for free

- **Queries are globally cacheable.** Two users asking the same public thread → one DB read.
- **Mutations are serialized per-table-partition**, not global. A hot thread is single-writer; the rest of the DB is unaffected.
- **Actions run in a separate pool** from mutations. A 10-min LLM call doesn't starve fast-path mutations.
- **Workpool** (Convex built-in) queues background jobs with per-queue concurrency limits.

When we outgrow Convex's included capacity, **horizontal scaling = upgrade the Convex plan**. No re-architecture. For LLM/search scale, we add provider keys + quotas in the adapter.

### 6.5 Monthly cost projection

| Scenario | Queries/user/day | Users | Cost/mo (LLM+search) | Convex | Total |
|---|---|---|---|---|---|
| Private alpha | 10 light + 1 heavy | 20 | $0.33·10·20·30 + $27.50·1·20·30 = **$18.5k** | $25 | ~$18.5k |
| Launch | 5 light + 0.3 heavy | 500 | $0.33·5·500·30 + $27.50·0.3·500·30 = **$148k** | $250 | ~$148k |
| Scale | same | 5 000 | ~$1.48M | $2.5k | ~$1.48M |

**Mitigations:**
1. **Aggressive caching** of entity blocks — re-query the same entity within 24h returns the accumulated topic files + a diff-only refresh (80% cost reduction).
2. **Heavy queries are opt-in** (Pro plan). Free tier = 10 light queries/day.
3. **Judge rejects low-evidence fan-outs early** — saves tokens.
4. **Structuring pass uses Gemini Flash Lite** — 30× cheaper than Sonnet.

---

## 7. Evaluation + judge pipeline

Every run passes through the same 10-gate judge regardless of fast/slow. The judge is deterministic (pure function) and produces one of 4 bounded verdicts.

### 7.1 The 10 gates (order is stable — dashboards depend on it)

```
1.  hasValidTier              — run tier ∈ {fast, deep, cross_thread}
2.  hasStableScratchpadRunId  — scratchpad.runId matches envelope
3.  hasMonotonicVersion       — entity version increased or stable
4.  hasHeader                 — output has title + tier + summary
5.  tierMatchesBodyProse      — tier word count within expected range
6.  latencyWithinBudget       — wallMs < budget (default 30s fast, 10min deep)
7.  reportsToolCalls          — tool call count persisted
8.  reportsTokenCounts        — tokens in/out persisted
9.  capturedSources           — at least N sourceRefs per claim
10. emitStatusIsTerminal      — final status ∈ {completed, failed, needs_review}
```

### 7.2 Verdict derivation (bounded enum)

```
verified                 ← 0 failures, ≤ 2 skipped
provisionally_verified   ← 0 failures, > 2 skipped
needs_review             ← 1–2 failures
failed                   ← 3+ failures
```

### 7.3 Fast vs slow vs streaming evaluation

| Pipeline | Primary eval | Judge trigger | User sees |
|---|---|---|---|
| Fast chat | Time-to-first-token, judge verdict, user-accept rate | on `done` chunk | Verdict badge inline |
| Slow research | Block-level success rate, failed-block list, cost vs budget | on orchestrator finish | Verdict + partial-success UI |
| Streaming | Drift detection (scratchpad vs entity version), token throughput | continuous on scratchpad writes | Live "writing…" pulse + warning if drift |

Every verdict writes to `run_envelopes.verdict` and feeds the `/telemetry` dashboard. See `.claude/rules/pipeline_operational_standard.md`.

---

## 8. Marketing plan (guerilla + serve-to-feedback)

### 8.1 Channels (all simultaneously)

| Channel | Tactic | Success metric |
|---|---|---|
| **Hacker News** | Show HN for `claude mcp add nodebench` one-liner | 200+ comments, front page |
| **Reddit** (r/LocalLLaMA, r/ClaudeAI, r/Entrepreneur) | "Here's what I built to stop re-researching the same founders" | 3 organic posts / week |
| **Twitter / X** | Thread: "I researched 50 companies in one afternoon with [tool]. Here's what I learned." + public URLs | 5 threads / week |
| **LinkedIn** | Daily post from harness (already automated). Show competing explanations + evidence checklists | 2 posts / day |
| **ProductHunt** | Launch with shareable public-URL demos as the artifact | Top 5 of day |
| **Discord / Slack communities** | Share public URL answers in VC / operator Slacks | 1 share / day in 5 communities |
| **YouTube Shorts / TikTok** | 30-sec "watch this AI research Anthropic live" screen recordings | 3 shorts / week |
| **MCP Registry** | List as `nodebench` — one-line install | Front-page registry |

### 8.2 Serve to get feedback

Every public-URL share has a `Rate this report` CTA at the bottom: 👍 / 👎 / 📝 inline comment. Comments go straight into our own inbox (dogfood). Goal: **100 user-submitted feedback entries in first 30 days**.

### 8.3 Chat = primary demo

Every marketing asset drives to `Chat`. Demo video = 30 seconds of chatting. No landing page explainer slideshow — the product itself is the pitch.

### 8.4 Report export for CRM workflow

Every report exports to:
- **Public URL** (instant share)
- **Markdown** (copy-paste to Notion)
- **CSV** (per-category columns — see §8.5)
- **PDF** (print stylesheet)

### 8.5 CSV column contract (per category)

| Category | Columns |
|---|---|
| Entity/Company | slug, name, stage, founded, hq_city, hq_country, website, last_funding_date, last_funding_usd, total_raised_usd, employees_count, latest_signal, signal_url, verified_at |
| People | slug, name, current_role, current_company, linkedin_url, twitter_url, github_url, location, past_companies, verified_at |
| Location | slug, city, region, country, population, timezone, notable_companies, market_notes, verified_at |
| Event | slug, kind (fundraise/launch/layoff), date, entities_involved, amount_usd, source_url, verdict, verified_at |
| Product | slug, name, vendor, category, launch_date, pricing_model, website, competitors, verified_at |
| Jobs | slug, role, company, location, remote, salary_low, salary_high, posted_date, url, role_seniority, verified_at |

---

## 9. Refactor checklist (gaps → fixes)

| # | Gap | Priority | Fix |
|---|---|---|---|
| 1 | `"tell me about X"` classifies entity as `"tell"` | P0 | Prompt pre-parser strips verbs before classifier. Test with 50 canonical prompts. |
| 2 | Source chips single-letter, unreadable | P0 | Domain + label chip, min 80px width. |
| 3 | Half-screen content on mobile | P0 | Single-column below 768px. Kill side rails on mobile. |
| 4 | Runtime trace polluting default conversation | P0 | Move to `Steps` tab; collapsed by default. |
| 5 | No block-level locking in notebook | P1 | Implement `lockedBy` + soft-lock UI. |
| 6 | Background run doesn't notify on completion | P1 | Wire `inbox_items.insert` + reactive badge. |
| 7 | No partial-success UI | P1 | Surface `failedBlocks` + "retry this block" CTA. |
| 8 | Provider adapter not centralized | P1 | Extract to `convex/agents/adapter.ts`. One iface, 7 implementations. |
| 9 | CSV export missing | P1 | Implement per-category exporters + download endpoint. |
| 10 | `Reports` surface confusingly named | P1 | Rename to `Library`. Redirect old URLs. |
| 11 | `Nudges` wording confusing | P1 | Rename to `Inbox`. |
| 12 | Runs as top-level tab label | P1 | Remove. Runs live inside threads. |
| 13 | Entity workspace desktop-only layout | P2 | Mobile tabs: `Brief / Notebook / Sources / History`. |
| 14 | No cross-thread context retrieval | P2 | Implement §3.6 pipeline. |
| 15 | Judge gates not surfaced in UI | P2 | Show gate breakdown above raw trace. |
| 16 | Docs bloat (122 files at repo root → already consolidated) | ✓ | Done; keep monitoring. |

---

## 10. Setup from scratch (new engineer, day 1)

```bash
# 1. Clone
git clone https://github.com/HomenShum/nodebench-ai.git
cd nodebench-ai

# 2. Install
npm install

# 3. Convex login + deploy
npx convex dev --configure   # creates deployment, prompts for login
# writes CONVEX_URL + CONVEX_DEPLOY_KEY to .env.local

# 4. Set provider keys (at minimum Claude + Linkup)
cat >> .env.local <<'EOF'
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_GENAI_API_KEY=...
LINKUP_API_KEY=...
EOF

# 5. Seed Convex env vars
npx convex env set ANTHROPIC_API_KEY sk-ant-...
npx convex env set LINKUP_API_KEY ...
# (one per provider)

# 6. Verification floor — everything must pass
npx convex codegen
npx tsc --noEmit
npm run test:run
npm run build

# 7. Start dev
npm run dev                   # Vite at :5173
# Convex dev already running from step 3 in another terminal

# 8. Open browser → http://localhost:5173
#    Default route = /chat (mobile-first)
#    Type "tell me about Anthropic" → should NOT classify entity as "tell"

# 9. Read these rules FIRST (don't just skim):
#    .claude/rules/orchestrator_workers.md
#    .claude/rules/scratchpad_first.md
#    .claude/rules/async_reliability.md
#    .claude/rules/feedback_security.md
#    .claude/rules/pipeline_operational_standard.md
#    .claude/rules/live_dom_verification.md
#    .claude/rules/agentic_reliability.md
```

### 10.1 Folder map (what lives where)

```
nodebench-ai/
├── src/                          ← Vite React client (mobile-first PWA)
│   ├── features/
│   │   ├── chat/                 ← ChatList, ThreadDetail, Composer
│   │   ├── library/              ← Library list + filters
│   │   ├── inbox/                ← Inbox tabs
│   │   ├── me/                   ← Profile, credits, settings
│   │   ├── entities/             ← Entity workspace
│   │   └── notebook/             ← ProseMirror editor
│   ├── shared/ui/                ← Design system primitives
│   └── lib/
│       ├── registry/             ← Route registry, view map
│       └── analytics.ts
├── convex/
│   ├── schema.ts                 ← THE schema (§5.1)
│   ├── agents/
│   │   ├── adapter.ts            ← Provider adapter interface
│   │   ├── claude.ts, openai.ts, gemini.ts, openrouter.ts, langgraph.ts
│   │   └── orchestrator.ts       ← orchestrator-workers pattern
│   ├── domains/
│   │   ├── product/              ← threads, runs, shares, library
│   │   ├── narrative/            ← linkedin auto-posting
│   │   ├── social/               ← public URL rendering
│   │   └── diligence/            ← entity accumulation, topic files
│   └── workflows/                ← Scheduled jobs
├── server/                       ← WebSocket MCP gateway (for MCP clients)
│   ├── mcpGateway.ts
│   ├── mcpAuth.ts
│   └── mcpSession.ts
├── packages/
│   ├── mcp-local/                ← Local MCP server (Claude Code / Cursor)
│   └── mcp-client/               ← Typed client SDK
├── scripts/
│   ├── verify-live.ts            ← Tier-A live-DOM verifier
│   └── release.js
├── tests/
│   ├── e2e/live-smoke.spec.ts    ← Tier-B hydrated DOM
│   └── L1/L2/L3-*.spec.ts        ← Tiered eval harness
└── docs/
    ├── architecture/             ← Canonical patterns (cite these in code)
    └── chat-logs-unified/        ← This folder
```

---

## 11. QA + shipping gates

```
Layer 1  Build gate          ├── npx tsc --noEmit        (0 errors)
                             └── npm run build           (clean)

Layer 2  Test gate           └── npm run test:run        (0 failures)

Layer 3  Visual surface      ├── Home, Chat, Library, Inbox, Me all render
                             └── No console errors on any surface

Layer 4  Agent panel         └── Demo conversations + real backend both work

Layer 5  Content freshness   └── grep for TODO/FIXME/"Coming soon"/old dates

Layer 6  A11y                └── Focus rings, reduced-motion, contrast

Layer 7  Bundle              └── No chunks > 500KB raw

Layer 8  Live browser        ├── Dark + light mode
                             └── Stagger animations smooth

Layer 9  Backend integration └── Convex reads actual data (not demo fallback)

Layer 10 WS gateway          └── GET /health 200, /mcp/health session count

Layer 11 Auth flow           └── Guest + auth both work, no blank screens

Layer 12 Cross-browser       └── Safari/Firefox spot-check

Layer 13 Regression          └── Known fragile areas (see pre_release_review.md)

Layer 14 Live-DOM (Tier A)   └── npx tsx scripts/verify-live.ts  (LIVE OK)

Layer 15 Live-DOM (Tier B)   └── npm run live-smoke             (Playwright)
```

**None of these are optional.** See `.claude/rules/pre_release_review.md` + `live_dom_verification.md`.

Release cadence:
- **Phase 1:** Mobile shell + 5-tab nav + redirects
- **Phase 2:** Chat list + thread detail + internal run wiring
- **Phase 3:** Unified Library + mobile entity/file surfaces
- **Phase 4:** Inbox merge + Me/account/plan
- **Phase 5:** Provider adapter cleanup + regression hardening

---

## 12. Board memo — v2026-04-21

**Traction (since 4/10):**
- Massive mobile IA refactor: 5-tab shell (`Home / Chat / Library / Inbox / Me`), Chat as primary landing, Library unifying files + entities + packets + jobs.
- Named-member invites shipped end-to-end for entity workspaces; anonymous → authed bootstrap bug fixed.
- `PublicFounderProfileView` + `PublicProductProfileView` added alongside existing `PublicCompanyProfileView`.
- Async / background report mode: 202 + runId < 500 ms, reactive progress push, 6-category fan-out.
- Scratchpad-first pipeline live; agents write markdown first, structure second.
- Provider adapter normalized (Claude / OpenAI / Gemini / OpenRouter / LangChain / LangGraph / Vercel AI / Convex Agent Component).
- ProseMirror live notebook with block-level locking so user can edit alongside agent.
- Docs consolidated: 122 root `.md` → `docs/{architecture,completions,…}`; old work archived under `docs/archive/2026-q1/`.
- Type-error sweep: ~289 strict-mode TS errors cleaned across `src/`.

**Sibling product — Attrition (`attrition.sh`):**
- Domain bought. Rust 12-crate workspace. Python SDK (7 provider wrappers) + `attrition-cli` in progress.
- Positioning: *"Your agent says it's done too early. We catch what it missed."*
- Dogfooded on NodeBench's own pipeline as the always-on judge layer.

**Next 2 weeks:**
1. Fix `"tell me about"` entity misclassification + source-chip readability (P0).
2. Finish partial-success UI + failed-block retry.
3. Ship CSV export per category.
4. Public-URL demos for Show HN / ProductHunt launch.
5. Publish Attrition Python SDK to PyPI + `attrition-cli` to crates.io.

**Asks:**
- Linkup enterprise tier negotiation (cost scaling).
- Convex Pro plan upgrade (anticipated by week 2 of launch).
- Design reviewer for mobile visual QA (one engineering hire — senior IC, strong on mobile + data-dense UI).

**Risk register:**
- LLM cost spike on heavy queries (mitigated by caching + judge early-reject).
- Rate-limits under bursty load (mitigated by adapter round-robin across providers).
- Judge variance on evaluation (mitigated: judge is deterministic by design, no LLM in the gate).

---

## 13. Grill-ready FAQ

**Q: What's your response time?**
A: First token < 3 s for fast chat. Background research 30 s – 10 min depending on depth. User sees streaming scratchpad within 500 ms of submit.

**Q: How is it so fast?**
A: Three things. (1) Convex reactive push over one multiplexed WebSocket — no API round-trip per update. (2) Provider adapter streams tokens into batched 50 ms mutation windows. (3) Deterministic 10-gate judge runs as a pure function — no LLM, no wall-clock.

**Q: What if I submit a query that fans out to 1 000 requests?**
A: Orchestrator enforces a budget envelope per sub-agent (wall-ms, out-tokens, tool-calls). Budget-exceed = force-terminate with partial output preserved. User sees partial-success UI, not hang.

**Q: 10 users × 1 000-req each — can you handle it?**
A: ~83 Convex function calls/sec burst — handled natively. ~12 LLM calls/sec across providers — under Anthropic Tier-2 limit. ~7 Linkup calls/sec — Tier-3 plan handles it with Tavily cascade. Cost ~$275/burst spike — provisioned via per-user quota.

**Q: How do you simplify the architecture without losing properties?**
A: Convex collapses 5 services (WS server, queue, DB, cache, scheduler) into one. Provider adapter collapses 7 SDKs into one interface. The only external dependencies are LLM providers + search providers — everything else is Convex-native.

**Q: Why durable?**
A: Every mutation is ACID. Client auto-retries on connection loss. Background runs survive server restart (workpool). Notebook edits have block-level locking. Judge verdict is persisted atomically with the run.

**Q: How do you stop hallucination?**
A: 4-layer grounding pipeline (see `.claude/rules/grounded_eval.md`): retrieval confidence threshold → claim-level `isGrounded()` filter → grounded judge with metadata → `sourceIdx` citation chain per block. Structural checks are deterministic; LLM judge only judges semantic quality.

**Q: How do you evaluate?**
A: 100+ query eval corpus across 18 categories, Gemini 3 Flash Lite as judge. Structural pass rate + Gemini pass rate per run; trend tracked at `/?surface=telemetry`. Corpus grows monotonically — never remove failing queries, fix the pipeline.

**Q: What's your moat?**
A: (1) Operating-memory accumulation per entity across all user sessions — gets better with use. (2) Open-source + MIT + one-line install = distribution. (3) Dogfood loop with Attrition as the judge layer. (4) Canonical entity-context layer that agents everywhere can call via MCP.

**Q: Why 6 categories?**
A: They're the decision-critical units of founder/operator workflow: who (people) + what (entity + product) + where (location) + when (event) + what-to-hire (jobs). Every other concept decomposes into these.

**Q: What would kill you?**
A: (1) LLM-provider price war making us subsidize agentic fan-out unsustainably. (2) Anthropic or OpenAI shipping a native MCP-hosted clone. (3) Regulatory disclosure requirements on automated diligence.

**Q: What's not done?**
A: Honest list in §9. Biggest items: CSV export, partial-success UI, Attrition SDK publish, cross-thread retrieval UI polish.

---

## 14. Where to dig deeper

| Topic | Source |
|---|---|
| Architecture patterns | `.claude/rules/*.md` (11 rules) |
| Product positioning | `docs/architecture/PRODUCT_POSITIONING.md` |
| Master strategy | `docs/architecture/NODEBENCH_MASTER_STRATEGY_PRD.md` |
| Viral adoption research | `docs/architecture/VIRAL_ADOPTION_RESEARCH.md` |
| Async reliability spec | `docs/architecture/ASYNC_RELIABILITY.md` |
| Three chat-log source files | `docs/chat-logs-unified/session{1,2,3}_*.md` |
| Full master unified log | `docs/chat-logs-unified/UNIFIED_MASTER.md` |
| Prior handoff (v1, narrative) | `docs/chat-logs-unified/ENGINEER_HANDOFF.md` |
