import { describe, expect, it } from "vitest";

import { founderOperatingModelTools } from "../tools/founderOperatingModelTools.js";

function getTool(name: string) {
  const tool = founderOperatingModelTools.find((entry) => entry.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

describe("founderOperatingModelTools", () => {
  it("builds a consistent founder operating model for own-company founder work", async () => {
    const buildModel = getTool("build_founder_operating_model");
    const routePacket = getTool("route_founder_packet");
    const detectMode = getTool("detect_company_mode");

    const mode = await detectMode.handler({
      query: "Given everything about my company, what should I do next?",
      hasPrivateContext: true,
      canonicalEntity: "NodeBench",
    }) as string;

    expect(mode).toBe("own_company");

    const routed = await routePacket.handler({
      role: "founder",
      query: "Given everything about my company, what should I do next?",
      canonicalEntity: "NodeBench",
      hasPrivateContext: true,
      readinessScore: 62,
      hiddenRiskCount: 2,
      hasShareableArtifact: true,
      hasBenchmarkProof: true,
      hasDelegatedTask: true,
      visibility: "workspace",
    }) as {
      companyMode: string;
      packetType: string;
      visibility: string;
    };

    expect(routed.companyMode).toBe("own_company");
    expect(routed.packetType).toBe("founder_progression_packet");
    expect(routed.visibility).toBe("workspace");

    const model = await buildModel.handler({
      role: "founder",
      query: "Given everything about my company, what should I do next?",
      canonicalEntity: "NodeBench",
      hasPrivateContext: true,
      readinessScore: 62,
      hiddenRiskCount: 2,
      hasShareableArtifact: true,
      hasBenchmarkProof: true,
      hasDelegatedTask: true,
      hasDiligencePack: true,
      hasAmbientMonitoring: true,
      visibility: "workspace",
      vertical: "AI/software",
    }) as {
      executionOrder: Array<{ id: string }>;
      queueTopology: Array<{ id: string }>;
      roleDefault: { defaultPacketType: string };
      packetRouter: { companyMode: string; shouldDelegate: boolean };
      progressionRubric: { currentStage: string };
      benchmarkOracles: Array<{ lane: string }>;
    };

    expect(model.executionOrder.map((step) => step.id)).toEqual([
      "ingest",
      "classify",
      "canonicalize",
      "score",
      "packet",
      "artifact",
      "action",
      "trace",
    ]);
    expect(model.queueTopology.some((queue) => queue.id === "delegation_dispatch")).toBe(true);
    expect(model.roleDefault.defaultPacketType).toBe("founder_progression_packet");
    expect(model.packetRouter.companyMode).toBe("own_company");
    expect(model.packetRouter.shouldDelegate).toBe(true);
    expect(model.progressionRubric.currentStage).toBe("readiness");
    expect(model.benchmarkOracles.some((oracle) => oracle.lane === "cheapest_valid_workflow")).toBe(true);
  });
});
