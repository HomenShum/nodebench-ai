# Workspace Separate Deployment

Per [PRODUCT_SURFACES.md](PRODUCT_SURFACES.md), Workspace is a separate deep
work surface. It is not a sixth tab in the main app.

## Current Implementation

- Main app surfaces are locked to `Home`, `Reports`, `Chat`, `Inbox`, `Me`.
- Workspace renders through `UniversalWorkspacePage`.
- Local route: `/workspace/w/{workspaceId}?tab={tab}`.
- Workspace-host route: `/w/{workspaceId}?tab={tab}`.
- Supported tabs: `brief`, `cards`, `notebook`, `sources`, `chat`, `map`.
- Canonical workspace host: `nodebench.workspace`.
- Accepted rollout alias: `workspace.nodebenchai.com`.
- Accepted rollout alias: `nodebench-workspace.vercel.app`.

`src/App.tsx` checks for the workspace host or `/workspace/*` path before the
cockpit shell mounts, so Workspace owns its own header and tabs.

## URL Mapping

```text
nodebenchai.com                 -> Home / Reports / Chat / Inbox / Me
nodebench.workspace/w/acme      -> Workspace shell
nodebench.workspace/share/abc   -> Workspace share surface
localhost:5173/workspace/w/acme -> Local workspace shell
```

Report actions use this mapping:

| Main app action | Workspace URL |
| --- | --- |
| Brief | `/w/{workspaceId}?tab=brief` |
| Explore | `/w/{workspaceId}?tab=cards` |
| Chat | `/w/{workspaceId}?tab=chat` |

## Event Workspace Mapping

Event capture starts in mobile or web, but post-event synthesis opens in the
separate Workspace shell.

```text
nodebench.workspace/w/ship-demo-day?tab=brief
nodebench.workspace/w/ship-demo-day?tab=cards
nodebench.workspace/w/ship-demo-day?tab=notebook
nodebench.workspace/w/ship-demo-day?tab=sources
nodebench.workspace/w/ship-demo-day?tab=chat
nodebench.workspace/w/ship-demo-day?tab=map
```

Default event tab usage:

| Workspace tab | Event purpose |
| --- | --- |
| Brief | Post-event memo with people met, strongest companies, themes, and next actions |
| Cards | Company, person, product, and theme cards |
| Notebook | Raw notes, cleaned notes, transcripts, and screenshot OCR |
| Sources | Field notes, public evidence, confidence, and verification status |
| Chat | Follow-up questions and deeper refreshes |
| Map | Graph view later, not the v1 default |

Event report entries should default to `cards` or `notebook` when the user is
coming from capture review, and to `brief` when the user asks for a memo.

## Deployment Options

### Preferred

Deploy the same React bundle with the custom domain
`nodebench.workspace`. The bundle routes the bare workspace host directly
to the chromeless workspace shell.

### DNS-Compatible Fallback

If the `nodebench.workspace` domain is not available during rollout, keep
`workspace.nodebenchai.com` as an alias. `buildWorkspaceUrl` keeps production
links on `https://nodebench.workspace/...`.

## Vercel Rewrites

If the same Vercel project serves both hosts, add host-based rewrites so the
workspace subdomain keeps clean URLs:

```json
{
  "rewrites": [
    {
      "source": "/w/:workspaceId",
      "has": [{ "type": "host", "value": "nodebench.workspace" }],
      "destination": "/w/:workspaceId"
    },
    {
      "source": "/share/:shareId",
      "has": [{ "type": "host", "value": "nodebench.workspace" }],
      "destination": "/share/:shareId"
    }
  ]
}
```

For local development, use:

```powershell
npm run dev
# then open http://localhost:5173/workspace/w/ship-demo-day?tab=cards
```

## Contract Invariants

Workspace is separate chrome, not separate data. It shares:

- auth
- `nodebench://` resource URIs
- graph tables
- entity cards
- claims and citations
- composer routing contract
- visual tokens

Do not add Workspace as a tab in `ProductTopNav`, `MobileTabBar`, or
`WorkspaceRail`.
