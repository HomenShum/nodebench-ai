# Engineer Handoff — NodeBench + Attrition (as of 2026-04-21)

> Synthesized from the three unified chat logs in this folder. Read this first, then drill into the source logs for context on any decision.

---

## 1. What you're actually shipping

Two related products, built from the same thesis:

| Product | What it is | Who it's for | Wedge |
|---|---|---|---|
| **NodeBench** (`nodebenchai.com`) | Web app + MCP server. "Founder-Intelligence MCP" — ingests messy input (LinkedIn URL, bios, decks, recruiter notes) and outputs Decision Memos, Founder Profiles, Market Maps as **shareable public URLs**. | Founders / operators doing diligence. Also dogfooded by us. | `claude mcp add nodebench` → any Claude-compatible agent becomes a diligence workflow. |
| **Attrition** (`attrition.sh`) | Always-on 4-hook judge layer for Claude Code (session-start / prompt / tool-use / stop). Agnostic to provider (Anthropic, OpenAI, LangChain, CrewAI). Rust core (12-crate workspace) + Python SDK (`from attrition import track`). | Any AI-agent builder whose agent says "done" too early. | "Your agent says it's done too early. We catch what it missed." |

Both are **open-source (MIT)** and dogfood each other. Attrition judges NodeBench's own agent runs; NodeBench is the reference integration for Attrition.

---

## 2. The mental model you need before touching code

### NodeBench — State / Target / Action (from the 04/18 "Latest Frameworks" session)

Every surface must cleanly answer three questions. If the UI tries to do more than one, you broke the model.

| Surface | State (what's happening) | Target (the one thing) | Action (what user can do next) |
|---|---|---|---|
| **Home** | Messy input, no answer yet | Start a useful run immediately | Paste / ask / upload |
| **Chat** | Live diligence run | Give a clear answer with live trace | Follow-up, wrap, pin to report |
| **Report** | Useful output already exists | Let them re-read, re-share, nudge | Share link, promote entities, re-run block |
| **Nudge** | Something important changed | Tell them what changed, why | Accept / dismiss / deep-dive |
| **Me** | Private context available | Let them see their own profile | Edit self-model, opt-in GitHub/MCP |
| **MCP** | Founder in Claude Code / Codex | Run NodeBench workflow from their agent | One-line install, tool discovery |

### Attrition — three-layer judge

1. **Hook layer** (Rust) — intercepts Claude Code lifecycle events; 61KB of engine.
2. **Learner loop** (`learner.rs`) — judge learns from repeated patterns; self-improving corrections.
3. **Distillation** (45KB of algorithms) — 4 strategies: step elimination, copy-paste extraction, context compression, checkpoint pruning.

---

## 3. Architecture patterns (non-obvious — read the rules before changing)

All of these are load-bearing. Each has a rule in `.claude/rules/`.

| Pattern | File | Why it exists |
|---|---|---|
| **Orchestrator-workers** | `orchestrator_workers.md` | Never do multi-faceted work in one agent call. One orchestrator + N sub-agents with fresh context + shared scratchpad. |
| **Scratchpad-first** | `scratchpad_first.md` | Agents write to shared markdown first, revise, **then** a second LLM pass converts to structured output. Never emit structured output in one shot. |
| **Layered memory** | `layered_memory.md` | 5 layers: `ENTITY.md` (human) → `MEMORY.md` (index) → topic files → scratchpad → skills. JIT retrieval via glob/grep, size-bounded reads. |
| **Async reliability** | `async_reliability.md` | Live + background modes use the same pipeline. 202 + runId < 500ms, idempotency key = `sha256(entitySlug + ingestHash + userId)`, retry w/ jitter, DLQ grouped by fingerprint, graceful partial-success UX. |
| **Feedback security** | `feedback_security.md` | User never authors full feedback body — authors `{autoDraftId, userEdits}`, server composes. OWASP LLM Top 10 threat model; 8 threats mitigated by layered controls. |
| **Reference attribution** | `reference_attribution.md` | Every borrowed pattern cites source in module header + doc. Anthropic, Manus, Cognition Devin, LangGraph — all named. |
| **Pipeline operational standard** | `pipeline_operational_standard.md` | Every pipeline change: instrument → judge → persist → surface → measure → regress. 10 gate catalog; 4 bounded verdict tiers. |
| **Live-DOM verification** | `live_dom_verification.md` | Never claim "deployed/live/shipped" on build-green alone. Two-tier: raw HTML grep (`scripts/verify-live.ts`) + hydrated DOM (`npm run live-smoke`). |
| **Agentic reliability** | `agentic_reliability.md` | 8-point checklist on every backend change: BOUND, HONEST_STATUS, HONEST_SCORES, TIMEOUT, SSRF, BOUND_READ, ERROR_BOUNDARY, DETERMINISTIC. |
| **Agent run verdict** | `agent_run_verdict_workflow.md` | Verdicts are bounded: `verified / provisionally_verified / needs_review / awaiting_approval / failed / in_progress`. "Completed" ≠ "verified". |
| **Owner mode** | `owner_mode_end_to_end.md` | Don't stop at backend if UI can't expose it. Don't stop at UI if state isn't defensible. Contract → backend → frontend → verdict → tests → docs. |

---

## 4. Current state of the codebase (from MEMORY.md + recent commits)

- **304 MCP tools** across 50 domains; 1510+ tests.
- **5-surface cockpit**: `/?surface=ask|memo|research|editor|telemetry`.
- **Design DNA**: glass cards (`border-white/[0.06] bg-white/[0.02]`), terracotta `#d97757`, Manrope + JetBrains Mono.
- **MCP Gateway**: `server/mcpGateway.ts` (WebSocket) + `server/mcpAuth.ts` (API key, rate limit, idle timeout) + `packages/mcp-client/` (typed SDK).
- **Founder MCP Bridge**: `nodebench-mcp` — the founder's private bridge into NodeBench (not a second product).
- **Homen Twin skill**: `~/.claude/skills/homen-twin/SKILL.md` — digital twin trigger "be me".
- **Agent Harness Runtime**: unified conversation runtime, live at `nodebenchai.com/api/harness`.

### Recently shipped (in-flight at handoff time)
- Named-member invites end-to-end on entity workspaces (`convex/domains/product/shares.ts`, `EntityPage.tsx`, `EntityShareSheet.tsx`, `SignInForm.tsx`).
- `PublicFounderProfileView` + `PublicProductProfileView` (alongside `PublicCompanyProfileView`).
- Async/background report mode (opt-in, fire-and-forget, 202 + runId).
- Scratchpad-first pipeline writing to Convex tables.
- Docs consolidation — 122 `.md` at root moved to `docs/{architecture,completions,plans,...}/`; old docs archived under `docs/archive/2026-q1/`.
- Entity notebook polish: Tier 3 industry-grade block interaction (commits `d564d3d8`, `cf0b2187`).
- Type-error cleanup sweep: ~289 strict-mode TS errors across `src/` (commits `80ad979d`, `336a9850`, `cab5646a`).

### Open threads (unfinished or recently reopened)
- **Founder-core gap matrix** (bf51ab26, 04/07) — surface-by-surface gap analysis against live `nodebenchai.com`. Not all surfaces backed by live data yet.
- **Full audit vs. the one-liner claim** — does `claude mcp add nodebench` actually deliver decision memos / founder profiles / market maps as shareable URLs end-to-end? Partial. Needs live browser verify + screenshot proof for every surface.
- **Attrition Python SDK** — `from attrition import track()` not yet published. Types exist, learner runtime not wired.
- **`cargo install attrition-cli`** — not on crates.io.
- **Pain → Fix page with real traces** — strategic pivot away from invented benchmarks. Build page showing real 2026-pain → Attrition fix with real API calls + before/after verdicts.
- **Verified-toggle / memo-auto-emit / wrap-up triggers** — async LLM-judge gates. Research latest production patterns before implementing.
- **Karpathy-style LLM-judge flywheel** on founder-sub-report persistence — pushed back until stable features ship.

---

## 5. Verification floor (run on every change)

```bash
npx convex codegen
npx tsc --noEmit
npm run test:run            # targeted vitest for what you touched
npm run build
npm run dogfood:verify:smoke  # when UI changed
npx tsx scripts/verify-live.ts  # after deploy
npm run live-smoke          # hydrated-DOM Playwright pass
```

**Never** use the words "deployed / live / shipped" without completing the bottom two. (Webhooks silently disconnect; Suspense fallbacks mask broken routes; CDNs serve stale bytes.)

---

## 6. Known landmines

1. **LinkedIn API silently truncates at `(`** — `cleanLinkedInText()` auto-replaces. Always read back via `fetchPosts` before declaring a post successful.
2. **Convex codegen drift** — schema change without `npx convex codegen` = silent runtime break. Run it on every schema edit.
3. **Tool-count hardcoding** — grep for `289`, `297`, `304` before committing; keep in sync.
4. **Test-file TOOLSET_MAP** — tests have their own `TOOLSET_MAP / PRESETS` that must stay in sync with `packages/mcp-local/src/tools/toolsetRegistry.ts`.
5. **npm publishing** — classic tokens revoked Feb 2026. Use granular tokens with "Bypass 2FA". Cannot republish same version — always bump.
6. **Windows file paths** — worktrees live under `.claude/worktrees/`. Use forward slashes in code, absolute paths in Edit/Read/Write tool calls.
7. **C drive vs D drive** — large video/audio assets belong on D. Don't commit them; `git rm` + move on sight.
8. **Parentheses in shell args to Convex** — same class of bug as LinkedIn. Keep ASCII in CLI post payloads.

---

## 7. Daily ops

- `npm run local:refresh` — sync daily brief + narrative from Convex → local SQLite, verify, print summary.
- Local dashboard: `http://127.0.0.1:6275` (starts automatically with MCP server).
- `/dogfood` in the app — product-design dogfood evidence visible in-app.
- `/nodebench-qa` — QA loop skill (Gemini 3 Flash vision scoring + fix strategy + fallback chain).
- AI Flywheel: mandatory 7-step loop, step 7 = re-examine for 11/10. See `AI_FLYWHEEL.md`.

---

## 8. The one-paragraph thesis to anchor on

> Right context, right order → better odds of right judgment. Never certainty. NodeBench is operating-memory + entity-context for agent-native businesses; Attrition is the always-on judge that catches the "done too early" lie. Everything — the 5-surface cockpit, the scratchpad-first pipeline, the 8-point reliability checklist, the live-DOM verification discipline — exists to make agent output **traceable, bounded, and honestly failing** when it fails.

---

## 9. Where to go next

1. Read `CLAUDE.md` and `AI_FLYWHEEL.md` in the repo root.
2. Skim every `.claude/rules/*.md` — don't just read titles.
3. Open the three source logs in this folder and scan the user messages — they're the voice of the product owner working through problems in real time.
4. Run the verification floor on a trivial change to verify the toolchain works on your machine.
5. Pick an open thread from §4 and do the first step. Don't wait for permission — see `self_direction.md`.

**Source logs (this folder):**
- `session1_latest_frameworks.md` — architecture & framework decisions
- `session2_nodebench_ai_redesign.md` — surface redesign & IA
- `session3_entity_page_notebook.md` — Attrition + entity notebook genesis
- `UNIFIED_MASTER.md` — all three, chronological
- `UNIFIED_USER_REQUESTS.md` — user requests only, compact
