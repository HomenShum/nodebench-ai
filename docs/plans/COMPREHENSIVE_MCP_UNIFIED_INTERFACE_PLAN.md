# Comprehensive Plan: convex-mcp-nodebench + Unified Interface for nodebench-ai

> **Status**: Research complete, plan ready for review  
> **Date**: 2026-02-02  
> **Scope**: Three initiatives based on NodeBench MCP patterns

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Findings](#research-findings)
3. [Initiative 1: convex-mcp-nodebench](#initiative-1-convex-mcp-nodebench)
4. [Initiative 2: Unified Agent Interface for nodebench-ai](#initiative-2-unified-agent-interface)
5. [Initiative 3: Eval Harness, Enforcement, and Self-Instruct Protocol](#initiative-3-eval-harness)
6. [Architecture Overview](#architecture-overview)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Key Risks and Mitigations](#risks)

---

## 1. Executive Summary

Three initiatives emerge from the NodeBench MCP deep dive:

**A. `convex-mcp-nodebench`** -- A specialized MCP server that applies NodeBench's self-instruct diligence patterns (create-implement-evaluate-test) specifically to Convex development. It complements Context7 (generic library docs) with Convex-specific methodology tools: schema validation, function audit, deployment verification, and persistent learnings about Convex gotchas.

**B. Unified Agent Interface** -- Transform nodebench-ai from a multi-hub app into a Manus AI-style unified workspace where a single agent conversation can orchestrate all features (research, documents, spreadsheets, analytics, calendar, social, email intelligence) through a consistent interface with tool-calling, live previews, and artifact rendering.

**C. Eval Harness, Enforcement, and Self-Instruct Protocol** -- A measurement + enforcement system that *proves* MCP agents perform "as good or better" than bare agents. Includes a Bare-vs-MCP eval harness with multi-seed runs, a 4-bucket scorecard (correctness, safety, efficiency, compounding), CI gating that blocks merge without verification artifacts, nightly regression runs, minimum-viable telemetry, a "fewer tools" gateway architecture, and a Capability Acquisition Protocol for self-instruct bootstrapping.

---

## 2. Research Findings

### 2.1 NodeBench MCP Architecture (162 tools, 30 domains)

**Core patterns that make it work:**

| Pattern | How It Works | Why It Matters |
|---------|-------------|----------------|
| **Self-Instruct quickRefs** | Every tool response includes `nextAction`, `nextTools`, `methodology` | Agent always knows what to do next without re-prompting |
| **Progressive Discovery** | 7-mode hybrid search (keyword, fuzzy, n-gram, semantic, TF-IDF, regex, domain boost) | Agents find tools without memorizing 162 tool names |
| **Tool Registry** | Central catalog with `category`, `tags`, `phase`, `complexity` metadata | Enables model-tier routing and preset gating |
| **Methodology System** | Structured step-by-step guides (verification, eval, flywheel, quality_gates) | Self-instruct diligence: agents follow proven workflows |
| **Persistent Knowledge** | SQLite + FTS5 for learnings, gaps, recon findings | Knowledge compounds across sessions |
| **Session Memory** | Compaction-resilient filesystem notes + attention refresh | Survives context window limits |
| **Self-Eval** | Trajectory analysis, tool call logging, improvement recommendations | System learns from its own usage patterns |
| **TOON Encoding** | ~40% token savings in tool responses | Cost-effective at scale |
| **Toolset Presets** | meta(5) / lite(43) / core(114) / full(162) | Right-size tool exposure to task complexity |
| **Workflow Chains** | Recommended tool sequences for common tasks | Reduce agent exploration overhead |

**Key files:**
- `packages/mcp-local/src/index.ts` -- Server entry, toolset assembly, presets
- `packages/mcp-local/src/tools/toolRegistry.ts` -- Central catalog, hybrid search engine
- `packages/mcp-local/src/tools/metaTools.ts` -- Methodology content, step-by-step guides
- `packages/mcp-local/src/tools/progressiveDiscoveryTools.ts` -- discover_tools with multi-modal search
- `packages/mcp-local/src/tools/agentBootstrapTools.ts` -- Triple verification, risk-tiered execution
- `packages/mcp-local/src/tools/selfEvalTools.ts` -- Trajectory analysis, tool call logging
- `packages/mcp-local/src/db.ts` -- SQLite schema for all persistent state

### 2.2 Current Convex MCP Server (12 tools)

The official Convex MCP server provides pure data introspection:

| Tool | Purpose |
|------|---------|
| `status` | Get deployment selector |
| `tables` | List tables + schemas |
| `data` | Paginate through documents |
| `runOneoffQuery` | Read-only sandboxed JS queries |
| `functionSpec` | All deployed function metadata |
| `run` | Execute deployed functions |
| `logs` | Recent function execution logs |
| `envList/Get/Set/Remove` | Environment variable management |

**What it lacks (opportunity for convex-mcp-nodebench):**
- No self-instruct patterns (no quickRefs, no "what to do next")
- No progressive discovery (no hybrid search across Convex patterns)
- No persistent learnings (no "remember this Convex gotcha for next time")
- No verification workflows (no schema audit, no function compliance check)
- No eval/quality gates (no pre-deploy validation)
- No methodology guidance (no "how to add an index properly")
- No Convex-specific edge case database

### 2.3 Convex Chef

- AI app builder that one-shots full-stack apps (Slack, Instagram, Notion)
- React + Convex stack, leverages full platform (real-time, file upload, text search, components)
- Validates that Convex's abstractions are "simple enough for both humans and AI to use"
- **Key insight**: Chef proves that Convex patterns are LLM-friendly -- a specialized MCP can encode these patterns as reusable methodology

### 2.4 Manus AI Architecture

- **Multi-model orchestrator**: Claude + Qwen for reasoning, GPT-4 for coding, Gemini for knowledge
- **Cloud sandbox**: Full Ubuntu environment with shell, browser, file system, interpreters
- **Iterative agent loop**: Analyze state -> Plan/Select action -> Execute in sandbox -> Observe result -> Loop
- **One action per iteration**: Prevents runaway execution, allows monitoring
- **Key insight for nodebench-ai**: The "one interface, one agent, all capabilities" pattern works because the orchestrator routes to specialized sub-systems. nodebench-ai already has `FastAgentPanel` + `CoordinatorAgent` -- needs the orchestration layer to connect all feature hubs.

### 2.5 Lovable Architecture

- **Full-stack generation**: React + Supabase from natural language
- **Agent mode**: Autonomous development handling complex requirements
- **Visual + conversational**: Chat to build, then visual edit to refine
- **Built-in hosting**: Instant deploy with infrastructure included
- **Key insight**: The "describe it, refine it, ship it" loop maps directly to NodeBench's create-implement-evaluate-test cycle

### 2.6 nodebench-ai Current Frontend

The app already has a modular feature-hub architecture:

```
src/features/
  agents/      (116 items) -- FastAgentPanel, agent context, streaming
  research/    (128 items) -- Research hub, dossiers, briefs
  documents/   (60 items)  -- Document management, editor
  editor/      (25 items)  -- BlockNote editor integration
  narrative/   (19 items)  -- Story generation, LinkedIn posts
  calendar/    (16 items)  -- Calendar integration
  analytics/   (3 items)   -- Usage analytics
  mcp/         (1 item)    -- MCP tool ledger view
  social/      (2 items)   -- LinkedIn archive
  emailIntelligence/ (5 items) -- Email processing
  spreadsheets/ (2 items)  -- Spreadsheet hub
  verification/ (3 items)  -- Citation verification
  ...
```

**MainLayout.tsx** manages routing between hubs. `FastAgentContext` provides global agent state. `CleanSidebar` handles navigation with `appMode` states: `workspace`, `fast-agent`, `deep-agent`, `dossier`.

**Convex backend** is massive -- the `functionSpec` returned hundreds of functions across domains: agents, research, documents, social, mcp, evaluation, narrative, calendar, etc.

---

## 3. Initiative 1: convex-mcp-nodebench

### 3.1 Vision

A specialized MCP server that makes AI agents expert Convex developers by applying NodeBench's self-instruct methodology patterns to Convex-specific workflows. It complements Context7 (raw docs) with structured guidance, persistent learnings, and deployment-aware verification.

### 3.2 What It Is vs. What It Is Not

| convex-mcp-nodebench | Context7 | Official Convex MCP |
|---------------------|----------|-------------------|
| Convex methodology + verification | Generic library docs | Deployment introspection |
| Self-instruct quickRefs | Static doc snippets | Raw data access |
| Persistent Convex gotcha DB | No memory | No memory |
| Schema audit + function compliance | API reference lookup | Schema/function listing |
| Pre-deploy quality gates | N/A | N/A |
| Edge case warnings | Version-specific docs | N/A |

### 3.3 Tool Categories (Proposed)

#### Category 1: Convex Schema Tools (6 tools)
- `convex_audit_schema` -- Analyze schema.ts for anti-patterns (missing indexes, field naming, validator misuse)
- `convex_suggest_indexes` -- Given query patterns, suggest optimal index definitions
- `convex_validate_schema_change` -- Check if a schema migration is safe (backward compatible)
- `convex_check_validator_coverage` -- Ensure all functions have arg + return validators
- `convex_list_table_relationships` -- Map foreign key relationships across tables
- `convex_schema_diff` -- Compare schema before/after changes

#### Category 2: Convex Function Tools (6 tools)
- `convex_audit_functions` -- Check function registration (public vs internal), missing validators, circular refs
- `convex_check_function_refs` -- Validate all `api.x.y` and `internal.x.y` references resolve
- `convex_suggest_function_split` -- Identify functions that should be split (transaction size, mixing concerns)
- `convex_check_action_patterns` -- Detect common action anti-patterns (unnecessary action wrapping, missing error handling)
- `convex_validate_http_routes` -- Audit http.ts for missing CORS, error handling, auth checks
- `convex_check_cron_health` -- Analyze cron definitions for overlap, missing error recovery

#### Category 3: Convex Deployment Tools (4 tools)
- `convex_pre_deploy_gate` -- Quality gate: run all checks before `npx convex deploy`
- `convex_check_env_vars` -- Verify required env vars are set for target deployment
- `convex_compare_dev_prod` -- Diff dev vs prod function specs, schemas, env vars
- `convex_rollback_plan` -- Generate a rollback strategy for a deployment

#### Category 4: Convex Learning Tools (4 tools)
- `convex_record_gotcha` -- Persist a Convex-specific gotcha (e.g., "v.bigint() is deprecated, use v.int64()")
- `convex_search_gotchas` -- Full-text search across known Convex gotchas
- `convex_check_known_issues` -- Before implementing, check if there are known issues for the pattern
- `convex_daily_update` -- Fetch latest Convex changelog/release notes and extract actionable changes

#### Category 5: Convex Methodology Tools (4 tools)
- `convex_get_methodology` -- Structured guides: "How to add a table", "How to migrate schema", "How to set up auth"
- `convex_workflow_chain` -- Recommended tool sequence for common Convex tasks
- `convex_discover_tools` -- Progressive discovery with Convex-specific search
- `convex_self_eval` -- Analyze Convex-specific tool usage patterns and recommend improvements

#### Category 6: Convex Integration Bridge (4 tools)
- `convex_sync_from_deployment` -- Pull current schema + function spec into local knowledge base
- `convex_sync_from_context7` -- Pull latest Convex docs from Context7 into methodology
- `convex_generate_rules_md` -- Generate/update Convex AI rules file from current learnings + schema
- `convex_bootstrap_project` -- Scan a Convex project, identify gaps, suggest improvements

**Total: ~28 tools** (fits within a focused MCP server)

### 3.4 Self-Instruct Pattern (The Key Differentiator)

Every tool response includes a `quickRef` block:

```typescript
interface ConvexQuickRef {
  nextAction: string;      // "Now run convex_check_validator_coverage to ensure all functions have validators"
  nextTools: string[];     // ["convex_check_validator_coverage", "convex_audit_functions"]
  methodology: string;     // "convex_schema_change" -- links to structured guide
  relatedGotchas: string[]; // Known issues relevant to what was just done
  confidence: "high" | "medium" | "low"; // How confident the tool is in its output
}
```

This means an agent never gets stuck after using a tool -- it always knows the next step.

### 3.5 Persistent Knowledge Base

SQLite database at `~/.convex-mcp-nodebench/convex.db`:

```sql
-- Convex-specific gotchas and learnings
CREATE TABLE convex_gotchas (
  id TEXT PRIMARY KEY,
  category TEXT,        -- 'validator', 'schema', 'function', 'deployment', 'auth', 'performance'
  content TEXT,
  severity TEXT,        -- 'critical', 'warning', 'info'
  convex_version TEXT,  -- Version this applies to
  tags TEXT,
  created_at INTEGER,
  source TEXT           -- 'user', 'auto_discovery', 'context7_sync'
);

-- Project-specific schema snapshots for diff
CREATE TABLE schema_snapshots (
  id TEXT PRIMARY KEY,
  project_dir TEXT,
  schema_json TEXT,
  function_spec_json TEXT,
  snapshot_at INTEGER
);

-- Deployment verification history
CREATE TABLE deploy_checks (
  id TEXT PRIMARY KEY,
  project_dir TEXT,
  check_type TEXT,
  passed INTEGER,
  findings TEXT,
  checked_at INTEGER
);
```

### 3.6 Daily Update Pipeline

The `convex_daily_update` tool:
1. Fetches latest Convex docs from Context7 (`/llmstxt/convex_dev_llms-full_txt`)
2. Diffs against previous snapshot
3. Extracts breaking changes, new features, deprecations
4. Stores as structured gotchas
5. Returns summary to agent

This is how it "carries the burden" alongside Context7 -- Context7 provides raw docs, convex-mcp-nodebench extracts, structures, and remembers the actionable changes.

### 3.7 Package Structure

```
packages/convex-mcp-nodebench/
  src/
    index.ts                    -- MCP server entry, toolset assembly
    db.ts                       -- SQLite schema + migrations
    tools/
      schemaTools.ts            -- Schema audit, validation, suggestions
      functionTools.ts          -- Function audit, ref checking, patterns
      deploymentTools.ts        -- Pre-deploy gates, env checks, rollback
      learningTools.ts          -- Gotcha recording, search, known issues
      methodologyTools.ts       -- Guides, workflow chains, discovery
      integrationBridgeTools.ts -- Sync from deployment, Context7, rules gen
    registry/
      toolRegistry.ts           -- Central catalog with quickRefs
      methodologyContent.ts     -- Structured Convex methodology guides
      gotchaSeed.ts             -- Pre-seeded common Convex gotchas
    utils/
      convexProjectScanner.ts   -- Scan convex/ dir for schema, functions, http routes
      schemaAnalyzer.ts         -- AST-level schema analysis
      functionAnalyzer.ts       -- Function registration and reference validation
  package.json
  README.md
  NODEBENCH_AGENTS.md          -- Agent protocol for convex-mcp-nodebench
```

---

## 4. Initiative 2: Unified Agent Interface for nodebench-ai

### 4.1 Vision

Transform nodebench-ai from a multi-hub navigation app into a **Manus AI-style unified workspace** where:
- A single agent conversation (FastAgentPanel) is the primary interaction point
- The agent can orchestrate all features: research, documents, spreadsheets, social, calendar, analytics
- Artifacts (documents, charts, tables, Mermaid diagrams) render inline in the conversation
- The workspace adapts around the conversation -- opening relevant panels, previews, and editors

### 4.2 Comparison: Current vs. Target

| Aspect | Current | Target |
|--------|---------|--------|
| **Navigation** | User manually switches between hubs via sidebar | Agent navigates based on conversation context |
| **Agent scope** | FastAgent answers questions, limited tool access | Agent can create docs, run research, manage calendar, post to LinkedIn |
| **Artifact display** | Separate views for each content type | Inline artifact rendering in conversation + side panels |
| **Context** | Each hub is isolated | Agent carries context across all features |
| **Command palette** | Cmd+K for basic navigation | Cmd+K as unified command center for agent + navigation |

### 4.3 Architecture: Agent-First Orchestration Layer

```
+------------------------------------------------------------------+
|                        nodebench-ai UI                            |
|  +------------+  +-------------------------------------------+   |
|  |            |  |  Unified Workspace                         |   |
|  | Smart      |  |  +-------------------------------------+  |   |
|  | Sidebar    |  |  | Context-Aware Main Panel             |  |   |
|  |            |  |  | (adapts based on agent actions)       |  |   |
|  | - Recent   |  |  |                                       |  |   |
|  | - Pinned   |  |  | [Document Editor] [Research View]     |  |   |
|  | - Agent    |  |  | [Spreadsheet]    [Analytics]          |  |   |
|  |   Threads  |  |  | [Calendar]       [Social Dashboard]   |  |   |
|  |            |  |  +-------------------------------------+  |   |
|  |            |  |                                             |   |
|  |            |  |  +-------------------------------------+  |   |
|  |            |  |  | Agent Panel (always accessible)       |  |   |
|  |            |  |  | - Conversation thread                  |  |   |
|  |            |  |  | - Inline artifacts                     |  |   |
|  |            |  |  | - Tool call visibility                 |  |   |
|  |            |  |  | - Action confirmations                 |  |   |
|  |            |  |  +-------------------------------------+  |   |
|  +------------+  +-------------------------------------------+   |
+------------------------------------------------------------------+
                              |
                    CoordinatorAgent (Convex)
                              |
         +--------------------+--------------------+
         |                    |                    |
   Research Tools      Document Tools       Social Tools
   - Web search        - Create/edit doc    - LinkedIn post
   - Funding data      - Spreadsheet ops    - Archive query
   - Daily brief       - Citation verify    - Engagement track
         |                    |                    |
   Calendar Tools      Analytics Tools      MCP Bridge
   - Event create      - Usage stats        - External MCP
   - Schedule check    - Performance        - Tool ledger
```

### 4.4 Key Components to Build/Enhance

#### 4.4.1 Agent Orchestration Layer (Convex Backend)

The `CoordinatorAgent` already exists. It needs expanded tool registration to cover all feature domains:

**Current tool coverage** (from functionSpec analysis):
- Research: daily brief, funding search, executive brief
- Documents: create, edit, search
- Social: LinkedIn posting, archive queries
- Agents: streaming, thread management

**Needed additions:**
- Calendar: event CRUD, schedule queries
- Analytics: dashboard data, usage queries
- Spreadsheets: cell operations, formula evaluation
- Email Intelligence: email processing, classification
- Navigation: view switching, panel management (agent tells UI what to show)
- Artifact Generation: create inline documents, charts, Mermaid diagrams

#### 4.4.2 Unified Agent Panel (Frontend)

Enhance `FastAgentPanel` to be the primary interaction point:

1. **Inline Artifact Rendering**
   - Mermaid diagrams (already requested by user)
   - Data tables from query results
   - Mini document previews
   - Chart/graph rendering
   - Code blocks with syntax highlighting

2. **Action Confirmations**
   - Before destructive actions, show confirmation card in conversation
   - Risk-tiered (auto-approve low risk, confirm high risk) -- mirrors NodeBench pattern

3. **Context Pills Enhancement**
   - Show which documents, research threads, calendar events are in agent context
   - Allow user to add/remove context items

4. **Tool Call Transparency**
   - Show which tools the agent is calling (expandable)
   - Show timing and results
   - Mirrors NodeBench's `log_tool_call` + `get_trajectory_analysis`

#### 4.4.3 Smart Navigation (Agent-Driven View Switching)

Add a navigation tool to the CoordinatorAgent:

```typescript
// convex/tools/navigation/viewSwitchTools.ts
export const navigateToView = internalMutation({
  args: {
    threadId: v.id("threads"),
    targetView: v.string(),  // 'research', 'documents', 'spreadsheets', etc.
    context: v.optional(v.any()), // e.g., { documentId: "..." }
  },
  handler: async (ctx, args) => {
    // Store navigation intent in thread metadata
    // Frontend listens via useQuery and switches view
  },
});
```

The frontend `useEffect` in `MainLayout.tsx` watches for navigation intents and switches views accordingly. This means the agent can say "Let me open that document for you" and the UI responds.

#### 4.4.4 Workspace State Synchronization

```typescript
// convex/domains/workspace/workspaceState.ts
// Real-time workspace state that syncs between agent actions and UI
export const getWorkspaceState = query({
  args: {},
  returns: v.object({
    activeView: v.string(),
    openDocuments: v.array(v.id("documents")),
    agentPanelOpen: v.boolean(),
    currentResearchTopic: v.optional(v.string()),
    pendingActions: v.array(v.object({
      actionId: v.string(),
      description: v.string(),
      riskTier: v.string(),
      requiresConfirmation: v.boolean(),
    })),
  }),
  handler: async (ctx) => { /* ... */ },
});
```

### 4.5 Interaction Patterns (Manus-Inspired)

#### Pattern 1: "Do everything from chat"
```
User: "Research the latest FDA approvals and create a briefing document"
Agent: [calls research tools] -> [creates document] -> [navigates to editor view]
       -> [shows inline preview in chat] -> "I've created a briefing document with 
       12 FDA approvals from the last 7 days. I've opened it in the editor."
```

#### Pattern 2: "Context-aware suggestions"
```
User: [viewing a funding research document]
Agent: "I notice you're looking at Series B funding data. Would you like me to:
       1. Create a spreadsheet analysis of the top rounds?
       2. Draft a LinkedIn post about the trend?
       3. Add these companies to your research watchlist?"
```

#### Pattern 3: "Cross-feature orchestration"
```
User: "Prepare my morning briefing"
Agent: [fetches daily brief] -> [checks calendar] -> [gets funding updates]
       -> [renders inline summary with Mermaid timeline]
       -> [offers to post digest to LinkedIn]
```

---

## 5. Initiative 3: Eval Harness, Enforcement, and Self-Instruct Protocol

To *ensure* agents using **NodeBench MCP** perform "as good or better," two things must work together:

1. **A measurement harness** that compares *bare agent* vs *MCP agent* on the *same* tasks, repeatedly, with stable scoring
2. **An enforcement + observability layer** that makes "doing the thorough thing" the default (and blocks shipping when it isn't)

---

### 5.1 Define What "Better" Means (Scorecard)

Use a scorecard with four buckets; otherwise you'll optimize for vibes:

#### A. Correctness (primary)

- **Task success rate** -- passes acceptance criteria + tests
- **Regression rate** -- new failures introduced in existing tests / eval cases

#### B. Safety & Risk Control

- **High-risk actions gated** -- did the agent request confirmation / follow policy?
- **Severity-weighted issues caught pre-merge** -- high > medium > low

#### C. Efficiency

- **Wall-clock time to green**
- **Tool-call and token cost overhead**
- **Retry / thrash rate** -- loops, backtracks, duplicate edits

#### D. Compounding / Learning

- **Knowledge reuse rate** -- % tasks where agent retrieves relevant prior learnings before coding
- **New eval cases banked per fix** -- regressions protected

The existing NodeBench comparison table already tracks many of these; the key is to formalize them so you can run A/Bs, not anecdotes.

---

### 5.2 Eval Harness: "Bare vs MCP" Repeated Runs

#### The Simplest Reliable Harness

For each task in a dataset:

1. Reset repo state to a clean commit
2. Run **Bare Agent** with tools disabled (or restricted)
3. Run **MCP Agent** with NodeBench enabled (try lite / core / full)
4. For both runs:
   - Execute the same deterministic checks (lint/static, unit, integration)
   - Score outputs with a rubric + (optional) LLM-as-judge on narrative parts
5. Store full traces + artifacts for audit

For off-the-shelf reference design, **[MCP-Bench](https://github.com/Accenture/mcp-bench)** is exactly this kind of "end-to-end pipeline" for tool-using agents via MCP servers.

#### Important: Run Multiple Seeds

Agents are stochastic. For each task, run 3-5 trials and report:

- **Mean score**
- **Variance**
- **Worst-case (P10) behavior**

---

### 5.3 Dataset Design (What to Test)

Don't just test "bugfix." Cover the failure modes MCP is supposed to reduce:

#### Tier 1: Repo-Local Engineering (deterministic)

- Bugfix with a reproducible failing test
- Refactor + no behavior change
- Dependency bump + migration
- Flaky test stabilization

#### Tier 2: Tool-Discovery & Multi-Tool Workflows

- "Find root cause across logs + code + docs"
- "Investigate + propose fix + add regression test"
- Multi-MCP-server tasks (where tool collisions and tool selection matter)

MCP-Bench explicitly evaluates tool discovery/selection and tool usage effectiveness.

#### Tier 3: Real Production Prompts (Your Wedge)

Use the "9 production prompts" set, but make them **fixture-backed**:

- Captured logs
- Minimal anonymized DB snapshots
- Synthetic queue states
- Recorded API responses

This removes "it depends on prod" ambiguity and makes runs reproducible.

---

### 5.4 Observability: Minimum Viable Telemetry

To debug *why* MCP is better/worse, you need structured traces (not just chat logs):

#### Per Run (one `run_id`)

| Field | Type | Purpose |
|-------|------|--------|
| `model` + `version` | string | Track model drift |
| `toolset_preset` | `lite` / `core` / `full` | Compare preset effectiveness |
| `task_id` + `category` + `risk_tier` | string | Segment results |
| `start/end timestamps` | number | Wall-clock duration |
| `token_counts` | number | Cost tracking |
| `tool_call_count` | number | Overhead tracking |

#### Per Tool Call

| Field | Type | Purpose |
|-------|------|--------|
| `tool_name` | string | Which tool was called |
| `duration_ms` | number | Latency tracking |
| `success` / `failure` | boolean | Error rate |
| `input/output hashes` | string | Reproducibility (or redacted payload summaries) |
| `quickRef nextAction chosen` | string | Did the agent follow the self-instruct hint? |

#### Per Verification Cycle

| Field | Type | Purpose |
|-------|------|--------|
| `gaps_created` | array | Severity, status, time-to-close |
| `tests_executed` | array | static / unit / integration + results |
| `eval_cases_created` | array | Regression protection banked |
| `quality_gate_checks` | array | Violations that blocked ship |

This is the difference between "it feels better" and "it is better and we know where."

---

### 5.5 Enforcement: Quality Gates + Mandatory Workflow

Measurement alone doesn't prevent regressions. You also need **enforcement**:

#### CI Gating

- On every PR: require a NodeBench "minimum flywheel" run (or equivalent) before merge
- **Block merge if:**
  - Required test layers not run
  - High-severity gaps open
  - Quality gate violations present

This is the operational point of NodeBench: turning good practice into an enforced pipeline.

#### Nightly Regression

- Run the eval dataset nightly against `main`
- If a task regresses: auto-open an issue with the run trace + failing artifact bundle

This is how you keep "better" true over time.

---

### 5.6 "Fewer Tools" Architecture Without Losing Power

You can expose **very few tools** to the agent and still get strong performance *if* the few tools are **discovery + gateway + policy**.

A robust minimal pattern:

1. `discover_tools(query, explain=true)` -- find relevant tools
2. `get_tool_schema(tool_name)` -- or return schema in discovery results
3. `invoke(tool_name, args)` -- **gateway** (centralized policy checks)
4. `get_methodology(topic)` -- structured guidance
5. `search_knowledge(query)` / `record_learning(...)` -- persistent memory

**Why this works:**

- Avoids shoving 100+ tool schemas into context
- Keeps tool choice explicit and auditable ("why this tool")
- Centralizes policy checks in the gateway

**Caution:** When clients merge tools from multiple MCP servers, [name collisions can override earlier tools](https://ai-sdk.dev/cookbook/node/mcp-tools), so the gateway should namespace tools or enforce unique names.

---

### 5.7 Self-Instruct: Capability Acquisition Protocol

Add this to the agent's system / `AGENTS.md` rules:

**Capability Acquisition Protocol:**

1. *Before coding*: search knowledge for similar past fixes
2. If blocked because a tool is missing:
   - Run tool discovery ("do we already have it under another name?")
   - If still missing, switch to **setup mode**:
     - Generate the exact install/config steps (e.g., add MCP server, enable toolset preset)
     - If the environment supports file edits, produce a patch for `.claude.json` / `.mcp.json`
     - Validate by re-listing tools
3. Only then proceed with implementation

This turns "I can't" into "I can bootstrap what I need," while keeping it safe and observable.

---

### 5.8 Fastest Path to Confidence (What to Do First)

1. Create a **20-task dataset** (10 deterministic repo tasks, 10 production-prompt fixtures)
2. Build the harness to run **Bare vs NodeBench-lite vs NodeBench-full** (3-5 trials each)
3. Wire **CI gate**: fail PR if "minimum verification" artifacts aren't present
4. Add a dashboard over the telemetry (success rate, regressions, overhead, knowledge reuse)

---

## 6. Architecture Overview

### 6.1 How Everything Connects

```
                     +-----------------------+
                     |    IDE (Windsurf)      |
                     |  +-- Context7 MCP      |  (generic library docs)
                     |  +-- Convex MCP        |  (deployment introspection)
                     |  +-- NodeBench MCP     |  (dev methodology + tools)
                     |  +-- convex-mcp-nb     |  (Convex-specific methodology) [NEW]
                     +-----------+-----------+
                                 |
                                 | (developer builds with agent assistance)
                                 v
          +----------------------------------------------+
          |            nodebench-ai (Convex App)          |
          |                                               |
          |  Frontend (React + Vite)                      |
          |  +-- Unified Agent Panel (FastAgentPanel)     |
          |  +-- Smart Sidebar (context-aware nav)        |
          |  +-- Artifact Renderer (Mermaid, tables, etc) |
          |  +-- Workspace State Sync                     |
          |                                               |
          |  Backend (Convex)                              |
          |  +-- CoordinatorAgent (tool orchestration)     |
          |  +-- Feature domains (research, docs, social)  |
          |  +-- MCP Bridge (external tool access)         |
          |  +-- MCP Tool Ledger (usage tracking)          |
          +----------------------------------------------+
                                 |
                                 | (end user interacts via unified interface)
                                 v
                          +-------------+
                          |   End User  |
                          +-------------+
```

### 6.2 MCP Server Responsibilities

| Server | Responsibility | When Used |
|--------|---------------|-----------|
| **Context7** | Raw library documentation lookup | When agent needs API reference for any library |
| **Convex MCP** | Live deployment introspection (tables, functions, data, logs) | When agent needs to inspect/run against live Convex deployment |
| **NodeBench MCP** | Dev methodology, verification, eval, quality gates, learnings | During development workflow (any language/framework) |
| **convex-mcp-nodebench** | Convex-specific methodology, schema audit, gotchas, deploy gates | During Convex-specific development (complements all 3 above) |

---

## 7. Implementation Roadmap

### Phase 1: convex-mcp-nodebench Foundation (Week 1-2)

1. **Scaffold package**: `packages/convex-mcp-nodebench/` with MCP SDK setup
2. **Core infrastructure**: SQLite DB, tool registry, quickRef system
3. **Seed gotcha database**: Extract from existing `convexRules.md` (151 lines of rules)
4. **Schema tools**: `convex_audit_schema`, `convex_suggest_indexes`, `convex_validate_schema_change`
5. **Function tools**: `convex_audit_functions`, `convex_check_function_refs`
6. **Methodology tools**: `convex_get_methodology` with initial guides
7. **Tests**: Verification that tools work against the nodebench-ai convex/ directory

### Phase 2: convex-mcp-nodebench Intelligence (Week 3-4)

1. **Context7 sync**: `convex_sync_from_context7` pulling latest Convex docs
2. **Daily update pipeline**: Automated changelog extraction
3. **Deploy gates**: `convex_pre_deploy_gate` with quality checks
4. **Rules generation**: `convex_generate_rules_md` from learnings
5. **Progressive discovery**: Convex-specific hybrid search
6. **Integration with Convex MCP**: Bridge tools that combine deployment data with methodology

### Phase 2.5: Eval Harness + Enforcement (Week 3-4, parallel with Phase 2)

1. **20-task dataset**: 10 deterministic repo tasks (bugfix, refactor, dep bump, flaky test) + 10 fixture-backed production prompts
2. **Harness runner**: Script that resets repo, runs Bare Agent vs NodeBench-lite vs NodeBench-full, executes deterministic checks, scores with rubric + LLM-as-judge
3. **Multi-seed execution**: 3-5 trials per task per config; report mean, variance, P10 worst-case
4. **Telemetry schema**: Per-run (model, preset, task, timestamps, tokens, tool calls), per-tool-call (name, duration, success, quickRef followed), per-verification-cycle (gaps, tests, evals, gate checks)
5. **CI gate**: GitHub Actions step requiring "minimum flywheel" artifacts before merge; block on missing test layers, open high-severity gaps, quality gate violations
6. **Nightly regression**: Scheduled run of eval dataset against `main`; auto-open issue with trace + failing artifact bundle on regression
7. **Scorecard dashboard**: Success rate, regression rate, high-risk gating compliance, efficiency overhead, knowledge reuse rate, eval cases banked
8. **Capability Acquisition Protocol**: Add to `AGENTS.md` -- search knowledge before coding, discover tools if blocked, bootstrap missing tools in setup mode, then proceed

### Phase 3: Unified Interface Foundation (Week 4-6)

1. **Inline artifact rendering**: Mermaid, data tables, mini-previews in FastAgentPanel
2. **Tool call transparency**: Show agent tool usage in conversation
3. **Action confirmations**: Risk-tiered confirmation cards
4. **Navigation tools**: Agent-driven view switching via Convex mutations
5. **Context pills enhancement**: Multi-document, multi-feature context

### Phase 4: Agent Orchestration Expansion (Week 6-8)

1. **Expand CoordinatorAgent tools**: Calendar, analytics, spreadsheet, email tools
2. **Workspace state sync**: Real-time state between agent actions and UI
3. **Cross-feature workflows**: Morning brief, research-to-document, funding-to-LinkedIn
4. **Smart sidebar**: Recent agent threads, pinned contexts, suggested actions

### Phase 5: Polish, Flywheel, and "Fewer Tools" Gateway (Week 8-9)

1. **Self-eval integration**: Track which unified interface paths users take
2. **Quality gates**: Pre-action validation for high-risk operations
3. **"Fewer tools" gateway**: Implement `discover_tools` -> `get_tool_schema` -> `invoke` gateway pattern with centralized policy checks and tool namespacing to prevent MCP name collisions
4. **AGENTS.md update**: Document all new operational procedures including Capability Acquisition Protocol
5. **NodeBench verification cycle**: Full 6-phase verification of all three initiatives

---

## 8. Key Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tool count explosion in convex-mcp-nodebench | Agent confusion, context bloat | Strict 28-tool limit, preset gating (lite/core/full) |
| CoordinatorAgent tool sprawl | Slow routing, increased latency | Group tools by domain, use progressive discovery pattern |
| Context7 API rate limits for daily sync | Stale gotcha database | Cache aggressively, diff-only updates, fallback to manual trigger |
| Unified interface complexity | UI performance, maintainability | Lazy-load all panels, keep hub components unchanged, only add orchestration layer |
| Agent hallucinating tool calls | Incorrect actions on user data | Risk-tiered confirmation (NodeBench pattern), dry-run defaults for destructive ops |
| Convex schema analysis accuracy | False positives in audit | AST-based analysis where possible, user override for custom patterns |
| Eval harness stochasticity | Noisy A/B results, false confidence | Multi-seed runs (3-5 per task), report variance + P10, don't ship on single-run results |
| MCP tool name collisions | Tools from different servers silently override each other | Gateway pattern with namespacing, enforce unique names across all MCP servers |
| CI gate too strict early on | Blocks velocity before harness is calibrated | Start with "warn" mode, graduate to "block" after 2 weeks of stable baselines |
| Nightly regression noise | Alert fatigue from flaky tasks | Separate deterministic (Tier 1) from stochastic (Tier 3) tasks; only auto-issue on Tier 1 regressions |

---

## Appendix A: Pre-Seeded Convex Gotchas (from convexRules.md)

These would be the initial `convex_gotchas` database entries:

1. **validator_bigint_deprecated**: `v.bigint()` is deprecated -- use `v.int64()` instead
2. **undefined_not_valid**: JavaScript `undefined` is not a valid Convex value -- use `null`
3. **system_fields_auto**: `_creationTime` and `_id` are auto-added, don't include in schema
4. **index_field_order**: Index fields must be queried in the same order they're defined
5. **no_map_set_validators**: `v.map()` and `v.set()` are not supported -- use `v.record()`
6. **action_from_action**: Only call action from action if crossing runtimes (V8 to Node)
7. **function_ref_not_direct**: Use `api.x.y` or `internal.x.y` references, never pass functions directly
8. **new_function_syntax**: Always use `query({ args, returns, handler })` syntax
9. **internal_for_private**: Use `internalQuery/Mutation/Action` for functions that shouldn't be public
10. **returns_validator_required**: Always include `returns:` validator, use `v.null()` for void functions
11. **no_register_via_api**: Cannot register functions through `api` or `internal` objects
12. **circular_type_annotation**: When calling same-file functions via `ctx.runQuery`, add return type annotation
13. **array_max_8192**: Arrays can have at most 8192 values
14. **object_max_1024**: Objects can have at most 1024 entries
15. **field_no_dollar_underscore**: Field names must not start with `$` or `_`

---

## Appendix B: Existing nodebench-ai Convex Functions (Key Domains)

From the `functionSpec` analysis, the deployment already has extensive function coverage:

- **Agents**: `fastAgentPanelStreaming`, `coordinatorAgent`, `coordinatorWorkflowActions`
- **Research**: `dailyBriefWorker`, `executiveBrief`, `dailyBriefMemoryQueries`
- **Documents**: Document CRUD, editor operations
- **Social**: LinkedIn posting, archive, audit, cleanup, OAuth
- **MCP**: `mcpBridgeQueries`, `mcpToolLedger`, `mcpPolicyConfigs`
- **Evaluation**: `evaluator`, `comprehensiveTest`, `liveEval`
- **Narrative**: `didYouKnow`, legacy edits
- **Learning**: `adaptiveLearning`, `mcpToolLearning`

This existing function surface area is what the unified interface agent needs to orchestrate.
