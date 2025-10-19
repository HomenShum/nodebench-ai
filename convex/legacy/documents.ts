import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { api, internal, components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { parseMarkdownToBlocks } from "../lib/markdown";
import { ragAdd } from "../agents/lib/ragOps";
import { ensureUserId } from "./common";

export const internalCreateDocument = internalMutation({
  args: { title: v.string(), content: v.string() },
  handler: async (ctx, { title, content }) => {
    const userId = await ensureUserId(ctx);

    const blocks = parseMarkdownToBlocks(content);

    const generateId = () =>
      (globalThis as any).crypto?.randomUUID?.() ?? "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

    const parseTextContent = (text: string): any[] => {
      if (!text) return [];
      const parts: any[] = [];
      let currentIndex = 0;
      const regex = /\*\*([^*]+)\*\*/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > currentIndex) {
          const plainText = text.substring(currentIndex, match.index);
          if (plainText) parts.push({ type: "text", text: plainText });
        }
        parts.push({ type: "text", marks: [{ type: "bold" }], text: match[1] });
        currentIndex = match.index + match[0].length;
      }
      if (currentIndex < text.length) {
        const remainingText = text.substring(currentIndex);
        if (remainingText) parts.push({ type: "text", text: remainingText });
      }
      if (parts.length === 0 && text) parts.push({ type: "text", text });
      return parts;
    };

    const convertedBlocks = blocks.map((block) => {
      let blockContent: any;
      switch (block.type) {
        case "heading":
          blockContent = {
            type: "heading",
            attrs: { textAlignment: "left", level: block.level || 1 },
            content: parseTextContent(block.text),
          };
          break;
        case "paragraph":
          blockContent = {
            type: "paragraph",
            attrs: { textAlignment: "left" },
            content: parseTextContent(block.text),
          };
          break;
        case "bulletListItem":
          blockContent = {
            type: "bulletListItem",
            attrs: { textAlignment: "left" },
            content: parseTextContent(block.text),
          };
          break;
        case "checkListItem":
          blockContent = {
            type: "checkListItem",
            attrs: { textAlignment: "left", checked: block.checked || false },
            content: parseTextContent(block.text),
          };
          break;
        case "codeBlock":
          blockContent = {
            type: "codeBlock",
            attrs: { language: block.lang || "text" },
            content: block.text ? [{ type: "text", text: block.text }] : [],
          };
          break;
        case "quote":
          blockContent = {
            type: "quote",
            attrs: { textAlignment: "left" },
            content: parseTextContent(block.text),
          };
          break;
        case "horizontalRule":
          blockContent = { type: "horizontalRule", attrs: {} };
          break;
        default:
          blockContent = {
            type: "paragraph",
            attrs: { textAlignment: "left" },
            content: parseTextContent(block.text),
          };
      }
      return {
        type: "blockContainer",
        attrs: { id: generateId(), textColor: "default", backgroundColor: "default" },
        content: [blockContent],
      };
    });

    const editorContent = JSON.stringify({
      type: "doc",
      content: [{ type: "blockGroup", content: convertedBlocks }],
    });

    const docId = await ctx.db.insert("documents", {
      title,
      content: editorContent,
      isPublic: false,
      createdBy: userId,
    });

    await ctx.scheduler.runAfter(0, internal.aiAgents.indexDocument, { documentId: docId, content: editorContent });
    return docId;
  },
});

export const indexDocument = internalAction(async (ctx, { documentId, content }: { documentId: Id<"documents">; content: string }) => {
  const doc = await ctx.runQuery(api.documents.getById, { documentId });
  if (!doc || !doc.createdBy) return;

  let textContent = doc.title + "\n\n";
  if (content) {
    try {
      const parsed = JSON.parse(content);
      const extractText = (node: any): string => {
        if (typeof node === "string") return node;
        if (node.text) return node.text;
        if (Array.isArray(node.content)) return node.content.map(extractText).join(" ");
        return "";
      };
      textContent += extractText(parsed);
    } catch (_e) {
      textContent += content;
    }
  }

  await ragAdd(ctx, {
    namespace: doc.createdBy,
    key: documentId,
    text: textContent,
    metadata: { documentId: doc._id, title: doc.title, createdAt: doc._creationTime },
  });
});

export const indexAllDocuments = internalAction({
  handler: async (ctx) => {
    const docs = await ctx.runQuery(api.documents.getSidebar);
    for (const doc of docs) {
      await ragAdd(ctx, {
        namespace: doc._id,
        text: doc.title + "\n\n" + (doc.content || ""),
      });
    }
  },
});

export const getThreadMetadata = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    return await ctx.runQuery(components.agent.threads.getThread, { threadId });
  },
});

export const pickBestDocWithLLM = internalAction({
  args: {
    ask: v.string(),
    candidates: v.array(v.object({ id: v.id("documents"), title: v.string() })),
    model: v.optional(v.string()),
    uiSummary: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  returns: v.object({ id: v.id("documents"), reason: v.optional(v.string()) }),
  handler: async (ctx, { ask, candidates, model, uiSummary, threadId }) => {
    const { GPT5_MINI } = await import("../agents/lib/openaiUtils");
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI();

    let ui = uiSummary;
    try {
      if (!ui && threadId) {
        const run: any = await ctx.runQuery((api as any).legacy.agentRuns.latestAgentRunForThread, { threadId });
        const runId = run?._id;
        if (runId) {
          const events: any[] = await ctx.runQuery((api as any).legacy.agentRuns.listAgentRunEvents, { runId });
          const ctxEvents = events.filter((e) => e.kind === "context");
          if (ctxEvents.length > 0) ui = String(ctxEvents[ctxEvents.length - 1]?.message ?? "");
        }
      }
    } catch {}

    let recent: Array<{ _id: string; title: string }> = [];
    try {
      const docs: any[] = await ctx.runQuery((api as any).documents.getRecentForMentions, { limit: 8 });
      recent = docs.map((d) => ({ _id: String(d._id), title: String(d.title || "Untitled") }));
    } catch {}

    const enumIds = candidates.map((c) => String(c.id));
    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "select_document",
          description: "Select the best candidate document for the ask.",
          parameters: {
            type: "object",
            properties: {
              id: { type: "string", enum: enumIds },
              reason: { type: "string" },
            },
            required: ["id"],
            additionalProperties: false,
          },
        },
      },
    ];

    const parts: string[] = [];
    parts.push(`Ask: ${ask}`);
    if (ui) parts.push(`\nUI Summary:\n${String(ui).slice(0, 1200)}`);
    if (recent.length > 0) parts.push(`\nRecent Docs:\n${recent.map((r) => `- ${r.title} (${r._id})`).join("\n")}`);
    parts.push(`\nCandidates:\n${candidates.map((c) => `- ${c.title} (${c.id})`).join("\n")}`);

    const messages: any[] = [
      {
        role: "system",
        content:
          "You are a routing assistant. Given a user ask, optional UI state, recent docs, and candidate documents, choose the single best matching candidate using the provided function. Only choose from the provided ids.",
      },
      { role: "user", content: parts.join("\n") },
    ];

    const res: any = await client.chat.completions.create({
      model: model || GPT5_MINI,
      messages,
      tools,
      tool_choice: { type: "function", function: { name: "select_document" } },
    });

    const tc = res?.choices?.[0]?.message?.tool_calls?.[0];
    if (tc?.function?.arguments) {
      try {
        const parsed = JSON.parse(tc.function.arguments);
        const id = parsed?.id;
        const reason = parsed?.reason;
        if (id && enumIds.includes(String(id))) {
          return { id, reason } as any;
        }
      } catch {}
    }
    return { id: candidates[0].id } as any;
  },
});
