import { randomUUID } from "node:crypto";
import { platform } from "node:os";

import type { McpTool } from "../types.js";
import { SyncBridgeClient } from "../sync/syncBridgeClient.js";
import {
  bindDeviceToAccount,
  enqueueSyncOperation,
  getActiveAccountBinding,
  getSyncBridgeStatus,
  linkDurableObjects,
  listPendingSyncOperations,
  recordExecutionReceipt,
  recordLocalArtifact,
  recordLocalOutcome,
  upsertDeviceBinding,
  upsertDurableObject,
} from "../sync/store.js";
import type { DurableObjectKind, SyncScope } from "../sync/protocol.js";

const FALLBACK_DEVICE_ID = process.env.NODEBENCH_DEVICE_ID ?? `device_${randomUUID()}`;

function defaultDeviceId(): string {
  return FALLBACK_DEVICE_ID;
}

export const syncBridgeTools: McpTool[] = [
  {
    name: "upsert_durable_object",
    description: "Register or update a durable local object so views, tools, workflows, runs, artifacts, and outcomes share one replayable identity spine.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        kind: { type: "string" },
        label: { type: "string" },
        source: { type: "string" },
        status: { type: "string" },
        metadata: { type: "object" },
        queueForSync: { type: "boolean" },
      },
      required: ["kind", "label"],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    handler: async (args: {
      id?: string;
      kind: DurableObjectKind | string;
      label: string;
      source?: string;
      status?: string;
      metadata?: Record<string, unknown>;
      queueForSync?: boolean;
    }) => upsertDurableObject(args),
  },
  {
    name: "link_durable_objects",
    description: "Create a durable relationship such as screen -> action, workflow -> run, run -> artifact, or outcome -> evidence.",
    inputSchema: {
      type: "object",
      properties: {
        fromId: { type: "string" },
        toId: { type: "string" },
        edgeType: { type: "string" },
        confidence: { type: "number" },
        metadata: { type: "object" },
        queueForSync: { type: "boolean" },
      },
      required: ["fromId", "toId", "edgeType"],
    },
    handler: async (args: {
      fromId: string;
      toId: string;
      edgeType: string;
      confidence?: number;
      metadata?: Record<string, unknown>;
      queueForSync?: boolean;
    }) => linkDurableObjects(args),
  },
  {
    name: "record_provenance_receipt",
    description: "Persist a durable execution receipt for a tool call, approval, verification, or other meaningful action.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string" },
        traceId: { type: "string" },
        stepId: { type: "string" },
        objectId: { type: "string" },
        toolName: { type: "string" },
        actionType: { type: "string" },
        summary: { type: "string" },
        input: {},
        output: {},
        status: { type: "string" },
        metadata: { type: "object" },
        queueForSync: { type: "boolean" },
      },
      required: ["actionType", "summary"],
    },
    handler: async (args: {
      runId?: string;
      traceId?: string;
      stepId?: string;
      objectId?: string;
      toolName?: string;
      actionType: string;
      summary: string;
      input?: unknown;
      output?: unknown;
      status?: string;
      metadata?: Record<string, unknown>;
      queueForSync?: boolean;
    }) => recordExecutionReceipt(args),
  },
  {
    name: "record_sync_artifact",
    description: "Persist a local artifact with verification state so it can be replayed, reviewed, and optionally synced to the web account.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string" },
        objectId: { type: "string" },
        kind: { type: "string" },
        path: { type: "string" },
        summary: { type: "string" },
        verificationStatus: { type: "string" },
        content: { type: "string" },
        metadata: { type: "object" },
        queueForSync: { type: "boolean" },
      },
      required: ["kind"],
    },
    handler: async (args: {
      runId?: string;
      objectId?: string;
      kind: string;
      path?: string;
      summary?: string;
      verificationStatus?: string;
      content?: string;
      metadata?: Record<string, unknown>;
      queueForSync?: boolean;
    }) => recordLocalArtifact(args),
  },
  {
    name: "record_sync_outcome",
    description: "Persist an outcome with user value, stakeholder value, evidence, and status so the system always resolves work to an inspectable result.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string" },
        objectId: { type: "string" },
        outcomeType: { type: "string" },
        headline: { type: "string" },
        userValue: { type: "string" },
        stakeholderValue: { type: "string" },
        status: { type: "string" },
        evidence: { type: "array", items: {} },
        metadata: { type: "object" },
        queueForSync: { type: "boolean" },
      },
      required: ["outcomeType", "headline"],
    },
    handler: async (args: {
      runId?: string;
      objectId?: string;
      outcomeType: string;
      headline: string;
      userValue?: string;
      stakeholderValue?: string;
      status?: string;
      evidence?: unknown[];
      metadata?: Record<string, unknown>;
      queueForSync?: boolean;
    }) => recordLocalOutcome(args),
  },
  {
    name: "bind_local_account",
    description: "Record explicit local pairing permission so this device can map durable local context to a specific web user and workspace.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string" },
        deviceName: { type: "string" },
        userId: { type: "string" },
        workspaceId: { type: "string" },
        bridgeUrl: { type: "string" },
        deviceToken: { type: "string" },
        scopes: { type: "array", items: { type: "string" } },
        syncEnabled: { type: "boolean" },
        syncMode: { type: "string" },
        metadata: { type: "object" },
      },
      required: ["deviceName", "userId", "scopes"],
    },
    handler: async (args: {
      deviceId?: string;
      deviceName: string;
      userId: string;
      workspaceId?: string;
      bridgeUrl?: string;
      deviceToken?: string;
      scopes: SyncScope[];
      syncEnabled?: boolean;
      syncMode?: "offline" | "connected" | "cloud";
      metadata?: Record<string, unknown>;
    }) => {
      const deviceId = args.deviceId ?? defaultDeviceId();
      upsertDeviceBinding({
        deviceId,
        deviceName: args.deviceName,
        platform: platform(),
        bridgeUrl: args.bridgeUrl,
        deviceToken: args.deviceToken,
        bindingStatus: args.deviceToken ? "paired" : "unpaired",
        metadata: args.metadata,
      });
      const binding = bindDeviceToAccount({
        deviceId,
        userId: args.userId,
        workspaceId: args.workspaceId,
        scopes: args.scopes,
        syncEnabled: args.syncEnabled,
        syncMode: args.syncMode,
        metadata: args.metadata,
      });
      return {
        ...binding,
        deviceId,
      };
    },
  },
  {
    name: "get_sync_bridge_status",
    description: "Inspect whether the device is local-only, connected but idle, or actively ready to sync to a paired web account.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string" },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    handler: async (args: { deviceId?: string }) => getSyncBridgeStatus(args.deviceId),
  },
  {
    name: "list_pending_sync_operations",
    description: "List queued outbound sync operations that still need to be pushed to the web account.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    handler: async (args: { limit?: number }) => {
      const operations = listPendingSyncOperations(args.limit ?? 25);
      return {
        count: operations.length,
        operations,
      };
    },
  },
  {
    name: "queue_sync_operation",
    description: "Queue an explicit outbound sync operation when a custom workflow needs to push metadata, receipts, or approvals into the account history.",
    inputSchema: {
      type: "object",
      properties: {
        objectId: { type: "string" },
        objectKind: { type: "string" },
        opType: { type: "string" },
        payload: { type: "object" },
      },
      required: ["objectKind", "opType", "payload"],
    },
    handler: async (args: {
      objectId?: string;
      objectKind: DurableObjectKind | string;
      opType: string;
      payload: Record<string, unknown>;
    }) => enqueueSyncOperation({
      objectId: args.objectId ?? null,
      objectKind: args.objectKind,
      opType: args.opType,
      payload: args.payload,
    }),
  },
  {
    name: "run_sync_bridge_flush",
    description: "Open the outbound websocket bridge, pair or resume the local device, and flush pending approved operations to the paired web account.",
    inputSchema: {
      type: "object",
      properties: {
        bridgeUrl: { type: "string" },
        pairingCode: { type: "string" },
        deviceId: { type: "string" },
        deviceName: { type: "string" },
        deviceToken: { type: "string" },
        requestedScopes: { type: "array", items: { type: "string" } },
        limit: { type: "number" },
        appVersion: { type: "string" },
      },
      required: ["bridgeUrl", "deviceName"],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    handler: async (args: {
      bridgeUrl: string;
      pairingCode?: string;
      deviceId?: string;
      deviceName: string;
      deviceToken?: string;
      requestedScopes?: SyncScope[];
      limit?: number;
      appVersion?: string;
    }) => {
      const client = new SyncBridgeClient({
        bridgeUrl: args.bridgeUrl,
        pairingCode: args.pairingCode,
        deviceId: args.deviceId ?? defaultDeviceId(),
        deviceName: args.deviceName,
        deviceToken: args.deviceToken,
        requestedScopes: args.requestedScopes,
        platform: platform(),
        appVersion: args.appVersion,
      });
      const result = await client.flushPendingQueue(args.limit ?? 50);
      return {
        ...result,
        activeBinding: getActiveAccountBinding(args.deviceId ?? defaultDeviceId()),
      };
    },
  },
];
