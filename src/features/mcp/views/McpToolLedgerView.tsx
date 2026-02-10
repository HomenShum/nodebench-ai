import React, { useEffect, useMemo, useState } from "react";
import { Shield, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useStableQuery } from "@/hooks/useStableQuery";

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
    return new Date(ts).toLocaleString();
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

  const calls = (list?.calls ?? []) as unknown as LedgerRow[];

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
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-700" />
              <h1 className="text-xl font-semibold text-gray-900">MCP Tool Call Ledger</h1>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Deterministic audit trail for NodeBench MCP calls (policy, budgets, args/result previews).
            </p>
          </div>
          {policyAndUsage && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="text-[11px] uppercase tracking-widest text-gray-500">Policy</div>
              <div className="mt-1 text-sm text-gray-900">
                {policyAndUsage.config.name}{" "}
                <span
                  className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    policyAndUsage.config.enforce
                      ? "bg-red-100 text-red-900"
                      : "bg-indigo-100 text-gray-900"
                  }`}
                >
                  {policyAndUsage.config.enforce ? "ENFORCING" : "LOG ONLY"}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                DateKey: <span className="font-mono">{policyAndUsage.dateKey}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-[11px] uppercase tracking-widest text-gray-500">Filters</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3">
            <label className="block">
              <div className="text-xs font-semibold text-gray-700">Usage Date (UTC)</div>
              <input
                type="date"
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>

            <label className="block md:col-span-2">
              <div className="text-xs font-semibold text-gray-700">Tool Name</div>
              <input
                value={toolNameFilter}
                onChange={(e) => setToolNameFilter(e.target.value)}
                placeholder='e.g. "createPlan"'
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
              />
            </label>

            <label className="block">
              <div className="text-xs font-semibold text-gray-700">Risk Tier</div>
              <select
                value={riskTierFilter}
                onChange={(e) => setRiskTierFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">All</option>
                <option value="read_only">read_only</option>
                <option value="external_read">external_read</option>
                <option value="write_internal">write_internal</option>
                <option value="external_side_effect">external_side_effect</option>
                <option value="destructive">destructive</option>
                <option value="unknown">unknown</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="text-xs font-semibold text-gray-700">Allowed</div>
                <select
                  value={allowedFilter}
                  onChange={(e) => setAllowedFilter(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  <option value="all">All</option>
                  <option value="allowed">Allowed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>

              <label className="block">
                <div className="text-xs font-semibold text-gray-700">Success</div>
                <select
                  value={successFilter}
                  onChange={(e) => setSuccessFilter(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  <option value="all">All</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Note: Both the usage summary and call list are filtered to the selected UTC date.
          </div>
        </div>

        {policyAndUsage && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-gray-500">
                  Policy Controls
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  Toggle enforcement for budgets and denylist. Requires admin sign-in.
                </div>
              </div>
              <button
                type="button"
                onClick={toggleEnforcement}
                disabled={policyActionBusy}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  policyAndUsage.config.enforce
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "bg-indigo-600 text-white hover:bg-indigo-500"
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
              <div className="mt-3 text-sm text-red-700 whitespace-pre-wrap break-words">
                {policyActionError}
              </div>
            )}
          </div>
        )}

        {policyAndUsage && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-[11px] uppercase tracking-widest text-gray-500">
                Usage By Risk Tier (Today)
              </div>
              <div className="mt-3 space-y-2">
                {(policyAndUsage.usageByTier ?? []).length === 0 ? (
                  <div className="text-sm text-gray-600">No usage recorded yet.</div>
                ) : (
                  policyAndUsage.usageByTier.slice(0, 8).map((row) => {
                    const pct =
                      typeof row.limit === "number" && row.limit > 0
                        ? Math.min(100, Math.round((row.count / row.limit) * 100))
                        : null;
                    return (
                      <div key={row.tier} className="flex items-center gap-3">
                        <div className="w-40 text-sm font-mono text-gray-900 truncate">
                          {row.tier}
                        </div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-2 bg-gray-700"
                              style={{ width: `${pct ?? 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-24 text-right text-sm text-gray-800 tabular-nums">
                          {row.count}
                          {typeof row.limit === "number" ? (
                            <span className="text-gray-500">/{row.limit}</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-[11px] uppercase tracking-widest text-gray-500">
                What This Enables
              </div>
              <ul className="mt-3 text-sm text-gray-700 list-disc pl-5 space-y-1">
                <li>Answer: who called what tool, when, with what inputs</li>
                <li>Replayable debugging: args/result previews + policy evaluation</li>
                <li>Budgets: daily limits per risk tier and per tool (optional enforcement)</li>
                <li>Human traceability: scan a single table instead of logs</li>
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-widest text-gray-500">
                Recent Tool Calls
              </div>
              <div className="text-xs text-gray-500 tabular-nums">
                {calls.length} shown
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {calls.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">
                  No MCP tool calls recorded yet. Generate a few by calling the MCP unified server
                  or hitting <span className="font-mono">/api/mcpGateway</span>.
                </div>
              ) : (
                calls.map((c) => {
                  const isSelected = c._id === selectedId;
                  const status =
                    c.allowed === false
                      ? { label: "BLOCKED", cls: "bg-red-100 text-red-900" }
                      : c.success === true
                        ? { label: "OK", cls: "bg-indigo-100 text-gray-900" }
                        : c.success === false
                          ? { label: "ERROR", cls: "bg-amber-100 text-amber-900" }
                          : { label: "RUNNING", cls: "bg-gray-100 text-gray-700" };

                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => setSelectedId(isSelected ? null : c._id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        isSelected ? "bg-gray-50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {c.allowed === false ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : c.success === true ? (
                            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-gray-900 truncate">
                              {c.toolName}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${status.cls}`}
                            >
                              {status.label}
                            </span>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-700">
                              {c.riskTier}
                            </span>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-700">
                              {c.toolType}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-600 flex items-center gap-3 flex-wrap">
                            <span className="tabular-nums">{formatTime(c.startedAt)}</span>
                            <span className="tabular-nums">dur {formatMs(c.durationMs)}</span>
                            <span className="font-mono text-gray-500 truncate">
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

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="text-[11px] uppercase tracking-widest text-gray-500">
                Call Detail
              </div>
            </div>

            {!selected ? (
              <div className="p-4 text-sm text-gray-600">
                Select a row to inspect args, policy evaluation, and result preview.
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-gray-700">Tool</div>
                  <div className="font-mono text-sm text-gray-900 break-all">
                    {selected.toolName}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-700">Risk Tier</div>
                    <div className="text-sm text-gray-900">{selected.riskTier}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700">Duration</div>
                    <div className="text-sm text-gray-900 tabular-nums">
                      {formatMs(selected.durationMs)}
                    </div>
                  </div>
                </div>

                {selected.errorMessage && (
                  <div>
                    <div className="text-xs font-semibold text-red-700">Error</div>
                    <div className="text-xs text-red-900 whitespace-pre-wrap break-words">
                      {selected.errorMessage}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-gray-700">Args Preview</div>
                  <pre className="mt-1 text-[11px] leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-words">
                    {selected.argsPreview ?? "(none)"}
                  </pre>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-700">Result Preview</div>
                  <pre className="mt-1 text-[11px] leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-words">
                    {selected.resultPreview ?? "(none)"}
                  </pre>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-700">Policy</div>
                  <pre className="mt-1 text-[11px] leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-56 whitespace-pre-wrap break-words">
                    {selected.policy ? JSON.stringify(selected.policy, null, 2) : "(none)"}
                  </pre>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-700">Request Meta</div>
                  <pre className="mt-1 text-[11px] leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                    {selected.requestMeta ? JSON.stringify(selected.requestMeta, null, 2) : "(none)"}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
