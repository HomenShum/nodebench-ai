"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  Cell,
} from "recharts";
import {
  Activity,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Zap,
  TrendingUp,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ModelEvalResult {
  model: string;
  passRate: number;
  avgTimeSeconds: number;
  totalTests: number;
  passed: number;
  failed: number;
  costPerMillion?: { input: number; output: number };
  provider?: string;
}

export interface ScenarioResult {
  scenario: string;
  passRate: number;
  avgTimeSeconds: number;
  modelBreakdown: { model: string; passed: boolean; timeSeconds: number }[];
}

export interface EvalDashboardProps {
  modelResults: ModelEvalResult[];
  scenarioResults?: ScenarioResult[];
  runDate?: string;
  totalTime?: number;
  suiteId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// LATEST BENCHMARK DATA (Jan 8, 2026 - Full 70-eval run)
// ═══════════════════════════════════════════════════════════════════════════

export const LATEST_EVAL_DATA: ModelEvalResult[] = [
  {
    model: "gemini-3-flash",
    passRate: 100,
    avgTimeSeconds: 16.4,
    totalTests: 10,
    passed: 10,
    failed: 0,
    costPerMillion: { input: 0.5, output: 3.0 },
    provider: "google",
  },
  {
    model: "gpt-5-mini",
    passRate: 100,
    avgTimeSeconds: 46.2,
    totalTests: 10,
    passed: 10,
    failed: 0,
    costPerMillion: { input: 0.25, output: 2.0 },
    provider: "openai",
  },
  {
    model: "deepseek-v3.2",
    passRate: 100,
    avgTimeSeconds: 80.7,
    totalTests: 10,
    passed: 10,
    failed: 0,
    costPerMillion: { input: 0.25, output: 0.38 },
    provider: "openrouter",
  },
  {
    model: "claude-haiku-4.5",
    passRate: 90,
    avgTimeSeconds: 38.9,
    totalTests: 10,
    passed: 9,
    failed: 1,
    costPerMillion: { input: 1.0, output: 5.0 },
    provider: "anthropic",
  },
  {
    model: "minimax-m2.1",
    passRate: 90,
    avgTimeSeconds: 27.3,
    totalTests: 10,
    passed: 9,
    failed: 1,
    costPerMillion: { input: 0.28, output: 1.2 },
    provider: "openrouter",
  },
  {
    model: "deepseek-r1",
    passRate: 80,
    avgTimeSeconds: 53.2,
    totalTests: 10,
    passed: 8,
    failed: 2,
    costPerMillion: { input: 0.7, output: 2.4 },
    provider: "openrouter",
  },
  {
    model: "qwen3-235b",
    passRate: 70,
    avgTimeSeconds: 33.9,
    totalTests: 10,
    passed: 7,
    failed: 3,
    costPerMillion: { input: 0.18, output: 0.54 },
    provider: "openrouter",
  },
];

export const LATEST_SCENARIO_DATA: ScenarioResult[] = [
  { scenario: "Banker vague outreach debrief", passRate: 100, avgTimeSeconds: 35.0, modelBreakdown: [] },
  { scenario: "VC wedge from OSS signal", passRate: 100, avgTimeSeconds: 41.9, modelBreakdown: [] },
  { scenario: "CTO risk exposure + patch plan", passRate: 100, avgTimeSeconds: 41.8, modelBreakdown: [] },
  { scenario: "Exec vendor evaluation", passRate: 85.7, avgTimeSeconds: 55.2, modelBreakdown: [] },
  { scenario: "Ecosystem second-order effects", passRate: 71.4, avgTimeSeconds: 37.2, modelBreakdown: [] },
  { scenario: "Founder positioning vs incumbent", passRate: 71.4, avgTimeSeconds: 59.1, modelBreakdown: [] },
  { scenario: "Academic literature anchor", passRate: 100, avgTimeSeconds: 32.6, modelBreakdown: [] },
  { scenario: "Quant signal extraction", passRate: 100, avgTimeSeconds: 45.1, modelBreakdown: [] },
  { scenario: "Product designer schema card", passRate: 85.7, avgTimeSeconds: 36.0, modelBreakdown: [] },
  { scenario: "Sales engineer one-screen summary", passRate: 85.7, avgTimeSeconds: 36.7, modelBreakdown: [] },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const getPassRateColor = (rate: number): string => {
  if (rate >= 90) return "#10b981"; // emerald-500
  if (rate >= 70) return "#f59e0b"; // amber-500
  if (rate >= 50) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
};

const getProviderColor = (provider?: string): string => {
  switch (provider) {
    case "google":
      return "#4285f4";
    case "openai":
      return "#10a37f";
    case "anthropic":
      return "#d97706";
    case "openrouter":
      return "#8b5cf6";
    default:
      return "#6b7280";
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ModelEvalDashboard: React.FC<EvalDashboardProps> = ({
  modelResults = LATEST_EVAL_DATA,
  scenarioResults = LATEST_SCENARIO_DATA,
  runDate = "2026-01-08",
  totalTime = 192.6,
  suiteId = "core",
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "scenarios" | "cost">("overview");

  // Sort by pass rate for display
  const sortedModels = [...modelResults].sort((a, b) => b.passRate - a.passRate);

  // Calculate summary stats
  const avgPassRate = modelResults.reduce((sum, m) => sum + m.passRate, 0) / modelResults.length;
  const totalPassed = modelResults.reduce((sum, m) => sum + m.passed, 0);
  const totalTests = modelResults.reduce((sum, m) => sum + m.totalTests, 0);
  const fastestModel = [...modelResults].sort((a, b) => a.avgTimeSeconds - b.avgTimeSeconds)[0];
  const bestModel = sortedModels[0];

  // Prepare radar chart data
  const radarData = sortedModels
    .filter((m) => m.passRate > 0)
    .map((m) => ({
      model: m.model.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      passRate: m.passRate,
      speed: Math.max(0, 100 - m.avgTimeSeconds), // Inverse speed score
      costEfficiency: m.costPerMillion
        ? Math.max(0, 100 - (m.costPerMillion.input + m.costPerMillion.output) * 10)
        : 50,
    }));

  return (
    <div className="space-y-6 p-4 bg-white rounded-xl border border-stone-200">
      {/* v0.1.0 Announcement Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-emerald-700 font-semibold text-sm">v0.1.0 — Gemini 3 Flash is Now Default</h3>
            <p className="text-xs text-stone-600 mt-0.5">
              100% pass rate • 16.1s avg latency • $0.10/M input tokens •
              <span className="text-emerald-600 ml-1">3× faster than Claude Haiku</span>
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            NodeBench AI Model Evaluation
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Suite: <span className="font-mono text-stone-700">{suiteId}</span> | Run: {runDate} | Total Time: {totalTime.toFixed(1)}s
          </p>
        </div>
        <div className="flex gap-2">
          {["overview", "scenarios", "cost"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Best Model</div>
          <div className="text-lg font-bold text-emerald-900 mt-1">{bestModel.model}</div>
          <div className="text-xs text-emerald-700 flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" />
            {bestModel.passRate}% pass rate
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Fastest Model</div>
          <div className="text-lg font-bold text-blue-900 mt-1">{fastestModel.model}</div>
          <div className="text-xs text-blue-700 flex items-center gap-1 mt-1">
            <Zap className="w-3 h-3" />
            {fastestModel.avgTimeSeconds.toFixed(1)}s avg
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Avg Pass Rate</div>
          <div className="text-lg font-bold text-amber-900 mt-1">{avgPassRate.toFixed(1)}%</div>
          <div className="text-xs text-amber-700 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            {totalPassed}/{totalTests} tests
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg p-4 border border-violet-200">
          <div className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Models Tested</div>
          <div className="text-lg font-bold text-violet-900 mt-1">{modelResults.length}</div>
          <div className="text-xs text-violet-700 flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            {scenarioResults?.length || 10} scenarios
          </div>
        </div>
      </div>

      {/* Main Content based on activeTab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-2 gap-6">
          {/* Pass Rate Bar Chart */}
          <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
            <h3 className="text-sm font-semibold text-stone-800 mb-4">Pass Rate by Model</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedModels} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="model" width={100} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Pass Rate"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="passRate" radius={[0, 4, 4, 0]}>
                  {sortedModels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getPassRateColor(entry.passRate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Radar */}
          <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
            <h3 className="text-sm font-semibold text-stone-800 mb-4">Multi-Dimensional Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#d1d5db" />
                <PolarAngleAxis dataKey="model" tick={{ fontSize: 9 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar name="Pass Rate" dataKey="passRate" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Radar name="Speed" dataKey="speed" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Radar name="Cost Efficiency" dataKey="costEfficiency" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Response Time Comparison */}
          <div className="col-span-2 bg-stone-50 rounded-lg p-4 border border-stone-200">
            <h3 className="text-sm font-semibold text-stone-800 mb-4">Average Response Time (seconds)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sortedModels}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="model" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${v}s`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}s`, "Avg Time"]} />
                <Bar dataKey="avgTimeSeconds" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {sortedModels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getProviderColor(entry.provider)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "scenarios" && scenarioResults && (
        <div className="space-y-4">
          <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
            <h3 className="text-sm font-semibold text-stone-800 mb-4">Scenario Pass Rates</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={scenarioResults} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="scenario" width={200} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Pass Rate"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="passRate" radius={[0, 4, 4, 0]}>
                  {scenarioResults.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getPassRateColor(entry.passRate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "cost" && (
        <div className="space-y-4">
          <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
            <h3 className="text-sm font-semibold text-stone-800 mb-4">Cost per Million Tokens</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedModels.filter((m) => m.costPerMillion)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="model" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, ""]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="costPerMillion.input" name="Input $/1M" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="costPerMillion.output" name="Output $/1M" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cost vs Performance scatter-like view */}
          <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
            <h3 className="text-sm font-semibold text-stone-800 mb-4">Value Analysis: Pass Rate vs Total Cost</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] uppercase tracking-widest text-stone-400 border-b border-stone-200">
                  <tr>
                    <th className="py-2 pr-4">Model</th>
                    <th className="py-2 pr-4">Provider</th>
                    <th className="py-2 pr-4">Pass Rate</th>
                    <th className="py-2 pr-4">Input $/1M</th>
                    <th className="py-2 pr-4">Output $/1M</th>
                    <th className="py-2 pr-4">Total $/1M</th>
                    <th className="py-2">Value Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedModels
                    .filter((m) => m.costPerMillion)
                    .map((m) => {
                      const totalCost = (m.costPerMillion?.input || 0) + (m.costPerMillion?.output || 0);
                      const valueScore = m.passRate / (totalCost || 1);
                      return (
                        <tr key={m.model} className="border-b border-stone-100 hover:bg-stone-100/50">
                          <td className="py-2 pr-4 font-semibold text-stone-800">{m.model}</td>
                          <td className="py-2 pr-4">
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-medium text-white"
                              style={{ backgroundColor: getProviderColor(m.provider) }}
                            >
                              {m.provider}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className="inline-flex items-center gap-1"
                              style={{ color: getPassRateColor(m.passRate) }}
                            >
                              {m.passRate >= 90 ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {m.passRate}%
                            </span>
                          </td>
                          <td className="py-2 pr-4">${m.costPerMillion?.input.toFixed(2)}</td>
                          <td className="py-2 pr-4">${m.costPerMillion?.output.toFixed(2)}</td>
                          <td className="py-2 pr-4 font-semibold">${totalCost.toFixed(2)}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 rounded-full bg-stone-200 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                  style={{ width: `${Math.min(100, valueScore * 2)}%` }}
                                />
                              </div>
                              <span className="text-stone-600">{valueScore.toFixed(1)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Results Table */}
      <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
        <h3 className="text-sm font-semibold text-stone-800 mb-4">Detailed Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] uppercase tracking-widest text-stone-400 border-b border-stone-200">
              <tr>
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Provider</th>
                <th className="py-2 pr-4 text-center">Passed</th>
                <th className="py-2 pr-4 text-center">Failed</th>
                <th className="py-2 pr-4">Pass Rate</th>
                <th className="py-2 pr-4">Avg Time</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedModels.map((m) => (
                <tr key={m.model} className="border-b border-stone-100 hover:bg-stone-100/50">
                  <td className="py-2.5 pr-4 font-semibold text-stone-800">{m.model}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[10px] font-medium text-white"
                      style={{ backgroundColor: getProviderColor(m.provider) }}
                    >
                      {m.provider}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-center text-emerald-600 font-semibold">{m.passed}</td>
                  <td className="py-2.5 pr-4 text-center text-rose-600 font-semibold">{m.failed}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-stone-200 overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${m.passRate}%`,
                            backgroundColor: getPassRateColor(m.passRate),
                          }}
                        />
                      </div>
                      <span className="font-semibold" style={{ color: getPassRateColor(m.passRate) }}>
                        {m.passRate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-stone-600">{m.avgTimeSeconds.toFixed(1)}s</td>
                  <td className="py-2.5">
                    {m.passRate === 100 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> PERFECT
                      </span>
                    ) : m.passRate >= 80 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        <TrendingUp className="w-3 h-3" /> GOOD
                      </span>
                    ) : m.passRate >= 50 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold">
                        PARTIAL
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                        <XCircle className="w-3 h-3" /> FAIL
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-[10px] text-stone-400 text-center border-t border-stone-200 pt-4">
        NodeBench AI Evaluation Framework | {modelResults.length} models | {totalTests} total tests | Generated {runDate}
      </div>
    </div>
  );
};

export default ModelEvalDashboard;
