/**
 * Embedding Provider (slim) — Semantic search via API-based embeddings.
 *
 * Slim version for convex-mcp-nodebench (16 tools — local model not justified).
 * Provider fallback: Google text-embedding-004 (free) → OpenAI text-embedding-3-small.
 *
 * Graceful degradation: if no provider available, all exports return null/false.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

// ── Types ────────────────────────────────────────────────────────────────────

export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  embed(texts: string[]): Promise<Float32Array[]>;
}

interface EmbeddingCache {
  providerName: string;
  dimensions: number;
  version: number;
  toolCount: number;
  corpusHash: string;
  entries: Record<string, number[]>;
}

interface EmbeddingIndexEntry {
  name: string;
  vector: Float32Array;
}

// ── State ────────────────────────────────────────────────────────────────────

let _provider: EmbeddingProvider | null = null;
let _providerChecked = false;
let _embeddingIndex: EmbeddingIndexEntry[] | null = null;
let _initPromise: Promise<void> | null = null;

// Simple FNV-1a hash for corpus change detection
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

const CACHE_VERSION = 1;
const CACHE_DIR = join(homedir(), ".convex-mcp-nodebench");
const CACHE_FILE = join(CACHE_DIR, "embedding_cache.json");

// ── Provider creation ────────────────────────────────────────────────────────

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

export async function getEmbeddingProvider(): Promise<EmbeddingProvider | null> {
  if (_providerChecked) return _provider;
  _providerChecked = true;

  _provider = await createGoogleProvider();
  if (_provider) return _provider;

  _provider = await createOpenAIProvider();
  return _provider;
}

export async function initEmbeddingIndex(
  corpus: Array<{ name: string; text: string }>
): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = _doInit(corpus);
  return _initPromise;
}

async function _doInit(corpus: Array<{ name: string; text: string }>): Promise<void> {
  const provider = await getEmbeddingProvider();
  if (!provider) return;

  const hash = fnv1aHash(corpus.map((c) => c.text).join("\n"));

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
    }));
    return;
  }

  try {
    const texts = corpus.map((c) => c.text);
    const vectors = await provider.embed(texts);

    _embeddingIndex = corpus.map((c, i) => ({
      name: c.name,
      vector: vectors[i],
    }));

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
    _embeddingIndex = null;
  }
}

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

export function embeddingSearch(
  queryVec: Float32Array,
  limit: number = 30
): Array<{ name: string; similarity: number }> {
  if (!_embeddingIndex) return [];

  const scored = _embeddingIndex.map((entry) => ({
    name: entry.name,
    similarity: cosineSim(queryVec, entry.vector),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}

export function isEmbeddingReady(): boolean {
  return _embeddingIndex !== null && _embeddingIndex.length > 0;
}

export function getProviderName(): string | null {
  return _provider?.name ?? null;
}

// ── Internals ────────────────────────────────────────────────────────────────

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
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8")) as EmbeddingCache;
  } catch {
    return null;
  }
}

function saveCache(data: EmbeddingCache): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch { /* non-critical */ }
}

// ── Testing helpers ──────────────────────────────────────────────────────────

export function _resetForTesting(): void {
  _provider = null;
  _providerChecked = false;
  _embeddingIndex = null;
  _initPromise = null;
}

export function _setProviderForTesting(provider: EmbeddingProvider | null): void {
  _provider = provider;
  _providerChecked = true;
}

export function _setIndexForTesting(index: EmbeddingIndexEntry[]): void {
  _embeddingIndex = index;
}
