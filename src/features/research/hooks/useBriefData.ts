/**
 * useBriefData - Centralized morning brief data fetching
 *
 * Provides:
 * - Latest brief memory from Convex
 * - Executive brief record (3-Act structure)
 * - Dashboard metrics
 * - Historical snapshots
 * - Fallback sample data when no real data exists
 */

import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { DailyBriefPayload, ExecutiveBriefRecord } from '../types';

/**
 * Sample executive brief for demo/fallback purposes
 * Used when no real brief data exists in the database
 */
function createSampleBrief(dateString: string): DailyBriefPayload {
  return {
    meta: {
      date: dateString,
      headline: 'The Morning Dossier — Executive Brief',
      summary: 'Today\'s intelligence brief distills the most salient signals into evidence-backed narratives and actionable follow-ups.',
      confidence: 75,
      version: 1,
    },
    actI: {
      title: 'Act I: Setup — Coverage & Freshness',
      headline: 'AI Infrastructure Momentum Continues',
      synthesis: 'Today\'s intelligence landscape reveals sustained momentum in AI infrastructure development, with particular emphasis on agent reliability and autonomous systems. Coverage spans multiple high-signal sources including ArXiv research papers, GitHub trending repositories, and YCombinator discussions. The mix indicates concentrated attention on practical AI deployment challenges.',
      stats: {
        'Total Sources': '62',
        'AI/ML Papers': '33',
        'Trending Repos': '21',
      },
      topSources: [
        { name: 'ArXiv', count: 33 },
        { name: 'GitHub', count: 21 },
        { name: 'YCombinator', count: 8 },
      ],
      totalItems: 62,
      sourcesCount: 3,
    },
    actII: {
      title: 'Act II: Rising Action — Signals',
      synthesis: 'The feed clusters around a handful of high-signal stories. The signals below are selected for breadth of impact and evidence strength, not just raw engagement.',
      signals: [
        {
          id: 'sig-agent-reliability',
          headline: 'Agent Reliability Benchmarks Show 4+ Hour Task Horizons',
          synthesis: 'New benchmarks from METR demonstrate that frontier models like Claude Opus 4.5 can now maintain coherent task execution for nearly 5 hours, a significant leap from previous 30-minute horizons. This has profound implications for autonomous agent deployment in production environments.',
          evidence: [
            {
              id: 'ev-metr-benchmark',
              source: 'YCombinator',
              title: 'Measuring AI Ability to Complete Long Tasks: Opus 4.5 has 50% horizon of 4h49M',
              url: 'https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/',
              publishedAt: new Date().toISOString(),
              relevance: 'Primary source for agent task duration benchmarks',
              score: 22,
            },
          ],
        },
        {
          id: 'sig-reasoning-models',
          headline: 'Universal Reasoning Models Achieve ARC-AGI Breakthroughs',
          synthesis: 'Research on Universal Transformers reveals that improvements on ARC-AGI benchmarks primarily arise from recurrent computation patterns rather than scale alone. This suggests a path toward more sample-efficient reasoning systems.',
          evidence: [
            {
              id: 'ev-universal-reasoning',
              source: 'ArXiv',
              title: 'Universal Reasoning Model',
              url: 'https://arxiv.org/abs/2512.14693v1',
              publishedAt: new Date().toISOString(),
              relevance: 'Systematic analysis of Universal Transformer variants',
              score: 82,
            },
          ],
        },
        {
          id: 'sig-multimodal-grounding',
          headline: 'Video Understanding Gets Temporal Precision',
          synthesis: 'TimeLens establishes a new baseline for video temporal grounding with multimodal LLMs, addressing a core capability gap in video understanding. The approach enables precise moment localization within long-form video content.',
          evidence: [
            {
              id: 'ev-timelens',
              source: 'ArXiv',
              title: 'TimeLens: Rethinking Video Temporal Grounding with Multimodal LLMs',
              url: 'https://arxiv.org/abs/2512.14698v1',
              publishedAt: new Date().toISOString(),
              relevance: 'Establishes baseline for video temporal grounding',
              score: 59,
            },
          ],
        },
      ],
    },
    actIII: {
      title: 'Act III: Deep Dives — Actions',
      synthesis: 'The follow-ups below convert today\'s signals into concrete investigations. Prioritize the items with highest leverage on near-term decisions.',
      actions: [
        {
          id: 'act-agent-deployment',
          title: 'Evaluate Long-Horizon Agent Deployment',
          headline: 'Evaluate Long-Horizon Agent Deployment',
          description: 'With 5-hour task horizons now achievable, assess which internal workflows could benefit from autonomous agent execution. Focus on repetitive research and data processing tasks.',
          rationale: 'With 5-hour task horizons now achievable, assess which internal workflows could benefit from autonomous agent execution.',
          priority: 'high',
          linkedSignalIds: ['sig-agent-reliability'],
        },
        {
          id: 'act-reasoning-integration',
          title: 'Prototype Universal Reasoning Integration',
          headline: 'Prototype Universal Reasoning Integration',
          description: 'The recurrent computation patterns in Universal Transformers suggest potential for more efficient reasoning. Prototype integration with existing analysis pipelines.',
          rationale: 'The recurrent computation patterns in Universal Transformers suggest potential for more efficient reasoning.',
          priority: 'medium',
          linkedSignalIds: ['sig-reasoning-models'],
        },
      ],
    },
    dashboard: {
      vizArtifact: {
        intent: 'category_compare',
        rationale: 'Source volume provides a quick read on where attention is concentrated today.',
        data: [
          { source: 'ArXiv', count: 33 },
          { source: 'GitHub', count: 21 },
          { source: 'YCombinator', count: 8 },
        ],
        spec: {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          width: 'container',
          height: 160,
          mark: 'bar',
          encoding: {
            y: { field: 'source', type: 'nominal', sort: '-x', axis: { title: null } },
            x: { field: 'count', type: 'quantitative', axis: { title: 'Items' } },
            color: { field: 'source', legend: null },
          },
        },
      },
      sourceBreakdown: {
        ArXiv: 33,
        GitHub: 21,
        YCombinator: 8,
      },
      trendingTags: ['Research', 'AI', 'ML', 'Trending', 'Tech'],
    },
  } as DailyBriefPayload;
}

interface UseBriefDataOptions {
  /** Number of historical days to fetch */
  historyDays?: number;
  /** Specific date to fetch (YYYY-MM-DD) */
  dateString?: string;
}

export function useBriefData(options: UseBriefDataOptions = {}) {
  const { historyDays = 7, dateString } = options;

  // Fetch target brief memory (either by date or latest)
  const latestBriefMemory = useQuery(
    dateString
      ? api.domains.research.dailyBriefMemoryQueries.getMemoryByDateString
      : api.domains.research.dailyBriefMemoryQueries.getLatestMemory,
    dateString ? { dateString } : {}
  );

  // Fetch task results for the latest memory
  const latestBriefTaskResults = useQuery(
    api.domains.research.dailyBriefMemoryQueries.listTaskResultsByMemory,
    latestBriefMemory ? { memoryId: latestBriefMemory._id } : 'skip'
  );

  // Fetch historical snapshots
  const dashboardHistory = useQuery(
    api.domains.research.dashboardQueries.getHistoricalSnapshots,
    { days: historyDays }
  );

  // Loading states
  const isLoading = latestBriefMemory === undefined;
  const isHistoryLoading = dashboardHistory === undefined;

  // Current date for fallback
  const todayDateString = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Extract executive brief from memory context, with sample fallback
  const { executiveBrief, isUsingFallback } = useMemo<{ executiveBrief: DailyBriefPayload | null; isUsingFallback: boolean }>(() => {
    const memory = latestBriefMemory as any;

    // Try structured record first
    if (memory?.context) {
      const record = memory.context.executiveBriefRecord as ExecutiveBriefRecord | undefined;
      if (record?.status === 'valid' && record.brief) {
        return { executiveBrief: record.brief, isUsingFallback: false };
      }

      // Fall back to legacy fields
      const legacy = memory.context.executiveBrief ?? memory.context.generatedBrief;
      if (legacy) {
        return { executiveBrief: legacy, isUsingFallback: false };
      }
    }

    // If we have a memory but no brief, or no memory at all after loading,
    // use sample data so the UI is never empty
    if (latestBriefMemory !== undefined) {
      const dateToUse = (latestBriefMemory as any)?.dateString ?? todayDateString;
      return { executiveBrief: createSampleBrief(dateToUse), isUsingFallback: true };
    }

    return { executiveBrief: null, isUsingFallback: false };
  }, [latestBriefMemory, todayDateString]);

  // Available brief dates
  const availableDates = useMemo(() => {
    const snapshots = Array.isArray(dashboardHistory) ? dashboardHistory : [];
    const unique = [...new Set(snapshots.map((s: any) => s?.dateString).filter(Boolean))] as string[];
    return unique.sort().reverse();
  }, [dashboardHistory]);

  // Current briefing date
  const briefingDateString = useMemo(() => {
    const memoryDate = (latestBriefMemory as any)?.dateString;
    if (memoryDate && availableDates.includes(memoryDate)) {
      return memoryDate;
    }
    return availableDates[0] ?? memoryDate ?? null;
  }, [latestBriefMemory, availableDates]);

  // Extract evidence from brief
  const evidence = useMemo(() => {
    const memory = latestBriefMemory as any;
    const record = memory?.context?.executiveBriefRecord as ExecutiveBriefRecord | undefined;

    if (Array.isArray(record?.evidence) && record.evidence.length > 0) {
      return record.evidence;
    }

    // Extract from signals
    if (!executiveBrief?.actII?.signals?.length) return [];
    return executiveBrief.actII.signals.flatMap(signal =>
      Array.isArray(signal.evidence) ? signal.evidence : []
    );
  }, [latestBriefMemory, executiveBrief]);

  // Dashboard metrics
  const dashboardMetrics = useMemo(() => {
    const memory = latestBriefMemory as any;
    return memory?.context?.dashboardMetrics ?? null;
  }, [latestBriefMemory]);

  // Source summary
  const sourceSummary = useMemo(() => {
    const memory = latestBriefMemory as any;
    return memory?.context?.sourceSummary ?? null;
  }, [latestBriefMemory]);

  const coverageSummaries = useMemo(() => {
    const memory = latestBriefMemory as any;
    return memory?.context?.coverageSummaries ?? null;
  }, [latestBriefMemory]);

  const coverageRollup = useMemo(() => {
    const memory = latestBriefMemory as any;
    return memory?.context?.coverageRollup ?? null;
  }, [latestBriefMemory]);

  // Temporal deltas (today vs. yesterday)
  const deltas = useMemo(() => {
    if (!dashboardMetrics || !dashboardHistory || dashboardHistory.length < 2) {
      return null;
    }

    const today = dashboardMetrics;
    const yesterday = (dashboardHistory[1] as any)?.dashboardMetrics;

    if (!yesterday) return null;

    // Calculate deltas for key metrics
    const calcDelta = (todayVal: number | undefined, yesterdayVal: number | undefined) => {
      if (todayVal === undefined || yesterdayVal === undefined) return null;
      return todayVal - yesterdayVal;
    };

    return {
      // Key stats deltas
      keyStats: today.keyStats?.map((stat: any, i: number) => {
        const yesterdayStat = yesterday.keyStats?.[i];
        const todayValue = parseFloat(stat.value?.replace(/[^0-9.-]/g, '')) || 0;
        const yesterdayValue = parseFloat(yesterdayStat?.value?.replace(/[^0-9.-]/g, '')) || 0;
        return {
          label: stat.label,
          delta: todayValue - yesterdayValue
        };
      }) ?? [],
      // Tech readiness deltas
      techReadiness: {
        existing: calcDelta(today.techReadiness?.existing, yesterday.techReadiness?.existing),
        emerging: calcDelta(today.techReadiness?.emerging, yesterday.techReadiness?.emerging),
        sciFi: calcDelta(today.techReadiness?.sciFi, yesterday.techReadiness?.sciFi),
      },
      // Capabilities deltas
      capabilities: today.capabilities?.map((cap: any, i: number) => {
        const yesterdayCap = yesterday.capabilities?.[i];
        return {
          label: cap.label,
          delta: calcDelta(cap.score, yesterdayCap?.score)
        };
      }) ?? []
    };
  }, [dashboardMetrics, dashboardHistory]);

  return {
    // Data
    briefMemory: latestBriefMemory,
    executiveBrief,
    evidence,
    dashboardMetrics,
    sourceSummary,
    coverageSummaries,
    coverageRollup,
    deltas,
    taskResults: latestBriefTaskResults,

    // Dates
    briefingDateString,
    availableDates,
    historySnapshots: dashboardHistory,

    // Loading & Fallback
    isLoading,
    isHistoryLoading,
    isUsingFallback,
  };
}

export default useBriefData;
