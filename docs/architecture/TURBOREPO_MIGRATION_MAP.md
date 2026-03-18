# Turborepo Migration Map: nodebench-ai → nodebench-os

## Principle
Zero greenfield. Every target package maps to existing code. Migration = move + re-export shim.

---

## Current → Target Mapping

### `apps/web-oracle/` ← Existing React SPA
| Target | Current Location | Notes |
|--------|-----------------|-------|
| `app/` (Next.js App Router) | `src/App.tsx` + `src/lib/viewRegistry.ts` (31 views) | Convert hash router → App Router. Each view = route segment. |
| `components/` | `src/components/` (15 shell components) | CleanHeader, CleanSidebar, MainLayout, CommandPalette, etc. |
| Feature routes | `src/features/` (34 feature dirs) | Each feature dir → route group or page |
| Shared UI | `src/shared/ui/` (15 primitives) | Moves to `packages/ui-shared/` |
| Hooks | `src/hooks/` (35 hooks) | Stay with web-oracle, feature-specific |
| Layouts | `src/layouts/` (CockpitLayout, HUD) | web-oracle app shell |
| Contexts | `src/contexts/` (Theme, etc.) | web-oracle providers |

### `apps/api-headless/` ← New thin wrapper
| Target | Current Location | Notes |
|--------|-----------------|-------|
| `/v1/specs` | NEW — wraps Convex mutations | Thin Express layer over backend-convex |
| `/v1/runs` | `convex/domains/operations/` (agent runs) | Expose existing agent orchestration |
| `/v1/replay` | `convex/domains/evaluation/` (traces) | Expose existing eval traces |
| `/v1/evidence` | `convex/domains/evaluation/dogfood/` | Expose existing proof packs |
| Auth middleware | `convex/domains/auth/` (Clerk) | Extract AuthZ logic |

### `packages/backend-convex/` ← Existing Convex backend
| Target | Current Location | Notes |
|--------|-----------------|-------|
| `convex/domains/temporal/` | `convex/domains/research/forecasting/` | Rename: forecasting → temporal |
| `convex/domains/agents/` | `convex/domains/agents/` | Already exists (48 files) |
| `convex/domains/auth/` | `convex/domains/auth/` | Already exists (12 files + personas) |
| `convex/schema.ts` | `convex/schema.ts` (99 tables) | Direct move |
| All 19 domains | `convex/domains/` | Direct move of entire directory |

### `packages/mcp-tools/` ← Existing MCP local
| Target | Current Location | Notes |
|--------|-----------------|-------|
| `src/registry/` | `packages/mcp-local/src/tools/toolRegistry.ts` (175 entries) | Tool catalog + allowlists |
| `src/temporal/` | `packages/mcp-local/src/tools/forecastingTools.ts` | Forecasting MCP tools |
| `src/web/` | `packages/mcp-local/src/tools/webTools.ts` | Web/Playwright tools |
| `src/github/` | `packages/mcp-local/src/tools/gitWorkflowTools.ts` | Git/PR tools |
| Progressive discovery | `packages/mcp-local/src/tools/progressiveDiscoveryTools.ts` | 3 discovery tools |
| Security | `packages/mcp-local/src/security/` (7 files) | Sandbox, audit, redaction |
| Engine | `packages/mcp-local/src/engine/` (4 files) | Session, conformance, context |
| All 55 tool files | `packages/mcp-local/src/tools/` (11 domain groups) | Direct move |

### `packages/eval-engine/` ← Existing eval infrastructure
| Target | Current Location | Notes |
|--------|-----------------|-------|
| `src/judges/geminiVideoJudge` | `scripts/ui/runDogfoodGeminiQa.mjs` | Gemini Flash video QA |
| `src/judges/llmTextJudge` | `convex/domains/evaluation/eval/evalHelpers.ts` | LLM eval scoring |
| `src/parsers/` | `convex/domains/evaluation/eval/evalStorage.ts` | Test case schemas |
| `src/telemetry/` | `convex/domains/operations/observability/telemetry.ts` | OTel wrappers |
| Eval harness | `packages/mcp-local/src/__tests__/evalHarness.test.ts` | 15 scenarios |
| Dataset bench | `packages/mcp-local/src/__tests__/evalDatasetBench.test.ts` | 20 SWE-bench tasks |

### `packages/ui-shared/` ← Existing shared UI
| Target | Current Location | Notes |
|--------|-----------------|-------|
| All primitives | `src/shared/ui/` (15 components) | Button, Card, Badge, Tooltip, etc. |
| Barrel | `src/shared/ui/index.ts` | Already canonical barrel |
| Re-export compat | `src/components/ui/index.ts` | Already a re-export shim |

### `services/tsfm-inference/` ← Existing Python services
| Target | Current Location | Notes |
|--------|-----------------|-------|
| FastAPI server | `python-mcp-servers/research/` | Research inference server |
| Chronos/TimesFM | NEW — model wrappers | Add to existing Python infra |
| Docker | `python-mcp-servers/docker-compose.yml` | Already has 6 services |

### `services/ingestion-extract/` ← Existing ingestion
| Target | Current Location | Notes |
|--------|-----------------|-------|
| Pipeline | `python-mcp-servers/scrapling_bridge/` | Existing scraping/extraction |
| Ollama local | `python-mcp-servers/core_agent/` | Existing agent with local LLM |
| LangExtract | NEW — Google bindings | Add to existing Python infra |

---

## Migration Sequence (risk-ordered)

### Phase 1: Turborepo wrapper (no file moves)
1. Add `turbo.json` + `pnpm-workspace.yaml` at repo root
2. Add workspace references to existing `package.json`
3. Existing `packages/mcp-local/` and `packages/convex-mcp-nodebench/` become workspace packages
4. Zero breakage — just adds orchestration layer

### Phase 2: Extract `packages/ui-shared/`
1. `src/shared/ui/` already canonical — just add `package.json`
2. Update `src/components/ui/index.ts` to import from workspace package
3. Low risk — self-contained leaf dependency

### Phase 3: Extract `packages/eval-engine/`
1. Move eval helpers, judges, parsers from convex + scripts
2. Update test imports
3. Medium risk — test files need path updates

### Phase 4: Extract `packages/backend-convex/`
1. Move `convex/` to `packages/backend-convex/convex/`
2. Update `convex.json` path
3. High risk — schema is the central nervous system

### Phase 5: Next.js migration (`apps/web-oracle/`)
1. Convert Vite React SPA → Next.js App Router
2. Map viewRegistry → file-based routes
3. Highest risk — full frontend framework change

### Phase 6: API layer (`apps/api-headless/`)
1. Thin Express wrapper over Convex
2. Auth middleware from existing Clerk setup
3. Low risk — additive, no existing code changes

### Phase 7: Python service consolidation
1. Merge existing 6 servers into 2 (tsfm-inference + ingestion-extract)
2. Update docker-compose.yml
3. Medium risk — Python service boundaries change

---

## What NOT to migrate (keep as-is)
- `packages/mcp-local/` — rename to `packages/mcp-tools/` but keep structure
- `packages/convex-mcp-nodebench/` — auditor package, independent
- `packages/openclaw-mcp-nodebench/` — standalone sandbox MCP
- `scripts/` — build/ops scripts stay at root
- `public/` — static assets stay with web app
