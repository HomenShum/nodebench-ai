# NodeBench AI — Claude Code Project Instructions

## Project overview
NodeBench — the local-first operating-memory and entity-context layer for agent-native businesses. 346-tool MCP server with progressive discovery, lazy-loading toolset registry, persona presets (starter/founder/banker/operator/researcher), search-first AI app with 6 role lenses and 8-section entity intelligence workspace. Monorepo with `packages/mcp-local` (main server), `packages/mcp-client` (typed client SDK), and `packages/convex-mcp-nodebench` (Convex auditor). Design system: glass card DNA, warm terracotta `#d97757` accent, Manrope + JetBrains Mono typography.

## Key files
- `AGENTS.md` — Full methodology, eval bench, tool pipeline, agent contract
- `AI_FLYWHEEL.md` — Mandatory 7-step flywheel (step 7 = re-examine for 11/10)
- `packages/mcp-local/src/index.ts` — Server entry, toolset gating, CLI args, CLI subcommands (discover/setup/workflow/quickref/call/demo)
- `packages/mcp-local/src/tools/toolRegistry.ts` — 346-entry tool catalog with `nextTools` + `relatedTools` cross-refs, `computeRelatedTools()` auto-derivation, `hybridSearch` with offset pagination
- `packages/mcp-local/src/tools/deepSimTools.ts` — 7 Deep Sim tools (simulation, postmortem, trajectory)
- `server/mcpGateway.ts` — WebSocket MCP gateway with API key auth, rate limiting, idle timeout
- `server/mcpAuth.ts` — API key validation and session management
- `server/mcpSession.ts` — MCP session lifecycle over WebSocket
- `packages/mcp-local/src/tools/progressiveDiscoveryTools.ts` — `discover_tools` (pagination + expansion), `get_tool_quick_ref` (multi-hop BFS depth 1-3), `get_workflow_chain`
- `packages/mcp-local/src/tools/skillUpdateTools.ts` — Skill freshness tracking

## Rules structure
Modular rules live in `.claude/rules/` — each focused on one concern with `related_` frontmatter for cross-referencing:

| Rule | Focus | related_ (one-hop) |
|------|-------|---------------------|
| `reexamine_process` | Orchestrator — when & how to re-examine | a11y, resilience, polish, keyboard, performance, analyst_diagnostic |
| `reexamine_a11y` | ARIA, reduced motion, color-blind, screen readers | keyboard, polish, process |
| `reexamine_resilience` | Retry/backoff, partial failures, graceful degradation | performance, process, polish, analyst_diagnostic |
| `reexamine_polish` | Skeleton loading, staggered fade-ins, print stylesheet | a11y, performance, process |
| `reexamine_keyboard` | Skip links, shortcuts, tab order, focus traps | a11y, process |
| `reexamine_performance` | Progressive disclosure, smart refresh, lazy loading | resilience, polish, process |
| `completion_traceability` | Cite original request on task completion | process, analyst_diagnostic |
| `forecasting_os` | Forecasting architecture, Brier scoring, TRACE wrapping, LinkedIn Δ badges | process, analyst_diagnostic, resilience, traceability |
| `dogfood_verification` | UI dogfood protocol + screenshot evidence | analyst_diagnostic, process, completion_traceability, product_design_dogfood |
| `analyst_diagnostic` | Root-cause diagnosis, not bandaids | dogfood_verification, process, resilience, traceability |
| `reexamine_design_reduction` | Jony Ive principles: earned complexity, kill jargon | a11y, polish, process, keyboard |
| `product_design_dogfood` | Jony Ive review + dogfood evidence visible in-app (`/dogfood`) | analyst_diagnostic, dogfood_verification, design_reduction |
| `flywheel_continuous` | Continuous poll→diagnose→fix→dogfood loop, never ask to continue | process, analyst_diagnostic, dogfood_verification, product_design_dogfood, completion_traceability |
| `self_direction` | Never wait — decide, act, verify visually, keep momentum | process, flywheel_continuous, analyst_diagnostic, completion_traceability |
| `scenario_testing` | Scenario-based tests only — real personas, scale axis, duration axis, no shallow tests | analyst_diagnostic, reexamine_resilience, process, completion_traceability |
| `gemini_qa_loop` | Gemini 3 Flash vision QA loop — automated scoring, fix strategy, fallback chain | dogfood_verification, product_design_dogfood, flywheel_continuous, analyst_diagnostic, completion_traceability |
| `agentic_reliability` | 8-point checklist for agent-facing infra: bounded memory, honest status/scores, SSRF, timeouts, error boundaries, deterministic hashing | analyst_diagnostic, reexamine_resilience, scenario_testing, self_direction, reexamine_process, completion_traceability |
| `deep_read_audit` | Full end-to-end read protocol — parallel subagents, numbered findings, P0/P1/P2 synthesis | analyst_diagnostic, process, completion_traceability |
| `usability_scorecard` | 10-dimension usability scoring (time-to-value, friction, shareability, etc.) | pre_release_review, product_design_dogfood, analyst_diagnostic |
| `pre_release_review` | 13-layer review stack (build, test, visual, agent, content, a11y, bundle, browser, backend, gateway, auth, cross-browser, regression) | qa_dogfood, flywheel_continuous, completion_traceability |
| `qa_dogfood` | Automated + manual QA checklist for 5 surfaces | dogfood_verification, analyst_diagnostic, flywheel_continuous |

**Two-hop discovery**: Follow a rule's `related_` to reach its neighbors, then follow *their* `related_` for second-degree connections. Example: `process` → `a11y` → `keyboard`.

## Progressive Discovery features
- **`relatedTools`**: Conceptually adjacent tools auto-populated on all 346 entries
- **Cursor pagination**: `discover_tools` supports `offset`/`limit` with stable `totalMatches` and `hasMore`
- **Result expansion**: `discover_tools({ expand: 3 })` adds `relatedTools` neighbors at 50% parent score
- **Multi-hop BFS**: `get_tool_quick_ref({ depth: 2 })` traverses `nextTools` + `relatedTools` edges, returns `hopDistance` and `reachedVia`
- **Transitive co-occurrence**: `getCooccurrenceEdges(tool, { transitive: true })` infers A→B→C edges

## Conventions
- Test runner: `npx vitest run` from `packages/mcp-local/`
- Tool schema: `{ name, description, inputSchema, handler }` (McpTool type)
- TOON encoding on by default (`--no-toon` to disable)
- Embedding search on by default (`--no-embedding` to disable)
- **Completion traceability**: On task completion, always reference the user's original request — quote or paraphrase the specific section being fulfilled, then summarize what was done. User writes long/burst prompts across sessions and needs the link between ask → delivery.
- **Analyst diagnostic**: Always guide yourself like an analyst diagnosing the root cause, not a junior dev slapping on a bandaid. Trace upstream from symptom → root cause before writing any fix. Ask "why" 5 times. Fix the cause, not the symptom.
- **Self-direction**: Never wait for permission or next instructions. When a task completes, immediately identify and start the next highest-impact action. Verify visually first, code-grep second. Only pause for user input when direction is genuinely ambiguous.
- **Scenario-based testing**: Never write simple tests. Every test must start from a real user persona and goal, simulate realistic behavior, and verify at scale. Required: all behavior angles (happy/sad/adversarial/concurrent/degraded), both short-running (burst) and long-running (sustained accumulation) scenarios. Shallow tests that pass in isolation but miss production failure modes are banned. Use `/scenario-testing` command to audit existing tests.
- **Agentic reliability**: On every backend/infra change, run the 8-point checklist automatically: BOUND (memory eviction), HONEST_STATUS (no fake 2xx), HONEST_SCORES (no hardcoded floors), TIMEOUT (abort controllers), SSRF (URL validation), BOUND_READ (response size caps), ERROR_BOUNDARY (async error handling), DETERMINISTIC (stable hashing). Use `/agentic-reliability-audit` for full codebase sweep. See `.claude/rules/agentic_reliability.md`.
- Presets: starter (15 tools), founder, banker, operator, researcher persona presets, plus legacy domain presets: default (81), web_dev (150), research (115), data (122), devops (92), mobile (126), academic (113), multi_agent (136), content (115), full (346) — see `toolsetRegistry.ts`
- CLI subcommands: `discover`, `setup`, `workflow`, `quickref`, `call`, `demo` — run-and-exit, bypass MCP transport, call tool handlers directly. Respects `--preset` and `--no-embedding`. Test with `cliSubcommands.test.ts`.
- New domains: `deep_sim` (7 tools — simulation, postmortem, trajectory scoring)

## Local Dashboard
- `npm run local:sync` — Pull daily brief + narrative from Convex into local SQLite
- `npm run local:sync:full` — Sync last 30 days
- `npm run local:refresh` — Sync + verify + print summary
- Dashboard: http://127.0.0.1:6275 (starts automatically with MCP server)
- MCP tools: sync_daily_brief, get_daily_brief_summary, get_narrative_status, get_ops_dashboard, open_local_dashboard
- Data: ~/.nodebench/nodebench.db (shared with all MCP local data)
- Privacy mode: camera opt-in toggle, sanitizes entities when bystanders detected

## WebSocket MCP Gateway
- `server/mcpGateway.ts` — WebSocket server, MCP protocol over WS
- `server/mcpAuth.ts` — API key validation, rate limiting (100/min), idle timeout (30min)
- `server/mcpSession.ts` — session lifecycle, tool dispatch
- Health: `GET /health`, `GET /mcp/health`
- Close codes: 4001 (auth), 4002 (rate limit), 4003 (timeout)
- Client SDK: `packages/mcp-client/` — typed client for external consumers

## Key Routes
- **5-surface cockpit**: `/?surface=ask` (landing), `/?surface=memo` (Decision Workbench), `/?surface=research`, `/?surface=editor` (Workspace), `/?surface=telemetry` (System)
- `/deep-sim` (Decision Workbench), `/postmortem`, `/agent-telemetry`
- `/developers`, `/api-keys` (API key management), `/api-docs`, `/pricing`, `/changelog`, `/legal`
- Onboarding: 3-step wizard, localStorage flag
- Demo: 8 pre-scripted conversations, voice CTA on landing, 12 voice aliases
- Proof section: founder bio, system status, open source, try-before-trust

## Same rules mirrored to
- `.cursor/rules/*.mdc` — Cursor AI (reexamine_*, forecasting_os, analyst_diagnostic, dogfood_verification, completion_traceability, design_reduction, deep_read_audit)
- `.windsurf/rules/*.md` — Windsurf AI (same set)

## LinkedIn post pipeline
Key files: `convex/workflows/dailyLinkedInPost.ts`, `convex/domains/narrative/actions/competingExplanations.ts`, `convex/domains/narrative/validators.ts`, `convex/domains/social/linkedinPosting.ts`

### CRITICAL: LinkedIn API posting rules
- **Parentheses `()` silently truncate posts** — LinkedIn's REST Posts API drops all content from the first `(` onwards with no error. `cleanLinkedInText()` auto-replaces `(` → `[` and `)` → `]`.
- **ALWAYS verify posts after publishing** — Call `fetchPosts` with the returned URN and confirm `commentary` field contains ALL sections. Never declare a post successful without API read-back.
- **No Unicode in shell args** — Arrows, smart quotes, em-dashes all cause issues. Keep post content ASCII-only.
- **Pipe `|` breaks posts** — Replaced with `-` by `cleanLinkedInText()`.
- CLI posting: `npx convex run workflows/linkedinTrigger:postTechnicalReport '{"content":"...", "target":"organization"}'`

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
