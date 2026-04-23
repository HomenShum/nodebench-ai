import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ThreadActionsSheet } from "./ThreadActionsSheet";

describe("ThreadActionsSheet", () => {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    onFavorite: vi.fn(),
    onRename: vi.fn(),
    onViewFiles: vi.fn(),
    onRunDetails: vi.fn(),
    onDelete: vi.fn(),
    isFavorite: false,
    hasActiveSession: true,
  };

  it("renders as a dialog-backed bottom sheet with the expected Manus-like actions", () => {
    render(<ThreadActionsSheet {...baseProps} />);

    expect(screen.getByRole("dialog", { name: "Thread actions" })).toBeInTheDocument();
    expect(screen.getByRole("menu", { name: "Thread actions" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /favorite/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /rename/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /view all files/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /task details/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /^delete/i })).toBeInTheDocument();
  });

  it("closes when the backdrop is pressed", () => {
    const onClose = vi.fn();
    render(<ThreadActionsSheet {...baseProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close thread actions" }));
    expect(onClose).toHaveBeenCalled();
  });
});
