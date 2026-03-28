import { memo, useState, useCallback } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  FileText,
  GitBranch,
  Layers,
  Send,
  Shield,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturePlan, PlanPhase, PlanRisk, CodebaseReadiness } from "../types/planProposal";

/* ─── Props ──────────────────────────────────────────────────────────── */

interface PlanProposalPanelProps {
  plan: FeaturePlan | null;
  isLoading?: boolean;
  isLive?: boolean;
  onDelegate?: (plan: FeaturePlan) => void;
  onCopyMarkdown?: (plan: FeaturePlan) => void;
}

/* ─── Constants ──────────────────────────────────────────────────────── */

const GLASS_CARD = "rounded-xl border border-white/[0.20] bg-white/[0.12]";
const SECTION_HEADER =
  "text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60";
const INNER_CARD = "rounded-lg border border-white/[0.06] bg-black/10 p-4";

const SEVERITY_COLOR: Record<string, string> = {
  high: "text-red-400 border-red-400/30",
  medium: "text-amber-400 border-amber-400/30",
  low: "text-emerald-400 border-emerald-400/30",
};

const READINESS_ICON: Record<string, { icon: string; color: string }> = {
  ready: { icon: "+", color: "text-emerald-400" },
  partial: { icon: "~", color: "text-amber-400" },
  missing: { icon: "-", color: "text-red-400" },
};

const EFFORT_LABEL: Record<string, string> = {
  hours: "Hours",
  days: "Days",
  weeks: "Weeks",
  months: "Months",
};

/* ─── Sub-components ─────────────────────────────────────────────────── */

function StrategicFitCard({ plan }: { plan: FeaturePlan }) {
  const alignment = Math.round(plan.strategicFit.wedgeAlignment * 100);
  return (
    <div className={INNER_CARD}>
      <div className={cn(SECTION_HEADER, "mb-3 flex items-center gap-2")}>
        <Target className="h-3.5 w-3.5" />
        Strategic Fit
      </div>
      <div className="mb-3 flex items-center gap-3">
        <div className="text-2xl font-bold text-white">{alignment}%</div>
        <div className="flex-1">
          <div className="mb-1 h-2 rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-[#d97757] transition-all"
              style={{ width: `${alignment}%` }}
            />
          </div>
          <span className="text-xs text-white/50">Wedge alignment</span>
        </div>
      </div>
      <p className="text-sm text-white/70">{plan.strategicFit.whyNow}</p>
      {plan.strategicFit.initiativeLinks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {plan.strategicFit.initiativeLinks.map((link) => (
            <span
              key={link}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50"
            >
              {link}
            </span>
          ))}
        </div>
      )}
      {plan.strategicFit.contradictionRisks.length > 0 && (
        <div className="mt-2 text-xs text-amber-400/80">
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          Touches: {plan.strategicFit.contradictionRisks.join(", ")}
        </div>
      )}
    </div>
  );
}

function PhaseTimeline({ phases }: { phases: PlanPhase[] }) {
  return (
    <div className={INNER_CARD}>
      <div className={cn(SECTION_HEADER, "mb-3 flex items-center gap-2")}>
        <GitBranch className="h-3.5 w-3.5" />
        Implementation Phases ({phases.length})
      </div>
      <div className="space-y-3">
        {phases.map((phase, i) => (
          <div key={phase.id} className="flex gap-3">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-[10px] font-bold text-white/70">
                {i + 1}
              </div>
              {i < phases.length - 1 && (
                <div className="mt-1 w-px flex-1 bg-white/10" />
              )}
            </div>
            {/* Phase content */}
            <div className="flex-1 pb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-white/90">
                  {phase.title}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40">
                  {EFFORT_LABEL[phase.estimatedEffort] ?? phase.estimatedEffort}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-white/50">{phase.description}</p>
              {phase.dependencies.length > 0 && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-white/30">
                  <ArrowRight className="h-2.5 w-2.5" />
                  Depends on: {phase.dependencies.join(", ")}
                </div>
              )}
              {phase.acceptanceCriteria.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {phase.acceptanceCriteria.map((ac, j) => (
                    <span
                      key={j}
                      className="flex items-center gap-0.5 text-[10px] text-emerald-400/60"
                    >
                      <Check className="h-2.5 w-2.5" />
                      {ac}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CodebaseReadinessMatrix({ entries }: { entries: CodebaseReadiness[] }) {
  if (entries.length === 0) return null;
  return (
    <div className={INNER_CARD}>
      <div className={cn(SECTION_HEADER, "mb-3 flex items-center gap-2")}>
        <Layers className="h-3.5 w-3.5" />
        Codebase Readiness
      </div>
      <div className="space-y-2">
        {entries.map((entry, i) => {
          const ri = READINESS_ICON[entry.status] ?? READINESS_ICON.missing;
          return (
            <div key={i} className="flex items-start gap-2">
              <span className={cn("font-mono text-sm font-bold", ri.color)}>
                [{ri.icon}]
              </span>
              <div className="flex-1">
                <span className="text-sm text-white/80">{entry.capability}</span>
                <span className="ml-1 text-xs text-white/40">({entry.status})</span>
                {entry.notes && (
                  <p className="text-xs text-white/40">{entry.notes}</p>
                )}
                {entry.files.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {entry.files.map((f, j) => (
                      <code
                        key={j}
                        className="rounded bg-white/5 px-1 py-0.5 font-mono text-[10px] text-white/30"
                      >
                        {f}
                      </code>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RiskTable({ risks }: { risks: PlanRisk[] }) {
  if (risks.length === 0) return null;
  return (
    <div className={INNER_CARD}>
      <div className={cn(SECTION_HEADER, "mb-3 flex items-center gap-2")}>
        <Shield className="h-3.5 w-3.5" />
        Risks ({risks.length})
      </div>
      <div className="space-y-2">
        {risks.map((risk, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg border p-3",
              SEVERITY_COLOR[risk.severity] ?? SEVERITY_COLOR.medium,
            )}
          >
            <div className="flex items-baseline gap-2">
              <span className="rounded-sm border border-current px-1 py-0.5 text-[10px] font-bold uppercase">
                {risk.severity}
              </span>
              <span className="text-sm text-white/80">{risk.title}</span>
            </div>
            <p className="mt-1 text-xs text-white/50">
              Mitigation: {risk.mitigation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DelegationSection({ plan }: { plan: FeaturePlan }) {
  const [expanded, setExpanded] = useState(false);
  const dp = plan.delegationPacket;
  if (!dp.scope) return null;

  return (
    <div className={INNER_CARD}>
      <button
        type="button"
        className={cn(
          SECTION_HEADER,
          "flex w-full items-center gap-2 text-left",
        )}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label="Toggle delegation packet details"
      >
        <Send className="h-3.5 w-3.5" />
        Delegation Packet
        {expanded ? (
          <ChevronDown className="ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="ml-auto h-3.5 w-3.5" />
        )}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2 text-xs text-white/60">
          <div>
            <span className="font-medium text-white/70">Scope:</span>{" "}
            {dp.scope}
          </div>
          {dp.constraints.length > 0 && (
            <div>
              <span className="font-medium text-white/70">Constraints:</span>
              <ul className="ml-4 mt-1 list-disc space-y-0.5">
                {dp.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {dp.acceptanceCriteria.length > 0 && (
            <div>
              <span className="font-medium text-white/70">
                Acceptance criteria:
              </span>
              <ul className="ml-4 mt-1 list-disc space-y-0.5">
                {dp.acceptanceCriteria.map((ac, i) => (
                  <li key={i}>{ac}</li>
                ))}
              </ul>
            </div>
          )}
          {dp.contextNotToLose.length > 0 && (
            <div>
              <span className="font-medium text-white/70">
                Context to preserve:
              </span>
              <ul className="ml-4 mt-1 list-disc space-y-0.5">
                {dp.contextNotToLose.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Loading skeleton ───────────────────────────────────────────────── */

function PlanSkeleton() {
  return (
    <div className={cn(GLASS_CARD, "space-y-4 p-6")}>
      <div className="h-6 w-2/3 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-full animate-pulse rounded bg-white/5" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-white/5" />
      <div className="mt-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-6 w-6 animate-pulse rounded-full bg-white/10" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Panel ─────────────────────────────────────────────────────── */

function PlanProposalPanelInner({
  plan,
  isLoading,
  isLive,
  onDelegate,
  onCopyMarkdown,
}: PlanProposalPanelProps) {
  const handleCopy = useCallback(() => {
    if (!plan || !onCopyMarkdown) return;
    onCopyMarkdown(plan);
  }, [plan, onCopyMarkdown]);

  const handleDelegate = useCallback(() => {
    if (!plan || !onDelegate) return;
    onDelegate(plan);
  }, [plan, onDelegate]);

  if (isLoading) return <PlanSkeleton />;
  if (!plan) return null;

  const planTypeLabel =
    plan.planType === "integration_proposal"
      ? "Integration Proposal"
      : plan.planType === "extension_plan"
        ? "Extension Plan"
        : "Feature Plan";

  return (
    <div className={cn(GLASS_CARD, "space-y-4 p-6")} role="region" aria-label="Plan proposal">
      {/* Header */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#d97757]" />
          <h2 className="text-base font-semibold text-white">{plan.title}</h2>
          <span className="rounded-full border border-[#d97757]/30 bg-[#d97757]/10 px-2 py-0.5 text-[10px] font-medium text-[#d97757]">
            {planTypeLabel}
          </span>
          {isLive && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
              Live
            </span>
          )}
        </div>
        <p className="text-sm text-white/60">{plan.summary}</p>
        <div className="mt-1 text-[10px] text-white/30">
          Generated {new Date(plan.provenance.generatedAt).toLocaleString()} |{" "}
          {plan.provenance.sourceCount} source(s) |{" "}
          {plan.provenance.contextSources.join(", ")}
        </div>
      </div>

      {/* Strategic Fit */}
      <StrategicFitCard plan={plan} />

      {/* Phase Timeline */}
      <PhaseTimeline phases={plan.phases} />

      {/* Codebase Readiness */}
      <CodebaseReadinessMatrix entries={plan.codebaseReadiness} />

      {/* Risks */}
      <RiskTable risks={plan.risks} />

      {/* Delegation */}
      <DelegationSection plan={plan} />

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]"
          onClick={handleCopy}
          aria-label="Copy plan as markdown"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          Copy Markdown
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-[#d97757]/30 bg-[#d97757]/10 px-3 py-1.5 text-xs text-[#d97757] transition-colors hover:bg-[#d97757]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]"
          onClick={handleDelegate}
          aria-label="Delegate plan to agent"
        >
          <Send className="h-3.5 w-3.5" />
          Delegate to Agent
        </button>
      </div>
    </div>
  );
}

export const PlanProposalPanel = memo(PlanProposalPanelInner);
