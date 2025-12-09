import React from "react";
import { motion } from "framer-motion";

interface DashboardProps {
  data: {
    phaseLabel: string;
    kpis: Array<{ label: string; value: number; unit: string; color: string }>;
    marketSentiment: number;
    activeRegion: string;
  };
}



export const DashboardPanel: React.FC<DashboardProps> = ({ data }) => {
  return (
    <div className="flex h-full flex-col justify-between rounded-xl bg-white/80 p-6 shadow-xl backdrop-blur-xl ring-1 ring-white/40">
      <div>
        <div className="flex items-center justify-between mb-8">
          <motion.div
            key={data.phaseLabel}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-900 border border-gray-900/10"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            {data.phaseLabel}
          </motion.div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Live Metrics
          </div>
        </div>

        <div className="mb-10">
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">Market Sentiment</h4>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-5xl font-bold tracking-tighter text-gray-900">{data.marketSentiment}</span>
            <span className="mb-1.5 text-sm font-medium text-gray-400">/ 100</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${data.marketSentiment}%` }}
              transition={{ type: "spring", stiffness: 40, damping: 15 }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {data.kpis.map((kpi) => (
          <div key={kpi.label}>
            <div className="mb-2 flex justify-between items-baseline text-sm">
              <span className="text-gray-500 font-medium">{kpi.label}</span>
              <span className="font-mono font-bold text-gray-900 text-lg">
                {kpi.value}
                <span className="text-xs text-gray-400 ml-0.5">{kpi.unit}</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className={`h-full ${kpi.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${kpi.value}%` }}
                transition={{ duration: 1, ease: "circOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 border-t border-gray-100 pt-6">
        <div className="flex justify-between items-center text-xs">
          <span className="font-medium text-gray-400 uppercase tracking-wider">Region Focus</span>
          <motion.div
            key={data.activeRegion}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 font-semibold text-gray-700"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {data.activeRegion}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
