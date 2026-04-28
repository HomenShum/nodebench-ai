import { Check, AlertTriangle, Clock, Loader2, X, ShieldCheck, ShieldX } from "lucide-react";
import type { StepStatus } from "../types";

const TONE: Record<StepStatus, { label: string; classes: string; Icon: typeof Check }> = {
  pending: {
    label: "Pending",
    classes: "border-edge bg-surface/50 text-content-muted",
    Icon: Clock,
  },
  running: {
    label: "Running",
    classes: "border-blue-500/30 bg-blue-500/10 text-blue-200",
    Icon: Loader2,
  },
  complete: {
    label: "Complete",
    classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    Icon: Check,
  },
  error: {
    label: "Error",
    classes: "border-red-500/40 bg-red-500/10 text-red-200",
    Icon: X,
  },
  needs_review: {
    label: "Needs review",
    classes: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    Icon: AlertTriangle,
  },
  approved: {
    label: "Approved",
    classes: "border-[#d97757]/40 bg-[#d97757]/15 text-[#f0c2a8]",
    Icon: ShieldCheck,
  },
  rejected: {
    label: "Rejected",
    classes: "border-red-500/40 bg-red-500/15 text-red-200",
    Icon: ShieldX,
  },
};

export function StepStatusBadge({ status }: { status: StepStatus }) {
  const tone = TONE[status];
  const Icon = tone.Icon;
  const isSpinning = status === "running";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tone.classes}`}
      aria-label={`Status: ${tone.label}`}
      role="status"
    >
      <Icon
        className={`h-3 w-3 ${isSpinning ? "motion-safe:animate-spin" : ""}`}
        aria-hidden="true"
      />
      {tone.label}
    </span>
  );
}
