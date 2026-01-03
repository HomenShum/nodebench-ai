"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Sparkline, SparkBars } from "./Sparkline";
import { GitBranch, Star, Clock, RefreshCw } from "lucide-react";

interface RepoStatsPanelProps {
  repoUrl: string;
  initialData?: any;
}

export const RepoStatsPanel: React.FC<RepoStatsPanelProps> = ({ repoUrl, initialData }) => {
  const statsQuery = useQuery(api.domains.research.repoStatsQueries.getRepoStats, { repoUrl });
  const stats = initialData ?? statsQuery;
  const refresh = useAction(api.domains.research.repoStats.refreshRepoStats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!repoUrl) return;
    if (stats && stats.fetchedAt) return;

    setIsRefreshing(true);
    refresh({ repoUrl })
      .catch((err) => {
        if (mounted) setError(err?.message ?? "Failed to load repo stats.");
      })
      .finally(() => {
        if (mounted) setIsRefreshing(false);
      });

    return () => {
      mounted = false;
    };
  }, [repoUrl, refresh, stats]);

  const starHistory = stats?.starHistory ?? [];
  const commitHistory = stats?.commitHistory ?? [];

  const starsPerDay = useMemo(() => {
    const recent = starHistory.slice(-7);
    if (!recent.length) return 0;
    const total = recent.reduce((sum, item) => sum + (item.delta ?? item.stars ?? 0), 0);
    return Math.round(total / recent.length);
  }, [starHistory]);

  const commitsPerWeek = useMemo(() => {
    const recent = commitHistory.slice(-4);
    if (!recent.length) return 0;
    const total = recent.reduce((sum, item) => sum + (item.commits ?? 0), 0);
    return Math.round(total / recent.length);
  }, [commitHistory]);

  const lastPush = stats?.pushedAt ? new Date(stats.pushedAt).toLocaleDateString("en-US") : "n/a";

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Repo Momentum</div>
          <div className="text-sm font-semibold text-stone-800">{stats?.repoFullName ?? "GitHub Repo"}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsRefreshing(true);
            refresh({ repoUrl, forceRefresh: true })
              .catch((err) => setError(err?.message ?? "Failed to refresh."))
              .finally(() => setIsRefreshing(false));
          }}
          className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700"
          aria-label="Refresh repo stats"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs text-stone-600">
        <div className="rounded-md border border-stone-100 bg-stone-50 p-2">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-400">
            <Star className="w-3 h-3" /> Stars/day
          </div>
          <div className="text-lg font-semibold text-stone-900">{starsPerDay}</div>
        </div>
        <div className="rounded-md border border-stone-100 bg-stone-50 p-2">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-400">
            <GitBranch className="w-3 h-3" /> Commits/wk
          </div>
          <div className="text-lg font-semibold text-stone-900">{commitsPerWeek}</div>
        </div>
        <div className="rounded-md border border-stone-100 bg-stone-50 p-2">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-400">
            <Clock className="w-3 h-3" /> Last push
          </div>
          <div className="text-sm font-semibold text-stone-900">{lastPush}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Star Velocity</div>
          <Sparkline
            data={starHistory.map((item: any) => item.delta ?? item.stars ?? 0)}
            stroke="#111827"
          />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Commit Velocity</div>
          <SparkBars
            data={commitHistory.map((item: any) => item.commits ?? 0)}
            color="#0f172a"
          />
        </div>
      </div>
    </div>
  );
};

export default RepoStatsPanel;
