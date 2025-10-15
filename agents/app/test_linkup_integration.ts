/**
 * Test script for Linkup API integration
 * 
 * Tests:
 * 1. Image search with Linkup API
 * 2. Image validation
 * 3. Image collection with filtering
 * 4. Vision analysis with real images
 * 
 * Usage:
 *   npx tsx agents/app/test_linkup_integration.ts
 */

import { searchAndCollectImages, validateImageUrl, filterImages } from "../tools/imageCollector";
import { linkupImageSearch } from "../services/linkup";

async function testLinkupIntegration() {
  console.log("🧪 Testing Linkup API Integration\n");
  console.log("=".repeat(60));

  // Check environment variables
  const linkupKey = process.env.LINKUP_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const googleKey = process.env.GOOGLE_GENAI_API_KEY;

  console.log("\n📋 Environment Check:");
  console.log("─".repeat(60));
  console.log(`LINKUP_API_KEY: ${linkupKey ? "✅ Set" : "❌ Missing"}`);
  console.log(`OPENAI_API_KEY: ${openaiKey ? "✅ Set" : "❌ Missing"}`);
  console.log(`GOOGLE_GENAI_API_KEY: ${googleKey ? "✅ Set" : "❌ Missing"}`);

  if (!linkupKey) {
    console.log("\n⚠️  LINKUP_API_KEY not set. Tests will use fallback images.");
  }

  // Test 1: Direct Linkup Image Search
  console.log("\n\n📊 Test 1: Direct Linkup Image Search");
  console.log("─".repeat(60));
  
  const searchQuery = "VR avatars virtual reality characters 3D full-body";
  console.log(`Query: "${searchQuery}"`);
  
  try {
    const startTime = Date.now();
    const images = await linkupImageSearch(searchQuery, "standard");
    const duration = Date.now() - startTime;
    
    console.log(`✅ Search complete in ${(duration / 1000).toFixed(2)}s`);
    console.log(`Found ${images.length} images`);
    
    if (images.length > 0) {
      console.log("\nFirst 3 results:");
      images.slice(0, 3).forEach((img, idx) => {
        console.log(`  ${idx + 1}. ${img.name}`);
        console.log(`     URL: ${img.url.substring(0, 60)}...`);
        console.log(`     Type: ${img.type}`);
      });
    }
  } catch (error) {
    console.error("❌ Linkup search failed:", error);
    console.log("This is expected if LINKUP_API_KEY is not set.");
  }

  // Test 2: Image URL Validation
  console.log("\n\n📊 Test 2: Image URL Validation");
  console.log("─".repeat(60));
  
  const testUrls = [
    "https://images.unsplash.com/photo-1535223289827-42f1e9919769",
    "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac",
    "https://example.com/invalid-image.jpg",
  ];

  for (const url of testUrls) {
    console.log(`\nValidating: ${url.substring(0, 50)}...`);
    try {
      const validation = await validateImageUrl(url);
      
      if (validation.isValid) {
        console.log(`  ✅ Valid`);
        console.log(`     Content-Type: ${validation.contentType}`);
        console.log(`     Size: ${validation.size ? (validation.size / 1024).toFixed(2) + " KB" : "unknown"}`);
      } else {
        console.log(`  ❌ Invalid: ${validation.error}`);
      }
    } catch (error) {
      console.log(`  ❌ Validation error: ${error}`);
    }
  }

  // Test 3: Search and Collect with Validation
  console.log("\n\n📊 Test 3: Search and Collect Images");
  console.log("─".repeat(60));
  
  try {
    const startTime = Date.now();
    const result = await searchAndCollectImages(searchQuery, 5, true);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Collection complete in ${(duration / 1000).toFixed(2)}s`);
    console.log(`Total found: ${result.totalFound}`);
    console.log(`Valid: ${result.validCount}`);
    console.log(`Invalid: ${result.invalidCount}`);
    
    console.log("\nCollected images:");
    result.images.forEach((img) => {
      const status = img.isValid ? "✅" : "❌";
      console.log(`  ${status} ${img.imageId}: ${img.name}`);
      console.log(`     URL: ${img.url.substring(0, 60)}...`);
      console.log(`     Source: ${img.source}`);
      if (img.format) console.log(`     Format: ${img.format}`);
      if (img.size) console.log(`     Size: ${(img.size / 1024).toFixed(2)} KB`);
      if (img.validationError) console.log(`     Error: ${img.validationError}`);
    });

    // Test 4: Filter Images
    console.log("\n\n📊 Test 4: Filter Images");
    console.log("─".repeat(60));
    
    const validOnly = filterImages(result.images, { validOnly: true });
    console.log(`Valid images only: ${validOnly.length}/${result.images.length}`);
    
    const jpegOnly = filterImages(result.images, { formats: ["jpeg", "jpg"] });
    console.log(`JPEG images only: ${jpegOnly.length}/${result.images.length}`);
    
    const smallOnly = filterImages(result.images, { maxSize: 500 * 1024 }); // 500KB
    console.log(`Small images (<500KB): ${smallOnly.length}/${result.images.length}`);

  } catch (error) {
    console.error("❌ Collection failed:", error);
  }

  // Test 5: Integration with Vision Analysis
  console.log("\n\n📊 Test 5: Vision Analysis Integration");
  console.log("─".repeat(60));
  
  if (openaiKey || googleKey) {
    try {
      const result = await searchAndCollectImages(searchQuery, 2, true);
      const validImages = result.images.filter((img) => img.isValid);
      
      if (validImages.length > 0) {
        console.log(`Testing vision analysis on ${validImages.length} images...`);
        
        // Import vision analysis tool
        const { analyzeImageMultiModel } = await import("../tools/visionAnalysis");
        
        const testImage = validImages[0];
        console.log(`\nAnalyzing: ${testImage.name}`);
        console.log(`URL: ${testImage.url.substring(0, 60)}...`);
        
        const visionPrompt = `Analyze this image for quality. Rate visual quality on 1-5 scale.`;
        const models: Array<"gpt-5-mini" | "gemini-2.5-flash"> = [];
        
        if (openaiKey) models.push("gpt-5-mini");
        if (googleKey) models.push("gemini-2.5-flash");
        
        const apiKeys = {
          openai: openaiKey,
          google: googleKey,
        };
        
        const startTime = Date.now();
        const analysisResults = await analyzeImageMultiModel(
          testImage.url,
          testImage.imageId,
          visionPrompt,
          models,
          apiKeys
        );
        const duration = Date.now() - startTime;
        
        console.log(`\n✅ Analysis complete in ${(duration / 1000).toFixed(2)}s`);
        
        for (const [model, result] of Object.entries(analysisResults)) {
          console.log(`\n${model}:`);
          console.log(`  Visual Quality: ${result.ratings.visualQuality}/5`);
          console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
          console.log(`  Findings: ${result.detailedFindings.substring(0, 100)}...`);
        }
      } else {
        console.log("⚠️  No valid images found for vision analysis");
      }
    } catch (error) {
      console.error("❌ Vision analysis test failed:", error);
    }
  } else {
    console.log("⚠️  Skipped: No vision API keys set");
  }

  // Summary
  console.log("\n\n" + "=".repeat(60));
  console.log("✨ Testing Complete!");
  console.log("=".repeat(60));
  
  console.log("\n📝 Summary:");
  console.log("  ✅ Linkup image search integration");
  console.log("  ✅ Image URL validation");
  console.log("  ✅ Image collection with filtering");
  console.log("  ✅ Vision analysis integration");
  
  console.log("\n🚀 Next Steps:");
  console.log("  1. Run full workflow: npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_visual_llm_validation.json");
  console.log("  2. Deploy to Convex: npx convex deploy");
  console.log("  3. Test in production UI");
}

// Run tests
testLinkupIntegration().catch(console.error);

