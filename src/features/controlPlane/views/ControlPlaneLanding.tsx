/**
 * ControlPlaneLanding — Hero surface for the NodeBench Control Plane.
 *
 * The platform claim is "Control Plane".
 * The product object people instantly understand is "Receipts".
 */

import { memo } from "react";
import {
  ArrowRight,
  Bot,
  FileText,
  Fingerprint,
  KeyRound,
  ScrollText,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";

interface ControlPlaneLandingProps {
  onNavigate: (view: string) => void;
}

const CORE_SURFACES = [
  {
    id: "receipts",
    icon: ScrollText,
    title: "NodeBench Receipts",
    subtitle: "Tamper-evident records of what an agent saw, did, and was allowed to do.",
    accent: "from-indigo-500/20 to-indigo-500/5",
    iconColor: "text-indigo-300",
    borderColor: "border-indigo-500/25 hover:border-indigo-400/50",
  },
  {
    id: "delegation",
    icon: KeyRound,
    title: "Delegation",
    subtitle: "Scope tools, approvals, and authority before an agent acts.",
    accent: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-300",
    borderColor: "border-emerald-500/25 hover:border-emerald-400/50",
  },
  {
    id: "investigation",
    icon: Search,
    title: "Investigation",
    subtitle: "See what the agent did, why it did it, and what evidence supports the result.",
    accent: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-300",
    borderColor: "border-amber-500/25 hover:border-amber-400/50",
  },
] as const;

const SECONDARY_SURFACES = [
  {
    id: "research",
    icon: Shield,
    title: "Research Hub",
    subtitle: "Signals, briefings, and evidence-backed context.",
  },
  {
    id: "benchmarks",
    icon: Sparkles,
    title: "Benchmarks",
    subtitle: "Proof, replay, and eval receipts for agent runs.",
  },
  {
    id: "documents",
    icon: FileText,
    title: "Workspace",
    subtitle: "Documents, spreadsheets, and work in progress.",
  },
  {
    id: "oracle",
    icon: Bot,
    title: "The Oracle",
    subtitle: "Builder-facing control tower for long-running loops.",
  },
] as const;

export const ControlPlaneLanding = memo(function ControlPlaneLanding({
  onNavigate,
}: ControlPlaneLandingProps) {
  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col items-center justify-center px-6 py-12">
      <div className="w-full rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_38%),rgba(5,5,5,0.92)] px-6 py-8 sm:px-8 sm:py-10">
        <div className="mb-10 space-y-4 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400">
            <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" />
            NodeBench Control Plane
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-300/80">
            The trust layer for agents
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
            DeepTrace by NodeBench
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-300">
            Every agent action gets a receipt. Inspect what the agent saw, what it did,
            what policy allowed it, and what evidence supports the result.
          </p>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-500">
            Start with receipts, then move into delegation and investigation when the run
            matters enough to review, approve, or block.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => onNavigate("receipts")}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-300/50 hover:bg-indigo-500/15"
            >
              Open Receipts
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("investigation")}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              View Investigation
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav
          className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3"
          aria-label="Core product surfaces"
        >
          {CORE_SURFACES.map((surface) => {
            const Icon = surface.icon;
            return (
              <button
                key={surface.id}
                onClick={() => onNavigate(surface.id)}
                aria-label={`Navigate to ${surface.title}: ${surface.subtitle}`}
                className={`group relative flex flex-col items-start gap-3 rounded-xl border bg-gradient-to-br p-5 text-left transition-all duration-200 ${surface.accent} ${surface.borderColor}`}
              >
                <div className="flex w-full items-center justify-between">
                  <Icon className={`h-5 w-5 ${surface.iconColor}`} aria-hidden="true" />
                  <ArrowRight
                    className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-zinc-300"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-zinc-100">{surface.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">{surface.subtitle}</p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="mt-8 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {[
            [
              "Receipts",
              "Concrete records of what the agent saw, did, and was allowed to do.",
            ],
            [
              "Delegation",
              "Human-readable scope before the agent acts, not after it fails.",
            ],
            [
              "Investigation",
              "Drill from action to evidence to approval when a run matters.",
            ],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl border border-white/10 bg-black/20 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {title}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{body}</p>
            </div>
          ))}
        </div>

        <div
          className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2"
          role="navigation"
          aria-label="Secondary navigation"
        >
          {SECONDARY_SURFACES.map((surface) => {
            const Icon = surface.icon;
            return (
              <button
                key={surface.id}
                type="button"
                onClick={() => onNavigate(surface.id)}
                aria-label={`Navigate to ${surface.title}`}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.05] hover:border-white/15"
              >
                <Icon className="mt-0.5 h-4 w-4 text-zinc-300" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-zinc-100">{surface.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                    {surface.subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default ControlPlaneLanding;
