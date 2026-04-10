import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultWorkspace } from "./ResultWorkspace";
import type { ResultPacket } from "./searchTypes";

vi.mock("@/features/telemetry/TrajectoryPanel", () => ({
  TrajectoryPanel: () => <div data-testid="trajectory-panel">Trajectory</div>,
}));

const packet: ResultPacket = {
  query: "Analyze NodeBench for a founder.",
  entityName: "NodeBench",
  answer:
    "NodeBench has a reusable founder packet loop, but proof still breaks when claims are detached from citations. The current packet needs stronger handoff and cleaner comparables before it feels investor-grade.",
  confidence: 78,
  sourceCount: 4,
  variables: [
    { rank: 1, name: "Founder packet reuse is becoming a real workflow", direction: "up", impact: "high", sourceIdx: 0 },
    { rank: 2, name: "Ask surface still over-exposes internal machinery", direction: "down", impact: "high", sourceIdx: 1 },
  ],
  keyMetrics: [
    { label: "Cited sources", value: "2" },
    { label: "Contradictions", value: "1" },
  ],
  changes: [{ description: "Shared context packet is now available in the control plane", date: "Apr 2026", sourceIdx: 0 }],
  risks: [
    {
      title: "Proof is detached from claims",
      description: "The answer still forces users to inspect a separate source map instead of seeing citations next to the claim.",
      sourceIdx: 1,
    },
  ],
  comparables: [
    { name: "Claude Research", relevance: "high", note: "Citation-first research flow with bounded answer framing." },
    { name: "", relevance: "low", note: "" },
  ],
  nextQuestions: [
    "What exact evidence would upgrade the founder packet from plausible to trusted?",
    "Which packet should be delegated first?",
  ],
  sourceRefs: [
    {
      id: "source:1",
      label: "Founder memo",
      title: "Founder memo",
      href: "https://example.com/founder-memo",
      type: "web",
      status: "cited",
      domain: "example.com",
      excerpt: "Reusable founder packet and handoff notes.",
      confidence: 88,
    },
    {
      id: "source:2",
      label: "UX audit",
      title: "UX audit",
      href: "https://example.com/ux-audit",
      type: "web",
      status: "cited",
      domain: "example.com",
      excerpt: "The current ask surface still separates claims from proof.",
      confidence: 82,
    },
  ],
  claimRefs: [
    {
      id: "claim:1",
      text: "NodeBench has a reusable founder packet loop.",
      sourceRefIds: ["source:1"],
      answerBlockIds: ["answer:1"],
      status: "retained",
    },
    {
      id: "claim:2",
      text: "The current packet needs stronger handoff and cleaner comparables.",
      sourceRefIds: ["source:2"],
      answerBlockIds: ["answer:1"],
      status: "retained",
    },
  ],
  answerBlocks: [
    {
      id: "answer:1",
      title: "Summary",
      text: "NodeBench has a reusable founder packet loop, but proof still breaks when claims are detached from citations.",
      sourceRefIds: ["source:1", "source:2"],
      claimIds: ["claim:1", "claim:2"],
      status: "cited",
    },
  ],
  explorationMemory: {
    exploredSourceCount: 4,
    citedSourceCount: 2,
    discardedSourceCount: 2,
    entityCount: 1,
    claimCount: 2,
    contradictionCount: 1,
  },
  graphSummary: {
    nodeCount: 10,
    edgeCount: 9,
    clusterCount: 2,
    primaryPath: ["query", "lens", "source", "claim", "answer_block"],
  },
  proofStatus: "drifting",
  uncertaintyBoundary: "The packet still depends on local memory and only two cited sources.",
  recommendedNextAction: "Collapse the first response to truth, proof, next move, and packet readiness.",
  strategicAngles: [
    {
      id: "proof-grade",
      title: "Proof has to become local",
      status: "watch",
      summary: "Claim-level citations should be inline, not detached in a later source map.",
      whyItMatters: "Investors will not inspect a long appendix to validate the core thesis.",
      evidenceRefIds: ["source:2"],
    },
  ],
  forecastGate: {
    streamKey: "founder_confidence",
    valuesCount: 3,
    modelUsed: "search_session_confidence_stream",
    trendDirection: "stable",
    latestOutsideInterval: false,
    confidenceBandWidth: 0.18,
    recommendedAction: "delegate",
    explanation: "The packet has enough observations to support a delegation-ready view.",
    evidenceRefs: ["source:1"],
  },
};

describe("ResultWorkspace", () => {
  it("renders the new four-block ask surface with inline proof", () => {
    render(<ResultWorkspace packet={packet} lens="founder" />);

    expect(screen.getByText("Founder Read")).toBeInTheDocument();
    expect(screen.getByText("Bottom Line")).toBeInTheDocument();
    expect(screen.getAllByText("Founder Truth").length).toBeGreaterThan(0);
    expect(screen.getByText("Why This Holds / Breaks")).toBeInTheDocument();
    expect(screen.getByText("Next Move")).toBeInTheDocument();
    expect(screen.getByText("Ready Packet")).toBeInTheDocument();
    expect(screen.getByText("Workflow Asset")).toBeInTheDocument();
    expect(screen.getByText("Observed")).toBeInTheDocument();
    expect(screen.getByText("Estimated")).toBeInTheDocument();
    expect(screen.getByText("Missing To Believe This")).toBeInTheDocument();
    expect(screen.getByText("2/4 cited")).toBeInTheDocument();
    expect(screen.getByText(/replay ready/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Source 1: Founder memo/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Unnamed comparable")).not.toBeInTheDocument();
    expect(screen.queryByText(packet.answer)).not.toBeInTheDocument();
  });

  it("routes follow-up, publish, delegate, and strategic-angle actions", () => {
    const onFollowUp = vi.fn();
    const onPublishSharedContext = vi.fn();
    const onDelegate = vi.fn();
    const onPublishStrategicAngle = vi.fn();
    const onDelegateStrategicAngle = vi.fn();

    render(
      <ResultWorkspace
        packet={packet}
        lens="founder"
        onFollowUp={onFollowUp}
        onPublishSharedContext={onPublishSharedContext}
        onDelegate={onDelegate}
        onPublishStrategicAngle={onPublishStrategicAngle}
        onDelegateStrategicAngle={onDelegateStrategicAngle}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /run follow-up/i }));
    expect(onFollowUp).toHaveBeenCalledWith("What exact evidence would upgrade the founder packet from plausible to trusted?");

    fireEvent.click(screen.getAllByRole("button", { name: /publish to shared context/i })[0]);
    expect(onPublishSharedContext).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /delegate to claude code/i }));
    expect(onDelegate).toHaveBeenCalledWith("claude_code");

    fireEvent.click(screen.getByRole("button", { name: /publish issue packet/i }));
    expect(onPublishStrategicAngle).toHaveBeenCalledWith("proof-grade");

    fireEvent.click(screen.getByRole("button", { name: /delegate issue/i }));
    expect(onDelegateStrategicAngle).toHaveBeenCalledWith("proof-grade", "claude_code");
  });

  it("surfaces handoff state inside packet readiness", () => {
    render(
      <ResultWorkspace
        packet={packet}
        lens="founder"
        handoffState={{
          status: "published",
          message: "Shared founder packet is live and ready for a coding agent.",
          contextId: "context:founder:1",
          taskId: "task:founder:1",
          handoffPrompt: "Implement the ask surface rewrite using the shared packet.",
        }}
      />,
    );

    expect(screen.getAllByText("Shared founder packet is live and ready for a coding agent.").length).toBeGreaterThan(0);
    expect(screen.getByText(/asset:/i)).toBeInTheDocument();
    expect(screen.getByText("Context context:founder:1")).toBeInTheDocument();
    expect(screen.getByText("Task task:founder:1")).toBeInTheDocument();
    expect(screen.getByText("Implement the ask surface rewrite using the shared packet.")).toBeInTheDocument();
  });

  it("keeps sources, claims, comparables, and trajectory below the fold until opened", () => {
    render(<ResultWorkspace packet={packet} lens="founder" />);

    expect(screen.queryByText("Reusable founder packet and handoff notes.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /inspect sources/i }));
    expect(screen.getByText("Reusable founder packet and handoff notes.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /claim ledger/i }));
    expect(screen.getAllByText("NodeBench has a reusable founder packet loop.").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^comparables/i }));
    expect(screen.getByText("Claude Research")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /agent trajectory/i }));
    expect(screen.getByTestId("trajectory-panel")).toBeInTheDocument();
  });
});
