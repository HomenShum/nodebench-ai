# Weekly Source Summary Feature

**Status**: ✅ Implemented and Active

## Overview

The Weekly Source Summary is an automated transparency feature that compiles all domain sources used in funding intelligence posts each week. It demonstrates the breadth of media monitoring and provides full attribution of data sources.

---

## What It Does

Generates a comprehensive weekly report showing:
- **Total companies tracked** (with funding amounts)
- **All media sources monitored** (with article counts)
- **Top deals of the week** (largest funding rounds)
- **Funding stage breakdown** (seed through growth)
- **Data quality commitment** statement

---

## First Post Published

**LinkedIn URL**: https://www.linkedin.com/feed/update/urn:li:share:7419818715661246464

**Week Covered**: January 14-21, 2026

**Key Stats**:
- 22 companies tracked
- $21.3B in total funding
- 22 articles analyzed
- 4 unique media sources monitored

**Sources This Week**:
- **Primary**: siliconangle.com (18 articles)
- **Contributing**: news.crunchbase.com, techcrunch.com, endpoints.news

---

## Usage

### Manual Posting

Run weekly (recommended every Sunday or Monday):

```bash
# Dry run to preview content
npx convex run workflows/linkedinTrigger:postWeeklySourceSummary '{"dryRun":true,"daysBack":7}'

# Post to LinkedIn
npx convex run workflows/linkedinTrigger:postWeeklySourceSummary '{"dryRun":false,"daysBack":7}'
```

### Custom Time Periods

```bash
# Last 14 days (bi-weekly)
npx convex run workflows/linkedinTrigger:postWeeklySourceSummary '{"dryRun":false,"daysBack":14}'

# Last 30 days (monthly)
npx convex run workflows/linkedinTrigger:postWeeklySourceSummary '{"dryRun":false,"daysBack":30}'
```

---

## Post Format

```
WEEKLY FUNDING INTELLIGENCE REPORT
[Date Range]

COVERAGE OVERVIEW:
📊 X companies tracked
💰 $X.XB in total funding
📰 X articles analyzed
🔍 X unique media sources monitored

TOP DEALS THIS WEEK:
1. Company - $Amount (round)
2. Company - $Amount (round)
...

FUNDING STAGE BREAKDOWN:
• Seed/Pre-seed: X
• Series A: X
• Series B: X
• Series C+: X
• Growth/Other: X

MEDIA SOURCES MONITORED:
Our intelligence aggregates data from X trusted sources:

Primary Sources (10+ articles):
  • domain.com - X articles

Secondary Sources (5-9 articles):
  • domain.com - X articles

Contributing Sources (1-4 articles):
  domain1.com, domain2.com, domain3.com

DATA QUALITY COMMITMENT:
All funding data is verified against original sources. We prioritize accuracy over speed and publicly disclose data quality improvements.

🔗 View full database: nodebench-ai.vercel.app

#StartupFunding #VentureCapital #DataTransparency #TechNews #AI
```

---

## Features

### 1. Source Attribution
- Automatically extracts all domain sources from funding events
- Groups sources by article volume (Primary, Secondary, Contributing)
- Shows exact article count per source

### 2. Deal Tracking
- Lists top 5 largest deals of the period
- Shows company name, funding amount, and round type
- Automatically sorted by deal size

### 3. Stage Distribution
- Aggregates rounds by type (Seed, Series A-C+, Growth)
- Provides snapshot of market activity

### 4. Transparency Statement
- Reinforces data quality commitment
- Links to full database for verification
- Demonstrates open approach to intelligence

---

## Files Created

### Core Implementation
1. **[convex/workflows/weeklySourceSummary.ts](convex/workflows/weeklySourceSummary.ts)** - Main workflow (330 lines)
   - `generateWeeklySourceSummary` - Aggregates data from funding events
   - `formatWeeklySourcePost` - Formats data for LinkedIn

2. **[convex/workflows/linkedinTrigger.ts](convex/workflows/linkedinTrigger.ts)** - Public trigger
   - `postWeeklySourceSummary` - Callable action for manual/automated posting

### Documentation
3. **[WEEKLY_SOURCE_SUMMARY.md](WEEKLY_SOURCE_SUMMARY.md)** - This document

---

## Benefits

### For Transparency
- Shows exactly which sources are monitored
- Demonstrates breadth of data aggregation
- Provides verifiable attribution

### For Credibility
- Regular reporting builds trust
- Shows systematic approach to intelligence
- Demonstrates media diversity (not relying on single source)

### For Engagement
- Weekly cadence keeps audience engaged
- Summary format is scannable and informative
- Reinforces your position as aggregator/curator

---

## Automation Options

### Option 1: Manual Weekly Posting
Run the command every Sunday/Monday as part of weekly routine.

### Option 2: Scheduled Workflow (Future)
Add a Convex cron job to automatically post weekly:

```typescript
// convex/crons.ts
export default cronJobs;
cronJobs.weekly(
  "post weekly source summary",
  { hourUTC: 14, minuteUTC: 0, dayOfWeek: "monday" }, // 9am EST Mondays
  internal.workflows.weeklySourceSummary.formatAndPostWeekly,
);
```

### Option 3: GitHub Actions (Future)
Set up GitHub Actions to trigger posting on schedule:

```yaml
name: Weekly Source Summary
on:
  schedule:
    - cron: '0 14 * * 1'  # 9am EST every Monday
jobs:
  post:
    runs-on: ubuntu-latest
    steps:
      - run: npx convex run workflows/linkedinTrigger:postWeeklySourceSummary '{}'
```

---

## Sample Output (Week of Jan 14-21, 2026)

**Companies Covered**:
- OpenEvidence ($12B Series D+)
- Baseten ($5B)
- Skild AI ($1.4B)
- Humans ($480M Seed)
- Pennylane ($204M Series D+)
- Alpaca ($150M Series D+)
- Harmonic ($120M Series C)
- Higgsfield ($80M)
- Datarails ($70M Series C)
- Emergent ($70M Series B)
- Corti ($70M Series B)
- Equal1 ($60M)
- Aikido Security ($60M Series B)
- Exciva ($59M Series B)
- Ivo AI ($55M Series B)
- Depthfirst ($40M)
- GovDash ($30M)
- Project Eleven ($20M)
- XBuild ($19M Series A)
- Nexxa AI ($9M Seed)
- RiskFront ($3.3M Pre-seed)
- Another ($2.5M Seed)

**Sources Used**:
1. **siliconangle.com** - 18 articles (82%)
2. **news.crunchbase.com** - 2 articles (9%)
3. **techcrunch.com** - 1 article (5%)
4. **endpoints.news** - 1 article (5%)

---

## Maintenance

### Weekly Checklist
1. ✅ Run dry run on Sunday evening to preview content
2. ✅ Review top deals for accuracy
3. ✅ Post Monday morning (9am EST recommended)
4. ✅ Monitor engagement and respond to comments

### Monthly Review
- Check if new sources should be highlighted
- Adjust source tier thresholds if needed (currently: 10+ = Primary, 5-9 = Secondary)
- Review whether weekly cadence is optimal

---

## Future Enhancements

### 1. Sector Breakdown
Add sector distribution to show which industries are most active:
```
SECTOR ACTIVITY:
• AI/ML: 40%
• HealthTech: 20%
• FinTech: 15%
• Enterprise SaaS: 15%
• DeepTech: 10%
```

### 2. Geographic Distribution
Show where deals are happening:
```
GEOGRAPHY:
• United States: 60%
• Europe: 25%
• Asia: 10%
• Other: 5%
```

### 3. Trend Analysis
Compare week-over-week metrics:
```
TRENDS vs LAST WEEK:
• Total Funding: +15% ($18.5B → $21.3B)
• Deal Count: -5% (23 → 22)
• Average Deal Size: +21%
```

### 4. Source Deep Dive
Link to articles or highlight standout stories from each source.

---

## Related Posts

This feature complements other transparency initiatives:
1. **[DATA_CLEANUP_REPORT_2026-01-21.md](DATA_CLEANUP_REPORT_2026-01-21.md)** - Data quality fixes
2. **[Transparency Post](https://www.linkedin.com/feed/update/urn:li:share:7419815155385049088)** - Attribution error corrections
3. **Weekly Source Summary** - Ongoing source transparency (this feature)

---

## Success Metrics

Track these metrics to measure effectiveness:
- **Engagement rate** on weekly posts vs daily posts
- **Source diversity** over time (goal: 5+ sources consistently)
- **Follower feedback** on transparency initiatives
- **Perceived credibility** (qualitative feedback)

---

## Contact

For questions about this feature or to suggest improvements:
- **Implementation**: [convex/workflows/weeklySourceSummary.ts](convex/workflows/weeklySourceSummary.ts)
- **Public trigger**: [convex/workflows/linkedinTrigger.ts](convex/workflows/linkedinTrigger.ts)
- **This documentation**: [WEEKLY_SOURCE_SUMMARY.md](WEEKLY_SOURCE_SUMMARY.md)
