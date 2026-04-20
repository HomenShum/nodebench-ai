# Live-DOM Verification

**Never claim "deployed", "live", "shipped", or "the site now shows X" on the
basis of local build success, `git push` output, CLI exit codes, CI-green, or
`npx convex codegen` clean alone.** Before saying any of those words, fetch
the live production URL and grep the response for a concrete content signal.

## Why this rule exists

Three silent failure modes make "green build = live" a false promise:

1. **Silently-disconnected deploy webhooks** — the CI log says "deployed" but
   the production CDN never received the new build.
2. **Suspense / client-only regressions** — Next.js / Vite + React 18 SSR can
   render only a fallback skeleton; the real component is a client-only
   import that the raw HTML never contains.
3. **CDN-cached stale HTML** — the deploy succeeded but edge caches still
   serve yesterday's bytes to most users.

All three pass `tsc`, pass tests, pass `npm run build`, pass CI, and fail
in production.

## The protocol (apply to every ship claim)

```
1. git push
2. Confirm the deploy platform registered the push:
     Vercel:   vercel ls                      → new deployment, age < 1min
     Convex:   npx convex deploy              → "Deployment updated" + URL
3. Wait for Ready / Live status
4. Run the mechanical verifier:
     npx tsx scripts/verify-live.ts           → must print "LIVE OK"
     Override URL for preview:
     npx tsx scripts/verify-live.ts --url=<preview-url>
5. ONLY THEN use the words "deployed", "live", or "ships X to users".
```

If any step fails, report the EXACT failure — not a polished summary of what
you hoped happened.

## Vocabulary discipline

| State | Allowed language |
|---|---|
| Committed to local branch | "committed", "pushed to branch" |
| Tests + tsc green | "regression green", "tsc clean" |
| Convex codegen clean | "codegen clean" |
| `npm run build` clean | "build clean" |
| `vercel ls` shows Ready | "deployed to Vercel" (not "live" yet) |
| `verify-live.ts` passes | "live", "users see X", "shipped" |

Never use a higher-tier word when a lower-tier word is accurate.

## The mechanical verifier

`scripts/verify-live.ts` — the rule as runnable code. Fetches the live
production URL and asserts concrete content signals in the raw HTML.

Current signals (extend when new promises ship):
- Landing page 200
- Entity-page route loads
- `/share/{dummy}` returns a 200 page (verifies route exists, renders
  `not_found` StatusCard in raw HTML, not a white screen)
- Agent panel CTA visible in raw HTML
- 304-tool MCP count literal present (catches stale docs)

Run: `npx tsx scripts/verify-live.ts`
Prod URL defaults to `https://www.nodebenchai.com`.

## Anti-patterns

- "Deployed" on the basis of `git push` exit code 0
- "Live" on the basis of `npx convex deploy` success
- "Shipped" on the basis of CI green
- "Users can see X" without fetching the URL and grepping the HTML
- Skipping the verifier because "the diff is tiny"
- Silently ignoring a verifier failure ("it must be a cache issue")

## Related

- `.claude/rules/agentic_reliability.md` — HONEST_STATUS applies to OUR
  claims about the system, not just the system's claims about itself
- `.claude/rules/pre_release_review.md` — layer 8 (Live Browser Verify) is
  this rule in checklist form
- `.claude/rules/completion_traceability.md` — "here's what was done"
  must be honest about what actually shipped vs what was just committed
