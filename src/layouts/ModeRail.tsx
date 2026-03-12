/**
 * ModeRail — 48px vertical icon strip with 5 cockpit modes.
 *
 * Replaces the 28-item sidebar with 5 mode icons.
 * Active mode shows accent glow. Bottom holds settings gear.
 */

import { memo } from "react";
import { Settings } from "lucide-react";
import { type CockpitMode, MODES, ICON_MAP } from "./cockpitModes";

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);

interface ModeRailProps {
  mode: CockpitMode;
  onModeChange: (mode: CockpitMode) => void;
  onOpenSettings?: () => void;
  /** Per-mode urgency badge counts (0 or undefined = no badge shown). */
  badgeCounts?: Partial<Record<CockpitMode, number>>;
}

export const ModeRail = memo(function ModeRail({ mode, onModeChange, onOpenSettings, badgeCounts }: ModeRailProps) {
  return (
    <nav
      className="hidden lg:flex flex-col items-center w-12 py-3 gap-1 hud-border-r hud-glass hud-depth-right shrink-0"
      aria-label="Mode navigation"
      data-agent-id="cockpit:mode-rail"
      data-agent-action="navigate"
    >
      {/* Mode buttons */}
      <div className="flex flex-col items-center gap-1 flex-1">
        {MODES.map((m, idx) => {
          const Icon = ICON_MAP[m.icon];
          const isActive = mode === m.id;
          return (
            <button
              key={isActive ? `${m.id}-active` : m.id}
              type="button"
              className={`hud-mode-btn${isActive ? " hud-mode-acquire" : ""}`}
              data-active={isActive ? "true" : undefined}
              onClick={() => onModeChange(m.id)}
              aria-label={`${m.label} mode (${isMac ? "⌥" : "Alt+"}${idx + 1})`}
              aria-current={isActive ? "page" : undefined}
              title={`${m.label} (${isMac ? "⌥" : "Alt+"}${idx + 1}) — ${m.views.length} views · ${m.description}`}
              style={isActive ? { color: m.color } : undefined}
              data-agent-id={`cockpit:mode:${m.id}`}
              data-agent-action="navigate"
              data-agent-label={m.label}
            >
              {Icon && <Icon className="w-[18px] h-[18px]" />}
              {!!badgeCounts?.[m.id] && (
                <span
                  className="hud-badge"
                  style={{ background: m.color }}
                  aria-label={`${badgeCounts[m.id]} pending`}
                >
                  {badgeCounts[m.id]! > 99 ? "99+" : badgeCounts[m.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Settings at bottom */}
      {onOpenSettings && (
        <button
          type="button"
          className="hud-mode-btn mt-auto"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
          data-agent-id="cockpit:action:settings"
          data-agent-action="open"
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>
      )}
    </nav>
  );
});
