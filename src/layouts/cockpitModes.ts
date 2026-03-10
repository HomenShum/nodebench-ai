/**
 * cockpitModes.ts — Maps 28 MainView routes into 5 Jarvis-style focal modes.
 *
 * Each mode groups related views under a single icon in the ModeRail.
 * Within a mode, individual views are accessible via CommandBar tabs or Cmd+K.
 */

import type { MainView } from "@/lib/viewRegistry";
export { VIEW_TITLES, VIEW_PATH_MAP } from "@/lib/viewRegistry";
import type { LucideIcon } from "lucide-react";
import { Target, Radar, Code, Bot, Settings } from "lucide-react";

export type CockpitMode = "mission" | "intel" | "build" | "agents" | "system";

export interface ModeConfig {
  id: CockpitMode;
  label: string;
  /** One-line operator description shown in tooltips and StatusStrip ticker */
  description: string;
  /** Lucide icon name */
  icon: string;
  /** Views belonging to this mode */
  views: MainView[];
  /** Default view when switching to this mode */
  defaultView: MainView;
  /** HUD accent CSS variable */
  color: string;
}

export const MODES: ModeConfig[] = [
  {
    id: "mission",
    label: "Mission",
    description: "Active research, signals, and intelligence synthesis",
    icon: "Target",
    views: ["research", "signals", "for-you-feed", "industry-updates"],
    defaultView: "research",
    color: "var(--hud-cyan)",
  },
  {
    id: "intel",
    label: "Intel",
    description: "Code intelligence, market data, funding, and competitive signals",
    icon: "Radar",
    views: [
      "github-explorer",
      "pr-suggestions",
      "funding",
      "benchmarks",
      "linkedin-posts",
      "entity",
      "footnotes",
      "showcase",
    ],
    defaultView: "github-explorer",
    color: "var(--hud-amber)",
  },
  {
    id: "build",
    label: "Build",
    description: "Documents, spreadsheets, calendar, and project planning",
    icon: "Code",
    views: [
      "documents",
      "spreadsheets",
      "calendar",
      "roadmap",
      "timeline",
      "public",
      "document-recommendations",
    ],
    defaultView: "documents",
    color: "var(--hud-green)",
  },
  {
    id: "agents",
    label: "Agents",
    description: "AI assistant orchestration, task automation, and agent marketplace",
    icon: "Bot",
    views: ["agents", "agent-marketplace", "activity", "mcp-ledger"],
    defaultView: "agents",
    color: "var(--hud-purple)",
  },
  {
    id: "system",
    label: "System",
    description: "Analytics, cost monitoring, QA review, and operational health",
    icon: "Settings",
    views: [
      "analytics-hitl",
      "analytics-components",
      "analytics-recommendations",
      "cost-dashboard",
      "dogfood",
      "observability",
      "engine-demo",
      "oracle",
      "dev-dashboard",
    ],
    defaultView: "oracle",
    color: "var(--hud-red)",
  },
];

/** Reverse map: MainView → CockpitMode */
export const VIEW_TO_MODE: Record<MainView, CockpitMode> = Object.fromEntries(
  MODES.flatMap((m) => m.views.map((v) => [v, m.id])),
) as Record<MainView, CockpitMode>;

// VIEW_TITLES and VIEW_PATH_MAP are now exported from @/lib/viewRegistry (re-exported above)

/** Shared icon map for mode buttons — single source of truth for ModeRail and CommandBar */
export const ICON_MAP: Record<string, LucideIcon> = {
  Target,
  Radar,
  Code,
  Bot,
  Settings,
};

export function getModeForView(view: MainView): ModeConfig {
  const modeId = VIEW_TO_MODE[view];
  return MODES.find((m) => m.id === modeId) ?? MODES[0];
}
