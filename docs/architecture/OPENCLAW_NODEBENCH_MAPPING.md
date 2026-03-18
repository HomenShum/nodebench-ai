# OpenClaw → NodeBench Agent Architecture Mapping

**Date:** 2026-03-17
**Purpose:** Map every OpenClaw layer to existing NodeBench infrastructure. Build on what exists, don't duplicate.

---

## Layer-by-Layer Mapping

### Layer 1: Infrastructure (Cloud-Native, Laptop-Off)

| OpenClaw Component | NodeBench Equivalent | Status | Gap |
|--------------------|---------------------|--------|-----|
| Convex (11 crons, 24 tables) | `convex/config/autonomousConfig.ts` — 10 cron jobs defined, 24+ schema tables | **EXISTS** | OpenClaw has `housekeeping` + `predict` crons not in NodeBench |
| Render FastAPI (14 endpoints) | Convex HTTP actions + `packages/mcp-local/` MCP server (289 tools) | **EXISTS** | NodeBench is serverless-native, no separate backend needed |
| Slack Observer (local daemon) | `convex/domains/messaging/providers/slackProvider.ts` | **EXISTS** | Missing: local polling daemon, YouTube transcript enrichment |
| iMessage Listener | Not implemented | **GAP** | Could use `convex/domains/messaging/providers/` pattern |

**Verdict:** Infrastructure is 90% covered. NodeBench is already cloud-native via Convex. The Slack Observer polling pattern and iMessage bridge are gaps.

---

### Layer 2: LLM Routing (Dynamic Model Selection)

| OpenClaw Component | NodeBench Equivalent | File | Status |
|--------------------|---------------------|------|--------|
| `model_registry.get_model_for_task()` | `convex/domains/ai/models/modelRouter.ts` — task-category routing with `taskCategory` enum | **EXISTS** | |
| Three-tier allocation (nano/standard/deep) | `autonomousModelResolver.ts` — free-first fallback chain + `BUDGET_CONFIG` persona budgets | **EXISTS** | |
| Token-bucket rate limiter | `convex/domains/integrations/billing/rateLimiting.ts` | **EXISTS** | |
| Per-call telemetry | `convex/domains/operations/taskManager/` — OpenTelemetry spans + token/cost tracking | **EXISTS** | |
| `get_last_call_meta()` | `modelRouter.ts` returns `{ modelId, inputTokens, outputTokens, costUsd, latencyMs }` | **EXISTS** | |

**NodeBench model tiers (mapped to OpenClaw):**

| OpenClaw Tier | OpenClaw Model | NodeBench Equivalent | NodeBench Model |
|---------------|---------------|---------------------|-----------------|
| Fast (nano) | gpt-5.4-nano | `FREE_MODEL_CONFIG.knownFree` | qwen3-coder-free, glm-4.7-flash |
| Standard (mini) | gpt-5.4-mini | `modelRouter` standard tier | gemini-3.1-flash-lite-preview |
| Deep (full) | gpt-5.4 | `modelRouter` premium tier | claude-opus-4.5, gpt-5.2 |

**Verdict:** Fully covered. NodeBench's `modelRouter` + `autonomousModelResolver` + `rateLimiting` already implement task-based routing, budget enforcement, and telemetry.

---

### Layer 3: Core Services (11 Autonomous Crons)

| OpenClaw Cron | Freq | NodeBench Equivalent | File | Status |
|---------------|------|---------------------|------|--------|
| Monitor (Slack scan) | 30min | `signalIngestion` cron (*/5 min) | `autonomousConfig.ts` | **EXISTS** (faster cadence) |
| Digest (channel summary) | 1hr | `convex/domains/agents/digestAgent.ts` | | **EXISTS** |
| Standup (daily) | 7AM | `morningBrief` cron (6AM UTC) | `autonomousConfig.ts` | **EXISTS** |
| Evolve (self-improvement) | 6AM | `convex/domains/ai/models/livePerformanceEval.ts` + `engagementOptimization` cron | | **PARTIAL** — model eval exists, rubric self-evolution doesn't |
| Drift (roadmap compare) | Weekly | Not implemented | | **GAP** |
| Swarm (multi-agent) | 2hr | `convex/domains/agents/core/multiAgentWorkflow.ts` | | **EXISTS** |
| Swarm Evolve | Weekly | Not implemented as cron | | **GAP** — could use existing swarm infra |
| Swarm Competitive | Weekly | Not implemented as cron | | **GAP** |
| Deep Simulation | On-demand | `convex/domains/agents/coordinator/agent.ts` (deep mode) | | **EXISTS** |
| Housekeeping | 4hr | `cleanup` cron (3AM daily) | `autonomousConfig.ts` | **EXISTS** (different cadence) |
| Predict | Weekly | Not implemented | | **GAP** |

**Verdict:** 7/11 crons have equivalents. Gaps: drift detection, swarm evolution, competitive analysis, prediction. All could be built on existing `multiAgentWorkflow.ts` + `cronWrapper.ts`.

---

### Layer 4: LLM-as-Judge (Boolean Rubric Pattern)

| OpenClaw Component | NodeBench Equivalent | File | Status |
|--------------------|---------------------|------|--------|
| `llm_judge.py` with boolean rubric | `convex/domains/evaluation/llmJudge.ts` — boolean criteria pattern | **EXISTS** | |
| 8 opportunity types (A-H) | Signal types in `convex/domains/research/signalTimeseries.ts` | **PARTIAL** | Different taxonomy |
| `required_gates` + `disqualifiers` | `AgentRunJudgeCriteria` — 8 boolean checks | **EXISTS** | |
| Command-word gating | Not implemented | | **GAP** — trivial to add to channel preferences |
| Type B bypass (meta-feedback) | Not implemented | | **GAP** |

**NodeBench judge criteria (already implemented):**

```
AgentRunJudgeCriteria:
  taskCompleted, outputCorrect, evidenceCited, noHallucination,
  toolsUsedEfficiently, contractFollowed, budgetRespected, noForbiddenActions
  → PASS (6+/8), PARTIAL (4-5/8), FAIL (<4/8)

EntityResolutionCriteria:
  entityMentioned, entityNameCorrect, entityTypeCorrect,
  noEntityConfusion, entityContextRelevant → Pass if 4+/5

PersonaInferenceCriteria:
  personaExplicitlyStated, personaMatchesQuery, personaKeywordsPresent,
  noPersonaOverreach, personaAssumptionsDocumented → Pass if 3+/5
```

**Verdict:** Boolean rubric pattern is NodeBench's core eval architecture. The 8 opportunity types (A-H) map to signal classification, not judge criteria. Command-word gating is a channel-level feature, easy to add.

---

### Layer 5: Agent Swarm (Multi-Agent Deliberation)

| OpenClaw Component | NodeBench Equivalent | File | Status |
|--------------------|---------------------|------|--------|
| Topic selection | `agentRouter.classifyQuery()` | `agentRouter.ts` | **EXISTS** |
| Speaker selection (pick 3-4 roles) | Coordinator delegation tools (5 subagent types) | `coordinator/agent.ts` | **EXISTS** |
| Role responses (parallel) | `parallelSdkExecution()` | `adapters/multiSdkDelegation.ts` | **EXISTS** |
| Consensus check | Not automated (coordinator synthesizes) | | **GAP** |
| Context compression | `compressMessagesForHandoff()` | `adapters/handoffBridge.ts` | **EXISTS** |
| Action items extraction | Part of coordinator synthesis | | **EXISTS** |

**OpenClaw 6 roles → NodeBench 8 subagents:**

| OpenClaw Role | NodeBench Subagent | Match Quality |
|---------------|-------------------|---------------|
| Strategy Architect | ResearchAgent + EntityAgent | Strong |
| Engineering Lead | DocumentAgent | Strong |
| Growth Analyst | OpenBBAgent + MediaAgent | Strong |
| Design Steward | DossierAgent | Partial |
| Security Auditor | SECAgent | Strong |
| Operations Coordinator | Coordinator itself | Exact |

**Verdict:** Swarm architecture exists. Missing: automated consensus detection, early stopping, and self-evolution of roles. NodeBench has MORE subagent specialization (8 vs 6).

---

### Layer 6: Deep Simulation (Research + Deliberation)

| OpenClaw Phase | NodeBench Equivalent | Status |
|----------------|---------------------|--------|
| Phase 1: Research (20 turns) | Coordinator deep mode with delegation | **EXISTS** |
| Phase 2: Structured deliberation (4 rounds) | `multiAgentWorkflow.ts` | **PARTIAL** — no round-based deliberation |
| Phase 3: Synthesis | Coordinator final synthesis | **EXISTS** |
| Quality gate (shallow assessment → extra rounds) | `agentRunJudge.ts` verdict → retry | **PARTIAL** |

**Verdict:** Research + synthesis exists. Structured round-based deliberation with quality gates is a gap worth building — could extend `multiAgentWorkflow.ts`.

---

### Layer 7: Content Enrichment Pipeline

| OpenClaw Component | NodeBench Equivalent | File | Status |
|--------------------|---------------------|------|--------|
| YouTube transcript | `media_subagent/mediaAgent.ts` — YouTube search tools | **EXISTS** |
| Web URL enrichment | `packages/mcp-local/src/tools/webTools.ts` | **EXISTS** |
| @mention routing | `agentRouter.ts` + channel intelligence | **EXISTS** |
| Strategy classifier | `agentRouter.classifyQuery()` — simple/arbitrage/deep | **EXISTS** |
| Streaming response | `FastAgentPanel.MessageStream.tsx` | **EXISTS** |
| Telemetry footer | `modelRouter` returns per-call metadata | **EXISTS** |

**Verdict:** Fully covered. NodeBench's content enrichment is more capable (289 MCP tools vs OpenClaw's 4 integrations).

---

### Layer 8: Self-Evolution Loop (Karpathy Pattern)

| OpenClaw Component | NodeBench Equivalent | Status |
|--------------------|---------------------|--------|
| Decision logging | `agentTaskTraces` + `agentTaskSpans` (OpenTelemetry) | **EXISTS** |
| Daily analysis of decisions | `livePerformanceEval.ts` — model performance tracking | **PARTIAL** |
| Rubric change proposals | Not implemented | **GAP** |
| Auto-apply changes | Not implemented | **GAP** |

**Verdict:** Logging exists. The self-evolution feedback loop (analyze → propose → apply rubric changes) is the key gap. This is the highest-value OpenClaw innovation to port.

---

### Layer 9: Housekeeping & Channel Management

| OpenClaw Component | NodeBench Equivalent | Status |
|--------------------|---------------------|--------|
| Command Center thread | `convex/domains/operations/observability/` health dashboard | **EXISTS** |
| Activity digest | `digestAgent.ts` + `morningBrief` cron | **EXISTS** |
| Stale message cleanup | `cleanup` cron in `autonomousConfig.ts` | **EXISTS** |
| Dedup protection (3-layer) | Convex mutations are serialized (inherent dedup) | **EXISTS** |

**Verdict:** Fully covered via different mechanisms.

---

### Layer 10: External Integrations

| OpenClaw Integration | NodeBench Equivalent | Status |
|---------------------|---------------------|--------|
| Slack Bot | `slackProvider.ts` | **EXISTS** |
| Convex persistence | Native (Convex is primary DB) | **EXISTS** |
| OpenAI Responses API | `modelRouter.ts` + `vercelAiSdkAdapter.ts` | **EXISTS** |
| YouTube transcripts | `mediaAgent` tools | **EXISTS** |
| GitHub | `packages/mcp-local/src/tools/gitWorkflowTools.ts` | **EXISTS** |
| iMessage | Not implemented | **GAP** |
| Cloudflare Tunnel | Not needed (Convex is cloud-native) | N/A |

---

## Gemini 3.1 Flash + Flash Lite: Video/Image Pipeline Mapping

### Current Video/Image Infrastructure

| Component | File | Current Model | Proposed Model |
|-----------|------|---------------|----------------|
| Screenshot QA | `convex/domains/evaluation/dogfood/screenshotQa.ts` | gemini-3.1-pro-preview → flash fallback | **gemini-3.1-flash** (primary), **flash-lite** (bulk) |
| Video QA | `convex/domains/evaluation/dogfood/videoQa.ts` | gemini-3.1-pro-preview → flash fallback | **gemini-3.1-flash** (primary), **flash-lite** (burst) |
| MCP Vision Tools | `packages/mcp-local/src/tools/visionTools.ts` | Gemini vision wrapper | **gemini-3.1-flash** for analyze_screenshots |
| Visual QA (Playwright) | `packages/mcp-local/src/tools/visualQaTools.ts` | SSIM only (no LLM) | Add **flash-lite** scoring post-capture |
| Eval Visual Judge | `packages/eval-engine/src/judges/visual-judge.ts` | gemini-3.1-flash-lite-preview | Already updated |
| Eval Video Judge | `packages/eval-engine/src/judges/video-judge.ts` | gemini-3.1-flash-lite-preview | Already updated |

### Proposed Gemini 3.1 Model Allocation

| Task | Model | Why | Cost |
|------|-------|-----|------|
| **Bulk screenshot scoring** (171+ images) | gemini-3.1-flash-lite-preview | Fast, cheap, good enough for 8-criteria scoring | ~$0.02/batch |
| **Deep visual analysis** (single image, detailed) | gemini-3.1-flash | Higher quality reasoning for P0 issues | ~$0.10/image |
| **Video frame analysis** (burst captures) | gemini-3.1-flash-lite-preview | High throughput for SSIM + visual diff | ~$0.05/video |
| **Video understanding** (full video upload) | gemini-3.1-flash | Temporal reasoning across frames | ~$0.20/video |
| **Agent swarm visual verification** | gemini-3.1-flash-lite-preview | Quick pass/fail on agent-generated UI | ~$0.01/check |
| **LinkedIn post image analysis** | gemini-3.1-flash-lite-preview | OG image quality check before publish | ~$0.01/check |

---

## Gap Analysis Summary

### Already Built (no work needed)

| OpenClaw Layer | NodeBench Coverage |
|---------------|-------------------|
| Layer 1: Infrastructure | 90% — Convex cloud-native, 10 crons, 24+ tables |
| Layer 2: LLM Routing | 100% — modelRouter + budgets + telemetry |
| Layer 4: Boolean Judge | 95% — 3 criteria sets, 11 personas |
| Layer 7: Content Enrichment | 100% — 289 MCP tools, YouTube, web |
| Layer 9: Housekeeping | 100% — cleanup cron, digest, dedup |
| Layer 10: Integrations | 85% — Slack, GitHub, email, SMS, ntfy, telegram, discord |

### Needs Extension (build on existing)

| Gap | Build On | Effort |
|-----|----------|--------|
| Swarm consensus detection | `multiAgentWorkflow.ts` | 2-3 hours |
| Round-based deliberation | `coordinator/agent.ts` | 4-6 hours |
| Command-word gating | `channelProvider.ts` preferences | 1-2 hours |
| Drift detection cron | `cronWrapper.ts` + git tools | 3-4 hours |
| Competitive analysis cron | Swarm infra + `digestAgent.ts` | 3-4 hours |
| Prediction cron (MiroFish) | `multiAgentWorkflow.ts` | 4-6 hours |

### Needs New Build (highest value)

| Gap | Value | Effort | Priority |
|-----|-------|--------|----------|
| **Self-evolution loop** (Layer 8) | Highest — agent improves its own rubrics | 8-12 hours | P0 |
| **Slack Observer daemon** | High — real-time channel monitoring | 4-6 hours | P1 |
| **iMessage bridge** | Medium — urgent alert forwarding | 2-3 hours | P2 |
| **YouTube transcript enrichment** | Medium — context expansion | 2-3 hours | P2 |

---

## Recommended Implementation Order

1. **Wire Gemini 3.1 flash-lite into existing vision pipeline** — Update `screenshotQa.ts` and `videoQa.ts` fallback chains (30 min)
2. **Self-evolution loop** — New file `convex/domains/agents/selfEvolution.ts` — analyze decision logs, propose rubric changes, auto-apply (P0, 8-12 hours)
3. **Consensus detection** — Add to `multiAgentWorkflow.ts` — convergence check after each swarm round (P1, 2-3 hours)
4. **Round-based deliberation** — Extend coordinator with structured 4-round protocol (P1, 4-6 hours)
5. **Command-word gating** — Channel preference flag in `channelProvider.ts` (P2, 1-2 hours)
6. **Missing crons** — drift, competitive, predict — all built on existing infra (P2, 10-14 hours total)
