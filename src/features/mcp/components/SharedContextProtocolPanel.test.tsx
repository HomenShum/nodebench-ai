import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/syncBridgeApi", () => ({
  getSharedContextSnapshotUrl: (options?: any) => {
    const params = new URLSearchParams();
    params.set("limit", String(options?.limit ?? 8));
    if (options?.peerId) params.set("peerId", options.peerId);
    if (options?.workspaceId) params.set("workspaceId", options.workspaceId);
    if (options?.contextType) params.set("contextType", options.contextType);
    if (options?.subjectIncludes) params.set("subjectIncludes", options.subjectIncludes);
    return `/api/shared-context/snapshot?${params.toString()}`;
  },
  getSharedContextEventsUrl: () => "/api/shared-context/events?limit=8",
}));

import { SharedContextProtocolPanel } from "./SharedContextProtocolPanel";

const EMPTY_SNAPSHOT = {
  success: true,
  snapshot: {
    peers: [],
    recentPackets: [],
    recentTasks: [],
    recentMessages: [],
    counts: {
      activePeers: 0,
      activePackets: 0,
      invalidatedPackets: 0,
      openTasks: 0,
      unreadMessages: 0,
    },
  },
};

function mockFetchWith(body: unknown = EMPTY_SNAPSHOT) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("SharedContextProtocolPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem("scp-panel-filters");
    vi.stubGlobal("EventSource", class {
      close() {}
      addEventListener() {}
      onerror: ((event: Event) => void) | null = null;
      constructor(_url: string) {}
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    localStorage.removeItem("scp-panel-filters");
  });

  it("renders the empty state when no peers or packets are registered", async () => {
    mockFetchWith();

    render(<SharedContextProtocolPanel />);

    await waitFor(() =>
      expect(screen.getByText("No peers have registered yet. Once local runtimes or role-specific workers announce themselves, they will show up here.")).toBeInTheDocument(),
    );
    expect(screen.getByText("No shared packets yet. Publish structured packets here instead of passing free-form text between peers.")).toBeInTheDocument();
  });

  it("renders peers, packets, tasks, and messages from the snapshot", async () => {
    mockFetchWith({
      success: true,
      snapshot: {
        peers: [
          {
            peerId: "peer:researcher:1",
            product: "nodebench",
            workspaceId: "workspace_alpha",
            surface: "local_runtime",
            role: "researcher",
            capabilities: ["can-search", "can-publish-packet"],
            contextScopes: ["workspace"],
            status: "active",
            summary: {
              currentTask: "Compile founder packet for Stripe",
            },
            lastHeartbeatAt: "2026-03-27T12:00:00.000Z",
          },
        ],
        recentPackets: [
          {
            contextId: "context:1",
            contextType: "entity_packet",
            producerPeerId: "peer:researcher:1",
            subject: "Stripe entity packet",
            summary: "Canonical packet for Stripe with fresh billing evidence.",
            status: "active",
            confidence: 0.93,
            scope: ["workspace", "entity:stripe"],
            nextActions: [],
          },
        ],
        recentTasks: [
          {
            taskId: "task:1",
            taskType: "judge_packet",
            proposerPeerId: "peer:researcher:1",
            assigneePeerId: "peer:judge:1",
            status: "accepted",
            outputContextId: null,
          },
        ],
        recentMessages: [
          {
            messageId: "message:1",
            fromPeerId: "peer:researcher:1",
            toPeerId: "peer:judge:1",
            messageClass: "context_offer",
            status: "unread",
          },
        ],
        counts: {
          activePeers: 1,
          activePackets: 1,
          invalidatedPackets: 0,
          openTasks: 1,
          unreadMessages: 1,
        },
      },
    });

    render(<SharedContextProtocolPanel />);

    await waitFor(() =>
      expect(screen.getByText("Compile founder packet for Stripe")).toBeInTheDocument(),
    );
    expect(screen.getByText("Stripe entity packet")).toBeInTheDocument();
    expect(screen.getAllByText("judge_packet").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("context_offer")).toBeInTheDocument();
  });

  it("re-queries with the selected workspace and packet filters", async () => {
    const fetchMock = mockFetchWith();

    render(<SharedContextProtocolPanel />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("workspace:nodebench..."), {
      target: { value: "workspace_alpha" },
    });
    fireEvent.change(screen.getByDisplayValue("All packet types"), {
      target: { value: "judge_packet" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("workspaceId=workspace_alpha"),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("contextType=judge_packet"),
      );
    });
  });

  it("passes subjectIncludes to the snapshot URL when the subject search has a value", async () => {
    const fetchMock = mockFetchWith();

    render(<SharedContextProtocolPanel />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("Search by keyword..."), {
      target: { value: "Stripe" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("subjectIncludes=Stripe"),
      );
    });
  });

  it("clears all filters when the Reset filters button is clicked", async () => {
    const fetchMock = mockFetchWith();

    render(<SharedContextProtocolPanel />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // Set some filters first
    fireEvent.change(screen.getByPlaceholderText("workspace:nodebench..."), {
      target: { value: "ws1" },
    });
    fireEvent.change(screen.getByPlaceholderText("peer:web:control_plane"), {
      target: { value: "peer:a" },
    });
    fireEvent.change(screen.getByPlaceholderText("Search by keyword..."), {
      target: { value: "test" },
    });

    // Reset button should now appear
    await waitFor(() => expect(screen.getByText("Reset filters")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Reset filters"));

    // All inputs should be empty
    await waitFor(() => {
      expect((screen.getByPlaceholderText("workspace:nodebench...") as HTMLInputElement).value).toBe("");
      expect((screen.getByPlaceholderText("peer:web:control_plane") as HTMLInputElement).value).toBe("");
      expect((screen.getByPlaceholderText("Search by keyword...") as HTMLInputElement).value).toBe("");
    });
  });

  it("persists filter state to localStorage and restores on remount", async () => {
    const fetchMock = mockFetchWith();

    const { unmount } = render(<SharedContextProtocolPanel />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("workspace:nodebench..."), {
      target: { value: "saved_ws" },
    });

    // Wait for the persistence effect to run
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("scp-panel-filters") ?? "{}");
      expect(stored.workspace).toBe("saved_ws");
    });

    unmount();

    // Remount — filter should be restored from localStorage
    render(<SharedContextProtocolPanel />);

    expect((screen.getByPlaceholderText("workspace:nodebench...") as HTMLInputElement).value).toBe("saved_ws");
  });

  it("does not show Reset filters button when no filters are active", async () => {
    mockFetchWith();

    render(<SharedContextProtocolPanel />);

    await waitFor(() =>
      expect(screen.getByText("No peers have registered yet. Once local runtimes or role-specific workers announce themselves, they will show up here.")).toBeInTheDocument(),
    );

    expect(screen.queryByText("Reset filters")).not.toBeInTheDocument();
  });

  it("ignores stale fetch responses after rapid filter changes (generation guard)", async () => {
    // Scenario: user types "a" then quickly "ab". The first fetch for "a" resolves
    // AFTER the second fetch for "ab". The stale "a" response must be discarded.

    let fetchCallCount = 0;
    const resolvers: Array<(value: Response) => void> = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          fetchCallCount++;
          resolvers.push(resolve);
        }),
    );

    render(<SharedContextProtocolPanel />);

    // Wait for initial fetch
    await waitFor(() => expect(fetchCallCount).toBeGreaterThanOrEqual(1));

    // Resolve initial fetch
    resolvers[0]!(new Response(JSON.stringify(EMPTY_SNAPSHOT), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await waitFor(() => expect(screen.getByText(/No peers have registered/)).toBeInTheDocument());

    const prevCount = fetchCallCount;

    // Type "a" — triggers new effect + fetch
    fireEvent.change(screen.getByPlaceholderText("Search by keyword..."), {
      target: { value: "a" },
    });

    await waitFor(() => expect(fetchCallCount).toBeGreaterThan(prevCount));
    const staleIndex = fetchCallCount - 1;

    // Type "ab" — triggers another new effect + fetch before "a" resolves
    fireEvent.change(screen.getByPlaceholderText("Search by keyword..."), {
      target: { value: "ab" },
    });

    await waitFor(() => expect(fetchCallCount).toBeGreaterThan(staleIndex + 1));
    const currentIndex = fetchCallCount - 1;

    // Resolve the STALE fetch ("a") with a distinctive snapshot
    const staleSnapshot = {
      success: true,
      snapshot: {
        ...EMPTY_SNAPSHOT.snapshot,
        counts: { ...EMPTY_SNAPSHOT.snapshot.counts, activePeers: 999 },
      },
    };
    resolvers[staleIndex]!(new Response(JSON.stringify(staleSnapshot), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    // Resolve the CURRENT fetch ("ab") with correct data
    const currentSnapshot = {
      success: true,
      snapshot: {
        ...EMPTY_SNAPSHOT.snapshot,
        counts: { ...EMPTY_SNAPSHOT.snapshot.counts, activePeers: 42 },
      },
    };
    resolvers[currentIndex]!(new Response(JSON.stringify(currentSnapshot), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    // The displayed count should be 42 (current), not 999 (stale)
    await waitFor(() => expect(screen.getByText("42")).toBeInTheDocument());
    expect(screen.queryByText("999")).not.toBeInTheDocument();
  });
});
