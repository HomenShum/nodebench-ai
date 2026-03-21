import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";
import {
  resolvePathToCockpitState,
  type MainView,
  type ResearchTab,
  type CockpitSurfaceId,
} from "@/lib/registry/viewRegistry";

export type { MainView, ResearchTab, CockpitSurfaceId };

interface UseCockpitRoutingReturn {
  currentView: MainView;
  currentSurface: CockpitSurfaceId;
  setCurrentView: (view: MainView) => void;
  setCurrentSurface: (surface: CockpitSurfaceId) => void;
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
  panel: string | null;
  runId: string | null;
  documentParam: string | null;
  workspaceParam: string | null;
  canonicalPath: string;
  isLegacyRedirect: boolean;
}

export function useCockpitRouting(): UseCockpitRoutingReturn {
  const location = useLocation();

  const parseLocation = (pathname: string, search: string) => {
    const resolved = resolvePathToCockpitState(pathname, search);
    return {
      view: resolved.view,
      surface: resolved.surfaceId,
      entityName: resolved.entityName,
      spreadsheetId: resolved.spreadsheetId,
      showResearchDossier: resolved.surfaceId === "research",
      researchTab: resolved.researchTab,
      panel: resolved.panel,
      runId: resolved.runId,
      documentParam: resolved.docId,
      workspaceParam: resolved.workspace,
      canonicalPath: resolved.canonicalPath,
      isLegacyRedirect: resolved.isLegacyRedirect,
    };
  };

  const initialRoute = (() => {
    if (typeof window === "undefined") {
      return {
        view: "control-plane" as MainView,
        surface: "ask" as CockpitSurfaceId,
        entityName: null,
        spreadsheetId: null,
        showResearchDossier: false,
        researchTab: "overview" as ResearchTab,
        panel: null,
        runId: null,
        documentParam: null,
        workspaceParam: null,
        canonicalPath: "/?surface=ask",
        isLegacyRedirect: false,
      };
    }
    return parseLocation(location.pathname || "/", location.search || "");
  })();

  const [currentView, setCurrentView] = useState<MainView>(initialRoute.view);
  const [currentSurface, setCurrentSurface] = useState<CockpitSurfaceId>(initialRoute.surface);
  const [entityName, setEntityName] = useState<string | null>(initialRoute.entityName);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<Id<"spreadsheets"> | null>(
    initialRoute.spreadsheetId ? (initialRoute.spreadsheetId as Id<"spreadsheets">) : null,
  );
  const [showResearchDossier, setShowResearchDossier] = useState<boolean>(initialRoute.showResearchDossier);
  const [researchHubInitialTab, setResearchHubInitialTab] = useState<ResearchTab>(initialRoute.researchTab);
  const [panel, setPanel] = useState<string | null>(initialRoute.panel);
  const [runId, setRunId] = useState<string | null>(initialRoute.runId);
  const [documentParam, setDocumentParam] = useState<string | null>(initialRoute.documentParam);
  const [workspaceParam, setWorkspaceParam] = useState<string | null>(initialRoute.workspaceParam);
  const [canonicalPath, setCanonicalPath] = useState<string>(initialRoute.canonicalPath);
  const [isLegacyRedirect, setIsLegacyRedirect] = useState<boolean>(initialRoute.isLegacyRedirect);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const next = parseLocation(location.pathname || "/", location.search || "");
    setEntityName(next.entityName);
    setSelectedSpreadsheetId(next.spreadsheetId ? (next.spreadsheetId as Id<"spreadsheets">) : null);
    setResearchHubInitialTab(next.researchTab);
    setShowResearchDossier(next.showResearchDossier);
    setCurrentView(next.view);
    setCurrentSurface(next.surface);
    setPanel(next.panel);
    setRunId(next.runId);
    setDocumentParam(next.documentParam);
    setWorkspaceParam(next.workspaceParam);
    setCanonicalPath(next.canonicalPath);
    setIsLegacyRedirect(next.isLegacyRedirect);
  }, [location.pathname, location.search]);

  return {
    currentView,
    currentSurface,
    setCurrentView,
    setCurrentSurface,
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
    panel,
    runId,
    documentParam,
    workspaceParam,
    canonicalPath,
    isLegacyRedirect,
  };
}

interface CockpitSurfaceFromUrl {
  surfaceId: CockpitSurfaceId;
  entityName: string | null;
  documentId: string | null;
  runId: string | null;
}

export function useCockpitSurfaceFromUrl(): CockpitSurfaceFromUrl {
  const location = useLocation();

  const [state, setState] = useState<CockpitSurfaceFromUrl>(() => {
    const params = new URLSearchParams(location.search);
    return {
      surfaceId: (params.get("surface") as CockpitSurfaceId) || "ask",
      entityName: params.get("entity"),
      documentId: params.get("doc"),
      runId: params.get("run"),
    };
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setState({
      surfaceId: (params.get("surface") as CockpitSurfaceId) || "ask",
      entityName: params.get("entity"),
      documentId: params.get("doc"),
      runId: params.get("run"),
    });
  }, [location.search]);

  return state;
}
