# Ultra-Long Chat Eval

Generated: 2026-04-23T08:15:34.462Z
Passed: false
Progressive score: 61
Real-path score: 84
Kitchen-sink savings: 53%
Final context rot risk: medium

## Progressive Disclosure

Passed: false
Overall score: 61
Relevance accuracy: 78
Token efficiency: 28
Context rot score: 72

## Real Path

Passed: false
Overall score: 84
Advisor model: kimi-k2.6
Executor samples: gemini-3-flash-preview, gemini-3-flash-preview, gemini-3-flash-preview, gemini-3-flash-preview, gemini-3-flash-preview
Input-cost savings vs kitchen sink: 53%

### Findings

- turn 31 (recall competitive): messagesCompacted=21, activeAngles=[entity_profile, competitive_intelligence, market_dynamics], rot=medium
- turn 49 (priority recall): priorityLedger=[Today's calendar: 3pm product loop, 5pm CFO panel | Today's tasks: interview prep for Stripe PM loop, draft counter for offer | Help me prepare talking points for the product loop interview.]
- turn 51 (final brief): rot=medium, compacted=41, capsules=2
- Scoring: compaction=18, ledger=0, angles=18, rot=15, routing=10, jit=15, savingsBonus=8

### Assertion Failures

- none

## Progressive vs Kitchen Sink

Progressive tokens: 3805
Kitchen-sink tokens: 4665
Recommendation: Use compaction-first working sets with JIT hydration; kitchen-sink prompts waste tokens and increase context-rot risk.

## Artifacts

- D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/ultra-long-chat-eval-2026-04-23T08-15-30.json