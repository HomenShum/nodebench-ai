// shared/artifacts.ts
// Canonical types and helpers for artifact streaming
// Used by both Convex backend and React frontend

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ArtifactKind = 
  | "url" 
  | "video" 
  | "image" 
  | "file" 
  | "document" 
  | "sec" 
  | "person" 
  | "company";

export type ArtifactProvider =
  | "youtube"
  | "sec"
  | "twitter"
  | "linkedin"
  | "crunchbase"
  | "pitchbook"
  | "arxiv"
  | "wikipedia"
  | "news"
  | "reddit"
  | "github"
  | "web"
  | "local";

/**
 * Raw artifact from extractor (minimal, no computed fields)
 * The server computes: canonicalUrl, artifactId, flags, rev, discoveredAt
 */
export interface RawArtifact {
  url: string;
  title?: string;
  snippet?: string;
  thumbnail?: string;
  kind: ArtifactKind;
  provider?: ArtifactProvider;
}

/**
 * Full artifact card (after server processing)
 */
export interface ArtifactCard {
  id: string;              // SHA-256 of (runId + canonicalUrl)
  runId: string;           // agentThreadId
  messageId?: string;      // agentMessageId (for UI isolation)
  canonicalUrl: string;    // Normalized URL
  originalUrl: string;     // As discovered
  title: string;
  snippet?: string;
  thumbnail?: string;
  host: string;            // Extracted hostname
  kind: ArtifactKind;
  provider: ArtifactProvider;
  
  // Server-controlled fields
  rev: number;             // Monotonic revision (server-side only)
  discoveredAt: number;    // Timestamp
  
  // Flags (server-controlled defaults)
  flags: {
    isPinned: boolean;
    isCited: boolean;
    isHidden: boolean;
  };
  
  // Optional section linkage (deferred until section IDs are stable)
  sectionId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// URL CANONICALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "ref", "source", "fbclid", "gclid", "msclkid", "mc_eid",
  "_ga", "_gl", "oly_enc_id", "vero_id", "mkt_tok",
]);

/**
 * Canonicalize URL for deduplication
 * - Lowercase hostname
 * - Remove tracking parameters
 * - Remove trailing slashes
 * - Sort remaining query params
 */
export function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();
    
    // Remove tracking parameters
    const params = new URLSearchParams(parsed.search);
    for (const param of TRACKING_PARAMS) {
      params.delete(param);
    }
    
    // Sort remaining params for consistency
    const sortedParams = new URLSearchParams([...params.entries()].sort());
    parsed.search = sortedParams.toString();
    
    // Remove trailing slash from pathname
    if (parsed.pathname.endsWith("/") && parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    
    return parsed.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Extract hostname from URL
 */
export function extractHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER/KIND CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════

const PROVIDER_PATTERNS: Array<{ pattern: RegExp; provider: ArtifactProvider }> = [
  { pattern: /youtube\.com|youtu\.be/i, provider: "youtube" },
  { pattern: /sec\.gov|edgar/i, provider: "sec" },
  { pattern: /twitter\.com|x\.com/i, provider: "twitter" },
  { pattern: /linkedin\.com/i, provider: "linkedin" },
  { pattern: /crunchbase\.com/i, provider: "crunchbase" },
  { pattern: /pitchbook\.com/i, provider: "pitchbook" },
  { pattern: /arxiv\.org/i, provider: "arxiv" },
  { pattern: /wikipedia\.org/i, provider: "wikipedia" },
  { pattern: /reddit\.com/i, provider: "reddit" },
  { pattern: /github\.com/i, provider: "github" },
  { pattern: /reuters\.com|bloomberg\.com|cnbc\.com|wsj\.com|ft\.com/i, provider: "news" },
];

export function classifyProvider(url: string): ArtifactProvider {
  for (const { pattern, provider } of PROVIDER_PATTERNS) {
    if (pattern.test(url)) return provider;
  }
  return "web";
}

export function classifyKind(url: string, hint?: ArtifactKind): ArtifactKind {
  if (hint) return hint;
  
  const lower = url.toLowerCase();
  
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(lower)) return "video";
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(lower)) return "image";
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)(\?|$)/i.test(lower)) return "document";
  if (/sec\.gov.*\.(htm|html|txt)(\?|$)/i.test(lower)) return "sec";
  
  return "url";
}

// ═══════════════════════════════════════════════════════════════════════════
// ID GENERATION (async - uses crypto.subtle)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate deterministic artifact ID using SHA-256
 * ID = sha256(runId + "|" + canonicalUrl), truncated to 16 chars
 */
export async function generateArtifactId(runId: string, canonicalUrl: string): Promise<string> {
  const input = `${runId}|${canonicalUrl}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  
  // Use Web Crypto API (works in both browser and Convex runtime)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  return `art_${hashHex.slice(0, 16)}`;
}

/**
 * Sync version for Node.js (Convex actions)
 */
export function generateArtifactIdSync(runId: string, canonicalUrl: string): string {
  // Fallback: simple hash for sync contexts
  // In production, use crypto.createHash if available
  const input = `${runId}|${canonicalUrl}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `art_${Math.abs(hash).toString(16).padStart(16, "0").slice(0, 16)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// DETERMINISTIC HASHING (for idempotency keys)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SHA-256 hash using Web Crypto API (async)
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Deterministic hash sync (for Convex mutations/queries where async is awkward)
 * Uses djb2 algorithm - fast and collision-resistant for our use case
 */
export function hashSync(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate deterministic idempotency key from sorted canonical URLs
 * Key = hash(runId|toolName|chunkIndex|hash(sortedUrls))
 */
export function generateIdempotencyKey(
  runId: string,
  toolName: string,
  chunkIndex: number,
  canonicalUrls: string[]
): string {
  // Sort URLs for determinism under reordering
  const sortedUrls = [...canonicalUrls].sort();
  const urlsHash = hashSync(sortedUrls.join("\n"));
  const fullInput = `${runId}|${toolName}|${chunkIndex}|${urlsHash}`;
  return `idem_${hashSync(fullInput)}`;
}
