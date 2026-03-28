import { useState, useCallback } from "react";
import {
  Bot,
  Cloud,
  Copy,
  Globe,
  Laptop,
  Plus,
  Radio,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
  Terminal,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { useToast } from "@/hooks/useToast";
import type { AgentType, AgentStatus } from "./founderFixtures";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type RuntimeSurface = "local" | "remote" | "hybrid";
type AgentMode = "passive" | "guided" | "bounded_proactive";

interface AgentDetail {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  runtime: RuntimeSurface;
  mode: AgentMode;
  currentGoal: string | null;
  lastHeartbeat: string;
  lastSummary: string | null;
  escalationReason: string | null;
  suggestedAction: string | null;
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const DEMO_AGENTS: AgentDetail[] = [
  {
    id: "agt-1",
    name: "Carbon Analyst",
    type: "claude_code",
    status: "healthy",
    runtime: "local",
    mode: "bounded_proactive",
    currentGoal:
      "Analyzing EU ETS spot prices and correlating with CBAM draft parameters. Running regression on 6-month price data.",
    lastHeartbeat: "12s ago",
    lastSummary:
      "Completed overnight analysis of carbon credit pricing across 3 exchanges. Found 2.3% divergence between EU ETS and voluntary market spot prices. Report generated and linked to Pricing Engine initiative.",
    escalationReason: null,
    suggestedAction: null,
  },
  {
    id: "agt-2",
    name: "Compliance Monitor",
    type: "openclaw",
    status: "blocked",
    runtime: "remote",
    mode: "guided",
    currentGoal:
      "Waiting for API access credentials to SOC 2 compliance platform. Cannot proceed with audit scope assessment.",
    lastHeartbeat: "45m ago",
    lastSummary:
      "Mapped 23 SOC 2 Type I controls to current infrastructure. Identified 8 gaps requiring remediation. Blocked on Vanta API access to automate evidence collection.",
    escalationReason:
      "Missing API credentials for Vanta compliance platform. Cannot continue audit mapping without programmatic access to evidence collection endpoints.",
    suggestedAction:
      "Provide Vanta API key or switch to manual evidence collection workflow",
  },
  {
    id: "agt-3",
    name: "Content Scheduler",
    type: "background",
    status: "healthy",
    runtime: "hybrid",
    mode: "passive",
    currentGoal:
      "Scheduled 3 LinkedIn posts for this week. Next post queued for Wednesday 9 AM ET on carbon market trends.",
    lastHeartbeat: "3m ago",
    lastSummary:
      "Published Monday post on EU CBAM implications. Engagement: 847 impressions, 23 reactions, 4 comments. Tuesday post drafted and in review queue.",
    escalationReason: null,
    suggestedAction: null,
  },
  {
    id: "agt-4",
    name: "Research Scout",
    type: "claude_code",
    status: "drifting",
    runtime: "local",
    mode: "bounded_proactive",
    currentGoal:
      "Expanding competitive analysis to include adjacent markets — carbon accounting, ESG reporting, and climate risk platforms. Scope has grown beyond original brief.",
    lastHeartbeat: "8m ago",
    lastSummary:
      "Started with voluntary carbon market competitors but expanded to 47 companies across 4 adjacent categories. Analysis depth decreasing as scope increases. Original brief was VCM pricing competitors only.",
    escalationReason:
      "Scope drift detected: original brief covered 12 VCM pricing competitors, agent has expanded to 47 companies across 4 market categories. Signal-to-noise ratio declining.",
    suggestedAction:
      "Refocus to original VCM pricing brief or approve expanded scope with clear boundaries",
  },
];

/* ------------------------------------------------------------------ */
/*  Config maps                                                        */
/* ------------------------------------------------------------------ */

const agentTypeConfig: Record<AgentType, { color: string; label: string }> = {
  claude_code: { color: "bg-blue-500/10 text-blue-400", label: "Claude Code" },
  openclaw: { color: "bg-violet-500/10 text-violet-400", label: "OpenClaw" },
  background: {
    color: "bg-emerald-500/10 text-emerald-400",
    label: "Background",
  },
};

const statusConfig: Record<
  AgentStatus,
  { dot: string; color: string; label: string }
> = {
  healthy: {
    dot: "bg-emerald-500",
    color: "text-emerald-400",
    label: "Healthy",
  },
  blocked: { dot: "bg-rose-500", color: "text-rose-400", label: "Blocked" },
  waiting: { dot: "bg-amber-500", color: "text-amber-400", label: "Waiting" },
  drifting: {
    dot: "bg-violet-500",
    color: "text-violet-400",
    label: "Drifting",
  },
  ambiguous: {
    dot: "bg-gray-500",
    color: "text-gray-400",
    label: "Ambiguous",
  },
};

const runtimeConfig: Record<
  RuntimeSurface,
  { icon: typeof Laptop; label: string }
> = {
  local: { icon: Laptop, label: "Local" },
  remote: { icon: Cloud, label: "Remote" },
  hybrid: { icon: Globe, label: "Hybrid" },
};

const modeLabels: Record<AgentMode, string> = {
  passive: "Passive",
  guided: "Guided",
  bounded_proactive: "Proactive",
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
/*  Agent Card                                                         */
/* ------------------------------------------------------------------ */

function AgentCard({
  agent,
  index,
  isVisible,
  onEscalate,
}: {
  agent: AgentDetail;
  index: number;
  isVisible: boolean;
  onEscalate: (agent: AgentDetail) => void;
}) {
  const [inspectOpen, setInspectOpen] = useState(false);
  const { toast } = useToast();
  const tc = agentTypeConfig[agent.type];
  const sc = statusConfig[agent.status];
  const rc = runtimeConfig[agent.runtime];
  const RuntimeIcon = rc.icon;
  const needsAttention =
    agent.status === "blocked" ||
    agent.status === "drifting" ||
    agent.status === "ambiguous";

  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.20] bg-white/[0.12] p-4 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.07]",
        needsAttention && "border-white/[0.10]",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
      style={{
        transitionDelay: isVisible ? `${80 + index * 60}ms` : "0ms",
      }}
    >
      {/* Top row: name + type */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-base font-semibold text-content-primary">
          {agent.name}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            tc.color,
          )}
        >
          {tc.label}
        </span>
      </div>

      {/* Status row */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              sc.dot,
              agent.status === "healthy" && "animate-pulse",
            )}
            style={{
              boxShadow:
                agent.status === "healthy"
                  ? "0 0 6px rgba(16,185,129,0.4)"
                  : agent.status === "blocked"
                    ? "0 0 6px rgba(244,63,94,0.4)"
                    : undefined,
            }}
          />
          <span className={cn("font-medium", sc.color)}>{sc.label}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-content-muted">
          <RuntimeIcon className="h-2.5 w-2.5" />
          {rc.label}
        </span>
        <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-content-muted">
          {modeLabels[agent.mode]}
        </span>
      </div>

      {/* Current goal */}
      {agent.currentGoal && (
        <p className="mb-2 line-clamp-2 text-sm leading-relaxed text-content-primary">
          {agent.currentGoal}
        </p>
      )}

      {/* Last summary (collapsed) */}
      {agent.lastSummary && !inspectOpen && (
        <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-content-muted">
          {agent.lastSummary}
        </p>
      )}

      {/* Expanded inspect detail */}
      {inspectOpen && (
        <div className="mb-3 space-y-2 rounded-lg border border-white/[0.20] bg-white/[0.12] p-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            Full Output
          </h4>
          {agent.lastSummary && (
            <p className="text-sm leading-relaxed text-content-secondary">
              {agent.lastSummary}
            </p>
          )}
          {agent.currentGoal && (
            <>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
                Current Goal
              </h4>
              <p className="text-sm leading-relaxed text-content-secondary">
                {agent.currentGoal}
              </p>
            </>
          )}
          {agent.escalationReason && (
            <>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
                Escalation Reason
              </h4>
              <p className="text-sm leading-relaxed text-rose-400/80">
                {agent.escalationReason}
              </p>
            </>
          )}
          {agent.suggestedAction && (
            <>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
                Suggested Action
              </h4>
              <p className="flex items-start gap-1.5 text-sm text-[#d97757]">
                <Zap className="mt-0.5 h-3 w-3 shrink-0" />
                {agent.suggestedAction}
              </p>
            </>
          )}
        </div>
      )}

      {/* Footer: heartbeat + actions */}
      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="flex items-center gap-1 text-xs text-content-muted">
          <Radio className="h-3 w-3" />
          {agent.lastHeartbeat}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setInspectOpen(!inspectOpen)}
            className="inline-flex items-center gap-1 rounded-md bg-white/[0.07] px-2.5 py-1 text-xs text-content-muted transition-all hover:bg-white/[0.08] hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 active:scale-[0.98]"
          >
            {inspectOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Inspect
          </button>
          {needsAttention && (
            <button
              onClick={() => {
                onEscalate(agent);
                toast(`Escalated: ${agent.name}`, "error");
              }}
              className="rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400 transition-all hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25 active:scale-[0.98]"
            >
              Escalate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Connect Agent Modal                                                */
/* ------------------------------------------------------------------ */

function ConnectAgentModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText("npx nodebench-mcp setup");
      setCopied(true);
      toast("Copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy", "error");
    }
  }, [toast]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-white/[0.06] bg-[#1a1918] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-content-muted transition-colors hover:bg-white/[0.06] hover:text-content-primary"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d97757]/10">
            <Terminal size={20} className="text-[#d97757]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-content-primary">Connect an Agent</h2>
            <p className="text-xs text-content-muted">Link your Claude Code or OpenClaw agent to NodeBench</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d97757]/10 text-xs font-semibold text-[#d97757]">
              1
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-content-primary">
                Install NodeBench MCP in your agent
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-2">
                <code className="flex-1 text-sm text-content-muted font-mono">
                  npx nodebench-mcp setup
                </code>
                <button
                  onClick={handleCopy}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-white/[0.06] hover:text-content-primary"
                  aria-label="Copy command"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d97757]/10 text-xs font-semibold text-[#d97757]">
              2
            </span>
            <p className="text-sm font-medium text-content-primary">
              Start a Claude Code session with NodeBench MCP enabled
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d97757]/10 text-xs font-semibold text-[#d97757]">
              3
            </span>
            <p className="text-sm font-medium text-content-primary">
              NodeBench will detect the agent automatically and show it here
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-white/[0.20] bg-white/[0.12] p-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted mb-2">
            Supported Agents
          </h3>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">Claude Code</span>
            <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-400">OpenClaw</span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">Background Jobs</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-[#d97757] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#c4684a]"
        >
          Done
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AgentOversightView() {
  const { ref, isVisible } = useRevealOnMount();
  const { toast } = useToast();
  const [agents] = useState(DEMO_AGENTS);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [escalationQueue, setEscalationQueue] = useState<AgentDetail[]>(() => {
    // Initialize with agents that already need attention
    return DEMO_AGENTS.filter(
      (a) => a.status === "blocked" || a.status === "drifting" || a.status === "ambiguous",
    );
  });
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const healthyCount = agents.filter((a) => a.status === "healthy").length;
  const visibleEscalations = escalationQueue.filter((a) => !resolvedIds.has(a.id));
  const hasAgents = agents.length > 0;

  const handleEscalate = useCallback((agent: AgentDetail) => {
    setEscalationQueue((prev) => {
      if (prev.some((a) => a.id === agent.id)) return prev;
      return [...prev, agent];
    });
    // Remove from resolved if re-escalated
    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.delete(agent.id);
      return next;
    });
  }, []);

  const handleResolve = useCallback((agentId: string, agentName: string) => {
    setResolvedIds((prev) => new Set(prev).add(agentId));
    toast(`Resolved: ${agentName}`, "success");
  }, [toast]);

  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full flex-col gap-4 overflow-auto px-4 pb-24 pt-4 transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0",
      )}
    >
      {/* Connect Agent Modal */}
      {showConnectModal && <ConnectAgentModal onClose={() => setShowConnectModal(false)} />}

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">
            Agent Oversight
          </h1>
          {hasAgents && (
            <p className="mt-1 text-sm text-content-muted">
              {healthyCount} agent{healthyCount !== 1 ? "s" : ""} connected
              {visibleEscalations.length > 0 && (
                <span className="text-amber-400">
                  {" "}
                  &middot; {visibleEscalations.length} need
                  {visibleEscalations.length === 1 ? "s" : ""} attention
                </span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowConnectModal(true)}
          className="flex w-fit items-center gap-2 rounded-lg bg-[#d97757] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#c4684a]"
        >
          <Plus className="h-4 w-4" />
          Connect Agent
        </button>
      </div>

      {/* ── Agent Grid (or Empty State) ──────────────────────────── */}
      {hasAgents ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {agents.map((agent, i) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                index={i}
                isVisible={isVisible}
                onEscalate={handleEscalate}
              />
            ))}
          </div>

          {/* ── Escalation Queue ──────────────────────────────────── */}
          <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
            <SectionHeader className="mb-3">Needs Attention</SectionHeader>
            {visibleEscalations.length > 0 ? (
              <div className="space-y-2">
                {visibleEscalations.map((agent, i) => {
                  const sc = statusConfig[agent.status];
                  return (
                    <div
                      key={agent.id}
                      className={cn(
                        "flex flex-col gap-2 rounded-lg border border-white/[0.20] bg-white/[0.12] p-3 transition-all duration-300 sm:flex-row sm:items-start sm:justify-between",
                        isVisible
                          ? "translate-y-0 opacity-100"
                          : "translate-y-2 opacity-0",
                      )}
                      style={{
                        transitionDelay: isVisible
                          ? `${300 + i * 60}ms`
                          : "0ms",
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-medium text-content-primary">
                            {agent.name}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-xs font-medium",
                              sc.color,
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                sc.dot,
                              )}
                            />
                            {sc.label}
                          </span>
                        </div>
                        {agent.escalationReason && (
                          <p className="mb-1 text-sm text-content-muted">
                            {agent.escalationReason}
                          </p>
                        )}
                        {agent.suggestedAction && (
                          <p className="flex items-start gap-1.5 text-sm text-[#d97757]">
                            <Zap className="mt-0.5 h-3 w-3 shrink-0" />
                            {agent.suggestedAction}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleResolve(agent.id, agent.name)}
                        className="shrink-0 self-start rounded-md bg-[#d97757]/10 px-3 py-1.5 text-xs font-medium text-[#d97757] transition-all hover:bg-[#d97757]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]/25 active:scale-[0.98]"
                      >
                        Resolve
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-4 py-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-emerald-400">
                  All agents operating normally
                </span>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── Empty State ──────────────────────────────────────────── */
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-md rounded-xl border border-white/[0.20] bg-white/[0.12] p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.07]">
              <Bot className="h-7 w-7 text-content-muted" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-content-primary">
              No agents connected
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-content-muted">
              Connect your Claude Code or OpenClaw agents to get real-time
              oversight, heartbeat monitoring, and coordinated task execution.
            </p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="w-full rounded-lg bg-[#d97757] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#c4684a]"
            >
              Connect Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
