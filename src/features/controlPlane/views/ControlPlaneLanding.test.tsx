import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class IntersectionObserver {
    constructor(
      _cb: IntersectionObserverCallback,
      _opts?: IntersectionObserverInit,
    ) {}
    readonly root = null;
    readonly rootMargin = "0px";
    readonly thresholds: readonly number[] = [0];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as unknown as typeof globalThis.IntersectionObserver;
}

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
  useAction: () => vi.fn(),
}));

vi.mock("@/hooks/useVoiceInput", () => ({
  useVoiceInput: () => ({
    isListening: false,
    isSupported: true,
    start: vi.fn(),
    toggle: vi.fn(),
    stop: vi.fn(),
    mode: "browser",
    isTranscribing: false,
    error: null,
    latencyMs: null,
    audioLevel: 0,
    interimText: "",
    stableText: "",
    speechState: "idle",
    confidence: 0,
  }),
}));

vi.mock("@/hooks/useRevealOnMount", () => ({
  useRevealOnMount: () => ({
    ref: { current: null },
    isVisible: true,
    instant: true,
  }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("../components/RecentSearchHistory", () => ({
  RecentSearchHistory: () => null,
}));

import { ControlPlaneLanding } from "./ControlPlaneLanding";

describe("ControlPlaneLanding", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders founder-first hero copy, role lenses, and example prompts", () => {
    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        name: /ask about your company, a competitor, or a market shift/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/founder-first by default\. search public and private context/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("landing-lens-founder")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("landing-example-prompts")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /generate my founder weekly reset/i,
      }),
    ).toBeInTheDocument();
  });

  it("persists the selected lens", () => {
    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByTestId("landing-lens-banker"));

    expect(localStorage.getItem("nodebench-selected-role")).toBe("banker");
  });

  it("starts the live founder progress flow when a demo prompt is clicked", () => {
    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /generate my founder weekly reset/i,
      }),
    );

    expect(screen.getByText("Exploration Memory")).toBeInTheDocument();
    expect(screen.getByText("Query received")).toBeInTheDocument();
  });

  it("renders the normalized live result packet returned by the search API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
      },
      json: async () => ({
        success: true,
        classification: "important_change",
        result: {
          canonicalEntity: {
            name: "Cohere",
            canonicalMission: "Cohere is focusing on enterprise retrieval and agent orchestration.",
            identityConfidence: 91,
          },
        },
        resultPacket: {
          query: "Analyze Cohere for a founder.",
          entityName: "Cohere",
          answer: "Cohere is focusing on enterprise retrieval and agent orchestration.",
          confidence: 91,
          sourceCount: 2,
          variables: [],
          keyMetrics: [
            { label: "Confidence", value: "91%" },
            { label: "Sources", value: "2" },
          ],
          sourceRefs: [
            {
              id: "source:1",
              label: "Cohere source",
              title: "Cohere source",
              type: "web",
              status: "cited",
              domain: "example.com",
              excerpt: "Cohere evidence",
            },
          ],
          answerBlocks: [
            {
              id: "answer:block:summary",
              title: "Bottom line",
              text: "Cohere is focusing on enterprise retrieval and agent orchestration.",
              sourceRefIds: ["source:1"],
              claimIds: [],
              status: "cited",
            },
          ],
          claimRefs: [],
          explorationMemory: {
            exploredSourceCount: 2,
            citedSourceCount: 1,
            discardedSourceCount: 1,
            entityCount: 1,
            claimCount: 0,
            contradictionCount: 0,
          },
          graphSummary: {
            nodeCount: 7,
            edgeCount: 5,
            clusterCount: 1,
            primaryPath: ["query", "lens", "persona", "source", "answer_block", "artifact"],
          },
          proofStatus: "provisional",
          uncertaintyBoundary: "Directional until refreshed.",
          recommendedNextAction: "Benchmark Cohere.",
          graphNodes: [],
          graphEdges: [],
          nextQuestions: ["What changed that matters most?"],
        },
        trace: [
          { step: "classify_query", durationMs: 5, status: "ok", detail: "type=important_change" },
          { step: "assemble_response", durationMs: 3, status: "ok", detail: "latency=8ms" },
        ],
        latencyMs: 8,
      }),
    } as unknown as Response);

    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/search nodebench/i), {
      target: { value: "Analyze Cohere for a founder." },
    });
    fireEvent.click(screen.getByTestId("landing-search-submit"));

    await waitFor(() => {
      expect(screen.getByText("Cohere")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/enterprise retrieval and agent orchestration/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Source Map")).toBeInTheDocument();
    expect(screen.getByText("How we got this answer")).toBeInTheDocument();
  });
});
