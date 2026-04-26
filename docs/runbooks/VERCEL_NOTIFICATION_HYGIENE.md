# Vercel Notification Hygiene

Use this only after the prevention layers in
[`ZERO_FAILURE_DEPLOYMENT.md`](./ZERO_FAILURE_DEPLOYMENT.md) are in place.

## Root rule

Do not hide real deployment failures. Prevent bad deploys before they reach
Vercel, then route any remaining deployment noise to the right channel.

## Recommended setup

- Keep `CONVEX_DEPLOY_KEY` configured for Vercel Production.
- Configure preview env vars used by branch deploys.
- Keep GitHub preflight on pull requests.
- Keep post-deploy verification running after Ready deployments.
- Use a Slack or Discord deploy channel for routine deploy status.
- Keep email notifications for surprising production failures only.

## Manual checks

```powershell
npm run preflight:production
npm run post-deploy:verify
```
