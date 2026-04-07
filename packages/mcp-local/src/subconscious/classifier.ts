/**
 * Prompt Classifier — classifies user prompts into task types
 * to determine which memory blocks are relevant for whisper injection.
 *
 * Port of Parselyfi's entity_context_extraction_agent pattern,
 * but lightweight (keyword-based, no LLM call for classification).
 */

import type { BlockType } from "./blocks.js";

// ── Types ────────────────────────────────────────────���─────────────────────

export type PromptClassification =
  | "code"          // implementation, debugging, refactoring
  | "strategy"      // company direction, wedge, priorities
  | "research"      // entity search, market analysis, competitor
  | "delegation"    // agent task dispatch, packet creation
  | "diligence"     // investor prep, banking, readiness
  | "unknown";      // lightweight fallback

export interface ClassificationResult {
  classification: PromptClassification;
  confidence: number;       // 0-1
  relevantBlocks: BlockType[];
  entities: string[];       // extracted entity names (lightweight NER)
}

// ── Block Mapping ──────────────────────────────────────────────────────────

const BLOCK_MAP: Record<PromptClassification, BlockType[]> = {
  code: ["agent_preferences", "current_wedge", "validated_workflows"],
  strategy: [
    "founder_identity", "company_identity", "current_wedge",
    "top_priorities", "open_contradictions",
  ],
  research: ["entity_watchlist", "recent_important_changes"],
  delegation: ["validated_workflows", "packet_lineage", "agent_preferences"],
  diligence: ["readiness_gaps", "company_identity", "packet_lineage"],
  unknown: ["current_wedge"],
};

// ── Keyword Patterns ───────────────────────────────────────────────────────

const PATTERNS: Array<{ classification: PromptClassification; keywords: RegExp }> = [
  {
    classification: "code",
    keywords: /\b(implement|build|code|fix|bug|refactor|test|debug|compile|deploy|typescript|function|component|endpoint|route|api|import|export|npm|git|commit|push|pr|pull request|merge|lint|type[- ]?check)\b/i,
  },
  {
    classification: "diligence",
    keywords: /\b(investor|diligence|due diligence|banking|bank|fundraise|series [a-d]|pitch|deck|readiness|compliance|audit|soc2|legal|term sheet|valuation|cap table|runway)\b/i,
  },
  {
    classification: "strategy",
    keywords: /\b(strategy|wedge|positioning|roadmap|priorities|direction|pivot|moat|differentiat|competitive advantage|mission|vision|market fit|icp|buyer|distribution|pricing|go.?to.?market|gtm)\b/i,
  },
  {
    classification: "delegation",
    keywords: /\b(delegate|dispatch|agent|task|packet|assign|orchestrat|automat|background|worker|swarm|teammate|pipeline|workflow)\b/i,
  },
  {
    classification: "research",
    keywords: /\b(research|search|look up|find|competitor|market|entity|company|investigate|analyze|compare|benchmark|signal|trend|news|watchlist)\b/i,
  },
];

// ── Lightweight NER ────────────────────────────────────────────────────────

// Matches capitalized multi-word names that look like entities
const ENTITY_PATTERN = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|LLC|Corp|Ltd|AI|Labs|Co)\.?)?)\b/g;

// Common false positives to filter
const ENTITY_STOPWORDS = new Set([
  "The", "This", "That", "These", "Those", "What", "When", "Where", "Why",
  "How", "Which", "Please", "Can", "Could", "Would", "Should", "Let",
  "Make", "Build", "Create", "Update", "Delete", "Add", "Remove", "Fix",
  "Run", "Start", "Stop", "Check", "Test", "Help", "Show", "Tell",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December",
]);

// ── Classifier ────────────────────────────────────────────────────��────────

export function classifyPrompt(prompt: string): ClassificationResult {
  const scores: Record<PromptClassification, number> = {
    code: 0, strategy: 0, research: 0, delegation: 0, diligence: 0, unknown: 0,
  };

  for (const pattern of PATTERNS) {
    const matches = prompt.match(pattern.keywords);
    if (matches) {
      scores[pattern.classification] += matches.length;
    }
  }

  // Find the winning classification
  let best: PromptClassification = "unknown";
  let bestScore = 0;
  for (const [cls, score] of Object.entries(scores) as Array<[PromptClassification, number]>) {
    if (cls !== "unknown" && score > bestScore) {
      best = cls;
      bestScore = score;
    }
  }

  // Confidence: normalized by total keyword matches
  const totalMatches = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalMatches > 0 ? bestScore / totalMatches : 0;

  // Extract entities
  const entities = extractEntities(prompt);

  return {
    classification: best,
    confidence: Math.min(1, confidence),
    relevantBlocks: BLOCK_MAP[best],
    entities,
  };
}

export function extractEntities(text: string): string[] {
  const matches = text.matchAll(ENTITY_PATTERN);
  const seen = new Set<string>();
  const entities: string[] = [];

  for (const match of matches) {
    const name = match[1].trim();
    if (name.length < 3) continue;
    if (ENTITY_STOPWORDS.has(name)) continue;
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    entities.push(name);
  }

  return entities;
}

/**
 * Quick check: is this prompt trivial enough to skip whispering?
 * Typo fixes, git operations, simple one-liners.
 */
export function isTrivialPrompt(prompt: string): boolean {
  if (prompt.length < 30) return true;
  if (/^(git |npm |npx |ls |cd |cat |pwd)/i.test(prompt.trim())) return true;
  if (/^fix (typo|spelling|whitespace|indent)/i.test(prompt.trim())) return true;
  return false;
}
