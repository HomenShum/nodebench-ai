# Critical Architectural Fixes - Fast Agent Panel

## Issues Identified

### ✅ Issue 1: Multiple Goal Cards (FIXED)
**Problem:** A new Goal Card was appearing for each sub-agent response, violating unified task log principle.

**Root Cause:** GoalCard was rendered for ANY message with `toolParts.length > 1`, including child agent responses.

**Fix Applied:**
```typescript
// OLD: Showed for every message with tools
{!isUser && toolParts.length > 1 && ...}

// NEW: Only show for parent coordinator messages
{!isUser && isParent && !isChild && delegationCalls.length > 0 && ...}
```

**Result:** Now only ONE Goal Card appears at the top of the coordinator message.

---

### ⚠️ Issue 2: Messages Not Appearing
**Problem:** Console shows 6 messages but only 4 render. New user messages don't appear.

**Root Cause:** Aggressive filtering in `UIMessageStream.tsx`:
1. Lines 68-112: Filters out "agent-generated sub-queries"
2. Lines 189-205: Deduplication logic may be too aggressive
3. Lines 95-111: Empty message filtering

**Symptoms:**
```
messageCount: 6  // Backend says 6 messages
Messages updated: 4 messages  // UI only shows 4
```

**Fix Needed:**
```typescript
// In UIMessageStream.tsx, line 95-111
// Current filtering is too aggressive
const filteredMessages = messages.filter((msg, idx) => {
  // PROBLEM: This might filter out real user messages
  if (delegationIndices.has(idx)) return false;
  
  // PROBLEM: Empty check is too strict
  const hasText = msg.text && msg.text.trim().length > 0;
  const hasParts = msg.parts && msg.parts.length > 0;
  return hasText || hasParts;
});

// FIX: Be more conservative
const filteredMessages = messages.filter((msg, idx) => {
  // Always keep user messages (never filter user input)
  if (msg.role === 'user' && !delegationIndices.has(idx)) return true;
  
  // For assistant messages, more lenient check
  if (msg.role === 'assistant') {
    const hasContent = msg.text || msg.parts?.length > 0;
    return hasContent;
  }
  
  return true; // Keep system messages, etc.
});
```

---

### ⚠️ Issue 3: Rich Media Not Embedded in Task Cards
**Problem:** Videos/News show as text lists instead of rich card galleries inside task results.

**Current Architecture:**
```
Assistant Message:
  ├─ GoalCard
  ├─ ThoughtBubble
  ├─ RichMediaSection (ALL media at top) ❌ Wrong!
  ├─ CollapsibleAgentProgress
  │   └─ StepTimeline (Tool calls, but NO media)
  └─ Text answer
```

**Correct Architecture (from HTML mock):**
```
Assistant Message:
  ├─ GoalCard
  ├─ ThoughtBubble
  ├─ CollapsibleAgentProgress
  │   └─ Task 1: Find 10-K ❌ Failed
  │   └─ Task 2: Get News ✅ Success
  │       └─ [News Card Gallery embedded here!] ✅
  │   └─ Task 3: Find Videos ✅ Success
  │       └─ [Video Gallery embedded here!] ✅
  └─ Text answer with citations
```

**Fix Needed:**

**Option A: Enhanced StepTimeline**
Modify `StepTimeline.tsx` to render rich media in step results:

```typescript
// In StepTimeline, line 219-226 (expanded details)
{step.result && (
  <div className="text-xs">
    <div className="font-medium text-gray-700 mb-1">Results:</div>
    
    {/* Check if result contains media markers */}
    {(() => {
      const resultText = String(step.result);
      const media = extractMediaFromText(resultText);
      
      if (media.youtubeVideos.length > 0) {
        return <YouTubeGallery videos={media.youtubeVideos} />;
      }
      if (media.webSources.length > 0) {
        return <NewsCardGallery sources={media.webSources} />;
      }
      
      // Fallback to text
      return (
        <pre className="bg-gray-100 p-2 rounded text-xs">
          {removeMediaMarkersFromText(resultText)}
        </pre>
      );
    })()}
  </div>
)}
```

**Option B: Move RichMediaSection Inside CollapsibleAgentProgress**
Pass media to `CollapsibleAgentProgress` and render it per-task instead of globally.

---

## Implementation Priority

### High Priority (Blocks user experience)
1. ✅ **Fix Multiple Goal Cards** - DONE
2. ⚠️ **Fix Message Filtering** - Prevents user messages from showing
3. ⚠️ **Embed Rich Media** - Videos/News need card galleries

### Medium Priority
4. Add retry/suggest fix buttons to failed tasks
5. Add citation link scrolling functionality
6. Add context bar for file/URL chips

### Low Priority
7. Cost estimator
8. Keyboard shortcuts
9. Thread search

---

## Testing Checklist

After fixes, test with:
```
"Search for Apple recent phone products, 10K, recent news, videos, people"
```

Expected behavior:
- [x] Only ONE Goal Card appears
- [ ] User message appears immediately
- [ ] Coordinator reasoning shows in ThoughtBubble
- [ ] 5 task boxes show in Goal Card: [Web][SEC][News][Videos][People]
- [ ] Each specialized agent response appears with badge
- [ ] Videos show as card gallery, not text list
- [ ] News shows as card gallery, not text list
- [ ] Final synthesis has clickable citations
- [ ] No duplicate messages

---

## Code Locations

**Files to modify:**
1. `UIMessageStream.tsx` - Lines 95-111 (message filtering)
2. `StepTimeline.tsx` - Lines 219-226 (result rendering)
3. `UIMessageBubble.tsx` - Lines 561-605 (GoalCard logic) ✅ DONE

**Files to import:**
- `extractMediaFromText` from `./utils/mediaExtractor`
- `YouTubeGallery` from `./MediaGallery`
- `NewsCardGallery` (create or use SourceCard)
