# NodeBench AI — Attrition Redesign Spec

> Modeled after attrition.sh: proof-first, minimal surfaces, real data only.
> Informed by Addy Osmani's agent-skills: deprecation-migration, code-simplification, frontend-ui-engineering.
> Based on full 20-page traversal at both 1440x900 (desktop) and 375x812 (mobile).

---

## The Problem

NodeBench has **40+ routes** and **14 surface IDs** but only **5 nav items**. The result:
- 7+ surfaces are completely orphaned from navigation
- The richest surface (Research Hub, with live data) is hidden
- The root route `/` goes to Decision Workbench — a complex demo — instead of the search bar
- Demo/fixture data runs on 90% of surfaces, creating a "museum, not a tool" impression
- A P0 crash (`MessageSquare is not defined` in CommandPalette.tsx) kills mobile sessions after ~15 navigations
- Tool counts vary (304 vs 338 vs 350+) across pages

**attrition.sh runs on 3 pages. NodeBench needs to get close.**

---

## Target: 4 Pages

### Page 1: `/` — Landing + Search (public, no auth)

**Pattern**: attrition.sh home — 8-section single scroll + integrated search

| Section | Content | Source |
|---------|---------|--------|
| [1/8] Hero | "Entity intelligence for any company, market, or question." + search bar | New copy |
| [2/8] Product in one screen | Live search result (not demo) — run Anthropic query, show real output | Live API call |
| [3/8] Role lenses | 6 lens cards (Founder/Investor/Banker/CEO/Legal/Student) with example output per lens | Existing lens system |
| [4/8] How it works | 3-step flow: Search → Enrich → Decide. Show MCP tool chain visually | New |
| [5/8] Comparison | vs generic ChatGPT / Perplexity / manual research — feature table | New |
| [6/8] Real metrics | X queries processed, Y entities indexed, Z sources per query — live from API | Live counters |
| [7/8] Who it's for | 3 personas: Founder doing diligence, Investor screening deals, Operator monitoring market | Adapt from existing About |
| [8/8] Get started | 3 install methods: Web app / Claude Code MCP / Cursor MCP — copy-paste commands | Existing Connect content |

**Search bar behavior**: When user types and submits, the page transitions from landing scroll to full-page search results (like Perplexity). No surface switching — just scroll-to-results with URL update to `/?q=anthropic`.

**Mobile**: Same sections, stacked vertically. Search bar sticky at top after scroll past hero. Bottom nav appears after first search.

### Page 2: `/proof` — Evidence + Benchmarks (public, no auth)

**Pattern**: attrition.sh /proof — case studies with 4-column flow

| Section | Content |
|---------|---------|
| Hero | "Real queries. Real sources. Real intelligence." |
| Flagship case | Live benchmark: run "Anthropic AI valuation" through pipeline, show sources → extraction → grounding → output with trace |
| Proof types | Search Quality (eval scores), Entity Enrichment (source count), Grounding (hallucination rate), Role Shaping (lens differentiation) |
| 5 case studies | Real queries with 4-column flow: Query → Sources Found → Intelligence Extracted → Role-Shaped Output |
| Eval metrics | From searchQualityEval.ts — structural pass rate, Gemini pass rate, avg latency, corpus size |
| Benchmark ladder | 5-baseline comparison (Social → Model → Model+Browse → NodeBench → NodeBench Distilled) — ONLY if real data |

### Page 3: `/get-started` — Install + Connect (public, no auth)

**Pattern**: attrition.sh /get-started — 3 numbered install methods

| Method | Content |
|--------|---------|
| 1. Web app (free) | Link to nodebenchai.com, no account needed, search immediately |
| 2. Claude Code MCP | `npx nodebench-mcp@latest --preset=founder` + .mcp.json config |
| 3. Cursor / Windsurf | Cursor preset (28 tools), Windsurf setup, VS Code extension |

Below: API key management (existing /api-keys page content), pricing tiers, changelog timeline.

### Page 4: `/app` — Authenticated workspace (behind auth)

This is the only multi-surface page. Post-auth, users get a sidebar/bottom-nav workspace.

**5 surfaces (reduced from 14)**:

| Surface | What it contains | Merged from |
|---------|-----------------|-------------|
| **Ask** | Search + results + entity compare + role lenses | ask + compare |
| **Research** | Daily brief + signals + forecasts + watchlists | research (PROMOTED from hidden) |
| **Library** | Your reports + exported memos + uploaded files + change log | packets + library + receipts |
| **History** | Important changes + state diffs + agent actions | history + trace |
| **Connect** | MCP setup + integrations + watchlist config + system health | connect + telemetry (health only) |

**Killed surfaces**:
- `memo` (Decision Workbench) → becomes a view within Ask results (when user clicks "Run full analysis")
- `telemetry` → health indicators move to Connect, benchmarks move to /proof
- `library` → merged into Library (was near-empty duplicate of Packets)
- `trace` → merged into History
- `deep-sim` → dead route, already redirects to memo
- `compare` → sub-view of Ask (already implemented as `?view=entity-compare`)

---

## P0 Fixes (Before Any Redesign)

| Issue | File | Fix |
|-------|------|-----|
| MessageSquare crash | `src/layouts/chrome/CommandPalette.tsx:88` | Add missing import: `import { MessageSquare } from 'lucide-react'` |
| Root route → memo | View registry / router config | Change default to `?surface=ask` |
| Table overflow (pricing) | Pricing comparison table component | Wrap in `overflow-x-auto` or convert to stacked cards on mobile |
| Table overflow (telemetry) | Tool breakdown table component | Same — `overflow-x-auto` wrapper |
| Tool count inconsistency | /developers, /about, /connect | Single constant: `TOOL_COUNT = 304` (or current actual count) |
| Version mismatch | /about page | Remove hardcoded v2.70.0, read from package.json |
| Onboarding wizard on secondary routes | Wizard trigger logic | Only show on `/` or `/app`, not on /pricing /legal etc. |
| Temporal Gate spam | Workspace, Packets, History | Remove from all user surfaces — move to Connect health section |
| React textTransform warning | DOM prop passthrough | Fix 4 instances of incorrect prop |

---

## Design System (Keep)

The existing design DNA is strong and matches attrition.sh's aesthetic:
- Dark background: `--bg-primary: #151413`
- Glass cards: `border-white/[0.06] bg-white/[0.02] backdrop-blur`
- Terracotta accent: `#d97757`
- Typography: Manrope (UI) + JetBrains Mono (code/data)
- Section headers: `text-[11px] uppercase tracking-[0.2em]`

**Add from attrition.sh**:
- Section numbering `[N/M]` for landing page momentum
- 4-column proof cards (Before → Problem → Fix → Result)
- Verdict badges (VERIFIED / PARTIAL / MISSING) — already have in eval system
- Competitor comparison table with bold checkmarks
- Copy-paste code blocks with one-click copy

**Add from agent-skills (frontend-ui-engineering)**:
- Composition over configuration for all card components
- Container/Presentation split for data-fetching components
- Skeleton loading states for every async surface
- Error states with retry actions (not blank screens)

**Add from agent-skills (code-simplification)**:
- Every consolidation must preserve exact behavior
- Follow Chesterton's Fence — understand before removing
- Match project conventions (glass card DNA, not new patterns)

---

## Route Migration Plan

Using agent-skills deprecation-migration patterns: Advisory → Compulsory → Removal

### Phase 1: Redirect (Week 1)
All old routes redirect to new locations with console.warn:
```
/deep-sim → /app?surface=ask (was already broken)
/postmortem → /app?surface=ask&view=postmortem
/receipts → /app?surface=history
/benchmarks → /proof#benchmarks
/compare → /app?surface=ask&view=compare
/developers → /get-started#developers
/pricing → /get-started#pricing
/changelog → /get-started#changelog
/legal → /get-started#legal
/about → /#about
```

### Phase 2: Remove old components (Week 2)
Delete orphaned view components that are no longer routed to.
Keep the actual feature code (Decision Workbench, Postmortem, etc.) — just re-mount it within the new surface structure.

### Phase 3: Clean up registry (Week 3)
Remove old entries from viewRegistry.ts, viewToolMap.ts, viewBreadcrumbs.ts, viewCapabilityRegistry.ts.
Update CLAUDE.md route documentation.

---

## Mobile Architecture

### Bottom Nav (4 items post-redesign)

| Item | Icon | Surface |
|------|------|---------|
| Search | MagnifyingGlass | Ask (search + results) |
| Research | Newspaper | Research Hub (daily brief) |
| Library | FolderOpen | Reports + files + changes |
| Connect | Plug | Setup + health |

History becomes accessible from Library (tab) rather than primary nav.
This reduces bottom nav from 5 to 4, which gives more touch target width per button.

### Mobile-specific behaviors
- Search bar sticky after scrolling past hero
- Landing page sections stack vertically (no grid)
- Entity Compare renders sequentially (not side-by-side)
- Pricing table converts to stacked cards
- Telemetry tables convert to card list
- Decision Workbench renders in accordion sections (not tabs)

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Total routes | 40+ | 4 public + 5 app surfaces = 9 |
| Surfaces in nav | 5 (7 hidden) | 4-5 (0 hidden) |
| Pages with demo data | 90% | 0% on public pages |
| Time to first real result | Never (demo) | < 10 seconds (live search) |
| Mobile crash rate | 100% after ~15 navs | 0% |
| Console errors | 0 (desktop), P0 crash (mobile) | 0 both |
| Tool count references | 3 different numbers | 1 canonical constant |

---

## File Impact Estimate

| Area | Files affected | Complexity |
|------|---------------|------------|
| P0 fixes (CommandPalette, root route, table overflow) | 4-5 files | Low |
| New landing page (8-section scroll) | 1 new component + 8 section components | Medium |
| /proof page | 1 new component + case study data | Medium |
| /get-started page | 1 new component (mostly existing content rearranged) | Low |
| Surface consolidation (14 → 5) | viewRegistry.ts + 5-8 surface host components | High |
| Route migration (redirects) | Router config + viewRegistry.ts | Low |
| Mobile nav reduction (5 → 4) | Bottom nav component | Low |
| Delete orphaned components | 10-15 files removed | Low (deletion) |

---

## References

- **attrition.sh design analysis**: 3-page site, 9-section scroll, proof-first, section numbering
- **agent-skills/frontend-ui-engineering**: Composition, Container/Presentation, skeleton states
- **agent-skills/code-simplification**: Preserve behavior, Chesterton's Fence, project conventions
- **agent-skills/deprecation-migration**: Advisory → Compulsory → Removal lifecycle
- **agent-skills/performance-optimization**: Measure before optimizing, Core Web Vitals targets
- **agent-skills/accessibility-checklist**: 44px touch targets, keyboard nav, contrast ratios
- **Desktop audit**: 20 pages, zero console errors, 7+ orphaned surfaces, demo data everywhere
- **Mobile audit**: P0 crash, 4 unreachable surfaces, table overflow on 2 pages, good touch targets
