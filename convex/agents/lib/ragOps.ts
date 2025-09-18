import { components, api, internal } from "../../_generated/api";
import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";

// Centralized RAG instance and thin helpers to keep aiAgents.ts lean.
const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

export async function ragSearch(
  ctx: any,
  opts: { query: string; namespace?: string }
): Promise<any> {
  const namespace: string = opts.namespace ?? "default";
  const query: string = opts.query;
  return rag.search(ctx, { namespace, query });
}

export async function ragAdd(
  ctx: any,
  opts: { namespace: string; key?: string; text: string; metadata?: any }
): Promise<any> {
  return rag.add(ctx, opts);
}

// Optional convenience wrappers (used by some tools)
export async function ragAsk(ctx: any, prompt: string): Promise<{ answer: string; contextText: string }> {
  return ctx.runAction(api.rag.askQuestion, { prompt });
}

export async function ragAddContextPublic(ctx: any, args: { title: string; text: string }): Promise<{ success: true }> {
  await ctx.runAction(api.rag.addContextPublic, args);
  return { success: true } as const;
}

export async function ragIngestDocument(ctx: any, documentId: string): Promise<{ success: true }> {
  await ctx.runAction(internal.rag.addDocumentToRag, { documentId });
  return { success: true } as const;
}

