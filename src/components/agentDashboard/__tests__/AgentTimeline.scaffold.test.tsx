/* @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { AgentTimeline } from "../AgentTimeline";

// Force fallback by mocking convex/react useQuery to return undefined
vi.mock("convex/react", async () => {
  return {
    useQuery: () => undefined,
    useMutation: () => (async () => null),
    useAction: () => (async () => null),
  } as any;
});

// Silence portal warnings in JSDOM
beforeEach(() => {
  // ensure document body exists
  document.body.innerHTML = "";
});

describe("AgentTimeline scaffold fallback", () => {
  it("renders orchestrator, main agents, and some sub-agents from scaffold", () => {
    render(<AgentTimeline timelineId={"fake-tl" as any} />);

    // Left hierarchy header
    expect(screen.getByText(/Agent Scaffold/i)).toBeDefined();

    // Orchestrator and key main agents
    expect(screen.getByText("Research Orchestrator")).toBeDefined();
    expect(screen.getByText("Person Research Agent")).toBeDefined();
    expect(screen.getByText("Company Research Agent")).toBeDefined();
    expect(screen.getByText("Fundraising Analysis Agent")).toBeDefined();
    expect(screen.getByText("Report Synthesis Agent")).toBeDefined();

    // One representative sub-agent
    expect(screen.getByText("LinkedIn Profile Scraper")).toBeDefined();

    // Timeline header
    expect(
      screen.getByText(/Execution Timeline \(Minutes : Seconds\)/i)
    ).toBeDefined();

    // At least one execution bar exists
    const bars = document.querySelectorAll(".execution-bar");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("shows popover on hover with agent name and type badge", async () => {
    const user = userEvent.setup();
    const { container } = render(<AgentTimeline timelineId={"fake-tl" as any} />);

    const bar = container.querySelector(".execution-bar");
    expect(bar).toBeTruthy();

    await user.hover(bar as Element);

    // Popover portal renders a dialog with agent type badge and name
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeDefined();

    // Badge content should be ORCHESTRATOR/MAIN/LEAF and title present
    const badge = within(dialog).getByText(/ORCHESTRATOR|MAIN|LEAF/);
    expect(badge).toBeDefined();
  });
});

