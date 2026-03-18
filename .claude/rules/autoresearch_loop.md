# Autoresearch Optimization Loop

Self-directed continuous optimization protocol for DeepTrace research cell performance.

## When to activate
- User says "run autoresearch", "optimize deeptrace", "start the loop", or "keep optimizing"
- After any DeepTrace code change, as a verification step
- When resuming from a compacted session with optimization context

## Protocol

### Phase 1: Situational awareness (< 2 min)
1. Read the latest run log: `scripts/eval-harness/deeptrace/run-logs/` — find most recent by timestamp
2. Read the cumulative tracker: `scripts/eval-harness/deeptrace/cumulative-tracker.json`
3. Read the current baseline: `scripts/eval-harness/deeptrace/baseline-snapshots/canary-baseline.json`
4. Identify: last promoted candidate, near-misses (>3.5% throughput), exhausted strategies

### Phase 2: Compound proposal generation (< 5 min)
1. Read the DeepTrace source files that the promoted candidate targeted
2. Read 2-3 near-miss proposals from the last run log (highest throughput non-promoted)
3. Design compound mutations that STACK the promoted change with near-miss improvements
4. For each compound proposal:
   - Write the actual file content (not empty edits)
   - Estimate metric deltas conservatively (compounds are NOT additive — use 60-70% of sum)
   - Write a rationale explaining why the combination compounds
5. Also include 2-3 fresh proposals targeting the specific throughput gap identified in Phase 1
6. Write proposals to `scripts/eval-harness/deeptrace/session-proposals.json`

### Phase 3: Run optimizer (< 3 min)
```bash
npx tsx scripts/eval-harness/deeptrace/optimizerRunner.ts optimize \
  --baseline scripts/eval-harness/deeptrace/baseline-snapshots/canary-baseline.json \
  --proposer scripts/eval-harness/deeptrace/session-proposer.ts \
  --config scripts/eval-harness/deeptrace/optimizer-config-15.json
```

### Phase 4: Analyze and persist (< 2 min)
1. Read the new run log
2. Update `cumulative-tracker.json` with:
   - Round number increment
   - Any new promotions (candidate ID, throughput delta, strategy)
   - Updated exhausted strategies list
   - Throughput curve data point
3. If a candidate was promoted:
   - Update the canary baseline with the promoted metrics
   - Record which files were changed and what the edits were
4. If no candidate was promoted:
   - Analyze WHY — is the 5% bar too high after ratchet? Are deltas too conservative?
   - Adjust strategy for next round: target throughput-heavy proposals or lower delta conservatism

### Phase 5: Loop or report
- If cumulative tracker shows <10 rounds completed: **loop back to Phase 1**
- If 3 consecutive rounds have zero promotions: **change strategy** — try combining top 3 near-misses into one mega-compound
- If throughput curve has plateaued (last 3 data points within 1%): **report plateau** and suggest structural changes
- Never ask "should I continue?" — just loop

## Compound proposal rules
- A compound MUST include the last promoted candidate's edits as the base
- Add 1-2 additional improvements from near-misses on top
- Discount delta estimates: if A gives +3% and B gives +4%, the compound estimates +4.5% not +7%
- Always include at least 2 non-compound fresh proposals per round for exploration
- Maximum 5 files changed per compound (complexity budget)

## Failure-directed strategy
After reading a run log where all candidates failed:
1. Sort failed candidates by throughput score descending
2. The top 3 are "near-misses" — they're the foundation for next round's compounds
3. Check which metric component is the bottleneck:
   - If taskCompletionRate is low: focus on trigger precision and branch planning
   - If timeToFirstDraftMs is high: focus on early termination and budget tuning
   - If humanEditDistance is high: focus on output formatting and limitation grading
   - If wallClockMs is high: focus on branch parallelism and timeout tuning
4. Propose 3+ candidates targeting the bottleneck metric specifically

## File inventory
- `scripts/eval-harness/deeptrace/session-proposals.json` — current round's proposals
- `scripts/eval-harness/deeptrace/session-proposer.ts` — reads proposals, applies to worktree
- `scripts/eval-harness/deeptrace/cumulative-tracker.json` — cross-round state
- `scripts/eval-harness/deeptrace/baseline-snapshots/canary-baseline.json` — current baseline
- `scripts/eval-harness/deeptrace/run-logs/opt-*.json` — all run logs
- `scripts/eval-harness/deeptrace/optimizer-config-15.json` — iteration config

## Anti-patterns
- Proposing the same mutation twice (check cumulative tracker's exhausted list)
- Inflating metric deltas to force promotion (the point is honest improvement)
- Skipping compile checks by leaving edits empty (real code > metrics-only)
- Running more than 20 rounds without structural code review
