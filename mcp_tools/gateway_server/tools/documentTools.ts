/**
 * Document, folder, spreadsheet, and file tools for external agents.
 *
 * Routes to internal MCP-safe Convex endpoints that accept explicit userId,
 * bypassing getAuthUserId() which returns null for admin-key HTTP calls.
 */

import { convexQuery, convexMutation, getServiceUserId } from "../convexClient.js";
import type { McpTool } from "./researchTools.js";

// Internal endpoint prefix for document MCP functions
const MCP = "domains/documents/mcpDocumentEndpoints";

export const documentTools: McpTool[] = [
  // ── Document CRUD ─────────────────────────────────────────────
  {
    name: "createDocument",
    description:
      "Create a new rich-text document with a title and optional initial content blocks.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Document title" },
        parentId: {
          type: "string",
          description: "Optional parent document ID for hierarchy",
        },
      },
      required: ["title"],
    },
    handler: async (args) => {
      return await convexMutation(`${MCP}:mcpCreateDocument`, {
        userId: getServiceUserId(),
        title: args.title,
        parentId: args.parentId,
      });
    },
  },
  {
    name: "createDocumentWithContent",
    description:
      "Create a document with pre-built ProseMirror JSON content string.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Document title" },
        content: {
          type: "string",
          description: "ProseMirror JSON content string",
        },
        parentId: {
          type: "string",
          description: "Optional parent document ID",
        },
      },
      required: ["title", "content"],
    },
    handler: async (args) => {
      return await convexMutation(`${MCP}:mcpCreateDocument`, {
        userId: getServiceUserId(),
        title: args.title,
        content: args.content,
        parentId: args.parentId,
      });
    },
  },
  {
    name: "getDocument",
    description:
      "Get a document by ID, including title, content, metadata, and file info.",
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "Convex document ID",
        },
      },
      required: ["documentId"],
    },
    handler: async (args) => {
      return await convexQuery(`${MCP}:mcpGetDocument`, {
        documentId: args.documentId,
      });
    },
  },
  {
    name: "updateDocument",
    description:
      "Update document fields: title, content, icon, visibility, favorite status.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex document ID" },
        title: { type: "string", description: "New title" },
        content: {
          type: "string",
          description: "New ProseMirror JSON content string",
        },
        icon: { type: "string", description: "Emoji icon" },
        isPublic: { type: "boolean", description: "Public visibility" },
        isFavorite: { type: "boolean", description: "Favorite status" },
      },
      required: ["id"],
    },
    handler: async (args) => {
      const payload: Record<string, unknown> = {
        userId: getServiceUserId(),
        id: args.id,
      };
      if (args.title !== undefined) payload.title = args.title;
      if (args.content !== undefined) payload.content = args.content;
      if (args.icon !== undefined) payload.icon = args.icon;
      if (args.isPublic !== undefined) payload.isPublic = args.isPublic;
      if (args.isFavorite !== undefined) payload.isFavorite = args.isFavorite;
      return await convexMutation(`${MCP}:mcpUpdateDocument`, payload);
    },
  },
  {
    name: "archiveDocument",
    description:
      "Archive (soft-delete) a document and all its children recursively.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex document ID" },
      },
      required: ["id"],
    },
    handler: async (args) => {
      return await convexMutation(`${MCP}:mcpArchiveDocument`, {
        userId: getServiceUserId(),
        id: args.id,
      });
    },
  },
  {
    name: "restoreDocument",
    description: "Restore an archived document and its children.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Convex document ID" },
      },
      required: ["id"],
    },
    handler: async (args) => {
      return await convexMutation(`${MCP}:mcpRestoreDocument`, {
        userId: getServiceUserId(),
        id: args.id,
      });
    },
  },
  {
    name: "searchDocuments",
    description: "Search documents by title (full-text search).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
    handler: async (args) => {
      return await convexQuery(`${MCP}:mcpSearchDocuments`, {
        userId: getServiceUserId(),
        query: args.query,
      });
    },
  },
  {
    name: "listDocuments",
    description:
      "List all user documents sorted by last modified (most recent first, up to 200).",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 100)" },
      },
    },
    handler: async (args) => {
      return await convexQuery(`${MCP}:mcpListDocuments`, {
        userId: getServiceUserId(),
        limit: args.limit,
      });
    },
  },
  {
    name: "exportDocumentToMarkdown",
    description:
      "Export a document to Markdown format. Returns { title, markdown }.",
    inputSchema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "Convex document ID" },
      },
      required: ["documentId"],
    },
    handler: async (args) => {
      return await convexQuery(`${MCP}:mcpExportToMarkdown`, {
        userId: getServiceUserId(),
        documentId: args.documentId,
      });
    },
  },
  {
    name: "duplicateDocument",
    description:
      "Duplicate a document. Clones content, icon, type. Resets visibility and favorite.",
    inputSchema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "Convex document ID to clone" },
        title: { type: "string", description: "Override title (default: original + ' (Copy)')" },
      },
      required: ["documentId"],
    },
    handler: async (args) => {
      return await convexMutation(`${MCP}:mcpDuplicateDocument`, {
        userId: getServiceUserId(),
        documentId: args.documentId,
        title: args.title,
      });
    },
  },

  // ── Folder Management ─────────────────────────────────────────
  {
    name: "createFolder",
    description: "Create a new folder for organizing documents.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Folder name" },
        color: {
          type: "string",
          description: "CSS color class (e.g. 'blue', 'red', 'green')",
        },
      },
      required: ["name", "color"],
    },
    handler: async (args) => {
      return await convexMutation(`${MCP}:mcpCreateFolder`, {
        userId: getServiceUserId(),
        name: args.name,
        color: args.color,
      });
    },
  },
  {
    name: "listFolders",
    description: "List all user folders.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await convexQuery(`${MCP}:mcpListFolders`, {
        userId: getServiceUserId(),
      });
    },
  },
  {
    name: "getFolderWithDocuments",
    description: "Get a folder and all documents inside it.",
    inputSchema: {
      type: "object",
      properties: {
        folderId: { type: "string", description: "Convex folder ID" },
      },
      required: ["folderId"],
    },
    handler: async (args) => {
      return await convexQuery(`${MCP}:mcpGetFolderWithDocuments`, {
        userId: getServiceUserId(),
        folderId: args.folderId,
      });
    },
  },
  {
    name: "addDocumentToFolder",
    description: "Add a document to a folder.",
    inputSchema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "Convex document ID" },
        folderId: { type: "string", description: "Convex folder ID" },
      },
      required: ["documentId", "folderId"],
    },
    handler: async (args) => {
      return await convexMutation(`${MCP}:mcpAddDocumentToFolder`, {
        userId: getServiceUserId(),
        documentId: args.documentId,
        folderId: args.folderId,
      });
    },
  },
  {
    name: "removeDocumentFromFolder",
    description: "Remove a document from a folder.",
    inputSchema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "Convex document ID" },
        folderId: { type: "string", description: "Convex folder ID" },
      },
      required: ["documentId", "folderId"],
    },
    handler: async (args) => {
      return await convexMutation(`${MCP}:mcpRemoveDocumentFromFolder`, {
        userId: getServiceUserId(),
        documentId: args.documentId,
        folderId: args.folderId,
      });
    },
  },

  // ── Spreadsheet Operations ────────────────────────────────────
  {
    name: "createSpreadsheet",
    description: "Create a new spreadsheet with a name.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Spreadsheet name" },
      },
      required: ["name"],
    },
    handler: async (args) => {
      return await convexMutation(`${MCP}:mcpCreateSpreadsheet`, {
        userId: getServiceUserId(),
        name: args.name,
      });
    },
  },
  {
    name: "listSpreadsheets",
    description: "List user spreadsheets sorted by last updated.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 25)" },
      },
    },
    handler: async (args) => {
      return await convexQuery(`${MCP}:mcpListSpreadsheets`, {
        userId: getServiceUserId(),
        limit: args.limit,
      });
    },
  },
  {
    name: "getSpreadsheetRange",
    description:
      "Get cells within a range from a spreadsheet (row/col coordinates).",
    inputSchema: {
      type: "object",
      properties: {
        sheetId: { type: "string", description: "Convex spreadsheet ID" },
        startRow: { type: "number", description: "Start row (0-based)" },
        endRow: { type: "number", description: "End row (inclusive)" },
        startCol: { type: "number", description: "Start column (0-based)" },
        endCol: { type: "number", description: "End column (inclusive)" },
      },
      required: ["sheetId", "startRow", "endRow", "startCol", "endCol"],
    },
    handler: async (args) => {
      return await convexQuery(`${MCP}:mcpGetSpreadsheetRange`, {
        sheetId: args.sheetId,
        startRow: args.startRow,
        endRow: args.endRow,
        startCol: args.startCol,
        endCol: args.endCol,
      });
    },
  },
  {
    name: "applySpreadsheetOperations",
    description:
      'Apply batch cell operations to a spreadsheet. Operations: setCell ({op:"setCell", row, col, value, type?}), clearCell ({op:"clearCell", row, col}).',
    inputSchema: {
      type: "object",
      properties: {
        sheetId: { type: "string", description: "Convex spreadsheet ID" },
        operations: {
          type: "array",
          description: "Array of cell operations",
          items: {
            type: "object",
            properties: {
              op: {
                type: "string",
                enum: ["setCell", "clearCell"],
              },
              row: { type: "number" },
              col: { type: "number" },
              value: { type: "string" },
              type: { type: "string" },
            },
            required: ["op"],
          },
        },
      },
      required: ["sheetId", "operations"],
    },
    handler: async (args) => {
      return await convexMutation(`${MCP}:mcpApplySpreadsheetOperations`, {
        userId: getServiceUserId(),
        sheetId: args.sheetId,
        operations: args.operations,
      });
    },
  },

  // ── File Operations ───────────────────────────────────────────
  {
    name: "listFiles",
    description:
      "List user files, optionally filtered by type (image, video, document, csv, pdf).",
    inputSchema: {
      type: "object",
      properties: {
        fileType: {
          type: "string",
          description: "Filter by file type (e.g. 'image', 'csv', 'pdf')",
        },
        limit: { type: "number", description: "Max results (default 50)" },
      },
    },
    handler: async (args) => {
      return await convexQuery(`${MCP}:mcpListFiles`, {
        userId: getServiceUserId(),
        fileType: args.fileType,
        limit: args.limit,
      });
    },
  },
];
