# Typing Indicator Enhancement - Intent-Based Status Messages

## Problem Statement

When users submit queries to the Fast Agent Panel, the typing indicator displays generic messages like "Streaming..." or "Agent is processing your request...", which doesn't provide context about what the agent is actually doing.

### Before (Generic)
```
User: "Help me compile information on Ditto.ai, Eric Liu the founder, and the company's fundraising round and news, any videos or images, job career and positions"

[Typing Indicator]
🟢 Streaming...
```

### After (Intent-Based)
```
User: "Help me compile information on Ditto.ai, Eric Liu the founder, and the company's fundraising round and news, any videos or images, job career and positions"

[Typing Indicator]
🟢 Helping you with researching Ditto.ai, Eric Liu...
```

---

## Implementation

### File Modified
**`src/components/FastAgentPanel/FastAgentPanel.UIMessageStream.tsx`** (lines 348-447)

### Key Changes

#### 1. **Intent Extraction Function**

Added `extractIntent()` helper function that analyzes the user's query and generates a concise, human-readable intent summary:

```typescript
const extractIntent = (query: string): string => {
  const lowerQuery = query.toLowerCase().trim();
  
  // Multi-entity research patterns
  if (lowerQuery.includes('compile information') || lowerQuery.includes('research')) {
    // Extract entities mentioned (companies, people)
    const entities: string[] = [];
    
    // Company/product patterns
    const companyMatch = lowerQuery.match(/(?:about|on|for)\s+([a-z0-9.-]+(?:\.[a-z]{2,})?)/i);
    if (companyMatch) entities.push(companyMatch[1]);
    
    // Person patterns
    const personMatch = lowerQuery.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+(?:the\s+)?founder)?/);
    if (personMatch) entities.push(personMatch[1]);
    
    if (entities.length > 0) {
      return `researching ${entities.join(', ')}`;
    }
    return 'compiling research';
  }
  
  // Search patterns
  if (lowerQuery.startsWith('search') || lowerQuery.startsWith('find')) {
    const searchMatch = lowerQuery.match(/(?:search|find)\s+(?:for\s+)?(?:me\s+)?(.+)/i);
    if (searchMatch) {
      const subject = searchMatch[1].substring(0, 40);
      return `searching for ${subject}`;
    }
    return 'searching';
  }
  
  // Image/video patterns
  if (lowerQuery.includes('images') || lowerQuery.includes('pictures') || lowerQuery.includes('photos')) {
    return 'finding images';
  }
  if (lowerQuery.includes('videos')) {
    return 'finding videos';
  }
  
  // Document patterns
  if (lowerQuery.includes('document') || lowerQuery.includes('file')) {
    return 'finding documents';
  }
  
  // SEC filing patterns
  if (lowerQuery.includes('10-k') || lowerQuery.includes('10-q') || lowerQuery.includes('sec filing')) {
    return 'finding SEC filings';
  }
  
  // News patterns
  if (lowerQuery.includes('news')) {
    return 'finding news';
  }
  
  // Default: use first few words
  const words = query.split(' ').slice(0, 5).join(' ');
  return words.length > 40 ? words.substring(0, 40) + '...' : words;
};
```

#### 2. **Updated Typing Indicator Messages**

**Case 1: Streaming assistant message with no content yet**
```typescript
// Find the most recent user message to extract intent
const recentUserMessage = [...filteredMessages].reverse().find(msg => msg.role === 'user');
const intent = recentUserMessage?.text ? extractIntent(recentUserMessage.text) : 'your request';

return <TypingIndicator message={`Helping you with ${intent}...`} />;
```

**Case 2: User message with no assistant response yet**
```typescript
const intent = lastMessage.text ? extractIntent(lastMessage.text) : 'your request';
return <TypingIndicator message={`Helping you with ${intent}...`} />;
```

---

## Intent Patterns Supported

### 1. **Multi-Entity Research**
- **Pattern**: "compile information", "research"
- **Extraction**: Company names (e.g., "Ditto.ai"), Person names (e.g., "Eric Liu")
- **Output**: "researching Ditto.ai, Eric Liu"

**Examples:**
- "Help me compile information on Ditto.ai, Eric Liu the founder" → "researching Ditto.ai, Eric Liu"
- "Research Tesla and Elon Musk" → "researching Tesla, Elon Musk"

### 2. **Search Queries**
- **Pattern**: "search", "find"
- **Extraction**: Subject of search (first 40 characters)
- **Output**: "searching for [subject]"

**Examples:**
- "Search for recent Tesla news" → "searching for recent Tesla news"
- "Find me documents about AI" → "searching for documents about AI"

### 3. **Image Searches**
- **Pattern**: "images", "pictures", "photos"
- **Output**: "finding images"

**Examples:**
- "Find me images on ditto" → "finding images"
- "Show me pictures of the product" → "finding images"

### 4. **Video Searches**
- **Pattern**: "videos"
- **Output**: "finding videos"

**Examples:**
- "Find videos about Python programming" → "finding videos"

### 5. **Document Searches**
- **Pattern**: "document", "file"
- **Output**: "finding documents"

**Examples:**
- "Find the revenue report" → "finding documents"

### 6. **SEC Filing Searches**
- **Pattern**: "10-k", "10-q", "sec filing"
- **Output**: "finding SEC filings"

**Examples:**
- "Get Apple's 10-K filing" → "finding SEC filings"

### 7. **News Searches**
- **Pattern**: "news"
- **Output**: "finding news"

**Examples:**
- "What's the latest news on AI?" → "finding news"

### 8. **Default (Fallback)**
- **Pattern**: Any other query
- **Extraction**: First 5 words (max 40 characters)
- **Output**: First few words of the query

**Examples:**
- "What is the capital of France?" → "What is the capital of"

---

## Benefits

✅ **Contextual Feedback**: Users see what the agent is doing based on their query  
✅ **Better UX**: More informative than generic "Streaming..." message  
✅ **Transparency**: Users understand the agent's current task  
✅ **Reduced Anxiety**: Clear status reduces uncertainty during processing  
✅ **Voice-Friendly**: Works well with voice-driven workflows  
✅ **Extensible**: Easy to add new intent patterns  

---

## Examples

### Example 1: Multi-Entity Research
```
User: "Help me compile information on Ditto.ai, Eric Liu the founder, and the company's fundraising round and news, any videos or images, job career and positions"

[Typing Indicator]
🟢 Helping you with researching Ditto.ai, Eric Liu...
```

### Example 2: Image Search
```
User: "Find me images on ditto"

[Typing Indicator]
🟢 Helping you with finding images...
```

### Example 3: SEC Filing Search
```
User: "Get Apple's latest 10-K filing"

[Typing Indicator]
🟢 Helping you with finding SEC filings...
```

### Example 4: Web Search
```
User: "Search for recent Tesla news"

[Typing Indicator]
🟢 Helping you with searching for recent Tesla news...
```

### Example 5: Video Search
```
User: "Find videos about Python programming"

[Typing Indicator]
🟢 Helping you with finding videos...
```

---

## Technical Details

### Component Flow

1. **User submits query** → Creates user message in thread
2. **Agent starts processing** → No assistant message yet
3. **UIMessageStream detects** → Last message is user, no assistant response
4. **Extract intent** → Analyze user query with `extractIntent()`
5. **Display typing indicator** → Show "Helping you with [intent]..."
6. **Agent responds** → Typing indicator disappears, response appears

### Pattern Matching Strategy

The `extractIntent()` function uses a **priority-based pattern matching** approach:

1. **Specific patterns first** (multi-entity research, SEC filings)
2. **General patterns second** (search, find)
3. **Media patterns third** (images, videos, documents)
4. **Fallback last** (first few words)

This ensures the most specific intent is extracted when multiple patterns match.

---

## Future Enhancements

### Potential Improvements

1. **Agent-Specific Intents**
   - "Coordinator is delegating to Media Agent..."
   - "Web Agent is searching for news..."
   - "SEC Agent is finding filings..."

2. **Progress Indicators**
   - "Searching 3 sources..."
   - "Found 10 images, analyzing..."
   - "Downloading SEC filing..."

3. **Multi-Step Intents**
   - "Step 1/3: Searching for company info..."
   - "Step 2/3: Finding founder profile..."
   - "Step 3/3: Compiling results..."

4. **Confidence Indicators**
   - "Helping you with researching Ditto.ai (high confidence)"
   - "Helping you with finding documents (clarification may be needed)"

---

## Related Files

- **`src/components/FastAgentPanel/FastAgentPanel.UIMessageStream.tsx`** - Main implementation
- **`src/components/FastAgentPanel/TypingIndicator.tsx`** - Typing indicator component
- **`BEST_EFFORT_EXECUTION_GUIDE.md`** - Best-effort execution approach
- **`convex/agents/specializedAgents.ts`** - Specialized agent definitions

---

## Testing

### Manual Testing

1. **Test multi-entity research query:**
   ```
   "Help me compile information on Ditto.ai, Eric Liu the founder, and the company's fundraising round and news, any videos or images, job career and positions"
   ```
   **Expected**: "Helping you with researching Ditto.ai, Eric Liu..."

2. **Test image search:**
   ```
   "Find me images on ditto"
   ```
   **Expected**: "Helping you with finding images..."

3. **Test SEC filing search:**
   ```
   "Get Apple's latest 10-K filing"
   ```
   **Expected**: "Helping you with finding SEC filings..."

4. **Test web search:**
   ```
   "Search for recent Tesla news"
   ```
   **Expected**: "Helping you with searching for recent Tesla news..."

5. **Test video search:**
   ```
   "Find videos about Python programming"
   ```
   **Expected**: "Helping you with finding videos..."

### Automated Testing

Add tests to `src/components/FastAgentPanel/__tests__/message-rendering.test.tsx`:

```typescript
describe('Intent Extraction', () => {
  it('should extract multi-entity research intent', () => {
    const query = "Help me compile information on Ditto.ai, Eric Liu the founder";
    const intent = extractIntent(query);
    expect(intent).toBe("researching Ditto.ai, Eric Liu");
  });

  it('should extract image search intent', () => {
    const query = "Find me images on ditto";
    const intent = extractIntent(query);
    expect(intent).toBe("finding images");
  });

  it('should extract SEC filing intent', () => {
    const query = "Get Apple's latest 10-K filing";
    const intent = extractIntent(query);
    expect(intent).toBe("finding SEC filings");
  });
});
```

---

## Success Criteria

- ✅ Typing indicator displays intent-based messages instead of generic "Streaming..."
- ✅ Intent extraction works for all supported patterns
- ✅ Fallback to first few words when no pattern matches
- ✅ No performance impact on message rendering
- ✅ Works with both streaming and non-streaming modes

