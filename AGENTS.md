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
- **Engagement quality gate** (deterministic, pre-post): see below

### LinkedIn Engagement Quality Gate

Automated org page posts currently read like machine-generated reports. 67 posts yielded 1 genuine human comment. The gate below is a set of boolean checks that run BEFORE posting to LinkedIn. Posts that fail are flagged for rewrite or held.

**Anti-patterns (boolean FAIL if detected)**:
- `noReportHeader`: First 2 lines must NOT be a title card ("Daily Intelligence Brief", "VC DEAL FLOW MEMO", etc.). LinkedIn shows ~2 lines before fold — waste them on a header and nobody clicks "see more"
- `hasHook`: First sentence must be a concrete claim, surprising stat, or contrarian take — not a label
- `noWallOfText`: No more than 3 consecutive structured blocks (bullet lists, `═══` headers). Break with a 1-sentence human observation between sections
- `hasQuestion`: Post must contain at least one genuine question to the audience (not rhetorical). Questions drive comments
- `noGenericHashtags`: Must NOT use `#AI`, `#TechIntelligence`, `#DailyBrief` alone — these attract bots. Use specific hashtags tied to the content (`#Medtronic`, `#FDAApproval`, `#SeriesB`)
- `underCharLimit`: Max 1500 chars for org page daily posts (not 2900). Shorter posts get higher engagement on LinkedIn
- `hasOpinion`: Post must contain at least one first-person interpretive statement ("This signals...", "The real story here is...", "Watch for..."). Pure information delivery gets no engagement

**Soft checks (logged, not blocking)**:
- `mentionsPeople`: Tags or names specific people/companies who might respond
- `hasCallToAction`: Ends with a specific ask ("What's your read on this?", "Anyone seeing this in their portfolio?")
- `variesFormat`: Post format differs from the last 3 posts in archive (avoid predictability)

**Engagement feedback loop** (post-hoc, runs on cron):
- `fetchPostComments` scans org page posts 48h after posting
- Comments classified: genuine human / bot-engagement / promotional spam / no comments
- Posts with genuine comments: their format, hook, and structure are logged as "winning patterns"
- Posts with 0 engagement after 48h: flagged for format review
- Weekly engagement digest: ratio of genuine comments to total posts, trend over time

**Implementation**: Add these checks as a `validatePostEngagement` function in `linkedinPosting.ts` that runs before `createTargetedTextPost`. Failed checks return `{ passed: false, failures: string[] }` and the post is held for rewrite rather than silently posted.

**Personal profile posts** (agent-initiated) are exempt from this gate — they are written by the user or agent with personal voice already.

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

### MCP Unified Server plane (Render) — 76 tools, 9 domains
- Health: `curl https://nodebench-mcp-unified.onrender.com/health` (must return `{"status":"ok","tools":76}`)
- Tools list: `tools/list` returns 76 tools across research, narrative, verification, knowledge, documents, planning, memory, search, financial + findTools meta-tool
- Architecture: Convex-side dispatcher at `/api/mcpGateway`
  - Gateway calls single endpoint with `x-mcp-secret` header (no admin key)
  - Convex httpAction validates secret, resolves function from static allowlist, injects userId server-side
  - Admin key never exposed to gateway service
  - Financial tools call public APIs directly (Stooq, Yahoo Finance, World Bank) — no Convex dispatch
- Auth model (dispatcher allowlist groups):
  - Group A (25 public queries): no userId needed, dispatched directly
  - Group B (8 internal MCP variants): userId injected server-side via `MCP_SERVICE_USER_ID` Convex env var
  - Group C (20 document internal endpoints): userId injected server-side
  - Group D (5 agent planning): key-based lookup, no userId needed
  - Group E (6 agent memory): key-based lookup, no userId needed
  - Group F (3 search/research): public actions dispatched directly
  - `runNewsroomPipeline`: returns structured error in guest mode (requires user auth)
- Smoke tests:
  - `curl -X POST <url>/api/mcpGateway -d '{"fn":"getForYouFeed"}' -H "Content-Type: application/json"` — 401 (no secret)
  - Same with `x-mcp-secret` header — returns feed items
  - `{"fn":"mcpCreateDocument","args":{"title":"Test"}}` — creates doc (userId injected server-side)
  - `{"fn":"createPlan","args":{"plan":{"id":"test","goal":"Test","steps":[],"createdAt":"...","updatedAt":"..."}}}` — creates plan
  - `{"fn":"doesNotExist"}` — 400 with helpful error
  - `equity_price_quote` with `symbol: "AAPL"` — returns price data (direct HTTP, no dispatcher)
  - `findTools` with `query: "stock price"` — returns matching financial tools
- Env vars required (Render service): `CONVEX_URL`, `MCP_SECRET`, `MCP_HTTP_TOKEN` (optional)
- Env vars required (Convex dashboard): `MCP_SERVICE_USER_ID`, `MCP_SECRET`

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

Single unified MCP server deployed on Render ($7/mo starter plan):

| Service | Runtime | Tools | Default Port |
|---------|---------|-------|-------------|
| `nodebench-mcp-unified` | Node.js (TypeScript) | 76 tools across 9 domains + findTools meta-tool | 10000 |

**Domains**: research (8), narrative (10), verification (7), knowledge (8), documents (20), planning (3), memory (4), search (3), financial (9), meta (1 — findTools)

The server speaks JSON-RPC 2.0 over HTTP POST. Render injects `PORT` at runtime. All Convex-backed tools route through a single dispatcher at `/api/mcpGateway`. Financial tools call public APIs directly (Stooq, Yahoo Finance, World Bank).

### Tool catalog

The unified server (`nodebench-mcp-unified`) exposes 76 tools across 9 domains:

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

**Documents & Files (20 tools)** — all route to internal MCP endpoints, userId injected by Convex-side dispatcher
- `createDocument` / `createDocumentWithContent` / `getDocument` / `updateDocument` — Document CRUD
- `archiveDocument` / `restoreDocument` — Soft delete and restore
- `searchDocuments` / `listDocuments` — Title search and listing
- `exportDocumentToMarkdown` — ProseMirror JSON → Markdown export
- `duplicateDocument` — Clone document with content/icon/type
- `createFolder` / `listFolders` / `getFolderWithDocuments` — Folder management
- `addDocumentToFolder` / `removeDocumentFromFolder` — Folder organization
- `createSpreadsheet` / `listSpreadsheets` — Spreadsheet CRUD
- `getSpreadsheetRange` / `applySpreadsheetOperations` — Cell-level spreadsheet operations
- `listFiles` — File listing with type filtering

**Agent Planning (3 tools)** — via Convex dispatcher
- `createPlan` — Create a task plan with steps (pending/in_progress/completed)
- `updatePlanStep` — Update status or notes of a specific plan step
- `getPlan` — Retrieve a task plan by ID

**Agent Memory (4 tools)** — via Convex dispatcher
- `writeAgentMemory` — Store key-value memory with optional metadata
- `readAgentMemory` — Read memory entries by key
- `listAgentMemory` — List memory entries with optional text search
- `deleteAgentMemory` — Delete a memory entry by key

**Search & Research (3 tools)** — via Convex dispatcher
- `quickSearch` — Fast multi-source search
- `fusionSearch` — Advanced fusion search with mode selection
- `getMigrationStats` — Model migration statistics

**Financial Data (9 tools)** — direct HTTP to public APIs (Stooq, Yahoo Finance, World Bank)
- `equity_price_quote` — Real-time stock quote (Stooq → Yahoo fallback)
- `equity_price_historical` — Historical OHLCV data
- `equity_fundamental_overview` — Company fundamentals from Yahoo Finance
- `crypto_price_quote` — Cryptocurrency price quote
- `crypto_price_historical` — Historical crypto OHLCV data
- `economy_gdp` — GDP data by country (World Bank)
- `economy_inflation` — Inflation data by country (World Bank)
- `news_company` — Company-specific financial news
- `news_world` — Global financial news headlines

**Meta (1 tool)**
- `findTools` — Search available tools by keyword or capability description. Returns matching tool names and descriptions. Use this to discover which tools are available for a task.

### Blueprint deploy

```powershell
# render.yaml at repo root defines the unified service.
# Connect the repo in Render Dashboard > Blueprints > New Blueprint Instance.
# Set secrets (sync: false vars) in the Render dashboard:
#   MCP_HTTP_TOKEN, CONVEX_URL, MCP_SECRET
# Convex dashboard env vars: MCP_SERVICE_USER_ID, MCP_SECRET
```

### Local dev

```powershell
cd mcp_tools/gateway_server && npm install && npm run start:http
```

### External agent connection

Any MCP-compatible agent (Claude Desktop, Cursor, custom) can connect:

```jsonc
// claude_desktop_config.json or equivalent
{
  "mcpServers": {
    "nodebench": {
      "url": "https://nodebench-mcp-unified.onrender.com",
      "transport": "http",
      "headers": { "x-mcp-token": "<YOUR_TOKEN>" }
    }
  }
}
```

JSON-RPC 2.0 protocol:

```bash
# List all 76 tools
curl -X POST https://nodebench-mcp-unified.onrender.com \
  -H "Content-Type: application/json" \
  -H "x-mcp-token: $MCP_HTTP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Discover tools by keyword
curl -X POST https://nodebench-mcp-unified.onrender.com \
  -H "Content-Type: application/json" \
  -H "x-mcp-token: $MCP_HTTP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"findTools","arguments":{"query":"stock price"}}}'

# Call a tool
curl -X POST https://nodebench-mcp-unified.onrender.com \
  -H "Content-Type: application/json" \
  -H "x-mcp-token: $MCP_HTTP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"createPlan","arguments":{"goal":"Research NVIDIA","steps":[{"step":"Find SEC filings","status":"pending"}]}}}'
```

### Health check

```bash
curl https://nodebench-mcp-unified.onrender.com/health
# Returns: {"status":"ok","service":"nodebench-mcp-unified","tools":76,"categories":["research","narrative","verification","knowledge","documents","planning","memory","search","financial"]}
```

## LinkedIn Posting Targets (Personal vs Organization Page)

All automated cron-triggered posts now route to a **LinkedIn Organization Page** instead of the personal profile. Personal profile remains available for manual/agent-initiated posts.

### Architecture

Two posting targets:
- `personal` — User's personal LinkedIn profile (via `LINKEDIN_ACCESS_TOKEN` + `urn:li:person:{id}`)
- `organization` — Company page (via `LINKEDIN_ORG_ACCESS_TOKEN` + `urn:li:organization:{LINKEDIN_ORG_ID}`)

Routing is handled by `createTargetedTextPost` internal action in `domains/social/linkedinPosting.ts`. It reads `LINKEDIN_DEFAULT_TARGET` env var as fallback when no explicit target is passed.

### Required Convex environment variables

| Variable | Purpose |
|----------|---------|
| `LINKEDIN_ORG_ACCESS_TOKEN` | OAuth token with `w_organization_social` + `r_organization_social` scopes for the Company Page |
| `LINKEDIN_ORG_ID` | Numeric organization ID (constructs `urn:li:organization:{id}`) |
| `LINKEDIN_DEFAULT_TARGET` | Set to `organization` for crons to default to org page |
| `LINKEDIN_ACCESS_TOKEN` | Existing personal profile token (unchanged) |

### Posting rules

| Context | Default target | Override |
|---------|---------------|----------|
| Cron-triggered posts (daily digest, funding, FDA, research, clinical, M&A) | `organization` | Hardcoded in workflow |
| Manual triggers (`linkedinTrigger.ts`) | `organization` | Pass `target: "personal"` to override |
| Agent tool (`postToLinkedIn`) | `personal` | Pass `target: "organization"` to override |
| Archive maintenance / corrections | `organization` | — |

### Posting frequency (org page)

Current: 8+ posts/day. Recommended: **2-3 posts/day max**.

LinkedIn's algorithm penalizes accounts that post too frequently — each post competes with your other posts for follower impressions. Consolidate: instead of separate daily_digest + funding_brief + fda_update + research + clinical + ma posts, batch the day's intelligence into 1-2 high-quality posts with the strongest hooks, plus 1 specialized deep-dive (FDA or funding) if the day's data warrants it. Skip days with weak signals entirely.

### Content principles for engagement

What gets engagement on LinkedIn (from analyzing 67 posts, 1 genuine comment):
1. **Hook in line 1** — A surprising stat, contrarian take, or specific claim. Not a title card
2. **Opinion, not just information** — "Here's what I think this means" beats "Here are the facts"
3. **Questions** — Ask the audience something specific. "Anyone seeing this trend in their portfolio?"
4. **Short** — 800-1200 chars outperforms 2500+ chars on LinkedIn. Leave them wanting more
5. **Specific hashtags** — `#Medtronic #FDAApproval` beats `#AI #TechIntelligence`
6. **Vary format** — Same structure every day = predictable = ignorable

What kills engagement:
- Report headers as first line
- Walls of structured text with `═══` dividers
- Generic hashtags that attract bots
- No question, no opinion, no personality
- Posting 8x/day (signal dilution)

### Rollback

Set `LINKEDIN_DEFAULT_TARGET=personal` in Convex dashboard to instantly revert all crons to personal posting without code changes.

### Verification

Test org posting:

```powershell
npx convex run workflows/linkedinTrigger:postTechnicalReport '{"content":"Org test post","dryRun":true,"target":"organization"}'
```

Live test:

```powershell
npx convex run workflows/linkedinTrigger:postTechnicalReport '{"content":"NodeBench AI - Organization page test.","target":"organization"}'
```

Check archive for target field:

```powershell
npx convex run --push "domains/social/linkedinArchiveQueries:getArchivedPosts" "{limit:10,dedupe:true}"
```

New archive rows include `target: "personal" | "organization"`. Existing rows without a target are implicitly `"personal"`.

### Comment fetching (API limitation)

`r_member_social` is a **closed LinkedIn permission** — not available for new applications. This means:
- **Personal post comments/reactions CANNOT be fetched via API** — must be viewed manually on linkedin.com
- **Organization post comments CAN be fetched** via `r_organization_social` scope on the org token
- `fetchPostComments` in `linkedinPosting.ts` defaults to org token for this reason
- Org token requires both `w_organization_social` (post) and `r_organization_social` (read comments)

## LinkedIn Content Pipeline

All content flows through a queue-based pipeline before posting to the org page:

```
Content Sources → linkedinContentQueue → Judge → Schedule → Post → Archive
```

### Pipeline stages

1. **Enqueue** — Content enters `linkedinContentQueue` table via:
   - `backfillPersonalToQueue`: Loads 67 personal archive posts (one-time)
   - Fresh cron-generated content (daily digests, funding, FDA, etc.)
   - Manual additions
   - 3-layer dedup: content hash → queue check → org archive check

2. **Judge** (cron: every 30 min, `batchJudgePending`)
   - **Engagement gate** (existing 7 boolean checks): noReportHeader, hasHook, noWallOfText, hasQuestion, noGenericHashtags, underCharLimit, hasOpinion
   - **LLM judge** (3 boolean criteria): hookQuality, opinionDepth, questionAuthenticity
   - Verdict: `approve` (all pass) | `needs_rewrite` (1-2 fail) | `reject` (all fail or 3+ gate failures)
   - Model: devstral-2-free ($0.00/M via OpenRouter)

3. **Schedule** (cron: hourly, `scheduleNextApprovedPost`)
   - 3 time slots for org page:
     - `org_morning`: 8 AM UTC, Mon-Fri
     - `org_midday`: 1 PM UTC, Mon/Wed/Fri
     - `org_afternoon`: 4 PM UTC, Tue/Thu
   - Priority-based: manual (90+) > fresh (60-80) > backfill (40-60)

4. **Post** (cron: hourly, `processQueuedPost`)
   - Posts due items via `createTargetedTextPost` (engagement gate skipped — already judged)
   - Logs to `linkedinPostArchive` with `queueId` in metadata

### Status flow

```
pending → judging → approved → scheduled → posted
                  → needs_rewrite (fixable)
                  → rejected (permanently weak)
                                            → failed (posting error)
```

### Monitoring

```powershell
# Queue stats (counts by status/source/target)
npx convex run domains/social/linkedinContentQueue:getQueueStats

# List items by status
npx convex run domains/social/linkedinContentQueue:listQueueItems '{"status":"pending","limit":10}'
npx convex run domains/social/linkedinContentQueue:listQueueItems '{"status":"approved","limit":10}'
npx convex run domains/social/linkedinContentQueue:listQueueItems '{"status":"scheduled","limit":10}'

# Backfill personal posts (dry run first)
npx convex run domains/social/linkedinScheduleGrid:backfillPersonalToQueue '{"limit":67,"dryRun":true}'
npx convex run domains/social/linkedinScheduleGrid:backfillPersonalToQueue '{"limit":67,"dryRun":false}'

# Manual judge trigger
npx convex run domains/social/linkedinQualityJudge:batchJudgePending '{"limit":5}'

# Manual schedule trigger
npx convex run domains/social/linkedinScheduleGrid:scheduleNextApprovedPost '{"target":"organization"}'
```

### Key files

- `convex/domains/social/linkedinContentQueue.ts` — Queue CRUD, dedup, stats
- `convex/domains/social/linkedinQualityJudge.ts` — LLM judge + batch processor
- `convex/domains/social/linkedinScheduleGrid.ts` — Time slots, scheduling, backfill
- `convex/domains/social/linkedinPosting.ts` — Queue processor (`processQueuedPost`)

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

## 6-Phase Iterative Deep-Dive Verification Process

Standard verification workflow for any non-trivial implementation. Run this before declaring any integration, migration, or protocol-level change "done."

### Phase 1: Context Gathering (Parallel Subagent Deep Dive)

Launch parallel subagents to research reference materials:
- **SDK/Protocol research**: Latest spec versions, blogs, announcements, GitHub repos, official SDKs
- **Implementation deep dive**: Audit current codebase for patterns, inconsistencies, unused code
- **Dispatcher/backend audit**: Verify function signatures, allowlists, argument shapes match
- **External API research**: Check if third-party APIs still work, find known breaking changes

Goal: Build a comprehensive picture of "what production looks like" vs "what we have."

### Phase 2: Gap Analysis

Compare Phase 1 findings against current implementation. Categorize gaps:
- **CRITICAL**: Protocol violations, broken responses, security issues
- **HIGH**: API incompatibilities, silent failures, wrong data formats
- **MEDIUM**: Outdated versions, missing features, suboptimal patterns
- **LOW**: Missing error handling for edge cases, cosmetic issues

Output: Numbered gap list with severity, root cause, and fix strategy.

### Phase 3: Implementation

Apply fixes following production patterns exactly. Rules:
- Fix CRITICAL and HIGH gaps first
- Each fix is a discrete, testable change
- Follow the reference pattern found in Phase 1 — don't invent new patterns
- Document why each change was made (comments in code where non-obvious)

### Phase 4: Testing & Validation (CRITICAL — Multi-Layer)

Layer 1: **Static analysis** — TypeScript `tsc --noEmit`, Convex typecheck
Layer 2: **Unit tests** — Run existing test suites, add targeted tests for fixes
Layer 3: **Integration tests** — End-to-end flow through dispatcher/handler chain
Layer 4: **Manual verification** — Spot-check critical paths with curl or direct invocation
Layer 5: **Live end-to-end** — Deploy to staging, hit real endpoints, verify real responses

All layers must pass before proceeding to Phase 5.

### Phase 5: Self-Closed-Loop Verification (Parallel Subagents)

Launch parallel verification subagents, each checking a different dimension:
- **Spec compliance**: Does every response match the protocol spec exactly?
- **Functional correctness**: Do tools return correct data for known inputs?
- **Argument compatibility**: Do all handler→backend function pairs have matching shapes?

Each subagent produces a PASS/FAIL checklist. Any FAIL loops back to Phase 3.

### Phase 6: Document Learnings

Update AGENTS.md (this file) with:
- Edge cases discovered during verification
- Key learnings that prevent future regressions
- Updated verification coverage map entries

---

### Edge Cases & Learnings (from MCP Unified Server verification)

**MCP Protocol**:
- `tools/call` responses MUST use `result.content` array with `{type: "text", text: "..."}` items and `isError: boolean`. Tool execution errors return `isError: true` at HTTP 200 — NOT JSON-RPC error objects. JSON-RPC errors are reserved for protocol-level failures only.
- All valid JSON-RPC responses (including `error` responses like method-not-found) should return HTTP 200. Non-200 is only for transport-level failures (parse errors, malformed HTTP).
- Protocol version matters. Clients may reject outdated versions. Keep `protocolVersion` in `initialize` response current (currently `2025-11-25`).

**Financial APIs**:
- **Stooq**: Crypto symbols use `.V` suffix (`BTC.V`, `ETH.V`), NOT `-USD`. Has undocumented daily rate limit — response body contains "Exceeded the daily hits limit" when hit. CSV format, no auth required.
- **Yahoo Finance v7**: Effectively broken since ~2025 — returns 401 without crumb/cookie auth. Use as fallback only, expect failures. `equity_fundamental_overview` has no alternative source — documented limitation.
- **World Bank API v2**: Stable, no auth, correct indicators: `NY.GDP.MKTP.CD` (GDP), `FP.CPI.TOTL.ZG` (inflation). Response is `[metadata, data]` array — always index `[1]` for actual data.

**Dispatcher Pattern**:
- All 9 gateway tool handler → Convex function pairs verified compatible by argument shape analysis
- Planning/memory tools use key-based lookup (no userId injection needed)
- Search tools are public actions (no userId injection needed)
- Document tools require userId injection via `MCP_SERVICE_USER_ID` env var

### Edge Cases & Learnings (from LinkedIn Content Pipeline verification)

**Convex Runtime Constraints**:
- `"use node"` files can ONLY export actions (`internalAction`, `action`). Mutations and queries must live in separate non-node files. Violating this causes silent deployment failures.
- Index predicates MUST use `.withIndex("name", (q) => q.eq("field", value))` — NOT `.withIndex("name").filter(...)`. The latter compiles but bypasses the index, causing full table scans.
- Pure helper functions (no Convex context) CAN be imported across `"use node"` boundaries. Only exports that use `ctx` are restricted.
- `crypto` module is unavailable in Convex runtime (non-node files). Use pure JS hashes like cyrb53 for content deduplication instead of SHA-256.

**Content Pipeline Design**:
- Archive dedup uses `.take(500)` lookback — posts beyond 500 could theoretically slip through as duplicates. Acceptable trade-off: archive grows slowly (2-3 posts/day) and 500 covers ~6 months of history.
- `getScheduledDueNow` collects all scheduled items then filters in JS (no `<=` index predicate available in Convex). Acceptable at current scale (<100 scheduled items).
- Concurrent `enqueueContent` calls could race past the hash uniqueness check. Low risk at 2-3 posts/day cadence, and the `by_content_hash` index provides a second layer of protection on read.
- `Date.setUTCDate()` correctly handles month boundary overflow (e.g., Jan 31 + 1 = Feb 1). No manual month arithmetic needed.

**LLM Judge Pattern**:
- FREE-FIRST model strategy: `devstral-2-free` ($0.00/M via OpenRouter) handles quality judging. Fallback chain via `getLanguageModelSafe()`.
- JSON parsing with `responseText.match(/\{[\s\S]*\}/)` is adequate for single-object responses. For multi-object or nested JSON, use a stricter parser.
- On LLM failure or parse error, revert queue item to `pending` status so it retries on next cron run. Never leave items stuck in `judging` state.
- Backfill posts (old-style report format) have high rejection rates (~80%). Expected behavior — these were written before the engagement gate criteria existed.

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
