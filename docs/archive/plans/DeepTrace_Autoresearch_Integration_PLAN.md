# DeepTrace + Autoresearch Integration Plan

## Summary

Use `karpathy/autoresearch` as a pattern, not as a second platform. The integration should create two loops on top of the existing NodeBench / DeepTrace stack:

1. **Offline optimizer loop**
   - Continuously improve DeepTrace prompts, heuristics, workflow wiring, and selected backend slice code.
   - Run in a disposable worktree with fixed budgets, fixed benchmarks, and keep/discard promotion based on measured uplift.

2. **Runtime research-cell loop**
   - For expensive or ambiguous DeepTrace investigations, run a bounded `autoresearch`-style sub-process inside the existing mission harness.
   - The runtime loop should improve the quality of a single investigation without changing repo state.

The chosen objective for v1 is **operator throughput**. That means the optimizer should maximize time-to-first-usable-draft, lower human edit distance, and improve task completion speed, while enforcing hard non-regression on truthfulness, evidence linkage, and receipt completeness.

## Implementation Changes

### 1. Add an offline DeepTrace Autoresearch Lab

Build a new optimizer lane inside the existing DeepTrace eval harness, not as a separate service.

- Add a DeepTrace-specific `program.md` that tells the optimizer:
  - the objective is operator throughput
  - the hard guards are truth/evidence/traceability
  - the only mutable area is the **DeepTrace slice**, not the whole repo
  - every candidate must be tested against the existing canary benchmark families
- Add a small runner that executes the `autoresearch` loop shape:
  - snapshot baseline
  - propose candidate change
  - apply candidate in disposable worktree
  - run compile/tests/canary
  - score candidate
  - keep or discard
  - append results to a durable run log
- Restrict candidate mutations to this allowlist:
  - `convex/domains/deepTrace/**`
  - `convex/workflows/deepTrace.ts`
  - DeepTrace MCP and prompt surfaces in `packages/mcp-local/**`
  - `scripts/eval-harness/deeptrace/**`
  - related gateway wiring needed for DeepTrace tools only
- Explicitly forbid mutation of unrelated product/UI/social subsystems during optimizer runs.

### 2. Define the optimizer objective and promotion rules

Use two score layers.

- **Primary score: throughputScore**
  - 30% task completion rate
  - 25% inverse time-to-first-usable-draft
  - 20% inverse human edit distance
  - 15% inverse wall-clock time
  - 10% inverse tool-call count
- **Hard guard score: quality floor**
  - no drop in factual precision beyond 1 percentage point
  - no drop in relationship precision beyond 1 percentage point
  - evidence linkage must stay `>= 0.75`
  - receipt completeness must stay `>= 0.80`
  - false-confidence rate must stay `<= 0.10`
  - canary relative uplift must stay `>= 0.03` versus current baseline pack

Promotion rule:
- accept a candidate only if `throughputScore` improves by at least 5% and all hard guards pass
- otherwise discard, log failure pattern, and record the candidate rationale/result for future search

### 3. Add a runtime “DeepTrace research cell”

Embed an `autoresearch`-style runtime loop inside existing DeepTrace workflows and mission harness execution.

- Trigger the runtime cell only when one of these is true:
  - current DeepTrace confidence `< 0.65`
  - dimension coverage `< 0.70`
  - evidence bundle has fewer than 3 durable sources
  - operator explicitly requests “deep trace” or “research cell”
- Runtime cell structure:
  - planner proposes 2-4 research branches
  - workers gather evidence / hypotheses / counter-hypotheses
  - judge ranks branches by usefulness under fixed budget
  - merger returns one standard DeepTrace output bundle
- Runtime budget defaults:
  - max 3 parallel branches
  - max 2 refinement rounds
  - max 90 seconds wall clock
  - max fixed token/tool budget per branch
- Runtime output must stay in current DeepTrace format:
  - observed facts
  - relationships
  - dimension profile
  - strongest hypothesis
  - counter-hypothesis
  - recommendation
  - limitations
  - receipts and evidence bundle

### 4. Add minimal interfaces, not a second framework

Add these surfaces on top of current DeepTrace infrastructure:

- **Offline CLI/scripts**
  - `deeptrace:autoresearch:baseline`
  - `deeptrace:autoresearch:optimize`
  - `deeptrace:autoresearch:replay`
- **Runtime workflow surface**
  - one DeepTrace workflow mode or flag for `researchCell: true`
- **MCP / Claude prompt surface**
  - one prompt for traceable runtime research-cell execution
  - one prompt for optimizer/canary evaluation runs
- **Durable run artifacts**
  - candidate id
  - baseline id
  - benchmark case ids
  - changed files
  - compile/test result
  - score breakdown
  - keep/discard verdict
  - reason for rejection or promotion

Use the existing DeepTrace eval harness, execution trace, and mission harness persistence wherever possible. Only add new tables if existing eval/trace tables cannot represent candidate history cleanly.

## Test Plan

### Offline optimizer tests
- Candidate touching an allowlisted DeepTrace file is accepted for evaluation.
- Candidate touching a non-allowlisted file is rejected before execution.
- A candidate with better throughput but failing evidence/receipt guards is discarded.
- A candidate with better throughput and passing guards is promoted.

### Runtime research-cell tests
- High-confidence, well-grounded cases skip the research cell and return normal DeepTrace output.
- Low-confidence or low-coverage cases trigger the research cell and still return the standard output contract.
- Runtime cell never exceeds branch count, round count, or wall-clock budget.
- Receipts and evidence from branch work are merged into one auditable bundle.

### End-to-end acceptance
- Run the current DeepTrace canary benchmark in baseline mode and optimized mode.
- Confirm measured uplift on throughput metrics with no guard regression.
- Confirm one live investigation can use the runtime cell and still export the current `tool_result.json` shape.

## Assumptions and Defaults

- `autoresearch` is being adopted as an **optimization pattern** for DeepTrace, not vendored as a parallel product.
- “Full slice” mutation means the full **DeepTrace slice and its MCP/eval wiring**, not arbitrary repo-wide mutation.
- Existing DeepTrace canary benchmark files are the source of truth for regression gating.
- Operator throughput is the primary objective, but truth/evidence/traceability remain hard release guards.
- v1 should ship the offline optimizer first and the runtime research cell immediately after, sharing the same scoring rules and benchmark pack.
