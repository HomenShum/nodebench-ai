# Scrapling Integration Plan — NodeBench MCP

## Executive Summary

Scrapling (github.com/D4Vinci/Scrapling, 23.9k stars) is a Python adaptive web scraping framework with:
- Smart element tracking that survives CSS class renames
- Anti-bot bypass (Cloudflare Turnstile, TLS fingerprinting)
- 4 fetcher tiers (HTTP → Stealth → Dynamic → Spider)
- Built-in MCP server for AI agents
- CLI extraction + interactive shell
- Concurrent spider crawls with pause/resume

**Integration approach:** Python FastAPI bridge server (same pattern as flicker_detection + figma_flow) + NodeBench MCP wrapper tools.

---

## Architecture: Where Scrapling Fits

```
┌─────────────────────────────────────────────────────┐
│                NodeBench MCP (TypeScript)            │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ webTools.ts  │  │ scraplingT.ts│  │ researchOpt│ │
│  │ fetch_url    │  │ (NEW)        │  │ merge/score│ │
│  │ web_search   │  │ 7 tools      │  │ compare    │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                 │                │         │
│         │    ┌────────────▼──────────┐     │         │
│         │    │  Scrapling FastAPI    │     │         │
│         │    │  Python server :8008  │     │         │
│         │    │  ┌─────────────────┐  │     │         │
│         │    │  │ Fetcher (HTTP)  │  │     │         │
│         │    │  │ StealthyFetcher │  │     │         │
│         │    │  │ DynamicFetcher  │  │     │         │
│         │    │  │ Spider (crawl)  │  │     │         │
│         │    │  │ ProxyRotator    │  │     │         │
│         │    │  └─────────────────┘  │     │         │
│         │    └───────────────────────┘     │         │
│         │                                  │         │
│  ┌──────▼──────────────────────────────────▼───────┐ │
│  │           Workflow Chains                       │ │
│  │  research_optimizer → scrapling_fetch → score   │ │
│  │  parallel_research → scrapling_crawl → merge    │ │
│  │  price_monitor → scrapling_track → alert        │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1: Python FastAPI Bridge Server (port 8008)

**File:** `python-mcp-servers/scrapling_bridge/server.py`

### Endpoints

| Endpoint | Method | Description | Maps to |
|----------|--------|-------------|---------|
| `/health` | GET | Health check + Scrapling version | — |
| `/fetch` | POST | Single URL fetch with tier selection | Fetcher/StealthyFetcher/DynamicFetcher |
| `/fetch/batch` | POST | Batch fetch multiple URLs in parallel | asyncio.gather |
| `/extract` | POST | CSS/XPath extraction from fetched page | page.css() / page.xpath() |
| `/track` | POST | Adaptive element tracking (survives changes) | Smart Element Tracking |
| `/crawl/start` | POST | Start a Spider crawl session | Spider.run() |
| `/crawl/status` | GET | Check crawl progress + stream items | Spider.stream() |
| `/crawl/stop` | POST | Graceful pause (checkpoint for resume) | Ctrl+C equivalent |
| `/proxy/configure` | POST | Set proxy rotation config | ProxyRotator |

### Fetch Request Schema
```json
{
  "url": "https://example.com",
  "tier": "stealth",          // "http" | "stealth" | "dynamic"
  "impersonate": "chrome",    // Browser TLS fingerprint
  "extract": {                // Optional inline extraction
    "selectors": {
      "title": "h1::text",
      "prices": ".price::text",
      "links": "a[href]::attr(href)"
    }
  },
  "proxy": "http://...",      // Optional per-request proxy
  "timeout": 30,
  "stealthy_headers": true
}
```

### Crawl Request Schema
```json
{
  "start_urls": ["https://example.com/"],
  "max_pages": 50,
  "concurrency": 5,
  "selectors": {
    "title": "h1::text",
    "content": ".main-content"
  },
  "session_type": "stealth",  // "http" | "stealth" | "dynamic"
  "follow_links": ".pagination a::attr(href)",
  "domain_whitelist": ["example.com"]
}
```

---

## Layer 2: NodeBench MCP Wrapper Tools (TypeScript)

**File:** `packages/mcp-local/src/tools/scraplingTools.ts`

### 7 Tools

| Tool | Category | Description | Complexity |
|------|----------|-------------|------------|
| `scrapling_fetch` | web_scraping | Fetch a URL with adaptive scraping (auto-selects tier based on target) | low |
| `scrapling_extract` | web_scraping | Extract structured data from a URL using CSS/XPath selectors | low |
| `scrapling_batch_fetch` | web_scraping | Fetch multiple URLs in parallel with configurable concurrency | medium |
| `scrapling_track_element` | web_scraping | Track an element across page versions (adaptive relocation) | medium |
| `scrapling_crawl` | web_scraping | Start a multi-page spider crawl with extraction | high |
| `scrapling_crawl_status` | web_scraping | Check crawl progress, get items so far, stop crawl | low |
| `scrapling_configure_proxy` | web_scraping | Configure proxy rotation for all subsequent requests | low |

### Tool Registry Entries
- Category: `web_scraping` (new domain #48)
- Phase: `research`
- nextTools chains: scrapling_fetch → scrapling_extract → extract_structured_data → multi_criteria_score

### Preset Assignment
- `research`: add `web_scraping`
- `data`: add `web_scraping`
- `multi_agent`: add `web_scraping`
- `web_dev`: add `web_scraping`

---

## Layer 3: Workflow Chain Integration

### Enhanced `research_optimizer` chain
```
web_search → scrapling_fetch (stealth) → scrapling_extract → merge_research_results → multi_criteria_score → compare_options
```

### New `price_monitor` chain
```
scrapling_crawl (multi-page) → scrapling_extract → csv_aggregate → multi_criteria_score → save_session_note → send_email
```

### New `competitive_intel` chain
```
web_search → scrapling_batch_fetch (5-10 competitor URLs) → scrapling_extract → merge_research_results → call_llm (analysis) → compare_options
```

### Enhanced `parallel_research` chain
```
bootstrap_parallel_agents → [each agent: scrapling_fetch + scrapling_extract] → merge_research_results → multi_criteria_score → compare_options
```

---

## Layer 4: Integration with Existing Primitives

### fetch_url → scrapling_fetch upgrade path
Current `fetch_url` uses basic Node.js fetch + cheerio. Scrapling provides:
- **Anti-bot bypass** that fetch_url can't do (Cloudflare, Turnstile)
- **Stealth TLS fingerprinting** (impersonate Chrome/Firefox)
- **Adaptive element tracking** (elements survive CSS changes)
- **Session persistence** (cookies, state across requests)

Strategy: `fetch_url` remains for simple public pages. `scrapling_fetch` for:
- Sites behind Cloudflare
- Sites that detect/block bots
- Multi-step scraping requiring sessions
- Price monitoring requiring element tracking

### extract_structured_data → scrapling_extract
Current: LLM-based extraction (non-deterministic, token-expensive)
New: CSS/XPath deterministic extraction via Scrapling (zero LLM tokens)
Fallback: If selectors fail, fall back to LLM extraction

### research_optimizer tools integration
```
scrapling_batch_fetch (parallel) → merge_research_results (by join key) → multi_criteria_score → compare_options
```

---

## Layer 5: Alka Intelligence / Equity Research Application

For Ivo's use case (AI reasoning engine for equity research):

### Scrapling enables:
1. **SEC filing extraction** — Crawl EDGAR, extract 10-K/10-Q sections
2. **Earnings call monitoring** — Track transcript pages, extract Q&A
3. **Competitor pricing** — Monitor product pages with element tracking
4. **News aggregation** — Stealth crawl news sites behind paywalls/anti-bot
5. **Alternative data** — Job listings, review sites, patent filings

### NodeBench workflow for equity research:
```
scrapling_crawl (SEC/news) → scrapling_extract (financials) →
merge_research_results (multi-source) → multi_criteria_score (valuation model) →
compare_options (peer comparison) → send_email (analyst brief)
```

---

## Implementation Plan (5 phases)

### Phase 1: Python Bridge Server (2 files)
- `python-mcp-servers/scrapling_bridge/server.py` — FastAPI endpoints
- `python-mcp-servers/scrapling_bridge/requirements.txt` — scrapling[all], fastapi, uvicorn
- Docker: Add to `docker-compose.nodebench.yml` as service on port 8008

### Phase 2: MCP Wrapper Tools (1 file)
- `packages/mcp-local/src/tools/scraplingTools.ts` — 7 tools, HTTP wrappers
- Register in toolsetRegistry.ts as `web_scraping` domain
- Add to research/data/multi_agent/web_dev presets
- Add tool registry entries + workflow chains

### Phase 3: Workflow Chain Updates (edit existing)
- Update `research_optimizer` chain to prefer scrapling_fetch for stealth
- Add `price_monitor` and `competitive_intel` chains
- Update `parallel_research` to use scrapling_batch_fetch

### Phase 4: check_mcp_setup Integration
- Add `web_scraping` domain to check_mcp_setup wizard
- Check: Python installed, scrapling pip package, browser deps, server reachable
- Generate setup files: pip install script, docker-compose entry

### Phase 5: Tests + Eval
- `scraplingTools.test.ts` — Unit tests (mock HTTP)
- Add to evalHarness.test.ts — Scenario: "research competitor pricing"
- Add to presetRealWorldBench.test.ts — web_scraping domain coverage

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Python dependency | Same pattern as flicker_detection/figma_flow — graceful degradation if server not running |
| Rate limiting | Built-in ProxyRotator + per-domain throttling in Spider |
| Anti-bot evolution | Scrapling actively maintained (1181 commits, frequent releases) |
| Token cost | Scrapling extracts BEFORE sending to LLM — 10x fewer tokens than raw HTML |
| Legal/ToS | User responsibility — tools include disclaimer in description |

---

## Quick Start (after implementation)

```bash
# Install Scrapling
pip install "scrapling[all]"
scrapling install  # Browser deps

# Start bridge server
cd python-mcp-servers/scrapling_bridge && uvicorn server:app --port 8008

# Or via Docker
docker compose -f docker-compose.nodebench.yml up scrapling_bridge

# Use in NodeBench
npx tsx packages/mcp-local/src/index.ts --preset research
# Tools available: scrapling_fetch, scrapling_extract, scrapling_batch_fetch, etc.
```
