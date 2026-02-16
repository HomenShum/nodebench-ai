import React from "react";
import { TrendingUp } from "lucide-react";

/**
 * ForecastCockpit
 *
 * NOTE: This component is imported lazily by `ResearchHub.tsx`.
 * Keep this file dependency-light so production builds don't break
 * if the forecasting UI/backend ships incrementally.
 */
export function ForecastCockpit() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Forecast Cockpit</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Coming soon: calibration charts, Brier trend, and evidence timelines.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForecastCockpit;
