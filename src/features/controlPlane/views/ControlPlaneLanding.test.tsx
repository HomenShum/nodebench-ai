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

  it("renders buyer, developer, and agent operator paths", () => {
    render(<ControlPlaneLanding onNavigate={vi.fn()} />);

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
    expect(screen.getAllByText("Read today's brief").length).toBeGreaterThan(0);
    expect(screen.getByText("Debug evals and replay proof")).toBeInTheDocument();
    expect(screen.getByText("Inspect tool activity")).toBeInTheDocument();
    expect(screen.getByText("Product Direction")).toBeInTheDocument();
    expect(screen.getByText("Execution Trace")).toBeInTheDocument();
  });

  it("stores the preferred path when a primary route is chosen", () => {
    const onNavigate = vi.fn();
    render(<ControlPlaneLanding onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: /review agent actions/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /latest qa agent fundraising/i }));

    expect(onOpenFastAgentWithPrompt).toHaveBeenCalledWith(
      "Tell me about the latest startup fundraising in quality assurance AI agents and their backgrounds.",
    );
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
