import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useRevealOnMount", () => ({
  useRevealOnMount: () => ({
    ref: { current: null },
    isVisible: true,
    instant: true,
  }),
}));

import PricingPage from "./PricingPage";

describe("PricingPage", () => {
  it("renders the founder stage ladder instead of generic SaaS pricing", () => {
    render(<PricingPage />);

    expect(screen.getByRole("heading", { name: "Stage 0" })).toBeInTheDocument();
    expect(screen.getAllByText("Clarity").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Stage 1" })).toBeInTheDocument();
    expect(screen.getAllByText("Foundation").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Stage 2" })).toBeInTheDocument();
    expect(screen.getAllByText("Readiness").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Stage 3+" })).toBeInTheDocument();
    expect(screen.getAllByText("Leverage / Scale").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Start with clarity\. Unlock the next stage only when the founder workflow is ready for it\./i),
    ).toBeInTheDocument();
  });

  it("shows the progression and privacy FAQ content", () => {
    render(<PricingPage />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Why keep founder packets private by default\?/i,
      }),
    );

    expect(
      screen.getByText(/early-stage founders often need to stay relatively stealthy/i),
    ).toBeInTheDocument();
  });
});
