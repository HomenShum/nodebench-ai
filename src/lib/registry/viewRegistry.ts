/**
 * viewRegistry.ts — Single source of truth for all view routing, metadata, and components.
 *
 * Adding a new view = adding ONE entry here. All consumers derive from this registry:
 *   - useMainLayoutRouting.ts (URL → view parsing)
 *   - MainLayout.tsx (VIEW_TITLES, VIEW_SUBTITLES, lazy component rendering)
 *   - CleanSidebar.tsx (navigation items)
 *   - cockpitModes.ts (mode groupings)
 *   - viewCapabilityRegistry.ts (WebMCP capabilities)
 *
 * Previously these were scattered across 6-8 files with ~200 hardcoded strings.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from "react";

// ─── MainView type (derived from registry at the bottom) ─────────────────────

/** All valid view keys. Generated from VIEW_REGISTRY. */
export type MainView =
  | "documents"
  | "spreadsheets"
  | "calendar"
  | "roadmap"
  | "timeline"
  | "public"
  | "agents"
  | "research"
  | "dogfood"
  | "showcase"
  | "footnotes"
  | "signals"
  | "benchmarks"
  | "entity"
  | "funding"
  | "activity"
  | "analytics-hitl"
  | "analytics-components"
  | "analytics-recommendations"
  | "cost-dashboard"
  | "industry-updates"
  | "for-you-feed"
  | "document-recommendations"
  | "agent-marketplace"
  | "github-explorer"
  | "pr-suggestions"
  | "linkedin-posts"
  | "mcp-ledger"
  | "engine-demo"
  | "observability"
  | "oracle"
  | "dev-dashboard"
  | "investigation"
  | "control-plane"
  | "receipts"
  | "delegation"
  | "product-direction"
  | "execution-trace";

export type ResearchTab = "overview" | "signals" | "briefing" | "deals" | "changes" | "changelog";

// ─── Route groups ────────────────────────────────────────────────────────────

/**
 * Route classification for navigation, sidebar rendering, and access control.
 *
 * - core:     Primary product surfaces — always visible in sidebar nav
 * - nested:   Sub-pages of core surfaces — accessed via tabs/links within a parent
 * - internal: Dev/admin routes — hidden from external users, shown in dev mode
 * - legacy:   Deprecated routes that redirect — never rendered directly
 */
export type RouteGroup = "core" | "nested" | "internal" | "legacy";

// ─── Registry entry shape ────────────────────────────────────────────────────

export interface ViewRegistryEntry {
  /** Unique view key — must match MainView union */
  id: MainView;
  /** Human-readable title shown in header chrome */
  title: string;
  /** Subtitle shown below title in header chrome */
  subtitle?: string;
  /** Canonical URL path (first entry is canonical, used for navigation) */
  path: string;
  /** Additional URL path aliases that also resolve to this view */
  aliases?: string[];
  /**
   * Lazy component factory. Returns the component to render for this view.
   * null = view has custom rendering logic in MainLayout (research, entity, spreadsheets).
   */
  component: LazyExoticComponent<ComponentType<any>> | null;
  /** Whether this view requires a dynamic segment (e.g. /entity/:name) */
  dynamic?: boolean;
  /** Route classification — determines sidebar visibility and navigation tier */
  group: RouteGroup;
  /** Whether this view appears in the primary sidebar navigation */
  navVisible: boolean;
  /** Parent view for nested routes — enables programmatic "back to parent" navigation */
  parentId?: MainView;
  /** For legacy routes: the view id to redirect to instead of rendering */
  redirectTo?: MainView;
}

// ─── Lazy component factories ────────────────────────────────────────────────

const lazyView = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
): LazyExoticComponent<ComponentType<any>> => lazy(importFn);

const lazyNamed = (
  importFn: () => Promise<Record<string, ComponentType<any>>>,
  name: string,
): LazyExoticComponent<ComponentType<any>> =>
  lazy(() => importFn().then((mod) => ({ default: (mod as any)[name] })));

// ─── The Registry ────────────────────────────────────────────────────────────

export const VIEW_REGISTRY: ViewRegistryEntry[] = [
  // ── Control Plane (landing) ──────────────────────────────────────────────
  {
    id: "control-plane",
    title: "DeepTrace",
    subtitle: "Agent trust control plane by NodeBench",
    path: "/",
    aliases: ["/control-plane", "/home", "/landing"],
    component: null, // Custom rendering in MainLayout (passes onNavigate)
    group: "core",
    navVisible: true,
  },
  {
    id: "receipts",
    title: "Action Receipts",
    subtitle: "Denied, approval-gated, and reversible records of what agents saw, did, and were allowed to do",
    path: "/receipts",
    aliases: ["/action-receipts", "/control-plane/receipts"],
    component: lazyView(() => import("@/features/controlPlane/views/ActionReceiptFeed")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
  },
  {
    id: "delegation",
    title: "Passport",
    subtitle: "Scoped permissions, approval gates, and trust boundaries before an agent acts",
    path: "/delegation",
    aliases: ["/delegate", "/passport", "/control-plane/delegation", "/control-plane/passport"],
    component: lazyView(() => import("@/features/controlPlane/views/DelegationShowcase")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
  },

  // ── Research & Intelligence ────────────────────────────────────────────────
  {
    id: "research",
    title: "Research Hub",
    subtitle: "Signals, briefings, and agent entry points",
    path: "/research",
    aliases: ["/hub"],
    component: null, // Custom rendering (CinematicHome / ResearchHub toggle)
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
  },
  {
    id: "product-direction",
    title: "Product Direction",
    subtitle: "Evidence-bounded memo for what a company should build next",
    path: "/product-direction",
    aliases: ["/strategy", "/strategy/product-direction", "/research/product-direction"],
    component: lazyView(() => import("@/features/strategy/views/ProductDirectionMemoView")),
    group: "nested",
    navVisible: false,
    parentId: "research",
  },
  {
    id: "execution-trace",
    title: "Execution Trace",
    subtitle: "Traceable record of search, edits, verification, and export",
    path: "/execution-trace",
    aliases: ["/workflow-trace", "/trace/execution"],
    component: lazyView(() => import("@/features/strategy/views/ExecutionTraceView")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
  },
  {
    id: "signals",
    title: "Signals",
    path: "/signals",
    component: lazyNamed(() => import("@/features/research/views/PublicSignalsLog"), "PublicSignalsLog"),
    group: "nested",
    navVisible: false,
    parentId: "research",
  },
  {
    id: "for-you-feed",
    title: "Suggested Signals",
    subtitle: "Personalized recommendations and priority signals",
    path: "/for-you",
    aliases: ["/feed"],
    component: lazyNamed(() => import("@/features/research/components/ForYouFeed"), "ForYouFeed"),
    group: "nested",
    navVisible: false,
    parentId: "research",
  },
  {
    id: "industry-updates",
    title: "Market Watch",
    subtitle: "Market movement and company updates",
    path: "/industry",
    aliases: ["/dashboard/industry"],
    component: lazyNamed(() => import("@/components/IndustryUpdatesPanel"), "IndustryUpdatesPanel"),
    group: "nested",
    navVisible: false,
    parentId: "research",
  },
  {
    id: "funding",
    title: "Funding",
    path: "/funding",
    aliases: ["/funding-brief"],
    component: lazyNamed(() => import("@/features/research/views/FundingBriefView"), "FundingBriefView"),
    group: "nested",
    navVisible: false,
    parentId: "research",
  },
  {
    id: "showcase",
    title: "Showcase",
    path: "/showcase",
    aliases: ["/demo"],
    component: null, // Custom rendering in MainLayout (passes onBack prop)
    group: "nested",
    navVisible: false,
    parentId: "research",
  },
  {
    id: "footnotes",
    title: "Sources",
    path: "/footnotes",
    aliases: ["/sources"],
    component: null, // Custom rendering in MainLayout (passes library/onBack props)
    group: "nested",
    navVisible: false,
    parentId: "research",
  },
  {
    id: "entity",
    title: "Entity",
    path: "/entity",
    component: lazyNamed(() => import("@/features/research/views/EntityProfilePage"), "EntityProfilePage"),
    dynamic: true,
    group: "nested",
    navVisible: false,
    parentId: "research",
  },
  {
    id: "benchmarks",
    title: "Run Benchmarks",
    subtitle: "Proof, replay, and receipts for agent runs",
    path: "/internal/benchmarks",
    aliases: ["/benchmarks", "/eval"],
    component: lazyNamed(() => import("@/features/benchmarks/views/WorkbenchView"), "WorkbenchView"),
    group: "internal",
    navVisible: false,
    parentId: "control-plane",
  },
  {
    id: "investigation",
    title: "Investigation",
    subtitle: "Investigate what the agent did, why it did it, and what evidence it used",
    path: "/investigation",
    aliases: ["/investigate", "/enterprise-demo"],
    component: lazyView(() => import("@/features/investigation/views/EnterpriseInvestigationView")),
    group: "core",
    navVisible: true,
  },

  // ── Workspace & Build ──────────────────────────────────────────────────────
  {
    id: "documents",
    title: "Workspace",
    subtitle: "Files, notes, and work in progress",
    path: "/workspace",
    aliases: ["/documents", "/docs"],
    component: lazyNamed(() => import("@/features/documents/components/DocumentsHomeHub"), "DocumentsHomeHub"),
    group: "core",
    navVisible: true,
  },
  {
    id: "spreadsheets",
    title: "Spreadsheets",
    path: "/spreadsheets",
    component: null, // Custom rendering (SpreadsheetsHub / SpreadsheetSheetView toggle)
    group: "nested",
    navVisible: false,
    parentId: "documents",
  },
  {
    id: "calendar",
    title: "Calendar",
    path: "/calendar",
    component: null, // Custom rendering in MainLayout (passes onDocumentSelect/onGridModeToggle)
    group: "nested",
    navVisible: false,
    parentId: "documents",
  },
  {
    id: "roadmap",
    title: "Roadmap",
    path: "/roadmap",
    component: null, // Shares TimelineRoadmapView with timeline
    group: "nested",
    navVisible: false,
    parentId: "documents",
  },
  {
    id: "timeline",
    title: "Timeline",
    path: "/timeline",
    component: null, // Shares TimelineRoadmapView with roadmap
    group: "nested",
    navVisible: false,
    parentId: "documents",
  },
  {
    id: "public",
    title: "Shared with You",
    path: "/public",
    aliases: ["/shared"],
    component: null, // Custom rendering in MainLayout (passes onDocumentSelect prop)
    group: "nested",
    navVisible: false,
    parentId: "documents",
  },
  {
    id: "document-recommendations",
    title: "Recommended Docs",
    subtitle: "Suggested reading and follow-up documents",
    path: "/recommendations",
    aliases: ["/discover"],
    component: lazyView(() => import("@/components/RecommendationCard").then((m) => ({ default: (m as any).DocumentRecommendations ?? m.default }))),
    group: "nested",
    navVisible: false,
    parentId: "documents",
  },

  // ── Agents & Automation ────────────────────────────────────────────────────
  {
    id: "agents",
    title: "Agent Workflows",
    subtitle: "Live agent threads and workflows",
    path: "/agents",
    component: lazyNamed(() => import("@/features/agents/views/AgentsHub"), "AgentsHub"),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
  },
  {
    id: "agent-marketplace",
    title: "Ready Workflows",
    subtitle: "Reusable agent flows and templates",
    path: "/marketplace",
    aliases: ["/agent-marketplace"],
    component: lazyNamed(() => import("@/features/agents/components/AgentMarketplace"), "AgentMarketplace"),
    group: "nested",
    navVisible: false,
    parentId: "agents",
  },
  {
    id: "activity",
    title: "Activity Stream",
    path: "/activity",
    aliases: ["/public-activity"],
    component: lazyNamed(() => import("@/features/agents/views/PublicActivityView"), "PublicActivityView"),
    group: "nested",
    navVisible: false,
    parentId: "agents",
  },
  {
    id: "mcp-ledger",
    title: "Tool Activity",
    subtitle: "Auditable tool calls and request traces",
    path: "/internal/mcp-ledger",
    aliases: ["/mcp-ledger", "/mcp/ledger", "/activity-log"],
    component: lazyNamed(() => import("@/features/mcp/views/McpToolLedgerView"), "McpToolLedgerView"),
    group: "internal",
    navVisible: false,
    parentId: "agents",
  },

  // ── Code & Social Intelligence ─────────────────────────────────────────────
  {
    id: "github-explorer",
    title: "Repo Tracking",
    subtitle: "Repository tracking and momentum",
    path: "/github",
    aliases: ["/github-explorer"],
    component: lazyNamed(() => import("@/features/research/components/GitHubExplorer"), "GitHubExplorer"),
    group: "nested",
    navVisible: false,
    parentId: "research",
  },
  {
    id: "pr-suggestions",
    title: "Review Pull Requests",
    subtitle: "Pull request review and engineering follow-up",
    path: "/pr-suggestions",
    aliases: ["/prs"],
    component: lazyNamed(() => import("@/features/monitoring/components/PRSuggestions"), "PRSuggestions"),
    group: "nested",
    navVisible: false,
    parentId: "research",
  },
  {
    id: "linkedin-posts",
    title: "Social Archive",
    subtitle: "Social output history and archive",
    path: "/linkedin",
    component: lazyNamed(() => import("@/features/social/views/LinkedInPostArchiveView"), "LinkedInPostArchiveView"),
    group: "nested",
    navVisible: false,
    parentId: "research",
  },

  // ── Analytics & System ─────────────────────────────────────────────────────
  {
    id: "analytics-hitl",
    title: "Review Queue",
    path: "/internal/analytics/hitl",
    aliases: ["/analytics/hitl", "/analytics/review-queue", "/review-queue"],
    component: lazyView(() => import("@/features/analytics/views/HITLAnalyticsDashboard")),
    group: "internal",
    navVisible: false,
    parentId: "control-plane",
  },
  {
    id: "analytics-components",
    title: "Performance Analytics",
    path: "/internal/analytics/components",
    aliases: ["/analytics/components"],
    component: lazyView(() => import("@/features/analytics/views/ComponentMetricsDashboard")),
    group: "internal",
    navVisible: false,
    parentId: "control-plane",
  },
  {
    id: "analytics-recommendations",
    title: "Feedback",
    path: "/internal/analytics/recommendations",
    aliases: ["/analytics/recommendations"],
    component: lazyNamed(() => import("@/features/analytics/views/RecommendationAnalyticsDashboard"), "default"),
    group: "internal",
    navVisible: false,
    parentId: "control-plane",
  },
  {
    id: "cost-dashboard",
    title: "Spend",
    subtitle: "Usage and spend trends",
    path: "/internal/cost",
    aliases: ["/cost", "/dashboard/cost"],
    component: lazyNamed(() => import("@/components/CostDashboard"), "CostDashboard"),
    group: "internal",
    navVisible: false,
    parentId: "control-plane",
  },
  {
    id: "dogfood",
    title: "Review Evidence",
    path: "/internal/dogfood",
    aliases: ["/dogfood", "/quality-review"],
    component: lazyNamed(() => import("@/features/dogfood/views/DogfoodReviewView"), "DogfoodReviewView"),
    group: "internal",
    navVisible: false,
    parentId: "control-plane",
  },
  {
    id: "observability",
    title: "System Health",
    subtitle: "System health, maintenance, and recovery loops",
    path: "/internal/observability",
    aliases: ["/observability", "/health", "/system-health"],
    component: lazyView(() => import("@/features/observability/views/ObservabilityView")),
    group: "internal",
    navVisible: false,
    parentId: "control-plane",
  },
  {
    id: "engine-demo",
    title: "Engine API",
    path: "/internal/engine",
    aliases: ["/engine", "/engine-demo"],
    component: lazyView(() => import("@/features/engine/views/EngineDemoView")),
    group: "internal",
    navVisible: false,
    parentId: "control-plane",
  },

  // ── Oracle ─────────────────────────────────────────────────────────────────
  {
    id: "oracle",
    title: "The Oracle",
    subtitle: "Operational memory and telemetry for long-running AI work",
    path: "/oracle",
    aliases: ["/career", "/trajectory"],
    component: lazyNamed(() => import("@/features/oracle/views/OracleView"), "OracleView"),
    group: "core",
    navVisible: true,
  },

  // ── Dev Dashboard ────────────────────────────────────────────────────────
  {
    id: "dev-dashboard",
    title: "Dev Dashboard",
    subtitle: "Repo evolution timeline, domain branches, and milestones",
    path: "/internal/dev-dashboard",
    aliases: ["/dev-dashboard", "/dev", "/evolution"],
    component: lazyView(() => import("@/features/devDashboard/DevDashboard")),
    group: "internal",
    navVisible: false,
    parentId: "control-plane",
  },
];

// ─── Derived lookup tables (computed once, used by all consumers) ─────────────

/** Map: view id → registry entry */
export const VIEW_MAP: Record<MainView, ViewRegistryEntry> = Object.fromEntries(
  VIEW_REGISTRY.map((entry) => [entry.id, entry]),
) as Record<MainView, ViewRegistryEntry>;

/** Map: view id → title */
export const VIEW_TITLES: Record<string, string> = Object.fromEntries(
  VIEW_REGISTRY.map((e) => [e.id, e.title]),
);

/** Map: view id → subtitle (only entries that have one) */
export const VIEW_SUBTITLES: Record<string, string> = Object.fromEntries(
  VIEW_REGISTRY.filter((e) => e.subtitle).map((e) => [e.id, e.subtitle!]),
);

/** Map: view id → canonical path */
export const VIEW_PATH_MAP: Partial<Record<MainView, string>> = Object.fromEntries(
  VIEW_REGISTRY.map((e) => [e.id, e.path]),
);

/**
 * Resolve a URL pathname to a MainView.
 * Replaces the 33-branch if-chain in useMainLayoutRouting.
 */
export function resolvePathToView(rawPathname: string): {
  view: MainView;
  entityName: string | null;
  spreadsheetId: string | null;
  researchTab: ResearchTab;
} {
  const normalized = (rawPathname || "/")
    .split("?")[0]
    .split("#")[0]
    .toLowerCase();
  const pathname = normalized !== "/" ? normalized.replace(/\/+$/, "") || "/" : "/";

  // Special cases requiring parameter extraction
  if (pathname.startsWith("/onboarding")) {
    return { view: "research", entityName: null, spreadsheetId: null, researchTab: "overview" };
  }

  if (pathname.startsWith("/entity/") || pathname.startsWith("/entity%2f")) {
    const match = (rawPathname || "").match(/^\/entity[\\/](.+)$/i);
    const name = match ? decodeURIComponent(match[1]) : null;
    return { view: "entity", entityName: name, spreadsheetId: null, researchTab: "overview" };
  }

  if (pathname.startsWith("/spreadsheets/")) {
    const match = (rawPathname || "").match(/^\/spreadsheets[\\/](.+)$/i);
    const id = match ? decodeURIComponent(match[1]) : null;
    return { view: "spreadsheets", entityName: null, spreadsheetId: id, researchTab: "overview" };
  }

  if (pathname.startsWith("/research") || pathname.startsWith("/hub")) {
    const tabMatch = pathname.match(
      /^\/(?:research|hub)\/(overview|signals|briefing|deals|changes|changelog)/,
    );
    const tab = (tabMatch?.[1] as ResearchTab | undefined) ?? "overview";
    return { view: "research", entityName: null, spreadsheetId: null, researchTab: tab };
  }

  // General matching: longest path wins. Never let "/" swallow all routes.
  const candidates = VIEW_REGISTRY
    .filter((entry) => !["research", "entity", "spreadsheets"].includes(entry.id))
    .flatMap((entry) => [entry.path, ...(entry.aliases ?? [])].map((path) => ({ view: entry.id, path })))
    .sort((a, b) => b.path.length - a.path.length);

  for (const candidate of candidates) {
    if (candidate.path === "/") {
      if (pathname === "/") {
        return { view: candidate.view, entityName: null, spreadsheetId: null, researchTab: "overview" };
      }
      continue;
    }

    if (pathname === candidate.path || pathname.startsWith(candidate.path + "/")) {
      return { view: candidate.view, entityName: null, spreadsheetId: null, researchTab: "overview" };
    }
  }

  // Default view — landing page
  return { view: "control-plane", entityName: null, spreadsheetId: null, researchTab: "overview" };
}

/** All view IDs (for type checking and iteration) */
export const ALL_VIEW_IDS: MainView[] = VIEW_REGISTRY.map((e) => e.id);

// ─── Route group derived sets (replace hardcoded sets in MainLayout/CleanSidebar) ──

/** Map: group → set of view ids in that group */
export const GROUP_VIEW_MAP: Record<RouteGroup, Set<MainView>> = VIEW_REGISTRY.reduce(
  (acc, entry) => {
    acc[entry.group].add(entry.id);
    return acc;
  },
  { core: new Set<MainView>(), nested: new Set<MainView>(), internal: new Set<MainView>(), legacy: new Set<MainView>() },
);

/** Views visible in primary sidebar navigation */
export const NAV_VISIBLE_VIEWS: Set<MainView> = new Set(
  VIEW_REGISTRY.filter((e) => e.navVisible).map((e) => e.id),
);

/** Map: parent view id → set of child view ids */
export const CHILDREN_MAP: Partial<Record<MainView, Set<MainView>>> = VIEW_REGISTRY.reduce(
  (acc, entry) => {
    if (entry.parentId) {
      if (!acc[entry.parentId]) acc[entry.parentId] = new Set<MainView>();
      acc[entry.parentId]!.add(entry.id);
    }
    return acc;
  },
  {} as Partial<Record<MainView, Set<MainView>>>,
);

/** Ordered ancestry from top-level surface to the current view */
export function getViewLineage(viewId: MainView): MainView[] {
  const lineage: MainView[] = [];
  let current: MainView | undefined = viewId;
  const visited = new Set<MainView>();

  while (current && !visited.has(current)) {
    lineage.unshift(current);
    visited.add(current);
    current = VIEW_MAP[current]?.parentId;
  }

  return lineage;
}

/** Top-level packaged product surface for a view */
export function getPrimarySurfaceView(viewId: MainView): MainView {
  return getViewLineage(viewId)[0] ?? viewId;
}

/** Research surface: core research + all its nested children */
export const RESEARCH_SURFACE_VIEWS: Set<MainView> = new Set([
  "research",
  ...(CHILDREN_MAP["research"] ?? []),
]);

/** Workspace surface: documents + all its nested children */
export const WORKSPACE_SURFACE_VIEWS: Set<MainView> = new Set([
  "documents",
  ...(CHILDREN_MAP["documents"] ?? []),
]);

/** Agents surface: agents + all its nested children */
export const AGENTS_SURFACE_VIEWS: Set<MainView> = new Set([
  "agents",
  ...(CHILDREN_MAP["agents"] ?? []),
]);

// ─── Compile-time completeness check ────────────────────────────────────────
// If you add a value to MainView but forget to add a registry entry,
// VIEW_MAP (which is typed as Record<MainView, ViewRegistryEntry>) will
// fail at runtime on missing keys. The Record<MainView, ...> type on VIEW_MAP
// ensures TypeScript tracks that every MainView key must be present.
//
// To catch it at compile time, ensure VIEW_MAP is used with explicit key access
// in consuming code (e.g., VIEW_MAP[currentView] where currentView: MainView).
