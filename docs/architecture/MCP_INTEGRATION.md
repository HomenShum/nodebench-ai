# MCP Integration — 350 Tools, Progressive Discovery

**Status:** Living · Last reviewed 2026-04-19
**Owner:** Core team
**Supersedes:** `AGENT_TRUST_INFRASTRUCTURE.md`, `PROGRESSIVE_DISCLOSURE_AND_MCP_DISCOVERY.md`, progressive-disclosure-*, `DAILY_BRIEFING_MCP_UNIFIED_IMPLEMENTATION_PLAN.md` — archived.

## TL;DR

NodeBench ships as an MCP server (`nodebench-mcp` on npm) with ~350 tools across 50+ domains. One-line install: `claude mcp add nodebench -- npx -y nodebench-mcp`. Tools are discoverable via progressive disclosure (`discover_tools`, `get_tool_quick_ref`, `get_workflow_chain`) to avoid overwhelming agents with a 350-item catalog.

## Prior art

| Reference | Pattern |
|---|---|
| **Anthropic MCP protocol spec (2024-11-05)** | Tool discovery + progressive loading |
| **Claude Code built-in tools** | Tool allowlist per agent type |
| **LangChain / LlamaIndex tool registries** | Hybrid search over tool catalog |

## Invariants

1. **One tool registry, many discovery paths.** Tools live in `packages/mcp-local/src/tools/toolRegistry.ts`.
2. **Progressive discovery is the default.** Clients never need to load all 350 at once.
3. **Presets gate tool visibility** per use-case: `starter` (15) · `founder` · `banker` · `researcher` · `full` (350).
4. **Related-tool cross-refs** are bidirectional and auto-derived.
5. **Toolset gating respects Cursor's 40-tool limit** with the `cursor` preset.

## Architecture

```
┌─────────────────────────────────────────────────┐
│ toolRegistry.ts (350 entries)                   │
│   category · tags · quickRef · phase ·          │
│   complexity · nextTools · relatedTools          │
├─────────────────────────────────────────────────┤
│ Discovery tools (meta)                          │
│   discover_tools(query, offset, limit, expand)  │
│   get_tool_quick_ref(tool, depth)               │
│   get_workflow_chain(workflow)                  │
├─────────────────────────────────────────────────┤
│ Presets (`toolsetRegistry.ts`)                  │
│   starter · founder · banker · researcher ·     │
│   operator · cursor · full · + 10 domain presets│
├─────────────────────────────────────────────────┤
│ Transport                                        │
│   stdio (default for Claude Code)               │
│   WebSocket gateway (server/mcpGateway.ts)      │
│     · API key auth (mcpAuth.ts)                 │
│     · rate limit 100/min · idle 30min           │
│     · close codes 4001/4002/4003                │
└─────────────────────────────────────────────────┘
```

## CLI subcommands

```
nodebench-mcp discover   # run-and-exit discovery
nodebench-mcp setup      # interactive setup
nodebench-mcp workflow   # list workflow chains
nodebench-mcp quickref   # quick ref for a tool
nodebench-mcp call       # call a tool by name
nodebench-mcp demo       # instant demo mode
```

All bypass MCP transport and call handlers directly.

## Install

```bash
# Claude Code (one-liner)
claude mcp add nodebench -- npx -y nodebench-mcp

# Cursor (mcp.json)
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp"]
    }
  }
}
```

Also: public `https://www.nodebenchai.com/agent-setup.txt` as single-paste instructions for any Claude-compatible agent.

## Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Client hits 40-tool limit (Cursor) | Preset gating | User selects `cursor` preset |
| Tool count drift between client + server | Handshake exchange | Reload tool list on mismatch |
| Embedding search returns empty | Fallback chain: HF → Google → OpenAI | Lexical-only search if all fail |

## How to extend

Adding a new MCP tool:

1. Create handler in `packages/mcp-local/src/tools/<domain>/<toolName>.ts`
2. Add schema with `{ name, description, inputSchema, handler }`
3. Register in `toolRegistry.ts` with tags + quickRef + relatedTools
4. Add to relevant presets in `toolsetRegistry.ts`
5. Unit test

## Related

- [AGENT_PIPELINE.md](AGENT_PIPELINE.md) — how pipeline sub-agents use MCP tools
- [DILIGENCE_BLOCKS.md](DILIGENCE_BLOCKS.md) — block-specific tool allowlists

## Changelog

| Date | Change |
|---|---|
| 2026-04-19 | Consolidated MCP integration spec |
