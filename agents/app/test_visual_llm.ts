/**
 * Test script for Visual LLM Validation Workflow
 * 
 * Usage:
 *   npx tsx agents/app/test_visual_llm.ts
 */

import { visionAnalysisTool } from "../tools/visionAnalysis";

async function testVisionAnalysis() {
  console.log("🧪 Testing Visual LLM Validation Workflow\n");

  // Test configuration
  const testImageUrl = "https://example.com/vr-avatar.jpg";
  const testImageId = "test_img_1";
  const testPrompt = `Analyze this VR avatar image for quality issues.

Detect:
1. Visual artifacts (redlines, distortions, glitches)
2. Movement quality issues (frozen feet, static fingers)
3. Eye rendering problems (red lines, artifacts)
4. Clothing distortions

Rate on 1-5 scale:
- movementMotion (1=worst/frozen, 5=best/natural)
- visualQuality (1=worst/distorted, 5=best/clean)
- emotionalComfort (1=worst/unsettling, 5=best/comfortable)

Provide confidence score 0-1.`;

  const apiKeys = {
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_GENAI_API_KEY,
  };

  // Test 1: GPT-5-mini analysis
  console.log("📊 Test 1: GPT-5-mini Vision Analysis");
  console.log("─".repeat(50));
  
  if (apiKeys.openai) {
    try {
      const gpt5Result = await visionAnalysisTool.analyzeImageWithGPT5Mini(
        testImageUrl,
        testImageId,
        testPrompt,
        apiKeys.openai
      );
      
      console.log("✅ GPT-5-mini analysis complete");
      console.log("Model:", gpt5Result.modelName);
      console.log("Confidence:", (gpt5Result.confidence * 100).toFixed(0) + "%");
      console.log("Ratings:", gpt5Result.ratings);
      console.log("Artifacts:", gpt5Result.artifacts);
      console.log("Findings:", gpt5Result.detailedFindings.substring(0, 100) + "...");
    } catch (error) {
      console.error("❌ GPT-5-mini test failed:", error);
    }
  } else {
    console.log("⚠️  Skipped: OPENAI_API_KEY not set");
  }

  console.log("\n");

  // Test 2: Gemini analysis
  console.log("📊 Test 2: Gemini 2.0 Flash Vision Analysis");
  console.log("─".repeat(50));
  
  if (apiKeys.google) {
    try {
      const geminiResult = await visionAnalysisTool.analyzeImageWithGemini(
        testImageUrl,
        testImageId,
        testPrompt,
        apiKeys.google
      );
      
      console.log("✅ Gemini analysis complete");
      console.log("Model:", geminiResult.modelName);
      console.log("Confidence:", (geminiResult.confidence * 100).toFixed(0) + "%");
      console.log("Ratings:", geminiResult.ratings);
      console.log("Artifacts:", geminiResult.artifacts);
      console.log("Findings:", geminiResult.detailedFindings.substring(0, 100) + "...");
    } catch (error) {
      console.error("❌ Gemini test failed:", error);
    }
  } else {
    console.log("⚠️  Skipped: GOOGLE_GENAI_API_KEY not set");
  }

  console.log("\n");

  // Test 3: Multi-model parallel analysis
  console.log("📊 Test 3: Multi-Model Parallel Analysis");
  console.log("─".repeat(50));
  
  if (apiKeys.openai && apiKeys.google) {
    try {
      const startTime = Date.now();
      
      const multiResults = await visionAnalysisTool.analyzeImageMultiModel(
        testImageUrl,
        testImageId,
        testPrompt,
        ["gpt-5-mini", "gemini-2.5-flash"],
        apiKeys
      );
      
      const duration = Date.now() - startTime;
      
      console.log("✅ Multi-model analysis complete");
      console.log("Duration:", (duration / 1000).toFixed(1) + "s");
      console.log("Models analyzed:", Object.keys(multiResults).join(", "));
      
      // Compare results
      console.log("\n📈 Model Comparison:");
      for (const [model, result] of Object.entries(multiResults)) {
        console.log(`\n${model}:`);
        console.log("  Visual Quality:", result.ratings.visualQuality + "/5");
        console.log("  Movement Motion:", result.ratings.movementMotion + "/5");
        console.log("  Emotional Comfort:", result.ratings.emotionalComfort + "/5");
        console.log("  Confidence:", (result.confidence * 100).toFixed(0) + "%");
        console.log("  Has Artifacts:", result.artifacts.hasRedlines || result.artifacts.hasDistortions);
      }
      
      // Calculate agreement
      const models = Object.values(multiResults);
      if (models.length === 2) {
        const visualDiff = Math.abs(models[0].ratings.visualQuality - models[1].ratings.visualQuality);
        const movementDiff = Math.abs(models[0].ratings.movementMotion - models[1].ratings.movementMotion);
        const comfortDiff = Math.abs(models[0].ratings.emotionalComfort - models[1].ratings.emotionalComfort);
        
        console.log("\n🔍 Inter-Model Agreement:");
        console.log("  Visual Quality Diff:", visualDiff + "/5");
        console.log("  Movement Motion Diff:", movementDiff + "/5");
        console.log("  Emotional Comfort Diff:", comfortDiff + "/5");
        console.log("  Average Diff:", ((visualDiff + movementDiff + comfortDiff) / 3).toFixed(2) + "/5");
      }
    } catch (error) {
      console.error("❌ Multi-model test failed:", error);
    }
  } else {
    console.log("⚠️  Skipped: Both API keys required");
  }

  console.log("\n");
  console.log("✨ Testing complete!");
}

// Run tests
testVisionAnalysis().catch(console.error);

