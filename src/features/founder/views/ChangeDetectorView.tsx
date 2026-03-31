/**
 * ChangeDetectorView — Phase 10F
 *
 * Surfaces important changes that require attention.
 * Shows detected changes with impact scores, affected entities,
 * and suggested actions. Resolution workflow built in.
 */

import { memo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  Shield,
  Target,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCausalMemory } from "../lib/useCausalMemory";

// Demo fixtures sourced from useCausalMemory hook

// ── Styling ────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
  confidence_drop: { icon: ArrowDown, color: "text-red-400", label: "Confidence Drop" },
  initiative_blocked: { icon: Shield, color: "text-amber-400", label: "Initiative Blocked" },
  identity_drift: { icon: Target, color: "text-orange-400", label: "Identity Drift" },
  agent_anomaly: { icon: Zap, color: "text-cyan-400", label: "Agent Anomaly" },
  signal_spike: { icon: ArrowUp, color: "text-teal-400", label: "Signal Spike" },
  contradiction_new: { icon: AlertTriangle, color: "text-rose-400", label: "New Contradiction" },
  intervention_overdue: { icon: AlertTriangle, color: "text-yellow-400", label: "Overdue Intervention" },
  priority_shift: { icon: ArrowUp, color: "text-blue-400", label: "Priority Shift" },
  outcome_negative: { icon: ArrowDown, color: "text-red-400", label: "Negative Outcome" },
  external_disruption: { icon: Zap, color: "text-purple-400", label: "External Disruption" },
};

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  detected: { color: "text-red-400", bgColor: "bg-red-500/10 border-red-500/20", label: "Detected" },
  acknowledged: { color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/20", label: "Acknowledged" },
  investigating: { color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20", label: "Investigating" },
  resolved: { color: "text-emerald-400", bgColor: "bg-emerald-500/10 border-emerald-500/20", label: "Resolved" },
  dismissed: { color: "text-white/30", bgColor: "bg-white/[0.04] border-white/[0.06]", label: "Dismissed" },
};

function ImpactBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "text-red-400 bg-red-500/10" : pct >= 50 ? "text-amber-400 bg-amber-500/10" : "text-white/50 bg-white/[0.06]";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] tabular-nums font-medium", color)}>
      {pct}%
    </span>
  );
}

// ── Types ──────────────────────────────────────────────────────────────

interface ImportantChange {
  id: string;
  changeCategory: string;
  impactScore: number;
  impactReason: string;
  affectedEntities: { entityType: string; entityId: string; entityLabel: string }[];
  shouldTriggerPacket: boolean;
  shouldTriggerBrief: boolean;
  shouldTriggerAlert: boolean;
  suggestedAction?: string;
  status: "detected" | "acknowledged" | "investigating" | "resolved" | "dismissed";
  createdAt: number;
}

// ── Change Card ────────────────────────────────────────────────────────

function ChangeCard({ change }: { change: ImportantChange }) {
  const [expanded, setExpanded] = useState(false);
  const config = CATEGORY_CONFIG[change.changeCategory] ?? { icon: AlertTriangle, color: "text-white/50", label: change.changeCategory };
  const statusConfig = STATUS_CONFIG[change.status] ?? STATUS_CONFIG.detected;
  const Icon = config.icon;

  const age = Date.now() - change.createdAt;
  const ageStr = age < 3_600_000 ? `${Math.round(age / 60_000)}m ago` : age < 86_400_000 ? `${Math.round(age / 3_600_000)}h ago` : `${Math.round(age / 86_400_000)}d ago`;

  const isActive = change.status === "detected" || change.status === "acknowledged" || change.status === "investigating";

  return (
    <div className={cn("rounded-xl border p-4 transition-colors", isActive ? statusConfig.bgColor : "border-white/[0.06] bg-white/[0.03]")}>
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-start gap-3 text-left">
        <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]", config.color)}>
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-medium", config.color)}>{config.label}</span>
            <ImpactBadge score={change.impactScore} />
            <span className={cn("rounded px-1.5 py-0.5 text-[9px]", statusConfig.color, "bg-transparent")}>{statusConfig.label}</span>
            <span className="ml-auto text-[10px] text-white/25">{ageStr}</span>
          </div>
          <p className="mt-1 text-xs text-white/60">{change.impactReason}</p>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 pl-10">
          {/* Affected entities */}
          <div>
            <div className="mb-1 text-[9px] uppercase tracking-wider text-white/25">Affected Entities</div>
            <div className="flex flex-wrap gap-1">
              {change.affectedEntities.map((e, i) => (
                <span key={i} className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/50">
                  {e.entityLabel} <span className="text-white/25">({e.entityType})</span>
                </span>
              ))}
            </div>
          </div>

          {/* Triggers */}
          <div className="flex gap-3 text-[10px]">
            {change.shouldTriggerPacket && <span className="text-accent-primary">Triggers packet regen</span>}
            {change.shouldTriggerBrief && <span className="text-cyan-400">Triggers agent brief</span>}
            {change.shouldTriggerAlert && <span className="text-red-400">Triggers alert</span>}
          </div>

          {/* Suggested action */}
          {change.suggestedAction && (
            <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-2.5">
              <div className="mb-0.5 text-[9px] uppercase tracking-wider text-emerald-400/40">Suggested Action</div>
              <p className="text-[10px] text-emerald-300/60">{change.suggestedAction}</p>
            </div>
          )}

          {/* Action buttons */}
          {isActive && (
            <div className="flex gap-2">
              <button className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] text-emerald-400 hover:bg-emerald-500/20">
                <Check className="h-3 w-3" /> Resolve
              </button>
              <button className="flex items-center gap-1 rounded-lg bg-blue-500/10 px-2.5 py-1 text-[10px] text-blue-400 hover:bg-blue-500/20">
                <Eye className="h-3 w-3" /> Investigate
              </button>
              <button className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2.5 py-1 text-[10px] text-white/40 hover:bg-white/[0.10]">
                <X className="h-3 w-3" /> Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main View ──────────────────────────────────────────────────────────

function ChangeDetectorViewInner() {
  const { importantChanges } = useCausalMemory();
  const [filter, setFilter] = useState<"active" | "all" | "resolved">("active");

  const filtered = importantChanges.filter((c) => {
    if (filter === "active") return c.status === "detected" || c.status === "acknowledged" || c.status === "investigating";
    if (filter === "resolved") return c.status === "resolved" || c.status === "dismissed";
    return true;
  });

  const activeCount = importantChanges.filter(
    (c) => c.status === "detected" || c.status === "acknowledged" || c.status === "investigating",
  ).length;

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[11px] uppercase tracking-[0.2em] text-white/40">Important Changes</h1>
            {activeCount > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] tabular-nums font-medium text-red-400">
                {activeCount} active
              </span>
            )}
          </div>
          <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] p-0.5">
            {(["active", "all", "resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-medium capitalize transition-colors",
                  filter === f ? "bg-accent-primary/20 text-accent-primary" : "text-white/40 hover:text-white/60",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-5 gap-2">
          {["detected", "acknowledged", "investigating", "resolved", "dismissed"].map((status) => {
            const count = importantChanges.filter((c) => c.status === status).length;
            const sc = STATUS_CONFIG[status];
            return (
              <div key={status} className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-center">
                <div className={cn("text-lg font-light tabular-nums", sc?.color ?? "text-white/50")}>{count}</div>
                <div className="text-[8px] uppercase tracking-wider text-white/25">{status}</div>
              </div>
            );
          })}
        </div>

        {/* Changes list */}
        <div className="space-y-2">
          {filtered.map((change) => (
            <ChangeCard key={change.id} change={change} />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-8 text-center">
              <Check className="mx-auto h-8 w-8 text-emerald-400/40" />
              <p className="mt-2 text-sm text-white/40">No {filter} changes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ChangeDetectorView = memo(ChangeDetectorViewInner);
export default ChangeDetectorView;
