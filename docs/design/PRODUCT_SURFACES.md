# NodeBench Product Surfaces

This is the canonical surface map for the current product split. The refreshed
design-system bundle in `docs/design/nodebench-ai-design-system/` must follow
the same model: no top-level Nudges tab, and no Workspace tab inside the
operating app.

## Product Line

> Web is where you start. Mobile is where you capture. CLI/MCP is where agents
> integrate. Workspace is where research becomes reusable intelligence.

## Surface Split

```text
nodebenchai.com                  (the operating app: five tabs)
|-- Home                         start quickly, daily pulse
|-- Reports                      reusable memory, report grid
|-- Chat                         ask and generate new work
|-- Inbox                        captures, nudges, unassigned, automations, alerts
`-- Me                           preferences, context, files, credits

nodebench.workspace              (deep-work surface, separately deployed)
`-- Deep workspaces opened from Chat / Reports / Inbox
    |-- Brief                    executive summary
    |-- Cards                    recursive exploration
    |-- Notebook                 living editable prose
    |-- Sources                  claims, evidence, verification
    |-- Chat                     workspace-scoped answers
    `-- Map                      entity constellation
```

## Role Of Each Surface

| Surface | Primary job | Best for |
| --- | --- | --- |
| Web app | Main operating app | Daily pulse, reports, chat, inbox triage, profile/context |
| Mobile | Real-world capture and quick action | Events, voice notes, screenshots, fast triage |
| CLI / MCP | Agent and developer distribution | Claude/Cursor workflows, automations, batch research, API workflows |
| Workspace | Deep research and recursive exploration | Report detail, cards, notebook, sources, map, team memory |

## Event Intelligence Serving

Event serving uses the same product split. It is not a new tab.

```text
Before event
-> build event corpus

During event
-> capture messy notes instantly

After event
-> turn captures into report, cards, follow-ups, and reusable memory
```

Surface mapping:

| Surface | Event responsibility |
| --- | --- |
| Home | Active event snapshot, recent signals, and continue-capture entry |
| Chat | Universal ask/capture composer with budget-aware ack copy |
| Reports | Event reports as reusable memory objects |
| Inbox | Captures, unassigned notes, needs confirmation, nudges, alerts |
| Me | Evidence mode, search budget, event capture privacy, org settings |
| Workspace | Brief, Cards, Notebook, Sources, Chat, and Map for post-event work |
| CLI / MCP | Batch corpus builds, imports, automations, scheduled refreshes |

Event copy should expose product states, not provider names:

```text
Using event corpus
Using team memory
Checking public sources
Deep refresh queued
Paid refresh requires approval
Saved to Ship Demo Day
```

The detailed contract lives in
[`EVENT_INTELLIGENCE_SERVING_MODEL.md`](../architecture/EVENT_INTELLIGENCE_SERVING_MODEL.md).

## Inbox Contents

Inbox is where incoming signals triage before they become reports or
follow-ups.

- Nudges: return-at-right-moment alerts.
- Captures: items routed by `captureRouter`.
- Unassigned: low-confidence captures to promote, attach, or discard.
- Automations: inbound from Pipedream, Gmail, Calendar, MCP, and similar flows.
- Alerts: threshold-triggered watchlist events.

## Workspace URL Shape

```text
nodebench.workspace/w/{workspaceId}?tab=brief
nodebench.workspace/w/{workspaceId}?tab=cards
nodebench.workspace/w/{workspaceId}?tab=notebook
nodebench.workspace/w/{workspaceId}?tab=sources
nodebench.workspace/w/{workspaceId}?tab=chat
nodebench.workspace/w/{workspaceId}?tab=map
nodebench.workspace/share/{shareId}
```

## Report Entry Mapping

| Card button | Workspace entry tab |
| --- | --- |
| Brief | `?tab=brief` |
| Explore | `?tab=cards` |
| Chat | `?tab=chat` |

| Entry source | Default workspace tab |
| --- | --- |
| Chat "save as report" | Brief |
| Event capture report | Cards or Notebook |
| Source citation click | Sources |
| Graph node click | Map |

## Critical Rule

Workspace is a separate app shell, but it must use the same resource URIs, auth,
graph tables, cards, citations, and composer contract as the main app.

All four surfaces share:

- `UniversalComposer`
- `nodebench://` resource URIs
- entity cards (`ResourceCard` from `shared/research/resourceCards.ts`)
- claims and evidence
- saved reports
- workspace links
- dry operator copy
- same visual tokens

## Connection Graph

```text
Mobile capture
-> Inbox capture queue
-> Report
-> Workspace
-> Notebook / Cards / Sources
-> Nudge back to Web or Mobile

Web Chat question
-> Research run
-> Save as Report
-> Open Workspace
-> Explore Cards
-> Edit Notebook

CLI/MCP investigate
-> Saved report URI
-> Open in Workspace
-> Share / continue in Web

Inbox job email
-> NodeBench enrichment
-> Report card
-> Workspace interview prep
```
