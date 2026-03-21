/**
 * cockpitModes.ts — Maps 28 MainView routes into 5 Jarvis-style focal modes.
 *
 * Each mode groups related views under a single icon in the ModeRail.
 * Within a mode, individual views are accessible via CommandBar tabs or Cmd+K.
 */

import type { MainView } from "@/lib/registry/viewRegistry";
export { VIEW_TITLES, VIEW_PATH_MAP } from "@/lib/registry/viewRegistry";
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
    description: "Active research, signals, receipts, and passport review",
    icon: "Target",
    views: ["control-plane", "research", "receipts"],
    defaultView: "control-plane",
    color: "var(--accent-primary, #d97757)",
  },
  {
    id: "intel",
    label: "Intel",
    description: "Code intelligence, market data, funding, and competitive signals",
    icon: "Radar",
    views: ["investigation", "funding", "benchmarks"],
    defaultView: "investigation",
    color: "var(--accent-primary, #d97757)",
  },
  {
    id: "build",
    label: "Build",
    description: "Documents, spreadsheets, calendar, and project planning",
    icon: "Code",
    views: ["documents", "spreadsheets", "calendar"],
    defaultView: "documents",
    color: "var(--accent-primary, #d97757)",
  },
  {
    id: "agents",
    label: "Agents",
    description: "AI assistant orchestration, task automation, and agent marketplace",
    icon: "Bot",
    views: ["agents", "activity", "mcp-ledger"],
    defaultView: "agents",
    color: "var(--accent-primary, #d97757)",
  },
  {
    id: "system",
    label: "System",
    description: "Analytics, cost monitoring, QA review, and operational health",
    icon: "Settings",
    views: ["oracle", "cost-dashboard", "observability"],
    defaultView: "oracle",
    color: "var(--accent-primary, #d97757)",
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
