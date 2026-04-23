# Product Answer-Control Eval

Generated: 2026-04-22T17:23:27.590Z
Overall pass rate: 100%

## Dimensions

| Dimension | Passed | Total | Pass Rate | Threshold | Gate |
|---|---|---|---|---|---|
| entity_resolution | 5 | 5 | 100% | 80% | true |
| retrieval_relevance | 5 | 5 | 100% | n/a | n/a |
| claim_support | 5 | 5 | 100% | 60% | true |
| final_response_quality | 5 | 5 | 100% | n/a | n/a |
| trajectory_quality | 5 | 5 | 100% | 80% | true |
| actionability | 5 | 5 | 100% | 80% | true |
| artifact_decision_quality | 5 | 5 | 100% | 80% | true |
| ambiguity_recovery | 2 | 2 | 100% | 75% | true |

## Scenario Results

| Scenario | Resolution | Artifact | Save | Report | Overall |
|---|---|---|---|---|---|
| exact_save_ready_softbank | exact | saved | save_ready | true | true |
| probable_draft_vitalize | probable | draft | draft_only | true | true |
| ambiguous_blocked_tell | ambiguous | none | blocked | false | true |
| unresolved_follow_up | unresolved | none | blocked | false | true |
| exact_conflict_softbank | exact | draft | draft_only | true | true |

## Notes

### exact_save_ready_softbank

- entity_resolution: PASS (expected exact/softbank, got exact/softbank)
- retrieval_relevance: PASS (sourceEvents=2, reportSources=2)
- claim_support: PASS (publishable=3, corroborated=3, contradicted=0)
- final_response_quality: PASS (compiledTruthSentences=3, pendingInterrupts=0)
- trajectory_quality: PASS (runEvents=run_started, intent_classified, entity_candidates_ranked, entity_resolution_finalized, evidence_collected, claims_extracted, claims_rejected, claims_published, truth_compiled, actions_compiled, artifact_state_changed, run_completed)
- actionability: PASS (actions=3, candidates=1, interrupts=0)
- artifact_decision_quality: PASS (artifact=saved, save=save_ready, reportCreated=true)
- ambiguity_recovery: PASS (candidates=1, interrupts=none)

### probable_draft_vitalize

- entity_resolution: PASS (expected probable/vitalize, got probable/vitalize)
- retrieval_relevance: PASS (sourceEvents=1, reportSources=1)
- claim_support: PASS (publishable=1, corroborated=0, contradicted=0)
- final_response_quality: PASS (compiledTruthSentences=2, pendingInterrupts=1)
- trajectory_quality: PASS (runEvents=run_started, intent_classified, entity_candidates_ranked, entity_resolution_finalized, evidence_collected, claims_extracted, claims_rejected, claims_published, truth_compiled, actions_compiled, artifact_state_changed, interrupt_created, run_completed)
- actionability: PASS (actions=3, candidates=1, interrupts=1)
- artifact_decision_quality: PASS (artifact=draft, save=draft_only, reportCreated=true)
- ambiguity_recovery: PASS (candidates=1, interrupts=quality_gate_blocked_save)

### ambiguous_blocked_tell

- entity_resolution: PASS (expected ambiguous/none, got ambiguous/none)
- retrieval_relevance: PASS (sourceEvents=2, reportSources=0)
- claim_support: PASS (publishable=0, corroborated=2, contradicted=0)
- final_response_quality: PASS (compiledTruthSentences=0, pendingInterrupts=2)
- trajectory_quality: PASS (runEvents=run_started, intent_classified, entity_candidates_ranked, entity_resolution_finalized, evidence_collected, claims_extracted, claims_rejected, truth_compiled, actions_compiled, artifact_state_changed, interrupt_created, interrupt_created, run_completed)
- actionability: PASS (actions=3, candidates=2, interrupts=2)
- artifact_decision_quality: PASS (artifact=none, save=blocked, reportCreated=false)
- ambiguity_recovery: PASS (candidates=2, interrupts=entity_disambiguation_required, quality_gate_blocked_save)

### unresolved_follow_up

- entity_resolution: PASS (expected unresolved/none, got unresolved/none)
- retrieval_relevance: PASS (sourceEvents=1, reportSources=0)
- claim_support: PASS (publishable=0, corroborated=0, contradicted=0)
- final_response_quality: PASS (compiledTruthSentences=0, pendingInterrupts=2)
- trajectory_quality: PASS (runEvents=run_started, intent_classified, entity_candidates_ranked, entity_resolution_finalized, evidence_collected, claims_extracted, claims_rejected, truth_compiled, actions_compiled, artifact_state_changed, interrupt_created, interrupt_created, run_completed)
- actionability: PASS (actions=2, candidates=0, interrupts=2)
- artifact_decision_quality: PASS (artifact=none, save=blocked, reportCreated=false)
- ambiguity_recovery: PASS (candidates=0, interrupts=missing_required_context, quality_gate_blocked_save)

### exact_conflict_softbank

- entity_resolution: PASS (expected exact/softbank, got exact/softbank)
- retrieval_relevance: PASS (sourceEvents=2, reportSources=2)
- claim_support: PASS (publishable=1, corroborated=4, contradicted=2)
- final_response_quality: PASS (compiledTruthSentences=3, pendingInterrupts=2)
- trajectory_quality: PASS (runEvents=run_started, intent_classified, entity_candidates_ranked, entity_resolution_finalized, evidence_collected, claims_extracted, claims_rejected, claims_published, truth_compiled, actions_compiled, artifact_state_changed, interrupt_created, interrupt_created, run_completed)
- actionability: PASS (actions=3, candidates=1, interrupts=2)
- artifact_decision_quality: PASS (artifact=draft, save=draft_only, reportCreated=true)
- ambiguity_recovery: PASS (candidates=1, interrupts=conflicting_evidence_detected, quality_gate_blocked_save)
