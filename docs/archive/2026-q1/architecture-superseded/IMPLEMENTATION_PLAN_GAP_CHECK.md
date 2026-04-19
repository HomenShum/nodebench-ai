# Implementation Plan Gap Check — Designed vs Existing

Audit of what exists in the codebase vs what the four architecture addenda
proposed. Intent: stop designing, lock the delta, ship.

Addenda reviewed:
- `AGENT_PIPELINE.md` (implied, from thread)
- `SCRATCHPAD_PATTERN.md` (implied)
- `JIT_RETRIEVAL_LAYERED_MEMORY.md`
- `USER_FEEDBACK_SECURITY.md` (implied)
- `BACKGROUND_MODE_AND_RELIABILITY.md`

## Summary

| Status | Count | Meaning |
|---|---|---|
| ✅ **Exists — reuse** | 11 | Real substrate. Wire it up, don't rebuild. |
| 🟡 **Partial — extend** | 8 | Foundation there; needs specific additions. |
| 🔴 **Missing — build** | 10 | Genuinely new. Phase-1 work. |

**Biggest finding: ~65% of the designed pipeline is already in the codebase.**
The `ddEnhancedOrchestrator` IS our orchestrator-workers pattern. The
`agentScratchpads` table IS our scratchpad layer. The
`ProposalInlineDecorations` component IS our prosemirror decoration pattern.
The `EvidenceSpan` + `VerificationStatus` types ARE our evidence chip data
model. Our "new design" was largely naming and documenting what was already
built without a unifying doc.

---

## Gap matrix

### Orchestrator + sub-agents

| Design | Existing | Status | Delta |
|---|---|---|---|
| Orchestrator-workers pattern | `ddEnhancedOrchestrator.ts` (startEnhancedDDJob + executeEnhancedDDJob + branch determination) | 🟡 Partial | Rename to `diligenceOrchestrator`, formalize block contract, extract `blocks/` subdirectory |
| Sub-agent fresh context | `determineBranches()` + per-branch actions | ✅ Exists | Ensure each branch gets scoped tool allowlist (current unclear) |
| Budget envelope per sub-agent | Not found | 🔴 Missing | Add `AgentBudget` type + enforcement wrapper |
| Founder-specific pipeline | `founderHarnessOps.ts` with startEpisode/appendEpisodeSpan/finalize/get/list | ✅ Exists | Map "episode" → "run"; reuse the lifecycle API |

### Scratchpad + memory

| Design | Existing | Status | Delta |
|---|---|---|---|
| Per-run scratchpad | `agentScratchpads` table (line 4877) + `saveScratchpad` + `getByAgentThread` | ✅ Exists | Add `entityVersionAtStart` + drift-detection fields |
| Streaming scratchpad to UI | Server-side exists; no UI subscription | 🔴 Missing | Subscribe Chat UI via `useQuery(api.agentScratchpads.getByAgentThread)` — thin |
| Per-entity MEMORY.md index | Not found | 🔴 Missing | New table `entityMemoryIndex` |
| Per-entity topic files | Not found | 🔴 Missing | New table `entityMemoryTopics` keyed by `{entitySlug, blockType}` |
| JIT retrieval tools (glob/grep/read) | Not found (search tools exist generally) | 🔴 Missing | New tool wrappers scoped to entity memory |
| Compaction step (run → topic merge) | Not found | 🔴 Missing | New `compaction/mergeTopic.ts` + `compaction/updateIndex.ts` |
| Checked-in ENTITY.md | Not found | 🔴 Missing | `docs/entities/<slug>/ENTITY.md` convention |

### Evidence + confidence

| Design | Existing | Status | Delta |
|---|---|---|---|
| Confidence tiers (verified/corroborated/single-source/unverified) | `VerificationStatus = "verified" \| "partial" \| "unverified" \| "contradicted"` in `evidenceSpan.ts` | 🟡 Partial | Rename "partial" → "corroborated", add "single-source"; align everywhere |
| Evidence span data model | `EvidenceSpan` + `EvidenceManifest` (interfaces) + `createEvidenceSpans()` | ✅ Exists | Reuse as-is |
| `evidenceChecklist` validator | `convex/domains/research/narrative/validators.ts` with `hasFalsifiableClaim` | ✅ Exists | Extend per-block |
| `isGrounded()` filter | Used in `searchPipeline.ts` and `search.ts` | ✅ Exists | Re-export from a central `grounding/` module; reuse in every block |
| Evidence chip UI component | Not found (data exists; no chip) | 🔴 Missing | New `<EvidenceChip />` — inline tier + source + "see evidence" popover |
| Credibility-first default tiers | Not found (each block hard-codes its own) | 🔴 Missing | New `authority/defaultTiers.ts` per block |

### Observability + trace

| Design | Existing | Status | Delta |
|---|---|---|---|
| Agent trace events | `parallelTaskOrchestrator.ts` + span-based tracking | 🟡 Partial | Formalize `agentTraceEvents` table + hierarchical parent refs |
| Trace block in Chat UI | Not found (TelemetryInspector exists for benchmarks) | 🔴 Missing | New `<AgentTraceBlock />` live-subscribes to traceEvents by runId |
| Cost / token / latency rollup | Partial spans; no rollup | 🟡 Partial | Add rollup computation at orchestrator node |
| Trace drilldown (expand tool I/O) | Not found | 🔴 Missing | New — can defer to v1.5 |

### Background mode + async reliability

| Design | Existing | Status | Delta |
|---|---|---|---|
| Long-running background job | `founderHarnessOps.ts` episode lifecycle | ✅ Exists | Already async-friendly — just need UX toggle |
| 202 + runId fast path | Not explicit; job mutations exist | 🟡 Partial | Return runId immediately from start mutation — already does, needs contract |
| Idempotency key per run | Not found | 🔴 Missing | New `idempotencyKey = sha256(entitySlug + ingestHash + userId)` |
| Exponential backoff retry | Not centralized (scattered timeout handling) | 🟡 Partial | New `retry/exponentialBackoff.ts` wrapper; wrap tool calls |
| Scheduled long-horizon retry | `crons.ts` with daily/interval crons | 🟡 Partial | New table `scheduledRuns` with +12h/+24h/+48h pattern |
| Dead Letter Queue | `schema.ts` has a `deadLetters: number` field (line 5176) — counter only | 🟡 Partial | New `deadLetterQueue` table with fingerprint grouping + /admin view |
| Metrics + alerts | Partial via telemetry; no thresholds | 🟡 Partial | Formalize `server/monitoring/alerts.ts` |
| Partial-success UX | Not found | 🔴 Missing | New `<BackgroundRunStatus />` renders per-block result |
| `Running: N in background` top-bar chip | Not found | 🔴 Missing | New — thin component |
| Janitor for orphan runs | Not found | 🔴 Missing | New cron job |

### Session artifacts + wrap-up

| Design | Existing | Status | Delta |
|---|---|---|---|
| Session artifacts panel (right rail) | Not found (FastAgentPanel exists but different) | 🔴 Missing | New `<SessionArtifactsPanel />` |
| Wrap-up modal | Not found | 🔴 Missing | New `<SessionWrapUpModal />` |
| Promote/dismiss mutation | Not found | 🔴 Missing | New `sessionArtifacts.ts` mutations |
| Pending strip on Reports | Not found | 🔴 Missing | New `<PendingArtifactsStrip />` |

### Prosemirror + rendering

| Design | Existing | Status | Delta |
|---|---|---|---|
| Decoration-first agent output | `ProposalInlineDecorations.tsx` (proposal system) | ✅ Exists | Reuse pattern — rename to `DiligenceDecorationPlugin` for diligence context |
| Accept-to-convert (diff apply) | `useProposalSystem.ts` already implements accept/reject | ✅ Exists | Reuse; map "proposal" → "diligence block" |
| Prose-native block renderers | Not found (current output is card-based) | 🔴 Missing | New `renderers/<BlockType>Renderer.tsx` for each |
| Live collaborative editing (Tiptap + prosemirror-sync) | `UnifiedEditor.tsx` + `PmBridge.tsx` + `ShadowTiptap.tsx` | ✅ Exists | Decorations already safe with collab sync |

### Feedback system + security

| Design | Existing | Status | Delta |
|---|---|---|---|
| Basic feedback widget | `src/features/founder/components/FeedbackWidget.tsx` | ✅ Exists | Reuse input surface; add auto-draft layer |
| Auto-feedback drafts | Not found | 🔴 Missing | New `autoFeedback.ts` + draft generator |
| Feedback security controls (T1–T8) | Not found | 🔴 Missing | New `feedbackSanitize.ts` + rate limits + audit log |
| GitHub issue integration | Not found | 🔴 Missing | New server-owned PAT + issue API client |
| Preview-before-send UX | Not found | 🔴 Missing | New modal in `<AutoFeedbackPack />` |

### Me surface + founder trickle

| Design | Existing | Status | Delta |
|---|---|---|---|
| Me surface base | `MeHome.tsx` — "Your context" redesign shipped | ✅ Exists | Extend with founder section |
| Founder-trait detection | Not found | 🔴 Missing | New `useFounderTrait()` hook |
| Generate profile paths | Not found | 🔴 Missing | New section + two-path UX |
| Claude Code MCP copy prompt | `developers` page has install command; no Me-level MCP-connection signal | 🟡 Partial | Signal "MCP connected" as founder trait |

### Skills

| Design | Existing | Status | Delta |
|---|---|---|---|
| Skills directory | `.claude/skills/` has 3 skills (agent-run-verdict-workflow, flywheel-ui-dogfood, owner-mode-end-to-end) | ✅ Exists | Add `.claude/skills/diligence/` subdirectory |
| Description-first loading | Claude Code handles this natively | ✅ Exists | Author SKILL.md files with proper frontmatter |
| Skills for each diligence block | Not found | 🔴 Missing | New `skills/diligence/founder_extraction/SKILL.md` etc. |

### Routing + anonymous claim

| Design | Existing | Status | Delta |
|---|---|---|---|
| `/founder` smart routing | `/founder` currently redirects to home (no route) | 🔴 Missing | New route handler |
| Anonymous session persistence | `getAnonymousProductSessionId()` exists + `shares.ts` claim flow shipped | ✅ Exists | Reuse; surface at wrap-up |
| Gmail/GitHub OAuth claim | SignInForm.tsx exists | ✅ Exists | Reuse; trigger at wrap-up for anon |

---

## Revised Phase 1 — what to actually build

Phase 1 is now **focused integration work**, not ground-up:

### Week 1 — Foundation (mostly reuse)
1. Rename + formalize: `ddEnhancedOrchestrator` → `diligenceOrchestrator` with explicit `blocks/` subdirectory and block contract
2. Add `entityVersionAtStart` + drift-detection to `agentScratchpads` table
3. Add `idempotencyKey` + `status` enum to run lifecycle
4. Extract `grounding/` central module re-exporting `isGrounded()`
5. Add per-block `authority/defaultTiers.ts`
6. Unify `VerificationStatus` tier names across codebase (rename `partial` → `corroborated`, add `single-source`)
7. Architecture docs: `AGENT_PIPELINE.md`, `SCRATCHPAD_PATTERN.md`, `USER_FEEDBACK_SECURITY.md` (the three still un-written of the four addenda)
8. `.claude/rules/`: `orchestrator_workers.md`, `scratchpad_first.md`, `layered_memory.md`, `async_reliability.md`, `feedback_security.md`, `reference_attribution.md`

### Week 2 — UI substrate (new components, small)
9. `<EvidenceChip />` — inline tier + source chip
10. `<AgentTraceBlock />` — live trace tree in Chat
11. `<BackgroundRunsChip />` — top-bar running count
12. `<BackgroundRunStatus />` — partial-success UX
13. `<SessionArtifactsPanel />` + `<SessionWrapUpModal />` + `<PendingArtifactsStrip />`
14. Reuse `ProposalInlineDecorations` pattern → `DiligenceDecorationPlugin` for entity notebook

### Week 3 — Feedback + memory layer (new)
15. `entityMemoryIndex` + `entityMemoryTopics` Convex tables
16. Compaction step (`compaction/mergeTopic.ts` + `compaction/updateIndex.ts`)
17. JIT retrieval tools (`retrieval/jitTools.ts`)
18. Auto-feedback draft generator + security sanitizer + GitHub issue client
19. `<AutoFeedbackPack />` with preview-before-send
20. Skills for founder block: `.claude/skills/diligence/founder_extraction/SKILL.md`

### Week 4 — Reliability + polish
21. Formal `deadLetterQueue` table + grouping + `/admin` view
22. Exponential backoff retry wrapper + scheduled long-horizon retry
23. Metrics thresholds + alerts
24. Janitor cron for orphan runs
25. `/founder` smart routing + anonymous claim surfacing
26. `ENTITY.md` convention docs + first example
27. E2E smoke extensions for all surfaces

### Deferred to v2 (unchanged)
- Karpathy flywheel (trigger: 100 promotions + 20 rejection reasons)
- Rabbit-hole LLM detector
- Auto-emit memos default ON
- Glassdoor / X / PitchBook blocks
- Full code-indexing for founder profiles

---

## Critical invariants to preserve during integration

When unifying existing + designed code, do not regress:

1. `agentScratchpads` table already has real data — schema changes must migrate, never drop
2. `founderHarnessOps` existing mutations must stay backward-compatible — callers exist
3. `EvidenceSpan` + `VerificationStatus` used in production — rename is a migration, not a replace
4. `ProposalInlineDecorations` is in the editor — the pattern must not be forked, must be parameterized
5. `.claude/skills/` already loaded by Claude Code at session start — new skills must follow existing frontmatter convention

## Risk register

| Risk | Mitigation |
|---|---|
| Renames break existing callers (dd → diligence, partial → corroborated) | Ship renames behind type aliases first, migrate incrementally, remove old names last |
| Schema changes block deploys | Add new fields as optional; migrate data in background; remove old fields last |
| Agent scratchpad data format drift | Keep `version` field in scratchpad document; reader handles multiple versions |
| Prosemirror decoration pattern fork | Extract shared hook from `useProposalSystem`; both proposals + diligence use it |
| Skills frontmatter mismatch | Copy format from existing skills (agent-run-verdict-workflow etc.); validate in CI |

## Net effect

- Phase 1 is **4 weeks**, not 4 months
- ~65% reuse · ~25% extend · ~10% truly new
- No ground-up rebuilds
- Every new file has an existing sibling to learn from
