# convex-mcp-nodebench

Convex-specific MCP server that audits, verifies, and guides Convex development. 36 tools across schema audit, function compliance, security, performance, deployment gates, SARIF reporting, persistent gotcha DB, and adaptive architecture planning.

**Complements** Context7 (raw library docs) and the official Convex MCP (deployment introspection) with structured verification workflows and persistent Convex knowledge.

## 36 Tools

### Core Audit (10 tools)

| Tool | What it does |
|------|-------------|
| `convex_audit_schema` | Scan schema.ts for anti-patterns: deprecated validators, `v.any()`, reserved fields, missing indexes |
| `convex_suggest_indexes` | Analyze query patterns across all functions and suggest missing indexes |
| `convex_check_validator_coverage` | Check all exported functions have args + returns validators |
| `convex_audit_functions` | Audit function registration, validators, public/internal misuse, cross-call violations |
| `convex_check_function_refs` | Validate `api.x.y` / `internal.x.y` references, detect direct function passing |
| `convex_check_type_safety` | Find `as any` casts, undefined returns, loose ID types across all files |
| `convex_audit_authorization` | Audit auth guard coverage: which public functions check `getUserIdentity()` |
| `convex_audit_actions` | Audit actions for direct DB access, missing error handling, external API patterns |
| `convex_audit_transaction_safety` | Find read-modify-write races, multiple `runMutation` in single functions |
| `convex_audit_query_efficiency` | Detect unbounded `.collect()`, `.filter()` without index, mutation-as-read |

### Infrastructure Audit (9 tools)

| Tool | What it does |
|------|-------------|
| `convex_analyze_http` | Analyze http.ts: duplicate routes, missing CORS, OPTIONS preflight handlers |
| `convex_check_crons` | Validate crons.ts: duplicate names, public handlers, interval issues |
| `convex_analyze_components` | Parse convex.config.ts: active/conditional components, unused imports |
| `convex_audit_storage_usage` | Audit storage: stores, deletes, missing null checks on `getUrl()` |
| `convex_audit_pagination` | Find paginate calls missing validators or without proper cursor handling |
| `convex_audit_vector_search` | Audit vector indexes, search calls, dimension mismatches |
| `convex_audit_schedulers` | Find `runAfter`/`runAt` usage, self-scheduling loops, missing termination |
| `convex_audit_data_modeling` | Audit tables: deep nesting, dangling refs, `v.any()`, arrays-of-arrays |
| `convex_audit_dev_setup` | Check project hygiene: _generated dir, tsconfig, package deps, env files |

### Deployment & Quality Gate (4 tools)

| Tool | What it does |
|------|-------------|
| `convex_pre_deploy_gate` | Pre-deployment gate: schema, auth, validators, recent audits (blocks on critical) |
| `convex_check_env_vars` | Check env vars referenced in code exist in .env files (Convex-filtered) |
| `convex_quality_gate` | Composite quality score (A-F grade) with configurable thresholds |
| `convex_schema_migration_plan` | Diff schema snapshots and generate migration steps with risk assessment |

### Reporting (2 tools)

| Tool | What it does |
|------|-------------|
| `convex_export_sarif` | Export all audit results as SARIF 2.1.0 (GitHub Code Scanning compatible) |
| `convex_audit_diff` | Compare current audit against baseline: new issues, fixed issues, trend |

### Adaptive Architect (3 tools)

| Tool | What it does |
|------|-------------|
| `convex_scan_capabilities` | Regex scan of project structure: function types, data access, auth, storage, schema patterns |
| `convex_verify_concept` | Verify if a concept (e.g. "Vector Search RAG") is implemented via regex signatures |
| `convex_generate_plan` | Generate Convex-specific implementation steps for missing signatures |

**Self-discovery loop**: `scan_capabilities` → `verify_concept` → `generate_plan` → implement → re-verify

### Knowledge & Discovery (5 tools)

| Tool | What it does |
|------|-------------|
| `convex_record_gotcha` | Persist a Convex gotcha/edge case for future reference |
| `convex_search_gotchas` | Full-text search across known Convex gotchas (BM25 + FTS5) |
| `convex_get_methodology` | Step-by-step guides: schema audit, function compliance, deploy verification |
| `convex_discover_tools` | BM25 + optional embedding-enhanced semantic tool discovery |
| `convex_critter_check` | Accountability check: scores task intent (why/who/what) before starting work |

### Integration Bridge (3 tools)

| Tool | What it does |
|------|-------------|
| `convex_generate_rules_md` | Generate Convex rules markdown from gotcha DB, recent audits, project stats |
| `convex_snapshot_schema` | Capture schema snapshot for diffing (tables, indexes, size). Auto-diffs against previous |
| `convex_bootstrap_project` | Comprehensive project health scan with improvement plan |

## Quick Start

### Install
```bash
npm install @homenshum/convex-mcp-nodebench
```

### Add to MCP config (Claude Code, Cursor, Windsurf)
```json
{
  "mcpServers": {
    "convex-mcp-nodebench": {
      "command": "npx",
      "args": ["@homenshum/convex-mcp-nodebench"]
    }
  }
}
```

### First prompt
```
Audit the schema at /path/to/my-project, then run the quality gate
```

### Optional: Enable semantic search
Set `GOOGLE_API_KEY` or `OPENAI_API_KEY` env var. The `convex_discover_tools` tool will automatically use embedding-enhanced search when available (Google `text-embedding-004` or OpenAI `text-embedding-3-small`).

## Self-Instruct QuickRefs

Every tool response includes a `quickRef` block guiding the agent to the next step:

```json
{
  "nextAction": "Run convex_check_validator_coverage to ensure all functions have validators",
  "nextTools": ["convex_check_validator_coverage", "convex_audit_functions"],
  "methodology": "convex_schema_audit",
  "relatedGotchas": ["returns_validator_required", "new_function_syntax"],
  "confidence": "high"
}
```

## Pre-Seeded Gotcha Database

Ships with 32 gotchas extracted from Convex best practices, auto-upserted on upgrade:

**Critical**: `pagination_cursor_null_first`, `query_no_side_effects`, `use_node_for_external_api`, `validator_bigint_deprecated`

**Warnings**: `ctx_auth_returns_null`, `http_cors_manual`, `http_route_no_wildcard`, `avoid_v_any`, `mutation_transaction_atomicity`, `db_get_returns_null`, `storage_get_returns_null`, `convex_1mb_document_limit`, `scheduled_function_must_be_internal`, and 19 more covering index ordering, undefined handling, field naming, action patterns...

## Data Storage

Persistent SQLite at `~/.convex-mcp-nodebench/convex.db`:

| Table | Purpose |
|-------|---------|
| `convex_gotchas` | Knowledge base with FTS5 full-text search |
| `schema_snapshots` | Schema history for table + index diffing |
| `deploy_checks` | Deployment gate audit trail |
| `audit_results` | Per-file analysis cache |
| `concept_verifications` | Architect concept verification history |
| `critter_checks` | Task accountability records |

## Testing

```bash
npm test
```

63 tests (53 unit + 10 E2E) verify all 36 tools against the real nodebench-ai codebase (3,158 Convex functions, 328 tables, 82 crons, 44 HTTP routes).

## Architecture

```
packages/convex-mcp-nodebench/
  src/
    index.ts                    -- MCP server, tool assembly (36 tools)
    db.ts                       -- SQLite schema + upsert seed logic
    types.ts                    -- Tool types, QuickRef interface
    gotchaSeed.ts               -- 32 pre-seeded Convex gotchas
    tools/
      schemaTools.ts            -- Schema audit, index suggestions, validator coverage
      functionTools.ts          -- Function audit, cross-call detection, ref checking
      httpTools.ts              -- HTTP endpoint analysis
      deploymentTools.ts        -- Pre-deploy gate, env var checking
      learningTools.ts          -- Gotcha recording + FTS5 search
      methodologyTools.ts       -- Methodology guides, BM25 tool discovery
      integrationBridgeTools.ts -- Rules generation, schema snapshots, project bootstrap
      cronTools.ts              -- Cron job validation
      componentTools.ts         -- Component config analysis
      critterTools.ts           -- Task accountability checking
      authorizationTools.ts     -- Auth guard audit
      queryEfficiencyTools.ts   -- Query performance audit
      actionAuditTools.ts       -- Action anti-pattern detection
      typeSafetyTools.ts        -- Type safety audit
      transactionSafetyTools.ts -- Transaction race detection
      storageAuditTools.ts      -- Storage usage audit
      paginationTools.ts        -- Pagination pattern audit
      dataModelingTools.ts      -- Data modeling audit
      devSetupTools.ts          -- Dev environment audit
      migrationTools.ts         -- Schema migration planning
      reportingTools.ts         -- SARIF export, baseline diff
      vectorSearchTools.ts      -- Vector search audit
      schedulerTools.ts         -- Scheduler audit
      qualityGateTools.ts       -- Composite quality gate
      architectTools.ts         -- Capability scan, concept verify, plan generation
      toolRegistry.ts           -- Central catalog with quickRef + BM25 scoring
      embeddingProvider.ts      -- Optional semantic search (Google/OpenAI embeddings)
    __tests__/
      tools.test.ts             -- 53 unit/integration tests
      architectE2E.test.ts      -- 10 E2E tests (industry-latest concept verification)
```

## Changelog

### v0.9.1
- **Fix**: Strategy matching order in architect tools -- specific patterns (`ctx.db.query`, `ctx.runMutation`) now matched before generic keywords (`query`, `mutation`)

### v0.9.0
- **3 new tools**: `convex_scan_capabilities`, `convex_verify_concept`, `convex_generate_plan` -- adaptive architect with Convex-specific regex patterns, strategies, and file hints
- **Self-discovery loop**: scan → verify → plan → implement → re-verify
- **7 Convex pattern categories**: function types, schema, data access, auth, storage, client-side, cross-function calls
- **~40 Convex-specific strategies** in `inferConvexStrategy()` with correct priority ordering
- **10 new E2E tests** validating architect tools against industry-latest concepts (Vector Search RAG, Real-Time Collaboration, File Upload Pipeline, Scheduled Retry Queue, Row-Level Security)

### v0.8.0
- **14 new tools**: authorization audit, query efficiency, action audit, type safety, transaction safety, storage audit, pagination audit, data modeling audit, dev setup audit, schema migration planning, SARIF 2.1.0 export, baseline diff, vector search audit, scheduler audit
- **Quality gate**: Composite A-F scoring with configurable thresholds
- **SARIF 2.1.0**: GitHub Code Scanning compatible export aggregating all audit types
- **Baseline diff**: Track audit trends (improving/stable/degrading) over time
- **MCP Resources**: `project-health`, `recent-audits`, `gotcha-db`
- **MCP Prompts**: `full-audit`, `pre-deploy-checklist`, `security-review`

### v0.4.0
- **New tool**: `convex_critter_check` -- task accountability with 10 calibrated checks
- **Cross-call fix**: improved detection of query→mutation violations
- **v.any() aggregation**: grouped by table for cleaner output

### v0.3.0
- **New tool**: `convex_analyze_http` -- HTTP endpoint analysis
- **Cross-call detection**: queries calling `ctx.runMutation`/`ctx.runAction` flagged as critical
- **12 new gotchas**: pagination, ctx.auth, scheduled functions, HTTP routes, CORS, storage, transactions
- **Schema snapshot diffs** track index additions/removals per table
- **Gotcha seeding** upgraded to upsert

### v0.2.0
- Schema audit noise reduced (836 -> 163 issues)
- Function audit severity corrected
- Deploy gate threshold: only blocks on >10 criticals
- npm tarball reduced from 45.9kB to 31.5kB

### v0.1.0
- Initial release: 16 tools, 20 gotchas, BM25 discovery, embedding-enhanced search
