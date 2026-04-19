# Funding Detection Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Fast Agent Panel                             │ │
│  │  "What funding events happened today?"                    │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      AGENT LAYER                                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         Coordinator Agent                                 │ │
│  │  - Analyzes user query                                    │ │
│  │  - Selects appropriate tool                               │ │
│  │  - Formats response                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         Agent Tools Registry                              │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  getTodaysFundingEvents                             │  │ │
│  │  │  searchFundingEvents                                │  │ │
│  │  │  detectFundingFromFeeds                             │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND LAYER                                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         Funding Queries (Query Layer)                     │ │
│  │  - getRecentFundingEvents                                 │ │
│  │  - searchFundingByCompany                                 │ │
│  │  - getTodaysFundingTargets                                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         Funding Events Database                           │ │
│  │  - companyName, roundType, amountUsd                      │ │
│  │  - leadInvestors, confidence, sources                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              ↑                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         Funding Detection Pipeline                        │ │
│  │  - detectFundingCandidates                                │ │
│  │  - processFeedItemForFunding                              │ │
│  │  - Pattern matching & extraction                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              ↑                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         Feed Items (RSS/News)                             │ │
│  │  - TechCrunch, VentureBeat, etc.                          │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Ingestion Flow (Automatic)

```
RSS Feeds → Feed Items → Funding Detection → Funding Events DB
```

**Steps:**
1. RSS feeds are ingested periodically
2. Feed items are stored in database
3. Enrichment worker processes feed items
4. Funding detection pipeline analyzes content
5. Detected funding events are stored

### 2. Query Flow (User-Initiated)

```
User Query → Agent → Tool Selection → Backend Query → Response
```

**Steps:**
1. User asks funding question in Fast Agent Panel
2. Coordinator Agent analyzes query intent
3. Agent selects appropriate tool:
   - `getTodaysFundingEvents` for recent events
   - `searchFundingEvents` for specific searches
   - `detectFundingFromFeeds` for manual detection
4. Tool queries backend (fundingQueries)
5. Backend returns structured data
6. Agent formats and presents response

### 3. Detection Flow (Manual Trigger)

```
User Request → detectFundingFromFeeds → Scan Feeds → Return Candidates
```

**Steps:**
1. User requests manual detection
2. Agent calls `detectFundingFromFeeds` tool
3. Tool scans recent feed items
4. Detection pipeline extracts funding signals
5. Candidates are returned (not yet stored)
6. Agent presents summary of findings

## Component Details

### Agent Tools (`convex/tools/financial/fundingDetectionTools.ts`)

**Purpose**: Bridge between agent system and backend

**Tools:**
- `getTodaysFundingEvents`: Query verified funding events
- `searchFundingEvents`: Search by company/criteria
- `detectFundingFromFeeds`: Trigger manual detection

**Input**: Natural language parameters (via agent)
**Output**: Formatted markdown responses

### Backend Queries (`convex/domains/enrichment/fundingQueries.ts`)

**Purpose**: Data access layer for funding events

**Functions:**
- `getRecentFundingEvents`: Query by time range
- `searchFundingByCompany`: Search by company name
- `getTodaysFundingTargets`: Get today's targets

**Input**: Structured query parameters
**Output**: Database records

### Detection Pipeline (`convex/domains/enrichment/fundingDetection.ts`)

**Purpose**: Extract funding signals from text

**Functions:**
- `detectFundingCandidates`: Scan feed items
- `processFeedItemForFunding`: Process single item
- `extractAmount`: Parse funding amounts
- `extractRoundType`: Classify round type
- `extractInvestors`: Extract investor names

**Input**: Feed item text
**Output**: Funding candidates with confidence scores

## Integration Points

### 1. Coordinator Agent Integration

**File**: `convex/domains/agents/core/coordinatorAgent.ts`

```typescript
// Import tools
import {
  getTodaysFundingEvents,
  searchFundingEvents,
  detectFundingFromFeeds
} from "../../../tools/financial/fundingDetectionTools";

// Register in baseTools
const baseTools = {
  // ... other tools
  getTodaysFundingEvents,
  searchFundingEvents,
  detectFundingFromFeeds,
};
```

### 2. Fast Agent Panel

**File**: `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx`

- User types query in input field
- Agent processes query and selects tools
- Response is streamed back to UI
- Formatted markdown is displayed

## Example Interactions

### Example 1: Today's Events

**User**: "What funding events happened today?"

**Agent Flow**:
1. Analyzes query → detects "today's events" intent
2. Selects `getTodaysFundingEvents` tool
3. Calls with default parameters (24h lookback)
4. Receives structured funding data
5. Formats as markdown list
6. Presents to user

**Response**:
```
# Recent Funding Events (Last 24h)

Found 5 funding events:

## 1. Acme AI
- Round: series-a
- Amount: $15.0M USD
- Lead Investors: Sequoia Capital, a16z
- Sector: artificial-intelligence
- Confidence: 85%
...
```

### Example 2: Company Search

**User**: "Show me funding history for OpenAI"

**Agent Flow**:
1. Analyzes query → detects company name
2. Selects `searchFundingEvents` tool
3. Calls with companyName: "OpenAI"
4. Receives funding history
5. Formats chronologically
6. Presents to user

### Example 3: Manual Detection

**User**: "Scan recent news for funding announcements"

**Agent Flow**:
1. Analyzes query → detects detection request
2. Selects `detectFundingFromFeeds` tool
3. Triggers detection pipeline
4. Receives candidate list
5. Formats with confidence scores
6. Presents to user

## Security & Performance

### Security
- Tools use internal Convex actions/queries
- No direct database access from frontend
- User authentication handled by Convex
- Rate limiting on detection triggers

### Performance
- Database queries use indexes (by_announcedAt)
- Pagination for large result sets
- Caching of recent queries
- Async processing for detection

## Monitoring & Debugging

### Logging
- All tools log to console with `[toolName]` prefix
- Detection pipeline logs confidence scores
- Query layer logs result counts

### Error Handling
- Tools catch and format errors
- Graceful degradation for missing data
- User-friendly error messages

## Future Enhancements

1. **Real-time Alerts**: Push notifications for new funding
2. **Trend Analysis**: Historical funding patterns
3. **Network Analysis**: Investor co-occurrence graphs
4. **Automated Dossiers**: Generate company profiles on detection
5. **Multi-source Verification**: Cross-reference multiple sources
6. **Confidence Boosting**: ML-based confidence scoring

