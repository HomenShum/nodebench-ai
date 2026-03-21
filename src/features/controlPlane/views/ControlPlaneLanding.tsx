/**
 * ControlPlaneLanding — Clean ask surface using SurfacePrimitives.
 * ChatGPT-style: header, input, prompt starters, trust surface cards.
 */

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import {
  Activity,
  ArrowRight,
  ArrowUp,
  KeyRound,
  Newspaper,
  ScrollText,
  Search,
  Zap,
} from "lucide-react";
import {
  SurfaceButton,
  SurfaceCard,
  SurfaceGrid,
  SurfacePageHeader,
  SurfaceScroll,
  SurfaceSection,
} from "@/shared/ui";
import { VIEW_PATH_MAP, type MainView } from "@/lib/registry/viewRegistry";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

const SWARM_STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: "rgba(16,185,129,0.12)", text: "#34d399", label: "Completed" },
  executing: { bg: "rgba(251,191,36,0.12)", text: "#fbbf24", label: "Running" },
  spawning: { bg: "rgba(251,191,36,0.12)", text: "#fbbf24", label: "Spawning" },
  gathering: { bg: "rgba(251,191,36,0.12)", text: "#fbbf24", label: "Gathering" },
  synthesizing: { bg: "rgba(251,191,36,0.12)", text: "#fbbf24", label: "Synthesizing" },
  pending: { bg: "rgba(251,191,36,0.12)", text: "#fbbf24", label: "Pending" },
  failed: { bg: "rgba(244,63,94,0.12)", text: "#fb7185", label: "Failed" },
};

const DEFAULT_STATUS_STYLE = { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", label: "Unknown" };

interface ControlPlaneLandingProps {
  onNavigate: (view: MainView, path?: string) => void;
  onOpenFastAgent?: () => void;
  onOpenFastAgentWithPrompt?: (prompt: string) => void;
}

const RECEIPTS_PATH = VIEW_PATH_MAP.receipts ?? "/receipts";
const DELEGATION_PATH = VIEW_PATH_MAP.delegation ?? "/delegation";
const INVESTIGATION_PATH = VIEW_PATH_MAP.investigation ?? "/investigation";
const MCP_LEDGER_PATH = VIEW_PATH_MAP["mcp-ledger"] ?? "/internal/mcp-ledger";

const STARTER_PROMPTS = [
  {
    title: "Show denied actions today",
    prompt:
      "Show me the agent actions that were denied or approval-gated today, and explain why.",
    target: "receipts" as MainView,
  },
  {
    title: "Trace the FTX demo",
    prompt:
      "Open the FTX investigation and separate observed facts, hypotheses, and later-confirmation evidence.",
    target: "investigation" as MainView,
  },
  {
    title: "Review agent permissions",
    prompt:
      "Explain what this agent is allowed to do, what requires approval, and what would be blocked.",
    target: "delegation" as MainView,
  },
] as const;

const TRUST_SURFACES = [
  {
    icon: ScrollText,
    label: "Agent actions",
    description: "Review what agents did today",
    target: "receipts" as MainView,
    path: RECEIPTS_PATH,
  },
  {
    icon: KeyRound,
    label: "Permissions",
    description: "What each agent can do and what needs approval",
    target: "delegation" as MainView,
    path: DELEGATION_PATH,
  },
  {
    icon: Search,
    label: "Investigation",
    description: "Trace action to evidence to review",
    target: "investigation" as MainView,
    path: INVESTIGATION_PATH,
  },
  {
    icon: Zap,
    label: "Tool activity",
    description: "Inspect tool calls and integrations",
    target: "mcp-ledger" as MainView,
    path: MCP_LEDGER_PATH,
  },
] as const;

const DEMO_ACTIVITY = [
  {
    label: "FTX/Alameda investigation completed",
    description: "4 verified facts, 2 hypotheses ranked, 96% severity signals detected",
    badge: "Investigation",
    badgeBg: "rgba(217, 119, 87, 0.12)",
    badgeText: "#d97757",
    target: "investigation" as MainView,
    path: INVESTIGATION_PATH,
    timeLabel: "2m ago",
  },
  {
    label: "Code review completed: streaming handler",
    description: "Flagged unbounded Map in SSE handler, 3 files reviewed, 1 P0 finding",
    badge: "Allowed",
    badgeBg: "rgba(16, 185, 129, 0.12)",
    badgeText: "#34d399",
    target: "receipts" as MainView,
    path: RECEIPTS_PATH,
    timeLabel: "8m ago",
  },
  {
    label: "Acme AI Series A diligence memo",
    description: "7 sources analyzed, +68% confidence, raise-now recommendation",
    badge: "Decision",
    badgeBg: "rgba(122, 172, 140, 0.12)",
    badgeText: "#7aac8c",
    target: "deep-sim" as MainView,
    path: "/deep-sim",
    timeLabel: "15m ago",
  },
  {
    label: "Database migration approved: schema v47",
    description: "Pre-execution gate passed — 5/5 boolean checks, rollback plan verified",
    badge: "Approval",
    badgeBg: "rgba(99, 102, 241, 0.12)",
    badgeText: "#818cf8",
    target: "receipts" as MainView,
    path: RECEIPTS_PATH,
    timeLabel: "32m ago",
  },
  {
    label: "Production deploy blocked: missing canary",
    description: "Deploy to prod-us-east rejected — canary stage not completed, 0/3 health checks passed",
    badge: "Denied",
    badgeBg: "rgba(196, 112, 96, 0.12)",
    badgeText: "#c47060",
    target: "receipts" as MainView,
    path: RECEIPTS_PATH,
    timeLabel: "1h ago",
  },
  {
    label: "Agent denied: FTT token sell order",
    description: "Blocked by passport scope — requires human approval for financial transactions",
    badge: "Denied",
    badgeBg: "rgba(196, 112, 96, 0.12)",
    badgeText: "#c47060",
    target: "receipts" as MainView,
    path: RECEIPTS_PATH,
    timeLabel: "2h ago",
  },
] as const;


export const ControlPlaneLanding = memo(function ControlPlaneLanding({
  onNavigate,
  onOpenFastAgent,
  onOpenFastAgentWithPrompt,
}: ControlPlaneLandingProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { ref: revealRef, isVisible, instant } = useRevealOnMount();

  const recentSwarms = useQuery(api.domains.agents.agentHubQueries.getActiveSwarms, { limit: 5 });
  const dailyBrief = useQuery(api.domains.research.dashboardQueries.getLatestDashboardSnapshot);

  const stagger = useCallback(
    (delay: string): React.CSSProperties => ({
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "none" : "translateY(8px)",
      transition: instant ? "none" : "opacity 0.2s ease-out, transform 0.2s ease-out",
      transitionDelay: instant ? "0s" : delay,
    }),
    [isVisible, instant],
  );

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  // Smart routing: match query keywords to surfaces, fall back to agent panel
  const routeQuery = useCallback((query: string) => {
    const q = query.toLowerCase();
    if (q.includes("denied") || q.includes("approval") || q.includes("receipt") || q.includes("action")) {
      onNavigate("receipts");
      return true;
    }
    if (q.includes("ftx") || q.includes("investigation") || q.includes("investigate") || q.includes("trace the")) {
      onNavigate("investigation");
      return true;
    }
    if (q.includes("diligence") || q.includes("series a") || q.includes("decision") || q.includes("memo") || q.includes("should")) {
      onNavigate("deep-sim" as MainView);
      return true;
    }
    if (q.includes("research") || q.includes("signal") || q.includes("brief") || q.includes("market")) {
      onNavigate("research");
      return true;
    }
    if (q.includes("permission") || q.includes("passport") || q.includes("scope") || q.includes("allowed")) {
      onNavigate("delegation");
      return true;
    }
    if (q.includes("health") || q.includes("benchmark") || q.includes("drift") || q.includes("oracle")) {
      onNavigate("oracle");
      return true;
    }
    return false;
  }, [onNavigate]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      onOpenFastAgent?.();
      return;
    }
    // Try smart routing first — navigates to the right surface
    if (routeQuery(trimmed)) {
      setInput("");
      return;
    }
    // Fall back to agent panel for unknown queries
    if (onOpenFastAgentWithPrompt) {
      onOpenFastAgentWithPrompt(trimmed);
    } else {
      onOpenFastAgent?.();
    }
    setInput("");
  }, [input, onOpenFastAgent, onOpenFastAgentWithPrompt, routeQuery]);

  const handleStarterPrompt = useCallback(
    (prompt: string, _target?: MainView) => {
      // Always open the agent panel with the prompt for a live-feeling demo
      if (onOpenFastAgentWithPrompt) {
        onOpenFastAgentWithPrompt(prompt);
      } else {
        setInput(prompt);
        onOpenFastAgent?.();
      }
    },
    [onOpenFastAgent, onOpenFastAgentWithPrompt],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div ref={revealRef} className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-6 py-12">
        {/* Hero — centered like ChatGPT */}
        <h1 style={stagger("0s")} className="text-center text-4xl font-bold tracking-tight text-content">
          NodeBench
        </h1>
        <p style={stagger("0.1s")} className="mt-3 max-w-xl text-center text-base leading-relaxed text-content-secondary">
          The trust layer for agents. Every action gets a receipt.
          Every decision gets evidence.
        </p>

        {/* CTA row */}
        <div style={stagger("0.2s")} className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              const demoPrompt = "Show me the agent actions that were denied or approval-gated today, and explain why.";
              if (onOpenFastAgentWithPrompt) {
                onOpenFastAgentWithPrompt(demoPrompt);
              } else {
                onOpenFastAgent?.();
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#d97757] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#d97757]/20 transition-all hover:bg-[#c96a4d] hover:shadow-indigo-500/25"
          >
            Run Live Demo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <a href="/v1/specs" target="_blank" rel="noreferrer" className="rounded-xl border border-edge px-5 py-2.5 text-sm font-medium text-content-secondary transition-colors hover:bg-white/[0.04] hover:text-content">
            Read API
          </a>
          <a href="/api/mcp" target="_blank" rel="noreferrer" className="rounded-xl border border-edge px-5 py-2.5 text-sm font-medium text-content-secondary transition-colors hover:bg-white/[0.04] hover:text-content">
            Integrate via MCP
          </a>
        </div>

        {/* Today's Signal — daily intelligence card */}
        <button
          type="button"
          style={stagger("0.25s")}
          onClick={() => onNavigate("research")}
          className="mt-8 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
          data-agent-action="open-daily-brief"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Newspaper className="h-3.5 w-3.5 text-[#d97757]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
                Today&apos;s Signal
              </span>
              <span className="text-[11px] text-content-muted">
                {dailyBrief?.dateString ?? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-content-muted" />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-content-secondary line-clamp-2">
            {dailyBrief?.dashboardMetrics?.keyStats?.[0]?.label
              ? `${dailyBrief.dashboardMetrics.keyStats[0].label}: ${dailyBrief.dashboardMetrics.keyStats[0].value}`
              : "Your daily research brief will appear here once connected. Signals, sources, and entity tracking across your focus areas."}
          </p>
          <div className="mt-2.5 flex items-center gap-3 text-[11px] text-content-muted">
            <span>{dailyBrief?.dashboardMetrics?.keyStats?.length ?? 0} signals</span>
            <span className="text-content-muted">&middot;</span>
            <span>{dailyBrief?.sources?.length ?? 0} sources</span>
            <span className="text-content-muted">&middot;</span>
            <span>{dailyBrief?.entities?.length ?? 0} entities tracked</span>
          </div>
        </button>

        {/* Input bar — centered, prominent, ChatGPT-style */}
        <div style={stagger("0.3s")} className="mt-10 w-full">
          <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_2px_12px_rgba(0,0,0,0.3)] transition-all duration-300 focus-within:border-[#d97757]/30 focus-within:shadow-[0_0_0_1px_rgba(217,119,87,0.15),0_0_24px_rgba(217,119,87,0.08)]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Try: "Show me the agent actions that were denied or approval-gated today, and explain why."'
              rows={1}
              className="w-full resize-none bg-transparent px-5 py-4 pr-14 text-[15px] text-content placeholder:text-content-muted focus:outline-none"
              aria-label="Message NodeBench"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim() && !onOpenFastAgent}
              className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#d97757] text-white shadow-sm transition-all hover:bg-[#c96a4d] disabled:opacity-40"
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Prompt starters */}
        <div style={stagger("0.4s")} className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {STARTER_PROMPTS.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => handleStarterPrompt(item.prompt, item.target)}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 text-left transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
              data-agent-action="starter-prompt"
            >
              <div className="text-sm font-medium text-content">{item.title}</div>
              <div className="mt-1.5 text-xs leading-relaxed text-content-muted">{item.prompt}</div>
            </button>
          ))}
        </div>

        {/* Trust surfaces — 4 clean cards */}
        <div style={stagger("0.5s")} className="mt-10 w-full">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            Trust surfaces
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TRUST_SURFACES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onNavigate(item.target, item.path)}
                  className="group flex flex-col items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
                  data-agent-action="navigate-trust"
                  data-agent-id={`trust:${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05]">
                    <Icon className="h-4 w-4 text-content-muted transition-colors group-hover:text-[#d97757]" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-content">{item.label}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-content-muted">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent activity — live from Convex */}
        <div style={stagger("0.6s")} className="mt-10 w-full">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-content-muted" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
              Recent activity
            </span>
          </div>
          {recentSwarms === undefined ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-xs text-content-muted">
              Loading activity...
            </div>
          ) : recentSwarms.length === 0 ? (
            <div className="space-y-2">
              {DEMO_ACTIVITY.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onNavigate(item.target, item.path)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
                  data-agent-action="view-activity"
                  data-agent-id={`activity:${index}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-content">{item.label}</span>
                      <span
                        className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: item.badgeBg, color: item.badgeText }}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-content-muted">{item.description}</div>
                  </div>
                  <span className="shrink-0 text-[11px] text-content-muted">{item.timeLabel}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {recentSwarms.slice(0, 5).map((swarm) => {
                const style = SWARM_STATUS_STYLE[swarm.status] ?? DEFAULT_STATUS_STYLE;
                return (
                  <div
                    key={swarm.swarmId}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-content truncate">
                          {swarm.query ?? swarm.swarmId}
                        </span>
                        <span
                          className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ backgroundColor: style.bg, color: style.text }}
                        >
                          {style.label}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-content-muted">
                        <span>{swarm.taskCount} task{swarm.taskCount !== 1 ? "s" : ""}</span>
                        <span className="text-content-muted">|</span>
                        <span>{swarm.completedCount} done</span>
                        {swarm.runningCount > 0 && (
                          <>
                            <span className="text-content-muted">|</span>
                            <span style={{ color: "#fbbf24" }}>{swarm.runningCount} running</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-content-muted">
                      {timeAgo(swarm._creationTime)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Learning — self-improvement indicators */}
        <div style={stagger("0.7s")} className="mt-10 w-full" data-agent-section="learning">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            Learning
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              { label: "Tools discovered", value: "304", id: "tools" },
              { label: "Patterns tracked", value: "47", id: "patterns" },
              { label: "Sessions remembered", value: "12", id: "sessions" },
              { label: "Continuously adapting", value: null, id: "status" },
            ] as const).map((stat) => (
              <div
                key={stat.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                data-agent-learning={stat.id}
              >
                {stat.value ? (
                  <>
                    <div className="text-2xl font-bold tabular-nums text-content">{stat.value}</div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
                      {stat.label}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
                      {stat.label}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Connect Your Data — integration CTA */}
        <div style={stagger("0.8s")} className="mt-10 w-full">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            Integrate
          </div>
          <p className="mb-4 text-sm text-content-secondary">
            Connect your agents, tools, and data sources.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-sm font-medium text-content">MCP Server</div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-content-muted">
                304 tools via Model Context Protocol.
              </p>
              <code className="mt-2 block rounded-lg bg-white/[0.04] px-3 py-2 text-[11px] text-content-muted font-mono">
                npm install @homenshum/nodebench-mcp
              </code>
              <button
                type="button"
                onClick={() => onNavigate("api-keys" as MainView, "/api-keys")}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#d97757] hover:underline"
              >
                Manage keys
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-sm font-medium text-content">REST API</div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-content-muted">
                Passport, receipts, and investigation endpoints.
              </p>
              <a
                href="/v1/specs"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#d97757] hover:underline"
              >
                Read the API docs
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-sm font-medium text-content">Claude Code</div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-content-muted">
                Add NodeBench to your Claude Code workflow.
              </p>
              <code className="mt-2 block rounded-lg bg-white/[0.04] px-3 py-2 text-[11px] text-content-muted font-mono">
                claude mcp add nodebench
              </code>
            </div>
          </div>
        </div>

        {/* Developers link */}
        <div style={stagger("0.8s")} className="mt-10 w-full text-center">
          <button
            type="button"
            onClick={() => onNavigate("developers" as MainView, "/developers")}
            className="inline-flex items-center gap-1.5 text-sm text-content-muted transition-colors hover:text-[#d97757]"
          >
            See what&apos;s under the hood
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default ControlPlaneLanding;
