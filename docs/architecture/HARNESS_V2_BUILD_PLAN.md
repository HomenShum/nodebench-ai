# NodeBench Harness v2 — Build Plan

This document translates the Harness v2 docs into a concrete implementation
plan grounded in the current codebase.

Read these first:

- [HARNESS_V2_ONE_PAGER.md](./HARNESS_V2_ONE_PAGER.md)
- [HARNESS_V2_PROPOSAL.md](./HARNESS_V2_PROPOSAL.md)

This build plan answers:

```text
what do we build first
what files own it today
what user behavior does it unlock
what should wait until later
```

## Build Principle

Do not implement Harness v2 as isolated architecture features.

Build it as vertical slices across:

```text
Home -> Chat -> Reports -> Nudges -> Me
```

The main rule is:

```text
one chat run should reliably become:
  answer packet
  -> saved report
  -> tracked object
  -> useful nudge
  -> better next run
```

If a change does not improve that loop, it is probably not phase-1 work.

The second rule is:

```text
do not collapse useful work into one opaque summary blob
```

Both product users and internal builders need controllable recall and
granularity.

In practice that means the saved artifact should support this ladder:

```text
summary
  -> section
  -> source
  -> trace
```

Plain English:

- a stakeholder should be able to read the short version first
- then open the exact section that matters
- then inspect the supporting sources in an organized way
- then, if needed, inspect execution detail without drowning in it

If the product only preserves the final answer, handoff quality drops and
feature iteration gets slower.

The third rule is:

```text
build advisor mode in from the start
```

NodeBench should route dynamically instead of using the deepest reasoning lane
for every run.

Practical meaning:

- fast executive lane for routine work
- deeper advisor lane for ambiguous, high-stakes, or cross-cutting work
- explicit user or operator override when the router does not escalate on its
  own

This is a product behavior decision as much as a model-routing decision:

- normal runs stay fast and affordable
- hard runs still have a path to better reasoning
- the user keeps control when they want a deeper pass

## Production Patterns Worth Copying

These are not abstract inspirations. They are production patterns already used
in shipped systems that solve the same underlying problem:

```text
how do you preserve one answer
without losing the user's ability to inspect, verify, and reuse it?
```

### 1. Deep-linked citations and source previews

Production pattern:

- Glean shows inline citations, hover previews, and deep-linked source context.
- Citations do not just say "here are some sources." They let the user inspect
  the exact supporting passage.

Official sources:

- [Glean citations](https://docs.glean.com/user-guide/assistant/glean-chat/glean-chat-citations/glean-citations)
- [Glean deep-linked citations](https://docs.glean.com/user-guide/assistant/glean-chat/glean-chat-citations/deep-linked-citations)

What NodeBench should copy:

- make the report drill-down path:
  - `summary -> section -> source preview -> original source`
- preserve enough source metadata for each saved report section to support
  section-level deep dives
- do not force users to scan one flat source list to verify one claim

### 2. Granularity chosen at ingest, not guessed later

Production pattern:

- Anthropic citations support plain text documents and custom content documents.
- The important design choice is that citation granularity is determined by how
  content is structured before the answer is generated.
- OpenAI file search also exposes chunking controls and optional raw search
  results in addition to annotations.

Official sources:

- [Anthropic citations](https://platform.claude.com/docs/en/build-with-claude/citations)
- [Anthropic citations announcement](https://claude.com/blog/introducing-citations-api)
- [OpenAI file search](https://developers.openai.com/api/docs/guides/tools-file-search)
- [OpenAI retrieval](https://developers.openai.com/api/docs/guides/retrieval)

What NodeBench should copy:

- pick the unit of recall deliberately:
  - report summary
  - report section
  - source excerpt
  - trace step
- if Phase 1 needs one schema change, prefer `sourceRefIds[]` on saved report
  sections before adding broad new fields
- keep builder-facing retrieval detail available without forcing it into the
  stakeholder-facing answer

### 3. Permission-aware evidence drill-down

Production pattern:

- Glean citations never grant new access. The citation layer respects the same
  permission boundaries as the underlying source systems.

Official sources:

- [Glean AI Answers](https://docs.glean.com/user-guide/assistant/ai-answers)
- [Glean citations](https://docs.glean.com/user-guide/assistant/glean-chat/glean-chat-citations/glean-citations)

What NodeBench should copy:

- treat drill-down access as first-class, not an afterthought
- a source preview should not imply that the user can open the original item if
  they do not have permission
- keep source visibility and source access logically separate in the data model

### 4. Structured evidence beside narrative

Production pattern:

- Elicit does not stop at prose. It supports cited reports, paper exploration,
  citation trails, and table-like evidence workflows.
- The point is not "be academic." The point is that evidence stays inspectable
  and organized while the narrative stays readable.

Official sources:

- [Elicit citing and methodology](https://support.elicit.com/en/articles/549697)
- [Elicit Paper Chat](https://support.elicit.com/en/articles/1467969)
- [Elicit columns and filtering](https://support.elicit.com/en/articles/1045313)
- [Elicit 200 paper reports](https://support.elicit.com/en/articles/10424385)

What NodeBench should copy:

- keep reports readable first
- keep evidence explorable second
- do not merge those two needs into one flat blob
- let a stakeholder consume the summary while still giving an engineer or power
  user a clean path into the underlying evidence structure

### 5. Clean answer by default, raw detail on demand

Production pattern:

- OpenAI separates answer text from annotations and optional raw tool results.
- This is the right shape for products that need both clarity and debuggability.

Official sources:

- [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search)
- [OpenAI file search](https://developers.openai.com/api/docs/guides/tools-file-search)

What NodeBench should copy:

- keep the top-level report clean
- keep source refs, trace detail, and retrieval detail available underneath
- support at least three viewing modes over the same saved artifact:
  - stakeholder read
  - operator refresh
  - builder deep dive

Plain English takeaway:

```text
the production pattern is not "save more memory"
the production pattern is "save one artifact at multiple useful depths"
```

## What Already Exists

The current codebase already has more of the loop than the docs alone suggest.

### Chat already persists more than raw text

Current owner:

- [convex/domains/product/chat.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/chat.ts)

Existing behavior already implemented:

- `startSession`
  - creates `productInputBundles`
  - creates `productChatSessions`
  - creates `productChatEvents`
  - creates `productReportDrafts`
  - links uploaded files into the session
- `recordToolStart`
  - persists tool execution start events
- `recordToolDone`
  - persists tool execution completion events
- `completeSession`
  - derives report sections from the packet
  - normalizes sources
  - creates a `productReports` row
  - creates or updates the canonical entity
  - links evidence to the report
  - updates the chat session
  - inserts a chat milestone event
  - creates an initial report nudge

Plain English:

```text
Chat already auto-saves a report and already creates a nudge.
```

That matters because Harness v2 is not starting from zero. The loop already
exists in weak form.

### Home, Reports, Nudges, and Me already exist as separate user surfaces

Current UI owners:

- [src/features/home/views/HomeLanding.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/home/views/HomeLanding.tsx)
- [src/features/chat/views/ChatHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/chat/views/ChatHome.tsx)
- [src/features/reports/views/ReportsHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/reports/views/ReportsHome.tsx)
- [src/features/nudges/views/NudgesHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/nudges/views/NudgesHome.tsx)
- [src/features/me/views/MeHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/me/views/MeHome.tsx)

Current Convex owners:

- [convex/domains/product/home.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/home.ts)
- [convex/domains/product/chat.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/chat.ts)
- [convex/domains/product/reports.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/reports.ts)
- [convex/domains/product/nudges.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/nudges.ts)
- [convex/domains/product/me.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/me.ts)
- [convex/domains/product/entities.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/entities.ts)
- [convex/domains/product/shell.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/shell.ts)

### The harness already has partial v2 structure

Current owners:

- [server/agentHarness.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/agentHarness.ts)
- [server/harnessRuntime.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/harnessRuntime.ts)
- [server/pipeline/searchPipeline.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/pipeline/searchPipeline.ts)
- [server/routes/search.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/routes/search.ts)

Important current reality:

- `generatePlan` already supports:
  - `stepIndex`
  - `groupId`
  - multi-step dependency arrays
  - injected prior results
  - steering flags
  - recalled memory applied to plans
- `executeHarness` already supports:
  - step start / step done events
  - step model attribution
  - token estimation
  - cost estimation
  - context injection into later steps
  - steering payloads for eligible steps

Plain English:

```text
the runtime has already started moving toward v2
but the product behavior is still not fully shaped around it
```

## The Real Gap

The biggest remaining gap is not "build the harness from scratch."

The biggest gap is:

```text
make the existing artifact loop clearer
then add operator context and anticipatory behavior on top of it
```

More specifically:

```text
the current loop is still too coarse
```

NodeBench already saves reports, entities, and nudges. What it does not yet
preserve well enough is controllable depth.

Today the product is reasonably good at:

- giving an answer
- saving a report
- attaching sources at the report level

It is weaker at:

- showing which section came from which source
- letting the user drill from a report into the exact evidence that supports it
- letting a builder inspect and tweak the feature without replaying the whole run
- making handoff feel structured instead of conversational-only

That is why Phase 1 is not just "save more objects." It is also:

```text
save the right level of detail
and make it explorable in the product
```

That means the build order should be:

1. strengthen the current `Chat -> Reports -> Nudges` loop
2. add `Me -> next run` operator context
3. finish the harness-runtime improvements that make the loop faster and clearer
4. add anticipatory prep mode
5. add permissioned transcript ingestion and style guardrails

## Phase 1 — Stabilize The Artifact Loop

Goal:

```text
every successful chat run should reliably become a strong saved report
that can trigger a meaningful nudge
```

### 1A. Harden answer-packet-to-report promotion

Current ownership:

- [convex/domains/product/chat.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/chat.ts)
- [src/features/chat/views/ChatHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/chat/views/ChatHome.tsx)
- [src/features/reports/views/ReportsHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/reports/views/ReportsHome.tsx)

Build tasks:

- make the report candidate fields explicit in the packet-to-report path
- ensure every successful run persists:
  - summary
  - normalized sections
  - source refs
  - extracted entity
  - next actions
  - open questions or uncertainty
- add stronger null-safe normalization for packet fields before report insert
- ensure the saved report object is always enough to reopen without re-deriving
  the whole run

User-visible unlock:

- the user trusts that a good chat run becomes a reusable report every time

Success criteria:

- `completeSession` always creates a report for successful runs
- report detail can render without needing the original SSE stream
- reports consistently include sections, summary, and source metadata

### 1B. Make report refresh and reopen first-class

Current ownership:

- [convex/domains/product/reports.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/reports.ts)
- [src/features/reports/views/ReportsHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/reports/views/ReportsHome.tsx)
- [src/features/entities/views/EntityPage.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/entities/views/EntityPage.tsx)

Build tasks:

- keep `ReportsHome` as the browse surface and make `EntityPage` the real report-detail and refresh surface
- make `requestRefresh` part of the entity workspace instead of a passive mutation
- ensure report reopen routes back into `Chat` with:
  - original query
  - entity slug
  - lens
  - refresh intent
- show more report state directly in the entity workspace:
  - why it matters
  - what changed
  - what is missing
  - what to do next

User-visible unlock:

- `Reports` feels like living memory, not archive storage

Success criteria:

- report cards reopen into meaningful work, not generic navigation
- refresh flow routes into a contextual chat run

### 1C. Make nudges come from actual report state

Current ownership:

- [convex/domains/product/nudges.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/nudges.ts)
- [src/features/nudges/views/NudgesHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/nudges/views/NudgesHome.tsx)

Current reality:

- `completeSession` already creates a `refresh_recommended` nudge
- `checkReportsForNudges` already creates nudges for stale reports

Build tasks:

- expand nudge types beyond time-based staleness
- create nudges from:
  - follow-up tasks
  - tracked claims
  - tracked entities
  - prep-brief readiness
- tighten action targets so nudges reopen exactly the right report or chat
- make suggested actions derive from actual open objects instead of static defaults

User-visible unlock:

- `Nudges` becomes a real return loop instead of a mostly generic reminder feed

Success criteria:

- every open nudge has a clear source object
- every nudge returns the user into either a report or a contextual chat run
- example placeholder nudges shrink as live nudges become real

### Phase 1 execution checklist

This is the concrete build order for Phase 1, grounded in the current codebase.

Important constraint:

```text
do not start Phase 1 by expanding schema aggressively
```

The current `productReports` shape already has:

- `summary`
- `sections`
- `sources`
- `entitySlug`
- `query`
- `lens`

That is enough to stabilize the artifact loop first. Add new top-level report
fields only if the existing `sections` contract proves too lossy.

Important nuance:

```text
section-level recall is probably the first schema addition that is worth it
```

Right now `productReportSectionValidator` only preserves:

- `id`
- `title`
- `body`
- `status`

If Phase 1 needs one early schema extension, the best candidate is:

- `sourceRefIds` on each saved section

That is the smallest useful change that improves deep dives, builder debugging,
and stakeholder handoff at the same time.

#### Slice 1. Canonicalize the report object at session completion

Primary files:

- [convex/domains/product/chat.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/chat.ts)
- [convex/domains/product/schema.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/schema.ts)

Checklist:

- [ ] Extract a single canonical report-building helper inside `chat.ts` so `completeSession` stops deriving summary, sections, and sources inline.
- [ ] Keep `deriveSectionsFromPacket` and `normalizeSources`, but harden them against sparse packets:
  - `answer`
  - `answerBlocks`
  - `changes`
  - `variables`
  - `risks`
  - `nextQuestions`
  - `recommendedNextAction`
- [ ] Make `completeSession` build one normalized `reportPayload` object before `ctx.db.insert("productReports", ...)`.
- [ ] Ensure `reportPayload` always contains enough data to reopen the report without the original SSE stream:
  - `title`
  - `summary`
  - `sections`
  - `sources`
  - `query`
  - `lens`
  - `entitySlug`
- [ ] If the saved sections are still too lossy, extend `productReportSectionValidator` with `sourceRefIds` before adding broader report fields.
- [ ] Treat `sourceRefs` dedupe as a report concern, not only a `productSourceEvents` concern, so repeated sources do not leak into saved reports.
- [ ] Keep `productReports` schema unchanged for the first pass unless a missing field truly cannot be reconstructed from `sections`.
- [ ] Return a stronger completion payload from `completeSession`:
  - `reportId`
  - `entitySlug`
  - `sessionId`
  - `nudgeId` when one is created

Done when:

- [ ] Every successful `completeSession` call yields one saved report with a usable `summary`, four stable sections, and non-empty `entitySlug` when an entity can be inferred.
- [ ] A saved section can be traced back to its supporting sources without reopening the original stream or guessing from the full report source list.
- [ ] Reloading the app and opening the saved entity page still shows the latest report without relying on transient stream state.

#### Slice 2. Make the entity workspace the real report detail surface

Primary files:

- [src/features/reports/views/ReportsHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/reports/views/ReportsHome.tsx)
- [src/features/entities/views/EntityPage.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/entities/views/EntityPage.tsx)
- [convex/domains/product/reports.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/reports.ts)
- [convex/domains/product/entities.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/entities.ts)

Checklist:

- [ ] Leave `ReportsHome` as an entity/report browser. Do not force detail behavior into the grid page.
- [ ] Use `EntityPage` as the canonical reopen surface for saved reports, because the route already resolves the latest report, timeline, evidence, and notes for an entity.
- [ ] Add an explicit refresh action on `EntityPage` that calls `requestRefresh`.
- [ ] Make `requestRefresh` return enough routing context for Chat:
  - `query`
  - `lens`
  - `reportId`
  - `entitySlug` if available
- [ ] Make the refresh CTA navigate back into Chat with an explicit refresh prompt instead of a generic search string.
- [ ] Keep the existing `Reopen in Chat` button on `EntityPage`, but make its prompt deterministic from the latest report:
  - refresh path: `Update {entity.name} and show me what changed.`
  - follow-up path: original `report.query`
- [ ] Ensure the entity workspace clearly renders:
  - latest revision
  - delta summary
  - latest sources
  - next step
- [ ] Render the report as progressive disclosure instead of one flat block:
  - top summary first
  - sections second
  - supporting sources per section
  - trace only when the user wants more detail
- [ ] Keep the source deep dive organized:
  - group evidence under the section it supports
  - keep report-level source browsing available
  - avoid forcing the user to hunt through one large unordered source list

Done when:

- [ ] Clicking a card in `ReportsHome` leads to an entity page that can reopen the latest report in Chat without user re-explanation.
- [ ] Refreshing from the entity page queues a refresh record and routes into a contextual Chat run instead of a blank composer.
- [ ] A stakeholder can skim the report, expand the exact section they care about, and inspect the supporting sources in a clean order.
- [ ] An engineer can use the same saved artifact to understand what to tweak without replaying the original live run.

#### Slice 3. Make nudge actions point to real report and entity objects

Primary files:

- [convex/domains/product/chat.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/chat.ts)
- [convex/domains/product/nudges.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/nudges.ts)
- [src/features/nudges/views/NudgesHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/nudges/views/NudgesHome.tsx)

Checklist:

- [ ] When `completeSession` creates the initial `refresh_recommended` nudge, include both:
  - `linkedReportId`
  - `linkedChatSessionId`
- [ ] Prefer `entitySlug` for `actionTargetId` when the nudge is meant to reopen a saved report surface.
- [ ] Reserve `actionTargetSurface: "chat"` for cases where the best next move is genuinely a live follow-up run.
- [ ] Update `checkReportsForNudges` so stale-report nudges also point to the correct entity workspace when an entity exists.
- [ ] Replace generic fallback text in `NudgesHome.getSurfacePath` with route decisions based on actual nudge metadata:
  - entity-targeted report nudge -> `/entity/:slug`
  - refresh nudge -> entity page or contextual chat with refresh intent
  - follow-up draft nudge -> chat with the right prompt
- [ ] Shrink example nudges once live nudges are consistently available.

Done when:

- [ ] A nudge always opens the correct object instead of synthesizing a generic query from the title.
- [ ] `NudgesHome` can distinguish `open the saved report` from `start a new contextual Chat run`.

#### Slice 4. Tighten the Chat completion loop

Primary files:

- [src/features/chat/views/ChatHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/chat/views/ChatHome.tsx)
- [convex/domains/product/chat.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/chat.ts)

Checklist:

- [ ] Keep `ChatHome` responsible for session lifecycle:
  - `startSession`
  - `recordToolStart`
  - `recordToolDone`
  - `completeSession`
- [ ] Ensure the `onComplete` branch only stores identifiers returned from `completeSession`; do not re-derive entity navigation client-side if the backend already knows it.
- [ ] Keep `savedReportId` and `savedEntitySlug` as the main post-run routing handles.
- [ ] Make the post-run action bar use those canonical handles consistently:
  - `Save to workspace`
  - `Open full report`
  - `Share link`
- [ ] Add one explicit post-run message for the user when a report and nudge were both created.

Done when:

- [ ] A user can run Chat, wait for completion, open the entity workspace, and then return into Chat from that workspace without losing context.

#### Slice 5. Add the first targeted tests for the product loop

Primary files:

- [src/features/chat/views/ChatHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/chat/views/ChatHome.tsx)
- [src/features/nudges/views/NudgesHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/nudges/views/NudgesHome.tsx)
- [src/features/entities/views/EntityPage.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/entities/views/EntityPage.tsx)
- [convex/domains/product/chat.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/chat.ts)
- [convex/domains/product/nudges.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/nudges.ts)

Checklist:

- [ ] Add a focused unit test around report normalization in `chat.ts`.
- [ ] Add a UI test proving `NudgesHome` routes entity/report nudges correctly.
- [ ] Add a UI test proving `EntityPage` builds the right Chat reopen path from the latest report.
- [ ] Keep the first test lane narrow. Do not wait for a full product test suite before shipping Phase 1.

Minimum verification loop for this slice:

```text
1. Run one successful Chat session
2. Confirm `productReports` gets a saved row
3. Confirm `productEntities.latestReportId` points at it
4. Confirm a nudge is created with a real target
5. Open the entity page
6. Confirm one section can be drilled into with organized supporting sources
7. Reopen in Chat from that page
8. Confirm the next run starts with the right query and lens
```

## Phase 2 — Add Operator Context Through Me

Goal:

```text
future runs should start with useful context, not from scratch
```

### 2A. Create minimal operator-context v1

Current ownership:

- [convex/domains/product/me.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/me.ts)
- [src/features/me/views/MeHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/me/views/MeHome.tsx)

Current reality:

- `Me` already stores:
  - background summary
  - preferred lens
  - files
  - context items
- this is not yet a full typed operator-context layer

Build tasks:

- extend the profile and/or context model to include:
  - preferred lens
  - evidence standards
  - recurring stakeholders
  - escalation style
  - tone constraints
  - workflow revision timestamp
- make these inspectable and editable in `Me`
- surface confidence / freshness lightly instead of overbuilding admin UI

User-visible unlock:

- the user sees what the system knows and can correct it

Success criteria:

- `Me` can answer:
  - what does the system know about me?
  - what is it using in the next run?
  - what can I correct or reset?

### 2B. Feed operator context into Home and Chat

Current ownership:

- [src/features/home/views/HomeLanding.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/home/views/HomeLanding.tsx)
- [src/features/chat/views/ChatHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/chat/views/ChatHome.tsx)
- [server/routes/search.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/routes/search.ts)
- [server/pipeline/searchPipeline.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/pipeline/searchPipeline.ts)

Build tasks:

- on new runs, bundle a minimal operator context into the search request path
- add visible context chips in Chat:
  - using saved context
  - using your files
  - using your preferred lens
- keep Home lightweight; do not turn it into a setup wizard
- add light elicitation only when helpful, such as:
  - is this for speed or depth?
  - is this for founder, investor, or recruiter use?

User-visible unlock:

- answers feel more aligned without requiring the user to restate everything

Success criteria:

- the next run behaves differently when operator context exists
- Chat exposes when context is being used

## Phase 3 — Finish The Harness Runtime Upgrade

Goal:

```text
the system should feel faster, clearer, and more steerable while running
```

This phase maps directly onto the runtime work already partially present in:

- [server/agentHarness.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/agentHarness.ts)
- [server/harnessRuntime.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/harnessRuntime.ts)
- [server/routes/search.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/routes/search.ts)

### 3A. Normalize plan shape everywhere

Build tasks:

- ensure all fallback and generated plans use the same v2-enriched fields
- remove mixed old/new assumptions in downstream renderers
- make `stepIndex`, `groupId`, `dependsOn[]`, and `injectPriorResults[]`
  consistent
- add dynamic-routing metadata to the run or plan context:
  - `routingMode: executive | advisor`
  - escalation reason
  - escalation source: automatic or user-forced

User-visible unlock:

- step progress is clearer
- grouped work feels intentional instead of opaque

### 3B. Enrich SSE and UI stage mapping

Current UI owner:

- [src/features/chat/views/ChatHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/chat/views/ChatHome.tsx)

Build tasks:

- expose plan/start/done/steering events with richer metadata
- use the richer step events to improve partial rendering and activity summaries
- ensure traces are useful without dominating the answer
- show whether the run stayed in the fast executive lane or escalated into the
  advisor lane

User-visible unlock:

- the app feels faster because meaningful progress appears earlier
- the app feels more trustworthy because users can see what happened

### 3C. Add mid-run steering safely

Current code seams:

- [server/agentHarness.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/agentHarness.ts)
- [server/harnessRuntime.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/harnessRuntime.ts)

Build tasks:

- implement a session steering queue
- allow mid-run context only on steering-capable steps
- render steering acknowledgement in the UI
- add a steering action that explicitly requests deeper reasoning instead of
  only changing factual context

User-visible unlock:

- the user can say "actually compare this differently" or add late context
  without losing the run
- the user can also say "go deeper" when the default executive path is not
  enough

### 3D. Implement advisor mode (NodeBench's opusplan-like split)

Closest external precedent:

- Claude Code `opusplan`:
  - stronger planning model during plan mode
  - cheaper model during execution
  Source: [Claude Code model config](https://code.claude.com/docs/en/model-config)
- OpenAI's closest official analogue is configurable reasoning effort rather
  than an explicit planner/executor split.
  Source: [OpenAI reasoning](https://developers.openai.com/api/docs/guides/reasoning)

Primary files:

- [server/harnessRuntime.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/harnessRuntime.ts)
- [server/agentHarness.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/agentHarness.ts)
- [server/routes/search.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/routes/search.ts)
- [src/features/chat/views/ChatHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/chat/views/ChatHome.tsx)

Exact implementation contract:

```text
EXECUTIVE LANE
  default path
  - routine retrieval
  - straightforward synthesis
  - refresh runs
  - low to medium reasoning effort

ADVISOR LANE
  selective path
  - complex planning
  - ambiguous synthesis
  - conflicting evidence
  - user-forced deeper pass
  - medium to high reasoning effort
```

Add these runtime fields:

```typescript
type RoutingMode = "executive" | "advisor";

interface RoutingMetadata {
  routingMode: RoutingMode;
  routingReason:
    | "default_fast_path"
    | "plan_proposal"
    | "high_ambiguity"
    | "evidence_conflict"
    | "high_stakes"
    | "user_forced_deeper_pass"
    | "recovery_after_failure";
  routingSource: "automatic" | "user_forced" | "operator_policy";
  plannerModel: string;
  executionModel: string;
  reasoningEffort?: "low" | "medium" | "high";
}
```

Checklist:

- [ ] Add a routing decision helper in `server/harnessRuntime.ts`.
- [ ] Make the helper consume:
  - classification type
  - entity count
  - user steering state
  - evidence conflict signals
  - whether the run is a plan/proposal request
- [ ] Route `plan_proposal` to advisor mode by default.
- [ ] Route straightforward `company_search` and refresh-style runs to executive mode by default.
- [ ] Allow escalation to advisor mode after plan failure or low-confidence retrieval.
- [ ] Persist routing metadata on the run result and trace path.
- [ ] Emit routing metadata in the `plan` SSE event.
- [ ] Expose routing mode in Chat as a visible chip or label:
  - `Fast path`
  - `Deep reasoning`
- [ ] Add a user-visible action to force escalation:
  - `Go deeper`

Verification:

- [ ] Unit test route selection:
  - simple query -> executive
  - `plan_proposal` -> advisor
  - explicit `go deeper` -> advisor
  - post-failure recovery escalation -> advisor
- [ ] Integration test `server/routes/search.ts` plan event includes routing metadata.
- [ ] UI test `ChatHome` shows the routing state.
- [ ] UI test user-forced deeper pass changes the next run to advisor mode.

Evaluation:

Run the same benchmark set through four lanes:

```text
A. executive only
B. advisor always
C. dynamic advisor mode
D. dynamic advisor mode + user-forced override
```

Track:

- quality score
- source coverage
- section completeness
- latency
- token cost
- escalation rate
- false positive escalation rate
- false negative escalation rate
- user-forced rescue rate

Success condition:

```text
dynamic advisor mode should stay close to advisor-always quality on hard tasks
while clearly beating it on routine-task cost and latency
```

## Phase 4 — Add Anticipatory Prep Mode

Goal:

```text
NodeBench should help before important interactions, not only after a question
```

Primary owners:

- [server/agentHarness.ts](/d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/agentHarness.ts)
- [src/features/chat/views/ChatHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/chat/views/ChatHome.tsx)
- [src/features/reports/views/ReportsHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/reports/views/ReportsHome.tsx)
- [src/features/nudges/views/NudgesHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/nudges/views/NudgesHome.tsx)

Build tasks:

- add a prep-oriented classification and packet mode
- create a `prep brief` artifact shape with:
  - likely questions
  - likely objections
  - important facts
  - risks
  - suggested opening and next moves
- let reports generate prep-brief candidates
- let nudges return "your prep brief is ready"

User-visible unlock:

- the product becomes anticipatory, not only reactive

Success criteria:

- a user can say `Prep me for tomorrow's call with X`
- the result can be saved, reopened, and nudged later

## Phase 5 — Add Permissioned Learning

Goal:

```text
the system should learn from use without becoming noisy or creepy
```

### 5A. Permissioned transcript ingestion

Primary owners:

- [src/features/me/views/MeHome.tsx](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/me/views/MeHome.tsx)
- [convex/domains/product/me.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/product/me.ts)

Build tasks:

- support NodeBench-native history ingestion first
- then support optional external transcript ingestion
  - Claude Code JSONL
  - future MCP-side logs
- permission UI must live in `Me`
- imported material should update operator context, not just become a dump

User-visible unlock:

- less repetition over time
- the product can learn recurring decisions and habits

### 5B. Style-drift guardrails

Primary owners:

- profile and context layer in `Me`
- final response shaping in the runtime

Build tasks:

- separate decision memory from voice memory
- keep style learning opt-in
- add negative preferences
- add style reset
- add simple anti-jargon / anti-sycophancy output checks

User-visible unlock:

- the product becomes more personal without turning into bloated corporate tone

## Phase 6 — Distillation And Optimization

Goal:

```text
compress useful successful runs into reusable system leverage
```

This is later work.

Primary owners:

- [server/agentHarness.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/agentHarness.ts)
- future skill extraction and trace distillation modules from the proposal

Build tasks:

- extract reusable tool-chain templates from successful runs
- export quality-filtered traces
- feed attrition / optimization pipelines

User-visible unlock:

- indirect only at first
- lower cost
- faster repeat workflows
- more consistent execution over time

## Recommended Build Order

Do these in this order:

1. strengthen `Chat -> Reports`
2. strengthen `Reports -> Nudges`
3. add minimal operator context in `Me`
4. feed operator context into `Home` and `Chat`
5. finish harness v2 runtime normalization and SSE enrichment
6. add mid-run steering
7. add prep mode
8. add permissioned transcript ingestion
9. add style-drift guardrails
10. add skill extraction and distillation

## What Not To Build First

Do not start with:

- giant transcript import systems
- full skill extraction
- distillation exports
- broad model-training pipelines
- deep admin tooling for memory before user-visible value exists

Those are downstream optimizations.

The phase-1 question is simpler:

```text
can one chat run reliably become a strong report,
which can trigger a useful nudge,
and make the next run better?
```

If not, keep building there.

## Verification Gates After Each Phase

Minimum gates:

```text
npx tsc --noEmit
npm run build
```

Targeted test lanes by area:

- harness runtime:
  - `npx vitest run server/agentHarness.test.ts server/harnessRuntime.test.ts server/searchRoute.test.ts`
- product surfaces:
  - add or extend focused tests for `ChatHome`, `ReportsHome`, `NudgesHome`, and `MeHome`
- live product verification:
  - browser-check `Home -> Chat -> Reports -> Nudges -> Me`
  - verify one real compounding run end to end

## Suggested Immediate Next Slice

If building starts now, the best next slice is:

```text
Take a successful Chat run
  -> normalize the report object in `completeSession`
  -> route the saved result through `EntityPage`
  -> make `requestRefresh` and nudge actions point to that same entity workspace
  -> make Chat reopen from that workspace with the right query and lens
```

That slice proves the core artifact loop before deeper memory and optimization
work lands, and it does it using the surfaces that already exist.
