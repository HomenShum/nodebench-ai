import React from "react";
import { motion } from "framer-motion";

type KPI = { label: string; value: number; unit: string; color: string; prefix?: string };
type FundingChart = { seed?: number; seriesA?: number; valuation?: number };
type RoiChart = { currentCost: number; withNodeBench: number; savingsPercent: number };

type DashboardProps = {
  data: {
    phaseLabel: string;
    kpis: KPI[];
    fundingChart?: FundingChart;
    roiChart?: RoiChart;
  };
};

const DashboardPanel: React.FC<DashboardProps> = ({ data }) => {
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

        {data.fundingChart && (
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-bold uppercase text-gray-400">Funding Rounds</h4>
            <div className="flex items-end gap-2">
              {data.fundingChart.seriesA !== undefined && (
                <>
                  <span className="text-3xl font-bold text-gray-900">${data.fundingChart.seriesA}M</span>
                  <span className="mb-1 text-sm text-gray-500">Series A</span>
                </>
              )}
            </div>
            {data.fundingChart.valuation !== undefined && (
              <div className="mt-2 text-xs text-gray-600">Post-money valuation: ${data.fundingChart.valuation}M</div>
            )}
          </div>
        )}

        {data.roiChart && (
          <div className="mb-8 rounded-md border border-gray-100 bg-gray-50 p-3">
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">ROI Snapshot</h4>
            <div className="text-sm text-gray-700 flex items-center justify-between">
              <span>Current cost</span>
              <span className="font-mono">${(data.roiChart.currentCost / 1_000_000).toFixed(1)}M</span>
            </div>
            <div className="text-sm text-gray-700 flex items-center justify-between">
              <span>With NodeBench</span>
              <span className="font-mono">${(data.roiChart.withNodeBench / 1_000_000).toFixed(1)}M</span>
            </div>
            <div className="mt-2 text-xs text-emerald-700 font-semibold">
              Savings: {data.roiChart.savingsPercent}% projected
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {data.kpis.map((kpi) => (
          <div key={kpi.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-600">{kpi.label}</span>
              <span className="font-mono font-medium text-gray-900">
                {kpi.prefix}
                {kpi.value}
                {kpi.unit}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-sm bg-gray-100">
              <motion.div
                className={`h-full ${kpi.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(kpi.value, 100)}%` }}
                transition={{ duration: 0.8, ease: "circOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPanel;
