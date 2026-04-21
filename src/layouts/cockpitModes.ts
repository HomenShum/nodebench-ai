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
    description: "Home, live chat, and saved reports",
    icon: "Target",
    views: ["control-plane", "chat-home", "reports-home"],
    defaultView: "control-plane",
    color: "var(--accent-primary, #d97757)",
  },
  {
    id: "intel",
    label: "Intel",
    description: "Research, investigation, and entity context",
    icon: "Radar",
    views: ["research", "investigation", "entity"] as MainView[],
    defaultView: "research",
    color: "var(--accent-primary, #d97757)",
  },
  {
    id: "build",
    label: "Build",
    description: "Documents, spreadsheets, and reusable library work",
    icon: "Code",
    views: ["documents", "spreadsheets", "library-home"] as MainView[],
    defaultView: "documents" as MainView,
    color: "var(--accent-primary, #d97757)",
  },
  {
    id: "agents",
    label: "Agents",
    description: "Agent orchestration, receipts, and tool activity",
    icon: "Bot",
    views: ["agents", "receipts", "mcp-ledger"] as MainView[],
    defaultView: "agents" as MainView,
    color: "var(--accent-primary, #d97757)",
  },
  {
    id: "system",
    label: "System",
    description: "Operational health, benchmarks, and developer-facing internals",
    icon: "Settings",
    views: ["oracle", "benchmark-comparison", "developers"] as MainView[],
    defaultView: "oracle" as MainView,
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
