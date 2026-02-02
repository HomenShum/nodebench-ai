/**
 * DRANE Narrative Engine tools for external agents.
 * Proxies Convex queries from the narrative domain (threads, posts, disputes).
 */

import { convexQuery, convexAction } from "../convexClient.js";
import type { McpTool } from "./researchTools.js";

export const narrativeTools: McpTool[] = [
  {
    name: "getPublicThreads",
    description:
      "List all public narrative threads. Each thread tracks an evolving story across entities over time (e.g., 'AI chip shortage', 'OpenAI funding rounds').",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max threads to return (default 20)",
        },
      },
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/narrative/queries/threads:getPublicThreads",
        { limit: args.limit }
      );
    },
  },
  {
    name: "getThread",
    description:
      "Get a single narrative thread by ID, including metadata, entity associations, and event count.",
    inputSchema: {
      type: "object",
      properties: {
        threadId: {
          type: "string",
          description: "Convex ID of the narrative thread",
        },
      },
      required: ["threadId"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/narrative/queries/threads:getThread",
        { threadId: args.threadId }
      );
    },
  },
  {
    name: "searchThreads",
    description:
      "Full-text search across narrative threads by keyword.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        limit: {
          type: "number",
          description: "Max results (default 10)",
        },
      },
      required: ["query"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/narrative/queries/threads:searchThreads",
        { query: args.query, limit: args.limit }
      );
    },
  },
  {
    name: "getThreadsByEntity",
    description:
      "Get all narrative threads associated with a specific entity (company or person name).",
    inputSchema: {
      type: "object",
      properties: {
        entityName: {
          type: "string",
          description: "Entity name to search for",
        },
      },
      required: ["entityName"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/narrative/queries/threads:getThreadsByEntity",
        { entityName: args.entityName }
      );
    },
  },
  {
    name: "getThreadsWithEvents",
    description:
      "Get narrative threads with their recent events inlined, useful for getting a quick overview of active stories.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max threads to return (default 10)",
        },
      },
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/narrative/queries/threads:getThreadsWithEvents",
        { limit: args.limit }
      );
    },
  },
  {
    name: "getThreadStats",
    description:
      "Get aggregate statistics about the narrative engine: total threads, events, posts, disputes, and activity over time.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(
        "domains/narrative/queries/threads:getThreadStats",
        {}
      );
    },
  },
  {
    name: "getThreadPosts",
    description:
      "Get posts (analyst notes, thesis updates, evidence) within a narrative thread.",
    inputSchema: {
      type: "object",
      properties: {
        threadId: {
          type: "string",
          description: "Convex ID of the narrative thread",
        },
        limit: {
          type: "number",
          description: "Max posts to return (default 20)",
        },
      },
      required: ["threadId"],
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/narrative/queries/posts:getThreadPosts",
        { threadId: args.threadId, limit: args.limit }
      );
    },
  },
  {
    name: "getOpenDisputes",
    description:
      "Get all open disputes (contradictions, contested facts) that need resolution across the narrative engine.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max disputes to return (default 20)",
        },
      },
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/narrative/queries/disputes:getOpenDisputes",
        { limit: args.limit }
      );
    },
  },
  {
    name: "getContradictoryPosts",
    description:
      "Get posts that contradict each other across threads, useful for fact-checking and dispute resolution.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max contradictions to return (default 10)",
        },
      },
    },
    handler: async (args) => {
      return await convexQuery(
        "domains/narrative/queries/posts:getContradictoryPosts",
        { limit: args.limit }
      );
    },
  },
  {
    name: "runNewsroomPipeline",
    description:
      "Trigger the full DRANE newsroom pipeline (Scout > Historian > Analyst > Publisher) for a given topic or entity. Returns the generated narrative analysis.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Topic or entity to research",
        },
        depth: {
          type: "string",
          enum: ["quick", "standard", "deep"],
          description: "Research depth (default standard)",
        },
      },
      required: ["topic"],
    },
    handler: async (args) => {
      return await convexAction(
        "domains/narrative/newsroom/workflow:runNewsroomPipeline",
        { topic: args.topic, depth: args.depth ?? "standard" }
      );
    },
  },
];
