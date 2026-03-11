import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReceiptApprovalQueue } from "./ReceiptApprovalQueue";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

describe("ReceiptApprovalQueue", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
  });

  it("falls back to demo mode when no live approvals are available", () => {
    useQueryMock.mockReturnValue(null);
    useMutationMock.mockReturnValue(vi.fn());

    render(<ReceiptApprovalQueue />);

    expect(screen.getByText(/demo mode/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve/i })).toBeDisabled();
  });

  it("approves a live receipt", async () => {
    const resolveApproval = vi.fn().mockResolvedValue(true);
    useQueryMock.mockReturnValue([
      {
        receiptId: "sha256:test",
        agentId: "openclaw-agent",
        createdAt: Date.now(),
        toolName: "send_message",
        actionSummary: "Drafted external reply",
        policyId: "pol_external_comms",
        policyRuleName: "Escalate external communications",
        policyAction: "escalated",
        evidenceRefs: [],
        resultSuccess: false,
        resultSummary: "Held for approval",
        canUndo: true,
        approvalState: "pending",
        violations: [],
      },
    ]);
    useMutationMock.mockReturnValue(resolveApproval);

    render(<ReceiptApprovalQueue />);
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(resolveApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          receiptId: "sha256:test",
          decision: "approved",
        }),
      );
    });
  });
});
