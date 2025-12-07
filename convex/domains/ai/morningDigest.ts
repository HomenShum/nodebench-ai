"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";
import OpenAI from "openai";
import { getLlmModel } from "../../../shared/llm/modelCatalog";

// NOTE: Query is in morningDigestQueries.ts (Convex requires queries in non-Node files)
// Import it via: api.domains.ai.morningDigestQueries.getDigestData

// Initialize OpenAI client
function getOpenAI(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

// Generate AI summary from digest data
export const generateDigestSummary = action({
  args: {
    marketMovers: v.array(v.object({
      title: v.string(),
      summary: v.optional(v.string()),
      tags: v.array(v.string()),
    })),
    watchlistRelevant: v.array(v.object({
      title: v.string(),
      summary: v.optional(v.string()),
      tags: v.array(v.string()),
    })),
    riskAlerts: v.array(v.object({
      title: v.string(),
      summary: v.optional(v.string()),
      tags: v.array(v.string()),
    })),
    trackedHashtags: v.array(v.string()),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const openai = getOpenAI();

    // Build context for the AI
    const marketContext = args.marketMovers
      .map(item => `- ${item.title}`)
      .join('\n');
    
    const watchlistContext = args.watchlistRelevant
      .map(item => `- ${item.title}`)
      .join('\n');
    
    const riskContext = args.riskAlerts
      .map(item => `- ${item.title}`)
      .join('\n');

    const trackedTopics = args.trackedHashtags.length > 0 
      ? args.trackedHashtags.map(h => `#${h}`).join(', ')
      : 'general tech and finance news';

    const prompt = `You are a concise financial analyst writing a morning briefing. Based on the following news items, write a 2-3 sentence summary that:
1. Highlights the overall market sentiment
2. Mentions any items relevant to the user's tracked topics (${trackedTopics})
3. Notes any risks to watch

Market Movers:
${marketContext || 'No significant market news'}

Watchlist Relevant:
${watchlistContext || 'No items matching tracked topics'}

Risk Alerts:
${riskContext || 'No significant risk alerts'}

Write a professional, concise summary (2-3 sentences max). Do not use bullet points. Focus on actionable insights.`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || getLlmModel("chat", "openai"),
        messages: [
          { role: "system", content: "You are a professional financial analyst writing morning market briefings." },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: 200,
        temperature: 0.7,
      });

      return {
        summary: response.choices[0]?.message?.content || "Unable to generate summary.",
        generatedAt: Date.now(),
      };
    } catch (error: any) {
      console.error("Error generating digest summary:", error);
      return {
        summary: "Markets are moving. Check the feed for the latest updates on your tracked topics.",
        generatedAt: Date.now(),
        error: error.message,
      };
    }
  },
});

// Detect sentiment for a feed item
export const detectSentiment = action({
  args: {
    title: v.string(),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const openai = getOpenAI();

    try {
      const response = await openai.chat.completions.create({
        model: getLlmModel("chat", "openai"),
        messages: [
          { 
            role: "system", 
            content: "You are a sentiment classifier. Respond with exactly one word: bullish, bearish, or neutral." 
          },
          { 
            role: "user", 
            content: `Classify the sentiment of this news headline:\n"${args.title}"\n${args.summary ? `Summary: ${args.summary}` : ''}`
          }
        ],
        max_completion_tokens: 10,
        temperature: 0,
      });

      const sentiment = response.choices[0]?.message?.content?.toLowerCase().trim();
      if (sentiment === 'bullish' || sentiment === 'bearish' || sentiment === 'neutral') {
        return { sentiment };
      }
      return { sentiment: 'neutral' };
    } catch (error) {
      return { sentiment: 'neutral' };
    }
  },
});
