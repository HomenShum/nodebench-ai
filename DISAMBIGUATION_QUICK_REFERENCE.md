# Entity Disambiguation - Quick Reference Guide

## Overview

The entity disambiguation system provides LLM-based validation and Human-in-the-Loop (HITL) confirmation for ambiguous search queries across four domains:

1. **SEC Company Search** - Disambiguate company names for SEC filings
2. **People Profile Search** - Disambiguate common person names
3. **Recent Event Search** - Disambiguate event names with multiple occurrences
4. **Recent News Articles** - Disambiguate news topics with multiple angles

---

## How It Works

### 1. Search Phase
```typescript
// Example: People search
const results = await searchPeople(personName);
// Returns: Array of potential matches
```

### 2. Validation Phase
```typescript
// LLM validates each match with conversation context
const validated = await validatePersonMatches(results, conversationContext);
// Returns: Array with PASS/FAIL for each match
```

### 3. Decision Logic
```typescript
const passedResults = validated.filter(r => r.validationResult === 'PASS');

if (passedResults.length === 0) {
  return "Error: No matches found. Please clarify your query.";
} else if (passedResults.length === 1) {
  // Auto-select and proceed
  return await retrievePersonInfo(passedResults[0]);
} else {
  // Prompt user with selection UI
  return formatSelectionPrompt(passedResults);
}
```

### 4. User Confirmation
```typescript
// User clicks "Select This Person" in UI
await confirmPersonSelection({
  threadId,
  personName,
  id: selectedPerson.id,
  name: selectedPerson.name,
  // ... other metadata
});
```

### 5. Context Persistence
```typescript
// Next query in same thread
const confirmed = await getConfirmedPerson(threadId, personName);
if (confirmed) {
  // Use confirmed person without re-prompting
  return await retrievePersonInfo(confirmed);
}
```

---

## Backend API Reference

### People Profile Search

**Search Function:**
```typescript
searchPeople(personName: string): Promise<PersonMatch[]>
```

**Validation Function:**
```typescript
validatePersonMatches(
  matches: PersonMatch[],
  conversationContext: string
): Promise<PersonMatch[]>
```

**Confirmation Tool:**
```typescript
confirmPersonSelection({
  threadId: string,
  personName: string,
  id: string,
  name: string,
  profession?: string,
  organization?: string,
  location?: string,
})
```

**Check Confirmed:**
```typescript
getConfirmedPerson(
  threadId: string,
  personName: string
): Promise<ConfirmedPerson | null>
```

---

### Recent Event Search

**Search Function:**
```typescript
searchEvents(eventQuery: string): Promise<EventMatch[]>
```

**Validation Function:**
```typescript
validateEventMatches(
  matches: EventMatch[],
  conversationContext: string
): Promise<EventMatch[]>
```

**Confirmation Tool:**
```typescript
confirmEventSelection({
  threadId: string,
  eventQuery: string,
  id: string,
  name: string,
  date?: string,
  location?: string,
  description?: string,
})
```

**Check Confirmed:**
```typescript
getConfirmedEvent(
  threadId: string,
  eventQuery: string
): Promise<ConfirmedEvent | null>
```

---

### Recent News Articles

**Search Function:**
```typescript
searchNews(newsQuery: string): Promise<NewsMatch[]>
```

**Validation Function:**
```typescript
validateNewsMatches(
  matches: NewsMatch[],
  conversationContext: string
): Promise<NewsMatch[]>
```

**Confirmation Tool:**
```typescript
confirmNewsSelection({
  threadId: string,
  newsQuery: string,
  id: string,
  headline: string,
  source?: string,
  date?: string,
  url?: string,
})
```

**Check Confirmed:**
```typescript
getConfirmedNewsTopic(
  threadId: string,
  newsQuery: string
): Promise<ConfirmedNewsTopic | null>
```

---

### SEC Company Search

**Search Function:**
```typescript
searchCompanies(companyName: string): Promise<CompanyMatch[]>
```

**Validation Function:**
```typescript
validateCompanyMatches(
  matches: CompanyMatch[],
  conversationContext: string
): Promise<CompanyMatch[]>
```

**Confirmation Tool:**
```typescript
confirmCompanySelection({
  threadId: string,
  companyName: string,
  cik: string,
  name: string,
  ticker?: string,
})
```

**Check Confirmed:**
```typescript
getConfirmedCompany(
  threadId: string,
  companyName: string
): Promise<ConfirmedCompany | null>
```

---

## Frontend Component Reference

### PeopleSelectionCard

**Props:**
```typescript
interface PeopleSelectionCardProps {
  prompt: string;
  people: PersonOption[];
  onSelect: (person: PersonOption) => void;
}

interface PersonOption {
  id: string;
  name: string;
  profession?: string;
  organization?: string;
  location?: string;
  description: string;
  validationResult: 'PASS' | 'FAIL';
}
```

**Usage:**
```tsx
<PeopleSelectionCard
  prompt="Multiple people found. Please select:"
  people={peopleOptions}
  onSelect={handlePersonSelect}
/>
```

---

### EventSelectionCard

**Props:**
```typescript
interface EventSelectionCardProps {
  prompt: string;
  events: EventOption[];
  onSelect: (event: EventOption) => void;
}

interface EventOption {
  id: string;
  name: string;
  date?: string;
  location?: string;
  description: string;
  source?: string;
  validationResult: 'PASS' | 'FAIL';
}
```

**Usage:**
```tsx
<EventSelectionCard
  prompt="Multiple events found. Please select:"
  events={eventOptions}
  onSelect={handleEventSelect}
/>
```

---

### NewsSelectionCard

**Props:**
```typescript
interface NewsSelectionCardProps {
  prompt: string;
  articles: NewsArticleOption[];
  onSelect: (article: NewsArticleOption) => void;
}

interface NewsArticleOption {
  id: string;
  headline: string;
  source?: string;
  date?: string;
  snippet: string;
  url?: string;
  credibility?: string;
  validationResult: 'PASS' | 'FAIL';
}
```

**Usage:**
```tsx
<NewsSelectionCard
  prompt="Multiple articles found. Please select:"
  articles={newsOptions}
  onSelect={handleNewsSelect}
/>
```

---

### CompanySelectionCard

**Props:**
```typescript
interface CompanySelectionCardProps {
  prompt: string;
  companies: CompanyOption[];
  onSelect: (company: CompanyOption) => void;
}

interface CompanyOption {
  cik: string;
  name: string;
  ticker?: string;
  description: string;
  validationResult: 'PASS' | 'FAIL';
}
```

**Usage:**
```tsx
<CompanySelectionCard
  prompt="Multiple companies found. Please select:"
  companies={companyOptions}
  onSelect={handleCompanySelect}
/>
```

---

## Data Format for Tool Output

### Embedding Selection Data in Tool Output

**Pattern:**
```typescript
const selectionData = {
  prompt: "Multiple people found. Please select:",
  people: validatedPeople.map(p => ({
    id: p.id,
    name: p.name,
    profession: p.profession,
    organization: p.organization,
    location: p.location,
    description: p.description,
    validationResult: p.validationResult,
  })),
};

return `<!-- PEOPLE_SELECTION_DATA
${JSON.stringify(selectionData, null, 2)}
-->

I found multiple people matching "${personName}". Please select the correct person from the options above.`;
```

**Supported Data Markers:**
- `<!-- COMPANY_SELECTION_DATA ... -->` - For SEC company disambiguation
- `<!-- PEOPLE_SELECTION_DATA ... -->` - For people profile disambiguation
- `<!-- EVENT_SELECTION_DATA ... -->` - For event disambiguation
- `<!-- NEWS_SELECTION_DATA ... -->` - For news article disambiguation

---

## Validation Criteria

### People Profile Search
- **Correctness**: Person's identity matches user's intent (profession, organization, location)
- **Contextual Relevance**: Person is relevant to conversation context

### Recent Event Search
- **Usefulness**: Event provides valuable information for user's query
- **Relevancy**: Event timeframe and topic match conversation context

### Recent News Articles
- **Usefulness**: Article provides substantive information vs. clickbait
- **Relevancy**: Article topic and recency match user's information needs

### SEC Company Search
- **Correctness**: Company identity matches user's intent (ticker, industry)
- **Contextual Relevance**: Company is relevant to conversation context

---

## Database Schema

### confirmedPeople
```typescript
{
  threadId: string,
  personName: string,
  confirmedId: string,
  confirmedName: string,
  confirmedProfession?: string,
  confirmedOrganization?: string,
  confirmedLocation?: string,
  createdAt: number,
}
```

### confirmedEvents
```typescript
{
  threadId: string,
  eventQuery: string,
  confirmedId: string,
  confirmedName: string,
  confirmedDate?: string,
  confirmedLocation?: string,
  confirmedDescription?: string,
  createdAt: number,
}
```

### confirmedNewsTopics
```typescript
{
  threadId: string,
  newsQuery: string,
  confirmedId: string,
  confirmedHeadline: string,
  confirmedSource?: string,
  confirmedDate?: string,
  confirmedUrl?: string,
  createdAt: number,
}
```

### confirmedCompanies
```typescript
{
  threadId: string,
  companyName: string,
  confirmedCik: string,
  confirmedName: string,
  confirmedTicker?: string,
  createdAt: number,
}
```

---

## Common Patterns

### Pattern 1: Check Confirmed → Search → Validate → Decide

```typescript
// 1. Check if already confirmed
const confirmed = await getConfirmedPerson(threadId, personName);
if (confirmed) {
  return await retrievePersonInfo(confirmed);
}

// 2. Search for matches
const matches = await searchPeople(personName);

// 3. Validate with LLM
const validated = await validatePersonMatches(matches, conversationContext);

// 4. Decide based on PASS count
const passed = validated.filter(m => m.validationResult === 'PASS');
if (passed.length === 0) {
  return "Error: No matches found.";
} else if (passed.length === 1) {
  return await retrievePersonInfo(passed[0]);
} else {
  return formatSelectionPrompt(passed);
}
```

### Pattern 2: User Confirmation → Store → Resume

```typescript
// User selects option in UI
const handlePersonSelect = async (person: PersonOption) => {
  // Send confirmation message to agent
  await sendMessage(`I confirm: ${person.name}`);
  
  // Agent receives confirmation and stores it
  await confirmPersonSelection({
    threadId,
    personName,
    id: person.id,
    name: person.name,
    profession: person.profession,
    organization: person.organization,
    location: person.location,
  });
  
  // Agent resumes with confirmed person
  return await retrievePersonInfo(person);
};
```

---

## Testing Checklist

- [ ] Search returns multiple matches for ambiguous queries
- [ ] LLM validation correctly identifies PASS/FAIL based on context
- [ ] Auto-selection works when only 1 option PASSES
- [ ] Error message shown when 0 options PASS
- [ ] Selection UI renders correctly for 2+ PASS options
- [ ] User can click "Select" button to confirm choice
- [ ] Confirmation is stored in database with correct threadId
- [ ] Subsequent queries in same thread use confirmed selection
- [ ] Visual design matches existing patterns
- [ ] Conversation context is included in validation prompts

---

## Production Checklist

- [ ] Replace mock data with real API integrations
- [ ] Add error handling for API failures
- [ ] Implement rate limiting for LLM validation calls
- [ ] Add caching for frequently searched entities
- [ ] Monitor LLM validation accuracy
- [ ] Optimize database queries for confirmed selections
- [ ] Add analytics for disambiguation success rates
- [ ] Test with real user queries
- [ ] Gather feedback on selection UX
- [ ] Refine validation prompts based on results

---

## Color Schemes

- **People:** Purple (`#8b5cf6`) - User icon
- **Events:** Orange (`#f59e0b`) - Calendar icon
- **News:** Cyan (`#06b6d4`) - Newspaper icon
- **Companies:** Green (`#4caf50`) - Building icon

---

## File Locations

**Backend:**
- `convex/schema.ts` - Database tables
- `convex/tools/peopleProfileSearch.ts` - People search and validation
- `convex/tools/recentEventSearch.ts` - Event search and validation
- `convex/tools/recentNewsSearch.ts` - News search and validation
- `convex/tools/secCompanySearch.ts` - Company search and validation
- `convex/tools/confirmPersonSelection.ts` - Person confirmation tool
- `convex/tools/confirmEventSelection.ts` - Event confirmation tool
- `convex/tools/confirmNewsSelection.ts` - News confirmation tool
- `convex/tools/confirmCompanySelection.ts` - Company confirmation tool

**Frontend:**
- `src/components/FastAgentPanel/PeopleSelectionCard.tsx` - People selection UI
- `src/components/FastAgentPanel/EventSelectionCard.tsx` - Event selection UI
- `src/components/FastAgentPanel/NewsSelectionCard.tsx` - News selection UI
- `src/components/FastAgentPanel/CompanySelectionCard.tsx` - Company selection UI
- `src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx` - Message rendering
- `src/components/FastAgentPanel/FastAgentPanel.UIMessageStream.tsx` - Message stream
- `src/components/FastAgentPanel/FastAgentPanel.tsx` - Main panel component

---

## Support

For questions or issues, refer to:
- `EXTENDED_DISAMBIGUATION_COMPLETE.md` - Full implementation details
- `SEC_ENTITY_DISAMBIGUATION_COMPLETE.md` - SEC-specific documentation
- Architecture diagram in this repository

