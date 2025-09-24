/* @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { AgentTasks } from "../AgentTasks";

// Mock convex/react to return a minimal timeline dataset
vi.mock("convex/react", async () => {
  const tasks = [
    { _id: "o1", name: "Orchestrator", agentType: "orchestrator", startOffsetMs: 0, durationMs: 60000, status: "running" },
    { _id: "m1", name: "Main A", agentType: "main", startOffsetMs: 10000, durationMs: 30000, status: "pending" },
    { _id: "s1", name: "Leaf A1", agentType: "leaf", startOffsetMs: 12000, durationMs: 15000, status: "pending" },
  ];
  return {
    useQuery: (fn: any, args: any) => ({ baseStartMs: Date.now() - 5000, tasks, links: [{ sourceTaskId: "o1", targetTaskId: "m1" }, { sourceTaskId: "m1", targetTaskId: "s1" }] }),
    useMutation: () => (async () => null),
    useAction: () => (async () => null),
  } as any;
});

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("AgentTasks interactions", () => {
  it("renders mini timeline with ticks and now-line", () => {
    render(<AgentTasks timelineId={"tl1" as any} />);
    const mini = document.querySelector(".mini-timeline");
    expect(mini).toBeTruthy();
    const ticks = mini?.querySelectorAll(".tick") || [];
    expect(ticks.length).toBeGreaterThan(0);
    const nowLine = mini?.querySelector(".now-line");
    expect(nowLine).toBeTruthy();
  });

  it("switches to Table layout and shows rows", async () => {
    const user = userEvent.setup();
    render(<AgentTasks timelineId={"tl1" as any} />);
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "table");
    // expect a table row with Agent column
    const table = document.querySelector("table");
    expect(table).toBeTruthy();
    const headers = table!.querySelectorAll("th");
    expect(Array.from(headers).map(h => h.textContent)).toContain("Agent");
  });
});

