# NodeBench Deep Sim — MCP Tools & Skills Schema

## Tool Inventory

7 new MCP tools for the Deep Sim layer. Each tool emits structured JSON with provenance, confidence, and a "what would change my mind" field.

---

### 1. `build_claim_graph`

**Description:** Extract claims from a source packet and link each claim to its evidence source. Returns a directed graph of claims, supporting evidence, contradicting evidence, and confidence per claim.

**Input Schema:**
```json
{
  "entityKey": { "type": "string", "description": "Canonical entity key, e.g. company/acme-ai" },
  "sources": {
    "type": "array",
    "items": { "type": "string" },
    "maxItems": 50,
    "description": "Source texts, URLs, or document keys to extract claims from"
  },
  "maxClaims": { "type": "number", "default": 20, "maximum": 50 }
}
```

**Output:**
```json
{
  "claims": [
    {
      "id": "claim_001",
      "text": "Acme AI has 14 months of runway remaining",
      "confidence": 0.85,
      "confidenceCategory": "known",
      "sources": ["10-K filing Q4 2025", "founder interview 2026-02"],
      "contradictions": [],
      "whatWouldChangeMyMind": "A bridge round or unexpected expense burn"
    }
  ],
  "edges": [
    { "from": "claim_001", "to": "claim_003", "type": "supports" }
  ],
  "provenance": { "sourceCount": 4, "verifiedCount": 3, "extractedAt": "2026-03-19T..." }
}
```

**Category:** deep_sim | **Phase:** research | **Complexity:** high

---

### 2. `extract_variables`

**Description:** Identify and weight the key variables driving an entity's trajectory. Returns a ranked variable list with sensitivity estimates and data completeness scores.

**Input Schema:**
```json
{
  "entityKey": { "type": "string" },
  "claimGraphId": { "type": "string", "description": "ID from build_claim_graph output (optional)" },
  "variableCategories": {
    "type": "array",
    "items": { "type": "string", "enum": ["intrinsic", "temporal", "network", "intervention", "market", "constraint"] },
    "default": ["intrinsic", "temporal", "network", "intervention", "market", "constraint"]
  },
  "maxVariables": { "type": "number", "default": 15, "maximum": 30 }
}
```

**Output:**
```json
{
  "variables": [
    {
      "id": "var_001",
      "name": "Burn rate runway",
      "category": "constraint",
      "weight": 0.18,
      "currentValue": "14 months",
      "sensitivity": "high",
      "dataCompleteness": 0.9,
      "sourceClaimIds": ["claim_001"],
      "whatWouldChangeMyMind": "New funding or pivot to revenue"
    }
  ],
  "totalWeight": 1.0,
  "topVariable": "var_001",
  "provenance": { "variableCount": 12, "categoryCoverage": 5 }
}
```

**Category:** deep_sim | **Phase:** research | **Complexity:** high

---

### 3. `generate_countermodels`

**Description:** For every main thesis or scenario, generate serious alternative explanations. Forces intellectual honesty by producing counter-arguments with their own evidence and confidence.

**Input Schema:**
```json
{
  "entityKey": { "type": "string" },
  "thesis": { "type": "string", "description": "The main claim or scenario to challenge" },
  "claimGraphId": { "type": "string", "description": "Optional claim graph for context" },
  "maxCounterModels": { "type": "number", "default": 3, "maximum": 5 }
}
```

**Output:**
```json
{
  "thesis": "Acme AI should raise Series A now to capture timing window",
  "thesisConfidence": 0.68,
  "counterModels": [
    {
      "id": "counter_001",
      "thesis": "Market cooldown makes timing moot — wait for stronger metrics",
      "confidence": 0.38,
      "keyEvidence": ["Fed signaling rate pause", "3 competing raises in pipeline"],
      "keyAssumption": "Investor appetite continues to cool through Q2",
      "whatWouldValidate": "Two or more target funds pass on current pipeline"
    }
  ],
  "provenance": { "counterModelCount": 3, "averageConfidence": 0.35 }
}
```

**Category:** deep_sim | **Phase:** research | **Complexity:** high

---

### 4. `run_deep_sim`

**Description:** Run a multi-agent scenario simulation. Instantiates agents with personas and incentives, varies conditions across scenario branches, and generates an analytical report. Uses bounded branching with budget controls.

**Input Schema:**
```json
{
  "entityKey": { "type": "string" },
  "workflow": {
    "type": "string",
    "enum": ["investor_diligence", "founder_strategy", "ceo_decision", "gtm_analysis", "creator_trajectory", "trend_forecast"],
    "description": "Which analysis workflow to run"
  },
  "variableOverrides": {
    "type": "object",
    "description": "Override specific variable values for what-if analysis"
  },
  "maxBranches": { "type": "number", "default": 3, "maximum": 5 },
  "maxRounds": { "type": "number", "default": 4, "maximum": 6 },
  "budgetSeconds": { "type": "number", "default": 90, "maximum": 180 }
}
```

**Output:**
```json
{
  "scenarios": [
    {
      "id": "scenario_001",
      "title": "Raise Now",
      "confidence": 0.68,
      "keyAssumptions": ["Timing window open through Q2", "Trust-node intros convert"],
      "expectedOutcome": "Series A closed at $12M pre, 18 months runway",
      "risks": ["Competitor fundraise steals narrative"],
      "interventionsNeeded": ["Activate warm intros", "Ship benchmark artifact"]
    }
  ],
  "deliberationSummary": {
    "roundsCompleted": 3,
    "convergenceRatio": 0.83,
    "dissent": ["Security Auditor flagged regulatory risk in Q3"]
  },
  "provenance": { "agentCount": 6, "totalRounds": 3, "wallClockMs": 45000 }
}
```

**Category:** deep_sim | **Phase:** research | **Complexity:** high

---

### 5. `rank_interventions`

**Description:** Rank potential interventions by expected trajectory delta. Each intervention includes expected impact, confidence, cost, and what evidence would confirm or deny the effect.

**Input Schema:**
```json
{
  "entityKey": { "type": "string" },
  "scenarioId": { "type": "string", "description": "Scenario from run_deep_sim to optimize for" },
  "maxInterventions": { "type": "number", "default": 5, "maximum": 10 }
}
```

**Output:**
```json
{
  "interventions": [
    {
      "rank": 1,
      "title": "Activate 2 warm intros to target funds",
      "expectedDelta": 0.12,
      "confidence": 0.72,
      "category": "network",
      "cost": "Low (relationship capital)",
      "timeframe": "This week",
      "whatWouldConfirm": "Meeting scheduled within 5 business days",
      "whatWouldDeny": "Both intros decline or go cold"
    }
  ],
  "provenance": { "interventionCount": 5, "totalExpectedDelta": 0.31 }
}
```

**Category:** deep_sim | **Phase:** research | **Complexity:** medium

---

### 6. `score_compounding`

**Description:** Compute the full 8-dimension trajectory score for an entity. Returns trust-adjusted compounding, drift, adaptation velocity, and all sub-scores with explanations.

**Input Schema:**
```json
{
  "entityKey": { "type": "string" },
  "entityType": { "type": "string", "enum": ["product", "startup", "founder", "workflow", "agent", "mission", "team"] },
  "windowDays": { "type": "number", "default": 90, "minimum": 7, "maximum": 365 }
}
```

**Output:** Full `TrajectoryScoreBreakdown` (8 dimensions) + `TrajectorySummaryData` + timeline items.

**Category:** deep_sim | **Phase:** verify | **Complexity:** medium

---

### 7. `render_decision_memo`

**Description:** Render a 1-page executive decision memo from a completed Deep Sim analysis. Combines claim graph, variables, scenarios, interventions, and compounding score into a structured memo optimized for CEO/investor/founder consumption.

**Input Schema:**
```json
{
  "entityKey": { "type": "string" },
  "workflow": { "type": "string" },
  "format": { "type": "string", "enum": ["markdown", "json", "html"], "default": "markdown" },
  "audienceRole": { "type": "string", "enum": ["ceo", "investor", "founder", "builder"], "default": "founder" }
}
```

**Output:**
```json
{
  "memo": {
    "question": "Should Acme AI raise a Series A now?",
    "recommendation": "Raise now, conditional on trust-node activation this week",
    "confidence": 0.68,
    "topVariables": [...],
    "scenarios": [...],
    "interventions": [...],
    "evidence": { "sourceCount": 7, "verifiedCount": 4 },
    "counterModel": { "thesis": "...", "confidence": 0.38 },
    "forecastCheckDate": "2026-06-19",
    "whatWouldChangeMyMind": "Two target funds pass, or competitor closes first"
  },
  "renderedMarkdown": "...",
  "provenance": { "generatedAt": "...", "workflow": "investor_diligence" }
}
```

**Category:** deep_sim | **Phase:** ship | **Complexity:** medium

---

## Skills Schema

### `deep-sim-analyst.md`

```markdown
---
name: deep-sim-analyst
description: Run a full NodeBench Deep Sim analysis on an entity
tools:
  - build_claim_graph
  - extract_variables
  - generate_countermodels
  - run_deep_sim
  - rank_interventions
  - score_compounding
  - render_decision_memo
---

You are a Deep Sim analyst for NodeBench.

Your workflow:
1. Call build_claim_graph to extract claims from the source packet
2. Call extract_variables to identify and weight key variables
3. Call generate_countermodels to challenge the main thesis
4. Call run_deep_sim to simulate scenario branches
5. Call rank_interventions to prioritize next actions
6. Call score_compounding to assess trajectory health
7. Call render_decision_memo to produce the executive output

Rules:
- Every claim must link to a source
- Every scenario must name its assumptions
- Every recommendation must include "what would change my mind"
- Separate known from inferred from speculative
- Never present confidence as certainty
- Include counter-models in every memo
```

---

## Coding Agent Prompts

### Prompt 1: Build Benchmark Harness

```
Build a reproducible benchmark harness for NodeBench Deep Sim in packages/mcp-local/src/__tests__/deepSimBench.test.ts.

Requirements:
- Support golden input packets and golden output memos
- Score: traceability, variable completeness, counter-model quality, intervention usefulness, recommendation clarity
- Emit machine-readable JSON + markdown report
- Keep evaluation deterministic where possible
- Support NodeBench internal golden sets from docs/golden-sets/
- Fail CI if benchmark scores regress
- Use vitest, match existing test patterns in the repo
```

### Prompt 2: Implement Core Tools

```
Implement the 7 Deep Sim MCP tools in packages/mcp-local/src/tools/deepSimTools.ts.

Tools: build_claim_graph, extract_variables, generate_countermodels, run_deep_sim, rank_interventions, score_compounding, render_decision_memo.

Requirements:
- Each tool emits structured JSON matching the schema in docs/architecture/DEEP_SIM_MCP_TOOLS_SCHEMA.md
- Every output includes provenance, confidence, and "whatWouldChangeMyMind"
- Separate extraction, judgment, and rendering layers
- Add TIMEOUT (30s), BOUND_READ (2MB), ERROR_BOUNDARY on all external calls
- Register all tools in toolRegistry.ts with nextTools cross-refs
- Add to TOOLSET_MAP as "deep_sim" domain
- Add unit tests and golden fixtures
```

### Prompt 3: Eval-Fix Loop

```
Given failing benchmark cases, inspect the benchmark JSON, logs, traces, and rendered outputs.
Find the root cause, propose the smallest safe fix, implement it, rerun the benchmark, and summarize:
- What failed
- Why it failed (5 whys)
- What changed
- Whether the score improved
Do not edit benchmark targets unless explicitly instructed.
```

### Prompt 4: Decision Memo Renderer

```
Build a production-grade decision memo view in src/features/deepSim/views/DecisionMemoView.tsx.

Requirements:
- One-screen summary first (question, recommendation, confidence, top 3 variables)
- 3 scenario cards max in primary view
- Ranked interventions above the fold
- Evidence drawer (collapsible, shows source count and confidence per claim)
- Counter-model callout box
- Forecast check date badge
- Dark mode first, light mode supported
- No unnecessary dependencies
- Full accessibility (ARIA labels, keyboard nav, focus management)
- data-agent-* attributes on all navigable elements
- Respect prefers-reduced-motion
```

### Prompt 5: Landing Page

```
Build a premium landing page for NodeBench at src/features/landing/views/LandingPage.tsx.

Follow the narrative in docs/architecture/LANDING_PAGE_NARRATIVE.md.

Design rules:
- Jony Ive reduction + Linear/Vercel/Notion/ChatGPT restraint
- Zero-dependency sections, exact viewport fitting
- No decorative AI imagery
- Typography hierarchy does the work
- Maximum 3 colors per section
- Dark mode first
- Design tokens from LANDING_PAGE_NARRATIVE.md
- Hero answers: what is this, who is it for, what do I get
- Live example section with decision memo mockup
- Every section fits one viewport
```

---

## Toolset Preset Updates

Add `deep_sim` domain to these presets:
- `research` (primary home)
- `multi_agent` (simulation needs swarm)
- `full` (always included)
- `default` (core decision tools only: `extract_variables`, `score_compounding`, `render_decision_memo`)
