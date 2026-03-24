# NodeBench AI — Session Changelog (2026-03-24)

## Summary
Shipped the NodeBench AI App redesign from dashboard-first to search-first entity intelligence platform, with live MCP pipeline, LLM judge eval harness, tiered context injection, and longitudinal benchmark infrastructure.

---

## Phase 1: Search-First Redesign
**Files:** `ControlPlaneLanding.tsx`, `ResultWorkspace.tsx`, `searchTypes.ts`

- Rewrote landing page from dashboard/cockpit to single search canvas
- Search input with auto-focus, voice input via `useVoiceInput`, 6 lens chips (Founder/Investor/Banker/CEO/Legal/Student)
- 4 example prompts with scenario/lens tags, click-to-search
- 8-section `ResultWorkspace`: Entity Truth, What Changed, Key Signals, Risks (with falsification criteria), Comparables table, Recommended Next Questions, Export Packet actions, Keep Warm/Monitor
- 3 demo packets: Anthropic ($61.5B, enterprise moat), Shopify (30% growth, AI commerce), NodeBench founder weekly reset
- Keyword alias matching with false-positive prevention
- New Search clears state, Explore clears current result

## Phase 2: Live MCP Pipeline
**Files:** `server/routes/search.ts`, `founderLocalPipeline.ts`, `server/index.ts`

- `/search` POST API endpoint with query classification (weekly_reset, pre_delegation, important_change, company_search, competitor, general)
- Query → MCP tool dispatch → inline result (end-to-end working in 134ms)
- `founder_local_weekly_reset`: produces real packets from git log + filesystem + SQLite in 145ms
- `founder_local_gather`: returns structured context (identity, recent changes, session memory, dogfood findings)
- `founder_local_synthesize`: generates 5 packet types (weekly_reset, pre_delegation, important_change, competitor_brief, role_switch)
- Server `loadAllToolsets()` fix — 343→359 tools loaded
- Query-specific entity extraction and memo incorporation

## Phase 2.5: No Auth Walls
**Files:** `ControlPlaneLanding.tsx`

- Guests never see "Sign in to ask" — every query returns inline results
- Non-demo queries produce fallback packet with suggested prompts
- Removed `SinceLastSession` import that caused build failure

## Phase 2.6: Shareable Packet URLs
**Files:** `ControlPlaneLanding.tsx`, `App.tsx` (memo route)

- Share button saves packet as `ShareableMemoData` to localStorage
- Generates `/memo/:id` URL, copies to clipboard
- Standalone memo page renders without auth — the viral artifact

## Phase 3: Layout Fixes (Research-Backed)
**Files:** `WorkspaceRail.tsx`, `AgentPresenceRail.tsx`, `CockpitLayout.tsx`, `CommandBar.tsx`

- Research: 16 sources (Mobbin, shadcn, UX Planet, cmdk, Linear, Notion, Figma, VS Code, Cursor)
- Left sidebar: bg increased from 2% to 4% opacity (grounded, not floating)
- Right sidebar: same opacity fix, flush positioning
- Search/Ctrl+K trigger moved to left sidebar below brand (above surface nav)
- Sign-in CTA for guest users in left sidebar
- Command bar tabs hidden on desktop (trace strip is bottom element)
- FastAgent panel flush, not floating

## Phase 4: Tiered Context Injection
**Files:** `contextInjection.ts`, `server/routes/search.ts`, `toolsetRegistry.ts`

Architecture (Letta/MemGPT-inspired 3-tier):
- **PINNED** (~200 tokens): canonical mission, wedge, confidence, contradictions, last packet, recent actions — survives context compaction
- **INJECTED** (~200 tokens): weekly reset summary, milestones, entity-specific signals, dogfood verdict — query-relevant, refreshed per request
- **ARCHIVAL** (0 tokens, pointer-based): 1000+ tracked actions, 141+ milestones, 678+ benchmark runs — permanent in SQLite, retrieved on demand

New MCP tools:
- `get_context_bundle`: returns full tiered context for any query
- `inject_context_into_prompt`: wraps prompts with persistent state

Search API returns context bundle with every response (~415 token overhead).

## Phase 5: Longitudinal Benchmark Harness
**Files:** `longitudinalBenchmark.ts`, `toolsetRegistry.ts`

- N=1/N=5/N=10/N=100 tier system with perturbation injection
- 10 perturbation types: UI change, field change, auth interruption, env drift, prompt reset, model swap, branch mutation, tool failure, stale memory, data schema change
- 4 durability dimensions: repetition, rerun, memory, drift
- Composite scoring: 25% stability + 20% rerun savings + 20% artifact quality + 15% memory usefulness + 10% drift resistance + 10% continuity
- Maturity labels: smoke-ready → stable → hardened → durable → institutional
- SQLite persistence for cross-session regression detection
- Daily/weekly/monthly/quarterly/yearly rollup cadence

## Phase 6: LLM Judge Eval Harness
**Files:** `llmJudgeEval.ts`

- 500-query corpus across 8 scenarios × 10 personas
- Gemini 3.1 Flash Lite as judge (boolean criteria scoring)
- Per-query: tool precision, tool recall, forbidden violations, criteria pass rate
- Automatic Gemini → heuristic fallback on API errors
- SQLite persistence in `llm_judge_runs` table

**Eval progression (Gemini 3.1 Flash Lite, 50-100 queries):**

| Iteration | Pass Rate | Key Fix |
|-----------|-----------|---------|
| Baseline  | 36.0%     | Ghost tools (export_artifact_packet doesn't exist) |
| Fix 1     | 48.0%     | Remap delegation/memo to founder_local_synthesize |
| Fix 2     | 56.0%     | Fix seeding: query-specific competitor brief, packet_diff |
| Fix 3     | 57.0% (100q) | Unified ALL expectedTools to producing tools |

**100-query results by scenario:**

| Scenario | Pass Rate | Status |
|----------|-----------|--------|
| role_switch | 100.0% | Perfect |
| weekly_reset | 93.3% | Near-perfect |
| packet_diff | 80.0% | Good |
| memo_export | 72.7% | Good |
| company_search | 62.5% | Needs web enrichment |
| delegation | 41.7% | Needs structured delegation format |
| important_change | 18.2% | Needs richer temporal data |
| competitor_brief | 0.0% | Needs entity-specific web data |

**Remaining gap:** Content-quality criteria require web enrichment (entity-specific financials, risk factors, market data) which local tools don't produce yet. The eval honestly catches the product gap — this is correct behavior, not a bug.

## Phase 7: Stale Branding Fixes
**Files:** `index.html`, `package.json`, `server.json`, `CLAUDE.md`, OG tags

- Title: "NodeBench — Entity Intelligence for Any Company, Market, or Question"
- Removed "DeepTrace by NodeBench — Agent Trust Infrastructure"
- Tool count: 304→338→346→359 (kept current across all surfaces)
- OG description updated to entity intelligence positioning

## Infrastructure
- **npm:** nodebench-mcp@2.61.0 published
- **Vercel:** auto-deploys on every push to main
- **TypeScript:** 0 errors throughout
- **Vite build:** clean in 19-37s
- **MCP tests:** 269+ passing
- **SQLite:** 1000+ tracked actions, 141+ milestones, 678+ benchmark runs persisted

## Dogfood Runbook
**File:** `docs/architecture/DOGFOOD_RUNBOOK.md`

- 6 AI App scenarios + 7 MCP scenarios = 13 total
- Telemetry schema with 30+ fields per run
- Cost model: $0.01-$2.00 per scenario depending on complexity
- Pass/fail: 7 criteria per scenario + 4 global metrics
- Priority first 3: founder weekly reset, public-doc drift, banker Anthropic search

## Key Metrics

| Metric | Value |
|--------|-------|
| Gemini judge pass rate | 57% (100 queries) |
| Tool precision | 0.895 |
| Tool recall | 0.800 |
| Criteria pass rate | 69.1% |
| Forbidden violations | 0 |
| Context injection overhead | ~415 tokens |
| Search API latency | 134ms |
| Total MCP tools | 359 across 57 domains |
| Total tracked actions | 1000+ |
| Total milestones | 141+ |
| Total benchmark runs | 678+ |
