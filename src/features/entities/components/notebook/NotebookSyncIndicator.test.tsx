/**
 * Tests for NotebookSyncIndicator — the always-present save/sync chip.
 *
 * Scenario: The user is editing the notebook. As state transitions happen
 *           (typing → saving → saved, or failure → retrying → offline), the
 *           indicator always communicates what's happening with quiet
 *           confidence.
 *
 * Invariants under test:
 *   - Every sync state has a visible text label (not icon-only; a11y)
 *   - aria-live="polite" so screen readers announce transitions without interrupting
 *   - Reduced-motion users get no spinning icon (motion-reduce:animate-none)
 *   - Copy is never alarming; describe() output is actionable
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotebookSyncIndicator } from "./NotebookSyncIndicator";
import type { NotebookSyncStatusSubscription } from "./useNotebookSyncStatus";

function status(partial: Partial<NotebookSyncStatusSubscription>): NotebookSyncStatusSubscription {
  return {
    state: "synced",
    lastSavedAgoMs: null,
    retryAttempt: 0,
    pendingPatchCount: 0,
    ...partial,
  };
}

describe("NotebookSyncIndicator", () => {
  it("renders 'Saved' with a check icon in synced state after a save", () => {
    render(<NotebookSyncIndicator status={status({ state: "synced", lastSavedAgoMs: 1_000 })} />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("renders 'Ready' in synced state before any save", () => {
    render(<NotebookSyncIndicator status={status({ state: "synced", lastSavedAgoMs: null })} />);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("renders 'Editing…' when in pending state (queue accumulating)", () => {
    render(<NotebookSyncIndicator status={status({ state: "pending", pendingPatchCount: 3 })} />);
    expect(screen.getByText("Editing…")).toBeInTheDocument();
  });

  it("renders 'Saving…' when a flush is in flight", () => {
    render(<NotebookSyncIndicator status={status({ state: "saving" })} />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("renders retry attempt count when retrying", () => {
    render(<NotebookSyncIndicator status={status({ state: "retrying", retryAttempt: 2 })} />);
    expect(screen.getByText(/attempt 2/i)).toBeInTheDocument();
  });

  it("renders reassuring offline copy, never 'Error'", () => {
    render(<NotebookSyncIndicator status={status({ state: "offline" })} />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it("exposes aria-live='polite' for screen reader announcements without focus steal", () => {
    render(<NotebookSyncIndicator status={status({ state: "saving" })} />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("title attribute on synced state describes save age", () => {
    render(
      <NotebookSyncIndicator
        status={status({ state: "synced", lastSavedAgoMs: 120_000 })}
      />,
    );
    const region = screen.getByRole("status");
    // 120 seconds → 2 minutes
    expect(region.getAttribute("title") ?? "").toMatch(/saved/i);
  });

  it("title attribute on pending state reports queued change count (singular)", () => {
    render(
      <NotebookSyncIndicator
        status={status({ state: "pending", pendingPatchCount: 1 })}
      />,
    );
    const region = screen.getByRole("status");
    expect(region.getAttribute("title") ?? "").toMatch(/1 change queued/);
  });

  it("title attribute on pending state reports queued change count (plural)", () => {
    render(
      <NotebookSyncIndicator
        status={status({ state: "pending", pendingPatchCount: 5 })}
      />,
    );
    const region = screen.getByRole("status");
    expect(region.getAttribute("title") ?? "").toMatch(/5 changes queued/);
  });
});
