// shared/verification/citationScrubber.ts
// Citation scrubber to remove hallucinated URLs from LLM output
// Only allows URLs that exist in the artifact store for the run

import { canonicalizeUrl } from "../artifacts";

// ═══════════════════════════════════════════════════════════════════════════
// URL EXTRACTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

// Markdown links: [text](url)
const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;

// Raw URLs (not in markdown)
const RAW_URL_REGEX = /(?<!\]\()(?<!")(https?:\/\/[^\s<>"')\]]+)/g;

// HTML href: href="url" or href='url'
const HTML_HREF_REGEX = /href=["'](https?:\/\/[^"']+)["']/gi;

// Fake confidence patterns: 0.95, 0.90, etc. (common hallucination)
const FAKE_CONFIDENCE_REGEX = /\b(0\.\d{1,2})\s*(?:confidence|score)?/gi;

// Fake timestamp patterns: "retrieved 02:40 UTC", "fetched at 14:30"
const FAKE_TIMESTAMP_REGEX = /(?:retrieved|fetched|accessed|scraped)\s+(?:at\s+)?(\d{1,2}:\d{2}(?::\d{2})?\s*(?:UTC|GMT|[A-Z]{2,4})?)/gi;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ScrubResult {
  /** Scrubbed output text */
  text: string;
  /** URLs that were removed (for logging) */
  removedUrls: string[];
  /** Count of fake confidences removed */
  removedConfidences: number;
  /** Count of fake timestamps removed */
  removedTimestamps: number;
  /** Whether any scrubbing occurred */
  wasScrubbed: boolean;
}

export interface ScrubOptions {
  /** Remove fake confidence scores (default: true) */
  scrubConfidences?: boolean;
  /** Remove fake timestamps (default: true) */
  scrubTimestamps?: boolean;
  /** Replacement text for removed URLs (default: "[SOURCE REMOVED]") */
  urlReplacement?: string;
  /** Replacement text for confidence (default: empty string) */
  confidenceReplacement?: string;
  /** Replacement text for timestamps (default: empty string) */
  timestampReplacement?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCRUBBER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scrub hallucinated URLs from LLM output
 * 
 * Only allows URLs that exist in the allowedUrls set (from artifact store).
 * Also removes fake confidence scores and timestamps unless disabled.
 * 
 * @param text - The LLM output text to scrub
 * @param allowedUrls - Set of canonical URLs that are allowed (from artifacts)
 * @param options - Scrubbing options
 * @returns ScrubResult with cleaned text and removal stats
 */
export function scrubUnverifiedCitations(
  text: string,
  allowedUrls: Set<string>,
  options: ScrubOptions = {}
): ScrubResult {
  const {
    scrubConfidences = true,
    scrubTimestamps = true,
    urlReplacement = "[SOURCE REMOVED]",
    confidenceReplacement = "",
    timestampReplacement = "",
  } = options;

  let result = text;
  const removedUrls: string[] = [];
  let removedConfidences = 0;
  let removedTimestamps = 0;

  // 1. Scrub markdown links: [text](url)
  result = result.replace(MARKDOWN_LINK_REGEX, (match, linkText, url) => {
    const canonical = canonicalizeUrl(url);
    if (allowedUrls.has(canonical)) {
      return match; // Keep allowed URLs
    }
    removedUrls.push(url);
    // Keep the link text but remove the URL
    return `${linkText} ${urlReplacement}`;
  });

  // 2. Scrub HTML href attributes
  result = result.replace(HTML_HREF_REGEX, (match, url) => {
    const canonical = canonicalizeUrl(url);
    if (allowedUrls.has(canonical)) {
      return match; // Keep allowed URLs
    }
    removedUrls.push(url);
    return `href="#" data-removed="true"`;
  });

  // 3. Scrub raw URLs (not in markdown/HTML)
  // This is trickier - we need to avoid double-scrubbing URLs already in markdown
  result = result.replace(RAW_URL_REGEX, (url) => {
    const canonical = canonicalizeUrl(url);
    if (allowedUrls.has(canonical)) {
      return url; // Keep allowed URLs
    }
    // Check if this URL was already handled by markdown scrubbing
    if (removedUrls.includes(url)) {
      return url; // Already handled
    }
    removedUrls.push(url);
    return urlReplacement;
  });

  // 4. Scrub fake confidence scores (0.95, 0.90, etc.)
  if (scrubConfidences) {
    result = result.replace(FAKE_CONFIDENCE_REGEX, (match) => {
      removedConfidences++;
      return confidenceReplacement;
    });
  }

  // 5. Scrub fake timestamps ("retrieved 02:40 UTC")
  if (scrubTimestamps) {
    result = result.replace(FAKE_TIMESTAMP_REGEX, (match) => {
      removedTimestamps++;
      return timestampReplacement;
    });
  }

  // Clean up any double spaces or orphaned punctuation from removals
  result = result
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();

  const wasScrubbed = removedUrls.length > 0 || removedConfidences > 0 || removedTimestamps > 0;

  return {
    text: result,
    removedUrls: [...new Set(removedUrls)], // Dedupe
    removedConfidences,
    removedTimestamps,
    wasScrubbed,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build allowed URLs set from artifact canonical URLs
 */
export function buildAllowedUrlsSet(artifactUrls: string[]): Set<string> {
  return new Set(artifactUrls.map(url => canonicalizeUrl(url)));
}

/**
 * Extract all URLs from text (for analysis/logging)
 */
export function extractAllUrls(text: string): string[] {
  const urls: string[] = [];
  
  // Markdown links
  let match;
  const mdRegex = new RegExp(MARKDOWN_LINK_REGEX.source, "g");
  while ((match = mdRegex.exec(text)) !== null) {
    urls.push(match[2]);
  }
  
  // HTML hrefs
  const hrefRegex = new RegExp(HTML_HREF_REGEX.source, "gi");
  while ((match = hrefRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }
  
  // Raw URLs
  const rawRegex = new RegExp(RAW_URL_REGEX.source, "g");
  while ((match = rawRegex.exec(text)) !== null) {
    urls.push(match[0]);
  }
  
  return [...new Set(urls)]; // Dedupe
}

/**
 * Check if text contains any URLs not in the allowed set
 * Useful for validation before storage
 */
export function hasUnallowedUrls(text: string, allowedUrls: Set<string>): boolean {
  const urls = extractAllUrls(text);
  for (const url of urls) {
    const canonical = canonicalizeUrl(url);
    if (!allowedUrls.has(canonical)) {
      return true;
    }
  }
  return false;
}
