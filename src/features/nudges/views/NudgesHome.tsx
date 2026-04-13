import { ArrowUpRight, Bell, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { useConvex, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { useConvexApi } from "@/lib/convexApi";
import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import { ProductWorkspaceHeader } from "@/features/product/components/ProductWorkspaceHeader";

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

function getSurfacePath(nudge: { actionTargetSurface?: string; actionTargetId?: string; type?: string; title?: string }) {
  if (nudge.actionTargetSurface === "chat") {
    // Use the nudge title to build a contextual query for Chat
    const reportName = nudge.title ?? "";
    const q =
      nudge.type === "report_changed" || nudge.type === "refresh_recommended"
        ? `Refresh the saved report ${reportName} and tell me what changed.`
        : nudge.type === "follow_up_due"
          ? "Use the saved context and draft the follow-up I should send."
          : "Open the connected thread and tell me what action to take next.";
    return buildCockpitPath({ surfaceId: "workspace", extra: { q, lens: "founder" } });
  }
  if (nudge.actionTargetSurface === "reports") {
    return nudge.actionTargetId
      ? `/entity/${encodeURIComponent(nudge.actionTargetId)}`
      : buildCockpitPath({ surfaceId: "packets" });
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

  const nudges = snapshot?.nudges ?? [];
  const channels = snapshot?.channels ?? [];
  const suggestedActions = snapshot?.suggestedActions ?? [];
  const hasLiveNudges = nudges.length > 0;
  const displayNudges = hasLiveNudges ? nudges : EXAMPLE_NUDGES;
  const nextNudge = displayNudges[0] ?? null;
  const connectedCount = channels.filter((channel: any) => channel.status === "Connected").length;

  return (
    <div className="nb-public-shell mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-6 py-8 xl:px-8 xl:py-10">
      <ProductWorkspaceHeader
        kicker="Nudges"
        title="What changed, and where to act next."
        description="Open loops from saved reports, follow-ups, and connected channels."
        aside={
          <>
            <span className="nb-chip nb-chip-active">{hasLiveNudges ? `${nudges.length} active` : "Closed-loop examples"}</span>
            <span className="nb-chip">{connectedCount} connected</span>
            <span className="nb-chip">{suggestedActions.length} suggested actions</span>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="px-5 py-6 xl:px-6 xl:py-7">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
              <Bell className="h-4 w-4" />
              Nudges feed
            </h2>
            <div className="text-sm text-content-muted">
              {hasLiveNudges ? "Open loops waiting on you" : "What one real loop should look like"}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {displayNudges.map((nudge: any, index: number) => (
              <div key={String(nudge._id)} className="nb-panel-inset p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-content">{nudge.title}</div>
                      {!hasLiveNudges ? (
                        <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white/82 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-content-muted dark:border-white/10 dark:bg-black/20">
                          Example
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-content-muted">{nudge.summary}</p>
                  </div>
                  <div className={`nb-status-badge px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${index === 0 ? "nb-status-badge-accent" : ""}`}>
                    {String(nudge.type ?? "nudge").replaceAll("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="text-sm leading-6 text-content-muted">
                    {nudge.actionTargetSurface === "chat"
                      ? "Best next move: reopen the live session and continue from the saved context."
                      : "Best next move: reopen the saved report, then route the follow-up through Chat if needed."}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(getSurfacePath(nudge))}
                      className="nb-primary-button rounded-full px-3 py-1.5 text-xs"
                    >
                      {nudge.actionLabel}
                    </button>
                    {hasLiveNudges ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (!api?.domains.product.nudges.snoozeNudge) return;
                            void convex.mutation(api.domains.product.nudges.snoozeNudge, {
                              anonymousSessionId,
                              nudgeId: nudge._id,
                            });
                          }}
                          className="nb-secondary-button px-3 py-1.5 text-xs"
                        >
                          Snooze
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!api?.domains.product.nudges.completeNudge) return;
                            void convex.mutation(api.domains.product.nudges.completeNudge, {
                              anonymousSessionId,
                              nudgeId: nudge._id,
                            });
                          }}
                          className="nb-secondary-button px-3 py-1.5 text-xs"
                        >
                          Done
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <article className="px-5 py-6">
            <div className="nb-section-kicker">Next action</div>
            {nextNudge ? (
              <>
                <h2 className="mt-3 text-lg font-semibold text-content">{nextNudge.title}</h2>
                <p className="mt-2 text-sm leading-6 text-content-muted">{nextNudge.summary}</p>
                <button
                  type="button"
                  onClick={() => navigate(getSurfacePath(nextNudge))}
                  className="nb-primary-button mt-4 w-full px-4 py-3 text-sm"
                >
                  {nextNudge.actionLabel}
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </article>

          <article className="px-5 py-6">
            <h2 className="nb-section-kicker">Connected channels</h2>
            <div className="mt-4 space-y-3">
              {channels.length > 0 ? channels.map((channel: any) => (
                <div key={channel.label} className="nb-panel-inset flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-content">{channel.label}</span>
                  <span className={`inline-flex items-center gap-2 text-xs ${channel.status === "Connected" ? "text-emerald-700 dark:text-emerald-300" : "text-content-muted"}`}>
                    <span className={`nb-status-dot ${channel.status === "Connected" ? "bg-emerald-400" : "bg-white/25"}`} />
                    {channel.status}
                  </span>
                </div>
              )) : (
                <div className="nb-panel-inset px-4 py-3 text-sm leading-6 text-content-muted">
                  No channels connected yet. Connect Gmail, Slack, or other tools from the Me tab.
                </div>
              )}
            </div>
          </article>

          <article className="px-5 py-6">
            <h2 className="nb-section-kicker">Suggested actions</h2>
            <div className="mt-4 space-y-2">
              {suggestedActions.length === 0 && (
                <div className="nb-panel-inset px-4 py-3 text-sm leading-6 text-content-muted">
                  Suggested actions appear here when saved reports or nudges have a clear next step.
                </div>
              )}
              {suggestedActions.map((label: string) => {
                const Icon =
                  label === "Reply draft ready"
                    ? Mail
                    : label === "Refresh report"
                      ? RefreshCw
                      : CheckCircle2;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => navigate(label === "Refresh report" ? buildCockpitPath({ surfaceId: "packets" }) : buildCockpitPath({ surfaceId: "workspace" }))}
                    className="nb-panel-inset nb-hover-lift flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-content"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-content-muted" />
                    {label}
                  </button>
                );
              })}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

export default NudgesHome;
