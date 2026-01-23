/**
 * PR Suggestions Component
 * Displays automated pull request suggestions from industry monitoring
 */

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { GitPullRequest, CheckCircle, Clock, XCircle, ExternalLink, Lightbulb } from "lucide-react";

export function PRSuggestions() {
  const suggestions = useQuery(api.domains.monitoring.industryUpdatesEnhanced.getPRSuggestions, {
    status: undefined, // Show all statuses
    limit: 20,
  });

  if (!suggestions) {
    return (
      <div className="p-8 text-center text-[var(--text-secondary)]">
        Loading PR suggestions...
      </div>
    );
  }

  const pendingSuggestions = suggestions.filter((s: any) => s.status === "pending");
  const approvedSuggestions = suggestions.filter((s: any) => s.status === "approved");
  const implementedSuggestions = suggestions.filter((s: any) => s.status === "implemented");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <GitPullRequest className="w-6 h-6" />
          PR Suggestions
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Automated pull request suggestions based on industry updates
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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
        <div className="p-8 text-center text-[var(--text-secondary)]">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No PR suggestions yet</p>
          <p className="text-xs mt-2">Run the enhanced industry scan to generate suggestions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion: any) => (
            <PRCard key={suggestion._id} suggestion={suggestion} />
          ))}
        </div>
      )}
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
    <div className={`${bgColor} rounded-lg p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
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
    <div className="bg-[var(--bg-secondary)] rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            {suggestion.title}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {suggestion.description}
          </p>
        </div>
        {getStatusBadge(suggestion.status)}
      </div>

      {/* Changes */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">Key Changes:</h4>
        <ul className="space-y-1.5">
          {suggestion.changes.map((change: string, idx: number) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <span className="text-[var(--accent-primary)] mt-1">•</span>
              <span>{change}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Testing Checklist */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">Testing Checklist:</h4>
        <ul className="space-y-1.5">
          {suggestion.testing.map((test: string, idx: number) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <CheckCircle className="w-4 h-4 text-[var(--text-muted)] mt-0.5" />
              <span>{test}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>
          Created {new Date(suggestion.createdAt).toLocaleDateString()}
        </span>
        {suggestion.updateId && (
          <a
            href={`#industry-updates/${suggestion.updateId}`}
            className="flex items-center gap-1 text-[var(--accent-primary)] hover:underline"
          >
            View source update
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
