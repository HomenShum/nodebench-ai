// convex/tools/documentTools.ts
// Document management tools for Convex Agent
// Enables voice-controlled document operations

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api } from "../_generated/api";

/**
 * Find documents by title or content
 * Voice: "Find document about revenue" or "Search for Q4 planning"
 */
export const findDocument = createTool({
  description: "Search for documents by title or content. By default, returns matching documents with metadata. Set fetchContent=true to automatically retrieve the full content of the first matching document. Use fetchContent=true when the user wants to read, view, or see the document content.",

  args: z.object({
    query: z.string().describe("Search query - can be document title or content keywords"),
    limit: z.number().default(10).describe("Maximum number of results to return (default: 10, max: 50)"),
    includeArchived: z.boolean().default(false).describe("Whether to include archived documents in search results"),
    fetchContent: z.boolean().default(false).describe("Set to true to automatically fetch and return the full content of the first matching document. Use this when the user wants to read, view, or see the document content (not just find it)."),
  }),

  handler: async (ctx, args): Promise<string> => {
    console.log(`[findDocument] Searching for: "${args.query}"`);

    // Get userId from context if available (for evaluation)
    const userId = (ctx as any).evaluationUserId;
    console.log(`[findDocument] userId from context:`, userId);
    console.log(`[findDocument] ctx keys:`, Object.keys(ctx));

    // Use the search index for fast title search
    const results = await ctx.runQuery(api.documents.getSearch, {
      query: args.query,
      userId, // Pass userId for evaluation
    });

    if (results.length === 0) {
      return `No documents found matching "${args.query}".`;
    }

    console.log(`[findDocument] Query: "${args.query}"`);
    console.log(`[findDocument] Results count: ${results.length}`);
    console.log(`[findDocument] fetchContent: ${args.fetchContent}`);

    // If fetchContent is true and we have results, automatically fetch the first document's content
    if (args.fetchContent && results.length > 0) {
      const firstDoc = results[0];
      console.log(`[findDocument] Auto-fetching content for document: ${firstDoc._id}`);

      const doc = await ctx.runQuery(api.documents.getById, {
        documentId: firstDoc._id,
        userId,
      });

      if (doc) {
        const docType = (doc as any).documentType || 'text';
        const lastModified = new Date((doc as any).lastModified || doc._creationTime).toLocaleString();

        let contentPreview = '';

        if (docType === 'file') {
          // For file documents, get file details
          const fileDoc = await ctx.runQuery(api.fileDocuments.getFileDocument, {
            documentId: firstDoc._id,
            userId,
          });

          if (fileDoc && fileDoc.file) {
            const fileSizeMB = (fileDoc.file.fileSize / (1024 * 1024)).toFixed(2);
            contentPreview = `File: ${fileDoc.file.fileName}
Size: ${fileSizeMB} MB
Type: ${(doc as any).fileType || 'unknown'}
${fileDoc.file.analysis ? `\nAnalysis:\n${fileDoc.file.analysis.substring(0, 500)}...` : 'No analysis available'}`;
          }
        } else {
          // For text documents, extract content
          const content = doc.content || '';
          if (typeof content === 'string') {
            contentPreview = content.substring(0, 1000);
          } else {
            // Handle rich content (ProseMirror JSON)
            contentPreview = JSON.stringify(content).substring(0, 1000);
          }
        }

        return `Found document and retrieved content:

Document: "${doc.title}"
ID: ${doc._id}
Type: ${docType}
Last Modified: ${lastModified}

Content:
${contentPreview}${contentPreview.length >= 1000 ? '...' : ''}

${results.length > 1 ? `\nNote: Found ${results.length} matching documents. Showing the first one.` : ''}`;
      }
    }

    // Otherwise, just return the list of documents
    const formattedResults = results.slice(0, args.limit).map((doc: any, idx: number) => {
      const lastModified = (doc as any).lastModified || doc._creationTime;
      const date = new Date(lastModified).toLocaleDateString();
      const docType = (doc as any).documentType || 'text';
      const icon = (doc as any).icon || '📄';

      return `${idx + 1}. ${icon} "${doc.title}"
   ID: ${doc._id}
   Type: ${docType}
   Last Modified: ${date}
   ${doc.isArchived ? '⚠️ Archived' : ''}`;
    }).join('\n\n');

    return `Found ${results.length} document(s):\n\n${formattedResults}`;
  },
});

/**
 * Get full document content and metadata
 * Voice: "Open document [ID]" or "Show me the content of [title]"
 */
export const getDocumentContent = createTool({
  description: "Retrieve full document content and metadata by document ID. Returns the complete document including title, content, type, and metadata. ALWAYS use this tool when the user asks to 'show', 'read', 'open', 'display', or 'view' a document's content. Call findDocument first to get the document ID, then call this tool with that ID.",
  
  args: z.object({
    documentId: z.string().describe("The document ID (from findDocument results)"),
  }),
  
  handler: async (ctx, args): Promise<string> => {
    console.log(`[getDocumentContent] Loading document: ${args.documentId}`);

    // Get userId from context if available (for evaluation)
    const userId = (ctx as any).evaluationUserId;

    const doc = await ctx.runQuery(api.documents.getById, {
      documentId: args.documentId as any,
      userId, // Pass userId for evaluation
    });
    
    if (!doc) {
      return `Document not found or you don't have permission to access it.`;
    }
    
    const docType = (doc as any).documentType || 'text';
    const lastModified = new Date((doc as any).lastModified || doc._creationTime).toLocaleString();
    
    let contentPreview = '';
    
    if (docType === 'file') {
      // For file documents, get file details
      const fileDoc = await ctx.runQuery(api.fileDocuments.getFileDocument, {
        documentId: args.documentId as any,
        userId, // Pass userId for evaluation
      });
      
      if (fileDoc && fileDoc.file) {
        const fileSizeMB = (fileDoc.file.fileSize / (1024 * 1024)).toFixed(2);
        contentPreview = `File: ${fileDoc.file.fileName}
Size: ${fileSizeMB} MB
Type: ${(doc as any).fileType || 'unknown'}
${fileDoc.file.analysis ? `\nAnalysis:\n${fileDoc.file.analysis.substring(0, 500)}...` : 'No analysis available'}`;
      }
    } else {
      // For text documents, extract content
      const content = doc.content || '';
      if (typeof content === 'string') {
        contentPreview = content.substring(0, 1000);
      } else {
        // Handle rich content (ProseMirror JSON)
        contentPreview = JSON.stringify(content).substring(0, 1000);
      }
    }
    
    return `Document: "${doc.title}"
ID: ${doc._id}
Type: ${docType}
Last Modified: ${lastModified}
Public: ${doc.isPublic ? 'Yes' : 'No'}
Archived: ${doc.isArchived ? 'Yes' : 'No'}

Content Preview:
${contentPreview}${contentPreview.length >= 1000 ? '...' : ''}`;
  },
});

/**
 * Analyze and summarize document content
 * Voice: "What is this document about?" or "Summarize this document"
 */
export const analyzeDocument = createTool({
  description: "Analyze and summarize a document's content. For text documents, provides a summary of the content. For file documents, returns existing analysis or indicates if analysis is needed. Use this when the user wants to understand what a document is about.",
  
  args: z.object({
    documentId: z.string().describe("The document ID to analyze"),
    analysisType: z.enum(["summary", "detailed", "keywords"]).default("summary").describe("Type of analysis: summary (brief overview), detailed (comprehensive analysis), or keywords (extract key topics)"),
  }),
  
  handler: async (ctx, args): Promise<string> => {
    console.log(`[analyzeDocument] Analyzing document: ${args.documentId}`);

    // Get userId from context if available (for evaluation)
    const userId = (ctx as any).evaluationUserId;

    const doc = await ctx.runQuery(api.documents.getById, {
      documentId: args.documentId as any,
      userId, // Pass userId for evaluation
    });
    
    if (!doc) {
      return `Document not found.`;
    }
    
    const docType = (doc as any).documentType || 'text';
    
    if (docType === 'file') {
      // For file documents, check if analysis exists
      const fileDoc = await ctx.runQuery(api.fileDocuments.getFileDocument, {
        documentId: args.documentId as any,
        userId, // Pass userId for evaluation
      });
      
      if (fileDoc && fileDoc.file) {
        if (fileDoc.file.analysis) {
          return `Analysis of "${doc.title}":

${fileDoc.file.analysis}

File Details:
- Type: ${(doc as any).fileType || 'unknown'}
- Size: ${(fileDoc.file.fileSize / (1024 * 1024)).toFixed(2)} MB`;
        } else {
          return `File "${doc.title}" has not been analyzed yet. You can trigger analysis using the analyzeFile tool.`;
        }
      }
    }
    
    // For text documents, provide content-based analysis
    const content = doc.content || '';
    let textContent = '';
    
    if (typeof content === 'string') {
      textContent = content;
    } else {
      // Extract text from rich content
      textContent = JSON.stringify(content);
    }
    
    const wordCount = textContent.split(/\s+/).length;
    const charCount = textContent.length;
    
    return `Document Analysis: "${doc.title}"

Type: Text Document
Word Count: ${wordCount}
Character Count: ${charCount}
Last Modified: ${new Date((doc as any).lastModified || doc._creationTime).toLocaleString()}

Content Preview:
${textContent.substring(0, 500)}${textContent.length > 500 ? '...' : ''}

Note: For detailed AI-powered analysis, the content can be processed further.`;
  },
});

/**
 * Update document content
 * Voice: "Edit this document" → "Add section about XYZ"
 */
export const updateDocument = createTool({
  description: "Update a document's title, content, or metadata. Use this when the user wants to edit or modify a document. Returns confirmation of the update.",
  
  args: z.object({
    documentId: z.string().describe("The document ID to update"),
    title: z.string().optional().describe("New title for the document"),
    content: z.string().optional().describe("New content for the document (replaces existing content)"),
    isPublic: z.boolean().optional().describe("Whether the document should be public"),
    isFavorite: z.boolean().optional().describe("Whether to mark as favorite"),
  }),
  
  handler: async (ctx, args): Promise<string> => {
    console.log(`[updateDocument] Updating document: ${args.documentId}`);
    
    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;
    if (args.isFavorite !== undefined) updates.isFavorite = args.isFavorite;
    
    await ctx.runMutation(api.documents.update, {
      id: args.documentId as any,
      ...updates,
    });
    
    const updatedFields = Object.keys(updates).join(', ');
    
    return `Document updated successfully!
Updated fields: ${updatedFields}

The document has been saved with your changes.`;
  },
});

/**
 * Create a new document
 * Voice: "Create a new document called XYZ"
 */
export const createDocument = createTool({
  description: "Create a new document with a title and optional initial content. Returns the new document ID. Use this when the user wants to create a new document.",
  
  args: z.object({
    title: z.string().describe("Title for the new document"),
    content: z.string().optional().describe("Initial content for the document"),
    isPublic: z.boolean().default(false).describe("Whether the document should be public"),
  }),
  
  handler: async (ctx, args): Promise<string> => {
    console.log(`[createDocument] Creating document: "${args.title}"`);

    // Convert content string to array format if provided
    const contentArray = args.content ? [
      {
        type: "paragraph",
        content: [{ type: "text", text: args.content }]
      }
    ] : undefined;

    const documentId = await ctx.runMutation(api.documents.create, {
      title: args.title,
      content: contentArray,
    });

    // If user wants it public, update it
    if (args.isPublic) {
      await ctx.runMutation(api.documents.update, {
        id: documentId,
        isPublic: true,
      });
    }

    return `Document created successfully!

Title: "${args.title}"
ID: ${documentId}
Public: ${args.isPublic ? 'Yes' : 'No'}

The document is ready to edit.`;
  },
});

