# Product Answer-Control Eval

Generated: 2026-04-22T18:28:15.044Z
Overall pass rate: 0%

## Dimensions

| Dimension | Passed | Total | Pass Rate | Threshold | Gate |
|---|---|---|---|---|---|
| entity_resolution | 0 | 5 | 0% | 80% | false |
| retrieval_relevance | 5 | 5 | 100% | n/a | n/a |
| claim_support | 0 | 5 | 0% | 60% | false |
| final_response_quality | 0 | 5 | 0% | n/a | n/a |
| trajectory_quality | 0 | 5 | 0% | 80% | false |
| actionability | 0 | 5 | 0% | 80% | false |
| artifact_decision_quality | 0 | 5 | 0% | 80% | false |
| ambiguity_recovery | 0 | 2 | 0% | 75% | false |

## Scenario Results

| Scenario | Resolution | Artifact | Save | Report | Overall |
|---|---|---|---|---|---|
| exact_save_ready_softbank | n/a | n/a | n/a | true | false |
| probable_draft_vitalize | n/a | n/a | n/a | true | false |
| ambiguous_blocked_tell | n/a | n/a | n/a | true | false |
| unresolved_follow_up | n/a | n/a | n/a | true | false |
| exact_conflict_softbank | n/a | n/a | n/a | true | false |

## Notes

### exact_save_ready_softbank

- entity_resolution: FAIL (expected exact/softbank, got null/softbank)
- retrieval_relevance: PASS (sourceEvents=2, reportSources=2)
- claim_support: FAIL (publishable=0, corroborated=0, contradicted=0)
- final_response_quality: FAIL (compiledTruthSentences=0, pendingInterrupts=0)
- trajectory_quality: FAIL (runEvents=)
- actionability: FAIL (actions=0, candidates=0, interrupts=0)
- artifact_decision_quality: FAIL (artifact=null, save=null, reportCreated=true)
- ambiguity_recovery: PASS (candidates=0, interrupts=none)

### probable_draft_vitalize

- entity_resolution: FAIL (expected probable/vitalize, got null/vitalize)
- retrieval_relevance: PASS (sourceEvents=1, reportSources=1)
- claim_support: FAIL (publishable=0, corroborated=0, contradicted=0)
- final_response_quality: FAIL (compiledTruthSentences=0, pendingInterrupts=0)
- trajectory_quality: FAIL (runEvents=)
- actionability: FAIL (actions=0, candidates=0, interrupts=0)
- artifact_decision_quality: FAIL (artifact=null, save=null, reportCreated=true)
- ambiguity_recovery: PASS (candidates=0, interrupts=none)

### ambiguous_blocked_tell

- entity_resolution: FAIL (expected ambiguous/none, got null/tellcom)
- retrieval_relevance: PASS (sourceEvents=2, reportSources=0)
- claim_support: FAIL (publishable=0, corroborated=0, contradicted=0)
- final_response_quality: FAIL (compiledTruthSentences=0, pendingInterrupts=0)
- trajectory_quality: FAIL (runEvents=)
- actionability: FAIL (actions=0, candidates=0, interrupts=0)
- artifact_decision_quality: FAIL (artifact=null, save=null, reportCreated=true)
- ambiguity_recovery: FAIL (candidates=0, interrupts=none)

### unresolved_follow_up

- entity_resolution: FAIL (expected unresolved/none, got null/tell-me-more-about-the-job-and-company)
- retrieval_relevance: PASS (sourceEvents=1, reportSources=0)
- claim_support: FAIL (publishable=0, corroborated=0, contradicted=0)
- final_response_quality: FAIL (compiledTruthSentences=0, pendingInterrupts=0)
- trajectory_quality: FAIL (runEvents=)
- actionability: FAIL (actions=0, candidates=0, interrupts=0)
- artifact_decision_quality: FAIL (artifact=null, save=null, reportCreated=true)
- ambiguity_recovery: FAIL (candidates=0, interrupts=none)

### exact_conflict_softbank

- entity_resolution: FAIL (expected exact/softbank, got null/softbank)
- retrieval_relevance: PASS (sourceEvents=2, reportSources=2)
- claim_support: FAIL (publishable=0, corroborated=0, contradicted=0)
- final_response_quality: FAIL (compiledTruthSentences=0, pendingInterrupts=0)
- trajectory_quality: FAIL (runEvents=)
- actionability: FAIL (actions=0, candidates=0, interrupts=0)
- artifact_decision_quality: FAIL (artifact=null, save=null, reportCreated=true)
- ambiguity_recovery: PASS (candidates=0, interrupts=none)
