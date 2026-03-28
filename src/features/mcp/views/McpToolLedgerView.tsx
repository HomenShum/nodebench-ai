import React, { useEffect, useMemo, useState } from "react";
import { Activity, Clock, CheckCircle2, XCircle } from "lucide-react";
import { PageHeroHeader } from "@/shared/ui/PageHeroHeader";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useStableQuery } from "@/hooks/useStableQuery";
import { SyncBridgeAccountPanel } from "@/features/mcp/components/SyncBridgeAccountPanel";
import { SharedContextProtocolPanel } from "@/features/mcp/components/SharedContextProtocolPanel";

type LedgerRow = {
  _id: string;
  toolName: string;
  toolType: string;
  riskTier: string;
  allowed: boolean;
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
  argsHash: string;
  argsKeys: string[];
  argsPreview?: string;
  resultPreview?: string;
  policy?: any;
  requestMeta?: any;
};

function formatMs(ms?: number): string {
  if (typeof ms !== "number") return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return String(ts);
  }
}

export const McpToolLedgerView: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dateKey, setDateKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [toolNameFilter, setToolNameFilter] = useState<string>("");
  const [riskTierFilter, setRiskTierFilter] = useState<string>("");
  const [allowedFilter, setAllowedFilter] = useState<"all" | "allowed" | "blocked">("all");
  const [successFilter, setSuccessFilter] = useState<"all" | "success" | "error">("all");
  const [policyActionError, setPolicyActionError] = useState<string | null>(null);
  const [policyActionBusy, setPolicyActionBusy] = useState<boolean>(false);

  const upsertPolicyConfig = useMutation(api.domains.mcp.mcpToolLedger.upsertPolicyConfig);

  const policyAndUsage = useStableQuery(api.domains.mcp.mcpToolLedger.getPolicyAndUsage, {
    dateKey,
  });

  const listArgs = useMemo(() => {
    const toolName = toolNameFilter.trim();
    const riskTier = riskTierFilter.trim();
    return {
      dateKey,
      limit: 50,
      toolName: toolName ? toolName : undefined,
      riskTier: riskTier ? riskTier : undefined,
      allowed:
        allowedFilter === "all" ? undefined : allowedFilter === "allowed" ? true : false,
      success:
        successFilter === "all" ? undefined : successFilter === "success" ? true : false,
    };
  }, [allowedFilter, dateKey, riskTierFilter, successFilter, toolNameFilter]);

  const list = useStableQuery(api.domains.mcp.mcpToolLedger.listToolCalls, listArgs);

  const calls = useMemo(
    () => ((list?.calls ?? []) as unknown as LedgerRow[]),
    [list?.calls],
  );

  const selected = useMemo(
    () => calls.find((c) => c._id === selectedId) ?? null,
    [calls, selectedId]
  );

  useEffect(() => {
    // If the filter changes, clear selection to avoid showing a detail panel for a row
    // that may no longer exist in the filtered result set.
    setSelectedId(null);
  }, [allowedFilter, dateKey, riskTierFilter, successFilter, toolNameFilter]);

  const toggleEnforcement = async () => {
    if (!policyAndUsage) return;
    setPolicyActionError(null);
    setPolicyActionBusy(true);
    try {
      await upsertPolicyConfig({
        name: policyAndUsage.config.name,
        enforce: !policyAndUsage.config.enforce,
      });
    } catch (err: any) {
      setPolicyActionError(err?.message ?? String(err));
    } finally {
      setPolicyActionBusy(false);
    }
  };

  return (
    <div className="nb-page-shell">
      <div className="nb-page-inner">
        <div className="nb-page-frame">
        <div className="flex items-start justify-between gap-4 mb-6">
          <PageHeroHeader
            icon={<Activity className="w-5 h-5" />}
            title="Activity Log"
            subtitle="See every tool request — who ran it, when, and what happened."
          />
          {policyAndUsage && (
            <div className="nb-surface-card px-4 py-3">
              <div className="text-xs font-medium text-content-secondary">Safety Rules</div>
              <div className="mt-1 text-sm text-content">
                {policyAndUsage.config.name}{" "}
                <span
                  className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    policyAndUsage.config.enforce
                      ? "bg-red-100 dark:bg-red-950/30 text-red-900 dark:text-red-400"
                      : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  {policyAndUsage.config.enforce ? "Active" : "Monitoring"}
                </span>
              </div>
              <div className="mt-1 text-xs text-content-secondary">
                {new Date(policyAndUsage.dateKey + "T00:00:00Z").toLocaleDateString('en-US', { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
              </div>
            </div>
          )}
        </div>

        <SyncBridgeAccountPanel />
        <SharedContextProtocolPanel />

        <div className="mb-6 nb-surface-card p-4">
          <div className="text-xs text-content-secondary">Filters</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3">
            <label className="block">
              <div className="text-xs font-semibold text-content-secondary">Usage Date (UTC)</div>
              <div className="relative mt-1">
                <span className="block w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-content">
                  {dateKey ? new Date(dateKey + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'All dates'}
                </span>
                <input
                  type="date"
                  value={dateKey}
                  onChange={(e) => setDateKey(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  aria-label="Select usage date"
                />
              </div>
            </label>

            <label className="block md:col-span-2">
              <div className="text-xs font-semibold text-content-secondary">Tool Name</div>
              <input
                value={toolNameFilter}
                onChange={(e) => setToolNameFilter(e.target.value)}
                placeholder='e.g. "createPlan"'
                className="mt-1 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted"
              />
            </label>

            <label className="block">
              <div className="text-xs font-semibold text-content-secondary">Risk Tier</div>
              <select
                value={riskTierFilter}
                onChange={(e) => setRiskTierFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-content"
              >
                <option value="">All</option>
                <option value="read_only">read_only</option>
                <option value="external_read">external_read</option>
                <option value="write_internal">write_internal</option>
                <option value="external_side_effect">external_side_effect</option>
                <option value="destructive">destructive</option>
                <option value="webmcp">webmcp</option>
                <option value="unknown">unknown</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="text-xs font-semibold text-content-secondary">Allowed</div>
                <select
                  value={allowedFilter}
                  onChange={(e) => setAllowedFilter(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-content"
                >
                  <option value="all">All</option>
                  <option value="allowed">Allowed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>

              <label className="block">
                <div className="text-xs font-semibold text-content-secondary">Success</div>
                <select
                  value={successFilter}
                  onChange={(e) => setSuccessFilter(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-content"
                >
                  <option value="all">All</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-3 text-xs text-content-secondary">
            Note: Both the usage summary and call list are filtered to the selected UTC date.
          </div>
        </div>

        {policyAndUsage && (
          <div className="mb-6 nb-surface-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-content-secondary">
                  Policy Controls
                </div>
                <div className="mt-1 text-sm text-content-secondary">
                  Toggle enforcement for budgets and block lists. Requires admin sign-in.
                </div>
              </div>
              <button
                type="button"
                onClick={toggleEnforcement}
                disabled={policyActionBusy}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  policyAndUsage.config.enforce
                    ? "bg-red-600 text-white hover:bg-red-500"
                    : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]"
                } ${policyActionBusy ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {policyActionBusy
                  ? "Saving..."
                  : policyAndUsage.config.enforce
                    ? "Disable Enforcement"
                    : "Enable Enforcement"}
              </button>
            </div>
            {policyActionError && (
              <div className="mt-3 text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap break-words">
                {policyActionError}
              </div>
            )}
          </div>
        )}

        {policyAndUsage && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="nb-surface-card p-4">
              <div className="text-xs text-content-secondary">
                Usage By Risk Tier (Today)
              </div>
              <div className="mt-3 space-y-2">
                {(policyAndUsage.usageByTier ?? []).length === 0 ? (
                  <div className="text-sm text-content-secondary">No usage recorded yet.</div>
                ) : (
                  policyAndUsage.usageByTier.slice(0, 8).map((row) => {
                    const pct =
                      typeof row.limit === "number" && row.limit > 0
                        ? Math.min(100, Math.round((row.count / row.limit) * 100))
                        : null;
                    return (
                      <div key={row.tier} className="flex items-center gap-3">
                        <div className="w-40 text-sm font-mono text-content truncate">
                          {row.tier}
                        </div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
                            <div
                              className="h-2 bg-[var(--accent-primary)]"
                              style={{ width: `${pct ?? 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-24 text-right text-sm text-content tabular-nums">
                          {typeof row.count === 'number' ? row.count.toLocaleString() : row.count}
                          {typeof row.limit === "number" ? (
                            <span className="text-content-secondary">/{row.limit.toLocaleString()}</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="nb-surface-card p-4">
              <div className="text-xs text-content-secondary">
                What This Enables
              </div>
              <ul className="mt-3 text-sm text-content-secondary list-disc pl-5 space-y-1">
                <li>Answer: who called what tool, when, with what inputs</li>
                <li>Replayable debugging: args/result previews + policy evaluation</li>
                <li>Budgets: daily limits per risk tier and per tool (optional enforcement)</li>
                <li>Human traceability: scan a single table instead of logs</li>
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 nb-surface-card overflow-hidden">
            <div className="px-4 py-3 border-b border-edge flex items-center justify-between">
              <div className="text-xs text-content-secondary">
                Recent Tool Calls
              </div>
              <div className="text-xs text-content-secondary tabular-nums">
                {calls.length} shown
              </div>
            </div>

            <div className="divide-y divide-edge">
              {calls.length === 0 ? (
                <div className="p-6 text-sm text-content-secondary">
                  No tool calls recorded yet. Activity will appear here as you interact with the AI assistant.
                </div>
              ) : (
                calls.map((c) => {
                  const isSelected = c._id === selectedId;
                  const status =
                    c.allowed === false
                      ? { label: "BLOCKED", cls: "bg-red-100 dark:bg-red-950/30 text-red-900 dark:text-red-400" }
                      : c.success === true
                        ? { label: "OK", cls: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" }
                      : c.success === false
                          ? { label: "ERROR", cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400" }
                          : { label: "RUNNING", cls: "bg-surface-secondary text-content-secondary" };

                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => setSelectedId(isSelected ? null : c._id)}
                      className={`w-full text-left px-4 py-2 hover:bg-surface-hover transition-colors ${
                        isSelected ? "bg-surface-secondary" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {c.allowed === false ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : c.success === true ? (
                            <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-content-secondary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-content truncate">
                              {c.toolName}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${status.cls}`}
                            >
                              {status.label}
                            </span>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-surface-secondary text-content-secondary">
                              {c.riskTier}
                            </span>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-surface-secondary text-content-secondary">
                              {c.toolType}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-content-secondary flex items-center gap-3 flex-wrap">
                            <span className="tabular-nums">{formatTime(c.startedAt)}</span>
                            <span className="tabular-nums">dur {formatMs(c.durationMs)}</span>
                            <span className="font-mono text-content-secondary truncate">
                              {c.argsHash}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="nb-surface-card overflow-hidden">
            <div className="px-4 py-3 border-b border-edge">
              <div className="text-xs text-content-secondary">
                Call Detail
              </div>
            </div>

            {!selected ? (
              <div className="p-4 text-sm text-content-secondary">
                Select a row to inspect args, policy evaluation, and result preview.
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-content-secondary">Tool</div>
                  <div className="font-mono text-sm text-content break-all">
                    {selected.toolName}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-content-secondary">Risk Tier</div>
                    <div className="text-sm text-content">{selected.riskTier}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-content-secondary">Duration</div>
                    <div className="text-sm text-content tabular-nums">
                      {formatMs(selected.durationMs)}
                    </div>
                  </div>
                </div>

                {selected.errorMessage && (
                  <div>
                    <div className="text-xs font-semibold text-red-700 dark:text-red-400">Error</div>
                    <div className="text-xs text-red-900 dark:text-red-300 whitespace-pre-wrap break-words">
                      {selected.errorMessage}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-content-secondary">Args Preview</div>
                  <pre className="mt-1 text-xs leading-relaxed bg-surface-secondary border border-edge rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-words">
                    {selected.argsPreview ?? "(none)"}
                  </pre>
                </div>

                <div>
                  <div className="text-xs font-semibold text-content-secondary">Result Preview</div>
                  <pre className="mt-1 text-xs leading-relaxed bg-surface-secondary border border-edge rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-words">
                    {selected.resultPreview ?? "(none)"}
                  </pre>
                </div>

                <div>
                  <div className="text-xs font-semibold text-content-secondary">Policy</div>
                  <pre className="mt-1 text-xs leading-relaxed bg-surface-secondary border border-edge rounded-lg p-3 overflow-auto max-h-56 whitespace-pre-wrap break-words">
                    {selected.policy ? JSON.stringify(selected.policy, null, 2) : "(none)"}
                  </pre>
                </div>

                <div>
                  <div className="text-xs font-semibold text-content-secondary">Request Meta</div>
                  <pre className="mt-1 text-xs leading-relaxed bg-surface-secondary border border-edge rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                    {selected.requestMeta ? JSON.stringify(selected.requestMeta, null, 2) : "(none)"}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
