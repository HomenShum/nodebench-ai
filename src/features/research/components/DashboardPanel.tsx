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
    <div className="flex h-full flex-col justify-between p-1">
      <div>
        <motion.div
          key={data.phaseLabel}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 inline-block rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow-sm"
        >
          {data.phaseLabel}
        </motion.div>

        <div className="mb-8">
          <h4 className="mb-2 text-xs font-bold uppercase text-gray-400">Market Sentiment</h4>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">{data.marketSentiment}</span>
            <span className="mb-1 text-sm text-gray-500">/ 100</span>
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full bg-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${data.marketSentiment}%` }}
              transition={{ type: "spring", stiffness: 50 }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {data.kpis.map((kpi) => (
          <div key={kpi.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-600">{kpi.label}</span>
              <span className="font-mono font-medium text-gray-900">
                {kpi.value}
                {kpi.unit}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-sm bg-gray-100">
              <motion.div
                className={`h-full ${kpi.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${kpi.value}%` }}
                transition={{ duration: 0.8, ease: "circOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-gray-100 pt-4">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Primary Region</span>
          <motion.span
            key={data.activeRegion}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-medium text-gray-700"
          >
            {data.activeRegion}
          </motion.span>
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
