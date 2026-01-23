/**
 * Document Recommendations Component
 * Smart document discovery using Phoenix ML
 */

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Lightbulb, FileText, Sparkles, ThumbsUp } from "lucide-react";

export function DocumentRecommendations() {
  const recommendations = useQuery(api.domains.research.documentDiscovery.getDocumentRecommendations, {
    count: 10,
  });
  const recordEngagement = useMutation(api.domains.research.documentDiscovery.recordRecommendationEngagement);

  const handleClick = async (documentId: string) => {
    try {
      await recordEngagement({ documentId: documentId as any, action: "click" });
    } catch (error) {
      console.error("Failed to record engagement:", error);
    }
  };

  if (!recommendations) {
    return (
      <div className="p-8 text-center text-[var(--text-secondary)]">
        Loading recommendations...
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="p-8 text-center text-[var(--text-secondary)]">
        <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No recommendations yet. Create or save some documents to get started!</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Sparkles className="w-6 h-6" />
          Recommended for You
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Personalized document suggestions using Phoenix ML
        </p>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec: any) => (
          <RecommendationCard
            key={rec._id}
            recommendation={rec}
            onClick={() => handleClick(rec.documentId)}
          />
        ))}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: any;
  onClick: () => void;
}

function RecommendationCard({ recommendation, onClick }: RecommendationCardProps) {
  const sourceColors = {
    semantic: "bg-blue-500",
    trending: "bg-orange-500",
    collaborative: "bg-purple-500",
  };

  const sourceLabels = {
    semantic: "Similar to your interests",
    trending: "Trending now",
    collaborative: "Popular with others",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-3 hover:bg-[var(--bg-tertiary)] transition-colors text-left w-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <FileText className="w-5 h-5 text-[var(--accent-primary)] flex-shrink-0 mt-0.5" />
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 py-0.5 ${sourceColors[recommendation.source as keyof typeof sourceColors]} text-white text-xs font-medium rounded`}>
            {recommendation.phoenixScore}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h3 className="font-semibold text-[var(--text-primary)]">
          Document #{recommendation.documentId.slice(-6)}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
          {recommendation.relevanceReason}
        </p>
        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <Lightbulb className="w-3 h-3" />
          <span>{sourceLabels[recommendation.source as keyof typeof sourceLabels]}</span>
        </div>
      </div>

      {/* Engagement Prediction */}
      {recommendation.engagementPrediction && (
        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-color)] text-xs">
          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
            <ThumbsUp className="w-3 h-3" />
            <span>{Math.round(recommendation.engagementPrediction.click * 100)}% likely to open</span>
          </div>
        </div>
      )}
    </button>
  );
}
