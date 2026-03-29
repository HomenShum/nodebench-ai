/**
 * @vitest-environment node
 */

import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createSharedContextRouter } from "./routes/sharedContext.js";

describe("createSharedContextRouter", () => {
  let server: ReturnType<express.Express["listen"]>;
  let baseUrl = "";

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use("/shared-context", createSharedContextRouter());

    server = await new Promise<ReturnType<express.Express["listen"]>>((resolve) => {
      const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind shared-context test server");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it("publishes a result packet and creates a delegated agent handoff", async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const packet = {
      query: `Analyze NodeBench founder loop ${suffix}`,
      entityName: `NodeBench ${suffix}`,
      canonicalEntity: `NodeBench ${suffix}`,
      answer: "NodeBench should package trusted company truth before delegating implementation work.",
      confidence: 92,
      proofStatus: "verified",
      packetId: `pkt_${suffix}`,
      packetType: "founder_packet",
      sourceRefs: [
        {
          id: `source_${suffix}`,
          href: "https://www.nodebenchai.com",
          label: "NodeBench homepage",
        },
      ],
      changes: [{ description: "Search-first shared-context handoff is now live." }],
      risks: [{ title: "Narrative drift", description: "Delegation can outrun the packet." }],
      interventions: [{ action: "Delegate from the published packet, not from memory." }],
      nextQuestions: ["What should Claude Code build next from this packet?"],
      recommendedNextAction: "Publish the packet and delegate implementation to Claude Code.",
      strategicAngles: [
        {
          id: "founder-fit",
          title: "Founder-skill and credibility fit",
          status: "watch",
          summary: "The team story still needs a sharper wedge.",
          whyItMatters: "Investors and users need a credible why-us story.",
          evidenceRefIds: [`source_${suffix}`],
          nextQuestion: "What proof makes this team credible for the wedge?",
        },
      ],
    };

    const publishResponse = await fetch(`${baseUrl}/shared-context/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packet }),
    });
    const publishJson = await publishResponse.json() as any;

    expect(publishResponse.status).toBe(200);
    expect(publishJson.success).toBe(true);
    expect(String(publishJson.contextId)).toContain(packet.packetId);
    expect(publishJson.snapshot.recentPackets.some((item: { contextId: string }) => item.contextId === publishJson.contextId)).toBe(true);
    expect(String(publishJson.resource.resourceUri)).toContain("shared-context://packet/");

    const delegateResponse = await fetch(`${baseUrl}/shared-context/delegate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packet, targetAgent: "claude_code" }),
    });
    const delegateJson = await delegateResponse.json() as any;

    expect(delegateResponse.status).toBe(200);
    expect(delegateJson.success).toBe(true);
    expect(delegateJson.contextId).toBe(publishJson.contextId);
    expect(String(delegateJson.taskId)).toContain(packet.packetId);
    expect(delegateJson.installCommand).toContain("claude mcp add nodebench");
    expect(delegateJson.handoffPrompt).toContain("NodeBench MCP");
    expect(delegateJson.snapshot.recentTasks.some((item: { taskId: string }) => item.taskId === delegateJson.taskId)).toBe(true);

    const issueDelegateResponse = await fetch(`${baseUrl}/shared-context/delegate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packet, targetAgent: "claude_code", strategicAngleId: "founder-fit" }),
    });
    const issueDelegateJson = await issueDelegateResponse.json() as any;

    expect(issueDelegateResponse.status).toBe(200);
    expect(issueDelegateJson.parentContextId).toBe(publishJson.contextId);
    expect(issueDelegateJson.strategicAngleId).toBe("founder-fit");
    expect(issueDelegateJson.contextId).toContain(":issue:");
  });

  it("filters snapshots and serves packet resources with peer-scoped checks", async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const packet = {
      query: `Founder packet ${suffix}`,
      entityName: `ScopeCo ${suffix}`,
      canonicalEntity: `ScopeCo ${suffix}`,
      answer: "ScopeCo has a strong founder workflow angle.",
      confidence: 88,
      packetId: `scope_${suffix}`,
      packetType: "founder_packet",
      sourceRefs: [
        {
          id: `source_scope_${suffix}`,
          href: "https://example.com/scopeco",
          label: "ScopeCo evidence",
        },
      ],
      recommendedNextAction: "Pull the packet from the shared context bus.",
      strategicAngles: [
        {
          id: "adoption",
          title: "Workflow adoption and distribution fit",
          status: "watch",
          summary: "The workflow fit still needs proof.",
          whyItMatters: "It must plug into a real high-frequency workflow.",
          evidenceRefIds: [`source_scope_${suffix}`],
          nextQuestion: "Which current workflow does this fit into?",
        },
      ],
    };

    const publishResponse = await fetch(`${baseUrl}/shared-context/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packet }),
    });
    const publishJson = await publishResponse.json() as any;

    const workspaceId = `workspace:${`scopeco-${suffix}`.replace(/_/g, "-")}`;
    const snapshotResponse = await fetch(
      `${baseUrl}/shared-context/snapshot?workspaceId=${encodeURIComponent(workspaceId)}&subjectIncludes=${encodeURIComponent("ScopeCo")}`,
    );
    const snapshotJson = await snapshotResponse.json() as any;

    expect(snapshotResponse.status).toBe(200);
    expect(snapshotJson.snapshot.recentPackets.some((item: { contextId: string }) => item.contextId === publishJson.contextId)).toBe(true);

    const packetResponse = await fetch(
      `${baseUrl}/shared-context/packets/${encodeURIComponent(publishJson.contextId)}`,
    );
    const packetJson = await packetResponse.json() as any;

    expect(packetResponse.status).toBe(200);
    expect(packetJson.packet.subject).toContain("ScopeCo");
    expect(packetJson.resourceUri).toContain("shared-context://packet/");
    expect(packetJson.pullQuery.subjectIncludes).toContain("ScopeCo");

    const deniedResponse = await fetch(
      `${baseUrl}/shared-context/packets/${encodeURIComponent(publishJson.contextId)}?peerId=${encodeURIComponent("peer:missing:reader")}`,
    );
    const deniedJson = await deniedResponse.json() as any;

    expect(deniedResponse.status).toBe(403);
    expect(String(deniedJson.message)).toContain("Shared context peer not found");

    const issuePublishResponse = await fetch(`${baseUrl}/shared-context/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packet, strategicAngleId: "adoption" }),
    });
    const issuePublishJson = await issuePublishResponse.json() as any;

    expect(issuePublishResponse.status).toBe(200);
    expect(issuePublishJson.parentContextId).toBe(publishJson.contextId);
    expect(issuePublishJson.strategicAngleId).toBe("adoption");

    const issuePacketResponse = await fetch(
      `${baseUrl}/shared-context/packets/${encodeURIComponent(issuePublishJson.contextId)}`,
    );
    const issuePacketJson = await issuePacketResponse.json() as any;
    expect(issuePacketJson.packet.contextType).toBe("issue_packet");
    expect(issuePacketJson.packet.subject).toContain("Workflow adoption");

    const peerSnapshotResponse = await fetch(
      `${baseUrl}/shared-context/peers/${encodeURIComponent("peer:web:control_plane")}/snapshot?workspaceId=${encodeURIComponent(workspaceId)}&contextType=issue_packet`,
    );
    const peerSnapshotJson = await peerSnapshotResponse.json() as any;
    expect(peerSnapshotResponse.status).toBe(200);
    expect(peerSnapshotJson.peerId).toBe("peer:web:control_plane");
    expect(peerSnapshotJson.snapshot.recentPackets.every((item: { contextType: string }) => item.contextType === "issue_packet")).toBe(true);

    const manifestResponse = await fetch(
      `${baseUrl}/shared-context/subscriptions/manifest?peerId=${encodeURIComponent("peer:web:control_plane")}&workspaceId=${encodeURIComponent(workspaceId)}&contextType=issue_packet&taskType=strategic_angle_handoff&subjectIncludes=${encodeURIComponent("ScopeCo")}`,
    );
    const manifestJson = await manifestResponse.json() as any;
    expect(manifestResponse.status).toBe(200);
    expect(manifestJson.manifest.snapshotQuery.peerId).toBe("peer:web:control_plane");
    expect(manifestJson.manifest.snapshotQuery.taskType).toBe("strategic_angle_handoff");
    expect(manifestJson.manifest.packetResources.some((resource: { contextId: string }) => resource.contextId === issuePublishJson.contextId)).toBe(true);
    expect(String(manifestJson.urls.eventsUrl)).toContain("contextType=issue_packet");
  });
});
