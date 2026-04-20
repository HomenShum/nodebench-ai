export type NudgeLike = {
  _id?: unknown;
  type?: string;
  title?: string;
  summary?: string;
  actionLabel?: string;
  actionTargetSurface?: string;
  actionTargetId?: string;
  linkedReportId?: unknown;
  linkedEntitySlug?: string | null;
  linkedChatSessionId?: unknown;
  linkedReportTitle?: string | null;
  linkedReportLens?: string | null;
  linkedReportRoutingMode?: "executive" | "advisor";
  priority?: string;
  dueAt?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type GroupedNudgeLike<T extends NudgeLike> = T & {
  groupedCount: number;
  groupedTypes: string[];
  groupedUpdatedAt?: number;
};

const TYPE_WEIGHT: Record<string, number> = {
  reply_draft_ready: 80,
  follow_up_due: 75,
  report_changed: 65,
  refresh_recommended: 60,
  new_source_found: 50,
  saved_watch_item_changed: 45,
  connector_message_detected: 35,
  connector_follow_up: 35,
  cron_summary: 20,
};

const PRIORITY_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const SURFACE_WEIGHT: Record<string, number> = {
  chat: 4,
  reports: 3,
};

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeId(value: unknown): string | undefined {
  if (value == null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function typeWeight(type?: string) {
  return TYPE_WEIGHT[normalizeString(type) ?? ""] ?? 10;
}

function priorityWeight(priority?: string) {
  return PRIORITY_WEIGHT[normalizeString(priority) ?? ""] ?? 0;
}

function surfaceWeight(surface?: string) {
  return SURFACE_WEIGHT[normalizeString(surface) ?? ""] ?? 0;
}

function uniqueOrdered(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    ordered.push(value);
  }
  return ordered;
}

function compareNudges(left: NudgeLike, right: NudgeLike) {
  return (
    typeWeight(right.type) - typeWeight(left.type) ||
    priorityWeight(right.priority) - priorityWeight(left.priority) ||
    surfaceWeight(right.actionTargetSurface) - surfaceWeight(left.actionTargetSurface) ||
    (right.updatedAt ?? 0) - (left.updatedAt ?? 0) ||
    (right.createdAt ?? 0) - (left.createdAt ?? 0)
  );
}

export function getNudgeGroupKey(nudge: NudgeLike): string {
  const linkedEntitySlug = normalizeString(nudge.linkedEntitySlug);
  if (linkedEntitySlug) {
    return `entity:${linkedEntitySlug}:${normalizeString(nudge.actionTargetSurface) ?? "unknown"}`;
  }

  const surface = normalizeString(nudge.actionTargetSurface);
  const targetId = normalizeString(nudge.actionTargetId);
  if (surface && targetId) {
    return `target:${surface}:${targetId}`;
  }

  const linkedReportId = normalizeId(nudge.linkedReportId);
  if (linkedReportId) {
    return `report:${linkedReportId}`;
  }

  const linkedChatSessionId = normalizeId(nudge.linkedChatSessionId);
  if (linkedChatSessionId) {
    return `chat:${linkedChatSessionId}`;
  }

  return `fallback:${normalizeString(nudge.type) ?? "nudge"}:${normalizeString(nudge.title) ?? "untitled"}`;
}

export function collapseNudgesIntoGroups<T extends NudgeLike>(nudges: T[]): Array<GroupedNudgeLike<T>> {
  const grouped = new Map<string, T[]>();

  for (const nudge of nudges) {
    const key = getNudgeGroupKey(nudge);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(nudge);
      continue;
    }
    grouped.set(key, [nudge]);
  }

  return Array.from(grouped.values())
    .map((group) => {
      const ordered = [...group].sort(compareNudges);
      const primary = ordered[0]!;
      const groupedTypes = uniqueOrdered(
        ordered
          .map((nudge) => normalizeString(nudge.type))
          .sort((left, right) => typeWeight(right) - typeWeight(left)),
      );

      return {
        ...primary,
        groupedCount: group.length,
        groupedTypes,
        groupedUpdatedAt: Math.max(...group.map((nudge) => nudge.updatedAt ?? 0)),
      };
    })
    .sort(
      (left, right) =>
        (right.groupedUpdatedAt ?? 0) - (left.groupedUpdatedAt ?? 0) ||
        compareNudges(left, right),
    );
}
