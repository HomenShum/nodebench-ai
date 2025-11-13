// convex/agents/dynamicAgents.ts
// Dynamic Agent Creation: Context-specific agents with custom tools

import { Agent } from "@convex-dev/agent";
import { createTool } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { stepCountIs } from "ai";
import { z } from "zod/v3";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { components, internal, api } from "../_generated/api";
import { linkupSearch } from "../tools/linkupSearch";
import { searchSecFilings } from "../tools/secFilingTools";
import { youtubeSearch } from "../tools/youtubeSearch";
import { searchLocalDocuments } from "../tools/documentTools";

/**
 * Document-Specific Agent
 * Creates an agent with tools scoped to a specific document
 */
export function createDocumentSpecificAgent(
  ctx: ActionCtx,
  userId: Id<"users">,
  documentId: Id<"documents">
) {
  // Create tools specific to this document
  const getDocumentContent = createTool({
    description: `Get the content of this document (${documentId})`,
    args: z.object({}),
    handler: async (toolCtx): Promise<string> => {
      const doc = await toolCtx.runQuery(api.documents.getById, {
        documentId,
        userId,
      });
      return doc?.content || "Document not found";
    },
  });

  const updateDocumentContent = createTool({
    description: `Update the content of this document (${documentId})`,
    args: z.object({
      content: z.string().describe("New content for the document"),
    }),
    handler: async (toolCtx, args): Promise<string> => {
      await toolCtx.runMutation(api.documents.update, {
        id: documentId,
        content: args.content,
      });
      return "Document updated successfully";
    },
  });

  const getRelatedDocuments = createTool({
    description: `Find documents related to this document (${documentId})`,
    args: z.object({
      limit: z.number().optional().describe("Max number of related documents"),
    }),
    handler: async (toolCtx, args): Promise<string> => {
      const baseDoc = await toolCtx.runQuery(api.documents.getById, { documentId, userId });
      const query = baseDoc?.title || "";
      if (!query) {
        return "No title on base document to find related documents.";
      }
      const results = await toolCtx.runQuery(api.documents.getSearch, { query, userId });
      return JSON.stringify(results.slice(0, args.limit || 5), null, 2);
    },
  });

  return new Agent(components.agent, {
    name: `DocumentAgent_${documentId}`,
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You are a specialized agent for document ${documentId}.
    
You can:
- Read the document content
- Update the document content
- Find related documents

Always provide helpful, accurate responses about this specific document.`,
    tools: {
      getDocumentContent,
      updateDocumentContent,
      getRelatedDocuments,
    },
    stopWhen: stepCountIs(5),
  });
}

/**
 * Project-Specific Agent
 * Creates an agent with tools scoped to a specific project/folder
 */
export function createProjectSpecificAgent(
  ctx: ActionCtx,
  userId: Id<"users">,
  folderId: Id<"folders">
) {
  const listProjectDocuments = createTool({
    description: `List all documents in this project (${folderId})`,
    args: z.object({}),
    handler: async (toolCtx): Promise<string> => {
      const folder = await toolCtx.runQuery(api.folders.getFolderWithDocuments, {
        folderId,
        userId,
      });
      return JSON.stringify((folder as any)?.documents || [], null, 2);
    },
  });

  const createProjectDocument = createTool({
    description: `Create a new document in this project (${folderId})`,
    args: z.object({
      title: z.string(),
      content: z.string().optional(),
    }),
    handler: async (toolCtx, args): Promise<string> => {
      const docId = await toolCtx.runMutation(api.documents.create, {
        title: args.title,
        content: args.content
          ? [
              {
                type: "paragraph",
                content: [{ type: "text", text: args.content }],
              },
            ]
          : undefined,
      });
      try {
        await toolCtx.runMutation(api.folders.addDocumentToFolder, {
          documentId: docId as any,
          folderId,
        });
      } catch (e) {
        console.warn("addDocumentToFolder failed:", e);
      }
      return `Created document ${docId}`;
    },
  });

  const searchProjectDocuments = createTool({
    description: `Search documents in this project (${folderId})`,
    args: z.object({
      query: z.string(),
    }),
    handler: async (toolCtx, args): Promise<string> => {
      const folder = await toolCtx.runQuery(api.folders.getFolderWithDocuments, {
        folderId,
        userId,
      });
      const q = (args.query || "").toLowerCase();
      const docs = ((folder as any)?.documents || []) as any[];
      const results = docs.filter(
        (d) =>
          (d.title || "").toLowerCase().includes(q) ||
          (typeof d.content === "string" && d.content.toLowerCase().includes(q))
      );
      return JSON.stringify(results, null, 2);
    },
  });

  return new Agent(components.agent, {
    name: `ProjectAgent_${folderId}`,
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You are a specialized agent for project/folder ${folderId}.
    
You can:
- List all documents in the project
- Create new documents in the project
- Search within the project

Help users manage and work with documents in this specific project.`,
    tools: {
      listProjectDocuments,
      createProjectDocument,
      searchProjectDocuments,
    },
    stopWhen: stepCountIs(5),
  });
}

/**
 * Research-Specific Agent
 * Creates an agent with tools scoped to a specific research topic
 */
export function createResearchSpecificAgent(
  ctx: ActionCtx,
  userId: Id<"users">,
  topic: string,
  sources: Array<"web" | "sec" | "media" | "documents">
) {
  const tools: Record<string, any> = {};

  // Add web search if requested
  if (sources.includes("web")) {
    tools.webSearch = linkupSearch;
  }

  // Add SEC search if requested
  if (sources.includes("sec")) {
    tools.secSearch = searchSecFilings;
  }

  // Add media search if requested
  if (sources.includes("media")) {
    tools.mediaSearch = youtubeSearch;
  }

  // Add document search if requested
  if (sources.includes("documents")) {
    tools.documentSearch = searchLocalDocuments;
  }

  return new Agent(components.agent, {
    name: `ResearchAgent_${topic.replace(/\s+/g, "_")}`,
    languageModel: openai.chat("gpt-5"),
    instructions: `You are a specialized research agent focused on: ${topic}

Available sources: ${sources.join(", ")}

Your goal is to gather comprehensive, accurate information about ${topic} from the available sources.

Research approach:
1. Start with broad searches to understand the topic
2. Drill down into specific aspects
3. Cross-reference information from multiple sources
4. Synthesize findings into a coherent narrative

Always cite your sources and provide context for your findings.`,
    tools,
    stopWhen: stepCountIs(15),
  });
}

/**
 * Task-Specific Agent
 * Creates an agent with tools scoped to a specific task type
 */
export function createTaskSpecificAgent(
  ctx: ActionCtx,
  userId: Id<"users">,
  taskType: "analysis" | "writing" | "coding" | "planning"
) {
  const baseInstructions = {
    analysis: `You are a specialized analysis agent. Your role is to:
- Break down complex information
- Identify patterns and trends
- Provide data-driven insights
- Create structured summaries`,
    
    writing: `You are a specialized writing agent. Your role is to:
- Create clear, engaging content
- Maintain consistent tone and style
- Structure information logically
- Edit and improve existing text`,
    
    coding: `You are a specialized coding agent. Your role is to:
- Write clean, efficient code
- Debug and fix issues
- Explain technical concepts
- Suggest best practices`,
    
    planning: `You are a specialized planning agent. Your role is to:
- Break down goals into actionable steps
- Identify dependencies and risks
- Create realistic timelines
- Suggest resources and tools`,
  };

  return new Agent(components.agent, {
    name: `TaskAgent_${taskType}`,
    languageModel: openai.chat("gpt-5"),
    instructions: baseInstructions[taskType],
    tools: {}, // Task-specific tools would be added here
    stopWhen: stepCountIs(10),
  });
}

/**
 * User-Specific Agent
 * Creates an agent with access to a specific user's data and preferences
 */
export function createUserSpecificAgent(
  ctx: ActionCtx,
  userId: Id<"users">,
  preferences?: {
    tone?: "formal" | "casual" | "technical";
    verbosity?: "concise" | "detailed" | "comprehensive";
    focus?: string[];
  }
) {
  const tone = preferences?.tone || "casual";
  const verbosity = preferences?.verbosity || "detailed";
  const focus = preferences?.focus || [];

  const toneInstructions = {
    formal: "Use professional, formal language. Avoid contractions and colloquialisms.",
    casual: "Use friendly, conversational language. Be approachable and warm.",
    technical: "Use precise technical terminology. Assume technical expertise.",
  };

  const verbosityInstructions = {
    concise: "Keep responses brief and to the point. Prioritize key information.",
    detailed: "Provide thorough explanations with examples and context.",
    comprehensive: "Provide exhaustive coverage with all relevant details, examples, and edge cases.",
  };

  let focusInstructions = "";
  if (focus.length > 0) {
    focusInstructions = `\n\nUser's areas of focus: ${focus.join(", ")}. Tailor responses to these interests.`;
  }

  return new Agent(components.agent, {
    name: `UserAgent_${userId}`,
    languageModel: openai.chat("gpt-5"),
    instructions: `You are a personalized assistant for this specific user.

Tone: ${toneInstructions[tone]}
Verbosity: ${verbosityInstructions[verbosity]}${focusInstructions}

Always respect the user's preferences and adapt your responses accordingly.`,
    tools: {}, // User-specific tools would be added here
    stopWhen: stepCountIs(8),
  });
}

/**
 * Factory function to create agents dynamically based on context
 */
export function createDynamicAgent(
  ctx: ActionCtx,
  userId: Id<"users">,
  context: {
    type: "document" | "project" | "research" | "task" | "user";
    documentId?: Id<"documents">;
    folderId?: Id<"folders">;
    topic?: string;
    sources?: Array<"web" | "sec" | "media" | "documents">;
    taskType?: "analysis" | "writing" | "coding" | "planning";
    preferences?: any;
  }
) {
  switch (context.type) {
    case "document":
      if (!context.documentId) throw new Error("documentId required for document agent");
      return createDocumentSpecificAgent(ctx, userId, context.documentId);
    
    case "project":
      if (!context.folderId) throw new Error("folderId required for project agent");
      return createProjectSpecificAgent(ctx, userId, context.folderId);
    
    case "research":
      if (!context.topic) throw new Error("topic required for research agent");
      return createResearchSpecificAgent(
        ctx, 
        userId, 
        context.topic, 
        context.sources || ["web"]
      );
    
    case "task":
      if (!context.taskType) throw new Error("taskType required for task agent");
      return createTaskSpecificAgent(ctx, userId, context.taskType);
    
    case "user":
      return createUserSpecificAgent(ctx, userId, context.preferences);
    
    default:
      throw new Error(`Unknown agent type: ${context.type}`);
  }
}

