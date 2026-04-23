# Runtime Upgrade Compare

Generated: 2026-04-21T21:50:00.000Z
Scope: `runEvents + interrupts + provider budget UI + tool-call recovery`

## Compared Artifacts

- Before full-stack: [full-stack-eval-2026-04-21T16-49-13.json](</D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/full-stack-eval-2026-04-21T16-49-13.json>)
- After full-stack: [full-stack-eval-2026-04-21T20-24-30.json](</D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/full-stack-eval-2026-04-21T20-24-30.json>)
- Before capability metrics: [comprehensive-eval-2026-04-21T16-23-48-metrics.json](</D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/comprehensive-eval-2026-04-21T16-23-48-metrics.json>)
- After capability metrics: [comprehensive-eval-2026-04-21T20-54-13-metrics.json](</D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/comprehensive-eval-2026-04-21T20-54-13-metrics.json>)
- After expanded coverage: [expanded-eval-2026-04-21T21-19-23.json](</D:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/expanded-eval-2026-04-21T21-19-23.json>)

## Headline

The runtime upgrade improved orchestration quality and latency, but it did not improve groundedness enough to change release readiness.

- Capability pass rate improved from `53.1%` to `57.3%`
- p95 latency improved from `136.7s` to `81.8s`
- Memory-first, tool-ordering, and skill-first compliance improved from `61.5%` to `64.6%`
- Expanded feature coverage improved from `61.3%` to `71.0%`
- LLM judge average slipped from `5.4/10` to `5.3/10`
- Groundedness stayed weak and regressed on `factuallyAccurate` and `noHallucinations`

## Before / After

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Capability pass rate | 53.1% | 57.3% | +4.2 pts |
| Avg latency | 45.1s | 36.1s | -9.0s |
| p95 latency | 136.7s | 81.8s | -54.9s |
| Memory-first compliance | 61.5% | 64.6% | +3.1 pts |
| Tool ordering accuracy | 61.5% | 64.6% | +3.1 pts |
| Skill-first rate | 61.5% | 64.6% | +3.1 pts |
| LLM judge average | 5.4/10 | 5.3/10 | -0.1 |
| Expanded feature pass rate | 61.3% | 71.0% | +9.7 pts |
| Notebook worst p95 | 209ms | 168ms | -41ms |
| History soak worst p95 | 347ms | 646ms | +299ms |
| Dogfood score | 97/100 | 97/100 | flat |
| Dogfood real issues | 2 | 4 | +2 |

## Groundedness

| Criterion | Before | After | Delta |
|---|---:|---:|---:|
| citesGroundTruth | 74.1% | 74.2% | +0.1 pts |
| entityCorrect | 62.1% | 66.1% | +4.0 pts |
| factuallyAccurate | 13.8% | 9.7% | -4.1 pts |
| noHallucinations | 17.2% | 16.1% | -1.1 pts |
| noContradictions | 98.3% | 100.0% | +1.7 pts |
| isActionable | 27.6% | 21.0% | -6.6 pts |
| hasDebrief | 0.0% | 1.6% | +1.6 pts |

Interpretation:

- The runtime is making better routing and sequencing decisions.
- The answers are arriving faster and following the intended memory-first/tool-first contract more reliably.
- The quality bottleneck is still answer grounding and usefulness, not orchestration or storage performance.

## Model Notes

| Model | Before Pass | After Pass | Before Avg Latency | After Avg Latency |
|---|---:|---:|---:|---:|
| claude-haiku-4.5 | 75% | 84% | 60.7s | 57.9s |
| gpt-5-mini | 84% | 88% | 64.9s | 40.3s |
| gemini-3-flash | 0% | 0% | 9.7s | 10.1s |

Interpretation:

- `gpt-5-mini` is currently the best balanced model in this harness.
- `claude-haiku-4.5` improved materially but is still slower than `gpt-5-mini`.
- `gemini-3-flash` remains non-viable in the current harness and should not be part of the default comparison set until the integration is fixed or retuned.

## Current UX Issues From Dogfood

- `P2` Task tab content fails to update on `home`
- `P2` Voice button lacks interaction feedback on `home`
- `P2` Task tab does not activate upon interaction on `surface-home`
- `P2` This session accordion fails to expand on `surface-chat-q-what-20is-20sof`

## Verdict

This upgrade is a real runtime improvement, but not a release-readiness improvement.

- Good news: faster, broader, more reliable orchestration
- Bad news: groundedness still fails the bar
- Honest state: better demo candidate, still not production candidate

## Next Fix Order

1. Repair factual grounding and hallucination resistance before further model comparison work.
2. Remove or quarantine `gemini-3-flash` from the main lane until it stops hard-failing.
3. Fix the four current dogfood issues so the UX evidence matches the stronger runtime.
4. Add scenario-level assertions for budget interrupts and recovery events so the new runtime features are directly scored in the eval harness.
