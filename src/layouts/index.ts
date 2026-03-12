/**
 * layouts/ — All page-level layout components
 *
 * Primary layouts:
 *   MainLayout — Standard app shell (sidebar + header + content)
 *   CockpitLayout — Jarvis-style 4-zone HUD layout
 *
 * Infrastructure files in this directory are Cockpit-specific:
 *   CommandBar, StatusStrip, FocalArea, ModeRail, CockpitIntelRail,
 *   HUDContext, useCockpitMode, cockpitModes
 */

// Main app layout (canonical source: src/components/MainLayout.tsx)
export { MainLayout } from "../components/MainLayout";
export { CleanSidebar } from "../components/CleanSidebar";
export { CleanHeader } from "../components/CleanHeader";
export { SidebarGlobalNav } from "../components/SidebarGlobalNav";

// Cockpit / HUD layout
export { CockpitLayout } from "./CockpitLayout";
export { CommandBar } from "./CommandBar";
export { StatusStrip } from "./StatusStrip";
export { FocalArea } from "./FocalArea";
export { ModeRail } from "./ModeRail";
export { CockpitIntelRail } from "./CockpitIntelRail";
export { HUDProvider, useHUD } from "./HUDContext";
export { useCockpitMode } from "./useCockpitMode";
