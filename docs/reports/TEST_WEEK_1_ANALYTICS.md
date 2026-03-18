# Week 1 Analytics Integration - Testing Guide 🧪

**Status**: ✅ Component tracking added to weekly summary workflow
**Date**: 2026-01-21

---

## What Was Implemented

### ✅ Enhanced Weekly Summary - Component Tracking

**File**: `convex/workflows/enhancedWeeklySummary.ts`

**Changes**:
- Added component metrics tracking before return statement (lines 406-460)
- Tracks funding events by publisher
- Tracks funding events by publisher × sector (top 5 sectors)
- Records metrics using `batchRecordComponentMetrics`

**Metrics Tracked**:
```typescript
{
  date: "2026-01-21",                    // YYYY-MM-DD
  reportType: "weekly_digest",           // Report type
  componentType: "funding_events",       // Component type
  sourceName: "SiliconAngle",            // Publisher name
  category: "AI/ML - Vertical AI",       // Optional: Sector
  itemCount: 12,                         // Number of items
  freshnessHours: 168,                   // 7 days * 24 hours
}
```

---

## Testing Commands

### 1. Generate Weekly Summary (This triggers component tracking)

```bash
# Generate summary for last 7 days
npx convex run workflows/enhancedWeeklySummary:generateEnhancedWeeklySummary '{}'

# Or with custom lookback
npx convex run workflows/enhancedWeeklySummary:generateEnhancedWeeklySummary '{"daysBack":14}'
```

**Expected Output**:
```json
{
  "success": true,
  "summary": {
    "dateRange": "Jan 14 - Jan 21, 2026",
    "totalCompanies": 36,
    "totalFunding": "$25.7B",
    // ... rest of summary
  }
}
```

**Console Log** (check Convex dashboard):
```
[Analytics] Recorded 23 component metrics for 2026-01-21
```

---

### 2. Query Component Metrics

```bash
# Get metrics for today
npx convex run domains/analytics/componentMetrics:getComponentMetricsByDate '{"date":"2026-01-21"}'

# Get metrics for specific report type
npx convex run domains/analytics/componentMetrics:getComponentMetricsByDate '{"date":"2026-01-21","reportType":"weekly_digest"}'
```

**Expected Output**:
```json
[
  {
    "_id": "...",
    "_creationTime": 1234567890,
    "date": "2026-01-21",
    "reportType": "weekly_digest",
    "componentType": "funding_events",
    "sourceName": "SiliconAngle",
    "itemCount": 24,
    "freshnessHours": 168,
    "createdAt": 1234567890
  },
  {
    "_id": "...",
    "date": "2026-01-21",
    "reportType": "weekly_digest",
    "componentType": "funding_events",
    "sourceName": "SiliconAngle",
    "category": "AI/ML - Vertical AI",
    "itemCount": 3,
    "freshnessHours": 168,
    "createdAt": 1234567890
  },
  // ... more metrics
]
```

---

### 3. Query Top Performing Sources

```bash
# Get top 10 sources by engagement
npx convex run domains/analytics/componentMetrics:getTopPerformingSources '{"startDate":"2026-01-01","endDate":"2026-01-21","limit":10}'
```

**Expected Output**:
```json
[
  {
    "sourceName": "SiliconAngle",
    "totalItems": 144,
    "avgEngagement": 0.87,
    "avgCTR": 0.23,
    "recordCount": 6
  },
  {
    "sourceName": "TechCrunch",
    "totalItems": 45,
    "avgEngagement": 0.92,
    "avgCTR": 0.31,
    "recordCount": 3
  },
  // ... more sources
]
```

---

### 4. Query Metrics by Source

```bash
# Get all metrics for SiliconAngle
npx convex run domains/analytics/componentMetrics:getComponentMetricsBySource '{"sourceName":"SiliconAngle","startDate":"2026-01-01","endDate":"2026-01-21"}'
```

---

### 5. Query Metrics by Category

```bash
# Get all metrics for AI/ML sector
npx convex run domains/analytics/componentMetrics:getComponentMetricsByCategory '{"category":"AI/ML - Vertical AI","startDate":"2026-01-01","endDate":"2026-01-21"}'
```

---

### 6. Get Aggregated Metrics by Component Type

```bash
# Get aggregated funding events metrics
npx convex run domains/analytics/componentMetrics:getAggregatedMetricsByComponent '{"componentType":"funding_events","startDate":"2026-01-01","endDate":"2026-01-21"}'
```

**Expected Output**:
```json
{
  "componentType": "funding_events",
  "dateRange": {
    "start": "2026-01-01",
    "end": "2026-01-21"
  },
  "totalRecords": 23,
  "totalItems": 312,
  "avgEngagement": 0.87,
  "avgCTR": 0.25,
  "metrics": [ /* ... all individual metrics */ ]
}
```

---

## Verification Checklist

### ✅ Step 1: Generate Weekly Summary
- [ ] Run `generateEnhancedWeeklySummary`
- [ ] Check console logs for "[Analytics] Recorded X component metrics"
- [ ] Verify no errors in execution

### ✅ Step 2: Verify Metrics Were Recorded
- [ ] Query `getComponentMetricsByDate` for today
- [ ] Verify metrics array is not empty
- [ ] Verify metrics have correct structure

### ✅ Step 3: Verify Publisher Breakdown
- [ ] Check that each publisher has separate metric
- [ ] Verify itemCount matches summary data
- [ ] Verify sourceName matches publisher names from summary

### ✅ Step 4: Verify Sector Breakdown
- [ ] Check that top sectors have publisher breakdown
- [ ] Verify category field is populated
- [ ] Verify itemCount adds up correctly

### ✅ Step 5: Query Top Sources
- [ ] Run `getTopPerformingSources`
- [ ] Verify sources are ranked by totalItems
- [ ] Verify avgEngagement is calculated (will be 0 until we add engagement tracking)

---

## Known Limitations

### Current Implementation
1. **Engagement scores**: Currently 0 (not tracked yet)
   - Need to add engagement tracking when users view reports
   - Will be added in Week 1 dashboard implementation

2. **Click-through rates**: Currently 0 (not tracked yet)
   - Need to add click tracking to links
   - Will be added in Week 1 dashboard implementation

3. **Only weekly digest tracked**: Daily brief not yet updated
   - Next step: Add same tracking to daily brief generation

### Data Quality
- Metrics are recorded AFTER summary generation completes
- If summary fails, metrics are not recorded
- Errors in metrics recording don't fail the summary (logged only)

---

## Next Steps (Week 1 Continuation)

### 1. Add Tracking to Daily Brief ⏸️
**File**: `convex/domains/research/dailyBriefWorker.ts`
**Action**: Add same component tracking logic

### 2. Add Engagement Tracking ⏸️
**Action**:
- Track when users view reports
- Calculate engagement scores (time spent, interactions)
- Update metrics with engagement data

### 3. Build Analytics Dashboard ⏸️
**New File**: `src/features/analytics/views/ComponentDashboard.tsx`
**Features**:
- Top performing sources chart
- Engagement trends
- Category breakdown
- Source comparison

### 4. Add Click Tracking ⏸️
**Action**:
- Wrap links with click trackers
- Update metrics with CTR data

---

## Example: End-to-End Flow

```bash
# 1. Generate weekly summary (this triggers component tracking)
npx convex run workflows/enhancedWeeklySummary:generateEnhancedWeeklySummary '{}'

# Expected console output:
# [Analytics] Recorded 23 component metrics for 2026-01-21

# 2. Query what was recorded
npx convex run domains/analytics/componentMetrics:getComponentMetricsByDate '{"date":"2026-01-21"}'

# Expected output: Array of 23 metrics (8 publishers + 15 publisher x sector combinations)

# 3. Find top sources
npx convex run domains/analytics/componentMetrics:getTopPerformingSources '{"startDate":"2026-01-21","endDate":"2026-01-21"}'

# Expected output:
# [
#   { sourceName: "SiliconAngle", totalItems: 24, avgEngagement: 0, avgCTR: 0, recordCount: 1 },
#   { sourceName: "TechCrunch", totalItems: 5, avgEngagement: 0, avgCTR: 0, recordCount: 1 },
#   ...
# ]
```

---

## Debugging

### Metrics Not Recorded?

1. **Check Convex logs**:
   ```bash
   # In Convex dashboard, check function logs for:
   # "[Analytics] Recorded X component metrics for YYYY-MM-DD"
   # or
   # "[Analytics] Failed to record component metrics: ERROR"
   ```

2. **Verify schema is deployed**:
   ```bash
   npx convex dev
   # Should show: "✓ Schema synced"
   ```

3. **Check if table exists**:
   ```bash
   # In Convex dashboard, go to Data tab
   # Look for "dailyReportComponentMetrics" table
   ```

### No Metrics Returned?

1. **Check date format**:
   ```bash
   # Date must be YYYY-MM-DD
   # Correct: "2026-01-21"
   # Wrong: "1/21/2026" or "21-01-2026"
   ```

2. **Check if summary was actually run today**:
   ```bash
   # Query with date range instead
   npx convex run domains/analytics/componentMetrics:getComponentMetricsBySource '{"sourceName":"SiliconAngle","startDate":"2026-01-01","endDate":"2026-01-31"}'
   ```

---

## Success Criteria

### Week 1 - Phase 1 Complete When:
- ✅ Weekly summary records component metrics
- ⏸️ Daily brief records component metrics
- ⏸️ Can query top sources
- ⏸️ Dashboard shows component breakdown
- ⏸️ Engagement tracking added
- ⏸️ 100% of reports have component metrics

### Current Progress:
**25% Complete** (1 of 4 major deliverables done)
- ✅ Weekly summary tracking
- ⏸️ Daily brief tracking
- ⏸️ Engagement & CTR tracking
- ⏸️ Analytics dashboard UI

---

## Impact

### Before
- No visibility into which sources provide valuable content
- Cannot measure content quality by component
- No data to optimize report composition

### After (Week 1 Complete)
- **Can identify** top-performing content sources
- **Can measure** engagement by source and category
- **Can optimize** report composition based on data
- **Can justify** content acquisition costs

**ROI**: Immediate visibility into content quality → optimize within 1 week

---

## Resources

- Implementation Guide: [DATA_COMPLETENESS_IMPLEMENTATION_GUIDE.md](DATA_COMPLETENESS_IMPLEMENTATION_GUIDE.md)
- Full Roadmap: [ROADMAP_TO_100_PERCENT.md](ROADMAP_TO_100_PERCENT.md)
- System Audit: [SYSTEM_WIDE_DATA_COMPLETENESS_AUDIT.md](SYSTEM_WIDE_DATA_COMPLETENESS_AUDIT.md)
