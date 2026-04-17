# Solo-Ops Runbook — Notebook

One operator. Zero on-call rotation. Evidence flows to Notion + ntfy hourly so the operator does not have to chase it.

## The loop

```
                        (hourly CI)                 (daily CI, 9am ET)
                             │                              │
                             ▼                              ▼
                    hourlyHealthCheck.mjs           dailySummary.mjs
                             │                              │
               ┌─────────────┴─────────────┐    ┌───────────┼─────────────┐
               │                           │    │           │             │
            ntfy P1                    exit=0  ntfy     Notion db    .tmp JSON
         (only if red)                (silent)  digest    row       (90d retain)
               │                                                          │
               ▼                                                          ▼
        operator sees alert                                   git-archived evidence
               │
               ▼
     npm run notebook:diagnose  ──►  .tmp/notebook-diagnose-latest.md
               │
               ▼
  paste into Claude Code or Codex: "fix the P1 — here's the bundle"
```

## Daily operator ritual (5 minutes)

1. **Open Notion, check the new row.** Green ✅ = no action. Yellow ⚠️ = scan the SLO-breach section. Red 🚨 = run the fix loop below.
2. **Glance at the ntfy app** for any hourly alerts since yesterday. If none, the system self-attested green for 24h.

## When an alert fires (the fix loop)

```bash
# 1. Capture everything an agent needs:
npm run notebook:diagnose

# 2. Either:
#    a. Open Claude Code in this repo. Paste the contents of
#       .tmp/notebook-diagnose-latest.md into the chat and say:
#       "Fix the P1 described in this bundle. Follow analyst_diagnostic:
#        trace root cause before touching code."
#
#    b. OR open Codex (ChatGPT code agent), share the file, same prompt.
#
# 3. When the agent proposes a fix, verify locally:
npm run notebook:loadtest   # full suite, 60s per scenario
npx vitest run convex/domains/product/ src/features/entities/components/notebook/ src/lib/notebookAlerts.test.ts

# 4. Deploy:
npx convex deploy -y
git add -p && git commit -m "fix(notebook): ..." && git push
```

## One-time setup

### ntfy (instant, free)
```bash
# 1. Pick a topic name. This repo uses `nodebench-dev`.
# 2. Install the app: https://ntfy.sh/app/ (iOS/Android/desktop)
# 3. Subscribe to your topic.
# 4. Put these in the GitHub repo secrets:
#      CONVEX_URL        = your Convex prod URL
#      OPS_NTFY_URL      = https://ntfy.sh/<your-topic>
```

### Notion (5 minutes)
```bash
# 1. Create internal integration: https://www.notion.so/my-integrations
#    Copy the "Internal Integration Token".
# 2. Create a new database in Notion. Required properties:
#      Name    : Title
#      Date    : Date
#      Status  : Select  (options: green, yellow, red)
#      P95     : Number  (default format: number)
#      Errors  : Number
# 3. Share the database with your integration (top-right "..." → Connections).
# 4. Copy the database id from the URL — the 32-char hex after the workspace name.
# 5. Add to GitHub repo secrets:
#      NOTION_API_KEY     = secret_...
#      NOTION_DATABASE_ID = the 32-char hex
```

### GitHub Actions
```bash
# The workflows live in .github/workflows/notebook-hourly.yml and notebook-daily.yml.
# Once you push these files, the schedule starts automatically.
# Hourly: every hour at :07 UTC (off-peak minute).
# Daily:  14:11 UTC = ~9am ET / ~6am PT.
#
# Smoke-test them: Actions tab → workflow → "Run workflow" button.
```

## SLOs (adjust as usage grows)

| Signal | Budget | Source |
|---|---|---|
| Hourly p95 | 500ms | `hourlyHealthCheck` |
| Hourly error rate | 1% | `hourlyHealthCheck` |
| Daily p95 (worst scenario) | 500ms | `dailySummary` |
| Daily error rate | 5% (unexpected codes only) | `dailySummary` |

Budgets are env-overridable so you can tighten them over time without redeploying code.

## Escalation (solo = no escalation)

There is no tier 2. When an alert fires at 3am and you're asleep:
- P1 (hourly degraded, one breach, not a data-loss event) → triage in the morning, evidence is archived in ntfy history.
- P0 (script crashed OR a data-loss code fires) → your phone will ring. Run `npm run notebook:diagnose` on your laptop, paste to an agent, ship a fix.

The kill-switch is always available as the nuclear option:
```bash
# Disable Live notebook for every user without a redeploy:
#   (requires your frontend host to honor env var changes without redeploy —
#    Vercel does via Environment Variables + redeploy button, Cloudflare Pages
#    similarly. If not, use the build-time fallback below.)
# 1. In your host dashboard, set VITE_NOTEBOOK_LIVE_ENABLED=false
# 2. Trigger a redeploy of the frontend (10-30 seconds).
# 3. Users on next page load see Classic view. Data is untouched.
```

## What this does NOT cover

- **Long soak (4h+)**: CI workflows are 20-minute timeouts. Run `node scripts/loadtest/notebook-load.mjs --scenario soak_mixed --duration 14400` locally before major releases.
- **Spike to 200 clients**: same reason. Use `--scenario spike_insert --clients 200 --duration 10`.
- **Enterprise audit trail**: the `productBlockAudit` table is future work (see `NOTEBOOK_PRODUCTION_CHECKLIST.md` WP6).
- **Real CRDT merge**: current design is revision-guard + retry. See WP5 in the production checklist.
- **Per-cohort SLO dashboards**: today we have aggregate. Per-user requires the Convex cron + aggregation table (WP2 in the checklist).

## Files

| Layer | File |
|---|---|
| Hourly smoke | `scripts/ops/hourlyHealthCheck.mjs` |
| Daily summary + Notion | `scripts/ops/dailySummary.mjs`, `scripts/ops/notionClient.mjs` |
| Operator diagnose | `scripts/ops/diagnose.mjs` |
| CI schedule | `.github/workflows/notebook-hourly.yml`, `.github/workflows/notebook-daily.yml` |
| Error-code triage | `docs/architecture/NOTEBOOK_RUNBOOK.md` |
| Hardening history | `docs/architecture/NOTEBOOK_HARDENING_CHANGELOG.md` |
| Production checklist | `docs/architecture/NOTEBOOK_PRODUCTION_CHECKLIST.md` |
