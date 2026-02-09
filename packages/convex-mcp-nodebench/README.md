# convex-mcp-nodebench

Convex-specific MCP server applying NodeBench self-instruct diligence patterns to Convex development. Schema audit, function compliance, HTTP endpoint analysis, deployment gates, persistent gotcha DB, and methodology guidance.

**Complements** Context7 (raw library docs) and the official Convex MCP (deployment introspection) with structured verification workflows and persistent Convex knowledge.

## 17 Tools across 8 Categories

### Schema Tools
| Tool | Description |
|------|-------------|
| `convex_audit_schema` | Scan schema.ts for anti-patterns: deprecated validators (`v.bigint()`), `v.any()` usage, reserved field names, missing indexes, naming conventions |
| `convex_suggest_indexes` | Analyze query patterns across all functions and suggest missing indexes |
| `convex_check_validator_coverage` | Check all exported functions have args + returns validators |

### Function Tools
| Tool | Description |
|------|-------------|
| `convex_audit_functions` | Audit function registration, missing validators, public/internal misuse, action anti-patterns, **cross-call violations** (query calling runMutation/runAction) |
| `convex_check_function_refs` | Validate api.x.y / internal.x.y references, detect direct function passing |

### HTTP Tools
| Tool | Description |
|------|-------------|
| `convex_analyze_http` | Analyze convex/http.ts for duplicate routes, missing CORS headers, missing OPTIONS preflight handlers, missing httpRouter/httpAction imports |

### Deployment Tools
| Tool | Description |
|------|-------------|
| `convex_pre_deploy_gate` | Pre-deployment quality gate: schema, auth, validators, recent audit results (only blocks on truly critical issues) |
| `convex_check_env_vars` | Check Convex-specific env vars referenced in code exist in .env files (filters out NODE_ENV, PATH, etc.) |

### Learning Tools
| Tool | Description |
|------|-------------|
| `convex_record_gotcha` | Persist a Convex gotcha/edge case for future reference |
| `convex_search_gotchas` | Full-text search across known Convex gotchas (BM25 + FTS5) |

### Methodology Tools
| Tool | Description |
|------|-------------|
| `convex_get_methodology` | Step-by-step guides: schema audit, function compliance, deploy verification, knowledge management |
| `convex_discover_tools` | BM25-scored tool discovery with optional embedding-enhanced semantic search |

### Integration Bridge Tools
| Tool | Description |
|------|-------------|
| `convex_generate_rules_md` | Generate a Convex rules markdown file from gotcha DB, recent audits, and project stats |
| `convex_snapshot_schema` | Capture schema snapshot for diffing (tracks tables, indexes per table, size). Auto-diffs against previous snapshot |
| `convex_bootstrap_project` | Comprehensive project health scan: schema, auth, _generated, file count, improvement plan |

### Infrastructure Tools
| Tool | Description |
|------|-------------|
| `convex_check_crons` | Validate crons.ts: duplicate names, public handlers, interval issues |
| `convex_analyze_components` | Parse convex.config.ts: active/conditional components, unused imports |

## Self-Instruct QuickRefs

Every tool response includes a `quickRef` block telling the agent what to do next:

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

### Critical
- `pagination_cursor_null_first` -- First paginate() call must pass cursor: null
- `query_no_side_effects` -- Queries CANNOT call runMutation or runAction (runtime error)
- `use_node_for_external_api` -- Actions calling external APIs need `"use node"` directive
- `validator_bigint_deprecated` -- Use v.int64() not v.bigint()

### Warnings
- `ctx_auth_returns_null` -- getUserIdentity() returns null when unauthenticated
- `http_cors_manual` -- CORS headers must be added manually to HTTP endpoints
- `http_route_no_wildcard` -- HTTP routes use exact path matching, no wildcards
- `avoid_v_any` -- v.any() defeats the purpose of validators
- `mutation_transaction_atomicity` -- Each mutation is a separate transaction
- `db_get_returns_null` -- ctx.db.get() returns null if document missing
- `storage_get_returns_null` -- ctx.storage.get() returns null if file missing
- `convex_1mb_document_limit` -- Documents cannot exceed 1MB
- `scheduled_function_must_be_internal` -- Scheduled functions should be internal
- And 19 more covering index ordering, undefined handling, field naming, action patterns...

## Quick Start

### Install
```bash
npm install @homenshum/convex-mcp-nodebench
```

Or from source:
```bash
cd packages/convex-mcp-nodebench
npm install
npm run build
```

### Run (stdio)
```bash
npx convex-mcp-nodebench
```

### Dev mode
```bash
npx tsx src/index.ts
```

### Add to MCP config
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
Search convex gotchas for "pagination" then audit the schema at /path/to/my-project
```

## Data Storage

Persistent SQLite database at `~/.convex-mcp-nodebench/convex.db`:

- **convex_gotchas** -- Gotcha knowledge base with FTS5 full-text search
- **schema_snapshots** -- Schema history for table + index diffing
- **deploy_checks** -- Deployment gate audit trail
- **audit_results** -- Per-file analysis cache

## Testing

```bash
npm test
```

30 tests verify all 17 tools work against the real nodebench-ai codebase (3,147 Convex functions, 323 tables, 82 crons, 8 HTTP routes).

## Architecture

```
packages/convex-mcp-nodebench/
  src/
    index.ts                    -- MCP server entry, tool assembly (17 tools)
    db.ts                       -- SQLite schema + upsert seed logic
    types.ts                    -- Tool types, QuickRef interface
    gotchaSeed.ts               -- 32 pre-seeded Convex gotchas
    tools/
      schemaTools.ts            -- Schema audit, index suggestions, validator coverage
      functionTools.ts          -- Function audit, cross-call detection, reference checking
      httpTools.ts              -- HTTP endpoint analysis (routes, CORS, duplicates)
      deploymentTools.ts        -- Pre-deploy gate, env var checking (Convex-filtered)
      learningTools.ts          -- Gotcha recording + FTS5 search
      methodologyTools.ts       -- Methodology guides, BM25 tool discovery
      integrationBridgeTools.ts -- Rules generation, schema snapshots with index diffing, project bootstrap
      cronTools.ts              -- Cron job validation
      componentTools.ts         -- Component config analysis
      toolRegistry.ts           -- Central catalog with quickRef metadata + BM25 scoring
      embeddingProvider.ts      -- Optional semantic search (Google/OpenAI embeddings)
    __tests__/
      tools.test.ts             -- 30 integration tests
```

## Changelog

### v0.3.0
- **New tool**: `convex_analyze_http` -- HTTP endpoint analysis (duplicate routes, CORS, OPTIONS handlers)
- **Cross-call detection**: queries calling `ctx.runMutation`/`ctx.runAction` flagged as critical
- **12 new gotchas**: pagination, ctx.auth, scheduled functions, HTTP routes, CORS, v.any(), storage, transactions, document limits, "use node"
- **Schema snapshot diffs** now track index additions/removals per table
- **env_vars** filtered to Convex-specific patterns (excludes NODE_ENV, PATH, HOME, etc.)
- **Gotcha seeding** upgraded to upsert -- existing users get new gotchas on upgrade
- **Bug fixes**: fnv1aHash missing in embeddingProvider, collectTsFilesFlat ESM compat

### v0.2.0
- Schema audit noise reduced (836 -> 163 issues): index naming aggregated, v.any() detection added
- Function audit severity corrected: missing returns downgraded from critical to warning
- Deploy gate threshold: only blocks on >10 criticals
- npm tarball reduced from 45.9kB to 31.5kB

### v0.1.0
- Initial release: 16 tools, 20 gotchas, BM25 discovery, embedding-enhanced search
