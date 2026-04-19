# Expanded Evaluation Scenarios Design

## Overview

This document outlines expanded evaluation scenarios for NodeBench AI, covering advanced capabilities beyond the core persona-based intelligence tasks. These scenarios test the agent's ability to interact with various tools and data sources.

## Current State (January 2026)

**Core Scenarios (10)**: Persona-based intelligence tasks
- 90% overall pass rate (63/70 tests)
- Tests: entity extraction, persona inference, structured output compliance
- Tools tested: `lookupGroundTruthEntity`, `linkupSearch`, `linkupFetch`

## Expanded Scenario Categories

### 1. Calendar CRUD Scenarios

**Tools Tested**: `createEvent`, `updateEvent`, `deleteEvent`, `listEvents`

| ID | Name | Query | Expected Behavior | Requirements |
|----|------|-------|-------------------|--------------|
| `cal_create_meeting` | Create recurring meeting | "Schedule a weekly sync with the DISCO team starting next Monday at 10am for 30 minutes" | Create event with recurrence, link to DISCO entity | `requireTools: ["createEvent"]` |
| `cal_update_reschedule` | Reschedule event | "Move my meeting with Mark Manfredi to Thursday at 2pm" | Find existing event, update datetime | `requireTools: ["listEvents", "updateEvent"]` |
| `cal_delete_conflict` | Resolve calendar conflict | "Cancel the overlapping events next Tuesday and keep only the highest priority one" | List events, identify conflicts, delete lower priority | `requireTools: ["listEvents", "deleteEvent"]` |
| `cal_batch_schedule` | Batch event creation | "Create a 3-day due diligence schedule for DISCO with morning calls and afternoon reviews" | Create 6 events with proper structure | `minToolCalls: 6, requireTools: ["createEvent"]` |
| `cal_query_availability` | Check availability | "What's my availability for a 2-hour meeting with investors this week?" | List events, calculate gaps | `requireTools: ["listEvents"]` |

### 2. Spreadsheet CRUD Scenarios

**Tools Tested**: `createSpreadsheet`, `setCell`, `setRange`, `getSpreadsheet`, `insertRow`, `deleteRow`

| ID | Name | Query | Expected Behavior | Requirements |
|----|------|-------|-------------------|--------------|
| `sheet_create_pipeline` | Create deal pipeline | "Create a deal tracker spreadsheet with columns: Company, Stage, Amount, Lead, Last Contact" | Create structured spreadsheet | `requireTools: ["createSpreadsheet", "setRange"]` |
| `sheet_update_batch` | Batch cell updates | "Update the DISCO row: stage to 'Series A', amount to €50M, lead to 'Ackermanns'" | Find and update multiple cells | `requireTools: ["getSpreadsheet", "setCell"]` |
| `sheet_formula_inject` | Add calculations | "Add a total funding column that sums all deal amounts" | Insert formula row | `requireTools: ["setCell"]` |
| `sheet_pivot_summary` | Create summary view | "Generate a summary table showing deals by stage" | Query and aggregate data | `requireTools: ["getSpreadsheet", "createSpreadsheet"]` |
| `sheet_row_management` | Manage rows | "Remove all closed-lost deals and add Ambros to the active pipeline" | Delete and insert rows | `requireTools: ["deleteRow", "insertRow"]` |

### 3. Document CRUD Scenarios

**Tools Tested**: `createDocument`, `updateDocument`, `searchLocalDocuments`, `getDocumentContent`, `analyzeDocument`

| ID | Name | Query | Expected Behavior | Requirements |
|----|------|-------|-------------------|--------------|
| `doc_create_memo` | Create investment memo | "Draft a 1-page investment memo for DISCO based on the ground truth data" | Create formatted document with entity data | `requireTools: ["createDocument"]` |
| `doc_update_append` | Append to document | "Add the latest funding news to the DISCO research document" | Find doc, append content | `requireTools: ["searchLocalDocuments", "updateDocument"]` |
| `doc_search_cross_ref` | Cross-reference search | "Find all documents mentioning both DISCO and RyR2 research" | Semantic search across docs | `requireTools: ["searchLocalDocuments"]` |
| `doc_analyze_compare` | Compare documents | "Compare the DISCO and Ambros investment memos and highlight key differences" | Analyze multiple docs | `requireTools: ["analyzeMultipleDocuments"]` |
| `doc_batch_summarize` | Batch summarization | "Summarize all documents tagged with 'biotech' in 2-3 sentences each" | Search and process multiple docs | `requireTools: ["searchLocalDocuments", "analyzeDocument"]` |

### 4. Web Search & Research Scenarios

**Tools Tested**: `linkupSearch`, `linkupFetch`, `recentNewsSearch`, `youtubeSearch`

| ID | Name | Query | Expected Behavior | Requirements |
|----|------|-------|-------------------|--------------|
| `web_deep_research` | Deep web research | "Find the 3 most recent news articles about DISCO Pharmaceuticals and summarize their funding status" | Search, fetch, synthesize | `minToolCalls: 3, requireTools: ["linkupSearch"]` |
| `web_multi_source` | Multi-source verification | "Verify DISCO's €36M funding from at least 3 independent sources" | Cross-reference multiple sources | `requireProviderUsage: true` |
| `web_youtube_analysis` | Video content analysis | "Find YouTube videos about surfaceome mapping technology and extract key insights" | Search and analyze video content | `requireTools: ["youtubeSearch"]` |
| `web_news_monitor` | News monitoring | "Get all news from the last 7 days mentioning biotech seed funding in Germany" | Time-filtered news search | `requireTools: ["recentNewsSearch"]` |
| `web_fetch_extract` | Structured extraction | "Fetch the DISCO company page and extract leadership team information" | Fetch and parse webpage | `requireTools: ["linkupFetch"]` |

### 5. Media & File Scenarios

**Tools Tested**: `listMediaFiles`, `searchMedia`, `getMediaDetails`, `analyzeMediaFile`

| ID | Name | Query | Expected Behavior | Requirements |
|----|------|-------|-------------------|--------------|
| `media_search_images` | Image search | "Find all images related to DISCO's pipeline or platform" | Search and list media | `requireTools: ["searchMedia"]` |
| `media_analyze_pdf` | PDF analysis | "Analyze the attached DISCO pitch deck and extract key metrics" | Analyze uploaded file | `requireTools: ["analyzeMediaFile"]` |
| `media_batch_process` | Batch media processing | "Summarize all PDFs in the research folder" | List and process multiple files | `requireTools: ["listMediaFiles", "analyzeMediaFile"]` |
| `media_metadata_query` | Metadata query | "List all media files uploaded this week with their sizes and types" | Query media metadata | `requireTools: ["listMediaFiles", "getMediaDetails"]` |
| `media_content_extraction` | Content extraction | "Extract the text from the DISCO investor presentation PDF" | Parse and extract text | `requireTools: ["analyzeMediaFile"]` |

## Implementation Plan

### Phase 1: Test Data Setup
1. Create test calendar events for evaluation user
2. Create test spreadsheets with known data
3. Create test documents with known content
4. Upload test media files (PDFs, images)

### Phase 2: Scenario Implementation
1. Add new scenario definitions to `personaEpisodeEval.ts`
2. Create ground truth expectations for each scenario
3. Implement validation functions for tool-specific checks

### Phase 3: Validation Framework
1. Tool call validation (correct tools used)
2. Data integrity validation (correct data written)
3. Result quality validation (accurate output)

## Proposed Schema Extensions

```typescript
interface ExpandedScenario extends Scenario {
  /** Category for grouping scenarios */
  category: "calendar" | "spreadsheet" | "document" | "web" | "media";

  /** Tools that MUST be called for the scenario to pass */
  requiredTools: string[];

  /** Expected data mutations (for write operations) */
  expectedMutations?: {
    table: string;
    action: "create" | "update" | "delete";
    fieldChecks?: Record<string, any>;
  }[];

  /** Ground truth data to pre-populate for the scenario */
  fixtures?: {
    events?: any[];
    spreadsheets?: any[];
    documents?: any[];
    media?: any[];
  };
}
```

## Success Criteria

| Metric | Target |
|--------|--------|
| Calendar CRUD pass rate | 90%+ |
| Spreadsheet CRUD pass rate | 85%+ |
| Document CRUD pass rate | 90%+ |
| Web search pass rate | 85%+ |
| Media operations pass rate | 80%+ |
| Overall expanded suite | 85%+ |

## Timeline

- **Week 1**: Test data setup + Calendar scenarios
- **Week 2**: Spreadsheet + Document scenarios
- **Week 3**: Web search + Media scenarios
- **Week 4**: Integration testing + refinement

## Notes

- All scenarios should still output `[DEBRIEF_V1_JSON]` block for consistency
- Tool call telemetry is critical for validation
- Consider adding cost tracking per scenario category
