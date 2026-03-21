# Oracle → Trajectory State Handoff

## Overview

The V3 trajectory layer is a **derived domain** projected over existing mission, trace, benchmark, and Oracle data. It does NOT own its own source-of-truth tables for workflow execution — instead it projects trajectory scores from existing Convex tables and optionally persists snapshots for historical comparison.

## Data Flow

```
Source tables (existing)          Trajectory domain (new)
─────────────────────────         ─────────────────────────
agentTaskSessions ───────┐
taskTraces ──────────────┤
runSteps ────────────────┼──→ projection.ts ──→ trajectoryEntities
proofPacks ──────────────┤        │               trajectorySummaries
baselineComparisons ─────┤        │               trajectoryCompoundingScores
judgeReviews ────────────┘        │
                                  ▼
                           lib.ts::computeTrajectoryScores()
                                  │
                                  ▼
                           6 derived scores:
                             - spanQuality
                             - evidenceCompleteness
                             - adaptationVelocity
                             - trustLeverage
                             - interventionEffect
                             - drift
                           + rawCompounding
                           + trustAdjustedCompounding
```

## Frontend Surfaces

| Surface | Route | Component | What it shows |
|---------|-------|-----------|---------------|
| Oracle Control Tower | `/oracle` | `OracleControlTowerPanel.tsx` | Product-level trajectory summary band |
| Execution Trace | `/execution-trace` | `ExecutionTraceView.tsx` | Per-workflow summary + timeline |
| Entity Profile | `/entity/:name` | `EntityProfilePage.tsx` | Per-entity summary + timeline + benchmarks + interventions |
| Workbench | `/benchmarks` | `WorkbenchView.tsx` | Benchmark trajectory summary + filtered timeline |

## Key Queries

| Query | Input | Returns |
|-------|-------|---------|
| `getTrajectoryDashboardSnapshot` | `windowDays?` | Product summary + top 4 workflow summaries |
| `getTrajectorySummary` | `entityKey, entityType, windowDays?` | Full summary with score breakdown |
| `getTrajectoryTimeline` | `entityKey, entityType, windowDays?` | Chronological timeline items (spans, verdicts, feedback, interventions, benchmarks) |
| `getBenchmarkTrajectory` | `entityKey, entityType, windowDays?` | Benchmark run history with uplift metrics |
| `getInterventionAttribution` | `entityKey, entityType, windowDays?` | Intervention events with observed deltas |

## Projection vs Persistence

- **Projection** (default): `buildTrajectoryProjection()` reads live data from source tables and computes scores on the fly. No writes needed.
- **Persistence** (optional): `rebuildTrajectoryEntity` mutation snapshots a projection into `trajectoryEntities`, `trajectorySummaries`, and `trajectoryCompoundingScores` for historical comparison.
- Queries check for persisted data first; if absent, they fall back to live projection.

## Edge Cases

- **Pending sessions without traces**: `ExecutionTraceView` guards against `undefined` workflow keys by falling back to the seeded spreadsheet trace demo.
- **Empty entities**: All queries return safe empty states (`null` summaries, `[]` timelines).
- **Score scale**: All scores are 0–1 (not percentages). `formatScore()` in UI multiplies by 100.
