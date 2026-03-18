# Unified Temporal Agentic OS

> Master architecture for NodeBench's convergence into a single temporal-first operating system spanning enterprise QA, career gamification, probabilistic forecasting, and autonomous content pipelines.

---

## 1. Vision

NodeBench began as an MCP tool server. It has since grown into a full-stack agentic platform with 235+ tools, 7-agent newsroom, forecasting engine, Oracle gamification layer, and enterprise-grade observability. These subsystems evolved independently and now share overlapping temporal primitives (time-series tables, signal ingestion, evidence indexing, OTel traces).

**The Unified Temporal Agentic OS** collapses these into one coherent architecture with four layers:

```
+---------------------------------------------------------------+
|  Layer 4: Thompson Flywheel                                   |
|  Newsroom pipeline, LinkedIn adapter, content publish,        |
|  Feynman Editor, zero-draft artifacts                         |
+---------------------------------------------------------------+
|  Layer 3: Dual-Facing Interface                               |
|  Oracle (builder gamification) | Control Tower (institutional)|
|  Forecast Cockpit | Video QA | SpecDoc API                    |
+---------------------------------------------------------------+
|  Layer 2: Execution Harness                                   |
|  Self-healer, checkpointing, sandbox, 235+ tool registry,    |
|  WebMCP, delivery queue, audit trails, engine context bridge  |
+---------------------------------------------------------------+
|  Layer 1: Temporal Substrate                                  |
|  Time-series tables, forecasting, signal ingestion,           |
|  evidence indexing, OTel traces, API cost tracking, TSFM      |
+---------------------------------------------------------------+
```

**One substrate. Two faces. Continuous flywheel.**

The builder sees a gamified quest system that tracks drift, cost, and quality. The enterprise sees a headless QA API that produces verdicts with evidence packs. Both read from the same temporal substrate. Both feed the Thompson flywheel that turns observations into forecasts into content into new observations.

---

## 2. The Four Layers

### Layer 1: Temporal Substrate

The foundation. All data is temporal-first: every observation has a timestamp, every signal has a window, every causal chain has a direction.

#### What exists today

| Component | Location | Status |
|-----------|----------|--------|
| `timeSeriesObservations` | `convex/schema.ts` (line ~55) | Deployed |
| `timeSeriesSignals` | `convex/schema.ts` (line ~56) | Deployed |
| `causalChains` | `convex/schema.ts` (line ~57) | Deployed |
| `zeroDraftArtifacts` | `convex/schema.ts` (line ~58) | Deployed |
| `proofPacks` | `convex/schema.ts` (line ~59) | Deployed |
| `forecasts` | `convex/schema.ts` (line ~48) | Deployed |
| `forecastResolutions` | `convex/schema.ts` (line ~50) | Deployed |
| Signal ingestion | `convex/domains/signals/signalIngester.ts` | Deployed |
| Signal processing | `convex/domains/signals/signalProcessor.ts` | Deployed |
| Evidence indexing | `convex/domains/artifacts/evidenceIndex.ts` | Deployed |
| Evidence search | `convex/domains/artifacts/evidenceSearch.ts` | Deployed |
| Evidence packs | `convex/domains/artifacts/evidencePacks.ts` | Deployed |
| Source artifacts | `convex/domains/artifacts/sourceArtifacts.ts` | Deployed |
| OTel telemetry | `convex/domains/observability/telemetry.ts` | Deployed |
| Trace storage | `convex/domains/observability/traces.ts` | Deployed |
| API cost tracking | `convex/domains/billing/apiUsageTracking.ts` | Deployed |
| Rate limiting | `convex/domains/billing/rateLimiting.ts` | Deployed |
| Forecasting scoring | `convex/domains/forecasting/scoringEngine.ts` | Deployed |
| Signal matching | `convex/domains/forecasting/signalMatcher.ts` | Deployed |
| Forecast manager | `convex/domains/forecasting/forecastManager.ts` | Deployed |
| Calibration | `convex/domains/forecasting/actions/computeCalibration.ts` | Deployed |
| Brier/log scoring | `convex/domains/forecasting/scoringEngine.ts` | Deployed |
| TRACE wrapping | `convex/domains/forecasting/traceWrapper.ts` | Deployed |
| Forecast refresh cron | `convex/domains/forecasting/cronHandlers/dailyForecastRefresh.ts` | Deployed |
| Resolution check cron | `convex/domains/forecasting/cronHandlers/resolutionCheck.ts` | Deployed |
| Weekly calibration cron | `convex/domains/forecasting/cronHandlers/weeklyCalibration.ts` | Deployed |

#### Design principles
- **Append-only**: Observations are immutable once written. Corrections create new rows with `correctionOf` pointers.
- **Window-native**: Every query accepts `(start, end)` time windows. No full-table scans.
- **Causal direction**: `causalChains` encode directed edges between observations with confidence scores.
- **Evidence-first**: No claim without a `proofPack`. Every forecast resolution links to evidence.

---

### Layer 2: Execution Harness

The runtime. Manages tool dispatch, self-healing, checkpointing, sandboxing, and audit.

#### What exists today

| Component | Location | Status |
|-----------|----------|--------|
| Self-healer (6 playbooks) | `convex/domains/observability/selfHealer.ts` | Deployed |
| Health monitor | `convex/domains/observability/healthMonitor.ts` | Deployed |
| Dashboard data | `convex/domains/observability/dashboardData.ts` | Deployed |
| 235+ tool registry | `packages/mcp-local/src/tools/toolRegistry.ts` | Deployed |
| Progressive discovery | `packages/mcp-local/src/tools/progressiveDiscoveryTools.ts` | Deployed |
| Toolset gating (10 presets) | `packages/mcp-local/src/toolsetRegistry.ts` | Deployed |
| WebMCP settings | `src/components/WebMcpSettingsPanel.tsx` | Deployed |
| Delivery queue | `convex/domains/publishing/deliveryQueue.ts` | Deployed |
| Publishing orchestrator | `convex/domains/publishing/publishingOrchestrator.ts` | Deployed |
| Audit log | `convex/domains/groundTruth/auditLog.ts` | Deployed |
| Ground truth versions | `convex/domains/groundTruth/versions.ts` | Deployed |
| Engine context bridge | `packages/mcp-local/src/engine/contextBridge.ts` | Deployed |
| Engine session | `packages/mcp-local/src/engine/session.ts` | Deployed |
| Engine conformance | `packages/mcp-local/src/engine/conformance.ts` | Deployed |
| Sandbox execution | `packages/mcp-local/src/security/commandSandbox.ts` | Deployed |
| Path sandbox | `packages/mcp-local/src/security/pathSandbox.ts` | Deployed |
| Credential redactor | `packages/mcp-local/src/security/credentialRedactor.ts` | Deployed |
| Security audit log | `packages/mcp-local/src/security/auditLog.ts` | Deployed |
| Cron wrapper | `convex/domains/taskManager/cronWrapper.ts` | Deployed |
| Task mutations | `convex/domains/taskManager/mutations.ts` | Deployed |
| Task queries | `convex/domains/taskManager/queries.ts` | Deployed |
| Batch autopilot runner | `convex/domains/batchAutopilot/runner.ts` | Deployed |
| Batch scheduler | `convex/domains/batchAutopilot/scheduler.ts` | Deployed |
| Eval harness | `convex/domains/eval/evalHelpers.ts` | Deployed |
| Eval storage | `convex/domains/eval/evalStorage.ts` | Deployed |
| Production test cases | `convex/domains/eval/productionTestCases.ts` | Deployed |

#### Design principles
- **Self-healing before alerting**: The 6 playbooks (restart, scale, failover, degrade, rollback, quarantine) execute automatically. Alerts fire only after playbook exhaustion.
- **Checkpoint-resume**: Every long-running task checkpoints state to Convex. Crash recovery restarts from last checkpoint, not from zero.
- **Sandbox-first**: All tool execution runs inside path + command sandboxes. No tool can escape its declared scope.
- **Audit trail**: Every mutation is logged with actor, timestamp, and diff. Ground truth versioning enables temporal queries ("what did we believe at time T?").

---

### Layer 3: Dual-Facing Interface

Two personas, one substrate.

#### Builder Face: Oracle (Gamified Harness)

| Component | Location | Status |
|-----------|----------|--------|
| OracleView (main page) | `src/features/oracle/views/OracleView.tsx` | Deployed |
| OraclePanel (embedded) | `src/features/oracle/components/OraclePanel.tsx` | Deployed |
| PlayerStatus | `src/features/oracle/components/PlayerStatus.tsx` | Deployed |
| QuestLog | `src/features/oracle/components/QuestLog.tsx` | Deployed |
| Oracle types | `src/features/oracle/types.ts` | Deployed |
| Oracle index | `src/features/oracle/index.ts` | Deployed |
| View registry entry | `src/lib/registry/viewRegistry.ts` | Registered |

**11-Tier Class Hierarchy** (from `types.ts`):

| Tier | Title | EXP Range |
|------|-------|-----------|
| 1 | Initiate | 0-99 |
| 2 | Apprentice | 100-499 |
| 3 | Journeyman | 500-1,499 |
| 4 | Artisan | 1,500-3,999 |
| 5 | Expert | 4,000-8,999 |
| 6 | Master | 9,000-17,999 |
| 7 | Grandmaster | 18,000-34,999 |
| 8 | Sage | 35,000-64,999 |
| 9 | Oracle | 65,000-119,999 |
| 10 | Archon | 120,000-199,999 |
| 11 | Transcendent | 200,000+ |

**Quest System**: Tasks map to quests with EXP rewards. Drift from vision applies debuffs. Dogfood verification grants bonus EXP. Consecutive failures trigger "boss fight" challenge quests.

**EXP Calculation**: Weighted sum of (tools used * complexity weight) + (tests passed) + (dogfood score * 10) - (drift penalty) - (cost overrun penalty).

#### Institutional Face: Control Tower

| Component | Location | Status |
|-----------|----------|--------|
| Observability view | `src/features/observability/views/ObservabilityView.tsx` | Deployed |
| Cockpit intel rail | `src/layouts/CockpitIntelRail.tsx` | Deployed |
| HITL adjudication | `convex/domains/hitl/adjudicationWorkflow.ts` | Deployed |
| HITL labeling queue | `convex/domains/hitl/labelingQueue.ts` | Deployed |
| Labeler calibration | `convex/domains/hitl/labelerCalibration.ts` | Deployed |
| Distribution drift | `convex/domains/hitl/distributionDriftDetection.ts` | Deployed |
| Validation enforcement | `convex/domains/hitl/validationWorkspaceEnforcement.ts` | Deployed |
| Trust policy | `convex/domains/governance/trustPolicy.ts` | Deployed |
| Provenance explainer | `convex/domains/governance/provenanceExplainer.ts` | Deployed |
| Quarantine | `convex/domains/governance/quarantine.ts` | Deployed |
| Model risk governance | `convex/domains/financial/modelRiskGovernance.ts` | Deployed |

**Institutional Verdict Flow**: Signal ingestion -> evidence indexing -> HITL adjudication -> trust scoring -> provenance explanation -> verdict with proof pack.

#### Shared Surfaces

| Component | Location | Status |
|-----------|----------|--------|
| Forecast Cockpit | `src/features/research/components/ForecastCockpit.tsx` | Deployed |
| Forecast Card | `src/features/research/components/ForecastCard.tsx` | Deployed |
| Video QA (Gemini) | `convex/domains/dogfood/videoQa.ts` | Deployed |
| Screenshot QA | `convex/domains/dogfood/screenshotQa.ts` | Deployed |
| Thompson Protocol | `docs/architecture/ORACLE_VISION.md` | Documented |
| Cinematic Home | `src/features/research/views/CinematicHome.tsx` | Deployed |

---

### Layer 4: Thompson Flywheel

The continuous content and learning loop. Named after William Thompson (Lord Kelvin): "If you cannot measure it, you cannot improve it."

#### What exists today

| Component | Location | Status |
|-----------|----------|--------|
| Newsroom workflow | `convex/domains/narrative/newsroom/workflow.ts` | Deployed |
| Newsroom state | `convex/domains/narrative/newsroom/state.ts` | Deployed |
| Record-replay lane | `convex/domains/narrative/newsroom/recordReplayLane.ts` | Deployed |
| Scout agent | `convex/domains/narrative/newsroom/agents/scoutAgent.ts` | Deployed |
| Analyst agent | `convex/domains/narrative/newsroom/agents/analystAgent.ts` | Deployed |
| Curator agent | `convex/domains/narrative/newsroom/agents/curatorAgent.ts` | Deployed |
| Historian agent | `convex/domains/narrative/newsroom/agents/historianAgent.ts` | Deployed |
| Publisher agent | `convex/domains/narrative/newsroom/agents/publisherAgent.ts` | Deployed |
| Signal collector agent | `convex/domains/narrative/newsroom/agents/signalCollectorAgent.ts` | Deployed |
| Comment harvester | `convex/domains/narrative/newsroom/agents/commentHarvester.ts` | Deployed |
| LinkedIn adapter | `convex/domains/narrative/adapters/linkedinAdapter.ts` | Deployed |
| Feed adapter | `convex/domains/narrative/adapters/feedAdapter.ts` | Deployed |
| Brief adapter | `convex/domains/narrative/adapters/briefAdapter.ts` | Deployed |
| Daily LinkedIn post | `convex/workflows/dailyLinkedInPost.ts` | Deployed |
| Competing explanations | `convex/domains/narrative/actions/competingExplanations.ts` | Deployed |
| Hypothesis lifecycle | `convex/domains/narrative/actions/hypothesisLifecycle.ts` | Deployed |
| Claim classifier | `convex/domains/narrative/guards/claimClassifier.ts` | Deployed |
| Truth maintenance | `convex/domains/narrative/guards/truthMaintenance.ts` | Deployed |
| Self-citation guard | `convex/domains/narrative/guards/selfCitationGuard.ts` | Deployed |
| Injection containment | `convex/domains/narrative/guards/injectionContainment.ts` | Deployed |
| Content rights | `convex/domains/narrative/guards/contentRights.ts` | Deployed |
| Abuse resistance | `convex/domains/narrative/safety/abuseResistance.ts` | Deployed |
| Did You Know | `convex/domains/narrative/didYouKnow.ts` | Deployed |
| DYK sources | `convex/domains/narrative/didYouKnowSources.ts` | Deployed |
| Cron handlers | `convex/domains/narrative/cronHandlers.ts` | Deployed |

**7-Agent Newsroom Pipeline** (LangGraph-style):
1. **Scout** -- discovers raw signals from RSS, APIs, web scrapes
2. **Signal Collector** -- normalizes, deduplicates, scores novelty
3. **Analyst** -- generates competing explanations with evidence checklists
4. **Historian** -- temporal context, prior art, trend detection
5. **Curator** -- selects, ranks, composes narrative threads
6. **Publisher** -- formats for channel (LinkedIn, brief, feed)
7. **Comment Harvester** -- captures engagement, feeds back to scoring

**Flywheel Loop**:
```
Observe (signals) -> Forecast (probabilities) -> Publish (content)
     ^                                                |
     |                                                v
     +---- Measure (engagement + resolution) <--------+
```

---

## 3. Existing Infrastructure Inventory (Summary)

### Layer 1 totals
- **5 time-series tables**: timeSeriesObservations, timeSeriesSignals, causalChains, zeroDraftArtifacts, proofPacks
- **5 forecasting tables**: forecasts, forecastUpdates (via forecastManager), forecastResolutions, calibrationSnapshots (via computeCalibration), forecastSignalLinks (via signalMatcher)
- **Scoring**: Brier score, log score, calibration curves, weekly automated calibration
- **3 cron jobs**: daily forecast refresh, resolution check, weekly calibration
- **Signal pipeline**: ingestion -> processing -> matching -> evidence indexing
- **Observability**: OTel traces, health monitor, dashboard data, API cost tracking, rate limiting

### Layer 2 totals
- **Self-healing**: 6 playbooks in selfHealer.ts (restart, scale, failover, degrade, rollback, quarantine)
- **Security**: 7-module sandbox (path, command, URL, credential, audit, config, error)
- **Tool registry**: 235+ tools across 45 domain keys, 10 presets, progressive discovery with hybrid search (14 strategies)
- **Engine**: session management, conformance checking, context bridge with 3 API endpoints
- **Eval**: 497+ tests across 13 test files, production test cases, eval storage
- **Batch autopilot**: runner, scheduler, delta collector, prompt builder
- **Task management**: mutations, queries, cron wrapper

### Layer 3 totals
- **Oracle**: OracleView, OraclePanel, PlayerStatus, QuestLog, 11-tier class hierarchy, EXP system, quest/debuff mechanics
- **Control Tower**: observability view, cockpit intel rail, HITL workflows, governance (trust policy, provenance, quarantine, model risk)
- **Forecasting UI**: ForecastCockpit, ForecastCard, calibration visualization
- **QA**: Video QA (Gemini), screenshot QA, dogfood review view, design linter
- **Cinematic Home**: research hub with hero section, pulse grid, timeline strip

### Layer 4 totals
- **Newsroom**: 7 agents, record-replay, state machine, workflow orchestrator
- **Content pipeline**: LinkedIn adapter, feed adapter, brief adapter, daily post workflow
- **Guards**: 7 guards (claim classification, truth maintenance, self-citation, injection containment, content rights, quarantine, abuse resistance)
- **Narrative**: competing explanations, hypothesis lifecycle, Did You Know, temporal facts, correlation tracking

---

## 4. Gap Analysis

### Gap 1: TSFM Microservice (Time-Series Foundation Model)

**What's missing**: A dedicated microservice that runs time-series foundation models (TimesFM, Chronos, Lag-Llama) for anomaly detection, trend forecasting, and changepoint identification on the temporal substrate.

**Why it matters**: The forecasting system currently relies on LLM-generated probability estimates. A TSFM layer would provide statistical baselines that LLM forecasts can be calibrated against, dramatically improving Brier scores.

**Integration point**: Layer 1 (temporal substrate). Reads from `timeSeriesObservations` and `timeSeriesSignals`, writes anomaly scores and trend vectors back.

**Target location**: `python-mcp-servers/tsfm/` (new FastAPI server, port 8008)

**Key deliverables**:
- FastAPI server with `/predict`, `/anomaly`, `/changepoint` endpoints
- TimesFM + Chronos model loading with GPU/CPU fallback
- Convex action wrappers in `convex/domains/forecasting/actions/tsfmPredict.ts`
- MCP tools: `tsfm_predict`, `tsfm_detect_anomaly`, `tsfm_find_changepoints`

---

### Gap 2: LangExtract Pipeline

**What's missing**: A structured extraction pipeline that converts raw web content, PDFs, SEC filings, and emails into typed observations for the temporal substrate.

**Why it matters**: The signal ingestion layer accepts pre-structured data but lacks a robust extraction stage. Analysts manually structure data or rely on ad-hoc LLM prompts. A LangExtract pipeline would automate: fetch -> parse -> extract -> validate -> ingest.

**Integration point**: Layer 1 -> Layer 2. Extraction feeds the temporal substrate; validation uses the execution harness.

**Target location**: `convex/domains/extraction/` (new domain)

**Key deliverables**:
- `extractionPipeline.ts` -- orchestrator (fetch -> parse -> extract -> validate -> write)
- `extractors/` -- per-source extractors (SEC EDGAR, RSS, email, PDF, HTML)
- Schema-guided extraction using `zeroDraftArtifacts` as output format
- Contradiction detection integration (`convex/domains/validation/contradictionDetector.ts`)
- MCP tools: `extract_from_url`, `extract_from_document`, `extract_structured_filing`

---

### Gap 3: Gamification Backend Persistence

**What's missing**: The Oracle gamification layer (EXP, quests, debuffs, class progression) is currently computed client-side from task/session data. There is no persistent backend for:
- Player profiles with EXP history
- Quest definitions and completion records
- Debuff/buff state machines
- Leaderboards and streaks
- Achievement unlocks

**Why it matters**: Without persistence, progress resets on page reload. Builders cannot track long-term growth. Enterprise users cannot see team-level gamification metrics.

**Integration point**: Layer 3. Reads from Layer 1 (observations, forecasts) and Layer 2 (task sessions, eval results). Writes to new Convex tables.

**Target location**: `convex/domains/oracle/` (new domain)

**Key deliverables**:
- Convex tables: `playerProfiles`, `questDefinitions`, `questCompletions`, `achievements`, `streaks`, `debuffs`
- `convex/domains/oracle/expEngine.ts` -- deterministic EXP calculation from task telemetry
- `convex/domains/oracle/questResolver.ts` -- maps task sessions to quest completions
- `convex/domains/oracle/streakTracker.ts` -- daily/weekly streak computation with grace periods
- Real-time subscriptions for `PlayerStatus` and `QuestLog` components

---

### Gap 4: Enterprise SpecDoc API

**What's missing**: A headless API that accepts a specification document (PRD, RFC, design doc), runs it through the execution harness, and returns a structured QA verdict with evidence packs.

**Why it matters**: This is the enterprise monetization path. Companies submit specs; NodeBench returns automated QA verdicts (conformance checks, gap analysis, risk scores) with full provenance trails. The same substrate that powers builder gamification powers institutional QA.

**Integration point**: Layer 2 -> Layer 3. Uses the execution harness (tools, sandbox, checkpointing) and produces verdicts for the Control Tower.

**Target location**: `packages/mcp-local/src/engine/specDocApi.ts` (extends existing engine)

**Key deliverables**:
- REST API: `POST /api/specdoc/submit`, `GET /api/specdoc/:id/verdict`, `GET /api/specdoc/:id/evidence`
- SpecDoc parser (markdown, JSON, YAML spec formats)
- Conformance checker (maps spec requirements to tool-verifiable assertions)
- Evidence pack generator (bundles proof artifacts for each assertion)
- Webhook notifications on verdict completion
- MCP tools: `submit_specdoc`, `get_specdoc_verdict`, `list_specdoc_runs`

---

### Gap 5: Dynamic Tool Registration

**What's missing**: Runtime tool registration without server restart. Currently, all 235+ tools are registered at startup from static registry entries. Adding a tool requires code changes and redeployment.

**Why it matters**: Enterprise users need to register custom tools (internal APIs, domain-specific checks). The TSFM and LangExtract gaps both introduce new tools that should be hot-loadable.

**Integration point**: Layer 2. Extends the tool registry with a runtime registration API.

**Target location**: `packages/mcp-local/src/tools/dynamicRegistry.ts` (new file)

**Key deliverables**:
- `registerTool(entry: ToolRegistryEntry)` -- runtime registration with schema validation
- `unregisterTool(name: string)` -- safe removal with dependency checking
- Persistence to `~/.nodebench/custom_tools.json`
- Auto-discovery of tools from `~/.nodebench/tools/` directory
- MCP tool: `register_custom_tool`, `list_custom_tools`, `unregister_custom_tool`
- Hot-reload without MCP session restart (tool list change notification)

---

### Gap 6: Feynman Editor Agent

**What's missing**: An agent that takes `zeroDraftArtifacts` and transforms them into publication-ready content using the Feynman technique: simplify until a non-expert can understand, then add precision back layer by layer.

**Why it matters**: The newsroom pipeline produces zero-drafts. The LinkedIn adapter formats them. But there is no intermediate editing agent that optimizes for clarity, removes jargon, and ensures the "agency over anxiety" voice principle. Currently this is manual.

**Integration point**: Layer 4. Sits between the Curator agent and Publisher agent in the newsroom pipeline.

**Target location**: `convex/domains/narrative/newsroom/agents/feynmanEditor.ts` (new agent)

**Key deliverables**:
- Feynman simplification pass (remove jargon, add analogies, test with readability score)
- Voice compliance check (practitioner authority, agency over anxiety, transparent rigor)
- Evidence density optimization (ensure every claim has a linked proof pack)
- A/B variant generation (2-3 versions with different complexity levels)
- Integration into newsroom workflow between curator and publisher stages

---

## 5. Four-Phase Build Plan

### Phase 1: Substrate + Ingestion (Weeks 1-3)

**Objective**: Harden the temporal substrate and add the extraction pipeline.

| Week | Deliverable | Key Files |
|------|-------------|-----------|
| 1 | TSFM microservice scaffold + TimesFM integration | `python-mcp-servers/tsfm/server.py`, `python-mcp-servers/tsfm/models/timesfm_wrapper.py` |
| 1 | TSFM Convex action wrappers | `convex/domains/forecasting/actions/tsfmPredict.ts` |
| 2 | LangExtract pipeline scaffold | `convex/domains/extraction/extractionPipeline.ts` |
| 2 | SEC EDGAR + RSS extractors | `convex/domains/extraction/extractors/secEdgar.ts`, `convex/domains/extraction/extractors/rss.ts` |
| 3 | Contradiction detection integration | Wire `convex/domains/validation/contradictionDetector.ts` into extraction pipeline |
| 3 | End-to-end test: signal -> extract -> observe -> forecast -> anomaly | `packages/mcp-local/src/__tests__/temporalSubstrate.test.ts` |

**Success criteria**:
- TSFM `/predict` endpoint returns forecasts with <500ms p95 latency
- LangExtract processes an SEC 10-K filing into structured observations
- Anomaly detection flags synthetic injected anomalies with >80% recall
- All existing 497+ tests still pass

**Risk**: TSFM GPU requirements. **Mitigation**: CPU-only Chronos fallback; GPU optional for TimesFM.

---

### Phase 2: Math + API (Weeks 4-6)

**Objective**: Build the enterprise SpecDoc API and dynamic tool registration.

| Week | Deliverable | Key Files |
|------|-------------|-----------|
| 4 | SpecDoc API scaffold + parser | `packages/mcp-local/src/engine/specDocApi.ts`, `packages/mcp-local/src/engine/specDocParser.ts` |
| 4 | Dynamic tool registration | `packages/mcp-local/src/tools/dynamicRegistry.ts` |
| 5 | Conformance checker + evidence pack generator | `packages/mcp-local/src/engine/conformanceChecker.ts`, `packages/mcp-local/src/engine/evidencePackGenerator.ts` |
| 5 | SpecDoc MCP tools (submit, verdict, list) | Added to `packages/mcp-local/src/tools/toolRegistry.ts` |
| 6 | Webhook notifications + rate limiting | Extend `packages/mcp-local/src/engine/specDocApi.ts` |
| 6 | Integration test: submit spec -> run tools -> get verdict with proofs | `packages/mcp-local/src/__tests__/specDocApi.test.ts` |

**Success criteria**:
- SpecDoc API accepts a markdown PRD and returns a structured verdict within 60 seconds
- Dynamic registration adds a tool visible to `discover_tools` without restart
- Evidence packs contain linked `proofPack` IDs from the temporal substrate
- Custom tools persist across server restarts

**Risk**: Conformance checking is open-ended. **Mitigation**: Start with checklist-style specs (numbered requirements with testable assertions). Complex specs deferred to Phase 4.

---

### Phase 3: Gamified Oracle + Zero-Drafting (Weeks 7-9)

**Objective**: Persist gamification state and add the Feynman Editor agent.

| Week | Deliverable | Key Files |
|------|-------------|-----------|
| 7 | Oracle Convex domain + schema | `convex/domains/oracle/index.ts`, schema additions to `convex/schema.ts` |
| 7 | EXP engine + quest resolver | `convex/domains/oracle/expEngine.ts`, `convex/domains/oracle/questResolver.ts` |
| 8 | Streak tracker + achievement system | `convex/domains/oracle/streakTracker.ts`, `convex/domains/oracle/achievements.ts` |
| 8 | Wire PlayerStatus + QuestLog to real-time Convex subscriptions | Update `src/features/oracle/components/PlayerStatus.tsx`, `QuestLog.tsx` |
| 9 | Feynman Editor agent | `convex/domains/narrative/newsroom/agents/feynmanEditor.ts` |
| 9 | Insert Feynman into newsroom workflow + A/B variant testing | Update `convex/domains/narrative/newsroom/workflow.ts` |

**Success criteria**:
- EXP persists across sessions and page reloads
- QuestLog shows real quests derived from task sessions (not mock data)
- Streaks track daily activity with 1-day grace period
- Feynman Editor reduces Flesch-Kincaid grade level by >= 2 grades on average
- LinkedIn posts through Feynman maintain all 5 voice principles

**Risk**: Gamification feels gimmicky. **Mitigation**: Oracle Vision mandates game labels as "translation layer only" -- underlying data is always the real metric (tools used, tests passed, drift score). Game layer is optional and dismissable.

---

### Phase 4: Enterprise Headless QA (Weeks 10-12)

**Objective**: Production-grade enterprise API with authentication, billing, and SLA monitoring.

| Week | Deliverable | Key Files |
|------|-------------|-----------|
| 10 | API key management + auth middleware | `packages/mcp-local/src/engine/apiAuth.ts` |
| 10 | Billing integration (usage-based) | Extend `convex/domains/billing/apiUsageTracking.ts` |
| 11 | SLA monitoring + alerting | Extend `convex/domains/observability/healthMonitor.ts` |
| 11 | Multi-tenant isolation | `packages/mcp-local/src/engine/tenantIsolation.ts` |
| 12 | SDK generation (TypeScript, Python) | `packages/specdoc-sdk-ts/`, `packages/specdoc-sdk-py/` |
| 12 | Load testing + production hardening | `packages/mcp-local/src/__tests__/specDocLoadTest.test.ts` |

**Success criteria**:
- API handles 100 concurrent SpecDoc submissions with <5s queue time
- Billing accurately tracks per-submission costs (tool calls, LLM tokens, TSFM compute)
- Multi-tenant isolation prevents cross-tenant data leakage (verified by adversarial test)
- TypeScript SDK published to npm, Python SDK published to PyPI
- 99.5% uptime SLA demonstrated over 7-day burn-in

**Risk**: Multi-tenancy complexity. **Mitigation**: Start with workspace-level isolation (separate Convex deployments per tenant). Shared infrastructure deferred to v2.

---

## 6. Key File Path Index

### Layer 1: Temporal Substrate
```
convex/schema.ts                                          # All table definitions
convex/domains/signals/signalIngester.ts                  # Signal ingestion
convex/domains/signals/signalProcessor.ts                 # Signal processing
convex/domains/artifacts/evidenceIndex.ts                 # Evidence indexing
convex/domains/artifacts/evidenceSearch.ts                # Evidence search
convex/domains/artifacts/evidencePacks.ts                 # Evidence pack assembly
convex/domains/artifacts/sourceArtifacts.ts               # Source artifact storage
convex/domains/forecasting/forecastManager.ts             # Forecast CRUD
convex/domains/forecasting/scoringEngine.ts               # Brier/log scoring
convex/domains/forecasting/signalMatcher.ts               # Signal-forecast linking
convex/domains/forecasting/traceWrapper.ts                # TRACE protocol
convex/domains/forecasting/actions/computeCalibration.ts  # Calibration computation
convex/domains/forecasting/actions/createForecast.ts      # Forecast creation
convex/domains/forecasting/actions/refreshForecast.ts     # Forecast refresh
convex/domains/forecasting/actions/resolveForecast.ts     # Resolution processing
convex/domains/forecasting/cronHandlers/                  # 3 cron jobs
convex/domains/observability/telemetry.ts                 # OTel traces
convex/domains/observability/traces.ts                    # Trace storage
convex/domains/billing/apiUsageTracking.ts                # API cost tracking
convex/domains/billing/rateLimiting.ts                    # Rate limiting
```

### Layer 2: Execution Harness
```
convex/domains/observability/selfHealer.ts                # Self-healing (6 playbooks)
convex/domains/observability/healthMonitor.ts             # Health monitoring
packages/mcp-local/src/tools/toolRegistry.ts              # 235+ tool registry
packages/mcp-local/src/tools/progressiveDiscoveryTools.ts # Progressive discovery
packages/mcp-local/src/toolsetRegistry.ts                 # Preset gating
packages/mcp-local/src/engine/session.ts                  # Engine sessions
packages/mcp-local/src/engine/conformance.ts              # Conformance checks
packages/mcp-local/src/engine/contextBridge.ts            # Context bridge
packages/mcp-local/src/security/                          # 7-module security sandbox
convex/domains/publishing/deliveryQueue.ts                # Delivery queue
convex/domains/publishing/publishingOrchestrator.ts       # Publishing orchestrator
convex/domains/groundTruth/auditLog.ts                    # Audit log
convex/domains/groundTruth/versions.ts                    # Ground truth versions
convex/domains/taskManager/                               # Task management
convex/domains/batchAutopilot/                            # Batch autopilot
convex/domains/eval/                                      # Eval system
```

### Layer 3: Dual-Facing Interface
```
src/features/oracle/views/OracleView.tsx                  # Oracle main view
src/features/oracle/components/OraclePanel.tsx             # Oracle embedded panel
src/features/oracle/components/PlayerStatus.tsx            # Player status display
src/features/oracle/components/QuestLog.tsx                # Quest log display
src/features/oracle/types.ts                               # Oracle type definitions
src/features/observability/views/ObservabilityView.tsx     # Control Tower view
src/layouts/CockpitIntelRail.tsx                           # Cockpit intel rail
src/features/research/components/ForecastCockpit.tsx       # Forecast cockpit
src/features/research/components/ForecastCard.tsx          # Forecast card
convex/domains/hitl/                                       # HITL workflows
convex/domains/governance/                                 # Trust/provenance/quarantine
convex/domains/dogfood/videoQa.ts                          # Video QA (Gemini)
convex/domains/dogfood/screenshotQa.ts                     # Screenshot QA
```

### Layer 4: Thompson Flywheel
```
convex/domains/narrative/newsroom/workflow.ts              # Newsroom orchestrator
convex/domains/narrative/newsroom/state.ts                 # Newsroom state machine
convex/domains/narrative/newsroom/agents/                  # 7 agents
convex/domains/narrative/adapters/linkedinAdapter.ts       # LinkedIn adapter
convex/domains/narrative/adapters/feedAdapter.ts           # Feed adapter
convex/domains/narrative/adapters/briefAdapter.ts          # Brief adapter
convex/workflows/dailyLinkedInPost.ts                      # Daily post workflow
convex/domains/narrative/actions/competingExplanations.ts  # Competing explanations
convex/domains/narrative/actions/hypothesisLifecycle.ts    # Hypothesis lifecycle
convex/domains/narrative/guards/                           # 7 content guards
convex/domains/narrative/safety/abuseResistance.ts         # Abuse resistance
convex/domains/narrative/cronHandlers.ts                   # Narrative crons
```

### Gap Components (to be built)
```
python-mcp-servers/tsfm/                                   # [Gap 1] TSFM microservice
convex/domains/extraction/                                 # [Gap 2] LangExtract pipeline
convex/domains/oracle/                                     # [Gap 3] Gamification backend
packages/mcp-local/src/engine/specDocApi.ts                # [Gap 4] SpecDoc API
packages/mcp-local/src/tools/dynamicRegistry.ts            # [Gap 5] Dynamic tool registration
convex/domains/narrative/newsroom/agents/feynmanEditor.ts  # [Gap 6] Feynman Editor agent
```

---

## 7. Architecture Decision Records

### ADR-001: Convex as single substrate
**Decision**: All temporal data lives in Convex tables, not a separate time-series DB.
**Rationale**: Convex provides real-time subscriptions, ACID transactions, and serverless scale. Adding InfluxDB/TimescaleDB would double operational complexity for marginal query performance gains at current scale (<1M observations).
**Revisit trigger**: >10M observations or >100ms p95 window query latency.

### ADR-002: TSFM as sidecar, not embedded
**Decision**: TSFM runs as a separate Python FastAPI server, not embedded in the Node.js MCP server.
**Rationale**: TSFM models require PyTorch/JAX. Embedding in Node.js would require brittle FFI bridges. Sidecar pattern matches existing flicker detection (port 8006) and figma flow (port 8007) servers.
**Revisit trigger**: If latency between MCP server and TSFM exceeds 200ms p95.

### ADR-003: Oracle persistence in Convex, not SQLite
**Decision**: Gamification state (EXP, quests, streaks) lives in Convex, not local SQLite.
**Rationale**: Real-time subscriptions enable live UI updates. Multi-device sync is free. SQLite would require a sync layer. Session notes already use SQLite for offline-first needs; gamification does not need offline-first.
**Revisit trigger**: If Convex write costs for high-frequency EXP updates become material (>$50/mo).

### ADR-004: SpecDoc as engine extension, not new server
**Decision**: The SpecDoc API extends the existing engine server (port 6276), not a new service.
**Rationale**: Reuses existing context bridge, session management, and tool dispatch. A separate server would duplicate auth, tool registry, and conformance logic.
**Revisit trigger**: If SpecDoc traffic requires independent scaling from MCP tool traffic.

---

## 8. Cross-References

- **Oracle Vision**: `docs/architecture/ORACLE_VISION.md` -- builder-first harness philosophy
- **Oracle State**: `docs/architecture/ORACLE_STATE.md` -- current milestone tracker
- **Oracle Loop**: `docs/architecture/ORACLE_LOOP.md` -- operating loop protocol
- **Codebase Structure**: `docs/architecture/CODEBASE_RESTRUCTURE.md` -- domain consolidation map
- **Agent Contract**: `AGENTS.md` -- full methodology, eval bench, tool pipeline
- **AI Flywheel**: `AI_FLYWHEEL.md` -- 7-step continuous improvement protocol
- **LinkedIn Pipeline**: `CLAUDE.md` (LinkedIn post pipeline section) -- voice principles, post structure, evidence rendering
- **Forecasting OS**: `.claude/rules/forecasting_os.md` -- Brier scoring, TRACE wrapping, calibration
