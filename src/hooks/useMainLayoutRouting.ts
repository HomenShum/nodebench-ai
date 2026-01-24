import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Id } from '../../convex/_generated/dataModel';

export type MainView =
    | 'documents'
    | 'spreadsheets'
    | 'calendar'
    | 'roadmap'
    | 'timeline'
    | 'public'
    | 'agents'
    | 'research'
    | 'showcase'
    | 'footnotes'
    | 'signals'
    | 'benchmarks'
    | 'entity'
    | 'funding'
    | 'activity'
    | 'analytics-hitl'
    | 'analytics-components'
    | 'analytics-recommendations'
    | 'cost-dashboard'
    | 'industry-updates'
    | 'for-you-feed'
    | 'document-recommendations'
    | 'agent-marketplace'
    | 'github-explorer'
    | 'pr-suggestions';

interface UseMainLayoutRoutingReturn {
    currentView: MainView;
    setCurrentView: (view: MainView) => void;
    entityName: string | null;
    setEntityName: (name: string | null) => void;
    selectedSpreadsheetId: Id<"spreadsheets"> | null;
    setSelectedSpreadsheetId: (id: Id<"spreadsheets"> | null) => void;
    showResearchDossier: boolean;
    setShowResearchDossier: (show: boolean) => void;
    researchHubInitialTab: "overview" | "signals" | "briefing" | "deals" | "changes" | "changelog";
    setResearchHubInitialTab: (tab: "overview" | "signals" | "briefing" | "deals" | "changes" | "changelog") => void;
    isTransitioning: boolean;
    setIsTransitioning: (transitioning: boolean) => void;
}

export function useMainLayoutRouting(): UseMainLayoutRoutingReturn {
    const location = useLocation();

    function parsePathname(rawPathname: string): {
        view: MainView;
        entityName: string | null;
        spreadsheetId: string | null;
        showResearchDossier: boolean;
        researchTab: "overview" | "signals" | "briefing" | "deals" | "changes" | "changelog";
    } {
        const pathname = (rawPathname || '/').toLowerCase();
        if (pathname.startsWith('/agents')) return { view: 'agents', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/calendar')) return { view: 'calendar', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/roadmap')) return { view: 'roadmap', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/timeline')) return { view: 'timeline', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/signals')) return { view: 'signals', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/spreadsheets')) {
            const match = (rawPathname || '').match(/^\/spreadsheets[\/](.+)$/i);
            const id = match ? decodeURIComponent(match[1]) : null;
            return { view: 'spreadsheets', entityName: null, spreadsheetId: id, showResearchDossier: false, researchTab: "overview" };
        }
        if (pathname.startsWith('/documents') || pathname.startsWith('/docs')) return { view: 'documents', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/showcase') || pathname.startsWith('/demo')) return { view: 'showcase', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/footnotes') || pathname.startsWith('/sources')) return { view: 'footnotes', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/benchmarks') || pathname.startsWith('/eval')) return { view: 'benchmarks', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/funding') || pathname.startsWith('/funding-brief')) return { view: 'funding', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith("/onboarding")) return { view: "research", entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/activity') || pathname.startsWith('/public-activity')) return { view: 'activity', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/analytics/hitl')) return { view: 'analytics-hitl', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/analytics/components')) return { view: 'analytics-components', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/analytics/recommendations')) return { view: 'analytics-recommendations', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/cost') || pathname.startsWith('/dashboard/cost')) return { view: 'cost-dashboard', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/industry') || pathname.startsWith('/dashboard/industry')) return { view: 'industry-updates', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/for-you') || pathname.startsWith('/feed')) return { view: 'for-you-feed', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/recommendations') || pathname.startsWith('/discover')) return { view: 'document-recommendations', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/marketplace') || pathname.startsWith('/agent-marketplace')) return { view: 'agent-marketplace', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/github') || pathname.startsWith('/github-explorer')) return { view: 'github-explorer', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        if (pathname.startsWith('/pr-suggestions') || pathname.startsWith('/prs')) return { view: 'pr-suggestions', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };

        if (pathname.startsWith('/entity/') || pathname.startsWith('/entity%2f')) {
            const match = (rawPathname || '').match(/^\/entity[\/](.+)$/i);
            const name = match ? decodeURIComponent(match[1]) : null;
            return { view: 'entity', entityName: name, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
        }

        if (pathname.startsWith('/research') || pathname.startsWith('/hub')) {
            const tabMatch = pathname.match(/^\/(?:research|hub)\/(overview|signals|briefing|deals|changes|changelog)/);
            const tab = (tabMatch?.[1] as any) ?? "overview";
            return { view: 'research', entityName: null, spreadsheetId: null, showResearchDossier: true, researchTab: tab };
        }

        return { view: 'research', entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" };
    }

    const initialRoute = (() => {
        if (typeof window === 'undefined') {
            return { view: 'research' as const, entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" as const };
        }
        return parsePathname(location.pathname || '/');
    })();

    const [currentView, setCurrentView] = useState<MainView>(initialRoute.view);
    const [entityName, setEntityName] = useState<string | null>(initialRoute.entityName);
    const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<Id<"spreadsheets"> | null>(
        initialRoute.spreadsheetId ? (initialRoute.spreadsheetId as any) : null
    );
    const [showResearchDossier, setShowResearchDossier] = useState<boolean>(initialRoute.showResearchDossier);
    const [researchHubInitialTab, setResearchHubInitialTab] = useState<"overview" | "signals" | "briefing" | "deals" | "changes" | "changelog">(initialRoute.researchTab);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Sync main view with URL pathname
    useEffect(() => {
        try {
            const next = parsePathname(location.pathname || '/');
            setEntityName(next.entityName);
            setSelectedSpreadsheetId(next.spreadsheetId ? (next.spreadsheetId as any) : null);
            setResearchHubInitialTab(next.researchTab);
            setShowResearchDossier(next.showResearchDossier);
            setCurrentView(next.view);
        } catch {
            // ignore
        }
    }, [location.pathname]);

    return {
        currentView,
        setCurrentView,
        entityName,
        setEntityName,
        selectedSpreadsheetId,
        setSelectedSpreadsheetId,
        showResearchDossier,
        setShowResearchDossier,
        researchHubInitialTab,
        setResearchHubInitialTab,
        isTransitioning,
        setIsTransitioning,
    };
}
