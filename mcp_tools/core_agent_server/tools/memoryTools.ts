/**
 * Memory Tools for Deep Agents 2.0
 * 
 * These tools enable persistent memory by storing intermediate results
 * in external storage instead of the context window. This is Pillar 3 of Deep Agents architecture.
 */

const CONVEX_BASE_URL = process.env.CONVEX_BASE_URL;
const CONVEX_ADMIN_KEY = process.env.CONVEX_ADMIN_KEY;
const MCP_SECRET = process.env.MCP_SECRET;

type MemoryEntry = {
  id: string;
  key: string;
  content: string;
  metadata?: Record<string, any>;
};

async function callConvex(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: any) {
  if (!CONVEX_BASE_URL) {
    throw new Error("Missing CONVEX_BASE_URL for MCP storage");
  }
  if (!MCP_SECRET) {
    throw new Error("Missing MCP_SECRET for MCP storage");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-mcp-secret": MCP_SECRET,
  };

  // Optional: allow admin key auth as well (not required for mcp-3 endpoints)
  if (CONVEX_ADMIN_KEY) {
    headers["Authorization"] = `Bearer ${CONVEX_ADMIN_KEY}`;
  }

  const res = await fetch(`${CONVEX_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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

      const res = await callConvex("POST", "/api/mcpMemory", {
        key: memoryEntry.key,
        content: memoryEntry.content,
        metadata: memoryEntry.metadata,
      });

      return {
        success: true,
        memoryId: res?.entry?.id ?? memoryId,
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

      const res = await callConvex("GET", `/api/mcpMemory?key=${encodeURIComponent(key)}`) as any;
      const memoryEntry = (res?.entries?.[0] ?? null) as MemoryEntry | null;
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

      const res = await callConvex(
        "GET",
        `/api/mcpMemory?contains=${encodeURIComponent(filter ?? "")}`
      ) as any;
      const list = (res?.entries ?? []) as MemoryEntry[];
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

      const res = await callConvex("GET", `/api/mcpMemory?key=${encodeURIComponent(key)}`) as any;
      const entry = (res?.entries?.[0] ?? null) as MemoryEntry | null;
      if (!entry?.id) throw new Error(`No memory found for key: ${key}`);

      await callConvex("DELETE", `/api/mcpMemory/${encodeURIComponent(entry.id)}`);

      return {
        success: true,
        message: `Deleted memory for key '${key}'`,
      };
    },
  },
];
