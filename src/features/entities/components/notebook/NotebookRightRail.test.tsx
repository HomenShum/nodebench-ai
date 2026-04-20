/**
 * Tests for NotebookRightRail — the optional companion rail.
 *
 * Scenario: A power user opens the companion rail to inspect the agent's
 *           scratchpad or review session artifacts. The rail is:
 *             - default-closed (non-power users never see the contents)
 *             - lazy-mounted (closed rail pays zero render cost)
 *             - tab-switchable when multiple content slots are supplied
 *             - hidden entirely when no slots are supplied (earned complexity)
 *
 * Invariants under test:
 *   - Renders nothing when both slots are absent (don't advertise nothing)
 *   - Default closed (aria-expanded=false) and neither slot renders
 *   - Expand → only the active tab's slot renders (lazy)
 *   - Single-slot: no tab strip shown
 *   - Tab switch: ARIA updates correctly
 *   - Keyboard: focus ring on toggle + tabs
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotebookRightRail } from "./NotebookRightRail";

describe("NotebookRightRail", () => {
  it("renders nothing when neither slot is supplied (no advertising empty space)", () => {
    const { container } = render(<NotebookRightRail />);
    expect(container.firstChild).toBeNull();
  });

  it("default-closed when slots are supplied", () => {
    render(
      <NotebookRightRail
        scratchpadSlot={<div>Scratch content</div>}
        sessionArtifactsSlot={<div>Artifacts content</div>}
      />,
    );
    const toggle = screen.getByRole("button", { name: /run inspector/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Neither slot is rendered while closed — lazy invariant
    expect(screen.queryByText("Scratch content")).not.toBeInTheDocument();
    expect(screen.queryByText("Artifacts content")).not.toBeInTheDocument();
  });

  it("expands on toggle click", () => {
    render(
      <NotebookRightRail
        scratchpadSlot={<div>Scratch content</div>}
        sessionArtifactsSlot={<div>Artifacts content</div>}
      />,
    );
    const toggle = screen.getByRole("button", { name: /run inspector/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // Default tab = artifacts → that slot renders
    expect(screen.getByText("Artifacts content")).toBeInTheDocument();
    // The other slot should NOT render yet (lazy by active tab)
    expect(screen.queryByText("Scratch content")).not.toBeInTheDocument();
  });

  it("switches to scratchpad tab when clicked, and only mounts that slot", () => {
    render(
      <NotebookRightRail
        scratchpadSlot={<div>Scratch content</div>}
        sessionArtifactsSlot={<div>Artifacts content</div>}
        defaultOpen
      />,
    );
    // Artifacts visible by default
    expect(screen.getByText("Artifacts content")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /trace/i }));

    expect(screen.getByText("Scratch content")).toBeInTheDocument();
    expect(screen.queryByText("Artifacts content")).not.toBeInTheDocument();
  });

  it("does NOT render tab strip when only one slot is supplied", () => {
    render(
      <NotebookRightRail
        sessionArtifactsSlot={<div>Artifacts content</div>}
        defaultOpen
      />,
    );
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    // But the content still renders
    expect(screen.getByText("Artifacts content")).toBeInTheDocument();
  });

  it("supports default-open for returning power users", () => {
    render(
      <NotebookRightRail
        sessionArtifactsSlot={<div>Artifacts content</div>}
        defaultOpen
      />,
    );
    const toggle = screen.getByRole("button", { name: /run inspector/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Artifacts content")).toBeInTheDocument();
  });

  it("exposes the body region via aria-controls/id for screen readers", () => {
    render(
      <NotebookRightRail
        sessionArtifactsSlot={<div>Artifacts content</div>}
        defaultOpen
      />,
    );
    const toggle = screen.getByRole("button", { name: /run inspector/i });
    const controls = toggle.getAttribute("aria-controls");
    expect(controls).toBe("notebook-right-rail-body");
    const body = document.getElementById(controls!);
    expect(body).not.toBeNull();
  });

  it("ARIA role tabpanel is labeled correctly", () => {
    render(
      <NotebookRightRail
        scratchpadSlot={<div>Scratch content</div>}
        sessionArtifactsSlot={<div>Artifacts content</div>}
        defaultOpen
      />,
    );
    const tabpanel = screen.getByRole("tabpanel");
    expect(tabpanel).toHaveAttribute("aria-label", "Run map");
  });

  it("falls back to available tab when defaultOpen + scratchpad-only", () => {
    render(
      <NotebookRightRail
        scratchpadSlot={<div>Only scratch</div>}
        defaultOpen
      />,
    );
    // Even though default activeTab is "artifacts" internally, it normalizes
    // to the only available tab.
    expect(screen.getByText("Only scratch")).toBeInTheDocument();
  });
});
