# MiroFish Deep Simulation Questions for NodeBench AI

Questions organized by the 6-variable taxonomy, each mapped to the specific system modules that should produce the answer. These are the real questions you feed into the agent to exercise the full variable space.

---

## Category 1: Intrinsic Variables (Entity Quality)

These test whether the system can measure what an entity IS, independent of time and network.

| # | Question | System Module | Expected Output Dimensions |
|---|----------|--------------|---------------------------|
| 1.1 | "Given this founder's GitHub commit history and writing samples, what is their execution speed relative to their domain complexity?" | `dimensionTools.run_entity_intelligence_mission` + `trajectory/projection` | spanQuality, adaptationVelocity |
| 1.2 | "Evaluate the technical depth of this product's architecture by analyzing its codebase structure, test coverage, and error handling patterns." | `architectTools.scan_codebase_structure` + `reconTools.analyze_project` | evidenceCompleteness, trustLeverage |
| 1.3 | "Score the clarity of this landing page's value proposition against the ICP definition." | `seoTools.audit_page_seo` + `agents/preExecutionGate` (5 gates) | opportunity_identified, unique_value, actionable_outcome |
| 1.4 | "Compare taste and design sensibility across 3 competitor products using progressive disclosure density analysis." | `uiUxDiveTools.start_deep_dive` + `swarmDeliberation` (Design Steward role) | interventionEffect, drift |
| 1.5 | "What is the product quality score if we decompose it into: correctness, completeness, consistency, and coherence?" | `verificationTools.start_verification_cycle` + `qualityGateTools` | All 8 trajectory dimensions |

## Category 2: Temporal Variables (Movement Through Time)

These test whether the system can measure HOW FAST and IN WHAT DIRECTION an entity is changing.

| # | Question | System Module | Expected Output Dimensions |
|---|----------|--------------|---------------------------|
| 2.1 | "What is the rate of improvement for this agent's response quality over the last 30 days? Is it compounding, improving, flat, or drifting?" | `trajectory/queries.getTrajectoryProjection` | trustAdjustedCompounding score + label |
| 2.2 | "Calculate the adaptation velocity: how quickly does this system incorporate feedback into changed behavior?" | `trajectory/lib.computeTrajectoryScores` (adaptationVelocity dimension) | interventionSuccessRatio, feedbackPositiveRatio |
| 2.3 | "What is the response lag between when a drift signal appears and when an intervention corrects it?" | `consistencyIndex` + `trajectoryInterventionEvents` | drift score, observedWindowEndAt vs createdAt |
| 2.4 | "Is the self-evolution loop producing proposals that stick, or are they thrashing (oscillating adds/removes)?" | `evolutionVerification.verifyRubricProposal` (thrashing detection) | thrashing.conflictingChanges, approved boolean |
| 2.5 | "Project the trajectory forward: given current slopes in all 8 dimensions, where will this entity be in 90 days?" | `trajectory/projection.getTrajectoryProjection` | Full TrajectoryScoreBreakdown + narrative |
| 2.6 | "What is the decay rate of unused institutional memory? Are decisions from 14 days ago still being surfaced when relevant?" | `decisionMemory` + `sessionMemoryTools.load_session_notes` | L1 (7-day TTL) hit rate, fingerprint match count |

## Category 3: Network Variables (Graph Effects)

These test whether the system can measure WHO TRUSTS WHOM and how that amplifies or dampens signals.

| # | Question | System Module | Expected Output Dimensions |
|---|----------|--------------|---------------------------|
| 3.1 | "Map the trust graph for this entity: which trust nodes (people, institutions, channels) amplify its trajectory?" | `trajectoryTrustNodes` + `trajectoryTrustEdges` | trustLeverage score, trustAmplification |
| 3.2 | "What is the reference density? How many independent sources cite the same evidence for this entity's claims?" | `trajectoryEvidenceBundles.sourceRefs` count + dedup | evidenceCompleteness, sourceRefCount |
| 3.3 | "If we add one trust node (e.g., a credible investor or prominent user), what is the projected change in trustAdjustedCompounding score?" | `trajectory/lib.computeTrajectoryScores` with modified trustAmplification input | Before/after trustAdjustedCompounding delta |
| 3.4 | "Which agent in the swarm has the highest contribution score, and is that concentration healthy or a single-point-of-failure risk?" | `swarmDeliberation` role effectiveness + `autonomousCrons.runSwarmEvolutionAnalysis` | roleEffectiveness scores, consensusSpeed |
| 3.5 | "What adjacency-to-power score does this entity have? (Measured by trust edges to high-leverage nodes)" | `trajectoryTrustEdges.leverageScore` aggregation | trustLeverage dimension |

## Category 4: Intervention Variables (Causal Candidates)

These test whether the system can recommend AND MEASURE the effect of specific changes.

| # | Question | System Module | Expected Output Dimensions |
|---|----------|--------------|---------------------------|
| 4.1 | "What intervention would change the slope of this trajectory the most? Rank by expected score delta." | `trajectoryInterventionEvents` sorted by observedScoreDelta | Top 3 interventions with title, delta, status |
| 4.2 | "We changed the pricing page last week. Did that intervention improve or degrade the evidence-backed trajectory?" | `trajectory/mutations.recordAgentResponseSpan` + before/after scoreBreakdown comparison | interventionEffect, benchmarkImprovementRatio |
| 4.3 | "If the rubric self-evolution proposes removing the 'unique_value' gate, simulate the impact on the last 100 judge reviews." | `evolutionVerification.simulateGateChange` | flippedVerdicts, projectedFalsePositiveRate, projectedFalseNegativeRate |
| 4.4 | "Run a swarm deliberation on whether this product pivot makes sense. Use all 6 roles. Report consensus and dissent." | `swarmDeliberation.runDeepSimulation` (4 rounds, 6 roles, 80% convergence) | Per-role assessment, convergence ratio, synthesis |
| 4.5 | "What is the human edit distance after the agent generates a draft? Is it decreasing over time?" | `dimensionTools` (time-to-first-draft, humanEditDistance metrics) | Throughput score components |
| 4.6 | "Log this mentor introduction as an intervention and project its expected uplift on trust leverage." | `trajectory/mutations` + `trajectoryInterventionEvents` schema | expectedScoreDelta, expectedWindowEndAt |

## Category 5: Market Variables (Environmental Context)

These test whether the system can factor in external conditions that affect entity trajectories.

| # | Question | System Module | Expected Output Dimensions |
|---|----------|--------------|---------------------------|
| 5.1 | "What is the trend alignment score for this product given current market signals?" | `researchTools` + `signalProcessingTools` + trajectory scoring | Signal confidence, trajectory context |
| 5.2 | "Analyze the competition density: how many similar products exist and what is our differentiation surface?" | `reconTools.analyze_project` + swarm (Strategy Architect role) | opportunity_identified gate, strategic positioning |
| 5.3 | "What is the distribution friction for reaching our ICP through the current channel mix?" | `seoTools` + `voiceBridgeTools` + trajectory trust edges | Channel-specific trustLeverage by distribution path |
| 5.4 | "Given the timing window (regulatory change, market shift, competitor failure), should we accelerate or hold?" | `preExecutionGate` (right_audience + information_not_lost gates) + swarm deliberation | Boolean gate results + deliberation synthesis |
| 5.5 | "Run a narrative forecast: if we publish this positioning, what second-order reactions might emerge?" | `swarmDeliberation` (all 6 roles simulating different audience segments) | Multi-role reaction synthesis, risk assessment |

## Category 6: Constraint Variables (Reachable Space)

These test whether the system respects hard limits and optimizes within bounds.

| # | Question | System Module | Expected Output Dimensions |
|---|----------|--------------|---------------------------|
| 6.1 | "Given our compute budget, what is the maximum useful simulation depth before diminishing returns?" | `autonomousCrons` budget gates + eval harness throughput metrics | wallClockMs, tool-call count, cost per span |
| 6.2 | "What is the team bandwidth utilization? How many concurrent missions can run before quality degrades?" | `missions/costQueries` + `trajectoryBenchmarkRuns` quality under load | taskCompletionRate vs concurrency level |
| 6.3 | "If we cap the self-evolution loop to 2 proposals per cycle, does that reduce thrashing without starving improvement?" | `selfEvolution.EVOLUTION_SAFETY_GATES.maxChangesPerCycle` analysis | Evolution proposal acceptance rate over time |
| 6.4 | "What regulatory or compliance constraints should gate this agent action before it fires?" | `preExecutionGate` disqualifiers (sensitive_topic, command_word) | Disqualifier hit rate, escalation count |
| 6.5 | "Optimize the agent's token budget: which tool calls produce the most trajectory-moving evidence per token spent?" | `sessionMemoryTools.refresh_task_context` + tool call stats | Per-tool evidence yield / token cost ratio |

---

## Cross-Category Compound Questions

These exercise multiple variable categories simultaneously — the hardest and most valuable.

| # | Question | Categories | System Modules |
|---|----------|-----------|---------------|
| C.1 | "Is this entity's trajectory compounding because of intrinsic quality improvement, or because of network effects from trust nodes? Decompose the signal." | Intrinsic + Network + Temporal | Full trajectory scoring with trustAmplification isolation |
| C.2 | "If we intervene now (Category 4) given the current market window (Category 5), what is the projected compounding effect (Category 2) given our budget constraints (Category 6)?" | Intervention + Market + Temporal + Constraint | Projection with intervention delta + budget feasibility |
| C.3 | "Run the full observe-decide-act-learn-evolve loop on this entity: observe its current state, decide whether to act (5 gates), act (swarm deliberation), learn (decision memory), evolve (self-evolution proposal)." | All 6 categories | preExecutionGate + swarmDeliberation + decisionMemory + selfEvolution + trajectory scoring |
| C.4 | "Compare simulated MiroFish outcomes (what agents predicted would happen) against real trajectory outcomes (what actually happened). Where did the simulation diverge from reality?" | Temporal + Intervention + Market | Simulated vs actual scoreBreakdown diff, variable attribution |
| C.5 | "Which variable category contributes most to this entity's current trajectory label? Run an ablation: zero out each category's inputs and measure the score change." | All 6 categories | 6x trajectory scoring with ablated inputs, delta ranking |

---

## How to Use This Document

1. **For eval harness expansion**: Each question maps to specific tool calls. Add them to `evalHarness.test.ts` as new scenarios.
2. **For swarm deliberation seeding**: Use Category 4-5 questions as deliberation topics for the 6 agency roles.
3. **For self-evolution testing**: Use Category 2.4 and 4.3 to verify the evolution verification pipeline.
4. **For trajectory intelligence validation**: Use Category 2.1-2.5 to validate that `computeTrajectoryScores` produces meaningful differentiation.
5. **For MiroFish integration**: Use compound questions C.1-C.5 as the bridge between simulation and reality measurement.
