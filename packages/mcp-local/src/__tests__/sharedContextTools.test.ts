import { describe, expect, it } from "vitest";

import { sharedContextTools } from "../tools/sharedContextTools.js";

function getTool(name: string) {
  const tool = sharedContextTools.find((entry) => entry.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

describe("sharedContextTools", () => {
  it("registers peers, publishes packets, coordinates task handoffs, and exposes a snapshot", async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const peerA = `peer:test:a:${suffix}`;
    const peerB = `peer:test:b:${suffix}`;

    const registerPeer = getTool("register_shared_context_peer");
    const publishContext = getTool("publish_shared_context");
    const getPacketTool = getTool("get_shared_context_packet");
    const buildSubscriptionTool = getTool("build_shared_context_subscription");
    const buildManifestTool = getTool("build_shared_context_subscription_manifest");
    const ackContext = getTool("ack_shared_context");
    const sendMessage = getTool("send_peer_message");
    const checkMessages = getTool("check_peer_messages");
    const proposeTask = getTool("propose_shared_task");
    const acceptTask = getTool("accept_shared_task");
    const completeTask = getTool("complete_shared_task");
    const snapshotTool = getTool("get_shared_context_snapshot");

    await registerPeer.handler({
      peerId: peerA,
      product: "nodebench",
      workspaceId: `workspace:${suffix}`,
      surface: "local_runtime",
      role: "researcher",
      capabilities: ["can-search", "can-publish-packet"],
      contextScopes: ["workspace", "run"],
      summary: {
        currentTask: "Find and normalize Stripe billing changes",
      },
    });

    await registerPeer.handler({
      peerId: peerB,
      product: "ta_studio",
      workspaceId: `workspace:${suffix}`,
      surface: "runner",
      role: "judge",
      capabilities: ["can-judge", "can-compare-before-after"],
      contextScopes: ["workspace", "trace"],
      summary: {
        currentTask: "Judge checkout regression trace",
      },
    });

    const published = await publishContext.handler({
      contextType: "issue_packet",
      producerPeerId: peerA,
      workspaceId: `workspace:${suffix}`,
      scope: ["workspace", "entity:stripe"],
      subject: "Stripe billing changes",
      summary: "Usage-based billing UI changed on the public pricing page.",
      claims: ["Pricing page now emphasizes usage-based billing."],
      evidenceRefs: ["https://stripe.com/pricing"],
      confidence: 0.88,
    }) as { contextId: string };

    const packetResource = await getPacketTool.handler({
      contextId: published.contextId,
      peerId: peerB,
    }) as {
      found: boolean;
      resourceUri: string;
      pullQuery: { contextType: string; subjectIncludes: string };
      subscriptionQuery: { eventTypes: string[] };
    };
    expect(packetResource.found).toBe(true);
    expect(packetResource.resourceUri).toContain(encodeURIComponent(published.contextId));
    expect(packetResource.pullQuery.contextType).toBe("issue_packet");
    expect(packetResource.subscriptionQuery.eventTypes).toContain("task_status_changed");

    const subscriptionManifest = await buildSubscriptionTool.handler({
      contextId: published.contextId,
      peerId: peerB,
    }) as {
      found: boolean;
      pullQuery: { subjectIncludes: string };
    };
    expect(subscriptionManifest.found).toBe(true);
    expect(subscriptionManifest.pullQuery.subjectIncludes).toContain("Stripe");

    const manifest = await buildManifestTool.handler({
      peerId: peerB,
      workspaceId: `workspace:${suffix}`,
      contextType: "issue_packet",
      taskType: "judge_packet",
      subjectIncludes: "Stripe",
      eventTypes: ["packet_published", "task_status_changed"],
      limit: 5,
    }) as {
      snapshotQuery: { peerId?: string; taskType?: string };
      subscriptionQuery: { eventTypes: string[]; subjectIncludes?: string };
      packetResources: Array<{ contextId: string }>;
    };
    expect(manifest.snapshotQuery.peerId).toBe(peerB);
    expect(manifest.snapshotQuery.taskType).toBe("judge_packet");
    expect(manifest.subscriptionQuery.subjectIncludes).toContain("Stripe");
    expect(manifest.subscriptionQuery.eventTypes).toEqual(["packet_published", "task_status_changed"]);
    expect(manifest.packetResources.some((resource) => resource.contextId === published.contextId)).toBe(true);

    await ackContext.handler({
      contextId: published.contextId,
      peerId: peerB,
      detail: { status: "received" },
    });

    await sendMessage.handler({
      fromPeerId: peerA,
      toPeerId: peerB,
      messageClass: "context_offer",
      payload: {
        contextId: published.contextId,
      },
    });

    const messages = await checkMessages.handler({
      peerId: peerB,
      unreadOnly: true,
    }) as { count: number; messages: Array<{ payload: { contextId: string } }> };
    expect(messages.count).toBeGreaterThan(0);
    expect(messages.messages[0]?.payload.contextId).toBe(published.contextId);

    const proposedTask = await proposeTask.handler({
      taskType: "judge_packet",
      proposerPeerId: peerA,
      assigneePeerId: peerB,
      inputContextIds: [published.contextId],
      taskSpec: {
        outputContextType: "judge_packet",
      },
    }) as { taskId: string };

    await acceptTask.handler({
      taskId: proposedTask.taskId,
      peerId: peerB,
    });

    const verdictPacket = await publishContext.handler({
      contextType: "judge_packet",
      producerPeerId: peerB,
      workspaceId: `workspace:${suffix}`,
      scope: ["workspace", "trace"],
      subject: "Stripe billing changes verdict",
      summary: "Packet is directionally useful and supported by current evidence.",
      claims: ["Context packet is safe to promote into the shared workspace."],
      evidenceRefs: [published.contextId],
      confidence: 0.91,
      lineage: {
        parentContextIds: [published.contextId],
      },
    }) as { contextId: string };

    await completeTask.handler({
      taskId: proposedTask.taskId,
      peerId: peerB,
      outputContextId: verdictPacket.contextId,
    });

    const snapshot = await snapshotTool.handler({ limit: 10 }) as any;
    expect(snapshot.counts.activePeers).toBeGreaterThanOrEqual(2);
    expect(snapshot.recentPackets.some((packet: { contextId: string }) => packet.contextId === published.contextId)).toBe(true);
    expect(snapshot.recentTasks.some((task: { taskId: string; outputContextId?: string | null }) => task.taskId === proposedTask.taskId && task.outputContextId === verdictPacket.contextId)).toBe(true);

    const scopedSnapshot = await snapshotTool.handler({
      peerId: peerB,
      workspaceId: `workspace:${suffix}`,
      contextType: "judge_packet",
      taskType: "judge_packet",
      messageClass: "context_offer",
      limit: 10,
    }) as any;
    expect(scopedSnapshot.recentPackets.every((packet: { contextType: string }) => packet.contextType === "judge_packet")).toBe(true);
    expect(scopedSnapshot.recentTasks.every((task: { taskType: string }) => task.taskType === "judge_packet")).toBe(true);
    expect(scopedSnapshot.recentMessages.every((message: { messageClass: string }) => message.messageClass === "context_offer")).toBe(true);
  });

  it("blocks cross-workspace packet access and task handoffs", async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const peerA = `peer:test:scope:a:${suffix}`;
    const peerB = `peer:test:scope:b:${suffix}`;
    const peerC = `peer:test:scope:c:${suffix}`;

    const registerPeer = getTool("register_shared_context_peer");
    const publishContext = getTool("publish_shared_context");
    const pullContext = getTool("pull_shared_context");
    const sendMessage = getTool("send_peer_message");
    const proposeTask = getTool("propose_shared_task");

    await registerPeer.handler({
      peerId: peerA,
      product: "nodebench",
      workspaceId: `workspace:${suffix}:a`,
      surface: "local_runtime",
      role: "researcher",
    });
    await registerPeer.handler({
      peerId: peerB,
      product: "nodebench",
      workspaceId: `workspace:${suffix}:a`,
      surface: "runner",
      role: "judge",
    });
    await registerPeer.handler({
      peerId: peerC,
      product: "nodebench",
      workspaceId: `workspace:${suffix}:b`,
      surface: "runner",
      role: "judge",
    });

    const published = await publishContext.handler({
      contextType: "entity_packet",
      producerPeerId: peerA,
      workspaceId: `workspace:${suffix}:a`,
      subject: "Scoped packet",
      summary: "Only workspace A should be able to read this packet.",
    }) as { contextId: string };

    const allowedPull = await pullContext.handler({
      workspaceId: `workspace:${suffix}:a`,
      requestingPeerId: peerB,
      limit: 10,
    }) as { count: number; packets: Array<{ contextId: string }> };
    expect(allowedPull.packets.some((packet) => packet.contextId === published.contextId)).toBe(true);

    const blockedPull = await pullContext.handler({
      workspaceId: `workspace:${suffix}:a`,
      requestingPeerId: peerC,
      limit: 10,
    }) as { count: number; packets: Array<{ contextId: string }> };
    expect(blockedPull.packets.some((packet) => packet.contextId === published.contextId)).toBe(false);

    await expect(sendMessage.handler({
      fromPeerId: peerA,
      toPeerId: peerC,
      messageClass: "context_offer",
      payload: { contextId: published.contextId },
    })).rejects.toThrow(/workspace scope/i);

    await expect(proposeTask.handler({
      taskType: "judge_packet",
      proposerPeerId: peerA,
      assigneePeerId: peerC,
      inputContextIds: [published.contextId],
    })).rejects.toThrow(/workspace scope/i);
  });
});
