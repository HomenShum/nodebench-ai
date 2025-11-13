// convex/agents/advancedAgentTools.ts
// Agent-as-Tool Pattern: Advanced tools that delegate to specialized sub-agents
// These tools use the Convex Agent SDK's createTool pattern for complex operations

import { createTool } from "@convex-dev/agent";
import { z } from "zod/v3";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { 
  createDocumentAgent, 
  createWebAgent, 
  createMediaAgent,
  createSECAgent,
} from "./specializedAgents";

/**
 * Deep Document Analysis Tool
 * Delegates to a specialized analysis sub-agent for comprehensive document analysis
 */
export function createDeepAnalysisTool(ctx: ActionCtx, userId: Id<"users">) {
  return createTool({
    description: "Perform deep analysis of a document using specialized AI. Use this for complex analysis tasks like summarization, extraction, comparison, or insight generation.",
    args: z.object({
      documentId: z.string().describe("The ID of the document to analyze"),
      analysisType: z.enum(["summary", "extraction", "insights", "critique"]).describe("Type of analysis to perform"),
      focusArea: z.string().optional().describe("Specific area to focus on (e.g., 'financial metrics', 'key risks')"),
    }),
    handler: async (toolCtx, args): Promise<string> => {
      console.log('[deepAnalysisTool] Starting deep analysis:', args);
      
      // Create a specialized document agent for this analysis
      const analysisAgent = createDocumentAgent(toolCtx, userId);
      const threadId = (toolCtx as any).threadId;
      
      // Build analysis prompt based on type
      let prompt = `Analyze document ${args.documentId}. `;
      switch (args.analysisType) {
        case "summary":
          prompt += "Provide a comprehensive summary highlighting key points, main arguments, and conclusions.";
          break;
        case "extraction":
          prompt += "Extract all important data points, facts, and figures in a structured format.";
          break;
        case "insights":
          prompt += "Identify key insights, patterns, and implications that aren't immediately obvious.";
          break;
        case "critique":
          prompt += "Provide a critical analysis, identifying strengths, weaknesses, and areas for improvement.";
          break;
      }
      
      if (args.focusArea) {
        prompt += ` Focus specifically on: ${args.focusArea}`;
      }
      
      // Delegate to document agent
      const result = await analysisAgent.streamText(
        toolCtx,
        { threadId },
        { prompt }
      );
      
      await result.consumeStream();
      const text = await result.text;
      
      console.log('[deepAnalysisTool] Analysis complete, length:', text.length);
      return text;
    },
  });
}

/**
 * Multi-Source Research Tool
 * Delegates to multiple agents (Web + SEC + Media) for comprehensive research
 */
export function createMultiSourceResearchTool(ctx: ActionCtx, userId: Id<"users">) {
  return createTool({
    description: "Conduct comprehensive research using multiple sources (web, SEC filings, media). Use this for thorough investigation of companies, people, or topics.",
    args: z.object({
      query: z.string().describe("The research query (e.g., 'Anthropic AI company')"),
      includeSEC: z.boolean().default(true).describe("Include SEC filings in research"),
      includeMedia: z.boolean().default(true).describe("Include videos and media in research"),
    }),
    handler: async (toolCtx, args): Promise<string> => {
      console.log('[multiSourceResearchTool] Starting research:', args.query);
      
      const threadId = (toolCtx as any).threadId;
      const results: string[] = [];
      
      // 1. Web search (always included)
      console.log('[multiSourceResearchTool] Step 1: Web search');
      const webAgent = createWebAgent(toolCtx, userId);
      const webResult = await webAgent.streamText(
        toolCtx,
        { threadId },
        { prompt: `Research: ${args.query}` }
      );
      await webResult.consumeStream();
      const webText = await webResult.text;
      results.push(`## Web Research\n${webText}`);
      
      // 2. SEC filings (if requested and applicable)
      if (args.includeSEC) {
        console.log('[multiSourceResearchTool] Step 2: SEC filings');
        try {
          const secAgent = createSECAgent(toolCtx, userId);
          const secResult = await secAgent.streamText(
            toolCtx,
            { threadId },
            { prompt: `Find SEC filings for: ${args.query}` }
          );
          await secResult.consumeStream();
          const secText = await secResult.text;
          if (secText && secText.length > 0) {
            results.push(`## SEC Filings\n${secText}`);
          }
        } catch (err) {
          console.warn('[multiSourceResearchTool] SEC search failed:', err);
          results.push(`## SEC Filings\nNo SEC filings found or not applicable.`);
        }
      }
      
      // 3. Media search (if requested)
      if (args.includeMedia) {
        console.log('[multiSourceResearchTool] Step 3: Media search');
        try {
          const mediaAgent = createMediaAgent(toolCtx, userId);
          const mediaResult = await mediaAgent.streamText(
            toolCtx,
            { threadId },
            { prompt: `Find videos and media about: ${args.query}` }
          );
          await mediaResult.consumeStream();
          const mediaText = await mediaResult.text;
          if (mediaText && mediaText.length > 0) {
            results.push(`## Media & Videos\n${mediaText}`);
          }
        } catch (err) {
          console.warn('[multiSourceResearchTool] Media search failed:', err);
          results.push(`## Media & Videos\nNo media found.`);
        }
      }
      
      // Combine all results
      const finalReport = results.join('\n\n---\n\n');
      console.log('[multiSourceResearchTool] Research complete, total length:', finalReport.length);
      
      return finalReport;
    },
  });
}

/**
 * Comparative Analysis Tool
 * Delegates to a specialized agent for comparing multiple entities
 */
export function createComparativeAnalysisTool(ctx: ActionCtx, userId: Id<"users">) {
  return createTool({
    description: "Compare multiple entities (companies, products, documents) side-by-side. Use this when user asks to compare or contrast multiple things.",
    args: z.object({
      entities: z.array(z.string()).describe("List of entities to compare (e.g., ['Apple', 'Microsoft', 'Google'])"),
      criteria: z.array(z.string()).optional().describe("Specific criteria to compare (e.g., ['revenue', 'market cap', 'products'])"),
    }),
    handler: async (toolCtx, args): Promise<string> => {
      console.log('[comparativeAnalysisTool] Comparing:', args.entities);
      
      const threadId = (toolCtx as any).threadId;
      const webAgent = createWebAgent(toolCtx, userId);
      
      // Build comparison prompt
      let prompt = `Compare the following entities: ${args.entities.join(', ')}. `;
      if (args.criteria && args.criteria.length > 0) {
        prompt += `Focus on these criteria: ${args.criteria.join(', ')}. `;
      }
      prompt += `Provide a structured comparison highlighting similarities, differences, strengths, and weaknesses.`;
      
      const result = await webAgent.streamText(
        toolCtx,
        { threadId },
        { prompt }
      );
      
      await result.consumeStream();
      const text = await result.text;
      
      console.log('[comparativeAnalysisTool] Comparison complete');
      return text;
    },
  });
}

/**
 * Synthesis Tool
 * Delegates to a specialized agent for synthesizing information from multiple sources
 */
export function createSynthesisTool(ctx: ActionCtx, userId: Id<"users">) {
  return createTool({
    description: "Synthesize information from multiple sources into a coherent narrative. Use this to combine insights from different documents, searches, or analyses.",
    args: z.object({
      sources: z.array(z.object({
        title: z.string(),
        content: z.string(),
      })).describe("List of sources to synthesize"),
      synthesisGoal: z.string().describe("What to synthesize (e.g., 'key trends', 'common themes', 'actionable insights')"),
    }),
    handler: async (toolCtx, args): Promise<string> => {
      console.log('[synthesisTool] Synthesizing', args.sources.length, 'sources');
      
      const threadId = (toolCtx as any).threadId;
      const webAgent = createWebAgent(toolCtx, userId);
      
      // Build synthesis prompt
      let prompt = `Synthesize the following sources to identify ${args.synthesisGoal}:\n\n`;
      args.sources.forEach((source, idx) => {
        prompt += `### Source ${idx + 1}: ${source.title}\n${source.content}\n\n`;
      });
      prompt += `\nProvide a coherent synthesis that identifies patterns, connections, and key takeaways.`;
      
      const result = await webAgent.streamText(
        toolCtx,
        { threadId },
        { prompt }
      );
      
      await result.consumeStream();
      const text = await result.text;
      
      console.log('[synthesisTool] Synthesis complete');
      return text;
    },
  });
}

/**
 * Fact Checking Tool
 * Delegates to web agent for verifying claims
 */
export function createFactCheckTool(ctx: ActionCtx, userId: Id<"users">) {
  return createTool({
    description: "Verify factual claims using web search. Use this when user asks to verify, fact-check, or validate information.",
    args: z.object({
      claim: z.string().describe("The claim to verify"),
      context: z.string().optional().describe("Additional context about the claim"),
    }),
    handler: async (toolCtx, args): Promise<string> => {
      console.log('[factCheckTool] Verifying claim:', args.claim);
      
      const threadId = (toolCtx as any).threadId;
      const webAgent = createWebAgent(toolCtx, userId);
      
      let prompt = `Fact-check this claim: "${args.claim}". `;
      if (args.context) {
        prompt += `Context: ${args.context}. `;
      }
      prompt += `Search for reliable sources and provide a verdict (True, False, Partially True, or Unverifiable) with supporting evidence.`;
      
      const result = await webAgent.streamText(
        toolCtx,
        { threadId },
        { prompt }
      );
      
      await result.consumeStream();
      const text = await result.text;
      
      console.log('[factCheckTool] Fact check complete');
      return text;
    },
  });
}

/**
 * Trend Analysis Tool
 * Delegates to web agent for identifying trends over time
 */
export function createTrendAnalysisTool(ctx: ActionCtx, userId: Id<"users">) {
  return createTool({
    description: "Analyze trends over time for a topic, company, or industry. Use this when user asks about trends, changes, or evolution.",
    args: z.object({
      topic: z.string().describe("The topic to analyze trends for"),
      timeframe: z.string().optional().describe("Timeframe to analyze (e.g., 'last 5 years', 'since 2020')"),
    }),
    handler: async (toolCtx, args): Promise<string> => {
      console.log('[trendAnalysisTool] Analyzing trends for:', args.topic);
      
      const threadId = (toolCtx as any).threadId;
      const webAgent = createWebAgent(toolCtx, userId);
      
      let prompt = `Analyze trends for: ${args.topic}. `;
      if (args.timeframe) {
        prompt += `Focus on: ${args.timeframe}. `;
      }
      prompt += `Identify key trends, changes, and patterns. Provide historical context and future implications.`;
      
      const result = await webAgent.streamText(
        toolCtx,
        { threadId },
        { prompt }
      );
      
      await result.consumeStream();
      const text = await result.text;
      
      console.log('[trendAnalysisTool] Trend analysis complete');
      return text;
    },
  });
}

