import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExecutionTraceView } from "./ExecutionTraceView";

const useConvexAuthMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useConvexAuth: () => useConvexAuthMock(),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

describe("ExecutionTraceView", () => {
  beforeEach(() => {
    useConvexAuthMock.mockReset();
    useQueryMock.mockReset();
  });

  it("falls back to the seeded example when no live runs are available", () => {
    useConvexAuthMock.mockReturnValue({ isAuthenticated: false });
    useQueryMock.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (typeof args === "object" && args !== null && "limit" in args) {
        return { sessions: [] };
      }
      if (args === "skip") return undefined;
      return null;
    });

    render(<ExecutionTraceView />);

    expect(screen.getByText(/Spreadsheet workflow: inspect, research, edit, verify, export/i)).toBeInTheDocument();
    expect(screen.getByText(/Seeded example/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Outcome/i })).toBeInTheDocument();
    expect(screen.getByText(/Primary result/i)).toBeInTheDocument();
    expect(screen.getByText(/Trust Boundary/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Full Trace/i }));
    fireEvent.click(screen.getByRole("tab", { name: /json contract/i }));

    expect(screen.getByText(/Typed Output/i)).toBeInTheDocument();
    expect(screen.getByText(/Schema Contract/i)).toBeInTheDocument();
  });

  it("prefers a live saved run when task-session data exists", async () => {
    useConvexAuthMock.mockReturnValue({ isAuthenticated: false });
    useQueryMock.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return undefined;
      if (typeof args === "object" && args !== null && "limit" in args) {
        return {
          sessions: [
            {
              _id: "session_live_1",
              title: "Live execution session",
              description: "A saved run captured from the task substrate.",
              type: "agent",
              status: "completed",
              startedAt: Date.parse("2026-03-11T18:00:00.000Z"),
            },
          ],
        };
      }
      if (typeof args === "object" && args !== null && "sessionId" in args) {
        return {
          session: {
            _id: "session_live_1",
            title: "Live execution session",
            description: "A saved run captured from the task substrate.",
            type: "agent",
            visibility: "public",
            status: "completed",
            startedAt: Date.parse("2026-03-11T18:00:00.000Z"),
            completedAt: Date.parse("2026-03-11T18:05:00.000Z"),
            successCriteria: ["Keep the run auditable."],
            metadata: {
              uploadedFiles: ["/mnt/data/live.xlsx"],
            },
          },
          traces: [
            {
              _id: "trace_live_1",
              traceId: "trace-live-1",
              workflowName: "Research live sources",
              status: "completed",
              startedAt: Date.parse("2026-03-11T18:01:00.000Z"),
              totalDurationMs: 30000,
              metadata: {
                summary: "Gathered evidence for the saved run.",
              },
            },
          ],
          traceCount: 1,
        };
      }
      if (typeof args === "object" && args !== null && "traceId" in args) {
        return {
          spans: [],
          rootSpans: [],
          childrenByParent: {},
          spanCount: 0,
        };
      }
      return undefined;
    });

    render(<ExecutionTraceView />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Live execution session" })).toBeInTheDocument();
    });

    expect(screen.getByText(/Live saved run/i)).toBeInTheDocument();
    expect(screen.getByText(/1 trace reconstructed from saved runs/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Why/i }));
    expect(screen.getByText(/Why this outcome/i)).toBeInTheDocument();
    expect(screen.getByText(/Evidence boundary/i)).toBeInTheDocument();
  });
});
