/**
 * Dynamic Prompt Enhancer - Meta-Cognitive Tool Instruction Generator
 *
 * Instead of hardcoded tool instructions, this uses a fast LLM to:
 * 1. Analyze user intent
 * 2. Detect which tools are relevant
 * 3. Generate context-specific instructions for those tools
 *
 * Benefits:
 * - No prompt bloat with instructions for tools that won't be used
 * - Adapts to new tools automatically via tool discovery
 * - Can strengthen instructions based on past failures
 * - Model-specific instruction styles (smaller models get more explicit guidance)
 */

"use node";

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { generateText } from "ai";
import { getLanguageModelSafe } from "../../domains/agents/mcp_tools/models";

/**
 * Analyzes user message and generates dynamic tool-calling instructions
 *
 * This is called BEFORE the main agent to enrich the system prompt with
 * context-specific instructions that guide smaller models toward correct tool usage.
 */
export const enhancePromptWithToolInstructions = internalAction({
  args: {
    userMessage: v.string(),
    targetModel: v.string(), // Model that will receive these instructions
    availableTools: v.optional(v.array(v.object({
      name: v.string(),
      description: v.string(),
      category: v.optional(v.string()),
    }))),
    conversationHistory: v.optional(v.array(v.object({
      role: v.string(),
      content: v.string(),
    }))),
    // Optional: Past failure signals
    recentFailures: v.optional(v.array(v.object({
      expectedTool: v.string(),
      actualBehavior: v.string(),
    }))),
  },
  returns: v.object({
    enhancedInstructions: v.string(),
    detectedIntent: v.string(),
    relevantTools: v.array(v.string()),
    confidence: v.number(),
  }),
  handler: async (ctx, args) => {
    // Use a fast, cheap model for meta-analysis (Haiku or Gemini Flash)
    const metaModel = getLanguageModelSafe("claude-haiku-4.5");

    // Build context for the meta-prompt
    const toolContext = args.availableTools
      ? `Available tools:\n${args.availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`
      : "";

    const failureContext = args.recentFailures?.length
      ? `\nRecent failures (strengthen instructions for these):\n${args.recentFailures.map(f =>
          `- Expected ${f.expectedTool}, but agent ${f.actualBehavior}`
        ).join('\n')}`
      : "";

    const conversationContext = args.conversationHistory?.length
      ? `\nRecent conversation:\n${args.conversationHistory.slice(-3).map(m =>
          `${m.role}: ${m.content}`
        ).join('\n')}`
      : "";

    // Meta-prompt: Analyze intent and generate instructions
    const metaPrompt = `You are a prompt engineering expert. Analyze this user request and generate SPECIFIC, ACTIONABLE tool-calling instructions for an AI agent.

User message: "${args.userMessage}"

${toolContext}
${conversationContext}
${failureContext}

Target model: ${args.targetModel}
Model characteristics:
- If "nano" or "free" in name: Needs VERY explicit, step-by-step instructions with examples
- If "mini" in name: Needs clear instructions with examples
- If "sonnet" or "opus": Can follow general guidelines
- If "haiku": Balance between explicit and concise

Your task:
1. Detect the user's primary intent (e.g., "dcf_valuation", "research", "document_creation", "data_query")
2. Identify which 1-3 tools are most relevant
3. Generate SPECIFIC instructions for those tools that:
   - Tell the agent WHEN to call each tool (exact conditions)
   - Provide a concrete example of correct usage
   - Emphasize immediate execution (no asking clarifying questions)
   - Are tailored to the target model's capability level

Format your response as JSON:
{
  "detectedIntent": "intent_category",
  "relevantTools": ["tool1", "tool2"],
  "confidence": 0.95,
  "instructions": "# SPECIFIC TOOL USAGE FOR THIS REQUEST\n\n[Your generated instructions here]\n\nExample:\nUser: [similar request]\nAgent: [immediately calls tool] [response]\n\nWRONG:\nAgent: [asks questions before calling tool] ❌"
}

Make instructions CONCRETE, not generic. Reference the actual user message and tools.`;

    try {
      const result = await generateText({
        model: metaModel,
        prompt: metaPrompt,
        temperature: 0.3, // Low temperature for consistent instruction generation
        maxRetries: 2,
      });

      // Parse the JSON response
      const parsed = JSON.parse(result.text.trim());

      return {
        enhancedInstructions: parsed.instructions,
        detectedIntent: parsed.detectedIntent,
        relevantTools: parsed.relevantTools || [],
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      console.error("[dynamicPromptEnhancer] Failed to generate instructions:", error);

      // Fallback: Return minimal instructions
      return {
        enhancedInstructions: "Use available tools when appropriate. Execute tools immediately without asking clarifying questions first.",
        detectedIntent: "unknown",
        relevantTools: [],
        confidence: 0.0,
      };
    }
  },
});

/**
 * Simplified version for fast intent detection only
 * (useful when you just need to know which tools to expect)
 */
export const detectIntentAndTools = internalAction({
  args: {
    userMessage: v.string(),
    availableTools: v.array(v.object({
      name: v.string(),
      description: v.string(),
    })),
  },
  returns: v.object({
    intent: v.string(),
    expectedTools: v.array(v.string()),
    confidence: v.number(),
  }),
  handler: async (ctx, args) => {
    const metaModel = getLanguageModelSafe("gemini-3-flash"); // Use fastest model

    const toolList = args.availableTools
      .map(t => `- ${t.name}: ${t.description}`)
      .join('\n');

    const prompt = `Analyze this user request and predict which tools should be called.

User: "${args.userMessage}"

Available tools:
${toolList}

Respond with JSON:
{
  "intent": "category (e.g., dcf_valuation, research, document_query)",
  "expectedTools": ["tool1", "tool2"],
  "confidence": 0.95
}`;

    try {
      const result = await generateText({
        model: metaModel,
        prompt,
        temperature: 0.2,
        maxRetries: 2,
      });

      const parsed = JSON.parse(result.text.trim());
      return {
        intent: parsed.intent || "unknown",
        expectedTools: parsed.expectedTools || [],
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      console.error("[detectIntentAndTools] Failed:", error);
      return {
        intent: "unknown",
        expectedTools: [],
        confidence: 0.0,
      };
    }
  },
});

/**
 * Tool-specific instruction templates
 * (Used as fallback or for rapid prototyping)
 */
export const TOOL_INSTRUCTION_TEMPLATES = {
  createDCFSpreadsheet: {
    detect: (msg: string) =>
      /\b(dcf|valuation|value|model|financial analysis|fair value)\b/i.test(msg) &&
      /\b(build|create|generate|make|calculate)\b/i.test(msg),

    generateInstructions: (ticker?: string, scenario?: string) => `
# DCF TOOL - IMMEDIATE EXECUTION REQUIRED

CRITICAL: User wants a DCF model. Execute createDCFSpreadsheet IMMEDIATELY.

**Correct behavior:**
1. Call createDCFSpreadsheet(ticker="${ticker || '[EXTRACT_FROM_MESSAGE]'}", scenario="${scenario || 'base'}")
2. THEN present the spreadsheet link
3. THEN optionally explain methodology

**Example:**
User: "Build a DCF for ${ticker || 'NVDA'}"
Agent: [calls createDCFSpreadsheet immediately] "I've created a DCF model: [link]"

**WRONG (do NOT do this):**
Agent: "I can help! First, let me ask: do you want FCFF or FCFE?" ❌
Agent: "What forecast horizon would you like?" ❌

Rule: EXECUTE FIRST, EXPLAIN AFTER.
`,
  },

  // Add more tool-specific templates as needed
  searchSecFilings: {
    detect: (msg: string) =>
      /\b(10-k|10-q|sec|edgar|filing|s-1|8-k)\b/i.test(msg),

    generateInstructions: (ticker?: string) => `
# SEC FILING TOOL - IMMEDIATE EXECUTION

User needs SEC filings. Call searchSecFilings immediately.

Correct: [calls searchSecFilings(ticker="${ticker || '[DETECT]'}")] then present results
Wrong: "Would you like 10-K or 10-Q?" ❌ (just get both)
`,
  },
};
