# Architecture Overview: Multi-Agent Orchestration

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Fast Agent Panel (UI)                        │
│  - Displays agent progress in real-time                         │
│  - Shows tool calls, reasoning, results                         │
│  - Renders rich media (videos, documents, etc.)                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              CoordinatorAgent (Delegation)                      │
│  - Routes requests to specialized agents                        │
│  - Handles multi-agent orchestration                            │
│  - Manages parallel execution                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Document     │  │ Media        │  │ Entity       │
│ Agent        │  │ Agent        │  │ Research     │
│              │  │              │  │ Agent        │
└──────────────┘  └──────────────┘  └──────┬───────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
            ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
            │ Research     │      │ Criteria     │      │ Export       │
            │ Company      │      │ Search       │      │ to CSV       │
            │ Tool         │      │ Tool         │      │ Tool         │
            └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
                   │                     │                     │
                   └─────────────────────┼─────────────────────┘
                                         ▼
                    ┌────────────────────────────────────┐
                    │  LinkUp API Integration            │
                    │  - Company profiles                │
                    │  - Person profiles                 │
                    │  - Structured search               │
                    └────────────────────┬───────────────┘
                                         ▼
                    ┌────────────────────────────────────┐
                    │  CRM Field Extraction              │
                    │  - 30 fields extracted             │
                    │  - Completeness scoring            │
                    │  - Data quality badges             │
                    └────────────────────┬───────────────┘
                                         ▼
                    ┌────────────────────────────────────┐
                    │  Entity Contexts Cache             │
                    │  - 7-day TTL                       │
                    │  - Access tracking                 │
                    │  - Version control                 │
                    └────────────────────────────────────┘
```

---

## Data Flow: Query Pattern 1 (Criteria-Based Search)

```
User Query
    │
    ▼
"Find companies: $2M+ seed, healthcare, founded 2022+, experienced founders"
    │
    ▼
CoordinatorAgent
    │
    ▼
EntityResearchAgent.searchCompaniesByCriteria()
    │
    ├─ Parse Criteria
    │  ├─ minFunding: "$2M" → 2,000,000
    │  ├─ industry: "healthcare"
    │  ├─ minFoundingYear: 2022
    │  └─ requireFounderExperience: true
    │
    ├─ Build Search Query
    │  └─ "healthcare companies founded after 2022 funded $2M or more"
    │
    ├─ LinkUp API Search (Deep)
    │  └─ Returns: Array of company profiles
    │
    ├─ Filter Results
    │  ├─ Check funding amount
    │  ├─ Verify industry
    │  ├─ Validate founding year
    │  └─ Confirm founder experience
    │
    ├─ Extract CRM Fields (for each result)
    │  ├─ Basic info (name, description, headline)
    │  ├─ Location (HQ, city, state, country)
    │  ├─ Contact (website, email, phone)
    │  ├─ People (founders, key people)
    │  ├─ Business (industry, type, product, model)
    │  ├─ Funding (stage, total, investors)
    │  ├─ Competitive (competitors, analysis)
    │  ├─ Regulatory (FDA status, timeline)
    │  └─ Calculate completeness score
    │
    ├─ Cache Results
    │  └─ Store in entityContexts (7-day TTL)
    │
    └─ Return Results
       └─ 5-10 companies with full CRM data
```

---

## Data Flow: Query Pattern 2 (Named Company List + CRM)

```
User Query
    │
    ▼
"Research: Stripe, Shopify, Square, Plaid, Brex"
    │
    ▼
CoordinatorAgent
    │
    ▼
EntityResearchAgent.bulkResearch() or researchCompany()
    │
    ├─ For each company (parallel):
    │  │
    │  ├─ Check Cache
    │  │  ├─ If cached & fresh → Return cached data
    │  │  └─ If stale/missing → Proceed to API call
    │  │
    │  ├─ LinkUp API Call
    │  │  └─ Returns: Comprehensive company profile
    │  │
    │  ├─ Self-Evaluation
    │  │  ├─ Calculate completeness score
    │  │  ├─ Check critical fields
    │  │  └─ If < 60% complete → Retry with enhanced query
    │  │
    │  ├─ Extract CRM Fields
    │  │  └─ All 30 fields extracted
    │  │
    │  └─ Cache Result
    │     └─ Store with 7-day TTL
    │
    └─ Return Results
       └─ 5 companies with 30 CRM fields each
```

---

## Tool Definitions

### Tool 1: searchCompaniesByCriteria

**Input**:
```typescript
{
  minFunding?: string;           // "$2M"
  maxFunding?: string;           // "$100M"
  industry?: string;             // "healthcare"
  minFoundingYear?: number;      // 2022
  maxFoundingYear?: number;      // 2024
  requireFounderExperience?: boolean;
  maxResults?: number;           // default: 10
}
```

**Output**:
```
**Criteria Search Results** (N companies found)

✅ **Company Name**
- Industry: healthcare
- Founded: 2023
- Funding: $5.2M
- Founders: Name1, Name2
- Location: City, State
- Product: Description

✅ All companies cached for instant follow-up questions!
```

### Tool 2: researchCompany

**Input**:
```typescript
{
  companyName: string;
  forceRefresh?: boolean;
}
```

**Output**:
```
[FRESH RESEARCH] [✅ VERIFIED - 92% complete]

**Company Name**

Summary text...

**Key Facts:**
1. Fact 1
2. Fact 2
...

**Business Model:**
Description...

**Competitive Landscape:**
Competitors...

**Sources:**
1. Source 1
2. Source 2
```

### Tool 3: exportToCSV

**Input**:
```typescript
{
  companyNames: string[];
  format?: 'csv' | 'json';
}
```

**Output**:
```
**Export Complete**

✅ Exported: 5 companies
⚠️ Not found: 0

# Research Summary Report

## Overview
- Total Companies: 5
- Average Completeness: 92%

## Data Quality
- ✅ Verified: 4 (80%)
- ⚠️ Partial: 1 (20%)
- ❌ Incomplete: 0 (0%)

**Export Data (csv):**
```
Company Name,Description,Headline,...
Stripe,Payment processing,...
...
```

---

## Caching Strategy

### Cache Key
```
entityContexts table
├─ entityName: "Stripe"
├─ entityType: "company"
└─ researchedAt: timestamp
```

### TTL: 7 days
- Automatic staleness detection
- Access count tracking
- Version control for invalidation

### Cache Hit Scenarios
1. **Instant Follow-up**: "Tell me more about Stripe"
2. **Comparison**: "Compare Stripe and Square"
3. **Export**: "Export to CSV"
4. **Filtering**: "Show me healthcare companies"

---

## Performance Optimization

### Parallel Processing
- Batch 5 companies at a time
- 5x speedup vs sequential
- Efficient resource utilization

### Intelligent Caching
- 7-day TTL reduces API calls
- Access tracking for analytics
- Version control for updates

### Self-Evaluation & Auto-Retry
- Completeness scoring (0-100%)
- Auto-retry if < 60% complete
- Enhanced query on retry
- Max 2 attempts per company

---

## Error Handling

### Graceful Degradation
- Missing fields → Partial data quality badge
- API errors → Retry with enhanced query
- Cache misses → Fresh API call
- Export errors → Fallback to JSON

### Quality Assurance
- Completeness scoring
- Data quality badges
- Critical field validation
- Source attribution

---

## Integration Points

### Fast Agent Panel
- Real-time progress display
- Tool call visualization
- Result rendering
- Rich media support

### Convex Backend
- Action-based tools
- Query/mutation integration
- Cache management
- Error handling

### LinkUp API
- Structured search
- Company profiles
- Person profiles
- Deep search capability

---

## Summary

Complete multi-agent orchestration system supporting:
- ✅ Criteria-based search
- ✅ Named company research
- ✅ 30 CRM fields
- ✅ CSV/JSON export
- ✅ Parallel processing
- ✅ Intelligent caching
- ✅ Self-evaluation & retry
- ✅ Full Fast Agent Panel integration

