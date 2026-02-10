"use client";

import React, { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { BarChart3, RefreshCw } from "lucide-react";

interface StrategyMetricsPanelProps {
  title: string;
  summary?: string;
  url?: string;
  initialData?: any;
}

export const StrategyMetricsPanel: React.FC<StrategyMetricsPanelProps> = ({ title, summary, url, initialData }) => {
  const refresh = useAction(api.domains.research.strategyMetrics.refreshStrategyMetrics);
  const [report, setReport] = useState<any | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (initialData) {
      setReport(initialData);
      return;
    }
    if (!title) return;
    setIsLoading(true);
    refresh({ title, summary, url })
      .then((res) => {
        if (mounted) setReport(res.metrics);
      })
      .catch((err) => {
        if (mounted) setError(err?.message ?? "Failed to load strategy metrics.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [initialData, refresh, summary, title, url]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-500" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Strategy Metrics</div>
            <div className="text-sm font-semibold text-gray-900">Pivot justification</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            refresh({ title, summary, url, forceRefresh: true })
              .then((res) => setReport(res.metrics))
              .catch((err) => setError(err?.message ?? "Failed to refresh."))
              .finally(() => setIsLoading(false));
          }}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {report?.narrative && (
        <div className="text-xs text-gray-600 leading-relaxed">{report.narrative}</div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        {(report?.metrics ?? []).slice(0, 4).map((metric: any, idx: number) => (
          <div key={`${metric.label}-${idx}`} className="rounded-md border border-gray-100 bg-gray-50 p-2">
            <div className="text-[10px] uppercase tracking-widest text-gray-400">{metric.label}</div>
            <div className="text-sm font-semibold text-gray-900">
              {metric.value}{metric.unit ? ` ${metric.unit}` : ""}
            </div>
            {metric.context && <div className="text-[10px] text-gray-400">{metric.context}</div>}
          </div>
        ))}
      </div>

      {report?.risks?.length ? (
        <div className="text-[11px] text-gray-500">
          <div className="text-[10px] uppercase tracking-widest text-gray-400">Risks</div>
          <ul className="list-disc list-inside space-y-1">
            {report.risks.slice(0, 3).map((risk: string, idx: number) => (
              <li key={`${risk}-${idx}`}>{risk}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {report?.sources?.length ? (
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-400">
          {report.sources.slice(0, 3).map((source: any, idx: number) => (
            <a
              key={`${source.url}-${idx}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 hover:text-gray-700"
            >
              {source.title || "Source"}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default StrategyMetricsPanel;
