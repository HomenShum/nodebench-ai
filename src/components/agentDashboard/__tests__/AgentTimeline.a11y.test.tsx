/* @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AgentTimeline } from "../AgentTimeline";

vi.mock("convex/react", async () => {
  const now = Date.now();
  return {
    useQuery: () => ({ baseStartMs: now, tasks: [], links: [] }),
    useMutation: () => (async () => null),
    useAction: () => (async () => null),
  } as any;
});

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("AgentTimeline accessibility landmarks", () => {
  it("renders landmark roles for hierarchy and timeline", () => {
    render(<AgentTimeline timelineId={"tl1" as any} />);

    const aside = screen.getByRole("complementary", { name: /Agent Hierarchy/i });
    const region = screen.getByRole("region", { name: /Execution Timeline/i });

    expect(aside).toBeTruthy();
    expect(region).toBeTruthy();
  });
});

