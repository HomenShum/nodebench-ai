import { describe, expect, it } from "vitest";

import { founderLocalPipelineTools } from "../tools/founderLocalPipeline.js";

function getTool(name: string) {
  const tool = founderLocalPipelineTools.find((entry) => entry.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

describe("founder_direction_assessment", () => {
  it("returns proactive strategic angles for founder direction pressure tests", async () => {
    const tool = getTool("founder_direction_assessment");

    const result = await tool.handler({
      query: "Given the current founder own-company result UX, pressure-test whether we should stay local-first, optional AI, and evolve into a Claude Code-native dashboard subscription for teams before we post publicly.",
      lens: "founder",
      userSkillset: ["product engineering", "MCP tooling"],
      constraints: ["specific skillset", "environmental concern about AI"],
      marketWorkflow: ["Claude Code", "local MCP", "team dashboards"],
      extraContext: "We need to prove installability, maintainability, investor credibility, sellability, and whether we should stay stealthy until we have a moat that is not easily duplicated.",
    }) as any;

    expect(result.packetType).toBe("founder_direction_assessment");
    expect(result.confidence).toBeGreaterThanOrEqual(55);
    expect(result.sourceRefs.length).toBeGreaterThan(0);
    expect(result.strategicAngles.some((angle: { id: string }) => angle.id === "stealth-moat")).toBe(true);
    expect(result.strategicAngles.some((angle: { id: string }) => angle.id === "team-shape")).toBe(true);
    expect(result.strategicAngles.some((angle: { id: string }) => angle.id === "installability")).toBe(true);
    expect(result.strategicAngles.some((angle: { id: string }) => angle.id === "maintainability")).toBe(true);
    expect(result.strategicAngles.some((angle: { id: string }) => angle.id === "adoption")).toBe(true);
    expect(result.strategicAngles.some((angle: { id: string }) => angle.id === "commercial")).toBe(true);
    expect(result.strategicAngles.some((angle: { id: string }) => angle.id === "ai-tradeoffs")).toBe(true);
    expect(result.nextQuestions.some((question: string) => /competitors|copy/i.test(question))).toBe(true);
    expect(result.issueAngles.length).toBeGreaterThan(0);
    expect(result.recommendedNextAction).toMatch(/resolve/i);
    expect(result.nextQuestions.length).toBeGreaterThan(0);
    expect(result.progressionProfile.currentStageLabel).toMatch(/Stage/);
    expect(result.readinessScore).toBeGreaterThan(0);
    expect(result.progressionTiers.length).toBeGreaterThanOrEqual(4);
    expect(result.diligencePack.label.length).toBeGreaterThan(0);
    expect(result.materialsChecklist.length).toBeGreaterThan(0);
    expect(result.scorecards.length).toBeGreaterThan(0);
    expect(result.shareableArtifacts.some((artifact: { type: string }) => artifact.type === "slack_onepage")).toBe(true);
    expect(result.visibility).toBe("workspace");
    expect(result.workflowComparison.verdict).toBe("valid");
    expect(result.workflowComparison.optimizedPath.length).toBeGreaterThan(0);
    expect(result.operatingModel.packetRouter.packetType.length).toBeGreaterThan(0);
    expect(result.operatingModel.executionOrder.length).toBeGreaterThan(0);
    expect(result.operatingModel.progressionRubric.currentStage).toBe(result.progressionProfile.currentStage);
    expect(result.operatingModel.benchmarkOracles.length).toBeGreaterThan(0);
    expect(result.companyReadinessPacket.identity.companyName).toBe("NodeBench");
    expect(result.companyNamingPack.recommendedName).toBe("NodeBench");
    expect(result.companyNamingPack.suggestedNames.length).toBeGreaterThan(0);
  });
});
