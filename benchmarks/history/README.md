# benchmarks/history/

Historical benchmark runs — point-in-time snapshots of eval scores, latency, and cost baselines. Kept for regression comparison and reproducibility audits.

## Structure

| Folder | What's inside |
|---|---|
| `archived-2026-q1/` | Run reports from Q1 2026 (moved here from `docs/architecture/benchmarks/` during the 2026-04 docs consolidation). Each run has a `.json` (machine-readable) + `.md` (human-readable). |

## Conventions for new runs

New benchmark run reports should be written here with the naming:

```
benchmark-<suite>-<YYYY-MM-DDTHH-mm-ss>.json
benchmark-<suite>-<YYYY-MM-DDTHH-mm-ss>.md
```

Latest-pointer files (e.g. `benchmark-report-latest.json`) may exist alongside dated runs for tooling that compares "latest vs previous."

## Why this lives outside `docs/`

Benchmark data is code-adjacent, not documentation. It's produced by the eval harness in [`packages/mcp-local/src/benchmarks/`](../../packages/mcp-local/src/benchmarks/) and consumed by regression-detection tooling. Keeping it here avoids bloating `docs/` with machine-generated artifacts.

## Related

- Eval harness: [`packages/mcp-local/src/benchmarks/`](../../packages/mcp-local/src/benchmarks/)
- Eval flywheel (deferred): see the forthcoming `docs/architecture/EVAL_AND_FLYWHEEL.md`
