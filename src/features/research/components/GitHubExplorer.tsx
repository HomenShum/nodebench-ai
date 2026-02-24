/**
 * GitHub Explorer Component
 * Trending repository discovery with Phoenix ML ranking
 */

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Github, Star, TrendingUp, Code, ExternalLink, Tag } from "lucide-react";
import { PageHeroHeader } from "../../../shared/ui/PageHeroHeader";

export function GitHubExplorer() {
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined);
  const trendingRepos = useQuery(api.domains.research.githubExplorer.getTrendingRepos, {
    language: selectedLanguage,
    limit: 20,
  });

  const languages = ["TypeScript", "Python", "Rust", "Go", "JavaScript"];

  if (!trendingRepos) {
    return (
      <div className="nb-page-shell">
        <div className="nb-page-inner">
          <div className="nb-page-frame space-y-6">
            <PageHeroHeader
              icon={<Github className="w-5 h-5" />}
              title="GitHub Explorer"
              subtitle="Discover trending AI repositories ranked by Phoenix ML"
            />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="nb-surface-card p-5 space-y-3 no-skeleton-animation" aria-busy="true">
                  <div className="h-5 bg-surface-secondary rounded w-2/3" />
                  <div className="h-4 bg-surface-secondary rounded w-full" />
                  <div className="h-3 bg-surface-secondary rounded w-1/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-page-shell">
      <div className="nb-page-inner">
        <div className="nb-page-frame space-y-6">
          {/* NOTE(coworker): Keep this route on shared page-shell primitives to
              match Vercel/Linear rhythm used by Workbench and analytics views. */}
          <PageHeroHeader
            icon={<Github className="w-5 h-5" />}
            title="GitHub Explorer"
            subtitle="Discover trending AI repositories ranked by Phoenix ML"
          />

          {/* Language Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedLanguage(undefined)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                selectedLanguage === undefined
                  ? "bg-[var(--accent-primary)] text-white border-transparent"
                  : "bg-surface-secondary text-content-secondary border-edge hover:text-content hover:bg-surface"
              }`}
            >
              All Languages
            </button>
            {languages.map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => setSelectedLanguage(language)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                  selectedLanguage === language
                    ? "bg-[var(--accent-primary)] text-white border-transparent"
                    : "bg-surface-secondary text-content-secondary border-edge hover:text-content hover:bg-surface"
                }`}
              >
                {language}
              </button>
            ))}
          </div>

          {/* Repository List */}
          {trendingRepos.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-surface-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
                <Github className="w-8 h-8 text-content-secondary" />
              </div>
              <h3 className="text-base font-semibold text-content mb-1">No repositories found</h3>
              <p className="text-sm text-content-secondary max-w-xs mx-auto">
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
      </div>
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
    return "text-content-secondary";
  };

  return (
    <div className="nb-surface-card p-5 space-y-4 hover:border-content-muted/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-content hover:text-indigo-600 dark:text-indigo-400 flex items-center gap-2"
            >
              {repo.fullName}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-sm text-content-secondary line-clamp-2">
            {repo.description}
          </p>
        </div>
        <div
          className={`flex items-center gap-1 px-3 py-1.5 bg-surface-secondary rounded-md text-sm font-medium ${getPhoenixColor(repo.phoenixScore)}`}
          title={`Trending score: ${repo.phoenixScore}/100`}
        >
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs opacity-60 mr-0.5">Score</span>
          {repo.phoenixScore}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-1.5 text-content-secondary">
          <Code className="w-4 h-4" />
          <span>{repo.language}</span>
        </div>
        <div className="flex items-center gap-1.5 text-content-secondary">
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
          <Tag className="w-4 h-4 text-content-secondary" />
          {repo.topics.slice(0, 5).map((topic: string) => (
            <span
              key={topic}
              className="px-2 py-1 bg-surface-secondary text-xs text-content-secondary rounded"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Relevance Reason */}
      {repo.relevanceReason && (
        <div className="pt-3 border-t border-edge">
          <p className="text-xs text-content-muted italic">
            &ldquo;{repo.relevanceReason}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
