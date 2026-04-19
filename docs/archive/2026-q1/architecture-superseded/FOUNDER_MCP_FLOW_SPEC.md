# Founder MCP Flow Spec

Date: April 12, 2026

## Purpose

This spec defines the founder-specific role of `nodebench-mcp`.

The product framing is:

```text
NodeBench AI = the main product surface
nodebench-mcp = the founder's private bridge into the same system
```

The MCP is not a second flagship.
It is the founder and power-user lane into the same NodeBench report and memory system.

## Core Product Rule

The founder should never feel like they are switching products.

They should feel:

```text
I am using NodeBench.
Sometimes through the web.
Sometimes through Claude Code.
Same output. Same memory. Same company truth.
```

## Founder Jobs

`nodebench-mcp` should do two founder jobs.

### Job 1: Push Private Company Context Into NodeBench

```text
repo / docs / notes / local files
-> Claude Code investigates
-> nodebench-mcp packages the result
-> NodeBench AI receives a report update
-> company truth gets richer over time
```

Examples:

- summarize my codebase into a company profile
- extract product capabilities from docs and README files
- update my company report from this week's commits
- turn an internal product spec into a founder packet
- attach private company context to NodeBench

### Job 2: Run NodeBench Directly Inside Claude Code

```text
Claude Code
-> nodebench-mcp investigate
-> nodebench-mcp report
-> nodebench-mcp follow_up
-> same report artifact as web
```

Examples:

- competitor research
- founder packet generation
- product positioning analysis
- weekly reset report
- investor-ready brief
- diligence packet

## Repo Grounding

The current repo already has the right primitives for this direction:

- Typed web runtime: [server/routes/streamingSearch.ts](../../server/routes/streamingSearch.ts)
- Canonical report backend object: [server/lib/canonicalModels.ts](../../server/lib/canonicalModels.ts)
- Workflow lineage and envelope: [server/lib/workflowEnvelope.ts](../../server/lib/workflowEnvelope.ts)
- Shared-context publish/delegate routes: [server/routes/sharedContext.ts](../../server/routes/sharedContext.ts)
- Reduced MCP workflow facade: [packages/mcp-local/src/tools/coreWorkflowTools.ts](../../packages/mcp-local/src/tools/coreWorkflowTools.ts)
- Local private file parsing tools: [packages/mcp-local/src/tools/localFileTools.ts](../../packages/mcp-local/src/tools/localFileTools.ts)
- MCP shared-context tools: [packages/mcp-local/src/tools/sharedContextTools.ts](../../packages/mcp-local/src/tools/sharedContextTools.ts)
- MCP sync bridge tools: [packages/mcp-local/src/tools/syncBridgeTools.ts](../../packages/mcp-local/src/tools/syncBridgeTools.ts)

This means the founder MCP story is a consolidation problem, not a net-new invention problem.

## Founder Modes

### Mode A: Sync Private Context

This mode is "bring my company into NodeBench."

```text
Founder connects Claude Code
-> selects repo / docs / files
-> MCP extracts company truth
-> pushes to NodeBench AI
-> company report updates
```

Primary outcomes:

- internal company profile
- product truth
- technical architecture summary
- roadmap and spec extraction
- contradictions and gaps
- founder-ready packets

### Mode B: Run NodeBench From Claude Code

This mode is "use NodeBench without leaving Claude Code."

```text
Founder stays in Claude Code
-> asks a NodeBench workflow question
-> MCP runs investigation
-> returns sourced report
-> optionally syncs back to NodeBench AI
```

Primary outcomes:

- external research
- competitor analysis
- banker or investor packet
- founder weekly reset
- customer and product analysis

## Canonical Artifact

Both founder modes must resolve to the same user-facing object:

```text
Report
```

Not:

- one special Claude artifact
- one separate MCP artifact
- one separate web packet

One report object, with different entry lanes.

## Bidirectional Flow

The founder lane should be explicitly bidirectional:

```text
Claude Code <-> nodebench-mcp <-> NodeBench AI
```

That means the MCP must support:

### Pull From Local Private Context

- codebase
- docs
- markdown files
- product specs
- notes
- uploaded local files

### Normalize Into NodeBench Structure

Everything should map into:

- company
- product
- feature
- signal
- contradiction
- report update
- evidence or source
- action item

### Push Into NodeBench AI

The founder should be able to send:

- company profile updates
- product summaries
- packet updates
- new private notes
- report deltas

### Pull Back Out Of NodeBench AI

Claude Code should also be able to retrieve:

- current company profile
- saved reports
- contradictions
- hidden requirements
- latest packet
- prior competitor work

## Minimal Data Model

The founder lane should use one shared identity spine.

Minimum shared IDs:

- `workspaceId`
- `companyId`
- `reportId`
- `contextId`
- `workflowAssetId`
- `artifactHandle`

Minimum normalized object set:

| Object | Purpose |
| --- | --- |
| `CompanyProfile` | stable company truth assembled from internal and external inputs |
| `ProductSurface` | products, features, capabilities, and technical shape |
| `Signal` | meaningful change, market signal, customer signal, or execution signal |
| `Contradiction` | internal inconsistency, stale claim, or evidence conflict |
| `Report` | reusable artifact founders reopen, share, and build from |
| `EvidenceRef` | file, doc, repo path, URL, commit, or source pointer |
| `ActionItem` | next action, follow-up, nudge candidate, or delegation target |

## Install Flow

The first founder wedge should be:

```text
1. Founder installs nodebench-mcp-power
2. Founder pairs local workspace to NodeBench account
3. Founder points MCP at repo / docs / notes
4. MCP generates an initial company report
5. Report syncs into NodeBench AI
6. Founder opens NodeBench AI and sees company truth
7. Founder can continue in web Chat or stay in Claude Code
```

Notes:

- `nodebench-mcp` remains the smallest workflow lane.
- `nodebench-mcp-power` is the right default founder install because private-context sync will usually need local file, shared-context, and sync bridge capabilities.
- `nodebench-mcp-admin` remains operator-only.

## Sync Flow

The minimal private-context sync path should be:

```text
local files / docs / repo context
-> extract and normalize
-> create report update
-> attach evidence refs
-> publish shared context
-> persist report lineage
-> refresh company truth in NodeBench AI
```

Current repo primitives that already support parts of this:

- local file parsing via the `local_file` toolset
- peer registration via `register_shared_context_peer`
- packet publish via `publish_shared_context`
- local account pairing via `bind_local_account`
- artifact and outcome recording via `record_sync_artifact` and `record_sync_outcome`

## Report Push Flow

The founder should be able to run a report and push it back into the same system without restating context.

Target flow:

```text
investigate or report
-> generate canonical report
-> attach company/workspace identity
-> push report update
-> save to NodeBench AI
-> allow reopen, compare, nudge, or follow-up
```

Production HTTP surfaces already aligned with this story:

- `GET /api/shared-context/snapshot`
- `POST /api/shared-context/publish`
- `POST /api/shared-context/delegate`
- `GET /api/sync-bridge/health`
- `GET /api/sync-bridge/accounts/:userId`

## Minimal Founder MCP Commands

The founder lane should expose a very small public facade on top of the lower-level MCP tools.

### Must exist as founder-facing commands

- `sync_company_context`
- `refresh_company_report`
- `push_report_update`
- `get_company_profile`
- `get_company_reports`
- `get_company_contradictions`
- `investigate`
- `report`
- `follow_up`
- `track`

### Likely thin wrappers over existing lower-level primitives

- `register_shared_context_peer`
- `publish_shared_context`
- `pull_shared_context`
- `bind_local_account`
- `record_sync_artifact`
- `record_sync_outcome`

The product should expose the founder-friendly names first.
The low-level protocol tools should remain available underneath for advanced or internal use.

## Shipping Order

### Slice 1: Founder Initial Sync

- install founder on `nodebench-mcp-power`
- pair workspace
- parse repo/docs/local notes
- generate first company report
- push report into NodeBench AI

### Slice 2: Founder Bidirectional Report Loop

- pull current company profile into Claude Code
- generate deltas from new local context
- push updates back into the same report lineage

### Slice 3: Founder Ongoing Operating Loop

- weekly reset
- investor packet refresh
- competitor refresh
- contradiction review

## Guardrails

Do not let founder MCP become:

- a giant toolbox
- a separate product
- a separate artifact model
- a separate memory model
- a separate company profile system

It should feel like:

```text
NodeBench for founders who live inside Claude Code.
```

## Interview Walkthrough

Plain-English version:

NodeBench has one core workflow and one report system. On the web, founders use the main NodeBench AI product. Inside Claude Code, they use `nodebench-mcp` as a private bridge into that same system. That bridge does two things: it pushes private company context from code, docs, and notes into NodeBench, and it lets founders run the same research and report workflow without leaving Claude Code. The important product decision is that both paths produce the same report object and update the same company truth, instead of creating two different products or two different memories.
