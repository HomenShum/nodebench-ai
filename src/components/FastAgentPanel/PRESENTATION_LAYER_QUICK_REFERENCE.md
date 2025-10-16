# Fast Agent Panel Presentation Layer - Quick Reference

## Component Overview

### VideoCard & VideoCarousel
```tsx
import { VideoCard, VideoCarousel } from './VideoCard';
import type { YouTubeVideo } from './MediaGallery';

// Single card
<VideoCard video={youtubeVideo} className="w-64" />

// Carousel
<VideoCarousel videos={youtubeVideos} title="Related Videos" />
```

**Features**:
- Thumbnail with play button overlay
- Title and channel metadata
- Clickable (opens in new tab)
- Responsive carousel layout

### SourceCard & SourceGrid
```tsx
import { SourceCard, SourceGrid, secDocumentToSource } from './SourceCard';
import type { SECDocument } from './MediaGallery';

// Single card
<SourceCard source={source} citationNumber={1} />

// Grid
<SourceGrid sources={sources} showCitations={true} />

// Convert SEC document
const source = secDocumentToSource(secDocument);
```

**Features**:
- Supports SEC documents and web sources
- Preview image or icon
- Domain and description
- Optional citation numbers
- Responsive grid layout

### RichMediaSection
```tsx
import { RichMediaSection } from './RichMediaSection';
import { extractMediaFromText } from './utils/mediaExtractor';
import type { ExtractedMedia } from './utils/mediaExtractor';

// Extract media from text
const media = extractMediaFromText(answerText);

// Render polished display
<RichMediaSection media={media} showCitations={false} />
```

**Features**:
- Orchestrates all media types
- Auto-renders videos, sources, images
- Section headers with counts
- Only renders if media exists

### CollapsibleAgentProgress
```tsx
import { CollapsibleAgentProgress } from './CollapsibleAgentProgress';
import type { ToolUIPart } from 'ai';

<CollapsibleAgentProgress
  toolParts={toolParts}
  reasoning={reasoning}
  isStreaming={isStreaming}
  defaultExpanded={false}
  onCompanySelect={handleCompanySelect}
  onPersonSelect={handlePersonSelect}
  onEventSelect={handleEventSelect}
  onNewsSelect={handleNewsSelect}
/>
```

**Features**:
- Collapsed by default
- Shows step count and status
- Expands to reveal reasoning + timeline
- Smooth animations

### Media Extractor Utility
```tsx
import {
  extractMediaFromText,
  removeMediaMarkersFromText,
  hasMedia,
  type ExtractedMedia
} from './utils/mediaExtractor';

// Extract all media types
const media: ExtractedMedia = extractMediaFromText(text);
// Returns: { youtubeVideos, secDocuments, images }

// Clean text of media markers
const cleanText = removeMediaMarkersFromText(text);

// Check if any media exists
if (hasMedia(media)) {
  // Render media
}
```

## UIMessageBubble Integration

### Current Rendering Order
```tsx
1. Agent Role Badge (if specialized agent)
2. RichMediaSection (polished media display)
3. CollapsibleAgentProgress (agent process details)
4. Entity Selection Cards (companies, people, events, news)
5. Main Answer Text (cleaned of media markers)
6. Status Indicators & Actions
```

### Key Code Pattern
```tsx
// Extract media from final answer
const extractedMedia = useMemo(() => {
  return extractMediaFromText(visibleText || '');
}, [visibleText]);

// Clean text by removing media markers
const cleanedText = useMemo(() => {
  return removeMediaMarkersFromText(visibleText || '');
}, [visibleText]);

// Render in order
<RichMediaSection media={extractedMedia} />
<CollapsibleAgentProgress toolParts={toolParts} reasoning={reasoning} />
<ReactMarkdown>{cleanedText}</ReactMarkdown>
```

## Media Extraction Formats

### YouTube Videos
```
<!-- YOUTUBE_GALLERY_DATA
[
  {
    "title": "Video Title",
    "channel": "Channel Name",
    "description": "Description",
    "url": "https://youtube.com/watch?v=...",
    "videoId": "...",
    "thumbnail": "https://img.youtube.com/vi/.../mqdefault.jpg"
  }
]
-->
```

### SEC Documents
```
<!-- SEC_GALLERY_DATA
[
  {
    "title": "Filing Title",
    "formType": "10-K",
    "filingDate": "2024-01-15",
    "accessionNumber": "0001234567-24-000001",
    "documentUrl": "https://sec.gov/...",
    "company": "Company Name"
  }
]
-->
```

### Images
```
![Alt text](https://example.com/image.jpg)
```

## Styling Classes

### VideoCard
- `.video-card`: Container
- `.video-thumbnail`: Thumbnail wrapper
- `.play-overlay`: Play button overlay
- `.video-info`: Metadata section
- `.video-title`: Title text
- `.video-channel`: Channel text

### SourceCard
- `.source-card`: Container
- `.source-preview`: Preview image/icon
- `.source-content`: Content section
- `.source-title`: Title text
- `.source-domain`: Domain badge
- `.source-description`: Description text

### CollapsibleAgentProgress
- `.collapsible-button`: Toggle button
- `.collapsible-content`: Expandable content
- `.reasoning-box`: Reasoning section
- `.timeline-box`: Tool timeline section

## Common Patterns

### Render Media Only If Exists
```tsx
if (media.youtubeVideos.length > 0) {
  <VideoCarousel videos={media.youtubeVideos} />
}
```

### Conditional Rendering
```tsx
{!isUser && (
  <RichMediaSection media={extractedMedia} />
)}
```

### Memoization for Performance
```tsx
const extractedMedia = useMemo(() => {
  return extractMediaFromText(visibleText || '');
}, [visibleText]);
```

## Testing

### Test File Location
`src/components/FastAgentPanel/__tests__/presentation-layer.test.tsx`

### Run Tests
```bash
npm test presentation-layer.test.tsx
```

### Test Coverage
- VideoCard rendering and interaction
- VideoCarousel with multiple videos
- SourceCard for SEC and web sources
- SourceGrid with multiple sources
- RichMediaSection with all media types
- CollapsibleAgentProgress states
- Edge cases (empty arrays, missing data)

## Troubleshooting

### Media Not Appearing
1. Check HTML comment format is exact: `<!-- YOUTUBE_GALLERY_DATA\n...\n-->`
2. Verify JSON is valid (use `JSON.parse` to test)
3. Check `extractMediaFromText` is called on correct text
4. Verify `RichMediaSection` is rendered

### Text Duplication
1. Ensure `removeMediaMarkersFromText` is called
2. Check media markers are removed from `cleanedText`
3. Verify `cleanedText` is used in markdown rendering

### Styling Issues
1. Check Tailwind classes are applied correctly
2. Verify responsive breakpoints (md:, lg:)
3. Check z-index for overlays
4. Test on mobile viewport

### Performance Issues
1. Verify `useMemo` is used for extraction
2. Check lazy loading on images (`loading="lazy"`)
3. Verify conditional rendering (don't render if empty)
4. Profile with React DevTools

## Related Files

- `FastAgentPanel.UIMessageBubble.tsx`: Main integration point
- `MediaGallery.tsx`: Legacy gallery components
- `StepTimeline.tsx`: Tool execution timeline
- `utils/mediaExtractor.ts`: Media extraction utilities
- `__tests__/presentation-layer.test.tsx`: Test suite

## Documentation

- `FAST_AGENT_PANEL_PRESENTATION_LAYER.md`: Complete guide
- `PRESENTATION_LAYER_IMPLEMENTATION_SUMMARY.md`: Implementation summary
- `DESIGN_SPECS.md`: System architecture
- `FOLDER_STRUCTURES.md`: File organization

