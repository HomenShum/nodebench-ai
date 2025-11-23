/**
 * Memory Tools for Deep Agents 2.0
 * 
 * These tools enable persistent memory by storing intermediate results
 * in external storage instead of the context window. This is Pillar 3 of Deep Agents architecture.
 */

import fetch from "node-fetch";

const CONVEX_BASE_URL = process.env.CONVEX_BASE_URL;
const CONVEX_ADMIN_KEY = process.env.CONVEX_ADMIN_KEY;

type MemoryEntry = {
  id: string;
  key: string;
  content: string;
  metadata?: Record<string, any>;
};

async function callConvex(path: string, body: any) {
  if (!CONVEX_BASE_URL || !CONVEX_ADMIN_KEY) {
    throw new Error("Missing CONVEX_BASE_URL or CONVEX_ADMIN_KEY for MCP storage");
  }
  const res = await fetch(`${CONVEX_BASE_URL}/api/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CONVEX_ADMIN_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex error ${res.status}: ${text}`);
  }
  return await res.json();
}

export const memoryTools = [
  {
    name: "writeAgentMemory",
    description: "Store intermediate results or data for later retrieval. Use this to avoid context window overflow.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Unique key to store the data under (e.g., 'research_results', 'company_data')",
        },
        content: {
          type: "string",
          description: "Content to store (can be text, JSON string, markdown, etc.)",
        },
        metadata: {
          type: "object",
          description: "Optional metadata about the stored content",
          properties: {
            type: { type: "string", description: "Type of content (e.g., 'research', 'analysis')" },
            source: { type: "string", description: "Source of the data" },
            timestamp: { type: "string", description: "When the data was created" },
          },
        },
      },
      required: ["key", "content"],
    },
    handler: async (args: any) => {
      const { key, content, metadata = {} } = args;

      if (!key || !content) {
        throw new Error("Key and content are required");
      }

      // Generate memory ID
      const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store memory
      const memoryEntry: MemoryEntry = {
        id: memoryId,
        key,
        content,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
        },
      };

      await callConvex("mcpMemory/write", { entry: memoryEntry });

      return {
        success: true,
        memoryId,
        key,
        message: `Stored ${content.length} characters under key '${key}'`,
      };
    },
  },
  {
    name: "readAgentMemory",
    description: "Retrieve previously stored data by key",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Key of the data to retrieve",
        },
      },
      required: ["key"],
    },
    handler: async (args: any) => {
      const { key } = args;

      const memoryEntry = await callConvex("mcpMemory/read", { key }) as MemoryEntry | null;
      if (!memoryEntry) {
        throw new Error(`No memory found for key: ${key}`);
      }

      return {
        success: true,
        key,
        content: memoryEntry.content,
        metadata: memoryEntry.metadata,
      };
    },
  },
  {
    name: "listAgentMemory",
    description: "List all stored memory keys with their metadata",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "Optional filter to match keys (substring match)",
        },
      },
    },
    handler: async (args: any) => {
      const { filter } = args;

      const list = await callConvex("mcpMemory/list", { filter: filter ?? "" }) as MemoryEntry[];
      const memoryList = list.map((entry: MemoryEntry) => ({
        key: entry.key,
        memoryId: entry.id,
        contentLength: entry.content.length,
        metadata: entry.metadata,
      }));

      return {
        success: true,
        count: memoryList.length,
        memories: memoryList,
      };
    },
  },
  {
    name: "deleteAgentMemory",
    description: "Delete stored memory by key",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Key of the memory to delete",
        },
      },
      required: ["key"],
    },
    handler: async (args: any) => {
      const { key } = args;

      const result = await callConvex("mcpMemory/delete", { key });
      if (!result?.success) {
        throw new Error(result?.error || `No memory found for key: ${key}`);
      }

      return {
        success: true,
        message: `Deleted memory for key '${key}'`,
      };
    },
  },
];
