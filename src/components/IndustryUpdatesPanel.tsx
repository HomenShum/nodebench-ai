/**
 * Industry Updates Panel
 *
 * Displays recent updates from Anthropic, OpenAI, Google DeepMind, LangChain, and Vercel AI SDK.
 * Shows actionable insights and implementation suggestions.
 */

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  TrendingUp,
  ExternalLink,
  Lightbulb,
  Code,
  CheckCircle,
  AlertCircle,
  Filter,
} from "lucide-react";

export function IndustryUpdatesPanel() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const suggestions = useQuery(api.domains.monitoring.industryUpdates.getImplementationSuggestions);

  if (!suggestions) {
    return (
      <div className="p-8 text-center text-[var(--text-secondary)]">
        Loading industry updates...
      </div>
    );
  }

  const providers = ["anthropic", "openai", "google", "langchain", "vercel", "xai"];

  const providerLabels: Record<string, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    google: "Google DeepMind",
    langchain: "LangChain",
    vercel: "Vercel AI SDK",
    xai: "xAI",
  };

  const filteredSuggestions = selectedProvider
    ? suggestions.topSuggestions.filter((s: any) => s.provider === providerLabels[selectedProvider])
    : suggestions.topSuggestions;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Industry Updates
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Latest patterns from AI industry leaders • Updated daily
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {suggestions.totalNew} new updates
          </span>
        </div>
      </div>

      {/* Provider Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedProvider(null)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedProvider === null
                ? "bg-[var(--accent-primary)] text-white"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            All
          </button>
          {providers.map((provider) => (
            <button
              key={provider}
              onClick={() => setSelectedProvider(provider)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedProvider === provider
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {providerLabels[provider]}
              {suggestions.byProvider[providerLabels[provider]] && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-[var(--accent-primary)] text-white rounded text-xs">
                  {suggestions.byProvider[providerLabels[provider]].length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Updates List */}
      {filteredSuggestions.length === 0 ? (
        <div className="p-8 text-center text-[var(--text-secondary)]">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No updates found for this filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSuggestions.map((update: any) => (
            <UpdateCard key={update.id} update={update} />
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {suggestions.totalNew > 0 && (
        <div className="mt-8 p-4 bg-[var(--bg-secondary)] rounded-lg">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Summary by Provider
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {providers.map((provider) => {
              const count = suggestions.byProvider[providerLabels[provider]]?.length || 0;
              return (
                <div key={provider} className="text-center">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">
                    {count}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    {providerLabels[provider]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for update cards
interface UpdateCardProps {
  update: {
    id: string;
    provider: string;
    title: string;
    summary: string;
    relevance: number;
    actionableInsights: string[];
    implementationSuggestions: string[];
    url: string;
    scannedAt: number;
    status?: "new" | "reviewed" | "implemented";
  };
}

const UpdateCard = React.memo(function UpdateCard({ update }: UpdateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const markAsReviewed = useMutation(api.domains.monitoring.industryUpdates.markAsReviewed);
  const markAsImplemented = useMutation(api.domains.monitoring.industryUpdates.markAsImplemented);

  const handleMarkReviewed = async () => {
    setIsUpdating(true);
    try {
      await markAsReviewed({ findingId: update.id as any });
      toast.success("Marked as reviewed");
    } catch (error) {
      console.error("Failed to mark as reviewed:", error);
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkImplemented = async () => {
    setIsUpdating(true);
    try {
      await markAsImplemented({ findingId: update.id as any });
      toast.success("Marked as implemented");
    } catch (error) {
      console.error("Failed to mark as implemented:", error);
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const relevanceColor =
    update.relevance >= 80 ? "text-green-500" :
    update.relevance >= 60 ? "text-yellow-500" :
    "text-stone-500";

  const relevanceLabel =
    update.relevance >= 80 ? "High" :
    update.relevance >= 60 ? "Medium" :
    "Low";

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-[var(--accent-primary)] text-white text-xs font-medium rounded">
              {update.provider}
            </span>
            <div className={`flex items-center gap-1 ${relevanceColor}`}>
              <div className="w-2 h-2 rounded-full bg-current" />
              <span className="text-xs font-medium">{relevanceLabel} Relevance</span>
            </div>
            {update.status && update.status !== "new" && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                update.status === "implemented"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
              }`}>
                {update.status === "implemented" ? "✓ Implemented" : "✓ Reviewed"}
              </span>
            )}
            <span className="text-xs text-[var(--text-muted)]">
              {new Date(update.scannedAt).toLocaleDateString()}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {update.title}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {update.summary}
          </p>
        </div>
        <a
          href={update.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors"
        >
          View Source
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Actionable Insights */}
      {update.actionableInsights.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            Key Insights ({update.actionableInsights.length})
            <span className="ml-1">{expanded ? "▼" : "▶"}</span>
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1.5 ml-6">
              {update.actionableInsights.map((insight: string, idx: number) => (
                <li key={idx} className="text-sm text-[var(--text-secondary)] list-disc">
                  {insight}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Implementation Suggestions */}
      {expanded && update.implementationSuggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-2">
            <Code className="w-4 h-4" />
            Implementation Suggestions
          </div>
          <ul className="space-y-1.5 ml-6">
            {update.implementationSuggestions.map((suggestion: string, idx: number) => (
              <li key={idx} className="text-sm text-[var(--text-secondary)] list-disc">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {expanded && (
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={handleMarkReviewed}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            {isUpdating ? "Updating..." : "Mark as Reviewed"}
          </button>
          <button
            type="button"
            onClick={handleMarkImplemented}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Code className="w-4 h-4" />
            {isUpdating ? "Updating..." : "Mark as Implemented"}
          </button>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => prevProps.update.id === nextProps.update.id && prevProps.update.status === nextProps.update.status);

export default IndustryUpdatesPanel;
