import { memo, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { DEMO_RECEIPTS } from "../data/receiptFixtures";
import { formatApprovalQueueTime, toActionReceipt } from "../lib/receiptPresentation";

interface ReceiptApprovalQueueProps {
  className?: string;
  compact?: boolean;
  maxItems?: number;
}

export const ReceiptApprovalQueue = memo(function ReceiptApprovalQueue({
  className,
  compact = false,
  maxItems = 5,
}: ReceiptApprovalQueueProps) {
  const pending = useQuery(api.domains.agents.receipts.actionReceipts.listPendingApprovals, {
    limit: maxItems,
  });
  const resolveApproval = useMutation(api.domains.agents.receipts.actionReceipts.resolveApproval);
  const [processingReceiptId, setProcessingReceiptId] = useState<string | null>(null);

  const liveRows = useMemo(
    () => (pending && pending.length > 0 ? pending.map((row) => toActionReceipt(row as Record<string, unknown>)) : null),
    [pending],
  );
  const receipts =
    liveRows ??
    DEMO_RECEIPTS.filter((receipt) => receipt.approval?.state === "pending").slice(0, maxItems);
  const isDemo = !liveRows;

  const handleDecision = async (receiptId: string, decision: "approved" | "denied") => {
    setProcessingReceiptId(receiptId);
    try {
      await resolveApproval({
        receiptId,
        decision,
        reviewedBy: "control-plane-operator",
        reviewNotes:
          decision === "approved"
            ? "Approved from the receipts queue."
            : "Denied from the receipts queue.",
      });
    } catch (error) {
      console.error("Failed to resolve receipt approval", error);
    } finally {
      setProcessingReceiptId(null);
    }
  };

  if (!receipts.length) {
    return (
      <div className={cn("rounded-xl border border-edge bg-surface-secondary/40 p-5 text-center", className)}>
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-content">Approval queue is clear</p>
        <p className="mt-1 text-xs text-content-muted">No OpenClaw receipts are waiting for review.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {!compact && (
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-content">OpenClaw approvals</h3>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            {receipts.length} pending
          </span>
        </div>
      )}

      {receipts.map((receipt) => {
        const busy = processingReceiptId === receipt.receiptId;
        return (
          <div key={receipt.receiptId} className="rounded-xl border border-edge bg-surface-secondary/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                    Pending
                  </span>
                  {receipt.channelId && (
                    <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-indigo-300">
                      {receipt.channelId}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-content">{receipt.action.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-content-muted">
                  <span>{receipt.agentId}</span>
                  {receipt.sessionKey && <code className="font-mono text-[11px]">{receipt.sessionKey}</code>}
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {formatApprovalQueueTime(receipt.approval?.requestedAt ?? receipt.timestamp)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-content-muted">{receipt.result.summary}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={busy || isDemo}
                  onClick={() => handleDecision(receipt.receiptId, "approved")}
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy || isDemo}
                  onClick={() => handleDecision(receipt.receiptId, "denied")}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Deny
                </button>
              </div>
            </div>

            {isDemo && (
              <p className="mt-3 text-[11px] text-content-muted">
                Demo mode. Connect a live OpenClaw session to approve or deny from the queue.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default ReceiptApprovalQueue;
