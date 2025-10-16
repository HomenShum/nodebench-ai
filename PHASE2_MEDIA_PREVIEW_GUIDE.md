# Phase 2: Media Preview in Final Answer - Implementation Guide

## Overview
Automatically detect and render media files (videos, images, SEC documents) mentioned in or attached to the final answer text.

## Current Implementation Analysis

### How ToolOutputRenderer Works
The existing `ToolOutputRenderer` already extracts media using HTML comments:
```typescript
// Extract YouTube gallery data
const youtubeMatch = outputText.match(/<!-- YOUTUBE_GALLERY_DATA\n([\s\S]*?)\n-->/);
const youtubeVideos: YouTubeVideo[] = youtubeMatch ? JSON.parse(youtubeMatch[1]) : [];

// Extract SEC gallery data
const secMatch = outputText.match(/<!-- SEC_GALLERY_DATA\n([\s\S]*?)\n-->/);
const secDocuments: SECDocument[] = secMatch ? JSON.parse(secMatch[1]) : [];
```

### Problem
This extraction logic is only applied to **tool results**, not to the **final answer text**.

## Solution Architecture

### Component Hierarchy
```
UIMessageBubble
├── Reasoning (if any)
├── Tool Timeline (if any)
├── Tool Results (if any)
├── Final Answer Text
│   └── Extract media from text
│       ├── YouTube videos
│       ├── SEC documents
│       └── Images
└── Media Galleries
    ├── YouTubeGallery
    ├── SECDocumentGallery
    └── Image gallery
```

### Data Flow
```
UIMessage.text (final answer)
    ↓
mediaExtractor.extractMediaFromText()
    ├── extractYouTubeVideos()
    ├── extractSECDocuments()
    └── extractImages()
    ↓
Render galleries inline with answer
```

## Implementation Steps

### Step 1: Create mediaExtractor Utility

**File:** `src/components/FastAgentPanel/utils/mediaExtractor.ts`

```typescript
import type { YouTubeVideo } from '../MediaGallery';
import type { SECDocument } from '../MediaGallery';

export interface ExtractedMedia {
  youtubeVideos: YouTubeVideo[];
  secDocuments: SECDocument[];
  images: Array<{ url: string; alt: string }>;
}

export function extractMediaFromText(text: string): ExtractedMedia {
  return {
    youtubeVideos: extractYouTubeVideos(text),
    secDocuments: extractSECDocuments(text),
    images: extractImages(text),
  };
}

function extractYouTubeVideos(text: string): YouTubeVideo[] {
  const youtubeMatch = text.match(/<!-- YOUTUBE_GALLERY_DATA\n([\s\S]*?)\n-->/);
  if (!youtubeMatch) return [];
  
  try {
    return JSON.parse(youtubeMatch[1]);
  } catch {
    return [];
  }
}

function extractSECDocuments(text: string): SECDocument[] {
  const secMatch = text.match(/<!-- SEC_GALLERY_DATA\n([\s\S]*?)\n-->/);
  if (!secMatch) return [];
  
  try {
    return JSON.parse(secMatch[1]);
  } catch {
    return [];
  }
}

function extractImages(text: string): Array<{ url: string; alt: string }> {
  // Extract markdown images: ![alt](url)
  const imageMatches = text.match(/!\[.*?\]\(.*?\)/g) || [];
  
  return imageMatches.map(match => {
    const urlMatch = match.match(/\((.*?)\)/);
    const altMatch = match.match(/!\[(.*?)\]/);
    return {
      url: urlMatch?.[1] || '',
      alt: altMatch?.[1] || 'Image'
    };
  }).filter(img => img.url); // Remove invalid entries
}

export function removeMediaMarkersFromText(text: string): string {
  return text
    .replace(/<!-- YOUTUBE_GALLERY_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/<!-- SEC_GALLERY_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/## Images\s*\n*/g, ''); // Remove "## Images" header
}
```

### Step 2: Update UIMessageBubble

**File:** `src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx`

Changes:
1. Import mediaExtractor utility
2. Extract media from final answer text
3. Render galleries before/after answer text
4. Remove media markers from displayed text

**Code changes:**
```typescript
import { extractMediaFromText, removeMediaMarkersFromText } from './utils/mediaExtractor';

// In UIMessageBubble component, after extracting tool parts:
const extractedMedia = useMemo(() => {
  return extractMediaFromText(visibleText || '');
}, [visibleText]);

const cleanedText = useMemo(() => {
  return removeMediaMarkersFromText(visibleText || '');
}, [visibleText]);

// In render section, update final answer rendering:
{visibleText && (
  <>
    {/* Media galleries BEFORE answer text */}
    {extractedMedia.youtubeVideos.length > 0 && (
      <YouTubeGallery videos={extractedMedia.youtubeVideos} />
    )}
    
    {extractedMedia.secDocuments.length > 0 && (
      <SECDocumentGallery documents={extractedMedia.secDocuments} />
    )}
    
    {extractedMedia.images.length > 0 && (
      <div className="image-gallery grid grid-cols-2 gap-2">
        {extractedMedia.images.map((img, idx) => (
          <SafeImage
            key={idx}
            src={img.url}
            alt={img.alt}
            className="rounded-lg border border-gray-200"
          />
        ))}
      </div>
    )}
    
    {/* Main answer text */}
    <div className={cn(
      "rounded-lg px-4 py-2 shadow-sm whitespace-pre-wrap",
      isUser
        ? "bg-blue-600 text-white"
        : "bg-white text-gray-800 border border-gray-200",
      message.status === 'streaming' && !isUser && "bg-green-50 border-green-200",
      message.status === 'failed' && "bg-red-50 border-red-200"
    )}>
      <ReactMarkdown {...markdownProps}>
        {cleanedText || '...'}
      </ReactMarkdown>
    </div>
  </>
)}
```

### Step 3: Add Visual Separators

**File:** `src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx`

Add section headers for clarity:
```typescript
{extractedMedia.youtubeVideos.length > 0 && (
  <div className="flex items-center gap-2 mt-3 mb-2">
    <div className="h-px flex-1 bg-gray-200"></div>
    <span className="text-xs font-medium text-gray-500">Related Videos</span>
    <div className="h-px flex-1 bg-gray-200"></div>
  </div>
)}

<YouTubeGallery videos={extractedMedia.youtubeVideos} />
```

## Implementation Checklist

- [ ] Create mediaExtractor.ts utility
  - [ ] extractYouTubeVideos() function
  - [ ] extractSECDocuments() function
  - [ ] extractImages() function
  - [ ] removeMediaMarkersFromText() function
  - [ ] ExtractedMedia interface

- [ ] Update UIMessageBubble.tsx
  - [ ] Import mediaExtractor
  - [ ] Extract media from final answer
  - [ ] Render YouTube gallery
  - [ ] Render SEC document gallery
  - [ ] Render image gallery
  - [ ] Add visual separators
  - [ ] Remove media markers from displayed text

- [ ] Testing
  - [ ] Test with YouTube videos in answer
  - [ ] Test with SEC documents in answer
  - [ ] Test with images in answer
  - [ ] Test with mixed media types
  - [ ] Test with no media (should not break)
  - [ ] Test media markers are removed from text
  - [ ] Test on mobile (responsive)

## Styling Considerations

### Media Galleries
- Use existing gallery component styling
- Add section headers with visual separators
- Maintain consistent spacing
- Responsive grid layout

### Image Gallery
- 2-column grid on desktop
- 1-column on mobile
- Rounded corners and borders
- Hover effects for interactivity

### Spacing
- Gap between galleries: 1rem
- Gap between galleries and text: 1rem
- Consistent with existing component spacing

## Performance Considerations

1. **Memoization** - Use useMemo for extracted media and cleaned text
2. **Lazy rendering** - Galleries only render if media exists
3. **Image loading** - Use SafeImage component with loading states
4. **Text processing** - Regex operations are fast for typical text sizes

## Accessibility

- [ ] Alt text for images (from markdown)
- [ ] ARIA labels for gallery sections
- [ ] Keyboard navigation for galleries
- [ ] Screen reader support

## Testing Strategy

### Unit Tests
- Test extractYouTubeVideos() with various formats
- Test extractSECDocuments() with various formats
- Test extractImages() with markdown syntax
- Test removeMediaMarkersFromText()

### Integration Tests
- Test UIMessageBubble with extracted media
- Test gallery rendering
- Test text cleaning

### Manual Testing
- Test with real agent queries that return media
- Test on different screen sizes
- Test with various media types
- Verify media markers are removed from text

## Estimated Effort
- **Development:** 2-3 hours
- **Testing:** 1 hour
- **Total:** 3-4 hours

## Success Criteria
- [ ] Media is automatically detected in final answer
- [ ] Galleries render correctly
- [ ] Media markers are removed from displayed text
- [ ] Responsive on all screen sizes
- [ ] No performance degradation
- [ ] Accessibility requirements met

## Future Enhancements

1. **Media preview cards** - Show media type and count in answer
2. **Media filtering** - Let users filter by media type
3. **Media download** - Add download buttons for documents
4. **Media comparison** - Compare multiple documents side-by-side

