export type DurableObjectKind =
  | "view"
  | "screen"
  | "action"
  | "tool"
  | "workflow"
  | "run"
  | "trace"
  | "artifact"
  | "outcome"
  | "approval"
  | "memory"
  | "device"
  | "account"
  | "peer"
  | "context_packet"
  | "task"
  | "message";

export type SyncScope =
  | "metadata_only"
  | "receipts_and_traces"
  | "memory_and_artifacts"
  | "full_account_sync";

export type SyncOperationType =
  | "upsert_object"
  | "link_object"
  | "record_receipt"
  | "record_artifact"
  | "record_outcome"
  | "record_memory"
  | "approval_event"
  | "register_peer"
  | "publish_context"
  | "ack_context"
  | "invalidate_context"
  | "send_peer_message"
  | "task_handoff";

export type SharedContextProduct = "nodebench" | "ta_studio";

export type SharedContextSurface =
  | "web"
  | "browser"
  | "runner"
  | "evaluator"
  | "packet_engine"
  | "qa_runner"
  | "monitor"
  | "local_runtime"
  | "api";

export type SharedContextRole =
  | "researcher"
  | "compiler"
  | "judge"
  | "explorer"
  | "replay"
  | "environment_builder"
  | "runner"
  | "observer"
  | "monitor"
  | "router";

export type SharedContextPacketType =
  | "entity_packet"
  | "workflow_packet"
  | "trace_packet"
  | "judge_packet"
  | "environment_packet"
  | "failure_packet"
  | "state_snapshot_packet"
  | "verdict_packet"
  | "scenario_packet"
  | "change_packet";

export type SharedContextMessageClass =
  | "request"
  | "response"
  | "context_offer"
  | "context_pull"
  | "task_handoff"
  | "status_update"
  | "verdict"
  | "escalation"
  | "invalidation";

export type SharedContextTaskStatus =
  | "proposed"
  | "accepted"
  | "rejected"
  | "completed"
  | "escalated";

export interface SharedContextPeerSummary {
  currentTask?: string;
  focusEntity?: string;
  focusWorkflow?: string;
  currentState?: string;
  confidence?: number;
  lastUpdate?: string;
  availableArtifacts?: string[];
  permissionScope?: string[];
}

export interface SharedContextPeer {
  peerId: string;
  product: SharedContextProduct;
  tenantId?: string | null;
  workspaceId?: string | null;
  surface: SharedContextSurface;
  role: SharedContextRole;
  capabilities: string[];
  contextScopes: string[];
  status: "active" | "idle" | "stale";
  summary: SharedContextPeerSummary;
  metadata?: Record<string, unknown>;
  lastHeartbeatAt: string;
}

export interface SharedContextPacket {
  contextId: string;
  contextType: SharedContextPacketType;
  producerPeerId: string;
  tenantId?: string | null;
  workspaceId?: string | null;
  scope: string[];
  subject: string;
  summary: string;
  claims: string[];
  evidenceRefs: string[];
  stateSnapshot?: Record<string, unknown>;
  timeWindow?: {
    from?: string;
    to?: string;
  };
  freshness?: {
    status?: "fresh" | "warming" | "stale";
    expiresAt?: string;
    trustTier?: "internal" | "verified" | "directional";
  };
  permissions?: {
    visibility?: "internal" | "workspace" | "tenant";
    allowedRoles?: string[];
  };
  confidence?: number;
  lineage?: {
    parentContextIds?: string[];
    sourceRunId?: string;
    sourceTraceId?: string;
    supersedes?: string;
  };
  invalidates?: string[];
  nextActions?: string[];
  version: number;
  status: "active" | "superseded" | "invalidated";
  metadata?: Record<string, unknown>;
}

export interface SharedContextTask {
  taskId: string;
  taskType: string;
  proposerPeerId: string;
  assigneePeerId: string;
  status: SharedContextTaskStatus;
  taskSpec: Record<string, unknown>;
  inputContextIds: string[];
  outputContextId?: string | null;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueueOperation {
  id: string;
  objectId: string | null;
  objectKind: DurableObjectKind | string;
  opType: SyncOperationType | string;
  payload: Record<string, unknown>;
  payloadHash: string;
  createdAt: string;
}

export interface SyncBridgePairDevicePayload {
  pairingCode?: string;
  deviceToken?: string;
  deviceId: string;
  deviceName: string;
  platform?: string;
  appVersion?: string;
  requestedScopes?: SyncScope[];
  workspaceId?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncBridgePairedPayload {
  deviceToken: string;
  deviceId: string;
  userId: string;
  workspaceId?: string;
  scopesGranted: SyncScope[];
  pairedAt: string;
  syncEnabled: boolean;
}

export interface SyncBridgeSyncBatchPayload {
  deviceId: string;
  operations: SyncQueueOperation[];
}

export interface SyncBridgeSyncAckPayload {
  acceptedIds: string[];
  rejected: Array<{ id: string; reason: string }>;
  serverWatermark: string;
}

export interface SyncBridgeApprovalEventPayload {
  approvalId: string;
  action: "approved" | "rejected" | "revoked";
  actorUserId?: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncBridgeErrorPayload {
  code: string;
  message: string;
  retryable?: boolean;
}

export interface PairingGrant {
  pairingCode: string;
  userId: string;
  workspaceId?: string;
  scopes: SyncScope[];
  expiresAt: string;
  metadata?: Record<string, unknown>;
}

export interface AccountSyncSnapshot {
  userId: string;
  workspaceId?: string;
  connectedDevices: Array<{
    deviceId: string;
    deviceName: string;
    platform?: string;
    pairedAt: string;
    lastSeenAt: string;
    scopesGranted: SyncScope[];
  }>;
  recentOperations: Array<{
    id: string;
    deviceId: string;
    objectId: string | null;
    objectKind: string;
    opType: string;
    acceptedAt: string;
  }>;
}

export interface SyncBridgeEnvelope {
  type:
    | "pair_device"
    | "paired"
    | "sync_batch"
    | "sync_ack"
    | "approval_event"
    | "error"
    | "ping"
    | "pong";
  id: string;
  timestamp: string;
  payload:
    | SyncBridgePairDevicePayload
    | SyncBridgePairedPayload
    | SyncBridgeSyncBatchPayload
    | SyncBridgeSyncAckPayload
    | SyncBridgeApprovalEventPayload
    | SyncBridgeErrorPayload
    | Record<string, never>;
}

export function createSyncEnvelope<T extends SyncBridgeEnvelope["payload"]>(
  type: SyncBridgeEnvelope["type"],
  payload: T,
): SyncBridgeEnvelope {
  return {
    type,
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
    payload,
  };
}
