# NodeBench Product Surfaces — locked 2026-04-23

This is the canonical surface map. The design system (docs/design/nodebench-ai-design-system/)
still shows an older "Home · Chat · Reports · Nudges · Me" labelling in places — treat
the layout below as the source of truth and correct the bundle on next refresh.

## Product line (one sentence)

> Web is where you start. Mobile is where you capture. CLI/MCP is where agents integrate.
> Workspace is where research becomes reusable intelligence.

## The split

```
nodebenchai.com                  (the operating app — five tabs)
├─ Home                          start quickly · daily pulse
├─ Reports                       reusable memory · report grid
├─ Chat                          ask + generate new work
├─ Inbox                         incoming signals (captures, nudges, unassigned, automations, alerts)
└─ Me                            preferences · context · files · credits

nodebench.workspace              (deep-work surface, separately deployed)
└─ Deep workspaces opened from Chat / Reports / Inbox
   ├─ Brief      executive summary (what / so what / now what)
   ├─ Cards      recursive exploration (root → related → drilldown)
   ├─ Notebook   living editable prose
   ├─ Sources    claims + evidence trail + verification
   ├─ Chat       answer-first within the workspace
   └─ Map        entity constellation (circular SVG layout)
```

## Role of each surface

| Surface       | Primary job                              | Best for                                                            |
| ------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| Web app       | Main operating app                       | Daily pulse, reports, chat, inbox triage, profile/context           |
| Mobile        | Real-world capture and quick action      | Events, voice notes, screenshots, fast triage                       |
| CLI / MCP     | Agent and developer distribution         | Claude/Cursor workflows, automations, batch research, API workflows |
| Workspace     | Deep research and recursive exploration  | Report detail, cards, notebook, sources, map, team memory           |

## Inbox contents (the former "Nudges")

Inbox is where incoming signals triage before they become reports or follow-ups.
Sub-sections:

- Nudges           (return-at-right-moment alerts)
- Captures         (everything routed by `captureRouter` with target confidence ≥ 0.60)
- Unassigned       (low-confidence `captureBuffer` — promote, attach, or discard)
- Automations      (inbound from Pipedream, Gmail, Calendar, MCP, etc.)
- Alerts           (threshold-triggered watchlist events)

## Workspace URL shape

```
nodebench.workspace/w/{workspaceId}?tab=brief
nodebench.workspace/w/{workspaceId}?tab=cards
nodebench.workspace/w/{workspaceId}?tab=notebook
nodebench.workspace/w/{workspaceId}?tab=sources
nodebench.workspace/w/{workspaceId}?tab=chat
nodebench.workspace/w/{workspaceId}?tab=map
nodebench.workspace/share/{shareId}
```

## Report card → Workspace entry mapping

Report card actions (from `ReportsHome.tsx`):

| Card button | Workspace entry tab |
| ----------- | ------------------- |
| Brief       | `?tab=brief`        |
| Explore     | `?tab=cards`        |
| Chat        | `?tab=chat`         |

Additional entry sources:

| Entry                | Default tab         |
| -------------------- | ------------------- |
| Chat "save as report"| Brief               |
| Event capture report | Cards or Notebook   |
| Source citation click| Sources             |
| Graph node click     | Map                 |

## Critical rule

> Workspace is a separate app shell, but it must use the same resource URIs,
> auth, graph tables, cards, citations, and composer contract as the main app.

All four surfaces share:

- `UniversalComposer`
- `nodebench://` resource URIs
- entity cards (`ResourceCard` from `shared/research/resourceCards.ts`)
- claims/evidence (from PR #11/#12 canonical graph)
- saved reports
- workspace links
- dry operator copy
- same visual tokens (from `src/index.css` / `colors_and_type.css`)

## Four-surface connection graph

```
Mobile capture
→ Inbox capture queue
→ Report
→ Workspace
→ Notebook / Cards / Sources
→ Nudge back to Web or Mobile

Web Chat question
→ Research run
→ Save as Report
→ Open Workspace
→ Explore Cards
→ Edit Notebook

CLI/MCP investigate
→ Saved report URI
→ Open in Workspace
→ Share / continue in Web

Inbox job email
→ NodeBench enrichment
→ Report card
→ Workspace interview prep
```
