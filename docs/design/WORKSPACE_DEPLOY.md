# Workspace Separate Deployment

Per [PRODUCT_SURFACES.md](PRODUCT_SURFACES.md), Workspace is a separate deep
work surface. It is not a sixth tab in the main app.

## Current Implementation

- Main app surfaces are locked to `Home`, `Reports`, `Chat`, `Inbox`, `Me`.
- Workspace renders through `UniversalWorkspacePage`.
- Local route: `/workspace/w/{workspaceId}?tab={tab}`.
- Workspace-host route: `/w/{workspaceId}?tab={tab}`.
- Supported tabs: `brief`, `cards`, `notebook`, `sources`, `chat`, `map`.
- Canonical workspace host: `workspace.nodebenchai.com`.
- Accepted future alias: `nodebench.workspace`.
- Accepted rollout alias: `nodebench-workspace.vercel.app`.

`src/App.tsx` checks for the workspace host or `/workspace/*` path before the
cockpit shell mounts, so Workspace owns its own header and tabs.

## URL Mapping

```text
nodebenchai.com                  -> Home / Reports / Chat / Inbox / Me
workspace.nodebenchai.com/w/acme -> Workspace shell
workspace.nodebenchai.com/share/abc -> Workspace share surface
localhost:5173/workspace/w/acme  -> Local workspace shell
```

Report actions use this mapping:

| Main app action | Workspace URL |
| --- | --- |
| Brief | `/w/{workspaceId}?tab=brief` |
| Explore | `/w/{workspaceId}?tab=cards` |
| Chat | `/w/{workspaceId}?tab=chat` |

## Deployment Options

### Preferred

Deploy the same React bundle with the custom domain
`workspace.nodebenchai.com`. The bundle routes the bare workspace host directly
to the chromeless workspace shell.

### DNS-Compatible Fallback

If the `nodebench.workspace` domain becomes available later, keep it as an alias
only. `buildWorkspaceUrl` keeps production links on
`https://workspace.nodebenchai.com/...`.

## Vercel Rewrites

If the same Vercel project serves both hosts, add host-based rewrites so the
workspace subdomain keeps clean URLs:

```json
{
  "rewrites": [
    {
      "source": "/w/:workspaceId",
      "has": [{ "type": "host", "value": "workspace.nodebenchai.com" }],
      "destination": "/w/:workspaceId"
    },
    {
      "source": "/share/:shareId",
      "has": [{ "type": "host", "value": "workspace.nodebenchai.com" }],
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
