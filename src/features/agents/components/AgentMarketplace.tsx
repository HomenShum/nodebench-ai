/**
 * Agent Marketplace Component
 * Ranked agent discovery using Phoenix ML
 */

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Zap, TrendingUp, CheckCircle, Clock, Play, GitFork, Heart, Share2 } from "lucide-react";

export function AgentMarketplace() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const rankedAgents = useQuery(api.domains.agents.agentMarketplace.getRankedAgents, {
    category: selectedCategory,
    limit: 20,
  });

  const categories = ["research", "synthesis", "publishing", "validation", "agentLoop"];

  if (!rankedAgents) {
    return (
      <div className="p-8 text-center text-[var(--text-secondary)]">
        Loading agent marketplace...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Zap className="w-6 h-6" />
          Agent Marketplace
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Discover top-performing agents ranked by success rate and usage
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setSelectedCategory(undefined)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            selectedCategory === undefined
              ? "bg-[var(--accent-primary)] text-white"
              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          All Categories
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              selectedCategory === category
                ? "bg-[var(--accent-primary)] text-white"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Agent List */}
      {rankedAgents.length === 0 ? (
        <div className="p-8 text-center text-[var(--text-secondary)]">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No agents found for this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rankedAgents.map((agent: any, index: number) => (
            <AgentCard key={agent._id} agent={agent} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface AgentCardProps {
  agent: any;
  rank: number;
}

function AgentCard({ agent, rank }: AgentCardProps) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-stone-400";
    if (rank === 3) return "text-orange-600";
    return "text-[var(--text-secondary)]";
  };

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${getRankColor(rank)}`}>
            #{rank}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] capitalize">
              {agent.agentType} Agent
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              ID: {agent.agentId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-md text-sm font-medium">
          <TrendingUp className="w-4 h-4" />
          {agent.phoenixScore}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-[var(--text-secondary)]">Success Rate</span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)]">
            {Math.round(agent.successRate * 100)}%
          </div>
        </div>

        <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Play className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-[var(--text-secondary)]">Total Runs</span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)]">
            {agent.usageCount.toLocaleString()}
          </div>
        </div>

        <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-[var(--text-secondary)]">Avg Latency</span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)]">
            {(agent.avgLatencyMs / 1000).toFixed(1)}s
          </div>
        </div>

        <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-[var(--text-secondary)]">Phoenix Score</span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)]">
            {agent.phoenixScore}
          </div>
        </div>
      </div>

      {/* Multi-Action Prediction */}
      {agent.multiActionPrediction && (
        <div className="pt-4 border-t border-[var(--border-color)]">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Engagement Prediction
          </h4>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-[var(--text-secondary)]" />
              <div>
                <div className="text-xs text-[var(--text-muted)]">Run</div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {Math.round(agent.multiActionPrediction.run * 100)}%
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4 text-[var(--text-secondary)]" />
              <div>
                <div className="text-xs text-[var(--text-muted)]">Fork</div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {Math.round(agent.multiActionPrediction.fork * 100)}%
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[var(--text-secondary)]" />
              <div>
                <div className="text-xs text-[var(--text-muted)]">Like</div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {Math.round(agent.multiActionPrediction.like * 100)}%
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[var(--text-secondary)]" />
              <div>
                <div className="text-xs text-[var(--text-muted)]">Share</div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {Math.round(agent.multiActionPrediction.share * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
