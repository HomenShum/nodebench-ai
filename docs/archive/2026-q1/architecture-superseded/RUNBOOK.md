# NodeBench AI Operational Runbook

How to keep NodeBench running if the founder is unavailable.

## Critical Accounts

| Service | Purpose | Access |
|---------|---------|--------|
| Vercel | Frontend hosting (nodebenchai.com) | Vercel dashboard → hshum2018 account |
| Convex | Backend (agile-caribou-964.convex.cloud) | Convex dashboard |
| npm | Package registry (nodebench-mcp) | npm account: homenshum |
| Google AI Studio | Gemini API keys | Google account |
| Linkup | Web search API | linkup.so dashboard |
| GitHub | Source code (HomenShum/nodebench-ai) | GitHub account |
| Domain | nodebenchai.com | Domain registrar |

## Deploy Frontend

```bash
cd nodebench-ai
npm run build          # Vite production build
npx vercel --prod      # Deploy to Vercel
```

Build takes ~25 seconds. Deploy takes ~3 minutes.

## Deploy Backend (Convex)

```bash
npx convex deploy      # Push functions to production
```

To push to dev environment first:
```bash
npx convex dev --once --typecheck=enable
```

## Rotate API Keys

### Gemini API Key
1. Go to https://aistudio.google.com/apikey
2. Create new key
3. Set in Convex: `npx convex env set GEMINI_API_KEY "new-key"`
4. Set in .env.local for local dev
5. Also set in Vercel: `npx vercel env add GEMINI_API_KEY`

### Linkup API Key
1. Go to https://linkup.so dashboard
2. Regenerate key
3. `npx convex env set LINKUP_API_KEY "new-key"`

## Common Issues

### Search returns no results
1. Check Gemini key: `npx convex env list | grep GEMINI`
2. Test key: `curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=YOUR_KEY" -d '{"contents":[{"parts":[{"text":"test"}]}]}'`
3. If 403/404: key is revoked or model deprecated. Rotate key or update model name.
4. Model name lives in: `convex/domains/search/deepDiligence.ts` (GEMINI_API_URL constant)

### Vercel deploy fails
1. "12 serverless functions" limit: remove unused api/ files
2. Build error: `npm run build` locally first, fix errors
3. "function pattern" error: check `vercel.json` functions block matches api/ files

### Convex deploy fails
1. Schema error: check `convex/schema.ts` for type mismatches
2. Type error: `npx convex dev --once --typecheck=enable` to see errors
3. Timeout: Convex actions have 10-minute limit, mutations 1 second

## Architecture Quick Reference

```
Frontend (Vite + React) → Vercel
  ↓ mutations/queries
Convex Cloud (realtime DB + actions)
  ↓ fetch()
External APIs: Gemini 3.1 + Linkup
  ↓ results
searchSessions table → realtime subscription → UI
```

## MCP Package Release

```bash
cd packages/mcp-local
npm version patch      # or minor/major
npm publish            # requires npm login + 2FA
```

Granular npm token with "Bypass 2FA" needed. Classic tokens are revoked.

## Emergency: Site Down

1. Check Vercel status: https://www.vercel-status.com/
2. Check Convex status: Convex dashboard
3. If Vercel down: site recovers when Vercel recovers (static hosting)
4. If Convex down: search won't work, UI still renders with demo data
5. If both down: nothing to do but wait

## Contact

- Founder: Homen Shum
- GitHub Issues: https://github.com/HomenShum/nodebench-ai/issues
- LinkedIn: https://www.linkedin.com/in/homenshum/
