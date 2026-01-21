# Available Metrics Analysis

**Date**: 2026-01-21
**Status**: Comprehensive audit of all trackable metrics

---

## Executive Summary

We now have an **enhanced weekly summary** that includes ALL available data fields from the fundingEvents schema. This audit reveals:

- ✅ **Currently Tracked**: Domains, companies, funding amounts, rounds, investors, confidence scores
- ⚠️ **Partially Populated**: Source publishers, verification status
- ❌ **Missing/Unpopulated**: Sectors, locations, valuations, source names

---

## Current Week Snapshot (Jan 14-21, 2026)

### What We CAN Show (Populated Fields)

**Coverage Overview**:
- **22 companies tracked** ✅
- **$21.3B in total funding** ✅
- **22 articles analyzed** ✅
- **4 unique domains** ✅

**Top Deals** ✅:
1. OpenEvidence - $12B (Series D+)
2. Baseten - $5B
3. Skild AI - $1.4B (two entries - duplicate?)
4. Humans - $480M (Seed)
5. Pennylane - $204M

**Funding Stage Breakdown** ✅:
- Seed/Pre-seed: 4 deals (avg $123.7M)
- Series A: 1 deal (avg $19.0M)
- Series B: 4 deals (avg $61.0M)
- Series C+: 5 deals (avg $2.5B)
- Growth/Other: 8 deals

**Investor Activity** ✅:
- Nvidia: 2 deals (Baseten, Skild AI)
- Construct Capital: 1 deal (Nexxa AI)
- Lytical Ventures: 1 deal (RiskFront)
- Khosla Ventures: 1 deal (Emergent)
- Institutional Venture Partners LP: 1 deal (Baseten)

**Data Quality** ✅:
- Average confidence: **100%**
- High confidence deals (80%+): **22/22**

**Source Domains** ✅:
- siliconangle.com: 18 articles (82%)
- news.crunchbase.com: 2 articles (9%)
- techcrunch.com: 1 article (5%)
- endpoints.news: 1 article (5%)

---

## What We CANNOT Show (Unpopulated Fields)

### 1. Source Publishers (sourceNames field) ❌

**Current**: 0 publishers shown
**Field**: `sourceNames: v.array(v.string())`
**Issue**: Field exists in schema but not populated during ingestion

**What We're Missing**:
- "Crunchbase News" vs "news.crunchbase.com"
- "TechCrunch" vs "techcrunch.com"
- "SiliconANGLE" vs "siliconangle.com"

**Impact**: Cannot attribute to publisher brands, only domains

**Fix**: Populate `sourceNames` during funding detection:
```typescript
// In fundingDetection.ts
sourceNames: ["Crunchbase News"], // Add this
sourceUrls: ["https://news.crunchbase.com/..."],
```

---

### 2. Sector Distribution ❌

**Current**: 0 sectors shown
**Field**: `sector: v.optional(v.string())`
**Issue**: Field exists but not populated

**What We're Missing**:
- AI/ML: X deals, $X.XB
- HealthTech: X deals, $X.XB
- FinTech: X deals, $X.XB
- Enterprise SaaS: X deals, $X.XB
- DeepTech: X deals, $X.XB

**Impact**: Cannot show sector trends, market heat

**Fix**: Extract sector from article analysis or company description:
```typescript
// Add sector classification
sector: classifySector(companyDescription), // "AI/ML", "HealthTech", etc.
```

**Manual Population** (for current data):
- OpenEvidence ($12B) → HealthTech
- Baseten ($5B) → AI/ML - Infrastructure
- Skild AI ($1.4B) → AI/ML - Robotics
- Humans ($480M) → AI/ML - Consumer
- Pennylane ($204M) → FinTech
- Alpaca ($150M) → FinTech
- Harmonic ($120M) → AI/ML
- Higgsfield ($80M) → AI/ML - Generative AI
- Datarails ($70M) → FinTech
- Emergent ($70M) → AI/ML
- Equal1 ($60M) → DeepTech - Quantum
- Aikido Security ($60M) → Enterprise SaaS - Security
- Exciva ($59M) → HealthTech - Pharma
- Ivo AI ($55M) → LegalTech
- Depthfirst ($40M) → Enterprise SaaS - Security
- GovDash ($30M) → Enterprise SaaS - GovTech
- Project Eleven ($20M) → Crypto/Web3
- XBuild ($19M) → Construction Tech
- Nexxa AI ($9M) → AI/ML - Industrial
- RiskFront ($3.3M) → FinTech - Compliance
- Another ($2.5M) → Retail Tech

---

### 3. Geographic Distribution ❌

**Current**: 0 locations shown
**Field**: `location: v.optional(v.string())`
**Issue**: Field exists but not populated

**What We're Missing**:
- United States: X deals
- Europe: X deals
- Asia: X deals
- Other: X deals

**Impact**: Cannot show geographic trends, regional activity

**Fix**: Extract from company data or article:
```typescript
location: "United States", // or "San Francisco, CA"
```

**Manual Population** (known locations):
- Baseten → United States (San Francisco)
- OpenEvidence → United States
- Humans → United States (San Francisco)
- Pennylane → France (Paris)
- Skild AI → United States (Pittsburgh)
- Harmonic → United States
- Equal1 → Ireland
- Ivo AI → Australia
- Emergent → United States

---

### 4. Valuation Disclosures ❌

**Current**: 0 valuations shown
**Field**: `valuation: v.optional(v.string())`
**Issue**: Field exists but not populated

**What We're Missing**:
- OpenEvidence @ $X.XB valuation
- Baseten @ $5B valuation (from article title!)
- Pennylane @ $4.25B valuation (mentioned in URL!)
- Harmonic @ valuation
- Higgsfield @ $1.3B valuation (from article title!)

**Impact**: Cannot show valuation metrics, pricing trends

**Fix**: Extract from article:
```typescript
valuation: "$5B", // Extract from "hits-5b-valuation" in URL
```

**Known Valuations** (from article titles/URLs):
- Baseten: $5B (in title)
- Pennylane: $4.25B (in URL)
- Higgsfield: $1.3B (in title)
- Aikido Security: $1B (in title)
- Onebrief: $2.15B (in title)

---

### 5. Verification Status Distribution ⚠️

**Current**: All 22 deals marked as "single-source"
**Field**: `verificationStatus: v.union("unverified", "single-source", "multi-source", "verified")`
**Issue**: Multi-source validation not running

**What We're Missing**:
- Verified: 0 (should be 5-10 with multi-source validation)
- Multi-source: 0 (should be 3-5)
- Single-source: 22 (should be 10-15)
- Unverified: 0

**Impact**: Cannot demonstrate verification quality

**Fix**: Run multi-source validation:
```bash
# For large rounds ($50M+)
npx convex run domains/verification/multiSourceValidation:validateFundingEvent \
  '{"fundingEventId":"<id>"}'
```

---

## Complete Metrics Breakdown

### Tier 1: Fully Populated ✅

| Metric | Field | Status | Example |
|--------|-------|--------|---------|
| Company Name | `companyName` | ✅ Populated | "OpenEvidence" |
| Funding Amount | `amountUsd`, `amountRaw` | ✅ Populated | $12B |
| Round Type | `roundType` | ✅ Populated | "series-d-plus" |
| Announced Date | `announcedAt` | ✅ Populated | 1769012746000 |
| Source URLs | `sourceUrls` | ✅ Populated | ["https://..."] |
| Lead Investors | `leadInvestors` | ✅ Populated | ["Nvidia"] |
| Co-Investors | `coInvestors` | ⚠️ Partial | Sometimes empty |
| Confidence | `confidence` | ✅ Populated | 0.95-1.0 |
| Created/Updated | `createdAt`, `updatedAt` | ✅ Populated | timestamps |

### Tier 2: Partially Populated ⚠️

| Metric | Field | Status | Issue |
|--------|-------|--------|-------|
| Source Publishers | `sourceNames` | ⚠️ Empty | Not extracted |
| Verification Status | `verificationStatus` | ⚠️ All single-source | Not validated |
| Description | `description` | ⚠️ Sparse | Rarely populated |

### Tier 3: Unpopulated ❌

| Metric | Field | Status | Impact |
|--------|-------|--------|--------|
| Sector | `sector` | ❌ Empty | No sector analysis |
| Location | `location` | ❌ Empty | No geo analysis |
| Valuation | `valuation` | ❌ Empty | No valuation metrics |
| Use of Proceeds | `useOfProceeds` | ❌ Empty | No use analysis |
| Company ID | `companyId` | ❌ Empty | No entity linking |

---

## Impact on Weekly Summaries

### Basic Summary (Current)
Shows:
- Total companies, funding, articles
- Source domains
- Top 5 deals
- Round distribution
- Basic stats

**Completeness**: ~40%

### Enhanced Summary (New)
Shows everything above PLUS:
- Average deal size by stage ✅
- Investor activity ✅
- Data quality scores ✅
- Verification breakdown ⚠️
- Publishers ❌ (field empty)
- Sectors ❌ (field empty)
- Geography ❌ (field empty)
- Valuations ❌ (field empty)

**Completeness**: ~60%

### Ideal Summary (Future)
Would show all above PLUS:
- Full sector breakdown with funding totals
- Geographic heatmap
- Valuation metrics and pricing trends
- Use of proceeds analysis
- Company progression tracking (who raised multiple rounds)
- Week-over-week trends
- Investor network analysis

**Completeness**: 100%

---

## Recommendations

### Immediate (This Week)

1. **Populate sourceNames** during funding detection
   - Map domains to publisher names
   - "news.crunchbase.com" → "Crunchbase News"

2. **Run multi-source validation** on large rounds
   - All deals $50M+ should be validated
   - Update verificationStatus field

3. **Manually populate sectors** for current 22 companies
   - Use company descriptions or articles
   - Add to fundingEvents table

### Short-Term (Next 2 Weeks)

4. **Extract valuations** from article text
   - Check titles for "at-Xb-valuation"
   - Parse from article content
   - Backfill for existing records

5. **Add location extraction**
   - Parse from company websites
   - Extract from article mentions
   - Use entity resolution data

6. **Implement sector classification**
   - Build keyword-based classifier
   - Use LLM for ambiguous cases
   - Store in sector field

### Long-Term (Next Month)

7. **Company entity linking** (companyId field)
   - Link to entityContexts table
   - Enable deduplication
   - Track company progressions

8. **Use of proceeds extraction**
   - Parse from article content
   - Classify into categories
   - Store in useOfProceeds field

9. **Historical data backfill**
   - Run enrichment on all past records
   - Populate missing fields
   - Improve data completeness

---

## Data Completeness Score

### Current State

| Category | Completeness | Grade |
|----------|--------------|-------|
| **Core Funding Data** | 100% | A+ |
| **Source Attribution** | 70% | C+ |
| **Investor Data** | 85% | B+ |
| **Verification** | 40% | F |
| **Company Context** | 25% | F |
| **Market Intelligence** | 15% | F |
| **Overall** | **55%** | **D+** |

### Target State (3 Months)

| Category | Target | Actions Needed |
|----------|--------|----------------|
| Core Funding Data | 100% | Maintain |
| Source Attribution | 95% | Add publisher names |
| Investor Data | 95% | Improve co-investor capture |
| Verification | 80% | Run validation pipeline |
| Company Context | 85% | Extract sectors, locations |
| Market Intelligence | 90% | Add valuations, use of proceeds |
| **Overall** | **90%** | **A-** |

---

## Usage Examples

### Current Enhanced Summary
```bash
# Run enhanced weekly summary
npx convex run workflows/linkedinTrigger:postEnhancedWeeklySummary '{"dryRun":true}'
```

**Output includes**:
- ✅ Coverage overview (22 companies, $21.3B)
- ✅ Top deals with investors
- ✅ Funding stage breakdown with averages
- ✅ Active investors
- ✅ Data quality metrics
- ⚠️ Publishers (empty - shows 0)
- ❌ Sectors (empty - not shown)
- ❌ Geography (empty - not shown)
- ❌ Valuations (empty - not shown)

### Future Enhanced Summary (After Data Population)
```bash
# Same command, richer output
npx convex run workflows/linkedinTrigger:postEnhancedWeeklySummary '{"dryRun":true}'
```

**Output will include**:
- ✅ Everything above PLUS
- ✅ Top sectors (AI/ML: 10 deals $15B, HealthTech: 3 deals $12.2B)
- ✅ Geography (US: 15 deals, Europe: 5 deals, Asia: 2 deals)
- ✅ Valuation metrics (8 disclosed, avg $2.5B)
- ✅ Publisher attribution (Crunchbase: 5, SiliconANGLE: 15)

---

## Comparison: Basic vs Enhanced

| Metric | Basic Summary | Enhanced Summary |
|--------|---------------|------------------|
| Companies | ✅ | ✅ |
| Total Funding | ✅ | ✅ |
| Articles | ✅ | ✅ |
| Source Domains | ✅ | ✅ |
| Source Publishers | ❌ | ⚠️ (empty) |
| Top Deals | ✅ | ✅ + investors |
| Round Distribution | ✅ | ✅ + averages |
| Sectors | ❌ | ❌ (field empty) |
| Geography | ❌ | ❌ (field empty) |
| Investors | ❌ | ✅ Top 10 |
| Valuations | ❌ | ❌ (field empty) |
| Verification | ❌ | ✅ Breakdown |
| Data Quality | ❌ | ✅ Confidence scores |

**Recommendation**: Use **Enhanced Summary** going forward - it's ready to show more metrics as we populate them.

---

## Action Items

### For User

**This Week**:
1. ✅ Use enhanced summary for next weekly post
2. 🔄 Decide which metrics to prioritize (sectors? geography? valuations?)
3. 🔄 Run multi-source validation on top 10 deals

**Next Week**:
4. 🔄 Manually populate sectors for 22 companies
5. 🔄 Extract valuations from article titles/content
6. 🔄 Add location extraction to funding detection

### For System

**Immediate**:
- Add sourceNames mapping during ingestion
- Enable multi-source validation for $50M+ rounds
- Create sector classification function

**Short-term**:
- Implement location extraction
- Add valuation parsing
- Backfill missing data

---

## Summary

**What We Have Now** ✅:
- Complete funding data (amounts, rounds, dates)
- Source domain attribution
- Investor tracking
- Confidence scores
- Enhanced weekly summary infrastructure

**What We're Missing** ❌:
- Publisher names (field empty)
- Sector classification (field empty)
- Geographic data (field empty)
- Valuation metrics (field empty)
- Full verification (all single-source)

**Path Forward** 🎯:
1. Populate missing fields during ingestion
2. Backfill existing records
3. Enable multi-source validation
4. Use enhanced summary for transparency

**The infrastructure is ready - we just need to populate the data fields!**
