# Ultra-Long Chat Eval

Generated: 2026-04-23T08:14:09.069Z
Passed: false
Progressive score: 59
Real-path score: 92
Kitchen-sink savings: 35%
Final context rot risk: medium

## Progressive Disclosure

Passed: false
Overall score: 59
Relevance accuracy: 89
Token efficiency: 0
Context rot score: 72

## Real Path

Passed: false
Overall score: 92
Advisor model: kimi-k2.6
Executor samples: 
Input-cost savings vs kitchen sink: 35%

### Findings

- turn 31 (recall competitive): messagesCompacted=21, activeAngles=[entity_profile, competitive_intelligence, market_dynamics, academic_research], rot=medium
- turn 49 (priority recall): priorityLedger=[Today's calendar: 3pm product loop, 5pm CFO panel | Today's tasks: interview prep for Stripe PM loop, draft counter for offer | Help me prepare talking points for the product loop interview.]
- turn 51 (final brief): rot=medium, compacted=41, capsules=2
- Scoring: compaction=18, ledger=12, angles=18, rot=15, routing=10, jit=15, savingsBonus=4

### Assertion Failures

- none

## Progressive vs Kitchen Sink

Progressive tokens: 5324
Kitchen-sink tokens: 5164
Recommendation: Progressive disclosure is not yet outperforming the kitchen-sink baseline; tighten compaction before shipping.

## Artifacts

- D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/ultra-long-chat-eval-2026-04-23T08-14-04.json