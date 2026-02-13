# NodeBench AI — Claude Code Project Instructions

## Project overview
NodeBench MCP — a 215-tool Model Context Protocol server with progressive discovery, agent-as-a-graph embeddings, and toolset gating presets. Monorepo with `packages/mcp-local` (main server) and `packages/convex-mcp-nodebench` (Convex auditor).

## Key files
- `AGENTS.md` — Full methodology, eval bench, tool pipeline, agent contract
- `AI_FLYWHEEL.md` — Mandatory 7-step flywheel (step 7 = re-examine for 11/10)
- `packages/mcp-local/src/index.ts` — Server entry, toolset gating, CLI args
- `packages/mcp-local/src/tools/toolRegistry.ts` — 175-entry tool catalog with `nextTools` + `relatedTools` cross-refs, `computeRelatedTools()` auto-derivation, `hybridSearch` with offset pagination
- `packages/mcp-local/src/tools/progressiveDiscoveryTools.ts` — `discover_tools` (pagination + expansion), `get_tool_quick_ref` (multi-hop BFS depth 1-3), `get_workflow_chain`
- `packages/mcp-local/src/tools/skillUpdateTools.ts` — Skill freshness tracking

## Rules structure
Modular rules live in `.claude/rules/` — each focused on one concern with `related_` frontmatter for cross-referencing:

| Rule | Focus | related_ (one-hop) |
|------|-------|---------------------|
| `reexamine_process` | Orchestrator — when & how to re-examine | a11y, resilience, polish, keyboard, performance |
| `reexamine_a11y` | ARIA, reduced motion, color-blind, screen readers | keyboard, polish, process |
| `reexamine_resilience` | Retry/backoff, partial failures, graceful degradation | performance, process, polish |
| `reexamine_polish` | Skeleton loading, staggered fade-ins, print stylesheet | a11y, performance, process |
| `reexamine_keyboard` | Skip links, shortcuts, tab order, focus traps | a11y, process |
| `reexamine_performance` | Progressive disclosure, smart refresh, lazy loading | resilience, polish, process |

**Two-hop discovery**: Follow a rule's `related_` to reach its neighbors, then follow *their* `related_` for second-degree connections. Example: `process` → `a11y` → `keyboard`.

## Progressive Discovery features
- **`relatedTools`**: Conceptually adjacent tools auto-populated on all 215 entries (949 connections, 191% amplification over `nextTools`, 90% cross-domain)
- **Cursor pagination**: `discover_tools` supports `offset`/`limit` with stable `totalMatches` and `hasMore`
- **Result expansion**: `discover_tools({ expand: 3 })` adds `relatedTools` neighbors at 50% parent score
- **Multi-hop BFS**: `get_tool_quick_ref({ depth: 2 })` traverses `nextTools` + `relatedTools` edges, returns `hopDistance` and `reachedVia`
- **Transitive co-occurrence**: `getCooccurrenceEdges(tool, { transitive: true })` infers A→B→C edges

## Conventions
- Test runner: `npx vitest run` from `packages/mcp-local/`
- Tool schema: `{ name, description, inputSchema, handler }` (McpTool type)
- TOON encoding on by default (`--no-toon` to disable)
- Embedding search on by default (`--no-embedding` to disable)
- Presets: default (50 tools), web_dev (102), full (175) — see `toolsetRegistry.ts`

## Same rules mirrored to
- `.cursor/rules/reexamine_*.mdc` — Cursor AI
- `.windsurf/rules/reexamine_*.md` — Windsurf AI

## LinkedIn post pipeline
Key files: `convex/workflows/dailyLinkedInPost.ts`, `convex/domains/narrative/actions/competingExplanations.ts`, `convex/domains/narrative/validators.ts`

### Voice principles (GENERAL persona)
The author is a builder-analyst: banking background + agentic AI builder. Posts should read as a practitioner sharing what they found, not a pundit broadcasting opinions.

- **Practitioner authority**: "Based on today's research" not "I think." Show the work (sources, fact-check badges, evidence scores).
- **Agency over anxiety**: Every post must give the reader something they can do, check, or decide — not just something to fear or hype.
- **Transparent rigor**: Evidence breakdowns use deterministic boolean checklists (`[5/6]: gov source, corroborated, hard numbers...`), not LLM-hallucinated grades. Show the gaps explicitly for weak explanations.
- **Signal vs noise framing**: Lead with what social feeds are obsessing over, then pivot to what actually matters. The narrative framing (`dominantStory` + `underReportedAngle`) drives the hook.
- **Falsification as reader empowerment**: Post 3 tells readers how to stress-test each explanation. Score badges (`[N/6]`) next to falsification criteria let readers calibrate trust.

### Post structure (3-post thread)
1. **The Signal** — Hook via narrative framing → numbered signals with hard numbers + URLs → competing explanations as prose → "Which are you tracking?"
2. **The Analysis** — Fact-checks with badges (VERIFIED/PARTIAL/UNVERIFIED) + source attribution → evidence breakdown per explanation → "What claim would you fact-check?"
3. **The Agency** — Actionable steps → stress-test each explanation with score badge → "What are you working on?"

### Evidence rendering rules
- Grounded explanations (`>=4/6`): show what passed (strengths signal credibility)
- Mixed/speculative explanations (`<4/6`): show what's missing with `needs` prefix (gaps are the actionable info)
- Legacy digests without `evidenceChecklist`: fall back to generic labels
- All 6 boolean checks computed deterministically from data — only `hasFalsifiableClaim` is LLM-derived
