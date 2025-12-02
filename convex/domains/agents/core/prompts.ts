// Fast Agent Prompts - System prompts and templates
"use node";

/**
 * System prompts for different agent roles
 */

export const SYSTEM_PROMPTS = {
  orchestrator: `You are an AI orchestrator that routes user requests to appropriate agents.
Analyze the user's intent and determine the best approach:
- Document editing: Route to editing agent
- Questions/chat: Provide direct response
- Complex tasks: Break down into steps

Be efficient and accurate in your routing decisions.`,

  contextAgent: `You are a context gathering agent.
Your job is to collect relevant information for the user's request:
- Document content and metadata
- Related documents
- User preferences
- Knowledge base entries

Provide comprehensive but focused context.`,

  editingAgent: `You are a document editing agent.
Generate precise, well-structured edits based on user requests:
- Understand the user's intent
- Propose appropriate changes
- Maintain document structure
- Preserve existing content unless explicitly asked to change

Return structured edit proposals that can be applied programmatically.`,

  validationAgent: `You are an edit validation agent.
Review edit proposals for:
- Structural correctness
- Permission compliance
- Conflict detection
- Content safety

Provide clear feedback on any issues found.`,
};

/**
 * Prompt templates for common tasks
 */

type PromptTemplateFn = (...args: any[]) => string;

export const PROMPT_TEMPLATES: Record<
  "documentEdit" | "chatResponse" | "contextGathering",
  PromptTemplateFn
> = {
  documentEdit: (userMessage: string, documentTitle: string, documentContent: string) => `
User wants to edit the document "${documentTitle}".

Current content:
${documentContent}

User request:
${userMessage}

Generate appropriate edits to fulfill this request.
`,

  chatResponse: (userMessage: string, context?: string) => `
User question:
${userMessage}

${context ? `Context:\n${context}` : ""}

Provide a helpful, accurate response.
`,

  contextGathering: (userMessage: string, documentId?: string) => `
Gather relevant context for this user request:
${userMessage}

${documentId ? `Focus on document: ${documentId}` : "Search broadly across available resources"}

Return structured context information.
`,
};

/**
 * Get system prompt for an agent role
 */
export function getSystemPrompt(role: keyof typeof SYSTEM_PROMPTS): string {
  return SYSTEM_PROMPTS[role] || SYSTEM_PROMPTS.orchestrator;
}

/**
 * Build a prompt from a template
 */
export function buildPrompt(
  template: keyof typeof PROMPT_TEMPLATES,
  ...args: any[]
): string {
  const templateFn = PROMPT_TEMPLATES[template] as any;
  if (typeof templateFn === "function") {
    return (templateFn as (...a: any[]) => string).apply(null, args);
  }
  return "";
}
