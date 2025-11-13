# WelcomeLanding Live Streaming Enhancement

## Overview

Enhanced the WelcomeLanding component to display **live-streamed tool calls, agent progress, and rich media results** during agent execution, providing full transparency into the research process.

## What Changed

### 1. **Live Agent Progress Timeline**
- **Component**: `StepTimeline` from FastAgentPanel
- **Shows**: Real-time tool execution with status indicators
  - Tool name and arguments
  - Execution status (pending → running → complete/error)
  - Elapsed time for each step
  - Clickable tool names to view detailed results
- **Visual**: Vertical timeline with color-coded status nodes
  - 🟢 Green = Complete
  - 🔵 Blue = Running (animated spinner)
  - 🔴 Red = Error
  - ⚪ Gray = Pending

### 2. **Rich Media Display**
- **Component**: `RichMediaSection` from FastAgentPanel
- **Shows**: All media found by the agent with proper formatting
  - **Videos**: YouTube videos in horizontal carousel with thumbnails
  - **Images**: Responsive image gallery with captions
  - **Documents**: SEC filings and web sources as rich preview cards
  - **People**: Profile cards with photos and metadata
- **Two Sections**:
  1. "📎 All Media Found by Agent" - Comprehensive results from tool calls
  2. "💬 Referenced in Final Answer" - Subset mentioned in agent's response
- **Citations**: Each media item can have citation numbers for reference

### 3. **Clean Text Rendering**
- **Processing**: Removes media markers from text before display
- **Markdown**: Custom-styled ReactMarkdown components
  - Headings with proper hierarchy
  - Lists with accent-colored bullets
  - Links with external link icons
  - Responsive typography

## Technical Implementation

### New Imports
```typescript
import { StepTimeline, toolPartsToTimelineSteps } from "../FastAgentPanel/StepTimeline";
import { RichMediaSection } from "../FastAgentPanel/RichMediaSection";
import { extractMediaFromText, removeMediaMarkersFromText } from "../FastAgentPanel/utils/mediaExtractor";
import type { ToolUIPart } from "@convex-dev/agent/react";
import ReactMarkdown from 'react-markdown';
```

### Data Extraction
```typescript
// Extract tool parts for timeline
const toolParts = useMemo(() => {
  if (!agentResponse?.parts) return [];
  return agentResponse.parts.filter((p: any): p is ToolUIPart =>
    p.type.startsWith('tool-')
  );
}, [agentResponse?.parts]);

// Extract media from tool results and final text
const extractedMedia = useMemo(() => {
  const toolMedia = extractMediaFromText(
    toolParts.map((p: any) => p.output || '').join('\n')
  );
  const textMedia = extractMediaFromText(contentToShow);
  return { toolMedia, textMedia };
}, [toolParts, contentToShow]);

// Clean text (remove media markers)
const cleanedText = useMemo(() => {
  return removeMediaMarkersFromText(contentToShow);
}, [contentToShow]);
```

### UI Structure
```
Results Display
├── Header (Date, Title, Description)
├── Live Agent Progress Timeline (if tools executed)
│   └── StepTimeline with real-time updates
├── Rich Media Section (if media found)
│   ├── All Media Found by Agent
│   └── Referenced in Final Answer
├── Main Content (Markdown)
│   └── Custom-styled ReactMarkdown
├── Loading Indicator (while streaming)
└── Action Bar (New Search, Save, Email)
```

## User Experience Flow

1. **User submits query** → Loading state with "Researching across multiple sources..."
2. **Agent starts working** → Timeline appears showing tool execution
3. **Tools complete** → Results populate in real-time
4. **Media extracted** → Rich media cards appear above text
5. **Final text streams** → Markdown content renders progressively
6. **Complete** → Full results with all media, citations, and sources

## Benefits

✅ **Transparency**: Users see exactly what the agent is doing
✅ **Trust**: Tool execution visible builds confidence
✅ **Rich Context**: Media displayed prominently with proper formatting
✅ **Citations**: All sources properly attributed with URLs
✅ **Performance**: Memoized extraction prevents unnecessary re-renders
✅ **Reusability**: Leverages existing FastAgentPanel components

## Example Output

For query: "Summarize today's seed and Series A funding in healthcare, life sciences, and tech. Include sources."

**Timeline Shows**:
- 🔵 Web Search (running) → 🟢 Web Search (complete, 1.2s)
- 🔵 SEC Company Search (running) → 🟢 SEC Company Search (complete, 0.8s)
- 🔵 LinkUp Search (running) → 🟢 LinkUp Search (complete, 2.1s)

**Media Section Shows**:
- 📎 All Media Found: 5 images, 2 videos, 8 sources, 3 profiles
- 💬 Referenced in Answer: 3 images, 1 video, 5 sources

**Text Shows**:
Clean markdown with proper formatting, links, and structure

## Files Modified

- `src/components/views/WelcomeLanding.tsx` - Main component with live streaming
- No breaking changes to existing functionality
- Backward compatible with existing WelcomeLanding usage

## Bug Fixes

### Issue: Loading Spinner Instead of Streaming Output
**Problem**: Users saw only a loading spinner instead of live agent progress during streaming.

**Root Cause**: The `showResults` variable was `false` because it only checked for `contentToShow`, which is empty at the start of streaming.

**Solution**: Updated `showResults` logic to show results section when:
1. `contentToShow` has content (final text available), OR
2. `agentResponse` exists (agent has started responding), OR
3. `isResearching` is true (query submitted)

```typescript
// Before (only showed results after text appeared)
const showResults = Boolean(contentToShow);

// After (shows results as soon as agent starts)
const showResults = Boolean(contentToShow) || Boolean(agentResponse) || isResearching;
```

### Issue: Circular Dependency Error
**Problem**: `ReferenceError: Cannot access 'showResults' before initialization`

**Root Cause**: `useEffect` hook using `showResults` was defined before the variable was declared.

**Solution**: Moved debug logging `useEffect` hooks to after all variable declarations (after line 259).

### Enhanced Loading States
Added better loading state messages:
- **Before text appears**: "Agent is analyzing and generating response..."
- **While streaming with content**: "Still generating..." (at bottom with border)
- **Timeline visible immediately**: Shows tool execution even before text appears

## Dependencies

All dependencies already exist in the project:
- `@convex-dev/agent/react` - UIMessages, ToolUIPart types
- `react-markdown` - Markdown rendering
- `lucide-react` - Icons
- FastAgentPanel components (StepTimeline, RichMediaSection, mediaExtractor)

