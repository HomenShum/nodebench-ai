# NodeBench Dogfood Runbook v1

> **Canonical wedge:** Local-first operating memory + entity context + artifact restructuring.
> **Prove-first loop:** Messy context -> canonical truth -> change/contradiction -> ranked interpretation -> Artifact Packet.
> **First three habits:** Weekly founder reset, pre-delegation briefing, important-change review.

**Author:** Homen Shum | **Date:** 2026-03-23 | **Status:** Active

---

## 1. Canonical Expected Truths

### A. Company Truth Card
NodeBench is the local-first operating-memory and entity-context layer for agent-native businesses and entity-centered workflows. It should not be sold primarily as a generic agent shell. Its first prove-first value is turning messy founder/company context into reusable packets, memos, and downstream artifacts without forcing humans or agents to rebuild the story from scratch.

### B. Strongest Contradiction Card
Product implementation is racing ahead across many surfaces, but the first habit still has to remain crystal clear: weekly founder reset, pre-delegation packet, and important-change review. If NodeBench leads with command-center aesthetics or broad platform language, it drifts back into generic shell territory.

### C. Public Narrative Mismatch Warning
Public entry surfaces still lag the sharper internal thesis. The homepage title currently says "DeepTrace by NodeBench - Agent Trust Infrastructure", and the accessible public package docs still emphasize the earlier AI Flywheel / engine API packaging rather than the newer starter + persona-preset structure.

### D. Competitor Interpretation
Supermemory is publicly winning the universal memory / context infrastructure layer, including MCP distribution and MemoryBench. NodeBench should not beat them by becoming "another memory API." It should sit higher, owning packetization, causal memory, role interpretation, trajectory, and decision-ready artifacts.

---

## 2. Telemetry Schema

```typescript
interface DogfoodRun {
  runId: string;
  timestampStart: string;
  timestampEnd: string;
  surface: "ai_app" | "mcp" | "engine_api";
  scenarioId: string;
  userRole: "founder" | "banker" | "ceo" | "operator" | "researcher" | "student";
  primaryPrompt: string;
  attachedInputs: string[];
  inferredLens: string;
  packetType: string;
  stateBeforeHash: string;
  stateAfterHash: string;
  importantChangesDetected: number;
  contradictionsDetected: number;
  actionsRanked: number;
  artifactsProduced: string[];
  toolsInvoked: string[];
  toolCallCount: number;
  writeOpsCount: number;
  readOpsCount: number;
  webEnrichmentCount: number;
  providerBusMessagesSent: number;
  providerBusMessagesReceived: number;
  inputTokensEst: number;
  outputTokensEst: number;
  totalTokensEst: number;
  totalLatencyMs: number;
  estCostBandUsd: number;
  humanScore_1to5: number;
  judgeScore_1to5: number;
  repeatedQuestionPrevented: boolean;
  followupNeeded: boolean;
}
```

### Canonical Event Names
```
search.query.received
lens.inferred
entity.canonicalized
change.detected
contradiction.detected
important_change.flagged
packet.generated
packet.validated
memo.rendered
artifact.exported
packet.handed_to_agent
path.step.recorded
state.before.captured
state.after.captured
trajectory.rollup.generated
provider.bus.message.sent
provider.bus.message.received
```

---

## 3. Cost Model

| Operation | Token Range | Planning Band |
|-----------|-------------|---------------|
| Local state op / write / replay / diff | 0 | $0 |
| Light retrieval / shaping | 1k-8k | $0.01-$0.08 |
| Medium synthesis / packet render | 8k-25k | $0.05-$0.40 |
| Web-heavy multi-pass intelligence | 20k-80k + 2-10 fetches | $0.20-$2.00 |

**More important metrics:** tool calls, reads/writes, web enrichments, latency, repeat-question prevention, packet reuse rate.

---

## 4. AI App Dogfood Prompts (6 scenarios)

### Prompt 1: Founder Weekly Reset
```
Use everything from my recent NodeBench work this week to generate my founder weekly reset.
I want:
- what company we are actually building
- what changed since the last meaningful session
- the single biggest contradiction
- the next 3 moves
- one reusable Artifact Packet
- one memo I could send to a teammate or investor
Please include competitor and positioning implications if they materially changed.
```
**Lens:** Founder | **Tools:** 12-16 | **Tokens:** 18k-45k | **Cost:** $0.10-$0.80

### Prompt 2: Pre-Delegation Packet for Claude Code
```
Create a pre-delegation packet for Claude Code to improve NodeBench after Phase 12.
Focus on:
- no-bandage fixes
- weekly founder reset
- packet lineage
- important-change review
- suppressing noisy outputs
- keeping the app from drifting into generic shell language
Output: scoped objective, before/after state, constraints, success criteria, exact files/surfaces likely affected, agent-ready instructions.
```
**Lens:** Founder/Operator | **Tools:** 9-13 | **Tokens:** 10k-28k | **Cost:** $0.05-$0.35

### Prompt 3: Important-Change Review
```
Show me only the important changes since my last meaningful NodeBench session.
I want:
- strategy changes
- positioning changes
- product architecture changes
- competitor or market changes that actually matter
- anything that should trigger a packet refresh or a new memo
Suppress low-signal noise.
```
**Lens:** Founder | **Tools:** 8-12 | **Tokens:** 6k-18k | **Cost:** $0.03-$0.20

### Prompt 4: Competitor Intelligence Brief - Supermemory
```
Analyze Supermemory as a competitor or adjacent layer for NodeBench.
Tell me:
- what category they really own
- what distribution advantages they have
- what not to compete with directly
- what we should absorb from their playbook
- what NodeBench should own above their layer
- produce a one-page competitor brief and a founder action packet
```
**Lens:** Founder/Researcher | **Tools:** 12-18 | **Tokens:** 20k-60k | **Cost:** $0.20-$1.50

### Prompt 5: Banker/CEO Company Search - Anthropic
```
Analyze Anthropic for a banker or CEO lens.
I want: company snapshot, what changed recently, strategic position, business quality and risk, why it matters now, 3 next questions to ask, exportable banker memo.
```
**Lens:** Banker/CEO | **Tools:** 10-15 | **Tokens:** 15k-40k | **Cost:** $0.15-$0.90

### Prompt 6: Student Strategy Search - Shopify AI Commerce
```
Help me understand Shopify's current AI commerce strategy and why it matters.
Give me: plain-language summary, what changed recently, strategic upside, risks and governance angles, 3 comparables, a study brief I could export.
```
**Lens:** Student/Strategist | **Tools:** 8-12 | **Tokens:** 12k-30k | **Cost:** $0.10-$0.60

---

## 5. MCP Dogfood Runs (7 scenarios)

### MCP Run 1: Setup Sanity + Preset Confirmation
**Tools:** check_mcp_setup, list_available_toolsets, discover_tools, get_tool_quick_ref | **Calls:** 4 | **Cost:** $0.01-$0.05

### MCP Run 2: Founder Preset Weekly Reset
**Tools:** load_toolset("founder"), founder_deep_context_gather, extract_variables, build_claim_graph, generate_countermodels, run_deep_sim, rank_interventions, render_decision_memo, founder_packet_validate, track_action, track_milestone | **Calls:** 13-15 | **Cost:** $0.08-$0.60

### MCP Run 3: Operator Preset Causal-Memory Replay
**Tools:** load_toolset("operator"), get_event_ledger, get_causal_chain, get_path_replay, get_state_diff_history, get_trajectory_summary, get_weekly_summary | **Calls:** 10-11 | **Cost:** $0.03-$0.20

### MCP Run 4: Banker Preset Blank-State Company Search
**Tools:** load_toolset("banker"), run_recon, log_recon_finding, assess_risk, extract_variables, build_claim_graph, rank_interventions, render_decision_memo | **Calls:** 9-12 | **Cost:** $0.15-$0.80

### MCP Run 5: Researcher Preset Competitor Brief
**Tools:** load_toolset("researcher"), run_recon, log_recon_finding, assess_risk, extract_variables, build_claim_graph, generate_countermodels, run_deep_sim, rank_interventions, render_decision_memo, record_learning | **Calls:** 12-14 | **Cost:** $0.20-$1.20

### MCP Run 6: Public-Doc Drift Detection
**Tools:** load_toolset("founder"), founder_deep_context_gather, founder_packet_diff, extract_variables, build_claim_graph, rank_interventions, render_decision_memo, flag_important_change | **Calls:** 9-11 | **Cost:** $0.05-$0.30

### MCP Run 7: Engine API Trace Run
**Endpoints:** POST /api/sessions, POST /api/tools/:name, GET /api/sessions/:id/trace, GET /api/sessions/:id/report | **Calls:** 6-10 | **Cost:** adds ~10% to wrapped flow

---

## 6. Total Batch Estimate

| Metric | Low | High |
|--------|-----|------|
| Scenarios | 13 | 13 |
| Tool/endpoint calls | 114 | 170 |
| Local reads | 78 | 121 |
| Local writes | 37 | 60 |
| Web enrichments | 15 | 36 |
| Token band | 170k | 430k |
| Wall-clock | 8 min | 35 min |
| Cloud cost (cheap/mid) | $1.00 | $8.00 |
| Cloud cost (premium) | $8.00 | $30.00 |

---

## 7. Pass/Fail Criteria

### Per-Scenario (7 fields)
1. Did NodeBench remove repeated cognition?
2. Did it return a usable packet without restating context?
3. Did it surface the right contradiction?
4. Did it suppress noise?
5. Did it produce the right downstream artifact?
6. Did it update causal memory correctly?
7. Would the user trust and reuse the output?

### Global Metrics (4 fields)
- `repeat_question_rate`
- `packet_reuse_rate`
- `important_change_precision`
- `delegation_without_restatement_rate`

---

## 8. Priority First 3 Runs

1. **Founder weekly reset** - prove the main habit
2. **Public-doc drift detection** - make NodeBench catch its own messaging mismatch
3. **Banker blank-state Anthropic search** - prove the non-technical intelligence workspace

---

## 9. Success Rule

> Do not score success by how many tools fired. Score success by whether the run produced:
> - one cleaner truth packet
> - one fewer repeated question
> - one more reusable artifact
> - one stronger next action

> The AI app proves the user experience.
> The MCP proves the reproducible harness.
> The engine trace proves telemetry and replay.
