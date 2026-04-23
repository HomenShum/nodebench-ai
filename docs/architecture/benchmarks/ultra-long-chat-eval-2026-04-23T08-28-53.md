# Ultra-Long Chat Eval

Generated: 2026-04-23T08:28:58.050Z
Passed: true
Progressive score: 80
Real-path score: 102
Kitchen-sink savings: 50%
Final context rot risk: medium

## Progressive Disclosure

Passed: true
Overall score: 80
Relevance accuracy: 100
Token efficiency: 33
Context rot score: 72

## Real Path

Passed: true
Overall score: 102
Advisor model: kimi-k2.6
Executor samples: gemini-3-flash-preview, gemini-3-flash-preview, gemini-3-flash-preview, gemini-3-flash-preview, gemini-3-flash-preview
Input-cost savings vs kitchen sink: 50%

### Findings

- turn 31 (recall competitive): messagesCompacted=21, activeAngles=[entity_profile, competitive_intelligence, market_dynamics], rot=medium
- turn 49 (priority recall): priorityLedger=[I care about long-term upside more than base. | My priority is equity and ramp-time. | Remind me — what are my priorities for this whole job search?]
- turn 51 (final brief): rot=medium, compacted=41, capsules=2
- Scoring: compaction=18, ledger=18, angles=18, rot=15, routing=10, jit=15, savingsBonus=8

### Assertion Failures

- none

## Progressive vs Kitchen Sink

Progressive tokens: 3630
Kitchen-sink tokens: 4685
Recommendation: Use compaction-first working sets with JIT hydration; kitchen-sink prompts waste tokens and increase context-rot risk.

## Artifacts

- D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/ultra-long-chat-eval-2026-04-23T08-28-53.json