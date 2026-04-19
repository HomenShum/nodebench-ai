/**
 * acceptDecorationIntoNotebook — converts a live diligence decoration into
 * an editable notebook snapshot.
 *
 * Pattern: accept-to-convert ownership (PR5 from the refactor checklist).
 *
 *   Live decoration  →  user clicks "Accept into notebook"  →  frozen owned content
 *
 * Prior art:
 *   - Notion AI "Insert below" — converts AI output into editable text
 *   - Arc Boost "Keep" — promotes a live suggestion into persistent content
 *   - Cursor "Apply" — turns diff proposal into committed text
 *
 * See: .claude/rules/scratchpad_first.md
 *      docs/architecture/PROSEMIRROR_DECORATIONS.md
 *      src/features/entities/components/notebook/DiligenceDecorationPlugin.ts
 *
 * Critical invariants (from the design thread):
 *   1. Once accepted, the content is FROZEN. No future diligence updates
 *      mutate the accepted snapshot.
 *   2. If the user wants newer facts, they explicitly click "Refresh from
 *      latest" — which is a fresh accept, not an auto-update.
 *   3. Accepted content shows a quiet ownership cue ("Accepted from live
 *      intelligence · <timestamp>") but otherwise reads as normal prose.
 *
 * Phase 1 scope: hook stub with the final contract. Runtime conversion
 * (ProseMirror transaction that inserts the decoration body as real
 * document nodes) lands with the full decoration plugin impl in Phase 2.
 */

import type {
  DiligenceDecorationData,
} from "./DiligenceDecorationPlugin";

export type AcceptDecorationArgs = {
  /** The decoration data as it stood when the user clicked Accept. */
  decoration: DiligenceDecorationData;
  /** Where to insert — falls back to decoration anchor if omitted. */
  insertAfterBlockId?: string;
  /** Called if the accept fails (e.g., document version drift). */
  onFailure?: (reason: string) => void;
};

export type AcceptDecorationResult = {
  /** True if the decoration was successfully materialized as notebook content. */
  succeeded: boolean;
  /** The newly-created block's id, if succeeded. */
  blockId?: string;
  /** Timestamp at which the snapshot was frozen. */
  frozenAt?: number;
  /** Human-readable failure reason if !succeeded. */
  failureReason?: string;
};

/**
 * Phase 1 stub — records the intent so UI can show the correct state, but
 * does not yet perform the ProseMirror transaction. When the real impl
 * lands, this function will:
 *   1. Verify the decoration's scratchpadRunId + version are still current
 *   2. Create a ProseMirror transaction inserting the body as real nodes
 *   3. Tag the inserted blocks with a `frozenAt` + `sourceScratchpadRunId`
 *   4. Emit a backend mutation to persist the new owned content
 *   5. Remove the decoration from the live DecorationSet
 *   6. Return the new block's ID + freeze timestamp
 *
 * Scaffold returns a "not-yet-runtime" failure with actionable reason so
 * callers can integrate against the contract without behavioral surprises.
 */
export function acceptDecorationIntoNotebook(
  _args: AcceptDecorationArgs,
): AcceptDecorationResult {
  return {
    succeeded: false,
    failureReason:
      "accept-to-convert runtime not yet wired (Phase 1 scaffold); see " +
      "acceptDecorationIntoNotebook.ts for the contract shape",
  };
}

/**
 * Quiet ownership cue text — rendered under accepted content to make
 * provenance legible without being loud.
 *
 * Copy bias per design-reduction rule: explicit, short, human.
 */
export function buildAcceptedOwnershipCue(
  decoration: DiligenceDecorationData,
  frozenAt: number,
): string {
  const ageMs = Date.now() - frozenAt;
  const ageMin = Math.max(1, Math.round(ageMs / 60000));
  const timestamp =
    ageMin < 60
      ? `${ageMin}m ago`
      : ageMin < 24 * 60
        ? `${Math.round(ageMin / 60)}h ago`
        : `${Math.round(ageMin / (60 * 24))}d ago`;

  // Block type → human label
  const kindLabel: Record<DiligenceDecorationData["blockType"], string> = {
    founder: "founders",
    product: "products",
    funding: "funding",
    news: "news",
    hiring: "hiring",
    patent: "patents",
    publicOpinion: "public opinion",
    competitor: "competitors",
    regulatory: "regulatory",
    financial: "financial",
  };

  return `Accepted from live ${kindLabel[decoration.blockType]} intelligence · ${timestamp}`;
}
