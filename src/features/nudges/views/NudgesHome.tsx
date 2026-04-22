import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bell, Clock3 } from "lucide-react";
import { useConvex, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { useConvexApi } from "@/lib/convexApi";
import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import { ProductWorkspaceHeader } from "@/features/product/components/ProductWorkspaceHeader";

type NudgeRecord = {
  _id: string;
  type?: string;
  bucket?: "action_required" | "update";
  title?: string;
  summary?: string;
  actionLabel?: string;
  actionTargetSurface?: string;
  actionTargetId?: string;
  linkedEntitySlug?: string;
  linkedReportQuery?: string;
  linkedReportLens?: string;
  linkedReportTitle?: string;
  linkedReportRoutingMode?: "executive" | "advisor";
  groupedCount?: number;
  groupedTypes?: string[];
};

type InboxFilter = "action_required" | "update" | "all";

const EXAMPLE_NUDGES = [
  {
    _id: "example-report-changed",
    type: "report_changed",
    title: "Report changed",
    summary: "A saved report picked up a new source. Reopen it before you reuse the old answer.",
    actionLabel: "Open in Chat",
    actionTargetSurface: "chat",
  },
  {
    _id: "example-reply-draft",
    type: "follow_up_due",
    title: "Reply draft ready",
    summary: "A recruiter or founder follow-up is due. Use the saved report and route the reply through the same thread.",
    actionLabel: "Open report",
    actionTargetSurface: "reports",
  },
  {
    _id: "example-reminder",
    type: "connector_follow_up",
    title: "Reminder due",
    summary: "A saved watch item or thread now needs a real next step instead of sitting in memory.",
    actionLabel: "Open in Chat",
    actionTargetSurface: "chat",
  },
];

function formatNudgeType(value?: string): string {
  return String(value ?? "nudge").replaceAll("_", " ");
}

function humanizeSlug(value?: string | null): string {
  return String(value ?? "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getRoutingLabel(mode?: "executive" | "advisor") {
  if (!mode) return null;
  return mode === "advisor" ? "Deep reasoning" : "Fast path";
}

function getInboxBucket(nudge: NudgeRecord): Exclude<InboxFilter, "all"> {
  return nudge.bucket === "action_required" ? "action_required" : "update";
}

function getNudgeObjectLabel(nudge: NudgeRecord): string {
  if (nudge.linkedReportTitle?.trim()) return nudge.linkedReportTitle.trim();
  if (nudge.linkedEntitySlug?.trim()) return `${humanizeSlug(nudge.linkedEntitySlug)} report`;
  if (nudge.actionTargetSurface === "reports") return "Saved report";
  return "Saved context";
}

function getNudgeWhyNow(nudge: NudgeRecord): string {
  if (nudge.type === "report_changed") {
    return "A saved report changed after the last time you looked at it. Reopen it before you reuse the old read.";
  }
  if (nudge.type === "refresh_recommended") {
    return "This report is old enough that the underlying facts may have shifted. Refresh it before you rely on it.";
  }
  if (nudge.type === "follow_up_due") {
    return "A follow-up is due and the saved report already has the working context you need.";
  }
  if (nudge.type === "connector_follow_up") {
    return "A connected workflow or watch item needs a real next step instead of sitting in memory.";
  }
  return nudge.summary?.trim() || "This saved context needs another pass.";
}

function getNudgeNextStep(nudge: NudgeRecord): string {
  if (nudge.actionTargetSurface === "reports") {
    return "Open the saved report, inspect what changed, then decide whether to continue in chat.";
  }
  if (nudge.type === "follow_up_due") {
    return "Continue in chat and draft the follow-up from the saved report instead of starting over.";
  }
  return "Continue in chat with the saved context already attached.";
}

function getNudgeActionLabel(nudge: NudgeRecord): string {
  return nudge.actionLabel?.trim() || (nudge.actionTargetSurface === "reports" ? "Open report" : "Open in Chat");
}

function getGroupedSignalLabel(nudge: NudgeRecord): string | null {
  const count = nudge.groupedCount ?? 1;
  if (count <= 1) return null;
  return `${count} signals grouped`;
}

function formatGroupedTypes(nudge: NudgeRecord): string | null {
  const groupedTypes = Array.isArray(nudge.groupedTypes)
    ? nudge.groupedTypes
        .map((value) => formatNudgeType(value))
        .filter((value, index, values) => value && values.indexOf(value) === index)
    : [];

  if (groupedTypes.length <= 1) return null;
  return groupedTypes.join(", ");
}

function formatLastChecked(timestamp?: number | null) {
  if (!timestamp) return "just now";
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function getInboxEmptyState(filter: InboxFilter, lastCheckedAt?: number | null) {
  const lastChecked = formatLastChecked(lastCheckedAt);
  if (filter === "action_required") return `You're all caught up · last checked ${lastChecked}`;
  if (filter === "update") return `No fresh updates · last checked ${lastChecked}`;
  return `Nothing waiting on you · last checked ${lastChecked}`;
}

export function buildNudgeChatQuery(nudge: NudgeRecord): string {
  const reportTitle = nudge.linkedReportTitle ?? nudge.title ?? "the saved report";
  const subject = nudge.linkedEntitySlug
    ? nudge.linkedEntitySlug.replace(/[-_]+/g, " ")
    : reportTitle;
  const originalFocus = nudge.linkedReportQuery?.trim();

  if (nudge.type === "report_changed" || nudge.type === "refresh_recommended") {
    return originalFocus
      ? `Update ${subject} and show me what changed from the saved report. Keep the original focus on: ${originalFocus}`
      : `Update ${subject} and show me what changed from the saved report.`;
  }

  if (nudge.type === "follow_up_due") {
    return originalFocus
      ? `Use the saved report on ${subject} and draft the follow-up I should send. Keep the original focus on: ${originalFocus}`
      : `Use the saved report on ${subject} and draft the follow-up I should send.`;
  }

  if (originalFocus) return originalFocus;
  return `Open the saved context for ${subject} and tell me the best next step.`;
}

export function getSurfacePath(nudge: NudgeRecord) {
  const linkedEntitySlug = nudge.linkedEntitySlug ?? nudge.actionTargetId;
  if (nudge.actionTargetSurface === "reports") {
    return linkedEntitySlug
      ? `/entity/${encodeURIComponent(linkedEntitySlug)}`
      : buildCockpitPath({ surfaceId: "packets" });
  }
  if (nudge.actionTargetSurface === "chat") {
    return buildCockpitPath({
      surfaceId: "workspace",
      entity: nudge.linkedEntitySlug ?? undefined,
      extra: {
        q: buildNudgeChatQuery(nudge),
        lens: nudge.linkedReportLens ?? "founder",
      },
    });
  }
  return buildCockpitPath({ surfaceId: "history" });
}

export function NudgesHome() {
  useProductBootstrap();

  const api = useConvexApi();
  const convex = useConvex();
  const navigate = useNavigate();
  const anonymousSessionId = getAnonymousProductSessionId();

  const snapshot = useQuery(
    api?.domains.product.nudges.getNudgesSnapshot ?? "skip",
    api?.domains.product.nudges.getNudgesSnapshot
      ? { anonymousSessionId }
      : "skip",
  );

  const nudges = (snapshot?.nudges ?? []) as NudgeRecord[];
  const channels = snapshot?.channels ?? [];
  const lastCheckedAt = snapshot?.lastCheckedAt ?? Date.now();
  const hasLiveNudges = nudges.length > 0;
  const connectedCount = channels.filter((channel: any) => channel.status === "Connected").length;
  const openLoopLabel = hasLiveNudges ? `${nudges.length} open items` : "Inbox quiet";

  const [activeFilter, setActiveFilter] = useState<InboxFilter>("action_required");
  const [selectedNudgeId, setSelectedNudgeId] = useState<string | null>(null);

  const filterCounts = useMemo(
    () => ({
      action_required: nudges.filter((nudge) => getInboxBucket(nudge) === "action_required").length,
      update: nudges.filter((nudge) => getInboxBucket(nudge) === "update").length,
      all: nudges.length,
    }),
    [nudges],
  );

  const filteredNudges = useMemo(() => {
    if (!hasLiveNudges) return [] as NudgeRecord[];
    if (activeFilter === "all") return nudges;
    return nudges.filter((nudge) => getInboxBucket(nudge) === activeFilter);
  }, [activeFilter, hasLiveNudges, nudges]);

  useEffect(() => {
    if (!hasLiveNudges) return;
    if (activeFilter !== "action_required") return;
    if (filterCounts.action_required > 0) return;
    if (filterCounts.update > 0) {
      setActiveFilter("update");
    }
  }, [activeFilter, filterCounts.action_required, filterCounts.update, hasLiveNudges]);

  useEffect(() => {
    if (!filteredNudges.length) {
      setSelectedNudgeId(null);
      return;
    }
    if (!selectedNudgeId || !filteredNudges.some((nudge) => nudge._id === selectedNudgeId)) {
      setSelectedNudgeId(filteredNudges[0]._id);
    }
  }, [filteredNudges, selectedNudgeId]);

  const selectedNudge =
    filteredNudges.find((nudge) => nudge._id === selectedNudgeId) ??
    filteredNudges[0] ??
    null;

  return (
    <div className="nb-public-shell mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-6 pb-24 sm:gap-5 sm:px-6 sm:py-8 xl:px-8 xl:py-10">
      <ProductWorkspaceHeader
        kicker="Inbox"
        title="What changed, and what needs your attention."
        description="Inbox is the push surface. One row should equal one concrete next step."
        aside={
          <>
            <span className="nb-chip nb-chip-active">{openLoopLabel}</span>
            <span className="nb-chip">{connectedCount} connected</span>
          </>
        }
      />

      <section className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="px-4 py-5 sm:px-5 sm:py-6 xl:px-6 xl:py-7">
          <div className="flex flex-col gap-4 border-b border-black/5 pb-4 dark:border-white/8">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
              <Bell className="h-4 w-4" />
              Inbox queue
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-content-muted">
                {hasLiveNudges
                  ? "Inbox owns discrete events. Open the item, act on it, then move on."
                  : "When saved work changes or a follow-up comes due, the queue should bring you back here."}
              </div>
              {hasLiveNudges ? (
                <div className="inline-flex rounded-full border border-black/8 bg-black/[0.03] p-1 text-xs dark:border-white/10 dark:bg-white/[0.03]">
                  {([
                    ["action_required", `Action required ${filterCounts.action_required}`],
                    ["update", `Updates ${filterCounts.update}`],
                    ["all", `All ${filterCounts.all}`],
                  ] as Array<[InboxFilter, string]>).map(([filter, label]) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      className={`rounded-full px-3 py-1.5 font-medium transition ${
                        activeFilter === filter
                          ? "bg-[#d97757] text-white"
                          : "text-content-muted hover:text-content"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {hasLiveNudges ? (
            <div className="mt-4 space-y-2.5">
              {filteredNudges.length > 0 ? (
                filteredNudges.map((nudge) => {
                  const isSelected = nudge._id === selectedNudge?._id;
                  const routingLabel = getRoutingLabel(nudge.linkedReportRoutingMode);
                  const groupedSignalLabel = getGroupedSignalLabel(nudge);
                  return (
                    <div
                      key={String(nudge._id)}
                      className={`rounded-[22px] border px-4 py-4 transition ${
                        isSelected
                          ? "border-[rgba(217,119,87,0.36)] bg-[rgba(217,119,87,0.07)]"
                          : "border-black/6 bg-white/[0.02] hover:border-black/10 dark:border-white/8 dark:hover:border-white/14"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedNudgeId(nudge._id)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <div
                            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                              isSelected ? "bg-[var(--accent-primary)]" : "bg-black/15 dark:bg-white/20"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-content">{nudge.title}</div>
                              {groupedSignalLabel ? (
                                <span className="nb-chip text-[10px] uppercase tracking-[0.18em]">
                                  {groupedSignalLabel}
                                </span>
                              ) : null}
                              {routingLabel ? (
                                <span className="nb-chip text-[10px] uppercase tracking-[0.18em]">
                                  {routingLabel}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1.5 text-sm leading-6 text-content-muted">
                              {getNudgeWhyNow(nudge)}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-content-muted">
                              <span>{getNudgeObjectLabel(nudge)}</span>
                              <span className="text-content-muted/40">•</span>
                              <span>{nudge.actionTargetSurface === "chat" ? "Continue in chat" : "Open saved report"}</span>
                              <span className="text-content-muted/40">•</span>
                              <span className="capitalize">{formatNudgeType(nudge.type)}</span>
                            </div>
                          </div>
                        </button>
                        <div className="ml-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => navigate(getSurfacePath(nudge))}
                            className="nb-primary-button rounded-full px-3 py-1.5 text-xs"
                          >
                            {getNudgeActionLabel(nudge)}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  data-testid="empty-state"
                  className="rounded-[20px] border border-dashed border-black/10 px-4 py-5 text-sm leading-6 text-content-muted dark:border-white/12"
                >
                  {getInboxEmptyState(activeFilter, lastCheckedAt)}
                </div>
              )}
            </div>
          ) : (
            <div
              data-testid="empty-state"
              className="mt-4 rounded-[22px] border border-black/8 bg-black/[0.015] px-5 py-6 dark:border-white/8 dark:bg-white/[0.02] sm:px-6 sm:py-8"
            >
              <div className="inline-flex items-center gap-1.5 rounded-full border border-black/8 bg-white/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-content-muted dark:border-white/10 dark:bg-white/[0.04]">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500" aria-hidden="true" />
                Inbox quiet
              </div>
              <h3 className="mt-3 text-lg font-semibold text-content">
                {getInboxEmptyState(activeFilter, lastCheckedAt)}
              </h3>
              <p className="mt-2 max-w-[52ch] text-sm leading-6 text-content-muted">
                Inbox stays quiet until something actually needs you. When a saved report changes, a follow-up comes due, or a connector needs attention, it returns here as one concrete next step.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(buildCockpitPath({ surfaceId: "ask" }))}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#d97757] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c56545] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d97757]"
                >
                  Open Chat
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(buildCockpitPath({ surfaceId: "packets" }))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-sm font-medium text-content transition hover:border-black/20 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20"
                >
                  Open saved report
                </button>
              </div>
            </div>
          )}
        </article>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <article className="px-4 py-5 sm:px-5 sm:py-6">
            <div className="nb-section-kicker">Selected item</div>
            {selectedNudge ? (
              <>
                <h2 className="mt-3 text-lg font-semibold text-content">{selectedNudge.title}</h2>
                <p className="mt-2 text-sm leading-6 text-content-muted">{selectedNudge.summary}</p>

                <div className="mt-5 space-y-4 border-t border-black/5 pt-4 dark:border-white/8">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
                      Why now
                    </div>
                    <p className="mt-2 text-sm leading-6 text-content-muted">{getNudgeWhyNow(selectedNudge)}</p>
                  </div>

                  {getGroupedSignalLabel(selectedNudge) ? (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
                        Grouped signals
                      </div>
                      <p className="mt-2 text-sm leading-6 text-content-muted">
                        {getGroupedSignalLabel(selectedNudge)}
                        {formatGroupedTypes(selectedNudge) ? `, ${formatGroupedTypes(selectedNudge)}` : ""}
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
                      Linked object
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-content">
                      <span>{getNudgeObjectLabel(selectedNudge)}</span>
                      {getRoutingLabel(selectedNudge.linkedReportRoutingMode) ? (
                        <span className="nb-chip text-[10px] uppercase tracking-[0.18em]">
                          {getRoutingLabel(selectedNudge.linkedReportRoutingMode)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
                      Next step
                    </div>
                    <p className="mt-2 text-sm leading-6 text-content-muted">{getNudgeNextStep(selectedNudge)}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(getSurfacePath(selectedNudge))}
                    className="nb-primary-button w-full px-4 py-3 text-sm sm:w-auto"
                  >
                    {getNudgeActionLabel(selectedNudge)}
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                  {hasLiveNudges ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (!api?.domains.product.nudges.snoozeNudge) return;
                          void convex.mutation(api.domains.product.nudges.snoozeNudge, {
                            anonymousSessionId,
                            nudgeId: selectedNudge._id,
                          });
                        }}
                        className="nb-secondary-button px-3 py-2 text-xs"
                      >
                        Snooze
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!api?.domains.product.nudges.completeNudge) return;
                          void convex.mutation(api.domains.product.nudges.completeNudge, {
                            anonymousSessionId,
                            nudgeId: selectedNudge._id,
                          });
                        }}
                        className="nb-secondary-button px-3 py-2 text-xs"
                      >
                        Done
                      </button>
                    </>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-content-muted">
                Pick an inbox item to see the exact next step.
              </p>
            )}
          </article>

          <article className="px-4 py-5 sm:px-5 sm:py-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-content">Connected tools</h2>
              <span className="text-xs text-content-muted">{connectedCount} connected</span>
            </div>

            <div className="mt-4 space-y-2">
              {channels.length > 0 ? channels.map((channel: any) => (
                <div
                  key={channel.label}
                  className="flex items-center justify-between rounded-[18px] border border-black/6 px-4 py-3 dark:border-white/8"
                >
                  <div className="text-sm font-medium text-content">{channel.label}</div>
                  <span
                    className={`inline-flex items-center gap-2 text-xs ${
                      channel.status === "Connected" ? "text-emerald-700 dark:text-emerald-300" : "text-content-muted"
                    }`}
                  >
                    <span
                      className={`nb-status-dot ${channel.status === "Connected" ? "bg-emerald-400" : "bg-white/25"}`}
                    />
                    {channel.status}
                  </span>
                </div>
              )) : (
                <div className="rounded-[18px] border border-dashed border-black/10 px-4 py-4 text-sm leading-6 text-content-muted dark:border-white/12">
                  No tools connected yet. Connect Gmail, Slack, or Notion from Me when you want Inbox items to return with real external context.
                </div>
              )}
            </div>

            {selectedNudge ? (
              <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/8">
                <div className="flex items-start gap-3 text-sm text-content-muted">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="leading-6">
                    Keep this surface calm. Inbox should tell you what changed, the detail panel should explain why, and the action should move you back into the right report or chat thread.
                  </p>
                </div>
              </div>
            ) : null}
          </article>
        </aside>
      </section>
    </div>
  );
}

export default NudgesHome;
