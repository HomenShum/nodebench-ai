# Best-Effort Execution Guide - Fast Agent Panel

## Problem Statement

When users submit multi-entity research queries like "Help me compile information on Ditto.ai, Eric Liu the founder, and the company's fundraising round and news, any videos or images, job career and positions", the orchestrator and specialized agents should provide a **best-effort answer first** based on the most likely interpretation, rather than leading with clarification questions.

### Incorrect Behavior (Before)
The agent immediately asks 4 clarification questions before attempting any research:
1. Which Ditto.ai do you mean?
2. Is Eric Liu definitely the founder?
3. What output format do you want?
4. Any special focus?

This creates friction and delays the user from getting value.

### Correct Behavior (After)
The orchestrator executes a best-effort search immediately using the most likely interpretation, presents findings first, and includes clarifications at the end (if needed).

---

## Implementation

### 1. **Coordinator Agent** (`convex/agents/specializedAgents.ts`)

The Coordinator Agent already has instructions to "NEVER ask clarifying questions - delegate immediately". No changes needed.

**Key Instructions:**
```typescript
CRITICAL: DO NOT ask clarifying questions. DO NOT try to answer directly. 
IMMEDIATELY call the appropriate delegation tool(s).

IMMEDIATE DELEGATION RULES:
1. Analyze the user's request
2. IMMEDIATELY call the appropriate delegation tool(s) - NO QUESTIONS
3. You can call MULTIPLE delegation tools in parallel if needed
4. Pass the user's EXACT query to the delegation tool
5. Return the results from the specialized agent(s)
```

### 2. **Web Agent** (Updated)

**File**: `convex/agents/specializedAgents.ts` (lines 174-243)

**Key Changes:**
- Added "BEST-EFFORT EXECUTION" section to instructions
- Increased `stopWhen` from 3 to 8 steps to allow multiple searches for comprehensive queries
- Added entity resolution guidelines
- Added multi-entity research query handling

**Best-Effort Entity Resolution:**
```typescript
- For company names: Use the most prominent/well-known entity with that exact name or domain
  Example: "Ditto.ai" → search for "Ditto.ai company" (the company at ditto.ai domain)
  
- For person names with context: Include all context clues in the search
  Example: "Eric Liu founder Ditto.ai" → search for "Eric Liu founder Ditto.ai LinkedIn"
  
- For multi-entity queries: Break into multiple searches and execute in parallel
  Example: "Ditto.ai, Eric Liu, fundraising, news" → 
    1. Search "Ditto.ai company information"
    2. Search "Eric Liu Ditto.ai founder LinkedIn"
    3. Search "Ditto.ai fundraising funding rounds"
    4. Search "Ditto.ai recent news"
```

**Multi-Entity Research Queries:**
```typescript
When user asks for comprehensive information about a company/person/product:
1. Execute multiple searches immediately (company info, founder, funding, news, media)
2. Use linkupSearch with includeImages: true to get visual content
3. Structure the response with clear sections:
   - Company/Entity Overview
   - Key People (founders, executives)
   - Funding/Financials (if applicable)
   - Recent News & Updates
   - Media Assets (images, videos)
   - Additional Resources (careers, social media)
4. Present ALL findings first, then include clarifications at the end
```

### 3. **Media Agent** (Updated)

**File**: `convex/agents/specializedAgents.ts` (lines 66-114)

**Key Changes:**
- Added "BEST-EFFORT EXECUTION" section to instructions
- Added entity resolution guidelines
- Clarifications moved to the END of responses

**Best-Effort Entity Resolution:**
```typescript
- For company/product names: Use the most prominent/well-known entity
  Example: "Ditto.ai" → search for the company at ditto.ai domain
  
- For person names: Include context clues from the query
  Example: "Eric Liu founder Ditto.ai" → search for "Eric Liu Ditto.ai founder"
  
- For ambiguous terms: Use the most common interpretation and note alternatives at the end
- ALWAYS execute the search first, clarify later if needed
```

### 4. **SEC Agent** (Updated)

**File**: `convex/agents/specializedAgents.ts` (lines 116-180)

**Key Changes:**
- Added "BEST-EFFORT EXECUTION" section to instructions
- Updated company disambiguation workflow to use progressive disclosure
- Clarifications moved to the END of responses

**Best-Effort Company Resolution:**
```typescript
- For well-known companies: Use the most prominent public company with that name
  Example: "Apple" → Apple Inc. (AAPL, CIK: 0000320193)
  
- For ambiguous names: Use context clues from the query
  Example: "Ditto.ai 10-K" → Search for "Ditto" or "Ditto Inc" in SEC database
  
- If multiple matches: Present the most likely match first, list alternatives at the end
- ALWAYS execute the search first, present findings, then clarify if needed
```

**Progressive Disclosure Workflow:**
```typescript
1. User asks: "Get Dasher's 10-K"
2. Call searchSecFilings with companyName="Dasher" and threadId
3. If multiple companies match:
   a. Select the MOST LIKELY match based on market cap, filing activity, name similarity
   b. Present findings for that company FIRST
   c. Include a note at the END: "Note: I found [Company Name] (CIK: XXX). 
      If you meant a different company, here are other matches: [list]"
4. User gets immediate value from the best-effort match
5. If user clarifies they meant a different company, call confirmCompanySelection and search again
```

### 5. **Document Agent** (Updated)

**File**: `convex/agents/specializedAgents.ts` (lines 26-76)

**Key Changes:**
- Added "BEST-EFFORT EXECUTION" section to instructions
- Added document resolution guidelines
- Clarifications moved to the END of responses

**Best-Effort Document Resolution:**
```typescript
- For partial titles: Search for the most likely match based on keywords
  Example: "revenue report" → search for documents containing "revenue" and "report"
  
- For ambiguous titles: Use the most recently modified document
- If multiple matches: Present the most relevant match first, list alternatives at the end
- ALWAYS execute the search first, present findings, then clarify if needed
```

---

## Response Structure

### Before (Incorrect)
```
User: "Help me compile information on Ditto.ai, Eric Liu the founder, and the company's fundraising round and news, any videos or images, job career and positions"

Agent: "I have a few questions before I can help:
1. Which Ditto.ai do you mean? There might be multiple companies with similar names.
2. Is Eric Liu definitely the founder? Can you confirm?
3. What format would you like the information in?
4. Any specific focus areas?"
```

### After (Correct)
```
User: "Help me compile information on Ditto.ai, Eric Liu the founder, and the company's fundraising round and news, any videos or images, job career and positions"

Agent: [Executes 5 searches in parallel]
1. linkupSearch("Ditto.ai company information")
2. linkupSearch("Eric Liu Ditto.ai founder LinkedIn")
3. linkupSearch("Ditto.ai fundraising funding rounds")
4. linkupSearch("Ditto.ai recent news")
5. linkupSearch("Ditto.ai careers jobs", includeImages: true)

[Presents findings]

## Company Overview: Ditto.ai
- **Name**: Ditto
- **Domain**: ditto.ai
- **Founded**: 2018
- **Headquarters**: San Francisco, CA
- **Product**: Edge sync platform for offline-first applications

## Founder Profile: Eric Liu
- **Role**: Co-founder & CEO
- **LinkedIn**: linkedin.com/in/ericliu-ditto
- **Background**: Previously at Google, Stanford CS grad

## Fundraising Details
- **Series A**: $6.5M (2020) - Led by Gradient Ventures
- **Seed Round**: $2M (2019) - Y Combinator, others
- **Total Raised**: $8.5M
- **Sources**: Crunchbase, TechCrunch

## Recent News
1. "Ditto Raises $6.5M Series A" - TechCrunch (2020-03-15)
2. "Edge Computing Startup Ditto Launches" - VentureBeat (2019-06-10)

## Media Assets
[Image carousel with 8 company photos, product screenshots]
[Video carousel with 2 YouTube videos about Ditto]

## Job Openings
- Senior Backend Engineer - San Francisco
- Product Manager - Remote
- [Link to careers page: ditto.ai/careers]

---

**Note**: I found Ditto (ditto.ai), an edge sync platform company founded by Eric Liu. 
If you meant a different company or person, please provide more details and I'll search again.
```

---

## Benefits

✅ **Immediate Value**: Users get actionable information in the first response  
✅ **No Friction**: No clarification questions blocking progress  
✅ **Comprehensive Results**: All requested information presented together  
✅ **Rich Media Display**: Images and videos displayed prominently in carousels  
✅ **Entity Relationships**: Founder → company → funding → news → media → jobs clearly mapped  
✅ **Progressive Disclosure**: Clarifications come AFTER findings, not before  
✅ **Confidence-Based**: If confidence >70%, proceed; if <70%, include brief note  
✅ **Sources Cited**: All factual claims backed by sources  

---

## Testing

### Test Query 1: Multi-Entity Research
```
"Help me compile information on Ditto.ai, Eric Liu the founder, and the company's fundraising round and news, any videos or images, job career and positions"
```

**Expected Behavior:**
1. ✅ Agent executes 4-5 searches immediately (no clarification questions)
2. ✅ Presents company overview, founder profile, funding details, news, media, jobs
3. ✅ Images displayed in carousel (no clicks required)
4. ✅ Videos displayed in carousel (no clicks required)
5. ✅ Sources cited for all information
6. ✅ Clarification note at the END (if needed)

### Test Query 2: Ambiguous Company Name
```
"Get Apple's latest 10-K filing"
```

**Expected Behavior:**
1. ✅ Agent searches for "Apple Inc" (most prominent company)
2. ✅ Presents 10-K filing for Apple Inc. (AAPL, CIK: 0000320193)
3. ✅ No clarification questions before presenting results
4. ✅ Note at END: "I found Apple Inc. (AAPL). If you meant a different company, please clarify."

### Test Query 3: Image Search
```
"Find me images on ditto"
```

**Expected Behavior:**
1. ✅ Agent executes linkupSearch("ditto", includeImages: true) immediately
2. ✅ Images displayed in carousel (no clicks required)
3. ✅ No clarification questions before presenting results
4. ✅ Note at END: "I searched for 'ditto'. If you meant something specific, please clarify."

---

## Success Criteria

- ✅ User receives actionable information within the first response
- ✅ Clarification questions (if any) come AFTER initial findings, not before
- ✅ All media (videos, images) are displayed prominently in carousels/galleries without requiring clicks
- ✅ Entity relationships are clearly mapped and presented
- ✅ Sources are cited for all factual claims
- ✅ Confidence-based execution: >70% confidence → proceed, <70% → include brief note
- ✅ Progressive disclosure: findings first, clarifications last

---

## Related Files

- `convex/agents/specializedAgents.ts` - All specialized agent definitions
- `convex/tools/linkupSearch.ts` - Web search tool
- `convex/tools/youtubeSearch.ts` - YouTube search tool
- `convex/tools/secFilingTools.ts` - SEC filing tools
- `src/components/FastAgentPanel/RichMediaSection.tsx` - Media display component
- `IMAGE_DISPLAY_ENHANCEMENT.md` - Image carousel implementation guide

