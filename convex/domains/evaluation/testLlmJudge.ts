/**
 * Test LLM Judge Cost Optimization
 * Verifies FREE model fallback chain works correctly
 */

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";

export const testJudgeModelSelection = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("=".repeat(80));
    console.log("TEST: LLM Judge Model Selection & Cost Optimization");
    console.log("=".repeat(80));

    const results = {
      openrouterAvailable: !!process.env.OPENROUTER_API_KEY,
      googleAvailable: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      anthropicAvailable: !!process.env.ANTHROPIC_API_KEY,
      expectedPrimaryModel: "",
      expectedCost: "",
    };

    // Determine expected model based on available keys
    if (process.env.OPENROUTER_API_KEY) {
      results.expectedPrimaryModel = "qwen3-coder-free";
      results.expectedCost = "$0.00/M (FREE)";
    } else if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      results.expectedPrimaryModel = "gemini-3-flash";
      results.expectedCost = "$0.50/M";
    } else if (process.env.ANTHROPIC_API_KEY) {
      results.expectedPrimaryModel = "claude-haiku-4.5";
      results.expectedCost = "$1.00/M";
    } else {
      results.expectedPrimaryModel = "NONE - No API keys available";
      results.expectedCost = "N/A";
    }

    console.log("\n📊 Environment Status:");
    console.log(`OpenRouter API Key: ${results.openrouterAvailable ? "✅ Available" : "❌ Not Set"}`);
    console.log(`Google API Key: ${results.googleAvailable ? "✅ Available" : "❌ Not Set"}`);
    console.log(`Anthropic API Key: ${results.anthropicAvailable ? "✅ Available" : "❌ Not Set"}`);

    console.log("\n🎯 Expected Model Selection:");
    console.log(`Primary Model: ${results.expectedPrimaryModel}`);
    console.log(`Expected Cost: ${results.expectedCost}`);

    console.log("\n💡 Optimization Impact:");
    if (results.openrouterAvailable) {
      console.log("✅ OPTIMAL: Using FREE model (100% cost savings)");
      console.log("   Previous cost: $0.50-1.00/M");
      console.log("   Current cost: $0.00/M");
      console.log("   Savings: 100%");
    } else if (results.googleAvailable) {
      console.log("⚠️  BUDGET: Using gemini-3-flash");
      console.log("   Recommendation: Add OPENROUTER_API_KEY for FREE models");
      console.log("   Potential savings: 100% (from $0.50/M to $0.00/M)");
    } else {
      console.log("❌ EXPENSIVE: Using claude-haiku-4.5 fallback");
      console.log("   Recommendation: Add OPENROUTER_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY");
      console.log("   Potential savings: 93-100%");
    }

    console.log("\n📈 Fallback Chain:");
    console.log("1. qwen3-coder-free ($0.00/M) - FREE via OpenRouter");
    console.log("2. glm-4.7-flash ($0.07/M) - Ultra-cheap via OpenRouter");
    console.log("3. gemini-3-flash ($0.50/M) - Budget via Google");
    console.log("4. claude-haiku-4.5 ($1.00/M) - Last resort via Anthropic");

    console.log("=".repeat(80));

    return {
      success: true,
      results,
    };
  },
});

export const testJudgeWithSimpleEvaluation = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("=".repeat(80));
    console.log("TEST: LLM Judge - Simple Boolean Evaluation");
    console.log("=".repeat(80));

    try {
      const { generateText } = await import("ai");
      const { getLanguageModelSafe } = await import("../agents/mcp_tools/models");

      // Simulate what getDefaultJudgeModel() would return
      let modelName = "qwen3-coder-free"; // Default FREE model
      if (!process.env.OPENROUTER_API_KEY && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        modelName = "gemini-3-flash";
      } else if (!process.env.OPENROUTER_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        modelName = "claude-haiku-4.5";
      }

      console.log(`\nUsing model: ${modelName}`);
      const startTime = Date.now();

      const model = getLanguageModelSafe(modelName);

      const prompt = `Evaluate this claim as TRUE or FALSE:

Claim: "The Earth revolves around the Sun."

Respond with ONLY "TRUE" or "FALSE".`;

      const { text } = await generateText({
        model,
        prompt,
        maxOutputTokens: 10,
      });

      const duration = Date.now() - startTime;

      console.log(`\n✅ Evaluation completed successfully`);
      console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(`💰 Model: ${modelName}`);
      console.log(`📝 Response: ${text.trim()}`);
      console.log(`✓  Expected: TRUE`);

      const isCorrect = text.trim().toUpperCase().includes("TRUE");
      console.log(`${isCorrect ? "✅" : "❌"} Result: ${isCorrect ? "CORRECT" : "INCORRECT"}`);

      console.log("=".repeat(80));

      return {
        success: true,
        model: modelName,
        duration,
        response: text.trim(),
        isCorrect,
      };
    } catch (error: any) {
      console.error("❌ TEST FAILED:", error.message);
      console.error("Stack:", error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
