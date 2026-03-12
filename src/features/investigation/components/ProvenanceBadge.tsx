import { cn } from "@/lib/utils";
import type { ProvenanceTier } from "../data/ftxGoldenDataset";

const TIER_CONFIG: Record<
  ProvenanceTier,
  { label: string; dot: string; bg: string; text: string }
> = {
  verified_public: {
    label: "VERIFIED",
    dot: "bg-emerald-400",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  },
  heuristic_inferred: {
    label: "INFERRED",
    dot: "bg-amber-400",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
  },
  unavailable_simulated: {
    label: "SIMULATED",
    dot: "bg-red-400",
    bg: "bg-red-500/10",
    text: "text-red-400",
  },
};

interface ProvenanceBadgeProps {
  tier: ProvenanceTier;
  reason?: string;
  className?: string;
}

export function ProvenanceBadge({ tier, reason, className }: ProvenanceBadgeProps) {
  const config = TIER_CONFIG[tier];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider",
        config.bg,
        config.text,
        className,
      )}
      title={reason}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
