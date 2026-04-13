# Repo Minimization Plan

## Current state: 148K files, ~1GB source

## Target: handoff-ready repo a new dev can `npm install && npm run dev` in < 2 min

---

## Phase 1: Archive non-product docs (saves ~290MB)

Move to `archive/` (gitignored):
- `docs/agents/` (145MB) — agent research, not product code
- `docs/demo-video/` (102MB) — video assets
- `docs/career/` (34MB) — personal career docs + tax files
- `docs/demo-audio/` (6MB) — audio assets
- `docs/reports/` (7MB) — generated reports
- `docs/plans/` (1MB) — old plans
- `docs/completions/` (656K) — session completions
- `docs/prototypes/` (580K) — old prototypes

Keep: `docs/architecture/` (specs), `docs/dogfood/` (screenshots)

## Phase 2: Archive non-essential packages (saves ~253MB)

Move to `archive/packages/`:
- `packages/convex-mcp-nodebench/` (127MB) — Convex auditor, not needed for web product
- `packages/openclaw-mcp-nodebench/` (126MB) — OpenClaw bridge, not needed
- `packages/mcp-admin/` (36K) — admin tools
- `packages/mcp-power/` (36K) — power user tools
- `packages/create-nodebench-app/` (52K) — scaffolding

Keep: `packages/mcp-local/` (the MCP server), `packages/mcp-client/` (SDK), `packages/claude-code-plugin/`, `packages/eval-engine/`

## Phase 3: Archive non-product src/features (saves ~7MB)

The 5 product surfaces (home, chat, reports, nudges, me, entities) + their dependencies. Everything else moves to `archive/src-features/`.

### Keep (product surfaces):
- `src/features/home/` (24K)
- `src/features/chat/` (36K)
- `src/features/reports/` (40K)
- `src/features/nudges/` (varies)
- `src/features/me/` (varies)
- `src/features/entities/` (104K)
- `src/features/product/` (24K) — shared product lib
- `src/features/controlPlane/` (733K) — still imported 15x, needs gradual migration
- `src/features/onboarding/` (80K) — still imported

### Archive (not imported by product surfaces):
- `src/features/devDashboard/` (360K) — internal dev dashboard
- `src/features/calendar/` (337K) — calendar feature
- `src/features/narrative/` (209K) — LinkedIn narrative
- `src/features/benchmarks/` (192K) — benchmark UI
- `src/features/telemetry/` (152K) — telemetry UI
- `src/features/admin/` (152K) — admin panel
- `src/features/dogfood/` (72K) — dogfood UI
- `src/features/engine/` (28K) — internal engine
- `src/features/observability/` (varies) — internal

### Keep but audit (imported by layouts/app but may be removable):
- `src/features/agents/` (2MB) — imported 5x by layouts
- `src/features/monitoring/` (165K) — imported 8x
- `src/features/documents/` (924K) — imported 4x
- `src/features/founder/` (893K) — imported 4x (mostly legacy)
- `src/features/research/` (2MB) — imported 3x
- `src/features/deepSim/` (169K) — imported 2x
- `src/features/investigation/` (60K) — imported 2x
- `src/features/oracle/` (85K) — imported 2x
- `src/features/strategy/` (172K) — imported 1x
- `src/features/mcp/` (140K) — imported 1x

## Phase 4: Archive non-product Convex domains (saves ~12MB)

### Keep (product domain):
- `convex/domains/product/` — the canonical product backend
- `convex/domains/knowledge/` — entity context
- `convex/domains/search/` — search pipeline

### Archive:
- `convex/domains/research/` (3.5MB)
- `convex/domains/agents/` (3.4MB)
- `convex/domains/evaluation/` (1.5MB)
- `convex/domains/operations/` (949K)
- `convex/domains/narrative/` (785K)
- `convex/domains/integrations/` (618K)
- `convex/domains/verification/` (434K)
- `convex/domains/social/` (398K)
- `convex/domains/enrichment/` (306K)
- `convex/domains/proactive/` (301K)
- `convex/domains/founder/` (294K)
- `convex/domains/mcp/` (240K)

## Phase 5: Trim scripts (424 → ~15 files)

### Keep:
- `scripts/dogfood-behavioral-audit.ts` — Gemini pipeline
- `scripts/lib/behavioralDetectors.ts` — detector framework
- `scripts/qa-dogfood.mjs` — QA checklist
- `scripts/judge-demo-video.ts` — video judge

### Archive everything else (400+ scripts)

## Phase 6: Consolidate config (25 → 10)

### Keep:
- package.json, tsconfig.json, tsconfig.app.json
- vite.config.ts, vercel.json, tailwind.config.ts
- .env.local, .gitignore
- CLAUDE.md, README.md

### Archive or merge:
- Multiple tsconfig variants
- Duplicate config files

## Phase 7: Trim package.json (138 scripts → 15)

### Keep:
- dev, build, preview, test, test:run
- lint, typecheck
- convex:dev, convex:deploy
- local:sync, local:refresh

### Remove: everything else

## Phase 8: Create CONTRIBUTING.md

```markdown
# Contributing to NodeBench AI

## Quick Start
npm install
cp .env.example .env.local  # Add your API keys
npm run dev                   # Starts Vite + Convex

## Project Structure
src/features/{home,chat,reports,nudges,me,entities}/ — 5 product surfaces
convex/domains/product/ — Backend
server/ — SSE API
packages/mcp-local/ — MCP server

## Key Commands
npm run dev          — Start dev server
npm run build        — Production build
npm run typecheck    — TypeScript check
npx convex deploy    — Deploy backend
```
