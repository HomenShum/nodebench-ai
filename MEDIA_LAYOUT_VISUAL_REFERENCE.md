# Media Layout - Visual Reference & Code Examples

## Component Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      UIMessageBubble                            │
│  (Main message container with avatar and content)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐        ┌────────▼──────────┐
        │  Agent Avatar  │        │ Message Content   │
        │  (left side)   │        │  (flex column)    │
        └────────────────┘        └────────┬──────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
            ┌───────▼────────┐    ┌────────▼────────┐    ┌───────▼────────┐
            │ Agent Role     │    │ RichMediaSection│    │ Collapsible    │
            │ Badge          │    │ (MEDIA DISPLAY) │    │ AgentProgress  │
            │ (if special)   │    │                 │    │ (PROCESS)      │
            └────────────────┘    └─────────────────┘    └────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
            ┌───────▼────────┐    ┌────────▼────────┐    ┌───────▼────────┐
            │ VideoCarousel  │    │ SourceGrid     │    │ ImageGallery   │
            │ (horizontal)   │    │ (2 col grid)   │    │ (3 col grid)   │
            └────────────────┘    └─────────────────┘    └────────────────┘
                    │                      │                      │
            ┌───────▼────────┐    ┌────────▼────────┐    ┌───────▼────────┐
            │ VideoCard      │    │ SourceCard     │    │ Image Link     │
            │ (w-64, flex)   │    │ (full width)   │    │ (aspect-square)│
            └────────────────┘    └─────────────────┘    └────────────────┘
```

---

## Message Bubble Layout - Desktop View

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  🤖  ┌────────────────────────────────────────────────────────────┐ │
│      │ 🎬 Coordinator Agent                                       │ │
│      ├────────────────────────────────────────────────────────────┤ │
│      │                                                            │ │
│      │ ▶ Related Videos (5)                                      │ │
│      │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │ │
│      │ │ Video 1      │ │ Video 2      │ │ Video 3      │ ◄─┐   │ │
│      │ │ Thumbnail    │ │ Thumbnail    │ │ Thumbnail    │   │   │ │
│      │ │ Title...     │ │ Title...     │ │ Title...     │   │   │ │
│      │ │ Channel      │ │ Channel      │ │ Channel      │   │   │ │
│      │ └──────────────┘ └──────────────┘ └──────────────┘   │   │ │
│      │                                                  Scroll│   │ │
│      │                                                        │   │ │
│      │ 📄 Sources & Documents (3)                            │   │ │
│      │ ┌──────────────────────────────────────────────────┐  │   │ │
│      │ │ 📋 10-K Filing • Tesla • 2024                   │  │   │ │
│      │ │ sec.gov                                         │  │   │ │
│      │ └──────────────────────────────────────────────────┘  │   │ │
│      │ ┌──────────────────────────────────────────────────┐  │   │ │
│      │ │ 📰 Article • TechCrunch • 2024                  │  │   │ │
│      │ │ techcrunch.com                                  │  │   │ │
│      │ └──────────────────────────────────────────────────┘  │   │ │
│      │                                                        │   │ │
│      │ ⚙️ Show Process (collapsed)                           │   │ │
│      │ [Click to expand reasoning and tool calls]            │   │ │
│      │                                                        │   │ │
│      │ Here's what I found about Tesla's latest financial   │   │ │
│      │ performance. The company reported strong Q4 results  │   │ │
│      │ with revenue up 25% YoY...                           │   │ │
│      │                                                        │   │ │
│      └────────────────────────────────────────────────────────┘ │ │
│                                                                  │ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Message Bubble Layout - Mobile View

```
┌──────────────────────────────────┐
│                                  │
│  🤖  ┌────────────────────────┐  │
│      │ 🎬 Coordinator Agent   │  │
│      ├────────────────────────┤  │
│      │                        │  │
│      │ ▶ Related Videos (5)   │  │
│      │ ┌──────────┐           │  │
│      │ │ Video 1  │ ◄─ Scroll │  │
│      │ │ Thumbnail│    →      │  │
│      │ │ Title    │           │  │
│      │ └──────────┘           │  │
│      │                        │  │
│      │ 📄 Sources (3)         │  │
│      │ ┌────────────────────┐ │  │
│      │ │ 📋 10-K Filing    │ │  │
│      │ │ sec.gov           │ │  │
│      │ └────────────────────┘ │  │
│      │ ┌────────────────────┐ │  │
│      │ │ 📰 Article        │ │  │
│      │ │ techcrunch.com    │ │  │
│      │ └────────────────────┘ │  │
│      │                        │  │
│      │ ⚙️ Show Process        │  │
│      │                        │  │
│      │ Here's what I found   │  │
│      │ about Tesla's latest  │  │
│      │ financial performance │  │
│      │ ...                   │  │
│      │                        │  │
│      └────────────────────────┘  │
│                                  │
└──────────────────────────────────┘
```

---

## Spacing & Sizing Reference

### Container Widths
```
Desktop:
┌─────────────────────────────────────────────────────────┐
│ Message Content (max-w-[80%] = 80% of viewport)        │
│ Typical: 600-800px on 1920px screen                    │
└─────────────────────────────────────────────────────────┘

Mobile:
┌──────────────────────────────────┐
│ Message Content (max-w-[80%])    │
│ Typical: 240-320px on 375px      │
└──────────────────────────────────┘
```

### Spacing Values
```
space-y-4 = 1rem = 16px (between media sections)
mb-4 = 1rem = 16px (between media and answer)
mb-3 = 0.75rem = 12px (between header and content)
gap-3 = 0.75rem = 12px (between video cards)
gap-2 = 0.5rem = 8px (between image thumbnails)
px-4 = 1rem = 16px (horizontal padding in answer box)
py-2 = 0.5rem = 8px (vertical padding in answer box)
```

### Card Dimensions
```
Video Card:
- Width: w-64 = 256px (fixed, flex-shrink-0)
- Aspect Ratio: aspect-video = 16:9
- Height: 144px (256px * 9/16)
- Padding: p-3 = 12px
- Border Radius: rounded-lg = 8px

Source Card:
- Width: Full width of grid column
- Min Height: 100px (flex layout)
- Padding: p-3 = 12px
- Border Radius: rounded-lg = 8px
- Icon Size: w-16 h-16 = 64px

Image Thumbnail:
- Aspect Ratio: aspect-square = 1:1
- Desktop: 3 columns (grid-cols-3)
- Mobile: 2 columns (grid-cols-2)
- Gap: gap-2 = 8px
- Border Radius: rounded-lg = 8px
```

---

## Color & Styling Reference

### Borders & Backgrounds
```
Default State:
- Border: border-gray-200 (light gray)
- Background: bg-white
- Shadow: shadow-sm (subtle)

Hover State:
- Border: hover:border-gray-300 (darker gray)
- Shadow: hover:shadow-md (more prominent)
- Transition: transition-all duration-200

Streaming State:
- Background: bg-green-50
- Border: border-green-200

Failed State:
- Background: bg-red-50
- Border: border-red-200
```

### Text Styling
```
Section Headers:
- Size: text-sm = 14px
- Weight: font-semibold = 600
- Color: text-gray-700 (dark gray)

Count Badges:
- Size: text-xs = 12px
- Weight: font-normal = 400
- Color: text-gray-500 (medium gray)

Card Titles:
- Size: text-sm = 14px
- Weight: font-medium = 500
- Color: text-gray-900 (very dark)
- Hover: group-hover:text-blue-600

Card Descriptions:
- Size: text-xs = 12px
- Weight: font-normal = 400
- Color: text-gray-600 (medium gray)
```

### Icons
```
Section Icons:
- Play (videos): h-4 w-4 text-red-600
- FileText (documents): h-4 w-4 text-blue-600
- Image (images): h-4 w-4 text-purple-600

External Link Indicator:
- Size: h-3 w-3
- Color: text-gray-700
- Background: bg-white/90 backdrop-blur-sm
- Padding: p-1.5
- Border Radius: rounded-full
- Opacity: opacity-0 group-hover:opacity-100
```

---

## Responsive Breakpoints

### Tailwind Breakpoints Used
```
Mobile (default, < 768px):
- Video carousel: horizontal scroll (no change)
- Source grid: grid-cols-1 (1 column)
- Image grid: grid-cols-2 (2 columns)
- Message width: max-w-[80%] (full width minus margins)

Tablet (md:, 768px - 1024px):
- Video carousel: horizontal scroll (no change)
- Source grid: md:grid-cols-2 (2 columns)
- Image grid: md:grid-cols-3 (3 columns)
- Message width: max-w-[80%] (same)

Desktop (lg:, > 1024px):
- All layouts same as tablet
- Message width: max-w-[80%] (same)
```

---

## Code Structure in UIMessageBubble.tsx

### Current Implementation (Lines 520-686)
```typescript
// 1. Avatar (left side)
{!isUser && <Avatar />}

// 2. Message Content Container
<div className="flex flex-col gap-2 max-w-[80%]">
  
  // 3. Agent Role Badge
  {roleConfig && <RoleBadge />}
  
  // 4. MEDIA DISPLAY (RichMediaSection)
  {!isUser && <RichMediaSection media={extractedMedia} />}
  
  // 5. PROCESS DETAILS (CollapsibleAgentProgress)
  {!isUser && <CollapsibleAgentProgress {...props} />}
  
  // 6. Entity Selection Cards
  {toolParts.map(part => <ToolOutputRenderer />)}
  
  // 7. File Parts
  {fileParts.map(part => <FileDisplay />)}
  
  // 8. MAIN ANSWER TEXT
  {(cleanedText || visibleText) && <AnswerText />}
  
  // 9. Status & Actions
  <StatusIndicator />
</div>
```

---

## RichMediaSection Internal Structure

```typescript
<div className="space-y-4 mb-4">
  {/* Videos: space-y-4 = 1rem gap */}
  {youtubeVideos.length > 0 && (
    <VideoCarousel videos={youtubeVideos} />
  )}
  
  {/* Documents: space-y-4 = 1rem gap */}
  {sources.length > 0 && (
    <SourceGrid sources={sources} />
  )}
  
  {/* Images: space-y-4 = 1rem gap */}
  {images.length > 0 && (
    <ImageGallery images={images} />
  )}
</div>
```

---

## Section Header Pattern

```typescript
// Used in VideoCarousel, SourceGrid, ImageGallery
<div className="flex items-center gap-2 mb-3">
  {/* Left divider line */}
  <div className="h-px flex-1 bg-gray-200"></div>
  
  {/* Header text with icon and count */}
  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
    <Play className="h-4 w-4 text-red-600" />
    Related Videos
    <span className="text-xs font-normal text-gray-500">({count})</span>
  </h3>
  
  {/* Right divider line */}
  <div className="h-px flex-1 bg-gray-200"></div>
</div>
```

---

## Hover Effects & Transitions

### Card Hover Pattern
```typescript
className={cn(
  "group block rounded-lg border border-gray-200",
  "hover:border-gray-300",           // Border darkens
  "transition-all duration-200",     // Smooth animation
  "hover:shadow-md",                 // Shadow appears
  "bg-white"
)}

// Child elements can use group-hover:
<h3 className="group-hover:text-blue-600">Title</h3>
<div className="opacity-0 group-hover:opacity-100">Icon</div>
```

---

## Performance Optimizations

### Lazy Loading
```typescript
// Images
<img src={url} loading="lazy" />

// Videos
<img src={thumbnail} loading="lazy" />
```

### Memoization
```typescript
// Media extraction (lines 476-511)
const extractedMedia = useMemo(() => {
  // Extract from tool results
}, [message.parts, isUser]);

// Text cleaning
const cleanedText = useMemo(() => {
  // Remove media markers
}, [visibleText]);
```

### Conditional Rendering
```typescript
// Only render if media exists
if (!hasMedia) return null;

// Only render sections with content
{youtubeVideos.length > 0 && <VideoCarousel />}
{sources.length > 0 && <SourceGrid />}
{images.length > 0 && <ImageGallery />}
```

---

## Summary: Key Takeaways

1. **Layout Order**: Media → Process → Answer (already correct)
2. **Spacing**: space-y-4 (1rem) between sections
3. **Responsive**: Mobile-first with md: breakpoints
4. **Cards**: Rounded corners, subtle shadows, hover effects
5. **Headers**: Icons + text + count with divider lines
6. **Performance**: Lazy loading, memoization, conditional rendering
7. **Accessibility**: Alt text, semantic HTML, keyboard navigation

**Status**: ✅ Current implementation matches all recommendations!

