// shared/sectionIds.ts
// Stable section ID generation for dossier linking
// Used by both Convex backend and React frontend

import { hashSync } from "./artifacts";

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL SECTION KEYS (newsletter-grade)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fixed section keys for structured dossiers.
 * These provide stable IDs across retries, reruns, and minor edits.
 */
export const DOSSIER_SECTION_KEYS = [
  "executive_summary",
  "company_overview",
  "market_landscape",
  "funding_signals",
  "product_analysis",
  "competitive_analysis",
  "founder_background",
  "investment_thesis",
  "risk_flags",
  "open_questions",
  "sources_and_media",
] as const;

export type DossierSectionKey = typeof DOSSIER_SECTION_KEYS[number];

/**
 * Human-readable labels for section keys
 */
export const SECTION_LABELS: Record<DossierSectionKey, string> = {
  executive_summary: "Executive Summary",
  company_overview: "Company Overview",
  market_landscape: "Market Landscape",
  funding_signals: "Funding Signals",
  product_analysis: "Product Analysis",
  competitive_analysis: "Competitive Analysis",
  founder_background: "Founder Background",
  investment_thesis: "Investment Thesis",
  risk_flags: "Risk Flags",
  open_questions: "Open Questions",
  sources_and_media: "Sources & Media",
};

/**
 * Common aliases to map ad-hoc headings to canonical keys.
 */
const SECTION_ALIASES: Record<string, DossierSectionKey> = {
  "market_analysis": "market_landscape",
  "market_trends": "market_landscape",
  "industry_analysis": "market_landscape",
  "competitive_landscape": "competitive_analysis",
  "competitors": "competitive_analysis",
  "competition": "competitive_analysis",
  "funding": "funding_signals",
  "investors": "funding_signals",
  "financing": "funding_signals",
  "valuation": "funding_signals",
  "team": "founder_background",
  "founders": "founder_background",
  "management": "founder_background",
  "leadership": "founder_background",
  "product": "product_analysis",
  "technology": "product_analysis",
  "solution": "product_analysis",
  "risks": "risk_flags",
  "challenges": "risk_flags",
  "summary": "executive_summary",
  "overview": "company_overview",
  "introduction": "company_overview",
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a stable section ID from runId + sectionKey.
 * Deterministic: same inputs always produce same output.
 */
export function generateSectionId(runId: string, sectionKey: string): string {
  return `sec_${hashSync(`${runId}|${sectionKey}`)}`;
}

/**
 * Slugify a heading into a section key (fallback for ad-hoc sections).
 * Used when content doesn't have explicit section metadata.
 * 
 * Example: "Market Landscape & Trends" → "market_landscape_trends"
 */
export function slugifySectionHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")  // Remove special chars
    .replace(/\s+/g, "_")          // Spaces to underscores
    .replace(/_+/g, "_")           // Collapse multiple underscores
    .replace(/^_|_$/g, "")         // Trim leading/trailing underscores
    .slice(0, 50);                 // Cap length
}

/**
 * Try to match a heading to a canonical section key.
 * Returns the canonical key if found, otherwise slugifies the heading.
 */
export function matchSectionKey(heading: string): string {
  const normalized = heading.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Try to match canonical keys
  for (const key of DOSSIER_SECTION_KEYS) {
    const keyNormalized = key.replace(/_/g, "");
    if (normalized.includes(keyNormalized) || keyNormalized.includes(normalized)) {
      return key;
    }
  }

  // Try aliases
  for (const [alias, key] of Object.entries(SECTION_ALIASES)) {
    const aliasNormalized = alias.replace(/_/g, "");
    if (normalized.includes(aliasNormalized)) {
      return key;
    }
  }

  // Fallback to slugified heading
  return slugifySectionHeading(heading);
}

// ═══════════════════════════════════════════════════════════════════════════
// FACT ANCHOR UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fact anchor pattern: {{fact:abc123}}
 * Used for evidence linking in markdown content.
 */
export const FACT_ANCHOR_REGEX = /\{\{fact:([a-zA-Z0-9_-]+)\}\}/g;

/**
 * Generate a stable fact ID from sectionId + claim index.
 */
export function generateFactId(sectionId: string, claimIndex: number): string {
  return `fact_${hashSync(`${sectionId}|${claimIndex}`)}`;
}

/**
 * Extract all fact IDs from markdown content.
 */
export function extractFactIds(markdown: string): string[] {
  const matches = markdown.matchAll(FACT_ANCHOR_REGEX);
  return Array.from(matches, m => m[1]);
}

/**
 * Strip fact anchors from markdown for clean display.
 * Returns { cleanMarkdown, factPositions }
 */
export function stripFactAnchors(markdown: string): {
  cleanMarkdown: string;
  factPositions: Array<{ factId: string; position: number }>;
} {
  const factPositions: Array<{ factId: string; position: number }> = [];
  let offset = 0;

  const cleanMarkdown = markdown.replace(FACT_ANCHOR_REGEX, (match, factId, index) => {
    factPositions.push({ factId, position: index - offset });
    offset += match.length;
    return "";
  });

  return { cleanMarkdown, factPositions };
}
