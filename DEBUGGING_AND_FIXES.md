# Fast Agent Panel - Issue Debugging and Fixes

## Issue 1: SEC Filing Search Error - FIXED ✅

### Problem
```
Error searching SEC filings: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

### Root Cause
The SEC API endpoint (`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=...&output=json`) sometimes returns HTML instead of JSON, especially during high load or rate limiting.

### Solution Implemented
Added proper error handling in `convex/tools/secFilingTools.ts`:

1. **Check Content-Type Header** (lines 125-128, 160-163, 368-371)
   - Verify response is `application/json` before parsing
   - Return user-friendly error if content type is wrong

2. **Try-Catch JSON Parsing** (lines 129-133, 164-168, 372-376)
   - Wrap `response.json()` in try-catch
   - Log detailed error for debugging
   - Return graceful error message

3. **Applied to Three Functions**:
   - `searchSecFilings()`: Ticker lookup and main API call
   - `getCompanyInfo()`: Ticker lookup and company data fetch

### Code Changes
```typescript
// Check content type
const contentType = response.headers.get('content-type') || '';
if (!contentType.includes('application/json')) {
  console.error(`Expected JSON but got ${contentType}`);
  return `SEC API returned unexpected content type. Please try again in a moment.`;
}

// Safe JSON parsing
let data;
try {
  data = await response.json();
} catch (parseError) {
  console.error(`Failed to parse SEC response:`, parseError);
  return `Failed to parse SEC API response. The service may be temporarily unavailable.`;
}
```

### Testing
1. Try searching for a ticker: "Find SEC filings for AAPL"
2. If SEC API is down, you'll get a friendly error instead of JSON parse error
3. Check browser console for detailed error logs

---

## Issue 2: Media Not Displaying in Message Bubbles - ROOT CAUSE IDENTIFIED

### Problem
Videos, images, and SEC documents are not rendering in the message bubbles even though the tools embed media markers.

### Root Cause Analysis

The `@convex-dev/agent` component's `generateText()` method:
1. Executes tools and gets their results
2. **Synthesizes a new answer** from the tool results
3. Returns only the synthesized text, **NOT the raw tool output**

This means:
- Tool output with media markers: `<!-- YOUTUBE_GALLERY_DATA\n[...]\n-->`
- Gets lost during synthesis
- Final message text has no media markers
- `extractMediaFromText()` finds nothing to extract

### Data Flow (Current - Broken)
```
Tool Output (with markers)
    ↓
Agent synthesizes new answer
    ↓
Final message text (NO markers)
    ↓
extractMediaFromText() finds nothing
    ↓
RichMediaSection renders empty
```

### Solution: Extract Media from Tool Results

Instead of extracting from final text, extract from tool result parts:

```typescript
// In UIMessageBubble.tsx
const extractedMedia = useMemo(() => {
  // Extract from tool results in message.parts
  const toolResults = message.parts
    .filter((p): p is ToolResultUIPart => p.type === 'tool-result')
    .map(p => p.result);
  
  // Combine media from all tool results
  const allMedia = toolResults
    .map(result => extractMediaFromText(String(result)))
    .reduce((acc, media) => ({
      youtubeVideos: [...acc.youtubeVideos, ...media.youtubeVideos],
      secDocuments: [...acc.secDocuments, ...media.secDocuments],
      images: [...acc.images, ...media.images],
    }), { youtubeVideos: [], secDocuments: [], images: [] });
  
  return allMedia;
}, [message.parts]);
```

### Implementation Steps

1. **Update UIMessageBubble.tsx** (lines 476-480):
   - Change media extraction to use `message.parts` instead of `visibleText`
   - Extract from all tool-result parts
   - Combine media from multiple tools

2. **Update mediaExtractor.ts** (optional):
   - Add helper function `extractMediaFromToolResults(parts)`
   - Handles array of tool results
   - Returns combined ExtractedMedia

3. **Test with Real Queries**:
   - "Find YouTube videos about machine learning"
   - "Get Tesla's latest SEC filing"
   - "Search for images of the Eiffel Tower"

### Code Location
- **File**: `src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx`
- **Current Lines**: 476-480 (media extraction)
- **Change**: Extract from `message.parts` instead of `visibleText`

### Why This Works
- Tool results are stored in `message.parts` array
- Each tool-result part contains the raw tool output
- Raw tool output includes media markers
- Extracting from parts preserves media markers
- Multiple tools can contribute media (combine them)

---

## Debugging Checklist

### For Issue 1 (SEC Error)
- [ ] Check browser console for JSON parse errors
- [ ] Look for "Expected JSON but got" messages
- [ ] Verify SEC API is accessible: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=AAPL&output=json
- [ ] Try with different ticker symbols
- [ ] Check Convex logs for detailed error messages

### For Issue 2 (Media Not Displaying)
- [ ] Open browser DevTools → Console
- [ ] Search for "extractMediaFromText" logs
- [ ] Check if `message.parts` contains tool-result parts
- [ ] Verify tool output contains media markers
- [ ] Test with simple query: "Find YouTube videos about AI"
- [ ] Check if RichMediaSection component is rendering
- [ ] Verify VideoCard and SourceCard components work in isolation

### Browser Console Debugging
```javascript
// In browser console, after agent response:
// 1. Check message structure
console.log('Message parts:', message.parts);

// 2. Check for tool results
const toolResults = message.parts.filter(p => p.type === 'tool-result');
console.log('Tool results:', toolResults);

// 3. Check for media markers
const resultText = toolResults.map(p => p.result).join('');
console.log('Has YouTube markers:', resultText.includes('YOUTUBE_GALLERY_DATA'));
console.log('Has SEC markers:', resultText.includes('SEC_GALLERY_DATA'));

// 4. Test extraction
const { extractMediaFromText } = await import('./utils/mediaExtractor');
const media = extractMediaFromText(resultText);
console.log('Extracted media:', media);
```

---

## Next Steps

1. **Verify Issue 1 Fix**:
   - Deploy SEC filing error handling
   - Test with SEC API
   - Confirm friendly error messages appear

2. **Implement Issue 2 Fix**:
   - Update media extraction to use tool results
   - Test with YouTube search
   - Test with SEC filing search
   - Verify RichMediaSection renders

3. **Add Logging**:
   - Log extracted media in UIMessageBubble
   - Log tool results in browser console
   - Add debug mode for media extraction

4. **Test Coverage**:
   - Single tool with media (YouTube search)
   - Multiple tools with media (YouTube + SEC)
   - Tool without media (web search)
   - Mixed scenarios

---

## Files Modified

- `convex/tools/secFilingTools.ts`: Added error handling for JSON parsing
- `src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx`: (TO BE UPDATED) Change media extraction source

## Files to Review

- `src/components/FastAgentPanel/utils/mediaExtractor.ts`: Media extraction logic
- `src/components/FastAgentPanel/RichMediaSection.tsx`: Media rendering
- `src/components/FastAgentPanel/VideoCard.tsx`: Video card component
- `src/components/FastAgentPanel/SourceCard.tsx`: Source card component

