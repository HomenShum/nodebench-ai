/**
 * emitWithReceipt.ts — Helper that wraps appendAuditEntry + emitReceipt.
 *
 * Drop-in replacement for direct appendAuditEntryPublic calls.
 * Emits both a TRACE audit entry AND an action receipt in parallel.
 *
 * The receipt provides the tamper-evident, content-addressed counterpart
 * to the operational audit log. Together they form the trust layer.
 *
 * Usage in orchestrators:
 *   import { emitWithReceipt } from "./receipts/emitWithReceipt";
 *   await emitWithReceipt(ctx, auditArgs, { agentId: "scout-01" });
 */

import type { ActionCtx } from "../../../_generated/server";
import { api, internal } from "../../../_generated/api";

/** Minimal receipt context — only what the orchestrator knows beyond the audit entry. */
interface ReceiptContext {
  /** Agent identifier (e.g. "research-scout-01") */
  agentId: string;
  /** Convex agentRuns ID if available */
  agentRunId?: string;
  /** Policy that authorized this action. Defaults to "pol_trace_default". */
  policyId?: string;
  /** Human-readable policy rule name. */
  policyRuleName?: string;
  /** "allowed" | "denied" | "escalated" — defaults to "allowed" */
  policyAction?: string;
  /** Evidence artifact IDs this action references */
  evidenceRefs?: string[];
  /** Whether this action can be undone */
  canUndo?: boolean;
  /** How to reverse this action */
  undoInstructions?: string;
}

/**
 * Emit both a TRACE audit entry and an action receipt.
 *
 * The audit entry goes to traceAuditEntries (operational log).
 * The receipt goes to actionReceipts (tamper-evident trust log).
 *
 * Both are emitted in parallel — neither blocks the other.
 */
export async function emitWithReceipt(
  ctx: ActionCtx,
  auditArgs: {
    executionId: string;
    executionType: "swarm" | "tree" | "chat" | "forecast_refresh" | "linkedin_post";
    seq: number;
    choiceType: "gather_info" | "execute_data_op" | "execute_output" | "finalize";
    toolName: string;
    toolParams?: Record<string, unknown>;
    metadata: {
      rowCount?: number;
      columnCount?: number;
      uniqueValues?: unknown;
      charCount?: number;
      wordCount?: number;
      keyTopics?: string[];
      errorMessage?: string;
      durationMs: number;
      success: boolean;
      intendedState?: string;
      actualState?: string;
      correctionApplied?: boolean;
      originalRequest?: string;
      deliverySummary?: string;
    };
    description: string;
  },
  receiptCtx: ReceiptContext,
): Promise<void> {
  // Fire both in parallel — receipt emission is best-effort (don't block orchestrator)
  const auditPromise = ctx.runMutation(
    api.domains.agents.traceAuditLog.appendAuditEntryPublic,
    auditArgs,
  );

  const receiptPromise = ctx.runAction(
    internal.domains.agents.receipts.actionReceipts.emitReceipt,
    {
      agentId: receiptCtx.agentId,
      agentRunId: receiptCtx.agentRunId as never,
      toolName: auditArgs.toolName,
      params: auditArgs.toolParams,
      actionSummary: auditArgs.description,
      policyId: receiptCtx.policyId ?? "pol_trace_default",
      policyRuleName: receiptCtx.policyRuleName ?? "TRACE orchestrator default",
      policyAction: receiptCtx.policyAction ?? "allowed",
      evidenceRefs: receiptCtx.evidenceRefs ?? [],
      resultSuccess: auditArgs.metadata.success,
      resultSummary: auditArgs.metadata.success
        ? `${auditArgs.toolName} completed in ${auditArgs.metadata.durationMs}ms`
        : `${auditArgs.toolName} failed: ${auditArgs.metadata.errorMessage ?? "unknown error"}`,
      resultOutputHash: undefined,
      canUndo: receiptCtx.canUndo ?? false,
      undoInstructions: receiptCtx.undoInstructions,
      violations: auditArgs.metadata.success
        ? []
        : [
            {
              ruleId: "rule_execution_failure",
              ruleName: "Tool Execution Failure",
              severity: "warning",
              description: auditArgs.metadata.errorMessage ?? "Tool execution did not succeed",
            },
          ],
    },
  ).catch(() => {
    // Receipt emission is best-effort — log but don't fail the orchestrator
    // In production, this would emit a telemetry event
  });

  await Promise.all([auditPromise, receiptPromise]);
}
