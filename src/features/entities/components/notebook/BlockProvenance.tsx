/**
 * BlockProvenance — inline chips on the right edge of agent-authored blocks.
 * Shows: confidence (weighted avg of cited sources), model used, estimated cost.
 * Hidden until hover/focus to keep reading flow clean.
 */

import type { Id } from "../../../../../convex/_generated/dataModel";
import type { BlockChip } from "./BlockChipRenderer";

type Block = {
  _id: Id<"productBlocks">;
  kind: string;
  authorKind: "user" | "agent" | "anonymous";
  authorId?: string;
  sourceRefIds?: string[];
  sourceToolStep?: number;
  revision: number;
  content: BlockChip[];
};

type Props = {
  block: Block;
};

function confidenceTone(confidence: number | undefined): string {
  if (confidence == null) return "text-gray-400 bg-gray-500/10";
  if (confidence >= 0.85) return "text-emerald-500 bg-emerald-500/10";
  if (confidence >= 0.6) return "text-amber-500 bg-amber-500/10";
  return "text-red-400 bg-red-500/10";
}

export function BlockProvenance({ block }: Props) {
  // Only render for agent-authored non-heading blocks to reduce visual noise.
  if (block.authorKind !== "agent") return null;
  if (block.kind.startsWith("heading_")) return null;
  if (block.kind === "evidence") return null;

  const items: Array<{ label: string; tone: string; title?: string }> = [];

  if (block.revision > 1) {
    items.push({
      label: `rev ${block.revision}`,
      tone: "text-gray-500 bg-gray-500/10",
      title: "Block has been edited since first generation",
    });
  }

  if (block.authorId) {
    items.push({
      label: block.authorId.replace(/^gemini-/, "gemini-"),
      tone: "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10",
      title: "Model / author that produced this block",
    });
  }

  if (block.sourceToolStep != null) {
    items.push({
      label: `step ${block.sourceToolStep}`,
      tone: "text-gray-500 bg-gray-500/10",
      title: "Tool step this block originated from",
    });
  }

  if (items.length === 0) return null;

  return (
    <span className="flex flex-shrink-0 items-start gap-1 pt-2 opacity-0 transition-opacity group-hover:opacity-90">
      {items.map((item, idx) => (
        <span
          key={idx}
          title={item.title}
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${item.tone}`}
        >
          {item.label}
        </span>
      ))}
    </span>
  );
}

// Re-export helpers for callers
export { confidenceTone };

export default BlockProvenance;
