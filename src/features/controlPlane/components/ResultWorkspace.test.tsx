import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/founder/views/ShareableMemoView", () => ({
  generateMemoId: () => "memo_test",
  saveMemoToStorage: vi.fn(),
  copyMemoUrl: vi.fn(),
}));

vi.mock("@/features/telemetry/TrajectoryPanel", () => ({
  TrajectoryPanel: () => <div data-testid="trajectory-panel">Trajectory</div>,
}));

vi.mock("./SyncProvenanceBadge", () => ({
  SyncProvenanceBadge: () => null,
}));

import { ResultWorkspace } from "./ResultWorkspace";
import type { ResultPacket } from "./searchTypes";

const founderPacket: ResultPacket = {
  query: "Analyze NodeBench for a founder.",
  entityName: "NodeBench",
  answer: "NodeBench is becoming a founder-first operating system with reusable packets.",
  confidence: 88,
  sourceCount: 2,
  variables: [{ rank: 1, name: "Founder workflow", direction: "up", impact: "high" }],
  sourceRefs: [
    {
      id: "source:1",
      label: "Founder memo",
      title: "Founder memo",
      type: "web",
      status: "cited",
      domain: "example.com",
      excerpt: "Primary founder evidence excerpt.",
      confidence: 88,
    },
    {
      id: "source:2",
      label: "Benchmark note",
      title: "Benchmark note",
      type: "web",
      status: "explored",
      domain: "bench.example.com",
      excerpt: "Secondary benchmark excerpt for keyboard focus.",
      confidence: 82,
    },
  ],
  answerBlocks: [
    {
      id: "answer:1",
      title: "Bottom line",
      text: "Founder packet summary.",
      sourceRefIds: ["source:1"],
      claimIds: ["claim:1"],
      status: "cited",
    },
  ],
  claimRefs: [
    {
      id: "claim:1",
      text: "NodeBench compresses founder context into one packet.",
      sourceRefIds: ["source:1"],
      answerBlockIds: ["answer:1"],
      status: "retained",
    },
  ],
  explorationMemory: {
    exploredSourceCount: 2,
    citedSourceCount: 1,
    discardedSourceCount: 1,
    entityCount: 1,
    claimCount: 1,
    contradictionCount: 0,
  },
  graphSummary: {
    nodeCount: 8,
    edgeCount: 6,
    clusterCount: 1,
    primaryPath: ["query", "lens", "persona", "source", "answer_block", "artifact"],
  },
  proofStatus: "verified",
  uncertaintyBoundary: "Requires refreshed live data for public claims.",
  recommendedNextAction: "Ship the founder packet and benchmark proof.",
  strategicAngles: [
    {
      id: "stealth-moat",
      title: "Stealth and moat timing",
      status: "watch",
      summary: "Stay private until the wedge is harder to copy.",
      whyItMatters: "Premature posting teaches the market.",
      evidenceRefIds: ["source:1"],
      nextQuestion: "What moat justifies going public now?",
    },
  ],
  progressionProfile: {
    currentStage: "foundation",
    currentStageLabel: "Stage 1: Foundation",
    readinessScore: 64,
    missingFoundations: ["Investor-ready memo"],
    hiddenRisks: ["Distribution proof still thin"],
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
    recommendedNextAction: "Ship the founder packet and benchmark proof.",
  },
  progressionTiers: [
    { id: "clarity", label: "Stage 0: Clarity", priceLabel: "Free", unlocks: ["Search and ask"], services: [] },
    { id: "foundation", label: "Stage 1: Foundation", priceLabel: "$1", unlocks: ["Readiness checklist"], services: [] },
    { id: "readiness", label: "Stage 2: Readiness", priceLabel: "$5", unlocks: ["Investor packet"], services: [] },
  ],
  diligencePack: {
    id: "ai_software",
    label: "AI / Software Diligence Pack",
    summary: "Workflow adoption, installability, and benchmark proof.",
    externalEvaluators: ["Founders", "Investors", "Bankers"],
    evidenceClasses: [],
    requirements: [],
    highRiskClaims: ["workflow lock-in"],
    materials: ["Founder packet", "Slack one-page report"],
    readyDefinition: "Ready when installability, proof, and distribution are all explicit.",
  },
  readinessScore: 64,
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
      summary: "Ship one useful packet and one shareable artifact.",
      mustHappen: ["Produce one useful founder packet"],
    },
    {
      id: "three_month",
      label: "3-month scorecard",
      status: "watch",
      summary: "Publish one benchmark-backed proof story.",
      mustHappen: ["Show repeated packet reuse"],
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
      benchmarkId: "bench:1",
      lane: "weekly_founder_reset",
      objective: "Run the weekly founder reset autopilot.",
      packetRef: "packet:1",
      agentsInvolved: ["nodebench", "claude_code"],
      actionsTaken: ["Gather", "Synthesize", "Export"],
      beforeState: "Scattered founder context",
      afterState: "One reusable packet",
      artifactsProduced: ["Founder packet"],
      validationPasses: ["Packet assembled"],
      validationFailures: [],
      timeMs: 1800,
      estimatedCostUsd: 0.24,
      humanInterventions: ["Approve the export"],
      reuseScore: 72,
      summary: "Weekly reset autopilot proves the founder packet loop.",
    },
  ],
  workflowComparison: {
    objective: "Shorten the founder packet workflow.",
    currentPath: ["Restate the context manually", "Draft the memo from scratch"],
    optimizedPath: ["Reuse the founder packet", "Copy the Slack report"],
    rationale: "Packet reuse removes repeated restatement.",
    validationChecks: ["The same artifact still exists"],
    estimatedSavings: { timePercent: 38, costPercent: 24 },
    verdict: "valid",
  },
  operatingModel: {
    executionOrder: [
      { id: "ingest", label: "Ingest", description: "Collect founder inputs." },
      { id: "route", label: "Route", description: "Choose the packet and artifact." },
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
        notes: "Founder uploads stay private by default.",
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
      rationale: "Use the founder packet as the canonical route for own-company work.",
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
        heldOutScenarios: ["messy founder context"],
      },
    ],
  },
  distributionSurfaceStatus: [
    {
      surfaceId: "mcp_cli",
      label: "MCP / CLI",
      status: "ready",
      whyItMatters: "Fastest install path for founders using Claude Code.",
    },
    {
      surfaceId: "dashboard",
      label: "Dashboard",
      status: "partial",
      whyItMatters: "Shared review and approvals drive team retention.",
    },
  ],
  companyReadinessPacket: {
    packetId: "packet:1",
    visibility: "workspace",
    identity: {
      companyName: "NodeBench",
      vertical: "AI/software",
      subvertical: "developer and agent tooling",
      stage: "Stage 1: Foundation",
      mission: "Founder operating system",
      wedge: "Reusable founder packets",
    },
    founderTeamCredibility: ["Map background to wedge"],
    productAndWedge: ["Founder operating system"],
    marketAndGtm: ["Meet users inside Claude Code"],
    financialReadiness: ["Track runway clearly"],
    operatingReadiness: ["Prepare the Slack report"],
    diligenceEvidence: ["Founder packet"],
    contradictionsAndHiddenRisks: ["Distribution proof still thin"],
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
        whyItMatters: "Fastest install path for founders using Claude Code.",
      },
      {
        surfaceId: "dashboard",
        label: "Dashboard",
        status: "partial",
        whyItMatters: "Shared review and approvals drive team retention.",
      },
    ],
    provenance: {
      sourceRefIds: ["source:1"],
      confidence: 88,
      freshness: new Date().toISOString(),
    },
    allowedDestinations: ["slack_onepage", "investor_memo"],
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
      wedge: "Reusable founder packets",
    },
  },
};

describe("ResultWorkspace", () => {
  it("renders the added founder progression, diligence, workflow, and benchmark sections", () => {
    render(<ResultWorkspace packet={founderPacket} lens="founder" />);

    expect(screen.getByText("Founder Progression Layer")).toBeInTheDocument();
    expect(screen.getByText("Pricing and Unlock Progress")).toBeInTheDocument();
    expect(screen.getByText("Vertical Diligence Pack")).toBeInTheDocument();
    expect(screen.getByText("Operating Model and Packet Router")).toBeInTheDocument();
    expect(screen.getByText("Canonical Execution Order")).toBeInTheDocument();
    expect(screen.getByText("Workflow Compare")).toBeInTheDocument();
    expect(screen.getByText("Benchmark Proof and Distribution")).toBeInTheDocument();
    expect(screen.getByText("Source Trust Policy")).toBeInTheDocument();
    expect(screen.getByText("Benchmark Oracles")).toBeInTheDocument();
    expect(screen.getByText("AI / Software Diligence Pack")).toBeInTheDocument();
  });

  it("renders the Slack export action and supports source focus interaction", () => {
    render(<ResultWorkspace packet={founderPacket} lens="founder" />);

    fireEvent.click(screen.getByRole("button", { name: /export packet/i }));
    expect(screen.getByRole("button", { name: /report for slack/i })).toBeInTheDocument();

    const secondSource = screen.getByRole("button", { name: /Source: Benchmark note/i });
    fireEvent.focus(secondSource);

    expect(screen.getAllByText("Secondary benchmark excerpt for keyboard focus.").length).toBeGreaterThan(0);
  });
});
