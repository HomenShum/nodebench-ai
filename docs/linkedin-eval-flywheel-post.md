# LinkedIn Post — Eval Flywheel Results

## Post 1: The Signal

We built a self-judging eval flywheel for NodeBench AI's search pipeline. 9 iterations. One session. The system diagnoses its own failures, fixes them, and loops.

Here is what happened across 9 rounds:

Round 1: 64% combined pass rate. The search returned placeholder data for every company query.
Round 5: 75.5%. Multi-entity splitting, possessive stripping, anti-hallucination guards.
Round 9: 85.4% Gemini judge score. 6 of 10 categories at 100%.

The judge: Gemini 3.1 Flash Lite Preview scoring 7 boolean criteria per query.
The corpus: 53 queries across 10 categories [weekly reset, pre-delegation, important change, company search, competitor, own entity, multi-entity, role-specific, upload context, edge cases].
The data: Linkup search as primary enrichment, Gemini grounding as fallback, local SQLite context, and structured Gemini extraction.

What made this work:

1. The LLM judges itself on every query, not just the ones engineers pick
2. Every failure produces a diagnosis with the specific criterion that failed [USEFUL_ANSWER, RELEVANT_ENTITY, NO_HALLUCINATION, etc]
3. The fix targets the root cause, not the symptom. "Anthropic's" extracting as "Anthropics" was a regex ordering bug, not a missing test case
4. Real web data beats placeholder data every time. Wiring Linkup search took company_search from 3/10 to 7/10 in one round

What is left: competitor [0/4] and multi-entity [0/4] comparison queries. The signals are too generic for the judge. The fix is richer per-entity Linkup context before Gemini comparison extraction.

The infrastructure compounds. Every round makes the next round faster. The eval harness, the trace visualization, the judge criteria, the structural checks -- they are all permanent assets now.

What eval flywheel are you running on your product?

---

## Post 2: The Build Log

9 rounds of self-judging eval in one session. Here is the engineering log:

Round 1 [64%]: Wired web_search [Gemini grounding] into company search. Structural 100%, Gemini judge 68.8%. The judge caught what manual testing missed -- placeholder signals are not useful.

Round 2 [62%]: Added multi-entity splitting. Broke edge cases. "!@#$%^&*" classified as multi-entity. Lesson: new features need guardrails from the start.

Round 3 [68%]: Tightened regex. Required explicit multi-entity syntax [commas, vs]. Required entities to start with a letter. Structural back to 88.7%.

Round 4 [72%]: Fixed possessive stripping. "Anthropic's" was becoming "Anthropics" because quote removal ran before possessive removal. Root cause: regex chain ordering. Analyst diagnostic: ask why 5 times before writing any fix.

Round 5 [75.5%]: Competitor routing to multi-entity. Queries with "vs" and "and" now split correctly. Own entity reached 6/6.

Round 6 [45%]: Massive regression. Added Linkup search but broke weekly_reset and pre_delegation. Root cause: the synthesize tool crashed silently [missing query param], and raw tool output was never mapped to ResultPacket structure.

Round 7 [60%]: Fixed confidence scale [0-1 vs 0-100]. Weekly reset back to 6/6.

Round 8 [70%]: Fixed synthesize tool crash. Pass query param. Handle errors gracefully. All tool outputs now map to ResultPacket.

Round 9 [85.4%]: Everything compounding. 6/10 categories at 100%. Linkup search as primary enrichment. company_search at 7/10.

Key numbers:
- 53 test queries, 10 categories
- 13 structural checks + 7 Gemini criteria per query
- Judge: Gemini 3.1 Flash Lite Preview
- Enrichment: Linkup search [primary] + Gemini grounding [fallback]
- Trace: every search records classify -> context -> web_search -> linkup -> extraction -> assembly

The system is not done. But it knows exactly where it is not done, and why. That is the flywheel.

---

## Post 3: The Principle

The eval flywheel works because of one principle: the system must be able to tell you exactly why it failed.

Not "the test failed." Not "accuracy is 75%." But:

- Query cs-01 "Analyze Anthropic's competitive position" failed RELEVANT_ENTITY because the entity extracted as "Anthropics" [missing possessive strip]
- Query mt-03 "Stripe vs Adyen vs Square" failed USEFUL_ANSWER because the comparison signals were generic industry observations, not entity-specific facts
- 7 queries failed NO_HALLUCINATION because the extraction prompt said "include specific facts with numbers" -- encouraging the model to invent numbers when the web results were thin

Each diagnosis is actionable. Each fix is targeted. Each round makes the next round's failures more interesting.

This is the difference between eval-as-checkpoint and eval-as-flywheel.

Checkpoint: run tests, get a number, ship if green.
Flywheel: run tests, diagnose every failure, fix the root cause, re-run, compare, repeat. The system gets smarter every cycle.

The infrastructure cost: one eval harness file [400 lines], one judge model [Gemini 3.1 Flash Lite at approximately 0.5 cents per eval run], and a trace system that records every step.

The compound return: every round finds bugs that manual testing would never catch. The judge is more consistent than any human reviewer. And the diagnosis tells you exactly where to spend your next engineering hour.

Build the eval first. Then build the product.
