/**
 * DiligenceDecorationPlugin — ProseMirror plugin that renders live diligence
 * blocks as read-only decorations overlaid on the notebook document.
 *
 * Pattern: decoration-first rendering (PR4 from the refactor checklist).
 *          Agent-generated output does NOT occupy document slots — it
 *          renders as ProseMirror decorations that update live without
 *          touching the user's synced notebook content.
 *
 * Prior art:
 *   - ProposalInlineDecorations (existing in src/features/editor/components/
 *     UnifiedEditor) — proven decoration pattern for agent proposals
 *   - Notion AI blocks (rendered overlays, accept-to-convert)
 *   - Arc Boosts (read-only agent cards that can be promoted)
 *   - Mem auto-captures
 *
 * See: docs/architecture/PROSEMIRROR_DECORATIONS.md
 *      docs/architecture/DILIGENCE_BLOCKS.md
 *      .claude/rules/orchestrator_workers.md
 *      .claude/rules/reference_attribution.md
 *      src/features/editor/components/UnifiedEditor/ProposalInlineDecorations.tsx
 *
 * Phase 1 scope: this is a type-safe scaffold. Runtime wiring (reading
 * structured diligence output from Convex and projecting as DecorationSet)
 * lands alongside the orchestrator runtime in Phase 2. The scaffold defines
 * the contract so block-specific renderers (FounderRenderer, ProductRenderer,
 * etc.) can be authored in parallel.
 */

import type { Plugin } from "prosemirror-state";
import type { EvidenceTier } from "@/features/entities/components/EvidenceChip";

/**
 * The shape the plugin expects from each diligence block's projection.
 * One instance per block per entity per scratchpad version.
 */
export type DiligenceDecorationData = {
  /** Block type — one of the 10 canonical diligence blocks. */
  blockType:
    | "founder"
    | "product"
    | "funding"
    | "news"
    | "hiring"
    | "patent"
    | "publicOpinion"
    | "competitor"
    | "regulatory"
    | "financial";

  /** Confidence tier from verification gates. Drives the block's chip. */
  overallTier: EvidenceTier;

  /** Short header text (e.g. "Founders · 2 verified, 1 unresolved"). */
  headerText: string;

  /** Optional description body — prose, not card-grid. */
  bodyProse?: string;

  /** Scratchpad run ID that produced this projection. Stable key. */
  scratchpadRunId: string;

  /**
   * Monotonically increasing version — the plugin diffs on this to decide
   * whether to re-render a decoration. DETERMINISTIC rule: same input must
   * produce same version.
   */
  version: number;

  /** Timestamp of the latest update — rendered as "updated Xh ago". */
  updatedAt: number;

  /** Last-edited scratchpad section ID (for contribution log linkage). */
  sourceSectionId?: string;
};

/**
 * Anchor strategy — where decorations mount inside the document.
 *
 * Resolution order (first match wins):
 *  - `after-heading:<text>` — decorations appear after an early heading with
 *    this text if one exists (e.g., "## About" or "## Overview")
 *  - `before-heading:<text>` — decorations appear before a late heading with
 *    this text (e.g., "## My notes")
 *  - `top` — decorations appear at the top of the document (empty notebook case)
 *  - `bottom` — decorations appear at the end
 */
export type AnchorStrategy =
  | { kind: "top" }
  | { kind: "bottom" }
  | { kind: "after-heading"; text: string }
  | { kind: "before-heading"; text: string };

export type DiligenceDecorationPluginConfig = {
  /** Data source — the plugin subscribes externally and pushes updates in. */
  getDecorations: () => DiligenceDecorationData[];

  /** Anchor ordering — first match wins. */
  anchors: AnchorStrategy[];

  /** Optional callback when a user clicks "Accept into notebook" on a decoration. */
  onAcceptDecoration?: (scratchpadRunId: string, blockType: DiligenceDecorationData["blockType"]) => void;

  /** Optional callback when a user clicks "Dismiss". */
  onDismissDecoration?: (scratchpadRunId: string, blockType: DiligenceDecorationData["blockType"]) => void;

  /** Optional callback when a user clicks "Refresh from live intelligence". */
  onRefreshDecoration?: (scratchpadRunId: string, blockType: DiligenceDecorationData["blockType"]) => void;
};

/**
 * PR4 scaffold — the plugin factory. Phase 1 returns `null` to indicate
 * "not yet runtime-wired" so callers can safely guard on the return value.
 * The real implementation will:
 *  1. Accept the config above
 *  2. Compute anchor positions via ProseMirror document scan
 *  3. Build a DecorationSet from the configured renderers
 *  4. Memoize by scratchpadRunId + version (no rebuild when nothing changed)
 *  5. Return a ProseMirror Plugin with the decoration set in its state
 *
 * Phase 2 will wire this into EntityNotebookLive and the new
 * useDiligenceBlocks hook (see useDiligenceBlocks.ts).
 *
 * Returning null keeps integration surface zero while the interface hardens.
 */
export function createDiligenceDecorationPlugin(
  _config: DiligenceDecorationPluginConfig,
): Plugin | null {
  // Intentional: scaffold returns null until Phase 2 wires the real impl.
  // This lets callers integrate against the final prop shape now without
  // breaking behavior. When the impl lands, callers won't need to change.
  return null;
}

/**
 * Pluggable renderer contract — one per block type. Kept separate from the
 * plugin so adding a new block (ProductRenderer, PatentRenderer) requires
 * only a new renderer file, not changes to the plugin or notebook shell.
 *
 * This is PR9's generic contract (not founder-specialized).
 */
export type DecorationRendererRegistry = Partial<
  Record<DiligenceDecorationData["blockType"], DecorationRenderer>
>;

export type DecorationRenderer = {
  /** Render the header row — title + evidence chip + updated timestamp. */
  renderHeader: (data: DiligenceDecorationData) => HTMLElement;
  /** Render the body — prose-native, not card-grid. */
  renderBody: (data: DiligenceDecorationData) => HTMLElement;
  /** Render the actions menu (Accept / Refresh / Dismiss / Open log). */
  renderActions?: (data: DiligenceDecorationData) => HTMLElement;
};
