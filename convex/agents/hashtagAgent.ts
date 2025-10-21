/**
 * Hashtag Search Agent
 * 
 * Specialized agent for hashtag-based document search and dossier creation.
 * Uses GPT-5-nano for fast, reliable search with AI-generated summaries.
 * 
 * Features:
 * - Hybrid search (exact title + exact content + semantic RAG)
 * - Automatic dossier creation with document references
 * - AI-generated summaries of search results
 * - Cross-thread context search for related hashtags
 * - LLM-powered re-ranking for better relevance
 */

import { Agent, stepCountIs } from "@convex-dev/agent";
import { components } from "../_generated/api";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Import hashtag search tools
import {
  searchHashtag,
  createHashtagDossier,
  getOrCreateHashtagDossier,
  listHashtagDossiers,
  reRankHashtagResults,
} from "../tools/hashtagSearchTools";

/**
 * Hashtag Search Agent
 * 
 * Specialized for finding documents by hashtag keywords and creating dossiers.
 * Uses GPT-5-nano for fast, cost-effective search with intelligent summaries.
 */
export const hashtagAgent = new Agent(components.agent, {
  name: "HashtagSearchAgent",
  languageModel: openai.chat("gpt-5-nano"),

  instructions: `You are a hashtag search specialist AI assistant powered by GPT-5-nano.

Your expertise:
- Searching for documents using hashtag keywords
- Creating hashtag dossiers with document references
- Providing AI-generated summaries of search results
- Finding related hashtags and topics
- Re-ranking results for better relevance

SEARCH STRATEGY:
When a user searches for a hashtag (e.g., #biotech or "biotech"), you perform a hybrid search:
1. Exact title match - documents with the keyword in the title
2. Exact content match - documents with the keyword in the content (BM25)
3. Semantic search - documents semantically related to the keyword (RAG)

Results are automatically deduplicated and ranked by relevance with match type labels:
🎯 Hybrid - Found in both exact and semantic search (highest relevance)
📍 Exact-title - Found in document title
📄 Exact-content - Found in document content
🔍 Semantic - Found via AI semantic understanding

TOOL SELECTION:
- Use searchHashtag to find documents matching a hashtag keyword
- Use createHashtagDossier to create a new dossier with search results
- Use getOrCreateHashtagDossier to ensure a dossier exists (idempotent)
- Use listHashtagDossiers to show existing hashtag dossiers
- Use reRankHashtagResults to improve result relevance with AI

RESPONSE STYLE:
1. Always provide a summary of what you found
2. Explain the match types and their significance
3. Suggest related hashtags or topics when relevant
4. Be proactive - create dossiers when it makes sense
5. Format results clearly with emojis and structure

IMPORTANT:
- Execute searches immediately without asking for confirmation
- Create dossiers when the user clearly wants to save results
- Provide context about why certain documents matched
- Suggest next steps (e.g., "Would you like me to create a dossier?")

Example interaction:
User: "Search for #biotech"
You: [Call searchHashtag with hashtag="biotech"]
Then provide a summary like:
"I found 12 documents related to biotech:

🎯 5 hybrid matches (highest relevance)
📍 3 exact title matches
📄 2 exact content matches
🔍 2 semantic matches

Top results:
1. 🎯 Biotech Investment Thesis 2024 (hybrid match)
2. 🎯 CRISPR Gene Editing Overview (hybrid match)
3. 📍 Biotech Startup Landscape (exact title)

Would you like me to create a hashtag dossier to save these results?"`,

  tools: {
    searchHashtag,
    createHashtagDossier,
    getOrCreateHashtagDossier,
    listHashtagDossiers,
    reRankHashtagResults,
  },

  // Enable context search across threads to find related hashtags
  contextOptions: {
    searchOtherThreads: true, // Search across all user's hashtag threads
    recentMessages: 5, // Include recent hashtag searches for context
    searchOptions: {
      textSearch: true, // BM25 keyword search
      vectorSearch: true, // Semantic vector search
      messageRange: { before: 1, after: 1 }, // Context around matches
      limit: 10, // Limit context messages
    },
  },
});

/**
 * Search for documents by hashtag
 * Returns both structured results and AI-generated summary
 */
export const searchHashtagAction = hashtagAgent.asTextAction({
  stopWhen: stepCountIs(5), // Allow up to 5 steps for complex searches
});

/**
 * Search for hashtag and return structured results
 * Useful for programmatic access to search results
 */
export const searchHashtagStructuredAction = hashtagAgent.asObjectAction({
  schema: z.object({
    hashtag: z.string().describe("The hashtag that was searched"),
    totalMatches: z.number().describe("Total number of documents found"),
    matchBreakdown: z.object({
      hybrid: z.number().describe("Number of hybrid matches"),
      exactTitle: z.number().describe("Number of exact title matches"),
      exactContent: z.number().describe("Number of exact content matches"),
      semantic: z.number().describe("Number of semantic matches"),
    }).describe("Breakdown of match types"),
    topResults: z.array(z.object({
      documentId: z.string().describe("Document ID"),
      title: z.string().describe("Document title"),
      matchType: z.string().describe("Type of match"),
      score: z.number().describe("Relevance score"),
      snippet: z.string().optional().describe("Content snippet"),
    })).describe("Top matching documents"),
    summary: z.string().describe("AI-generated summary of the search results"),
    relatedHashtags: z.array(z.string()).optional().describe("Suggested related hashtags"),
  }),
});

/**
 * Create a hashtag dossier with AI summary
 * Returns dossier ID and summary of what was created
 */
export const createHashtagDossierAction = hashtagAgent.asObjectAction({
  schema: z.object({
    dossierId: z.string().describe("ID of the created dossier"),
    hashtag: z.string().describe("The hashtag for this dossier"),
    documentCount: z.number().describe("Number of documents in the dossier"),
    summary: z.string().describe("AI-generated summary of the dossier contents"),
    createdNew: z.boolean().describe("Whether a new dossier was created or existing one was returned"),
  }),
});

/**
 * List all hashtag dossiers with AI summary
 * Returns list of dossiers with context about their contents
 */
export const listHashtagDossiersAction = hashtagAgent.asObjectAction({
  schema: z.object({
    dossiers: z.array(z.object({
      dossierId: z.string().describe("Dossier ID"),
      hashtag: z.string().describe("Hashtag keyword"),
      title: z.string().describe("Dossier title"),
    })).describe("List of hashtag dossiers"),
    totalCount: z.number().describe("Total number of dossiers"),
    summary: z.string().describe("AI-generated summary of the user's hashtag collection"),
  }),
});

/**
 * Smart hashtag search with automatic dossier creation
 * 
 * This action combines search and dossier creation in one step.
 * It searches for the hashtag and automatically creates a dossier if results are found.
 */
export const smartHashtagSearchAction = hashtagAgent.asObjectAction({
  schema: z.object({
    searchResults: z.object({
      hashtag: z.string(),
      totalMatches: z.number(),
      topResults: z.array(z.object({
        documentId: z.string(),
        title: z.string(),
        matchType: z.string(),
        score: z.number(),
      })),
    }).describe("Search results"),
    dossier: z.object({
      dossierId: z.string(),
      created: z.boolean(),
    }).optional().describe("Dossier information if created"),
    summary: z.string().describe("AI-generated summary of the search and dossier"),
    recommendations: z.array(z.string()).describe("Recommended next steps or related hashtags"),
  }),
});

/**
 * Analyze hashtag relationships
 * 
 * Uses cross-thread search to find related hashtags and build a knowledge graph
 */
export const analyzeHashtagRelationshipsAction = hashtagAgent.asObjectAction({
  schema: z.object({
    hashtag: z.string().describe("The primary hashtag"),
    relatedHashtags: z.array(z.object({
      hashtag: z.string(),
      relationship: z.string().describe("How this hashtag relates to the primary one"),
      strength: z.number().describe("Relationship strength 0-1"),
    })).describe("Related hashtags found through cross-thread search"),
    summary: z.string().describe("AI-generated summary of hashtag relationships"),
    suggestions: z.array(z.string()).describe("Suggested hashtags to explore next"),
  }),
});

