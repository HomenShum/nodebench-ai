/**
 * useBriefData - Centralized morning brief data fetching
 *
 * Provides:
 * - Latest brief memory from Convex
 * - Executive brief record (3-Act structure)
 * - Dashboard metrics
 * - Historical snapshots
 */

import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { DailyBriefPayload, ExecutiveBriefRecord } from '../types';

interface UseBriefDataOptions {
  /** Number of historical days to fetch */
  historyDays?: number;
}

export function useBriefData(options: UseBriefDataOptions = {}) {
  const { historyDays = 7 } = options;

  // Fetch latest brief memory
  const latestBriefMemory = useQuery(api.domains.research.dailyBriefMemoryQueries.getLatestMemory);

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

  // Extract executive brief from memory context
  const executiveBrief = useMemo<DailyBriefPayload | null>(() => {
    const memory = latestBriefMemory as any;
    if (!memory?.context) return null;

    // Try structured record first
    const record = memory.context.executiveBriefRecord as ExecutiveBriefRecord | undefined;
    if (record?.status === 'valid' && record.brief) {
      return record.brief;
    }

    // Fall back to legacy fields
    return memory.context.executiveBrief ?? memory.context.generatedBrief ?? null;
  }, [latestBriefMemory]);

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

    if (record?.status === 'valid' && Array.isArray(record.evidence)) {
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
    deltas,
    taskResults: latestBriefTaskResults,

    // Dates
    briefingDateString,
    availableDates,
    historySnapshots: dashboardHistory,

    // Loading
    isLoading,
    isHistoryLoading,
  };
}

export default useBriefData;
