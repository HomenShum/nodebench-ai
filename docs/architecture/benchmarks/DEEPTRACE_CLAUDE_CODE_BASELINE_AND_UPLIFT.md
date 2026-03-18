# DeepTrace Claude Code Baseline and Uplift Benchmark

Status: benchmark contract  
Date: 2026-03-15

## Objective

Measure the value of DeepTrace on top of stock Claude Code as Anthropic continuously updates models and tooling.

The benchmark must always answer three questions:

1. How strong is the current raw Claude baseline?
2. How strong is Claude Code with NodeBench / DeepTrace MCP enabled?
3. What is the relative uplift or regression?

## Comparison modes

### Mode A: baseline Claude Code

Rules:

- built-in Claude Code tools only
- no NodeBench MCP servers
- no custom CLI bridge
- no DeepTrace prompts

### Mode B: Claude Code plus DeepTrace

Rules:

- same task inputs
- same repo snapshot
- same output contract
- NodeBench MCP and CLI access allowed
- receipts, evidence, and trace bundles required

## Paired benchmark families

Run both modes on the same case.

1. company direction analysis
2. relationship graph mapping
3. repo and contributor intelligence
4. world-event to company-impact causal analysis
5. trace-backed draft and verdict generation

## Run metadata to log

Every run must record:

- `runId`
- `benchmarkCaseId`
- `mode`: `baseline` or `deeptrace`
- `timestamp`
- `repoCommit`
- `inputSnapshotHash`
- `promptTemplateHash`
- `mcpConfigHash`
- `modelName`
- `claudeCodeVersion` when available
- `wallClockMs`
- `toolCallCount`
- `tokenCount`
- `artifactPaths[]`

## Scoring

Use the same weighted score in both modes.

| Metric | Weight |
|---|---:|
| factual accuracy | 0.20 |
| relationship accuracy | 0.15 |
| causal chain quality | 0.15 |
| counter-hypothesis quality | 0.10 |
| limitations honesty | 0.10 |
| evidence linkage | 0.10 |
| receipt completeness | 0.10 |
| human edit distance | 0.10 |

### Additional tracked metrics

- task completion rate
- confidence calibration
- false-confidence rate
- time to first usable draft
- number of blocked or approval-gated steps

## Release guardrails

Fail the release if any of the following regress:

- relative uplift on core suites drops below threshold
- evidence linkage decreases
- receipt completeness decreases
- false-confidence rate increases
- human edit distance materially worsens
- output quality rises while traceability falls

## Weekly canary

Run the paired suite:

- on every release
- weekly against current Claude Code
- after any major model or Claude Code update

Track:

- baseline absolute score
- DeepTrace absolute score
- relative uplift
- stability trend over time

## Current repo-local implementation status

The benchmark contract is now executable in-repo via:

- `npm run deeptrace:autoresearch:paired-bench`
- implementation: `scripts/eval-harness/deeptrace/paired-benchmark-runner.ts`
- operator docs: `scripts/eval-harness/deeptrace/README.md`

The current runner is intentionally deterministic and artifact-first:

- hashes both prompt templates
- records the benchmark metadata contract (`promptTemplateHash`, `mcpConfigHash`, `modelName`, `tokenCount`, `wallClockMs`, `artifactPaths`)
- emits per-case baseline and DeepTrace result artifacts
- writes suite-level uplift and release-guard summaries

Reference proof artifact:

- `scripts/eval-harness/deeptrace/paired-results/paired-1773815410138/paired-summary.json`

## Architecture mapping

This benchmark now fills the **repo-local paired proof** part of the larger OpenClaw architecture, but not the full live eval loop.

What it already covers:

- **Dogfooding eval, phase 0:** prompt-contract changes can be checked against the same baseline-vs-NodeBench fixtures before they are treated as improvements
- **Traceability guardrails:** evidence linkage, receipt completeness, and false-confidence rate are enforced alongside uplift
- **Operator proof pack:** results are durable and comparable over time without requiring live provider calls

What is still intentionally separate:

- the proposed weekly `model_monitor`-style eval that runs real recent Slack or operator tasks through multiple live models
- automatic `TASK_MODEL_ALLOCATION` updates based on those live outcomes
- any cloud-native cron or observer integration

## Telemetry mapping

For live or provider-backed variants of this benchmark, the correct telemetry substrate is the unified router in `convex/domains/ai/models/modelRouter.ts`.

That router already returns:

- `modelId`
- `inputTokens`
- `outputTokens`
- `costUsd`
- `latencyMs`
- routing metadata

So the remaining telemetry gap is downstream wiring: benchmark reports, observer footers, or future live eval jobs should read actual router metadata instead of hard-coding a model label.

## Interpretation rule

DeepTrace is not trying to permanently “beat Claude” on general intelligence.

DeepTrace should consistently add value in:

- persistent execution state
- evidence linkage
- receipt completeness
- causal relationship depth
- dimension-aware reasoning
- human-review readiness
