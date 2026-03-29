import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";

import { genId, getDb } from "../db.js";
import type {
  DurableObjectKind,
  SharedContextMessageClass,
  SharedContextPacket,
  SharedContextPacketType,
  SharedContextPeer,
  SharedContextPeerSummary,
  SharedContextProduct,
  SharedContextRole,
  SharedContextSurface,
  SharedContextTask,
  SharedContextTaskStatus,
  SyncOperationType,
  SyncQueueOperation,
  SyncScope,
} from "./protocol.js";

export interface DurableObjectInput {
  id?: string;
  kind: DurableObjectKind | string;
  label: string;
  source?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  queueForSync?: boolean;
}

export interface ObjectEdgeInput {
  id?: string;
  fromId: string;
  toId: string;
  edgeType: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
  queueForSync?: boolean;
}

export interface ExecutionReceiptInput {
  id?: string;
  runId?: string | null;
  traceId?: string | null;
  stepId?: string | null;
  objectId?: string | null;
  toolName?: string | null;
  actionType: string;
  summary: string;
  input?: unknown;
  output?: unknown;
  status?: string;
  metadata?: Record<string, unknown>;
  queueForSync?: boolean;
}

export interface LocalArtifactInput {
  id?: string;
  runId?: string | null;
  objectId?: string | null;
  kind: string;
  path?: string | null;
  summary?: string | null;
  verificationStatus?: string;
  content?: string | null;
  metadata?: Record<string, unknown>;
  queueForSync?: boolean;
}

export interface LocalOutcomeInput {
  id?: string;
  runId?: string | null;
  objectId?: string | null;
  outcomeType: string;
  headline: string;
  userValue?: string | null;
  stakeholderValue?: string | null;
  status?: string;
  evidence?: unknown[];
  metadata?: Record<string, unknown>;
  queueForSync?: boolean;
}

export interface DeviceBindingInput {
  deviceId: string;
  deviceName: string;
  platform?: string | null;
  appVersion?: string | null;
  bridgeUrl?: string | null;
  deviceToken?: string | null;
  bindingStatus?: "unpaired" | "paired" | "revoked";
  metadata?: Record<string, unknown>;
}

export interface AccountBindingInput {
  deviceId: string;
  userId: string;
  workspaceId?: string | null;
  scopes: SyncScope[];
  syncEnabled?: boolean;
  syncMode?: "offline" | "connected" | "cloud";
  metadata?: Record<string, unknown>;
}

export interface SharedContextPeerInput {
  peerId?: string;
  product: SharedContextProduct;
  tenantId?: string | null;
  workspaceId?: string | null;
  surface: SharedContextSurface;
  role: SharedContextRole;
  capabilities?: string[];
  contextScopes?: string[];
  status?: SharedContextPeer["status"];
  summary?: SharedContextPeerSummary;
  metadata?: Record<string, unknown>;
  queueForSync?: boolean;
}

export interface SharedContextPeerFilters {
  product?: SharedContextProduct;
  workspaceId?: string | null;
  tenantId?: string | null;
  role?: SharedContextRole;
  surface?: SharedContextSurface;
  status?: SharedContextPeer["status"];
  capability?: string;
  scope?: string;
  limit?: number;
}

export interface SharedContextPacketInput {
  contextId?: string;
  contextType: SharedContextPacketType;
  producerPeerId: string;
  tenantId?: string | null;
  workspaceId?: string | null;
  scope?: string[];
  subject: string;
  summary: string;
  claims?: string[];
  evidenceRefs?: string[];
  stateSnapshot?: Record<string, unknown>;
  timeWindow?: Record<string, unknown>;
  freshness?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
  confidence?: number;
  lineage?: Record<string, unknown>;
  invalidates?: string[];
  nextActions?: string[];
  version?: number;
  status?: SharedContextPacket["status"];
  metadata?: Record<string, unknown>;
  queueForSync?: boolean;
}

export interface SharedContextPacketQuery {
  contextType?: SharedContextPacketType;
  producerPeerId?: string;
  requestingPeerId?: string;
  tenantId?: string | null;
  workspaceId?: string | null;
  status?: SharedContextPacket["status"];
  scopeIncludes?: string;
  subjectIncludes?: string;
  limit?: number;
}

export interface SharedContextPacketResource {
  packet: SharedContextPacket;
  resourceUri: string;
  pullQuery: {
    contextType: SharedContextPacket["contextType"];
    producerPeerId: string;
    workspaceId?: string;
    tenantId?: string;
    scopeIncludes?: string;
    subjectIncludes: string;
  };
  subscriptionQuery: {
    peerId?: string;
    workspaceId?: string;
    contextType: SharedContextPacket["contextType"];
    producerPeerId: string;
    scopeIncludes?: string;
    subjectIncludes: string;
    eventTypes: string[];
  };
}

export interface SharedContextSubscriptionQuery extends SharedContextPacketQuery {
  peerId?: string;
  eventTypes?: string[];
  taskType?: string;
  messageClass?: SharedContextMessageClass;
}

export interface SharedContextSubscriptionManifest {
  peerId?: string;
  snapshotQuery: {
    limit: number;
    peerId?: string;
    workspaceId?: string;
    contextType?: SharedContextPacket["contextType"];
    producerPeerId?: string;
    scopeIncludes?: string;
    subjectIncludes?: string;
    taskType?: string;
    messageClass?: SharedContextMessageClass;
  };
  pullQuery: SharedContextPacketQuery;
  subscriptionQuery: {
    peerId?: string;
    workspaceId?: string;
    contextType?: SharedContextPacket["contextType"];
    producerPeerId?: string;
    scopeIncludes?: string;
    subjectIncludes?: string;
    taskType?: string;
    messageClass?: SharedContextMessageClass;
    eventTypes: string[];
  };
  packetResources: Array<{
    contextId: string;
    contextType: SharedContextPacket["contextType"];
    subject: string;
    resourceUri: string;
  }>;
}

export interface SharedContextTaskInput {
  taskId?: string;
  taskType: string;
  proposerPeerId: string;
  assigneePeerId: string;
  status?: SharedContextTaskStatus;
  taskSpec?: Record<string, unknown>;
  inputContextIds?: string[];
  outputContextId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  queueForSync?: boolean;
}

export interface SharedContextScopedSnapshotFilters extends SharedContextSubscriptionQuery {
  limit?: number;
}

function json(value: unknown, fallback: unknown = {}): string {
  return JSON.stringify(value ?? fallback);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload ?? null)).digest("hex");
}

const sharedContextEventBus = new EventEmitter();
sharedContextEventBus.setMaxListeners(100);

export function getSharedContextEventBus(): EventEmitter {
  return sharedContextEventBus;
}

function emitSharedContextEvent(type: string, payload: Record<string, unknown>): void {
  sharedContextEventBus.emit("shared_context", {
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
}

function parseSharedContextPeerRow(row: any): SharedContextPeer {
  return {
    peerId: row.peer_id,
    product: row.product,
    tenantId: row.tenant_id ?? null,
    workspaceId: row.workspace_id ?? null,
    surface: row.surface,
    role: row.role,
    capabilities: parseJson<string[]>(row.capabilities_json, []),
    contextScopes: parseJson<string[]>(row.context_scopes_json, []),
    status: row.status,
    summary: parseJson<SharedContextPeerSummary>(row.summary_json, {}),
    metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
    lastHeartbeatAt: row.last_heartbeat_at,
  };
}

function parseSharedContextPacketRow(row: any): SharedContextPacket {
  return {
    contextId: row.context_id,
    contextType: row.context_type,
    producerPeerId: row.producer_peer_id,
    tenantId: row.tenant_id ?? null,
    workspaceId: row.workspace_id ?? null,
    scope: parseJson<string[]>(row.scope_json, []),
    subject: row.subject,
    summary: row.summary,
    claims: parseJson<string[]>(row.claims_json, []),
    evidenceRefs: parseJson<string[]>(row.evidence_refs_json, []),
    stateSnapshot: parseJson<Record<string, unknown>>(row.state_snapshot_json, {}),
    timeWindow: parseJson<Record<string, unknown>>(row.time_window_json, {}),
    freshness: parseJson<Record<string, unknown>>(row.freshness_json, {}),
    permissions: parseJson<Record<string, unknown>>(row.permissions_json, {}),
    confidence: row.confidence ?? undefined,
    lineage: parseJson<Record<string, unknown>>(row.lineage_json, {}),
    invalidates: parseJson<string[]>(row.invalidates_json, []),
    nextActions: parseJson<string[]>(row.next_actions_json, []),
    version: row.version,
    status: row.status,
    metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
  };
}

function parseSharedContextTaskRow(row: any): SharedContextTask {
  return {
    taskId: row.task_id,
    taskType: row.task_type,
    proposerPeerId: row.proposer_peer_id,
    assigneePeerId: row.assignee_peer_id,
    status: row.status,
    taskSpec: parseJson<Record<string, unknown>>(row.task_spec_json, {}),
    inputContextIds: parseJson<string[]>(row.input_context_ids_json, []),
    outputContextId: row.output_context_id ?? null,
    reason: row.reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireSharedContextPeer(peerId: string): SharedContextPeer {
  const peer = getSharedContextPeer(peerId);
  if (!peer) {
    throw new Error(`Shared context peer not found: ${peerId}`);
  }
  return peer;
}

function normalizeVisibility(permissions?: Record<string, unknown>): "internal" | "workspace" | "tenant" {
  const visibility = permissions?.visibility;
  if (visibility === "tenant" || visibility === "workspace" || visibility === "internal") {
    return visibility;
  }
  return "workspace";
}

function assertPeersShareScope(sourcePeer: SharedContextPeer, destinationPeer: SharedContextPeer, action: string): void {
  const sourceWorkspace = sourcePeer.workspaceId ?? null;
  const destinationWorkspace = destinationPeer.workspaceId ?? null;
  const sourceTenant = sourcePeer.tenantId ?? null;
  const destinationTenant = destinationPeer.tenantId ?? null;

  if (sourceTenant && destinationTenant && sourceTenant !== destinationTenant) {
    throw new Error(`${action} denied: peers do not share tenant scope`);
  }

  if (sourceWorkspace && destinationWorkspace && sourceWorkspace !== destinationWorkspace) {
    throw new Error(`${action} denied: peers do not share workspace scope`);
  }
}

function canPeerAccessPacket(peer: SharedContextPeer, packet: SharedContextPacket): boolean {
  const visibility = normalizeVisibility(packet.permissions);
  const allowedRoles = Array.isArray(packet.permissions?.allowedRoles)
    ? (packet.permissions?.allowedRoles as string[])
    : [];

  if (packet.status === "invalidated") return false;
  if (allowedRoles.length > 0 && !allowedRoles.includes(peer.role)) return false;

  if (packet.tenantId && peer.tenantId && packet.tenantId !== peer.tenantId) return false;
  if (packet.workspaceId && peer.workspaceId && packet.workspaceId !== peer.workspaceId) return false;

  if (visibility === "internal") {
    return packet.producerPeerId === peer.peerId || (
      (!packet.workspaceId || packet.workspaceId === peer.workspaceId) &&
      (!packet.tenantId || packet.tenantId === peer.tenantId) &&
      peer.product === requireSharedContextPeer(packet.producerPeerId).product
    );
  }

  if (visibility === "tenant") {
    if (packet.tenantId && peer.tenantId) return packet.tenantId === peer.tenantId;
    return !packet.workspaceId || packet.workspaceId === peer.workspaceId;
  }

  return !packet.workspaceId || packet.workspaceId === peer.workspaceId;
}

function requirePacketForPeer(contextId: string, peerId: string, action: string): SharedContextPacket {
  const peer = requireSharedContextPeer(peerId);
  const row = getDb().prepare(`
    SELECT *
    FROM shared_context_packets
    WHERE context_id = ?
    LIMIT 1
  `).get(contextId) as any;
  if (!row) {
    throw new Error(`Shared context packet not found: ${contextId}`);
  }
  const packet = parseSharedContextPacketRow(row);
  if (!canPeerAccessPacket(peer, packet)) {
    throw new Error(`${action} denied: peer ${peerId} cannot access packet ${contextId}`);
  }
  return packet;
}

export function upsertDurableObject(input: DurableObjectInput): { objectId: string; queuedSyncId?: string } {
  const db = getDb();
  const now = new Date().toISOString();
  const objectId = input.id ?? genId(String(input.kind));
  const metadataJson = json(input.metadata);

  db.prepare(`
    INSERT INTO object_nodes (id, kind, label, source, status, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      kind = excluded.kind,
      label = excluded.label,
      source = excluded.source,
      status = excluded.status,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `).run(
    objectId,
    input.kind,
    input.label,
    input.source ?? "local",
    input.status ?? "active",
    metadataJson,
    now,
    now,
  );

  const queuedSyncId = input.queueForSync === false
    ? undefined
    : enqueueSyncOperation({
        objectId,
        objectKind: input.kind,
        opType: "upsert_object",
        payload: {
          id: objectId,
          kind: input.kind,
          label: input.label,
          source: input.source ?? "local",
          status: input.status ?? "active",
          metadata: input.metadata ?? {},
        },
      }).queueId;

  return { objectId, queuedSyncId };
}

export function linkDurableObjects(input: ObjectEdgeInput): { edgeId: string; queuedSyncId?: string } {
  const db = getDb();
  const edgeId = input.id ?? genId("edge");
  db.prepare(`
    INSERT INTO object_edges (id, from_id, to_id, edge_type, confidence, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(from_id, to_id, edge_type) DO UPDATE SET
      confidence = excluded.confidence,
      metadata_json = excluded.metadata_json
  `).run(
    edgeId,
    input.fromId,
    input.toId,
    input.edgeType,
    input.confidence ?? 1,
    json(input.metadata),
    new Date().toISOString(),
  );

  const queuedSyncId = input.queueForSync === false
    ? undefined
    : enqueueSyncOperation({
        objectId: input.fromId,
        objectKind: "workflow",
        opType: "link_object",
        payload: {
          id: edgeId,
          fromId: input.fromId,
          toId: input.toId,
          edgeType: input.edgeType,
          confidence: input.confidence ?? 1,
          metadata: input.metadata ?? {},
        },
      }).queueId;

  return { edgeId, queuedSyncId };
}

export function recordExecutionReceipt(input: ExecutionReceiptInput): { receiptId: string; queuedSyncId?: string } {
  const db = getDb();
  const receiptId = input.id ?? genId("receipt");
  const inputHash = input.input === undefined ? null : hashPayload(input.input);
  const outputHash = input.output === undefined ? null : hashPayload(input.output);

  db.prepare(`
    INSERT INTO execution_receipts (id, run_id, trace_id, step_id, object_id, tool_name, action_type, summary, input_hash, output_hash, status, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    receiptId,
    input.runId ?? null,
    input.traceId ?? null,
    input.stepId ?? null,
    input.objectId ?? null,
    input.toolName ?? null,
    input.actionType,
    input.summary,
    inputHash,
    outputHash,
    input.status ?? "recorded",
    json({
      ...(input.metadata ?? {}),
      input: input.input ?? null,
      output: input.output ?? null,
    }),
    new Date().toISOString(),
  );

  const queuedSyncId = input.queueForSync === false
    ? undefined
    : enqueueSyncOperation({
        objectId: input.objectId ?? input.runId ?? receiptId,
        objectKind: "trace",
        opType: "record_receipt",
        payload: {
          id: receiptId,
          runId: input.runId ?? null,
          traceId: input.traceId ?? null,
          stepId: input.stepId ?? null,
          objectId: input.objectId ?? null,
          toolName: input.toolName ?? null,
          actionType: input.actionType,
          summary: input.summary,
          status: input.status ?? "recorded",
          inputHash,
          outputHash,
          metadata: input.metadata ?? {},
        },
      }).queueId;

  return { receiptId, queuedSyncId };
}

export function recordLocalArtifact(input: LocalArtifactInput): { artifactId: string; queuedSyncId?: string } {
  const db = getDb();
  const artifactId = input.id ?? genId("artifact");
  const contentHash = input.content ? hashPayload(input.content) : null;

  db.prepare(`
    INSERT INTO local_artifacts (id, run_id, object_id, kind, path, content_hash, summary, verification_status, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    artifactId,
    input.runId ?? null,
    input.objectId ?? null,
    input.kind,
    input.path ?? null,
    contentHash,
    input.summary ?? null,
    input.verificationStatus ?? "unverified",
    json({
      ...(input.metadata ?? {}),
      contentPreview: typeof input.content === "string" ? input.content.slice(0, 500) : null,
    }),
    new Date().toISOString(),
  );

  const queuedSyncId = input.queueForSync === false
    ? undefined
    : enqueueSyncOperation({
        objectId: input.objectId ?? artifactId,
        objectKind: "artifact",
        opType: "record_artifact",
        payload: {
          id: artifactId,
          runId: input.runId ?? null,
          objectId: input.objectId ?? null,
          kind: input.kind,
          path: input.path ?? null,
          contentHash,
          summary: input.summary ?? null,
          verificationStatus: input.verificationStatus ?? "unverified",
          metadata: input.metadata ?? {},
        },
      }).queueId;

  return { artifactId, queuedSyncId };
}

export function recordLocalOutcome(input: LocalOutcomeInput): { outcomeId: string; queuedSyncId?: string } {
  const db = getDb();
  const outcomeId = input.id ?? genId("outcome");

  db.prepare(`
    INSERT INTO local_outcomes (id, run_id, object_id, outcome_type, headline, user_value, stakeholder_value, status, evidence_json, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    outcomeId,
    input.runId ?? null,
    input.objectId ?? null,
    input.outcomeType,
    input.headline,
    input.userValue ?? null,
    input.stakeholderValue ?? null,
    input.status ?? "draft",
    json(input.evidence ?? [], []),
    json(input.metadata),
    new Date().toISOString(),
  );

  const queuedSyncId = input.queueForSync === false
    ? undefined
    : enqueueSyncOperation({
        objectId: input.objectId ?? outcomeId,
        objectKind: "outcome",
        opType: "record_outcome",
        payload: {
          id: outcomeId,
          runId: input.runId ?? null,
          objectId: input.objectId ?? null,
          outcomeType: input.outcomeType,
          headline: input.headline,
          userValue: input.userValue ?? null,
          stakeholderValue: input.stakeholderValue ?? null,
          status: input.status ?? "draft",
          evidence: input.evidence ?? [],
          metadata: input.metadata ?? {},
        },
      }).queueId;

  return { outcomeId, queuedSyncId };
}

export function upsertDeviceBinding(input: DeviceBindingInput): void {
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO device_bindings (device_id, device_name, platform, app_version, bridge_url, device_token, binding_status, metadata_json, paired_at, last_seen_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      device_name = excluded.device_name,
      platform = excluded.platform,
      app_version = excluded.app_version,
      bridge_url = excluded.bridge_url,
      device_token = excluded.device_token,
      binding_status = excluded.binding_status,
      metadata_json = excluded.metadata_json,
      paired_at = COALESCE(excluded.paired_at, device_bindings.paired_at),
      last_seen_at = excluded.last_seen_at,
      updated_at = excluded.updated_at
  `).run(
    input.deviceId,
    input.deviceName,
    input.platform ?? null,
    input.appVersion ?? null,
    input.bridgeUrl ?? null,
    input.deviceToken ?? null,
    input.bindingStatus ?? "unpaired",
    json(input.metadata),
    input.bindingStatus === "paired" ? now : null,
    now,
    now,
    now,
  );
}

export function bindDeviceToAccount(input: AccountBindingInput): { bindingId: string } {
  const bindingId = genId("acct");
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO account_bindings (id, device_id, user_id, workspace_id, scopes_json, sync_enabled, sync_mode, metadata_json, paired_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    bindingId,
    input.deviceId,
    input.userId,
    input.workspaceId ?? null,
    json(input.scopes, []),
    input.syncEnabled === false ? 0 : 1,
    input.syncMode ?? "connected",
    json(input.metadata),
    now,
    now,
    now,
  );
  return { bindingId };
}

export function getActiveAccountBinding(deviceId?: string): null | {
  bindingId: string;
  deviceId: string;
  userId: string;
  workspaceId: string | null;
  scopes: SyncScope[];
  syncEnabled: boolean;
  syncMode: string;
  lastSyncedAt: string | null;
  revokedAt: string | null;
} {
  const row = getDb().prepare(`
    SELECT id, device_id, user_id, workspace_id, scopes_json, sync_enabled, sync_mode, last_synced_at, revoked_at
    FROM account_bindings
    WHERE (? IS NULL OR device_id = ?)
      AND revoked_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `).get(deviceId ?? null, deviceId ?? null) as any;

  if (!row) return null;
  return {
    bindingId: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    workspaceId: row.workspace_id ?? null,
    scopes: parseJson<SyncScope[]>(row.scopes_json, []),
    syncEnabled: Boolean(row.sync_enabled),
    syncMode: row.sync_mode,
    lastSyncedAt: row.last_synced_at ?? null,
    revokedAt: row.revoked_at ?? null,
  };
}

export function getDeviceBinding(deviceId: string): null | {
  deviceId: string;
  deviceName: string;
  platform: string | null;
  appVersion: string | null;
  bridgeUrl: string | null;
  deviceToken: string | null;
  bindingStatus: string;
  lastSeenAt: string | null;
} {
  const row = getDb().prepare(`
    SELECT device_id, device_name, platform, app_version, bridge_url, device_token, binding_status, last_seen_at
    FROM device_bindings
    WHERE device_id = ?
    LIMIT 1
  `).get(deviceId) as any;

  if (!row) return null;
  return {
    deviceId: row.device_id,
    deviceName: row.device_name,
    platform: row.platform ?? null,
    appVersion: row.app_version ?? null,
    bridgeUrl: row.bridge_url ?? null,
    deviceToken: row.device_token ?? null,
    bindingStatus: row.binding_status,
    lastSeenAt: row.last_seen_at ?? null,
  };
}

export function enqueueSyncOperation(input: {
  objectId: string | null;
  objectKind: DurableObjectKind | string;
  opType: SyncOperationType | string;
  payload: Record<string, unknown>;
}): { queueId: string; payloadHash: string } {
  const queueId = genId("sync");
  const payloadHash = hashPayload(input.payload);
  const now = new Date().toISOString();

  getDb().prepare(`
    INSERT INTO sync_queue (id, object_id, object_kind, op_type, payload_json, payload_hash, sync_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    queueId,
    input.objectId,
    input.objectKind,
    input.opType,
    json(input.payload),
    payloadHash,
    now,
    now,
  );

  return { queueId, payloadHash };
}

export function listPendingSyncOperations(limit = 50): SyncQueueOperation[] {
  const rows = getDb().prepare(`
    SELECT id, object_id, object_kind, op_type, payload_json, payload_hash, created_at
    FROM sync_queue
    WHERE sync_status IN ('pending', 'retry')
    ORDER BY created_at ASC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((row) => ({
    id: row.id,
    objectId: row.object_id ?? null,
    objectKind: row.object_kind,
    opType: row.op_type,
    payload: parseJson<Record<string, unknown>>(row.payload_json, {}),
    payloadHash: row.payload_hash,
    createdAt: row.created_at,
  }));
}

export function markSyncAttempt(queueIds: string[], error?: string): void {
  if (queueIds.length === 0) return;
  const db = getDb();
  const placeholders = queueIds.map(() => "?").join(", ");
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE sync_queue
    SET sync_status = ?, retry_count = retry_count + 1, last_error = ?, last_attempt_at = ?, updated_at = ?
    WHERE id IN (${placeholders})
  `).run(error ? "retry" : "in_flight", error ?? null, now, now, ...queueIds);
}

export function acknowledgeSyncOperations(args: {
  queueIds: string[];
  serverReceiptId?: string;
  deviceId?: string;
  userId?: string;
  workspaceId?: string;
  detail?: Record<string, unknown>;
}): void {
  if (args.queueIds.length === 0) return;
  const db = getDb();
  const placeholders = args.queueIds.map(() => "?").join(", ");
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE sync_queue
    SET sync_status = 'acknowledged', acknowledged_at = ?, last_attempt_at = ?, updated_at = ?, last_error = NULL
    WHERE id IN (${placeholders})
  `).run(now, now, now, ...args.queueIds);

  const insertReceipt = db.prepare(`
    INSERT INTO sync_receipts (id, queue_id, server_receipt_id, device_id, user_id, workspace_id, status, detail_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const queueId of args.queueIds) {
    insertReceipt.run(
      genId("sync_receipt"),
      queueId,
      args.serverReceiptId ?? null,
      args.deviceId ?? null,
      args.userId ?? null,
      args.workspaceId ?? null,
      "acknowledged",
      json(args.detail),
      now,
    );
  }

  if (args.deviceId && args.userId) {
    db.prepare(`
      UPDATE account_bindings
      SET last_synced_at = ?, updated_at = ?
      WHERE device_id = ? AND user_id = ? AND revoked_at IS NULL
    `).run(now, now, args.deviceId, args.userId);
  }
}

export function failSyncOperations(args: {
  rejected: Array<{ id: string; reason: string }>;
  deviceId?: string;
  userId?: string;
  workspaceId?: string;
}): void {
  if (args.rejected.length === 0) return;
  const db = getDb();
  const now = new Date().toISOString();
  const update = db.prepare(`
    UPDATE sync_queue
    SET sync_status = 'retry', retry_count = retry_count + 1, last_error = ?, last_attempt_at = ?, updated_at = ?
    WHERE id = ?
  `);
  const insertReceipt = db.prepare(`
    INSERT INTO sync_receipts (id, queue_id, device_id, user_id, workspace_id, status, detail_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const rejected of args.rejected) {
    update.run(rejected.reason, now, now, rejected.id);
    insertReceipt.run(
      genId("sync_receipt"),
      rejected.id,
      args.deviceId ?? null,
      args.userId ?? null,
      args.workspaceId ?? null,
      "rejected",
      json({ reason: rejected.reason }),
      now,
    );
  }
}

export function getSyncBridgeStatus(deviceId?: string): {
  mode: "offline" | "connected";
  activeBinding: ReturnType<typeof getActiveAccountBinding>;
  pendingCount: number;
  retryCount: number;
  acknowledgedCount: number;
  lastAcknowledgedAt: string | null;
} {
  const db = getDb();
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN sync_status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN sync_status = 'retry' THEN 1 ELSE 0 END) AS retry_count,
      SUM(CASE WHEN sync_status = 'acknowledged' THEN 1 ELSE 0 END) AS acknowledged_count,
      MAX(acknowledged_at) AS last_acknowledged_at
    FROM sync_queue
  `).get() as any;

  const activeBinding = getActiveAccountBinding(deviceId);
  return {
    mode: activeBinding && activeBinding.syncEnabled ? "connected" : "offline",
    activeBinding,
    pendingCount: counts?.pending_count ?? 0,
    retryCount: counts?.retry_count ?? 0,
    acknowledgedCount: counts?.acknowledged_count ?? 0,
    lastAcknowledgedAt: counts?.last_acknowledged_at ?? null,
  };
}

export function registerSharedContextPeer(input: SharedContextPeerInput): { peerId: string; queuedSyncId?: string } {
  const db = getDb();
  const now = new Date().toISOString();
  const peerId = input.peerId ?? genId("peer");

  db.prepare(`
    INSERT INTO shared_context_peers (
      peer_id, product, tenant_id, workspace_id, surface, role, capabilities_json,
      context_scopes_json, status, summary_json, metadata_json, last_heartbeat_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(peer_id) DO UPDATE SET
      product = excluded.product,
      tenant_id = excluded.tenant_id,
      workspace_id = excluded.workspace_id,
      surface = excluded.surface,
      role = excluded.role,
      capabilities_json = excluded.capabilities_json,
      context_scopes_json = excluded.context_scopes_json,
      status = excluded.status,
      summary_json = excluded.summary_json,
      metadata_json = excluded.metadata_json,
      last_heartbeat_at = excluded.last_heartbeat_at,
      updated_at = excluded.updated_at
  `).run(
    peerId,
    input.product,
    input.tenantId ?? null,
    input.workspaceId ?? null,
    input.surface,
    input.role,
    json(input.capabilities ?? [], []),
    json(input.contextScopes ?? [], []),
    input.status ?? "active",
    json(input.summary ?? {}, {}),
    json(input.metadata),
    now,
    now,
    now,
  );

  upsertDurableObject({
    id: peerId,
    kind: "peer",
    label: `${input.product}:${input.role}:${input.surface}`,
    source: "local",
    status: input.status ?? "active",
    metadata: {
      product: input.product,
      tenantId: input.tenantId ?? null,
      workspaceId: input.workspaceId ?? null,
      surface: input.surface,
      role: input.role,
      capabilities: input.capabilities ?? [],
      contextScopes: input.contextScopes ?? [],
      summary: input.summary ?? {},
      ...(input.metadata ?? {}),
    },
    queueForSync: false,
  });

  const queuedSyncId = input.queueForSync === false
    ? undefined
    : enqueueSyncOperation({
        objectId: peerId,
        objectKind: "peer",
        opType: "register_peer",
        payload: {
          peerId,
          product: input.product,
          tenantId: input.tenantId ?? null,
          workspaceId: input.workspaceId ?? null,
          surface: input.surface,
          role: input.role,
          capabilities: input.capabilities ?? [],
          contextScopes: input.contextScopes ?? [],
          status: input.status ?? "active",
          summary: input.summary ?? {},
          metadata: input.metadata ?? {},
          lastHeartbeatAt: now,
        },
      }).queueId;

  emitSharedContextEvent("peer_registered", {
    peerId,
    product: input.product,
    workspaceId: input.workspaceId ?? null,
    role: input.role,
    surface: input.surface,
    status: input.status ?? "active",
  });

  return { peerId, queuedSyncId };
}

export function heartbeatSharedContextPeer(peerId: string, summary?: SharedContextPeerSummary): { peerId: string; lastHeartbeatAt: string } {
  const now = new Date().toISOString();
  getDb().prepare(`
    UPDATE shared_context_peers
    SET status = 'active',
        summary_json = COALESCE(?, summary_json),
        last_heartbeat_at = ?,
        updated_at = ?
    WHERE peer_id = ?
  `).run(summary ? json(summary, {}) : null, now, now, peerId);

  const existing = getSharedContextPeer(peerId);
  if (existing) {
    upsertDurableObject({
      id: peerId,
      kind: "peer",
      label: `${existing.product}:${existing.role}:${existing.surface}`,
      source: "local",
      status: "active",
      metadata: {
        product: existing.product,
        tenantId: existing.tenantId ?? null,
        workspaceId: existing.workspaceId ?? null,
        surface: existing.surface,
        role: existing.role,
        capabilities: existing.capabilities,
        contextScopes: existing.contextScopes,
        summary: summary ?? existing.summary,
        ...(existing.metadata ?? {}),
      },
      queueForSync: false,
    });
  }

  emitSharedContextEvent("peer_heartbeat", {
    peerId,
    summary: summary ?? existing?.summary ?? {},
    lastHeartbeatAt: now,
  });

  return { peerId, lastHeartbeatAt: now };
}

export function listSharedContextPeers(filters: SharedContextPeerFilters = {}): SharedContextPeer[] {
  const rows = getDb().prepare(`
    SELECT *
    FROM shared_context_peers
    WHERE (? IS NULL OR product = ?)
      AND (? IS NULL OR workspace_id = ?)
      AND (? IS NULL OR tenant_id = ?)
      AND (? IS NULL OR role = ?)
      AND (? IS NULL OR surface = ?)
      AND (? IS NULL OR status = ?)
      AND (? IS NULL OR capabilities_json LIKE '%' || ? || '%')
      AND (? IS NULL OR context_scopes_json LIKE '%' || ? || '%')
    ORDER BY last_heartbeat_at DESC
    LIMIT ?
  `).all(
    filters.product ?? null, filters.product ?? null,
    filters.workspaceId ?? null, filters.workspaceId ?? null,
    filters.tenantId ?? null, filters.tenantId ?? null,
    filters.role ?? null, filters.role ?? null,
    filters.surface ?? null, filters.surface ?? null,
    filters.status ?? null, filters.status ?? null,
    filters.capability ?? null, filters.capability ?? null,
    filters.scope ?? null, filters.scope ?? null,
    filters.limit ?? 50,
  ) as any[];

  return rows.map(parseSharedContextPeerRow);
}

export function getSharedContextPeer(peerId: string): SharedContextPeer | null {
  const row = getDb().prepare(`
    SELECT *
    FROM shared_context_peers
    WHERE peer_id = ?
    LIMIT 1
  `).get(peerId) as any;

  return row ? parseSharedContextPeerRow(row) : null;
}

export function getSharedContextPacket(contextId: string, requestingPeerId?: string): SharedContextPacket | null {
  const row = getDb().prepare(`
    SELECT *
    FROM shared_context_packets
    WHERE context_id = ?
    LIMIT 1
  `).get(contextId) as any;

  if (!row) return null;
  const packet = parseSharedContextPacketRow(row);
  if (!requestingPeerId) return packet;
  const peer = requireSharedContextPeer(requestingPeerId);
  return canPeerAccessPacket(peer, packet) ? packet : null;
}

function getPrimaryPacketScope(packet: SharedContextPacket): string | undefined {
  return packet.scope.find((scope) => scope !== "workspace");
}

export function buildSharedContextPacketResource(
  packet: SharedContextPacket,
  requestingPeerId?: string,
): SharedContextPacketResource {
  const primaryScope = getPrimaryPacketScope(packet);
  return {
    packet,
    resourceUri: `shared-context://packet/${encodeURIComponent(packet.contextId)}`,
    pullQuery: {
      contextType: packet.contextType,
      producerPeerId: packet.producerPeerId,
      workspaceId: packet.workspaceId ?? undefined,
      tenantId: packet.tenantId ?? undefined,
      scopeIncludes: primaryScope,
      subjectIncludes: packet.subject,
    },
    subscriptionQuery: {
      peerId: requestingPeerId ?? undefined,
      workspaceId: packet.workspaceId ?? undefined,
      contextType: packet.contextType,
      producerPeerId: packet.producerPeerId,
      scopeIncludes: primaryScope,
      subjectIncludes: packet.subject,
      eventTypes: [
        "packet_published",
        "packet_invalidated",
        "packet_acknowledged",
        "task_proposed",
        "task_status_changed",
      ],
    },
  };
}

export function getSharedContextPacketResource(
  contextId: string,
  requestingPeerId?: string,
): SharedContextPacketResource | null {
  const packet = getSharedContextPacket(contextId, requestingPeerId);
  if (!packet) return null;
  return buildSharedContextPacketResource(packet, requestingPeerId);
}

function normalizeSubscriptionEventTypes(eventTypes?: string[]): string[] {
  return eventTypes && eventTypes.length > 0
    ? Array.from(new Set(eventTypes))
    : [
        "packet_published",
        "packet_invalidated",
        "packet_acknowledged",
        "task_proposed",
        "task_status_changed",
        "message_sent",
      ];
}

function taskMatchesSubscription(
  task: SharedContextTask,
  packets: SharedContextPacket[],
  filters: SharedContextScopedSnapshotFilters,
): boolean {
  if (filters.taskType && task.taskType !== filters.taskType) return false;
  if (filters.peerId && task.proposerPeerId !== filters.peerId && task.assigneePeerId !== filters.peerId) {
    const relatedPacket = task.outputContextId
      ? packets.some((packet) => packet.contextId === task.outputContextId)
      : false;
    if (!relatedPacket) return false;
  }
  if (!filters.workspaceId) return true;
  const packetWorkspaceMatch = packets.some((packet) =>
    packet.contextId === task.outputContextId || task.inputContextIds.includes(packet.contextId),
  );
  if (packetWorkspaceMatch) return true;
  return false;
}

function messageMatchesSubscription(
  message: {
    messageId: string;
    fromPeerId: string;
    toPeerId: string;
    messageClass: SharedContextMessageClass;
    payload: Record<string, unknown>;
    status: string;
    createdAt: string;
  },
  peers: SharedContextPeer[],
  filters: SharedContextScopedSnapshotFilters,
): boolean {
  if (filters.messageClass && message.messageClass !== filters.messageClass) return false;
  if (filters.peerId && message.fromPeerId !== filters.peerId && message.toPeerId !== filters.peerId) {
    return false;
  }
  if (!filters.workspaceId) return true;
  return peers.some((peer) =>
    peer.workspaceId === filters.workspaceId &&
    (peer.peerId === message.fromPeerId || peer.peerId === message.toPeerId),
  );
}

export function buildSharedContextSubscriptionManifest(
  query: SharedContextSubscriptionQuery = {},
): SharedContextSubscriptionManifest {
  const limit = query.limit ?? 10;
  const packets = pullSharedContextPackets({
    contextType: query.contextType,
    producerPeerId: query.producerPeerId,
    requestingPeerId: query.peerId ?? query.requestingPeerId,
    tenantId: query.tenantId,
    workspaceId: query.workspaceId,
    status: query.status,
    scopeIncludes: query.scopeIncludes,
    subjectIncludes: query.subjectIncludes,
    limit,
  });
  const packetResources = packets.slice(0, limit).map((packet) => {
    const resource = buildSharedContextPacketResource(packet, query.peerId ?? query.requestingPeerId);
    return {
      contextId: packet.contextId,
      contextType: packet.contextType,
      subject: packet.subject,
      resourceUri: resource.resourceUri,
    };
  });

  return {
    peerId: query.peerId ?? query.requestingPeerId,
    snapshotQuery: {
      limit,
      peerId: query.peerId ?? query.requestingPeerId,
      workspaceId: query.workspaceId ?? undefined,
      contextType: query.contextType,
      producerPeerId: query.producerPeerId,
      scopeIncludes: query.scopeIncludes,
      subjectIncludes: query.subjectIncludes,
      taskType: query.taskType,
      messageClass: query.messageClass,
    },
    pullQuery: {
      contextType: query.contextType,
      producerPeerId: query.producerPeerId,
      requestingPeerId: query.peerId ?? query.requestingPeerId,
      tenantId: query.tenantId,
      workspaceId: query.workspaceId,
      status: query.status,
      scopeIncludes: query.scopeIncludes,
      subjectIncludes: query.subjectIncludes,
      limit,
    },
    subscriptionQuery: {
      peerId: query.peerId ?? query.requestingPeerId,
      workspaceId: query.workspaceId ?? undefined,
      contextType: query.contextType,
      producerPeerId: query.producerPeerId,
      scopeIncludes: query.scopeIncludes,
      subjectIncludes: query.subjectIncludes,
      taskType: query.taskType,
      messageClass: query.messageClass,
      eventTypes: normalizeSubscriptionEventTypes(query.eventTypes),
    },
    packetResources,
  };
}

export function publishSharedContextPacket(input: SharedContextPacketInput): { contextId: string; queuedSyncId?: string } {
  const db = getDb();
  const now = new Date().toISOString();
  const contextId = input.contextId ?? genId("context");
  const producerPeer = requireSharedContextPeer(input.producerPeerId);
  const workspaceId = input.workspaceId ?? producerPeer.workspaceId ?? null;
  const tenantId = input.tenantId ?? producerPeer.tenantId ?? null;
  const permissions = {
    visibility: "workspace",
    ...(input.permissions ?? {}),
  };

  if (producerPeer.workspaceId && workspaceId && producerPeer.workspaceId !== workspaceId) {
    throw new Error(`publish_shared_context denied: producer peer ${input.producerPeerId} cannot publish outside its workspace`);
  }
  if (producerPeer.tenantId && tenantId && producerPeer.tenantId !== tenantId) {
    throw new Error(`publish_shared_context denied: producer peer ${input.producerPeerId} cannot publish outside its tenant`);
  }

  db.prepare(`
    INSERT INTO shared_context_packets (
      context_id, context_type, producer_peer_id, tenant_id, workspace_id, scope_json, subject, summary,
      claims_json, evidence_refs_json, state_snapshot_json, time_window_json, freshness_json, permissions_json,
      confidence, lineage_json, invalidates_json, next_actions_json, version, status, metadata_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(context_id) DO UPDATE SET
      context_type = excluded.context_type,
      producer_peer_id = excluded.producer_peer_id,
      tenant_id = excluded.tenant_id,
      workspace_id = excluded.workspace_id,
      scope_json = excluded.scope_json,
      subject = excluded.subject,
      summary = excluded.summary,
      claims_json = excluded.claims_json,
      evidence_refs_json = excluded.evidence_refs_json,
      state_snapshot_json = excluded.state_snapshot_json,
      time_window_json = excluded.time_window_json,
      freshness_json = excluded.freshness_json,
      permissions_json = excluded.permissions_json,
      confidence = excluded.confidence,
      lineage_json = excluded.lineage_json,
      invalidates_json = excluded.invalidates_json,
      next_actions_json = excluded.next_actions_json,
      version = excluded.version,
      status = excluded.status,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `).run(
    contextId,
    input.contextType,
    input.producerPeerId,
    tenantId,
    workspaceId,
    json(input.scope ?? [], []),
    input.subject,
    input.summary,
    json(input.claims ?? [], []),
    json(input.evidenceRefs ?? [], []),
    json(input.stateSnapshot ?? {}, {}),
    json(input.timeWindow ?? {}, {}),
    json(input.freshness ?? {}, {}),
    json(permissions, {}),
    input.confidence ?? null,
    json(input.lineage ?? {}, {}),
    json(input.invalidates ?? [], []),
    json(input.nextActions ?? [], []),
    input.version ?? 1,
    input.status ?? "active",
    json(input.metadata),
    now,
    now,
  );

  if ((input.invalidates ?? []).length > 0) {
    const invalidate = db.prepare(`
      UPDATE shared_context_packets
      SET status = 'invalidated', updated_at = ?
      WHERE context_id = ?
    `);
    for (const invalidatedId of input.invalidates ?? []) {
      invalidate.run(now, invalidatedId);
    }
  }

  upsertDurableObject({
    id: contextId,
    kind: "context_packet",
    label: input.subject,
    source: "local",
    status: input.status ?? "active",
    metadata: {
      contextType: input.contextType,
      producerPeerId: input.producerPeerId,
      tenantId,
      workspaceId,
      scope: input.scope ?? [],
      summary: input.summary,
      claims: input.claims ?? [],
      evidenceRefs: input.evidenceRefs ?? [],
      freshness: input.freshness ?? {},
      permissions,
      confidence: input.confidence ?? null,
      lineage: input.lineage ?? {},
      invalidates: input.invalidates ?? [],
      nextActions: input.nextActions ?? [],
      version: input.version ?? 1,
      ...(input.metadata ?? {}),
    },
    queueForSync: false,
  });

  linkDurableObjects({
    fromId: input.producerPeerId,
    toId: contextId,
    edgeType: "produced_context",
    metadata: { contextType: input.contextType },
    queueForSync: false,
  });

  for (const invalidatedId of input.invalidates ?? []) {
    linkDurableObjects({
      fromId: contextId,
      toId: invalidatedId,
      edgeType: "invalidates",
      queueForSync: false,
    });
  }

  const queuedSyncId = input.queueForSync === false
    ? undefined
    : enqueueSyncOperation({
        objectId: contextId,
        objectKind: "context_packet",
        opType: "publish_context",
        payload: {
          contextId,
          contextType: input.contextType,
          producerPeerId: input.producerPeerId,
          tenantId,
          workspaceId,
          scope: input.scope ?? [],
          subject: input.subject,
          summary: input.summary,
          claims: input.claims ?? [],
          evidenceRefs: input.evidenceRefs ?? [],
          stateSnapshot: input.stateSnapshot ?? {},
          timeWindow: input.timeWindow ?? {},
          freshness: input.freshness ?? {},
          permissions,
          confidence: input.confidence ?? null,
          lineage: input.lineage ?? {},
          invalidates: input.invalidates ?? [],
          nextActions: input.nextActions ?? [],
          version: input.version ?? 1,
          status: input.status ?? "active",
          metadata: input.metadata ?? {},
        },
      }).queueId;

  emitSharedContextEvent("packet_published", {
    contextId,
    producerPeerId: input.producerPeerId,
    contextType: input.contextType,
    workspaceId,
    tenantId,
    status: input.status ?? "active",
  });

  return { contextId, queuedSyncId };
}

export function pullSharedContextPackets(query: SharedContextPacketQuery = {}): SharedContextPacket[] {
  const rows = getDb().prepare(`
    SELECT *
    FROM shared_context_packets
    WHERE (? IS NULL OR context_type = ?)
      AND (? IS NULL OR producer_peer_id = ?)
      AND (? IS NULL OR tenant_id = ?)
      AND (? IS NULL OR workspace_id = ?)
      AND (? IS NULL OR status = ?)
      AND (? IS NULL OR scope_json LIKE '%' || ? || '%')
      AND (? IS NULL OR subject LIKE '%' || ? || '%')
    ORDER BY created_at DESC
    LIMIT ?
  `).all(
    query.contextType ?? null, query.contextType ?? null,
    query.producerPeerId ?? null, query.producerPeerId ?? null,
    query.tenantId ?? null, query.tenantId ?? null,
    query.workspaceId ?? null, query.workspaceId ?? null,
    query.status ?? null, query.status ?? null,
    query.scopeIncludes ?? null, query.scopeIncludes ?? null,
    query.subjectIncludes ?? null, query.subjectIncludes ?? null,
    query.limit ?? 50,
  ) as any[];

  const packets = rows.map(parseSharedContextPacketRow);
  if (!query.requestingPeerId) return packets;
  const peer = requireSharedContextPeer(query.requestingPeerId);
  return packets.filter((packet) => canPeerAccessPacket(peer, packet));
}

export function acknowledgeSharedContextPacket(contextId: string, peerId: string, detail?: Record<string, unknown>): { ackId: string; queuedSyncId?: string } {
  requirePacketForPeer(contextId, peerId, "ack_shared_context");
  const ackId = genId("context_ack");
  const now = new Date().toISOString();

  getDb().prepare(`
    INSERT INTO shared_context_packet_acks (id, context_id, peer_id, ack_status, detail_json, created_at)
    VALUES (?, ?, ?, 'acknowledged', ?, ?)
    ON CONFLICT(context_id, peer_id) DO UPDATE SET
      ack_status = 'acknowledged',
      detail_json = excluded.detail_json,
      created_at = excluded.created_at
  `).run(ackId, contextId, peerId, json(detail), now);

  const queuedSyncId = enqueueSyncOperation({
    objectId: contextId,
    objectKind: "context_packet",
    opType: "ack_context",
    payload: {
      ackId,
      contextId,
      peerId,
      detail: detail ?? {},
      acknowledgedAt: now,
    },
  }).queueId;

  emitSharedContextEvent("packet_acknowledged", {
    contextId,
    peerId,
    acknowledgedAt: now,
  });

  return { ackId, queuedSyncId };
}

export function invalidateSharedContextPacket(
  contextId: string,
  producerPeerId: string,
  reason: string,
  invalidates: string[] = [],
): { contextId: string; queuedSyncId: string } {
  const now = new Date().toISOString();
  const packet = requirePacketForPeer(contextId, producerPeerId, "invalidate_shared_context");
  if (packet.producerPeerId !== producerPeerId) {
    throw new Error(`invalidate_shared_context denied: only the producer peer can invalidate packet ${contextId}`);
  }
  getDb().prepare(`
    UPDATE shared_context_packets
    SET status = 'invalidated',
        invalidates_json = ?,
        metadata_json = json_set(metadata_json, '$.invalidationReason', ?),
        updated_at = ?
    WHERE context_id = ? AND producer_peer_id = ?
  `).run(json(invalidates, []), reason, now, contextId, producerPeerId);

  upsertDurableObject({
    id: contextId,
    kind: "context_packet",
    label: getDb().prepare("SELECT subject FROM shared_context_packets WHERE context_id = ?").get(contextId)?.subject ?? contextId,
    source: "local",
    status: "invalidated",
    metadata: {
      invalidationReason: reason,
      invalidates,
    },
    queueForSync: false,
  });

  const queuedSyncId = enqueueSyncOperation({
    objectId: contextId,
    objectKind: "context_packet",
    opType: "invalidate_context",
    payload: {
      contextId,
      producerPeerId,
      reason,
      invalidates,
      invalidatedAt: now,
    },
  }).queueId;

  emitSharedContextEvent("packet_invalidated", {
    contextId,
    producerPeerId,
    reason,
    invalidates,
    invalidatedAt: now,
  });

  return { contextId, queuedSyncId };
}

export function sendSharedContextMessage(input: {
  fromPeerId: string;
  toPeerId: string;
  messageClass: SharedContextMessageClass;
  payload: Record<string, unknown>;
  queueForSync?: boolean;
}): { messageId: string; queuedSyncId?: string } {
  const fromPeer = requireSharedContextPeer(input.fromPeerId);
  const toPeer = requireSharedContextPeer(input.toPeerId);
  assertPeersShareScope(fromPeer, toPeer, "send_peer_message");

  const referencedContextId = typeof input.payload.contextId === "string" ? input.payload.contextId : null;
  if (referencedContextId) {
    requirePacketForPeer(referencedContextId, input.fromPeerId, "send_peer_message");
    requirePacketForPeer(referencedContextId, input.toPeerId, "send_peer_message");
  }

  const messageId = genId("message");
  const now = new Date().toISOString();

  getDb().prepare(`
    INSERT INTO shared_context_messages (id, from_peer_id, to_peer_id, message_class, payload_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'unread', ?)
  `).run(messageId, input.fromPeerId, input.toPeerId, input.messageClass, json(input.payload), now);

  upsertDurableObject({
    id: messageId,
    kind: "message",
    label: `${input.messageClass}:${input.fromPeerId}->${input.toPeerId}`,
    source: "local",
    status: "unread",
    metadata: {
      fromPeerId: input.fromPeerId,
      toPeerId: input.toPeerId,
      messageClass: input.messageClass,
      payload: input.payload,
    },
    queueForSync: false,
  });

  linkDurableObjects({
    fromId: input.fromPeerId,
    toId: messageId,
    edgeType: "sent_message",
    queueForSync: false,
  });
  linkDurableObjects({
    fromId: messageId,
    toId: input.toPeerId,
    edgeType: "addressed_to",
    queueForSync: false,
  });

  const queuedSyncId = input.queueForSync === false
    ? undefined
    : enqueueSyncOperation({
        objectId: messageId,
        objectKind: "message",
        opType: "send_peer_message",
        payload: {
          messageId,
          fromPeerId: input.fromPeerId,
          toPeerId: input.toPeerId,
          messageClass: input.messageClass,
          payload: input.payload,
          createdAt: now,
        },
      }).queueId;

  emitSharedContextEvent("message_sent", {
    messageId,
    fromPeerId: input.fromPeerId,
    toPeerId: input.toPeerId,
    messageClass: input.messageClass,
    createdAt: now,
  });

  return { messageId, queuedSyncId };
}

export function listSharedContextMessages(peerId: string, unreadOnly = false): Array<{
  messageId: string;
  fromPeerId: string;
  toPeerId: string;
  messageClass: SharedContextMessageClass;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
}> {
  const rows = getDb().prepare(`
    SELECT id, from_peer_id, to_peer_id, message_class, payload_json, status, created_at
    FROM shared_context_messages
    WHERE to_peer_id = ?
      AND (? = 0 OR status = 'unread')
    ORDER BY created_at DESC
  `).all(peerId, unreadOnly ? 1 : 0) as any[];

  return rows.map((row) => ({
    messageId: row.id,
    fromPeerId: row.from_peer_id,
    toPeerId: row.to_peer_id,
    messageClass: row.message_class,
    payload: parseJson<Record<string, unknown>>(row.payload_json, {}),
    status: row.status,
    createdAt: row.created_at,
  }));
}

export function proposeSharedContextTask(input: SharedContextTaskInput): { taskId: string; queuedSyncId?: string } {
  const db = getDb();
  const now = new Date().toISOString();
  const taskId = input.taskId ?? genId("task");
  const proposerPeer = requireSharedContextPeer(input.proposerPeerId);
  const assigneePeer = requireSharedContextPeer(input.assigneePeerId);
  assertPeersShareScope(proposerPeer, assigneePeer, "propose_shared_task");

  for (const contextId of input.inputContextIds ?? []) {
    requirePacketForPeer(contextId, input.proposerPeerId, "propose_shared_task");
    requirePacketForPeer(contextId, input.assigneePeerId, "propose_shared_task");
  }

  db.prepare(`
    INSERT INTO shared_context_tasks (
      task_id, task_type, proposer_peer_id, assignee_peer_id, status,
      task_spec_json, input_context_ids_json, output_context_id, reason, metadata_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(task_id) DO UPDATE SET
      task_type = excluded.task_type,
      proposer_peer_id = excluded.proposer_peer_id,
      assignee_peer_id = excluded.assignee_peer_id,
      status = excluded.status,
      task_spec_json = excluded.task_spec_json,
      input_context_ids_json = excluded.input_context_ids_json,
      output_context_id = excluded.output_context_id,
      reason = excluded.reason,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `).run(
    taskId,
    input.taskType,
    input.proposerPeerId,
    input.assigneePeerId,
    input.status ?? "proposed",
    json(input.taskSpec ?? {}, {}),
    json(input.inputContextIds ?? [], []),
    input.outputContextId ?? null,
    input.reason ?? null,
    json(input.metadata),
    now,
    now,
  );

  upsertDurableObject({
    id: taskId,
    kind: "task",
    label: input.taskType,
    source: "local",
    status: input.status ?? "proposed",
    metadata: {
      proposerPeerId: input.proposerPeerId,
      assigneePeerId: input.assigneePeerId,
      taskSpec: input.taskSpec ?? {},
      inputContextIds: input.inputContextIds ?? [],
      outputContextId: input.outputContextId ?? null,
      reason: input.reason ?? null,
      ...(input.metadata ?? {}),
    },
    queueForSync: false,
  });

  linkDurableObjects({
    fromId: input.proposerPeerId,
    toId: taskId,
    edgeType: "proposed_task",
    queueForSync: false,
  });
  linkDurableObjects({
    fromId: taskId,
    toId: input.assigneePeerId,
    edgeType: "assigned_to",
    queueForSync: false,
  });
  for (const contextId of input.inputContextIds ?? []) {
    linkDurableObjects({
      fromId: taskId,
      toId: contextId,
      edgeType: "input_context",
      queueForSync: false,
    });
  }

  const queuedSyncId = input.queueForSync === false
    ? undefined
    : enqueueSyncOperation({
        objectId: taskId,
        objectKind: "task",
        opType: "task_handoff",
        payload: {
          taskId,
          taskType: input.taskType,
          proposerPeerId: input.proposerPeerId,
          assigneePeerId: input.assigneePeerId,
          status: input.status ?? "proposed",
          taskSpec: input.taskSpec ?? {},
          inputContextIds: input.inputContextIds ?? [],
          outputContextId: input.outputContextId ?? null,
          reason: input.reason ?? null,
          metadata: input.metadata ?? {},
          createdAt: now,
        },
      }).queueId;

  emitSharedContextEvent("task_proposed", {
    taskId,
    taskType: input.taskType,
    proposerPeerId: input.proposerPeerId,
    assigneePeerId: input.assigneePeerId,
    status: input.status ?? "proposed",
    createdAt: now,
  });

  return { taskId, queuedSyncId };
}

function updateSharedContextTaskStatus(
  taskId: string,
  expectedPeerId: string,
  status: SharedContextTaskStatus,
  reason?: string | null,
  outputContextId?: string | null,
): SharedContextTask {
  const now = new Date().toISOString();
  getDb().prepare(`
    UPDATE shared_context_tasks
    SET status = ?,
        reason = COALESCE(?, reason),
        output_context_id = COALESCE(?, output_context_id),
        updated_at = ?
    WHERE task_id = ?
      AND assignee_peer_id = ?
  `).run(status, reason ?? null, outputContextId ?? null, now, taskId, expectedPeerId);

  const row = getDb().prepare(`
    SELECT *
    FROM shared_context_tasks
    WHERE task_id = ?
    LIMIT 1
  `).get(taskId) as any;
  if (!row) {
    throw new Error(`Shared context task not found: ${taskId}`);
  }
  const task = parseSharedContextTaskRow(row);
  const assigneePeer = requireSharedContextPeer(task.assigneePeerId);
  const proposerPeer = requireSharedContextPeer(task.proposerPeerId);
  assertPeersShareScope(proposerPeer, assigneePeer, "update_shared_task");

  if (outputContextId) {
    requirePacketForPeer(outputContextId, expectedPeerId, "update_shared_task");
  }

  upsertDurableObject({
    id: taskId,
    kind: "task",
    label: task.taskType,
    source: "local",
    status,
    metadata: {
      proposerPeerId: task.proposerPeerId,
      assigneePeerId: task.assigneePeerId,
      taskSpec: task.taskSpec,
      inputContextIds: task.inputContextIds,
      outputContextId: task.outputContextId ?? null,
      reason: task.reason ?? null,
    },
    queueForSync: false,
  });

  emitSharedContextEvent("task_status_changed", {
    taskId,
    peerId: expectedPeerId,
    status,
    outputContextId: outputContextId ?? null,
    updatedAt: task.updatedAt,
  });

  return task;
}

export function acceptSharedContextTask(taskId: string, peerId: string): { task: SharedContextTask; queuedSyncId: string } {
  const task = updateSharedContextTaskStatus(taskId, peerId, "accepted");
  const queuedSyncId = enqueueSyncOperation({
    objectId: taskId,
    objectKind: "task",
    opType: "task_handoff",
    payload: {
      taskId,
      peerId,
      status: "accepted",
      updatedAt: task.updatedAt,
    },
  }).queueId;
  return { task, queuedSyncId };
}

export function rejectSharedContextTask(taskId: string, peerId: string, reason: string): { task: SharedContextTask; queuedSyncId: string } {
  const task = updateSharedContextTaskStatus(taskId, peerId, "rejected", reason);
  const queuedSyncId = enqueueSyncOperation({
    objectId: taskId,
    objectKind: "task",
    opType: "task_handoff",
    payload: {
      taskId,
      peerId,
      status: "rejected",
      reason,
      updatedAt: task.updatedAt,
    },
  }).queueId;
  return { task, queuedSyncId };
}

export function completeSharedContextTask(taskId: string, peerId: string, outputContextId?: string | null): { task: SharedContextTask; queuedSyncId: string } {
  const task = updateSharedContextTaskStatus(taskId, peerId, "completed", null, outputContextId ?? null);
  if (outputContextId) {
    linkDurableObjects({
      fromId: taskId,
      toId: outputContextId,
      edgeType: "completed_with",
      queueForSync: false,
    });
  }
  const queuedSyncId = enqueueSyncOperation({
    objectId: taskId,
    objectKind: "task",
    opType: "task_handoff",
    payload: {
      taskId,
      peerId,
      status: "completed",
      outputContextId: outputContextId ?? null,
      updatedAt: task.updatedAt,
    },
  }).queueId;
  return { task, queuedSyncId };
}

export function escalateSharedContextTask(taskId: string, peerId: string, reason: string, outputContextId?: string | null): { task: SharedContextTask; queuedSyncId: string } {
  const task = updateSharedContextTaskStatus(taskId, peerId, "escalated", reason, outputContextId ?? null);
  const queuedSyncId = enqueueSyncOperation({
    objectId: taskId,
    objectKind: "task",
    opType: "task_handoff",
    payload: {
      taskId,
      peerId,
      status: "escalated",
      reason,
      outputContextId: outputContextId ?? null,
      updatedAt: task.updatedAt,
    },
  }).queueId;
  return { task, queuedSyncId };
}

export function getSharedContextSnapshot(limit = 10, requestingPeerId?: string): {
  peers: SharedContextPeer[];
  recentPackets: SharedContextPacket[];
  recentTasks: SharedContextTask[];
  recentMessages: Array<{
    messageId: string;
    fromPeerId: string;
    toPeerId: string;
    messageClass: SharedContextMessageClass;
    payload: Record<string, unknown>;
    status: string;
    createdAt: string;
  }>;
  counts: {
    activePeers: number;
    activePackets: number;
    invalidatedPackets: number;
    openTasks: number;
    unreadMessages: number;
  };
} {
  const db = getDb();
  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM shared_context_peers WHERE status = 'active') AS active_peers,
      (SELECT COUNT(*) FROM shared_context_packets WHERE status = 'active') AS active_packets,
      (SELECT COUNT(*) FROM shared_context_packets WHERE status = 'invalidated') AS invalidated_packets,
      (SELECT COUNT(*) FROM shared_context_tasks WHERE status IN ('proposed', 'accepted')) AS open_tasks,
      (SELECT COUNT(*) FROM shared_context_messages WHERE status = 'unread') AS unread_messages
  `).get() as any;

  const recentMessages = (db.prepare(`
    SELECT id, from_peer_id, to_peer_id, message_class, payload_json, status, created_at
    FROM shared_context_messages
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as any[]).map((row) => ({
    messageId: row.id,
    fromPeerId: row.from_peer_id,
    toPeerId: row.to_peer_id,
    messageClass: row.message_class,
    payload: parseJson<Record<string, unknown>>(row.payload_json, {}),
    status: row.status,
    createdAt: row.created_at,
  }));

  const allPeers = listSharedContextPeers({ limit });
  const allPackets = pullSharedContextPackets({ limit });
  const allTasks = (db.prepare(`
      SELECT *
      FROM shared_context_tasks
      ORDER BY updated_at DESC
      LIMIT ?
    `).all(limit) as any[]).map(parseSharedContextTaskRow);

  if (!requestingPeerId) {
    return {
      peers: allPeers,
      recentPackets: allPackets,
      recentTasks: allTasks,
      recentMessages,
      counts: {
        activePeers: counts?.active_peers ?? 0,
        activePackets: counts?.active_packets ?? 0,
        invalidatedPackets: counts?.invalidated_packets ?? 0,
        openTasks: counts?.open_tasks ?? 0,
        unreadMessages: counts?.unread_messages ?? 0,
      },
    };
  }

  const requestingPeer = requireSharedContextPeer(requestingPeerId);
  const filteredPeers = allPeers.filter((peer) => {
    try {
      assertPeersShareScope(requestingPeer, peer, "get_shared_context_snapshot");
      return true;
    } catch {
      return peer.peerId === requestingPeer.peerId;
    }
  });
  const filteredPackets = allPackets.filter((packet) => canPeerAccessPacket(requestingPeer, packet));
  const filteredTasks = allTasks.filter((task) => {
    if (task.proposerPeerId === requestingPeer.peerId || task.assigneePeerId === requestingPeer.peerId) return true;
    const relatedOutput = task.outputContextId ? filteredPackets.some((packet) => packet.contextId === task.outputContextId) : false;
    return relatedOutput;
  });
  const filteredMessages = recentMessages.filter((message) =>
    message.toPeerId === requestingPeer.peerId || message.fromPeerId === requestingPeer.peerId,
  );

  return {
    peers: filteredPeers,
    recentPackets: filteredPackets,
    recentTasks: filteredTasks,
    recentMessages: filteredMessages,
    counts: {
      activePeers: filteredPeers.filter((peer) => peer.status === "active").length,
      activePackets: filteredPackets.filter((packet) => packet.status === "active").length,
      invalidatedPackets: filteredPackets.filter((packet) => packet.status === "invalidated").length,
      openTasks: filteredTasks.filter((task) => task.status === "proposed" || task.status === "accepted").length,
      unreadMessages: filteredMessages.filter((message) => message.status === "unread").length,
    },
  };
}

export function getSharedContextScopedSnapshot(
  filters: SharedContextScopedSnapshotFilters = {},
): ReturnType<typeof getSharedContextSnapshot> {
  const snapshot = getSharedContextSnapshot(filters.limit ?? 10, filters.peerId ?? filters.requestingPeerId);

  const peers = filters.workspaceId
    ? snapshot.peers.filter((peer) => peer.workspaceId === filters.workspaceId)
    : snapshot.peers;

  const recentPackets = snapshot.recentPackets.filter((packet) => {
    if (filters.workspaceId && packet.workspaceId !== filters.workspaceId) return false;
    if (filters.contextType && packet.contextType !== filters.contextType) return false;
    if (filters.producerPeerId && packet.producerPeerId !== filters.producerPeerId) return false;
    if (filters.scopeIncludes && !packet.scope.includes(filters.scopeIncludes)) return false;
    if (
      filters.subjectIncludes &&
      !packet.subject.toLowerCase().includes(filters.subjectIncludes.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const recentTasks = snapshot.recentTasks.filter((task) =>
    taskMatchesSubscription(task, recentPackets, filters),
  );
  const recentMessages = snapshot.recentMessages.filter((message) =>
    messageMatchesSubscription(message, peers, filters),
  );

  return {
    peers,
    recentPackets,
    recentTasks,
    recentMessages,
    counts: {
      activePeers: peers.filter((peer) => peer.status === "active").length,
      activePackets: recentPackets.filter((packet) => packet.status === "active").length,
      invalidatedPackets: recentPackets.filter((packet) => packet.status === "invalidated").length,
      openTasks: recentTasks.filter((task) => task.status === "proposed" || task.status === "accepted").length,
      unreadMessages: recentMessages.filter((message) => message.status === "unread").length,
    },
  };
}
