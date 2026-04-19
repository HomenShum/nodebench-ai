# Phase 13 — Dogfood Judge Fix System

## Core Rule

Do not judge NodeBench by whether it "works." Judge it by whether it removes repeat cognition.

The product promise is not "can generate packets" or "can show diffs." The promise is: **the user should stop having to repeatedly reconstruct their own product, market, competitors, decisions, and next moves.**

## The 3 Canonical Loops

Only dogfood against these 3. If these are great, everything else gets easier:

1. **Founder weekly reset** — Did it correctly say what changed? Did it rank the right next moves? Would I use it next week?
2. **Pre-delegation agent brief** — Could I hand this to Claude Code immediately? Would they need me to restate context?
3. **Blank-state company search** — Could a banker understand this in 2 minutes? Was it presentation-ready?

## Six-Stage Operating Loop

```
Internal use session happens
  -> Capture transcript + actions + paths + before/after state
  -> Generate session delta + packet + memo/brief
  -> Judge on 6-dimension scorecard
  -> Classify failures by canonical layer
  -> Fix lowest reusable layer
  -> Replay against past sessions
  -> Regression gate on 3 must-win loops
  -> Ship only if repeat cognition drops
```

## Judge Scorecard (6 dimensions, 1-5 each)

| Dimension | What it measures |
|-----------|-----------------|
| Truth Quality | Did NodeBench correctly represent the situation? |
| Compression Quality | Did it remove work, or just restate noise? |
| Anticipation Quality | Did it surface what mattered before being asked? |
| Output Quality | Was the packet/memo/brief actually usable? |
| Delegation Quality | Could it be handed off without restating context? |
| Trust Quality | Was the evidence/causal chain clear enough to trust? |

## Failure Taxonomy (11 canonical layers)

| Layer | Example failure |
|-------|----------------|
| ingestion | Raw input not captured |
| canonicalization | Company thesis extracted wrong |
| change_detection | Important change missed |
| contradiction | Contradiction not flagged |
| suppression | Too many alerts, user tuned out |
| packet_construction | Packet built from stale data |
| artifact_rendering | Memo had wrong structure |
| trace_lineage | Couldn't explain why state changed |
| provider_bus | Agent context not received |
| role_overlay | Wrong audience framing |
| ux_explanation | User didn't understand what they saw |

## No-Bandage Policy

A fix is not complete unless it includes:
1. Failure class
2. Root cause
3. Layer corrected
4. Replay proof
5. Regression protection

If any are missing, it is a patch, not a fix.

## Key Metrics

### Core product metrics
- repeat-question rate
- manual-reconstruction time
- time-to-first-usable-packet
- packet-to-action rate
- packet-to-export rate
- delegation-without-restatement rate
- important-change precision
- contradiction precision
- false alert rate
- session delta usefulness score

### Compounding metrics
- How often did NodeBench remember something the user would otherwise restate?
- How often did it pre-surface something the user was about to ask?
- How often did packet reuse prevent a new context rebuild?

## Auto-Detection

### Repeated question detection
If the user asks the same strategic question again, NodeBench failed to keep it warm.

### Manual reconstruction detection
If the user pastes the same long context block again, NodeBench failed continuity.

### Packet abandonment
If a packet is generated but not exported/delegated/reused, it didn't hit.

### Human correction delta
Track what the user edits after generation. Those edits are gold.

## Cadence

- **Daily:** session delta, important changes, packet staleness, repeated questions
- **Twice weekly:** 3 best + 3 worst sessions, 1 false positive, 1 missed change, 1 delegation failure
- **Weekly:** Full review across 3 canonical loops
- **Monthly:** Architecture cleanup — what failures keep recurring? What "fixes" were bandages?

## Convex Tables (4 new, total now 34)

| # | Table | Purpose |
|---|-------|---------|
| 31 | dogfoodSessions | Internal usage tracking by loop type |
| 32 | dogfoodJudgeRuns | 6-dimension quality scoring |
| 33 | dogfoodFailureCases | Classified failures with root cause + system layer |
| 34 | dogfoodFixAttempts | Fixes with replay proof + regression protection |

## MCP Tools (12 new)

### Recording: start_dogfood_session, end_dogfood_session, record_manual_correction, record_repeated_question, rate_packet_usefulness
### Judging: judge_session, classify_failure, record_fix_attempt
### Querying: get_dogfood_sessions, get_failure_triage, get_regression_gate, get_repeat_cognition_metrics
