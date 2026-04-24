# Web Kit Parity Pass

This pass maps the uploaded `nodebench-web` design kit into the production web shell without turning Workspace into a sixth tab.

## Locked Navigation

Production keeps the five operating surfaces:

```text
Home | Reports | Chat | Inbox | Me
```

Workspace remains a separate deep-work destination opened from report, chat, and inbox actions.

## Component Mapping

| Design kit component | Production surface | Implemented aspects |
| --- | --- | --- |
| `TopNav.jsx` | `src/layouts/ProductTopNav.tsx` | NodeBench AI brand treatment, locked tab order, centered search affordance, operator controls |
| `Composer.jsx` | `src/features/home/views/HomeLanding.tsx` | Entity intelligence hero copy, answer-first framing, prompt cards, MCP command chip |
| `ReportCard.jsx` | `src/features/reports/views/ReportsHome.tsx` | Report status badges, `+N new` freshness marker, preserved Brief / Explore / Chat workspace actions |
| `NudgeList.jsx` | `src/features/nudges/views/NudgesHome.tsx` | Inbox-owned nudges, priority chips, grouped signal context, snooze and dismiss controls |
| `EntityNotebook.jsx` | `src/features/me/views/MeHome.tsx` | Personal context plus watched-memory notebook cards |
| `AnswerPacket.jsx` | `src/features/chat/views/ChatHome.tsx` | Existing chat surface already carries answer sections, sources, follow-ups, save actions, and workspace handoff |

## Product Rule

`Nudges` is a section inside `Inbox`. `Workspace` is a separate deployed surface for Brief, Cards, Notebook, Sources, Chat, and Map.
