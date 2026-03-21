/**
 * OpenAI Realtime Voice Agent
 * 
 * Creates a RealtimeAgent with tools that call Convex backend
 */

import { RealtimeAgent, tool } from '@openai/agents/realtime';
import { z } from 'zod';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

// Initialize Convex client
const convexUrl = process.env.CONVEX_URL;
if (!convexUrl) {
  throw new Error('CONVEX_URL environment variable is required');
}

const convex = new ConvexHttpClient(convexUrl);

/**
 * Create a realtime voice agent with Convex tool integration
 */
export function createRealtimeAgent(userId: string, model: string = 'gpt-4o-realtime-preview') {
  return new RealtimeAgent({
    name: 'Voice Assistant',
    instructions: `You are a helpful voice assistant with access to the user's documents, tasks, events, and more.

Key guidelines:
- Keep responses concise and conversational for voice
- Use tools to access user data when needed
- Announce when you're about to use a tool (e.g., "Let me search your documents...")
- Provide clear, actionable responses
- If a task will take time, let the user know upfront

Available capabilities:
- Search and analyze documents
- Create and manage tasks
- Search the web
- Access calendar events
- Manage media files`,
    
    tools: [
      createSearchDocumentsTool(userId),
      createGetDocumentTool(userId),
      createCreateDocumentTool(userId),
      createSearchWebTool(),
      createListTasksTool(userId),
      createCreateTaskTool(userId),
    ],
  });
}

/**
 * Tool: Search user documents
 */
function createSearchDocumentsTool(userId: string) {
  return tool({
    name: 'search_documents',
    description: 'Search through the user\'s documents by content or title',
    parameters: z.object({
      query: z.string().describe('Search query'),
      limit: z.number().optional().describe('Maximum number of results (default: 5)'),
    }),
    async execute({ query, limit = 5 }) {
      console.log(`[Tool] search_documents: "${query}" (limit: ${limit})`);
      
      try {
        const results = await convex.query(api.documents.search, {
          query,
          limit,
        });

        return JSON.stringify({
          count: results.length,
          documents: results.map((doc: any) => ({
            id: doc._id,
            title: doc.title,
            snippet: doc.body?.slice(0, 200),
            createdAt: doc._creationTime,
          })),
        });
      } catch (error) {
        console.error('[Tool] search_documents error:', error);
        return JSON.stringify({ error: 'Failed to search documents' });
      }
    },
  });
}

/**
 * Tool: Get document content
 */
function createGetDocumentTool(userId: string) {
  return tool({
    name: 'get_document',
    description: 'Get the full content of a specific document',
    parameters: z.object({
      documentId: z.string().describe('Document ID'),
    }),
    async execute({ documentId }) {
      console.log(`[Tool] get_document: ${documentId}`);
      
      try {
        const doc = await convex.query(api.documents.getDocument, {
          documentId: documentId as any,
        });

        if (!doc) {
          return JSON.stringify({ error: 'Document not found' });
        }

        return JSON.stringify({
          id: doc._id,
          title: doc.title,
          body: doc.body,
          createdAt: doc._creationTime,
        });
      } catch (error) {
        console.error('[Tool] get_document error:', error);
        return JSON.stringify({ error: 'Failed to get document' });
      }
    },
  });
}

/**
 * Tool: Create a new document
 */
function createCreateDocumentTool(userId: string) {
  return tool({
    name: 'create_document',
    description: 'Create a new document with title and content',
    parameters: z.object({
      title: z.string().describe('Document title'),
      body: z.string().describe('Document content'),
    }),
    async execute({ title, body }) {
      console.log(`[Tool] create_document: "${title}"`);

      try {
        const documentId = await convex.mutation(api.documents.createDocument, {
          title,
          body,
          userId,
        });

        return JSON.stringify({
          success: true,
          documentId,
          message: `Created document "${title}"`,
        });
      } catch (error) {
        console.error('[Tool] create_document error:', error);
        return JSON.stringify({ error: 'Failed to create document' });
      }
    },
  });
}

/**
 * Tool: Search the web using Linkup
 */
function createSearchWebTool() {
  return tool({
    name: 'search_web',
    description: 'Search the web for current information using Linkup AI search',
    parameters: z.object({
      query: z.string().describe('Search query'),
    }),
    async execute({ query }) {
      console.log(`[Tool] search_web: "${query}"`);

      try {
        const apiKey = process.env.LINKUP_API_KEY;
        if (!apiKey) {
          return JSON.stringify({ error: 'Linkup API key not configured' });
        }

        const response = await fetch('https://api.linkup.so/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: query,
            depth: 'standard',
            outputType: 'sourcedAnswer',
          }),
        });

        if (!response.ok) {
          throw new Error(`Linkup API error: ${response.status}`);
        }

        const data = await response.json();

        return JSON.stringify({
          answer: data.answer,
          sources: data.sources?.slice(0, 3).map((s: any) => ({
            name: s.name,
            url: s.url,
            snippet: s.snippet?.slice(0, 150),
          })),
        });
      } catch (error) {
        console.error('[Tool] search_web error:', error);
        return JSON.stringify({ error: 'Failed to search web' });
      }
    },
  });
}

/**
 * Tool: List user tasks
 */
function createListTasksTool(userId: string) {
  return tool({
    name: 'list_tasks',
    description: 'List the user\'s tasks, optionally filtered by date range',
    parameters: z.object({
      start: z.number().optional().describe('Start timestamp (ms)'),
      end: z.number().optional().describe('End timestamp (ms)'),
    }),
    async execute({ start, end }) {
      console.log(`[Tool] list_tasks: start=${start}, end=${end}`);

      try {
        const tasks = await convex.query(api.documentTasks.listTasks, {
          start,
          end,
        });

        return JSON.stringify({
          count: tasks.length,
          tasks: tasks.map((task: any) => ({
            id: task._id,
            title: task.title,
            status: task.status,
            dueDate: task.dueDate,
            priority: task.priority,
          })),
        });
      } catch (error) {
        console.error('[Tool] list_tasks error:', error);
        return JSON.stringify({ error: 'Failed to list tasks' });
      }
    },
  });
}

/**
 * Tool: Create a new task
 */
function createCreateTaskTool(userId: string) {
  return tool({
    name: 'create_task',
    description: 'Create a new task for the user',
    parameters: z.object({
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      dueDate: z.string().optional().describe('Due date (ISO format)'),
      status: z.string().optional().describe('Task status'),
      priority: z.string().optional().describe('Task priority'),
    }),
    async execute({ title, description, dueDate, status, priority }) {
      console.log(`[Tool] create_task: "${title}"`);

      try {
        const taskId = await convex.mutation(api.documentTasks.createTask, {
          title,
          description,
          dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
          status,
          priority,
        });

        return JSON.stringify({
          success: true,
          taskId,
          message: `Created task "${title}"`,
        });
      } catch (error) {
        console.error('[Tool] create_task error:', error);
        return JSON.stringify({ error: 'Failed to create task' });
      }
    },
  });
}

