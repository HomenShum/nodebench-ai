/* @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AgentTimeline } from "../AgentTimeline";

// Mock convex/react to provide a minimal live dataset
vi.mock("convex/react", async () => {
  const now = Date.now();
  return {
    useQuery: (fn: any, args: any) => ({
      baseStartMs: now,
      tasks: [
        {
          _id: "m1",
          name: "Main A",
          agentType: "main",
          startOffsetMs: 0,
          durationMs: 60000,
          status: "running",
          phaseBoundariesMs: [20000, 40000],
          retryOffsetsMs: [30000],
          failureOffsetMs: 45000,
        },
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

describe("AgentTimeline markers rendering", () => {
  it("renders phase separators and retry/error markers from backend fields", async () => {
    const { container } = render(<AgentTimeline timelineId={"tl1" as any} />);

    // Wait for timeline to render
    const bar = await screen.findByTitle(/ETA/i);
    expect(bar).toBeTruthy();

    // Phase separators
    const ph20 = container.querySelector('[aria-label="phase-sep-20000ms"]');
    const ph40 = container.querySelector('[aria-label="phase-sep-40000ms"]');
    expect(ph20).toBeTruthy();
    expect(ph40).toBeTruthy();

    // Retry and error markers
    const retry = container.querySelector('[aria-label="retry-marker-30000ms"]');
    const err = container.querySelector('[aria-label="error-marker-45000ms"]');
    expect(retry).toBeTruthy();
    expect(err).toBeTruthy();
  });
});

