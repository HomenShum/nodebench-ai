// convex/testYoutubeSearch.ts
// Integration test for YouTube search tool

import { action } from "./_generated/server";
import { v } from "convex/values";
import { youtubeSearch } from "./tools/youtubeSearch";

/**
 * Test the YouTube search tool with a real API call
 */
export const testYoutubeSearchTool = action({
  args: {
    query: v.optional(v.string()),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log("🧪 Starting YouTube search test...");
    
    const testQuery = args.query || "cooking pasta";
    const maxResults = args.maxResults || 3;
    
    try {
      // Test 1: Basic search
      console.log(`\n📝 Test 1: Basic search for "${testQuery}"`);
      const result1 = await youtubeSearch.handler(ctx, {
        query: testQuery,
        maxResults,
        order: "relevance",
        videoDuration: "any",
      });
      
      console.log("✅ Test 1 passed!");
      console.log(`Result length: ${result1.length} characters`);
      console.log(`Contains iframe: ${result1.includes('<iframe')}`);
      console.log(`Contains YouTube embed: ${result1.includes('youtube.com/embed')}`);
      
      // Test 2: Short videos only
      console.log(`\n📝 Test 2: Short videos about "${testQuery}"`);
      const result2 = await youtubeSearch.handler(ctx, {
        query: testQuery,
        maxResults: 2,
        order: "relevance",
        videoDuration: "short",
      });
      
      console.log("✅ Test 2 passed!");
      console.log(`Result length: ${result2.length} characters`);
      
      // Test 3: Most viewed
      console.log(`\n📝 Test 3: Most viewed videos about "${testQuery}"`);
      const result3 = await youtubeSearch.handler(ctx, {
        query: testQuery,
        maxResults: 2,
        order: "viewCount",
        videoDuration: "any",
      });
      
      console.log("✅ Test 3 passed!");
      console.log(`Result length: ${result3.length} characters`);
      
      // Analyze first result
      console.log("\n📊 Analyzing first result...");
      const iframeMatches = result1.match(/<iframe.*?<\/iframe>/gs);
      const videoIdMatches = result1.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/g);
      const titleMatches = result1.match(/### \d+\. (.+)/g);
      
      console.log(`Found ${iframeMatches?.length || 0} iframe embeds`);
      console.log(`Found ${videoIdMatches?.length || 0} video IDs`);
      console.log(`Found ${titleMatches?.length || 0} video titles`);
      
      if (titleMatches && titleMatches.length > 0) {
        console.log(`First video title: ${titleMatches[0]}`);
      }
      
      // Return summary
      return {
        success: true,
        message: "All tests passed! ✅",
        tests: {
          test1: {
            query: testQuery,
            resultLength: result1.length,
            hasIframe: result1.includes('<iframe'),
            hasEmbed: result1.includes('youtube.com/embed'),
            videoCount: iframeMatches?.length || 0,
          },
          test2: {
            query: testQuery,
            duration: "short",
            resultLength: result2.length,
          },
          test3: {
            query: testQuery,
            order: "viewCount",
            resultLength: result3.length,
          },
        },
        sample: result1.substring(0, 500) + "...",
      };
      
    } catch (error: any) {
      console.error("❌ Test failed:", error);
      return {
        success: false,
        message: `Test failed: ${error.message}`,
        error: error.toString(),
      };
    }
  },
});

/**
 * Quick test - just search for one video
 */
export const quickYoutubeTest = action({
  args: {},
  handler: async (ctx) => {
    console.log("🚀 Quick YouTube search test...");
    
    try {
      const result = await youtubeSearch.handler(ctx, {
        query: "javascript tutorial",
        maxResults: 1,
        order: "relevance",
        videoDuration: "any",
      });
      
      console.log("✅ Success!");
      console.log(result);
      
      return {
        success: true,
        result,
      };
    } catch (error: any) {
      console.error("❌ Failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
