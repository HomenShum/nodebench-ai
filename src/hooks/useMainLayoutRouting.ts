import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Id } from '../../convex/_generated/dataModel';
import { resolvePathToView, type MainView, type ResearchTab } from '@/lib/viewRegistry';

// Re-export types so existing imports continue to work
export type { MainView, ResearchTab };

interface UseMainLayoutRoutingReturn {
    currentView: MainView;
    setCurrentView: (view: MainView) => void;
    entityName: string | null;
    setEntityName: (name: string | null) => void;
    selectedSpreadsheetId: Id<"spreadsheets"> | null;
    setSelectedSpreadsheetId: (id: Id<"spreadsheets"> | null) => void;
    showResearchDossier: boolean;
    setShowResearchDossier: (show: boolean) => void;
    researchHubInitialTab: ResearchTab;
    setResearchHubInitialTab: (tab: ResearchTab) => void;
    isTransitioning: boolean;
    setIsTransitioning: (transitioning: boolean) => void;
}

export function useMainLayoutRouting(): UseMainLayoutRoutingReturn {
    const location = useLocation();

    function parsePathname(rawPathname: string) {
        const resolved = resolvePathToView(rawPathname);
        const normalizedPathname = (rawPathname || '/').toLowerCase();
        const isResearchHubRoute =
            /^\/(?:research|hub)\/(?:overview|signals|briefing|deals|changes|changelog)(?:\/|$)/.test(normalizedPathname) ||
            normalizedPathname.startsWith('/onboarding');

        return {
            view: resolved.view,
            entityName: resolved.entityName,
            spreadsheetId: resolved.spreadsheetId,
            showResearchDossier: resolved.view === 'research' && isResearchHubRoute,
            researchTab: resolved.researchTab,
        };
    }

    const initialRoute = (() => {
        if (typeof window === 'undefined') {
            return { view: 'control-plane' as MainView, entityName: null, spreadsheetId: null, showResearchDossier: false, researchTab: "overview" as ResearchTab };
        }
        return parsePathname(location.pathname || '/');
    })();

    const [currentView, setCurrentView] = useState<MainView>(initialRoute.view);
    const [entityName, setEntityName] = useState<string | null>(initialRoute.entityName);
    const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<Id<"spreadsheets"> | null>(
        initialRoute.spreadsheetId ? (initialRoute.spreadsheetId as Id<"spreadsheets">) : null
    );
    const [showResearchDossier, setShowResearchDossier] = useState<boolean>(initialRoute.showResearchDossier);
    const [researchHubInitialTab, setResearchHubInitialTab] = useState<ResearchTab>(initialRoute.researchTab);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Sync main view with URL pathname
    useEffect(() => {
        try {
            const next = parsePathname(location.pathname || '/');
            setEntityName(next.entityName);
            setSelectedSpreadsheetId(next.spreadsheetId ? (next.spreadsheetId as Id<"spreadsheets">) : null);
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
