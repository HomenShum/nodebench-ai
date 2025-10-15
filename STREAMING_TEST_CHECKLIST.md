# Streaming Implementation Test Checklist

## Pre-Test Setup

### 1. Environment Check
- [ ] `.env.local` has `VITE_CONVEX_URL` set
- [ ] Convex backend is running (`npm run dev:backend`)
- [ ] Frontend is running (`npm run dev:frontend`)
- [ ] OpenAI API key is configured in Convex dashboard

### 2. Browser Setup
- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] Go to Network → WS tab
- [ ] Clear console and network logs

---

## Test 1: Basic Streaming

### Steps:
1. Open the app in browser
2. Click "Fast Agent" button to open panel
3. Click "Streaming" toggle to enable Agent Streaming mode
4. Verify toggle shows "Streaming" label and is highlighted green
5. Type a message: "Tell me a short story about a robot"
6. Click Send

### Expected Results:
- [ ] User message appears immediately
- [ ] Assistant message starts appearing with "Thinking..." placeholder
- [ ] Text starts streaming character-by-character
- [ ] Blinking cursor appears at the end of streaming text
- [ ] Text flows smoothly without jumps
- [ ] Streaming completes and cursor disappears
- [ ] Final message is fully rendered with markdown

### Console Logs to Check:
```
[FastAgentPanel] Messages updated: 2 messages
[FastAgentPanel] Last message: { role: 'assistant', textLength: X, status: 'streaming' }
[initiateAsyncStreaming] Saving user message, agentThreadId: ...
[initiateAsyncStreaming] User message saved, messageId: ...
[streamAsync] Starting stream for message: ...
[streamAsync] Stream started, messageId: ...
[streamAsync] Stream completed successfully
```

---

## Test 2: WebSocket Connection

### Steps:
1. Open DevTools → Network → WS tab
2. Refresh the page
3. Look for WebSocket connections

### Expected Results:
- [ ] WebSocket connection to `wss://formal-shepherd-851.convex.cloud` (or your deployment)
- [ ] Connection status: "101 Switching Protocols"
- [ ] Connection stays open (green indicator)
- [ ] Messages flowing through WebSocket (check Frames tab)

### What NOT to worry about:
- ❌ `ws://localhost:5175/` connection error (unrelated to Convex)
- ❌ Browser extension WebSocket errors
- ❌ Other localhost WebSocket connections

---

## Test 3: Multiple Messages

### Steps:
1. Send first message: "Count from 1 to 10"
2. Wait for streaming to complete
3. Send second message: "Now count backwards"
4. Wait for streaming to complete
5. Send third message: "What did you just count?"

### Expected Results:
- [ ] All messages stream smoothly
- [ ] Previous messages remain visible
- [ ] Scroll automatically follows new messages
- [ ] Each message has correct timestamp
- [ ] Message order is correct (oldest at top)

---

## Test 4: Streaming Interruption

### Steps:
1. Send a long message: "Write a detailed story about space exploration"
2. While streaming, refresh the page
3. Reopen Fast Agent panel
4. Check the message

### Expected Results:
- [ ] Partial message is saved in database
- [ ] Message shows as "complete" (not streaming)
- [ ] Can continue conversation from this point
- [ ] No errors in console

---

## Test 5: Error Handling

### Steps:
1. Temporarily disable internet connection
2. Send a message
3. Re-enable internet connection

### Expected Results:
- [ ] Error message appears in UI
- [ ] Console shows error logs
- [ ] Can retry sending message
- [ ] App doesn't crash

---

## Test 6: Mode Switching

### Steps:
1. Start in "Agent" mode (non-streaming)
2. Send a message
3. Wait for response
4. Switch to "Agent Streaming" mode
5. Send another message
6. Switch back to "Agent" mode
7. Send another message

### Expected Results:
- [ ] Mode switch shows toast notification
- [ ] Active thread is reset when switching modes
- [ ] Messages in each mode work correctly
- [ ] No cross-contamination between modes

---

## Test 7: Smooth Text Animation

### Steps:
1. Send message: "Write a paragraph about AI"
2. Watch the streaming animation closely

### Expected Results:
- [ ] Text appears character-by-character
- [ ] Animation is smooth (no stuttering)
- [ ] Speed adapts to incoming text rate
- [ ] Cursor blinks at consistent rate
- [ ] No text "jumping" or repositioning

---

## Test 8: Markdown Rendering

### Steps:
1. Send message: "Show me a code example in Python"
2. Wait for streaming to complete

### Expected Results:
- [ ] Code blocks are syntax highlighted
- [ ] Markdown formatting is applied
- [ ] Code blocks have dark theme
- [ ] Inline code has proper styling
- [ ] Lists and headers render correctly

---

## Test 9: Performance

### Steps:
1. Send 5 messages in quick succession
2. Monitor browser performance

### Expected Results:
- [ ] No significant lag or freezing
- [ ] Memory usage stays reasonable
- [ ] CPU usage is acceptable
- [ ] All messages stream correctly
- [ ] No memory leaks (check DevTools → Memory)

---

## Test 10: Thread Management

### Steps:
1. Create a new thread (click + button)
2. Send a message
3. Create another new thread
4. Send a message
5. Switch between threads

### Expected Results:
- [ ] Each thread maintains its own messages
- [ ] Switching threads loads correct messages
- [ ] No message mixing between threads
- [ ] Thread list updates correctly

---

## Debugging Tips

### If streaming doesn't work:

1. **Check Console for Errors:**
   ```
   - Look for red error messages
   - Check for "Failed to fetch" or network errors
   - Look for TypeScript errors
   ```

2. **Check Network Tab:**
   ```
   - Filter by "convex.cloud"
   - Look for failed requests (red)
   - Check request/response payloads
   ```

3. **Check Convex Dashboard:**
   ```
   - Go to https://dashboard.convex.dev
   - Check Logs tab for backend errors
   - Check Functions tab for failed function calls
   ```

4. **Check Environment Variables:**
   ```bash
   # In terminal
   cat .env.local
   # Should show VITE_CONVEX_URL
   ```

5. **Restart Dev Servers:**
   ```bash
   # Kill all processes
   # Restart
   npm run dev
   ```

---

## Success Criteria

All tests should pass with:
- ✅ Smooth streaming animation
- ✅ No console errors
- ✅ WebSocket connection stable
- ✅ Messages persist correctly
- ✅ UI remains responsive

---

## Known Issues (Not Bugs)

1. **WebSocket Error `ws://localhost:5175/`:**
   - This is from a browser extension or dev tool
   - Does NOT affect Convex streaming
   - Can be safely ignored

2. **First message slower:**
   - Cold start for Convex functions
   - Normal behavior
   - Subsequent messages are faster

3. **Streaming delay on slow connections:**
   - Adjust `throttleMs` in `streamAsync`
   - Lower value = more updates but more bandwidth
   - Current: 50ms (good for most connections)

---

## Report Issues

If any test fails, report with:
1. Test number that failed
2. Console error messages
3. Network tab screenshot
4. Steps to reproduce
5. Browser and OS version

