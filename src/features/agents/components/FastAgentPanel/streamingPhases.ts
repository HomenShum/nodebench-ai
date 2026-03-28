export type StreamingPhaseId = "route" | "gather" | "analyze" | "deliver";
export type StreamingPhaseStatus = "complete" | "active" | "pending";

export interface StreamingPhaseItem {
  id: StreamingPhaseId;
  label: string;
  detail: string;
  status: StreamingPhaseStatus;
}

export interface StreamingToolExecution {
  id: string;
  toolName: string;
  phaseId: StreamingPhaseId;
  status: "running" | "complete" | "error";
}

export interface StreamingStatusSummary {
  headline: string;
  detail: string;
  phases: StreamingPhaseItem[];
  activePhaseId: StreamingPhaseId | null;
  totalToolSteps: number;
  completedToolSteps: number;
  sourceToolSteps: number;
}

type MessagePartLike = {
  type?: string;
  toolName?: string;
  name?: string;
  toolCallId?: string;
  text?: string;
};

const PHASE_LABELS: Record<StreamingPhaseId, string> = {
  route: "Route",
  gather: "Gather",
  analyze: "Analyze",
  deliver: "Deliver",
};

function toToolName(part: MessagePartLike): string {
  if (typeof part.toolName === "string" && part.toolName.trim()) return part.toolName.trim();
  if (typeof part.name === "string" && part.name.trim()) return part.name.trim();

  const type = typeof part.type === "string" ? part.type : "";
  const typed = type.match(/^tool-(?:call|result|error)-(.+)$/);
  if (typed?.[1]) return typed[1];
  return "unknown";
}

function inferPhaseId(toolName: string): StreamingPhaseId {
  const normalized = toolName.toLowerCase();

  if (
    normalized.startsWith("delegate") ||
    normalized.includes("discover") ||
    normalized.includes("plan") ||
    normalized.includes("route") ||
    normalized.includes("select")
  ) {
    return "route";
  }

  if (
    normalized.includes("search") ||
    normalized.includes("fetch") ||
    normalized.includes("read") ||
    normalized.includes("crawl") ||
    normalized.includes("scrape") ||
    normalized.includes("query") ||
    normalized.includes("lookup") ||
    normalized.startsWith("get") ||
    normalized.startsWith("list")
  ) {
    return "gather";
  }

  if (
    normalized.includes("judge") ||
    normalized.includes("verify") ||
    normalized.includes("score") ||
    normalized.includes("rank") ||
    normalized.includes("classif") ||
    normalized.includes("compare") ||
    normalized.includes("reason") ||
    normalized.includes("dedupe") ||
    normalized.includes("extract") ||
    normalized.includes("analy")
  ) {
    return "analyze";
  }

  if (
    normalized.includes("write") ||
    normalized.includes("compose") ||
    normalized.includes("create") ||
    normalized.includes("merge") ||
    normalized.includes("publish") ||
    normalized.includes("export") ||
    normalized.includes("send") ||
    normalized.includes("save")
  ) {
    return "deliver";
  }

  return "analyze";
}

export function collectStreamingExecutions(parts: MessagePartLike[]): StreamingToolExecution[] {
  const executions = new Map<string, StreamingToolExecution>();
  const fallbackCounts = new Map<string, number>();
  const openExecutionIds = new Map<string, string>();

  for (const part of parts) {
    const type = typeof part.type === "string" ? part.type : "";
    if (!type.startsWith("tool-")) continue;

    const toolName = toToolName(part);
    const phaseId = inferPhaseId(toolName);

    if (type === "tool-call" || /^tool-call-/.test(type)) {
      const fallbackCount = (fallbackCounts.get(toolName) ?? 0) + 1;
      fallbackCounts.set(toolName, fallbackCount);
      const id = part.toolCallId ?? `${toolName}:${fallbackCount}`;
      executions.set(id, {
        id,
        toolName,
        phaseId,
        status: "running",
      });
      openExecutionIds.set(toolName, id);
      continue;
    }

    const nextFallbackCount = (fallbackCounts.get(toolName) ?? 0) + 1;
    const derivedId = `${toolName}:${nextFallbackCount}`;
    const id = part.toolCallId ?? openExecutionIds.get(toolName) ?? derivedId;
    const existing = executions.get(id);
    if (!part.toolCallId && !openExecutionIds.get(toolName) && !existing) {
      fallbackCounts.set(toolName, nextFallbackCount);
    }
    executions.set(id, {
      id,
      toolName,
      phaseId,
      status: type === "tool-error" || /^tool-error-/.test(type) ? "error" : "complete",
    });
    openExecutionIds.delete(toolName);

    if (!existing && (type === "tool-result" || /^tool-result-/.test(type))) {
      executions.set(id, {
        id,
        toolName,
        phaseId,
        status: "complete",
      });
    }
  }

  return [...executions.values()];
}

export function summarizeStreamingPhases(args: {
  parts: MessagePartLike[];
  messageText?: string;
  isStreaming: boolean;
  tokensPerSecond?: number;
  runtimeSeconds?: number;
}): StreamingStatusSummary | null {
  const executions = collectStreamingExecutions(args.parts);
  const hasReasoning = args.parts.some((part) => part.type === "reasoning" && typeof part.text === "string" && part.text.trim().length > 0);
  const hasVisibleText = typeof args.messageText === "string" && args.messageText.trim().length > 0;

  if (!args.isStreaming && executions.length === 0 && !hasReasoning) {
    return null;
  }

  const phaseBuckets: Record<StreamingPhaseId, { started: number; completed: number; running: number }> = {
    route: { started: 0, completed: 0, running: 0 },
    gather: { started: 0, completed: 0, running: 0 },
    analyze: { started: 0, completed: 0, running: 0 },
    deliver: { started: 0, completed: 0, running: 0 },
  };

  for (const execution of executions) {
    const bucket = phaseBuckets[execution.phaseId];
    bucket.started += 1;
    if (execution.status === "running") bucket.running += 1;
    if (execution.status === "complete" || execution.status === "error") bucket.completed += 1;
  }

  if (hasReasoning) {
    phaseBuckets.analyze.started += 1;
    phaseBuckets.analyze.completed += args.isStreaming ? 0 : 1;
    phaseBuckets.analyze.running += args.isStreaming ? 1 : 0;
  }

  if (hasVisibleText) {
    phaseBuckets.deliver.started += 1;
    phaseBuckets.deliver.completed += args.isStreaming ? 0 : 1;
    phaseBuckets.deliver.running += args.isStreaming ? 1 : 0;
  }

  let activePhaseId: StreamingPhaseId | null = null;
  for (const phaseId of ["deliver", "analyze", "gather", "route"] as const) {
    if (phaseBuckets[phaseId].running > 0) {
      activePhaseId = phaseId;
      break;
    }
  }

  if (!activePhaseId && args.isStreaming) {
    for (const phaseId of ["analyze", "gather", "route", "deliver"] as const) {
      if (phaseBuckets[phaseId].started > 0) {
        activePhaseId = phaseId;
        break;
      }
    }
  }

  if (!activePhaseId && hasVisibleText) activePhaseId = "deliver";

  const phases = (["route", "gather", "analyze", "deliver"] as const).map((phaseId) => {
    const bucket = phaseBuckets[phaseId];
    const status: StreamingPhaseStatus =
      activePhaseId === phaseId
        ? "active"
        : bucket.completed > 0 || (activePhaseId !== null && ["route", "gather", "analyze", "deliver"].indexOf(phaseId) < ["route", "gather", "analyze", "deliver"].indexOf(activePhaseId))
          ? "complete"
          : "pending";

    let detail = "Pending";
    if (bucket.completed > 0 && bucket.running === 0) {
      detail = `${bucket.completed} complete`;
    } else if (bucket.running > 0) {
      detail = `${bucket.running} active`;
    } else if (bucket.started > 0) {
      detail = `${bucket.started} queued`;
    }

    return {
      id: phaseId,
      label: PHASE_LABELS[phaseId],
      detail,
      status,
    };
  });

  const completedToolSteps = executions.filter((execution) => execution.status !== "running").length;
  const totalToolSteps = executions.length;
  const sourceToolSteps = executions.filter((execution) => execution.phaseId === "gather").length;

  const headlineMap: Record<StreamingPhaseId, string> = {
    route: "Routing the ask",
    gather: "Gathering evidence",
    analyze: "Cross-checking and reasoning",
    deliver: args.isStreaming ? "Drafting the answer" : "Answer ready",
  };

  const runtimeLabel =
    typeof args.runtimeSeconds === "number" && Number.isFinite(args.runtimeSeconds)
      ? `${args.runtimeSeconds.toFixed(1)}s runtime`
      : null;
  const throughputLabel =
    typeof args.tokensPerSecond === "number" && args.tokensPerSecond > 0
      ? `${args.tokensPerSecond} tok/s`
      : null;
  const metricParts = [
    totalToolSteps > 0 ? `${completedToolSteps}/${totalToolSteps} tool steps` : null,
    sourceToolSteps > 0 ? `${sourceToolSteps} source passes` : null,
    throughputLabel,
    runtimeLabel,
  ].filter(Boolean);

  return {
    headline: activePhaseId ? headlineMap[activePhaseId] : "Processing the request",
    detail: metricParts.join(" · "),
    phases,
    activePhaseId,
    totalToolSteps,
    completedToolSteps,
    sourceToolSteps,
  };
}
