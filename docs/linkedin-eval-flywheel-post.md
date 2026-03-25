# LinkedIn Post Draft — Eval Flywheel

## Post 1: The Signal

Built a self-judging search quality pipeline in one session. Here is what happened.

Started at 40% pass rate on 15 queries. Ended at 92.5% on 100+ queries across 18 categories.

The architecture:

1. User searches any company, person, or market
2. Linkup Search + Gemini grounding fetch real web data
3. Gemini 3.1 Flash Lite extracts structured signals, risks, changes, comparables
4. Entity intelligence workspace renders it as a decision packet
5. Gemini 3.1 Flash Lite judges every result against 13 boolean criteria
6. System diagnoses failures, fixes root causes, re-runs
7. Loop until 100%

What made it work:

- Tool chaining, not tool testing. Output from web_search feeds into Gemini extraction feeds into entity resolution feeds into packet assembly. The eval tests the chain, not the individual tools.
- Self-diagnosis. Every failing query gets a root cause analysis -- is it entity extraction? Web data quality? Classification routing? The fix targets the cause, not the symptom.
- Corpus growth. Started with 15 queries. Now 100+ across 18 categories including adversarial [misspellings, single-word queries], multi-turn [context-dependent follow-ups], and deep diligence [5-section company teardowns].

The flywheel progression:

Round 1: 40% [15 queries]
Round 5: 75.5% [53 queries]
Round 10: 86.8% [53 queries]
Round 12: 92.5% [53 queries]
Round 13: 92.5% [100+ queries, 18 categories]

8 of 10 core categories at 100%. The remaining gaps are the hardest problems -- multi-turn context chains and cross-domain synthesis.

This is the pattern: build the judge first. Then let the judge tell you what to fix. Then fix it. Then grow the corpus. Then loop.

NodeBench is the entity intelligence workspace that compounds over time. The eval flywheel is how we make sure it actually does.

What eval architecture are you using for your AI products?

---

## Post 2: The Stack

Technical details for builders.

Judge model: Gemini 3.1 Flash Lite Preview
- Boolean criteria, not vibes. 13 structural checks + 6 semantic checks per query.
- Criteria: USEFUL_ANSWER, RELEVANT_ENTITY, ACTIONABLE_SIGNALS, RISK_AWARENESS, NEXT_STEPS, ROLE_APPROPRIATE, NO_HALLUCINATION
- Every criterion returns pass/fail + evidence string. No floating point scores.

Search pipeline [what is being evaluated]:
- Classification: regex patterns + multi-entity splitting
- Web enrichment: Linkup Search [structured answers] + Gemini grounding [web snippets]
- Entity extraction: Gemini 3.1 Flash Lite with lens-aware prompts
- Result assembly: ResultPacket with 8 sections [entity truth, changes, signals, risks, comparables, metrics, actions, questions]

Tool chaining [the real eval]:
- discover_tools -> founder_local_gather -> web_search -> founder_local_synthesize -> track_action
- Each tool output feeds into the next via chainContext accumulator
- Chain coherence criterion: downstream output must reference upstream data

What broke along the way:
- Entity name extraction captured "Anthropics competitive position" instead of "Anthropic" -- regex greediness
- "My company" queries hit web search instead of local workspace -- needed own-entity routing
- Single-word queries like "Apple" fell through to general -- needed capitalized-word fallback
- Gemini extraction hallucinated when web snippets were thin -- added "return fewer items rather than hallucinating" rule

Every fix was traced upstream from the failing criterion to the root cause. Not band-aids.

What is the hardest part of your eval pipeline?
