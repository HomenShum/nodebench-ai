# NodeBench MCP v2.30.0 — Headless Agentic Engine Launch

## What Shipped

- **Headless API-first Agentic Engine** on port 6276 (`--engine` flag)
- 12 REST endpoints: tool execution, workflow chains (32 built-in), SSE streaming, session management
- **Conformance Reports** — deterministic scoring of workflow quality (grade A-F)
- **Preset-scoped sessions** — per-client tool gating via existing 9 presets
- **One-page Engine Demo** — ultra minimal Dribbble ASCII UI (Spec/Trace/Scoreboard/Timeline/Publish)
- Published to npm: `nodebench-mcp@2.30.0`

## Distribution Checklist

### Immediate (Day 1)

- [x] npm publish (`nodebench-mcp@2.30.0`)
- [ ] GitHub release with changelog
- [ ] LinkedIn Post 1: The Signal (see below)
- [ ] LinkedIn Post 2: The Analysis
- [ ] LinkedIn Post 3: The Agency

### Week 1

- [ ] HackerNews "Show HN" post
- [ ] Reddit r/MachineLearning, r/LocalLLaMA, r/ClaudeAI
- [ ] Discord: MCP community, Claude Code community
- [ ] Dev.to article: "How to sell AI agent results instead of software seats"
- [ ] Twitter/X thread

### Week 2-4

- [ ] Product Hunt launch
- [ ] Integration guide for CI/CD pipelines
- [ ] Video demo walkthrough
- [ ] Partner outreach (QA automation companies, CI/CD tools)

---

## LinkedIn Posts (3-post thread)

### Post 1: The Signal

What if you could sell "zero-bug deployments" as a service — without a QA team?

We just shipped a headless, API-first Agentic Engine that runs 235 MCP tools across 42 domains via REST API.

The pitch to clients isn't "buy our software." It's "we guarantee your deploys pass these 8 conformance checks."

5 things that changed with v2.30.0:

1. POST /api/workflows/fix_bug — one curl command runs a complete 7-step verification pipeline
2. SSE streaming — watch each tool execute in real-time
3. Conformance Reports — deterministic A-F grades on step completeness, quality gates, test layers
4. Session isolation — each client gets their own preset-scoped tool set
5. $0 infrastructure — runs inside the MCP server you already have

The engine doesn't replace your agents. It grades them.

Which workflow would you run first?

#MCP #AIAgents #QAAutomation #DevTools

---

### Post 2: The Analysis

How the Conformance Reports actually work:

Every workflow execution scores 8 boolean checks:

✓ Steps completed (did all tools run?)
✓ Quality gate passed (automated rule enforcement)
✓ Test layers logged (unit / integration / e2e)
✓ Flywheel completed (methodology adherence)
✓ Learnings recorded (knowledge banking)
✓ Recon performed (research before coding)
✓ Verification cycle started (formal tracking)
✓ No errors (clean execution)

Each check = 12.5 points. A = 90+, B = 75+, C = 60+, D = 40+, F = below.

VERIFIED: The scoring is deterministic — no LLM in the grading loop. Boolean checks only.

The sellable output:
- "Your last 50 deploys averaged Grade B (78/100). Missing: test layers on 12 deploys."
- "After 30 days: Grade A average (94/100). Conformance improved 20%."

What claim would you fact-check?

---

### Post 3: The Agency

Here's how to start selling conformance reports this week:

1. Install: `npx nodebench-mcp --engine`
2. Create a session: `curl -X POST localhost:6276/api/sessions -d '{"preset":"web_dev"}'`
3. Run your client's workflow: `curl -X POST localhost:6276/api/workflows/fix_bug -d '{"streaming":true}'`
4. Get the report: `curl localhost:6276/api/sessions/{id}/report`
5. Deliver the grade: "Your deployment scored B (75/100). Here's what to fix."

Stress-test each claim:
- "No QA team needed" [5/6] — true for automated checks, but human review still needed for UX
- "Scales indefinitely" [4/6] — true per-machine, but each engine is single-process
- "Zero infrastructure" [6/6] — runs inside existing MCP server, SQLite-backed

The engine doesn't write your code. It grades whether your agents followed the methodology.

What are you working on?

---

## GitHub Release Notes

### v2.30.0 — Headless API-First Agentic Engine

**New: Engine API** (`--engine` flag)
- HTTP server on port 6276 with 12 REST endpoints
- Execute any tool via `POST /api/tools/:name`
- Run any of 32 workflow chains via `POST /api/workflows/:name`
- SSE streaming for real-time step-by-step progress
- Session management with preset-scoped tool gating
- Conformance Reports: deterministic A-F grades on workflow quality
- Bearer token auth via `--engine-secret` or `ENGINE_SECRET` env var

**New: Engine Demo View** (`/engine-demo`)
- Ultra minimal one-page CRUD interface
- 5 panels: Spec (CRUD), Trace (live events), Scoreboard (grades), Timeline (execution bars), Publish (curl + reports)
- Pure JetBrains Mono typography, no decorations
- Backed by the engine API for real-time execution

**Files Added:**
- `packages/mcp-local/src/engine/session.ts` — Session manager
- `packages/mcp-local/src/engine/conformance.ts` — Conformance scoring
- `packages/mcp-local/src/engine/server.ts` — HTTP server
- `src/features/engine/views/EngineDemoView.tsx` — Demo view

**Install:**
```bash
npx nodebench-mcp --engine
```
