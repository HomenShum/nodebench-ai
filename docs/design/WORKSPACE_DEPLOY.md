# Workspace Separate Deployment

Per [PRODUCT_SURFACES.md](PRODUCT_SURFACES.md), Workspace is a separate deep
work surface. It is not a sixth tab in the main app.

## Current Implementation

- Main app surfaces are locked to `Home`, `Reports`, `Chat`, `Inbox`, `Me`.
- Workspace renders through `UniversalWorkspacePage`.
- Local route: `/workspace/w/{workspaceId}?tab={tab}`.
- Workspace-host route: `/w/{workspaceId}?tab={tab}`.
- Supported tabs: `brief`, `cards`, `notebook`, `sources`, `chat`, `map`.
- Recognized workspace hosts:
  - `nodebench.workspace`
  - `workspace.nodebenchai.com`
  - `nodebench-workspace.vercel.app`

`src/App.tsx` checks for the workspace host or `/workspace/*` path before the
cockpit shell mounts, so Workspace owns its own header and tabs.

## URL Mapping

```text
nodebenchai.com                  -> Home / Reports / Chat / Inbox / Me
nodebench.workspace/w/acme       -> Workspace shell
nodebench.workspace/share/abc    -> Workspace share surface
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

Deploy the same React bundle as a separate Vercel project or service alias with
the custom domain `nodebench.workspace`. The bundle can route the bare workspace
host directly to the chromeless workspace shell.

### DNS-Compatible Fallback

If the `nodebench.workspace` domain is not available yet, use
`workspace.nodebenchai.com` with the same host handling. `buildWorkspaceUrl`
keeps production links on `https://nodebench.workspace/...` by default, and the
host allowlist also accepts `workspace.nodebenchai.com` for rollout.

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
