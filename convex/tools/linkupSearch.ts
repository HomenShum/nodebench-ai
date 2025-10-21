// convex/tools/linkupSearch.ts
// Linkup search tool for Agent component
// Provides web search capabilities using Linkup's advanced search API

"use node";

import { createTool } from "@convex-dev/agent";
import { z } from "zod";

// Linkup API types
interface LinkupSearchResult {
  answer?: string;
  sources?: Array<{
    name: string;
    url: string;
    snippet: string;
  }>;
  results?: Array<{
    type: "text" | "image" | "video" | "audio";
    name: string;
    url: string;
    content?: string;
    thumbnail?: string;
  }>;
}

/**
 * Helper to extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Search the web using Linkup's AI-optimized search API
 * 
 * This tool allows the AI to search for current information on the web,
 * providing grounded, factual responses with sources.
 */
export const linkupSearch = createTool({
  description: "Search the web for current information using Linkup's AI-optimized search. Use this when you need up-to-date facts, news, or information that isn't in your training data. Returns an answer with sources and optionally images. IMPORTANT: When users ask for 'images', 'pictures', 'photos' or want to 'see' something visual, you MUST set includeImages to true!",
  
  args: z.object({
    query: z.string().describe("The natural language search query. Be specific and detailed for best results."),
    depth: z.enum(["standard", "deep"]).default("standard").describe("Search depth: 'standard' is faster, 'deep' is more comprehensive but slower"),
    includeImages: z.boolean().default(false).describe("CRITICAL: Set to TRUE when users ask for images, pictures, photos, or want to see visual content. Set to FALSE for text-only searches."),
    includeDomains: z.array(z.string()).optional().describe("Optional: Specific domains to search within (e.g., ['microsoft.com', 'github.com'])"),
    excludeDomains: z.array(z.string()).optional().describe("Optional: Domains to exclude from search (e.g., ['wikipedia.com'])"),
  }),
  
  handler: async (_ctx, args): Promise<string> => {
    const apiKey = process.env.LINKUP_API_KEY;
    const startTime = Date.now();
    let success = false;
    let imageCount = 0;
    let errorMsg: string | undefined;

    if (!apiKey) {
      throw new Error("LINKUP_API_KEY environment variable is not set. Please add it to your Convex environment variables.");
    }

    // Use searchResults output type when images are requested to get the mixed results array
    const outputType = args.includeImages ? "searchResults" : "sourcedAnswer";
    
    console.log(`[linkupSearch] Searching for: "${args.query}" (depth: ${args.depth}, images: ${args.includeImages}, outputType: ${outputType})`);

    try {
      const response = await fetch("https://api.linkup.so/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: args.query,
          depth: args.depth,
          outputType,
          includeImages: args.includeImages,
          includeDomains: args.includeDomains,
          excludeDomains: args.excludeDomains,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[linkupSearch] API error (${response.status}):`, errorText);
        throw new Error(`Linkup API error: ${response.status} ${response.statusText}`);
      }

      const data: LinkupSearchResult = await response.json();

      // Filter results by type
      const textResults = data.results?.filter(r => r.type === "text") || [];
      const imageResults = data.results?.filter(r => r.type === "image") || [];
      const videoResults = data.results?.filter(r => r.type === "video") || [];
      const audioResults = data.results?.filter(r => r.type === "audio") || [];

      console.log(`[linkupSearch] ✅ Response received:`, {
        resultsTotal: data.results?.length || 0,
        textCount: textResults.length,
        imagesCount: imageResults.length,
        videosCount: videoResults.length,
        audiosCount: audioResults.length,
        hasAnswer: !!data.answer,
        hasSources: !!data.sources
      });
      
      // Debug: Log first image if present
      if (imageResults.length > 0) {
        console.log(`[linkupSearch] 📸 First image URL:`, imageResults[0].url);
        console.log(`[linkupSearch] 📸 First image name:`, imageResults[0].name);
      } else if (args.includeImages) {
        console.warn(`[linkupSearch] ⚠️ includeImages was TRUE but API returned 0 images!`);
      }

      // Format the response
      let result = "";

      // Add answer if using sourcedAnswer output type
      if (data.answer) {
        result += `${data.answer}\n\n`;
      }

      // Add images if present
      if (imageResults.length > 0) {
        imageCount = imageResults.length;

        // Prepare structured data for gallery rendering
        const images = imageResults.slice(0, 10).map((image) => ({
          url: image.url,
          alt: image.name || "Image",
          thumbnail: image.thumbnail,
        }));

        // Add structured data marker for frontend gallery rendering
        result += `<!-- IMAGE_DATA\n${JSON.stringify(images, null, 2)}\n-->\n\n`;

        // Also add markdown images for text-based rendering
        result += "## Images\n\n";
        imageResults.slice(0, 10).forEach((image) => {
          const altText = image.name || "Image";
          result += `![${altText}](${image.url}) `;
        });
        result += "\n\n";
      }

      // Add videos if present
      if (videoResults.length > 0) {
        result += "## Videos\n\n";
        videoResults.slice(0, 5).forEach((video) => {
          // Use HTML5 video tag for videos (ReactMarkdown with rehype-raw will render this)
          result += `<video controls width="400" ${video.thumbnail ? `poster="${video.thumbnail}"` : ''}>\n`;
          result += `  <source src="${video.url}" type="video/webm" />\n`;
          result += `  <source src="${video.url}" type="video/mp4" />\n`;
          result += `  Your browser does not support the video tag.\n`;
          result += `</video>\n`;
          if (video.name) {
            result += `*${video.name}*\n`;
          }
          result += "\n";
        });
      }

      // Add audios if present
      if (audioResults.length > 0) {
        result += "## Audio\n\n";
        audioResults.slice(0, 5).forEach((audio) => {
          // Use HTML5 audio tag for audio files (ReactMarkdown with rehype-raw will render this)
          result += `<audio controls>\n`;
          result += `  <source src="${audio.url}" type="audio/webm" />\n`;
          result += `  <source src="${audio.url}" type="audio/mpeg" />\n`;
          result += `  Your browser does not support the audio tag.\n`;
          result += `</audio>\n`;
          if (audio.name) {
            result += `*${audio.name}*\n`;
          }
          result += "\n";
        });
      }

      // Add text results if using searchResults output type
      if (textResults.length > 0 && !data.answer) {
        // Prepare structured data for gallery rendering
        const sources = textResults.slice(0, 10).map((text) => ({
          title: text.name,
          url: text.url,
          domain: extractDomain(text.url),
          description: text.content?.substring(0, 200) || '',
        }));

        // Add structured data marker for frontend gallery rendering
        result += `<!-- SOURCE_GALLERY_DATA\n${JSON.stringify(sources, null, 2)}\n-->\n\n`;

        // Also add human-readable text for context
        result += "## Search Results\n\n";
        textResults.slice(0, 5).forEach((text, idx) => {
          result += `${idx + 1}. **[${text.name}](${text.url})** 🔗\n\n`;
          if (text.content) {
            result += `   ${text.content.substring(0, 200)}...\n\n`;
          }
        });
      }

      // Add sources (for sourcedAnswer output type)
      if (data.sources && data.sources.length > 0) {
        // Prepare structured data for gallery rendering
        const sources = data.sources.slice(0, 10).map((source) => ({
          title: source.name,
          url: source.url,
          domain: extractDomain(source.url),
          description: source.snippet?.substring(0, 200) || '',
        }));

        // Add structured data marker for frontend gallery rendering
        result += `<!-- SOURCE_GALLERY_DATA\n${JSON.stringify(sources, null, 2)}\n-->\n\n`;

        // Also add human-readable text for context
        result += "## Sources\n\n";
        data.sources.slice(0, 5).forEach((source, idx) => {
          result += `${idx + 1}. **[${source.name}](${source.url})** 🔗\n\n`;
          if (source.snippet) {
            result += `   ${source.snippet.substring(0, 200)}...\n\n`;
          }
        });
      }

      success = true;
      
      // Track API usage (asynchronously, don't wait)
      // Linkup Pricing (2025): €5/1,000 standard searches = ~$0.0055/search = 0.55 cents
      // Deep search would be ~5.5 cents but we only use standard
      const responseTime = Date.now() - startTime;
      _ctx.scheduler.runAfter(0, "apiUsageTracking:trackApiUsage" as any, {
        apiName: "linkup",
        operation: "search",
        unitsUsed: 1,
        estimatedCost: 1, // 0.55 cents for standard, round up to 1 cent
        requestMetadata: { query: args.query, imageCount, depth: args.depth },
        success: true,
        responseTime,
      });

      return result;
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[linkupSearch] Error:", error);
      
      // Track failed API call (asynchronously)
      const responseTime = Date.now() - startTime;
      try {
        _ctx.scheduler.runAfter(0, "apiUsageTracking:trackApiUsage" as any, {
          apiName: "linkup",
          operation: "search",
          unitsUsed: 0,
          estimatedCost: 0,
          requestMetadata: { query: args.query },
          success: false,
          errorMessage: errorMsg,
          responseTime,
        });
      } catch (trackError) {
        console.error("[linkupSearch] Failed to track error:", trackError);
      }
      
      throw error;
    }
  },
});

