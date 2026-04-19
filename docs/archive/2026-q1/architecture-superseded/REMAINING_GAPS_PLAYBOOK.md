# Remaining Gaps Playbook — Actionable Fixes From Industry Research

Self-search returned 5 remaining gaps. Here's the research-backed remediation for each.

---

## Gap 1: Pre-Revenue [CRITICAL]

### What the research says
- Pilot with 10-20 design partners over 90 days before scaling
- Validate demand before polish — speed over perfection
- Communities (Slack, Discord) create direct feedback loops
- MCP servers are being monetized via free tier → upgrade funnel

### Actionable steps (ranked by impact)

**Week 1-2: Identify design partners**
1. Find 5-10 founders/bankers who manually do company research today
2. Offer them free NodeBench diligence runs in exchange for feedback
3. Track: did the packet save them time? Would they pay $29/mo for it?
4. Sources: GitHub stargazers, MCP users (npm download stats), LinkedIn connections

**Week 3-4: Create pricing page**
- Build `/pricing` route with 3 tiers: Free (5 searches/day) → Pro $29/mo (unlimited + export) → Team $99/seat
- Code fix: create `src/features/controlPlane/views/PricingPage.tsx` and register in viewRegistry
- Add Stripe/Polar integration (already have `@convex-dev/polar` installed)

**Week 5-8: Close first 3 paying customers**
- Convert best design partners to paid
- Document: who paid, why, what feature mattered most
- This becomes the "traction" signal for investors

**Week 9-12: Validate unit economics**
- Cost per search: ~$0.14 (Gemini + Linkup)
- At $29/mo, need ~207 searches to break even per user
- At 10 searches/day per active user: profitable from day 1

### Tools/resources
- [Polar](https://polar.sh) — already installed as Convex component, handles payments
- [Stripe](https://stripe.com) — alternative payment processor
- Design partner outreach template: reach out via LinkedIn DM with a free diligence packet as proof

---

## Gap 2: Solo Founder Key-Person Risk [HIGH]

### What the research says
- Solo founders now represent 36.3% of startups (up from 23.7% in 2019)
- Solo founders are outperforming co-founder teams in 2026 for capital efficiency
- Investors increasingly accept solo founders who demonstrate systems thinking
- Mitigation: advisory boards, documented processes, early key hires

### Actionable steps

**Immediate (code-level documentation):**
1. Write `docs/architecture/RUNBOOK.md` — how to operate NodeBench if Homen is unavailable for 2 weeks
2. Document all critical processes: Convex deploy, Vercel deploy, API key rotation, Gemini model updates
3. Document all accounts and access: Vercel, Convex, npm, Google AI Studio, Linkup

**Month 1: Build advisory signal**
4. Identify 2-3 advisors: one technical (MCP/AI), one business (banking/finance), one GTM
5. Informal advisors count — even public "thank you" mentions on the /about page signal team
6. Consider: advisor equity (0.25-0.5% vesting over 2 years)

**Month 2-3: Plan first hire**
7. First hire should be a "customer success + growth" hybrid, not another engineer
8. Why: the product works technically — the gap is distribution and revenue, not features
9. Budget: $0 if equity-only, $3-5K/mo if part-time contractor

**Framing for investors:**
- "Solo founder with documented systems" > "co-founders who can't ship"
- Point to: the codebase (350+ tools), the velocity (this entire session's output), the architecture docs
- Cite: Carta Solo Founders Report 2026 shows solo founders reaching meaningful revenue before raising

### Sources
- [Carta Solo Founders Report](https://carta.com/data/solo-founders-report/)
- [Solo Founders Outperforming in 2026](https://blog.mean.ceo/solo-founders-outperform-teams/)
- [Antler: Can You Launch Alone?](https://www.antler.co/blog/pros-cons-of-being-a-solo-founder)

---

## Gap 3: Low Organic Search Discoverability [HIGH]

### What the research says
- 2026 SEO requires three pillars: content architecture, technical SEO, authority
- Isolated blog posts are dead — build content ecosystems, not standalone pages
- AI search evaluates topical authority across connected content
- Developer tools get discovered via directories, GitHub, and community content

### Actionable steps

**Immediate (today):**
1. Submit to MCP directories:
   - [mcpservers.org](https://mcpservers.org) — submit via GitHub issue
   - [mcp.so](https://mcp.so) — community directory
   - [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io) — official MCP registry
   - [awesome-mcp-servers](https://github.com/wong2/awesome-mcp-servers) — GitHub PR
   - [ever-works/awesome-mcp-servers](https://github.com/ever-works/awesome-mcp-servers)

2. Submit npm package metadata improvements:
   - Update `packages/mcp-local/package.json` keywords to include "entity-intelligence", "diligence", "founder-tools"
   - Ensure README on npm shows quick start prominently

**Week 1-2: Content ecosystem (5 interconnected posts):**
3. Post 1: "How We Built a 350-Tool MCP Server" (technical, targets MCP developers)
4. Post 2: "Banker-Grade Company Diligence in 90 Seconds" (product, targets founders)
5. Post 3: "Why Your AI Agent Needs Company Truth, Not Just Web Search" (thought leadership)
6. Post 4: "NodeBench AI Self-Diligence: What Our Own Product Found About Us" (meta/honest, highly shareable)
7. Post 5: "6 Research Branches Every Investor Due Diligence Should Cover" (educational, targets investors)

   Publish on: DEV.to, Medium, personal blog, cross-post to LinkedIn

**Week 3-4: Authority building:**
8. Submit to Product Hunt — prepare 6 weeks before launch
9. Post on Hacker News (Show HN) with the self-diligence angle
10. Submit to [Builder.io best MCP servers](https://www.builder.io/blog/best-mcp-servers-2026) list
11. Answer relevant questions on Reddit r/ClaudeAI, r/LocalLLaMA, r/SaaS

**Ongoing:**
12. Google Search Console setup — verify site, submit sitemap
13. Monitor branded search: "NodeBench AI" vs "nodebench"
14. Track: which content drives signups, which directories drive installs

### Sources
- [Organic SEO Three-Pillar Strategy](https://www.reporteroutreach.com/blog/organic-seo)
- [10 MCP Distribution Channels](https://dev.to/lexwhiting/your-mcp-server-has-10-distribution-channels-youre-not-using-4pk8)
- [Product Hunt Launch Playbook 2026](https://dev.to/iris1031/product-hunt-launch-playbook-the-definitive-guide-30x-1-winner-1pbh)
- [How to Launch a Developer Tool on Product Hunt](https://hackmamba.io/developer-marketing/how-to-launch-on-product-hunt/)

---

## Gap 4: Structured Data Still Flagged [MEDIUM]

### Why it's still flagged
The JSON-LD was deployed to production but search engine crawlers haven't re-indexed yet. Google typically re-crawls within 1-7 days after a sitemap submission.

### Actionable steps

**Immediate:**
1. Submit URL to Google Search Console for re-indexing:
   ```
   https://search.google.com/search-console/inspect?resource_id=https://www.nodebenchai.com/
   ```
2. Verify sitemap.xml includes `/about` page
3. Test JSON-LD with Google Rich Results Test:
   ```
   https://search.google.com/test/rich-results?url=https://www.nodebenchai.com/
   ```

**Code fix: update sitemap.xml**
- Add `/about` route to sitemap if not already present
- Verify `robots.txt` allows all crawlers

**Update remediation engine:**
- The engine should check for JSON-LD presence before flagging "missing structured data"
- When self-searching, parse the actual page for schema.org markup

### Sources
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Yoast Schema Aggregation 2026](https://blog.mean.ceo/startup-news-yoast-seo-2026-schema-aggregator-benefits/)

---

## Gap 5: Brand Confusion / Name Overlap [MEDIUM]

### What the research says
- Generic brand names face an "ambiguity penalty" in search
- JSON-LD `disambiguatingDescription` and `sameAs` help search engines differentiate
- Consistently using "NodeBench AI" (with qualifier) is the top mitigation
- In 2026, search is entity-focused — you need to be a recognized entity, not a keyword match

### What's already done
- JSON-LD with Organization schema + `alternateName` array
- Title, OG, Twitter all say "NodeBench AI"
- Canonical URL on correct domain

### Remaining actions

**Immediate:**
1. Add `disambiguatingDescription` to JSON-LD:
   ```json
   "disambiguatingDescription": "NodeBench AI is an entity intelligence platform, not a benchmarking tool. Founded by Homen Shum in 2024."
   ```
2. Add `knowsAbout` array to JSON-LD:
   ```json
   "knowsAbout": ["entity intelligence", "company diligence", "MCP protocol", "founder tools"]
   ```

**Ongoing:**
3. Every external mention should use "NodeBench AI" not "NodeBench"
4. GitHub repo description should lead with "NodeBench AI —"
5. npm package description should lead with "NodeBench AI —"
6. Every blog post title should include "NodeBench AI"

### Sources
- [The Disambiguation Defense](https://blog.trysteakhouse.com/blog/disambiguation-defense-securing-brand-entity-ai-hallucinations)
- [Competing Against Same-Name Brands](https://www.searchenginejournal.com/competing-against-brands-nouns-of-the-same-name/514305/)
- [Why Keyword Brand Names Are a Liability](https://punkfox.com.au/why-keyword-brand-names-are-a-liability-in-2026/)

---

## Summary: What Can Be Fixed With Code vs What Can't

| Gap | Code Fix? | Timeline | Impact |
|-----|-----------|----------|--------|
| Pre-revenue | Pricing page (code) + design partners (human) | 2-12 weeks | Critical |
| Key-person | Runbook (code) + advisors (human) | 1-4 weeks | High |
| Low SEO | Directories + content (human) + sitemap (code) | 2-6 weeks | High |
| Structured data flagged | Already fixed, awaiting re-crawl | 1-7 days | Auto-resolves |
| Brand confusion | JSON-LD update (code) + consistent naming (human) | Ongoing | Medium |

## Code Fixes I Can Ship Right Now

1. `/pricing` page skeleton
2. `RUNBOOK.md` for bus-factor documentation
3. JSON-LD `disambiguatingDescription` + `knowsAbout` addition
4. Sitemap update with `/about` route
5. npm package.json keyword update for discoverability
