# Daily Morning Brief - Automated Dashboard & Digest System

## Overview

The Daily Morning Brief is a comprehensive automated workflow that runs every morning at **6:00 AM UTC** to populate the research dashboard and morning digest with fresh, relevant data from multiple free data sources.

## Architecture

### Data Flow

```
6:00 AM UTC Daily Cron
    ↓
Run all feed ingestors in parallel
    ↓
Aggregate feed data → Calculate dashboard metrics
    ↓
Store in dailyBriefSnapshots table
    ↓
Frontend components auto-refresh via Convex reactivity
```

### Components

#### Backend (Convex)

1. **`convex/workflows/dailyMorningBrief.ts`**
   - Main orchestration workflow
   - Coordinates feed ingestion, metrics calculation, and storage
   - Handles errors gracefully with fallback logic

2. **`convex/domains/research/dashboardMetrics.ts`**
   - Calculates dashboard metrics from feed data
   - Generates capability scores, key stats, market share, trend lines
   - Uses AI/ML activity, funding news, outages to derive metrics

3. **`convex/domains/research/dashboardQueries.ts`**
   - Query layer for fetching dashboard snapshots
   - Supports latest snapshot, historical snapshots, manual refresh

4. **`convex/crons.ts`**
   - Registers the daily cron job at 6:00 AM UTC
   - Triggers `runDailyMorningBrief` workflow

5. **`convex/schema.ts`**
   - New table: `dailyBriefSnapshots` for storing daily metrics
   - Indexed by `dateString` and `generatedAt` for fast queries

#### Frontend (React)

1. **`src/features/research/components/LiveDashboard.tsx`**
   - Wrapper component that fetches live dashboard data
   - Displays loading states, error states, and refresh button
   - Shows "last updated" timestamp and data source summary

2. **`src/features/research/components/StickyDashboard.tsx`**
   - Existing dashboard component (unchanged)
   - Renders dashboard metrics with animations

3. **`src/features/research/components/MorningDigest.tsx`**
   - Existing digest component (unchanged)
   - Already uses live data from `morningDigestQueries`

## Data Sources

All free data sources are leveraged from existing integrations:

| Source | Update Frequency | Data Provided |
|--------|------------------|---------------|
| **Hacker News** | Hourly | Top stories, tech news |
| **GitHub Trending** | Daily | Trending repositories |
| **Dev.to** | Every 2 hours | Developer articles |
| **ArXiv** | Every 6 hours | CS.AI research papers |
| **Reddit** | Every 4 hours | /r/MachineLearning posts |
| **Product Hunt** | Daily | Product launches |
| **RSS Feeds** | Every 2 hours | TechCrunch, etc. |

## Dashboard Metrics Calculation

### Capability Scores (0-1 scale)

- **Reasoning**: Based on AI/ML news volume
- **Uptime**: Inverse of outage mentions
- **Safety**: Inverse of security vulnerability mentions

### Key Stats

- **Gap Width**: AI capability vs deployment gap (20-45 pts)
- **Fail Rate**: Percentage based on outage mentions (0-25%)
- **Avg Latency**: Estimated from AI activity (1.5-2.4s)

### Market Share

- Top 3 sources by feed item count
- Displayed as donut chart segments

### Tech Readiness Buckets (0-10 scale)

- **Existing**: Production/deployed mentions
- **Emerging**: Beta/preview/experimental mentions
- **Sci-Fi**: Future/AGI/quantum mentions

### Trend Line

- 6-quarter moving average of AI activity
- Simulated based on current feed volume

### Agent Count

- Scales with AI/ML activity level
- Tiers: Unreliable (12k-25k), Reliable (25k-50k), Autonomous (50k+)

## Usage

### Automatic Daily Updates

The workflow runs automatically every day at 6:00 AM UTC. No manual intervention required.

### Manual Refresh

Users can manually trigger a refresh using the "Refresh" button in the LiveDashboard component:

```tsx
import { LiveDashboard } from '@/features/research/components/LiveDashboard';

<LiveDashboard fallbackData={staticData} />
```

### Querying Historical Data

```typescript
// Get latest snapshot
const latest = useQuery(api.domains.research.dashboardQueries.getLatestDashboardSnapshot);

// Get specific date
const snapshot = useQuery(api.domains.research.dashboardQueries.getDashboardSnapshotByDate, {
  dateString: "2025-01-15"
});

// Get last 7 days
const history = useQuery(api.domains.research.dashboardQueries.getHistoricalSnapshots, {
  days: 7
});
```

## Error Handling

### Graceful Degradation

- If a data source fails, the workflow continues with other sources
- Errors are logged and stored in the snapshot's `errors` field
- Frontend displays fallback data if no snapshot exists

### Retry Logic

- Individual feed ingestors have built-in retry logic
- Workflow does not retry on failure (will run again next day)

### Monitoring

Check Convex logs for workflow execution:
- `[dailyMorningBrief]` prefix for workflow logs
- `[dashboardMetrics]` prefix for metrics calculation logs

## Configuration

### Changing Schedule Time

Edit `convex/crons.ts`:

```typescript
crons.daily(
  "generate daily morning brief",
  { hourUTC: 6, minuteUTC: 0 },  // Change these values
  internal.workflows.dailyMorningBrief.runDailyMorningBrief,
  {}
);
```

### Customizing Metrics

Edit `convex/domains/research/dashboardMetrics.ts` helper functions:
- `calculateCapabilities()` - Adjust capability scoring logic
- `calculateKeyStats()` - Modify key stat calculations
- `calculateMarketShare()` - Change market share distribution
- `calculateTechReadiness()` - Update readiness buckets

## Testing

### Manual Trigger

Use the Convex dashboard or call the action directly:

```typescript
const result = await refreshDashboardMetrics({});
```

### Verify Data

1. Check `dailyBriefSnapshots` table in Convex dashboard
2. Verify `dateString`, `generatedAt`, and `version` fields
3. Inspect `dashboardMetrics` and `sourceSummary` objects

## Future Enhancements

- [ ] User-specific customization (tracked hashtags, preferred sources)
- [ ] Email digest delivery via Resend
- [ ] Historical trend analysis (week-over-week, month-over-month)
- [ ] Sentiment analysis using LLM
- [ ] Anomaly detection for unusual patterns
- [ ] Multi-timezone support (user-specific schedule)
- [ ] Caching layer to reduce API calls
- [ ] Rate limit handling for external APIs

