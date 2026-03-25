/**
 * Founder Platform Persistence — Types, constants, and presentational components.
 *
 * This file is intentionally free of Convex imports so that any module can
 * import types or the SyncStatusBadge without pulling in the full Convex
 * dependency chain (which crashes when no ConvexProvider is mounted).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncStatus = "synced" | "syncing" | "local_only" | "error";

/** Company data as stored in localStorage (guest mode). */
export interface LocalCompanyData {
  name: string;
  canonicalMission: string;
  wedge: string;
  foundingMode: "start_new" | "continue_existing" | "merged";
  companyState?: "idea" | "forming" | "operating" | "pivoting";
  identityConfidence?: number;
  [key: string]: unknown;
}

export interface LocalInitiative {
  id: string;
  title: string;
  objective: string;
  status: string;
  risk: string;
  ownerType?: string;
  [key: string]: unknown;
}

export interface LocalSignal {
  id: string;
  sourceType: string;
  title: string;
  content: string;
  importanceScore?: number;
  [key: string]: unknown;
}

export interface LocalIntervention {
  id: string;
  title: string;
  description: string;
  priorityScore: number;
  confidence: number;
  expectedImpact: string;
  status?: string;
  linkedInitiative?: string;
  linkedInitiativeId?: string;
  [key: string]: unknown;
}

export interface LocalAgentStatus {
  id: string;
  name: string;
  status: string;
  currentGoal?: string;
  lastSummary?: string;
  [key: string]: unknown;
}

export interface LocalTimelineEvent {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  summary: string;
  createdAt?: string | number;
  [key: string]: unknown;
}

export interface LocalSnapshot {
  id: string;
  snapshotType: string;
  summary: string;
  topPriorities: string[];
  topRisks: string[];
  openQuestions: string[];
  createdAt?: string | number;
  [key: string]: unknown;
}

export interface LocalPendingAction {
  id: string;
  title: string;
  description: string;
  priorityScore: number;
  ownerType?: string;
  status?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// localStorage key constants
// ---------------------------------------------------------------------------

export const LS_COMPANY = "nodebench-company";
export const LS_INTERVENTIONS = "nodebench-interventions";
export const LS_STREAK = "nodebench-streak";
export const LS_USER_ACTIONS = "nodebench-user-actions";
export const LS_VISIT_COUNT = "nodebench-visit-count";
export const LS_AGENT_STATUS = "nodebench-agent-status";
export const LS_ARTIFACT_PACKETS = "nodebench-founder-artifact-packets";
export const LS_ACTIVE_PACKET = "nodebench-founder-active-artifact-packet-id";
export const LS_MEMOS = "nodebench-memos";
export const LS_INTAKE_NOTES = "nodebench-intake-notes";
export const LS_INTAKE_SOURCES = "nodebench-intake-sources";
export const LS_INTAKE_ENTITIES = "nodebench-intake-entities";
export const LS_NEARBY_ENTITIES = "nodebench-nearby-entities";
export const LS_WATCHED_ENTITIES = "nodebench-watched-entities";
export const LS_COMMAND_MESSAGES = "nodebench-command-messages";
export const LS_COMMAND_APPROVALS = "nodebench-command-approvals";

// ---------------------------------------------------------------------------
// Safe localStorage helpers
// ---------------------------------------------------------------------------

export function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable — silently degrade
  }
}

export function lsGetString(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// SyncStatusBadge — pure presentational component, no hooks
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<SyncStatus, { label: string; dot: string; textClass: string }> = {
  synced: {
    label: "Synced",
    dot: "bg-emerald-400",
    textClass: "text-emerald-400/80",
  },
  syncing: {
    label: "Syncing...",
    dot: "bg-amber-400 animate-pulse",
    textClass: "text-amber-400/80",
  },
  local_only: {
    label: "Local only",
    dot: "bg-white/40",
    textClass: "text-white/40",
  },
  error: {
    label: "Sync error",
    dot: "bg-red-400",
    textClass: "text-red-400/80",
  },
};

export function SyncStatusBadge({
  status,
  className = "",
}: {
  status: SyncStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/[0.20] bg-white/[0.12] px-2.5 py-1 ${className}`}
      role="status"
      aria-label={`Sync status: ${config.label}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`}
        aria-hidden="true"
      />
      <span className={`text-[11px] font-medium tracking-wide ${config.textClass}`}>
        {config.label}
      </span>
    </div>
  );
}
