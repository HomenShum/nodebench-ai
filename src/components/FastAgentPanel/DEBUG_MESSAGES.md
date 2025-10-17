# Debug: Messages Not Showing

## Issue
Chat area is empty despite messages being in the backend.

## Debugging Steps

### 1. Check Browser Console
Look for these logs:
```
[UIMessageStream] Grouped messages: { total: X, filtered: Y, grouped: Z }
[UIMessageStream] Keeping user message: ...
[UIMessageStream] Filtering agent-generated sub-query: ...
[FastAgentPanel] Messages updated: X messages
```

### 2. Common Issues

#### Issue A: No Messages Prop
**Symptom:** `total: 0` in console
**Cause:** Messages not being passed to UIMessageStream
**Fix:** Check FastAgentPanel.tsx line 832-843

#### Issue B: All Messages Filtered
**Symptom:** `total: 6, filtered: 0, grouped: 0`
**Cause:** Aggressive filtering in filteredMessages
**Fix:** Already applied (lines 95-124)

#### Issue C: Delegation Detection Issue
**Symptom:** `total: 6, filtered: 6, grouped: 0`
**Cause:** Grouping logic failing
**Fix:** Check lines 127-199

#### Issue D: Deduplication Too Aggressive
**Symptom:** Messages grouped but not rendered
**Fix:** Already applied (line 207 - returns false)

### 3. Quick Fix Checklist

If messages still don't show:

**[ ] Step 1:** Open browser console
**[ ] Step 2:** Look for the log: `[UIMessageStream] Grouped messages:`
**[ ] Step 3:** Note the numbers:
  - total: ___
  - filtered: ___
  - grouped: ___

**[ ] Step 4:** Based on numbers:

**If total = 0:**
```typescript
// In FastAgentPanel.tsx, check:
const streamingMessages = useUIMessages(...);
console.log('streamingMessages:', streamingMessages);

// Make sure it's being passed:
<UIMessageStream messages={streamingMessages || []} />
```

**If total > 0 but filtered = 0:**
```typescript
// Issue is in filteredMessages logic (lines 68-124)
// Try commenting out delegation detection:
const filteredMessages = useMemo(() => {
  return messages; // Bypass all filtering
}, [messages]);
```

**If filtered > 0 but grouped = 0:**
```typescript
// Issue is in groupedMessages logic (lines 127-199)
// Try simpler grouping:
const groupedMessages = useMemo(() => {
  return filteredMessages.map(msg => ({
    parent: msg,
    children: []
  }));
}, [filteredMessages]);
```

**If grouped > 0 but nothing renders:**
```typescript
// Check UIMessageBubble is getting correct props
// Add log in UIMessageBubble.tsx:
console.log('[UIMessageBubble] Rendering:', message.role, message.text?.substring(0, 50));
```

### 4. Nuclear Option: Bypass Everything

If still nothing shows, temporarily simplify UIMessageStream:

```typescript
// Replace entire return with:
return (
  <div className="flex-1 overflow-y-auto p-6">
    <div className="flex flex-col gap-4">
      {messages.map((msg, idx) => (
        <div key={idx} className="p-4 bg-white rounded border">
          <div className="font-bold">{msg.role}</div>
          <div>{msg.text || '(no text)'}</div>
          <div className="text-xs text-gray-500">
            Parts: {msg.parts?.length || 0}
          </div>
        </div>
      ))}
    </div>
  </div>
);
```

This will show ALL messages without any filtering/grouping.

### 5. Check FastAgentPanel Integration

In `FastAgentPanel.tsx` around line 832:

```typescript
{chatMode === 'agent-streaming' ? (
  <UIMessageStream
    messages={streamingMessages || []}  // ✅ Make sure this is here
    autoScroll={true}
    // ... other props
  />
) : (
  // Agent mode (different component)
)}
```

**Common mistake:** Passing wrong messages array or undefined.

### 6. Verify useUIMessages Hook

Check if `streamingMessages` is populated:

```typescript
const { results: streamingMessages, status, error } = useUIMessages(...);

console.log('streamingMessages:', streamingMessages);
console.log('status:', status);
console.log('error:', error);
```

If `streamingMessages` is undefined/null/empty, the issue is upstream in the hook.

## Expected Console Output (Healthy)

```
[UIMessageStream] Grouped messages: { total: 6, filtered: 4, grouped: 2 }
[UIMessageStream] Keeping user message: Search for Apple...
[UIMessageStream] Filtering agent-generated sub-query: Search SEC...
[FastAgentPanel] Messages updated: 6 messages
```

## Report Back

**What do you see in console?**
1. Total messages: ___
2. Filtered messages: ___
3. Grouped messages: ___
4. Any errors: ___

This will help identify exactly where the issue is!
