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
  });
});
