import React from "react";

interface ExecutionBarProps {
  task: any;
  leftPct: string;
  widthPct: string;
  color: string;
  progress: number;
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Format duration in milliseconds to "Xm Ys" format
 */
function formatDuration(durationMs: number): string {
  const totalSec = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    if (minutes === 0 && seconds === 0) return `${hours}h`;
    if (seconds === 0) return `${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    if (seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

const extractElapsedMs = (task: any): number => {
  const candidates = [
    (task as any)?.elapsedMs,
    (task as any)?.metrics?.elapsedMs,
    (task as any)?.metrics?.latencyMs,
    (task as any)?.meta?.elapsedMs,
    (task as any)?.latencyMs,
    (task as any)?.stats?.elapsedMs,
  ];
  for (const candidate of candidates) {
    const ms = Number(candidate);
    if (Number.isFinite(ms) && ms > 0) return ms;
  }
  return 0;
};

/**
 * Generate heatmap gradient based on task metrics
 * Simulates confidence score, task density, or quality metrics
 */
function getHeatmapGradient(task: any): string {
  // If task has explicit gradient, use it
  if (task.heatmapGradient) {
    return task.heatmapGradient;
  }

  // Generate based on task state and metrics
  const state = (task.status ?? "pending").toLowerCase();
  
  if (state === "error" || state === "failed") {
    // Degrading quality: Green → Yellow → Red
    return "linear-gradient(to right, #16A34A, #F59E0B, #EF4444)";
  }
  
  if (state === "complete" || state === "ok") {
    // High confidence: Low → Medium → High
    return "linear-gradient(to right, #EF4444, #F59E0B, #16A34A)";
  }
  
  if (state === "running") {
    // Processing: Blue gradient
    return "linear-gradient(to right, #6366F1, #3B82F6)";
  }
  
  // Pending: Neutral gray
  return "linear-gradient(to right, #94A3B8, #CBD5E1)";
}

/**
 * ExecutionBar component with enhanced visuals matching the prototype
 */
export function ExecutionBar({
  task,
  leftPct,
  widthPct,
  color,
  progress,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onKeyDown,
}: ExecutionBarProps) {
  const status = (task.status ?? "pending").toLowerCase();
  const durationMs = Math.max(0, Number((task as any).durationMs ?? 0));
  const retryOffsetsMs = (task as any).retryOffsetsMs as number[] | undefined;
  const failureOffsetMs = (task as any).failureOffsetMs as number | undefined;
  const nowMs = typeof window !== 'undefined' ? Date.now() : 0;
  const elapsedMs = extractElapsedMs(task);
  const startedAtMs = Number((task as any).startedAtMs ?? 0);
  const completedAtMs = Number((task as any).completedAtMs ?? (task as any).finishedAtMs ?? 0);

  const runtimeCandidates: number[] = [];
  if (elapsedMs > 0) runtimeCandidates.push(elapsedMs);
  if (status === 'complete' || status === 'error') {
    if (startedAtMs && completedAtMs && completedAtMs > startedAtMs) runtimeCandidates.push(completedAtMs - startedAtMs);
  } else if (status === 'running') {
    if (startedAtMs) runtimeCandidates.push(Math.max(0, nowMs - startedAtMs));
    if (durationMs > 0 && typeof progress === 'number' && progress > 0) runtimeCandidates.push(Math.max(0, progress * durationMs));
  }
  const runtimeMs = runtimeCandidates.length ? Math.max(...runtimeCandidates) : null;
  const runtimeLabel = runtimeMs !== null ? formatDuration(runtimeMs) : null;
  const plannedLabel = durationMs > 0 ? formatDuration(durationMs) : null;
  // ETA: prefer runtime-based; fallback to progress-based; show for running tasks when duration is known
  let etaMs: number | null = null;
  if (status === 'running' && durationMs > 0) {
    if (runtimeMs !== null) etaMs = Math.max(0, durationMs - runtimeMs);
    else if (typeof progress === 'number') etaMs = Math.max(0, Math.round((1 - Math.max(0, Math.min(1, progress))) * durationMs));
  }
  const titleParts = [`${Math.round(progress * 100)}%`];
  if (runtimeLabel) titleParts.push(`runtime ${runtimeLabel}`);
  else if (plannedLabel) titleParts.push(`plan ${plannedLabel}`);
  else titleParts.push('runtime —');
  if (etaMs !== null) titleParts.push(`ETA ${formatDuration(etaMs)}`);
  const titleText = titleParts.join(' • ');
  const displayDurationLabel = runtimeLabel ?? plannedLabel ?? '—';

  return (
    <div
      className={`execution-bar ${status}`}
      role="button"
      tabIndex={0}
      aria-label={`${String(task.agentType || "agent")}: ${String(task.name || "")}`}
      title={titleText}
      style={{
        left: leftPct,
        width: widthPct,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {/* Roadmap Visuals (Heatmap Gradient) */}
      <div
        className="roadmap-visuals"
        style={{ background: getHeatmapGradient(task) }}
      />

      {/* Execution Bar Title */}
      <div className="execution-bar-title">
        {task.name || "Agent"} ({displayDurationLabel})
      </div>

      {/* Status Markers (Start/End) */}
      <div className="status-marker start" />
      <div className="status-marker end" />

      {/* Retry Markers */}
      {retryOffsetsMs?.map((offset, i) => (
        <div
          key={`retry-${i}`}
          className="retry-marker"
          aria-label={`retry-marker-${offset}ms`}
          style={{ left: `${durationMs > 0 ? (offset / durationMs) * 100 : 0}%` }}
          title={`Retry ${i + 1} at ${Math.floor(offset / 1000)}s`}
        />
      ))}

      {/* Error Marker */}
      {failureOffsetMs !== undefined && (
        <div
          className="error-marker"
          aria-label={`error-marker-${failureOffsetMs}ms`}
          style={{ left: `${durationMs > 0 ? (failureOffsetMs / durationMs) * 100 : 0}%` }}
          title={`Failed at ${Math.floor(failureOffsetMs / 1000)}s`}
        >
          ✗
        </div>
      )}

      {/* Progress Indicator */}
      {status === "running" && (
        <div
          className="progress-indicator"
          style={{
            width: `${Math.round(progress * 100)}%`,
            background: `linear-gradient(90deg, ${color}40, ${color}40)`,
          }}
        />
      )}
    </div>
  );
}

