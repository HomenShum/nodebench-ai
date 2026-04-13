# Unified Web + MCP Production Spec

Date: April 11, 2026

## Purpose

NodeBench should ship one product workflow across two entry lanes:

```text
NodeBench AI = flagship user surface
nodebench-mcp = embedded production companion lane
Retention / Attrition = hidden compounding layer
Oracle / Flywheel = builder-facing review layer
```

This is not a second product story for MCP.
It is one runtime exposed in two ways:

```text
messy input
-> investigate
-> build report
-> save / share
-> follow up
```

## Production Promise

The front-door sentence should stay simple:

```text
Turn messy input into a sourced report you can reopen and act on.
```

Web users should experience that directly in NodeBench AI.
Agent-native users should get the same workflow inside Claude Code, Codex, Cursor, Windsurf, and similar environments through the NodeBench MCP install lanes:

- `nodebench-mcp` for the tiny core workflow lane
- `nodebench-mcp-power` for the expanded founder/research lane
- `nodebench-mcp-admin` for operator workflows

## Repo Grounding

The production architecture already has the right primitives:

- The typed runtime is streamed in [server/routes/streamingSearch.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/routes/streamingSearch.ts:1).
- Canonical report persistence already exists in [server/lib/canonicalModels.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/lib/canonicalModels.ts:1).
- Workflow lineage already exists in [server/lib/workflowEnvelope.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/lib/workflowEnvelope.ts:1).
- Shared-context publish and delegate already exist in [server/routes/sharedContext.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/routes/sharedContext.ts:1).
- The reduced MCP workflow facade already exists in [packages/mcp-local/src/tools/coreWorkflowTools.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/packages/mcp-local/src/tools/coreWorkflowTools.ts:1).
- The current frontend result object already carries report-shaped evidence in [src/features/controlPlane/components/searchTypes.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/controlPlane/components/searchTypes.ts:1).

What is still incomplete:

- one universal canonical report asset across web, MCP, shared context, and eval
- one enforced runtime event schema across both surfaces
- real provider cost measurement on every workflow
- a smaller, fully truthful MCP production surface

## Canonical Artifact

The user-facing artifact is:

```text
Report
```

Both entry lanes must emit the same logical object.

Minimum production shape:

```ts
type CanonicalReport = {
  reportId: string;
  title: string;
  query: string;
  entityName?: string;
  summary: string;
  confidence: number;
  lens: string;
  sources: SourceRef[];
  answerBlocks: AnswerBlock[];
  nextActions: string[];
  artifactHandle: string;
  envelopeId?: string;
  contextId?: string;
  workflowAssetId?: string;
  replayRefId?: string;
  createdAt: string;
  updatedAt: string;
};
```

Every production run should return:

- structured JSON
- readable markdown
- source list
- artifact handle
- actual latency
- actual provider cost

## Entry Lanes

### Web Lane

```text
Home -> Chat -> Report -> Nudges -> Me
```

Rules:

- `Home` is a launchpad, not a marketing wall.
- `Chat` is the dominant runtime surface.
- `Report` is the artifact users save, reopen, and share.
- `Nudges` and `Me` improve future runs off the same report lineage.

### MCP Lane

```text
investigate -> report -> follow_up -> track
```

Rules:

- The MCP lane is a production companion, not a second flagship.
- Discovery is fallback, not first move.
- The output must be useful to humans, not only agents.
- The default lane must stay under 10 visible tools.

## Shared Runtime

Both lanes run the same typed backbone:

```text
classify
-> search
-> analyze
-> package
```

Both lanes should save into the same report lineage:

```text
input
-> typed runtime
-> canonical report
-> save / share / delegate / nudge
```

## Runtime Event Schema

Required event model:

```text
ask_submitted_at
first_partial_answer_at
first_source_at
first_completed_section_at
report_saved_at
report_shared_at
nudge_created_at
nudge_opened_at
followup_started_at
workflow_completed_at
```

Required runtime measures:

```text
startup_latency_ms
first_token_ms
first_source_ms
report_completion_ms
tool_calls_count
sources_count
actual_provider_cost_usd
cost_per_report_usd
success_rate
reuse_rate
return_to_report_rate
artifact_completion_rate
```

## Product Budgets

These are product budgets, not aspirational notes:

```text
Chat first visible response < 800ms
First source visible < 2s
First completed report section < 5s
MCP stdio ready < 500ms warm
MCP health check < 300ms warm
Default MCP visible tools < 10
Default MCP workflow to artifact in 3-5 calls
```

## nodebench-mcp v1 Cut List

Remove from the default hot path:

- dashboard launchers
- profiling proxies
- benchmark runners
- A/B harnesses
- embedding bootloaders
- admin analytics helpers
- giant preset-first flows
- discovery-first meta tools
- anything that inspects the platform more than it completes the report workflow

Keep in the default production lane:

- `investigate`
- `report`
- `track`
- `follow_up` when shipped as a first-class facade
- one fallback discovery helper at most

## Deployment Shape

### Production Web Surface

- Host the flagship product on the existing Vercel project.
- Keep the web experience centered on Ask, Report, shared context, and follow-up.
- Treat `/api/search`, `/api/shared-context/*`, and `/api/sync-bridge/*` as part of the same production workflow, not as detached utility endpoints.

### Production MCP Surface

- `nodebench-mcp` stays the local, installable entry lane for agent-native users.
- The default install should expose the workflow facade first.
- Heavy toolpacks should remain optional.
- Server-hosted MCP or gateway surfaces should mirror the same small workflow-first stance.

## Ship Gate

Before claiming this is production-ready, enforce:

1. README and runtime tool counts match.
2. Default MCP output includes markdown, JSON, artifact handle, sources, latency, and cost.
3. Runtime event schema is emitted in both web and MCP lanes.
4. Startup and health budgets are tracked, not guessed.
5. One shareable report path works end-to-end.

## Interview Version

### 30 seconds

NodeBench turns messy questions or messy evidence into a sourced report you can save, reopen, and act on. The web app is the flagship user surface. The MCP server is the same workflow embedded inside tools like Claude Code, Codex, and Cursor, so agent-native users can run the same report workflow where they already work.

### 2 minutes

We unified the product story around one workflow: investigate, build a report, save it, and follow up. The web app exposes that workflow directly through Home, Chat, Reports, Nudges, and Me. Underneath, both web and MCP share the same typed runtime and should emit the same report artifact with the same runtime metrics. The MCP lane should not be a second bloated platform. It should be a tightly scoped companion lane into the same production workflow, with measurable latency, measurable cost, and a human-readable artifact at the end.

## Do Not Claim

Do not claim:

- that all workflow assets are already fully unified everywhere
- that cost measurement is already comprehensive end-to-end
- that replay is the default runtime path across every surface
- that the MCP default lane is already fully within the final latency budgets
- that `nodebench-mcp` is a separate flagship product

Do claim:

- the typed web runtime exists now
- report persistence exists now
- shared-context publish and delegate exist now
- the MCP has a reduced workflow-first lane now
- the architecture direction is explicit consolidation, measurement, and artifact-first output
