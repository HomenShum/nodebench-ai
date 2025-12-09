"use node";

/**
 * Public Dossier Actions (Node.js runtime)
 * 
 * Queries and mutations are in publicDossierQueries.ts (Convex runtime)
 * This file contains only actions that need Node.js (fetch, process.env)
 */

import { v } from "convex/values";
import { action, internalAction } from "../../_generated/server";
import { api, internal } from "../../_generated/api";
import { getLlmModel } from "../../../shared/llm/modelCatalog";

// NOTE: Queries and mutations are in publicDossierQueries.ts
// Import them via api.domains.research.publicDossierQueries instead

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA: ScrollySection type for the daily public dossier
// ═══════════════════════════════════════════════════════════════════════════

export const scrollySectionValidator = v.object({
  id: v.string(),
  meta: v.object({
    date: v.string(),
    title: v.string(),
  }),
  content: v.object({
    body: v.array(v.string()),
    deepDives: v.array(v.object({
      title: v.string(),
      content: v.string(),
    })),
  }),
  dashboard: v.object({
    phaseLabel: v.string(),
    kpis: v.array(v.object({
      label: v.string(),
      value: v.number(),
      unit: v.string(),
      color: v.string(),
    })),
    marketSentiment: v.number(),
    activeRegion: v.string(),
  }),
  smartLinks: v.optional(v.record(v.string(), v.object({
    summary: v.string(),
    source: v.optional(v.string()),
  }))),
});

// ═══════════════════════════════════════════════════════════════════════════
// DEEP AGENT ACTION: Generate daily dossier content
// ═══════════════════════════════════════════════════════════════════════════

const DOSSIER_SYSTEM_PROMPT = `You are an AI research analyst generating a daily intelligence briefing in a specific JSON format.

Your output MUST be a valid JSON array of sections following this exact structure:
[
  {
    "id": "unique-section-id",
    "meta": { "date": "Section Label", "title": "Section Title" },
    "content": {
      "body": ["Paragraph 1 with <SmartLink id='term-id'>linked terms</SmartLink>.", "Paragraph 2..."],
      "deepDives": [{ "title": "Deep Dive Title", "content": "Expanded explanation..." }]
    },
    "dashboard": {
      "phaseLabel": "Dashboard Label",
      "kpis": [{ "label": "Metric Name", "value": 85, "unit": "%", "color": "bg-blue-500" }],
      "marketSentiment": 75,
      "activeRegion": "Global"
    },
    "smartLinks": {
      "term-id": { "summary": "Explanation of the term", "source": "Source Name" }
    }
  }
]

Guidelines:
1. Generate 5 sections: Executive Summary, Funding Highlights, Emerging Trends, Technical Deep Dive, Week Ahead
2. Use <SmartLink id='x'>text</SmartLink> for key terms that deserve tooltips
3. Include real companies, funding rounds, and technical concepts when possible
4. KPI values should be numbers (0-100 for percentages, raw numbers for counts/amounts)
5. Use Tailwind color classes for KPI colors: bg-emerald-500, bg-blue-500, bg-purple-500, bg-amber-500, bg-rose-500
6. Make content actionable and insightful, not generic
7. Include 1-2 deepDives per section with substantive analysis`;

export const generateDailyDossier = internalAction({
  args: {
    topic: v.optional(v.string()),
    forceRefresh: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<{ success: boolean; cached: boolean; dossier?: any; dossierId?: any; sectionsCount?: number }> => {
    const topic = args.topic || "AI Infrastructure & Venture Capital";
    const today = new Date().toISOString().split("T")[0];
    
    // Check if we already have today's dossier (unless force refresh)
    if (!args.forceRefresh) {
      const existing: any = await ctx.runQuery(api.domains.research.publicDossierQueries.getDossierByDate, { date: today });
      if (existing) {
        console.log(`[generateDailyDossier] Using cached dossier from ${today}`);
        return { success: true, cached: true, dossier: existing };
      }
    }

    console.log(`[generateDailyDossier] Generating fresh dossier for topic: ${topic}`);
    
    // Call LLM to generate dossier content
    // Use model catalog for consistent model selection across the app
    const model = getLlmModel("analysis", "openai");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    console.log(`[generateDailyDossier] Using model: ${model}`);

    const userPrompt = `Generate a comprehensive daily intelligence briefing for: "${topic}"

Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}

Focus on:
- Recent funding rounds and M&A activity (last 7 days)
- Emerging technical trends and breakthroughs
- Key players and their movements
- Forward-looking analysis for the week ahead
- Actionable insights for investors and founders

Output ONLY the JSON array, no markdown code blocks or extra text.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: DOSSIER_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response
    let sections;
    try {
      // Handle potential markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      sections = JSON.parse(jsonMatch[0]);
    } catch (parseError: any) {
      console.error("[generateDailyDossier] Failed to parse LLM response:", content.slice(0, 500));
      throw new Error(`Failed to parse dossier JSON: ${parseError.message}`);
    }

    // Validate sections structure
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new Error("Invalid dossier structure: expected non-empty array");
    }

    // Store the generated dossier
    const dossierId: any = await ctx.runMutation(api.domains.research.publicDossierQueries.storePublicDossier, {
      sections,
      topic,
    });

    console.log(`[generateDailyDossier] Stored dossier ${dossierId} with ${sections.length} sections`);

    return {
      success: true,
      cached: false,
      dossierId,
      sectionsCount: sections.length,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL TRIGGER: For testing
// ═══════════════════════════════════════════════════════════════════════════

export const triggerDossierGeneration = action({
  args: {
    topic: v.optional(v.string()),
    forceRefresh: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runAction(internal.domains.research.publicDossier.generateDailyDossier, {
      topic: args.topic,
      forceRefresh: args.forceRefresh,
    });
  },
});
