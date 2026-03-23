# Phase 14: Tool Decoupling & Industry-Standard Organization

## Problem
338 tools in a monolithic server. All 65 tool files (62K lines) loaded at startup even when user selects 28-tool preset. No lazy loading, no dynamic imports, no tool annotations.

## Industry Research (Mar 2026)

### Patterns Observed
| Pattern | Who | How | Result |
|---------|-----|-----|--------|
| Dynamic Toolsets | GitHub (162 tools) | 3 meta-tools → LLM activates domains | 3→162 on demand |
| Code Mode | Cloudflare (2,500 endpoints) | 2 tools: search + execute | 2 tools total |
| STRAP | Outlet (96→10) | domain(resource, action) routing | 80% reduction |
| Permission-Scoped | Stripe | API key controls tool visibility | ~10 tools |
| Coarse Workflow | Neon, Supabase | Multi-step workflows as single tools | 15-20 tools |

### AWS Guidance
- Split at 50 tools per server
- Use `domain_noun_verb` naming
- 3 discovery approaches: static, dynamic, search-based

### MCP Spec Features
- Tool annotations: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`, `title`
- Dynamic tool updates: `tools/list_changed` notifications
- Extensions framework for capability negotiation

## Implementation

### 1. Dynamic Imports (toolsetRegistry.ts)
Replace 65 static imports with `TOOLSET_LOADERS: Record<string, () => Promise<McpTool[]>>`.
Only load selected domains at startup.

### 2. MCP Tool Annotations (index.ts)
Auto-classify all tools by name prefix:
- `get_/list_/search_/discover_` → readOnlyHint: true
- `delete_/remove_/clear_` → destructiveHint: true
- `run_/execute_/open_` → openWorldHint: true

### 3. Registry Filtering (toolRegistry.ts)
`getFilteredRegistry(selectedDomains)` returns only entries for active domains.

### 4. localFileTools Split
6,600 lines → 5 submodules (csv, json, text, media, system). Barrel re-export.

### 5. STRAP Consolidation (future)
CRUD-heavy domains collapse into `domain_manage(resource, action)` pattern.
Candidates: founder_tracking (8→1), causal_memory (10→2), dogfood_judge (12→2).

## Metrics
| Metric | Before | After |
|--------|--------|-------|
| Startup imports | 65 files, 62K lines | Only selected domains |
| Tool count (cursor preset) | 28 served, 338 loaded | 28 served, 28 loaded |
| Largest tool file | 6,600 lines | <1,500 lines |
| Tool annotations | None | All 338 annotated |
| Registry entries loaded | 338 | Only selected domains |

## Sources
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [Cloudflare Code Mode](https://blog.cloudflare.com/code-mode-mcp/)
- [STRAP Pattern](https://almatuck.com/articles/reduced-mcp-tools-96-to-10-strap-pattern)
- [AWS MCP Tool Strategy](https://docs.aws.amazon.com/prescriptive-guidance/latest/mcp-strategies/mcp-tool-strategy-organization.html)
- [MCP Tools Spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
