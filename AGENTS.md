# Agent Workflow: Social Post Quality, Dedup, and Cleanup

This repo uses Convex for workflows and a React UI for reviewing outputs.

This file documents the standardized agent procedure used to:
- Diagnose repeated LinkedIn posts and "Unknown Company" output
- Add deterministic guardrails to prevent new repeats
- Hide duplicates in the archive UI and queries
- Run a one-time cleanup job in Convex and optionally LinkedIn

Reference: agents.md standard guidance. See `https://agents.md/`.

## Scope and goals

Primary goals:
- Prevent repeated posts in production runs (idempotency)
- Prevent placeholder company names ("Unknown", "Unknown Company") in funding outputs
- Ensure archive browsing does not show duplicates
- Provide a one-time cleanup tool for existing duplicates, with safe dry-run defaults
- Full self-maintenance: autonomous detect, fix, verify, document

Non-goals:
- Retroactively changing the meaning of past posts
- Rewriting all historical content for formatting

## How the investigation was done

### 1. Pull historical posts from Convex

Fetch the latest archive rows:

```powershell
npx convex run --push "domains/social/linkedinArchiveQueries:getArchivedPosts" "{limit:500,dedupe:false}"
```

Store to a file to allow offline analysis:

```powershell
npx convex run --push "domains/social/linkedinArchiveQueries:getArchivedPosts" "{limit:500,dedupe:false}" | Out-File -Encoding utf8 .tmp/linkedin_archive.json
```

### 2. Identify anomalies

Check for:
- Exact duplicate content on the same `dateString`, `persona`, `postType`, and `metadata.part`
- Placeholder tokens in content such as "Unknown" and "Unknown Company"
- Oversized content (over 2900 chars) that will not match actual posted content
- Demo or mock markers ("demo") that should not ship to production

### 3. Trace source of anomalies in code

Typical root causes:
- Repeated LinkedIn API calls during retries or multiple cron invocations
- Archive logger always inserting (no dedupe or upsert)
- Multi-part posts storing post URLs by push order rather than by part index
- Funding enrichment not triggered when companyName is generic
- Demo fallback paths enabled in production workflows

## Preventing repeats (idempotency)

### Archive-level idempotency

`workflows/dailyLinkedInPostMutations:logLinkedInPost` now dedupes by:
`dateString + persona + postType + metadata.part + content`

If an identical row already exists, it patches the existing row instead of inserting a new one.

### Pre-post idempotency

Posting workflows now support `forcePost` (default false) and will skip posting if there is already any archived post for that `dateString + persona + postType`:
- Daily digest
- Funding tracker
- Multi-persona digest
- Startup funding brief parts
- FDA updates parts

This blocks repeats caused by cron overlap and retry loops.

## Hiding duplicates in queries and UI

Archive queries accept `dedupe` (default true).

The React archive view requests deduped data and deduped stats so duplicate rows do not show up in the UI.

## One-time cleanup job

### Preflight audit (read every archive row)

Run an archive audit before any deletes. This reports duplicates, reused post URNs, and common content anomalies.

```powershell
npx convex run --push "domains/social/linkedinArchiveAudit:runArchiveAudit" "{pageSize:200,maxRows:200000,includeSamples:true,sampleLimit:25}"
```

### Autonomous maintenance loop (small to full)

Rules:
- Start small. Single function. Dry-run.
- Expand. End-to-end dry-run.
- Full. Real write + re-audit.
- Always regression test after plumbing changes.
- Always update `AGENTS.md` when a new operational process ships.

Loop:
1. Generate and judge (no publish)
2. Dry-run publish
3. Publish
4. Verify archive row includes full metadata
5. Re-run archive audit
6. Run regression tests

### Required announcement before destructive cleanup

Destructive cleanup is gated. You must post a maintenance notice first.

Dry-run (logs the notice to the archive, does not post to LinkedIn):

```powershell
npx convex run --push "domains/social/linkedinArchiveMaintenance:postCleanupAnnouncement" "{dryRun:true}"
```

Post to LinkedIn (creates a real LinkedIn post and logs it to the archive):

```powershell
npx convex run --push "domains/social/linkedinArchiveMaintenance:postCleanupAnnouncement" "{dryRun:false}"
```

### Convex cleanup (archive)

Dry-run:

```powershell
npx convex run --push "domains/social/linkedinArchiveCleanup:cleanupLinkedInArchiveAndLinkedIn" "{dryRun:true,maxScan:5000,maxDeletes:2000,allowLinkedInDeletes:false}"
```

Real delete in Convex only:

```powershell
npx convex run --push "domains/social/linkedinArchiveCleanup:cleanupLinkedInArchiveAndLinkedIn" "{dryRun:false,maxScan:5000,maxDeletes:2000,allowLinkedInDeletes:false}"
```

### Convex cleanup (archive post URN reuse + orphan rows)

This removes:
- Multiple archive rows pointing to the same LinkedIn post URN (keeps best row)
- Orphan archive rows missing both `postId` and `postUrl`

Dry-run:

```powershell
npx convex run --push "domains/social/linkedinArchiveCleanup:cleanupLinkedInArchivePostUrnReuse" "{dryRun:true,maxScan:5000,maxDeletes:5000,deleteOrphansMissingIds:true}"
```

Apply:

```powershell
npx convex run --push "domains/social/linkedinArchiveCleanup:cleanupLinkedInArchivePostUrnReuse" "{dryRun:false,maxScan:5000,maxDeletes:5000,deleteOrphansMissingIds:true}"
```

### LinkedIn cleanup (delete duplicate posts)

This is best-effort and requires `LINKEDIN_ACCESS_TOKEN` to have permissions to delete the posts.

Dry-run (no API deletes):

```powershell
npx convex run --push "domains/social/linkedinArchiveCleanup:cleanupLinkedInArchiveAndLinkedIn" "{dryRun:true,maxScan:5000,maxDeletes:250,allowLinkedInDeletes:true}"
```

Real delete (archive + LinkedIn):

```powershell
npx convex run --push "domains/social/linkedinArchiveCleanup:cleanupLinkedInArchiveAndLinkedIn" "{dryRun:false,maxScan:5000,maxDeletes:250,allowLinkedInDeletes:true}"
```

Safety notes:
- Always run the dry-run first and inspect the returned `linkedInPostUrnsToDelete`.
- Keep `maxDeletes` low for LinkedIn deletes.
- If `unsafeLinkedInPostUrns` is non-empty, do not automate LinkedIn deletes for those URNs.

### Editing existing LinkedIn posts

LinkedIn supports partial updates for some posts. Use dry-run first.

```powershell
npx convex run --push "domains/social/linkedinPosting:updatePostText" "{postUrn:'urn:li:share:...',text:'...',dryRun:true}"
```

Real update:

```powershell
npx convex run --push "domains/social/linkedinPosting:updatePostText" "{postUrn:'urn:li:share:...',text:'...',dryRun:false}"
```

### One-time legacy text edits (optional)

This is for low-risk string fixes (example: "Round: Unknown" -> "Round: Undisclosed").

Preview only:

```powershell
npx convex run --push "domains/social/linkedinArchiveEdits:proposeAndApplyLegacyEdits" "{dryRun:true,mode:'round_unknown_to_undisclosed',maxEdits:25}"
```

Apply edits:

```powershell
npx convex run --push "domains/social/linkedinArchiveEdits:proposeAndApplyLegacyEdits" "{dryRun:false,mode:'round_unknown_to_undisclosed',maxEdits:25}"
```

Unknown placeholder cleanup (example: "Unknown - $250M", "Company: Unknown"):

```powershell
npx convex run --push "domains/social/linkedinArchiveEdits:proposeAndApplyLegacyEdits" "{dryRun:true,mode:'unknown_placeholders_to_undisclosed',maxEdits:25}"
```

Apply:

```powershell
npx convex run --push "domains/social/linkedinArchiveEdits:proposeAndApplyLegacyEdits" "{dryRun:false,mode:'unknown_placeholders_to_undisclosed',maxEdits:25}"
```

### One-time demo URL cleanup (LinkedIn + archive)

Purpose: replace accidental demo/example URLs inside already-posted content with `https://accessdata.fda.gov`.

Preview:

```powershell
npx convex run --push "domains/social/linkedinArchiveEdits:proposeAndApplyLegacyEdits" "{dryRun:true,mode:'demo_urls_to_fda_accessdata',maxEdits:50}"
```

Apply:

```powershell
npx convex run --push "domains/social/linkedinArchiveEdits:proposeAndApplyLegacyEdits" "{dryRun:false,mode:'demo_urls_to_fda_accessdata',maxEdits:50}"
```

### One-time purge of obvious test rows (archive only)

Strict rule: deletes only rows with persona `TEST` or multiple hard test signals (example.com, future date, postId like `t2`, content `TEST POST`).

Preview:

```powershell
npx convex run --push "domains/social/linkedinArchivePurge:scanAndPurgeObviousTestRows" "{dryRun:true,maxScan:200000,maxDeletes:200}"
```

Apply:

```powershell
npx convex run --push "domains/social/linkedinArchivePurge:scanAndPurgeObviousTestRows" "{dryRun:false,maxScan:200000,maxDeletes:200}"
```

## Did You Know (Daily Brief + LinkedIn)

Constraints:
- No em dash, no en dash
- Boolean checks only for gating
- LLM judge required (JSON pass/fail)
- sourcesUsed entries must include `publishedAtIso`

### Generate and judge from URLs

```powershell
npx convex run --push "domains/narrative/didYouKnow:generateAndJudgeDidYouKnowFromUrls" "{workflowId:'exp_dyk_2026_02_02',urls:['https://...','https://...'],tonePreset:'homer_bot_clone',preferLinkup:true}"
```

### Post standalone to LinkedIn (ad hoc)

Dry-run:

```powershell
npx convex run --push "workflows/dailyLinkedInPost:postDidYouKnowToLinkedIn" "{persona:'GENERAL',dryRun:true,urls:['https://...','https://...'],tonePreset:'homer_bot_clone'}"
```

Apply (real post + archive log):

```powershell
npx convex run --push "workflows/dailyLinkedInPost:postDidYouKnowToLinkedIn" "{persona:'GENERAL',dryRun:false,urls:['https://...','https://...'],tonePreset:'homer_bot_clone'}"
```

Post-run verification:

```powershell
npx convex run --push "domains/social/linkedinArchiveQueries:getArchivedPosts" "{postType:'did_you_know',limit:10,dedupe:true}"
npx convex run --push "domains/social/linkedinArchiveAudit:runArchiveAudit" "{pageSize:200,maxRows:200000,includeSamples:false}"
```

### Inject into Daily Brief (override URLs)

Find latest memory:

```powershell
npx convex run --push "domains/research/dailyBriefMemoryQueries:getLatestMemoryInternal" "{}"
```

Generate executive brief with Did You Know override:

```powershell
npx convex run --push "domains/research/executiveBrief:generateExecutiveBriefForMemoryInternal" "{memoryId:'<dailyBriefMemoryId>',forceRefresh:true,didYouKnowUrls:['https://...','https://...'],didYouKnowTonePreset:'homer_bot_clone'}"
```

## Validator: LLM explanation without affecting scoring

`validateWorkflowRun` can optionally generate an LLM explanation tied to the scored booleans.

```powershell
npx convex run --push "domains/narrative/tests/qaFramework:validateWorkflowRun" "{workflowId:'<workflowId>',includeLlmExplanation:true}"
```

## Closed Loop Verification Coverage Map

Rule: boolean gates decide pass or fail. Optional LLM explanations are allowed but do not affect scoring.

### LinkedIn plane
- Post generation: `workflows/dailyLinkedInPost:testLinkedInWorkflow` (dry-run)
- Archive invariants: `domains/social/linkedinArchiveAudit:runArchiveAudit` (must be clean before deletes)
- Cleanup tooling: `domains/social/linkedinArchiveCleanup:*` (dry-run first)

### Daily Brief plane
- Generate: `domains/research/executiveBrief:generateExecutiveBriefForMemoryInternal`
- Did You Know: brief `didYouKnow.passed=true`, `sourcesUsed[].publishedAtIso` present, `llmJudge.passed=true`

### Narrative production plane
- Deterministic QA lane: `domains/narrative/tests/qaFramework:runFullSuite` (CI gate)
- Per-run validator: `domains/narrative/tests/qaFramework:validateWorkflowRun` (persisted-output scoring)

### Feed ingestion plane
- Ingest: `feed:ingestAll` or `feed:ingest*Internal`
- Spot check: `feed:*` reader queries, entityKeys present, no placeholder values

### Privacy and retention plane
- Scheduled enforcement: `domains/operations/privacyEnforcement:*`
- Safety: dry-run where supported, never delete without audit trail

### MCP server plane (Render)
- Health: `curl https://nodebench-mcp-core-agent.onrender.com/health` (must return `{"status":"ok"}`)
- Tools list: `tools/list` JSON-RPC 2.0 call returns 7 tools (3 planning + 4 memory)
- Smoke test: `tools/call` with `createPlan` and verify `planId` returned
- Auth: Token required when `MCP_HTTP_TOKEN` is set; 401 on missing/wrong token

### File vault plane (Obsidian + Git)
- Init: `npm run vault:init`
- Health check: `npm run vault:health` (writes `.tmp/vault_health_report.json`, boolean exit code)
- Quorum merge: `npm run vault:merge` (writes `vault/master/merge_report.json`)
- Rules: `vault/SOP.md` (kebab-case, required frontmatter keys, no broken wikilinks)

## Self maintenance (nightly, autonomous)

Purpose: run invariant audits, persist a boolean-gated report, attach an optional LLM explanation.

Manual run:

```powershell
npx convex run --push "domains/operations/selfMaintenance:runNightlySelfMaintenance" "{includeLlmExplanation:true,didYouKnowPostLimit:10}"
```

Strict Daily Brief Did You Know gate (use for experiments and rollout checks):

```powershell
npx convex run --push "domains/operations/selfMaintenance:runNightlySelfMaintenance" "{includeLlmExplanation:true,didYouKnowPostLimit:10,requireDailyBriefDidYouKnow:true}"
```

Fetch latest snapshot (stored in `checkpoints`):

```powershell
npx convex run --push "domains/operations/selfMaintenance:getLatestSelfMaintenanceSnapshot" "{}"
```

Cron:
- `convex/crons.ts` schedules `domains/operations/selfMaintenance:runNightlySelfMaintenanceCron` daily.

## Bug loop (Ralph-style back pressure)

Goal: errors become deduped cards, humans approve, agent does legwork, humans review.

Card substrate: `agentTaskSessions` rows with `metadata.kind='bug_card'` and deterministic `metadata.signature`.

Client capture (prod only):
- `src/main.tsx` reports `window.error` and `unhandledrejection` to `domains/operations/bugLoop:reportClientError` with local rate limit.

Manual triage:

```powershell
npx convex run --push "domains/operations/bugLoop:listBugCards" "{limit:50}"
```

Move card to Ralph investigation:

```powershell
npx convex run --push "domains/operations/bugLoop:moveBugCard" "{sessionId:'<agentTaskSessionsId>',toColumn:'ralph_investigate'}"
```

This schedules an investigation artifact (LLM-generated plan, no claims of fix) and attaches it to the session metadata.

Export bug cards to the file vault (external filesystem context preservation):

```powershell
npm run bugloop:export:vault
```

## MCP Server Deployment (Render)

NodeBench AI exposes MCP tools as HTTP services for external agents to consume.

### Architecture

Four MCP servers, each deployed as a separate Render web service:

| Service | Runtime | Tools | Default Port |
|---------|---------|-------|-------------|
| `nodebench-mcp-core-agent` | Node.js (TypeScript) | createPlan, updatePlanStep, getPlan, writeAgentMemory, readAgentMemory, listAgentMemory, deleteAgentMemory | 4001 |
| `nodebench-mcp-openbb` | Python (FastAPI) | Financial market data, SEC filings, funding events | 8001 |
| `nodebench-mcp-research` | Python (FastAPI) | Multi-source fusion search, iterative research with reflection | 8002 |
| `nodebench-mcp-gateway` | Node.js (TypeScript) | 51 tools: research (8), narrative (10), verification (7), knowledge (8), documents (18) — full Convex proxy | 4002 |

All servers speak JSON-RPC 2.0 over HTTP POST. Render injects `PORT` at runtime.

### Gateway tool catalog

The gateway server (`nodebench-mcp-gateway`) proxies Convex queries and actions for external agents:

**Research & Intelligence (8 tools)**
- `getForYouFeed` — Personalized feed with verification-tagged items
- `getLatestDashboard` — Dashboard metrics (deal flow, coverage, costs)
- `getTrendingRepos` / `getFastestGrowingRepos` — GitHub intelligence
- `getLatestPublicDossier` — Company/industry competitive dossier
- `getDealFlow` — Funding events and investment signals
- `getEntityInsights` — Deep entity analysis with persona hooks (banker, VC, CTO, founder)
- `getSignalTimeseries` — Time-series signal data

**DRANE Narrative Engine (10 tools)**
- `getPublicThreads` / `getThread` / `searchThreads` / `getThreadsByEntity` — Thread discovery
- `getThreadsWithEvents` / `getThreadStats` — Thread overviews
- `getThreadPosts` — Analyst notes and thesis updates
- `getOpenDisputes` / `getContradictoryPosts` — Contradiction detection
- `runNewsroomPipeline` — Trigger Scout > Historian > Analyst > Publisher pipeline

**Verification Pipeline (7 tools)**
- `getVerificationSummary` — Trust scores by verdict (VERIFIED through INSUFFICIENT)
- `getVerificationsForFact` / `getFactById` / `getFactsByRun` — Fact-checking
- `getArtifactsWithHealth` — Source health status
- `getCalibrationStats` / `getSloMetricsSummary` — Pipeline performance

**Knowledge Graph (8 tools)**
- `searchEntityContexts` / `getEntityContext` / `getEntityContextByName` — Entity lookup
- `listEntityContexts` / `getEntityContextStats` — Knowledge base browsing
- `getKnowledgeGraph` / `getKnowledgeGraphClaims` — Graph and claim extraction
- `getSourceRegistry` — Source reliability and freshness

**Documents & Files (18 tools)**
- `createDocument` / `createDocumentWithContent` / `getDocument` / `updateDocument` — Document CRUD
- `archiveDocument` / `restoreDocument` — Soft delete and restore
- `searchDocuments` / `listDocuments` — Title search and listing
- `createFolder` / `listFolders` / `getFolderWithDocuments` — Folder management
- `addDocumentToFolder` / `removeDocumentFromFolder` — Folder organization
- `createSpreadsheet` / `listSpreadsheets` — Spreadsheet CRUD
- `getSpreadsheetRange` / `applySpreadsheetOperations` — Cell-level spreadsheet operations
- `listFiles` — File listing with type filtering

### Blueprint deploy

```powershell
# render.yaml at repo root defines all 4 services.
# Connect the repo in Render Dashboard > Blueprints > New Blueprint Instance.
# Set secrets (sync: false vars) in the Render dashboard:
#   MCP_HTTP_TOKEN, CONVEX_BASE_URL, CONVEX_ADMIN_KEY, MCP_SECRET
#   OPENBB_API_KEY, CONVEX_URL
```

### Local dev (Docker Compose)

```powershell
cd python-mcp-servers && docker compose up --build
```

Core agent (TypeScript) standalone:

```powershell
cd mcp_tools/core_agent_server && npm install && npm run start:http
```

Gateway (TypeScript) standalone:

```powershell
cd mcp_tools/gateway_server && npm install && npm run start:http
```

### External agent connection

Any MCP-compatible agent (Claude Desktop, Cursor, custom) can connect:

```jsonc
// claude_desktop_config.json or equivalent
{
  "mcpServers": {
    "nodebench-planning": {
      "url": "https://nodebench-mcp-core-agent.onrender.com",
      "transport": "http",
      "headers": { "x-mcp-token": "<YOUR_TOKEN>" }
    },
    "nodebench-gateway": {
      "url": "https://nodebench-mcp-gateway.onrender.com",
      "transport": "http",
      "headers": { "x-mcp-token": "<YOUR_TOKEN>" }
    }
  }
}
```

JSON-RPC 2.0 protocol:

```bash
# List tools
curl -X POST https://nodebench-mcp-core-agent.onrender.com \
  -H "Content-Type: application/json" \
  -H "x-mcp-token: $MCP_HTTP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Call a tool
curl -X POST https://nodebench-mcp-core-agent.onrender.com \
  -H "Content-Type: application/json" \
  -H "x-mcp-token: $MCP_HTTP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"createPlan","arguments":{"goal":"Research NVIDIA","steps":[{"step":"Find SEC filings","status":"pending"}]}}}'
```

### Health checks

```bash
curl https://nodebench-mcp-core-agent.onrender.com/health
curl https://nodebench-mcp-openbb.onrender.com/health
curl https://nodebench-mcp-research.onrender.com/health
curl https://nodebench-mcp-gateway.onrender.com/health
```

### Verification scripts

After deploying to Render, run the verification script to test all endpoints:

```powershell
# PowerShell (Windows)
.\scripts\verify-mcp-deployment.ps1 -Token $env:MCP_HTTP_TOKEN

# Bash (Unix/Linux/macOS)
./scripts/verify-mcp-deployment.sh $MCP_HTTP_TOKEN
```

The scripts test:
- Health endpoints for all 4 servers
- JSON-RPC `tools/list` for core-agent and gateway
- Root endpoints for OpenBB and Research servers

## What to watch for next

Common follow-on issues:
- Backfilled archive entries can exceed 2900 chars and will not match actual posted content
- Encoding or Unicode issues can produce mojibake like "â" in archive content
- "Demo" content leakage if any workflow still has mock data enabled (fix with `demo_urls_to_fda_accessdata`)

Recommended checks:
- Run `getArchiveStats` with `dedupe:true` and ensure counts match UI expectations
- Periodically run the cleanup job in dry-run mode for monitoring only
- `workflows/dailyLinkedInPostMutations:clearArchive` now requires confirm arg and should only be used for full resets

---

## Agent Protocol (Peter Style)
- Role: Specialized builder agent. Peter is the Architect.
- Objective: Close-the-loop verification cycle. Iterate until green.
- Communication: High-level architecture. Peter handles taste/vision. You handle plumbing/verification.

## Closed Loop (Verification)
- Step 1: Compile. Build clean.
- Step 2: Lint. Style clean. No warnings.
- Step 3: Test. Run automated suites.
- Step 4: Self-debug. If 1-3 fail: read logs, hypothesize, fix, restart loop.
- Goal: Never present changes to Architect without full local green loop.

## Git Workflow
- PRs = Prompt Requests. Submit intent (prompt), not just code.
- Weaving. Integrate changes into existing architecture. Keep design consistent.
- Commits: Atomic only. Conventional Commits: `feat`, `fix`, `refactor`.
- Parallelism: Multiple agents (3-8) in a 3x3 terminal grid. Stay in assigned subspace.

## Architecture and Conventions
- Hierarchy: System understanding first. Avoid line-by-line thrash.
- Refactoring: If bloat/mess detected, propose weave into cleaner plugin architecture.
- Bugs: Every fix ships with a regression test.

## Environment and Tools
- CLI: Primary driver `codex` CLI or similar.
- Sandbox: Run loops inside Docker or fast local environment.
- Validation: Use `pnpm test` or `gh run` to verify CI locally.

## Style Guidelines
- Output: Telegraphic. Drop filler grammar.
- Min tokens: Concise. No conversational overhead.
- Taste: If UI feels clunky, ask for taste check before proceeding.

## Why this format
- AGENTS.md replaces manual onboarding and "vibe coding".
- Constraint: strict automated verification loop. Prevents slop at scale.

---

## Top 10 Claude Code Power-User Tips

### 1. Work in parallel
Set up 3-5 git worktrees, each with its own Claude session. Single biggest productivity unlock.

### 2. Plan mode first
Complex tasks always start with a plan. Pour energy into planning → Claude implements in one shot. Pro tip: Have a second session review the plan as a "Staff Engineer."

### 3. Maintain CLAUDE.md
After every correction: "Update your CLAUDE.md so you don't make that mistake again." Claude writes excellent rules for itself. Mistake rate drops measurably over time.

### 4. Build your own skills
Repetitive tasks → skill or slash command. Example: `/techdebt` at the end of every session to find duplicated code. Commit skills to git and reuse across projects.

### 5. Automate bug fixes
Enable Slack MCP, paste a bug thread, say "fix." Or: "Go fix the failing CI tests." Don't micromanage -- Claude finds the way.

### 6. Better prompts
- "Grill me on these changes -- no PR until I pass your test"
- "Knowing everything you know now, scrap this and implement the elegant solution"
- Detailed specs = better output

### 7. Use subagents
Append "use subagents" to requests for more compute. Offload tasks to subagents to keep main context clean.

### 8. Data & Analytics
Claude + bq CLI = metrics on the fly. "I haven't written a line of SQL in 6+ months."

### 9. Voice Dictation
You speak 3x faster than you type. Prompts automatically get more detailed. (fn x2 on macOS)

### 10. Learn with Claude
Enable "Explanatory" output style, generate HTML presentations or ASCII diagrams. Claude explains the why behind changes.
