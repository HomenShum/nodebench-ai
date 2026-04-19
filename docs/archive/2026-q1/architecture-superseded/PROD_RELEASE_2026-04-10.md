# Production Release 2026-04-10

## Scope

- Consolidated the public product shell around `Home`, `Chat`, `Reports`, `Nudges`, and `Me`.
- Hardened guest entry so unauthenticated users stay in the product flow instead of being bounced into Google auth.
- Removed client-side assumptions that shared-context and sync-bridge APIs always live on `localhost:3100`.
- Made the shared-context stream fall back cleanly instead of retrying a dead local endpoint during preview and production verification.

## Code changes in this release

- `src/layouts/WorkspaceRail.tsx`
  - Changed guest CTA to anonymous sign-in.
- `src/lib/syncBridgeApi.ts`
  - Switched sync-bridge, shared-context, and subconscious API resolution to same-origin paths.
  - Switched sync-bridge websocket resolution to same-origin host.
- `src/features/mcp/components/SharedContextProtocolPanel.tsx`
  - Close the EventSource on stream error and fall back cleanly.

## Deployment

- Convex: `https://agile-caribou-964.convex.cloud`
- Vercel production deployment:
  - `https://nodebench-r6b48aecn-hshum2018-gmailcoms-projects.vercel.app`
  - aliased to `https://www.nodebenchai.com`

## Verification

- `npx tsc --noEmit`
- `npm run build`
- targeted Playwright dogfood route shards
- production verification across:
  - desktop: `home`, `chat`, `reports`, `nudges`, `me`
  - mobile: `home`, `chat`, `reports`, `nudges`, `me`

Verification artifact:

- `.tmp/prod-verification-2026-04-10/results.json`

## Outcome

- Production public surfaces render successfully on desktop and mobile.
- No production console errors or request failures were observed across the five public surfaces during final verification.
