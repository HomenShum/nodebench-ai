# Layered Memory (Claude Code Pattern, Applied to Entities)

Use this rule when designing or extending the agent's persistent memory across
runs. Applies to diligence blocks, entity reports, and any cross-session
accumulation.

## Mandate

**Five layers, clear boundaries, JIT retrieval.** Claude Code's proven
file-based persistence stack, adapted to the per-entity domain.

## Prior art

- Anthropic Claude Code — `CLAUDE.md` · `MEMORY.md` · topic files · SKILL.md · session transcripts · glob/grep JIT retrieval
- Anthropic Engineering blog — "Effective context engineering for AI agents"
- Anthropic Opus 4.7 release — "better at using file system-based memory"
- Manus AI — virtual workspace streaming
- Cursor — `.cursorrules` checked-in conventions

## The five layers

```
Layer 0 — ENTITY.md (human-authored, checked-in)
  Per-entity conventions: priorities, pinned sources, DO-NOT-TRUST list.
  Power-user opt-in, not mandatory setup.

Layer 1 — MEMORY.md index (auto-written, per-entity)
  One-line summary of every topic file. Always loaded when a run starts.

Layer 2 — Topic files (auto-written, per-entity per-block)
  Accumulated facts per block. Loaded JIT when the sub-agent runs.

Layer 3 — Scratchpad (per-run, ephemeral → persisted)
  Current run's working memory; structured output derives from this.

Layer 4 — Skills (shared, reusable, description-first loading)
  Claude Code loads based on the skill's `when:` trigger.
```

## JIT retrieval contract (sub-agent tools)

```typescript
glob_entity_memory(entitySlug, pattern): string[]   // e.g. "funding*"
grep_entity_memory(entitySlug, query, max=20): Match[]
read_topic(entitySlug, topicName): string            // capped at 50KB
read_recent_scratchpads(entitySlug, n=3): Scratchpad[]
```

**Invariants:** all size-bounded (`BOUND_READ`), all read-only.

## Write-path invariant

**Sub-agents NEVER write to MEMORY.md or topic files directly.** Writes go
through the compaction step, which is the layer boundary owner.

Compaction happens post-structuring:
1. Diff — compare structured output to existing topic file
2. Merge — deterministic, sort-stable
3. Index update — MEMORY.md one-liner refreshed per changed topic
4. Archive — raw scratchpad persisted for audit
5. Drift check — if entity version advanced during structuring, re-run

## Privacy boundary

| Layer | Default scope | Opt-in escalation |
|---|---|---|
| ENTITY.md | Team-shared (checked into repo) | n/a |
| MEMORY.md + topics | Per-user / per-session | User can mark team-visible |
| Scratchpad | Per-run ephemeral | User keeps via wrap-up |
| Skills | Shared (repo-level) | n/a |
| Transcripts | Per-user | Explicit share |

Default posture: machine-local / per-user. Escalation is explicit.

## What this rule enforces

- No parallel persistence paths — all write-through compaction
- MEMORY.md is a cache regenerable from topic files (not a source of truth)
- Compaction is idempotent (running twice = same state)
- Every topic merge is deterministic (sort-stable keys)
- Every read from the JIT tools is size-bounded

## Anti-patterns

- Sub-agents mutating MEMORY.md directly (violates layer boundary)
- Topic merges using `JSON.stringify` without sorted keys (non-deterministic)
- Compaction that overwrites without diffing (data loss on drift)
- Loading every topic file on every run (defeats JIT)
- Treating MEMORY.md as the source of truth (it's a regenerable cache)

## Related

- [scratchpad_first.md](scratchpad_first.md) — layer 3 details
- [orchestrator_workers.md](orchestrator_workers.md) — how sub-agents use JIT retrieval
- [agentic_reliability.md](agentic_reliability.md) — BOUND_READ and DETERMINISTIC
- [reference_attribution.md](reference_attribution.md) — cite Claude Code in module headers

## Canonical reference

`docs/architecture/SCRATCHPAD_PATTERN.md` (per-run scratchpad) ·
`docs/architecture/AGENT_PIPELINE.md` (full picture)

See also archived `docs/archive/2026-q1/architecture-superseded/JIT_RETRIEVAL_LAYERED_MEMORY.md`
for the earlier draft of this pattern.
