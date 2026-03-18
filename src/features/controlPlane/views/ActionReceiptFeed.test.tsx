import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionReceiptFeed } from "./ActionReceiptFeed";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

describe("ActionReceiptFeed", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryMock.mockReturnValue(null);
    useMutationMock.mockReturnValue(vi.fn());
  });

  it("supports local demo rollback for reversible receipts", () => {
    render(<ActionReceiptFeed />);

    fireEvent.click(screen.getByRole("button", { name: /created investigation dossier from gathered evidence/i }));
    fireEvent.click(screen.getByRole("button", { name: /undo action/i }));

    expect(screen.getByText(/rolled back in demo mode/i)).toBeInTheDocument();
    expect(screen.getByText(/rollback_ref:/i)).toBeInTheDocument();
    expect(screen.getByText(/^rolled back$/i)).toBeInTheDocument();
  });

  it("surfaces explicit irreversible copy for non-reversible receipts", () => {
    render(<ActionReceiptFeed />);

    fireEvent.click(screen.getByRole("button", { name: /searched sec edgar for ftx bankruptcy filings/i }));

    expect(screen.getByText(/no rollback available\./i)).toBeInTheDocument();
  });
});