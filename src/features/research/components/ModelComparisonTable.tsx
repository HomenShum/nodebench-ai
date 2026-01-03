"use client";

import React, { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { RefreshCw, TrendingUp, Clock } from "lucide-react";

interface ModelComparisonTableProps {
  modelKey: string;
  context?: string;
  initialData?: any;
}

export const ModelComparisonTable: React.FC<ModelComparisonTableProps> = ({ modelKey, context, initialData }) => {
  const refresh = useAction(api.domains.research.modelComparison.refreshModelComparison);
  const [comparison, setComparison] = useState<any | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (initialData) {
      setComparison(initialData);
      return;
    }
    if (!modelKey) return;
    setIsLoading(true);
    refresh({ modelKey, context })
      .then((result) => {
        if (mounted) setComparison(result.comparison);
      })
      .catch((err) => {
        if (mounted) setError(err?.message ?? "Failed to load comparison.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [context, modelKey, refresh]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Model Comparison</div>
          <div className="text-sm font-semibold text-stone-900">{context ?? modelKey}</div>
        </div>
        <button
          type="button"
          onClick={() => refresh({ modelKey, context, forceRefresh: true }).then((res) => setComparison(res.comparison))}
          className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700"
          aria-label="Refresh model comparison"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {comparison?.summary && (
        <div className="text-xs text-stone-600 leading-relaxed">{comparison.summary}</div>
      )}

      {comparison?.recommendation && (
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
          <TrendingUp className="w-3 h-3" />
          {comparison.recommendation}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="text-[10px] uppercase tracking-widest text-stone-400">
            <tr>
              <th className="py-2 pr-2">Model</th>
              <th className="py-2 pr-2">Input $/1M</th>
              <th className="py-2 pr-2">Output $/1M</th>
              <th className="py-2 pr-2">Context</th>
              <th className="py-2 pr-2">Reliability</th>
              <th className="py-2">Performance</th>
            </tr>
          </thead>
          <tbody>
            {(comparison?.rows ?? []).map((row: any) => (
              <tr key={row.model} className="border-t border-stone-100">
                <td className="py-2 pr-2 font-semibold text-stone-800">{row.model}</td>
                <td className="py-2 pr-2">${row.inputCostPer1M?.toFixed?.(2) ?? row.inputCostPer1M}</td>
                <td className="py-2 pr-2">${row.outputCostPer1M?.toFixed?.(2) ?? row.outputCostPer1M}</td>
                <td className="py-2 pr-2">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    {(row.contextWindow ?? 0).toLocaleString()}
                  </span>
                </td>
                <td className="py-2 pr-2">
                  {typeof row.reliabilityScore === "number" ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600"
                          style={{ width: `${Math.min(100, Math.max(0, row.reliabilityScore))}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-stone-600">{Math.round(row.reliabilityScore)}%</span>
                    </div>
                  ) : (
                    <span className="text-stone-400 text-[11px]">n/a</span>
                  )}
                </td>
                <td className="py-2 text-stone-600">{row.performance || row.notes || "n/a"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModelComparisonTable;
