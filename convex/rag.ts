"use node";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { RAG } from "@convex-dev/rag";
import { components, api, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import OpenAI from "openai";
import type { Id } from "./_generated/dataModel";

// Normalize OpenAI base URL so it includes '/v1' when needed
function normalizeOpenAIBase(base?: string | null): string | undefined {
  if (!base) return undefined;
  const trimmed = base.trim();
  if (!trimmed) return undefined;
  if (/\/v\d+\/?$/.test(trimmed)) return trimmed;
  return trimmed.replace(/\/?$/, "") + "/v1";
}

/* ------------------------------------------------------------------ */
/* Convex RAG setup                                                   */
/* ------------------------------------------------------------------ */
// Configure RAG instance. FilterTypes are optional; kept simple here.
const rag = new RAG(components.rag, {
  filterNames: [],
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

/* ------------------------------------------------------------------ */
/* Candidate Docs Validator                                            */
/* ------------------------------------------------------------------ */
export const candidateDocValidator = v.object({
  documentId: v.id("documents"),
  title: v.string(),
  snippet: v.optional(v.string()),
  score: v.optional(v.number()),
  source: v.optional(
    v.union(v.literal("vector"), v.literal("keyword"), v.literal("hybrid"))
  ),
  nodeId: v.optional(v.id("nodes")),
  highlights: v.optional(v.array(v.string())),
  rank: v.optional(v.number()),
  reasons: v.optional(v.array(v.string())),
});

// Public wrapper to allow adding context from the client if desired
export const addContextPublic = action({
  args: { title: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction(internal.rag.addContext, args);
    return null;
  },
});

/* ------------------------------------------------------------------ */
/* Action: askQuestion (public)                                        */
/* ------------------------------------------------------------------ */
export const askQuestion = action({
  args: { prompt: v.string() },
  returns: v.object({
    answer: v.string(),
    contextText: v.string(),
    candidateDocs: v.array(candidateDocValidator),
  }),
  handler: async (ctx, { prompt }): Promise<{ answer: string; contextText: string; candidateDocs: any[] }> => {
    return await ctx.runAction(internal.rag.answerQuestionViaRAG, { prompt });
  },
});

/* ------------------------------------------------------------------ */
/* Action: addContext                                                  */
/* ------------------------------------------------------------------ */
export const addContext = internalAction({
  args: { title: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { title, text }) => {
    await rag.add(ctx, {
      namespace: "global",
      title,
      key: title,
      text,
    });
    return null;
  },
});

/* ------------------------------------------------------------------ */
/* Action: addDocumentToRag                                           */
/* ------------------------------------------------------------------ */
export const addDocumentToRag = internalAction({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.null(),
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.runQuery(api.documents.getById, { documentId });
    if (!doc) throw new Error("document not found");

    // Attempt to extract plain text from TipTap JSON; fallback to raw content
    let plain = "";
    try {
      const contentStr = String((doc as any).content ?? "");
      const maybeJson = JSON.parse(contentStr);
      // Lazy import to avoid cyclic deps during build
      const { extractTextFromTipTap } = await import("./lib/markdownToTipTap");
      plain = extractTextFromTipTap(maybeJson as any) || contentStr;
    } catch {
      plain = String((doc as any).content ?? "");
    }

    const text = `${(doc as any).title}\n\n${plain}`;
    await rag.add(ctx, {
      namespace: "global",
      key: documentId, // unique key
      chunks: text.split(/\n\n+/),
    });
    return null;
  },
});

/* keywordSearch moved to V8 file convex/rag_queries.ts */

/* ------------------------------------------------------------------ */
/* InternalAction: answerQuestionViaRAG (hybrid vector + keyword)      */
/* ------------------------------------------------------------------ */
export const answerQuestionViaRAG = internalAction({
  args: { prompt: v.string() },
  returns: v.object({
    answer: v.string(),
    contextText: v.string(),
    candidateDocs: v.array(candidateDocValidator),
  }),
  handler: async (ctx, { prompt }): Promise<{ answer: string; contextText: string; candidateDocs: Array<{
    documentId: Id<"documents">; title: string; snippet?: string; score?: number; source?: "vector"|"keyword"|"hybrid"; nodeId?: Id<"nodes">; highlights?: string[]; rank?: number; reasons?: string[];
  }> }> => {
    // 1) Vector search via RAG
    const vector = await rag.search(ctx, {
      namespace: "global",
      query: prompt,
      limit: 5,
      chunkContext: { before: 1, after: 1 },
    });

    // 2) Keyword search via index on nodes.text (defined in rag_queries.ts)
    const keyword: Array<{ nodeId: Id<"nodes">; documentId: Id<"documents">; text?: string }>
      = await ctx.runQuery(api.rag_queries.keywordSearch, { query: prompt, limit: 5 });
    const keywordText: string = keyword
      .map((k: { documentId: Id<"documents">; text?: string }) => `• [doc ${k.documentId}] ${k.text ?? ""}`)
      .filter(Boolean)
      .join("\n");

    const contextText: string = [
      vector.text?.trim() ? `# Vector Context\n${vector.text}` : "",
      keywordText ? `# Keyword Matches\n${keywordText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");

    // Build candidateDocs from vector + keyword results
    type Cand = {
      documentId: Id<"documents">;
      title: string;
      snippet?: string;
      score?: number;
      source?: "vector" | "keyword" | "hybrid";
      nodeId?: Id<"nodes">;
      highlights?: string[];
      rank?: number;
      reasons?: string[];
    };

    const byDoc: Map<string, Cand> = new Map();

    // Vector: compute per-entry score and map to document via entry.key (set to documentId in addDocumentToRag)
    try {
      const vectorResults: any[] = Array.isArray((vector as any).results) ? (vector as any).results : [];
      const vectorEntries: any[] = Array.isArray((vector as any).entries) ? (vector as any).entries : [];

      const scoreByEntry: Record<string, number> = {};
      for (const r of vectorResults) {
        if (r && r.entryId) {
          const s = typeof r.score === "number" ? r.score : 0.5;
          scoreByEntry[r.entryId] = Math.max(scoreByEntry[r.entryId] ?? 0, s);
        }
      }

      const entryById: Record<string, any> = {};
      for (const e of vectorEntries) {
        if (e && e.entryId) entryById[e.entryId] = e;
      }

      for (const entryId of Object.keys(scoreByEntry)) {
        const e = entryById[entryId];
        if (!e) continue;
        const key = e.key as string | undefined;
        if (!key) continue; // no document mapping
        const docId = key as unknown as Id<"documents">;
        const title = typeof e.title === "string" && e.title.trim() ? e.title.trim() : String(docId);

        // Build a snippet from the first matching range, if available
        const firstRange = vectorResults.find((r) => r.entryId === entryId);
        let snippet: string | undefined = undefined;
        if (firstRange && Array.isArray(firstRange.content)) {
          snippet = firstRange.content.map((c: any) => (typeof c.text === "string" ? c.text : "")).join("\n").trim();
          if (snippet && snippet.length > 320) snippet = snippet.slice(0, 317) + "…";
        } else if (typeof e.text === "string") {
          snippet = e.text.slice(0, 320);
        }

        const existing = byDoc.get(String(docId));
        const score = scoreByEntry[entryId];
        const cand: Cand = {
          documentId: docId,
          title,
          snippet,
          score,
          source: existing ? "hybrid" : "vector",
        };
        byDoc.set(String(docId), existing ? { ...existing, ...cand, score: Math.max(existing.score ?? 0, score) } : cand);
      }
    } catch {
      // ignore vector mapping errors
    }

    // Keyword-based candidates (BM25-like ranking)
    keyword.forEach((k, idx) => {
      const docId = k.documentId;
      const existing = byDoc.get(String(docId));
      const score = Math.max(0, 1 - idx * 0.15); // simple rank-based score: 1.0, 0.85, ...
      const base: Cand = {
        documentId: docId,
        title: String(docId), // will replace with real title below
        snippet: k.text?.slice(0, 320),
        score,
        source: existing ? "hybrid" : "keyword",
        nodeId: k.nodeId,
      };
      byDoc.set(String(docId), existing ? { ...existing, ...base, score: Math.max(existing.score ?? 0, score), source: existing.source === "vector" ? "hybrid" : existing.source } : base);
    });

    // Hydrate titles
    for (const [, cand] of Array.from(byDoc.entries())) {
      try {
        const doc = await ctx.runQuery(api.documents.getById, { documentId: cand.documentId });
        if (doc?.title) {
          cand.title = doc.title;
        }
      } catch {
        // ignore title fetch errors
      }
    }

    // Finalize ordering and ranks
    const candidateDocs = Array.from(byDoc.values())
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((c, i) => ({ ...c, rank: i + 1 }));

    // 3) Ask the model to answer using the combined context (with safe fallback)
    let answer = "";
    try {
      const orKey = process.env.OPENROUTER_API_KEY;
      const oaKey = process.env.OPENAI_API_KEY || process.env.CONVEX_OPENAI_API_KEY;

      // Provider-aware base URL selection with strong precedence:
      // - If OPENROUTER_API_KEY is set, use OpenRouter base (OPENROUTER_BASE_URL or default),
      //   ignoring OPENAI_BASE_URL to avoid mixing providers.
      // - Otherwise, use OpenAI base envs.
      const baseURL = orKey
        ? (process.env.OPENROUTER_BASE_URL?.trim() || 'https://openrouter.ai/api/v1')
        : normalizeOpenAIBase(process.env.OPENAI_BASE_URL || process.env.CONVEX_OPENAI_BASE_URL);
      const apiKey = orKey || oaKey;
      if (!apiKey) {
        throw new Error("Missing OpenAI/OpenRouter API key");
      }
      const headers: Record<string,string> = {};
      if (orKey) {
        headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL || 'https://nodebench-ai.vercel.app/';
        if (process.env.OPENROUTER_SITE_NAME) headers['X-Title'] = process.env.OPENROUTER_SITE_NAME;
      }
      const client = new OpenAI({ apiKey, baseURL, ...(Object.keys(headers).length ? { defaultHeaders: headers as any } : {}) } as any);
      const system =
        "Use the provided context to answer the user's question. Cite which parts of the context you used. If unsure, say so.";
      const model = process.env.OPENAI_MODEL || (orKey ? 'z-ai/glm-4.6' : 'gpt-5-nano');
      const completion: any = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `# Context\n${contextText}\n\n---\n\n# Question\n${prompt}` },
        ],
      });
      answer = completion.choices[0]?.message?.content ?? "";
    } catch (err) {
      console.error("[RAG] OpenAI generation failed, falling back:", err);
      // Fallback: return a helpful non-500 response with the retrieved context
      if (contextText?.trim()) {
        const top = candidateDocs.slice(0, 3).map((c) => `- ${c.title}`).join("\n");
        answer =
          "I couldn't generate an answer from the language model right now. " +
          "Here are the top matching documents from your knowledge base:\n" +
          top +
          (top ? "\n\n" : "") +
          "You can try again in a moment.";
      } else {
        answer =
          "I couldn't access the language model and found no relevant context to answer this question.";
      }
    }

    return { answer, contextText, candidateDocs };
  },
});

/* ------------------------------------------------------------------ */
/* Action: semanticSearch (moved from query to action)                 */
/* ------------------------------------------------------------------ */
export const semanticSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, { query, limit }) => {
    const { results } = await rag.search(ctx as any, {
      namespace: "global",
      limit: limit ?? 5,
      query,
    } as any);
    return results as any[];
  },
});
