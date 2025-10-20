# Next Steps and Testing Guide

## What Was Fixed

✅ **Agent Recognition**: Agents now recognize "make new document" and similar phrases
✅ **Tool Result Streaming**: Tool results are now properly captured and verified
✅ **Error Handling**: Better error handling and logging for debugging
✅ **Document Display**: Document cards appear in Fast Agent Panel when created

---

## Testing Instructions

### 1. Basic Test - Create Document

**Steps**:
1. Open Fast Agent Panel
2. Type: "make new document"
3. Press Enter

**Expected Result**:
- ✅ Document is created
- ✅ Document card appears in the panel
- ✅ Card shows "Created" status (green)
- ✅ Card shows document title and ID
- ✅ No errors in console

**Console Logs to Look For**:
```
[createDocument] Creating document: "New Document"
[createDocument] Calling mutation with title: "New Document"
[createDocument] Document created with ID: k57abc123def456
[createDocument] Returning response with document ID: k57abc123def456
[streamAsync:xxxxx] Tool calls: 1, Tool results: 1
```

---

### 2. Context-Aware Test - Create Document with Topic

**Steps**:
1. Open Fast Agent Panel
2. Type: "create a document about AI"
3. Press Enter

**Expected Result**:
- ✅ Document is created with title "AI Document"
- ✅ Document card appears with correct title
- ✅ No errors in console

**Console Logs to Look For**:
```
[createDocument] Creating document: "AI Document"
[createDocument] Document created with ID: k57abc123def456
```

---

### 3. Variation Test - Different Phrases

**Test Cases**:
- "create a document" → Title: "New Document"
- "make a new document" → Title: "New Document"
- "create document" → Title: "New Document"
- "make a new investment thesis" → Title: "Investment Thesis"
- "create document for Q4 planning" → Title: "Q4 Planning"

**Expected Result**:
- ✅ All variations create documents
- ✅ Titles are inferred correctly
- ✅ No errors in console

---

### 4. Click Test - Open Document

**Steps**:
1. Create a document (use any of the above tests)
2. Click on the document card
3. Verify document opens in editor

**Expected Result**:
- ✅ Document opens in editor
- ✅ Document title matches
- ✅ Document ID matches
- ✅ No errors in console

---

### 5. Multiple Documents Test

**Steps**:
1. Create first document: "make new document"
2. Create second document: "create a document about AI"
3. Create third document: "make a new investment thesis"

**Expected Result**:
- ✅ All three documents are created
- ✅ All three cards appear in the panel
- ✅ Each card shows correct title
- ✅ Each card is clickable
- ✅ No errors in console

---

## Debugging Guide

### If Documents Aren't Being Created

**Check Console Logs**:
1. Look for `[createDocument]` logs
2. If missing, agent didn't call the tool
3. Check if agent recognized the request

**Possible Issues**:
- Agent didn't recognize the phrase
- Agent delegated to wrong agent
- Tool wasn't called

**Solution**:
- Try different phrasing: "create a document", "make new document"
- Check CoordinatorAgent logs to see which agent was delegated to
- Check if DocumentAgent was called

### If Tool Result Error Occurs

**Error Message**:
```
Error: An assistant message with 'tool_calls' must be followed by tool messages responding to each 'tool_call_id'
```

**Check Console Logs**:
1. Look for `[streamAsync]` logs
2. Check tool calls and results count
3. If `Tool results: 0` when `Tool calls: 1`, results aren't being saved

**Possible Issues**:
- Tool threw an error
- Tool result wasn't captured
- Streaming was interrupted

**Solution**:
- Check `[createDocument]` logs for errors
- Check if document was actually created in database
- Try again - might be a race condition

### If Document Card Doesn't Appear

**Check Console Logs**:
1. Look for `[createDocument]` logs
2. Verify document was created (check database)
3. Check if document action marker is in response

**Possible Issues**:
- Document was created but marker wasn't included
- Frontend didn't extract the marker
- Document card component has an error

**Solution**:
- Check if document exists in database
- Check if response includes `<!-- DOCUMENT_ACTION_DATA` marker
- Check browser console for JavaScript errors

---

## Console Log Reference

### Successful Flow

```
[createDocument] Creating document: "New Document"
[createDocument] Calling mutation with title: "New Document"
[createDocument] Document created with ID: k57abc123def456
[createDocument] Returning response with document ID: k57abc123def456
[streamAsync:xxxxx] 📡 Calling COORDINATOR AGENT agent.streamText...
[streamAsync:xxxxx] ✅ Stream started, messageId: msg_xxxxx
[streamAsync:xxxxx] 🏁 Stream completed successfully
[streamAsync:xxxxx] Tool calls: 1, Tool results: 1
```

### Error Flow

```
[createDocument] Creating document: "New Document"
[createDocument] Error creating document: [error details]
[streamAsync:xxxxx] ❌ Error: [error details]
```

---

## Files to Monitor

When testing, monitor these files for logs:

1. **Browser Console** (F12)
   - Frontend logs
   - JavaScript errors
   - Network errors

2. **Convex Dashboard** (if available)
   - Backend logs
   - Function execution logs
   - Error logs

3. **Terminal** (if running locally)
   - Server logs
   - Agent logs
   - Tool execution logs

---

## Success Criteria

✅ All tests pass
✅ No console errors
✅ Documents are created
✅ Document cards appear
✅ Cards are clickable
✅ Documents open in editor
✅ Logging shows proper execution flow

---

## Rollback Plan

If issues occur:

1. **Revert Agent Instructions**
   - Revert `convex/agents/specializedAgents.ts` to previous version
   - This will disable the new document creation recognition

2. **Revert Tool Changes**
   - Revert `convex/tools/documentTools.ts` to previous version
   - This will remove error handling (but tool should still work)

3. **Revert Streaming Changes**
   - Revert `convex/fastAgentPanelStreaming.ts` to previous version
   - This will remove verification logging

---

## Support

If you encounter issues:

1. Check the console logs
2. Review the debugging guide above
3. Check if documents are being created in the database
4. Try different phrasing
5. Try creating a document manually to verify the tool works

---

## Status

🚀 **READY FOR TESTING**

All changes are in place and ready to be tested. The feature should work as expected, but thorough testing is recommended to ensure everything works correctly in your environment.

