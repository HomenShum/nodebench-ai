/* @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { AgentTimeline } from "../AgentTimeline";

vi.mock("convex/react", async () => {
  const now = Date.now();
  return {
    useQuery: (fn: any, args: any) => ({
      baseStartMs: now,
      tasks: [
        { _id: "o1", name: "Orchestrator", agentType: "orchestrator", startOffsetMs: 0, durationMs: 60000, status: "running" },
      ],
      links: [],
    }),
    useMutation: () => (async () => null),
    useAction: () => (async () => null),
  } as any;
});

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("AgentTimeline scrub-to-preview", () => {
  it("shows a scrub tooltip when moving mouse over the header", () => {
    const { container } = render(<AgentTimeline timelineId={"tl1" as any} />);
    const header = container.querySelector('.timeline-header') as HTMLElement;
    expect(header).toBeTruthy();

    // Mock size to make math deterministic
    (header as any).getBoundingClientRect = () => ({ left: 0, top: 0, right: 1000, bottom: 20, width: 1000, height: 20, x: 0, y: 0, toJSON: () => ({}) });

    fireEvent.mouseMove(header, { clientX: 500, clientY: 10 } as any);

    const tooltip = screen.getByLabelText('scrub-tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toMatch(/^\d+:\d{2}$/);
  });
});

