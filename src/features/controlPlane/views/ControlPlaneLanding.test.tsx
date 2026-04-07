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

const convexSearchMock = {
  isAvailable: false,
  startSearch: vi.fn(async () => null),
  reset: vi.fn(),
  state: {
    sessionId: null,
    isSearching: false,
    status: null,
    trace: [],
    result: null,
    error: null,
  },
  session: null,
};

vi.mock("@/hooks/useConvexSearch", () => ({
  useConvexSearch: () => convexSearchMock,
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("../components/RecentSearchHistory", () => ({
  RecentSearchHistory: () => null,
}));

vi.mock("../components/SyncProvenanceBadge", () => ({
  SyncProvenanceBadge: () => null,
}));

vi.mock("../components/ResultWorkspace", () => ({
  ResultWorkspace: ({
    packet,
  }: {
    packet: { answer?: string; entityName?: string; comparables?: Array<{ name?: string }> };
  }) => (
    <div data-testid="mock-result-workspace">
      <div>Mock Result Workspace</div>
      <div>{packet.entityName}</div>
      <div>{packet.answer}</div>
      <div>
        {(packet.comparables ?? []).map((comparable) => (
          <span key={comparable.name}>{comparable.name}</span>
        ))}
      </div>
    </div>
  ),
}));

import { ControlPlaneLanding } from "./ControlPlaneLanding";

describe("ControlPlaneLanding", () => {
  beforeEach(() => {
    convexSearchMock.isAvailable = false;
    convexSearchMock.startSearch = vi.fn(async () => null);
    convexSearchMock.reset = vi.fn();
    convexSearchMock.state = {
      sessionId: null,
      isSearching: false,
      status: null,
      trace: [],
      result: null,
      error: null,
    };
    convexSearchMock.session = null;
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem("nodebench-auto-fired", "1");
    localStorage.setItem("nodebench-force-live-search", "1");
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/shared-context/episodes?")) {
        return {
          ok: true,
          json: async () => ({ success: true, episodes: [] }),
          headers: { get: () => "application/json" },
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      } as Response;
    }));
  });

  it("renders founder-first ask hero, role lenses, and quick actions", async () => {
    render(<ControlPlaneLanding onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect((global.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(0);
    });

    expect(
      screen.getByRole("heading", {
        name: /what do you want nodebench to help with/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/search a company, describe your startup, upload files, or ask what to do next/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("landing-lens-founder")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("landing-example-prompts")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /analyze my startup idea/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /connect nodebench-mcp/i,
      }),
    ).toBeInTheDocument();
  });

  it("persists the selected lens", async () => {
    render(<ControlPlaneLanding onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect((global.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByTestId("landing-lens-banker"));

    await waitFor(() => {
      expect(localStorage.getItem("nodebench-selected-role")).toBe("banker");
    });
  });

  it("expands the MCP guide when the connect quick action is clicked", async () => {
    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /connect nodebench-mcp/i,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /hide mcp steps/i })).toBeInTheDocument();
    });
  });

  it("prepares founder search submission state for live queries", async () => {
    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/search nodebench/i), {
      target: { value: "Analyze Cohere for a founder." },
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/search nodebench/i)).toHaveValue("Analyze Cohere for a founder.");
      expect(screen.getByTestId("landing-search-submit")).not.toBeDisabled();
    });
    expect(screen.getByTestId("landing-search-submit")).not.toBeDisabled();
  });

  it("submits a live founder search, renders the packet, and finalizes the founder episode", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/shared-context/episodes?")) {
        return {
          ok: true,
          json: async () => ({ success: true, episodes: [] }),
          headers: { get: () => "application/json" },
        } as Response;
      }
      if (url.endsWith("/api/shared-context/episodes/start")) {
        return {
          ok: true,
          json: async () => ({ success: true, episode: { status: "active", spans: [], toolsInvoked: [], artifactsProduced: [] } }),
          headers: { get: () => "application/json" },
        } as Response;
      }
      if (url.includes("/api/shared-context/episodes/") && url.endsWith("/finalize")) {
        return {
          ok: true,
          json: async () => ({ success: true, episode: { status: "completed", spans: [], toolsInvoked: [], artifactsProduced: [] } }),
          headers: { get: () => "application/json" },
        } as Response;
      }
      if (url.includes("/search?stream=true")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            classification: "competitor",
            latencyMs: 812,
            trace: [
              { step: "classify_query", tool: "classify_query", startMs: 1, endMs: 2, durationMs: 1, status: "ok", detail: "competitor" },
              { step: "tool_call", tool: "linkup_search", startMs: 2, endMs: 6, durationMs: 4, status: "ok", detail: "peer set" },
            ],
            resultPacket: {
              query: "Analyze Cohere competitive position 2026",
              entityName: "Cohere",
              answer: "Cohere is sharpening its enterprise position as buyers compare it with Anthropic, OpenAI, and Google.",
              confidence: 84,
              sourceCount: 3,
              variables: [
                { rank: 1, name: "Enterprise adoption broadening", direction: "up", impact: "high" },
              ],
              keyMetrics: [
                { label: "Confidence", value: "84%" },
              ],
              changes: [
                { description: "Cohere expanded its enterprise positioning in 2026." },
              ],
              risks: [
                { title: "Enterprise bundling pressure", description: "Large platform rivals can compress pricing and distribution." },
              ],
              comparables: [
                { name: "Anthropic", relevance: "high", note: "Competes for enterprise AI budgets." },
              ],
              whyThisTeam: {
                founderCredibility: "Cohere's team is credible because it combines frontier model research with enterprise trust positioning.",
                trustSignals: ["Large enterprise traction", "Frontier model pedigree"],
                visionMagnitude: "Company-scale platform play.",
                reinventionCapacity: "The team has repeatedly expanded from safety positioning into broader enterprise workflows.",
                hiddenRequirements: ["Durable enterprise retention", "Clear pricing discipline"],
              },
              nextActions: [
                { action: "Benchmark Cohere against Anthropic on enterprise win rates and retention.", impact: "high" },
              ],
              nextQuestions: [
                "What does enterprise retention look like relative to Anthropic?",
              ],
              sourceRefs: [
                { id: "src:1", label: "Cohere enterprise update", href: "https://example.com/cohere", type: "web", status: "cited" },
              ],
              answerBlocks: [
                {
                  id: "answer:block:summary",
                  title: "Bottom line",
                  text: "Cohere is sharpening its enterprise position as buyers compare it with Anthropic, OpenAI, and Google.",
                  sourceRefIds: ["src:1"],
                  claimIds: [],
                  status: "cited",
                },
              ],
              claimRefs: [],
              explorationMemory: { exploredSourceCount: 3, citedSourceCount: 3, discardedSourceCount: 0, entityCount: 1, claimCount: 1, contradictionCount: 1 },
              graphSummary: { nodeCount: 4, edgeCount: 3, clusterCount: 1, primaryPath: ["query", "source", "claim", "artifact"] },
              proofStatus: "verified",
              uncertaintyBoundary: "Directional until refreshed.",
              recommendedNextAction: "Benchmark Anthropic against OpenAI on enterprise win rates and retention.",
              graphNodes: [],
              graphEdges: [],
              strategicAngles: [],
              progressionProfile: null,
              progressionTiers: [],
              diligencePack: null,
              readinessScore: null,
              unlocks: [],
              materialsChecklist: [],
              scorecards: [],
              shareableArtifacts: [],
              visibility: "workspace",
              benchmarkEvidence: [],
              workflowComparison: null,
              operatingModel: { packetRouter: { companyMode: "external_company" } },
              distributionSurfaceStatus: [],
              companyReadinessPacket: null,
              companyNamingPack: null,
              interventions: [],
              rawPacket: null,
            },
          }),
          headers: { get: () => "application/json" },
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/search nodebench/i), {
      target: { value: "Analyze Cohere competitive position 2026" },
    });
    expect(screen.getByTestId("landing-search-submit")).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("landing-search-submit"));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/shared-context/episodes/start"))).toBe(true);
    });
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/search?stream=true"))).toBe(true);
    });
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/finalize"))).toBe(true);
    });
    await waitFor(() => {
      expect(screen.getByTestId("landing-result-workspace")).toBeInTheDocument();
      expect(screen.getByText(/current intelligence packet/i)).toBeInTheDocument();
      expect(
        screen.getAllByText(/cohere is sharpening its enterprise position as buyers compare it with anthropic, openai, and google/i).length,
      ).toBeGreaterThan(0);
    });
    const searchCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/search?stream=true"));
    expect(searchCall).toBeTruthy();
    expect(String(searchCall?.[1]?.body)).toContain("Analyze Cohere competitive position 2026");
    expect(String(searchCall?.[1]?.body)).toContain("founder");
  });

  it("handles text/event-stream search responses and does not fall back when the stream completes successfully", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/shared-context/episodes?")) {
        return {
          ok: true,
          json: async () => ({ success: true, episodes: [] }),
          headers: { get: () => "application/json" },
        } as Response;
      }
      if (url.endsWith("/api/shared-context/episodes/start")) {
        return {
          ok: true,
          json: async () => ({ success: true, episode: { status: "active", spans: [], toolsInvoked: [], artifactsProduced: [] } }),
          headers: { get: () => "application/json" },
        } as Response;
      }
      if (url.includes("/api/shared-context/episodes/") && url.endsWith("/finalize")) {
        return {
          ok: true,
          json: async () => ({ success: true, episode: { status: "completed", spans: [], toolsInvoked: [], artifactsProduced: [] } }),
          headers: { get: () => "application/json" },
        } as Response;
      }
      if (url.includes("/search?stream=true")) {
        const encoder = new TextEncoder();
        const chunks = [
          encoder.encode(`data: ${JSON.stringify({
            type: "trace",
            entry: { step: "classify_query", tool: "classify_query", startMs: 1, endMs: 2, status: "ok", detail: "competitor" },
          })}\n\n`),
          encoder.encode(`data: ${JSON.stringify({
            type: "result",
            payload: {
              success: true,
              classification: "competitor",
              latencyMs: 32814,
              result: {
                canonicalEntity: {
                  name: "Anthropic",
                  canonicalMission: "Anthropic is showing a real operating signal: $18B revenue is driven by enterprise demand. The closest operating comparables in the current evidence set are OpenAI and Google. For a banker, the underwriting question is whether Anthropic can defend pricing and contract durability against OpenAI and Google.",
                  identityConfidence: 95,
                },
                signals: [
                  { name: "Revenue is projected to reach $18B in 2026.", direction: "up", impact: "high" },
                ],
                whatChanged: [
                  { description: "Business subscriptions to Claude Code have quadrupled since the start of 2026" },
                ],
                contradictions: [
                  { claim: "Capital intensity", evidence: "Model training and inference costs can compress gross margin and force continued external capital needs." },
                ],
                comparables: [
                  { name: "OpenAI", relevance: "high", note: "Direct operating peer." },
                  { name: "Google", relevance: "medium", note: "Bundled distribution competitor." },
                ],
                whyThisTeam: {
                  founderCredibility: "Former OpenAI leaders with enterprise credibility.",
                  trustSignals: ["Enterprise adoption", "Hyperscaler backing"],
                  visionMagnitude: "Company-scale platform opportunity.",
                  reinventionCapacity: "The team can adapt pricing and product packaging as the market shifts.",
                  hiddenRequirements: ["Durable retention", "Compute discipline"],
                },
                nextActions: [
                  { action: "Benchmark Anthropic against OpenAI on enterprise retention.", impact: "high" },
                ],
                nextQuestions: [
                  "How durable is Anthropic's pricing power versus OpenAI?",
                ],
                sourceRefs: [
                  { id: "src:1", label: "Anthropic enterprise update", href: "https://example.com/anthropic", type: "web", status: "cited" },
                ],
                answerBlocks: [
                  {
                    id: "answer:block:summary",
                    title: "Bottom line",
                    text: "Anthropic is showing a real operating signal: $18B revenue is driven by enterprise demand. The closest operating comparables in the current evidence set are OpenAI and Google. For a banker, the underwriting question is whether Anthropic can defend pricing and contract durability against OpenAI and Google.",
                    sourceRefIds: ["src:1"],
                    claimIds: [],
                    status: "cited",
                  },
                ],
                claimRefs: [],
                explorationMemory: { exploredSourceCount: 8, citedSourceCount: 8, discardedSourceCount: 0, entityCount: 1, claimCount: 2, contradictionCount: 1 },
                graphSummary: { nodeCount: 4, edgeCount: 3, clusterCount: 1, primaryPath: ["query", "source", "claim", "artifact"] },
                proofStatus: "verified",
                uncertaintyBoundary: "Directional until refreshed.",
                recommendedNextAction: "Benchmark Anthropic against OpenAI on enterprise retention.",
                graphNodes: [],
                graphEdges: [],
                packetId: "artifact:test",
                packetType: "competitor_packet",
              },
            },
          })}\n\n`),
        ];
        let chunkIndex = 0;
        return {
          ok: true,
          body: {
            getReader() {
              return {
                async read() {
                  if (chunkIndex >= chunks.length) {
                    return { value: undefined, done: true };
                  }
                  const value = chunks[chunkIndex];
                  chunkIndex += 1;
                  return { value, done: false };
                },
              };
            },
          },
          headers: { get: (name: string) => name.toLowerCase() === "content-type" ? "text/event-stream" : null },
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByTestId("landing-lens-banker"));
    fireEvent.change(screen.getByLabelText(/search nodebench/i), {
      target: { value: "Analyze Anthropic competitive position in enterprise AI for an investor." },
    });
    await waitFor(() => {
      expect(screen.getByTestId("landing-search-submit")).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId("landing-search-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("landing-result-workspace")).toBeInTheDocument();
      expect(screen.getByText(/current intelligence packet/i)).toBeInTheDocument();
      expect(screen.getAllByText(/anthropic/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/^OpenAI$/)).toBeInTheDocument();
      expect(screen.getByText(/^Google$/)).toBeInTheDocument();
    });

    expect(screen.queryByText(/search fell back to a local demo packet after a live retrieval failure/i)).not.toBeInTheDocument();
    const finalizeCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/finalize"));
    expect(String(finalizeCall?.[1]?.body)).toContain("\"status\":\"completed\"");
    expect(String(finalizeCall?.[1]?.body)).not.toContain("fallback_packet");
  });

  it("prefers the stronger streamed resultPacket when the legacy result payload is weaker", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/shared-context/episodes?")) {
        return {
          ok: true,
          json: async () => ({ success: true, episodes: [] }),
          headers: { get: () => "application/json" },
        } as Response;
      }
      if (url.endsWith("/api/shared-context/episodes/start")) {
        return {
          ok: true,
          json: async () => ({ success: true, episode: { status: "active", spans: [], toolsInvoked: [], artifactsProduced: [] } }),
          headers: { get: () => "application/json" },
        } as Response;
      }
      if (url.includes("/api/shared-context/episodes/") && url.endsWith("/finalize")) {
        return {
          ok: true,
          json: async () => ({ success: true, episode: { status: "completed", spans: [], toolsInvoked: [], artifactsProduced: [] } }),
          headers: { get: () => "application/json" },
        } as Response;
      }
      if (url.includes("/search?stream=true")) {
        const encoder = new TextEncoder();
        const chunks = [
          encoder.encode(`data: ${JSON.stringify({
            type: "result",
            payload: {
              success: true,
              classification: "multi_entity",
              latencyMs: 18750,
              result: {
                canonicalEntity: {
                  name: "Anthropic vs OpenAI vs Google",
                  canonicalMission: "Weak legacy summary without banker-grade detail.",
                  identityConfidence: 81,
                },
                sourceRefs: [
                  { id: "src:legacy", label: "Generic roundup", href: "https://example.com/legacy", type: "web", status: "cited" },
                ],
                comparables: [
                  { name: "Generic peer", relevance: "medium", note: "Weak comparable." },
                ],
                whatChanged: [{ description: "One weak change." }],
                contradictions: [{ claim: "Generic risk", evidence: "Generic evidence." }],
                nextActions: [{ action: "Do generic follow-up.", impact: "medium" }],
              },
              resultPacket: {
                query: "Prepare a banker memo on Anthropic vs OpenAI vs Google",
                entityName: "Anthropic vs OpenAI vs Google",
                answer: "Across Anthropic, OpenAI, and Google, the underwriting read turns on enterprise revenue quality, distribution leverage, and whether OpenAI's margin profile can hold as inference costs rise.",
                confidence: 95,
                sourceCount: 4,
                variables: [
                  { rank: 1, name: "Anthropic reached $19B annualized revenue in March 2026.", direction: "up", impact: "high" },
                ],
                keyMetrics: [
                  { label: "Anthropic revenue", value: "$19B" },
                  { label: "OpenAI gross margin", value: "33%" },
                ],
                changes: [
                  { description: "Google Cloud grew 48% year over year in Q4 2025." },
                ],
                risks: [
                  { title: "Pricing pressure", description: "Bundled suites can compress contract durability." },
                ],
                comparables: [
                  { name: "OpenAI", relevance: "high", note: "Direct foundation-model peer." },
                  { name: "Google", relevance: "high", note: "Bundled hyperscaler competitor." },
                ],
                whyThisTeam: null,
                nextActions: [
                  { action: "Build a side-by-side diligence matrix for Anthropic, OpenAI, and Google.", impact: "high" },
                ],
                nextQuestions: [
                  "Where do pricing power and contract durability differ most across the peer set?",
                ],
                sourceRefs: [
                  { id: "src:1", label: "Anthropic revenue, valuation & funding | Sacra", href: "https://sacra.com/c/anthropic/", type: "web", status: "cited" },
                  { id: "src:2", label: "OpenAI revenue, valuation & funding | Sacra", href: "https://sacra.com/c/openai/", type: "web", status: "cited" },
                ],
                answerBlocks: [
                  {
                    id: "answer:block:summary",
                    title: "Bottom line",
                    text: "Across Anthropic, OpenAI, and Google, the underwriting read turns on enterprise revenue quality, distribution leverage, and whether OpenAI's margin profile can hold as inference costs rise.",
                    sourceRefIds: ["src:1", "src:2"],
                    claimIds: [],
                    status: "cited",
                  },
                ],
                claimRefs: [],
                explorationMemory: { exploredSourceCount: 4, citedSourceCount: 4, discardedSourceCount: 0, entityCount: 1, claimCount: 2, contradictionCount: 1 },
                graphSummary: { nodeCount: 6, edgeCount: 5, clusterCount: 1, primaryPath: ["query", "source", "claim", "artifact"] },
                proofStatus: "verified",
                uncertaintyBoundary: "Directional until refreshed.",
                recommendedNextAction: "Build a side-by-side diligence matrix for Anthropic, OpenAI, and Google.",
                graphNodes: [],
                graphEdges: [],
                strategicAngles: [],
                progressionProfile: null,
                progressionTiers: [],
                diligencePack: null,
                readinessScore: null,
                unlocks: [],
                materialsChecklist: [],
                scorecards: [],
                shareableArtifacts: [],
                visibility: "workspace",
                benchmarkEvidence: [],
                workflowComparison: null,
                operatingModel: { packetRouter: { companyMode: "external_company" } },
                distributionSurfaceStatus: [],
                companyReadinessPacket: null,
                companyNamingPack: null,
                interventions: [],
                rawPacket: null,
              },
            },
          })}\n\n`),
        ];
        let chunkIndex = 0;
        return {
          ok: true,
          body: {
            getReader() {
              return {
                async read() {
                  if (chunkIndex >= chunks.length) {
                    return { value: undefined, done: true };
                  }
                  const value = chunks[chunkIndex];
                  chunkIndex += 1;
                  return { value, done: false };
                },
              };
            },
          },
          headers: { get: (name: string) => name.toLowerCase() === "content-type" ? "text/event-stream" : null },
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByTestId("landing-lens-banker"));
    fireEvent.change(screen.getByLabelText(/search nodebench/i), {
      target: { value: "Prepare a banker memo on Anthropic vs OpenAI vs Google" },
    });
    fireEvent.click(screen.getByTestId("landing-search-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("landing-result-workspace")).toBeInTheDocument();
      expect(
        screen.getAllByText(/the underwriting read turns on enterprise revenue quality, distribution leverage/i).length,
      ).toBeGreaterThan(0);
      expect(screen.getByText(/^OpenAI$/)).toBeInTheDocument();
      expect(screen.getByText(/^Google$/)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Weak legacy summary without banker-grade detail\./i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Generic peer$/)).not.toBeInTheDocument();
  });

  it("ignores stale search responses when a newer query starts", async () => {
    const pendingSearches: Array<(response: Response) => void> = [];
    const buildSearchResponse = (entityName: string, answer: string) =>
      ({
        ok: true,
        json: async () => ({
          success: true,
          classification: "competitor",
          latencyMs: 900,
          trace: [
            { step: "classify_query", tool: "classify_query", startMs: 1, endMs: 2, durationMs: 1, status: "ok", detail: "competitor" },
          ],
          resultPacket: {
            query: `Analyze ${entityName}`,
            entityName,
            answer,
            confidence: 86,
            sourceCount: 2,
            variables: [{ rank: 1, name: "Enterprise traction", direction: "up", impact: "high" }],
            keyMetrics: [{ label: "Confidence", value: "86%" }],
            changes: [{ description: `${entityName} expanded enterprise deployments.` }],
            risks: [{ title: "Pricing pressure", description: "Larger platforms can compress pricing." }],
            comparables: [{ name: "Anthropic", relevance: "high", note: "Direct enterprise overlap." }],
            whyThisTeam: null,
            nextActions: [{ action: `Benchmark ${entityName} against Anthropic on enterprise retention.`, impact: "high" }],
            nextQuestions: [`What would change the thesis on ${entityName}?`],
            sourceRefs: [{ id: `src:${entityName}`, label: `${entityName} update`, href: `https://example.com/${entityName.toLowerCase()}`, type: "web", status: "cited" }],
            answerBlocks: [{ id: `answer:${entityName}`, title: "Bottom line", text: answer, sourceRefIds: [`src:${entityName}`], claimIds: [], status: "cited" }],
            claimRefs: [],
            explorationMemory: { exploredSourceCount: 2, citedSourceCount: 2, discardedSourceCount: 0, entityCount: 1, claimCount: 1, contradictionCount: 1 },
            graphSummary: { nodeCount: 4, edgeCount: 3, clusterCount: 1, primaryPath: ["query", "source", "claim", "artifact"] },
            proofStatus: "verified",
            uncertaintyBoundary: "Directional until refreshed.",
            recommendedNextAction: `Benchmark ${entityName} against Anthropic on enterprise retention.`,
            graphNodes: [],
            graphEdges: [],
            strategicAngles: [],
            progressionProfile: null,
            progressionTiers: [],
            diligencePack: null,
            readinessScore: null,
            unlocks: [],
            materialsChecklist: [],
            scorecards: [],
            shareableArtifacts: [],
            visibility: "workspace",
            benchmarkEvidence: [],
            workflowComparison: null,
            operatingModel: { packetRouter: { companyMode: "external_company" } },
            distributionSurfaceStatus: [],
            companyReadinessPacket: null,
            companyNamingPack: null,
            interventions: [],
            rawPacket: null,
          },
        }),
        headers: { get: () => "application/json" },
      } as Response);

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/shared-context/episodes?")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, episodes: [] }),
          headers: { get: () => "application/json" },
        } as Response);
      }
      if (url.endsWith("/api/shared-context/episodes/start")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, episode: { status: "active", spans: [], toolsInvoked: [], artifactsProduced: [] } }),
          headers: { get: () => "application/json" },
        } as Response);
      }
      if (url.includes("/api/shared-context/episodes/") && url.endsWith("/finalize")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, episode: { status: "completed", spans: [], toolsInvoked: [], artifactsProduced: [] } }),
          headers: { get: () => "application/json" },
        } as Response);
      }
      if (url.includes("/search?stream=true")) {
        return new Promise<Response>((resolve) => {
          pendingSearches.push(resolve);
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/search nodebench/i), {
      target: { value: "Analyze Oldco competitive position" },
    });
    fireEvent.click(screen.getByTestId("landing-search-submit"));

    await waitFor(() => {
      expect(pendingSearches).toHaveLength(1);
    });

    fireEvent.change(screen.getByLabelText(/search nodebench/i), {
      target: { value: "Analyze Newco competitive position" },
    });
    fireEvent.click(screen.getByTestId("landing-search-submit"));

    await waitFor(() => {
      expect(pendingSearches).toHaveLength(2);
    });

    pendingSearches[0](buildSearchResponse("Oldco", "Oldco memo that should never be rendered."));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText(/Oldco memo that should never be rendered\./i)).not.toBeInTheDocument();

    pendingSearches[1](buildSearchResponse("Newco", "Newco has the stronger enterprise distribution readout."));

    await waitFor(() => {
      expect(screen.getAllByText(/Newco has the stronger enterprise distribution readout\./i).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Oldco memo that should never be rendered\./i)).not.toBeInTheDocument();
  });
});
