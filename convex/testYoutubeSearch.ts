// convex/testYoutubeSearch.ts
// Integration test for YouTube search tool

import { action } from "./_generated/server";
import { v } from "convex/values";
import { youtubeSearch } from "./tools/youtubeSearch";

/**
 * Test the YouTube search tool with a real API call
 * Note: Tool handler is not directly accessible in new @convex-dev/agent structure
 * Use quickYoutubeTest for direct API testing
 * Tools work correctly when called through the agent
 */
export const testYoutubeSearchTool = action({
  args: {
    query: v.optional(v.string()),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log("🧪 YouTube search tool test...");
    console.log("Note: Direct tool.handler() calls not supported in new structure");
    console.log("Use 'quickYoutubeTest' for API testing or test via agent chat");
    
    return {
      success: false,
      message: "Direct tool handler calls not supported. Use quickYoutubeTest or test via agent.",
    };
    
    /* Commented out - tool.handler not accessible
    const testQuery = args.query || "cooking pasta";
    const maxResults = args.maxResults || 3;
    
    try {
      // Test 1: Basic search
      console.log(`\n📝 Test 1: Basic search for "${testQuery}"`);
      const result1 = await youtubeSearch.handler(ctx, { ... });
      ...all the old test code...
    */
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
