# Media Layout - Tailwind CSS & Styling Guide

## Current Tailwind Classes Used

### RichMediaSection Container
```typescript
<div className="space-y-4 mb-4">
  {/* space-y-4 = 1rem gap between children */}
  {/* mb-4 = 1rem margin-bottom (gap to answer text) */}
</div>
```

### VideoCarousel
```typescript
// Header
<div className="flex items-center gap-2 mb-3">
  <div className="h-px flex-1 bg-gray-200"></div>
  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
    <Play className="h-4 w-4 text-red-600" />
    Related Videos
    <span className="text-xs font-normal text-gray-500">({videos.length})</span>
  </h3>
  <div className="h-px flex-1 bg-gray-200"></div>
</div>

// Carousel container
<div className="overflow-x-auto pb-2 -mx-1">
  <div className="flex gap-3 px-1" style={{ minWidth: 'min-content' }}>
    {/* Cards: flex-shrink-0 w-64 */}
  </div>
</div>
```

### VideoCard
```typescript
<a className={cn(
  "group block rounded-lg overflow-hidden border border-gray-200",
  "hover:border-gray-300 transition-all duration-200 hover:shadow-md",
  "bg-white",
  "flex-shrink-0 w-64"  // Fixed width for carousel
)}>
  {/* Thumbnail: aspect-video */}
  <div className="relative aspect-video bg-gray-100">
    <img className="w-full h-full object-cover" />
    
    {/* Play button overlay */}
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30">
      <div className="w-12 h-12 rounded-full bg-red-600 group-hover:bg-red-700 flex items-center justify-center shadow-lg">
        <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
      </div>
    </div>
  </div>
  
  {/* Metadata */}
  <div className="p-3">
    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600">
      {video.title}
    </h3>
    <p className="text-xs text-gray-600 line-clamp-1">
      {video.channel}
    </p>
  </div>
  
  {/* External link indicator */}
  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
    <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm">
      <ExternalLink className="h-3 w-3 text-gray-700" />
    </div>
  </div>
</a>
```

### SourceCard
```typescript
<a className={cn(
  "group block rounded-lg border border-gray-200",
  "hover:border-gray-300 transition-all duration-200 hover:shadow-md",
  "bg-white overflow-hidden"
)}>
  <div className="flex gap-3 p-3">
    {/* Icon/Preview */}
    <div className="flex-shrink-0">
      {previewImage ? (
        <img className="w-16 h-16 rounded object-cover bg-gray-100" />
      ) : (
        <div className={cn(
          "w-16 h-16 rounded flex items-center justify-center",
          isSEC ? "bg-blue-50" : "bg-gray-50"
        )}>
          {isSEC ? (
            <FileText className="h-8 w-8 text-blue-600" />
          ) : (
            <Globe className="h-8 w-8 text-gray-400" />
          )}
        </div>
      )}
    </div>
    
    {/* Content */}
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600">
        {source.title}
      </h3>
      <p className="text-xs text-gray-600 line-clamp-1">
        {description}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        {domain}
      </p>
    </div>
  </div>
</a>
```

### SourceGrid
```typescript
<div className="mb-4">
  {/* Header */}
  <div className="flex items-center gap-2 mb-3">
    <div className="h-px flex-1 bg-gray-200"></div>
    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
      <FileText className="h-4 w-4 text-blue-600" />
      Sources & Documents
      <span className="text-xs font-normal text-gray-500">({sources.length})</span>
    </h3>
    <div className="h-px flex-1 bg-gray-200"></div>
  </div>
  
  {/* Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {sources.map(source => <SourceCard key={source.url} source={source} />)}
  </div>
</div>
```

### ImageGallery
```typescript
<div className="mb-4">
  {/* Header */}
  <div className="flex items-center gap-2 mb-3">
    <div className="h-px flex-1 bg-gray-200"></div>
    <h3 className="text-sm font-semibold text-gray-700">
      Images
      <span className="text-xs font-normal text-gray-500 ml-2">({images.length})</span>
    </h3>
    <div className="h-px flex-1 bg-gray-200"></div>
  </div>
  
  {/* Grid */}
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
    {images.map((img, idx) => (
      <a
        key={idx}
        href={img.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 transition-all hover:shadow-md"
      >
        <img
          src={img.url}
          alt={img.alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </a>
    ))}
  </div>
</div>
```

---

## Tailwind Class Reference

### Spacing
```
mb-4    = margin-bottom: 1rem (16px)
mb-3    = margin-bottom: 0.75rem (12px)
mb-2    = margin-bottom: 0.5rem (8px)
mb-1    = margin-bottom: 0.25rem (4px)

space-y-4 = gap between children: 1rem (16px)
space-y-2 = gap between children: 0.5rem (8px)

gap-3   = gap: 0.75rem (12px)
gap-2   = gap: 0.5rem (8px)

px-4    = padding-left/right: 1rem (16px)
py-2    = padding-top/bottom: 0.5rem (8px)
p-3     = padding: 0.75rem (12px)
p-1.5   = padding: 0.375rem (6px)
```

### Sizing
```
w-64    = width: 16rem (256px)
w-16    = width: 4rem (64px)
w-12    = width: 3rem (48px)
w-8     = width: 2rem (32px)
w-4     = width: 1rem (16px)
w-3     = width: 0.75rem (12px)

h-px    = height: 1px (divider lines)
h-16    = height: 4rem (64px)
h-12    = height: 3rem (48px)
h-8     = height: 2rem (32px)
h-6     = height: 1.5rem (24px)
h-4     = height: 1rem (16px)
h-3     = height: 0.75rem (12px)

aspect-video = aspect-ratio: 16/9
aspect-square = aspect-ratio: 1/1
```

### Borders & Shadows
```
border              = border: 1px solid
border-gray-200     = border-color: #e5e7eb (light gray)
border-gray-300     = border-color: #d1d5db (medium gray)

rounded-lg          = border-radius: 0.5rem (8px)
rounded-full        = border-radius: 9999px (circle)

shadow-sm           = box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05)
shadow-md           = box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1)

hover:shadow-md     = shadow-md on hover
hover:border-gray-300 = darker border on hover
```

### Colors
```
bg-white            = background: white
bg-gray-50          = background: #f9fafb (very light gray)
bg-gray-100         = background: #f3f4f6 (light gray)
bg-blue-50          = background: #eff6ff (light blue)
bg-blue-600         = background: #2563eb (medium blue)
bg-red-600          = background: #dc2626 (red)
bg-red-700          = background: #b91c1c (dark red)
bg-green-50         = background: #f0fdf4 (light green)
bg-green-200        = background: #bbf7d0 (medium green)
bg-black/20         = background: rgba(0,0,0,0.2) (20% opacity)
bg-black/30         = background: rgba(0,0,0,0.3) (30% opacity)
bg-white/90         = background: rgba(255,255,255,0.9) (90% opacity)

text-gray-900       = color: #111827 (very dark gray)
text-gray-700       = color: #374151 (dark gray)
text-gray-600       = color: #4b5563 (medium gray)
text-gray-500       = color: #6b7280 (light gray)
text-blue-600       = color: #2563eb (blue)
text-red-600        = color: #dc2626 (red)
text-white          = color: white

text-sm             = font-size: 0.875rem (14px)
text-xs             = font-size: 0.75rem (12px)

font-semibold       = font-weight: 600
font-medium         = font-weight: 500
font-normal         = font-weight: 400
```

### Flexbox & Grid
```
flex                = display: flex
flex-col            = flex-direction: column
flex-1              = flex: 1 (grow to fill)
flex-shrink-0       = flex-shrink: 0 (don't shrink)
items-center        = align-items: center
justify-center      = justify-content: center
gap-2               = gap: 0.5rem (8px)
gap-3               = gap: 0.75rem (12px)

grid                = display: grid
grid-cols-1         = grid-template-columns: repeat(1, minmax(0, 1fr))
grid-cols-2         = grid-template-columns: repeat(2, minmax(0, 1fr))
grid-cols-3         = grid-template-columns: repeat(3, minmax(0, 1fr))
md:grid-cols-2      = 2 columns on tablet+
md:grid-cols-3      = 3 columns on tablet+
```

### Responsive
```
md:                 = @media (min-width: 768px)
lg:                 = @media (min-width: 1024px)
xl:                 = @media (min-width: 1280px)

md:grid-cols-2      = 2 columns on tablet and up
md:grid-cols-3      = 3 columns on tablet and up
```

### Transitions & Effects
```
transition-all      = transition: all
duration-200        = transition-duration: 200ms
opacity-0           = opacity: 0
opacity-100         = opacity: 1
group-hover:        = applies on parent hover
line-clamp-1        = max 1 line, overflow hidden
line-clamp-2        = max 2 lines, overflow hidden
overflow-hidden     = overflow: hidden
overflow-x-auto     = overflow-x: auto (horizontal scroll)
```

### Utilities
```
inset-0             = top: 0; right: 0; bottom: 0; left: 0;
absolute            = position: absolute
relative            = position: relative
block               = display: block
object-cover        = object-fit: cover
min-w-0             = min-width: 0 (allows flex shrinking)
max-w-[80%]         = max-width: 80%
whitespace-pre-wrap = white-space: pre-wrap
```

---

## Optional Enhancements

### 1. Add "Show More" Button for Large Collections
```typescript
// In SourceGrid or ImageGallery
const [showAll, setShowAll] = useState(false);
const itemsToShow = showAll ? sources : sources.slice(0, 4);

return (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {itemsToShow.map(source => <SourceCard key={source.url} source={source} />)}
    </div>
    
    {sources.length > 4 && (
      <button
        onClick={() => setShowAll(!showAll)}
        className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        {showAll ? 'Show less' : `Show ${sources.length - 4} more`}
      </button>
    )}
  </>
);
```

### 2. Add Media Type Filtering
```typescript
const [filter, setFilter] = useState<'all' | 'videos' | 'documents' | 'images'>('all');

const filteredMedia = useMemo(() => {
  if (filter === 'all') return extractedMedia;
  if (filter === 'videos') return { ...extractedMedia, secDocuments: [], images: [] };
  if (filter === 'documents') return { ...extractedMedia, youtubeVideos: [], images: [] };
  if (filter === 'images') return { ...extractedMedia, youtubeVideos: [], secDocuments: [] };
  return extractedMedia;
}, [extractedMedia, filter]);

// Filter buttons
<div className="flex gap-2 mb-3">
  {['all', 'videos', 'documents', 'images'].map(type => (
    <button
      key={type}
      onClick={() => setFilter(type as any)}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium transition-colors",
        filter === type
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      )}
    >
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </button>
  ))}
</div>
```

### 3. Add Inline Citations
```typescript
// Link text to source cards
const citationMap = new Map();
extractedMedia.secDocuments.forEach((doc, idx) => {
  citationMap.set(doc.accessionNumber, idx + 1);
});

// In answer text, replace references with citations
const answerWithCitations = cleanedText.replace(
  /\[(\d+)-K\]/g,
  (match, year) => `[${citationMap.get(match) || '?'}]`
);
```

### 4. Add Media Preview Modal
```typescript
const [selectedMedia, setSelectedMedia] = useState<any>(null);

return (
  <>
    {/* Media sections with onClick handlers */}
    <VideoCard
      video={video}
      onClick={() => setSelectedMedia({ type: 'video', data: video })}
    />
    
    {/* Modal */}
    {selectedMedia && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full mx-4">
          {/* Modal content */}
        </div>
      </div>
    )}
  </>
);
```

---

## Performance Tips

### 1. Use Lazy Loading
```typescript
<img src={url} loading="lazy" />
```

### 2. Optimize Images
```typescript
// Use responsive images
<img
  src={url}
  srcSet={`${url}?w=256 256w, ${url}?w=512 512w`}
  sizes="(max-width: 768px) 256px, 512px"
/>
```

### 3. Memoize Components
```typescript
export const VideoCard = React.memo(function VideoCard({ video }: VideoCardProps) {
  // Component code
});
```

### 4. Use CSS Containment
```typescript
className="contain-layout contain-paint"
```

---

## Accessibility Checklist

- [ ] Alt text for all images
- [ ] ARIA labels for sections
- [ ] Keyboard navigation (Tab through cards)
- [ ] Color contrast (WCAG AA minimum)
- [ ] Focus indicators visible
- [ ] Screen reader support
- [ ] Semantic HTML (links, headings)

---

## Summary

**Current Implementation**: ✅ All recommended Tailwind classes are already in use

**Key Classes**:
- `space-y-4` - Spacing between media sections
- `grid grid-cols-1 md:grid-cols-2` - Responsive grid
- `overflow-x-auto` - Horizontal scroll for videos
- `group hover:` - Hover effects
- `transition-all duration-200` - Smooth animations
- `line-clamp-2` - Text truncation
- `aspect-video` / `aspect-square` - Aspect ratios

**No changes needed** - the current implementation is optimal!

