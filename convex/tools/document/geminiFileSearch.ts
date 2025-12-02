// convex/tools/geminiFileSearch.ts
// Gemini File Search tool for querying uploaded files using Gemini's file search capability

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";

const description = [
  "Search across all uploaded files (PDFs, images, documents) using Gemini File Search.",
  "",
  "Use this tool when:",
  "- User asks to find information across multiple uploaded files",
  "- User wants to search through their uploaded documents",
  "- User asks questions about files they've uploaded",
  "- User wants to compare or analyze content from multiple files",
  "",
  "This tool searches the user's Gemini File Search store which contains all files they've uploaded."
].join("\n");

/**
 * Search across all uploaded files using Gemini File Search
 * This tool uses Gemini's native file search capability to find relevant information
 * across all files that have been uploaded to the user's file search store.
 */
export const searchFiles = createTool({
  description,

  args: z.object({
    query: z.string().describe("The search query to find information across uploaded files"),
  }),

  handler: async (ctx, args): Promise<string> => {
    // Call the internal action to perform the search
    const result = await ctx.runAction(internal.domains.documents.fileSearch.searchUserFiles, {
      query: args.query,
    });

    // Format the results as a string for the agent
    if (result.results.length === 0) {
      return result.summary || "No results found in uploaded files.";
    }

    let response = result.summary + "\n\nRelevant excerpts:\n\n";
    result.results.forEach((r: any, i: number) => {
      const fileName = r.fileName || "Unknown File";
      const excerpt = r.excerpt || "No content";
      response += `${i + 1}. From "${fileName}":\n${excerpt}\n\n`;
    });

    return response;
  },
});
