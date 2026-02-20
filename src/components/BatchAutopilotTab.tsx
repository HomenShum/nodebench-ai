/**
 * BatchAutopilotTab — Autopilot dashboard
 *
 * Design principles (Ive review):
 * - Brief-first: run rows show what the agent found, not plumbing metrics
 * - Single source of truth: interval selector only lives here (not in wizard)
 * - No vanity stats: no monotonically-growing counters
 * - Action paths: each brief has next steps (research, dismiss)
 */

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  Play,
  Pause,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  X as XIcon,
} from "lucide-react";

const INTERVAL_OPTIONS = [
  { value: 10800000, label: "3h" },
  { value: 21600000, label: "6h" },
  { value: 43200000, label: "12h" },
  { value: 86400000, label: "Daily" },
] as const;

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCountdown(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return "due now";
  if (diff < 3600000) return `in ${Math.ceil(diff / 60000)}m`;
  return `in ${Math.ceil(diff / 3600000)}h`;
}

const STATUS_ICON: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  completed: { icon: CheckCircle2, color: "text-green-500" },
  failed: { icon: XCircle, color: "text-red-500" },
};

export function BatchAutopilotTab() {
  const profile = useQuery(api.domains.operatorProfile.queries.getProfile);
  const schedule = useQuery(api.domains.batchAutopilot.queries.getSchedule);
  const recentRuns = useQuery(api.domains.batchAutopilot.queries.getRecentRuns, { limit: 20 });

  const upsertSchedule = useMutation(api.domains.batchAutopilot.mutations.upsertSchedule);
  const toggleEnabled = useMutation(api.domains.batchAutopilot.mutations.toggleEnabled);
  const triggerManualRun = useMutation(api.domains.batchAutopilot.mutations.triggerManualRun);

  const [triggering, setTriggering] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  // No profile → nothing to show (wizard handles onboarding above)
  if (!profile) return null;

  const handleToggle = async () => {
    try {
      if (schedule) {
        await toggleEnabled({ enabled: !schedule.isEnabled });
        toast.success(schedule.isEnabled ? "Autopilot paused" : "Autopilot enabled");
      } else {
        const intervalMs = profile.scheduleInterval === "3h" ? 10800000
          : profile.scheduleInterval === "6h" ? 21600000
          : profile.scheduleInterval === "daily" ? 86400000
          : 43200000;
        await upsertSchedule({ intervalMs });
        toast.success("Autopilot enabled");
      }
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  const handleIntervalChange = async (intervalMs: number) => {
    try {
      await upsertSchedule({ intervalMs });
      toast.success("Schedule updated");
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await triggerManualRun({});
      toast.success("Batch run triggered");
    } catch {
      toast.error("Failed to trigger run");
    } finally {
      setTriggering(false);
    }
  };

  const isActive = (status: string) =>
    ["collecting", "summarizing", "planning", "generating_brief", "delivering"].includes(status);

  const totalDiscoveries = (run: any) =>
    (run.feedItemsCount ?? 0) + (run.signalsCount ?? 0) + (run.narrativeEventsCount ?? 0);

  return (
    <div className="space-y-4">
      {/* ── Control bar ───────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                schedule?.isEnabled ? "bg-green-500 motion-safe:animate-pulse" : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {schedule?.isEnabled ? "Active" : "Paused"}
            </span>
            {schedule?.isEnabled && schedule.nextRunAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                · Next {formatCountdown(schedule.nextRunAt)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTrigger}
              disabled={triggering}
              aria-label="Run now"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {triggering ? (
                <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Run Now
            </button>
            <button
              type="button"
              onClick={handleToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                schedule?.isEnabled
                  ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/30"
                  : "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
              }`}
            >
              {schedule?.isEnabled ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Enable
                </>
              )}
            </button>
          </div>
        </div>

        {/* Interval — single source of truth */}
        <div className="flex gap-1.5">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleIntervalChange(opt.value)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                schedule?.intervalMs === opt.value
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Runs — brief-first ───────────────────────────────────────────── */}
      {(!recentRuns || recentRuns.length === 0) ? (
        <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-400">
          No runs yet. Enable autopilot or tap "Run Now."
        </div>
      ) : (
        <div className="space-y-2">
          {recentRuns.map((run) => {
            const statusInfo = STATUS_ICON[run.status] || {
              icon: Loader2,
              color: "text-blue-500",
            };
            const StatusIcon = statusInfo.icon;
            const active = isActive(run.status);
            const expanded = expandedRun === run._id;
            const discoveries = totalDiscoveries(run);
            const hasBrief = !!run.briefMarkdown;

            // Extract first meaningful line of brief for preview
            const briefPreview = run.briefMarkdown
              ?.split("\n")
              .find((l: string) => l.trim().length > 0 && !l.startsWith("#"))
              ?.replace(/^[-*]\s*/, "")
              .slice(0, 120);

            return (
              <div
                key={run._id}
                className="rounded-lg border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden"
              >
                {/* Row header */}
                <button
                  type="button"
                  onClick={() => setExpandedRun(expanded ? null : run._id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors text-left"
                >
                  <StatusIcon
                    className={`w-4 h-4 flex-shrink-0 ${statusInfo.color} ${active ? "motion-safe:animate-spin" : ""}`}
                  />
                  <div className="flex-1 min-w-0">
                    {/* Primary: brief preview or status */}
                    <div className="text-xs text-gray-900 dark:text-gray-100 truncate">
                      {briefPreview || (active
                        ? `${run.status.replace(/_/g, " ")}...`
                        : discoveries > 0
                          ? `${discoveries} discoveries`
                          : "No new discoveries")}
                    </div>
                    {/* Secondary: time */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatRelative(run.startedAt)}
                      {discoveries > 0 && ` · ${discoveries} item${discoveries !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                  {hasBrief && (
                    expanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    )
                  )}
                </button>

                {/* Expanded: full brief + actions */}
                {expanded && hasBrief && (
                  <div className="px-3 pb-3 border-t border-gray-100 dark:border-white/[0.04]">
                    <div className="mt-2 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {run.briefMarkdown}
                    </div>
                    {/* Action paths — what to do with this brief */}
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-white/[0.04]">
                      <button
                        type="button"
                        onClick={() => {
                          // TODO: navigate to research hub with brief context
                          toast.success("Opening in Research...");
                          setExpandedRun(null);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                      >
                        Research deeper <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedRun(null)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                      >
                        <XIcon className="w-3 h-3" /> Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
