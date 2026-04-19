# JIT Retrieval & Layered Memory — Architecture Addendum

Extends `AGENT_PIPELINE.md` and `SCRATCHPAD_PATTERN.md` with Claude Code's proven
layered-filesystem memory model. Scratchpad is necessary but insufficient — the
pipeline also needs on-demand retrieval, topic-indexed persistence, compaction,
and skills.

## Prior art — Claude Code's layered persistence stack

Source: Anthropic docs (code.claude.com/docs/en/memory, /commands, /how-claude-code-works)
and Anthropic Engineering blog (effective-context-engineering-for-ai-agents).

| Layer | Purpose | NodeBench equivalent |
|---|---|---|
| `CLAUDE.md` (checked-in) | Persistent instructions, conventions, workflows | `ENTITY.md` — checked-in per-entity conventions (pin priorities, source allowlists) |
| `MEMORY.md` + topic files | Auto-written learnings; index loaded always, topics loaded on demand | `entityMemory.index` + `entityMemory.topics[block]` per entity |
| `SKILL.md` | Reusable procedure modules, description-first loading | `skills/diligence/*.md` — reusable extraction/verification patterns |
| Session transcripts (JSONL) | Rewind / resume / fork; compaction reinjects key sources | `runs.transcript` + compaction step post-run |
| Just-in-time retrieval | `glob`/`grep` the actual filesystem mid-run | `retrieveEntityMemory(entitySlug, query)` tool exposed to sub-agents |

**Key Anthropic insight:** the "sticky" feel isn't one backend — it's **model
adherence + layered file-based memory + cleaner startup context + better
compaction/reinjection**. Opus 4.7 specifically called out improved
file-system memory use across long multi-session work.

## The five-layer NodeBench memory stack

```
Layer 0 — ENTITY.md (checked-in, human-authored)
  Per-entity conventions: priorities, pinned sources, DO-NOT-TRUST list
  Example: docs/entities/acme-ai/ENTITY.md

Layer 1 — MEMORY.md index (auto, per-entity)
  One-line summaries of every topic file for this entity
  Always loaded when a run starts on this entity
  Example: /entities/acme-ai/MEMORY.md

Layer 2 — Topic files (auto, per-entity per-block)
  Full accumulated facts per diligence block
  Loaded JIT when the corresponding sub-agent runs
  Example: /entities/acme-ai/founder.md, /entities/acme-ai/funding.md

Layer 3 — Scratchpad (per-run, ephemeral→persisted)
  Current run's working memory; structured output derives from this
  Versioned; locked to entity version at run start

Layer 4 — Skills (shared, reusable)
  Description-first loading. Full body injected only when skill is relevant.
  Example: skills/diligence/founder_extraction/SKILL.md
```

## JIT retrieval contract (sub-agent tools)

Every sub-agent gets these read-only tools with **bounded read limits**
(maps to agentic_reliability.md:BOUND_READ):

```typescript
// Search pattern-match across topic files for this entity
glob_entity_memory(entitySlug, pattern): string[]   // e.g. "funding*"

// Full-text search across all topic files + prior scratchpads
grep_entity_memory(entitySlug, query, maxHits=20): Match[]

// Pull one topic file fully (capped at 50KB)
read_topic(entitySlug, topicName): string

// Pull last N runs' scratchpads for cross-run reasoning
read_recent_scratchpads(entitySlug, n=3): Scratchpad[]
```

**Invariant:** sub-agents never write directly to MEMORY.md or topic files.
Writes go through the compaction step (layer boundary).

## Compaction step (post-run)

Runs after `structureScratchpad` + `diligenceAttribution`:

1. **Diff** — compare structured output to existing topic file
2. **Merge** — deterministic, sort-stable merge of new facts into topic file
3. **Index update** — MEMORY.md gets updated one-liner per changed topic
4. **Archive** — raw scratchpad persisted with runId for audit; key learnings
   promoted to topic files
5. **Drift check** — if entity version advanced during structuring, re-run
   compaction against latest state

This matches Claude Code's pattern: raw session transcripts stay on disk, but
synthesized learnings get promoted to MEMORY.md.

## Machine-local vs shared (architectural note)

Claude Code auto-memory is **machine-local** by design. NodeBench is Convex-backed
(cloud shared), but we should preserve the same privacy boundary by default:

| Layer | Default scope | Opt-in escalation |
|---|---|---|
| ENTITY.md | Team-shared (checked into repo) | n/a |
| MEMORY.md + topics | Per-user / per-session by default | User can mark as team-visible |
| Scratchpad | Per-run, ephemeral | User keeps via wrap-up |
| Skills | Shared (repo-level) | n/a |
| Transcripts | Per-user | Explicit share |

## File additions to Phase 1

```
convex/schema.ts                                    + entityMemory tables (index + topics)
convex/domains/product/entityMemory.ts              NEW — CRUD + JIT retrieval queries
server/pipeline/retrieval/jitTools.ts               NEW — glob/grep/read/recent for sub-agents
server/pipeline/compaction/compactRun.ts            NEW — post-structure compaction
server/pipeline/compaction/mergeTopic.ts            NEW — deterministic topic merge
skills/diligence/README.md                          NEW — skill authoring guide
skills/diligence/founder_extraction/SKILL.md        NEW — first reusable skill
docs/architecture/JIT_RETRIEVAL_LAYERED_MEMORY.md   THIS FILE
.claude/rules/layered_memory.md                     NEW — enforces layer boundaries
```

## Invariants (to codify in .claude/rules/layered_memory.md)

1. Sub-agents never directly write to MEMORY.md or topic files — compaction owns that boundary.
2. JIT retrieval tools are **read-only** and **size-bounded**.
3. Every topic-file write is deterministic (sort-stable merge).
4. Compaction is idempotent — running twice produces the same state.
5. MEMORY.md index is regenerable from topic files; it is a cache, not a source of truth.
6. Machine-local privacy by default — escalation to team-shared is explicit opt-in.
7. Every new skill must have a description-first header so the orchestrator can decide when to load it.

## References

- Anthropic: How Claude remembers your project — code.claude.com/docs/en/memory
- Anthropic: Commands & Skills — code.claude.com/docs/en/commands
- Anthropic: How Claude Code works — code.claude.com/docs/en/how-claude-code-works
- Anthropic Engineering: Effective context engineering for AI agents
- Anthropic: Claude Opus 4.7 release notes (file-system memory improvements)

## Comparison matrix — for the repo-as-reference goal

| Capability | Manus AI | Cursor | Claude Code | NodeBench (this design) |
|---|---|---|---|---|
| Shared scratchpad | ✅ virtual workspace | partial (composer) | ✅ session transcript | ✅ per-run scratchpad |
| Topic-indexed memory | ❌ | ❌ | ✅ MEMORY.md + topics | ✅ entityMemory |
| Checked-in conventions | ❌ | ✅ .cursorrules | ✅ CLAUDE.md | ✅ ENTITY.md |
| Reusable skills | ❌ | partial | ✅ SKILL.md | ✅ skills/diligence/* |
| JIT retrieval | partial | ✅ codebase | ✅ glob/grep | ✅ glob/grep/read equivalents |
| Compaction | ✅ | ❌ | ✅ | ✅ |
| Multi-entity, multi-run | ❌ (task-scoped) | ❌ (workspace-scoped) | partial (project-scoped) | ✅ (entity + run + session) |

NodeBench aims to sit at the intersection — Claude Code's layered file-based
persistence + Manus's scratchpad streaming + Cursor's checked-in conventions —
applied to the diligence-block domain rather than code.
