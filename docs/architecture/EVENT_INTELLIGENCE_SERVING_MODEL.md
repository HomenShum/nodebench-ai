# Event Intelligence Serving Model

NodeBench event serving is the event-specific version of the shared search
gateway:

```text
Capture at event
-> use event corpus first
-> extract entities and claims
-> attach to active event session
-> spend only when deeper diligence is justified
```

The product should feel like one agent capability, not a provider picker.
Search is a memory-building operation with a budget: every useful result should
become reusable source memory, entity memory, claim memory, or workspace memory.

## Serving Model

NodeBench serves three event moments:

| Moment | Job | Default cost posture |
| --- | --- | --- |
| Before event | Build the event corpus from public event material and prior memory | Batch once, cache aggressively |
| During event | Capture messy notes, voice, screenshots, and follow-ups | Event corpus first, no paid search |
| After event | Convert captures into reports, cards, sources, notebook, and follow-ups | Workspace run, paid only by policy |

The event product is:

```text
Event corpus + live capture + post-event intelligence workspace
```

It is not a generic people-search scrape and not a raw note-taking tool.

## Memory Layers

Keep these layers separate:

| Layer | Meaning | Sharing default |
| --- | --- | --- |
| Shared event corpus | Public event page, speakers, sponsors, companies, sessions, public sources | Shared for the event |
| Private captures | Notes, voice memos, screenshots, conversations, follow-ups | Private by default |
| Team or org memory | Fund/company/team reports, watchlists, relationship context | Tenant-scoped |
| Event aggregate insights | Trends across attendees or teams | Opt-in or anonymized only |

This separation lets NodeBench serve many attendees without burning live search
on every capture or leaking private field notes.

## Before The Event

Build an `EventCorpus` from:

- event page, such as Luma, conference site, or demo day page
- agenda and session pages
- speaker, sponsor, and company lists
- known attendees only when available and permitted
- public company and person profiles
- prior NodeBench reports and team memory
- cached source documents and entity cards

The resulting corpus should contain:

```text
Event
|-- Companies
|-- People
|-- Products
|-- Sponsors
|-- Sessions
|-- Topics
|-- Public sources
`-- Prior internal memory
```

## During The Event

The composer stays mode-free:

```text
Ask, capture, paste, upload, or record...
```

Runtime flow:

```text
voice memo / text / screenshot
-> captureRouter
-> scenario classifier
-> active event corpus
-> entity and claim extraction
-> active event session attachment
-> budget policy
-> optional live search
-> ack + next action
```

Most event captures should not run paid search. They should attach to the active
event session, extract entities and field-note claims, then queue enrichment
only when the user asks for deeper diligence.

Example ack:

```text
Saved to Ship Demo Day
Detected 1 person | 1 company | 2 claims | 1 follow-up
Using event corpus | 0 paid calls
```

## After The Event

The event report opens in `nodebench.workspace` as durable intelligence:

```text
Event Workspace
|-- Brief      who you met, strongest companies, repeated themes, next actions
|-- Cards      company, person, product, and theme cards
|-- Notebook   raw notes, cleaned notes, transcripts, screenshot OCR
|-- Sources    field notes, public evidence, confidence, verification status
|-- Chat       follow-up questions and deeper refreshes
`-- Map        graph view, later default
```

Event capture can start in mobile or web. Serious synthesis happens in
Workspace.

## Budget Policy

Default policy table:

| Scenario | Policy |
| --- | --- |
| At-event note capture | Event corpus first, no paid search, persist private capture |
| Open person card | Event corpus plus cached public profile, no paid search unless user asks |
| Open company card | Event corpus plus prior memory plus source cache |
| Is this company worth following up with? | Allow free refresh, maybe queue a workspace run |
| Investment-grade diligence | Admin or fund approval required for paid/deep search |
| Anonymous event guest | Public event corpus only, strict quota, no paid search |
| Internal member | Tenant memory first, paid only by workspace policy |
| Admin or research lead | Can approve deep refreshes |

User-facing status must be product-level:

```text
Using event corpus
Using team memory
Checking public sources
Deep refresh queued
Paid refresh requires approval
Saved to Ship Demo Day
```

Do not expose provider names such as Brave, Serper, Tavily, or Linkup in normal
product copy.

## Shared Contracts

The first implementation slice adds shared TypeScript contracts in
`shared/eventIntelligence.ts`:

- `EventCorpus`
- `EventSession`
- `EventCapture`
- `EventWorkspace`
- `EventSearchPolicy`
- `EventServingStatus`

It also adds deterministic helpers:

- `getDefaultEventSearchPolicy(actorType, scenario)`
- `buildEventServingStatus(policy, cacheState)`
- `formatEventCaptureAck(result)`

These contracts are intentionally not Convex tables yet. They define the product
contract before the storage implementation.

## Surface Mapping

| Surface | Event responsibility |
| --- | --- |
| Home | Active event snapshot and recent signals |
| Chat | Universal ask/capture composer |
| Reports | Event reports as reusable memory |
| Inbox | Captures, unassigned notes, needs confirmation, nudges, alerts |
| Me | Evidence mode, search budget, event capture privacy, integrations |
| Workspace | Brief, Cards, Notebook, Sources, Chat, Map |
| MCP/CLI | Batch import, event corpus build, scheduled refreshes |

## Acceptance Criteria

- Event captures route to `active_event_session` when event context is detected.
- At-event captures default to no paid search.
- Investment-grade diligence requires approval before paid/deep search.
- Status copy uses product-level labels and hides provider names.
- Event reports open as Workspace workspaces, not as a sixth app tab.
- Private captures remain private unless team sharing or anonymized aggregation
  is explicitly chosen.
