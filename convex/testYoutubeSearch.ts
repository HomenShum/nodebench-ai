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
 * Quick test - direct API call to YouTube
 */
export const quickYoutubeTest = action({
  args: {},
  handler: async (_ctx) => {
    console.log("🚀 Quick YouTube search test...");
    
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.error("❌ YOUTUBE_API_KEY not set!");
      return {
        success: false,
        error: "YOUTUBE_API_KEY environment variable is not set",
      };
    }
    
    console.log("✅ API Key found");
    
    try {
      const params = new URLSearchParams({
        part: 'snippet',
        q: 'javascript tutorial',
        type: 'video',
        maxResults: '2',
        order: 'relevance',
        key: apiKey,
      });

      console.log("📡 Calling YouTube API...");
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API error (${response.status}):`, errorText);
        return {
          success: false,
          error: `YouTube API error: ${response.status} ${errorText.substring(0, 200)}`,
        };
      }

      const data: any = await response.json();
      console.log(`✅ Success! Found ${data.items?.length || 0} videos`);
      
      if (data.items && data.items.length > 0) {
        const firstVideo = data.items[0];
        console.log(`First video: ${firstVideo.snippet.title}`);
        console.log(`Video ID: ${firstVideo.id.videoId}`);
        console.log(`Channel: ${firstVideo.snippet.channelTitle}`);
      }
      
      return {
        success: true,
        videosFound: data.items?.length || 0,
        firstVideoTitle: data.items?.[0]?.snippet?.title,
        firstVideoId: data.items?.[0]?.id?.videoId,
        message: "YouTube API test passed! ✅",
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
