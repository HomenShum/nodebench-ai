import { VIEW_MAP, type MainView, type ResearchTab } from "@/lib/registry/viewRegistry";

export interface ViewBreadcrumbItem {
  id: string;
  label: string;
  view?: MainView;
  path?: string;
  isCurrent: boolean;
}

const RESEARCH_TAB_LABELS: Record<ResearchTab, string> = {
  overview: "Overview",
  signals: "Signals",
  briefing: "Briefing",
  deals: "Deals",
  changes: "Changes",
  changelog: "Changelog",
};

export function buildViewBreadcrumbs(params: {
  currentView: MainView;
  researchHubInitialTab: ResearchTab;
}): ViewBreadcrumbItem[] {
  const { currentView, researchHubInitialTab } = params;

  if (currentView === "control-plane") return [];

  const current = VIEW_MAP[currentView];
  if (!current?.parentId) return [];

  const parent = VIEW_MAP[current.parentId];
  if (!parent) return [];

  return [
    {
      id: parent.id,
      label: parent.title,
      view: parent.id,
      path: parent.path,
      isCurrent: false,
    },
    {
      id: current.id,
      label: current.title,
      view: current.id,
      path: current.path,
      isCurrent: true,
    },
  ];
}
