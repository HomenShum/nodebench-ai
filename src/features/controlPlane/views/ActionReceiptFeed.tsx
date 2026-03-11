/**
 * ActionReceiptFeed - chronological feed of agent actions with policy references,
 * evidence links, warning flags, and undo controls.
 */

import { memo, useMemo, useState } from "react";
import { Filter, Shield, ShieldAlert } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { DEMO_RECEIPTS } from "../data/receiptFixtures";
import { ReceiptApprovalQueue } from "../components/ReceiptApprovalQueue";
import { ReceiptCard } from "../components/ReceiptCard";
import { toActionReceipt } from "../lib/receiptPresentation";

type FilterMode = "all" | "allowed" | "escalated" | "denied";

export const ActionReceiptFeed = memo(function ActionReceiptFeed() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterMode>("all");

  const convexReceipts = useQuery(api.domains.agents.receipts.actionReceipts.list, { limit: 100 });
  const liveReceipts = useMemo(
    () => (convexReceipts && convexReceipts.length > 0 ? convexReceipts.map((row) => toActionReceipt(row as Record<string, unknown>)) : null),
    [convexReceipts],
  );
  const receipts = liveReceipts ?? DEMO_RECEIPTS;
  const isDemo = !liveReceipts;

  const filteredReceipts = useMemo(() => {
    if (filter === "all") return receipts;
    return receipts.filter((receipt) => receipt.policyRef.action === filter);
  }, [filter, receipts]);

  const stats = useMemo(() => {
    const allowed = receipts.filter((receipt) => receipt.policyRef.action === "allowed").length;
    const escalated = receipts.filter((receipt) => receipt.policyRef.action === "escalated").length;
    const denied = receipts.filter((receipt) => receipt.policyRef.action === "denied").length;
    const pending = receipts.filter((receipt) => receipt.approval?.state === "pending").length;
    const violations = receipts.reduce((acc, receipt) => acc + receipt.violations.length, 0);
    return { allowed, escalated, denied, pending, total: receipts.length, violations };
  }, [receipts]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filterButtons: { mode: FilterMode; label: string; count: number }[] = [
    { mode: "all", label: "All", count: stats.total },
    { mode: "allowed", label: "Allowed", count: stats.allowed },
    { mode: "escalated", label: "Escalated", count: stats.escalated },
    { mode: "denied", label: "Denied", count: stats.denied },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          <h1 className="text-xl font-semibold tracking-tight text-content">Receipts</h1>
        </div>
        <p className="text-sm text-content-muted">
          Tamper-evident records of what agents saw, did, and were allowed to do. Every receipt is content-addressed.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total", value: stats.total, color: "text-content" },
          { label: "Allowed", value: stats.allowed, color: "text-emerald-400" },
          { label: "Escalated", value: stats.escalated, color: "text-amber-400" },
          { label: "Pending", value: stats.pending, color: "text-indigo-300" },
          { label: "Denied", value: stats.denied, color: "text-red-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-edge bg-surface-secondary/50 px-3 py-2 text-center">
            <div className={cn("text-lg font-semibold", stat.color)}>{stat.value}</div>
            <div className="text-[11px] font-medium text-content-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2" role="group" aria-label="Filter receipts by policy action">
        <Filter className="h-3.5 w-3.5 text-content-muted" aria-hidden="true" />
        <div className="flex gap-1">
          {filterButtons.map((button) => (
            <button
              key={button.mode}
              type="button"
              onClick={() => setFilter(button.mode)}
              aria-pressed={filter === button.mode}
              aria-label={`${button.label}: ${button.count} receipts`}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === button.mode
                  ? "border border-primary/20 bg-primary/10 text-primary"
                  : "text-content-muted hover:bg-surface-hover hover:text-content-secondary",
              )}
            >
              {button.label} ({button.count})
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-3" aria-labelledby="receipt-approvals-heading">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <h2 id="receipt-approvals-heading" className="text-sm font-medium text-content-secondary">
            Approval queue
          </h2>
        </div>
        <p className="text-xs text-content-muted">
          Outbound OpenClaw actions pause here before execution. Approvals update the receipt itself rather than a shadow log.
        </p>
        <ReceiptApprovalQueue compact />
      </section>

      <div className="space-y-2">
        {filteredReceipts.map((receipt) => (
          <ReceiptCard
            key={receipt.receiptId}
            receipt={receipt}
            isExpanded={expandedIds.has(receipt.receiptId)}
            onToggle={() => toggleExpand(receipt.receiptId)}
          />
        ))}
        {filteredReceipts.length === 0 && (
          <div className="py-12 text-center text-sm text-content-muted">No receipts match the current filter.</div>
        )}
      </div>

      <div className="border-t border-edge/30 pt-4 text-center text-[11px] text-content-muted">
        {isDemo
          ? "Demo mode. Showing golden dataset receipts until live runtime data is available."
          : `Live. Showing ${receipts.length} receipts from Convex.`}
      </div>
    </div>
  );
});

export default ActionReceiptFeed;
