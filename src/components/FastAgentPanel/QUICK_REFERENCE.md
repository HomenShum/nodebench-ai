# FastAgentPanel Quick Reference

## Modern Fast Agent Architecture (NO Legacy Framework)

### Key Principle
FastAgentPanel uses the **modern fast agents** implementation, NOT the legacy multi-agent framework.

## Backend Entry Point

```typescript
// convex/fastAgentChat.ts
export const chatWithAgentModern = action({
  args: {
    message: v.string(),
    selectedDocumentId: v.optional(v.id("documents")),
    model: v.optional(v.union(v.literal("openai"), v.literal("gemini"))),
    runId: v.optional(v.id("agentRuns")),
    fastMode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Modern implementation - NO legacy framework
  },
});
```

## Frontend Usage

```typescript
// src/components/FastAgentPanel/FastAgentPanel.tsx
const chatWithAgent = useAction(api.fastAgentChat.chatWithAgentModern);

// Call it
await chatWithAgent({
  message: userMessage,
  selectedDocumentId: docId,
  model: 'openai',
  fastMode: true,
});
```

## Execution Flow

### Document Editing Request
```
User: "Add a summary section"
    ↓
chatWithAgentModern
    ↓
Detect: isEditRequest = true
    ↓
handleDocumentEdit
    ↓
fast_agents/orchestrator.orchestrate
    ↓
Context Agent → Editing Agent → Validation Agent
    ↓
Return edit proposal
```

### Chat/Question Request
```
User: "What is the weather?"
    ↓
chatWithAgentModern
    ↓
Detect: isEditRequest = false
    ↓
handleChatResponse
    ↓
Direct LLM call (GPT-5-mini/nano)
    ↓
Return response
```

## Key Files

### Modern Implementation (USED)
```
✅ convex/fastAgentChat.ts              - Entry point
✅ convex/fast_agents/orchestrator.ts   - Main coordinator
✅ convex/fast_agents/contextAgent.ts   - Context gathering
✅ convex/fast_agents/editingAgent.ts   - Edit generation
✅ convex/fast_agents/validationAgent.ts - Edit validation
```

### Legacy Framework (NOT USED)
```
❌ agents/app/chatOrchestrator.ts
❌ agents/core/orchestrator.ts
❌ agents/meta/metaAgent.ts
❌ agents/meta/agentFactory.ts
❌ agents/core/supervisorAgent.ts
```

## Common Tasks

### Adding a New Feature

1. **For document editing features:**
   - Edit `convex/fast_agents/editingAgent.ts`
   - Update prompts in `convex/fast_agents/prompts.ts`

2. **For chat features:**
   - Edit `handleChatResponse` in `convex/fastAgentChat.ts`

3. **For context gathering:**
   - Edit `convex/fast_agents/contextAgent.ts`

### Debugging

1. **Check SSE events:**
   ```typescript
   // Events are emitted via emitEvent function
   await emitEvent("thinking", "Step description");
   await emitEvent("tool.result", "Result", { data });
   await emitEvent("error", "Error message");
   ```

2. **Check logs:**
   ```typescript
   log.info("Message", { data });
   log.warn("Warning", { data });
   log.error("Error", error);
   ```

3. **Check run status:**
   - Open Convex dashboard
   - Navigate to `agentRuns` table
   - Find your run by `runId`
   - Check `status` and `finalResponse` fields

### Testing

```bash
# Run TypeScript check
npx tsc --noEmit

# Run tests
npm test -- FastAgentPanel

# Manual testing
1. Open FastAgentPanel
2. Send a message
3. Check SSE events in browser DevTools
4. Verify response is generated
```

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Response Time (edit) | < 1000ms | ~500ms ✅ |
| Response Time (chat) | < 500ms | ~300ms ✅ |
| Token Usage (edit) | < 3000 | ~2500 ✅ |
| Token Usage (chat) | < 1000 | ~500 ✅ |
| LLM Calls | ≤ 2 | ≤ 2 ✅ |

## Error Handling

```typescript
try {
  // Your code
} catch (error) {
  log.error("Error:", error);
  await emitEvent("error", error.message);
  
  // Update run status
  await ctx.runMutation(internal.aiAgents.updateAgentRun, {
    runId,
    fields: { status: "error", finalResponse: error.message },
  });
  
  // Return error response
  return JSON.stringify({
    finalResponse: `Error: ${error.message}`,
    thinkingSteps: [],
    toolCalls: [],
    adaptations: [],
    runId: String(runId),
  });
}
```

## SSE Event Types

```typescript
// Thinking steps
await emitEvent("thinking", "Analyzing request...");

// Tool calls
await emitEvent("tool.call", "Calling tool", { toolName, args });
await emitEvent("tool.result", "Tool result", { result });

// Context
await emitEvent("context.docs", undefined, { ids: [docId] });

// Response
await emitEvent("response", finalResponse);

// Errors
await emitEvent("error", errorMessage);
```

## Best Practices

### DO ✅
- Use `chatWithAgentModern` for all new FastAgentPanel features
- Emit SSE events for user feedback
- Handle errors gracefully
- Update run status on completion/error
- Use fast_agents orchestrator for document editing
- Use direct LLM calls for simple chat

### DON'T ❌
- Don't use `api.aiAgents.chatWithAgent` (legacy)
- Don't import from `agents/app/chatOrchestrator.ts`
- Don't import from `agents/core/orchestrator.ts`
- Don't use MetaAgent, AgentFactory, SupervisorAgent
- Don't create recursive agent spawning
- Don't skip error handling

## Migration Checklist

If you're working on code that still uses the legacy framework:

- [ ] Replace `api.aiAgents.chatWithAgent` with `api.fastAgentChat.chatWithAgentModern`
- [ ] Remove imports from `agents/app/chatOrchestrator.ts`
- [ ] Remove imports from `agents/core/orchestrator.ts`
- [ ] Remove imports from `agents/meta/*`
- [ ] Update to use `fast_agents/orchestrator.ts`
- [ ] Test thoroughly
- [ ] Update documentation

## Resources

- [Migration Guide](./MIGRATION_GUIDE.md)
- [FastAgentPanel README](./README.md)
- [Fast Agents README](../../../convex/fast_agents/README.md)
- [Fast Agents Summary](../../../convex/fast_agents/SUMMARY.md)
- [Legacy Framework Removal](../../../LEGACY_FRAMEWORK_REMOVAL.md)

## Questions?

If you have questions:
1. Check the documentation above
2. Review the code in `convex/fastAgentChat.ts`
3. Look at examples in `convex/fast_agents/`
4. Ask the team

## Remember

**FastAgentPanel uses modern fast agents, NOT the legacy framework!**

- ✅ Modern: `api.fastAgentChat.chatWithAgentModern`
- ❌ Legacy: `api.aiAgents.chatWithAgent`

