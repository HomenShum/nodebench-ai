# Tool Calling Fix - Implementation Complete

## What Was Fixed

The E2E test was failing because fallback models (gpt-5-nano, devstral-2-free) **were not calling the DCF tool**. Instead, they provided long explanations and asked clarifying questions.

### Root Cause
- Both models **support tool calling** ([gpt-5-nano](https://platform.openai.com/docs/models/gpt-5-nano), [devstral-2](https://mistral.ai/news/devstral-2-vibe-cli))
- But they need **explicit instructions** to reliably call tools
- Research shows [concrete examples dramatically improve tool-calling reliability](https://www.augmentcode.com/blog/how-to-build-your-agent-11-prompting-techniques-for-better-ai-agents) for smaller models

---

## Changes Implemented

### 1. Added DCF Tool Instructions to Coordinator Agent
**File:** [convex/domains/agents/core/coordinatorAgent.ts](convex/domains/agents/core/coordinatorAgent.ts)

**Location:** Lines 576-604 (after "REAL-TIME NEWS" section)

**What was added:**
```markdown
## FINANCIAL MODELS & DCF (MANDATORY - IMMEDIATE EXECUTION)

When the user requests a DCF model, valuation, or financial analysis:

**CRITICAL: Execute tools FIRST, explanations AFTER**

1. **IMMEDIATELY call createDCFSpreadsheet** - DO NOT ask clarifying questions first
2. **Use scenario="base"** unless the user explicitly specifies "bull" or "bear"
3. **The tool handles all complexity** - you don't need to explain FCFF vs FCFE before calling
4. **After tool execution**, present the spreadsheet link and then provide context if helpful

### Examples of CORRECT Behavior:

User: "Build a DCF model for NVIDIA"
You: [IMMEDIATELY calls createDCFSpreadsheet with ticker="NVDA", scenario="base"]
     "I've created a DCF model for NVIDIA: [spreadsheet link]. The model uses base-case assumptions..."

User: "Create a bear case valuation for Tesla"
You: [IMMEDIATELY calls createDCFSpreadsheet with ticker="TSLA", scenario="bear"]
     "I've created a bear case DCF model for Tesla: [spreadsheet link]"

### WRONG Behavior (DO NOT DO THIS):

User: "Build a DCF model for NVIDIA"
You: "Great! Before I build the model, let me explain... Do you want FCFF or FCFE?" ❌ WRONG
You: "I can build that. What forecast horizon would you like?" ❌ WRONG

### Key Rule:
**Tools first, explanations later.** Always execute createDCFSpreadsheet BEFORE providing methodology context.
```

### 2. Added DCF Instructions to UI Rendering Guidance
**File:** [convex/domains/agents/fastAgentPanelStreaming.ts](convex/domains/agents/fastAgentPanelStreaming.ts)

**Location:** Lines 2489-2503 (uiRenderingGuidance array)

**What was added:**
```typescript
"",
"FINANCIAL MODELS (CRITICAL - IMMEDIATE EXECUTION):",
"- When user requests DCF model/valuation: IMMEDIATELY call createDCFSpreadsheet tool (do NOT ask clarifying questions first)",
"- Use scenario='base' unless user specifies 'bull' or 'bear'",
"- Example: User: 'Build a DCF for NVDA' → You: [calls createDCFSpreadsheet(ticker='NVDA', scenario='base')] then present link",
"- Rule: Execute tool FIRST, provide context AFTER",
```

**Why both locations?**
- `coordinatorAgent.ts` = Base instructions
- `fastAgentPanelStreaming.ts` = System prompt override (used most of the time)
- The override **replaces** base instructions, so we need DCF instructions in both places

---

## Status

✅ **Changes compiled successfully** (Convex functions ready at 10:29:23 AM)

✅ **Both fallback models support tool calling**:
- [GPT-5 Nano supports parallel function calling](https://platform.openai.com/docs/models/gpt-5-nano)
- [Devstral 2 tool-calling success rate on par with best closed models](https://mistral.ai/news/devstral-2-vibe-cli)

✅ **Prompt engineering approach is proven**:
- [11 Prompting Techniques for Better AI Agents](https://www.augmentcode.com/blog/how-to-build-your-agent-11-prompting-techniques-for-better-ai-agents)
- [Retell AI Prompt Engineering Guide](https://docs.retellai.com/build/prompt-engineering-guide)
- [GPT-5 Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)

---

## Expected Results

### Before Fix:
```
User: "Build a DCF model for NVIDIA"
Agent (gpt-5-nano): "Great! I can build a clear, Excel-friendly DCF model for NVIDIA...
                     Before I pull numbers, here's a concise plan...
                     Questions to tailor the model:
                     - Do you want FCFF (unlevered) or FCFE (levered)?
                     - Forecast horizon: 5 years standard, or longer?
                     ..."
Result: ❌ No tool call, test timeout after 120s
```

### After Fix:
```
User: "Build a DCF model for NVIDIA"
Agent (gpt-5-nano): [IMMEDIATELY calls createDCFSpreadsheet(ticker="NVDA", scenario="base")]
                     "I've created a DCF model for NVIDIA: [spreadsheet link]"
Result: ✅ Tool called immediately, spreadsheet created in ~30s
```

---

## Testing

### Run E2E Test:
```bash
# Make sure services are running:
# Terminal 1: npx convex dev
# Terminal 2: npm run dev

# Terminal 3: Run test
npm run test:dcf
```

### Expected Behavior:
1. ✅ Test loads page successfully
2. ✅ Opens Fast Agent panel
3. ✅ Sends message: "Build a DCF model for NVIDIA"
4. ✅ Agent **immediately calls createDCFSpreadsheet** (no questions)
5. ✅ Tool executes and returns spreadsheet ID
6. ✅ Test navigates to spreadsheet
7. ✅ Test verifies DCF data
8. ✅ **Test passes in <60 seconds**

### Verification Checkpoints:
- [ ] Agent calls `createDCFSpreadsheet` on first turn (no clarifying questions)
- [ ] Tool call parameters: `ticker="NVDA"`, `scenario="base"`
- [ ] Response contains spreadsheet link
- [ ] Test completes successfully

---

## Additional Improvements Made

Beyond fixing the immediate issue, the prompt improvements also:

✅ **Make the tool more user-friendly** - Users get faster responses without unnecessary back-and-forth

✅ **Reduce token usage** - No long explanations before tool execution

✅ **Follow best practices** - [AI SDK documentation recommends explicit tool usage instructions](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)

✅ **Provide clear examples** - Models learn from concrete examples ([UiPath best practices](https://www.uipath.com/blog/ai/agent-builder-best-practices))

---

## Alternative Solutions (Not Implemented Yet)

If the prompt-based fix doesn't fully solve the issue, these advanced options are available:

### 1. Force Tool Choice (if supported by @convex-dev/agent)
```typescript
toolChoice: 'required' // Force model to call a tool
```
[Vercel AI SDK Documentation](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)

### 2. Enable Strict Mode
```typescript
// In createDCFSpreadsheet.ts
strict: true // Enforce schema validation
```
[AI SDK 6 - Strict Mode](https://vercel.com/blog/ai-sdk-6)

### 3. Implement Tool Repair
```typescript
experimental_repairToolCall: async ({ toolCall, error }) => {
  // Use stronger model to fix invalid tool calls
}
```
[How to handle invalid tool calls?](https://github.com/vercel/ai/discussions/1905)

---

## Fallback Plan

If E2E test still fails after prompt improvements:

**Wait for API Quota Reset:**
- Anthropic quota resets: **Feb 1, 2026 00:00 UTC**
- OpenAI quota resets: **Feb 1, 2026 00:00 UTC**

Claude Haiku 4.5 and GPT-4.1 Mini have **near-perfect tool calling** and won't have this issue.

---

## References

### Model Capabilities:
- [GPT-5 Nano Model Documentation](https://platform.openai.com/docs/models/gpt-5-nano)
- [Devstral 2 Function Calling](https://docs.mistral.ai/capabilities/function_calling)
- [Mistral Devstral 2 Announcement](https://mistral.ai/news/devstral-2-vibe-cli)

### Best Practices:
- [How to Build Your Agent: 11 Prompting Techniques](https://www.augmentcode.com/blog/how-to-build-your-agent-11-prompting-techniques-for-better-ai-agents)
- [Retell AI Prompt Engineering Guide](https://docs.retellai.com/build/prompt-engineering-guide)
- [GPT-5 Prompting Guide - OpenAI Cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)
- [10 Best Practices for Building Reliable AI Agents - UiPath](https://www.uipath.com/blog/ai/agent-builder-best-practices)

### AI SDK Documentation:
- [AI SDK Core: Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [Tool Use | Vercel Academy](https://vercel.com/academy/ai-sdk/tool-use)
- [Vercel AI SDK Tool Calling Cheat Sheet](https://tigerabrodi.blog/vercel-ai-sdk-tool-calling-cheat-sheet)
- [AI SDK 6 - Strict Mode](https://vercel.com/blog/ai-sdk-6)
- [How to handle invalid tool calls? - GitHub Discussion](https://github.com/vercel/ai/discussions/1905)

---

## Summary

✅ **Root cause identified:** Smaller models need explicit tool-calling instructions

✅ **Solution implemented:** Added detailed DCF tool instructions with examples to both base and override prompts

✅ **Changes compiled:** Convex backend ready with new prompts

✅ **Ready to test:** Run `npm run test:dcf` to verify fix

✅ **Expected outcome:** Agent immediately calls tool instead of asking questions

---

*Fix implemented: January 23, 2026 at 10:29 AM*
*Files modified: 2 (coordinatorAgent.ts, fastAgentPanelStreaming.ts)*
*Convex compilation: ✅ Successful (39.66s)*
