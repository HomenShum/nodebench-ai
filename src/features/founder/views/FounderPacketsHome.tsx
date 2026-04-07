/**
 * FounderPacketsHome — Canonical "Packets" surface.
 *
 * Pattern: matches Documents' clarity. Show what you have, let you act on it.
 * No jargon. "Reports" not "Packets". Lead with the latest artifact.
 */

import { lazy, Suspense } from "react";
import { FileText, Download, Link2, Copy, Bot } from "lucide-react";
import { ViewSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";

const ExportView = lazy(() =>
  import("@/features/founder/views/ExportView").then((mod) => ({
    default: mod.default,
  })),
);

const EXPORT_ACTIONS = [
  { id: "memo", label: "Download memo", icon: Download, description: "One-page founder brief" },
  { id: "share", label: "Share link", icon: Link2, description: "Public URL anyone can view" },
  { id: "copy", label: "Copy to clipboard", icon: Copy, description: "Paste into Slack, email, or docs" },
  { id: "agent", label: "Send to agent", icon: Bot, description: "Hand off as delegation context" },
] as const;

export function FounderPacketsHome() {
  return (
    <div className="flex h-full flex-col items-center overflow-auto px-4 pb-24 pt-12">
      {/* Headline */}
      <h1 className="text-center text-3xl font-bold text-content sm:text-4xl">
        Your <span className="text-accent-primary">reports</span>
      </h1>
      <p className="mt-3 max-w-lg text-center text-sm text-content-muted">
        Every search and workflow produces a report. Export it, share it, or hand it off to an agent.
      </p>

      {/* Quick export actions */}
      <div className="mt-8 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        {EXPORT_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <div
              key={action.id}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10">
                <Icon className="h-4 w-4 text-accent-primary" />
              </div>
              <span className="text-xs font-medium text-content">{action.label}</span>
              <span className="text-[10px] leading-tight text-content-muted">{action.description}</span>
            </div>
          );
        })}
      </div>

      {/* Export center — existing, handles the real packet management */}
      <div className="mt-8 w-full max-w-2xl">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
          Latest Report
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <Suspense fallback={<ViewSkeleton variant="default" />}>
            <ExportView />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default FounderPacketsHome;
