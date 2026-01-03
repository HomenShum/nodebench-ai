# Funding Detection Agent Integration

## Overview

This document describes the integration of the funding detection pipeline with the Deep Agent system, enabling users to query funding information through natural language in the Fast Agent Panel.

## What Was Built

### 1. New Agent Tools (`convex/tools/financial/fundingDetectionTools.ts`)

Three new tools were created to expose the funding detection pipeline to the agent:

#### `getTodaysFundingEvents`
- **Purpose**: Get funding events detected from news feeds
- **Returns**: Structured funding data with company names, amounts, investors, confidence scores
- **Use Cases**: 
  - "What funding events happened today?"
  - "Show me recent funding announcements"
  - "What companies raised money today?"

#### `searchFundingEvents`
- **Purpose**: Search funding events by company name or criteria
- **Returns**: Detailed funding information with sources
- **Use Cases**:
  - "Show me funding history for [company]"
  - "What seed rounds happened this week?"
  - "Find all Series A rounds in healthcare"

#### `detectFundingFromFeeds`
- **Purpose**: Trigger manual funding detection scan
- **Returns**: Summary of detected funding candidates
- **Use Cases**:
  - "Scan recent news for funding announcements"
  - "Check for new funding events"
  - "Refresh funding data"

### 2. Agent Integration

The tools were integrated into the **Coordinator Agent** (`convex/domains/agents/core/coordinatorAgent.ts`):

```typescript
// Added imports
import {
  getTodaysFundingEvents,
  searchFundingEvents,
  detectFundingFromFeeds
} from "../../../tools/financial/fundingDetectionTools";

// Added to baseTools registry
const baseTools = {
  // ... existing tools
  
  // Funding detection tools (from internal pipeline)
  getTodaysFundingEvents,
  searchFundingEvents,
  detectFundingFromFeeds,
};
```

### 3. Testing

Created comprehensive integration tests (`tests/funding-detection-agent.spec.ts`):

- ✅ Agent can query today's funding events
- ✅ Agent can search for specific company funding
- ✅ Agent can trigger funding detection
- ✅ Funding tools are available in agent capabilities

### 4. Documentation

Created comprehensive documentation (`convex/tools/financial/README.md`):

- Tool descriptions and use cases
- Integration with agent system
- Data flow diagrams
- Backend integration details
- Database schema
- Future enhancements

## How It Works

### User Query Flow

```
User: "What funding events happened today?"
  ↓
Fast Agent Panel
  ↓
Coordinator Agent (analyzes query)
  ↓
Selects: getTodaysFundingEvents tool
  ↓
Queries: convex/domains/enrichment/fundingQueries.ts
  ↓
Returns: Structured funding data from database
  ↓
Agent formats response
  ↓
User sees: Formatted list of funding events
```

### Data Pipeline

```
RSS Feeds → Feed Items → Funding Detection
                              ↓
                    Funding Events Database
                              ↓
                    Agent Tools (Query Layer)
                              ↓
                    User via Fast Agent Panel
```

## Example Queries

Users can now ask:

1. **Today's Events**
   - "What funding events happened today?"
   - "Show me today's seed rounds"
   - "Any new funding announcements?"

2. **Company-Specific**
   - "Show me funding history for OpenAI"
   - "Who invested in Anthropic?"
   - "What was the last round for [company]?"

3. **Filtered Searches**
   - "Show me all Series A rounds this week"
   - "What healthcare companies raised money?"
   - "Find seed rounds over $5M"

4. **Manual Detection**
   - "Scan recent news for funding announcements"
   - "Check for new funding events"
   - "Refresh funding data"

## Technical Details

### Backend Components

1. **Detection Pipeline** (`convex/domains/enrichment/fundingDetection.ts`)
   - Pattern matching for funding announcements
   - Amount extraction and USD conversion
   - Round type classification
   - Investor extraction
   - Confidence scoring

2. **Database Operations** (`convex/domains/enrichment/fundingMutations.ts`)
   - Create/update funding events
   - Merge duplicate events
   - Verification status tracking

3. **Query Layer** (`convex/domains/enrichment/fundingQueries.ts`)
   - Query recent funding events
   - Search by company name
   - Filter by round type, confidence, date range

### Agent Tools Layer

The new tools act as a bridge between the agent system and the backend:

- **Input**: Natural language queries from users
- **Processing**: Structured queries to backend
- **Output**: Formatted responses for agent to present

## Benefits

1. **Natural Language Access**: Users can query funding data conversationally
2. **Automatic Tool Selection**: Agent chooses the right tool based on query
3. **Structured Responses**: Consistent formatting of funding information
4. **Real-time Data**: Access to latest detected funding events
5. **Flexible Queries**: Support for various query types and filters

## Future Enhancements

- [ ] Real-time funding alerts
- [ ] Investor network analysis
- [ ] Funding trend analytics
- [ ] Company valuation tracking
- [ ] Integration with CRM systems
- [ ] Automated dossier generation for new funding events
- [ ] Multi-source verification and confidence boosting
- [ ] Historical funding trend analysis
- [ ] Competitive funding landscape reports

## Files Modified

1. ✅ `convex/tools/financial/fundingDetectionTools.ts` (NEW)
2. ✅ `convex/domains/agents/core/coordinatorAgent.ts` (MODIFIED)
3. ✅ `tests/funding-detection-agent.spec.ts` (NEW)
4. ✅ `convex/tools/financial/README.md` (NEW)
5. ✅ `FUNDING_DETECTION_INTEGRATION.md` (NEW - this file)

## Verification

- ✅ TypeScript compilation passes
- ✅ No linting errors
- ✅ Tools properly imported and registered
- ✅ Integration tests created
- ✅ Documentation complete

## Next Steps

To use the new functionality:

1. **Start the development server**: `npm run dev`
2. **Open Fast Agent Panel**: Click the Fast Agent button
3. **Ask a funding question**: e.g., "What funding events happened today?"
4. **Agent will automatically use the appropriate tool**

The agent now has full access to the funding detection pipeline and can answer funding-related queries naturally!

