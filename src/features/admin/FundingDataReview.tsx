/**
 * Funding Data Review Dashboard
 *
 * Manual review interface for flagged funding records.
 * Allows operators to:
 * - View records with data quality issues
 * - Fix company names and amounts
 * - Validate against external sources
 * - Approve or reject automated fixes
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api, internal } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface FundingIssue {
  id: Id<"fundingEvents">;
  companyName: string;
  amount: string;
  round: string;
  category: string;
  confidence: number;
  sources: string[];
  warnings?: string[];
  suggested?: string;
}

export function FundingDataReview() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFixModal, setShowFixModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<FundingIssue | null>(null);

  // Fetch scan results
  const scanResults = useQuery(api.scripts.fixAllFundingData.scanForIssues, {
    lookbackHours: 720, // 30 days
  });

  // Actions
  const fixSingle = useAction(api.scripts.fixAllFundingData.fixSingleEvent);
  const manualFix = useMutation(api.scripts.fixAllFundingData.manualFixCompanyName);

  const allIssues: FundingIssue[] = React.useMemo(() => {
    if (!scanResults) return [];

    const issues: FundingIssue[] = [];

    // Map scan results to unified format
    scanResults.issues.unknownCompany?.forEach((item: any) => {
      issues.push({
        id: item.id,
        companyName: item.companyName,
        amount: item.amount,
        round: item.round,
        category: "unknownCompany",
        confidence: item.confidence || 0,
        sources: item.sources || [],
      });
    });

    scanResults.issues.descriptivePrefix?.forEach((item: any) => {
      issues.push({
        id: item.id,
        companyName: item.companyName,
        amount: item.amount,
        round: item.round,
        category: "descriptivePrefix",
        confidence: 0.7,
        sources: [],
        suggested: item.suggested,
      });
    });

    scanResults.issues.lowConfidence?.forEach((item: any) => {
      issues.push({
        id: item.id,
        companyName: item.companyName,
        amount: item.amount,
        round: item.round,
        category: "lowConfidence",
        confidence: item.confidence || 0,
        sources: item.sources || [],
      });
    });

    scanResults.issues.singleSourceLargeRound?.forEach((item: any) => {
      issues.push({
        id: item.id,
        companyName: item.companyName,
        amount: item.amount,
        round: item.round,
        category: "singleSourceLarge",
        confidence: 0.6,
        sources: [item.source],
        warnings: ["Large round with single source - needs verification"],
      });
    });

    return issues;
  }, [scanResults]);

  const filteredIssues = React.useMemo(() => {
    let filtered = allIssues;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(issue => issue.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(issue =>
        issue.companyName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [allIssues, selectedCategory, searchQuery]);

  const handleAutoFix = async (issue: FundingIssue) => {
    try {
      const result = await fixSingle({
        fundingEventId: issue.id,
      });

      if (result.success) {
        alert(`✓ Fixed: "${result.oldName}" → "${result.newName}"`);
        // Refresh data
        window.location.reload();
      } else {
        alert(`✗ Fix failed: ${result.error}`);
      }
    } catch (error: any) {
      alert(`✗ Error: ${error.message}`);
    }
  };

  const handleManualFix = async (correctName: string, reasoning: string) => {
    if (!selectedIssue) return;

    try {
      await manualFix({
        fundingEventId: selectedIssue.id,
        correctCompanyName: correctName,
        reasoning,
      });

      alert(`✓ Manually fixed: "${selectedIssue.companyName}" → "${correctName}"`);
      setShowFixModal(false);
      setSelectedIssue(null);
      window.location.reload();
    } catch (error: any) {
      alert(`✗ Error: ${error.message}`);
    }
  };

  if (!scanResults) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Scanning funding data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Funding Data Review Dashboard
          </h1>
          <p className="text-gray-600">
            Review and fix data quality issues in funding records
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Scanned"
            value={scanResults.totalScanned}
            color="blue"
          />
          <StatsCard
            title="Total Issues"
            value={scanResults.totalIssues}
            color="red"
          />
          <StatsCard
            title="Unknown Companies"
            value={scanResults.issues.unknownCompany?.length || 0}
            color="orange"
          />
          <StatsCard
            title="Low Confidence"
            value={scanResults.issues.lowConfidence?.length || 0}
            color="yellow"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Company
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by company name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Issues ({allIssues.length})</option>
                <option value="unknownCompany">
                  Unknown Company ({scanResults.issues.unknownCompany?.length || 0})
                </option>
                <option value="descriptivePrefix">
                  Descriptive Prefix ({scanResults.issues.descriptivePrefix?.length || 0})
                </option>
                <option value="lowConfidence">
                  Low Confidence ({scanResults.issues.lowConfidence?.length || 0})
                </option>
                <option value="singleSourceLarge">
                  Single Source Large ({scanResults.issues.singleSourceLargeRound?.length || 0})
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Issues List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount / Round
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">
                          {issue.companyName}
                        </div>
                        {issue.suggested && (
                          <div className="text-xs text-green-600 mt-1">
                            Suggested: {issue.suggested}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{issue.amount}</div>
                      <div className="text-xs text-gray-500">{issue.round}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit ${getCategoryColor(issue.category)}`}>
                          {getCategoryLabel(issue.category)}
                        </span>
                        {issue.warnings?.map((warning, idx) => (
                          <div key={idx} className="text-xs text-amber-600">
                            ⚠️ {warning}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ConfidenceMeter confidence={issue.confidence} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleAutoFix(issue)}
                        className="text-blue-600 hover:text-blue-900 px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
                      >
                        Auto Fix
                      </button>
                      <button
                        onClick={() => {
                          setSelectedIssue(issue);
                          setShowFixModal(true);
                        }}
                        className="text-green-600 hover:text-green-900 px-3 py-1 border border-green-300 rounded hover:bg-green-50"
                      >
                        Manual Fix
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredIssues.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No issues found</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Fix Modal */}
      {showFixModal && selectedIssue && (
        <ManualFixModal
          issue={selectedIssue}
          onFix={handleManualFix}
          onClose={() => {
            setShowFixModal(false);
            setSelectedIssue(null);
          }}
        />
      )}
    </div>
  );
}

// Helper Components

function StatsCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    orange: "bg-orange-50 text-orange-700",
    yellow: "bg-yellow-50 text-yellow-700",
  }[color];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${colorClasses}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  let color = "bg-red-500";
  if (percentage >= 80) color = "bg-green-500";
  else if (percentage >= 60) color = "bg-yellow-500";
  else if (percentage >= 40) color = "bg-orange-500";

  return (
    <div className="flex items-center space-x-2">
      <div className="w-24 bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <span className="text-xs text-gray-600">{percentage}%</span>
    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    unknownCompany: "bg-red-100 text-red-800",
    descriptivePrefix: "bg-yellow-100 text-yellow-800",
    lowConfidence: "bg-orange-100 text-orange-800",
    singleSourceLarge: "bg-purple-100 text-purple-800",
  };
  return colors[category] || "bg-gray-100 text-gray-800";
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    unknownCompany: "Unknown Company",
    descriptivePrefix: "Prefix Contamination",
    lowConfidence: "Low Confidence",
    singleSourceLarge: "Single Source",
  };
  return labels[category] || category;
}

function ManualFixModal({
  issue,
  onFix,
  onClose,
}: {
  issue: FundingIssue;
  onFix: (correctName: string, reasoning: string) => void;
  onClose: () => void;
}) {
  const [correctName, setCorrectName] = useState(issue.suggested || issue.companyName);
  const [reasoning, setReasoning] = useState("");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Manual Fix</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Name
            </label>
            <div className="px-4 py-2 bg-gray-100 rounded text-gray-700 font-mono">
              {issue.companyName}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correct Company Name *
            </label>
            <input
              type="text"
              value={correctName}
              onChange={(e) => setCorrectName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter correct company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reasoning *
            </label>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Explain why this is the correct name..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Sources:</h4>
            <div className="space-y-1">
              {issue.sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-blue-600 hover:text-blue-800 truncate"
                >
                  {source}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (correctName.trim() && reasoning.trim()) {
                onFix(correctName.trim(), reasoning.trim());
              } else {
                alert("Please fill in all required fields");
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Fix
          </button>
        </div>
      </div>
    </div>
  );
}

export default FundingDataReview;
