// convex/workflows/agentWorkflows.ts
// Multi-step agent workflows using WorkflowManager for durable execution

import { WorkflowManager } from "@convex-dev/workflow";
import { components, internal } from "../_generated/api";
import { v } from "convex/values";
import { mutation, internalMutation, internalAction } from "../_generated/server";
import { createThread, saveMessage } from "@convex-dev/agent";
import { getAuthUserId } from "@convex-dev/auth/server";

const workflow = new WorkflowManager(components.workflow);

/**
 * Comprehensive Entity Research Workflow
 * Multi-step workflow that researches a company or person using multiple agents
 */
export const entityResearchWorkflow = workflow.define({
  args: {
    entityName: v.string(),
    userId: v.id("users"),
    includeFinancials: v.optional(v.boolean()),
    includeMedia: v.optional(v.boolean()),
  },
  handler: async (step, args): Promise<any> => {
    console.log('[entityResearchWorkflow] Starting research for:', args.entityName);

    // Step 1: Create a thread for this research
    const threadResult = await createThread(step, components.agent, {
      userId: args.userId,
      title: `Research: ${args.entityName}`,
    }) as any;
    const threadId = threadResult.threadId as string;

    // Step 2: Save the initial user message
    const messageResult = await saveMessage(step, components.agent, {
      threadId,
      prompt: `Research ${args.entityName}`,
    }) as any;
    const messageId = messageResult.messageId as string;

    // Step 3: Web search for basic information
    console.log('[entityResearchWorkflow] Step 3: Web search');
    const webResult: any = await step.runAction(
      internal.workflows.agentWorkflows.webSearchAction,
      {
        threadId,
        userId: args.userId,
        query: `${args.entityName} company overview, history, products, leadership`
      },
      { retry: true }
    );
    
    // Step 4: SEC filings (if includeFinancials is true)
    let secResult = null;
    if (args.includeFinancials !== false) {
      console.log('[entityResearchWorkflow] Step 4: SEC filings');
      try {
        secResult = await step.runAction(
          internal.workflows.agentWorkflows.secSearchAction,
          { 
            threadId, 
            userId: args.userId, 
            query: `${args.entityName} latest 10-K 10-Q filings` 
          },
          { retry: true }
        );
      } catch (err) {
        console.warn('[entityResearchWorkflow] SEC search failed:', err);
        secResult = { text: "No SEC filings found or not applicable." };
      }
    }
    
    // Step 5: Media search (if includeMedia is true)
    let mediaResult = null;
    if (args.includeMedia !== false) {
      console.log('[entityResearchWorkflow] Step 5: Media search');
      try {
        mediaResult = await step.runAction(
          internal.workflows.agentWorkflows.mediaSearchAction,
          { 
            threadId, 
            userId: args.userId, 
            query: `${args.entityName} videos interviews presentations` 
          },
          { retry: true }
        );
      } catch (err) {
        console.warn('[entityResearchWorkflow] Media search failed:', err);
        mediaResult = { text: "No media found." };
      }
    }
    
    // Step 6: Synthesize all results
    console.log('[entityResearchWorkflow] Step 6: Synthesis');
    const synthesisResult: any = await step.runAction(
      internal.workflows.agentWorkflows.synthesisAction,
      {
        threadId,
        userId: args.userId,
        sources: [
          { title: "Web Research", content: webResult.text },
          ...(secResult ? [{ title: "SEC Filings", content: secResult.text }] : []),
          ...(mediaResult ? [{ title: "Media", content: mediaResult.text }] : []),
        ],
        goal: "comprehensive entity profile",
      },
      { retry: true }
    );

    // Step 7: Create a dossier document with the research
    console.log('[entityResearchWorkflow] Step 7: Create dossier');
    const dossierResult: any = await step.runMutation(
      internal.workflows.agentWorkflows.createDossierMutation,
      {
        userId: args.userId,
        title: `Research: ${args.entityName}`,
        content: synthesisResult.text,
        metadata: {
          entityName: args.entityName,
          researchDate: Date.now(),
          sources: ["web", ...(secResult ? ["sec"] : []), ...(mediaResult ? ["media"] : [])],
        },
      }
    );
    
    console.log('[entityResearchWorkflow] Complete! Dossier ID:', dossierResult.documentId);
    
    return {
      threadId,
      dossierDocumentId: dossierResult.documentId,
      summary: synthesisResult.text.slice(0, 200) + "...",
    };
  },
});

/**
 * Document Analysis Workflow
 * Multi-step workflow for deep document analysis
 */
export const documentAnalysisWorkflow = workflow.define({
  args: {
    documentId: v.string(),
    userId: v.id("users"),
    analysisTypes: v.array(v.string()), // ["summary", "extraction", "insights", "critique"]
  },
  handler: async (step, args): Promise<any> => {
    console.log('[documentAnalysisWorkflow] Analyzing document:', args.documentId);

    // Step 1: Create thread
    const threadResult = await createThread(step, components.agent, {
      userId: args.userId,
      title: `Analysis: Document ${args.documentId}`,
    }) as any;
    const threadId = threadResult.threadId as string;
    
    // Step 2: Run each analysis type
    const analyses: Array<{ type: string; result: string }> = [];
    
    for (const analysisType of args.analysisTypes) {
      console.log(`[documentAnalysisWorkflow] Running ${analysisType} analysis`);
      const result = await step.runAction(
        internal.workflows.agentWorkflows.documentAnalysisAction,
        {
          threadId,
          userId: args.userId,
          documentId: args.documentId,
          analysisType,
        },
        { retry: true }
      );
      analyses.push({ type: analysisType, result: result.text });
    }
    
    // Step 3: Create analysis report document
    const reportContent = analyses.map(a =>
      `## ${a.type.toUpperCase()}\n\n${a.result}`
    ).join('\n\n---\n\n');

    const reportResult: any = await step.runMutation(
      internal.workflows.agentWorkflows.createDossierMutation,
      {
        userId: args.userId,
        title: `Analysis Report: Document ${args.documentId}`,
        content: reportContent,
        metadata: {
          sourceDocumentId: args.documentId,
          analysisTypes: args.analysisTypes,
          analysisDate: Date.now(),
        },
      }
    );
    
    console.log('[documentAnalysisWorkflow] Complete! Report ID:', reportResult.documentId);
    
    return {
      threadId,
      reportDocumentId: reportResult.documentId,
      analyses,
    };
  },
});

/**
 * Comparative Research Workflow
 * Compare multiple entities side-by-side
 */
export const comparativeResearchWorkflow = workflow.define({
  args: {
    entities: v.array(v.string()),
    userId: v.id("users"),
    criteria: v.optional(v.array(v.string())),
  },
  handler: async (step, args): Promise<any> => {
    console.log('[comparativeResearchWorkflow] Comparing:', args.entities);

    // Step 1: Create thread
    const threadResult = await createThread(step, components.agent, {
      userId: args.userId,
      title: `Comparison: ${args.entities.join(' vs ')}`,
    }) as any;
    const threadId = threadResult.threadId as string;
    
    // Step 2: Research each entity in parallel (using separate steps)
    const entityResearch: Array<{ entity: string; research: string }> = [];
    
    for (const entity of args.entities) {
      console.log(`[comparativeResearchWorkflow] Researching ${entity}`);
      const result = await step.runAction(
        internal.workflows.agentWorkflows.webSearchAction,
        {
          threadId,
          userId: args.userId,
          query: `${entity} ${args.criteria?.join(' ') || 'overview'}`,
        },
        { retry: true }
      );
      entityResearch.push({ entity, research: result.text });
    }
    
    // Step 3: Comparative analysis
    console.log('[comparativeResearchWorkflow] Running comparative analysis');
    const comparisonResult: any = await step.runAction(
      internal.workflows.agentWorkflows.comparativeAnalysisAction,
      {
        threadId,
        userId: args.userId,
        entities: args.entities,
        entityResearch,
        criteria: args.criteria || [],
      },
      { retry: true }
    );

    // Step 4: Create comparison report
    const reportResult: any = await step.runMutation(
      internal.workflows.agentWorkflows.createDossierMutation,
      {
        userId: args.userId,
        title: `Comparison: ${args.entities.join(' vs ')}`,
        content: comparisonResult.text,
        metadata: {
          entities: args.entities,
          criteria: args.criteria || [],
          comparisonDate: Date.now(),
        },
      }
    );
    
    console.log('[comparativeResearchWorkflow] Complete! Report ID:', reportResult.documentId);
    
    return {
      threadId,
      reportDocumentId: reportResult.documentId,
      comparison: comparisonResult.text,
    };
  },
});

// ============================================================================
// Internal Actions (called by workflows)
// ============================================================================

export const webSearchAction = internalAction({
  args: { threadId: v.string(), userId: v.id("users"), query: v.string() },
  handler: async (ctx, args) => {
    const { createWebAgent } = await import("../agents/specializedAgents");
    const agent = createWebAgent(ctx, args.userId);
    const result = await agent.generateText(
      ctx,
      { threadId: args.threadId },
      { prompt: args.query }
    );
    return { text: result.text };
  },
});

export const secSearchAction = internalAction({
  args: { threadId: v.string(), userId: v.id("users"), query: v.string() },
  handler: async (ctx, args) => {
    const { createSECAgent } = await import("../agents/specializedAgents");
    const agent = createSECAgent(ctx, args.userId);
    const result = await agent.generateText(
      ctx,
      { threadId: args.threadId },
      { prompt: args.query }
    );
    return { text: result.text };
  },
});

export const mediaSearchAction = internalAction({
  args: { threadId: v.string(), userId: v.id("users"), query: v.string() },
  handler: async (ctx, args) => {
    const { createMediaAgent } = await import("../agents/specializedAgents");
    const agent = createMediaAgent(ctx, args.userId);
    const result = await agent.generateText(
      ctx,
      { threadId: args.threadId },
      { prompt: args.query }
    );
    return { text: result.text };
  },
});

export const synthesisAction = internalAction({
  args: {
    threadId: v.string(),
    userId: v.id("users"),
    sources: v.array(v.object({ title: v.string(), content: v.string() })),
    goal: v.string(),
  },
  handler: async (ctx, args) => {
    const { createWebAgent } = await import("../agents/specializedAgents");
    const agent = createWebAgent(ctx, args.userId);

    let prompt = `Synthesize the following sources to create a ${args.goal}:\n\n`;
    args.sources.forEach((source, idx) => {
      prompt += `### ${source.title}\n${source.content}\n\n`;
    });
    prompt += `\nProvide a comprehensive synthesis.`;

    const result = await agent.generateText(
      ctx,
      { threadId: args.threadId },
      { prompt }
    );
    return { text: result.text };
  },
});

export const documentAnalysisAction = internalAction({
  args: {
    threadId: v.string(),
    userId: v.id("users"),
    documentId: v.string(),
    analysisType: v.string(),
  },
  handler: async (ctx, args) => {
    const { createDocumentAgent } = await import("../agents/specializedAgents");
    const agent = createDocumentAgent(ctx, args.userId);

    const result = await agent.generateText(
      ctx,
      { threadId: args.threadId },
      { prompt: `Perform ${args.analysisType} analysis on document ${args.documentId}` }
    );
    return { text: result.text };
  },
});

export const comparativeAnalysisAction = internalAction({
  args: {
    threadId: v.string(),
    userId: v.id("users"),
    entities: v.array(v.string()),
    entityResearch: v.array(v.object({ entity: v.string(), research: v.string() })),
    criteria: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { createWebAgent } = await import("../agents/specializedAgents");
    const agent = createWebAgent(ctx, args.userId);

    let prompt = `Compare the following entities:\n\n`;
    args.entityResearch.forEach(er => {
      prompt += `### ${er.entity}\n${er.research}\n\n`;
    });
    if (args.criteria.length > 0) {
      prompt += `Focus on: ${args.criteria.join(', ')}\n\n`;
    }
    prompt += `Provide a structured comparison.`;

    const result = await agent.generateText(
      ctx,
      { threadId: args.threadId },
      { prompt }
    );
    return { text: result.text };
  },
});

export const createDossierMutation = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    // Import the documents table
    const documentId = await ctx.db.insert("documents", {
      createdBy: args.userId,
      title: args.title,
      content: args.content,
      isPublic: false,
      documentType: "dossier",
    });

    return { documentId };
  },
});

// ============================================================================
// Public Mutations to Start Workflows
// ============================================================================

export const startEntityResearch = mutation({
  args: { 
    entityName: v.string(), 
    includeFinancials: v.optional(v.boolean()),
    includeMedia: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ workflowId: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.agentWorkflows.entityResearchWorkflow as any,
      {
        entityName: args.entityName,
        userId,
        includeFinancials: args.includeFinancials,
        includeMedia: args.includeMedia,
      }
    );
    
    return { workflowId };
  },
});

export const startDocumentAnalysis = mutation({
  args: {
    documentId: v.string(),
    analysisTypes: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<{ workflowId: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.agentWorkflows.documentAnalysisWorkflow as any,
      {
        documentId: args.documentId,
        userId,
        analysisTypes: args.analysisTypes,
      }
    );
    
    return { workflowId };
  },
});

export const startComparativeResearch = mutation({
  args: {
    entities: v.array(v.string()),
    criteria: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ workflowId: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.agentWorkflows.comparativeResearchWorkflow as any,
      {
        entities: args.entities,
        userId,
        criteria: args.criteria,
      }
    );
    
    return { workflowId };
  },
});

