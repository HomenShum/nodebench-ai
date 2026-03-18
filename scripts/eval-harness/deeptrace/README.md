# DeepTrace Claude Code Eval Pack

This folder contains the bounded offline artifacts for DeepTrace autoresearch evaluation.

## Core artifacts

- `claude-baseline.prompt.md`
- `claude-nodebench.prompt.md`
- `canary-benchmark-spec.json`
- `scorecard-schema.json`
- `optimizerRunner.ts`

## Offline optimizer CLI

Package scripts:

- `npm run deeptrace:autoresearch:baseline -- --metrics <metrics.json> [--out <baseline.json>]`
- `npm run deeptrace:autoresearch:optimize -- --baseline <baseline.json> --proposer <module.ts> [--config <config.json>]`
- `npm run deeptrace:autoresearch:replay -- <sessionId>`
- `npm run deeptrace:autoresearch:paired-bench [-- --outDir <relative/output/dir>]`

`baseline` expects a JSON document shaped as either:

- `{ "throughputMetrics": { ... }, "qualityMetrics": { ... } }`, or
- `{ "throughput": { ... }, "quality": { ... } }`

`optimize` requires a repo-local proposer module that exports `default`, `propose`, or `proposeCandidate` with the optimizer contract from `optimizerRunner.ts`.

Run logs are written to `scripts/eval-harness/deeptrace/run-logs/` and baseline snapshots to `scripts/eval-harness/deeptrace/baseline-snapshots/`.

The paired benchmark runner writes per-case artifacts and a paired summary to `scripts/eval-harness/deeptrace/paired-results/<suiteId>/`. It hashes the two prompt templates, records the benchmark metadata contract from `canary-benchmark-spec.json`, and emits baseline-vs-DeepTrace scorecard comparisons using `scorecard-schema.json`.

Architecture positioning:

- this runner is the repo-local DeepTrace dogfooding eval for baseline-vs-NodeBench prompt contracts
- it is the deterministic proof path for uplift, evidence linkage, receipt completeness, and false-confidence guardrails
- it is not the same as the still-future live multi-model `model_monitor` eval over real Slack or operator traffic
- any future live telemetry wiring should source actual model / token / latency metadata from `convex/domains/ai/models/modelRouter.ts`

## Runtime research-cell boundary

The runtime research cell remains bounded to re-analysis of existing DeepTrace state. It does not acquire new external evidence. Use `researchCell=true` for threshold-driven activation and `forceResearchCell=true` only for explicit operator-forced runs.
