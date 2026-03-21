# Agent Question Catalog

Real questions the agent system can answer, organized by the output variables it now produces. Each question maps to concrete system capabilities (trajectory scoring, boolean gates, trust primitives, self-evolution, research cells).

---

## 1. Trajectory Compounding Questions

These questions use the 8-dimension trajectory scoring engine (`trajectory/lib.ts`) that outputs: spanQuality, evidenceCompleteness, adaptationVelocity, trustLeverage, interventionEffect, drift, rawCompounding, trustAdjustedCompounding.

### Is this entity compounding or drifting?

| Question | Output Variable | Who Asks |
|----------|----------------|----------|
| "Is our product trajectory compounding, improving, flat, or drifting over the last 90 days?" | `trustAdjustedCompounding.label` | Founder / PM |
| "Which of our 6 agent roles is improving fastest and which is drifting?" | `adaptationVelocity` per role | Ops Lead |
| "Are our research missions producing better evidence bundles over time, or has quality plateaued?" | `evidenceCompleteness` trend | Research Lead |
| "Show me every entity (startup, founder, agent, workflow) whose compounding score dropped below 0.58 this week" | `trustAdjustedCompounding.score < 0.58` filter | Portfolio Manager |
| "Is NodeBench itself compounding? Show me our own product trajectory with drift pressure breakdown" | Self-referential `product:nodebench-ai` entity query | Builder (you) |
| "Compare the trajectory of Founder X vs Founder Y across all 8 dimensions" | Side-by-side `TrajectoryScoreBreakdown` | Investor / Analyst |

### Where is drift coming from?

| Question | Output Variable | Who Asks |
|----------|----------------|----------|
| "What is our current drift pressure and which component is largest — violated loops, error spans, or negative feedback?" | `drift` breakdown: `driftPressure * 0.5 + errorSpanRatio * 0.3 + (1-feedbackPositiveRatio) * 0.2` | Ops Lead |
| "Which interventions failed to produce uplift and may be causing drift?" | `interventionEffect` where `observedScoreDelta <= 0` | Engineering Lead |
| "Are we accumulating evidence faster than we're losing trust? What's the net trajectory?" | `evidenceCompleteness` vs `drift` delta | Strategy Architect |
| "Show me the 3 workflows with the highest drift pressure that haven't received an intervention in 14 days" | `driftPressure` ranked + `interventionCount == 0` filter | Operations Coordinator |

### Are interventions working?

| Question | Output Variable | Who Asks |
|----------|----------------|----------|
| "Of the last 20 interventions, what percentage showed positive post-window uplift?" | `interventionSuccessRatio` | PM |
| "What is the average uplift from our interventions vs the benchmark improvement ratio?" | `averageInterventionUplift` vs `benchmarkImprovementRatio` | Engineering Lead |
| "Which intervention type (process change, tool change, rubric change, staffing change) produces the best compounding effect?" | `interventionEffect` grouped by intervention category | Strategy Architect |
| "Show me interventions where expected uplift was positive but observed uplift was negative — our prediction failures" | `expectedScoreDelta > 0 AND observedScoreDelta < 0` | Growth Analyst |

---

## 2. Judgment Layer Questions

These questions use the boolean gate system (5 required gates + 6 disqualifiers), 6 agency roles, self-evolution loop, decision memory, and consistency index.

### Should the agent act?

| Question | Output Variable | Who Asks |
|----------|----------------|----------|
| "Of the last 100 opportunities the agent evaluated, what percentage passed all 5 gates vs which gate blocked most?" | Gate pass rates from `preExecutionGate` | Ops Lead |
| "Which disqualifier fires most often — rapid-fire, sensitive-topic, or scope-limit?" | Disqualifier frequency distribution | Security Auditor |
| "Show me every decision where the agent chose to SKIP and the reasoning. Are we being too conservative?" | Decision logs where `action == "SKIP"` with `reason` | Strategy Architect |
| "What is our false positive rate — decisions we made that we later regretted?" | `falsePositiveRate` from `analyzeDecisionLogs` | Design Steward |
| "Are our gates internally consistent, or is the consistency index flagging cross-agent conflicts?" | `consistencyIndex` conflict severity levels | Operations Coordinator |

### Is the agent evolving well?

| Question | Output Variable | Who Asks |
|----------|----------------|----------|
| "What did the last self-evolution cycle propose, and did evolution verification approve or reject it?" | `RubricProposal` + `VerificationResult.approved` | Engineering Lead |
| "Is the self-evolution loop thrashing — oscillating between adding and removing the same gates?" | `ThrashingResult.thrashing` from `evolutionVerification` | Security Auditor |
| "Which of the 10 health metrics are unhealthy? Post rate? Gate distribution balance? Disqualifier precision?" | `selfEvolution` health metric booleans | Ops Lead |
| "Show me the evolution history: every rubric change, what it replaced, and whether the subsequent compounding score went up or down" | `evolutionLogs` + trajectory `trustAdjustedCompounding` delta | Strategy Architect |
| "How many consecutive evolution cycles have produced zero approved proposals? Are we plateau'd?" | Evolution cycle count with `approved == false` streak | Growth Analyst |

### What role should handle this?

| Question | Output Variable | Who Asks |
|----------|----------------|----------|
| "For this research opportunity, which of the 6 roles (Strategy Architect, Engineering Lead, Growth Analyst, Design Steward, Security Auditor, Operations Coordinator) should lead?" | `swarmDeliberation` role selection | Any |
| "Which role has the highest contribution score in deliberations over the last 30 days?" | `roleEffectiveness` from `SwarmEvolutionResult` | Ops Lead |
| "How many deliberation rounds did the last swarm need before consensus? Is consensus speed improving?" | `consensusSpeed.avgRoundsToConsensus` trend | Operations Coordinator |
| "Show me the deliberation transcript where the swarm disagreed — what was the minority position and was it right in hindsight?" | Swarm round history + retrospective verdict | Strategy Architect |

---

## 3. Trust Primitive Questions

These questions use the 4 trust primitives (Passport, Intent Ledger, Action Receipts, Delegation Graph) and Trust Graph Engine (`trajectoryTrustNodes` + `trajectoryTrustEdges`).

### Who has authority and are they using it well?

| Question | Output Variable | Who Asks |
|----------|----------------|----------|
| "Show me every agent action that was denied or approval-gated today, and explain why" | Action Receipts with `status == "denied" OR "gated"` | Compliance / PM |
| "Which agent passports are over-scoped — granted more tools than they actually use?" | Passport tool grants vs actual tool-call frequency | Security Auditor |
| "What is our trust leverage score — how much of our visible improvement is amplified by trusted external nodes?" | `trustLeverage` from trajectory scoring | Growth Analyst |
| "Map the delegation graph: who approved what, and are there trust boundary violations?" | Delegation Graph traversal | Security Auditor |
| "Which trusted nodes (people, institutions, channels) amplified our work most, and is that network growing or shrinking?" | `trajectoryTrustEdges` with `leverageScore` | Strategy Architect |
| "Show me the intent ledger for Mission X — what did the agent declare it would do vs what it actually did" | Intent Ledger vs Action Receipts diff | Compliance |

---

## 4. Research Cell Questions

These questions trigger when the system detects low confidence or sparse evidence, activating the runtime research cell (bounded branching, 2-4 branches, max 90s).

### What do we need to investigate?

| Question | Output Variable | Who Asks |
|----------|----------------|----------|
| "Which active missions have confidence below 0.65 and should trigger a research cell?" | Mission confidence filter | Research Lead |
| "For this topic, what are the competing explanations and which has the strongest evidence score?" | `competingExplanations` with evidence checklists `[N/6]` | Analyst |
| "How many research branches were spawned for this investigation, what did each find, and which was promoted?" | Research cell branch results + merge verdict | Engineering Lead |
| "Show me every claim in our latest analysis that is UNVERIFIED or PARTIAL — what would it take to verify each?" | Fact-check status badges (VERIFIED/PARTIAL/UNVERIFIED) | Research Lead |
| "What is the evidence linkage score for this mission? Are we above the 0.75 hard guard?" | Evidence linkage from autoresearch hard guards | Ops Lead |

---

## 5. Operator Throughput Questions

These questions use the DeepTrace Autoresearch throughput metric: 30% task completion + 25% inverse time-to-first-draft + 20% inverse human edit distance + 15% inverse wall-clock + 10% inverse tool-call count.

### How fast and accurate is the agent?

| Question | Output Variable | Who Asks |
|----------|----------------|----------|
| "What is our current operator throughput score and which component is dragging it down?" | Throughput breakdown (5 components) | Engineering Lead |
| "What is time-to-first-draft for research missions? Is it improving week over week?" | `timeToFirstDraftMs` trend | PM |
| "How much do humans edit agent output? What is the human edit distance trend?" | `humanEditDistance` trend | Design Steward |
| "Which mission types have the highest task completion rate and which have the lowest?" | `taskCompletionRate` by mission type | Operations Coordinator |
| "Are we staying within the false-confidence hard guard (<= 0.10)?" | `falseConfidenceRate` from autoresearch guards | Security Auditor |
| "Show the last 5 optimizer promotions — what was changed, what throughput delta was achieved, and did quality guards hold?" | Autoresearch `cumulative-tracker.json` promotions | Engineering Lead |

---

## 6. Time-Compounding Meta Questions

These questions come directly from the Time Compounding essay's evaluation framework — applicable to any entity (startup, founder, agent, product, team).

### The 5 evaluation dimensions applied to any entity

| Question | Dimension | Output Variables Used |
|----------|-----------|---------------------|
| "What has this entity actually produced? How good and how consistent?" | **Output Quality** | `spanQuality`, `verdictPassRatio`, `completedSpanRatio` |
| "Did it improve across time? Did it learn from feedback? Did it move faster or more accurately after iteration?" | **Temporal Adaptation** | `adaptationVelocity`, `interventionSuccessRatio`, `benchmarkImprovementRatio` |
| "Who interacted with it? Who amplified it? What trusted nodes adopted it?" | **Network Position** | `trustLeverage`, `trajectoryTrustEdges`, delegation graph |
| "Did exposure turn into action? Did people return? Did proof convert into belief, and belief into usage?" | **Trust Conversion** | `trustAdjustedCompounding` vs `rawCompounding` delta, feedback event conversion rates |
| "Is the system getting stronger because each cycle improves the next cycle?" | **Compounding Signal** | `trustAdjustedCompounding.label == "compounding"`, trajectory projection |

### The ontological layers

| Question | Layer | What It Probes |
|----------|-------|---------------|
| "What compute, network, and hardware does this agent have access to?" | **Substrate** | Passport scope, tool inventory, MCP connections |
| "What patterns has it learned? What models, correlations, and abstractions does it use?" | **Pattern** | Decision memory fingerprints, consistency index, institutional memory L2 |
| "How does it select and act? What agency roles does it deploy?" | **Agency** | 6 swarm roles, boolean rubric, pre-execution gates |
| "How does it model and improve itself?" | **Reflexivity** | Self-evolution loop, health metrics, evolution verification, autoresearch optimizer |

---

## 7. Cross-Domain Workflow Questions

The Time Compounding essay identifies 5 workflow classes. Every question above can be scoped to a specific class:

| Workflow Class | Example Question |
|---------------|-----------------|
| **Interaction** (human-to-machine) | "Is our UI QA workflow compounding? Show me span quality and evidence completeness trends for the last 30 days of test runs" |
| **Decision** (evaluation → choice → justification) | "For our due diligence missions, what is the judge verdict pass ratio and are interventions improving accuracy?" |
| **Creation** (ideation → draft → review → publish) | "What is the human edit distance on agent-drafted LinkedIn posts? Is it decreasing over time?" |
| **Compliance** (rule → audit → evidence → certification) | "Show me every pre-execution gate failure in the last week. Which gate blocked most often?" |
| **Coordination** (routing → delegation → escalation → merge) | "Map the delegation graph for Mission X. Were there trust boundary violations? Did escalations resolve faster than last month?" |

---

## 8. Industry-Specific Applications

Same questions, different domains. The agent answers all of these using the same Action Span → Evidence → Verdict → Trajectory pipeline:

| Industry | High-Value Question |
|----------|-------------------|
| **Sales Ops** | "Is this sales team's close rate compounding or drifting? Which intervention (new pitch deck, training, territory change) produced the best uplift?" |
| **Customer Success** | "Which support workflows have the highest drift pressure? Where are we losing more time per ticket?" |
| **Engineering** | "Is our CI/CD pipeline's test pass rate compounding? What is the adaptation velocity after each infrastructure change?" |
| **Hiring** | "Is our hiring pipeline's signal-to-noise improving? What is the evidence completeness on candidate evaluations?" |
| **Compliance** | "Show me every workflow where the compliance gate blocked action. What was the false positive rate?" |
| **Healthcare** | "Is this treatment protocol's outcome trajectory compounding? What interventions produced measurable uplift?" |
| **Financial Services** | "For this portfolio, which positions are compounding vs drifting? What is the trust leverage from institutional endorsements?" |
| **Content/Media** | "Is this creator's audience engagement compounding? What is the adaptation velocity after content strategy changes?" |
| **Education** | "Is this student's learning trajectory compounding? Where is drift highest and what interventions helped?" |
| **Legal** | "Is our contract review workflow improving? What is the time-to-first-draft trend and human edit distance?" |

---

## Implementation Notes

Every question above maps to existing system primitives:
- **Trajectory domain** (`convex/domains/trajectory/`) — 11 tables, `computeTrajectoryScores()` with 8-dimension output
- **Judgment layer** (`convex/domains/agents/`) — boolean gates, swarm deliberation, self-evolution, decision memory
- **Trust primitives** (`convex/domains/missions/`, receipts, delegation) — passport, intent ledger, action receipts, delegation graph
- **Autoresearch** (`scripts/eval-harness/deeptrace/`) — offline optimizer, runtime research cell, throughput scoring

The agent doesn't need new capabilities to answer these questions. It needs **routing** — the right question hits the right trajectory query, judgment query, or trust primitive query, and the response surfaces the relevant output variables with their current values and trends.

### Runtime status

- `shared/agentResponseFlywheel.ts` now routes real assistant replies into these catalog lanes instead of leaving the catalog as static documentation.
- `convex/domains/agents/responseFlywheel.ts` persists deterministic response reviews, supports re-judge passes, and surfaces the weakest lanes in Oracle.
- `convex/domains/successLoops/projection.ts` now uses recent response reviews as proxy outer-loop signals for activation, retained value, outcome attribution, and organization learning when explicit downstream events are still missing.
