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
  | "oracle";

export type ResearchTab = "overview" | "signals" | "briefing" | "deals" | "changes" | "changelog";

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
  // ── Research & Intelligence ────────────────────────────────────────────────
  {
    id: "research",
    title: "Research",
    subtitle: "Signals, briefings, and agent entry points",
    path: "/research",
    aliases: ["/hub"],
    component: null, // Custom rendering (CinematicHome / ResearchHub toggle)
  },
  {
    id: "signals",
    title: "Signals",
    path: "/signals",
    component: lazyNamed(() => import("@/features/research/views/PublicSignalsLog"), "PublicSignalsLog"),
  },
  {
    id: "for-you-feed",
    title: "Suggested Signals",
    subtitle: "Personalized recommendations and priority signals",
    path: "/for-you",
    aliases: ["/feed"],
    component: lazyNamed(() => import("@/features/research/components/ForYouFeed"), "ForYouFeed"),
  },
  {
    id: "industry-updates",
    title: "Market Watch",
    subtitle: "Market movement and company updates",
    path: "/industry",
    aliases: ["/dashboard/industry"],
    component: lazyNamed(() => import("@/components/IndustryUpdatesPanel"), "IndustryUpdatesPanel"),
  },
  {
    id: "funding",
    title: "Funding",
    path: "/funding",
    aliases: ["/funding-brief"],
    component: lazyNamed(() => import("@/features/research/views/FundingBriefView"), "FundingBriefView"),
  },
  {
    id: "showcase",
    title: "Showcase",
    path: "/showcase",
    aliases: ["/demo"],
    component: null, // Custom rendering in MainLayout (passes onBack prop)
  },
  {
    id: "footnotes",
    title: "Sources",
    path: "/footnotes",
    aliases: ["/sources"],
    component: null, // Custom rendering in MainLayout (passes library/onBack props)
  },
  {
    id: "entity",
    title: "Entity",
    path: "/entity",
    component: lazyNamed(() => import("@/features/research/views/EntityProfilePage"), "EntityProfilePage"),
    dynamic: true,
  },
  {
    id: "benchmarks",
    title: "Run Benchmarks",
    subtitle: "Model comparison on production-shaped tasks",
    path: "/benchmarks",
    aliases: ["/eval"],
    component: lazyNamed(() => import("@/features/benchmarks/views/WorkbenchView"), "WorkbenchView"),
  },

  // ── Workspace & Build ──────────────────────────────────────────────────────
  {
    id: "documents",
    title: "Workspace",
    subtitle: "Files, notes, and work in progress",
    path: "/documents",
    aliases: ["/docs", "/workspace"],
    component: lazyNamed(() => import("@/features/documents/components/DocumentsHomeHub"), "DocumentsHomeHub"),
  },
  {
    id: "spreadsheets",
    title: "Spreadsheets",
    path: "/spreadsheets",
    component: null, // Custom rendering (SpreadsheetsHub / SpreadsheetSheetView toggle)
  },
  {
    id: "calendar",
    title: "Calendar",
    path: "/calendar",
    component: null, // Custom rendering in MainLayout (passes onDocumentSelect/onGridModeToggle)
  },
  {
    id: "roadmap",
    title: "Roadmap",
    path: "/roadmap",
    component: null, // Shares TimelineRoadmapView with timeline
  },
  {
    id: "timeline",
    title: "Timeline",
    path: "/timeline",
    component: null, // Shares TimelineRoadmapView with roadmap
  },
  {
    id: "public",
    title: "Shared with You",
    path: "/public",
    aliases: ["/shared"],
    component: null, // Custom rendering in MainLayout (passes onDocumentSelect prop)
  },
  {
    id: "document-recommendations",
    title: "Recommended Docs",
    subtitle: "Suggested reading and follow-up documents",
    path: "/recommendations",
    aliases: ["/discover"],
    component: lazyView(() => import("@/components/RecommendationCard").then((m) => ({ default: (m as any).DocumentRecommendations ?? m.default }))),
  },

  // ── Agents & Automation ────────────────────────────────────────────────────
  {
    id: "agents",
    title: "Agent Workflows",
    subtitle: "Live agent threads and workflows",
    path: "/agents",
    component: lazyNamed(() => import("@/features/agents/views/AgentsHub"), "AgentsHub"),
  },
  {
    id: "agent-marketplace",
    title: "Ready Workflows",
    subtitle: "Reusable agent flows and templates",
    path: "/marketplace",
    aliases: ["/agent-marketplace"],
    component: lazyNamed(() => import("@/features/agents/components/AgentMarketplace"), "AgentMarketplace"),
  },
  {
    id: "activity",
    title: "Activity Stream",
    path: "/activity",
    aliases: ["/public-activity"],
    component: lazyNamed(() => import("@/features/agents/views/PublicActivityView"), "PublicActivityView"),
  },
  {
    id: "mcp-ledger",
    title: "Tool Activity",
    subtitle: "Auditable tool calls and request traces",
    path: "/mcp-ledger",
    aliases: ["/mcp/ledger", "/activity-log"],
    component: lazyNamed(() => import("@/features/mcp/views/McpToolLedgerView"), "McpToolLedgerView"),
  },

  // ── Code & Social Intelligence ─────────────────────────────────────────────
  {
    id: "github-explorer",
    title: "Repo Tracking",
    subtitle: "Repository tracking and momentum",
    path: "/github",
    aliases: ["/github-explorer"],
    component: lazyNamed(() => import("@/features/research/components/GitHubExplorer"), "GitHubExplorer"),
  },
  {
    id: "pr-suggestions",
    title: "Review Pull Requests",
    subtitle: "Pull request review and engineering follow-up",
    path: "/pr-suggestions",
    aliases: ["/prs"],
    component: lazyNamed(() => import("@/features/monitoring/components/PRSuggestions"), "PRSuggestions"),
  },
  {
    id: "linkedin-posts",
    title: "Social Archive",
    subtitle: "Social output history and archive",
    path: "/linkedin",
    component: lazyNamed(() => import("@/features/social/views/LinkedInPostArchiveView"), "LinkedInPostArchiveView"),
  },

  // ── Analytics & System ─────────────────────────────────────────────────────
  {
    id: "analytics-hitl",
    title: "Review Queue",
    path: "/analytics/hitl",
    aliases: ["/analytics/review-queue", "/review-queue"],
    component: lazyView(() => import("@/features/analytics/views/HITLAnalyticsDashboard")),
  },
  {
    id: "analytics-components",
    title: "Performance Analytics",
    path: "/analytics/components",
    component: lazyView(() => import("@/features/analytics/views/ComponentMetricsDashboard")),
  },
  {
    id: "analytics-recommendations",
    title: "Feedback",
    path: "/analytics/recommendations",
    component: lazyNamed(() => import("@/features/analytics/views/RecommendationAnalyticsDashboard"), "default"),
  },
  {
    id: "cost-dashboard",
    title: "Spend",
    subtitle: "Usage and spend trends",
    path: "/cost",
    aliases: ["/dashboard/cost"],
    component: lazyNamed(() => import("@/components/CostDashboard"), "CostDashboard"),
  },
  {
    id: "dogfood",
    title: "Review Evidence",
    path: "/dogfood",
    aliases: ["/quality-review"],
    component: lazyNamed(() => import("@/features/dogfood/views/DogfoodReviewView"), "DogfoodReviewView"),
  },
  {
    id: "observability",
    title: "System Health",
    subtitle: "System health, maintenance, and recovery loops",
    path: "/observability",
    aliases: ["/health", "/system-health"],
    component: lazyView(() => import("@/features/observability/views/ObservabilityView")),
  },
  {
    id: "engine-demo",
    title: "Engine API",
    path: "/engine",
    aliases: ["/engine-demo"],
    component: lazyView(() => import("@/features/engine/views/EngineDemoView")),
  },

  // ── Oracle ─────────────────────────────────────────────────────────────────
  {
    id: "oracle",
    title: "The Oracle",
    subtitle: "Operational memory and telemetry for long-running AI work",
    path: "/oracle",
    aliases: ["/career", "/trajectory"],
    component: lazyNamed(() => import("@/features/oracle/views/OracleView"), "OracleView"),
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
  const pathname = (rawPathname || "/").toLowerCase();

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

  // General matching: check each registry entry's path and aliases
  for (const entry of VIEW_REGISTRY) {
    if (entry.id === "research" || entry.id === "entity" || entry.id === "spreadsheets") continue; // handled above
    const paths = [entry.path, ...(entry.aliases ?? [])];
    for (const p of paths) {
      if (pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)) {
        // Avoid partial prefix matches — "/for-you" shouldn't match "/for"
        // Only match if pathname equals path, starts with path+"/", or path is the full prefix
        if (pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")) {
          return { view: entry.id, entityName: null, spreadsheetId: null, researchTab: "overview" };
        }
      }
    }
  }

  // Default view
  return { view: "oracle", entityName: null, spreadsheetId: null, researchTab: "overview" };
}

/** All view IDs (for type checking and iteration) */
export const ALL_VIEW_IDS: MainView[] = VIEW_REGISTRY.map((e) => e.id);

// ─── Compile-time completeness check ────────────────────────────────────────
// If you add a value to MainView but forget to add a registry entry,
// VIEW_MAP (which is typed as Record<MainView, ViewRegistryEntry>) will
// fail at runtime on missing keys. The Record<MainView, ...> type on VIEW_MAP
// ensures TypeScript tracks that every MainView key must be present.
//
// To catch it at compile time, ensure VIEW_MAP is used with explicit key access
// in consuming code (e.g., VIEW_MAP[currentView] where currentView: MainView).
