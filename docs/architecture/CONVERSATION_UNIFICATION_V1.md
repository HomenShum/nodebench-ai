# Conversation Unification V1

**Date:** 2026-04-20  
**Status:** Proposed implementation spec  
**Scope:** `ChatHome` + `FastAgentPanel` + product entity/report persistence

## Goal

Unify conversational runtime and history without losing the current product properties:

- immediate useful answer for on-the-go chat
- durable revisit on the same entity/report later
- clear separation between owned notebook content and agent working memory
- provenance, tool trace, and source trace
- background deepening after the first answer

This spec does **not** collapse notebook content, scratchpads, and projections into one substrate. It simplifies the conversation/runtime layer around them.

## Current Split

Today the repo has two different conversation roots:

### Product conversation root

- `domains/product/chat.startSession` in [convex/domains/product/chat.ts](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/chat.ts:80)
- `domains/product/chat.completeSession` in [convex/domains/product/chat.ts](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/chat.ts:289)
- `productChatSessions` in [convex/domains/product/schema.ts](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/schema.ts:208)
- `productReports` in [convex/domains/product/schema.ts](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/schema.ts:528)
- `productEntities` in [convex/domains/product/schema.ts](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/schema.ts:312)

This path already saves a durable report, updates the entity shell, syncs projections, and schedules scratchpad projection work.

### Fast agent conversation root

- `domains/agents/fastAgentPanelStreaming.createThread` in [convex/domains/agents/fastAgentPanelStreaming.ts](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/agents/fastAgentPanelStreaming.ts:1556)
- `domains/agents/fastAgentPanelStreaming.getThreadMessagesWithStreaming` in [convex/domains/agents/fastAgentPanelStreaming.ts](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/agents/fastAgentPanelStreaming.ts:2004)
- `domains/agents/fastAgentPanelStreaming.initiateAsyncStreaming` in [convex/domains/agents/fastAgentPanelStreaming.ts](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/agents/fastAgentPanelStreaming.ts:2160)
- `chatThreadsStream` / `chatMessagesStream` in [convex/schema.ts](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/schema.ts:1170)

This path owns a separate thread/history world and separate stream transport.

### Surface owners

- `ChatHome` is the destination research surface in [src/features/chat/views/ChatHome.tsx](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/chat/views/ChatHome.tsx:1)
- `FastAgentPanel` is the in-context sidecar in [src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx:1)
- The repo already concluded "keep both, share the engines" in [docs/architecture/CHAT_VS_FAST_AGENT_AUDIT.md](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/CHAT_VS_FAST_AGENT_AUDIT.md:77)

## Decision

`productChatSessions` becomes the **only canonical conversation root** for entity research chat.

That means:

- Chat history identity lives in `productChatSessions`
- report promotion lives in `completeSession`
- entity revisit lives off `productEntities` + `productReports`
- sidecars and destination surfaces are just different UIs over the same session/run

`chatThreadsStream` and `chatMessagesStream` become:

- temporary transport infrastructure during migration, or
- removable after cutover if product conversation streaming no longer depends on them

They stop being treated as the durable user-facing source of truth.

## Canonical Model

Keep these tables and meanings:

### Canonical

- `productEntities`
  - fast entity shell
  - latest summary
  - latest report pointer
- `productChatSessions`
  - conversation/run identity
  - status
  - routing
  - latest summary
  - linked report
- `productChatEvents`
  - session timeline
- `productToolEvents`
  - tool-level trace
- `productSourceEvents`
  - source trace
- `productReports`
  - immutable saved artifact for a completed run
- `productBlocks`
  - owned notebook content
- `diligenceScratchpads`
  - raw agent working memory
- `diligenceProjections`
  - structured overlay bridge

### Derived

- report landing cards
- notebook/report read views
- session artifacts panel
- right-rail scratchpad and flow views

### Transitional / Deprecated

- `chatThreadsStream`
- `chatMessagesStream`
- `domains/agents/fastAgentPanelStreaming.listThreads`
- `domains/agents/fastAgentPanelStreaming.createThread`
- `domains/agents/fastAgentPanelStreaming.getThreadByStreamId`
- `domains/agents/fastAgentPanelStreaming.getThreadMessagesWithStreaming`
- `domains/agents/fastAgentPanelStreaming.initiateAsyncStreaming`

These APIs may remain during migration, but they are no longer the target model for entity research chat.

## Runtime Rule

One runtime, two policies:

- `fast`
  - resolve entity
  - read `productEntities.summary`
  - read latest `productReports`
  - read latest `diligenceProjections`
  - answer immediately if existing knowledge is sufficient
- `deep`
  - stream search/tool work
  - structure results
  - promote into report/entity/projection state
  - continue in background if needed

## Target Flow

```text
user prompt
  -> resolve/open entity shell
  -> create or resume productChatSession
  -> hydrate from productEntities + latest report + projections
  -> return first useful answer
  -> run deeper streaming/search only if needed
  -> completeSession promotes to productReports
  -> entity page and report page read same durable artifact later
```

## API Plan

### Keep and promote

- `domains/product/chat.startSession`
- `domains/product/chat.recordToolStart`
- `domains/product/chat.recordToolDone`
- `domains/product/chat.completeSession`
- `domains/product/chat.getSession` in [convex/domains/product/chat.ts](/D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/chat.ts:580)
- `domains/product/entities.listEntities`
- `domains/product/entities.getEntityWorkspace`
- `domains/product/blocks.getEntityNotebook`
- `domains/product/diligenceScratchpads.getLatestForEntity`
- `domains/product/diligenceProjections.materializeForEntity`

### Add

These are the minimum APIs needed to make `productChatSessions` the full conversation source for both surfaces:

- `domains/product/chat.listSessions`
  - list recent sessions by `ownerKey`
  - support destination and sidecar history
- `domains/product/chat.getSessionMessages`
  - normalized view over `productChatEvents` for shared conversation rendering
- `domains/product/chat.cancelSession`
  - optional, if streaming execution supports cancellation

### Transitional adapters

If the current FastAgentPanel stream transport is reused short-term, add adapters instead of keeping two durable roots:

- `domains/product/chat.ensureStreamingTransport(sessionId)`
- `domains/product/chat.streamSession(sessionId, prompt, opts)`
- `domains/product/chat.getStreamingView(sessionId)`

The key rule: any transport thread must point back to a `productChatSession`, never become the root identity.

## UI Ownership After Cutover

### ChatHome

Responsibilities:

- destination reading UX
- composer
- session creation/resume
- source and answer rendering
- share / open report

Non-responsibilities:

- owning its own session model

### FastAgentPanel

Responsibilities:

- in-context invocation from anywhere
- compact conversation UX
- trace / telemetry / scratchpad / flow tabs
- session resume in a sidecar context

Non-responsibilities:

- owning a separate durable thread universe

## Migration PRs

## PR 1: Shared Conversation Engine

**Goal:** create one front-end runtime contract without changing final persistence.

### Add

- `src/features/chat/hooks/useConversationEngine.ts`
  - wraps session lifecycle
  - exposes `startOrResumeSession`
  - exposes streaming state
  - exposes milestones
  - exposes persistence state
- shared normalized message/event shape for both surfaces

### Refactor

- `src/features/chat/views/ChatHome.tsx`
- `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx`

### Keep for now

- existing FastAgentPanel streaming transport
- existing `useStreamingSearch`

### Acceptance

- ChatHome still works end to end
- FastAgentPanel can boot through shared engine APIs
- no user-facing thread migration yet

## PR 2: Product Session History Becomes Canonical

**Goal:** move conversation history identity to `productChatSessions`.

### Add

- `domains/product/chat.listSessions`
- `domains/product/chat.getSessionMessages`

### Refactor

- replace FastAgentPanel thread list source with `productChatSessions`
- make sidecar reopen existing `productChatSession`
- make ChatHome and FastAgentPanel share conversation history

### File ownership

- backend: `convex/domains/product/chat.ts`
- panel history UI: `src/features/agents/components/FastAgentPanel/FastAgentPanel.ThreadList.tsx`
- panel state/context: `src/features/agents/context/FastAgentContext.tsx`
- destination view: `src/features/chat/views/ChatHome.tsx`

### Acceptance

- a conversation started in ChatHome appears in FastAgentPanel history
- a conversation started from FastAgentPanel can be reopened in ChatHome
- no separate user-visible concept of "chat thread" vs "product session"

## PR 3: Demote Stream Threads to Transport

**Goal:** make `chatThreadsStream` and `chatMessagesStream` non-canonical.

### Add

- explicit mapping from any transport thread to `productChatSession`
- adapter layer if transport threads remain temporarily required

### Refactor

- `src/features/agents/components/ConvexJarvisHUD.tsx`
- `convex/domains/agents/fastAgentPanelStreaming.ts`

### Remove from product semantics

- thread list as a source of truth
- report/share/open flows keyed by `chatThreadsStream`
- any feature that treats agent thread id as the durable user conversation id

### Acceptance

- sidecar streaming still functions
- all durable artifacts, history, and reopen flows key off `productChatSessions`
- `chatThreadsStream` can be deleted later with a bounded migration

## Deprecation Matrix

| Surface/API | Status after V1 | Notes |
|---|---|---|
| `domains/product/chat.startSession` | Canonical | Keep |
| `domains/product/chat.completeSession` | Canonical | Keep |
| `domains/product/chat.getSession` | Canonical | Keep |
| `domains/product/chat.listSessions` | Canonical | Add |
| `domains/agents/fastAgentPanelStreaming.listThreads` | Deprecated | Replace with product session list |
| `domains/agents/fastAgentPanelStreaming.createThread` | Transitional | Transport only if still needed |
| `domains/agents/fastAgentPanelStreaming.getThreadByStreamId` | Deprecated | Replace with session resume / transport adapter |
| `domains/agents/fastAgentPanelStreaming.getThreadMessagesWithStreaming` | Transitional | Streaming adapter only |
| `domains/agents/fastAgentPanelStreaming.initiateAsyncStreaming` | Transitional | Must be session-backed, not thread-rooted |
| `chatThreadsStream` | Transitional storage | Remove after cutover |
| `chatMessagesStream` | Transitional storage | Remove after cutover |

## What Must Not Change

These are non-negotiable properties:

- `completeSession` remains the promotion boundary into report/entity state
- `productBlocks` remains owned notebook content
- scratchpad stays out of notebook prose by default
- projections remain the bridge from agent runtime to notebook/report UI
- entity page remains a view over durable product state, not chat-local ephemeral state

## Fast Answer Strategy

The first useful answer should come from existing product state in this order:

1. `productEntities.summary`
2. latest linked `productReports`
3. latest `diligenceProjections`
4. notebook/report retrieval
5. external search and deeper streaming

This is the latency strategy that makes on-the-go chat feel immediate without weakening the durability model.

## Acceptance Metrics

Use existing milestone telemetry and add explicit cutover checks:

- `first_partial_answer_ms`
- `first_source_ms`
- `report_saved_rate`
- `return_to_report_rate`
- `cross_surface_resume_rate`
  - a session started in one surface successfully resumed in the other

## Rollback Rule

If shared conversation identity causes regressions:

- keep `productChatSessions` canonical
- allow FastAgentPanel to continue using legacy transport adapters
- do **not** roll back to dual durable roots

The rollback target is "legacy transport, canonical product session", not "two conversation systems forever."

## Short Version

The simplification is:

- one durable conversation root: `productChatSessions`
- one promotion path: `completeSession`
- one entity/report substrate: `productEntities` + `productReports` + notebook state
- one shared conversation engine for ChatHome and FastAgentPanel

The things we do **not** simplify away are the ones that preserve trust:

- owned blocks
- scratchpad working memory
- structured projections
