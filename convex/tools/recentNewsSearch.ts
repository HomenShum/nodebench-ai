// convex/tools/recentNewsSearch.ts
// Recent news article search and disambiguation with LLM validation

import { internalAction, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * Search for recent news articles by topic
 * This is a placeholder - in production, integrate with real news APIs
 * (e.g., NewsAPI, Google News API, Bing News API, or custom news aggregator)
 */
export const searchNews = internalAction({
  args: {
    newsQuery: v.string(),
    conversationContext: v.optional(v.string()),
  },
  returns: v.array(v.object({
    id: v.string(),
    headline: v.string(),
    source: v.optional(v.string()),
    date: v.optional(v.string()),
    snippet: v.string(),
    url: v.optional(v.string()),
    credibility: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    console.log(`[searchNews] Searching for: ${args.newsQuery}`);

    try {
      // PLACEHOLDER: In production, integrate with real news API
      // For now, return mock data for common news queries
      const searchTerm = args.newsQuery.toLowerCase();
      const mockResults: Array<{
        id: string;
        headline: string;
        source?: string;
        date?: string;
        snippet: string;
        url?: string;
        credibility?: string;
      }> = [];

      // Example: Tesla news
      if (searchTerm.includes("tesla")) {
        mockResults.push(
          {
            id: "tesla-earnings-2024-q4",
            headline: "Tesla Reports Record Q4 2024 Earnings, Beats Wall Street Expectations",
            source: "Reuters",
            date: "January 24, 2025",
            snippet: "Tesla Inc. reported fourth-quarter earnings that exceeded analyst expectations, driven by strong vehicle deliveries and improved profit margins. The company's stock rose 8% in after-hours trading.",
            url: "https://reuters.com/tesla-earnings-q4-2024",
            credibility: "High - Major news outlet",
          },
          {
            id: "tesla-model-y-2025",
            headline: "Tesla Unveils Refreshed Model Y with Extended Range and New Features",
            source: "The Verge",
            date: "January 20, 2025",
            snippet: "Tesla has announced a refreshed version of its popular Model Y SUV, featuring an extended range of up to 350 miles, updated interior design, and new Autopilot capabilities.",
            url: "https://theverge.com/tesla-model-y-refresh-2025",
            credibility: "High - Tech news outlet",
          },
          {
            id: "tesla-celebrity-sighting",
            headline: "Celebrity Spotted Driving New Tesla Cybertruck in Beverly Hills",
            source: "TMZ",
            date: "January 22, 2025",
            snippet: "A Hollywood celebrity was seen cruising around Beverly Hills in a brand new Tesla Cybertruck, sparking social media buzz.",
            url: "https://tmz.com/tesla-cybertruck-celebrity",
            credibility: "Low - Entertainment gossip",
          }
        );
      }
      // Example: Climate change
      else if (searchTerm.includes("climate change")) {
        mockResults.push(
          {
            id: "climate-un-report-2025",
            headline: "UN Climate Report Warns of Accelerating Global Warming, Calls for Urgent Action",
            source: "BBC News",
            date: "January 15, 2025",
            snippet: "A new United Nations report reveals that global temperatures are rising faster than previously predicted, with scientists calling for immediate policy changes to avoid catastrophic consequences.",
            url: "https://bbc.com/climate-un-report-2025",
            credibility: "High - Major news outlet",
          },
          {
            id: "climate-renewable-energy",
            headline: "Renewable Energy Capacity Reaches Record High in 2024, Offering Hope for Climate Goals",
            source: "The Guardian",
            date: "January 18, 2025",
            snippet: "Global renewable energy capacity grew by 25% in 2024, the largest annual increase on record, according to the International Energy Agency.",
            url: "https://theguardian.com/renewable-energy-2024",
            credibility: "High - Major news outlet",
          }
        );
      }
      // Example: AI news
      else if (searchTerm.includes("ai") || searchTerm.includes("artificial intelligence")) {
        mockResults.push(
          {
            id: "ai-regulation-eu-2025",
            headline: "EU Finalizes Comprehensive AI Regulation Framework, Sets Global Precedent",
            source: "Financial Times",
            date: "January 10, 2025",
            snippet: "The European Union has finalized its AI Act, establishing the world's first comprehensive regulatory framework for artificial intelligence systems.",
            url: "https://ft.com/eu-ai-regulation-2025",
            credibility: "High - Major financial news",
          },
          {
            id: "ai-breakthrough-research",
            headline: "Researchers Achieve Breakthrough in AI Reasoning Capabilities",
            source: "Nature",
            date: "January 12, 2025",
            snippet: "A team of researchers has developed a new AI architecture that demonstrates unprecedented reasoning abilities, potentially revolutionizing the field.",
            url: "https://nature.com/ai-reasoning-breakthrough",
            credibility: "High - Scientific journal",
          }
        );
      }
      // Generic fallback
      else {
        mockResults.push({
          id: `news-${Date.now()}-001`,
          headline: `Recent developments in ${args.newsQuery}`,
          source: "Various sources",
          date: "Recent",
          snippet: `Latest news and updates about ${args.newsQuery}`,
          url: undefined,
          credibility: "Mixed",
        });
      }

      console.log(`[searchNews] Found ${mockResults.length} news articles`);
      return mockResults;

    } catch (error) {
      console.error("[searchNews] Error:", error);
      return [];
    }
  },
});

/**
 * Validate news article matches using LLM judge with conversation context
 * Returns PASS/FAIL based on usefulness and relevance
 */
export const validateNewsMatches = internalAction({
  args: {
    userQuery: v.string(),
    conversationContext: v.optional(v.string()),
    articles: v.array(v.object({
      id: v.string(),
      headline: v.string(),
      source: v.optional(v.string()),
      date: v.optional(v.string()),
      snippet: v.string(),
      url: v.optional(v.string()),
      credibility: v.optional(v.string()),
    })),
  },
  returns: v.array(v.object({
    id: v.string(),
    headline: v.string(),
    source: v.optional(v.string()),
    date: v.optional(v.string()),
    snippet: v.string(),
    url: v.optional(v.string()),
    credibility: v.optional(v.string()),
    validationResult: v.union(v.literal("PASS"), v.literal("FAIL")),
    reasoning: v.string(),
  })),
  handler: async (ctx, args) => {
    console.log(`[validateNewsMatches] Validating ${args.articles.length} articles for query: "${args.userQuery}"`);

    try {
      // Build context-aware validation prompt
      const contextSection = args.conversationContext 
        ? `\n\nConversation Context:\n${args.conversationContext}\n\nUse this context to determine which articles are most relevant to the user's information needs.`
        : '';

      const prompt = `You are a news article matching validator. Given a user's query and a list of potential news articles, determine which articles are useful and relevant.

User Query: "${args.userQuery}"${contextSection}

Articles to validate:
${args.articles.map((a, i) => `${i + 1}. ${a.headline}
   Source: ${a.source || 'Unknown'}
   Date: ${a.date || 'Unknown'}
   Snippet: ${a.snippet}
   Credibility: ${a.credibility || 'Unknown'}`).join('\n\n')}

For each article, determine if it is a PASS or FAIL based on:
1. **Usefulness**: Does the article provide substantive information vs. clickbait?
2. **Relevance**: Does the article topic and recency match the user's information needs?

PASS criteria:
- Article provides substantive, informative content
- Article is recent and relevant to the query
- Article comes from a credible source
- Article topic aligns with conversation context
- Article offers valuable insights or information

FAIL criteria:
- Article is clickbait or low-quality content
- Article is too old or not relevant to current context
- Article doesn't provide useful information
- Article topic doesn't match the conversation context
- Article is from an unreliable source

Return a JSON array with this exact structure:
[
  {
    "id": "article-id-123",
    "validationResult": "PASS",
    "reasoning": "This article provides substantive information from a credible source and is highly relevant to the query"
  },
  {
    "id": "article-id-456",
    "validationResult": "FAIL",
    "reasoning": "This article is clickbait and doesn't provide useful information for the user's needs"
  }
]

IMPORTANT: Return ONLY the JSON array, no other text.`;

      const result = await generateText({
        model: openai.chat("gpt-5-mini"),
        prompt,
      });

      // Parse the LLM response
      const validationResults = JSON.parse(result.text);

      // Merge validation results with article data
      const validatedArticles = args.articles.map(article => {
        const validation = validationResults.find((v: any) => v.id === article.id);
        return {
          ...article,
          validationResult: validation?.validationResult || "FAIL" as "PASS" | "FAIL",
          reasoning: validation?.reasoning || "No validation result",
        };
      });

      const passCount = validatedArticles.filter(a => a.validationResult === "PASS").length;
      console.log(`[validateNewsMatches] Validation complete: ${passCount} PASS, ${validatedArticles.length - passCount} FAIL`);

      return validatedArticles;

    } catch (error) {
      console.error("[validateNewsMatches] Error:", error);
      // If validation fails, mark all as FAIL
      return args.articles.map(article => ({
        ...article,
        validationResult: "FAIL" as "PASS" | "FAIL",
        reasoning: "Validation error occurred",
      }));
    }
  },
});

/**
 * Check if a news topic has been confirmed for this thread
 */
export const getConfirmedNewsTopic = internalQuery({
  args: {
    threadId: v.string(),
    newsQuery: v.string(),
  },
  returns: v.union(
    v.object({
      id: v.string(),
      headline: v.string(),
      source: v.optional(v.string()),
      date: v.optional(v.string()),
      url: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const confirmed = await ctx.db
      .query("confirmedNewsTopics")
      .withIndex("by_thread_and_query", (q) =>
        q.eq("threadId", args.threadId).eq("newsQuery", args.newsQuery.toLowerCase())
      )
      .first();

    if (!confirmed) return null;

    return {
      id: confirmed.confirmedId,
      headline: confirmed.confirmedHeadline,
      source: confirmed.confirmedSource,
      date: confirmed.confirmedDate,
      url: confirmed.confirmedUrl,
    };
  },
});

/**
 * Store a confirmed news article selection
 */
export const confirmNewsTopic = internalMutation({
  args: {
    threadId: v.string(),
    newsQuery: v.string(),
    id: v.string(),
    headline: v.string(),
    source: v.optional(v.string()),
    date: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(`[confirmNewsTopic] Storing confirmation: ${args.headline} for thread ${args.threadId}`);

    // Check if already confirmed
    const existing = await ctx.db
      .query("confirmedNewsTopics")
      .withIndex("by_thread_and_query", (q) =>
        q.eq("threadId", args.threadId).eq("newsQuery", args.newsQuery.toLowerCase())
      )
      .first();

    if (existing) {
      // Update existing confirmation
      await ctx.db.patch(existing._id, {
        confirmedId: args.id,
        confirmedHeadline: args.headline,
        confirmedSource: args.source,
        confirmedDate: args.date,
        confirmedUrl: args.url,
        createdAt: Date.now(),
      });
    } else {
      // Create new confirmation
      await ctx.db.insert("confirmedNewsTopics", {
        threadId: args.threadId,
        newsQuery: args.newsQuery.toLowerCase(),
        confirmedId: args.id,
        confirmedHeadline: args.headline,
        confirmedSource: args.source,
        confirmedDate: args.date,
        confirmedUrl: args.url,
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

