/* @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { AgentTimeline } from "../AgentTimeline";

vi.mock("convex/react", async () => {
  const now = Date.now();
  return {
    useQuery: () => ({
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

describe("AgentTimeline keyboard interactions", () => {
  it("focus + Enter opens the popover dialog", async () => {
    const user = userEvent.setup();
    const { container } = render(<AgentTimeline timelineId={"tl1" as any} />);

    const bar = container.querySelector(".execution-bar") as HTMLElement;
    expect(bar).toBeTruthy();

    bar.focus();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeTruthy();
  });
});

