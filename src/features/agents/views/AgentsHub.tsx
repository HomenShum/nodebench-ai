/**
 * AgentsHub - Central hub for viewing and managing AI agents
 *
 * Redesigned to match Documents/Calendar hub patterns with:
 * - TopDividerBar + PageHeroHeader layout
 * - Collapsible sidebar with queue, recent runs, memory stats
 * - Real-time agent status cards with live subscriptions
 * - Command bar with /spawn syntax support
 * - Swarm visualization for parallel execution
 * - Human-in-the-loop approval queue
 */

import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import {
  Bot,
  Zap,
  Sparkles,
  TrendingUp,
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Cpu,
  ClipboardList,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";

// Shared UI components
import { TopDividerBar } from "@shared/ui/TopDividerBar";
import { UnifiedHubPills } from "@/shared/ui/UnifiedHubPills";
import { PageHeroHeader } from "@shared/ui/PageHeroHeader";

// Agent-specific components
import { AgentStatusCard, AGENT_CONFIGS, type AgentStatus } from "../components/AgentStatusCard";
import { AgentCommandBar, type AgentMode, type ApprovedModel } from "../components/AgentCommandBar";
import { HumanApprovalQueue } from "../components/HumanApprovalQueue";
import { AgentSidebar } from "../components/AgentSidebar";
import { SwarmLanesView } from "../components/FastAgentPanel/SwarmLanesView";
import { AutonomousOperationsPanel } from "../components/AutonomousOperationsPanel";
import { FreeModelRankingsPanel } from "../components/FreeModelRankingsPanel";
import { TaskManagerView } from "../components/TaskManager";

// Hooks
import { useSwarmActions } from "@/hooks/useSwarm";

// ============================================================================
// Types
// ============================================================================

interface AgentStatusData {
  agentType: string;
  status: "running" | "idle";
  lastActivity: number | null;
  tasksCompleted: number;
  currentTask: string | null;
}

// ============================================================================
// Quick Stats Component
// ============================================================================

function QuickStatsBar() {
  const stats = useQuery(api.domains.agents.agentHubQueries.getAgentStats);
  const costMetrics = useQuery(
    api.domains.agents.agentHubQueries.getCostSavingsMetrics,
    { windowHours: 24 }
  );

  if (!stats) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-4 animate-pulse"
          >
            <div className="h-6 w-12 bg-[var(--bg-secondary)] rounded mb-1" />
            <div className="h-4 w-20 bg-[var(--bg-secondary)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      value: stats.totalAgents,
      label: "Total Agents",
      icon: Bot,
      color: "text-[var(--accent-primary)]",
    },
    {
      value: stats.activeNow,
      label: "Active Now",
      icon: Activity,
      color: stats.activeNow > 0 ? "text-green-600" : "text-[var(--text-muted)]",
    },
    {
      value: stats.tasksCompleted,
      label: "Tasks Completed",
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      value: `${stats.successRate}%`,
      label: "Success Rate",
      icon: Sparkles,
      color: "text-purple-600",
    },
    {
      value: costMetrics?.freeRunsToday ?? 0,
      label: "Free Runs Today",
      icon: Cpu,
      color: "text-cyan-600",
    },
    {
      value: costMetrics ? `$${costMetrics.dollarsSaved.toFixed(2)}` : "$0.00",
      label: "Cost Saved (24h)",
      icon: DollarSign,
      color: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-4"
          >
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4", item.color)} />
              <span className={cn("text-2xl font-bold", item.color)}>
                {item.value}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Agent Grid Component
// ============================================================================

function AgentGrid() {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  const agentStatuses = useQuery(
    api.domains.agents.agentHubQueries.getAllAgentStatuses
  ) as AgentStatusData[] | undefined;

  const toggleExpand = useCallback((agentId: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  const formatTimeAgo = (timestamp: number | null): string => {
    if (!timestamp) return "Never";
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Use static agent list if query is loading
  const agents = useMemo(() => {
    const agentTypes = ["coordinator", "document", "media", "sec", "openbb", "arbitrage"];

    return agentTypes.map((agentType) => {
      const statusData = agentStatuses?.find((s) => s.agentType === agentType);
      return {
        id: agentType,
        status: (statusData?.status || "idle") as AgentStatus,
        lastActivity: formatTimeAgo(statusData?.lastActivity || null),
        tasksCompleted: statusData?.tasksCompleted || 0,
        currentTask: statusData?.currentTask || undefined,
      };
    });
  }, [agentStatuses]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <AgentStatusCard
          key={agent.id}
          agentId={agent.id}
          status={agent.status}
          lastActivity={agent.lastActivity}
          tasksCompleted={agent.tasksCompleted}
          currentTask={agent.currentTask}
          isExpanded={expandedAgents.has(agent.id)}
          onToggleExpand={() => toggleExpand(agent.id)}
          onConfigure={() => console.log("Configure", agent.id)}
          onToggleStatus={() => console.log("Toggle", agent.id)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Active Swarms Section
// ============================================================================

function ActiveSwarmsSection() {
  const [isExpanded, setIsExpanded] = useState(true);

  const activeSwarms = useQuery(api.domains.agents.agentHubQueries.getActiveSwarms, {
    limit: 5,
  });

  // Filter to only active swarms
  const runningSwarms = useMemo(() => {
    return (
      activeSwarms?.filter((s) =>
        ["pending", "spawning", "executing", "gathering", "synthesizing"].includes(
          s.status
        )
      ) || []
    );
  }, [activeSwarms]);

  if (runningSwarms.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--accent-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Active Swarms
          </h3>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 border border-green-500/20">
            {runningSwarms.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-[var(--border-color)]">
          {runningSwarms.map((swarm) => (
            <SwarmLanesView
              key={swarm.swarmId}
              threadId={swarm.threadId}
              className="border-b last:border-b-0 border-[var(--border-color)]"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AgentsHub() {
  const { spawnSwarm } = useSwarmActions();

  const handleCommandSubmit = useCallback(
    async (
      query: string,
      options: { mode: AgentMode; model: ApprovedModel; agents?: string[] }
    ) => {
      console.log("Command submitted:", { query, options });

      if (options.agents && options.agents.length > 0) {
        // Spawn swarm
        try {
          await spawnSwarm({
            query,
            agents: options.agents,
            pattern: "fan_out_gather",
            model: options.model,
          });
        } catch (error) {
          console.error("Failed to spawn swarm:", error);
        }
      } else {
        // Single agent query - would route to FastAgentPanel
        console.log("Single agent query:", query);
      }
    },
    [spawnSwarm]
  );

  return (
    <div className="h-full w-full bg-[var(--bg-primary)] overflow-y-auto relative">
      <div className="flex-1 p-8 relative z-10">
        <div className="dashboard-container max-w-7xl mx-auto flex gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Top Divider Bar */}
            <TopDividerBar
              left={
                <UnifiedHubPills active="agents" showRoadmap roadmapDisabled={false} />
              }
            />

            {/* Hero Header */}
            <PageHeroHeader
              icon={<Bot className="w-6 h-6" />}
              title="Agents Hub"
              subtitle="Orchestrate AI agents for research, analysis, and automation"
              accent
              className="mb-6"
            />

            {/* Quick Stats */}
            <div className="mb-6">
              <QuickStatsBar />
            </div>

            {/* Command Bar */}
            <div className="mb-6">
              <AgentCommandBar onSubmit={handleCommandSubmit} />
            </div>

            {/* Autonomous Operations Status */}
            <div className="mb-6">
              <AutonomousOperationsPanel />
            </div>

            {/* Active Swarms */}
            <div className="mb-6">
              <ActiveSwarmsSection />
            </div>

            {/* Agent Status Grid */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-[var(--accent-primary)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Available Agents
                </h2>
              </div>
              <AgentGrid />
            </div>

            {/* Free Model Rankings */}
            <div className="mb-6">
              <FreeModelRankingsPanel />
            </div>

            {/* Human Approval Queue */}
            <div className="mb-6">
              <HumanApprovalQueue />
            </div>

            {/* Task Manager - Agent Task History & Telemetry */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[var(--accent-primary)]" />
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Task History
                  </h2>
                </div>
                <a
                  href="/#activity"
                  className="flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline"
                >
                  Public Feed <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="rounded-lg border border-[var(--border-color)] overflow-hidden h-[500px]">
                <TaskManagerView isPublic={false} className="h-full" />
              </div>
            </div>

            {/* Coming Soon Banner */}
            <div className="p-6 bg-gradient-to-r from-[var(--accent-primary-bg)] to-[var(--bg-secondary)] rounded-lg border border-[var(--accent-primary)]/20">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-5 h-5 text-[var(--accent-primary)]" />
                <h3 className="font-semibold text-[var(--text-primary)]">
                  Autonomous Research System LIVE
                </h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                The autonomous research loop is now operational. Free OpenRouter models
                handle background signal ingestion, processing, and publishing at $0/month.
                Premium models are reserved for user-initiated deep research.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <AgentSidebar />
        </div>
      </div>
    </div>
  );
}

export default AgentsHub;
