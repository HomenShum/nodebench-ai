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

  return {
    // Data
    briefMemory: latestBriefMemory,
    executiveBrief,
    evidence,
    dashboardMetrics,
    sourceSummary,
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
