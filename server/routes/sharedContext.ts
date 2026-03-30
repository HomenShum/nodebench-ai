import { Router } from "express";

import {
  buildSharedContextSubscriptionManifest,
  getSharedContextEventBus,
  getSharedContextPacket,
  getSharedContextPacketResource,
  getSharedContextScopedSnapshot,
  getSharedContextSnapshot,
  proposeSharedContextTask,
  publishSharedContextPacket,
  registerSharedContextPeer,
} from "../../packages/mcp-local/src/sync/store.js";

import {
  getPacketConvex,
  getSnapshotConvex,
  isConvexAvailable,
  proposeTaskConvex,
  publishPacketConvex,
  registerPeerConvex,
} from "./sharedContextConvex.js";

/**
 * When running on Vercel with CONVEX_URL set, use Convex for durable persistence.
 * On local dev, continue using the fast SQLite path.
 */
const useConvex = (): boolean => !!(process.env.VERCEL && isConvexAvailable());

type SharedContextDelegateTarget = "claude_code" | "openclaw";

type IncomingResultPacket = {
  query?: string;
  entityName?: string;
  canonicalEntity?: string;
  answer?: string;
  confidence?: number;
  proofStatus?: string;
  packetId?: string;
  packetType?: string;
  sourceRefs?: Array<{
    id?: string;
    href?: string;
    label?: string;
    title?: string;
  }>;
  answerBlocks?: Array<{
    id?: string;
    text?: string;
    title?: string;
  }>;
  changes?: Array<{ description?: string }>;
  risks?: Array<{ title?: string; description?: string }>;
  interventions?: Array<{ action?: string }>;
  nextQuestions?: string[];
  recommendedNextAction?: string;
  strategicAngles?: Array<{
    id?: string;
    title?: string;
    status?: string;
    summary?: string;
    whyItMatters?: string;
    evidenceRefIds?: string[];
    nextQuestion?: string;
  }>;
};

const WEB_PRODUCER_PEER_ID = "peer:web:control_plane";
const DELEGATE_TARGETS: Record<
  SharedContextDelegateTarget,
  { peerId: string; label: string; installCommand: string }
> = {
  claude_code: {
    peerId: "peer:delegate:claude_code",
    label: "Claude Code",
    installCommand: "claude mcp add nodebench -- npx -y nodebench-mcp",
  },
  openclaw: {
    peerId: "peer:delegate:openclaw",
    label: "OpenClaw",
    installCommand: "npx -y nodebench-mcp",
  },
};

type SnapshotFilters = {
  peerId?: string;
  workspaceId?: string;
  contextType?: string;
  producerPeerId?: string;
  scopeIncludes?: string;
  subjectIncludes?: string;
  taskType?: string;
  messageClass?: string;
  eventTypes?: string[];
};

type StrategicAngle = NonNullable<IncomingResultPacket["strategicAngles"]>[number];

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function parseSnapshotFilters(query: Record<string, unknown>): SnapshotFilters {
  const peerId = firstQueryValue(query.peerId);
  const workspaceId = firstQueryValue(query.workspaceId);
  const contextType = firstQueryValue(query.contextType);
  const producerPeerId = firstQueryValue(query.producerPeerId);
  const scopeIncludes = firstQueryValue(query.scopeIncludes);
  const subjectIncludes = firstQueryValue(query.subjectIncludes);
  const taskType = firstQueryValue(query.taskType);
  const messageClass = firstQueryValue(query.messageClass);
  const eventTypesRaw = firstQueryValue(query.eventTypes);
  return {
    peerId,
    workspaceId,
    contextType,
    producerPeerId,
    scopeIncludes,
    subjectIncludes,
    taskType,
    messageClass,
    eventTypes: eventTypesRaw
      ? eventTypesRaw.split(",").map((value) => value.trim()).filter(Boolean)
      : undefined,
  };
}

function filterSnapshot(snapshot: ReturnType<typeof getSharedContextSnapshot>, filters: SnapshotFilters) {
  const peers = filters.workspaceId
    ? snapshot.peers.filter((peer) => peer.workspaceId === filters.workspaceId)
    : snapshot.peers;
  const recentPackets = snapshot.recentPackets.filter((packet) => {
    if (filters.workspaceId && packet.workspaceId !== filters.workspaceId) return false;
    if (filters.contextType && packet.contextType !== filters.contextType) return false;
    if (filters.producerPeerId && packet.producerPeerId !== filters.producerPeerId) return false;
    if (filters.scopeIncludes && !packet.scope.includes(filters.scopeIncludes)) return false;
    if (filters.subjectIncludes && !packet.subject.toLowerCase().includes(filters.subjectIncludes.toLowerCase())) return false;
    return true;
  });
  const recentTasks = snapshot.recentTasks.filter((task) => {
    if (filters.taskType && task.taskType !== filters.taskType) return false;
    if (!filters.workspaceId) return true;
    return recentPackets.some((packet) => packet.contextId === task.outputContextId)
      || snapshot.peers.some((peer) => peer.peerId === task.proposerPeerId && peer.workspaceId === filters.workspaceId)
      || snapshot.peers.some((peer) => peer.peerId === task.assigneePeerId && peer.workspaceId === filters.workspaceId);
  });
  const recentMessages = snapshot.recentMessages.filter((message) => {
    if (filters.messageClass && message.messageClass !== filters.messageClass) return false;
    if (!filters.workspaceId) return true;
    return peers.some((peer) => peer.peerId === message.fromPeerId || peer.peerId === message.toPeerId);
  });

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

function eventMatchesFilters(event: Record<string, unknown>, filters: SnapshotFilters): boolean {
  const type = typeof event.type === "string" ? event.type : "";
  if (filters.eventTypes && filters.eventTypes.length > 0 && !filters.eventTypes.includes(type)) {
    return false;
  }

  const payload = typeof event.payload === "object" && event.payload ? event.payload as Record<string, unknown> : {};
  const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId : undefined;
  const contextType = typeof payload.contextType === "string" ? payload.contextType : undefined;
  const contextId = typeof payload.contextId === "string" ? payload.contextId : undefined;
  const producerPeerId = typeof payload.producerPeerId === "string" ? payload.producerPeerId : undefined;
  const taskType = typeof payload.taskType === "string" ? payload.taskType : undefined;
  const messageClass = typeof payload.messageClass === "string" ? payload.messageClass : undefined;

  if (filters.workspaceId && workspaceId && workspaceId !== filters.workspaceId) {
    return false;
  }
  if (filters.contextType && contextType && contextType !== filters.contextType) {
    return false;
  }
  if (filters.producerPeerId && producerPeerId && producerPeerId !== filters.producerPeerId) {
    return false;
  }
  if (filters.taskType && taskType && taskType !== filters.taskType) {
    return false;
  }
  if (filters.messageClass && messageClass && messageClass !== filters.messageClass) {
    return false;
  }
  if (filters.subjectIncludes && contextId && filters.peerId) {
    let packet = null;
    try {
      packet = getSharedContextPacket(contextId, filters.peerId);
    } catch {
      return false;
    }
    if (!packet || !packet.subject.toLowerCase().includes(filters.subjectIncludes.toLowerCase())) {
      return false;
    }
  } else if (filters.subjectIncludes && typeof payload.subject === "string") {
    if (!payload.subject.toLowerCase().includes(filters.subjectIncludes.toLowerCase())) return false;
  }

  if (filters.peerId && contextId) {
    let packet = null;
    try {
      packet = getSharedContextPacket(contextId, filters.peerId);
    } catch {
      return false;
    }
    if (!packet) return false;
    if (filters.scopeIncludes && !packet.scope.includes(filters.scopeIncludes)) {
      return false;
    }
  }

  return true;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function summarizePacket(packet: IncomingResultPacket): string {
  const answer = typeof packet.answer === "string" ? packet.answer.trim() : "";
  const change = packet.changes?.[0]?.description?.trim();
  const risk = packet.risks?.[0]?.title?.trim();
  const lines = [answer, change ? `Change: ${change}` : "", risk ? `Contradiction: ${risk}` : ""].filter(Boolean);
  return lines.join(" ").slice(0, 600);
}

function collectClaims(packet: IncomingResultPacket): string[] {
  const claims = [
    ...(packet.answerBlocks ?? []).map((block) => block.text ?? block.title ?? "").filter(Boolean),
    ...(packet.changes ?? []).map((change) => change.description ?? "").filter(Boolean),
    ...(packet.risks ?? []).map((risk) => risk.title ?? risk.description ?? "").filter(Boolean),
  ];
  return claims.slice(0, 12);
}

function collectEvidenceRefs(packet: IncomingResultPacket): string[] {
  const refs = (packet.sourceRefs ?? []).map((source) => source.href ?? source.id ?? source.label ?? source.title ?? "").filter(Boolean);
  return Array.from(new Set(refs)).slice(0, 12);
}

function getWorkspaceId(packet: IncomingResultPacket): string {
  const base = packet.canonicalEntity ?? packet.entityName ?? "nodebench";
  return `workspace:${slugify(base) || "nodebench"}`;
}

function getContextId(packet: IncomingResultPacket): string {
  return `context:${packet.packetId ?? slugify(`${packet.canonicalEntity ?? packet.entityName ?? "nodebench"}-${packet.query ?? "query"}`)}`;
}

function getTaskId(packet: IncomingResultPacket, target: SharedContextDelegateTarget): string {
  return `task:${target}:${packet.packetId ?? slugify(`${packet.canonicalEntity ?? packet.entityName ?? "nodebench"}-${packet.query ?? "query"}`)}`;
}

function getStrategicTaskId(
  packet: IncomingResultPacket,
  target: SharedContextDelegateTarget,
  angle: StrategicAngle,
): string {
  return `${getTaskId(packet, target)}:${slugify(angle.id ?? angle.title ?? "issue")}`;
}

function getSubject(packet: IncomingResultPacket): string {
  const entity = packet.canonicalEntity ?? packet.entityName ?? "NodeBench";
  return `${entity} shared context packet`;
}

function normalizeStrategicAngles(packet: IncomingResultPacket): StrategicAngle[] {
  return Array.isArray(packet.strategicAngles) ? packet.strategicAngles.filter(Boolean) : [];
}

function findStrategicAngle(packet: IncomingResultPacket, strategicAngleId?: string): StrategicAngle | null {
  if (!strategicAngleId) return null;
  return normalizeStrategicAngles(packet).find((angle) => angle.id === strategicAngleId) ?? null;
}

function getStrategicContextId(packet: IncomingResultPacket, angle: StrategicAngle): string {
  return `${getContextId(packet)}:issue:${slugify(angle.id ?? angle.title ?? "issue")}`;
}

function getStrategicSubject(packet: IncomingResultPacket, angle: StrategicAngle): string {
  const entity = packet.canonicalEntity ?? packet.entityName ?? "NodeBench";
  return `${entity} · ${angle.title ?? "Strategic issue"}`;
}

function getFreshness(packet: IncomingResultPacket) {
  const proofStatus = packet.proofStatus ?? "provisional";
  const trustTier =
    proofStatus === "verified" ? "verified" : proofStatus === "drifting" ? "directional" : "internal";
  return {
    status: proofStatus === "drifting" ? "warming" : "fresh",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    trustTier,
  };
}

function buildHandoffPrompt(args: {
  packet: IncomingResultPacket;
  contextId: string;
  taskId: string;
  target: SharedContextDelegateTarget;
  goal: string;
  subject?: string;
  parentContextId?: string | null;
}): string {
  const target = DELEGATE_TARGETS[args.target];
  const entity = args.packet.canonicalEntity ?? args.packet.entityName ?? "the company";
  const workspaceId = getWorkspaceId(args.packet);
  const subject = args.subject ?? getSubject(args.packet);
  return [
    `Use NodeBench MCP as the truth layer for this task. You are the ${target.label} worker.`,
    "",
    `Goal: ${args.goal}`,
    `Workspace: ${workspaceId}`,
    `Shared context packet: ${args.contextId}`,
    ...(args.parentContextId ? [`Parent packet: ${args.parentContextId}`] : []),
    `Shared task: ${args.taskId}`,
    "",
    "Workflow:",
    `1. Ensure NodeBench MCP is installed: ${target.installCommand}`,
    `2. Pull the packet with pull_shared_context using {"workspaceId":"${workspaceId}","subjectIncludes":"${subject}","limit":1}.`,
    "3. Use get_shared_context_snapshot if you need to inspect recent packets and task handoffs.",
    `4. Treat ${entity} as the canonical subject. Do not restate or re-infer the company from scratch unless the packet is contradicted.`,
    "5. Execute the requested implementation, keeping changes tied to the packet's next action and contradictions.",
    "6. When done, publish any updated packet or verdict back through NodeBench MCP so the shared truth stays current.",
  ].join("\n");
}

function registerWebPeer(packet: IncomingResultPacket) {
  registerSharedContextPeer({
    peerId: WEB_PRODUCER_PEER_ID,
    product: "nodebench",
    workspaceId: getWorkspaceId(packet),
    surface: "web",
    role: "router",
    capabilities: ["can-publish-packet", "can-propose-task", "can-package-truth"],
    contextScopes: ["workspace", "entity", "packet"],
    summary: {
      currentTask: `Packaging ${packet.canonicalEntity ?? packet.entityName ?? "NodeBench"} for delegation`,
      focusEntity: packet.canonicalEntity ?? packet.entityName ?? "NodeBench",
      currentState: "packet_ready",
      confidence: typeof packet.confidence === "number" ? packet.confidence / 100 : undefined,
    },
    metadata: {
      packetId: packet.packetId ?? null,
      packetType: packet.packetType ?? null,
    },
    queueForSync: false,
  });
}

function registerDelegatePeer(packet: IncomingResultPacket, target: SharedContextDelegateTarget) {
  const mapping = DELEGATE_TARGETS[target];
  registerSharedContextPeer({
    peerId: mapping.peerId,
    product: "nodebench",
    workspaceId: getWorkspaceId(packet),
    surface: "api",
    role: "compiler",
    capabilities: ["can-build", "can-execute", "can-complete-task"],
    contextScopes: ["workspace", "entity", "packet"],
    status: "idle",
    summary: {
      currentTask: `Awaiting ${mapping.label} handoff`,
      focusEntity: packet.canonicalEntity ?? packet.entityName ?? "NodeBench",
      currentState: "waiting_for_packet",
    },
    metadata: {
      targetAgent: target,
      targetLabel: mapping.label,
    },
    queueForSync: false,
  });
}

function buildPacketResourceHints(contextId: string, packet: IncomingResultPacket, peerId?: string) {
  const resource = getSharedContextPacketResource(contextId, peerId);
  if (resource) {
    return {
      resourceUri: resource.resourceUri,
      pullQuery: resource.pullQuery,
      subscriptionQuery: resource.subscriptionQuery,
    };
  }
  return {
    resourceUri: `shared-context://packet/${encodeURIComponent(contextId)}`,
    pullQuery: {
      contextType: "entity_packet",
      producerPeerId: WEB_PRODUCER_PEER_ID,
      workspaceId: getWorkspaceId(packet),
      subjectIncludes: getSubject(packet),
    },
    subscriptionQuery: {
      peerId: peerId ?? undefined,
      workspaceId: getWorkspaceId(packet),
      contextType: "entity_packet",
      producerPeerId: WEB_PRODUCER_PEER_ID,
      subjectIncludes: getSubject(packet),
      eventTypes: ["packet_published", "packet_invalidated", "task_proposed", "task_status_changed"],
    },
  };
}

function buildSubscriptionManifestUrls(
  req: Request,
  filters: SnapshotFilters,
): {
  snapshotUrl: string;
  eventsUrl: string;
} {
  const params = new URLSearchParams();
  if (filters.peerId) params.set("peerId", filters.peerId);
  if (filters.workspaceId) params.set("workspaceId", filters.workspaceId);
  if (filters.contextType) params.set("contextType", filters.contextType);
  if (filters.producerPeerId) params.set("producerPeerId", filters.producerPeerId);
  if (filters.scopeIncludes) params.set("scopeIncludes", filters.scopeIncludes);
  if (filters.subjectIncludes) params.set("subjectIncludes", filters.subjectIncludes);
  if (filters.taskType) params.set("taskType", filters.taskType);
  if (filters.messageClass) params.set("messageClass", filters.messageClass);
  if (filters.eventTypes?.length) params.set("eventTypes", filters.eventTypes.join(","));
  params.set("limit", "10");
  const query = params.toString();
  const base = `${req.protocol}://${req.get("host")}/api/shared-context`;
  return {
    snapshotUrl: `${base}/snapshot?${query}`,
    eventsUrl: `${base}/events?${query}`,
  };
}

function buildStrategicIssuePayload(args: {
  packet: IncomingResultPacket;
  angle: StrategicAngle;
  target?: SharedContextDelegateTarget;
}): Parameters<typeof publishSharedContextPacket>[0] {
  const { packet, angle, target } = args;
  const entitySlug = slugify(packet.canonicalEntity ?? packet.entityName ?? "nodebench");
  const workspaceId = getWorkspaceId(packet);
  const parentContextId = getContextId(packet);
  const matchedSourceRefs = (packet.sourceRefs ?? [])
    .filter((source) => (angle.evidenceRefIds ?? []).includes(String(source.id ?? "")))
    .map((source) => source.href ?? source.label ?? source.title ?? source.id ?? "")
    .filter(Boolean);

  return {
    contextId: getStrategicContextId(packet, angle),
    contextType: "issue_packet",
    producerPeerId: WEB_PRODUCER_PEER_ID,
    workspaceId,
    scope: [
      "workspace",
      `entity:${entitySlug}`,
      "pressure_test",
      `issue:${slugify(angle.id ?? angle.title ?? "issue")}`,
      ...(target ? [`delegate:${target}`] : []),
    ],
    subject: getStrategicSubject(packet, angle),
    summary: angle.summary ?? packet.recommendedNextAction ?? summarizePacket(packet),
    claims: [
      angle.summary ?? "",
      angle.whyItMatters ?? "",
      angle.nextQuestion ?? "",
    ].filter(Boolean),
    evidenceRefs: matchedSourceRefs.length > 0 ? matchedSourceRefs : collectEvidenceRefs(packet),
    stateSnapshot: {
      angle,
      parentPacketId: packet.packetId ?? null,
      parentContextId,
      packet,
    },
    freshness: getFreshness(packet),
    permissions: {
      visibility: "workspace",
      allowedRoles: ["researcher", "compiler", "judge", "router", "monitor"],
    },
    confidence:
      typeof packet.confidence === "number"
        ? Math.max(0, Math.min(1, packet.confidence / 100))
        : undefined,
    lineage: {
      parentContextIds: [parentContextId],
      sourceRunId: typeof packet.packetId === "string" ? packet.packetId : undefined,
    },
    nextActions: [
      angle.nextQuestion ?? "",
      packet.recommendedNextAction ?? "",
      ...(packet.nextQuestions ?? []).slice(0, 2),
    ].filter(Boolean).slice(0, 4),
    metadata: {
      packetId: packet.packetId ?? null,
      packetType: packet.packetType ?? null,
      proofStatus: packet.proofStatus ?? null,
      strategicAngleId: angle.id ?? null,
      strategicAngleStatus: angle.status ?? null,
      strategicAngleTitle: angle.title ?? null,
      targetAgent: target ?? null,
    },
    queueForSync: false,
  };
}

export function createSharedContextRouter(): Router {
  const router = Router();

  router.get("/snapshot", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = typeof rawLimit === "string" ? Number.parseInt(rawLimit, 10) : 10;
    const safeLim = Number.isFinite(limit) && limit > 0 ? limit : 10;
    const filters = parseSnapshotFilters(req.query as Record<string, unknown>);

    if (useConvex()) {
      try {
        const snapshot = await getSnapshotConvex(safeLim, filters.peerId);
        return res.json({ success: true, snapshot, peerId: filters.peerId ?? null, filters });
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    try {
      return res.json({
        success: true,
        snapshot: getSharedContextScopedSnapshot({
          peerId: filters.peerId,
          workspaceId: filters.workspaceId,
          contextType: filters.contextType as any,
          producerPeerId: filters.producerPeerId,
          scopeIncludes: filters.scopeIncludes,
          subjectIncludes: filters.subjectIncludes,
          taskType: filters.taskType,
          messageClass: filters.messageClass as any,
          limit: safeLim,
        }),
        peerId: filters.peerId ?? null,
        filters,
      });
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.get("/peers/:peerId/snapshot", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = typeof rawLimit === "string" ? Number.parseInt(rawLimit, 10) : 10;
    const safeLim = Number.isFinite(limit) && limit > 0 ? limit : 10;
    const filters = parseSnapshotFilters(req.query as Record<string, unknown>);
    const peerId = req.params.peerId;

    try {
      if (useConvex()) {
        const snapshot = await getSnapshotConvex(safeLim, peerId);
        return res.json({
          success: true,
          snapshot: filterSnapshot(snapshot as ReturnType<typeof getSharedContextSnapshot>, {
            ...filters,
            peerId,
          }),
          peerId,
          filters: { ...filters, peerId },
        });
      }

      return res.json({
        success: true,
        snapshot: getSharedContextScopedSnapshot({
          peerId,
          workspaceId: filters.workspaceId,
          contextType: filters.contextType as any,
          producerPeerId: filters.producerPeerId,
          scopeIncludes: filters.scopeIncludes,
          subjectIncludes: filters.subjectIncludes,
          taskType: filters.taskType,
          messageClass: filters.messageClass as any,
          limit: safeLim,
        }),
        peerId,
        filters: { ...filters, peerId },
      });
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.get("/subscriptions/manifest", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = typeof rawLimit === "string" ? Number.parseInt(rawLimit, 10) : 10;
    const safeLim = Number.isFinite(limit) && limit > 0 ? limit : 10;
    const filters = parseSnapshotFilters(req.query as Record<string, unknown>);

    try {
      if (useConvex()) {
        const snapshot = filterSnapshot(
          await getSnapshotConvex(safeLim, filters.peerId),
          filters,
        );
        return res.json({
          success: true,
          manifest: {
            peerId: filters.peerId ?? null,
            snapshotQuery: {
              limit: safeLim,
              peerId: filters.peerId,
              workspaceId: filters.workspaceId,
              contextType: filters.contextType,
              producerPeerId: filters.producerPeerId,
              scopeIncludes: filters.scopeIncludes,
              subjectIncludes: filters.subjectIncludes,
              taskType: filters.taskType,
              messageClass: filters.messageClass,
            },
            pullQuery: {
              contextType: filters.contextType,
              producerPeerId: filters.producerPeerId,
              requestingPeerId: filters.peerId,
              workspaceId: filters.workspaceId,
              scopeIncludes: filters.scopeIncludes,
              subjectIncludes: filters.subjectIncludes,
              limit: safeLim,
            },
            subscriptionQuery: {
              peerId: filters.peerId,
              workspaceId: filters.workspaceId,
              contextType: filters.contextType,
              producerPeerId: filters.producerPeerId,
              scopeIncludes: filters.scopeIncludes,
              subjectIncludes: filters.subjectIncludes,
              taskType: filters.taskType,
              messageClass: filters.messageClass,
              eventTypes: filters.eventTypes ?? [
                "packet_published",
                "packet_invalidated",
                "packet_acknowledged",
                "task_proposed",
                "task_status_changed",
                "message_sent",
              ],
            },
            packetResources: snapshot.recentPackets.map((packet) => ({
              contextId: String(packet.contextId),
              contextType: String(packet.contextType),
              subject: String(packet.subject),
              resourceUri: `shared-context://packet/${encodeURIComponent(String(packet.contextId))}`,
            })),
          },
          urls: buildSubscriptionManifestUrls(req, filters),
        });
      }

      const manifest = buildSharedContextSubscriptionManifest({
        peerId: filters.peerId,
        workspaceId: filters.workspaceId,
        contextType: filters.contextType as any,
        producerPeerId: filters.producerPeerId,
        scopeIncludes: filters.scopeIncludes,
        subjectIncludes: filters.subjectIncludes,
        taskType: filters.taskType,
        messageClass: filters.messageClass as any,
        eventTypes: filters.eventTypes,
        limit: safeLim,
      });

      return res.json({
        success: true,
        manifest,
        urls: buildSubscriptionManifestUrls(req, filters),
      });
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.get("/packets/:contextId", async (req, res) => {
    const peerId = firstQueryValue(req.query.peerId);
    try {
      const packet = useConvex()
        ? await getPacketConvex(req.params.contextId)
        : getSharedContextPacket(req.params.contextId, peerId);
      if (!packet) {
        return res.status(404).json({
          success: false,
          message: "Shared context packet not found or not visible in the requested scope.",
        });
      }
      return res.json({
        success: true,
        packet,
        resourceUri: `shared-context://packet/${encodeURIComponent(packet.contextId)}`,
        pullQuery: {
          contextType: packet.contextType,
          producerPeerId: packet.producerPeerId,
          workspaceId: packet.workspaceId ?? undefined,
          tenantId: packet.tenantId ?? undefined,
          scopeIncludes: packet.scope.find((scope) => scope !== "workspace"),
          subjectIncludes: packet.subject,
        },
        subscriptionQuery: {
          peerId: peerId ?? undefined,
          workspaceId: packet.workspaceId ?? undefined,
          contextType: packet.contextType,
          producerPeerId: packet.producerPeerId,
          scopeIncludes: packet.scope.find((scope) => scope !== "workspace"),
          subjectIncludes: packet.subject,
          eventTypes: ["packet_published", "packet_invalidated", "packet_acknowledged", "task_proposed", "task_status_changed"],
        },
        peerId: peerId ?? null,
      });
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.get("/events", (req, res) => {
    const filters = parseSnapshotFilters(req.query as Record<string, unknown>);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const writeEvent = (event: Record<string, unknown>) => {
      res.write(`event: shared_context\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    writeEvent({
      type: "connected",
      timestamp: new Date().toISOString(),
      filters,
    });

    const heartbeat = setInterval(() => {
      writeEvent({
        type: "heartbeat",
        timestamp: new Date().toISOString(),
      });
    }, 15000);

    const bus = getSharedContextEventBus();
    const handler = (event: Record<string, unknown>) => {
      if (!eventMatchesFilters(event, filters)) return;
      writeEvent(event);
    };
    bus.on("shared_context", handler);

    res.on("close", () => {
      clearInterval(heartbeat);
      bus.off("shared_context", handler);
      res.end();
    });
  });

  router.post("/publish", async (req, res) => {
    const body = (req.body as { packet?: IncomingResultPacket; strategicAngleId?: string }) ?? {};
    const packet = body.packet;

    if (!packet?.answer || !(packet.canonicalEntity ?? packet.entityName)) {
      return res.status(400).json({
        success: false,
        message: "A result packet with entityName/canonicalEntity and answer is required.",
      });
    }

    const contextId = getContextId(packet);
    const workspaceId = getWorkspaceId(packet);
    const strategicAngle = findStrategicAngle(packet, body.strategicAngleId);
    const packetPayload = {
      contextId,
      contextType: "entity_packet" as const,
      producerPeerId: WEB_PRODUCER_PEER_ID,
      workspaceId,
      scope: [
        "workspace",
        `entity:${slugify(packet.canonicalEntity ?? packet.entityName ?? "nodebench")}`,
        `packet:${packet.packetType ?? "founder_packet"}`,
      ],
      subject: getSubject(packet),
      summary: summarizePacket(packet),
      claims: collectClaims(packet),
      evidenceRefs: collectEvidenceRefs(packet),
      confidence:
        typeof packet.confidence === "number"
          ? Math.max(0, Math.min(1, packet.confidence / 100))
          : undefined,
      lineage: {
        sourceRunId: typeof packet.packetId === "string" ? packet.packetId : undefined,
      },
      freshness: getFreshness(packet),
    };

    try {
      if (useConvex()) {
        await registerPeerConvex({
          peerId: WEB_PRODUCER_PEER_ID,
          product: "nodebench",
          workspaceId,
          surface: "web",
          role: "router",
          capabilities: ["can-publish-packet", "can-propose-task", "can-package-truth"],
          contextScopes: ["workspace", "entity", "packet"],
        });
        await publishPacketConvex(packetPayload);
        let issueContextId: string | null = null;
        if (strategicAngle) {
          const issuePayload = buildStrategicIssuePayload({ packet, angle: strategicAngle });
          issueContextId = issuePayload.contextId ?? null;
          await publishPacketConvex(issuePayload);
        }
        const snapshot = await getSnapshotConvex(6);
        return res.json({
          success: true,
          contextId: strategicAngle ? issueContextId ?? contextId : contextId,
          parentContextId: strategicAngle ? contextId : null,
          workspaceId,
          strategicAngleId: strategicAngle?.id ?? null,
          resource: buildPacketResourceHints(strategicAngle ? issueContextId ?? contextId : contextId, packet),
          snapshot,
        });
      }

      registerWebPeer(packet);
      publishSharedContextPacket({
        ...packetPayload,
        stateSnapshot: packet as Record<string, unknown>,
        permissions: {
          visibility: "workspace",
          allowedRoles: ["researcher", "compiler", "judge", "router"],
        },
        nextActions: [
          ...(packet.interventions ?? []).map((item) => item.action ?? "").filter(Boolean),
          ...(packet.nextQuestions ?? []).slice(0, 3),
        ].slice(0, 6),
        metadata: {
          query: packet.query ?? null,
          packetId: packet.packetId ?? null,
          packetType: packet.packetType ?? null,
          proofStatus: packet.proofStatus ?? null,
          recommendedNextAction: packet.recommendedNextAction ?? null,
        },
        queueForSync: false,
      });
      let responseContextId = contextId;
      if (strategicAngle) {
        const issuePayload = buildStrategicIssuePayload({ packet, angle: strategicAngle });
        publishSharedContextPacket(issuePayload);
        responseContextId = issuePayload.contextId ?? contextId;
      }

      return res.json({
        success: true,
        contextId: responseContextId,
        parentContextId: strategicAngle ? contextId : null,
        workspaceId,
        strategicAngleId: strategicAngle?.id ?? null,
        resource: buildPacketResourceHints(responseContextId, packet),
        snapshot: getSharedContextSnapshot(6),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.post("/delegate", async (req, res) => {
    const body = (req.body as {
      packet?: IncomingResultPacket;
      targetAgent?: SharedContextDelegateTarget;
      goal?: string;
      strategicAngleId?: string;
    }) ?? {};
    const packet = body.packet;
    const target = body.targetAgent ?? "claude_code";

    if (!packet?.answer || !(packet.canonicalEntity ?? packet.entityName)) {
      return res.status(400).json({
        success: false,
        message: "A result packet with entityName/canonicalEntity and answer is required.",
      });
    }

    if (!(target in DELEGATE_TARGETS)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported targetAgent: ${String(target)}`,
      });
    }

    const contextId = getContextId(packet);
    const workspaceId = getWorkspaceId(packet);
    const strategicAngle = findStrategicAngle(packet, body.strategicAngleId);
    const delegateContextId = strategicAngle ? getStrategicContextId(packet, strategicAngle) : contextId;

    try {
      if (useConvex()) {
        await registerPeerConvex({
          peerId: WEB_PRODUCER_PEER_ID,
          product: "nodebench",
          workspaceId,
          surface: "web",
          role: "router",
          capabilities: ["can-publish-packet", "can-propose-task", "can-package-truth"],
        });
        await registerPeerConvex({
          peerId: DELEGATE_TARGETS[target].peerId,
          product: "nodebench",
          workspaceId,
          surface: "api",
          role: "compiler",
          capabilities: ["can-build", "can-execute", "can-complete-task"],
        });
        await publishPacketConvex({
          contextId,
          contextType: "entity_packet",
          producerPeerId: WEB_PRODUCER_PEER_ID,
          workspaceId,
          scope: [
            "workspace",
            `entity:${slugify(packet.canonicalEntity ?? packet.entityName ?? "nodebench")}`,
            `delegate:${target}`,
          ],
          subject: getSubject(packet),
          summary: summarizePacket(packet),
          claims: collectClaims(packet),
          evidenceRefs: collectEvidenceRefs(packet),
          confidence:
            typeof packet.confidence === "number"
              ? Math.max(0, Math.min(1, packet.confidence / 100))
              : undefined,
          lineage: {
            sourceRunId: typeof packet.packetId === "string" ? packet.packetId : undefined,
          },
          freshness: getFreshness(packet),
        });
        if (strategicAngle) {
          await publishPacketConvex(buildStrategicIssuePayload({ packet, angle: strategicAngle, target }));
        }
      } else {
        registerWebPeer(packet);
        registerDelegatePeer(packet, target);
        publishSharedContextPacket({
          contextId,
          contextType: "entity_packet",
          producerPeerId: WEB_PRODUCER_PEER_ID,
          workspaceId,
          scope: [
            "workspace",
            `entity:${slugify(packet.canonicalEntity ?? packet.entityName ?? "nodebench")}`,
            `packet:${packet.packetType ?? "founder_packet"}`,
            `delegate:${target}`,
          ],
          subject: getSubject(packet),
          summary: summarizePacket(packet),
          claims: collectClaims(packet),
          evidenceRefs: collectEvidenceRefs(packet),
          stateSnapshot: packet as Record<string, unknown>,
          freshness: getFreshness(packet),
          permissions: {
            visibility: "workspace",
            allowedRoles: ["researcher", "compiler", "judge", "router"],
          },
          confidence:
            typeof packet.confidence === "number"
              ? Math.max(0, Math.min(1, packet.confidence / 100))
              : undefined,
          lineage: {
            sourceRunId: typeof packet.packetId === "string" ? packet.packetId : undefined,
          },
          nextActions: [
            ...(packet.interventions ?? []).map((item) => item.action ?? "").filter(Boolean),
            ...(packet.nextQuestions ?? []).slice(0, 3),
          ].slice(0, 6),
          metadata: {
            query: packet.query ?? null,
            packetId: packet.packetId ?? null,
            packetType: packet.packetType ?? null,
            proofStatus: packet.proofStatus ?? null,
            recommendedNextAction: packet.recommendedNextAction ?? null,
            targetAgent: target,
          },
          queueForSync: false,
        });
        if (strategicAngle) {
          publishSharedContextPacket(buildStrategicIssuePayload({ packet, angle: strategicAngle, target }));
        }
      }

      const goal =
        body.goal?.trim() ||
        strategicAngle?.nextQuestion?.trim() ||
        strategicAngle?.summary?.trim() ||
        packet.recommendedNextAction?.trim() ||
        packet.nextQuestions?.[0]?.trim() ||
        "Continue implementation from the published NodeBench packet.";

      const taskId = strategicAngle ? getStrategicTaskId(packet, target, strategicAngle) : getTaskId(packet, target);

      if (useConvex()) {
        await proposeTaskConvex({
          taskId,
          taskType: strategicAngle ? "strategic_angle_handoff" : "agent_handoff",
          proposerPeerId: WEB_PRODUCER_PEER_ID,
          assigneePeerId: DELEGATE_TARGETS[target].peerId,
          taskSpec: {
            targetAgent: target,
            targetLabel: DELEGATE_TARGETS[target].label,
            goal,
            installCommand: DELEGATE_TARGETS[target].installCommand,
            proofStatus: packet.proofStatus ?? null,
            strategicAngleId: strategicAngle?.id ?? null,
            strategicAngleTitle: strategicAngle?.title ?? null,
          },
          inputContextIds: strategicAngle ? [contextId, delegateContextId] : [contextId],
          reason: goal,
        });
        const snapshot = await getSnapshotConvex(6);
        return res.json({
          success: true,
          contextId: delegateContextId,
          parentContextId: strategicAngle ? contextId : null,
          taskId,
          workspaceId,
          strategicAngleId: strategicAngle?.id ?? null,
          targetAgent: target,
          targetLabel: DELEGATE_TARGETS[target].label,
          installCommand: DELEGATE_TARGETS[target].installCommand,
          handoffPrompt: buildHandoffPrompt({
            packet,
            contextId: delegateContextId,
            parentContextId: strategicAngle ? contextId : null,
            taskId,
            target,
            goal,
            subject: strategicAngle ? getStrategicSubject(packet, strategicAngle) : getSubject(packet),
          }),
          resource: buildPacketResourceHints(delegateContextId, packet),
          snapshot,
        });
      }

      const proposed = proposeSharedContextTask({
        taskId,
        taskType: strategicAngle ? "strategic_angle_handoff" : "agent_handoff",
        proposerPeerId: WEB_PRODUCER_PEER_ID,
        assigneePeerId: DELEGATE_TARGETS[target].peerId,
        taskSpec: {
          targetAgent: target,
          targetLabel: DELEGATE_TARGETS[target].label,
          goal,
          installCommand: DELEGATE_TARGETS[target].installCommand,
          proofStatus: packet.proofStatus ?? null,
          strategicAngleId: strategicAngle?.id ?? null,
          strategicAngleTitle: strategicAngle?.title ?? null,
        },
        inputContextIds: strategicAngle ? [contextId, delegateContextId] : [contextId],
        reason: goal,
        metadata: {
          entityName: packet.canonicalEntity ?? packet.entityName ?? "NodeBench",
          query: packet.query ?? null,
          strategicAngleId: strategicAngle?.id ?? null,
          strategicAngleTitle: strategicAngle?.title ?? null,
        },
        queueForSync: false,
      });

      return res.json({
        success: true,
        contextId: delegateContextId,
        parentContextId: strategicAngle ? contextId : null,
        taskId: proposed.taskId,
        workspaceId,
        strategicAngleId: strategicAngle?.id ?? null,
        targetAgent: target,
        targetLabel: DELEGATE_TARGETS[target].label,
        installCommand: DELEGATE_TARGETS[target].installCommand,
        handoffPrompt: buildHandoffPrompt({
          packet,
          contextId: delegateContextId,
          parentContextId: strategicAngle ? contextId : null,
          taskId: proposed.taskId,
          target,
          goal,
          subject: strategicAngle ? getStrategicSubject(packet, strategicAngle) : getSubject(packet),
        }),
        resource: buildPacketResourceHints(delegateContextId, packet),
        snapshot: getSharedContextSnapshot(6),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ── POST /message — lightweight peer-to-peer messaging ────────────
  // Unlike /publish (which requires a search result packet), this endpoint
  // accepts raw messages between Claude Code instances for the Team page.
  router.post("/message", async (req, res) => {
    try {
      const { fromPeerId, toPeerId, content, messageType } = req.body ?? {};
      if (!fromPeerId || !toPeerId || !content) {
        return res.status(400).json({
          success: false,
          message: "fromPeerId, toPeerId, and content are required.",
        });
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();

      // Register sender peer if not already registered
      registerSharedContextPeer({
        peerId: fromPeerId,
        product: "nodebench",
        surface: "local_runtime",
        role: "runner",
        capabilities: ["send-message"],
        summary: {},
      });

      // Emit SSE event for real-time delivery
      const bus = getSharedContextEventBus();
      bus.emit("shared_context", {
        type: "message_sent",
        timestamp: now,
        payload: { messageId, fromPeerId, toPeerId, subject: content.slice(0, 80) },
      });

      return res.json({
        success: true,
        messageId,
        fromPeerId,
        toPeerId,
        timestamp: now,
      });
    } catch (error) {
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  return router;
}
