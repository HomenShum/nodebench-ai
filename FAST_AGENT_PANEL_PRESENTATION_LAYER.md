# Fast Agent Panel Presentation Layer Enhancement

## Overview

This document describes the presentation layer enhancement for the Fast Agent Panel, which transforms raw agent output into a polished, user-friendly interface similar to Perplexity while maintaining NodeBench AI's transparent agentic process.

## Goals

1. **Polished Media Display**: Videos and sources appear as interactive cards instead of plain text
2. **Separation of Concerns**: Distinguish between "polished answer" (default view) and "agent process" (collapsible details)
3. **Improved UX**: Users see clean, professional results first, with optional access to detailed agent steps
4. **Maintain Transparency**: All agent process details remain accessible via collapsible sections

## Architecture

### Component Hierarchy

```
UIMessageBubble
├── Agent Role Badge (if specialized agent)
├── RichMediaSection (polished media display)
│   ├── VideoCarousel (YouTube videos)
│   ├── SourceGrid (SEC documents, articles)
│   └── Image Gallery (markdown images)
├── CollapsibleAgentProgress (agent process details)
│   ├── Reasoning (thinking process)
│   └── StepTimeline (tool executions)
├── Entity Selection Cards (companies, people, events, news)
├── Main Answer Text (cleaned of media markers)
└── Status Indicators & Actions
```

### Data Flow

```
UIMessage.text (final answer)
    ↓
extractMediaFromText()
    ├── Extract YouTube videos (HTML comments)
    ├── Extract SEC documents (HTML comments)
    └── Extract images (markdown syntax)
    ↓
RichMediaSection (polished display)
    ↓
removeMediaMarkersFromText()
    ↓
Clean answer text (no duplication)
```

## Components

### 1. VideoCard.tsx

**Purpose**: Display individual YouTube videos as interactive cards

**Features**:
- Thumbnail image with play button overlay
- Video title and channel name
- Hover effects and external link indicator
- Clickable card opens video in new tab

**Usage**:
```tsx
<VideoCard video={youtubeVideo} />
<VideoCarousel videos={youtubeVideos} title="Related Videos" />
```

### 2. SourceCard.tsx

**Purpose**: Display sources/documents as rich preview cards

**Features**:
- Supports both generic sources and SEC documents
- Preview image or icon (FileText for SEC, Globe for web)
- Title, domain, and description
- Optional citation numbers for inline references
- Favicon display for web sources

**Usage**:
```tsx
<SourceCard source={source} citationNumber={1} />
<SourceGrid sources={sources} showCitations={true} />
```

### 3. RichMediaSection.tsx

**Purpose**: Orchestrate polished media display

**Features**:
- Automatically renders videos, sources, and images
- Section headers with counts
- Responsive layouts (carousel for videos, grid for sources/images)
- Only renders if media exists

**Usage**:
```tsx
<RichMediaSection media={extractedMedia} showCitations={false} />
```

### 4. CollapsibleAgentProgress.tsx

**Purpose**: Wrap agent process details in expandable section

**Features**:
- Collapsed by default for clean UX
- Shows step count and status indicator
- Expands to reveal reasoning and tool timeline
- Smooth animations

**Usage**:
```tsx
<CollapsibleAgentProgress
  toolParts={toolParts}
  reasoning={reasoning}
  isStreaming={isStreaming}
  defaultExpanded={false}
/>
```

### 5. utils/mediaExtractor.ts

**Purpose**: Extract media from text content

**Functions**:
- `extractMediaFromText(text)`: Extract all media types
- `removeMediaMarkersFromText(text)`: Clean text of HTML comment markers
- `hasMedia(media)`: Check if any media exists

**Media Formats**:
- YouTube: `<!-- YOUTUBE_GALLERY_DATA\n[...]\n-->`
- SEC: `<!-- SEC_GALLERY_DATA\n[...]\n-->`
- Images: `![alt](url)` markdown syntax

## Implementation Details

### UIMessageBubble Changes

**Before** (old hierarchy):
1. Reasoning
2. Tool Timeline
3. Tool Results
4. Main Answer Text

**After** (new hierarchy):
1. Agent Role Badge
2. **Rich Media Section** (NEW - polished display)
3. **Collapsible Agent Progress** (NEW - process details hidden)
4. Entity Selection Cards
5. Main Answer Text (cleaned)

### Key Code Changes

```tsx
// Extract media from final answer
const extractedMedia = useMemo(() => {
  return extractMediaFromText(visibleText || '');
}, [visibleText]);

// Clean text by removing media markers
const cleanedText = useMemo(() => {
  return removeMediaMarkersFromText(visibleText || '');
}, [visibleText]);

// Render polished media FIRST
<RichMediaSection media={extractedMedia} showCitations={false} />

// Render agent process in collapsible section
<CollapsibleAgentProgress
  toolParts={toolParts}
  reasoning={visibleReasoning}
  defaultExpanded={false}
/>

// Render cleaned answer text
<ReactMarkdown>
  {isUser ? visibleText : cleanedText}
</ReactMarkdown>
```

## User Experience

### Default View (Polished)

Users immediately see:
- **Video cards** with thumbnails in horizontal carousel
- **Source cards** with favicons and metadata in grid
- **Clean answer text** without media markers
- **Collapsed agent progress** section (one-line summary)

### Expanded View (Transparent)

Users can click to expand and see:
- **Reasoning**: Agent's thinking process
- **Tool Timeline**: Step-by-step tool executions
- **Tool Results**: Detailed output from each tool
- **Arguments**: Input parameters for each tool

## Styling

### Video Cards
- Aspect ratio: 16:9 (aspect-video)
- Play button: Red circle with white play icon
- Hover: Shadow elevation, darker overlay
- Width: 256px (w-64) in carousel

### Source Cards
- Layout: Horizontal flex with preview + content
- Preview: 64px square (w-16 h-16)
- Hover: Border color change, shadow elevation
- Grid: 1 column mobile, 2 columns desktop

### Collapsible Section
- Default: Collapsed with summary line
- Icon: Wrench (complete) or Zap (streaming)
- Background: Gray-50 with border
- Expand: Smooth slide-in animation

## Accessibility

- **Keyboard Navigation**: Collapsible sections support Enter/Space
- **Alt Text**: All images include descriptive alt text
- **ARIA Labels**: Interactive elements have proper labels
- **Screen Readers**: Status indicators use semantic HTML
- **Focus Management**: Logical tab order maintained

## Performance

- **Lazy Loading**: Images use `loading="lazy"` attribute
- **Memoization**: Media extraction and text cleaning are memoized
- **Conditional Rendering**: Components only render if content exists
- **Efficient Updates**: useMemo prevents unnecessary re-extraction

## Testing Strategy

### Manual Testing
1. Send query that returns YouTube videos
2. Verify videos appear as cards with thumbnails
3. Click video card → opens in new tab
4. Send query that returns SEC documents
5. Verify sources appear as preview cards
6. Click "Agent Progress" → expands to show timeline
7. Verify answer text has no duplicate media

### Integration Testing
- Test with mixed media types (videos + sources + images)
- Test with no media (should not break)
- Test streaming vs complete states
- Test mobile responsive layouts

### Edge Cases
- Empty media arrays
- Malformed HTML comments
- Missing thumbnails (fallback to default)
- Very long titles (line-clamp truncation)

## Future Enhancements

### Inline Citations
- Add citation markers `[1]`, `[2]` in answer text
- Link citations to corresponding source cards
- Highlight source card on citation hover

### Media Filtering
- Add filter buttons: "All", "Videos", "Documents", "Images"
- Show/hide media types based on selection

### Media Preview
- Inline video player (click to expand)
- Document preview modal
- Image lightbox gallery

### Analytics
- Track which media users click
- Measure agent progress expansion rate
- A/B test default expanded vs collapsed

## Migration Notes

### Backward Compatibility
- Existing `ToolOutputRenderer` still works for tool results
- Legacy `YouTubeGallery` and `SECDocumentGallery` components preserved
- No breaking changes to agent backend

### Gradual Rollout
1. Phase 1: Deploy new components (current)
2. Phase 2: Add inline citations
3. Phase 3: Add media filtering
4. Phase 4: Add preview modals

## Success Metrics

- ✅ Videos appear as interactive cards
- ✅ Sources appear as rich preview cards
- ✅ Agent process hidden by default
- ✅ Clean answer text (no media markers)
- ✅ All media clickable and opens in new tab
- ✅ Responsive on mobile and desktop
- ✅ Maintains full transparency (expandable details)

## Related Documentation

- `DESIGN_SPECS.md`: Overall system architecture
- `FOLDER_STRUCTURES.md`: File organization
- `PHASE2_MEDIA_PREVIEW_GUIDE.md`: Original media preview implementation
- `PHASE1_TOOL_RESULT_POPOVERS_GUIDE.md`: Tool result popover implementation

