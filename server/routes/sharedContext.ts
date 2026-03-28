import { Router } from "express";

import {
  getSharedContextEventBus,
  getSharedContextPacket,
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
  subjectIncludes?: string;
  eventTypes?: string[];
};

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function parseSnapshotFilters(query: Record<string, unknown>): SnapshotFilters {
  const peerId = firstQueryValue(query.peerId);
  const workspaceId = firstQueryValue(query.workspaceId);
  const contextType = firstQueryValue(query.contextType);
  const subjectIncludes = firstQueryValue(query.subjectIncludes);
  const eventTypesRaw = firstQueryValue(query.eventTypes);
  return {
    peerId,
    workspaceId,
    contextType,
    subjectIncludes,
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
    if (filters.subjectIncludes && !packet.subject.toLowerCase().includes(filters.subjectIncludes.toLowerCase())) return false;
    return true;
  });
  const recentTasks = snapshot.recentTasks.filter((task) => {
    if (!filters.workspaceId) return true;
    return recentPackets.some((packet) => packet.contextId === task.outputContextId)
      || snapshot.peers.some((peer) => peer.peerId === task.proposerPeerId && peer.workspaceId === filters.workspaceId)
      || snapshot.peers.some((peer) => peer.peerId === task.assigneePeerId && peer.workspaceId === filters.workspaceId);
  });
  const recentMessages = snapshot.recentMessages.filter((message) => {
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

  if (filters.workspaceId && workspaceId && workspaceId !== filters.workspaceId) {
    return false;
  }
  if (filters.contextType && contextType && contextType !== filters.contextType) {
    return false;
  }
  if (filters.subjectIncludes && contextId && filters.peerId) {
    const packet = getSharedContextPacket(contextId, filters.peerId);
    if (!packet || !packet.subject.toLowerCase().includes(filters.subjectIncludes.toLowerCase())) {
      return false;
    }
  } else if (filters.subjectIncludes && typeof payload.subject === "string") {
    if (!payload.subject.toLowerCase().includes(filters.subjectIncludes.toLowerCase())) return false;
  }

  if (filters.peerId && contextId) {
    const packet = getSharedContextPacket(contextId, filters.peerId);
    if (!packet) return false;
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

function getSubject(packet: IncomingResultPacket): string {
  const entity = packet.canonicalEntity ?? packet.entityName ?? "NodeBench";
  return `${entity} shared context packet`;
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
}): string {
  const target = DELEGATE_TARGETS[args.target];
  const entity = args.packet.canonicalEntity ?? args.packet.entityName ?? "the company";
  const workspaceId = getWorkspaceId(args.packet);
  const subject = getSubject(args.packet);
  return [
    `Use NodeBench MCP as the truth layer for this task. You are the ${target.label} worker.`,
    "",
    `Goal: ${args.goal}`,
    `Workspace: ${workspaceId}`,
    `Shared context packet: ${args.contextId}`,
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

    res.json({
      success: true,
      snapshot: filterSnapshot(
        getSharedContextSnapshot(safeLim, filters.peerId),
        filters,
      ),
      peerId: filters.peerId ?? null,
      filters,
    });
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
    const packet = (req.body as { packet?: IncomingResultPacket })?.packet;

    if (!packet?.answer || !(packet.canonicalEntity ?? packet.entityName)) {
      return res.status(400).json({
        success: false,
        message: "A result packet with entityName/canonicalEntity and answer is required.",
      });
    }

    const contextId = getContextId(packet);
    const workspaceId = getWorkspaceId(packet);
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
        const snapshot = await getSnapshotConvex(6);
        return res.json({ success: true, contextId, workspaceId, snapshot });
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

      return res.json({
        success: true,
        contextId,
        workspaceId,
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
      }

      const goal =
        body.goal?.trim() ||
        packet.recommendedNextAction?.trim() ||
        packet.nextQuestions?.[0]?.trim() ||
        "Continue implementation from the published NodeBench packet.";

      const taskId = getTaskId(packet, target);

      if (useConvex()) {
        await proposeTaskConvex({
          taskId,
          taskType: "agent_handoff",
          proposerPeerId: WEB_PRODUCER_PEER_ID,
          assigneePeerId: DELEGATE_TARGETS[target].peerId,
          taskSpec: {
            targetAgent: target,
            targetLabel: DELEGATE_TARGETS[target].label,
            goal,
            installCommand: DELEGATE_TARGETS[target].installCommand,
            proofStatus: packet.proofStatus ?? null,
          },
          inputContextIds: [contextId],
          reason: goal,
        });
        const snapshot = await getSnapshotConvex(6);
        return res.json({
          success: true,
          contextId,
          taskId,
          workspaceId,
          targetAgent: target,
          targetLabel: DELEGATE_TARGETS[target].label,
          installCommand: DELEGATE_TARGETS[target].installCommand,
          handoffPrompt: buildHandoffPrompt({ packet, contextId, taskId, target, goal }),
          snapshot,
        });
      }

      const proposed = proposeSharedContextTask({
        taskId,
        taskType: "agent_handoff",
        proposerPeerId: WEB_PRODUCER_PEER_ID,
        assigneePeerId: DELEGATE_TARGETS[target].peerId,
        taskSpec: {
          targetAgent: target,
          targetLabel: DELEGATE_TARGETS[target].label,
          goal,
          installCommand: DELEGATE_TARGETS[target].installCommand,
          proofStatus: packet.proofStatus ?? null,
        },
        inputContextIds: [contextId],
        reason: goal,
        metadata: {
          entityName: packet.canonicalEntity ?? packet.entityName ?? "NodeBench",
          query: packet.query ?? null,
        },
        queueForSync: false,
      });

      return res.json({
        success: true,
        contextId,
        taskId: proposed.taskId,
        workspaceId,
        targetAgent: target,
        targetLabel: DELEGATE_TARGETS[target].label,
        installCommand: DELEGATE_TARGETS[target].installCommand,
        handoffPrompt: buildHandoffPrompt({
          packet,
          contextId,
          taskId: proposed.taskId,
          target,
          goal,
        }),
        snapshot: getSharedContextSnapshot(6),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
