/**
 * DelegationShowcase - scoped permissions, approval gates, and trust boundaries.
 */

import { memo, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Database, KeyRound, Lock, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import { ReceiptApprovalQueue } from "../components/ReceiptApprovalQueue";
import { ReceiptCard } from "../components/ReceiptCard";
import { DEMO_PASSPORT, DEMO_RECEIPTS } from "../data/receiptFixtures";
import { toActionReceipt } from "../lib/receiptPresentation";
import type { ActionReceipt } from "../types/actionReceipt";
import type { TrustTier } from "../types/agentPassport";

const TIER_STYLES: Record<TrustTier, { label: string; className: string }> = {
  sandbox: { label: "Sandbox", className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400" },
  supervised: { label: "Supervised", className: "border-amber-500/20 bg-amber-500/10 text-amber-400" },
  autonomous: { label: "Autonomous", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" },
};

export const DelegationShowcase = memo(function DelegationShowcase() {
  const passport = DEMO_PASSPORT;
  const tier = TIER_STYLES[passport.trustTier];
  const liveEscalated = useQuery(api.domains.agents.receipts.actionReceipts.list, {
    policyAction: "escalated",
    limit: 20,
  });

  const escalatedReceipts = useMemo(() => {
    if (!liveEscalated || liveEscalated.length === 0) {
      return DEMO_RECEIPTS.filter((receipt) => receipt.policyRef.action === "escalated");
    }
    return liveEscalated.map((row) => toActionReceipt(row as Record<string, unknown>)) as ActionReceipt[];
  }, [liveEscalated]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-emerald-400" />
          <h1 className="text-xl font-semibold tracking-tight text-content">Delegation</h1>
        </div>
        <p className="text-sm text-content-muted">
          Scope tools, approvals, and authority before an agent acts. Every permission gets a passport.
        </p>
      </div>

      <section aria-labelledby="passport-heading" className="space-y-3">
        <h2 id="passport-heading" className="text-sm font-medium text-content-secondary">
          Agent Passport
        </h2>
        <div className="space-y-4 rounded-xl border border-edge bg-surface-secondary/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-medium text-content">{passport.displayName}</div>
              <div className="mt-0.5 font-mono text-xs text-content-muted">{passport.passportId}</div>
            </div>
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", tier.className)}>
              {tier.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-edge bg-surface-secondary/50 px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="text-lg font-semibold">{passport.allowedTools.length}</span>
              </div>
              <div className="text-[11px] font-medium text-content-muted">Allowed</div>
            </div>
            <div className="rounded-lg border border-edge bg-surface-secondary/50 px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 text-red-400">
                <ShieldX className="h-3.5 w-3.5" />
                <span className="text-lg font-semibold">{passport.deniedTools.length}</span>
              </div>
              <div className="text-[11px] font-medium text-content-muted">Denied</div>
            </div>
            <div className="rounded-lg border border-edge bg-surface-secondary/50 px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span className="text-lg font-semibold">{passport.escalatedTools.length}</span>
              </div>
              <div className="text-[11px] font-medium text-content-muted">Escalated</div>
            </div>
            <div className="rounded-lg border border-edge bg-surface-secondary/50 px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 text-content-muted">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-lg font-semibold">${passport.spendLimit}</span>
              </div>
              <div className="text-[11px] font-medium text-content-muted">Spend Limit</div>
            </div>
          </div>

          <div className="text-xs">
            <div className="mb-1.5 flex items-center gap-1 font-medium text-content-muted">
              <Database className="h-3 w-3" />
              Data Scope
            </div>
            <div className="flex flex-wrap gap-1.5">
              {passport.dataScope.map((scope) => (
                <span
                  key={scope}
                  className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] text-indigo-400"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="approvals-heading" className="space-y-3">
        <h2 id="approvals-heading" className="text-sm font-medium text-content-secondary">
          Pending Approvals
        </h2>
        <p className="text-xs text-content-muted">
          Receipt-backed OpenClaw actions held for human review before execution.
        </p>
        <ReceiptApprovalQueue compact maxItems={5} />
      </section>

      <section aria-labelledby="escalation-heading" className="space-y-3">
        <h2 id="escalation-heading" className="text-sm font-medium text-content-secondary">
          Escalation Log
        </h2>
        <p className="text-xs text-content-muted">
          Recent actions that triggered escalation, held for approval, or flagged for review.
        </p>
        <div className="space-y-2">
          {escalatedReceipts.map((receipt) => (
            <ReceiptCard
              key={receipt.receiptId}
              receipt={receipt}
              isExpanded={expandedIds.has(receipt.receiptId)}
              onToggle={() => toggleExpand(receipt.receiptId)}
            />
          ))}
          {escalatedReceipts.length === 0 && (
            <div className="py-8 text-center text-sm text-content-muted">No escalated actions in the current dataset.</div>
          )}
        </div>
      </section>

      <div className="border-t border-edge/30 pt-4 text-center text-[11px] text-content-muted">
        Demo mode. Showing the golden dataset passport and escalation log.
      </div>
    </div>
  );
});

export default DelegationShowcase;
