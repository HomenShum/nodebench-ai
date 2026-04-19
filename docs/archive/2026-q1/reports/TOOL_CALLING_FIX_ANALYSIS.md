# Tool Calling Fix Analysis - DCF E2E Test Failure

## Executive Summary

The E2E test fails because **fallback models (gpt-5-nano, devstral-2-free) provide explanations instead of calling the DCF tool**, despite both models supporting function calling. This is a **configuration and prompting issue**, not a model capability limitation.

---

## Deep Investigation Results

### ✅ What's Working

1. **Guest user access** - Successfully enabled for DCF tool
2. **Multi-provider fallback** - Anthropic → OpenAI → Gemini chain works
3. **Timeout detection** - 90-second timeout successfully implemented
4. **Both fallback models support tool calling**:
   - [gpt-5-nano supports parallel function calling](https://platform.openai.com/docs/models/gpt-5-nano)
   - [Devstral 2 has tool-calling success rate on par with best closed models](https://mistral.ai/news/devstral-2-vibe-cli)

### ❌ Root Cause

The models are **capable** but **not configured** to reliably call tools:

1. **No `toolChoice` parameter set** - System never forces tool usage
2. **Weak system prompts** - No explicit tool-calling instructions for the DCF tool
3. **No concrete examples** - Models don't see examples of proper tool usage
4. **Complex schema** - DCF tool has optional parameters that confuse smaller models

From test logs, the agent responded:
> "Great. I can build a clear, Excel-friendly DCF model for NVIDIA... **Before I pull numbers**, here's a concise plan..."
> "**Questions to tailor the model**: Do you want FCFF (unlevered) or FCFE (levered)?"

This shows the model is **explaining** the tool instead of **executing** it.

---

## Proven Solutions (from Industry Research)

### Solution 1: Force Tool Calling with `toolChoice` Parameter ⭐ **RECOMMENDED**

The [Vercel AI SDK supports `toolChoice: 'required'`](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) to force models to call tools instead of generating text.

**Evidence:**
- [AI SDK Tool Calling Cheat Sheet](https://tigerabrodi.blog/vercel-ai-sdk-tool-calling-cheat-sheet) shows `toolChoice: 'required'` forces tool usage
- [Agents: Loop Control](https://ai-sdk.dev/docs/agents/loop-control) demonstrates forcing tools at every step

**Implementation:**
```typescript
// In coordinatorAgent.ts or fastAgentPanelStreaming.ts
await agent.streamText(
  context,
  { threadId },
  {
    promptMessageId: args.promptMessageId,
    system: systemPrompt,
    toolChoice: 'required', // ⭐ FORCE tool calling
  },
  streamOptions
);
```

**Caveat:** May not be supported by `@convex-dev/agent` wrapper - needs verification.

---

### Solution 2: Strengthen System Prompts with Explicit Tool Instructions ⭐ **PROVEN**

[Best practices research](https://www.augmentcode.com/blog/how-to-build-your-agent-11-prompting-techniques-for-better-ai-agents) shows smaller models need **explicit, detailed tool usage instructions**.

**Current Problem:** System prompt doesn't tell agent *when* and *how* to use createDCFSpreadsheet tool.

**Fix:** Add DCF-specific instructions to system prompt:

```typescript
const DCF_TOOL_INSTRUCTIONS = `
# DCF Tool Usage - CRITICAL INSTRUCTIONS

When a user requests a DCF model, valuation, or financial analysis:

1. **IMMEDIATELY call the createDCFSpreadsheet tool** - DO NOT ask clarifying questions first
2. **Use default scenario="base"** unless user specifies "bull" or "bear"
3. **The tool will handle all complexity** - you don't need to explain FCFF vs FCFE
4. **After tool execution, present the spreadsheet link** to the user

## Example Correct Behavior:
User: "Build a DCF model for NVIDIA"
Agent: [IMMEDIATELY calls createDCFSpreadsheet with ticker="NVDA", scenario="base"]
Agent: "I've created a DCF model for NVIDIA: [spreadsheet link]"

## WRONG Behavior (DO NOT DO THIS):
User: "Build a DCF model for NVIDIA"
Agent: "Great! Before I build the model, let me ask some questions..." ❌ WRONG

## Key Rule:
**Tools first, explanations later.** Always execute the tool BEFORE providing context.
`;
```

**Insert this into:**
- `convex/domains/agents/core/coordinatorAgent.ts` - Main system instructions
- `convex/domains/agents/fastAgentPanelStreaming.ts` - Response prompt override

---

### Solution 3: Add Tool Call Examples in Prompt ⭐ **HIGH IMPACT**

[Research shows](https://docs.retellai.com/build/prompt-engineering-guide) **concrete examples dramatically improve tool-calling reliability**.

**Implementation:**
```typescript
const DCF_TOOL_EXAMPLES = `
# Tool Call Examples

Example 1: Simple DCF Request
User: "Create a DCF for Tesla"
Tool Call: createDCFSpreadsheet(ticker="TSLA", scenario="base")
Response: "I've created a DCF model for Tesla (TSLA): [link]"

Example 2: Scenario-Specific Request
User: "Build a bear case DCF for Apple"
Tool Call: createDCFSpreadsheet(ticker="AAPL", scenario="bear")
Response: "I've created a bear case DCF model for Apple (AAPL): [link]"

Example 3: Multi-Company Request
User: "Build DCF models for NVDA and AMD"
Tool Call 1: createDCFSpreadsheet(ticker="NVDA", scenario="base")
Tool Call 2: createDCFSpreadsheet(ticker="AMD", scenario="base")
Response: "I've created DCF models for both companies: ..."
`;
```

---

### Solution 4: Enable Strict Mode for Tool Schema ⭐ **COMPLEMENTARY**

[AI SDK 6 introduces strict mode](https://vercel.com/blog/ai-sdk-6) for validated tool inputs.

**Implementation:**
```typescript
// In createDCFSpreadsheet tool definition
export const createDCFSpreadsheet = tool({
  // ... existing definition
  strict: true, // ⭐ Enforce schema validation
  inputSchema: z.object({
    ticker: z.string().toUpperCase(),
    scenario: z.enum(["bull", "base", "bear"]).default("base"),
  }),
});
```

**Benefits:**
- Prevents invalid tool calls with wrong parameter types
- Forces model to generate valid inputs
- [Particularly important for smaller models](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)

---

### Solution 5: Implement Tool Repair Function (Advanced)

If tool calls fail validation, [use `experimental_repairToolCall`](https://github.com/vercel/ai/discussions/1905) to fix them:

```typescript
experimental_repairToolCall: async ({ toolCall, toolSchema, error }) => {
  // Send to stronger model (gemini-3-flash) to repair
  const repairPrompt = `Fix this tool call:\nTool: ${toolCall.toolName}\nError: ${error}\nSchema: ${JSON.stringify(toolSchema)}`;

  const repair = await generateText({
    model: gemini('gemini-3-flash'),
    prompt: repairPrompt,
    temperature: 0,
  });

  return JSON.parse(repair.text);
}
```

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (5 min) ⭐ START HERE

1. **Add DCF tool instructions to system prompt**
   - File: `convex/domains/agents/core/coordinatorAgent.ts`
   - Location: Add to `instructions` string before agent creation
   - Impact: HIGH - Forces immediate tool calling

2. **Add tool examples**
   - Same file, same location
   - Impact: HIGH - Shows models correct behavior

### Phase 2: Configuration (10 min)

3. **Enable strict mode**
   - File: `convex/domains/agents/tools/createDCFSpreadsheet.ts`
   - Add `strict: true` to tool definition
   - Impact: MEDIUM - Prevents invalid calls

4. **Investigate toolChoice support**
   - Check if `@convex-dev/agent` supports `toolChoice` parameter
   - If yes, add `toolChoice: 'required'` for DCF requests
   - Impact: HIGH IF AVAILABLE

### Phase 3: Advanced (optional)

5. **Implement tool repair**
   - Add repair function for failed DCF calls
   - Impact: LOW - Only helps in edge cases

---

## Testing Strategy

### Before Fix:
```bash
# Test currently fails - agent explains instead of executing
npm run test:dcf
# Result: ❌ Timeout after 120s, no spreadsheet created
```

### After Fix:
```bash
# Test should pass - agent immediately calls tool
npm run test:dcf
# Expected: ✅ Spreadsheet created within 30s
```

### Verification Checkpoints:
1. ✅ Agent calls `createDCFSpreadsheet` on first turn (no questions)
2. ✅ Tool call has correct ticker parameter
3. ✅ Spreadsheet ID returned in response
4. ✅ Test completes in <60 seconds

---

## Alternative: Wait for API Quota Reset

If prompting fixes don't work:
- **Anthropic quota resets:** Feb 1, 2026 00:00 UTC
- **OpenAI quota resets:** Feb 1, 2026 00:00 UTC

Claude Haiku and GPT-4.1 Mini have **near-perfect tool calling** and won't have this issue.

---

## Sources

- [GPT-5 Nano Model Documentation](https://platform.openai.com/docs/models/gpt-5-nano)
- [Devstral 2 Function Calling](https://docs.mistral.ai/capabilities/function_calling)
- [Mistral Devstral 2 Announcement](https://mistral.ai/news/devstral-2-vibe-cli)
- [AI SDK Tool Calling Documentation](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [Tool Use | Vercel Academy](https://vercel.com/academy/ai-sdk/tool-use)
- [How to handle invalid tool calls? - GitHub Discussion](https://github.com/vercel/ai/discussions/1905)
- [Vercel AI SDK Tool Calling Cheat Sheet](https://tigerabrodi.blog/vercel-ai-sdk-tool-calling-cheat-sheet)
- [AI SDK 6 - Strict Mode](https://vercel.com/blog/ai-sdk-6)
- [11 Prompting Techniques for Better AI Agents](https://www.augmentcode.com/blog/how-to-build-your-agent-11-prompting-techniques-for-better-ai-agents)
- [Retell AI Prompt Engineering Guide](https://docs.retellai.com/build/prompt-engineering-guide)
- [GPT-5 Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)
- [10 Best Practices for Building Reliable AI Agents](https://www.uipath.com/blog/ai/agent-builder-best-practices)

---

## Next Steps

**Immediate action:** Implement Phase 1 fixes (system prompt improvements)
**Expected outcome:** E2E test passes with fallback models
**Fallback plan:** Wait for Feb 1 quota reset to use premium models

---

*Analysis completed: January 23, 2026*
