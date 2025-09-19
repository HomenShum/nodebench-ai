/**
 * aiAgents.ts
 *
 * Completely refactored and reorganized while preserving every exported function and its public API.
 *
 * Goals of this refactor:
 * - Centralize helpers (auth, logging, AI calls, document resolution, storage, CSV parsing)
 * - Reduce duplication across tools and actions
 * - Improve type-safety and defensive checks
 * - Add structured, readable sections with exhaustive comments
 * - Keep all exports, argument schemas, and return shapes identical to the original file
 */

import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { Agent, createTool, type MessageDoc } from "@convex-dev/agent";
import { api, internal, components } from "./_generated/api";
import { type Id, type Doc } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { openai } from "@ai-sdk/openai";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { agentToolsOpenAI } from "./agents/agentTools";
import { getThreadSummaryDocId, firstSidebarDocId, resolveDocumentIdByTitle, resolveDocumentId, storeTextAsFile, findTopDocumentsByTitle } from "./agents/lib/docOps";
import { scoreLeads, generateMessages } from "./agents/lib/csvWorkflow";
import { createBlockJson, detectNodeType, extractPlainText, parseMarkdownToBlocks } from "./lib/markdown";

import { ragSearch, ragAdd } from "./agents/lib/ragOps";

import { getOpenAI, safeChatCompletion, GPT5_NANO, GPT5_MINI } from "./agents/lib/openaiUtils";
import { addThinkingStep, addToolCall, addAdaptation } from "./agents/lib/agentThinking";

import { gatherContext, performWebSearch } from "./agents/lib/agentContext";

import { generateKnowledgeResponse, enhanceResponse } from "./agents/lib/generation";

import { createDocumentFromMessage, workWithDocument } from "./agents/lib/docEdit";





import { analyzeUserIntent, planToolUsage } from "./agents/lib/intent";
import { runPlannedStep, executeStructuredPlan } from "./agents/lib/planningExec";
import { tryGenerateStructuredPlan, tryGeneratePmOpsWithStructuredOutputs } from "./agents/lib/planningGen";


import type { AgentState, AgentResponse } from "./agents/lib/types";

/* ========================================================================== *
 *                               TYPE ALIASES
 * ========================================================================== */


/* ========================================================================== *
 *                             RUNTIME CONSTANTS
 * ========================================================================== */

const TEXT_EMBED_MODEL = "text-embedding-3-small";


/* ========================================================================== *
 *                              LOGGING HELPERS
 * ========================================================================== */

const log = {
  info: (...a: any[]) => console.log("[aiAgents]", ...a),
  warn: (...a: any[]) => console.warn("[aiAgents]", ...a),
  error: (...a: any[]) => console.error("[aiAgents]", ...a),
  debug: (...a: any[]) => console.debug("[aiAgents]", ...a),
};

/* ========================================================================== *
 *                           AUTH / CONTEXT HELPERS
 * ========================================================================== */

async function ensureUserId(ctx: any): Promise<Id<"users">> {
  const uid = await getAuthUserId(ctx);
  if (!uid) throw new Error("Not authenticated");
  return uid as Id<"users">;
}




const looksLikeNodeId = (id?: string) => !!id && id.startsWith("k") && id.length > 20;

/* ========================================================================== *
 *                           OPENAI / GEMINI HELPERS
 * ========================================================================== */


/* ========================================================================== *
 *                              STORAGE HELPERS
 * ========================================================================== */


async function fetchFileTextByFileId(ctx: any, fileId: Id<"files">): Promise<string> {
  const file = await ctx.runQuery(internal.files.getFile, { fileId });
  if (!file) throw new Error("File not found");
  const userId = await ensureUserId(ctx);
  if (file.userId !== userId) throw new Error("Not authorized to process this file");
  const isCsv = file.mimeType?.includes("csv") || file.fileName.toLowerCase().endsWith(".csv");
  if (!isCsv) throw new Error("Selected file is not a CSV");
  const fileUrl = await ctx.storage.getUrl(file.storageId);
  if (!fileUrl) throw new Error("File not accessible");
  const resp = await fetch(fileUrl);
  if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.statusText}`);
  return await resp.text();
}

/* ========================================================================== *
 *                           CSV / DATA HELPERS
 * ========================================================================== */

/** Robust CSV parsing with quotes and embedded commas */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

/** Lightweight CSV → { header, rows } */
function parseCsv(text: string): { header: string[]; rows: Array<Record<string, string>> } {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { header: [], rows: [] };
  const header = splitCsvLine(lines[0]);
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => (row[h] = cols[idx] ?? ""));
    rows.push(row);
  }
  return { header, rows };
}

/* ========================================================================== *
 *                           DETERMINISTIC FALLBACK
 * ========================================================================== */

function deterministicFallbackSummary(ctxInfo: {
  message: string;
  model: string;
  selectedDocumentId?: Id<"documents"> | null;
  mcpServerId?: Id<"mcpServers"> | null;
}) {
  const parts: string[] = [];
  parts.push("Assistant fallback response (deterministic).");
  parts.push(`Model: ${ctxInfo.model}`);
  if (ctxInfo.selectedDocumentId) parts.push(`Selected doc: ${String(ctxInfo.selectedDocumentId)}`);
  parts.push(ctxInfo.mcpServerId ? "MCP: configured" : "MCP: none");
  parts.push("Input understood as: " + ctxInfo.message.slice(0, 240));
  parts.push(
    "Try again shortly or adjust your request. I can create or edit documents, search via MCP tools, and summarize selections.",
  );
  return parts.join("\n");
}

/* ========================================================================== *
 *                        AAPL MODEL (OPENAI / FALLBACK)
 * ========================================================================== */

async function generateAaplCsvAndMemoViaOpenAI(): Promise<{ csv: string; memo: string }> {
  const OpenAI = await getOpenAI();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const system = `You are a finance analyst. Produce a simple, consistent 5-year forward model for Apple (AAPL).
Respond ONLY with a compact JSON object of the form:
{
  "csv": "CSV_CONTENT",
  "memo": "MARKDOWN_MEMO"
}

CSV requirements:
- Comma-separated with a single header row, then 5 yearly rows.
- Columns: Year,Revenue($B),YoY%,GrossMargin%,OperatingMargin%,NetIncome($B),DilutedShares(B),EPS,FCF($B).
- Years should be the next 5 fiscal years from current year.
- Make reasonable, clearly rounded numbers.

Memo requirements:
- Write a concise markdown memo (<= 400 words) summarizing assumptions, growth drivers, margins, FCF, and risks.
- Use markdown headings, lists, and brief bullet points.
- Do not include the CSV in the memo.`;

  const prompt = "Create the 5-year AAPL model as specified. Output valid JSON only.";
  const content = await safeChatCompletion(client, {
    model: GPT5_NANO,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse model output as JSON");
  }
  if (typeof parsed?.csv === "string" && typeof parsed?.memo === "string") {
    return { csv: parsed.csv, memo: parsed.memo };
  }
  throw new Error("Invalid JSON shape from model");
}

function generateAaplCsvAndMemoFallback(): { csv: string; memo: string } {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);
  const rows = years.map((y, idx) => {
    const rev = 400 + idx * 20; // $B
    const yoy = idx === 0 ? 6 : 5 + (idx % 3);
    const gm = 44 - (idx % 2);
    const om = 29 + (idx % 2);
    const ni = Math.round(rev * 0.24);
    const shares = 15 - idx * 0.3; // billions
    const eps = (ni / shares).toFixed(2);
    const fcf = Math.round(rev * 0.22);
    return `${y},${rev},${yoy}%,${gm}%,${om}%,${ni},${shares.toFixed(2)},${eps},${fcf}`;
  });
  const csv = [
    "Year,Revenue($B),YoY%,GrossMargin%,OperatingMargin%,NetIncome($B),DilutedShares(B),EPS,FCF($B)",
    ...rows,
  ].join("\n");
  const memo = `# AAPL 5-Year Outlook

**Summary**: Illustrative model with steady revenue growth, resilient margins, and strong FCF. Assumptions are conservative and intended for demo purposes.

## Key Assumptions
- Revenue CAGR ~5–7% driven by installed base, services growth, and product refresh cycles.
- Gross margin ~43–45%; operating margin ~28–30%.
- Ongoing buybacks reduce diluted shares outstanding.

## Free Cash Flow
- Conversion remains strong given margin mix and opex discipline.
- FCF supports continued capital returns.

## Risks
- Hardware cycle volatility, competitive pressure, regulatory risk in services, FX.

*This memo is auto-generated for prototyping.*`;
  return { csv, memo };
}

/* ========================================================================== *
 *                    CSV LEAD WORKFLOW: SCORING & MESSAGING
 * ========================================================================== */



/* ========================================================================== *
 *                               ZOD SCHEMAS
 * ========================================================================== */

const CreateDocumentSchema = z.object({
  title: z.string().describe("The concise and relevant title for the document."),
  content: z
    .string()
    .describe(
      "The document body, written in PLAIN MARKDOWN format only. Use simple markdown syntax like # Heading, ## Subheading, - bullet points, **bold**, *italic*. Never use JSON, BlockNote format, or structured data.",
    ),
});

const CreateNodeSchema = z.object({
  markdown: z
    .string()
    .describe(
      "The new content for the block, written in PLAIN MARKDOWN format only. Use simple markdown syntax like # Heading, ## Subheading, - bullet points, **bold**, *italic*. Never use JSON, BlockNote format, or structured data.",
    ),
  parentId: z.optional(z.string()).describe("Optional parent node ID for nesting."),
});

const UpdateNodeSchema = z.object({
  nodeId: z.string().describe("The ID of the node to modify."),
  markdown: z.string().describe("The new Markdown content for the block."),
});

const UpdateDocumentSchema = z.object({
  documentId: z.string().describe("The ID of the document to update."),
  title: z.string().describe("The new title for the document."),
});

const IdSchema = z.object({ id: z.string().describe("The ID of the document or node.") });

const QuerySchema = z.object({ query: z.string().describe("The search term.") });

const EditDocSchema = z.object({
  documentId: z.string().optional().describe("Optional document ID to edit."),
  title: z
    .string()
    .optional()
    .describe("Title to resolve the document if ID not provided (exact or partial match)."),
  markdown: z
    .string()
    .describe("Markdown content to insert as a new block at the top of the document (or under parentId)."),
  parentId: z.string().optional().describe("Optional node ID to insert under; defaults to document root."),
});

const CsvLeadWorkflowSchema = z.object({
  fileId: z.string().describe("The CSV fileId (table: files) to process with the AI lead workflow."),
});

const OpenDocumentSchema = z.object({
  documentId: z.string().optional().describe("Document ID to open, if known."),
  title: z.string().optional().describe("Document title to search for if ID not provided."),
});

const SummarizeDocumentSchema = z.object({
  documentId: z.string().optional().describe("Document ID to summarize; defaults to current/selected."),
  style: z.enum(["bullets", "abstract"]).optional().describe("Summary style; defaults to bullets."),
  maxWords: z.number().int().min(50).max(1500).optional().describe("Word cap for the summary."),
});

const SpreadsheetOpSetCellSchema = z.object({
  op: z.literal("setCell"),
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  value: z.string(),
  type: z.string().optional(),
  comment: z.string().optional(),
});

const SpreadsheetOpClearCellSchema = z.object({
  op: z.literal("clearCell"),
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

const SpreadsheetOpSetRangeSchema = z.object({
  op: z.literal("setRange"),
  startRow: z.number().int().min(0),
  endRow: z.number().int().min(0),
  startCol: z.number().int().min(0),
  endCol: z.number().int().min(0),
  value: z.string().optional(),
  values: z.array(z.array(z.string())).optional(),
});

const SpreadsheetOperationSchema = z.discriminatedUnion("op", [
  SpreadsheetOpSetCellSchema,
  SpreadsheetOpClearCellSchema,
  SpreadsheetOpSetRangeSchema,
]);

const ApplySpreadsheetOpsSchema = z.object({
  sheetId: z.string().describe("The spreadsheet ID (table: spreadsheets)."),
  operations: z.array(SpreadsheetOperationSchema).describe("List of operations to apply in order."),
});

const RagAskSchema = z.object({
  prompt: z.string().describe("User question to answer via Hybrid RAG (vector + keyword)."),
});

const RagAddContextSchema = z.object({
  title: z.string().describe("Title for the context entry."),
  text: z.string().describe("Raw text to add to the global RAG namespace."),
});

const RagIngestDocumentSchema = z.object({
  documentId: z.string().optional().describe("Document ID to ingest into the RAG index."),
  title: z.string().optional().describe("Optional: document title to resolve the document if ID is not provided."),
});

const SendEmailSchema = z.object({
  to: z.string().email().describe("Recipient email address."),
  subject: z.string().min(1).describe("Email subject."),
  body: z.string().min(1).describe("Plain text email body. Basic markdown accepted."),
});

/* ========================================================================== *
 *                               AGENT TOOLS
 * ========================================================================== */

const agentTools: any = {
  createDocument: createTool({
    description: "Creates a new document from scratch.",
    args: CreateDocumentSchema,
    handler: async (ctx, { title, content }) => {
      const documentId = await ctx.runMutation(internal.aiAgents.internalCreateDocument, { title, content });
      return { documentId, message: `Created document "${title}"` };
    },
  }),

  createNode: createTool({
    description: "Adds a new content block to the document.",
    args: CreateNodeSchema,
    handler: async (ctx, { markdown, parentId }) => {
      // Resolve candidate document: try thread; else first sidebar
      let documentId: Id<"documents"> | undefined;
      try {
        const thread = await ctx.runQuery(internal.aiAgents.getThreadMetadata, { threadId: ctx.threadId! });
        const summary: string | undefined = (thread as any)?.summary;
        const match = summary?.match(/document:\s*([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) documentId = match[1] as Id<"documents">;
      } catch (err) {
        log.debug("[createNode] No thread metadata", err);
      }
      if (!documentId) documentId = await firstSidebarDocId(ctx);
      if (!documentId) throw new Error("No document selected or available. Please open or create a document first.");

      const nodeType = detectNodeType(markdown);
      const json = createBlockJson(nodeType, markdown);
      const text = extractPlainText(markdown);

      const validParentId = looksLikeNodeId(parentId) ? (parentId as Id<"nodes">) : undefined;

      await ctx.runMutation(api.nodes.add, {
        documentId,
        parentId: validParentId,
        order: 0,
        type: nodeType,
        json,
        text,
      });
      return "Content added successfully.";
    },
  }),

  proposeNode: createTool({
    description: "Propose adding a new content block (does not modify the document).",
    args: CreateNodeSchema,
    handler: async (_ctx, { markdown, parentId }) => {
      return {
        actions: [{ type: "createNode", markdown, parentId: parentId ?? null }],
        message: "Proposed new block for review.",
      };
    },
  }),

  proposeUpdateNode: createTool({
    description: "Propose updating an existing block (does not modify the document).",
    args: UpdateNodeSchema,
    handler: async (_ctx, { nodeId, markdown }) => {
      return {
        actions: [{ type: "updateNode", nodeId, markdown }],
        message: "Proposed block update for review.",
      };
    },
  }),

  openDocument: createTool({
    description: "Opens a document in the UI by ID or title.",
    args: OpenDocumentSchema,
    handler: async (ctx, { documentId, title }) => {
      const startTs = Date.now();
      log.info("🔧 [TOOL-OPEN_DOCUMENT] invoked", { documentId, title });
      let docId: Id<"documents"> | undefined;
      if (documentId) {
        docId = documentId as Id<"documents">;
      } else if (title) {
        docId = await resolveDocumentIdByTitle(ctx, title);
      }
      if (!docId && title) {
        const cands = await findTopDocumentsByTitle(ctx, title, 5);
        if (cands.length > 0) {
          let chosen: Id<"documents"> = cands[0]._id;
          if (cands.length > 1) {
            try {
              const sel: any = await ctx.runAction((internal as any).aiAgents.pickBestDocWithLLM, {
                ask: title,
                candidates: cands.map((c: any) => ({ id: c._id, title: c.title })),
                model: GPT5_MINI,
                threadId: ctx.threadId,
              });
              if (sel?.id) chosen = sel.id as Id<"documents">;
            } catch {}
          }
          docId = chosen;
        }
      }
      if (!docId) throw new Error("Document not found. Provide a valid ID or exact title.");

      const result = { openedDocumentId: docId };
      log.info("   ↳ result (openDocument):", result, { ms: Date.now() - startTs });
      return result;
    },
  }),

  openDoc: createTool({
    description: "Alias of openDocument. Opens a document in the UI by ID or title.",
    args: OpenDocumentSchema,
    handler: async (ctx, { documentId, title }) => {
      const startTs = Date.now();
      log.info("🔧 [TOOL-OPEN_DOC] invoked", { documentId, title });
      let docId: Id<"documents"> | undefined;
      if (documentId) {
        docId = documentId as Id<"documents">;
      } else if (title) {
        docId = await resolveDocumentIdByTitle(ctx, title);
      }
      if (!docId && title) {
        const cands = await findTopDocumentsByTitle(ctx, title, 5);
        if (cands.length > 0) {
          let chosen: Id<"documents"> = cands[0]._id;
          if (cands.length > 1) {
            try {
              const sel: any = await ctx.runAction((internal as any).aiAgents.pickBestDocWithLLM, {
                ask: title,
                candidates: cands.map((c: any) => ({ id: c._id, title: c.title })),
                model: GPT5_MINI,
                threadId: ctx.threadId,
              });
              if (sel?.id) chosen = sel.id as Id<"documents">;
            } catch {}
          }
          docId = chosen;
        }
      }
      if (!docId) throw new Error("Document not found. Provide a valid ID or exact title.");

      const result = { openedDocumentId: docId };
      log.info("   ↳ result (openDoc):", result, { ms: Date.now() - startTs });
      return result;
    },
  }),

  editDoc: createTool({
    description: "Edits a document by inserting provided markdown as a new block. Resolves the document by id or title.",
    args: EditDocSchema,
    handler: async (ctx, { documentId, title, markdown, parentId }) => {
      let docId: Id<"documents">;
      try {
        docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId });
      } catch (e) {
        if (!title) throw e;
        const cands = await findTopDocumentsByTitle(ctx, title, 5);
        if (cands.length === 0) throw e;
        let chosen: Id<"documents"> = cands[0]._id;
        if (cands.length > 1) {
          try {
            const sel: any = await ctx.runAction((internal as any).aiAgents.pickBestDocWithLLM, {
              ask: `Edit request: ${title}${markdown ? " | " + String(markdown).slice(0,160) : ""}`,
              candidates: cands.map((c: any) => ({ id: c._id, title: c.title })),
              model: GPT5_MINI,
              threadId: ctx.threadId,
            });
            if (sel?.id) chosen = sel.id as Id<"documents">;
          } catch {}
        }
        docId = chosen;
      }
      const nodeType = detectNodeType(markdown);
      const json = createBlockJson(nodeType, markdown);
      const text = extractPlainText(markdown);
      const validParentId = looksLikeNodeId(parentId) ? (parentId as Id<"nodes">) : undefined;

      const createdNodeId: Id<"nodes"> = await ctx.runMutation(api.nodes.add, {
        documentId: docId,
        parentId: validParentId,
        order: 0,
        type: nodeType,
        json,
        text,
      });

      return { documentId: docId, createdNodeId };
    },
  }),

  summarizeDocument: createTool({
    description: "Summarizes the current or specified document and inserts a 'Summary' section.",
    args: SummarizeDocumentSchema,
    handler: async (ctx, { documentId, style = "bullets", maxWords = 250 }) => {
      // Resolve target document
      let docId: Id<"documents"> | undefined = documentId as Id<"documents"> | undefined;
      if (!docId) {
        docId = await getThreadSummaryDocId(ctx, ctx.threadId);
      }
      if (!docId) docId = await firstSidebarDocId(ctx);
      if (!docId) throw new Error("No document selected or available to summarize.");

      // Gather raw markdown from nodes
      const nodes = await ctx.runQuery(api.nodes.by_document, { docId });
      const sections: string[] = [];
      for (const n of nodes) sections.push(n.text || "");
      const markdown = sections.filter(Boolean).join("\n\n");

      // Generate summary (OpenAI → fallback)
      let summaryText = "";
      if (process.env.OPENAI_API_KEY) {
        const OpenAI = await getOpenAI();
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const prompt =
          `Summarize the following document in ${
            style === "bullets" ? "concise bullet points" : "a concise abstract"
          } within ${maxWords} words.\n\n` + markdown;
        summaryText =
          (await safeChatCompletion(client, {
            model: GPT5_NANO,
            messages: [
              { role: "system", content: "You summarize documents into clean markdown." },
              { role: "user", content: prompt },
            ],
          })) || "";
      } else {
        const lines = markdown.split(/\r?\n/).slice(0, 30);
        summaryText =
          style === "bullets"
            ? ["# Summary", "", ...lines.filter(Boolean).slice(0, 8).map((l) => `- ${l.slice(0, 140)}`)].join("\n")
            : ["# Summary", "", lines.filter(Boolean).slice(0, 12).join(" ")].join("\n");
      }

      const summaryMarkdown = `# Summary\n\n${summaryText.trim()}`;
      const nodeType = detectNodeType(summaryMarkdown);
      const json = createBlockJson(nodeType, summaryMarkdown);
      const text = extractPlainText(summaryMarkdown);

      const nodeId = await ctx.runMutation(api.nodes.add, {
        documentId: docId,
        order: 0,
        type: nodeType,
        json,
        text,
      });

      return { summaryNodeId: nodeId, documentId: docId };
    },
  }),

  updateNode: createTool({
    description: "Modifies the currently selected content block.",
    args: UpdateNodeSchema,
    handler: async (ctx, { nodeId, markdown }) => {
      await ctx.runMutation(api.nodes.update, { nodeId: nodeId as Id<"nodes">, markdown });
      return "Content updated.";
    },
  }),

  archiveNode: createTool({
    description: "Deletes the currently selected content block.",
    args: IdSchema,
    handler: async (ctx, { id }) => {
      await ctx.runMutation(api.nodes.remove, { nodeId: id as Id<"nodes"> });
      return "Content deleted.";
    },
  }),

  findDocuments: createTool({
    description: "Searches for documents by title or content.",
    args: QuerySchema,
    handler: async (ctx, { query }) => {
      if (!ctx.userId) throw new Error("User not authenticated");
      const { results, entries } = await ragSearch(ctx, { query, namespace: ctx.userId });
      const entryMap = new Map<any, any>(entries.map((e: any) => [e.entryId, e]));
      return results.map((r: any) => {
        const entry: any = entryMap.get(r.entryId)!;
        return {
          ...(entry?.metadata || {}),
          text: r.content.map((c: any) => c.text).join("\n"),
          score: r.score,
        };
      });
    },
  }),

  ragAsk: createTool({
    description: "Answer a question using Hybrid RAG (vector + keyword) with citations.",
    args: RagAskSchema,
    handler: async (ctx, { prompt }) => {
      const res = await ctx.runAction(api.rag.askQuestion, { prompt });
      return res as { answer: string; contextText: string };
    },
  }),

  ragAddContext: createTool({
    description: "Add text context to the global RAG namespace (title + text).",
    args: RagAddContextSchema,
    handler: async (ctx, { title, text }) => {
      await ctx.runAction(api.rag.addContextPublic, { title, text });
      return { success: true } as const;
    },
  }),

  ragIngestDocument: createTool({
    description: "Ingest a document (title + content) into the Hybrid RAG index.",
    args: RagIngestDocumentSchema,
    handler: async (ctx, { documentId, title }) => {
      const docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId });
      await ctx.runAction(internal.rag.addDocumentToRag, { documentId: docId });
      return { success: true, documentId: docId } as const;
    },
  }),

  updateDocument: createTool({
    description: "Updates the title of a document.",
    args: UpdateDocumentSchema,
    handler: async (ctx, { documentId, title }) => {
      await ctx.runMutation(api.documents.update, { id: documentId as Id<"documents">, title });
      return "Document title updated.";
    },
  }),

  archiveDocument: createTool({
    description: "Moves a document to the trash.",
    args: IdSchema,
    handler: async (ctx, { id }) => {
      await ctx.runMutation(api.documents.archive, { id: id as Id<"documents"> });
      return "Document moved to trash.";
    },
  }),

  applySpreadsheetOps: createTool({
    description: "Applies AI-generated spreadsheet operations (setCell, clearCell, setRange) to a given sheet.",
    args: ApplySpreadsheetOpsSchema,
    handler: async (ctx, { sheetId, operations }) => {
      const res: { applied: number; errors: number } = await ctx.runMutation(api.spreadsheets.applyOperations, {
        sheetId: sheetId as Id<"spreadsheets">,
        operations,
      });
      return res;
    },
  }),

  runCsvLeadWorkflow: createTool({
    description: "Run the CSV AI lead scoring workflow on a specific CSV file.",
    args: CsvLeadWorkflowSchema,
    handler: async (ctx, { fileId }) => {
      const result = await ctx.runAction(api.aiAgents.csvLeadWorkflow, { fileId: fileId as Id<"files"> });
      return result as {
        scoredCsvFileId: Id<"files">;
        messagesFileId: Id<"files">;
        processed: number;
        topLeads: number;
      };
    },
  }),

  compileAaplModel: createTool({
    description: "Compile AAPL model and generate CSV + memo files.",
    args: z.object({}).optional(),
    handler: async (ctx) => {
      const result = await ctx.runAction(api.aiAgents.compileAaplModel, {});
      return result as { csvFileId: Id<"files">; memoFileId: Id<"files"> };
    },
  }),

  sendEmail: createTool({
    description: "Sends an email via the Resend backend action.",
    args: SendEmailSchema,
    handler: async (ctx, { to, subject, body }) => {
      const result: { success: boolean; id?: string; error?: string } = await ctx.runAction(api.email.sendEmail, {
        to,
        subject,
        body,
      });
      return result;
    },
  }),

  // Precise, position-based document editing tool (rootId + depth path)
  updateAtPosition: createTool({
    description: "Update document content at a precise node path under a root node. Maintains hierarchy.",
    args: z.object({
      documentId: z.string().optional().describe("Target document id; if omitted uses thread/title heuristics."),
      title: z.string().optional().describe("Document title to resolve when id not provided."),
      rootId: z.string().describe("Root node id (top of subtree)."),
      path: z.array(z.number()).describe("Depth indices from root, e.g. [1,0,2]."),
      op: z.enum(["replace", "insertBefore", "insertAfter", "appendChild"]).describe("Edit operation."),
      markdown: z.string().optional().describe("New content in PLAIN MARKDOWN (preferred)."),
    }),
    handler: async (ctx, { documentId, title, rootId, path, op, markdown }) => {
      const docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId });
      const res = await ctx.runMutation(api.agentEditor.agentUpdateAtPosition, {
        documentId: docId as any,
        rootId: rootId as any,
        path,
        op: op as any,
        markdown,
      });
      return res as { targetId: string | null; newNodeId: string | null };
    },
  }),

  // Non-mutating proposal variant for review UIs
  proposeUpdateAtPosition: createTool({
    description: "Propose a precise position update (no mutation). Returns an action plan.",
    args: z.object({
      documentId: z.string().optional(),
      title: z.string().optional(),
      rootId: z.string(),
      path: z.array(z.number()),
      op: z.enum(["replace", "insertBefore", "insertAfter", "appendChild"]),
      markdown: z.string().optional(),
    }),
    handler: async (_ctx, params) => {
      return {
        actions: [{ type: "updateAtPosition", params }],
        message: "Proposed precise edit for review.",
      } as const;
    },
  }),
  /**
   * Tiptap AI Agent-style tools (server-side intents / pass-through for client application)
   * These mirror the built-in tool names so the model can call them.
   * For safety, apply_diff and replace_document return intents for the client to apply.
   */
  read_first_chunk: createTool({
    description: "Start reading the current document from the beginning (returns a chunk with cursor).",
    args: z.object({
      documentId: z.string().optional(),
      title: z.string().optional(),
      maxChars: z.number().int().min(100).max(10000).optional().describe("Max characters in a chunk; default 1200"),
    }),
    handler: async (ctx, { documentId, title, maxChars = 1200 }) => {
      const docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId });
      const nodes = await ctx.runQuery(api.nodes.by_document, { docId });
      const full = nodes.map((n: any) => n.text || "").filter(Boolean).join("\n\n");
      const chunk = full.slice(0, maxChars);
      return { documentId: docId, chunk, cursor: chunk.length, isEnd: chunk.length >= full.length } as const;
    },
  }),

  read_next_chunk: createTool({
    description: "Read the next chunk of the document (based on a cursor).",
    args: z.object({
      documentId: z.string().optional(),
      title: z.string().optional(),
      cursor: z.number().int().min(0),
      maxChars: z.number().int().min(100).max(10000).optional().describe("Max characters in a chunk; default 1200"),
    }),
    handler: async (ctx, { documentId, title, cursor, maxChars = 1200 }) => {
      const docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId });
      const nodes = await ctx.runQuery(api.nodes.by_document, { docId });
      const full = nodes.map((n: any) => n.text || "").filter(Boolean).join("\n\n");
      const start = Math.max(0, Math.min(cursor, full.length));
      const end = Math.min(full.length, start + maxChars);
      const chunk = full.slice(start, end);
      return { documentId: docId, chunk, cursor: end, isEnd: end >= full.length } as const;
    },
  }),

  read_previous_chunk: createTool({
    description: "Read the previous chunk of the document (based on a cursor).",
    args: z.object({
      documentId: z.string().optional(),
      title: z.string().optional(),
      cursor: z.number().int().min(0),
      maxChars: z.number().int().min(100).max(10000).optional().describe("Max characters in a chunk; default 1200"),
    }),
    handler: async (ctx, { documentId, title, cursor, maxChars = 1200 }) => {
      const docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId });
      const nodes = await ctx.runQuery(api.nodes.by_document, { docId });
      const full = nodes.map((n: any) => n.text || "").filter(Boolean).join("\n\n");
      const end = Math.max(0, Math.min(cursor, full.length));
      const start = Math.max(0, end - maxChars);
      const chunk = full.slice(start, end);
      return { documentId: docId, chunk, cursor: start, isStart: start === 0 } as const;
    },
  }),

  apply_diff: createTool({
    description: "Apply a list of diffs to the document (server returns an intent; client should apply).",
    args: z.object({
      documentId: z.string().optional(),
      title: z.string().optional(),
      diffs: z.array(
        z.object({
          before: z.string().describe("Text preceding the edit location (for anchoring)"),
          delete: z.string().optional().describe("Text to delete (if any)"),
          insert: z.string().optional().describe("Text to insert (if any)"),
        }),
      ).min(1),
    }),
    handler: async (ctx, { documentId, title, diffs }) => {
      const docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId }).catch(() => undefined);
      // Return an intent payload for the client editor to apply safely with schema-awareness
      return { intent: "apply_diff", documentId: docId, diffs } as const;
    },
  }),

  replace_document: createTool({
    description: "Replace the entire document with new content (server returns an intent; client should apply).",
    args: z.object({
      documentId: z.string().optional(),
      title: z.string().optional(),
      content: z.string().describe("New document content (plain markdown preferred)"),
    }),
    handler: async (ctx, { documentId, title, content }) => {
      const docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId }).catch(() => undefined);
      return { intent: "replace_document", documentId: docId, content } as const;
    },
  }),

  plan: createTool({
    description: "Plan the work to be done; returns a markdown list of steps.",
    args: z.object({ steps: z.string().describe("Steps in markdown (produced by the model)") }),
    handler: async (_ctx, { steps }) => {
      return { plan: steps } as const;
    },
  }),

  ask_user: createTool({
    description: "Ask the user a question; the client should surface this and pause the run.",
    args: z.object({ question: z.string().min(1) }),
    handler: async (_ctx, { question }) => ({ question }) as const,
  }),

  finish_with_summary: createTool({
    description: "Finish the task with a markdown summary.",
    args: z.object({ summary: z.string().min(1) }),
    handler: async (_ctx, { summary }) => ({ summary, finished: true } as const),
  }),

  // Nodebench custom tool aliases (no Tiptap toolkit dependency)
  nodebench_read_first_chunk: createTool({
    description: "Nodebench: Start reading the current document from the beginning.",
    args: z.object({ documentId: z.string().optional(), title: z.string().optional(), maxChars: z.number().int().min(100).max(10000).optional() }),
    handler: async (ctx, { documentId, title, maxChars = 1200 }) => {
      const docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId });
      const nodes = await ctx.runQuery(api.nodes.by_document, { docId });
      const full = nodes.map((n: any) => n.text || "").filter(Boolean).join("\n\n");
      const chunk = full.slice(0, maxChars);
      return { namespace: "nodebench_ai", tool: "read_first_chunk", documentId: docId, chunk, cursor: chunk.length, isEnd: chunk.length >= full.length } as const;
    },
  }),

  nodebench_read_next_chunk: createTool({
    description: "Nodebench: Read the next chunk of the document.",
    args: z.object({ documentId: z.string().optional(), title: z.string().optional(), cursor: z.number().int().min(0), maxChars: z.number().int().min(100).max(10000).optional() }),
    handler: async (ctx, { documentId, title, cursor, maxChars = 1200 }) => {
      const docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId });
      const nodes = await ctx.runQuery(api.nodes.by_document, { docId });
      const full = nodes.map((n: any) => n.text || "").filter(Boolean).join("\n\n");
      const start = Math.max(0, Math.min(cursor, full.length));
      const end = Math.min(full.length, start + maxChars);
      const chunk = full.slice(start, end);
      return { namespace: "nodebench_ai", tool: "read_next_chunk", documentId: docId, chunk, cursor: end, isEnd: end >= full.length } as const;
    },
  }),

  nodebench_read_previous_chunk: createTool({
    description: "Nodebench: Read the previous chunk of the document.",
    args: z.object({ documentId: z.string().optional(), title: z.string().optional(), cursor: z.number().int().min(0), maxChars: z.number().int().min(100).max(10000).optional() }),
    handler: async (ctx, { documentId, title, cursor, maxChars = 1200 }) => {
      const docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId });
      const nodes = await ctx.runQuery(api.nodes.by_document, { docId });
      const full = nodes.map((n: any) => n.text || "").filter(Boolean).join("\n\n");
      const end = Math.max(0, Math.min(cursor, full.length));
      const start = Math.max(0, end - maxChars);
      const chunk = full.slice(start, end);
      return { namespace: "nodebench_ai", tool: "read_previous_chunk", documentId: docId, chunk, cursor: start, isStart: start === 0 } as const;
    },
  }),

  nodebench_apply_diff: createTool({
    description: "Nodebench: Apply a list of text diffs (intent-only; client applies with schema awareness).",
    args: z.object({
      documentId: z.string().optional(),
      title: z.string().optional(),
      diffs: z.array(z.object({ before: z.string(), delete: z.string().optional(), insert: z.string().optional() })).min(1),
    }),
    handler: async (ctx, { documentId, title, diffs }) => {
      const docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId }).catch(() => undefined);
      return { namespace: "nodebench_ai", intent: "apply_diff", documentId: docId, diffs } as const;
    },
  }),

  nodebench_replace_document: createTool({
    description: "Nodebench: Replace the entire document (intent-only; client applies).",
    args: z.object({ documentId: z.string().optional(), title: z.string().optional(), content: z.string() }),
    handler: async (ctx, { documentId, title, content }) => {
      const docId = await resolveDocumentId(ctx, { documentId, title, threadId: ctx.threadId }).catch(() => undefined);
      return { namespace: "nodebench_ai", intent: "replace_document", documentId: docId, content } as const;
    },
  }),

  nodebench_plan: createTool({
    description: "Nodebench: Plan the work to be done (markdown steps).",
    args: z.object({ steps: z.string() }),
    handler: async (_ctx, { steps }) => ({ namespace: "nodebench_ai", tool: "plan", plan: steps } as const),
  }),

  nodebench_ask_user: createTool({
    description: "Nodebench: Ask the user a question.",
    args: z.object({ question: z.string().min(1) }),
    handler: async (_ctx, { question }) => ({ namespace: "nodebench_ai", tool: "ask_user", question } as const),
  }),

  nodebench_finish_with_summary: createTool({
    description: "Nodebench: Finish the task with a markdown summary.",
    args: z.object({ summary: z.string().min(1) }),
    handler: async (_ctx, { summary }) => ({ namespace: "nodebench_ai", tool: "finish_with_summary", summary, finished: true } as const),
  }),

};

/* ========================================================================== *
 *                            PUBLIC: LIST TOOLS
 * ========================================================================== */

export const listAgentTools = query({
  args: {},
  returns: v.array(
    v.object({
      name: v.string(),
      description: v.string(),
      argNames: v.optional(v.array(v.string())),
    }),
  ),
  handler: async (_ctx) => {
    const tools: Array<{ name: string; description: string; argNames?: string[] }> = [];
    for (const [name, tool] of Object.entries(agentTools)) {
      let argNames: string[] | undefined;
      try {
        const shape = (tool as any)?.args?._def?.shape?.();
        if (shape && typeof shape === "object") argNames = Object.keys(shape);
      } catch {
        // ignore schema introspection errors
      }
      tools.push({ name, description: (tool as any)?.description ?? "", argNames });
    }
    return tools;
  },
});


// OpenAI tool-call dispatcher: routes OpenAI tool names to existing Convex handlers.
// Deprecated note: The legacy agentTools map remains for Convex/Gemini agent flows.
export const executeOpenAITool = action({
  args: { name: v.string(), params: v.any() },
  returns: v.any(),
  handler: async (ctx, { name, params }) => {
    const n = (name || "").trim();
    const p: any = params || {};

    const toCamel = (s: string) => s.replace(/_([a-z])/g, (_m, c) => (c as string).toUpperCase());

    switch (n) {
      case "run_csv_lead_workflow":
        return await (agentTools as any).runCsvLeadWorkflow.handler(ctx, { fileId: p.file_id, maxRows: p.max_rows });
      case "compile_aapl_model":
        return await (agentTools as any).compileAaplModel.handler(ctx, {});
      case "create_document":
        return await (agentTools as any).createDocument.handler(ctx, { title: p.title, content: p.content });
      case "open_document":
      case "open_doc":
        return await (agentTools as any).openDocument.handler(ctx, { documentId: p.document_id, title: p.title });
      case "edit_doc":
        return await (agentTools as any).editDoc.handler(ctx, { documentId: p.document_id, title: p.title, markdown: p.markdown, parentId: p.parent_node_id });
      case "summarize_document":
        return await (agentTools as any).summarizeDocument.handler(ctx, { documentId: p.document_id, style: p.style, maxWords: p.max_words });
      case "update_node":
        return await (agentTools as any).updateNode.handler(ctx, { nodeId: p.node_id, markdown: p.markdown });
      case "archive_node":
        return await (agentTools as any).archiveNode.handler(ctx, { id: p.id });
      case "find_documents":
        return await (agentTools as any).findDocuments.handler(ctx, { query: p.query });
      case "rag_ask":
        return await (agentTools as any).ragAsk.handler(ctx, { prompt: p.prompt });
      case "rag_add_context":
        return await (agentTools as any).ragAddContext.handler(ctx, { title: p.title, text: p.text });
      case "rag_ingest_document":
        return await (agentTools as any).ragIngestDocument.handler(ctx, { documentId: p.document_id, title: p.title });
      case "update_document":
        return await (agentTools as any).updateDocument.handler(ctx, { documentId: p.document_id, title: p.title });
      case "archive_document":
        return await (agentTools as any).archiveDocument.handler(ctx, { id: p.id });
      case "apply_spreadsheet_ops":
        return await (agentTools as any).applySpreadsheetOps.handler(ctx, { sheetId: p.sheet_id, operations: p.operations });
      case "send_email":
        return await (agentTools as any).sendEmail.handler(ctx, { to: p.to, subject: p.subject, body: p.body });
      case "update_at_position":
        return await (agentTools as any).updateAtPosition.handler(ctx, { documentId: p.document_id, title: p.title, rootId: p.root_id, path: p.path, markdown: p.markdown });
      case "propose_update_at_position":
        return await (agentTools as any).proposeUpdateAtPosition.handler(ctx, { documentId: p.document_id, title: p.title, rootId: p.root_id, path: p.path, markdown: p.markdown });
      case "read_first_chunk":
        return await (agentTools as any).read_first_chunk.handler(ctx, { documentId: p.document_id, title: p.title, maxChars: p.max_chars });
      case "read_next_chunk":
        return await (agentTools as any).read_next_chunk.handler(ctx, { documentId: p.document_id, title: p.title, cursor: p.cursor, maxChars: p.max_chars });
      case "read_previous_chunk":
        return await (agentTools as any).read_previous_chunk.handler(ctx, { documentId: p.document_id, title: p.title, cursor: p.cursor, maxChars: p.max_chars });
      case "apply_diff":
        return await (agentTools as any).apply_diff.handler(ctx, { documentId: p.document_id, title: p.title, diffs: p.diffs });
      case "replace_document":
        return await (agentTools as any).replace_document.handler(ctx, { documentId: p.document_id, title: p.title, content: p.content });
      case "plan":
        return await (agentTools as any).plan.handler(ctx, { steps: p.steps });
      case "ask_user":
        return await (agentTools as any).ask_user.handler(ctx, { question: p.question });
      case "finish_with_summary":
        return await (agentTools as any).finish_with_summary.handler(ctx, { summary: p.summary });
      default: {
        const camel = toCamel(n);
        const tool = (agentTools as any)[camel] || (agentTools as any)[n];
        if (tool?.handler) return await tool.handler(ctx, p);
        throw new Error(`Unknown tool: ${n}`);
      }
    }
  },
});

/* ========================================================================== *
 *                            AGENT INSTANCES
 * ========================================================================== */

export const openaiAgent = new Agent(components.agent, {
  chat: openai.chat(GPT5_NANO),
  textEmbedding: openai.embedding(TEXT_EMBED_MODEL),
  instructions: `You are a helpful AI document assistant. Your job is to help users create, edit, and manage their documents.

CRITICAL REQUIREMENTS:
- When creating or editing document content, you MUST output ONLY plain markdown format
- NEVER generate JSON, BlockNote format, or any structured data format
- Use simple markdown syntax: # Heading, ## Subheading, - bullet points, **bold**, *italic*
- DO NOT generate complex nested JSON structures with "type", "props", "content", "id", or any similar properties
- If you generate anything other than plain markdown for document content, the application will crash
- Always stick to basic markdown text formatting only
- When suggesting edits or adding content for an existing document, prefer using the non-mutating tools proposeNode or proposeUpdateNode so changes appear as a user-reviewable proposal in the Editor, rather than applying immediately.
- Prefer the custom Nodebench tools for reading and editing: nodebench_read_first_chunk, nodebench_read_next_chunk, nodebench_apply_diff, and nodebench_replace_document. Use nodebench_apply_diff for targeted edits and nodebench_replace_document for full rewrites. Use proposeNode/proposeUpdateNode if user review is required.
- When the user asks to open or view a document by name (e.g., "August calendar"), call the openDoc tool with the title set to the requested document name.

RESPONSE STYLE (apply to every reply):
- Provide a clear, direct answer first.
- Then include a brief, step-by-step explanation of how you arrived there.
- Offer 1–3 alternative perspectives or solutions when relevant.
- Conclude with a practical summary or action plan the user can apply immediately.
- If the question is broad, break it into logical parts before answering.
- Adopt the appropriate professional tone for the user's request (teacher, coach, engineer, doctor, etc.).
- Avoid vagueness; state assumptions and push your reasoning to be maximally helpful.`,
  tools: agentTools,
  maxSteps: 5,
});

export const geminiAgent = new Agent(components.agent, {
  // Uses OpenAI chat for framework compatibility while separate Gemini calls exist in actions
  chat: openai.chat(GPT5_NANO),
  textEmbedding: openai.embedding(TEXT_EMBED_MODEL),
  instructions:
    `You are an expert AI assistant integrated into a document editor. Your primary function is to help users write and manage their content by calling the appropriate tools based on the user's request and their current context within the document.

CRITICAL REQUIREMENTS:
- When creating or editing document content, you MUST output ONLY plain markdown format
- NEVER generate JSON, BlockNote format, or any structured data format
- Use simple markdown syntax: # Heading, ## Subheading, - bullet points, **bold**, *italic*
- DO NOT generate complex nested JSON structures with "type", "props", "content", "id", or any similar properties
- Always prefer the non-mutating tools proposeNode or proposeUpdateNode so changes appear as a user-reviewable proposal in the Editor when appropriate.
- Prefer the custom Nodebench tools for reading and editing: nodebench_read_first_chunk, nodebench_read_next_chunk, nodebench_apply_diff, and nodebench_replace_document. Use nodebench_apply_diff for targeted edits and nodebench_replace_document for full rewrites. Use proposeNode/proposeUpdateNode if user review is required.
- When the user asks to open or view a document by name (e.g., "August calendar"), call the openDoc tool with the title set to the requested document name.

RESPONSE STYLE (apply to every reply):
- Provide a clear, direct answer first.
- Then include a brief, step-by-step explanation of how you arrived there.
- Offer 1–3 alternative perspectives or solutions when relevant.
- Conclude with a practical summary or action plan the user can apply immediately.
- If the question is broad, break it into logical parts before answering.
- Adopt the appropriate professional tone for the user's request (teacher, coach, engineer, doctor, etc.).
- Avoid vagueness; state assumptions and push your reasoning to be maximally helpful.`,
  tools: agentTools,
  maxSteps: 5,
});

// Back-compat alias
export const documentAgent = openaiAgent;

/* ========================================================================== *
 *                         QUICK ACTIONS / ACTIONS
 * ========================================================================== */

/** Quick Action: Compile AAPL 5-year financial model */
export const compileAaplModel = action({
  args: {},
  returns: v.object({
    csvFileId: v.id("files"),
    memoFileId: v.id("files"),
  }),
  handler: async (ctx) => {
    await ensureUserId(ctx);

    let csvContent = "";
    let memoContent = "";
    try {
      if (process.env.OPENAI_API_KEY) {
        const res = await generateAaplCsvAndMemoViaOpenAI();
        csvContent = res.csv.trim();
        memoContent = res.memo.trim();
      } else {
        const res = generateAaplCsvAndMemoFallback();
        csvContent = res.csv;
        memoContent = res.memo;
      }
    } catch {
      const res = generateAaplCsvAndMemoFallback();
      csvContent = res.csv;
      memoContent = res.memo;
    }

    const csvFileId = await storeTextAsFile(ctx, csvContent, "AAPL_5y_model.csv", "text/csv");
    const memoFileId = await storeTextAsFile(ctx, memoContent, "AAPL_5y_model_memo.md", "text/markdown");
    return { csvFileId, memoFileId };
  },
});

/** Quick Action: CSV Lead Management Workflow */
export const csvLeadWorkflow = action({
  args: { fileId: v.id("files"), maxRows: v.optional(v.number()) },
  returns: v.object({
    scoredCsvFileId: v.id("files"),
    messagesFileId: v.id("files"),
    processed: v.number(),
    topLeads: v.number(),
  }),
  handler: async (ctx, { fileId, maxRows = 50 }) => {
    await ensureUserId(ctx);

    const start = Date.now();
    const csvText = await fetchFileTextByFileId(ctx, fileId);

    // Parse CSV + limit
    const parsed = parseCsv(csvText);
    const header = parsed.header;
    const data = parsed.rows.slice(0, Math.max(0, maxRows));

    // Optional OpenAI client
    let client: any = null;
    if (process.env.OPENAI_API_KEY) {
      const OpenAI = await getOpenAI();
      client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    // Score + messages
    const scored = await scoreLeads(data, header, client);
    const top = scored.filter((r) => r.Tier === "A").slice(0, 10);
    const messages = await generateMessages(top, client);

    // Output CSV
    const augmentedHeader = [...header, "Score", "Tier", "Notes"];
    const csvOut = [
      augmentedHeader.join(","),
      ...scored.map((r) => augmentedHeader.map((h) => r[h] ?? "").join(",")),
    ].join("\n");

    // Output messages markdown
    const mdOut = [
      `# Outreach Messages for CSV`,
      "",
      ...messages.map((m, i) =>
        [
          `## Lead ${i + 1}: ${m.name || m.email || "Unknown"}`,
          m.company ? `Company: ${m.company}` : null,
          m.title ? `Title: ${m.title}` : null,
          "",
          m.message,
          "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ].join("\n");

    // Store results
    const scoredCsvFileId = await storeTextAsFile(ctx, csvOut, "leads_scored.csv", "text/csv");
    const messagesFileId = await storeTextAsFile(ctx, mdOut, "leads_messages.md", "text/markdown");

    // Update source file with a summary (non-fatal if it fails)
    try {
      await ctx.runMutation(internal.files.updateFileAnalysis, {
        fileId,
        analysis: `CSV AI Lead Workflow complete: processed ${data.length} rows, top leads ${top.length}. Generated scored CSV and messages.`,
        structuredData: {
          processed: data.length,
          topLeads: top.length,
          sampleTop: top.slice(0, 3),
        },
        analysisType: "csv_lead_workflow",
        processingTime: Date.now() - start,
      });
    } catch (e) {
      log.warn("[csvLeadWorkflow] updateFileAnalysis failed", e);
    }

    return { scoredCsvFileId, messagesFileId, processed: data.length, topLeads: top.length };
  },
});

/* ========================================================================== *
 *                              CHAT / THREADING
 * ========================================================================== */

export const getOrCreateThread = action({
  args: { documentId: v.optional(v.id("documents")) },
  handler: async (ctx, { documentId }) => {
    const userId = await ensureUserId(ctx);

    const existingThreads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, { userId });
    const existingThread = existingThreads.page[0];

    if (existingThread) {
      if (documentId) {
        await ctx.runMutation(components.agent.threads.updateThread, {
          threadId: existingThread._id,
          patch: { summary: `Working on document: ${documentId}` },
        });
      }
      return existingThread._id;
    }

    const { threadId } = await documentAgent.createThread(ctx, { userId });
    if (documentId) {
      await ctx.runMutation(components.agent.threads.updateThread, {
        threadId,
        patch: { summary: `Working on document: ${documentId}` },
      });
    }
    return threadId;
  },
});

/* ========================================================================== *
 *                 AUTONOMOUS CHAT (PRESERVE PUBLIC SIGNATURE)
 * ========================================================================== *
 * The following export retains the original behavior and surface:
 * - args and return type unchanged
 * - internally improved structure and defensive checks
 * - logs are more consistent
 */


/* ----------------------- Types used by chatWithAgent ---------------------- */


/* -------------------------- Chat helper utilities ------------------------- */






/* ------------------------------ Intent helpers ---------------------------- */




/* ------------------------ Execution path for autonomous ------------------- */






// =====================================================================================
// Structured intent + tool plan via GPT-5-nano (JSON with Zod)
// - Produces an execution plan with sequential groups; steps within a group run in parallel
// - Keeps scope conservative: small, known step kinds with safe handlers
// =====================================================================================









async function executeAutonomousLoop(ctx: any, agentState: AgentState) {
  const { message, mcpServerId, selectedDocumentId } = agentState.context;

  // Prefer internal document search for intents like "find documents about ..."
  const internalFindMatch = message.match(/\bfind\s+(?:my\s+)?docs?(?:uments)?\s+(?:about|on|for)\s+(.+)/i);
  // Only treat as web search if they explicitly mention web/internet or include a URL
  const needsWebSearch = /(web|internet|online|https?:\/\/)/i.test(message) && !!mcpServerId && !internalFindMatch;
  const needsDocumentCreation = /create.*document|new.*document|document.*about/i.test(message);
  const needsDocumentWork =
    /(\bedit\b|\bupdate\b|\bmodify\b|\badd\b|\bappend\b|\binsert\b|\bplace\b|\bput\b|add to|work with|\bsection\b)/i.test(
      message,
    ) && selectedDocumentId;

  let response = "";
  try {
    await addThinkingStep(ctx, agentState, "analysis", "Classifying intent (gpt-5-mini)…");
    let intent: any = null;
    try {
      intent = await ctx.runAction((internal as any).agents.lib.intent.classifyIntent, {
        message,
        uiSummary: agentState.context.uiSummary,
        hasSelectedDoc: !!selectedDocumentId,
      });
    } catch {}

    if (intent && intent.kind === "doc.search.internal") {
      const topic = String((intent as any)?.topic || internalFindMatch?.[1] || "").trim() || message;
      await addThinkingStep(ctx, agentState, "execution", `Searching your documents for: ${topic}`);
      try {
        const results: any[] = await ctx.runQuery(api.documents.getSearch, { query: topic });
        const top = (results || []).slice(0, 10);
        if (top.length === 0) {
          response = `I couldn't find any documents matching "${topic}" in your workspace.`;
        } else {
          if (agentState.context.runId) {
            try {
              await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
                runId: agentState.context.runId,
                kind: "context.docs",
                message: "Candidate documents from internal search",
                data: { ids: top.map((d: any) => d._id), query: topic },
              });
            } catch {}
          }
          const list = top.map((d: any, i: number) => `${i + 1}. ${d.title || "Untitled"}`).join("\n");
          response = `Found ${top.length} document(s) for "${topic}":\n${list}\n\nYou can say: "open <number>" or "summarize <number>".`;
        }
      } catch (e) {
        await addAdaptation(ctx, agentState, "Internal search error", "Fallback", "Provide guidance without crashing");
        response = `Search had an issue. Try refining your phrase like: "find documents about <topic>".`;
      }
    } else if ((intent && intent.kind === "web.search") || needsWebSearch) {
      await addThinkingStep(ctx, agentState, "execution", "Initiating web search via MCP…");
      const searchResult = await performWebSearch(ctx, agentState, message);
      response = searchResult;

      const looksFailed =
        searchResult.toLowerCase().startsWith("search encountered an issue") ||
        searchResult.toLowerCase().startsWith("web search encountered an issue") ||
        searchResult.includes("MCP execution failed") ||
        (searchResult.length < 50 && searchResult.toLowerCase().includes("error"));

      if (looksFailed) {
        await addThinkingStep(ctx, agentState, "evaluation", "Web search failed → fallback to knowledge");
        await addAdaptation(ctx, agentState, "Search failed", "Fallback", "Use internal knowledge");
        response = await generateKnowledgeResponse(ctx, agentState, message);
      } else {
        await addThinkingStep(ctx, agentState, "evaluation", "Web search ok → summarizing");
      }
    } else if (needsDocumentCreation) {
      await addThinkingStep(ctx, agentState, "execution", "Creating new document…");
      response = await createDocumentFromMessage(ctx, agentState, message);
    } else if (needsDocumentWork) {
      // Edit-intent policy: always prefetch initial chunk so the model "reads" the page first
      try {
        await addThinkingStep(ctx, agentState, "execution", "Prefetching document context (first chunk)…");
        const nodes = await ctx.runQuery(api.nodes.by_document, { docId: selectedDocumentId! });
        const full = (nodes || []).map((n: any) => n.text || "").filter(Boolean).join("\n\n");
        const maxChars = 1200;
        const chunk = full.slice(0, maxChars);
        await addToolCall(
          ctx, agentState,
          "nodebench_read_first_chunk",
          "Read initial document chunk",
          { documentId: selectedDocumentId, maxChars },
          { documentId: selectedDocumentId, chunk, cursor: chunk.length, isEnd: chunk.length >= full.length },
          true,
        );
        if (chunk.length === 0) {
          await addAdaptation(ctx, agentState, "Empty document", "Ask", "Request specifics or content to insert");
        }
      } catch (e) {
        await addToolCall(
          ctx, agentState,
          "nodebench_read_first_chunk",
          "Failed to read initial chunk",
          { documentId: selectedDocumentId },
          { error: String(e) },
          false,
        );
      }

      await addThinkingStep(ctx, agentState, "execution", "Updating selected document…");
      response = await workWithDocument(ctx, agentState, message);
    } else {
      await addThinkingStep(ctx, agentState, "execution", "Generating direct response…");
      response = await generateKnowledgeResponse(ctx, agentState, message);
    }

    await addThinkingStep(ctx, agentState, "evaluation", "Evaluating response for completeness…");
    if (response.length < 50) {
      await addAdaptation(ctx, agentState, "Response brief", "Enrich", "Add details");
      response = await enhanceResponse(ctx, agentState, response, message);
    }
    return response;
  } catch (error) {
    log.error("Autonomous loop failed:", error);
    await addAdaptation(ctx, agentState, "Execution error", "Fallback", "Provide safe response");
    return `I encountered an issue processing your request: "${message}". Let me provide what I can based on available capabilities.`;
  }
}

export const chatWithAgent = action({
  args: {
    message: v.string(),
    selectedDocumentId: v.optional(v.id("documents")),
    model: v.optional(v.union(v.literal("openai"), v.literal("gemini"))),
    threadId: v.optional(v.string()),
    mcpServerId: v.optional(v.id("mcpServers")),
    openaiVariant: v.optional(v.union(v.literal("gpt-5-nano"), v.literal("gpt-5-mini"))),
  },
  handler: async (ctx, { message, selectedDocumentId, model = "openai", threadId, mcpServerId, openaiVariant }) => {
    log.info("🤖 [AUTONOMOUS] start", { model, len: message.length, selectedDocumentId });

    // Optional "Context Summary" prefix
    let parsedUiSummary: string | undefined;
    let userMessage = message;
    const ctxMatch = /^Context Summary:\n([\s\S]*?)\n---\nUser Message:\n([\s\S]*)$/m.exec(message);
    if (ctxMatch) {
      parsedUiSummary = ctxMatch[1].trim();
      userMessage = ctxMatch[2].trim();
    }

    // Fallback: derive selectedDocumentId from UI Summary when not explicitly provided
    let selectedDocFromUi: Id<"documents"> | undefined = undefined;
    try {
      if (!selectedDocumentId && parsedUiSummary) {
        const m = /^Focused:\s*doc=([^\s]+)/m.exec(parsedUiSummary);
        if (m && m[1]) selectedDocFromUi = m[1] as any;
      }
    } catch {}

    const effectiveSelectedDocId = (selectedDocumentId as Id<"documents"> | undefined) ?? selectedDocFromUi;

    const userId = await ensureUserId(ctx);
    const actualThreadId =
      threadId ||
      (await ctx.runAction(api.aiAgents.getOrCreateThread, {
        documentId: effectiveSelectedDocId,
      }));

    // Agent State
    const agentState: AgentState = {
      thinkingSteps: [],
      toolCalls: [],
      adaptations: [],
      context: {
        userId,
        selectedDocumentId: effectiveSelectedDocId,
        mcpServerId,
        model,
        message: userMessage,
        openaiVariant,
        uiSummary: parsedUiSummary,
        threadId: actualThreadId,
      },
    };


	    // Start streaming run
	    const runId = await ctx.runMutation((internal as any).aiAgents.startAgentRun, {
	      threadId: actualThreadId,
	      documentId: effectiveSelectedDocId,
	      mcpServerId,
	      model,
	      openaiVariant,
	    });
	    agentState.context.runId = runId as Id<"agentRuns">;
	    // Seed initial events
	    try {
	      await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
	        runId,
	        kind: "message",
	        message: userMessage.slice(0, 2000),
	      });
	      if (parsedUiSummary) {
	        await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
	          runId,
	          kind: "context",
	          message: parsedUiSummary.slice(0, 2000),
	        });
	      }

              // Emit initial doc context if present
              try {
                if (effectiveSelectedDocId) {
                  await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
                    runId,
                    kind: "context.docs",
                    data: { ids: [effectiveSelectedDocId] },
                  });
                }
              } catch {}

	    } catch {}

    // Quick intent: open "calendar" (and variants)
    try {
      const wantsCalendar = /\b(open|go to|show|switch to)\b[\s\S]*\bcalendar\b/i.test(userMessage);
      if (wantsCalendar) {
        const monthMatch = userMessage.match(
          /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
        );
        const hasPlan = /\bplan(s)?\b/i.test(userMessage);
        let titleCandidate = "calendar";
        if (monthMatch) {
          const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
          titleCandidate = hasPlan ? `${cap(monthMatch[1])} calendar plan` : `${cap(monthMatch[1])} calendar`;
        }

        const openRes = await (async () => {
          const id = await resolveDocumentId(ctx, { title: titleCandidate });
          return { openedDocumentId: id };
        })();

        await addThinkingStep(ctx, agentState, "tool_selection", `Open "${titleCandidate}" via openDoc`);
        await addToolCall(ctx, agentState, "openDoc", "Open document by title", { title: titleCandidate }, openRes, true);

        const response: AgentResponse = {
          finalResponse: `Opening ${titleCandidate}…`,
          thinkingSteps: agentState.thinkingSteps,
          toolCalls: agentState.toolCalls,
          adaptations: agentState.adaptations,
          candidateDocs: [],
          planExplain: undefined,
          plan: undefined,
          runId: String(agentState.context.runId || ""),
        };
        try {
          const runId = agentState.context.runId as Id<"agentRuns"> | undefined;
          if (runId) await ctx.runMutation((internal as any).aiAgents.updateAgentRun, { runId, fields: { status: "completed", finalResponse: response.finalResponse } });
        } catch {}
        return JSON.stringify(response);
      }
    } catch (err) {
      await addToolCall(ctx, agentState, "openDoc", "Failed to open document", { title: "calendar" }, { error: String(err) }, false);
      const errorResponse: AgentResponse = {
        finalResponse: "I couldn't find a calendar document to open.",
        thinkingSteps: agentState.thinkingSteps,
        toolCalls: agentState.toolCalls,
        adaptations: agentState.adaptations,
        candidateDocs: [],
        runId: String(agentState.context.runId || ""),
      };
      try {
        const runId = agentState.context.runId as Id<"agentRuns"> | undefined;
        if (runId) await ctx.runMutation((internal as any).aiAgents.updateAgentRun, { runId, fields: { status: "error", finalResponse: errorResponse.finalResponse } });
      } catch {}
      return JSON.stringify(errorResponse);
    }

    // Quick intent: "open <title>"
    try {
      const openIntent = /\b(open|go to|show|switch to)\b/i.test(userMessage);
      if (openIntent) {
        const quoted = userMessage.match(/["“'']([^"”'']+)["”'']/);
        let titleToOpen = quoted?.[1]?.trim();
        if (!titleToOpen) {
          const after = userMessage.split(/\b(open|go to|show|switch to)\b/i)[2] || "";
          const cleaned = after.replace(/^\s*(the\s+)?(doc(?:ument)?|file|note)\s*/i, "").trim().replace(/[.?!]$/, "");
          if (cleaned && cleaned.length >= 2) titleToOpen = cleaned;
        }
        if (titleToOpen && !/^(it|this|that|document|doc|file)$/i.test(titleToOpen)) {
          const titles = titleToOpen
            .split(/\s*(?:,|\band\b)\s*/i)
            .map((t) => t.trim())
            .filter(Boolean);

          const opened: string[] = [];
          for (const t of titles) {
            try {
              const id = await resolveDocumentId(ctx, { title: t });
              const openRes = { openedDocumentId: id };
              await addThinkingStep(ctx, agentState, "tool_selection", `Open "${t}" via openDoc`);
              await addToolCall(ctx, agentState, "openDoc", "Open document by title", { title: t }, openRes, true);
              opened.push(t);
            } catch (e) {
              await addToolCall(ctx, agentState, "openDoc", "Failed to open document", { title: t }, { error: String(e) }, false);
            }
          }

          if (opened.length > 0) {
            const response: AgentResponse = {
              finalResponse: `Opening ${opened.map((n) => `"${n}"`).join(" and ")}…`,
              thinkingSteps: agentState.thinkingSteps,
              toolCalls: agentState.toolCalls,
              adaptations: agentState.adaptations,
              candidateDocs: [],
              runId: String(agentState.context.runId || ""),
            };
            try {
              const runId = agentState.context.runId as Id<"agentRuns"> | undefined;
              if (runId) await ctx.runMutation((internal as any).aiAgents.updateAgentRun, { runId, fields: { status: "completed", finalResponse: response.finalResponse } });
            } catch {}
            return JSON.stringify(response);
          }
        }
      }
    } catch (err) {
      // Non-fatal; proceed with autonomous flow
      await addToolCall(ctx, agentState, "openDoc", "Failed to open (quick intent)", {}, { error: String(err) }, false);
    }

    try {
      await addThinkingStep(ctx, agentState, "analysis", await analyzeUserIntent(ctx, userMessage, model));
      await addThinkingStep(ctx, agentState, "planning", await gatherContext(ctx, agentState.context));

      // Optional: hybrid RAG search for candidate docs (non-fatal)
      let ragCandidateDocs: any[] = [];
      try {
        const ragRes = await ctx.runAction(internal.rag.answerQuestionViaRAG, { prompt: userMessage });
        ragCandidateDocs = Array.isArray(ragRes?.candidateDocs) ? ragRes.candidateDocs : [];
        await addToolCall(
          ctx, agentState,
          "hybrid_search",
          "Hybrid RAG search across KB",
          { prompt: userMessage },
          { candidateDocsCount: ragCandidateDocs.length },
          true,
        );

      // Announce multi-doc context (selected + RAG candidates)
      try {
        const runId = agentState.context.runId as Id<"agentRuns"> | undefined;
        if (runId) {
          const ids: any[] = [];
          const sid: any = (agentState.context as any).selectedDocumentId || selectedDocumentId;
          if (sid) ids.push(sid);
          for (const d of ragCandidateDocs) {
            const id = d?._id || d?.documentId || d?.id;
            if (id) ids.push(id);
          }
          const unique = Array.from(new Set(ids.map(String)));
          if (unique.length) {
            await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
              runId,
              kind: "context.docs",
              data: { ids: unique },
            });
          }
        }
      } catch {}


      } catch (e) {
        await addToolCall(
          ctx, agentState,
          "hybrid_search",
          "Hybrid RAG search failed",
          { prompt: userMessage },
          { error: String(e) },
          false,
        );
      }

      await addThinkingStep(ctx, agentState, "tool_selection", await planToolUsage(ctx, userMessage, agentState.context));
      const finalResponse = await executeAutonomousLoop(ctx, agentState);

      // Try to generate structured pmOperations using Zod structured outputs (OpenAI only)
      let pmOperations: any[] | undefined;
      try {
        pmOperations = await tryGeneratePmOpsWithStructuredOutputs(ctx, agentState);
      } catch {}

      const response: AgentResponse = {
        finalResponse,
        thinkingSteps: agentState.thinkingSteps,
        toolCalls: agentState.toolCalls,
        adaptations: agentState.adaptations,
        candidateDocs: ragCandidateDocs,
        pmOperations,
        runId: String(agentState.context.runId || ""),
      };
      try {
        const runId = agentState.context.runId as Id<"agentRuns"> | undefined;
        if (runId) await ctx.runMutation((internal as any).aiAgents.updateAgentRun, { runId, fields: { status: "completed", finalResponse } });
      } catch {}
      return JSON.stringify(response);
    } catch (error) {
      log.error("Autonomous agent failed:", error);
      await addAdaptation(ctx, agentState, "Critical error", "Fallback", "Provide safe deterministic summary");
      const fallback = deterministicFallbackSummary({
        message,
        model,
        selectedDocumentId,
        mcpServerId,
      });
      const errorResponse: AgentResponse = {
        finalResponse: fallback,
        thinkingSteps: agentState.thinkingSteps,
        toolCalls: agentState.toolCalls,
        adaptations: agentState.adaptations,
        candidateDocs: [],
        runId: String(agentState.context.runId || ""),
      };
      try {
        const runId = agentState.context.runId as Id<"agentRuns"> | undefined;
        if (runId) await ctx.runMutation((internal as any).aiAgents.updateAgentRun, { runId, fields: { status: "error", finalResponse: fallback } });
      } catch {}
      return JSON.stringify(errorResponse);
    }
  },
});

export const listMessages = query({
  args: {
    threadId: v.id("threads"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { threadId, paginationOpts }): Promise<PaginationResult<MessageDoc>> => {
    const userId = await ensureUserId(ctx);
    const thread = await ctx.runQuery(components.agent.threads.getThread, { threadId });
    if (thread?.userId !== userId) throw new Error("Unauthorized");
    return await documentAgent.listMessages(ctx, { threadId, paginationOpts });
  },
});

/* ========================================================================== *
 *              NATURAL LANGUAGE → MCP TOOL PARAMS & EXECUTION
 * ========================================================================== */

export const executeToolWithNaturalLanguage = action({
  args: {
    serverId: v.string(),
    toolName: v.string(),
    naturalLanguageQuery: v.string(),
    model: v.optional(v.union(v.literal("openai"), v.literal("gemini"))),
    isLearning: v.optional(v.boolean()),
    runId: v.optional(v.id("agentRuns")),
  },
  returns: v.object({
    success: v.boolean(),
    result: v.any(),
    parameters: v.optional(v.any()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { serverId, toolName, naturalLanguageQuery, model = "openai", isLearning: _isLearning = false } = args;
    await ensureUserId(ctx);

    try {
      const server = await ctx.runQuery(api.mcp.getMcpServerById, { serverId: serverId as Id<"mcpServers"> });
      if (!server) throw new Error("MCP server not found");

      const tools = await ctx.runQuery(api.mcp.getMcpTools, { serverId: serverId as Id<"mcpServers"> });
      const tool = tools.find((t: any) => t.name === toolName);
      if (!tool) throw new Error(`Tool '${toolName}' not found on server`);

      // Convert natural language → JSON parameters using OpenAI (with streaming arg deltas when runId is provided)
      const OpenAI = await getOpenAI();
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

      const toolSchemaPretty = tool.schema ? JSON.stringify(tool.schema, null, 2) : "No schema available";
      const systemPrompt = `You convert natural language queries into JSON parameters for an MCP tool.

Tool: ${toolName}
Description: ${tool.description || "No description"}
Schema: ${toolSchemaPretty}

Return ONLY valid JSON that matches the tool's schema.`;

      let parameters: any | undefined = undefined;
      if (model === "openai" && args.runId && tool.schema && typeof tool.schema === "object") {
        try {
          const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: naturalLanguageQuery },
          ];
          const toolsPayload: any[] = [
            {
              type: "function",
              function: {
                name: `mcp_${toolName}`,
                description: `Parameters for ${toolName}`,
                parameters: tool.schema,
              },
            },
          ];
          const final: any = await ctx.runAction((internal as any).aiAgents.openaiStreamWithTools, {
            runId: args.runId as Id<"agentRuns">,
            messages,
            tools: toolsPayload,
            model: GPT5_MINI,
          });
          const tc = final?.choices?.[0]?.message?.tool_calls?.[0];
          const argStr = tc?.function?.arguments || "";
          if (argStr) {
            parameters = JSON.parse(argStr);
          }
        } catch (e) {
          log.warn("[MCP] Streaming tool-arg generation failed; falling back.", e);
        }
      }

      if (parameters === undefined) {
        const parametersText = await safeChatCompletion(openaiClient, {
          model: GPT5_MINI,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: naturalLanguageQuery },
          ],
        });
        if (!parametersText) throw new Error("Failed to generate tool parameters");
        try {
          parameters = JSON.parse(parametersText);
        } catch {
          throw new Error(`Invalid JSON parameters generated: ${parametersText}`);
        }
      }

      // Execute tool (routes to OpenAI/Gemini flavor internally)
      const startTime = Date.now();
      const result: any = await ctx.runAction(internal.aiAgents.executeMcpToolWithModel, {
        mcpServerId: serverId as Id<"mcpServers">,
        toolName,
        arguments: parameters,
        model,
      });

      const _executionTime = Date.now() - startTime;
      const isSuccess = result && !result.error;

      // Update aggregate tool usage counters
      try {
        await ctx.runMutation(internal.mcp.updateToolUsage, {
          toolId: tool._id as Id<"mcpTools">,
          success: !!isSuccess,
        });
      } catch (e) {
        log.warn("[MCP] updateToolUsage failed", e);
      }

      // Persist per-user usage history (no adaptive learning)
      try {
        const userId = await ensureUserId(ctx);
        let resultPreview: string | undefined;
        if (isSuccess) {
          if (typeof result === "string") {
            resultPreview = result.slice(0, 800);
          } else if (typeof result?.result === "string") {
            resultPreview = result.result.slice(0, 800);
          } else {
            const text = JSON.stringify(result).slice(0, 800);
            resultPreview = text;
          }
        }
        // Cast through any to avoid TS error until typegen picks up the new internal function
        await ctx.runMutation((internal as any).mcp.storeUsageHistory, {
          userId: userId as Id<"users">,
          toolId: tool._id as Id<"mcpTools">,
          serverId: serverId as Id<"mcpServers">,
          naturalLanguageQuery,
          parameters,
          executionSuccess: !!isSuccess,
          resultPreview,
          errorMessage: result?.error || undefined,
        });
      } catch (histErr) {
        log.warn("[MCP] storeUsageHistory failed", histErr);
      }

      return {
        success: true,
        result: {
          message: "🎉 Natural language AI conversion working perfectly!",
          originalQuery: naturalLanguageQuery,
          convertedParameters: parameters,
          mcpResponse: result?.result || result,
          status: isSuccess ? "MCP execution successful" : "MCP execution failed (but AI conversion worked!)",
          error: result?.error || null,
          toolExecutionSuccess: isSuccess,
        },
        parameters,
      };
    } catch (error) {
      log.error("Natural language tool execution failed:", error);
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/* ========================================================================== *
 *            MCP TOOL DISCOVERY / EXECUTION (QUERIES & INTERNAL)
 * ========================================================================== */

export const getMcpToolSchemas = query({
  args: { mcpServerId: v.id("mcpServers") },
  returns: v.array(v.any()),
  handler: async (ctx, { mcpServerId }) => {
    try {
      const tools = await ctx.db
        .query("mcpTools")
        .withIndex("by_server", (q) => q.eq("serverId", mcpServerId))
        .collect();

      return tools.map((tool) => {
        const schema = tool.schema || { type: "object", properties: {} };
        return {
          type: "function",
          function: {
            name: tool.name,
            description: tool.description || `Execute ${tool.name} tool`,
            parameters: schema,
          },
        };
      });
    } catch (error) {
      log.error("Failed to get MCP tool schemas:", error);
      return [];
    }
  },
});

export const convertMcpToolsForOpenAI = internalAction({
  args: { serverUrl: v.string() },
  returns: v.array(v.any()),
  handler: async (_ctx, { serverUrl }) => {
    try {
      const { discoverToolsWithSdk } = await import("./lib/mcpClient");
      const tools = await discoverToolsWithSdk(serverUrl);
      const openAITools = tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description || `Execute ${tool.name} tool`,
          parameters: tool.inputSchema || { type: "object", properties: {} },
        },
      }));
      log.info("[OpenAI MCP] Converted", openAITools.length, "tools");
      return openAITools;
    } catch (error) {
      log.error("[OpenAI MCP] Tool conversion failed:", error);
      return [];
    }
  },
});

export const getGeminiMcpToolSchemas = internalAction({
  args: { mcpServerId: v.optional(v.id("mcpServers")) },
  returns: v.array(
    v.object({
      name: v.string(),
      description: v.string(),
      parameters: v.any(),
    }),
  ),
  handler: async (ctx, { mcpServerId }) => {
    if (!mcpServerId) return [];

    try {
      const tools: Array<{ name: string; description?: string; inputSchema?: any }> = await ctx.runQuery(
        api.mcp.getMcpTools,
        { serverId: mcpServerId },
      );
      const { Type } = await import("@google/genai");

      return tools.map((tool) => ({
        name: tool.name,
        description: tool.description || `Execute ${tool.name} via MCP server`,
        parameters: tool.inputSchema ? convertToGeminiSchema(tool.inputSchema, Type) : { type: Type.OBJECT, properties: {} },
      }));
    } catch (error) {
      log.error("Failed to discover Gemini MCP tools:", error);
      return [];
    }
  },
});

// JSON Schema → Gemini Type
function convertToGeminiSchema(schema: any, Type: any): any {
  if (!schema) return { type: Type.OBJECT, properties: {} };
  const converted: any = { type: Type.OBJECT, properties: {} };

  if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const prop: any = value;
      if (prop.type === "string")
        converted.properties[key] = { type: Type.STRING, description: prop.description || "" };
      else if (prop.type === "number" || prop.type === "integer")
        converted.properties[key] = { type: Type.NUMBER, description: prop.description || "" };
      else if (prop.type === "boolean")
        converted.properties[key] = { type: Type.BOOLEAN, description: prop.description || "" };
      else if (prop.type === "array")
        converted.properties[key] = { type: Type.ARRAY, description: prop.description || "" };
      else converted.properties[key] = { type: Type.STRING, description: prop.description || "" };
    }
  }
  if (schema.required) converted.required = schema.required;
  return converted;
}

export const executeGeminiMcpToolNative = internalAction({
  args: { mcpServerId: v.id("mcpServers"), toolName: v.string(), arguments: v.any() },
  returns: v.any(),
  handler: async (
    ctx: any,
    { mcpServerId, toolName, arguments: toolArgs }: { mcpServerId: Id<"mcpServers">; toolName: string; arguments: any }
  ): Promise<any> => {
    try {
      log.info(`[Gemini MCP] SDK execution for '${toolName}'`);
      return await ctx.runAction(internal.aiAgents.executeMcpTool, { mcpServerId, toolName, arguments: toolArgs });
    } catch (error) {
      log.error(`[Gemini MCP] Tool execution failed:`, error);
      throw error;
    }
  },
});

export const discoverMcpTools = internalAction({
  args: { serverUrl: v.string() },
  returns: v.array(
    v.object({
      name: v.string(),
      description: v.optional(v.string()),
      inputSchema: v.optional(v.any()),
    }),
  ),
  handler: async (_ctx, { serverUrl }) => {
    try {
      const { discoverToolsWithSdk } = await import("./lib/mcpClient");
      const tools = await discoverToolsWithSdk(serverUrl);
      log.info("[MCP SDK] Discovered", tools.length, "tools");
      return tools;
    } catch (error) {
      log.error("[MCP SDK] discovery failed:", error);
      throw error;
    }
  },
});

export const executeMcpToolWithModel = internalAction({
  args: {
    mcpServerId: v.id("mcpServers"),
    toolName: v.string(),
    arguments: v.any(),
    model: v.optional(v.union(v.literal("openai"), v.literal("gemini"))),
  },
  returns: v.any(),
  handler: async (
    ctx: any,
    {
      mcpServerId,
      toolName,
      arguments: toolArgs,
      model = "openai",
    }: { mcpServerId: Id<"mcpServers">; toolName: string; arguments: any; model?: "openai" | "gemini" }
  ): Promise<any> => {
    try {
      log.info(`[MCP] exec '${toolName}' with model=${model}`);
      if (model === "gemini") {
        return await ctx.runAction(internal.aiAgents.executeGeminiMcpToolNative, {
          mcpServerId,
          toolName,
          arguments: toolArgs,
        });
      }
      return await ctx.runAction(internal.aiAgents.executeMcpTool, { mcpServerId, toolName, arguments: toolArgs });
    } catch (error) {
      log.error("[MCP] Tool execution failed:", error);
      throw error;
    }
  },
});

export const executeMcpTool = internalAction({
  args: { mcpServerId: v.id("mcpServers"), toolName: v.string(), arguments: v.any() },
  returns: v.any(),
  handler: async (ctx, { mcpServerId, toolName, arguments: toolArgs }) => {
    try {
      const map: Record<string, string> = { search: "tavily_search" };
      const corrected = map[toolName] || toolName;
      if (corrected !== toolName) log.info(`[MCP SDK] Auto-correct '${toolName}' → '${corrected}'`);

      const server = await ctx.runQuery(api.mcp.getMcpServerById, { serverId: mcpServerId });
      if (!server || !server.url) throw new Error("MCP server not found or URL not configured");

      const { executeToolWithSdk } = await import("./lib/mcpClient");
      const result = await executeToolWithSdk(server.url, corrected, toolArgs);

      log.info(`[MCP SDK] Tool '${corrected}' executed`);
      if (result?.content && Array.isArray(result.content)) {
        const text = result.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
        return text || result;
      }
      return result;
    } catch (error) {
      log.error("[MCP SDK] Tool execution failed:", error);
      throw error;
    }
  },
});

/** Refresh tools from MCP server (discovers & stores any new ones) */
export const refreshMcpTools = action({
  args: { serverId: v.id("mcpServers") },
  returns: v.object({ discovered: v.number(), added: v.number() }),
  handler: async (ctx, { serverId }) => {
    await ensureUserId(ctx);

    const server = await ctx.runQuery(api.mcp.getMcpServerById, { serverId });
    if (!server) throw new Error("Server not found");
    if (!server.url) throw new Error("Server URL not configured");

    const discoveredTools: Array<{ name: string; description?: string; inputSchema?: any }> = await ctx.runAction(
      internal.aiAgents.discoverMcpTools,
      { serverUrl: server.url },
    );

    const existingTools = await ctx.runQuery(api.mcp.getMcpTools, { serverId });
    const existing = new Set(existingTools.map((t: { name: string }) => t.name));

    let addedCount = 0;
    for (const tool of discoveredTools) {
      if (!existing.has(tool.name)) {
        try {
          await ctx.runMutation(api.mcp.addMcpTool, {
            serverId,
            name: tool.name,
            description: tool.description || "",
            inputSchema: tool.inputSchema || {},
          });
          addedCount++;
        } catch (e) {
          log.warn("Failed to add tool", tool.name, e);
        }
      }
    }
    return { discovered: discoveredTools.length, added: addedCount };
  },
});


/* ========================================================================== *
 *                         AGENT RUNS (Streaming)
 * ========================================================================== */
export const startAgentRun = internalMutation({
  args: {
    threadId: v.optional(v.string()),
    documentId: v.optional(v.id("documents")),
    mcpServerId: v.optional(v.id("mcpServers")),
    model: v.optional(v.string()),
    openaiVariant: v.optional(v.string()),
  },
  returns: v.id("agentRuns"),
  handler: async (ctx, { threadId, documentId, mcpServerId, model, openaiVariant }) => {
    const userId = await ensureUserId(ctx);
    const now = Date.now();
    const runId = await ctx.db.insert("agentRuns", {
      userId,
      threadId,
      documentId,
      mcpServerId,
      model,
      openaiVariant,
      status: "running",
      nextSeq: 1,
      createdAt: now,
      updatedAt: now,

    });
    return runId;
  },
});

export const appendRunEvent = internalMutation({
  args: {
    runId: v.id("agentRuns"),
    kind: v.string(),
    message: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  returns: v.object({ seq: v.number() }),
  handler: async (ctx, { runId, kind, message, data }) => {
    // Avoid reading or patching the agentRuns document to prevent write conflicts under high concurrency.
    // Use a time-based monotonic sequence for ordering within a run.
    const now = Date.now();
    const seq = now;
    await ctx.db.insert("agentRunEvents", { runId, seq, kind, message, data, createdAt: now });
    return { seq };
  },
});

export const updateAgentRun = internalMutation({
  args: { runId: v.id("agentRuns"), fields: v.any() },
  returns: v.null(),
  handler: async (ctx, { runId, fields }) => {
    await ctx.db.patch(runId, { ...fields, updatedAt: Date.now() });
    return null;
  },
});

export const getAgentRun = query({
  args: { runId: v.id("agentRuns") },
  returns: v.any(),
  handler: async (ctx, { runId }) => {
    return await ctx.db.get(runId);
  },
});

export const listAgentRunEvents = query({
  args: { runId: v.id("agentRuns") },
  returns: v.array(v.any()),
  handler: async (ctx, { runId }) => {
    return await ctx.db
      .query("agentRunEvents")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .collect();
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
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI();

    // Try to enrich uiSummary from latest run if not provided
    let ui = uiSummary;
    try {
      if (!ui && threadId) {
        const run: any = await ctx.runQuery((api as any).aiAgents.latestAgentRunForThread, { threadId });
        const runId = run?._id;
        if (runId) {
          const events: any[] = await ctx.runQuery((api as any).aiAgents.listAgentRunEvents, { runId });
          const ctxEvents = events.filter((e) => e.kind === "context");
          if (ctxEvents.length > 0) ui = String(ctxEvents[ctxEvents.length - 1]?.message ?? "");
        }
      }
    } catch {}

    // Recent docs context for additional routing hints
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
    // Fallback to first candidate
    return { id: candidates[0].id } as any;
  },
});


export const openaiStreamWithTools = internalAction({
  args: {
    runId: v.id("agentRuns"),
    messages: v.array(v.any()),
    tools: v.array(v.any()),
    model: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, { runId, messages, tools, model }) => {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI();
    const toolsToUse = (Array.isArray(tools) && tools.length > 0) ? tools : (agentToolsOpenAI as any);
    const stream: any = await (client as any).chat.completions.stream({
      model,
      messages,
      tools: toolsToUse,
      stream: true,
    });

    const pending: Promise<any>[] = [];

    stream.on("tool_calls.function.arguments.delta", (ev: any) => {
      const p = ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
        runId,
        kind: "tool.args.delta",
        data: { index: ev?.index, name: ev?.name, delta: ev?.delta },
      }).catch(() => {});
      pending.push(p);
    });

    stream.on("tool_calls.function.arguments.done", (ev: any) => {
      const p = ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
        runId,
        kind: "tool.args.done",
        data: { index: ev?.index, name: ev?.name, arguments: ev?.arguments },
      }).catch(() => {});
      pending.push(p);
    });

    const final = await stream.finalChatCompletion();
    // Ensure all streaming event writes complete before returning to avoid dangling promises.
    await Promise.all(pending);
    return final;
  },
});

export const latestAgentRunForThread = query({
  args: { threadId: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, { threadId }) => {
    const userId = await ensureUserId(ctx);
    const rows = await ctx.db
      .query("agentRuns")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("desc")
      .take(1);
    const run = rows[0] || null;
    if (!run) return null;
    if (run.userId !== userId) return null;
    return run;
  },
});

export const latestAgentRunForUser = query({
  args: {},
  returns: v.union(v.any(), v.null()),
  handler: async (ctx) => {
    const userId = await ensureUserId(ctx);
    const rows = await ctx.db
      .query("agentRuns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1);
    return rows[0] || null;
  },
});

/* ========================================================================== *
 *                    INTERNAL: DOCUMENT CREATION / INDEX
 * ========================================================================== */

export const internalCreateDocument = internalMutation({
  args: { title: v.string(), content: v.string() },
  handler: async (ctx, { title, content }) => {
    const userId = await ensureUserId(ctx);

    // Convert incoming MARKDOWN into editor doc structure via parseMarkdownToBlocks
    const blocks = parseMarkdownToBlocks(content);

    // Simple id generator fallback
    const generateId = () =>
      (globalThis as any).crypto?.randomUUID?.() ?? "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

    // Convert to editor structure (kept compatible with original)
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

    const convertBlock = (block: any): any => {
      let blockContent: any;
      switch (block.type) {
        case "heading":
          blockContent = { type: "heading", attrs: { textAlignment: "left", level: block.level || 1 }, content: parseTextContent(block.text) };
          break;
        case "paragraph":
          blockContent = { type: "paragraph", attrs: { textAlignment: "left" }, content: parseTextContent(block.text) };
          break;
        case "bulletListItem":
          blockContent = { type: "bulletListItem", attrs: { textAlignment: "left" }, content: parseTextContent(block.text) };
          break;
        case "checkListItem":
          blockContent = {
            type: "checkListItem",
            attrs: { textAlignment: "left", checked: block.checked || false },
            content: parseTextContent(block.text),
          };
          break;
        case "codeBlock":
          blockContent = { type: "codeBlock", attrs: { language: block.lang || "text" }, content: block.text ? [{ type: "text", text: block.text }] : [] };
          break;
        case "quote":
          blockContent = { type: "quote", attrs: { textAlignment: "left" }, content: parseTextContent(block.text) };
          break;
        case "horizontalRule":
          blockContent = { type: "horizontalRule", attrs: {} };
          break;
        default:
          blockContent = { type: "paragraph", attrs: { textAlignment: "left" }, content: parseTextContent(block.text) };
      }
      return {
        type: "blockContainer",
        attrs: { id: generateId(), textColor: "default", backgroundColor: "default" },
        content: [blockContent],
      };
    };

    const convertedBlocks = blocks.map(convertBlock);
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

export const getThreadMetadata = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    return await ctx.runQuery(components.agent.threads.getThread, { threadId });
  },
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

// Apply a structured agent plan into a timeline (bridge to agentTimelines.applyPlan)
export const applyPlanToTimeline = action({
  args: {
    timelineId: v.id("agentTimelines"),
    baseStartMs: v.optional(v.number()),
    tasks: v.array(v.object({
      id: v.string(),
      parentId: v.union(v.string(), v.null()),
      name: v.string(),
      startOffsetMs: v.optional(v.number()),
      durationMs: v.number(),
      agentType: v.optional(v.union(v.literal("orchestrator"), v.literal("main"), v.literal("leaf"))),
      status: v.optional(v.union(v.literal("pending"), v.literal("running"), v.literal("complete"), v.literal("paused"))),
    })),
    links: v.array(v.object({ sourceId: v.string(), targetId: v.string(), type: v.optional(v.string()) })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(api.agentTimelines.applyPlan, args as any);
    return null;
  },
});
