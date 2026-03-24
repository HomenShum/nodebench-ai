/**
 * Founder Platform Hybrid Persistence Layer — Phase 7
 *
 * Unified API that abstracts localStorage (guest) vs Convex (authenticated).
 * When the user is authenticated, reads come from Convex reactive queries and
 * writes go through Convex mutations. When guest, everything falls back to
 * localStorage (existing behavior preserved).
 *
 * Views adopt this incrementally — no existing view modifications required.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

// ---------------------------------------------------------------------------
// localStorage key constants — mirrored from views for guest fallback
// ---------------------------------------------------------------------------

const LS_COMPANY = "nodebench-company";
const LS_INTERVENTIONS = "nodebench-interventions";
const LS_STREAK = "nodebench-streak";
const LS_USER_ACTIONS = "nodebench-user-actions";
const LS_VISIT_COUNT = "nodebench-visit-count";
const LS_AGENT_STATUS = "nodebench-agent-status";
const LS_ARTIFACT_PACKETS = "nodebench-founder-artifact-packets";
const LS_ACTIVE_PACKET = "nodebench-founder-active-artifact-packet-id";
const LS_MEMOS = "nodebench-memos";
const LS_INTAKE_NOTES = "nodebench-intake-notes";
const LS_INTAKE_SOURCES = "nodebench-intake-sources";
const LS_INTAKE_ENTITIES = "nodebench-intake-entities";
const LS_NEARBY_ENTITIES = "nodebench-nearby-entities";
const LS_WATCHED_ENTITIES = "nodebench-watched-entities";
const LS_COMMAND_MESSAGES = "nodebench-command-messages";
const LS_COMMAND_APPROVALS = "nodebench-command-approvals";

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
// Safe localStorage helpers
// ---------------------------------------------------------------------------

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable — silently degrade
  }
}

function lsGetString(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Hook: useFounderPersistence
// ---------------------------------------------------------------------------

export function useFounderPersistence() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const lastSyncRef = useRef<number>(0);

  // -------------------------------------------------------------------------
  // Convex queries (skip when not authenticated)
  // -------------------------------------------------------------------------

  const skipArgs = "skip" as const;

  const myWorkspace = useQuery(
    api.domains.founder.operations.getMyWorkspace,
    isAuthenticated ? {} : skipArgs,
  );

  const myCompany = useQuery(
    api.domains.founder.operations.getMyCompany,
    isAuthenticated ? {} : skipArgs,
  );

  const companyId = myCompany?._id;
  const workspaceId = myWorkspace?._id;

  const cvxInitiatives = useQuery(
    api.domains.founder.operations.getInitiativesByCompany,
    isAuthenticated && companyId ? { companyId } : skipArgs,
  );

  const cvxSignals = useQuery(
    api.domains.founder.operations.getSignalsByCompany,
    isAuthenticated && companyId ? { companyId } : skipArgs,
  );

  const cvxInterventions = useQuery(
    api.domains.founder.operations.getInterventionsByCompany,
    isAuthenticated && companyId ? { companyId } : skipArgs,
  );

  const cvxPendingActions = useQuery(
    api.domains.founder.operations.getPendingActionsByCompany,
    isAuthenticated && companyId ? { companyId } : skipArgs,
  );

  const cvxLatestSnapshot = useQuery(
    api.domains.founder.operations.getLatestSnapshot,
    isAuthenticated && companyId ? { companyId } : skipArgs,
  );

  const cvxTimeline = useQuery(
    api.domains.founder.operations.getTimelineEvents,
    isAuthenticated && companyId ? { companyId } : skipArgs,
  );

  const cvxAgents = useQuery(
    api.domains.founder.operations.getAgentsByWorkspace,
    isAuthenticated && workspaceId ? { workspaceId } : skipArgs,
  );

  const cvxDashboard = useQuery(
    api.domains.founder.operations.getDashboardSummary,
    isAuthenticated && companyId ? { companyId } : skipArgs,
  );

  // -------------------------------------------------------------------------
  // Convex mutations
  // -------------------------------------------------------------------------

  const cvxCreateWorkspace = useMutation(api.domains.founder.operations.createWorkspace);
  const cvxCreateCompany = useMutation(api.domains.founder.operations.createCompany);
  const cvxUpdateCompany = useMutation(api.domains.founder.operations.updateCompany);
  const cvxCreateInitiative = useMutation(api.domains.founder.operations.createInitiative);
  const cvxIngestSignal = useMutation(api.domains.founder.operations.ingestSignal);
  const cvxCreateIntervention = useMutation(api.domains.founder.operations.createIntervention);
  const cvxGenerateSnapshot = useMutation(api.domains.founder.operations.generateSnapshot);
  const cvxCreateTimelineEvent = useMutation(api.domains.founder.operations.createTimelineEvent);
  const cvxCreatePendingAction = useMutation(api.domains.founder.operations.createPendingAction);
  const cvxUpdateAgentStatus = useMutation(api.domains.founder.operations.updateAgentStatus);

  // -------------------------------------------------------------------------
  // Mutation wrapper — tracks syncing state and errors
  // -------------------------------------------------------------------------

  const runMutation = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      setIsMutating(true);
      setSyncError(null);
      try {
        const result = await fn();
        lastSyncRef.current = Date.now();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sync failed";
        setSyncError(message);
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Company operations
  // -------------------------------------------------------------------------

  const saveCompany = useCallback(
    async (data: LocalCompanyData) => {
      // Always write to localStorage as canonical local cache
      lsSet(LS_COMPANY, data);

      if (!isAuthenticated) return;

      if (companyId) {
        // Update existing company
        await runMutation(() =>
          cvxUpdateCompany({
            companyId,
            name: data.name,
            canonicalMission: data.canonicalMission,
            wedge: data.wedge,
            companyState: data.companyState,
            foundingMode: data.foundingMode,
            identityConfidence: data.identityConfidence,
          }),
        );
      } else if (workspaceId) {
        // Create new company in existing workspace
        await runMutation(() =>
          cvxCreateCompany({
            workspaceId,
            name: data.name,
            canonicalMission: data.canonicalMission,
            wedge: data.wedge,
            foundingMode: data.foundingMode,
            companyState: data.companyState,
          }),
        );
      } else {
        // Bootstrap: create workspace then company
        await runMutation(async () => {
          const wsId = await cvxCreateWorkspace({ name: `${data.name} Workspace` });
          return cvxCreateCompany({
            workspaceId: wsId,
            name: data.name,
            canonicalMission: data.canonicalMission,
            wedge: data.wedge,
            foundingMode: data.foundingMode,
            companyState: data.companyState,
          });
        });
      }
    },
    [isAuthenticated, companyId, workspaceId, runMutation, cvxUpdateCompany, cvxCreateCompany, cvxCreateWorkspace],
  );

  const loadCompany = useCallback((): LocalCompanyData | null => {
    if (isAuthenticated && myCompany) {
      return {
        name: myCompany.name,
        canonicalMission: myCompany.canonicalMission,
        wedge: myCompany.wedge,
        foundingMode: myCompany.foundingMode as LocalCompanyData["foundingMode"],
        companyState: myCompany.companyState as LocalCompanyData["companyState"],
        identityConfidence: myCompany.identityConfidence,
      };
    }
    return lsGet<LocalCompanyData | null>(LS_COMPANY, null);
  }, [isAuthenticated, myCompany]);

  // -------------------------------------------------------------------------
  // Initiatives
  // -------------------------------------------------------------------------

  const saveInitiative = useCallback(
    async (data: LocalInitiative) => {
      if (!isAuthenticated || !companyId) {
        // Guest: append to localStorage array
        const existing = lsGet<LocalInitiative[]>("nodebench-initiatives", []);
        const filtered = existing.filter((i) => i.id !== data.id);
        lsSet("nodebench-initiatives", [...filtered, data]);
        return;
      }
      await runMutation(() =>
        cvxCreateInitiative({
          companyId,
          title: data.title,
          objective: data.objective,
          ownerType: (data.ownerType as "founder" | "agent" | "shared") ?? "founder",
        }),
      );
    },
    [isAuthenticated, companyId, runMutation, cvxCreateInitiative],
  );

  const loadInitiatives = useCallback((): LocalInitiative[] => {
    if (isAuthenticated && cvxInitiatives) {
      return cvxInitiatives.map((i) => ({
        id: i._id,
        title: i.title,
        objective: i.objective,
        status: i.status,
        risk: i.riskLevel,
        ownerType: i.ownerType,
      }));
    }
    return lsGet<LocalInitiative[]>("nodebench-initiatives", []);
  }, [isAuthenticated, cvxInitiatives]);

  // -------------------------------------------------------------------------
  // Signals
  // -------------------------------------------------------------------------

  const saveSignal = useCallback(
    async (data: LocalSignal) => {
      if (!isAuthenticated || !companyId) {
        const existing = lsGet<LocalSignal[]>("nodebench-signals", []);
        const filtered = existing.filter((s) => s.id !== data.id);
        lsSet("nodebench-signals", [...filtered, data]);
        return;
      }
      await runMutation(() =>
        cvxIngestSignal({
          companyId,
          sourceType: data.sourceType as "founder_note" | "agent_output" | "market" | "customer" | "product" | "execution" | "memo" | "other",
          title: data.title,
          content: data.content,
          importanceScore: data.importanceScore,
        }),
      );
    },
    [isAuthenticated, companyId, runMutation, cvxIngestSignal],
  );

  const loadSignals = useCallback((): LocalSignal[] => {
    if (isAuthenticated && cvxSignals) {
      return cvxSignals.map((s) => ({
        id: s._id,
        sourceType: s.sourceType,
        title: s.title,
        content: s.content,
        importanceScore: s.importanceScore,
      }));
    }
    return lsGet<LocalSignal[]>("nodebench-signals", []);
  }, [isAuthenticated, cvxSignals]);

  // -------------------------------------------------------------------------
  // Interventions
  // -------------------------------------------------------------------------

  const saveIntervention = useCallback(
    async (data: LocalIntervention) => {
      if (!isAuthenticated || !companyId) {
        const records = lsGet<Record<string, LocalIntervention>>(LS_INTERVENTIONS, {});
        records[data.id] = data;
        lsSet(LS_INTERVENTIONS, records);
        return;
      }
      await runMutation(() =>
        cvxCreateIntervention({
          companyId,
          title: data.title,
          description: data.description,
          priorityScore: data.priorityScore,
          confidence: data.confidence,
          expectedImpact: data.expectedImpact,
        }),
      );
    },
    [isAuthenticated, companyId, runMutation, cvxCreateIntervention],
  );

  const loadInterventions = useCallback((): LocalIntervention[] => {
    if (isAuthenticated && cvxInterventions) {
      return cvxInterventions.map((i) => ({
        id: i._id,
        title: i.title,
        description: i.description,
        priorityScore: i.priorityScore,
        confidence: i.confidence,
        expectedImpact: i.expectedImpact,
        status: i.status,
      }));
    }
    // Guest: interventions stored as Record<id, data>
    const records = lsGet<Record<string, LocalIntervention>>(LS_INTERVENTIONS, {});
    return Object.values(records);
  }, [isAuthenticated, cvxInterventions]);

  // -------------------------------------------------------------------------
  // Artifact Packets (localStorage-only entity — no Convex table yet)
  // -------------------------------------------------------------------------

  const savePacket = useCallback(
    (packet: unknown) => {
      // Packets remain localStorage-only for now (complex nested structure).
      // When Convex table is added, this will route to it when authenticated.
      const packets = lsGet<unknown[]>(LS_ARTIFACT_PACKETS, []);
      const pkt = packet as { packetId?: string; provenance?: { generatedAt?: string } };
      const next = [
        packet,
        ...packets.filter((p) => (p as { packetId?: string }).packetId !== pkt.packetId),
      ].slice(0, 12);
      lsSet(LS_ARTIFACT_PACKETS, next);
      if (pkt.packetId) {
        lsSet(LS_ACTIVE_PACKET, pkt.packetId);
      }
    },
    [],
  );

  const loadPackets = useCallback((): unknown[] => {
    return lsGet<unknown[]>(LS_ARTIFACT_PACKETS, []);
  }, []);

  const loadActivePacket = useCallback((): unknown | null => {
    const packets = lsGet<Array<{ packetId?: string }>>(LS_ARTIFACT_PACKETS, []);
    if (packets.length === 0) return null;
    const activeId = lsGetString(LS_ACTIVE_PACKET, "");
    if (!activeId) return packets[0] ?? null;
    return packets.find((p) => p.packetId === activeId) ?? packets[0] ?? null;
  }, []);

  // -------------------------------------------------------------------------
  // Agent status
  // -------------------------------------------------------------------------

  const saveAgentStatus = useCallback(
    async (data: LocalAgentStatus) => {
      if (!isAuthenticated) {
        const statuses = lsGet<Record<string, LocalAgentStatus>>(LS_AGENT_STATUS, {});
        statuses[data.id] = data;
        lsSet(LS_AGENT_STATUS, statuses);
        return;
      }
      // When authenticated, update via Convex if we have a valid agent ID
      // Agent IDs from Convex are Id<"founderAgents"> strings
      if (data.id.startsWith("k") || data.id.includes("|")) {
        // Looks like a Convex ID — attempt mutation
        await runMutation(() =>
          cvxUpdateAgentStatus({
            agentId: data.id as never,
            status: (data.status as "healthy" | "blocked" | "waiting" | "drifting" | "ambiguous") ?? "healthy",
            currentGoal: data.currentGoal,
            lastSummary: data.lastSummary,
          }),
        );
      } else {
        // Local-format ID — persist to localStorage
        const statuses = lsGet<Record<string, LocalAgentStatus>>(LS_AGENT_STATUS, {});
        statuses[data.id] = data;
        lsSet(LS_AGENT_STATUS, statuses);
      }
    },
    [isAuthenticated, runMutation, cvxUpdateAgentStatus],
  );

  const loadAgentStatuses = useCallback((): Record<string, LocalAgentStatus> => {
    if (isAuthenticated && cvxAgents) {
      const result: Record<string, LocalAgentStatus> = {};
      for (const agent of cvxAgents) {
        result[agent._id] = {
          id: agent._id,
          name: agent.name,
          status: agent.status,
          currentGoal: agent.currentGoal,
          lastSummary: agent.lastSummary,
        };
      }
      return result;
    }
    return lsGet<Record<string, LocalAgentStatus>>(LS_AGENT_STATUS, {});
  }, [isAuthenticated, cvxAgents]);

  // -------------------------------------------------------------------------
  // Timeline events
  // -------------------------------------------------------------------------

  const saveTimelineEvent = useCallback(
    async (data: LocalTimelineEvent) => {
      if (!isAuthenticated || !workspaceId) {
        const events = lsGet<LocalTimelineEvent[]>("nodebench-timeline", []);
        lsSet("nodebench-timeline", [data, ...events].slice(0, 100));
        return;
      }
      await runMutation(() =>
        cvxCreateTimelineEvent({
          workspaceId,
          entityType: data.entityType,
          entityId: data.entityId,
          eventType: data.eventType,
          summary: data.summary,
          companyId: companyId ?? undefined,
        }),
      );
    },
    [isAuthenticated, workspaceId, companyId, runMutation, cvxCreateTimelineEvent],
  );

  const loadTimeline = useCallback((): LocalTimelineEvent[] => {
    if (isAuthenticated && cvxTimeline) {
      return cvxTimeline.map((e) => ({
        id: e._id,
        entityType: e.entityType,
        entityId: e.entityId,
        eventType: e.eventType,
        summary: e.summary,
        createdAt: e.createdAt,
      }));
    }
    return lsGet<LocalTimelineEvent[]>("nodebench-timeline", []);
  }, [isAuthenticated, cvxTimeline]);

  // -------------------------------------------------------------------------
  // Context snapshots
  // -------------------------------------------------------------------------

  const saveSnapshot = useCallback(
    async (data: LocalSnapshot) => {
      if (!isAuthenticated || !companyId) {
        const snaps = lsGet<LocalSnapshot[]>("nodebench-snapshots", []);
        lsSet("nodebench-snapshots", [data, ...snaps].slice(0, 20));
        return;
      }
      await runMutation(() =>
        cvxGenerateSnapshot({
          companyId,
          snapshotType: data.snapshotType as "daily" | "weekly" | "event_triggered",
          summary: data.summary,
          topPriorities: data.topPriorities,
          topRisks: data.topRisks,
          openQuestions: data.openQuestions,
        }),
      );
    },
    [isAuthenticated, companyId, runMutation, cvxGenerateSnapshot],
  );

  const loadSnapshots = useCallback((): LocalSnapshot[] => {
    if (isAuthenticated && cvxLatestSnapshot) {
      return [
        {
          id: cvxLatestSnapshot._id,
          snapshotType: cvxLatestSnapshot.snapshotType,
          summary: cvxLatestSnapshot.summary,
          topPriorities: cvxLatestSnapshot.topPriorities,
          topRisks: cvxLatestSnapshot.topRisks,
          openQuestions: cvxLatestSnapshot.openQuestions,
          createdAt: cvxLatestSnapshot.createdAt,
        },
      ];
    }
    return lsGet<LocalSnapshot[]>("nodebench-snapshots", []);
  }, [isAuthenticated, cvxLatestSnapshot]);

  // -------------------------------------------------------------------------
  // Pending actions
  // -------------------------------------------------------------------------

  const savePendingAction = useCallback(
    async (data: LocalPendingAction) => {
      if (!isAuthenticated || !companyId) {
        const actions = lsGet<LocalPendingAction[]>("nodebench-pending-actions", []);
        const filtered = actions.filter((a) => a.id !== data.id);
        lsSet("nodebench-pending-actions", [...filtered, data]);
        return;
      }
      await runMutation(() =>
        cvxCreatePendingAction({
          companyId,
          title: data.title,
          description: data.description,
          priorityScore: data.priorityScore,
          ownerType: (data.ownerType as "founder" | "agent") ?? "founder",
        }),
      );
    },
    [isAuthenticated, companyId, runMutation, cvxCreatePendingAction],
  );

  const loadPendingActions = useCallback((): LocalPendingAction[] => {
    if (isAuthenticated && cvxPendingActions) {
      return cvxPendingActions.map((a) => ({
        id: a._id,
        title: a.title,
        description: a.description,
        priorityScore: a.priorityScore,
        ownerType: a.ownerType,
        status: a.status,
      }));
    }
    return lsGet<LocalPendingAction[]>("nodebench-pending-actions", []);
  }, [isAuthenticated, cvxPendingActions]);

  // -------------------------------------------------------------------------
  // Dashboard summary (read-only aggregation)
  // -------------------------------------------------------------------------

  const loadDashboardSummary = useCallback(() => {
    if (isAuthenticated && cvxDashboard) {
      return cvxDashboard;
    }
    return null;
  }, [isAuthenticated, cvxDashboard]);

  // -------------------------------------------------------------------------
  // Sync status
  // -------------------------------------------------------------------------

  const syncStatus = useMemo((): SyncStatus => {
    if (!isAuthenticated) return "local_only";
    if (syncError) return "error";
    if (isMutating || authLoading) return "syncing";
    return "synced";
  }, [isAuthenticated, syncError, isMutating, authLoading]);

  const lastSyncAt = lastSyncRef.current || null;

  // -------------------------------------------------------------------------
  // Convenience: workspace and company IDs for advanced usage
  // -------------------------------------------------------------------------

  return useMemo(
    () => ({
      // Company
      saveCompany,
      loadCompany,
      // Initiatives
      saveInitiative,
      loadInitiatives,
      // Signals
      saveSignal,
      loadSignals,
      // Interventions
      saveIntervention,
      loadInterventions,
      // Packets (localStorage-only for now)
      savePacket,
      loadPackets,
      loadActivePacket,
      // Agent status
      saveAgentStatus,
      loadAgentStatuses,
      // Timeline events
      saveTimelineEvent,
      loadTimeline,
      // Context snapshots
      saveSnapshot,
      loadSnapshots,
      // Pending actions
      savePendingAction,
      loadPendingActions,
      // Dashboard summary (Convex-only aggregation, null for guests)
      loadDashboardSummary,
      // Sync metadata
      isAuthenticated,
      syncStatus,
      syncError,
      lastSyncAt,
      // Raw IDs for advanced wiring
      workspaceId: workspaceId ?? null,
      companyId: companyId ?? null,
    }),
    [
      saveCompany, loadCompany,
      saveInitiative, loadInitiatives,
      saveSignal, loadSignals,
      saveIntervention, loadInterventions,
      savePacket, loadPackets, loadActivePacket,
      saveAgentStatus, loadAgentStatuses,
      saveTimelineEvent, loadTimeline,
      saveSnapshot, loadSnapshots,
      savePendingAction, loadPendingActions,
      loadDashboardSummary,
      isAuthenticated, syncStatus, syncError, lastSyncAt,
      workspaceId, companyId,
    ],
  );
}

// ---------------------------------------------------------------------------
// SyncStatusBadge — visual indicator for persistence state
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
