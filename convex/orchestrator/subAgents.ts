/**
 * Specialized Sub-Agents
 * 
 * Domain-specific agents with focused tool sets
 */

import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "../_generated/api";
import type { SubAgentConfig } from "./types";

// Import tools
import {
  findDocument,
  getDocumentContent,
  analyzeDocument,
  updateDocument,
  createDocument
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
export const createDocumentAgent = (model: string = "gpt-5-mini") => new Agent(components.agent, {
  name: "DocumentAgent",
  languageModel: openai.chat(model),
  instructions: `You are a specialized Document Agent focused on document operations.

Your responsibilities:
- Finding documents by title or content
- Reading and analyzing document content
- Creating new documents
- Updating document titles and content
- Providing document summaries and insights

CRITICAL RULES:
1. ALWAYS complete the requested action - don't ask for clarification
2. When asked to create a document, create it immediately with provided content
3. When asked to update a document, find it first if needed, then update it
4. When analyzing documents, provide specific insights from the content
5. When comparing documents, retrieve ALL documents first, then compare

Be proactive, complete, and accurate.`,
  tools: {
    findDocument,
    getDocumentContent,
    analyzeDocument,
    updateDocument,
    createDocument,
  },
});

/**
 * Media Agent - Specialized for media operations
 */
export const createMediaAgent = (model: string = "gpt-5-mini") => new Agent(components.agent, {
  name: "MediaAgent",
  languageModel: openai.chat(model),
  instructions: `You are a specialized Media Agent focused on media file operations.

Your responsibilities:
- Searching for images and videos in user's files
- Analyzing media files
- Retrieving media file details
- Listing media files by type

CRITICAL RULES:
1. ALWAYS search internal files first before suggesting web search
2. When asked to analyze an image, use analyzeMediaFile with the filename
3. When no results found, explain clearly and offer alternatives
4. Provide specific details about media files (name, type, size)

Be helpful and accurate with media operations.`,
  tools: {
    searchMedia,
    analyzeMediaFile,
    getMediaDetails,
    listMediaFiles,
  },
});

/**
 * Task Agent - Specialized for task management
 */
export const createTaskAgent = (model: string = "gpt-5-mini") => new Agent(components.agent, {
  name: "TaskAgent",
  languageModel: openai.chat(model),
  instructions: `You are a specialized Task Agent focused on task management.

Your responsibilities:
- Listing tasks with filters (priority, status, date)
- Creating new tasks
- Updating task status and properties
- Finding tasks by criteria

CRITICAL RULES:
1. When asked to create a task, create it immediately with provided details
2. When asked to mark a task complete, find it first if needed, then update status to "done"
3. When filtering by priority, use the priority parameter correctly
4. When showing tasks, include relevant details (status, priority, due date)
5. Complete ALL requested actions in multi-step workflows

Be proactive and complete all task operations.`,
  tools: {
    listTasks,
    createTask,
    updateTask,
  },
});

/**
 * Event Agent - Specialized for calendar/event management
 */
export const createEventAgent = (model: string = "gpt-5-mini") => new Agent(components.agent, {
  name: "EventAgent",
  languageModel: openai.chat(model),
  instructions: `You are a specialized Event Agent focused on calendar and event management.

Your responsibilities:
- Listing events by time range (today, week, month)
- Creating new calendar events
- Managing event details (time, location, description)

CRITICAL RULES:
1. When asked to schedule a meeting, create the event immediately
2. Parse natural language dates (today, tomorrow, next week) correctly
3. When listing events, show relevant details (time, location, description)
4. Handle time zones appropriately

Be proactive and complete all event operations.`,
  tools: {
    listEvents,
    createEvent,
    getFolderContents,
  },
});

/**
 * Web Agent - Specialized for web search
 */
export const createWebAgent = (model: string = "gpt-5-mini") => new Agent(components.agent, {
  name: "WebAgent",
  languageModel: openai.chat(model),
  instructions: `You are a specialized Web Agent focused on web search operations.

Your responsibilities:
- Searching the web for current information
- Finding images and videos online
- Searching YouTube for videos
- Providing web-based answers

CRITICAL RULES:
1. Use linkupSearch for general web queries and online images
2. Use youtubeSearch specifically for YouTube video queries
3. Provide source URLs for all web results
4. Format results clearly with links

Be accurate and cite sources.`,
  tools: {
    linkupSearch,
    youtubeSearch,
  },
});

/**
 * Get sub-agent configuration
 */
export const subAgentConfigs: Record<string, SubAgentConfig> = {
  document: {
    domain: "document",
    name: "DocumentAgent",
    description: "Handles document operations (find, read, create, update, analyze)",
    tools: ["findDocument", "getDocumentContent", "analyzeDocument", "updateDocument", "createDocument"],
    instructions: "Specialized in document operations",
  },
  media: {
    domain: "media",
    name: "MediaAgent",
    description: "Handles media operations (search, analyze, list, details)",
    tools: ["searchMedia", "analyzeMediaFile", "getMediaDetails", "listMediaFiles"],
    instructions: "Specialized in media file operations",
  },
  task: {
    domain: "task",
    name: "TaskAgent",
    description: "Handles task management (list, create, update)",
    tools: ["listTasks", "createTask", "updateTask"],
    instructions: "Specialized in task management",
  },
  event: {
    domain: "event",
    name: "EventAgent",
    description: "Handles calendar/event operations (list, create)",
    tools: ["listEvents", "createEvent", "getFolderContents"],
    instructions: "Specialized in calendar and event management",
  },
  web: {
    domain: "web",
    name: "WebAgent",
    description: "Handles web search operations",
    tools: ["linkupSearch", "youtubeSearch"],
    instructions: "Specialized in web search",
  },
};

