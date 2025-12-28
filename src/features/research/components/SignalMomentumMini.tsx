"use client";

import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SparkBars } from "./Sparkline";

interface SignalMomentumMiniProps {
  keyword: string;
  days?: number;
}

export const SignalMomentumMini: React.FC<SignalMomentumMiniProps> = ({ keyword, days = 10 }) => {
  const cleanedKeyword = useMemo(() => {
    const words = keyword.split(/\s+/).map((word) => word.replace(/[^a-z0-9]/gi, ""));
    const candidate = words.find((word) => word.length > 3);
    return candidate || keyword.split(" ")[0];
  }, [keyword]);

  const timeseries = useQuery(
    api.domains.research.signalTimeseries.getSignalTimeseries,
    cleanedKeyword ? { keyword: cleanedKeyword, days } : "skip",
  );

  const counts = useMemo(() => (timeseries ?? []).map((point) => point.count), [timeseries]);
  const total = counts.reduce((sum, value) => sum + value, 0);
  const latest = counts[counts.length - 1] ?? 0;

  if (!cleanedKeyword) return null;

  return (
    <div className="mt-6 rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-[10px] text-stone-500 flex items-center justify-between gap-3">
      <div>
        <div className="text-[9px] uppercase tracking-widest text-stone-400">Momentum</div>
        <div className="text-xs font-semibold text-stone-700">{cleanedKeyword}</div>
      </div>
      <div className="flex items-center gap-3">
        <SparkBars data={counts} width={90} height={24} color="#111827" />
        <div className="text-[10px] text-stone-500">
          {latest} latest / {total} total
        </div>
      </div>
    </div>
  );
};

export default SignalMomentumMini;
