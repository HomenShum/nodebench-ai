import { memo } from "react";
import { Activity, GitBranch, Radar } from "lucide-react";
import { AgentFlowRail } from "@/features/agents/primitives/AgentFlowRail";
import { useRunGraph } from "@/features/agents/hooks/useRunGraph";

type Props = {
  entitySlug: string;
  runStatus?: string | null;
  checkpointCount?: number;
  updatedAt?: number;
  latestBlockType?: string | null;
};

function formatRelative(timestamp: number): string {
  const ageMs = Math.max(0, Date.now() - timestamp);
  if (ageMs < 60_000) return "just now";
  const minutes = Math.round(ageMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function statusLabel(status?: string | null): string {
  switch (status) {
    case "streaming":
      return "Running";
    case "structuring":
      return "Structuring";
    case "merged":
      return "Merged";
    case "failed":
      return "Needs review";
    default:
      return "Idle";
  }
}

function NotebookRunMapPanelBase({
  entitySlug,
  runStatus,
  checkpointCount,
  updatedAt,
  latestBlockType,
}: Props) {
  const runGraph = useRunGraph(entitySlug);

  if (!runGraph.hasRun) return null;

  const graphHeight = Math.max(
    220,
    Math.min(340, 36 + Math.ceil(Math.max(runGraph.nodes.length, 1) / 2) * 88),
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-white px-3 py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="flex items-center gap-2">
        <Radar className="h-3.5 w-3.5 text-gray-400" />
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Run map
        </div>
      </div>
      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
        {runGraph.isActive
          ? "The current diligence run is still shaping the notebook."
          : "Last run topology for this entity."}
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200">
          <Activity className="h-3 w-3" />
          {runGraph.isActive ? "Live now" : statusLabel(runStatus)}
        </span>
        {typeof checkpointCount === "number" && checkpointCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300">
            <GitBranch className="h-3 w-3" />
            {checkpointCount} checkpoint{checkpointCount === 1 ? "" : "s"}
          </span>
        ) : null}
        {latestBlockType ? (
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300">
            latest {latestBlockType}
          </span>
        ) : null}
        {updatedAt ? (
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
            updated {formatRelative(updatedAt)}
          </span>
        ) : null}
      </div>

      {runGraph.runHeadline ? (
        <div className="mt-3 rounded-md border border-gray-100 bg-gray-50/80 px-3 py-2 text-[11px] text-gray-600 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-gray-300">
          {runGraph.runHeadline}
        </div>
      ) : null}

      <AgentFlowRail
        nodes={runGraph.nodes}
        edges={runGraph.edges}
        height={graphHeight}
        className="mt-3"
      />
    </section>
  );
}

export const NotebookRunMapPanel = memo(NotebookRunMapPanelBase);
NotebookRunMapPanel.displayName = "NotebookRunMapPanel";

export default NotebookRunMapPanel;
