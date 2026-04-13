/**
 * viewRegistry.ts — Single source of truth for all view routing, metadata, and components.
 *
 * Adding a new view = adding ONE entry here. All consumers derive from this registry:
 *   - useMainLayoutRouting.ts (URL → view parsing)
 *   - CockpitLayout / ActiveSurfaceHost (surface resolution + rendering)
 *   - WorkspaceRail / command palette (navigation items)
 *   - cockpitModes.ts (mode groupings)
 *   - viewCapabilityRegistry.ts (WebMCP capabilities)
 *
 * Previously these were scattered across 6-8 files with ~200 hardcoded strings.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from "react";

// ─── MainView type (derived from registry at the bottom) ─────────────────────

/** All valid view keys. Generated from VIEW_REGISTRY. */
export type MainView =
  | "control-plane"
  | "developers"
  | "entity"
  | "pricing"
  | "changelog"
  | "legal"
  | "about"
  | "chat-home"
  | "reports-home"
  | "nudges-home"
  | "me-home"
  | "dogfood"
  | "conference-capture"
  | "entity-compare"
  | "benchmark-comparison"
  | "role-lens-output"
  | "homes-hub-session";

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

// ─── Cockpit surface model ──────────────────────────────────────────────────

export type CockpitSurfaceId =
  | "ask"          // Home
  | "workspace"    // Chat
  | "packets"      // Reports
  | "history"      // Nudges
  | "connect";     // Me

export const CANONICAL_SURFACE_PARAM: Record<CockpitSurfaceId, string> = {
  ask: "home",
  workspace: "chat",
  packets: "reports",
  history: "nudges",
  connect: "me",
};

const SURFACE_PARAM_ALIASES: Record<string, CockpitSurfaceId> = {
  ask: "ask",
  home: "ask",
  workspace: "workspace",
  chat: "workspace",
  packets: "packets",
  reports: "packets",
  history: "history",
  nudges: "history",
  connect: "connect",
  me: "connect",
};

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
   * null = view has custom rendering logic in the cockpit surface host.
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

  // ── Cockpit surface metadata (consolidation refactor) ──────────────────
  /** Which cockpit surface this view belongs to */
  surfaceId?: CockpitSurfaceId;
  /** If set, this route redirects to the cockpit with this query string */
  legacyRedirectTo?: string;
  /** Whether this view appears in the Cmd+K command palette (default: true) */
  commandPaletteVisible?: boolean;
}

export interface CockpitState {
  surfaceId: CockpitSurfaceId;
  view: MainView;
  entityName: string | null;
  spreadsheetId: string | null;
  researchTab: ResearchTab;
  panel: string | null;
  runId: string | null;
  docId: string | null;
  workspace: string | null;
  canonicalPath: string;
  isLegacyRedirect: boolean;
  isUnknownRoute: boolean;
}

export interface ActiveSurfaceParams {
  surfaceId: CockpitSurfaceId;
  view: MainView;
  entityName: string | null;
  docId: string | null;
  workspace: string | null;
  panel: string | null;
  researchTab: ResearchTab;
}

export interface SurfaceCacheEntry {
  surfaceId: CockpitSurfaceId;
  view: MainView;
  entityName: string | null;
  docId: string | null;
  workspace: string | null;
  panel: string | null;
  researchTab: ResearchTab;
  lastVisitedAt: number;
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
    title: "Home",
    subtitle: "Discover, ask, upload, and preview useful reports",
    path: "/",
    aliases: ["/control-plane", "/home", "/landing"],
    component: null, // Custom rendering in ActiveSurfaceHost
    group: "core",
    navVisible: true,
    surfaceId: "ask",
  },

  // ── Developers ──────────────────────────────────────────────────────────────
  {
    id: "developers",
    title: "Developers",
    subtitle: "Architecture, tools, and integrations under the hood",
    path: "/developers",
    component: lazyNamed(() => import("@/features/controlPlane/views/DevelopersPage"), "DevelopersPage"),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "ask",
    commandPaletteVisible: true,
  },

  // ── Entity Intelligence ──────────────────────────────────────────────────
  {
    id: "entity",
    title: "Entity",
    subtitle: "Compound note page — all searches, notes, and sources for one entity",
    path: "/entity",
    component: lazyNamed(() => import("@/features/entities/views/EntityPage"), "EntityPage"),
    dynamic: true,
    group: "nested",
    navVisible: false,
    surfaceId: "packets",
    commandPaletteVisible: true,
  },




  {
    id: "dogfood",
    title: "Quality Review",
    subtitle: "Dogfood gallery, Gemini QA evidence, and release readiness",
    path: "/dogfood",
    aliases: ["/quality-review"],
    component: lazyNamed(() => import("@/features/dogfood/views/DogfoodReviewView"), "DogfoodReviewView"),
    group: "internal",
    navVisible: false,
    surfaceId: "ask",
    commandPaletteVisible: false,
  },







  // ── Business Pages ──────────────────────────────────────────────────────
  {
    id: "pricing",
    title: "Pricing",
    subtitle: "Plans for individuals, teams, and enterprises",
    path: "/pricing",
    component: lazyNamed(() => import("@/features/controlPlane/views/PricingPage"), "PricingPage"),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "ask",
    commandPaletteVisible: true,
  },
  {
    id: "changelog",
    title: "Changelog",
    subtitle: "Release history and what shipped",
    path: "/changelog",
    component: lazyNamed(() => import("@/features/controlPlane/views/ChangelogPage"), "ChangelogPage"),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "ask",
    commandPaletteVisible: true,
  },

  {
    id: "legal",
    title: "Legal",
    subtitle: "Terms of service and privacy policy",
    path: "/legal",
    component: lazyNamed(() => import("@/features/controlPlane/views/LegalPage"), "LegalPage"),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "ask",
    commandPaletteVisible: true,
  },


  {
    id: "about",
    title: "About NodeBench AI",
    subtitle: "Entity intelligence platform — founder, mission, and product",
    path: "/about",
    component: lazyNamed(() => import("@/features/controlPlane/views/AboutPage"), "AboutPage"),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "ask",
    commandPaletteVisible: true,
  },


  // ── Canonical Founder Surfaces (public top-level) ───────────────────
  {
    id: "chat-home",
    title: "Chat",
    subtitle: "Live agent session â€” watch the research happen",
    path: "/chat",
    component: null, // Custom rendering in ActiveSurfaceHost
    group: "core",
    navVisible: false,
    surfaceId: "workspace",
    commandPaletteVisible: false,
  },
  {
    id: "reports-home",
    title: "Reports",
    subtitle: "Saved reports â€” search, reopen, refresh",
    path: "/reports",
    component: null, // Custom rendering in ActiveSurfaceHost
    group: "core",
    navVisible: false,
    surfaceId: "packets",
    commandPaletteVisible: false,
  },
  {
    id: "nudges-home",
    title: "Nudges",
    subtitle: "Reminders, follow-ups, and connector actions",
    path: "/nudges",
    component: null, // Custom rendering in ActiveSurfaceHost
    group: "core",
    navVisible: false,
    surfaceId: "history",
    commandPaletteVisible: false,
  },
  {
    id: "me-home",
    title: "Me",
    subtitle: "My files, profile, saved context, and preferences",
    path: "/me",
    component: null, // Custom rendering in ActiveSurfaceHost
    group: "core",
    navVisible: false,
    surfaceId: "connect",
    commandPaletteVisible: false,
  },

  // ── Conference Capture ──────────────────────────────────────────────────
  {
    id: "conference-capture",
    title: "Conference Capture",
    subtitle: "Fast mobile capture for events — notes, voice, entities, CRM packets",
    path: "/capture",
    aliases: ["/conference", "/event-capture"],
    component: lazyView(() => import("@/features/controlPlane/components/ConferenceCapture")),
    group: "internal",
    navVisible: false,
    surfaceId: "ask",
    commandPaletteVisible: false,
  },

  // ── Entity Compare ──────────────────────────────────────────────────────
  {
    id: "entity-compare",
    title: "Compare",
    subtitle: "Side-by-side diligence with role-specific framing",
    path: "/compare",
    aliases: ["/entity-compare", "/compare-entities"],
    component: lazyView(() => import("@/features/controlPlane/components/EntityCompare")),
    group: "internal",
    navVisible: false,
    surfaceId: "ask",
    commandPaletteVisible: false,
  },

  // ── Benchmark Comparison ────────────────────────────────────────────────
  {
    id: "benchmark-comparison",
    title: "Benchmarks",
    subtitle: "5-baseline ladder proving NodeBench structured output vs shallow alternatives",
    path: "/benchmarks",
    aliases: ["/benchmark", "/eval"],
    component: lazyView(() => import("@/features/controlPlane/components/BenchmarkComparison")),
    group: "internal",
    navVisible: false,
    surfaceId: "ask",
    commandPaletteVisible: false,
  },

  // ── Role Lens Output ────────────────────────────────────────────────────
  {
    id: "role-lens-output",
    title: "Role Lens",
    subtitle: "Same packet, different persona — founder, investor, banker, buyer, operator, student",
    path: "/lens",
    aliases: ["/role-lens", "/persona"],
    component: lazyView(() => import("@/features/controlPlane/components/RoleLensOutput")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "ask",
    commandPaletteVisible: true,
  },

  // ── Homes Hub Session Persistence ────────────────────────────────────────
  {
    id: "homes-hub-session",
    title: "Homes Hub",
    subtitle: "Revisit, refresh, and recompile your research packets — no sign-in required",
    path: "/homes",
    aliases: ["/homes-hub", "/sessions"],
    component: lazyView(() => import("@/features/controlPlane/components/HomesHubSession")),
    group: "internal",
    navVisible: false,
    surfaceId: "ask",
    commandPaletteVisible: false,
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

export const SURFACE_DEFAULT_VIEW: Record<CockpitSurfaceId, MainView> = {
  ask: "control-plane",
  workspace: "chat-home",
  packets: "reports-home",
  history: "nudges-home",
  connect: "me-home",
};

export const SURFACE_TITLES: Record<CockpitSurfaceId, string> = {
  ask: "Home",
  workspace: "Chat",
  packets: "Reports",
  history: "Nudges",
  connect: "Me",
};

export function getSurfaceForView(viewId: MainView): CockpitSurfaceId {
  return VIEW_MAP[viewId]?.surfaceId ?? "ask";
}

export function getDefaultViewForSurface(surfaceId: CockpitSurfaceId): MainView {
  return SURFACE_DEFAULT_VIEW[surfaceId];
}

export function getCanonicalSurfaceParam(surfaceId: CockpitSurfaceId): string {
  return CANONICAL_SURFACE_PARAM[surfaceId];
}

export function parseCockpitSurfaceParam(value?: string | null): CockpitSurfaceId | null {
  if (!value) return null;
  return SURFACE_PARAM_ALIASES[value.trim().toLowerCase()] ?? null;
}

export function buildCockpitPath({
  surfaceId,
  view,
  entity,
  run,
  doc,
  workspace,
  panel,
  tab,
  extra,
}: {
  surfaceId: CockpitSurfaceId;
  view?: MainView | null;
  entity?: string | null;
  run?: string | null;
  doc?: string | null;
  workspace?: string | null;
  panel?: string | null;
  tab?: string | null;
  extra?: Record<string, string | null>;
}): string {
  const params = new URLSearchParams();
  params.set("surface", getCanonicalSurfaceParam(surfaceId));
  if (view && view !== getDefaultViewForSurface(surfaceId)) params.set("view", view);
  if (entity) params.set("entity", entity);
  if (run) params.set("run", run);
  if (doc) params.set("doc", doc);
  if (workspace) params.set("workspace", workspace);
  if (panel) params.set("panel", panel);
  if (tab) params.set("tab", tab);
  // Pass through extra params (join, room, etc.) without dropping them
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v);
    }
  }
  return `/?${params.toString()}`;
}

export function buildCockpitPathForView({
  view,
  entity,
  run,
  doc,
  workspace,
  panel,
  tab,
  extra,
}: {
  view: MainView;
  entity?: string | null;
  run?: string | null;
  doc?: string | null;
  workspace?: string | null;
  panel?: string | null;
  tab?: string | null;
  extra?: Record<string, string | null>;
}): string {
  const appendQuery = (pathname: string, query: URLSearchParams) => {
    const search = query.toString();
    return search ? `${pathname}?${search}` : pathname;
  };

  if (view === "entity") {
    const query = new URLSearchParams();
    if (run) query.set("run", run);
    if (doc) query.set("doc", doc);
    if (workspace) query.set("workspace", workspace);
    if (panel) query.set("panel", panel);
    if (tab) query.set("tab", tab);
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        if (value) query.set(key, value);
      }
    }
    const pathname = entity ? `/entity/${encodeURIComponent(entity)}` : "/entity";
    return appendQuery(pathname, query);
  }

  const surfaceId = getSurfaceForView(view);
  return buildCockpitPath({
    surfaceId,
    view,
    entity,
    run,
    doc,
    workspace,
    panel,
    tab,
    extra,
  });
}

export function resolvePathToCockpitState(rawPathname: string, rawSearch = ""): CockpitState {
  const params = new URLSearchParams(rawSearch || "");
  const requestedSurface = parseCockpitSurfaceParam(params.get("surface"));
  const currentPath = `${rawPathname || "/"}${rawSearch || ""}`;
  const activeSurface = requestedSurface ?? null;

  if ((rawPathname || "/") === "/" && activeSurface && activeSurface in SURFACE_DEFAULT_VIEW) {
    const tabParam = params.get("tab");
    const researchTab = (tabParam as ResearchTab | null) ?? "overview";
    const requestedViewParam = params.get("view");
    const requestedView =
      requestedViewParam && requestedViewParam in VIEW_MAP
        ? (requestedViewParam as MainView)
        : null;
    const view =
      requestedView && getSurfaceForView(requestedView) === activeSurface
        ? requestedView
        : getDefaultViewForSurface(activeSurface);

    const canonicalPath = buildCockpitPath({
      surfaceId: activeSurface,
      view,
      entity: params.get("entity"),
      run: params.get("run"),
      doc: params.get("doc"),
      workspace: params.get("workspace"),
      panel: params.get("panel"),
      tab: params.get("tab"),
      extra: { join: params.get("join"), room: params.get("room") },
    });

    return {
      surfaceId: activeSurface,
      view,
      entityName: params.get("entity"),
      spreadsheetId: null,
      researchTab,
      panel: params.get("panel"),
      runId: params.get("run"),
      docId: params.get("doc"),
      workspace: params.get("workspace"),
      canonicalPath,
      isLegacyRedirect: false, // cockpit-style ?surface= URLs are never legacy redirects
      isUnknownRoute: false,
    };
  }

  const resolved = resolvePathToView(rawPathname);
  const surfaceId = getSurfaceForView(resolved.view);
  const entityName = resolved.entityName;
  const canonicalPath = buildCockpitPathForView({
    view: resolved.view,
    entity: entityName,
    run: params.get("run"),
    doc: params.get("doc"),
    workspace: params.get("workspace"),
    panel: null,
    tab: params.get("tab"),
    extra: { join: params.get("join"), room: params.get("room") },
  });

  return {
    surfaceId,
    view: resolved.view,
    entityName,
    spreadsheetId: resolved.spreadsheetId,
    researchTab: resolved.researchTab,
    panel: null,
    runId: params.get("run"),
    docId: params.get("doc"),
    workspace: params.get("workspace"),
    canonicalPath,
    isLegacyRedirect: currentPath !== canonicalPath,
    isUnknownRoute: resolved.isUnknownRoute,
  };
}

/**
 * Resolve a URL pathname to a MainView.
 * Replaces the 33-branch if-chain in useMainLayoutRouting.
 */
export function resolvePathToView(rawPathname: string): {
  view: MainView;
  entityName: string | null;
  spreadsheetId: string | null;
  researchTab: ResearchTab;
  isUnknownRoute: boolean;
} {
  const normalized = (rawPathname || "/")
    .split("?")[0]
    .split("#")[0]
    .toLowerCase();
  const pathname = normalized !== "/" ? normalized.replace(/\/+$/, "") || "/" : "/";

  // Special cases requiring parameter extraction
  if (pathname.startsWith("/onboarding")) {
    return { view: "control-plane", entityName: null, spreadsheetId: null, researchTab: "overview", isUnknownRoute: false };
  }

  if (pathname === "/entity") {
    return { view: "entity", entityName: null, spreadsheetId: null, researchTab: "overview", isUnknownRoute: false };
  }

  if (pathname.startsWith("/entity/") || pathname.startsWith("/entity%2f")) {
    const match = (rawPathname || "").match(/^\/entity[\\/](.+)$/i);
    const name = match ? decodeURIComponent(match[1]) : null;
    return { view: "entity", entityName: name, spreadsheetId: null, researchTab: "overview", isUnknownRoute: false };
  }

  // General matching: longest path wins. Never let "/" swallow all routes.
  const candidates = VIEW_REGISTRY
    .filter((entry) => entry.id !== "entity")
    .flatMap((entry) => [entry.path, ...(entry.aliases ?? [])].map((path) => ({ view: entry.id, path })))
    .sort((a, b) => b.path.length - a.path.length);

  for (const candidate of candidates) {
    if (candidate.path === "/") {
      if (pathname === "/") {
        return { view: candidate.view, entityName: null, spreadsheetId: null, researchTab: "overview", isUnknownRoute: false };
      }
      continue;
    }

    if (pathname === candidate.path || pathname.startsWith(candidate.path + "/")) {
      return { view: candidate.view, entityName: null, spreadsheetId: null, researchTab: "overview", isUnknownRoute: false };
    }
  }

  // Default view — unknown route (404)
  return { view: "control-plane", entityName: null, spreadsheetId: null, researchTab: "overview", isUnknownRoute: true };
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


// ─── Compile-time completeness check ────────────────────────────────────────
// If you add a value to MainView but forget to add a registry entry,
// VIEW_MAP (which is typed as Record<MainView, ViewRegistryEntry>) will
// fail at runtime on missing keys. The Record<MainView, ...> type on VIEW_MAP
// ensures TypeScript tracks that every MainView key must be present.
//
// To catch it at compile time, ensure VIEW_MAP is used with explicit key access
// in consuming code (e.g., VIEW_MAP[currentView] where currentView: MainView).
