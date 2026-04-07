---
name: nodebench
description: >
  Entity intelligence and founder clarity inside Claude Code. Search any company,
  run banker-grade deep diligence, get actionable remediation steps, and inject
  company truth into your session. Delegates implementation tasks to Codex when available.
license: MIT
---

# NodeBench AI — Claude Code Plugin

You have access to NodeBench AI for entity intelligence and founder clarity. Use these
commands to search companies, run diligence, get remediation, and manage company context.

## Commands

### /nodebench:search <query>

Search any company, market, or question. Returns a structured intelligence packet.

**Usage:**
```
/nodebench:search Anthropic
/nodebench:search "Tests Assured" --lens banker
/nodebench:search "AI commerce market 2026" --lens investor
```

**Implementation:**
1. Check if NodeBench MCP is connected by looking for `web_search` or `enrich_entity` tools
2. If MCP is available, use `web_search` + `enrich_entity` for the query
3. If MCP is not available, call the NodeBench API:
   ```bash
   curl -s -X POST "https://www.nodebenchai.com/api/search" \
     -H "Content-Type: application/json" \
     -d '{"query":"<QUERY>","lens":"<LENS>"}'
   ```
4. Parse and present the result as a structured intelligence brief

### /nodebench:diligence <company>

Run deep diligence on a company. Returns 6-branch parallel research: people, timeline,
financials, competitive landscape, products, and risk flags. Takes 30-90 seconds.

**Usage:**
```
/nodebench:diligence "Tests Assured"
/nodebench:diligence Anthropic --lens investor
```

**Implementation:**
1. Call the Convex API to start a deep search:
   ```bash
   # Start the search (returns session ID instantly)
   curl -s -X POST "https://agile-caribou-964.convex.cloud/api/mutation" \
     -H "Content-Type: application/json" \
     -d '{"path":"domains/search/searchPipeline:startDeepSearch","args":{"query":"<COMPANY>","lens":"<LENS>"}}'
   ```
2. Poll for results:
   ```bash
   curl -s -X POST "https://agile-caribou-964.convex.cloud/api/query" \
     -H "Content-Type: application/json" \
     -d '{"path":"domains/search/searchPipeline:getSearchSession","args":{"sessionId":"<SESSION_ID>"}}'
   ```
3. Wait until status is "complete" or "error"
4. Present the result organized by branch: people, timeline, financials, market, products, risks
5. Include the remediation items and SEO audit

### /nodebench:remediate

Show actionable remediation steps from the last diligence search. Each gap has a severity,
action, effort estimate, and expected result.

**Usage:**
```
/nodebench:remediate
/nodebench:remediate --delegate   # Delegate implementation to Codex if available
```

**When `--delegate` is used:**
For each remediation item, check if the Codex plugin is available. If so, delegate
implementation tasks using `/codex:rescue`:
```
/codex:rescue --background <remediation action description>
```

### /nodebench:packet

Inject the current company truth packet into your session context. Useful when you're
about to build something and need the company's identity, contradictions, and constraints
as context.

**Usage:**
```
/nodebench:packet
/nodebench:packet --block current_wedge
/nodebench:packet --block open_contradictions
```

**Implementation:**
1. If NodeBench MCP is connected, use `get_company_truth` tool
2. If not, use the REST API:
   ```bash
   curl -s "https://www.nodebenchai.com/api/subconscious/blocks"
   ```
3. Format the blocks as a structured context block and inject into the conversation

### /nodebench:setup

Check if NodeBench is properly configured and guide the user through setup.

**Usage:**
```
/nodebench:setup
```

**Implementation:**
1. Check if NodeBench MCP is connected:
   ```bash
   claude mcp list | grep nodebench
   ```
2. If not connected, offer to install:
   ```bash
   claude mcp add nodebench -- npx -y nodebench-mcp --preset founder
   ```
3. Check if the web app is reachable:
   ```bash
   curl -s "https://www.nodebenchai.com/api/search/health"
   ```
4. Check if Convex is reachable:
   ```bash
   curl -s "https://agile-caribou-964.convex.cloud/api/query" \
     -H "Content-Type: application/json" \
     -d '{"path":"domains/search/searchPipeline:listRecentSearches","args":{"limit":1}}'
   ```
5. Report status and guide through any missing setup

## Context Injection

At the start of every session, NodeBench may inject a brief whisper if relevant context
exists. This comes from the subconscious memory blocks:

- **current_wedge**: What the company is building and why
- **open_contradictions**: Conflicts between stated goals and evidence
- **top_priorities**: What matters most right now
- **recent_important_changes**: What changed since last session

The whisper is suppressed if:
- No blocks are populated yet
- The prompt is trivial (git commands, typo fixes)
- The same whisper was given recently

## Integration with Codex

When both NodeBench and the Codex plugin are installed, they chain together:

1. `/nodebench:diligence` finds gaps (e.g., "No pricing page")
2. `/nodebench:remediate --delegate` sends the task to Codex
3. `/codex:rescue` runs the implementation in a sandboxed worktree
4. `/codex:result` returns the output
5. NodeBench records the execution as a founder episode span

## MCP Tools Reference

When NodeBench MCP is connected, these tools are available:

| Tool | What it does |
|------|-------------|
| `get_company_truth` | Get subconscious memory blocks |
| `update_company_truth` | Update a memory block |
| `get_subconscious_hint` | Get guidance for a task |
| `list_contradictions` | List open contradictions |
| `traverse_entity_graph` | Navigate the knowledge graph |
| `find_contradictions_for` | Find entities that contradict something |
| `get_packet_lineage` | Trace a packet's derivation chain |
| `discover_tools` | Find relevant tools for a task |
| `web_search` | Search the web |
| `enrich_entity` | Enrich a company entity |
