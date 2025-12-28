"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SparkBars } from "./Sparkline";
import { Activity, Download } from "lucide-react";

interface SignalTimeseriesPanelProps {
  keyword: string;
  days?: number;
}

export const SignalTimeseriesPanel: React.FC<SignalTimeseriesPanelProps> = ({ keyword, days = 14 }) => {
  const timeseries = useQuery(
    api.domains.research.signalTimeseries.getSignalTimeseries,
    keyword ? { keyword, days } : "skip",
  );

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const counts = useMemo(() => (timeseries ?? []).map((point) => point.count), [timeseries]);
  const total = counts.reduce((sum, value) => sum + value, 0);
  const latest = counts[counts.length - 1] ?? 0;
  const activePoint = useMemo(() => {
    if (!timeseries || timeseries.length === 0) return null;
    if (activeIndex !== null && timeseries[activeIndex]) return timeseries[activeIndex];
    return timeseries[timeseries.length - 1];
  }, [activeIndex, timeseries]);
  const activeEvents = useMemo(() => activePoint?.events ?? [], [activePoint]);
  const labels = useMemo(() => {
    if (!timeseries) return [];
    return timeseries.map((point) => `${point.date}: ${point.count} hits`);
  }, [timeseries]);
  const ledgerRows = useMemo(() => {
    if (!timeseries) return [];
    return timeseries.slice(-7);
  }, [timeseries]);

  const handleExport = () => {
    if (!timeseries || timeseries.length === 0) return;
    const rows = [
      ["date", "count", "events"].join(","),
      ...timeseries.map((point: any) => {
        const events = (point.events ?? []).map((ev: any) => ev.title).join(" | ");
        const safeEvents = `"${events.replace(/\"/g, '\"\"')}"`;
        return `${point.date},${point.count},${safeEvents}`;
      }),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `signal-${keyword}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!keyword) return null;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-stone-500" />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Signal Momentum</div>
          <div className="text-sm font-semibold text-stone-900">{keyword}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>Total {total} hits</span>
        <div className="flex items-center gap-2">
          <span>Latest: {latest}</span>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-700"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <SparkBars
          data={counts}
          width={180}
          height={40}
          color="#0f172a"
          labels={labels}
          onBarHover={setActiveIndex}
          onBarLeave={() => setActiveIndex(null)}
        />
      </div>

      {activePoint && (
        <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] text-stone-600">
          <div className="text-[10px] uppercase tracking-widest text-stone-400">Active day</div>
          <div className="font-semibold text-stone-800">
            {activePoint.date} • {activePoint.count} hits
          </div>
        </div>
      )}

      {activeEvents.length > 0 && (
        <div className="space-y-2 text-[11px] text-stone-600">
          <div className="text-[10px] uppercase tracking-widest text-stone-400">Mapped events</div>
          {activeEvents.map((event: any, idx: number) => (
            <a
              key={`${event.title}-${idx}`}
              href={event.url || "#"}
              target={event.url ? "_blank" : undefined}
              rel={event.url ? "noopener noreferrer" : undefined}
              className="block rounded-md border border-stone-100 bg-stone-50 px-2 py-1 hover:border-stone-200"
            >
              <div className="font-semibold text-stone-800">{event.title}</div>
              {event.source && <div className="text-[10px] text-stone-400">{event.source}</div>}
            </a>
          ))}
        </div>
      )}

      {ledgerRows.length > 0 && (
        <div className="space-y-2 text-[11px] text-stone-600">
          <div className="text-[10px] uppercase tracking-widest text-stone-400">Event ledger</div>
          <div className="space-y-1">
            {ledgerRows.map((row: any, idx: number) => (
              <div
                key={`${row.date}-${idx}`}
                className="flex items-center justify-between rounded-md border border-stone-100 bg-white px-2 py-1"
              >
                <span className="text-stone-700">{row.date}</span>
                <span className="text-stone-500">{row.count} hits</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignalTimeseriesPanel;
