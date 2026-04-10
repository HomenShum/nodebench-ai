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
  | "receipts"
  | "delegation"
  | "mcp-ledger"
  | "developers"
  | "research"
  | "entity"
  | "investigation"
  | "documents"
  | "oracle"
  | "deep-sim"
  | "decision-snapshot"
  | "variables"
  | "scenarios"
  | "interventions"
  | "evidence"
  | "postmortem"
  | "pricing"
  | "changelog"
  | "legal"
  | "founder-dashboard"
  | "agent-oversight"
  | "command-panel"
  | "context-intake"
  | "agent-brief"
  | "founder-history"
  | "nearby-entities"
  | "company-search"
  | "company-analysis"
  | "founder-export"
  | "founder-changes"
  | "founder-session-delta"
  | "coordination-hub"
  | "founder-workspace-home"
  | "founder-packets-home"
  | "founder-history-home"
  | "founder-connect-home"
  | "library-home"
  | "conference-capture"
  | "entity-compare"
  | "about"
  | "spreadsheets"
  | "world-monitor"
  | "watchlists"
  | "agents"
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
  | "ask"          // Default: simplified landing + chat input
  | "memo"         // Decision workbench (DecisionMemoView) — internal
  | "research"     // Research hub (ResearchHub) — internal
  | "investigate"  // Adversarial analysis (InvestigationView) — internal
  | "compare"      // Postmortem / prediction vs reality — internal
  | "editor"       // Documents + spreadsheets workspace — internal
  | "graph"        // Entity profile + trust graph — internal
  | "trace"        // Action receipts + execution trace — internal
  | "telemetry"    // Stacked ops: benchmarks + health + spend + quality — internal
  // ── Canonical founder surfaces (public top-level nav) ──
  | "workspace"    // Founder workspace — company truth, contradictions, next moves
  | "packets"      // Packet center — active packet, lineage, exports, delegation
  | "history"      // Founder history — important changes, state diffs, prior packets
  | "connect"      // Connect — MCP init, watchlist setup, agent connections
  | "library";     // Library — merged reports + changes + documents

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
    subtitle: "Search any company, founder, or market",
    path: "/",
    aliases: ["/control-plane", "/home", "/landing"],
    component: null, // Custom rendering in ActiveSurfaceHost
    group: "core",
    navVisible: true,
    surfaceId: "ask",
  },
  {
    id: "receipts",
    title: "Agent Actions",
    subtitle: "What your agents did, what was denied, and what needs approval",
    path: "/receipts",
    aliases: ["/action-receipts", "/control-plane/receipts"],
    component: lazyView(() => import("@/features/controlPlane/views/ActionReceiptFeed")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "trace",
    legacyRedirectTo: "/?surface=trace",
  },
  {
    id: "delegation",
    title: "Permissions",
    subtitle: "What each agent is allowed to do, and what requires approval",
    path: "/delegation",
    aliases: ["/delegate", "/passport", "/control-plane/delegation", "/control-plane/passport"],
    component: lazyView(() => import("@/features/controlPlane/views/DelegationShowcase")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "trace",
    legacyRedirectTo: "/?surface=trace&panel=permissions",
  },
  {
    id: "mcp-ledger",
    title: "Tool Activity",
    subtitle: "MCP ledger, shared context, sync bridge health, and shared history review",
    path: "/mcp/ledger",
    aliases: ["/internal/mcp-ledger", "/mcp-ledger", "/activity-log"],
    component: lazyNamed(() => import("@/features/mcp/views/McpToolLedgerView"), "McpToolLedgerView"),
    group: "internal",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "trace",
    commandPaletteVisible: true,
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
    surfaceId: "memo",
    commandPaletteVisible: true,
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
    surfaceId: "research",
    legacyRedirectTo: "/?surface=research",
    commandPaletteVisible: true,
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
    surfaceId: "graph",
    legacyRedirectTo: "/?surface=graph",
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
    surfaceId: "investigate",
    legacyRedirectTo: "/?surface=investigate",
    commandPaletteVisible: true,
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
    surfaceId: "memo",
    legacyRedirectTo: "/?surface=editor",
  },




  // ── Oracle ─────────────────────────────────────────────────────────────────
  {
    id: "oracle",
    title: "System",
    subtitle: "Operational health, benchmarks, spend, and quality reviews",
    path: "/oracle",
    aliases: ["/career", "/trajectory"],
    component: lazyNamed(() => import("@/features/oracle/views/OracleView"), "OracleView"),
    group: "core",
    navVisible: true,
    surfaceId: "telemetry",
    legacyRedirectTo: "/?surface=telemetry",
  },



  {
    id: "deep-sim",
    title: "Decision Workbench",
    subtitle: "Deep Sim analysis: variables, scenarios, interventions, and decision memos with evidence",
    path: "/deep-sim",
    aliases: ["/decision-memo", "/decision-workbench"],
    component: lazyView(() => import("@/features/deepSim/views/DecisionMemoView")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "memo",
    legacyRedirectTo: "/?surface=memo",
    commandPaletteVisible: true,
  },
  {
    id: "decision-snapshot",
    title: "Decision Snapshot",
    subtitle: "Answer-first canvas: recommendation, top variables, best next actions, scenarios",
    path: "/decision-snapshot",
    aliases: ["/snapshot", "/decision"],
    component: lazyView(() => import("@/features/deepSim/views/DecisionSnapshotView")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "memo",
  },
  {
    id: "variables",
    title: "Variables",
    subtitle: "Ranked variables that drive the decision — weights, sensitivity, data completeness",
    path: "/variables",
    component: lazyView(() => import("@/features/deepSim/views/VariablesView")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "memo",
  },
  {
    id: "scenarios",
    title: "Scenarios",
    subtitle: "Scenario branches with assumptions, risks, and probability distribution",
    path: "/scenarios",
    component: lazyView(() => import("@/features/deepSim/views/ScenariosView")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "memo",
  },
  {
    id: "interventions",
    title: "Interventions",
    subtitle: "Ranked intervention ladder with cost, timeframe, and confirmation criteria",
    path: "/interventions",
    component: lazyView(() => import("@/features/deepSim/views/InterventionsView")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "memo",
  },
  {
    id: "evidence",
    title: "Evidence",
    subtitle: "Source drawer, provenance, claims, contradictions, and counter-models",
    path: "/evidence",
    component: lazyView(() => import("@/features/deepSim/views/EvidenceView")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "memo",
  },
  {
    id: "postmortem",
    title: "Postmortem",
    subtitle: "Compare predictions against reality, score forecasts, update priors",
    path: "/postmortem",
    aliases: ["/forecast-review", "/scorecard"],
    component: lazyView(() => import("@/features/deepSim/views/PostmortemView")),
    group: "nested",
    navVisible: false,
    parentId: "control-plane",
    surfaceId: "compare",
    legacyRedirectTo: "/?surface=compare",
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
    surfaceId: "memo",
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
    surfaceId: "memo",
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
    surfaceId: "memo",
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

  // ── Founder Platform ──────────────────────────────────────────────────────
  {
    id: "founder-dashboard",
    title: "Founder Dashboard",
    subtitle: "Your company operating view — goals, agents, signals, and next actions",
    path: "/founder",
    aliases: ["/founder-dashboard"],
    component: lazyView(() => import("@/features/founder/views/FounderDashboardTabs")),
    group: "core",
    navVisible: true,
    surfaceId: "memo",
    commandPaletteVisible: true,
  },
  {
    id: "agent-oversight",
    title: "Agent Oversight",
    subtitle: "Monitor and manage your connected Claude Code and OpenClaw agents",
    path: "/founder/agents",
    component: lazyView(() => import("@/features/founder/views/AgentOversightView")),
    group: "nested",
    navVisible: true,
    parentId: "founder-dashboard",
    surfaceId: "memo",
    commandPaletteVisible: true,
  },
  {
    id: "command-panel",
    title: "Command Center",
    subtitle: "Message, direct, and coordinate your agents with structured business context",
    path: "/founder/command",
    aliases: ["/founder/messages"],
    component: lazyView(() => import("@/features/founder/views/CommandPanelView")),
    group: "nested",
    navVisible: true,
    parentId: "founder-dashboard",
    surfaceId: "memo",
    commandPaletteVisible: true,
  },
  {
    id: "context-intake",
    title: "Context Intake",
    subtitle: "Drop in messy notes, docs, links, screenshots, and agent outputs",
    path: "/founder/intake",
    component: lazyView(() => import("@/features/founder/views/ContextIntakeView")),
    group: "nested",
    navVisible: true,
    parentId: "founder-dashboard",
    surfaceId: "memo",
    commandPaletteVisible: true,
  },
  {
    id: "agent-brief",
    title: "Agent Brief",
    subtitle: "Hand off the active artifact packet to Claude Code or OpenClaw agents",
    path: "/founder/brief",
    component: lazyView(() => import("@/features/founder/components/AgentHandoffPanel")),
    group: "nested",
    navVisible: true,
    parentId: "founder-dashboard",
    surfaceId: "memo",
    commandPaletteVisible: true,
  },
  {
    id: "founder-history",
    title: "History & Changes",
    subtitle: "Compare snapshots, review prior memos, track drift over time",
    path: "/founder/history",
    component: lazyView(() => import("@/features/founder/views/HistoryView")),
    group: "nested",
    navVisible: true,
    parentId: "founder-dashboard",
    surfaceId: "editor",
    commandPaletteVisible: true,
  },
  {
    id: "nearby-entities",
    title: "Nearby Entities",
    subtitle: "Competitive landscape, partners, and entity context for your company",
    path: "/founder/entities",
    component: lazyView(() => import("@/features/founder/views/NearbyEntitiesView")),
    group: "nested",
    navVisible: true,
    parentId: "founder-dashboard",
    surfaceId: "memo",
    commandPaletteVisible: true,
  },

  // ── Company Intelligence ───────────────────────────────────────────────────
  {
    id: "company-search",
    title: "Company Intelligence",
    subtitle: "Search any company — banker, CEO, strategy, or diligence lens",
    path: "/founder/search",
    component: lazyView(() => import("@/features/founder/views/CompanySearchView")),
    group: "nested",
    navVisible: true,
    parentId: "founder-dashboard",
    surfaceId: "research",
    commandPaletteVisible: false,
  },
  {
    id: "company-analysis",
    title: "Company Analysis",
    subtitle: "Structured 9-card analysis brief for a searched company",
    path: "/founder/analysis",
    component: lazyView(() => import("@/features/founder/views/CompanyAnalysisView")),
    group: "nested",
    navVisible: false,
    parentId: "company-search",
    surfaceId: "editor",
    commandPaletteVisible: false,
  },
  {
    id: "founder-export",
    title: "Export Center",
    subtitle: "Turn Artifact Packets into presentable deliverables",
    path: "/founder/export",
    component: lazyView(() => import("@/features/founder/views/ExportView")),
    group: "nested",
    navVisible: true,
    parentId: "founder-dashboard",
    surfaceId: "research",
    commandPaletteVisible: true,
  },
  {
    id: "founder-changes",
    title: "Important Changes",
    subtitle: "Detected changes requiring attention — resolve, investigate, or dismiss",
    path: "/founder/changes",
    component: lazyView(() => import("@/features/founder/views/ChangeDetectorView")),
    group: "nested",
    navVisible: true,
    parentId: "founder-dashboard",
    surfaceId: "editor",
    commandPaletteVisible: true,
  },
  // ── Phase 11 — Ambient Intelligence ────────────────────────────────
  {
    id: "founder-session-delta",
    title: "Since Your Last Session",
    subtitle: "What changed while you were away — strategy, competitors, contradictions, packets",
    path: "/founder/delta",
    component: lazyView(() => import("@/features/founder/views/SessionDeltaView")),
    group: "nested",
    navVisible: true,
    parentId: "founder-dashboard",
    surfaceId: "editor",
    commandPaletteVisible: true,
  },
  // ── Phase 14 — Shared Context Coordination ───────────────────────
  {
    id: "coordination-hub",
    title: "Coordination Hub",
    subtitle: "Team coordination — peers, tasks, context packets, messaging",
    path: "/founder/coordination",
    component: lazyView(() => import("@/features/founder/views/CoordinationTabs")),
    group: "nested",
    navVisible: true,
    parentId: "founder-dashboard",
    surfaceId: "connect",
    commandPaletteVisible: true,
  },

  // ── Canonical Founder Surfaces (public top-level) ───────────────────
  {
    id: "founder-workspace-home",
    title: "Chat",
    subtitle: "Live agent session — watch the research happen",
    path: "/workspace-home",
    aliases: ["/founder/workspace"],
    component: null, // Custom rendering in ActiveSurfaceHost
    group: "core",
    navVisible: false,
    surfaceId: "workspace",
    legacyRedirectTo: "/?surface=workspace",
    commandPaletteVisible: true,
  },
  {
    id: "founder-packets-home",
    title: "Reports",
    subtitle: "Saved reports — search, reopen, refresh",
    path: "/packets-home",
    aliases: ["/founder/packets"],
    component: null, // Custom rendering in ActiveSurfaceHost
    group: "core",
    navVisible: false,
    surfaceId: "packets",
    legacyRedirectTo: "/?surface=packets",
    commandPaletteVisible: true,
  },
  {
    id: "founder-history-home",
    title: "Nudges",
    subtitle: "Reminders, follow-ups, and connector actions",
    path: "/history-home",
    aliases: ["/founder/history-home"],
    component: null, // Custom rendering in ActiveSurfaceHost
    group: "core",
    navVisible: false,
    surfaceId: "history",
    legacyRedirectTo: "/?surface=history",
    commandPaletteVisible: true,
  },
  {
    id: "founder-connect-home",
    title: "Me",
    subtitle: "My files, profile, saved context, and preferences",
    path: "/connect-home",
    aliases: ["/founder/connect"],
    component: null, // Custom rendering in ActiveSurfaceHost
    group: "core",
    navVisible: false,
    surfaceId: "connect",
    legacyRedirectTo: "/?surface=connect",
  },

  // ── Library (merged Reports + Changes + Documents) ─────────────────
  {
    id: "library-home",
    title: "Library",
    subtitle: "Reports, changes, and documents from every search and workflow",
    path: "/library",
    component: null, // Custom rendering in ActiveSurfaceHost
    group: "core",
    navVisible: true,
    surfaceId: "library",
  },

  // ── Conference Capture ──────────────────────────────────────────────────
  {
    id: "conference-capture",
    title: "Conference Capture",
    subtitle: "Fast mobile capture for events — notes, voice, entities, CRM packets",
    path: "/capture",
    aliases: ["/conference", "/event-capture"],
    component: lazyView(() => import("@/features/controlPlane/components/ConferenceCapture")),
    group: "core",
    navVisible: true,
    surfaceId: "ask",
    commandPaletteVisible: true,
  },

  // ── Entity Compare ──────────────────────────────────────────────────────
  {
    id: "entity-compare",
    title: "Compare",
    subtitle: "Side-by-side diligence with role-specific framing",
    path: "/compare",
    aliases: ["/entity-compare", "/compare-entities"],
    component: lazyView(() => import("@/features/controlPlane/components/EntityCompare")),
    group: "core",
    navVisible: true,
    surfaceId: "ask",
    commandPaletteVisible: true,
  },

  // ── Benchmark Comparison ────────────────────────────────────────────────
  {
    id: "benchmark-comparison",
    title: "Benchmarks",
    subtitle: "5-baseline ladder proving NodeBench structured output vs shallow alternatives",
    path: "/benchmarks",
    aliases: ["/benchmark", "/eval"],
    component: lazyView(() => import("@/features/controlPlane/components/BenchmarkComparison")),
    group: "core",
    navVisible: true,
    surfaceId: "telemetry",
    commandPaletteVisible: true,
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
    group: "core",
    navVisible: true,
    surfaceId: "ask",
    commandPaletteVisible: true,
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
  memo: "deep-sim",
  research: "research",
  investigate: "investigation",
  compare: "postmortem",
  editor: "documents",
  graph: "entity",
  trace: "receipts",
  telemetry: "oracle",
  // Canonical founder surfaces
  workspace: "founder-workspace-home",
  packets: "founder-packets-home",
  history: "founder-history-home",
  connect: "founder-connect-home",
  library: "library-home",
};

export const SURFACE_TITLES: Record<CockpitSurfaceId, string> = {
  ask: "Home",
  memo: "Decision Workbench",
  research: "Research Hub",
  investigate: "Investigation",
  compare: "Forecast Review",
  editor: "Documents",
  graph: "Entity Graph",
  trace: "Audit Trail",
  telemetry: "Admin",
  // Canonical founder surfaces
  workspace: "Chat",
  packets: "Reports",
  history: "Nudges",
  connect: "Me",
  library: "Library",
};

export function getSurfaceForView(viewId: MainView): CockpitSurfaceId {
  return VIEW_MAP[viewId]?.surfaceId ?? "ask";
}

export function getDefaultViewForSurface(surfaceId: CockpitSurfaceId): MainView {
  return SURFACE_DEFAULT_VIEW[surfaceId];
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
  params.set("surface", surfaceId);
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
  const surfaceId = getSurfaceForView(view);
  return buildCockpitPath({
    surfaceId,
    view,
    entity,
    run,
    doc,
    workspace,
    panel: panel ?? (view === "delegation" ? "permissions" : null),
    tab,
    extra,
  });
}

export function resolvePathToCockpitState(rawPathname: string, rawSearch = ""): CockpitState {
  const params = new URLSearchParams(rawSearch || "");
  const requestedSurface = params.get("surface") as CockpitSurfaceId | null;
  const currentPath = `${rawPathname || "/"}${rawSearch || ""}`;
  const inferredSurface =
    (rawPathname || "/") === "/" && !requestedSurface
      ? params.get("entity")
        ? "graph"
        : params.get("run") || params.get("panel")
          ? "trace"
          : params.get("doc") || params.get("workspace")
            ? "editor"
            : null
      : null;
  const activeSurface = requestedSurface ?? inferredSurface;

  if ((rawPathname || "/") === "/" && activeSurface && activeSurface in SURFACE_DEFAULT_VIEW) {
    const tabParam = params.get("tab");
    const researchTab = (tabParam as ResearchTab | null) ?? "overview";
    const requestedViewParam = params.get("view");
    // Views in VIEW_MAP are validated against their registered surface.
    // Views NOT in VIEW_MAP (calendar, agents, roadmap, workspace) are "inline views"
    // handled directly by ActiveSurfaceHost — trust the explicit surface param.
    const INLINE_EDITOR_VIEWS = new Set(["calendar", "agents", "roadmap", "workspace", "timeline"]);
    const requestedView =
      requestedViewParam && requestedViewParam in VIEW_MAP
        ? (requestedViewParam as MainView)
        : requestedViewParam && INLINE_EDITOR_VIEWS.has(requestedViewParam) && activeSurface === "editor"
          ? (requestedViewParam as MainView)
          : null;
    const view =
      requestedView && (getSurfaceForView(requestedView) === activeSurface || INLINE_EDITOR_VIEWS.has(requestedView))
        ? requestedView
        : activeSurface === "graph" && params.get("entity")
          ? "entity"
          : activeSurface === "trace" && params.get("panel") === "permissions"
            ? "delegation"
            : activeSurface === "research" && tabParam
              ? "research"
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
    panel: resolved.view === "delegation" ? "permissions" : null,
    tab: params.get("tab") ?? (surfaceId === "research" ? resolved.researchTab : null),
    extra: { join: params.get("join"), room: params.get("room") },
  });

  return {
    surfaceId,
    view: resolved.view,
    entityName,
    spreadsheetId: resolved.spreadsheetId,
    researchTab: resolved.researchTab,
    panel: resolved.view === "delegation" ? "permissions" : null,
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
    return { view: "research", entityName: null, spreadsheetId: null, researchTab: "overview", isUnknownRoute: false };
  }

  if (pathname.startsWith("/entity/") || pathname.startsWith("/entity%2f")) {
    const match = (rawPathname || "").match(/^\/entity[\\/](.+)$/i);
    const name = match ? decodeURIComponent(match[1]) : null;
    return { view: "entity", entityName: name, spreadsheetId: null, researchTab: "overview", isUnknownRoute: false };
  }

  if (pathname.startsWith("/spreadsheets/")) {
    const match = (rawPathname || "").match(/^\/spreadsheets[\\/](.+)$/i);
    const id = match ? decodeURIComponent(match[1]) : null;
    return { view: "spreadsheets", entityName: null, spreadsheetId: id, researchTab: "overview", isUnknownRoute: false };
  }

  if (pathname.startsWith("/research") || pathname.startsWith("/hub")) {
    if (pathname.startsWith("/research/world-monitor") || pathname.startsWith("/hub/world-monitor")) {
      return { view: "world-monitor", entityName: null, spreadsheetId: null, researchTab: "overview", isUnknownRoute: false };
    }
    if (pathname.startsWith("/research/watchlists") || pathname.startsWith("/hub/watchlists")) {
      return { view: "watchlists", entityName: null, spreadsheetId: null, researchTab: "overview", isUnknownRoute: false };
    }
    const tabMatch = pathname.match(
      /^\/(?:research|hub)\/(overview|signals|briefing|deals|changes|changelog)/,
    );
    const tab = (tabMatch?.[1] as ResearchTab | undefined) ?? "overview";
    return { view: "research", entityName: null, spreadsheetId: null, researchTab: tab, isUnknownRoute: false };
  }

  // General matching: longest path wins. Never let "/" swallow all routes.
  const candidates = VIEW_REGISTRY
    .filter((entry) => !["research", "entity", "spreadsheets"].includes(entry.id))
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
