# Zero-Failure Deployment

This runbook keeps deployment status honest. A green Vercel build means the
code compiled. It does not prove users are seeing the new bundle.

## Local preflight

Run before pushing deployment-sensitive changes:

```powershell
npm run preflight:fast
```

For a full local check:

```powershell
npm run preflight
```

For production env validation:

```powershell
npm run preflight:production
```

The preflight checks environment requirements, TypeScript, Convex TypeScript,
search API bundling, changed-file secret patterns, production build, and bundle
budget.

## GitHub preflight

`.github/workflows/vercel-preflight.yml` runs on pull requests to `main`. It
uses the same `scripts/preflight-deploy.mjs` contract. Production target checks
can be run manually from the workflow dispatch UI.

## Vercel fail-fast

`vercel.json` fails production builds immediately when `CONVEX_DEPLOY_KEY` is
missing. That prevents long failed deploys and noisy failure emails.

## Post-deploy verification

Run after Vercel reports Ready:

```powershell
npm run post-deploy:verify
```

The post-deploy verifier checks:

- production HTML shell
- raw live verifier at `scripts/verify-live.ts`
- hydrated browser smoke via `npm run live-smoke`

Only call a deploy live after these checks pass.
