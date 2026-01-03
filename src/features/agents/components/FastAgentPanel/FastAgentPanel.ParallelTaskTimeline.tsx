/**
 * FastAgentPanel.ParallelTaskTimeline.tsx
 *
 * Timeline Kanban View for Deep Agent 2.0 Parallel Task Execution
 *
 * Displays the parallel verification tree:
 * - Decision tree visualization with branches
 * - Real-time status updates for each branch
 * - Verification scores and cross-check results
 * - Pruned vs surviving paths
 * - Final merge visualization
 *
 * Supports two view modes:
 * - Tree View: Classic decision tree structure
 * - Kanban View: Deal flow pipeline for persona workflows
 */

import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import {
  GitBranch,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  Target,
  Scissors,
  Merge,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Brain,
  Shield,
  MessageSquare,
  Zap,
  LayoutList,
  Network,
} from 'lucide-react';
import { DecisionTreeKanban } from './FastAgentPanel.DecisionTreeKanban';
import type { AgentSessionState, ReasoningNode, NodeStatus } from '../../types/reasoningGraph';

// ============================================================================
// Types
// ============================================================================

type TreeStatus =
  | "decomposing"
  | "executing"
  | "verifying"
  | "cross_checking"
  | "merging"
  | "completed"
  | "failed";

type TaskStatus =
  | "pending"
  | "running"
  | "awaiting_children"
  | "verifying"
  | "completed"
  | "pruned"
  | "failed"
  | "backtracked";

type TaskType =
  | "root"
  | "branch"
  | "verification"
  | "critique"
  | "merge"
  | "refinement";

interface TaskNode {
  _id: Id<"parallelTaskNodes">;
  taskId: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  taskType: TaskType;
  status: TaskStatus;
  branchIndex?: number;
  siblingCount?: number;
  depth: number;
  result?: string;
  resultSummary?: string;
  confidence?: number;
  verificationScore?: number;
  verificationNotes?: string;
  survivedVerification?: boolean;
  elapsedMs?: number;
  critiques?: Array<{
    source: string;
    verdict: "agree" | "disagree" | "partial";
    reason: string;
  }>;
}

interface TaskTree {
  _id: Id<"parallelTaskTrees">;
  query: string;
  status: TreeStatus;
  phase?: string;
  phaseProgress?: number;
  totalBranches?: number;
  activeBranches?: number;
  completedBranches?: number;
  prunedBranches?: number;
  mergedResult?: string;
  confidence?: number;
  elapsedMs?: number;
}

interface ParallelTaskTimelineProps {
  agentThreadId: string;
  className?: string;
  compact?: boolean;
  defaultView?: "tree" | "kanban";
}

// ============================================================================
// Data Transformation for Kanban View
// ============================================================================

function transformToAgentSessionState(
  tree: TaskTree,
  nodes: TaskNode[]
): AgentSessionState {
  // Map tree status to session status
  const statusMap: Record<TreeStatus, AgentSessionState["status"]> = {
    decomposing: "planning",
    executing: "sourcing",
    verifying: "filtering",
    cross_checking: "filtering",
    merging: "converging",
    completed: "completed",
    failed: "completed",
  };

  // Map task status to node status
  const nodeStatusMap: Record<TaskStatus, NodeStatus> = {
    pending: "pending",
    running: "running",
    completed: "completed",
    verified: "verified",
    failed: "failed",
    pruned: "pruned",
    backtracked: "backtracked",
  };

  // Convert TaskNode to ReasoningNode
  const reasoningNodes: Record<string, ReasoningNode> = {};
  let rootId = "";

  for (const node of nodes) {
    const isRoot = !node.parentTaskId;
    if (isRoot) rootId = node.taskId;

    reasoningNodes[node.taskId] = {
      id: node.taskId,
      parentId: node.parentTaskId ?? null,
      childrenIds: nodes
        .filter((n) => n.parentTaskId === node.taskId)
        .map((n) => n.taskId),
      type: mapTaskTypeToNodeType(node.taskType),
      status: nodeStatusMap[node.status] ?? "pending",
      label: node.label,
      content: node.result ?? undefined,
      confidenceScore: node.verificationScore,
      critique: node.critique ?? undefined,
      pruneReason: node.pruneReason ?? undefined,
      branchIndex: node.branchIndex,
      siblingCount: node.siblingCount,
      data: node.taskType === "branch" || node.taskType === "enrichment"
        ? {
            companyName: node.label,
            sector: "",
          }
        : undefined,
      startedAt: node._creationTime,
      completedAt: node.completedAt,
      elapsedMs: node.elapsedMs,
    };
  }

  return {
    sessionId: tree._id,
    templateId: "parallel-exploration",
    personaId: "default",
    status: statusMap[tree.status] ?? "idle",
    phase: tree.phase ?? tree.status,
    phaseProgress: tree.phaseProgress ?? 0,
    nodes: reasoningNodes,
    rootId,
    stats: {
      totalCandidates: tree.totalBranches ?? nodes.length,
      qualified: tree.completedBranches ?? 0,
      pruned: tree.prunedBranches ?? 0,
      enriching: tree.activeBranches ?? 0,
    },
    startedAt: Date.now(),
  };
}

function mapTaskTypeToNodeType(
  taskType: TaskType
): ReasoningNode["type"] {
  const typeMap: Record<TaskType, ReasoningNode["type"]> = {
    root: "root",
    decomposition: "decomposition",
    branch: "candidate",
    verification: "verification",
    enrichment: "enrichment",
    synthesis: "synthesis",
    cross_check: "critique",
  };
  return typeMap[taskType] ?? "candidate";
}

// ============================================================================
// Component
// ============================================================================

export function ParallelTaskTimeline({
  agentThreadId,
  className = "",
  compact = false,
  defaultView = "tree",
}: ParallelTaskTimelineProps) {
  const [viewMode, setViewMode] = useState<"tree" | "kanban">(defaultView);

  const data = useQuery(api.domains.agents.parallelTaskTree.getTaskTree, {
    agentThreadId,
  });

  if (!data || !data.tree) {
    return null;
  }

  const { tree, nodes, events, crossChecks } = data;

  // Build tree structure
  const nodesByParent = useMemo(() => {
    const map = new Map<string | null, TaskNode[]>();
    for (const node of nodes) {
      const parentId = node.parentTaskId ?? null;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(node as TaskNode);
    }
    // Sort children by branchIndex
    for (const children of map.values()) {
      children.sort((a, b) => (a.branchIndex ?? 0) - (b.branchIndex ?? 0));
    }
    return map;
  }, [nodes]);

  const rootNodes = nodesByParent.get(null) ?? [];

  // Transform data for kanban view
  const kanbanGraph = useMemo(() => {
    return transformToAgentSessionState(tree, nodes as TaskNode[]);
  }, [tree, nodes]);

  return (
    <div className={`bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Parallel Exploration
            </span>
            <StatusBadge status={tree.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            {/* View Toggle */}
            <div className="flex items-center bg-[var(--bg-primary)] rounded-md p-0.5 border border-[var(--border-color)]">
              <button
                onClick={() => setViewMode("tree")}
                className={`p-1 rounded ${viewMode === "tree" ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}
                title="Tree View"
              >
                <Network className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-1 rounded ${viewMode === "kanban" ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}
                title="Pipeline View"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
            </div>
            {tree.totalBranches !== undefined && (
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {tree.completedBranches ?? 0}/{tree.totalBranches} branches
              </span>
            )}
            {tree.prunedBranches !== undefined && tree.prunedBranches > 0 && (
              <span className="flex items-center gap-1 text-amber-500">
                <Scissors className="w-3 h-3" />
                {tree.prunedBranches} pruned
              </span>
            )}
            {tree.elapsedMs !== undefined && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(tree.elapsedMs)}
              </span>
            )}
          </div>
        </div>

        {/* Phase indicator */}
        {tree.phase && tree.status !== "completed" && tree.status !== "failed" && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
              <span>{tree.phase}</span>
              {tree.phaseProgress !== undefined && (
                <span>{tree.phaseProgress}%</span>
              )}
            </div>
            <div className="h-1 bg-[var(--bg-primary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${tree.phaseProgress ?? 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content Area - Tree or Kanban View */}
      {viewMode === "tree" ? (
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {rootNodes.map((node) => (
            <TaskNodeRow
              key={node.taskId}
              node={node}
              nodesByParent={nodesByParent}
              depth={0}
              compact={compact}
            />
          ))}

          {/* Final result */}
          {tree.status === "completed" && tree.mergedResult && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-2 mb-2">
                <Merge className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Merged Result
                </span>
                {tree.confidence !== undefined && (
                  <ConfidenceBadge confidence={tree.confidence} />
                )}
              </div>
              <div className="text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg p-3 max-h-48 overflow-y-auto">
                {tree.mergedResult.slice(0, 500)}
                {tree.mergedResult.length > 500 && "..."}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 max-h-[500px] overflow-y-auto">
          <DecisionTreeKanban graph={kanbanGraph} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Task Node Row
// ============================================================================

interface TaskNodeRowProps {
  node: TaskNode;
  nodesByParent: Map<string | null, TaskNode[]>;
  depth: number;
  compact: boolean;
}

function TaskNodeRow({ node, nodesByParent, depth, compact }: TaskNodeRowProps) {
  const [expanded, setExpanded] = React.useState(true);
  const children = nodesByParent.get(node.taskId) ?? [];
  const hasChildren = children.length > 0;

  const statusConfig = getStatusConfig(node.status);
  const typeConfig = getTypeConfig(node.taskType);

  return (
    <div className="mb-2">
      {/* Node row */}
      <div
        className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
          node.status === "running"
            ? "bg-blue-500/10 border border-blue-500/30"
            : node.status === "pruned"
            ? "bg-amber-500/5 opacity-60"
            : node.status === "failed" || node.status === "backtracked"
            ? "bg-red-500/5 opacity-60"
            : node.status === "completed"
            ? "bg-green-500/5"
            : "bg-[var(--bg-tertiary)]"
        }`}
        style={{ marginLeft: depth * 16 }}
      >
        {/* Expand/collapse */}
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 p-0.5 hover:bg-[var(--bg-primary)] rounded transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3 text-[var(--text-secondary)]" />
            ) : (
              <ChevronRight className="w-3 h-3 text-[var(--text-secondary)]" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}

        {/* Status icon */}
        <div className={`mt-0.5 ${statusConfig.color}`}>
          {node.status === "running" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <statusConfig.icon className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Type badge */}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${typeConfig.bg} ${typeConfig.text}`}
            >
              {typeConfig.label}
            </span>

            {/* Title */}
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {node.title}
            </span>

            {/* Branch index */}
            {node.branchIndex !== undefined && node.siblingCount !== undefined && (
              <span className="text-xs text-[var(--text-tertiary)]">
                ({node.branchIndex + 1}/{node.siblingCount})
              </span>
            )}

            {/* Verification score */}
            {node.verificationScore !== undefined && (
              <VerificationBadge
                score={node.verificationScore}
                passed={node.survivedVerification ?? false}
              />
            )}

            {/* Confidence */}
            {node.confidence !== undefined && !node.verificationScore && (
              <ConfidenceBadge confidence={node.confidence} />
            )}

            {/* Duration */}
            {node.elapsedMs !== undefined && (
              <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(node.elapsedMs)}
              </span>
            )}
          </div>

          {/* Description/Result summary */}
          {!compact && (node.resultSummary || node.description) && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">
              {node.resultSummary || node.description}
            </p>
          )}

          {/* Critiques */}
          {!compact && node.critiques && node.critiques.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {node.critiques.map((critique, i) => (
                <CritiqueBadge key={i} verdict={critique.verdict} />
              ))}
            </div>
          )}

          {/* Verification notes */}
          {!compact && node.verificationNotes && (
            <p className="text-xs text-[var(--text-tertiary)] mt-1 italic">
              {node.verificationNotes}
            </p>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="relative">
          {/* Connector line */}
          <div
            className="absolute left-[22px] top-0 bottom-0 w-px bg-[var(--border-color)]"
            style={{ marginLeft: depth * 16 }}
          />
          {children.map((child) => (
            <TaskNodeRow
              key={child.taskId}
              node={child}
              nodesByParent={nodesByParent}
              depth={depth + 1}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Badges
// ============================================================================

function StatusBadge({ status }: { status: TreeStatus }) {
  const config = {
    decomposing: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Decomposing" },
    executing: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Executing" },
    verifying: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Verifying" },
    cross_checking: { bg: "bg-indigo-500/20", text: "text-indigo-400", label: "Cross-checking" },
    merging: { bg: "bg-cyan-500/20", text: "text-cyan-400", label: "Merging" },
    completed: { bg: "bg-green-500/20", text: "text-green-400", label: "Complete" },
    failed: { bg: "bg-red-500/20", text: "text-red-400", label: "Failed" },
  }[status];

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function VerificationBadge({ score, passed }: { score: number; passed: boolean }) {
  const pct = Math.round(score * 100);
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
        passed
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/20 text-red-400"
      }`}
    >
      <Shield className="w-3 h-3" />
      {pct}%
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.8
    ? "text-green-400 bg-green-500/20"
    : confidence >= 0.6
    ? "text-amber-400 bg-amber-500/20"
    : "text-red-400 bg-red-500/20";

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${color}`}>
      {pct}% conf
    </span>
  );
}

function CritiqueBadge({ verdict }: { verdict: "agree" | "disagree" | "partial" }) {
  const config = {
    agree: { icon: CheckCircle, color: "text-green-400 bg-green-500/20" },
    disagree: { icon: XCircle, color: "text-red-400 bg-red-500/20" },
    partial: { icon: AlertTriangle, color: "text-amber-400 bg-amber-500/20" },
  }[verdict];

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${config.color}`}>
      <config.icon className="w-3 h-3" />
      {verdict}
    </span>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusConfig(status: TaskStatus) {
  const configs: Record<TaskStatus, { icon: React.ElementType; color: string }> = {
    pending: { icon: Clock, color: "text-[var(--text-tertiary)]" },
    running: { icon: Loader2, color: "text-blue-400" },
    awaiting_children: { icon: Clock, color: "text-purple-400" },
    verifying: { icon: Shield, color: "text-amber-400" },
    completed: { icon: CheckCircle, color: "text-green-400" },
    pruned: { icon: Scissors, color: "text-amber-500" },
    failed: { icon: XCircle, color: "text-red-400" },
    backtracked: { icon: AlertTriangle, color: "text-orange-400" },
  };
  return configs[status];
}

function getTypeConfig(type: TaskType) {
  const configs: Record<TaskType, { icon: React.ElementType; bg: string; text: string; label: string }> = {
    root: { icon: Target, bg: "bg-purple-500/20", text: "text-purple-400", label: "Root" },
    branch: { icon: GitBranch, bg: "bg-blue-500/20", text: "text-blue-400", label: "Branch" },
    verification: { icon: Shield, bg: "bg-amber-500/20", text: "text-amber-400", label: "Verify" },
    critique: { icon: MessageSquare, bg: "bg-indigo-500/20", text: "text-indigo-400", label: "Critique" },
    merge: { icon: Merge, bg: "bg-cyan-500/20", text: "text-cyan-400", label: "Merge" },
    refinement: { icon: Sparkles, bg: "bg-pink-500/20", text: "text-pink-400", label: "Refine" },
  };
  return configs[type];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export default ParallelTaskTimeline;
