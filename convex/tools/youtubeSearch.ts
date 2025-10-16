// convex/tools/youtubeSearch.ts
// YouTube search tool for Agent component
// Provides YouTube video search using YouTube Data API v3

"use node";

import { createTool } from "@convex-dev/agent";
import { z } from "zod";

// YouTube API types
interface YouTubeSearchResult {
  kind: string;
  etag: string;
  items: Array<{
    kind: string;
    etag: string;
    id: {
      kind: string;
      videoId: string;
    };
    snippet: {
      publishedAt: string;
      channelId: string;
      title: string;
      description: string;
      thumbnails: {
        default: { url: string; width: number; height: number };
        medium: { url: string; width: number; height: number };
        high: { url: string; width: number; height: number };
      };
      channelTitle: string;
      publishTime: string;
    };
  }>;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

/**
 * Search YouTube for videos
 * 
 * This tool allows the AI to search for videos on YouTube,
 * providing embedded video players and video information.
 */
export const youtubeSearch = createTool({
  description: "Search YouTube for videos. Use this when users ask to find, watch, or see videos about a topic. Returns embedded YouTube videos that can be played directly in chat. IMPORTANT: Set this tool when users ask for 'videos', 'youtube', or want to 'watch' something.",
  
  args: z.object({
    query: z.string().describe("The search query for YouTube videos. Be specific for best results."),
    maxResults: z.number().min(1).max(10).default(5).describe("Number of videos to return (1-10). Default is 5."),
    order: z.enum(["relevance", "date", "rating", "viewCount"]).default("relevance").describe("How to sort results: relevance, date (newest), rating (highest rated), or viewCount (most viewed)"),
    videoDuration: z.enum(["any", "short", "medium", "long"]).default("any").describe("Filter by duration: any, short (<4min), medium (4-20min), long (>20min)"),
  }),
  
  handler: async (_ctx, args): Promise<string> => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const startTime = Date.now();
    let success = false;
    let videoCount = 0;
    let errorMsg: string | undefined;

    if (!apiKey) {
      throw new Error("YOUTUBE_API_KEY environment variable is not set. Get your API key from https://console.cloud.google.com/apis/credentials");
    }

    console.log(`[youtubeSearch] Searching for: "${args.query}" (max: ${args.maxResults}, order: ${args.order})`);

    try {
      // Build YouTube API URL
      const params = new URLSearchParams({
        part: 'snippet',
        q: args.query,
        type: 'video',
        maxResults: args.maxResults.toString(),
        order: args.order,
        videoDuration: args.videoDuration,
        key: apiKey,
      });

      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[youtubeSearch] API error (${response.status}):`, errorText);
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data: YouTubeSearchResult = await response.json();

      videoCount = data.items?.length || 0;
      console.log(`[youtubeSearch] ✅ Found ${videoCount} videos`);

      if (!data.items || data.items.length === 0) {
        success = true;
        
        // Track empty result
        _ctx.scheduler.runAfter(0, "apiUsageTracking:trackApiUsage" as any, {
          apiName: "youtube",
          operation: "search",
          unitsUsed: 100,
          estimatedCost: 0,
          requestMetadata: { query: args.query, videoCount: 0 },
          success: true,
          responseTime: Date.now() - startTime,
        });
        
        return "No videos found for your search query. Try different keywords.";
      }

      // Format the response with embedded YouTube videos
      let result = `Found ${data.items.length} videos:\n\n`;

      // Prepare structured data for gallery rendering
      const videos = data.items.map((item) => ({
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        description: item.snippet.description,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        videoId: item.id.videoId,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      }));

      // Add structured data marker for frontend gallery rendering
      result += `<!-- YOUTUBE_GALLERY_DATA\n${JSON.stringify(videos, null, 2)}\n-->\n\n`;

      result += "## Videos\n\n";

      // Add each video as an embedded iframe
      data.items.forEach((item, idx) => {
        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const channel = item.snippet.channelTitle;
        const description = item.snippet.description;

        // Add video embed using iframe (HTML5)
        result += `### ${idx + 1}. ${title}\n\n`;
        result += `**Channel:** ${channel}\n\n`;

        // Embed the video
        result += `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n\n`;

        // Add description
        if (description) {
          const shortDesc = description.substring(0, 150);
          result += `${shortDesc}${description.length > 150 ? '...' : ''}\n\n`;
        }

        // Add direct link
        result += `[Watch on YouTube](https://www.youtube.com/watch?v=${videoId}) 🔗\n\n`;

        result += "---\n\n";
      });

      success = true;
      
      // Track successful search
      const responseTime = Date.now() - startTime;
      _ctx.scheduler.runAfter(0, "apiUsageTracking:trackApiUsage" as any, {
        apiName: "youtube",
        operation: "search",
        unitsUsed: 100, // YouTube charges 100 units per search
        estimatedCost: 0, // Free within quota (10,000 units/day)
        requestMetadata: { 
          query: args.query, 
          videoCount,
          maxResults: args.maxResults,
          order: args.order,
        },
        success: true,
        responseTime,
      });

      return result;
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[youtubeSearch] Error:", error);
      
      // Track failed search
      const responseTime = Date.now() - startTime;
      try {
        _ctx.scheduler.runAfter(0, "apiUsageTracking:trackApiUsage" as any, {
          apiName: "youtube",
          operation: "search",
          unitsUsed: 0,
          estimatedCost: 0,
          requestMetadata: { query: args.query },
          success: false,
          errorMessage: errorMsg,
          responseTime,
        });
      } catch (trackError) {
        console.error("[youtubeSearch] Failed to track error:", trackError);
      }
      
      throw error;
    }
  },
});
