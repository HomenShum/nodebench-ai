# NodeBench Unified Eval Program — Three Lanes, One Scorecard

> Status: v1, 2026-04-21. Owner: hshum.
> Supersedes individual eval docs that only covered answer quality.

One shared scenario catalog. One runtime under test. Three evaluation lanes. One release scorecard.

```
                     NODEBENCH EVAL PROGRAM

           ┌─────────────────────────────────────┐
           │ Shared scenario catalog             │
           │  - Lane A: UX / accessibility       │
           │    → fast-slow-ui-ux-cases.csv      │
           │  - Lane B: concurrency / cache      │
           │    → fast-slow-concurrency-cases.csv│
           │  - Lane C: answer / report quality  │
           │    → fast-slow-eval-cases-v2.csv    │
           └─────────────────────────────────────┘
                              |
                              v
        ┌─────────────────────┼─────────────────────┐
        v                     v                     v

┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
│ Lane A — UX / A11y │ │ Lane B — Load /    │ │ Lane C — Quality   │
│ Playwright flows,  │ │ Cache / Cost       │ │ LLM-judge + det.   │
│ axe/Lighthouse,    │ │ k6/artillery,      │ │ gates, boolean +   │
│ screen recorder,   │ │ metrics on CSL/    │ │ rationale per case │
│ boolean + rationale│ │ ESL hit rates,     │ │                    │
│ on 6 core gates    │ │ privacy audit      │ │                    │
└────────────────────┘ └────────────────────┘ └────────────────────┘
        |                     |                     |
        └─────────────────────┼─────────────────────┘
                              v

              ┌──────────────────────────────────┐
              │ Unified release scorecard        │
              │  ux_readiness: PASS|FAIL         │
              │  load_readiness: PASS|FAIL       │
              │  quality_readiness: PASS|FAIL    │
              │  top_10_failure_clusters         │
              │  cost_and_cache_summary          │
              │  demo_ready: PASS|FAIL           │
              │  production_ready: PASS|FAIL     │
              └──────────────────────────────────┘
```

---

## Lane A — Actual usage + accessibility

**Answers:** *Can a real person on a phone actually use this product end-to-end, without confusion, dead ends, inaccessible controls, or hidden state?*

### Surfaces under test (mobile IA)
- `Home` — daily entry, pulse, recent artifacts
- `Reports` — saved artifact list + detail
- `Chat` — primary input, thread detail (Conversation, Steps, Artifacts, Files tabs)
- `Inbox` — action required vs updates
- `Me` — profile, files, settings

### 14 real-world task flows (TF01–TF14)
Each flow evaluated on ≥3 device/persona combos. See `fast-slow-ui-ux-cases.csv` for the full 35-case corpus.

| TF | Flow |
|---|---|
| TF01 | Cold start, understand where to start |
| TF02 | Quick company ask from Chat |
| TF03 | Handle ambiguous prompt (e.g. "Vitalize") |
| TF04 | Open resulting artifact from a run |
| TF05 | Switch Notebook ↔ Report in artifact |
| TF06 | Navigate thread detail tabs |
| TF07 | Open Steps and understand current run |
| TF08 | Open Files tab and view attachment |
| TF09 | Inbox — distinguish Action Required vs Updates |
| TF10 | Open Pulse / daily brief |
| TF11 | Upload file, verify it lands in Me > Files |
| TF12 | Reopen recent artifact from Home or Reports |
| TF13 | Share / export a report |
| TF14 | Return to same thread/artifact after backgrounding |

### Core gates (boolean + rationale per case)
1. `task_completed` — user reached the expected_terminal_state without giving up
2. `navigation_clear` — at every step the user knew what to do next without explanation
3. `artifact_discoverable` — when the run produced an artifact, the user found it
4. `thread_to_artifact_transition_clear` — user understood that the artifact is a durable product of the thread, not a separate object
5. `a11y_blocker_absent` — no severe accessibility blocker (missing accessible name, keyboard trap, unreadable contrast, screen-reader silence)
6. `overall_ux_gate_pass` — all of the above pass

### Supplementary a11y gates (tracked per case)
`keyboard_composer_usable`, `reduced_motion_respected`, `contrast_ok_both_themes`, `touch_targets_sufficient`, plus axe/Lighthouse violation counts (zero critical required).

### Instrumentation
- Playwright script per TF × persona × device matrix
- Screen recordings published to `public/dogfood/` via existing pipeline
- axe-core run per route; Lighthouse run per surface
- Console error count captured per case; any >0 blocks `overall_ux_gate_pass`

### Demo-ready bar
All TF01–TF14 complete on iPhone Safari + Android Chrome with zero severe a11y blocker on Chat, Reports/Artifact, Inbox.

---

## Lane B — 100 concurrent users with overlap, not duplication

**Answers:** *Can we stay responsive and cost-efficient when many users ask similar questions that share public context but not identical jobs — without leaking private state?*

### Cache taxonomy under test
```
Shared public cache
  CSL — canonicalSources (URL × fetch_day → body)
  ESL — extractedSignals (entity × signalType × day → fact)
  entitySummaries — denormalized canonical entity cards
Workspace / tenant cache (if enabled)
  orgSharedContext — org-private overlays
User-private cache (USL)
  private files, notes, accepted notebook/report blocks
Session / run ephemeral
  scratchpad, in-flight tool results, candidate entities
```

### Four load profiles (20-case corpus in `fast-slow-concurrency-cases.csv`)
| Profile | Shape |
|---|---|
| P1 — Conference hot burst | 100 users, 10 min, 10–20 entities, public-heavy, 100% fast |
| P2 — Mixed fast lane | 100 users, 15 min, 70% fast new + 20% followup + 10% reopen |
| P3 — Mixed deep lane | 100 users, 60 min, 20–30 deep runs over overlapping themes |
| P4 — Prolonged usage | 100 users, hours–days, sessions per user, pulse updates, reopens |

### Core gates (per scenario)
1. `shared_public_cache_hit_rate` — meets target in the row (P1 hot-burst targets ≥95%)
2. `singleflight_suppression` — concurrent duplicates collapse to one fetch + many waiters
3. `coalesced_run_attach_count` — identical slow-runs collapse to one run with N viewers
4. `time_to_first_useful_answer_p95` — within latency_budget column
5. `queue_wait_time_p95` — fair scheduling; no starvation
6. `cross_scope_leak_absent` — private scratchpad / USL content never appears in another user's response
7. `private_source_not_exposed` — user-uploaded files and org-private connector data never cached globally
8. `cost_per_hot_entity_declining` — 2nd+ requests for the same hot entity cost materially less than the 1st
9. `honest_backoff_under_burst` — upstream 429 surfaces as a 429 or visible banner, never silent queue
10. `fast_not_blocked_by_slow` — fast lane p95 unchanged when deep lane is saturated
11. `overall_load_gate_pass` — all P0 above

### Cache observability required
New Convex tables + panels:
- `canonicalSourcesStats`, `extractedSignalsStats` — hit/miss/size over time
- `singleflightWaiters` — concurrent waiters per in-flight fetch
- `coalescedRuns` — attach count per run
- `crossScopeViolations` — privacy audit log (must remain empty)

### Demo-ready bar
P1 hot-burst: fast p95 ≤ 2s for cached hot entities, CSL+ESL hit ≥95%, zero privacy leak, zero silent failure.

---

## Lane C — Answer / report / artifact quality

**Answers:** *Are the answers, reports, and progressive artifacts correct, grounded, useful, and appropriately durable?*

### Catalog
`fast-slow-eval-cases-v2.csv` — 70 cases (F01–F40 fast, S01–S40 slow) across 25 primary categories.

### 9 core gates per case (boolean + rationale pairs)
`entity_correct`, `grounded_to_sources`, `factually_accurate`, `no_hallucinations`, `actionable`, `latency_within_budget`, `artifact_decision_correct`, `memory_first`, `tool_ordering_correct`. See `fast-slow-eval-template.md`.

### Added dimension: `shared_context_reuse_quality` (new)
Did the runtime correctly prefer artifact/cached public context before fresh search? Tracked separately, informs `memory_first` rationale.

### Judge stack (unchanged — still the right shape)
1. Deterministic gates (HONEST_STATUS, BOUND, TIMEOUT, SSRF, DETERMINISTIC)
2. LLM semantic judge (Gemini 3.1 Flash Lite preview, with Pro every 4 runs)
3. Browser/video/screenshot dogfood (Playwright + Gemini vision)
4. Load / capacity — covered by Lane B
5. External benchmark lanes — SWE-bench Verified, BFCL v3, GAIA, MCP-AgentBench for the slow runtime
6. Production telemetry (post-ship)

### Demo-ready bar
All applicable P0 gates pass on F01–F40 and S01–S40 at ≥90% case-pass rate; zero `artifact_decision_correct` failures; zero `no_hallucinations` P0 fails.

---

## Sequencing (recommended build order)

1. **Quality lane first** — because answer and artifact-decision quality is still the gating trust issue.
2. **Concurrency lane second** — because it changes cost and speed materially for conference/demo load.
3. **UX/a11y lane continuously** — it must validate every mobile + drawer surface change as refactors land.

---

## Gemini Deep Research — specialist slow-worker adapter

Per the Gemini API Deep Research docs (April 2026): Interactions API only, background-first, supports collaborative planning + streaming + visualization + remote MCP + file_search. **No structured outputs.** 60-min max research time, most tasks ≤20 min. Two model variants: `deep-research-preview-04-2026` (interactive/efficient) and `deep-research-max-preview-04-2026` (comprehensive background).

### Architecture placement
```
Convex                  = durable truth + run/control plane
Vercel AI SDK           = streaming UI surface
LangGraph / worker.ts   = deep-run execution spine
GoogleDeepResearchWorker = ONE specialized slow-worker adapter
Notebook / Report       = durable artifact the user keeps
Answer-control pipeline = universal gate before anything saves
```

**Hard rule:** Gemini Deep Research may gather and draft. NodeBench still decides what is true enough to save. Raw Gemini output never writes directly to canonical artifact state — it passes through claim extraction → gating → truth compiler → action compiler first.

### ProviderWorker contract (new)

```ts
type ProviderWorker = {
  name: "openai" | "google" | "anthropic" | "openrouter";
  workerType: "fast_text" | "deep_research" | "planner" | "browser" | "coder";
  canStream: boolean;
  backgroundOnly?: boolean;
  supportsCollaborativePlanning?: boolean;
  supportsVisualization?: boolean;
  supportsRemoteMcp?: boolean;
  supportsFileSearch?: boolean;
  supportsStructuredOutput?: boolean;
  invoke(input: WorkerInput): Promise<WorkerOutput>;
  stream?(input: WorkerInput): AsyncIterable<WorkerEvent>;
};
```

### GoogleDeepResearchWorker capability flags
- `canStream: true`
- `backgroundOnly: true` (requires `store=True`)
- `supportsCollaborativePlanning: true`
- `supportsVisualization: true`
- `supportsRemoteMcp: true`
- `supportsFileSearch: true`
- `supportsStructuredOutput: false`

### Where it fits in NodeBench
| Profile | Default use | Model |
|---|---|---|
| Fast | **never** — too slow, background-only | n/a |
| Slow (interactive) | eligible; planner may select | `deep-research-preview-04-2026` |
| Slow (background, heavy synthesis) | preferred for pulse + overnight refresh | `deep-research-max-preview-04-2026` |
| Pulse | strong candidate when public-source-heavy | `deep-research-max-preview-04-2026` |

Forbidden uses: hot-path fast chat; anywhere structured output is required downstream; anywhere save/update logic depends on provider-native contracts.

### Runtime flow
```
User asks in Chat
  → Convex creates session + run; planner selects slow/deep path
  → If category is good Gemini-DR fit AND no private-artifact reuse required:
       → GoogleDeepResearchWorker.invoke({ mode: "interactive" })
       → persist interactionId + lastEventId in run state
  → stream thought/progress deltas → productRunEvents → UI runtime panel
  → if stream drops: fall back to polling interactions.get() with lastEventId resume
  → on complete:
       → raw outputs (text, images, tool calls) land as evidence inputs
       → NodeBench claim-extraction runs
       → claim-level gating (grounded, factually-accurate, no-hallucinations)
       → truth compiler + action compiler
       → ONLY THEN artifact state updates
  → visualization images stored as FileAssets linked to run/artifact
```

### Collaborative planning flow
```
User requests deep run on ambiguous/expensive topic
  → GoogleDeepResearchWorker.invoke({ collaborative_planning: true })
  → returns proposed plan (not execution) in ≤30s
  → plan surfaced in Steps tab / runtime panel
  → user edits, approves, or asks refinements
  → on approve: continue with previous_interaction_id
  → full research executes
```

Demo value: transparent planning before expensive job.

### Follow-up continuity
After a finished deep-research run, follow-up questions use `previous_interaction_id`. Maps to NodeBench thread model cleanly — same thread, same artifact family, deepening over time.

### Gemini-specific eval lane (new sub-lane in Lane C)
Adds cases beyond S40. Append to v2 CSV as G01–G10:

| id | category | scenario |
|---|---|---|
| G01 | gdr_interactive | Deep run via `deep-research-preview-04-2026`; quality-parity vs NodeBench-native slow on same query |
| G02 | gdr_background_pulse | Nightly pulse via `deep-research-max-preview-04-2026` for 10 watched entities |
| G03 | gdr_collaborative_planning | Plan-first run; user refines plan; approves; executes |
| G04 | gdr_visualization | Request "research with chart"; verify image delta streams and lands as FileAsset |
| G05 | gdr_remote_mcp | Remote MCP server exposed to Gemini-DR; verify tool restriction honored |
| G06 | gdr_file_search | Private uploaded PDF as source; verify file_search usage + privacy |
| G07 | gdr_stream_resume | Deliberately drop stream mid-run; verify resume via lastEventId |
| G08 | gdr_followup | Run deep research; ask follow-up; verify previous_interaction_id continuity |
| G09 | gdr_fallback | Primary NodeBench slow worker fails; fallback to Gemini-DR; quality caveat emitted |
| G10 | gdr_answer_control | Gemini-DR output contains unsupported claim; NodeBench gating blocks save; artifact stays draft |

Each scored against the 9 v2 core gates + Gemini-specific supplementary gates:
- `collaborative_plan_quality` — plan covered all expected categories
- `streamed_progress_useful` — progress summaries informed UI in real time
- `visualization_useful` — generated images earned their place vs filler
- `remote_mcp_tool_correct` — MCP tool used as specified with restriction honored
- `followup_continuity` — previous_interaction_id threaded correctly
- `answer_control_held` — NodeBench gate blocked unsupported Gemini claims before save

### Implementation checklist
1. Add `GoogleDeepResearchWorker` in `convex/domains/agents/adapters/google/` with capability flags above
2. Add `ProviderWorker` abstraction in `convex/domains/agents/adapters/types.ts`
3. Persist `interactionId`, `lastEventId`, `status`, `modelVariant` in `agentRuns` table
4. Map Gemini progress/thought/image deltas into existing `productRunEvents` schema
5. Wire reconnect + resume via `interactions.get` polling fallback
6. Enforce: Gemini-DR outputs gated by answer-control pipeline before any artifact write
7. Router gating: fast profile must not reach Gemini-DR; enforce at call site
8. Visualization images → `FileAsset` linked to run and artifact
9. Add G01–G10 to `fast-slow-eval-cases-v2.csv`; implement runners
10. Add L10/L11/L19 concurrency scenarios (already in concurrency CSV) to Lane B runner

---

## Shared scorecard

Per release candidate, emit one JSON + one markdown:

```json
{
  "release": "2026-W17-rc1",
  "lane_a_ux_readiness": "PASS",
  "lane_b_load_readiness": "PASS",
  "lane_c_quality_readiness": "PASS",
  "gemini_deep_research_lane": "PASS",
  "top_failure_clusters": [...],
  "cost_cache_summary": {
    "hot_entity_hit_ratio": 0.96,
    "singleflight_suppression_ratio": 0.78,
    "avg_cost_per_answer_usd": 0.003,
    "avg_cost_per_deep_run_usd": 0.42
  },
  "demo_ready": true,
  "production_ready": false,
  "production_blockers": [...]
}
```

`demo_ready = all three lanes + Gemini lane PASS on applicable P0`. `production_ready` additionally requires: 7-day prolonged-usage pass, zero privacy violations across 10k+ sessions, cost envelope under budget at forecast DAU.

---

## Files

- `docs/architecture/fast-slow-ui-ux-cases.csv` — Lane A corpus
- `docs/architecture/fast-slow-concurrency-cases.csv` — Lane B corpus
- `docs/architecture/fast-slow-eval-cases-v2.csv` — Lane C corpus
- `docs/architecture/fast-slow-eval-template.md` — gate definitions, applicability matrix
- `docs/architecture/FAST_SLOW_RUNTIME_SPEC.md` — runtime design, CSL/ESL/USL, artifact states
- `docs/architecture/EVAL_PROGRAM_THREE_LANES.md` — this doc

## Rule references
- `.claude/rules/agentic_reliability.md` — BOUND, HONEST_STATUS, TIMEOUT, SSRF
- `.claude/rules/scenario_testing.md` — 6W structure
- `.claude/rules/grounded_eval.md` — 4-layer grounding
- `.claude/rules/qa_dogfood.md` — surface-level dogfood
- `.claude/rules/gemini_qa_loop.md` — Gemini vision QA loop
- `.claude/rules/agent_run_verdict_workflow.md` — verdict + artifact_decision_correct
- `.claude/rules/async_reliability.md` — partial_success, idempotency, background fast path, DLQ
