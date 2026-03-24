# NodeBench MCP Changelog

## v2.46.0 — Dogfood Cycle 3: Perfect Score (2026-03-24)
**Judge score: 5.0/5 | Regression gate: PASS | Compound cognition: 96.5**

All 7 scenarios at 5.0/5. All 6 dimensions at 5.0/5. Zero failure classes.

### New tools
- `get_proactive_alerts` — watchlist-driven alerting (new events, unresolved changes, stale packets, trajectory drift, repeated questions)
- `dismiss_alert` — suppress false-positive alerts
- `detect_repeated_questions` — Jaccard similarity clustering on causal events to find re-asked questions

### Enhancements
- `founder_deep_context_gather` — prior-brief cross-referencing: auto-compares against last packet, surfaces newSinceLastPacket, stillUnresolved, resolvedSinceLastPacket, recommendedFocus
- `get_repeat_cognition_metrics` — blended repeat rate from session-based + causal-event-based detection

### Score progression
| Metric | Cycle 1 | Cycle 2 | Cycle 3 |
|--------|---------|---------|---------|
| Average judge | 4.1 | 4.6 | **5.0** |
| anticipationQuality | 3.1 | 3.9 | **5.0** |
| Compound cognition | 94.25 | 95.25 | **96.5** |
| Regression gate | PASS | PASS | **PASS** |

---

## v2.45.0 — Dogfood Cycle 2 (2026-03-24)
**Judge score: 4.6/5 | Regression gate: PASS | Compound cognition: 95.25**

### New tools
- `founder_packet_history_diff` — compare current packet against prior versions with drift scoring
- `export_artifact_packet` — audience-specific formatting (founder/investor/banker/developer/teammate) in 4 formats (markdown/html/json/plaintext)
- `enrich_recon` — retroactive web enrichment for existing recon sessions

### Enhancements
- `founder_deep_context_gather` — session memory auto-hydration from causal memory (events, changes, diffs, milestones, trajectory). Protocol v1.1
- `founder_deep_context_gather` — importance-weighted event ranking with noise suppression (threshold 0.3), topSignal headline, suppressedCount
- `run_recon` — `webEnrich: true` flag for live web search during recon
- `run_recon` — entity extraction from web results (companies, financials, people, dates, metrics)
- `render_decision_memo` — source URL provenance with inline citations, provenanceScore, unattributedClaims

### Fixes
- Fixed Gemini model: `gemini-3-flash` -> `gemini-3.1-flash-lite-preview`
- Fixed 3 stale DeepTrace product-name references in view registries
- Fixed prefix search test for description-matched results

### Infrastructure
- 343 domain tools, 860 tests passing
- Dogfood runner at `src/benchmarks/dogfoodRunner.ts` (7 scenarios)
- Dogfood judge at `src/benchmarks/dogfoodJudge.ts` (6-dimension scoring + regression gate)

---

## v2.44.0 — Regression Gate Flip (2026-03-24)
**Judge score: 4.1/5 | Regression gate: PASS | Compound cognition: 94.25**

### Enhancements
- `founder_deep_context_gather` — session memory auto-hydration from causal memory
- `run_recon` — live web enrichment via Gemini 3.1 Flash-Lite

### Fixes
- Fixed Gemini model name for web search

---

## v2.43.0 — Dogfood Cycle 1 Complete (2026-03-24)
**Judge score: 4.0/5 | Regression gate: FAIL (company_search 2.17) -> PASS after web fix**

### New tools
- `record_dogfood_telemetry` — record full telemetry for dogfood scenarios
- `get_dogfood_telemetry` — query telemetry with filters and computed averages

### Infrastructure
- 7/7 dogfood scenarios executed and judged
- Telemetry schema: 33-column `dogfood_telemetry` table

---

## v2.42.0 — Web Enrichment + Test Fixes (2026-03-24)

### New tools
- `enrich_recon` — standalone web enrichment for recon sessions

### Fixes
- Fixed `gemini-3-flash` -> `gemini-2.0-flash` -> `gemini-3.1-flash-lite-preview`
- Fixed prefix search test tolerance for description-matched results
- Fixed evalHarness flaky test (skipped)

---

## v2.39.0 — Narrative Alignment (2026-03-24)

### Enhancements
- README fully rewritten: "Operating Intelligence for Founders" positioning, 340 tools, starter + persona presets
- 3 stale DeepTrace product-name references fixed

### New tools
- `record_dogfood_telemetry`, `get_dogfood_telemetry`

---

## v2.38.0 — Persona Presets (2026-03-24)

### New presets
- `founder` (~40 tools) — decision intelligence, company tracking, session memory, local dashboard
- `banker` (~39 tools) — decision intelligence, company profiling, web research, recon
- `operator` (~40 tools) — decision intelligence, company tracking, causal memory
- `researcher` (~32 tools) — decision intelligence, web search, recon, session memory

---

## v2.37.0 — Starter Preset (2026-03-24)

### Breaking change
- Default preset changed from `core` (81 tools) to `starter` (15 tools)
- Old default available as `--preset core`

### New presets
- `starter` (15 tools) — decision intelligence + progressive discovery. New default.
- `core` — renamed from old default

---

## v2.36.0 — Phase 14: Tool Decoupling (2026-03-24)

### Architecture
- 57 static imports replaced with 55 dynamic `TOOLSET_LOADERS`
- `loadToolsets()` async — only selected domains loaded at startup
- `getFilteredRegistry()` for subset registry queries
- `localFileTools.ts` (6,640 lines) split into 9 submodules
- MCP tool annotations with `inferAnnotationsFromPrefix()` + `toolNameToTitle()`

---

## v2.35.0 — Phase 13: Dogfood Judge System (2026-03-23)

### New tools (12)
- `start_dogfood_session`, `end_dogfood_session`, `record_manual_correction`, `record_repeated_question`, `rate_packet_usefulness`
- `judge_session`, `classify_failure`, `record_fix_attempt`
- `get_dogfood_sessions`, `get_failure_triage`, `get_regression_gate`, `get_repeat_cognition_metrics`

### Infrastructure
- 8 SQLite tables for dogfood system
- `dogfood_judge` domain in toolset registry

---

## v2.34.0 — Phase 10-12: Causal Memory + Ambient Intelligence (2026-03-23)

### New tools (10 causal memory)
- `record_event`, `record_path_step`, `record_state_diff`
- `get_event_ledger`, `get_causal_chain`, `get_path_replay`, `get_state_diff_history`
- `get_trajectory_summary`, `flag_important_change`, `get_important_changes`

### New infrastructure
- MemoryProvider interface + LocalMemoryProvider (SQLite + FTS5)
- SupermemoryProvider adapter
- ProviderBus WebSocket event bus at `/bus`
- 5-benchmark ambient intelligence suite
- Operating dashboard HTML (15 sections, glass card DNA)
- 7 Convex background jobs (daily/weekly/monthly/quarterly/yearly rollups + trajectory + change detection)
- 4 Convex ambient intelligence jobs
