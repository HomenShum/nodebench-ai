/**
 * Memory tools — persistent key-value store for agent intermediate results.
 * Ported from core_agent_server/tools/memoryTools.ts.
 */

import { callGateway } from "../convexClient.js";
import type { McpTool } from "./researchTools.js";

export const memoryTools: McpTool[] = [
  {
    name: "writeAgentMemory",
    description:
      "Store intermediate results or data for later retrieval. Use this to avoid context window overflow.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            "Unique key to store the data under (e.g., 'research_results')",
        },
        content: {
          type: "string",
          description: "Content to store (text, JSON string, markdown, etc.)",
        },
        metadata: {
          type: "object",
          description: "Optional metadata about the stored content",
          properties: {
            type: { type: "string", description: "Type of content" },
            source: { type: "string", description: "Source of the data" },
            timestamp: { type: "string", description: "When the data was created" },
          },
        },
      },
      required: ["key", "content"],
    },
    handler: async (args) => {
      const { key, content, metadata = {} } = args;
      if (!key || !content) throw new Error("Key and content are required");

      const result = await callGateway("writeMemory", {
        entry: {
          key,
          content,
          metadata: { ...metadata, createdAt: new Date().toISOString() },
        },
      });

      return {
        success: true,
        memoryId: result,
        key,
        message: `Stored ${content.length} characters under key '${key}'`,
      };
    },
  },
  {
    name: "readAgentMemory",
    description: "Retrieve previously stored data by key.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "Key of the data to retrieve" },
      },
      required: ["key"],
    },
    handler: async (args) => {
      const result = (await callGateway("readMemory", {
        key: args.key,
      })) as any;
      if (!result) throw new Error(`No memory found for key: ${args.key}`);
      return {
        success: true,
        key: result.key,
        content: result.content,
        metadata: result.metadata,
      };
    },
  },
  {
    name: "listAgentMemory",
    description: "List all stored memory keys with their metadata.",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "Optional filter to match keys (substring match)",
        },
      },
    },
    handler: async (args) => {
      const entries = (await callGateway("listMemory", {
        contains: args.filter ?? "",
      })) as any[];
      const list = (entries ?? []).map((e: any) => ({
        key: e.key,
        memoryId: e.id,
        contentLength: (e.content ?? "").length,
        metadata: e.metadata,
      }));
      return { success: true, count: list.length, memories: list };
    },
  },
  {
    name: "deleteAgentMemory",
    description: "Delete stored memory by key.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "Key of the memory to delete" },
      },
      required: ["key"],
    },
    handler: async (args) => {
      const result = await callGateway("deleteMemory", { key: args.key });
      if (!result) throw new Error(`No memory found for key: ${args.key}`);
      return { success: true, message: `Deleted memory for key '${args.key}'` };
    },
  },
];
