/**
 * Embedding Provider — True semantic search via neural embeddings.
 *
 * Provider fallback order:
 * 1. Local: @huggingface/transformers + Xenova/all-MiniLM-L6-v2 (384-dim, 23MB INT8, zero API keys)
 * 2. Google: text-embedding-004 (768-dim, free API, needs GEMINI_API_KEY)
 * 3. OpenAI: text-embedding-3-small (1536-dim, $0.02/1M tokens, needs OPENAI_API_KEY)
 *
 * Graceful degradation: if no provider is available, all exports return null/false
 * and search works exactly as before.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

// ── Types ────────────────────────────────────────────────────────────────────

export interface EmbeddingProvider {
  name: string;       // "local-minilm" | "google" | "openai"
  dimensions: number; // 384 | 768 | 1536
  embed(texts: string[]): Promise<Float32Array[]>;
}

interface EmbeddingCache {
  providerName: string;
  dimensions: number;
  version: number;
  toolCount: number;
  /** FNV-1a hash of all corpus texts, to detect content changes */
  corpusHash: string;
  entries: Record<string, number[]>;
}

/** Node type in the bipartite graph: tool nodes vs domain (agent) nodes */
export type GraphNodeType = "tool" | "domain";

interface EmbeddingIndexEntry {
  name: string;
  vector: Float32Array;
  /** Node type for Agent-as-a-Graph bipartite scoring */
  nodeType: GraphNodeType;
}

// ── State ────────────────────────────────────────────────────────────────────

let _provider: EmbeddingProvider | null = null;
let _providerChecked = false;
let _embeddingIndex: EmbeddingIndexEntry[] | null = null;
let _initPromise: Promise<void> | null = null;

const CACHE_VERSION = 1;
const CACHE_DIR = join(homedir(), ".nodebench");
const CACHE_FILE = join(CACHE_DIR, "embedding_cache.json");

// ── Provider creation ────────────────────────────────────────────────────────

async function createLocalProvider(): Promise<EmbeddingProvider | null> {
  try {
    // Non-literal import to avoid TypeScript bundling issues with optional deps
    const pkg = "@huggingface/transformers";
    const mod = await import(/* @vite-ignore */ pkg);
    const { pipeline, env } = mod;

    // Disable remote model loading attempts in restricted environments
    env.allowRemoteModels = true;
    env.useBrowserCache = false;

    const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      quantized: true, // INT8 — 23MB vs 90MB FP32
    });

    return {
      name: "local-minilm",
      dimensions: 384,
      embed: async (texts: string[]): Promise<Float32Array[]> => {
        const results: Float32Array[] = [];
        // Batch in chunks of 32 to avoid OOM on large corpora
        for (let i = 0; i < texts.length; i += 32) {
          const batch = texts.slice(i, i + 32);
          const output = await extractor(batch, { pooling: "mean", normalize: true });
          for (let j = 0; j < batch.length; j++) {
            results.push(new Float32Array(output[j].data));
          }
        }
        return results;
      },
    };
  } catch {
    return null;
  }
}

async function createGoogleProvider(): Promise<EmbeddingProvider | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    return {
      name: "google",
      dimensions: 768,
      embed: async (texts: string[]): Promise<Float32Array[]> => {
        const results: Float32Array[] = [];
        // Google API supports batching up to 100 texts
        for (let i = 0; i < texts.length; i += 100) {
          const batch = texts.slice(i, i + 100);
          const response = await ai.models.embedContent({
            model: "text-embedding-004",
            contents: batch.map((t) => ({ parts: [{ text: t }] })),
          });
          const embeddings = (response as any).embeddings ?? [];
          for (const emb of embeddings) {
            results.push(new Float32Array(emb.values));
          }
        }
        return results;
      },
    };
  } catch {
    return null;
  }
}

async function createOpenAIProvider(): Promise<EmbeddingProvider | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI();

    return {
      name: "openai",
      dimensions: 1536,
      embed: async (texts: string[]): Promise<Float32Array[]> => {
        const results: Float32Array[] = [];
        // OpenAI supports up to 2048 inputs per request
        for (let i = 0; i < texts.length; i += 2048) {
          const batch = texts.slice(i, i + 2048);
          const response = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: batch,
          });
          for (const item of response.data) {
            results.push(new Float32Array(item.embedding));
          }
        }
        return results;
      },
    };
  } catch {
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the best available embedding provider, or null if none is available.
 * Tries: local HuggingFace → Google → OpenAI (in that order).
 */
export async function getEmbeddingProvider(): Promise<EmbeddingProvider | null> {
  if (_providerChecked) return _provider;
  _providerChecked = true;

  _provider = await createLocalProvider();
  if (_provider) return _provider;

  _provider = await createGoogleProvider();
  if (_provider) return _provider;

  _provider = await createOpenAIProvider();
  return _provider;
}

/**
 * Pre-embed all tools at startup. Reads from cache if valid, otherwise embeds fresh.
 * Call this once after tool assembly with a corpus of { name, text, nodeType? } entries.
 * nodeType defaults to "tool" for backwards compatibility.
 */
export async function initEmbeddingIndex(
  corpus: Array<{ name: string; text: string; nodeType?: GraphNodeType }>
): Promise<void> {
  // Prevent duplicate init
  if (_initPromise) return _initPromise;
  _initPromise = _doInit(corpus);
  return _initPromise;
}

async function _doInit(corpus: Array<{ name: string; text: string; nodeType?: GraphNodeType }>): Promise<void> {
  const provider = await getEmbeddingProvider();
  if (!provider) return; // No provider — semantic search stays disabled

  const hash = fnv1aHash(corpus.map((c) => c.text).join("\n"));

  // Try loading from cache
  const cached = loadCache();
  if (
    cached &&
    cached.providerName === provider.name &&
    cached.dimensions === provider.dimensions &&
    cached.version === CACHE_VERSION &&
    cached.toolCount === corpus.length &&
    cached.corpusHash === hash &&
    corpus.every((c) => c.name in cached.entries)
  ) {
    _embeddingIndex = corpus.map((c) => ({
      name: c.name,
      vector: new Float32Array(cached.entries[c.name]),
      nodeType: c.nodeType ?? "tool",
    }));
    return;
  }

  // Embed all tools
  try {
    const texts = corpus.map((c) => c.text);
    const vectors = await provider.embed(texts);

    _embeddingIndex = corpus.map((c, i) => ({
      name: c.name,
      vector: vectors[i],
      nodeType: c.nodeType ?? "tool",
    }));

    // Save to cache
    const cacheData: EmbeddingCache = {
      providerName: provider.name,
      dimensions: provider.dimensions,
      version: CACHE_VERSION,
      toolCount: corpus.length,
      corpusHash: hash,
      entries: {},
    };
    for (let i = 0; i < corpus.length; i++) {
      cacheData.entries[corpus[i].name] = Array.from(vectors[i]);
    }
    saveCache(cacheData);
  } catch {
    // Embedding failed — graceful degradation, search works without embeddings
    _embeddingIndex = null;
  }
}

/**
 * Embed a single query string. Returns null if no provider is available.
 */
export async function embedQuery(text: string): Promise<Float32Array | null> {
  const provider = await getEmbeddingProvider();
  if (!provider) return null;
  try {
    const [vec] = await provider.embed([text]);
    return vec;
  } catch {
    return null;
  }
}

/**
 * Brute-force cosine KNN over the pre-computed embedding index.
 * Returns ranked results with similarity scores and node types.
 */
export function embeddingSearch(
  queryVec: Float32Array,
  limit: number = 30
): Array<{ name: string; similarity: number; nodeType: GraphNodeType }> {
  if (!_embeddingIndex) return [];

  const scored = _embeddingIndex.map((entry) => ({
    name: entry.name,
    similarity: cosineSim(queryVec, entry.vector),
    nodeType: entry.nodeType,
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}

/**
 * Returns true when the embedding index is loaded and ready for search.
 */
export function isEmbeddingReady(): boolean {
  return _embeddingIndex !== null && _embeddingIndex.length > 0;
}

/**
 * Returns the name of the active embedding provider, or null.
 */
export function getProviderName(): string | null {
  return _provider?.name ?? null;
}

// ── Internals ────────────────────────────────────────────────────────────────

/** FNV-1a hash — fast, deterministic, good distribution for cache invalidation */
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function cosineSim(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function loadCache(): EmbeddingCache | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const raw = readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw) as EmbeddingCache;
  } catch {
    return null;
  }
}

function saveCache(data: EmbeddingCache): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch {
    // Non-critical — next startup will just re-embed
  }
}

// ── Testing helpers ──────────────────────────────────────────────────────────

/** Reset all state — for testing only. */
export function _resetForTesting(): void {
  _provider = null;
  _providerChecked = false;
  _embeddingIndex = null;
  _initPromise = null;
}

/** Inject a mock provider — for testing only. */
export function _setProviderForTesting(provider: EmbeddingProvider | null): void {
  _provider = provider;
  _providerChecked = true;
}

/** Inject a pre-built index — for testing only. */
export function _setIndexForTesting(index: EmbeddingIndexEntry[]): void {
  _embeddingIndex = index;
}
