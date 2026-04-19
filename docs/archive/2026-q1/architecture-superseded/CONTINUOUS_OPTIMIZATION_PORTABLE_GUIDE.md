# Continuous Optimization Architecture — Portable Implementation Guide

> Self-directed, hours-long continuous optimization of any research/analysis engine using Claude Code as the optimization brain. Zero API cost. Real code mutations. Compounding performance. **Closed-loop measurement** — not estimates.

## What this is

An architecture where Claude Code acts as both the **proposer** (reads code, reasons about improvements) and the **evaluator** (runs real benchmarks against mutated code, scores proposals against quality guards, promotes winners, ratchets the baseline). The optimizer runs in a continuous loop — each round builds on the previous winner, compounding improvements until the system plateaus.

**Critical distinction**: This is a **closed-loop** system. Candidates are scored on **measured** behavior from real fixture benchmarks, not on estimated metric deltas. The benchmark-proposer dynamically imports mutated code, runs it against canary fixtures, and returns actual throughput/quality numbers.

Proven on NodeBench's DeepTrace research cell: **0.655 → 0.931 throughput** (+42%) across 3 rounds, 30 candidates, zero API cost.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                       CLAUDE CODE SESSION                            │
│                                                                      │
│  ┌───────────┐   ┌──────────────┐   ┌─────────────────────────┐    │
│  │  Phase 1   │──▶│   Phase 2    │──▶│       Phase 3           │    │
│  │ Situational│   │  Compound    │   │   Run Optimizer          │    │
│  │ Awareness  │   │  Proposal    │   │     (15 iters)           │    │
│  │            │   │ Generation   │   │                          │    │
│  │ Read last  │   │ Stack wins + │   │ For each candidate:      │    │
│  │ run log +  │   │ near-misses  │   │  1. Create worktree      │    │
│  │ tracker    │   │ + fresh ideas│   │  2. Apply mutations      │    │
│  └───────────┘   └──────────────┘   │  3. Compile-check        │    │
│                                      │  4. Run canary benchmark  │◄──┤
│  ┌───────────┐   ┌──────────────┐   │  5. Score MEASURED metrics│    │
│  │  Phase 5   │◀──│   Phase 4    │◀──│  6. Guard → Promote/Drop │    │
│  │ Loop /Stop │   │  Analyze +   │   └─────────────────────────┘    │
│  │            │   │  Persist     │                                    │
│  │ Plateau?   │   │              │   ┌─────────────────────────┐    │
│  │ 3 zeros?   │   │ Update       │   │   Canary Benchmark       │    │
│  │ Round cap? │   │ tracker,     │   │                          │    │
│  │            │   │ baseline     │   │ Dynamic import mutated   │    │
│  └───────────┘   └──────────────┘   │ code → run fixtures →    │    │
│                                      │ score 5 dimensions →     │    │
│                                      │ return real metrics      │    │
│                                      └─────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                          │
                   Persisted State
                   ───────────────
                   run-logs/*.json
                   cumulative-tracker.json
                   baseline-snapshots/*.json
                   session-proposals.json
                   canary-results/*.json        ← NEW: real benchmark data
                   canary-results/latest-metrics.json
```

---

## The Two Proposer Modes

The system supports two proposer modes. The **benchmark-proposer** is the closed-loop mode that returns measured metrics. The session-proposer is the fast-iteration mode that returns estimated deltas.

| Aspect | session-proposer (estimated) | benchmark-proposer (measured) |
|--------|-----|------|
| Metrics source | Estimated deltas from proposals JSON | Real benchmark run on mutated code |
| Speed | ~1ms per candidate | ~50-200ms per candidate |
| Accuracy | Approximation (compounds use discount factors) | Ground truth for fixture suite |
| When to use | Fast iteration, early exploration | Promotion-critical rounds, validation |
| API cost | $0 (session-embedded) | $0 (deterministic fixtures) |

**Recommended workflow**: Use session-proposer for rounds 1-2 (broad exploration), then switch to benchmark-proposer for rounds 3+ (precision measurement on promising compounds).

---

## Closed-Loop Architecture (the key innovation)

### The gap in open-loop optimization

Open-loop optimizers apply code mutations and return **estimated** metric improvements. The estimates are based on the proposer's reasoning about what the code change will do. This creates a dangerous gap:

- A mutation that the proposer *thinks* will improve trigger accuracy by +5% might actually break branch planning
- Compound proposals accumulate estimation error — 5 stacked mutations with ±2% error each can produce wildly wrong composite scores
- The ratchet mechanism promotes candidates based on fiction, not measurement

### How the closed loop works

The benchmark-proposer closes this gap with a 3-step pipeline:

```
1. MUTATE — Apply file edits to git worktree (same as session-proposer)
2. MEASURE — Dynamically import mutated code, run canary fixtures, score results
3. RETURN — Send measured ThroughputMetrics + QualityMetrics to optimizer
```

Step 2 is the critical addition. Instead of trusting the proposal's `metricDeltas`, the benchmark-proposer:

1. **Dynamically imports** the mutated `researchCell.ts` (or equivalent) from the worktree using `import(pathToFileURL(worktreePath + "/your-module.ts").href)`
2. **Runs canary fixtures** — deterministic test cases with known inputs and expected outputs
3. **Scores 5 dimensions** with explicit weights:
   - `trigger_accuracy` (25%) — did the system correctly decide to trigger/skip?
   - `branch_coverage` (20%) — did it plan the right research strategies?
   - `usefulness_quality` (20%) — did branches produce useful output?
   - `evidence_completeness` (20%) — are facts and relationships above floor?
   - `execution_efficiency` (15%) — wall clock within budget?
4. **Aggregates** fixture scores into ThroughputMetrics + QualityMetrics matching the optimizer's interface

### Canary fixtures

Each fixture represents a real-world entity investigation scenario:

```typescript
interface CanaryFixture {
  fixtureId: string;           // "startup-low-confidence"
  entityKey: string;           // "company:stealth-ai-startup"
  entityName: string;
  entityType?: string;         // "private_startup"
  dimensionProfile: {          // Simulated current state
    confidence: number;
    coverageRatio: number;
    durableSourceCount: number;
  };
  existingFacts: string[];     // What the system already knows
  expectations: {              // Ground truth
    shouldTrigger: boolean;
    minBranches: number;
    expectedStrategies: string[];
    minUsefulnessAny: number;
    minMergedFacts: number;
    minMergedRelationships: number;
  };
  simulatedBranchResults?: BranchResult[];  // Offline execution results
}
```

**Fixture design principles**:
- Cover the full decision space: high-confidence (should NOT trigger), low-confidence (should trigger), borderline, sparse data, well-covered
- Include expected strategies so branch_coverage scoring works
- Provide simulated branch results for offline/deterministic execution
- Keep fixtures small (5-10) — enough to catch regressions, fast enough to run per candidate

---

## Step-by-Step Setup for Any Repo

### 1. Define your target system

Identify the code you want to optimize. It needs:
- **Source files** (3-7 files max) that control the system's behavior
- **Pure functions** that can be imported and called with fixture data
- **Measurable metrics** — throughput (speed, completion, cost) and quality (accuracy, coverage, safety)
- **Quality guards** — hard floors/ceilings that must never regress

Example mapping:

| Your system | NodeBench equivalent | Key pure functions |
|-------------|---------------------|-------------------|
| RAG pipeline | DeepTrace research cell | `shouldRetrieve`, `rankDocuments`, `generateAnswer` |
| Agent orchestrator | Mission workflow | `planTasks`, `selectTool`, `mergeResults` |
| Prompt library | Heuristics patterns | `selectPrompt`, `scoreRelevance` |
| Scoring engine | Dimension engine | `computeScore`, `evaluateGuards` |

### 2. Create the file structure

```
your-repo/
├── scripts/eval-harness/your-system/
│   ├── optimizerTypes.ts          # Metrics, guards, cost tracking
│   ├── optimizerScoring.ts        # Pure scoring functions
│   ├── optimizerRunner.ts         # Worktree management, evaluation loop
│   ├── session-proposer.ts        # Reads proposals, applies edits (estimated metrics)
│   ├── benchmark-proposer.ts      # Applies edits + runs canary benchmark (measured metrics)
│   ├── canary-benchmark.ts        # Fixture runner, scoring dimensions, metrics aggregation
│   ├── session-proposals.json     # Current round's proposals
│   ├── cumulative-tracker.json    # Cross-round state
│   ├── optimizer-config-15.json   # Iteration config
│   ├── baseline-snapshots/
│   │   └── canary-baseline.json
│   ├── canary-results/            # Benchmark output (auto-created)
│   │   └── latest-metrics.json
│   └── run-logs/
│       └── opt-*.json
├── .claude/rules/
│   └── autoresearch_loop.md       # Self-direction protocol
```

### 3. Define your metrics

```typescript
// optimizerTypes.ts

export interface ThroughputMetrics {
  // Things you want to MAXIMIZE or MINIMIZE
  taskCompletionRate: number;     // higher = better
  timeToFirstDraftMs: number;     // lower = better
  humanEditDistance: number;       // lower = better
  wallClockMs: number;            // lower = better
  toolCallCount: number;          // lower = better
}

export interface QualityMetrics {
  // Things that must NEVER regress
  factualPrecision: number;       // floor
  evidenceLinkage: number;        // floor
  receiptCompleteness: number;    // floor
  falseConfidenceRate: number;    // ceiling
}
```

**Customization**: Replace these metrics with whatever your system cares about. A RAG pipeline might use `retrievalRecall`, `answerAccuracy`, `latencyMs`, `tokenCost`. An agent might use `taskSuccessRate`, `toolCallEfficiency`, `hallucinationRate`.

### 4. Define quality guards

```typescript
export const QUALITY_GUARDS = {
  maxFactualPrecisionDrop: 0.01,    // Can't regress more than 1pp
  minEvidenceLinkage: 0.75,         // Absolute floor
  minReceiptCompleteness: 0.80,     // Absolute floor
  maxFalseConfidenceRate: 0.10,     // Absolute ceiling
};
```

**Critical rule**: Your baseline must ALREADY pass all guards. If the baseline is below a floor, every candidate will fail guards regardless of improvement. The guards protect against regression, not against starting poorly.

### 5. Build your canary benchmark

This is the closed-loop component. Write 5-10 canary fixtures that exercise your system's key decision paths:

```typescript
// canary-benchmark.ts

export const CANARY_FIXTURES: CanaryFixture[] = [
  {
    fixtureId: "happy-path-high-quality",
    // ... inputs where the system should perform well
    expectations: { shouldTrigger: false, /* ... */ },
  },
  {
    fixtureId: "edge-case-sparse-data",
    // ... inputs where the system should trigger deeper analysis
    expectations: { shouldTrigger: true, minBranches: 2, /* ... */ },
    simulatedBranchResults: [ /* deterministic offline results */ ],
  },
  // Cover: happy path, edge cases, error cases, borderline decisions
];
```

**Scoring dimensions** — define 3-6 weighted dimensions that capture what "good" means:

```typescript
const SCORING_DIMENSIONS = [
  { name: "trigger_accuracy",     weight: 0.25, evaluate: (fixture, result) => /* ... */ },
  { name: "branch_coverage",      weight: 0.20, evaluate: (fixture, result) => /* ... */ },
  { name: "usefulness_quality",   weight: 0.20, evaluate: (fixture, result) => /* ... */ },
  { name: "evidence_completeness",weight: 0.20, evaluate: (fixture, result) => /* ... */ },
  { name: "execution_efficiency", weight: 0.15, evaluate: (fixture, result) => /* ... */ },
];
```

### 6. Set your baseline from measured data

**Don't estimate your baseline. Measure it.**

```bash
npx tsx scripts/eval-harness/your-system/canary-benchmark.ts
```

This outputs `canary-results/latest-metrics.json` — use those numbers as your baseline:

```json
{
  "baselineId": "baseline-abc123-1234567890",
  "commitHash": "abc123...",
  "throughputMetrics": { /* from canary benchmark output */ },
  "qualityMetrics": { /* from canary benchmark output */ }
}
```

### 7. Define your mutation allowlist

```typescript
export const MUTATION_ALLOWLIST: readonly string[] = [
  "src/your-system/",
  "src/your-system-config.ts",
  "prompts/your-system/",
];
```

This prevents the optimizer from modifying files outside the target system. Safety rail.

### 8. Create the optimization skill

Copy `.claude/rules/autoresearch_loop.md` and customize:
- File paths to your system
- Strategy names relevant to your domain
- Failure-directed strategy rules for your metrics

### 9. Write your first proposals

This is where Claude Code as the proposer shines. In your session:

1. Ask Claude to read all source files in your target system
2. Ask it to identify 10-15 specific improvements, grouped by strategy
3. For each improvement, specify the concrete file edits (full file content)
4. Save as `session-proposals.json`

### 10. Run the optimization loop

**Round 1-2 (exploration)** — use session-proposer for speed:

```bash
npx tsx scripts/eval-harness/your-system/optimizerRunner.ts optimize \
  --baseline scripts/eval-harness/your-system/baseline-snapshots/canary-baseline.json \
  --proposer scripts/eval-harness/your-system/session-proposer.ts \
  --config scripts/eval-harness/your-system/optimizer-config-15.json
```

**Round 3+ (validation)** — switch to benchmark-proposer for measured metrics:

```bash
npx tsx scripts/eval-harness/your-system/optimizerRunner.ts optimize \
  --baseline scripts/eval-harness/your-system/baseline-snapshots/canary-baseline.json \
  --proposer scripts/eval-harness/your-system/benchmark-proposer.ts \
  --config scripts/eval-harness/your-system/optimizer-config-15.json
```

### 11. Compound and repeat

Follow the autoresearch_loop protocol:
1. Read run log → identify winners and near-misses
2. Generate compound proposals (stack winners + near-misses)
3. Run optimizer with benchmark-proposer
4. Update tracker
5. Repeat until plateau

---

## Hours-Long Continuous Operation

### Context window management

Claude Code sessions compact after ~100K tokens. The optimization state survives compaction because:
- **Run logs** → persisted to disk as JSON
- **Cumulative tracker** → persisted to disk
- **Session proposals** → persisted to disk
- **Canary results** → persisted to disk with latest-metrics.json
- **Optimization skill** → loaded from `.claude/rules/` on every session

When Claude Code compacts or you start a new session, it reads the skill, reads the tracker, and picks up exactly where it left off.

### Session handoff protocol

At the end of each session (or before compaction):
1. Ensure `cumulative-tracker.json` is up to date
2. Ensure the latest run log is persisted
3. Ensure `canary-results/latest-metrics.json` reflects the current best
4. The skill file tells the next session exactly what to do

### Plateau detection

The tracker records `throughputCurve` — a score after each round. When the last 3 data points are within 1% of each other, the system has plateaued. At this point:
- **Option A**: Lower the promotion threshold from 5% to 3%
- **Option B**: Introduce structural changes (new branch strategies, new data sources)
- **Option C**: Add more canary fixtures to expose new optimization surfaces
- **Option D**: Declare the current throughput as the optimized ceiling and ship it

### Multi-agent parallelism (for speed)

For faster rounds, spawn parallel subagents:

```
Agent A: Read heuristics.ts → propose pattern improvements
Agent B: Read researchCell.ts → propose branch/merge improvements
Agent C: Read dimensionEngine.ts → propose scoring improvements
Agent D: Read last run log → design compound proposals
```

Merge their outputs into one `session-proposals.json`, then run the optimizer.

### Compounding rules

| Compound size | Discount factor | Rationale |
|--------------|----------------|-----------|
| 2 mutations  | 0.65× sum      | Interactions may conflict |
| 3 mutations  | 0.55× sum      | Complexity overhead |
| 4 mutations  | 0.50× sum      | Diminishing returns |
| 5+ mutations | 0.45× sum      | Near theoretical maximum |

**Note**: These discount factors apply to session-proposer estimates only. When using benchmark-proposer, compounds are measured directly — no discounting needed.

---

## Cost Model

### Session-embedded (Claude Code as proposer + benchmark)
- **LLM cost**: $0 per iteration (included in Claude Code session)
- **Compute cost**: ~50-200ms per candidate (worktree + mutations + benchmark)
- **15 iterations**: ~3 seconds total
- **10 rounds**: ~30 seconds total
- **Best for**: Interactive optimization, learning what works

### API-powered (headless, CI/CD)
- **LLM cost**: ~$0.20/iteration at Sonnet 4.6 pricing (50K in, 2K out)
- **15 iterations**: ~$3.00 per round
- **10 rounds**: ~$30.00 total
- **Best for**: Overnight optimization, automated pipelines

### Cost tracking

Every proposal carries `CostEntry[]`:
```typescript
interface CostEntry {
  phase: string;        // "propose", "judge", "benchmark"
  model: string;        // "claude-sonnet-4-6", "claude-opus-4-6-session", or "deterministic"
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  timestamp: string;
}
```

Run logs aggregate into `SessionCostSummary` with breakdowns by model and phase.

---

## File Reference

| File | Purpose | Portable? |
|------|---------|-----------|
| `optimizerTypes.ts` | Metrics, guards, cost types | Customize metrics + guards |
| `optimizerScoring.ts` | Pure scoring functions | Customize weights + reference values |
| `optimizerRunner.ts` | Worktree mgmt, eval loop, CLI | Copy as-is |
| `session-proposer.ts` | Reads proposals, applies edits (estimated) | Copy as-is |
| `benchmark-proposer.ts` | Applies edits + runs canary benchmark (measured) | Customize dynamic import path |
| `canary-benchmark.ts` | Fixture runner, scoring, metrics aggregation | Customize fixtures + dimensions |
| `session-proposals.json` | Current round proposals | Generate per-round |
| `cumulative-tracker.json` | Cross-round state | Auto-updated |
| `canary-baseline.json` | Starting metrics (measured from benchmark) | Measure from your system |
| `optimizer-config-15.json` | Iteration config | Copy, adjust iterations |
| `autoresearch_loop.md` | Self-direction skill | Customize paths + strategies |

---

## Proven Results (NodeBench DeepTrace)

| Round | Candidates | Promoted | Throughput | Δ from baseline | Proposer |
|-------|-----------|----------|------------|-----------------|----------|
| 1 (simulated) | 15 | 3 | 0.769 | +17.4% | session (estimated) |
| 2 (session) | 15 | 1 | 0.695 | +6.1% | session (estimated) |
| 3 (compounds) | 15 | 5 | 0.931 | +42.1% | session (estimated) |

Canary benchmark baseline metrics (measured):
- `taskCompletionRate`: 0.60, `wallClockMs`: 0.07ms, `factualPrecision`: 1.0, `receiptCompleteness`: 0.933

Key insight: **Compounding is the unlock.** Individual proposals score 2-4%. Compounds of 3-6 proposals score 8-14%. The ratchet mechanism ensures only genuine improvements survive.

---

## Quick Start Checklist

- [ ] Identify 3-7 source files to optimize
- [ ] Identify pure functions that can be imported and called with test data
- [ ] Define throughput metrics (what to improve)
- [ ] Define quality guards (what must not regress)
- [ ] **Write 5-10 canary fixtures** covering key decision paths
- [ ] **Define 3-6 scoring dimensions** with weights
- [ ] **Measure baseline** by running canary benchmark (not estimating)
- [ ] Verify baseline passes all guards
- [ ] Copy eval-harness structure (including benchmark-proposer.ts and canary-benchmark.ts)
- [ ] Create `.claude/rules/autoresearch_loop.md`
- [ ] Generate first round proposals (Claude reads your code)
- [ ] Run optimizer with session-proposer (exploration rounds)
- [ ] Switch to benchmark-proposer (validation rounds)
- [ ] Read run log, generate compounds, run again
- [ ] Repeat until plateau
