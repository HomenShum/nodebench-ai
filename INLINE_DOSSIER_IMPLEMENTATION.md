# Inline Dossier Display Implementation

## Overview

This document describes the implementation of the **inline dossier newspaper display** feature for WelcomeLanding, allowing investors and other users to query for today's funding announcements and see results displayed inline without navigation.

## User Story

> "As an investor, I want to input a query like 'Summarize today's seed and Series A funding in healthcare, life sciences, and tech. Include sources.' on WelcomeLanding and see the results displayed inline in a newspaper-style dossier format on the same page."

## Architecture

### Components Created

#### 1. `convex/tools/fundingResearchTools.ts`
**Purpose**: Specialized tools for researching funding announcements

**Tools**:
- `searchTodaysFunding` - Search for today's funding announcements
  - **Args**: `industries`, `fundingStages`, `includeDate`
  - **Returns**: Formatted markdown with funding data
  - **API**: LinkUp API with structured output schema
  - **Features**:
    - Date filtering (defaults to today)
    - Industry filtering (healthcare, life sciences, tech)
    - Stage filtering (seed, Series A, Series B)
    - Structured output with company details, investors, amounts, sources
    - Groups results by funding stage
    - Includes sources section with links

- `getFundedCompanyProfile` - Deep-dive research on specific companies
  - **Args**: `companyName`
  - **Returns**: Comprehensive company profile
  - **Features**:
    - Company overview and business model
    - Full funding history
    - Investor details
    - Product/service information

#### 2. `src/components/views/InlineDossierDisplay.tsx`
**Purpose**: Newspaper-style display component for research results

**Features**:
- **Newspaper Header**:
  - Current date with calendar icon
  - "Today's Funding Digest" headline
  - Subtitle describing content
  
- **Markdown Rendering**:
  - ReactMarkdown with custom component overrides
  - Custom styling for headings, paragraphs, lists, links
  - External link icons
  - Proper typography hierarchy
  
- **Loading State**:
  - Skeleton loader with pulse animation
  - Shows 3 placeholder cards
  
- **Animations**:
  - Smooth fadeIn on mount (0.6s ease-out)
  - Uses existing CSS animations from `src/index.css`

**Props**:
```typescript
interface InlineDossierDisplayProps {
  content: string;        // Markdown content from agent
  isLoading?: boolean;    // Show loading skeleton
}
```

#### 3. `src/components/views/WelcomeLanding.tsx` (Updated)
**Purpose**: Landing page with inline agent execution and results display

**Changes**:
- **Removed**: `MiniNoteAgentChat` component
- **Added**: Inline agent execution with streaming
- **Added**: Two-mode UI (Input Mode / Results Mode)

**State Management**:
```typescript
const [inputValue, setInputValue] = useState("");
const [isResearching, setIsResearching] = useState(false);
const [agentThreadId, setAgentThreadId] = useState<string | null>(null);
const [streamThreadId, setStreamThreadId] = useState<Id<"chatThreadsStream"> | null>(null);
```

**Agent Integration**:
- Uses `@convex-dev/agent/react` `useUIMessages` hook
- Creates streaming thread via `api.fastAgentPanelStreaming.createThread`
- Sends messages via `api.fastAgentPanelStreaming.initiateAsyncStreaming`
- Uses coordinator agent for intelligent delegation
- Extracts text content from streaming messages

**UI Modes**:

1. **Input Mode** (default):
   - Large textarea with placeholder
   - Quick-action buttons for common queries (Investors, Bankers, etc.)
   - Submit button with loading spinner
   - Example prompts section
   
2. **Results Mode** (after research completes):
   - `InlineDossierDisplay` component showing results
   - Action bar with:
     - "New Search" button - resets state
     - "Save as Dossier" button - creates document
     - "Email Digest" button - sends newsletter (placeholder)

**Action Handlers**:
```typescript
handleSubmit(query: string)      // Submit query to agent
handleSaveAsDossier()            // Save results as dossier document
handleEmailDigest()              // Send email digest (placeholder)
```

#### 4. `convex/agents/specializedAgents.ts` (Updated)
**Purpose**: Agent configuration with funding research capabilities

**Changes**:
- **Added imports**: `searchTodaysFunding`, `getFundedCompanyProfile`
- **Updated Web Agent**:
  - Added funding tools to tools object
  - Updated instructions to handle funding queries
  - Added "FUNDING RESEARCH QUERIES" section
- **Updated Coordinator Agent**:
  - Added routing logic for funding queries
  - Added example delegations for funding announcements

## User Flow

```
1. User lands on WelcomeLanding
   ↓
2. Sees input box with placeholder and quick-action buttons
   ↓
3. Types query or clicks "Investors" button
   ↓
4. Submits query → handleSubmit()
   ↓
5. Agent execution starts:
   - Creates streaming thread
   - Sends message with useCoordinator: true
   - Coordinator delegates to Web Agent
   - Web Agent uses searchTodaysFunding tool
   ↓
6. Loading state shows "Researching across multiple sources..."
   ↓
7. Results stream in via useUIMessages hook
   ↓
8. UI switches to Results Mode
   ↓
9. InlineDossierDisplay renders newspaper layout:
   - Date header
   - Headline summary
   - Funding rounds by stage
   - Company details with investors
   - Sources with clickable links
   ↓
10. User can:
    - Start new search
    - Save as dossier document
    - Email digest (placeholder)
```

## Technical Details

### Agent Delegation Flow

```
User Query
  ↓
Coordinator Agent (gpt-5)
  ↓
delegateToWebAgent
  ↓
Web Agent (gpt-5-mini)
  ↓
searchTodaysFunding tool
  ↓
LinkUp API (structured search)
  ↓
Formatted Markdown Response
  ↓
Streaming to UI
  ↓
InlineDossierDisplay
```

### LinkUp API Integration

**Endpoint**: `https://api.linkup.so/v1/search`

**Request**:
```json
{
  "q": "funding announcement 2025-01-13 (healthcare OR life sciences OR tech) (seed OR series a)",
  "depth": "deep",
  "outputType": "structured",
  "structuredOutputSchema": {
    "type": "object",
    "properties": {
      "announcements": {
        "type": "array",
        "items": {
          "companyName": { "type": "string" },
          "fundingStage": { "type": "string" },
          "amountRaised": { "type": "string" },
          "leadInvestors": { "type": "array" },
          "industry": { "type": "string" },
          "newsUrl": { "type": "string" },
          ...
        }
      },
      "summary": { "type": "string" },
      "totalAnnouncements": { "type": "number" }
    }
  }
}
```

**Response Processing**:
- Groups announcements by funding stage
- Formats as markdown with sections
- Includes sources with links
- Returns formatted string for AI consumption

### Streaming Architecture

**Thread Creation**:
```typescript
const threadId = await createStreamingThread({
  title: query.slice(0, 50),
  model: "gpt-5-chat-latest",
});
```

**Message Sending**:
```typescript
await sendStreamingMessage({
  threadId: threadId,
  prompt: query,
  model: "gpt-5-chat-latest",
  useCoordinator: true,
});
```

**Message Consumption**:
```typescript
const { results: uiMessages } = useUIMessages(
  api.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
  agentThreadId ? { threadId: agentThreadId } : "skip",
  { initialNumItems: 100, stream: true }
);

const responseContent = uiMessages
  .filter(msg => msg.role === 'assistant')
  .flatMap(msg => msg.content.filter(part => part.type === 'text'))
  .map(part => part.text)
  .join('\n');
```

## Testing

### Manual Testing Steps

1. **Navigate to WelcomeLanding**
2. **Click "Investors" quick-action button** or type query
3. **Verify loading state** shows spinner and message
4. **Wait for results** to stream in
5. **Verify newspaper layout**:
   - Date header present
   - Headline and subtitle
   - Funding rounds grouped by stage
   - Company details formatted correctly
   - Sources have clickable links
6. **Test "New Search"** button - should reset to input mode
7. **Test "Save as Dossier"** - should create document and show toast
8. **Test "Email Digest"** - should show "coming soon" toast

### Example Queries

- "Summarize today's seed and Series A funding in healthcare, life sciences, and tech. Include sources."
- "Show me recent funding announcements in biotech"
- "What companies raised Series A funding today?"
- "List today's seed rounds in healthcare with investor details"

## Future Enhancements

### Completed ✅
- [x] Funding research tools with LinkUp API
- [x] Inline dossier display component
- [x] Agent streaming integration
- [x] Save as dossier functionality
- [x] Newspaper-style layout

### Pending 🔄
- [ ] Email digest implementation (requires user email)
- [ ] CSV export for funding data
- [ ] Enhanced company cards with logos
- [ ] Filter controls (date range, industries, stages)
- [ ] Pagination for large result sets
- [ ] Caching for repeated queries
- [ ] Analytics tracking for query patterns

## Dependencies

- `@convex-dev/agent` - Agent framework
- `@convex-dev/agent/react` - React hooks for agents
- `react-markdown` - Markdown rendering
- `lucide-react` - Icons
- `sonner` - Toast notifications
- `convex/react` - Convex React hooks

## Files Modified

1. `convex/tools/fundingResearchTools.ts` (new)
2. `src/components/views/InlineDossierDisplay.tsx` (new)
3. `src/components/views/WelcomeLanding.tsx` (updated)
4. `convex/agents/specializedAgents.ts` (updated)

## Environment Variables Required

- `LINKUP_API_KEY` - LinkUp API key for funding research

## Performance Considerations

- **Streaming**: Results appear progressively as agent generates them
- **Deferred Rendering**: Large markdown content renders efficiently with ReactMarkdown
- **GPU Acceleration**: CSS animations use transform/opacity for smooth performance
- **Lazy Loading**: Only loads InlineDossierDisplay when results are available
- **Memoization**: Agent thread queries use Convex's built-in caching

## Accessibility

- **Keyboard Navigation**: All buttons and inputs are keyboard accessible
- **Screen Readers**: Semantic HTML with proper ARIA labels
- **Focus Management**: Focus indicators on all interactive elements
- **Reduced Motion**: Respects `prefers-reduced-motion` media query
- **Color Contrast**: Uses CSS variables for theme-aware colors

## Conclusion

The inline dossier display feature successfully transforms WelcomeLanding into a powerful research tool for investors and other professionals. Users can now query for funding announcements and see results displayed inline in a polished, newspaper-style format without leaving the page.

The implementation leverages existing infrastructure (Fast Agent Panel, Convex Agent, LinkUp API) while introducing new specialized tools and components for funding research. The result is a seamless, professional user experience that aligns with NodeBench's vision of frictionless research and dossier creation.

