# App Scoring And Dogfood Instructions

Purpose: maximize visual quality, design coherence, real usage value, and mission alignment by forcing every meaningful product change through a measurable loop.

This is not a style memo. It is an operating rule.

## Core Rule

Every meaningful app change must be:
- dogfooded on a real workflow
- graded against explicit scoring dimensions
- frozen as a timestamped recommendation or output
- compared against later reality when an outcome exists
- traced across UI and backend execution

If a change cannot survive that loop, it is not production-ready.

## Product Standard

NodeBench should feel like:
- a premium operator console
- a trustworthy auditor
- a practical teammate

It must not feel like:
- a flashy prototype
- a generic dashboard
- an opaque agent with vibes instead of receipts

## Scoring Dimensions

Every workflow or surface should be graded on these dimensions:

### 1. Visual Score
Measure:
- typography clarity
- spacing rhythm
- hierarchy
- contrast in dark and light themes
- mobile and tablet resilience
- motion safety and reduced-motion behavior

Pass condition:
- no layout breaks
- no hard-to-read dense blocks
- no decorative motion that hurts comprehension

### 2. Design Score
Measure:
- clarity of primary action
- progressive disclosure quality
- consistency with the design system
- empty, loading, error, and success states
- information density without overload

Pass condition:
- a first-time user can identify what the surface is for within 5 to 10 seconds
- the screen has a clear primary path
- advanced detail is available without dominating the default view

### 3. Usage Score
Measure:
- whether a real internal user can complete the intended workflow
- time to usable result
- number of corrections or retries
- whether the output is reusable without rework

Pass condition:
- a real workflow completes end to end
- operator intervention is explainable and bounded
- the output is good enough to reuse, publish, escalate, or export

### 4. Alignment Score
Measure:
- match to stated user goal
- match to product thesis
- truth-boundary honesty
- evidence quality
- whether the system stayed within scope instead of drifting into clever but irrelevant behavior

Pass condition:
- the output directly serves the user goal
- unsupported claims are clearly marked
- the recommendation or result is consistent with the product mission and role context

## Required Dogfood Loop

Dogfood every workflow that the app claims to support.

Minimum dogfood workflow families:
- company or product direction analysis
- execution trace and investigation workflows
- receipts and approvals workflows
- document or spreadsheet enrichment workflows
- research briefing workflows
- benchmark and telemetry review workflows

For each workflow:
1. run the real task
2. capture receipts, evidence, decisions, verifications, and outputs
3. review the product surface as a user, not just as a developer
4. grade the result
5. fix the biggest failure
6. rerun the workflow

Do not stop at a green build if the workflow still feels confusing, untrustworthy, or awkward to use.

## Output Grading Rules

Every output should receive a structured grade.

Required grading fields:
- `visualScore`
- `designScore`
- `usageScore`
- `alignmentScore`
- `confidence`
- `limitations`
- `requiredFixes`

Use a 1 to 5 or 0.0 to 1.0 scale, but keep it consistent inside a workflow family.

Never ship a result described as "good" without a rubric.

## Freeze Every Recommendation

Any recommendation that could later be judged against reality must be frozen.

Freeze means store:
- timestamp
- input context
- evidence available at that time
- recommendation text
- confidence
- limitations
- alternatives considered

This applies to:
- strategy recommendations
- product direction memos
- prioritization decisions
- risk calls
- agent recommendations shown to users

Do not let the system rewrite its own past recommendation after later facts appear.

## Compare Against Reality Later

When a real-world outcome exists, compare the frozen recommendation to what actually happened.

Examples:
- product direction later chosen or rejected
- financial or market outcome
- issue triage accuracy
- agent recommendation usefulness
- workflow output accepted or heavily edited

Store:
- `decisionTime`
- `availableEvidenceAtDecisionTime`
- `frozenOutputId`
- `actualOutcome`
- `comparisonVerdict`
- `calibrationNotes`

The goal is not "perfect prediction."
The goal is:
- timestamped evidence-bounded judgment
- confidence calibration
- honest improvement over time

## Trace Every UI And Backend Step

Every meaningful run should be traceable from browser to backend.

Minimum traceable objects:
- run
- step receipts
- decisions
- evidence
- verifications
- approvals
- output artifacts

Minimum system correlation:
- UI route or session identifier
- backend run identifier
- trace or span identifier where available
- artifact identifiers for exports, renders, screenshots, and diffs

If a user asks "what happened?" the system must answer without exposing hidden chain-of-thought.

## Progressive Disclosure Requirement

Every complex surface should support:

### Outcome
- the result
- confidence
- key evidence
- limitations

### Why
- structured decisions
- alternatives considered
- reasoning boundary
- verification summary

### Full Trace
- step timeline
- tool and backend receipts
- evidence drawer
- diffs
- artifact outputs
- raw structured contract

The default view should start at `Outcome`, not `Full Trace`.

## UI QA Requirement

Any user-facing change that materially affects UI must pass:
- typecheck
- build
- route-level dogfood capture
- artifact verification
- scenario regression where relevant

Preferred commands:

```powershell
npx tsc -p . -noEmit --pretty false
npm run build
npm run dogfood:verify:smoke
```

If the change is large or riskier:

```powershell
npm run dogfood:verify
```

Review `/dogfood` after capture. The route is part of the product, not a side folder.

## Release Gate

Do not call a slice done until all of the following are true:
- the workflow runs end to end
- the output is graded
- the main recommendation or result is frozen
- the truth boundary is visible
- the UI and backend steps are traceable
- the design still feels coherent after dogfood

## Failure Handling

If dogfood exposes a problem:
- fix the highest-signal issue first
- rerun the workflow
- do not explain away a bad user experience with internal complexity

If a recommendation later proves wrong:
- do not delete it
- compare it against the real outcome
- record calibration failure and what evidence was missing or overweighted

## Standing Product Heuristic

Build for this standard:

Act like an operator.
Reason like an analyst.
Leave receipts like an auditor.

If a surface fails any one of those three, it still needs work.
