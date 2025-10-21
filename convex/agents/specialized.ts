/**
 * Specialized Domain Agents
 * 
 * Standalone agent definitions exposed as Convex actions for use in durable workflows.
 * Following the pattern from https://docs.convex.dev/agents/workflows
 */

import { Agent, stepCountIs } from "@convex-dev/agent";
import { components } from "../_generated/api";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Import tools
import {
  findDocument,
  getDocumentContent,
  analyzeDocument,
  updateDocument,
  createDocument,
  searchLocalDocuments,
} from "../tools/documentTools";
import {
  searchMedia,
  analyzeMediaFile,
  getMediaDetails,
  listMediaFiles
} from "../tools/mediaTools";
import {
  listTasks,
  createTask,
  updateTask,
  listEvents,
  createEvent,
  getFolderContents
} from "../tools/dataAccessTools";
import { linkupSearch } from "../tools/linkupSearch";
import { youtubeSearch } from "../tools/youtubeSearch";

/**
 * Document Agent - Specialized for document operations
 */
export const documentAgent = new Agent(components.agent, {
  name: "DocumentAgent",
  languageModel: openai.chat("gpt-5-mini"),
  instructions: `You are a document specialist AI assistant.

Your expertise:
- Finding documents by title or content
- Searching local documents by topic using hybrid search
- Reading and extracting document content
- Analyzing and summarizing documents
- Creating new documents
- Updating document properties

IMPORTANT Tool Selection:
- Use findDocument to search for documents by exact title
- Use searchLocalDocuments to search by topic/keyword using hybrid search (exact + semantic)
- Use getDocumentContent to read full document text
- Use analyzeDocument to summarize and extract insights
- Use createDocument to create new documents
- Use updateDocument to modify document titles or properties

When to use searchLocalDocuments vs findDocument:
- Use searchLocalDocuments when user asks "find documents about X" or "search for X" (topic-based)
- Use findDocument when user asks "find document called X" or "find document titled X" (exact title)

Always be proactive and complete the requested action without asking for confirmation.`,
  tools: {
    findDocument,
    searchLocalDocuments,
    getDocumentContent,
    analyzeDocument,
    updateDocument,
    createDocument,
  },
});

// Expose as actions for workflows
export const findDocumentAction = documentAgent.asTextAction({
  stopWhen: stepCountIs(3),
});

export const analyzeDocumentAction = documentAgent.asObjectAction({
  schema: z.object({
    summary: z.string().describe("Brief summary of the document"),
    keyPoints: z.array(z.string()).describe("Main points or takeaways"),
    documentId: z.string().optional().describe("Document ID if available"),
  }),
});

/**
 * Media Agent - Specialized for media file operations
 */
export const mediaAgent = new Agent(components.agent, {
  name: "MediaAgent",
  languageModel: openai.chat("gpt-5-mini"),
  instructions: `You are a media file specialist AI assistant.

Your expertise:
- Searching for images and videos in user's files
- Analyzing media files with AI vision
- Retrieving media file details and metadata
- Listing all media files

IMPORTANT Tool Selection:
- Use searchMedia to search INTERNAL files (when user asks "find images" or "find videos")
- Use analyzeMediaFile for AI analysis of images
- Use getMediaDetails for file information
- Use listMediaFiles to show all media

NEVER use web search tools unless explicitly asked for "online" or "web" images.`,
  tools: {
    searchMedia,
    analyzeMediaFile,
    getMediaDetails,
    listMediaFiles,
  },
});

export const searchMediaAction = mediaAgent.asTextAction({
  stopWhen: stepCountIs(3),
});

export const analyzeMediaAction = mediaAgent.asObjectAction({
  schema: z.object({
    description: z.string().describe("What the image/video contains"),
    objects: z.array(z.string()).describe("Objects or people detected"),
    confidence: z.number().optional().describe("Analysis confidence 0-1"),
  }),
});

/**
 * Task Agent - Specialized for task management
 */
export const taskAgent = new Agent(components.agent, {
  name: "TaskAgent",
  languageModel: openai.chat("gpt-5-mini"),
  instructions: `You are a task management specialist AI assistant.

Your expertise:
- Listing tasks with filters (today, this week, by priority)
- Creating new tasks
- Updating task status and properties

IMPORTANT Tool Selection:
- Use listTasks to show tasks (filter: 'today', 'week', 'all')
- Use createTask to create new tasks (EXECUTE IMMEDIATELY, don't ask)
- Use updateTask to change task status or properties

When asked to create a task, DO IT immediately without confirmation.`,
  tools: {
    listTasks,
    createTask,
    updateTask,
  },
});

export const listTasksAction = taskAgent.asTextAction({
  stopWhen: stepCountIs(3),
});

export const createTaskAction = taskAgent.asObjectAction({
  schema: z.object({
    taskId: z.string().describe("ID of created task"),
    title: z.string().describe("Task title"),
    status: z.string().describe("Task status"),
  }),
});

/**
 * Event Agent - Specialized for calendar/event management
 */
export const eventAgent = new Agent(components.agent, {
  name: "EventAgent",
  languageModel: openai.chat("gpt-5-mini"),
  instructions: `You are a calendar and event specialist AI assistant.

Your expertise:
- Listing events by time range (today, week, month)
- Creating new calendar events
- Managing event details

IMPORTANT Tool Selection:
- Use listEvents to show events (timeRange: 'today', 'week', 'month')
- Use createEvent to schedule new events (EXECUTE IMMEDIATELY, don't ask)
- Use getFolderContents for organizational context

When asked to create an event, DO IT immediately without confirmation.`,
  tools: {
    listEvents,
    createEvent,
    getFolderContents,
  },
});

export const listEventsAction = eventAgent.asTextAction({
  stopWhen: stepCountIs(3),
});

export const createEventAction = eventAgent.asObjectAction({
  schema: z.object({
    eventId: z.string().describe("ID of created event"),
    title: z.string().describe("Event title"),
    startTime: z.string().describe("Event start time"),
  }),
});

/**
 * Web Agent - Specialized for web search
 */
export const webAgent = new Agent(components.agent, {
  name: "WebAgent",
  languageModel: openai.chat("gpt-5-mini"),
  instructions: `You are a web search specialist AI assistant.

Your expertise:
- Searching the web for current information
- Finding YouTube videos
- Gathering online content

IMPORTANT Tool Selection:
- Use linkupSearch for general web search and online images
- Use youtubeSearch for finding YouTube videos

Provide comprehensive results with sources and links.`,
  tools: {
    linkupSearch,
    youtubeSearch,
  },
});

export const webSearchAction = webAgent.asTextAction({
  stopWhen: stepCountIs(5),
});

export const youtubeSearchAction = webAgent.asObjectAction({
  schema: z.object({
    videos: z.array(z.object({
      title: z.string(),
      url: z.string(),
      description: z.string(),
    })).describe("Found YouTube videos"),
  }),
});

/**
 * Hashtag Search Agent - Specialized for hashtag-based document search
 *
 * Re-exported from hashtagAgent.ts for consistency with other specialized agents
 */
export {
  hashtagAgent,
  searchHashtagAction,
  searchHashtagStructuredAction,
  createHashtagDossierAction,
  listHashtagDossiersAction,
  smartHashtagSearchAction,
  analyzeHashtagRelationshipsAction,
} from "./hashtagAgent";
