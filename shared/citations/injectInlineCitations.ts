// shared/citations/injectInlineCitations.ts
// Transforms {{fact:xxx}} anchors into inline superscript citations
// and builds stable artifact-to-number mappings for footnotes

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Maps factId -> artifactIds[] (from artifact store's evidenceLinks) */
export type FactToArtifacts = Record<string, string[]>;

export interface CitationIndex {
  /** Maps artifactId -> citation number (1-indexed) */
  artifactIdToNum: Map<string, number>;
  /** Ordered list of artifact IDs by citation number (index 0 = citation 1) */
  numToArtifactId: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// REGEX PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Matches fact anchors in two formats:
 * - {{fact:sectionKey:slug}} (new format)
 * - {{fact:factId}} (legacy format)
 */
const FACT_RE = /\{\{fact:([^}:]+)(?::([^}]+))?\}\}/g;

// ═══════════════════════════════════════════════════════════════════════════
// CITATION INDEX BUILDING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a stable citation index from markdown text.
 * Assigns sequential numbers to artifacts as they appear in the text.
 * 
 * @param text - Markdown content with {{fact:...}} anchors
 * @param factToArtifacts - Mapping from factId to artifactIds
 * @param prior - Optional prior map to maintain stable numbering during streaming
 */
export function buildStableCitationIndex(
  text: string,
  factToArtifacts: FactToArtifacts,
  prior?: Map<string, number>
): CitationIndex {
  const artifactIdToNum = new Map<string, number>(prior ?? []);
  const numToArtifactId: string[] = [];

  // Hydrate numToArtifactId from prior map
  if (artifactIdToNum.size) {
    const max = Math.max(...artifactIdToNum.values());
    for (let i = 1; i <= max; i++) numToArtifactId.push("");
    for (const [aid, n] of artifactIdToNum) {
      numToArtifactId[n - 1] = aid;
    }
  }

  let next = numToArtifactId.length + 1;

  // Reset regex state
  FACT_RE.lastIndex = 0;

  for (const match of text.matchAll(FACT_RE)) {
    // Handle both formats: {{fact:sectionKey:slug}} and {{fact:factId}}
    const sectionKey = match[1];
    const slug = match[2];
    
    // Try both formats for lookup
    const factIdFull = slug ? `${sectionKey}:${slug}` : sectionKey;
    const factIdSimple = sectionKey;
    
    // Look up artifacts - try full format first, then simple
    const artifactIds = factToArtifacts[factIdFull] ?? factToArtifacts[factIdSimple] ?? [];
    
    for (const aid of artifactIds) {
      if (!artifactIdToNum.has(aid)) {
        artifactIdToNum.set(aid, next);
        numToArtifactId[next - 1] = aid;
        next++;
      }
    }
  }

  return { artifactIdToNum, numToArtifactId };
}

// ═══════════════════════════════════════════════════════════════════════════
// INLINE CITATION INJECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Replace {{fact:...}} anchors with inline superscript citations.
 * Output is HTML that can be rendered via rehype-raw.
 * 
 * @param text - Markdown content with fact anchors
 * @param factToArtifacts - Mapping from factId to artifactIds
 * @param artifactIdToNum - Stable citation numbering map
 */
export function injectInlineCitationSupers(
  text: string,
  factToArtifacts: FactToArtifacts,
  artifactIdToNum: Map<string, number>
): string {
  // Reset regex state
  FACT_RE.lastIndex = 0;

  return text.replace(FACT_RE, (_, sectionKey: string, slug?: string) => {
    // Handle both formats
    const factIdFull = slug ? `${sectionKey}:${slug}` : sectionKey;
    const factIdSimple = sectionKey;
    
    const artifactIds = factToArtifacts[factIdFull] ?? factToArtifacts[factIdSimple] ?? [];
    
    if (!artifactIds.length) return ""; // If unresolved, omit marker

    const nums = artifactIds
      .map((aid) => artifactIdToNum.get(aid))
      .filter((n): n is number => typeof n === "number")
      .sort((a, b) => a - b);

    if (!nums.length) return "";

    // Generate superscript links - only hash-links + data attributes (no raw URLs)
    const links = nums
      .map((n) => {
        // Find artifact ID for this number
        const aid = Array.from(artifactIdToNum.entries()).find(([, v]) => v === n)?.[0];
        return `<a href="#source-${n}" data-artifact-id="${aid ?? ""}" class="nb-cite-link">${n}</a>`;
      })
      .join("");

    return `<sup class="nb-cite" aria-label="Sources">${links}</sup>`;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY: Strip fact anchors (for plain text output)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Remove all {{fact:...}} anchors from text.
 * Useful for plain text exports or summaries.
 */
export function stripFactAnchors(text: string): string {
  return text.replace(FACT_RE, "");
}

/**
 * Extract all fact IDs from text.
 */
export function extractFactIds(text: string): string[] {
  FACT_RE.lastIndex = 0;
  const ids: string[] = [];
  
  for (const match of text.matchAll(FACT_RE)) {
    const sectionKey = match[1];
    const slug = match[2];
    ids.push(slug ? `${sectionKey}:${slug}` : sectionKey);
  }
  
  return ids;
}
