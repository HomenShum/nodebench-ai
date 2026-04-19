# NodeBench AI — Codebase Restructuring Plan

## Status

This document is a target-state restructuring plan, not an exact description of the repo as it exists today.

For the current cockpit-era map of the codebase, read:

- `docs/architecture/DEVELOPER_CODEBASE_MAP.md`

Use this file as cleanup direction, not as the present-tense source of truth.

## Current State: Fragmentation Score 7.2/10

| Problem | Severity | Evidence |
|---------|----------|----------|
| 127 root .md files | CRITICAL | Completion reports, plans, fixes dumped at root |
| Duplicate components (Button, ErrorBoundary) | CRITICAL | `src/components/ui/` vs `src/shared/ui/` |
| Hooks in 11 locations (73 total) | HIGH | src/hooks, src/lib/hooks, src/shared/hooks, 6 feature dirs, sidebar/hooks, FastAgentPanel/hooks |
| 44 loose files in src/components/ | HIGH | No categorization — dashboards, modals, layout, feature-specific mixed |
| 52 convex domains (many 1-2 files) | HIGH | Fragmented micro-domains |
| 55 flat tool files in packages/mcp-local/src/tools/ | MEDIUM | All tools at same level |
| Utils split across src/utils/ + src/lib/ | MEDIUM | No clear hierarchy |
| 38 top-level directories | HIGH | agents/, shared/, server/, dist-ui-check/, .tmp-*, etc. |

---

## Target Directory Tree

```
nodebench-ai/
│
├── .claude/                          # Claude Code config (keep)
├── .github/                          # CI/CD (keep)
│
├── docs/                             # ALL documentation consolidated
│   ├── README.md                     # Main readme (symlinked to root)
│   ├── architecture/                 # AGENTS.md, AI_FLYWHEEL.md, ORACLE_VISION.md
│   ├── completions/                  # All *_COMPLETE.md, *_SUMMARY.md files
│   ├── plans/                        # PLAN.md, ROADMAP*.md, *_PRD.md
│   ├── reports/                      # LIGHTHOUSE_*, TEST_REPORT, analysis docs
│   └── changelog/                    # CHANGELOG.md, FIXES.md
│
├── scripts/                          # Build, deploy, automation (keep, consolidate)
│   ├── ui/                           # UI capture, dogfood, design linting
│   ├── sentinel/                     # Self-testing system
│   ├── design/                       # Figma, onboarding capture
│   └── ops/                          # One-off scripts (move root .cjs/.mjs here)
│
├── convex/                           # Backend — Convex functions
│   ├── _generated/                   # Auto-generated (keep)
│   ├── schema.ts                     # Root schema (keep)
│   ├── auth.ts                       # Auth config (keep)
│   │
│   ├── domains/                      # Domain logic — CONSOLIDATED from 52 → 18
│   │   ├── agents/                   # Agent OS, prefs, navigation, traversal (keep as-is, largest)
│   │   ├── research/                 # Research + enrichment + signals + forecasting
│   │   ├── social/                   # LinkedIn, channels, messaging, publishing
│   │   ├── documents/                # Documents, artifacts, knowledge, search
│   │   ├── evaluation/               # Eval + groundTruth + testing + validation (merge eval/)
│   │   ├── financial/                # Financial + billing + funding
│   │   ├── operations/               # Ops + monitoring + observability + telemetry
│   │   ├── ai/                       # AI, models, LLM routing, transcription
│   │   ├── integrations/             # External services, MCP bridges
│   │   ├── calendar/                 # Calendar + tasks + taskManager
│   │   ├── narrative/                # Narrative + dossier + personas
│   │   ├── proactive/                # Proactive + recommendations
│   │   ├── governance/               # Governance + verification + compliance
│   │   ├── analytics/                # Analytics + blips + hitl
│   │   ├── users/                    # OperatorProfile + encounters + landing
│   │   ├── dogfood/                  # Dogfood + quality reviews
│   │   ├── openclaw/                 # OpenClaw sandbox
│   │   └── batch/                    # BatchAutopilot + quickCapture
│   │
│   ├── workflows/                    # Workflow orchestration (keep)
│   ├── crons/                        # Scheduled jobs (keep)
│   ├── lib/                          # Shared utilities (keep)
│   └── http/                         # HTTP endpoints (keep)
│
├── packages/
│   ├── mcp-local/                    # MCP Server — 260 tools
│   │   └── src/
│   │       ├── index.ts              # Server entry (keep)
│   │       ├── toolsetRegistry.ts    # Preset definitions (keep)
│   │       ├── db.ts                 # SQLite access (keep)
│   │       ├── types.ts              # Shared types (keep)
│   │       │
│   │       ├── tools/                # Tool implementations — GROUPED by domain
│   │       │   ├── discovery/        # progressiveDiscovery, toolRegistry, metaTools
│   │       │   ├── agent/            # agentBootstrap, parallelAgent, sessionMemory
│   │       │   ├── code/             # architect, boilerplate, gitWorkflow, prReport
│   │       │   ├── research/         # researchOptimizer, researchWriting, rss, web
│   │       │   ├── eval/             # evalTools, selfEval, critter, cCompilerBenchmark
│   │       │   ├── content/          # toon, pattern, seo, skillUpdate, thompsonProtocol
│   │       │   ├── media/            # vision, visualQa, uiCapture, flickerDetection, figmaFlow
│   │       │   ├── data/             # localFile, email, scrapling, forecasting
│   │       │   ├── ops/              # qualityGate, verification, localDashboard, observatory
│   │       │   ├── bridge/           # mcpBridge, voiceBridge, webmcp, llm, openclaw
│   │       │   └── platform/         # uiUxDive (v1+v2), github, designGovernance
│   │       │
│   │       ├── security/             # 4-layer security module (keep)
│   │       ├── engine/               # Workflow engine (keep)
│   │       ├── analytics/            # Metrics/telemetry (keep)
│   │       ├── dashboard/            # Local dashboard backend (keep)
│   │       │
│   │       └── __tests__/            # Test suite — GROUPED by concern
│   │           ├── unit/             # tools.test.ts, embeddingProvider.test.ts
│   │           ├── eval/             # evalHarness, evalDataset, comparativeBench, ablation
│   │           ├── integration/      # cliSubcommands, localDashboard, webmcp, batchAutopilot
│   │           ├── dogfood/          # multiHopDogfood, openclawDogfood, traceabilityDogfood
│   │           ├── bench/            # presetRealWorldBench, toolsetGatingEval, openDataset*
│   │           ├── fixtures/         # Test data (keep)
│   │           └── helpers/          # Test utilities (keep)
│   │
│   └── convex-mcp-nodebench/        # Convex MCP Server (keep structure)
│
├── src/                              # Frontend — React + Tailwind
│   ├── app/                          # App shell (Layer 7 — FSD)
│   │   ├── App.tsx                   # Root component
│   │   ├── main.tsx                  # Entry point
│   │   ├── index.css                 # Global styles
│   │   └── providers/                # ThemeContext, OracleSessionContext
│   │
│   ├── layouts/                      # Page layouts (Layer 6)
│   │   ├── MainLayout.tsx            # Primary layout shell
│   │   ├── CockpitLayout.tsx         # Agent cockpit mode
│   │   └── cockpitModes.ts           # Mode definitions
│   │
│   ├── pages/                        # Route-level views (Layer 5)
│   │   ├── EmailPage.tsx
│   │   ├── SignInForm.tsx
│   │   └── SignOutButton.tsx
│   │
│   ├── features/                     # Domain features (Layer 4) — CONSOLIDATED
│   │   ├── research/                 # Research hub, signals, briefings (131 files — keep)
│   │   ├── agents/                   # Agent panel, marketplace, tasks (125 files — keep)
│   │   ├── documents/                # Docs, editors, spreadsheets (60 files — absorb spreadsheets/)
│   │   ├── calendar/                 # Calendar views + editors (16 files — keep)
│   │   ├── editor/                   # Unified rich text editor (25 files — keep)
│   │   ├── narrative/                # Narrative roadmap + cards (25 files — keep)
│   │   ├── analytics/                # Analytics dashboards (3 files — absorb from components/)
│   │   ├── benchmarks/               # Model leaderboard, workbench (4 files — keep)
│   │   ├── social/                   # LinkedIn posts (2 files — keep)
│   │   ├── email/                    # Email intelligence + inbox (absorb from components/email/)
│   │   ├── monitoring/               # PR suggestions, observability (absorb from features/)
│   │   ├── admin/                    # Funding review (2 files — keep)
│   │   ├── onboarding/               # Onboarding flows (3 files — absorb proactive/)
│   │   ├── dogfood/                  # Dogfood review (1 file — keep)
│   │   ├── oracle/                   # Oracle career platform (6 files — keep)
│   │   ├── mcp/                      # MCP tool ledger (1 file — keep)
│   │   ├── engine/                   # Engine demo (1 file — keep)
│   │   └── chat/                     # Chat interface (2 files — keep)
│   │   # REMOVED: search/ (2 files → merge into research/)
│   │   # REMOVED: spreadsheets/ (2 files → merge into documents/)
│   │   # REMOVED: proactive/ (8 files → merge into onboarding/)
│   │   # REMOVED: emailIntelligence/ (4 files → merge into email/)
│   │   # REMOVED: verification/ (3 hooks → move to shared/hooks/)
│   │
│   ├── shared/                       # Shared primitives (Layer 2-3 — FSD)
│   │   ├── ui/                       # SINGLE UI library (merge components/ui + shared/ui)
│   │   │   ├── Button.tsx            # ONE Button (delete duplicate)
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── SidebarButton.tsx
│   │   │   ├── Sparkline.tsx
│   │   │   ├── SignatureOrb.tsx
│   │   │   ├── PresetChip.tsx
│   │   │   ├── UnifiedHubPills.tsx
│   │   │   ├── TopDividerBar.tsx
│   │   │   ├── PageHeroHeader.tsx
│   │   │   └── index.ts             # Barrel export
│   │   │
│   │   ├── components/               # Shared composed components
│   │   │   ├── ErrorBoundary.tsx     # ONE ErrorBoundary (delete duplicate)
│   │   │   ├── LazyView.tsx
│   │   │   ├── DialogOverlay.tsx
│   │   │   ├── FileDropOverlay.tsx
│   │   │   ├── MetaPills.tsx
│   │   │   ├── PresenceIndicator.tsx
│   │   │   ├── SkipLinks.tsx
│   │   │   └── index.ts             # Barrel export
│   │   │
│   │   ├── hooks/                    # ALL non-feature hooks consolidated
│   │   │   ├── useCommandPalette.ts
│   │   │   ├── useFocusTrap.ts
│   │   │   ├── useKeyboardNavigation.ts
│   │   │   ├── usePanelResize.ts
│   │   │   ├── useReducedMotion.ts
│   │   │   ├── useStableQuery.ts
│   │   │   ├── useWebMcpProvider.ts
│   │   │   ├── useEngagementTracking.ts  # from src/lib/hooks/
│   │   │   ├── useIntentTelemetry.ts     # from src/lib/hooks/
│   │   │   ├── useFeedback.ts            # from src/shared/hooks/
│   │   │   └── index.ts
│   │   │
│   │   ├── editors/                  # Shared editor components
│   │   │   ├── PopoverMiniDocEditor.tsx
│   │   │   └── MiniEditorPopover.tsx
│   │   │
│   │   └── lib/                      # Pure utilities (no React)
│   │       ├── briefDate.ts
│   │       ├── buttonClasses.ts
│   │       ├── calendarHelpers.ts
│   │       ├── displayText.ts
│   │       ├── fileTypes.ts
│   │       ├── formatNumber.ts
│   │       ├── ids.ts
│   │       ├── sources.ts
│   │       ├── tasks.ts
│   │       ├── timezones.ts
│   │       ├── utils.ts
│   │       ├── a11y.ts               # from src/utils/
│   │       ├── animations.ts         # from src/utils/
│   │       ├── viewRegistry.ts       # View definitions
│   │       ├── viewCapabilityRegistry.ts
│   │       └── viewToolMap.ts
│   │
│   ├── widgets/                      # Standalone widgets (Layer 3 — FSD)
│   │   ├── CommandPalette.tsx        # from src/components/
│   │   ├── SettingsModal.tsx         # from src/components/
│   │   ├── CostDashboard.tsx         # from src/components/
│   │   ├── PersonalDashboard.tsx     # from src/components/
│   │   ├── IndustryUpdatesPanel.tsx  # from src/components/
│   │   ├── WeekendPlannerWidget.tsx  # from src/components/widgets/
│   │   ├── QuickCaptureWidget.tsx    # from src/components/QuickCapture/
│   │   ├── sidebar/                  # Sidebar composition
│   │   │   ├── CleanSidebar.tsx
│   │   │   ├── SidebarGlobalNav.tsx
│   │   │   ├── UserProfile.tsx
│   │   │   └── navigation/
│   │   ├── header/
│   │   │   └── CleanHeader.tsx
│   │   └── skeletons/                # Loading states
│   │       ├── ViewSkeleton.tsx
│   │       ├── CostDashboardSkeleton.tsx
│   │       └── IndustryUpdatesSkeleton.tsx
│   │
│   ├── types/                        # Global TypeScript types (keep)
│   │   └── theme.ts
│   │
│   └── test/                         # Frontend test utilities (keep)
│       └── *.test.ts
│
├── tests/                            # E2E tests (keep)
│   └── e2e/
│
├── public/                           # Static assets (keep)
│
├── python-mcp-servers/               # Python services (keep)
│
├── README.md                         # Keep at root (symlink to docs/)
├── CLAUDE.md                         # Keep at root (AI instructions)
├── AGENTS.md                         # Keep at root (methodology)
├── package.json                      # Keep at root
├── tsconfig.json                     # Keep at root
├── vite.config.ts                    # Keep at root
├── vitest.config.ts                  # Keep at root
├── tailwind.config.js                # Keep at root
└── playwright.config.ts              # Keep at root
```

---

## Migration Plan — 5 Phases

### Phase 0: Root Cleanup (30 min, zero risk)
Move 127 .md files to `docs/` subdirectories. Move orphan scripts to `scripts/ops/`.

```bash
# Create docs structure
mkdir -p docs/{architecture,completions,plans,reports,changelog}

# Move completion reports
mv *COMPLETE*.md *SUMMARY*.md docs/completions/
mv *PLAN*.md *ROADMAP*.md *PRD*.md docs/plans/
mv LIGHTHOUSE_*.md *REPORT*.md *ANALYSIS*.md docs/reports/
mv AI_FLYWHEEL.md ORACLE_VISION.md AGENTS.md docs/architecture/
mv CHANGELOG.md FIXES.md docs/changelog/

# Move orphan scripts
mkdir -p scripts/ops
mv fix-accent.cjs fix-more-tokens2.cjs post-linkedin.mjs scripts/ops/
mv .tmp-debug-404.mjs .tmp-ui-audit.mjs scripts/ops/
```

**Files moved:** ~140
**Risk:** None — no imports reference .md or orphan .cjs files
**Verify:** `git status`, confirm build still works

---

### Phase 1: Frontend Dedup (1 hour, low risk)
Eliminate duplicate components, consolidate UI library.

**Step 1.1 — Merge UI libraries**
1. Keep `src/shared/ui/` as the canonical location
2. Move unique files from `src/components/ui/` → `src/shared/ui/`
3. Delete `src/components/ui/`
4. Update all imports via find-and-replace

**Step 1.2 — Deduplicate components**
1. Compare `src/components/ErrorBoundary.tsx` vs `src/shared/components/ErrorBoundary.tsx` — keep the more complete one
2. Compare `src/components/ui/Button.tsx` vs `src/shared/ui/Button.tsx` — keep the more complete one
3. Update all imports

**Step 1.3 — Consolidate hooks**
1. Move `src/lib/hooks/*` → `src/shared/hooks/`
2. Move `src/components/sidebar/hooks/*` → `src/shared/hooks/`
3. Add barrel export `src/shared/hooks/index.ts`
4. Update imports

**Verify:** `npx tsc --noEmit`, `npm run build`, visual check

---

### Phase 2: Frontend Feature Consolidation (2 hours, medium risk)
Merge micro-features, extract widgets from components/.

**Step 2.1 — Merge micro-features**
- `src/features/search/` (2 files) → `src/features/research/components/`
- `src/features/spreadsheets/` (2 files) → `src/features/documents/`
- `src/features/proactive/` (8 files) → `src/features/onboarding/`
- `src/features/emailIntelligence/` (4 files) → `src/features/email/` (new, also absorb `src/components/email/`)

**Step 2.2 — Extract widgets from src/components/**
Move self-contained panels from the 44-file `src/components/` root:
- CommandPalette, SettingsModal, CostDashboard, PersonalDashboard → `src/widgets/`
- CleanHeader → `src/widgets/header/`
- CleanSidebar + sidebar/ → `src/widgets/sidebar/`
- skeletons/ → `src/widgets/skeletons/`

**Step 2.3 — Extract app shell**
- `App.tsx`, `main.tsx`, `index.css` → `src/app/`
- `src/contexts/ThemeContext.tsx` → `src/app/providers/`

**Verify:** Full build + E2E smoke test

---

### Phase 3: Backend Domain Consolidation (1 hour, low risk)
Merge convex/ micro-domains, group MCP tools.

**Step 3.1 — Convex domain consolidation (52 → 18)**
Merge single-file domains into logical groups:
- `eval/` + `evaluation/` + `groundTruth/` + `testing/` + `validation/` → `evaluation/`
- `monitoring/` + `observability/` + `telemetry/` → `operations/` (absorb)
- `recommendations/` + `recomm/` → `proactive/` (absorb)
- `billing/` + financial related → `financial/` (absorb)
- `calendar/` + `tasks/` + `taskManager/` → `calendar/` (absorb)
- etc. per target tree above

**Step 3.2 — MCP tool grouping**
Create subdirectories under `packages/mcp-local/src/tools/`:
```
tools/discovery/   → progressiveDiscoveryTools, toolRegistry, metaTools
tools/agent/       → agentBootstrap, parallelAgent, sessionMemory
tools/code/        → architect, boilerplate, gitWorkflow, prReport
tools/eval/        → evalTools, selfEval, critter, cCompilerBenchmark
tools/media/       → vision, visualQa, uiCapture, flickerDetection, figmaFlow
tools/data/        → localFile, email, scrapling, forecasting
```
Update imports in `index.ts` and `toolsetRegistry.ts`.

**Step 3.3 — Test grouping**
Move 33 flat test files into subdirectories:
```
__tests__/unit/        → tools.test.ts, embeddingProvider.test.ts
__tests__/eval/        → evalHarness, evalDataset, comparativeBench
__tests__/integration/ → cliSubcommands, localDashboard, batchAutopilot
__tests__/bench/       → presetRealWorldBench, toolsetGatingEval
__tests__/dogfood/     → multiHopDogfood, openclawDogfood, traceability
```

**Verify:** `npx vitest run` from packages/mcp-local/

---

### Phase 4: Barrel Exports + Index Files (30 min, low risk)
Add `index.ts` barrel exports to every directory for clean imports.

```typescript
// src/shared/ui/index.ts
export { Button } from './Button';
export { Card } from './Card';
export { Badge } from './Badge';
// ...

// src/features/research/index.ts
export { ResearchHub } from './views/ResearchHub';
export { FundingBriefView } from './views/FundingBriefView';
// ...
```

**Rule:** Every directory with 3+ files gets an `index.ts`.
**Import pattern:** `import { Button, Card } from '@/shared/ui'`

---

## Agentic Development Principles Applied

| Principle | How Applied |
|-----------|-------------|
| **Descriptive filenames** | Every file name tells you what it does without opening it |
| **3-4 level max depth** | No path deeper than `src/features/agents/components/FastAgentPanel/` |
| **Barrel exports** | `index.ts` at every directory — agents grep `export` to discover APIs |
| **Co-location** | Feature tests, hooks, types live WITH the feature, not in global dirs |
| **Grep-friendly naming** | `useXxx` for hooks, `XxxView` for pages, `XxxPanel` for panels |
| **Domain-prefixed types** | `AgentState`, `ResearchSignal`, `CalendarEvent` — no collisions |
| **Progressive disclosure** | `shared/` for primitives, `features/` for domains, `widgets/` for compositions |
| **Single source of truth** | ONE Button, ONE ErrorBoundary, ONE viewRegistry |

---

## Metrics: Before vs After

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Root .md files | 127 | 5 | -96% |
| Top-level directories | 38 | 15 | -61% |
| Duplicate components | 2 | 0 | -100% |
| Hook locations | 11 | 2 (shared + feature-local) | -82% |
| Convex domains | 52 | 18 | -65% |
| src/components/ root files | 44 | 8 | -82% |
| MCP tools/ flat files | 55 | 11 subdirs | Grouped |
| Test files (flat) | 33 | 6 subdirs | Grouped |
