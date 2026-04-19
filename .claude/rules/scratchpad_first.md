# Scratchpad-First Pattern

Use this rule any time an agent produces structured output (diligence blocks,
reports, memos, summaries) that needs iteration + provenance + auditability.

## Mandate

**Agents write to a shared markdown scratchpad first, revise freely, then a
second LLM pass converts the final scratchpad to structured output.** Never
emit structured output in one shot.

## Prior art

- Anthropic — "Building Effective Agents" (scratchpad as working memory)
- Anthropic Claude Code — `CLAUDE.md` read-before / write-after pattern
- Manus AI — virtual workspace where agents iterate on a working document
- Cognition Devin — markdown notes file grows alongside the task
- Anthropic Opus 4.7 — "better at using file system-based memory"

## Protocol

1. **Create scratchpad on run start.** Per-run + per-entity. Empty template with
   named sections (one per diligence block or output section).
2. **Sub-agents write markdown, not JSON.** Free-form prose, bullets, cross-references.
3. **Agents may revise their own earlier writes.** The scratchpad is mutable until checkpoint.
4. **"Open questions" section is mandatory.** The agent lists its own uncertainties — never hides them.
5. **Checkpoint = budget hit OR agent reports confident OR user requests wrap.**
6. **Structuring pass runs after checkpoint.** A separate LLM call reads the final markdown and emits structured data with per-field source refs.
7. **Attribution merges structured data into entities.** Deterministic, sort-stable.
8. **The scratchpad persists** as the audit artifact of the run.

## Two-layer storage

| Layer | Lifecycle | Purpose |
|---|---|---|
| Per-run scratchpad | Created per query; persisted | Session panel reviews this; wrap-up merges into entity |
| Per-entity cumulative memory | Accumulates across all runs | The "running tally" — Reports grid shows this |

Like git — per-run = commits; per-entity = main branch state after merge.

## Version locking

- `scratchpad.entityVersionAtStart` snapshots the entity version at run start
- On merge, compare to current entity version
- If drifted → re-run structuring against current entity state, not stale

## What this rule enforces

- No `agent.generateStructuredOutput({ schema })` in one shot — must go through scratchpad
- Every fact in structured output has a `sourceRef` pointing back to its scratchpad section + span
- Scratchpad writes are atomic Convex mutations (so streaming UI works)
- Scratchpad is a first-class Convex table, not a transient memory structure

## UX invariants this supports

- Stream the scratchpad to UI as it grows (user sees progress)
- User can pause / wrap / revise mid-run
- Scratchpad is viewable by the user (transparency)
- Structuring pass runs in background; doesn't block the UI

## Anti-patterns

- Emitting JSON from a single giant prompt
- Using the model's in-context "chain of thought" as the scratchpad (non-durable)
- Dropping the "Open questions" section because it looks untidy
- Silently discarding the scratchpad after structuring (it's the audit trail)
- Single-layer (per-run only) without per-entity accumulation

## Related

- [orchestrator_workers.md](orchestrator_workers.md) — orchestrator owns the scratchpad
- [layered_memory.md](layered_memory.md) — scratchpad is layer 3 of 5
- [agent_run_verdict_workflow.md](agent_run_verdict_workflow.md) — verdict must derive from scratchpad state

## Canonical reference

`docs/architecture/SCRATCHPAD_PATTERN.md`
