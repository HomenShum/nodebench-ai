"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// =================================================================
// 1. ZOD SCHEMA DEFINITIONS FOR GUARANTEED TOOL ARGUMENTS
// =================================================================

const BlockSchema: z.ZodType<any> = z.lazy(() => z.object({
  type: z.enum(["heading", "paragraph", "bulletListItem", "checkListItem", "codeBlock", "quote", "horizontalRule"]).describe("The type of the content block."),
  level: z.optional(z.number().min(1).max(6)).describe("The heading level (1-6) if the type is 'heading'."),
  text: z.optional(z.string()).describe("The text content of the block."),
  checked: z.optional(z.boolean()).describe("The status of a checklist item if the type is 'checkListItem'."),
  lang: z.optional(z.string()).describe("The programming language for a 'codeBlock' (e.g., 'typescript')."),
  items: z.optional(z.array(BlockSchema)).describe("An array of nested blocks, used for list items."),
}));

const CreateDocumentSchema = z.object({
  title: z.string().describe("The concise and relevant title for the document."),
  content: z.array(BlockSchema).describe("An array of structured content blocks that make up the document body."),
});

const CreateNodeSchema = z.object({
  markdown: z.string().describe("The new content for the block, written in Markdown format."),
  parentId: z.optional(z.union([z.string(), z.null()])).describe("Optional parent node ID for nesting. Pass null or omit if there is no parent."),
});

const UpdateNodeSchema = z.object({
  markdown: z.string().describe("The new Markdown content for the block."),
});

const UpdateDocumentSchema = z.object({
  title: z.string().describe("The new title for the document."),
});

const IdSchema = (description: string) => z.object({ id: z.string().describe(description) });
const QuerySchema = z.object({ query: z.string().describe("The search term.") });


// =================================================================
// 2. TYPESCRIPT INTERFACES
// =================================================================

export interface AIAction {
  type: 'createDocument' | 'updateDocument' | 'archiveDocument' | 'findDocuments' | 'createNode' | 'updateNode' | 'archiveNode';
  documentId?: Id<'documents'>;
  title?: string;
  content?: any;
  nodeId?: Id<'nodes'>;
  markdown?: string;
  select?: boolean;
  parentId?: Id<'nodes'> | null;
}

export interface AIResponse {
  message: string;
  actions: AIAction[];
}

// =================================================================
// 3. THE MAIN AI ACTION
// =================================================================

// Default OpenAI chat model variant (legacy action uses OpenAI when applicable)
const MODEL = process.env.OPENAI_API_KEY ? "gpt-5-nano" : "gpt-5-nano";

export const generateResponse = action({
  args: {
    userMessage: v.string(),
    selectedDocumentId: v.optional(v.union(v.id("documents"), v.null())),
    selectedNodeId: v.optional(v.union(v.id("nodes"), v.null())),
    // --- NEW: Rich context from the editor ---
    contextBeforeCursor: v.optional(v.string()),
    selectedBlockContent: v.optional(v.string()),
    contextAfterCursor: v.optional(v.string()),
    // --- NEW: UI layout/affordance summary and OpenAI model variant ---
    uiSummary: v.optional(v.string()),
    openaiVariant: v.optional(v.union(v.literal("gpt-5-nano"), v.literal("gpt-5-mini"))),
  },
  handler: async (ctx, args): Promise<AIResponse> => {
    const { userMessage, selectedDocumentId, selectedNodeId, contextBeforeCursor, selectedBlockContent, contextAfterCursor, uiSummary, openaiVariant } = args;

    const documents = await ctx.runQuery(api.documents.getSidebar);

    // Extract UI context and a cleaned user message if the frontend used the
    // "Context Summary... --- User Message..." pattern. Prefer explicit uiSummary arg.
    let extractedUiSummary: string | undefined = uiSummary || undefined;
    let cleanedUserMessage = userMessage;
    if (!extractedUiSummary) {
      const m = userMessage.match(/^Context Summary:\s*([\s\S]*?)\n---\nUser Message:\s*([\s\S]*)$/);
      if (m) {
        extractedUiSummary = m[1].trim();
        cleanedUserMessage = m[2].trim();
      }
    }

    const modelVariant = openaiVariant ?? MODEL;
    console.log("[AI] generateResponse using model:", modelVariant, "uiSummary: ", extractedUiSummary ? `${extractedUiSummary.length} chars` : "none");

    const systemMessage = `You are an expert AI assistant integrated into a document editor. Your primary function is to help users write and manage their content by calling the appropriate tools based on the user's request and their current context within the document.

    **Core Instructions:**
    - **For content generation requests** (e.g., brainstorming, writing a draft, creating a list), you **MUST** use the \`createNode\` tool to insert the new content below the user's current selection.
    - **For content modification requests** (e.g., improving writing, summarizing text, fixing grammar), you **MUST** use the \`updateNode\` tool to replace the currently selected block.
    - **Never respond with only a message if a tool is applicable.** Always call the appropriate tool to perform the action.

    **Current Application State:**
    - All Available Documents: ${JSON.stringify(documents.map((d: any) => ({ _id: d._id, title: d.title })))}
    - Currently Opened Document ID: ${selectedDocumentId || 'None. User is not viewing a document.'}
    - Currently Selected Block ID: ${selectedNodeId || 'None. No specific block is selected.'}

    **Interface/UI Context (authoritative):**
    ${extractedUiSummary || '(No UI context provided; if available, include a synthesized UI layout summary to improve situational awareness.)'}

    **User's Real-time Editor Context:**
    - **Content Before Cursor:**
      \`\`\`
      ${contextBeforeCursor ? contextBeforeCursor.slice(-2000) : '(Start of document)'}
      \`\`\`
    - **Content of Selected Block (or at cursor):**
      \`\`\`
      ${selectedBlockContent || '(Empty block)'}
      \`\`\`
    - **Content After Cursor:**
      \`\`\`
      ${contextAfterCursor ? contextAfterCursor.substring(0, 2000) : '(End of document)'}
      \`\`\`

    **Tool Usage Guidelines:**
    - **To add new content:** Use \`createNode\`. This is for adding new paragraphs, headings, or lists *after* the user's current cursor position.
    - **To modify existing content:** Use \`updateNode\`. This is for rewriting, expanding, or correcting the *currently selected block*.
    - **To create a whole new document:** Use \`createDocument\`. This is for top-level requests not related to the currently open document.
    - Always provide helpful feedback to the user about the action you are taking. For example, "Continuing your thought..." or "Rewriting the selected paragraph...".

    RESPONSE STYLE (apply to every reply):
    - Provide a clear, direct answer first.
    - Then include a brief, step-by-step explanation of how you arrived there.
    - Offer 1–3 alternative perspectives or solutions when relevant.
    - Conclude with a practical summary or action plan the user can apply immediately.
    - If the question is broad, break it into logical parts before answering.
    - Adopt the appropriate professional tone for the user's request (teacher, coach, engineer, doctor, etc.).
    - Avoid vagueness; state assumptions and push your reasoning to be maximally helpful.`;
    
    const messages: any[] = [];
    if (extractedUiSummary) {
      messages.push({
        role: "system",
        content: `Interface context (authoritative):\n${extractedUiSummary}\nWhen the user asks about the current page or visible UI, describe the elements, layout, and controls strictly based on this context. Do not ask to see the screen.`,
      });
    }
    messages.push({ role: "system", content: systemMessage });
    messages.push({ role: "user", content: cleanedUserMessage });

    const tools = [
      { type: "function" as const, function: { name: "createDocument", description: "Creates a new document from scratch.", parameters: zodToJsonSchema(CreateDocumentSchema) } },
      { type: "function" as const, function: { name: "createNode", description: "Adds a new content block *after* the user's current cursor.", parameters: zodToJsonSchema(CreateNodeSchema) } },
      { type: "function" as const, function: { name: "updateNode", description: "Modifies the *currently selected* content block.", parameters: zodToJsonSchema(UpdateNodeSchema) } },
      { type: "function" as const, function: { name: "archiveNode", description: "Deletes the *currently selected* content block.", parameters: zodToJsonSchema(IdSchema("The ID is optional; defaults to the selected block.")) } },
      { type: "function" as const, function: { name: "findDocuments", description: "Searches for documents by title.", parameters: zodToJsonSchema(QuerySchema) } },
      { type: "function" as const, function: { name: "updateDocument", description: "Updates the title of the current document.", parameters: zodToJsonSchema(UpdateDocumentSchema) } },
      { type: "function" as const, function: { name: "archiveDocument", description: "Moves the current document to the trash.", parameters: zodToJsonSchema(IdSchema("The ID is optional; defaults to the current document.")) } },
    ];

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({ model: modelVariant, messages, tools, tool_choice: "auto" });
    // Increment usage on successful OpenAI call
    try {
      await ctx.runMutation(internal.usage.incrementDailyUsage, { provider: "openai" });
    } catch (e) {
      console.warn("[usage] incrementDailyUsage failed (openai)", e);
    }

    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      return { message: responseMessage.content || "I'm not sure how to help with that.", actions: [] };
    }

    const firstCallAny = toolCalls[0] as any;
    const functionName: string | undefined = firstCallAny?.function?.name;
    const rawArgs = firstCallAny?.function?.arguments;
    if (firstCallAny?.type !== "function" || !functionName) {
      return { message: "I couldn't determine the correct tool to call.", actions: [] };
    }
    let functionArgs: any = {};
    try {
      functionArgs = typeof rawArgs === "string" ? JSON.parse(rawArgs) : (rawArgs ?? {});
    } catch {
      functionArgs = {};
    }

    switch (functionName) {
      case "createDocument": {
        const { title, content } = CreateDocumentSchema.parse(functionArgs);
        return { message: `Creating "${title}"...`, actions: [{ type: 'createDocument', title, content, select: true }] };
      }
      case "createNode": {
        if (!selectedDocumentId) return { message: "Please open a document before adding content.", actions: [] };
        const { markdown, parentId } = CreateNodeSchema.parse(functionArgs);
        return { message: "Adding new content...", actions: [{ type: 'createNode', documentId: selectedDocumentId, markdown, parentId: (parentId as Id<"nodes"> | null) || null, select: true }] };
      }
      case "updateNode": {
        const { markdown } = UpdateNodeSchema.parse(functionArgs);
        // If no block is selected, gracefully fall back to creating a new block below the cursor.
        if (!selectedNodeId) {
          if (!selectedDocumentId) {
            return { message: "Please open a document before adding content.", actions: [] };
          }
          return {
            message: "No block selected — inserting new content instead.",
            actions: [{
              type: 'createNode',
              documentId: selectedDocumentId,
              markdown,
              parentId: null,
              select: true,
            }],
          };
        }
        return { message: "Updating the selected block...", actions: [{ type: 'updateNode', nodeId: selectedNodeId, markdown }] };
      }
      case "archiveNode": {
        if (!selectedNodeId) return { message: "Please select a block to delete.", actions: [] };
        return { message: "Deleting block...", actions: [{ type: 'archiveNode', nodeId: selectedNodeId }] };
      }
      case "updateDocument": {
        if (!selectedDocumentId) return { message: "Please open a document to update its title.", actions: [] };
        const { title } = UpdateDocumentSchema.parse(functionArgs);
        return { message: `Updating title to "${title}"...`, actions: [{ type: 'updateDocument', documentId: selectedDocumentId, title }] };
      }
      case "archiveDocument": {
        if (!selectedDocumentId) return { message: "Please open a document to move it to the trash.", actions: [] };
        return { message: "Moving document to trash...", actions: [{ type: 'archiveDocument', documentId: selectedDocumentId }] };
      }
      case "findDocuments": {
        const { query } = QuerySchema.parse(functionArgs);
        const searchResults = await ctx.runQuery(api.documents.getSearch, { query });
        if (searchResults.length === 0) return { message: `I couldn't find any documents matching "${query}".`, actions: [] };
        const documentList = searchResults.map((d: any) => `• ${d.title}`).join('\n');
        return { message: `I found these documents:\n\n${documentList}`, actions: [] };
      }
      default:
        return { message: `I'm not sure how to handle the tool: ${functionName}`, actions: [] };
    }
  },
});