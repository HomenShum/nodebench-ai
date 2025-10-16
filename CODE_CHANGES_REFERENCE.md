# Code Changes Reference - Issues Fixed

## File 1: `convex/tools/secFilingTools.ts`

### Change 1: Ticker Lookup Error Handling (lines 125-133)

**Location**: `searchSecFilings()` function, ticker lookup section

**Before**:
```typescript
const tickerData = await tickerResponse.json();
cik = tickerData?.cik || null;
```

**After**:
```typescript
// Check content type to ensure we got JSON, not HTML
const contentType = tickerResponse.headers.get('content-type') || '';
if (!contentType.includes('application/json')) {
  console.error(`[searchSecFilings] Expected JSON but got ${contentType}`);
  return `SEC API returned unexpected content type. The ticker lookup service may be temporarily unavailable. Please try again in a moment.`;
}

let tickerData;
try {
  tickerData = await tickerResponse.json();
} catch (parseError) {
  console.error(`[searchSecFilings] Failed to parse ticker response:`, parseError);
  return `Failed to parse SEC API response for ticker ${args.ticker}. The service may be temporarily unavailable.`;
}

cik = tickerData?.cik || null;
```

### Change 2: Main API Call Error Handling (lines 160-168)

**Location**: `searchSecFilings()` function, main submissions API call

**Before**:
```typescript
const data = await response.json();
```

**After**:
```typescript
// Check content type to ensure we got JSON, not HTML
const contentType = response.headers.get('content-type') || '';
if (!contentType.includes('application/json')) {
  console.error(`[searchSecFilings] Expected JSON but got ${contentType}`);
  return `SEC API returned unexpected content type. The service may be temporarily unavailable. Please try again in a moment.`;
}

let data;
try {
  data = await response.json();
} catch (parseError) {
  console.error(`[searchSecFilings] Failed to parse SEC response:`, parseError);
  return `Failed to parse SEC API response. The service may be temporarily unavailable.`;
}
```

### Change 3: Company Info Error Handling (lines 368-376)

**Location**: `getCompanyInfo()` function, both ticker lookup and company data fetch

**Ticker Lookup**:
```typescript
// Check content type
const contentType = tickerResponse.headers.get('content-type') || '';
if (!contentType.includes('application/json')) {
  console.error(`[getCompanyInfo] Expected JSON but got ${contentType}`);
  return `SEC API returned unexpected content type. Please try again in a moment.`;
}

let tickerData;
try {
  tickerData = await tickerResponse.json();
} catch (parseError) {
  console.error(`[getCompanyInfo] Failed to parse ticker response:`, parseError);
  return `Failed to parse SEC API response for ticker ${args.ticker}.`;
}
```

**Company Data Fetch**:
```typescript
// Check content type
const contentType = response.headers.get('content-type') || '';
if (!contentType.includes('application/json')) {
  console.error(`[getCompanyInfo] Expected JSON but got ${contentType}`);
  return `SEC API returned unexpected content type. Please try again in a moment.`;
}

let data;
try {
  data = await response.json();
} catch (parseError) {
  console.error(`[getCompanyInfo] Failed to parse response:`, parseError);
  return `Failed to parse SEC API response.`;
}
```

---

## File 2: `src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx`

### Change: Media Extraction from Tool Results (lines 476-511)

**Location**: `UIMessageBubble` component, media extraction section

**Before**:
```typescript
// Extract media from final answer text for polished display
const extractedMedia = useMemo(() => {
  return extractMediaFromText(visibleText || '');
}, [visibleText]);

// Clean text by removing media markers
const cleanedText = useMemo(() => {
  return removeMediaMarkersFromText(visibleText || '');
}, [visibleText]);
```

**After**:
```typescript
// Extract media from tool results (not from final text, since agent synthesizes new answer)
// Tool results are stored in message.parts and contain the raw tool output with media markers
const extractedMedia = useMemo(() => {
  if (isUser) return { youtubeVideos: [], secDocuments: [], images: [] };
  
  // Extract all tool-result parts from message
  const toolResultParts = message.parts.filter((p): p is any => 
    p.type === 'tool-result'
  );
  
  // Combine media from all tool results
  const combinedMedia = toolResultParts.reduce((acc, part) => {
    const resultText = String(part.result || '');
    const media = extractMediaFromText(resultText);
    
    return {
      youtubeVideos: [...acc.youtubeVideos, ...media.youtubeVideos],
      secDocuments: [...acc.secDocuments, ...media.secDocuments],
      images: [...acc.images, ...media.images],
    };
  }, { youtubeVideos: [], secDocuments: [], images: [] });
  
  console.log('[UIMessageBubble] Extracted media from tool results:', {
    toolResultCount: toolResultParts.length,
    youtubeCount: combinedMedia.youtubeVideos.length,
    secCount: combinedMedia.secDocuments.length,
    imageCount: combinedMedia.images.length,
  });
  
  return combinedMedia;
}, [message.parts, isUser]);

// Clean text by removing media markers (for display purposes)
const cleanedText = useMemo(() => {
  return removeMediaMarkersFromText(visibleText || '');
}, [visibleText]);
```

---

## Summary of Changes

### Issue 1: SEC Filing Error (3 locations)
- **Pattern**: Add content-type check + try-catch for JSON parsing
- **Benefit**: Graceful error handling instead of JSON parse crash
- **Files**: `convex/tools/secFilingTools.ts`
- **Functions**: `searchSecFilings()`, `getCompanyInfo()`

### Issue 2: Media Not Displaying (1 location)
- **Pattern**: Extract media from `message.parts` instead of `visibleText`
- **Benefit**: Preserves media markers from tool output
- **Files**: `src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx`
- **Function**: `UIMessageBubble` component

---

## Testing the Changes

### Test Issue 1 Fix
```
Query: "Find SEC filings for AAPL"
Expected: List of filings OR friendly error message
NOT: JSON parse error
```

### Test Issue 2 Fix
```
Query: "Find YouTube videos about AI"
Expected: 
  - Console shows: "[UIMessageBubble] Extracted media from tool results: {toolResultCount: 1, youtubeCount: 5, ...}"
  - RichMediaSection renders
  - VideoCarousel displays video cards

Query: "Get Tesla's latest 10-K"
Expected:
  - Console shows: "[UIMessageBubble] Extracted media from tool results: {toolResultCount: 1, secCount: 1, ...}"
  - RichMediaSection renders
  - SourceGrid displays SEC document card
```

---

## Rollback Instructions

If needed to rollback:

### For Issue 1
Remove the content-type checks and try-catch blocks, revert to:
```typescript
const tickerData = await tickerResponse.json();
const data = await response.json();
```

### For Issue 2
Revert media extraction to:
```typescript
const extractedMedia = useMemo(() => {
  return extractMediaFromText(visibleText || '');
}, [visibleText]);
```

---

## Performance Impact

- **Issue 1**: Minimal - just adds header check and error handling
- **Issue 2**: Minimal - filters message.parts array (typically 5-10 items)
- **Overall**: No noticeable performance impact

---

## Browser Compatibility

- **Issue 1**: All browsers (uses standard fetch API)
- **Issue 2**: All browsers (uses standard array methods)
- **Overall**: No compatibility issues

