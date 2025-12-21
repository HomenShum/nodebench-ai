import { useMemo } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useBriefData } from './useBriefData';
import type { DailyBriefPayload } from '../types';

interface UsePersonalBriefOptions {
    historyDays?: number;
    dateString?: string;
}

export function usePersonalBrief(options: UsePersonalBriefOptions = {}) {
    const { historyDays, dateString } = options;
    const globalData = useBriefData({ historyDays, dateString });
    const { briefingDateString, briefMemory } = globalData;

    // 1. Fetch Personal Overlay
    const personalOverlay = useQuery(
        api.domains.research.dailyBriefPersonalOverlayQueries.getOverlayByDateString,
        briefingDateString ? { dateString: briefingDateString } : 'skip'
    );

    // 2. Fetch User Tasks (Due Today)
    const tasksToday = useQuery(
        api.domains.tasks.userEvents.listUserEventsDueToday,
        {}
    );

    // 3. Fetch Recent Documents
    const recentDocs = useQuery(
        api.domains.documents.documents.getRecentForMentions,
        { limit: 5 }
    );

    // 4. Ensure Overlay (Action to trigger generation if it doesn't exist)
    // Note: We don't auto-run this in the hook to avoid infinite loops, 
    // but provide it for the UI to trigger if personalOverlay is null.
    const ensureOverlay = useAction(api.domains.research.dailyBriefPersonalOverlay.ensurePersonalOverlay);

    // Aggregate results
    const personalizedContext = useMemo(() => {
        if (!personalOverlay) return null;

        // Map overlay features to Act-level implications
        const features = (personalOverlay as any).features || [];

        return {
            watchlist: features.filter((f: any) => f.type === 'watchlist_signal'),
            docLinks: features.filter((f: any) => f.type === 'doc_linking'),
            preferences: features.filter((f: any) => f.type === 'preference_followup'),
            passingFeatures: features.filter((f: any) => f.status === 'passing'),
        };
    }, [personalOverlay]);

    return {
        ...globalData,
        personalOverlay,
        personalizedContext,
        tasksToday,
        recentDocs,
        ensureOverlay,
        isPersonalLoading: personalOverlay === undefined || tasksToday === undefined || recentDocs === undefined
    };
}

export default usePersonalBrief;
