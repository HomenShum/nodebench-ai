# Unified Workflow Spec

Date: April 11, 2026

## Purpose

NodeBench should tell one product story:

```text
NodeBench AI = flagship user surface
nodebench-mcp = embedded execution lane
Retention / Attrition = hidden compounding layer
Oracle / Flywheel = builder-facing review layer
```

The job is not "show pages" on the web and "show tools" in MCP.
The job is:

```text
Turn messy input into a sourced report you can reopen and act on.
```

This spec consolidates the existing runtime into one canonical workflow and one canonical artifact.

## Repo Grounding

Current repo primitives already support this direction:

- The Ask runtime already streams a typed pipeline of `classify -> search -> analyze -> package` in [server/routes/streamingSearch.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/routes/streamingSearch.ts:1).
- The product already has a canonical `Report` backend object in [server/lib/canonicalModels.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/lib/canonicalModels.ts:1).
- The system already has a canonical workflow-envelope layer in [server/lib/workflowEnvelope.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/lib/workflowEnvelope.ts:1).
- Shared-context publish and delegate flows already exist in [server/routes/sharedContext.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/routes/sharedContext.ts:1) and are exercised in [server/sharedContextRoute.test.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/server/sharedContextRoute.test.ts:1).
- The reduced MCP execution lane already exists as a workflow facade in [packages/mcp-local/src/tools/coreWorkflowTools.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/packages/mcp-local/src/tools/coreWorkflowTools.ts:1).
- The current result packet type already carries report-shaped evidence and answer blocks in [src/features/controlPlane/components/searchTypes.ts](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/controlPlane/components/searchTypes.ts:1).

What is still incomplete:

- one universal canonical report/workflow asset across every surface
- replay as the default runtime path
- measured cost compression through Retention / Attrition
- one stable runtime event model enforced across web and MCP

## Canonical Workflow

This is the one dominant workflow for both surfaces:

```text
ASK
 -> GATHER CONTEXT
 -> BUILD REPORT
 -> SAVE / SHARE
 -> FOLLOW UP
```

Equivalent runtime view:

```text
INPUT
- question
- screenshot
- file
- link
- note
- saved context

RUNTIME
- classify
- search
- analyze
- package

OUTPUT
- sourced report
- clear next actions
- reusable saved memory
- optional nudge or delegation
```

## Entry Lanes

### Web Lane

Human-facing flow:

```text
Home -> Chat -> Reports -> Nudges -> Me
```

Rules:

- `Home` launches the workflow, not the brand story.
- `Chat` is the dominant runtime surface.
- `Reports` is reusable memory, not passive archive.
- `Nudges` and `Me` exist to increase future report quality and follow-through.

### MCP Lane

Agent-facing flow:

```text
investigate -> report -> follow_up -> track
```

Rules:

- The MCP default surface is an embedded execution lane into the same workflow.
- That runtime now ships through three install lanes: `nodebench-mcp` for core, `nodebench-mcp-power` for expanded founder/research work, and `nodebench-mcp-admin` for operator workflows.
- Discovery is fallback, not front door.
- The MCP should return a human-usable artifact, not just raw tool output.
- The MCP must not become a second flagship with a separate story.

## Canonical Artifact

The user-facing name is:

```text
Report
```

Internally, the report should unify:

- result packet
- workflow envelope
- shared-context packet
- founder episode / lineage references
- replay / eval references

### Report Object

Minimum canonical shape:

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
  nudgeCandidates?: NudgeCandidate[];
  envelopeId?: string;
  contextId?: string;
  workflowAssetId?: string;
  replayRefId?: string;
  createdAt: string;
  updatedAt: string;
};
```

### Surface Mapping

| Surface | What the user sees | What the system stores |
| --- | --- | --- |
| Web Ask / Chat | Report page | `Report` + `WorkflowEnvelope` + result packet |
| MCP `investigate` / `report` | Markdown + structured JSON + artifact handle | same `Report` lineage and envelope |
| Shared context publish | report packet for handoff | shared-context packet pointing to the same report lineage |
| Nudges | follow-up prompts | derived off the same report object |
| Retention / Attrition | better and cheaper future runs | patterns and compression keyed to the same report object |

## Runtime Model

Required event model for both web and MCP:

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
```

Required budgets:

```text
Chat first visible response < 800ms
First source visible < 2s
First report section complete < 5s
MCP stdio ready < 500ms warm
MCP health check < 300ms warm
```

## Implementation Direction

### Keep

- one typed runtime
- one report artifact
- one save/share path
- one delegation path
- one measurement model

### Strip from Default MCP

- giant preset-first mental model
- dashboard / profiler / admin systems in the hot path
- discovery as the first action
- any tool that does not contribute to the report workflow

### Keep in Default MCP

- `investigate`
- `report`
- `track`
- follow-up helper once implemented as a first-class facade
- one artifact handle
- one markdown output
- one structured JSON output

## Interview Script

### 30-second version

NodeBench is a research runtime that turns messy questions or messy evidence into a sourced report you can save, reopen, and act on. The web product is the flagship user surface. The MCP server is the same workflow exposed inside tools like Claude or Cursor, so agents can complete the same job without learning a giant tool warehouse. Over time, strong runs become reusable and cheaper through the workflow-learning layer.

### 2-minute version

We designed the system around one canonical workflow: ask, gather context, build a report, save it, and follow up. On the web, that shows up as Home, Chat, Reports, Nudges, and Me. Underneath, the runtime is a typed `classify -> search -> analyze -> package` pipeline with shared-context handoff and builder-facing evaluation. The MCP server should not be a second product with hundreds of tools. It should be an embedded lane into the same runtime, returning the same report artifact with measurable latency and cost. The real next step is consolidating all output forms into one canonical workflow envelope, then using Retention and Attrition to make strong workflows reusable and cheaper over time.

## Do Not Claim

Do not claim these as already complete:

- that Retention and Attrition are fully unified and fully shipping across every surface
- that replay is the default runtime path everywhere
- that actual provider cost is comprehensively measured end-to-end
- that the report object is already fully unified across web, MCP, shared context, and eval
- that `nodebench-mcp` is a separate flagship product
- that the current MCP measurement story is finished

Do claim these:

- the typed Ask pipeline exists now
- report saving exists now
- shared-context publish and delegate exist now
- the MCP has a reduced workflow-first default lane now
- the architecture direction is consolidation into one canonical report workflow

## Bottom Line

```text
NodeBench AI owns the user experience.
nodebench-mcp owns the embedded execution lane.
Both run the same typed runtime.
Both emit the same report artifact.
Both are measured by the same runtime metrics.
Retention / Attrition improve that same workflow underneath.
```
