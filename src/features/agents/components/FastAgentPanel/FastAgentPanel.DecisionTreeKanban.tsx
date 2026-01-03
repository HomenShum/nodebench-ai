/**
 * FastAgentPanel.DecisionTreeKanban.tsx
 *
 * Persona-Adaptive Decision Tree Visualization
 *
 * Displays the "Pruning Garden" view where users see:
 * - Multiple candidates spawned in parallel
 * - Fast pruning with clear reasons
 * - Enrichment progress for survivors
 * - Final synthesis with outreach hooks
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Shield,
  Network,
  DollarSign,
  Ban,
  CheckCircle,
  AlertCircle,
  Loader2,
  GitMerge,
  TrendingUp,
  Clock,
  Target,
  Activity,
  Database,
  BarChart,
  MessageSquare,
  Grid,
  Code2,
  Rocket,
  Building2,
  LineChart,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type {
  ReasoningNode,
  CandidateData,
  EnrichmentData,
  AgentSessionState,
  NodeStatus,
} from '../../types/reasoningGraph';

// ============================================================================
// Icon Registry
// ============================================================================

const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  Shield,
  Network,
  DollarSign,
  TrendingUp,
  Clock,
  Target,
  Activity,
  Database,
  BarChart,
  MessageSquare,
  Grid,
  Code2,
  Rocket,
  Building2,
  LineChart,
  LayoutGrid,
  AlertTriangle: AlertCircle,
};

const getIcon = (name: string): React.ElementType => ICON_MAP[name] || Target;

// ============================================================================
// Props
// ============================================================================

interface DecisionTreeKanbanProps {
  graph: AgentSessionState;
  className?: string;
  onNodeClick?: (nodeId: string) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function DecisionTreeKanban({
  graph,
  className = "",
  onNodeClick,
}: DecisionTreeKanbanProps) {
  // Group nodes by type
  const { sourcingNodes, candidateNodes, synthesisNode } = useMemo(() => {
    const nodes = Object.values(graph.nodes);
    return {
      sourcingNodes: nodes.filter(n => n.type === "sourcing"),
      candidateNodes: nodes.filter(n => n.type === "candidate" || n.type === "verification"),
      synthesisNode: nodes.find(n => n.type === "synthesis"),
    };
  }, [graph.nodes]);

  const qualifiedCount = candidateNodes.filter(n => n.status === "verified" || n.status === "completed").length;
  const prunedCount = candidateNodes.filter(n => n.status === "pruned").length;
  const totalCandidates = candidateNodes.length;

  return (
    <div className={`space-y-4 font-sans ${className}`}>
      {/* Header Stats */}
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2">
        <div className="flex items-center gap-2">
          <PhaseIndicator status={graph.status} />
          <span>{graph.phase}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-green-500">
            <CheckCircle className="w-3 h-3" />
            {qualifiedCount} Qualified
          </span>
          {prunedCount > 0 && (
            <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
              <Ban className="w-3 h-3" />
              {prunedCount} Pruned
            </span>
          )}
          <span>/ {totalCandidates} Scanned</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${graph.phaseProgress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Sourcing Phase (if any) */}
      {sourcingNodes.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Sources
          </div>
          <div className="grid grid-cols-2 gap-2">
            {sourcingNodes.map(node => (
              <SourceCard key={node.id} node={node} />
            ))}
          </div>
        </div>
      )}

      {/* Candidate Pipeline */}
      {candidateNodes.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Deal Flow Pipeline
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {candidateNodes.map(node => (
                <CandidateCard
                  key={node.id}
                  node={node}
                  onClick={() => onNodeClick?.(node.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Synthesis Result */}
      {synthesisNode && (
        <SynthesisCard node={synthesisNode} />
      )}
    </div>
  );
}

// ============================================================================
// Phase Indicator
// ============================================================================

function PhaseIndicator({ status }: { status: string }) {
  const isActive = status !== "completed" && status !== "idle";

  return (
    <span className="flex h-2 w-2 relative">
      {isActive && (
        <>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
        </>
      )}
      {!isActive && (
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      )}
    </span>
  );
}

// ============================================================================
// Source Card
// ============================================================================

function SourceCard({ node }: { node: ReasoningNode }) {
  const isComplete = node.status === "completed" || node.status === "verified";
  const isRunning = node.status === "running";

  return (
    <div
      className={`p-2 rounded-lg border text-xs transition-colors ${
        isComplete
          ? "bg-green-500/5 border-green-500/20"
          : isRunning
          ? "bg-blue-500/5 border-blue-500/20"
          : "bg-[var(--bg-tertiary)] border-[var(--border-color)]"
      }`}
    >
      <div className="flex items-center gap-2">
        {isRunning && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
        {isComplete && <CheckCircle className="w-3 h-3 text-green-500" />}
        <span className="font-medium text-[var(--text-primary)] truncate">
          {node.label}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Candidate Card
// ============================================================================

function CandidateCard({ node, onClick }: { node: ReasoningNode; onClick?: () => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const isPruned = node.status === "pruned";
  const isVerified = node.status === "verified" || node.status === "completed";
  const isRunning = node.status === "running";
  const data = node.data as CandidateData | undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: isPruned ? 0.5 : 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={`relative rounded-lg border transition-colors cursor-pointer ${
        isPruned
          ? "bg-[var(--bg-tertiary)] border-[var(--border-color)] grayscale"
          : isVerified
          ? "bg-green-500/5 border-green-500/20"
          : isRunning
          ? "bg-blue-500/5 border-blue-500/20"
          : "bg-[var(--bg-secondary)] border-[var(--border-color)]"
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="p-0.5 hover:bg-[var(--bg-tertiary)] rounded"
              >
                {expanded ? (
                  <ChevronDown className="w-3 h-3 text-[var(--text-secondary)]" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-[var(--text-secondary)]" />
                )}
              </button>
              <h4 className={`font-bold text-sm ${isPruned ? "text-[var(--text-tertiary)] line-through" : "text-[var(--text-primary)]"}`}>
                {data?.companyName || node.label}
              </h4>
            </div>
            {data && (
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                {data.sector && <span>{data.sector}</span>}
                {data.fundingAmount && (
                  <>
                    <span>•</span>
                    <span className="font-medium">{data.fundingAmount}</span>
                  </>
                )}
                {data.fundingStage && (
                  <>
                    <span>•</span>
                    <span>{data.fundingStage}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Status Badge */}
          <StatusBadge status={node.status} pruneReason={node.pruneReason} />
        </div>

        {/* Critique / Prune Reason */}
        {(node.critique || node.pruneReason) && !expanded && (
          <div className="mt-2 flex items-start gap-2">
            <AlertCircle className="w-3 h-3 text-[var(--text-tertiary)] mt-0.5 shrink-0" />
            <p className="text-xs text-[var(--text-tertiary)] leading-snug italic">
              "{node.pruneReason || node.critique}"
            </p>
          </div>
        )}
      </div>

      {/* Expanded: Enrichment Grid */}
      <AnimatePresence>
        {expanded && !isPruned && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0">
              <EnrichmentGrid data={data} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status, pruneReason }: { status: NodeStatus; pruneReason?: string }) {
  if (status === "pruned") {
    return (
      <span className="flex items-center text-[10px] font-bold text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
        <Ban className="w-3 h-3 mr-1" />
        {pruneReason ? pruneReason.slice(0, 20) : "Pruned"}
      </span>
    );
  }

  if (status === "verified" || status === "completed") {
    return (
      <span className="flex items-center text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
        <CheckCircle className="w-3 h-3 mr-1" />
        Shortlist
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Enriching
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="flex items-center text-[10px] font-bold text-red-600 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
        <AlertCircle className="w-3 h-3 mr-1" />
        Failed
      </span>
    );
  }

  return null;
}

// ============================================================================
// Enrichment Grid
// ============================================================================

function EnrichmentGrid({ data }: { data?: CandidateData }) {
  if (!data) return null;

  const enrichments = [
    {
      id: "pedigree",
      label: "Founders",
      icon: Users,
      color: "blue",
      summary: data.pedigree_summary,
    },
    {
      id: "moat",
      label: "IP/Reg",
      icon: Shield,
      color: "purple",
      summary: data.moat_summary,
    },
    {
      id: "network",
      label: "Influence",
      icon: Network,
      color: "amber",
      summary: data.network_summary,
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-700",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-700",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-700",
    green: "bg-green-500/10 border-green-500/20 text-green-700",
    red: "bg-red-500/10 border-red-500/20 text-red-700",
  };

  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {enrichments.map(({ id, label, icon: Icon, color, summary }) => (
        <div
          key={id}
          className={`p-2 rounded border ${colorMap[color]}`}
        >
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold mb-1">
            <Icon className="w-3 h-3" />
            {label}
          </div>
          <p className="text-xs leading-tight">
            {summary || (
              <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing...
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Synthesis Card
// ============================================================================

function SynthesisCard({ node }: { node: ReasoningNode }) {
  const isComplete = node.status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 ${
        isComplete
          ? "bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20"
          : "bg-[var(--bg-secondary)] border-[var(--border-color)]"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded ${isComplete ? "bg-green-500/10" : "bg-[var(--bg-tertiary)]"}`}>
          <GitMerge className={`w-4 h-4 ${isComplete ? "text-green-600" : "text-[var(--text-secondary)]"}`} />
        </div>
        <span className="text-sm font-bold text-[var(--text-primary)]">
          {isComplete ? "Final Shortlist" : "Synthesizing Results..."}
        </span>
        {node.confidenceScore && (
          <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded ${
            node.confidenceScore > 80
              ? "bg-green-500/10 text-green-700"
              : "bg-amber-500/10 text-amber-700"
          }`}>
            {node.confidenceScore}% Confidence
          </span>
        )}
      </div>

      {node.content && (
        <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
          {node.content}
        </div>
      )}

      {!isComplete && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          Merging findings from qualified candidates...
        </div>
      )}
    </motion.div>
  );
}

export default DecisionTreeKanban;
