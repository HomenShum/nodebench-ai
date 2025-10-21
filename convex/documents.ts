import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { extractMediaFromMessages } from "./lib/dossierHelpers";
import {
  type TipTapNode,
  type MediaAsset,
  convertMediaAssetsToTipTap,
  parseInlineMarks
} from "./lib/markdownToTipTap";

// =================================================================
// Editor content now defaults to EditorJS JSON for new documents.
// The legacy ProseMirror builder remains below for reference but is
// no longer used by the default create() path.
// =================================================================

/**
 * Extract plain text from rich text JSON structure (like Prosemirror document)
 * @param content Rich text JSON content
 * @returns Plain text string
 */
const extractPlainTextFromRichContent = (content: any): string => {
  if (!content) return "";

  const text = "";

  // Handle string content (already plain text)
  if (typeof content === "string") {
    // Try to parse as JSON if it looks like JSON
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(content);
        return extractPlainTextFromRichContent(parsed);
      } catch {
        return content; // Return as-is if not valid JSON
      }
    }
    return content;
  }

  // Handle JSON content structure
  if (typeof content === "object" && content !== null) {
    // Special case: EditorJS schema with blocks array
    const anyContent: any = content;
    if (Array.isArray(anyContent.blocks)) {
      const blocks: any[] = anyContent.blocks ?? [];
      const lines: string[] = [];
      for (const b of blocks) {
        try {
          const t = (b?.data?.text ?? "") as string;
          switch (b?.type) {
            case "header": {
              const level = Math.min(6, Number(b?.data?.level ?? 1) || 1);
              lines.push("# ".repeat(level) + t);
              break;
            }
            case "list": {
              const items: string[] = Array.isArray(b?.data?.items) ? b.data.items : [];
              const style = (b?.data?.style || "unordered") as string;
              items.forEach((it: string, idx: number) => {
                const prefix = style === "ordered" ? `${idx + 1}. ` : "- ";
                lines.push(prefix + (it ?? ""));
              });
              break;
            }
            case "quote":
              lines.push("> " + t);
              break;
            case "delimiter":
              lines.push("---");
              break;
            case "code":
              lines.push((b?.data?.code ?? "") as string);
              break;
            case "paragraph":
            default:
              lines.push(String(t).replace(/<br\s*\/?>(?=\s|$)/g, "\n"));
          }
        } catch {
          // ignore malformed block
        }
      }
      return lines.join("\n\n").trimEnd();
    }

    // Recursively extract text from content array
    if (Array.isArray(content)) {
      return content.map((item: any) => extractPlainTextFromRichContent(item)).join(" ");
    }

    // Handle text nodes
    if (content.type === "text" && content.text) {
      return content.text;
    }

    // Handle nodes with content array
    if (content.content && Array.isArray(content.content)) {
      return content.content.map((item: any) => extractPlainTextFromRichContent(item)).join(" ");
    }

    // Handle paragraph-like structures
    if (content.type && (content.type === "paragraph" || content.type === "blockContainer" || content.type === "blockGroup")) {
      if (content.content) {
        return extractPlainTextFromRichContent(content.content) + " ";
      }
    }
  }

  return text;
};

/**
 * Parse markdown text and convert to BlockNote-compatible rich text nodes with styles
 * @param text The markdown text to parse
 * @returns Array of text nodes with appropriate styles (bold, italic, code)
 */
const parseMarkdownText = (text: string): any[] => {
  if (!text) return [];

  const nodes: any[] = [];
  let currentIndex = 0;

  // Regex patterns for markdown formatting
  const patterns: Array<{ regex: RegExp; styles: Partial<Record<string, boolean>> }> = [
    { regex: /\*\*\*(.*?)\*\*\*/g, styles: { bold: true, italic: true } }, // ***bold italic***
    { regex: /\*\*(.*?)\*\*/g, styles: { bold: true } }, // **bold**
    { regex: /\*(.*?)\*/g, styles: { italic: true } }, // *italic*
    { regex: /`(.*?)`/g, styles: { code: true } }, // `code`
  ];

  // Find all matches and their positions
  const matches: { start: number; end: number; text: string; styles: Partial<Record<string, boolean>> }[] = [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1], // The text without the markdown syntax
        styles: pattern.styles,
      });
    }
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches (keep the first one)
  const nonOverlappingMatches: { start: number; end: number; text: string; styles: Partial<Record<string, boolean>> }[] = [];
  for (const match of matches) {
    const hasOverlap = nonOverlappingMatches.some(existing =>
      (match.start >= existing.start && match.start < existing.end) ||
      (match.end > existing.start && match.end <= existing.end)
    );
    if (!hasOverlap) {
      nonOverlappingMatches.push(match);
    }
  }

  // Build the text nodes
  for (const match of nonOverlappingMatches) {
    // Add plain text before the match
    if (match.start > currentIndex) {
      const plainText = text.slice(currentIndex, match.start);
      if (plainText) {
        nodes.push({ type: "text", text: plainText });
      }
    }

    // Add the formatted text
    nodes.push({
      type: "text",
      styles: match.styles,
      text: match.text
    });

    currentIndex = match.end;
  }

  // Add any remaining plain text
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);
    if (remainingText) {
      nodes.push({ type: "text", text: remainingText });
    }
  }

  // If no matches were found, return the original text as a single node
  if (nodes.length === 0 && text) {
    nodes.push({ type: "text", text });
  }

  return nodes;
};

/**
 * DEPRECATED: Build a minimal EditorJS JSON string from our simple array-of-blocks.
 *
 * ⚠️ DEPRECATION NOTICE (2025-10-20):
 * EditorJS format is being phased out in favor of TipTap/ProseMirror JSON.
 * New documents should use the unified generateAndCreateDocument action in fastAgentDocumentCreation.ts
 * which standardizes on TipTap JSON format.
 *
 * This function is kept for backward compatibility with existing documents only.
 * Do not use for new document creation.
 */
const buildEditorJSFromBlocks = (blocks: any[]): string => {
  type EJBlock = { type: string; data?: Record<string, any> };
  const out: EJBlock[] = [];

  if (!Array.isArray(blocks) || blocks.length === 0) {
    return JSON.stringify({
      time: Date.now(),
      blocks: [{ type: "paragraph", data: { text: "" } }],
      version: "2.31.0",
    });
  }

  const toText = (val: any) => String(val ?? "");

  // Group consecutive bullet and checklist items
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i] ?? {};
    if (b.type === "bulletListItem") {
      const items: string[] = [];
      while (i < blocks.length && blocks[i]?.type === "bulletListItem") {
        items.push(toText(blocks[i]?.text));
        i++;
      }
      out.push({ type: "list", data: { style: "unordered", items } });
      continue;
    }
    if (b.type === "checkListItem") {
      const items: Array<{ text: string; checked: boolean }> = [];
      while (i < blocks.length && blocks[i]?.type === "checkListItem") {
        items.push({ text: toText(blocks[i]?.text), checked: !!blocks[i]?.checked });
        i++;
      }
      out.push({ type: "checklist", data: { items } });
      continue;
    }

    switch (b.type) {
      case "heading":
        out.push({ type: "header", data: { text: toText(b.text), level: b.level || 1 } });
        break;
      case "quote":
        out.push({ type: "quote", data: { text: toText(b.text) } });
        break;
      case "codeBlock":
        out.push({ type: "code", data: { code: toText(b.text) } });
        break;
      case "horizontalRule":
        out.push({ type: "delimiter" });
        break;
      case "paragraph":
      default:
        out.push({ type: "paragraph", data: { text: toText(b.text).replace(/\n/g, "<br>") } });
        break;
    }
    i++;
  }

  return JSON.stringify({ time: Date.now(), blocks: out, version: "2.31.0" });
};

/**
 * Legacy: Build a wrapper-free ProseMirror JSON string from our simple array-of-blocks.
 * Kept for migrations/back-compat where needed.
 */
const _buildEditorJSON = (blocks: any[]): string => {
  type PMNode = { type: string; attrs?: Record<string, any>; content?: PMNode[] } & Record<string, any>;

  const makeParagraph = (text?: string): PMNode => ({
    type: "paragraph",
    attrs: { textAlignment: "left" },
    content: parseMarkdownText(text ?? ""),
  });

  const toText = (val: any) => String(val ?? "");

  // Extract a normalized children array from a block (either children or items)
  const getChildren = (b: any): any[] => {
    const kids = Array.isArray(b?.children)
      ? b.children
      : Array.isArray(b?.items)
      ? b.items
      : [];
    return Array.isArray(kids) ? kids : [];
  };

  // Build nested list nodes from a children array (only list nodes)
  const buildNestedLists = (children: any[]): PMNode[] => {
    const out: PMNode[] = [];
    let j = 0;
    while (j < children.length) {
      const c = children[j] ?? {};
      if (c.type === "bulletListItem") {
        const run: any[] = [];
        while (j < children.length && children[j]?.type === "bulletListItem") {
          run.push(children[j]);
          j++;
        }
        out.push({
          type: "bulletList",
          content: run.map(convertBulletListItem),
        });
        continue;
      }
      if (c.type === "checkListItem") {
        const run: any[] = [];
        while (j < children.length && children[j]?.type === "checkListItem") {
          run.push(children[j]);
          j++;
        }
        out.push({
          type: "taskList",
          content: run.map(convertTaskListItem),
        });
        continue;
      }
      // Non-list child: coerce to paragraph inside list item context
      out.push(makeParagraph(toText(c.text)));
      j++;
    }
    return out;
  };

  const convertBulletListItem = (b: any): PMNode => {
    const nested = buildNestedLists(getChildren(b));
    const content: PMNode[] = [makeParagraph(toText(b.text)), ...nested];
    return { type: "listItem", content };
  };

  const convertTaskListItem = (b: any): PMNode => {
    const nested = buildNestedLists(getChildren(b));
    const content: PMNode[] = [makeParagraph(toText(b.text)), ...nested];
    return { type: "taskItem", attrs: { checked: !!b.checked }, content };
  };

  const topLevel: PMNode[] = [];

  if (!Array.isArray(blocks) || blocks.length === 0) {
    return JSON.stringify({ type: "doc", content: [makeParagraph()] });
  }

  // Helper to flush a run of list items (top-level)
  const flushBulletRun = (runBlocks: any[]) => {
    if (runBlocks.length === 0) return;
    topLevel.push({
      type: "bulletList",
      content: runBlocks.map(convertBulletListItem),
    });
  };
  const flushTaskRun = (runBlocks: any[]) => {
    if (runBlocks.length === 0) return;
    topLevel.push({
      type: "taskList",
      content: runBlocks.map(convertTaskListItem),
    });
  };

  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i] ?? {};
    // Bullet list run
    if (b.type === "bulletListItem") {
      const run: any[] = [];
      while (i < blocks.length && blocks[i]?.type === "bulletListItem") {
        run.push(blocks[i]);
        i++;
      }
      flushBulletRun(run);
      continue;
    }
    // Task list run
    if (b.type === "checkListItem") {
      const run: any[] = [];
      while (i < blocks.length && blocks[i]?.type === "checkListItem") {
        run.push(blocks[i]);
        i++;
      }
      flushTaskRun(run);
      continue;
    }

    // Single block handling
    switch (b.type) {
      case "heading": {
        topLevel.push({
          type: "heading",
          attrs: { textAlignment: "left", level: b.level || 1 },
          content: parseMarkdownText(String(b.text ?? "")),
        });
        break;
      }
      case "paragraph": {
        topLevel.push(makeParagraph(String(b.text ?? "")));
        break;
      }
      case "quote": {
        topLevel.push({
          type: "blockquote",
          attrs: { textAlignment: "left" },
          content: parseMarkdownText(String(b.text ?? "")),
        });
        break;
      }
      case "codeBlock": {
        topLevel.push({
          type: "codeBlock",
          attrs: { language: b.lang || "text" },
          content: b.text ? [{ type: "text", text: String(b.text) }] : [],
        });
        break;
      }
      case "horizontalRule": {
        topLevel.push({ type: "horizontalRule", attrs: {} });
        break;
      }
      default: {
        // Fallback to paragraph
        topLevel.push(makeParagraph(String(b.text ?? "")));
      }
    }
    i++;
  }

  // Ensure non-empty content
  if (topLevel.length === 0) {
    topLevel.push(makeParagraph());
  }

  const doc = { type: "doc", content: topLevel };
  return JSON.stringify(doc);
};


/**
 * DEPRECATED: Create a new document with EditorJS content.
 *
 * ⚠️ DEPRECATION NOTICE (2025-10-20):
 * This mutation uses EditorJS format which is being phased out.
 * For agent-driven document creation, use generateAndCreateDocument action in fastAgentDocumentCreation.ts
 * which standardizes on TipTap JSON format.
 *
 * This mutation is kept for backward compatibility with existing UI flows only.
 */
export const create = mutation({
  args: {
    title: v.string(),
    parentId: v.optional(v.id("documents")),
    // The content is now an array of objects, not a string.
    content: v.optional(v.array(v.any())),
    // Optional: associate this doc with a specific day for agenda view (local midnight ms)
    agendaDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Support evaluation mode where userId is passed in ctx.evaluationUserId
    let userId = (ctx as any).evaluationUserId;
    if (!userId) {
      userId = await getAuthUserId(ctx);
    }
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // NOTE: Still using EditorJS for backward compatibility
    // New documents should use TipTap format via generateAndCreateDocument
    const initialContent = buildEditorJSFromBlocks(args.content || []);

    const document = await ctx.db.insert("documents", {
      title: args.title,
      parentId: args.parentId,
      createdBy: userId,
      isPublic: false,
      isArchived: false,
      content: initialContent,
      agendaDate: args.agendaDate,
      lastModified: Date.now(),
    });

    return document;
  },
});

// Create a document with a prebuilt content string (e.g., EditorJS JSON)
export const createWithContent = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    parentId: v.optional(v.id("documents")),
    agendaDate: v.optional(v.number()),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.insert("documents", {
      title: args.title,
      parentId: args.parentId,
      createdBy: userId,
      isPublic: false,
      isArchived: false,
      content: args.content,
      agendaDate: args.agendaDate,
      lastModified: Date.now(),
    } as any);

    return document as Id<"documents">;
  },
});

// Notes scheduled on a calendar day (documents with agendaDate in range)
export const listNotesInRange = query({
  args: { start: v.number(), end: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("documents")
      .withIndex("by_user_agendaDate", (q: any) =>
        q.eq("createdBy", userId as any).gte("agendaDate", args.start).lte("agendaDate", args.end)
      )
      .filter((q: any) => q.neq(q.field("isArchived"), true))
      .order("asc")
      .collect();
    return rows;
  },
});

// List documents filtered by tag
export const listDocumentsByTag = query({
  args: {
    tag: v.string(),
    start: v.optional(v.number()),
    end: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Find all tagRefs for this tag name
    const tagRecords = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", args.tag))
      .collect();

    if (tagRecords.length === 0) return [];

    // Get all tagRefs pointing to documents with this tag
    const allTagRefs: any[] = [];
    for (const tag of tagRecords) {
      const refs = await ctx.db
        .query("tagRefs")
        .withIndex("by_tag", (q) => q.eq("tagId", tag._id))
        .filter((q) => q.eq(q.field("targetType"), "documents"))
        .collect();
      allTagRefs.push(...refs);
    }

    // Get unique document IDs
    const docIds = new Set(allTagRefs.map(ref => ref.targetId));

    // Fetch documents
    const documents: any[] = [];
    for (const docIdStr of docIds) {
      try {
        const doc = await ctx.db.get(docIdStr as Id<"documents">);
        if (!doc) continue;
        if ((doc as any).isArchived) continue;
        if ((doc as any).createdBy !== userId) continue;
        documents.push(doc);
      } catch {
        // Skip invalid IDs
        continue;
      }
    }

    return documents;
  },
});

// Tiny resolvers for document titles (for references UI)
export const getTitle = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;
    if (!doc.isPublic && doc.createdBy !== userId) return null;
    return { title: doc.title } as { title: string };
  },
});

export const getTitles = query({
  args: { ids: v.array(v.id("documents")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const out: Array<{ _id: Id<"documents">; title: string }> = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id);
      if (doc && (doc.isPublic || doc.createdBy === userId)) {
        out.push({ _id: id, title: doc.title });
      }
    }
    return out;
  },
});

// ... the rest of your file remains exactly the same ...

export const getSidebar = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc")
      .collect();

    // Sort by lastModified if available, otherwise by _creationTime
    return documents.sort((a, b) => {
      const aTime = (a as any).lastModified || a._creationTime;
      const bTime = (b as any).lastModified || b._creationTime;
      return bTime - aTime; // descending order (newest first)
    });
  },
});

/**
 * Find a document by title across user-owned and public documents.
 * Tries exact (case-insensitive) match first, then substring match.
 * Returns the first matching document's id or null.
 */
export const findByTitleAny = query({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const userId = await getAuthUserId(ctx);
    const lower = title.toLowerCase();

    // 1) Search user-owned documents
    const userDocs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("createdBy", userId as any))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc")
      .collect();

    let found = userDocs.find((d) => (d.title || "").toLowerCase() === lower);
    if (!found) found = userDocs.find((d) => (d.title || "").toLowerCase().includes(lower));
    if (found) return found._id;

    // 2) Search public documents
    const publicDocs = await ctx.db
      .query("documents")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc")
      .collect();

    found = publicDocs.find((d) => (d.title || "").toLowerCase() === lower);
    if (!found) found = publicDocs.find((d) => (d.title || "").toLowerCase().includes(lower));
    return found ? found._id : null;
  },
});

export const getSidebarWithPreviews = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc")
      .collect();

    // Add truncated content preview and sort by lastModified
    const documentsWithPreviews = documents.map(doc => {
      let plainText = "";
      if (doc.content && doc.content.trim()) {
        plainText = extractPlainTextFromRichContent(doc.content);
      }

      return {
        ...doc,
        contentPreview: plainText && plainText.trim()
          ? plainText.substring(0, 150).trim()
          : null
      };
    });

    return documentsWithPreviews.sort((a, b) => {
      const aTime = (a as any).lastModified || a._creationTime;
      const bTime = (b as any).lastModified || b._creationTime;
      return bTime - aTime; // descending order (newest first)
    });
  },
});

export const getSidebarWithOptions = query({
  args: {
    sortBy: v.optional(v.union(v.literal("updated"), v.literal("created"), v.literal("title"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    filterBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();

    // Apply title filter if provided
    if (args.filterBy) {
      const filter = args.filterBy.toLowerCase();
      documents = documents.filter(doc =>
        doc.title.toLowerCase().includes(filter)
      );
    }

    // Apply sorting
    const sortBy = args.sortBy || "updated";
    const sortOrder = args.sortOrder || "desc";

    documents.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortBy) {
        case "created":
          aValue = a._creationTime;
          bValue = b._creationTime;
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "updated":
        default:
          aValue = (a as any).lastModified || a._creationTime;
          bValue = (b as any).lastModified || b._creationTime;
          break;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
      }
    });

    return documents;
  },
});

export const getById = query({
  args: {
    documentId: v.id("documents"),
    userId: v.optional(v.union(v.id("users"), v.string())), // Optional for evaluation/testing - accepts ID or string
  },
  handler: async (ctx, args) => {
    // Use provided userId or fall back to authenticated user
    const userId = args.userId || await getAuthUserId(ctx);
    const document = await ctx.db.get(args.documentId);
    if (!document) return null;
    if (!document.isPublic && document.createdBy !== userId) return null;
    return document;
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    coverImage: v.optional(v.id("_storage")),
    icon: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    allowPublicEdit: v.optional(v.boolean()),
    isFavorite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const { id, ...rest } = args;
    const existingDocument = await ctx.db.get(id);
    if (!existingDocument) throw new Error("Not found");
    if (existingDocument.createdBy !== userId) throw new Error("Unauthorized");

    // Add lastModified timestamp to track when document was updated
    const updateData = {
      ...rest,
      lastModified: Date.now()
    };

    return await ctx.db.patch(id, updateData);
  },
});

export const removeIcon = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existingDocument = await ctx.db.get(args.id);
    if (!existingDocument) throw new Error("Not found");
    if (existingDocument.createdBy !== userId) throw new Error("Unauthorized");
    return await ctx.db.patch(args.id, { icon: undefined });
  },
});

export const setDocumentType = mutation({
  args: { id: v.id("documents"), documentType: v.union(v.literal("text"), v.literal("file"), v.literal("timeline")) },
  returns: v.null(),
  handler: async (ctx, { id, documentType }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Not found");
    if (existing.createdBy !== userId) throw new Error("Unauthorized");
    await ctx.db.patch(id, { documentType } as any);
    return null;
  },
});


export const removeCoverImage = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existingDocument = await ctx.db.get(args.id);
    if (!existingDocument) throw new Error("Not found");
    if (existingDocument.createdBy !== userId) throw new Error("Unauthorized");
    return await ctx.db.patch(args.id, { coverImage: undefined });
  },
});

export const archive = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existingDocument = await ctx.db.get(args.id);
    if (!existingDocument) throw new Error("Not found");
    if (existingDocument.createdBy !== userId) throw new Error("Unauthorized");

    const recursiveArchive = async (documentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_parent", (q) => q.eq("parentId", documentId))
        .collect();
      for (const child of children) {
        await ctx.db.patch(child._id, { isArchived: true });
        await recursiveArchive(child._id);
      }
    };
    const document = await ctx.db.patch(args.id, { isArchived: true });
    await recursiveArchive(args.id);
    return document;
  },
});

export const getTrash = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("documents")
      .withIndex("by_user_archived", (q) => q.eq("createdBy", userId).eq("isArchived", true))
      .collect();
  },
});

export const restore = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existingDocument = await ctx.db.get(args.id);
    if (!existingDocument) throw new Error("Not found");
    if (existingDocument.createdBy !== userId) throw new Error("Unauthorized");

    const recursiveRestore = async (documentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_parent", (q) => q.eq("parentId", documentId))
        .collect();
      for (const child of children) {
        await ctx.db.patch(child._id, { isArchived: false });
        await recursiveRestore(child._id);
      }
    };

    const options: Partial<typeof existingDocument> = { isArchived: false };
    if (existingDocument.parentId) {
      const parent = await ctx.db.get(existingDocument.parentId);
      if (parent?.isArchived) options.parentId = undefined;
    }
    const document = await ctx.db.patch(args.id, options);
    await recursiveRestore(args.id);
    return document;
  },
});

export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existingDocument = await ctx.db.get(args.id);
    if (!existingDocument) throw new Error("Not found");
    if (existingDocument.createdBy !== userId) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
  },
});

// Paginated node loading for virtualization (performance optimization)
export const getNodesPaginated = query({
  args: {
    documentId: v.id("documents"),
    startOrder: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, { documentId, startOrder, limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check document access
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    if (!document.isPublic && document.createdBy !== userId) {
      throw new Error("Unauthorized");
    }

    // Get nodes in the specified range for virtualization
    const nodes = await ctx.db
      .query("nodes")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .filter((q) => q.gte(q.field("order"), startOrder))
      .order("asc")
      .take(Math.min(limit, 200)); // Cap at 200 nodes per request

    return nodes;
  },
});

export const clearTrash = mutation({
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        const trash = await ctx.db
            .query("documents")
            .withIndex("by_user_archived", (q) =>
                q.eq("createdBy", userId).eq("isArchived", true)
            )
            .collect();
        for (const doc of trash) {
            await ctx.db.delete(doc._id);
        }
        return true;
    },
});

export const getSearch = query({
  args: {
    query: v.string(),
    userId: v.optional(v.union(v.id("users"), v.string())), // Optional for evaluation/testing - accepts ID or string
  },
  handler: async (ctx, args) => {
    // Use provided userId or fall back to authenticated user
    const userId = args.userId || await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("createdBy", userId as any).eq("isArchived", false)
      )
      .take(50);
  },
});

// Recent documents for default @-mention suggestions
export const getRecentForMentions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();

    // Sort by lastModified if available, otherwise by creation time (newest first)
    docs.sort((a, b) => {
      const aTime = (a as any).lastModified || a._creationTime;
      const bTime = (b as any).lastModified || b._creationTime;
      return bTime - aTime;
    });

    const limit = Math.max(1, Math.min(args.limit ?? 8, 50));
    return docs.slice(0, limit);
  },
});

// Single-document preview for mention hover tooltips
export const getPreviewById = query({
  args: { documentId: v.id("documents"), maxLen: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;
    if (!doc.isPublic && doc.createdBy !== userId) return null;

    let plainText = "";
    if (doc.content && doc.content.trim()) {
      plainText = extractPlainTextFromRichContent(doc.content);
    }

    const maxLen = Math.max(50, Math.min(args.maxLen ?? 180, 500));
    const contentPreview = plainText && plainText.trim()
      ? plainText.substring(0, maxLen).trim()
      : null;

    return {
      _id: doc._id,
      title: doc.title,
      icon: (doc as any).icon,
      isArchived: doc.isArchived,
      lastModified: (doc as any).lastModified || doc._creationTime,
      contentPreview,
    } as any;
  },
});

export const getPublic = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();
  },
});

// Debug query to check document states
export const debugDocuments = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const allUserDocs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .collect();

    return allUserDocs.map(doc => ({
      id: doc._id,
      title: doc.title,
      isPublic: doc.isPublic,
      isArchived: doc.isArchived,
      createdBy: doc.createdBy,
      lastModified: (doc as any).lastModified,
      _creationTime: doc._creationTime
    }));
  },
});

// Get user information by ID for displaying editor names
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Track individual node edits for hover information
export const trackNodeEdit = mutation({
  args: {
    documentId: v.id("documents"),
    nodeId: v.string(), // BlockNote node ID
    content: v.string(), // Node content for identification
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user can edit this document
    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");

    const isOwner = document.createdBy === userId;
    const isPublicDocument = document.isPublic === true;
    const isArchived = document.isArchived === true;

    if (!isOwner && (!isPublicDocument || isArchived)) {
      throw new Error("Unauthorized");
    }

    // Store or update node edit information in a tracking table
    // For now, we'll use document metadata to track the most recently edited nodes
    const now = Date.now();
    const nodeEditKey = `node_${args.nodeId}`;

    // Store edit info in document metadata (simple approach)
    // In a more complex system, this could be a separate table
    await ctx.db.patch(args.documentId, {
      lastModified: now,
      lastEditedBy: userId,
      [`${nodeEditKey}_editedBy`]: userId,
      [`${nodeEditKey}_editedAt`]: now,
      [`${nodeEditKey}_content`]: args.content.slice(0, 100), // First 100 chars for identification
    } as any);

    return { success: true, timestamp: now };
  },
});

// Get node edit information for hover display
export const getNodeEditInfo = query({
  args: {
    documentId: v.id("documents"),
    nodeId: v.string(),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) return null;

    const nodeEditKey = `node_${args.nodeId}`;
    const editedBy = (document as any)[`${nodeEditKey}_editedBy`];
    const editedAt = (document as any)[`${nodeEditKey}_editedAt`];
    const content = (document as any)[`${nodeEditKey}_content`];

    if (!editedBy || !editedAt) return null;

    return {
      editedBy,
      editedAt,
      content,
    };
  },
});

// Toggle favorite status of a document
export const toggleFavorite = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    if (document.createdBy !== userId) {
      throw new Error("Not authorized to modify this document");
    }

    await ctx.db.patch(args.id, {
      isFavorite: !document.isFavorite,
    });

    return { success: true, isFavorite: !document.isFavorite };
  },
});

/**
 * Get all linked media assets for a dossier
 */
export const getLinkedAssets = query({
  args: {
    dossierId: v.id("documents"),
  },
  returns: v.array(v.object({
    _id: v.id("documents"),
    _creationTime: v.number(),
    title: v.string(),
    documentType: v.optional(v.union(v.literal("text"), v.literal("file"), v.literal("timeline"), v.literal("dossier"))),
    fileType: v.optional(v.string()),
    dossierType: v.optional(v.union(v.literal("primary"), v.literal("media-asset"), v.literal("quick-notes"))),
    parentDossierId: v.optional(v.id("documents")),
    assetMetadata: v.optional(v.object({
      assetType: v.union(
        v.literal("image"),
        v.literal("video"),
        v.literal("youtube"),
        v.literal("sec-document"),
        v.literal("pdf"),
        v.literal("news"),
        v.literal("file")
      ),
      sourceUrl: v.string(),
      thumbnailUrl: v.optional(v.string()),
      extractedAt: v.number(),
      toolName: v.optional(v.string()),
      metadata: v.optional(v.any()),
    })),
  })),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get the dossier to verify access
    const dossier = await ctx.db.get(args.dossierId);
    if (!dossier) {
      return [];
    }

    // Check access (user must be creator or document must be public)
    if (dossier.createdBy !== userId && !dossier.isPublic) {
      return [];
    }

    // Get all linked assets
    const assets = await ctx.db
      .query("documents")
      .withIndex("by_parent_dossier", (q) => q.eq("parentDossierId", args.dossierId))
      .collect();

    return assets.map(asset => ({
      _id: asset._id,
      _creationTime: asset._creationTime,
      title: asset.title,
      documentType: asset.documentType,
      fileType: asset.fileType,
      dossierType: asset.dossierType,
      parentDossierId: asset.parentDossierId,
      assetMetadata: asset.assetMetadata,
    }));
  },
});

/**
 * Get or create a Quick Notes document linked to a dossier
 * This prevents ProseMirror from overwriting the dossier's EditorJS content
 */
export const getOrCreateQuickNotes = mutation({
  args: {
    dossierId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const dossier = await ctx.db.get(args.dossierId);
    if (!dossier) {
      throw new Error("Dossier not found");
    }

    if (dossier.createdBy !== userId) {
      throw new Error("Not authorized to manage quick notes for this dossier");
    }

    const existing = await ctx.db
      .query("documents")
      .withIndex("by_parent_dossier", (q) => q.eq("parentDossierId", args.dossierId))
      .filter((q) => q.eq(q.field("dossierType"), "quick-notes"))
      .first();

    if (existing) {
      return existing;
    }

    // Create new Quick Notes document
    const quickNotesId = await ctx.db.insert("documents", {
      title: "Quick Notes",
      createdBy: userId,
      isPublic: false,
      isArchived: false,
      isFavorite: false,
      documentType: "text", // Use text type for ProseMirror
      dossierType: "quick-notes",
      parentDossierId: args.dossierId,
    });

    return await ctx.db.get(quickNotesId);
  },
});

/**
 * Migration: Update old dossier documents to use documentType: "dossier"
 * This fixes documents that were created before we added the custom DossierViewer
 */
export const migrateDossiersToNewType = mutation({
  args: {},
  returns: v.object({
    updated: v.number(),
  }),
  handler: async (ctx, _args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Find all documents with dossierType: "primary" but documentType: "text"
    const oldDossiers = await ctx.db
      .query("documents")
      .filter((q) =>
        q.and(
          q.eq(q.field("createdBy"), userId),
          q.eq(q.field("dossierType"), "primary"),
          q.or(
            q.eq(q.field("documentType"), "text"),
            q.eq(q.field("documentType"), undefined)
          )
        )
      )
      .collect();

    // Update them to documentType: "dossier"
    for (const doc of oldDossiers) {
      await ctx.db.patch(doc._id, { documentType: "dossier" });
    }

    return { updated: oldDossiers.length };
  },
});

/**
 * Save a chat session as a Research Dossier with linked media assets
 */
export const saveChatSessionToDossier = mutation({
  args: {
    threadId: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.object({
    dossierId: v.id("documents"),
    messageCount: v.number(),
    mediaCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    console.log("saveChatSessionToDossier called with threadId:", args.threadId);

    // Fetch all messages from the thread using Agent component
    // Use listMessagesByThreadId to get full message structure with parts
    const allMessages: any[] = [];
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const result: any = await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
        threadId: args.threadId,
        order: "asc",
        paginationOpts: {
          numItems: 100,
          cursor: cursor,
        },
      });

      console.log(`Fetched ${result.page.length} messages, isDone: ${result.isDone}`);
      allMessages.push(...result.page);
      hasMore = !result.isDone;
      cursor = result.continueCursor || null;
    }

    console.log(`Total messages fetched: ${allMessages.length}`);

    if (allMessages.length === 0) {
      throw new Error("No messages found in thread");
    }

    // Log first message to see structure
    if (allMessages.length > 0) {
      console.log("First message structure:", JSON.stringify(allMessages[0], null, 2));

      // Check for messages with tool information
      const messagesWithTools = allMessages.filter((m: any) => m.tool || m.sources?.length > 0);
      console.log(`Messages with tool info: ${messagesWithTools.length}`);
      if (messagesWithTools.length > 0) {
        console.log("First tool message:", JSON.stringify(messagesWithTools[0], null, 2));
      }

      // Look for tool-result messages
      const toolResultMessages = allMessages.filter((m: any) => {
        if (m.message?.content && Array.isArray(m.message.content)) {
          return m.message.content.some((c: any) => c.type === "tool-result");
        }
        return false;
      });
      console.log(`Messages with tool-result: ${toolResultMessages.length}`);
      if (toolResultMessages.length > 0) {
        console.log("First tool-result message:", JSON.stringify(toolResultMessages[0], null, 2));
      }
    }

    // Extract media assets from tool outputs
    const extractedAssets = extractMediaFromMessages(allMessages);
    console.log(`Extracted ${extractedAssets.length} media assets`);

    // Build TipTap transcript nodes
    const transcriptNodes: TipTapNode[] = [];

    // Add header
    transcriptNodes.push({
      type: "heading",
      attrs: { level: 1, textAlignment: "left" },
      content: [{ type: "text", text: args.title || "Chat Session" }],
    });

    // Add metadata
    const messageCount = allMessages.length;
    const assetCount = extractedAssets.length;
    const createdAt = new Date().toLocaleString();

    transcriptNodes.push({
      type: "paragraph",
      attrs: { textAlignment: "left" },
      content: [
        {
          type: "text",
          text: `Saved on ${createdAt} • ${messageCount} messages • ${assetCount} media assets`,
        },
      ],
    });

    // Add conversation transcript
    for (const message of allMessages) {
      const role = message.role === "user" ? "👤 User" : "🤖 Assistant";
      const timestamp = new Date(message._creationTime).toLocaleTimeString();

      // Add message header
      transcriptNodes.push({
        type: "heading",
        attrs: { level: 3, textAlignment: "left" },
        content: [{ type: "text", text: `${role} (${timestamp})` }],
      });

      // Add message text (preserve markdown formatting via parseInlineMarks)
      if (message.text) {
        console.log(`Message text length: ${message.text.length}`);
        if (message.text.trim()) {
          transcriptNodes.push({
            type: "paragraph",
            attrs: { textAlignment: "left" },
            content: parseInlineMarks(message.text),
          });
        } else {
          console.log("Warning: Message text is empty");
        }
      } else {
        console.log("Warning: Message has no text property");
      }

      // Add tool calls if present
      if (message.parts && Array.isArray(message.parts)) {
        const toolParts = message.parts.filter((p: any) => p.type === "tool-result");
        if (toolParts.length > 0) {
          transcriptNodes.push({
            type: "paragraph",
            attrs: { textAlignment: "left" },
            content: [
              {
                type: "text",
                text: `Tools used: ${toolParts.map((p: any) => p.toolName).join(", ")}`,
                marks: [{ type: "italic" }],
              },
            ],
          });
        }
      }
    }

    console.log(`Total transcript nodes created: ${transcriptNodes.length}`);

    // Add media section if there are any assets
    // Convert extracted assets to MediaAsset format and use helper function
    if (extractedAssets.length > 0) {
      const mediaAssets: MediaAsset[] = extractedAssets.map((asset) => ({
        type: asset.type as any,
        url: asset.url,
        title: asset.title,
        thumbnail: asset.thumbnail,
        metadata: asset.metadata,
      }));

      const mediaNodes = convertMediaAssetsToTipTap(mediaAssets);
      transcriptNodes.push(...mediaNodes);
    }

    // Create TipTap document
    const tipTapDocument = {
      type: "doc",
      content: transcriptNodes,
    };

    console.log(`Creating dossier with ${transcriptNodes.length} TipTap nodes`);
    console.log(`First 3 nodes:`, JSON.stringify(transcriptNodes.slice(0, 3), null, 2));
    console.log(`Content size: ${JSON.stringify(tipTapDocument).length} bytes`);

    // Create single dossier document with everything
    const dossierId = await ctx.db.insert("documents", {
      title: args.title || `Chat Session - ${new Date().toLocaleDateString()}`,
      content: JSON.stringify(tipTapDocument), // TipTap JSON format
      createdBy: userId,
      isPublic: false,
      isArchived: false,
      isFavorite: false,
      documentType: "dossier", // Use dossier type for custom viewer
      dossierType: "primary",
      chatThreadId: args.threadId,
    });

    console.log(`Created dossier document with ID: ${dossierId}`);

    return {
      dossierId,
      messageCount: allMessages.length,
      mediaCount: extractedAssets.length,
    };
  },
});
