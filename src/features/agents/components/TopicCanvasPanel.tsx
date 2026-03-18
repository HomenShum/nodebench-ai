import React, { useMemo } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  Layers3,
  Link2,
  Loader2,
  Sparkles,
  Wrench,
  XCircle,
} from "lucide-react";

import { api } from "../../../../convex/_generated/api";
import type { TaskSession, TaskSessionStatus } from "./TaskManager/types";
import { cn } from "@/lib/utils";

export interface TopicCanvasEntry {
  id: string;
  title: string;
  summary: string;
  status: TaskSessionStatus;
  statusLabel: string;
  statusClassName: string;
  memoryLabel: string;
  resourceLabels: string[];
  resourceSummary: string;
  nextAction: string;
  traceHref: string;
  typeLabel: string;
}

function getStatusMeta(status: TaskSessionStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "completed":
      return {
        label: "Verified-ready",
        className:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      };
    case "running":
      return {
        label: "In progress",
        className:
          "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      };
    case "failed":
      return {
        label: "Needs intervention",
        className:
          "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      };
    case "cancelled":
      return {
        label: "Stopped",
        className:
          "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
      };
    default:
      return {
        label: "Queued",
        className:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      };
  }
}

function buildMemoryLabel(session: TaskSession): string {
  const criterion = session.successCriteria?.[0]?.trim();
  if (criterion) return criterion;
  if (session.goalId) return `Goal locked: ${session.goalId}`;
  if (session.visionSnapshot) return session.visionSnapshot;
  return "Topic continuity comes from the live trace, attached tools, and source set.";
}

function buildResourceLabels(session: TaskSession): string[] {
  const labels: string[] = [];

  for (const source of session.sourceRefs ?? []) {
    if (source.label?.trim()) labels.push(source.label.trim());
  }

  for (const tool of session.toolsUsed ?? []) {
    if (tool?.trim()) labels.push(tool.trim());
  }

  if ((session.agentsInvolved?.length ?? 0) > 0) {
    labels.push(`${session.agentsInvolved!.length} agent${session.agentsInvolved!.length === 1 ? "" : "s"}`);
  }

  return [...new Set(labels)].slice(0, 4);
}

function buildSummary(session: TaskSession): string {
  if (session.description?.trim()) return session.description.trim();
  if (session.status === "completed") {
    return "Topic finished a full run and is ready for verdict review, drafting, or trace-backed publication.";
  }
  if (session.status === "failed") {
    return "Topic hit a failure boundary and needs evidence review before retry, escalation, or scope reduction.";
  }
  if (session.status === "running") {
    return "Topic is actively gathering evidence, traversing tools, or updating the trace in real time.";
  }
  return "Topic is staged with reusable context so the next action can resume from the existing work surface.";
}

function buildNextAction(session: TaskSession): string {
  if (session.status === "completed") {
    return "Open the trace, confirm the proof pack, and turn the verified outcome into a draft or final operator decision.";
  }
  if (session.status === "failed") {
    return "Inspect the failing trace span, narrow the topic boundary, and relaunch with a more explicit evidence contract.";
  }
  if (session.status === "running") {
    return "Monitor the live trace and attached sources, then decide whether the topic should keep running, branch, or escalate.";
  }
  if (session.status === "cancelled") {
    return "Review why the topic stopped and either archive it or restart from the last durable source and tool context.";
  }
  return "Attach the missing resources, confirm the memory contract, and let the next agent step continue from this topic.";
}

function formatTypeLabel(type: TaskSession["type"]): string {
  switch (type) {
    case "agent":
      return "Agent topic";
    case "swarm":
      return "Swarm topic";
    case "cron":
      return "Cron topic";
    case "scheduled":
      return "Scheduled topic";
    default:
      return "Manual topic";
  }
}

export function buildTopicCanvasEntries(sessions: TaskSession[]): TopicCanvasEntry[] {
  return [...sessions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 6)
    .map((session) => {
      const statusMeta = getStatusMeta(session.status);
      const resourceLabels = buildResourceLabels(session);

      return {
        id: String(session._id),
        title: session.title,
        summary: buildSummary(session),
        status: session.status,
        statusLabel: statusMeta.label,
        statusClassName: statusMeta.className,
        memoryLabel: buildMemoryLabel(session),
        resourceLabels,
        resourceSummary:
          resourceLabels.length > 0
            ? `${resourceLabels.length} attached resource${resourceLabels.length === 1 ? "" : "s"}`
            : "No attached sources yet",
        nextAction: buildNextAction(session),
        traceHref: `/execution-trace?session=${encodeURIComponent(String(session._id))}`,
        typeLabel: formatTypeLabel(session.type),
      };
    });
}

function getStatusIcon(status: TaskSessionStatus) {
  switch (status) {
    case "completed":
      return CheckCircle2;
    case "running":
      return Loader2;
    case "failed":
      return XCircle;
    default:
      return Clock3;
  }
}

export function TopicCanvasPanel() {
  const { isAuthenticated } = useConvexAuth();
  const effectiveIsPublic = !isAuthenticated;

  const publicSessionsData = useQuery(
    api.domains.taskManager.queries.getPublicTaskSessions,
    effectiveIsPublic ? { limit: 6 } : "skip",
  );
  const userSessionsData = useQuery(
    api.domains.taskManager.queries.getUserTaskSessions,
    !effectiveIsPublic ? { limit: 6 } : "skip",
  );

  const sessions = useMemo(
    () =>
      ((effectiveIsPublic ? publicSessionsData?.sessions : userSessionsData?.sessions) ?? []) as TaskSession[],
    [effectiveIsPublic, publicSessionsData?.sessions, userSessionsData?.sessions],
  );
  const entries = useMemo(() => buildTopicCanvasEntries(sessions), [sessions]);

  const activeCount = entries.filter((entry) => entry.status === "running" || entry.status === "pending").length;
  const citedCount = entries.filter((entry) => entry.resourceLabels.length > 0).length;
  const interventionCount = entries.filter((entry) => entry.status === "failed").length;

  return (
    <section className="nb-surface-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface-secondary/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
              <Layers3 className="h-3.5 w-3.5 text-accent" />
              Topic-first workspace
            </span>
            <span className="rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary">
              Topics, not sessions
            </span>
          </div>
          <h2 className="mt-3 type-section-title text-content">Topic canvas</h2>
          <p className="mt-2 text-sm leading-relaxed text-content-secondary">
            Keep agent work anchored as durable topics with attached memory, reusable resources, and the next operator move
            already spelled out. This shifts the hub away from one-off chat sessions and toward continuous work packages.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[420px]">
          {[
            {
              label: "Active topics",
              value: activeCount,
              tone: "text-sky-700 dark:text-sky-300",
            },
            {
              label: "Resource-backed",
              value: citedCount,
              tone: "text-emerald-700 dark:text-emerald-300",
            },
            {
              label: "Need intervention",
              value: interventionCount,
              tone: "text-rose-700 dark:text-rose-300",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-edge bg-surface-secondary/40 p-3">
              <div className={cn("text-lg font-semibold", item.tone)}>{item.value}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-content-muted">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          {
            title: "Canvas memory",
            body: "Success criteria, goals, and prior context stay attached to the topic instead of being lost in message history.",
            icon: Sparkles,
          },
          {
            title: "Hot-plug resources",
            body: "Sources, tools, and agents become the working shape of the topic, so the operator sees what the topic can actually use.",
            icon: Link2,
          },
          {
            title: "Self-directed next move",
            body: "Every topic card ends with an explicit next action so the agent or operator can continue without re-deriving state.",
            icon: Bot,
          },
        ].map((pillar) => (
          <div key={pillar.title} className="rounded-xl border border-edge bg-surface-secondary/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-content">
              <pillar.icon className="h-4 w-4 text-accent" />
              {pillar.title}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-content-muted">{pillar.body}</p>
          </div>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-edge bg-surface-secondary/30 px-4 py-6 text-sm text-content-secondary">
          No live topics yet. Launch a request from the command bar and the next agent run will land here with memory, resources,
          and its trace continuation path.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {entries.map((entry) => {
            const StatusIcon = getStatusIcon(entry.status);
            return (
              <article key={entry.id} className="rounded-2xl border border-edge bg-surface-secondary/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
                      {entry.typeLabel}
                    </div>
                    <h3 className="mt-1 truncate text-base font-semibold text-content">{entry.title}</h3>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                      entry.statusClassName,
                    )}
                  >
                    <StatusIcon
                      className={cn(
                        "h-3.5 w-3.5",
                        entry.status === "running" && "motion-safe:animate-spin",
                      )}
                    />
                    {entry.statusLabel}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-content-secondary">{entry.summary}</p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-edge bg-surface/80 p-3">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-muted">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Memory
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-content-secondary">{entry.memoryLabel}</p>
                  </div>
                  <div className="rounded-xl border border-edge bg-surface/80 p-3">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-muted">
                      <Wrench className="h-3.5 w-3.5 text-primary" />
                      Resources
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-content-secondary">{entry.resourceSummary}</p>
                    {entry.resourceLabels.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.resourceLabels.map((label) => (
                          <span
                            key={`${entry.id}-${label}`}
                            className="rounded-full border border-edge bg-surface-secondary/50 px-2 py-1 text-[11px] text-content-muted"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-xl border border-edge bg-surface/80 p-3">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-muted">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Next action
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-content-secondary">{entry.nextAction}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
                  <div className="text-xs text-content-muted">
                    Continue this topic with the trace and keep the same sources, tools, and operator framing attached.
                  </div>
                  <a
                    href={entry.traceHref}
                    className="inline-flex items-center gap-1 rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-content-secondary transition hover:bg-surface-hover hover:text-content"
                  >
                    Open trace
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default TopicCanvasPanel;
