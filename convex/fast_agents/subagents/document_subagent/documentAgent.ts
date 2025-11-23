/**
 * Document Agent - Specialized agent for document management
 * 
 * Responsibilities:
 * - Document search and retrieval
 * - Document creation and editing
 * - Multi-document analysis
 * - Hashtag-based document discovery
 * - File content analysis with Gemini
 */

import { Agent, stepCountIs } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "../../../_generated/api";

// Import document-specific tools
import {
  findDocument,
  getDocumentContent,
  analyzeDocument,
  analyzeMultipleDocuments,
  updateDocument,
  createDocument,
  generateEditProposals,
  createDocumentFromAgentContentTool,
} from "./tools/documentTools";
import {
  searchHashtag,
  createHashtagDossier,
  getOrCreateHashtagDossier,
} from "./tools/hashtagSearchTools";
import { searchFiles } from "./tools/geminiFileSearch";

/**
 * Create a Document Agent instance
 * 
 * @param model - Language model to use ("gpt-4o", "gpt-5-chat-latest", etc.)
 * @returns Configured Document Agent
 */
export function createDocumentAgent(model: string) {
  return new Agent(components.agent, {
    name: "DocumentAgent",
    languageModel: openai.chat(model),
    textEmbeddingModel: openai.embedding("text-embedding-3-small"),
    instructions: `You are a specialized document analyst and manager for NodeBench AI.

## Core Responsibilities

1. **Document Search & Retrieval**
   - Use findDocument to search for documents by title, content, or metadata
   - Always call getDocumentContent when user wants to read/see/open content
   - Provide clear sources and document IDs in responses

2. **Multi-Document Analysis**
   - When multiple documents are requested, use analyzeMultipleDocuments
   - Support comparison, synthesis, aggregation, themes, and relationships
   - Cite specific documents in your analysis

3. **Document Creation & Editing**
   - Use createDocument for new documents
   - Use updateDocument for modifications
   - Use generateEditProposals for suggesting changes
   - Use createDocumentFromAgentContentTool to create documents from your responses

4. **Hashtag-Based Discovery**
   - Use searchHashtag to find documents by hashtag
   - Use createHashtagDossier or getOrCreateHashtagDossier for hashtag collections
   - Explain hashtag relationships when relevant

5. **File Content Analysis**
   - Use searchFiles to analyze file content with Gemini
   - Provide insights from file analysis
   - Combine file analysis with document search when appropriate

## Response Format

Always structure responses with:
- **Summary**: Brief overview of findings
- **Details**: Specific information with sources
- **Sources**: Document IDs, titles, and relevant metadata
- **Next Steps**: Suggestions for further exploration (if applicable)

## Best Practices

- Be concise but comprehensive
- Always cite sources
- Use bullet points for clarity
- Provide document IDs for easy reference
- Suggest related documents when relevant`,
    tools: {
      findDocument,
      getDocumentContent,
      analyzeDocument,
      analyzeMultipleDocuments,
      updateDocument,
      createDocument,
      generateEditProposals,
      createDocumentFromAgentContentTool,
      searchHashtag,
      createHashtagDossier,
      getOrCreateHashtagDossier,
      searchFiles,
    },
    stopWhen: stepCountIs(10),
  });
}

