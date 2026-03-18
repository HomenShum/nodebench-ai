import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TopicCanvasPanel, buildTopicCanvasEntries } from "./TopicCanvasPanel";
import type { TaskSession } from "./TaskManager/types";

const useConvexAuthMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useConvexAuth: () => useConvexAuthMock(),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

describe("buildTopicCanvasEntries", () => {
  it("derives sorted topic cards with memory, resources, and next actions", () => {
    const entries = buildTopicCanvasEntries([
      {
        _id: "session_older" as never,
        title: "Older topic",
        type: "agent",
        visibility: "public",
        status: "running",
        startedAt: Date.parse("2026-03-12T09:00:00.000Z"),
      },
      {
        _id: "session_latest" as never,
        title: "ByteDance strategy topic",
        description: "Compare public market moves with trace-backed evidence.",
        type: "swarm",
        visibility: "public",
        status: "completed",
        startedAt: Date.parse("2026-03-13T09:00:00.000Z"),
        successCriteria: ["Every conclusion is grounded in cited sources."],
        sourceRefs: [{ label: "10-Q filing" }],
        toolsUsed: ["discover_tools", "get_workflow_chain"],
        agentsInvolved: ["research", "judge"],
      },
    ] as TaskSession[]);

    expect(entries[0].title).toBe("ByteDance strategy topic");
    expect(entries[0].memoryLabel).toContain("Every conclusion is grounded");
    expect(entries[0].resourceLabels).toEqual([
      "10-Q filing",
      "discover_tools",
      "get_workflow_chain",
      "2 agents",
    ]);
    expect(entries[0].nextAction).toMatch(/proof pack/i);
    expect(entries[0].traceHref).toContain("session_latest");
  });
});

describe("TopicCanvasPanel", () => {
  beforeEach(() => {
    useConvexAuthMock.mockReset();
    useQueryMock.mockReset();
  });

  it("renders a topic-first canvas from live task sessions", () => {
    useConvexAuthMock.mockReturnValue({ isAuthenticated: false });
    useQueryMock.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return undefined;
      if (typeof args === "object" && args !== null && "limit" in args) {
        return {
          sessions: [
            {
              _id: "session_1",
              title: "AI infrastructure topic",
              description: "Track model, supplier, and investor signals as one durable topic.",
              type: "agent",
              visibility: "public",
              status: "running",
              startedAt: Date.parse("2026-03-13T18:00:00.000Z"),
              sourceRefs: [{ label: "Company blog" }],
              toolsUsed: ["findTools"],
              agentsInvolved: ["research-agent"],
            },
          ],
        };
      }
      return undefined;
    });

    render(<TopicCanvasPanel />);

    expect(screen.getByText("Topic canvas")).toBeInTheDocument();
    expect(screen.getByText(/Topics, not sessions/i)).toBeInTheDocument();
    expect(screen.getByText("AI infrastructure topic")).toBeInTheDocument();
    expect(screen.getByText(/Track model, supplier, and investor signals/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open trace/i })).toHaveAttribute(
      "href",
      "/execution-trace?session=session_1",
    );
  });
});
