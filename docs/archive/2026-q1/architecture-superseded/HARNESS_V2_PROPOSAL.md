# NodeBench Agent Harness v2 — Architecture Proposal

> This document preserves the existing (v1) architecture side-by-side with
> proposed (v2) changes. Neither version is deleted. Both remain for
> interview walkthroughs and design review.

---

## Origin: Questions That Drove This Proposal

These are the exact questions asked during the architecture review session
(April 13, 2026) that revealed the gaps:

### Question 1 (Parallel Tracking + Task IDs)
> "Wouldn't we want to provide context as to which task are ran in parallel
> together. ie. both run_recon and founder_local_gather could have shown the
> same dependsOn: 'web_search' if they both ran in parallel sequentially after
> the web_search tool call. Also, wouldn't we want to label the task id or the
> ordering of these tasks and subtasks so that we can better trace track and
> show telemetry to which model was used for which tool call at which step."

### Question 2 (Parallel Subagents + Context Steering)
> "this would also be seriously important for when we implement any parallel
> subagents like codex and claude code and deer-flow, as well as important for
> when we need to insert and suddenly prioritize any new contexts user is
> sending to steer the conversation (refer to codex openai) or user is sending
> as a '/btw' (refer to claude code) side conversation."

### Question 3 (Trace Distillation)
> "how do these tool calls serve as context for the agent to make better
> decisions going forward, or get used by attrition.sh for distillation and
> possibly finetuning or training smaller language models like gemma 4?"

### Question 4 (Memory + Recall)
> "anything else to learn on the memory and recall side like openclaw 4.10
> update or the hermes agent architecture? search it all up."

---

## Quick Read Guide

This document is long because it is doing three jobs at once:

- preserving the current `v1` architecture
- proposing the future `v2` architecture
- explaining the reasoning behind the changes

If you try to read it straight through, it is heavier than it needs to be.

### The 2-minute version

In plain English, the proposal says:

1. The current harness is good enough to execute steps, but too weak at
   tracking structure, context, and cost.
2. `v2` should add better step structure:
   - `stepIndex`
   - `groupId`
   - richer `dependsOn`
   - model attribution
   - tokens and cost
   - explicit context injection
3. The bigger upgrade is not just execution. It is specification.
4. Before the harness plans work, the system should learn how the user actually
   works:
   - operating rhythms
   - recurring decisions
   - escalation rules
   - trusted sources
   - success criteria
5. That operator context should be typed, versioned, and continuously revised as
   the user's workflow changes.
6. The harness should support not only "answer this question" mode, but also
   "prepare me for an important interaction" mode.
7. The system should learn the user's judgment strongly, but learn tone and
   style lightly, so it does not overfit into corporate-speak or sycophancy.

### The 5 core ideas

If you only remember five things from this proposal, they should be:

- `v1` is preserved for comparison; `v2` is an extension, not a rewrite from
  scratch
- the missing layer is `Layer 0: Specification / Elicitation`
- memory alone is not enough; NodeBench needs `typed operator context`
- execution quality should follow task shape and use the cheapest safe runtime
- traces, artifacts, and saved context should compound over time

### Best reading paths

Pick one path instead of reading the entire document linearly.

**If you want the fastest possible understanding**

Read these sections in order:

1. [Part 10: Specification Gap and Elicitation Layer](#part-10-specification-gap-and-elicitation-layer)
2. [Part 2: Proposed Architecture (v2)](#part-2-proposed-architecture-v2)
3. [Part 11: Nine-Layer Walkthrough Appendix](#part-11-nine-layer-walkthrough-appendix)

**If you are implementing the harness**

Read these sections in order:

1. [Part 1: Existing Architecture (v1)](#part-1-existing-architecture-v1--do-not-modify)
2. [Part 2: Proposed Architecture (v2)](#part-2-proposed-architecture-v2)
3. [Part 5: Implementation Phases](#part-5-implementation-phases)
4. [Part 10: Specification Gap and Elicitation Layer](#part-10-specification-gap-and-elicitation-layer)

**If you are using this for interview or product framing**

Read these sections in order:

1. [Part 10: Specification Gap and Elicitation Layer](#part-10-specification-gap-and-elicitation-layer)
2. [Part 10.12-10.16: Anticipatory Intelligence](#1012-anticipatory-intelligence-in-plain-english)
3. [Part 10.21: Prevent style drift and voice overfitting](#1021-prevent-style-drift-and-voice-overfitting)
4. [Part 11: Nine-Layer Walkthrough Appendix](#part-11-nine-layer-walkthrough-appendix)

### What changed from v1 to v2

At a glance:

```text
v1
  ask -> plan -> execute -> synthesize

v2
  elicit -> normalize -> plan -> execute -> synthesize -> verify -> distill
```

And:

```text
v1
  memory and traces are helpful extras

v2
  operator context, trace quality, and saved artifacts are part of the core design
```

### What not to do

Do not start this document by reading every reference, every benchmark section,
and every legacy interface line-by-line.

The right approach is:

```text
understand the model first
then read the implementation and evidence sections
```

---

## Part 1: Existing Architecture (v1) — Do Not Modify

### 1.1 Current HarnessStep Interface

**File:** `server/agentHarness.ts` lines 28-35

```typescript
export interface HarnessStep {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  purpose: string;
  parallel?: boolean;  // Can run alongside other parallel steps
  dependsOn?: string;  // Wait for this step ID first
}
```

**Observations:**
- `parallel` is a boolean — no group concept. All `parallel: true` steps run together.
- `dependsOn` is a single string — can only depend on one prior step.
- No `stepIndex` — ordering is implicit from array position.
- No `model` — the step doesn't know which LLM it will use.
- No `groupId` — parallel steps can't be logically grouped.

### 1.2 Current HarnessPlan Interface

**File:** `server/agentHarness.ts` lines 37-43

```typescript
export interface HarnessPlan {
  objective: string;
  classification: string;
  entityTargets: string[];
  steps: HarnessStep[];
  synthesisPrompt: string;  // How to combine results into a packet
}
```

### 1.3 Current HarnessStepResult Interface

**File:** `server/agentHarness.ts` lines 45-52

```typescript
export interface HarnessStepResult {
  stepId: string;
  toolName: string;
  result: unknown;
  success: boolean;
  durationMs: number;
  error?: string;
}
```

**Observations:**
- No `model` field — when `run_recon` calls Gemini internally, that's invisible.
- No `tokensIn` / `tokensOut` — token consumption is untracked per step.
- No `costUsd` — cost is calculated globally, not per step.
- No `groupId` — can't identify which parallel batch this result belonged to.

### 1.4 Current Execution Logic

**File:** `server/agentHarness.ts` lines 2845-2929

The harness splits steps into three buckets:

```typescript
// Line 2846-2847
const readySteps = plan.steps.filter(s => !s.dependsOn);
const dependentSteps = plan.steps.filter(s => s.dependsOn);

// Lines 2850-2851: Further split ready steps
const parallelBatch = readySteps.filter(s => s.parallel);
const serialSteps = readySteps.filter(s => !s.parallel);
```

Execution order:
1. All `parallel: true` steps without `dependsOn` → `Promise.all()`
2. All `parallel: false` steps without `dependsOn` → sequential loop
3. All steps with `dependsOn` → sequential, only if dependency completed

**Key limitation:** Dependent steps run sequentially even if multiple share
the same dependency and could run in parallel together. There's no concept
of "parallel tier 2" — steps that depend on tier 1 but can run alongside
each other.

### 1.5 Current Model Configuration

**File:** `server/agentHarness.ts` lines 2345-2410

```typescript
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "gemini-3.1-flash-lite-preview": 32000,
  "gemini-3.1-flash-preview": 128000,
  "gemini-3.1-pro-preview": 128000,
  "claude-sonnet-4-6": 200000,
  "claude-opus-4-6": 200000,
};

const LATEST_MODELS = {
  gemini: { lite: "gemini-3.1-flash-lite-preview", flash: "gemini-3.1-flash-preview", pro: "gemini-3.1-pro-preview" },
  openai: { nano: "gpt-5.4-nano", mini: "gpt-5.4-mini", standard: "gpt-5.4", pro: "gpt-5.4-pro" },
} as const;

type TaskComplexity = "low" | "medium" | "high";

const GEMINI_MODELS: Record<TaskComplexity, ModelConfig> = {
  low:    { name: "gemini-3.1-flash-lite-preview", contextLimit: 32000,  timeoutMs: 15000 },
  medium: { name: "gemini-3.1-flash-preview",      contextLimit: 128000, timeoutMs: 30000 },
  high:   { name: "gemini-3.1-pro-preview",         contextLimit: 128000, timeoutMs: 60000 },
};
```

### 1.6 Current SSE Trace Format

**File:** `server/routes/search.ts` lines 2457-2477

```typescript
function traceStep(step: string, tool?: string) {
  const entry = { step, tool, startMs: Date.now(), status: "ok", detail: undefined };
  trace.push(entry);
  if (isStream) {
    res.write(`data: ${JSON.stringify({ type: "trace", entry })}\n\n`);
  }
  return {
    ok(detail?: string)    { entry.endMs = Date.now(); entry.status = "ok";    ... },
    error(detail?: string) { entry.endMs = Date.now(); entry.status = "error"; ... },
    skip(detail?: string)  { entry.endMs = Date.now(); entry.status = "skip";  ... },
  };
}
```

**What the frontend sees per step:**
```
{ type: "trace", entry: { step, tool, startMs, endMs, status, detail } }
```

No `model`, no `groupId`, no `stepIndex`, no `tokensIn`/`tokensOut`.

### 1.7 Current Pipeline (searchPipeline.ts)

**File:** `server/pipeline/searchPipeline.ts` lines 1008-1062

Four deterministic stages, no dynamic planning:
```
classify (sync) → search (async, Linkup) → analyze (async, Gemini) → package (async)
```

After completion, saves context to LRU cache (`searchContext.ts`, MAX_CONTEXTS=50)
for carry-forward on follow-up queries about the same entity.

### 1.8 Current Session Constants

**File:** `server/harnessRuntime.ts` lines 145-148

```typescript
const MAX_SESSIONS = 200;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes
const COMPACTION_THRESHOLD = 40;           // messages before auto-compact
```

---

## Part 2: Proposed Architecture (v2)

### 2.1 Proposed HarnessStep v2

```typescript
export interface HarnessStepV2 {
  // ── Identity ──
  id: string;                          // unique step ID (e.g., "s1", "s2a")
  stepIndex: number;                   // NEW: explicit execution tier (0, 1, 2...)
  groupId?: string;                    // NEW: parallel group name (e.g., "search", "analyze")

  // ── Tool ──
  toolName: string;
  args: Record<string, unknown>;
  purpose: string;

  // ── Dependencies ──
  dependsOn?: string[];                // FIX: array, not single string
  parallel?: boolean;                  // kept for backward compat

  // ── Model routing ──
  model?: string;                      // NEW: which LLM model to use for this step
  complexity?: TaskComplexity;         // NEW: auto-routes to model tier if model not set

  // ── Context injection ──
  injectPriorResults?: string[];       // NEW: step IDs whose results to inject as context
  acceptsSteering?: boolean;           // NEW: can this step receive mid-run user input?
}
```

**Why each new field exists:**

| Field | Answers which question | Why it matters |
|-------|----------------------|----------------|
| `stepIndex` | Q1 (task ordering) | Explicit tier for telemetry display |
| `groupId` | Q1 (parallel grouping) | "s2 and s3 are both in group 'analyze'" |
| `dependsOn: string[]` | Q1 (multi-dependency) | Step can wait for multiple prior steps |
| `model` | Q1 (model per step) | Trace exactly which LLM each step used |
| `complexity` | Q1 (auto-routing) | Falls back to GEMINI_MODELS[complexity] if no model set |
| `injectPriorResults` | Q2 (context passing) | run_recon receives web_search results |
| `acceptsSteering` | Q2 (mid-run steering) | User can inject context into this step |

### 2.2 Proposed HarnessStepResult v2

```typescript
export interface HarnessStepResultV2 {
  // ── Existing fields ──
  stepId: string;
  toolName: string;
  result: unknown;
  success: boolean;
  durationMs: number;
  error?: string;

  // ── New telemetry fields ──
  model?: string;             // NEW: actual model used (may differ from step.model after fallback)
  tokensIn?: number;          // NEW: input tokens consumed
  tokensOut?: number;         // NEW: output tokens produced
  costUsd?: number;           // NEW: estimated cost for this step

  // ── New grouping fields ──
  groupId?: string;           // NEW: which parallel group this ran in
  stepIndex?: number;         // NEW: which tier this ran at
  startedAt?: number;         // NEW: epoch ms when step began
  completedAt?: number;       // NEW: epoch ms when step finished

  // ── New context fields ──
  injectedContext?: string[]; // NEW: which prior step IDs were injected
  steeringApplied?: boolean;  // NEW: was user mid-run context applied?
}
```

**Why:** Every field needed for:
- Telemetry dashboard (model, tokens, cost per step)
- Distillation pipeline (model attribution for training data)
- Parallel visualization (groupId, startedAt/completedAt for Gantt chart)
- Mid-run steering audit (which steps received user injection)

### 2.3 Proposed Execution Logic v2 (Tiered Parallel)

```
CURRENT (v1):
  Bucket 1: all parallel=true, no dependsOn → Promise.all
  Bucket 2: all parallel=false, no dependsOn → sequential
  Bucket 3: all with dependsOn → sequential (even if shareable)

PROPOSED (v2):
  Group by stepIndex (tier):

  Tier 0: [web_search]                     → execute, wait for all
  Tier 1: [run_recon, founder_local]       → Promise.all (both depend on tier 0)
  Tier 2: [synthesize]                     → depends on tier 1

  If a step has dependsOn: ["s1", "s2"], it waits for BOTH to complete.
  Steps at the same tier with the same groupId run in Promise.all.

  After each tier completes:
    - Results stored in runContext Map
    - Next tier's steps receive injected context (if injectPriorResults set)
    - Check for user steering input (if acceptsSteering set)
```

### 2.4 Proposed SSE Trace Format v2

```typescript
// Plan event (NEW — emitted before execution starts)
{ type: "plan", plan: { objective, steps: [...], classification } }

// Step events (enriched)
{ type: "step_start", entry: {
    stepId, toolName, stepIndex, groupId, model, purpose,
    startedAt: number
  }
}
{ type: "step_done", entry: {
    stepId, toolName, stepIndex, groupId, model,
    durationMs, tokensIn, tokensOut, costUsd,
    success, preview, error?,
    completedAt: number
  }
}

// Mid-run steering (NEW)
{ type: "steering_applied", entry: {
    stepId, userMessage, injectedAt: number
  }
}

// Result (unchanged)
{ type: "result", payload: ResultPacket }
```

### 2.5 Proposed Context Injection Between Steps

```
CURRENT (v1):
  callTool(step.toolName, step.args)
  // Each step only sees its original args.

PROPOSED (v2):
  const enrichedArgs = { ...step.args };
  if (step.injectPriorResults?.length) {
    enrichedArgs._priorResults = {};
    for (const priorId of step.injectPriorResults) {
      enrichedArgs._priorResults[priorId] = runContext.get(priorId);
    }
  }
  if (step.acceptsSteering && pendingUserSteering) {
    enrichedArgs._steering = pendingUserSteering;
    pendingUserSteering = null;
  }
  callTool(step.toolName, enrichedArgs);
```

---

### 2.6 Proposed SourceRef Media Contract v2

This is intentionally separate from the planner.

The harness should decide which sources matter and preserve their metadata.
It should not become responsible for parsing HTML or finding thumbnail images.

#### Correct architectural split

- planner / harness
  - chooses sources
  - preserves proof metadata on `sourceRefs`
- fetch / enrichment
  - extracts image and site metadata from canonical URLs
- persistence
  - stores media candidates on reports, entities, and source events
- UI
  - renders real image collage if available
  - falls back to source mosaic or poster if not

#### Proposed `EnvelopeSourceRef` v2

```typescript
export interface EnvelopeSourceRefV2 {
  id: string;
  label: string;
  href?: string;
  type: "web" | "local" | "doc" | "trace" | "mcp_tool";
  confidence?: number;

  // NEW: source identity + media
  domain?: string;
  siteName?: string;
  faviconUrl?: string;
  thumbnailUrl?: string;
  imageCandidates?: string[];
  publishedAt?: string;
}
```

#### Why this belongs in v2

This solves a real product problem without polluting step execution:

- reports need real saved media, not fake placeholder covers
- entities need to aggregate recent source imagery into one card collage
- packets and envelopes should stay reusable across web, MCP, retention, replay, and export surfaces

#### Data origin for media

In order of trust and usefulness:

1. uploaded user evidence
2. provider-native search metadata (`thumbnailUrl`, article image, preview image)
3. fetch-time extraction from the canonical URL:
   - `og:image`
   - `twitter:image`
   - `og:site_name`
   - favicon / touch icon
4. fallback UI rendering with no claimed article image

#### Important rule

Do not make `HarnessStepV2` do HTML parsing or thumbnail discovery.

That work belongs to:

- search provider normalization
- fetch-time enrichment
- post-save hydration / backfill

This keeps v2 coherent:

- `HarnessStepV2` explains execution semantics
- `EnvelopeSourceRefV2` explains proof and display semantics

## Part 3: Inspirations — External Agent Architectures

Each pattern below is mapped to a specific v2 proposal field or behavior.

### 3.1 OpenClaw 4.10 — Active Memory + Dreaming

**What it is:** Four-layer memory (MEMORY.md → daily notes → SQLite vectors → Active Memory pre-reply sub-agent) plus background consolidation ("Dreaming") with 6-signal scoring.

**Key repo/docs:**
- Docs: https://docs.openclaw.ai/concepts/memory
- Changelog: https://www.vibesparking.com/en/blog/engineering/2026-04-11-openclaw-2026-4-10-changelog/
- Memory architecture deep dive: https://tonylixu.medium.com/openclaw-journey-eight-four-layer-memory-architecture-923d65abb3f5
- Dreaming guide: https://dev.to/czmilo/openclaw-dreaming-guide-2026-background-memory-consolidation-for-ai-agents-585e

**What NodeBench should adopt:**
- **Pre-reply entity recall** (Active Memory pattern): Before `generatePlan()`, query entity memory for prior findings. Inject as context into the plan prompt. Maps to v2's `injectPriorResults` concept.
- **Memory scoring for promotion** (Dreaming pattern): When entity memories accumulate, score by Relevance/Frequency/Recency. Promote high-scoring memories. Prune low-scoring ones. Maps to a new `memoryScore` field on entity records.

**Connection to user's question:** Q4 — "anything else to learn on the memory and recall side like openclaw 4.10 update"

### 3.2 Hermes Agent (Nous Research) — Skills as Procedural Memory

**What it is:** Self-improving agent that extracts reusable skills from successful runs. Three-file context (SOUL.md/MEMORY.md/USER.md). 47K+ GitHub stars.

**Key repo/docs:**
- GitHub: https://github.com/NousResearch/hermes-agent
- Architecture: https://hermes-agent.nousresearch.com/docs/developer-guide/architecture
- Skills system: https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- Memory: https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/
- Analysis: https://mranand.substack.com/p/inside-hermes-agent-how-a-self-improving

**What NodeBench should adopt:**
- **Skill extraction from eval-passing runs**: When the eval judge scores a run PASS, extract: `{ queryPattern, entityType, toolChain, planTemplate }` as a reusable skill. Load for similar future queries.
- **Three-file context pattern**: Maps to NodeBench's `CLAUDE.md` (SOUL), entity memory (MEMORY), user profile from Me surface (USER).

**Connection to user's question:** Q4 — "hermes agent architecture"

### 3.3 DeerFlow 2.0 (ByteDance) — Context Isolation for Sub-Agents

**What it is:** LangGraph 1.0-based SuperAgent harness. Sub-agents get scoped context. Filesystem as shared memory. 39K+ stars.

**Key repo/docs:**
- GitHub: https://github.com/bytedance/deer-flow
- Architecture: https://www.techbuddies.io/2026/03/25/deerflow-2-0-bytedances-open-source-superagent-harness-and-its-enterprise-tradeoffs/
- Deep dive: https://www.sitepoint.com/deerflow-deep-dive-managing-longrunning-autonomous-tasks/

**What NodeBench should adopt:**
- **Scoped context per sub-agent**: When parallel steps run (groupId), each gets only the context it needs — not the entire session history. Maps to v2's `injectPriorResults` (explicit, not all).
- **Debounced async memory writes**: Entity memory updates happen non-blocking after the response. Don't block the user waiting for DB writes.

**Connection to user's question:** Q2 — "important for when we implement any parallel subagents like codex and claude code and deer-flow"

### 3.4 OpenAI Codex (GPT-5.3) — Mid-Turn Steering

**What it is:** 400K token context with "Perfect Recall" attention. Phase metadata system for cumulative context. Mid-turn steering without context reset.

**Key docs:**
- Intro: https://openai.com/index/introducing-gpt-5-3-codex/
- Prompting guide: https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide
- Long horizon tasks: https://developers.openai.com/blog/run-long-horizon-tasks-with-codex

**What NodeBench should adopt:**
- **Phase metadata on trace steps**: Each step carries a `phase` field that persists across the run. If the user steers mid-run, the phase metadata ensures context isn't lost. Maps to v2's `stepIndex` + `acceptsSteering`.
- **Cumulative context (not replacement)**: When user sends "/btw" or steering input, it ADDS to context — doesn't replace the current plan.

**Connection to user's question:** Q2 — "when we need to insert and suddenly prioritize any new contexts user is sending to steer the conversation (refer to codex openai)"

### 3.5 Claude Code — /btw Side-Chain Pattern

**What it is:** Read-only context snapshot for side questions. Response NOT written back to main conversation. Reuses prompt cache.

**Key docs:**
- /btw explainer: https://www.mindstudio.ai/blog/claude-code-btw-command-save-tokens
- Context hygiene toolkit: https://pub.towardsai.net/mastering-claude-codes-btw-fork-and-rewind-the-context-hygiene-toolkit-5ceefa59623d
- Open issue (promote btw back): https://github.com/anthropics/claude-code/issues/37582

**What NodeBench should adopt:**
- **Side-chain query during active investigation**: User can ask a question about the active run without stopping it. The question sees the current context but doesn't pollute it.
- **JSONL session format with `parentUuid` and `isSidechain`**: Session storage format that supports branching and side-chains.

**Connection to user's question:** Q2 — "user is sending as a '/btw' (refer to claude code) side conversation"

### 3.6 Trace Distillation — Teacher-Student Pipeline

**What it is:** Convert agent execution traces into training data for smaller models. State of the art: span segmentation, quality filtering, ~18K samples.

**Key papers/repos:**
- FireAct (trajectory distillation): https://fireact-agent.github.io/
- Structured agent distillation: https://arxiv.org/html/2505.13820v3
- APIGen-MT (multi-turn): https://arxiv.org/html/2504.03601v4
- Cursor agent-trace standard: https://github.com/cursor/agent-trace
- Gemma 4 native function calling: https://developers.googleblog.com/bring-state-of-the-art-agentic-skills-to-the-edge-with-gemma-4/
- Gemma 4 finetuning guide: https://trenzo.tech/gemma-4-fine-tuning-guide-2026-run-train-deploy-googles-best-open-model/

**What NodeBench should adopt:**
- **Span segmentation**: Tag each trace step as "reasoning" (classify, plan) or "action" (tool call). Different loss weights during finetuning.
- **Quality filtering**: Only export traces where eval judge returned PASS.
- **Gemma 4 compatible export**: Use native 6-token function calling format.
- **TCWP bundle extension**: Our existing trajectory packaging system (`ta_tcwp_generate`) can be extended to export distillation-ready data.

**Connection to user's question:** Q3 — "get used by attrition.sh for distillation and possibly finetuning or training smaller language models like gemma 4"

---

## Part 4: Side-by-Side Comparison

### HarnessStep

```
v1 (CURRENT)                          v2 (PROPOSED)
─────────────                          ──────────────
id: string                             id: string
                                       stepIndex: number            ← NEW
                                       groupId?: string             ← NEW
toolName: string                       toolName: string
args: Record<string, unknown>          args: Record<string, unknown>
purpose: string                        purpose: string
parallel?: boolean                     parallel?: boolean
dependsOn?: string                     dependsOn?: string[]         ← FIX: array
                                       model?: string               ← NEW
                                       complexity?: TaskComplexity  ← NEW
                                       injectPriorResults?: string[]← NEW
                                       acceptsSteering?: boolean    ← NEW
```

### HarnessStepResult

```
v1 (CURRENT)                          v2 (PROPOSED)
─────────────                          ──────────────
stepId: string                         stepId: string
toolName: string                       toolName: string
result: unknown                        result: unknown
success: boolean                       success: boolean
durationMs: number                     durationMs: number
error?: string                         error?: string
                                       model?: string               ← NEW
                                       tokensIn?: number            ← NEW
                                       tokensOut?: number           ← NEW
                                       costUsd?: number             ← NEW
                                       groupId?: string             ← NEW
                                       stepIndex?: number           ← NEW
                                       startedAt?: number           ← NEW
                                       completedAt?: number         ← NEW
                                       injectedContext?: string[]   ← NEW
                                       steeringApplied?: boolean    ← NEW
```

### Execution Model

```
v1 (CURRENT)                          v2 (PROPOSED)
─────────────                          ──────────────
3 buckets:                             N tiers:
  parallel + no dep → Promise.all       Tier 0: [steps with stepIndex=0]
  serial + no dep → sequential           → Promise.all within tier
  has dep → sequential                  Tier 1: [steps with stepIndex=1]
                                          → wait for tier 0, then Promise.all
No context between steps               Tier N: ...
No mid-run steering                    Context injection via _priorResults
No plan event streamed                 Mid-run steering via _steering
                                       Plan event streamed before execution
```

### SSE Events

```
v1 (CURRENT)                          v2 (PROPOSED)
─────────────                          ──────────────
{ type: "trace" }                      { type: "plan" }             ← NEW
                                       { type: "step_start" }       ← NEW (richer)
                                       { type: "step_done" }        ← NEW (richer)
                                       { type: "steering_applied" } ← NEW
{ type: "result" }                     { type: "result" }
{ type: "error" }                      { type: "error" }
```

---

## Part 5: Implementation Phases

### Phase 1: Schema Extension (non-breaking)
Add new optional fields to `HarnessStep` and `HarnessStepResult`.
Existing code ignores optional fields — zero breakage.

**Files:**
- `server/agentHarness.ts` lines 28-60

### Phase 2: Tiered Execution
Replace 3-bucket logic with tier-based execution.
The tier is derived from `stepIndex` or computed from dependency graph.

**Files:**
- `server/agentHarness.ts` lines 2845-2929

### Phase 3: Context Injection
After each tier completes, inject results into next tier's steps
via `_priorResults` enrichment.

**Files:**
- `server/agentHarness.ts` `executeHarness` function

### Phase 4: SSE Enrichment
Emit `plan` event before execution. Enrich `step_start`/`step_done`
with model, tokens, cost, groupId, timestamps.

**Files:**
- `server/routes/search.ts` `traceStep` function (lines 2457-2477)

### Phase 5: Mid-Run Steering
Add steering endpoint. Queue user input. Apply to next `acceptsSteering` step.

**Files:**
- `server/routes/search.ts` (new endpoint)
- `server/harnessRuntime.ts` (steering queue on session)

### Phase 6: Memory Recall (OpenClaw pattern)
Before `generatePlan()`, query entity memory. Inject prior findings.

**Files:**
- `server/agentHarness.ts` `generatePlan` function
- `convex/domains/product/entities.ts` (new query)

### Phase 7: Skill Extraction (Hermes pattern)
After eval judge PASS, extract tool chain as reusable skill template.

**Files:**
- New: `server/lib/skillExtractor.ts`
- `packages/mcp-local/src/tools/skillUpdateTools.ts` (extend)

### Phase 8: Trace Distillation Export
Extend TCWP to export span-segmented, quality-filtered training data
in Gemma 4 function-calling format.

**Files:**
- New: `server/lib/traceDistillation.ts`
- Existing: TCWP bundle system

---

## Part 6: The Compounding Flywheel (v2 Goal)

```
  ┌─────────────────────────────────────────────────────┐
  │  User asks: "What is Ramp?"                         │
  │                                                      │
  │  BEFORE generatePlan():                              │
  │    1. Recall entity memory for "Ramp" (OpenClaw)     │
  │    2. Load relevant skill for company_search (Hermes)│
  │    3. Check trace cache for prior Ramp runs          │
  │                                                      │
  │  Plan + Execute + Synthesize (v2 tiered):            │
  │    Tier 0: [web_search, linkup_search]  ← parallel   │
  │    Tier 1: [run_recon, founder_local]   ← parallel   │
  │             injects: tier 0 results                  │
  │    Tier 2: [synthesize]                              │
  │             injects: tier 0 + tier 1 results         │
  │                                                      │
  │  AFTER completion:                                   │
  │    4. Save entity memory (carry-forward)             │
  │    5. If eval PASS: extract skill (Hermes)           │
  │    6. Export trace for distillation (Gemma 4)         │
  │    7. Push to attrition.sh for analysis              │
  │                                                      │
  │  RESULT:                                             │
  │    Run 1: Full pipeline, expensive ($0.10)           │
  │    Run 2: Entity memory + skill loaded, cheaper      │
  │    Run 10: Mostly cached, skill-optimized            │
  │    Run 100+: Gemma 4 fine-tuned, runs locally, free  │
  └─────────────────────────────────────────────────────┘
```

---

---

## Part 7: Planner Model Trade-offs (Flash Lite Preview vs Deeper Models)

### Question that prompted this section

> "What trade off are present when using the cheaper faster Gemini 3.1 Flash
> Lite versus slower higher cost models with deeper reasoning capabilities?"

### 7.1 Current: Most queries skip the LLM planner entirely

`generatePlan()` (line 2631) bypasses LLM planning for `company_search`, `competitor`,
`multi_entity`, `weekly_reset` — goes straight to deterministic `buildFallbackPlan()`.
The LLM planner only fires for uncommon/general queries.

### 7.2 The PEAR Benchmark (NeurIPS 2025) — the definitive finding

Source: [arxiv:2510.07505](https://arxiv.org/abs/2510.07505) — Michigan State + Microsoft, 84 tasks

```
A weak planner degrades system performance FAR MORE than a weak executor.

  Gemini-2.0-flash as planner → system utility ~30%
  Weak executor → ~50% drop (recoverable)
  Weak planner  → 30-60% drop (irrecoverable)
  Planner memory improves utility by 10-30%.
```

### 7.3 Known failure modes of cheap planners

1. **Missing dependencies** — can't reason about data flow between tools
2. **Wrong tool selection** — picks semantically similar but wrong tool from 350
3. **Shallow argument reasoning** — plausible-looking but incorrect args
4. **Single-path planning** — one plan, no alternatives or fallbacks

### 7.4 How other frameworks handle this

| Framework | Strategy | Source |
|-----------|----------|--------|
| DeerFlow | Different models per agent role | [github.com/bytedance/deer-flow](https://github.com/bytedance/deer-flow) |
| OpenClaw | Single model + rich memory (Dreaming fills the gap) | [docs.openclaw.ai](https://docs.openclaw.ai/concepts/dreaming) |
| Hermes | Skills replace planning (auto-extracted from runs) | [github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) |
| LangChain | Explicitly recommends powerful planner, cheaper executor | [comet.com](https://www.comet.com/site/blog/plan-and-execute-agents-in-langchain/) |

### 7.5 Agentic Plan Caching (NeurIPS 2025)

Source: [arxiv:2506.14852](https://arxiv.org/abs/2506.14852)

```
Cache successful plan templates keyed by classification:
  - 50.31% cost reduction
  - 27.28% latency reduction
  - 96.61% of optimal performance
  - 1.04% overhead

NodeBench already does this via buildFallbackPlan() — formalize it.
```

### 7.6 Cost analysis

These numbers are directional review-session estimates, not a permanent source
of truth. Google's public model catalog and pricing pages have drifted between
`Gemini 3.1 Flash Lite Preview` language and the more prominently listed
`Gemini 2.5 Flash-Lite` surface. Use this section for the trade-off logic, not
as a forever-stable pricing contract.

```
MODEL                            PLANNING COST/QUERY    AT 10K QUERIES/DAY
Gemini 3.1 Flash Lite Preview    $0.0004                $4/day
Gemini 3 Flash                   $0.0019                $19/day
Gemini 3 Pro                     $0.0085                $85/day

PEAR says a weak planner drops utility by 30-50%.
Saving $15/day is not worth losing half your answer quality.
```

Source: [Gemini API Pricing 2026](https://nicolalazzari.ai/articles/gemini-api-pricing-explained-2026)

### 7.7 Proposed v2 planner strategy

```
1. USE A STRONGER PLANNER LANE than Flash Lite Preview for uncached planning
   queries. Prefer Gemini 3 Flash or the current stable Google fast model.
2. KEEP FLASH LITE PREVIEW for execution-stage tasks (extraction, summarization,
   cheap validation) where the failure cost is lower.
3. ADD DETERMINISTIC PLAN VERIFIER (zero LLM cost):
     - Does each tool exist in registry?
     - Are dependsOn references valid?
     - Is dependency graph acyclic?
     - Are required args present per tool schema?
4. IMPLEMENT PLAN CACHING (50% cost reduction per NeurIPS paper).
5. FORMALIZE buildFallbackPlan() — log which templates succeed, retire those that don't.
```

Source for verifier pattern: [Plan-then-Execute (SAP)](https://community.sap.com/t5/security-and-compliance-blog-posts/plan-then-execute-an-architectural-pattern-for-responsible-agentic-ai/ba-p/14239753)

### 7.8 Advisor mode by design (dynamic routing)

Another useful framing for v2 is:

```text
do not run one model lane for every request
```

Harness v2 should be built with advisor mode by design.

Plain English:

```text
use a fast executive lane for most work
route to a deeper advisor lane only when the task is harder
```

This is the operational shape:

```text
FAST EXECUTIVE LANE
  default path
  - routine report generation
  - straightforward retrieval + synthesis
  - refresh runs with low ambiguity
  - formatting, extraction, packaging

DEEPER ADVISOR LANE
  invoked selectively
  - ambiguous planning
  - conflicting evidence
  - high-stakes synthesis
  - complex feature or architecture reasoning
  - comparative reasoning across many connected objects
```

Recommended escalation triggers:

- query classification is `plan_proposal`
- multi-entity or high-ambiguity retrieval produces weak confidence
- evidence conflicts across major sources
- the current run crosses a complexity budget
- the user explicitly asks to `go deeper`, `stress test`, `compare tradeoffs`,
  or `show me the reasoning`

Why this matters:

- it preserves cost and token efficiency on routine work
- it keeps the product responsive for normal usage
- it still gives the system a path to stronger reasoning when the task actually
  needs it

Important failure mode:

```text
the executive lane will not always know when to escalate
```

So v2 should support both:

- automatic escalation
- manual escalation from the user or operator UI

That means the product should have an explicit deepening path rather than
assuming the router is always correct.

Official precedent:

- Claude Code model configuration: `opusplan` uses `opus` during plan mode,
  then switches to `sonnet` for execution.
  Source: [Claude Code model config](https://code.claude.com/docs/en/model-config)
- Claude Code supports switching models during a session with `/model`.
  Source: [Claude Code slash commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)
- Claude Code also supports a distinct subagent model.
  Source: [Claude Code model config](https://code.claude.com/docs/en/model-config)
- OpenAI's closest official analogue is configurable reasoning effort, which is
  similar in spirit but not the same as a planner/executor split.
  Source: [OpenAI reasoning](https://developers.openai.com/api/docs/guides/reasoning)

Exact NodeBench equivalent:

```typescript
export interface HarnessRoutingDecision {
  routingMode: "executive" | "advisor";
  routingReason:
    | "default_fast_path"
    | "plan_proposal"
    | "high_ambiguity"
    | "evidence_conflict"
    | "high_stakes"
    | "user_forced_deeper_pass"
    | "recovery_after_failure";
  routingSource: "automatic" | "user_forced" | "operator_policy";
  plannerModel: string;
  executionModel: string;
  reasoningEffort?: "low" | "medium" | "high";
}
```

Recommended implementation shape:

```text
STEP 1: CLASSIFY THE RUN
  - company_search
  - plan_proposal
  - weekly_reset
  - pre_delegation
  - important_change
  - multi_entity
  - general

STEP 2: SCORE COMPLEXITY
  Inputs:
  - number of entities
  - ambiguity of the query
  - evidence conflict
  - number of connected artifacts involved
  - whether the user asked to go deeper

STEP 3: CHOOSE THE LANE
  executive lane:
    - default
    - fast model
    - lower reasoning effort

  advisor lane:
    - stronger planner model
    - higher reasoning effort
    - optional deeper synthesis model

STEP 4: PERSIST THE DECISION
  - attach routing metadata to the run
  - emit it over SSE
  - store it in trace artifacts

STEP 5: ALLOW OVERRIDE
  - user can force deeper pass from the UI
  - runtime can escalate after failure or low confidence
```

Recommended initial policy:

```text
EXECUTIVE BY DEFAULT
  - company_search
  - important_change
  - weekly_reset
  - straightforward refresh

ADVISOR BY DEFAULT
  - plan_proposal
  - multi_entity with 3+ targets
  - conflicting-evidence synthesis
  - pre-delegation or high-stakes packet generation

ESCALATE MID-RUN
  - tool failures invalidate the first plan
  - evidence confidence stays weak after initial retrieval
  - user presses "go deeper"
```

Verification contract:

```text
unit tests
  - route simple runs to executive
  - route hard runs to advisor
  - route explicit "go deeper" to advisor
  - preserve routing metadata on the run

integration tests
  - plan event shows routing mode
  - UI reflects executive vs advisor
  - steering can trigger advisor escalation

dogfood checks
  - one routine query stays fast
  - one ambiguous planning query escalates
  - one user-forced deeper pass works end to end
```

Evaluation contract:

```text
compare 4 lanes
  A. executive only
  B. advisor always
  C. dynamic advisor mode
  D. dynamic advisor mode + user-forced override

measure
  - answer quality
  - source coverage
  - section completeness
  - latency
  - token cost
  - escalation rate
  - forced-escalation rescue rate
  - false positive escalations
  - false negative escalations
```

Success condition:

```text
dynamic advisor mode should match or beat advisor-always quality on hard tasks
while materially reducing cost and latency on easy and medium tasks
```

---

## Part 8: Cache Freshness — TTL Policy for Entity Data

### Question that prompted this section

> "Given recency and data freshness needs, I notice every day or week there are
> updates and changes to the report or entity searched sources, LRU cache might
> not be enough when a chat session or report or entity source data become stale
> over time, should we consider TTL as a second layer to ensure data freshness,
> if so what is a solid TTL policy because too frequently then it gets too
> expensive, ideally something self-directed, autonomous, flexible, or latest
> industry competition widely accepted, how does the 6 external inspirations
> implementation pattern look like and what consensus should we draw upon?"

### 8.1 Current implementation — verified gaps

**File:** `server/lib/searchContext.ts`

```
GAP 1: Timestamp is write-only
  timestamp field saved (line 1056 of searchPipeline.ts) but NEVER checked.

GAP 2: Cache is write-only for synthesis
  generatePlan() and synthesizeResults() NEVER call getSearchContext().
  The cache is populated but never injected into subsequent runs.

GAP 3: No entity-level staleness
  productEntities has createdAt/updatedAt (record modification time)
  but no lastRefreshedFromSource or dataAge field.
```

### 8.2 How the 6 external systems handle freshness

```
SYSTEM           MECHANISM                         SOURCE
Perplexity       ML predicts re-index need.        aiplusautomation.com/blog/
                 ~50% citations current year.       perplexity-optimization-
                 3-6 month visibility drop.         complete-guide

OpenClaw 4.10    recencyHalfLifeDays config.       dev.to/czmilo/openclaw-
                 6-signal scoring (Recency=0.15).   dreaming-guide-2026
                 Stale snippets skipped.

Hermes           No explicit TTL. Gap.             hermes-agent.nousresearch.com

DeerFlow         Debounced async writes.           github.com/bytedance/deer-flow
                 No public TTL docs.

Codex            Implicit via context window.      developers.openai.com/codex
                 No explicit TTL.

MDPI 2025        Category-specific TTL. 30%        mdpi.com/2504-4990/8/2/30
                 staleness threshold. Dependency-
                 aware invalidation.

CONSENSUS: Perplexity + OpenClaw both use category-specific decay.
           MDPI formalizes this academically.
           Hermes + Codex don't solve it well.
```

### 8.3 Proposed TTL table by entity type

```
ENTITY TYPE          CHANGE VELOCITY    TTL        CONFIDENCE HALF-LIFE
Market data          Minutes            5-15 min   30 min
News / signals       Hours              1-4 hours  8 hours
Funding / M&A        Irregular          1 day      7 days
Company financials   Quarterly          7 days     30 days
Person data          Months             14 days    60 days
Product / tech       Weeks              7 days     21 days
Company metadata     Months             30 days    90 days
Regulatory / legal   Irregular          1 day      3 days
Static reference     Rarely             90 days    180 days
```

### 8.4 Confidence decay model (replaces hard TTL)

```
confidence(t) = base_confidence * e^(-lambda * age_hours)

Where lambda = ln(2) / halfLifeHours

Example: Company financials, base 0.85, half-life 720 hours (30 days)
  Day 0:   0.85
  Day 15:  0.60
  Day 30:  0.42  ← below 0.5 → flag "may be stale"
  Day 60:  0.21  ← below 0.3 → trigger background refresh
  Day 90:  0.11  ← below 0.15 → evict

Source: tianpan.co/blog/2026-04-09-semantic-caching-llm-production
```

### 8.5 Self-directed / adaptive TTL

```
1. QUERY-TIME FRESHNESS CLASSIFICATION
   Planner also emits: freshnessRequirement: "realtime" | "recent" | "reference"
   "Latest funding round?" → realtime (bypass cache)
   "What does Anthropic do?" → reference (use 30-day cache)

2. EVENT-DRIVEN INVALIDATION (for tracked entities)
   Subscribe to change feeds (Crunchbase, news APIs)
   Event detected → immediate cache invalidation, don't wait for TTL

3. THE 30% STALENESS METRIC (MDPI paper)
   Track: what % of cache hits serve data past 50% of TTL?
   If > 30% → shorten that entity type's TTL
   If < 10% → lengthen it. Self-tuning.
```

### 8.6 Proposed v2 cache architecture

```
v1 CURRENT                          v2 PROPOSED
In-memory LRU Map                   In-memory Map + SQLite persistence
50 entries max                      Unbounded (eviction by TTL + confidence)
No TTL                              Category-specific TTL per entity type
No confidence decay                 Exponential decay per entity-type half-life
Timestamp saved, never read         Timestamp checked on every read
Cache not injected into plan/synth  Injected into generatePlan context
No staleness tracking               lastRefreshedFromSource on entities
No event invalidation               Webhook-driven for tracked entities
No freshness classification         Planner emits freshnessRequirement

NEW TYPE:
  interface SearchContextEntryV2 extends SearchContextEntry {
    entityType: string;
    ttlMs: number;
    halfLifeHours: number;
    freshnessRequirement?: "realtime" | "recent" | "reference";
    lastRefreshedFromSource?: number;
    staleHitCount: number;
  }
```

---

## All Sources Referenced (Parts 7-8)

**Part 7 — Planner Trade-offs:**
- [PEAR Benchmark (arxiv:2510.07505)](https://arxiv.org/abs/2510.07505)
- [Agentic Plan Caching (arxiv:2506.14852)](https://arxiv.org/abs/2506.14852)
- [Gemini 3.1 Flash Lite Review](https://aimlapi.com/blog/gemini-3-1-flash-lite-review-2026-pricing-benchmarks-features-best-use-cases)
- [Gemini API Pricing](https://nicolalazzari.ai/articles/gemini-api-pricing-explained-2026)
- [Plan-then-Execute (SAP)](https://community.sap.com/t5/security-and-compliance-blog-posts/plan-then-execute-an-architectural-pattern-for-responsible-agentic-ai/ba-p/14239753)
- [DeerFlow](https://github.com/bytedance/deer-flow)
- [Hermes Agent](https://github.com/NousResearch/hermes-agent)
- [Plan-and-Execute LangChain](https://www.comet.com/site/blog/plan-and-execute-agents-in-langchain/)

**Part 8 — TTL and Freshness:**
- [Hierarchical Caching (MDPI 2025)](https://www.mdpi.com/2504-4990/8/2/30)
- [Perplexity Optimization 2026](https://aiplusautomation.com/blog/perplexity-optimization-complete-guide)
- [OpenClaw Dreaming 2026](https://dev.to/czmilo/openclaw-dreaming-guide-2026-background-memory-consolidation-for-ai-agents-585e)
- [Semantic Caching Production (TianPan.co)](https://tianpan.co/blog/2026-04-09-semantic-caching-llm-production)
- [Cache Freshness Real-Time (SIGCOMM 2024)](https://conferences.sigcomm.org/hotnets/2024/papers/hotnets24-21.pdf)
- [Cache Invalidation Agents (Sparkco)](https://sparkco.ai/blog/deep-dive-into-cache-invalidation-agents-in-2025)

## Part 9: Media Enrichment Lane v2 (Web + YouTube)

This section extends the `EnvelopeSourceRefV2` proposal with a dedicated
media-enrichment lane. It exists for interview walkthroughs because this is a
real product concern, but it should remain architecturally separate from
planner semantics.

### 9.1 Core Principle

Thumbnail selection is not planning.

The harness should:

- decide which sources matter
- preserve source refs
- keep proof lineage intact

The enrichment lane should:

- parse source metadata
- choose or validate preview media
- cache the result
- hydrate reports later if needed

This is the same design discipline as the rest of v2:

- planner = execution structure
- source refs = proof contract
- enrichment = preview quality
- UI = rendering

### 9.2 Current Operational Note: Gemini Alias Reality

As of April 13, 2026, this repo already uses
`gemini-3.1-flash-lite-preview` in multiple places for fast structured work
and QA. Example references in the repo:

- `packages/mcp-local/src/tools/founderTools.ts`
- `convex/domains/agents/autonomousCrons.ts`
- `docs/architecture/RUNBOOK.md`

However, Google's public docs are inconsistent:

- top-level catalog and pricing pages prominently show `Gemini 2.5 Flash-Lite`
- internal repo usage and some Google references still use
  `gemini-3.1-flash-lite-preview`

Practical rule:

- treat `gemini-3.1-flash-lite-preview` as a real preview alias already used
  by the system
- do not hardwire architecture to one unstable alias
- keep a fallback chain available (`gemini-2.5-flash-lite`,
  `gemini-2.5-flash`, etc.)

### 9.3 Correct Extraction Pipeline

For article and page sources:

1. provider-native metadata
2. DOM-based extraction from canonical page HTML
3. cheap deterministic filtering
4. LLM validation / ranking
5. screenshot fallback if no usable image survives
6. cache the final result by canonical URL

This keeps the pipeline cheap first, then smart, then durable.

### 9.4 Why Use an LLM Validator

Pure heuristics help with recall, but they are brittle for final selection.

Examples:

- hero image vs logo
- article image vs author avatar
- product screenshot vs marketing sprite
- which 2 to 4 images form the best collage for the saved report

The LLM should validate and rank from a supplied candidate set.
It should not invent image URLs.

Recommended role:

- input:
  - source title
  - source snippet
  - canonical URL
  - candidate image URLs
  - optional dimensions or MIME type
  - optional page screenshot or hero crop
- output:
  - `primaryImageUrl`
  - `collageImageUrls`
  - `rejectedImageUrls`
  - `reason`
  - `confidence`

Recommended first validator lane:

- primary: `gemini-3.1-flash-lite-preview`
- fallback: `gemini-2.5-flash-lite`
- escalation for ambiguous cases: `gemini-2.5-flash`

### 9.5 Proposed Video / YouTube Extension

NodeBench is not only a web-page report system. It should also support saved
research from videos and channels.

For YouTube sources, preserve more than a URL:

```typescript
export interface EnvelopeSourceRefV2 {
  // existing fields...
  sourceType?: "web" | "youtube" | "upload" | "doc";
  videoId?: string;
  channelTitle?: string;
  durationSeconds?: number;
  transcript?: string;
  transcriptSummary?: string;
  thumbnailCandidates?: string[];
}
```

YouTube-specific enrichment path:

1. normalize the watch URL and extract `videoId`
2. fetch real YouTube thumbnail candidates
3. fetch transcript via transcript API or equivalent service
4. summarize transcript for storage-efficient recall
5. let the validator choose:
   - best single thumbnail
   - best collage contribution relative to other saved sources

This is where NodeBench differs from a LinkedIn-style URL preview flow:

- LinkedIn mostly needs one correct preview image
- NodeBench needs a richer research artifact:
  - thumbnail
  - transcript context
  - report relevance
  - collage fit across heterogeneous sources

### 9.6 Interview Walkthrough Framing

If asked "why not just let the harness pick thumbnails?", the answer is:

> Because thumbnail selection is not planning. It is source enrichment. We
> want the harness to stay explainable and reusable, while the enrichment lane
> can evolve independently for web, YouTube, uploads, and future media types.

## Part 10: Specification Gap and Elicitation Layer

This proposal is now strong on execution, but it still needs to describe how
the system learns what the human actually means.

The missing architectural concern is not installation, UI polish, or tool
count. It is specification quality.

The system should not assume that every valuable user can already externalize:

- recurring decisions
- escalation rules
- evidence thresholds
- communication tone
- review cadence
- what "good" looks like

That is the tacit-knowledge gap. Harness v2 should explicitly close it.

### 10.1 Why this changes the proposal

Without an elicitation layer, the current story is:

```text
user asks question -> harness plans -> tools run -> result appears
```

That is too optimistic for real users.

For many founders, operators, investors, recruiters, and researchers, the
hardest problem is not asking one question. It is externalizing the judgment
framework behind the question.

So the proposal should move from:

```text
better execution harness
```

to:

```text
better specification-to-execution system
```

### 10.2 Two-loop model

Harness v2 should be described as two loops, not one:

```text
LOOP A: HUMAN SPECIFICATION LOOP
  elicit -> clarify -> normalize -> store -> refresh

LOOP B: EXECUTION LOOP
  plan -> execute -> synthesize -> verify -> distill
```

Loop A turns invisible judgment into reusable operating context.

Loop B executes against that context.

Important rule:

```text
operator context is not static
```

It should be treated as a living, revisable layer that changes as the user's:

- job changes
- customers change
- stakeholders change
- responsibilities expand
- standards evolve
- trust in the agent grows or narrows

### 10.3 Markdown OS idea, adapted for NodeBench

The OpenClaw-style "markdown operating system" is directionally useful, but it
should not become the canonical runtime contract in this codebase.

Correct split for NodeBench:

```text
Markdown / memo / notes
  = human-editable authoring surface

Typed Convex records
  = canonical runtime source of truth

Harness
  = consumer of normalized operator context
```

That preserves:

- editability for humans
- queryability for the system
- auditability for interviews and trust
- consistency across web, MCP, and future agent surfaces

### 10.4 Proposed first-class objects

```typescript
export interface OperatorContextPacket {
  contextId: string;
  contextVersion: number;
  supersedesContextId?: string;
  operatorId: string;
  operatorProfile: {
    role?: string;
    preferredTone?: string;
    preferredLens?: string;
    communicationStyle?: string;
  };
  trustedStakeholders?: string[];
  recurringGoals?: string[];
  workflowRhythms: string[];
  decisionPolicies: string[];
  escalationPolicies: string[];
  heartbeatRules: string[];
  frictionPatterns?: string[];
  preferences: string[];
  unresolvedAreas: string[];
  changeReason?: string;
  validFrom: string;
  validTo?: string;
  lastObservedAt?: string;
  lastConfirmedAt?: string;
  confidenceByRule?: Array<{
    rule: string;
    confidence: number;
    source: "explicit" | "observed" | "imported" | "inferred";
  }>;
  sourceRefs: EnvelopeSourceRefV2[];
  updatedAt: string;
}

export interface ElicitationSession {
  sessionId: string;
  operatorId: string;
  prompts: string[];
  extractedRules: string[];
  candidatePolicies: string[];
  ambiguities: string[];
  confidence: number;
  createdAt: string;
}

export interface OperatingMemo {
  soul?: string;
  identity?: string;
  userContext?: string;
  heartbeat?: string;
  constraints?: string;
  editableMarkdown: string;
  normalizedContextRef: string;
}
```

### 10.5 Planning input changes

The planner should no longer read only:

- query
- classification
- session context
- cached entity context

It should read:

```typescript
export interface HarnessPlanInputV2 {
  query: string;
  classification?: string;
  operatorContext?: OperatorContextPacket;
  successCriteria?: string[];
  knownConstraints?: string[];
  delegationPolicy?: string[];
  heartbeatState?: string[];
  priorSessionContext?: string[];
}
```

This is the direct architectural response to the specification gap:

- if the user is under-specified, the system leans harder on elicited context
- if the user is highly explicit, the system can plan with less interpolation

### 10.6 First agent role: interviewer before executor

This proposal should explicitly recognize a new first agent role:

```text
interviewer / elicitor
  before
assistant / executor
```

The interviewer agent should help the user extract:

- recurring tasks
- recurring decisions
- escalation triggers
- trusted evidence sources
- writing preferences
- operating rhythms
- places where work repeatedly gets stuck

That output becomes reusable operator context for the execution harness.

### 10.7 Interview framing

If asked "what changes in Harness v2 after this addition?", the answer is:

> Harness v2 is no longer just a planner and executor. It is an execution
> harness powered by an elicitation layer that turns tacit user judgment into
> reusable, typed operating context.

### 10.8 Onboarding should be seamless and optional

The product should not force users into a heavy setup ceremony before they can
get value.

Plain-English rule:

```text
Let the user start immediately.
Use the agent to learn in the background.
Only ask for more context when it clearly improves the next step.
```

That means elicitation should be:

- optional at first
- useful from the first minute
- progressive rather than front-loaded
- easy to skip and easy to revisit later

Good onboarding behavior:

- the user can ask or upload something immediately
- the system gives a useful answer right away
- the system offers a lightweight follow-up prompt when better context would help
- the system keeps learning from use instead of forcing a giant setup form

### 10.9 Elicitation should happen before, during, and after use

This should not be a one-time interview only.

The better model is continuous elicitation:

```text
before use:
  lightweight setup, preferences, role, goals

during use:
  learn from what the user asks, edits, saves, reopens, and ignores

after use:
  summarize patterns, ask clarifying questions, update operating context
```

Plain-English meaning:

- the first run should work without much setup
- later runs should get smarter because the system observes patterns
- the system should occasionally ask short, high-value clarification questions
- the operator context should improve over time, not stay frozen
- the system should detect when old specifications no longer match current work
- the system should allow revision, supersession, and drift over time

### 10.10 Transcript ingestion should be permissioned and useful

The system should be allowed to learn not just from a single prompt, but from
actual work history when the user gives permission.

That includes:

- NodeBench chat logs on `nodebenchai.com`
- saved reports, notes, and reopen history
- optional external transcripts such as Claude Code JSONL logs when the user is
  using `nodebench-mcp`

Plain-English rule:

```text
No silent import.
No hidden surveillance.
Only permissioned transcript ingestion.
```

What the agent should extract from those logs:

- operating rhythms
- recurring decisions
- friction points
- repeated objections
- preferred writing patterns
- evidence standards
- common follow-up moves

The point is not to archive everything forever.

The point is to turn repeated behavior into a searchable, reusable operating
context database that helps the next agent run better.

That database should be treated as versioned operating context, not a single
permanent profile.

### 10.11 What this means for NodeBench and nodebench-mcp

This creates one shared story across both surfaces:

```text
NodeBench AI
  learns from chats, reports, notes, and reopen behavior

nodebench-mcp
  can optionally ingest external work transcripts with permission

both
  feed the same operator context layer
```

That means the operator should not have to start from zero in every surface.

If the user has already shown:

- how they evaluate a company
- how they prep for meetings
- how they write follow-ups
- what they consider risky

then the next run should already know that.

### 10.12 Anticipatory intelligence, in plain English

There is one more shift this proposal should make.

The system should not only answer questions after the user asks them.
It should also help the user walk into important interactions already prepared.

Plain-English version:

```text
Before a call, meeting, negotiation, interview, or outreach message,
NodeBench should already know enough to prepare the user.
```

That means the product should be able to help with questions like:

- "Prep me for tomorrow's investor call."
- "What is this customer likely to push back on?"
- "What should I say first?"
- "What facts should I have ready?"
- "What are my strongest points and my weak spots?"
- "If this conversation goes sideways, what is the fallback?"

This is not "magic smartness."

It is:

- saved context
- recent research
- likely counterparty questions
- likely objections
- recommended next moves

assembled before the interaction happens.

### 10.13 The output should be a simple pre-interaction brief

Instead of describing this as abstract intelligence, the proposal should name
the object clearly.

Plain-English name:

```text
Interaction Prep Brief
```

What it should contain:

- who the interaction is with
- why it matters
- what the other side probably cares about
- what they are likely to ask
- what they are likely to challenge
- what evidence the user should have ready
- the best opening move
- the best backup plan
- what to do right after the interaction

Simple structure:

```text
Interaction Prep Brief
  - interaction type
  - counterparts
  - objective
  - stakes
  - likely questions
  - likely objections
  - strongest points
  - evidence to keep ready
  - recommended opening
  - fallback positions
  - red lines
  - follow-up actions
```

### 10.14 How this changes the harness

This means the harness should support two operating modes:

```text
1. answer mode
   user asks a question and gets a report

2. prep mode
   user asks for preparation ahead of an interaction
```

In prep mode, the harness should not wait until the last minute to think.

It should be able to:

- pull the latest changes on the company or person
- load the user's prior notes and saved reasoning
- identify likely objections or concerns
- prepare a recommended opening
- prepare backup responses
- draft the follow-up message before the interaction happens

This is the practical meaning of "walk into the room already prepared."

### 10.15 Why this matters for the proposal

This addition strengthens the proposal in a simple way:

```text
old story:
  the system answers well

better story:
  the system helps the user prepare before high-stakes moments
```

That is a more valuable product behavior for the end users this system is meant
to serve.

### 10.16 Simple example

Example request:

```text
"Prep me for tomorrow's call with Ramp."
```

Plain-English system behavior:

```text
1. Load the user's saved context about Ramp
2. Load the latest report and recent changes
3. Pull recent sources that matter
4. Summarize what changed since the last conversation
5. Predict likely questions or objections
6. Suggest the best opening
7. Suggest the best fallback if the call gets difficult
8. Draft the follow-up note or email in advance
```

That is the anticipatory behavior this proposal should now explicitly support.

### 10.17 Versioned operator context fields

Because the operator's workflow changes over time, the context object should
carry explicit versioning and drift fields.

Plain-English meaning:

- every important change should create or update a context version
- the system should know what changed, why it changed, and when it became true
- the system should distinguish:
  - explicitly stated preferences
  - observed behavior
  - imported transcript patterns
  - inferred rules that still need confirmation

Most important fields:

- `contextVersion`
  - which version of the operator's working style this run is using
- `supersedesContextId`
  - what earlier context version this one replaces
- `changeReason`
  - why the change happened
  - examples: `new manager`, `changed sales motion`, `customer mix changed`
- `validFrom`
  - when the system should start trusting this version
- `lastObservedAt`
  - when the system last saw real behavior supporting this rule
- `lastConfirmedAt`
  - when the human last explicitly confirmed it
- `confidenceByRule`
  - which rules are solid vs tentative

This turns operator context into a living record, not a frozen profile.

### 10.18 Example of an evolving user workflow over time

The easiest way to understand this is to map one user from day 0 onward.

```text
DAY 0
  User lands in NodeBench with no setup.
  Action:
    - asks a question
    - uploads a file
  System learns:
    - rough topic area
    - preferred starting lens
    - whether the user values speed or depth
  Variables that may change:
    - preferredLens
    - recurringGoals (first draft)
    - confidenceByRule (very low)

DAY 1 TO DAY 3
  User asks similar questions repeatedly.
  Action:
    - reopens the same reports
    - edits summaries
    - ignores some suggestions
  System learns:
    - what the user actually cares to keep
    - what language they rewrite
    - what evidence they trust
  Variables that may change:
    - decisionPolicies
    - trustedStakeholders
    - trusted evidence sources
    - preferredTone
  Conditions:
    - repeated edits in the same direction
    - repeated report reopen behavior
    - repeated source selection patterns

WEEK 1
  User begins relying on the app for recurring work.
  Action:
    - asks for follow-ups
    - saves reasons like 'customer prep' or 'job target'
    - uses notes and report updates
  System learns:
    - recurring workflows
    - recurring decision thresholds
    - friction points
  Variables that may change:
    - workflowRhythms
    - escalationPolicies
    - heartbeatRules
    - frictionPatterns
  Conditions:
    - same task pattern appears 3+ times
    - same objection or risk appears repeatedly
    - same follow-up action is repeatedly taken

WEEK 2 TO MONTH 1
  User starts using NodeBench as preparation before real interactions.
  Action:
    - asks for prep briefs
    - drafts outreach
    - reviews likely objections
    - uses saved notes before calls
  System learns:
    - what a good prep brief looks like for this operator
    - what openings they prefer
    - when they want assertive vs cautious outputs
  Variables that may change:
    - communicationStyle
    - preferredTone
    - recurringGoals
    - successCriteria
  Conditions:
    - strong edit patterns on prep drafts
    - repeated reuse of certain brief sections
    - positive follow-through on suggested actions

MONTH 2+
  User's job or environment starts changing.
  Action:
    - new customers
    - new manager or stakeholders
    - new sales motion
    - new reporting responsibilities
  System should not assume the old context is still correct.
  Variables that may change:
    - role
    - trustedStakeholders
    - decisionPolicies
    - escalationPolicies
    - heartbeatRules
    - recurringGoals
  Conditions:
    - transcript imports show new counterpart types
    - repeated edits contradict old rules
    - user explicitly states a new goal or new responsibility
    - the system sees older rules being ignored repeatedly

ROLE OR WORKFLOW SHIFT
  Example:
    - founder becomes more investor-facing
    - recruiter starts using the system for customer discovery too
    - operator now has to brief executives instead of peers
  System response:
    - create a new context version
    - mark earlier assumptions as superseded
    - ask a short clarification sequence
    - lower confidence on stale rules until reconfirmed
  Variables that should change:
    - contextVersion
    - supersedesContextId
    - changeReason
    - validFrom
    - confidenceByRule
```

### 10.19 Conditions that should trigger context revision

The system should revise operator context under clear conditions, not randomly.

Good triggers:

- the user repeatedly rewrites outputs in the same way
- the user repeatedly ignores one class of recommendation
- the user starts asking a new category of questions
- saved reasons for reports change meaningfully
- imported transcripts show a different tone or workflow
- a new stakeholder or customer type appears often
- the user explicitly says their job or priorities changed
- the last-confirmed context is old and current behavior no longer matches it

Practical rule:

```text
observe drift -> suggest revision -> confirm when needed -> version the context
```

That keeps the system adaptive without making it unstable.

### 10.20 Plain-English cross-reference to Hermes, DeerFlow, and OpenClaw

This proposal is not inventing the whole pattern from scratch. Other agent
systems already validate parts of it.

In plain English:

- [Hermes Agent](https://github.com/NousResearch/hermes-agent) is the clearest
  example of the idea that an agent should grow with the user over time. Its
  public repo and April 2026 release line describe persistent memory, user
  profiles, context files, and a built-in learning loop. That is close to the
  "the system learns your operating style" part of this proposal.
- [OpenClaw](https://github.com/openclaw/openclaw) is the clearest example of
  file-based operating context. Its repo centers prompt and workspace files
  such as operating instructions, and its [April 2026 releases](https://github.com/openclaw/openclaw/releases)
  added stronger memory search, imported chat handling, and more durable memory
  plumbing. That is close to the "markdown operating system" part of this
  proposal.
- [DeerFlow](https://github.com/bytedance/deer-flow) is the clearest example of
  a strong execution harness. Its public 2.0 repo framing emphasizes
  sub-agents, long-term memory, context engineering, setup, and tool
  orchestration. That is close to the "plan well, execute well, manage context
  well" part of this proposal.

What NodeBench should take from that:

- Hermes validates the idea that the system should learn from repeated use.
- OpenClaw validates the idea that operating context can live in human-readable
  files and imported conversations.
- DeerFlow validates the idea that execution quality depends on a disciplined
  harness, not just a powerful model.

What NodeBench should add that is still missing in most of those systems:

- typed operator context instead of only loose memory or prompt files
- versioned context that can change as the user's job and workflow change
- permissioned learning from NodeBench chats, saved reports, and optional
  external transcripts
- explicit binding between operator context and real work products such as
  reports, prep briefs, search runs, and future delegated agent tasks

That means when this proposal says the system learns things like:

- rough topic area
- preferred starting lens
- whether the user values speed or depth

it should not leave those as vague impressions.

They should become explicit fields in the operator-context layer:

- in the Hermes direction, they act like durable user profile and memory
- in the OpenClaw direction, they act like operating instructions and imported
  context
- in the DeerFlow direction, they act like setup choices and execution
  preferences
- in NodeBench, they should become typed, revisable, and usable by the harness
  at planning time

That is the real difference:

```text
memory is helpful
but versioned operator context is better
```

### 10.21 Prevent style drift and voice overfitting

There is a real failure mode here.

If the system learns too aggressively from chats, reports, and imported
transcripts, it can start sounding like the user's workplace at its worst:

- memo-speak
- filler
- hedging
- fake diplomacy
- jargon for its own sake
- overly agreeable "yes, exactly" behavior

That is not intelligence. That is style overfitting.

The system should learn different things with different strength:

```text
judgment and workflow     -> learn strongly
stakeholders and sources  -> learn carefully
voice and tone            -> learn lightly
```

Plain-English rule:

```text
learn the user's judgment deeply
learn the user's tone lightly
do not learn the company's bad habits by default
```

What this means in product terms:

- the system should remember decision thresholds, trusted sources, recurring
  tasks, stakeholders, and escalation rules more strongly than it remembers
  writing style
- tone should be optional, reversible, and scoped to the surface where it is
  actually useful
- imported transcripts should default to extracting workflow patterns, not
  blindly copying voice

Practical guardrails:

- keep `decision memory` separate from `voice memory`
- make voice learning opt-in, not automatic
- store explicit negative preferences such as:
  - avoid corporate speak
  - avoid filler
  - avoid fake enthusiasm
  - avoid unnecessary jargon
- give style memory a shorter decay window than workflow memory
- scope style by surface:
  - chat
  - report
  - prep brief
  - email draft
  - social post
- learn more from user edits than from raw transcripts
- show the user why a tone pattern was learned and let them reset it
- run a final lint pass for jargon, sycophancy, and memo-speak before output

Industry signal:

- OpenAI publicly hit an adjacent problem with GPT-4o. After an update on
  April 25, 2025, OpenAI said on April 29, 2025 that it had reverted the most
  recent GPT-4o update due to overly agreeable or sycophantic behavior. That is
  the same family of problem: a model becoming too eager to mirror and please.
- Anthropic addresses part of this by making styles explicit and switchable,
  while keeping memory optional and user-controlled.
- Earlier GPT-4o was often preferred because it felt warm and fluid, but the
  lesson is not "be more flattering." The lesson is "keep warmth without losing
  balance."

What NodeBench should do differently:

- treat tone as a lightweight layer on top of the real operating model
- persist style only when there is repeated evidence and user confirmation
- keep a neutral fallback voice that is clear, direct, and non-corporate
- let the harness use operating context at planning time without forcing all
  outputs into one fixed persona

If we do this well, the system gets more useful over time without turning into
an overfit corporate clone.

### 10.22 Agent design tradeoffs to keep explicit

Another useful lesson from adjacent repos is that the most helpful architecture
docs do not just list components. They explain the tradeoffs behind the agent
design.

These are the tradeoffs this proposal should keep explicit.

#### Canonical data plane first, retrieval second

NodeBench is not mainly a retrieval demo.

It needs a system that can hold:

- sessions
- reports
- entities
- nudges
- files
- shared context
- eval artifacts
- replay and trace artifacts

That pushes the architecture toward:

```text
canonical product state first
retrieval specialization second
```

Practical implication:

- Convex remains the canonical product and workflow state layer
- search, GraphRAG, or any future retrieval layer supports the product instead
  of replacing the system of record

#### The missing layer is specification, not just runtime choice

The weak question is:

```text
which runtime is best?
```

The stronger question is:

```text
can the system capture how the user actually works?
```

That is why this proposal now includes:

- Layer 0 operator context
- continuous elicitation
- permissioned transcript ingestion
- versioned operating context

The correct sequence is:

```text
elicit workflow
  -> store operator context
  -> choose the cheapest safe runtime
  -> execute
  -> verify
  -> reuse
```

#### Runtime choice should follow task shape

Not every request deserves the same runtime.

Current design rule:

- use deterministic or mostly deterministic paths when the job is structured
- use fast model-plus-tool paths for routine search, classification, and
  summarization
- use stronger synthesis only when ambiguity, multimodal evidence, or wider
  context actually requires it
- use richer orchestrator-worker patterns only when the workflow truly exceeds
  a simpler harness

Plain-English rule:

```text
do not spend pro-model cost on a problem a well-specified cheaper path can solve
```

#### Durable streaming is better than disposable streaming

Fast token streaming is good for demos.

Durable streaming is better for a real operator product.

What matters more here:

- persisted sessions
- replayable step traces
- saved artifacts
- source visibility
- resumable state across surfaces

That is more valuable than a fast but disposable token stream.

#### Memory is useful, but typed operator context is better

Generic memory helps, but it is not the final shape.

NodeBench should not stop at:

- vague memory
- raw transcripts
- prompt files alone

It should move toward:

- explicit operator context
- versioned context
- drift-aware revision
- planning-time use of that context

That is the architectural upgrade from "memory" to "operating model."

#### Prototype truth should stay separate from production ambition

The docs should stay honest about three different things:

- what exists today
- why it was designed that way
- what should change in production

That means:

- README explains the current NodeBench product and current roadmap
- this proposal explains the forward-looking harness and operator-context model
- legacy walkthrough docs preserve older architecture for comparison

That separation keeps the system easier to reason about and easier to explain.

## Part 11: Nine-Layer Walkthrough Appendix

This appendix copies the current interview-friendly ASCII walkthrough from
`docs/architecture/NINE_LAYER_WALKTHROUGH.md` so the harness proposal can be
walked through on its own, with the new specification layer made explicit.

Scope note:
- `NINE_LAYER_WALKTHROUGH.md` remains the legacy/current baseline walkthrough for comparison and historical context.
- This appendix intentionally extends beyond that legacy framing for proposal purposes by adding Layer 0, operator context, and the specification-first model.

### 11.1 The 9 layers plus Layer 0

```text
LAYER                    WHAT IT DOES                          WHERE IT LIVES
-----                    ------------                          --------------

0. SPECIFICATION         Interviewer agent captures and       convex/domains/operator/              (proposed)
   / ELICITATION         refreshes, revises, and versions     server/lib/elicitation/              (proposed)
                         tacit workflow, decision rules,      src/features/me/operatingContext/    (proposed)
                         heartbeat rules, transcript signals,
                         and normalized operator context as
                         the user's workflow changes

1. FRONTEND              5 screens the user sees               src/features/{home,chat,reports,nudges,me}/
   (React + Vite)        nav, cards, search bar, editor        src/layouts/
                                                               src/components/

2. SERVER                HTTP routes, streaming,               server/
   (Express + SSE)       voice, search pipeline                server/routes/
                         WebSocket MCP gateway                 server/pipeline/

3. SERVICES              The brains: search pipeline,          server/pipeline/searchPipeline.ts
   (pipeline logic)      query routing, result assembly,       server/lib/searchContext.ts
                         evidence grading, caching             server/lib/multiSearch.ts

4. AGENTS                LLM-orchestrated tool planning:       server/agentHarness.ts   (plan + execute + synthesize)
   (LLM orchestration)   Gemini decides which tools to call,   server/harnessRuntime.ts (session + multi-turn)
                         in what order, then synthesizes       server/pipeline/searchPipeline.ts (5-node state machine)
                         results into a structured report      server/lib/searchContext.ts (carry-forward LRU cache)

5. DATABASE              Realtime DB, file storage,            convex/domains/product/
   (Convex)              scheduled jobs, auth                    reports.ts    (saved reports)
                         The canonical data layer                chat.ts       (sessions + events)
                                                                 entities.ts   (companies/people)
                                                                 nudges.ts     (return triggers)
                                                                 me.ts         (profile + files)

6. SECURITY              Input validation, SSRF guard,         packages/mcp-local/src/security/
   (3 guard layers)      output filtering, rate limiting       server/mcpAuth.ts

7. EVALUATION            Golden test sets, offline eval,       packages/mcp-local/src/benchmarks/
   (quality gates)       online monitoring, LLM judge          scripts/eval-harness/
                         "Did we give a good answer?"          tests/

8. OBSERVABILITY         Per-stage tracing, cost tracking,     server/pipeline/ (trace emission)
   (see what happened)   error logging, milestone timing       convex/domains/product/chat.ts
                         "What happened inside this run?"      (tool events, source events)

9. MCP TOOLS             local MCP packages expose             packages/mcp-local/
   (agent interface)     ~350 tools for AI agents;            packages/mcp-client/
                         public unified server currently       packages/mcp-admin/
                         exposes 101 remote tools
```

### 11.2 v1 vs v2 Harness Shape at a Glance

```text
QUESTION: "What is Ramp and why does it matter?"

V1 INPUT                                        V2 INPUT
--------                                        --------
query                                           query
session                                         session
classification                                  classification
cached context                                  cached context
                                                operatorContext
                                                successCriteria
                                                knownConstraints
                                                delegationPolicy
                                                heartbeatState

V1 SHAPE (current / simplified)                 V2 SHAPE (proposed)
--------------------------------                --------------------------------
HarnessPlan {                                   HarnessPlanV2 {
  steps: [                                        steps: [
    {                                                {
      tool: "web_search",                              id: "s1",
      args: { query: "Ramp fintech" }                  stepIndex: 0,
    },                                                 groupId: "discover",
    {                                                  toolName: "web_search",
      tool: "run_recon",                               args: { query: "Ramp fintech" },
      dependsOn: "web_search"                          purpose: "Find recent external sources"
    },                                               },
    {                                                {
      tool: "founder_local_gather",                    id: "s2",
      parallel: true                                   stepIndex: 1,
    }                                                  groupId: "analyze",
  ]                                                    toolName: "run_recon",
}                                                      dependsOn: ["s1"],
                                                       injectPriorResults: ["s1"],
Trace shape:                                           model: "gemini-3.1-flash-lite-preview"
  - traceStep(step, tool)                            },
  - status: ok/error/skip                            {
  - startMs / endMs                                    id: "s3",
  - no groupId                                         stepIndex: 1,
  - no stepIndex                                       groupId: "analyze",
  - no model attribution                               toolName: "founder_local_gather",
  - no tokens/cost                                     dependsOn: ["s1"],
                                                       injectPriorResults: ["s1"],
                                                       acceptsSteering: true
                                                     },
                                                     {
                                                       id: "s4",
                                                       stepIndex: 2,
                                                       groupId: "synthesize",
                                                       toolName: "synthesize_report",
                                                       dependsOn: ["s2", "s3"],
                                                       injectPriorResults: ["s1", "s2", "s3"]
                                                     }
                                                   ]
                                                 }

                                                 Trace shape:
                                                   - plan event before execution
                                                   - step_start / step_done
                                                   - stepId + stepIndex + groupId
                                                   - model attribution
                                                   - tokensIn / tokensOut / costUsd
                                                   - steering / injected-context audit
```

### 11.3 How a single question flows through all 9 layers plus Layer 0

```text
USER: "What is Ramp and why does it matter?"

   Layer 0  SPECIFICATION    Before, during, and after this question,
      |      / ELICITATION   the system continuously learns from:
      |                        - short elicitation prompts
      |                        - prior and recent NodeBench chats
      |                        - saved reports, edits, and reopen behavior
      |                        - optional permissioned transcript imports
      |                      It keeps updating the operator's current working
      |                      style as jobs, customers, stakeholders, and
      |                      expectations change.
      |                      It has interviewed the operator about:
      |                        - what counts as a useful answer
      |                        - what evidence to trust
      |                        - when to escalate vs act
      |                        - what cadence / heartbeat matters
      |                      The normalized output is a versioned
      |                      OperatorContextPacket.
      |                      This query now arrives with operator context,
      |                      delegation policy, and success criteria attached.
      v
   Layer 1  FRONTEND         User types in Chat search bar, hits enter.
      |                      useStreamingSearch hook opens SSE connection.
      |                      Browser listens for: plan, step_start, step_done,
      |                      source, result, complete events.
      v
   Layer 2  SERVER           POST /api/search/stream hits Express route.
      |                      Opens SSE stream (Content-Type: text/event-stream).
      |                      Starts the harness pipeline.
      v
   Layer 3  SERVICES         searchPipeline.ts classifies the query:
      |                        1. classifyWithSession() -> "company_search"
      |                        2. Extract entity: "Ramp"
      |                        3. Check LRU cache for prior Ramp context
      |                        4. Load operator context and success criteria
      |                        5. Hand off to the Agent Harness
      v
   Layer 4  AGENTS           This is the brain. Three phases:
      |
      |   PHASE 1: PLAN (Gemini Flash Lite preview alias,
      |                   with stronger fallback when planning needs depth)
      |     The LLM reads the query + classification + operator context
      |     and DECIDES:
      |     - Which tools to call
      |     - In what tiered order
      |     - What arguments to pass
      |     - How much autonomy is allowed
      |     Output: HarnessPlanV2 {
      |       steps: [
      |         {
      |           id: "s1",
      |           stepIndex: 0,
      |           groupId: "discover",
      |           toolName: "web_search",
      |           args: { query: "Ramp fintech" },
      |           purpose: "Find recent external sources"
      |         },
      |         {
      |           id: "s2",
      |           stepIndex: 1,
      |           groupId: "analyze",
      |           toolName: "run_recon",
      |           dependsOn: ["s1"],
      |           injectPriorResults: ["s1"],
      |           model: "gemini-3.1-flash-lite-preview"
      |         },
      |         {
      |           id: "s3",
      |           stepIndex: 1,
      |           groupId: "analyze",
      |           toolName: "founder_local_gather",
      |           dependsOn: ["s1"],
      |           injectPriorResults: ["s1"],
      |           acceptsSteering: true,
      |           purpose: "Load operator-specific prior context"
      |         },
      |         {
      |           id: "s4",
      |           stepIndex: 2,
      |           groupId: "synthesize",
      |           toolName: "synthesize_report",
      |           dependsOn: ["s2", "s3"],
      |           injectPriorResults: ["s1", "s2", "s3"]
      |         }
      |       ]
      |     }
      |     >> SSE: emit "plan" event -> frontend shows step list
      |
      |   PHASE 2: EXECUTE (tier-by-tier)
      |     The harness loops through the plan by stepIndex:
      |
      |     Tier 0 / Step s1: web_search("Ramp fintech")
      |       >> SSE: step_start {
      |            stepId: "s1", stepIndex: 0, groupId: "discover",
      |            toolName: "web_search"
      |          }
      |       -> Linkup API returns 5 web sources
      |       >> SSE: step_done {
      |            stepId: "s1", durationMs: 1200, success: true,
      |            preview: "5 sources"
      |          }
      |       >> SSE: source events (one per source found)
      |
      |     Tier 1 / Group "analyze": s2 + s3 run in parallel
      |
      |     Step s2: run_recon(_priorResults.s1)
      |       >> SSE: step_start {
      |            stepId: "s2", stepIndex: 1, groupId: "analyze",
      |            toolName: "run_recon", model: "gemini-3.1-flash-lite-preview"
      |          }
      |       -> Gemini analyzes sources, extracts signals
      |       >> SSE: step_done {
      |            stepId: "s2", durationMs: 800, tokensIn: 2400,
      |            tokensOut: 620, costUsd: 0.0012, success: true
      |          }
      |
      |     Step s3: founder_local_gather(_priorResults.s1)
      |       >> SSE: step_start {
      |            stepId: "s3", stepIndex: 1, groupId: "analyze",
      |            toolName: "founder_local_gather"
      |          }
      |       -> Pulls user's saved context about Ramp plus operator rules
      |       >> SSE: step_done {
      |            stepId: "s3", durationMs: 300, success: true,
      |            preview: "2 local notes + operator context"
      |          }
      |
      |     If a tool FAILS: harness can adapt the plan
      |       -> Re-plan with remaining budget (maxAdaptations)
      |
      |     Tier 2 / Step s4: synthesize_report(_priorResults.s1,s2,s3)
      |       >> SSE: step_start {
      |            stepId: "s4", stepIndex: 2, groupId: "synthesize",
      |            toolName: "synthesize_report"
      |          }
      |
      |   PHASE 3: SYNTHESIZE (Gemini Flash Lite preview alias
      |                        or current stable fast fallback)
      |     The LLM reads ALL prior step results plus operator context and
      |     produces:
      |     ResultPacket {
      |       answer: "Ramp is a corporate card and spend management..."
      |       signals: [{ text: "raised $300M Series D", evidence: [...] }]
      |       risks: [{ description: "Competing with Brex in saturated..." }]
      |       comparables: ["Brex", "Divvy", "Airbase"]
      |       keyMetrics: [{ label: "Valuation", value: "$7.65B" }]
      |       nextActions: ["Deep dive on unit economics"]
      |       sourceRefs: [{ url: "https://...", domain: "techcrunch.com" }]
      |     }
      |       >> SSE: step_done {
      |            stepId: "s4", durationMs: 600, tokensIn: 3100,
      |            tokensOut: 900, costUsd: 0.0015, success: true
      |          }
      |       >> SSE: result { payload: ResultPacket }
      |       >> SSE: complete
      |          -> frontend renders full report
      v
   Layer 5  DATABASE         Convex stores everything in real-time:
      |                        - chat session: startSession mutation
      |                        - tool events: recordToolStart/recordToolDone
      |                        - final report: completeSession -> saves report
      |                        - entity: ensureEntityForReport("Ramp")
      |                        - operator context packet / elicitation session
      |                        - source refs linked to report
      v
   Layer 6  SECURITY         Every step checks:
      |                        - Linkup URLs validated (no SSRF)
      |                        - Response bodies bounded (MAX_RESPONSE_BYTES)
      |                        - Rate limiting on API gateway (100/min)
      |                        - AbortController timeout budget (30s default)
      v
   Layer 7  EVALUATION       After the run:
      |                        - Structural: has sources? has 4 sections?
      |                        - LLM judge (Gemini): scores quality vs golden set
      |                        - Evidence grading: source quality score per claim
      |                        - Results tracked in eval_results table
      v
   Layer 8  OBSERVABILITY    The whole run emits a trace array:
      |                        - plan: model=gemini-3.1-flash-lite-preview
      |                        - s1 discover/web_search: 1.2s, ok, 5 sources
      |                        - s2 analyze/run_recon: 800ms, ok, 3 signals
      |                        - s3 analyze/founder_local_gather: 300ms, ok
      |                        - s4 synthesize/synthesize_report: 600ms, ok
      |                        - total: 2.9s, cost: $0.008
      |                        - groupId, stepIndex, model, tokens, cost retained
      |                        Dual-write: local SQLite + Convex
      v
   Layer 9  MCP TOOLS        Same pipeline available to AI agents:
                               - Claude Code: `web_search`, `entity_intelligence`
                               - Cursor: `get_workflow_chain`, `run_recon`
                               - Local MCP packages: ~350 tools exposed
                               - Public unified server: 101 remote tools
                               - Progressive discovery: agents find tools by intent
```

---

*Document updated: April 15, 2026*
*Part 1 preserves the v1 snapshot. Parts 2-11 are normalized to the latest April 2026 proposal set and interview walkthrough framing.*
*All user questions quoted verbatim. All sources linked with URLs.*
