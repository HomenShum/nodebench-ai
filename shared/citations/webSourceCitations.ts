// shared/citations/webSourceCitations.ts
// Shared helper for turning web sources (e.g., Linkup SOURCE_GALLERY_DATA items) into stable citation IDs
// and injecting inline {{cite:...}} markers into narrative text.

export interface WebSourceLike {
  title?: string;
  url: string;
  domain?: string;
  description?: string;
}

function normalizeUrlForId(url: string): string {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return "";

  // Avoid throwing for non-URL strings; we just normalize lightly.
  // Keep query params because they can uniquely identify pages.
  return trimmed.replace(/#.*$/, "");
}

/**
 * FNV-1a 32-bit hash (hex) for stable, short identifiers.
 * Deterministic across JS runtimes.
 */
export function fnv1a32Hex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // hash *= 16777619 (mod 2^32)
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Stable citation ID for a web source URL.
 * Example: "websrc_9f86d081"
 */
export function makeWebSourceCitationId(url: string): string {
  const normalized = normalizeUrlForId(url);
  return `websrc_${fnv1a32Hex(normalized || String(url ?? ""))}`;
}

export function renderWebSourceCitationTokens(sources: WebSourceLike[], max = 5): string {
  const unique: WebSourceLike[] = [];
  const seen = new Set<string>();

  for (const s of sources) {
    const u = String(s?.url ?? "").trim();
    if (!u) continue;
    const id = makeWebSourceCitationId(u);
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push({ ...s, url: u });
    if (unique.length >= max) break;
  }

  return unique.map((s) => `{{cite:${makeWebSourceCitationId(s.url)}}}`).join("");
}

function splitDebriefBlock(text: string): { main: string; debrief: string } {
  const start = text.indexOf("[DEBRIEF_V1_JSON]");
  if (start < 0) return { main: text, debrief: "" };
  return { main: text.slice(0, start).trimEnd(), debrief: text.slice(start).trimStart() };
}

/**
 * Inject citation tokens near the top of the assistant response.
 * - No-op if citations already present
 * - Avoids injecting into the eval debrief block
 */
export function injectWebSourceCitationsIntoText(
  text: string,
  sources: WebSourceLike[],
  options?: { max?: number }
): { text: string; injected: boolean; tokenCount: number } {
  const raw = String(text ?? "");
  if (!raw.trim()) return { text: raw, injected: false, tokenCount: 0 };
  if (raw.includes("{{cite:")) return { text: raw, injected: false, tokenCount: 0 };

  const { main, debrief } = splitDebriefBlock(raw);
  const tokens = renderWebSourceCitationTokens(sources, options?.max ?? 5);
  if (!tokens) return { text: raw, injected: false, tokenCount: 0 };

  const tokenCount = (tokens.match(/\{\{cite:/g) || []).length;

  // Insert after the first paragraph break if it exists and is early; otherwise append.
  const insertAt = main.indexOf("\n\n");
  const patchedMain =
    insertAt > 0 && insertAt < 2500
      ? `${main.slice(0, insertAt)}${tokens}${main.slice(insertAt)}`
      : `${main.trimEnd()}${tokens}\n`;

  const patched = debrief ? `${patchedMain.trimEnd()}\n\n${debrief.trimStart()}` : patchedMain;
  return { text: patched, injected: true, tokenCount };
}

