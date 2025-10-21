/**
 * Enhanced RAG Implementation with Metadata, Filters, and LLM Validation
 * 
 * Based on Convex RAG best practices:
 * - https://docs.convex.dev/search/vector-search
 * - https://docs.convex.dev/agents/rag/
 * - https://github.com/get-convex/rag/blob/main/example/convex/getText.ts
 * - https://github.com/get-convex/rag/blob/main/example/convex/example.ts
 * 
 * Features:
 * - Document metadata (type, category, userId) for filtering
 * - User-scoped namespaces for privacy
 * - LLM-powered validation and re-ranking
 * - Smart chunking with context preservation
 * - Hybrid search (vector + keyword + LLM judge)
 */

"use node";
import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { RAG, defaultChunker } from "@convex-dev/rag";
import { components, api, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import OpenAI from "openai";
import type { Id } from "./_generated/dataModel";

/* ------------------------------------------------------------------ */
/* Types and Filters                                                  */
/* ------------------------------------------------------------------ */

export type DocumentFilters = {
  documentType: "text" | "file" | "timeline" | "dossier" | null;
  category: string | null;
  userId: string;
};

export type DocumentMetadata = {
  documentId: Id<"documents">;
  createdBy: Id<"users">;
  lastModified: number;
  isPublic: boolean;
};

/* ------------------------------------------------------------------ */
/* Enhanced RAG Instance with Filters                                 */
/* ------------------------------------------------------------------ */

const ragEnhanced = new RAG<DocumentFilters, DocumentMetadata>(components.rag, {
  filterNames: ["documentType", "category", "userId"],
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

/* ------------------------------------------------------------------ */
/* Smart Chunking with Context Preservation                           */
/* ------------------------------------------------------------------ */

/**
 * Smart chunker that preserves context and adds overlap
 * Based on defaultChunker but with improvements
 */
function smartChunker(text: string, options?: {
  maxChunkSize?: number;
  overlapSize?: number;
}): string[] {
  const maxChunkSize = options?.maxChunkSize || 1000;
  const overlapSize = options?.overlapSize || 100;

  // Use default chunker as base
  const baseChunks = defaultChunker(text);
  
  // Add overlap between chunks for better context
  const chunksWithOverlap: string[] = [];
  for (let i = 0; i < baseChunks.length; i++) {
    let chunk = baseChunks[i];
    
    // Add overlap from previous chunk
    if (i > 0 && overlapSize > 0) {
      const prevChunk = baseChunks[i - 1];
      const overlap = prevChunk.slice(-overlapSize);
      chunk = overlap + "\n...\n" + chunk;
    }
    
    chunksWithOverlap.push(chunk);
  }
  
  return chunksWithOverlap;
}

/* ------------------------------------------------------------------ */
/* Add Document to Enhanced RAG                                       */
/* ------------------------------------------------------------------ */

export const addDocumentToEnhancedRag = internalAction({
  args: {
    documentId: v.id("documents"),
    userId: v.id("users"),
  },
  returns: v.object({
    success: v.boolean(),
    entryId: v.optional(v.string()),
    chunksCount: v.optional(v.number()),
  }),
  handler: async (ctx, { documentId, userId }) => {
    try {
      // Fetch document
      const doc = await ctx.runQuery(api.documents.getById, { documentId });
      if (!doc) {
        console.error(`[addDocumentToEnhancedRag] Document not found: ${documentId}`);
        return { success: false };
      }

      // Extract plain text from TipTap JSON
      let plainText = "";
      try {
        const contentStr = String((doc as any).content ?? "");
        const maybeJson = JSON.parse(contentStr);
        const { extractTextFromTipTap } = await import("./lib/markdownToTipTap");
        plainText = extractTextFromTipTap(maybeJson as any) || contentStr;
      } catch {
        plainText = String((doc as any).content ?? "");
      }

      // Combine title and content
      const fullText = `${(doc as any).title}\n\n${plainText}`;

      // Smart chunking with overlap
      const chunks = smartChunker(fullText, {
        maxChunkSize: 1000,
        overlapSize: 100,
      });

      // Determine document type and category
      const documentType = (doc as any).documentType || "text";
      const category = (doc as any).dossierType || null;

      // Add to RAG with metadata and filters
      const result = await ragEnhanced.add(ctx, {
        namespace: userId, // User-scoped namespace for privacy
        key: documentId, // Unique key per document
        title: (doc as any).title,
        chunks,
        filterValues: [
          { name: "documentType", value: documentType },
          { name: "category", value: category },
          { name: "userId", value: userId },
        ],
        metadata: {
          documentId,
          createdBy: (doc as any).createdBy,
          lastModified: (doc as any).lastModified || doc._creationTime,
          isPublic: (doc as any).isPublic || false,
        },
      });

      console.log(`[addDocumentToEnhancedRag] Added document ${documentId} with ${chunks.length} chunks`);
      
      return {
        success: true,
        entryId: result.entryId,
        chunksCount: chunks.length,
      };
    } catch (error) {
      console.error(`[addDocumentToEnhancedRag] Error:`, error);
      return { success: false };
    }
  },
});

/* ------------------------------------------------------------------ */
/* LLM-Powered Validation and Re-Ranking                              */
/* ------------------------------------------------------------------ */

/**
 * Use LLM to validate search results and provide reasoning
 * Returns STRICT boolean relevance judgments with detailed reasoning
 */
async function validateSearchResults(
  query: string,
  results: Array<{
    documentId: Id<"documents">;
    title: string;
    snippet?: string;
    score?: number;
  }>,
  openaiClient: OpenAI
): Promise<Array<{
  documentId: Id<"documents">;
  title: string;
  snippet?: string;
  score?: number;
  isRelevant: boolean;
  relevanceReason: string;
  reRankedScore: number;
}>> {
  if (results.length === 0) {
    console.log("[validateSearchResults] No results to validate");
    return [];
  }

  console.log(`[validateSearchResults] Validating ${results.length} results for query: "${query}"`);

  try {
    // Build prompt for LLM judge with strict instructions
    const resultsText = results.map((r, idx) =>
      `${idx + 1}. Title: "${r.title}"\n   Snippet: ${r.snippet || 'N/A'}\n   Vector Score: ${r.score?.toFixed(3) || 'N/A'}`
    ).join('\n\n');

    const prompt = `You are a STRICT search relevance judge. Your job is to determine if each document is TRULY relevant to the user's query.

Query: "${query}"

Documents to evaluate:
${resultsText}

STRICT EVALUATION CRITERIA:
- A document is ONLY relevant if it directly addresses the query topic
- Partial word matches (e.g., "multi" in "multimodal" when searching for "multi-agent") are NOT relevant
- Generic mentions or tangential references are NOT relevant
- Be conservative: when in doubt, mark as NOT relevant

For EACH document, provide:
1. isRelevant: true or false (boolean, be STRICT)
2. reason: Explain in 1-2 sentences WHY it is or isn't relevant
3. score: 0.0 to 1.0 (only high scores for truly relevant documents)

Respond in JSON format:
{
  "results": [
    {
      "index": 1,
      "isRelevant": true,
      "reason": "This document directly discusses multi-agent systems architecture, which is exactly what the query is asking about.",
      "score": 0.95
    },
    {
      "index": 2,
      "isRelevant": false,
      "reason": "This document mentions 'multimodal' which contains 'multi' but is about a different topic (multimodal AI inputs), not multi-agent systems.",
      "score": 0.15
    }
  ]
}`;

    console.log("[validateSearchResults] Calling LLM judge with gpt-5-nano...");

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: "You are a strict search relevance expert. Be conservative in your judgments. Respond only with valid JSON."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent judgments
    });

    const responseContent = completion.choices[0]?.message?.content || "{}";
    console.log("[validateSearchResults] LLM response received:", responseContent.slice(0, 200) + "...");

    const response = JSON.parse(responseContent);
    const validations = response.results || [];

    console.log(`[validateSearchResults] Parsed ${validations.length} validations from LLM`);

    // Merge validations with original results
    const validatedResults = results.map((result, idx) => {
      const validation = validations.find((v: any) => v.index === idx + 1);

      if (!validation) {
        console.warn(`[validateSearchResults] No validation found for result ${idx + 1}: "${result.title}"`);
        return {
          ...result,
          isRelevant: false, // Conservative: mark as not relevant if no validation
          relevanceReason: "No validation available from LLM",
          reRankedScore: 0.0,
        };
      }

      // Ensure isRelevant is strictly boolean
      const isRelevant = validation.isRelevant === true || validation.isRelevant === "true";
      const score = typeof validation.score === 'number' ? validation.score : 0.0;

      console.log(`[validateSearchResults] Result ${idx + 1} "${result.title}": isRelevant=${isRelevant}, score=${score}, reason="${validation.reason}"`);

      return {
        ...result,
        isRelevant,
        relevanceReason: validation.reason || "No reason provided",
        reRankedScore: score,
      };
    });

    const relevantCount = validatedResults.filter(r => r.isRelevant).length;
    console.log(`[validateSearchResults] Validation complete: ${relevantCount}/${results.length} marked as relevant`);

    return validatedResults;
  } catch (error) {
    console.error("[validateSearchResults] LLM validation failed:", error);
    console.error("[validateSearchResults] Error details:", error instanceof Error ? error.message : String(error));

    // Fallback: mark all as NOT relevant to be conservative
    return results.map(r => ({
      ...r,
      isRelevant: false,
      relevanceReason: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      reRankedScore: 0.0,
    }));
  }
}

/* ------------------------------------------------------------------ */
/* Enhanced Search with LLM Validation                                */
/* ------------------------------------------------------------------ */

export const enhancedSearch = internalAction({
  args: {
    query: v.string(),
    userId: v.id("users"),
    filters: v.optional(v.object({
      documentType: v.optional(v.union(
        v.literal("text"),
        v.literal("file"),
        v.literal("timeline"),
        v.literal("dossier")
      )),
      category: v.optional(v.string()),
    })),
    limit: v.optional(v.number()),
    enableLLMValidation: v.optional(v.boolean()),
  },
  returns: v.object({
    results: v.array(v.object({
      documentId: v.id("documents"),
      title: v.string(),
      snippet: v.optional(v.string()),
      score: v.optional(v.number()),
      isRelevant: v.optional(v.boolean()),
      relevanceReason: v.optional(v.string()),
      reRankedScore: v.optional(v.number()),
      source: v.optional(v.string()),
    })),
    totalCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const enableLLMValidation = args.enableLLMValidation ?? true;

    // Check if namespace exists first
    const namespace = await ragEnhanced.getNamespace(ctx, {
      namespace: args.userId,
    });

    if (!namespace) {
      console.log(`[enhancedSearch] No namespace found for user ${args.userId}, returning empty results`);
      return {
        results: [],
        totalCount: 0,
      };
    }

    // Build filter array with proper typing
    const filters: Array<
      | { name: "userId"; value: string }
      | { name: "documentType"; value: "text" | "file" | "timeline" | "dossier" | null }
      | { name: "category"; value: string | null }
    > = [
      { name: "userId" as const, value: args.userId },
    ];

    if (args.filters?.documentType) {
      filters.push({ name: "documentType" as const, value: args.filters.documentType });
    }
    if (args.filters?.category) {
      filters.push({ name: "category" as const, value: args.filters.category });
    }

    // Perform vector search with filters
    let searchResult;
    try {
      searchResult = await ragEnhanced.search(ctx, {
        namespace: args.userId,
        query: args.query,
        limit,
        filters,
        chunkContext: { before: 1, after: 1 },
      });
    } catch (error: any) {
      console.error(`[enhancedSearch] Search error:`, error);
      // If namespace compatibility issue, return empty results
      if (error.message?.includes('No compatible namespace')) {
        return {
          results: [],
          totalCount: 0,
        };
      }
      throw error;
    }

    // Extract results
    const results = (searchResult as any).results || [];
    const entries = (searchResult as any).entries || [];

    // Map to document results
    const documentResults = results.map((r: any) => {
      const entry = entries.find((e: any) => e.entryId === r.entryId);
      const metadata = entry?.metadata as DocumentMetadata | undefined;
      
      return {
        documentId: metadata?.documentId || entry?.key,
        title: entry?.title || "Untitled",
        snippet: r.content?.map((c: any) => c.text).join("\n").slice(0, 300),
        score: r.score,
        source: "vector" as const,
      };
    });

    // LLM validation and re-ranking
    let finalResults = documentResults;
    if (enableLLMValidation && documentResults.length > 0) {
      const apiKey = process.env.OPENAI_API_KEY || process.env.CONVEX_OPENAI_API_KEY;
      if (apiKey) {
        const openaiClient = new OpenAI({ apiKey });
        finalResults = await validateSearchResults(args.query, documentResults, openaiClient);

        // Sort by re-ranked score
        finalResults.sort((a: any, b: any) => (b.reRankedScore || 0) - (a.reRankedScore || 0));
      }
    }

    return {
      results: finalResults,
      totalCount: finalResults.length,
    };
  },
});

/* ------------------------------------------------------------------ */
/* Hybrid Search (Vector + Keyword + LLM)                             */
/* ------------------------------------------------------------------ */

export const hybridSearchWithValidation = internalAction({
  args: {
    query: v.string(),
    userId: v.id("users"),
    filters: v.optional(v.object({
      documentType: v.optional(v.union(
        v.literal("text"),
        v.literal("file"),
        v.literal("timeline"),
        v.literal("dossier")
      )),
      category: v.optional(v.string()),
    })),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    results: v.array(v.object({
      documentId: v.id("documents"),
      title: v.string(),
      snippet: v.optional(v.string()),
      score: v.optional(v.number()),
      isRelevant: v.optional(v.boolean()),
      relevanceReason: v.optional(v.string()),
      reRankedScore: v.optional(v.number()),
      source: v.string(),
    })),
    summary: v.string(),
    totalCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // 1. Vector search with enhanced RAG
    const vectorResults = await ctx.runAction(internal.ragEnhanced.enhancedSearch, {
      query: args.query,
      userId: args.userId,
      filters: args.filters,
      limit,
      enableLLMValidation: true,
    });

    // 2. Keyword search (BM25)
    const keywordResults = await ctx.runQuery(api.rag_queries.keywordSearch, {
      query: args.query,
      limit: 5,
    });

    // 3. Merge and deduplicate
    const resultMap = new Map<string, any>();

    // Add vector results
    vectorResults.results.forEach((r: any) => {
      resultMap.set(String(r.documentId), {
        ...r,
        source: r.isRelevant ? "hybrid-validated" : "vector",
      });
    });

    // Add keyword results
    for (const k of keywordResults) {
      const docId = String(k.documentId);
      const existing = resultMap.get(docId);

      if (existing) {
        // Boost score for hybrid match
        existing.score = Math.max(existing.score || 0, 0.8);
        existing.source = "hybrid";
      } else {
        // Fetch document title
        let title = "Untitled";
        try {
          const doc = await ctx.runQuery(api.documents.getById, { documentId: k.documentId });
          title = doc?.title || title;
        } catch {
          // Document not found or error fetching, use default title - error intentionally ignored
        }

        resultMap.set(docId, {
          documentId: k.documentId,
          title,
          snippet: k.text?.slice(0, 300),
          score: 0.7,
          source: "keyword",
        });
      }
    }

    // Sort by score
    const finalResults = Array.from(resultMap.values())
      .sort((a, b) => (b.reRankedScore || b.score || 0) - (a.reRankedScore || a.score || 0))
      .slice(0, limit);

    // Generate summary
    const summary = finalResults.length > 0
      ? `Found ${finalResults.length} relevant document${finalResults.length === 1 ? '' : 's'}. ` +
        `Top result: "${finalResults[0].title}" (${(finalResults[0].reRankedScore || finalResults[0].score || 0).toFixed(2)} relevance).`
      : `No documents found matching "${args.query}".`;

    return {
      results: finalResults,
      summary,
      totalCount: finalResults.length,
    };
  },
});

/* ------------------------------------------------------------------ */
/* Answer Question with RAG and LLM Validation                        */
/* ------------------------------------------------------------------ */

export const answerQuestionEnhanced = internalAction({
  args: {
    prompt: v.string(),
    userId: v.id("users"),
    filters: v.optional(v.object({
      documentType: v.optional(v.union(
        v.literal("text"),
        v.literal("file"),
        v.literal("timeline"),
        v.literal("dossier")
      )),
      category: v.optional(v.string()),
    })),
  },
  returns: v.object({
    answer: v.string(),
    sources: v.array(v.object({
      documentId: v.id("documents"),
      title: v.string(),
      snippet: v.optional(v.string()),
      relevanceReason: v.optional(v.string()),
    })),
    confidence: v.number(),
  }),
  handler: async (ctx, args): Promise<{
    answer: string;
    sources: Array<{
      documentId: Id<"documents">;
      title: string;
      snippet?: string;
      relevanceReason?: string;
    }>;
    confidence: number;
  }> => {
    // Perform hybrid search with validation
    const searchResult: any = await ctx.runAction(internal.ragEnhanced.hybridSearchWithValidation, {
      query: args.prompt,
      userId: args.userId,
      filters: args.filters,
      limit: 5,
    });

    if (searchResult.results.length === 0) {
      return {
        answer: `I couldn't find any relevant documents to answer your question: "${args.prompt}"`,
        sources: [],
        confidence: 0,
      };
    }

    // Build context from top results
    const contextText: string = searchResult.results
      .filter((r: any) => r.isRelevant !== false)
      .map((r: any, idx: number) =>
        `[${idx + 1}] ${r.title}\n${r.snippet || ''}\n${r.relevanceReason ? `Relevance: ${r.relevanceReason}` : ''}`
      )
      .join('\n\n---\n\n');

    // Generate answer using LLM
    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.CONVEX_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("Missing OpenAI API key");
      }

      const openaiClient = new OpenAI({ apiKey });
      const completion: any = await openaiClient.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that answers questions based on provided context. " +
                     "Always cite which documents you used. If the context doesn't contain enough information, say so."
          },
          {
            role: "user",
            content: `Context from user's documents:\n\n${contextText}\n\n---\n\nQuestion: ${args.prompt}`
          }
        ],
      });

      const answer: string = completion.choices[0]?.message?.content || "I couldn't generate an answer.";

      // Calculate confidence based on relevance scores
      const avgRelevance = searchResult.results
        .filter((r: any) => r.reRankedScore !== undefined)
        .reduce((sum: number, r: any) => sum + (r.reRankedScore || 0), 0) / searchResult.results.length;

      return {
        answer,
        sources: searchResult.results.map((r: any) => ({
          documentId: r.documentId,
          title: r.title,
          snippet: r.snippet,
          relevanceReason: r.relevanceReason,
        })),
        confidence: avgRelevance || 0.5,
      };
    } catch (error) {
      console.error("[answerQuestionEnhanced] Error:", error);

      // Fallback response
      return {
        answer: `I found ${searchResult.results.length} relevant documents but couldn't generate a detailed answer. ` +
                `Top documents: ${searchResult.results.slice(0, 3).map((r: any) => r.title).join(', ')}`,
        sources: searchResult.results.map((r: any) => ({
          documentId: r.documentId,
          title: r.title,
          snippet: r.snippet,
          relevanceReason: r.relevanceReason,
        })),
        confidence: 0.3,
      };
    }
  },
});

