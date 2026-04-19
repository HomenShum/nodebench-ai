# Eval & Flywheel — Current State + Deferred Karpathy Loop

**Status:** Living · Last reviewed 2026-04-19
**Owner:** Core team
**Supersedes:** `AI_FLYWHEEL.md`, `APP_SCORING_AND_DOGFOOD_INSTRUCTIONS.md`, `CONTINUOUS_OPTIMIZATION_PORTABLE_GUIDE.md`, `gemini-qa-flywheel-learnings.md`, `HACKATHON_MARKET_FIT_ANALYSIS.md` (archived).

## TL;DR

NodeBench already ships with a **search quality eval harness** (`packages/mcp-local/src/benchmarks/searchQualityEval.ts`) running against a 100+ query corpus with a Gemini judge. The **Karpathy-style flywheel** (corpus growth + judge tuning + CI ratchet) is **deferred to v2** — triggered only after production accumulates **≥100 user-promoted profiles + ≥20 distinct rejection reasons**. Until then, the judge is a hand-written boolean function and production rejections flow through the auto-feedback system.

## Prior art

| Reference | Pattern |
|---|---|
| **Karpathy eval-driven dev (2023 blog)** | Corpus-first, judge-second, ratchet-never-backwards |
| **Reflexion (Shinn et al., 2023)** | Production failures feed corpus growth |
| **Anthropic Constitutional AI** | Boolean gates beat vibe grades |
| **OpenAI evals framework** | Test-set-first-then-model-second |

## Invariants

1. **Deterministic gates, not vibe grades.** Every verification gate is a boolean function returning `true | false | UNKNOWN`.
2. **Corpus only grows.** Passing cases never leave the corpus. Ratchet-forward only.
3. **Never regress a previously-passing case.** Any judge change must pass the full corpus before merge.
4. **Auto-feedback is the corpus source.** Real production failures, not invented adversarial cases.
5. **v1 is manual promotion.** No auto-persist until trigger fires.

## Current state (v1)

### Search quality eval

- Corpus: 100+ queries across 18 categories (weekly_reset, company_search, competitor, role_specific, temporal, adversarial, diligence, scenario, niche_entity, multi_turn, ...)
- Judge: Gemini 3.1 Flash Lite, with fallback to 2.5 Flash Lite
- Run: `packages/mcp-local/src/benchmarks/searchQualityEval.ts`
- Grounding: 4-layer anti-hallucination pipeline (see [.claude/rules/grounded_eval.md](../../.claude/rules/grounded_eval.md))

### Live production rejection signals

- Auto-feedback drafts (see [USER_FEEDBACK_SECURITY.md](USER_FEEDBACK_SECURITY.md)) are the incoming corpus seed
- User dismissals of `verified` artifacts → logged with reason for future corpus curation

## Deferred to v2 — the Karpathy flywheel

### Trigger rule

> Commit to the flywheel when production accumulates **≥100 manually promoted PERSON entities AND ≥20 distinct rejection reasons in the failure log**.

This ensures the corpus is populated with real failures, not synthetic adversarial cases.

### When triggered, the flywheel adds

1. `packages/mcp-local/src/benchmarks/founderVerificationEval.ts` — block-specific eval harness
2. `packages/mcp-local/src/benchmarks/fixtures/founder-corpus.json` — curated corpus (auto-seeded from production rejections)
3. `server/pipeline/founderVerification.ts` — upgraded judge with full boolean gate set
4. CI gate: judge must pass 100% of corpus before deploy
5. Weekly cadence: curate new corpus entries · bump judge version · never regress

### Karpathy loop shape (when active)

```
1. SHIP behind feature flag: founder_autopersist_v1
2. LOG every candidate the judge evaluated (pass + fail + per-gate reason)
3. COLLECT production failures into eval corpus weekly:
   - homonym collisions
   - stale roles
   - wrong-entity merges
   - missed founders
4. RUN judge against corpus · track per-gate pass rate
5. TUNE judge prompt OR add a gate for the new failure mode
6. RE-RUN. Never regress a previously-passing case.
7. LOOP. Never stop at "good enough."
```

## What stays stable in v1 without the flywheel

- Confidence tiers computed honestly (source count × authority × agreement × grounded)
- Auto-feedback drafts surface real production gaps
- Session Artifacts wrap-up = manual gate before persistence
- User-promoted means user-reviewed

This means v1 can ship the full pitch-level founder-intelligence story without committing to the weekly eval cadence.

## Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Judge false positive (verified artifact user dismisses) | User dismiss → auto-feedback draft | Corpus seed; judge gate tightened when trigger fires |
| Judge false negative (unverified that was actually correct) | User manually promotes unverified | Corpus seed; gate loosened or replaced |
| Eval corpus drift from production reality | Monthly corpus audit | Add fresh production cases, retire obsolete ones |

## How to extend

Before the flywheel trigger: just write honest hand-written gates in each block. No harness needed.

After the trigger fires (planned):

1. Extract judge from block config into standalone function
2. Write corpus JSON with case format `{entity, expected, sources}`
3. Add eval script that runs judge against corpus, computes per-gate pass rate
4. Add CI gate
5. Announce v2 Karpathy loop in changelog

## Related

- [AGENT_PIPELINE.md](AGENT_PIPELINE.md) — honest confidence tier computation
- [DILIGENCE_BLOCKS.md](DILIGENCE_BLOCKS.md) — block-level verification gates
- [USER_FEEDBACK_SECURITY.md](USER_FEEDBACK_SECURITY.md) — auto-feedback as corpus seed
- [.claude/rules/eval_flywheel.md](../../.claude/rules/eval_flywheel.md) — the enforceable rule

## Changelog

| Date | Change |
|---|---|
| 2026-04-19 | Consolidated eval + flywheel-deferral spec |
