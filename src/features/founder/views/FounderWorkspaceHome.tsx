/**
 * FounderWorkspaceHome — Canonical "Workspace" surface.
 *
 * Pattern: matches Ask's clarity. One clear purpose per section.
 * No nested tabs, no competing navigation.
 */

import { RefreshCw, ArrowRight, AlertTriangle } from "lucide-react";
import { DataSourceBanner } from "@/shared/components/DataSourceBanner";
import { cn } from "@/lib/utils";

const FOUNDER_LOOPS = [
  {
    id: "weekly_reset",
    title: "Weekly Reset",
    description: "What changed, what contradicts, what's next",
    icon: RefreshCw,
    prompt: "Run my weekly reset — review what changed, surface contradictions, and produce a fresh operating packet",
  },
  {
    id: "pre_delegation",
    title: "Hand off to an agent",
    description: "Package context, evidence, and guardrails for delegation",
    icon: ArrowRight,
    prompt: "Help me prepare a delegation packet for an agent handoff",
  },
  {
    id: "important_change",
    title: "Review changes",
    description: "What happened since last session, what needs attention",
    icon: AlertTriangle,
    prompt: "Review important changes since my last session and tell me what packets need refreshing",
  },
] as const;

export function FounderWorkspaceHome({
  onStartEpisode,
}: {
  onStartEpisode?: (prompt: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center overflow-auto px-4 pb-24 pt-12">
      {/* Headline — matches Ask pattern */}
      <h1 className="text-center text-3xl font-bold text-content sm:text-4xl">
        What do you need to <span className="text-accent-primary">get done</span>?
      </h1>
      <p className="mt-3 max-w-lg text-center text-sm text-content-muted">
        Pick a workflow. NodeBench reviews your company context, surfaces what matters, and produces a ready-to-use artifact.
      </p>
      <DataSourceBanner className="mt-3" />

      {/* Loop cards — same visual weight as Ask's quick actions */}
      <div className="mt-8 grid w-full max-w-2xl gap-3">
        {FOUNDER_LOOPS.map((loop) => {
          const Icon = loop.icon;
          return (
            <button
              key={loop.id}
              type="button"
              onClick={() => onStartEpisode?.(loop.prompt)}
              className={cn(
                "flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-left",
                "transition-all hover:border-white/[0.12] hover:bg-white/[0.04]",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10">
                <Icon className="h-5 w-5 text-accent-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-content">{loop.title}</div>
                <div className="mt-0.5 text-xs text-content-muted">{loop.description}</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-content-muted" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FounderWorkspaceHome;
