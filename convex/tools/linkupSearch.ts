// convex/tools/linkupSearch.ts
// Linkup search tool for Agent component
// Provides web search capabilities using Linkup's advanced search API

"use node";

import { createTool } from "@convex-dev/agent";
import { z } from "zod";

// Linkup API types
interface LinkupSearchResult {
  answer: string;
  sources: Array<{
    name: string;
    url: string;
    snippet: string;
  }>;
  images?: Array<{
    url: string;
    description?: string;
  }>;
}

/**
 * Search the web using Linkup's AI-optimized search API
 * 
 * This tool allows the AI to search for current information on the web,
 * providing grounded, factual responses with sources.
 */
export const linkupSearch = createTool({
  description: "Search the web for current information using Linkup's AI-optimized search. Use this when you need up-to-date facts, news, or information that isn't in your training data. Returns an answer with sources.",
  
  args: z.object({
    query: z.string().describe("The natural language search query. Be specific and detailed for best results."),
    depth: z.enum(["standard", "deep"]).default("standard").describe("Search depth: 'standard' is faster, 'deep' is more comprehensive but slower"),
    includeImages: z.boolean().default(false).describe("Whether to include images in the search results. Set to true when searching for visual content."),
    includeDomains: z.array(z.string()).optional().describe("Optional: Specific domains to search within (e.g., ['microsoft.com', 'github.com'])"),
    excludeDomains: z.array(z.string()).optional().describe("Optional: Domains to exclude from search (e.g., ['wikipedia.com'])"),
  }),
  
  handler: async (_ctx, args): Promise<string> => {
    const apiKey = process.env.LINKUP_API_KEY;

    if (!apiKey) {
      throw new Error("LINKUP_API_KEY environment variable is not set. Please add it to your Convex environment variables.");
    }

    console.log(`[linkupSearch] Searching for: "${args.query}" (depth: ${args.depth}, images: ${args.includeImages})`);

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
          outputType: "sourcedAnswer",
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

      console.log(`[linkupSearch] Found answer with ${data.sources.length} sources${data.images ? ` and ${data.images.length} images` : ''}`);

      // Format the response with answer, images, and sources
      let result = `${data.answer}\n\n`;

      // Add images if present
      if (data.images && data.images.length > 0) {
        result += "Images:\n\n";
        data.images.slice(0, 5).forEach((image, idx) => {
          // Use markdown image syntax to display images
          const altText = image.description || `Image ${idx + 1}`;
          result += `![${altText}](${image.url})\n`;
          if (image.description) {
            result += `*${image.description}*\n`;
          }
          result += "\n";
        });
      }

      // Add sources
      if (data.sources && data.sources.length > 0) {
        result += "Sources:\n";
        data.sources.slice(0, 5).forEach((source, idx) => {
          result += `${idx + 1}. ${source.name}\n   ${source.url}\n`;
          if (source.snippet) {
            result += `   ${source.snippet.substring(0, 200)}...\n`;
          }
          result += "\n";
        });
      }

      return result;
    } catch (error) {
      console.error("[linkupSearch] Error:", error);
      throw error;
    }
  },
});

