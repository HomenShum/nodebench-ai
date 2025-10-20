/**
 * Hashtag Dossier Management
 * Creates dossiers for hashtags and populates them with references to matching documents
 */

import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

/**
 * Search for documents matching a hashtag phrase
 * Returns both exact matches and semantic matches
 */
export const searchForHashtag = action({
  args: {
    hashtag: v.string(),
  },
  returns: v.object({
    matches: v.array(
      v.object({
        _id: v.id("documents"),
        title: v.string(),
        matchType: v.string(),
        score: v.number(),
        snippet: v.optional(v.string()),
      })
    ),
    totalCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const normalizedHashtag = args.hashtag.toLowerCase().trim();

    // 1. Exact match search in document titles
    const exactTitleMatches = await ctx.runQuery(api.documents.getSearch, {
      query: normalizedHashtag,
      userId,
    });

    // 2. Exact match search in document content (via nodes)
    const exactContentMatches = await ctx.runQuery(api.rag_queries.keywordSearch, {
      query: normalizedHashtag,
      limit: 10,
    });

    // 3. Semantic search using RAG
    let semanticMatches: any[] = [];
    try {
      const ragResult = await ctx.runAction(internal.rag.answerQuestionViaRAG, {
        prompt: normalizedHashtag,
      });
      semanticMatches = ragResult.candidateDocs || [];
    } catch (error) {
      console.error("[searchForHashtag] RAG search failed:", error);
    }

    // 4. Combine and deduplicate results
    const contextMap = new Map<string, any>();

    // Add exact title matches
    exactTitleMatches.forEach((doc) => {
      contextMap.set(doc._id, {
        _id: doc._id,
        title: doc.title,
        matchType: "exact-title",
        score: 1.0,
      });
    });

    // Add exact content matches
    exactContentMatches.forEach((match) => {
      const docId = String(match.documentId);
      const existing = contextMap.get(docId);
      if (existing) {
        contextMap.set(docId, {
          ...existing,
          matchType: "exact-hybrid",
          score: 1.0,
          snippet: match.text?.slice(0, 320),
        });
      } else {
        contextMap.set(docId, {
          _id: match.documentId,
          title: "Untitled",
          matchType: "exact-content",
          score: 0.95,
          snippet: match.text?.slice(0, 320),
        });
      }
    });

    // Add semantic matches
    semanticMatches.forEach((match) => {
      const docId = String(match.documentId);
      const existing = contextMap.get(docId);
      if (existing) {
        const isExact = existing.matchType.startsWith("exact");
        contextMap.set(docId, {
          ...existing,
          matchType: isExact ? "hybrid" : "semantic",
          score: Math.max(existing.score, match.score || 0.5),
          snippet: existing.snippet || match.snippet,
        });
      } else {
        contextMap.set(docId, {
          _id: match.documentId,
          title: match.title || "Untitled",
          matchType: "semantic",
          score: match.score || 0.5,
          snippet: match.snippet,
        });
      }
    });

    const matches = Array.from(contextMap.values()).sort((a, b) => b.score - a.score);

    return {
      matches,
      totalCount: matches.length,
    };
  },
});

/**
 * Create a dossier for a hashtag and populate it with document references
 */
export const createHashtagDossier = mutation({
  args: {
    hashtag: v.string(),
    matchedDocuments: v.array(
      v.object({
        _id: v.id("documents"),
        title: v.string(),
        matchType: v.string(),
        score: v.number(),
        snippet: v.optional(v.string()),
      })
    ),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const normalizedHashtag = args.hashtag.toLowerCase().trim();

    // Build TipTap content with document references using @mentions
    const contentNodes: any[] = [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: `#${normalizedHashtag}` }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: `This dossier contains ${args.matchedDocuments.length} document${
              args.matchedDocuments.length === 1 ? "" : "s"
            } related to "${normalizedHashtag}".`,
          },
        ],
      },
    ];

    if (args.matchedDocuments.length > 0) {
      contentNodes.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Related Documents" }],
      });

      // Add each document as a paragraph with @mention
      args.matchedDocuments.forEach((doc) => {
        const matchBadge =
          doc.matchType === "hybrid"
            ? "🎯"
            : doc.matchType === "exact-hybrid"
            ? "📍"
            : doc.matchType === "exact-title"
            ? "📍"
            : doc.matchType === "exact-content"
            ? "📄"
            : "🔍";

        // Create paragraph with inline mention
        // Note: BlockNote uses inline content, not attrs
        contentNodes.push({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `${matchBadge} `,
            },
            {
              type: "text",
              text: "@",
            },
            {
              type: "text",
              text: doc.title,
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: `/documents/${doc._id}`,
                    target: "_self",
                  },
                },
                { type: "bold" },
              ],
            },
            {
              type: "text",
              text: ` (${(doc.score * 100).toFixed(0)}%)`,
            },
          ],
        });

        // Add snippet if available
        if (doc.snippet) {
          contentNodes.push({
            type: "paragraph",
            content: [
              {
                type: "text",
                text: doc.snippet,
                marks: [{ type: "italic" }],
              },
            ],
          });
        }
      });
    } else {
      contentNodes.push({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "No related documents found.",
            marks: [{ type: "italic" }],
          },
        ],
      });
    }

    // Create dossier document
    const dossierId = await ctx.db.insert("documents", {
      title: `#${normalizedHashtag}`,
      content: JSON.stringify({
        type: "doc",
        content: contentNodes,
      }),
      createdBy: userId,
      isPublic: false,
      isArchived: false,
      isFavorite: false,
      documentType: "dossier",
      dossierType: "primary",
      lastModified: Date.now(),
    });

    return dossierId;
  },
});



/**
 * Get recent hashtags for suggestions
 */
export const getRecentHashtags = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("documents"),
      title: v.string(),
      hashtag: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const dossiers = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("documentType"), "dossier"),
          q.eq(q.field("dossierType"), "primary"),
          q.eq(q.field("isArchived"), false)
        )
      )
      .order("desc")
      .take(args.limit || 10);

    return dossiers
      .filter((d) => d.title.startsWith("#"))
      .map((d) => ({
        _id: d._id,
        title: d.title,
        hashtag: d.title.substring(1), // Remove # prefix
      }));
  },
});

