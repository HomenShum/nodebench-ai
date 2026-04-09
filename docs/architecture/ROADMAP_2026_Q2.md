# NodeBench Roadmap — Q2 2026

Modeled on Anthropic's release logic: each push solves one painful system bottleneck end-to-end.

## Release 1: Clarity (April 2026) — CURRENT

**Theme:** "Know what company you're building."

**What ships:**
- [x] Mobile-first Ask surface (ChatGPT pattern)
- [x] 4-surface IA (Ask, Library, Connect, System)
- [x] Signal taxonomy (12 categories, 30 labels)
- [x] Evidence spans with verification
- [x] Pipeline v2 (Linkup → Gemini 3.1 → package)
- [x] HyperLoop eval with two-layer scoring
- [x] Claude Code ingest tools (3 MCP tools)
- [x] LangGraph service on GCP Cloud Run
- [ ] ResultWorkspace competitor-grade rewrite (4-block packet)
- [ ] Company truth first card with inline citations
- [ ] Hidden requirements / founder credibility section
- [ ] Starter packet export

**Success condition:** New founder pastes messy context → gets company truth, contradictions, next moves, starter packet.

## Release 2: Context (May 2026)

**Theme:** "Stop starting over."

**What ships:**
- [ ] MCP init/search/explore/index end-to-end
- [ ] Local mirror dashboard with shelf memory
- [ ] Own-company vs external-company mode
- [ ] Packet lineage (created from, refreshed, superseded)
- [ ] "Since your last session" with state diff
- [ ] Repeated-question prevention
- [ ] Smart ingest Phase 1 (Claude Code JSONL → Library)

**Success condition:** Founders and Claude Code stop feeling like brilliant strangers every new thread.

## Release 3: Handoff (June 2026)

**Theme:** "Turn clarity into work."

**What ships:**
- [ ] Canonical implementation packet
- [ ] Delegation packet with guardrails
- [ ] Packet-to-Claude-Code bridge
- [ ] Packet-to-GitHub workflow
- [ ] Role-based packet exports (banker, investor, founder, CEO)
- [ ] MCP shared-context retrieval for agents

**Success condition:** A good packet directly drives implementation, not just sits in a dashboard.

## Release 4: Proof (July 2026)

**Theme:** "Do it cheaper and prove it."

**What ships:**
- [ ] Workflow profiling (cost per search, tokens per step)
- [ ] Repeated pattern detection
- [ ] Validated shortcut engine
- [ ] Baseline vs optimized path compare
- [ ] User-facing "validated shortcut" cards
- [ ] Benchmark lanes

**Success condition:** NodeBench can say with evidence: old path → new path → cost saved → quality preserved.

## Release 5: Compound (August 2026)

**Theme:** "The system gets better because you use it."

**What ships:**
- [ ] Subconscious / background packet-aware memory
- [ ] Watchlists and ambient deltas
- [ ] Founder progression scoring
- [ ] Vertical diligence packs (banking, investor, legal)
- [ ] Archive-based improvement loop (HyperLoop promotion)
- [ ] Workflow template archive with cross-domain transfer

**Success condition:** NodeBench is materially more useful after 30, 60, and 90 days of use.

## Push Schedule

| Cadence | What ships | Example |
|---------|-----------|---------|
| Every 2 weeks | One visible painkiller | "Search works on mobile" |
| Every 6 weeks | One system-level upgrade | Context release, Handoff release |
| Every quarter | One positioning-defining capability | Vertical diligence packs |

## Anti-patterns (banned)

- Shipping more tabs instead of solving bottlenecks
- Adding more models without fixing the pipeline
- More agents without proof they help
- More dashboards without more clarity
- Feature breadth that dilutes the signature dishes

## Current Architecture (April 2026)

| Layer | Tool | Status |
|-------|------|--------|
| Pipeline | v2 (classify → Linkup → Gemini 3.1 → package) | ✅ Live |
| Models | gemini-3.1-flash-lite-preview (primary) | ✅ Verified |
| Search | Linkup API (standard, 30s timeout) | ✅ Live |
| Taxonomy | 12 categories, 30 labels | ✅ Wired |
| Evidence | Verification per claim | ✅ Wired |
| Routing | Token-overlap scoring, 6 domains | ✅ Wired |
| Eval | HyperLoop two-layer (deterministic + LLM judge) | ✅ Live |
| Memory | Session memory + recovery strategies | ✅ Wired |
| Ingest | 3 Claude Code MCP tools | ✅ CLI tested |
| LangGraph | Social matching agent on GCP Cloud Run | ✅ Deployed |
| Frontend | 4 surfaces, mobile ChatGPT pattern | ✅ Verified |
