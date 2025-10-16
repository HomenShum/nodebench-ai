# Exact Code Changes - Side by Side Comparison

## Issue 1: SEC Filing Error - Error Handling

### Location 1: `convex/tools/secFilingTools.ts` - Lines 125-133

#### BEFORE (Broken)
```typescript
const tickerData = await tickerResponse.json();
cik = tickerData?.cik || null;

if (!cik) {
  return `Could not find CIK for ticker ${args.ticker}. Please verify the ticker symbol.`;
}
```

#### AFTER (Fixed)
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

if (!cik) {
  return `Could not find CIK for ticker ${args.ticker}. Please verify the ticker symbol.`;
}
```

---

### Location 2: `convex/tools/secFilingTools.ts` - Lines 160-168

#### BEFORE (Broken)
```typescript
const data = await response.json();
if (!companyName) {
  companyName = data.name || "Unknown Company";
}
```

#### AFTER (Fixed)
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

if (!companyName) {
  companyName = data.name || "Unknown Company";
}
```

---

### Location 3: `convex/tools/secFilingTools.ts` - Lines 368-376

#### BEFORE (Broken)
```typescript
const tickerData = await tickerResponse.json();
cik = tickerData?.cik || null;
```

#### AFTER (Fixed)
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

cik = tickerData?.cik || null;
```

---

## Issue 2: Media Not Displaying - Extraction Source

### Location: `src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx` - Lines 476-511

#### BEFORE (Broken)
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

#### AFTER (Fixed)
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

## Key Differences

### Issue 1: Error Handling Pattern
| Aspect | Before | After |
|--------|--------|-------|
| Content-Type Check | ❌ None | ✅ Added |
| JSON Parsing | Direct `await response.json()` | Wrapped in try-catch |
| Error Message | JSON parse error | User-friendly message |
| Logging | ❌ None | ✅ Detailed console logs |

### Issue 2: Media Extraction Source
| Aspect | Before | After |
|--------|--------|-------|
| Source | `visibleText` (final answer) | `message.parts` (tool results) |
| Filtering | ❌ None | ✅ Filter tool-result parts |
| Combining | ❌ Single source | ✅ Combine multiple tools |
| Logging | ❌ None | ✅ Debug logs with counts |

---

## Testing the Changes

### Test Issue 1
```bash
# In browser console after SEC filing search
console.log('Check for error messages');
// Should see friendly error, not JSON parse error
```

### Test Issue 2
```bash
# In browser console after YouTube search
console.log('Check for extraction logs');
// Should see: "[UIMessageBubble] Extracted media from tool results: {toolResultCount: 1, youtubeCount: 5, ...}"
```

---

## Deployment Checklist

- [ ] Review both code changes
- [ ] Verify no syntax errors
- [ ] Test Issue 1 fix with SEC API
- [ ] Test Issue 2 fix with YouTube search
- [ ] Check console logs appear
- [ ] Verify media displays correctly
- [ ] Test on mobile viewport
- [ ] Monitor for errors in production

---

## Rollback Instructions

If needed to revert:

### Issue 1 Rollback
Remove the content-type checks and try-catch blocks in `convex/tools/secFilingTools.ts`

### Issue 2 Rollback
Revert media extraction in `src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx` to:
```typescript
const extractedMedia = useMemo(() => {
  return extractMediaFromText(visibleText || '');
}, [visibleText]);
```

---

## Performance Impact

- **Issue 1**: Negligible - just adds header check
- **Issue 2**: Negligible - filters small array (5-10 items)
- **Overall**: No measurable performance impact

---

## Browser Compatibility

- **Issue 1**: All modern browsers (uses standard fetch API)
- **Issue 2**: All modern browsers (uses standard array methods)
- **Overall**: No compatibility issues

