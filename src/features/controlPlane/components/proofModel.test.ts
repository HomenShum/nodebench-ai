import { describe, expect, it } from "vitest";
import { buildLiveProgressModel, ensureProofPacket } from "./proofModel";
import type { ResultPacket } from "./searchTypes";

const basePacket: ResultPacket = {
  query: "What changed for NodeBench this week?",
  entityName: "NodeBench",
  answer: "NodeBench shipped a founder-first search workflow with proof-linked packets.",
  confidence: 84,
  sourceCount: 3,
  variables: [
    { rank: 1, name: "Founder workflow shipped", direction: "up", impact: "high" },
    { rank: 2, name: "Public narrative tightening", direction: "up", impact: "medium" },
  ],
  changes: [{ description: "Founder-first packet landed", date: "2026-03-26" }],
  risks: [
    {
      title: "Proof drift",
      description: "If source linkage breaks, the answer becomes hard to trust.",
    },
  ],
  nextQuestions: ["What should ship next for the founder loop?"],
};

describe("proofModel", () => {
  it("enriches a thin result packet with proof-ready structures", () => {
    const enriched = ensureProofPacket(basePacket, "founder");

    expect(enriched.packetId).toMatch(/^pkt-/);
    expect(enriched.packetType).toBe("founder_progression_packet");
    expect(enriched.canonicalEntity).toBe("NodeBench");
    expect(enriched.sourceRefs.length).toBeGreaterThan(0);
    expect(enriched.claimRefs.length).toBeGreaterThan(0);
    expect(enriched.answerBlocks.length).toBeGreaterThan(0);
    expect(enriched.explorationMemory.exploredSourceCount).toBeGreaterThanOrEqual(3);
    expect(enriched.graphSummary.nodeCount).toBeGreaterThan(0);
    expect(enriched.graphSummary.primaryPath.length).toBeGreaterThan(0);
    expect(enriched.proofStatus).toBe("drifting");
    expect(enriched.answerBlocks.every((block) => block.sourceRefIds.length > 0)).toBe(true);
    expect(enriched.strategicAngles.length).toBeGreaterThan(0);
    expect(enriched.strategicAngles.some((angle) => angle.id === "team-shape")).toBe(true);
    expect(enriched.strategicAngles.some((angle) => angle.id === "founder-fit")).toBe(true);
    expect(enriched.strategicAngles.some((angle) => angle.id === "installability")).toBe(true);
    expect(enriched.strategicAngles.some((angle) => angle.id === "maintainability")).toBe(true);
    expect(enriched.progressionProfile.currentStageLabel).toMatch(/Stage/);
    expect(enriched.diligencePack.label.length).toBeGreaterThan(0);
    expect(enriched.materialsChecklist.length).toBeGreaterThan(0);
    expect(enriched.scorecards.length).toBeGreaterThan(0);
    expect(enriched.shareableArtifacts.some((artifact) => artifact.type === "slack_onepage")).toBe(true);
    expect(enriched.workflowComparison.verdict).toBe("valid");
    expect(enriched.workflowComparison.optimizedPath.length).toBeGreaterThan(0);
    expect(enriched.operatingModel.packetRouter.companyMode).toBe("external_company");
    expect(enriched.operatingModel.executionOrder.length).toBeGreaterThan(0);
    expect(enriched.operatingModel.queueTopology.length).toBeGreaterThan(0);
    expect(enriched.operatingModel.benchmarkOracles.length).toBeGreaterThan(0);
    expect(enriched.companyReadinessPacket.identity.companyName.length).toBeGreaterThan(0);
  });

  it("prefers the readiness/company identity over generic workspace labels for own-company packets", () => {
    const enriched = ensureProofPacket(
      {
        ...basePacket,
        entityName: "nodebench-mcp",
        packetType: "general_packet",
        operatingModel: {
          executionOrder: [],
          queueTopology: [],
          sourcePolicies: [],
          roleDefault: {
            role: "founder",
            defaultPacketType: "founder_progression_packet",
            defaultArtifactType: "slack_onepage",
            shouldMonitorByDefault: true,
            shouldDelegateByDefault: true,
          },
          packetRouter: {
            role: "founder",
            companyMode: "own_company",
            packetType: "founder_progression_packet",
            artifactType: "slack_onepage",
            shouldMonitor: true,
            shouldExport: true,
            shouldDelegate: true,
            needsMoreEvidence: false,
            requiredEvidence: [],
            visibility: "workspace",
            rationale: "Own-company founder packet.",
          },
          progressionRubric: {
            currentStage: "foundation",
            onTrack: false,
            mandatorySatisfied: [],
            mandatoryMissing: [],
            optionalStrengths: [],
            rationale: "Needs stronger proof.",
          },
          benchmarkOracles: [],
        },
        companyReadinessPacket: {
          packetId: "packet:test",
          visibility: "workspace",
          identity: {
            companyName: "NodeBench",
            vertical: "AI/software",
            subvertical: "developer and agent tooling",
            stage: "Stage 1: Foundation",
            mission: "Founder operating system",
            wedge: "Founder packet workflow",
          },
          founderTeamCredibility: [],
          productAndWedge: [],
          marketAndGtm: [],
          financialReadiness: [],
          operatingReadiness: [],
          diligenceEvidence: [],
          contradictionsAndHiddenRisks: [],
          nextUnlocks: [],
          pricingStage: {
            stageId: "foundation",
            label: "Stage 1: Foundation",
            priceLabel: "$1",
          },
          distributionSurfaceStatus: [],
          provenance: {
            sourceRefIds: [],
            confidence: 84,
            freshness: new Date().toISOString(),
          },
          allowedDestinations: ["slack_onepage"],
          sensitivity: "workspace",
        },
      },
      "founder",
    );

    expect(enriched.entityName).toBe("NodeBench");
    expect(enriched.canonicalEntity).toBe("NodeBench");
    expect(enriched.packetType).toBe("founder_progression_packet");
  });

  it("uses the selected lens when building live progress and proof graph state", () => {
    const progress = buildLiveProgressModel({
      query: basePacket.query,
      lens: "banker",
      trace: [
        { step: "classify_query", status: "ok", detail: "parsed", durationMs: 12 },
        { step: "build_context_bundle", status: "ok", detail: "loaded", durationMs: 18 },
        { step: "tool_call", tool: "linkup_search", status: "ok", detail: "searched", durationMs: 40 },
        { step: "judge", status: "ok", detail: "retained", durationMs: 25 },
        { step: "assemble_response", status: "ok", detail: "assembled", durationMs: 14 },
      ],
      packet: basePacket,
    });

    expect(progress.personaId).toBe("JPM_STARTUP_BANKER");
    expect(progress.stages.find((stage) => stage.id === "intent")?.status).toBe("completed");
    expect(progress.stages.find((stage) => stage.id === "sources")?.status).toBe("completed");
    expect(progress.stages.find((stage) => stage.id === "answer")?.status).toBe("completed");
    expect(progress.graphSummary.nodeCount).toBeGreaterThan(0);
  });
});
