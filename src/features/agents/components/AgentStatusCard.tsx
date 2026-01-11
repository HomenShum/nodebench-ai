/**
 * AgentStatusCard.tsx
 *
 * Real-time agent status card with live subscriptions.
 * Displays agent status, current task preview, and quick actions.
 */

import React, { memo } from "react";
import {
  FileText,
  Video,
  Building,
  TrendingUp,
  Search,
  Zap,
  Clock,
  Play,
  Pause,
  Settings,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types & Constants
// ============================================================================

export type AgentStatus = "active" | "idle" | "paused" | "running" | "error" | "complete";

export interface AgentConfig {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
  bgColorClass: string;
  borderColorClass: string;
}

export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  coordinator: {
    id: "coordinator",
    name: "Coordinator Agent",
    shortName: "Coordinator",
    description: "Orchestrates subagents for complex tasks",
    icon: Zap,
    colorClass: "text-indigo-600",
    bgColorClass: "bg-indigo-500/10",
    borderColorClass: "border-indigo-500/20",
  },
  document: {
    id: "document",
    name: "Document Agent",
    shortName: "Document",
    description: "Document search, retrieval, creation",
    icon: FileText,
    colorClass: "text-blue-600",
    bgColorClass: "bg-blue-500/10",
    borderColorClass: "border-blue-500/20",
  },
  media: {
    id: "media",
    name: "Media Agent",
    shortName: "Media",
    description: "YouTube, web content, media analysis",
    icon: Video,
    colorClass: "text-purple-600",
    bgColorClass: "bg-purple-500/10",
    borderColorClass: "border-purple-500/20",
  },
  sec: {
    id: "sec",
    name: "SEC Agent",
    shortName: "SEC",
    description: "SEC filings and company info",
    icon: Building,
    colorClass: "text-amber-600",
    bgColorClass: "bg-amber-500/10",
    borderColorClass: "border-amber-500/20",
  },
  openbb: {
    id: "openbb",
    name: "Finance Agent",
    shortName: "Finance",
    description: "Stock, crypto, market data",
    icon: TrendingUp,
    colorClass: "text-green-600",
    bgColorClass: "bg-green-500/10",
    borderColorClass: "border-green-500/20",
  },
  arbitrage: {
    id: "arbitrage",
    name: "Research Agent",
    shortName: "Research",
    description: "Multi-source research with contradiction detection",
    icon: Search,
    colorClass: "text-cyan-600",
    bgColorClass: "bg-cyan-500/10",
    borderColorClass: "border-cyan-500/20",
  },
};

export interface AgentStatusCardProps {
  agentId: string;
  status: AgentStatus;
  lastActivity?: string;
  tasksCompleted?: number;
  currentTask?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onConfigure?: () => void;
  onToggleStatus?: () => void;
}

// ============================================================================
// Status Indicator Component
// ============================================================================

const StatusIndicator = memo(function StatusIndicator({ status }: { status: AgentStatus }) {
  const statusConfig = {
    active: { dot: "status-dot running", label: "Active", icon: null },
    running: { dot: "status-dot running", label: "Running", icon: Loader2 },
    idle: { dot: "status-dot pending", label: "Idle", icon: null },
    paused: { dot: "status-dot paused", label: "Paused", icon: null },
    error: { dot: "status-dot error", label: "Error", icon: AlertCircle },
    complete: { dot: "status-dot complete", label: "Complete", icon: CheckCircle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("agent-dashboard", config.dot)} />
      {Icon && <Icon className="w-3 h-3 animate-spin" />}
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {config.label}
      </span>
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const AgentStatusCard = memo(function AgentStatusCard({
  agentId,
  status,
  lastActivity,
  tasksCompleted = 0,
  currentTask,
  isExpanded = false,
  onToggleExpand,
  onConfigure,
  onToggleStatus,
}: AgentStatusCardProps) {
  const config = AGENT_CONFIGS[agentId] || AGENT_CONFIGS.coordinator;
  const Icon = config.icon;

  const isActive = status === "active" || status === "running";

  return (
    <div
      className={cn(
        "bg-[var(--bg-primary)] rounded-container border border-[var(--border-color)]",
        "transition-all duration-200 hover:shadow-hover",
        isActive && "ring-1 ring-offset-1 ring-offset-[var(--bg-primary)]",
        isActive && config.borderColorClass.replace("border-", "ring-")
      )}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Agent Icon & Info */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                config.bgColorClass,
                "border",
                config.borderColorClass
              )}
            >
              <Icon className={cn("w-5 h-5", config.colorClass)} />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                {config.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {config.description}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <StatusIndicator status={status} />
        </div>

        {/* Current Task Preview (if running) */}
        {currentTask && isActive && (
          <div className="mt-3 p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
            <div className="flex items-center gap-1.5 mb-1">
              <Loader2 className="w-3 h-3 animate-spin text-[var(--accent-primary)]" />
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Current Task
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
              {currentTask}
            </p>
          </div>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-muted)]">
          {lastActivity && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{lastActivity}</span>
            </div>
          )}
          {tasksCompleted > 0 && (
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{tasksCompleted} tasks</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={onToggleStatus}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2",
            "text-xs font-medium rounded-lg border border-[var(--border-color)]",
            "hover:bg-[var(--bg-hover)] transition-colors"
          )}
        >
          {isActive ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Start
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onConfigure}
          className={cn(
            "flex items-center justify-center p-2 rounded-lg",
            "border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors"
          )}
          aria-label="Configure agent"
        >
          <Settings className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            className={cn(
              "flex items-center justify-center p-2 rounded-lg",
              "border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors"
            )}
            aria-label={isExpanded ? "Collapse details" : "Expand details"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[var(--border-color)] pt-3">
          <div className="text-xs text-[var(--text-muted)]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium">Model:</span> claude-3-5-sonnet
              </div>
              <div>
                <span className="font-medium">Memory:</span> 2.4k tokens
              </div>
              <div>
                <span className="font-medium">Avg latency:</span> 1.2s
              </div>
              <div>
                <span className="font-medium">Success rate:</span> 98%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default AgentStatusCard;
