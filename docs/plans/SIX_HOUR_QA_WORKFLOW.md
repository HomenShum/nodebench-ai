# 6-Hour Comprehensive QA Workflow

**Date**: 2026-03-13 (v2: enhanced with interaction states, animation stability, visual aesthetics)
**Status**: Implementation
**Scope**: Automated QA pipeline — 39 routes × 6 variants × 18 interaction scenarios × 12 animation-critical routes, all persisted in Convex

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     6-Hour Comprehensive QA Workflow (9 Phases)              │
│                                                                              │
│  Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9  │
│  Setup     App QA    Interact   Animate   Aesthetic  Dogfood   AgentEval  Learn     Synth    │
│  (20min)   (40min)   (50min)    (40min)   (30min)    (40min)   (60min)    (40min)   (20min)  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Convex Persistence Layer                                 │   │
│  │  agentTaskSessions → agentTaskTraces → agentTaskSpans   │   │
│  │  evalRuns → evalResults                                  │   │
│  │  dogfoodQaRuns (Gemini Vision)                          │   │
│  │  proofPack (verdict derivation)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ LLM Judge (Cost-Optimized Fallback)                     │   │
│  │  qwen3-coder-free → glm-4.7-flash → gemini-3-flash     │   │
│  │  Boolean-criteria scoring (no arbitrary floats)          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase Schedule

### Phase 1: Setup & Baseline (0:00 – 0:30)
**Goal**: Build the app, capture baseline artifacts, create the QA session

| Step | Action | Convex Table | Duration |
|------|--------|-------------|----------|
| 1.1 | Create `agentTaskSession` (type=agent, title="6h QA Run") | agentTaskSessions | 1 min |
| 1.2 | `vite build` — verify clean compile | trace metadata | 5 min |
| 1.3 | `tsc --noEmit` — zero type errors | trace metadata | 5 min |
| 1.4 | `vitest run` — capture test counts + pass rate | evalRuns | 10 min |
| 1.5 | Capture baseline screenshots (4 variants × N routes) | dogfoodQaRuns | 5 min |
| 1.6 | Record baseline eval run with test results | evalRuns + evalResults | 4 min |

**Output**: Session ID, baseline eval run ID, baseline screenshot manifest

---

### Phase 2: App QA Gates (0:30 – 1:30)
**Goal**: Run accessibility, visual regression, code review, and UI/UX quality gates

| Step | Action | Gate Preset | Duration |
|------|--------|------------|----------|
| 2.1 | Run `a11y` gate on all changed routes | 8 WCAG rules | 15 min |
| 2.2 | Run `visual_regression` gate against baselines | 6 rules | 15 min |
| 2.3 | Run `code_review` gate on changed files | 7 rules | 10 min |
| 2.4 | Run `ui_ux_qa` gate on affected components | 8 rules | 10 min |
| 2.5 | Run `closed_loop` (compile→lint→test→debug) | 4 steps | 10 min |

**LLM Judge Integration**: For each gate, the LLM judge evaluates subjective rules (visual consistency, pattern adherence) using boolean criteria:
```
{
  ruleId: "visual_consistency",
  passed: true/false,
  reasoning: "The changed component uses the same border-radius and shadow tokens as adjacent components"
}
```

**Output**: Gate results stored in trace metadata as `executionTraceVerificationChecks`

---

### Phase 3: Dogfood Verification (1:30 – 2:30)
**Goal**: Gemini Vision QA on screenshots + video walkthrough

| Step | Action | Model | Duration |
|------|--------|-------|----------|
| 3.1 | Run `screenshotQa` on dark-desktop variant (52 routes) | gemini-3.1-pro | 15 min |
| 3.2 | Run `screenshotQa` on light-desktop + mobile variants | gemini-3-flash | 15 min |
| 3.3 | Run `videoQa` on walkthrough.mp4 | gemini-3-flash | 10 min |
| 3.4 | Score: 100 - (P1×6) - (P2×2) - (P3×1) | computed | 2 min |
| 3.5 | If score < 70: fix P1s, retake screenshots, re-score | iteration | 18 min |

**Output**: `dogfoodQaRuns` records, QA score, issues[] with severity/route/evidence

---

### Phase 4: Agent Eval via LLM Judge (2:30 – 4:00)
**Goal**: Run agent tasks, grade with LLM judge, compare against baselines

| Step | Action | Duration |
|------|--------|----------|
| 4.1 | Create eval suite: 8-12 agent scenarios (research, DD, QA bug, contract compliance) | 10 min |
| 4.2 | Execute each scenario as an agent task session | 40 min |
| 4.3 | For each completed session, run LLM judge with boolean criteria | 20 min |
| 4.4 | Record `evalResults` with judge reasoning per scenario | 5 min |
| 4.5 | `compare_eval_runs` against baseline — DEPLOY/REVERT/INVESTIGATE | 5 min |
| 4.6 | If INVESTIGATE: log gaps, iterate on failing scenarios | 10 min |

**LLM Judge Criteria (per agent run)**:
```typescript
interface AgentRunJudgeCriteria {
  taskCompleted: boolean;           // Did the agent finish the task?
  outputCorrect: boolean;           // Is the output factually correct?
  evidenceCited: boolean;           // Are claims backed by source refs?
  noHallucination: boolean;         // No fabricated facts or sources?
  toolsUsedEfficiently: boolean;    // No redundant tool calls?
  contractFollowed: boolean;        // Front-door → recon → work → ship pattern?
  budgetRespected: boolean;         // Within token/time budget?
  noForbiddenActions: boolean;      // No unsafe operations?
}
// Confidence = count of passing booleans / total (8)
```

**Output**: `evalRuns` + `evalResults` with per-scenario judge reasoning, pass/fail rates

---

### Phase 5: Learning Loop (4:00 – 5:00)
**Goal**: Extract patterns from failures, record learnings, iterate

| Step | Action | Duration |
|------|--------|----------|
| 5.1 | `get_improvement_recommendations` — identify top failure patterns | 5 min |
| 5.2 | For each failing scenario: root-cause analysis (5 whys) | 15 min |
| 5.3 | Apply targeted fixes to failing patterns | 20 min |
| 5.4 | Re-run failed scenarios only | 10 min |
| 5.5 | `compare_eval_runs` — confirm improvement | 5 min |
| 5.6 | `record_learning` — bank edge cases and gotchas | 5 min |

**Output**: Improved eval scores, learnings persisted, gap resolutions

---

### Phase 6: Synthesis & Verdict (5:00 – 6:00)
**Goal**: Cross-check all evidence, build proof pack, generate final verdict

| Step | Action | Duration |
|------|--------|----------|
| 6.1 | Aggregate all traces into proof pack | 5 min |
| 6.2 | Cross-check: app QA gates ∩ dogfood score ∩ agent eval pass rate | 10 min |
| 6.3 | Compute institutional verdict (aligned/watch/hallucination_risk) | 5 min |
| 6.4 | Generate QA report memo via LLM synthesis | 15 min |
| 6.5 | Store final proof pack + verdict in session | 5 min |
| 6.6 | Update control tower snapshot | 5 min |
| 6.7 | Publish results to `/dogfood` route evidence | 15 min |

**Verdict Logic**:
```
IF allGatesPassed AND dogfoodScore >= 80 AND agentEvalPassRate >= 0.8:
  verdict = "verified", confidence = 0.85+
ELIF anyP0Issues OR agentEvalPassRate < 0.5:
  verdict = "failed"
ELIF dogfoodScore < 70 OR agentEvalPassRate < 0.7:
  verdict = "needs_review"
ELSE:
  verdict = "provisionally_verified"
```

**Output**: Final proof pack, institutional verdict, QA report memo

---

## Convex Implementation

### Orchestrator: `convex/workflows/endToEndQa.ts`
- Convex action (not mutation — long-running)
- Uses `ctx.scheduler` for phase transitions (avoids 10-min action timeout)
- Each phase is a separate scheduled action
- Session ID threaded through all phases

### LLM Judge: `convex/domains/evaluation/agentRunJudge.ts`
- Wraps existing cost-optimized fallback chain
- Boolean-only criteria (no arbitrary floats)
- Returns structured `{ criteria: Record<string, boolean>, reasoning: string, confidence: number }`

### Phase Actions:
- `qaPhase1_setup` — Build, test, capture baselines
- `qaPhase2_appQa` — Gate evaluation with LLM-assisted subjective rules
- `qaPhase3_dogfood` — Gemini Vision QA orchestration
- `qaPhase4_agentEval` — Agent scenario execution + LLM judge
- `qaPhase5_learning` — Pattern extraction + iteration
- `qaPhase6_synthesis` — Cross-check + proof pack + verdict

### Budget Enforcement:
- 6-hour hard timeout via scheduler deadline
- Per-phase soft budgets (phase budget = remaining time / remaining phases)
- Token budget tracking in `agentTaskTraces.tokenUsage`

---

## Data Model Integration

```
agentTaskSessions (root — "6h QA Run")
  ├─ agentTaskTraces (one per phase)
  │   ├─ metadata.executionTraceDecisions (phase decisions)
  │   ├─ metadata.executionTraceVerificationChecks (gate results)
  │   ├─ metadata.executionTraceEvidence (evidence catalog)
  │   └─ metadata.executionTraceApprovals (if any gates need human review)
  │
  ├─ evalRuns (baseline + candidate runs)
  │   └─ evalResults (per-scenario with judge reasoning)
  │
  ├─ dogfoodQaRuns (Gemini Vision results)
  │   └─ issues[] (P0-P3 with route/evidence)
  │
  └─ proofPack (computed verdict)
      ├─ verdict: verified | provisionally_verified | needs_review | failed
      ├─ confidence: 0.05-0.99
      └─ evidence: gates + dogfood + agent eval + learnings
```

---

## Success Criteria

- [ ] All 6 phases execute without timeout
- [ ] Baseline eval captured and compared
- [ ] At least 4 quality gates run with results persisted
- [ ] Gemini Vision QA runs on 4 screenshot variants
- [ ] Agent eval covers 8+ scenarios with LLM judge grading
- [ ] Learning loop improves pass rate on at least 1 failing scenario
- [ ] Final proof pack verdict is defensible
- [ ] All results queryable via `getOracleControlTowerSnapshot`
