# Archetype Gap Analysis — Every User Who Might Touch NodeBench

## The Meta-Problem

NodeBench can diagnose gaps but doesn't close them. The deep diligence pipeline found that NodeBench itself has low SEO, no public presence, and brand confusion — but then just... reported it. A real product would say "here's exactly what to do about each gap, and here are the artifacts to do it."

Additionally, the local context injection only works when MCP is connected. A first-time visitor, a friend, a banker doing due diligence, or a HackerNews reader has ZERO local context. The product must work for them too.

---

## 1. User Archetypes — Complete Map

### Tier 1: Primary Users (daily/weekly, high intent)

| Archetype | First Question | What They Need | Current Gap |
|-----------|---------------|----------------|-------------|
| **Founder (self)** | "What am I missing?" | Company truth, contradictions, hidden requirements, next 3 moves | Self-search works with MCP. Without MCP = broken. No gap remediation. |
| **Founder (searching others)** | "Is this competitor real?" | Deep entity intelligence on any company | Works well for known companies. Niche companies = sparse. |
| **CEO / Operator** | "What changed and what do I do?" | Weekly reset, delegation packets, operational clarity | Not differentiated from founder lens yet. |

### Tier 2: Evaluators (monthly, decision-making)

| Archetype | First Question | What They Need | Current Gap |
|-----------|---------------|----------------|-------------|
| **Investor / VC** | "Should I fund this?" | Diligence packet, team credibility, market proof, risk flags | Deep diligence works. No exportable LP memo format. No deal-flow integration. |
| **Banker (middle market / business)** | "Is this bankable?" | Financial readiness, compliance, covenant risk, collateral | Lens exists but no banking-specific output format (credit memo, covenant checklist). |
| **Lawyer** | "What's the exposure?" | Regulatory risk, IP status, litigation history, contract review | Lens exists but no legal-specific extraction (patent search, litigation database). |

### Tier 3: Learners (occasional, exploratory)

| Archetype | First Question | What They Need | Current Gap |
|-----------|---------------|----------------|-------------|
| **Student** | "Help me understand this company/market" | Plain-language breakdown, study brief, citation-ready | Works passably. No citation format (APA/MLA). No "explain like I'm 18" mode. |
| **Researcher** | "What's the evidence landscape?" | Source quality scoring, methodology transparency, reproducibility | Trace exists but not researcher-grade. No export to BibTeX/Zotero. |

### Tier 4: Extended Network (rare, referral-driven)

| Archetype | First Question | What They Need | Current Gap |
|-----------|---------------|----------------|-------------|
| **Mom / Family (non-English)** | "What does my kid do?" | Simple explanation in their language | **Zero i18n support.** No translation. No simplified mode. |
| **Friend / Colleague** | "What is this thing you built?" | 30-second understanding, shareable link | No public company page. No "about NodeBench" summary page. |
| **HackerNews reader** | "Is this legit or vaporware?" | Technical credibility, open source proof, architecture transparency | No /architecture page. No public benchmark results. GitHub README is weak. |
| **Product Hunt visitor** | "Why should I care?" | 5-second value prop, demo, instant try | No Product Hunt listing. Landing page is dense. No instant demo result. |
| **Reddit user** | "Does this actually work?" | Real example, before/after, honest limitations | No public example results. No comparison page. |

### Tier 5: Scale / Infrastructure (future)

| Archetype | Concern | Current Gap |
|-----------|---------|-------------|
| **Concurrent users (100+)** | Load, latency, cost | No rate limiting on Convex mutations. No query dedup. No result caching. |
| **Heavy users (power)** | Storage, history growth | No archival policy. searchSessions table grows unbounded. |
| **Enterprise evaluators** | SSO, audit, compliance | No SOC2, no SSO, no audit log export. |

---

## 2. Gap Remediation Framework

When diligence finds a gap, the product should not just report it — it should offer:

### Level 1: Diagnosis (current — works)
"Your company has low SEO visibility."

### Level 2: Prescription (needed — build now)
"Here are 5 specific actions to improve SEO visibility, ranked by impact:"
1. Publish a technical blog post about your MCP architecture (est. 2 weeks to index)
2. Submit to Product Hunt (est. 500-2000 first-day visitors)
3. Add structured data (JSON-LD) to nodebenchai.com for rich snippets
4. Create a /about page with founder bio, company mission, and press kit
5. Submit npm package to awesome-mcp-servers lists

### Level 3: Artifact Generation (needed — build now)
"I've drafted these for you:"
- Blog post outline (markdown, ready to publish)
- Product Hunt launch checklist
- JSON-LD schema for your homepage
- /about page content
- npm README improvements

### Level 4: Execution Tracking (needed — build later)
"Track which remediation steps you've completed:"
- [ ] Blog post published → re-run SEO check
- [ ] Product Hunt submitted → monitor referral traffic
- [ ] JSON-LD added → verify in Google Search Console

---

## 3. Cold Visitor Enrichment (No MCP, No Auth)

### Problem
Local context injection only works when MCP is connected. For cold visitors:
- Searching "NodeBench" returns confused results
- Searching their OWN company returns shallow results with no local context
- No way to "teach" the system about themselves without MCP setup

### Solution: Public Entity Cache + Progressive Enrichment

```
Layer 1: Web-only search (current — works for known entities)
  → Linkup + Gemini grounding for any company

Layer 2: Public entity cache (NEW)
  → Cache diligence results in Convex for popular/recent queries
  → Cold visitor searches "Anthropic" → gets cached result instantly
  → Cache TTL: 24h for popular, 7d for niche, refresh on re-search

Layer 3: Self-declaration (NEW)
  → "Is this your company?" prompt after search
  → User uploads context (pitch deck, one-pager, README)
  → System enriches the cached entity with user-provided ground truth
  → No MCP required — just paste/upload

Layer 4: MCP-connected enrichment (current — works)
  → Full local context injection from codebase/docs
  → Deepest possible intelligence
```

### Implementation: searchSessions as Cache

The `searchSessions` table already stores complete results. Add:
- `cacheKey` field (normalized query + lens hash)
- `cacheExpiresAt` field
- Query: before starting a new search, check if a fresh cached result exists
- Return cached result instantly, offer "Refresh" button for re-search

---

## 4. Internationalization (i18n)

### Problem
Mom speaks Chinese. Friend speaks Spanish. The product is English-only.

### Solution: Post-Search Translation Layer

Don't translate the UI (expensive, maintenance burden). Instead:
- After a result is generated, offer "Translate this result"
- Use Gemini to translate the answer + key findings into the target language
- Store translated versions in the cache
- Language detection: browser `navigator.language` → suggest translation

### Priority languages
1. Chinese (Simplified) — founder's family
2. Spanish — large market
3. Japanese — tech-forward market
4. Korean — tech-forward market
5. Hindi — large market

### Implementation
- Add a "Translate" button to the result workspace
- Convex action: takes result packet + target language → Gemini translation → store
- No UI translation needed — just the intelligence output

---

## 5. Load, Cost, Caching Strategy

### Current cost per deep search
- Linkup: ~6 calls × $0.01 = $0.06
- Gemini 3.1: ~15 calls × $0.005 = $0.075
- Total: ~$0.14 per deep diligence search
- At 100 users/day: $14/day = $420/month
- At 1000 users/day: $140/day = $4,200/month

### Caching strategy
| Query Type | Cache TTL | Reasoning |
|-----------|----------|-----------|
| Popular company (Anthropic, OpenAI) | 24 hours | Data changes daily |
| Niche company (Tests Assured) | 7 days | Data changes rarely |
| Self-search (own company) | No cache | Always use latest local context |
| Trending (from HN/PH traffic) | 1 hour | High volume, stale quickly |

### Cost reduction levers
1. **Result caching** — 80% of searches are repeated queries. Cache = $0/search.
2. **Tiered depth** — Quick search (1 pass, $0.02) vs Deep diligence (6 branches, $0.14). Default to quick, offer "Go deeper."
3. **Gemini Flash Lite** — Use 3.1-flash-lite for classification/follow-up, 3.1-pro only for synthesis.
4. **Dedup** — If 5 people search "Anthropic" in the same hour, run once, serve cached.
5. **Rate limiting** — Max 10 deep searches per hour per IP (unauthenticated), 50 for authenticated.

### Storage growth
- Each searchSession: ~20KB (result packet + trace)
- At 1000 searches/day: 20MB/day = 600MB/month
- Convex storage: included up to 0.5GB (free), $0.22/GB (starter)
- Archival: move completed sessions older than 30 days to cold storage table

### Convex concurrency limits (Free/Starter tier)
- 64 concurrent Node actions
- 8 concurrent scheduled jobs
- Deep diligence uses 1 action per search (6 branches run inside it)
- At 100 concurrent users: need queueing or Workpool

### Solution: Use @convex-dev/workpool
Already installed. Limit concurrent deep searches to 4-8 at a time. Queue excess.

---

## 6. SEO Enrichment for Users

### Problem
When diligence finds "low SEO" for a user's company, NodeBench should help fix it.

### Actionable SEO Remediation Artifacts

For any entity where SEO/discoverability is flagged as a risk:

1. **SEO Audit Card** — included in the diligence packet:
   - Domain authority estimate (via Linkup data)
   - Indexed page count estimate
   - Social media presence check (LinkedIn, Twitter/X, GitHub)
   - npm/registry presence for dev tools
   - Missing: structured data, sitemap, robots.txt

2. **SEO Action Plan** — generated as an artifact:
   - Top 5 actions ranked by impact/effort
   - Each action: what, why, estimated time, expected result
   - Template artifacts where applicable (blog post outline, JSON-LD, meta tags)

3. **Content Gap Analysis** — what should exist but doesn't:
   - /about page
   - /pricing page
   - Blog/changelog
   - Developer docs
   - API reference
   - Case studies / testimonials

---

## 7. Missing Surfaces for Extended Archetypes

### For HackerNews / Technical Audience
- `/architecture` page — system design, tech stack, open source components
- `/benchmarks` page — public eval results, search quality scores
- `/changelog` page — already exists but needs more visibility

### For Product Hunt / Casual Visitors
- Instant demo: pre-loaded result for a well-known company (Anthropic, Stripe)
- "Try it now" — zero-auth search with cached result
- Social proof section with real search examples

### For Mom / Non-Technical / Non-English
- `/about` page with plain-language explanation
- "What does NodeBench do?" card at the top of the landing page
- Translation button on every result
- Simplified mode: fewer signals, bigger text, clearer language

### For Bankers / Legal
- Export format: PDF credit memo template
- Export format: Legal risk summary with citation chain
- Regulatory database integration (future)

---

## 8. Implementation Priority

### Today (ship now)
1. **Public entity cache** — check searchSessions before starting new search
2. **Gap remediation in diligence output** — when a risk is found, include actionable steps
3. **SEO audit card** — add to diligence packet for every entity

### This Week
4. **Self-declaration flow** — "Is this your company?" → paste/upload context
5. **Result translation** — Gemini post-search translation
6. **Rate limiting** — per-IP limits on deep searches
7. **Tiered search** — quick (default) vs deep (button)

### This Month
8. **Workpool integration** — queue concurrent searches
9. **Archival policy** — move old sessions to cold storage
10. **Public pages** — /about, /architecture, /benchmarks
11. **Export formats** — PDF, markdown, credit memo template
12. **i18n translation cache** — store translated results
