# Scratchpad Pattern — Write, Revise, Structure

**Status:** Living · Last reviewed 2026-04-19
**Owner:** Core team

## TL;DR

Agents produce better structured output when they **write → revise → structure** in three passes instead of emitting structured JSON in one shot. Each diligence run creates a markdown scratchpad (per-run + per-entity), writes across iterations, and a separate structuring pass converts the final markdown into committed structured data. Streams live to the UI so users see the agent thinking in real time.

## Prior art

| Reference | Pattern |
|---|---|
| **Anthropic — "Building Effective Agents"** | Shared working memory across sub-agents |
| **Claude Code CLAUDE.md** | Read-before / write-after persistent memory |
| **Manus AI virtual workspace** | Agents iterate on a markdown doc before presenting |
| **Cognition Devin notes file** | Transparent reasoning trace alongside the task |

## Invariants

1. **Markdown is the working medium.** Structured output is the committed artifact — derived, regenerable.
2. **Per-run + per-entity layering.** Like git: per-run = commits · per-entity = merged main branch.
3. **Agent can revise its own earlier writes** before structuring. Uncertainty drops as evidence accumulates.
4. **Open-questions section is explicit.** Agent surfaces contradictions and gaps, never swallows them.
5. **Version-locked to entity.** If entity.version changed during structuring → drift detected → regenerate.
6. **Streams live to UI** via Convex reactivity. User sees sections populate as they fill.

## Architecture

```
┌──────────────────────────────────────────────┐
│  Pipeline run begins                         │
│        │                                     │
│        ▼                                     │
│  Create scratchpad template:                 │
│    # <Entity> — Diligence Scratchpad          │
│    ## Founders                               │
│    ## Products                               │
│    ## Funding                                │
│    ## News                                   │
│    ## Hiring                                 │
│    ## Patents                                │
│    ## Public Opinion                         │
│    ## Open Questions                         │
│    ## Sources consulted                      │
│        │                                     │
│        ▼                                     │
│  Sub-agents write to their own section       │
│  (read other sections for cross-ref,         │
│   write only own section)                    │
│        │                                     │
│        ▼                                     │
│  UI subscribes via useQuery(scratchpad)      │
│  — renders markdown live as it grows         │
│        │                                     │
│        ▼                                     │
│  Checkpoint (budget / confident / user)      │
│        │                                     │
│        ▼                                     │
│  Structuring pass — second LLM call          │
│  reads final markdown → structured JSON       │
│        │                                     │
│        ▼                                     │
│  Version-lock check vs entity                │
│    entity.version > scratchpad.startedAt?    │
│    YES → regenerate  │  NO → merge           │
└──────────────────────────────────────────────┘
```

## Data model

See `scratchpads` table in [AGENT_PIPELINE.md#data-model](AGENT_PIPELINE.md#data-model).

Per-entity merged state is materialized from the latest-merged per-run scratchpad via a Convex query — no separate table.

## Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Structuring pass drifts from scratchpad | Validator: every structured fact must cite a scratchpad assertion | Re-run structuring with stricter prompt |
| Entity version bumped during structuring | `entity.version > scratchpad.entityVersionAtStart` | Regenerate structuring against current state |
| Pipeline crash mid-run | Scratchpad persists | Resume reads existing sections, re-runs unfinished blocks only |
| Two parallel runs enrich same entity | Deterministic merge + version lock | Later-arriving run sees drift, regenerates |

## How to extend

To add a new section to the scratchpad template (e.g., when adding a block):

1. Add section heading to `server/pipeline/scratchpad/createScratchpad.ts` template
2. Add block-specific writer in `server/pipeline/blocks/<name>.ts`
3. Structuring pass picks it up automatically — no change needed there

## Related

- [AGENT_PIPELINE.md](AGENT_PIPELINE.md) — orchestrator that creates scratchpads
- [DILIGENCE_BLOCKS.md](DILIGENCE_BLOCKS.md) — blocks that write sections

## Changelog

| Date | Change |
|---|---|
| 2026-04-19 | Initial write-up of the write-revise-structure pattern |
