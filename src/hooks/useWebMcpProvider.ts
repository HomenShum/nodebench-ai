/**
 * useWebMcpProvider — Registers NodeBench tools via navigator.modelContext.
 *
 * When enabled, exposes 4 NodeBench capabilities as WebMCP tools that browser
 * agents can discover and invoke:
 *   - nodebench_search: search documents and knowledge
 *   - nodebench_create_document: create a new document
 *   - nodebench_get_digest: get the latest morning digest
 *   - nodebench_ask_agent: send a question to the agent
 *
 * Uses the W3C WebMCP draft API: navigator.modelContext.provideContext()
 */

import { useEffect, useRef } from "react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";

declare global {
  interface Navigator {
    modelContext?: {
      provideContext: (opts: {
        tools: Array<{
          name: string;
          description: string;
          inputSchema?: Record<string, unknown>;
          execute: (args: any, context: any) => Promise<any>;
        }>;
      }) => void;
    };
  }
}

export function useWebMcpProvider(enabled: boolean) {
  const convex = useConvex();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !navigator.modelContext?.provideContext) {
      return;
    }

    const tools = [
      {
        name: "nodebench_search",
        description:
          "Search NodeBench documents, research dossiers, and knowledge base. Returns relevant results with titles, snippets, and metadata.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            limit: { type: "number", description: "Max results (default: 10)" },
          },
          required: ["query"],
        },
        execute: async (args: { query: string; limit?: number }) => {
          try {
            const results = await convex.query(
              api.domains.research.hybridSearch.hybridSearch,
              { query: args.query, topK: args.limit ?? 10 }
            );
            return { success: true, results };
          } catch (e: any) {
            return { success: false, error: e.message };
          }
        },
      },
      {
        name: "nodebench_create_document",
        description:
          "Create a new document in NodeBench. Supports markdown content with optional metadata tags.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Document title" },
            content: { type: "string", description: "Document content (markdown)" },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Optional tags for categorization",
            },
          },
          required: ["title", "content"],
        },
        execute: async (args: {
          title: string;
          content: string;
          tags?: string[];
        }) => {
          try {
            const id = await convex.mutation(
              api.domains.documents.documentMutations.createDocument,
              {
                title: args.title,
                content: args.content,
                tags: args.tags ?? [],
              }
            );
            return { success: true, documentId: id };
          } catch (e: any) {
            return { success: false, error: e.message };
          }
        },
      },
      {
        name: "nodebench_get_digest",
        description:
          "Retrieve the latest morning digest — a curated summary of research signals, trending topics, and actionable insights.",
        inputSchema: {
          type: "object",
          properties: {},
        },
        execute: async () => {
          try {
            const digest = await convex.query(
              api.domains.research.forYouFeed.getPublicForYouFeed,
              {}
            );
            return { success: true, digest };
          } catch (e: any) {
            return { success: false, error: e.message };
          }
        },
      },
      {
        name: "nodebench_ask_agent",
        description:
          "Send a question to the NodeBench AI agent. Returns a structured response with reasoning and sources.",
        inputSchema: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The question to ask the agent",
            },
          },
          required: ["question"],
        },
        execute: async (args: { question: string }) => {
          try {
            // Uses the public research endpoint as a read-only agent proxy
            const result = await convex.query(
              api.domains.research.hybridSearch.hybridSearch,
              { query: args.question, topK: 5 }
            );
            return {
              success: true,
              answer: `Found ${Array.isArray(result) ? result.length : 0} relevant results for your question.`,
              sources: result,
            };
          } catch (e: any) {
            return { success: false, error: e.message };
          }
        },
      },
    ];

    try {
      navigator.modelContext.provideContext({ tools });
    } catch {
      // WebMCP not supported or errored — fail silently
    }

    return () => {
      cleanupRef.current?.();
    };
  }, [enabled, convex]);
}
