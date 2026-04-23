---
name: pipeline-operational-loop
description: |
  Run the repeatable operational loop on the NodeBench real-time chat pipeline
  or the report generator pipeline. Every pipeline change flows through:
  instrument → judge → persist → surface → measure → regress.

  Triggers: "pipeline", "operational loop", "run the standard", "measure the
  pipeline", "judge the traces", "chat pipeline change", "report generator
  change", or any edit to server/pipeline/* or convex/domains/product/diligence*.
---

# Pipeline Operational Loop

Standard template for evaluating any change to the real-time chat pipeline or
the report generator pipeline.

Canonical spec: `docs/architecture/PIPELINE_OPERATIONAL_STANDARD.md`
Rule mirror: `.Codex/rules/pipeline_operational_standard.md`

## Step 0 — Diagnose first (analyst mindset)
Before writing code, answer:
- Which pipeline layer changed? (args, emit, judge, persistence, UI, dashboard)
- Does it change the contract (EmitProjectionArgs or RunTelemetry)?
- Does it change a judge gate? (if yes → dashboards depend on `GATE_ORDER`)
- What's the failure mode this change prevents or creates?

## Step 1 — Contract
- Update `EmitProjectionArgs` (server/pipeline/diligenceProjectionWriter.ts) if needed.
- Mirror the shape in `convex/schema.ts` → `diligenceProjections` / `diligenceRunTelemetry`.
- Mirror in Convex args validators (`recordTelemetry`, `recordVerdict`).

## Step 2 — Instrument
Every emit goes through `emitDiligenceProjectionInstrumented(...)`:
```ts
await emitDiligenceProjectionInstrumented(mutationCaller, args, {
  seedTelemetry: { toolCalls, tokensIn, tokensOut, sourceCount },
  onTelemetry: async (t, a) => {
    const { id } = await convex.mutation(api.domains.product.diligenceRunTelemetry.recordTelemetry, { ...mapTelemetry(a, t) });
    const verdict = judgeDiligenceRun({ args: a, telemetry: t });
    await convex.mutation(api.domains.product.diligenceJudge.recordVerdict, {
      telemetryId: id,
      ...verdict,
      gatesJson: JSON.stringify(verdict.gates),
    });
  },
});
```

## Step 3 — Judge
`judgeDiligenceRun` is a pure deterministic function. Don't call LLMs here.
Don't read wall-clock. Don't randomize.

Add a new gate only by:
1. Extending the `GateName` union in `server/pipeline/diligenceJudge.ts`.
2. Appending to `GATE_ORDER` (never reshuffle — dashboards depend on it).
3. Adding the evaluator fn.
4. Adding a row to §3 of `PIPELINE_OPERATIONAL_STANDARD.md`.
5. Adding scenario tests in `diligenceJudge.test.ts` covering pass, fail, and skip.

## Step 4 — Persist
- `recordTelemetry(...)` — one row per emit (success or failure).
- `recordVerdict(...)` — one row per judged telemetry row.
- Both are BOUND and indexed; see `convex/schema.ts`.

## Step 5 — Surface
- Operator UI shows verdict + per-gate breakdown ABOVE the raw trace drill-down.
- For `needs_review` and `failed`, surface next-action hints derived from gate reasons.

## Step 6 — Measure
- `rollupRecent` → p50/p95 latency, error rate, created/updated/stale mix.
- `rollupVerdicts` → verified rate, average score, verdict tier breakdown.

## Step 7 — Regress
Minimum regression floor:
```
npx convex codegen
npx tsc --noEmit
npx vitest run server/pipeline/diligenceJudge.test.ts server/pipeline/diligenceProjectionWriter.test.ts
npm run build
```
If UI changed: `npm run dogfood:verify:smoke`

## Scenario coverage bar (scenario_testing.md)
Every pipeline change needs tests for:
- Happy path (orchestrator persona, full telemetry, verified)
- Degraded (latency blown → needs_review)
- Adversarial (non-monotonic version, whitespace id, negative tokens, unknown tier)
- Partial telemetry (tokens missing → skipped, not failed)
- Long-running accumulation (100+ sequential judgments)
- Determinism (same input → same output across 3 calls)

## Incident response
When verified rate drops:
1. Read last 50 telemetry + verdict rows
2. Group failures by dominant failing gate
3. 5-whys (analyst_diagnostic.md)
4. Scenario test FIRST, fix SECOND
5. Cite gate name + telemetry rowId in the commit message

## Completion traceability
On task completion, cite the original request and link:
- Files changed
- Tests added
- Verdict + telemetry dashboards affected
- Any gate added/modified
