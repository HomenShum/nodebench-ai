/**
 * CommandBar - bottom cockpit control strip.
 *
 * Left: mode-specific sub-views
 * Center: command surface entry point
 * Right: panel and layout toggles
 */

import { useNavigate } from "react-router-dom";
import { memo, useCallback } from "react";
import { Layout, MessageSquare } from "lucide-react";
import {
  ICON_MAP,
  MODES,
  type CockpitMode,
  VIEW_PATH_MAP,
  VIEW_TITLES,
} from "./cockpitModes";
import type { MainView } from "../hooks/useMainLayoutRouting";

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);

interface CommandBarProps {
  mode: CockpitMode;
  currentView: MainView;
  onViewChange: (view: MainView) => void;
  onOpenPalette: () => void;
  onToggleAgent?: () => void;
  onToggleLayout?: () => void;
  agentOpen?: boolean;
  badgeCounts?: Partial<Record<CockpitMode, number>>;
}

export const CommandBar = memo(function CommandBar({
  mode,
  currentView,
  onViewChange,
  onOpenPalette,
  onToggleAgent,
  onToggleLayout,
  agentOpen,
  badgeCounts,
}: CommandBarProps) {
  const navigate = useNavigate();
  const modeConfig = MODES.find((entry) => entry.id === mode);
  const modeViews = modeConfig?.views ?? [];

  const handleViewClick = useCallback((view: MainView) => {
    onViewChange(view);
    navigate(VIEW_PATH_MAP[view] ?? `/${view}`);
  }, [navigate, onViewChange]);

  return (
    <footer
      className="hud-border-t hud-glass hud-depth-bottom hud-mono shrink-0 select-none"
      aria-label="Command bar"
      data-agent-id="cockpit:command-bar"
    >
      {modeViews.length > 1 && (
        <div
          role="navigation"
          className="flex lg:hidden overflow-x-auto scrollbar-none hud-border-b"
          aria-label="Sub-view navigation"
        >
          {modeViews.map((view) => {
            const isViewActive = view === currentView;
            return (
              <button
                key={view}
                type="button"
                className="hud-tab flex-none h-8"
                data-active={isViewActive ? "true" : undefined}
                aria-current={isViewActive ? "page" : undefined}
                style={isViewActive ? { color: modeConfig?.color } : undefined}
                onClick={() => handleViewClick(view)}
                data-agent-id={`cockpit:mobile-view:${view}`}
                data-agent-action="navigate"
                data-agent-label={VIEW_TITLES[view] ?? view}
              >
                {VIEW_TITLES[view] ?? view}
              </button>
            );
          })}
        </div>
      )}

      <div
        role="navigation"
        className="flex lg:hidden items-center h-14 px-1 justify-around"
        aria-label="Mode navigation"
      >
        {MODES.map((entry) => {
          const isActive = mode === entry.id;
          const Icon = ICON_MAP[entry.icon];
          return (
            <button
              key={entry.id}
              type="button"
              className="hud-mobile-tab"
              data-active={isActive ? "true" : undefined}
              onClick={() => handleViewClick(entry.defaultView)}
              aria-label={entry.label}
              aria-current={isActive ? "page" : undefined}
              style={isActive ? { color: entry.color } : undefined}
              data-agent-id={`cockpit:mobile-tab:${entry.id}`}
              data-agent-action="navigate"
            >
              <span className="w-5 h-5 flex items-center justify-center">
                {Icon ? <Icon className="w-4 h-4" /> : null}
              </span>
              <span className="text-[9px] font-mono">{entry.label}</span>
              {!!badgeCounts?.[entry.id] && (
                <span
                  className="hud-mobile-badge"
                  style={{ background: entry.color }}
                  aria-label={`${badgeCounts[entry.id]} pending`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="hidden lg:flex items-center h-10 px-3 gap-2">
        <div
          role="navigation"
          className="hud-tab-strip flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-1 min-w-0"
          aria-label="Mode views"
        >
          {modeViews.map((view) => (
            <button
              key={view}
              type="button"
              className="hud-tab"
              data-active={view === currentView ? "true" : undefined}
              aria-current={view === currentView ? "page" : undefined}
              style={view === currentView ? { color: modeConfig?.color } : undefined}
              onClick={() => handleViewClick(view)}
              data-agent-id={`cockpit:tab:${view}`}
              data-agent-action="navigate"
              data-agent-label={VIEW_TITLES[view] ?? view}
            >
              {VIEW_TITLES[view] ?? view}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          className="inline-flex items-center gap-2 rounded border border-[var(--hud-border)] px-2.5 py-1.5 hud-label hover:bg-[var(--hud-dim)] transition-colors"
          aria-label="Open command palette"
          data-agent-id="cockpit:action:palette"
          data-agent-action="search"
        >
          <span className="hidden xl:inline text-[var(--hud-text-dim)]">Ask, search, or jump</span>
          <kbd className="opacity-60">{isMac ? "Cmd" : "Ctrl"}+K</kbd>
          <span className="hidden md:inline opacity-40" aria-hidden="true">| {isMac ? "Opt" : "Alt"}+1-5</span>
        </button>

        <div className="flex items-center gap-1">
          {onToggleAgent && (
            <button
              type="button"
              className="hud-mode-btn"
              data-active={agentOpen ? "true" : undefined}
              onClick={onToggleAgent}
              aria-label={agentOpen ? "Close agent panel" : "Open agent panel"}
              title="Agent panel"
              data-agent-id="cockpit:action:toggle-agent"
              data-agent-action="toggle"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          {onToggleLayout && (
            <button
              type="button"
              className="hud-mode-btn"
              onClick={onToggleLayout}
              aria-label="Switch layout"
              title="Switch to classic layout"
              data-agent-id="cockpit:action:toggle-layout"
              data-agent-action="toggle"
            >
              <Layout className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </footer>
  );
});
