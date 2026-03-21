# NodeBench AI

The trust layer for autonomous agents. Every permission gets a scope. Every action gets a receipt. Every decision gets evidence.

NodeBench AI is a full-stack agent trust control plane built on Convex, React, and a 304-tool MCP server. It implements three architectural layers that turn raw agent activity into auditable, self-improving intelligence.

---

## Architecture

### Layer 1: Judgment

Boolean gates govern every agent action. Decisions are `true/false` with a mandatory reason string — never numerical scores. The system evaluates 5 required gates and 6 disqualifiers before any agent posts, acts, or evolves.

| Module | Purpose |
|--------|---------|
| **Autonomous Crons** | Scheduled observe-decide-act loop (30 min monitor, 2h swarm, daily evolution) |
| **Swarm Deliberation** | Multi-role agent conversations with smart speaker selection and early termination |
| **Self-Evolution** | Daily health check: 10 boolean metrics, engagement tracking, max 3 conservative proposals |
| **Decision Memory** | Institutional memory with 3-layer architecture (ephemeral / 7-day / persistent) |
| **Consistency Index** | Cross-decision coherence tracking and drift detection |
| **Passport Enforcement** | Per-role tool permissions, deny-by-default, approval gates |
| **Evolution Verification** | Validates proposed rubric changes against historical decision quality |

### Layer 2: Trajectory Intelligence

Turns time-bounded events into interpretable trajectories. Scores whether agent performance is improving, drifting, or compounding.

| Engine | What it does |
|--------|-------------|
| **Temporal Trace** | Segments sessions into spans with evidence bundles |
| **Judge** | Deterministic checks + heuristics + LLM judgment + human review |
| **Compounding** | Estimates whether repeated cycles improve future expected outcomes |
| **Intervention** | Tracks what changed and whether the change helped |
| **Drift Detection** | Flags when agent behavior diverges from baseline patterns |
| **Projection** | Forward-looking trajectory estimates based on compounding signals |

### Layer 3: Optimization (DeepTrace Autoresearch)

Two loops for continuous improvement:

1. **Offline Optimizer** — Proposes candidate mutations to DeepTrace prompts and heuristics, tests against canary benchmarks in disposable worktrees, promotes only when throughput improves by 5%+ with all quality guards passing.

2. **Runtime Research Cell** — Triggered when confidence < 0.65 or evidence has fewer than 3 durable sources. Planner proposes 2-4 research branches, workers gather evidence under fixed budget (max 90s wall clock), merger returns standard DeepTrace output.

**Throughput Score:** 30% task completion + 25% inverse time-to-first-draft + 20% inverse human edit distance + 15% inverse wall-clock + 10% inverse tool-call count.

**Hard Guards:** Factual precision (no >1pp drop), evidence linkage (>= 0.75), receipt completeness (>= 0.80), false-confidence rate (<= 0.10).

---

## Trust Primitives

The control plane packages four trust primitives into legible surfaces:

| Primitive | What it enforces |
|-----------|-----------------|
| **Agent Passport** | Scoped authority — least privilege before an agent acts |
| **Intent Ledger** | Declared plans and approvals — what the agent said it would do |
| **Action Receipts** | Tamper-evident execution history — what the agent actually did |
| **Delegation Graph** | Visible trust boundaries — who approved what and when |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | Convex (real-time, serverless) |
| MCP Server | `@homenshum/nodebench-mcp` — 304 tools, progressive discovery, agent-as-a-graph embeddings |
| MCP Gateway | WebSocket server with API key auth for external agent connections |
| MCP Client | `@homenshum/nodebench-mcp-client` — zero-dep TypeScript client SDK |
| Voice | OpenAI Realtime API (WebSocket) |
| Design System | Glass card DNA, warm terracotta accent (#d97757), Manrope + JetBrains Mono |
| Testing | Vitest (1510 tests) + Playwright E2E |
| CI/QA | Dogfood pipeline with scribe captures, walkthrough recordings, screenshot regression |

---

## Codebase

### Convex Backend — 63 domains

Core domains powering the judgment and trajectory layers:

```
convex/domains/
  agents/          — 70+ files: swarm orchestration, self-evolution, decision memory,
                     autonomous crons, passport enforcement, consistency index
  missions/        — Mission orchestration with pre-execution gates and cost queries
  trajectory/      — Compounding engine, drift detection, projection, span scoring
  deepTrace/       — Investigation engine with evidence bundles and hypothesis ranking
  openclaw/        — Bridge to OpenClaw judgment patterns (18-tool standalone MCP)
  research/        — Signal processing, entity profiles, funding briefs
  narrative/       — Competing explanations, evidence checklists, LinkedIn pipeline
  hitl/            — Human-in-the-loop approval queues and review workflows
  governance/      — Policy enforcement and compliance tracking
  ...and 54 more (analytics, auth, billing, documents, forecasting, etc.)
```

### Frontend — 27 features, 350+ components

5-surface cockpit with glass card design system:

```
src/layouts/
  CockpitLayout.tsx      — 5-zone: StatusStrip + WorkspaceRail + ActiveSurfaceHost
                           + AgentPresenceRail + TraceStrip
  WorkspaceRail.tsx      — Left rail with surface navigation (Ask, Memo, Research, Workspace, System)
  ActiveSurfaceHost.tsx  — Main content viewport hosting the active surface
  AgentPresenceRail.tsx  — Right rail showing agent activity, presence, and telemetry
  CommandBar.tsx         — Bottom control strip with command palette (Cmd/Ctrl+K)
  StatusStrip.tsx        — Ambient telemetry ticker with breadcrumb navigation

src/features/
  controlPlane/    — Landing page, action receipt feed, trust surfaces, developers page
  research/        — Research hub, entity profiles, funding briefs, signals, feed reader
  investigation/   — Adversarial analysis with DeepTrace evidence
  agents/          — Agent hub, fast agent panel with pre-scripted demo conversations,
                     oracle control tower, marketplace
  deepSim/         — Decision Workbench (claim graphs, variables, scenarios, interventions),
                     Postmortem view (6-dimension forecast scoring)
  monitoring/      — Agent telemetry dashboard (tool calls, costs, latency, errors)
  mcp/             — API key management (create, revoke, usage dashboard)
  trajectory/      — Compounding visualizations, drift scores, trajectory summaries
  strategy/        — Execution trace view with ActionSpan unified type + replay engine
  benchmarks/      — Workbench with eval harness integration
  documents/       — Document hub with spreadsheets, calendar, editor
  ...and 16 more (analytics, dogfood, settings, etc.)
```

### MCP Server — 304 tools across 49 domains

```
packages/
  mcp-local/               — Main MCP server with progressive discovery
  mcp-client/              — Zero-dep TypeScript client SDK for MCP Gateway
  convex-mcp-nodebench/    — Convex auditor (36 tools, published to npm)
  openclaw-mcp-nodebench/  — OpenClaw sandbox enforcement (18 tools)
```

**Progressive Discovery:** Cursor pagination, result expansion with `relatedTools` neighbors, multi-hop BFS traversal (depth 1-3), transitive co-occurrence edges.

**Agent-as-a-Graph Embeddings:** Bipartite graph G=(Tools, Domains, Edges) with weighted RRF fusion. Domain match gives sibling tools a `domain_rrf` boost.

**Toolset Presets:** default (81), web_dev (150), research (115), data (122), devops (92), mobile (126), academic (113), multi_agent (136), content (115), full (304).

---

## MCP Gateway

External agents connect to NodeBench via the WebSocket MCP Gateway (`server/mcpGateway.ts`). The gateway implements the MCP protocol over WebSocket with API key authentication.

**Connection flow:**

1. Create an API key at `/api-keys` or via the management API
2. Connect via WebSocket: `ws://localhost:<port>/mcp`
3. Send `initialize` with API key in auth header
4. Call `tools/list` to discover available tools (filtered by key permissions)
5. Call `tools/call` to invoke tools — responses stream back over the socket

**Client SDK** (`packages/mcp-client/`): Zero-dependency TypeScript library that handles connection, reconnection, auth, and typed tool invocation. Install via `@homenshum/nodebench-mcp-client`.

**Auth layer** (`server/mcpAuth.ts`): API key validation, rate limiting, usage tracking, and per-key permission scoping.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development (frontend + Convex + voice server)
npm run dev

# Run tests
npm run test:run

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

### Environment

Create `.env.local` with:

```env
CONVEX_DEPLOYMENT=<your-convex-deployment>
VITE_CONVEX_URL=<your-convex-url>
OPENAI_API_KEY=<for-voice-and-agent-features>
```

---

## Key Routes

| Route | Surface | What it shows |
|-------|---------|--------------|
| `/` | Control Plane | Trust primitives landing with agent demo |
| `/receipts` | Action Receipts | Denied, gated, and reversible agent actions |
| `/delegation` | Passport | Scoped permissions and trust boundaries |
| `/research` | Research Hub | Signals, briefings, entity profiles |
| `/investigation` | Investigation | Adversarial DeepTrace analysis |
| `/deep-sim` | Decision Workbench | Claim graphs, variables, scenarios, interventions |
| `/postmortem` | Forecast Review | Compare predictions against reality, score forecasts |
| `/agent-telemetry` | Agent Telemetry | Tool call breakdown, costs, latency, error tracking |
| `/execution-trace` | Execution Trace | Search, edit, verify, export audit trail |
| `/product-direction` | Product Direction | Evidence-bounded product memo |
| `/signals` | Signals Log | Real-time signal processing feed |
| `/benchmarks` | Workbench | Eval harness and benchmark results |
| `/funding` | Funding Brief | Capital intelligence and deal flow |
| `/mcp-ledger` | MCP Ledger | Tool call audit log |
| `/developers` | Developers | Architecture, tools, and integrations under the hood |
| `/api-keys` | API Keys | Create, revoke, and track API key usage |
| `/dogfood` | Dogfood Gallery | Screenshot evidence and walkthrough recordings |

---

## Testing

```bash
# Unit + integration tests (segmented runner)
npm run test:run

# Full suite including overstory
npm run test:run:full

# E2E with Playwright
npm run test:e2e

# Individual packages
npm run test:run:mcp-local
npm run test:run:convex-mcp
npm run test:run:openclaw-mcp
```

**1510 tests** across unit, integration, scenario-based, and E2E layers.

### Dogfood Pipeline

```bash
# Full dogfood: screenshots + walkthrough + scribe + frames
npm run dogfood:walkthrough

# Local dogfood with live browser
npm run dogfood:full:local:play

# UI traversal audit (agent-native linter)
npm run dogfood:traverse
```

---

## Agent-Native UI

All interactive elements carry `data-agent-*` attributes for programmatic navigation:

```html
<button
  data-agent-id="mode-research"
  data-agent-action="navigate"
  data-agent-label="Switch to Research mode"
>
```

The `agentNativeUiLinter.mjs` script validates coverage across all routes. The cockpit layout ensures agents can discover modes, views, and actions through structured attributes rather than fragile CSS selectors.

---

## Self-Evolution Loop

The system doesn't just execute — it evaluates whether to act, who should act, how well it acted, and how to improve.

```
Observe (30 min) → Detect opportunities → Boolean rubric (5 gates + 6 disqualifiers)
  → Select role → Compose response → Post or log skip
  → Extract decisions → Store in institutional memory
  → Surface prior context on topic recurrence

Evolve (daily) → Query last 48 decisions → Compute stats
  → Check engagement → Evaluate 10 health metrics
  → Generate max 3 proposals → Post health report → Log everything
```

**Health Metrics:** Post rate in range, opportunity type coverage, gate distribution balance, no regret posts, no missed opportunities, meta-feedback responsiveness, disqualifier precision, digest post rate, digest gate balance, log completeness.

---

## Project Structure

```
nodebench-ai/
  convex/                  — Backend: 63 domains, schema, workflows
    domains/agents/        — Judgment layer: evolution, swarm, memory, crons
    domains/trajectory/    — Trajectory intelligence: compounding, drift, projection
    domains/missions/      — Mission orchestration with pre-execution gates
    domains/deepTrace/     — Investigation engine
  src/
    layouts/               — Cockpit HUD (5-surface: Ask, Memo, Research, Workspace, System)
    features/              — 27 feature modules (350+ components)
    shared/ui/             — Shared component library (glass card primitives)
    shared/agent-ui/       — Agent-native UI primitives
    hooks/                 — 35+ React hooks
    contexts/              — Theme, auth, and app-level context
    types/                 — TypeScript type definitions
  packages/
    mcp-local/             — 304-tool MCP server
    mcp-client/            — Zero-dep TypeScript client SDK
    convex-mcp-nodebench/  — Convex auditor MCP (npm published)
    openclaw-mcp-nodebench/ — OpenClaw sandbox MCP
  server/
    index.ts               — Voice server (OpenAI Realtime WebSocket)
    mcpGateway.ts          — WebSocket MCP Gateway for external agents
    mcpAuth.ts             — API key auth, rate limiting, usage tracking
    mcpSession.ts          — Per-connection session management
  scripts/
    ui/                    — Dogfood, scribe, walkthrough, linter
    eval-harness/          — DeepTrace autoresearch optimizer runner
    testing/               — Segmented test runner
  tests/e2e/               — Playwright E2E specs
```

---

## Documentation

| Document | Location |
|----------|----------|
| Agent methodology and eval bench | `AGENTS.md` |
| 7-step flywheel process | `AI_FLYWHEEL.md` |
| Agent trust infrastructure | `docs/architecture/AGENT_TRUST_INFRASTRUCTURE.md` |
| Agent-native UI MCP compatibility | `docs/architecture/AGENT_NATIVE_UI_MCP_COMPATIBILITY.md` |
| Codebase restructure plan | `docs/architecture/CODEBASE_RESTRUCTURE.md` |
| Control plane 90-day roadmap | `docs/architecture/CONTROL_PLANE_90DAY_ROADMAP.md` |
| Claude Code project rules | `CLAUDE.md` + `.claude/rules/` |

---

## License

Private. All rights reserved.
