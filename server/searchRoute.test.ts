/**
 * @vitest-environment node
 */

import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createSearchRouter } from "./routes/search.js";
import type { McpTool } from "../packages/mcp-local/src/types.js";

const weeklyResetTool: McpTool = {
  name: "founder_local_weekly_reset",
  description: "Returns a deterministic weekly reset packet for tests.",
  inputSchema: {},
  handler: async () => ({
    summary: "Weekly founder reset summary",
    confidence: 82,
    keyFindings: ["Ship streaming support"],
    risks: ["Streaming can silently regress without contract coverage"],
    nextSteps: ["Deploy the unified GET/POST route"],
  }),
};

const founderDirectionTool: McpTool = {
  name: "founder_direction_assessment",
  description: "Returns deterministic founder direction pressure-test output for tests.",
  inputSchema: {},
  handler: async () => ({
    assessmentId: "assess_test",
    packetId: "packet_test",
    packetType: "founder_direction_assessment",
    generatedAt: new Date().toISOString(),
    generatedBy: "founder_local_pipeline",
    query: "founder weekly reset",
    lens: "founder",
    summary: "Pressure test completed.",
    confidence: 88,
    sourceRefs: [
      {
        id: "source:claude",
        label: "CLAUDE.md",
        title: "Product identity",
        type: "local",
        status: "cited",
        excerpt: "Local product identity",
      },
    ],
    strategicAngles: [
      {
        id: "stealth-moat",
        title: "Stealth and moat timing",
        status: "watch",
        summary: "Stay relatively stealthy until the moat and market diligence are clearer.",
        whyItMatters: "Premature posting can teach the market what we are doing before the wedge is harder to copy.",
        evidenceRefIds: ["source:claude"],
        nextQuestion: "What are competitors actually doing, and what moat justifies posting now?",
      },
      {
        id: "team-shape",
        title: "Team shape",
        status: "watch",
        summary: "The team needs stronger complementary GTM coverage.",
        whyItMatters: "Founder edge is necessary but not sufficient.",
        evidenceRefIds: ["source:claude"],
        nextQuestion: "What complementary capability closes the GTM gap fastest?",
      },
    ],
    recommendedNextAction: "Resolve team shape before broadening the roadmap.",
    nextQuestions: ["What complementary capability closes the GTM gap fastest?"],
    issueAngles: ["team-shape"],
    progressionProfile: {
      currentStage: "foundation",
      currentStageLabel: "Stage 1: Foundation",
      readinessScore: 62,
      missingFoundations: ["Investor-ready memo"],
      hiddenRisks: ["Team shape remains narrow"],
      nextUnlocks: [
        {
          id: "useful-packet",
          title: "Generate one useful founder packet and use it in a real decision",
          status: "ready",
          requiredSignals: ["Founder packet exported"],
        },
      ],
      delegableWork: ["Prepare the Slack report"],
      founderOnlyWork: ["Choose the wedge"],
      onTrackStatus: "watch",
      recommendedNextAction: "Resolve team shape before broadening the roadmap.",
    },
    progressionTiers: [
      { id: "clarity", label: "Stage 0: Clarity", priceLabel: "Free", unlocks: [], services: [] },
      { id: "foundation", label: "Stage 1: Foundation", priceLabel: "$1", unlocks: [], services: [] },
    ],
    diligencePack: {
      id: "ai_software",
      label: "AI / Software Diligence Pack",
      summary: "Workflow adoption and installability proof.",
      externalEvaluators: ["Developers"],
      evidenceClasses: [],
      requirements: [],
      highRiskClaims: ["workflow lock-in"],
      materials: ["Founder packet", "Slack one-page report"],
      readyDefinition: "Ready when the workflow is installable and benchmarked.",
    },
    readinessScore: 62,
    unlocks: [
      {
        id: "useful-packet",
        title: "Generate one useful founder packet and use it in a real decision",
        status: "ready",
        requiredSignals: ["Founder packet exported"],
      },
    ],
    materialsChecklist: [
      {
        id: "material:1",
        label: "Slack one-page report",
        status: "watch",
        audience: "external",
        whyItMatters: "Makes the founder packet easy to share.",
      },
    ],
    scorecards: [
      {
        id: "two_week",
        label: "2-week scorecard",
        status: "watch",
        summary: "Ship one packet and one exported artifact.",
        mustHappen: ["Produce one useful founder packet"],
      },
    ],
    shareableArtifacts: [
      {
        id: "artifact:slack_onepage",
        type: "slack_onepage",
        title: "Founder one-page Slack report",
        visibility: "workspace",
        summary: "Slack report",
        payload: { text: "*NodeBench Founder Report*" },
      },
    ],
    visibility: "workspace",
    benchmarkEvidence: [
      {
        benchmarkId: "bench_1",
        lane: "weekly_founder_reset",
        objective: "Build weekly founder reset proof.",
        packetRef: "packet_test",
        agentsInvolved: ["nodebench"],
        actionsTaken: ["Gather context"],
        beforeState: "Scattered context",
        afterState: "Packet ready",
        artifactsProduced: ["Founder packet"],
        validationPasses: ["Packet assembled"],
        validationFailures: [],
        timeMs: 1200,
        estimatedCostUsd: 0.2,
        humanInterventions: ["Approve"],
        reuseScore: 60,
        summary: "Weekly founder reset benchmark.",
      },
    ],
    workflowComparison: {
      objective: "Pressure-test the direction and export the founder packet.",
      currentPath: ["Restate the company context manually", "Draft a memo from scratch"],
      optimizedPath: ["Reuse the founder packet", "Export the Slack one-page report"],
      rationale: "Packet reuse removes repeated restatement and keeps the workflow auditable.",
      validationChecks: ["The same artifact still exists", "Required diligence fields remain present"],
      estimatedSavings: {
        timePercent: 38,
        costPercent: 24,
      },
      verdict: "valid",
    },
    operatingModel: {
      executionOrder: [
        { id: "ingest", label: "Ingest", description: "Collect allowed founder context." },
        { id: "route", label: "Route", description: "Choose packet and artifact types." },
      ],
      queueTopology: [
        {
          id: "packet_refresh",
          label: "Refresh",
          purpose: "Refresh sweeps and packet state.",
          upstream: ["sweeps"],
          outputs: ["packet refresh"],
        },
      ],
      sourcePolicies: [
        {
          sourceType: "uploads",
          canRead: true,
          canStore: true,
          canSummarize: true,
          exportPolicy: "redact",
          notes: "Uploads stay private by default.",
        },
      ],
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
        rationale: "Use the founder packet as the canonical route for own-company questions.",
      },
      progressionRubric: {
        currentStage: "foundation",
        onTrack: false,
        mandatorySatisfied: ["Founder packet exported"],
        mandatoryMissing: ["External proof story"],
        optionalStrengths: ["shareable_artifact"],
        rationale: "External proof story is still missing.",
      },
      benchmarkOracles: [
        {
          lane: "weekly_founder_reset",
          deterministicChecks: ["packet present"],
          probabilisticJudges: ["usefulness"],
          baseline: "manual founder recap",
          heldOutScenarios: ["messy startup context"],
        },
      ],
    },
    distributionSurfaceStatus: [
      {
        surfaceId: "mcp_cli",
        label: "MCP / CLI",
        status: "ready",
        whyItMatters: "Low-friction install surface.",
      },
    ],
    companyReadinessPacket: {
      packetId: "packet_test",
      visibility: "workspace",
      identity: {
        companyName: "NodeBench",
        vertical: "AI/software",
        subvertical: "developer and agent tooling",
        stage: "Stage 1: Foundation",
        mission: "Founder operating system",
        wedge: "Founder packet workflow",
      },
      founderTeamCredibility: ["Map background to wedge"],
      productAndWedge: ["Founder operating system"],
      marketAndGtm: ["Meet users in existing workflows"],
      financialReadiness: ["Track runway"],
      operatingReadiness: ["Delegate the Slack report"],
      diligenceEvidence: ["Founder packet"],
      contradictionsAndHiddenRisks: ["Team shape remains narrow"],
      nextUnlocks: ["Generate one useful founder packet and use it in a real decision"],
      pricingStage: {
        stageId: "foundation",
        label: "Stage 1: Foundation",
        priceLabel: "$1",
      },
      distributionSurfaceStatus: [
        {
          surfaceId: "mcp_cli",
          label: "MCP / CLI",
          status: "ready",
          whyItMatters: "Low-friction install surface.",
        },
      ],
      provenance: {
        sourceRefIds: ["source:claude"],
        confidence: 88,
        freshness: new Date().toISOString(),
      },
      allowedDestinations: ["slack_onepage"],
      sensitivity: "workspace",
    },
    companyNamingPack: {
      suggestedNames: ["NodeBench", "Signal Forge"],
      recommendedName: "NodeBench",
      starterProfile: {
        companyName: "NodeBench",
        oneLineDescription: "Founder operating system for reusable packets.",
        categories: ["AI/software"],
        stage: "Stage 1: Foundation",
        initialCustomers: ["Founders"],
        wedge: "Founder packet workflow",
      },
    },
  }),
};

const founderGatherTool: McpTool = {
  name: "founder_local_gather",
  description: "Returns deterministic local founder context for tests.",
  inputSchema: {},
  handler: async () => ({
    identity: {
      projectName: "NodeBench",
      packageName: "NodeBench",
    },
    publicSurfaces: {
      indexHtmlSiteName: "NodeBench",
      indexHtmlTitle: "NodeBench — Entity Intelligence for Any Company, Market, or Question",
    },
    company: {
      name: "Your Workspace",
      canonicalMission: "NodeBench is a founder operating system with reusable packets.",
      identityConfidence: 72,
    },
    summary: "Founder context gathered from the local workspace.",
    recentActions: [
      { description: "Founder packet loop shipped", date: "2026-03-30" },
    ],
    signals: [
      { name: "Founder packet workflow active", direction: "up", impact: "high" },
    ],
    contradictions: [
      { claim: "Routing still drifts into generic workspace mode", evidence: "Own-company prompts should not look generic." },
    ],
    nextActions: [
      { action: "Route own-company founder queries into the founder progression packet." },
    ],
  }),
};

describe("createSearchRouter", () => {
  let server: ReturnType<express.Express["listen"]>;
  let baseUrl = "";
  const savedEnv = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    LINKUP_API_KEY: process.env.LINKUP_API_KEY,
  };

  beforeAll(async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.LINKUP_API_KEY;

    const app = express();
    app.use(express.json());
    app.use(createSearchRouter([weeklyResetTool, founderDirectionTool, founderGatherTool]));

    server = await new Promise<ReturnType<express.Express["listen"]>>((resolve) => {
      const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind ephemeral test server");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    process.env.GEMINI_API_KEY = savedEnv.GEMINI_API_KEY;
    process.env.GOOGLE_AI_API_KEY = savedEnv.GOOGLE_AI_API_KEY;
    process.env.OPENAI_API_KEY = savedEnv.OPENAI_API_KEY;
    process.env.OPENROUTER_API_KEY = savedEnv.OPENROUTER_API_KEY;
    process.env.ANTHROPIC_API_KEY = savedEnv.ANTHROPIC_API_KEY;
    process.env.LINKUP_API_KEY = savedEnv.LINKUP_API_KEY;

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it("streams weekly-reset responses over both GET and POST", async () => {
    const encodedQuery = encodeURIComponent("founder weekly reset");

    const getResponse = await fetch(`${baseUrl}/?query=${encodedQuery}&stream=true`, {
      headers: { Accept: "text/event-stream" },
    });
    const getText = await getResponse.text();

    const postResponse = await fetch(`${baseUrl}/?stream=true`, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "founder weekly reset" }),
    });
    const postText = await postResponse.text();

    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    expect(getResponse.headers.get("content-type")).toContain("text/event-stream");
    expect(postResponse.headers.get("content-type")).toContain("text/event-stream");
    expect(getText).toContain('"type":"trace"');
    expect(getText).toContain('"type":"result"');
    expect(getText).toContain('"classification":"weekly_reset"');
    expect(getText).toContain('"strategicAngles"');
    expect(postText).toContain('"type":"trace"');
    expect(postText).toContain('"type":"result"');
    expect(postText).toContain('"classification":"weekly_reset"');
    expect(postText).toContain('"strategicAngles"');
    expect(postText).toContain('"team-shape"');
    expect(postText).toContain('"stealth-moat"');
    expect(postText).toContain('"progressionProfile"');
    expect(postText).toContain('"diligencePack"');
      expect(postText).toContain('"shareableArtifacts"');
      expect(postText).toContain('"workflowComparison"');
      expect(postText).toContain('"operatingModel"');
      expect(postText).toContain('"companyNamingPack"');
  });

  it("routes own-company founder queries into founder progression packets instead of generic workspace packets", async () => {
    const response = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "Given everything about my company, what should I do next? We are building founder-first MCP and dashboard tooling.",
        lens: "founder",
      }),
    });

    const payload = await response.json() as any;

    expect(response.status).toBe(200);
    expect(payload.classification).toBe("founder_progression");
    expect(payload.result?.packetType).toBe("founder_progression_packet");
    expect(payload.resultPacket?.packetType).toBe("founder_progression_packet");
    expect(payload.result?.canonicalEntity?.name).toBe("NodeBench");
    expect(payload.resultPacket?.entityName).toBe("NodeBench");
    expect(payload.result?.companyReadinessPacket?.identity?.companyName).toBe("NodeBench");
    expect(payload.result?.companyNamingPack?.recommendedName).toBe("NodeBench");
    expect(payload.result?.companyNamingPack?.starterProfile?.companyName).toBe("NodeBench");
    expect(payload.result?.operatingModel?.packetRouter?.companyMode).toBe("own_company");
  });
});
