/**
 * PR Suggestions Component
 * Displays automated pull request suggestions from industry monitoring
 */

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { GitPullRequest, CheckCircle, Clock, XCircle, ExternalLink, Lightbulb } from "lucide-react";
import { PageHeroHeader } from "../../../shared/ui/PageHeroHeader";

export function PRSuggestions() {
  const suggestions = useQuery(api.domains.monitoring.industryUpdatesEnhanced.getPRSuggestions, {
    status: undefined, // Show all statuses
    limit: 20,
  });

  if (!suggestions) {
    return (
      <div className="nb-page-shell">
        <div className="nb-page-inner">
          <div className="nb-page-frame text-center text-content-secondary">
            Loading PR suggestions...
          </div>
        </div>
      </div>
    );
  }

  const pendingSuggestions = suggestions.filter((s: any) => s.status === "pending");
  const approvedSuggestions = suggestions.filter((s: any) => s.status === "approved");
  const implementedSuggestions = suggestions.filter((s: any) => s.status === "implemented");

  return (
    <div className="nb-page-shell">
      <div className="nb-page-inner">
        <div className="nb-page-frame space-y-6">
          {/* NOTE(coworker): Keep PR Suggestions in shared shell so side routes
              don't visually diverge from Workbench/Industry/For You. */}
          <PageHeroHeader
            icon={<GitPullRequest className="w-5 h-5" />}
            title="Pull Request Suggestions"
            subtitle="Automated pull request suggestions based on industry updates"
          />

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<Clock className="w-5 h-5 text-yellow-500" />}
              label="Pending"
              value={pendingSuggestions.length}
              color="yellow"
            />
            <StatCard
              icon={<CheckCircle className="w-5 h-5 text-green-500" />}
              label="Approved"
              value={approvedSuggestions.length}
              color="green"
            />
            <StatCard
              icon={<CheckCircle className="w-5 h-5 text-blue-500" />}
              label="Implemented"
              value={implementedSuggestions.length}
              color="blue"
            />
          </div>

          {/* Suggestions List */}
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-500/25 flex items-center justify-center mb-4">
                <Lightbulb className="w-8 h-8 text-indigo-500 dark:text-indigo-300" />
              </div>
              <p className="text-base font-semibold text-content mb-2">No suggestions yet</p>
              <p className="text-sm text-content-secondary max-w-sm mb-4">Suggestions are generated automatically when the enhanced industry scan detects relevant updates.</p>
              <button type="button" className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm">
                <Lightbulb className="w-4 h-4 flex-shrink-0" />
                Run an enhanced industry scan
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion: any) => (
                <PRCard key={suggestion._id} suggestion={suggestion} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "yellow" | "green" | "blue";
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const bgColor = {
    yellow: "bg-yellow-500/10",
    green: "bg-green-500/10",
    blue: "bg-blue-500/10",
  }[color];

  return (
    <div className={`${bgColor} rounded-lg border border-edge p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-content-secondary">{label}</span>
      </div>
      <div className="text-2xl font-bold text-content">{value}</div>
    </div>
  );
}

interface PRCardProps {
  suggestion: any;
}

function PRCard({ suggestion }: PRCardProps) {
  const getStatusBadge = (status: string) => {
    const configs = {
      pending: {
        icon: <Clock className="w-4 h-4" />,
        color: "bg-yellow-500/20 text-yellow-600",
        label: "Pending Review",
      },
      approved: {
        icon: <CheckCircle className="w-4 h-4" />,
        color: "bg-green-500/20 text-green-600",
        label: "Approved",
      },
      implemented: {
        icon: <CheckCircle className="w-4 h-4" />,
        color: "bg-blue-500/20 text-blue-600",
        label: "Implemented",
      },
      rejected: {
        icon: <XCircle className="w-4 h-4" />,
        color: "bg-red-500/20 text-red-600",
        label: "Rejected",
      },
    };

    const config = configs[status as keyof typeof configs] || configs.pending;

    return (
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${config.color}`}>
        {config.icon}
        {config.label}
      </div>
    );
  };

  return (
    <div className="nb-surface-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-content mb-1">
            {suggestion.title}
          </h3>
          <p className="text-sm text-content-secondary">
            {suggestion.description}
          </p>
        </div>
        {getStatusBadge(suggestion.status)}
      </div>

      {/* Changes */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-content">Key Changes:</h4>
        <ul className="space-y-1.5">
          {suggestion.changes.map((change: string, idx: number) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-content-secondary">
              <span className="text-indigo-600 dark:text-indigo-400 mt-1">•</span>
              <span>{change}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Testing Checklist */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-content">Testing Checklist:</h4>
        <ul className="space-y-1.5">
          {suggestion.testing.map((test: string, idx: number) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-content-secondary">
              <CheckCircle className="w-4 h-4 text-content-muted mt-0.5" />
              <span>{test}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-edge flex items-center justify-between text-xs text-content-muted">
        <span>
          Created {new Date(suggestion.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        {suggestion.updateId && (
          <a
            href={`#industry-updates/${suggestion.updateId}`}
            className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View source update
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
