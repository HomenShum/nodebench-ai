import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock IntersectionObserver for framer-motion's useInView
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class IntersectionObserver {
    constructor(
      _cb: IntersectionObserverCallback,
      _opts?: IntersectionObserverInit,
    ) {}
    readonly root = null;
    readonly rootMargin = "0px";
    readonly thresholds: readonly number[] = [0];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as unknown as typeof globalThis.IntersectionObserver;
}

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
}));

import { ControlPlaneLanding } from "./ControlPlaneLanding";

describe("ControlPlaneLanding", () => {
  beforeEach(() => {
    localStorage.removeItem("nodebench:control-plane:first-run-checklist");
  });

  it("renders hero copy, CTAs, trust surfaces, and starter prompts", () => {
    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

    // Hero heading + subtitle
    expect(
      screen.getByRole("heading", { name: /nodebench/i }),
    ).toBeInTheDocument();

    // CTA buttons and links
    expect(screen.getByRole("button", { name: /run live demo/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /read api/i })).toHaveAttribute("href", "/v1/specs");
    expect(screen.getByRole("link", { name: /integrate via mcp/i })).toHaveAttribute(
      "href",
      "/api/mcp",
    );

    // Trust surfaces
    expect(screen.getByText("Trust surfaces")).toBeInTheDocument();
    expect(screen.getByText("Agent actions")).toBeInTheDocument();
    expect(screen.getByText("Permissions")).toBeInTheDocument();
    expect(screen.getByText("Investigation")).toBeInTheDocument();
    expect(screen.getByText("Tool activity")).toBeInTheDocument();

    // Starter prompts
    expect(screen.getByText("Show denied actions today")).toBeInTheDocument();
    expect(screen.getByText("Trace the FTX demo")).toBeInTheDocument();
    expect(screen.getByText("Review agent permissions")).toBeInTheDocument();

    // Recent activity section (loading state since useQuery returns undefined)
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
    expect(screen.getByText("Loading activity...")).toBeInTheDocument();
  });

  it("runs the live demo CTA by opening the agent panel with the denied-actions prompt", () => {
    const onNavigate = vi.fn();
    const onOpenFastAgentWithPrompt = vi.fn();
    render(
      <ControlPlaneLanding
        onNavigate={onNavigate}
        onOpenFastAgentWithPrompt={onOpenFastAgentWithPrompt}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /run live demo/i }));

    expect(onOpenFastAgentWithPrompt).toHaveBeenCalledWith(
      "Show me the agent actions that were denied or approval-gated today, and explain why.",
    );
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("opens the agent panel when a starter prompt is clicked", () => {
    const onNavigate = vi.fn();
    const onOpenFastAgentWithPrompt = vi.fn();

    render(
      <ControlPlaneLanding
        onNavigate={onNavigate}
        onOpenFastAgentWithPrompt={onOpenFastAgentWithPrompt}
      />,
    );

    // "Show denied actions today" now opens the agent panel instead of navigating
    fireEvent.click(screen.getByRole("button", { name: /show denied actions today/i }));

    expect(onOpenFastAgentWithPrompt).toHaveBeenCalledWith(
      "Show me the agent actions that were denied or approval-gated today, and explain why.",
    );
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
