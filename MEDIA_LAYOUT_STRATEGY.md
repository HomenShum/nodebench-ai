# Fast Agent Panel - Media Layout Strategy & Implementation Guide

## Executive Summary

This document provides a comprehensive layout strategy for displaying media content (videos, SEC documents, images) in the Fast Agent Panel's message bubbles, following a Perplexity-style presentation layer approach.

**Key Principle**: Media appears FIRST (polished presentation), followed by the agent's reasoning/process (collapsible), then the final answer text (for context).

---

## Visual Hierarchy & Layout Structure

### Current Implementation (Already in Place)
```
UIMessageBubble
├── Agent Avatar (left side)
└── Message Content (flex column)
    ├── Agent Role Badge (if specialized agent)
    ├── RichMediaSection ← MEDIA APPEARS HERE (polished display)
    ├── CollapsibleAgentProgress ← Process details (hidden by default)
    ├── Entity Selection Cards (if any)
    ├── File Parts (uploaded files)
    └── Main Answer Text (final answer)
```

**Current Status**: ✅ Structure is correct, media extraction is working

---

## Recommended Layout Patterns

### Pattern 1: Media-First Layout (RECOMMENDED)
**Best for**: Queries that return rich media (videos, documents)

```
┌─────────────────────────────────────────┐
│ 🤖 Agent Role Badge (if specialized)    │
├─────────────────────────────────────────┤
│                                         │
│  ▶ Related Videos (4)                   │
│  ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ Video 1  │ │ Video 2  │ │ Video 3│  │
│  │ Thumbnail│ │ Thumbnail│ │ Thumb..│  │
│  └──────────┘ └──────────┘ └────────┘  │
│                                         │
│  📄 Sources & Documents (2)             │
│  ┌──────────────────────────────────┐   │
│  │ 📋 10-K Filing • Tesla • 2024    │   │
│  │ sec.gov                          │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │ 📰 Article • TechCrunch • 2024   │   │
│  │ techcrunch.com                   │   │
│  └──────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│ ⚙️ Show Process (collapsed by default)  │
│    [Click to expand reasoning/tools]    │
├─────────────────────────────────────────┤
│ Here's what I found about Tesla's      │
│ latest financial performance...        │
│                                         │
│ The company reported strong Q4 results │
│ with revenue up 25% YoY...             │
└─────────────────────────────────────────┘
```

### Pattern 2: Answer-First Layout (ALTERNATIVE)
**Best for**: Queries with minimal media or text-heavy answers

```
┌─────────────────────────────────────────┐
│ 🤖 Agent Role Badge (if specialized)    │
├─────────────────────────────────────────┤
│ Here's what I found about Tesla's      │
│ latest financial performance...        │
│                                         │
│ The company reported strong Q4 results │
│ with revenue up 25% YoY...             │
├─────────────────────────────────────────┤
│ ▶ Related Videos (4)                   │
│ [Video carousel...]                    │
├─────────────────────────────────────────┤
│ 📄 Sources & Documents (2)             │
│ [Source cards...]                      │
└─────────────────────────────────────────┘
```

---

## Recommended Approach: Media-First (Pattern 1)

### Why Media-First?
1. **Visual Impact**: Users see rich media immediately
2. **Perplexity-Style**: Matches modern AI assistant UX
3. **Scannable**: Media is easier to scan than text
4. **Progressive Disclosure**: Process details hidden by default
5. **Information Hierarchy**: Most important (media) → Process → Context (text)

### Current Implementation Status
✅ **Already Implemented Correctly**:
- RichMediaSection renders BEFORE CollapsibleAgentProgress
- Media extraction from tool results working
- Responsive grid layouts for videos and documents
- Section headers with visual separators

---

## CSS/Tailwind Styling Strategy

### 1. Container Spacing
```typescript
// RichMediaSection wrapper
<div className="space-y-4 mb-4">
  {/* Each media type gets space-y-4 = 1rem gap */}
</div>

// Spacing breakdown:
// - Between video carousel and source grid: 1rem (space-y-4)
// - Between source grid and answer text: 1rem (mb-4)
// - Between message bubble and next message: 0.5rem (gap-2 in parent)
```

### 2. Responsive Design
```typescript
// Videos: Horizontal scroll on mobile, grid on desktop
<div className="overflow-x-auto pb-2 -mx-1">
  <div className="flex gap-3 px-1" style={{ minWidth: 'min-content' }}>
    {/* Cards: flex-shrink-0 w-64 = 256px fixed width */}
  </div>
</div>

// Sources: 1 column on mobile, 2 columns on desktop
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {/* Source cards */}
</div>

// Images: 2 columns on mobile, 3 on desktop
<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
  {/* Image thumbnails */}
</div>
```

### 3. Visual Separators & Headers
```typescript
// Section header with dividers
<div className="flex items-center gap-2 mb-3">
  <div className="h-px flex-1 bg-gray-200"></div>
  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
    <Play className="h-4 w-4 text-red-600" />
    Related Videos
    <span className="text-xs font-normal text-gray-500">({count})</span>
  </h3>
  <div className="h-px flex-1 bg-gray-200"></div>
</div>

// Styling breakdown:
// - h-px = 1px height (thin line)
// - flex-1 = grows to fill available space
// - bg-gray-200 = light gray color
// - text-sm = 14px font size
// - font-semibold = 600 weight
// - text-gray-700 = dark gray text
```

### 4. Card Styling
```typescript
// Video card
className={cn(
  "group block rounded-lg overflow-hidden border border-gray-200",
  "hover:border-gray-300 transition-all duration-200 hover:shadow-md",
  "bg-white"
)}

// Source card
className={cn(
  "group block rounded-lg border border-gray-200",
  "hover:border-gray-300 transition-all duration-200 hover:shadow-md",
  "bg-white overflow-hidden"
)}

// Styling breakdown:
// - rounded-lg = 8px border radius
// - border border-gray-200 = 1px gray border
// - hover:border-gray-300 = darker border on hover
// - transition-all duration-200 = smooth 200ms animation
// - hover:shadow-md = subtle shadow on hover
// - bg-white = white background
```

### 5. Answer Text Styling
```typescript
// Main answer text box
className={cn(
  "rounded-lg px-4 py-2 shadow-sm whitespace-pre-wrap",
  isUser
    ? "bg-blue-600 text-white"
    : "bg-white text-gray-800 border border-gray-200",
  message.status === 'streaming' && !isUser && "bg-green-50 border-green-200",
  message.status === 'failed' && "bg-red-50 border-red-200"
)}

// Styling breakdown:
// - px-4 py-2 = 1rem horizontal, 0.5rem vertical padding
// - shadow-sm = subtle shadow
// - whitespace-pre-wrap = preserve formatting
// - bg-white = white background for assistant
// - border border-gray-200 = light border
```

---

## Handling Multiple Media Types

### Scenario 1: Videos + Documents + Images
```
┌─────────────────────────────────────────┐
│ ▶ Related Videos (5)                    │
│ [Video carousel - horizontal scroll]    │
├─────────────────────────────────────────┤
│ 📄 Sources & Documents (3)              │
│ [Source grid - 2 columns]               │
├─────────────────────────────────────────┤
│ 🖼️ Images (4)                           │
│ [Image grid - 3 columns]                │
├─────────────────────────────────────────┤
│ [Answer text...]                        │
└─────────────────────────────────────────┘
```

### Scenario 2: Only Videos
```
┌─────────────────────────────────────────┐
│ ▶ Related Videos (5)                    │
│ [Video carousel]                        │
├─────────────────────────────────────────┤
│ [Answer text...]                        │
└─────────────────────────────────────────┘
```

### Scenario 3: Only Documents
```
┌─────────────────────────────────────────┐
│ 📄 Sources & Documents (2)              │
│ [Source grid]                           │
├─────────────────────────────────────────┤
│ [Answer text...]                        │
└─────────────────────────────────────────┘
```

---

## Information Density & Scrolling

### Handling Large Media Collections

**Problem**: 10+ videos or documents can overwhelm the message

**Solutions**:

1. **Horizontal Scroll for Videos** (Already Implemented)
   - Videos scroll horizontally
   - Shows 2-3 cards at a time
   - User can scroll to see more
   - No vertical scrolling needed

2. **Grid with Pagination for Documents**
   - Show first 4 documents
   - Add "Show more" button if > 4
   - Reduces initial visual load

3. **Lazy Loading for Images**
   - Images use `loading="lazy"`
   - Only load when visible
   - Improves performance

### Recommended Limits
- **Videos**: Show all (horizontal scroll handles overflow)
- **Documents**: Show first 4, add "Show more" button
- **Images**: Show first 6, add "Show more" button

---

## Component Integration in UIMessageBubble.tsx

### Current Correct Order (Lines 520-686)
```typescript
1. Agent Avatar (left side)
2. Message Content Container
   a. Agent Role Badge (if specialized)
   b. RichMediaSection ← MEDIA DISPLAY
   c. CollapsibleAgentProgress ← PROCESS DETAILS
   d. Entity Selection Cards
   e. File Parts
   f. Main Answer Text ← FINAL ANSWER
3. Status Indicator & Actions
```

### Why This Order?
- **Media First**: Immediate visual impact
- **Process Hidden**: Collapsible by default (advanced users can expand)
- **Answer Last**: Provides context after seeing media
- **Natural Reading**: Top-to-bottom flow matches user expectations

---

## UX Patterns for Scanability

### 1. Section Headers with Icons
```typescript
// Videos
<Play className="h-4 w-4 text-red-600" /> Related Videos (5)

// Documents
<FileText className="h-4 w-4 text-blue-600" /> Sources & Documents (3)

// Images
<Image className="h-4 w-4 text-purple-600" /> Images (4)
```

### 2. Visual Separators
- Thin gray lines (h-px bg-gray-200) between sections
- Creates clear visual boundaries
- Improves scannability

### 3. Count Badges
- Show count in header: "Related Videos (5)"
- Helps users understand content volume
- Manages expectations

### 4. Hover Effects
- Cards have subtle shadow on hover
- Border color changes on hover
- Indicates interactivity

---

## Mobile Responsiveness

### Breakpoints
- **Mobile** (< 768px): Single column, horizontal scroll for videos
- **Tablet** (768px - 1024px): 2 columns for documents
- **Desktop** (> 1024px): Full layout with optimal spacing

### Mobile Optimizations
```typescript
// Videos: Always horizontal scroll (no change needed)
<div className="overflow-x-auto pb-2">
  <div className="flex gap-3">
    {/* Cards: w-64 = 256px, fits 1-2 on mobile */}
  </div>
</div>

// Documents: 1 column on mobile, 2 on desktop
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">

// Images: 2 columns on mobile, 3 on desktop
<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
```

---

## Performance Considerations

### Already Optimized
✅ Media extraction uses `useMemo` (lines 476-511)
✅ Images use `loading="lazy"`
✅ Conditional rendering (only render if media exists)
✅ Responsive images (no oversized assets)

### Additional Optimizations
- Consider virtual scrolling for 20+ items
- Lazy load video thumbnails
- Compress images before display

---

## Accessibility

### Current Implementation
✅ Alt text for images
✅ Semantic HTML (links, headings)
✅ Color not only indicator (icons + text)
✅ Keyboard navigation (links are focusable)

### Enhancements
- Add ARIA labels to sections
- Add keyboard shortcuts for media navigation
- Ensure sufficient color contrast

---

## Summary: Current State vs. Recommended

| Aspect | Current | Recommended | Status |
|--------|---------|-------------|--------|
| Layout Order | Media → Process → Answer | Same | ✅ Correct |
| Media Extraction | From tool results | Same | ✅ Working |
| Responsive Design | Mobile-first | Same | ✅ Implemented |
| Section Headers | With icons & counts | Same | ✅ Implemented |
| Visual Separators | Gray divider lines | Same | ✅ Implemented |
| Hover Effects | Subtle shadows | Same | ✅ Implemented |
| Spacing | space-y-4 between sections | Same | ✅ Correct |
| Scrolling | Horizontal for videos | Same | ✅ Implemented |

**Conclusion**: The current implementation is already following the recommended media-first layout strategy! No major changes needed.

---

## Next Steps (Optional Enhancements)

1. **Add "Show More" for Large Collections**
   - Limit initial display to 4 documents
   - Add expandable button

2. **Add Media Filtering**
   - Let users filter by type (videos, documents, images)
   - Toggle visibility

3. **Add Inline Citations**
   - Link text to source cards
   - Show citation numbers [1], [2]

4. **Add Media Preview Modal**
   - Click to expand media in full-screen modal
   - Better viewing experience

5. **Add Analytics**
   - Track which media types users interact with
   - Optimize future layouts

