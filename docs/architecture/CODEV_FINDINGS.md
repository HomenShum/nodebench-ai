# Co-Development Findings: NodeBench × Attrition

Date: April 9, 2026
Method: Meta HyperAgent bidirectional improvement — each product improves the other.

## NodeBench Issues Found by Attrition

### P1: DCF extraction misses Anthropic + OpenAI revenue (golden queries 2/10 fail)
- **Symptom**: Anthropic (90% conf) and OpenAI (95% conf) pass all criteria except DCF
- **Root cause**: Revenue extraction regex too narrow — misses formats like "ARR of $2 billion", "$26B annualized revenue", "revenue run rate of $12B"
- **Fix**: Add more regex patterns for revenue/ARR extraction
- **Verify**: Rerun golden queries → expect 10/10

### P2: SPA not crawlable by headless browsers
- **Symptom**: Attrition crawl finds 0 interactive elements
- **Root cause**: Vite SPA requires full JS execution; no SSR/prerender
- **Fix**: Add `vite-plugin-ssr` or prerender critical routes for crawlers
- **Impact**: SEO, social sharing, bot accessibility all degraded

### P3: 404 on relay-proxied assets
- **Symptom**: JS error in attrition crawl through relay
- **Root cause**: Asset paths are relative, relay doesn't rewrite them
- **Fix**: Use absolute asset paths or configure relay to handle Vite assets

## Attrition Issues Found While Testing NodeBench

### P1: No localhost crawl without relay
- **Symptom**: `ta_crawl_url(localhost:5191)` → connection refused
- **Root cause**: Attrition's Playwright runs on remote Render server, can't reach local
- **Fix**: Add local Playwright mode for `ta_crawl_url` that uses local browser
- **Impact**: Every local dev loop requires relay setup → friction

### P2: Relay breaks SPA asset loading
- **Symptom**: Relay serves HTML but JS/CSS assets 404
- **Root cause**: Relay proxies the HTML request but doesn't rewrite asset URLs
- **Fix**: Relay should rewrite `src="/assets/..."` to `src="relay/5191/assets/..."`
- **Impact**: SPA apps (most modern frontends) can't be crawled through relay

### P3: No structured output from crawl for SPA pages
- **Symptom**: Crawl returns 0 interactive elements even when page renders in real browser
- **Root cause**: Page.goto times out before SPA hydrates
- **Fix**: Add `waitForSelector` or `networkidle` wait strategy for SPA detection
- **Impact**: Attrition can't QA any React/Vue/Svelte app effectively

### P4: Golden query runner should be an attrition tool
- **Symptom**: We built `run-golden-queries.ts` as a standalone script
- **Recommendation**: Attrition should have `ta_benchmark_api(queries, assertions)` as a first-class tool
- **Impact**: Any API-backed product could use attrition for regression testing

## Bidirectional Improvement Loop

```
NodeBench change → attrition golden queries → score regression?
    ↓ yes                                        ↓ no
fix NodeBench                              record improvement@k
    ↓                                            ↓
rerun golden queries                    attrition archives this as "passing baseline"
    ↓
attrition improvement: better SPA handling needed
    ↓
fix attrition crawl for SPAs
    ↓
rerun attrition crawl on NodeBench
    ↓
both products improved
```

## Next Actions

### NodeBench
1. Fix DCF revenue extraction (more patterns)
2. Add SSR/prerender for crawlability
3. Run golden queries after every deploy

### Attrition
1. Add local Playwright mode
2. Fix relay asset rewriting for SPAs
3. Add `waitForNetworkIdle` for SPA crawls
4. Add `ta_benchmark_api` tool for API regression testing
