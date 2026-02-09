/**
 * Meta-tools for tool discovery and agent routing.
 * Uses BM25 scoring for relevance-ranked search results.
 */

import type { McpTool } from "./researchTools.js";

// ── BM25 scoring for tool search ──────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z_]+/g) ?? [];
}

interface BM25Index {
  corpus: Map<string, string[]>;  // toolName → tokens
  docLengths: Map<string, number>;
  avgDl: number;
  idf: Map<string, number>;
}

function buildBM25Index(tools: McpTool[]): BM25Index {
  const corpus = new Map<string, string[]>();
  for (const t of tools) {
    if (t.name === "findTools") continue;
    const tokens = tokenize(`${t.name} ${t.description}`);
    corpus.set(t.name, tokens);
  }

  // Compute average document length
  let totalLen = 0;
  for (const tokens of corpus.values()) totalLen += tokens.length;
  const avgDl = corpus.size > 0 ? totalLen / corpus.size : 1;

  // Compute document frequency for IDF
  const docFreq = new Map<string, number>();
  for (const tokens of corpus.values()) {
    const unique = new Set(tokens);
    for (const t of unique) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
  }

  // IDF: log((N - df + 0.5) / (df + 0.5) + 1) — standard BM25 IDF
  const N = corpus.size;
  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
  }

  return { corpus, docLengths: new Map([...corpus].map(([k, v]) => [k, v.length])), avgDl, idf };
}

function scoreBM25(queryTokens: string[], docTokens: string[], index: BM25Index, docName: string): number {
  const k1 = 1.2;
  const b = 0.75;
  const dl = index.docLengths.get(docName) ?? 1;

  // Count term frequencies in document
  const tf = new Map<string, number>();
  for (const t of docTokens) tf.set(t, (tf.get(t) ?? 0) + 1);

  let score = 0;
  for (const qt of queryTokens) {
    const termTf = tf.get(qt) ?? 0;
    if (termTf === 0) continue;
    const termIdf = index.idf.get(qt) ?? 0;
    // BM25 TF component with saturation and length normalization
    const tfNorm = (termTf * (k1 + 1)) / (termTf + k1 * (1 - b + b * (dl / index.avgDl)));
    score += termIdf * tfNorm;
  }
  return score;
}

// ── Cached index ──────────────────────────────────────────────────────────────

let _cachedIndex: BM25Index | null = null;
let _cachedToolCount = 0;

/**
 * Create meta-tools that reference the full tool list.
 * Must be called after all tool arrays are assembled.
 */
export function createMetaTools(allTools: McpTool[]): McpTool[] {
  return [
    {
      name: "findTools",
      description:
        "Search available tools by keyword or capability description. Returns matching tool names and descriptions ranked by BM25 relevance. Use this to discover which tools are available for a task.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "What you want to do (e.g. 'find stock prices', 'create a document', 'search the web')",
          },
          category: {
            type: "string",
            enum: [
              "research",
              "narrative",
              "verification",
              "knowledge",
              "documents",
              "financial",
              "planning",
              "memory",
              "search",
            ],
            description: "Optional category filter",
          },
        },
        required: ["query"],
      },
      handler: async (args) => {
        // Build or reuse cached BM25 index
        if (!_cachedIndex || _cachedToolCount !== allTools.length) {
          _cachedIndex = buildBM25Index(allTools);
          _cachedToolCount = allTools.length;
        }
        const index = _cachedIndex;

        const queryTokens = tokenize(args.query ?? "");
        if (queryTokens.length === 0) {
          return { query: args.query, matches: 0, tools: [] };
        }

        const scored = allTools
          .filter((t) => t.name !== "findTools")
          .map((t) => {
            const docTokens = index.corpus.get(t.name) ?? [];
            const score = scoreBM25(queryTokens, docTokens, index, t.name);
            return { name: t.name, description: t.description, score };
          })
          .filter((t) => t.score > 0)
          .sort((a, b) => b.score - a.score);

        return {
          query: args.query,
          matches: scored.length,
          tools: scored.slice(0, 15).map((t) => ({
            name: t.name,
            description: t.description,
          })),
        };
      },
    },
  ];
}
