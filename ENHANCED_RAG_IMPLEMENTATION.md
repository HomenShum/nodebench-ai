# Enhanced RAG Implementation Guide

## Overview

This document describes the enhanced RAG (Retrieval-Augmented Generation) implementation for NodeBench AI, following Convex best practices and official examples.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Enhanced RAG System                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Document Indexing (convex/ragEnhanced.ts)               │
│     - Smart chunking with overlap                           │
│     - User-scoped namespaces                                │
│     - Metadata and filters (type, category, userId)         │
│     - Text embeddings (text-embedding-3-small)              │
│                                                              │
│  2. Hybrid Search                                           │
│     - Vector search (semantic similarity)                   │
│     - Keyword search (BM25)                                 │
│     - LLM-powered validation and re-ranking                 │
│                                                              │
│  3. LLM Judge                                               │
│     - Validates search result relevance                     │
│     - Provides reasoning for each result                    │
│     - Re-ranks results by true relevance                    │
│                                                              │
│  4. Answer Generation                                       │
│     - Uses validated context                                │
│     - Cites sources with reasoning                          │
│     - Provides confidence scores                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. User-Scoped Namespaces

Each user has their own RAG namespace for privacy and personalized search:

```typescript
// Documents are indexed per-user
await ragEnhanced.add(ctx, {
  namespace: userId, // User-specific namespace
  key: documentId,
  // ...
});

// Search is scoped to user's documents
const results = await ragEnhanced.search(ctx, {
  namespace: userId,
  query: "biotech startups",
  // ...
});
```

### 2. Metadata and Filters

Documents are indexed with rich metadata for precise filtering:

```typescript
type DocumentFilters = {
  documentType: "text" | "file" | "timeline" | "dossier" | null;
  category: string | null;
  userId: string;
};

type DocumentMetadata = {
  documentId: Id<"documents">;
  createdBy: Id<"users">;
  lastModified: number;
  isPublic: boolean;
};

// Add document with filters
await ragEnhanced.add(ctx, {
  namespace: userId,
  filterValues: [
    { name: "documentType", value: "dossier" },
    { name: "category", value: "research" },
    { name: "userId", value: userId },
  ],
  metadata: {
    documentId,
    createdBy: userId,
    lastModified: Date.now(),
    isPublic: false,
  },
  // ...
});

// Search with filters
const results = await ragEnhanced.search(ctx, {
  namespace: userId,
  query: "AI research",
  filters: [
    { name: "documentType", value: "dossier" },
    { name: "category", value: "research" },
  ],
  // ...
});
```

### 3. Smart Chunking

Documents are chunked with overlap for better context preservation:

```typescript
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
```

### 4. LLM-Powered Validation

Search results are validated by an LLM judge for true relevance:

```typescript
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
}>>
```

The LLM judge:
- Evaluates each result's relevance to the query
- Provides reasoning (1-2 sentences)
- Assigns a relevance score (0.0 to 1.0)
- Re-ranks results by true relevance

### 5. Hybrid Search

Combines multiple search strategies for best results:

```typescript
export const hybridSearchWithValidation = action({
  args: {
    query: v.string(),
    userId: v.id("users"),
    filters: v.optional(v.object({...})),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Vector search with enhanced RAG
    const vectorResults = await ctx.runAction(
      internal.ragEnhanced.enhancedSearch,
      { query, userId, filters, enableLLMValidation: true }
    );

    // 2. Keyword search (BM25)
    const keywordResults = await ctx.runQuery(
      api.rag_queries.keywordSearch,
      { query, limit: 5 }
    );

    // 3. Merge, deduplicate, and re-rank
    // ...
  },
});
```

## Usage Examples

### 1. Index a Document

```typescript
// Automatically called after document creation
await ctx.runAction(internal.ragEnhanced.addDocumentToEnhancedRag, {
  documentId: "j57abc123",
  userId: "k12xyz789",
});
```

### 2. Search Documents

```typescript
// Simple search
const results = await ctx.runAction(internal.ragEnhanced.enhancedSearch, {
  query: "biotech startups in healthcare",
  userId: currentUserId,
  limit: 10,
  enableLLMValidation: true,
});

// Search with filters
const filteredResults = await ctx.runAction(internal.ragEnhanced.enhancedSearch, {
  query: "Q4 planning",
  userId: currentUserId,
  filters: {
    documentType: "dossier",
    category: "business",
  },
  limit: 5,
});
```

### 3. Hybrid Search

```typescript
const hybridResults = await ctx.runAction(
  internal.ragEnhanced.hybridSearchWithValidation,
  {
    query: "AI research papers",
    userId: currentUserId,
    limit: 10,
  }
);

console.log(hybridResults.summary);
// "Found 8 relevant documents. Top result: 'GPT-4 Analysis' (0.95 relevance)."

hybridResults.results.forEach(r => {
  console.log(`${r.title} - ${r.relevanceReason}`);
});
```

### 4. Answer Questions

```typescript
const answer = await ctx.runAction(internal.ragEnhanced.answerQuestionEnhanced, {
  prompt: "What are the key findings from our biotech research?",
  userId: currentUserId,
  filters: {
    category: "research",
  },
});

console.log(answer.answer);
console.log(`Confidence: ${answer.confidence}`);
console.log(`Sources: ${answer.sources.map(s => s.title).join(', ')}`);
```

## Integration Points

### 1. Hashtag Search

Updated `convex/hashtagDossiers.ts` to use enhanced RAG:

```typescript
export const searchForHashtag = action({
  args: {
    hashtag: v.string(),
    enableLLMValidation: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Uses enhanced hybrid search with LLM validation
    const enhancedResults = await ctx.runAction(
      internal.ragEnhanced.hybridSearchWithValidation,
      {
        query: args.hashtag,
        userId,
        limit: 20,
      }
    );
    
    // Returns results with relevance reasoning
    return {
      matches: enhancedResults.results.map(r => ({
        _id: r.documentId,
        title: r.title,
        matchType: r.source,
        score: r.reRankedScore || r.score,
        snippet: r.snippet,
        isRelevant: r.isRelevant,
        relevanceReason: r.relevanceReason,
      })),
      totalCount: enhancedResults.results.length,
      summary: enhancedResults.summary,
    };
  },
});
```

### 2. Fast Agent Document Creation

Updated `convex/fastAgentDocumentCreation.ts` to index with enhanced RAG:

```typescript
export const indexAndSnapshot = internalAction({
  handler: async (ctx, args) => {
    // 1. Index with enhanced RAG (metadata + filters)
    const enhancedResult = await ctx.runAction(
      internal.ragEnhanced.addDocumentToEnhancedRag,
      { documentId, userId }
    );
    
    // 2. Also index with legacy RAG for backward compatibility
    await ctx.runAction(internal.rag.addDocumentToRag, { documentId });
    
    // 3. Create snapshot
    // ...
  },
});
```

## Performance Considerations

1. **Chunking**: Smart chunking with overlap improves context but increases storage
   - Default: 1000 chars per chunk, 100 chars overlap
   - Adjust based on document types

2. **LLM Validation**: Adds latency but significantly improves relevance
   - Enable for user-facing searches
   - Disable for background/batch operations

3. **Namespaces**: User-scoped namespaces improve privacy but require more storage
   - Consider global namespace for public documents
   - Use filters to restrict access

4. **Filters**: Pre-filter before vector search for better performance
   - Index frequently-used filters (documentType, category, userId)
   - Avoid dynamic filters

## Migration Guide

### From Legacy RAG to Enhanced RAG

1. **Existing documents**: Re-index with enhanced RAG
   ```typescript
   // Batch re-indexing script
   const allDocs = await ctx.db.query("documents").collect();
   for (const doc of allDocs) {
     await ctx.runAction(internal.ragEnhanced.addDocumentToEnhancedRag, {
       documentId: doc._id,
       userId: doc.createdBy,
     });
   }
   ```

2. **Update search calls**: Replace legacy RAG calls
   ```typescript
   // Before
   const results = await ctx.runAction(internal.rag.answerQuestionViaRAG, {
     prompt: query,
   });
   
   // After
   const results = await ctx.runAction(internal.ragEnhanced.answerQuestionEnhanced, {
     prompt: query,
     userId: currentUserId,
   });
   ```

3. **Backward compatibility**: Both systems run in parallel
   - Enhanced RAG for new features
   - Legacy RAG for existing features
   - Gradual migration over time

## References

- [Convex Vector Search](https://docs.convex.dev/search/vector-search)
- [Convex RAG Guide](https://docs.convex.dev/agents/rag/)
- [Convex Agent Usage](https://docs.convex.dev/agents/agent-usage)

