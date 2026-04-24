# Workspace separate-deploy setup

Per [PRODUCT_SURFACES.md](PRODUCT_SURFACES.md) the **Workspace** is a separate
deployed surface at a distinct URL (e.g. `workspace.nodebenchai.com`). It is
NOT a sixth tab on the main app.

This doc explains how the split is implemented today and how to finish the DNS
/ Vercel setup.

## What v1 ships

- New route `/workspace/w/:workspaceId` in the main React app.
- Supports `?tab=brief|cards|notebook|sources|chat|map`.
- Chromeless shell: header with brand + report title, then the existing
  `ReportDetailWorkspace` body (tabs: Brief · Cards · Map · Sources).
- v1 treats `notebook` and `chat` URL tabs as landing on **Cards** (the real
  notebook + chat tabs ship in v1.5 and v2 respectively). The URL is preserved
  so deep-links can upgrade later.
- One React bundle serves both `nodebenchai.com` and
  `workspace.nodebenchai.com` — a Vercel rewrite below routes the subdomain
  directly into `/workspace/*`.

Route match in [src/App.tsx](../../src/App.tsx) runs BEFORE the cockpit shell,
so the workspace never mounts `CockpitLayout`. No rails, no top nav, no
status strip.

## Enable the `workspace.nodebenchai.com` subdomain

### 1. Add the subdomain to Vercel

In the Vercel project (hshum2018-gmailcoms-projects/nodebench-ai):

```
Settings → Domains → Add → workspace.nodebenchai.com
```

Vercel will give you a DNS record to add at your DNS provider (Namecheap /
Cloudflare / etc).

### 2. DNS

Add a `CNAME` for `workspace` pointing to `cname.vercel-dns.com.` (or the
record Vercel suggests).

### 3. Rewrite requests to `/workspace/*`

Add a `vercel.json` entry (at repo root) so requests to the subdomain land on
the right path:

```json
{
  "rewrites": [
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "workspace.nodebenchai.com" }],
      "destination": "/workspace/:path*"
    }
  ]
}
```

Also add a second rewrite so `workspace.nodebenchai.com/w/{id}` (no `/workspace/`
prefix from the user's POV) still maps correctly:

```json
{
  "source": "/w/:workspaceId",
  "has": [{ "type": "host", "value": "workspace.nodebenchai.com" }],
  "destination": "/workspace/w/:workspaceId"
}
```

### 4. Optional — shareable URL shortener

`nodebench.workspace/share/:shareId` (from the product spec) requires the
short-domain `nodebench.workspace` TLD. Until that domain is secured, use
`workspace.nodebenchai.com/share/:shareId`.

## Testing locally

```
npm run dev
# then visit:
#   http://localhost:5200/workspace/w/acme-ai
#   http://localhost:5200/workspace/w/acme-ai?tab=brief
#   http://localhost:5200/workspace/w/acme-ai?tab=sources
```

Once the subdomain is configured:

```
https://workspace.nodebenchai.com/w/acme-ai?tab=cards
```

## Contract invariants

1. Workspace is a **separate app shell** — no cockpit rails, no top nav, no
   mobile tab bar.
2. Workspace **shares** everything else with the main app:
   - same auth
   - same Convex tables (canonical entity graph from PR #11/#12)
   - same resource URIs (`nodebench://org/...`, `nodebench://person/...`, etc.)
   - same card contract (`shared/research/resourceCards.ts`)
   - same tokens (`src/index.css` + `colors_and_type.css`)
3. Report card **actions** in `ReportsHome.tsx` link INTO the workspace via
   the URL shape above. `Brief` → `?tab=brief`, `Explore` → `?tab=cards`,
   `Chat` → `?tab=chat`.
4. The workspace header owns its own chrome — DO NOT add workspace-specific
   code to `CockpitLayout.tsx`.

## Next PR

- Wire the Report card `Brief | Graph | Chat` buttons to the new workspace
  URL instead of `/reports/:slug/graph`. Rename `Graph` → `Explore`.
- Port `Map.jsx` into `ReportDetailWorkspace` so the Map tab becomes real.
- Later: resolve `workspaceId` against a real workspace record (today the
  page uses a fixture, matching `ReportDetailPage` behavior).
