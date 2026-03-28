import type { McpTool } from "../types.js";
import {
  acceptSharedContextTask,
  acknowledgeSharedContextPacket,
  completeSharedContextTask,
  escalateSharedContextTask,
  getSharedContextPeer,
  getSharedContextSnapshot,
  heartbeatSharedContextPeer,
  invalidateSharedContextPacket,
  listSharedContextMessages,
  listSharedContextPeers,
  proposeSharedContextTask,
  publishSharedContextPacket,
  pullSharedContextPackets,
  registerSharedContextPeer,
  rejectSharedContextTask,
  sendSharedContextMessage,
} from "../sync/store.js";

export const sharedContextTools: McpTool[] = [
  {
    name: "register_shared_context_peer",
    description: "Register a scoped peer with product, role, surface, capabilities, and heartbeat metadata for shared-context coordination.",
    inputSchema: {
      type: "object",
      properties: {
        peerId: { type: "string" },
        product: { type: "string", enum: ["nodebench", "ta_studio"] },
        tenantId: { type: "string" },
        workspaceId: { type: "string" },
        surface: { type: "string" },
        role: { type: "string" },
        capabilities: { type: "array", items: { type: "string" } },
        contextScopes: { type: "array", items: { type: "string" } },
        status: { type: "string" },
        summary: { type: "object" },
        metadata: { type: "object" },
        queueForSync: { type: "boolean" },
      },
      required: ["product", "surface", "role"],
    },
    handler: async (args) => registerSharedContextPeer(args as any),
  },
  {
    name: "heartbeat_shared_context_peer",
    description: "Refresh peer liveness and optionally publish a compact machine-readable summary of its current work.",
    inputSchema: {
      type: "object",
      properties: {
        peerId: { type: "string" },
        summary: { type: "object" },
      },
      required: ["peerId"],
    },
    handler: async (args: { peerId: string; summary?: Record<string, unknown> }) =>
      heartbeatSharedContextPeer(args.peerId, args.summary as any),
  },
  {
    name: "list_shared_context_peers",
    description: "List peers by product, workspace, role, surface, capability, or scope.",
    inputSchema: {
      type: "object",
      properties: {
        product: { type: "string" },
        workspaceId: { type: "string" },
        tenantId: { type: "string" },
        role: { type: "string" },
        surface: { type: "string" },
        status: { type: "string" },
        capability: { type: "string" },
        scope: { type: "string" },
        limit: { type: "number" },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    handler: async (args) => {
      const peers = listSharedContextPeers(args as any);
      return { count: peers.length, peers };
    },
  },
  {
    name: "get_shared_context_peer",
    description: "Fetch one peer and its current summary, capabilities, and scopes.",
    inputSchema: {
      type: "object",
      properties: {
        peerId: { type: "string" },
      },
      required: ["peerId"],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    handler: async (args: { peerId: string }) => getSharedContextPeer(args.peerId),
  },
  {
    name: "publish_shared_context",
    description: "Publish a structured shared-context packet with subject, claims, evidence refs, freshness, permissions, and lineage.",
    inputSchema: {
      type: "object",
      properties: {
        contextId: { type: "string" },
        contextType: { type: "string" },
        producerPeerId: { type: "string" },
        tenantId: { type: "string" },
        workspaceId: { type: "string" },
        scope: { type: "array", items: { type: "string" } },
        subject: { type: "string" },
        summary: { type: "string" },
        claims: { type: "array", items: { type: "string" } },
        evidenceRefs: { type: "array", items: { type: "string" } },
        stateSnapshot: { type: "object" },
        timeWindow: { type: "object" },
        freshness: { type: "object" },
        permissions: { type: "object" },
        confidence: { type: "number" },
        lineage: { type: "object" },
        invalidates: { type: "array", items: { type: "string" } },
        nextActions: { type: "array", items: { type: "string" } },
        version: { type: "number" },
        status: { type: "string" },
        metadata: { type: "object" },
        queueForSync: { type: "boolean" },
      },
      required: ["contextType", "producerPeerId", "subject", "summary"],
    },
    handler: async (args) => publishSharedContextPacket(args as any),
  },
  {
    name: "pull_shared_context",
    description: "Pull shared-context packets by type, producer, scope, workspace, status, or subject substring.",
    inputSchema: {
      type: "object",
      properties: {
        contextType: { type: "string" },
        producerPeerId: { type: "string" },
        requestingPeerId: { type: "string" },
        tenantId: { type: "string" },
        workspaceId: { type: "string" },
        status: { type: "string" },
        scopeIncludes: { type: "string" },
        subjectIncludes: { type: "string" },
        limit: { type: "number" },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    handler: async (args) => {
      const packets = pullSharedContextPackets(args as any);
      return { count: packets.length, packets };
    },
  },
  {
    name: "ack_shared_context",
    description: "Acknowledge that a peer received and accepted a context packet.",
    inputSchema: {
      type: "object",
      properties: {
        contextId: { type: "string" },
        peerId: { type: "string" },
        detail: { type: "object" },
      },
      required: ["contextId", "peerId"],
    },
    handler: async (args: { contextId: string; peerId: string; detail?: Record<string, unknown> }) =>
      acknowledgeSharedContextPacket(args.contextId, args.peerId, args.detail),
  },
  {
    name: "invalidate_shared_context",
    description: "Invalidate a packet when it becomes stale, contradicted, or superseded.",
    inputSchema: {
      type: "object",
      properties: {
        contextId: { type: "string" },
        producerPeerId: { type: "string" },
        reason: { type: "string" },
        invalidates: { type: "array", items: { type: "string" } },
      },
      required: ["contextId", "producerPeerId", "reason"],
    },
    handler: async (args: { contextId: string; producerPeerId: string; reason: string; invalidates?: string[] }) =>
      invalidateSharedContextPacket(args.contextId, args.producerPeerId, args.reason, args.invalidates ?? []),
  },
  {
    name: "send_peer_message",
    description: "Send a direct structured message to a peer without routing everything through a central orchestrator.",
    inputSchema: {
      type: "object",
      properties: {
        fromPeerId: { type: "string" },
        toPeerId: { type: "string" },
        messageClass: { type: "string" },
        payload: { type: "object" },
        queueForSync: { type: "boolean" },
      },
      required: ["fromPeerId", "toPeerId", "messageClass", "payload"],
    },
    handler: async (args: {
      fromPeerId: string;
      toPeerId: string;
      messageClass: string;
      payload: Record<string, unknown>;
      queueForSync?: boolean;
    }) => sendSharedContextMessage(args as any),
  },
  {
    name: "check_peer_messages",
    description: "Read the direct messages for a peer, optionally restricting to unread items.",
    inputSchema: {
      type: "object",
      properties: {
        peerId: { type: "string" },
        unreadOnly: { type: "boolean" },
      },
      required: ["peerId"],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    handler: async (args: { peerId: string; unreadOnly?: boolean }) => {
      const messages = listSharedContextMessages(args.peerId, args.unreadOnly ?? false);
      return { count: messages.length, messages };
    },
  },
  {
    name: "propose_shared_task",
    description: "Propose a task handoff between peers with input contexts and required output packet shape.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        taskType: { type: "string" },
        proposerPeerId: { type: "string" },
        assigneePeerId: { type: "string" },
        status: { type: "string" },
        taskSpec: { type: "object" },
        inputContextIds: { type: "array", items: { type: "string" } },
        outputContextId: { type: "string" },
        reason: { type: "string" },
        metadata: { type: "object" },
        queueForSync: { type: "boolean" },
      },
      required: ["taskType", "proposerPeerId", "assigneePeerId"],
    },
    handler: async (args) => proposeSharedContextTask(args as any),
  },
  {
    name: "accept_shared_task",
    description: "Accept a proposed shared-context task.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        peerId: { type: "string" },
      },
      required: ["taskId", "peerId"],
    },
    handler: async (args: { taskId: string; peerId: string }) => acceptSharedContextTask(args.taskId, args.peerId),
  },
  {
    name: "reject_shared_task",
    description: "Reject a proposed shared-context task with a reason.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        peerId: { type: "string" },
        reason: { type: "string" },
      },
      required: ["taskId", "peerId", "reason"],
    },
    handler: async (args: { taskId: string; peerId: string; reason: string }) =>
      rejectSharedContextTask(args.taskId, args.peerId, args.reason),
  },
  {
    name: "complete_shared_task",
    description: "Complete a shared-context task and attach the output packet if one was produced.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        peerId: { type: "string" },
        outputContextId: { type: "string" },
      },
      required: ["taskId", "peerId"],
    },
    handler: async (args: { taskId: string; peerId: string; outputContextId?: string }) =>
      completeSharedContextTask(args.taskId, args.peerId, args.outputContextId),
  },
  {
    name: "escalate_shared_task",
    description: "Escalate a shared-context task when the assignee cannot complete it cleanly.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        peerId: { type: "string" },
        reason: { type: "string" },
        outputContextId: { type: "string" },
      },
      required: ["taskId", "peerId", "reason"],
    },
    handler: async (args: { taskId: string; peerId: string; reason: string; outputContextId?: string }) =>
      escalateSharedContextTask(args.taskId, args.peerId, args.reason, args.outputContextId),
  },
  {
    name: "get_shared_context_snapshot",
    description: "Inspect the current shared-context protocol state: peers, packets, handoffs, messages, and aggregate counts.",
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
    handler: async (args: { limit?: number }) => getSharedContextSnapshot(args.limit ?? 10),
  },
];
