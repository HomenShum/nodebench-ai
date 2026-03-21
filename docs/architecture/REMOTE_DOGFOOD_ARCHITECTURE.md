# Remote Dogfood Architecture

## The Loop

Claude Code builds NodeBench → NodeBench deploys → Claude Code uses NodeBench → Claude Code finds gaps → Claude Code fixes gaps → repeat.

This eliminates the human bottleneck in the R&D feedback loop. The builder IS the user.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Claude Code (local)                                     │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ MCP Tools    │  │ Browser MCP  │  │ Scheduled    │  │
│  │ (289 local)  │  │ (Chrome)     │  │ Tasks        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
└─────────┼─────────────────┼──────────────────┼──────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐
│ Convex Backend  │  │ Vercel       │  │ GitHub Actions   │
│ (cloud)         │  │ (frontend)   │  │ (CI/benchmarks)  │
│                 │  │              │  │                  │
│ agile-caribou-  │  │ nodebench-   │  │ HomenShum/       │
│ 964.convex.cloud│  │ ai.vercel.app│  │ nodebench-ai     │
└─────────────────┘  └──────────────┘  └──────────────────┘
```

## Three Access Channels

### 1. MCP Gateway (Tool-Level Access)

The Deep Sim tools already call the Convex backend via HTTP:
```
POST https://agile-caribou-964.convex.site/api/mcpGateway
Headers: x-mcp-secret: <MCP_SECRET>
Body: { fn: "computeDimensionProfile", args: {...} }
```

This means Claude Code can run `build_claim_graph`, `extract_variables`, `run_deep_sim`, etc. against the production backend RIGHT NOW — no additional infrastructure needed.

**What's needed:** Set `CONVEX_SITE_URL` and `MCP_SECRET` in the local environment.

### 2. Browser Automation (UI-Level Dogfooding)

Claude Code already has Chrome MCP. Once the frontend is deployed to Vercel:
```
1. Navigate to https://nodebench-ai.vercel.app/deep-sim
2. Interact with Decision Workbench
3. Navigate to /postmortem — score forecast accuracy
4. Navigate to /agent-telemetry — review own tool call patterns
5. Screenshot + evaluate UI quality
```

This is the highest-value dogfood loop because it tests the FULL user experience.

### 3. Scheduled Tasks (Continuous Self-Feedback)

Use Claude Code scheduled tasks to run periodic dogfood cycles:
```
Every 4 hours:
  - Run autoresearch optimizer
  - Score own tool call patterns via /agent-telemetry
  - Check for drift via trajectory scoring
  - Log findings to GitHub issue

Weekly:
  - Run full postmortem on week's predictions
  - Compare trajectory scores across the window
  - Generate changelog draft
```

---

## Deployment Steps

### Step 1: Deploy Convex (already done)
```bash
npx convex deploy -y --typecheck=enable
```
Backend: `https://agile-caribou-964.convex.cloud`

### Step 2: Deploy Frontend to Vercel
```bash
# Build
npm run build

# Deploy (first time — links to Vercel project)
vercel --prod

# Or via GitHub: push to main → Vercel auto-deploys
```
Frontend: `https://nodebench-ai.vercel.app` (or custom domain)

### Step 3: Set Environment Variables
In Vercel dashboard:
- `VITE_CONVEX_URL` = `https://agile-caribou-964.convex.cloud`

Locally for Claude Code MCP:
- `CONVEX_SITE_URL` = `https://agile-caribou-964.convex.site`
- `MCP_SECRET` = <from Convex dashboard>

### Step 4: Enable Self-Dogfood Loop
Create a Claude Code scheduled task that:
1. Opens the deployed app via Chrome MCP
2. Runs a Decision Workbench analysis on NodeBench itself
3. Screenshots the result
4. Compares against previous run
5. Files a GitHub issue if quality regressed

---

## What This Saves

| Without Remote Dogfood | With Remote Dogfood |
|------------------------|---------------------|
| Human tests UI manually | Claude Code tests UI via Chrome MCP |
| Human reviews tool output quality | Claude Code scores own outputs via trajectory |
| Human runs benchmarks on request | Scheduled benchmarks run every 4 hours |
| Human writes changelog | Claude Code drafts changelog from telemetry |
| Human spot-checks accessibility | Claude Code runs agentNativeUiLinter automatically |
| Feedback delay: days | Feedback delay: hours |

**Estimated R&D acceleration: 3-5x** — the builder never sleeps, never forgets to check, and uses the same evidence-backed scoring it builds.

---

## Security Boundaries

- MCP_SECRET scoped to read/write operations, not admin
- Claude Code uses bounded autonomy (no production push without approval)
- Browser automation reads and screenshots, doesn't modify user data
- Scheduled tasks produce drafts, not final publications
- All self-dogfood findings logged to GitHub issues for human review
