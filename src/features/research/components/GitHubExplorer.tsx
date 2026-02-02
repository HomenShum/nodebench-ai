/**
 * GitHub Explorer Component
 * Trending repository discovery with Phoenix ML ranking
 */

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Github, Star, TrendingUp, Code, ExternalLink, Tag } from "lucide-react";

export function GitHubExplorer() {
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined);
  const trendingRepos = useQuery(api.domains.research.githubExplorer.getTrendingRepos, {
    language: selectedLanguage,
    limit: 20,
  });

  const languages = ["TypeScript", "Python", "Rust", "Go", "JavaScript"];

  if (!trendingRepos) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Github className="w-6 h-6" />
            GitHub Explorer
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Discover trending AI repositories ranked by Phoenix ML
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-[var(--bg-secondary)] rounded-lg p-5 space-y-3">
              <div className="h-5 bg-[var(--bg-tertiary)] rounded w-2/3" />
              <div className="h-4 bg-[var(--bg-tertiary)] rounded w-full" />
              <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Github className="w-6 h-6" />
          GitHub Explorer
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Discover trending AI repositories ranked by Phoenix ML
        </p>
      </div>

      {/* Language Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setSelectedLanguage(undefined)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            selectedLanguage === undefined
              ? "bg-[var(--accent-primary)] text-white"
              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          All Languages
        </button>
        {languages.map((language) => (
          <button
            key={language}
            type="button"
            onClick={() => setSelectedLanguage(language)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedLanguage === language
                ? "bg-[var(--accent-primary)] text-white"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {language}
          </button>
        ))}
      </div>

      {/* Repository List */}
      {trendingRepos.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Github className="w-8 h-8 text-[var(--text-secondary)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No repositories found</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto">
            {selectedLanguage ? `No trending ${selectedLanguage} repositories right now.` : "No trending repositories found."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trendingRepos.map((repo: any) => (
            <RepoCard key={repo._id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}

interface RepoCardProps {
  repo: any;
}

function RepoCard({ repo }: RepoCardProps) {
  const getPhoenixColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-blue-500";
    if (score >= 50) return "text-yellow-500";
    return "text-[var(--text-secondary)]";
  };

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-5 space-y-4 hover:bg-[var(--bg-tertiary)] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] flex items-center gap-2"
            >
              {repo.fullName}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
            {repo.description}
          </p>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-md text-sm font-medium ${getPhoenixColor(repo.phoenixScore)}`}>
          <TrendingUp className="w-4 h-4" />
          {repo.phoenixScore}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Code className="w-4 h-4" />
          <span>{repo.language}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Star className="w-4 h-4 text-yellow-500" />
          <span>{repo.stars.toLocaleString()}</span>
        </div>
        {repo.starGrowth7d > 0 && (
          <div className="flex items-center gap-1.5 text-green-500">
            <TrendingUp className="w-4 h-4" />
            <span>+{repo.starGrowth7d} (7d)</span>
          </div>
        )}
      </div>

      {/* Topics */}
      {repo.topics && repo.topics.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="w-4 h-4 text-[var(--text-secondary)]" />
          {repo.topics.slice(0, 5).map((topic: string) => (
            <span
              key={topic}
              className="px-2 py-1 bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] rounded"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Relevance Reason */}
      {repo.relevanceReason && (
        <div className="pt-3 border-t border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-muted)] italic">
            &ldquo;{repo.relevanceReason}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
