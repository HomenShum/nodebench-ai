/**
 * ControlPlaneLanding — Hero surface for the NodeBench Control Plane.
 *
 * The platform claim is "Control Plane".
 * The product object people instantly understand is "Receipts".
 *
 * Includes:
 * - Role-based start strip ("which path is mine?")
 * - First-run checklist (dismissible, persisted in localStorage)
 * - Core + secondary surface navigation
 */

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Circle,
  FileText,
  Fingerprint,
  KeyRound,
  Newspaper,
  ScrollText,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  type BuyerChecklistId,
  type BuyerChecklistState,
  type BuyerPreferredPath,
  loadBuyerChecklistState,
  loadBuyerPreferredPath,
  orderByBuyerPreference,
  saveBuyerChecklistState,
  saveBuyerPreferredPath,
} from "../lib/onboardingState";

interface ControlPlaneLandingProps {
  onNavigate: (view: string, path?: string) => void;
}

const ROLE_PATHS = [
  {
    id: "reviewer",
    icon: ScrollText,
    label: "Review agent actions",
    description: "See what agents did and whether it was allowed",
    target: "receipts",
    path: "/receipts",
    preferredPath: "receipts" as BuyerPreferredPath,
    accent: "border-indigo-500/30 hover:border-indigo-400/50 hover:bg-indigo-500/5",
    iconColor: "text-indigo-400",
    recommended: true,
  },
  {
    id: "approver",
    icon: ShieldCheck,
    label: "Review passport & approvals",
    description: "See scoped tools, denied actions, and approval-gated steps",
    target: "delegation",
    path: "/control-plane/passport",
    preferredPath: "delegation" as BuyerPreferredPath,
    accent: "border-emerald-500/30 hover:border-emerald-400/50 hover:bg-emerald-500/5",
    iconColor: "text-emerald-400",
  },
  {
    id: "investigator",
    icon: Search,
    label: "Investigate a run",
    description: "Trace from action to evidence to approval",
    target: "investigation",
    path: "/investigation",
    preferredPath: "investigation" as BuyerPreferredPath,
    accent: "border-amber-500/30 hover:border-amber-400/50 hover:bg-amber-500/5",
    iconColor: "text-amber-400",
  },
  {
    id: "researcher",
    icon: Newspaper,
    label: "Read today's brief",
    description: "Signals, briefings, and market context",
    target: "research",
    path: "/research/briefing",
    preferredPath: "research-briefing" as BuyerPreferredPath,
    accent: "border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-500/5",
    iconColor: "text-violet-400",
  },
] as const;

interface ChecklistItem {
  id: BuyerChecklistId;
  label: string;
  target: string;
  path: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: "receipt", label: "Open an action receipt", target: "receipts", path: "/control-plane/receipts" },
  { id: "delegation", label: "Open the passport", target: "delegation", path: "/control-plane/passport" },
  { id: "investigation", label: "Inspect an investigation", target: "investigation", path: "/investigation" },
  { id: "brief", label: "Read today's brief", target: "research", path: "/research/briefing" },
];

const CORE_SURFACES = [
  {
    id: "receipts",
    icon: ScrollText,
    title: "Action Receipts",
    subtitle: "Tamper-evident records of what an agent saw, did, and was allowed to do.",
    path: "/control-plane/receipts",
    accent: "from-indigo-500/20 to-indigo-500/5",
    iconColor: "text-indigo-300",
    borderColor: "border-indigo-500/25 hover:border-indigo-400/50",
  },
  {
    id: "delegation",
    icon: KeyRound,
    title: "Passport",
    subtitle: "Scope tools, approvals, and authority before an agent acts.",
    path: "/control-plane/passport",
    accent: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-300",
    borderColor: "border-emerald-500/25 hover:border-emerald-400/50",
  },
  {
    id: "investigation",
    icon: Search,
    title: "Investigation",
    subtitle: "See what the agent did, why it did it, and what evidence supports the result.",
    path: "/investigation",
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
    path: "/research/briefing",
  },
  {
    id: "benchmarks",
    icon: Sparkles,
    title: "Benchmarks",
    subtitle: "Proof, replay, and eval receipts for agent runs.",
    path: "/benchmarks",
  },
  {
    id: "documents",
    icon: FileText,
    title: "Workspace",
    subtitle: "Documents, spreadsheets, and work in progress.",
    path: "/workspace",
  },
  {
    id: "oracle",
    icon: Bot,
    title: "The Oracle",
    subtitle: "Builder-facing control tower for long-running loops.",
    path: "/oracle",
  },
] as const;

const POWER_USER_PATHS = [
  {
    id: "developer",
    icon: Sparkles,
    eyebrow: "For developers",
    label: "Debug evals and replay proof",
    description: "Open benchmark receipts, compare runs, and see where latency or judge quality breaks down.",
    target: "benchmarks",
    path: "/benchmarks",
    accent: "border-cyan-500/25 bg-cyan-500/[0.04] hover:border-cyan-400/45 hover:bg-cyan-500/[0.07]",
    iconColor: "text-cyan-300",
  },
  {
    id: "agent-operator",
    icon: Bot,
    eyebrow: "For agent operators",
    label: "Launch work and unblock runs",
    description: "Open the simplified agent workspace to start requests, watch running tasks, and clear approvals.",
    target: "agents",
    path: "/agents",
    accent: "border-fuchsia-500/25 bg-fuchsia-500/[0.04] hover:border-fuchsia-400/45 hover:bg-fuchsia-500/[0.07]",
    iconColor: "text-fuchsia-300",
  },
] as const;

export const ControlPlaneLanding = memo(function ControlPlaneLanding({
  onNavigate,
}: ControlPlaneLandingProps) {
  const [checklistState, setChecklistState] = useState<BuyerChecklistState>({});
  const [dismissed, setDismissed] = useState(false);
  const [preferredPath, setPreferredPath] = useState<BuyerPreferredPath | null>(null);

  useEffect(() => {
    const storedChecklist = loadBuyerChecklistState();
    if (storedChecklist === "dismissed") {
      setDismissed(true);
    } else {
      setChecklistState(storedChecklist);
    }
    setPreferredPath(loadBuyerPreferredPath());
  }, []);

  const orderedRolePaths = useMemo(
    () => orderByBuyerPreference(ROLE_PATHS, preferredPath),
    [preferredPath],
  );

  const handleNavigateWithPreference = useCallback(
    (target: string, path?: string, nextPreferredPath?: BuyerPreferredPath) => {
      if (nextPreferredPath) {
        saveBuyerPreferredPath(nextPreferredPath);
        setPreferredPath(nextPreferredPath);
      }
      onNavigate(target, path);
    },
    [onNavigate],
  );

  const handleDismissChecklist = useCallback(() => {
    setDismissed(true);
    saveBuyerChecklistState("dismissed");
  }, []);

  const handleRestoreChecklist = useCallback(() => {
    setDismissed(false);
    saveBuyerChecklistState(checklistState);
  }, [checklistState]);

  const completedCount = CHECKLIST_ITEMS.filter((item) => checklistState[item.id]).length;
  const showChecklist = !dismissed && completedCount < CHECKLIST_ITEMS.length;

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col items-center justify-center px-6 py-12">
      <div className="w-full rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_38%),rgba(5,5,5,0.92)] px-6 py-8 sm:px-8 sm:py-10">
        <div className="mb-8 space-y-4 text-center">
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
            Every permission gets a scope. Every action gets a receipt. Every decision gets evidence.
          </p>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-500">
            Start with action receipts, then move into passport &amp; delegation and investigation when the run
            matters enough to review, approve, or block.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleNavigateWithPreference("receipts", "/control-plane/receipts", "receipts")}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-300/50 hover:bg-indigo-500/15"
            >
              Open Receipts
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleNavigateWithPreference("delegation", "/control-plane/passport", "delegation")}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Open Passport
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mb-8">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Choose your path
          </p>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
            role="group"
            aria-label="Choose your starting path"
          >
            {orderedRolePaths.map((path) => {
              const Icon = path.icon;
              return (
                <button
                  key={path.id}
                  type="button"
                  onClick={() => handleNavigateWithPreference(path.target, path.path, path.preferredPath)}
                  className={`group flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 ${path.accent}`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${path.iconColor}`} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                      <span>{path.label}</span>
                      {path.recommended ? (
                        <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-indigo-200">
                          Start here
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                      {path.description}
                    </span>
                  </span>
                  <ArrowRight
                    className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-300"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {showChecklist ? (
          <div className="mb-8 rounded-xl border border-zinc-700/40 bg-zinc-900/60 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-300">Getting started</span>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  {completedCount}/{CHECKLIST_ITEMS.length}
                </span>
              </div>
              <button
                type="button"
                onClick={handleDismissChecklist}
                className="rounded p-1 text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-400"
                aria-label="Dismiss checklist"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {CHECKLIST_ITEMS.map((item) => {
                const done = !!checklistState[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigateWithPreference(item.target, item.path)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${
                      done ? "text-zinc-500 line-through" : "text-zinc-300 hover:bg-zinc-800/60"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden="true" />
                    )}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-8 text-center">
            <button
              type="button"
              onClick={handleRestoreChecklist}
              className="text-xs text-zinc-500 transition hover:text-zinc-300"
            >
              Getting started
            </button>
          </div>
        )}

        <nav
          className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3"
          aria-label="Core product surfaces"
        >
          {CORE_SURFACES.map((surface) => {
            const Icon = surface.icon;
            const preferred = surface.id as Exclude<BuyerPreferredPath, "research-briefing">;
            return (
              <button
                key={surface.id}
                  onClick={() => handleNavigateWithPreference(surface.id, surface.path, preferred)}
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
              "Passport",
              "Human-readable scope, denied actions, and approval gates before the agent acts.",
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
          aria-label="Developer and agent operator starting points"
        >
          {POWER_USER_PATHS.map((path) => {
            const Icon = path.icon;
            return (
              <button
                key={path.id}
                type="button"
                onClick={() => handleNavigateWithPreference(path.target, path.path)}
                aria-label={`Navigate to ${path.label}`}
                className={`rounded-2xl border px-5 py-4 text-left transition ${path.accent}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      {path.eyebrow}
                    </div>
                    <div className="text-sm font-medium text-zinc-100">{path.label}</div>
                  </div>
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${path.iconColor}`} aria-hidden="true" />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">{path.description}</p>
              </button>
            );
          })}
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
                onClick={() =>
                  handleNavigateWithPreference(
                    surface.id,
                    surface.path,
                    surface.id === "research" ? "research-briefing" : undefined,
                  )
                }
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

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-400">
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
          <span>Cold start path: receipts for buyers, agents for operators, benchmarks for developers.</span>
        </div>
      </div>
    </div>
  );
});

export default ControlPlaneLanding;
