import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionMemoView } from "@/features/deepSim/views/DecisionMemoView";
import { renderWithRouter } from "./testUtils";

describe("DecisionMemoView", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class IntersectionObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the investor diligence fixture by default", () => {
    renderWithRouter(<DecisionMemoView />, { route: "/deep-sim" });

    expect(screen.getByRole("heading", { name: "Decision Workbench" })).toBeInTheDocument();
    expect(screen.getByText("Acme AI Series A Diligence")).toBeInTheDocument();
    expect(
      screen.getAllByText("Should Acme AI raise a Series A now or wait 6 months?").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Source Packet")).toBeInTheDocument();
    expect(screen.getByText("HCSN")).toBeInTheDocument();
    expect(screen.getByText("Raise Timing Hierarchy")).toBeInTheDocument();
    expect(screen.getByText("Top Variables")).toBeInTheDocument();
    expect(screen.getByText("Ranked Interventions")).toBeInTheDocument();
  });

  it("switches to the founder strategy fixture from the route search param", () => {
    renderWithRouter(<DecisionMemoView />, { route: "/deep-sim?fixture=founder" });

    expect(screen.getByText("NodeBench GTM Strategy")).toBeInTheDocument();
    expect(
      screen.getAllByText("What is NodeBench's best next distribution move to get 10 paying pilots in 90 days?").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Reach out to 5 Claude Code power users for beta feedback"),
    ).toBeInTheDocument();
    expect(screen.getByText("Distribution Wedge Hierarchy")).toBeInTheDocument();
    expect(screen.getAllByText("Ship decision-workbench preset").length).toBeGreaterThan(0);
  });
});
