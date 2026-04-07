/**
 * Whisper Policy — decides what to inject and what to suppress.
 *
 * Suppression-first: default is NO whisper unless high-value signal.
 * Classification-driven: prompt type determines which blocks to inject.
 */

import { type BlockType, getBlocksByIds, getBlock, getStaleBlocks, logWhisper, getRecentWhispers } from "./blocks.js";
import { classifyPrompt, isTrivialPrompt, type ClassificationResult } from "./classifier.js";
import { findContradictions, resolveEntity, traverseGraph, type TraversalResult } from "./graphEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type SubconsciousMode = "off" | "whisper" | "packet" | "full" | "review";

export interface WhisperResult {
  mode: SubconsciousMode;
  classification: ClassificationResult;
  whisperText: string;        // stdout injection content
  suppressed: boolean;
  suppressionReason: string | null;
  blockIdsUsed: BlockType[];
  contradictions: string[];   // contradiction warnings
  stalePackets: string[];     // stale packet warnings
}

// ── Token Budgets ──────────────────────────────────────────────────────────

const TOKEN_BUDGETS: Record<SubconsciousMode, number> = {
  off: 0,
  whisper: 200,
  packet: 1000,
  full: 2000,
  review: 0,
};

// ── Main Whisper Generator ─────────────────────────────────────────────────

export function generateWhisper(
  prompt: string,
  sessionId: string,
  mode: SubconsciousMode = "whisper"
): WhisperResult {
  const classification = classifyPrompt(prompt);

  // Mode: off or review → no injection
  if (mode === "off" || mode === "review") {
    return {
      mode,
      classification,
      whisperText: "",
      suppressed: true,
      suppressionReason: `mode=${mode}`,
      blockIdsUsed: [],
      contradictions: [],
      stalePackets: [],
    };
  }

  // Suppression check: trivial prompts
  if (isTrivialPrompt(prompt)) {
    const result: WhisperResult = {
      mode,
      classification,
      whisperText: "",
      suppressed: true,
      suppressionReason: "trivial_prompt",
      blockIdsUsed: [],
      contradictions: [],
      stalePackets: [],
    };
    logWhisper({
      sessionId,
      blockIds: [],
      whisperText: "",
      classification: classification.classification,
      suppressed: true,
      reason: "trivial_prompt",
    });
    return result;
  }

  // Suppression check: duplicate whisper (same classification <3 prompts ago)
  const recentWhispers = getRecentWhispers(sessionId, 3);
  const recentSameClass = recentWhispers.filter(
    (w) => !w.suppressed && w.classification === classification.classification
  );
  if (recentSameClass.length >= 2) {
    const result: WhisperResult = {
      mode,
      classification,
      whisperText: "",
      suppressed: true,
      suppressionReason: "duplicate_recent",
      blockIdsUsed: [],
      contradictions: [],
      stalePackets: [],
    };
    logWhisper({
      sessionId,
      blockIds: [],
      whisperText: "",
      classification: classification.classification,
      suppressed: true,
      reason: "duplicate_recent",
    });
    return result;
  }

  // Build whisper content
  const blocks = getBlocksByIds(classification.relevantBlocks);
  const populatedBlocks = blocks.filter((b) => b.value.length > 0);

  const lines: string[] = [];
  const blockIdsUsed: BlockType[] = [];

  // Check for contradictions via graph traversal
  const contradictions: string[] = [];
  for (const entityName of classification.entities) {
    const entity = resolveEntity(entityName);
    if (!entity) continue;
    const contradictionResults = findContradictions(entity.id, 2);
    for (const cr of contradictionResults.slice(0, 2)) {
      contradictions.push(
        `"${entity.label}" contradicts "${cr.entity.label}" (via ${cr.reachedVia}, confidence ${(cr.confidence * 100).toFixed(0)}%)`
      );
    }
  }

  // Check for stale packets
  const stalePackets: string[] = [];
  const packetLineage = getBlock("packet_lineage");
  if (packetLineage.value.length > 0) {
    const staleBlocks = getStaleBlocks(7);
    for (const sb of staleBlocks.slice(0, 3)) {
      stalePackets.push(`${sb.label} (last updated: ${sb.updatedAt.split("T")[0]})`);
    }
  }

  // Build whisper text based on mode
  if (mode === "whisper") {
    // 1-3 lines max
    if (contradictions.length > 0) {
      lines.push(`Contradiction: ${contradictions[0]}`);
    }
    if (populatedBlocks.length > 0) {
      const topBlock = populatedBlocks[0];
      const firstLine = topBlock.value.split("\n")[0].slice(0, 100);
      lines.push(`${topBlock.label}: ${firstLine}`);
      blockIdsUsed.push(topBlock.id);
    }
    if (stalePackets.length > 0) {
      lines.push(`Stale: ${stalePackets[0]}`);
    }
  } else if (mode === "packet" || mode === "full") {
    // Richer injection
    if (contradictions.length > 0) {
      lines.push("Contradictions:");
      for (const c of contradictions) lines.push(`  - ${c}`);
    }
    for (const block of populatedBlocks) {
      const budget = mode === "full" ? 500 : 200;
      const truncated = block.value.slice(0, budget);
      lines.push(`\n[${block.label}] (v${block.version}, ${block.confidence})`);
      lines.push(truncated);
      blockIdsUsed.push(block.id);
    }
    if (stalePackets.length > 0) {
      lines.push("\nStale blocks:");
      for (const sp of stalePackets) lines.push(`  - ${sp}`);
    }
  }

  // Truncate to token budget (rough: 4 chars per token)
  const budget = TOKEN_BUDGETS[mode];
  let whisperText = lines.join("\n");
  if (whisperText.length > budget * 4) {
    whisperText = whisperText.slice(0, budget * 4) + "\n...";
  }

  // Wrap in XML tag for Claude Code injection
  if (whisperText.length > 0) {
    whisperText = `<nodebench_whisper>\n${whisperText}\n</nodebench_whisper>`;
  }

  // Log
  logWhisper({
    sessionId,
    blockIds: blockIdsUsed,
    whisperText,
    classification: classification.classification,
    suppressed: false,
    reason: null,
  });

  return {
    mode,
    classification,
    whisperText,
    suppressed: whisperText.length === 0,
    suppressionReason: whisperText.length === 0 ? "no_relevant_blocks" : null,
    blockIdsUsed,
    contradictions,
    stalePackets,
  };
}
