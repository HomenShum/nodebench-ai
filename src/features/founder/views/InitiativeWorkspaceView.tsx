import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/useToast";
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  Clock,
  Edit3,
  Flag,
  Lightbulb,
  MessageSquare,
  Newspaper,
  Plus,
  Radio,
  ShieldAlert,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import type {
  InitiativeStatus,
  RiskLevel,
  AgentType,
  AgentStatus,
} from "./founderFixtures";
import { DEMO_INITIATIVES, DEMO_AGENTS } from "./founderFixtures";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OwnerType = "founder" | "agent" | "shared";
type SignalSource =
  | "founder_note"
  | "agent_output"
  | "market"
  | "partner"
  | "internal";

interface Signal {
  id: string;
  title: string;
  source: SignalSource;
  importance: number;
  relativeTime: string;
}

interface LinkedAgent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
}

interface SuggestedAction {
  id: string;
  title: string;
  confidence: number;
}

interface TimelineEvent {
  id: string;
  label: string;
  relativeTime: string;
  type: "created" | "status_change" | "signal" | "agent" | "decision";
}

interface InitiativeDetail {
  id: string;
  title: string;
  status: InitiativeStatus;
  risk: RiskLevel;
  priorityScore: number;
  owner: OwnerType;
  objective: string;
  summary: string;
  lastUpdated: string;
  signals: Signal[];
  linkedAgents: LinkedAgent[];
  suggestedActions: SuggestedAction[];
  timeline: TimelineEvent[];
  recentChanges: string[];
  outcomeHistory: { label: string; delta: string; date: string }[];
}

/* ------------------------------------------------------------------ */
/*  Demo fixture                                                       */
/* ------------------------------------------------------------------ */

const DEMO_INITIATIVE_DETAIL: InitiativeDetail = {
  id: "init-1",
  title: "Carbon Credit Pricing Engine",
  status: "active",
  risk: "high",
  priorityScore: 95,
  owner: "shared",
  objective:
    "Ship a real-time carbon credit pricing API that institutional traders can integrate into their existing OMS within 2 weeks. Target accuracy: within 2% of spot price across EU ETS, voluntary, and compliance markets.",
  summary:
    "3 of 6 integration tests passing. CBAM draft leak requires re-evaluation of EU ETS pricing assumptions. TradeFlow pilot blocked on SOC 2 question but API integration is 80% complete.",
  lastUpdated: "2h ago",
  signals: [
    {
      id: "sig-1",
      title: "EU CBAM draft leaked — pricing model assumptions may shift",
      source: "market",
      importance: 9,
      relativeTime: "2h ago",
    },
    {
      id: "sig-2",
      title: "TradeFlow CTO responded positively to API spec v2",
      source: "partner",
      importance: 8,
      relativeTime: "6h ago",
    },
    {
      id: "sig-3",
      title:
        "Agent flagged intermittent timeout in credit_spread_calculator test",
      source: "agent_output",
      importance: 7,
      relativeTime: "12h ago",
    },
    {
      id: "sig-4",
      title: "Competitor Sylvera raised $50M Series B — expanding into pricing",
      source: "market",
      importance: 6,
      relativeTime: "1d ago",
    },
    {
      id: "sig-5",
      title: "Internal decision: delay Series A by 4 weeks for pilot data",
      source: "founder_note",
      importance: 5,
      relativeTime: "1d ago",
    },
  ],
  linkedAgents: [
    {
      id: "agt-1",
      name: "pricing-engine",
      type: "claude_code",
      status: "healthy",
    },
    {
      id: "agt-4",
      name: "tradeflow-integrator",
      type: "openclaw",
      status: "blocked",
    },
  ],
  suggestedActions: [
    {
      id: "sa-1",
      title: "Fix 3 failing integration tests before pilot launch",
      confidence: 0.91,
    },
    {
      id: "sa-2",
      title: "Re-run CBAM impact analysis on pricing model",
      confidence: 0.78,
    },
    {
      id: "sa-3",
      title: "Draft SOC 2 timeline for TradeFlow by EOD",
      confidence: 0.65,
    },
  ],
  timeline: [
    {
      id: "tl-1",
      label: "EU CBAM signal ingested",
      relativeTime: "2h ago",
      type: "signal",
    },
    {
      id: "tl-2",
      label: "pricing-engine agent resumed after test fix",
      relativeTime: "4h ago",
      type: "agent",
    },
    {
      id: "tl-3",
      label: "Status changed: testing",
      relativeTime: "yesterday",
      type: "status_change",
    },
    {
      id: "tl-4",
      label: "Decided to delay Series A for pilot data",
      relativeTime: "yesterday",
      type: "decision",
    },
    {
      id: "tl-5",
      label: "TradeFlow API integration started",
      relativeTime: "3d ago",
      type: "agent",
    },
    {
      id: "tl-6",
      label: "Initiative created",
      relativeTime: "2w ago",
      type: "created",
    },
  ],
  recentChanges: [
    'Pricing engine MVP status moved to "testing"',
    "3 integration tests still failing — credit_spread_calculator timeout",
    "TradeFlow CTO requested SOC 2 compliance timeline",
  ],
  outcomeHistory: [
    { label: "Test pass rate", delta: "50% → 50%", date: "Today" },
    { label: "API latency p99", delta: "320ms → 280ms", date: "Yesterday" },
    {
      label: "Model accuracy (EU ETS)",
      delta: "1.8% → 1.6%",
      date: "2 days ago",
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusConfig: Record<
  InitiativeStatus,
  { color: string; dot: string; label: string }
> = {
  active: {
    color: "bg-emerald-500/10 text-emerald-400",
    dot: "bg-emerald-500",
    label: "Active",
  },
  blocked: {
    color: "bg-rose-500/10 text-rose-400",
    dot: "bg-rose-500",
    label: "Blocked",
  },
  paused: {
    color: "bg-amber-500/10 text-amber-400",
    dot: "bg-amber-500",
    label: "Paused",
  },
  completed: {
    color: "bg-cyan-500/10 text-cyan-400",
    dot: "bg-cyan-500",
    label: "Completed",
  },
};

const riskConfig: Record<RiskLevel, { color: string; label: string }> = {
  low: { color: "bg-emerald-500/10 text-emerald-400", label: "Low Risk" },
  medium: { color: "bg-amber-500/10 text-amber-400", label: "Medium Risk" },
  high: { color: "bg-rose-500/10 text-rose-400", label: "High Risk" },
};

const ownerConfig: Record<OwnerType, { color: string; label: string }> = {
  founder: { color: "bg-[#d97757]/10 text-[#d97757]", label: "Founder" },
  agent: { color: "bg-violet-500/10 text-violet-400", label: "Agent" },
  shared: { color: "bg-cyan-500/10 text-cyan-400", label: "Shared" },
};

const sourceIcons: Record<SignalSource, typeof Newspaper> = {
  founder_note: User,
  agent_output: Bot,
  market: TrendingUp,
  partner: MessageSquare,
  internal: Flag,
};

const agentTypeConfig: Record<
  AgentType,
  { color: string; label: string }
> = {
  claude_code: { color: "bg-blue-500/10 text-blue-400", label: "Claude Code" },
  openclaw: { color: "bg-violet-500/10 text-violet-400", label: "OpenClaw" },
  background: {
    color: "bg-emerald-500/10 text-emerald-400",
    label: "Background",
  },
};

const agentStatusDot: Record<AgentStatus, string> = {
  healthy: "bg-emerald-500",
  blocked: "bg-rose-500",
  waiting: "bg-amber-500",
  drifting: "bg-violet-500",
  ambiguous: "bg-gray-500",
};

function importanceColor(n: number): string {
  if (n >= 8) return "text-rose-400 bg-rose-500/10";
  if (n >= 5) return "text-amber-400 bg-amber-500/10";
  return "text-content-muted bg-white/[0.07]";
}

const timelineTypeColor: Record<string, string> = {
  created: "bg-cyan-500",
  status_change: "bg-amber-500",
  signal: "bg-[#d97757]",
  agent: "bg-violet-500",
  decision: "bg-emerald-500",
};

/* ------------------------------------------------------------------ */
/*  Section Header                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted",
        className,
      )}
    >
      {children}
    </h3>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function InitiativeWorkspaceView() {
  const [searchParams] = useSearchParams();
  const initiativeId = searchParams.get("id") ?? "init-1";
  const { ref, isVisible } = useRevealOnMount();
  const { toast } = useToast();
  const [editingObjective, setEditingObjective] = useState(false);

  // In production, fetch by initiativeId. For now, use fixture.
  const data = DEMO_INITIATIVE_DETAIL;

  const handleAcceptAction = useCallback((actionId: string, title: string) => {
    toast(`Accepted: ${title.slice(0, 40)}...`, "success");
  }, [toast]);

  const handleDeferAction = useCallback((actionId: string, title: string) => {
    toast(`Deferred: ${title.slice(0, 40)}...`, "warning");
  }, [toast]);

  const handleAddSignal = useCallback(() => {
    toast("Signal noted — will appear in next refresh", "success");
  }, [toast]);

  const handleLinkAgent = useCallback(() => {
    toast("Agent linking requires a running MCP connection", "warning");
  }, [toast]);
  const sc = statusConfig[data.status];
  const rc = riskConfig[data.risk];
  const oc = ownerConfig[data.owner];

  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full flex-col gap-4 overflow-auto px-4 pb-24 pt-4 transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0",
      )}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <button
          className="flex w-fit items-center gap-1.5 text-sm text-content-muted transition-colors hover:text-content-primary"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-content-primary">
            {data.title}
          </h1>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
              sc.color,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
            {sc.label}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              rc.color,
            )}
          >
            {rc.label}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              oc.color,
            )}
          >
            {oc.label}
          </span>
          <span className="ml-auto text-sm tabular-nums text-content-muted">
            Priority{" "}
            <span className="font-semibold text-content-primary">
              {data.priorityScore}
            </span>
            /100
          </span>
        </div>
      </div>

      {/* ── Two-column grid ──────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Left column (2/3) ──────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          {/* Objective Card */}
          <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader>Objective</SectionHeader>
              <button
                onClick={() => setEditingObjective(!editingObjective)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-content-muted transition-colors hover:bg-white/[0.07] hover:text-content-primary"
              >
                <Edit3 className="h-3 w-3" />
                {editingObjective ? "Done" : "Edit"}
              </button>
            </div>
            <p className="text-sm leading-relaxed text-content-primary">
              {data.objective}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-content-muted">
              {data.summary}
            </p>
          </div>

          {/* Signals Feed */}
          <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
            <SectionHeader className="mb-3">Signals</SectionHeader>
            <div className="space-y-2">
              {data.signals.map((s, i) => {
                const Icon = sourceIcons[s.source];
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border border-white/[0.20] bg-white/[0.12] p-3 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.07]",
                      isVisible
                        ? "translate-y-0 opacity-100"
                        : "translate-y-2 opacity-0",
                    )}
                    style={{
                      transitionDelay: isVisible ? `${100 + i * 60}ms` : "0ms",
                    }}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.07]">
                      <Icon className="h-3.5 w-3.5 text-content-muted" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-content-primary">{s.title}</p>
                      <span className="text-xs text-content-muted">
                        {s.relativeTime}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                        importanceColor(s.importance),
                      )}
                    >
                      {s.importance}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleAddSignal}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.08] py-2 text-xs text-content-muted transition-colors hover:border-white/[0.16] hover:text-content-primary"
            >
              <Plus className="h-3 w-3" />
              Add Signal
            </button>
          </div>

          {/* Recent Changes */}
          <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
            <SectionHeader className="mb-3">Recent Changes</SectionHeader>
            <ul className="space-y-2">
              {data.recentChanges.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-content-primary"
                >
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-content-muted" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Outcome History */}
          <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
            <SectionHeader className="mb-3">Outcome History</SectionHeader>
            <div className="space-y-2">
              {data.outcomeHistory.map((o, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-2"
                >
                  <span className="text-sm text-content-primary">
                    {o.label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums text-content-primary">
                      {o.delta}
                    </span>
                    <span className="text-xs text-content-muted">{o.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column (1/3) ─────────────────────────────────── */}
        <div className="space-y-4">
          {/* Health & Status */}
          <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
            <SectionHeader className="mb-3">Health & Status</SectionHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-content-muted">Status</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    sc.color,
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
                  {sc.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-content-muted">Risk</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    rc.color,
                  )}
                >
                  {rc.label}
                </span>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm text-content-muted">Priority</span>
                  <span className="text-sm font-semibold tabular-nums text-content-primary">
                    {data.priorityScore}/100
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-[#d97757] transition-all duration-500"
                    style={{ width: `${data.priorityScore}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-content-muted">Last updated</span>
                <span className="flex items-center gap-1 text-xs text-content-muted">
                  <Clock className="h-3 w-3" />
                  {data.lastUpdated}
                </span>
              </div>
            </div>
          </div>

          {/* Linked Agents */}
          <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
            <SectionHeader className="mb-3">Linked Agents</SectionHeader>
            <div className="space-y-2">
              {data.linkedAgents.map((a) => {
                const at = agentTypeConfig[a.type];
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-2 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.07]"
                  >
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        agentStatusDot[a.status],
                      )}
                    />
                    <span className="flex-1 truncate text-sm font-medium text-content-primary">
                      {a.name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        at.color,
                      )}
                    >
                      {at.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleLinkAgent}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.08] py-2 text-xs text-content-muted transition-colors hover:border-white/[0.16] hover:text-content-primary"
            >
              <Plus className="h-3 w-3" />
              Link Agent
            </button>
          </div>

          {/* Suggested Actions */}
          <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
            <SectionHeader className="mb-3">Suggested Actions</SectionHeader>
            <div className="space-y-2">
              {data.suggestedActions.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-white/[0.20] bg-white/[0.12] p-3"
                >
                  <div className="mb-2 flex items-start gap-2">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d97757]" />
                    <p className="text-sm text-content-primary">{a.title}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-content-muted">
                      {Math.round(a.confidence * 100)}% confidence
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAcceptAction(a.id, a.title)}
                        className="rounded-md bg-[#d97757]/10 px-2.5 py-1 text-xs font-medium text-[#d97757] transition-colors hover:bg-[#d97757]/20"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeferAction(a.id, a.title)}
                        className="rounded-md bg-white/[0.07] px-2.5 py-1 text-xs text-content-muted transition-colors hover:bg-white/[0.08]"
                      >
                        Defer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
            <SectionHeader className="mb-3">Timeline</SectionHeader>
            <div className="relative space-y-0">
              {data.timeline.map((ev, i) => (
                <div key={ev.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* Vertical line */}
                  {i < data.timeline.length - 1 && (
                    <div className="absolute left-[7px] top-4 h-full w-px bg-white/[0.08]" />
                  )}
                  {/* Dot */}
                  <div
                    className={cn(
                      "relative z-10 mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-[#151413]",
                      timelineTypeColor[ev.type] ?? "bg-gray-500",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-content-primary">{ev.label}</p>
                    <span className="text-xs text-content-muted">
                      {ev.relativeTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
