/* @vitest-environment jsdom */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AgentTasks } from "../AgentTasks";

vi.mock("convex/react", async () => {
  const tasks = [
    { _id: "o1", name: "Orchestrator", agentType: "orchestrator", startOffsetMs: 0, durationMs: 60000, status: "running" },
  ];
  return {
    useQuery: () => ({ baseStartMs: Date.now() - 5000, tasks, links: [] }),
    useMutation: () => (async () => null),
    useAction: () => (async () => null),
  } as any;
});

beforeEach(() => {
  localStorage.removeItem("agents.tasksLayout");
  document.body.innerHTML = "";
});

describe("AgentTasks default layout", () => {
  it("defaults to Table view when no preference is set", () => {
    render(<AgentTasks timelineId={"tl1" as any} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("table");
  });
});

