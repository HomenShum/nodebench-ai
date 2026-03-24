# Eval Flywheel — Self-Judging Search Quality Loop

Continuous self-improving eval loop for the NodeBench search pipeline. The system judges itself, diagnoses failures, fixes them, and loops until 100%.

## When to activate
- After any change to `server/routes/search.ts` or search-related tools
- User says "run eval", "flywheel", "judge loop", "reach 100%"
- After completing any implementation sprint touching search, entity enrichment, or result rendering
- Automatically after deploying search changes

## Judge model
- **Gemini 3.1 Flash Lite Preview** (`gemini-3.1-flash-lite-preview`)
- API key: `GEMINI_API_KEY` from `.env.local` or Convex env
- Fallback: `gemini-2.5-flash-lite-preview`

## Protocol

### Phase 1: Run eval harness
```bash
GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d= -f2) \
  npx tsx packages/mcp-local/src/benchmarks/searchQualityEval.ts \
  --base-url=http://localhost:5191
```

### Phase 2: Diagnose failures
1. Read the eval report — identify failing categories and criteria
2. For each failing criterion (USEFUL_ANSWER, RELEVANT_ENTITY, ACTIONABLE_SIGNALS, ROLE_APPROPRIATE, RISK_AWARENESS, NEXT_STEPS, NO_HALLUCINATION):
   - Trace upstream: which search branch produced the failing result?
   - What data source was empty or generic?
   - Was the entity correctly extracted?
   - Did web_search return real data?
   - Did Gemini extraction produce structured signals?
3. Group failures by root cause, not by symptom

### Phase 3: Fix root causes
Priority order:
1. **Data quality** — web_search returning empty/generic → improve query templates, add Linkup fallback
2. **Entity resolution** — wrong entity extracted → fix regex patterns, add possessive/descriptor stripping
3. **Multi-entity** — comparison queries treated as single entity → add entity splitting
4. **Lens shaping** — same output regardless of role → add lens-specific templates
5. **Latency** — timeout causing empty results → tune timeouts, add caching

### Phase 4: Re-run and compare
- Run eval again after fixes
- Compare: did structural pass rate improve? Did Gemini pass rate improve?
- Check for regressions in previously passing categories
- If score decreased in any category: revert that specific fix

### Phase 5: Grow corpus
After reaching 95%+ on current corpus:
- Add 5-10 new queries targeting weak spots
- Add new categories (e.g., `temporal` for time-aware queries, `cross_domain` for cross-entity analysis)
- Add adversarial queries (misspellings, ambiguous entities, overlapping names)
- Re-run and target 100% on expanded corpus

### Phase 6: Loop
- Never stop at "good enough"
- If 3 consecutive rounds show no improvement: change strategy (different search provider, different extraction prompt, structural refactor)
- Track cumulative progress in eval-results/ directory

## Infrastructure blockers — research and fix
When eval fails due to infrastructure gaps:
1. **Missing search provider** — Check Convex env for LINKUP_API_KEY, fall back to Gemini grounding
2. **Gemini extraction fails** — Try OpenAI extraction, or simpler regex-based extraction
3. **Tool not found** — Check toolset loading, verify tool names match
4. **Timeout** — Tune Promise.race timeouts, add AbortController
5. **Rate limiting** — Add delays between eval queries, batch web_search calls

Always do deep research before declaring a blocker permanent. The system should build itself.

## Key files
- `packages/mcp-local/src/benchmarks/searchQualityEval.ts` — Eval harness
- `server/routes/search.ts` — Search route (the thing being evaluated)
- `packages/mcp-local/src/tools/entityEnrichmentTools.ts` — Entity enrichment MCP tools
- `packages/mcp-local/src/tools/webTools.ts` — web_search implementation
- `convex/tools/media/linkupSearch.ts` — Linkup search (Convex-side)

## Anti-patterns
- Declaring done at 80% because "the remaining 20% is hard"
- Inflating structural checks to mask Gemini judge failures
- Removing failing queries from the corpus instead of fixing them
- Hardcoding entity data to pass specific test cases

## Related rules
- `flywheel_continuous` — continuous improvement loop
- `analyst_diagnostic` — root cause before fix
- `self_direction` — never wait, keep moving
- `scenario_testing` — realistic test scenarios
- `agentic_reliability` — 8-point checklist for agent infra
- `completion_traceability` — cite original request
