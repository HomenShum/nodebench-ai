import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ControlPlaneLanding } from "./ControlPlaneLanding";
import {
  CONTROL_PLANE_PREFERRED_PATH_KEY,
  loadBuyerPreferredPath,
} from "../lib/onboardingState";

describe("ControlPlaneLanding", () => {
  beforeEach(() => {
    localStorage.removeItem(CONTROL_PLANE_PREFERRED_PATH_KEY);
    localStorage.removeItem("nodebench:control-plane:first-run-checklist");
  });

  it("renders report-aligned landing copy, CTAs, and navigation paths", () => {
    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: /the trust layer for agents\./i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/provenance, not proof\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run the live demo/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /read the api/i })).toHaveAttribute("href", "/v1/specs");
    expect(screen.getByRole("link", { name: /integrate via mcp \/ sdk/i })).toHaveAttribute(
      "href",
      "/api/mcp",
    );
    expect(screen.getByText("Choose your path")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /review agent actions/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /review passport & approvals/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /investigate a run/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Debug evals and replay proof")).toBeInTheDocument();
    expect(screen.getAllByText("Inspect tool activity").length).toBeGreaterThan(0);
    expect(screen.queryByText("Read today's brief")).not.toBeInTheDocument();
    expect(screen.getByText("Product Direction")).toBeInTheDocument();
    expect(screen.getByText("Execution Trace")).toBeInTheDocument();
    expect(screen.getByText("Use cases")).toBeInTheDocument();
    expect(screen.getByText("Research agent (FTX demo)")).toBeInTheDocument();
  });

  it("runs the live demo CTA through receipts and stores the preferred path", () => {
    const onNavigate = vi.fn();
    render(<ControlPlaneLanding onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: /run the live demo/i }));

    expect(onNavigate).toHaveBeenCalledWith("receipts", "/receipts");
    expect(loadBuyerPreferredPath()).toBe("receipts");
  });

  it("launches a starter prompt through the fast agent without forcing navigation", () => {
    const onNavigate = vi.fn();
    const onOpenFastAgentWithPrompt = vi.fn();

    render(
      <ControlPlaneLanding
        onNavigate={onNavigate}
        onOpenFastAgentWithPrompt={onOpenFastAgentWithPrompt}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /show denied actions today/i }));

    expect(onOpenFastAgentWithPrompt).toHaveBeenCalledWith(
      "Show me the agent actions that were denied or approval-gated today, and explain why.",
    );
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
